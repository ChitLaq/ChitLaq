// Social Analytics Tests
// Author: ChitLaq Development Team
// Date: 2024-01-15

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';
import { Redis } from 'ioredis';
import { SocialAnalytics, SocialActivityEvent } from '../src/social/SocialAnalytics';
import { CommunityHealthMetrics } from '../src/social/CommunityHealthMetrics';
import { NetworkGrowthTracker } from '../src/social/NetworkGrowthTracker';
import { SocialInsights } from '../src/insights/SocialInsights';

// Mock Supabase client
const mockSupabase = createClient('https://test.supabase.co', 'test-key');

// Mock Redis client
const mockRedis = {
  pipeline: jest.fn(() => ({
    incr: jest.fn(),
    hset: jest.fn(),
    zadd: jest.fn(),
    exec: jest.fn()
  })),
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn()
} as unknown as Redis;

describe('SocialAnalytics', () => {
  let socialAnalytics: SocialAnalytics;

  beforeEach(() => {
    socialAnalytics = new SocialAnalytics(mockSupabase, mockRedis);
    jest.clearAllMocks();
  });

  describe('getSocialMetrics', () => {
    it('should return comprehensive social metrics', async () => {
      // Mock Supabase responses
      mockSupabase.rpc = jest.fn().mockImplementation((fnName) => {
        switch (fnName) {
          case 'get_connection_metrics':
            return Promise.resolve({
              data: {
                total: 1000,
                daily: 50,
                weekly: 300,
                monthly: 1000,
                density: 0.15,
                cross_university: 100,
                follow_unfollow_ratio: 0.8
              },
              error: null
            });
          case 'get_mutual_connection_distribution':
            return Promise.resolve({
              data: {
                distribution: { '0': 100, '1': 200, '2': 150 },
                average: 1.5,
                median: 1.0,
                max: 10
              },
              error: null
            });
          case 'get_engagement_metrics':
            return Promise.resolve({
              data: {
                interaction_frequency: 2.5,
                feature_adoption: 0.6,
                community_participation: 0.7,
                content_sharing_rate: 1.2,
                discovery_effectiveness: 0.75,
                retention_correlation: 0.85,
                viral_coefficient: 1.2,
                network_effect: 0.9
              },
              error: null
            });
          case 'get_community_health_metrics':
            return Promise.resolve({
              data: {
                network_cohesion: 0.6,
                graph_clustering: 0.65,
                isolation_rate: 0.2,
                spam_abuse_rate: 0.05,
                community_sentiment: 0.75,
                cross_departmental: 0.6,
                alumni_engagement: 0.4,
                university_pride: 0.8
              },
              error: null
            });
          case 'get_recommendation_metrics':
            return Promise.resolve({
              data: {
                acceptance_rate: 0.15,
                click_through_rate: 0.25,
                conversion_rate: 0.08,
                algorithm_accuracy: 0.78,
                satisfaction_score: 0.72,
                diversity: 0.65,
                cold_start: 0.45,
                long_term_engagement: 0.68
              },
              error: null
            });
          case 'get_user_segmentation_metrics':
            return Promise.resolve({
              data: {
                active_users: 500,
                passive_users: 300,
                new_users: 100,
                returning_users: 200,
                power_users: 50,
                at_risk_users: 25,
                distribution: { active: 500, passive: 300 },
                engagement: { active: 0.6, passive: 0.4 }
              },
              error: null
            });
          default:
            return Promise.resolve({ data: null, error: null });
        }
      });

      const metrics = await socialAnalytics.getSocialMetrics('university-1', 'week');

      expect(metrics).toBeDefined();
      expect(metrics.networkGrowth.totalConnections).toBe(1000);
      expect(metrics.engagement.socialInteractionFrequency).toBe(2.5);
      expect(metrics.communityHealth.networkCohesion).toBe(0.6);
      expect(metrics.recommendationPerformance.acceptanceRate).toBe(0.15);
      expect(metrics.userSegmentation.activeUsers).toBe(500);
    });

    it('should handle errors gracefully', async () => {
      mockSupabase.rpc = jest.fn().mockRejectedValue(new Error('Database error'));

      await expect(socialAnalytics.getSocialMetrics()).rejects.toThrow('Database error');
    });
  });

  describe('trackSocialActivity', () => {
    it('should track social activity event', async () => {
      mockSupabase.from = jest.fn().mockReturnValue({
        insert: jest.fn().mockResolvedValue({ error: null })
      });

      const event: Omit<SocialActivityEvent, 'id' | 'timestamp'> = {
        userId: 'user-1',
        activityType: 'follow',
        targetUserId: 'user-2',
        universityId: 'university-1',
        departmentId: 'dept-1',
        academicYear: '2024'
      };

      await socialAnalytics.trackSocialActivity(event);

      expect(mockSupabase.from).toHaveBeenCalledWith('social_activity_events');
    });

    it('should update real-time metrics in Redis', async () => {
      mockSupabase.from = jest.fn().mockReturnValue({
        insert: jest.fn().mockResolvedValue({ error: null })
      });

      const event: Omit<SocialActivityEvent, 'id' | 'timestamp'> = {
        userId: 'user-1',
        activityType: 'follow',
        targetUserId: 'user-2',
        universityId: 'university-1'
      };

      await socialAnalytics.trackSocialActivity(event);

      expect(mockRedis.pipeline).toHaveBeenCalled();
    });
  });

  describe('generateSocialInsights', () => {
    it('should generate insights based on metrics', async () => {
      // Mock getSocialMetrics to return specific values
      jest.spyOn(socialAnalytics, 'getSocialMetrics').mockResolvedValue({
        networkGrowth: {
          dailyNewConnections: 0,
          weeklyNewConnections: 0,
          monthlyNewConnections: 0,
          connectionGrowthRate: -15, // Declining growth
          universityNetworkDensity: 0.1,
          crossUniversityConnections: 0,
          mutualConnectionDistribution: {
            mutualConnections: {},
            averageMutualConnections: 0,
            medianMutualConnections: 0,
            maxMutualConnections: 0
          },
          followUnfollowRatio: 0
        },
        engagement: {
          socialInteractionFrequency: 0.3, // Low interaction
          universityFeatureAdoption: 0,
          communityParticipation: 0,
          contentSharingRate: 0,
          socialDiscoveryEffectiveness: 0,
          userRetentionCorrelation: 0,
          viralCoefficient: 0,
          networkEffectStrength: 0
        },
        communityHealth: {
          networkCohesion: 0,
          socialGraphClustering: 0,
          isolationRate: 0.4, // High isolation
          spamAbuseRate: 0,
          communitySentiment: 0,
          crossDepartmentalInteraction: 0,
          alumniEngagement: 0,
          universityPrideCorrelation: 0
        },
        recommendationPerformance: {
          acceptanceRate: 0.05, // Low acceptance
          clickThroughRate: 0,
          conversionRate: 0,
          algorithmAccuracy: 0,
          userSatisfactionScore: 0,
          recommendationDiversity: 0,
          coldStartPerformance: 0,
          longTermEngagement: 0
        },
        userSegmentation: {
          activeUsers: 0,
          passiveUsers: 0,
          newUsers: 0,
          returningUsers: 0,
          powerUsers: 0,
          atRiskUsers: 0,
          segmentDistribution: {},
          segmentEngagement: {}
        }
      });

      const insights = await socialAnalytics.generateSocialInsights('university-1');

      expect(insights).toHaveLength(4); // Should generate 4 insights
      expect(insights[0].type).toBe('growth');
      expect(insights[1].type).toBe('engagement');
      expect(insights[2].type).toBe('health');
      expect(insights[3].type).toBe('recommendation');
    });
  });
});

