import { getLogger } from '../../../utils/logger';
import { SupabaseClient } from '@supabase/supabase-js';
import { AuditLogger, AuditEventType, AuditSeverity } from './audit-logger';
import crypto from 'crypto';

const logger = getLogger('ComplianceManager');

export interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  type: ComplianceType;
  category: ComplianceCategory;
  requirements: ComplianceRequirement[];
  isEnabled: boolean;
  priority: number;
  lastChecked?: string;
  lastStatus: ComplianceStatus;
}

export interface ComplianceRequirement {
  id: string;
  description: string;
  type: RequirementType;
  parameters: Record<string, any>;
  isRequired: boolean;
  weight: number;
}

export enum ComplianceType {
  DATA_RETENTION = 'data_retention',
  DATA_DELETION = 'data_deletion',
  ACCESS_CONTROL = 'access_control',
  ENCRYPTION = 'encryption',
  AUDIT_LOGGING = 'audit_logging',
  CONSENT_MANAGEMENT = 'consent_management',
  DATA_PORTABILITY = 'data_portability',
  PRIVACY_BY_DESIGN = 'privacy_by_design',
  SECURITY_CONTROLS = 'security_controls',
  INCIDENT_RESPONSE = 'incident_response',
}

export enum ComplianceCategory {
  GDPR = 'gdpr',
  CCPA = 'ccpa',
  FERPA = 'ferpa',
  COPPA = 'coppa',
  HIPAA = 'hipaa',
  SOC2 = 'soc2',
  ISO27001 = 'iso27001',
  PCI_DSS = 'pci_dss',
  CUSTOM = 'custom',
}

export enum ComplianceStatus {
  COMPLIANT = 'compliant',
  NON_COMPLIANT = 'non_compliant',
  PARTIALLY_COMPLIANT = 'partially_compliant',
  NOT_APPLICABLE = 'not_applicable',
  PENDING_REVIEW = 'pending_review',
}

export enum RequirementType {
  DATA_ENCRYPTION = 'data_encryption',
  ACCESS_LOGGING = 'access_logging',
  CONSENT_TRACKING = 'consent_tracking',
  DATA_RETENTION_PERIOD = 'data_retention_period',
  DATA_DELETION_CAPABILITY = 'data_deletion_capability',
  AUDIT_TRAIL = 'audit_trail',
  SECURITY_CONTROLS = 'security_controls',
  PRIVACY_POLICY = 'privacy_policy',
  DATA_PORTABILITY_FORMAT = 'data_portability_format',
  INCIDENT_NOTIFICATION = 'incident_notification',
}

export interface ComplianceCheck {
  id: string;
  ruleId: string;
  status: ComplianceStatus;
  score: number;
  findings: ComplianceFinding[];
  timestamp: string;
  checkedBy: string;
  nextCheckDate: string;
}

export interface ComplianceFinding {
  id: string;
  requirementId: string;
  status: ComplianceStatus;
  description: string;
  evidence: string[];
  recommendations: string[];
  severity: ComplianceSeverity;
  autoRemediable: boolean;
  remediatedAt?: string;
  remediatedBy?: string;
}

export enum ComplianceSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface DataSubjectRequest {
  id: string;
  type: DataSubjectRequestType;
  userId: string;
  status: DataSubjectRequestStatus;
  requestedAt: string;
  completedAt?: string;
  requestedBy: string;
  processedBy?: string;
  data?: any;
  notes?: string;
  priority: DataSubjectRequestPriority;
}

export enum DataSubjectRequestType {
  ACCESS = 'access',
  RECTIFICATION = 'rectification',
  ERASURE = 'erasure',
  PORTABILITY = 'portability',
  RESTRICTION = 'restriction',
  OBJECTION = 'objection',
  CONSENT_WITHDRAWAL = 'consent_withdrawal',
}

export enum DataSubjectRequestStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

export enum DataSubjectRequestPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export interface ConsentRecord {
  id: string;
  userId: string;
  consentType: ConsentType;
  purpose: string;
  granted: boolean;
  grantedAt: string;
  withdrawnAt?: string;
  version: string;
  ipAddress: string;
  userAgent: string;
  evidence: string;
}

