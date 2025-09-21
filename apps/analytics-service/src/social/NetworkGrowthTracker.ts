// Network Growth Tracker
// Author: ChitLaq Development Team
// Date: 2024-01-15

import { SupabaseClient } from '@supabase/supabase-js';
import { Redis } from 'ioredis';

export interface NetworkGrowthData {
  timestamp: Date;
  totalConnections: number;
  newConnections: number;
  activeUsers: number;
  networkDensity: number;
  averageConnectionsPerUser: number;
  universityId?: string;
}

export interface GrowthTrend {
  period: string;
  growthRate: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  confidence: number;
  forecast?: number;
}

export interface NetworkTopology {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  clusters: NetworkCluster[];
  isolatedNodes: string[];
  hubNodes: string[];
}

export interface NetworkNode {
  id: string;
  type: 'user' | 'university' | 'department';
  connections: number;
  centrality: number;
  universityId?: string;
  departmentId?: string;
}

export interface NetworkEdge {
  source: string;
  target: string;
  weight: number;
  type: 'follow' | 'mutual' | 'university' | 'department';
  created_at: Date;
}

export interface NetworkCluster {
  id: string;
  nodes: string[];
  density: number;
  averageConnections: number;
  type: 'university' | 'department' | 'academic_year' | 'interest';
}

export class NetworkGrowthTracker {
  private supabase: SupabaseClient;
  private redis: Redis;
  private growthHistory: Map<string, NetworkGrowthData[]> = new Map();

  constructor(supabase: SupabaseClient, redis: Redis) {
    this.supabase = supabase;
    this.redis = redis;
  }

  /**
   * Track network growth metrics
   */
  async trackNetworkGrowth(universityId?: string): Promise<NetworkGrowthData> {
    const timestamp = new Date();
    
    // Get current network statistics
    const [totalConnections, newConnections, activeUsers, networkDensity, avgConnections] = await Promise.all([
      this.getTotalConnections(universityId),
      this.getNewConnections(universityId, 24), // Last 24 hours
      this.getActiveUsers(universityId, 7), // Last 7 days
      this.calculateNetworkDensity(universityId),
      this.getAverageConnectionsPerUser(universityId)
    ]);

    const growthData: NetworkGrowthData = {
      timestamp,
      totalConnections,
      newConnections,
      activeUsers,
      networkDensity,
      averageConnectionsPerUser: avgConnections,
      universityId
    };

    // Store in database
    await this.storeGrowthData(growthData);

    // Update real-time metrics
    await this.updateRealtimeMetrics(growthData);

    // Cache for quick access
    await this.cacheGrowthData(growthData);

    return growthData;
  }

  /**
   * Analyze network growth trends
   */
  async analyzeGrowthTrends(universityId?: string, period: 'week' | 'month' | 'quarter' = 'month'): Promise<GrowthTrend[]> {
    const growthHistory = await this.getGrowthHistory(universityId, period);
    
    if (growthHistory.length < 2) {
      return [];
    }

    const trends: GrowthTrend[] = [];
    const periods = this.groupByPeriod(growthHistory, period);

    for (const [periodKey, data] of periods.entries()) {
      const trend = this.calculateTrend(data);
      trends.push({
        period: periodKey,
        growthRate: trend.growthRate,
        trend: trend.direction,
        confidence: trend.confidence,
        forecast: this.forecastGrowth(data)
      });
    }

    return trends;
  }

  /**
   * Get network topology analysis
   */
  async getNetworkTopology(universityId?: string): Promise<NetworkTopology> {
    // Get all users and their connections
    const { data: users, error: usersError } = await this.supabase
      .from('user_profiles')
      .select('id, university_id, department_id')
      .eq(universityId ? 'university_id' : 'id', universityId || '');

    if (usersError) throw usersError;

    // Get all connections
    const { data: connections, error: connError } = await this.supabase
      .from('social_relationships')
      .select('source_user_id, target_user_id, relationship_type, created_at')
      .eq('relationship_type', 'follows');

    if (connError) throw connError;

    // Build network nodes
    const nodes: NetworkNode[] = users.map(user => ({
      id: user.id,
      type: 'user',
      connections: 0,
      centrality: 0,
      universityId: user.university_id,
      departmentId: user.department_id
    }));

    // Build network edges
    const edges: NetworkEdge[] = connections.map(conn => ({
      source: conn.source_user_id,
      target: conn.target_user_id,
      weight: 1,
      type: 'follow',
      created_at: new Date(conn.created_at)
    }));

    // Calculate node properties
    for (const node of nodes) {
      node.connections = edges.filter(edge => 
        edge.source === node.id || edge.target === node.id
      ).length;
      node.centrality = this.calculateCentrality(node.id, edges);
    }

    // Identify clusters
    const clusters = await this.identifyClusters(nodes, edges, universityId);

    // Find isolated and hub nodes
    const isolatedNodes = nodes.filter(node => node.connections === 0).map(node => node.id);
    const hubNodes = nodes
      .filter(node => node.centrality > 0.1)
      .sort((a, b) => b.centrality - a.centrality)
      .slice(0, 10)
      .map(node => node.id);

    return {
      nodes,
      edges,
      clusters,
      isolatedNodes,
      hubNodes
    };
  }

