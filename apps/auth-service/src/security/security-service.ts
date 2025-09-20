import { getLogger } from '../../../utils/logger';
import { SupabaseClient } from '@supabase/supabase-js';
import { AuditLogger, AuditEventType, AuditSeverity } from './audit-logger';
import { ThreatDetectionService, ThreatType, ThreatSeverity } from './threat-detection';
import { ComplianceManager, ComplianceType, ComplianceCategory, ComplianceStatus } from './compliance-manager';
import { SecurityMiddleware } from './security-middleware';
import crypto from 'crypto';

const logger = getLogger('SecurityService');

export interface SecurityIncident {
  id: string;
  type: SecurityIncidentType;
  severity: SecurityIncidentSeverity;
  status: SecurityIncidentStatus;
  title: string;
  description: string;
  affectedUsers: string[];
  affectedSystems: string[];
  detectedAt: string;
  resolvedAt?: string;
  assignedTo?: string;
  priority: SecurityIncidentPriority;
  tags: string[];
  evidence: SecurityEvidence[];
  actions: SecurityAction[];
  timeline: SecurityTimelineEvent[];
  rootCause?: string;
  lessonsLearned?: string;
  preventionMeasures?: string[];
}

export enum SecurityIncidentType {
  DATA_BREACH = 'data_breach',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  MALWARE_INFECTION = 'malware_infection',
  PHISHING_ATTACK = 'phishing_attack',
  DDOS_ATTACK = 'ddos_attack',
  INSIDER_THREAT = 'insider_threat',
  SYSTEM_COMPROMISE = 'system_compromise',
  PRIVACY_VIOLATION = 'privacy_violation',
  COMPLIANCE_VIOLATION = 'compliance_violation',
  SECURITY_MISCONFIGURATION = 'security_misconfiguration',
  VULNERABILITY_EXPLOITATION = 'vulnerability_exploitation',
  ACCOUNT_TAKEOVER = 'account_takeover',
  SOCIAL_ENGINEERING = 'social_engineering',
  PHYSICAL_SECURITY_BREACH = 'physical_security_breach',
  SUPPLY_CHAIN_ATTACK = 'supply_chain_attack',
}

export enum SecurityIncidentSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum SecurityIncidentStatus {
  DETECTED = 'detected',
  INVESTIGATING = 'investigating',
  CONTAINED = 'contained',
  ERADICATED = 'eradicated',
  RECOVERED = 'recovered',
  CLOSED = 'closed',
}

export enum SecurityIncidentPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export interface SecurityEvidence {
  id: string;
  type: EvidenceType;
  description: string;
  source: string;
  collectedAt: string;
  collectedBy: string;
  hash: string;
  size: number;
  isTampered: boolean;
  chainOfCustody: ChainOfCustodyEntry[];
}

export enum EvidenceType {
  LOG_FILE = 'log_file',
  SCREENSHOT = 'screenshot',
  NETWORK_CAPTURE = 'network_capture',
  MEMORY_DUMP = 'memory_dump',
  DISK_IMAGE = 'disk_image',
  DATABASE_BACKUP = 'database_backup',
  EMAIL = 'email',
  DOCUMENT = 'document',
  VIDEO_RECORDING = 'video_recording',
  AUDIO_RECORDING = 'audio_recording',
}

export interface ChainOfCustodyEntry {
  timestamp: string;
  action: string;
  performedBy: string;
  location: string;
  notes?: string;
}

export interface SecurityAction {
  id: string;
  type: ActionType;
  description: string;
  assignedTo: string;
  dueDate: string;
  status: ActionStatus;
  completedAt?: string;
  completedBy?: string;
  notes?: string;
  priority: ActionPriority;
}

export enum ActionType {
  INVESTIGATE = 'investigate',
  CONTAIN = 'contain',
  ERADICATE = 'eradicate',
  RECOVER = 'recover',
  NOTIFY = 'notify',
  DOCUMENT = 'document',
  REVIEW = 'review',
  IMPLEMENT = 'implement',
  TEST = 'test',
  TRAIN = 'train',
}

