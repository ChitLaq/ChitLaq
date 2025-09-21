import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Request, Response } from 'express';
import { SupabaseClient } from '@supabase/supabase-js';
import { ProfileController } from '../src/controllers/ProfileController';
import { ProfileService } from '../src/services/ProfileService';
import { UniversitySync } from '../src/services/UniversitySync';
import { UserProfile } from '../src/models/UserProfile';
import { UniversityProfile } from '../src/models/UniversityProfile';
import { CustomError } from '../../../shared/errors/CustomError';

// Mock Supabase client
const mockSupabase = {
  from: jest.fn(),
  auth: {
    getUser: jest.fn(),
    getSession: jest.fn()
  }
} as unknown as SupabaseClient;

// Mock services
const mockProfileService = {
  createProfile: jest.fn(),
  getProfile: jest.fn(),
  updateProfile: jest.fn(),
  deleteProfile: jest.fn(),
  getProfileByUsername: jest.fn(),
  searchProfiles: jest.fn(),
  getProfileCompletionScore: jest.fn(),
  updatePrivacySettings: jest.fn(),
  getPrivacySettings: jest.fn(),
  getPublicProfiles: jest.fn(),
  getProfileStatistics: jest.fn()
} as unknown as ProfileService;

const mockUniversitySync = {
  syncUserWithUniversity: jest.fn(),
  validateUniversityEmail: jest.fn(),
  validateAcademicInformation: jest.fn(),
  getUniversityProfile: jest.fn(),
  getUniversityByDomain: jest.fn(),
  getApprovedUniversities: jest.fn(),
  searchUniversities: jest.fn(),
  getUniversitiesByCountry: jest.fn(),
  getUniversityStatistics: jest.fn()
} as unknown as UniversitySync;

// Mock request and response objects
const mockRequest = {
  params: {},
  body: {},
  query: {},
  user: null,
  headers: {}
} as unknown as Request;

const mockResponse = {
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
  send: jest.fn().mockReturnThis()
} as unknown as Response;

