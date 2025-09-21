import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

export interface AnalyticsEvent {
  id: string;
  userId: string;
  sessionId: string;
  eventType: string;
  eventCategory: string;
  eventAction: string;
  eventLabel?: string;
  eventValue?: number;
  properties: Record<string, any>;
  timestamp: Date;
  userAgent?: string;
  ipAddress?: string;
  referrer?: string;
  pageUrl?: string;
  consentLevel: 'essential' | 'analytics' | 'marketing';
  privacyMode: boolean;
}

export interface ProfileViewEvent extends AnalyticsEvent {
  eventType: 'profile_view';
  eventCategory: 'profile';
  eventAction: 'view';
  properties: {
    profileId: string;
    viewerId: string;
    viewType: 'self' | 'other';
    source: 'direct' | 'search' | 'feed' | 'recommendation';
    timeSpent?: number;
    sectionsViewed: string[];
    interactions: string[];
  };
}

export interface ProfileEditEvent extends AnalyticsEvent {
  eventType: 'profile_edit';
  eventCategory: 'profile';
  eventAction: 'edit';
  properties: {
    fieldName: string;
    fieldType: 'text' | 'select' | 'multiselect' | 'file' | 'date';
    oldValue?: any;
    newValue?: any;
    editDuration: number;
    validationErrors: string[];
    autoSave: boolean;
  };
}

export interface ProfileCompletionEvent extends AnalyticsEvent {
  eventType: 'profile_completion';
  eventCategory: 'profile';
  eventAction: 'completion';
  properties: {
    completionPercentage: number;
    completedFields: string[];
    missingFields: string[];
    stepCompleted: string;
    timeToComplete: number;
    recommendationsShown: string[];
  };
}

export interface UniversityNetworkEvent extends AnalyticsEvent {
  eventType: 'university_network';
  eventCategory: 'social';
  eventAction: 'network_interaction';
  properties: {
    universityId: string;
    action: 'view' | 'connect' | 'disconnect' | 'search';
    networkSize: number;
    connectionsFound: number;
    recommendationsShown: number;
  };
}

export interface PrivacySettingsEvent extends AnalyticsEvent {
  eventType: 'privacy_settings';
  eventCategory: 'privacy';
  eventAction: 'settings_change';
  properties: {
    settingName: string;
    oldValue: any;
    newValue: any;
    privacyLevel: 'public' | 'friends' | 'private';
    impactScore: number;
  };
}

export interface ProfileEngagementEvent extends AnalyticsEvent {
  eventType: 'profile_engagement';
  eventCategory: 'engagement';
  eventAction: 'interaction';
  properties: {
    engagementType: 'like' | 'comment' | 'share' | 'follow' | 'message';
    targetUserId: string;
    engagementValue: number;
    context: 'profile' | 'post' | 'feed';
  };
}

export interface AnalyticsConfig {
  batchSize: number;
  flushInterval: number;
  maxRetries: number;
  retryDelay: number;
  enableRealTime: boolean;
  enableOfflineMode: boolean;
  privacyMode: boolean;
  consentRequired: boolean;
  dataRetentionDays: number;
  anonymizeData: boolean;
}

export interface ConsentPreferences {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  personalization: boolean;
  dataSharing: boolean;
  lastUpdated: Date;
  version: string;
}

export class ProfileAnalytics extends EventEmitter {
  private config: AnalyticsConfig;
  private eventQueue: AnalyticsEvent[] = [];
  private flushTimer?: NodeJS.Timeout;
  private isOnline: boolean = true;
  private consentCache: Map<string, ConsentPreferences> = new Map();
  private sessionCache: Map<string, string> = new Map();

  constructor(config: Partial<AnalyticsConfig> = {}) {
    super();
    
    this.config = {
      batchSize: 50,
      flushInterval: 30000, // 30 seconds
      maxRetries: 3,
      retryDelay: 1000,
      enableRealTime: true,
      enableOfflineMode: true,
      privacyMode: false,
      consentRequired: true,
      dataRetentionDays: 365,
      anonymizeData: true,
      ...config
    };

    this.initializeEventListeners();
    this.startFlushTimer();
  }

