import { Router, Request, Response, NextFunction } from 'express';
import { ProfileController } from '../controllers/ProfileController';
import { profileValidationMiddleware } from '../middleware/profile-validation';
import { privacyMiddleware } from '../middleware/privacy-middleware';
import { authMiddleware } from '../middleware/auth-middleware';
import { rateLimitMiddleware } from '../middleware/rate-limit';
import { validateRequest } from '../middleware/validate-request';
import { 
  createProfileSchema, 
  updateProfileSchema, 
  patchProfileSchema,
  privacySettingsSchema,
  searchProfilesSchema,
  batchUpdateSchema
} from '../schemas/profile-schemas';

const router = Router();
const profileController = new ProfileController();

// Rate limiting configurations
const createProfileRateLimit = rateLimitMiddleware({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // 3 profile creations per window
  message: 'Too many profile creation attempts, please try again later.',
  keyGenerator: (req) => `profile-create:${req.user?.id || req.ip}`
});

const updateProfileRateLimit = rateLimitMiddleware({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 updates per window
  message: 'Too many profile update attempts, please try again later.',
  keyGenerator: (req) => `profile-update:${req.user?.id || req.ip}`
});

const searchRateLimit = rateLimitMiddleware({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 searches per minute
  message: 'Too many search requests, please try again later.',
  keyGenerator: (req) => `profile-search:${req.user?.id || req.ip}`
});

/**
 * @route POST /api/v1/profiles
 * @desc Create a new user profile
 * @access Private (authenticated users only)
 * @rateLimit 3 requests per 15 minutes
 */
router.post(
  '/',
  authMiddleware,
  createProfileRateLimit,
  validateRequest(createProfileSchema),
  profileValidationMiddleware.validateProfileCreation,
  profileController.createProfile
);

/**
 * @route GET /api/v1/profiles/me
 * @desc Get current user's profile
 * @access Private (authenticated users only)
 */
router.get(
  '/me',
  authMiddleware,
  profileController.getCurrentUserProfile
);

/**
 * @route GET /api/v1/profiles/:userId
 * @desc Get user profile by ID (with privacy controls)
 * @access Private (authenticated users only)
 * @param userId - User ID to retrieve profile for
 */
router.get(
  '/:userId',
  authMiddleware,
  privacyMiddleware.checkProfileAccess,
  profileController.getProfileById
);

/**
 * @route PUT /api/v1/profiles/:userId
 * @desc Update user profile (full update)
 * @access Private (profile owner only)
 * @rateLimit 10 requests per 5 minutes
 * @param userId - User ID to update
 */
router.put(
  '/:userId',
  authMiddleware,
  updateProfileRateLimit,
  validateRequest(updateProfileSchema),
  profileValidationMiddleware.validateProfileOwnership,
  profileValidationMiddleware.validateProfileUpdate,
  profileController.updateProfile
);

/**
 * @route PATCH /api/v1/profiles/:userId
 * @desc Partially update user profile
 * @access Private (profile owner only)
 * @rateLimit 10 requests per 5 minutes
 * @param userId - User ID to update
 */
router.patch(
  '/:userId',
  authMiddleware,
  updateProfileRateLimit,
  validateRequest(patchProfileSchema),
  profileValidationMiddleware.validateProfileOwnership,
  profileValidationMiddleware.validateProfileUpdate,
  profileController.patchProfile
);

/**
 * @route DELETE /api/v1/profiles/:userId
 * @desc Soft delete user profile
 * @access Private (profile owner only)
 * @param userId - User ID to delete
 */
router.delete(
  '/:userId',
  authMiddleware,
  profileValidationMiddleware.validateProfileOwnership,
  profileController.deleteProfile
);

/**
 * @route GET /api/v1/profiles/search
 * @desc Search profiles with filters
 * @access Private (authenticated users only)
 * @rateLimit 30 requests per minute
 */
router.get(
  '/search',
  authMiddleware,
  searchRateLimit,
  validateRequest(searchProfilesSchema),
  profileController.searchProfiles
);

/**
 * @route GET /api/v1/profiles/:userId/completion
 * @desc Get profile completion status and score
 * @access Private (profile owner only)
 * @param userId - User ID to get completion for
 */
router.get(
  '/:userId/completion',
  authMiddleware,
  profileValidationMiddleware.validateProfileOwnership,
  profileController.getProfileCompletion
);

/**
 * @route PUT /api/v1/profiles/:userId/completion
 * @desc Update profile completion score
 * @access Private (profile owner only)
 * @param userId - User ID to update completion for
 */
router.put(
  '/:userId/completion',
  authMiddleware,
  profileValidationMiddleware.validateProfileOwnership,
  profileController.updateProfileCompletion
);

/**
 * @route GET /api/v1/profiles/:userId/privacy
 * @desc Get user privacy settings
 * @access Private (profile owner only)
 * @param userId - User ID to get privacy settings for
 */
router.get(
  '/:userId/privacy',
  authMiddleware,
  profileValidationMiddleware.validateProfileOwnership,
  profileController.getPrivacySettings
);

/**
 * @route PUT /api/v1/profiles/:userId/privacy
 * @desc Update user privacy settings
 * @access Private (profile owner only)
 * @param userId - User ID to update privacy settings for
 */
router.put(
  '/:userId/privacy',
  authMiddleware,
  validateRequest(privacySettingsSchema),
  profileValidationMiddleware.validateProfileOwnership,
  profileController.updatePrivacySettings
);

/**
 * @route GET /api/v1/profiles/:userId/activity
 * @desc Get user profile activity logs
 * @access Private (profile owner only)
 * @param userId - User ID to get activity for
 */