describe('ProfileController', () => {
  let profileController: ProfileController;

  beforeEach(() => {
    profileController = new ProfileController(mockProfileService, mockUniversitySync);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createProfile', () => {
    it('should create a profile successfully', async () => {
      const profileData = {
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
        universityEmail: 'john.doe@university.edu',
        major: 'Computer Science',
        academicYear: 2024
      };

      const createdProfile: UserProfile = {
        userId: 'user-123',
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
        universityEmail: 'john.doe@university.edu',
        major: 'Computer Science',
        academicYear: 2024,
        profileCompletionScore: 75,
        isUniversityVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRequest.body = profileData;
      mockRequest.user = { id: 'user-123' };

      (mockProfileService.createProfile as jest.Mock).mockResolvedValue(createdProfile);

      await profileController.createProfile(mockRequest, mockResponse);

      expect(mockProfileService.createProfile).toHaveBeenCalledWith('user-123', profileData);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: createdProfile,
        message: 'Profile created successfully'
      });
    });

    it('should handle validation errors', async () => {
      const profileData = {
        firstName: '',
        lastName: 'Doe',
        username: 'johndoe',
        universityEmail: 'invalid-email',
        major: 'Computer Science',
        academicYear: 2024
      };

      mockRequest.body = profileData;
      mockRequest.user = { id: 'user-123' };

      (mockProfileService.createProfile as jest.Mock).mockRejectedValue(
        new CustomError('Validation failed: First name is required', 400)
      );

      await profileController.createProfile(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed: First name is required'
      });
    });

    it('should handle university email validation errors', async () => {
      const profileData = {
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
        universityEmail: 'john.doe@invalid-university.com',
        major: 'Computer Science',
        academicYear: 2024
      };

      mockRequest.body = profileData;
      mockRequest.user = { id: 'user-123' };

      (mockUniversitySync.validateUniversityEmail as jest.Mock).mockResolvedValue({
        isValid: false,
        errors: ['University not found for the provided email domain']
      });

      await profileController.createProfile(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'University not found for the provided email domain'
      });
    });
  });

  describe('getProfile', () => {
    it('should get a profile successfully', async () => {
      const profile: UserProfile = {
        userId: 'user-123',
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
        universityEmail: 'john.doe@university.edu',
        major: 'Computer Science',
        academicYear: 2024,
        profileCompletionScore: 75,
        isUniversityVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRequest.params = { userId: 'user-123' };
      mockRequest.user = { id: 'user-123' };

      (mockProfileService.getProfile as jest.Mock).mockResolvedValue(profile);

      await profileController.getProfile(mockRequest, mockResponse);

      expect(mockProfileService.getProfile).toHaveBeenCalledWith('user-123', 'user-123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: profile
      });
    });

    it('should handle profile not found', async () => {
      mockRequest.params = { userId: 'user-123' };
      mockRequest.user = { id: 'user-123' };

      (mockProfileService.getProfile as jest.Mock).mockRejectedValue(
        new CustomError('Profile not found', 404)
      );

      await profileController.getProfile(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Profile not found'
      });
    });
  });

  describe('updateProfile', () => {
    it('should update a profile successfully', async () => {
      const updateData = {
        firstName: 'Jane',
        lastName: 'Smith',
        major: 'Data Science',
        academicYear: 2025
      };

      const updatedProfile: UserProfile = {
        userId: 'user-123',
        firstName: 'Jane',
        lastName: 'Smith',
        username: 'johndoe',
        universityEmail: 'john.doe@university.edu',
        major: 'Data Science',
        academicYear: 2025,
        profileCompletionScore: 85,
        isUniversityVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRequest.params = { userId: 'user-123' };
      mockRequest.body = updateData;
      mockRequest.user = { id: 'user-123' };

      (mockProfileService.updateProfile as jest.Mock).mockResolvedValue(updatedProfile);

      await profileController.updateProfile(mockRequest, mockResponse);

      expect(mockProfileService.updateProfile).toHaveBeenCalledWith('user-123', updateData, 'user-123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: updatedProfile,
        message: 'Profile updated successfully'
      });
    });

    it('should handle unauthorized access', async () => {
      const updateData = {
        firstName: 'Jane',
        lastName: 'Smith'
      };

      mockRequest.params = { userId: 'user-123' };
      mockRequest.body = updateData;
      mockRequest.user = { id: 'user-456' };

      (mockProfileService.updateProfile as jest.Mock).mockRejectedValue(
        new CustomError('Unauthorized access', 403)
      );

      await profileController.updateProfile(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Unauthorized access'
      });
    });
  });

  describe('deleteProfile', () => {
    it('should delete a profile successfully', async () => {
      mockRequest.params = { userId: 'user-123' };
      mockRequest.user = { id: 'user-123' };

      (mockProfileService.deleteProfile as jest.Mock).mockResolvedValue(true);

      await profileController.deleteProfile(mockRequest, mockResponse);

      expect(mockProfileService.deleteProfile).toHaveBeenCalledWith('user-123', 'user-123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Profile deleted successfully'
      });
    });

    it('should handle profile not found', async () => {
      mockRequest.params = { userId: 'user-123' };
      mockRequest.user = { id: 'user-123' };

      (mockProfileService.deleteProfile as jest.Mock).mockRejectedValue(
        new CustomError('Profile not found', 404)
      );

      await profileController.deleteProfile(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Profile not found'
      });
    });
  });

  describe('getProfileByUsername', () => {
    it('should get a profile by username successfully', async () => {
      const profile: UserProfile = {
        userId: 'user-123',
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
        universityEmail: 'john.doe@university.edu',
        major: 'Computer Science',
        academicYear: 2024,
        profileCompletionScore: 75,
        isUniversityVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRequest.params = { username: 'johndoe' };
      mockRequest.user = { id: 'user-456' };

      (mockProfileService.getProfileByUsername as jest.Mock).mockResolvedValue(profile);

      await profileController.getProfileByUsername(mockRequest, mockResponse);

      expect(mockProfileService.getProfileByUsername).toHaveBeenCalledWith('johndoe', 'user-456');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: profile
      });
    });

    it('should handle username not found', async () => {
      mockRequest.params = { username: 'nonexistent' };
      mockRequest.user = { id: 'user-456' };

      (mockProfileService.getProfileByUsername as jest.Mock).mockRejectedValue(
        new CustomError('Username not found', 404)
      );

      await profileController.getProfileByUsername(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Username not found'
      });
    });
  });

  describe('searchProfiles', () => {
    it('should search profiles successfully', async () => {
      const searchResults = [
        {
          userId: 'user-123',
          firstName: 'John',
          lastName: 'Doe',
          username: 'johndoe',
          major: 'Computer Science',
          universityName: 'University of Technology'
        },
        {
          userId: 'user-456',
          firstName: 'Jane',
          lastName: 'Smith',
          username: 'janesmith',
          major: 'Data Science',
          universityName: 'University of Technology'
        }
      ];

      mockRequest.query = {
        query: 'computer science',
        university: 'University of Technology',
        major: 'Computer Science',
        page: '1',
        limit: '10'
      };
      mockRequest.user = { id: 'user-789' };

      (mockProfileService.searchProfiles as jest.Mock).mockResolvedValue({
        profiles: searchResults,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1
      });

      await profileController.searchProfiles(mockRequest, mockResponse);

      expect(mockProfileService.searchProfiles).toHaveBeenCalledWith({
        query: 'computer science',
        university: 'University of Technology',
        major: 'Computer Science',
        page: 1,
        limit: 10
      }, 'user-789');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          profiles: searchResults,
          total: 2,
          page: 1,
          limit: 10,
          totalPages: 1
        }
      });
    });

    it('should handle search errors', async () => {
      mockRequest.query = {
        query: 'computer science',
        page: '1',
        limit: '10'
      };
      mockRequest.user = { id: 'user-789' };

      (mockProfileService.searchProfiles as jest.Mock).mockRejectedValue(
        new CustomError('Search failed', 500)
      );

      await profileController.searchProfiles(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Search failed'
      });
    });
  });

  describe('getProfileCompletionScore', () => {
    it('should get profile completion score successfully', async () => {
      mockRequest.params = { userId: 'user-123' };
      mockRequest.user = { id: 'user-123' };

      (mockProfileService.getProfileCompletionScore as jest.Mock).mockResolvedValue({
        score: 75,
        missingFields: ['profilePicture', 'bio'],
        suggestions: ['Add a profile picture', 'Write a bio']
      });

      await profileController.getProfileCompletionScore(mockRequest, mockResponse);

      expect(mockProfileService.getProfileCompletionScore).toHaveBeenCalledWith('user-123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          score: 75,
          missingFields: ['profilePicture', 'bio'],
          suggestions: ['Add a profile picture', 'Write a bio']
        }
      });
    });
  });

  describe('updatePrivacySettings', () => {
    it('should update privacy settings successfully', async () => {
      const privacySettings = {
        profileVisibility: 'university',
        showEmail: false,
        showPhone: false,
        showAcademicInfo: true,
        showSocialLinks: false
      };

      mockRequest.params = { userId: 'user-123' };
      mockRequest.body = privacySettings;
      mockRequest.user = { id: 'user-123' };

      (mockProfileService.updatePrivacySettings as jest.Mock).mockResolvedValue(privacySettings);

      await profileController.updatePrivacySettings(mockRequest, mockResponse);

      expect(mockProfileService.updatePrivacySettings).toHaveBeenCalledWith('user-123', privacySettings);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: privacySettings,
        message: 'Privacy settings updated successfully'
      });
    });
  });

  describe('getPrivacySettings', () => {
    it('should get privacy settings successfully', async () => {
      const privacySettings = {
        profileVisibility: 'university',
        showEmail: false,
        showPhone: false,
        showAcademicInfo: true,
        showSocialLinks: false
      };

      mockRequest.params = { userId: 'user-123' };
      mockRequest.user = { id: 'user-123' };

      (mockProfileService.getPrivacySettings as jest.Mock).mockResolvedValue(privacySettings);

      await profileController.getPrivacySettings(mockRequest, mockResponse);

      expect(mockProfileService.getPrivacySettings).toHaveBeenCalledWith('user-123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: privacySettings
      });
    });
  });

  describe('getPublicProfiles', () => {
    it('should get public profiles successfully', async () => {
      const publicProfiles = [
        {
          userId: 'user-123',
          firstName: 'John',
          lastName: 'Doe',
          username: 'johndoe',
          major: 'Computer Science',
          universityName: 'University of Technology'
        },
        {
          userId: 'user-456',
          firstName: 'Jane',
          lastName: 'Smith',
          username: 'janesmith',
          major: 'Data Science',
          universityName: 'University of Technology'
        }
      ];

      mockRequest.query = {
        university: 'University of Technology',
        major: 'Computer Science',
        page: '1',
        limit: '10'
      };
      mockRequest.user = { id: 'user-789' };

      (mockProfileService.getPublicProfiles as jest.Mock).mockResolvedValue({
        profiles: publicProfiles,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1
      });

      await profileController.getPublicProfiles(mockRequest, mockResponse);

      expect(mockProfileService.getPublicProfiles).toHaveBeenCalledWith({
        university: 'University of Technology',
        major: 'Computer Science',
        page: 1,
        limit: 10
      }, 'user-789');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          profiles: publicProfiles,
          total: 2,
          page: 1,
          limit: 10,
          totalPages: 1
        }
      });
    });
  });

  describe('getProfileStatistics', () => {
    it('should get profile statistics successfully', async () => {
      const statistics = {
        totalProfiles: 1000,
        verifiedProfiles: 800,
        averageCompletionScore: 75,
        topMajors: [
          { major: 'Computer Science', count: 200 },
          { major: 'Data Science', count: 150 }
        ],
        universityDistribution: [
          { university: 'University of Technology', count: 300 },
          { university: 'State University', count: 250 }
        ]
      };

      mockRequest.params = { userId: 'user-123' };
      mockRequest.user = { id: 'user-123' };

      (mockProfileService.getProfileStatistics as jest.Mock).mockResolvedValue(statistics);

      await profileController.getProfileStatistics(mockRequest, mockResponse);

      expect(mockProfileService.getProfileStatistics).toHaveBeenCalledWith('user-123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: statistics
      });
    });
  });

  describe('syncWithUniversity', () => {
    it('should sync profile with university successfully', async () => {
      const syncResult = {
        success: true,
        universityId: 'university-123',
        universityName: 'University of Technology',
        universityDomain: 'university.edu',
        universityPrefix: 'john.doe',
        changes: ['University name updated'],
        errors: []
      };

      mockRequest.params = { userId: 'user-123' };
      mockRequest.user = { id: 'user-123' };

      (mockUniversitySync.syncUserWithUniversity as jest.Mock).mockResolvedValue(syncResult);

      await profileController.syncWithUniversity(mockRequest, mockResponse);

      expect(mockUniversitySync.syncUserWithUniversity).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: syncResult,
        message: 'Profile synchronized with university successfully'
      });
    });

    it('should handle sync errors', async () => {
      const syncResult = {
        success: false,
        changes: [],
        errors: ['University not found for the provided email domain']
      };

      mockRequest.params = { userId: 'user-123' };
      mockRequest.user = { id: 'user-123' };

      (mockUniversitySync.syncUserWithUniversity as jest.Mock).mockResolvedValue(syncResult);

      await profileController.syncWithUniversity(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'University not found for the provided email domain'
      });
    });
  });

  describe('validateUniversityEmail', () => {
    it('should validate university email successfully', async () => {
      const validationResult = {
        isValid: true,
        universityId: 'university-123',
        universityName: 'University of Technology',
        universityDomain: 'university.edu',
        universityPrefix: 'john.doe',
        errors: [],
        warnings: []
      };

      mockRequest.body = { email: 'john.doe@university.edu' };

      (mockUniversitySync.validateUniversityEmail as jest.Mock).mockResolvedValue(validationResult);

      await profileController.validateUniversityEmail(mockRequest, mockResponse);

      expect(mockUniversitySync.validateUniversityEmail).toHaveBeenCalledWith('john.doe@university.edu');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: validationResult
      });
    });

    it('should handle validation errors', async () => {
      const validationResult = {
        isValid: false,
        errors: ['University not found for the provided email domain'],
        warnings: []
      };

      mockRequest.body = { email: 'john.doe@invalid-university.com' };

      (mockUniversitySync.validateUniversityEmail as jest.Mock).mockResolvedValue(validationResult);

      await profileController.validateUniversityEmail(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'University not found for the provided email domain'
      });
    });
  });

  describe('getUniversities', () => {
    it('should get universities successfully', async () => {
      const universities: UniversityProfile[] = [
        {
          id: 'university-123',
          name: 'University of Technology',
          domain: 'university.edu',
          country: 'United States',
          status: 'active',
          approved: true,
          allowStudentNetworking: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'university-456',
          name: 'State University',
          domain: 'state.edu',
          country: 'United States',
          status: 'active',
          approved: true,
          allowStudentNetworking: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockRequest.query = { country: 'United States' };

      (mockUniversitySync.getUniversitiesByCountry as jest.Mock).mockResolvedValue(universities);

      await profileController.getUniversities(mockRequest, mockResponse);

      expect(mockUniversitySync.getUniversitiesByCountry).toHaveBeenCalledWith('United States');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: universities
      });
    });

    it('should search universities successfully', async () => {
      const universities: UniversityProfile[] = [
        {
          id: 'university-123',
          name: 'University of Technology',
          domain: 'university.edu',
          country: 'United States',
          status: 'active',
          approved: true,
          allowStudentNetworking: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockRequest.query = { search: 'technology' };

      (mockUniversitySync.searchUniversities as jest.Mock).mockResolvedValue(universities);

      await profileController.getUniversities(mockRequest, mockResponse);

      expect(mockUniversitySync.searchUniversities).toHaveBeenCalledWith('technology');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: universities
      });
    });

    it('should get all approved universities', async () => {
      const universities: UniversityProfile[] = [
        {
          id: 'university-123',
          name: 'University of Technology',
          domain: 'university.edu',
          country: 'United States',
          status: 'active',
          approved: true,
          allowStudentNetworking: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockRequest.query = {};

      (mockUniversitySync.getApprovedUniversities as jest.Mock).mockResolvedValue(universities);

      await profileController.getUniversities(mockRequest, mockResponse);

      expect(mockUniversitySync.getApprovedUniversities).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: universities
      });
    });
  });

  describe('getUniversityStatistics', () => {
    it('should get university statistics successfully', async () => {
      const statistics = {
        totalStudents: 1000,
        activeStudents: 800,
        verifiedStudents: 750,
        averageCompletionScore: 75,
        topMajors: [
          { major: 'Computer Science', count: 200 },
          { major: 'Data Science', count: 150 }
        ],
        academicYearDistribution: [
          { year: 2024, count: 300 },
          { year: 2025, count: 250 }
        ]
      };

      mockRequest.params = { universityId: 'university-123' };

      (mockUniversitySync.getUniversityStatistics as jest.Mock).mockResolvedValue(statistics);

      await profileController.getUniversityStatistics(mockRequest, mockResponse);

      expect(mockUniversitySync.getUniversityStatistics).toHaveBeenCalledWith('university-123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: statistics
      });
    });

    it('should handle university not found', async () => {
      mockRequest.params = { universityId: 'nonexistent' };

      (mockUniversitySync.getUniversityStatistics as jest.Mock).mockRejectedValue(
        new CustomError('University not found', 404)
      );

      await profileController.getUniversityStatistics(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'University not found'
      });
    });
  });
});
