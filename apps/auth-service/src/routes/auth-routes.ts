import { Router, Request, Response } from 'express';
import { SupabaseClient } from '@supabase/supabase-js';
import { Redis } from 'ioredis';
import { getLogger } from '../../../utils/logger';
import { getJWTManager } from '../auth/jwt-manager';
import { getSessionManager } from '../auth/session-manager';
import { getAuthMiddleware } from '../middleware/auth-middleware';
import { UniversityEmailValidator } from '../validators/university-email';
import { getFraudDetectionService } from '../utils/fraud-detection';
import { authConfig } from '../auth/supabase-config';

const logger = getLogger('AuthRoutes');

export interface RegisterRequest {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  userType: 'student' | 'faculty' | 'staff';
  department?: string;
  faculty?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirmRequest {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export const createAuthRoutes = (supabase: SupabaseClient, redis: Redis): Router => {
  const router = Router();
  const jwtManager = getJWTManager(redis);
  const sessionManager = getSessionManager(redis, jwtManager);
  const authMiddleware = getAuthMiddleware(redis);
  const emailValidator = new UniversityEmailValidator(supabase, redis);
  const fraudService = getFraudDetectionService(supabase, redis);

  /**
   * @route POST /auth/register
   * @description Register a new user with university email validation
   * @access Public
   */
  router.post('/register', authMiddleware.loginAttemptMonitor(), async (req: Request, res: Response) => {
    try {
      const {
        email,
        password,
        confirmPassword,
        firstName,
        lastName,
        userType,
        department,
        faculty,
      }: RegisterRequest = req.body;

      // Validate required fields
      if (!email || !password || !confirmPassword || !firstName || !lastName || !userType) {
        return res.status(400).json({
          error: 'All required fields must be provided',
          code: 'MISSING_FIELDS',
        });
      }

      // Validate password confirmation
      if (password !== confirmPassword) {
        return res.status(400).json({
          error: 'Passwords do not match',
          code: 'PASSWORD_MISMATCH',
        });
      }

      // Validate password strength
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        return res.status(400).json({
          error: 'Password does not meet requirements',
          code: 'WEAK_PASSWORD',
          details: passwordValidation.errors,
        });
      }

      // Validate university email
      const emailValidation = await emailValidator.validate(email);
      if (!emailValidation.isValid) {
        await fraudService.recordFraudAttempt(
          email,
          req.ip || 'unknown',
          emailValidation.reason || 'Invalid email',
          req.headers['user-agent'],
          req.headers['x-country'] as string,
          req.headers['x-city'] as string
        );

        return res.status(400).json({
          error: emailValidation.reason,
          code: 'INVALID_EMAIL',
        });
      }

      // Check if user already exists
      const { data: existingUser, error: userCheckError } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (existingUser) {
        return res.status(409).json({
          error: 'User already exists with this email',
          code: 'USER_EXISTS',
        });
      }

      // Register user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            user_type: userType,
            department,
            faculty,
            university_id: emailValidation.university?.id,
            university_name: emailValidation.university?.name,
            university_domain: emailValidation.university?.domain,
          },
        },
      });

      if (authError) {
        logger.error(`Supabase auth registration error: ${authError.message}`);
        return res.status(500).json({
          error: 'Registration failed',
          code: 'REGISTRATION_ERROR',
        });
      }

