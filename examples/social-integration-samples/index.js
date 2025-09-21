// Social Integration Examples
// Author: ChitLaq Development Team
// Date: 2024-01-15

const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001/api/v1';

if (!SUPABASE_ANON_KEY) {
  console.error('SUPABASE_ANON_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

class ChitLaqSocialIntegration {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.apiClient = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ============================================================================
  // AUTHENTICATION & USER MANAGEMENT
  // ============================================================================

  /**
   * Authenticate user and get access token
   */
  async authenticateUser(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      return {
        user: data.user,
        session: data.session,
        accessToken: data.session.access_token
      };
    } catch (error) {
      console.error('Authentication failed:', error.message);
      throw error;
    }
  }

  /**
   * Register new user with university email
   */
  async registerUser(userData) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            first_name: userData.firstName,
            last_name: userData.lastName,
            university_email: userData.universityEmail
          }
        }
      });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Registration failed:', error.message);
      throw error;
    }
  }

  // ============================================================================
  // SOCIAL RELATIONSHIPS
  // ============================================================================

  /**
   * Follow a user
   */
  async followUser(targetUserId, metadata = {}) {
    try {
      const response = await this.apiClient.post('/social/relationships/follow', {
        targetUserId,
        metadata: {
          source: 'api_integration',
          context: 'programmatic_follow',
          ...metadata
        }
      });

      return response.data;
    } catch (error) {
      console.error('Follow failed:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Unfollow a user
   */
  async unfollowUser(targetUserId) {
    try {
      const response = await this.apiClient.delete('/social/relationships/follow', {
        data: { targetUserId }
      });

      return response.data;
    } catch (error) {
      console.error('Unfollow failed:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Block a user
   */
  async blockUser(targetUserId, reason = 'other', details = '') {
    try {
      const response = await this.apiClient.post('/social/relationships/block', {
        targetUserId,
        reason,
        details
      });

      return response.data;
    } catch (error) {
      console.error('Block failed:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get user's followers
   */
  async getFollowers(userId, options = {}) {
    try {
      const params = new URLSearchParams({
        limit: options.limit || 50,
        offset: options.offset || 0,
        ...options
      });

      const response = await this.apiClient.get(`/social/relationships/${userId}/followers?${params}`);
      return response.data;
    } catch (error) {
      console.error('Get followers failed:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get user's following
   */
  async getFollowing(userId, options = {}) {
    try {
      const params = new URLSearchParams({
        limit: options.limit || 50,
        offset: options.offset || 0,
        ...options
      });

      const response = await this.apiClient.get(`/social/relationships/${userId}/following?${params}`);
      return response.data;
    } catch (error) {
      console.error('Get following failed:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get mutual connections
   */
  async getMutualConnections(userId1, userId2) {
    try {
      const response = await this.apiClient.get(`/social/relationships/mutual/${userId1}/${userId2}`);
      return response.data;
    } catch (error) {
      console.error('Get mutual connections failed:', error.response?.data || error.message);
      throw error;
    }
  }

  // ============================================================================
  // UNIVERSITY NETWORKS
  // ============================================================================

  /**
   * Get university members
   */
  async getUniversityMembers(universityId, options = {}) {
    try {
      const params = new URLSearchParams({
        limit: options.limit || 50,
        offset: options.offset || 0,
        ...options
      });

      const response = await this.apiClient.get(`/social/university/${universityId}/members?${params}`);
      return response.data;
    } catch (error) {
      console.error('Get university members failed:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get department members
   */
  async getDepartmentMembers(universityId, departmentId, options = {}) {
    try {
      const params = new URLSearchParams({
        limit: options.limit || 50,
        offset: options.offset || 0,
        ...options
      });

      const response = await this.apiClient.get(
        `/social/university/${universityId}/departments/${departmentId}/members?${params}`
      );
      return response.data;
    } catch (error) {
      console.error('Get department members failed:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get academic year cohort
   */
  async getAcademicYearCohort(universityId, academicYear, options = {}) {
    try {
      const params = new URLSearchParams({
        limit: options.limit || 50,
        offset: options.offset || 0,
        ...options
      });

      const response = await this.apiClient.get(
        `/social/university/${universityId}/academic-years/${academicYear}/members?${params}`
      );
      return response.data;
    } catch (error) {
      console.error('Get academic year cohort failed:', error.response?.data || error.message);
      throw error;
    }
  }

  // ============================================================================
  // FRIEND RECOMMENDATIONS
  // ============================================================================

  /**
   * Get friend recommendations
   */
  async getFriendRecommendations(options = {}) {
    try {
      const params = new URLSearchParams({
        algorithm: options.algorithm || 'hybrid',
        limit: options.limit || 20,
        excludeFollowing: options.excludeFollowing !== false,
        universityOnly: options.universityOnly || false,
        ...options
      });

      const response = await this.apiClient.get(`/social/recommendations/friends?${params}`);
      return response.data;
    } catch (error) {
      console.error('Get recommendations failed:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Update recommendation preferences
   */
  async updateRecommendationPreferences(preferences) {
    try {
      const response = await this.apiClient.put('/social/recommendations/preferences', preferences);
      return response.data;
    } catch (error) {
      console.error('Update preferences failed:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Provide feedback on recommendations
   */
  async provideRecommendationFeedback(recommendationId, feedback, action) {
    try {
      const response = await this.apiClient.post('/social/recommendations/feedback', {
        recommendationId,
        feedback,
        action
      });

      return response.data;
    } catch (error) {
      console.error('Feedback failed:', error.response?.data || error.message);
      throw error;
    }
  }

  // ============================================================================
  // SOCIAL ANALYTICS
  // ============================================================================

  /**
   * Get user engagement metrics
   */
  async getUserEngagementMetrics(userId, timeRange = '30d') {
    try {
      const response = await this.apiClient.get(`/social/analytics/engagement/${userId}?timeRange=${timeRange}`);
      return response.data;
    } catch (error) {
      console.error('Get engagement metrics failed:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get network growth metrics
   */
  async getNetworkGrowthMetrics(options = {}) {
    try {
      const params = new URLSearchParams({
        timeRange: options.timeRange || '30d',
        universityId: options.universityId || '',
        granularity: options.granularity || 'day',
        ...options
      });

      const response = await this.apiClient.get(`/social/analytics/network/growth?${params}`);
      return response.data;
    } catch (error) {
      console.error('Get network growth failed:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get community health metrics
   */
  async getCommunityHealthMetrics(universityId = null) {
    try {
      const params = universityId ? `?universityId=${universityId}` : '';
      const response = await this.apiClient.get(`/social/analytics/community/health${params}`);
      return response.data;
    } catch (error) {
      console.error('Get community health failed:', error.response?.data || error.message);
      throw error;
    }
  }

  // ============================================================================
  // PRIVACY CONTROLS
  // ============================================================================

  /**
   * Get privacy settings
   */
  async getPrivacySettings() {
    try {
      const response = await this.apiClient.get('/social/privacy/settings');
      return response.data;
    } catch (error) {
      console.error('Get privacy settings failed:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Update privacy settings
   */
  async updatePrivacySettings(settings) {
    try {
      const response = await this.apiClient.put('/social/privacy/settings', settings);
      return response.data;
    } catch (error) {
      console.error('Update privacy settings failed:', error.response?.data || error.message);
      throw error;
    }
  }

  // ============================================================================
  // BULK OPERATIONS
  // ============================================================================

  /**
   * Bulk follow users
   */
  async bulkFollowUsers(targetUserIds, metadata = {}) {
    try {
      const response = await this.apiClient.post('/social/relationships/bulk/follow', {
        targetUserIds,
        metadata: {
          source: 'api_integration',
          context: 'bulk_follow',
          ...metadata
        }
      });

      return response.data;
    } catch (error) {
      console.error('Bulk follow failed:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Bulk unfollow users
   */
  async bulkUnfollowUsers(targetUserIds) {
    try {
      const response = await this.apiClient.delete('/social/relationships/bulk/follow', {
        data: { targetUserIds }
      });

      return response.data;
    } catch (error) {
      console.error('Bulk unfollow failed:', error.response?.data || error.message);
      throw error;
    }
  }

  // ============================================================================
  // REAL-TIME EVENTS
  // ============================================================================

  /**
   * Subscribe to real-time social events
   */
  subscribeToSocialEvents(callback, options = {}) {
    const ws = new WebSocket(`wss://api.chitlaq.com/v1/social/events`);

    ws.onopen = () => {
      // Subscribe to events
      ws.send(JSON.stringify({
        type: 'subscribe',
        events: options.events || ['follow', 'unfollow', 'block', 'post_like', 'post_comment'],
        filters: options.filters || {}
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      callback(data);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed');
    };

    return ws;
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Search users
   */
  async searchUsers(query, options = {}) {
    try {
      const params = new URLSearchParams({
        q: query,
        limit: options.limit || 20,
        universityOnly: options.universityOnly || false,
        ...options
      });

      const response = await this.apiClient.get(`/social/search/users?${params}`);
      return response.data;
    } catch (error) {
      console.error('Search users failed:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get user profile
   */
  async getUserProfile(userId) {
    try {
      const response = await this.apiClient.get(`/social/users/${userId}/profile`);
      return response.data;
    } catch (error) {
      console.error('Get user profile failed:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(userId, profileData) {
    try {
      const response = await this.apiClient.put(`/social/users/${userId}/profile`, profileData);
      return response.data;
    } catch (error) {
      console.error('Update user profile failed:', error.response?.data || error.message);
      throw error;
    }
  }
}

// ============================================================================
// EXAMPLE USAGE
// ============================================================================

async function demonstrateSocialIntegration() {
  console.log('🚀 ChitLaq Social Integration Examples');
  console.log('=====================================\n');

  // Initialize the integration
  const social = new ChitLaqSocialIntegration(process.env.API_KEY);

  try {
    // Example 1: Authentication
    console.log('1. Authenticating user...');
    const authResult = await social.authenticateUser('user@university.edu', 'password123');
    console.log('✅ Authentication successful');
    console.log(`User ID: ${authResult.user.id}\n`);

    // Example 2: Get friend recommendations
    console.log('2. Getting friend recommendations...');
    const recommendations = await social.getFriendRecommendations({
      algorithm: 'hybrid',
      limit: 10,
      universityOnly: true
    });
    console.log(`✅ Found ${recommendations.data.recommendations.length} recommendations`);
    console.log('Top recommendations:');
    recommendations.data.recommendations.slice(0, 3).forEach((rec, index) => {
      console.log(`  ${index + 1}. ${rec.displayName} (@${rec.username}) - Score: ${rec.score.toFixed(2)}`);
    });
    console.log('');

    // Example 3: Follow a user
    if (recommendations.data.recommendations.length > 0) {
      const targetUser = recommendations.data.recommendations[0];
      console.log(`3. Following user: ${targetUser.displayName}...`);
      const followResult = await social.followUser(targetUser.userId, {
        source: 'recommendation',
        context: 'example_integration'
      });
      console.log('✅ Follow successful');
      console.log(`Relationship ID: ${followResult.data.relationshipId}\n`);
    }

    // Example 4: Get university members
    console.log('4. Getting university members...');
    const universityMembers = await social.getUniversityMembers('univ_123', {
      limit: 20,
      department: 'Computer Science'
    });
    console.log(`✅ Found ${universityMembers.data.members.length} university members`);
    console.log('');

    // Example 5: Get engagement metrics
    console.log('5. Getting user engagement metrics...');
    const engagementMetrics = await social.getUserEngagementMetrics(authResult.user.id, '30d');
    console.log('✅ Engagement metrics retrieved');
    console.log(`Profile views: ${engagementMetrics.data.metrics.profileViews}`);
    console.log(`Post views: ${engagementMetrics.data.metrics.postViews}`);
    console.log(`Interactions: ${engagementMetrics.data.metrics.interactions}`);
    console.log(`Engagement rate: ${(engagementMetrics.data.metrics.engagementRate * 100).toFixed(1)}%\n`);

    // Example 6: Get network growth metrics
    console.log('6. Getting network growth metrics...');
    const networkGrowth = await social.getNetworkGrowthMetrics({
      timeRange: '30d',
      granularity: 'day'
    });
    console.log('✅ Network growth metrics retrieved');
    console.log(`Total connections: ${networkGrowth.data.metrics.totalConnections}`);
    console.log(`Net growth: ${networkGrowth.data.metrics.netGrowth}`);
    console.log(`Growth rate: ${(networkGrowth.data.metrics.growthRate * 100).toFixed(2)}%\n`);

    // Example 7: Get community health
    console.log('7. Getting community health metrics...');
    const communityHealth = await social.getCommunityHealthMetrics();
    console.log('✅ Community health metrics retrieved');
    console.log(`Health score: ${communityHealth.data.healthScore}/100`);
    console.log(`Safety score: ${communityHealth.data.safetyMetrics.spamRate}% spam rate`);
    console.log(`Resolution rate: ${communityHealth.data.safetyMetrics.resolutionRate}%\n`);

    // Example 8: Real-time events subscription
    console.log('8. Setting up real-time events subscription...');
    const ws = social.subscribeToSocialEvents((event) => {
      console.log(`📡 Real-time event: ${event.type}`, event.data);
    }, {
      events: ['follow', 'unfollow'],
      filters: { userId: authResult.user.id }
    });
    console.log('✅ Real-time subscription active\n');

    // Example 9: Bulk operations
    console.log('9. Performing bulk follow operation...');
    const targetUserIds = recommendations.data.recommendations.slice(0, 3).map(rec => rec.userId);
    const bulkResult = await social.bulkFollowUsers(targetUserIds, {
      source: 'bulk_operation',
      context: 'example_integration'
    });
    console.log('✅ Bulk follow completed');
    console.log(`Successful: ${bulkResult.data.summary.successful}`);
    console.log(`Failed: ${bulkResult.data.summary.failed}\n`);

    // Example 10: Privacy settings
    console.log('10. Getting privacy settings...');
    const privacySettings = await social.getPrivacySettings();
    console.log('✅ Privacy settings retrieved');
    console.log(`Profile visibility: ${privacySettings.data.profileVisibility}`);
    console.log(`Search visibility: ${privacySettings.data.searchVisibility}\n`);

    console.log('🎉 All examples completed successfully!');

    // Clean up
    setTimeout(() => {
      ws.close();
      console.log('🔌 WebSocket connection closed');
    }, 5000);

  } catch (error) {
    console.error('❌ Example failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// ============================================================================
// ADVANCED EXAMPLES
// ============================================================================

async function demonstrateAdvancedFeatures() {
  console.log('\n🔬 Advanced Social Integration Examples');
  console.log('======================================\n');

  const social = new ChitLaqSocialIntegration(process.env.API_KEY);

  try {
    // Advanced Example 1: University Network Analysis
    console.log('1. University Network Analysis...');
    const universityMembers = await social.getUniversityMembers('univ_123', {
      limit: 100,
      excludeFollowing: true
    });

    // Analyze department distribution
    const departmentStats = {};
    universityMembers.data.members.forEach(member => {
      const dept = member.university.department;
      departmentStats[dept] = (departmentStats[dept] || 0) + 1;
    });

    console.log('Department distribution:');
    Object.entries(departmentStats)
      .sort(([,a], [,b]) => b - a)
      .forEach(([dept, count]) => {
        console.log(`  ${dept}: ${count} members`);
      });
    console.log('');

    // Advanced Example 2: Recommendation Analysis
    console.log('2. Recommendation Algorithm Analysis...');
    const algorithms = ['university', 'mutual', 'interests', 'hybrid'];
    
    for (const algorithm of algorithms) {
      const recommendations = await social.getFriendRecommendations({
        algorithm,
        limit: 10
      });
      
      const avgScore = recommendations.data.recommendations.reduce(
        (sum, rec) => sum + rec.score, 0
      ) / recommendations.data.recommendations.length;
      
      console.log(`${algorithm} algorithm - Average score: ${avgScore.toFixed(3)}`);
    }
    console.log('');

    // Advanced Example 3: Engagement Trend Analysis
    console.log('3. Engagement Trend Analysis...');
    const timeRanges = ['7d', '30d', '90d'];
    
    for (const timeRange of timeRanges) {
      const metrics = await social.getNetworkGrowthMetrics({
        timeRange,
        granularity: 'day'
      });
      
      console.log(`${timeRange} - Net growth: ${metrics.data.metrics.netGrowth}, Growth rate: ${(metrics.data.metrics.growthRate * 100).toFixed(2)}%`);
    }
    console.log('');

    // Advanced Example 4: Community Health Monitoring
    console.log('4. Community Health Monitoring...');
    const healthMetrics = await social.getCommunityHealthMetrics();
    
    console.log('Community Health Report:');
    console.log(`  Overall Health Score: ${healthMetrics.data.healthScore}/100`);
    console.log(`  Safety Metrics:`);
    console.log(`    Spam Rate: ${healthMetrics.data.safetyMetrics.spamRate}%`);
    console.log(`    Abuse Rate: ${healthMetrics.data.safetyMetrics.abuseRate}%`);
    console.log(`    Resolution Rate: ${healthMetrics.data.safetyMetrics.resolutionRate}%`);
    console.log(`  Trends: ${healthMetrics.data.trends.direction} (${healthMetrics.data.trends.changePercent}%)`);
    console.log('');

    console.log('🎯 Advanced examples completed successfully!');

  } catch (error) {
    console.error('❌ Advanced example failed:', error.message);
  }
}

// ============================================================================
// ERROR HANDLING EXAMPLES
// ============================================================================

async function demonstrateErrorHandling() {
  console.log('\n🛡️ Error Handling Examples');
  console.log('==========================\n');

  const social = new ChitLaqSocialIntegration(process.env.API_KEY);

  try {
    // Example 1: Handle authentication errors
    console.log('1. Testing authentication error handling...');
    try {
      await social.authenticateUser('invalid@email.com', 'wrongpassword');
    } catch (error) {
      console.log('✅ Authentication error handled:', error.message);
    }

    // Example 2: Handle API errors
    console.log('2. Testing API error handling...');
    try {
      await social.followUser('invalid_user_id');
    } catch (error) {
      console.log('✅ API error handled:', error.response?.data?.errors?.[0]?.message || error.message);
    }

    // Example 3: Handle rate limiting
    console.log('3. Testing rate limiting...');
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(social.getFriendRecommendations());
    }
    
    try {
      await Promise.all(promises);
    } catch (error) {
      if (error.response?.status === 429) {
        console.log('✅ Rate limiting handled:', error.response.data.message);
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }

    console.log('🛡️ Error handling examples completed!');

  } catch (error) {
    console.error('❌ Error handling example failed:', error.message);
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  // Check if API key is provided
  if (!process.env.API_KEY) {
    console.error('❌ API_KEY environment variable is required');
    console.log('Please set your API key: export API_KEY=your_api_key_here');
    process.exit(1);
  }

  // Run examples
  await demonstrateSocialIntegration();
  await demonstrateAdvancedFeatures();
  await demonstrateErrorHandling();
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = ChitLaqSocialIntegration;
