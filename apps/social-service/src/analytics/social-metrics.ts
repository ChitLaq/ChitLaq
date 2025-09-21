import { 
  SocialGraphAnalytics, 
  SocialRelationship, 
  SocialGraphNode,
  ConnectionRecommendation,
  RelationshipType,
  RelationshipStatus
} from '../models/SocialGraph';
import { DatabaseService } from '../database/DatabaseService';
import { CacheService } from '../cache/CacheService';
import { EventService } from '../events/EventService';

export interface MetricsConfig {
  collectionInterval: number; // milliseconds
  retentionPeriod: number; // days
  batchSize: number;
  enableRealTime: boolean;
  enableAggregation: boolean;
  enableTrends: boolean;
}

export interface SocialMetricsData {
  userId: string;
  timestamp: Date;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  
  // Connection metrics
  connections: {
    total: number;
    new: number;
    lost: number;
    netGrowth: number;
    growthRate: number;
  };
  
  // Relationship metrics
  relationships: {
    followers: number;
    following: number;
    mutual: number;
    blocked: number;
    university: number;
    department: number;
    year: number;
    interest: number;
  };
  
  // Engagement metrics
  engagement: {
    profileViews: number;
    connectionRequests: number;
    acceptedRequests: number;
    rejectedRequests: number;
    blocks: number;
    unblocks: number;
    recommendationsViewed: number;
    recommendationsAccepted: number;
  };
  
  // Network metrics
  network: {
    networkSize: number;
    networkDensity: number;
    clusteringCoefficient: number;
    averagePathLength: number;
    influenceScore: number;
    reachScore: number;
  };
  
  // University network metrics
  universityNetwork: {
    totalConnections: number;
    departmentConnections: number;
    yearConnections: number;
    crossDepartmentConnections: number;
    alumniConnections: number;
    networkGrowth: number;
  };
  
  // Activity patterns
  activity: {
    peakHours: number[];
    peakDays: string[];
    connectionActivity: number;
    discoveryActivity: number;
    recommendationActivity: number;
  };
}

export interface TrendAnalysis {
  metric: string;
  currentValue: number;
  previousValue: number;
  change: number;
  changePercentage: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  significance: 'high' | 'medium' | 'low';
  period: string;
}

export interface NetworkInsights {
  userId: string;
  insights: {
    type: 'connection_growth' | 'engagement_boost' | 'network_expansion' | 'influence_increase' | 'community_formation';
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    actionable: boolean;
    recommendations: string[];
    metrics: {
      current: number;
      target: number;
      progress: number;
    };
  }[];
  generatedAt: Date;
  period: string;
}

export class SocialMetricsService {
  private db: DatabaseService;
  private cache: CacheService;
  private events: EventService;
  private config: MetricsConfig;
  private collectionTimer?: NodeJS.Timeout;

  constructor(
    db: DatabaseService,
    cache: CacheService,
    events: EventService,
    config: MetricsConfig
  ) {
    this.db = db;
    this.cache = cache;
    this.events = events;
    this.config = config;
  }

  // Start metrics collection
  async startCollection(): Promise<void> {
    if (this.collectionTimer) {
      clearInterval(this.collectionTimer);
    }

    this.collectionTimer = setInterval(async () => {
      try {
        await this.collectMetrics();
      } catch (error) {
        console.error('Error collecting social metrics:', error);
      }
    }, this.config.collectionInterval);

    console.log('Social metrics collection started');
  }

  // Stop metrics collection
  async stopCollection(): Promise<void> {
    if (this.collectionTimer) {
      clearInterval(this.collectionTimer);
      this.collectionTimer = undefined;
    }
    console.log('Social metrics collection stopped');
  }

