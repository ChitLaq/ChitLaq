export interface AnalyticsEvent {
  id: string;
  userId: string;
  sessionId: string;
  eventType: EventType;
  timestamp: Date;
  data: EventData;
  metadata: EventMetadata;
  privacy: PrivacySettings;
}

export type EventType = 
  | 'profile_view'
  | 'profile_edit'
  | 'avatar_upload'
  | 'privacy_change'
  | 'university_network_interaction'
  | 'profile_completion_milestone'
  | 'recommendation_view'
  | 'recommendation_implement'
  | 'insight_dismiss'
  | 'analytics_opt_in'
  | 'analytics_opt_out';

export interface EventData {
  [key: string]: any;
  // Common fields
  source?: string; // 'web', 'mobile', 'api'
  url?: string;
  userAgent?: string;
  referrer?: string;
  
  // Profile-specific data
  profileFields?: {
    updatedFields?: string[];
    completionScore?: number;
    universityId?: string;
  };
  
  // Interaction data
  interaction?: {
    targetId?: string;
    targetType?: string;
    duration?: number;
    outcome?: 'success' | 'failure' | 'cancelled';
  };
  
  // Recommendation data
  recommendation?: {
    id?: string;
    type?: string;
    priority?: string;
    stepsCompleted?: number;
    totalSteps?: number;
  };
}

export interface EventMetadata {
  version: string;
  platform: string;
  build: string;
  environment: 'development' | 'staging' | 'production';
  ip: string;
  country?: string;
  region?: string;
  city?: string;
  timezone?: string;
  device?: {
    type: 'desktop' | 'mobile' | 'tablet';
    os: string;
    browser: string;
    screen?: {
      width: number;
      height: number;
    };
  };
}

export interface PrivacySettings {
  anonymized: boolean;
  retentionDays: number;
  consentGiven: boolean;
  purpose: string[];
  legalBasis: 'consent' | 'legitimate_interest' | 'contract' | 'legal_obligation';
  dataCategories: string[];
  processingActivities: string[];
}

export interface ProfileViewEvent extends AnalyticsEvent {
  eventType: 'profile_view';
  data: EventData & {
    profileId: string;
    viewerId: string;
    isOwnProfile: boolean;
    duration: number;
    sectionsViewed: string[];
  };
}

export interface ProfileEditEvent extends AnalyticsEvent {
  eventType: 'profile_edit';
  data: EventData & {
    profileId: string;
    updatedFields: string[];
    previousValues: Record<string, any>;
    newValues: Record<string, any>;
    completionScoreBefore: number;
    completionScoreAfter: number;
  };
}

export interface AvatarUploadEvent extends AnalyticsEvent {
  eventType: 'avatar_upload';
  data: EventData & {
    profileId: string;
    fileSize: number;
    fileType: string;
    processingTime: number;
    success: boolean;
    error?: string;
  };
}

export interface PrivacyChangeEvent extends AnalyticsEvent {
  eventType: 'privacy_change';
  data: EventData & {
    profileId: string;
    changedSettings: string[];
    previousPrivacyLevel: string;
    newPrivacyLevel: string;
    fieldsAffected: string[];
  };
}

export interface UniversityNetworkInteractionEvent extends AnalyticsEvent {
  eventType: 'university_network_interaction';
  data: EventData & {
    profileId: string;
    targetUniversityId: string;
    interactionType: 'view' | 'connect' | 'message' | 'follow';
    targetProfileId?: string;
    success: boolean;
  };
}

export interface ProfileCompletionMilestoneEvent extends AnalyticsEvent {
  eventType: 'profile_completion_milestone';
  data: EventData & {
    profileId: string;
    milestone: number; // percentage
    previousMilestone: number;
    completedFields: string[];
    remainingFields: string[];
    suggestedNextFields: string[];
  };
}

export interface RecommendationViewEvent extends AnalyticsEvent {
  eventType: 'recommendation_view';
  data: EventData & {
    profileId: string;
    recommendationId: string;
    recommendationType: string;
    priority: string;
    source: 'dashboard' | 'email' | 'notification' | 'onboarding';
    timeSpent: number;
  };
}

export interface RecommendationImplementEvent extends AnalyticsEvent {
  eventType: 'recommendation_implement';
  data: EventData & {
    profileId: string;
    recommendationId: string;
    recommendationType: string;
    stepsCompleted: number;
    totalSteps: number;
    implementationTime: number;
    success: boolean;
    outcome?: string;
  };
}

