import { getLogger } from '../../../utils/logger';

const logger = getLogger('OnboardingAnalytics');

interface OnboardingEvent {
  event: string;
  userId: string;
  timestamp: string;
  properties: Record<string, any>;
  sessionId?: string;
  page?: string;
  referrer?: string;
}

interface OnboardingMetrics {
  stepCompletionRate: number;
  averageTimePerStep: number;
  dropoffPoints: string[];
  conversionRate: number;
  userEngagement: number;
}

class OnboardingAnalytics {
  private events: OnboardingEvent[] = [];
  private sessionId: string;
  private startTime: number;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();
  }

  private generateSessionId(): string {
    return `onboarding_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async sendEvent(event: OnboardingEvent): Promise<void> {
    try {
      // Send to analytics service
      await fetch('/api/analytics/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });

      // Store locally for debugging
      this.events.push(event);
      
      logger.debug(`Onboarding event tracked: ${event.event}`, event.properties);
    } catch (error) {
      logger.error('Failed to send onboarding analytics event:', error);
    }
  }

  private getEventProperties(baseProperties: Record<string, any>): Record<string, any> {
    return {
      ...baseProperties,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      page: window.location.pathname,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
    };
  }

  // Track onboarding start
  public async trackOnboardingStart(userId: string, properties: Record<string, any> = {}): Promise<void> {
    const event: OnboardingEvent = {
      event: 'onboarding_started',
      userId,
      timestamp: new Date().toISOString(),
      properties: this.getEventProperties({
        ...properties,
        startTime: this.startTime,
      }),
      sessionId: this.sessionId,
    };

    await this.sendEvent(event);
  }

  // Track step completion
  public async trackStepCompletion(
    userId: string,
    stepId: string,
    stepData: any,
    timeSpent: number,
    properties: Record<string, any> = {}
  ): Promise<void> {
    const event: OnboardingEvent = {
      event: 'onboarding_step_completed',
      userId,
      timestamp: new Date().toISOString(),
      properties: this.getEventProperties({
        ...properties,
        stepId,
        stepData,
        timeSpent,
        stepNumber: this.getStepNumber(stepId),
      }),
      sessionId: this.sessionId,
    };

    await this.sendEvent(event);
  }

  // Track step skip
  public async trackStepSkip(
    userId: string,
    stepId: string,
    timeSpent: number,
    properties: Record<string, any> = {}
  ): Promise<void> {
    const event: OnboardingEvent = {
      event: 'onboarding_step_skipped',
      userId,
      timestamp: new Date().toISOString(),
      properties: this.getEventProperties({
        ...properties,
        stepId,
        timeSpent,
        stepNumber: this.getStepNumber(stepId),
      }),
      sessionId: this.sessionId,
    };

    await this.sendEvent(event);
  }

  // Track onboarding completion
  public async trackOnboardingCompletion(
    userId: string,
    totalTime: number,
    completedSteps: string[],
    skippedSteps: string[],
    properties: Record<string, any> = {}
  ): Promise<void> {
    const event: OnboardingEvent = {
      event: 'onboarding_completed',
      userId,
      timestamp: new Date().toISOString(),
      properties: this.getEventProperties({
        ...properties,
        totalTime,
        completedSteps,
        skippedSteps,
        completionRate: completedSteps.length / (completedSteps.length + skippedSteps.length),
        totalSteps: completedSteps.length + skippedSteps.length,
      }),
      sessionId: this.sessionId,
    };

    await this.sendEvent(event);
  }

  // Track onboarding abandonment
  public async trackOnboardingAbandonment(
    userId: string,
    lastStep: string,
    timeSpent: number,
    properties: Record<string, any> = {}
  ): Promise<void> {
    const event: OnboardingEvent = {
      event: 'onboarding_abandoned',
      userId,
      timestamp: new Date().toISOString(),
      properties: this.getEventProperties({
        ...properties,
        lastStep,
        timeSpent,
        stepNumber: this.getStepNumber(lastStep),
      }),
      sessionId: this.sessionId,
    };

    await this.sendEvent(event);
  }

  // Track email verification events
  public async trackEmailVerification(
    userId: string,
    action: 'sent' | 'verified' | 'failed' | 'resend',
    properties: Record<string, any> = {}
  ): Promise<void> {
    const event: OnboardingEvent = {
      event: `email_verification_${action}`,
      userId,
      timestamp: new Date().toISOString(),
      properties: this.getEventProperties(properties),
      sessionId: this.sessionId,
    };

    await this.sendEvent(event);
  }

  // Track profile setup events
  public async trackProfileSetup(
    userId: string,
    action: 'started' | 'completed' | 'picture_uploaded' | 'bio_added',
    properties: Record<string, any> = {}
  ): Promise<void> {
    const event: OnboardingEvent = {
      event: `profile_setup_${action}`,
      userId,
      timestamp: new Date().toISOString(),
      properties: this.getEventProperties(properties),
      sessionId: this.sessionId,
    };

    await this.sendEvent(event);
  }

  // Track interest selection
  public async trackInterestSelection(
    userId: string,
    action: 'started' | 'completed' | 'interest_selected' | 'interest_deselected',
    properties: Record<string, any> = {}
  ): Promise<void> {
    const event: OnboardingEvent = {
      event: `interest_selection_${action}`,
      userId,
      timestamp: new Date().toISOString(),
      properties: this.getEventProperties(properties),
      sessionId: this.sessionId,
    };

    await this.sendEvent(event);
  }

  // Track university network events
  public async trackUniversityNetwork(
    userId: string,
    action: 'started' | 'completed' | 'connection_requested' | 'connection_accepted',
    properties: Record<string, any> = {}
  ): Promise<void> {
    const event: OnboardingEvent = {
      event: `university_network_${action}`,
      userId,
      timestamp: new Date().toISOString(),
      properties: this.getEventProperties(properties),
      sessionId: this.sessionId,
    };

    await this.sendEvent(event);
  }

  // Track user engagement
  public async trackUserEngagement(
    userId: string,
    action: 'click' | 'scroll' | 'hover' | 'focus',
    element: string,
    properties: Record<string, any> = {}
  ): Promise<void> {
    const event: OnboardingEvent = {
      event: `user_engagement_${action}`,
      userId,
      timestamp: new Date().toISOString(),
      properties: this.getEventProperties({
        ...properties,
        element,
        action,
      }),
      sessionId: this.sessionId,
    };

    await this.sendEvent(event);
  }

  // Track errors
  public async trackError(
    userId: string,
    error: string,
    stepId: string,
    properties: Record<string, any> = {}
  ): Promise<void> {
    const event: OnboardingEvent = {
      event: 'onboarding_error',
      userId,
      timestamp: new Date().toISOString(),
      properties: this.getEventProperties({
        ...properties,
        error,
        stepId,
        stepNumber: this.getStepNumber(stepId),
      }),
      sessionId: this.sessionId,
    };

    await this.sendEvent(event);
  }

  // Track A/B test events
  public async trackABTest(
    userId: string,
    testName: string,
    variant: string,
    action: 'exposed' | 'converted' | 'failed',
    properties: Record<string, any> = {}
  ): Promise<void> {
    const event: OnboardingEvent = {
      event: `ab_test_${action}`,
      userId,
      timestamp: new Date().toISOString(),
      properties: this.getEventProperties({
        ...properties,
        testName,
        variant,
        action,
      }),
      sessionId: this.sessionId,
    };

    await this.sendEvent(event);
  }

  // Get step number for analytics
  private getStepNumber(stepId: string): number {
    const stepMap: Record<string, number> = {
      'email-verification': 1,
      'profile-setup': 2,
      'interest-selection': 3,
      'university-network': 4,
    };
    return stepMap[stepId] || 0;
  }

  // Get session duration
  public getSessionDuration(): number {
    return Date.now() - this.startTime;
  }

  // Get events for debugging
  public getEvents(): OnboardingEvent[] {
    return [...this.events];
  }

  // Clear events
  public clearEvents(): void {
    this.events = [];
  }
}

// Global instance
let analyticsInstance: OnboardingAnalytics | null = null;

export const getOnboardingAnalytics = (): OnboardingAnalytics => {
  if (!analyticsInstance) {
    analyticsInstance = new OnboardingAnalytics();
  }
  return analyticsInstance;
};

// Convenience functions
export const trackOnboardingEvent = async (
  event: string,
  properties: Record<string, any> = {}
): Promise<void> => {
  const analytics = getOnboardingAnalytics();
  
  // Map event names to methods
  const eventMap: Record<string, (userId: string, props: Record<string, any>) => Promise<void>> = {
    'onboarding_started': analytics.trackOnboardingStart,
    'onboarding_step_completed': (userId, props) => 
      analytics.trackStepCompletion(userId, props.stepId, props.stepData, props.timeSpent, props),
    'onboarding_step_skipped': (userId, props) => 
      analytics.trackStepSkip(userId, props.stepId, props.timeSpent, props),
    'onboarding_completed': (userId, props) => 
      analytics.trackOnboardingCompletion(userId, props.totalTime, props.completedSteps, props.skippedSteps, props),
    'onboarding_abandoned': (userId, props) => 
      analytics.trackOnboardingAbandonment(userId, props.lastStep, props.timeSpent, props),
    'email_verification_sent': (userId, props) => 
      analytics.trackEmailVerification(userId, 'sent', props),
    'email_verification_verified': (userId, props) => 
      analytics.trackEmailVerification(userId, 'verified', props),
    'email_verification_failed': (userId, props) => 
      analytics.trackEmailVerification(userId, 'failed', props),
    'email_verification_resend': (userId, props) => 
      analytics.trackEmailVerification(userId, 'resend', props),
    'profile_setup_started': (userId, props) => 
      analytics.trackProfileSetup(userId, 'started', props),
    'profile_setup_completed': (userId, props) => 
      analytics.trackProfileSetup(userId, 'completed', props),
    'profile_picture_uploaded': (userId, props) => 
      analytics.trackProfileSetup(userId, 'picture_uploaded', props),
    'interest_selection_started': (userId, props) => 
      analytics.trackInterestSelection(userId, 'started', props),
    'interest_selection_completed': (userId, props) => 
      analytics.trackInterestSelection(userId, 'completed', props),
    'interest_selected': (userId, props) => 
      analytics.trackInterestSelection(userId, 'interest_selected', props),
    'university_network_started': (userId, props) => 
      analytics.trackUniversityNetwork(userId, 'started', props),
    'university_network_completed': (userId, props) => 
      analytics.trackUniversityNetwork(userId, 'completed', props),
    'connection_requested': (userId, props) => 
      analytics.trackUniversityNetwork(userId, 'connection_requested', props),
  };

  const handler = eventMap[event];
  if (handler && properties.userId) {
    await handler(properties.userId, properties);
  } else {
    logger.warn(`Unknown onboarding event: ${event}`);
  }
};

// Analytics dashboard data
export const getOnboardingMetrics = async (): Promise<OnboardingMetrics> => {
  try {
    const response = await fetch('/api/analytics/onboarding/metrics');
    if (response.ok) {
      return await response.json();
    }
    throw new Error('Failed to fetch onboarding metrics');
  } catch (error) {
    logger.error('Error fetching onboarding metrics:', error);
    throw error;
  }
};

// Export analytics instance for direct access
export { OnboardingAnalytics };
