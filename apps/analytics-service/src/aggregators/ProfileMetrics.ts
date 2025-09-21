import { AnalyticsEvent, EventType, isProfileEvent, isRecommendationEvent, isPrivacyEvent } from '../models/AnalyticsEvent';

export interface ProfileMetrics {
  userId: string;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  startDate: Date;
  endDate: Date;
  generatedAt: Date;
  
  // Profile engagement metrics
  profileViews: {
    total: number;
    unique: number;
    averageDuration: number;
    sectionsViewed: string[];
    topViewingTimes: string[];
  };
  
  profileEdits: {
    total: number;
    fieldsUpdated: string[];
    completionScoreChange: number;
    averageEditDuration: number;
    editFrequency: number;
  };
  
  avatarActivity: {
    uploads: number;
    successfulUploads: number;
    averageProcessingTime: number;
    fileSizeDistribution: {
      small: number; // < 1MB
      medium: number; // 1-5MB
      large: number; // > 5MB
    };
  };
  
  privacyActivity: {
    changes: number;
    settingsModified: string[];
    privacyLevelChanges: number;
    optInEvents: number;
    optOutEvents: number;
  };
  
  universityNetworkActivity: {
    interactions: number;
    connections: number;
    messages: number;
    follows: number;
    topUniversities: Array<{
      universityId: string;
      interactions: number;
    }>;
  };
  
  completionProgress: {
    milestones: number;
    currentScore: number;
    previousScore: number;
    improvement: number;
    completedFields: string[];
    remainingFields: string[];
    suggestedFields: string[];
  };
  
  recommendationEngagement: {
    views: number;
    implementations: number;
    dismissals: number;
    completionRate: number;
    averageImplementationTime: number;
    topRecommendationTypes: Array<{
      type: string;
      count: number;
      successRate: number;
    }>;
  };
  
  insightsEngagement: {
    views: number;
    dismissals: number;
    implementations: number;
    topInsightTypes: Array<{
      type: string;
      count: number;
      actionRate: number;
    }>;
  };
  
  // Behavioral patterns
  activityPatterns: {
    peakHours: number[];
    peakDays: string[];
    sessionFrequency: number;
    averageSessionDuration: number;
    deviceUsage: {
      desktop: number;
      mobile: number;
      tablet: number;
    };
  };
  
  // Performance metrics
  performance: {
    averageResponseTime: number;
    errorRate: number;
    successRate: number;
    userSatisfactionScore?: number;
  };
}

export interface ProfileMetricsComparison {
  current: ProfileMetrics;
  previous: ProfileMetrics;
  changes: {
    profileViews: number;
    profileEdits: number;
    completionScore: number;
    recommendationEngagement: number;
    insightsEngagement: number;
  };
  trends: {
    profileViews: 'up' | 'down' | 'stable';
    profileEdits: 'up' | 'down' | 'stable';
    completionScore: 'up' | 'down' | 'stable';
    recommendationEngagement: 'up' | 'down' | 'stable';
    insightsEngagement: 'up' | 'down' | 'stable';
  };
}

export class ProfileMetricsAggregator {
  private events: AnalyticsEvent[] = [];
  private userId: string;
  private period: ProfileMetrics['period'];
  private startDate: Date;
  private endDate: Date;

  constructor(
    userId: string,
    period: ProfileMetrics['period'],
    startDate: Date,
    endDate: Date
  ) {
    this.userId = userId;
    this.period = period;
    this.startDate = startDate;
    this.endDate = endDate;
  }

  public addEvents(events: AnalyticsEvent[]): void {
    this.events = this.events.concat(events);
  }

  public generateMetrics(): ProfileMetrics {
    const profileEvents = this.events.filter(isProfileEvent);
    const recommendationEvents = this.events.filter(isRecommendationEvent);
    const privacyEvents = this.events.filter(isPrivacyEvent);

    return {
      userId: this.userId,
      period: this.period,
      startDate: this.startDate,
      endDate: this.endDate,
      generatedAt: new Date(),
      
      profileViews: this.aggregateProfileViews(profileEvents),
      profileEdits: this.aggregateProfileEdits(profileEvents),
      avatarActivity: this.aggregateAvatarActivity(profileEvents),
      privacyActivity: this.aggregatePrivacyActivity(privacyEvents),
      universityNetworkActivity: this.aggregateUniversityNetworkActivity(profileEvents),
      completionProgress: this.aggregateCompletionProgress(profileEvents),
      recommendationEngagement: this.aggregateRecommendationEngagement(recommendationEvents),
      insightsEngagement: this.aggregateInsightsEngagement(recommendationEvents),
      activityPatterns: this.aggregateActivityPatterns(this.events),
      performance: this.aggregatePerformance(this.events)
    };
  }

