import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

export interface ConsentPreferences {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  personalization: boolean;
  dataSharing: boolean;
  lastUpdated: Date;
  version: string;
  ipAddress?: string;
  userAgent?: string;
  consentMethod: 'explicit' | 'implied' | 'opt_out';
  consentSource: 'banner' | 'settings' | 'registration' | 'api';
}

export interface ConsentEvent {
  id: string;
  userId: string;
  eventType: 'consent_given' | 'consent_withdrawn' | 'consent_updated';
  preferences: ConsentPreferences;
  timestamp: Date;
  source: string;
  ipAddress?: string;
  userAgent?: string;
  legalBasis: 'consent' | 'legitimate_interest' | 'contract' | 'legal_obligation';
  dataCategories: string[];
  purposes: string[];
  retentionPeriod: number; // days
}

export interface DataProcessingPurpose {
  id: string;
  name: string;
  description: string;
  legalBasis: 'consent' | 'legitimate_interest' | 'contract' | 'legal_obligation';
  dataCategories: string[];
  retentionPeriod: number;
  required: boolean;
  defaultEnabled: boolean;
}

export interface DataCategory {
  id: string;
  name: string;
  description: string;
  examples: string[];
  sensitive: boolean;
  required: boolean;
}

export interface ConsentBannerConfig {
  enabled: boolean;
  position: 'top' | 'bottom' | 'modal';
  theme: 'light' | 'dark' | 'auto';
  language: string;
  showDetails: boolean;
  allowReject: boolean;
  autoHide: boolean;
  autoHideDelay: number;
  requiredConsents: string[];
  optionalConsents: string[];
}

export interface PrivacyPolicy {
  id: string;
  version: string;
  effectiveDate: Date;
  content: string;
  language: string;
  lastUpdated: Date;
  changes: string[];
}

export interface DataSubjectRequest {
  id: string;
  userId: string;
  requestType: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction' | 'objection';
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  description: string;
  requestedData: string[];
  submittedAt: Date;
  completedAt?: Date;
  responseData?: any;
  rejectionReason?: string;
  legalBasis: string;
}

export class ConsentManager extends EventEmitter {
  private consentStore: Map<string, ConsentPreferences> = new Map();
  private consentEvents: ConsentEvent[] = [];
  private dataPurposes: DataProcessingPurpose[] = [];
  private dataCategories: DataCategory[] = [];
  private bannerConfig: ConsentBannerConfig;
  private privacyPolicy: PrivacyPolicy | null = null;
  private dataRequests: DataSubjectRequest[] = [];

  constructor(config: Partial<ConsentBannerConfig> = {}) {
    super();
    
    this.bannerConfig = {
      enabled: true,
      position: 'bottom',
      theme: 'auto',
      language: 'en',
      showDetails: true,
      allowReject: true,
      autoHide: false,
      autoHideDelay: 5000,
      requiredConsents: ['essential'],
      optionalConsents: ['analytics', 'marketing', 'personalization'],
      ...config
    };

    this.initializeDataPurposes();
    this.initializeDataCategories();
    this.loadPrivacyPolicy();
  }

  /**
   * Initialize data processing purposes
   */
  private initializeDataPurposes(): void {
    this.dataPurposes = [
      {
        id: 'essential',
        name: 'Essential Services',
        description: 'Required for basic platform functionality',
        legalBasis: 'legitimate_interest',
        dataCategories: ['authentication', 'session', 'security'],
        retentionPeriod: 365,
        required: true,
        defaultEnabled: true
      },
      {
        id: 'analytics',
        name: 'Analytics',
        description: 'Help us improve our services by analyzing usage patterns',
        legalBasis: 'consent',
        dataCategories: ['usage', 'performance', 'device'],
        retentionPeriod: 730,
        required: false,
        defaultEnabled: false
      },
      {
        id: 'marketing',
        name: 'Marketing',
        description: 'Send you relevant offers and updates',
        legalBasis: 'consent',
        dataCategories: ['preferences', 'behavior', 'demographics'],
        retentionPeriod: 1095,
        required: false,
        defaultEnabled: false
      },
      {
        id: 'personalization',
        name: 'Personalization',
        description: 'Customize your experience and show relevant content',
        legalBasis: 'consent',
        dataCategories: ['preferences', 'behavior', 'interests'],
        retentionPeriod: 365,
        required: false,
        defaultEnabled: false
      },
      {
        id: 'dataSharing',
        name: 'Data Sharing',
        description: 'Share anonymized data with research partners',
        legalBasis: 'consent',
        dataCategories: ['anonymized_usage', 'aggregated_stats'],
        retentionPeriod: 1825,
        required: false,
        defaultEnabled: false
      }
    ];
  }

