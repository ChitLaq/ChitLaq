// Recommendation Cache Management
// Author: ChitLaq Development Team
// Date: 2024-01-15

import Redis from 'redis';

export interface CacheConfig {
    host: string;
    port: number;
    password?: string;
    db?: number;
    keyPrefix: string;
    defaultTTL: number;
    maxMemory: string;
    evictionPolicy: 'allkeys-lru' | 'allkeys-lfu' | 'volatile-lru' | 'volatile-lfu';
}

export interface CacheStats {
    hits: number;
    misses: number;
    hitRate: number;
    totalKeys: number;
    memoryUsage: string;
    connectedClients: number;
    uptime: number;
    operations: {
        get: number;
        set: number;
        del: number;
        exists: number;
    };
}

export interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number;
    accessCount: number;
    lastAccessed: number;
    metadata: {
        userId: string;
        algorithmVersion: string;
        cacheType: string;
        size: number;
    };
}

export class RecommendationCache {
    private redis: Redis.RedisClientType;
    private config: CacheConfig;
    private stats: CacheStats;
    private isConnected: boolean = false;

    // Cache key patterns
    private keyPatterns = {
        recommendations: 'rec:user:{userId}:{hash}',
        userProfile: 'profile:user:{userId}',
        mutualConnections: 'mutual:{user1}:{user2}',
        universityData: 'university:{universityId}',
        interestEmbeddings: 'embedding:user:{userId}',
        algorithmResults: 'algo:{algorithm}:{userId}:{hash}',
        batchResults: 'batch:{batchId}',
        realTimeUpdates: 'realtime:{userId}',
        abTestResults: 'abtest:{testId}:{userId}'
    };

    // Cache TTL configurations
    private ttlConfig = {
        recommendations: 1800,      // 30 minutes
        userProfile: 3600,          // 1 hour
        mutualConnections: 900,     // 15 minutes
        universityData: 86400,      // 24 hours
        interestEmbeddings: 7200,   // 2 hours
        algorithmResults: 1800,     // 30 minutes
        batchResults: 3600,         // 1 hour
        realTimeUpdates: 300,       // 5 minutes
        abTestResults: 604800       // 7 days
    };

    constructor(config: CacheConfig) {
        this.config = config;
        this.stats = this.initializeStats();
        this.redis = this.createRedisClient();
        this.setupEventHandlers();
    }

    /**
     * Initialize Redis connection
     */
    private createRedisClient(): Redis.RedisClientType {
        const client = Redis.createClient({
            socket: {
                host: this.config.host,
                port: this.config.port
            },
            password: this.config.password,
            database: this.config.db || 0
        });

        return client;
    }

    /**
     * Setup Redis event handlers
     */
    private setupEventHandlers(): void {
        this.redis.on('connect', () => {
            console.log('Redis connected');
            this.isConnected = true;
        });

        this.redis.on('error', (error) => {
            console.error('Redis error:', error);
            this.isConnected = false;
        });

        this.redis.on('end', () => {
            console.log('Redis connection ended');
            this.isConnected = false;
        });

        this.redis.on('reconnecting', () => {
            console.log('Redis reconnecting...');
        });
    }

    /**
     * Connect to Redis
     */
    async connect(): Promise<void> {
        try {
            await this.redis.connect();
            await this.configureRedis();
        } catch (error) {
            console.error('Failed to connect to Redis:', error);
            throw error;
        }
    }

    /**
     * Configure Redis settings
     */
    private async configureRedis(): Promise<void> {
        try {
            // Set memory policy
            await this.redis.configSet('maxmemory-policy', this.config.evictionPolicy);
            
            // Set max memory if specified
            if (this.config.maxMemory) {
                await this.redis.configSet('maxmemory', this.config.maxMemory);
            }

            // Enable keyspace notifications for cache invalidation
            await this.redis.configSet('notify-keyspace-events', 'Ex');
        } catch (error) {
            console.error('Failed to configure Redis:', error);
        }
    }

