import { SupabaseClient } from '@supabase/supabase-js';
import { Redis } from 'ioredis';
import { getLogger } from '../../../utils/logger';

const logger = getLogger('FraudDetection');

interface FraudAttempt {
  id?: string;
  email: string;
  ip_address: string;
  reason: string;
  timestamp: string;
  user_agent?: string;
  country?: string;
  city?: string;
  is_blocked: boolean;
  risk_score: number;
  metadata?: Record<string, any>;
}

interface SuspiciousPattern {
  pattern: string;
  description: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  action: 'log' | 'block' | 'require_captcha' | 'require_verification';
}

export class FraudDetectionService {
  private supabase: SupabaseClient;
  private redis: Redis;
  private suspiciousPatterns: SuspiciousPattern[] = [
    {
      pattern: '^[a-z]+\\d+@[a-z]+\\.edu$',
      description: 'Generic username with numbers pattern',
      risk_level: 'medium',
      action: 'require_captcha'
    },
    {
      pattern: '^[a-z]{1,3}\\d{4,}@[a-z]+\\.edu$',
      description: 'Very short username with many numbers',
      risk_level: 'high',
      action: 'block'
    },
    {
      pattern: '^[a-z]+\\d{2,}@[a-z]+\\.edu$',
      description: 'Username with multiple consecutive numbers',
      risk_level: 'medium',
      action: 'require_captcha'
    },
    {
      pattern: '^[a-z]+\\d+[a-z]+@[a-z]+\\.edu$',
      description: 'Username with numbers in the middle',
      risk_level: 'low',
      action: 'log'
    },
    {
      pattern: '^[a-z]+\\d+[a-z]+\\d+@[a-z]+\\.edu$',
      description: 'Username with multiple number groups',
      risk_level: 'high',
      action: 'block'
    }
  ];

  constructor(supabase: SupabaseClient, redis: Redis) {
    this.supabase = supabase;
    this.redis = redis;
  }

  /**
   * Records a fraud attempt in the database and Redis cache
   */
  public async recordFraudAttempt(
    email: string,
    ipAddress: string,
    reason: string,
    userAgent?: string,
    country?: string,
    city?: string
  ): Promise<void> {
    try {
      const riskScore = await this.calculateRiskScore(email, ipAddress, reason);
      const isBlocked = riskScore >= 80; // Block if risk score is 80 or higher

      const fraudAttempt: FraudAttempt = {
        email,
        ip_address: ipAddress,
        reason,
        timestamp: new Date().toISOString(),
        user_agent: userAgent,
        country,
        city,
        is_blocked: isBlocked,
        risk_score: riskScore,
        metadata: {
          user_agent: userAgent,
          country,
          city,
          timestamp: new Date().toISOString()
        }
      };

      // Store in database
      const { error: dbError } = await this.supabase
        .from('fraud_attempts')
        .insert([fraudAttempt]);

      if (dbError) {
        logger.error(`Error storing fraud attempt in database: ${dbError.message}`);
      }

      // Store in Redis for quick access
      const redisKey = `fraud_attempt:${ipAddress}:${email}`;
      await this.redis.setex(redisKey, 3600, JSON.stringify(fraudAttempt)); // 1 hour expiry

      // Update IP-based fraud counter
      const ipKey = `fraud_ip:${ipAddress}`;
      const ipCount = await this.redis.incr(ipKey);
      await this.redis.expire(ipKey, 86400); // 24 hours expiry

      // Update email-based fraud counter
      const emailKey = `fraud_email:${email}`;
      const emailCount = await this.redis.incr(emailKey);
      await this.redis.expire(emailKey, 86400); // 24 hours expiry

      logger.warn(`Fraud attempt recorded: ${email} from ${ipAddress}, risk score: ${riskScore}, blocked: ${isBlocked}`);

      // If risk score is high, add to blocklist
      if (isBlocked) {
        await this.addToBlocklist(email, ipAddress, reason);
      }
    } catch (error: any) {
      logger.error(`Error recording fraud attempt: ${error.message}`);
    }
  }

