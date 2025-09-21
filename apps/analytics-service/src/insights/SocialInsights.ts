// Social Insights Engine
// Author: ChitLaq Development Team
// Date: 2024-01-15

import { SupabaseClient } from '@supabase/supabase-js';
import { Redis } from 'ioredis';
import { SocialAnalytics, SocialInsight } from '../social/SocialAnalytics';
import { CommunityHealthMetrics, CommunityHealthScore } from '../social/CommunityHealthMetrics';
import { NetworkGrowthTracker, NetworkGrowthData } from '../social/NetworkGrowthTracker';

export interface InsightCategory {
  id: string;
  name: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  insights: SocialInsight[];
}

export interface InsightDashboard {
  overallHealth: number;
  criticalIssues: number;
  recommendations: number;
  categories: InsightCategory[];
  lastUpdated: Date;
  universityId?: string;
}

export interface TrendAnalysis {
  metric: string;
  currentValue: number;
  previousValue: number;
  change: number;
  changePercentage: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  significance: 'low' | 'medium' | 'high';
  forecast?: number;
}

export interface AnomalyDetection {
  type: 'spike' | 'drop' | 'pattern' | 'outlier';
  metric: string;
  value: number;
  expectedValue: number;
  deviation: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: Date;
  universityId?: string;
}

export interface Recommendation {
  id: string;
  type: 'growth' | 'engagement' | 'safety' | 'diversity' | 'retention';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  timeline: string;
  metrics: string[];
  actions: string[];
  expectedOutcome: string;
  universityId?: string;
}

export class SocialInsights {
  private supabase: SupabaseClient;
  private redis: Redis;
  private socialAnalytics: SocialAnalytics;
  private communityHealth: CommunityHealthMetrics;
  private networkGrowth: NetworkGrowthTracker;

  constructor(supabase: SupabaseClient, redis: Redis) {
    this.supabase = supabase;
    this.redis = redis;
    this.socialAnalytics = new SocialAnalytics(supabase, redis);
    this.communityHealth = new CommunityHealthMetrics(supabase, redis);
    this.networkGrowth = new NetworkGrowthTracker(supabase, redis);
  }

  /**
   * Generate comprehensive social insights dashboard
   */
  async generateInsightsDashboard(universityId?: string): Promise<InsightDashboard> {
    const [healthScore, insights, trends, anomalies, recommendations] = await Promise.all([
      this.communityHealth.calculateCommunityHealth(universityId),
      this.socialAnalytics.generateSocialInsights(universityId),
      this.analyzeTrends(universityId),
      this.detectAnomalies(universityId),
      this.generateRecommendations(universityId)
    ]);

    // Categorize insights
    const categories = this.categorizeInsights(insights, trends, anomalies, recommendations);

    const criticalIssues = insights.filter(i => i.severity === 'critical').length;
    const totalRecommendations = recommendations.length;

    return {
      overallHealth: healthScore.overall,
      criticalIssues,
      recommendations: totalRecommendations,
      categories,
      lastUpdated: new Date(),
      universityId
    };
  }

