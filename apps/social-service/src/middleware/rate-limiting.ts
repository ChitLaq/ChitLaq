// Rate Limiting Middleware
// Author: ChitLaq Development Team
// Date: 2024-01-15

import Redis from 'ioredis';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { metrics } from '../utils/metrics';

export interface RateLimitConfig {
    windowMs: number;
    maxRequests: number;
    keyGenerator?: (req: Request) => string;
    skipSuccessfulRequests?: boolean;
    skipFailedRequests?: boolean;
    message?: string;
    standardHeaders?: boolean;
    legacyHeaders?: boolean;
}

export interface RateLimitInfo {
    limit: number;
    current: number;
    remaining: number;
    resetTime: Date;
    retryAfter?: number;
}

export class RateLimiter {
    private redis: Redis;
    private config: {
        redis: {
            host: string;
            port: number;
            password?: string;
            db: number;
        };
        defaultLimits: Record<string, RateLimitConfig>;
    };

    constructor() {
        this.config = {
            redis: {
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT || '6379'),
                password: process.env.REDIS_PASSWORD,
                db: parseInt(process.env.REDIS_DB || '0')
            },
            defaultLimits: {
                // Social actions
                follow: { windowMs: 3600000, maxRequests: 100 }, // 100 follows per hour
                unfollow: { windowMs: 3600000, maxRequests: 200 }, // 200 unfollows per hour
                block: { windowMs: 3600000, maxRequests: 50 }, // 50 blocks per hour
                unblock: { windowMs: 3600000, maxRequests: 100 }, // 100 unblocks per hour
                mute: { windowMs: 3600000, maxRequests: 200 }, // 200 mutes per hour
                unmute: { windowMs: 3600000, maxRequests: 200 }, // 200 unmutes per hour
                report: { windowMs: 3600000, maxRequests: 10 }, // 10 reports per hour
                
                // Batch operations
                batch_social: { windowMs: 3600000, maxRequests: 5 }, // 5 batch operations per hour
                
                // API endpoints
                activity_feed: { windowMs: 3600000, maxRequests: 1000 }, // 1000 requests per hour
                relationships: { windowMs: 3600000, maxRequests: 500 }, // 500 requests per hour
                statistics: { windowMs: 3600000, maxRequests: 100 }, // 100 requests per hour
                
                // General API
                api: { windowMs: 900000, maxRequests: 100 }, // 100 requests per 15 minutes
                
                // Authentication
                login: { windowMs: 900000, maxRequests: 5 }, // 5 login attempts per 15 minutes
                register: { windowMs: 3600000, maxRequests: 3 }, // 3 registrations per hour
                password_reset: { windowMs: 3600000, maxRequests: 3 }, // 3 password resets per hour
                
                // Content operations
                post_create: { windowMs: 3600000, maxRequests: 50 }, // 50 posts per hour
                comment_create: { windowMs: 3600000, maxRequests: 200 }, // 200 comments per hour
                like_action: { windowMs: 3600000, maxRequests: 500 }, // 500 likes per hour
                
                // Search operations
                search: { windowMs: 60000, maxRequests: 30 }, // 30 searches per minute
                
                // File uploads
                file_upload: { windowMs: 3600000, maxRequests: 20 }, // 20 uploads per hour
                
                // Messaging
                message_send: { windowMs: 60000, maxRequests: 60 }, // 60 messages per minute
                
                // Admin operations
                admin_action: { windowMs: 3600000, maxRequests: 1000 }, // 1000 admin actions per hour
            }
        };

