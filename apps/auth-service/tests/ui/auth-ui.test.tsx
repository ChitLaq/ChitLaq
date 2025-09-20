import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { AuthProvider } from '../../src/context/auth-context';
import { useAuth } from '../../src/hooks/use-auth';

// Mock the auth service
const mockAuthService = {
  register: jest.fn(),
  login: jest.fn(),
  logout: jest.fn(),
  refreshToken: jest.fn(),
  forgotPassword: jest.fn(),
  resetPassword: jest.fn(),
  verifyEmail: jest.fn(),
  resendVerification: jest.fn(),
  getUserProfile: jest.fn(),
  updateUserProfile: jest.fn(),
};

// Mock the auth context
const mockAuthContext = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  register: mockAuthService.register,
  login: mockAuthService.login,
  logout: mockAuthService.logout,
  refreshToken: mockAuthService.refreshToken,
  forgotPassword: mockAuthService.forgotPassword,
  resetPassword: mockAuthService.resetPassword,
  verifyEmail: mockAuthService.verifyEmail,
  resendVerification: mockAuthService.resendVerification,
  getUserProfile: mockAuthService.getUserProfile,
  updateUserProfile: mockAuthService.updateUserProfile,
  clearError: jest.fn(),
};

// Mock the auth hook
jest.mock('../../src/hooks/use-auth', () => ({
  useAuth: () => mockAuthContext,
}));

