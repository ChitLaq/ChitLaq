import { UserProfile, ProfileUpdateData } from '../hooks/use-profile';

export interface ProfileValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ProfileCompletionData {
  percentage: number;
  completedFields: string[];
  missingFields: string[];
  requiredFields: string[];
  optionalFields: string[];
}

export interface ProfileStats {
  totalViews: number;
  profileViews: number;
  postViews: number;
  engagementRate: number;
  followerGrowth: number;
  postGrowth: number;
}

export interface ProfileAnalytics {
  views: {
    daily: number[];
    weekly: number[];
    monthly: number[];
  };
  engagement: {
    likes: number;
    comments: number;
    shares: number;
    saves: number;
  };
  demographics: {
    ageGroups: Record<string, number>;
    locations: Record<string, number>;
    universities: Record<string, number>;
  };
}

export interface ProfileRecommendation {
  type: 'field' | 'privacy' | 'content' | 'engagement';
  title: string;
  description: string;
  action: string;
  priority: 'high' | 'medium' | 'low';
  impact: number;
}

export class ProfileUtils {
  /**
   * Validate profile data
   */
  static validateProfile(data: ProfileUpdateData): ProfileValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Username validation
    if (data.username !== undefined) {
      if (!data.username || data.username.trim().length === 0) {
        errors.push('Username is required');
      } else if (data.username.length < 3) {
        errors.push('Username must be at least 3 characters long');
      } else if (data.username.length > 30) {
        errors.push('Username must be less than 30 characters');
      } else if (!/^[a-zA-Z0-9_]+$/.test(data.username)) {
        errors.push('Username can only contain letters, numbers, and underscores');
      } else if (data.username.startsWith('_') || data.username.endsWith('_')) {
        warnings.push('Username should not start or end with underscore');
      }
    }

    // Bio validation
    if (data.bio !== undefined) {
      if (data.bio && data.bio.length > 500) {
        errors.push('Bio must be less than 500 characters');
      } else if (data.bio && data.bio.length < 10) {
        warnings.push('Bio should be at least 10 characters for better engagement');
      }
    }

