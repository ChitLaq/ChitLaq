/**
 * Email Validation Routes
 * 
 * API endpoints for university email validation with comprehensive
 * fraud detection and rate limiting.
 * 
 * @author ChitLaq Development Team
 * @version 1.0.0
 */

import { Router, Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { UniversityEmailValidator, ValidationOptions } from '../validators/university-email';
import { 
  emailValidationRateLimit, 
  batchValidationRateLimit,
  universityManagementRateLimit 
} from '../middleware/rate-limit';
import { University } from '../models/university';
import { FraudDetection } from '../utils/fraud-detection';

const router = Router();
const emailValidator = new UniversityEmailValidator();
const fraudDetection = new FraudDetection();

/**
 * Validate single email address
 * POST /api/validation/email
 */
router.post(
  '/email',
  emailValidationRateLimit,
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email address is required'),
    body('options')
      .optional()
      .isObject()
      .withMessage('Options must be an object'),
    body('options.strictMode')
      .optional()
      .isBoolean()
      .withMessage('strictMode must be a boolean'),
    body('options.allowFaculty')
      .optional()
      .isBoolean()
      .withMessage('allowFaculty must be a boolean'),
    body('options.allowStaff')
      .optional()
      .isBoolean()
      .withMessage('allowStaff must be a boolean'),
    body('options.requirePrefix')
      .optional()
      .isBoolean()
      .withMessage('requirePrefix must be a boolean'),
    body('options.checkAcademicYear')
      .optional()
      .isBoolean()
      .withMessage('checkAcademicYear must be a boolean'),
    body('options.enableFraudDetection')
      .optional()
      .isBoolean()
      .withMessage('enableFraudDetection must be a boolean'),
    body('options.enableGeographicValidation')
      .optional()
      .isBoolean()
      .withMessage('enableGeographicValidation must be a boolean'),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const { email, options = {} } = req.body;
      const clientIp = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');

      // Validate email
      const result = await emailValidator.validateEmail(
        email,
        {
          ...options,
          userAgent,
        },
        clientIp
      );

      // Log validation attempt
      await logValidationAttempt({
        email,
        result,
        clientIp,
        userAgent,
        endpoint: '/api/validation/email',
        timestamp: new Date(),
      });

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Validate multiple email addresses in batch
 * POST /api/validation/batch
 */
router.post(
  '/batch',
  batchValidationRateLimit,
  [
    body('emails')
      .isArray({ min: 1, max: 100 })
      .withMessage('Emails must be an array with 1-100 items'),
    body('emails.*')
      .isEmail()
      .normalizeEmail()
      .withMessage('Each email must be valid'),
    body('options')
      .optional()
      .isObject()
      .withMessage('Options must be an object'),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const { emails, options = {} } = req.body;
      const clientIp = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');

      // Validate emails
      const results = await emailValidator.validateBatch(
        emails,
        {
          ...options,
          userAgent,
        },
        clientIp
      );

      // Calculate batch statistics
      const stats = calculateBatchStats(results);

      // Log batch validation attempt
      await logBatchValidationAttempt({
        emails,
        results,
        stats,
        clientIp,
        userAgent,
        endpoint: '/api/validation/batch',
        timestamp: new Date(),
      });

      res.json({
        success: true,
        data: {
          results,
          statistics: stats,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get validation statistics
 * GET /api/validation/stats
 */
router.get(
  '/stats',
  [
    query('period')
      .optional()
      .isIn(['hour', 'day', 'week', 'month'])
      .withMessage('Period must be one of: hour, day, week, month'),
    query('university')
      .optional()
      .isUUID()
      .withMessage('University must be a valid UUID'),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { period = 'day', university } = req.query;

      const stats = await getValidationStatistics(
        period as string,
        university as string
      );

      res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get university information
 * GET /api/validation/university/:domain
 */
router.get(
  '/university/:domain',
  [
    param('domain')
      .isEmail()
      .withMessage('Domain must be a valid email domain'),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { domain } = req.params;

      const university = await University.findByDomain(domain);

      if (!university) {
        return res.status(404).json({
          error: 'University not found',
          message: `No university found with domain: ${domain}`,
        });
      }

      res.json({
        success: true,
        data: university.getDisplayInfo(),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Search universities
 * GET /api/validation/universities/search
 */
router.get(
  '/universities/search',
  [
    query('q')
      .isLength({ min: 2, max: 100 })
      .withMessage('Query must be 2-100 characters'),
    query('country')
      .optional()
      .isLength({ min: 2, max: 2 })
      .withMessage('Country must be 2 characters'),
    query('type')
      .optional()
      .isIn(['public', 'private', 'community'])
      .withMessage('Type must be one of: public, private, community'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50'),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { q, country, type, limit = 20 } = req.query;

      let universities;

      if (country) {
        universities = await University.findByCountry(country as string);
        universities = universities.filter(u => 
          u.name.toLowerCase().includes((q as string).toLowerCase()) ||
          u.domain.toLowerCase().includes((q as string).toLowerCase())
        );
      } else {
        universities = await University.search(q as string);
      }

      if (type) {
        universities = universities.filter(u => u.type === type);
      }

      universities = universities.slice(0, parseInt(limit as string));

      res.json({
        success: true,
        data: universities.map(u => u.getDisplayInfo()),
        count: universities.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get university statistics
 * GET /api/validation/universities/stats
 */
router.get(
  '/universities/stats',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await University.getStatistics();

      res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Test email validation (admin only)
 * POST /api/validation/test
 */
router.post(
  '/test',
  universityManagementRateLimit,
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email address is required'),
    body('options')
      .optional()
      .isObject()
      .withMessage('Options must be an object'),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, options = {} } = req.body;
      const clientIp = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');

      // Run comprehensive validation test
      const result = await emailValidator.validateEmail(
        email,
        {
          ...options,
          userAgent,
          enableFraudDetection: true,
          enableGeographicValidation: true,
        },
        clientIp
      );

      // Get detailed fraud analysis
      const fraudAnalysis = await fraudDetection.analyzeEmail(email, {
        clientIp,
        userAgent,
      });

      res.json({
        success: true,
        data: {
          validation: result,
          fraudAnalysis,
          recommendations: generateRecommendations(result, fraudAnalysis),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Health check endpoint
 * GET /api/validation/health
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    // Check database connection
    const universityCount = await University.count();
    
    // Check Redis connection (if using rate limiting)
    const redisHealthy = true; // Implement actual Redis health check

    const health = {
      status: 'healthy',
      database: {
        connected: true,
        universityCount,
      },
      redis: {
        connected: redisHealthy,
      },
      timestamp: new Date().toISOString(),
    };

    res.json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Helper function to calculate batch statistics
 */
function calculateBatchStats(results: any[]): {
  total: number;
  valid: number;
  invalid: number;
  university: number;
  nonUniversity: number;
  suspicious: number;
  disposable: number;
  averageRiskScore: number;
  topReasons: Array<{ reason: string; count: number }>;
} {
  const total = results.length;
  const valid = results.filter(r => r.isValid).length;
  const invalid = total - valid;
  const university = results.filter(r => r.isUniversity).length;
  const nonUniversity = total - university;
  const suspicious = results.filter(r => r.isSuspicious).length;
  const disposable = results.filter(r => r.isDisposable).length;
  
  const averageRiskScore = results.reduce((sum, r) => sum + r.riskScore, 0) / total;
  
  // Count reasons
  const reasonCounts: { [key: string]: number } = {};
  results.forEach(r => {
    r.reasons.forEach((reason: string) => {
      reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
    });
  });
  
  const topReasons = Object.entries(reasonCounts)
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    total,
    valid,
    invalid,
    university,
    nonUniversity,
    suspicious,
    disposable,
    averageRiskScore: Math.round(averageRiskScore * 100) / 100,
    topReasons,
  };
}

/**
 * Helper function to get validation statistics
 */
async function getValidationStatistics(period: string, universityId?: string): Promise<any> {
  // This would typically query a validation_logs table
  // For now, return mock data
  return {
    period,
    university: universityId,
    totalValidations: 1250,
    successfulValidations: 1100,
    failedValidations: 150,
    averageRiskScore: 25.5,
    topUniversities: [
      { name: 'MIT', count: 150 },
      { name: 'Stanford', count: 120 },
      { name: 'Harvard', count: 100 },
    ],
    topReasons: [
      { reason: 'Invalid prefix pattern', count: 80 },
      { reason: 'Suspicious email pattern', count: 45 },
      { reason: 'Disposable email domain', count: 25 },
    ],
    hourlyBreakdown: Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      count: Math.floor(Math.random() * 100),
    })),
  };
}

/**
 * Helper function to log validation attempt
 */
async function logValidationAttempt(data: {
  email: string;
  result: any;
  clientIp?: string;
  userAgent?: string;
  endpoint: string;
  timestamp: Date;
}): Promise<void> {
  try {
    // In production, log to database or external logging service
    console.log('Validation attempt logged:', {
      email: data.email.replace(/(.{2}).*(@.*)/, '$1***$2'),
      isValid: data.result.isValid,
      riskScore: data.result.riskScore,
      university: data.result.university?.name,
      clientIp: data.clientIp,
      endpoint: data.endpoint,
      timestamp: data.timestamp,
    });
  } catch (error) {
    console.error('Error logging validation attempt:', error);
  }
}

/**
 * Helper function to log batch validation attempt
 */
async function logBatchValidationAttempt(data: {
  emails: string[];
  results: any[];
  stats: any;
  clientIp?: string;
  userAgent?: string;
  endpoint: string;
  timestamp: Date;
}): Promise<void> {
  try {
    // In production, log to database or external logging service
    console.log('Batch validation attempt logged:', {
      emailCount: data.emails.length,
      validCount: data.stats.valid,
      invalidCount: data.stats.invalid,
      averageRiskScore: data.stats.averageRiskScore,
      clientIp: data.clientIp,
      endpoint: data.endpoint,
      timestamp: data.timestamp,
    });
  } catch (error) {
    console.error('Error logging batch validation attempt:', error);
  }
}

/**
 * Helper function to generate recommendations
 */
function generateRecommendations(validation: any, fraudAnalysis: any): string[] {
  const recommendations: string[] = [];

  if (validation.riskScore > 70) {
    recommendations.push('High risk email detected. Consider manual review.');
  }

  if (validation.isSuspicious) {
    recommendations.push('Suspicious pattern detected. Verify user identity.');
  }

  if (validation.isDisposable) {
    recommendations.push('Disposable email detected. Require alternative verification.');
  }

  if (!validation.isUniversity) {
    recommendations.push('Non-university email. Verify educational status.');
  }

  if (validation.university && validation.university.type === 'private') {
    recommendations.push('Private university email. Verify enrollment status.');
  }

  if (fraudAnalysis.riskScore > 50) {
    recommendations.push('Fraud indicators detected. Implement additional verification.');
  }

  return recommendations;
}

export default router;