export interface InsightDismissEvent extends AnalyticsEvent {
  eventType: 'insight_dismiss';
  data: EventData & {
    profileId: string;
    insightId: string;
    insightType: string;
    reason?: 'not_relevant' | 'already_implemented' | 'not_interested' | 'other';
    feedback?: string;
  };
}

export interface AnalyticsOptInEvent extends AnalyticsEvent {
  eventType: 'analytics_opt_in';
  data: EventData & {
    profileId: string;
    consentVersion: string;
    purposes: string[];
    dataCategories: string[];
    retentionPeriod: number;
  };
}

export interface AnalyticsOptOutEvent extends AnalyticsEvent {
  eventType: 'analytics_opt_out';
  data: EventData & {
    profileId: string;
    consentVersion: string;
    purposes: string[];
    dataCategories: string[];
    retentionPeriod: number;
    reason?: string;
  };
}

// Event factory functions
export const createProfileViewEvent = (
  userId: string,
  sessionId: string,
  data: ProfileViewEvent['data'],
  metadata: EventMetadata,
  privacy: PrivacySettings
): ProfileViewEvent => ({
  id: generateEventId(),
  userId,
  sessionId,
  eventType: 'profile_view',
  timestamp: new Date(),
  data,
  metadata,
  privacy
});

export const createProfileEditEvent = (
  userId: string,
  sessionId: string,
  data: ProfileEditEvent['data'],
  metadata: EventMetadata,
  privacy: PrivacySettings
): ProfileEditEvent => ({
  id: generateEventId(),
  userId,
  sessionId,
  eventType: 'profile_edit',
  timestamp: new Date(),
  data,
  metadata,
  privacy
});

export const createAvatarUploadEvent = (
  userId: string,
  sessionId: string,
  data: AvatarUploadEvent['data'],
  metadata: EventMetadata,
  privacy: PrivacySettings
): AvatarUploadEvent => ({
  id: generateEventId(),
  userId,
  sessionId,
  eventType: 'avatar_upload',
  timestamp: new Date(),
  data,
  metadata,
  privacy
});

export const createPrivacyChangeEvent = (
  userId: string,
  sessionId: string,
  data: PrivacyChangeEvent['data'],
  metadata: EventMetadata,
  privacy: PrivacySettings
): PrivacyChangeEvent => ({
  id: generateEventId(),
  userId,
  sessionId,
  eventType: 'privacy_change',
  timestamp: new Date(),
  data,
  metadata,
  privacy
});

export const createUniversityNetworkInteractionEvent = (
  userId: string,
  sessionId: string,
  data: UniversityNetworkInteractionEvent['data'],
  metadata: EventMetadata,
  privacy: PrivacySettings
): UniversityNetworkInteractionEvent => ({
  id: generateEventId(),
  userId,
  sessionId,
  eventType: 'university_network_interaction',
  timestamp: new Date(),
  data,
  metadata,
  privacy
});

export const createProfileCompletionMilestoneEvent = (
  userId: string,
  sessionId: string,
  data: ProfileCompletionMilestoneEvent['data'],
  metadata: EventMetadata,
  privacy: PrivacySettings
): ProfileCompletionMilestoneEvent => ({
  id: generateEventId(),
  userId,
  sessionId,
  eventType: 'profile_completion_milestone',
  timestamp: new Date(),
  data,
  metadata,
  privacy
});

export const createRecommendationViewEvent = (
  userId: string,
  sessionId: string,
  data: RecommendationViewEvent['data'],
  metadata: EventMetadata,
  privacy: PrivacySettings
): RecommendationViewEvent => ({
  id: generateEventId(),
  userId,
  sessionId,
  eventType: 'recommendation_view',
  timestamp: new Date(),
  data,
  metadata,
  privacy
});

export const createRecommendationImplementEvent = (
  userId: string,
  sessionId: string,
  data: RecommendationImplementEvent['data'],
  metadata: EventMetadata,
  privacy: PrivacySettings
): RecommendationImplementEvent => ({
  id: generateEventId(),
  userId,
  sessionId,
  eventType: 'recommendation_implement',
  timestamp: new Date(),
  data,
  metadata,
  privacy
});

export const createInsightDismissEvent = (
  userId: string,
  sessionId: string,
  data: InsightDismissEvent['data'],
  metadata: EventMetadata,
  privacy: PrivacySettings
): InsightDismissEvent => ({
  id: generateEventId(),
  userId,
  sessionId,
  eventType: 'insight_dismiss',
  timestamp: new Date(),
  data,
  metadata,
  privacy
});

