import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getLogger } from '../../../utils/logger';

const logger = getLogger('useAuth');

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  userType: 'student' | 'faculty' | 'staff';
  department?: string;
  faculty?: string;
  university: {
    id: string;
    name: string;
    domain: string;
  };
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  userType: 'student' | 'faculty' | 'staff';
  department?: string;
  faculty?: string;
}

export interface AuthError {
  message: string;
  code: string;
  details?: any;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    tokens: null,
    isLoading: true,
    isAuthenticated: false,
    error: null,
  });

  const router = useRouter();

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedTokens = localStorage.getItem('auth_tokens');
        const storedUser = localStorage.getItem('auth_user');

        if (storedTokens && storedUser) {
          const tokens = JSON.parse(storedTokens);
          const user = JSON.parse(storedUser);

          // Verify token is still valid
          if (tokens.expiresAt && Date.now() < tokens.expiresAt) {
            setAuthState({
              user,
              tokens,
              isLoading: false,
              isAuthenticated: true,
              error: null,
            });
          } else {
            // Try to refresh token
            await refreshToken();
          }
        } else {
          setAuthState(prev => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        logger.error('Auth initialization error:', error);
        setAuthState({
          user: null,
          tokens: null,
          isLoading: false,
          isAuthenticated: false,
          error: 'Failed to initialize authentication',
        });
      }
    };

    initializeAuth();
  }, []);

  // Auto-refresh token before expiration
  useEffect(() => {
    if (!authState.tokens) return;

    const refreshInterval = setInterval(async () => {
      const expiresAt = authState.tokens?.expiresAt;
      if (expiresAt && Date.now() >= expiresAt - 60000) { // Refresh 1 minute before expiration
        await refreshToken();
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(refreshInterval);
  }, [authState.tokens]);

  // API request helper with automatic token refresh
  const apiRequest = useCallback(async (
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> => {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = authState.tokens?.accessToken;

    const requestOptions: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    };

    let response = await fetch(url, requestOptions);

    // If token expired, try to refresh
    if (response.status === 401 && authState.tokens?.refreshToken) {
      const refreshed = await refreshToken();
      if (refreshed) {
        // Retry request with new token
        requestOptions.headers = {
          ...requestOptions.headers,
          Authorization: `Bearer ${authState.tokens.accessToken}`,
        };
        response = await fetch(url, requestOptions);
      }
    }

    return response;
  }, [authState.tokens]);

  // Login function
  const login = useCallback(async (credentials: LoginCredentials): Promise<void> => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      const { user, tokens } = data;
      const expiresAt = Date.now() + (tokens.expiresIn * 1000);

      // Store in localStorage
      localStorage.setItem('auth_tokens', JSON.stringify({ ...tokens, expiresAt }));
      localStorage.setItem('auth_user', JSON.stringify(user));

      setAuthState({
        user,
        tokens: { ...tokens, expiresAt },
        isLoading: false,
        isAuthenticated: true,
        error: null,
      });

      logger.info('User logged in successfully');
    } catch (error: any) {
      logger.error('Login error:', error);
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Login failed',
      }));
      throw error;
    }
  }, []);

  // Register function
  const register = useCallback(async (registerData: RegisterData): Promise<void> => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registerData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: null,
      }));

      logger.info('User registered successfully');
    } catch (error: any) {
      logger.error('Registration error:', error);
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Registration failed',
      }));
      throw error;
    }
  }, []);

  // Logout function
  const logout = useCallback(async (): Promise<void> => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));

      // Call logout endpoint
      await apiRequest('/auth/logout', { method: 'POST' });

      // Clear localStorage
      localStorage.removeItem('auth_tokens');
      localStorage.removeItem('auth_user');

      setAuthState({
        user: null,
        tokens: null,
        isLoading: false,
        isAuthenticated: false,
        error: null,
      });

      logger.info('User logged out successfully');
    } catch (error: any) {
      logger.error('Logout error:', error);
      // Still clear local state even if API call fails
      localStorage.removeItem('auth_tokens');
      localStorage.removeItem('auth_user');
      setAuthState({
        user: null,
        tokens: null,
        isLoading: false,
        isAuthenticated: false,
        error: null,
      });
    }
  }, [apiRequest]);

  // Logout from all devices
  const logoutAll = useCallback(async (): Promise<void> => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));

      await apiRequest('/auth/logout-all', { method: 'POST' });

      // Clear localStorage
      localStorage.removeItem('auth_tokens');
      localStorage.removeItem('auth_user');

      setAuthState({
        user: null,
        tokens: null,
        isLoading: false,
        isAuthenticated: false,
        error: null,
      });

      logger.info('User logged out from all devices');
    } catch (error: any) {
      logger.error('Logout all error:', error);
      throw error;
    }
  }, [apiRequest]);

  // Refresh token function
  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const storedTokens = localStorage.getItem('auth_tokens');
      if (!storedTokens) return false;

      const tokens = JSON.parse(storedTokens);
      if (!tokens.refreshToken) return false;

      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      const { tokens: newTokens } = data;
      const expiresAt = Date.now() + (newTokens.expiresIn * 1000);

      // Update localStorage
      localStorage.setItem('auth_tokens', JSON.stringify({ ...newTokens, expiresAt }));

      setAuthState(prev => ({
        ...prev,
        tokens: { ...newTokens, expiresAt },
        error: null,
      }));

      logger.info('Token refreshed successfully');
      return true;
    } catch (error: any) {
      logger.error('Token refresh error:', error);
      // Clear invalid tokens
      localStorage.removeItem('auth_tokens');
      localStorage.removeItem('auth_user');
      setAuthState({
        user: null,
        tokens: null,
        isLoading: false,
        isAuthenticated: false,
        error: 'Session expired',
      });
      return false;
    }
  }, []);

  // Get current user info
  const getCurrentUser = useCallback(async (): Promise<User | null> => {
    try {
      const response = await apiRequest('/auth/me');
      
      if (!response.ok) {
        throw new Error('Failed to get user info');
      }

      const data = await response.json();
      const user = data.user;

      // Update stored user data
      localStorage.setItem('auth_user', JSON.stringify(user));
      setAuthState(prev => ({ ...prev, user }));

      return user;
    } catch (error: any) {
      logger.error('Get current user error:', error);
      return null;
    }
  }, [apiRequest]);

  // Get active sessions
  const getActiveSessions = useCallback(async () => {
    try {
      const response = await apiRequest('/auth/sessions');
      
      if (!response.ok) {
        throw new Error('Failed to get sessions');
      }

      const data = await response.json();
      return data.sessions;
    } catch (error: any) {
      logger.error('Get sessions error:', error);
      throw error;
    }
  }, [apiRequest]);

  // Invalidate specific session
  const invalidateSession = useCallback(async (deviceFingerprint: string): Promise<void> => {
    try {
      const response = await apiRequest(`/auth/sessions/${deviceFingerprint}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to invalidate session');
      }
    } catch (error: any) {
      logger.error('Invalidate session error:', error);
      throw error;
    }
  }, [apiRequest]);

  // Clear error
  const clearError = useCallback(() => {
    setAuthState(prev => ({ ...prev, error: null }));
  }, []);

  // Check if user has specific role
  const hasRole = useCallback((role: 'student' | 'faculty' | 'staff'): boolean => {
    return authState.user?.userType === role;
  }, [authState.user]);

  // Check if user is verified
  const isVerified = useCallback((): boolean => {
    return authState.user?.isVerified || false;
  }, [authState.user]);

  // Check if user belongs to specific university
  const belongsToUniversity = useCallback((universityId: string): boolean => {
    return authState.user?.university.id === universityId;
  }, [authState.user]);

  // Check if user belongs to specific department
  const belongsToDepartment = useCallback((department: string): boolean => {
    return authState.user?.department === department;
  }, [authState.user]);

  // Check if user belongs to specific faculty
  const belongsToFaculty = useCallback((faculty: string): boolean => {
    return authState.user?.faculty === faculty;
  }, [authState.user]);

  return {
    // State
    user: authState.user,
    tokens: authState.tokens,
    isLoading: authState.isLoading,
    isAuthenticated: authState.isAuthenticated,
    error: authState.error,

    // Actions
    login,
    register,
    logout,
    logoutAll,
    refreshToken,
    getCurrentUser,
    getActiveSessions,
    invalidateSession,
    clearError,

    // Utilities
    hasRole,
    isVerified,
    belongsToUniversity,
    belongsToDepartment,
    belongsToFaculty,
    apiRequest,
  };
};