export enum ActionStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  OVERDUE = 'overdue',
}

export enum ActionPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export interface SecurityTimelineEvent {
  id: string;
  timestamp: string;
  event: string;
  description: string;
  performedBy: string;
  category: TimelineEventCategory;
  metadata?: Record<string, any>;
}

export enum TimelineEventCategory {
  DETECTION = 'detection',
  INVESTIGATION = 'investigation',
  CONTAINMENT = 'containment',
  ERADICATION = 'eradication',
  RECOVERY = 'recovery',
  NOTIFICATION = 'notification',
  DOCUMENTATION = 'documentation',
  REVIEW = 'review',
}

export interface SecurityMetrics {
  totalIncidents: number;
  openIncidents: number;
  resolvedIncidents: number;
  averageResolutionTime: number;
  incidentsByType: Record<SecurityIncidentType, number>;
  incidentsBySeverity: Record<SecurityIncidentSeverity, number>;
  incidentsByStatus: Record<SecurityIncidentStatus, number>;
  topThreatTypes: Array<{ type: ThreatType; count: number }>;
  complianceScore: number;
  securityScore: number;
  lastUpdated: string;
}

export class SecurityService {
  private supabase: SupabaseClient;
  private auditLogger: AuditLogger;
  private threatDetection: ThreatDetectionService;
  private complianceManager: ComplianceManager;
  private securityMiddleware: SecurityMiddleware;
  private activeIncidents: Map<string, SecurityIncident> = new Map();
  private securityMetrics: SecurityMetrics | null = null;

  constructor(
    supabase: SupabaseClient,
    auditLogger: AuditLogger,
    threatDetection: ThreatDetectionService,
    complianceManager: ComplianceManager,
    securityMiddleware: SecurityMiddleware
  ) {
    this.supabase = supabase;
    this.auditLogger = auditLogger;
    this.threatDetection = threatDetection;
    this.complianceManager = complianceManager;
    this.securityMiddleware = securityMiddleware;
    this.initializeSecurityService();
  }

  /**
   * Create security incident
   */
  public async createSecurityIncident(
    type: SecurityIncidentType,
    severity: SecurityIncidentSeverity,
    title: string,
    description: string,
    detectedBy: string,
    affectedUsers: string[] = [],
    affectedSystems: string[] = [],
    tags: string[] = []
  ): Promise<SecurityIncident> {
    try {
      const incident: SecurityIncident = {
        id: crypto.randomUUID(),
        type,
        severity,
        status: SecurityIncidentStatus.DETECTED,
        title,
        description,
        affectedUsers,
        affectedSystems,
        detectedAt: new Date().toISOString(),
        priority: this.mapSeverityToPriority(severity),
        tags,
        evidence: [],
        actions: [],
        timeline: [
          {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            event: 'Incident Created',
            description: `Security incident created: ${title}`,
            performedBy: detectedBy,
            category: TimelineEventCategory.DETECTION,
          },
        ],
      };

      // Store incident in database
      await this.supabase
        .from('security_incidents')
        .insert({
          id: incident.id,
          type: incident.type,
          severity: incident.severity,
          status: incident.status,
          title: incident.title,
          description: incident.description,
          affected_users: incident.affectedUsers,
          affected_systems: incident.affectedSystems,
          detected_at: incident.detectedAt,
          priority: incident.priority,
          tags: incident.tags,
          evidence: incident.evidence,
          actions: incident.actions,
          timeline: incident.timeline,
        });

      // Add to active incidents
      this.activeIncidents.set(incident.id, incident);

      // Log incident creation
      await this.auditLogger.logSecurityEvent(
        AuditEventType.SECURITY_INCIDENT,
        `Security incident created: ${title}`,
        {
          incidentId: incident.id,
          incidentType: incident.type,
          severity: incident.severity,
          affectedUsers: incident.affectedUsers.length,
          affectedSystems: incident.affectedSystems.length,
          detectedBy,
        },
        {
          userId: detectedBy,
          severity: this.mapIncidentSeverityToAuditSeverity(incident.severity),
          incidentType: incident.type,
        }
      );

      // Trigger incident response workflow
      await this.triggerIncidentResponse(incident);

      logger.warn(`Security incident created: ${incident.id} - ${incident.title}`);
      return incident;
    } catch (error) {
      logger.error('Error creating security incident:', error);
      throw error;
    }
  }

