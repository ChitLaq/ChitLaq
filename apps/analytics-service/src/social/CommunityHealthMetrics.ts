// Community Health Metrics
// Author: ChitLaq Development Team
// Date: 2024-01-15

import { SupabaseClient } from '@supabase/supabase-js';
import { Redis } from 'ioredis';

export interface CommunityHealthScore {
  overall: number;
  engagement: number;
  cohesion: number;
  safety: number;
  diversity: number;
  growth: number;
  timestamp: Date;
  universityId?: string;
}

export interface HealthIndicator {
  name: string;
  value: number;
  threshold: { min: number; max: number };
  status: 'healthy' | 'warning' | 'critical';
  trend: 'improving' | 'stable' | 'declining';
  description: string;
  recommendation?: string;
}

export interface CommunitySentiment {
  positive: number;
  neutral: number;
  negative: number;
  overall: number;
  confidence: number;
  sampleSize: number;
  trends: SentimentTrend[];
}

export interface SentimentTrend {
  period: string;
  sentiment: number;
  volume: number;
}

export interface SafetyMetrics {
  spamRate: number;
  abuseRate: number;
  harassmentRate: number;
  fakeAccountRate: number;
  contentViolationRate: number;
  moderationEfficiency: number;
  userReportRate: number;
  resolutionTime: number;
}

export interface DiversityMetrics {
  genderDistribution: Record<string, number>;
  academicYearDistribution: Record<string, number>;
  departmentDistribution: Record<string, number>;
  geographicDistribution: Record<string, number>;
  activityLevelDistribution: Record<string, number>;
  diversityIndex: number;
}

export interface EngagementMetrics {
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  averageSessionDuration: number;
  postsPerUser: number;
  interactionsPerUser: number;
  contentCreationRate: number;
  socialInteractionRate: number;
}

export class CommunityHealthMetrics {
  private supabase: SupabaseClient;
  private redis: Redis;
  private healthHistory: Map<string, CommunityHealthScore[]> = new Map();

  constructor(supabase: SupabaseClient, redis: Redis) {
    this.supabase = supabase;
    this.redis = redis;
  }

  /**
   * Calculate comprehensive community health score
   */
  async calculateCommunityHealth(universityId?: string): Promise<CommunityHealthScore> {
    const [engagement, cohesion, safety, diversity, growth] = await Promise.all([
      this.calculateEngagementScore(universityId),
      this.calculateCohesionScore(universityId),
      this.calculateSafetyScore(universityId),
      this.calculateDiversityScore(universityId),
      this.calculateGrowthScore(universityId)
    ]);

    const overall = (engagement + cohesion + safety + diversity + growth) / 5;

    const healthScore: CommunityHealthScore = {
      overall,
      engagement,
      cohesion,
      safety,
      diversity,
      growth,
      timestamp: new Date(),
      universityId
    };

    // Store health score
    await this.storeHealthScore(healthScore);

    // Update real-time metrics
    await this.updateRealtimeHealthMetrics(healthScore);

    return healthScore;
  }

