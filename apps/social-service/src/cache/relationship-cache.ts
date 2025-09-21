import { 
  SocialRelationship, 
  SocialGraphNode, 
  ConnectionRecommendation,
  GraphTraversalResult,
  RelationshipType,
  GraphFilters
} from '../models/SocialGraph';
import { Redis } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

export interface CacheConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  ttl: {
    relationships: number; // seconds
    nodes: number;
    recommendations: number;
    graphTraversal: number;
    userConnections: number;
    mutualConnections: number;
    universityConnections: number;
    departmentConnections: number;
    yearConnections: number;
  };
  maxMemory: string;
  evictionPolicy: 'allkeys-lru' | 'allkeys-lfu' | 'volatile-lru' | 'volatile-lfu';
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  memoryUsage: number;
  keyCount: number;
  evictions: number;
  operations: {
    get: number;
    set: number;
    delete: number;
    exists: number;
  };
}

export class RelationshipCacheService {
  private redis: Redis;
  private config: CacheConfig;
  private metrics: CacheMetrics;
  private keyPrefix: string = 'chitlaq:social:';

  constructor(config: CacheConfig) {
    this.config = config;
    this.metrics = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      memoryUsage: 0,
      keyCount: 0,
      evictions: 0,
      operations: {
        get: 0,
        set: 0,
        delete: 0,
        exists: 0
      }
    };

