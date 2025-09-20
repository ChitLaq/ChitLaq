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

describe('Authentication End-to-End Tests', () => {
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

  describe('Complete User Journey', () => {
    it('should complete full user registration and login journey', async () => {
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

      // Step 1: Register user
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'student@university.edu',
          password: 'SecurePassword123!',
          confirmPassword: 'SecurePassword123!',
          firstName: 'John',
          lastName: 'Doe',
          universityId: '1',
        });

      expect(registerResponse.status).toBe(201);
      expect(registerResponse.body.success).toBe(true);
      expect(registerResponse.body.data).toHaveProperty('userId');

      // Step 2: Login user
      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: {
          user: { id: 'user123', email: 'student@university.edu' },
          session: { access_token: 'jwt-token', refresh_token: 'refresh-token' },
        },
        error: null,
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'student@university.edu',
          password: 'SecurePassword123!',
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.data).toHaveProperty('accessToken');
      expect(loginResponse.body.data).toHaveProperty('refreshToken');

      const accessToken = loginResponse.body.data.accessToken;
      const refreshToken = loginResponse.body.data.refreshToken;

      // Step 3: Access protected resource
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

      const profileResponse = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(profileResponse.status).toBe(200);
      expect(profileResponse.body.success).toBe(true);
      expect(profileResponse.body.data).toHaveProperty('email');
      expect(profileResponse.body.data).toHaveProperty('firstName');
      expect(profileResponse.body.data).toHaveProperty('lastName');

      // Step 4: Refresh token
      mockSupabase.auth.refreshSession.mockResolvedValueOnce({
        data: {
          session: { access_token: 'new-jwt-token', refresh_token: 'new-refresh-token' },
        },
        error: null,
      });

      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: refreshToken,
        });

      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.body.success).toBe(true);
      expect(refreshResponse.body.data).toHaveProperty('accessToken');
      expect(refreshResponse.body.data).toHaveProperty('refreshToken');

      // Step 5: Logout
      mockSupabase.auth.signOut.mockResolvedValueOnce({
        error: null,
      });

      const logoutResponse = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(logoutResponse.status).toBe(200);
      expect(logoutResponse.body.success).toBe(true);
    });

    it('should handle password reset journey', async () => {
      // Step 1: Request password reset
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValueOnce({
        data: {},
        error: null,
      });

      const forgotPasswordResponse = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'student@university.edu',
        });

      expect(forgotPasswordResponse.status).toBe(200);
      expect(forgotPasswordResponse.body.success).toBe(true);
      expect(forgotPasswordResponse.body.message).toContain('reset link');

      // Step 2: Reset password
      const resetPasswordResponse = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'reset-token',
          newPassword: 'NewSecurePassword123!',
          confirmPassword: 'NewSecurePassword123!',
        });

      expect(resetPasswordResponse.status).toBe(200);
      expect(resetPasswordResponse.body.success).toBe(true);

      // Step 3: Login with new password
      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: {
          user: { id: 'user123', email: 'student@university.edu' },
          session: { access_token: 'jwt-token', refresh_token: 'refresh-token' },
        },
        error: null,
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'student@university.edu',
          password: 'NewSecurePassword123!',
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.success).toBe(true);
    });

    it('should handle email verification journey', async () => {
      // Step 1: Register user (unverified)
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
        data: [{ id: 'user123', email: 'student@university.edu' }],
        error: null,
      });

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'student@university.edu',
          password: 'SecurePassword123!',
          confirmPassword: 'SecurePassword123!',
          firstName: 'John',
          lastName: 'Doe',
          universityId: '1',
        });

      expect(registerResponse.status).toBe(201);

      // Step 2: Resend verification email
      const resendResponse = await request(app)
        .post('/api/auth/resend-verification')
        .send({
          email: 'student@university.edu',
        });

      expect(resendResponse.status).toBe(200);
      expect(resendResponse.body.success).toBe(true);

      // Step 3: Verify email
      const verifyResponse = await request(app)
        .post('/api/auth/verify-email')
        .send({
          token: 'verification-token',
        });

      expect(verifyResponse.status).toBe(200);
      expect(verifyResponse.body.success).toBe(true);

      // Step 4: Login (now verified)
      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: {
          user: { id: 'user123', email: 'student@university.edu' },
          session: { access_token: 'jwt-token', refresh_token: 'refresh-token' },
        },
        error: null,
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'student@university.edu',
          password: 'SecurePassword123!',
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.success).toBe(true);
    });
  });

  describe('Security Scenarios', () => {
    it('should handle brute force attack scenario', async () => {
      // Simulate multiple failed login attempts
      for (let i = 0; i < 5; i++) {
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
      }

      // The 6th attempt should be rate limited
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

    it('should handle session hijacking scenario', async () => {
      // Step 1: User logs in
      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: {
          user: { id: 'user123', email: 'student@university.edu' },
          session: { access_token: 'jwt-token', refresh_token: 'refresh-token' },
        },
        error: null,
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'student@university.edu',
          password: 'SecurePassword123!',
        });

      expect(loginResponse.status).toBe(200);
      const accessToken = loginResponse.body.data.accessToken;

      // Step 2: Attacker tries to use stolen token
      const profileResponse = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(profileResponse.status).toBe(200);

      // Step 3: User logs out (invalidates token)
      mockSupabase.auth.signOut.mockResolvedValueOnce({
        error: null,
      });

      const logoutResponse = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(logoutResponse.status).toBe(200);

      // Step 4: Attacker tries to use invalidated token
      const invalidProfileResponse = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(invalidProfileResponse.status).toBe(401);
      expect(invalidProfileResponse.body.success).toBe(false);
    });

    it('should handle token expiration scenario', async () => {
      // Step 1: User logs in
      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: {
          user: { id: 'user123', email: 'student@university.edu' },
          session: { access_token: 'jwt-token', refresh_token: 'refresh-token' },
        },
        error: null,
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'student@university.edu',
          password: 'SecurePassword123!',
        });

      expect(loginResponse.status).toBe(200);
      const accessToken = loginResponse.body.data.accessToken;
      const refreshToken = loginResponse.body.data.refreshToken;

      // Step 2: Access protected resource
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: {
          id: 'user123',
          email: 'student@university.edu',
          firstName: 'John',
          lastName: 'Doe',
        },
        error: null,
      });

      const profileResponse = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(profileResponse.status).toBe(200);

      // Step 3: Token expires, refresh it
      mockSupabase.auth.refreshSession.mockResolvedValueOnce({
        data: {
          session: { access_token: 'new-jwt-token', refresh_token: 'new-refresh-token' },
        },
        error: null,
      });

      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: refreshToken,
        });

      expect(refreshResponse.status).toBe(200);
      const newAccessToken = refreshResponse.body.data.accessToken;

      // Step 4: Use new token
      const newProfileResponse = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${newAccessToken}`);

      expect(newProfileResponse.status).toBe(200);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle database connection failure', async () => {
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

    it('should handle malformed requests', async () => {
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

    it('should handle invalid email formats', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'SecurePassword123!',
          confirmPassword: 'SecurePassword123!',
          firstName: 'John',
          lastName: 'Doe',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('email');
    });

    it('should handle weak passwords', async () => {
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
  });

  describe('Concurrent User Scenarios', () => {
    it('should handle multiple users registering simultaneously', async () => {
      mockSupabase.from().select().eq().ilike.mockResolvedValue({
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

      mockSupabase.from().insert.mockResolvedValue({
        data: [{ id: 'user123', email: 'student@university.edu' }],
        error: null,
      });

      const promises = Array.from({ length: 10 }, (_, i) =>
        request(app)
          .post('/api/auth/register')
          .send({
            email: `student${i}@university.edu`,
            password: 'SecurePassword123!',
            confirmPassword: 'SecurePassword123!',
            firstName: `User${i}`,
            lastName: 'Doe',
            universityId: '1',
          })
      );

      const responses = await Promise.all(promises);
      expect(responses).toHaveLength(10);
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });
    });

    it('should handle multiple users logging in simultaneously', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: { id: 'user123', email: 'student@university.edu' },
          session: { access_token: 'jwt-token', refresh_token: 'refresh-token' },
        },
        error: null,
      });

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
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('Performance Scenarios', () => {
    it('should complete authentication flow within acceptable time', async () => {
      const startTime = Date.now();

      // Register user
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
        data: [{ id: 'user123', email: 'student@university.edu' }],
        error: null,
      });

      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'student@university.edu',
          password: 'SecurePassword123!',
          confirmPassword: 'SecurePassword123!',
          firstName: 'John',
          lastName: 'Doe',
          universityId: '1',
        });

      // Login user
      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: {
          user: { id: 'user123', email: 'student@university.edu' },
          session: { access_token: 'jwt-token', refresh_token: 'refresh-token' },
        },
        error: null,
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'student@university.edu',
          password: 'SecurePassword123!',
        });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
      expect(loginResponse.status).toBe(200);
    });
  });
});
