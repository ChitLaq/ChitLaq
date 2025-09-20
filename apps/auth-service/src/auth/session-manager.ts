import { Redis } from 'ioredis';
import { getLogger } from '../../../utils/logger';
import { DeviceInfo, SessionMetadata, LoginAttempt } from './supabase-config';
import { JWTManager } from './jwt-manager';

const logger = getLogger('SessionManager');

export interface SessionData {
  userId: string;
  email: string;
  universityId: string;
  deviceInfo: DeviceInfo;
  ipAddress: string;
  loginTime: string;
  lastActivity: string;
  isActive: boolean;
  sessionId: string;
}

export interface SessionStats {
  totalSessions: number;
  activeSessions: number;
  lastLogin: string | null;
  deviceCount: number;
}

export class SessionManager {
  private redis: Redis;
  private jwtManager: JWTManager;
  private sessionPrefix = 'session:';
  private loginAttemptPrefix = 'login_attempt:';
  private userSessionsPrefix = 'user_sessions:';

  constructor(redis: Redis, jwtManager: JWTManager) {
    this.redis = redis;
    this.jwtManager = jwtManager;
  }

  /**
   * Create a new session
   */
  public async createSession(
    userId: string,
    email: string,
    universityId: string,
    deviceInfo: DeviceInfo,
    ipAddress: string
  ): Promise<SessionData> {
    const sessionId = this.generateSessionId();
    const now = new Date().toISOString();

    const sessionData: SessionData = {
      userId,
      email,
      universityId,
      deviceInfo,
      ipAddress,
      loginTime: now,
      lastActivity: now,
      isActive: true,
      sessionId,
    };

    // Store session data
    const sessionKey = `${this.sessionPrefix}${userId}:${deviceInfo.fingerprint}`;
    await this.redis.setex(sessionKey, 7 * 24 * 60 * 60, JSON.stringify(sessionData)); // 7 days

    // Add to user's active sessions set
    const userSessionsKey = `${this.userSessionsPrefix}${userId}`;
    await this.redis.sadd(userSessionsKey, deviceInfo.fingerprint);
    await this.redis.expire(userSessionsKey, 7 * 24 * 60 * 60);

    // Update session metadata
    const metadata: SessionMetadata = {
      deviceInfo,
      ipAddress,
      loginTime: now,
      lastActivity: now,
      isActive: true,
    };

    const metadataKey = `session_metadata:${userId}:${deviceInfo.fingerprint}`;
    await this.redis.setex(metadataKey, 7 * 24 * 60 * 60, JSON.stringify(metadata));

    logger.info(`Session created for user ${userId} on device ${deviceInfo.fingerprint}`);
    return sessionData;
  }

  /**
   * Get session data
   */
  public async getSession(userId: string, deviceFingerprint: string): Promise<SessionData | null> {
    const sessionKey = `${this.sessionPrefix}${userId}:${deviceFingerprint}`;
    const sessionData = await this.redis.get(sessionKey);

    if (!sessionData) {
      return null;
    }

    return JSON.parse(sessionData);
  }

  /**
   * Update session activity
   */
  public async updateSessionActivity(userId: string, deviceFingerprint: string): Promise<void> {
    const sessionKey = `${this.sessionPrefix}${userId}:${deviceFingerprint}`;
    const sessionData = await this.redis.get(sessionKey);

    if (sessionData) {
      const session = JSON.parse(sessionData);
      session.lastActivity = new Date().toISOString();
      
      await this.redis.setex(sessionKey, 7 * 24 * 60 * 60, JSON.stringify(session));

      // Update metadata
      const metadataKey = `session_metadata:${userId}:${deviceFingerprint}`;
      const metadataData = await this.redis.get(metadataKey);
      
      if (metadataData) {
        const metadata = JSON.parse(metadataData);
        metadata.lastActivity = session.lastActivity;
        await this.redis.setex(metadataKey, 7 * 24 * 60 * 60, JSON.stringify(metadata));
      }
    }
  }

  /**
   * Invalidate session
   */
  public async invalidateSession(userId: string, deviceFingerprint: string): Promise<void> {
    const sessionKey = `${this.sessionPrefix}${userId}:${deviceFingerprint}`;
    const metadataKey = `session_metadata:${userId}:${deviceFingerprint}`;
    const userSessionsKey = `${this.userSessionsPrefix}${userId}`;

    // Remove session data
    await this.redis.del(sessionKey);
    await this.redis.del(metadataKey);
    
    // Remove from user's active sessions
    await this.redis.srem(userSessionsKey, deviceFingerprint);

    // Revoke refresh token
    await this.jwtManager.revokeRefreshToken(userId, deviceFingerprint);

    logger.info(`Session invalidated for user ${userId} on device ${deviceFingerprint}`);
  }

  /**
   * Invalidate all sessions for a user
   */
  public async invalidateAllSessions(userId: string): Promise<void> {
    const userSessionsKey = `${this.userSessionsPrefix}${userId}`;
    const deviceFingerprints = await this.redis.smembers(userSessionsKey);

    for (const fingerprint of deviceFingerprints) {
      await this.invalidateSession(userId, fingerprint);
    }

    logger.info(`All sessions invalidated for user ${userId}`);
  }

