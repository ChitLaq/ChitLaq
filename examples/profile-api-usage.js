/**
 * ChitLaq Profile API Usage Examples
 * 
 * This file demonstrates how to use the ChitLaq Profile API
 * for various operations including profile management, privacy controls,
 * and university integration.
 */

const axios = require('axios');

// Configuration
const API_BASE_URL = process.env.CHITLAQ_API_URL || 'https://api.chitlaq.com';
const API_KEY = process.env.CHITLAQ_API_KEY;

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
  }
});

/**
 * Example 1: Create a new user profile
 */
async function createProfile() {
  try {
    const profileData = {
      displayName: 'John Doe',
      universityEmail: 'john.doe@university.edu',
      username: 'johndoe',
      bio: 'Computer Science student passionate about AI and machine learning',
      major: 'Computer Science',
      minor: 'Mathematics',
      department: 'Computer Science Department',
      faculty: 'Engineering Faculty',
      academicYear: 3,
      graduationYear: 2025,
      studentId: 'CS2021001',
      city: 'New York',
      country: 'US',
      timezone: 'America/New_York',
      linkedin: 'johndoe',
      github: 'johndoe',
      twitter: 'johndoe',
      website: 'https://johndoe.dev',
      profilePicture: 'https://example.com/profile.jpg',
      coverPhoto: 'https://example.com/cover.jpg',
      // Privacy settings
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
      contactVisibility: 'friends',
      academicVisibility: 'university',
      socialVisibility: 'university',
      locationVisibility: 'university',
      activityVisibility: 'university'
    };

    const response = await api.post('/api/profiles', profileData);
    console.log('Profile created successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error creating profile:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Example 2: Get user profile by ID
 */
async function getProfile(userId) {
  try {
    const response = await api.get(`/api/profiles/${userId}`);
    console.log('Profile retrieved successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error retrieving profile:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Example 3: Update user profile
 */
async function updateProfile(userId, updates) {
  try {
    const response = await api.put(`/api/profiles/${userId}`, updates);
    console.log('Profile updated successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error updating profile:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Example 4: Delete user profile
 */
async function deleteProfile(userId) {
  try {
    await api.delete(`/api/profiles/${userId}`);
    console.log('Profile deleted successfully');
  } catch (error) {
    console.error('Error deleting profile:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Example 5: Search profiles
 */
async function searchProfiles(query, options = {}) {
  try {
    const params = {
      q: query,
      limit: options.limit || 10,
      offset: options.offset || 0,
      university: options.university,
      major: options.major,
      academicYear: options.academicYear,
      graduationYear: options.graduationYear,
      city: options.city,
      country: options.country
    };

    const response = await api.get('/api/profiles/search', { params });
    console.log('Search results:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error searching profiles:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Example 6: Get privacy settings
 */
async function getPrivacySettings(userId) {
  try {
    const response = await api.get(`/api/profiles/${userId}/privacy`);
    console.log('Privacy settings retrieved:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error retrieving privacy settings:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Example 7: Update privacy settings
 */
async function updatePrivacySettings(userId, privacySettings) {
  try {
    const response = await api.put(`/api/profiles/${userId}/privacy`, privacySettings);
    console.log('Privacy settings updated:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error updating privacy settings:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Example 8: Get audit logs
 */
async function getAuditLogs(userId, options = {}) {
  try {
    const params = {
      startDate: options.startDate,
      endDate: options.endDate,
      action: options.action,
      limit: options.limit || 50,
      offset: options.offset || 0
    };

    const response = await api.get(`/api/profiles/${userId}/audit-logs`, { params });
    console.log('Audit logs retrieved:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error retrieving audit logs:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Example 9: Create data access request
 */
async function createDataAccessRequest(requestData) {
  try {
    const response = await api.post('/api/data-access-requests', requestData);
    console.log('Data access request created:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error creating data access request:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Example 10: Get universities
 */
async function getUniversities(options = {}) {
  try {
    const params = {
      country: options.country,
      status: options.status,
      approved: options.approved,
      limit: options.limit || 50,
      offset: options.offset || 0
    };

    const response = await api.get('/api/universities', { params });
    console.log('Universities retrieved:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error retrieving universities:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Example 11: Get university by ID
 */
async function getUniversity(universityId) {
  try {
    const response = await api.get(`/api/universities/${universityId}`);
    console.log('University retrieved:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error retrieving university:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Example 12: Verify profile (admin only)
 */
async function verifyProfile(userId, isVerified) {
  try {
    const response = await api.put(`/api/profiles/${userId}/verify`, { isVerified });
    console.log('Profile verification updated:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error updating profile verification:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Example 13: Get profile statistics
 */
async function getProfileStatistics(userId) {
  try {
    const response = await api.get(`/api/profiles/${userId}/statistics`);
    console.log('Profile statistics:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error retrieving profile statistics:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Example 14: Upload profile picture
 */
async function uploadProfilePicture(userId, imageFile) {
  try {
    const formData = new FormData();
    formData.append('image', imageFile);

    const response = await api.post(`/api/profiles/${userId}/picture`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    console.log('Profile picture uploaded:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error uploading profile picture:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Example 15: Upload cover photo
 */
async function uploadCoverPhoto(userId, imageFile) {
  try {
    const formData = new FormData();
    formData.append('image', imageFile);

    const response = await api.post(`/api/profiles/${userId}/cover`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    console.log('Cover photo uploaded:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error uploading cover photo:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Example 16: Get profile completion score
 */
async function getProfileCompletionScore(userId) {
  try {
    const response = await api.get(`/api/profiles/${userId}/completion`);
    console.log('Profile completion score:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error retrieving profile completion score:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Example 17: Get profile recommendations
 */
async function getProfileRecommendations(userId, options = {}) {
  try {
    const params = {
      type: options.type || 'all', // 'all', 'academic', 'social', 'location'
      limit: options.limit || 10,
      offset: options.offset || 0
    };

    const response = await api.get(`/api/profiles/${userId}/recommendations`, { params });
    console.log('Profile recommendations:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error retrieving profile recommendations:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Example 18: Export profile data
 */
async function exportProfileData(userId, format = 'json') {
  try {
    const response = await api.get(`/api/profiles/${userId}/export`, {
      params: { format },
      responseType: 'blob'
    });
    console.log('Profile data exported successfully');
    return response.data;
  } catch (error) {
    console.error('Error exporting profile data:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Example 19: Import profile data
 */
async function importProfileData(userId, data, format = 'json') {
  try {
    const response = await api.post(`/api/profiles/${userId}/import`, data, {
      headers: {
        'Content-Type': format === 'json' ? 'application/json' : 'text/csv'
      }
    });
    console.log('Profile data imported successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error importing profile data:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Example 20: Get profile activity
 */
async function getProfileActivity(userId, options = {}) {
  try {
    const params = {
      startDate: options.startDate,
      endDate: options.endDate,
      type: options.type, // 'views', 'searches', 'updates', 'all'
      limit: options.limit || 50,
      offset: options.offset || 0
    };

    const response = await api.get(`/api/profiles/${userId}/activity`, { params });
    console.log('Profile activity:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error retrieving profile activity:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Example 21: Complete workflow - Create and manage a profile
 */
async function completeProfileWorkflow() {
  try {
    console.log('=== Complete Profile Workflow ===');

    // 1. Create profile
    console.log('\n1. Creating profile...');
    const profile = await createProfile();
    const userId = profile.userId;

    // 2. Get profile
    console.log('\n2. Retrieving profile...');
    await getProfile(userId);

    // 3. Update profile
    console.log('\n3. Updating profile...');
    const updates = {
      bio: 'Updated bio with more information about my interests',
      major: 'Computer Science',
      minor: 'Mathematics',
      linkedin: 'johndoe',
      github: 'johndoe',
      showSocialLinks: true,
      socialVisibility: 'university'
    };
    await updateProfile(userId, updates);

    // 4. Update privacy settings
    console.log('\n4. Updating privacy settings...');
    const privacySettings = {
      showEmail: false,
      showPhone: false,
      showLocation: true,
      showAcademicInfo: true,
      showSocialLinks: true,
      profileVisibility: 'university',
      contactVisibility: 'friends',
      academicVisibility: 'university',
      socialVisibility: 'university',
      locationVisibility: 'university',
      activityVisibility: 'university'
    };
    await updatePrivacySettings(userId, privacySettings);

    // 5. Get profile completion score
    console.log('\n5. Getting profile completion score...');
    await getProfileCompletionScore(userId);

    // 6. Search for similar profiles
    console.log('\n6. Searching for similar profiles...');
    await searchProfiles('computer science', {
      university: profile.universityId,
      major: 'Computer Science',
      academicYear: 3
    });

    // 7. Get profile recommendations
    console.log('\n7. Getting profile recommendations...');
    await getProfileRecommendations(userId, {
      type: 'academic',
      limit: 5
    });

    // 8. Get profile statistics
    console.log('\n8. Getting profile statistics...');
    await getProfileStatistics(userId);

    // 9. Get audit logs
    console.log('\n9. Getting audit logs...');
    await getAuditLogs(userId, {
      limit: 10
    });

    // 10. Export profile data
    console.log('\n10. Exporting profile data...');
    await exportProfileData(userId, 'json');

    console.log('\n=== Profile workflow completed successfully ===');
    return profile;
  } catch (error) {
    console.error('Error in complete profile workflow:', error);
    throw error;
  }
}

/**
 * Example 22: Error handling and retry logic
 */
async function createProfileWithRetry(profileData, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt} to create profile...`);
      const response = await api.post('/api/profiles', profileData);
      console.log('Profile created successfully on attempt', attempt);
      return response.data;
    } catch (error) {
      lastError = error;
      console.error(`Attempt ${attempt} failed:`, error.response?.data || error.message);
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.log(`Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

/**
 * Example 23: Batch operations
 */
async function batchUpdateProfiles(updates) {
  try {
    const promises = updates.map(update => 
      updateProfile(update.userId, update.data)
    );
    
    const results = await Promise.allSettled(promises);
    
    const successful = results.filter(result => result.status === 'fulfilled');
    const failed = results.filter(result => result.status === 'rejected');
    
    console.log(`Batch update completed: ${successful.length} successful, ${failed.length} failed`);
    
    return {
      successful: successful.map(result => result.value),
      failed: failed.map(result => result.reason)
    };
  } catch (error) {
    console.error('Error in batch update:', error);
    throw error;
  }
}

/**
 * Example 24: Rate limiting handling
 */
async function createProfileWithRateLimit(profileData) {
  try {
    const response = await api.post('/api/profiles', profileData);
    return response.data;
  } catch (error) {
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      console.log(`Rate limited. Retrying after ${retryAfter} seconds...`);
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      return createProfileWithRateLimit(profileData);
    }
    throw error;
  }
}

// Export all functions for use in other modules
module.exports = {
  createProfile,
  getProfile,
  updateProfile,
  deleteProfile,
  searchProfiles,
  getPrivacySettings,
  updatePrivacySettings,
  getAuditLogs,
  createDataAccessRequest,
  getUniversities,
  getUniversity,
  verifyProfile,
  getProfileStatistics,
  uploadProfilePicture,
  uploadCoverPhoto,
  getProfileCompletionScore,
  getProfileRecommendations,
  exportProfileData,
  importProfileData,
  getProfileActivity,
  completeProfileWorkflow,
  createProfileWithRetry,
  batchUpdateProfiles,
  createProfileWithRateLimit
};

// Example usage
if (require.main === module) {
  // Run the complete workflow example
  completeProfileWorkflow()
    .then(profile => {
      console.log('Workflow completed successfully with profile:', profile.userId);
    })
    .catch(error => {
      console.error('Workflow failed:', error);
      process.exit(1);
    });
}
