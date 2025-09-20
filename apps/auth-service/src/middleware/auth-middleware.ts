import { Request, Response, NextFunction } from 'express';
import { Redis } from 'ioredis';
import { getLogger } from '../../../utils/logger';
import { getJWTManager } from '../auth/jwt-manager';
import { getSessionManager } from '../auth/session-manager';
import { CustomJWTClaims, DeviceInfo } from '../auth/supabase-config';

const logger = getLogger('AuthMiddleware');

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: CustomJWTClaims;
      deviceInfo?: DeviceInfo;
      sessionId?: string;
    }
  }
}

export interface AuthMiddlewareOptions {
  requireAuth?: boolean;
  requireUniversity?: boolean;
  requireVerification?: boolean;
  allowedUserTypes?: Array<'student' | 'faculty' | 'staff'>;
  rateLimit?: {
    windowMs: number;
    max: number;
  };
}

export class AuthMiddleware {
  private redis: Redis;
  private jwtManager: any;
  private sessionManager: any;

  constructor(redis: Redis) {
    this.redis = redis;
    this.jwtManager = getJWTManager(redis);
    this.sessionManager = getSessionManager(redis, this.jwtManager);
  }

  /**
   * Extract and validate JWT token
   */
  public extractToken = (req: Request): string | null => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  };

  /**
   * Extract device information from request
   */
  public extractDeviceInfo = (req: Request): DeviceInfo => {
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const acceptLanguage = req.headers['accept-language'] || 'en';
    const timezone = req.headers['x-timezone'] as string || 'UTC';
    
    // Generate device fingerprint
    const fingerprint = this.generateDeviceFingerprint(req);
    
    return {
      userAgent,
      platform: this.detectPlatform(userAgent),
      language: acceptLanguage.split(',')[0],
      timezone,
      fingerprint,
    };
  };

  /**
   * Generate device fingerprint
   */
  private generateDeviceFingerprint = (req: Request): string => {
    const crypto = require('crypto');
    const components = [
      req.headers['user-agent'] || '',
      req.headers['accept-language'] || '',
      req.headers['accept-encoding'] || '',
      req.ip || '',
      req.headers['x-forwarded-for'] || '',
    ];
    
    const fingerprint = crypto
      .createHash('sha256')
      .update(components.join('|'))
      .digest('hex');
    
    return fingerprint;
  };

  /**
   * Detect platform from user agent
   */
  private detectPlatform = (userAgent: string): string => {
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iOS')) return 'iOS';
    return 'Unknown';
  };

  /**
   * Main authentication middleware
   */
  public authenticate = (options: AuthMiddlewareOptions = {}) => {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const {
          requireAuth = true,
          requireUniversity = true,
          requireVerification = true,
          allowedUserTypes,
          rateLimit,
        } = options;

        // Extract token
        const token = this.extractToken(req);
        if (!token) {
          if (requireAuth) {
            return res.status(401).json({
              error: 'Authentication required',
              code: 'MISSING_TOKEN',
            });
          }
          return next();
        }

        // Verify token
        const claims = this.jwtManager.verifyAccessToken(token);
        if (!claims) {
          return res.status(401).json({
            error: 'Invalid or expired token',
            code: 'INVALID_TOKEN',
          });
        }

        // Check university requirement
        if (requireUniversity && !claims.university_id) {
          return res.status(403).json({
            error: 'University affiliation required',
            code: 'UNIVERSITY_REQUIRED',
          });
        }

        // Check verification requirement
        if (requireVerification && !claims.verified) {
          return res.status(403).json({
            error: 'Email verification required',
            code: 'VERIFICATION_REQUIRED',
          });
        }

        // Check user type restrictions
        if (allowedUserTypes && !allowedUserTypes.includes(claims.user_type)) {
          return res.status(403).json({
            error: 'Insufficient permissions',
            code: 'INSUFFICIENT_PERMISSIONS',
          });
        }

        // Extract device info
        const deviceInfo = this.extractDeviceInfo(req);

        // Check session validity
        const isSessionValid = await this.sessionManager.isSessionValid(
          claims.sub,
          deviceInfo.fingerprint
        );

        if (!isSessionValid) {
          return res.status(401).json({
            error: 'Session expired or invalid',
            code: 'INVALID_SESSION',
          });
        }

        // Update session activity
        await this.sessionManager.updateSessionActivity(
          claims.sub,
          deviceInfo.fingerprint
        );

        // Attach user info to request
        req.user = claims;
        req.deviceInfo = deviceInfo;

        // Rate limiting
        if (rateLimit) {
          const rateLimitKey = `rate_limit:${claims.sub}:${req.route?.path || req.path}`;
          const current = await this.redis.incr(rateLimitKey);
          
          if (current === 1) {
            await this.redis.expire(rateLimitKey, Math.ceil(rateLimit.windowMs / 1000));
          }
          
          if (current > rateLimit.max) {
            return res.status(429).json({
              error: 'Rate limit exceeded',
              code: 'RATE_LIMIT_EXCEEDED',
              retryAfter: Math.ceil(rateLimit.windowMs / 1000),
            });
          }
        }

        next();
      } catch (error) {
        logger.error(`Authentication middleware error: ${error}`);
        return res.status(500).json({
          error: 'Internal server error',
          code: 'INTERNAL_ERROR',
        });
      }
    };
  };

  /**
   * Optional authentication middleware
   */
  public optionalAuth = () => {
    return this.authenticate({ requireAuth: false });
  };

  /**
   * University-only authentication
   */
  public universityAuth = (allowedUserTypes?: Array<'student' | 'faculty' | 'staff'>) => {
    return this.authenticate({
      requireAuth: true,
      requireUniversity: true,
      requireVerification: true,
      allowedUserTypes,
    });
  };

  /**
   * Faculty/Staff only authentication
   */
  public staffAuth = () => {
    return this.authenticate({
      requireAuth: true,
      requireUniversity: true,
      requireVerification: true,
      allowedUserTypes: ['faculty', 'staff'],
    });
  };

  /**
   * Student-only authentication
   */
  public studentAuth = () => {
    return this.authenticate({
      requireAuth: true,
      requireUniversity: true,
      requireVerification: true,
      allowedUserTypes: ['student'],
    });
  };

  /**
   * Rate limiting middleware
   */
  public rateLimit = (windowMs: number, max: number) => {
    return async (req: Request, res: Response, next: NextFunction) => {
      const key = `rate_limit:${req.ip}:${req.route?.path || req.path}`;
      const current = await this.redis.incr(key);
      
      if (current === 1) {
        await this.redis.expire(key, Math.ceil(windowMs / 1000));
      }
      
      if (current > max) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil(windowMs / 1000),
        });
      }
      
      next();
    };
  };

  /**
   * IP-based rate limiting
   */
  public ipRateLimit = (windowMs: number, max: number) => {
    return async (req: Request, res: Response, next: NextFunction) => {
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      const key = `ip_rate_limit:${ip}`;
      const current = await this.redis.incr(key);
      
      if (current === 1) {
        await this.redis.expire(key, Math.ceil(windowMs / 1000));
      }
      
      if (current > max) {
        return res.status(429).json({
          error: 'IP rate limit exceeded',
          code: 'IP_RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil(windowMs / 1000),
        });
      }
      
      next();
    };
  };

  /**
   * Login attempt monitoring
   */
  public loginAttemptMonitor = () => {
    return async (req: Request, res: Response, next: NextFunction) => {
      const email = req.body.email;
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      
      if (email) {
        const isRateLimited = await this.sessionManager.isRateLimited(email, ipAddress);
        
        if (isRateLimited) {
          return res.status(429).json({
            error: 'Too many login attempts. Please try again later.',
            code: 'LOGIN_RATE_LIMITED',
            retryAfter: 3600, // 1 hour
          });
        }
      }
      
      next();
    };
  };

  /**
   * Security headers middleware
   */
  public securityHeaders = () => {
    return (req: Request, res: Response, next: NextFunction) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      res.setHeader('Content-Security-Policy', "default-src 'self'");
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      
      next();
    };
  };
}

// Export singleton instance
let authMiddleware: AuthMiddleware | null = null;

export const getAuthMiddleware = (redis: Redis): AuthMiddleware => {
  if (!authMiddleware) {
    authMiddleware = new AuthMiddleware(redis);
  }
  return authMiddleware;
};

export default AuthMiddleware;