  /**
   * Initialize data categories
   */
  private initializeDataCategories(): void {
    this.dataCategories = [
      {
        id: 'authentication',
        name: 'Authentication Data',
        description: 'Information used to verify your identity',
        examples: ['email', 'password_hash', 'university_affiliation'],
        sensitive: false,
        required: true
      },
      {
        id: 'session',
        name: 'Session Data',
        description: 'Information about your current session',
        examples: ['session_id', 'login_time', 'device_info'],
        sensitive: false,
        required: true
      },
      {
        id: 'security',
        name: 'Security Data',
        description: 'Information used for security purposes',
        examples: ['ip_address', 'user_agent', 'security_events'],
        sensitive: false,
        required: true
      },
      {
        id: 'usage',
        name: 'Usage Data',
        description: 'Information about how you use the platform',
        examples: ['page_views', 'click_events', 'time_spent'],
        sensitive: false,
        required: false
      },
      {
        id: 'performance',
        name: 'Performance Data',
        description: 'Technical information about platform performance',
        examples: ['load_times', 'error_rates', 'device_performance'],
        sensitive: false,
        required: false
      },
      {
        id: 'device',
        name: 'Device Data',
        description: 'Information about your device and browser',
        examples: ['browser_type', 'screen_resolution', 'operating_system'],
        sensitive: false,
        required: false
      },
      {
        id: 'preferences',
        name: 'Preference Data',
        description: 'Your personal preferences and settings',
        examples: ['privacy_settings', 'notification_preferences', 'theme'],
        sensitive: false,
        required: false
      },
      {
        id: 'behavior',
        name: 'Behavioral Data',
        description: 'Information about your behavior on the platform',
        examples: ['click_patterns', 'content_interactions', 'search_history'],
        sensitive: true,
        required: false
      },
      {
        id: 'demographics',
        name: 'Demographic Data',
        description: 'Information about your demographics',
        examples: ['age_range', 'location', 'university', 'academic_year'],
        sensitive: true,
        required: false
      },
      {
        id: 'interests',
        name: 'Interest Data',
        description: 'Information about your interests and topics',
        examples: ['academic_interests', 'hobbies', 'career_goals'],
        sensitive: false,
        required: false
      },
      {
        id: 'anonymized_usage',
        name: 'Anonymized Usage Data',
        description: 'Usage data that cannot identify you',
        examples: ['aggregated_page_views', 'anonymized_click_events'],
        sensitive: false,
        required: false
      },
      {
        id: 'aggregated_stats',
        name: 'Aggregated Statistics',
        description: 'Statistical information about platform usage',
        examples: ['total_users', 'feature_adoption_rates', 'engagement_metrics'],
        sensitive: false,
        required: false
      }
    ];
  }

  /**
   * Load privacy policy
   */
  private async loadPrivacyPolicy(): Promise<void> {
    // This would typically load from a database or file
    this.privacyPolicy = {
      id: 'privacy_policy_v1',
      version: '1.0',
      effectiveDate: new Date('2024-01-01'),
      content: 'Privacy Policy Content...',
      language: 'en',
      lastUpdated: new Date(),
      changes: ['Initial version']
    };
  }

  /**
   * Get consent preferences for user
   */
  async getConsent(userId: string): Promise<ConsentPreferences | null> {
    return this.consentStore.get(userId) || null;
  }

