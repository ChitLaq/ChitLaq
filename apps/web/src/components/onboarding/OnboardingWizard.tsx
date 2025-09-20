import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../hooks/use-auth';
import { useOnboarding } from '../../hooks/use-onboarding';
import { trackOnboardingEvent } from '../../utils/onboarding-analytics';
import ProgressIndicator from './ProgressIndicator';
import EmailVerification from './steps/EmailVerification';
import ProfileSetup from './steps/ProfileSetup';
import InterestSelection from './steps/InterestSelection';
import UniversityNetwork from './steps/UniversityNetwork';
import { getLogger } from '../../../utils/logger';
import './onboarding.css';

const logger = getLogger('OnboardingWizard');

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<any>;
  required: boolean;
  skippable: boolean;
  estimatedTime: number; // in seconds
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'email-verification',
    title: 'Verify Your Email',
    description: 'We\'ve sent a verification code to your university email',
    component: EmailVerification,
    required: true,
    skippable: false,
    estimatedTime: 60,
  },
  {
    id: 'profile-setup',
    title: 'Complete Your Profile',
    description: 'Tell us about yourself to personalize your experience',
    component: ProfileSetup,
    required: true,
    skippable: false,
    estimatedTime: 120,
  },
  {
    id: 'interest-selection',
    title: 'Choose Your Interests',
    description: 'Select topics you\'re passionate about for better content',
    component: InterestSelection,
    required: false,
    skippable: true,
    estimatedTime: 90,
  },
  {
    id: 'university-network',
    title: 'Connect with Your University',
    description: 'Discover and connect with people from your university',
    component: UniversityNetwork,
    required: false,
    skippable: true,
    estimatedTime: 150,
  },
];

interface OnboardingWizardProps {
  initialStep?: string;
  onComplete?: () => void;
  onSkip?: () => void;
}