        this.redis = new Redis(this.config.redis);
    }

    /**
     * Check rate limit for a specific action
     */
    async checkLimit(
        identifier: string, 
        action: string, 
        maxRequests?: number, 
        windowMs?: number
    ): Promise<RateLimitInfo> {
        const config = this.getConfig(action, maxRequests, windowMs);
        const key = this.generateKey(identifier, action);
        
        try {
            const current = await this.getCurrentCount(key, config.windowMs);
            const limit = config.maxRequests;
            const remaining = Math.max(0, limit - current);
            const resetTime = new Date(Date.now() + config.windowMs);
            
            const rateLimitInfo: RateLimitInfo = {
                limit,
                current,
                remaining,
                resetTime
            };

            if (current >= limit) {
                rateLimitInfo.retryAfter = Math.ceil(config.windowMs / 1000);
                
                // Update metrics
                metrics.incrementCounter('rate_limit_exceeded_total', {
                    action,
                    identifier: this.hashIdentifier(identifier)
                });
                
                logger.warn('Rate limit exceeded', {
                    identifier: this.hashIdentifier(identifier),
                    action,
                    current,
                    limit,
                    windowMs: config.windowMs
                });
                
                throw new RateLimitError('Rate limit exceeded', rateLimitInfo);
            }

            // Increment counter
            await this.incrementCounter(key, config.windowMs);
            
            // Update metrics
            metrics.incrementCounter('rate_limit_requests_total', {
                action,
                identifier: this.hashIdentifier(identifier)
            });

            return rateLimitInfo;

        } catch (error) {
            if (error instanceof RateLimitError) {
                throw error;
            }
            
            logger.error('Rate limit check error', {
                identifier: this.hashIdentifier(identifier),
                action,
                error: error.message
            });
            
            // On error, allow the request but log the issue
            return {
                limit: config.maxRequests,
                current: 0,
                remaining: config.maxRequests,
                resetTime: new Date(Date.now() + config.windowMs)
            };
        }
    }

    /**
     * Middleware factory for Express
     */
    createMiddleware(config: RateLimitConfig) {
        return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
            try {
                const identifier = config.keyGenerator ? 
                    config.keyGenerator(req) : 
                    this.getDefaultIdentifier(req);
                
                const rateLimitInfo = await this.checkLimit(
                    identifier,
                    'api',
                    config.maxRequests,
                    config.windowMs
                );

                // Set rate limit headers
                if (config.standardHeaders) {
                    res.set({
                        'RateLimit-Limit': rateLimitInfo.limit.toString(),
                        'RateLimit-Remaining': rateLimitInfo.remaining.toString(),
                        'RateLimit-Reset': Math.ceil(rateLimitInfo.resetTime.getTime() / 1000).toString()
                    });
                }

                if (config.legacyHeaders) {
                    res.set({
                        'X-RateLimit-Limit': rateLimitInfo.limit.toString(),
                        'X-RateLimit-Remaining': rateLimitInfo.remaining.toString(),
                        'X-RateLimit-Reset': Math.ceil(rateLimitInfo.resetTime.getTime() / 1000).toString()
                    });
                }

                next();

            } catch (error) {
                if (error instanceof RateLimitError) {
                    const retryAfter = error.rateLimitInfo.retryAfter;
                    
                    res.status(429).set({
                        'Retry-After': retryAfter?.toString() || '60',
                        'X-RateLimit-Limit': error.rateLimitInfo.limit.toString(),
                        'X-RateLimit-Remaining': error.rateLimitInfo.remaining.toString(),
                        'X-RateLimit-Reset': Math.ceil(error.rateLimitInfo.resetTime.getTime() / 1000).toString()
                    }).json({
                        success: false,
                        error: config.message || 'Too many requests',
                        retryAfter,
                        rateLimitInfo: error.rateLimitInfo
                    });
                } else {
                    next(error);
                }
            }
        };
    }

    /**
     * Get current count for a key
     */
    private async getCurrentCount(key: string, windowMs: number): Promise<number> {
        const now = Date.now();
        const windowStart = now - windowMs;
        
        // Use Redis sorted set to track requests with timestamps
        const pipeline = this.redis.pipeline();
        
        // Remove expired entries
        pipeline.zremrangebyscore(key, 0, windowStart);
        
        // Count current entries
        pipeline.zcard(key);
        
        const results = await pipeline.exec();
        return results?.[1]?.[1] as number || 0;
    }

    /**
     * Increment counter for a key
     */
    private async incrementCounter(key: string, windowMs: number): Promise<void> {
        const now = Date.now();
        const pipeline = this.redis.pipeline();
        
        // Add current request
        pipeline.zadd(key, now, `${now}-${Math.random()}`);
        
        // Set expiration
        pipeline.expire(key, Math.ceil(windowMs / 1000));
        
        await pipeline.exec();
    }

    /**
     * Generate Redis key for rate limiting
     */
    private generateKey(identifier: string, action: string): string {
        return `rate_limit:${action}:${this.hashIdentifier(identifier)}`;
    }

    /**
     * Hash identifier for privacy
     */
    private hashIdentifier(identifier: string): string {
        // Simple hash for privacy - in production, use proper hashing
        return Buffer.from(identifier).toString('base64').slice(0, 16);
    }

    /**
     * Get default identifier from request
     */
    private getDefaultIdentifier(req: Request): string {
        // Try to get user ID from authenticated request
        if (req.user && req.user.id) {
            return `user:${req.user.id}`;
        }
        
        // Fall back to IP address
        const ip = req.ip || 
                  req.connection.remoteAddress || 
                  req.socket.remoteAddress ||
                  (req.connection as any)?.socket?.remoteAddress ||
                  'unknown';
        
        return `ip:${ip}`;
    }

    /**
     * Get configuration for action
     */
    private getConfig(action: string, maxRequests?: number, windowMs?: number): RateLimitConfig {
        const defaultConfig = this.config.defaultLimits[action] || this.config.defaultLimits.api;
        
        return {
            windowMs: windowMs || defaultConfig.windowMs,
            maxRequests: maxRequests || defaultConfig.maxRequests,
            keyGenerator: defaultConfig.keyGenerator,
            skipSuccessfulRequests: defaultConfig.skipSuccessfulRequests,
            skipFailedRequests: defaultConfig.skipFailedRequests,
            message: defaultConfig.message,
            standardHeaders: defaultConfig.standardHeaders,
            legacyHeaders: defaultConfig.legacyHeaders
        };
    }

    /**
     * Reset rate limit for identifier and action
     */
    async resetLimit(identifier: string, action: string): Promise<void> {
        const key = this.generateKey(identifier, action);
        await this.redis.del(key);
        
        logger.info('Rate limit reset', {
            identifier: this.hashIdentifier(identifier),
            action
        });
    }

    /**
     * Get rate limit status for identifier and action
     */
    async getLimitStatus(identifier: string, action: string): Promise<RateLimitInfo | null> {
        const config = this.getConfig(action);
        const key = this.generateKey(identifier, action);
        
        try {
            const current = await this.getCurrentCount(key, config.windowMs);
            const limit = config.maxRequests;
            const remaining = Math.max(0, limit - current);
            const resetTime = new Date(Date.now() + config.windowMs);
            
            return {
                limit,
                current,
                remaining,
                resetTime
            };
        } catch (error) {
            logger.error('Error getting rate limit status', {
                identifier: this.hashIdentifier(identifier),
                action,
                error: error.message
            });
            return null;
        }
    }

    /**
     * Check if identifier is rate limited
     */
    async isRateLimited(identifier: string, action: string): Promise<boolean> {
        try {
            await this.checkLimit(identifier, action);
            return false;
        } catch (error) {
            return error instanceof RateLimitError;
        }
    }

    /**
     * Get rate limit statistics
     */
    async getStatistics(): Promise<Record<string, any>> {
        try {
            const keys = await this.redis.keys('rate_limit:*');
            const stats: Record<string, any> = {
                totalKeys: keys.length,
                actions: {}
            };

            for (const key of keys) {
                const parts = key.split(':');
                if (parts.length >= 3) {
                    const action = parts[1];
                    const count = await this.redis.zcard(key);
                    
                    if (!stats.actions[action]) {
                        stats.actions[action] = {
                            totalKeys: 0,
                            totalRequests: 0
                        };
                    }
                    
                    stats.actions[action].totalKeys++;
                    stats.actions[action].totalRequests += count;
                }
            }

            return stats;
        } catch (error) {
            logger.error('Error getting rate limit statistics', {
                error: error.message
            });
            return {};
        }
    }

    /**
     * Cleanup expired rate limit entries
     */
    async cleanup(): Promise<void> {
        try {
            const keys = await this.redis.keys('rate_limit:*');
            const now = Date.now();
            const pipeline = this.redis.pipeline();
            
            for (const key of keys) {
                // Remove entries older than 24 hours
                pipeline.zremrangebyscore(key, 0, now - 24 * 60 * 60 * 1000);
            }
            
            await pipeline.exec();
            
            logger.info('Rate limit cleanup completed', {
                keysProcessed: keys.length
            });
        } catch (error) {
            logger.error('Error during rate limit cleanup', {
                error: error.message
            });
        }
    }

    /**
     * Close Redis connection
     */
    async close(): Promise<void> {
        await this.redis.quit();
    }
}