router.get(
  '/:userId/activity',
  authMiddleware,
  profileValidationMiddleware.validateProfileOwnership,
  profileController.getProfileActivity
);

/**
 * @route GET /api/v1/profiles/:userId/statistics
 * @desc Get user profile statistics
 * @access Private (authenticated users only)
 * @param userId - User ID to get statistics for
 */
router.get(
  '/:userId/statistics',
  authMiddleware,
  privacyMiddleware.checkProfileAccess,
  profileController.getProfileStatistics
);

/**
 * @route POST /api/v1/profiles/:userId/verify
 * @desc Verify user profile (admin only)
 * @access Private (admin users only)
 * @param userId - User ID to verify
 */
router.post(
  '/:userId/verify',
  authMiddleware,
  profileValidationMiddleware.validateAdminAccess,
  profileController.verifyProfile
);

/**
 * @route POST /api/v1/profiles/:userId/picture
 * @desc Upload profile picture
 * @access Private (profile owner only)
 * @param userId - User ID to upload picture for
 */
router.post(
  '/:userId/picture',
  authMiddleware,
  profileValidationMiddleware.validateProfileOwnership,
  profileController.uploadProfilePicture
);

/**
 * @route POST /api/v1/profiles/:userId/cover
 * @desc Upload cover photo
 * @access Private (profile owner only)
 * @param userId - User ID to upload cover for
 */
router.post(
  '/:userId/cover',
  authMiddleware,
  profileValidationMiddleware.validateProfileOwnership,
  profileController.uploadCoverPhoto
);

/**
 * @route DELETE /api/v1/profiles/:userId/picture
 * @desc Delete profile picture
 * @access Private (profile owner only)
 * @param userId - User ID to delete picture for
 */
router.delete(
  '/:userId/picture',
  authMiddleware,
  profileValidationMiddleware.validateProfileOwnership,
  profileController.deleteProfilePicture
);

/**
 * @route DELETE /api/v1/profiles/:userId/cover
 * @desc Delete cover photo
 * @access Private (profile owner only)
 * @param userId - User ID to delete cover for
 */
router.delete(
  '/:userId/cover',
  authMiddleware,
  profileValidationMiddleware.validateProfileOwnership,
  profileController.deleteCoverPhoto
);

/**
 * @route GET /api/v1/profiles/:userId/recommendations
 * @desc Get profile recommendations
 * @access Private (authenticated users only)
 * @param userId - User ID to get recommendations for
 */
router.get(
  '/:userId/recommendations',
  authMiddleware,
  profileValidationMiddleware.validateProfileOwnership,
  profileController.getProfileRecommendations
);

/**
 * @route POST /api/v1/profiles/batch
 * @desc Batch update multiple profiles (admin only)
 * @access Private (admin users only)
 */
router.post(
  '/batch',
  authMiddleware,
  profileValidationMiddleware.validateAdminAccess,
  validateRequest(batchUpdateSchema),
  profileController.batchUpdateProfiles
);

/**
 * @route GET /api/v1/profiles/:userId/export
 * @desc Export profile data
 * @access Private (profile owner only)
 * @param userId - User ID to export data for
 */
router.get(
  '/:userId/export',
  authMiddleware,
  profileValidationMiddleware.validateProfileOwnership,
  profileController.exportProfileData
);

/**
 * @route POST /api/v1/profiles/:userId/import
 * @desc Import profile data
 * @access Private (profile owner only)
 * @param userId - User ID to import data for
 */
router.post(
  '/:userId/import',
  authMiddleware,
  profileValidationMiddleware.validateProfileOwnership,
  profileController.importProfileData
);

/**
 * @route GET /api/v1/profiles/:userId/audit-logs
 * @desc Get profile audit logs
 * @access Private (profile owner only)
 * @param userId - User ID to get audit logs for
 */
router.get(
  '/:userId/audit-logs',
  authMiddleware,
  profileValidationMiddleware.validateProfileOwnership,
  profileController.getAuditLogs
);

/**
 * @route POST /api/v1/profiles/:userId/data-access-request
 * @desc Create data access request
 * @access Private (authenticated users only)
 * @param userId - User ID to request data access for
 */
router.post(
  '/:userId/data-access-request',
  authMiddleware,
  profileController.createDataAccessRequest
);

/**
 * @route GET /api/v1/profiles/:userId/data-access-requests
 * @desc Get data access requests for user
 * @access Private (profile owner only)
 * @param userId - User ID to get requests for
 */
router.get(
  '/:userId/data-access-requests',
  authMiddleware,
  profileValidationMiddleware.validateProfileOwnership,
  profileController.getDataAccessRequests
);

/**
 * @route PUT /api/v1/profiles/:userId/data-access-requests/:requestId
 * @desc Respond to data access request
 * @access Private (profile owner only)
 * @param userId - User ID
 * @param requestId - Request ID to respond to
 */
router.put(
  '/:userId/data-access-requests/:requestId',
  authMiddleware,
  profileValidationMiddleware.validateProfileOwnership,
  profileController.respondToDataAccessRequest
);

/**
 * @route GET /api/v1/profiles/health
 * @desc Health check endpoint
 * @access Public
 */
router.get(
  '/health',
  (req: Request, res: Response) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'profile-service',
      version: process.env.SERVICE_VERSION || '1.0.0'
    });
  }
);

/**
 * @route GET /api/v1/profiles/metrics
 * @desc Get service metrics
 * @access Private (admin users only)
 */
router.get(
  '/metrics',
  authMiddleware,
  profileValidationMiddleware.validateAdminAccess,
  profileController.getServiceMetrics
);

export default router;