export enum ConsentType {
  MARKETING = 'marketing',
  ANALYTICS = 'analytics',
  FUNCTIONAL = 'functional',
  NECESSARY = 'necessary',
  PERSONALIZATION = 'personalization',
  THIRD_PARTY = 'third_party',
}

export class ComplianceManager {
  private supabase: SupabaseClient;
  private auditLogger: AuditLogger;
  private complianceRules: ComplianceRule[] = [];
  private activeChecks: Map<string, ComplianceCheck> = new Map();

  constructor(supabase: SupabaseClient, auditLogger: AuditLogger) {
    this.supabase = supabase;
    this.auditLogger = auditLogger;
    this.loadComplianceRules();
    this.startComplianceMonitoring();
  }

  /**
   * Run compliance check for a specific rule
   */
  public async runComplianceCheck(ruleId: string, checkedBy: string): Promise<ComplianceCheck> {
    try {
      const rule = this.complianceRules.find(r => r.id === ruleId);
      if (!rule) {
        throw new Error(`Compliance rule not found: ${ruleId}`);
      }

      logger.info(`Running compliance check for rule: ${rule.name}`);

      const check: ComplianceCheck = {
        id: crypto.randomUUID(),
        ruleId,
        status: ComplianceStatus.PENDING_REVIEW,
        score: 0,
        findings: [],
        timestamp: new Date().toISOString(),
        checkedBy,
        nextCheckDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      };

      // Check each requirement
      for (const requirement of rule.requirements) {
        const finding = await this.checkRequirement(requirement, rule);
        check.findings.push(finding);
      }

      // Calculate overall score and status
      check.score = this.calculateComplianceScore(check.findings);
      check.status = this.determineComplianceStatus(check.findings);

      // Store check result
      await this.supabase
        .from('compliance_checks')
        .insert({
          id: check.id,
          rule_id: check.ruleId,
          status: check.status,
          score: check.score,
          findings: check.findings,
          timestamp: check.timestamp,
          checked_by: check.checkedBy,
          next_check_date: check.nextCheckDate,
        });

      // Update rule status
      rule.lastChecked = check.timestamp;
      rule.lastStatus = check.status;

      // Log compliance check
      await this.auditLogger.logSecurityEvent(
        AuditEventType.COMPLIANCE_CHECK,
        `Compliance check completed for rule: ${rule.name}`,
        {
          ruleId: rule.id,
          ruleName: rule.name,
          status: check.status,
          score: check.score,
          findingsCount: check.findings.length,
          checkedBy,
        },
        {
          userId: checkedBy,
          severity: this.mapComplianceStatusToAuditSeverity(check.status),
          complianceScore: check.score,
        }
      );

      this.activeChecks.set(check.id, check);
      logger.info(`Compliance check completed: ${rule.name} - ${check.status} (${check.score}%)`);

      return check;
    } catch (error) {
      logger.error('Error running compliance check:', error);
      throw error;
    }
  }

