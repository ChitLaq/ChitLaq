/**
 * Rate Limiting Middleware
 * 
 * Comprehensive rate limiting for API endpoints with Redis backend
 * and configurable limits for different operations.
 * 
 * @author ChitLaq Development Team
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { promisify } from 'util';

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
  onLimitReached?: (req: Request, res: Response) => void;
  message?: string;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
}

export interface RateLimitResult {
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

export class RateLimiter {
  private redis: Redis;
  private configs: Map<string, RateLimitConfig>;

  constructor(redisUrl?: string) {
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');
    this.configs = new Map();
    
    this.initializeDefaultConfigs();
  }

  /**
   * Initialize default rate limit configurations
   */
  private initializeDefaultConfigs(): void {
    // Email validation rate limits
    this.configs.set('email_validation', {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 10,
      message: 'Too many email validation requests, please try again later.',
    });

    // Batch validation rate limits
    this.configs.set('batch_validation', {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 5,
      message: 'Too many batch validation requests, please try again later.',
    });

    // Authentication rate limits
    this.configs.set('auth_login', {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5,
      message: 'Too many login attempts, please try again later.',
    });

    this.configs.set('auth_register', {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 3,
      message: 'Too many registration attempts, please try again later.',
    });

    this.configs.set('auth_password_reset', {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 3,
      message: 'Too many password reset requests, please try again later.',
    });

    // API rate limits
    this.configs.set('api_general', {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100,
      message: 'Too many API requests, please try again later.',
    });

    this.configs.set('api_strict', {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 20,
      message: 'Too many requests, please try again later.',
    });

    // Admin rate limits
    this.configs.set('admin', {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 200,
      message: 'Too many admin requests, please try again later.',
    });

    // University management rate limits
    this.configs.set('university_management', {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 10,
      message: 'Too many university management requests, please try again later.',
    });
  }

  /**
   * Create rate limiting middleware
   */
  public createMiddleware(configKey: string, customConfig?: Partial<RateLimitConfig>) {
    const config = { ...this.configs.get(configKey), ...customConfig };
    
    if (!config) {
      throw new Error(`Rate limit configuration not found for key: ${configKey}`);
    }

    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const key = this.generateKey(req, config);
        const result = await this.checkLimit(key, config);

        // Set rate limit headers
        this.setHeaders(res, result, config);

        if (result.remaining < 0) {
          if (config.onLimitReached) {
            config.onLimitReached(req, res);
          }

          return res.status(429).json({
            error: 'Rate limit exceeded',
            message: config.message,
            retryAfter: result.retryAfter,
            limit: result.limit,
            remaining: 0,
            reset: result.reset,
          });
        }

        next();
      } catch (error) {
        console.error('Rate limiting error:', error);
        // Allow request to proceed if rate limiting fails
        next();
      }
    };
  }

  /**
   * Check rate limit for a specific key
   */
  public async checkLimit(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const window = Math.floor(Date.now() / config.windowMs);
    const redisKey = `rate_limit:${key}:${window}`;
    
    const pipeline = this.redis.pipeline();
    pipeline.incr(redisKey);
    pipeline.expire(redisKey, Math.ceil(config.windowMs / 1000));
    
    const results = await pipeline.exec();
    const count = results?.[0]?.[1] as number || 0;

    const remaining = Math.max(0, config.maxRequests - count);
    const reset = (window + 1) * config.windowMs;
    const retryAfter = remaining <= 0 ? Math.ceil((reset - Date.now()) / 1000) : undefined;

    return {
      limit: config.maxRequests,
      remaining,
      reset,
      retryAfter,
    };
  }

  /**
   * Check rate limit for a specific key (simplified version)
   */
  public async checkLimit(key: string, operation: string): Promise<boolean> {
    const config = this.configs.get(operation);
    if (!config) {
      return true; // Allow if no config found
    }

    const result = await this.checkLimit(key, config);
    return result.remaining > 0;
  }

  /**
   * Get current rate limit status
   */
  public async getStatus(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const window = Math.floor(Date.now() / config.windowMs);
    const redisKey = `rate_limit:${key}:${window}`;
    
    const count = await this.redis.get(redisKey);
    const currentCount = parseInt(count || '0');

    const remaining = Math.max(0, config.maxRequests - currentCount);
    const reset = (window + 1) * config.windowMs;
    const retryAfter = remaining <= 0 ? Math.ceil((reset - Date.now()) / 1000) : undefined;

    return {
      limit: config.maxRequests,
      remaining,
      reset,
      retryAfter,
    };
  }

  /**
   * Reset rate limit for a specific key
   */
  public async resetLimit(key: string, config: RateLimitConfig): Promise<void> {
    const window = Math.floor(Date.now() / config.windowMs);
    const redisKey = `rate_limit:${key}:${window}`;
    
    await this.redis.del(redisKey);
  }

  /**
   * Generate rate limit key
   */
  private generateKey(req: Request, config: RateLimitConfig): string {
    if (config.keyGenerator) {
      return config.keyGenerator(req);
    }

    // Default key generation
    const ip = this.getClientIP(req);
    const userAgent = req.get('User-Agent') || 'unknown';
    const userId = (req as any).user?.id || 'anonymous';
    
    return `${ip}:${userId}:${this.hashUserAgent(userAgent)}`;
  }

  /**
   * Get client IP address
   */
  private getClientIP(req: Request): string {
    return (
      req.ip ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      (req.connection as any)?.socket?.remoteAddress ||
      req.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
      req.get('X-Real-IP') ||
      'unknown'
    );
  }

  /**
   * Hash user agent for key generation
   */
  private hashUserAgent(userAgent: string): string {
    let hash = 0;
    for (let i = 0; i < userAgent.length; i++) {
      const char = userAgent.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Set rate limit headers
   */
  private setHeaders(res: Response, result: RateLimitResult, config: RateLimitConfig): void {
    if (config.standardHeaders) {
      res.set({
        'RateLimit-Limit': result.limit.toString(),
        'RateLimit-Remaining': result.remaining.toString(),
        'RateLimit-Reset': new Date(result.reset).toISOString(),
      });

      if (result.retryAfter) {
        res.set('Retry-After', result.retryAfter.toString());
      }
    }

    if (config.legacyHeaders) {
      res.set({
        'X-RateLimit-Limit': result.limit.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': Math.ceil(result.reset / 1000).toString(),
      });

      if (result.retryAfter) {
        res.set('X-Retry-After', result.retryAfter.toString());
      }
    }
  }

  /**
   * Add custom rate limit configuration
   */
  public addConfig(key: string, config: RateLimitConfig): void {
    this.configs.set(key, config);
  }

  /**
   * Get rate limit configuration
   */
  public getConfig(key: string): RateLimitConfig | undefined {
    return this.configs.get(key);
  }

  /**
   * Remove rate limit configuration
   */
  public removeConfig(key: string): boolean {
    return this.configs.delete(key);
  }

  /**
   * Get all rate limit configurations
   */
  public getAllConfigs(): Map<string, RateLimitConfig> {
    return new Map(this.configs);
  }

  /**
   * Clear all rate limits (admin function)
   */
  public async clearAllLimits(): Promise<void> {
    const keys = await this.redis.keys('rate_limit:*');
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  /**
   * Get rate limit statistics
   */
  public async getStatistics(): Promise<{
    totalKeys: number;
    activeWindows: number;
    topKeys: Array<{ key: string; count: number }>;
  }> {
    const keys = await this.redis.keys('rate_limit:*');
    const totalKeys = keys.length;
    
    // Group keys by window
    const windows = new Set();
    keys.forEach(key => {
      const parts = key.split(':');
      if (parts.length >= 3) {
        windows.add(parts.slice(0, -1).join(':'));
      }
    });
    
    const activeWindows = windows.size;

    // Get top keys by count
    const topKeys = await Promise.all(
      keys.slice(0, 10).map(async (key) => {
        const count = await this.redis.get(key);
        return {
          key: key.replace('rate_limit:', ''),
          count: parseInt(count || '0'),
        };
      })
    );

    topKeys.sort((a, b) => b.count - a.count);

    return {
      totalKeys,
      activeWindows,
      topKeys,
    };
  }

  /**
   * Health check for Redis connection
   */
  public async healthCheck(): Promise<boolean> {
    try {
      await this.redis.ping();
      return true;
    } catch (error) {
      console.error('Redis health check failed:', error);
      return false;
    }
  }

  /**
   * Close Redis connection
   */
  public async close(): Promise<void> {
    await this.redis.quit();
  }
}

// Pre-configured middleware instances
export const emailValidationLimiter = new RateLimiter();
export const authLimiter = new RateLimiter();
export const apiLimiter = new RateLimiter();
export const adminLimiter = new RateLimiter();

// Export middleware functions
export const emailValidationRateLimit = emailValidationLimiter.createMiddleware('email_validation');
export const batchValidationRateLimit = emailValidationLimiter.createMiddleware('batch_validation');
export const authLoginRateLimit = authLimiter.createMiddleware('auth_login');
export const authRegisterRateLimit = authLimiter.createMiddleware('auth_register');
export const authPasswordResetRateLimit = authLimiter.createMiddleware('auth_password_reset');
export const apiGeneralRateLimit = apiLimiter.createMiddleware('api_general');
export const apiStrictRateLimit = apiLimiter.createMiddleware('api_strict');
export const adminRateLimit = adminLimiter.createMiddleware('admin');
export const universityManagementRateLimit = adminLimiter.createMiddleware('university_management');

export default RateLimiter;