  /**
   * Track profile view event
   */
  async trackProfileView(
    userId: string,
    profileId: string,
    viewerId: string,
    properties: Partial<ProfileViewEvent['properties']> = {}
  ): Promise<void> {
    const event: ProfileViewEvent = {
      id: uuidv4(),
      userId,
      sessionId: this.getSessionId(userId),
      eventType: 'profile_view',
      eventCategory: 'profile',
      eventAction: 'view',
      eventLabel: profileId,
      properties: {
        profileId,
        viewerId,
        viewType: profileId === viewerId ? 'self' : 'other',
        source: 'direct',
        sectionsViewed: [],
        interactions: [],
        ...properties
      },
      timestamp: new Date(),
      consentLevel: await this.getConsentLevel(userId),
      privacyMode: this.config.privacyMode
    };

    await this.trackEvent(event);
  }

  /**
   * Track profile edit event
   */
  async trackProfileEdit(
    userId: string,
    fieldName: string,
    fieldType: ProfileEditEvent['properties']['fieldType'],
    properties: Partial<ProfileEditEvent['properties']> = {}
  ): Promise<void> {
    const event: ProfileEditEvent = {
      id: uuidv4(),
      userId,
      sessionId: this.getSessionId(userId),
      eventType: 'profile_edit',
      eventCategory: 'profile',
      eventAction: 'edit',
      eventLabel: fieldName,
      properties: {
        fieldName,
        fieldType,
        editDuration: 0,
        validationErrors: [],
        autoSave: false,
        ...properties
      },
      timestamp: new Date(),
      consentLevel: await this.getConsentLevel(userId),
      privacyMode: this.config.privacyMode
    };

    await this.trackEvent(event);
  }

  /**
   * Track profile completion event
   */
  async trackProfileCompletion(
    userId: string,
    completionPercentage: number,
    properties: Partial<ProfileCompletionEvent['properties']> = {}
  ): Promise<void> {
    const event: ProfileCompletionEvent = {
      id: uuidv4(),
      userId,
      sessionId: this.getSessionId(userId),
      eventType: 'profile_completion',
      eventCategory: 'profile',
      eventAction: 'completion',
      eventValue: completionPercentage,
      properties: {
        completionPercentage,
        completedFields: [],
        missingFields: [],
        stepCompleted: '',
        timeToComplete: 0,
        recommendationsShown: [],
        ...properties
      },
      timestamp: new Date(),
      consentLevel: await this.getConsentLevel(userId),
      privacyMode: this.config.privacyMode
    };

    await this.trackEvent(event);
  }

  /**
   * Track university network event
   */
  async trackUniversityNetwork(
    userId: string,
    universityId: string,
    action: UniversityNetworkEvent['properties']['action'],
    properties: Partial<UniversityNetworkEvent['properties']> = {}
  ): Promise<void> {
    const event: UniversityNetworkEvent = {
      id: uuidv4(),
      userId,
      sessionId: this.getSessionId(userId),
      eventType: 'university_network',
      eventCategory: 'social',
      eventAction: 'network_interaction',
      eventLabel: universityId,
      properties: {
        universityId,
        action,
        networkSize: 0,
        connectionsFound: 0,
        recommendationsShown: 0,
        ...properties
      },
      timestamp: new Date(),
      consentLevel: await this.getConsentLevel(userId),
      privacyMode: this.config.privacyMode
    };

    await this.trackEvent(event);
  }

  /**
   * Track privacy settings event
   */
  async trackPrivacySettings(
    userId: string,
    settingName: string,
    oldValue: any,
    newValue: any,
    properties: Partial<PrivacySettingsEvent['properties']> = {}
  ): Promise<void> {
    const event: PrivacySettingsEvent = {
      id: uuidv4(),
      userId,
      sessionId: this.getSessionId(userId),
      eventType: 'privacy_settings',
      eventCategory: 'privacy',
      eventAction: 'settings_change',
      eventLabel: settingName,
      properties: {
        settingName,
        oldValue,
        newValue,
        privacyLevel: 'public',
        impactScore: 0,
        ...properties
      },
      timestamp: new Date(),
      consentLevel: await this.getConsentLevel(userId),
      privacyMode: this.config.privacyMode
    };

    await this.trackEvent(event);
  }