  /**
   * Get health indicators with trends and recommendations
   */
  async getHealthIndicators(universityId?: string): Promise<HealthIndicator[]> {
    const currentHealth = await this.calculateCommunityHealth(universityId);
    const historicalHealth = await this.getHealthHistory(universityId, 30); // Last 30 days

    const indicators: HealthIndicator[] = [
      {
        name: 'Overall Health',
        value: currentHealth.overall,
        threshold: { min: 70, max: 100 },
        status: this.getHealthStatus(currentHealth.overall, 70, 100),
        trend: this.calculateTrend(historicalHealth.map(h => h.overall)),
        description: 'Overall community health score based on engagement, cohesion, safety, diversity, and growth',
        recommendation: currentHealth.overall < 70 ? 'Focus on improving user engagement and community safety' : undefined
      },
      {
        name: 'Engagement Level',
        value: currentHealth.engagement,
        threshold: { min: 60, max: 100 },
        status: this.getHealthStatus(currentHealth.engagement, 60, 100),
        trend: this.calculateTrend(historicalHealth.map(h => h.engagement)),
        description: 'Measures user activity, content creation, and social interactions',
        recommendation: currentHealth.engagement < 60 ? 'Implement gamification and improve content discovery' : undefined
      },
      {
        name: 'Community Cohesion',
        value: currentHealth.cohesion,
        threshold: { min: 50, max: 100 },
        status: this.getHealthStatus(currentHealth.cohesion, 50, 100),
        trend: this.calculateTrend(historicalHealth.map(h => h.cohesion)),
        description: 'Measures how well-connected and integrated the community is',
        recommendation: currentHealth.cohesion < 50 ? 'Promote cross-departmental connections and community events' : undefined
      },
      {
        name: 'Safety Score',
        value: currentHealth.safety,
        threshold: { min: 80, max: 100 },
        status: this.getHealthStatus(currentHealth.safety, 80, 100),
        trend: this.calculateTrend(historicalHealth.map(h => h.safety)),
        description: 'Measures community safety, spam prevention, and content moderation effectiveness',
        recommendation: currentHealth.safety < 80 ? 'Strengthen moderation tools and user reporting mechanisms' : undefined
      },
      {
        name: 'Diversity Index',
        value: currentHealth.diversity,
        threshold: { min: 60, max: 100 },
        status: this.getHealthStatus(currentHealth.diversity, 60, 100),
        trend: this.calculateTrend(historicalHealth.map(h => h.diversity)),
        description: 'Measures diversity across departments, academic years, and user activity levels',
        recommendation: currentHealth.diversity < 60 ? 'Encourage participation from underrepresented groups' : undefined
      },
      {
        name: 'Growth Rate',
        value: currentHealth.growth,
        threshold: { min: 40, max: 100 },
        status: this.getHealthStatus(currentHealth.growth, 40, 100),
        trend: this.calculateTrend(historicalHealth.map(h => h.growth)),
        description: 'Measures user acquisition, retention, and network expansion',
        recommendation: currentHealth.growth < 40 ? 'Improve onboarding experience and user retention strategies' : undefined
      }
    ];

    return indicators;
  }

  /**
   * Analyze community sentiment
   */
  async analyzeCommunitySentiment(universityId?: string, days: number = 7): Promise<CommunitySentiment> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Get posts and comments for sentiment analysis
    const { data: posts, error: postsError } = await this.supabase
      .from('posts')
      .select('id, content, created_at, user_id, user_profiles(university_id)')
      .gte('created_at', since.toISOString())
      .eq(universityId ? 'user_profiles.university_id' : 'id', universityId || '');

    if (postsError) throw postsError;

    const { data: comments, error: commentsError } = await this.supabase
      .from('comments')
      .select('id, content, created_at, user_id, user_profiles(university_id)')
      .gte('created_at', since.toISOString())
      .eq(universityId ? 'user_profiles.university_id' : 'id', universityId || '');

    if (commentsError) throw commentsError;

    // Simple sentiment analysis (in production, use a proper NLP service)
    const allContent = [
      ...(posts || []).map(p => p.content),
      ...(comments || []).map(c => c.content)
    ];

    const sentimentScores = allContent.map(content => this.analyzeTextSentiment(content));
    
    const positive = sentimentScores.filter(s => s > 0.1).length;
    const negative = sentimentScores.filter(s => s < -0.1).length;
    const neutral = sentimentScores.length - positive - negative;
    
    const overall = sentimentScores.reduce((sum, score) => sum + score, 0) / sentimentScores.length;
    const confidence = Math.min(1, sentimentScores.length / 100); // Confidence based on sample size

    // Calculate daily trends
    const trends = this.calculateSentimentTrends(posts || [], comments || []);

