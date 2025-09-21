import { UserProfile } from '../models/UserProfile';
import { ProfileUpdateData } from '../models/UserProfile';

export interface CompletionDetails {
  score: number;
  maxScore: number;
  percentage: number;
  missingFields: string[];
  completedFields: string[];
  recommendations: string[];
  nextSteps: string[];
}

export interface CompletionField {
  field: string;
  weight: number;
  required: boolean;
  description: string;
  category: 'basic' | 'academic' | 'social' | 'contact' | 'media';
}

export class ProfileCompletionService {
  private readonly COMPLETION_FIELDS: CompletionField[] = [
    // Basic Information (40 points)
    { field: 'username', weight: 5, required: true, description: 'Username', category: 'basic' },
    { field: 'displayName', weight: 5, required: true, description: 'Display Name', category: 'basic' },
    { field: 'bio', weight: 10, required: false, description: 'Biography', category: 'basic' },
    { field: 'profilePicture', weight: 10, required: false, description: 'Profile Picture', category: 'media' },
    { field: 'coverPhoto', weight: 5, required: false, description: 'Cover Photo', category: 'media' },
    { field: 'profileLink', weight: 5, required: false, description: 'Profile Link', category: 'basic' },

    // University Information (30 points)
    { field: 'universityId', weight: 10, required: true, description: 'University', category: 'academic' },
    { field: 'universityEmail', weight: 5, required: true, description: 'University Email', category: 'academic' },
    { field: 'major', weight: 8, required: false, description: 'Major', category: 'academic' },
    { field: 'academicYear', weight: 4, required: false, description: 'Academic Year', category: 'academic' },
    { field: 'graduationYear', weight: 3, required: false, description: 'Graduation Year', category: 'academic' },

    // Academic Details (15 points)
    { field: 'minor', weight: 3, required: false, description: 'Minor', category: 'academic' },
    { field: 'department', weight: 4, required: false, description: 'Department', category: 'academic' },
    { field: 'faculty', weight: 4, required: false, description: 'Faculty', category: 'academic' },
    { field: 'studentId', weight: 4, required: false, description: 'Student ID', category: 'academic' },

    // Contact Information (10 points)
    { field: 'email', weight: 3, required: false, description: 'Email', category: 'contact' },
    { field: 'phone', weight: 3, required: false, description: 'Phone', category: 'contact' },
    { field: 'city', weight: 2, required: false, description: 'City', category: 'contact' },
    { field: 'country', weight: 2, required: false, description: 'Country', category: 'contact' },

    // Social Links (5 points)
    { field: 'linkedin', weight: 2, required: false, description: 'LinkedIn', category: 'social' },
    { field: 'github', weight: 2, required: false, description: 'GitHub', category: 'social' },
    { field: 'twitter', weight: 1, required: false, description: 'Twitter', category: 'social' },
    { field: 'website', weight: 1, required: false, description: 'Website', category: 'social' },

    // Additional Fields (5 points)
    { field: 'timezone', weight: 2, required: false, description: 'Timezone', category: 'contact' },
    { field: 'interests', weight: 3, required: false, description: 'Interests', category: 'basic' }
  ];

  private readonly MAX_SCORE = 100;
  private readonly MIN_SCORE_FOR_RECOMMENDATIONS = 60;

  /**
   * Calculate profile completion score
   */
  public async calculateCompletionScore(profile: UserProfile): Promise<number> {
    let score = 0;
    let maxScore = 0;

    for (const field of this.COMPLETION_FIELDS) {
      maxScore += field.weight;
      
      if (this.isFieldCompleted(profile, field.field)) {
        score += field.weight;
      }
    }

    // Ensure score doesn't exceed maximum
    return Math.min(score, this.MAX_SCORE);
  }

  /**
   * Get detailed completion information
   */
  public async getCompletionDetails(profile: UserProfile): Promise<CompletionDetails> {
    const score = await this.calculateCompletionScore(profile);
    const missingFields = this.getMissingFields(profile);
    const completedFields = this.getCompletedFields(profile);
    const recommendations = this.generateRecommendations(profile, missingFields);
    const nextSteps = this.generateNextSteps(profile, missingFields);

    return {
      score,
      maxScore: this.MAX_SCORE,
      percentage: Math.round((score / this.MAX_SCORE) * 100),
      missingFields,
      completedFields,
      recommendations,
      nextSteps
    };
  }

