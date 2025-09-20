import { IUserProfileCreation, ProfileUpdateData } from '../models/UserProfile';

export interface PrivacySettings {
  showEmail: boolean;
  showPhone: boolean;
  showLocation: boolean;
  showAcademicInfo: boolean;
  showSocialLinks: boolean;
  showProfilePicture: boolean;
  showCoverPhoto: boolean;
  allowDirectMessages: boolean;
  allowFriendRequests: boolean;
  allowProfileViews: boolean;
  showOnlineStatus: boolean;
  showLastSeen: boolean;
  showActivityStatus: boolean;
  allowSearchEngines: boolean;
  allowDataCollection: boolean;
  allowAnalytics: boolean;
  allowMarketing: boolean;
  allowThirdPartySharing: boolean;
  dataRetentionPeriod: number; // in days
  profileVisibility: 'public' | 'university' | 'friends' | 'private';
  contactVisibility: 'public' | 'university' | 'friends' | 'private';
  academicVisibility: 'public' | 'university' | 'friends' | 'private';
  socialVisibility: 'public' | 'university' | 'friends' | 'private';
  locationVisibility: 'public' | 'university' | 'friends' | 'private';
  activityVisibility: 'public' | 'university' | 'friends' | 'private';
}

export interface PrivacyLevel {
  level: 'public' | 'university' | 'friends' | 'private';
  description: string;
  restrictions: string[];
}

export interface DataAccessRequest {
  requesterId: string;
  requestedData: string[];
  purpose: string;
  status: 'pending' | 'approved' | 'denied' | 'expired';
  requestedAt: Date;
  respondedAt?: Date;
  expiresAt: Date;
}

export interface PrivacyAuditLog {
  id: string;
  userId: string;
  action: string;
  dataAccessed: string[];
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  reason: string;
}