  /**
   * Update incident status
   */
  public async updateIncidentStatus(
    incidentId: string,
    status: SecurityIncidentStatus,
    updatedBy: string,
    notes?: string
  ): Promise<void> {
    try {
      const incident = this.activeIncidents.get(incidentId);
      if (!incident) {
        throw new Error(`Incident not found: ${incidentId}`);
      }

      const previousStatus = incident.status;
      incident.status = status;

      // Update resolved timestamp if status is closed
      if (status === SecurityIncidentStatus.CLOSED) {
        incident.resolvedAt = new Date().toISOString();
      }

      // Add timeline event
      incident.timeline.push({
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        event: 'Status Updated',
        description: `Status changed from ${previousStatus} to ${status}${notes ? `: ${notes}` : ''}`,
        performedBy: updatedBy,
        category: TimelineEventCategory.DOCUMENTATION,
        metadata: { previousStatus, newStatus: status, notes },
      });

      // Update database
      await this.supabase
        .from('security_incidents')
        .update({
          status: incident.status,
          resolved_at: incident.resolvedAt,
          timeline: incident.timeline,
        })
        .eq('id', incidentId);

      // Log status update
      await this.auditLogger.logSecurityEvent(
        AuditEventType.INCIDENT_STATUS_UPDATE,
        `Incident status updated: ${incidentId}`,
        {
          incidentId,
          previousStatus,
          newStatus: status,
          updatedBy,
          notes,
        },
        {
          userId: updatedBy,
          severity: this.mapIncidentSeverityToAuditSeverity(incident.severity),
          incidentType: incident.type,
        }
      );

      // Remove from active incidents if closed
      if (status === SecurityIncidentStatus.CLOSED) {
        this.activeIncidents.delete(incidentId);
      }

      logger.info(`Incident ${incidentId} status updated: ${previousStatus} -> ${status}`);
    } catch (error) {
      logger.error('Error updating incident status:', error);
      throw error;
    }
  }

  /**
   * Add evidence to incident
   */
  public async addEvidence(
    incidentId: string,
    type: EvidenceType,
    description: string,
    source: string,
    collectedBy: string,
    data: Buffer
  ): Promise<SecurityEvidence> {
    try {
      const incident = this.activeIncidents.get(incidentId);
      if (!incident) {
        throw new Error(`Incident not found: ${incidentId}`);
      }

      const evidence: SecurityEvidence = {
        id: crypto.randomUUID(),
        type,
        description,
        source,
        collectedAt: new Date().toISOString(),
        collectedBy,
        hash: crypto.createHash('sha256').update(data).digest('hex'),
        size: data.length,
        isTampered: false,
        chainOfCustody: [
          {
            timestamp: new Date().toISOString(),
            action: 'Collected',
            performedBy: collectedBy,
            location: 'Incident Response System',
            notes: 'Initial collection',
          },
        ],
      };

      // Store evidence in database
      await this.supabase
        .from('security_evidence')
        .insert({
          id: evidence.id,
          incident_id: incidentId,
          type: evidence.type,
          description: evidence.description,
          source: evidence.source,
          collected_at: evidence.collectedAt,
          collected_by: evidence.collectedBy,
          hash: evidence.hash,
          size: evidence.size,
          is_tampered: evidence.isTampered,
          chain_of_custody: evidence.chainOfCustody,
        });

      // Add to incident
      incident.evidence.push(evidence);

      // Add timeline event
      incident.timeline.push({
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        event: 'Evidence Added',
        description: `Evidence added: ${description}`,
        performedBy: collectedBy,
        category: TimelineEventCategory.DOCUMENTATION,
        metadata: { evidenceId: evidence.id, evidenceType: type },
      });

      // Update incident in database
      await this.supabase
        .from('security_incidents')
        .update({
          evidence: incident.evidence,
          timeline: incident.timeline,
        })
        .eq('id', incidentId);

      // Log evidence addition
      await this.auditLogger.logSecurityEvent(
        AuditEventType.EVIDENCE_COLLECTED,
        `Evidence collected for incident: ${incidentId}`,
        {
          incidentId,
          evidenceId: evidence.id,
          evidenceType: evidence.type,
          evidenceSize: evidence.size,
          collectedBy,
        },
        {
          userId: collectedBy,
          severity: this.mapIncidentSeverityToAuditSeverity(incident.severity),
          incidentType: incident.type,
        }
      );

      logger.info(`Evidence added to incident ${incidentId}: ${evidence.id}`);
      return evidence;
    } catch (error) {
      logger.error('Error adding evidence:', error);
      throw error;
    }
  }