  /**
   * Get completion score for specific category
   */
  public async getCategoryCompletionScore(profile: UserProfile, category: string): Promise<number> {
    const categoryFields = this.COMPLETION_FIELDS.filter(field => field.category === category);
    let score = 0;
    let maxScore = 0;

    for (const field of categoryFields) {
      maxScore += field.weight;
      
      if (this.isFieldCompleted(profile, field.field)) {
        score += field.weight;
      }
    }

    return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  }

  /**
   * Get completion breakdown by category
   */
  public async getCompletionBreakdown(profile: UserProfile): Promise<Record<string, number>> {
    const categories = ['basic', 'academic', 'social', 'contact', 'media'];
    const breakdown: Record<string, number> = {};

    for (const category of categories) {
      breakdown[category] = await this.getCategoryCompletionScore(profile, category);
    }

    return breakdown;
  }

  /**
   * Get fields that need attention
   */
  public async getFieldsNeedingAttention(profile: UserProfile): Promise<CompletionField[]> {
    const missingFields = this.getMissingFields(profile);
    const fieldsNeedingAttention: CompletionField[] = [];

    for (const fieldName of missingFields) {
      const field = this.COMPLETION_FIELDS.find(f => f.field === fieldName);
      if (field) {
        fieldsNeedingAttention.push(field);
      }
    }

    // Sort by weight (highest first) and required status
    return fieldsNeedingAttention.sort((a, b) => {
      if (a.required && !b.required) return -1;
      if (!a.required && b.required) return 1;
      return b.weight - a.weight;
    });
  }

  /**
   * Get completion progress for a specific field
   */
  public getFieldProgress(profile: UserProfile, fieldName: string): {
    completed: boolean;
    weight: number;
    description: string;
    category: string;
    required: boolean;
  } {
    const field = this.COMPLETION_FIELDS.find(f => f.field === fieldName);
    if (!field) {
      throw new Error(`Field ${fieldName} not found in completion fields`);
    }

    return {
      completed: this.isFieldCompleted(profile, fieldName),
      weight: field.weight,
      description: field.description,
      category: field.category,
      required: field.required
    };
  }

  /**
   * Calculate completion score for updates
   */
  public async calculateCompletionScoreForUpdates(
    currentProfile: UserProfile,
    updates: ProfileUpdateData
  ): Promise<number> {
    // Create a temporary profile with updates applied
    const updatedProfile = { ...currentProfile, ...updates };
    return await this.calculateCompletionScore(updatedProfile);
  }

  /**
   * Get completion milestones
   */
  public getCompletionMilestones(): Array<{
    percentage: number;
    title: string;
    description: string;
    rewards: string[];
  }> {
    return [
      {
        percentage: 25,
        title: 'Getting Started',
        description: 'You\'ve completed the basics of your profile',
        rewards: ['Profile is discoverable', 'Can receive friend requests']
      },
      {
        percentage: 50,
        title: 'Halfway There',
        description: 'Your profile is looking good!',
        rewards: ['Enhanced search visibility', 'University network access']
      },
      {
        percentage: 75,
        title: 'Almost Complete',
        description: 'Your profile is nearly finished',
        rewards: ['Priority in recommendations', 'Advanced features unlocked']
      },
      {
        percentage: 100,
        title: 'Profile Master',
        description: 'Your profile is complete and optimized',
        rewards: ['Maximum visibility', 'All features unlocked', 'Profile verification eligible']
      }
    ];
  }

  /**
   * Get next milestone
   */
  public async getNextMilestone(profile: UserProfile): Promise<{
    percentage: number;
    title: string;
    description: string;
    rewards: string[];
    currentPercentage: number;
    pointsNeeded: number;
  } | null> {
    const currentScore = await this.calculateCompletionScore(profile);
    const currentPercentage = Math.round((currentScore / this.MAX_SCORE) * 100);
    
    const milestones = this.getCompletionMilestones();
    const nextMilestone = milestones.find(milestone => milestone.percentage > currentPercentage);
    
    if (!nextMilestone) {
      return null; // Profile is already at maximum completion
    }

    const pointsNeeded = Math.ceil((nextMilestone.percentage / 100) * this.MAX_SCORE) - currentScore;

    return {
      ...nextMilestone,
      currentPercentage,
      pointsNeeded
    };
  }

