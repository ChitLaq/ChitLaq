import { Request, Response, NextFunction } from 'express';
import { ProfileService } from '../services/ProfileService';
import { UniversitySync } from '../services/UniversitySync';
import { ProfileCompletionService } from '../utils/profile-completion';
import { PrivacyControls } from '../privacy/privacy-controls';
import { CustomError } from '../../../shared/errors/CustomError';
import { IUserProfileCreation, ProfileUpdateData } from '../models/UserProfile';
import { PrivacySettings } from '../privacy/privacy-controls';
import { DataAccessRequest } from '../privacy/privacy-controls';
import { PrivacyAuditLog } from '../privacy/privacy-controls';

export class ProfileController {
  private profileService: ProfileService;
  private universitySync: UniversitySync;
  private profileCompletionService: ProfileCompletionService;
  private privacyControls: PrivacyControls;

  constructor() {
    this.profileService = new ProfileService();
    this.universitySync = new UniversitySync();
    this.profileCompletionService = new ProfileCompletionService();
    this.privacyControls = new PrivacyControls();
  }

  /**
   * Create a new user profile
   */
  public createProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new CustomError('User ID is required', 400);
      }

      const profileData: IUserProfileCreation = req.body;
      
      // Create the profile
      const profile = await this.profileService.createProfile(userId, profileData);
      
      // Sync with university data
      await this.universitySync.syncUserWithUniversity(profile);
      
      // Calculate initial completion score
      const completionScore = await this.profileCompletionService.calculateCompletionScore(profile);
      await this.profileService.updateProfile(userId, { profileCompletionScore: completionScore });
      
      // Log profile creation
      await this.logProfileActivity(userId, 'profile_created', {
        profileId: profile.userId,
        universityId: profile.universityId,
        completionScore
      });

      res.status(201).json({
        success: true,
        data: profile,
        message: 'Profile created successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get current user's profile
   */
  public getCurrentUserProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new CustomError('User ID is required', 400);
      }

      const profile = await this.profileService.getProfileByUserId(userId);
      
      if (!profile) {
        throw new CustomError('Profile not found', 404);
      }

      // Log profile view
      await this.logProfileActivity(userId, 'profile_viewed', {
        profileId: profile.userId,
        viewerId: userId
      });

      res.status(200).json({
        success: true,
        data: profile,
        message: 'Profile retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get user profile by ID
   */
  public getProfileById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const viewerId = req.user?.id;

      const profile = await this.profileService.getProfileByUserId(userId, viewerId);
      
      if (!profile) {
        throw new CustomError('Profile not found', 404);
      }

      // Apply privacy controls
      const filteredProfile = this.privacyControls.applyPrivacyControls(
        profile,
        viewerId,
        profile.universityId,
        false // TODO: Check if viewer is friend
      );

      // Log profile view
      await this.logProfileActivity(userId, 'profile_viewed', {
        profileId: userId,
        viewerId: viewerId
      });

      res.status(200).json({
        success: true,
        data: filteredProfile,
        message: 'Profile retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update user profile (full update)
   */
  public updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const updates: ProfileUpdateData = req.body;

      // Update the profile
      const updatedProfile = await this.profileService.updateProfile(userId, updates);
      
      // Sync with university data if university-related fields changed
      if (updates.universityEmail || updates.major || updates.academicYear) {
        await this.universitySync.syncUserWithUniversity(updatedProfile);
      }
      
      // Recalculate completion score
      const completionScore = await this.profileCompletionService.calculateCompletionScore(updatedProfile);
      await this.profileService.updateProfile(userId, { profileCompletionScore: completionScore });
      
      // Log profile update
      await this.logProfileActivity(userId, 'profile_updated', {
        profileId: userId,
        updatedFields: Object.keys(updates),
        completionScore
      });

      res.status(200).json({
        success: true,
        data: updatedProfile,
        message: 'Profile updated successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Partially update user profile
   */
  public patchProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const updates: Partial<ProfileUpdateData> = req.body;

      // Update the profile
      const updatedProfile = await this.profileService.updateProfile(userId, updates);
      
      // Sync with university data if university-related fields changed
      if (updates.universityEmail || updates.major || updates.academicYear) {
        await this.universitySync.syncUserWithUniversity(updatedProfile);
      }
      
      // Recalculate completion score
      const completionScore = await this.profileCompletionService.calculateCompletionScore(updatedProfile);
      await this.profileService.updateProfile(userId, { profileCompletionScore: completionScore });
      
      // Log profile update
      await this.logProfileActivity(userId, 'profile_patched', {
        profileId: userId,
        updatedFields: Object.keys(updates),
        completionScore
      });

      res.status(200).json({
        success: true,
        data: updatedProfile,
        message: 'Profile updated successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete user profile (soft delete)
   */
  public deleteProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;

      // Soft delete the profile
      await this.profileService.deleteProfile(userId);
      
      // Log profile deletion
      await this.logProfileActivity(userId, 'profile_deleted', {
        profileId: userId
      });

      res.status(200).json({
        success: true,
        message: 'Profile deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Search profiles with filters
   */
  public searchProfiles = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {
        q: query,
        limit = 10,
        offset = 0,
        university,
        major,
        academicYear,
        graduationYear,
        city,
        country,
        sortBy = 'relevance',
        sortOrder = 'desc'
      } = req.query;

      const searchResults = await this.profileService.searchProfiles(
        query as string,
        {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          university: university as string,
          major: major as string,
          academicYear: academicYear ? parseInt(academicYear as string) : undefined,
          graduationYear: graduationYear ? parseInt(graduationYear as string) : undefined,
          city: city as string,
          country: country as string,
          sortBy: sortBy as string,
          sortOrder: sortOrder as string
        }
      );

      // Log search activity
      await this.logProfileActivity(req.user?.id, 'profile_search', {
        query,
        filters: { university, major, academicYear, graduationYear, city, country },
        resultCount: searchResults.length
      });

      res.status(200).json({
        success: true,
        data: searchResults,
        pagination: {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          total: searchResults.length
        },
        message: 'Search completed successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get profile completion status
   */
  public getProfileCompletion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;

      const profile = await this.profileService.getProfileByUserId(userId);
      if (!profile) {
        throw new CustomError('Profile not found', 404);
      }

      const completionData = await this.profileCompletionService.getCompletionDetails(profile);

      res.status(200).json({
        success: true,
        data: completionData,
        message: 'Profile completion data retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update profile completion score
   */
  public updateProfileCompletion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;

      const profile = await this.profileService.getProfileByUserId(userId);
      if (!profile) {
        throw new CustomError('Profile not found', 404);
      }

      const completionScore = await this.profileCompletionService.calculateCompletionScore(profile);
      await this.profileService.updateProfile(userId, { profileCompletionScore: completionScore });

      res.status(200).json({
        success: true,
        data: { profileCompletionScore: completionScore },
        message: 'Profile completion score updated successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get privacy settings
   */
  public getPrivacySettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;

      const profile = await this.profileService.getProfileByUserId(userId);
      if (!profile) {
        throw new CustomError('Profile not found', 404);
      }

      const privacySettings = this.extractPrivacySettings(profile);

      res.status(200).json({
        success: true,
        data: privacySettings,
        message: 'Privacy settings retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update privacy settings
   */
  public updatePrivacySettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const privacySettings: PrivacySettings = req.body;

      // Validate privacy settings
      const validation = this.privacyControls.validatePrivacySettings(privacySettings);
      if (!validation.isValid) {
        throw new CustomError(`Invalid privacy settings: ${validation.errors.join(', ')}`, 400);
      }

      // Update privacy settings
      const updatedProfile = await this.profileService.updateProfile(userId, privacySettings);
      
      // Log privacy settings update
      await this.logProfileActivity(userId, 'privacy_settings_updated', {
        profileId: userId,
        updatedSettings: Object.keys(privacySettings)
      });

      res.status(200).json({
        success: true,
        data: this.extractPrivacySettings(updatedProfile),
        message: 'Privacy settings updated successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get profile activity logs
   */
  public getProfileActivity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const {
        startDate,
        endDate,
        action,
        limit = 50,
        offset = 0
      } = req.query;

      const activityLogs = await this.getProfileActivityLogs(userId, {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        action: action as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });

      res.status(200).json({
        success: true,
        data: activityLogs,
        pagination: {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          total: activityLogs.length
        },
        message: 'Profile activity retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get profile statistics
   */
  public getProfileStatistics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;

      const statistics = await this.getProfileStatisticsData(userId);

      res.status(200).json({
        success: true,
        data: statistics,
        message: 'Profile statistics retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Verify user profile (admin only)
   */
  public verifyProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const { isVerified, reason } = req.body;

      const updatedProfile = await this.profileService.verifyProfile(userId, isVerified);
      
      // Log profile verification
      await this.logProfileActivity(userId, 'profile_verified', {
        profileId: userId,
        isVerified,
        reason,
        verifiedBy: req.user?.id
      });

      res.status(200).json({
        success: true,
        data: updatedProfile,
        message: `Profile ${isVerified ? 'verified' : 'unverified'} successfully`
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Upload profile picture
   */
  public uploadProfilePicture = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const imageFile = req.file;

      if (!imageFile) {
        throw new CustomError('No image file provided', 400);
      }

      // TODO: Implement image upload logic
      const imageUrl = await this.uploadImage(imageFile, 'profile-pictures');
      
      // Update profile with new picture URL
      const updatedProfile = await this.profileService.updateProfile(userId, {
        profilePicture: imageUrl
      });
      
      // Log profile picture upload
      await this.logProfileActivity(userId, 'profile_picture_uploaded', {
        profileId: userId,
        imageUrl
      });

      res.status(200).json({
        success: true,
        data: { profilePicture: imageUrl },
        message: 'Profile picture uploaded successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Upload cover photo
   */
  public uploadCoverPhoto = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const imageFile = req.file;

      if (!imageFile) {
        throw new CustomError('No image file provided', 400);
      }

      // TODO: Implement image upload logic
      const imageUrl = await this.uploadImage(imageFile, 'cover-photos');
      
      // Update profile with new cover photo URL
      const updatedProfile = await this.profileService.updateProfile(userId, {
        coverPhoto: imageUrl
      });
      
      // Log cover photo upload
      await this.logProfileActivity(userId, 'cover_photo_uploaded', {
        profileId: userId,
        imageUrl
      });

      res.status(200).json({
        success: true,
        data: { coverPhoto: imageUrl },
        message: 'Cover photo uploaded successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete profile picture
   */
  public deleteProfilePicture = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;

      // Update profile to remove picture
      await this.profileService.updateProfile(userId, {
        profilePicture: null
      });
      
      // Log profile picture deletion
      await this.logProfileActivity(userId, 'profile_picture_deleted', {
        profileId: userId
      });

      res.status(200).json({
        success: true,
        message: 'Profile picture deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete cover photo
   */
  public deleteCoverPhoto = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;

      // Update profile to remove cover photo
      await this.profileService.updateProfile(userId, {
        coverPhoto: null
      });
      
      // Log cover photo deletion
      await this.logProfileActivity(userId, 'cover_photo_deleted', {
        profileId: userId
      });

      res.status(200).json({
        success: true,
        message: 'Cover photo deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get profile recommendations
   */
  public getProfileRecommendations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const {
        type = 'all',
        limit = 10,
        offset = 0
      } = req.query;

      const recommendations = await this.getProfileRecommendationsData(userId, {
        type: type as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });

      res.status(200).json({
        success: true,
        data: recommendations,
        pagination: {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          total: recommendations.length
        },
        message: 'Profile recommendations retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Batch update multiple profiles (admin only)
   */
  public batchUpdateProfiles = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { updates } = req.body;

      const results = await this.batchUpdateProfilesData(updates);

      res.status(200).json({
        success: true,
        data: results,
        message: 'Batch update completed successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Export profile data
   */
  public exportProfileData = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const { format = 'json' } = req.query;

      const profileData = await this.exportProfileDataData(userId, format as string);

      res.status(200).json({
        success: true,
        data: profileData,
        message: 'Profile data exported successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Import profile data
   */
  public importProfileData = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const importData = req.body;

      const result = await this.importProfileDataData(userId, importData);
      
      // Log profile data import
      await this.logProfileActivity(userId, 'profile_data_imported', {
        profileId: userId,
        importedFields: Object.keys(importData)
      });

      res.status(200).json({
        success: true,
        data: result,
        message: 'Profile data imported successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get audit logs
   */
  public getAuditLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const {
        startDate,
        endDate,
        action,
        limit = 50,
        offset = 0
      } = req.query;

      const auditLogs = await this.privacyControls.getPrivacyAuditLogs(userId, {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        action: action as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });

      res.status(200).json({
        success: true,
        data: auditLogs,
        pagination: {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          total: auditLogs.length
        },
        message: 'Audit logs retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Create data access request
   */
  public createDataAccessRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const { requestedData, purpose, expiresInDays = 30 } = req.body;
      const requesterId = req.user?.id;

      const request = this.privacyControls.createDataAccessRequest(
        requesterId,
        requestedData,
        purpose,
        expiresInDays
      );

      // TODO: Save request to database
      // await this.saveDataAccessRequest(request);

      res.status(201).json({
        success: true,
        data: request,
        message: 'Data access request created successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get data access requests
   */
  public getDataAccessRequests = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;

      // TODO: Implement get data access requests
      const requests = await this.getDataAccessRequestsData(userId);

      res.status(200).json({
        success: true,
        data: requests,
        message: 'Data access requests retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Respond to data access request
   */
  public respondToDataAccessRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, requestId } = req.params;
      const { approved, reason } = req.body;

      // TODO: Implement respond to data access request
      const updatedRequest = await this.respondToDataAccessRequestData(requestId, approved, reason);

      res.status(200).json({
        success: true,
        data: updatedRequest,
        message: 'Data access request response recorded successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get service metrics
   */
  public getServiceMetrics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const metrics = await this.getServiceMetricsData();

      res.status(200).json({
        success: true,
        data: metrics,
        message: 'Service metrics retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  // Private helper methods

  private extractPrivacySettings(profile: any): PrivacySettings {
    return {
      showEmail: profile.showEmail || false,
      showPhone: profile.showPhone || false,
      showLocation: profile.showLocation || true,
      showAcademicInfo: profile.showAcademicInfo || true,
      showSocialLinks: profile.showSocialLinks || true,
      showProfilePicture: profile.showProfilePicture || true,
      showCoverPhoto: profile.showCoverPhoto || true,
      allowDirectMessages: profile.allowDirectMessages || true,
      allowFriendRequests: profile.allowFriendRequests || true,
      allowProfileViews: profile.allowProfileViews || true,
      showOnlineStatus: profile.showOnlineStatus || true,
      showLastSeen: profile.showLastSeen || true,
      showActivityStatus: profile.showActivityStatus || true,
      allowSearchEngines: profile.allowSearchEngines || false,
      allowDataCollection: profile.allowDataCollection || true,
      allowAnalytics: profile.allowAnalytics || true,
      allowMarketing: profile.allowMarketing || false,
      allowThirdPartySharing: profile.allowThirdPartySharing || false,
      dataRetentionPeriod: profile.dataRetentionPeriod || 365,
      profileVisibility: profile.profileVisibility || 'university',
      contactVisibility: profile.contactVisibility || 'university',
      academicVisibility: profile.academicVisibility || 'university',
      socialVisibility: profile.socialVisibility || 'university',
      locationVisibility: profile.locationVisibility || 'university',
      activityVisibility: profile.activityVisibility || 'university'
    };
  }

  private async logProfileActivity(userId: string, action: string, metadata: any): Promise<void> {
    // TODO: Implement profile activity logging
    console.log(`Profile activity: ${action} for user ${userId}`, metadata);
  }

  private async getProfileActivityLogs(userId: string, options: any): Promise<any[]> {
    // TODO: Implement get profile activity logs
    return [];
  }

  private async getProfileStatisticsData(userId: string): Promise<any> {
    // TODO: Implement get profile statistics
    return {
      profileViews: 0,
      searchAppearances: 0,
      lastActive: new Date(),
      completionScore: 0
    };
  }

  private async uploadImage(imageFile: any, folder: string): Promise<string> {
    // TODO: Implement image upload logic
    return `https://example.com/${folder}/${imageFile.filename}`;
  }

  private async getProfileRecommendationsData(userId: string, options: any): Promise<any[]> {
    // TODO: Implement profile recommendations
    return [];
  }

  private async batchUpdateProfilesData(updates: any[]): Promise<any> {
    // TODO: Implement batch update
    return { successful: [], failed: [] };
  }

  private async exportProfileDataData(userId: string, format: string): Promise<any> {
    // TODO: Implement profile data export
    return {};
  }

  private async importProfileDataData(userId: string, data: any): Promise<any> {
    // TODO: Implement profile data import
    return {};
  }

  private async getDataAccessRequestsData(userId: string): Promise<any[]> {
    // TODO: Implement get data access requests
    return [];
  }

  private async respondToDataAccessRequestData(requestId: string, approved: boolean, reason?: string): Promise<any> {
    // TODO: Implement respond to data access request
    return {};
  }

  private async getServiceMetricsData(): Promise<any> {
    // TODO: Implement service metrics
    return {
      totalProfiles: 0,
      activeProfiles: 0,
      averageCompletionScore: 0,
      requestsPerMinute: 0
    };
  }
}
