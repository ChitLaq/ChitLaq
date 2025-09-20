import { Router, Request, Response } from 'express';
import { getLogger } from '../../../utils/logger';
import { SupabaseClient } from '@supabase/supabase-js';
import { getSecurityIntegration } from '../middleware/security-integration';
import { AuditEventType, AuditSeverity } from '../security/audit-logger';
import { ThreatType, ThreatSeverity } from '../security/threat-detection';
import { ComplianceType, ComplianceCategory, ComplianceStatus } from '../security/compliance-manager';
import { SecurityIncidentType, SecurityIncidentSeverity, SecurityIncidentStatus } from '../security/security-service';

const logger = getLogger('SecurityRoutes');
const router = Router();

// Initialize security integration
let securityIntegration: any = null;

export const initializeSecurityRoutes = (supabase: SupabaseClient): Router => {
  securityIntegration = getSecurityIntegration(supabase);
  return router;
};

// Security metrics endpoint
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const metrics = await securityIntegration.getSecurityMetrics();
    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    logger.error('Error getting security metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get security metrics',
    });
  }
});

// Security statistics endpoint
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = securityIntegration.getSecurityStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Error getting security statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get security statistics',
    });
  }
});

// Active threats endpoint
router.get('/threats', async (req: Request, res: Response) => {
  try {
    const threats = securityIntegration.getActiveThreats();
    res.json({
      success: true,
      data: threats,
    });
  } catch (error) {
    logger.error('Error getting active threats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get active threats',
    });
  }
});

// Resolve threat endpoint
router.post('/threats/:threatId/resolve', async (req: Request, res: Response) => {
  try {
    const { threatId } = req.params;
    const { resolvedBy, resolution } = req.body;

    if (!resolvedBy || !resolution) {
      return res.status(400).json({
        success: false,
        error: 'resolvedBy and resolution are required',
      });
    }

    await securityIntegration.resolveThreat(threatId, resolvedBy, resolution);
    
    res.json({
      success: true,
      message: 'Threat resolved successfully',
    });
  } catch (error) {
    logger.error('Error resolving threat:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resolve threat',
    });
  }
});

// Compliance status endpoint
router.get('/compliance/status', async (req: Request, res: Response) => {
  try {
    const status = securityIntegration.getComplianceStatus();
    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    logger.error('Error getting compliance status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get compliance status',
    });
  }
});

// Run compliance check endpoint
router.post('/compliance/check', async (req: Request, res: Response) => {
  try {
    const { ruleId, checkedBy } = req.body;

    if (!ruleId || !checkedBy) {
      return res.status(400).json({
        success: false,
        error: 'ruleId and checkedBy are required',
      });
    }

    const check = await securityIntegration.runComplianceCheck(ruleId, checkedBy);
    
    res.json({
      success: true,
      data: check,
    });
  } catch (error) {
    logger.error('Error running compliance check:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run compliance check',
    });
  }
});

// Active compliance checks endpoint
router.get('/compliance/checks', async (req: Request, res: Response) => {
  try {
    const checks = securityIntegration.getActiveComplianceChecks();
    res.json({
      success: true,
      data: checks,
    });
  } catch (error) {
    logger.error('Error getting active compliance checks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get active compliance checks',
    });
  }
});

// Data subject request endpoint
router.post('/compliance/data-subject-request', async (req: Request, res: Response) => {
  try {
    const { type, userId, requestedBy, priority, notes } = req.body;

    if (!type || !userId || !requestedBy || !priority) {
      return res.status(400).json({
        success: false,
        error: 'type, userId, requestedBy, and priority are required',
      });
    }

    const request = await securityIntegration.processDataSubjectRequest({
      type,
      userId,
      requestedBy,
      priority,
      notes,
    });
    
    res.json({
      success: true,
      data: request,
    });
  } catch (error) {
    logger.error('Error processing data subject request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process data subject request',
    });
  }
});

// Record consent endpoint
router.post('/compliance/consent', async (req: Request, res: Response) => {
  try {
    const { userId, consentType, purpose, granted, ipAddress, userAgent, evidence } = req.body;

    if (!userId || !consentType || !purpose || granted === undefined || !ipAddress || !userAgent || !evidence) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required',
      });
    }

    const consent = await securityIntegration.recordConsent(
      userId,
      consentType,
      purpose,
      granted,
      ipAddress,
      userAgent,
      evidence
    );
    
    res.json({
      success: true,
      data: consent,
    });
  } catch (error) {
    logger.error('Error recording consent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record consent',
    });
  }
});

