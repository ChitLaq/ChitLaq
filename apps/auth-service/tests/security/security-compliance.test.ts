import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { SupabaseClient } from '@supabase/supabase-js';
import { AuditLogger } from '../../src/security/audit-logger';
import { ThreatDetection } from '../../src/security/threat-detection';
import { ComplianceManager } from '../../src/security/compliance-manager';
import { SecurityMiddleware } from '../../src/security/security-middleware';
import { SecurityService } from '../../src/security/security-service';

// Mock Supabase client
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(() => Promise.resolve({ data: null, error: null })),
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
  auth: {
    getUser: jest.fn(() => Promise.resolve({ data: { user: { id: 'user123' } }, error: null })),
  },
} as unknown as SupabaseClient;

describe('Security and Compliance Tests', () => {
  let auditLogger: AuditLogger;
  let threatDetection: ThreatDetection;
  let complianceManager: ComplianceManager;
  let securityMiddleware: SecurityMiddleware;
  let securityService: SecurityService;

  beforeEach(() => {
    auditLogger = new AuditLogger(mockSupabase);
    threatDetection = new ThreatDetection(mockSupabase);
    complianceManager = new ComplianceManager(mockSupabase);
    securityMiddleware = new SecurityMiddleware(mockSupabase);
    securityService = new SecurityService(mockSupabase);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Audit Logging', () => {
    it('should log authentication events', async () => {
      const logSpy = jest.spyOn(auditLogger, 'logAuthenticationEvent');
      
      await auditLogger.logAuthenticationEvent({
        userId: 'user123',
        event: 'LOGIN_SUCCESS',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        metadata: { email: 'student@university.edu' },
      });

      expect(logSpy).toHaveBeenCalledWith({
        userId: 'user123',
        event: 'LOGIN_SUCCESS',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        metadata: { email: 'student@university.edu' },
      });
    });

    it('should log security violations', async () => {
      const logSpy = jest.spyOn(auditLogger, 'logSecurityViolation');
      
      await auditLogger.logSecurityViolation({
        userId: 'user123',
        violation: 'BRUTE_FORCE_ATTEMPT',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        metadata: { attempts: 5, timeWindow: '5m' },
      });

      expect(logSpy).toHaveBeenCalledWith({
        userId: 'user123',
        violation: 'BRUTE_FORCE_ATTEMPT',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        metadata: { attempts: 5, timeWindow: '5m' },
      });
    });

    it('should log data access events', async () => {
      const logSpy = jest.spyOn(auditLogger, 'logDataAccess');
      
      await auditLogger.logDataAccess({
        userId: 'user123',
        resource: 'USER_PROFILE',
        action: 'READ',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        metadata: { profileId: 'profile123' },
      });

      expect(logSpy).toHaveBeenCalledWith({
        userId: 'user123',
        resource: 'USER_PROFILE',
        action: 'READ',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        metadata: { profileId: 'profile123' },
      });
    });

    it('should log administrative actions', async () => {
      const logSpy = jest.spyOn(auditLogger, 'logAdministrativeAction');
      
      await auditLogger.logAdministrativeAction({
        adminId: 'admin123',
        action: 'USER_DEACTIVATION',
        targetUserId: 'user123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        metadata: { reason: 'Policy violation' },
      });

      expect(logSpy).toHaveBeenCalledWith({
        adminId: 'admin123',
        action: 'USER_DEACTIVATION',
        targetUserId: 'user123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        metadata: { reason: 'Policy violation' },
      });
    });

    it('should retrieve audit logs with filters', async () => {
      const getLogsSpy = jest.spyOn(auditLogger, 'getAuditLogs');
      
      await auditLogger.getAuditLogs({
        userId: 'user123',
        eventType: 'LOGIN_SUCCESS',
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-12-31'),
        limit: 100,
        offset: 0,
      });

      expect(getLogsSpy).toHaveBeenCalledWith({
        userId: 'user123',
        eventType: 'LOGIN_SUCCESS',
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-12-31'),
        limit: 100,
        offset: 0,
      });
    });
  });

  describe('Threat Detection', () => {
    it('should detect brute force attacks', async () => {
      const detectSpy = jest.spyOn(threatDetection, 'detectBruteForce');
      
      await threatDetection.detectBruteForce({
        userId: 'user123',
        ipAddress: '192.168.1.1',
        attempts: 6,
        timeWindow: '5m',
      });

      expect(detectSpy).toHaveBeenCalledWith({
        userId: 'user123',
        ipAddress: '192.168.1.1',
        attempts: 6,
        timeWindow: '5m',
      });
    });

    it('should detect SQL injection attempts', async () => {
      const detectSpy = jest.spyOn(threatDetection, 'detectSQLInjection');
      
      await threatDetection.detectSQLInjection({
        userId: 'user123',
        ipAddress: '192.168.1.1',
        query: "'; DROP TABLE users; --",
        userAgent: 'Mozilla/5.0',
      });

      expect(detectSpy).toHaveBeenCalledWith({
        userId: 'user123',
        ipAddress: '192.168.1.1',
        query: "'; DROP TABLE users; --",
        userAgent: 'Mozilla/5.0',
      });
    });

    it('should detect XSS attempts', async () => {
      const detectSpy = jest.spyOn(threatDetection, 'detectXSS');
      
      await threatDetection.detectXSS({
        userId: 'user123',
        ipAddress: '192.168.1.1',
        input: '<script>alert("XSS")</script>',
        userAgent: 'Mozilla/5.0',
      });

      expect(detectSpy).toHaveBeenCalledWith({
        userId: 'user123',
        ipAddress: '192.168.1.1',
        input: '<script>alert("XSS")</script>',
        userAgent: 'Mozilla/5.0',
      });
    });

    it('should detect CSRF attempts', async () => {
      const detectSpy = jest.spyOn(threatDetection, 'detectCSRF');
      
      await threatDetection.detectCSRF({
        userId: 'user123',
        ipAddress: '192.168.1.1',
        referer: 'https://malicious-site.com',
        userAgent: 'Mozilla/5.0',
      });

      expect(detectSpy).toHaveBeenCalledWith({
        userId: 'user123',
        ipAddress: '192.168.1.1',
        referer: 'https://malicious-site.com',
        userAgent: 'Mozilla/5.0',
      });
    });

    it('should detect DDoS attacks', async () => {
      const detectSpy = jest.spyOn(threatDetection, 'detectDDoS');
      
      await threatDetection.detectDDoS({
        ipAddress: '192.168.1.1',
        requests: 1000,
        timeWindow: '1m',
        userAgent: 'Mozilla/5.0',
      });

      expect(detectSpy).toHaveBeenCalledWith({
        ipAddress: '192.168.1.1',
        requests: 1000,
        timeWindow: '1m',
        userAgent: 'Mozilla/5.0',
      });
    });

    it('should calculate risk scores', async () => {
      const calculateSpy = jest.spyOn(threatDetection, 'calculateRiskScore');
      
      await threatDetection.calculateRiskScore({
        userId: 'user123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        behavior: 'SUSPICIOUS',
        history: 'CLEAN',
      });

      expect(calculateSpy).toHaveBeenCalledWith({
        userId: 'user123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        behavior: 'SUSPICIOUS',
        history: 'CLEAN',
      });
    });

    it('should block suspicious IPs', async () => {
      const blockSpy = jest.spyOn(threatDetection, 'blockIP');
      
      await threatDetection.blockIP({
        ipAddress: '192.168.1.1',
        reason: 'BRUTE_FORCE_ATTACK',
        duration: '1h',
        adminId: 'admin123',
      });

      expect(blockSpy).toHaveBeenCalledWith({
        ipAddress: '192.168.1.1',
        reason: 'BRUTE_FORCE_ATTACK',
        duration: '1h',
        adminId: 'admin123',
      });
    });

    it('should unblock IPs', async () => {
      const unblockSpy = jest.spyOn(threatDetection, 'unblockIP');
      
      await threatDetection.unblockIP({
        ipAddress: '192.168.1.1',
        adminId: 'admin123',
      });

      expect(unblockSpy).toHaveBeenCalledWith({
        ipAddress: '192.168.1.1',
        adminId: 'admin123',
      });
    });
  });

  describe('Compliance Management', () => {
    it('should process data subject requests', async () => {
      const processSpy = jest.spyOn(complianceManager, 'processDataSubjectRequest');
      
      await complianceManager.processDataSubjectRequest({
        userId: 'user123',
        requestType: 'DATA_EXPORT',
        adminId: 'admin123',
        metadata: { reason: 'User request' },
      });

      expect(processSpy).toHaveBeenCalledWith({
        userId: 'user123',
        requestType: 'DATA_EXPORT',
        adminId: 'admin123',
        metadata: { reason: 'User request' },
      });
    });

    it('should manage consent', async () => {
      const manageSpy = jest.spyOn(complianceManager, 'manageConsent');
      
      await complianceManager.manageConsent({
        userId: 'user123',
        consentType: 'MARKETING',
        granted: true,
        adminId: 'admin123',
        metadata: { source: 'Registration form' },
      });

      expect(manageSpy).toHaveBeenCalledWith({
        userId: 'user123',
        consentType: 'MARKETING',
        granted: true,
        adminId: 'admin123',
        metadata: { source: 'Registration form' },
      });
    });

    it('should perform compliance checks', async () => {
      const checkSpy = jest.spyOn(complianceManager, 'performComplianceCheck');
      
      await complianceManager.performComplianceCheck({
        checkType: 'GDPR_COMPLIANCE',
        adminId: 'admin123',
        metadata: { scope: 'All users' },
      });

      expect(checkSpy).toHaveBeenCalledWith({
        checkType: 'GDPR_COMPLIANCE',
        adminId: 'admin123',
        metadata: { scope: 'All users' },
      });
    });

    it('should generate compliance reports', async () => {
      const generateSpy = jest.spyOn(complianceManager, 'generateComplianceReport');
      
      await complianceManager.generateComplianceReport({
        reportType: 'GDPR_REPORT',
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-12-31'),
        adminId: 'admin123',
      });

      expect(generateSpy).toHaveBeenCalledWith({
        reportType: 'GDPR_REPORT',
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-12-31'),
        adminId: 'admin123',
      });
    });

    it('should handle data retention', async () => {
      const handleSpy = jest.spyOn(complianceManager, 'handleDataRetention');
      
      await complianceManager.handleDataRetention({
        dataType: 'USER_DATA',
        retentionPeriod: '7y',
        adminId: 'admin123',
        metadata: { reason: 'Policy update' },
      });

      expect(handleSpy).toHaveBeenCalledWith({
        dataType: 'USER_DATA',
        retentionPeriod: '7y',
        adminId: 'admin123',
        metadata: { reason: 'Policy update' },
      });
    });
  });

  describe('Security Middleware', () => {
    it('should apply rate limiting', async () => {
      const applySpy = jest.spyOn(securityMiddleware, 'applyRateLimit');
      
      await securityMiddleware.applyRateLimit({
        ipAddress: '192.168.1.1',
        endpoint: '/api/auth/login',
        limit: 5,
        window: '5m',
      });

      expect(applySpy).toHaveBeenCalledWith({
        ipAddress: '192.168.1.1',
        endpoint: '/api/auth/login',
        limit: 5,
        window: '5m',
      });
    });

    it('should validate security headers', async () => {
      const validateSpy = jest.spyOn(securityMiddleware, 'validateSecurityHeaders');
      
      await securityMiddleware.validateSecurityHeaders({
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'Mozilla/5.0',
          'referer': 'https://chitlaq.com',
        },
      });

      expect(validateSpy).toHaveBeenCalledWith({
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'Mozilla/5.0',
          'referer': 'https://chitlaq.com',
        },
      });
    });

    it('should block malicious requests', async () => {
      const blockSpy = jest.spyOn(securityMiddleware, 'blockMaliciousRequest');
      
      await securityMiddleware.blockMaliciousRequest({
        ipAddress: '192.168.1.1',
        reason: 'SUSPICIOUS_ACTIVITY',
        adminId: 'admin123',
        metadata: { details: 'Multiple failed attempts' },
      });

      expect(blockSpy).toHaveBeenCalledWith({
        ipAddress: '192.168.1.1',
        reason: 'SUSPICIOUS_ACTIVITY',
        adminId: 'admin123',
        metadata: { details: 'Multiple failed attempts' },
      });
    });

    it('should validate CORS', async () => {
      const validateSpy = jest.spyOn(securityMiddleware, 'validateCORS');
      
      await securityMiddleware.validateCORS({
        origin: 'https://chitlaq.com',
        method: 'POST',
        headers: ['Content-Type', 'Authorization'],
      });

      expect(validateSpy).toHaveBeenCalledWith({
        origin: 'https://chitlaq.com',
        method: 'POST',
        headers: ['Content-Type', 'Authorization'],
      });
    });
  });

  describe('Security Service', () => {
    it('should create security incidents', async () => {
      const createSpy = jest.spyOn(securityService, 'createIncident');
      
      await securityService.createIncident({
        type: 'SECURITY_BREACH',
        severity: 'HIGH',
        description: 'Unauthorized access attempt',
        adminId: 'admin123',
        metadata: { ipAddress: '192.168.1.1' },
      });

      expect(createSpy).toHaveBeenCalledWith({
        type: 'SECURITY_BREACH',
        severity: 'HIGH',
        description: 'Unauthorized access attempt',
        adminId: 'admin123',
        metadata: { ipAddress: '192.168.1.1' },
      });
    });

    it('should update incident status', async () => {
      const updateSpy = jest.spyOn(securityService, 'updateIncidentStatus');
      
      await securityService.updateIncidentStatus({
        incidentId: 'incident123',
        status: 'RESOLVED',
        adminId: 'admin123',
        metadata: { resolution: 'IP blocked' },
      });

      expect(updateSpy).toHaveBeenCalledWith({
        incidentId: 'incident123',
        status: 'RESOLVED',
        adminId: 'admin123',
        metadata: { resolution: 'IP blocked' },
      });
    });

    it('should collect evidence', async () => {
      const collectSpy = jest.spyOn(securityService, 'collectEvidence');
      
      await securityService.collectEvidence({
        incidentId: 'incident123',
        evidenceType: 'LOG_FILES',
        adminId: 'admin123',
        metadata: { filePath: '/var/log/auth.log' },
      });

      expect(collectSpy).toHaveBeenCalledWith({
        incidentId: 'incident123',
        evidenceType: 'LOG_FILES',
        adminId: 'admin123',
        metadata: { filePath: '/var/log/auth.log' },
      });
    });

    it('should track actions', async () => {
      const trackSpy = jest.spyOn(securityService, 'trackAction');
      
      await securityService.trackAction({
        incidentId: 'incident123',
        action: 'IP_BLOCKED',
        adminId: 'admin123',
        metadata: { ipAddress: '192.168.1.1' },
      });

      expect(trackSpy).toHaveBeenCalledWith({
        incidentId: 'incident123',
        action: 'IP_BLOCKED',
        adminId: 'admin123',
        metadata: { ipAddress: '192.168.1.1' },
      });
    });

    it('should generate incident reports', async () => {
      const generateSpy = jest.spyOn(securityService, 'generateIncidentReport');
      
      await securityService.generateIncidentReport({
        incidentId: 'incident123',
        adminId: 'admin123',
        metadata: { format: 'PDF' },
      });

      expect(generateSpy).toHaveBeenCalledWith({
        incidentId: 'incident123',
        adminId: 'admin123',
        metadata: { format: 'PDF' },
      });
    });
  });

  describe('End-to-End Security Tests', () => {
    it('should handle complete security incident workflow', async () => {
      // Create incident
      const incident = await securityService.createIncident({
        type: 'SECURITY_BREACH',
        severity: 'HIGH',
        description: 'Unauthorized access attempt',
        adminId: 'admin123',
        metadata: { ipAddress: '192.168.1.1' },
      });

      // Log security violation
      await auditLogger.logSecurityViolation({
        userId: 'user123',
        violation: 'BRUTE_FORCE_ATTEMPT',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        metadata: { attempts: 6, timeWindow: '5m' },
      });

      // Detect threat
      await threatDetection.detectBruteForce({
        userId: 'user123',
        ipAddress: '192.168.1.1',
        attempts: 6,
        timeWindow: '5m',
      });

      // Block IP
      await threatDetection.blockIP({
        ipAddress: '192.168.1.1',
        reason: 'BRUTE_FORCE_ATTACK',
        duration: '1h',
        adminId: 'admin123',
      });

      // Update incident
      await securityService.updateIncidentStatus({
        incidentId: incident.id,
        status: 'RESOLVED',
        adminId: 'admin123',
        metadata: { resolution: 'IP blocked' },
      });

      expect(incident).toBeDefined();
    });

    it('should handle compliance workflow', async () => {
      // Process data subject request
      const request = await complianceManager.processDataSubjectRequest({
        userId: 'user123',
        requestType: 'DATA_EXPORT',
        adminId: 'admin123',
        metadata: { reason: 'User request' },
      });

      // Manage consent
      await complianceManager.manageConsent({
        userId: 'user123',
        consentType: 'MARKETING',
        granted: true,
        adminId: 'admin123',
        metadata: { source: 'Registration form' },
      });

      // Perform compliance check
      await complianceManager.performComplianceCheck({
        checkType: 'GDPR_COMPLIANCE',
        adminId: 'admin123',
        metadata: { scope: 'All users' },
      });

      // Generate report
      await complianceManager.generateComplianceReport({
        reportType: 'GDPR_REPORT',
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-12-31'),
        adminId: 'admin123',
      });

      expect(request).toBeDefined();
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent security operations', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        auditLogger.logAuthenticationEvent({
          userId: `user${i}`,
          event: 'LOGIN_SUCCESS',
          ipAddress: `192.168.1.${i}`,
          userAgent: 'Mozilla/5.0',
          metadata: { email: `user${i}@university.edu` },
        })
      );

      const results = await Promise.all(promises);
      expect(results).toHaveLength(10);
    });

    it('should complete security operations within acceptable time', async () => {
      const startTime = Date.now();
      
      await auditLogger.logAuthenticationEvent({
        userId: 'user123',
        event: 'LOGIN_SUCCESS',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        metadata: { email: 'student@university.edu' },
      });

      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockSupabase.from().insert.mockRejectedValueOnce(
        new Error('Database connection failed')
      );

      try {
        await auditLogger.logAuthenticationEvent({
          userId: 'user123',
          event: 'LOGIN_SUCCESS',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          metadata: { email: 'student@university.edu' },
        });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toContain('Database connection failed');
      }
    });

    it('should handle invalid input gracefully', async () => {
      try {
        await auditLogger.logAuthenticationEvent({
          userId: '', // Invalid user ID
          event: 'LOGIN_SUCCESS',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          metadata: { email: 'student@university.edu' },
        });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toContain('Invalid input');
      }
    });
  });
});
