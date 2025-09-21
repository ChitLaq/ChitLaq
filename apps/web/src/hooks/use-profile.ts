import { useState, useCallback, useEffect, useRef } from 'react';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  bio?: string;
  avatar?: string;
  university?: string;
  academicYear?: string;
  interests?: string[];
  location?: string;
  birthDate?: string;
  phone?: string;
  website?: string;
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    github?: string;
  };
  privacy: {
    profileVisibility: 'public' | 'friends' | 'private';
    showEmail: boolean;
    showLocation: boolean;
    showBirthDate: boolean;
    showInterests: boolean;
    showUniversity: boolean;
    showAcademicYear: boolean;
    showPosts: 'public' | 'friends' | 'private';
    showFollowers: 'public' | 'friends' | 'private';
    showFollowing: 'public' | 'friends' | 'private';
    allowMessages: 'everyone' | 'friends' | 'none';
    allowFriendRequests: 'everyone' | 'friends' | 'none';
    allowTagging: boolean;
    allowMentions: boolean;
    showOnlineStatus: boolean;
    showLastSeen: boolean;
    allowSearchEngines: boolean;
    allowDataCollection: boolean;
    allowAnalytics: boolean;
    allowMarketing: boolean;
  };
  stats: {
    posts: number;
    followers: number;
    following: number;
    likes: number;
    comments: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ProfileUpdateData {
  username?: string;
  bio?: string;
  avatar?: string;
  university?: string;
  academicYear?: string;
  interests?: string[];
  location?: string;
  birthDate?: string;
  phone?: string;
  website?: string;
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    github?: string;
  };
  privacy?: Partial<UserProfile['privacy']>;
}

export interface ProfileHookOptions {
  autoSave?: boolean;
  autoSaveDelay?: number;
  onSave?: (data: ProfileUpdateData) => void;
  onError?: (error: Error) => void;
}

export interface ProfileHookReturn {
  profile: UserProfile | null;
  loading: boolean;
  error: Error | null;
  updating: boolean;
  updateProfile: (data: ProfileUpdateData) => Promise<void>;
  saveProfile: () => Promise<void>;
  resetProfile: () => void;
  validateProfile: (data: ProfileUpdateData) => { valid: boolean; errors: string[] };
  getProfileCompletion: () => number;
  getProfileStats: () => UserProfile['stats'];
  isDirty: boolean;
  hasUnsavedChanges: boolean;
}

export const useProfile = (
  userId?: string,
  options: ProfileHookOptions = {}
): ProfileHookReturn => {
  const {
    autoSave = false,
    autoSaveDelay = 2000,
    onSave,
    onError
  } = options;

  // State
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [updating, setUpdating] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Refs
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedDataRef = useRef<ProfileUpdateData | null>(null);

  // Load profile
  const loadProfile = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/profiles/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load profile: ${response.statusText}`);
      }

      const data = await response.json();
      setProfile(data);
      lastSavedDataRef.current = null;
      setIsDirty(false);
      setHasUnsavedChanges(false);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load profile');
      setError(error);
      onError?.(error);
    } finally {
      setLoading(false);
    }
  }, [onError]);

  // Update profile
  const updateProfile = useCallback(async (data: ProfileUpdateData) => {
    try {
      setUpdating(true);
      setError(null);

      // Validate data
      const validation = validateProfile(data);
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Update local state
      setProfile(prev => prev ? { ...prev, ...data } : null);
      setIsDirty(true);
      setHasUnsavedChanges(true);

      // Auto-save if enabled
      if (autoSave) {
        if (autoSaveTimeoutRef.current) {
          clearTimeout(autoSaveTimeoutRef.current);
        }
        
        autoSaveTimeoutRef.current = setTimeout(() => {
          saveProfile();
        }, autoSaveDelay);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update profile');
      setError(error);
      onError?.(error);
    } finally {
      setUpdating(false);
    }
  }, [autoSave, autoSaveDelay, onError]);

  // Save profile
  const saveProfile = useCallback(async () => {
    if (!profile || !userId) return;

    try {
      setUpdating(true);
      setError(null);

      const response = await fetch(`/api/profiles/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(profile)
      });

      if (!response.ok) {
        throw new Error(`Failed to save profile: ${response.statusText}`);
      }

      const data = await response.json();
      setProfile(data);
      lastSavedDataRef.current = profile;
      setIsDirty(false);
      setHasUnsavedChanges(false);
      onSave?.(profile);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to save profile');
      setError(error);
      onError?.(error);
    } finally {
      setUpdating(false);
    }
  }, [profile, userId, onSave, onError]);

  // Reset profile
  const resetProfile = useCallback(() => {
    if (lastSavedDataRef.current) {
      setProfile(prev => prev ? { ...prev, ...lastSavedDataRef.current } : null);
      setIsDirty(false);
      setHasUnsavedChanges(false);
    }
  }, []);

  // Validate profile
  const validateProfile = useCallback((data: ProfileUpdateData): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Username validation
    if (data.username !== undefined) {
      if (!data.username || data.username.trim().length === 0) {
        errors.push('Username is required');
      } else if (data.username.length < 3) {
        errors.push('Username must be at least 3 characters long');
      } else if (data.username.length > 30) {
        errors.push('Username must be less than 30 characters');
      } else if (!/^[a-zA-Z0-9_]+$/.test(data.username)) {
        errors.push('Username can only contain letters, numbers, and underscores');
      }
    }

    // Bio validation
    if (data.bio !== undefined && data.bio && data.bio.length > 500) {
      errors.push('Bio must be less than 500 characters');
    }

    // Email validation
    if (data.email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        errors.push('Invalid email format');
      }
    }

    // Phone validation
    if (data.phone !== undefined && data.phone) {
      const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
      if (!phoneRegex.test(data.phone)) {
        errors.push('Invalid phone number format');
      }
    }

    // Website validation
    if (data.website !== undefined && data.website) {
      try {
        new URL(data.website);
      } catch {
        errors.push('Invalid website URL');
      }
    }

    // Social links validation
    if (data.socialLinks) {
      Object.entries(data.socialLinks).forEach(([platform, url]) => {
        if (url) {
          try {
            new URL(url);
          } catch {
            errors.push(`Invalid ${platform} URL`);
          }
        }
      });
    }

    // Interests validation
    if (data.interests !== undefined) {
      if (data.interests.length > 10) {
        errors.push('You can select up to 10 interests');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }, []);

  // Get profile completion
  const getProfileCompletion = useCallback((): number => {
    if (!profile) return 0;

    const fields = [
      profile.username,
      profile.bio,
      profile.avatar,
      profile.university,
      profile.academicYear,
      profile.interests && profile.interests.length > 0,
      profile.location,
      profile.birthDate
    ];

    const completedFields = fields.filter(Boolean).length;
    return Math.round((completedFields / fields.length) * 100);
  }, [profile]);

  // Get profile stats
  const getProfileStats = useCallback((): UserProfile['stats'] => {
    return profile?.stats || {
      posts: 0,
      followers: 0,
      following: 0,
      likes: 0,
      comments: 0
    };
  }, [profile]);

  // Load profile on mount
  useEffect(() => {
    if (userId) {
      loadProfile(userId);
    }
  }, [userId, loadProfile]);

  // Cleanup auto-save timeout
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  return {
    profile,
    loading,
    error,
    updating,
    updateProfile,
    saveProfile,
    resetProfile,
    validateProfile,
    getProfileCompletion,
    getProfileStats,
    isDirty,
    hasUnsavedChanges
  };
};