    /**
     * Get cached recommendation data
     */
    async get<T>(key: string): Promise<T | null> {
        try {
            if (!this.isConnected) {
                return null;
            }

            const fullKey = this.buildKey(key);
            const cached = await this.redis.get(fullKey);
            
            if (!cached) {
                this.stats.misses++;
                return null;
            }

            const entry: CacheEntry<T> = JSON.parse(cached);
            
            // Check if entry is expired
            if (this.isExpired(entry)) {
                await this.del(key);
                this.stats.misses++;
                return null;
            }

            // Update access statistics
            entry.accessCount++;
            entry.lastAccessed = Date.now();
            
            // Update cache with new access info
            await this.redis.setex(fullKey, entry.ttl, JSON.stringify(entry));
            
            this.stats.hits++;
            this.stats.operations.get++;
            
            return entry.data;
        } catch (error) {
            console.error('Error getting from cache:', error);
            this.stats.misses++;
            return null;
        }
    }

    /**
     * Set cached recommendation data
     */
    async set<T>(key: string, data: T, ttl?: number, metadata?: any): Promise<boolean> {
        try {
            if (!this.isConnected) {
                return false;
            }

            const fullKey = this.buildKey(key);
            const entry: CacheEntry<T> = {
                data,
                timestamp: Date.now(),
                ttl: ttl || this.config.defaultTTL,
                accessCount: 0,
                lastAccessed: Date.now(),
                metadata: {
                    userId: metadata?.userId || 'unknown',
                    algorithmVersion: metadata?.algorithmVersion || '1.0.0',
                    cacheType: metadata?.cacheType || 'default',
                    size: JSON.stringify(data).length
                }
            };

            await this.redis.setex(fullKey, entry.ttl, JSON.stringify(entry));
            this.stats.operations.set++;
            
            return true;
        } catch (error) {
            console.error('Error setting cache:', error);
            return false;
        }
    }

    /**
     * Delete cached data
     */
    async del(key: string): Promise<boolean> {
        try {
            if (!this.isConnected) {
                return false;
            }

            const fullKey = this.buildKey(key);
            const result = await this.redis.del(fullKey);
            this.stats.operations.del++;
            
            return result > 0;
        } catch (error) {
            console.error('Error deleting from cache:', error);
            return false;
        }
    }

    /**
     * Check if key exists in cache
     */
    async exists(key: string): Promise<boolean> {
        try {
            if (!this.isConnected) {
                return false;
            }

            const fullKey = this.buildKey(key);
            const result = await this.redis.exists(fullKey);
            this.stats.operations.exists++;
            
            return result > 0;
        } catch (error) {
            console.error('Error checking cache existence:', error);
            return false;
        }
    }

    /**
     * Get multiple keys at once
     */
    async mget<T>(keys: string[]): Promise<(T | null)[]> {
        try {
            if (!this.isConnected || keys.length === 0) {
                return keys.map(() => null);
            }

            const fullKeys = keys.map(key => this.buildKey(key));
            const results = await this.redis.mGet(fullKeys);
            
            return results.map((result, index) => {
                if (!result) {
                    this.stats.misses++;
                    return null;
                }

                try {
                    const entry: CacheEntry<T> = JSON.parse(result);
                    
                    if (this.isExpired(entry)) {
                        this.del(keys[index]);
                        this.stats.misses++;
                        return null;
                    }

                    this.stats.hits++;
                    return entry.data;
                } catch (error) {
                    console.error('Error parsing cached data:', error);
                    this.stats.misses++;
                    return null;
                }
            });
        } catch (error) {
            console.error('Error getting multiple keys from cache:', error);
            return keys.map(() => null);
        }
    }

