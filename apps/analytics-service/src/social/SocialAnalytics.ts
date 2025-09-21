// Social Analytics Service
// Author: ChitLaq Development Team
// Date: 2024-01-15

import { SupabaseClient } from '@supabase/supabase-js';
import { Redis } from 'ioredis';

export interface SocialMetrics {
  networkGrowth: NetworkGrowthMetrics;
  engagement: EngagementMetrics;
  communityHealth: CommunityHealthMetrics;
  recommendationPerformance: RecommendationMetrics;
  userSegmentation: UserSegmentationMetrics;
}

export interface NetworkGrowthMetrics {
  dailyNewConnections: number;
  weeklyNewConnections: number;
  monthlyNewConnections: number;
  connectionGrowthRate: number;
  universityNetworkDensity: number;
  crossUniversityConnections: number;
  mutualConnectionDistribution: ConnectionDistribution;
  followUnfollowRatio: number;
}

export interface EngagementMetrics {
  socialInteractionFrequency: number;
  universityFeatureAdoption: number;
  communityParticipation: number;
  contentSharingRate: number;
  socialDiscoveryEffectiveness: number;
  userRetentionCorrelation: number;
  viralCoefficient: number;
  networkEffectStrength: number;
}

export interface CommunityHealthMetrics {
  networkCohesion: number;
  socialGraphClustering: number;
  isolationRate: number;
  spamAbuseRate: number;
  communitySentiment: number;
  crossDepartmentalInteraction: number;
  alumniEngagement: number;
  universityPrideCorrelation: number;
}

export interface RecommendationMetrics {
  acceptanceRate: number;
  clickThroughRate: number;
  conversionRate: number;
  algorithmAccuracy: number;
  userSatisfactionScore: number;
  recommendationDiversity: number;
  coldStartPerformance: number;
  longTermEngagement: number;
}

export interface UserSegmentationMetrics {
  activeUsers: number;
  passiveUsers: number;
  newUsers: number;
  returningUsers: number;
  powerUsers: number;
  atRiskUsers: number;
  segmentDistribution: Record<string, number>;
  segmentEngagement: Record<string, number>;
}

export interface ConnectionDistribution {
  mutualConnections: Record<number, number>; // count -> frequency
  averageMutualConnections: number;
  medianMutualConnections: number;
  maxMutualConnections: number;
}

export interface SocialActivityEvent {
  id: string;
  userId: string;
  activityType: 'follow' | 'unfollow' | 'block' | 'unblock' | 'post' | 'like' | 'comment' | 'share';
  targetUserId?: string;
  targetPostId?: string;
  universityId: string;
  departmentId?: string;
  academicYear?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface SocialInsight {
  id: string;
  type: 'growth' | 'engagement' | 'health' | 'recommendation' | 'anomaly';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  actionable: boolean;
  recommendation?: string;
  metrics: Record<string, number>;
  timestamp: Date;
  universityId?: string;
}

export class SocialAnalytics {
  private supabase: SupabaseClient;
  private redis: Redis;
  private metricsCache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(supabase: SupabaseClient, redis: Redis) {
    this.supabase = supabase;
    this.redis = redis;
  }

  /**
   * Get comprehensive social metrics for a university or platform-wide
   */
  async getSocialMetrics(universityId?: string, timeRange: 'day' | 'week' | 'month' = 'week'): Promise<SocialMetrics> {
    const cacheKey = `social_metrics_${universityId || 'global'}_${timeRange}`;
    const cached = await this.getCachedMetrics(cacheKey);
    if (cached) return cached;

    const [networkGrowth, engagement, communityHealth, recommendationPerformance, userSegmentation] = await Promise.all([
      this.getNetworkGrowthMetrics(universityId, timeRange),
      this.getEngagementMetrics(universityId, timeRange),
      this.getCommunityHealthMetrics(universityId, timeRange),
      this.getRecommendationPerformanceMetrics(universityId, timeRange),
      this.getUserSegmentationMetrics(universityId, timeRange)
    ]);

    const metrics: SocialMetrics = {
      networkGrowth,
      engagement,
      communityHealth,
      recommendationPerformance,
      userSegmentation
    };

    await this.cacheMetrics(cacheKey, metrics);
    return metrics;
  }

