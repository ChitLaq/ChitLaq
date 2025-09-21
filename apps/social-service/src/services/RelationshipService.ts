import { 
  SocialRelationship, 
  RelationshipType, 
  RelationshipStatus, 
  RelationshipMetadata,
  ConnectionRecommendation,
  SocialGraphNode,
  GraphTraversalResult,
  SocialGraphQuery,
  GraphFilters,
  isRelationshipActive,
  canEstablishRelationship,
  calculateRelationshipStrength,
  validateSocialRelationship
} from '../models/SocialGraph';
import { DatabaseService } from '../database/DatabaseService';
import { CacheService } from '../cache/CacheService';
import { EventService } from '../events/EventService';
import { AnalyticsService } from '../analytics/AnalyticsService';
import { NotificationService } from '../notifications/NotificationService';
import { v4 as uuidv4 } from 'uuid';

export class RelationshipService {
  private db: DatabaseService;
  private cache: CacheService;
  private events: EventService;
  private analytics: AnalyticsService;
  private notifications: NotificationService;

  constructor(
    db: DatabaseService,
    cache: CacheService,
    events: EventService,
    analytics: AnalyticsService,
    notifications: NotificationService
  ) {
    this.db = db;
    this.cache = cache;
    this.events = events;
    this.analytics = analytics;
    this.notifications = notifications;
  }