  /**
   * Monitor network health indicators
   */
  async monitorNetworkHealth(universityId?: string): Promise<{
    healthScore: number;
    issues: string[];
    recommendations: string[];
    metrics: Record<string, number>;
  }> {
    const topology = await this.getNetworkTopology(universityId);
    const growthData = await this.trackNetworkGrowth(universityId);
    
    const issues: string[] = [];
    const recommendations: string[] = [];
    let healthScore = 100;

    // Check for high isolation rate
    const isolationRate = topology.isolatedNodes.length / topology.nodes.length;
    if (isolationRate > 0.3) {
      healthScore -= 20;
      issues.push(`High isolation rate: ${(isolationRate * 100).toFixed(1)}%`);
      recommendations.push('Improve recommendation algorithm to reduce user isolation');
    }

    // Check for low network density
    if (growthData.networkDensity < 0.1) {
      healthScore -= 15;
      issues.push(`Low network density: ${(growthData.networkDensity * 100).toFixed(1)}%`);
      recommendations.push('Encourage more connections through gamification');
    }

    // Check for declining growth
    const trends = await this.analyzeGrowthTrends(universityId, 'week');
    const recentTrend = trends[trends.length - 1];
    if (recentTrend && recentTrend.growthRate < -5) {
      healthScore -= 25;
      issues.push(`Declining growth rate: ${recentTrend.growthRate.toFixed(1)}%`);
      recommendations.push('Investigate user onboarding and retention strategies');
    }

    // Check for cluster imbalance
    const clusterSizes = topology.clusters.map(c => c.nodes.length);
    const clusterVariance = this.calculateVariance(clusterSizes);
    if (clusterVariance > 100) {
      healthScore -= 10;
      issues.push('Unbalanced cluster sizes detected');
      recommendations.push('Promote cross-cluster connections');
    }

    return {
      healthScore: Math.max(0, healthScore),
      issues,
      recommendations,
      metrics: {
        isolationRate,
        networkDensity: growthData.networkDensity,
        growthRate: recentTrend?.growthRate || 0,
        clusterVariance,
        totalNodes: topology.nodes.length,
        totalEdges: topology.edges.length,
        averageConnections: growthData.averageConnectionsPerUser
      }
    };
  }

  /**
   * Get network growth predictions
   */
  async predictNetworkGrowth(universityId?: string, days: number = 30): Promise<{
    predictedConnections: number;
    predictedUsers: number;
    confidence: number;
    factors: string[];
  }> {
    const growthHistory = await this.getGrowthHistory(universityId, 'month');
    
    if (growthHistory.length < 7) {
      return {
        predictedConnections: 0,
        predictedUsers: 0,
        confidence: 0,
        factors: ['Insufficient historical data']
      };
    }

    // Simple linear regression for prediction
    const recentData = growthHistory.slice(-7); // Last 7 days
    const trend = this.calculateLinearTrend(recentData);
    
    const predictedConnections = Math.max(0, 
      recentData[recentData.length - 1].totalConnections + (trend.slope * days)
    );
    
    const predictedUsers = Math.max(0,
      recentData[recentData.length - 1].activeUsers + (trend.userSlope * days)
    );

    const confidence = Math.min(95, Math.max(10, trend.rSquared * 100));

    const factors: string[] = [];
    if (trend.slope > 0) factors.push('Positive growth trend');
    if (trend.rSquared > 0.8) factors.push('Strong trend correlation');
    if (recentData.length >= 7) factors.push('Sufficient historical data');

    return {
      predictedConnections,
      predictedUsers,
      confidence,
      factors
    };
  }

  /**
   * Private helper methods
   */
  private async getTotalConnections(universityId?: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('social_relationships')
      .select('*', { count: 'exact', head: true })
      .eq('relationship_type', 'follows')
      .eq(universityId ? 'university_id' : 'id', universityId || '');

    if (error) throw error;
    return count || 0;
  }

