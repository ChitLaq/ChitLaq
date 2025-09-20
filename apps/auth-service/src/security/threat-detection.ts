import { getLogger } from '../../../utils/logger';
import { SupabaseClient } from '@supabase/supabase-js';
import { AuditLogger, AuditEventType, AuditSeverity } from './audit-logger';
import crypto from 'crypto';

const logger = getLogger('ThreatDetection');

export interface ThreatIndicator {
  id: string;
  type: ThreatType;
  severity: ThreatSeverity;
  description: string;
  metadata: Record<string, any>;
  timestamp: string;
  userId?: string;
  ipAddress: string;
  userAgent: string;
  riskScore: number;
  isActive: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
  resolution?: string;
}

export enum ThreatType {
  BRUTE_FORCE = 'brute_force',
  SUSPICIOUS_LOGIN = 'suspicious_login',
  ACCOUNT_TAKEOVER = 'account_takeover',
  MALICIOUS_REQUEST = 'malicious_request',
  DATA_EXFILTRATION = 'data_exfiltration',
  PRIVILEGE_ESCALATION = 'privilege_escalation',
  SESSION_HIJACKING = 'session_hijacking',
  PHISHING_ATTEMPT = 'phishing_attempt',
  MALWARE_DETECTED = 'malware_detected',
  DDoS_ATTACK = 'ddos_attack',
  SQL_INJECTION = 'sql_injection',
  XSS_ATTACK = 'xss_attack',
  CSRF_ATTACK = 'csrf_attack',
  UNUSUAL_ACTIVITY = 'unusual_activity',
  GEOGRAPHIC_ANOMALY = 'geographic_anomaly',
  DEVICE_ANOMALY = 'device_anomaly',
  BEHAVIORAL_ANOMALY = 'behavioral_anomaly',
}

export enum ThreatSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface SecurityRule {
  id: string;
  name: string;
  description: string;
  type: ThreatType;
  conditions: SecurityCondition[];
  actions: SecurityAction[];
  isEnabled: boolean;
  priority: number;
  cooldownMinutes: number;
  lastTriggered?: string;
}

export interface SecurityCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'regex' | 'in' | 'not_in';
  value: any;
  weight: number;
}

export interface SecurityAction {
  type: 'block' | 'alert' | 'lock_account' | 'require_2fa' | 'rate_limit' | 'log' | 'notify';
  parameters: Record<string, any>;
  delay?: number;
}

export interface ThreatDetectionConfig {
  bruteForceThreshold: number;
  bruteForceWindowMinutes: number;
  suspiciousLoginThreshold: number;
  geographicAnomalyThreshold: number;
  deviceAnomalyThreshold: number;
  behavioralAnomalyThreshold: number;
  riskScoreThreshold: number;
  autoBlockEnabled: boolean;
  notificationEnabled: boolean;
  alertChannels: string[];
}

export class ThreatDetectionService {
  private supabase: SupabaseClient;
  private auditLogger: AuditLogger;
  private config: ThreatDetectionConfig;
  private activeThreats: Map<string, ThreatIndicator> = new Map();
  private securityRules: SecurityRule[] = [];
  private ipRateLimits: Map<string, { count: number; resetTime: number }> = new Map();
  private userRateLimits: Map<string, { count: number; resetTime: number }> = new Map();