describe('CommunityHealthMetrics', () => {
  let communityHealth: CommunityHealthMetrics;

  beforeEach(() => {
    communityHealth = new CommunityHealthMetrics(mockSupabase, mockRedis);
    jest.clearAllMocks();
  });

  describe('calculateCommunityHealth', () => {
    it('should calculate comprehensive community health score', async () => {
      // Mock the individual score calculation methods
      jest.spyOn(communityHealth, 'calculateEngagementScore').mockResolvedValue(75);
      jest.spyOn(communityHealth, 'calculateCohesionScore').mockResolvedValue(80);
      jest.spyOn(communityHealth, 'calculateSafetyScore').mockResolvedValue(90);
      jest.spyOn(communityHealth, 'calculateDiversityScore').mockResolvedValue(70);
      jest.spyOn(communityHealth, 'calculateGrowthScore').mockResolvedValue(85);

      mockSupabase.from = jest.fn().mockReturnValue({
        insert: jest.fn().mockResolvedValue({ error: null })
      });

      const healthScore = await communityHealth.calculateCommunityHealth('university-1');

      expect(healthScore.overall).toBe(80); // Average of all scores
      expect(healthScore.engagement).toBe(75);
      expect(healthScore.cohesion).toBe(80);
      expect(healthScore.safety).toBe(90);
      expect(healthScore.diversity).toBe(70);
      expect(healthScore.growth).toBe(85);
    });
  });

  describe('getHealthIndicators', () => {
    it('should return health indicators with trends and recommendations', async () => {
      jest.spyOn(communityHealth, 'calculateCommunityHealth').mockResolvedValue({
        overall: 75,
        engagement: 70,
        cohesion: 80,
        safety: 90,
        diversity: 65,
        growth: 85,
        timestamp: new Date(),
        universityId: 'university-1'
      });

      jest.spyOn(communityHealth, 'getHealthHistory').mockResolvedValue([
        {
          overall: 70,
          engagement: 65,
          cohesion: 75,
          safety: 85,
          diversity: 60,
          growth: 80,
          timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          universityId: 'university-1'
        }
      ]);

      const indicators = await communityHealth.getHealthIndicators('university-1');

      expect(indicators).toHaveLength(6);
      expect(indicators[0].name).toBe('Overall Health');
      expect(indicators[0].value).toBe(75);
      expect(indicators[0].status).toBe('healthy');
    });
  });

  describe('analyzeCommunitySentiment', () => {
    it('should analyze community sentiment from posts and comments', async () => {
      mockSupabase.from = jest.fn().mockImplementation((table) => {
        if (table === 'posts') {
          return {
            select: jest.fn().mockReturnValue({
              gte: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: [
                    { content: 'Great post! Love this community.', created_at: new Date().toISOString() },
                    { content: 'This is amazing!', created_at: new Date().toISOString() }
                  ],
                  error: null
                })
              })
            })
          };
        }
        if (table === 'comments') {
          return {
            select: jest.fn().mockReturnValue({
              gte: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: [
                    { content: 'I agree completely!', created_at: new Date().toISOString() }
                  ],
                  error: null
                })
              })
            })
          };
        }
        return { select: jest.fn() };
      });

      const sentiment = await communityHealth.analyzeCommunitySentiment('university-1', 7);

      expect(sentiment.positive).toBeGreaterThan(0);
      expect(sentiment.overall).toBeGreaterThan(0);
      expect(sentiment.sampleSize).toBe(3);
    });
  });
});

