import { Request, Response, NextFunction } from 'express';
import { getLogger } from '../../../utils/logger';
import { SupabaseClient } from '@supabase/supabase-js';
import { getSecurityModule } from '../security';
import { AuditEventType, AuditSeverity } from '../security/audit-logger';

const logger = getLogger('SecurityIntegration');

export interface SecurityIntegrationConfig {
  enableThreatDetection: boolean;
  enableComplianceMonitoring: boolean;
  enableAuditLogging: boolean;
  enableSecurityMiddleware: boolean;
  enableRateLimiting: boolean;
  enableSlowDown: boolean;
  enableHelmet: boolean;
  enableCORS: boolean;
  trustedProxies: string[];
  allowedOrigins: string[];
  allowedMethods: string[];
  allowedHeaders: string[];
  maxRequestsPerWindow: number;
  windowMs: number;
  slowDownDelay: number;
}

export class SecurityIntegration {
  private supabase: SupabaseClient;
  private securityModule: any;
  private config: SecurityIntegrationConfig;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.securityModule = getSecurityModule(supabase);
    this.config = this.loadDefaultConfig();
  }

  /**
   * Initialize security integration
   */
  public async initialize(): Promise<void> {
    try {
      await this.securityModule.initialize();
      logger.info('Security integration initialized successfully');
    } catch (error) {
      logger.error('Error initializing security integration:', error);
      throw error;
    }
  }

  /**
   * Get security middleware stack
   */
  public getSecurityMiddlewareStack(): Array<(req: Request, res: Response, next: NextFunction) => void> {
    const middlewareStack: Array<(req: Request, res: Response, next: NextFunction) => void> = [];

    // Add helmet middleware for security headers
    if (this.config.enableHelmet) {
      middlewareStack.push(this.securityModule.getSecurityMiddleware().getHelmetMiddleware());
    }

    // Add CORS middleware
    if (this.config.enableCORS) {
      middlewareStack.push(this.securityModule.getSecurityMiddleware().getCORSMiddleware());
    }

    // Add rate limiting middleware
    if (this.config.enableRateLimiting) {
      middlewareStack.push(this.securityModule.getSecurityMiddleware().getRateLimitMiddleware());
    }

    // Add slow down middleware
    if (this.config.enableSlowDown) {
      middlewareStack.push(this.securityModule.getSecurityMiddleware().getSlowDownMiddleware());
    }

    // Add main security middleware
    if (this.config.enableSecurityMiddleware) {
      middlewareStack.push(this.securityModule.getSecurityMiddleware().securityMiddleware);
    }

    return middlewareStack;
  }

  /**
   * Log authentication event
   */
  public async logAuthenticationEvent(
    eventType: AuditEventType,
    userId: string,
    ipAddress: string,
    userAgent: string,
    success: boolean,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      await this.securityModule.getAuditLogger().logSecurityEvent(
        eventType,
        `Authentication ${success ? 'successful' : 'failed'} for user ${userId}`,
        {
          userId,
          ipAddress,
          userAgent,
          success,
          ...metadata,
        },
        {
          userId,
          ipAddress,
          userAgent,
          severity: success ? AuditSeverity.LOW : AuditSeverity.MEDIUM,
        }
      );
    } catch (error) {
      logger.error('Error logging authentication event:', error);
    }
  }

  /**
   * Log authorization event
   */
  public async logAuthorizationEvent(
    eventType: AuditEventType,
    userId: string,
    resource: string,
    action: string,
    allowed: boolean,
    ipAddress: string,
    userAgent: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      await this.securityModule.getAuditLogger().logSecurityEvent(
        eventType,
        `Authorization ${allowed ? 'granted' : 'denied'} for user ${userId} on ${resource}`,
        {
          userId,
          resource,
          action,
          allowed,
          ipAddress,
          userAgent,
          ...metadata,
        },
        {
          userId,
          ipAddress,
          userAgent,
          severity: allowed ? AuditSeverity.LOW : AuditSeverity.MEDIUM,
        }
      );
    } catch (error) {
      logger.error('Error logging authorization event:', error);
    }
  }

  /**
   * Log data access event
   */
  public async logDataAccessEvent(
    eventType: AuditEventType,
    userId: string,
    dataType: string,
    operation: string,
    ipAddress: string,
    userAgent: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      await this.securityModule.getAuditLogger().logSecurityEvent(
        eventType,
        `Data access: ${operation} on ${dataType} by user ${userId}`,
        {
          userId,
          dataType,
          operation,
          ipAddress,
          userAgent,
          ...metadata,
        },
        {
          userId,
          ipAddress,
          userAgent,
          severity: AuditSeverity.LOW,
        }
      );
    } catch (error) {
      logger.error('Error logging data access event:', error);
    }
  }

  /**
   * Log system event
   */
  public async logSystemEvent(
    eventType: AuditEventType,
    description: string,
    metadata: Record<string, any> = {},
    context: Record<string, any> = {}
  ): Promise<void> {
    try {
      await this.securityModule.getAuditLogger().logSecurityEvent(
        eventType,
        description,
        metadata,
        {
          severity: AuditSeverity.LOW,
          ...context,
        }
      );
    } catch (error) {
      logger.error('Error logging system event:', error);
    }
  }

  /**
   * Analyze request for threats
   */
  public async analyzeRequest(
    userId: string,
    ipAddress: string,
    userAgent: string,
    request: {
      method: string;
      url: string;
      headers: Record<string, string>;
      body?: any;
    }
  ): Promise<any[]> {
    try {
      if (!this.config.enableThreatDetection) {
        return [];
      }

      return await this.securityModule.getThreatDetection().analyzeRequest(
        userId,
        ipAddress,
        userAgent,
        request
      );
    } catch (error) {
      logger.error('Error analyzing request for threats:', error);
      return [];
    }
  }

  /**
   * Analyze login attempt for threats
   */
  public async analyzeLoginAttempt(
    userId: string,
    ipAddress: string,
    userAgent: string,
    success: boolean,
    metadata: Record<string, any> = {}
  ): Promise<any[]> {
    try {
      if (!this.config.enableThreatDetection) {
        return [];
      }

      return await this.securityModule.getThreatDetection().analyzeLoginAttempt(
        userId,
        ipAddress,
        userAgent,
        success,
        metadata
      );
    } catch (error) {
      logger.error('Error analyzing login attempt for threats:', error);
      return [];
    }
  }

  /**
   * Run compliance check
   */
  public async runComplianceCheck(
    ruleId: string,
    checkedBy: string
  ): Promise<any> {
    try {
      if (!this.config.enableComplianceMonitoring) {
        return null;
      }

      return await this.securityModule.getComplianceManager().runComplianceCheck(
        ruleId,
        checkedBy
      );
    } catch (error) {
      logger.error('Error running compliance check:', error);
      throw error;
    }
  }

  /**
   * Process data subject request
   */
  public async processDataSubjectRequest(
    request: {
      type: string;
      userId: string;
      requestedBy: string;
      priority: string;
      notes?: string;
    }
  ): Promise<any> {
    try {
      if (!this.config.enableComplianceMonitoring) {
        return null;
      }

      return await this.securityModule.getComplianceManager().processDataSubjectRequest(
        request
      );
    } catch (error) {
      logger.error('Error processing data subject request:', error);
      throw error;
    }
  }

  /**
   * Record user consent
   */
  public async recordConsent(
    userId: string,
    consentType: string,
    purpose: string,
    granted: boolean,
    ipAddress: string,
    userAgent: string,
    evidence: string
  ): Promise<any> {
    try {
      if (!this.config.enableComplianceMonitoring) {
        return null;
      }

      return await this.securityModule.getComplianceManager().recordConsent(
        userId,
        consentType,
        purpose,
        granted,
        ipAddress,
        userAgent,
        evidence
      );
    } catch (error) {
      logger.error('Error recording consent:', error);
      throw error;
    }
  }

  /**
   * Create security incident
   */
  public async createSecurityIncident(
    type: string,
    severity: string,
    title: string,
    description: string,
    detectedBy: string,
    affectedUsers: string[] = [],
    affectedSystems: string[] = [],
    tags: string[] = []
  ): Promise<any> {
    try {
      return await this.securityModule.getSecurityService().createSecurityIncident(
        type,
        severity,
        title,
        description,
        detectedBy,
        affectedUsers,
        affectedSystems,
        tags
      );
    } catch (error) {
      logger.error('Error creating security incident:', error);
      throw error;
    }
  }

  /**
   * Get security metrics
   */
  public async getSecurityMetrics(): Promise<any> {
    try {
      return await this.securityModule.getSecurityService().getSecurityMetrics();
    } catch (error) {
      logger.error('Error getting security metrics:', error);
      throw error;
    }
  }

  /**
   * Get security statistics
   */
  public getSecurityStats(): any {
    try {
      return this.securityModule.getSecurityMiddleware().getSecurityStats();
    } catch (error) {
      logger.error('Error getting security statistics:', error);
      return {
        blockedIPs: 0,
        blockedUsers: 0,
        suspiciousIPs: 0,
        activeThreats: 0,
      };
    }
  }

  /**
   * Block IP address
   */
  public blockIP(ipAddress: string, reason: string): void {
    try {
      this.securityModule.getSecurityMiddleware().blockIP(ipAddress, reason);
      logger.warn(`IP ${ipAddress} blocked: ${reason}`);
    } catch (error) {
      logger.error('Error blocking IP address:', error);
    }
  }

  /**
   * Unblock IP address
   */
  public unblockIP(ipAddress: string): void {
    try {
      this.securityModule.getSecurityMiddleware().unblockIP(ipAddress);
      logger.info(`IP ${ipAddress} unblocked`);
    } catch (error) {
      logger.error('Error unblocking IP address:', error);
    }
  }

  /**
   * Block user
   */
  public blockUser(userId: string, reason: string): void {
    try {
      this.securityModule.getSecurityMiddleware().blockUser(userId, reason);
      logger.warn(`User ${userId} blocked: ${reason}`);
    } catch (error) {
      logger.error('Error blocking user:', error);
    }
  }

  /**
   * Unblock user
   */
  public unblockUser(userId: string): void {
    try {
      this.securityModule.getSecurityMiddleware().unblockUser(userId);
      logger.info(`User ${userId} unblocked`);
    } catch (error) {
      logger.error('Error unblocking user:', error);
    }
  }

  /**
   * Get active threats
   */
  public getActiveThreats(): any[] {
    try {
      return this.securityModule.getThreatDetection().getActiveThreats();
    } catch (error) {
      logger.error('Error getting active threats:', error);
      return [];
    }
  }

  /**
   * Resolve threat
   */
  public async resolveThreat(
    threatId: string,
    resolvedBy: string,
    resolution: string
  ): Promise<void> {
    try {
      await this.securityModule.getThreatDetection().resolveThreat(
        threatId,
        resolvedBy,
        resolution
      );
      logger.info(`Threat ${threatId} resolved by ${resolvedBy}`);
    } catch (error) {
      logger.error('Error resolving threat:', error);
      throw error;
    }
  }

  /**
   * Get compliance status
   */
  public getComplianceStatus(): any[] {
    try {
      return this.securityModule.getComplianceManager().getComplianceStatus();
    } catch (error) {
      logger.error('Error getting compliance status:', error);
      return [];
    }
  }

  /**
   * Get active compliance checks
   */
  public getActiveComplianceChecks(): any[] {
    try {
      return this.securityModule.getComplianceManager().getActiveChecks();
    } catch (error) {
      logger.error('Error getting active compliance checks:', error);
      return [];
    }
  }

  /**
   * Get active incidents
   */
  public getActiveIncidents(): any[] {
    try {
      return this.securityModule.getSecurityService().getActiveIncidents();
    } catch (error) {
      logger.error('Error getting active incidents:', error);
      return [];
    }
  }

  /**
   * Get incident by ID
   */
  public getIncident(incidentId: string): any {
    try {
      return this.securityModule.getSecurityService().getIncident(incidentId);
    } catch (error) {
      logger.error('Error getting incident:', error);
      return null;
    }
  }

  /**
   * Load default configuration
   */
  private loadDefaultConfig(): SecurityIntegrationConfig {
    return {
      enableThreatDetection: process.env.ENABLE_THREAT_DETECTION === 'true',
      enableComplianceMonitoring: process.env.ENABLE_COMPLIANCE_MONITORING === 'true',
      enableAuditLogging: process.env.ENABLE_AUDIT_LOGGING === 'true',
      enableSecurityMiddleware: process.env.ENABLE_SECURITY_MIDDLEWARE === 'true',
      enableRateLimiting: process.env.ENABLE_RATE_LIMITING === 'true',
      enableSlowDown: process.env.ENABLE_SLOW_DOWN === 'true',
      enableHelmet: process.env.ENABLE_HELMET === 'true',
      enableCORS: process.env.ENABLE_CORS === 'true',
      trustedProxies: (process.env.TRUSTED_PROXIES || '').split(',').filter(Boolean),
      allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(','),
      allowedMethods: (process.env.ALLOWED_METHODS || 'GET,POST,PUT,DELETE,OPTIONS').split(','),
      allowedHeaders: (process.env.ALLOWED_HEADERS || 'Content-Type,Authorization,X-Requested-With').split(','),
      maxRequestsPerWindow: parseInt(process.env.MAX_REQUESTS_PER_WINDOW || '100', 10),
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
      slowDownDelay: parseInt(process.env.SLOW_DOWN_DELAY || '500', 10),
    };
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<SecurityIntegrationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Security integration configuration updated');
  }

  /**
   * Get current configuration
   */
  public getConfig(): SecurityIntegrationConfig {
    return { ...this.config };
  }

  /**
   * Shutdown security integration
   */
  public async shutdown(): Promise<void> {
    try {
      await this.securityModule.shutdown();
      logger.info('Security integration shutdown completed');
    } catch (error) {
      logger.error('Error shutting down security integration:', error);
    }
  }
}

// Export singleton instance
let securityIntegrationInstance: SecurityIntegration | null = null;

export const getSecurityIntegration = (supabase: SupabaseClient): SecurityIntegration => {
  if (!securityIntegrationInstance) {
    securityIntegrationInstance = new SecurityIntegration(supabase);
  }
  return securityIntegrationInstance;
};