  constructor(supabase: SupabaseClient, auditLogger: AuditLogger) {
    this.supabase = supabase;
    this.auditLogger = auditLogger;
    this.config = this.loadDefaultConfig();
    this.loadSecurityRules();
    this.startMonitoring();
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
  ): Promise<ThreatIndicator[]> {
    const threats: ThreatIndicator[] = [];

    try {
      // Check for brute force attacks
      const bruteForceThreat = await this.detectBruteForce(userId, ipAddress, success);
      if (bruteForceThreat) {
        threats.push(bruteForceThreat);
      }

      // Check for suspicious login patterns
      const suspiciousLoginThreat = await this.detectSuspiciousLogin(userId, ipAddress, userAgent, metadata);
      if (suspiciousLoginThreat) {
        threats.push(suspiciousLoginThreat);
      }

      // Check for geographic anomalies
      const geoThreat = await this.detectGeographicAnomaly(userId, ipAddress, metadata);
      if (geoThreat) {
        threats.push(geoThreat);
      }

      // Check for device anomalies
      const deviceThreat = await this.detectDeviceAnomaly(userId, userAgent, metadata);
      if (deviceThreat) {
        threats.push(deviceThreat);
      }

      // Check for behavioral anomalies
      const behaviorThreat = await this.detectBehavioralAnomaly(userId, metadata);
      if (behaviorThreat) {
        threats.push(behaviorThreat);
      }

      // Process detected threats
      for (const threat of threats) {
        await this.processThreat(threat);
      }

      // Log security event
      await this.auditLogger.logSecurityEvent(
        success ? AuditEventType.LOGIN_SUCCESS : AuditEventType.LOGIN_FAILURE,
        `Login attempt analyzed for user ${userId}`,
        {
          userId,
          ipAddress,
          userAgent,
          success,
          threatsDetected: threats.length,
          threatTypes: threats.map(t => t.type),
        },
        {
          userId,
          ipAddress,
          userAgent,
          severity: threats.length > 0 ? AuditSeverity.HIGH : AuditSeverity.LOW,
        }
      );

      return threats;
    } catch (error) {
      logger.error('Error analyzing login attempt:', error);
      throw error;
    }
  }

  /**
   * Analyze request for malicious patterns
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
  ): Promise<ThreatIndicator[]> {
    const threats: ThreatIndicator[] = [];

    try {
      // Check for SQL injection attempts
      const sqlInjectionThreat = this.detectSQLInjection(request);
      if (sqlInjectionThreat) {
        threats.push(sqlInjectionThreat);
      }

      // Check for XSS attempts
      const xssThreat = this.detectXSS(request);
      if (xssThreat) {
        threats.push(xssThreat);
      }

      // Check for CSRF attempts
      const csrfThreat = this.detectCSRF(request);
      if (csrfThreat) {
        threats.push(csrfThreat);
      }

      // Check for malicious requests
      const maliciousThreat = this.detectMaliciousRequest(request);
      if (maliciousThreat) {
        threats.push(maliciousThreat);
      }

      // Check rate limits
      const rateLimitThreat = await this.checkRateLimits(userId, ipAddress);
      if (rateLimitThreat) {
        threats.push(rateLimitThreat);
      }

      // Process detected threats
      for (const threat of threats) {
        await this.processThreat(threat);
      }

      return threats;
    } catch (error) {
      logger.error('Error analyzing request:', error);
      throw error;
    }
  }

  /**
   * Detect brute force attacks
   */
  private async detectBruteForce(
    userId: string,
    ipAddress: string,
    success: boolean
  ): Promise<ThreatIndicator | null> {
    try {
      const windowStart = new Date();
      windowStart.setMinutes(windowStart.getMinutes() - this.config.bruteForceWindowMinutes);

      // Count failed attempts in the window
      const { data: failedAttempts, error } = await this.supabase
        .from('audit_logs')
        .select('*')
        .eq('event_type', AuditEventType.LOGIN_FAILURE)
        .eq('user_id', userId)
        .gte('timestamp', windowStart.toISOString());

      if (error) {
        logger.error('Error querying failed attempts:', error);
        return null;
      }

      const failedCount = failedAttempts?.length || 0;

      if (failedCount >= this.config.bruteForceThreshold) {
        return {
          id: crypto.randomUUID(),
          type: ThreatType.BRUTE_FORCE,
          severity: ThreatSeverity.HIGH,
          description: `Brute force attack detected: ${failedCount} failed attempts in ${this.config.bruteForceWindowMinutes} minutes`,
          metadata: {
            userId,
            ipAddress,
            failedAttempts: failedCount,
            windowMinutes: this.config.bruteForceWindowMinutes,
            threshold: this.config.bruteForceThreshold,
          },
          timestamp: new Date().toISOString(),
          userId,
          ipAddress,
          userAgent: 'unknown',
          riskScore: Math.min(100, failedCount * 10),
          isActive: true,
        };
      }

      return null;
    } catch (error) {
      logger.error('Error detecting brute force:', error);
      return null;
    }
  }