describe('NetworkGrowthTracker', () => {
  let networkGrowth: NetworkGrowthTracker;

  beforeEach(() => {
    networkGrowth = new NetworkGrowthTracker(mockSupabase, mockRedis);
    jest.clearAllMocks();
  });

  describe('trackNetworkGrowth', () => {
    it('should track network growth metrics', async () => {
      mockSupabase.from = jest.fn().mockImplementation((table) => {
        if (table === 'social_relationships') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  count: 1000,
                  error: null
                })
              })
            })
          };
        }
        if (table === 'user_profiles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: Array(100).fill({ id: 'user-1' }),
                error: null
              })
            })
          };
        }
        if (table === 'network_growth_data') {
          return {
            insert: jest.fn().mockResolvedValue({ error: null })
          };
        }
        return { select: jest.fn() };
      });

      mockSupabase.rpc = jest.fn().mockResolvedValue({
        data: 5.5,
        error: null
      });

      const growthData = await networkGrowth.trackNetworkGrowth('university-1');

      expect(growthData.totalConnections).toBe(1000);
      expect(growthData.activeUsers).toBe(100);
      expect(growthData.universityId).toBe('university-1');
    });
  });

  describe('analyzeGrowthTrends', () => {
    it('should analyze growth trends over time', async () => {
      jest.spyOn(networkGrowth, 'getGrowthHistory').mockResolvedValue([
        {
          timestamp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
          totalConnections: 800,
          newConnections: 20,
          activeUsers: 80,
          networkDensity: 0.1,
          averageConnectionsPerUser: 4.0,
          universityId: 'university-1'
        },
        {
          timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          totalConnections: 900,
          newConnections: 25,
          activeUsers: 90,
          networkDensity: 0.12,
          averageConnectionsPerUser: 4.5,
          universityId: 'university-1'
        },
        {
          timestamp: new Date(),
          totalConnections: 1000,
          newConnections: 30,
          activeUsers: 100,
          networkDensity: 0.15,
          averageConnectionsPerUser: 5.0,
          universityId: 'university-1'
        }
      ]);

      const trends = await networkGrowth.analyzeGrowthTrends('university-1', 'week');

      expect(trends).toHaveLength(1);
      expect(trends[0].growthRate).toBeGreaterThan(0);
      expect(trends[0].trend).toBe('increasing');
    });
  });

  describe('monitorNetworkHealth', () => {
    it('should monitor network health and identify issues', async () => {
      jest.spyOn(networkGrowth, 'getNetworkTopology').mockResolvedValue({
        nodes: Array(100).fill({ id: 'user-1', connections: 5, centrality: 0.1 }),
        edges: Array(500).fill({ source: 'user-1', target: 'user-2', weight: 1 }),
        clusters: [],
        isolatedNodes: Array(20).fill('user-1'),
        hubNodes: Array(5).fill('user-1')
      });

      jest.spyOn(networkGrowth, 'trackNetworkGrowth').mockResolvedValue({
        timestamp: new Date(),
        totalConnections: 500,
        newConnections: 10,
        activeUsers: 100,
        networkDensity: 0.05,
        averageConnectionsPerUser: 2.5,
        universityId: 'university-1'
      });

      jest.spyOn(networkGrowth, 'analyzeGrowthTrends').mockResolvedValue([
        {
          period: '2024-01',
          growthRate: -10,
          trend: 'decreasing',
          confidence: 0.8,
          forecast: 450
        }
      ]);

      const health = await networkGrowth.monitorNetworkHealth('university-1');

      expect(health.healthScore).toBeLessThan(100);
      expect(health.issues).toContain('High isolation rate: 20.0%');
      expect(health.issues).toContain('Low network density: 5.0%');
      expect(health.issues).toContain('Declining growth rate: -10.0%');
      expect(health.recommendations).toHaveLength(3);
    });
  });
});

