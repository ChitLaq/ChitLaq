// caching/redis-strategy.js
// ChitLaq M1 MVP - Redis Caching Strategy Implementation
// Senior Performance Engineer - 15+ years caching and optimization experience

const redis = require('redis');
const { promisify } = require('util');

/**
 * Redis Caching Strategy for ChitLaq M1 MVP
 * 
 * This module implements a comprehensive caching strategy using Redis
 * to optimize performance and reduce database load.
 * 
 * Features:
 * - Multi-tier caching (L1: Memory, L2: Redis)
 * - Cache invalidation strategies
 * - Cache warming and preloading
 * - Performance monitoring
 * - Fallback mechanisms
 */

class RedisCacheStrategy {
  constructor(config = {}) {
    this.config = {
      host: config.host || process.env.REDIS_HOST || 'localhost',
      port: config.port || process.env.REDIS_PORT || 6379,
      password: config.password || process.env.REDIS_PASSWORD,
      db: config.db || process.env.REDIS_DB || 0,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
      family: 4,
      ...config
    };

    this.client = null;
    this.isConnected = false;
    this.memoryCache = new Map(); // L1 cache
    this.cacheStats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0
    };

    this.initializeClient();
  }

  /**
   * Initialize Redis client with connection handling
   */
  async initializeClient() {
    try {
      this.client = redis.createClient(this.config);
      
      // Promisify Redis methods
      this.getAsync = promisify(this.client.get).bind(this.client);
      this.setAsync = promisify(this.client.set).bind(this.client);
      this.delAsync = promisify(this.client.del).bind(this.client);
      this.existsAsync = promisify(this.client.exists).bind(this.client);
      this.expireAsync = promisify(this.client.expire).bind(this.client);
      this.keysAsync = promisify(this.client.keys).bind(this.client);
      this.flushdbAsync = promisify(this.client.flushdb).bind(this.client);
      this.pingAsync = promisify(this.client.ping).bind(this.client);

      // Connection event handlers
      this.client.on('connect', () => {
        console.log('Redis client connected');
        this.isConnected = true;
      });

      this.client.on('ready', () => {
        console.log('Redis client ready');
      });

      this.client.on('error', (err) => {
        console.error('Redis client error:', err);
        this.isConnected = false;
        this.cacheStats.errors++;
      });

      this.client.on('end', () => {
        console.log('Redis client disconnected');
        this.isConnected = false;
      });

      // Connect to Redis
      await this.client.connect();
    } catch (error) {
      console.error('Failed to initialize Redis client:', error);
      this.isConnected = false;
    }
  }

  /**
   * Get value from cache (L1 memory cache first, then L2 Redis)
   */
  async get(key, options = {}) {
    const { useMemoryCache = true, useRedisCache = true } = options;
    
    try {
      // L1 Cache (Memory) - fastest access
      if (useMemoryCache && this.memoryCache.has(key)) {
        const cached = this.memoryCache.get(key);
        if (cached.expires > Date.now()) {
          this.cacheStats.hits++;
          return cached.value;
        } else {
          this.memoryCache.delete(key);
        }
      }

      // L2 Cache (Redis) - fast access
      if (useRedisCache && this.isConnected) {
        const value = await this.getAsync(key);
        if (value !== null) {
          const parsedValue = JSON.parse(value);
          
          // Store in L1 cache for faster access
          if (useMemoryCache) {
            this.memoryCache.set(key, {
              value: parsedValue,
              expires: Date.now() + (options.memoryTTL || 300000) // 5 minutes default
            });
          }
          
          this.cacheStats.hits++;
          return parsedValue;
        }
      }

      this.cacheStats.misses++;
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      this.cacheStats.errors++;
      return null;
    }
  }

  /**
   * Set value in cache (both L1 memory and L2 Redis)
   */
  async set(key, value, ttl = 3600, options = {}) {
    const { useMemoryCache = true, useRedisCache = true } = options;
    
    try {
      // L1 Cache (Memory)
      if (useMemoryCache) {
        this.memoryCache.set(key, {
          value,
          expires: Date.now() + (options.memoryTTL || 300000) // 5 minutes default
        });
      }

      // L2 Cache (Redis)
      if (useRedisCache && this.isConnected) {
        const serializedValue = JSON.stringify(value);
        await this.setAsync(key, serializedValue, 'EX', ttl);
      }

      this.cacheStats.sets++;
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      this.cacheStats.errors++;
      return false;
    }
  }

  /**
   * Delete value from cache (both L1 memory and L2 Redis)
   */
  async del(key, options = {}) {
    const { useMemoryCache = true, useRedisCache = true } = options;
    
    try {
      // L1 Cache (Memory)
      if (useMemoryCache) {
        this.memoryCache.delete(key);
      }

      // L2 Cache (Redis)
      if (useRedisCache && this.isConnected) {
        await this.delAsync(key);
      }

      this.cacheStats.deletes++;
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      this.cacheStats.errors++;
      return false;
    }
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidatePattern(pattern, options = {}) {
    const { useMemoryCache = true, useRedisCache = true } = options;
    
    try {
      let deletedCount = 0;

      // L1 Cache (Memory) - pattern matching
      if (useMemoryCache) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        for (const key of this.memoryCache.keys()) {
          if (regex.test(key)) {
            this.memoryCache.delete(key);
            deletedCount++;
          }
        }
      }

      // L2 Cache (Redis) - pattern matching
      if (useRedisCache && this.isConnected) {
        const keys = await this.keysAsync(pattern);
        if (keys.length > 0) {
          await this.delAsync(...keys);
          deletedCount += keys.length;
        }
      }

      return deletedCount;
    } catch (error) {
      console.error('Cache invalidation error:', error);
      this.cacheStats.errors++;
      return 0;
    }
  }

  /**
   * Cache warming - preload frequently accessed data
   */
  async warmCache(warmingStrategies = []) {
    console.log('Starting cache warming...');
    
    for (const strategy of warmingStrategies) {
      try {
        await strategy.execute(this);
        console.log(`Cache warming strategy completed: ${strategy.name}`);
      } catch (error) {
        console.error(`Cache warming strategy failed: ${strategy.name}`, error);
      }
    }
    
    console.log('Cache warming completed');
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const total = this.cacheStats.hits + this.cacheStats.misses;
    const hitRate = total > 0 ? (this.cacheStats.hits / total * 100).toFixed(2) : 0;
    
    return {
      ...this.cacheStats,
      hitRate: `${hitRate}%`,
      memoryCacheSize: this.memoryCache.size,
      isConnected: this.isConnected
    };
  }

  /**
   * Clear all caches
   */
  async clearAll() {
    try {
      // Clear L1 cache
      this.memoryCache.clear();
      
      // Clear L2 cache
      if (this.isConnected) {
        await this.flushdbAsync();
      }
      
      console.log('All caches cleared');
      return true;
    } catch (error) {
      console.error('Cache clear error:', error);
      return false;
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      if (this.isConnected) {
        const pong = await this.pingAsync();
        return pong === 'PONG';
      }
      return false;
    } catch (error) {
      console.error('Redis health check failed:', error);
      return false;
    }
  }

  /**
   * Close Redis connection
   */
  async close() {
    try {
      if (this.client) {
        await this.client.quit();
      }
      this.memoryCache.clear();
      console.log('Redis cache strategy closed');
    } catch (error) {
      console.error('Error closing Redis connection:', error);
    }
  }
}