    // Email validation
    if (data.email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        errors.push('Invalid email format');
      }
    }

    // Phone validation
    if (data.phone !== undefined && data.phone) {
      const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
      if (!phoneRegex.test(data.phone)) {
        errors.push('Invalid phone number format');
      }
    }

    // Website validation
    if (data.website !== undefined && data.website) {
      try {
        new URL(data.website);
      } catch {
        errors.push('Invalid website URL');
      }
    }

    // Social links validation
    if (data.socialLinks) {
      Object.entries(data.socialLinks).forEach(([platform, url]) => {
        if (url) {
          try {
            new URL(url);
          } catch {
            errors.push(`Invalid ${platform} URL`);
          }
        }
      });
    }

    // Interests validation
    if (data.interests !== undefined) {
      if (data.interests.length > 10) {
        errors.push('You can select up to 10 interests');
      } else if (data.interests.length < 3) {
        warnings.push('Adding more interests helps others discover your profile');
      }
    }

    // University validation
    if (data.university !== undefined && data.university) {
      const validUniversities = [
        'MIT', 'Stanford', 'Harvard', 'Berkeley', 'Caltech',
        'Princeton', 'Yale', 'Columbia', 'Chicago', 'Penn'
      ];
      if (!validUniversities.includes(data.university)) {
        warnings.push('University not found in our database');
      }
    }

    // Academic year validation
    if (data.academicYear !== undefined && data.academicYear) {
      const validYears = ['Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate', 'PhD'];
      if (!validYears.includes(data.academicYear)) {
        errors.push('Invalid academic year');
      }
    }

    // Location validation
    if (data.location !== undefined && data.location) {
      if (data.location.length < 2) {
        errors.push('Location must be at least 2 characters');
      }
    }

    // Birth date validation
    if (data.birthDate !== undefined && data.birthDate) {
      const birthDate = new Date(data.birthDate);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      
      if (age < 13) {
        errors.push('You must be at least 13 years old');
      } else if (age > 100) {
        warnings.push('Please verify your birth date');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Calculate profile completion
   */
  static calculateProfileCompletion(profile: UserProfile): ProfileCompletionData {
    const fields = [
      { key: 'username', required: true, value: profile.username },
      { key: 'bio', required: false, value: profile.bio },
      { key: 'avatar', required: false, value: profile.avatar },
      { key: 'university', required: true, value: profile.university },
      { key: 'academicYear', required: false, value: profile.academicYear },
      { key: 'interests', required: false, value: profile.interests && profile.interests.length > 0 },
      { key: 'location', required: false, value: profile.location },
      { key: 'birthDate', required: false, value: profile.birthDate }
    ];

    const completedFields = fields.filter(field => field.value).map(field => field.key);
    const missingFields = fields.filter(field => !field.value).map(field => field.key);
    const requiredFields = fields.filter(field => field.required).map(field => field.key);
    const optionalFields = fields.filter(field => !field.required).map(field => field.key);

    const percentage = Math.round((completedFields.length / fields.length) * 100);

    return {
      percentage,
      completedFields,
      missingFields,
      requiredFields,
      optionalFields
    };
  }

  /**
   * Generate profile recommendations
   */
  static generateRecommendations(profile: UserProfile): ProfileRecommendation[] {
    const recommendations: ProfileRecommendation[] = [];
    const completion = this.calculateProfileCompletion(profile);

    // Field completion recommendations
    if (!profile.bio) {
      recommendations.push({
        type: 'field',
        title: 'Add a Bio',
        description: 'Tell others about yourself to increase profile engagement',
        action: 'Add bio',
        priority: 'high',
        impact: 20
      });
    }

    if (!profile.avatar) {
      recommendations.push({
        type: 'field',
        title: 'Add Profile Picture',
        description: 'A profile picture makes your account more trustworthy',
        action: 'Upload avatar',
        priority: 'high',
        impact: 25
      });
    }

    if (!profile.interests || profile.interests.length < 3) {
      recommendations.push({
        type: 'field',
        title: 'Add More Interests',
        description: 'More interests help others discover your profile',
        action: 'Add interests',
        priority: 'medium',
        impact: 15
      });
    }

    if (!profile.location) {
      recommendations.push({
        type: 'field',
        title: 'Add Location',
        description: 'Location helps you connect with nearby users',
        action: 'Add location',
        priority: 'low',
        impact: 10
      });
    }

    // Privacy recommendations
    if (profile.privacy.profileVisibility === 'private') {
      recommendations.push({
        type: 'privacy',
        title: 'Consider Making Profile Public',
        description: 'Public profiles get more engagement and connections',
        action: 'Update privacy',
        priority: 'medium',
        impact: 30
      });
    }

    if (!profile.privacy.showInterests) {
      recommendations.push({
        type: 'privacy',
        title: 'Show Your Interests',
        description: 'Showing interests helps others find common ground',
        action: 'Update privacy',
        priority: 'low',
        impact: 15
      });
    }

    // Content recommendations
    if (profile.stats.posts === 0) {
      recommendations.push({
        type: 'content',
        title: 'Create Your First Post',
        description: 'Start sharing content to engage with your network',
        action: 'Create post',
        priority: 'high',
        impact: 40
      });
    }

    if (profile.stats.posts < 5) {
      recommendations.push({
        type: 'content',
        title: 'Share More Content',
        description: 'Regular posting increases your visibility',
        action: 'Create posts',
        priority: 'medium',
        impact: 25
      });
    }

    // Engagement recommendations
    if (profile.stats.followers < 10) {
      recommendations.push({
        type: 'engagement',
        title: 'Connect with More People',
        description: 'Follow others to build your network',
        action: 'Find connections',
        priority: 'high',
        impact: 35
      });
    }

    if (profile.stats.following < 10) {
      recommendations.push({
        type: 'engagement',
        title: 'Follow More People',
        description: 'Following others helps you discover content',
        action: 'Follow users',
        priority: 'medium',
        impact: 20
      });
    }

    // Sort by priority and impact
    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return b.impact - a.impact;
    });
  }

  /**
   * Format profile data for display
   */
  static formatProfileData(profile: UserProfile): Record<string, any> {
    return {
      ...profile,
      formattedStats: {
        posts: this.formatNumber(profile.stats.posts),
        followers: this.formatNumber(profile.stats.followers),
        following: this.formatNumber(profile.stats.following),
        likes: this.formatNumber(profile.stats.likes),
        comments: this.formatNumber(profile.stats.comments)
      },
      formattedDates: {
        createdAt: this.formatDate(profile.createdAt),
        updatedAt: this.formatDate(profile.updatedAt)
      },
      completion: this.calculateProfileCompletion(profile),
      recommendations: this.generateRecommendations(profile)
    };
  }

  /**
   * Format numbers for display
   */
  static formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  /**
   * Format dates for display
   */
  static formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 2592000) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 31536000) {
      const months = Math.floor(diffInSeconds / 2592000);
      return `${months} month${months > 1 ? 's' : ''} ago`;
    } else {
      const years = Math.floor(diffInSeconds / 31536000);
      return `${years} year${years > 1 ? 's' : ''} ago`;
    }
  }

  /**
   * Generate profile URL
   */
  static generateProfileUrl(username: string): string {
    return `/profile/${username}`;
  }

  /**
   * Extract username from profile URL
   */
  static extractUsernameFromUrl(url: string): string | null {
    const match = url.match(/\/profile\/([^\/]+)/);
    return match ? match[1] : null;
  }

  /**
   * Check if profile is complete enough for public visibility
   */
  static isProfilePublicReady(profile: UserProfile): boolean {
    const completion = this.calculateProfileCompletion(profile);
    return completion.percentage >= 70 && completion.requiredFields.every(field => 
      completion.completedFields.includes(field)
    );
  }

  /**
   * Get profile visibility score
   */
  static getProfileVisibilityScore(profile: UserProfile): number {
    let score = 0;
    
    // Base score from completion
    const completion = this.calculateProfileCompletion(profile);
    score += completion.percentage * 0.4;
    
    // Activity score
    if (profile.stats.posts > 0) score += 20;
    if (profile.stats.followers > 10) score += 20;
    if (profile.stats.following > 10) score += 10;
    
    // Engagement score
    const engagementRate = profile.stats.posts > 0 
      ? (profile.stats.likes + profile.stats.comments) / profile.stats.posts 
      : 0;
    score += Math.min(engagementRate * 10, 20);
    
    return Math.min(score, 100);
  }

  /**
   * Generate profile analytics
   */
  static generateProfileAnalytics(profile: UserProfile): ProfileAnalytics {
    // This would typically come from your analytics service
    return {
      views: {
        daily: Array.from({ length: 30 }, () => Math.floor(Math.random() * 100)),
        weekly: Array.from({ length: 12 }, () => Math.floor(Math.random() * 500)),
        monthly: Array.from({ length: 12 }, () => Math.floor(Math.random() * 2000))
      },
      engagement: {
        likes: profile.stats.likes,
        comments: profile.stats.comments,
        shares: Math.floor(profile.stats.likes * 0.1),
        saves: Math.floor(profile.stats.likes * 0.05)
      },
      demographics: {
        ageGroups: {
          '18-24': Math.floor(profile.stats.followers * 0.4),
          '25-34': Math.floor(profile.stats.followers * 0.3),
          '35-44': Math.floor(profile.stats.followers * 0.2),
          '45+': Math.floor(profile.stats.followers * 0.1)
        },
        locations: {
          'United States': Math.floor(profile.stats.followers * 0.6),
          'Canada': Math.floor(profile.stats.followers * 0.2),
          'United Kingdom': Math.floor(profile.stats.followers * 0.1),
          'Other': Math.floor(profile.stats.followers * 0.1)
        },
        universities: {
          [profile.university || 'Unknown']: Math.floor(profile.stats.followers * 0.8),
          'Other': Math.floor(profile.stats.followers * 0.2)
        }
      }
    };
  }

  /**
   * Export profile data
   */
  static exportProfileData(profile: UserProfile): string {
    const exportData = {
      profile: {
        username: profile.username,
        email: profile.email,
        bio: profile.bio,
        university: profile.university,
        academicYear: profile.academicYear,
        interests: profile.interests,
        location: profile.location,
        birthDate: profile.birthDate,
        phone: profile.phone,
        website: profile.website,
        socialLinks: profile.socialLinks
      },
      stats: profile.stats,
      privacy: profile.privacy,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
      exportedAt: new Date().toISOString()
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import profile data
   */
  static importProfileData(data: string): ProfileUpdateData | null {
    try {
      const parsed = JSON.parse(data);
      return parsed.profile || null;
    } catch (error) {
      return null;
    }
  }
}