  /**
   * Create security action
   */
  public async createSecurityAction(
    incidentId: string,
    type: ActionType,
    description: string,
    assignedTo: string,
    dueDate: string,
    priority: ActionPriority = ActionPriority.MEDIUM
  ): Promise<SecurityAction> {
    try {
      const incident = this.activeIncidents.get(incidentId);
      if (!incident) {
        throw new Error(`Incident not found: ${incidentId}`);
      }

      const action: SecurityAction = {
        id: crypto.randomUUID(),
        type,
        description,
        assignedTo,
        dueDate,
        status: ActionStatus.PENDING,
        priority,
      };

      // Store action in database
      await this.supabase
        .from('security_actions')
        .insert({
          id: action.id,
          incident_id: incidentId,
          type: action.type,
          description: action.description,
          assigned_to: action.assignedTo,
          due_date: action.dueDate,
          status: action.status,
          priority: action.priority,
        });

      // Add to incident
      incident.actions.push(action);

      // Add timeline event
      incident.timeline.push({
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        event: 'Action Created',
        description: `Action created: ${description}`,
        performedBy: assignedTo,
        category: TimelineEventCategory.DOCUMENTATION,
        metadata: { actionId: action.id, actionType: type, assignedTo },
      });

      // Update incident in database
      await this.supabase
        .from('security_incidents')
        .update({
          actions: incident.actions,
          timeline: incident.timeline,
        })
        .eq('id', incidentId);

      // Log action creation
      await this.auditLogger.logSecurityEvent(
        AuditEventType.ACTION_CREATED,
        `Security action created for incident: ${incidentId}`,
        {
          incidentId,
          actionId: action.id,
          actionType: action.type,
          assignedTo,
          dueDate,
          priority,
        },
        {
          userId: assignedTo,
          severity: this.mapIncidentSeverityToAuditSeverity(incident.severity),
          incidentType: incident.type,
        }
      );

      logger.info(`Action created for incident ${incidentId}: ${action.id}`);
      return action;
    } catch (error) {
      logger.error('Error creating security action:', error);
      throw error;
    }
  }