  // Collect metrics for all active users
  async collectMetrics(): Promise<void> {
    try {
      const activeUsers = await this.getActiveUsers();
      const batchSize = this.config.batchSize;
      
      for (let i = 0; i < activeUsers.length; i += batchSize) {
        const batch = activeUsers.slice(i, i + batchSize);
        await Promise.all(batch.map(userId => this.collectUserMetrics(userId)));
      }
    } catch (error) {
      console.error('Error collecting metrics:', error);
      throw error;
    }
  }

  // Collect metrics for a specific user
  async collectUserMetrics(userId: string): Promise<SocialMetricsData | null> {
    try {
      const now = new Date();
      const period = this.determinePeriod(now);
      
      // Check if metrics already exist for this period
      const existingMetrics = await this.getUserMetrics(userId, period, now);
      if (existingMetrics && !this.shouldRecalculate(existingMetrics)) {
        return existingMetrics;
      }

      // Collect fresh metrics
      const metrics = await this.calculateUserMetrics(userId, period, now);
      
      // Store metrics
      await this.storeUserMetrics(metrics);
      
      // Cache metrics
      await this.cacheUserMetrics(metrics);
      
      // Emit events for real-time updates
      if (this.config.enableRealTime) {
        await this.events.emit('social_metrics.updated', {
          userId,
          period,
          metrics
        });
      }

      return metrics;
    } catch (error) {
      console.error(`Error collecting metrics for user ${userId}:`, error);
      return null;
    }
  }

  // Get user metrics for a specific period
  async getUserMetrics(
    userId: string,
    period: 'daily' | 'weekly' | 'monthly' | 'yearly',
    date: Date
  ): Promise<SocialMetricsData | null> {
    try {
      // Try cache first
      const cacheKey = `social_metrics:${userId}:${period}:${this.formatDate(date)}`;
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Fetch from database
      const metrics = await this.db.getUserSocialMetrics(userId, period, date);
      if (metrics) {
        // Cache the result
        await this.cache.set(cacheKey, JSON.stringify(metrics), 3600); // 1 hour
      }

      return metrics;
    } catch (error) {
      console.error('Error getting user metrics:', error);
      return null;
    }
  }

  // Get metrics trends for a user
  async getMetricsTrends(
    userId: string,
    period: 'daily' | 'weekly' | 'monthly' | 'yearly',
    days: number = 30
  ): Promise<TrendAnalysis[]> {
    try {
      const trends: TrendAnalysis[] = [];
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));

      // Get historical metrics
      const historicalMetrics = await this.db.getUserSocialMetricsHistory(
        userId,
        period,
        startDate,
        endDate
      );

      if (historicalMetrics.length < 2) {
        return trends;
      }

      // Calculate trends for each metric
      const currentMetrics = historicalMetrics[historicalMetrics.length - 1];
      const previousMetrics = historicalMetrics[historicalMetrics.length - 2];

      // Connection trends
      trends.push(this.calculateTrend(
        'total_connections',
        currentMetrics.connections.total,
        previousMetrics.connections.total,
        period
      ));

      trends.push(this.calculateTrend(
        'followers',
        currentMetrics.relationships.followers,
        previousMetrics.relationships.followers,
        period
      ));

      trends.push(this.calculateTrend(
        'following',
        currentMetrics.relationships.following,
        previousMetrics.relationships.following,
        period
      ));

      trends.push(this.calculateTrend(
        'network_density',
        currentMetrics.network.networkDensity,
        previousMetrics.network.networkDensity,
        period
      ));

      trends.push(this.calculateTrend(
        'influence_score',
        currentMetrics.network.influenceScore,
        previousMetrics.network.influenceScore,
        period
      ));

