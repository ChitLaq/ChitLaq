import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { performance } from 'perf_hooks';
import { SupabaseClient } from '@supabase/supabase-js';
import { AuthServiceApp } from '../../src/app';
import { UniversityEmailValidator } from '../../src/validators/university-email';
import { JWTManager } from '../../src/auth/jwt-manager';
import { SessionManager } from '../../src/auth/session-manager';

// Mock Supabase client
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        ilike: jest.fn(() => Promise.resolve({ data: [], error: null })),
        single: jest.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
    insert: jest.fn(() => Promise.resolve({ data: [], error: null })),
    update: jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve({ data: [], error: null })),
    })),
    delete: jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve({ data: [], error: null })),
    })),
  })),
  auth: {
    signUp: jest.fn(() => Promise.resolve({ data: { user: { id: 'user123' } }, error: null })),
    signInWithPassword: jest.fn(() => Promise.resolve({ data: { user: { id: 'user123' } }, error: null })),
    signOut: jest.fn(() => Promise.resolve({ error: null })),
    getUser: jest.fn(() => Promise.resolve({ data: { user: { id: 'user123' } }, error: null })),
    refreshSession: jest.fn(() => Promise.resolve({ data: { session: { access_token: 'new-token' } }, error: null })),
    resetPasswordForEmail: jest.fn(() => Promise.resolve({ data: {}, error: null })),
  },
} as unknown as SupabaseClient;