    /**
     * Set multiple keys at once
     */
    async mset<T>(entries: Array<{ key: string; data: T; ttl?: number; metadata?: any }>): Promise<boolean> {
        try {
            if (!this.isConnected || entries.length === 0) {
                return false;
            }

            const pipeline = this.redis.multi();
            
            for (const entry of entries) {
                const fullKey = this.buildKey(entry.key);
                const cacheEntry: CacheEntry<T> = {
                    data: entry.data,
                    timestamp: Date.now(),
                    ttl: entry.ttl || this.config.defaultTTL,
                    accessCount: 0,
                    lastAccessed: Date.now(),
                    metadata: {
                        userId: entry.metadata?.userId || 'unknown',
                        algorithmVersion: entry.metadata?.algorithmVersion || '1.0.0',
                        cacheType: entry.metadata?.cacheType || 'default',
                        size: JSON.stringify(entry.data).length
                    }
                };

                pipeline.setex(fullKey, cacheEntry.ttl, JSON.stringify(cacheEntry));
            }

            await pipeline.exec();
            this.stats.operations.set += entries.length;
            
            return true;
        } catch (error) {
            console.error('Error setting multiple keys in cache:', error);
            return false;
        }
    }

    /**
     * Invalidate cache by pattern
     */
    async invalidatePattern(pattern: string): Promise<number> {
        try {
            if (!this.isConnected) {
                return 0;
            }

            const fullPattern = this.buildKey(pattern);
            const keys = await this.redis.keys(fullPattern);
            
            if (keys.length === 0) {
                return 0;
            }

            const result = await this.redis.del(keys);
            this.stats.operations.del += result;
            
            return result;
        } catch (error) {
            console.error('Error invalidating cache pattern:', error);
            return 0;
        }
    }

    /**
     * Invalidate user-specific cache
     */
    async invalidateUser(userId: string): Promise<number> {
        const patterns = [
            `rec:user:${userId}:*`,
            `profile:user:${userId}`,
            `mutual:${userId}:*`,
            `mutual:*:${userId}`,
            `embedding:user:${userId}`,
            `algo:*:${userId}:*`,
            `realtime:${userId}`
        ];

        let totalInvalidated = 0;
        for (const pattern of patterns) {
            totalInvalidated += await this.invalidatePattern(pattern);
        }

        return totalInvalidated;
    }

    /**
     * Warm up cache with frequently accessed data
     */
    async warmup(userIds: string[]): Promise<void> {
        try {
            console.log(`Warming up cache for ${userIds.length} users`);
            
            const warmupPromises = userIds.map(async (userId) => {
                // Warm up user profiles
                await this.warmupUserProfile(userId);
                
                // Warm up university data
                await this.warmupUniversityData(userId);
                
                // Warm up interest embeddings
                await this.warmupInterestEmbeddings(userId);
            });

            await Promise.all(warmupPromises);
            console.log('Cache warmup completed');
        } catch (error) {
            console.error('Error during cache warmup:', error);
        }
    }

    /**
     * Warm up user profile cache
     */
    private async warmupUserProfile(userId: string): Promise<void> {
        try {
            // This would typically fetch user profile from database
            // and cache it for faster access
            const profileKey = this.keyPatterns.userProfile.replace('{userId}', userId);
            // Implementation would go here
        } catch (error) {
            console.error(`Error warming up user profile for ${userId}:`, error);
        }
    }

    /**
     * Warm up university data cache
     */
    private async warmupUniversityData(userId: string): Promise<void> {
        try {
            // This would typically fetch university data from database
            // and cache it for faster access
            // Implementation would go here
        } catch (error) {
            console.error(`Error warming up university data for ${userId}:`, error);
        }
    }

    /**
     * Warm up interest embeddings cache
     */
    private async warmupInterestEmbeddings(userId: string): Promise<void> {
        try {
            // This would typically fetch interest embeddings from database
            // and cache them for faster access
            const embeddingKey = this.keyPatterns.interestEmbeddings.replace('{userId}', userId);
            // Implementation would go here
        } catch (error) {
            console.error(`Error warming up interest embeddings for ${userId}:`, error);
        }
    }