    return {
      positive: positive / sentimentScores.length,
      neutral: neutral / sentimentScores.length,
      negative: negative / sentimentScores.length,
      overall,
      confidence,
      sampleSize: sentimentScores.length,
      trends
    };
  }

  /**
   * Get safety metrics
   */
  async getSafetyMetrics(universityId?: string, days: number = 7): Promise<SafetyMetrics> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Get moderation data
    const { data: reports, error: reportsError } = await this.supabase
      .from('user_reports')
      .select('*')
      .gte('created_at', since.toISOString())
      .eq(universityId ? 'university_id' : 'id', universityId || '');

    if (reportsError) throw reportsError;

    const { data: flags, error: flagsError } = await this.supabase
      .from('user_flags')
      .select('*')
      .gte('created_at', since.toISOString())
      .eq(universityId ? 'university_id' : 'id', universityId || '');

    if (flagsError) throw flagsError;

    // Get total user activity for rate calculations
    const { data: activity, error: activityError } = await this.supabase
      .from('social_activity_events')
      .select('id')
      .gte('timestamp', since.toISOString())
      .eq(universityId ? 'university_id' : 'id', universityId || '');

    if (activityError) throw activityError;

    const totalActivity = activity?.length || 1;
    const totalReports = reports?.length || 0;
    const totalFlags = flags?.length || 0;

    // Calculate rates
    const spamRate = (flags?.filter(f => f.flag_type === 'spam').length || 0) / totalActivity;
    const abuseRate = (reports?.filter(r => r.report_type === 'abuse').length || 0) / totalActivity;
    const harassmentRate = (reports?.filter(r => r.report_type === 'harassment').length || 0) / totalActivity;
    const fakeAccountRate = (flags?.filter(f => f.flag_type === 'fake_account').length || 0) / totalActivity;
    const contentViolationRate = (reports?.filter(r => r.report_type === 'inappropriate_content').length || 0) / totalActivity;
    
    // Calculate moderation efficiency
    const resolvedReports = reports?.filter(r => r.status === 'resolved').length || 0;
    const moderationEfficiency = totalReports > 0 ? resolvedReports / totalReports : 1;
    
    // Calculate average resolution time
    const resolvedReportsWithTime = reports?.filter(r => r.status === 'resolved' && r.resolved_at) || [];
    const resolutionTime = resolvedReportsWithTime.length > 0 
      ? resolvedReportsWithTime.reduce((sum, r) => {
          const created = new Date(r.created_at);
          const resolved = new Date(r.resolved_at!);
          return sum + (resolved.getTime() - created.getTime());
        }, 0) / resolvedReportsWithTime.length / (1000 * 60 * 60) // Convert to hours
      : 0;

    return {
      spamRate,
      abuseRate,
      harassmentRate,
      fakeAccountRate,
      contentViolationRate,
      moderationEfficiency,
      userReportRate: totalReports / totalActivity,
      resolutionTime
    };
  }

  /**
   * Get diversity metrics
   */
  async getDiversityMetrics(universityId?: string): Promise<DiversityMetrics> {
    const { data: users, error } = await this.supabase
      .from('user_profiles')
      .select('gender, academic_year, department_id, location, university_id')
      .eq(universityId ? 'university_id' : 'id', universityId || '');

    if (error) throw error;

    // Calculate distributions
    const genderDistribution = this.calculateDistribution(users || [], 'gender');
    const academicYearDistribution = this.calculateDistribution(users || [], 'academic_year');
    const departmentDistribution = this.calculateDistribution(users || [], 'department_id');
    const geographicDistribution = this.calculateDistribution(users || [], 'location');

    // Calculate activity level distribution
    const activityLevelDistribution = await this.calculateActivityLevelDistribution(universityId);

    // Calculate diversity index (Shannon entropy)
    const diversityIndex = this.calculateShannonEntropy([
      genderDistribution,
      academicYearDistribution,
      departmentDistribution,
      geographicDistribution,
      activityLevelDistribution
    ]);

    return {
      genderDistribution,
      academicYearDistribution,
      departmentDistribution,
      geographicDistribution,
      activityLevelDistribution,
      diversityIndex
    };
  }

  /**
   * Get engagement metrics
   */
  async getEngagementMetrics(universityId?: string, days: number = 7): Promise<EngagementMetrics> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Get user activity data
    const { data: dailyActivity, error: dailyError } = await this.supabase
      .from('social_activity_events')
      .select('user_id')
      .gte('timestamp', since.toISOString())
      .eq(universityId ? 'university_id' : 'id', universityId || '');

    if (dailyError) throw dailyError;

    // Get unique users for different time periods
    const dailyUsers = new Set(dailyActivity?.map(a => a.user_id) || []);
    
    const weekSince = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const { data: weeklyActivity } = await this.supabase
      .from('social_activity_events')
      .select('user_id')
      .gte('timestamp', weekSince.toISOString())
      .eq(universityId ? 'university_id' : 'id', universityId || '');
    
    const weeklyUsers = new Set(weeklyActivity?.map(a => a.user_id) || []);
    
    const monthSince = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const { data: monthlyActivity } = await this.supabase
      .from('social_activity_events')
      .select('user_id')
      .gte('timestamp', monthSince.toISOString())
      .eq(universityId ? 'university_id' : 'id', universityId || '');
    
    const monthlyUsers = new Set(monthlyActivity?.map(a => a.user_id) || []);

    // Get content creation data
    const { data: posts, error: postsError } = await this.supabase
      .from('posts')
      .select('user_id, created_at, user_profiles(university_id)')
      .gte('created_at', since.toISOString())
      .eq(universityId ? 'user_profiles.university_id' : 'id', universityId || '');

    if (postsError) throw postsError;

    const { data: interactions, error: interactionsError } = await this.supabase
      .from('post_interactions')
      .select('user_id, created_at, user_profiles(university_id)')
      .gte('created_at', since.toISOString())
      .eq(universityId ? 'user_profiles.university_id' : 'id', universityId || '');

    if (interactionsError) throw interactionsError;

    const totalUsers = dailyUsers.size;
    const totalPosts = posts?.length || 0;
    const totalInteractions = interactions?.length || 0;

    return {
      dailyActiveUsers: dailyUsers.size,
      weeklyActiveUsers: weeklyUsers.size,
      monthlyActiveUsers: monthlyUsers.size,
      averageSessionDuration: await this.calculateAverageSessionDuration(universityId, days),
      postsPerUser: totalUsers > 0 ? totalPosts / totalUsers : 0,
      interactionsPerUser: totalUsers > 0 ? totalInteractions / totalUsers : 0,
      contentCreationRate: totalPosts / days,
      socialInteractionRate: totalInteractions / days
    };
  }

  /**
   * Private helper methods
   */
  private async calculateEngagementScore(universityId?: string): Promise<number> {
    const engagement = await this.getEngagementMetrics(universityId);
    
    // Normalize metrics to 0-100 scale
    const dauScore = Math.min(100, (engagement.dailyActiveUsers / 1000) * 100);
    const postsScore = Math.min(100, engagement.postsPerUser * 10);
    const interactionsScore = Math.min(100, engagement.interactionsPerUser * 5);
    
    return (dauScore + postsScore + interactionsScore) / 3;
  }

  private async calculateCohesionScore(universityId?: string): Promise<number> {
    // Calculate network density and clustering
    const { data: connections, error } = await this.supabase
      .from('social_relationships')
      .select('source_user_id, target_user_id')
      .eq('relationship_type', 'follows')
      .eq(universityId ? 'university_id' : 'id', universityId || '');

    if (error) throw error;

    const { data: users, error: usersError } = await this.supabase
      .from('user_profiles')
      .select('id')
      .eq(universityId ? 'university_id' : 'id', universityId || '');

    if (usersError) throw usersError;

    const n = users.length;
    if (n < 2) return 0;

    const maxPossibleConnections = n * (n - 1);
    const actualConnections = connections.length;
    const density = actualConnections / maxPossibleConnections;

    // Calculate clustering coefficient
    const clustering = await this.calculateClusteringCoefficient(connections, users);

    return (density * 50) + (clustering * 50);
  }

  private async calculateSafetyScore(universityId?: string): Promise<number> {
    const safety = await this.getSafetyMetrics(universityId);
    
    // Convert rates to scores (lower rates = higher scores)
    const spamScore = Math.max(0, 100 - (safety.spamRate * 10000));
    const abuseScore = Math.max(0, 100 - (safety.abuseRate * 10000));
    const harassmentScore = Math.max(0, 100 - (safety.harassmentRate * 10000));
    const moderationScore = safety.moderationEfficiency * 100;
    
    return (spamScore + abuseScore + harassmentScore + moderationScore) / 4;
  }

  private async calculateDiversityScore(universityId?: string): Promise<number> {
    const diversity = await this.getDiversityMetrics(universityId);
    return diversity.diversityIndex * 100;
  }

  private async calculateGrowthScore(universityId?: string): Promise<number> {
    // Get user growth over time
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const { data: oldUsers, error: oldError } = await this.supabase
      .from('user_profiles')
      .select('id')
      .lt('created_at', thirtyDaysAgo.toISOString())
      .eq(universityId ? 'university_id' : 'id', universityId || '');

    if (oldError) throw oldError;

    const { data: newUsers, error: newError } = await this.supabase
      .from('user_profiles')
      .select('id')
      .gte('created_at', sevenDaysAgo.toISOString())
      .eq(universityId ? 'university_id' : 'id', universityId || '');

    if (newError) throw newError;

    const oldCount = oldUsers?.length || 0;
    const newCount = newUsers?.length || 0;
    const growthRate = oldCount > 0 ? (newCount / oldCount) * 100 : 0;

    return Math.min(100, growthRate * 10);
  }

  private async storeHealthScore(score: CommunityHealthScore): Promise<void> {
    const { error } = await this.supabase
      .from('community_health_scores')
      .insert({
        timestamp: score.timestamp.toISOString(),
        overall_score: score.overall,
        engagement_score: score.engagement,
        cohesion_score: score.cohesion,
        safety_score: score.safety,
        diversity_score: score.diversity,
        growth_score: score.growth,
        university_id: score.universityId
      });

    if (error) throw error;
  }

  private async updateRealtimeHealthMetrics(score: CommunityHealthScore): Promise<void> {
    const pipeline = this.redis.pipeline();
    
    pipeline.hset('community:health:current', {
      overall: score.overall,
      engagement: score.engagement,
      cohesion: score.cohesion,
      safety: score.safety,
      diversity: score.diversity,
      growth: score.growth,
      timestamp: score.timestamp.getTime()
    });

    pipeline.zadd('community:health:history', score.timestamp.getTime(), JSON.stringify(score));
    
    await pipeline.exec();
  }

  private async getHealthHistory(universityId?: string, days: number): Promise<CommunityHealthScore[]> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const { data, error } = await this.supabase
      .from('community_health_scores')
      .select('*')
      .gte('timestamp', since.toISOString())
      .eq(universityId ? 'university_id' : 'id', universityId || '')
      .order('timestamp', { ascending: true });

    if (error) throw error;

    return (data || []).map(row => ({
      overall: row.overall_score,
      engagement: row.engagement_score,
      cohesion: row.cohesion_score,
      safety: row.safety_score,
      diversity: row.diversity_score,
      growth: row.growth_score,
      timestamp: new Date(row.timestamp),
      universityId: row.university_id
    }));
  }

  private getHealthStatus(value: number, min: number, max: number): 'healthy' | 'warning' | 'critical' {
    if (value >= min) return 'healthy';
    if (value >= min * 0.7) return 'warning';
    return 'critical';
  }

  private calculateTrend(values: number[]): 'improving' | 'stable' | 'declining' {
    if (values.length < 2) return 'stable';
    
    const first = values[0];
    const last = values[values.length - 1];
    const change = (last - first) / first;
    
    if (change > 0.05) return 'improving';
    if (change < -0.05) return 'declining';
    return 'stable';
  }

  private analyzeTextSentiment(text: string): number {
    // Simple sentiment analysis using keyword matching
    // In production, use a proper NLP service like AWS Comprehend or Google Cloud Natural Language
    
    const positiveWords = ['good', 'great', 'awesome', 'amazing', 'love', 'like', 'happy', 'excited', 'wonderful', 'fantastic'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'dislike', 'sad', 'angry', 'frustrated', 'disappointed', 'horrible'];
    
    const words = text.toLowerCase().split(/\s+/);
    let score = 0;
    
    for (const word of words) {
      if (positiveWords.includes(word)) score += 1;
      if (negativeWords.includes(word)) score -= 1;
    }
    
    return Math.max(-1, Math.min(1, score / words.length));
  }

  private calculateSentimentTrends(posts: any[], comments: any[]): SentimentTrend[] {
    const trends: SentimentTrend[] = [];
    const allContent = [...posts, ...comments];
    
    // Group by day
    const dailyContent = new Map<string, string[]>();
    
    for (const item of allContent) {
      const date = new Date(item.created_at).toISOString().split('T')[0];
      if (!dailyContent.has(date)) {
        dailyContent.set(date, []);
      }
      dailyContent.get(date)!.push(item.content);
    }
    
    for (const [date, content] of dailyContent.entries()) {
      const sentiments = content.map(c => this.analyzeTextSentiment(c));
      const avgSentiment = sentiments.reduce((sum, s) => sum + s, 0) / sentiments.length;
      
      trends.push({
        period: date,
        sentiment: avgSentiment,
        volume: content.length
      });
    }
    
    return trends.sort((a, b) => a.period.localeCompare(b.period));
  }

  private calculateDistribution(items: any[], field: string): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    for (const item of items) {
      const value = item[field] || 'unknown';
      distribution[value] = (distribution[value] || 0) + 1;
    }
    
    return distribution;
  }

  private async calculateActivityLevelDistribution(universityId?: string): Promise<Record<string, number>> {
    const { data: activity, error } = await this.supabase
      .from('social_activity_events')
      .select('user_id')
      .eq(universityId ? 'university_id' : 'id', universityId || '');

    if (error) throw error;

    const userActivityCounts = new Map<string, number>();
    
    for (const event of activity || []) {
      userActivityCounts.set(event.user_id, (userActivityCounts.get(event.user_id) || 0) + 1);
    }

    const distribution: Record<string, number> = {
      low: 0,
      medium: 0,
      high: 0
    };

    for (const count of userActivityCounts.values()) {
      if (count < 10) distribution.low++;
      else if (count < 50) distribution.medium++;
      else distribution.high++;
    }

    return distribution;
  }

  private calculateShannonEntropy(distributions: Record<string, number>[]): number {
    let totalEntropy = 0;
    
    for (const distribution of distributions) {
      const total = Object.values(distribution).reduce((sum, count) => sum + count, 0);
      if (total === 0) continue;
      
      let entropy = 0;
      for (const count of Object.values(distribution)) {
        const probability = count / total;
        if (probability > 0) {
          entropy -= probability * Math.log2(probability);
        }
      }
      
      totalEntropy += entropy;
    }
    
    return totalEntropy / distributions.length;
  }

  private async calculateClusteringCoefficient(connections: any[], users: any[]): Promise<number> {
    const adjacencyList = new Map<string, Set<string>>();
    
    // Build adjacency list
    for (const user of users) {
      adjacencyList.set(user.id, new Set());
    }
    
    for (const conn of connections) {
      adjacencyList.get(conn.source_user_id)?.add(conn.target_user_id);
      adjacencyList.get(conn.target_user_id)?.add(conn.source_user_id);
    }
    
    let totalClustering = 0;
    let nodeCount = 0;
    
    for (const [node, neighbors] of adjacencyList.entries()) {
      const neighborCount = neighbors.size;
      if (neighborCount < 2) continue;
      
      let triangles = 0;
      for (const neighbor1 of neighbors) {
        for (const neighbor2 of neighbors) {
          if (neighbor1 !== neighbor2 && adjacencyList.get(neighbor1)?.has(neighbor2)) {
            triangles++;
          }
        }
      }
      
      const possibleTriangles = neighborCount * (neighborCount - 1);
      const clustering = possibleTriangles > 0 ? triangles / possibleTriangles : 0;
      
      totalClustering += clustering;
      nodeCount++;
    }
    
    return nodeCount > 0 ? totalClustering / nodeCount : 0;
  }

  private async calculateAverageSessionDuration(universityId?: string, days: number): Promise<number> {
    // This would require session tracking data
    // For now, return a placeholder value
    return 15; // minutes
  }
}