  /**
   * Analyze trends across key metrics
   */
  async analyzeTrends(universityId?: string): Promise<TrendAnalysis[]> {
    const [socialMetrics, healthScore, growthData] = await Promise.all([
      this.socialAnalytics.getSocialMetrics(universityId, 'week'),
      this.communityHealth.calculateCommunityHealth(universityId),
      this.networkGrowth.trackNetworkGrowth(universityId)
    ]);

    const trends: TrendAnalysis[] = [];

    // Network growth trends
    const growthTrends = await this.networkGrowth.analyzeGrowthTrends(universityId, 'week');
    if (growthTrends.length > 0) {
      const latest = growthTrends[growthTrends.length - 1];
      const previous = growthTrends.length > 1 ? growthTrends[growthTrends.length - 2] : latest;
      
      trends.push({
        metric: 'Network Growth Rate',
        currentValue: latest.growthRate,
        previousValue: previous.growthRate,
        change: latest.growthRate - previous.growthRate,
        changePercentage: previous.growthRate !== 0 ? ((latest.growthRate - previous.growthRate) / Math.abs(previous.growthRate)) * 100 : 0,
        trend: latest.trend,
        significance: Math.abs(latest.growthRate - previous.growthRate) > 10 ? 'high' : 'medium',
        forecast: latest.forecast
      });
    }

    // Engagement trends
    trends.push({
      metric: 'Social Interaction Frequency',
      currentValue: socialMetrics.engagement.socialInteractionFrequency,
      previousValue: await this.getPreviousMetric('social_interaction_frequency', universityId),
      change: socialMetrics.engagement.socialInteractionFrequency - await this.getPreviousMetric('social_interaction_frequency', universityId),
      changePercentage: await this.getPreviousMetric('social_interaction_frequency', universityId) !== 0 
        ? ((socialMetrics.engagement.socialInteractionFrequency - await this.getPreviousMetric('social_interaction_frequency', universityId)) / await this.getPreviousMetric('social_interaction_frequency', universityId)) * 100 
        : 0,
      trend: socialMetrics.engagement.socialInteractionFrequency > await this.getPreviousMetric('social_interaction_frequency', universityId) ? 'increasing' : 'decreasing',
      significance: 'medium'
    });

    // Community health trends
    trends.push({
      metric: 'Community Health Score',
      currentValue: healthScore.overall,
      previousValue: await this.getPreviousMetric('community_health', universityId),
      change: healthScore.overall - await this.getPreviousMetric('community_health', universityId),
      changePercentage: await this.getPreviousMetric('community_health', universityId) !== 0 
        ? ((healthScore.overall - await this.getPreviousMetric('community_health', universityId)) / await this.getPreviousMetric('community_health', universityId)) * 100 
        : 0,
      trend: healthScore.overall > await this.getPreviousMetric('community_health', universityId) ? 'increasing' : 'decreasing',
      significance: 'high'
    });

    return trends;
  }

  /**
   * Detect anomalies in social metrics
   */
  async detectAnomalies(universityId?: string): Promise<AnomalyDetection[]> {
    const anomalies: AnomalyDetection[] = [];
    const currentMetrics = await this.socialAnalytics.getSocialMetrics(universityId, 'day');
    const historicalData = await this.getHistoricalMetrics(universityId, 30); // Last 30 days

    // Check for spikes in activity
    const currentActivity = currentMetrics.engagement.socialInteractionFrequency;
    const avgActivity = historicalData.reduce((sum, d) => sum + d.engagement.socialInteractionFrequency, 0) / historicalData.length;
    const activityStdDev = this.calculateStandardDeviation(historicalData.map(d => d.engagement.socialInteractionFrequency));

    if (Math.abs(currentActivity - avgActivity) > 2 * activityStdDev) {
      anomalies.push({
        type: currentActivity > avgActivity ? 'spike' : 'drop',
        metric: 'Social Interaction Frequency',
        value: currentActivity,
        expectedValue: avgActivity,
        deviation: Math.abs(currentActivity - avgActivity),
        severity: Math.abs(currentActivity - avgActivity) > 3 * activityStdDev ? 'critical' : 'high',
        description: `Social interaction frequency ${currentActivity > avgActivity ? 'spiked' : 'dropped'} significantly`,
        timestamp: new Date(),
        universityId
      });
    }

    // Check for network growth anomalies
    const currentGrowth = currentMetrics.networkGrowth.connectionGrowthRate;
    const avgGrowth = historicalData.reduce((sum, d) => sum + d.networkGrowth.connectionGrowthRate, 0) / historicalData.length;
    const growthStdDev = this.calculateStandardDeviation(historicalData.map(d => d.networkGrowth.connectionGrowthRate));

    if (Math.abs(currentGrowth - avgGrowth) > 2 * growthStdDev) {
      anomalies.push({
        type: currentGrowth > avgGrowth ? 'spike' : 'drop',
        metric: 'Network Growth Rate',
        value: currentGrowth,
        expectedValue: avgGrowth,
        deviation: Math.abs(currentGrowth - avgGrowth),
        severity: Math.abs(currentGrowth - avgGrowth) > 3 * growthStdDev ? 'critical' : 'high',
        description: `Network growth rate ${currentGrowth > avgGrowth ? 'increased' : 'decreased'} significantly`,
        timestamp: new Date(),
        universityId
      });
    }

    // Check for safety metric anomalies
    const currentSafety = currentMetrics.communityHealth.spamAbuseRate;
    const avgSafety = historicalData.reduce((sum, d) => sum + d.communityHealth.spamAbuseRate, 0) / historicalData.length;

    if (currentSafety > avgSafety * 1.5) {
      anomalies.push({
        type: 'spike',
        metric: 'Spam/Abuse Rate',
        value: currentSafety,
        expectedValue: avgSafety,
        deviation: currentSafety - avgSafety,
        severity: currentSafety > avgSafety * 2 ? 'critical' : 'high',
        description: 'Spam and abuse rate has increased significantly',
        timestamp: new Date(),
        universityId
      });
    }

    return anomalies;
  }