  /**
   * Track social activity event
   */
  async trackSocialActivity(event: Omit<SocialActivityEvent, 'id' | 'timestamp'>): Promise<void> {
    const activityEvent: SocialActivityEvent = {
      ...event,
      id: crypto.randomUUID(),
      timestamp: new Date()
    };

    // Store in database
    const { error } = await this.supabase
      .from('social_activity_events')
      .insert(activityEvent);

    if (error) {
      console.error('Failed to track social activity:', error);
      return;
    }

    // Update real-time metrics in Redis
    await this.updateRealtimeMetrics(activityEvent);

    // Check for anomalies
    await this.checkForAnomalies(activityEvent);
  }

  /**
   * Get network growth metrics
   */
  private async getNetworkGrowthMetrics(universityId?: string, timeRange: string = 'week'): Promise<NetworkGrowthMetrics> {
    const timeFilter = this.getTimeFilter(timeRange);
    const universityFilter = universityId ? `AND university_id = '${universityId}'` : '';

    // Get connection counts
    const { data: connections, error: connError } = await this.supabase.rpc('get_connection_metrics', {
      time_filter: timeFilter,
      university_filter: universityFilter
    });

    if (connError) throw connError;

    // Get mutual connection distribution
    const { data: mutualDist, error: mutualError } = await this.supabase.rpc('get_mutual_connection_distribution', {
      university_filter: universityFilter
    });

    if (mutualError) throw mutualError;

    // Calculate growth rate
    const previousPeriod = await this.getPreviousPeriodMetrics(universityId, timeRange);
    const growthRate = previousPeriod.connections > 0 
      ? ((connections.total - previousPeriod.connections) / previousPeriod.connections) * 100 
      : 0;

    return {
      dailyNewConnections: connections.daily || 0,
      weeklyNewConnections: connections.weekly || 0,
      monthlyNewConnections: connections.monthly || 0,
      connectionGrowthRate: growthRate,
      universityNetworkDensity: connections.density || 0,
      crossUniversityConnections: connections.cross_university || 0,
      mutualConnectionDistribution: {
        mutualConnections: mutualDist.distribution || {},
        averageMutualConnections: mutualDist.average || 0,
        medianMutualConnections: mutualDist.median || 0,
        maxMutualConnections: mutualDist.max || 0
      },
      followUnfollowRatio: connections.follow_unfollow_ratio || 0
    };
  }

  /**
   * Get engagement metrics
   */
  private async getEngagementMetrics(universityId?: string, timeRange: string = 'week'): Promise<EngagementMetrics> {
    const timeFilter = this.getTimeFilter(timeRange);
    const universityFilter = universityId ? `AND university_id = '${universityId}'` : '';

    const { data: engagement, error } = await this.supabase.rpc('get_engagement_metrics', {
      time_filter: timeFilter,
      university_filter: universityFilter
    });

    if (error) throw error;

    return {
      socialInteractionFrequency: engagement.interaction_frequency || 0,
      universityFeatureAdoption: engagement.feature_adoption || 0,
      communityParticipation: engagement.community_participation || 0,
      contentSharingRate: engagement.content_sharing_rate || 0,
      socialDiscoveryEffectiveness: engagement.discovery_effectiveness || 0,
      userRetentionCorrelation: engagement.retention_correlation || 0,
      viralCoefficient: engagement.viral_coefficient || 0,
      networkEffectStrength: engagement.network_effect || 0
    };
  }

  /**
   * Get community health metrics
   */
  private async getCommunityHealthMetrics(universityId?: string, timeRange: string = 'week'): Promise<CommunityHealthMetrics> {
    const timeFilter = this.getTimeFilter(timeRange);
    const universityFilter = universityId ? `AND university_id = '${universityId}'` : '';

    const { data: health, error } = await this.supabase.rpc('get_community_health_metrics', {
      time_filter: timeFilter,
      university_filter: universityFilter
    });

    if (error) throw error;

    return {
      networkCohesion: health.network_cohesion || 0,
      socialGraphClustering: health.graph_clustering || 0,
      isolationRate: health.isolation_rate || 0,
      spamAbuseRate: health.spam_abuse_rate || 0,
      communitySentiment: health.community_sentiment || 0,
      crossDepartmentalInteraction: health.cross_departmental || 0,
      alumniEngagement: health.alumni_engagement || 0,
      universityPrideCorrelation: health.university_pride || 0
    };
  }