  /**
   * Check individual compliance requirement
   */
  private async checkRequirement(
    requirement: ComplianceRequirement,
    rule: ComplianceRule
  ): Promise<ComplianceFinding> {
    const finding: ComplianceFinding = {
      id: crypto.randomUUID(),
      requirementId: requirement.id,
      status: ComplianceStatus.PENDING_REVIEW,
      description: requirement.description,
      evidence: [],
      recommendations: [],
      severity: ComplianceSeverity.MEDIUM,
      autoRemediable: false,
    };

    try {
      switch (requirement.type) {
        case RequirementType.DATA_ENCRYPTION:
          finding.status = await this.checkDataEncryption(requirement, finding);
          break;
        case RequirementType.ACCESS_LOGGING:
          finding.status = await this.checkAccessLogging(requirement, finding);
          break;
        case RequirementType.CONSENT_TRACKING:
          finding.status = await this.checkConsentTracking(requirement, finding);
          break;
        case RequirementType.DATA_RETENTION_PERIOD:
          finding.status = await this.checkDataRetentionPeriod(requirement, finding);
          break;
        case RequirementType.DATA_DELETION_CAPABILITY:
          finding.status = await this.checkDataDeletionCapability(requirement, finding);
          break;
        case RequirementType.AUDIT_TRAIL:
          finding.status = await this.checkAuditTrail(requirement, finding);
          break;
        case RequirementType.SECURITY_CONTROLS:
          finding.status = await this.checkSecurityControls(requirement, finding);
          break;
        case RequirementType.PRIVACY_POLICY:
          finding.status = await this.checkPrivacyPolicy(requirement, finding);
          break;
        case RequirementType.DATA_PORTABILITY_FORMAT:
          finding.status = await this.checkDataPortabilityFormat(requirement, finding);
          break;
        case RequirementType.INCIDENT_NOTIFICATION:
          finding.status = await this.checkIncidentNotification(requirement, finding);
          break;
        default:
          finding.status = ComplianceStatus.NOT_APPLICABLE;
          finding.description = `Unknown requirement type: ${requirement.type}`;
      }

      // Set severity based on status
      finding.severity = this.mapComplianceStatusToSeverity(finding.status, requirement.isRequired);

      return finding;
    } catch (error) {
      logger.error(`Error checking requirement ${requirement.id}:`, error);
      finding.status = ComplianceStatus.NON_COMPLIANT;
      finding.description = `Error checking requirement: ${error.message}`;
      finding.severity = ComplianceSeverity.HIGH;
      return finding;
    }
  }

  /**
   * Check data encryption compliance
   */
  private async checkDataEncryption(
    requirement: ComplianceRequirement,
    finding: ComplianceFinding
  ): Promise<ComplianceStatus> {
    try {
      // Check if sensitive data is encrypted
      const { data: encryptionStatus, error } = await this.supabase
        .from('encryption_status')
        .select('*')
        .eq('table_name', 'users')
        .eq('column_name', 'email');

      if (error) {
        finding.evidence.push(`Error querying encryption status: ${error.message}`);
        return ComplianceStatus.NON_COMPLIANT;
      }

      if (!encryptionStatus || encryptionStatus.length === 0) {
        finding.evidence.push('No encryption status found for sensitive data');
        finding.recommendations.push('Implement encryption for sensitive data columns');
        return ComplianceStatus.NON_COMPLIANT;
      }

      const isEncrypted = encryptionStatus[0].is_encrypted;
      if (isEncrypted) {
        finding.evidence.push('Sensitive data is encrypted');
        return ComplianceStatus.COMPLIANT;
      } else {
        finding.evidence.push('Sensitive data is not encrypted');
        finding.recommendations.push('Enable encryption for sensitive data columns');
        return ComplianceStatus.NON_COMPLIANT;
      }
    } catch (error) {
      finding.evidence.push(`Error checking encryption: ${error.message}`);
      return ComplianceStatus.NON_COMPLIANT;
    }
  }

  /**
   * Check access logging compliance
   */
  private async checkAccessLogging(
    requirement: ComplianceRequirement,
    finding: ComplianceFinding
  ): Promise<ComplianceStatus> {
    try {
      // Check if access logs are being maintained
      const { data: accessLogs, error } = await this.supabase
        .from('audit_logs')
        .select('*')
        .in('event_type', [AuditEventType.LOGIN_SUCCESS, AuditEventType.LOGIN_FAILURE])
        .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
        .limit(1);

      if (error) {
        finding.evidence.push(`Error querying access logs: ${error.message}`);
        return ComplianceStatus.NON_COMPLIANT;
      }

      if (!accessLogs || accessLogs.length === 0) {
        finding.evidence.push('No access logs found in the last 24 hours');
        finding.recommendations.push('Ensure access logging is enabled and functioning');
        return ComplianceStatus.NON_COMPLIANT;
      }

      finding.evidence.push(`Access logs are being maintained (${accessLogs.length} entries found)`);
      return ComplianceStatus.COMPLIANT;
    } catch (error) {
      finding.evidence.push(`Error checking access logging: ${error.message}`);
      return ComplianceStatus.NON_COMPLIANT;
    }
  }