  private aggregateProfileViews(events: AnalyticsEvent[]): ProfileMetrics['profileViews'] {
    const viewEvents = events.filter(e => e.eventType === 'profile_view');
    
    if (viewEvents.length === 0) {
      return {
        total: 0,
        unique: 0,
        averageDuration: 0,
        sectionsViewed: [],
        topViewingTimes: []
      };
    }

    const durations = viewEvents
      .map(e => e.data.duration)
      .filter(d => typeof d === 'number') as number[];
    
    const sectionsViewed = viewEvents
      .flatMap(e => e.data.sectionsViewed || [])
      .filter(s => typeof s === 'string') as string[];
    
    const viewingTimes = viewEvents
      .map(e => e.timestamp.getHours())
      .filter(h => typeof h === 'number') as number[];

    return {
      total: viewEvents.length,
      unique: new Set(viewEvents.map(e => e.data.viewerId)).size,
      averageDuration: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
      sectionsViewed: [...new Set(sectionsViewed)],
      topViewingTimes: this.getTopHours(viewingTimes)
    };
  }

  private aggregateProfileEdits(events: AnalyticsEvent[]): ProfileMetrics['profileEdits'] {
    const editEvents = events.filter(e => e.eventType === 'profile_edit');
    
    if (editEvents.length === 0) {
      return {
        total: 0,
        fieldsUpdated: [],
        completionScoreChange: 0,
        averageEditDuration: 0,
        editFrequency: 0
      };
    }

    const fieldsUpdated = editEvents
      .flatMap(e => e.data.updatedFields || [])
      .filter(f => typeof f === 'string') as string[];
    
    const completionScoreChanges = editEvents
      .map(e => (e.data.completionScoreAfter || 0) - (e.data.completionScoreBefore || 0))
      .filter(c => typeof c === 'number') as number[];
    
    const editDurations = editEvents
      .map(e => e.data.duration)
      .filter(d => typeof d === 'number') as number[];

    const totalDays = Math.ceil((this.endDate.getTime() - this.startDate.getTime()) / (1000 * 60 * 60 * 24));

    return {
      total: editEvents.length,
      fieldsUpdated: [...new Set(fieldsUpdated)],
      completionScoreChange: completionScoreChanges.reduce((a, b) => a + b, 0),
      averageEditDuration: editDurations.length > 0 ? editDurations.reduce((a, b) => a + b, 0) / editDurations.length : 0,
      editFrequency: totalDays > 0 ? editEvents.length / totalDays : 0
    };
  }

  private aggregateAvatarActivity(events: AnalyticsEvent[]): ProfileMetrics['avatarActivity'] {
    const avatarEvents = events.filter(e => e.eventType === 'avatar_upload');
    
    if (avatarEvents.length === 0) {
      return {
        uploads: 0,
        successfulUploads: 0,
        averageProcessingTime: 0,
        fileSizeDistribution: { small: 0, medium: 0, large: 0 }
      };
    }

    const successfulUploads = avatarEvents.filter(e => e.data.success === true);
    const processingTimes = successfulUploads
      .map(e => e.data.processingTime)
      .filter(t => typeof t === 'number') as number[];
    
    const fileSizes = successfulUploads
      .map(e => e.data.fileSize)
      .filter(s => typeof s === 'number') as number[];

    const fileSizeDistribution = {
      small: fileSizes.filter(s => s < 1024 * 1024).length,
      medium: fileSizes.filter(s => s >= 1024 * 1024 && s <= 5 * 1024 * 1024).length,
      large: fileSizes.filter(s => s > 5 * 1024 * 1024).length
    };

    return {
      uploads: avatarEvents.length,
      successfulUploads: successfulUploads.length,
      averageProcessingTime: processingTimes.length > 0 ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length : 0,
      fileSizeDistribution
    };
  }