  /**
   * Get completion statistics
   */
  public async getCompletionStatistics(profile: UserProfile): Promise<{
    totalFields: number;
    completedFields: number;
    requiredFields: number;
    completedRequiredFields: number;
    optionalFields: number;
    completedOptionalFields: number;
    completionRate: number;
    requiredCompletionRate: number;
  }> {
    const totalFields = this.COMPLETION_FIELDS.length;
    const completedFields = this.getCompletedFields(profile).length;
    const requiredFields = this.COMPLETION_FIELDS.filter(field => field.required).length;
    const completedRequiredFields = this.COMPLETION_FIELDS.filter(field => 
      field.required && this.isFieldCompleted(profile, field.field)
    ).length;
    const optionalFields = totalFields - requiredFields;
    const completedOptionalFields = completedFields - completedRequiredFields;

    return {
      totalFields,
      completedFields,
      requiredFields,
      completedRequiredFields,
      optionalFields,
      completedOptionalFields,
      completionRate: Math.round((completedFields / totalFields) * 100),
      requiredCompletionRate: Math.round((completedRequiredFields / requiredFields) * 100)
    };
  }

  // Private helper methods

  private isFieldCompleted(profile: UserProfile, fieldName: string): boolean {
    const value = profile[fieldName as keyof UserProfile];
    
    if (value === undefined || value === null) {
      return false;
    }

    // Handle different data types
    if (typeof value === 'string') {
      return value.trim().length > 0;
    }

    if (typeof value === 'number') {
      return value > 0;
    }

    if (Array.isArray(value)) {
      return value.length > 0;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    return true;
  }

  private getMissingFields(profile: UserProfile): string[] {
    return this.COMPLETION_FIELDS
      .filter(field => !this.isFieldCompleted(profile, field.field))
      .map(field => field.field);
  }

  private getCompletedFields(profile: UserProfile): string[] {
    return this.COMPLETION_FIELDS
      .filter(field => this.isFieldCompleted(profile, field.field))
      .map(field => field.field);
  }

  private generateRecommendations(profile: UserProfile, missingFields: string[]): string[] {
    const recommendations: string[] = [];

    // High-priority recommendations
    if (missingFields.includes('profilePicture')) {
      recommendations.push('Add a profile picture to make your profile more personal and trustworthy');
    }

    if (missingFields.includes('bio')) {
      recommendations.push('Write a bio to tell others about yourself and your interests');
    }

    if (missingFields.includes('major')) {
      recommendations.push('Add your major to connect with students in the same field');
    }

    if (missingFields.includes('academicYear')) {
      recommendations.push('Specify your academic year to find peers at the same stage');
    }

    // Medium-priority recommendations
    if (missingFields.includes('linkedin')) {
      recommendations.push('Add your LinkedIn profile to showcase your professional background');
    }

    if (missingFields.includes('github')) {
      recommendations.push('Share your GitHub profile to showcase your coding projects');
    }

    if (missingFields.includes('city')) {
      recommendations.push('Add your city to connect with local students and events');
    }

    // Low-priority recommendations
    if (missingFields.includes('website')) {
      recommendations.push('Add your personal website to share more about yourself');
    }

    if (missingFields.includes('twitter')) {
      recommendations.push('Connect your Twitter account to share your thoughts and updates');
    }

    if (missingFields.includes('interests')) {
      recommendations.push('Add your interests to discover like-minded people');
    }

    return recommendations.slice(0, 5); // Limit to 5 recommendations
  }

  private generateNextSteps(profile: UserProfile, missingFields: string[]): string[] {
    const nextSteps: string[] = [];

    // Prioritize required fields
    const requiredMissingFields = this.COMPLETION_FIELDS
      .filter(field => field.required && missingFields.includes(field.field))
      .sort((a, b) => b.weight - a.weight);

    for (const field of requiredMissingFields.slice(0, 3)) {
      nextSteps.push(`Complete your ${field.description.toLowerCase()}`);
    }

    // Add high-value optional fields
    const optionalMissingFields = this.COMPLETION_FIELDS
      .filter(field => !field.required && missingFields.includes(field.field))
      .sort((a, b) => b.weight - a.weight);

    for (const field of optionalMissingFields.slice(0, 2)) {
      nextSteps.push(`Add your ${field.description.toLowerCase()}`);
    }

    return nextSteps;
  }
}