  /**
   * Check consent tracking compliance
   */
  private async checkConsentTracking(
    requirement: ComplianceRequirement,
    finding: ComplianceFinding
  ): Promise<ComplianceStatus> {
    try {
      // Check if consent records are being maintained
      const { data: consentRecords, error } = await this.supabase
        .from('consent_records')
        .select('*')
        .gte('granted_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
        .limit(1);

      if (error) {
        finding.evidence.push(`Error querying consent records: ${error.message}`);
        return ComplianceStatus.NON_COMPLIANT;
      }

      if (!consentRecords || consentRecords.length === 0) {
        finding.evidence.push('No consent records found in the last 7 days');
        finding.recommendations.push('Implement consent tracking system');
        return ComplianceStatus.NON_COMPLIANT;
      }

      finding.evidence.push(`Consent records are being maintained (${consentRecords.length} entries found)`);
      return ComplianceStatus.COMPLIANT;
    } catch (error) {
      finding.evidence.push(`Error checking consent tracking: ${error.message}`);
      return ComplianceStatus.NON_COMPLIANT;
    }
  }

  /**
   * Check data retention period compliance
   */
  private async checkDataRetentionPeriod(
    requirement: ComplianceRequirement,
    finding: ComplianceFinding
  ): Promise<ComplianceStatus> {
    try {
      const maxRetentionDays = requirement.parameters.maxRetentionDays || 365;
      
      // Check if data retention policies are implemented
      const { data: retentionPolicies, error } = await this.supabase
        .from('data_retention_policies')
        .select('*')
        .eq('table_name', 'users')
        .limit(1);

      if (error) {
        finding.evidence.push(`Error querying retention policies: ${error.message}`);
        return ComplianceStatus.NON_COMPLIANT;
      }

      if (!retentionPolicies || retentionPolicies.length === 0) {
        finding.evidence.push('No data retention policies found');
        finding.recommendations.push('Implement data retention policies');
        return ComplianceStatus.NON_COMPLIANT;
      }

      const policy = retentionPolicies[0];
      if (policy.retention_days > maxRetentionDays) {
        finding.evidence.push(`Data retention period (${policy.retention_days} days) exceeds maximum (${maxRetentionDays} days)`);
        finding.recommendations.push('Reduce data retention period to comply with requirements');
        return ComplianceStatus.NON_COMPLIANT;
      }

      finding.evidence.push(`Data retention period (${policy.retention_days} days) is compliant`);
      return ComplianceStatus.COMPLIANT;
    } catch (error) {
      finding.evidence.push(`Error checking data retention: ${error.message}`);
      return ComplianceStatus.NON_COMPLIANT;
    }
  }

  /**
   * Check data deletion capability compliance
   */
  private async checkDataDeletionCapability(
    requirement: ComplianceRequirement,
    finding: ComplianceFinding
  ): Promise<ComplianceStatus> {
    try {
      // Check if data deletion functionality exists
      const { data: deletionCapabilities, error } = await this.supabase
        .from('data_deletion_capabilities')
        .select('*')
        .eq('table_name', 'users')
        .limit(1);

      if (error) {
        finding.evidence.push(`Error querying deletion capabilities: ${error.message}`);
        return ComplianceStatus.NON_COMPLIANT;
      }

      if (!deletionCapabilities || deletionCapabilities.length === 0) {
        finding.evidence.push('No data deletion capabilities found');
        finding.recommendations.push('Implement data deletion functionality');
        return ComplianceStatus.NON_COMPLIANT;
      }

      const capability = deletionCapabilities[0];
      if (!capability.is_implemented) {
        finding.evidence.push('Data deletion capability is not implemented');
        finding.recommendations.push('Implement data deletion functionality');
        return ComplianceStatus.NON_COMPLIANT;
      }

      finding.evidence.push('Data deletion capability is implemented');
      return ComplianceStatus.COMPLIANT;
    } catch (error) {
      finding.evidence.push(`Error checking deletion capability: ${error.message}`);
      return ComplianceStatus.NON_COMPLIANT;
    }
  }

  /**
   * Check audit trail compliance
   */
  private async checkAuditTrail(
    requirement: ComplianceRequirement,
    finding: ComplianceFinding
  ): Promise<ComplianceStatus> {
    try {
      // Check if audit trail is complete and tamper-proof
      const { data: auditTrail, error } = await this.supabase
        .from('audit_logs')
        .select('*')
        .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
        .limit(100);

      if (error) {
        finding.evidence.push(`Error querying audit trail: ${error.message}`);
        return ComplianceStatus.NON_COMPLIANT;
      }

      if (!auditTrail || auditTrail.length === 0) {
        finding.evidence.push('No audit trail entries found in the last 24 hours');
        finding.recommendations.push('Ensure audit logging is enabled and functioning');
        return ComplianceStatus.NON_COMPLIANT;
      }

      // Check for tamper evidence
      const tamperedEntries = auditTrail.filter(entry => entry.tampered === true);
      if (tamperedEntries.length > 0) {
        finding.evidence.push(`${tamperedEntries.length} tampered audit entries found`);
        finding.recommendations.push('Investigate and secure audit trail integrity');
        return ComplianceStatus.NON_COMPLIANT;
      }

      finding.evidence.push(`Audit trail is complete and tamper-proof (${auditTrail.length} entries)`);
      return ComplianceStatus.COMPLIANT;
    } catch (error) {
      finding.evidence.push(`Error checking audit trail: ${error.message}`);
      return ComplianceStatus.NON_COMPLIANT;
    }
  }

  /**
   * Check security controls compliance
   */
  private async checkSecurityControls(
    requirement: ComplianceRequirement,
    finding: ComplianceFinding
  ): Promise<ComplianceStatus> {
    try {
      // Check if required security controls are implemented
      const requiredControls = requirement.parameters.requiredControls || [
        'authentication',
        'authorization',
        'encryption',
        'rate_limiting',
        'input_validation',
      ];

      const { data: securityControls, error } = await this.supabase
        .from('security_controls')
        .select('*')
        .in('control_name', requiredControls);

      if (error) {
        finding.evidence.push(`Error querying security controls: ${error.message}`);
        return ComplianceStatus.NON_COMPLIANT;
      }

      const implementedControls = securityControls?.filter(control => control.is_implemented) || [];
      const missingControls = requiredControls.filter(control => 
        !implementedControls.some(impl => impl.control_name === control)
      );

      if (missingControls.length > 0) {
        finding.evidence.push(`Missing security controls: ${missingControls.join(', ')}`);
        finding.recommendations.push(`Implement missing security controls: ${missingControls.join(', ')}`);
        return ComplianceStatus.NON_COMPLIANT;
      }

      finding.evidence.push(`All required security controls are implemented (${implementedControls.length}/${requiredControls.length})`);
      return ComplianceStatus.COMPLIANT;
    } catch (error) {
      finding.evidence.push(`Error checking security controls: ${error.message}`);
      return ComplianceStatus.NON_COMPLIANT;
    }
  }

  /**
   * Check privacy policy compliance
   */
  private async checkPrivacyPolicy(
    requirement: ComplianceRequirement,
    finding: ComplianceFinding
  ): Promise<ComplianceStatus> {
    try {
      // Check if privacy policy is up to date
      const { data: privacyPolicy, error } = await this.supabase
        .from('privacy_policies')
        .select('*')
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (error) {
        finding.evidence.push(`Error querying privacy policy: ${error.message}`);
        return ComplianceStatus.NON_COMPLIANT;
      }

      if (!privacyPolicy || privacyPolicy.length === 0) {
        finding.evidence.push('No active privacy policy found');
        finding.recommendations.push('Create and publish privacy policy');
        return ComplianceStatus.NON_COMPLIANT;
      }

      const policy = privacyPolicy[0];
      const lastUpdated = new Date(policy.updated_at);
      const daysSinceUpdate = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSinceUpdate > 365) {
        finding.evidence.push(`Privacy policy is outdated (last updated ${Math.floor(daysSinceUpdate)} days ago)`);
        finding.recommendations.push('Update privacy policy to reflect current practices');
        return ComplianceStatus.NON_COMPLIANT;
      }

      finding.evidence.push(`Privacy policy is up to date (last updated ${Math.floor(daysSinceUpdate)} days ago)`);
      return ComplianceStatus.COMPLIANT;
    } catch (error) {
      finding.evidence.push(`Error checking privacy policy: ${error.message}`);
      return ComplianceStatus.NON_COMPLIANT;
    }
  }