      return trends;
    } catch (error) {
      console.error('Error getting metrics trends:', error);
      return [];
    }
  }

  // Generate network insights for a user
  async generateNetworkInsights(
    userId: string,
    period: 'daily' | 'weekly' | 'monthly' | 'yearly' = 'weekly'
  ): Promise<NetworkInsights> {
    try {
      const insights: NetworkInsights['insights'] = [];
      const currentMetrics = await this.getUserMetrics(userId, period, new Date());
      
      if (!currentMetrics) {
        return {
          userId,
          insights: [],
          generatedAt: new Date(),
          period
        };
      }

      // Connection growth insight
      const connectionGrowthInsight = await this.analyzeConnectionGrowth(userId, currentMetrics);
      if (connectionGrowthInsight) {
        insights.push(connectionGrowthInsight);
      }

      // Engagement boost insight
      const engagementInsight = await this.analyzeEngagement(userId, currentMetrics);
      if (engagementInsight) {
        insights.push(engagementInsight);
      }

      // Network expansion insight
      const networkExpansionInsight = await this.analyzeNetworkExpansion(userId, currentMetrics);
      if (networkExpansionInsight) {
        insights.push(networkExpansionInsight);
      }

      // Influence increase insight
      const influenceInsight = await this.analyzeInfluence(userId, currentMetrics);
      if (influenceInsight) {
        insights.push(influenceInsight);
      }

      // Community formation insight
      const communityInsight = await this.analyzeCommunityFormation(userId, currentMetrics);
      if (communityInsight) {
        insights.push(communityInsight);
      }

      return {
        userId,
        insights,
        generatedAt: new Date(),
        period
      };
    } catch (error) {
      console.error('Error generating network insights:', error);
      return {
        userId,
        insights: [],
        generatedAt: new Date(),
        period
      };
    }
  }

  // Get aggregated metrics for multiple users
  async getAggregatedMetrics(
    userIds: string[],
    period: 'daily' | 'weekly' | 'monthly' | 'yearly',
    date: Date
  ): Promise<{
    totalUsers: number;
    averageConnections: number;
    averageEngagement: number;
    networkDensity: number;
    topPerformers: Array<{ userId: string; score: number }>;
  }> {
    try {
      const metrics = await Promise.all(
        userIds.map(userId => this.getUserMetrics(userId, period, date))
      );

      const validMetrics = metrics.filter(m => m !== null) as SocialMetricsData[];
      
      if (validMetrics.length === 0) {
        return {
          totalUsers: 0,
          averageConnections: 0,
          averageEngagement: 0,
          networkDensity: 0,
          topPerformers: []
        };
      }

      const totalConnections = validMetrics.reduce(
        (sum, m) => sum + m.connections.total, 0
      );
      const totalEngagement = validMetrics.reduce(
        (sum, m) => sum + m.engagement.profileViews + m.engagement.connectionRequests, 0
      );
      const totalDensity = validMetrics.reduce(
        (sum, m) => sum + m.network.networkDensity, 0
      );

      // Calculate top performers based on influence score
      const topPerformers = validMetrics
        .map(m => ({
          userId: m.userId,
          score: m.network.influenceScore
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

      return {
        totalUsers: validMetrics.length,
        averageConnections: totalConnections / validMetrics.length,
        averageEngagement: totalEngagement / validMetrics.length,
        networkDensity: totalDensity / validMetrics.length,
        topPerformers
      };
    } catch (error) {
      console.error('Error getting aggregated metrics:', error);
      throw error;
    }
  }

  // Private helper methods
  private async getActiveUsers(): Promise<string[]> {
    try {
      // Get users who have been active in the last 7 days
      const activeUsers = await this.db.getActiveUsers(7);
      return activeUsers;
    } catch (error) {
      console.error('Error getting active users:', error);
      return [];
    }
  }

  private determinePeriod(date: Date): 'daily' | 'weekly' | 'monthly' | 'yearly' {
    // For now, always use daily. In a real implementation, this would be configurable
    return 'daily';
  }

  private shouldRecalculate(metrics: SocialMetricsData): boolean {
    const now = new Date();
    const metricsAge = now.getTime() - metrics.timestamp.getTime();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    return metricsAge > maxAge;
  }

  private async calculateUserMetrics(
    userId: string,
    period: 'daily' | 'weekly' | 'monthly' | 'yearly',
    date: Date
  ): Promise<SocialMetricsData> {
    try {
      // Get user relationships
      const relationships = await this.db.getUserRelationships(userId);
      
      // Get user node
      const userNode = await this.db.getUserNode(userId);
      
      // Get user profile
      const userProfile = await this.db.getUserProfile(userId);
      
      // Calculate connection metrics
      const connectionMetrics = await this.calculateConnectionMetrics(userId, relationships, date);
      
      // Calculate relationship metrics
      const relationshipMetrics = await this.calculateRelationshipMetrics(relationships);
      
      // Calculate engagement metrics
      const engagementMetrics = await this.calculateEngagementMetrics(userId, date);
      
      // Calculate network metrics
      const networkMetrics = await this.calculateNetworkMetrics(userId, relationships, userNode);
      
      // Calculate university network metrics
      const universityNetworkMetrics = await this.calculateUniversityNetworkMetrics(userId, relationships, userProfile);
      
      // Calculate activity patterns
      const activityPatterns = await this.calculateActivityPatterns(userId, date);

      return {
        userId,
        timestamp: date,
        period,
        connections: connectionMetrics,
        relationships: relationshipMetrics,
        engagement: engagementMetrics,
        network: networkMetrics,
        universityNetwork: universityNetworkMetrics,
        activity: activityPatterns
      };
    } catch (error) {
      console.error('Error calculating user metrics:', error);
      throw error;
    }
  }

  private async calculateConnectionMetrics(
    userId: string,
    relationships: SocialRelationship[],
    date: Date
  ): Promise<SocialMetricsData['connections']> {
    try {
      const activeRelationships = relationships.filter(r => r.status === 'active');
      const followRelationships = activeRelationships.filter(r => r.relationshipType === 'follow');
      
      const total = followRelationships.length;
      
      // Calculate new connections (last 24 hours)
      const yesterday = new Date(date.getTime() - 24 * 60 * 60 * 1000);
      const newConnections = followRelationships.filter(r => r.createdAt > yesterday).length;
      
      // Calculate lost connections (last 24 hours)
      const lostConnections = await this.db.getLostConnections(userId, yesterday, date);
      
      const netGrowth = newConnections - lostConnections;
      const growthRate = total > 0 ? (netGrowth / total) * 100 : 0;

      return {
        total,
        new: newConnections,
        lost: lostConnections,
        netGrowth,
        growthRate
      };
    } catch (error) {
      console.error('Error calculating connection metrics:', error);
      return {
        total: 0,
        new: 0,
        lost: 0,
        netGrowth: 0,
        growthRate: 0
      };
    }
  }

  private async calculateRelationshipMetrics(
    relationships: SocialRelationship[]
  ): Promise<SocialMetricsData['relationships']> {
    try {
      const activeRelationships = relationships.filter(r => r.status === 'active');
      
      const followers = activeRelationships.filter(r => r.relationshipType === 'follow' && r.followingId === relationships[0]?.followerId).length;
      const following = activeRelationships.filter(r => r.relationshipType === 'follow' && r.followerId === relationships[0]?.followerId).length;
      const blocked = activeRelationships.filter(r => r.relationshipType === 'block').length;
      const university = activeRelationships.filter(r => r.relationshipType === 'university_connection').length;
      const department = activeRelationships.filter(r => r.relationshipType === 'department_connection').length;
      const year = activeRelationships.filter(r => r.relationshipType === 'year_connection').length;
      const interest = activeRelationships.filter(r => r.relationshipType === 'interest_connection').length;
      
      // Calculate mutual connections
      const mutual = await this.calculateMutualConnections(relationships);

      return {
        followers,
        following,
        mutual,
        blocked,
        university,
        department,
        year,
        interest
      };
    } catch (error) {
      console.error('Error calculating relationship metrics:', error);
      return {
        followers: 0,
        following: 0,
        mutual: 0,
        blocked: 0,
        university: 0,
        department: 0,
        year: 0,
        interest: 0
      };
    }
  }

  private async calculateEngagementMetrics(
    userId: string,
    date: Date
  ): Promise<SocialMetricsData['engagement']> {
    try {
      const yesterday = new Date(date.getTime() - 24 * 60 * 60 * 1000);
      
      const profileViews = await this.db.getProfileViews(userId, yesterday, date);
      const connectionRequests = await this.db.getConnectionRequests(userId, yesterday, date);
      const acceptedRequests = await this.db.getAcceptedRequests(userId, yesterday, date);
      const rejectedRequests = await this.db.getRejectedRequests(userId, yesterday, date);
      const blocks = await this.db.getBlocks(userId, yesterday, date);
      const unblocks = await this.db.getUnblocks(userId, yesterday, date);
      const recommendationsViewed = await this.db.getRecommendationsViewed(userId, yesterday, date);
      const recommendationsAccepted = await this.db.getRecommendationsAccepted(userId, yesterday, date);

      return {
        profileViews,
        connectionRequests,
        acceptedRequests,
        rejectedRequests,
        blocks,
        unblocks,
        recommendationsViewed,
        recommendationsAccepted
      };
    } catch (error) {
      console.error('Error calculating engagement metrics:', error);
      return {
        profileViews: 0,
        connectionRequests: 0,
        acceptedRequests: 0,
        rejectedRequests: 0,
        blocks: 0,
        unblocks: 0,
        recommendationsViewed: 0,
        recommendationsAccepted: 0
      };
    }
  }

  private async calculateNetworkMetrics(
    userId: string,
    relationships: SocialRelationship[],
    userNode: SocialGraphNode | null
  ): Promise<SocialMetricsData['network']> {
    try {
      const networkSize = relationships.filter(r => r.status === 'active').length;
      const networkDensity = await this.calculateNetworkDensity(userId, relationships);
      const clusteringCoefficient = await this.calculateClusteringCoefficient(userId, relationships);
      const averagePathLength = await this.calculateAveragePathLength(userId, relationships);
      const influenceScore = userNode?.metrics.influenceScore || 0;
      const reachScore = await this.calculateReachScore(userId, relationships);

      return {
        networkSize,
        networkDensity,
        clusteringCoefficient,
        averagePathLength,
        influenceScore,
        reachScore
      };
    } catch (error) {
      console.error('Error calculating network metrics:', error);
      return {
        networkSize: 0,
        networkDensity: 0,
        clusteringCoefficient: 0,
        averagePathLength: 0,
        influenceScore: 0,
        reachScore: 0
      };
    }
  }

  private async calculateUniversityNetworkMetrics(
    userId: string,
    relationships: SocialRelationship[],
    userProfile: any
  ): Promise<SocialMetricsData['universityNetwork']> {
    try {
      const universityRelationships = relationships.filter(
        r => r.relationshipType === 'university_connection' && r.status === 'active'
      );
      
      const totalConnections = universityRelationships.length;
      const departmentConnections = relationships.filter(
        r => r.relationshipType === 'department_connection' && r.status === 'active'
      ).length;
      const yearConnections = relationships.filter(
        r => r.relationshipType === 'year_connection' && r.status === 'active'
      ).length;
      
      // Calculate cross-department connections
      const crossDepartmentConnections = await this.calculateCrossDepartmentConnections(userId, relationships);
      
      // Calculate alumni connections
      const alumniConnections = await this.calculateAlumniConnections(userId, relationships);
      
      // Calculate network growth
      const networkGrowth = await this.calculateUniversityNetworkGrowth(userId, relationships);

      return {
        totalConnections,
        departmentConnections,
        yearConnections,
        crossDepartmentConnections,
        alumniConnections,
        networkGrowth
      };
    } catch (error) {
      console.error('Error calculating university network metrics:', error);
      return {
        totalConnections: 0,
        departmentConnections: 0,
        yearConnections: 0,
        crossDepartmentConnections: 0,
        alumniConnections: 0,
        networkGrowth: 0
      };
    }
  }

  private async calculateActivityPatterns(
    userId: string,
    date: Date
  ): Promise<SocialMetricsData['activity']> {
    try {
      const weekAgo = new Date(date.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const peakHours = await this.db.getPeakActivityHours(userId, weekAgo, date);
      const peakDays = await this.db.getPeakActivityDays(userId, weekAgo, date);
      const connectionActivity = await this.db.getConnectionActivity(userId, weekAgo, date);
      const discoveryActivity = await this.db.getDiscoveryActivity(userId, weekAgo, date);
      const recommendationActivity = await this.db.getRecommendationActivity(userId, weekAgo, date);

      return {
        peakHours,
        peakDays,
        connectionActivity,
        discoveryActivity,
        recommendationActivity
      };
    } catch (error) {
      console.error('Error calculating activity patterns:', error);
      return {
        peakHours: [],
        peakDays: [],
        connectionActivity: 0,
        discoveryActivity: 0,
        recommendationActivity: 0
      };
    }
  }

  // Additional helper methods for specific calculations
  private async calculateMutualConnections(relationships: SocialRelationship[]): Promise<number> {
    // Implementation for calculating mutual connections
    return 0;
  }

  private async calculateNetworkDensity(userId: string, relationships: SocialRelationship[]): Promise<number> {
    // Implementation for calculating network density
    return 0;
  }

  private async calculateClusteringCoefficient(userId: string, relationships: SocialRelationship[]): Promise<number> {
    // Implementation for calculating clustering coefficient
    return 0;
  }

  private async calculateAveragePathLength(userId: string, relationships: SocialRelationship[]): Promise<number> {
    // Implementation for calculating average path length
    return 0;
  }

  private async calculateReachScore(userId: string, relationships: SocialRelationship[]): Promise<number> {
    // Implementation for calculating reach score
    return 0;
  }

  private async calculateCrossDepartmentConnections(userId: string, relationships: SocialRelationship[]): Promise<number> {
    // Implementation for calculating cross-department connections
    return 0;
  }

  private async calculateAlumniConnections(userId: string, relationships: SocialRelationship[]): Promise<number> {
    // Implementation for calculating alumni connections
    return 0;
  }

  private async calculateUniversityNetworkGrowth(userId: string, relationships: SocialRelationship[]): Promise<number> {
    // Implementation for calculating university network growth
    return 0;
  }

  private calculateTrend(
    metric: string,
    currentValue: number,
    previousValue: number,
    period: string
  ): TrendAnalysis {
    const change = currentValue - previousValue;
    const changePercentage = previousValue > 0 ? (change / previousValue) * 100 : 0;
    
    let trend: 'increasing' | 'decreasing' | 'stable';
    if (changePercentage > 5) {
      trend = 'increasing';
    } else if (changePercentage < -5) {
      trend = 'decreasing';
    } else {
      trend = 'stable';
    }

    const significance = Math.abs(changePercentage) > 20 ? 'high' : 
                        Math.abs(changePercentage) > 10 ? 'medium' : 'low';

    return {
      metric,
      currentValue,
      previousValue,
      change,
      changePercentage,
      trend,
      significance,
      period
    };
  }

  private async analyzeConnectionGrowth(
    userId: string,
    metrics: SocialMetricsData
  ): Promise<NetworkInsights['insights'][0] | null> {
    if (metrics.connections.growthRate > 10) {
      return {
        type: 'connection_growth',
        title: 'Rapid Connection Growth',
        description: `Your network has grown by ${metrics.connections.growthRate.toFixed(1)}% this period.`,
        impact: 'high',
        actionable: true,
        recommendations: [
          'Engage with your new connections',
          'Share valuable content to maintain engagement',
          'Consider expanding to new communities'
        ],
        metrics: {
          current: metrics.connections.total,
          target: metrics.connections.total * 1.2,
          progress: 0.8
        }
      };
    }
    return null;
  }

  private async analyzeEngagement(
    userId: string,
    metrics: SocialMetricsData
  ): Promise<NetworkInsights['insights'][0] | null> {
    const totalEngagement = metrics.engagement.profileViews + metrics.engagement.connectionRequests;
    if (totalEngagement > 50) {
      return {
        type: 'engagement_boost',
        title: 'High Engagement Activity',
        description: `You've received ${totalEngagement} engagement actions this period.`,
        impact: 'medium',
        actionable: true,
        recommendations: [
          'Respond to connection requests promptly',
          'Update your profile to maintain interest',
          'Share more content to increase visibility'
        ],
        metrics: {
          current: totalEngagement,
          target: totalEngagement * 1.5,
          progress: 0.7
        }
      };
    }
    return null;
  }

  private async analyzeNetworkExpansion(
    userId: string,
    metrics: SocialMetricsData
  ): Promise<NetworkInsights['insights'][0] | null> {
    if (metrics.universityNetwork.crossDepartmentConnections > 10) {
      return {
        type: 'network_expansion',
        title: 'Cross-Department Network Growth',
        description: `You've connected with ${metrics.universityNetwork.crossDepartmentConnections} people from other departments.`,
        impact: 'high',
        actionable: true,
        recommendations: [
          'Attend cross-department events',
          'Join interdisciplinary groups',
          'Share knowledge across departments'
        ],
        metrics: {
          current: metrics.universityNetwork.crossDepartmentConnections,
          target: metrics.universityNetwork.crossDepartmentConnections * 1.3,
          progress: 0.8
        }
      };
    }
    return null;
  }

  private async analyzeInfluence(
    userId: string,
    metrics: SocialMetricsData
  ): Promise<NetworkInsights['insights'][0] | null> {
    if (metrics.network.influenceScore > 70) {
      return {
        type: 'influence_increase',
        title: 'High Influence Score',
        description: `Your influence score is ${metrics.network.influenceScore}, indicating strong network impact.`,
        impact: 'high',
        actionable: true,
        recommendations: [
          'Share valuable insights and knowledge',
          'Mentor newer students',
          'Lead community initiatives'
        ],
        metrics: {
          current: metrics.network.influenceScore,
          target: 90,
          progress: metrics.network.influenceScore / 90
        }
      };
    }
    return null;
  }

  private async analyzeCommunityFormation(
    userId: string,
    metrics: SocialMetricsData
  ): Promise<NetworkInsights['insights'][0] | null> {
    if (metrics.network.clusteringCoefficient > 0.3) {
      return {
        type: 'community_formation',
        title: 'Strong Community Formation',
        description: `Your network shows high clustering, indicating strong community bonds.`,
        impact: 'medium',
        actionable: true,
        recommendations: [
          'Organize community events',
          'Facilitate introductions between connections',
          'Create shared interest groups'
        ],
        metrics: {
          current: metrics.network.clusteringCoefficient * 100,
          target: 50,
          progress: (metrics.network.clusteringCoefficient * 100) / 50
        }
      };
    }
    return null;
  }

  private async storeUserMetrics(metrics: SocialMetricsData): Promise<void> {
    try {
      await this.db.storeSocialMetrics(metrics);
    } catch (error) {
      console.error('Error storing user metrics:', error);
      throw error;
    }
  }

  private async cacheUserMetrics(metrics: SocialMetricsData): Promise<void> {
    try {
      const cacheKey = `social_metrics:${metrics.userId}:${metrics.period}:${this.formatDate(metrics.timestamp)}`;
      await this.cache.set(cacheKey, JSON.stringify(metrics), 3600); // 1 hour
    } catch (error) {
      console.error('Error caching user metrics:', error);
    }
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}