  /**
   * Set consent preferences for user
   */
  async setConsent(
    userId: string,
    preferences: Partial<ConsentPreferences>,
    source: ConsentEvent['source'] = 'api'
  ): Promise<ConsentPreferences> {
    const currentConsent = await this.getConsent(userId);
    const newConsent: ConsentPreferences = {
      essential: true, // Always required
      analytics: false,
      marketing: false,
      personalization: false,
      dataSharing: false,
      lastUpdated: new Date(),
      version: '1.0',
      consentMethod: 'explicit',
      consentSource: source,
      ...currentConsent,
      ...preferences,
      lastUpdated: new Date()
    };

    // Validate consent
    this.validateConsent(newConsent);

    // Store consent
    this.consentStore.set(userId, newConsent);

    // Record consent event
    const event: ConsentEvent = {
      id: uuidv4(),
      userId,
      eventType: currentConsent ? 'consent_updated' : 'consent_given',
      preferences: newConsent,
      timestamp: new Date(),
      source,
      legalBasis: 'consent',
      dataCategories: this.getDataCategoriesForConsent(newConsent),
      purposes: this.getPurposesForConsent(newConsent),
      retentionPeriod: this.getMaxRetentionPeriod(newConsent)
    };

    this.consentEvents.push(event);

    // Emit event
    this.emit('consentUpdated', { userId, consent: newConsent, event });

    return newConsent;
  }

  /**
   * Withdraw consent for user
   */
  async withdrawConsent(
    userId: string,
    consentTypes: string[],
    source: ConsentEvent['source'] = 'api'
  ): Promise<ConsentPreferences> {
    const currentConsent = await this.getConsent(userId);
    if (!currentConsent) {
      throw new Error('No consent found for user');
    }

    const newConsent: ConsentPreferences = { ...currentConsent };
    
    // Withdraw specified consents (except essential)
    consentTypes.forEach(type => {
      if (type !== 'essential' && type in newConsent) {
        (newConsent as any)[type] = false;
      }
    });

    newConsent.lastUpdated = new Date();

    // Store updated consent
    this.consentStore.set(userId, newConsent);

    // Record withdrawal event
    const event: ConsentEvent = {
      id: uuidv4(),
      userId,
      eventType: 'consent_withdrawn',
      preferences: newConsent,
      timestamp: new Date(),
      source,
      legalBasis: 'consent',
      dataCategories: this.getDataCategoriesForConsent(newConsent),
      purposes: this.getPurposesForConsent(newConsent),
      retentionPeriod: this.getMaxRetentionPeriod(newConsent)
    };

    this.consentEvents.push(event);

    // Emit event
    this.emit('consentWithdrawn', { userId, consent: newConsent, event, withdrawnTypes: consentTypes });

    return newConsent;
  }

  /**
   * Check if user has given consent for specific purpose
   */
  async hasConsent(userId: string, purpose: string): Promise<boolean> {
    const consent = await this.getConsent(userId);
    if (!consent) return false;

    // Essential services are always allowed
    if (purpose === 'essential') return true;

    return (consent as any)[purpose] === true;
  }

  /**
   * Get all data processing purposes
   */
  getDataPurposes(): DataProcessingPurpose[] {
    return [...this.dataPurposes];
  }

  /**
   * Get all data categories
   */
  getDataCategories(): DataCategory[] {
    return [...this.dataCategories];
  }

  /**
   * Get consent banner configuration
   */
  getBannerConfig(): ConsentBannerConfig {
    return { ...this.bannerConfig };
  }

  /**
   * Update consent banner configuration
   */
  updateBannerConfig(config: Partial<ConsentBannerConfig>): void {
    this.bannerConfig = { ...this.bannerConfig, ...config };
    this.emit('bannerConfigUpdated', this.bannerConfig);
  }

  /**
   * Get privacy policy
   */
  getPrivacyPolicy(): PrivacyPolicy | null {
    return this.privacyPolicy;
  }