  /**
   * Complete security action
   */
  public async completeSecurityAction(
    actionId: string,
    completedBy: string,
    notes?: string
  ): Promise<void> {
    try {
      // Find the action in active incidents
      let action: SecurityAction | null = null;
      let incidentId: string | null = null;

      for (const [id, incident] of this.activeIncidents.entries()) {
        const foundAction = incident.actions.find(a => a.id === actionId);
        if (foundAction) {
          action = foundAction;
          incidentId = id;
          break;
        }
      }

      if (!action || !incidentId) {
        throw new Error(`Action not found: ${actionId}`);
      }

      const incident = this.activeIncidents.get(incidentId)!;
      action.status = ActionStatus.COMPLETED;
      action.completedAt = new Date().toISOString();
      action.completedBy = completedBy;
      action.notes = notes;

      // Update action in database
      await this.supabase
        .from('security_actions')
        .update({
          status: action.status,
          completed_at: action.completedAt,
          completed_by: action.completedBy,
          notes: action.notes,
        })
        .eq('id', actionId);

      // Add timeline event
      incident.timeline.push({
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        event: 'Action Completed',
        description: `Action completed: ${action.description}`,
        performedBy: completedBy,
        category: TimelineEventCategory.DOCUMENTATION,
        metadata: { actionId: action.id, actionType: action.type, notes },
      });

      // Update incident in database
      await this.supabase
        .from('security_incidents')
        .update({
          actions: incident.actions,
          timeline: incident.timeline,
        })
        .eq('id', incidentId);

      // Log action completion
      await this.auditLogger.logSecurityEvent(
        AuditEventType.ACTION_COMPLETED,
        `Security action completed: ${actionId}`,
        {
          incidentId,
          actionId: action.id,
          actionType: action.type,
          completedBy,
          notes,
        },
        {
          userId: completedBy,
          severity: this.mapIncidentSeverityToAuditSeverity(incident.severity),
          incidentType: incident.type,
        }
      );

      logger.info(`Action completed: ${actionId} by ${completedBy}`);
    } catch (error) {
      logger.error('Error completing security action:', error);
      throw error;
    }
  }

