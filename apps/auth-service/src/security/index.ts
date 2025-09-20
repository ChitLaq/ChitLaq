// Security module exports
export { AuditLogger, AuditEventType, AuditSeverity } from './audit-logger';
export { ThreatDetectionService, ThreatType, ThreatSeverity } from './threat-detection';
export { 
  ComplianceManager, 
  ComplianceType, 
  ComplianceCategory, 
  ComplianceStatus,
  DataSubjectRequestType,
  DataSubjectRequestStatus,
  ConsentType
} from './compliance-manager';
export { SecurityMiddleware, SecurityConfig, SecurityContext } from './security-middleware';
export { 
  SecurityService,
  SecurityIncidentType,
  SecurityIncidentSeverity,
  SecurityIncidentStatus,
  SecurityIncidentPriority,
  EvidenceType,
  ActionType,
  ActionStatus,
  ActionPriority,
  TimelineEventCategory
} from './security-service';

// Re-export types for convenience
export type {
  SecurityIncident,
  SecurityEvidence,
  SecurityAction,
  SecurityTimelineEvent,
  SecurityMetrics,
  ComplianceRule,
  ComplianceRequirement,
  ComplianceCheck,
  ComplianceFinding,
  DataSubjectRequest,
  ConsentRecord,
  ThreatIndicator,
  SecurityRule,
  SecurityCondition,
  SecurityAction as SecurityRuleAction,
} from './security-service';

export type {
  ComplianceRequirement as ComplianceRequirementType,
  ComplianceCheck as ComplianceCheckType,
  ComplianceFinding as ComplianceFindingType,
  DataSubjectRequest as DataSubjectRequestType,
  ConsentRecord as ConsentRecordType,
} from './compliance-manager';

export type {
  ThreatIndicator as ThreatIndicatorType,
  SecurityRule as SecurityRuleType,
  SecurityCondition as SecurityConditionType,
  SecurityAction as SecurityRuleActionType,
} from './threat-detection';

// Security service factory
import { SupabaseClient } from '@supabase/supabase-js';
import { AuditLogger } from './audit-logger';
import { ThreatDetectionService } from './threat-detection';
import { ComplianceManager } from './compliance-manager';
import { SecurityMiddleware } from './security-middleware';
import { SecurityService } from './security-service';

export class SecurityModule {
  private auditLogger: AuditLogger;
  private threatDetection: ThreatDetectionService;
  private complianceManager: ComplianceManager;
  private securityMiddleware: SecurityMiddleware;
  private securityService: SecurityService;

  constructor(supabase: SupabaseClient) {
    // Initialize audit logger first
    this.auditLogger = new AuditLogger(supabase);

    // Initialize other services with dependencies
    this.threatDetection = new ThreatDetectionService(supabase, this.auditLogger);
    this.complianceManager = new ComplianceManager(supabase, this.auditLogger);
    this.securityMiddleware = new SecurityMiddleware(
      supabase,
      this.auditLogger,
      this.threatDetection,
      this.complianceManager
    );
    this.securityService = new SecurityService(
      supabase,
      this.auditLogger,
      this.threatDetection,
      this.complianceManager,
      this.securityMiddleware
    );
  }

  public getAuditLogger(): AuditLogger {
    return this.auditLogger;
  }

  public getThreatDetection(): ThreatDetectionService {
    return this.threatDetection;
  }

  public getComplianceManager(): ComplianceManager {
    return this.complianceManager;
  }

  public getSecurityMiddleware(): SecurityMiddleware {
    return this.securityMiddleware;
  }

  public getSecurityService(): SecurityService {
    return this.securityService;
  }

  public async initialize(): Promise<void> {
    // Initialize all security components
    await this.auditLogger.initialize();
    // Other services are initialized in their constructors
  }

  public async shutdown(): Promise<void> {
    // Cleanup resources if needed
    // Most services don't need explicit shutdown
  }
}

// Export singleton instance
let securityModuleInstance: SecurityModule | null = null;

export const getSecurityModule = (supabase: SupabaseClient): SecurityModule => {
  if (!securityModuleInstance) {
    securityModuleInstance = new SecurityModule(supabase);
  }
  return securityModuleInstance;
};