  /**
   * Track profile engagement event
   */
  async trackProfileEngagement(
    userId: string,
    engagementType: ProfileEngagementEvent['properties']['engagementType'],
    targetUserId: string,
    properties: Partial<ProfileEngagementEvent['properties']> = {}
  ): Promise<void> {
    const event: ProfileEngagementEvent = {
      id: uuidv4(),
      userId,
      sessionId: this.getSessionId(userId),
      eventType: 'profile_engagement',
      eventCategory: 'engagement',
      eventAction: 'interaction',
      eventLabel: engagementType,
      eventValue: 1,
      properties: {
        engagementType,
        targetUserId,
        engagementValue: 1,
        context: 'profile',
        ...properties
      },
      timestamp: new Date(),
      consentLevel: await this.getConsentLevel(userId),
      privacyMode: this.config.privacyMode
    };

    await this.trackEvent(event);
  }

  /**
   * Track custom event
   */
  async trackCustomEvent(
    userId: string,
    eventType: string,
    eventCategory: string,
    eventAction: string,
    properties: Record<string, any> = {}
  ): Promise<void> {
    const event: AnalyticsEvent = {
      id: uuidv4(),
      userId,
      sessionId: this.getSessionId(userId),
      eventType,
      eventCategory,
      eventAction,
      properties,
      timestamp: new Date(),
      consentLevel: await this.getConsentLevel(userId),
      privacyMode: this.config.privacyMode
    };

    await this.trackEvent(event);
  }

  /**
   * Update user consent preferences
   */
  async updateConsent(
    userId: string,
    preferences: Partial<ConsentPreferences>
  ): Promise<void> {
    const currentConsent = this.consentCache.get(userId) || {
      essential: true,
      analytics: false,
      marketing: false,
      personalization: false,
      dataSharing: false,
      lastUpdated: new Date(),
      version: '1.0'
    };

    const updatedConsent: ConsentPreferences = {
      ...currentConsent,
      ...preferences,
      lastUpdated: new Date(),
      version: '1.0'
    };

    this.consentCache.set(userId, updatedConsent);

    // Track consent update event
    await this.trackCustomEvent(
      userId,
      'consent_update',
      'privacy',
      'consent_changed',
      {
        oldConsent: currentConsent,
        newConsent: updatedConsent,
        changes: Object.keys(preferences)
      }
    );

    this.emit('consentUpdated', { userId, consent: updatedConsent });
  }

  /**
   * Get user consent preferences
   */
  async getConsent(userId: string): Promise<ConsentPreferences | null> {
    return this.consentCache.get(userId) || null;
  }

  /**
   * Check if user has given consent for specific data type
   */
  async hasConsent(userId: string, dataType: keyof ConsentPreferences): Promise<boolean> {
    const consent = await this.getConsent(userId);
    return consent ? consent[dataType] : false;
  }

  /**
   * Anonymize user data
   */
  private anonymizeData(data: any): any {
    if (!this.config.anonymizeData) return data;

    const anonymized = { ...data };
    
    // Remove or hash PII
    if (anonymized.userId) {
      anonymized.userId = this.hashUserId(anonymized.userId);
    }
    
    if (anonymized.ipAddress) {
      anonymized.ipAddress = this.hashIpAddress(anonymized.ipAddress);
    }
    
    if (anonymized.userAgent) {
      anonymized.userAgent = this.hashUserAgent(anonymized.userAgent);
    }

    return anonymized;
  }

  /**
   * Hash user ID for anonymization
   */
  private hashUserId(userId: string): string {
    // Simple hash function for demonstration
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `user_${Math.abs(hash)}`;
  }

  /**
   * Hash IP address for anonymization
   */
  private hashIpAddress(ipAddress: string): string {
    // Remove last octet for IPv4 or last segment for IPv6
    if (ipAddress.includes('.')) {
      return ipAddress.split('.').slice(0, 3).join('.') + '.0';
    } else if (ipAddress.includes(':')) {
      return ipAddress.split(':').slice(0, 7).join(':') + ':0';
    }
    return '0.0.0.0';
  }

