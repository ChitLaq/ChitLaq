import { Request, Response, NextFunction } from 'express';
import { PrivacyControls } from '../privacy/privacy-controls';
import { ProfileService } from '../services/ProfileService';
import { CustomError } from '../../../shared/errors/CustomError';

export class PrivacyMiddleware {
  private privacyControls: PrivacyControls;
  private profileService: ProfileService;

  constructor() {
    this.privacyControls = new PrivacyControls();
    this.profileService = new ProfileService();
  }

  /**
   * Check if user can access profile data
   */
  public checkProfileAccess = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const viewerId = req.user?.id;

      if (!viewerId) {
        throw new CustomError('Authentication required', 401);
      }

      // Get the profile being accessed
      const profile = await this.profileService.getProfileByUserId(userId);
      if (!profile) {
        throw new CustomError('Profile not found', 404);
      }

      // Check if viewer is the profile owner
      if (viewerId === userId) {
        // Owner can always access their own profile
        req.profileAccess = {
          canView: true,
          isOwner: true,
          isFriend: false,
          privacyLevel: 'owner'
        };
        return next();
      }

      // Check privacy settings for non-owners
      const canView = await this.checkProfileVisibility(profile, viewerId);
      
      if (!canView) {
        throw new CustomError('Access denied: Profile is not visible to you', 403);
      }

      // Determine access level
      const isFriend = await this.checkFriendship(userId, viewerId);
      const privacyLevel = this.determinePrivacyLevel(profile, isFriend);

      req.profileAccess = {
        canView: true,
        isOwner: false,
        isFriend,
        privacyLevel
      };

