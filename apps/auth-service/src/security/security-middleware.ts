import { Request, Response, NextFunction } from 'express';
import { getLogger } from '../../../utils/logger';
import { SupabaseClient } from '@supabase/supabase-js';
import { AuditLogger, AuditEventType, AuditSeverity } from './audit-logger';
import { ThreatDetectionService, ThreatType, ThreatSeverity } from './threat-detection';
import { ComplianceManager } from './compliance-manager';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import helmet from 'helmet';
import cors from 'cors';

const logger = getLogger('SecurityMiddleware');

export interface SecurityConfig {
  enableThreatDetection: boolean;
  enableComplianceMonitoring: boolean;
  enableRateLimiting: boolean;
  enableSlowDown: boolean;
  enableHelmet: boolean;
  enableCORS: boolean;
  maxRequestsPerWindow: number;
  windowMs: number;
  slowDownDelay: number;
  trustedProxies: string[];
  allowedOrigins: string[];
  allowedMethods: string[];
  allowedHeaders: string[];
}

export interface SecurityContext {
  userId?: string;
  ipAddress: string;
  userAgent: string;
  requestId: string;
  timestamp: string;
  threats: any[];
  complianceChecks: any[];
  riskScore: number;
  isBlocked: boolean;
  blockReason?: string;
}

export class SecurityMiddleware {
  private supabase: SupabaseClient;
  private auditLogger: AuditLogger;
  private threatDetection: ThreatDetectionService;
  private complianceManager: ComplianceManager;
  private config: SecurityConfig;
  private blockedIPs: Set<string> = new Set();
  private blockedUsers: Set<string> = new Set();
  private suspiciousIPs: Map<string, { count: number; lastSeen: number }> = new Map();

  constructor(
    supabase: SupabaseClient,
    auditLogger: AuditLogger,
    threatDetection: ThreatDetectionService,
    complianceManager: ComplianceManager
  ) {
    this.supabase = supabase;
    this.auditLogger = auditLogger;
    this.threatDetection = threatDetection;
    this.complianceManager = complianceManager;
    this.config = this.loadDefaultConfig();
    this.initializeSecurity();
  }

  /**
   * Main security middleware
   */
  public securityMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const securityContext = await this.analyzeRequest(req);
      
      // Attach security context to request
      (req as any).securityContext = securityContext;

      // Check if request should be blocked
      if (securityContext.isBlocked) {
        await this.handleBlockedRequest(req, res, securityContext);
        return;
      }

      // Log security analysis
      await this.logSecurityAnalysis(req, securityContext);