  /**
   * Hash user agent for anonymization
   */
  private hashUserAgent(userAgent: string): string {
    // Extract browser and OS info only
    const browser = userAgent.match(/(Chrome|Firefox|Safari|Edge|Opera)\/[\d.]+/)?.[0] || 'Unknown';
    const os = userAgent.match(/(Windows|Mac|Linux|Android|iOS)/)?.[0] || 'Unknown';
    return `${browser} on ${os}`;
  }

  /**
   * Get session ID for user
   */
  private getSessionId(userId: string): string {
    if (!this.sessionCache.has(userId)) {
      this.sessionCache.set(userId, uuidv4());
    }
    return this.sessionCache.get(userId)!;
  }

  /**
   * Get consent level for user
   */
  private async getConsentLevel(userId: string): Promise<'essential' | 'analytics' | 'marketing'> {
    const consent = await this.getConsent(userId);
    
    if (!consent) return 'essential';
    if (consent.marketing) return 'marketing';
    if (consent.analytics) return 'analytics';
    return 'essential';
  }

  /**
   * Track event with privacy and consent checks
   */
  private async trackEvent(event: AnalyticsEvent): Promise<void> {
    // Check consent
    if (this.config.consentRequired) {
      const hasConsent = await this.hasConsent(event.userId, 'analytics');
      if (!hasConsent && event.consentLevel !== 'essential') {
        this.emit('eventBlocked', { event, reason: 'no_consent' });
        return;
      }
    }

    // Anonymize data if required
    const processedEvent = this.anonymizeData(event);

    // Add to queue
    this.eventQueue.push(processedEvent);

    // Emit real-time event if enabled
    if (this.config.enableRealTime) {
      this.emit('eventTracked', processedEvent);
    }

    // Flush if batch size reached
    if (this.eventQueue.length >= this.config.batchSize) {
      await this.flushEvents();
    }
  }

  /**
   * Flush events to storage
   */
  private async flushEvents(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    try {
      await this.sendEvents(events);
      this.emit('eventsFlushed', { count: events.length });
    } catch (error) {
      // Re-queue events on failure
      this.eventQueue.unshift(...events);
      this.emit('flushError', { error, events });
      
      // Retry with exponential backoff
      setTimeout(() => this.flushEvents(), this.config.retryDelay);
    }
  }

  /**
   * Send events to storage/API
   */
  private async sendEvents(events: AnalyticsEvent[]): Promise<void> {
    // This would typically send to your analytics storage
    // For now, we'll simulate the API call
    const response = await fetch('/api/analytics/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ANALYTICS_API_KEY}`
      },
      body: JSON.stringify({ events })
    });

    if (!response.ok) {
      throw new Error(`Analytics API error: ${response.statusText}`);
    }
  }

  /**
   * Start flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flushEvents();
    }, this.config.flushInterval);
  }

  /**
   * Stop flush timer
   */
  private stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
  }

  /**
   * Initialize event listeners
   */
  private initializeEventListeners(): void {
    // Online/offline detection
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.emit('online');
        this.flushEvents();
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
        this.emit('offline');
      });
    }

    // Page visibility change
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.flushEvents();
        }
      });
    }
  }

  /**
   * Get analytics configuration
   */
  getConfig(): AnalyticsConfig {
    return { ...this.config };
  }

  /**
   * Update analytics configuration
   */
  updateConfig(newConfig: Partial<AnalyticsConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit('configUpdated', this.config);
  }

  /**
   * Get queue status
   */
  getQueueStatus(): { length: number; oldestEvent: Date | null } {
    return {
      length: this.eventQueue.length,
      oldestEvent: this.eventQueue.length > 0 ? this.eventQueue[0].timestamp : null
    };
  }

  /**
   * Force flush events
   */
  async forceFlush(): Promise<void> {
    await this.flushEvents();
  }

  /**
   * Clear all events (for testing)
   */
  clearEvents(): void {
    this.eventQueue = [];
  }

  /**
   * Destroy analytics instance
   */
  destroy(): void {
    this.stopFlushTimer();
    this.removeAllListeners();
    this.clearEvents();
    this.consentCache.clear();
    this.sessionCache.clear();
  }
}

export default ProfileAnalytics;
