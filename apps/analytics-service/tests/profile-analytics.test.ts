import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ProfileAnalytics } from '../src/collectors/ProfileAnalytics';
import { ProfileInsights } from '../src/insights/ProfileInsights';
import { ConsentManager } from '../src/privacy/ConsentManager';
import { ProfileMetricsAggregator } from '../src/aggregators/ProfileMetrics';
import { 
  AnalyticsEvent, 
  createProfileViewEvent, 
  createProfileEditEvent,
  createRecommendationViewEvent,
  createRecommendationImplementEvent,
  getDefaultPrivacySettings
} from '../src/models/AnalyticsEvent';

// Mock dependencies
jest.mock('../src/collectors/ProfileAnalytics');
jest.mock('../src/insights/ProfileInsights');
jest.mock('../src/privacy/ConsentManager');

describe('Profile Analytics System', () => {
  let profileAnalytics: jest.Mocked<ProfileAnalytics>;
  let profileInsights: jest.Mocked<ProfileInsights>;
  let consentManager: jest.Mocked<ConsentManager>;
  let metricsAggregator: ProfileMetricsAggregator;

  const mockUserId = 'user_123';
  const mockSessionId = 'session_456';
  const mockMetadata = {
    version: '1.0.0',
    platform: 'web',
    build: '123',
    environment: 'test' as const,
    ip: '127.0.0.1',
    device: {
      type: 'desktop' as const,
      os: 'Windows',
      browser: 'Chrome'
    }
  };

  beforeEach(() => {
    profileAnalytics = new ProfileAnalytics() as jest.Mocked<ProfileAnalytics>;
    profileInsights = new ProfileInsights() as jest.Mocked<ProfileInsights>;
    consentManager = new ConsentManager() as jest.Mocked<ConsentManager>;
    
    metricsAggregator = new ProfileMetricsAggregator(
      mockUserId,
      'weekly',
      new Date('2024-01-01'),
      new Date('2024-01-07')
    );

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('ProfileAnalytics', () => {
    describe('Event Collection', () => {
      it('should collect profile view events', async () => {
        const mockEvent = createProfileViewEvent(
          mockUserId,
          mockSessionId,
          {
            profileId: 'profile_123',
            viewerId: 'viewer_456',
            isOwnProfile: false,
            duration: 30,
            sectionsViewed: ['header', 'about', 'education']
          },
          mockMetadata,
          getDefaultPrivacySettings()
        );

        profileAnalytics.collectEvent.mockResolvedValue(true);

        const result = await profileAnalytics.collectEvent(mockEvent);

        expect(profileAnalytics.collectEvent).toHaveBeenCalledWith(mockEvent);
        expect(result).toBe(true);
      });

      it('should collect profile edit events', async () => {
        const mockEvent = createProfileEditEvent(
          mockUserId,
          mockSessionId,
          {
            profileId: 'profile_123',
            updatedFields: ['bio', 'interests'],
            previousValues: { bio: 'Old bio', interests: ['old'] },
            newValues: { bio: 'New bio', interests: ['new'] },
            completionScoreBefore: 60,
            completionScoreAfter: 75
          },
          mockMetadata,
          getDefaultPrivacySettings()
        );

        profileAnalytics.collectEvent.mockResolvedValue(true);

        const result = await profileAnalytics.collectEvent(mockEvent);

        expect(profileAnalytics.collectEvent).toHaveBeenCalledWith(mockEvent);
        expect(result).toBe(true);
      });

      it('should handle event collection errors gracefully', async () => {
        const mockEvent = createProfileViewEvent(
          mockUserId,
          mockSessionId,
          {
            profileId: 'profile_123',
            viewerId: 'viewer_456',
            isOwnProfile: false,
            duration: 30,
            sectionsViewed: ['header']
          },
          mockMetadata,
          getDefaultPrivacySettings()
        );

        profileAnalytics.collectEvent.mockRejectedValue(new Error('Collection failed'));

        await expect(profileAnalytics.collectEvent(mockEvent)).rejects.toThrow('Collection failed');
      });

      it('should validate events before collection', async () => {
        const invalidEvent = {
          id: '',
          userId: '',
          sessionId: '',
          eventType: 'profile_view' as const,
          timestamp: new Date(),
          data: {},
          metadata: mockMetadata,
          privacy: getDefaultPrivacySettings()
        };

        profileAnalytics.collectEvent.mockResolvedValue(false);

        const result = await profileAnalytics.collectEvent(invalidEvent as AnalyticsEvent);

        expect(result).toBe(false);
      });
    });

    describe('Batch Processing', () => {
      it('should process multiple events in batch', async () => {
        const events = [
          createProfileViewEvent(mockUserId, mockSessionId, {
            profileId: 'profile_123',
            viewerId: 'viewer_456',
            isOwnProfile: false,
            duration: 30,
            sectionsViewed: ['header']
          }, mockMetadata, getDefaultPrivacySettings()),
          createProfileEditEvent(mockUserId, mockSessionId, {
            profileId: 'profile_123',
            updatedFields: ['bio'],
            previousValues: { bio: 'Old bio' },
            newValues: { bio: 'New bio' },
            completionScoreBefore: 60,
            completionScoreAfter: 70
          }, mockMetadata, getDefaultPrivacySettings())
        ];

        profileAnalytics.collectBatch.mockResolvedValue({ success: 2, failed: 0 });

        const result = await profileAnalytics.collectBatch(events);

        expect(profileAnalytics.collectBatch).toHaveBeenCalledWith(events);
        expect(result.success).toBe(2);
        expect(result.failed).toBe(0);
      });

      it('should handle partial batch failures', async () => {
        const events = [
          createProfileViewEvent(mockUserId, mockSessionId, {
            profileId: 'profile_123',
            viewerId: 'viewer_456',
            isOwnProfile: false,
            duration: 30,
            sectionsViewed: ['header']
          }, mockMetadata, getDefaultPrivacySettings()),
          createProfileViewEvent('invalid_user', mockSessionId, {
            profileId: 'profile_123',
            viewerId: 'viewer_456',
            isOwnProfile: false,
            duration: 30,
            sectionsViewed: ['header']
          }, mockMetadata, getDefaultPrivacySettings())
        ];

        profileAnalytics.collectBatch.mockResolvedValue({ success: 1, failed: 1 });

        const result = await profileAnalytics.collectBatch(events);

        expect(result.success).toBe(1);
        expect(result.failed).toBe(1);
      });
    });

    describe('Privacy Compliance', () => {
      it('should respect user consent settings', async () => {
        const mockEvent = createProfileViewEvent(
          mockUserId,
          mockSessionId,
          {
            profileId: 'profile_123',
            viewerId: 'viewer_456',
            isOwnProfile: false,
            duration: 30,
            sectionsViewed: ['header']
          },
          mockMetadata,
          { ...getDefaultPrivacySettings(), consentGiven: false }
        );

        profileAnalytics.collectEvent.mockResolvedValue(false);

        const result = await profileAnalytics.collectEvent(mockEvent);

        expect(result).toBe(false);
      });

      it('should anonymize data when required', async () => {
        const mockEvent = createProfileViewEvent(
          mockUserId,
          mockSessionId,
          {
            profileId: 'profile_123',
            viewerId: 'viewer_456',
            isOwnProfile: false,
            duration: 30,
            sectionsViewed: ['header']
          },
          mockMetadata,
          { ...getDefaultPrivacySettings(), anonymized: true }
        );

        profileAnalytics.collectEvent.mockResolvedValue(true);

        const result = await profileAnalytics.collectEvent(mockEvent);

        expect(profileAnalytics.collectEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            privacy: expect.objectContaining({ anonymized: true })
          })
        );
        expect(result).toBe(true);
      });
    });
  });

  describe('ProfileInsights', () => {
    describe('Insight Generation', () => {
      it('should generate profile completion insights', async () => {
        const mockEvents = [
          createProfileEditEvent(mockUserId, mockSessionId, {
            profileId: 'profile_123',
            updatedFields: ['bio'],
            previousValues: { bio: 'Old bio' },
            newValues: { bio: 'New bio' },
            completionScoreBefore: 60,
            completionScoreAfter: 70
          }, mockMetadata, getDefaultPrivacySettings())
        ];

        const mockInsight = {
          id: 'insight_123',
          userId: mockUserId,
          insightType: 'completion' as const,
          title: 'Profile Completion Improved',
          description: 'Your profile completion score increased by 10%',
          priority: 'medium' as const,
          impact: 75,
          actionable: true,
          category: 'profile_optimization',
          data: { completionScore: 70 },
          recommendations: ['Add more interests', 'Complete education section'],
          metrics: {
            current: 70,
            target: 90,
            trend: 'up' as const,
            change: 10
          },
          createdAt: new Date(),
          dismissed: false,
          implemented: false
        };

        profileInsights.generateInsights.mockResolvedValue([mockInsight]);

        const insights = await profileInsights.generateInsights(mockUserId, mockEvents);

        expect(profileInsights.generateInsights).toHaveBeenCalledWith(mockUserId, mockEvents);
        expect(insights).toHaveLength(1);
        expect(insights[0].insightType).toBe('completion');
      });

      it('should generate engagement insights', async () => {
        const mockEvents = [
          createProfileViewEvent(mockUserId, mockSessionId, {
            profileId: 'profile_123',
            viewerId: 'viewer_456',
            isOwnProfile: false,
            duration: 30,
            sectionsViewed: ['header', 'about']
          }, mockMetadata, getDefaultPrivacySettings())
        ];

        const mockInsight = {
          id: 'insight_456',
          userId: mockUserId,
          insightType: 'engagement' as const,
          title: 'Profile Views Increased',
          description: 'Your profile received 5 views this week',
          priority: 'low' as const,
          impact: 50,
          actionable: true,
          category: 'engagement',
          data: { viewCount: 5 },
          recommendations: ['Share your profile more', 'Update your bio'],
          metrics: {
            current: 5,
            target: 10,
            trend: 'up' as const,
            change: 2
          },
          createdAt: new Date(),
          dismissed: false,
          implemented: false
        };

        profileInsights.generateInsights.mockResolvedValue([mockInsight]);

        const insights = await profileInsights.generateInsights(mockUserId, mockEvents);

        expect(insights).toHaveLength(1);
        expect(insights[0].insightType).toBe('engagement');
      });

      it('should handle insight generation errors', async () => {
        profileInsights.generateInsights.mockRejectedValue(new Error('Insight generation failed'));

        await expect(profileInsights.generateInsights(mockUserId, [])).rejects.toThrow('Insight generation failed');
      });
    });

    describe('Recommendation Generation', () => {
      it('should generate profile optimization recommendations', async () => {
        const mockRecommendation = {
          id: 'rec_123',
          userId: mockUserId,
          type: 'profile_optimization' as const,
          title: 'Complete Your Education Section',
          description: 'Adding your education details will increase profile completeness',
          priority: 'high' as const,
          impact: 85,
          effort: 'low' as const,
          category: 'profile_completion',
          steps: [
            {
              id: 'step_1',
              title: 'Add University',
              description: 'Select your university from the list',
              completed: false,
              estimatedTime: 2
            },
            {
              id: 'step_2',
              title: 'Add Degree',
              description: 'Enter your degree information',
              completed: false,
              estimatedTime: 3
            }
          ],
          expectedOutcome: 'Profile completion score will increase by 15%',
          metrics: {
            baseline: 70,
            target: 85,
            timeframe: '1 week'
          },
          createdAt: new Date(),
          status: 'pending' as const
        };

        profileInsights.generateRecommendations.mockResolvedValue([mockRecommendation]);

        const recommendations = await profileInsights.generateRecommendations(mockUserId, []);

        expect(profileInsights.generateRecommendations).toHaveBeenCalledWith(mockUserId, []);
        expect(recommendations).toHaveLength(1);
        expect(recommendations[0].type).toBe('profile_optimization');
      });
    });
  });

  describe('ConsentManager', () => {
    describe('Consent Management', () => {
      it('should grant consent for analytics', async () => {
        const consentData = {
          userId: mockUserId,
          purposes: ['analytics', 'personalization'],
          dataCategories: ['behavioral', 'technical'],
          retentionPeriod: 365,
          version: '1.0'
        };

        consentManager.grantConsent.mockResolvedValue(true);

        const result = await consentManager.grantConsent(consentData);

        expect(consentManager.grantConsent).toHaveBeenCalledWith(consentData);
        expect(result).toBe(true);
      });

      it('should revoke consent for analytics', async () => {
        consentManager.revokeConsent.mockResolvedValue(true);

        const result = await consentManager.revokeConsent(mockUserId);

        expect(consentManager.revokeConsent).toHaveBeenCalledWith(mockUserId);
        expect(result).toBe(true);
      });

      it('should check consent status', async () => {
        consentManager.hasConsent.mockResolvedValue(true);

        const result = await consentManager.hasConsent(mockUserId, 'analytics');

        expect(consentManager.hasConsent).toHaveBeenCalledWith(mockUserId, 'analytics');
        expect(result).toBe(true);
      });

      it('should handle consent errors gracefully', async () => {
        consentManager.grantConsent.mockRejectedValue(new Error('Consent management failed'));

        await expect(consentManager.grantConsent({
          userId: mockUserId,
          purposes: ['analytics'],
          dataCategories: ['behavioral'],
          retentionPeriod: 365,
          version: '1.0'
        })).rejects.toThrow('Consent management failed');
      });
    });

    describe('Data Subject Requests', () => {
      it('should process data access requests', async () => {
        const requestData = {
          userId: mockUserId,
          requestType: 'access' as const,
          requestedData: ['profile_events', 'insights'],
          requestDate: new Date()
        };

        consentManager.processDataSubjectRequest.mockResolvedValue({
          requestId: 'req_123',
          status: 'completed',
          data: { events: [], insights: [] }
        });

        const result = await consentManager.processDataSubjectRequest(requestData);

        expect(consentManager.processDataSubjectRequest).toHaveBeenCalledWith(requestData);
        expect(result.status).toBe('completed');
      });

      it('should process data deletion requests', async () => {
        const requestData = {
          userId: mockUserId,
          requestType: 'deletion' as const,
          requestedData: ['all'],
          requestDate: new Date()
        };

        consentManager.processDataSubjectRequest.mockResolvedValue({
          requestId: 'req_456',
          status: 'completed',
          data: { deletedRecords: 150 }
        });

        const result = await consentManager.processDataSubjectRequest(requestData);

        expect(result.status).toBe('completed');
        expect(result.data.deletedRecords).toBe(150);
      });
    });
  });

  describe('ProfileMetricsAggregator', () => {
    describe('Metrics Generation', () => {
      it('should generate comprehensive profile metrics', () => {
        const events = [
          createProfileViewEvent(mockUserId, mockSessionId, {
            profileId: 'profile_123',
            viewerId: 'viewer_456',
            isOwnProfile: false,
            duration: 30,
            sectionsViewed: ['header', 'about']
          }, mockMetadata, getDefaultPrivacySettings()),
          createProfileEditEvent(mockUserId, mockSessionId, {
            profileId: 'profile_123',
            updatedFields: ['bio'],
            previousValues: { bio: 'Old bio' },
            newValues: { bio: 'New bio' },
            completionScoreBefore: 60,
            completionScoreAfter: 70
          }, mockMetadata, getDefaultPrivacySettings())
        ];

        metricsAggregator.addEvents(events);
        const metrics = metricsAggregator.generateMetrics();

        expect(metrics.userId).toBe(mockUserId);
        expect(metrics.period).toBe('weekly');
        expect(metrics.profileViews.total).toBe(1);
        expect(metrics.profileEdits.total).toBe(1);
        expect(metrics.completionProgress.improvement).toBe(10);
      });

      it('should handle empty event sets', () => {
        const metrics = metricsAggregator.generateMetrics();

        expect(metrics.profileViews.total).toBe(0);
        expect(metrics.profileEdits.total).toBe(0);
        expect(metrics.completionProgress.improvement).toBe(0);
      });

      it('should calculate activity patterns correctly', () => {
        const events = [
          createProfileViewEvent(mockUserId, mockSessionId, {
            profileId: 'profile_123',
            viewerId: 'viewer_456',
            isOwnProfile: false,
            duration: 30,
            sectionsViewed: ['header']
          }, {
            ...mockMetadata,
            device: { type: 'mobile', os: 'iOS', browser: 'Safari' }
          }, getDefaultPrivacySettings())
        ];

        metricsAggregator.addEvents(events);
        const metrics = metricsAggregator.generateMetrics();

        expect(metrics.activityPatterns.deviceUsage.mobile).toBe(1);
        expect(metrics.activityPatterns.deviceUsage.desktop).toBe(0);
      });
    });

    describe('Metrics Comparison', () => {
      it('should compare metrics between periods', () => {
        const currentMetrics = {
          userId: mockUserId,
          period: 'weekly' as const,
          startDate: new Date('2024-01-08'),
          endDate: new Date('2024-01-14'),
          generatedAt: new Date(),
          profileViews: { total: 10, unique: 8, averageDuration: 45, sectionsViewed: [], topViewingTimes: [] },
          profileEdits: { total: 3, fieldsUpdated: [], completionScoreChange: 15, averageEditDuration: 120, editFrequency: 0.4 },
          avatarActivity: { uploads: 1, successfulUploads: 1, averageProcessingTime: 2000, fileSizeDistribution: { small: 1, medium: 0, large: 0 } },
          privacyActivity: { changes: 0, settingsModified: [], privacyLevelChanges: 0, optInEvents: 0, optOutEvents: 0 },
          universityNetworkActivity: { interactions: 5, connections: 2, messages: 1, follows: 2, topUniversities: [] },
          completionProgress: { milestones: 1, currentScore: 85, previousScore: 70, improvement: 15, completedFields: [], remainingFields: [], suggestedFields: [] },
          recommendationEngagement: { views: 8, implementations: 3, dismissals: 1, completionRate: 0.375, averageImplementationTime: 300, topRecommendationTypes: [] },
          insightsEngagement: { views: 5, dismissals: 1, implementations: 2, topInsightTypes: [] },
          activityPatterns: { peakHours: [14, 16, 18], peakDays: ['Monday', 'Wednesday', 'Friday'], sessionFrequency: 1.2, averageSessionDuration: 600, deviceUsage: { desktop: 5, mobile: 3, tablet: 2 } },
          performance: { averageResponseTime: 150, errorRate: 0.02, successRate: 0.98 }
        };

        const previousMetrics = {
          userId: mockUserId,
          period: 'weekly' as const,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-07'),
          generatedAt: new Date(),
          profileViews: { total: 7, unique: 6, averageDuration: 35, sectionsViewed: [], topViewingTimes: [] },
          profileEdits: { total: 2, fieldsUpdated: [], completionScoreChange: 10, averageEditDuration: 100, editFrequency: 0.3 },
          avatarActivity: { uploads: 0, successfulUploads: 0, averageProcessingTime: 0, fileSizeDistribution: { small: 0, medium: 0, large: 0 } },
          privacyActivity: { changes: 0, settingsModified: [], privacyLevelChanges: 0, optInEvents: 0, optOutEvents: 0 },
          universityNetworkActivity: { interactions: 3, connections: 1, messages: 0, follows: 2, topUniversities: [] },
          completionProgress: { milestones: 0, currentScore: 70, previousScore: 60, improvement: 10, completedFields: [], remainingFields: [], suggestedFields: [] },
          recommendationEngagement: { views: 5, implementations: 1, dismissals: 2, completionRate: 0.2, averageImplementationTime: 400, topRecommendationTypes: [] },
          insightsEngagement: { views: 3, dismissals: 2, implementations: 1, topInsightTypes: [] },
          activityPatterns: { peakHours: [12, 14, 16], peakDays: ['Tuesday', 'Thursday'], sessionFrequency: 0.8, averageSessionDuration: 500, deviceUsage: { desktop: 4, mobile: 2, tablet: 1 } },
          performance: { averageResponseTime: 180, errorRate: 0.05, successRate: 0.95 }
        };

        const comparison = ProfileMetricsAggregator.compareMetrics(currentMetrics, previousMetrics);

        expect(comparison.changes.profileViews).toBe(3);
        expect(comparison.changes.profileEdits).toBe(1);
        expect(comparison.changes.completionScore).toBe(15);
        expect(comparison.trends.profileViews).toBe('up');
        expect(comparison.trends.profileEdits).toBe('up');
        expect(comparison.trends.completionScore).toBe('up');
      });
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete analytics workflow', async () => {
      // 1. User grants consent
      consentManager.grantConsent.mockResolvedValue(true);
      const consentResult = await consentManager.grantConsent({
        userId: mockUserId,
        purposes: ['analytics', 'personalization'],
        dataCategories: ['behavioral', 'technical'],
        retentionPeriod: 365,
        version: '1.0'
      });
      expect(consentResult).toBe(true);

      // 2. Collect events
      const events = [
        createProfileViewEvent(mockUserId, mockSessionId, {
          profileId: 'profile_123',
          viewerId: 'viewer_456',
          isOwnProfile: false,
          duration: 30,
          sectionsViewed: ['header', 'about']
        }, mockMetadata, getDefaultPrivacySettings()),
        createProfileEditEvent(mockUserId, mockSessionId, {
          profileId: 'profile_123',
          updatedFields: ['bio'],
          previousValues: { bio: 'Old bio' },
          newValues: { bio: 'New bio' },
          completionScoreBefore: 60,
          completionScoreAfter: 70
        }, mockMetadata, getDefaultPrivacySettings())
      ];

      profileAnalytics.collectBatch.mockResolvedValue({ success: 2, failed: 0 });
      const collectionResult = await profileAnalytics.collectBatch(events);
      expect(collectionResult.success).toBe(2);

      // 3. Generate insights
      const mockInsight = {
        id: 'insight_123',
        userId: mockUserId,
        insightType: 'completion' as const,
        title: 'Profile Completion Improved',
        description: 'Your profile completion score increased by 10%',
        priority: 'medium' as const,
        impact: 75,
        actionable: true,
        category: 'profile_optimization',
        data: { completionScore: 70 },
        recommendations: ['Add more interests'],
        metrics: {
          current: 70,
          target: 90,
          trend: 'up' as const,
          change: 10
        },
        createdAt: new Date(),
        dismissed: false,
        implemented: false
      };

      profileInsights.generateInsights.mockResolvedValue([mockInsight]);
      const insights = await profileInsights.generateInsights(mockUserId, events);
      expect(insights).toHaveLength(1);

      // 4. Generate metrics
      metricsAggregator.addEvents(events);
      const metrics = metricsAggregator.generateMetrics();
      expect(metrics.profileViews.total).toBe(1);
      expect(metrics.profileEdits.total).toBe(1);
    });

    it('should handle privacy compliance throughout workflow', async () => {
      // 1. User revokes consent
      consentManager.revokeConsent.mockResolvedValue(true);
      await consentManager.revokeConsent(mockUserId);

      // 2. Attempt to collect events (should fail)
      const events = [
        createProfileViewEvent(mockUserId, mockSessionId, {
          profileId: 'profile_123',
          viewerId: 'viewer_456',
          isOwnProfile: false,
          duration: 30,
          sectionsViewed: ['header']
        }, mockMetadata, { ...getDefaultPrivacySettings(), consentGiven: false })
      ];

      profileAnalytics.collectBatch.mockResolvedValue({ success: 0, failed: 1 });
      const collectionResult = await profileAnalytics.collectBatch(events);
      expect(collectionResult.success).toBe(0);
      expect(collectionResult.failed).toBe(1);

      // 3. Process data deletion request
      consentManager.processDataSubjectRequest.mockResolvedValue({
        requestId: 'req_123',
        status: 'completed',
        data: { deletedRecords: 50 }
      });

      const deletionResult = await consentManager.processDataSubjectRequest({
        userId: mockUserId,
        requestType: 'deletion',
        requestedData: ['all'],
        requestDate: new Date()
      });

      expect(deletionResult.status).toBe('completed');
      expect(deletionResult.data.deletedRecords).toBe(50);
    });
  });

  describe('Performance Tests', () => {
    it('should handle large event batches efficiently', async () => {
      const largeEventBatch = Array.from({ length: 1000 }, (_, i) => 
        createProfileViewEvent(mockUserId, `session_${i}`, {
          profileId: 'profile_123',
          viewerId: `viewer_${i}`,
          isOwnProfile: false,
          duration: Math.random() * 60,
          sectionsViewed: ['header']
        }, mockMetadata, getDefaultPrivacySettings())
      );

      profileAnalytics.collectBatch.mockResolvedValue({ success: 1000, failed: 0 });

      const startTime = Date.now();
      const result = await profileAnalytics.collectBatch(largeEventBatch);
      const endTime = Date.now();

      expect(result.success).toBe(1000);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should generate metrics efficiently for large datasets', () => {
      const largeEventSet = Array.from({ length: 10000 }, (_, i) => 
        createProfileViewEvent(mockUserId, `session_${i}`, {
          profileId: 'profile_123',
          viewerId: `viewer_${i}`,
          isOwnProfile: false,
          duration: Math.random() * 60,
          sectionsViewed: ['header']
        }, mockMetadata, getDefaultPrivacySettings())
      );

      metricsAggregator.addEvents(largeEventSet);

      const startTime = Date.now();
      const metrics = metricsAggregator.generateMetrics();
      const endTime = Date.now();

      expect(metrics.profileViews.total).toBe(10000);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('Error Handling', () => {
    it('should handle network failures gracefully', async () => {
      profileAnalytics.collectEvent.mockRejectedValue(new Error('Network timeout'));

      const event = createProfileViewEvent(mockUserId, mockSessionId, {
        profileId: 'profile_123',
        viewerId: 'viewer_456',
        isOwnProfile: false,
        duration: 30,
        sectionsViewed: ['header']
      }, mockMetadata, getDefaultPrivacySettings());

      await expect(profileAnalytics.collectEvent(event)).rejects.toThrow('Network timeout');
    });

    it('should handle invalid data gracefully', async () => {
      const invalidEvent = {
        id: 'invalid',
        userId: '',
        sessionId: '',
        eventType: 'profile_view' as const,
        timestamp: new Date(),
        data: null,
        metadata: null,
        privacy: null
      };

      profileAnalytics.collectEvent.mockResolvedValue(false);

      const result = await profileAnalytics.collectEvent(invalidEvent as any);

      expect(result).toBe(false);
    });

    it('should handle service unavailability', async () => {
      profileInsights.generateInsights.mockRejectedValue(new Error('Service unavailable'));

      await expect(profileInsights.generateInsights(mockUserId, [])).rejects.toThrow('Service unavailable');
    });
  });
});