  /**
   * Get recommendation performance metrics
   */
  private async getRecommendationPerformanceMetrics(universityId?: string, timeRange: string = 'week'): Promise<RecommendationMetrics> {
    const timeFilter = this.getTimeFilter(timeRange);
    const universityFilter = universityId ? `AND university_id = '${universityId}'` : '';

    const { data: recommendations, error } = await this.supabase.rpc('get_recommendation_metrics', {
      time_filter: timeFilter,
      university_filter: universityFilter
    });

    if (error) throw error;

    return {
      acceptanceRate: recommendations.acceptance_rate || 0,
      clickThroughRate: recommendations.click_through_rate || 0,
      conversionRate: recommendations.conversion_rate || 0,
      algorithmAccuracy: recommendations.algorithm_accuracy || 0,
      userSatisfactionScore: recommendations.satisfaction_score || 0,
      recommendationDiversity: recommendations.diversity || 0,
      coldStartPerformance: recommendations.cold_start || 0,
      longTermEngagement: recommendations.long_term_engagement || 0
    };
  }

  /**
   * Get user segmentation metrics
   */
  private async getUserSegmentationMetrics(universityId?: string, timeRange: string = 'week'): Promise<UserSegmentationMetrics> {
    const timeFilter = this.getTimeFilter(timeRange);
    const universityFilter = universityId ? `AND university_id = '${universityId}'` : '';

    const { data: segments, error } = await this.supabase.rpc('get_user_segmentation_metrics', {
      time_filter: timeFilter,
      university_filter: universityFilter
    });

    if (error) throw error;

    return {
      activeUsers: segments.active_users || 0,
      passiveUsers: segments.passive_users || 0,
      newUsers: segments.new_users || 0,
      returningUsers: segments.returning_users || 0,
      powerUsers: segments.power_users || 0,
      atRiskUsers: segments.at_risk_users || 0,
      segmentDistribution: segments.distribution || {},
      segmentEngagement: segments.engagement || {}
    };
  }

  /**
   * Generate social insights based on metrics
   */
  async generateSocialInsights(universityId?: string): Promise<SocialInsight[]> {
    const metrics = await this.getSocialMetrics(universityId);
    const insights: SocialInsight[] = [];

    // Network growth insights
    if (metrics.networkGrowth.connectionGrowthRate < -10) {
      insights.push({
        id: crypto.randomUUID(),
        type: 'growth',
        title: 'Network Growth Decline',
        description: `Network growth has declined by ${Math.abs(metrics.networkGrowth.connectionGrowthRate).toFixed(1)}%`,
        severity: 'high',
        actionable: true,
        recommendation: 'Investigate user onboarding flow and recommendation algorithm performance',
        metrics: { growthRate: metrics.networkGrowth.connectionGrowthRate },
        timestamp: new Date(),
        universityId
      });
    }

    // Engagement insights
    if (metrics.engagement.socialInteractionFrequency < 0.5) {
      insights.push({
        id: crypto.randomUUID(),
        type: 'engagement',
        title: 'Low Social Interaction',
        description: 'Social interaction frequency is below optimal levels',
        severity: 'medium',
        actionable: true,
        recommendation: 'Implement gamification features and improve content discovery',
        metrics: { interactionFrequency: metrics.engagement.socialInteractionFrequency },
        timestamp: new Date(),
        universityId
      });
    }

    // Community health insights
    if (metrics.communityHealth.isolationRate > 0.3) {
      insights.push({
        id: crypto.randomUUID(),
        type: 'health',
        title: 'High User Isolation',
        description: `${(metrics.communityHealth.isolationRate * 100).toFixed(1)}% of users appear isolated`,
        severity: 'high',
        actionable: true,
        recommendation: 'Improve recommendation algorithm and add community features',
        metrics: { isolationRate: metrics.communityHealth.isolationRate },
        timestamp: new Date(),
        universityId
      });
    }

    // Recommendation performance insights
    if (metrics.recommendationPerformance.acceptanceRate < 0.1) {
      insights.push({
        id: crypto.randomUUID(),
        type: 'recommendation',
        title: 'Low Recommendation Acceptance',
        description: 'Recommendation acceptance rate is below 10%',
        severity: 'medium',
        actionable: true,
        recommendation: 'Review recommendation algorithm and improve user profiling',
        metrics: { acceptanceRate: metrics.recommendationPerformance.acceptanceRate },
        timestamp: new Date(),
        universityId
      });
    }

    return insights;
  }

