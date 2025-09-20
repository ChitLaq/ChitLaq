import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { SupabaseClient } from '@supabase/supabase-js';
import { Redis } from 'ioredis';
import { UniversityEmailValidator } from '../src/validators/university-email';
import { FraudDetectionService } from '../src/utils/fraud-detection';

// Mock dependencies
jest.mock('@supabase/supabase-js');
jest.mock('ioredis');
jest.mock('../../../utils/logger');

describe('University Email Validation', () => {
  let mockSupabase: jest.Mocked<SupabaseClient>;
  let mockRedis: jest.Mocked<Redis>;
  let validator: UniversityEmailValidator;
  let fraudService: FraudDetectionService;

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis()
    } as any;

    mockRedis = {
      get: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      incr: jest.fn(),
      expire: jest.fn(),
      zadd: jest.fn(),
      zcard: jest.fn(),
      zremrangebyscore: jest.fn()
    } as any;

    validator = new UniversityEmailValidator(mockSupabase, mockRedis);
    fraudService = new FraudDetectionService(mockSupabase, mockRedis);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Email Validation', () => {
    it('should validate a legitimate university email', async () => {
      const mockUniversity = {
        id: '1',
        name: 'MIT',
        domains: ['mit.edu'],
        is_approved: true,
        has_prefix_validation: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [mockUniversity],
            error: null
          })
        })
      } as any);

      mockRedis.get.mockResolvedValue(null);

      const result = await validator.validate('john.doe@mit.edu');

      expect(result.isValid).toBe(true);
      expect(result.university).toEqual(mockUniversity);
    });

    it('should reject invalid email format', async () => {
      const result = await validator.validate('invalid-email');

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Invalid email format.');
    });

    it('should reject disposable email addresses', async () => {
      const result = await validator.validate('test@10minutemail.com');

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Disposable email addresses are not allowed.');
    });

    it('should reject emails from non-approved universities', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [],
            error: null
          })
        })
      } as any);

      mockRedis.get.mockResolvedValue(null);

      const result = await validator.validate('test@fakeuniversity.edu');

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Email domain not associated with an approved university.');
    });

    it('should validate email with prefix requirements', async () => {
      const mockUniversity = {
        id: '1',
        name: 'MIT',
        domains: ['mit.edu'],
        is_approved: true,
        has_prefix_validation: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      const mockPrefixes = [
        { prefix: 'cs_' },
        { prefix: 'eng_' }
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [mockUniversity],
            error: null
          })
        })
      } as any);

      mockRedis.get.mockResolvedValue(null);

      const result = await validator.validate('cs_john.doe@mit.edu');

      expect(result.isValid).toBe(true);
      expect(result.university).toEqual(mockUniversity);
    });

    it('should reject email with invalid prefix', async () => {
      const mockUniversity = {
        id: '1',
        name: 'MIT',
        domains: ['mit.edu'],
        is_approved: true,
        has_prefix_validation: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      const mockPrefixes = [
        { prefix: 'cs_' },
        { prefix: 'eng_' }
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [mockUniversity],
            error: null
          })
        })
      } as any);

      mockRedis.get.mockResolvedValue(null);

      const result = await validator.validate('invalid_john.doe@mit.edu');

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Email prefix does not match approved patterns for this university.');
    });
  });

  describe('Fraud Detection', () => {
    it('should record fraud attempt with correct risk score', async () => {
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({
          data: null,
          error: null
        })
      } as any);

      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockResolvedValue('OK');
      mockRedis.incr.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(1);

      await fraudService.recordFraudAttempt(
        'test@fakeuniversity.edu',
        '192.168.1.1',
        'Email domain not associated with an approved university.'
      );

      expect(mockSupabase.from).toHaveBeenCalledWith('fraud_attempts');
      expect(mockRedis.setex).toHaveBeenCalled();
      expect(mockRedis.incr).toHaveBeenCalledTimes(2); // IP and email counters
    });

    it('should block high-risk IP addresses', async () => {
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({
          data: null,
          error: null
        })
      } as any);

      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockResolvedValue('OK');
      mockRedis.incr.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(1);

      await fraudService.recordFraudAttempt(
        'test@fakeuniversity.edu',
        '192.168.1.1',
        'Email domain not associated with an approved university.'
      );

      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.stringContaining('blocklist_ip:192.168.1.1'),
        expect.any(Number),
        expect.any(String)
      );
    });

    it('should detect suspicious email patterns', async () => {
      const suspiciousEmails = [
        'a123456@university.edu',
        'ab123456@university.edu',
        'abc123456@university.edu'
      ];

      for (const email of suspiciousEmails) {
        const result = await fraudService.calculateRiskScore(email, '192.168.1.1', 'Test reason');
        expect(result).toBeGreaterThan(50); // High risk score
      }
    });

    it('should clean up old fraud attempts', async () => {
      mockSupabase.from.mockReturnValue({
        delete: jest.fn().mockResolvedValue({
          data: null,
          error: null
        })
      } as any);

      await fraudService.cleanupOldEntries();

      expect(mockSupabase.from).toHaveBeenCalledWith('fraud_attempts');
      expect(mockSupabase.from).toHaveBeenCalledWith('blocklist');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits for email validation', async () => {
      const mockReq = {
        ip: '192.168.1.1',
        headers: {}
      } as any;

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any;

      const mockNext = jest.fn();

      // Mock Redis to simulate rate limit exceeded
      mockRedis.zremrangebyscore.mockResolvedValue(0);
      mockRedis.zcard.mockResolvedValue(15); // Exceeds limit of 10
      mockRedis.zadd.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(1);

      const rateLimitMiddleware = require('../src/middleware/rate-limit').createRateLimitMiddleware;
      const middleware = rateLimitMiddleware(mockRedis, {
        windowMs: 60000,
        max: 10
      });

      await middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Too many requests, please try again after some time.'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow requests within rate limit', async () => {
      const mockReq = {
        ip: '192.168.1.1',
        headers: {}
      } as any;

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any;

      const mockNext = jest.fn();

      // Mock Redis to simulate within rate limit
      mockRedis.zremrangebyscore.mockResolvedValue(0);
      mockRedis.zcard.mockResolvedValue(5); // Within limit of 10
      mockRedis.zadd.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(1);

      const rateLimitMiddleware = require('../src/middleware/rate-limit').createRateLimitMiddleware;
      const middleware = rateLimitMiddleware(mockRedis, {
        windowMs: 60000,
        max: 10
      });

      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle database errors gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database connection failed' }
          })
        })
      } as any);

      mockRedis.get.mockResolvedValue(null);

      await expect(validator.validate('test@mit.edu')).rejects.toThrow('Failed to fetch approved universities.');
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis connection failed'));

      await expect(validator.validate('test@mit.edu')).rejects.toThrow();
    });

    it('should handle empty email input', async () => {
      const result = await validator.validate('');

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Invalid email format.');
    });

    it('should handle null email input', async () => {
      const result = await validator.validate(null as any);

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Invalid email format.');
    });

    it('should handle undefined email input', async () => {
      const result = await validator.validate(undefined as any);

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Invalid email format.');
    });
  });
});
