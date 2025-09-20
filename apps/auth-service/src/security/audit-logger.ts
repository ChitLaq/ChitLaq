import { getLogger } from '../../../utils/logger';
import { SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const logger = getLogger('AuditLogger');

export interface AuditEvent {
  id: string;
  userId?: string;
  sessionId?: string;
  eventType: AuditEventType;
  eventCategory: AuditEventCategory;
  severity: AuditSeverity;
  description: string;
  metadata: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  universityId?: string;
  riskScore: number;
  tags: string[];
  source: string;
  target?: string;
  outcome: AuditOutcome;
}

export enum AuditEventType {
  // Authentication Events
  LOGIN_ATTEMPT = 'login_attempt',
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  LOGOUT = 'logout',
  PASSWORD_CHANGE = 'password_change',
  PASSWORD_RESET = 'password_reset',
  EMAIL_VERIFICATION = 'email_verification',
  ACCOUNT_LOCKOUT = 'account_lockout',
  ACCOUNT_UNLOCK = 'account_unlock',
  
  // Authorization Events
  PERMISSION_GRANTED = 'permission_granted',
  PERMISSION_DENIED = 'permission_denied',
  ROLE_CHANGE = 'role_change',
  ACCESS_GRANTED = 'access_granted',
  ACCESS_DENIED = 'access_denied',
  
  // Data Access Events
  DATA_VIEW = 'data_view',
  DATA_CREATE = 'data_create',
  DATA_UPDATE = 'data_update',
  DATA_DELETE = 'data_delete',
  DATA_EXPORT = 'data_export',
  DATA_IMPORT = 'data_import',
  
  // Security Events
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  BRUTE_FORCE_ATTEMPT = 'brute_force_attempt',
  MALICIOUS_REQUEST = 'malicious_request',
  VULNERABILITY_DETECTED = 'vulnerability_detected',
  SECURITY_SCAN = 'security_scan',
  
  // Compliance Events
  CONSENT_GIVEN = 'consent_given',
  CONSENT_WITHDRAWN = 'consent_withdrawn',
  DATA_RETENTION_APPLIED = 'data_retention_applied',
  DATA_DELETION = 'data_deletion',
  PRIVACY_REQUEST = 'privacy_request',
  BREACH_DETECTED = 'breach_detected',
  
  // System Events
  CONFIGURATION_CHANGE = 'configuration_change',
  SYSTEM_ERROR = 'system_error',
  BACKUP_CREATED = 'backup_created',
  BACKUP_RESTORED = 'backup_restored',
}

export enum AuditEventCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  DATA_ACCESS = 'data_access',
  SECURITY = 'security',
  COMPLIANCE = 'compliance',
  SYSTEM = 'system',
}

export enum AuditSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum AuditOutcome {
  SUCCESS = 'success',
  FAILURE = 'failure',
  PARTIAL = 'partial',
  PENDING = 'pending',
}

export interface AuditFilter {
  userId?: string;
  eventType?: AuditEventType;
  eventCategory?: AuditEventCategory;
  severity?: AuditSeverity;
  startDate?: string;
  endDate?: string;
  ipAddress?: string;
  universityId?: string;
  riskScoreMin?: number;
  tags?: string[];
  outcome?: AuditOutcome;
}

export interface AuditStats {
  totalEvents: number;
  eventsByType: Record<AuditEventType, number>;
  eventsBySeverity: Record<AuditSeverity, number>;
  eventsByCategory: Record<AuditEventCategory, number>;
  riskScoreDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  topIPAddresses: Array<{ ip: string; count: number }>;
  topUsers: Array<{ userId: string; count: number }>;
  timeRange: {
    start: string;
    end: string;
  };
}

export class AuditLogger {
  private supabase: SupabaseClient;
  private isEnabled: boolean;
  private retentionDays: number;
  private batchSize: number;
  private eventQueue: AuditEvent[] = [];
  private flushInterval: NodeJS.Timeout | null = null;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.isEnabled = process.env.AUDIT_LOGGING_ENABLED === 'true';
    this.retentionDays = parseInt(process.env.AUDIT_RETENTION_DAYS || '2555', 10); // 7 years default
    this.batchSize = parseInt(process.env.AUDIT_BATCH_SIZE || '100', 10);
    
