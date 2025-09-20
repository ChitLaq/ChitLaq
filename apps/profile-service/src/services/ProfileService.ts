import { Op, Transaction } from 'sequelize';
import { UserProfile, IUserProfile, IUserProfileCreation } from '../models/UserProfile';
import { UniversityProfile, IUniversityProfile } from '../models/UniversityProfile';
import { ProfileValidator } from '../validators/profile-validator';
import { PrivacyControls } from '../privacy/privacy-controls';
import { UniversityMapper } from '../utils/university-mapper';
import { AuditLogger } from '../utils/audit-logger';
import { CacheManager } from '../utils/cache-manager';

export interface ProfileSearchFilters {
  universityId?: string;
  major?: string;
  academicYear?: number;
  graduationYear?: number;
  city?: string;
  country?: string;
  isDiscoverable?: boolean;
  completionPercentage?: {
    min?: number;
    max?: number;
  };
  limit?: number;
  offset?: number;
}

export interface ProfileUpdateData {
  username?: string;
  displayName?: string;
  bio?: string;
  profilePicture?: string;
  coverPhoto?: string;
  major?: string;
  minor?: string;
  department?: string;
  faculty?: string;
  academicYear?: number;
  graduationYear?: number;
  studentId?: string;
  email?: string;
  phone?: string;
  website?: string;
  linkedin?: string;
  github?: string;
  twitter?: string;
  campusLocation?: string;
  city?: string;
  country?: string;
  timezone?: string;
  isDiscoverable?: boolean;
  showEmail?: boolean;
  showPhone?: boolean;
  showLocation?: boolean;
  showAcademicInfo?: boolean;
  allowDirectMessages?: boolean;
  allowFriendRequests?: boolean;
}

export class ProfileService {
  private validator: ProfileValidator;
  private privacyControls: PrivacyControls;
  private universityMapper: UniversityMapper;
  private auditLogger: AuditLogger;
  private cacheManager: CacheManager;

  constructor() {
    this.validator = new ProfileValidator();
    this.privacyControls = new PrivacyControls();
    this.universityMapper = new UniversityMapper();
    this.auditLogger = new AuditLogger();
    this.cacheManager = new CacheManager();
  }

  /**
   * Create a new user profile
   */
  async createProfile(
    userId: string,
    profileData: IUserProfileCreation,
    transaction?: Transaction
  ): Promise<IUserProfile> {
    try {
      // Validate profile data
      await this.validator.validateProfileCreation(profileData);

      // Get university information from email
      const university = await this.universityMapper.getUniversityFromEmail(profileData.universityEmail);
      if (!university) {
        throw new Error('University not found for the provided email domain');
      }

      // Generate username if not provided
      if (!profileData.username) {
        profileData.username = await this.generateUniqueUsername(profileData.displayName);
      }

      // Create profile
      const profile = await UserProfile.create(
        {
          ...profileData,
          userId,
          universityId: university.id,
          universityEmail: profileData.universityEmail,
          isDiscoverable: profileData.isDiscoverable ?? true,
          showEmail: profileData.showEmail ?? false,
          showPhone: profileData.showPhone ?? false,
          showLocation: profileData.showLocation ?? true,
          showAcademicInfo: profileData.showAcademicInfo ?? true,
          allowDirectMessages: profileData.allowDirectMessages ?? true,
          allowFriendRequests: profileData.allowFriendRequests ?? true,
          emailVerified: false,
          universityVerified: true, // Verified through university email
          profileVerified: false,
          identityVerified: false,
          postsCount: 0,
          followersCount: 0,
          followingCount: 0,
          likesCount: 0,
          commentsCount: 0,
          completionScore: 0,
          completionPercentage: 0,
          lastUpdated: new Date()
        },
        { transaction }
      );

      // Update completion score
      await profile.updateCompletionScore();

      // Cache the profile
      await this.cacheManager.set(`profile:${profile.id}`, profile.toJSON(), 3600);

      // Log audit event
      await this.auditLogger.logProfileEvent('PROFILE_CREATED', userId, {
        profileId: profile.id,
        username: profile.username,
        universityId: profile.universityId
      });

      return profile.toJSON();
    } catch (error) {
      await this.auditLogger.logProfileEvent('PROFILE_CREATION_FAILED', userId, {
        error: error.message,
        profileData: this.sanitizeProfileData(profileData)
      });
      throw error;
    }
  }