describe('SocialInsights', () => {
  let socialInsights: SocialInsights;

  beforeEach(() => {
    socialInsights = new SocialInsights(mockSupabase, mockRedis);
    jest.clearAllMocks();
  });

  describe('generateInsightsDashboard', () => {
    it('should generate comprehensive insights dashboard', async () => {
      // Mock the individual services
      jest.spyOn(socialInsights['communityHealth'], 'calculateCommunityHealth').mockResolvedValue({
        overall: 80,
        engagement: 75,
        cohesion: 85,
        safety: 90,
        diversity: 70,
        growth: 80,
        timestamp: new Date(),
        universityId: 'university-1'
      });

      jest.spyOn(socialInsights['socialAnalytics'], 'generateSocialInsights').mockResolvedValue([
        {
          id: 'insight-1',
          type: 'growth',
          title: 'Network Growth Decline',
          description: 'Network growth has declined significantly',
          severity: 'high',
          actionable: true,
          recommendation: 'Improve onboarding',
          metrics: { growthRate: -15 },
          timestamp: new Date(),
          universityId: 'university-1'
        }
      ]);

      jest.spyOn(socialInsights, 'analyzeTrends').mockResolvedValue([
        {
          metric: 'Network Growth Rate',
          currentValue: 5,
          previousValue: 10,
          change: -5,
          changePercentage: -50,
          trend: 'decreasing',
          significance: 'high',
          forecast: 3
        }
      ]);

      jest.spyOn(socialInsights, 'detectAnomalies').mockResolvedValue([
        {
          type: 'drop',
          metric: 'Social Interaction Frequency',
          value: 0.5,
          expectedValue: 2.0,
          deviation: 1.5,
          severity: 'high',
          description: 'Social interaction frequency dropped significantly',
          timestamp: new Date(),
          universityId: 'university-1'
        }
      ]);

      jest.spyOn(socialInsights, 'generateRecommendations').mockResolvedValue([
        {
          id: 'rec-1',
          type: 'growth',
          title: 'Improve Network Growth',
          description: 'Network growth rate is below optimal levels',
          priority: 'high',
          impact: 'high',
          effort: 'medium',
          timeline: '2-4 weeks',
          metrics: ['connection_growth_rate'],
          actions: ['Optimize recommendation algorithm'],
          expectedOutcome: 'Increase network growth rate by 20-30%',
          universityId: 'university-1'
        }
      ]);

      const dashboard = await socialInsights.generateInsightsDashboard('university-1');

      expect(dashboard.overallHealth).toBe(80);
      expect(dashboard.criticalIssues).toBe(0);
      expect(dashboard.recommendations).toBe(1);
      expect(dashboard.categories).toHaveLength(5);
      expect(dashboard.universityId).toBe('university-1');
    });
  });

  describe('generateRecommendations', () => {
    it('should generate actionable recommendations based on metrics', async () => {
      jest.spyOn(socialInsights['socialAnalytics'], 'getSocialMetrics').mockResolvedValue({
        networkGrowth: {
          dailyNewConnections: 0,
          weeklyNewConnections: 0,
          monthlyNewConnections: 0,
          connectionGrowthRate: 2, // Low growth
          universityNetworkDensity: 0.1,
          crossUniversityConnections: 0,
          mutualConnectionDistribution: {
            mutualConnections: {},
            averageMutualConnections: 0,
            medianMutualConnections: 0,
            maxMutualConnections: 0
          },
          followUnfollowRatio: 0
        },
        engagement: {
          socialInteractionFrequency: 0.3, // Low interaction
          universityFeatureAdoption: 0,
          communityParticipation: 0,
          contentSharingRate: 0,
          socialDiscoveryEffectiveness: 0,
          userRetentionCorrelation: 0,
          viralCoefficient: 0,
          networkEffectStrength: 0
        },
        communityHealth: {
          networkCohesion: 0,
          socialGraphClustering: 0,
          isolationRate: 0.2,
          spamAbuseRate: 0,
          communitySentiment: 0,
          crossDepartmentalInteraction: 0,
          alumniEngagement: 0,
          universityPrideCorrelation: 0
        },
        recommendationPerformance: {
          acceptanceRate: 0.15,
          clickThroughRate: 0,
          conversionRate: 0,
          algorithmAccuracy: 0,
          userSatisfactionScore: 0,
          recommendationDiversity: 0,
          coldStartPerformance: 0,
          longTermEngagement: 0
        },
        userSegmentation: {
          activeUsers: 0,
          passiveUsers: 0,
          newUsers: 0,
          returningUsers: 0,
          powerUsers: 0,
          atRiskUsers: 0,
          segmentDistribution: {},
          segmentEngagement: {}
        }
      });

      jest.spyOn(socialInsights['communityHealth'], 'calculateCommunityHealth').mockResolvedValue({
        overall: 75,
        engagement: 60,
        cohesion: 80,
        safety: 90,
        diversity: 70,
        growth: 40,
        timestamp: new Date(),
        universityId: 'university-1'
      });

      const recommendations = await socialInsights.generateRecommendations('university-1');

      expect(recommendations).toHaveLength(2); // Growth and engagement recommendations
      expect(recommendations[0].type).toBe('growth');
      expect(recommendations[0].priority).toBe('high');
      expect(recommendations[1].type).toBe('engagement');
      expect(recommendations[1].priority).toBe('high');
    });
  });
});