    this.redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db || 0,
      maxMemoryPolicy: config.evictionPolicy,
      maxmemory: config.maxMemory,
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });

    this.setupEventHandlers();
  }

  // Relationship caching
  async setRelationship(relationship: SocialRelationship): Promise<void> {
    try {
      const key = this.getRelationshipKey(relationship.id);
      const serialized = JSON.stringify({
        ...relationship,
        createdAt: relationship.createdAt.toISOString(),
        updatedAt: relationship.updatedAt.toISOString(),
        expiresAt: relationship.expiresAt?.toISOString()
      });

      await this.redis.setex(key, this.config.ttl.relationships, serialized);
      this.metrics.operations.set++;
      this.updateMetrics();
    } catch (error) {
      console.error('Error setting relationship in cache:', error);
      throw error;
    }
  }

  async getRelationship(relationshipId: string): Promise<SocialRelationship | null> {
    try {
      const key = this.getRelationshipKey(relationshipId);
      const cached = await this.redis.get(key);
      this.metrics.operations.get++;

      if (cached) {
        this.metrics.hits++;
        const parsed = JSON.parse(cached);
        return {
          ...parsed,
          createdAt: new Date(parsed.createdAt),
          updatedAt: new Date(parsed.updatedAt),
          expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : undefined
        };
      } else {
        this.metrics.misses++;
        return null;
      }
    } catch (error) {
      console.error('Error getting relationship from cache:', error);
      this.metrics.misses++;
      return null;
    } finally {
      this.updateMetrics();
    }
  }

  async deleteRelationship(relationshipId: string): Promise<void> {
    try {
      const key = this.getRelationshipKey(relationshipId);
      await this.redis.del(key);
      this.metrics.operations.delete++;
      this.updateMetrics();
    } catch (error) {
      console.error('Error deleting relationship from cache:', error);
      throw error;
    }
  }

  async setUserRelationships(
    userId: string,
    relationships: SocialRelationship[],
    filters?: GraphFilters
  ): Promise<void> {
    try {
      const key = this.getUserRelationshipsKey(userId, filters);
      const serialized = JSON.stringify(relationships.map(rel => ({
        ...rel,
        createdAt: rel.createdAt.toISOString(),
        updatedAt: rel.updatedAt.toISOString(),
        expiresAt: rel.expiresAt?.toISOString()
      })));

      await this.redis.setex(key, this.config.ttl.userConnections, serialized);
      this.metrics.operations.set++;
      this.updateMetrics();
    } catch (error) {
      console.error('Error setting user relationships in cache:', error);
      throw error;
    }
  }

  async getUserRelationships(
    userId: string,
    filters?: GraphFilters
  ): Promise<SocialRelationship[] | null> {
    try {
      const key = this.getUserRelationshipsKey(userId, filters);
      const cached = await this.redis.get(key);
      this.metrics.operations.get++;

      if (cached) {
        this.metrics.hits++;
        const parsed = JSON.parse(cached);
        return parsed.map((rel: any) => ({
          ...rel,
          createdAt: new Date(rel.createdAt),
          updatedAt: new Date(rel.updatedAt),
          expiresAt: rel.expiresAt ? new Date(rel.expiresAt) : undefined
        }));
      } else {
        this.metrics.misses++;
        return null;
      }
    } catch (error) {
      console.error('Error getting user relationships from cache:', error);
      this.metrics.misses++;
      return null;
    } finally {
      this.updateMetrics();
    }
  }

  // Node caching
  async setNode(node: SocialGraphNode): Promise<void> {
    try {
      const key = this.getNodeKey(node.id);
      const serialized = JSON.stringify({
        ...node,
        lastActivity: node.lastActivity.toISOString(),
        createdAt: node.createdAt.toISOString(),
        updatedAt: node.updatedAt.toISOString()
      });

      await this.redis.setex(key, this.config.ttl.nodes, serialized);
      this.metrics.operations.set++;
      this.updateMetrics();
    } catch (error) {
      console.error('Error setting node in cache:', error);
      throw error;
    }
  }

  async getNode(nodeId: string): Promise<SocialGraphNode | null> {
    try {
      const key = this.getNodeKey(nodeId);
      const cached = await this.redis.get(key);
      this.metrics.operations.get++;

      if (cached) {
        this.metrics.hits++;
        const parsed = JSON.parse(cached);
        return {
          ...parsed,
          lastActivity: new Date(parsed.lastActivity),
          createdAt: new Date(parsed.createdAt),
          updatedAt: new Date(parsed.updatedAt)
        };
      } else {
        this.metrics.misses++;
        return null;
      }
    } catch (error) {
      console.error('Error getting node from cache:', error);
      this.metrics.misses++;
      return null;
    } finally {
      this.updateMetrics();
    }
  }

  async deleteNode(nodeId: string): Promise<void> {
    try {
      const key = this.getNodeKey(nodeId);
      await this.redis.del(key);
      this.metrics.operations.delete++;
      this.updateMetrics();
    } catch (error) {
      console.error('Error deleting node from cache:', error);
      throw error;
    }
  }

  // Connection lists caching
  async setFollowers(
    userId: string,
    followers: { users: SocialGraphNode[]; total: number },
    limit: number,
    offset: number
  ): Promise<void> {
    try {
      const key = this.getFollowersKey(userId, limit, offset);
      const serialized = JSON.stringify(followers);
      await this.redis.setex(key, this.config.ttl.userConnections, serialized);
      this.metrics.operations.set++;
      this.updateMetrics();
    } catch (error) {
      console.error('Error setting followers in cache:', error);
      throw error;
    }
  }

  async getFollowers(
    userId: string,
    limit: number,
    offset: number
  ): Promise<{ users: SocialGraphNode[]; total: number } | null> {
    try {
      const key = this.getFollowersKey(userId, limit, offset);
      const cached = await this.redis.get(key);
      this.metrics.operations.get++;

      if (cached) {
        this.metrics.hits++;
        return JSON.parse(cached);
      } else {
        this.metrics.misses++;
        return null;
      }
    } catch (error) {
      console.error('Error getting followers from cache:', error);
      this.metrics.misses++;
      return null;
    } finally {
      this.updateMetrics();
    }
  }

  async setFollowing(
    userId: string,
    following: { users: SocialGraphNode[]; total: number },
    limit: number,
    offset: number
  ): Promise<void> {
    try {
      const key = this.getFollowingKey(userId, limit, offset);
      const serialized = JSON.stringify(following);
      await this.redis.setex(key, this.config.ttl.userConnections, serialized);
      this.metrics.operations.set++;
      this.updateMetrics();
    } catch (error) {
      console.error('Error setting following in cache:', error);
      throw error;
    }
  }

  async getFollowing(
    userId: string,
    limit: number,
    offset: number
  ): Promise<{ users: SocialGraphNode[]; total: number } | null> {
    try {
      const key = this.getFollowingKey(userId, limit, offset);
      const cached = await this.redis.get(key);
      this.metrics.operations.get++;

      if (cached) {
        this.metrics.hits++;
        return JSON.parse(cached);
      } else {
        this.metrics.misses++;
        return null;
      }
    } catch (error) {
      console.error('Error getting following from cache:', error);
      this.metrics.misses++;
      return null;
    } finally {
      this.updateMetrics();
    }
  }

  async setMutualConnections(
    userId1: string,
    userId2: string,
    mutualConnections: SocialGraphNode[],
    limit: number
  ): Promise<void> {
    try {
      const key = this.getMutualConnectionsKey(userId1, userId2, limit);
      const serialized = JSON.stringify(mutualConnections);
      await this.redis.setex(key, this.config.ttl.mutualConnections, serialized);
      this.metrics.operations.set++;
      this.updateMetrics();
    } catch (error) {
      console.error('Error setting mutual connections in cache:', error);
      throw error;
    }
  }

  async getMutualConnections(
    userId1: string,
    userId2: string,
    limit: number
  ): Promise<SocialGraphNode[] | null> {
    try {
      const key = this.getMutualConnectionsKey(userId1, userId2, limit);
      const cached = await this.redis.get(key);
      this.metrics.operations.get++;

      if (cached) {
        this.metrics.hits++;
        return JSON.parse(cached);
      } else {
        this.metrics.misses++;
        return null;
      }
    } catch (error) {
      console.error('Error getting mutual connections from cache:', error);
      this.metrics.misses++;
      return null;
    } finally {
      this.updateMetrics();
    }
  }

  // University network caching
  async setUniversityConnections(
    userId: string,
    universityId: string,
    connections: { users: SocialGraphNode[]; total: number },
    limit: number,
    offset: number
  ): Promise<void> {
    try {
      const key = this.getUniversityConnectionsKey(userId, universityId, limit, offset);
      const serialized = JSON.stringify(connections);
      await this.redis.setex(key, this.config.ttl.universityConnections, serialized);
      this.metrics.operations.set++;
      this.updateMetrics();
    } catch (error) {
      console.error('Error setting university connections in cache:', error);
      throw error;
    }
  }

  async getUniversityConnections(
    userId: string,
    universityId: string,
    limit: number,
    offset: number
  ): Promise<{ users: SocialGraphNode[]; total: number } | null> {
    try {
      const key = this.getUniversityConnectionsKey(userId, universityId, limit, offset);
      const cached = await this.redis.get(key);
      this.metrics.operations.get++;

      if (cached) {
        this.metrics.hits++;
        return JSON.parse(cached);
      } else {
        this.metrics.misses++;
        return null;
      }
    } catch (error) {
      console.error('Error getting university connections from cache:', error);
      this.metrics.misses++;
      return null;
    } finally {
      this.updateMetrics();
    }
  }

  async setDepartmentConnections(
    userId: string,
    departmentId: string,
    connections: { users: SocialGraphNode[]; total: number },
    limit: number,
    offset: number
  ): Promise<void> {
    try {
      const key = this.getDepartmentConnectionsKey(userId, departmentId, limit, offset);
      const serialized = JSON.stringify(connections);
      await this.redis.setex(key, this.config.ttl.departmentConnections, serialized);
      this.metrics.operations.set++;
      this.updateMetrics();
    } catch (error) {
      console.error('Error setting department connections in cache:', error);
      throw error;
    }
  }

  async getDepartmentConnections(
    userId: string,
    departmentId: string,
    limit: number,
    offset: number
  ): Promise<{ users: SocialGraphNode[]; total: number } | null> {
    try {
      const key = this.getDepartmentConnectionsKey(userId, departmentId, limit, offset);
      const cached = await this.redis.get(key);
      this.metrics.operations.get++;

      if (cached) {
        this.metrics.hits++;
        return JSON.parse(cached);
      } else {
        this.metrics.misses++;
        return null;
      }
    } catch (error) {
      console.error('Error getting department connections from cache:', error);
      this.metrics.misses++;
      return null;
    } finally {
      this.updateMetrics();
    }
  }

  async setYearConnections(
    userId: string,
    year: number,
    connections: { users: SocialGraphNode[]; total: number },
    limit: number,
    offset: number
  ): Promise<void> {
    try {
      const key = this.getYearConnectionsKey(userId, year, limit, offset);
      const serialized = JSON.stringify(connections);
      await this.redis.setex(key, this.config.ttl.yearConnections, serialized);
      this.metrics.operations.set++;
      this.updateMetrics();
    } catch (error) {
      console.error('Error setting year connections in cache:', error);
      throw error;
    }
  }

  async getYearConnections(
    userId: string,
    year: number,
    limit: number,
    offset: number
  ): Promise<{ users: SocialGraphNode[]; total: number } | null> {
    try {
      const key = this.getYearConnectionsKey(userId, year, limit, offset);
      const cached = await this.redis.get(key);
      this.metrics.operations.get++;

      if (cached) {
        this.metrics.hits++;
        return JSON.parse(cached);
      } else {
        this.metrics.misses++;
        return null;
      }
    } catch (error) {
      console.error('Error getting year connections from cache:', error);
      this.metrics.misses++;
      return null;
    } finally {
      this.updateMetrics();
    }
  }

  // Recommendations caching
  async setRecommendations(
    userId: string,
    recommendations: ConnectionRecommendation[],
    types: string[],
    limit: number
  ): Promise<void> {
    try {
      const key = this.getRecommendationsKey(userId, types, limit);
      const serialized = JSON.stringify(recommendations);
      await this.redis.setex(key, this.config.ttl.recommendations, serialized);
      this.metrics.operations.set++;
      this.updateMetrics();
    } catch (error) {
      console.error('Error setting recommendations in cache:', error);
      throw error;
    }
  }

  async getRecommendations(
    userId: string,
    types: string[],
    limit: number
  ): Promise<ConnectionRecommendation[] | null> {
    try {
      const key = this.getRecommendationsKey(userId, types, limit);
      const cached = await this.redis.get(key);
      this.metrics.operations.get++;

      if (cached) {
        this.metrics.hits++;
        return JSON.parse(cached);
      } else {
        this.metrics.misses++;
        return null;
      }
    } catch (error) {
      console.error('Error getting recommendations from cache:', error);
      this.metrics.misses++;
      return null;
    } finally {
      this.updateMetrics();
    }
  }

  // Graph traversal caching
  async setGraphTraversal(
    query: any,
    result: GraphTraversalResult
  ): Promise<void> {
    try {
      const key = this.getGraphTraversalKey(query);
      const serialized = JSON.stringify(result);
      await this.redis.setex(key, this.config.ttl.graphTraversal, serialized);
      this.metrics.operations.set++;
      this.updateMetrics();
    } catch (error) {
      console.error('Error setting graph traversal in cache:', error);
      throw error;
    }
  }

  async getGraphTraversal(query: any): Promise<GraphTraversalResult | null> {
    try {
      const key = this.getGraphTraversalKey(query);
      const cached = await this.redis.get(key);
      this.metrics.operations.get++;

      if (cached) {
        this.metrics.hits++;
        return JSON.parse(cached);
      } else {
        this.metrics.misses++;
        return null;
      }
    } catch (error) {
      console.error('Error getting graph traversal from cache:', error);
      this.metrics.misses++;
      return null;
    } finally {
      this.updateMetrics();
    }
  }

  // Cache invalidation
  async invalidateUserCache(userId: string): Promise<void> {
    try {
      const patterns = [
        `${this.keyPrefix}relationships:user:${userId}:*`,
        `${this.keyPrefix}followers:${userId}:*`,
        `${this.keyPrefix}following:${userId}:*`,
        `${this.keyPrefix}mutual_connections:${userId}:*`,
        `${this.keyPrefix}mutual_connections:*:${userId}:*`,
        `${this.keyPrefix}university_connections:${userId}:*`,
        `${this.keyPrefix}department_connections:${userId}:*`,
        `${this.keyPrefix}year_connections:${userId}:*`,
        `${this.keyPrefix}recommendations:${userId}:*`
      ];

      for (const pattern of patterns) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      }

      this.metrics.operations.delete += patterns.length;
      this.updateMetrics();
    } catch (error) {
      console.error('Error invalidating user cache:', error);
      throw error;
    }
  }

  async invalidateRelationshipCache(relationshipId: string): Promise<void> {
    try {
      const key = this.getRelationshipKey(relationshipId);
      await this.redis.del(key);
      this.metrics.operations.delete++;
      this.updateMetrics();
    } catch (error) {
      console.error('Error invalidating relationship cache:', error);
      throw error;
    }
  }

  async invalidateNodeCache(nodeId: string): Promise<void> {
    try {
      const key = this.getNodeKey(nodeId);
      await this.redis.del(key);
      this.metrics.operations.delete++;
      this.updateMetrics();
    } catch (error) {
      console.error('Error invalidating node cache:', error);
      throw error;
    }
  }

  // Cache management
  async clearCache(): Promise<void> {
    try {
      const keys = await this.redis.keys(`${this.keyPrefix}*`);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
      this.metrics.operations.delete += keys.length;
      this.updateMetrics();
    } catch (error) {
      console.error('Error clearing cache:', error);
      throw error;
    }
  }

  async getCacheInfo(): Promise<any> {
    try {
      const info = await this.redis.info('memory');
      const keyspace = await this.redis.info('keyspace');
      const stats = await this.redis.info('stats');
      
      return {
        memory: this.parseRedisInfo(info),
        keyspace: this.parseRedisInfo(keyspace),
        stats: this.parseRedisInfo(stats),
        metrics: this.metrics
      };
    } catch (error) {
      console.error('Error getting cache info:', error);
      throw error;
    }
  }

  async getMetrics(): Promise<CacheMetrics> {
    return { ...this.metrics };
  }

  async resetMetrics(): Promise<void> {
    this.metrics = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      memoryUsage: 0,
      keyCount: 0,
      evictions: 0,
      operations: {
        get: 0,
        set: 0,
        delete: 0,
        exists: 0
      }
    };
  }

  // Health check
  async healthCheck(): Promise<{ healthy: boolean; latency: number; error?: string }> {
    try {
      const start = Date.now();
      await this.redis.ping();
      const latency = Date.now() - start;
      
      return {
        healthy: true,
        latency
      };
    } catch (error) {
      return {
        healthy: false,
        latency: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Key generation methods
  private getRelationshipKey(relationshipId: string): string {
    return `${this.keyPrefix}relationship:${relationshipId}`;
  }

  private getNodeKey(nodeId: string): string {
    return `${this.keyPrefix}node:${nodeId}`;
  }

  private getUserRelationshipsKey(userId: string, filters?: GraphFilters): string {
    const filterHash = filters ? this.hashFilters(filters) : 'default';
    return `${this.keyPrefix}relationships:user:${userId}:${filterHash}`;
  }

  private getFollowersKey(userId: string, limit: number, offset: number): string {
    return `${this.keyPrefix}followers:${userId}:${limit}:${offset}`;
  }

  private getFollowingKey(userId: string, limit: number, offset: number): string {
    return `${this.keyPrefix}following:${userId}:${limit}:${offset}`;
  }

  private getMutualConnectionsKey(userId1: string, userId2: string, limit: number): string {
    return `${this.keyPrefix}mutual_connections:${userId1}:${userId2}:${limit}`;
  }

  private getUniversityConnectionsKey(
    userId: string,
    universityId: string,
    limit: number,
    offset: number
  ): string {
    return `${this.keyPrefix}university_connections:${userId}:${universityId}:${limit}:${offset}`;
  }

  private getDepartmentConnectionsKey(
    userId: string,
    departmentId: string,
    limit: number,
    offset: number
  ): string {
    return `${this.keyPrefix}department_connections:${userId}:${departmentId}:${limit}:${offset}`;
  }

  private getYearConnectionsKey(
    userId: string,
    year: number,
    limit: number,
    offset: number
  ): string {
    return `${this.keyPrefix}year_connections:${userId}:${year}:${limit}:${offset}`;
  }

  private getRecommendationsKey(userId: string, types: string[], limit: number): string {
    const typesHash = types.sort().join(',');
    return `${this.keyPrefix}recommendations:${userId}:${typesHash}:${limit}`;
  }

  private getGraphTraversalKey(query: any): string {
    const queryHash = this.hashObject(query);
    return `${this.keyPrefix}graph_traversal:${queryHash}`;
  }

  // Utility methods
  private hashFilters(filters: GraphFilters): string {
    return this.hashObject(filters);
  }

  private hashObject(obj: any): string {
    return Buffer.from(JSON.stringify(obj)).toString('base64').slice(0, 16);
  }

  private parseRedisInfo(info: string): any {
    const result: any = {};
    const lines = info.split('\r\n');
    
    for (const line of lines) {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        result[key] = isNaN(Number(value)) ? value : Number(value);
      }
    }
    
    return result;
  }

  private updateMetrics(): void {
    const total = this.metrics.hits + this.metrics.misses;
    this.metrics.hitRate = total > 0 ? (this.metrics.hits / total) * 100 : 0;
  }

  private setupEventHandlers(): void {
    this.redis.on('error', (error) => {
      console.error('Redis connection error:', error);
    });

    this.redis.on('connect', () => {
      console.log('Redis connected successfully');
    });

    this.redis.on('ready', () => {
      console.log('Redis ready for operations');
    });

    this.redis.on('close', () => {
      console.log('Redis connection closed');
    });

    this.redis.on('reconnecting', () => {
      console.log('Redis reconnecting...');
    });
  }

  // Generic cache operations
  async get(key: string): Promise<string | null> {
    try {
      const result = await this.redis.get(key);
      this.metrics.operations.get++;
      if (result) {
        this.metrics.hits++;
      } else {
        this.metrics.misses++;
      }
      this.updateMetrics();
      return result;
    } catch (error) {
      console.error('Error getting from cache:', error);
      this.metrics.misses++;
      this.updateMetrics();
      return null;
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    try {
      if (ttl) {
        await this.redis.setex(key, ttl, value);
      } else {
        await this.redis.set(key, value);
      }
      this.metrics.operations.set++;
      this.updateMetrics();
    } catch (error) {
      console.error('Error setting cache:', error);
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
      this.metrics.operations.delete++;
      this.updateMetrics();
    } catch (error) {
      console.error('Error deleting from cache:', error);
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      this.metrics.operations.exists++;
      this.updateMetrics();
      return result === 1;
    } catch (error) {
      console.error('Error checking cache existence:', error);
      return false;
    }
  }

  // Cleanup
  async disconnect(): Promise<void> {
    try {
      await this.redis.quit();
    } catch (error) {
      console.error('Error disconnecting from Redis:', error);
    }
  }
}