      next();
    } catch (error) {
      next(error);
    }
  };

  /**
   * Check if user can view specific profile data
   */
  public checkDataAccess = (dataType: string) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const { userId } = req.params;
        const viewerId = req.user?.id;

        if (!viewerId) {
          throw new CustomError('Authentication required', 401);
        }

        // Get the profile being accessed
        const profile = await this.profileService.getProfileByUserId(userId);
        if (!profile) {
          throw new CustomError('Profile not found', 404);
        }

        // Check if viewer is the profile owner
        if (viewerId === userId) {
          return next(); // Owner can always access their own data
        }

        // Check if viewer can access specific data type
        const canAccess = this.privacyControls.canViewData(
          dataType,
          userId,
          viewerId,
          profile.universityId,
          false // TODO: Check if viewer is friend
        );

        if (!canAccess) {
          throw new CustomError(`Access denied: ${dataType} is not visible to you`, 403);
        }

        next();
      } catch (error) {
        next(error);
      }
    };
  };

  /**
   * Apply privacy filters to profile data
   */
  public applyPrivacyFilters = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const viewerId = req.user?.id;

      // Get the profile being accessed
      const profile = await this.profileService.getProfileByUserId(userId);
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

      // Store filtered profile in request for use in controller
      req.filteredProfile = filteredProfile;

      next();
    } catch (error) {
      next(error);
    }
  };

  /**
   * Check if user can send direct messages
   */
  public checkDirectMessageAccess = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const senderId = req.user?.id;

      if (!senderId) {
        throw new CustomError('Authentication required', 401);
      }

      // Get the profile being messaged
      const profile = await this.profileService.getProfileByUserId(userId);
      if (!profile) {
        throw new CustomError('Profile not found', 404);
      }

      // Check if sender is the profile owner
      if (senderId === userId) {
        return next(); // Can always message yourself
      }

      // Check if profile allows direct messages
      if (!profile.allowDirectMessages) {
        throw new CustomError('This user does not allow direct messages', 403);
      }

      // Check if sender is blocked (TODO: Implement blocking system)
      const isBlocked = await this.checkIfBlocked(userId, senderId);
      if (isBlocked) {
        throw new CustomError('You are blocked from messaging this user', 403);
      }

      next();
    } catch (error) {
      next(error);
    }
  };

  /**
   * Check if user can send friend requests
   */
  public checkFriendRequestAccess = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const requesterId = req.user?.id;

      if (!requesterId) {
        throw new CustomError('Authentication required', 401);
      }

      // Get the profile being requested
      const profile = await this.profileService.getProfileByUserId(userId);
      if (!profile) {
        throw new CustomError('Profile not found', 404);
      }

      // Check if requester is the profile owner
      if (requesterId === userId) {
        throw new CustomError('Cannot send friend request to yourself', 400);
      }

      // Check if profile allows friend requests
      if (!profile.allowFriendRequests) {
        throw new CustomError('This user does not allow friend requests', 403);
      }

      // Check if already friends (TODO: Implement friendship system)
      const isAlreadyFriend = await this.checkFriendship(userId, requesterId);
      if (isAlreadyFriend) {
        throw new CustomError('You are already friends with this user', 400);
      }

      // Check if request already exists (TODO: Implement friend request system)
      const existingRequest = await this.checkExistingFriendRequest(userId, requesterId);
      if (existingRequest) {
        throw new CustomError('Friend request already sent', 400);
      }

      next();
    } catch (error) {
      next(error);
    }
  };

  /**
   * Check if user can view profile statistics
   */
  public checkStatisticsAccess = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const viewerId = req.user?.id;

      if (!viewerId) {
        throw new CustomError('Authentication required', 401);
      }

      // Get the profile being viewed
      const profile = await this.profileService.getProfileByUserId(userId);
      if (!profile) {
        throw new CustomError('Profile not found', 404);
      }

      // Check if viewer is the profile owner
      if (viewerId === userId) {
        return next(); // Owner can always view their own statistics
      }

      // Check if profile allows profile views
      if (!profile.allowProfileViews) {
        throw new CustomError('This user does not allow profile views', 403);
      }

      // Check if viewer can access activity data
      const canAccessActivity = this.privacyControls.canViewData(
        'activity',
        userId,
        viewerId,
        profile.universityId,
        false // TODO: Check if viewer is friend
      );

      if (!canAccessActivity) {
        throw new CustomError('Access denied: Activity data is not visible to you', 403);
      }

      next();
    } catch (error) {
      next(error);
    }
  };

  /**
   * Check if user can view profile recommendations
   */
  public checkRecommendationsAccess = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const viewerId = req.user?.id;

      if (!viewerId) {
        throw new CustomError('Authentication required', 401);
      }

      // Check if viewer is the profile owner
      if (viewerId !== userId) {
        throw new CustomError('Access denied: You can only view your own recommendations', 403);
      }

      next();
    } catch (error) {
      next(error);
    }
  };

  /**
   * Check if user can export profile data
   */
  public checkExportAccess = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const requesterId = req.user?.id;

      if (!requesterId) {
        throw new CustomError('Authentication required', 401);
      }

      // Check if requester is the profile owner
      if (requesterId !== userId) {
        throw new CustomError('Access denied: You can only export your own profile data', 403);
      }

      // Check if profile allows data collection
      const profile = await this.profileService.getProfileByUserId(userId);
      if (!profile) {
        throw new CustomError('Profile not found', 404);
      }

      if (!profile.allowDataCollection) {
        throw new CustomError('Data collection is disabled for this profile', 403);
      }

      next();
    } catch (error) {
      next(error);
    }
  };

  /**
   * Check if user can import profile data
   */
  public checkImportAccess = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const requesterId = req.user?.id;

      if (!requesterId) {
        throw new CustomError('Authentication required', 401);
      }

      // Check if requester is the profile owner
      if (requesterId !== userId) {
        throw new CustomError('Access denied: You can only import data to your own profile', 403);
      }

      next();
    } catch (error) {
      next(error);
    }
  };

  /**
   * Check if user can view audit logs
   */
  public checkAuditLogsAccess = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const viewerId = req.user?.id;

      if (!viewerId) {
        throw new CustomError('Authentication required', 401);
      }

      // Check if viewer is the profile owner
      if (viewerId !== userId) {
        throw new CustomError('Access denied: You can only view your own audit logs', 403);
      }

      next();
    } catch (error) {
      next(error);
    }
  };

  /**
   * Check if user can create data access requests
   */
  public checkDataAccessRequestAccess = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const requesterId = req.user?.id;

      if (!requesterId) {
        throw new CustomError('Authentication required', 401);
      }

      // Check if requester is the profile owner
      if (requesterId === userId) {
        throw new CustomError('Cannot create data access request for your own profile', 400);
      }

      // Check if profile allows data collection
      const profile = await this.profileService.getProfileByUserId(userId);
      if (!profile) {
        throw new CustomError('Profile not found', 404);
      }

      if (!profile.allowDataCollection) {
        throw new CustomError('Data collection is disabled for this profile', 403);
      }

      next();
    } catch (error) {
      next(error);
    }
  };

  /**
   * Check if user can respond to data access requests
   */
  public checkDataAccessResponseAccess = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const responderId = req.user?.id;

      if (!responderId) {
        throw new CustomError('Authentication required', 401);
      }

      // Check if responder is the profile owner
      if (responderId !== userId) {
        throw new CustomError('Access denied: You can only respond to requests for your own profile', 403);
      }

      next();
    } catch (error) {
      next(error);
    }
  };

  // Private helper methods

  private async checkProfileVisibility(profile: any, viewerId: string): Promise<boolean> {
    // Check profile visibility level
    switch (profile.profileVisibility) {
      case 'public':
        return true;
      case 'university':
        // TODO: Check if viewer is from the same university
        return true; // Simplified for now
      case 'friends':
        // TODO: Check if viewer is a friend
        return false; // Simplified for now
      case 'private':
        return false;
      default:
        return false;
    }
  }

  private async checkFriendship(userId1: string, userId2: string): Promise<boolean> {
    // TODO: Implement friendship check
    return false;
  }

  private async checkIfBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    // TODO: Implement blocking check
    return false;
  }

  private async checkExistingFriendRequest(recipientId: string, senderId: string): Promise<boolean> {
    // TODO: Implement friend request check
    return false;
  }

  private determinePrivacyLevel(profile: any, isFriend: boolean): string {
    if (isFriend) {
      return 'friend';
    }

    switch (profile.profileVisibility) {
      case 'public':
        return 'public';
      case 'university':
        return 'university';
      case 'friends':
        return 'friends';
      case 'private':
        return 'private';
      default:
        return 'private';
    }
  }
}

export const privacyMiddleware = new PrivacyMiddleware();