/**
 * Cache Key Strategies
 */
const CACHE_KEYS = {
  // User-related keys
  USER_PROFILE: (userId) => `user:profile:${userId}`,
  USER_FEED: (userId, page = 1) => `user:feed:${userId}:${page}`,
  USER_FOLLOWERS: (userId) => `user:followers:${userId}`,
  USER_FOLLOWING: (userId) => `user:following:${userId}`,
  USER_ONLINE_STATUS: (userId) => `user:online:${userId}`,
  
  // Post-related keys
  POST_DETAILS: (postId) => `post:details:${postId}`,
  POST_LIKES: (postId) => `post:likes:${postId}`,
  POST_COMMENTS: (postId, page = 1) => `post:comments:${postId}:${page}`,
  POST_TRENDING: (timeframe = 'daily') => `post:trending:${timeframe}`,
  
  // Feed-related keys
  FEED_HOME: (userId, page = 1) => `feed:home:${userId}:${page}`,
  FEED_EXPLORE: (page = 1) => `feed:explore:${page}`,
  FEED_TRENDING: (page = 1) => `feed:trending:${page}`,
  
  // Search-related keys
  SEARCH_USERS: (query, page = 1) => `search:users:${query}:${page}`,
  SEARCH_POSTS: (query, page = 1) => `search:posts:${query}:${page}`,
  SEARCH_HASHTAGS: (query, page = 1) => `search:hashtags:${query}:${page}`,
  
  // Message-related keys
  CONVERSATION: (conversationId, page = 1) => `conversation:${conversationId}:${page}`,
  CONVERSATION_LIST: (userId) => `conversation:list:${userId}`,
  MESSAGE_COUNT: (conversationId) => `message:count:${conversationId}`,
  
  // System-related keys
  TRENDING_HASHTAGS: () => 'trending:hashtags',
  ONLINE_USERS: () => 'online:users',
  SYSTEM_STATS: () => 'system:stats',
  API_RATE_LIMIT: (userId, endpoint) => `rate:limit:${userId}:${endpoint}`
};