// Active incidents endpoint
router.get('/incidents', async (req: Request, res: Response) => {
  try {
    const incidents = securityIntegration.getActiveIncidents();
    res.json({
      success: true,
      data: incidents,
    });
  } catch (error) {
    logger.error('Error getting active incidents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get active incidents',
    });
  }
});

// Get incident by ID endpoint
router.get('/incidents/:incidentId', async (req: Request, res: Response) => {
  try {
    const { incidentId } = req.params;
    const incident = securityIntegration.getIncident(incidentId);
    
    if (!incident) {
      return res.status(404).json({
        success: false,
        error: 'Incident not found',
      });
    }
    
    res.json({
      success: true,
      data: incident,
    });
  } catch (error) {
    logger.error('Error getting incident:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get incident',
    });
  }
});

// Create security incident endpoint
router.post('/incidents', async (req: Request, res: Response) => {
  try {
    const { type, severity, title, description, detectedBy, affectedUsers, affectedSystems, tags } = req.body;

    if (!type || !severity || !title || !description || !detectedBy) {
      return res.status(400).json({
        success: false,
        error: 'type, severity, title, description, and detectedBy are required',
      });
    }

    const incident = await securityIntegration.createSecurityIncident(
      type,
      severity,
      title,
      description,
      detectedBy,
      affectedUsers || [],
      affectedSystems || [],
      tags || []
    );
    
    res.json({
      success: true,
      data: incident,
    });
  } catch (error) {
    logger.error('Error creating security incident:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create security incident',
    });
  }
});

// Block IP endpoint
router.post('/block/ip', async (req: Request, res: Response) => {
  try {
    const { ipAddress, reason } = req.body;

    if (!ipAddress || !reason) {
      return res.status(400).json({
        success: false,
        error: 'ipAddress and reason are required',
      });
    }

    securityIntegration.blockIP(ipAddress, reason);
    
    res.json({
      success: true,
      message: 'IP address blocked successfully',
    });
  } catch (error) {
    logger.error('Error blocking IP address:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to block IP address',
    });
  }
});

// Unblock IP endpoint
router.post('/unblock/ip', async (req: Request, res: Response) => {
  try {
    const { ipAddress } = req.body;

    if (!ipAddress) {
      return res.status(400).json({
        success: false,
        error: 'ipAddress is required',
      });
    }

    securityIntegration.unblockIP(ipAddress);
    
    res.json({
      success: true,
      message: 'IP address unblocked successfully',
    });
  } catch (error) {
    logger.error('Error unblocking IP address:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unblock IP address',
    });
  }
});

// Block user endpoint
router.post('/block/user', async (req: Request, res: Response) => {
  try {
    const { userId, reason } = req.body;

    if (!userId || !reason) {
      return res.status(400).json({
        success: false,
        error: 'userId and reason are required',
      });
    }

    securityIntegration.blockUser(userId, reason);
    
    res.json({
      success: true,
      message: 'User blocked successfully',
    });
  } catch (error) {
    logger.error('Error blocking user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to block user',
    });
  }
});

// Unblock user endpoint
router.post('/unblock/user', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required',
      });
    }

    securityIntegration.unblockUser(userId);
    
    res.json({
      success: true,
      message: 'User unblocked successfully',
    });
  } catch (error) {
    logger.error('Error unblocking user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unblock user',
    });
  }
});

// Security configuration endpoint
router.get('/config', async (req: Request, res: Response) => {
  try {
    const config = securityIntegration.getConfig();
    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    logger.error('Error getting security configuration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get security configuration',
    });
  }
});

// Update security configuration endpoint
router.put('/config', async (req: Request, res: Response) => {
  try {
    const newConfig = req.body;
    securityIntegration.updateConfig(newConfig);
    
    res.json({
      success: true,
      message: 'Security configuration updated successfully',
    });
  } catch (error) {
    logger.error('Error updating security configuration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update security configuration',
    });
  }
});

// Security health check endpoint
router.get('/health', async (req: Request, res: Response) => {
  try {
    const stats = securityIntegration.getSecurityStats();
    const threats = securityIntegration.getActiveThreats();
    const incidents = securityIntegration.getActiveIncidents();
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      stats,
      activeThreats: threats.length,
      activeIncidents: incidents.length,
      blockedIPs: stats.blockedIPs,
      blockedUsers: stats.blockedUsers,
    };
    
    // Determine health status based on active threats and incidents
    if (threats.length > 10 || incidents.length > 5) {
      health.status = 'warning';
    } else if (threats.length > 20 || incidents.length > 10) {
      health.status = 'critical';
    }
    
    res.json({
      success: true,
      data: health,
    });
  } catch (error) {
    logger.error('Error getting security health:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get security health',
    });
  }
});

// Export router
export default router;