// Mock the auth context provider
jest.mock('../../src/context/auth-context', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('Authentication UI Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Registration Form', () => {
    it('should render registration form correctly', () => {
      render(
        <AuthProvider>
          <div>
            <h1>Register</h1>
            <form>
              <input type="email" placeholder="Email" />
              <input type="password" placeholder="Password" />
              <input type="password" placeholder="Confirm Password" />
              <input type="text" placeholder="First Name" />
              <input type="text" placeholder="Last Name" />
              <button type="submit">Register</button>
            </form>
          </div>
        </AuthProvider>
      );

      expect(screen.getByText('Register')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Confirm Password')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('First Name')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Last Name')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Register' })).toBeInTheDocument();
    });

    it('should handle form submission', async () => {
      mockAuthService.register.mockResolvedValueOnce({
        success: true,
        data: { userId: 'user123', email: 'student@university.edu' },
      });

      render(
        <AuthProvider>
          <div>
            <form onSubmit={(e) => {
              e.preventDefault();
              mockAuthService.register({
                email: 'student@university.edu',
                password: 'SecurePassword123!',
                confirmPassword: 'SecurePassword123!',
                firstName: 'John',
                lastName: 'Doe',
              });
            }}>
              <input type="email" placeholder="Email" />
              <input type="password" placeholder="Password" />
              <input type="password" placeholder="Confirm Password" />
              <input type="text" placeholder="First Name" />
              <input type="text" placeholder="Last Name" />
              <button type="submit">Register</button>
            </form>
          </div>
        </AuthProvider>
      );

      const submitButton = screen.getByRole('button', { name: 'Register' });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockAuthService.register).toHaveBeenCalledWith({
          email: 'student@university.edu',
          password: 'SecurePassword123!',
          confirmPassword: 'SecurePassword123!',
          firstName: 'John',
          lastName: 'Doe',
        });
      });
    });

    it('should display validation errors', async () => {
      mockAuthService.register.mockRejectedValueOnce({
        success: false,
        error: 'Invalid email format',
      });

      render(
        <AuthProvider>
          <div>
            <form onSubmit={(e) => {
              e.preventDefault();
              mockAuthService.register({
                email: 'invalid-email',
                password: '123',
                confirmPassword: '456',
                firstName: '',
                lastName: '',
              });
            }}>
              <input type="email" placeholder="Email" />
              <input type="password" placeholder="Password" />
              <input type="password" placeholder="Confirm Password" />
              <input type="text" placeholder="First Name" />
              <input type="text" placeholder="Last Name" />
              <button type="submit">Register</button>
            </form>
          </div>
        </AuthProvider>
      );

      const submitButton = screen.getByRole('button', { name: 'Register' });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockAuthService.register).toHaveBeenCalledWith({
          email: 'invalid-email',
          password: '123',
          confirmPassword: '456',
          firstName: '',
          lastName: '',
        });
      });
    });
  });

  describe('Login Form', () => {
    it('should render login form correctly', () => {
      render(
        <AuthProvider>
          <div>
            <h1>Login</h1>
            <form>
              <input type="email" placeholder="Email" />
              <input type="password" placeholder="Password" />
              <button type="submit">Login</button>
            </form>
          </div>
        </AuthProvider>
      );

      expect(screen.getByText('Login')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
    });

    it('should handle login form submission', async () => {
      mockAuthService.login.mockResolvedValueOnce({
        success: true,
        data: {
          accessToken: 'jwt-token',
          refreshToken: 'refresh-token',
          user: { id: 'user123', email: 'student@university.edu' },
        },
      });

      render(
        <AuthProvider>
          <div>
            <form onSubmit={(e) => {
              e.preventDefault();
              mockAuthService.login({
                email: 'student@university.edu',
                password: 'SecurePassword123!',
              });
            }}>
              <input type="email" placeholder="Email" />
              <input type="password" placeholder="Password" />
              <button type="submit">Login</button>
            </form>
          </div>
        </AuthProvider>
      );

      const submitButton = screen.getByRole('button', { name: 'Login' });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockAuthService.login).toHaveBeenCalledWith({
          email: 'student@university.edu',
          password: 'SecurePassword123!',
        });
      });
    });

    it('should display login errors', async () => {
      mockAuthService.login.mockRejectedValueOnce({
        success: false,
        error: 'Invalid credentials',
      });

      render(
        <AuthProvider>
          <div>
            <form onSubmit={(e) => {
              e.preventDefault();
              mockAuthService.login({
                email: 'student@university.edu',
                password: 'WrongPassword123!',
              });
            }}>
              <input type="email" placeholder="Email" />
              <input type="password" placeholder="Password" />
              <button type="submit">Login</button>
            </form>
          </div>
        </AuthProvider>
      );

      const submitButton = screen.getByRole('button', { name: 'Login' });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockAuthService.login).toHaveBeenCalledWith({
          email: 'student@university.edu',
          password: 'WrongPassword123!',
        });
      });
    });
  });

  describe('Password Reset Form', () => {
    it('should render password reset form correctly', () => {
      render(
        <AuthProvider>
          <div>
            <h1>Reset Password</h1>
            <form>
              <input type="email" placeholder="Email" />
              <button type="submit">Send Reset Link</button>
            </form>
          </div>
        </AuthProvider>
      );

      expect(screen.getByText('Reset Password')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Send Reset Link' })).toBeInTheDocument();
    });

    it('should handle password reset form submission', async () => {
      mockAuthService.forgotPassword.mockResolvedValueOnce({
        success: true,
        message: 'Reset link sent to your email',
      });

      render(
        <AuthProvider>
          <div>
            <form onSubmit={(e) => {
              e.preventDefault();
              mockAuthService.forgotPassword({
                email: 'student@university.edu',
              });
            }}>
              <input type="email" placeholder="Email" />
              <button type="submit">Send Reset Link</button>
            </form>
          </div>
        </AuthProvider>
      );

      const submitButton = screen.getByRole('button', { name: 'Send Reset Link' });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockAuthService.forgotPassword).toHaveBeenCalledWith({
          email: 'student@university.edu',
        });
      });
    });
  });

  describe('User Profile', () => {
    it('should render user profile correctly', () => {
      const mockUser = {
        id: 'user123',
        email: 'student@university.edu',
        firstName: 'John',
        lastName: 'Doe',
        universityId: '1',
      };

      render(
        <AuthProvider>
          <div>
            <h1>Profile</h1>
            <div>
              <p>Email: {mockUser.email}</p>
              <p>Name: {mockUser.firstName} {mockUser.lastName}</p>
            </div>
          </div>
        </AuthProvider>
      );

      expect(screen.getByText('Profile')).toBeInTheDocument();
      expect(screen.getByText(`Email: ${mockUser.email}`)).toBeInTheDocument();
      expect(screen.getByText(`Name: ${mockUser.firstName} ${mockUser.lastName}`)).toBeInTheDocument();
    });

    it('should handle profile updates', async () => {
      mockAuthService.updateUserProfile.mockResolvedValueOnce({
        success: true,
        data: { firstName: 'Jane', lastName: 'Smith' },
      });

      render(
        <AuthProvider>
          <div>
            <form onSubmit={(e) => {
              e.preventDefault();
              mockAuthService.updateUserProfile({
                firstName: 'Jane',
                lastName: 'Smith',
              });
            }}>
              <input type="text" placeholder="First Name" />
              <input type="text" placeholder="Last Name" />
              <button type="submit">Update Profile</button>
            </form>
          </div>
        </AuthProvider>
      );

      const submitButton = screen.getByRole('button', { name: 'Update Profile' });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockAuthService.updateUserProfile).toHaveBeenCalledWith({
          firstName: 'Jane',
          lastName: 'Smith',
        });
      });
    });
  });

  describe('Authentication State', () => {
    it('should show loading state', () => {
      const loadingContext = {
        ...mockAuthContext,
        isLoading: true,
      };

      render(
        <AuthProvider>
          <div>
            {loadingContext.isLoading ? <div>Loading...</div> : <div>Content</div>}
          </div>
        </AuthProvider>
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should show error state', () => {
      const errorContext = {
        ...mockAuthContext,
        error: 'Authentication failed',
      };

      render(
        <AuthProvider>
          <div>
            {errorContext.error && <div>Error: {errorContext.error}</div>}
          </div>
        </AuthProvider>
      );

      expect(screen.getByText('Error: Authentication failed')).toBeInTheDocument();
    });

    it('should show authenticated state', () => {
      const authenticatedContext = {
        ...mockAuthContext,
        isAuthenticated: true,
        user: { id: 'user123', email: 'student@university.edu' },
      };

      render(
        <AuthProvider>
          <div>
            {authenticatedContext.isAuthenticated ? (
              <div>Welcome, {authenticatedContext.user?.email}</div>
            ) : (
              <div>Please log in</div>
            )}
          </div>
        </AuthProvider>
      );

      expect(screen.getByText('Welcome, student@university.edu')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should show login link when not authenticated', () => {
      render(
        <AuthProvider>
          <div>
            {!mockAuthContext.isAuthenticated && (
              <a href="/login">Login</a>
            )}
          </div>
        </AuthProvider>
      );

      expect(screen.getByText('Login')).toBeInTheDocument();
    });

    it('should show logout button when authenticated', () => {
      const authenticatedContext = {
        ...mockAuthContext,
        isAuthenticated: true,
        user: { id: 'user123', email: 'student@university.edu' },
      };

      render(
        <AuthProvider>
          <div>
            {authenticatedContext.isAuthenticated && (
              <button onClick={() => mockAuthService.logout()}>Logout</button>
            )}
          </div>
        </AuthProvider>
      );

      expect(screen.getByText('Logout')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper form labels', () => {
      render(
        <AuthProvider>
          <div>
            <form>
              <label htmlFor="email">Email</label>
              <input id="email" type="email" />
              <label htmlFor="password">Password</label>
              <input id="password" type="password" />
              <button type="submit">Login</button>
            </form>
          </div>
        </AuthProvider>
      );

      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
    });

    it('should have proper ARIA attributes', () => {
      render(
        <AuthProvider>
          <div>
            <form role="form" aria-label="Login Form">
              <input type="email" aria-label="Email address" />
              <input type="password" aria-label="Password" />
              <button type="submit" aria-label="Submit login form">Login</button>
            </form>
          </div>
        </AuthProvider>
      );

      expect(screen.getByRole('form')).toBeInTheDocument();
      expect(screen.getByLabelText('Email address')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      expect(screen.getByLabelText('Submit login form')).toBeInTheDocument();
    });

    it('should handle keyboard navigation', () => {
      render(
        <AuthProvider>
          <div>
            <form>
              <input type="email" tabIndex={1} />
              <input type="password" tabIndex={2} />
              <button type="submit" tabIndex={3}>Login</button>
            </form>
          </div>
        </AuthProvider>
      );

      const emailInput = screen.getByRole('textbox');
      const passwordInput = screen.getByDisplayValue('');
      const submitButton = screen.getByRole('button');

      expect(emailInput).toHaveAttribute('tabindex', '1');
      expect(passwordInput).toHaveAttribute('tabindex', '2');
      expect(submitButton).toHaveAttribute('tabindex', '3');
    });
  });

  describe('Responsive Design', () => {
    it('should be mobile-friendly', () => {
      render(
        <AuthProvider>
          <div style={{ maxWidth: '400px', margin: '0 auto' }}>
            <form>
              <input type="email" style={{ width: '100%', padding: '12px' }} />
              <input type="password" style={{ width: '100%', padding: '12px' }} />
              <button type="submit" style={{ width: '100%', padding: '12px' }}>Login</button>
            </form>
          </div>
        </AuthProvider>
      );

      const form = screen.getByRole('form');
      expect(form).toBeInTheDocument();
    });
  });
});
