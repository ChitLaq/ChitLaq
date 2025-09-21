import { Request, Response, NextFunction } from 'express';
import { ProfileValidator } from '../validators/profile-validator';
import { ProfileService } from '../services/ProfileService';
import { CustomError } from '../../../shared/errors/CustomError';
import { IUserProfileCreation, ProfileUpdateData } from '../models/UserProfile';

export class ProfileValidationMiddleware {
  private profileValidator: ProfileValidator;
  private profileService: ProfileService;

  constructor() {
    this.profileValidator = new ProfileValidator();
    this.profileService = new ProfileService();
  }

  /**
   * Validate profile creation data
   */
  public validateProfileCreation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const profileData: IUserProfileCreation = req.body;
      const userId = req.user?.id;

      if (!userId) {
        throw new CustomError('User ID is required', 400);
      }

      // Validate profile data
      const validation = await this.profileValidator.validateProfileCreation(profileData, {
        strictMode: true,
        validateUniversity: true,
        validateUniqueness: true
      });

      if (!validation.isValid) {
        throw new CustomError(`Validation failed: ${validation.errors.join(', ')}`, 400);
      }

      // Add warnings to response if any
      if (validation.warnings.length > 0) {
        res.locals.validationWarnings = validation.warnings;
      }

      next();
    } catch (error) {
      next(error);
    }
  };

  /**
   * Validate profile update data
   */
  public validateProfileUpdate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const updates: ProfileUpdateData = req.body;
      const userId = req.params.userId;

      if (!userId) {
        throw new CustomError('User ID is required', 400);
      }

      // Validate update data
      const validation = await this.profileValidator.validateProfileUpdate(updates, {
        strictMode: false,
        validateUniversity: true,
        validateUniqueness: true
      });

      if (!validation.isValid) {
        throw new CustomError(`Validation failed: ${validation.errors.join(', ')}`, 400);
      }

      // Add warnings to response if any
      if (validation.warnings.length > 0) {
        res.locals.validationWarnings = validation.warnings;
      }

      next();
    } catch (error) {
      next(error);
    }
  };

  /**
   * Validate profile ownership
   */
  public validateProfileOwnership = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const currentUserId = req.user?.id;

      if (!currentUserId) {
        throw new CustomError('User ID is required', 400);
      }

      if (userId !== currentUserId) {
        throw new CustomError('Access denied: You can only access your own profile', 403);
      }

      // Check if profile exists
      const profile = await this.profileService.getProfileByUserId(userId);
      if (!profile) {
        throw new CustomError('Profile not found', 404);
      }

      next();
    } catch (error) {
      next(error);
    }
  };

  /**
   * Validate admin access
   */
  public validateAdminAccess = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user;

      if (!user) {
        throw new CustomError('User authentication required', 401);
      }

      // Check if user has admin role
      if (!user.roles || !user.roles.includes('admin')) {
        throw new CustomError('Admin access required', 403);
      }

      next();
    } catch (error) {
      next(error);
    }
  };

  /**
   * Validate username uniqueness
   */
  public validateUsernameUniqueness = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { username } = req.body;
      const currentUserId = req.user?.id;

      if (!username) {
        return next(); // Username is optional in updates
      }

      // Check if username is already taken by another user
      const existingProfile = await this.profileService.getProfileByUsername(username);
      if (existingProfile && existingProfile.userId !== currentUserId) {
        throw new CustomError('Username is already taken', 409);
      }

      next();
    } catch (error) {
      next(error);
    }
  };

  /**
   * Validate email uniqueness
   */
  public validateEmailUniqueness = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, universityEmail } = req.body;
      const currentUserId = req.user?.id;

      // Check primary email uniqueness
      if (email) {
        const existingProfile = await this.profileService.getProfileByEmail(email);
        if (existingProfile && existingProfile.userId !== currentUserId) {
          throw new CustomError('Email is already in use', 409);
        }
      }

      // Check university email uniqueness
      if (universityEmail) {
        const existingProfile = await this.profileService.getProfileByUniversityEmail(universityEmail);
        if (existingProfile && existingProfile.userId !== currentUserId) {
          throw new CustomError('University email is already in use', 409);
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };

  /**
   * Validate student ID uniqueness within university
   */
  public validateStudentIdUniqueness = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { studentId, universityId } = req.body;
      const currentUserId = req.user?.id;

      if (!studentId || !universityId) {
        return next(); // Student ID is optional
      }

      // Check if student ID is already taken within the same university
      const existingProfile = await this.profileService.getProfileByStudentId(studentId, universityId);
      if (existingProfile && existingProfile.userId !== currentUserId) {
        throw new CustomError('Student ID is already in use at this university', 409);
      }

      next();
    } catch (error) {
      next(error);
    }
  };

  /**
   * Validate profile picture requirements
   */
  public validateProfilePicture = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const imageFile = req.file;

      if (!imageFile) {
        throw new CustomError('No image file provided', 400);
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(imageFile.mimetype)) {
        throw new CustomError('Invalid file type. Only JPEG, PNG, and WebP images are allowed', 400);
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (imageFile.size > maxSize) {
        throw new CustomError('File size too large. Maximum size is 5MB', 400);
      }

      // Validate image dimensions (optional)
      // TODO: Add image dimension validation if needed

      next();
    } catch (error) {
      next(error);
    }
  };

  /**
   * Validate cover photo requirements
   */
  public validateCoverPhoto = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const imageFile = req.file;

      if (!imageFile) {
        throw new CustomError('No image file provided', 400);
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(imageFile.mimetype)) {
        throw new CustomError('Invalid file type. Only JPEG, PNG, and WebP images are allowed', 400);
      }

      // Validate file size (max 10MB for cover photos)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (imageFile.size > maxSize) {
        throw new CustomError('File size too large. Maximum size is 10MB', 400);
      }

      // Validate image dimensions (optional)
      // TODO: Add image dimension validation if needed

      next();
    } catch (error) {
      next(error);
    }
  };

  /**
   * Validate bio content
   */
  public validateBioContent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { bio } = req.body;

      if (!bio) {
        return next(); // Bio is optional
      }

      // Check bio length
      if (bio.length > 500) {
        throw new CustomError('Bio must be no more than 500 characters long', 400);
      }

      // Check for offensive content
      if (this.containsOffensiveContent(bio)) {
        throw new CustomError('Bio contains inappropriate content', 400);
      }

      // Check for spam patterns
      if (this.containsSpamPatterns(bio)) {
        throw new CustomError('Bio contains spam-like content', 400);
      }

      next();
    } catch (error) {
      next(error);
    }
  };

  /**
   * Validate academic information
   */
  public validateAcademicInfo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { major, minor, department, faculty, academicYear, graduationYear } = req.body;

      // Validate academic year
      if (academicYear !== undefined) {
        if (academicYear < 1 || academicYear > 10) {
          throw new CustomError('Academic year must be between 1 and 10', 400);
        }
      }

      // Validate graduation year
      if (graduationYear !== undefined) {
        const currentYear = new Date().getFullYear();
        if (graduationYear < 1950 || graduationYear > currentYear + 10) {
          throw new CustomError(`Graduation year must be between 1950 and ${currentYear + 10}`, 400);
        }
      }

      // Validate academic year and graduation year consistency
      if (academicYear && graduationYear) {
        const currentYear = new Date().getFullYear();
        const expectedGraduationYear = currentYear + (4 - academicYear);
        
        if (Math.abs(graduationYear - expectedGraduationYear) > 2) {
          throw new CustomError('Academic year and graduation year seem inconsistent', 400);
        }
      }

      // Validate field lengths
      if (major && major.length > 100) {
        throw new CustomError('Major must be no more than 100 characters long', 400);
      }

      if (minor && minor.length > 100) {
        throw new CustomError('Minor must be no more than 100 characters long', 400);
      }

      if (department && department.length > 100) {
        throw new CustomError('Department must be no more than 100 characters long', 400);
      }

      if (faculty && faculty.length > 100) {
        throw new CustomError('Faculty must be no more than 100 characters long', 400);
      }

      next();
    } catch (error) {
      next(error);
    }
  };

  /**
   * Validate contact information
   */
  public validateContactInfo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, universityEmail, phone, contactEmail } = req.body;

      // Validate email format
      if (email && !this.isValidEmail(email)) {
        throw new CustomError('Invalid email format', 400);
      }

      if (contactEmail && !this.isValidEmail(contactEmail)) {
        throw new CustomError('Invalid contact email format', 400);
      }

      // Validate university email format
      if (universityEmail && !this.isValidUniversityEmail(universityEmail)) {
        throw new CustomError('Invalid university email format', 400);
      }

      // Validate phone format
      if (phone && !this.isValidPhone(phone)) {
        throw new CustomError('Invalid phone number format', 400);
      }

      next();
    } catch (error) {
      next(error);
    }
  };

  /**
   * Validate social links
   */
  public validateSocialLinks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { linkedin, github, twitter, website } = req.body;

      // Validate LinkedIn handle
      if (linkedin && !this.isValidLinkedInHandle(linkedin)) {
        throw new CustomError('Invalid LinkedIn handle format', 400);
      }

      // Validate GitHub handle
      if (github && !this.isValidGitHubHandle(github)) {
        throw new CustomError('Invalid GitHub handle format', 400);
      }

      // Validate Twitter handle
      if (twitter && !this.isValidTwitterHandle(twitter)) {
        throw new CustomError('Invalid Twitter handle format', 400);
      }

      // Validate website URL
      if (website && !this.isValidWebsiteUrl(website)) {
        throw new CustomError('Invalid website URL format', 400);
      }

      next();
    } catch (error) {
      next(error);
    }
  };

  /**
   * Validate location information
   */
  public validateLocationInfo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { city, country, timezone } = req.body;

      // Validate city
      if (city && city.length > 100) {
        throw new CustomError('City must be no more than 100 characters long', 400);
      }

      // Validate country code
      if (country && !this.isValidCountryCode(country)) {
        throw new CustomError('Invalid country code. Must be a 2-letter ISO code', 400);
      }

      // Validate timezone
      if (timezone && !this.isValidTimezone(timezone)) {
        throw new CustomError('Invalid timezone', 400);
      }

      next();
    } catch (error) {
      next(error);
    }
  };

  /**
   * Validate privacy settings
   */
  public validatePrivacySettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const privacySettings = req.body;

      // Validate boolean fields
      const booleanFields = [
        'showEmail', 'showPhone', 'showLocation', 'showAcademicInfo', 'showSocialLinks',
        'showProfilePicture', 'showCoverPhoto', 'allowDirectMessages', 'allowFriendRequests',
        'allowProfileViews', 'showOnlineStatus', 'showLastSeen', 'showActivityStatus',
        'allowSearchEngines', 'allowDataCollection', 'allowAnalytics', 'allowMarketing',
        'allowThirdPartySharing'
      ];

      for (const field of booleanFields) {
        if (privacySettings[field] !== undefined && typeof privacySettings[field] !== 'boolean') {
          throw new CustomError(`${field} must be a boolean value`, 400);
        }
      }

      // Validate visibility fields
      const visibilityFields = [
        'profileVisibility', 'contactVisibility', 'academicVisibility',
        'socialVisibility', 'locationVisibility', 'activityVisibility'
      ];

      const validVisibilityLevels = ['public', 'university', 'friends', 'private'];

      for (const field of visibilityFields) {
        if (privacySettings[field] !== undefined && !validVisibilityLevels.includes(privacySettings[field])) {
          throw new CustomError(`${field} must be one of: ${validVisibilityLevels.join(', ')}`, 400);
        }
      }

      // Validate data retention period
      if (privacySettings.dataRetentionPeriod !== undefined) {
        if (typeof privacySettings.dataRetentionPeriod !== 'number' || 
            privacySettings.dataRetentionPeriod < 30 || 
            privacySettings.dataRetentionPeriod > 3650) {
          throw new CustomError('Data retention period must be between 30 and 3650 days', 400);
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };

  // Private helper methods

  private containsOffensiveContent(text: string): boolean {
    // Simple implementation - in production, use a proper content moderation service
    const offensiveWords = ['spam', 'fake', 'test', 'dummy', 'inappropriate'];
    const lowerText = text.toLowerCase();
    return offensiveWords.some(word => lowerText.includes(word));
  }

  private containsSpamPatterns(text: string): boolean {
    // Check for spam patterns
    const spamPatterns = [
      /(.)\1{4,}/, // Repeated characters
      /https?:\/\/[^\s]+/g, // Multiple URLs
      /@[^\s]+/g, // Multiple mentions
      /\$[^\s]+/g // Multiple dollar signs
    ];

    return spamPatterns.some(pattern => pattern.test(text));
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 255;
  }

  private isValidUniversityEmail(email: string): boolean {
    if (!this.isValidEmail(email)) {
      return false;
    }
    
    const domain = email.split('@')[1];
    return domain.endsWith('.edu');
  }

  private isValidPhone(phone: string): boolean {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, '')) && phone.length <= 20;
  }

  private isValidLinkedInHandle(handle: string): boolean {
    return /^[a-zA-Z0-9\-_]+$/.test(handle) && handle.length <= 100;
  }

  private isValidGitHubHandle(handle: string): boolean {
    return /^[a-zA-Z0-9\-_]+$/.test(handle) && handle.length <= 100;
  }

  private isValidTwitterHandle(handle: string): boolean {
    return /^[a-zA-Z0-9_]+$/.test(handle) && handle.length <= 100;
  }

  private isValidWebsiteUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return ['http:', 'https:'].includes(urlObj.protocol) && url.length <= 500;
    } catch {
      return false;
    }
  }

  private isValidCountryCode(country: string): boolean {
    return /^[A-Z]{2}$/.test(country);
  }

  private isValidTimezone(timezone: string): boolean {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
      return true;
    } catch {
      return false;
    }
  }
}

export const profileValidationMiddleware = new ProfileValidationMiddleware();
