import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { getLogger } from '../../../utils/logger';
import { authConfig } from '../auth/supabase-config';

const logger = getLogger('SecurityUtils');

export interface SecurityMetrics {
  passwordStrength: number;
  entropy: number;
  commonPasswordCheck: boolean;
  breachCheck: boolean;
}

export interface DeviceFingerprint {
  userAgent: string;
  platform: string;
  language: string;
  timezone: string;
  screenResolution?: string;
  colorDepth?: number;
  fingerprint: string;
}

export interface SecurityEvent {
  type: 'login' | 'logout' | 'password_change' | 'suspicious_activity' | 'rate_limit';
  userId?: string;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  details: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export class SecurityUtils {
  private static readonly COMMON_PASSWORDS = [
    'password', '123456', '123456789', 'qwerty', 'abc123', 'password123',
    'admin', 'letmein', 'welcome', 'monkey', '1234567890', 'password1',
    'qwerty123', 'dragon', 'master', 'hello', 'freedom', 'whatever',
    'qazwsx', 'trustno1', '654321', 'jordan23', 'harley', 'password1',
    'jordan', 'jennifer', 'zxcvbnm', 'asdfgh', '123123', 'qwertyuiop'
  ];

  private static readonly BREACHED_PASSWORDS = new Set([
    // This would be populated from HaveIBeenPwned API or similar
  ]);

  /**
   * Hash password using bcrypt
   */
  public static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify password against hash
   */
  public static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Calculate password strength score (0-100)
   */
  public static calculatePasswordStrength(password: string): SecurityMetrics {
    let score = 0;
    const errors: string[] = [];

    // Length check
    if (password.length >= 8) score += 20;
    if (password.length >= 12) score += 10;
    if (password.length >= 16) score += 10;

    // Character variety
    if (/[a-z]/.test(password)) score += 10;
    if (/[A-Z]/.test(password)) score += 10;
    if (/\d/.test(password)) score += 10;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 10;

    // Entropy calculation
    const entropy = this.calculateEntropy(password);

    // Common password check
    const isCommonPassword = this.COMMON_PASSWORDS.includes(password.toLowerCase());

    // Breach check (simplified)
    const isBreached = this.BREACHED_PASSWORDS.has(password);

    return {
      passwordStrength: Math.min(score, 100),
      entropy,
      commonPasswordCheck: !isCommonPassword,
      breachCheck: !isBreached,
    };
  }

  /**
   * Calculate password entropy
   */
  private static calculateEntropy(password: string): number {
    const charSet = new Set(password);
    const charsetSize = charSet.size;
    return Math.log2(Math.pow(charsetSize, password.length));
  }

  /**
   * Generate secure random token
   */
  public static generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate device fingerprint
   */
  public static generateDeviceFingerprint(deviceInfo: Partial<DeviceFingerprint>): string {
    const components = [
      deviceInfo.userAgent || '',
      deviceInfo.platform || '',
      deviceInfo.language || '',
      deviceInfo.timezone || '',
      deviceInfo.screenResolution || '',
      deviceInfo.colorDepth?.toString() || '',
    ];

    const fingerprint = crypto
      .createHash('sha256')
      .update(components.join('|'))
      .digest('hex');

    return fingerprint;
  }

  /**
   * Validate device fingerprint
   */
  public static validateDeviceFingerprint(fingerprint: string): boolean {
    // Basic validation - should be 64 character hex string
    return /^[a-f0-9]{64}$/.test(fingerprint);
  }

  /**
   * Generate CSRF token
   */
  public static generateCSRFToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Verify CSRF token
   */
  public static verifyCSRFToken(token: string, sessionToken: string): boolean {
    return crypto.timingSafeEqual(
      Buffer.from(token, 'hex'),
      Buffer.from(sessionToken, 'hex')
    );
  }

  /**
   * Encrypt sensitive data
   */
  public static encryptData(data: string, key: string): string {
    const algorithm = 'aes-256-gcm';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, key);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt sensitive data
   */
  public static decryptData(encryptedData: string, key: string): string {
    const algorithm = 'aes-256-gcm';
    const parts = encryptedData.split(':');
    
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipher(algorithm, key);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Generate secure session ID
   */
  public static generateSessionId(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hash session ID for storage
   */
  public static hashSessionId(sessionId: string): string {
    return crypto.createHash('sha256').update(sessionId).digest('hex');
  }

  /**
   * Validate IP address
   */
  public static validateIPAddress(ip: string): boolean {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }

  /**
   * Check if IP is in private range
   */
  public static isPrivateIP(ip: string): boolean {
    const privateRanges = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^127\./,
      /^::1$/,
      /^fc00:/,
      /^fe80:/,
    ];
    
    return privateRanges.some(range => range.test(ip));
  }

  /**
   * Generate secure email verification token
   */
  public static generateEmailVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate password reset token
   */
  public static generatePasswordResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Validate email format
   */
  public static validateEmailFormat(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Sanitize user input
   */
  public static sanitizeInput(input: string): string {
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/['"]/g, '') // Remove quotes
      .substring(0, 1000); // Limit length
  }

  /**
   * Check for SQL injection patterns
   */
  public static detectSQLInjection(input: string): boolean {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
      /(--|\#|\/\*|\*\/)/,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
      /(\b(OR|AND)\s+['"]\s*=\s*['"])/i,
    ];
    
    return sqlPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Check for XSS patterns
   */
  public static detectXSS(input: string): boolean {
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /<iframe[^>]*>.*?<\/iframe>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<[^>]*>/g,
    ];
    
    return xssPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Rate limiting helper
   */
  public static generateRateLimitKey(identifier: string, action: string): string {
    return `rate_limit:${action}:${identifier}`;
  }

  /**
   * Generate audit log entry
   */
  public static createAuditLog(
    type: SecurityEvent['type'],
    userId: string | undefined,
    ipAddress: string,
    userAgent: string,
    details: Record<string, any>,
    severity: SecurityEvent['severity'] = 'low'
  ): SecurityEvent {
    return {
      type,
      userId,
      ipAddress,
      userAgent,
      timestamp: new Date().toISOString(),
      details,
      severity,
    };
  }

  /**
   * Validate JWT token format
   */
  public static validateJWTFormat(token: string): boolean {
    const parts = token.split('.');
    return parts.length === 3 && parts.every(part => part.length > 0);
  }

  /**
   * Generate secure random string
   */
  public static generateRandomString(length: number, charset: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'): string {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return result;
  }

  /**
   * Check password against common patterns
   */
  public static checkPasswordPatterns(password: string): string[] {
    const warnings: string[] = [];
    
    // Sequential characters
    if (/(123|abc|qwe|asd|zxc)/i.test(password)) {
      warnings.push('Password contains sequential characters');
    }
    
    // Repeated characters
    if (/(.)\1{2,}/.test(password)) {
      warnings.push('Password contains repeated characters');
    }
    
    // Keyboard patterns
    if (/(qwerty|asdfgh|zxcvbn)/i.test(password)) {
      warnings.push('Password contains keyboard patterns');
    }
    
    // Common substitutions
    if (/(p@ssw0rd|p@55w0rd|p@ssword)/i.test(password)) {
      warnings.push('Password uses common character substitutions');
    }
    
    return warnings;
  }

  /**
   * Generate secure API key
   */
  public static generateAPIKey(): string {
    const prefix = 'chitlaq_';
    const randomPart = crypto.randomBytes(24).toString('hex');
    return prefix + randomPart;
  }

  /**
   * Validate API key format
   */
  public static validateAPIKey(apiKey: string): boolean {
    const apiKeyRegex = /^chitlaq_[a-f0-9]{48}$/;
    return apiKeyRegex.test(apiKey);
  }

  /**
   * Hash API key for storage
   */
  public static hashAPIKey(apiKey: string): string {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }

  /**
   * Generate secure file upload token
   */
  public static generateFileUploadToken(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Validate file upload token
   */
  public static validateFileUploadToken(token: string): boolean {
    return /^[a-f0-9]{32}$/.test(token);
  }
}

export default SecurityUtils;