describe('Authentication Performance Tests', () => {
  let authService: AuthServiceApp;
  let universityValidator: UniversityEmailValidator;
  let jwtManager: JWTManager;
  let sessionManager: SessionManager;

  beforeEach(() => {
    authService = new AuthServiceApp(mockSupabase);
    universityValidator = new UniversityEmailValidator(mockSupabase);
    jwtManager = new JWTManager();
    sessionManager = new SessionManager(mockSupabase);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('University Email Validation Performance', () => {
    it('should validate university emails within acceptable time', async () => {
      const startTime = performance.now();
      
      await universityValidator.validateEmail('student@university.edu');
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(100); // Should complete within 100ms
    });

    it('should handle concurrent email validations efficiently', async () => {
      const emails = Array.from({ length: 100 }, (_, i) => `student${i}@university.edu`);
      
      const startTime = performance.now();
      
      const promises = emails.map(email => universityValidator.validateEmail(email));
      await Promise.all(promises);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should cache validation results for performance', async () => {
      const email = 'student@university.edu';
      
      // First validation
      const startTime1 = performance.now();
      await universityValidator.validateEmail(email);
      const endTime1 = performance.now();
      const duration1 = endTime1 - startTime1;
      
      // Second validation (should be faster due to caching)
      const startTime2 = performance.now();
      await universityValidator.validateEmail(email);
      const endTime2 = performance.now();
      const duration2 = endTime2 - startTime2;
      
      expect(duration2).toBeLessThan(duration1);
    });
  });

  describe('JWT Token Performance', () => {
    it('should create JWT tokens within acceptable time', async () => {
      const startTime = performance.now();
      
      const token = await jwtManager.createToken({
        userId: 'user123',
        email: 'student@university.edu',
        universityId: '1',
      });
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(50); // Should complete within 50ms
      expect(token).toBeDefined();
    });

    it('should verify JWT tokens within acceptable time', async () => {
      const token = await jwtManager.createToken({
        userId: 'user123',
        email: 'student@university.edu',
        universityId: '1',
      });
      
      const startTime = performance.now();
      
      const decoded = await jwtManager.verifyToken(token);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(50); // Should complete within 50ms
      expect(decoded).toBeDefined();
    });

    it('should handle concurrent JWT operations efficiently', async () => {
      const startTime = performance.now();
      
      const promises = Array.from({ length: 100 }, (_, i) =>
        jwtManager.createToken({
          userId: `user${i}`,
          email: `student${i}@university.edu`,
          universityId: '1',
        })
      );
      
      const tokens = await Promise.all(promises);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      expect(tokens).toHaveLength(100);
    });
  });

  describe('Session Management Performance', () => {
    it('should create sessions within acceptable time', async () => {
      const startTime = performance.now();
      
      const session = await sessionManager.createSession({
        userId: 'user123',
        email: 'student@university.edu',
        universityId: '1',
      });
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(100); // Should complete within 100ms
      expect(session).toBeDefined();
    });

    it('should refresh sessions within acceptable time', async () => {
      const session = await sessionManager.createSession({
        userId: 'user123',
        email: 'student@university.edu',
        universityId: '1',
      });
      
      const startTime = performance.now();
      
      const refreshedSession = await sessionManager.refreshSession(session.refreshToken);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(100); // Should complete within 100ms
      expect(refreshedSession).toBeDefined();
    });

    it('should handle concurrent session operations efficiently', async () => {
      const startTime = performance.now();
      
      const promises = Array.from({ length: 50 }, (_, i) =>
        sessionManager.createSession({
          userId: `user${i}`,
          email: `student${i}@university.edu`,
          universityId: '1',
        })
      );
      
      const sessions = await Promise.all(promises);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      expect(sessions).toHaveLength(50);
    });
  });

  describe('Authentication Flow Performance', () => {
    it('should complete registration flow within acceptable time', async () => {
      const startTime = performance.now();
      
      const response = await authService.register({
        email: 'student@university.edu',
        password: 'SecurePassword123!',
        confirmPassword: 'SecurePassword123!',
        firstName: 'John',
        lastName: 'Doe',
        universityId: '1',
      });
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(500); // Should complete within 500ms
      expect(response).toBeDefined();
    });

    it('should complete login flow within acceptable time', async () => {
      const startTime = performance.now();
      
      const response = await authService.login({
        email: 'student@university.edu',
        password: 'SecurePassword123!',
      });
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(300); // Should complete within 300ms
      expect(response).toBeDefined();
    });

    it('should complete logout flow within acceptable time', async () => {
      const session = await sessionManager.createSession({
        userId: 'user123',
        email: 'student@university.edu',
        universityId: '1',
      });
      
      const startTime = performance.now();
      
      await authService.logout(session.accessToken);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(200); // Should complete within 200ms
    });

    it('should handle concurrent authentication flows efficiently', async () => {
      const startTime = performance.now();
      
      const promises = Array.from({ length: 20 }, (_, i) =>
        authService.login({
          email: `student${i}@university.edu`,
          password: 'SecurePassword123!',
        })
      );
      
      const responses = await Promise.all(promises);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
      expect(responses).toHaveLength(20);
    });
  });

  describe('Password Security Performance', () => {
    it('should hash passwords within acceptable time', async () => {
      const startTime = performance.now();
      
      const hashedPassword = await authService.hashPassword('SecurePassword123!');
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(100); // Should complete within 100ms
      expect(hashedPassword).toBeDefined();
    });

    it('should verify passwords within acceptable time', async () => {
      const hashedPassword = await authService.hashPassword('SecurePassword123!');
      
      const startTime = performance.now();
      
      const isValid = await authService.verifyPassword('SecurePassword123!', hashedPassword);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(100); // Should complete within 100ms
      expect(isValid).toBe(true);
    });

    it('should handle concurrent password operations efficiently', async () => {
      const passwords = Array.from({ length: 50 }, (_, i) => `SecurePassword${i}!`);
      
      const startTime = performance.now();
      
      const promises = passwords.map(password => authService.hashPassword(password));
      const hashedPasswords = await Promise.all(promises);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      expect(hashedPasswords).toHaveLength(50);
    });
  });

  describe('Rate Limiting Performance', () => {
    it('should apply rate limiting within acceptable time', async () => {
      const startTime = performance.now();
      
      const isAllowed = await authService.checkRateLimit('192.168.1.1', '/api/auth/login');
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(50); // Should complete within 50ms
      expect(isAllowed).toBeDefined();
    });

    it('should handle concurrent rate limit checks efficiently', async () => {
      const startTime = performance.now();
      
      const promises = Array.from({ length: 100 }, (_, i) =>
        authService.checkRateLimit(`192.168.1.${i}`, '/api/auth/login')
      );
      
      const results = await Promise.all(promises);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(500); // Should complete within 500ms
      expect(results).toHaveLength(100);
    });
  });

  describe('Memory Usage Tests', () => {
    it('should not leak memory during authentication operations', async () => {
      const initialMemory = process.memoryUsage();
      
      // Perform multiple authentication operations
      for (let i = 0; i < 100; i++) {
        await authService.login({
          email: `student${i}@university.edu`,
          password: 'SecurePassword123!',
        });
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    it('should handle large payloads efficiently', async () => {
      const largeMetadata = {
        data: Array.from({ length: 1000 }, (_, i) => `item${i}`),
        timestamp: new Date().toISOString(),
      };
      
      const startTime = performance.now();
      
      await authService.logAuthenticationEvent({
        userId: 'user123',
        event: 'LOGIN_SUCCESS',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        metadata: largeMetadata,
      });
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(200); // Should complete within 200ms
    });
  });

  describe('Database Performance', () => {
    it('should handle database queries efficiently', async () => {
      const startTime = performance.now();
      
      const user = await authService.getUserProfile('user123');
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(100); // Should complete within 100ms
    });

    it('should handle concurrent database operations efficiently', async () => {
      const startTime = performance.now();
      
      const promises = Array.from({ length: 50 }, (_, i) =>
        authService.getUserProfile(`user${i}`)
      );
      
      const users = await Promise.all(promises);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      expect(users).toHaveLength(50);
    });
  });

  describe('Error Handling Performance', () => {
    it('should handle errors efficiently', async () => {
      const startTime = performance.now();
      
      try {
        await authService.login({
          email: 'invalid@email.com',
          password: 'wrongpassword',
        });
      } catch (error) {
        // Expected error
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(200); // Should complete within 200ms
    });

    it('should handle concurrent errors efficiently', async () => {
      const startTime = performance.now();
      
      const promises = Array.from({ length: 20 }, (_, i) =>
        authService.login({
          email: `invalid${i}@email.com`,
          password: 'wrongpassword',
        }).catch(() => {
          // Expected error
        })
      );
      
      await Promise.all(promises);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('Load Testing', () => {
    it('should handle high load authentication requests', async () => {
      const startTime = performance.now();
      
      const promises = Array.from({ length: 200 }, (_, i) =>
        authService.login({
          email: `student${i}@university.edu`,
          password: 'SecurePassword123!',
        })
      );
      
      const responses = await Promise.all(promises);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      expect(responses).toHaveLength(200);
    });

    it('should maintain performance under sustained load', async () => {
      const durations: number[] = [];
      
      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();
        
        await authService.login({
          email: `student${i}@university.edu`,
          password: 'SecurePassword123!',
        });
        
        const endTime = performance.now();
        durations.push(endTime - startTime);
      }
      
      const averageDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      const maxDuration = Math.max(...durations);
      
      expect(averageDuration).toBeLessThan(300); // Average should be under 300ms
      expect(maxDuration).toBeLessThan(500); // Max should be under 500ms
    });
  });
});