/**
 * Cache TTL Configuration
 */
const CACHE_TTL = {
  USER_PROFILE: 3600,        // 1 hour
  USER_FEED: 300,            // 5 minutes
  POST_DETAILS: 1800,        // 30 minutes
  POST_LIKES: 600,           // 10 minutes
  POST_COMMENTS: 300,        // 5 minutes
  FEED_HOME: 300,            // 5 minutes
  FEED_EXPLORE: 600,         // 10 minutes
  SEARCH_RESULTS: 1800,      // 30 minutes
  CONVERSATION: 1800,        // 30 minutes
  CONVERSATION_LIST: 600,    // 10 minutes
  TRENDING_HASHTAGS: 3600,   // 1 hour
  ONLINE_USERS: 60,          // 1 minute
  SYSTEM_STATS: 300,         // 5 minutes
  API_RATE_LIMIT: 3600       // 1 hour
};

/**
 * Cache Warming Strategies
 */
const CACHE_WARMING_STRATEGIES = [
  {
    name: 'Trending Hashtags',
    execute: async (cache) => {
      // Preload trending hashtags
      const trendingHashtags = await getTrendingHashtags();
      await cache.set(
        CACHE_KEYS.TRENDING_HASHTAGS(),
        trendingHashtags,
        CACHE_TTL.TRENDING_HASHTAGS
      );
    }
  },
  {
    name: 'System Stats',
    execute: async (cache) => {
      // Preload system statistics
      const systemStats = await getSystemStats();
      await cache.set(
        CACHE_KEYS.SYSTEM_STATS(),
        systemStats,
        CACHE_TTL.SYSTEM_STATS
      );
    }
  },
  {
    name: 'Active Users',
    execute: async (cache) => {
      // Preload active users for faster lookups
      const activeUsers = await getActiveUsers();
      for (const user of activeUsers) {
        await cache.set(
          CACHE_KEYS.USER_ONLINE_STATUS(user.id),
          { online: true, lastSeen: new Date() },
          CACHE_TTL.ONLINE_USERS
        );
      }
    }
  }
];

/**
 * Cache Invalidation Strategies
 */