  /**
   * Get user profile by ID
   */
  async getProfile(profileId: string, requesterId?: string): Promise<IUserProfile | null> {
    try {
      // Try to get from cache first
      const cached = await this.cacheManager.get(`profile:${profileId}`);
      if (cached) {
        return cached;
      }

      // Get from database
      const profile = await UserProfile.findByPk(profileId, {
        include: [
          {
            model: UniversityProfile,
            as: 'university',
            attributes: ['id', 'name', 'domain', 'country', 'type', 'isVerified']
          }
        ]
      });

      if (!profile) {
        return null;
      }

      // Apply privacy controls
      const profileData = requesterId === profile.userId 
        ? profile.toJSON() 
        : profile.getPublicProfile();

      // Cache the result
      await this.cacheManager.set(`profile:${profileId}`, profileData, 3600);

      return profileData;
    } catch (error) {
      await this.auditLogger.logProfileEvent('PROFILE_ACCESS_FAILED', requesterId || 'anonymous', {
        profileId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get user profile by user ID
   */
  async getProfileByUserId(userId: string, requesterId?: string): Promise<IUserProfile | null> {
    try {
      const profile = await UserProfile.findOne({
        where: { userId },
        include: [
          {
            model: UniversityProfile,
            as: 'university',
            attributes: ['id', 'name', 'domain', 'country', 'type', 'isVerified']
          }
        ]
      });

      if (!profile) {
        return null;
      }

      // Apply privacy controls
      const profileData = requesterId === userId 
        ? profile.toJSON() 
        : profile.getPublicProfile();

      return profileData;
    } catch (error) {
      await this.auditLogger.logProfileEvent('PROFILE_ACCESS_FAILED', requesterId || 'anonymous', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(
    profileId: string,
    updateData: ProfileUpdateData,
    requesterId: string,
    transaction?: Transaction
  ): Promise<IUserProfile> {
    try {
      // Validate update data
      await this.validator.validateProfileUpdate(updateData);

      // Get existing profile
      const profile = await UserProfile.findByPk(profileId, { transaction });
      if (!profile) {
        throw new Error('Profile not found');
      }

      // Check permissions
      if (profile.userId !== requesterId) {
        throw new Error('Unauthorized to update this profile');
      }

      // Check username uniqueness if being updated
      if (updateData.username && updateData.username !== profile.username) {
        const existingProfile = await UserProfile.findOne({
          where: { username: updateData.username },
          transaction
        });
        if (existingProfile) {
          throw new Error('Username already taken');
        }
      }

      // Update profile
      await profile.update(updateData, { transaction });

      // Update completion score
      await profile.updateCompletionScore();

      // Invalidate cache
      await this.cacheManager.delete(`profile:${profileId}`);

      // Log audit event
      await this.auditLogger.logProfileEvent('PROFILE_UPDATED', requesterId, {
        profileId,
        updatedFields: Object.keys(updateData),
        newCompletionPercentage: profile.completionPercentage
      });

      return profile.toJSON();
    } catch (error) {
      await this.auditLogger.logProfileEvent('PROFILE_UPDATE_FAILED', requesterId, {
        profileId,
        error: error.message,
        updateData: this.sanitizeProfileData(updateData)
      });
      throw error;
    }
  }

  /**
   * Delete user profile
   */
  async deleteProfile(profileId: string, requesterId: string, transaction?: Transaction): Promise<void> {
    try {
      const profile = await UserProfile.findByPk(profileId, { transaction });
      if (!profile) {
        throw new Error('Profile not found');
      }

      // Check permissions
      if (profile.userId !== requesterId) {
        throw new Error('Unauthorized to delete this profile');
      }

      // Soft delete profile
      await profile.destroy({ transaction });

      // Invalidate cache
      await this.cacheManager.delete(`profile:${profileId}`);

      // Log audit event
      await this.auditLogger.logProfileEvent('PROFILE_DELETED', requesterId, {
        profileId,
        username: profile.username
      });
    } catch (error) {
      await this.auditLogger.logProfileEvent('PROFILE_DELETION_FAILED', requesterId, {
        profileId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Search profiles with filters
   */
  async searchProfiles(filters: ProfileSearchFilters, requesterId?: string): Promise<{
    profiles: IUserProfile[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const whereClause: any = {};

      // Apply filters
      if (filters.universityId) {
        whereClause.universityId = filters.universityId;
      }

      if (filters.major) {
        whereClause.major = {
          [Op.iLike]: `%${filters.major}%`
        };
      }

      if (filters.academicYear) {
        whereClause.academicYear = filters.academicYear;
      }

      if (filters.graduationYear) {
        whereClause.graduationYear = filters.graduationYear;
      }

      if (filters.city) {
        whereClause.city = {
          [Op.iLike]: `%${filters.city}%`
        };
      }

      if (filters.country) {
        whereClause.country = filters.country;
      }

      if (filters.isDiscoverable !== undefined) {
        whereClause.isDiscoverable = filters.isDiscoverable;
      }

      if (filters.completionPercentage) {
        whereClause.completionPercentage = {};
        if (filters.completionPercentage.min !== undefined) {
          whereClause.completionPercentage[Op.gte] = filters.completionPercentage.min;
        }
        if (filters.completionPercentage.max !== undefined) {
          whereClause.completionPercentage[Op.lte] = filters.completionPercentage.max;
        }
      }

      // Exclude requester's own profile
      if (requesterId) {
        whereClause.userId = {
          [Op.ne]: requesterId
        };
      }

      const limit = filters.limit || 20;
      const offset = filters.offset || 0;

      // Get profiles
      const { rows: profiles, count: total } = await UserProfile.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: UniversityProfile,
            as: 'university',
            attributes: ['id', 'name', 'domain', 'country', 'type']
          }
        ],
        limit,
        offset,
        order: [['completionPercentage', 'DESC'], ['createdAt', 'DESC']]
      });

      // Apply privacy controls
      const publicProfiles = profiles.map(profile => 
        profile.getPublicProfile()
      );

      // Log audit event
      await this.auditLogger.logProfileEvent('PROFILE_SEARCH', requesterId || 'anonymous', {
        filters,
        resultCount: publicProfiles.length,
        total
      });

      return {
        profiles: publicProfiles,
        total,
        hasMore: offset + limit < total
      };
    } catch (error) {
      await this.auditLogger.logProfileEvent('PROFILE_SEARCH_FAILED', requesterId || 'anonymous', {
        filters,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get profiles by university
   */
  async getProfilesByUniversity(
    universityId: string,
    options: { limit?: number; offset?: number; academicYear?: number } = {},
    requesterId?: string
  ): Promise<{
    profiles: IUserProfile[];
    total: number;
    hasMore: boolean;
  }> {
    const filters: ProfileSearchFilters = {
      universityId,
      academicYear: options.academicYear,
      limit: options.limit,
      offset: options.offset
    };

    return this.searchProfiles(filters, requesterId);
  }

  /**
   * Get profile statistics
   */
  async getProfileStatistics(profileId: string, requesterId: string): Promise<{
    views: number;
    connections: number;
    posts: number;
    followers: number;
    following: number;
    likes: number;
    comments: number;
  }> {
    try {
      const profile = await UserProfile.findByPk(profileId);
      if (!profile) {
        throw new Error('Profile not found');
      }

      // Check permissions
      if (profile.userId !== requesterId) {
        throw new Error('Unauthorized to view statistics');
      }

      // Get additional statistics from other services
      const views = await this.getProfileViews(profileId);
      const connections = await this.getConnectionCount(profileId);

      return {
        views,
        connections,
        posts: profile.postsCount,
        followers: profile.followersCount,
        following: profile.followingCount,
        likes: profile.likesCount,
        comments: profile.commentsCount
      };
    } catch (error) {
      await this.auditLogger.logProfileEvent('STATISTICS_ACCESS_FAILED', requesterId, {
        profileId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Update profile statistics
   */
  async updateProfileStatistics(
    profileId: string,
    stats: {
      postsCount?: number;
      followersCount?: number;
      followingCount?: number;
      likesCount?: number;
      commentsCount?: number;
    },
    transaction?: Transaction
  ): Promise<void> {
    try {
      const profile = await UserProfile.findByPk(profileId, { transaction });
      if (!profile) {
        throw new Error('Profile not found');
      }

      await profile.update(stats, { transaction });

      // Invalidate cache
      await this.cacheManager.delete(`profile:${profileId}`);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Verify profile
   */
  async verifyProfile(profileId: string, verificationType: 'email' | 'university' | 'profile' | 'identity'): Promise<void> {
    try {
      const profile = await UserProfile.findByPk(profileId);
      if (!profile) {
        throw new Error('Profile not found');
      }

      const updateData: any = {};
      updateData[`${verificationType}Verified`] = true;

      await profile.update(updateData);

      // Invalidate cache
      await this.cacheManager.delete(`profile:${profileId}`);

      // Log audit event
      await this.auditLogger.logProfileEvent('PROFILE_VERIFIED', profile.userId, {
        profileId,
        verificationType
      });
    } catch (error) {
      await this.auditLogger.logProfileEvent('PROFILE_VERIFICATION_FAILED', 'system', {
        profileId,
        verificationType,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Generate unique username
   */
  private async generateUniqueUsername(displayName: string): Promise<string> {
    const baseUsername = displayName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 20);

    let username = baseUsername;
    let counter = 1;

    while (true) {
      const existing = await UserProfile.findOne({
        where: { username }
      });

      if (!existing) {
        return username;
      }

      username = `${baseUsername}${counter}`;
      counter++;
    }
  }

  /**
   * Get profile views (placeholder - implement with analytics service)
   */
  private async getProfileViews(profileId: string): Promise<number> {
    // TODO: Implement with analytics service
    return 0;
  }

  /**
   * Get connection count (placeholder - implement with social service)
   */
  private async getConnectionCount(profileId: string): Promise<number> {
    // TODO: Implement with social service
    return 0;
  }

  /**
   * Sanitize profile data for logging
   */
  private sanitizeProfileData(data: any): any {
    const sanitized = { ...data };
    delete sanitized.password;
    delete sanitized.passwordHash;
    return sanitized;
  }
}
