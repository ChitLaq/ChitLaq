import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { SupabaseClient } from '@supabase/supabase-js';
import { Redis } from 'ioredis';
import { createAuthRoutes } from '../src/routes/auth-routes';
import { getJWTManager } from '../src/auth/jwt-manager';
import { getSessionManager } from '../src/auth/session-manager';
import { getAuthMiddleware } from '../src/middleware/auth-middleware';

// Mock dependencies
jest.mock('@supabase/supabase-js');
jest.mock('ioredis');
jest.mock('../../../utils/logger');

describe('Authentication Flow', () => {
  let app: express.Application;
  let mockSupabase: jest.Mocked<SupabaseClient>;
  let mockRedis: jest.Mocked<Redis>;
  let jwtManager: any;
  let sessionManager: any;
  let authMiddleware: any;

  beforeEach(() => {
    // Create Express app
    app = express();
    app.use(express.json());

    // Mock Supabase client
    mockSupabase = {
      auth: {
        signUp: jest.fn(),
        signInWithPassword: jest.fn(),
        signOut: jest.fn(),
      },
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      single: jest.fn(),
    } as any;

    // Mock Redis client
    mockRedis = {
      get: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      incr: jest.fn(),
      expire: jest.fn(),
      sadd: jest.fn(),
      srem: jest.fn(),
      smembers: jest.fn(),
      keys: jest.fn(),
      pipeline: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    } as any;

    // Initialize managers
    jwtManager = getJWTManager(mockRedis);
    sessionManager = getSessionManager(mockRedis, jwtManager);
    authMiddleware = getAuthMiddleware(mockRedis);

    // Setup routes
    const authRoutes = createAuthRoutes(mockSupabase, mockRedis);
    app.use('/auth', authRoutes);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('User Registration', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'john.doe@mit.edu',
        password: 'SecurePass123!',
        confirmPassword: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
        userType: 'student',
        department: 'Computer Science',
      };

      // Mock university validation
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [{
              id: 'uni-1',
              name: 'MIT',
              domains: ['mit.edu'],
              is_approved: true,
              has_prefix_validation: false,
            }],
            error: null,
          }),
        }),
      } as any);

      // Mock user check
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'No rows found' },
      });

      // Mock Supabase auth signup
      mockSupabase.auth.signUp.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: userData.email,
          },
        },
        error: null,
      });

      // Mock profile creation
      mockSupabase.insert.mockResolvedValue({
        data: null,
        error: null,
      });

      const response = await request(app)
        .post('/auth/register')
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Registration successful. Please check your email for verification.');
      expect(response.body.userId).toBe('user-123');
      expect(response.body.requiresVerification).toBe(true);
    });

    it('should reject registration with invalid email', async () => {
      const userData = {
        email: 'invalid@fakeuniversity.edu',
        password: 'SecurePass123!',
        confirmPassword: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
        userType: 'student',
      };

      // Mock university validation failure
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      } as any);

      const response = await request(app)
        .post('/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Email domain not associated with an approved university');
    });

    it('should reject registration with weak password', async () => {
      const userData = {
        email: 'john.doe@mit.edu',
        password: '123',
        confirmPassword: '123',
        firstName: 'John',
        lastName: 'Doe',
        userType: 'student',
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Password does not meet requirements');
      expect(response.body.details).toBeDefined();
    });

    it('should reject registration with mismatched passwords', async () => {
      const userData = {
        email: 'john.doe@mit.edu',
        password: 'SecurePass123!',
        confirmPassword: 'DifferentPass123!',
        firstName: 'John',
        lastName: 'Doe',
        userType: 'student',
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Passwords do not match');
    });
  });

  describe('User Login', () => {
    it('should login user successfully', async () => {
      const loginData = {
        email: 'john.doe@mit.edu',
        password: 'SecurePass123!',
      };

      // Mock Supabase auth
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: loginData.email,
          },
        },
        error: null,
      });

      // Mock user profile
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'user-123',
          email: loginData.email,
          first_name: 'John',
          last_name: 'Doe',
          user_type: 'student',
          department: 'Computer Science',
          university_id: 'uni-1',
          university_name: 'MIT',
          university_domain: 'mit.edu',
          is_verified: true,
        },
        error: null,
      });

      // Mock Redis operations
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockResolvedValue('OK');
      mockRedis.incr.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(1);
      mockRedis.sadd.mockResolvedValue(1);

      const response = await request(app)
        .post('/auth/login')
        .send(loginData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.user).toBeDefined();
      expect(response.body.tokens).toBeDefined();
      expect(response.body.tokens.accessToken).toBeDefined();
      expect(response.body.tokens.refreshToken).toBeDefined();
    });

    it('should reject login with invalid credentials', async () => {
      const loginData = {
        email: 'john.doe@mit.edu',
        password: 'WrongPassword',
      };

      // Mock Supabase auth failure
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: null,
        error: { message: 'Invalid login credentials' },
      });

      // Mock Redis operations
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockResolvedValue('OK');

      const response = await request(app)
        .post('/auth/login')
        .send(loginData);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should reject login for unverified user', async () => {
      const loginData = {
        email: 'john.doe@mit.edu',
        password: 'SecurePass123!',
      };

      // Mock Supabase auth
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: loginData.email,
          },
        },
        error: null,
      });

      // Mock unverified user profile
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'user-123',
          email: loginData.email,
          first_name: 'John',
          last_name: 'Doe',
          user_type: 'student',
          university_id: 'uni-1',
          university_name: 'MIT',
          university_domain: 'mit.edu',
          is_verified: false,
        },
        error: null,
      });

      const response = await request(app)
        .post('/auth/login')
        .send(loginData);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Email verification required');
    });
  });

  describe('Token Refresh', () => {
    it('should refresh access token successfully', async () => {
      const refreshData = {
        refreshToken: 'valid-refresh-token',
      };

      // Mock JWT verification
      jest.spyOn(jwtManager, 'verifyRefreshToken').mockReturnValue({
        sub: 'user-123',
        email: 'john.doe@mit.edu',
        university_id: 'uni-1',
        deviceFingerprint: 'device-123',
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 604800, // 7 days
        iss: 'chitlaq-auth-service',
        aud: 'chitlaq-app',
      });

      // Mock user profile
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'user-123',
          email: 'john.doe@mit.edu',
          first_name: 'John',
          last_name: 'Doe',
          user_type: 'student',
          university_id: 'uni-1',
          university_name: 'MIT',
          university_domain: 'mit.edu',
        },
        error: null,
      });

      // Mock Redis operations
      mockRedis.get.mockResolvedValue('valid-refresh-token');
      mockRedis.setex.mockResolvedValue('OK');
      mockRedis.del.mockResolvedValue(1);

      const response = await request(app)
        .post('/auth/refresh')
        .send(refreshData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Token refreshed successfully');
      expect(response.body.tokens).toBeDefined();
    });

    it('should reject invalid refresh token', async () => {
      const refreshData = {
        refreshToken: 'invalid-refresh-token',
      };

      // Mock JWT verification failure
      jest.spyOn(jwtManager, 'verifyRefreshToken').mockReturnValue(null);

      const response = await request(app)
        .post('/auth/refresh')
        .send(refreshData);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid or expired refresh token');
    });
  });

  describe('User Logout', () => {
    it('should logout user successfully', async () => {
      const mockUser = {
        sub: 'user-123',
        email: 'john.doe@mit.edu',
        university_id: 'uni-1',
        university_name: 'MIT',
        university_domain: 'mit.edu',
        user_type: 'student',
        verified: true,
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 900, // 15 minutes
        iss: 'chitlaq-auth-service',
        aud: 'chitlaq-app',
      };

      const mockDeviceInfo = {
        userAgent: 'Mozilla/5.0',
        platform: 'Windows',
        language: 'en-US',
        timezone: 'America/New_York',
        fingerprint: 'device-123',
      };

      // Mock JWT verification
      jest.spyOn(jwtManager, 'verifyAccessToken').mockReturnValue(mockUser);

      // Mock session management
      jest.spyOn(sessionManager, 'invalidateSession').mockResolvedValue(undefined);

      // Mock Supabase signout
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });

      const response = await request(app)
        .post('/auth/logout')
        .set('Authorization', 'Bearer valid-access-token');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Logout successful');
    });
  });

  describe('Get Current User', () => {
    it('should get current user information', async () => {
      const mockUser = {
        sub: 'user-123',
        email: 'john.doe@mit.edu',
        university_id: 'uni-1',
        university_name: 'MIT',
        university_domain: 'mit.edu',
        user_type: 'student',
        verified: true,
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 900,
        iss: 'chitlaq-auth-service',
        aud: 'chitlaq-app',
      };

      // Mock JWT verification
      jest.spyOn(jwtManager, 'verifyAccessToken').mockReturnValue(mockUser);

      // Mock user profile
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'user-123',
          email: 'john.doe@mit.edu',
          first_name: 'John',
          last_name: 'Doe',
          user_type: 'student',
          department: 'Computer Science',
          university_id: 'uni-1',
          university_name: 'MIT',
          university_domain: 'mit.edu',
          is_verified: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        error: null,
      });

      // Mock session management
      jest.spyOn(sessionManager, 'isSessionValid').mockResolvedValue(true);
      jest.spyOn(sessionManager, 'updateSessionActivity').mockResolvedValue(undefined);

      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer valid-access-token');

      expect(response.status).toBe(200);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.id).toBe('user-123');
      expect(response.body.user.email).toBe('john.doe@mit.edu');
    });
  });

  describe('Session Management', () => {
    it('should get active sessions', async () => {
      const mockUser = {
        sub: 'user-123',
        email: 'john.doe@mit.edu',
        university_id: 'uni-1',
        university_name: 'MIT',
        university_domain: 'mit.edu',
        user_type: 'student',
        verified: true,
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 900,
        iss: 'chitlaq-auth-service',
        aud: 'chitlaq-app',
      };

      // Mock JWT verification
      jest.spyOn(jwtManager, 'verifyAccessToken').mockReturnValue(mockUser);

      // Mock session management
      jest.spyOn(sessionManager, 'isSessionValid').mockResolvedValue(true);
      jest.spyOn(sessionManager, 'updateSessionActivity').mockResolvedValue(undefined);
      jest.spyOn(sessionManager, 'getActiveSessions').mockResolvedValue([
        {
          deviceFingerprint: 'device-123',
          deviceInfo: {
            userAgent: 'Mozilla/5.0',
            platform: 'Windows',
          },
          ipAddress: '192.168.1.1',
          loginTime: '2024-01-01T00:00:00Z',
          lastActivity: '2024-01-01T12:00:00Z',
        },
      ]);

      const response = await request(app)
        .get('/auth/sessions')
        .set('Authorization', 'Bearer valid-access-token');

      expect(response.status).toBe(200);
      expect(response.body.sessions).toBeDefined();
      expect(response.body.sessions.length).toBe(1);
    });

    it('should invalidate specific session', async () => {
      const mockUser = {
        sub: 'user-123',
        email: 'john.doe@mit.edu',
        university_id: 'uni-1',
        university_name: 'MIT',
        university_domain: 'mit.edu',
        user_type: 'student',
        verified: true,
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 900,
        iss: 'chitlaq-auth-service',
        aud: 'chitlaq-app',
      };

      // Mock JWT verification
      jest.spyOn(jwtManager, 'verifyAccessToken').mockReturnValue(mockUser);

      // Mock session management
      jest.spyOn(sessionManager, 'isSessionValid').mockResolvedValue(true);
      jest.spyOn(sessionManager, 'updateSessionActivity').mockResolvedValue(undefined);
      jest.spyOn(sessionManager, 'invalidateSession').mockResolvedValue(undefined);

      const response = await request(app)
        .delete('/auth/sessions/device-123')
        .set('Authorization', 'Bearer valid-access-token');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Session invalidated successfully');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limiting on login attempts', async () => {
      const loginData = {
        email: 'john.doe@mit.edu',
        password: 'WrongPassword',
      };

      // Mock rate limiting
      jest.spyOn(sessionManager, 'isRateLimited').mockResolvedValue(true);

      const response = await request(app)
        .post('/auth/login')
        .send(loginData);

      expect(response.status).toBe(429);
      expect(response.body.error).toBe('Too many login attempts. Please try again later.');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing required fields', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('All required fields must be provided');
    });

    it('should handle server errors gracefully', async () => {
      // Mock Supabase error
      mockSupabase.auth.signUp.mockRejectedValue(new Error('Database connection failed'));

      const userData = {
        email: 'john.doe@mit.edu',
        password: 'SecurePass123!',
        confirmPassword: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
        userType: 'student',
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });
  });
});
