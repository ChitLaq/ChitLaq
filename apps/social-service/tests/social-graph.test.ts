import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { RelationshipService } from '../src/services/RelationshipService';
import { GraphTraversalEngine } from '../src/utils/graph-traversal';
import { RelationshipCacheService } from '../src/cache/relationship-cache';
import { SocialMetricsService } from '../src/analytics/social-metrics';
import { 
  SocialRelationship, 
  SocialGraphNode, 
  ConnectionRecommendation,
  RelationshipType,
  RelationshipStatus,
  createSocialRelationship,
  createSocialGraphNode,
  createConnectionRecommendation,
  validateSocialRelationship,
  validateSocialGraphNode
} from '../src/models/SocialGraph';

// Mock dependencies
jest.mock('../src/database/DatabaseService');
jest.mock('../src/cache/CacheService');
jest.mock('../src/events/EventService');
jest.mock('../src/analytics/AnalyticsService');
jest.mock('../src/notifications/NotificationService');

describe('Social Graph System', () => {
  let relationshipService: RelationshipService;
  let graphTraversalEngine: GraphTraversalEngine;
  let cacheService: RelationshipCacheService;
  let metricsService: SocialMetricsService;
  let mockDb: any;
  let mockCache: any;
  let mockEvents: any;
  let mockAnalytics: any;
  let mockNotifications: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock instances
    mockDb = {
      createRelationship: jest.fn(),
      getRelationship: jest.fn(),
      updateRelationship: jest.fn(),
      deleteRelationship: jest.fn(),
      getUserRelationships: jest.fn(),
      getFollowers: jest.fn(),
      getFollowing: jest.fn(),
      getMutualConnections: jest.fn(),
      getUniversityConnections: jest.fn(),
      getDepartmentConnections: jest.fn(),
      getYearConnections: jest.fn(),
      getRecommendation: jest.fn(),
      updateRecommendation: jest.fn(),
      traverseGraph: jest.fn(),
      getRelationshipsBetweenUsers: jest.fn(),
      getRelationshipByUsers: jest.fn(),
      incrementConnectionCount: jest.fn(),
      getUserProfile: jest.fn(),
      getActiveUsers: jest.fn(),
      getUserSocialMetrics: jest.fn(),
      getUserSocialMetricsHistory: jest.fn(),
      storeSocialMetrics: jest.fn(),
      getLostConnections: jest.fn(),
      getProfileViews: jest.fn(),
      getConnectionRequests: jest.fn(),
      getAcceptedRequests: jest.fn(),
      getRejectedRequests: jest.fn(),
      getBlocks: jest.fn(),
      getUnblocks: jest.fn(),
      getRecommendationsViewed: jest.fn(),
      getRecommendationsAccepted: jest.fn(),
      getPeakActivityHours: jest.fn(),
      getPeakActivityDays: jest.fn(),
      getConnectionActivity: jest.fn(),
      getDiscoveryActivity: jest.fn(),
      getRecommendationActivity: jest.fn()
    };

    mockCache = {
      setRelationship: jest.fn(),
      getRelationship: jest.fn(),
      deleteRelationship: jest.fn(),
      setUserRelationships: jest.fn(),
      getUserRelationships: jest.fn(),
      setFollowers: jest.fn(),
      getFollowers: jest.fn(),
      setFollowing: jest.fn(),
      getFollowing: jest.fn(),
      setMutualConnections: jest.fn(),
      getMutualConnections: jest.fn(),
      setUniversityConnections: jest.fn(),
      getUniversityConnections: jest.fn(),
      setDepartmentConnections: jest.fn(),
      getDepartmentConnections: jest.fn(),
      setYearConnections: jest.fn(),
      getYearConnections: jest.fn(),
      setRecommendations: jest.fn(),
      getRecommendations: jest.fn(),
      setGraphTraversal: jest.fn(),
      getGraphTraversal: jest.fn(),
      invalidateUserCache: jest.fn(),
      invalidateRelationshipCache: jest.fn(),
      invalidateNodeCache: jest.fn(),
      clearCache: jest.fn(),
      getCacheInfo: jest.fn(),
      getMetrics: jest.fn(),
      resetMetrics: jest.fn(),
      healthCheck: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
      disconnect: jest.fn()
    };

    mockEvents = {
      emit: jest.fn()
    };

    mockAnalytics = {
      track: jest.fn()
    };

    mockNotifications = {
      sendNotification: jest.fn()
    };

    // Create service instances
    relationshipService = new RelationshipService(
      mockDb,
      mockCache,
      mockEvents,
      mockAnalytics,
      mockNotifications
    );

    graphTraversalEngine = new GraphTraversalEngine();

    cacheService = new RelationshipCacheService({
      redis: {
        host: 'localhost',
        port: 6379,
        password: 'test',
        db: 0
      },
      ttl: {
        relationships: 300,
        nodes: 600,
        recommendations: 1800,
        graphTraversal: 300,
        userConnections: 300,
        mutualConnections: 600,
        universityConnections: 600,
        departmentConnections: 600,
        yearConnections: 600
      },
      maxMemory: '100mb',
      evictionPolicy: 'allkeys-lru'
    });

    metricsService = new SocialMetricsService(
      mockDb,
      mockCache,
      mockEvents,
      {
        collectionInterval: 60000,
        retentionPeriod: 30,
        batchSize: 100,
        enableRealTime: true,
        enableAggregation: true,
        enableTrends: true
      }
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('SocialRelationship Model', () => {
    it('should create a valid social relationship', () => {
      const relationship = createSocialRelationship(
        'user1',
        'user2',
        'follow',
        {
          source: 'manual',
          confidence: 100,
          context: {
            mutualConnections: 5,
            interactionScore: 8
          }
        }
      );

      expect(relationship.followerId).toBe('user1');
      expect(relationship.followingId).toBe('user2');
      expect(relationship.relationshipType).toBe('follow');
      expect(relationship.status).toBe('active');
      expect(relationship.strength).toBeGreaterThan(0);
      expect(relationship.metadata.source).toBe('manual');
      expect(relationship.metadata.confidence).toBe(100);
    });

    it('should validate social relationship correctly', () => {
      const validRelationship = {
        followerId: 'user1',
        followingId: 'user2',
        relationshipType: 'follow' as RelationshipType,
        strength: 75,
        metadata: {
          confidence: 90
        }
      };

      const validation = validateSocialRelationship(validRelationship);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject invalid social relationship', () => {
      const invalidRelationship = {
        followerId: '',
        followingId: 'user2',
        relationshipType: 'invalid' as RelationshipType,
        strength: 150,
        metadata: {
          confidence: -10
        }
      };

      const validation = validateSocialRelationship(invalidRelationship);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should calculate relationship strength correctly', () => {
      const relationship = createSocialRelationship(
        'user1',
        'user2',
        'follow',
        {
          confidence: 80,
          context: {
            mutualConnections: 3,
            interactionScore: 5
          }
        }
      );

      expect(relationship.strength).toBeGreaterThan(50);
      expect(relationship.strength).toBeLessThanOrEqual(100);
    });
  });

  describe('SocialGraphNode Model', () => {
    it('should create a valid social graph node', () => {
      const node = createSocialGraphNode('user1', {
        displayName: 'John Doe',
        university: {
          id: 'univ1',
          name: 'Test University',
          domain: 'test.edu'
        },
        privacy: {
          profileVisibility: 'public',
          connectionVisibility: 'public',
          discoveryEnabled: true
        }
      });

      expect(node.userId).toBe('user1');
      expect(node.nodeType).toBe('user');
      expect(node.properties.displayName).toBe('John Doe');
      expect(node.properties.university?.name).toBe('Test University');
      expect(node.connections.followers).toBe(0);
      expect(node.metrics.engagementScore).toBe(0);
    });

    it('should validate social graph node correctly', () => {
      const validNode = {
        userId: 'user1',
        nodeType: 'user' as const,
        properties: {
          displayName: 'John Doe',
          privacy: {
            profileVisibility: 'public' as const,
            connectionVisibility: 'public' as const,
            discoveryEnabled: true
          }
        },
        connections: {
          followers: 10,
          following: 5,
          mutualConnections: 3,
          blockedUsers: 0,
          universityConnections: 8,
          departmentConnections: 4,
          yearConnections: 6,
          interestConnections: 2,
          eventConnections: 1
        },
        metrics: {
          engagementScore: 75,
          influenceScore: 60,
          activityLevel: 'high' as const,
          connectionGrowth: 20,
          interactionFrequency: 5,
          lastInteraction: new Date(),
          topInterests: ['technology', 'science'],
          activeHours: [9, 10, 11, 14, 15, 16]
        },
        lastActivity: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const validation = validateSocialGraphNode(validNode);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject invalid social graph node', () => {
      const invalidNode = {
        userId: '',
        nodeType: 'invalid' as any,
        properties: {
          privacy: {
            profileVisibility: 'invalid' as any,
            connectionVisibility: 'invalid' as any,
            discoveryEnabled: true
          }
        },
        connections: {},
        metrics: {
          engagementScore: 150,
          influenceScore: -10,
          activityLevel: 'invalid' as any,
          connectionGrowth: 0,
          interactionFrequency: 0,
          lastInteraction: new Date(),
          topInterests: [],
          activeHours: []
        },
        lastActivity: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const validation = validateSocialGraphNode(invalidNode);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('ConnectionRecommendation Model', () => {
    it('should create a valid connection recommendation', () => {
      const recommendation = createConnectionRecommendation(
        'user1',
        'user2',
        'mutual_connection',
        85,
        ['Mutual connections: 5', 'Same university'],
        {
          universityId: 'univ1',
          interactionScore: 7,
          activityScore: 8
        }
      );

      expect(recommendation.userId).toBe('user1');
      expect(recommendation.recommendedUserId).toBe('user2');
      expect(recommendation.recommendationType).toBe('mutual_connection');
      expect(recommendation.confidence).toBe(85);
      expect(recommendation.reasons).toHaveLength(2);
      expect(recommendation.metadata.universityId).toBe('univ1');
      expect(recommendation.status).toBe('pending');
    });
  });

  describe('RelationshipService', () => {
    it('should create a relationship successfully', async () => {
      const mockRelationship: SocialRelationship = {
        id: 'rel1',
        followerId: 'user1',
        followingId: 'user2',
        relationshipType: 'follow',
        status: 'active',
        strength: 75,
        metadata: {
          source: 'manual',
          confidence: 100,
          tags: [],
          context: {},
          privacy: {
            visible: true,
            discoverable: true,
            shareable: true
          }
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockDb.createRelationship.mockResolvedValue(mockRelationship);
      mockCache.setRelationship.mockResolvedValue(undefined);
      mockEvents.emit.mockResolvedValue(undefined);
      mockAnalytics.track.mockResolvedValue(undefined);
      mockNotifications.sendNotification.mockResolvedValue(undefined);

      const result = await relationshipService.createRelationship(
        'user1',
        'user2',
        'follow'
      );

      expect(result).toEqual(mockRelationship);
      expect(mockDb.createRelationship).toHaveBeenCalledWith(expect.objectContaining({
        followerId: 'user1',
        followingId: 'user2',
        relationshipType: 'follow'
      }));
      expect(mockCache.setRelationship).toHaveBeenCalledWith(mockRelationship);
      expect(mockEvents.emit).toHaveBeenCalledWith('relationship.created', expect.any(Object));
      expect(mockAnalytics.track).toHaveBeenCalledWith('relationship_created', expect.any(Object));
    });

    it('should handle relationship creation errors', async () => {
      mockDb.createRelationship.mockRejectedValue(new Error('Database error'));

      await expect(
        relationshipService.createRelationship('user1', 'user2', 'follow')
      ).rejects.toThrow('Database error');
    });

    it('should get user relationships successfully', async () => {
      const mockRelationships: SocialRelationship[] = [
        {
          id: 'rel1',
          followerId: 'user1',
          followingId: 'user2',
          relationshipType: 'follow',
          status: 'active',
          strength: 75,
          metadata: {
            source: 'manual',
            confidence: 100,
            tags: [],
            context: {},
            privacy: {
              visible: true,
              discoverable: true,
              shareable: true
            }
          },
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockCache.getUserRelationships.mockResolvedValue(mockRelationships);

      const result = await relationshipService.getUserRelationships('user1');

      expect(result).toEqual(mockRelationships);
      expect(mockCache.getUserRelationships).toHaveBeenCalledWith('user1', undefined);
    });

    it('should block a user successfully', async () => {
      const mockBlockRelationship: SocialRelationship = {
        id: 'block1',
        followerId: 'user1',
        followingId: 'user2',
        relationshipType: 'block',
        status: 'active',
        strength: 0,
        metadata: {
          source: 'manual',
          confidence: 100,
          tags: [],
          context: {
            blockedAt: new Date().toISOString()
          },
          privacy: {
            visible: true,
            discoverable: true,
            shareable: true
          }
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockDb.getRelationshipsBetweenUsers.mockResolvedValue([]);
      mockDb.createRelationship.mockResolvedValue(mockBlockRelationship);
      mockCache.setRelationship.mockResolvedValue(undefined);
      mockEvents.emit.mockResolvedValue(undefined);
      mockAnalytics.track.mockResolvedValue(undefined);

      const result = await relationshipService.blockUser('user1', 'user2');

      expect(result).toEqual(mockBlockRelationship);
      expect(mockDb.createRelationship).toHaveBeenCalledWith(expect.objectContaining({
        followerId: 'user1',
        followingId: 'user2',
        relationshipType: 'block'
      }));
    });

    it('should get connection recommendations successfully', async () => {
      const mockRecommendations: ConnectionRecommendation[] = [
        {
          id: 'rec1',
          userId: 'user1',
          recommendedUserId: 'user2',
          recommendationType: 'mutual_connection',
          confidence: 85,
          reasons: ['Mutual connections: 5'],
          mutualConnections: ['user3', 'user4'],
          sharedInterests: ['technology'],
          metadata: {
            interactionScore: 7,
            activityScore: 8
          },
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: 'pending'
        }
      ];

      mockCache.getRecommendations.mockResolvedValue(mockRecommendations);

      const result = await relationshipService.getConnectionRecommendations('user1');

      expect(result).toEqual(mockRecommendations);
      expect(mockCache.getRecommendations).toHaveBeenCalledWith('user1', 20, [
        'mutual_connection',
        'university',
        'department',
        'year',
        'interest'
      ]);
    });
  });

  describe('GraphTraversalEngine', () => {
    it('should traverse graph successfully', async () => {
      const mockStartNode: SocialGraphNode = {
        id: 'user1',
        userId: 'user1',
        nodeType: 'user',
        properties: {
          displayName: 'User 1',
          privacy: {
            profileVisibility: 'public',
            connectionVisibility: 'public',
            discoveryEnabled: true
          }
        },
        connections: {
          followers: 10,
          following: 5,
          mutualConnections: 3,
          blockedUsers: 0,
          universityConnections: 8,
          departmentConnections: 4,
          yearConnections: 6,
          interestConnections: 2,
          eventConnections: 1
        },
        metrics: {
          engagementScore: 75,
          influenceScore: 60,
          activityLevel: 'high',
          connectionGrowth: 20,
          interactionFrequency: 5,
          lastInteraction: new Date(),
          topInterests: ['technology'],
          activeHours: [9, 10, 11]
        },
        lastActivity: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockRelationships: SocialRelationship[] = [
        {
          id: 'rel1',
          followerId: 'user1',
          followingId: 'user2',
          relationshipType: 'follow',
          status: 'active',
          strength: 75,
          metadata: {
            source: 'manual',
            confidence: 100,
            tags: [],
            context: {},
            privacy: {
              visible: true,
              discoverable: true,
              shareable: true
            }
          },
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      const mockGetNode = jest.fn().mockResolvedValue(mockStartNode);
      const mockGetRelationships = jest.fn().mockResolvedValue(mockRelationships);

      const result = await graphTraversalEngine.traverseGraph(
        'user1',
        {
          maxDepth: 2,
          relationshipTypes: ['follow'],
          filters: {
            excludeBlocked: true,
            includeMutual: true
          },
          sortBy: 'relevance',
          limit: 10
        },
        mockGetNode,
        mockGetRelationships
      );

      expect(result).toBeDefined();
      expect(result.nodes).toBeDefined();
      expect(result.relationships).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata.traversalTime).toBeGreaterThan(0);
    });

    it('should handle traversal errors gracefully', async () => {
      const mockGetNode = jest.fn().mockRejectedValue(new Error('Node not found'));
      const mockGetRelationships = jest.fn().mockResolvedValue([]);

      await expect(
        graphTraversalEngine.traverseGraph(
          'nonexistent',
          {
            maxDepth: 2,
            relationshipTypes: ['follow']
          },
          mockGetNode,
          mockGetRelationships
        )
      ).rejects.toThrow('Node not found');
    });
  });

  describe('RelationshipCacheService', () => {
    it('should set and get relationship from cache', async () => {
      const mockRelationship: SocialRelationship = {
        id: 'rel1',
        followerId: 'user1',
        followingId: 'user2',
        relationshipType: 'follow',
        status: 'active',
        strength: 75,
        metadata: {
          source: 'manual',
          confidence: 100,
          tags: [],
          context: {},
          privacy: {
            visible: true,
            discoverable: true,
            shareable: true
          }
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Mock Redis operations
      const mockRedis = {
        setex: jest.fn().mockResolvedValue('OK'),
        get: jest.fn().mockResolvedValue(JSON.stringify(mockRelationship)),
        del: jest.fn().mockResolvedValue(1),
        keys: jest.fn().mockResolvedValue([]),
        info: jest.fn().mockResolvedValue(''),
        ping: jest.fn().mockResolvedValue('PONG'),
        quit: jest.fn().mockResolvedValue('OK')
      };

      // Replace the Redis instance with our mock
      (cacheService as any).redis = mockRedis;

      await cacheService.setRelationship(mockRelationship);
      const result = await cacheService.getRelationship('rel1');

      expect(result).toEqual(mockRelationship);
      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.stringContaining('rel1'),
        300,
        expect.any(String)
      );
      expect(mockRedis.get).toHaveBeenCalledWith(
        expect.stringContaining('rel1')
      );
    });

    it('should handle cache misses gracefully', async () => {
      const mockRedis = {
        get: jest.fn().mockResolvedValue(null),
        ping: jest.fn().mockResolvedValue('PONG'),
        quit: jest.fn().mockResolvedValue('OK')
      };

      (cacheService as any).redis = mockRedis;

      const result = await cacheService.getRelationship('nonexistent');

      expect(result).toBeNull();
    });

    it('should invalidate user cache successfully', async () => {
      const mockRedis = {
        keys: jest.fn().mockResolvedValue(['key1', 'key2']),
        del: jest.fn().mockResolvedValue(2),
        ping: jest.fn().mockResolvedValue('PONG'),
        quit: jest.fn().mockResolvedValue('OK')
      };

      (cacheService as any).redis = mockRedis;

      await cacheService.invalidateUserCache('user1');

      expect(mockRedis.keys).toHaveBeenCalled();
      expect(mockRedis.del).toHaveBeenCalledWith('key1', 'key2');
    });

    it('should provide health check', async () => {
      const mockRedis = {
        ping: jest.fn().mockResolvedValue('PONG'),
        quit: jest.fn().mockResolvedValue('OK')
      };

      (cacheService as any).redis = mockRedis;

      const health = await cacheService.healthCheck();

      expect(health.healthy).toBe(true);
      expect(health.latency).toBeGreaterThan(0);
    });
  });

  describe('SocialMetricsService', () => {
    it('should collect user metrics successfully', async () => {
      const mockMetrics = {
        userId: 'user1',
        timestamp: new Date(),
        period: 'daily' as const,
        connections: {
          total: 100,
          new: 5,
          lost: 2,
          netGrowth: 3,
          growthRate: 3.0
        },
        relationships: {
          followers: 80,
          following: 20,
          mutual: 15,
          blocked: 0,
          university: 60,
          department: 30,
          year: 25,
          interest: 10
        },
        engagement: {
          profileViews: 50,
          connectionRequests: 10,
          acceptedRequests: 8,
          rejectedRequests: 2,
          blocks: 0,
          unblocks: 0,
          recommendationsViewed: 20,
          recommendationsAccepted: 5
        },
        network: {
          networkSize: 100,
          networkDensity: 0.3,
          clusteringCoefficient: 0.4,
          averagePathLength: 2.5,
          influenceScore: 75,
          reachScore: 80
        },
        universityNetwork: {
          totalConnections: 60,
          departmentConnections: 30,
          yearConnections: 25,
          crossDepartmentConnections: 15,
          alumniConnections: 10,
          networkGrowth: 5
        },
        activity: {
          peakHours: [9, 10, 11, 14, 15, 16],
          peakDays: ['Monday', 'Tuesday', 'Wednesday'],
          connectionActivity: 20,
          discoveryActivity: 15,
          recommendationActivity: 10
        }
      };

      mockDb.getActiveUsers.mockResolvedValue(['user1']);
      mockDb.getUserRelationships.mockResolvedValue([]);
      mockDb.getUserNode.mockResolvedValue(null);
      mockDb.getUserProfile.mockResolvedValue(null);
      mockDb.getLostConnections.mockResolvedValue(0);
      mockDb.getProfileViews.mockResolvedValue(50);
      mockDb.getConnectionRequests.mockResolvedValue(10);
      mockDb.getAcceptedRequests.mockResolvedValue(8);
      mockDb.getRejectedRequests.mockResolvedValue(2);
      mockDb.getBlocks.mockResolvedValue(0);
      mockDb.getUnblocks.mockResolvedValue(0);
      mockDb.getRecommendationsViewed.mockResolvedValue(20);
      mockDb.getRecommendationsAccepted.mockResolvedValue(5);
      mockDb.getPeakActivityHours.mockResolvedValue([9, 10, 11, 14, 15, 16]);
      mockDb.getPeakActivityDays.mockResolvedValue(['Monday', 'Tuesday', 'Wednesday']);
      mockDb.getConnectionActivity.mockResolvedValue(20);
      mockDb.getDiscoveryActivity.mockResolvedValue(15);
      mockDb.getRecommendationActivity.mockResolvedValue(10);
      mockDb.storeSocialMetrics.mockResolvedValue(undefined);
      mockCache.set.mockResolvedValue(undefined);
      mockEvents.emit.mockResolvedValue(undefined);

      const result = await metricsService.collectUserMetrics('user1');

      expect(result).toBeDefined();
      expect(result?.userId).toBe('user1');
      expect(result?.connections.total).toBe(0); // No relationships in mock
      expect(mockDb.storeSocialMetrics).toHaveBeenCalled();
      expect(mockCache.set).toHaveBeenCalled();
      expect(mockEvents.emit).toHaveBeenCalledWith('social_metrics.updated', expect.any(Object));
    });

    it('should generate network insights successfully', async () => {
      const mockMetrics = {
        userId: 'user1',
        timestamp: new Date(),
        period: 'weekly' as const,
        connections: {
          total: 100,
          new: 15,
          lost: 5,
          netGrowth: 10,
          growthRate: 10.0
        },
        relationships: {
          followers: 80,
          following: 20,
          mutual: 15,
          blocked: 0,
          university: 60,
          department: 30,
          year: 25,
          interest: 10
        },
        engagement: {
          profileViews: 100,
          connectionRequests: 20,
          acceptedRequests: 15,
          rejectedRequests: 5,
          blocks: 0,
          unblocks: 0,
          recommendationsViewed: 50,
          recommendationsAccepted: 10
        },
        network: {
          networkSize: 100,
          networkDensity: 0.3,
          clusteringCoefficient: 0.4,
          averagePathLength: 2.5,
          influenceScore: 75,
          reachScore: 80
        },
        universityNetwork: {
          totalConnections: 60,
          departmentConnections: 30,
          yearConnections: 25,
          crossDepartmentConnections: 15,
          alumniConnections: 10,
          networkGrowth: 5
        },
        activity: {
          peakHours: [9, 10, 11, 14, 15, 16],
          peakDays: ['Monday', 'Tuesday', 'Wednesday'],
          connectionActivity: 20,
          discoveryActivity: 15,
          recommendationActivity: 10
        }
      };

      mockDb.getUserSocialMetrics.mockResolvedValue(mockMetrics);

      const insights = await metricsService.generateNetworkInsights('user1');

      expect(insights).toBeDefined();
      expect(insights.userId).toBe('user1');
      expect(insights.insights).toBeDefined();
      expect(insights.generatedAt).toBeInstanceOf(Date);
    });

    it('should get metrics trends successfully', async () => {
      const mockHistoricalMetrics = [
        {
          userId: 'user1',
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          period: 'daily' as const,
          connections: { total: 95, new: 0, lost: 0, netGrowth: 0, growthRate: 0 },
          relationships: { followers: 75, following: 20, mutual: 15, blocked: 0, university: 60, department: 30, year: 25, interest: 10 },
          engagement: { profileViews: 40, connectionRequests: 8, acceptedRequests: 6, rejectedRequests: 2, blocks: 0, unblocks: 0, recommendationsViewed: 15, recommendationsAccepted: 3 },
          network: { networkSize: 95, networkDensity: 0.28, clusteringCoefficient: 0.35, averagePathLength: 2.6, influenceScore: 70, reachScore: 75 },
          universityNetwork: { totalConnections: 60, departmentConnections: 30, yearConnections: 25, crossDepartmentConnections: 15, alumniConnections: 10, networkGrowth: 3 },
          activity: { peakHours: [9, 10, 11, 14, 15, 16], peakDays: ['Monday', 'Tuesday', 'Wednesday'], connectionActivity: 18, discoveryActivity: 12, recommendationActivity: 8 }
        },
        {
          userId: 'user1',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
          period: 'daily' as const,
          connections: { total: 100, new: 5, lost: 0, netGrowth: 5, growthRate: 5.26 },
          relationships: { followers: 80, following: 20, mutual: 15, blocked: 0, university: 60, department: 30, year: 25, interest: 10 },
          engagement: { profileViews: 50, connectionRequests: 10, acceptedRequests: 8, rejectedRequests: 2, blocks: 0, unblocks: 0, recommendationsViewed: 20, recommendationsAccepted: 5 },
          network: { networkSize: 100, networkDensity: 0.3, clusteringCoefficient: 0.4, averagePathLength: 2.5, influenceScore: 75, reachScore: 80 },
          universityNetwork: { totalConnections: 60, departmentConnections: 30, yearConnections: 25, crossDepartmentConnections: 15, alumniConnections: 10, networkGrowth: 5 },
          activity: { peakHours: [9, 10, 11, 14, 15, 16], peakDays: ['Monday', 'Tuesday', 'Wednesday'], connectionActivity: 20, discoveryActivity: 15, recommendationActivity: 10 }
        }
      ];

      mockDb.getUserSocialMetricsHistory.mockResolvedValue(mockHistoricalMetrics);

      const trends = await metricsService.getMetricsTrends('user1', 'daily', 30);

      expect(trends).toBeDefined();
      expect(trends.length).toBeGreaterThan(0);
      expect(trends[0]).toHaveProperty('metric');
      expect(trends[0]).toHaveProperty('currentValue');
      expect(trends[0]).toHaveProperty('previousValue');
      expect(trends[0]).toHaveProperty('change');
      expect(trends[0]).toHaveProperty('changePercentage');
      expect(trends[0]).toHaveProperty('trend');
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete relationship lifecycle', async () => {
      const mockRelationship: SocialRelationship = {
        id: 'rel1',
        followerId: 'user1',
        followingId: 'user2',
        relationshipType: 'follow',
        status: 'active',
        strength: 75,
        metadata: {
          source: 'manual',
          confidence: 100,
          tags: [],
          context: {},
          privacy: {
            visible: true,
            discoverable: true,
            shareable: true
          }
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Create relationship
      mockDb.createRelationship.mockResolvedValue(mockRelationship);
      mockCache.setRelationship.mockResolvedValue(undefined);
      mockEvents.emit.mockResolvedValue(undefined);
      mockAnalytics.track.mockResolvedValue(undefined);
      mockNotifications.sendNotification.mockResolvedValue(undefined);

      const created = await relationshipService.createRelationship('user1', 'user2', 'follow');
      expect(created).toEqual(mockRelationship);

      // Update relationship
      const updatedRelationship = { ...mockRelationship, strength: 80 };
      mockDb.updateRelationship.mockResolvedValue(updatedRelationship);
      mockCache.setRelationship.mockResolvedValue(undefined);
      mockEvents.emit.mockResolvedValue(undefined);
      mockAnalytics.track.mockResolvedValue(undefined);

      const updated = await relationshipService.updateRelationship('rel1', { strength: 80 });
      expect(updated.strength).toBe(80);

      // Delete relationship
      mockDb.deleteRelationship.mockResolvedValue(undefined);
      mockCache.deleteRelationship.mockResolvedValue(undefined);
      mockEvents.emit.mockResolvedValue(undefined);
      mockAnalytics.track.mockResolvedValue(undefined);

      await relationshipService.deleteRelationship('rel1');
      expect(mockDb.deleteRelationship).toHaveBeenCalledWith('rel1');
    });

    it('should handle cache and database consistency', async () => {
      const mockRelationship: SocialRelationship = {
        id: 'rel1',
        followerId: 'user1',
        followingId: 'user2',
        relationshipType: 'follow',
        status: 'active',
        strength: 75,
        metadata: {
          source: 'manual',
          confidence: 100,
          tags: [],
          context: {},
          privacy: {
            visible: true,
            discoverable: true,
            shareable: true
          }
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Cache miss, database hit
      mockCache.getRelationship.mockResolvedValue(null);
      mockDb.getRelationship.mockResolvedValue(mockRelationship);
      mockCache.setRelationship.mockResolvedValue(undefined);

      const result = await relationshipService.getRelationship('rel1');
      expect(result).toEqual(mockRelationship);
      expect(mockCache.setRelationship).toHaveBeenCalledWith(mockRelationship);

      // Cache hit
      mockCache.getRelationship.mockResolvedValue(mockRelationship);
      const cachedResult = await relationshipService.getRelationship('rel1');
      expect(cachedResult).toEqual(mockRelationship);
      expect(mockDb.getRelationship).toHaveBeenCalledTimes(1); // Should not be called again
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      mockDb.createRelationship.mockRejectedValue(new Error('Connection failed'));

      await expect(
        relationshipService.createRelationship('user1', 'user2', 'follow')
      ).rejects.toThrow('Connection failed');
    });

    it('should handle cache connection errors', async () => {
      mockCache.getRelationship.mockRejectedValue(new Error('Redis connection failed'));

      await expect(
        relationshipService.getRelationship('rel1')
      ).rejects.toThrow('Redis connection failed');
    });

    it('should handle invalid relationship data', async () => {
      await expect(
        relationshipService.createRelationship('', 'user2', 'follow')
      ).rejects.toThrow('Invalid relationship data');
    });

    it('should handle relationship not found', async () => {
      mockDb.getRelationship.mockResolvedValue(null);
      mockCache.getRelationship.mockResolvedValue(null);

      const result = await relationshipService.getRelationship('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('Performance Tests', () => {
    it('should handle large number of relationships efficiently', async () => {
      const largeRelationshipList: SocialRelationship[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `rel${i}`,
        followerId: 'user1',
        followingId: `user${i + 2}`,
        relationshipType: 'follow' as RelationshipType,
        status: 'active' as RelationshipStatus,
        strength: 50 + (i % 50),
        metadata: {
          source: 'manual' as const,
          confidence: 100,
          tags: [],
          context: {},
          privacy: {
            visible: true,
            discoverable: true,
            shareable: true
          }
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      mockDb.getUserRelationships.mockResolvedValue(largeRelationshipList);
      mockCache.getUserRelationships.mockResolvedValue(largeRelationshipList);

      const startTime = Date.now();
      const result = await relationshipService.getUserRelationships('user1');
      const endTime = Date.now();

      expect(result).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle concurrent relationship operations', async () => {
      const mockRelationship: SocialRelationship = {
        id: 'rel1',
        followerId: 'user1',
        followingId: 'user2',
        relationshipType: 'follow',
        status: 'active',
        strength: 75,
        metadata: {
          source: 'manual',
          confidence: 100,
          tags: [],
          context: {},
          privacy: {
            visible: true,
            discoverable: true,
            shareable: true
          }
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockDb.createRelationship.mockResolvedValue(mockRelationship);
      mockCache.setRelationship.mockResolvedValue(undefined);
      mockEvents.emit.mockResolvedValue(undefined);
      mockAnalytics.track.mockResolvedValue(undefined);
      mockNotifications.sendNotification.mockResolvedValue(undefined);

      const startTime = Date.now();
      const promises = Array.from({ length: 100 }, (_, i) =>
        relationshipService.createRelationship(`user${i}`, `user${i + 1}`, 'follow')
      );
      
      const results = await Promise.all(promises);
      const endTime = Date.now();

      expect(results).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});