  /**
   * Get security metrics
   */
  public async getSecurityMetrics(): Promise<SecurityMetrics> {
    try {
      if (this.securityMetrics && this.isMetricsFresh()) {
        return this.securityMetrics;
      }

      // Calculate metrics from database
      const { data: incidents, error } = await this.supabase
        .from('security_incidents')
        .select('*');

      if (error) {
        logger.error('Error fetching incidents for metrics:', error);
        throw error;
      }

      const totalIncidents = incidents?.length || 0;
      const openIncidents = incidents?.filter(i => 
        i.status !== SecurityIncidentStatus.CLOSED
      ).length || 0;
      const resolvedIncidents = totalIncidents - openIncidents;

      // Calculate average resolution time
      const resolvedIncidentsWithTime = incidents?.filter(i => 
        i.status === SecurityIncidentStatus.CLOSED && i.resolved_at
      ) || [];

      const averageResolutionTime = resolvedIncidentsWithTime.length > 0
        ? resolvedIncidentsWithTime.reduce((sum, incident) => {
            const detected = new Date(incident.detected_at);
            const resolved = new Date(incident.resolved_at);
            return sum + (resolved.getTime() - detected.getTime());
          }, 0) / resolvedIncidentsWithTime.length / (1000 * 60 * 60) // Convert to hours
        : 0;

      // Count incidents by type
      const incidentsByType = incidents?.reduce((acc, incident) => {
        acc[incident.type] = (acc[incident.type] || 0) + 1;
        return acc;
      }, {} as Record<SecurityIncidentType, number>) || {};

      // Count incidents by severity
      const incidentsBySeverity = incidents?.reduce((acc, incident) => {
        acc[incident.severity] = (acc[incident.severity] || 0) + 1;
        return acc;
      }, {} as Record<SecurityIncidentSeverity, number>) || {};

      // Count incidents by status
      const incidentsByStatus = incidents?.reduce((acc, incident) => {
        acc[incident.status] = (acc[incident.status] || 0) + 1;
        return acc;
      }, {} as Record<SecurityIncidentStatus, number>) || {};

      // Get top threat types
      const activeThreats = this.threatDetection.getActiveThreats();
      const topThreatTypes = activeThreats.reduce((acc, threat) => {
        const existing = acc.find(t => t.type === threat.type);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ type: threat.type, count: 1 });
        }
        return acc;
      }, [] as Array<{ type: ThreatType; count: number }>);

      // Get compliance score
      const complianceStatus = this.complianceManager.getComplianceStatus();
      const complianceScore = complianceStatus.length > 0
        ? complianceStatus.reduce((sum, status) => sum + (status.status === ComplianceStatus.COMPLIANT ? 100 : 0), 0) / complianceStatus.length
        : 0;

      // Calculate security score
      const securityStats = this.securityMiddleware.getSecurityStats();
      const securityScore = Math.max(0, 100 - (
        (securityStats.blockedIPs * 5) +
        (securityStats.blockedUsers * 10) +
        (securityStats.suspiciousIPs * 3) +
        (securityStats.activeThreats * 8)
      ));

      this.securityMetrics = {
        totalIncidents,
        openIncidents,
        resolvedIncidents,
        averageResolutionTime,
        incidentsByType,
        incidentsBySeverity,
        incidentsByStatus,
        topThreatTypes,
        complianceScore,
        securityScore,
        lastUpdated: new Date().toISOString(),
      };

      return this.securityMetrics;
    } catch (error) {
      logger.error('Error calculating security metrics:', error);
      throw error;
    }
  }

  /**
   * Trigger incident response workflow
   */
  private async triggerIncidentResponse(incident: SecurityIncident): Promise<void> {
    try {
      // Create initial actions based on incident type and severity
      const actions = this.generateInitialActions(incident);

      for (const action of actions) {
        await this.createSecurityAction(
          incident.id,
          action.type,
          action.description,
          action.assignedTo,
          action.dueDate,
          action.priority
        );
      }

      // Send notifications based on severity
      await this.sendIncidentNotifications(incident);

      logger.info(`Incident response triggered for incident: ${incident.id}`);
    } catch (error) {
      logger.error('Error triggering incident response:', error);
    }
  }

  /**
   * Generate initial actions for incident
   */
  private generateInitialActions(incident: SecurityIncident): Array<{
    type: ActionType;
    description: string;
    assignedTo: string;
    dueDate: string;
    priority: ActionPriority;
  }> {
    const actions = [];

    // Always create investigation action
    actions.push({
      type: ActionType.INVESTIGATE,
      description: `Investigate ${incident.type} incident: ${incident.title}`,
      assignedTo: 'security-team',
      dueDate: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours
      priority: this.mapSeverityToActionPriority(incident.severity),
    });

    // Add containment action for high/critical severity
    if (incident.severity === SecurityIncidentSeverity.HIGH || 
        incident.severity === SecurityIncidentSeverity.CRITICAL) {
      actions.push({
        type: ActionType.CONTAIN,
        description: `Contain ${incident.type} incident to prevent further damage`,
        assignedTo: 'security-team',
        dueDate: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours
        priority: ActionPriority.URGENT,
      });
    }

    // Add notification action for critical incidents
    if (incident.severity === SecurityIncidentSeverity.CRITICAL) {
      actions.push({
        type: ActionType.NOTIFY,
        description: `Notify stakeholders about critical ${incident.type} incident`,
        assignedTo: 'incident-commander',
        dueDate: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
        priority: ActionPriority.URGENT,
      });
    }

    return actions;
  }

  /**
   * Send incident notifications
   */
  private async sendIncidentNotifications(incident: SecurityIncident): Promise<void> {
    try {
      // This would integrate with notification systems
      logger.warn(`Incident notification sent: ${incident.id} - ${incident.title}`);
    } catch (error) {
      logger.error('Error sending incident notifications:', error);
    }
  }

  /**
   * Map severity to priority
   */
  private mapSeverityToPriority(severity: SecurityIncidentSeverity): SecurityIncidentPriority {
    switch (severity) {
      case SecurityIncidentSeverity.CRITICAL:
        return SecurityIncidentPriority.URGENT;
      case SecurityIncidentSeverity.HIGH:
        return SecurityIncidentPriority.HIGH;
      case SecurityIncidentSeverity.MEDIUM:
        return SecurityIncidentPriority.MEDIUM;
      case SecurityIncidentSeverity.LOW:
        return SecurityIncidentPriority.LOW;
      default:
        return SecurityIncidentPriority.MEDIUM;
    }
  }

  /**
   * Map severity to action priority
   */
  private mapSeverityToActionPriority(severity: SecurityIncidentSeverity): ActionPriority {
    switch (severity) {
      case SecurityIncidentSeverity.CRITICAL:
        return ActionPriority.URGENT;
      case SecurityIncidentSeverity.HIGH:
        return ActionPriority.HIGH;
      case SecurityIncidentSeverity.MEDIUM:
        return ActionPriority.MEDIUM;
      case SecurityIncidentSeverity.LOW:
        return ActionPriority.LOW;
      default:
        return ActionPriority.MEDIUM;
    }
  }

  /**
   * Map incident severity to audit severity
   */
  private mapIncidentSeverityToAuditSeverity(severity: SecurityIncidentSeverity): AuditSeverity {
    switch (severity) {
      case SecurityIncidentSeverity.CRITICAL:
        return AuditSeverity.CRITICAL;
      case SecurityIncidentSeverity.HIGH:
        return AuditSeverity.HIGH;
      case SecurityIncidentSeverity.MEDIUM:
        return AuditSeverity.MEDIUM;
      case SecurityIncidentSeverity.LOW:
        return AuditSeverity.LOW;
      default:
        return AuditSeverity.MEDIUM;
    }
  }

  /**
   * Check if metrics are fresh (less than 1 hour old)
   */
  private isMetricsFresh(): boolean {
    if (!this.securityMetrics) return false;
    
    const lastUpdated = new Date(this.securityMetrics.lastUpdated);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    return lastUpdated > oneHourAgo;
  }

  /**
   * Initialize security service
   */
  private initializeSecurityService(): void {
    // Load active incidents from database
    this.loadActiveIncidents();

    // Update metrics every hour
    setInterval(async () => {
      try {
        await this.getSecurityMetrics();
      } catch (error) {
        logger.error('Error updating security metrics:', error);
      }
    }, 60 * 60 * 1000);

    // Clean up old incidents every day
    setInterval(async () => {
      await this.cleanupOldIncidents();
    }, 24 * 60 * 60 * 1000);
  }

  /**
   * Load active incidents from database
   */
  private async loadActiveIncidents(): Promise<void> {
    try {
      const { data: incidents, error } = await this.supabase
        .from('security_incidents')
        .select('*')
        .neq('status', SecurityIncidentStatus.CLOSED);

      if (error) {
        logger.error('Error loading active incidents:', error);
        return;
      }

      for (const incident of incidents || []) {
        this.activeIncidents.set(incident.id, incident);
      }

      logger.info(`Loaded ${this.activeIncidents.size} active incidents`);
    } catch (error) {
      logger.error('Error loading active incidents:', error);
    }
  }

  /**
   * Clean up old incidents
   */
  private async cleanupOldIncidents(): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setFullYear(cutoffDate.getFullYear() - 2); // 2 years ago

      const { error } = await this.supabase
        .from('security_incidents')
        .delete()
        .eq('status', SecurityIncidentStatus.CLOSED)
        .lt('resolved_at', cutoffDate.toISOString());

      if (error) {
        logger.error('Error cleaning up old incidents:', error);
      }
    } catch (error) {
      logger.error('Error cleaning up old incidents:', error);
    }
  }

  /**
   * Get active incidents
   */
  public getActiveIncidents(): SecurityIncident[] {
    return Array.from(this.activeIncidents.values());
  }

  /**
   * Get incident by ID
   */
  public getIncident(incidentId: string): SecurityIncident | undefined {
    return this.activeIncidents.get(incidentId);
  }
}

// Export singleton instance
let securityServiceInstance: SecurityService | null = null;

export const getSecurityService = (
  supabase: SupabaseClient,
  auditLogger: AuditLogger,
  threatDetection: ThreatDetectionService,
  complianceManager: ComplianceManager,
  securityMiddleware: SecurityMiddleware
): SecurityService => {
  if (!securityServiceInstance) {
    securityServiceInstance = new SecurityService(
      supabase,
      auditLogger,
      threatDetection,
      complianceManager,
      securityMiddleware
    );
  }
  return securityServiceInstance;
};
