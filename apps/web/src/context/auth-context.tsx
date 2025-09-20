import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth, User, AuthTokens, LoginCredentials, RegisterData } from '../hooks/use-auth';

interface AuthContextType {
  // State
  user: User | null;
  tokens: AuthTokens | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;

  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (registerData: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  getCurrentUser: () => Promise<User | null>;
  getActiveSessions: () => Promise<any[]>;
  invalidateSession: (deviceFingerprint: string) => Promise<void>;
  clearError: () => void;

  // Utilities
  hasRole: (role: 'student' | 'faculty' | 'staff') => boolean;
  isVerified: () => boolean;
  belongsToUniversity: (universityId: string) => boolean;
  belongsToDepartment: (department: string) => boolean;
  belongsToFaculty: (faculty: string) => boolean;
  apiRequest: (endpoint: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const auth = useAuth();

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

// Higher-order component for protecting routes
interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'student' | 'faculty' | 'staff';
  requireVerification?: boolean;
  fallback?: ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  requireVerification = true,
  fallback = <div>Access denied</div>,
}) => {
  const { isAuthenticated, isLoading, user, hasRole, isVerified } = useAuthContext();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-4">Please log in to access this page.</p>
          <button
            onClick={() => window.location.href = '/login'}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (requireVerification && !isVerified()) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Email Verification Required</h2>
          <p className="text-gray-600 mb-4">
            Please verify your email address to access this page.
          </p>
          <button
            onClick={() => window.location.href = '/verify-email'}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Verify Email
          </button>
        </div>
      </div>
    );
  }

  if (requiredRole && !hasRole(requiredRole)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-4">
            You don't have permission to access this page.
          </p>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// Component for role-based content rendering
interface RoleBasedContentProps {
  children: ReactNode;
  allowedRoles: Array<'student' | 'faculty' | 'staff'>;
  fallback?: ReactNode;
}

export const RoleBasedContent: React.FC<RoleBasedContentProps> = ({
  children,
  allowedRoles,
  fallback = null,
}) => {
  const { user } = useAuthContext();

  if (!user || !allowedRoles.includes(user.userType)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

// Component for university-based content rendering
interface UniversityBasedContentProps {
  children: ReactNode;
  allowedUniversities: string[];
  fallback?: ReactNode;
}

export const UniversityBasedContent: React.FC<UniversityBasedContentProps> = ({
  children,
  allowedUniversities,
  fallback = null,
}) => {
  const { user, belongsToUniversity } = useAuthContext();

  if (!user || !allowedUniversities.some(uniId => belongsToUniversity(uniId))) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

// Component for department-based content rendering
interface DepartmentBasedContentProps {
  children: ReactNode;
  allowedDepartments: string[];
  fallback?: ReactNode;
}

export const DepartmentBasedContent: React.FC<DepartmentBasedContentProps> = ({
  children,
  allowedDepartments,
  fallback = null,
}) => {
  const { user, belongsToDepartment } = useAuthContext();

  if (!user || !allowedDepartments.some(dept => belongsToDepartment(dept))) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

// Component for faculty-based content rendering
interface FacultyBasedContentProps {
  children: ReactNode;
  allowedFaculties: string[];
  fallback?: ReactNode;
}

export const FacultyBasedContent: React.FC<FacultyBasedContentProps> = ({
  children,
  allowedFaculties,
  fallback = null,
}) => {
  const { user, belongsToFaculty } = useAuthContext();

  if (!user || !allowedFaculties.some(faculty => belongsToFaculty(faculty))) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

// Hook for checking specific permissions
export const usePermissions = () => {
  const { user, hasRole, isVerified, belongsToUniversity, belongsToDepartment, belongsToFaculty } = useAuthContext();

  const canAccess = (permission: string): boolean => {
    if (!user) return false;

    switch (permission) {
      case 'admin':
        return hasRole('staff') || hasRole('faculty');
      case 'moderate':
        return hasRole('staff') || hasRole('faculty');
      case 'create_content':
        return isVerified();
      case 'view_analytics':
        return hasRole('staff') || hasRole('faculty');
      case 'manage_users':
        return hasRole('staff');
      case 'view_reports':
        return hasRole('staff') || hasRole('faculty');
      default:
        return false;
    }
  };

  const canAccessUniversity = (universityId: string): boolean => {
    return belongsToUniversity(universityId);
  };

  const canAccessDepartment = (department: string): boolean => {
    return belongsToDepartment(department);
  };

  const canAccessFaculty = (faculty: string): boolean => {
    return belongsToFaculty(faculty);
  };

  return {
    canAccess,
    canAccessUniversity,
    canAccessDepartment,
    canAccessFaculty,
    user,
    hasRole,
    isVerified,
  };
};

// Component for permission-based content rendering
interface PermissionBasedContentProps {
  children: ReactNode;
  permission: string;
  fallback?: ReactNode;
}

export const PermissionBasedContent: React.FC<PermissionBasedContentProps> = ({
  children,
  permission,
  fallback = null,
}) => {
  const { canAccess } = usePermissions();

  if (!canAccess(permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

// Hook for getting user display information
export const useUserDisplay = () => {
  const { user } = useAuthContext();

  const getDisplayName = (): string => {
    if (!user) return 'Guest';
    return `${user.firstName} ${user.lastName}`;
  };

  const getInitials = (): string => {
    if (!user) return 'G';
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
  };

  const getRoleDisplayName = (): string => {
    if (!user) return 'Guest';
    switch (user.userType) {
      case 'student':
        return 'Student';
      case 'faculty':
        return 'Faculty';
      case 'staff':
        return 'Staff';
      default:
        return 'User';
    }
  };

  const getUniversityDisplayName = (): string => {
    if (!user) return 'Unknown University';
    return user.university.name;
  };

  const getDepartmentDisplayName = (): string => {
    if (!user || !user.department) return 'No Department';
    return user.department;
  };

  const getFacultyDisplayName = (): string => {
    if (!user || !user.faculty) return 'No Faculty';
    return user.faculty;
  };

  return {
    getDisplayName,
    getInitials,
    getRoleDisplayName,
    getUniversityDisplayName,
    getDepartmentDisplayName,
    getFacultyDisplayName,
    user,
  };
};

export default AuthContext;