      // Create user profile
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: authData.user?.id,
          email,
          first_name: firstName,
          last_name: lastName,
          user_type: userType,
          department,
          faculty,
          university_id: emailValidation.university?.id,
          university_name: emailValidation.university?.name,
          university_domain: emailValidation.university?.domain,
          is_verified: false,
          created_at: new Date().toISOString(),
        });

      if (profileError) {
        logger.error(`Profile creation error: ${profileError.message}`);
        return res.status(500).json({
          error: 'Profile creation failed',
          code: 'PROFILE_ERROR',
        });
      }

      logger.info(`User registered successfully: ${email}`);
      res.status(201).json({
        message: 'Registration successful. Please check your email for verification.',
        userId: authData.user?.id,
        email: authData.user?.email,
        requiresVerification: true,
      });
    } catch (error: any) {
      logger.error(`Registration error: ${error.message}`);
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }
  });

  /**
   * @route POST /auth/login
   * @description Login user with email and password
   * @access Public
   */
  router.post('/login', authMiddleware.loginAttemptMonitor(), async (req: Request, res: Response) => {
    try {
      const { email, password, rememberMe }: LoginRequest = req.body;

      if (!email || !password) {
        return res.status(400).json({
          error: 'Email and password are required',
          code: 'MISSING_CREDENTIALS',
        });
      }

      // Check rate limiting
      const isRateLimited = await sessionManager.isRateLimited(email, req.ip || 'unknown');
      if (isRateLimited) {
        return res.status(429).json({
          error: 'Too many login attempts. Please try again later.',
          code: 'RATE_LIMITED',
        });
      }

      // Authenticate with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        // Record failed login attempt
        await sessionManager.recordLoginAttempt({
          email,
          ipAddress: req.ip || 'unknown',
          userAgent: req.headers['user-agent'] || 'Unknown',
          timestamp: new Date().toISOString(),
          success: false,
          reason: authError.message,
          deviceFingerprint: authMiddleware.extractDeviceInfo(req).fingerprint,
        });

        return res.status(401).json({
          error: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS',
        });
      }

      // Get user profile
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user?.id)
        .single();

      if (profileError || !userProfile) {
        logger.error(`Profile fetch error: ${profileError?.message}`);
        return res.status(500).json({
          error: 'User profile not found',
          code: 'PROFILE_NOT_FOUND',
        });
      }

      // Check if user is verified
      if (!userProfile.is_verified) {
        return res.status(403).json({
          error: 'Email verification required',
          code: 'VERIFICATION_REQUIRED',
        });
      }

      // Generate tokens
      const deviceInfo = authMiddleware.extractDeviceInfo(req);
      const tokenPair = jwtManager.generateTokenPair(
        userProfile.id,
        userProfile.email,
        {
          id: userProfile.university_id,
          name: userProfile.university_name,
          domain: userProfile.university_domain,
          userType: userProfile.user_type,
          department: userProfile.department,
          faculty: userProfile.faculty,
        },
        deviceInfo
      );

      // Create session
      await sessionManager.createSession(
        userProfile.id,
        userProfile.email,
        userProfile.university_id,
        deviceInfo,
        req.ip || 'unknown'
      );

      // Record successful login attempt
      await sessionManager.recordLoginAttempt({
        email,
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'Unknown',
        timestamp: new Date().toISOString(),
        success: true,
        deviceFingerprint: deviceInfo.fingerprint,
      });

      logger.info(`User logged in successfully: ${email}`);
      res.json({
        message: 'Login successful',
        user: {
          id: userProfile.id,
          email: userProfile.email,
          firstName: userProfile.first_name,
          lastName: userProfile.last_name,
          userType: userProfile.user_type,
          department: userProfile.department,
          faculty: userProfile.faculty,
          university: {
            id: userProfile.university_id,
            name: userProfile.university_name,
            domain: userProfile.university_domain,
          },
        },
        tokens: tokenPair,
      });
    } catch (error: any) {
      logger.error(`Login error: ${error.message}`);
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }
  });

  /**
   * @route POST /auth/refresh
   * @description Refresh access token using refresh token
   * @access Public
   */
  router.post('/refresh', async (req: Request, res: Response) => {
    try {
      const { refreshToken }: RefreshTokenRequest = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          error: 'Refresh token is required',
          code: 'MISSING_REFRESH_TOKEN',
        });
      }

      // Verify refresh token
      const payload = jwtManager.verifyRefreshToken(refreshToken);
      if (!payload) {
        return res.status(401).json({
          error: 'Invalid or expired refresh token',
          code: 'INVALID_REFRESH_TOKEN',
        });
      }

      // Get user profile
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', payload.sub)
        .single();

      if (profileError || !userProfile) {
        return res.status(404).json({
          error: 'User not found',
          code: 'USER_NOT_FOUND',
        });
      }

      // Generate new token pair
      const deviceInfo = authMiddleware.extractDeviceInfo(req);
      const tokenPair = jwtManager.generateTokenPair(
        userProfile.id,
        userProfile.email,
        {
          id: userProfile.university_id,
          name: userProfile.university_name,
          domain: userProfile.university_domain,
          userType: userProfile.user_type,
          department: userProfile.department,
          faculty: userProfile.faculty,
        },
        deviceInfo
      );

      res.json({
        message: 'Token refreshed successfully',
        tokens: tokenPair,
      });
    } catch (error: any) {
      logger.error(`Token refresh error: ${error.message}`);
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }
  });

  /**
   * @route POST /auth/logout
   * @description Logout user and invalidate session
   * @access Private
   */
  router.post('/logout', authMiddleware.authenticate(), async (req: Request, res: Response) => {
    try {
      const userId = req.user!.sub;
      const deviceFingerprint = req.deviceInfo!.fingerprint;

      // Invalidate session
      await sessionManager.invalidateSession(userId, deviceFingerprint);

      // Sign out from Supabase
      await supabase.auth.signOut();

      logger.info(`User logged out: ${req.user!.email}`);
      res.json({
        message: 'Logout successful',
      });
    } catch (error: any) {
      logger.error(`Logout error: ${error.message}`);
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }
  });

  /**
   * @route POST /auth/logout-all
   * @description Logout user from all devices
   * @access Private
   */
  router.post('/logout-all', authMiddleware.authenticate(), async (req: Request, res: Response) => {
    try {
      const userId = req.user!.sub;

      // Invalidate all sessions
      await sessionManager.invalidateAllSessions(userId);

      // Revoke all refresh tokens
      await jwtManager.revokeAllRefreshTokens(userId);

      logger.info(`User logged out from all devices: ${req.user!.email}`);
      res.json({
        message: 'Logged out from all devices successfully',
      });
    } catch (error: any) {
      logger.error(`Logout all error: ${error.message}`);
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }
  });

  /**
   * @route GET /auth/me
   * @description Get current user information
   * @access Private
   */
  router.get('/me', authMiddleware.authenticate(), async (req: Request, res: Response) => {
    try {
      const userId = req.user!.sub;

      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError || !userProfile) {
        return res.status(404).json({
          error: 'User profile not found',
          code: 'PROFILE_NOT_FOUND',
        });
      }

      res.json({
        user: {
          id: userProfile.id,
          email: userProfile.email,
          firstName: userProfile.first_name,
          lastName: userProfile.last_name,
          userType: userProfile.user_type,
          department: userProfile.department,
          faculty: userProfile.faculty,
          university: {
            id: userProfile.university_id,
            name: userProfile.university_name,
            domain: userProfile.university_domain,
          },
          isVerified: userProfile.is_verified,
          createdAt: userProfile.created_at,
          updatedAt: userProfile.updated_at,
        },
      });
    } catch (error: any) {
      logger.error(`Get user error: ${error.message}`);
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }
  });

  /**
   * @route GET /auth/sessions
   * @description Get user's active sessions
   * @access Private
   */
  router.get('/sessions', authMiddleware.authenticate(), async (req: Request, res: Response) => {
    try {
      const userId = req.user!.sub;
      const sessions = await sessionManager.getActiveSessions(userId);

      res.json({
        sessions: sessions.map(session => ({
          deviceFingerprint: session.deviceInfo.fingerprint,
          userAgent: session.deviceInfo.userAgent,
          platform: session.deviceInfo.platform,
          ipAddress: session.ipAddress,
          loginTime: session.loginTime,
          lastActivity: session.lastActivity,
        })),
      });
    } catch (error: any) {
      logger.error(`Get sessions error: ${error.message}`);
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }
  });

  /**
   * @route DELETE /auth/sessions/:deviceFingerprint
   * @description Invalidate specific session
   * @access Private
   */
  router.delete('/sessions/:deviceFingerprint', authMiddleware.authenticate(), async (req: Request, res: Response) => {
    try {
      const userId = req.user!.sub;
      const { deviceFingerprint } = req.params;

      await sessionManager.invalidateSession(userId, deviceFingerprint);

      res.json({
        message: 'Session invalidated successfully',
      });
    } catch (error: any) {
      logger.error(`Invalidate session error: ${error.message}`);
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }
  });

  return router;
};

// Password validation utility
function validatePassword(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const config = authConfig.security;

  if (password.length < config.passwordMinLength) {
    errors.push(`Password must be at least ${config.passwordMinLength} characters long`);
  }

  if (config.passwordRequirements.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (config.passwordRequirements.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (config.passwordRequirements.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (config.passwordRequirements.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