  /**
   * Update privacy policy
   */
  async updatePrivacyPolicy(
    version: string,
    content: string,
    changes: string[]
  ): Promise<PrivacyPolicy> {
    if (!this.privacyPolicy) {
      throw new Error('No existing privacy policy to update');
    }

    const newPolicy: PrivacyPolicy = {
      id: `privacy_policy_v${version}`,
      version,
      effectiveDate: new Date(),
      content,
      language: this.privacyPolicy.language,
      lastUpdated: new Date(),
      changes
    };

    this.privacyPolicy = newPolicy;
    this.emit('privacyPolicyUpdated', newPolicy);

    return newPolicy;
  }

  /**
   * Submit data subject request
   */
  async submitDataSubjectRequest(
    userId: string,
    requestType: DataSubjectRequest['requestType'],
    description: string,
    requestedData: string[] = []
  ): Promise<DataSubjectRequest> {
    const request: DataSubjectRequest = {
      id: uuidv4(),
      userId,
      requestType,
      status: 'pending',
      description,
      requestedData,
      submittedAt: new Date(),
      legalBasis: this.getLegalBasisForRequest(requestType)
    };

    this.dataRequests.push(request);
    this.emit('dataSubjectRequestSubmitted', request);

    return request;
  }

  /**
   * Process data subject request
   */
  async processDataSubjectRequest(
    requestId: string,
    status: 'completed' | 'rejected',
    responseData?: any,
    rejectionReason?: string
  ): Promise<DataSubjectRequest> {
    const request = this.dataRequests.find(r => r.id === requestId);
    if (!request) {
      throw new Error('Data subject request not found');
    }

    request.status = status;
    request.completedAt = new Date();
    
    if (status === 'completed') {
      request.responseData = responseData;
    } else {
      request.rejectionReason = rejectionReason;
    }

    this.emit('dataSubjectRequestProcessed', request);
    return request;
  }

  /**
   * Get data subject requests for user
   */
  getDataSubjectRequests(userId: string): DataSubjectRequest[] {
    return this.dataRequests.filter(r => r.userId === userId);
  }

  /**
   * Get consent events for user
   */
  getConsentEvents(userId: string): ConsentEvent[] {
    return this.consentEvents.filter(e => e.userId === userId);
  }

  /**
   * Validate consent preferences
   */
  private validateConsent(consent: ConsentPreferences): void {
    // Essential consent is always required
    if (!consent.essential) {
      throw new Error('Essential consent is required');
    }

    // Validate version
    if (!consent.version) {
      throw new Error('Consent version is required');
    }

    // Validate timestamp
    if (!consent.lastUpdated) {
      throw new Error('Last updated timestamp is required');
    }
  }

  /**
   * Get data categories for given consent
   */
  private getDataCategoriesForConsent(consent: ConsentPreferences): string[] {
    const categories: string[] = [];
    
    this.dataPurposes.forEach(purpose => {
      if ((consent as any)[purpose.id] === true) {
        categories.push(...purpose.dataCategories);
      }
    });

    return [...new Set(categories)]; // Remove duplicates
  }

  /**
   * Get purposes for given consent
   */
  private getPurposesForConsent(consent: ConsentPreferences): string[] {
    const purposes: string[] = [];
    
    this.dataPurposes.forEach(purpose => {
      if ((consent as any)[purpose.id] === true) {
        purposes.push(purpose.id);
      }
    });

    return purposes;
  }

  /**
   * Get maximum retention period for given consent
   */
  private getMaxRetentionPeriod(consent: ConsentPreferences): number {
    let maxRetention = 0;
    
    this.dataPurposes.forEach(purpose => {
      if ((consent as any)[purpose.id] === true) {
        maxRetention = Math.max(maxRetention, purpose.retentionPeriod);
      }
    });

    return maxRetention;
  }