  /**
   * Generate actionable recommendations
   */
  async generateRecommendations(universityId?: string): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];
    const metrics = await this.socialAnalytics.getSocialMetrics(universityId);
    const healthScore = await this.communityHealth.calculateCommunityHealth(universityId);

    // Growth recommendations
    if (metrics.networkGrowth.connectionGrowthRate < 5) {
      recommendations.push({
        id: crypto.randomUUID(),
        type: 'growth',
        title: 'Improve Network Growth',
        description: 'Network growth rate is below optimal levels',
        priority: 'high',
        impact: 'high',
        effort: 'medium',
        timeline: '2-4 weeks',
        metrics: ['connection_growth_rate', 'new_user_acquisition'],
        actions: [
          'Optimize recommendation algorithm',
          'Improve onboarding experience',
          'Add gamification elements',
          'Implement referral program'
        ],
        expectedOutcome: 'Increase network growth rate by 20-30%',
        universityId
      });
    }

    // Engagement recommendations
    if (metrics.engagement.socialInteractionFrequency < 0.5) {
      recommendations.push({
        id: crypto.randomUUID(),
        type: 'engagement',
        title: 'Boost Social Engagement',
        description: 'Social interaction frequency is low',
        priority: 'high',
        impact: 'high',
        effort: 'medium',
        timeline: '3-6 weeks',
        metrics: ['social_interaction_frequency', 'user_retention'],
        actions: [
          'Implement push notifications for social activities',
          'Add trending topics feature',
          'Create community challenges',
          'Improve content discovery algorithm'
        ],
        expectedOutcome: 'Increase social interaction frequency by 40-50%',
        universityId
      });
    }

    // Safety recommendations
    if (healthScore.safety < 80) {
      recommendations.push({
        id: crypto.randomUUID(),
        type: 'safety',
        title: 'Enhance Community Safety',
        description: 'Community safety score needs improvement',
        priority: 'critical',
        impact: 'high',
        effort: 'high',
        timeline: '1-2 weeks',
        metrics: ['safety_score', 'spam_abuse_rate'],
        actions: [
          'Strengthen content moderation',
          'Improve user reporting system',
          'Implement automated spam detection',
          'Add community guidelines enforcement'
        ],
        expectedOutcome: 'Improve safety score to 85+ and reduce spam/abuse by 50%',
        universityId
      });
    }

    // Diversity recommendations
    if (healthScore.diversity < 60) {
      recommendations.push({
        id: crypto.randomUUID(),
        type: 'diversity',
        title: 'Promote Community Diversity',
        description: 'Community diversity index is below optimal levels',
        priority: 'medium',
        impact: 'medium',
        effort: 'medium',
        timeline: '4-8 weeks',
        metrics: ['diversity_index', 'cross_departmental_interaction'],
        actions: [
          'Create department-specific features',
          'Organize cross-departmental events',
          'Implement diversity-focused recommendations',
          'Add academic year networking features'
        ],
        expectedOutcome: 'Increase diversity index by 15-20 points',
        universityId
      });
    }

    // Retention recommendations
    if (metrics.userSegmentation.atRiskUsers > metrics.userSegmentation.activeUsers * 0.3) {
      recommendations.push({
        id: crypto.randomUUID(),
        type: 'retention',
        title: 'Improve User Retention',
        description: 'High number of at-risk users detected',
        priority: 'high',
        impact: 'high',
        effort: 'high',
        timeline: '2-6 weeks',
        metrics: ['user_retention_rate', 'at_risk_users'],
        actions: [
          'Implement re-engagement campaigns',
          'Add personalized content recommendations',
          'Create retention-focused features',
          'Improve user onboarding flow'
        ],
        expectedOutcome: 'Reduce at-risk users by 30% and improve retention by 25%',
        universityId
      });
    }

    return recommendations;
  }

  /**
   * Get insights for specific time period
   */
  async getInsightsForPeriod(
    universityId: string | undefined,
    startDate: Date,
    endDate: Date
  ): Promise<{
    insights: SocialInsight[];
    trends: TrendAnalysis[];
    anomalies: AnomalyDetection[];
    recommendations: Recommendation[];
  }> {
    // This would filter insights based on the specified time period
    // For now, return current insights
    const [insights, trends, anomalies, recommendations] = await Promise.all([
      this.socialAnalytics.generateSocialInsights(universityId),
      this.analyzeTrends(universityId),
      this.detectAnomalies(universityId),
      this.generateRecommendations(universityId)
    ]);

    return {
      insights: insights.filter(i => i.timestamp >= startDate && i.timestamp <= endDate),
      trends,
      anomalies: anomalies.filter(a => a.timestamp >= startDate && a.timestamp <= endDate),
      recommendations
    };
  }

  /**
   * Get insights summary for reporting
   */
  async getInsightsSummary(universityId?: string): Promise<{
    totalInsights: number;
    criticalIssues: number;
    highPriorityRecommendations: number;
    topTrends: TrendAnalysis[];
    recentAnomalies: AnomalyDetection[];
  }> {
    const [insights, trends, anomalies, recommendations] = await Promise.all([
      this.socialAnalytics.generateSocialInsights(universityId),
      this.analyzeTrends(universityId),
      this.detectAnomalies(universityId),
      this.generateRecommendations(universityId)
    ]);

    return {
      totalInsights: insights.length,
      criticalIssues: insights.filter(i => i.severity === 'critical').length,
      highPriorityRecommendations: recommendations.filter(r => r.priority === 'high' || r.priority === 'critical').length,
      topTrends: trends.filter(t => t.significance === 'high').slice(0, 5),
      recentAnomalies: anomalies.filter(a => a.severity === 'high' || a.severity === 'critical').slice(0, 5)
    };
  }

  /**
   * Private helper methods
   */
  private categorizeInsights(
    insights: SocialInsight[],
    trends: TrendAnalysis[],
    anomalies: AnomalyDetection[],
    recommendations: Recommendation[]
  ): InsightCategory[] {
    const categories: InsightCategory[] = [
      {
        id: 'growth',
        name: 'Network Growth',
        description: 'Insights related to user acquisition and network expansion',
        priority: 'high',
        insights: insights.filter(i => i.type === 'growth')
      },
      {
        id: 'engagement',
        name: 'User Engagement',
        description: 'Insights related to user activity and interaction patterns',
        priority: 'high',
        insights: insights.filter(i => i.type === 'engagement')
      },
      {
        id: 'health',
        name: 'Community Health',
        description: 'Insights related to community safety and well-being',
        priority: 'critical',
        insights: insights.filter(i => i.type === 'health')
      },
      {
        id: 'recommendation',
        name: 'Recommendation Performance',
        description: 'Insights related to recommendation algorithm effectiveness',
        priority: 'medium',
        insights: insights.filter(i => i.type === 'recommendation')
      },
      {
        id: 'anomaly',
        name: 'Anomalies',
        description: 'Unusual patterns and outliers in social metrics',
        priority: 'high',
        insights: insights.filter(i => i.type === 'anomaly')
      }
    ];

    return categories.filter(cat => cat.insights.length > 0);
  }

  private async getPreviousMetric(metric: string, universityId?: string): Promise<number> {
    // This would fetch the previous period's metric value
    // For now, return a placeholder
    return 0;
  }

  private async getHistoricalMetrics(universityId?: string, days: number): Promise<any[]> {
    // This would fetch historical metrics data
    // For now, return empty array
    return [];
  }

  private calculateStandardDeviation(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
    
    return Math.sqrt(variance);
  }
}