  /**
   * Check data portability format compliance
   */
  private async checkDataPortabilityFormat(
    requirement: ComplianceRequirement,
    finding: ComplianceFinding
  ): Promise<ComplianceStatus> {
    try {
      // Check if data portability functionality exists
      const { data: portabilityFormats, error } = await this.supabase
        .from('data_portability_formats')
        .select('*')
        .eq('is_supported', true);

      if (error) {
        finding.evidence.push(`Error querying portability formats: ${error.message}`);
        return ComplianceStatus.NON_COMPLIANT;
      }

      if (!portabilityFormats || portabilityFormats.length === 0) {
        finding.evidence.push('No data portability formats supported');
        finding.recommendations.push('Implement data portability functionality');
        return ComplianceStatus.NON_COMPLIANT;
      }

      const supportedFormats = portabilityFormats.map(format => format.format_name);
      finding.evidence.push(`Data portability formats supported: ${supportedFormats.join(', ')}`);
      return ComplianceStatus.COMPLIANT;
    } catch (error) {
      finding.evidence.push(`Error checking data portability: ${error.message}`);
      return ComplianceStatus.NON_COMPLIANT;
    }
  }

  /**
   * Check incident notification compliance
   */
  private async checkIncidentNotification(
    requirement: ComplianceRequirement,
    finding: ComplianceFinding
  ): Promise<ComplianceStatus> {
    try {
      // Check if incident notification procedures are in place
      const { data: incidentProcedures, error } = await this.supabase
        .from('incident_procedures')
        .select('*')
        .eq('type', 'notification')
        .eq('is_active', true)
        .limit(1);

      if (error) {
        finding.evidence.push(`Error querying incident procedures: ${error.message}`);
        return ComplianceStatus.NON_COMPLIANT;
      }

      if (!incidentProcedures || incidentProcedures.length === 0) {
        finding.evidence.push('No incident notification procedures found');
        finding.recommendations.push('Implement incident notification procedures');
        return ComplianceStatus.NON_COMPLIANT;
      }

      const procedure = incidentProcedures[0];
      const notificationTime = procedure.notification_time_hours || 72;
      
      if (notificationTime > 72) {
        finding.evidence.push(`Incident notification time (${notificationTime} hours) exceeds requirement (72 hours)`);
        finding.recommendations.push('Reduce incident notification time to 72 hours or less');
        return ComplianceStatus.NON_COMPLIANT;
      }

      finding.evidence.push(`Incident notification procedures are in place (${notificationTime} hours)`);
      return ComplianceStatus.COMPLIANT;
    } catch (error) {
      finding.evidence.push(`Error checking incident notification: ${error.message}`);
      return ComplianceStatus.NON_COMPLIANT;
    }
  }