/**
 * Rate limit error class
 */
export class RateLimitError extends Error {
    public rateLimitInfo: RateLimitInfo;

    constructor(message: string, rateLimitInfo: RateLimitInfo) {
        super(message);
        this.name = 'RateLimitError';
        this.rateLimitInfo = rateLimitInfo;
    }
}

/**
 * Predefined middleware for common use cases
 */
export const rateLimitMiddleware = {
    // Social actions
    follow: new RateLimiter().createMiddleware({
        windowMs: 3600000, // 1 hour
        maxRequests: 100,
        message: 'Too many follow requests. Please try again later.',
        standardHeaders: true,
        legacyHeaders: true
    }),

    unfollow: new RateLimiter().createMiddleware({
        windowMs: 3600000, // 1 hour
        maxRequests: 200,
        message: 'Too many unfollow requests. Please try again later.',
        standardHeaders: true,
        legacyHeaders: true
    }),

    block: new RateLimiter().createMiddleware({
        windowMs: 3600000, // 1 hour
        maxRequests: 50,
        message: 'Too many block requests. Please try again later.',
        standardHeaders: true,
        legacyHeaders: true
    }),

    report: new RateLimiter().createMiddleware({
        windowMs: 3600000, // 1 hour
        maxRequests: 10,
        message: 'Too many report requests. Please try again later.',
        standardHeaders: true,
        legacyHeaders: true
    }),

    // API endpoints
    api: new RateLimiter().createMiddleware({
        windowMs: 900000, // 15 minutes
        maxRequests: 100,
        message: 'Too many API requests. Please try again later.',
        standardHeaders: true,
        legacyHeaders: true
    }),

    // Authentication
    auth: new RateLimiter().createMiddleware({
        windowMs: 900000, // 15 minutes
        maxRequests: 5,
        message: 'Too many authentication attempts. Please try again later.',
        standardHeaders: true,
        legacyHeaders: true
    }),

    // Search
    search: new RateLimiter().createMiddleware({
        windowMs: 60000, // 1 minute
        maxRequests: 30,
        message: 'Too many search requests. Please try again later.',
        standardHeaders: true,
        legacyHeaders: true
    }),

    // File upload
    upload: new RateLimiter().createMiddleware({
        windowMs: 3600000, // 1 hour
        maxRequests: 20,
        message: 'Too many file uploads. Please try again later.',
        standardHeaders: true,
        legacyHeaders: true
    })
};

/**
 * Custom key generators
 */
export const keyGenerators = {
    byUser: (req: Request) => {
        return req.user?.id ? `user:${req.user.id}` : `ip:${req.ip}`;
    },

    byIP: (req: Request) => {
        return `ip:${req.ip}`;
    },

    byUserAndAction: (action: string) => (req: Request) => {
        return req.user?.id ? `user:${req.user.id}:${action}` : `ip:${req.ip}:${action}`;
    },

    byUniversity: (req: Request) => {
        return req.user?.university_id ? `university:${req.user.university_id}` : `ip:${req.ip}`;
    }
};