export class PrivacyControls {
  private readonly DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
    showEmail: false,
    showPhone: false,
    showLocation: true,
    showAcademicInfo: true,
    showSocialLinks: true,
    showProfilePicture: true,
    showCoverPhoto: true,
    allowDirectMessages: true,
    allowFriendRequests: true,
    allowProfileViews: true,
    showOnlineStatus: true,
    showLastSeen: true,
    showActivityStatus: true,
    allowSearchEngines: false,
    allowDataCollection: true,
    allowAnalytics: true,
    allowMarketing: false,
    allowThirdPartySharing: false,
    dataRetentionPeriod: 365,
    profileVisibility: 'university',
    contactVisibility: 'university',
    academicVisibility: 'university',
    socialVisibility: 'university',
    locationVisibility: 'university',
    activityVisibility: 'university'
  };

  private readonly PRIVACY_LEVELS: PrivacyLevel[] = [
    {
      level: 'public',
      description: 'Visible to everyone',
      restrictions: []
    },
    {
      level: 'university',
      description: 'Visible to university members only',
      restrictions: ['Requires university email verification']
    },
    {
      level: 'friends',
      description: 'Visible to friends only',
      restrictions: ['Requires friend connection']
    },
    {
      level: 'private',
      description: 'Visible to you only',
      restrictions: ['Not visible to others']
    }
  ];

  /**
   * Get default privacy settings
   */
  getDefaultPrivacySettings(): PrivacySettings {
    return { ...this.DEFAULT_PRIVACY_SETTINGS };
  }

  /**
   * Get privacy levels
   */
  getPrivacyLevels(): PrivacyLevel[] {
    return [...this.PRIVACY_LEVELS];
  }

  /**
   * Apply privacy controls to profile data
   */
  applyPrivacyControls(
    profileData: IUserProfileCreation | ProfileUpdateData,
    viewerId?: string,
    viewerUniversityId?: string,
    isFriend?: boolean
  ): IUserProfileCreation | ProfileUpdateData {
    const privacySettings = this.getDefaultPrivacySettings();
    const filteredData = { ...profileData };

    // Apply email privacy
    if (!privacySettings.showEmail) {
      delete filteredData.email;
    }

    // Apply phone privacy
    if (!privacySettings.showPhone) {
      delete filteredData.phone;
    }

    // Apply location privacy
    if (!privacySettings.showLocation) {
      delete filteredData.city;
      delete filteredData.country;
      delete filteredData.timezone;
    }

    // Apply academic info privacy
    if (!privacySettings.showAcademicInfo) {
      delete filteredData.major;
      delete filteredData.minor;
      delete filteredData.department;
      delete filteredData.faculty;
      delete filteredData.academicYear;
      delete filteredData.graduationYear;
      delete filteredData.studentId;
    }

    // Apply social links privacy
    if (!privacySettings.showSocialLinks) {
      delete filteredData.linkedin;
      delete filteredData.github;
      delete filteredData.twitter;
      delete filteredData.website;
    }

    // Apply profile picture privacy
    if (!privacySettings.showProfilePicture) {
      delete filteredData.profilePicture;
    }

    // Apply cover photo privacy
    if (!privacySettings.showCoverPhoto) {
      delete filteredData.coverPhoto;
    }

    // Apply university-specific privacy
    if (viewerUniversityId && profileData.universityId !== viewerUniversityId) {
      // Hide university-specific information from other universities
      delete filteredData.studentId;
      delete filteredData.academicYear;
      delete filteredData.graduationYear;
    }

    // Apply friend-specific privacy
    if (!isFriend) {
      // Hide additional information from non-friends
      delete filteredData.phone;
      delete filteredData.email;
    }

    return filteredData;
  }

  /**
   * Check if user can view specific data
   */
  canViewData(
    dataType: string,
    ownerId: string,
    viewerId?: string,
    viewerUniversityId?: string,
    isFriend?: boolean
  ): boolean {
    const privacySettings = this.getDefaultPrivacySettings();

    switch (dataType) {
      case 'email':
        return privacySettings.showEmail && (isFriend || viewerId === ownerId);
      case 'phone':
        return privacySettings.showPhone && (isFriend || viewerId === ownerId);
      case 'location':
        return privacySettings.showLocation;
      case 'academic':
        return privacySettings.showAcademicInfo;
      case 'social':
        return privacySettings.showSocialLinks;
      case 'profilePicture':
        return privacySettings.showProfilePicture;
      case 'coverPhoto':
        return privacySettings.showCoverPhoto;
      default:
        return true;
    }
  }

  /**
   * Get data access permissions
   */
  getDataAccessPermissions(
    ownerId: string,
    viewerId?: string,
    viewerUniversityId?: string,
    isFriend?: boolean
  ): Record<string, boolean> {
    return {
      email: this.canViewData('email', ownerId, viewerId, viewerUniversityId, isFriend),
      phone: this.canViewData('phone', ownerId, viewerId, viewerUniversityId, isFriend),
      location: this.canViewData('location', ownerId, viewerId, viewerUniversityId, isFriend),
      academic: this.canViewData('academic', ownerId, viewerId, viewerUniversityId, isFriend),
      social: this.canViewData('social', ownerId, viewerId, viewerUniversityId, isFriend),
      profilePicture: this.canViewData('profilePicture', ownerId, viewerId, viewerUniversityId, isFriend),
      coverPhoto: this.canViewData('coverPhoto', ownerId, viewerId, viewerUniversityId, isFriend)
    };
  }

  /**
   * Validate privacy settings
   */
  validatePrivacySettings(settings: Partial<PrivacySettings>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate boolean fields
    const booleanFields = [
      'showEmail', 'showPhone', 'showLocation', 'showAcademicInfo', 'showSocialLinks',
      'showProfilePicture', 'showCoverPhoto', 'allowDirectMessages', 'allowFriendRequests',
      'allowProfileViews', 'showOnlineStatus', 'showLastSeen', 'showActivityStatus',
      'allowSearchEngines', 'allowDataCollection', 'allowAnalytics', 'allowMarketing',
      'allowThirdPartySharing'
    ];

    for (const field of booleanFields) {
      if (settings[field as keyof PrivacySettings] !== undefined && 
          typeof settings[field as keyof PrivacySettings] !== 'boolean') {
        errors.push(`${field} must be a boolean value`);
      }
    }

    // Validate visibility fields
    const visibilityFields = [
      'profileVisibility', 'contactVisibility', 'academicVisibility',
      'socialVisibility', 'locationVisibility', 'activityVisibility'
    ];

    const validVisibilityLevels = ['public', 'university', 'friends', 'private'];

    for (const field of visibilityFields) {
      if (settings[field as keyof PrivacySettings] !== undefined && 
          !validVisibilityLevels.includes(settings[field as keyof PrivacySettings] as string)) {
        errors.push(`${field} must be one of: ${validVisibilityLevels.join(', ')}`);
      }
    }

    // Validate data retention period
    if (settings.dataRetentionPeriod !== undefined) {
      if (typeof settings.dataRetentionPeriod !== 'number' || 
          settings.dataRetentionPeriod < 30 || 
          settings.dataRetentionPeriod > 3650) {
        errors.push('Data retention period must be between 30 and 3650 days');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Create data access request
   */
  createDataAccessRequest(
    requesterId: string,
    requestedData: string[],
    purpose: string,
    expiresInDays: number = 30
  ): DataAccessRequest {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (expiresInDays * 24 * 60 * 60 * 1000));

    return {
      requesterId,
      requestedData,
      purpose,
      status: 'pending',
      requestedAt: now,
      expiresAt
    };
  }

  /**
   * Process data access request
   */
  processDataAccessRequest(
    request: DataAccessRequest,
    approved: boolean,
    reason?: string
  ): DataAccessRequest {
    const updatedRequest = { ...request };
    updatedRequest.status = approved ? 'approved' : 'denied';
    updatedRequest.respondedAt = new Date();

    if (reason) {
      // Add reason to request (extend interface if needed)
    }

    return updatedRequest;
  }

  /**
   * Log privacy audit event
   */
  logPrivacyAudit(
    userId: string,
    action: string,
    dataAccessed: string[],
    ipAddress: string,
    userAgent: string,
    reason: string
  ): PrivacyAuditLog {
    return {
      id: this.generateId(),
      userId,
      action,
      dataAccessed,
      timestamp: new Date(),
      ipAddress,
      userAgent,
      reason
    };
  }

  /**
   * Get privacy audit logs for user
   */
  getPrivacyAuditLogs(
    userId: string,
    startDate?: Date,
    endDate?: Date,
    action?: string
  ): PrivacyAuditLog[] {
    // TODO: Implement with actual database query
    return [];
  }

  /**
   * Check data retention compliance
   */
  checkDataRetentionCompliance(
    userId: string,
    dataType: string,
    retentionPeriod: number
  ): { isCompliant: boolean; shouldDelete: boolean; lastAccessed?: Date } {
    // TODO: Implement with actual database query
    return {
      isCompliant: true,
      shouldDelete: false
    };
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}