describe('Integration Tests', () => {
  let socialAnalytics: SocialAnalytics;
  let communityHealth: CommunityHealthMetrics;
  let networkGrowth: NetworkGrowthTracker;
  let socialInsights: SocialInsights;

  beforeEach(() => {
    socialAnalytics = new SocialAnalytics(mockSupabase, mockRedis);
    communityHealth = new CommunityHealthMetrics(mockSupabase, mockRedis);
    networkGrowth = new NetworkGrowthTracker(mockSupabase, mockRedis);
    socialInsights = new SocialInsights(mockSupabase, mockRedis);
    jest.clearAllMocks();
  });

  it('should provide end-to-end social analytics workflow', async () => {
    // Mock all the necessary responses for a complete workflow
    mockSupabase.rpc = jest.fn().mockImplementation((fnName) => {
      const responses = {
        'get_connection_metrics': { data: { total: 1000, daily: 50, weekly: 300, monthly: 1000, density: 0.15, cross_university: 100, follow_unfollow_ratio: 0.8 }, error: null },
        'get_mutual_connection_distribution': { data: { distribution: { '0': 100, '1': 200 }, average: 1.5, median: 1.0, max: 10 }, error: null },
        'get_engagement_metrics': { data: { interaction_frequency: 2.5, feature_adoption: 0.6, community_participation: 0.7, content_sharing_rate: 1.2, discovery_effectiveness: 0.75, retention_correlation: 0.85, viral_coefficient: 1.2, network_effect: 0.9 }, error: null },
        'get_community_health_metrics': { data: { network_cohesion: 0.6, graph_clustering: 0.65, isolation_rate: 0.2, spam_abuse_rate: 0.05, community_sentiment: 0.75, cross_departmental: 0.6, alumni_engagement: 0.4, university_pride: 0.8 }, error: null },
        'get_recommendation_metrics': { data: { acceptance_rate: 0.15, click_through_rate: 0.25, conversion_rate: 0.08, algorithm_accuracy: 0.78, satisfaction_score: 0.72, diversity: 0.65, cold_start: 0.45, long_term_engagement: 0.68 }, error: null },
        'get_user_segmentation_metrics': { data: { active_users: 500, passive_users: 300, new_users: 100, returning_users: 200, power_users: 50, at_risk_users: 25, distribution: { active: 500, passive: 300 }, engagement: { active: 0.6, passive: 0.4 } }, error: null }
      };
      return Promise.resolve(responses[fnName] || { data: null, error: null });
    });

    mockSupabase.from = jest.fn().mockReturnValue({
      insert: jest.fn().mockResolvedValue({ error: null }),
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
        gte: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: [], error: null })
        })
      })
    });

    // Test the complete workflow
    const metrics = await socialAnalytics.getSocialMetrics('university-1');
    const healthScore = await communityHealth.calculateCommunityHealth('university-1');
    const growthData = await networkGrowth.trackNetworkGrowth('university-1');
    const insights = await socialInsights.generateInsightsDashboard('university-1');

    expect(metrics).toBeDefined();
    expect(healthScore).toBeDefined();
    expect(growthData).toBeDefined();
    expect(insights).toBeDefined();

    // Verify the data flows correctly between components
    expect(insights.overallHealth).toBe(healthScore.overall);
    expect(metrics.networkGrowth.totalConnections).toBe(growthData.totalConnections);
  });
});