  // Core relationship management
  async createRelationship(
    followerId: string,
    followingId: string,
    relationshipType: RelationshipType,
    metadata: Partial<RelationshipMetadata> = {}
  ): Promise<SocialRelationship> {
    try {
      // Validate inputs
      const validation = validateSocialRelationship({
        followerId,
        followingId,
        relationshipType,
        metadata
      });

      if (!validation.valid) {
        throw new Error(`Invalid relationship data: ${validation.errors.join(', ')}`);
      }

      // Check if relationship can be established
      const existingRelationships = await this.getUserRelationships(followerId);
      const canEstablish = canEstablishRelationship(
        followerId,
        followingId,
        relationshipType,
        existingRelationships
      );

      if (!canEstablish.allowed) {
        throw new Error(`Cannot establish relationship: ${canEstablish.reason}`);
      }

      // Create relationship
      const relationship: SocialRelationship = {
        id: uuidv4(),
        followerId,
        followingId,
        relationshipType,
        status: 'active',
        strength: this.calculateInitialStrength(relationshipType, metadata),
        metadata: {
          source: 'manual',
          confidence: 100,
          tags: [],
          context: {},
          privacy: {
            visible: true,
            discoverable: true,
            shareable: true
          },
          ...metadata
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Save to database
      await this.db.createRelationship(relationship);

      // Update cache
      await this.cache.setRelationship(relationship);

      // Update user connection counts
      await this.updateConnectionCounts(followerId, followingId, relationshipType, 1);

      // Emit events
      await this.events.emit('relationship.created', {
        relationship,
        followerId,
        followingId,
        relationshipType
      });

      // Track analytics
      await this.analytics.track('relationship_created', {
        followerId,
        followingId,
        relationshipType,
        source: metadata.source || 'manual'
      });

      // Send notifications
      if (relationshipType === 'follow') {
        await this.notifications.sendNotification(followingId, {
          type: 'new_follower',
          title: 'New Follower',
          message: `Someone started following you`,
          data: { followerId }
        });
      }

      return relationship;
    } catch (error) {
      console.error('Error creating relationship:', error);
      throw error;
    }
  }

  async updateRelationship(
    relationshipId: string,
    updates: Partial<SocialRelationship>
  ): Promise<SocialRelationship> {
    try {
      const existingRelationship = await this.getRelationship(relationshipId);
      if (!existingRelationship) {
        throw new Error('Relationship not found');
      }

      const updatedRelationship: SocialRelationship = {
        ...existingRelationship,
        ...updates,
        updatedAt: new Date()
      };

      // Validate updated relationship
      const validation = validateSocialRelationship(updatedRelationship);
      if (!validation.valid) {
        throw new Error(`Invalid relationship data: ${validation.errors.join(', ')}`);
      }

      // Update in database
      await this.db.updateRelationship(relationshipId, updates);

      // Update cache
      await this.cache.setRelationship(updatedRelationship);

      // Emit events
      await this.events.emit('relationship.updated', {
        relationship: updatedRelationship,
        changes: updates
      });

      // Track analytics
      await this.analytics.track('relationship_updated', {
        relationshipId,
        changes: Object.keys(updates)
      });

      return updatedRelationship;
    } catch (error) {
      console.error('Error updating relationship:', error);
      throw error;
    }
  }

  async deleteRelationship(relationshipId: string): Promise<void> {
    try {
      const relationship = await this.getRelationship(relationshipId);
      if (!relationship) {
        throw new Error('Relationship not found');
      }

      // Delete from database
      await this.db.deleteRelationship(relationshipId);

      // Remove from cache
      await this.cache.deleteRelationship(relationshipId);

      // Update connection counts
      await this.updateConnectionCounts(
        relationship.followerId,
        relationship.followingId,
        relationship.relationshipType,
        -1
      );

      // Emit events
      await this.events.emit('relationship.deleted', {
        relationship,
        followerId: relationship.followerId,
        followingId: relationship.followingId
      });

      // Track analytics
      await this.analytics.track('relationship_deleted', {
        relationshipId,
        relationshipType: relationship.relationshipType
      });
    } catch (error) {
      console.error('Error deleting relationship:', error);
      throw error;
    }
  }

  async getRelationship(relationshipId: string): Promise<SocialRelationship | null> {
    try {
      // Try cache first
      const cached = await this.cache.getRelationship(relationshipId);
      if (cached) {
        return cached;
      }

      // Fetch from database
      const relationship = await this.db.getRelationship(relationshipId);
      if (relationship) {
        // Cache the result
        await this.cache.setRelationship(relationship);
      }

      return relationship;
    } catch (error) {
      console.error('Error getting relationship:', error);
      throw error;
    }
  }

  async getUserRelationships(
    userId: string,
    filters: Partial<GraphFilters> = {}
  ): Promise<SocialRelationship[]> {
    try {
      const cacheKey = `user_relationships:${userId}:${JSON.stringify(filters)}`;
      
      // Try cache first
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Fetch from database
      const relationships = await this.db.getUserRelationships(userId, filters);

      // Cache the result
      await this.cache.set(cacheKey, JSON.stringify(relationships), 300); // 5 minutes

      return relationships;
    } catch (error) {
      console.error('Error getting user relationships:', error);
      throw error;
    }
  }

  async getFollowers(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ users: SocialGraphNode[]; total: number }> {
    try {
      const cacheKey = `followers:${userId}:${limit}:${offset}`;
      
      // Try cache first
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Fetch from database
      const result = await this.db.getFollowers(userId, limit, offset);

      // Cache the result
      await this.cache.set(cacheKey, JSON.stringify(result), 300); // 5 minutes

      return result;
    } catch (error) {
      console.error('Error getting followers:', error);
      throw error;
    }
  }

  async getFollowing(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ users: SocialGraphNode[]; total: number }> {
    try {
      const cacheKey = `following:${userId}:${limit}:${offset}`;
      
      // Try cache first
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Fetch from database
      const result = await this.db.getFollowing(userId, limit, offset);

      // Cache the result
      await this.cache.set(cacheKey, JSON.stringify(result), 300); // 5 minutes

      return result;
    } catch (error) {
      console.error('Error getting following:', error);
      throw error;
    }
  }

  async getMutualConnections(
    userId1: string,
    userId2: string,
    limit: number = 50
  ): Promise<SocialGraphNode[]> {
    try {
      const cacheKey = `mutual_connections:${userId1}:${userId2}:${limit}`;
      
      // Try cache first
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Fetch from database
      const mutualConnections = await this.db.getMutualConnections(userId1, userId2, limit);

      // Cache the result
      await this.cache.set(cacheKey, JSON.stringify(mutualConnections), 600); // 10 minutes

      return mutualConnections;
    } catch (error) {
      console.error('Error getting mutual connections:', error);
      throw error;
    }
  }

  // Relationship status management
  async blockUser(blockerId: string, blockedId: string): Promise<SocialRelationship> {
    try {
      // Remove any existing relationships
      await this.removeAllRelationships(blockerId, blockedId);

      // Create block relationship
      const blockRelationship = await this.createRelationship(
        blockerId,
        blockedId,
        'block',
        {
          source: 'manual',
          confidence: 100,
          context: {
            blockedAt: new Date().toISOString()
          }
        }
      );

      // Emit events
      await this.events.emit('user.blocked', {
        blockerId,
        blockedId,
        relationship: blockRelationship
      });

      // Track analytics
      await this.analytics.track('user_blocked', {
        blockerId,
        blockedId
      });

      return blockRelationship;
    } catch (error) {
      console.error('Error blocking user:', error);
      throw error;
    }
  }

  async unblockUser(blockerId: string, blockedId: string): Promise<void> {
    try {
      const blockRelationship = await this.db.getRelationshipByUsers(
        blockerId,
        blockedId,
        'block'
      );

      if (blockRelationship) {
        await this.deleteRelationship(blockRelationship.id);
      }

      // Emit events
      await this.events.emit('user.unblocked', {
        blockerId,
        blockedId
      });

      // Track analytics
      await this.analytics.track('user_unblocked', {
        blockerId,
        blockedId
      });
    } catch (error) {
      console.error('Error unblocking user:', error);
      throw error;
    }
  }

  async muteUser(muterId: string, mutedId: string): Promise<SocialRelationship> {
    try {
      const existingRelationship = await this.db.getRelationshipByUsers(
        muterId,
        mutedId,
        'follow'
      );

      if (existingRelationship) {
        return await this.updateRelationship(existingRelationship.id, {
          status: 'muted'
        });
      } else {
        return await this.createRelationship(
          muterId,
          mutedId,
          'follow',
          {
            status: 'muted',
            source: 'manual'
          }
        );
      }
    } catch (error) {
      console.error('Error muting user:', error);
      throw error;
    }
  }

  async unmuteUser(muterId: string, mutedId: string): Promise<void> {
    try {
      const mutedRelationship = await this.db.getRelationshipByUsers(
        muterId,
        mutedId,
        'follow'
      );

      if (mutedRelationship && mutedRelationship.status === 'muted') {
        await this.updateRelationship(mutedRelationship.id, {
          status: 'active'
        });
      }
    } catch (error) {
      console.error('Error unmuting user:', error);
      throw error;
    }
  }

  // Connection recommendations
  async getConnectionRecommendations(
    userId: string,
    limit: number = 20,
    types: string[] = ['mutual_connection', 'university', 'department', 'year', 'interest']
  ): Promise<ConnectionRecommendation[]> {
    try {
      const cacheKey = `recommendations:${userId}:${limit}:${types.join(',')}`;
      
      // Try cache first
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Generate recommendations
      const recommendations = await this.generateRecommendations(userId, limit, types);

      // Cache the result
      await this.cache.set(cacheKey, JSON.stringify(recommendations), 1800); // 30 minutes

      return recommendations;
    } catch (error) {
      console.error('Error getting connection recommendations:', error);
      throw error;
    }
  }

  async acceptRecommendation(
    userId: string,
    recommendationId: string
  ): Promise<SocialRelationship> {
    try {
      const recommendation = await this.db.getRecommendation(recommendationId);
      if (!recommendation || recommendation.userId !== userId) {
        throw new Error('Recommendation not found');
      }

      // Create relationship
      const relationship = await this.createRelationship(
        userId,
        recommendation.recommendedUserId,
        'follow',
        {
          source: 'recommendation',
          confidence: recommendation.confidence,
          context: {
            recommendationId,
            recommendationType: recommendation.recommendationType
          }
        }
      );

      // Update recommendation status
      await this.db.updateRecommendation(recommendationId, {
        status: 'accepted'
      });

      // Track analytics
      await this.analytics.track('recommendation_accepted', {
        userId,
        recommendationId,
        recommendedUserId: recommendation.recommendedUserId,
        recommendationType: recommendation.recommendationType
      });

      return relationship;
    } catch (error) {
      console.error('Error accepting recommendation:', error);
      throw error;
    }
  }

  async dismissRecommendation(
    userId: string,
    recommendationId: string
  ): Promise<void> {
    try {
      const recommendation = await this.db.getRecommendation(recommendationId);
      if (!recommendation || recommendation.userId !== userId) {
        throw new Error('Recommendation not found');
      }

      // Update recommendation status
      await this.db.updateRecommendation(recommendationId, {
        status: 'dismissed'
      });

      // Track analytics
      await this.analytics.track('recommendation_dismissed', {
        userId,
        recommendationId,
        recommendedUserId: recommendation.recommendedUserId,
        recommendationType: recommendation.recommendationType
      });
    } catch (error) {
      console.error('Error dismissing recommendation:', error);
      throw error;
    }
  }

  // Graph traversal
  async traverseGraph(query: SocialGraphQuery): Promise<GraphTraversalResult> {
    try {
      const startTime = Date.now();
      
      // Check cache first
      const cacheKey = `graph_traversal:${JSON.stringify(query)}`;
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Perform traversal
      const result = await this.db.traverseGraph(query);

      // Add metadata
      result.metadata = {
        traversalTime: Date.now() - startTime,
        nodesVisited: result.nodes.length,
        relationshipsTraversed: result.relationships.length,
        cacheHits: 0
      };

      // Cache the result
      await this.cache.set(cacheKey, JSON.stringify(result), 300); // 5 minutes

      return result;
    } catch (error) {
      console.error('Error traversing graph:', error);
      throw error;
    }
  }

  // University network management
  async getUniversityConnections(
    userId: string,
    universityId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ users: SocialGraphNode[]; total: number }> {
    try {
      const cacheKey = `university_connections:${userId}:${universityId}:${limit}:${offset}`;
      
      // Try cache first
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Fetch from database
      const result = await this.db.getUniversityConnections(userId, universityId, limit, offset);

      // Cache the result
      await this.cache.set(cacheKey, JSON.stringify(result), 600); // 10 minutes

      return result;
    } catch (error) {
      console.error('Error getting university connections:', error);
      throw error;
    }
  }

  async getDepartmentConnections(
    userId: string,
    departmentId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ users: SocialGraphNode[]; total: number }> {
    try {
      const cacheKey = `department_connections:${userId}:${departmentId}:${limit}:${offset}`;
      
      // Try cache first
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Fetch from database
      const result = await this.db.getDepartmentConnections(userId, departmentId, limit, offset);

      // Cache the result
      await this.cache.set(cacheKey, JSON.stringify(result), 600); // 10 minutes

      return result;
    } catch (error) {
      console.error('Error getting department connections:', error);
      throw error;
    }
  }

  async getYearConnections(
    userId: string,
    year: number,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ users: SocialGraphNode[]; total: number }> {
    try {
      const cacheKey = `year_connections:${userId}:${year}:${limit}:${offset}`;
      
      // Try cache first
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Fetch from database
      const result = await this.db.getYearConnections(userId, year, limit, offset);

      // Cache the result
      await this.cache.set(cacheKey, JSON.stringify(result), 600); // 10 minutes

      return result;
    } catch (error) {
      console.error('Error getting year connections:', error);
      throw error;
    }
  }

  // Private helper methods
  private async removeAllRelationships(
    userId1: string,
    userId2: string
  ): Promise<void> {
    try {
      const relationships = await this.db.getRelationshipsBetweenUsers(userId1, userId2);
      
      for (const relationship of relationships) {
        await this.deleteRelationship(relationship.id);
      }
    } catch (error) {
      console.error('Error removing relationships:', error);
      throw error;
    }
  }

  private async updateConnectionCounts(
    followerId: string,
    followingId: string,
    relationshipType: RelationshipType,
    delta: number
  ): Promise<void> {
    try {
      if (relationshipType === 'follow') {
        await this.db.incrementConnectionCount(followerId, 'following', delta);
        await this.db.incrementConnectionCount(followingId, 'followers', delta);
      } else if (relationshipType === 'block') {
        await this.db.incrementConnectionCount(followerId, 'blocked', delta);
      }
    } catch (error) {
      console.error('Error updating connection counts:', error);
      throw error;
    }
  }

  private calculateInitialStrength(
    relationshipType: RelationshipType,
    metadata: Partial<RelationshipMetadata>
  ): number {
    const baseStrength: Record<RelationshipType, number> = {
      follow: 50,
      block: 0,
      university_connection: 70,
      mutual_connection: 80,
      recommended_connection: 60,
      alumni_connection: 75,
      department_connection: 65,
      year_connection: 60,
      interest_connection: 55,
      event_connection: 50
    };

    let strength = baseStrength[relationshipType] || 50;

    // Adjust based on metadata
    if (metadata.confidence) {
      strength = (strength * metadata.confidence) / 100;
    }

    if (metadata.context?.mutualConnections) {
      strength += Math.min(metadata.context.mutualConnections * 2, 20);
    }

    if (metadata.context?.interactionScore) {
      strength += Math.min(metadata.context.interactionScore, 10);
    }

    return Math.min(Math.max(strength, 0), 100);
  }

  private async generateRecommendations(
    userId: string,
    limit: number,
    types: string[]
  ): Promise<ConnectionRecommendation[]> {
    try {
      const recommendations: ConnectionRecommendation[] = [];

      // Get user profile and existing connections
      const userProfile = await this.db.getUserProfile(userId);
      const existingConnections = await this.getUserRelationships(userId);

      // Generate recommendations based on types
      for (const type of types) {
        const typeRecommendations = await this.generateRecommendationsByType(
          userId,
          userProfile,
          existingConnections,
          type,
          Math.ceil(limit / types.length)
        );
        recommendations.push(...typeRecommendations);
      }

      // Sort by confidence and remove duplicates
      const uniqueRecommendations = this.deduplicateRecommendations(recommendations);
      return uniqueRecommendations
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, limit);
    } catch (error) {
      console.error('Error generating recommendations:', error);
      throw error;
    }
  }

  private async generateRecommendationsByType(
    userId: string,
    userProfile: any,
    existingConnections: SocialRelationship[],
    type: string,
    limit: number
  ): Promise<ConnectionRecommendation[]> {
    const recommendations: ConnectionRecommendation[] = [];
    const existingUserIds = new Set([
      userId,
      ...existingConnections.map(r => r.followingId)
    ]);

    switch (type) {
      case 'mutual_connection':
        recommendations.push(...await this.generateMutualConnectionRecommendations(
          userId,
          existingUserIds,
          limit
        ));
        break;
      case 'university':
        recommendations.push(...await this.generateUniversityRecommendations(
          userId,
          userProfile,
          existingUserIds,
          limit
        ));
        break;
      case 'department':
        recommendations.push(...await this.generateDepartmentRecommendations(
          userId,
          userProfile,
          existingUserIds,
          limit
        ));
        break;
      case 'year':
        recommendations.push(...await this.generateYearRecommendations(
          userId,
          userProfile,
          existingUserIds,
          limit
        ));
        break;
      case 'interest':
        recommendations.push(...await this.generateInterestRecommendations(
          userId,
          userProfile,
          existingUserIds,
          limit
        ));
        break;
    }

    return recommendations;
  }

  private async generateMutualConnectionRecommendations(
    userId: string,
    existingUserIds: Set<string>,
    limit: number
  ): Promise<ConnectionRecommendation[]> {
    // Implementation for mutual connection recommendations
    // This would query the database for users who have mutual connections
    // with the current user but are not already connected
    return [];
  }

  private async generateUniversityRecommendations(
    userId: string,
    userProfile: any,
    existingUserIds: Set<string>,
    limit: number
  ): Promise<ConnectionRecommendation[]> {
    // Implementation for university-based recommendations
    // This would query the database for users from the same university
    // who are not already connected
    return [];
  }

  private async generateDepartmentRecommendations(
    userId: string,
    userProfile: any,
    existingUserIds: Set<string>,
    limit: number
  ): Promise<ConnectionRecommendation[]> {
    // Implementation for department-based recommendations
    // This would query the database for users from the same department
    // who are not already connected
    return [];
  }

  private async generateYearRecommendations(
    userId: string,
    userProfile: any,
    existingUserIds: Set<string>,
    limit: number
  ): Promise<ConnectionRecommendation[]> {
    // Implementation for year-based recommendations
    // This would query the database for users from the same academic year
    // who are not already connected
    return [];
  }

  private async generateInterestRecommendations(
    userId: string,
    userProfile: any,
    existingUserIds: Set<string>,
    limit: number
  ): Promise<ConnectionRecommendation[]> {
    // Implementation for interest-based recommendations
    // This would query the database for users with similar interests
    // who are not already connected
    return [];
  }

  private deduplicateRecommendations(
    recommendations: ConnectionRecommendation[]
  ): ConnectionRecommendation[] {
    const seen = new Set<string>();
    return recommendations.filter(rec => {
      const key = `${rec.userId}:${rec.recommendedUserId}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
}