  private aggregatePrivacyActivity(events: AnalyticsEvent[]): ProfileMetrics['privacyActivity'] {
    const privacyChangeEvents = events.filter(e => e.eventType === 'privacy_change');
    const optInEvents = events.filter(e => e.eventType === 'analytics_opt_in');
    const optOutEvents = events.filter(e => e.eventType === 'analytics_opt_out');
    
    const settingsModified = privacyChangeEvents
      .flatMap(e => e.data.changedSettings || [])
      .filter(s => typeof s === 'string') as string[];
    
    const privacyLevelChanges = privacyChangeEvents
      .filter(e => e.data.previousPrivacyLevel !== e.data.newPrivacyLevel).length;

    return {
      changes: privacyChangeEvents.length,
      settingsModified: [...new Set(settingsModified)],
      privacyLevelChanges,
      optInEvents: optInEvents.length,
      optOutEvents: optOutEvents.length
    };
  }

  private aggregateUniversityNetworkActivity(events: AnalyticsEvent[]): ProfileMetrics['universityNetworkActivity'] {
    const networkEvents = events.filter(e => e.eventType === 'university_network_interaction');
    
    if (networkEvents.length === 0) {
      return {
        interactions: 0,
        connections: 0,
        messages: 0,
        follows: 0,
        topUniversities: []
      };
    }

    const interactions = networkEvents.length;
    const connections = networkEvents.filter(e => e.data.interactionType === 'connect').length;
    const messages = networkEvents.filter(e => e.data.interactionType === 'message').length;
    const follows = networkEvents.filter(e => e.data.interactionType === 'follow').length;
    
    const universityInteractions = networkEvents
      .map(e => e.data.targetUniversityId)
      .filter(id => typeof id === 'string') as string[];
    
    const universityCounts = universityInteractions.reduce((acc, id) => {
      acc[id] = (acc[id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const topUniversities = Object.entries(universityCounts)
      .map(([universityId, interactions]) => ({ universityId, interactions }))
      .sort((a, b) => b.interactions - a.interactions)
      .slice(0, 5);

    return {
      interactions,
      connections,
      messages,
      follows,
      topUniversities
    };
  }

  private aggregateCompletionProgress(events: AnalyticsEvent[]): ProfileMetrics['completionProgress'] {
    const milestoneEvents = events.filter(e => e.eventType === 'profile_completion_milestone');
    const editEvents = events.filter(e => e.eventType === 'profile_edit');
    
    if (milestoneEvents.length === 0 && editEvents.length === 0) {
      return {
        milestones: 0,
        currentScore: 0,
        previousScore: 0,
        improvement: 0,
        completedFields: [],
        remainingFields: [],
        suggestedFields: []
      };
    }

    const milestones = milestoneEvents.length;
    const latestMilestone = milestoneEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
    const earliestMilestone = milestoneEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())[0];
    
    const currentScore = latestMilestone?.data.milestone || 0;
    const previousScore = earliestMilestone?.data.milestone || 0;
    const improvement = currentScore - previousScore;
    
    const completedFields = latestMilestone?.data.completedFields || [];
    const remainingFields = latestMilestone?.data.remainingFields || [];
    const suggestedFields = latestMilestone?.data.suggestedNextFields || [];

    return {
      milestones,
      currentScore,
      previousScore,
      improvement,
      completedFields,
      remainingFields,
      suggestedFields
    };
  }

  private aggregateRecommendationEngagement(events: AnalyticsEvent[]): ProfileMetrics['recommendationEngagement'] {
    const viewEvents = events.filter(e => e.eventType === 'recommendation_view');
    const implementEvents = events.filter(e => e.eventType === 'recommendation_implement');
    const dismissEvents = events.filter(e => e.eventType === 'insight_dismiss');
    
    const views = viewEvents.length;
    const implementations = implementEvents.length;
    const dismissals = dismissEvents.length;
    const completionRate = views > 0 ? implementations / views : 0;
    
    const implementationTimes = implementEvents
      .map(e => e.data.implementationTime)
      .filter(t => typeof t === 'number') as number[];
    
    const averageImplementationTime = implementationTimes.length > 0 
      ? implementationTimes.reduce((a, b) => a + b, 0) / implementationTimes.length 
      : 0;
    
    const recommendationTypes = implementEvents
      .map(e => e.data.recommendationType)
      .filter(t => typeof t === 'string') as string[];
    
    const typeCounts = recommendationTypes.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const topRecommendationTypes = Object.entries(typeCounts)
      .map(([type, count]) => {
        const typeViews = viewEvents.filter(e => e.data.recommendationType === type).length;
        const successRate = typeViews > 0 ? count / typeViews : 0;
        return { type, count, successRate };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      views,
      implementations,
      dismissals,
      completionRate,
      averageImplementationTime,
      topRecommendationTypes
    };
  }

  private aggregateInsightsEngagement(events: AnalyticsEvent[]): ProfileMetrics['insightsEngagement'] {
    const viewEvents = events.filter(e => e.eventType === 'recommendation_view');
    const dismissEvents = events.filter(e => e.eventType === 'insight_dismiss');
    const implementEvents = events.filter(e => e.eventType === 'recommendation_implement');
    
    const views = viewEvents.length;
    const dismissals = dismissEvents.length;
    const implementations = implementEvents.length;
    
    const insightTypes = viewEvents
      .map(e => e.data.recommendationType)
      .filter(t => typeof t === 'string') as string[];
    
    const typeCounts = insightTypes.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const topInsightTypes = Object.entries(typeCounts)
      .map(([type, count]) => {
        const typeDismissals = dismissEvents.filter(e => e.data.insightType === type).length;
        const actionRate = count > 0 ? (count - typeDismissals) / count : 0;
        return { type, count, actionRate };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      views,
      dismissals,
      implementations,
      topInsightTypes
    };
  }

  private aggregateActivityPatterns(events: AnalyticsEvent[]): ProfileMetrics['activityPatterns'] {
    const hours = events.map(e => e.timestamp.getHours());
    const days = events.map(e => e.timestamp.getDay());
    const sessions = new Set(events.map(e => e.sessionId)).size;
    const totalDuration = events
      .map(e => e.data.duration)
      .filter(d => typeof d === 'number')
      .reduce((a, b) => a + b, 0) as number;
    
    const deviceUsage = events.reduce((acc, e) => {
      const deviceType = e.metadata.device?.type || 'desktop';
      acc[deviceType] = (acc[deviceType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalDays = Math.ceil((this.endDate.getTime() - this.startDate.getTime()) / (1000 * 60 * 60 * 24));

    return {
      peakHours: this.getTopHours(hours),
      peakDays: this.getTopDays(days),
      sessionFrequency: totalDays > 0 ? sessions / totalDays : 0,
      averageSessionDuration: sessions > 0 ? totalDuration / sessions : 0,
      deviceUsage: {
        desktop: deviceUsage.desktop || 0,
        mobile: deviceUsage.mobile || 0,
        tablet: deviceUsage.tablet || 0
      }
    };
  }

  private aggregatePerformance(events: AnalyticsEvent[]): ProfileMetrics['performance'] {
    const responseTimes = events
      .map(e => e.data.responseTime)
      .filter(t => typeof t === 'number') as number[];
    
    const errors = events.filter(e => e.data.outcome === 'failure').length;
    const successes = events.filter(e => e.data.outcome === 'success').length;
    const total = errors + successes;
    
    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
      : 0;
    
    const errorRate = total > 0 ? errors / total : 0;
    const successRate = total > 0 ? successes / total : 0;

    return {
      averageResponseTime,
      errorRate,
      successRate
    };
  }

  private getTopHours(hours: number[]): number[] {
    const hourCounts = hours.reduce((acc, hour) => {
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
    
    return Object.entries(hourCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));
  }

  private getTopDays(days: number[]): string[] {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayCounts = days.reduce((acc, day) => {
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
    
    return Object.entries(dayCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([day]) => dayNames[parseInt(day)]);
  }

  public static compareMetrics(current: ProfileMetrics, previous: ProfileMetrics): ProfileMetricsComparison {
    const changes = {
      profileViews: current.profileViews.total - previous.profileViews.total,
      profileEdits: current.profileEdits.total - previous.profileEdits.total,
      completionScore: current.completionProgress.currentScore - previous.completionProgress.currentScore,
      recommendationEngagement: current.recommendationEngagement.implementations - previous.recommendationEngagement.implementations,
      insightsEngagement: current.insightsEngagement.implementations - previous.insightsEngagement.implementations
    };

    const trends = {
      profileViews: this.getTrend(changes.profileViews),
      profileEdits: this.getTrend(changes.profileEdits),
      completionScore: this.getTrend(changes.completionScore),
      recommendationEngagement: this.getTrend(changes.recommendationEngagement),
      insightsEngagement: this.getTrend(changes.insightsEngagement)
    };

    return {
      current,
      previous,
      changes,
      trends
    };
  }

  private static getTrend(change: number): 'up' | 'down' | 'stable' {
    if (change > 0) return 'up';
    if (change < 0) return 'down';
    return 'stable';
  }
}
