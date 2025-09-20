import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@supabase/supabase-js/server';
import { getLogger } from '../../../utils/logger';

const logger = getLogger('SupabaseConfig');

// Environment variables
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export interface AuthConfig {
  url: string;
  anonKey: string;
  serviceKey: string;
  auth: {
    autoRefreshToken: boolean;
    persistSession: boolean;
    detectSessionInUrl: boolean;
    flowType: 'pkce' | 'implicit';
    storage: any;
  };
  global: {
    headers: Record<string, string>;
  };
}

// Client-side Supabase configuration
export const supabaseConfig: AuthConfig = {
  url: supabaseUrl,
  anonKey: supabaseAnonKey,
  serviceKey: supabaseServiceKey,
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
  global: {
    headers: {
      'X-Client-Info': 'chitlaq-auth-service',
    },
  },
};

// Create client instances
let clientInstance: SupabaseClient | null = null;
let serverInstance: SupabaseClient | null = null;

export const getClient = (): SupabaseClient => {
  if (!clientInstance) {
    clientInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: supabaseConfig.auth,
      global: supabaseConfig.global,
    });
    logger.info('Client-side Supabase instance created');
  }
  return clientInstance;
};

export const getServerClient = (): SupabaseClient => {
  if (!serverInstance) {
    serverInstance = createServerClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: supabaseConfig.global,
    });
    logger.info('Server-side Supabase instance created');
  }
  return serverInstance;
};

// Auth configuration for custom JWT claims
export const authConfig = {
  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: '15m', // Short expiration for security
    algorithm: 'HS256',
  },
  refreshToken: {
    expiresIn: '7d',
    rotationInterval: '1d',
  },
  session: {
    maxAge: 15 * 60 * 1000, // 15 minutes in milliseconds
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      path: '/',
    },
  },
  security: {
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
    passwordMinLength: 8,
    passwordRequirements: {
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: false,
    },
  },
  university: {
    emailVerificationRequired: true,
    domainValidationRequired: true,
    prefixValidationEnabled: true,
  },
};

// Custom JWT claims interface
export interface CustomJWTClaims {
  sub: string; // User ID
  email: string;
  university_id: string;
  university_name: string;
  university_domain: string;
  user_type: 'student' | 'faculty' | 'staff';
  department?: string;
  faculty?: string;
  verified: boolean;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

// Auth events for session management
export enum AuthEvent {
  SIGNED_IN = 'SIGNED_IN',
  SIGNED_OUT = 'SIGNED_OUT',
  TOKEN_REFRESHED = 'TOKEN_REFRESHED',
  PASSWORD_RECOVERY = 'PASSWORD_RECOVERY',
  USER_UPDATED = 'USER_UPDATED',
}

// Device fingerprinting for security
export interface DeviceInfo {
  userAgent: string;
  platform: string;
  language: string;
  timezone: string;
  screenResolution?: string;
  colorDepth?: number;
  fingerprint: string;
}

// Session metadata
export interface SessionMetadata {
  deviceInfo: DeviceInfo;
  ipAddress: string;
  loginTime: string;
  lastActivity: string;
  isActive: boolean;
}

// Login attempt tracking
export interface LoginAttempt {
  email: string;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  success: boolean;
  reason?: string;
  deviceFingerprint: string;
}

// Validation functions
export const validateConfig = (): boolean => {
  const requiredVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'JWT_SECRET',
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    logger.error(`Missing required environment variables: ${missing.join(', ')}`);
    return false;
  }

  logger.info('Supabase configuration validated successfully');
  return true;
};

// Initialize configuration
export const initializeAuth = (): boolean => {
  if (!validateConfig()) {
    return false;
  }

  // Test connection
  try {
    const client = getClient();
    logger.info('Supabase client initialized successfully');
    return true;
  } catch (error) {
    logger.error(`Failed to initialize Supabase client: ${error}`);
    return false;
  }
};

export default {
  supabaseConfig,
  authConfig,
  getClient,
  getServerClient,
  validateConfig,
  initializeAuth,
  AuthEvent,
};