  /**
   * Get real-time social activity stream
   */
  async getRealtimeSocialActivity(universityId?: string, limit: number = 50): Promise<SocialActivityEvent[]> {
    const { data, error } = await this.supabase
      .from('social_activity_events')
      .select('*')
      .eq(universityId ? 'university_id' : 'id', universityId || '')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  /**
   * Update real-time metrics in Redis
   */
  private async updateRealtimeMetrics(event: SocialActivityEvent): Promise<void> {
    const pipeline = this.redis.pipeline();
    
    // Update activity counters
    pipeline.incr(`social:activity:${event.activityType}:count`);
    pipeline.incr(`social:activity:${event.universityId}:count`);
    pipeline.incr(`social:activity:${event.userId}:count`);
    
    // Update time-based counters
    const hour = new Date().getHours();
    pipeline.incr(`social:activity:hour:${hour}:count`);
    
    // Update engagement score
    pipeline.zincrby('social:engagement:scores', 1, event.userId);
    
    await pipeline.exec();
  }

  /**
   * Check for anomalies in social activity
   */
  private async checkForAnomalies(event: SocialActivityEvent): Promise<void> {
    // Check for spam patterns
    const userActivityCount = await this.redis.get(`social:activity:${event.userId}:count`);
    if (userActivityCount && parseInt(userActivityCount) > 100) {
      await this.flagPotentialSpam(event.userId, 'High activity volume');
    }

    // Check for bot patterns
    const recentActivities = await this.getRecentUserActivity(event.userId, 10);
    const timeGaps = this.calculateTimeGaps(recentActivities);
    if (this.isBotPattern(timeGaps)) {
      await this.flagPotentialBot(event.userId, 'Suspicious timing pattern');
    }
  }

  /**
   * Helper methods
   */
  private getTimeFilter(timeRange: string): string {
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    return `timestamp >= '${startDate.toISOString()}'`;
  }

  private async getPreviousPeriodMetrics(universityId?: string, timeRange: string): Promise<{ connections: number }> {
    // Implementation would fetch previous period data
    return { connections: 0 };
  }

  private async getCachedMetrics(key: string): Promise<SocialMetrics | null> {
    const cached = this.metricsCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    return null;
  }

  private async cacheMetrics(key: string, data: SocialMetrics): Promise<void> {
    this.metricsCache.set(key, { data, timestamp: Date.now() });
  }

  private async getRecentUserActivity(userId: string, limit: number): Promise<SocialActivityEvent[]> {
    const { data } = await this.supabase
      .from('social_activity_events')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    return data || [];
  }

  private calculateTimeGaps(activities: SocialActivityEvent[]): number[] {
    const gaps: number[] = [];
    for (let i = 1; i < activities.length; i++) {
      const gap = activities[i-1].timestamp.getTime() - activities[i].timestamp.getTime();
      gaps.push(gap);
    }
    return gaps;
  }

  private isBotPattern(timeGaps: number[]): boolean {
    if (timeGaps.length < 3) return false;
    
    // Check for very regular intervals (bot-like behavior)
    const avgGap = timeGaps.reduce((a, b) => a + b, 0) / timeGaps.length;
    const variance = timeGaps.reduce((sum, gap) => sum + Math.pow(gap - avgGap, 2), 0) / timeGaps.length;
    const coefficientOfVariation = Math.sqrt(variance) / avgGap;
    
    return coefficientOfVariation < 0.1; // Very low variation indicates bot-like behavior
  }

  private async flagPotentialSpam(userId: string, reason: string): Promise<void> {
    await this.supabase
      .from('user_flags')
      .insert({
        user_id: userId,
        flag_type: 'spam',
        reason,
        severity: 'medium',
        created_at: new Date().toISOString()
      });
  }

  private async flagPotentialBot(userId: string, reason: string): Promise<void> {
    await this.supabase
      .from('user_flags')
      .insert({
        user_id: userId,
        flag_type: 'bot',
        reason,
        severity: 'high',
        created_at: new Date().toISOString()
      });
  }
}