  private async getNewConnections(universityId?: string, hours: number = 24): Promise<number> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    const { count, error } = await this.supabase
      .from('social_relationships')
      .select('*', { count: 'exact', head: true })
      .eq('relationship_type', 'follows')
      .gte('created_at', since.toISOString())
      .eq(universityId ? 'university_id' : 'id', universityId || '');

    if (error) throw error;
    return count || 0;
  }

  private async getActiveUsers(universityId?: string, days: number = 7): Promise<number> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const { data, error } = await this.supabase
      .from('social_activity_events')
      .select('user_id')
      .gte('timestamp', since.toISOString())
      .eq(universityId ? 'university_id' : 'id', universityId || '');

    if (error) throw error;
    
    const uniqueUsers = new Set(data?.map(event => event.user_id) || []);
    return uniqueUsers.size;
  }

  private async calculateNetworkDensity(universityId?: string): Promise<number> {
    const { data: users, error: usersError } = await this.supabase
      .from('user_profiles')
      .select('id')
      .eq(universityId ? 'university_id' : 'id', universityId || '');

    if (usersError) throw usersError;

    const { data: connections, error: connError } = await this.supabase
      .from('social_relationships')
      .select('source_user_id, target_user_id')
      .eq('relationship_type', 'follows')
      .eq(universityId ? 'university_id' : 'id', universityId || '');

    if (connError) throw connError;

    const n = users.length;
    if (n < 2) return 0;

    const maxPossibleConnections = n * (n - 1);
    const actualConnections = connections.length;
    
    return actualConnections / maxPossibleConnections;
  }

  private async getAverageConnectionsPerUser(universityId?: string): Promise<number> {
    const { data, error } = await this.supabase.rpc('get_average_connections_per_user', {
      university_filter: universityId ? `university_id = '${universityId}'` : '1=1'
    });

    if (error) throw error;
    return data || 0;
  }

  private async storeGrowthData(data: NetworkGrowthData): Promise<void> {
    const { error } = await this.supabase
      .from('network_growth_data')
      .insert({
        timestamp: data.timestamp.toISOString(),
        total_connections: data.totalConnections,
        new_connections: data.newConnections,
        active_users: data.activeUsers,
        network_density: data.networkDensity,
        average_connections_per_user: data.averageConnectionsPerUser,
        university_id: data.universityId
      });

    if (error) throw error;
  }

  private async updateRealtimeMetrics(data: NetworkGrowthData): Promise<void> {
    const pipeline = this.redis.pipeline();
    
    pipeline.hset('network:growth:current', {
      total_connections: data.totalConnections,
      new_connections: data.newConnections,
      active_users: data.activeUsers,
      network_density: data.networkDensity,
      timestamp: data.timestamp.getTime()
    });

    pipeline.zadd('network:growth:history', data.timestamp.getTime(), JSON.stringify(data));
    
    await pipeline.exec();
  }

  private async cacheGrowthData(data: NetworkGrowthData): Promise<void> {
    const key = `network:growth:${data.universityId || 'global'}`;
    const history = this.growthHistory.get(key) || [];
    history.push(data);
    
    // Keep only last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const filteredHistory = history.filter(d => d.timestamp > thirtyDaysAgo);
    
    this.growthHistory.set(key, filteredHistory);
  }

  private async getGrowthHistory(universityId?: string, period: string): Promise<NetworkGrowthData[]> {
    const key = `network:growth:${universityId || 'global'}`;
    let history = this.growthHistory.get(key) || [];

    if (history.length === 0) {
      // Load from database
      const days = period === 'week' ? 7 : period === 'month' ? 30 : 90;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const { data, error } = await this.supabase
        .from('network_growth_data')
        .select('*')
        .gte('timestamp', since.toISOString())
        .eq(universityId ? 'university_id' : 'id', universityId || '')
        .order('timestamp', { ascending: true });

      if (error) throw error;

      history = (data || []).map(row => ({
        timestamp: new Date(row.timestamp),
        totalConnections: row.total_connections,
        newConnections: row.new_connections,
        activeUsers: row.active_users,
        networkDensity: row.network_density,
        averageConnectionsPerUser: row.average_connections_per_user,
        universityId: row.university_id
      }));

      this.growthHistory.set(key, history);
    }

    return history;
  }

  private groupByPeriod(history: NetworkGrowthData[], period: string): Map<string, NetworkGrowthData[]> {
    const groups = new Map<string, NetworkGrowthData[]>();
    
    for (const data of history) {
      let key: string;
      
      if (period === 'week') {
        const weekStart = new Date(data.timestamp);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else if (period === 'month') {
        key = `${data.timestamp.getFullYear()}-${String(data.timestamp.getMonth() + 1).padStart(2, '0')}`;
      } else {
        const quarter = Math.floor(data.timestamp.getMonth() / 3) + 1;
        key = `${data.timestamp.getFullYear()}-Q${quarter}`;
      }
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(data);
    }
    
    return groups;
  }

  private calculateTrend(data: NetworkGrowthData[]): { growthRate: number; direction: 'increasing' | 'decreasing' | 'stable'; confidence: number } {
    if (data.length < 2) {
      return { growthRate: 0, direction: 'stable', confidence: 0 };
    }

    const first = data[0];
    const last = data[data.length - 1];
    const growthRate = ((last.totalConnections - first.totalConnections) / first.totalConnections) * 100;
    
    let direction: 'increasing' | 'decreasing' | 'stable';
    if (growthRate > 5) direction = 'increasing';
    else if (growthRate < -5) direction = 'decreasing';
    else direction = 'stable';

    // Calculate confidence based on data consistency
    const values = data.map(d => d.totalConnections);
    const variance = this.calculateVariance(values);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const coefficientOfVariation = Math.sqrt(variance) / mean;
    const confidence = Math.max(0, 1 - coefficientOfVariation);

    return { growthRate, direction, confidence };
  }

  private forecastGrowth(data: NetworkGrowthData[]): number {
    if (data.length < 3) return 0;
    
    const recent = data.slice(-3);
    const trend = this.calculateLinearTrend(recent);
    return Math.max(0, recent[recent.length - 1].totalConnections + trend.slope * 7); // 7 days ahead
  }

  private calculateLinearTrend(data: NetworkGrowthData[]): { slope: number; userSlope: number; rSquared: number } {
    const n = data.length;
    const x = data.map((_, i) => i);
    const y = data.map(d => d.totalConnections);
    const yUsers = data.map(d => d.activeUsers);

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumYY = y.reduce((sum, yi) => sum + yi * yi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const userSlope = (n * x.reduce((sum, xi, i) => sum + xi * yUsers[i], 0) - sumX * yUsers.reduce((a, b) => a + b, 0)) / (n * sumXX - sumX * sumX);
    
    const yMean = sumY / n;
    const ssRes = y.reduce((sum, yi, i) => sum + Math.pow(yi - (slope * x[i] + (sumY - slope * sumX) / n), 2), 0);
    const ssTot = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
    const rSquared = 1 - (ssRes / ssTot);

    return { slope, userSlope, rSquared };
  }

  private calculateCentrality(nodeId: string, edges: NetworkEdge[]): number {
    const connections = edges.filter(edge => edge.source === nodeId || edge.target === nodeId);
    const totalNodes = new Set([...edges.map(e => e.source), ...edges.map(e => e.target)]).size;
    
    return connections.length / Math.max(1, totalNodes - 1);
  }

  private async identifyClusters(nodes: NetworkNode[], edges: NetworkEdge[], universityId?: string): Promise<NetworkCluster[]> {
    const clusters: NetworkCluster[] = [];
    const visited = new Set<string>();

    for (const node of nodes) {
      if (visited.has(node.id)) continue;

      const cluster = this.dfsCluster(node.id, nodes, edges, visited);
      if (cluster.length > 1) {
        const clusterEdges = edges.filter(edge => 
          cluster.includes(edge.source) && cluster.includes(edge.target)
        );
        
        clusters.push({
          id: crypto.randomUUID(),
          nodes: cluster,
          density: (2 * clusterEdges.length) / (cluster.length * (cluster.length - 1)),
          averageConnections: clusterEdges.length / cluster.length,
          type: 'university' // Could be determined by analyzing node properties
        });
      }
    }

    return clusters;
  }

  private dfsCluster(nodeId: string, nodes: NetworkNode[], edges: NetworkEdge[], visited: Set<string>): string[] {
    const cluster: string[] = [];
    const stack = [nodeId];

    while (stack.length > 0) {
      const current = stack.pop()!;
      if (visited.has(current)) continue;

      visited.add(current);
      cluster.push(current);

      const connectedNodes = edges
        .filter(edge => edge.source === current || edge.target === current)
        .map(edge => edge.source === current ? edge.target : edge.source)
        .filter(id => !visited.has(id));

      stack.push(...connectedNodes);
    }

    return cluster;
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
  }
}