    /**
     * Get cache statistics
     */
    async getStats(): Promise<CacheStats> {
        try {
            if (!this.isConnected) {
                return this.stats;
            }

            const info = await this.redis.info('memory');
            const keyspace = await this.redis.info('keyspace');
            const clients = await this.redis.info('clients');
            const stats = await this.redis.info('stats');

            // Parse Redis info
            const memoryUsage = this.parseInfoValue(info, 'used_memory_human');
            const connectedClients = parseInt(this.parseInfoValue(clients, 'connected_clients') || '0');
            const uptime = parseInt(this.parseInfoValue(stats, 'uptime_in_seconds') || '0');
            const totalKeys = this.countKeysFromKeyspace(keyspace);

            // Calculate hit rate
            const hits = parseInt(this.parseInfoValue(stats, 'keyspace_hits') || '0');
            const misses = parseInt(this.parseInfoValue(stats, 'keyspace_misses') || '0');
            const hitRate = hits + misses > 0 ? hits / (hits + misses) : 0;

            this.stats = {
                ...this.stats,
                hitRate,
                totalKeys,
                memoryUsage,
                connectedClients,
                uptime
            };

            return this.stats;
        } catch (error) {
            console.error('Error getting cache stats:', error);
            return this.stats;
        }
    }

    /**
     * Clear all cache data
     */
    async clear(): Promise<boolean> {
        try {
            if (!this.isConnected) {
                return false;
            }

            await this.redis.flushDb();
            this.stats = this.initializeStats();
            
            return true;
        } catch (error) {
            console.error('Error clearing cache:', error);
            return false;
        }
    }

    /**
     * Close Redis connection
     */
    async disconnect(): Promise<void> {
        try {
            if (this.isConnected) {
                await this.redis.quit();
                this.isConnected = false;
            }
        } catch (error) {
            console.error('Error disconnecting from Redis:', error);
        }
    }

    /**
     * Build full cache key with prefix
     */
    private buildKey(key: string): string {
        return `${this.config.keyPrefix}${key}`;
    }

    /**
     * Check if cache entry is expired
     */
    private isExpired(entry: CacheEntry<any>): boolean {
        const now = Date.now();
        const age = now - entry.timestamp;
        return age > (entry.ttl * 1000);
    }

    /**
     * Initialize cache statistics
     */
    private initializeStats(): CacheStats {
        return {
            hits: 0,
            misses: 0,
            hitRate: 0,
            totalKeys: 0,
            memoryUsage: '0B',
            connectedClients: 0,
            uptime: 0,
            operations: {
                get: 0,
                set: 0,
                del: 0,
                exists: 0
            }
        };
    }

    /**
     * Parse Redis info value
     */
    private parseInfoValue(info: string, key: string): string | null {
        const regex = new RegExp(`${key}:(.+)`);
        const match = info.match(regex);
        return match ? match[1] : null;
    }

    /**
     * Count total keys from keyspace info
     */
    private countKeysFromKeyspace(keyspace: string): number {
        const regex = /db\d+:keys=(\d+)/g;
        let totalKeys = 0;
        let match;

        while ((match = regex.exec(keyspace)) !== null) {
            totalKeys += parseInt(match[1]);
        }

        return totalKeys;
    }

    /**
     * Get TTL for cache type
     */
    getTTL(cacheType: keyof typeof this.ttlConfig): number {
        return this.ttlConfig[cacheType];
    }

    /**
     * Update TTL configuration
     */
    updateTTL(cacheType: keyof typeof this.ttlConfig, ttl: number): void {
        this.ttlConfig[cacheType] = ttl;
    }

    /**
     * Get cache key pattern
     */
    getKeyPattern(patternName: keyof typeof this.keyPatterns): string {
        return this.keyPatterns[patternName];
    }

    /**
     * Check if cache is connected
     */
    isCacheConnected(): boolean {
        return this.isConnected;
    }

    /**
     * Get cache configuration
     */
    getConfig(): CacheConfig {
        return { ...this.config };
    }
}