const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  initialStep = 'email-verification',
  onComplete,
  onSkip,
}) => {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const {
    currentStep,
    completedSteps,
    onboardingData,
    updateStep,
    completeStep,
    skipStep,
    saveOnboardingData,
    isLoading,
    error,
  } = useOnboarding();

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [stepStartTime, setStepStartTime] = useState<number>(Date.now());

  // Initialize onboarding
  useEffect(() => {
    if (!isAuthenticated || !user) {
      logger.warn('User not authenticated, redirecting to login');
      router.push('/login');
      return;
    }

    // Check if user has already completed onboarding
    if (user.onboardingCompleted) {
      logger.info('User has already completed onboarding, redirecting to feed');
      router.push('/feed');
      return;
    }

    // Track onboarding start
    trackOnboardingEvent('onboarding_started', {
      userId: user.id,
      university: user.universityName,
      userType: user.userType,
    });

    setStartTime(Date.now());
    setStepStartTime(Date.now());

    // Find initial step index
    const initialIndex = ONBOARDING_STEPS.findIndex(step => step.id === initialStep);
    if (initialIndex !== -1) {
      setCurrentStepIndex(initialIndex);
    }

    logger.info(`Onboarding initialized for user ${user.id} at step ${initialStep}`);
  }, [isAuthenticated, user, initialStep, router]);

  // Track step completion time
  const trackStepCompletion = useCallback((stepId: string, action: 'completed' | 'skipped') => {
    const stepDuration = (Date.now() - stepStartTime) / 1000;
    const totalDuration = (Date.now() - startTime) / 1000;
    
    trackOnboardingEvent(`onboarding_step_${action}`, {
      userId: user?.id,
      stepId,
      stepDuration,
      totalDuration,
      stepIndex: currentStepIndex,
      totalSteps: ONBOARDING_STEPS.length,
    });

    logger.info(`Step ${stepId} ${action} in ${stepDuration}s`);
  }, [user?.id, stepStartTime, startTime, currentStepIndex]);

  // Handle step completion
  const handleStepComplete = useCallback(async (stepData: any) => {
    if (!user) return;

    const currentStepInfo = ONBOARDING_STEPS[currentStepIndex];
    
    try {
      setIsTransitioning(true);
      
      // Save step data
      await saveOnboardingData(currentStepInfo.id, stepData);
      
      // Mark step as completed
      await completeStep(currentStepInfo.id);
      
      // Track completion
      trackStepCompletion(currentStepInfo.id, 'completed');
      
      // Move to next step or complete onboarding
      if (currentStepIndex < ONBOARDING_STEPS.length - 1) {
        const nextIndex = currentStepIndex + 1;
        setCurrentStepIndex(nextIndex);
        setStepStartTime(Date.now());
        
        // Update URL to reflect current step
        router.replace(`/onboarding?step=${ONBOARDING_STEPS[nextIndex].id}`, undefined, { shallow: true });
        
        logger.info(`Moving to step ${ONBOARDING_STEPS[nextIndex].id}`);
      } else {
        // Complete onboarding
        await handleOnboardingComplete();
      }
    } catch (error) {
      logger.error(`Error completing step ${currentStepInfo.id}:`, error);
    } finally {
      setIsTransitioning(false);
    }
  }, [user, currentStepIndex, saveOnboardingData, completeStep, trackStepCompletion, router]);

  // Handle step skip
  const handleStepSkip = useCallback(async () => {
    if (!user) return;

    const currentStepInfo = ONBOARDING_STEPS[currentStepIndex];
    
    try {
      setIsTransitioning(true);
      
      // Mark step as skipped
      await skipStep(currentStepInfo.id);
      
      // Track skip
      trackStepCompletion(currentStepInfo.id, 'skipped');
      
      // Move to next step or complete onboarding
      if (currentStepIndex < ONBOARDING_STEPS.length - 1) {
        const nextIndex = currentStepIndex + 1;
        setCurrentStepIndex(nextIndex);
        setStepStartTime(Date.now());
        
        // Update URL to reflect current step
        router.replace(`/onboarding?step=${ONBOARDING_STEPS[nextIndex].id}`, undefined, { shallow: true });
        
        logger.info(`Skipping to step ${ONBOARDING_STEPS[nextIndex].id}`);
      } else {
        // Complete onboarding
        await handleOnboardingComplete();
      }
    } catch (error) {
      logger.error(`Error skipping step ${currentStepInfo.id}:`, error);
    } finally {
      setIsTransitioning(false);
    }
  }, [user, currentStepIndex, skipStep, trackStepCompletion, router]);

  // Handle onboarding completion
  const handleOnboardingComplete = useCallback(async () => {
    if (!user) return;

    try {
      const totalDuration = (Date.now() - startTime) / 1000;
      
      // Track completion
      trackOnboardingEvent('onboarding_completed', {
        userId: user.id,
        totalDuration,
        completedSteps: completedSteps.length,
        skippedSteps: ONBOARDING_STEPS.length - completedSteps.length,
        university: user.universityName,
        userType: user.userType,
      });

      // Mark onboarding as completed in user profile
      await updateStep('onboarding_completed', { completed: true });
      
      logger.info(`Onboarding completed for user ${user.id} in ${totalDuration}s`);
      
      // Call completion callback
      if (onComplete) {
        onComplete();
      }
      
      // Redirect to feed
      router.push('/feed');
    } catch (error) {
      logger.error('Error completing onboarding:', error);
    }
  }, [user, startTime, completedSteps.length, updateStep, onComplete, router]);

  // Handle onboarding skip
  const handleOnboardingSkip = useCallback(async () => {
    if (!user) return;

    try {
      const totalDuration = (Date.now() - startTime) / 1000;
      
      // Track skip
      trackOnboardingEvent('onboarding_skipped', {
        userId: user.id,
        totalDuration,
        completedSteps: completedSteps.length,
        skippedSteps: ONBOARDING_STEPS.length - completedSteps.length,
        university: user.universityName,
        userType: user.userType,
      });

      // Mark onboarding as skipped
      await updateStep('onboarding_skipped', { skipped: true });
      
      logger.info(`Onboarding skipped for user ${user.id} after ${totalDuration}s`);
      
      // Call skip callback
      if (onSkip) {
        onSkip();
      }
      
      // Redirect to feed
      router.push('/feed');
    } catch (error) {
      logger.error('Error skipping onboarding:', error);
    }
  }, [user, startTime, completedSteps.length, updateStep, onSkip, router]);

  // Handle back navigation
  const handleBack = useCallback(() => {
    if (currentStepIndex > 0) {
      const prevIndex = currentStepIndex - 1;
      setCurrentStepIndex(prevIndex);
      setStepStartTime(Date.now());
      
      // Update URL to reflect current step
      router.replace(`/onboarding?step=${ONBOARDING_STEPS[prevIndex].id}`, undefined, { shallow: true });
      
      logger.info(`Moving back to step ${ONBOARDING_STEPS[prevIndex].id}`);
    }
  }, [currentStepIndex, router]);

  // Get current step info
  const currentStepInfo = ONBOARDING_STEPS[currentStepIndex];
  const progress = ((currentStepIndex + 1) / ONBOARDING_STEPS.length) * 100;
  const isLastStep = currentStepIndex === ONBOARDING_STEPS.length - 1;
  const canGoBack = currentStepIndex > 0;

  // Render current step component
  const CurrentStepComponent = currentStepInfo?.component;

  if (!isAuthenticated || !user) {
    return (
      <div className="onboarding-wizard">
        <div className="onboarding-loading">
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="onboarding-wizard">
        <div className="onboarding-loading">
          <div className="loading-spinner"></div>
          <p>Setting up your experience...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="onboarding-wizard">
        <div className="onboarding-error">
          <h2>Something went wrong</h2>
          <p>{error}</p>
          <button 
            className="btn btn-primary"
            onClick={() => window.location.reload()}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="onboarding-wizard">
      <div className="onboarding-container">
        {/* Header */}
        <div className="onboarding-header">
          <div className="onboarding-logo">
            <h1>ChitLaq</h1>
            <p>Welcome to your university network</p>
          </div>
          
          <div className="onboarding-progress">
            <ProgressIndicator
              currentStep={currentStepIndex}
              totalSteps={ONBOARDING_STEPS.length}
              completedSteps={completedSteps}
              progress={progress}
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="onboarding-content">
          <div className="onboarding-step-header">
            <h2>{currentStepInfo?.title}</h2>
            <p>{currentStepInfo?.description}</p>
            <div className="step-meta">
              <span className="step-number">
                Step {currentStepIndex + 1} of {ONBOARDING_STEPS.length}
              </span>
              <span className="estimated-time">
                ~{currentStepInfo?.estimatedTime}s
              </span>
            </div>
          </div>

          <div className={`onboarding-step-content ${isTransitioning ? 'transitioning' : ''}`}>
            {CurrentStepComponent && (
              <CurrentStepComponent
                user={user}
                onboardingData={onboardingData}
                onComplete={handleStepComplete}
                onSkip={currentStepInfo?.skippable ? handleStepSkip : undefined}
                onBack={canGoBack ? handleBack : undefined}
                isLoading={isTransitioning}
                error={error}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="onboarding-footer">
          <div className="onboarding-actions">
            {canGoBack && (
              <button
                className="btn btn-secondary"
                onClick={handleBack}
                disabled={isTransitioning}
              >
                Back
              </button>
            )}
            
            <div className="onboarding-skip">
              <button
                className="btn btn-link"
                onClick={handleOnboardingSkip}
                disabled={isTransitioning}
              >
                Skip onboarding
              </button>
            </div>
          </div>
          
          <div className="onboarding-help">
            <p>
              Need help? <a href="/support">Contact support</a> or{' '}
              <a href="/help">view our guide</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizard;