  /**
   * Get legal basis for data subject request
   */
  private getLegalBasisForRequest(requestType: DataSubjectRequest['requestType']): string {
    switch (requestType) {
      case 'access':
      case 'portability':
        return 'GDPR Article 15 & 20';
      case 'rectification':
        return 'GDPR Article 16';
      case 'erasure':
        return 'GDPR Article 17';
      case 'restriction':
        return 'GDPR Article 18';
      case 'objection':
        return 'GDPR Article 21';
      default:
        return 'GDPR';
    }
  }

  /**
   * Check if data processing is lawful
   */
  isDataProcessingLawful(
    userId: string,
    purpose: string,
    dataCategory: string
  ): Promise<boolean> {
    return this.hasConsent(userId, purpose).then(hasConsent => {
      if (!hasConsent) return false;

      const purposeConfig = this.dataPurposes.find(p => p.id === purpose);
      if (!purposeConfig) return false;

      return purposeConfig.dataCategories.includes(dataCategory);
    });
  }

  /**
   * Get data retention period for purpose
   */
  getDataRetentionPeriod(purpose: string): number {
    const purposeConfig = this.dataPurposes.find(p => p.id === purpose);
    return purposeConfig ? purposeConfig.retentionPeriod : 0;
  }

  /**
   * Check if data should be deleted based on retention period
   */
  shouldDeleteData(
    purpose: string,
    lastProcessed: Date
  ): boolean {
    const retentionPeriod = this.getDataRetentionPeriod(purpose);
    if (retentionPeriod === 0) return false;

    const expirationDate = new Date(lastProcessed);
    expirationDate.setDate(expirationDate.getDate() + retentionPeriod);

    return new Date() > expirationDate;
  }

  /**
   * Generate consent report for user
   */
  async generateConsentReport(userId: string): Promise<{
    currentConsent: ConsentPreferences | null;
    consentHistory: ConsentEvent[];
    dataRequests: DataSubjectRequest[];
    dataCategories: string[];
    purposes: string[];
    retentionPeriods: Record<string, number>;
  }> {
    const currentConsent = await this.getConsent(userId);
    const consentHistory = this.getConsentEvents(userId);
    const dataRequests = this.getDataSubjectRequests(userId);
    
    const dataCategories = currentConsent ? this.getDataCategoriesForConsent(currentConsent) : [];
    const purposes = currentConsent ? this.getPurposesForConsent(currentConsent) : [];
    
    const retentionPeriods: Record<string, number> = {};
    purposes.forEach(purpose => {
      retentionPeriods[purpose] = this.getDataRetentionPeriod(purpose);
    });

    return {
      currentConsent,
      consentHistory,
      dataRequests,
      dataCategories,
      purposes,
      retentionPeriods
    };
  }

  /**
   * Clear all data (for testing)
   */
  clearAllData(): void {
    this.consentStore.clear();
    this.consentEvents = [];
    this.dataRequests = [];
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalUsers: number;
    consentRates: Record<string, number>;
    dataRequests: Record<string, number>;
    averageRetentionPeriod: number;
  } {
    const totalUsers = this.consentStore.size;
    const consentRates: Record<string, number> = {};
    const dataRequests: Record<string, number> = {};

    // Calculate consent rates
    this.dataPurposes.forEach(purpose => {
      const usersWithConsent = Array.from(this.consentStore.values())
        .filter(consent => (consent as any)[purpose.id] === true).length;
      consentRates[purpose.id] = totalUsers > 0 ? (usersWithConsent / totalUsers) * 100 : 0;
    });

    // Calculate data request statistics
    this.dataRequests.forEach(request => {
      dataRequests[request.requestType] = (dataRequests[request.requestType] || 0) + 1;
    });

    // Calculate average retention period
    const totalRetentionPeriod = this.dataPurposes.reduce((sum, purpose) => sum + purpose.retentionPeriod, 0);
    const averageRetentionPeriod = this.dataPurposes.length > 0 ? totalRetentionPeriod / this.dataPurposes.length : 0;

    return {
      totalUsers,
      consentRates,
      dataRequests,
      averageRetentionPeriod
    };
  }
}

export default ConsentManager;
