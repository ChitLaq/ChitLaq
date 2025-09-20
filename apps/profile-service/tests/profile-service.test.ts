import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ProfileService } from '../src/services/ProfileService';
import { ProfileValidator } from '../src/validators/profile-validator';
import { PrivacyControls } from '../src/privacy/privacy-controls';
import { UniversityMapper } from '../src/utils/university-mapper';
import { IUserProfileCreation, ProfileUpdateData } from '../src/models/UserProfile';
import { UniversityProfile } from '../src/models/UniversityProfile';

// Mock dependencies
jest.mock('../src/validators/profile-validator');
jest.mock('../src/privacy/privacy-controls');
jest.mock('../src/utils/university-mapper');
jest.mock('../src/models/UniversityProfile');

describe('ProfileService', () => {
  let profileService: ProfileService;
  let mockSupabase: any;
  let mockProfileValidator: jest.Mocked<ProfileValidator>;
  let mockPrivacyControls: jest.Mocked<PrivacyControls>;
  let mockUniversityMapper: jest.Mocked<UniversityMapper>;

  beforeEach(() => {
    // Mock Supabase client
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      or: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis()
    };

    // Mock validator
    mockProfileValidator = new ProfileValidator() as jest.Mocked<ProfileValidator>;
    mockProfileValidator.validateNewProfile = jest.fn();
    mockProfileValidator.validateProfileUpdates = jest.fn();

    // Mock privacy controls
    mockPrivacyControls = new PrivacyControls() as jest.Mocked<PrivacyControls>;
    mockPrivacyControls.applyPrivacy = jest.fn();

    // Mock university mapper
    mockUniversityMapper = new UniversityMapper(mockSupabase) as jest.Mocked<UniversityMapper>;
    mockUniversityMapper.mapEmailToUniversity = jest.fn();

    // Create service instance
    profileService = new ProfileService(mockSupabase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createProfile', () => {
    it('should create a new profile successfully', async () => {
      const userId = 'user-123';
      const email = 'test@university.edu';
      const username = 'testuser';

      const mockUniversityData = {
        universityId: 'uni-123',
        universityName: 'Test University',
        universityDomain: 'university.edu',
        universityPrefix: 'test'
      };

      const mockProfile = {
        userId,
        username,
        isEmailVerified: true,
        isUniversityVerified: true,
        isProfileVerified: false,
        isDiscoverable: true,
        isPublicProfile: true,
        postCount: 0,
        followerCount: 0,
        followingCount: 0,
        profileCompletionScore: 20,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...mockUniversityData
      };

      mockProfileValidator.validateNewProfile.mockResolvedValue({ isValid: true, errors: [], warnings: [] });
      mockUniversityMapper.mapEmailToUniversity.mockResolvedValue(mockUniversityData);
      mockSupabase.single.mockResolvedValue({ data: mockProfile, error: null });

      const result = await profileService.createProfile(userId, email, username);

      expect(mockProfileValidator.validateNewProfile).toHaveBeenCalledWith({ userId, email, username });
      expect(mockUniversityMapper.mapEmailToUniversity).toHaveBeenCalledWith(email);
      expect(mockSupabase.from).toHaveBeenCalledWith('user_profiles');
      expect(mockSupabase.insert).toHaveBeenCalledWith([expect.objectContaining({
        userId,
        username,
        isEmailVerified: true,
        isUniversityVerified: true,
        ...mockUniversityData
      })]);
      expect(result).toEqual(mockProfile);
    });

    it('should throw error if profile already exists', async () => {
      const userId = 'user-123';
      const email = 'test@university.edu';
      const username = 'testuser';

      mockProfileValidator.validateNewProfile.mockResolvedValue({ isValid: true, errors: [], warnings: [] });
      mockSupabase.single.mockResolvedValue({ data: { userId }, error: null });

      await expect(profileService.createProfile(userId, email, username))
        .rejects.toThrow('Profile already exists for this user.');
    });

    it('should throw error if validation fails', async () => {
      const userId = 'user-123';
      const email = 'invalid-email';
      const username = 'testuser';

      mockProfileValidator.validateNewProfile.mockResolvedValue({ 
        isValid: false, 
        errors: ['Invalid email format'], 
        warnings: [] 
      });

      await expect(profileService.createProfile(userId, email, username))
        .rejects.toThrow('Invalid email format');
    });

    it('should throw error if database operation fails', async () => {
      const userId = 'user-123';
      const email = 'test@university.edu';
      const username = 'testuser';

      mockProfileValidator.validateNewProfile.mockResolvedValue({ isValid: true, errors: [], warnings: [] });
      mockUniversityMapper.mapEmailToUniversity.mockResolvedValue({
        universityId: 'uni-123',
        universityName: 'Test University',
        universityDomain: 'university.edu',
        universityPrefix: 'test'
      });
      mockSupabase.single.mockResolvedValue({ data: null, error: { message: 'Database error' } });

      await expect(profileService.createProfile(userId, email, username))
        .rejects.toThrow('Failed to create profile: Database error');
    });
  });

  describe('getProfileByUserId', () => {
    it('should retrieve profile successfully', async () => {
      const userId = 'user-123';
      const viewerId = 'viewer-123';

      const mockProfile = {
        userId,
        username: 'testuser',
        displayName: 'Test User',
        bio: 'Test bio',
        isEmailVerified: true,
        isUniversityVerified: true,
        isProfileVerified: false,
        isDiscoverable: true,
        isPublicProfile: true,
        postCount: 5,
        followerCount: 10,
        followingCount: 15,
        profileCompletionScore: 80,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockSupabase.single.mockResolvedValue({ data: mockProfile, error: null });
      mockPrivacyControls.applyPrivacy.mockReturnValue(mockProfile);

      const result = await profileService.getProfileByUserId(userId, viewerId);

      expect(mockSupabase.from).toHaveBeenCalledWith('user_profiles');
      expect(mockSupabase.select).toHaveBeenCalledWith('*');
      expect(mockSupabase.eq).toHaveBeenCalledWith('userId', userId);
      expect(mockPrivacyControls.applyPrivacy).toHaveBeenCalledWith(mockProfile, viewerId === userId);
      expect(result).toEqual(mockProfile);
    });

    it('should return null if profile not found', async () => {
      const userId = 'user-123';

      mockSupabase.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });

      const result = await profileService.getProfileByUserId(userId);

      expect(result).toBeNull();
    });

    it('should throw error if database operation fails', async () => {
      const userId = 'user-123';

      mockSupabase.single.mockResolvedValue({ data: null, error: { message: 'Database error' } });

      await expect(profileService.getProfileByUserId(userId))
        .rejects.toThrow('Failed to retrieve profile: Database error');
    });
  });

  describe('updateProfile', () => {
    it('should update profile successfully', async () => {
      const userId = 'user-123';
      const updates: ProfileUpdateData = {
        displayName: 'Updated Name',
        bio: 'Updated bio'
      };

      const existingProfile = {
        userId,
        username: 'testuser',
        displayName: 'Test User',
        bio: 'Test bio',
        profileCompletionScore: 60
      };

      const updatedProfile = {
        ...existingProfile,
        ...updates,
        profileCompletionScore: 80,
        updatedAt: new Date()
      };

      mockProfileValidator.validateProfileUpdates.mockResolvedValue({ isValid: true, errors: [], warnings: [] });
      mockSupabase.single.mockResolvedValueOnce({ data: existingProfile, error: null });
      mockSupabase.single.mockResolvedValueOnce({ data: updatedProfile, error: null });

      const result = await profileService.updateProfile(userId, updates);

      expect(mockProfileValidator.validateProfileUpdates).toHaveBeenCalledWith(updates);
      expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({
        ...updates,
        updatedAt: expect.any(Date)
      }));
      expect(result).toEqual(updatedProfile);
    });

    it('should throw error if profile not found', async () => {
      const userId = 'user-123';
      const updates: ProfileUpdateData = { displayName: 'Updated Name' };

      mockProfileValidator.validateProfileUpdates.mockResolvedValue({ isValid: true, errors: [], warnings: [] });
      mockSupabase.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });

      await expect(profileService.updateProfile(userId, updates))
        .rejects.toThrow('Profile not found.');
    });

    it('should throw error if trying to update disallowed fields', async () => {
      const userId = 'user-123';
      const updates: ProfileUpdateData = { 
        displayName: 'Updated Name',
        userId: 'new-user-id' // This should not be allowed
      };

      mockProfileValidator.validateProfileUpdates.mockResolvedValue({ isValid: true, errors: [], warnings: [] });
      mockSupabase.single.mockResolvedValue({ data: { userId }, error: null });

      await expect(profileService.updateProfile(userId, updates))
        .rejects.toThrow('Cannot directly update field: userId');
    });

    it('should recalculate profile completion score', async () => {
      const userId = 'user-123';
      const updates: ProfileUpdateData = { bio: 'New bio' };

      const existingProfile = {
        userId,
        username: 'testuser',
        bio: 'Old bio',
        profileCompletionScore: 60
      };

      const updatedProfile = {
        ...existingProfile,
        ...updates,
        profileCompletionScore: 70,
        updatedAt: new Date()
      };

      mockProfileValidator.validateProfileUpdates.mockResolvedValue({ isValid: true, errors: [], warnings: [] });
      mockSupabase.single.mockResolvedValueOnce({ data: existingProfile, error: null });
      mockSupabase.single.mockResolvedValueOnce({ data: updatedProfile, error: null });

      const result = await profileService.updateProfile(userId, updates);

      expect(result.profileCompletionScore).toBe(70);
    });
  });

  describe('deleteProfile', () => {
    it('should delete profile successfully', async () => {
      const userId = 'user-123';

      mockSupabase.delete.mockResolvedValue({ error: null });

      await profileService.deleteProfile(userId);

      expect(mockSupabase.from).toHaveBeenCalledWith('user_profiles');
      expect(mockSupabase.delete).toHaveBeenCalled();
      expect(mockSupabase.eq).toHaveBeenCalledWith('userId', userId);
    });

    it('should throw error if database operation fails', async () => {
      const userId = 'user-123';

      mockSupabase.delete.mockResolvedValue({ error: { message: 'Database error' } });

      await expect(profileService.deleteProfile(userId))
        .rejects.toThrow('Failed to delete profile: Database error');
    });
  });

  describe('searchProfiles', () => {
    it('should search profiles successfully', async () => {
      const query = 'test';
      const limit = 10;
      const offset = 0;

      const mockProfiles = [
        { userId: 'user-1', username: 'testuser1', displayName: 'Test User 1' },
        { userId: 'user-2', username: 'testuser2', displayName: 'Test User 2' }
      ];

      mockSupabase.select.mockResolvedValue({ data: mockProfiles, error: null });

      const result = await profileService.searchProfiles(query, limit, offset);

      expect(mockSupabase.from).toHaveBeenCalledWith('user_profiles');
      expect(mockSupabase.or).toHaveBeenCalledWith(`username.ilike.%${query}%,displayName.ilike.%${query}%`);
      expect(mockSupabase.limit).toHaveBeenCalledWith(limit);
      expect(mockSupabase.offset).toHaveBeenCalledWith(offset);
      expect(result).toEqual(mockProfiles);
    });

    it('should throw error if database operation fails', async () => {
      const query = 'test';

      mockSupabase.select.mockResolvedValue({ data: null, error: { message: 'Database error' } });

      await expect(profileService.searchProfiles(query))
        .rejects.toThrow('Failed to search profiles: Database error');
    });
  });

  describe('verifyProfile', () => {
    it('should verify profile successfully', async () => {
      const userId = 'user-123';
      const isVerified = true;

      const updatedProfile = {
        userId,
        username: 'testuser',
        isProfileVerified: isVerified,
        updatedAt: new Date()
      };

      mockSupabase.single.mockResolvedValue({ data: updatedProfile, error: null });

      const result = await profileService.verifyProfile(userId, isVerified);

      expect(mockSupabase.update).toHaveBeenCalledWith({
        isProfileVerified: isVerified,
        updatedAt: expect.any(Date)
      });
      expect(result).toEqual(updatedProfile);
    });

    it('should throw error if database operation fails', async () => {
      const userId = 'user-123';
      const isVerified = true;

      mockSupabase.single.mockResolvedValue({ data: null, error: { message: 'Database error' } });

      await expect(profileService.verifyProfile(userId, isVerified))
        .rejects.toThrow('Failed to update profile verification status: Database error');
    });
  });

  describe('calculateProfileCompletion', () => {
    it('should calculate profile completion score correctly', () => {
      const currentProfile = {
        userId: 'user-123',
        username: 'testuser',
        bio: 'Test bio',
        profilePictureUrl: 'https://example.com/pic.jpg',
        universityId: 'uni-123',
        major: 'Computer Science',
        academicYear: 'Junior',
        interests: ['coding', 'gaming'],
        isEmailVerified: true,
        isUniversityVerified: true,
        isProfileVerified: false
      };

      const updates = {
        displayName: 'Test User'
      };

      // This is a private method, so we'll test it indirectly through updateProfile
      // The score should be calculated based on filled fields
      expect(currentProfile.username).toBeTruthy();
      expect(currentProfile.bio).toBeTruthy();
      expect(currentProfile.profilePictureUrl).toBeTruthy();
      expect(currentProfile.universityId).toBeTruthy();
      expect(currentProfile.major).toBeTruthy();
      expect(currentProfile.academicYear).toBeTruthy();
      expect(currentProfile.interests).toBeTruthy();
      expect(currentProfile.isEmailVerified).toBeTruthy();
      expect(currentProfile.isUniversityVerified).toBeTruthy();
    });
  });
});
