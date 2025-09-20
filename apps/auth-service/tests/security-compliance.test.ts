import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { SupabaseClient } from '@supabase/supabase-js';
import { getSecurityModule } from '../src/security';
import { getSecurityIntegration } from '../src/middleware/security-integration';
import { AuditEventType, AuditSeverity } from '../src/security/audit-logger';
import { ThreatType, ThreatSeverity } from '../src/security/threat-detection';
import { ComplianceType, ComplianceCategory, ComplianceStatus } from '../src/security/compliance-manager';
import { SecurityIncidentType, SecurityIncidentSeverity, SecurityIncidentStatus } from '../src/security/security-service';

// Mock Supabase client
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        gte: jest.fn(() => ({
          limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
    })),
    insert: jest.fn(() => Promise.resolve({ data: [], error: null })),
    update: jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve({ data: [], error: null })),
    })),
    delete: jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve({ data: [], error: null })),
    })),
  })),
} as unknown as SupabaseClient;

describe('Security & Compliance System', () => {
  let securityModule: any;
  let securityIntegration: any;

  beforeEach(() => {
    securityModule = getSecurityModule(mockSupabase);
    securityIntegration = getSecurityIntegration(mockSupabase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Audit Logging', () => {
    it('should log security events', async () => {
      const auditLogger = securityModule.getAuditLogger();
      
      await auditLogger.logSecurityEvent(
        AuditEventType.LOGIN_SUCCESS,
        'User logged in successfully',
        { userId: 'user123', ipAddress: '192.168.1.1' },
        { userId: 'user123', ipAddress: '192.168.1.1', severity: AuditSeverity.LOW }
      );

      expect(mockSupabase.from).toHaveBeenCalledWith('audit_logs');
    });

    it('should log authentication events', async () => {
      await securityIntegration.logAuthenticationEvent(
        AuditEventType.LOGIN_SUCCESS,
        'user123',
        '192.168.1.1',
        'Mozilla/5.0...',
        true,
        { loginMethod: 'email' }
      );

      expect(mockSupabase.from).toHaveBeenCalledWith('audit_logs');
    });

    it('should log authorization events', async () => {
      await securityIntegration.logAuthorizationEvent(
        AuditEventType.ACCESS_GRANTED,
        'user123',
        'user-profile',
        'read',
        true,
        '192.168.1.1',
        'Mozilla/5.0...',
        { resourceId: 'profile123' }
      );

      expect(mockSupabase.from).toHaveBeenCalledWith('audit_logs');
    });

    it('should log data access events', async () => {
      await securityIntegration.logDataAccessEvent(
        AuditEventType.DATA_ACCESS,
        'user123',
        'user-profile',
        'read',
        '192.168.1.1',
        'Mozilla/5.0...',
        { dataId: 'profile123' }
      );

      expect(mockSupabase.from).toHaveBeenCalledWith('audit_logs');
    });
  });

  describe('Threat Detection', () => {
    it('should analyze login attempts for threats', async () => {
      const threatDetection = securityModule.getThreatDetection();
      
      const threats = await threatDetection.analyzeLoginAttempt(
        'user123',
        '192.168.1.1',
        'Mozilla/5.0...',
        false,
        { loginMethod: 'email' }
      );

      expect(Array.isArray(threats)).toBe(true);
    });

    it('should analyze requests for malicious patterns', async () => {
      const threatDetection = securityModule.getThreatDetection();
      
      const threats = await threatDetection.analyzeRequest(
        'user123',
        '192.168.1.1',
        'Mozilla/5.0...',
        {
          method: 'POST',
          url: '/api/auth/login',
          headers: { 'Content-Type': 'application/json' },
          body: { email: 'test@example.com', password: 'password123' },
        }
      );

      expect(Array.isArray(threats)).toBe(true);
    });

    it('should detect brute force attacks', async () => {
      const threatDetection = securityModule.getThreatDetection();
      
      // Simulate multiple failed login attempts
      for (let i = 0; i < 6; i++) {
        await threatDetection.analyzeLoginAttempt(
          'user123',
          '192.168.1.1',
          'Mozilla/5.0...',
          false,
          { attempt: i + 1 }
        );
      }

      const activeThreats = threatDetection.getActiveThreats();
      expect(activeThreats.length).toBeGreaterThan(0);
    });

    it('should detect SQL injection attempts', async () => {
      const threatDetection = securityModule.getThreatDetection();
      
      const threats = await threatDetection.analyzeRequest(
        'user123',
        '192.168.1.1',
        'Mozilla/5.0...',
        {
          method: 'POST',
          url: '/api/auth/login',
          headers: { 'Content-Type': 'application/json' },
          body: { email: "'; DROP TABLE users; --", password: 'password123' },
        }
      );

      const sqlInjectionThreats = threats.filter(threat => threat.type === ThreatType.SQL_INJECTION);
      expect(sqlInjectionThreats.length).toBeGreaterThan(0);
    });

    it('should detect XSS attempts', async () => {
      const threatDetection = securityModule.getThreatDetection();
      
      const threats = await threatDetection.analyzeRequest(
        'user123',
        '192.168.1.1',
        'Mozilla/5.0...',
        {
          method: 'POST',
          url: '/api/auth/login',
          headers: { 'Content-Type': 'application/json' },
          body: { email: '<script>alert("xss")</script>', password: 'password123' },
        }
      );

      const xssThreats = threats.filter(threat => threat.type === ThreatType.XSS_ATTACK);
      expect(xssThreats.length).toBeGreaterThan(0);
    });

    it('should resolve threats', async () => {
      const threatDetection = securityModule.getThreatDetection();
      
      // Create a threat first
      await threatDetection.analyzeLoginAttempt(
        'user123',
        '192.168.1.1',
        'Mozilla/5.0...',
        false,
        { loginMethod: 'email' }
      );

      const activeThreats = threatDetection.getActiveThreats();
      if (activeThreats.length > 0) {
        const threatId = activeThreats[0].id;
        await threatDetection.resolveThreat(threatId, 'admin', 'False positive');
        
        const updatedThreats = threatDetection.getActiveThreats();
        expect(updatedThreats.find(t => t.id === threatId)).toBeUndefined();
      }
    });
  });

  describe('Compliance Management', () => {
    it('should run compliance checks', async () => {
      const complianceManager = securityModule.getComplianceManager();
      
      const check = await complianceManager.runComplianceCheck(
        'rule123',
        'admin'
      );

      expect(check).toBeDefined();
      expect(check.ruleId).toBe('rule123');
      expect(check.checkedBy).toBe('admin');
    });

    it('should process data subject requests', async () => {
      const complianceManager = securityModule.getComplianceManager();
      
      const request = await complianceManager.processDataSubjectRequest({
        type: 'access',
        userId: 'user123',
        requestedBy: 'user123',
        priority: 'medium',
        notes: 'User requested access to their data',
      });

      expect(request).toBeDefined();
      expect(request.type).toBe('access');
      expect(request.userId).toBe('user123');
    });

    it('should record user consent', async () => {
      const complianceManager = securityModule.getComplianceManager();
      
      const consent = await complianceManager.recordConsent(
        'user123',
        'marketing',
        'Email marketing',
        true,
        '192.168.1.1',
        'Mozilla/5.0...',
        'User clicked accept button'
      );

      expect(consent).toBeDefined();
      expect(consent.userId).toBe('user123');
      expect(consent.consentType).toBe('marketing');
      expect(consent.granted).toBe(true);
    });

    it('should get compliance status', () => {
      const complianceManager = securityModule.getComplianceManager();
      
      const status = complianceManager.getComplianceStatus();
      expect(Array.isArray(status)).toBe(true);
    });

    it('should get active compliance checks', () => {
      const complianceManager = securityModule.getComplianceManager();
      
      const checks = complianceManager.getActiveChecks();
      expect(Array.isArray(checks)).toBe(true);
    });
  });

  describe('Security Incidents', () => {
    it('should create security incidents', async () => {
      const securityService = securityModule.getSecurityService();
      
      const incident = await securityService.createSecurityIncident(
        SecurityIncidentType.UNAUTHORIZED_ACCESS,
        SecurityIncidentSeverity.HIGH,
        'Unauthorized access attempt',
        'Multiple failed login attempts detected',
        'admin',
        ['user123'],
        ['auth-service'],
        ['brute-force', 'unauthorized-access']
      );

      expect(incident).toBeDefined();
      expect(incident.type).toBe(SecurityIncidentType.UNAUTHORIZED_ACCESS);
      expect(incident.severity).toBe(SecurityIncidentSeverity.HIGH);
      expect(incident.status).toBe(SecurityIncidentStatus.DETECTED);
    });

    it('should update incident status', async () => {
      const securityService = securityModule.getSecurityService();
      
      // Create incident first
      const incident = await securityService.createSecurityIncident(
        SecurityIncidentType.UNAUTHORIZED_ACCESS,
        SecurityIncidentSeverity.HIGH,
        'Unauthorized access attempt',
        'Multiple failed login attempts detected',
        'admin',
        ['user123'],
        ['auth-service'],
        ['brute-force', 'unauthorized-access']
      );

      // Update status
      await securityService.updateIncidentStatus(
        incident.id,
        SecurityIncidentStatus.INVESTIGATING,
        'admin',
        'Starting investigation'
      );

      const updatedIncident = securityService.getIncident(incident.id);
      expect(updatedIncident.status).toBe(SecurityIncidentStatus.INVESTIGATING);
    });

    it('should add evidence to incidents', async () => {
      const securityService = securityModule.getSecurityService();
      
      // Create incident first
      const incident = await securityService.createSecurityIncident(
        SecurityIncidentType.UNAUTHORIZED_ACCESS,
        SecurityIncidentSeverity.HIGH,
        'Unauthorized access attempt',
        'Multiple failed login attempts detected',
        'admin',
        ['user123'],
        ['auth-service'],
        ['brute-force', 'unauthorized-access']
      );

      // Add evidence
      const evidence = await securityService.addEvidence(
        incident.id,
        'log_file',
        'Authentication logs',
        'auth-service',
        'admin',
        Buffer.from('log data')
      );

      expect(evidence).toBeDefined();
      expect(evidence.type).toBe('log_file');
      expect(evidence.description).toBe('Authentication logs');
    });

    it('should create security actions', async () => {
      const securityService = securityModule.getSecurityService();
      
      // Create incident first
      const incident = await securityService.createSecurityIncident(
        SecurityIncidentType.UNAUTHORIZED_ACCESS,
        SecurityIncidentSeverity.HIGH,
        'Unauthorized access attempt',
        'Multiple failed login attempts detected',
        'admin',
        ['user123'],
        ['auth-service'],
        ['brute-force', 'unauthorized-access']
      );

      // Create action
      const action = await securityService.createSecurityAction(
        incident.id,
        'investigate',
        'Investigate unauthorized access attempt',
        'security-team',
        new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        'high'
      );

      expect(action).toBeDefined();
      expect(action.type).toBe('investigate');
      expect(action.assignedTo).toBe('security-team');
    });

    it('should complete security actions', async () => {
      const securityService = securityModule.getSecurityService();
      
      // Create incident first
      const incident = await securityService.createSecurityIncident(
        SecurityIncidentType.UNAUTHORIZED_ACCESS,
        SecurityIncidentSeverity.HIGH,
        'Unauthorized access attempt',
        'Multiple failed login attempts detected',
        'admin',
        ['user123'],
        ['auth-service'],
        ['brute-force', 'unauthorized-access']
      );

      // Create action
      const action = await securityService.createSecurityAction(
        incident.id,
        'investigate',
        'Investigate unauthorized access attempt',
        'security-team',
        new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        'high'
      );

      // Complete action
      await securityService.completeSecurityAction(
        action.id,
        'security-team',
        'Investigation completed - false positive'
      );

      const updatedIncident = securityService.getIncident(incident.id);
      const updatedAction = updatedIncident.actions.find((a: any) => a.id === action.id);
      expect(updatedAction.status).toBe('completed');
      expect(updatedAction.completedBy).toBe('security-team');
    });

    it('should get security metrics', async () => {
      const securityService = securityModule.getSecurityService();
      
      const metrics = await securityService.getSecurityMetrics();
      expect(metrics).toBeDefined();
      expect(metrics.totalIncidents).toBeDefined();
      expect(metrics.openIncidents).toBeDefined();
      expect(metrics.resolvedIncidents).toBeDefined();
      expect(metrics.averageResolutionTime).toBeDefined();
    });

    it('should get active incidents', () => {
      const securityService = securityModule.getSecurityService();
      
      const incidents = securityService.getActiveIncidents();
      expect(Array.isArray(incidents)).toBe(true);
    });
  });

  describe('Security Middleware', () => {
    it('should provide security middleware stack', () => {
      const securityMiddleware = securityModule.getSecurityMiddleware();
      
      const middlewareStack = securityIntegration.getSecurityMiddlewareStack();
      expect(Array.isArray(middlewareStack)).toBe(true);
      expect(middlewareStack.length).toBeGreaterThan(0);
    });

    it('should get security statistics', () => {
      const stats = securityIntegration.getSecurityStats();
      expect(stats).toBeDefined();
      expect(stats.blockedIPs).toBeDefined();
      expect(stats.blockedUsers).toBeDefined();
      expect(stats.suspiciousIPs).toBeDefined();
      expect(stats.activeThreats).toBeDefined();
    });

    it('should block and unblock IP addresses', () => {
      const ipAddress = '192.168.1.100';
      const reason = 'Suspicious activity';
      
      securityIntegration.blockIP(ipAddress, reason);
      let stats = securityIntegration.getSecurityStats();
      expect(stats.blockedIPs).toBeGreaterThan(0);
      
      securityIntegration.unblockIP(ipAddress);
      stats = securityIntegration.getSecurityStats();
      expect(stats.blockedIPs).toBe(0);
    });

    it('should block and unblock users', () => {
      const userId = 'user123';
      const reason = 'Policy violation';
      
      securityIntegration.blockUser(userId, reason);
      let stats = securityIntegration.getSecurityStats();
      expect(stats.blockedUsers).toBeGreaterThan(0);
      
      securityIntegration.unblockUser(userId);
      stats = securityIntegration.getSecurityStats();
      expect(stats.blockedUsers).toBe(0);
    });
  });

  describe('Security Integration', () => {
    it('should initialize successfully', async () => {
      await expect(securityIntegration.initialize()).resolves.not.toThrow();
    });

    it('should get security configuration', () => {
      const config = securityIntegration.getConfig();
      expect(config).toBeDefined();
      expect(config.enableThreatDetection).toBeDefined();
      expect(config.enableComplianceMonitoring).toBeDefined();
      expect(config.enableAuditLogging).toBeDefined();
    });

    it('should update security configuration', () => {
      const newConfig = {
        enableThreatDetection: false,
        enableComplianceMonitoring: true,
      };
      
      securityIntegration.updateConfig(newConfig);
      const updatedConfig = securityIntegration.getConfig();
      expect(updatedConfig.enableThreatDetection).toBe(false);
      expect(updatedConfig.enableComplianceMonitoring).toBe(true);
    });

    it('should shutdown gracefully', async () => {
      await expect(securityIntegration.shutdown()).resolves.not.toThrow();
    });
  });

  describe('End-to-End Security Flow', () => {
    it('should handle complete security incident workflow', async () => {
      // 1. Detect threat
      const threats = await securityIntegration.analyzeLoginAttempt(
        'user123',
        '192.168.1.1',
        'Mozilla/5.0...',
        false,
        { attempt: 1 }
      );

      // 2. Create incident if threat detected
      if (threats.length > 0) {
        const incident = await securityIntegration.createSecurityIncident(
          SecurityIncidentType.UNAUTHORIZED_ACCESS,
          SecurityIncidentSeverity.HIGH,
          'Brute force attack detected',
          'Multiple failed login attempts from same IP',
          'system',
          ['user123'],
          ['auth-service'],
          ['brute-force', 'unauthorized-access']
        );

        expect(incident).toBeDefined();
        expect(incident.status).toBe(SecurityIncidentStatus.DETECTED);

        // 3. Add evidence
        const evidence = await securityIntegration.addEvidence(
          incident.id,
          'log_file',
          'Authentication logs',
          'auth-service',
          'admin',
          Buffer.from('log data')
        );

        expect(evidence).toBeDefined();

        // 4. Create action
        const action = await securityIntegration.createSecurityAction(
          incident.id,
          'investigate',
          'Investigate brute force attack',
          'security-team',
          new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
          'high'
        );

        expect(action).toBeDefined();

        // 5. Complete action
        await securityIntegration.completeSecurityAction(
          action.id,
          'security-team',
          'Investigation completed - IP blocked'
        );

        // 6. Update incident status
        await securityIntegration.updateIncidentStatus(
          incident.id,
          SecurityIncidentStatus.CONTAINED,
          'security-team',
          'Threat contained - IP blocked'
        );

        const updatedIncident = securityIntegration.getIncident(incident.id);
        expect(updatedIncident.status).toBe(SecurityIncidentStatus.CONTAINED);
      }
    });

    it('should handle compliance workflow', async () => {
      // 1. Run compliance check
      const check = await securityIntegration.runComplianceCheck(
        'data_retention_rule',
        'admin'
      );

      expect(check).toBeDefined();

      // 2. Process data subject request
      const request = await securityIntegration.processDataSubjectRequest({
        type: 'access',
        userId: 'user123',
        requestedBy: 'user123',
        priority: 'medium',
        notes: 'User requested access to their data',
      });

      expect(request).toBeDefined();

      // 3. Record consent
      const consent = await securityIntegration.recordConsent(
        'user123',
        'marketing',
        'Email marketing',
        true,
        '192.168.1.1',
        'Mozilla/5.0...',
        'User clicked accept button'
      );

      expect(consent).toBeDefined();

      // 4. Get compliance status
      const status = securityIntegration.getComplianceStatus();
      expect(Array.isArray(status)).toBe(true);
    });
  });
});
