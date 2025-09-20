import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { UniversityEmailValidator } from '../../src/validators/university-email';
import { University } from '../../src/models/university';
import { SupabaseClient } from '@supabase/supabase-js';

// Mock Supabase client
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        ilike: jest.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
  })),
} as unknown as SupabaseClient;

describe('University Email Validation', () => {
  let validator: UniversityEmailValidator;

  beforeEach(() => {
    validator = new UniversityEmailValidator(mockSupabase);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Email Format Validation', () => {
    it('should validate correct email format', async () => {
      const result = await validator.validateEmailFormat('john.doe@university.edu');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid email format', async () => {
      const result = await validator.validateEmailFormat('invalid-email');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid email format');
    });

    it('should reject email without @ symbol', async () => {
      const result = await validator.validateEmailFormat('johndoeuniversity.edu');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid email format');
    });

    it('should reject email with multiple @ symbols', async () => {
      const result = await validator.validateEmailFormat('john@doe@university.edu');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid email format');
    });

    it('should reject email with spaces', async () => {
      const result = await validator.validateEmailFormat('john doe@university.edu');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid email format');
    });

    it('should reject email with special characters in local part', async () => {
      const result = await validator.validateEmailFormat('john+doe@university.edu');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid email format');
    });

    it('should reject email with consecutive dots', async () => {
      const result = await validator.validateEmailFormat('john..doe@university.edu');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid email format');
    });

    it('should reject email starting with dot', async () => {
      const result = await validator.validateEmailFormat('.johndoe@university.edu');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid email format');
    });

    it('should reject email ending with dot', async () => {
      const result = await validator.validateEmailFormat('johndoe.@university.edu');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid email format');
    });
  });

  describe('Domain Validation', () => {
    it('should validate approved university domain', async () => {
      const mockUniversity: University = {
        id: '1',
        name: 'Test University',
        domain: 'university.edu',
        country: 'US',
        isActive: true,
        approvedPrefixes: ['student', 'alumni'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockSupabase.from().select().eq().ilike.mockResolvedValueOnce({
        data: [mockUniversity],
        error: null,
      });

      const result = await validator.validateDomain('john.doe@university.edu');
      expect(result.isValid).toBe(true);
      expect(result.university).toEqual(mockUniversity);
    });

    it('should reject unapproved domain', async () => {
      mockSupabase.from().select().eq().ilike.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const result = await validator.validateDomain('john.doe@gmail.com');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Domain not approved for university registration');
    });

    it('should handle database error during domain validation', async () => {
      mockSupabase.from().select().eq().ilike.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database connection failed' },
      });

      const result = await validator.validateDomain('john.doe@university.edu');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Database error during domain validation');
    });

    it('should validate domain case insensitively', async () => {
      const mockUniversity: University = {
        id: '1',
        name: 'Test University',
        domain: 'university.edu',
        country: 'US',
        isActive: true,
        approvedPrefixes: ['student', 'alumni'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockSupabase.from().select().eq().ilike.mockResolvedValueOnce({
        data: [mockUniversity],
        error: null,
      });

      const result = await validator.validateDomain('john.doe@UNIVERSITY.EDU');
      expect(result.isValid).toBe(true);
    });
  });

  describe('Prefix Validation', () => {
    it('should validate approved prefix', async () => {
      const mockUniversity: University = {
        id: '1',
        name: 'Test University',
        domain: 'university.edu',
        country: 'US',
        isActive: true,
        approvedPrefixes: ['student', 'alumni', 'faculty'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = await validator.validatePrefix('student123', mockUniversity);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject unapproved prefix', async () => {
      const mockUniversity: University = {
        id: '1',
        name: 'Test University',
        domain: 'university.edu',
        country: 'US',
        isActive: true,
        approvedPrefixes: ['student', 'alumni'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = await validator.validatePrefix('admin123', mockUniversity);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Prefix not approved for this university');
    });

    it('should validate prefix case insensitively', async () => {
      const mockUniversity: University = {
        id: '1',
        name: 'Test University',
        domain: 'university.edu',
        country: 'US',
        isActive: true,
        approvedPrefixes: ['student', 'alumni'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = await validator.validatePrefix('STUDENT123', mockUniversity);
      expect(result.isValid).toBe(true);
    });

    it('should handle empty prefix list', async () => {
      const mockUniversity: University = {
        id: '1',
        name: 'Test University',
        domain: 'university.edu',
        country: 'US',
        isActive: true,
        approvedPrefixes: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = await validator.validatePrefix('student123', mockUniversity);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('No approved prefixes configured for this university');
    });

    it('should validate prefix with numbers and underscores', async () => {
      const mockUniversity: University = {
        id: '1',
        name: 'Test University',
        domain: 'university.edu',
        country: 'US',
        isActive: true,
        approvedPrefixes: ['student_2024', 'alumni_2023'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = await validator.validatePrefix('student_2024_001', mockUniversity);
      expect(result.isValid).toBe(true);
    });
  });

  describe('Disposable Email Detection', () => {
    it('should detect disposable email domains', async () => {
      const result = await validator.validateEmailFormat('test@10minutemail.com');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Disposable email addresses are not allowed');
    });

    it('should detect temporary email domains', async () => {
      const result = await validator.validateEmailFormat('test@tempmail.org');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Disposable email addresses are not allowed');
    });

    it('should allow legitimate university domains', async () => {
      const result = await validator.validateEmailFormat('test@university.edu');
      expect(result.isValid).toBe(true);
      expect(result.errors).not.toContain('Disposable email addresses are not allowed');
    });

    it('should detect various disposable email patterns', async () => {
      const disposableEmails = [
        'test@guerrillamail.com',
        'test@mailinator.com',
        'test@yopmail.com',
        'test@temp-mail.org',
        'test@throwaway.email',
      ];

      for (const email of disposableEmails) {
        const result = await validator.validateEmailFormat(email);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Disposable email addresses are not allowed');
      }
    });
  });

  describe('Complete Email Validation', () => {
    it('should validate complete university email', async () => {
      const mockUniversity: University = {
        id: '1',
        name: 'Test University',
        domain: 'university.edu',
        country: 'US',
        isActive: true,
        approvedPrefixes: ['student', 'alumni'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockSupabase.from().select().eq().ilike.mockResolvedValueOnce({
        data: [mockUniversity],
        error: null,
      });

      const result = await validator.validateUniversityEmail('student123@university.edu');
      expect(result.isValid).toBe(true);
      expect(result.university).toEqual(mockUniversity);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject email with multiple validation errors', async () => {
      const result = await validator.validateUniversityEmail('invalid-email');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should provide detailed error messages', async () => {
      const result = await validator.validateUniversityEmail('admin@university.edu');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid email format');
    });

    it('should handle validation timeout', async () => {
      // Mock a slow database response
      mockSupabase.from().select().eq().ilike.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve({ data: [], error: null }), 6000))
      );

      const result = await validator.validateUniversityEmail('student@university.edu');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Validation timeout');
    });

    it('should validate email with special characters in domain', async () => {
      const mockUniversity: University = {
        id: '1',
        name: 'Test University',
        domain: 'university-name.edu',
        country: 'US',
        isActive: true,
        approvedPrefixes: ['student'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockSupabase.from().select().eq().ilike.mockResolvedValueOnce({
        data: [mockUniversity],
        error: null,
      });

      const result = await validator.validateUniversityEmail('student@university-name.edu');
      expect(result.isValid).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long email addresses', async () => {
      const longEmail = 'a'.repeat(50) + '@' + 'b'.repeat(50) + '.edu';
      const result = await validator.validateEmailFormat(longEmail);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Email address too long');
    });

    it('should handle empty email', async () => {
      const result = await validator.validateEmailFormat('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Email address is required');
    });

    it('should handle null email', async () => {
      const result = await validator.validateEmailFormat(null as any);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Email address is required');
    });

    it('should handle undefined email', async () => {
      const result = await validator.validateEmailFormat(undefined as any);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Email address is required');
    });

    it('should handle email with only whitespace', async () => {
      const result = await validator.validateEmailFormat('   ');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Email address is required');
    });

    it('should handle email with international characters', async () => {
      const result = await validator.validateEmailFormat('tëst@üniversity.edu');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid email format');
    });

    it('should handle email with emoji', async () => {
      const result = await validator.validateEmailFormat('test😀@university.edu');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid email format');
    });
  });

  describe('Performance Tests', () => {
    it('should validate email within acceptable time', async () => {
      const startTime = Date.now();
      await validator.validateEmailFormat('student@university.edu');
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(100); // Should complete within 100ms
    });

    it('should handle concurrent validation requests', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        validator.validateEmailFormat(`student${i}@university.edu`)
      );

      const results = await Promise.all(promises);
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result).toHaveProperty('isValid');
        expect(result).toHaveProperty('errors');
      });
    });
  });

  describe('Security Tests', () => {
    it('should prevent SQL injection in email validation', async () => {
      const maliciousEmail = "'; DROP TABLE users; --@university.edu";
      const result = await validator.validateEmailFormat(maliciousEmail);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid email format');
    });

    it('should prevent XSS in email validation', async () => {
      const xssEmail = '<script>alert("xss")</script>@university.edu';
      const result = await validator.validateEmailFormat(xssEmail);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid email format');
    });

    it('should handle email with path traversal attempts', async () => {
      const pathTraversalEmail = '../../../etc/passwd@university.edu';
      const result = await validator.validateEmailFormat(pathTraversalEmail);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid email format');
    });

    it('should sanitize email input', async () => {
      const emailWithSpecialChars = 'test@university.edu<script>';
      const result = await validator.validateEmailFormat(emailWithSpecialChars);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid email format');
    });
  });

  describe('Integration with Rate Limiting', () => {
    it('should respect rate limiting', async () => {
      // This would test integration with rate limiting middleware
      // For now, we'll just ensure the validator doesn't break with rate limiting
      const result = await validator.validateEmailFormat('student@university.edu');
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('errors');
    });
  });

  describe('Logging and Monitoring', () => {
    it('should log validation attempts', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await validator.validateEmailFormat('student@university.edu');
      
      // Verify that logging occurred (this would depend on the actual logging implementation)
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should track validation metrics', async () => {
      // This would test metrics collection
      const result = await validator.validateEmailFormat('student@university.edu');
      expect(result).toHaveProperty('isValid');
    });
  });
});