  /**
   * Detect suspicious login patterns
   */
  private async detectSuspiciousLogin(
    userId: string,
    ipAddress: string,
    userAgent: string,
    metadata: Record<string, any>
  ): Promise<ThreatIndicator | null> {
    try {
      // Check for unusual login times
      const hour = new Date().getHours();
      const isUnusualTime = hour < 6 || hour > 22;

      // Check for new device
      const { data: previousLogins, error } = await this.supabase
        .from('audit_logs')
        .select('user_agent, ip_address')
        .eq('event_type', AuditEventType.LOGIN_SUCCESS)
        .eq('user_id', userId)
        .gte('timestamp', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
        .limit(10);

      if (error) {
        logger.error('Error querying previous logins:', error);
        return null;
      }

      const isNewDevice = !previousLogins?.some(login => 
        login.user_agent === userAgent || login.ip_address === ipAddress
      );

      const riskScore = (isUnusualTime ? 30 : 0) + (isNewDevice ? 40 : 0);

      if (riskScore >= this.config.suspiciousLoginThreshold) {
        return {
          id: crypto.randomUUID(),
          type: ThreatType.SUSPICIOUS_LOGIN,
          severity: ThreatSeverity.MEDIUM,
          description: `Suspicious login detected: ${isUnusualTime ? 'unusual time' : ''} ${isNewDevice ? 'new device' : ''}`,
          metadata: {
            userId,
            ipAddress,
            userAgent,
            isUnusualTime,
            isNewDevice,
            riskScore,
          },
          timestamp: new Date().toISOString(),
          userId,
          ipAddress,
          userAgent,
          riskScore,
          isActive: true,
        };
      }

      return null;
    } catch (error) {
      logger.error('Error detecting suspicious login:', error);
      return null;
    }
  }

  /**
   * Detect geographic anomalies
   */
  private async detectGeographicAnomaly(
    userId: string,
    ipAddress: string,
    metadata: Record<string, any>
  ): Promise<ThreatIndicator | null> {
    try {
      // This would typically use a geolocation service
      const currentLocation = metadata.location || { country: 'Unknown', city: 'Unknown' };
      
      // Get previous login locations
      const { data: previousLogins, error } = await this.supabase
        .from('audit_logs')
        .select('metadata')
        .eq('event_type', AuditEventType.LOGIN_SUCCESS)
        .eq('user_id', userId)
        .gte('timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
        .limit(5);

      if (error) {
        logger.error('Error querying previous login locations:', error);
        return null;
      }

      const previousLocations = previousLogins?.map(login => login.metadata?.location) || [];
      const isNewLocation = !previousLocations.some(loc => 
        loc?.country === currentLocation.country
      );

      if (isNewLocation && previousLocations.length > 0) {
        return {
          id: crypto.randomUUID(),
          type: ThreatType.GEOGRAPHIC_ANOMALY,
          severity: ThreatSeverity.MEDIUM,
          description: `Geographic anomaly detected: login from new location ${currentLocation.country}`,
          metadata: {
            userId,
            ipAddress,
            currentLocation,
            previousLocations,
            isNewLocation,
          },
          timestamp: new Date().toISOString(),
          userId,
          ipAddress,
          userAgent: 'unknown',
          riskScore: 60,
          isActive: true,
        };
      }

      return null;
    } catch (error) {
      logger.error('Error detecting geographic anomaly:', error);
      return null;
    }
  }

  /**
   * Detect device anomalies
   */
  private async detectDeviceAnomaly(
    userId: string,
    userAgent: string,
    metadata: Record<string, any>
  ): Promise<ThreatIndicator | null> {
    try {
      // Extract device fingerprint
      const deviceFingerprint = this.generateDeviceFingerprint(userAgent, metadata);
      
      // Check against previous device fingerprints
      const { data: previousLogins, error } = await this.supabase
        .from('audit_logs')
        .select('metadata')
        .eq('event_type', AuditEventType.LOGIN_SUCCESS)
        .eq('user_id', userId)
        .gte('timestamp', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
        .limit(10);

      if (error) {
        logger.error('Error querying previous device fingerprints:', error);
        return null;
      }

      const previousFingerprints = previousLogins?.map(login => 
        login.metadata?.deviceFingerprint
      ) || [];

      const isNewDevice = !previousFingerprints.includes(deviceFingerprint);

      if (isNewDevice && previousFingerprints.length > 0) {
        return {
          id: crypto.randomUUID(),
          type: ThreatType.DEVICE_ANOMALY,
          severity: ThreatSeverity.MEDIUM,
          description: `Device anomaly detected: new device fingerprint`,
          metadata: {
            userId,
            userAgent,
            deviceFingerprint,
            previousFingerprints,
            isNewDevice,
          },
          timestamp: new Date().toISOString(),
          userId,
          ipAddress: 'unknown',
          userAgent,
          riskScore: 50,
          isActive: true,
        };
      }

      return null;
    } catch (error) {
      logger.error('Error detecting device anomaly:', error);
      return null;
    }
  }

  /**
   * Detect behavioral anomalies
   */
  private async detectBehavioralAnomaly(
    userId: string,
    metadata: Record<string, any>
  ): Promise<ThreatIndicator | null> {
    try {
      // This would analyze user behavior patterns
      // For now, we'll implement a simple check for unusual activity volume
      
      const { data: recentActivity, error } = await this.supabase
        .from('audit_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('timestamp', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
        .limit(100);

      if (error) {
        logger.error('Error querying recent activity:', error);
        return null;
      }

      const activityCount = recentActivity?.length || 0;
      const isUnusualVolume = activityCount > 50; // Threshold for unusual activity

      if (isUnusualVolume) {
        return {
          id: crypto.randomUUID(),
          type: ThreatType.BEHAVIORAL_ANOMALY,
          severity: ThreatSeverity.MEDIUM,
          description: `Behavioral anomaly detected: unusual activity volume (${activityCount} events in last hour)`,
          metadata: {
            userId,
            activityCount,
            timeWindow: '1 hour',
            threshold: 50,
          },
          timestamp: new Date().toISOString(),
          userId,
          ipAddress: 'unknown',
          userAgent: 'unknown',
          riskScore: 40,
          isActive: true,
        };
      }

      return null;
    } catch (error) {
      logger.error('Error detecting behavioral anomaly:', error);
      return null;
    }
  }

  /**
   * Detect SQL injection attempts
   */
  private detectSQLInjection(request: any): ThreatIndicator | null {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
      /(\b(OR|AND)\s+['"]\s*=\s*['"])/i,
      /(\b(OR|AND)\s+1\s*=\s*1)/i,
      /(\b(OR|AND)\s+0\s*=\s*0)/i,
      /(\b(OR|AND)\s+true)/i,
      /(\b(OR|AND)\s+false)/i,
      /(\b(OR|AND)\s+null)/i,
      /(\b(OR|AND)\s+undefined)/i,
    ];

    const requestString = JSON.stringify(request).toLowerCase();
    
    for (const pattern of sqlPatterns) {
      if (pattern.test(requestString)) {
        return {
          id: crypto.randomUUID(),
          type: ThreatType.SQL_INJECTION,
          severity: ThreatSeverity.CRITICAL,
          description: `SQL injection attempt detected in request`,
          metadata: {
            request,
            pattern: pattern.toString(),
            matchedContent: requestString.match(pattern)?.[0],
          },
          timestamp: new Date().toISOString(),
          ipAddress: 'unknown',
          userAgent: 'unknown',
          riskScore: 95,
          isActive: true,
        };
      }
    }

    return null;
  }

  /**
   * Detect XSS attempts
   */
  private detectXSS(request: any): ThreatIndicator | null {
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /<iframe[^>]*>.*?<\/iframe>/gi,
      /<object[^>]*>.*?<\/object>/gi,
      /<embed[^>]*>.*?<\/embed>/gi,
      /<applet[^>]*>.*?<\/applet>/gi,
      /<meta[^>]*>.*?<\/meta>/gi,
      /<link[^>]*>.*?<\/link>/gi,
      /<style[^>]*>.*?<\/style>/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /onload\s*=/gi,
      /onerror\s*=/gi,
      /onclick\s*=/gi,
      /onmouseover\s*=/gi,
    ];

    const requestString = JSON.stringify(request).toLowerCase();
    
    for (const pattern of xssPatterns) {
      if (pattern.test(requestString)) {
        return {
          id: crypto.randomUUID(),
          type: ThreatType.XSS_ATTACK,
          severity: ThreatSeverity.HIGH,
          description: `XSS attack attempt detected in request`,
          metadata: {
            request,
            pattern: pattern.toString(),
            matchedContent: requestString.match(pattern)?.[0],
          },
          timestamp: new Date().toISOString(),
          ipAddress: 'unknown',
          userAgent: 'unknown',
          riskScore: 85,
          isActive: true,
        };
      }
    }

    return null;
  }

  /**
   * Detect CSRF attempts
   */
  private detectCSRF(request: any): ThreatIndicator | null {
    // Check for missing or invalid CSRF token
    const csrfToken = request.headers['x-csrf-token'] || request.headers['csrf-token'];
    const referer = request.headers['referer'];
    const origin = request.headers['origin'];

    if (!csrfToken && (request.method === 'POST' || request.method === 'PUT' || request.method === 'DELETE')) {
      return {
        id: crypto.randomUUID(),
        type: ThreatType.CSRF_ATTACK,
        severity: ThreatSeverity.HIGH,
        description: `CSRF attack attempt detected: missing CSRF token`,
        metadata: {
          request,
          missingCsrfToken: true,
          referer,
          origin,
        },
        timestamp: new Date().toISOString(),
        ipAddress: 'unknown',
        userAgent: 'unknown',
        riskScore: 80,
        isActive: true,
      };
    }

    return null;
  }

  /**
   * Detect malicious requests
   */
  private detectMaliciousRequest(request: any): ThreatIndicator | null {
    const maliciousPatterns = [
      /\.\.\//g, // Directory traversal
      /\.\.\\/g, // Directory traversal (Windows)
      /<script/gi, // Script tags
      /javascript:/gi, // JavaScript protocol
      /vbscript:/gi, // VBScript protocol
      /data:text\/html/gi, // Data URI
      /eval\s*\(/gi, // Eval function
      /expression\s*\(/gi, // CSS expression
    ];

    const requestString = JSON.stringify(request).toLowerCase();
    
    for (const pattern of maliciousPatterns) {
      if (pattern.test(requestString)) {
        return {
          id: crypto.randomUUID(),
          type: ThreatType.MALICIOUS_REQUEST,
          severity: ThreatSeverity.HIGH,
          description: `Malicious request detected`,
          metadata: {
            request,
            pattern: pattern.toString(),
            matchedContent: requestString.match(pattern)?.[0],
          },
          timestamp: new Date().toISOString(),
          ipAddress: 'unknown',
          userAgent: 'unknown',
          riskScore: 90,
          isActive: true,
        };
      }
    }

    return null;
  }

  /**
   * Check rate limits
   */
  private async checkRateLimits(userId: string, ipAddress: string): Promise<ThreatIndicator | null> {
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const maxRequests = 100; // Max requests per window

    // Check IP rate limit
    const ipKey = `ip:${ipAddress}`;
    const ipLimit = this.ipRateLimits.get(ipKey);
    
    if (ipLimit && ipLimit.resetTime > now) {
      if (ipLimit.count >= maxRequests) {
        return {
          id: crypto.randomUUID(),
          type: ThreatType.DDoS_ATTACK,
          severity: ThreatSeverity.HIGH,
          description: `Rate limit exceeded for IP ${ipAddress}`,
          metadata: {
            ipAddress,
            requestCount: ipLimit.count,
            windowMs,
            maxRequests,
          },
          timestamp: new Date().toISOString(),
          ipAddress,
          userAgent: 'unknown',
          riskScore: 70,
          isActive: true,
        };
      }
      ipLimit.count++;
    } else {
      this.ipRateLimits.set(ipKey, { count: 1, resetTime: now + windowMs });
    }

    // Check user rate limit
    const userKey = `user:${userId}`;
    const userLimit = this.userRateLimits.get(userKey);
    
    if (userLimit && userLimit.resetTime > now) {
      if (userLimit.count >= maxRequests) {
        return {
          id: crypto.randomUUID(),
          type: ThreatType.UNUSUAL_ACTIVITY,
          severity: ThreatSeverity.MEDIUM,
          description: `Rate limit exceeded for user ${userId}`,
          metadata: {
            userId,
            requestCount: userLimit.count,
            windowMs,
            maxRequests,
          },
          timestamp: new Date().toISOString(),
          userId,
          ipAddress,
          userAgent: 'unknown',
          riskScore: 60,
          isActive: true,
        };
      }
      userLimit.count++;
    } else {
      this.userRateLimits.set(userKey, { count: 1, resetTime: now + windowMs });
    }

    return null;
  }

  /**
   * Process detected threat
   */
  private async processThreat(threat: ThreatIndicator): Promise<void> {
    try {
      // Store threat in database
      await this.supabase
        .from('threat_indicators')
        .insert({
          id: threat.id,
          type: threat.type,
          severity: threat.severity,
          description: threat.description,
          metadata: threat.metadata,
          timestamp: threat.timestamp,
          user_id: threat.userId,
          ip_address: threat.ipAddress,
          user_agent: threat.userAgent,
          risk_score: threat.riskScore,
          is_active: threat.isActive,
        });

      // Add to active threats
      this.activeThreats.set(threat.id, threat);

      // Execute security actions
      await this.executeSecurityActions(threat);

      // Log threat detection
      await this.auditLogger.logSecurityEvent(
        AuditEventType.SUSPICIOUS_ACTIVITY,
        `Threat detected: ${threat.type}`,
        {
          threatId: threat.id,
          threatType: threat.type,
          severity: threat.severity,
          riskScore: threat.riskScore,
          userId: threat.userId,
          ipAddress: threat.ipAddress,
        },
        {
          userId: threat.userId,
          ipAddress: threat.ipAddress,
          severity: this.mapThreatSeverityToAuditSeverity(threat.severity),
          riskScore: threat.riskScore,
        }
      );

      logger.warn(`Threat detected: ${threat.type} (${threat.severity}) - ${threat.description}`);
    } catch (error) {
      logger.error('Error processing threat:', error);
    }
  }

  /**
   * Execute security actions based on threat
   */
  private async executeSecurityActions(threat: ThreatIndicator): Promise<void> {
    try {
      // Find applicable security rules
      const applicableRules = this.securityRules.filter(rule => 
        rule.isEnabled && rule.type === threat.type
      );

      for (const rule of applicableRules) {
        // Check if rule conditions are met
        if (this.evaluateRuleConditions(rule, threat)) {
          // Execute rule actions
          for (const action of rule.actions) {
            await this.executeAction(action, threat);
          }

          // Update rule last triggered time
          rule.lastTriggered = new Date().toISOString();
        }
      }
    } catch (error) {
      logger.error('Error executing security actions:', error);
    }
  }

  /**
   * Evaluate security rule conditions
   */
  private evaluateRuleConditions(rule: SecurityRule, threat: ThreatIndicator): boolean {
    let totalWeight = 0;
    let matchedWeight = 0;

    for (const condition of rule.conditions) {
      totalWeight += condition.weight;
      
      if (this.evaluateCondition(condition, threat)) {
        matchedWeight += condition.weight;
      }
    }

    // Rule matches if matched weight is >= 50% of total weight
    return matchedWeight >= (totalWeight * 0.5);
  }

  /**
   * Evaluate individual condition
   */
  private evaluateCondition(condition: SecurityCondition, threat: ThreatIndicator): boolean {
    const fieldValue = this.getFieldValue(condition.field, threat);
    
    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'not_equals':
        return fieldValue !== condition.value;
      case 'greater_than':
        return Number(fieldValue) > Number(condition.value);
      case 'less_than':
        return Number(fieldValue) < Number(condition.value);
      case 'contains':
        return String(fieldValue).includes(String(condition.value));
      case 'regex':
        return new RegExp(condition.value).test(String(fieldValue));
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(fieldValue);
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(fieldValue);
      default:
        return false;
    }
  }

  /**
   * Get field value from threat object
   */
  private getFieldValue(field: string, threat: ThreatIndicator): any {
    const fieldParts = field.split('.');
    let value: any = threat;
    
    for (const part of fieldParts) {
      value = value?.[part];
    }
    
    return value;
  }

  /**
   * Execute security action
   */
  private async executeAction(action: SecurityAction, threat: ThreatIndicator): Promise<void> {
    try {
      switch (action.type) {
        case 'block':
          await this.blockIP(threat.ipAddress, action.parameters.duration || 3600);
          break;
        case 'alert':
          await this.sendAlert(threat, action.parameters);
          break;
        case 'lock_account':
          if (threat.userId) {
            await this.lockAccount(threat.userId, action.parameters.duration || 3600);
          }
          break;
        case 'require_2fa':
          if (threat.userId) {
            await this.require2FA(threat.userId);
          }
          break;
        case 'rate_limit':
          await this.applyRateLimit(threat.ipAddress, action.parameters);
          break;
        case 'log':
          logger.info(`Security action executed: ${action.type} for threat ${threat.id}`);
          break;
        case 'notify':
          await this.notifySecurityTeam(threat, action.parameters);
          break;
      }
    } catch (error) {
      logger.error(`Error executing security action ${action.type}:`, error);
    }
  }

  /**
   * Block IP address
   */
  private async blockIP(ipAddress: string, durationSeconds: number): Promise<void> {
    // This would typically integrate with a firewall or WAF
    logger.warn(`Blocking IP ${ipAddress} for ${durationSeconds} seconds`);
  }

  /**
   * Send security alert
   */
  private async sendAlert(threat: ThreatIndicator, parameters: Record<string, any>): Promise<void> {
    // This would integrate with alerting systems like PagerDuty, Slack, etc.
    logger.warn(`Security alert: ${threat.type} - ${threat.description}`);
  }

  /**
   * Lock user account
   */
  private async lockAccount(userId: string, durationSeconds: number): Promise<void> {
    try {
      await this.supabase
        .from('users')
        .update({
          locked_until: new Date(Date.now() + durationSeconds * 1000).toISOString(),
          locked_reason: 'Security threat detected',
        })
        .eq('id', userId);

      logger.warn(`Account locked for user ${userId} for ${durationSeconds} seconds`);
    } catch (error) {
      logger.error('Error locking account:', error);
    }
  }

  /**
   * Require 2FA for user
   */
  private async require2FA(userId: string): Promise<void> {
    try {
      await this.supabase
        .from('users')
        .update({
          require_2fa: true,
          require_2fa_reason: 'Security threat detected',
        })
        .eq('id', userId);

      logger.warn(`2FA required for user ${userId}`);
    } catch (error) {
      logger.error('Error requiring 2FA:', error);
    }
  }

  /**
   * Apply rate limit
   */
  private async applyRateLimit(ipAddress: string, parameters: Record<string, any>): Promise<void> {
    const key = `rate_limit:${ipAddress}`;
    const limit = parameters.limit || 10;
    const windowMs = parameters.windowMs || 60000; // 1 minute
    
    this.ipRateLimits.set(key, {
      count: limit,
      resetTime: Date.now() + windowMs,
    });

    logger.warn(`Rate limit applied to IP ${ipAddress}: ${limit} requests per ${windowMs}ms`);
  }

  /**
   * Notify security team
   */
  private async notifySecurityTeam(threat: ThreatIndicator, parameters: Record<string, any>): Promise<void> {
    // This would integrate with notification systems
    logger.warn(`Security team notified: ${threat.type} - ${threat.description}`);
  }

  /**
   * Generate device fingerprint
   */
  private generateDeviceFingerprint(userAgent: string, metadata: Record<string, any>): string {
    const fingerprintData = {
      userAgent,
      screenResolution: metadata.screenResolution,
      timezone: metadata.timezone,
      language: metadata.language,
      platform: metadata.platform,
    };

    return crypto
      .createHash('sha256')
      .update(JSON.stringify(fingerprintData))
      .digest('hex');
  }

  /**
   * Map threat severity to audit severity
   */
  private mapThreatSeverityToAuditSeverity(threatSeverity: ThreatSeverity): AuditSeverity {
    switch (threatSeverity) {
      case ThreatSeverity.LOW:
        return AuditSeverity.LOW;
      case ThreatSeverity.MEDIUM:
        return AuditSeverity.MEDIUM;
      case ThreatSeverity.HIGH:
        return AuditSeverity.HIGH;
      case ThreatSeverity.CRITICAL:
        return AuditSeverity.CRITICAL;
      default:
        return AuditSeverity.MEDIUM;
    }
  }

  /**
   * Load default configuration
   */
  private loadDefaultConfig(): ThreatDetectionConfig {
    return {
      bruteForceThreshold: parseInt(process.env.BRUTE_FORCE_THRESHOLD || '5', 10),
      bruteForceWindowMinutes: parseInt(process.env.BRUTE_FORCE_WINDOW_MINUTES || '15', 10),
      suspiciousLoginThreshold: parseInt(process.env.SUSPICIOUS_LOGIN_THRESHOLD || '50', 10),
      geographicAnomalyThreshold: parseInt(process.env.GEOGRAPHIC_ANOMALY_THRESHOLD || '60', 10),
      deviceAnomalyThreshold: parseInt(process.env.DEVICE_ANOMALY_THRESHOLD || '50', 10),
      behavioralAnomalyThreshold: parseInt(process.env.BEHAVIORAL_ANOMALY_THRESHOLD || '40', 10),
      riskScoreThreshold: parseInt(process.env.RISK_SCORE_THRESHOLD || '70', 10),
      autoBlockEnabled: process.env.AUTO_BLOCK_ENABLED === 'true',
      notificationEnabled: process.env.NOTIFICATION_ENABLED === 'true',
      alertChannels: (process.env.ALERT_CHANNELS || 'email,slack').split(','),
    };
  }

  /**
   * Load security rules from database
   */
  private async loadSecurityRules(): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('security_rules')
        .select('*')
        .eq('is_enabled', true)
        .order('priority', { ascending: false });

      if (error) {
        logger.error('Error loading security rules:', error);
        return;
      }

      this.securityRules = data || [];
      logger.info(`Loaded ${this.securityRules.length} security rules`);
    } catch (error) {
      logger.error('Error loading security rules:', error);
    }
  }

  /**
   * Start monitoring for threats
   */
  private startMonitoring(): void {
    // Clean up old rate limits every 5 minutes
    setInterval(() => {
      const now = Date.now();
      
      for (const [key, limit] of this.ipRateLimits.entries()) {
        if (limit.resetTime <= now) {
          this.ipRateLimits.delete(key);
        }
      }
      
      for (const [key, limit] of this.userRateLimits.entries()) {
        if (limit.resetTime <= now) {
          this.userRateLimits.delete(key);
        }
      }
    }, 5 * 60 * 1000);

    // Clean up resolved threats every hour
    setInterval(async () => {
      await this.cleanupResolvedThreats();
    }, 60 * 60 * 1000);
  }

  /**
   * Clean up resolved threats
   */
  private async cleanupResolvedThreats(): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - 24); // 24 hours ago

      const { error } = await this.supabase
        .from('threat_indicators')
        .update({ is_active: false })
        .eq('is_active', true)
        .lt('timestamp', cutoffDate.toISOString());

      if (error) {
        logger.error('Error cleaning up resolved threats:', error);
      }
    } catch (error) {
      logger.error('Error cleaning up resolved threats:', error);
    }
  }

  /**
   * Get active threats
   */
  public getActiveThreats(): ThreatIndicator[] {
    return Array.from(this.activeThreats.values());
  }

  /**
   * Resolve threat
   */
  public async resolveThreat(threatId: string, resolvedBy: string, resolution: string): Promise<void> {
    try {
      await this.supabase
        .from('threat_indicators')
        .update({
          is_active: false,
          resolved_at: new Date().toISOString(),
          resolved_by: resolvedBy,
          resolution,
        })
        .eq('id', threatId);

      this.activeThreats.delete(threatId);
      logger.info(`Threat ${threatId} resolved by ${resolvedBy}`);
    } catch (error) {
      logger.error('Error resolving threat:', error);
      throw error;
    }
  }
}

// Export singleton instance
let threatDetectionInstance: ThreatDetectionService | null = null;

export const getThreatDetectionService = (
  supabase: SupabaseClient,
  auditLogger: AuditLogger
): ThreatDetectionService => {
  if (!threatDetectionInstance) {
    threatDetectionInstance = new ThreatDetectionService(supabase, auditLogger);
  }
  return threatDetectionInstance;
};
