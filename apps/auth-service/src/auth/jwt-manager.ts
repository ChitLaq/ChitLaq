import jwt from 'jsonwebtoken';
import { Redis } from 'ioredis';
import { getLogger } from '../../../utils/logger';
import { authConfig, CustomJWTClaims, DeviceInfo } from './supabase-config';

const logger = getLogger('JWTManager');

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface RefreshTokenPayload {
  sub: string;
  email: string;
  university_id: string;
  deviceFingerprint: string;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

export class JWTManager {
  private redis: Redis;
  private secret: string;
  private refreshSecret: string;

  constructor(redis: Redis) {
    this.redis = redis;
    this.secret = authConfig.jwt.secret;
    this.refreshSecret = process.env.JWT_REFRESH_SECRET || this.secret + '_refresh';
  }

  /**
   * Generate access token with custom claims
   */
  public generateAccessToken(
    userId: string,
    email: string,
    universityData: {
      id: string;
      name: string;
      domain: string;
      userType: 'student' | 'faculty' | 'staff';
      department?: string;
      faculty?: string;
    },
    deviceInfo: DeviceInfo
  ): string {
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = 15 * 60; // 15 minutes

    const claims: CustomJWTClaims = {
      sub: userId,
      email,
      university_id: universityData.id,
      university_name: universityData.name,
      university_domain: universityData.domain,
      user_type: universityData.userType,
      department: universityData.department,
      faculty: universityData.faculty,
      verified: true,
      iat: now,
      exp: now + expiresIn,
      iss: 'chitlaq-auth-service',
      aud: 'chitlaq-app',
    };

    const token = jwt.sign(claims, this.secret, {
      algorithm: 'HS256',
      expiresIn,
    });

    logger.debug(`Access token generated for user ${userId}`);
    return token;
  }

  /**
   * Generate refresh token
   */
  public generateRefreshToken(
    userId: string,
    email: string,
    universityId: string,
    deviceFingerprint: string
  ): string {
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = 7 * 24 * 60 * 60; // 7 days

    const payload: RefreshTokenPayload = {
      sub: userId,
      email,
      university_id: universityId,
      deviceFingerprint,
      iat: now,
      exp: now + expiresIn,
      iss: 'chitlaq-auth-service',
      aud: 'chitlaq-app',
    };

    const token = jwt.sign(payload, this.refreshSecret, {
      algorithm: 'HS256',
      expiresIn,
    });

    // Store refresh token in Redis with expiration
    const redisKey = `refresh_token:${userId}:${deviceFingerprint}`;
    this.redis.setex(redisKey, expiresIn, token);

    logger.debug(`Refresh token generated for user ${userId}`);
    return token;
  }

  /**
   * Generate token pair (access + refresh)
   */
  public generateTokenPair(
    userId: string,
    email: string,
    universityData: {
      id: string;
      name: string;
      domain: string;
      userType: 'student' | 'faculty' | 'staff';
      department?: string;
      faculty?: string;
    },
    deviceInfo: DeviceInfo
  ): TokenPair {
    const accessToken = this.generateAccessToken(userId, email, universityData, deviceInfo);
    const refreshToken = this.generateRefreshToken(
      userId,
      email,
      universityData.id,
      deviceInfo.fingerprint
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 minutes
      tokenType: 'Bearer',
    };
  }

  /**
   * Verify access token
   */
  public verifyAccessToken(token: string): CustomJWTClaims | null {
    try {
      const decoded = jwt.verify(token, this.secret, {
        algorithms: ['HS256'],
        issuer: 'chitlaq-auth-service',
        audience: 'chitlaq-app',
      }) as CustomJWTClaims;

      // Check if token is blacklisted
      if (this.isTokenBlacklisted(token)) {
        logger.warn(`Blacklisted token used: ${decoded.sub}`);
        return null;
      }

      return decoded;
    } catch (error) {
      logger.warn(`Token verification failed: ${error}`);
      return null;
    }
  }

  /**
   * Verify refresh token
   */
  public verifyRefreshToken(token: string): RefreshTokenPayload | null {
    try {
      const decoded = jwt.verify(token, this.refreshSecret, {
        algorithms: ['HS256'],
        issuer: 'chitlaq-auth-service',
        audience: 'chitlaq-app',
      }) as RefreshTokenPayload;

      // Check if refresh token exists in Redis
      const redisKey = `refresh_token:${decoded.sub}:${decoded.deviceFingerprint}`;
      const storedToken = this.redis.get(redisKey);
      
      if (!storedToken || storedToken !== token) {
        logger.warn(`Invalid refresh token: ${decoded.sub}`);
        return null;
      }

      return decoded;
    } catch (error) {
      logger.warn(`Refresh token verification failed: ${error}`);
      return null;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  public async refreshAccessToken(
    refreshToken: string,
    universityData: {
      id: string;
      name: string;
      domain: string;
      userType: 'student' | 'faculty' | 'staff';
      department?: string;
      faculty?: string;
    },
    deviceInfo: DeviceInfo
  ): Promise<TokenPair | null> {
    const payload = this.verifyRefreshToken(refreshToken);
    if (!payload) {
      return null;
    }

    // Generate new token pair
    const newTokenPair = this.generateTokenPair(
      payload.sub,
      payload.email,
      universityData,
      deviceInfo
    );

    // Invalidate old refresh token
    await this.revokeRefreshToken(payload.sub, payload.deviceFingerprint);

    logger.info(`Access token refreshed for user ${payload.sub}`);
    return newTokenPair;
  }

  /**
   * Revoke refresh token
   */
  public async revokeRefreshToken(userId: string, deviceFingerprint: string): Promise<void> {
    const redisKey = `refresh_token:${userId}:${deviceFingerprint}`;
    await this.redis.del(redisKey);
    logger.debug(`Refresh token revoked for user ${userId}`);
  }

  /**
   * Revoke all refresh tokens for a user
   */
  public async revokeAllRefreshTokens(userId: string): Promise<void> {
    const pattern = `refresh_token:${userId}:*`;
    const keys = await this.redis.keys(pattern);
    
    if (keys.length > 0) {
      await this.redis.del(...keys);
      logger.info(`All refresh tokens revoked for user ${userId}`);
    }
  }

  /**
   * Blacklist a token
   */
  public async blacklistToken(token: string, expiresIn: number): Promise<void> {
    const tokenHash = this.hashToken(token);
    const redisKey = `blacklist:${tokenHash}`;
    await this.redis.setex(redisKey, expiresIn, '1');
    logger.debug('Token blacklisted');
  }

  /**
   * Check if token is blacklisted
   */
  private isTokenBlacklisted(token: string): boolean {
    const tokenHash = this.hashToken(token);
    const redisKey = `blacklist:${tokenHash}`;
    return this.redis.exists(redisKey) === 1;
  }

  /**
   * Hash token for blacklist storage
   */
  private hashToken(token: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Get active sessions for a user
   */
  public async getActiveSessions(userId: string): Promise<Array<{
    deviceFingerprint: string;
    lastActivity: string;
    ipAddress: string;
  }>> {
    const pattern = `refresh_token:${userId}:*`;
    const keys = await this.redis.keys(pattern);
    const sessions = [];

    for (const key of keys) {
      const deviceFingerprint = key.split(':')[2];
      const sessionData = await this.redis.get(`session:${userId}:${deviceFingerprint}`);
      
      if (sessionData) {
        const data = JSON.parse(sessionData);
        sessions.push({
          deviceFingerprint,
          lastActivity: data.lastActivity,
          ipAddress: data.ipAddress,
        });
      }
    }

    return sessions;
  }

  /**
   * Clean up expired tokens
   */
  public async cleanupExpiredTokens(): Promise<void> {
    const patterns = ['blacklist:*', 'refresh_token:*'];
    
    for (const pattern of patterns) {
      const keys = await this.redis.keys(pattern);
      const pipeline = this.redis.pipeline();
      
      for (const key of keys) {
        const ttl = await this.redis.ttl(key);
        if (ttl === -1) {
          // Key has no expiration, set one
          pipeline.expire(key, 86400); // 24 hours
        }
      }
      
      await pipeline.exec();
    }
    
    logger.debug('Expired tokens cleanup completed');
  }
}

// Export singleton instance
let jwtManager: JWTManager | null = null;

export const getJWTManager = (redis: Redis): JWTManager => {
  if (!jwtManager) {
    jwtManager = new JWTManager(redis);
  }
  return jwtManager;
};

export default JWTManager;