  /**
   * Calculates a risk score for a given email and IP address
   */
  private async calculateRiskScore(email: string, ipAddress: string, reason: string): Promise<number> {
    let riskScore = 0;

    // Base risk score from reason
    const reasonRiskScores: Record<string, number> = {
      'Disposable email addresses are not allowed.': 30,
      'Email prefix does not match approved patterns for this university.': 40,
      'Email domain not associated with an approved university.': 50,
      'Invalid email format.': 20,
      'Server error during email validation.': 10
    };

    riskScore += reasonRiskScores[reason] || 25;

    // Check for suspicious email patterns
    const suspiciousPattern = this.suspiciousPatterns.find(pattern => 
      new RegExp(pattern.pattern).test(email.toLowerCase())
    );

    if (suspiciousPattern) {
      const patternRiskScores: Record<string, number> = {
        'low': 10,
        'medium': 25,
        'high': 50,
        'critical': 75
      };
      riskScore += patternRiskScores[suspiciousPattern.risk_level];
    }

    // Check IP-based fraud history
    const ipKey = `fraud_ip:${ipAddress}`;
    const ipFraudCount = await this.redis.get(ipKey);
    if (ipFraudCount) {
      const count = parseInt(ipFraudCount);
      riskScore += Math.min(count * 10, 50); // Cap at 50 points
    }

    // Check email-based fraud history
    const emailKey = `fraud_email:${email}`;
    const emailFraudCount = await this.redis.get(emailKey);
    if (emailFraudCount) {
      const count = parseInt(emailFraudCount);
      riskScore += Math.min(count * 15, 60); // Cap at 60 points
    }

    // Check if IP is in blocklist
    const isIpBlocked = await this.isIpBlocked(ipAddress);
    if (isIpBlocked) {
      riskScore += 100; // Immediate block
    }

    // Check if email is in blocklist
    const isEmailBlocked = await this.isEmailBlocked(email);
    if (isEmailBlocked) {
      riskScore += 100; // Immediate block
    }

    return Math.min(riskScore, 100); // Cap at 100
  }

  /**
   * Checks if an IP address is blocked
   */
  public async isIpBlocked(ipAddress: string): Promise<boolean> {
    const blocklistKey = `blocklist_ip:${ipAddress}`;
    const isBlocked = await this.redis.get(blocklistKey);
    return isBlocked !== null;
  }

  /**
   * Checks if an email is blocked
   */
  public async isEmailBlocked(email: string): Promise<boolean> {
    const blocklistKey = `blocklist_email:${email}`;
    const isBlocked = await this.redis.get(blocklistKey);
    return isBlocked !== null;
  }

  /**
   * Adds an IP address or email to the blocklist
   */
  private async addToBlocklist(identifier: string, ipAddress: string, reason: string): Promise<void> {
    try {
      const blocklistEntry = {
        identifier,
        ip_address: ipAddress,
        reason,
        timestamp: new Date().toISOString(),
        blocked_by: 'fraud_detection_system'
      };

      // Add to Redis blocklist
      const blocklistKey = `blocklist_${identifier.includes('@') ? 'email' : 'ip'}:${identifier}`;
      await this.redis.setex(blocklistKey, 86400 * 7, JSON.stringify(blocklistEntry)); // 7 days expiry

      // Store in database for audit
      const { error } = await this.supabase
        .from('blocklist')
        .insert([blocklistEntry]);

      if (error) {
        logger.error(`Error storing blocklist entry in database: ${error.message}`);
      }

      logger.warn(`Added to blocklist: ${identifier} (${ipAddress}) - ${reason}`);
    } catch (error: any) {
      logger.error(`Error adding to blocklist: ${error.message}`);
    }
  }

  /**
   * Removes an IP address or email from the blocklist
   */
  public async removeFromBlocklist(identifier: string): Promise<void> {
    try {
      const blocklistKey = `blocklist_${identifier.includes('@') ? 'email' : 'ip'}:${identifier}`;
      await this.redis.del(blocklistKey);

      // Update database
      const { error } = await this.supabase
        .from('blocklist')
        .update({ is_active: false, unblocked_at: new Date().toISOString() })
        .eq('identifier', identifier)
        .eq('is_active', true);

      if (error) {
        logger.error(`Error updating blocklist entry in database: ${error.message}`);
      }

      logger.info(`Removed from blocklist: ${identifier}`);
    } catch (error: any) {
      logger.error(`Error removing from blocklist: ${error.message}`);
    }
  }