  /**
   * Calculate compliance score
   */
  private calculateComplianceScore(findings: ComplianceFinding[]): number {
    if (findings.length === 0) return 0;

    let totalWeight = 0;
    let compliantWeight = 0;

    for (const finding of findings) {
      totalWeight += 1; // Each finding has equal weight for now
      
      if (finding.status === ComplianceStatus.COMPLIANT) {
        compliantWeight += 1;
      } else if (finding.status === ComplianceStatus.PARTIALLY_COMPLIANT) {
        compliantWeight += 0.5;
      }
    }

    return Math.round((compliantWeight / totalWeight) * 100);
  }

  /**
   * Determine overall compliance status
   */
  private determineComplianceStatus(findings: ComplianceFinding[]): ComplianceStatus {
    if (findings.length === 0) return ComplianceStatus.NOT_APPLICABLE;

    const compliantCount = findings.filter(f => f.status === ComplianceStatus.COMPLIANT).length;
    const nonCompliantCount = findings.filter(f => f.status === ComplianceStatus.NON_COMPLIANT).length;
    const partiallyCompliantCount = findings.filter(f => f.status === ComplianceStatus.PARTIALLY_COMPLIANT).length;

    if (nonCompliantCount === 0 && partiallyCompliantCount === 0) {
      return ComplianceStatus.COMPLIANT;
    } else if (nonCompliantCount > 0) {
      return ComplianceStatus.NON_COMPLIANT;
    } else {
      return ComplianceStatus.PARTIALLY_COMPLIANT;
    }
  }