      // Continue to next middleware
      next();
    } catch (error) {
      logger.error('Error in security middleware:', error);
      
      // Log security error
      await this.auditLogger.logSecurityEvent(
        AuditEventType.SECURITY_ERROR,
        'Security middleware error',
        {
          error: error.message,
          stack: error.stack,
          url: req.url,
          method: req.method,
        },
        {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent') || 'unknown',
          severity: AuditSeverity.HIGH,
        }
      );

      // Continue with request but log the error
      next();
    }
  };

  /**
   * Analyze request for security threats
   */
  private async analyzeRequest(req: Request): Promise<SecurityContext> {
    const requestId = crypto.randomUUID();
    const ipAddress = this.getClientIP(req);
    const userAgent = req.get('User-Agent') || 'unknown';
    const userId = (req as any).user?.id;

    const securityContext: SecurityContext = {
      userId,
      ipAddress,
      userAgent,
      requestId,
      timestamp: new Date().toISOString(),
      threats: [],
      complianceChecks: [],
      riskScore: 0,
      isBlocked: false,
    };

    try {
      // Check if IP is blocked
      if (this.blockedIPs.has(ipAddress)) {
        securityContext.isBlocked = true;
        securityContext.blockReason = 'IP address is blocked';
        securityContext.riskScore = 100;
        return securityContext;
      }

      // Check if user is blocked
      if (userId && this.blockedUsers.has(userId)) {
        securityContext.isBlocked = true;
        securityContext.blockReason = 'User account is blocked';
        securityContext.riskScore = 100;
        return securityContext;
      }

      // Analyze request for threats
      if (this.config.enableThreatDetection) {
        const threats = await this.threatDetection.analyzeRequest(
          userId || 'anonymous',
          ipAddress,
          userAgent,
          {
            method: req.method,
            url: req.url,
            headers: req.headers as Record<string, string>,
            body: req.body,
          }
        );

        securityContext.threats = threats;
        securityContext.riskScore = this.calculateRiskScore(threats);

        // Check if threats require blocking
        if (this.shouldBlockRequest(threats)) {
          securityContext.isBlocked = true;
          securityContext.blockReason = 'Security threat detected';
        }
      }

      // Run compliance checks if enabled
      if (this.config.enableComplianceMonitoring && userId) {
        // This would run relevant compliance checks
        // For now, we'll just log that compliance monitoring is active
        securityContext.complianceChecks = [];
      }

      // Update suspicious IP tracking
      this.updateSuspiciousIPTracking(ipAddress, securityContext.riskScore);

      return securityContext;
    } catch (error) {
      logger.error('Error analyzing request:', error);
      securityContext.riskScore = 50; // Default risk score on error
      return securityContext;
    }
  }

  /**
   * Handle blocked request
   */
  private async handleBlockedRequest(
    req: Request,
    res: Response,
    securityContext: SecurityContext
  ): Promise<void> {
    try {
      // Log blocked request
      await this.auditLogger.logSecurityEvent(
        AuditEventType.REQUEST_BLOCKED,
        `Request blocked: ${securityContext.blockReason}`,
        {
          requestId: securityContext.requestId,
          userId: securityContext.userId,
          ipAddress: securityContext.ipAddress,
          userAgent: securityContext.userAgent,
          url: req.url,
          method: req.method,
          blockReason: securityContext.blockReason,
          riskScore: securityContext.riskScore,
          threats: securityContext.threats,
        },
        {
          userId: securityContext.userId,
          ipAddress: securityContext.ipAddress,
          userAgent: securityContext.userAgent,
          severity: AuditSeverity.HIGH,
          riskScore: securityContext.riskScore,
        }
      );

      // Send blocked response
      res.status(403).json({
        error: 'Request blocked',
        reason: securityContext.blockReason,
        requestId: securityContext.requestId,
        timestamp: securityContext.timestamp,
      });

      logger.warn(`Request blocked: ${securityContext.blockReason} - ${req.method} ${req.url} from ${securityContext.ipAddress}`);
    } catch (error) {
      logger.error('Error handling blocked request:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Log security analysis
   */
  private async logSecurityAnalysis(
    req: Request,
    securityContext: SecurityContext
  ): Promise<void> {
    try {
      // Only log if there are threats or high risk score
      if (securityContext.threats.length > 0 || securityContext.riskScore > 30) {
        await this.auditLogger.logSecurityEvent(
          AuditEventType.SECURITY_ANALYSIS,
          'Security analysis completed',
          {
            requestId: securityContext.requestId,
            userId: securityContext.userId,
            ipAddress: securityContext.ipAddress,
            userAgent: securityContext.userAgent,
            url: req.url,
            method: req.method,
            riskScore: securityContext.riskScore,
            threatsCount: securityContext.threats.length,
            threats: securityContext.threats,
          },
          {
            userId: securityContext.userId,
            ipAddress: securityContext.ipAddress,
            userAgent: securityContext.userAgent,
            severity: this.mapRiskScoreToAuditSeverity(securityContext.riskScore),
            riskScore: securityContext.riskScore,
          }
        );
      }
    } catch (error) {
      logger.error('Error logging security analysis:', error);
    }
  }

  /**
   * Calculate risk score from threats
   */
  private calculateRiskScore(threats: any[]): number {
    if (threats.length === 0) return 0;

    let totalRisk = 0;
    for (const threat of threats) {
      switch (threat.severity) {
        case ThreatSeverity.LOW:
          totalRisk += 10;
          break;
        case ThreatSeverity.MEDIUM:
          totalRisk += 30;
          break;
        case ThreatSeverity.HIGH:
          totalRisk += 60;
          break;
        case ThreatSeverity.CRITICAL:
          totalRisk += 90;
          break;
      }
    }

    return Math.min(100, totalRisk);
  }

  /**
   * Determine if request should be blocked
   */
  private shouldBlockRequest(threats: any[]): boolean {
    // Block if any critical threats
    const criticalThreats = threats.filter(threat => threat.severity === ThreatSeverity.CRITICAL);
    if (criticalThreats.length > 0) {
      return true;
    }

    // Block if multiple high-severity threats
    const highThreats = threats.filter(threat => threat.severity === ThreatSeverity.HIGH);
    if (highThreats.length >= 2) {
      return true;
    }

    // Block if risk score is too high
    const riskScore = this.calculateRiskScore(threats);
    if (riskScore >= 80) {
      return true;
    }

    return false;
  }

  /**
   * Update suspicious IP tracking
   */
  private updateSuspiciousIPTracking(ipAddress: string, riskScore: number): void {
    if (riskScore > 50) {
      const existing = this.suspiciousIPs.get(ipAddress);
      if (existing) {
        existing.count++;
        existing.lastSeen = Date.now();
      } else {
        this.suspiciousIPs.set(ipAddress, {
          count: 1,
          lastSeen: Date.now(),
        });
      }

      // Block IP if it's been suspicious too many times
      const suspicious = this.suspiciousIPs.get(ipAddress);
      if (suspicious && suspicious.count >= 5) {
        this.blockedIPs.add(ipAddress);
        logger.warn(`IP ${ipAddress} blocked due to repeated suspicious activity`);
      }
    }
  }

  /**
   * Get client IP address
   */
  private getClientIP(req: Request): string {
    const forwarded = req.get('X-Forwarded-For');
    const realIP = req.get('X-Real-IP');
    const remoteAddress = req.connection.remoteAddress;

    if (forwarded) {
      return forwarded.split(',')[0].trim();
    } else if (realIP) {
      return realIP;
    } else if (remoteAddress) {
      return remoteAddress;
    } else {
      return 'unknown';
    }
  }

  /**
   * Map risk score to audit severity
   */
  private mapRiskScoreToAuditSeverity(riskScore: number): AuditSeverity {
    if (riskScore >= 80) {
      return AuditSeverity.CRITICAL;
    } else if (riskScore >= 60) {
      return AuditSeverity.HIGH;
    } else if (riskScore >= 30) {
      return AuditSeverity.MEDIUM;
    } else {
      return AuditSeverity.LOW;
    }
  }

  /**
   * Initialize security components
   */
  private initializeSecurity(): void {
    // Clean up old suspicious IPs every hour
    setInterval(() => {
      const now = Date.now();
      const oneHourAgo = now - (60 * 60 * 1000);
      
      for (const [ip, data] of this.suspiciousIPs.entries()) {
        if (data.lastSeen < oneHourAgo) {
          this.suspiciousIPs.delete(ip);
        }
      }
    }, 60 * 60 * 1000);

    // Clean up blocked IPs every 24 hours
    setInterval(() => {
      this.blockedIPs.clear();
      logger.info('Blocked IPs list cleared');
    }, 24 * 60 * 60 * 1000);
  }

  /**
   * Load default configuration
   */
  private loadDefaultConfig(): SecurityConfig {
    return {
      enableThreatDetection: process.env.ENABLE_THREAT_DETECTION === 'true',
      enableComplianceMonitoring: process.env.ENABLE_COMPLIANCE_MONITORING === 'true',
      enableRateLimiting: process.env.ENABLE_RATE_LIMITING === 'true',
      enableSlowDown: process.env.ENABLE_SLOW_DOWN === 'true',
      enableHelmet: process.env.ENABLE_HELMET === 'true',
      enableCORS: process.env.ENABLE_CORS === 'true',
      maxRequestsPerWindow: parseInt(process.env.MAX_REQUESTS_PER_WINDOW || '100', 10),
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
      slowDownDelay: parseInt(process.env.SLOW_DOWN_DELAY || '500', 10),
      trustedProxies: (process.env.TRUSTED_PROXIES || '').split(',').filter(Boolean),
      allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(','),
      allowedMethods: (process.env.ALLOWED_METHODS || 'GET,POST,PUT,DELETE,OPTIONS').split(','),
      allowedHeaders: (process.env.ALLOWED_HEADERS || 'Content-Type,Authorization,X-Requested-With').split(','),
    };
  }

  /**
   * Get rate limiting middleware
   */
  public getRateLimitMiddleware() {
    if (!this.config.enableRateLimiting) {
      return (req: Request, res: Response, next: NextFunction) => next();
    }

    return rateLimit({
      windowMs: this.config.windowMs,
      max: this.config.maxRequestsPerWindow,
      message: {
        error: 'Too many requests',
        retryAfter: Math.ceil(this.config.windowMs / 1000),
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: async (req: Request, res: Response) => {
        // Log rate limit violation
        await this.auditLogger.logSecurityEvent(
          AuditEventType.RATE_LIMIT_EXCEEDED,
          'Rate limit exceeded',
          {
            ipAddress: this.getClientIP(req),
            userAgent: req.get('User-Agent') || 'unknown',
            url: req.url,
            method: req.method,
            limit: this.config.maxRequestsPerWindow,
            windowMs: this.config.windowMs,
          },
          {
            ipAddress: this.getClientIP(req),
            userAgent: req.get('User-Agent') || 'unknown',
            severity: AuditSeverity.MEDIUM,
          }
        );

        res.status(429).json({
          error: 'Too many requests',
          retryAfter: Math.ceil(this.config.windowMs / 1000),
        });
      },
    });
  }

  /**
   * Get slow down middleware
   */
  public getSlowDownMiddleware() {
    if (!this.config.enableSlowDown) {
      return (req: Request, res: Response, next: NextFunction) => next();
    }

    return slowDown({
      windowMs: this.config.windowMs,
      delayAfter: Math.floor(this.config.maxRequestsPerWindow * 0.8),
      delayMs: this.config.slowDownDelay,
      maxDelayMs: 20000,
      skipSuccessfulRequests: true,
      skipFailedRequests: false,
    });
  }

  /**
   * Get helmet middleware
   */
  public getHelmetMiddleware() {
    if (!this.config.enableHelmet) {
      return (req: Request, res: Response, next: NextFunction) => next();
    }

    return helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      noSniff: true,
      xssFilter: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    });
  }

  /**
   * Get CORS middleware
   */
  public getCORSMiddleware() {
    if (!this.config.enableCORS) {
      return (req: Request, res: Response, next: NextFunction) => next();
    }

    return cors({
      origin: (origin, callback) => {
        if (!origin || this.config.allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      methods: this.config.allowedMethods,
      allowedHeaders: this.config.allowedHeaders,
      credentials: true,
      maxAge: 86400, // 24 hours
    });
  }

  /**
   * Block IP address
   */
  public blockIP(ipAddress: string, reason: string): void {
    this.blockedIPs.add(ipAddress);
    logger.warn(`IP ${ipAddress} blocked: ${reason}`);
  }

  /**
   * Unblock IP address
   */
  public unblockIP(ipAddress: string): void {
    this.blockedIPs.delete(ipAddress);
    logger.info(`IP ${ipAddress} unblocked`);
  }

  /**
   * Block user
   */
  public blockUser(userId: string, reason: string): void {
    this.blockedUsers.add(userId);
    logger.warn(`User ${userId} blocked: ${reason}`);
  }

  /**
   * Unblock user
   */
  public unblockUser(userId: string): void {
    this.blockedUsers.delete(userId);
    logger.info(`User ${userId} unblocked`);
  }

  /**
   * Get security statistics
   */
  public getSecurityStats(): {
    blockedIPs: number;
    blockedUsers: number;
    suspiciousIPs: number;
    activeThreats: number;
  } {
    return {
      blockedIPs: this.blockedIPs.size,
      blockedUsers: this.blockedUsers.size,
      suspiciousIPs: this.suspiciousIPs.size,
      activeThreats: this.threatDetection.getActiveThreats().length,
    };
  }
}

// Export singleton instance
let securityMiddlewareInstance: SecurityMiddleware | null = null;

export const getSecurityMiddleware = (
  supabase: SupabaseClient,
  auditLogger: AuditLogger,
  threatDetection: ThreatDetectionService,
  complianceManager: ComplianceManager
): SecurityMiddleware => {
  if (!securityMiddlewareInstance) {
    securityMiddlewareInstance = new SecurityMiddleware(
      supabase,
      auditLogger,
      threatDetection,
      complianceManager
    );
  }
  return securityMiddlewareInstance;
};
