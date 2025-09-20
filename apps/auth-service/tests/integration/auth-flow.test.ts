import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { SupabaseClient } from '@supabase/supabase-js';
import { AuthServiceApp } from '../../src/app';
import { getSecurityIntegration } from '../../src/middleware/security-integration';

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

describe('Authentication Flow Integration Tests', () => {
  let app: express.Application;
  let authService: AuthServiceApp;

  beforeEach(async () => {
    authService = new AuthServiceApp(mockSupabase);
    app = authService.getApp();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('User Registration Flow', () => {
    it('should complete full registration flow', async () => {
      // Mock university validation
      mockSupabase.from().select().eq().ilike.mockResolvedValueOnce({
        data: [{
          id: '1',
          name: 'Test University',
          domain: 'university.edu',
          country: 'US',
          isActive: true,
          approvedPrefixes: ['student', 'alumni'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }],
        error: null,
      });

      // Mock user creation
      mockSupabase.from().insert.mockResolvedValueOnce({
        data: [{ id: 'user123', email: 'student@university.edu' }],
        error: null,
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'student@university.edu',
          password: 'SecurePassword123!',
          confirmPassword: 'SecurePassword123!',
          firstName: 'John',
          lastName: 'Doe',
          universityId: '1',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('userId');
      expect(response.body.data).toHaveProperty('email');
    });

    it('should reject registration with invalid university email', async () => {
      mockSupabase.from().select().eq().ilike.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'user@gmail.com',
          password: 'SecurePassword123!',
          confirmPassword: 'SecurePassword123!',
          firstName: 'John',
          lastName: 'Doe',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('university email');
    });

    it('should reject registration with weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'student@university.edu',
          password: '123',
          confirmPassword: '123',
          firstName: 'John',
          lastName: 'Doe',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('password');
    });

    it('should reject registration with mismatched passwords', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'student@university.edu',
          password: 'SecurePassword123!',
          confirmPassword: 'DifferentPassword123!',
          firstName: 'John',
          lastName: 'Doe',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('password');
    });

    it('should handle registration with existing email', async () => {
      mockSupabase.from().select().eq().ilike.mockResolvedValueOnce({
        data: [{
          id: '1',
          name: 'Test University',
          domain: 'university.edu',
          country: 'US',
          isActive: true,
          approvedPrefixes: ['student'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }],
        error: null,
      });

      mockSupabase.from().insert.mockResolvedValueOnce({
        data: null,
        error: { message: 'User already exists' },
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'student@university.edu',
          password: 'SecurePassword123!',
          confirmPassword: 'SecurePassword123!',
          firstName: 'John',
          lastName: 'Doe',
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already exists');
    });
  });

  describe('User Login Flow', () => {
    it('should complete successful login flow', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: {
          user: { id: 'user123', email: 'student@university.edu' },
          session: { access_token: 'jwt-token', refresh_token: 'refresh-token' },
        },
        error: null,
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'student@university.edu',
          password: 'SecurePassword123!',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data).toHaveProperty('user');
    });

    it('should reject login with invalid credentials', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: null,
        error: { message: 'Invalid credentials' },
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'student@university.edu',
          password: 'WrongPassword123!',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid credentials');
    });

    it('should reject login with non-university email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@gmail.com',
          password: 'SecurePassword123!',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('university email');
    });

    it('should handle login with locked account', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: null,
        error: { message: 'Account is locked' },
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'student@university.edu',
          password: 'SecurePassword123!',
        });

      expect(response.status).toBe(423);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('locked');
    });
  });

  describe('Token Refresh Flow', () => {
    it('should refresh access token successfully', async () => {
      mockSupabase.auth.refreshSession.mockResolvedValueOnce({
        data: {
          session: { access_token: 'new-jwt-token', refresh_token: 'new-refresh-token' },
        },
        error: null,
      });

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: 'refresh-token',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
    });

    it('should reject refresh with invalid token', async () => {
      mockSupabase.auth.refreshSession.mockResolvedValueOnce({
        data: null,
        error: { message: 'Invalid refresh token' },
      });

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: 'invalid-refresh-token',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid refresh token');
    });

    it('should reject refresh with expired token', async () => {
      mockSupabase.auth.refreshSession.mockResolvedValueOnce({
        data: null,
        error: { message: 'Refresh token expired' },
      });

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: 'expired-refresh-token',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('expired');
    });
  });

  describe('Logout Flow', () => {
    it('should complete logout successfully', async () => {
      mockSupabase.auth.signOut.mockResolvedValueOnce({
        error: null,
      });

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer jwt-token')
        .send();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should handle logout without token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .send();

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('token');
    });

    it('should handle logout with invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer invalid-token')
        .send();

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid token');
    });
  });

  describe('Password Reset Flow', () => {
    it('should initiate password reset successfully', async () => {
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValueOnce({
        data: {},
        error: null,
      });

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'student@university.edu',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('reset link');
    });

    it('should reject password reset for non-university email', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'user@gmail.com',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('university email');
    });

    it('should handle password reset for non-existent user', async () => {
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValueOnce({
        data: null,
        error: { message: 'User not found' },
      });

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'nonexistent@university.edu',
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });

    it('should complete password reset successfully', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'reset-token',
          newPassword: 'NewSecurePassword123!',
          confirmPassword: 'NewSecurePassword123!',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject password reset with mismatched passwords', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'reset-token',
          newPassword: 'NewSecurePassword123!',
          confirmPassword: 'DifferentPassword123!',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('password');
    });

    it('should reject password reset with invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'invalid-token',
          newPassword: 'NewSecurePassword123!',
          confirmPassword: 'NewSecurePassword123!',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid token');
    });
  });

  describe('Email Verification Flow', () => {
    it('should verify email successfully', async () => {
      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({
          token: 'verification-token',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject email verification with invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({
          token: 'invalid-token',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid token');
    });

    it('should resend verification email successfully', async () => {
      const response = await request(app)
        .post('/api/auth/resend-verification')
        .send({
          email: 'student@university.edu',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject resend verification for non-university email', async () => {
      const response = await request(app)
        .post('/api/auth/resend-verification')
        .send({
          email: 'user@gmail.com',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('university email');
    });
  });

  describe('User Profile Management', () => {
    it('should get user profile successfully', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: {
          id: 'user123',
          email: 'student@university.edu',
          firstName: 'John',
          lastName: 'Doe',
          universityId: '1',
        },
        error: null,
      });

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer jwt-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('email');
      expect(response.body.data).toHaveProperty('firstName');
      expect(response.body.data).toHaveProperty('lastName');
    });

    it('should update user profile successfully', async () => {
      mockSupabase.from().update().eq.mockResolvedValueOnce({
        data: [{ id: 'user123', firstName: 'Jane', lastName: 'Smith' }],
        error: null,
      });

      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', 'Bearer jwt-token')
        .send({
          firstName: 'Jane',
          lastName: 'Smith',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject profile update without authentication', async () => {
      const response = await request(app)
        .put('/api/auth/profile')
        .send({
          firstName: 'Jane',
          lastName: 'Smith',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('token');
    });
  });

  describe('Security Integration', () => {
    it('should log security events during authentication', async () => {
      const securityIntegration = getSecurityIntegration(mockSupabase);
      const logSpy = jest.spyOn(securityIntegration, 'logAuthenticationEvent');

      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'student@university.edu',
          password: 'SecurePassword123!',
        });

      expect(logSpy).toHaveBeenCalled();
    });

    it('should detect and block brute force attacks', async () => {
      // Simulate multiple failed login attempts
      for (let i = 0; i < 6; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            email: 'student@university.edu',
            password: 'WrongPassword123!',
          });
      }

      // The 7th attempt should be blocked
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'student@university.edu',
          password: 'WrongPassword123!',
        });

      expect(response.status).toBe(429);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('rate limit');
    });

    it('should validate JWT tokens properly', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-jwt-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid token');
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      mockSupabase.from().select().eq().ilike.mockRejectedValueOnce(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'student@university.edu',
          password: 'SecurePassword123!',
          confirmPassword: 'SecurePassword123!',
          firstName: 'John',
          lastName: 'Doe',
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Internal server error');
    });

    it('should handle malformed JSON requests', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .set('Content-Type', 'application/json')
        .send('invalid json');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle missing required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'student@university.edu',
          // Missing password, firstName, lastName
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required');
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent authentication requests', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        request(app)
          .post('/api/auth/login')
          .send({
            email: `student${i}@university.edu`,
            password: 'SecurePassword123!',
          })
      );

      const responses = await Promise.all(promises);
      expect(responses).toHaveLength(10);
      responses.forEach(response => {
        expect(response.status).toBeDefined();
        expect(response.body).toHaveProperty('success');
      });
    });

    it('should complete authentication within acceptable time', async () => {
      const startTime = Date.now();
      
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'student@university.edu',
          password: 'SecurePassword123!',
        });

      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on authentication endpoints', async () => {
      // Make multiple requests quickly
      const promises = Array.from({ length: 20 }, () =>
        request(app)
          .post('/api/auth/login')
          .send({
            email: 'student@university.edu',
            password: 'SecurePassword123!',
          })
      );

      const responses = await Promise.all(promises);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });
});