  /**
   * Map compliance status to severity
   */
  private mapComplianceStatusToSeverity(
    status: ComplianceStatus,
    isRequired: boolean
  ): ComplianceSeverity {
    if (status === ComplianceStatus.COMPLIANT) {
      return ComplianceSeverity.LOW;
    } else if (status === ComplianceStatus.PARTIALLY_COMPLIANT) {
      return ComplianceSeverity.MEDIUM;
    } else if (status === ComplianceStatus.NON_COMPLIANT) {
      return isRequired ? ComplianceSeverity.CRITICAL : ComplianceSeverity.HIGH;
    } else {
      return ComplianceSeverity.LOW;
    }
  }

  /**
   * Map compliance status to audit severity
   */
  private mapComplianceStatusToAuditSeverity(status: ComplianceStatus): AuditSeverity {
    switch (status) {
      case ComplianceStatus.COMPLIANT:
        return AuditSeverity.LOW;
      case ComplianceStatus.PARTIALLY_COMPLIANT:
        return AuditSeverity.MEDIUM;
      case ComplianceStatus.NON_COMPLIANT:
        return AuditSeverity.HIGH;
      default:
        return AuditSeverity.LOW;
    }
  }

  /**
   * Process data subject request
   */
  public async processDataSubjectRequest(
    request: Omit<DataSubjectRequest, 'id' | 'requestedAt' | 'status'>
  ): Promise<DataSubjectRequest> {
    try {
      const dataSubjectRequest: DataSubjectRequest = {
        id: crypto.randomUUID(),
        ...request,
        requestedAt: new Date().toISOString(),
        status: DataSubjectRequestStatus.PENDING,
      };

      // Store request
      await this.supabase
        .from('data_subject_requests')
        .insert({
          id: dataSubjectRequest.id,
          type: dataSubjectRequest.type,
          user_id: dataSubjectRequest.userId,
          status: dataSubjectRequest.status,
          requested_at: dataSubjectRequest.requestedAt,
          requested_by: dataSubjectRequest.requestedBy,
          priority: dataSubjectRequest.priority,
          notes: dataSubjectRequest.notes,
        });

      // Log data subject request
      await this.auditLogger.logSecurityEvent(
        AuditEventType.DATA_SUBJECT_REQUEST,
        `Data subject request received: ${request.type}`,
        {
          requestId: dataSubjectRequest.id,
          requestType: request.type,
          userId: request.userId,
          priority: request.priority,
          requestedBy: request.requestedBy,
        },
        {
          userId: request.userId,
          severity: AuditSeverity.MEDIUM,
          requestType: request.type,
        }
      );

      logger.info(`Data subject request received: ${request.type} for user ${request.userId}`);
      return dataSubjectRequest;
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
    consentType: ConsentType,
    purpose: string,
    granted: boolean,
    ipAddress: string,
    userAgent: string,
    evidence: string
  ): Promise<ConsentRecord> {
    try {
      const consentRecord: ConsentRecord = {
        id: crypto.randomUUID(),
        userId,
        consentType,
        purpose,
        granted,
        grantedAt: new Date().toISOString(),
        version: '1.0',
        ipAddress,
        userAgent,
        evidence,
      };

      // Store consent record
      await this.supabase
        .from('consent_records')
        .insert({
          id: consentRecord.id,
          user_id: consentRecord.userId,
          consent_type: consentRecord.consentType,
          purpose: consentRecord.purpose,
          granted: consentRecord.granted,
          granted_at: consentRecord.grantedAt,
          version: consentRecord.version,
          ip_address: consentRecord.ipAddress,
          user_agent: consentRecord.userAgent,
          evidence: consentRecord.evidence,
        });

      // Log consent record
      await this.auditLogger.logSecurityEvent(
        AuditEventType.CONSENT_RECORDED,
        `Consent ${granted ? 'granted' : 'withdrawn'} for ${consentType}`,
        {
          consentId: consentRecord.id,
          userId,
          consentType,
          purpose,
          granted,
          version: consentRecord.version,
        },
        {
          userId,
          severity: AuditSeverity.LOW,
          consentType,
        }
      );

      logger.info(`Consent ${granted ? 'granted' : 'withdrawn'} for user ${userId}: ${consentType}`);
      return consentRecord;
    } catch (error) {
      logger.error('Error recording consent:', error);
      throw error;
    }
  }

  /**
   * Load compliance rules from database
   */
  private async loadComplianceRules(): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('compliance_rules')
        .select('*')
        .eq('is_enabled', true)
        .order('priority', { ascending: false });

      if (error) {
        logger.error('Error loading compliance rules:', error);
        return;
      }

      this.complianceRules = data || [];
      logger.info(`Loaded ${this.complianceRules.length} compliance rules`);
    } catch (error) {
      logger.error('Error loading compliance rules:', error);
    }
  }

  /**
   * Start compliance monitoring
   */
  private startComplianceMonitoring(): void {
    // Run compliance checks every 24 hours
    setInterval(async () => {
      await this.runScheduledComplianceChecks();
    }, 24 * 60 * 60 * 1000);

    // Clean up old compliance checks every week
    setInterval(async () => {
      await this.cleanupOldComplianceChecks();
    }, 7 * 24 * 60 * 60 * 1000);
  }

  /**
   * Run scheduled compliance checks
   */
  private async runScheduledComplianceChecks(): Promise<void> {
    try {
      const now = new Date();
      
      for (const rule of this.complianceRules) {
        if (!rule.lastChecked) {
          // First time check
          await this.runComplianceCheck(rule.id, 'system');
        } else {
          const lastCheck = new Date(rule.lastChecked);
          const daysSinceCheck = (now.getTime() - lastCheck.getTime()) / (1000 * 60 * 60 * 24);
          
          if (daysSinceCheck >= 30) {
            // Run check if it's been 30 days or more
            await this.runComplianceCheck(rule.id, 'system');
          }
        }
      }
    } catch (error) {
      logger.error('Error running scheduled compliance checks:', error);
    }
  }

  /**
   * Clean up old compliance checks
   */
  private async cleanupOldComplianceChecks(): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setFullYear(cutoffDate.getFullYear() - 1); // 1 year ago

      const { error } = await this.supabase
        .from('compliance_checks')
        .delete()
        .lt('timestamp', cutoffDate.toISOString());

      if (error) {
        logger.error('Error cleaning up old compliance checks:', error);
      }
    } catch (error) {
      logger.error('Error cleaning up old compliance checks:', error);
    }
  }

  /**
   * Get compliance status for all rules
   */
  public getComplianceStatus(): { rule: ComplianceRule; status: ComplianceStatus; score: number }[] {
    return this.complianceRules.map(rule => ({
      rule,
      status: rule.lastStatus,
      score: 0, // This would be calculated from the latest check
    }));
  }

  /**
   * Get active compliance checks
   */
  public getActiveChecks(): ComplianceCheck[] {
    return Array.from(this.activeChecks.values());
  }
}

// Export singleton instance
let complianceManagerInstance: ComplianceManager | null = null;

export const getComplianceManager = (
  supabase: SupabaseClient,
  auditLogger: AuditLogger
): ComplianceManager => {
  if (!complianceManagerInstance) {
    complianceManagerInstance = new ComplianceManager(supabase, auditLogger);
  }
  return complianceManagerInstance;
};