const CACHE_INVALIDATION_STRATEGIES = {
  // User profile updated
  userProfileUpdated: async (cache, userId) => {
    await cache.del(CACHE_KEYS.USER_PROFILE(userId));
    await cache.invalidatePattern(`user:feed:${userId}:*`);
  },

  // New post created
  postCreated: async (cache, userId) => {
    await cache.invalidatePattern(`user:feed:${userId}:*`);
    await cache.invalidatePattern('feed:home:*');
    await cache.invalidatePattern('feed:explore:*');
    await cache.invalidatePattern('feed:trending:*');
  },

  // Post liked/unliked
  postLiked: async (cache, postId) => {
    await cache.del(CACHE_KEYS.POST_LIKES(postId));
    await cache.del(CACHE_KEYS.POST_DETAILS(postId));
  },

  // New message sent
  messageSent: async (cache, conversationId) => {
    await cache.invalidatePattern(`conversation:${conversationId}:*`);
    await cache.del(CACHE_KEYS.MESSAGE_COUNT(conversationId));
  },

  // User followed/unfollowed
  userFollowed: async (cache, userId, targetUserId) => {
    await cache.invalidatePattern(`user:feed:${userId}:*`);
    await cache.del(CACHE_KEYS.USER_FOLLOWERS(targetUserId));
    await cache.del(CACHE_KEYS.USER_FOLLOWING(userId));
  }
};

/**
 * Cache Middleware for Express.js
 */
const cacheMiddleware = (cache, options = {}) => {
  const {
    ttl = 300,
    keyGenerator = (req) => `api:${req.method}:${req.url}`,
    skipCache = (req, res) => false,
    varyBy = (req) => req.headers['authorization'] || 'anonymous'
  } = options;

  return async (req, res, next) => {
    try {
      // Skip cache if specified
      if (skipCache(req, res)) {
        return next();
      }

      const baseKey = keyGenerator(req);
      const varyKey = varyBy(req);
      const cacheKey = `${baseKey}:${varyKey}`;

      // Try to get from cache
      const cached = await cache.get(cacheKey);
      if (cached) {
        res.set('X-Cache', 'HIT');
        res.set('X-Cache-Key', cacheKey);
        return res.json(cached);
      }

      // Cache miss - continue to handler
      res.set('X-Cache', 'MISS');
      res.set('X-Cache-Key', cacheKey);

      // Override res.json to cache the response
      const originalJson = res.json;
      res.json = function(data) {
        // Cache the response
        cache.set(cacheKey, data, ttl).catch(err => {
          console.error('Cache set error in middleware:', err);
        });
        
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
};

/**
 * Cache Service Factory
 */
class CacheServiceFactory {
  static createInstance(config = {}) {
    return new RedisCacheStrategy(config);
  }

  static createMiddleware(cache, options = {}) {
    return cacheMiddleware(cache, options);
  }

  static getCacheKeys() {
    return CACHE_KEYS;
  }

  static getCacheTTL() {
    return CACHE_TTL;
  }

  static getWarmingStrategies() {
    return CACHE_WARMING_STRATEGIES;
  }

  static getInvalidationStrategies() {
    return CACHE_INVALIDATION_STRATEGIES;
  }
}

// Helper functions (these would be implemented in your application)
async function getTrendingHashtags() {
  // Implementation to get trending hashtags from database
  return [];
}

async function getSystemStats() {
  // Implementation to get system statistics
  return {
    totalUsers: 0,
    totalPosts: 0,
    totalMessages: 0,
    onlineUsers: 0
  };
}

async function getActiveUsers() {
  // Implementation to get active users
  return [];
}

module.exports = {
  RedisCacheStrategy,
  CacheServiceFactory,
  CACHE_KEYS,
  CACHE_TTL,
  CACHE_WARMING_STRATEGIES,
  CACHE_INVALIDATION_STRATEGIES,
  cacheMiddleware
};