  /**
   * Get all active sessions for a user
   */
  public async getActiveSessions(userId: string): Promise<SessionData[]> {
    const userSessionsKey = `${this.userSessionsPrefix}${userId}`;
    const deviceFingerprints = await this.redis.smembers(userSessionsKey);
    const sessions: SessionData[] = [];

    for (const fingerprint of deviceFingerprints) {
      const session = await this.getSession(userId, fingerprint);
      if (session && session.isActive) {
        sessions.push(session);
      }
    }

    return sessions;
  }

  /**
   * Get session statistics
   */
  public async getSessionStats(userId: string): Promise<SessionStats> {
    const userSessionsKey = `${this.userSessionsPrefix}${userId}`;
    const deviceFingerprints = await this.redis.smembers(userSessionsKey);
    
    let totalSessions = 0;
    let activeSessions = 0;
    let lastLogin: string | null = null;
    let deviceCount = deviceFingerprints.length;

    for (const fingerprint of deviceFingerprints) {
      const session = await this.getSession(userId, fingerprint);
      if (session) {
        totalSessions++;
        if (session.isActive) {
          activeSessions++;
        }
        
        if (!lastLogin || session.loginTime > lastLogin) {
          lastLogin = session.loginTime;
        }
      }
    }

    return {
      totalSessions,
      activeSessions,
      lastLogin,
      deviceCount,
    };
  }

  /**
   * Record login attempt
   */
  public async recordLoginAttempt(attempt: LoginAttempt): Promise<void> {
    const attemptKey = `${this.loginAttemptPrefix}${attempt.email}:${attempt.ipAddress}`;
    const attempts = await this.redis.get(attemptKey);
    
    const attemptData = attempts ? JSON.parse(attempts) : [];
    attemptData.push(attempt);
    
    // Keep only last 10 attempts
    if (attemptData.length > 10) {
      attemptData.splice(0, attemptData.length - 10);
    }
    
    await this.redis.setex(attemptKey, 24 * 60 * 60, JSON.stringify(attemptData)); // 24 hours
    
    logger.debug(`Login attempt recorded for ${attempt.email} from ${attempt.ipAddress}`);
  }

  /**
   * Get login attempts for an email/IP combination
   */
  public async getLoginAttempts(email: string, ipAddress: string): Promise<LoginAttempt[]> {
    const attemptKey = `${this.loginAttemptPrefix}${email}:${ipAddress}`;
    const attempts = await this.redis.get(attemptKey);
    
    return attempts ? JSON.parse(attempts) : [];
  }

  /**
   * Check if IP is rate limited
   */
  public async isRateLimited(email: string, ipAddress: string): Promise<boolean> {
    const attempts = await this.getLoginAttempts(email, ipAddress);
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    // Count failed attempts in the last hour
    const recentFailedAttempts = attempts.filter(attempt => 
      !attempt.success && new Date(attempt.timestamp).getTime() > oneHourAgo
    );
    
    return recentFailedAttempts.length >= 5; // Max 5 failed attempts per hour
  }

  /**
   * Clean up expired sessions
   */
  public async cleanupExpiredSessions(): Promise<void> {
    const patterns = [
      `${this.sessionPrefix}*`,
      `${this.userSessionsPrefix}*`,
      `${this.loginAttemptPrefix}*`,
      'session_metadata:*'
    ];

    for (const pattern of patterns) {
      const keys = await this.redis.keys(pattern);
      const pipeline = this.redis.pipeline();
      
      for (const key of keys) {
        const ttl = await this.redis.ttl(key);
        if (ttl === -1) {
          // Key has no expiration, set one
          pipeline.expire(key, 7 * 24 * 60 * 60); // 7 days
        }
      }
      
      await pipeline.exec();
    }
    
    logger.debug('Expired sessions cleanup completed');
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Check session validity
   */
  public async isSessionValid(userId: string, deviceFingerprint: string): Promise<boolean> {
    const session = await this.getSession(userId, deviceFingerprint);
    
    if (!session || !session.isActive) {
      return false;
    }

    // Check if session is expired (7 days)
    const sessionAge = Date.now() - new Date(session.loginTime).getTime();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
    
    if (sessionAge > maxAge) {
      await this.invalidateSession(userId, deviceFingerprint);
      return false;
    }

    return true;
  }

  /**
   * Get session by session ID
   */
  public async getSessionById(sessionId: string): Promise<SessionData | null> {
    const pattern = `${this.sessionPrefix}*`;
    const keys = await this.redis.keys(pattern);
    
    for (const key of keys) {
      const sessionData = await this.redis.get(key);
      if (sessionData) {
        const session = JSON.parse(sessionData);
        if (session.sessionId === sessionId) {
          return session;
        }
      }
    }
    
    return null;
  }
}

// Export singleton instance
let sessionManager: SessionManager | null = null;

export const getSessionManager = (redis: Redis, jwtManager: JWTManager): SessionManager => {
  if (!sessionManager) {
    sessionManager = new SessionManager(redis, jwtManager);
  }
  return sessionManager;
};

export default SessionManager;