export const createAnalyticsOptInEvent = (
  userId: string,
  sessionId: string,
  data: AnalyticsOptInEvent['data'],
  metadata: EventMetadata,
  privacy: PrivacySettings
): AnalyticsOptInEvent => ({
  id: generateEventId(),
  userId,
  sessionId,
  eventType: 'analytics_opt_in',
  timestamp: new Date(),
  data,
  metadata,
  privacy
});

export const createAnalyticsOptOutEvent = (
  userId: string,
  sessionId: string,
  data: AnalyticsOptOutEvent['data'],
  metadata: EventMetadata,
  privacy: PrivacySettings
): AnalyticsOptOutEvent => ({
  id: generateEventId(),
  userId,
  sessionId,
  eventType: 'analytics_opt_out',
  timestamp: new Date(),
  data,
  metadata,
  privacy
});

// Utility functions
export const generateEventId = (): string => {
  return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const isProfileEvent = (event: AnalyticsEvent): boolean => {
  return [
    'profile_view',
    'profile_edit',
    'avatar_upload',
    'privacy_change',
    'university_network_interaction',
    'profile_completion_milestone'
  ].includes(event.eventType);
};

export const isRecommendationEvent = (event: AnalyticsEvent): boolean => {
  return [
    'recommendation_view',
    'recommendation_implement',
    'insight_dismiss'
  ].includes(event.eventType);
};

export const isPrivacyEvent = (event: AnalyticsEvent): boolean => {
  return [
    'analytics_opt_in',
    'analytics_opt_out',
    'privacy_change'
  ].includes(event.eventType);
};

export const getEventCategory = (eventType: EventType): string => {
  const categoryMap: Record<string, string[]> = {
    'profile': ['profile_view', 'profile_edit', 'avatar_upload', 'privacy_change', 'profile_completion_milestone'],
    'network': ['university_network_interaction'],
    'recommendation': ['recommendation_view', 'recommendation_implement', 'insight_dismiss'],
    'privacy': ['analytics_opt_in', 'analytics_opt_out']
  };

  for (const [category, events] of Object.entries(categoryMap)) {
    if (events.includes(eventType)) {
      return category;
    }
  }

  return 'other';
};

export const getEventPriority = (eventType: EventType): 'high' | 'medium' | 'low' => {
  const highPriorityEvents: EventType[] = ['analytics_opt_in', 'analytics_opt_out', 'privacy_change'];
  const lowPriorityEvents: EventType[] = ['profile_view'];

  if (highPriorityEvents.includes(eventType)) return 'high';
  if (lowPriorityEvents.includes(eventType)) return 'low';
  return 'medium';
};

export const validateEvent = (event: AnalyticsEvent): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!event.id || typeof event.id !== 'string') {
    errors.push('Event ID is required and must be a string');
  }

  if (!event.userId || typeof event.userId !== 'string') {
    errors.push('User ID is required and must be a string');
  }

  if (!event.sessionId || typeof event.sessionId !== 'string') {
    errors.push('Session ID is required and must be a string');
  }

  if (!event.eventType || typeof event.eventType !== 'string') {
    errors.push('Event type is required and must be a string');
  }

  if (!event.timestamp || !(event.timestamp instanceof Date)) {
    errors.push('Timestamp is required and must be a Date object');
  }

  if (!event.data || typeof event.data !== 'object') {
    errors.push('Data is required and must be an object');
  }

  if (!event.metadata || typeof event.metadata !== 'object') {
    errors.push('Metadata is required and must be an object');
  }

  if (!event.privacy || typeof event.privacy !== 'object') {
    errors.push('Privacy settings are required and must be an object');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

// Default privacy settings
export const getDefaultPrivacySettings = (): PrivacySettings => ({
  anonymized: false,
  retentionDays: 365,
  consentGiven: false,
  purpose: ['analytics', 'personalization', 'improvement'],
  legalBasis: 'consent',
  dataCategories: ['behavioral', 'technical'],
  processingActivities: ['analytics', 'insights_generation']
});

// Event serialization for storage/transmission
export const serializeEvent = (event: AnalyticsEvent): string => {
  return JSON.stringify({
    ...event,
    timestamp: event.timestamp.toISOString()
  });
};

export const deserializeEvent = (serialized: string): AnalyticsEvent => {
  const parsed = JSON.parse(serialized);
  return {
    ...parsed,
    timestamp: new Date(parsed.timestamp)
  };
};