    if (this.isEnabled) {
      this.startBatchProcessor();
    }
  }

  /**
   * Log an audit event
   */
  public async logEvent(
    eventType: AuditEventType,
    eventCategory: AuditEventCategory,
    description: string,
    metadata: Record<string, any> = {},
    options: {
      userId?: string;
      sessionId?: string;
      ipAddress?: string;
      userAgent?: string;
      universityId?: string;
      severity?: AuditSeverity;
      riskScore?: number;
      tags?: string[];
      source?: string;
      target?: string;
      outcome?: AuditOutcome;
    } = {}
  ): Promise<void> {
    if (!this.isEnabled) {
      return;
    }

    const event: AuditEvent = {
      id: crypto.randomUUID(),
      userId: options.userId,
      sessionId: options.sessionId,
      eventType,
      eventCategory,
      severity: options.severity || this.determineSeverity(eventType, metadata),
      description,
      metadata: this.sanitizeMetadata(metadata),
      ipAddress: options.ipAddress || 'unknown',
      userAgent: options.userAgent || 'unknown',
      timestamp: new Date().toISOString(),
      universityId: options.universityId,
      riskScore: options.riskScore || this.calculateRiskScore(eventType, metadata),
      tags: options.tags || [],
      source: options.source || 'auth-service',
      target: options.target,
      outcome: options.outcome || AuditOutcome.SUCCESS,
    };

    // Add to queue for batch processing
    this.eventQueue.push(event);

    // Log to console for immediate visibility
    this.logToConsole(event);

    // Flush if queue is full
    if (this.eventQueue.length >= this.batchSize) {
      await this.flushEvents();
    }
  }

  /**
   * Log authentication events
   */
  public async logAuthenticationEvent(
    eventType: AuditEventType,
    userId: string,
    ipAddress: string,
    userAgent: string,
    metadata: Record<string, any> = {},
    outcome: AuditOutcome = AuditOutcome.SUCCESS
  ): Promise<void> {
    await this.logEvent(
      eventType,
      AuditEventCategory.AUTHENTICATION,
      this.getAuthenticationDescription(eventType, userId, outcome),
      {
        ...metadata,
        userId,
        ipAddress,
        userAgent,
      },
      {
        userId,
        ipAddress,
        userAgent,
        outcome,
        tags: ['authentication', 'security'],
      }
    );
  }

  /**
   * Log security events
   */
  public async logSecurityEvent(
    eventType: AuditEventType,
    description: string,
    metadata: Record<string, any> = {},
    options: {
      userId?: string;
      ipAddress?: string;
      userAgent?: string;
      severity?: AuditSeverity;
      riskScore?: number;
    } = {}
  ): Promise<void> {
    await this.logEvent(
      eventType,
      AuditEventCategory.SECURITY,
      description,
      metadata,
      {
        ...options,
        tags: ['security', 'threat-detection'],
        severity: options.severity || AuditSeverity.HIGH,
      }
    );
  }

  /**
   * Log compliance events
   */
  public async logComplianceEvent(
    eventType: AuditEventType,
    description: string,
    metadata: Record<string, any> = {},
    options: {
      userId?: string;
      universityId?: string;
      severity?: AuditSeverity;
    } = {}
  ): Promise<void> {
    await this.logEvent(
      eventType,
      AuditEventCategory.COMPLIANCE,
      description,
      metadata,
      {
        ...options,
        tags: ['compliance', 'privacy', 'gdpr'],
        severity: options.severity || AuditSeverity.MEDIUM,
      }
    );
  }

  /**
   * Log data access events
   */
  public async logDataAccessEvent(
    eventType: AuditEventType,
    userId: string,
    resource: string,
    metadata: Record<string, any> = {},
    outcome: AuditOutcome = AuditOutcome.SUCCESS
  ): Promise<void> {
    await this.logEvent(
      eventType,
      AuditEventCategory.DATA_ACCESS,
      `Data ${eventType} on ${resource}`,
      {
        ...metadata,
        resource,
        userId,
      },
      {
        userId,
        outcome,
        target: resource,
        tags: ['data-access', 'privacy'],
      }
    );
  }

  /**
   * Query audit events with filters
   */
  public async queryEvents(
    filter: AuditFilter,
    limit: number = 100,
    offset: number = 0
  ): Promise<{ events: AuditEvent[]; total: number }> {
    try {
      let query = this.supabase
        .from('audit_logs')
        .select('*', { count: 'exact' });

      // Apply filters
      if (filter.userId) {
        query = query.eq('user_id', filter.userId);
      }
      if (filter.eventType) {
        query = query.eq('event_type', filter.eventType);
      }
      if (filter.eventCategory) {
        query = query.eq('event_category', filter.eventCategory);
      }
      if (filter.severity) {
        query = query.eq('severity', filter.severity);
      }
      if (filter.startDate) {
        query = query.gte('timestamp', filter.startDate);
      }
      if (filter.endDate) {
        query = query.lte('timestamp', filter.endDate);
      }
      if (filter.ipAddress) {
        query = query.eq('ip_address', filter.ipAddress);
      }
      if (filter.universityId) {
        query = query.eq('university_id', filter.universityId);
      }
      if (filter.riskScoreMin) {
        query = query.gte('risk_score', filter.riskScoreMin);
      }
      if (filter.tags && filter.tags.length > 0) {
        query = query.overlaps('tags', filter.tags);
      }
      if (filter.outcome) {
        query = query.eq('outcome', filter.outcome);
      }

      // Apply pagination and ordering
      query = query
        .order('timestamp', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      return {
        events: data || [],
        total: count || 0,
      };
    } catch (error) {
      logger.error('Error querying audit events:', error);
      throw error;
    }
  }

  /**
   * Get audit statistics
   */
  public async getAuditStats(
    startDate: string,
    endDate: string,
    universityId?: string
  ): Promise<AuditStats> {
    try {
      let query = this.supabase
        .from('audit_logs')
        .select('*')
        .gte('timestamp', startDate)
        .lte('timestamp', endDate);

      if (universityId) {
        query = query.eq('university_id', universityId);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      const events = data || [];
      const stats: AuditStats = {
        totalEvents: events.length,
        eventsByType: {} as Record<AuditEventType, number>,
        eventsBySeverity: {} as Record<AuditSeverity, number>,
        eventsByCategory: {} as Record<AuditEventCategory, number>,
        riskScoreDistribution: {
          low: 0,
          medium: 0,
          high: 0,
          critical: 0,
        },
        topIPAddresses: [],
        topUsers: [],
        timeRange: { start: startDate, end: endDate },
      };

      // Calculate statistics
      events.forEach(event => {
        // Count by type
        stats.eventsByType[event.event_type] = (stats.eventsByType[event.event_type] || 0) + 1;
        
        // Count by severity
        stats.eventsBySeverity[event.severity] = (stats.eventsBySeverity[event.severity] || 0) + 1;
        
        // Count by category
        stats.eventsByCategory[event.event_category] = (stats.eventsByCategory[event.event_category] || 0) + 1;
        
        // Risk score distribution
        if (event.risk_score < 25) stats.riskScoreDistribution.low++;
        else if (event.risk_score < 50) stats.riskScoreDistribution.medium++;
        else if (event.risk_score < 75) stats.riskScoreDistribution.high++;
        else stats.riskScoreDistribution.critical++;
      });

      // Calculate top IP addresses
      const ipCounts: Record<string, number> = {};
      events.forEach(event => {
        ipCounts[event.ip_address] = (ipCounts[event.ip_address] || 0) + 1;
      });
      stats.topIPAddresses = Object.entries(ipCounts)
        .map(([ip, count]) => ({ ip, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Calculate top users
      const userCounts: Record<string, number> = {};
      events.forEach(event => {
        if (event.user_id) {
          userCounts[event.user_id] = (userCounts[event.user_id] || 0) + 1;
        }
      });
      stats.topUsers = Object.entries(userCounts)
        .map(([userId, count]) => ({ userId, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return stats;
    } catch (error) {
      logger.error('Error getting audit stats:', error);
      throw error;
    }
  }

  /**
   * Clean up old audit logs based on retention policy
   */
  public async cleanupOldLogs(): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

      const { data, error } = await this.supabase
        .from('audit_logs')
        .delete()
        .lt('timestamp', cutoffDate.toISOString())
        .select('id');

      if (error) {
        throw error;
      }

      const deletedCount = data?.length || 0;
      logger.info(`Cleaned up ${deletedCount} old audit logs`);
      
      return deletedCount;
    } catch (error) {
      logger.error('Error cleaning up old audit logs:', error);
      throw error;
    }
  }

  /**
   * Export audit logs for compliance
   */
  public async exportAuditLogs(
    filter: AuditFilter,
    format: 'json' | 'csv' = 'json'
  ): Promise<string> {
    try {
      const { events } = await this.queryEvents(filter, 10000, 0);

      if (format === 'csv') {
        return this.convertToCSV(events);
      } else {
        return JSON.stringify(events, null, 2);
      }
    } catch (error) {
      logger.error('Error exporting audit logs:', error);
      throw error;
    }
  }

  /**
   * Start batch processor for queued events
   */
  private startBatchProcessor(): void {
    this.flushInterval = setInterval(async () => {
      if (this.eventQueue.length > 0) {
        await this.flushEvents();
      }
    }, 5000); // Flush every 5 seconds
  }

  /**
   * Flush queued events to database
   */
  private async flushEvents(): Promise<void> {
    if (this.eventQueue.length === 0) {
      return;
    }

    const eventsToFlush = this.eventQueue.splice(0, this.batchSize);

    try {
      const { error } = await this.supabase
        .from('audit_logs')
        .insert(eventsToFlush.map(event => ({
          id: event.id,
          user_id: event.userId,
          session_id: event.sessionId,
          event_type: event.eventType,
          event_category: event.eventCategory,
          severity: event.severity,
          description: event.description,
          metadata: event.metadata,
          ip_address: event.ipAddress,
          user_agent: event.userAgent,
          timestamp: event.timestamp,
          university_id: event.universityId,
          risk_score: event.riskScore,
          tags: event.tags,
          source: event.source,
          target: event.target,
          outcome: event.outcome,
        })));

      if (error) {
        throw error;
      }

      logger.debug(`Flushed ${eventsToFlush.length} audit events to database`);
    } catch (error) {
      logger.error('Error flushing audit events:', error);
      // Re-queue events for retry
      this.eventQueue.unshift(...eventsToFlush);
    }
  }

  /**
   * Log event to console for immediate visibility
   */
  private logToConsole(event: AuditEvent): void {
    const logLevel = this.getLogLevel(event.severity);
    const message = `[AUDIT] ${event.eventType}: ${event.description}`;
    
    logger[logLevel](message, {
      eventId: event.id,
      userId: event.userId,
      severity: event.severity,
      riskScore: event.riskScore,
      ipAddress: event.ipAddress,
      tags: event.tags,
    });
  }

  /**
   * Determine severity based on event type and metadata
   */
  private determineSeverity(eventType: AuditEventType, metadata: Record<string, any>): AuditSeverity {
    const severityMap: Record<AuditEventType, AuditSeverity> = {
      [AuditEventType.LOGIN_SUCCESS]: AuditSeverity.LOW,
      [AuditEventType.LOGIN_FAILURE]: AuditSeverity.MEDIUM,
      [AuditEventType.ACCOUNT_LOCKOUT]: AuditSeverity.HIGH,
      [AuditEventType.SUSPICIOUS_ACTIVITY]: AuditSeverity.HIGH,
      [AuditEventType.BRUTE_FORCE_ATTEMPT]: AuditSeverity.CRITICAL,
      [AuditEventType.MALICIOUS_REQUEST]: AuditSeverity.CRITICAL,
      [AuditEventType.BREACH_DETECTED]: AuditSeverity.CRITICAL,
      [AuditEventType.DATA_DELETE]: AuditSeverity.HIGH,
      [AuditEventType.CONSENT_WITHDRAWN]: AuditSeverity.MEDIUM,
      [AuditEventType.SYSTEM_ERROR]: AuditSeverity.HIGH,
    };

    return severityMap[eventType] || AuditSeverity.MEDIUM;
  }

  /**
   * Calculate risk score based on event type and metadata
   */
  private calculateRiskScore(eventType: AuditEventType, metadata: Record<string, any>): number {
    let score = 0;

    // Base score by event type
    const baseScores: Record<AuditEventType, number> = {
      [AuditEventType.LOGIN_SUCCESS]: 10,
      [AuditEventType.LOGIN_FAILURE]: 30,
      [AuditEventType.ACCOUNT_LOCKOUT]: 70,
      [AuditEventType.SUSPICIOUS_ACTIVITY]: 80,
      [AuditEventType.BRUTE_FORCE_ATTEMPT]: 95,
      [AuditEventType.MALICIOUS_REQUEST]: 100,
      [AuditEventType.BREACH_DETECTED]: 100,
      [AuditEventType.DATA_DELETE]: 60,
      [AuditEventType.CONSENT_WITHDRAWN]: 20,
      [AuditEventType.SYSTEM_ERROR]: 50,
    };

    score = baseScores[eventType] || 25;

    // Adjust based on metadata
    if (metadata.failedAttempts && metadata.failedAttempts > 5) {
      score += 20;
    }
    if (metadata.suspiciousIP) {
      score += 30;
    }
    if (metadata.unusualLocation) {
      score += 25;
    }
    if (metadata.dataVolume && metadata.dataVolume > 1000) {
      score += 15;
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Sanitize metadata to remove sensitive information
   */
  private sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
    const sanitized = { ...metadata };
    
    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'ssn', 'creditCard'];
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  /**
   * Get authentication event description
   */
  private getAuthenticationDescription(
    eventType: AuditEventType,
    userId: string,
    outcome: AuditOutcome
  ): string {
    const descriptions: Record<AuditEventType, string> = {
      [AuditEventType.LOGIN_ATTEMPT]: `Login attempt for user ${userId}`,
      [AuditEventType.LOGIN_SUCCESS]: `Successful login for user ${userId}`,
      [AuditEventType.LOGIN_FAILURE]: `Failed login attempt for user ${userId}`,
      [AuditEventType.LOGOUT]: `User ${userId} logged out`,
      [AuditEventType.PASSWORD_CHANGE]: `Password changed for user ${userId}`,
      [AuditEventType.PASSWORD_RESET]: `Password reset for user ${userId}`,
      [AuditEventType.EMAIL_VERIFICATION]: `Email verification for user ${userId}`,
      [AuditEventType.ACCOUNT_LOCKOUT]: `Account locked for user ${userId}`,
      [AuditEventType.ACCOUNT_UNLOCK]: `Account unlocked for user ${userId}`,
    };

    return descriptions[eventType] || `Authentication event for user ${userId}`;
  }

  /**
   * Get log level based on severity
   */
  private getLogLevel(severity: AuditSeverity): 'info' | 'warn' | 'error' {
    switch (severity) {
      case AuditSeverity.LOW:
      case AuditSeverity.MEDIUM:
        return 'info';
      case AuditSeverity.HIGH:
        return 'warn';
      case AuditSeverity.CRITICAL:
        return 'error';
      default:
        return 'info';
    }
  }

  /**
   * Convert events to CSV format
   */
  private convertToCSV(events: AuditEvent[]): string {
    if (events.length === 0) {
      return '';
    }

    const headers = [
      'ID', 'Timestamp', 'Event Type', 'Event Category', 'Severity', 'Description',
      'User ID', 'IP Address', 'Risk Score', 'Outcome', 'Tags'
    ];

    const rows = events.map(event => [
      event.id,
      event.timestamp,
      event.eventType,
      event.eventCategory,
      event.severity,
      event.description,
      event.userId || '',
      event.ipAddress,
      event.riskScore,
      event.outcome,
      event.tags.join(';')
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  /**
   * Stop the audit logger
   */
  public stop(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    
    // Flush remaining events
    if (this.eventQueue.length > 0) {
      this.flushEvents();
    }
  }
}

// Export singleton instance
let auditLoggerInstance: AuditLogger | null = null;

export const getAuditLogger = (supabase: SupabaseClient): AuditLogger => {
  if (!auditLoggerInstance) {
    auditLoggerInstance = new AuditLogger(supabase);
  }
  return auditLoggerInstance;
};