  /**
   * Gets fraud statistics for an IP address
   */
  public async getFraudStats(ipAddress: string): Promise<{
    totalAttempts: number;
    blockedAttempts: number;
    riskScore: number;
    lastAttempt: string | null;
  }> {
    try {
      const ipKey = `fraud_ip:${ipAddress}`;
      const totalAttempts = await this.redis.get(ipKey) || '0';

      const { data: fraudAttempts, error } = await this.supabase
        .from('fraud_attempts')
        .select('*')
        .eq('ip_address', ipAddress)
        .order('timestamp', { ascending: false })
        .limit(10);

      if (error) {
        logger.error(`Error fetching fraud attempts: ${error.message}`);
        return {
          totalAttempts: parseInt(totalAttempts),
          blockedAttempts: 0,
          riskScore: 0,
          lastAttempt: null
        };
      }

      const blockedAttempts = fraudAttempts?.filter(attempt => attempt.is_blocked).length || 0;
      const lastAttempt = fraudAttempts?.[0]?.timestamp || null;
      const riskScore = fraudAttempts?.[0]?.risk_score || 0;

      return {
        totalAttempts: parseInt(totalAttempts),
        blockedAttempts,
        riskScore,
        lastAttempt
      };
    } catch (error: any) {
      logger.error(`Error getting fraud stats: ${error.message}`);
      return {
        totalAttempts: 0,
        blockedAttempts: 0,
        riskScore: 0,
        lastAttempt: null
      };
    }
  }

  /**
   * Gets fraud statistics for an email
   */
  public async getEmailFraudStats(email: string): Promise<{
    totalAttempts: number;
    blockedAttempts: number;
    riskScore: number;
    lastAttempt: string | null;
  }> {
    try {
      const emailKey = `fraud_email:${email}`;
      const totalAttempts = await this.redis.get(emailKey) || '0';

      const { data: fraudAttempts, error } = await this.supabase
        .from('fraud_attempts')
        .select('*')
        .eq('email', email)
        .order('timestamp', { ascending: false })
        .limit(10);

      if (error) {
        logger.error(`Error fetching fraud attempts: ${error.message}`);
        return {
          totalAttempts: parseInt(totalAttempts),
          blockedAttempts: 0,
          riskScore: 0,
          lastAttempt: null
        };
      }

      const blockedAttempts = fraudAttempts?.filter(attempt => attempt.is_blocked).length || 0;
      const lastAttempt = fraudAttempts?.[0]?.timestamp || null;
      const riskScore = fraudAttempts?.[0]?.risk_score || 0;

      return {
        totalAttempts: parseInt(totalAttempts),
        blockedAttempts,
        riskScore,
        lastAttempt
      };
    } catch (error: any) {
      logger.error(`Error getting email fraud stats: ${error.message}`);
      return {
        totalAttempts: 0,
        blockedAttempts: 0,
        riskScore: 0,
        lastAttempt: null
      };
    }
  }

  /**
   * Cleans up old fraud attempts and blocklist entries
   */
  public async cleanupOldEntries(): Promise<void> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Clean up old fraud attempts
      const { error: fraudError } = await this.supabase
        .from('fraud_attempts')
        .delete()
        .lt('timestamp', thirtyDaysAgo.toISOString());

      if (fraudError) {
        logger.error(`Error cleaning up old fraud attempts: ${fraudError.message}`);
      }

      // Clean up old blocklist entries
      const { error: blocklistError } = await this.supabase
        .from('blocklist')
        .delete()
        .lt('timestamp', thirtyDaysAgo.toISOString());

      if (blocklistError) {
        logger.error(`Error cleaning up old blocklist entries: ${blocklistError.message}`);
      }

      logger.info('Cleaned up old fraud attempts and blocklist entries');
    } catch (error: any) {
      logger.error(`Error during cleanup: ${error.message}`);
    }
  }
}

// Export a singleton instance
let fraudDetectionService: FraudDetectionService | null = null;

export const getFraudDetectionService = (supabase: SupabaseClient, redis: Redis): FraudDetectionService => {
  if (!fraudDetectionService) {
    fraudDetectionService = new FraudDetectionService(supabase, redis);
  }
  return fraudDetectionService;
};

// Export the recordFraudAttempt function for use in other modules
export const recordFraudAttempt = async (
  supabase: SupabaseClient,
  email: string,
  ipAddress: string,
  reason: string,
  userAgent?: string,
  country?: string,
  city?: string
): Promise<void> => {
  const fraudService = getFraudDetectionService(supabase, new (require('ioredis').Redis)());
  await fraudService.recordFraudAttempt(email, ipAddress, reason, userAgent, country, city);
};
