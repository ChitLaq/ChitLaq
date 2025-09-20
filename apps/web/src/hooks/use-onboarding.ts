import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './use-auth';
import { trackOnboardingEvent } from '../utils/onboarding-analytics';
import { getLogger } from '../../../utils/logger';

const logger = getLogger('useOnboarding');

interface OnboardingData {
  [key: string]: any;
}

interface OnboardingStep {
  id: string;
  completed: boolean;
  skipped: boolean;
  data: any;
  completedAt?: string;
  skippedAt?: string;
}

interface UseOnboardingReturn {
  currentStep: string;
  completedSteps: string[];
  onboardingData: OnboardingData;
  isLoading: boolean;
  error: string | null;
  updateStep: (stepId: string, data: any) => Promise<void>;
  completeStep: (stepId: string) => Promise<void>;
  skipStep: (stepId: string) => Promise<void>;
  saveOnboardingData: (stepId: string, data: any) => Promise<void>;
  loadOnboardingProgress: () => Promise<void>;
  resetOnboarding: () => Promise<void>;
}

export const useOnboarding = (): UseOnboardingReturn => {
  const { user, isAuthenticated } = useAuth();
  const [currentStep, setCurrentStep] = useState<string>('email-verification');
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load onboarding progress on mount
  useEffect(() => {
    if (isAuthenticated && user) {
      loadOnboardingProgress();
    }
  }, [isAuthenticated, user]);

  // Load onboarding progress from server
  const loadOnboardingProgress = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/onboarding/progress?userId=${user.id}`);
      
      if (response.ok) {
        const data = await response.json();
        
        setCurrentStep(data.currentStep || 'email-verification');
        setCompletedSteps(data.completedSteps || []);
        setOnboardingData(data.onboardingData || {});
        
        logger.info(`Onboarding progress loaded for user ${user.id}`);
      } else {
        throw new Error('Failed to load onboarding progress');
      }
    } catch (error: any) {
      logger.error('Error loading onboarding progress:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Save onboarding data for a specific step
  const saveOnboardingData = useCallback(async (stepId: string, data: any) => {
    if (!user) return;

    try {
      const response = await fetch('/api/onboarding/save-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          stepId,
          data,
        }),
      });

      if (response.ok) {
        setOnboardingData(prev => ({
          ...prev,
          [stepId]: data,
        }));
        
        logger.debug(`Onboarding data saved for step ${stepId}`);
      } else {
        throw new Error('Failed to save onboarding data');
      }
    } catch (error: any) {
      logger.error(`Error saving onboarding data for step ${stepId}:`, error);
      throw error;
    }
  }, [user]);

  // Update current step
  const updateStep = useCallback(async (stepId: string, data: any) => {
    if (!user) return;

    try {
      const response = await fetch('/api/onboarding/update-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          stepId,
          data,
        }),
      });

      if (response.ok) {
        setCurrentStep(stepId);
        setOnboardingData(prev => ({
          ...prev,
          [stepId]: data,
        }));
        
        // Track step update
        trackOnboardingEvent('onboarding_step_updated', {
          userId: user.id,
          stepId,
          university: user.universityName,
        });
        
        logger.info(`Onboarding step updated to ${stepId} for user ${user.id}`);
      } else {
        throw new Error('Failed to update onboarding step');
      }
    } catch (error: any) {
      logger.error(`Error updating onboarding step to ${stepId}:`, error);
      throw error;
    }
  }, [user]);

  // Complete a step
  const completeStep = useCallback(async (stepId: string) => {
    if (!user) return;

    try {
      const response = await fetch('/api/onboarding/complete-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          stepId,
          completedAt: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        setCompletedSteps(prev => {
          if (!prev.includes(stepId)) {
            return [...prev, stepId];
          }
          return prev;
        });
        
        // Track step completion
        trackOnboardingEvent('onboarding_step_completed', {
          userId: user.id,
          stepId,
          university: user.universityName,
        });
        
        logger.info(`Onboarding step ${stepId} completed for user ${user.id}`);
      } else {
        throw new Error('Failed to complete onboarding step');
      }
    } catch (error: any) {
      logger.error(`Error completing onboarding step ${stepId}:`, error);
      throw error;
    }
  }, [user]);

  // Skip a step
  const skipStep = useCallback(async (stepId: string) => {
    if (!user) return;

    try {
      const response = await fetch('/api/onboarding/skip-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          stepId,
          skippedAt: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        // Track step skip
        trackOnboardingEvent('onboarding_step_skipped', {
          userId: user.id,
          stepId,
          university: user.universityName,
        });
        
        logger.info(`Onboarding step ${stepId} skipped for user ${user.id}`);
      } else {
        throw new Error('Failed to skip onboarding step');
      }
    } catch (error: any) {
      logger.error(`Error skipping onboarding step ${stepId}:`, error);
      throw error;
    }
  }, [user]);

  // Reset onboarding progress
  const resetOnboarding = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/onboarding/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
        }),
      });

      if (response.ok) {
        setCurrentStep('email-verification');
        setCompletedSteps([]);
        setOnboardingData({});
        
        // Track onboarding reset
        trackOnboardingEvent('onboarding_reset', {
          userId: user.id,
          university: user.universityName,
        });
        
        logger.info(`Onboarding reset for user ${user.id}`);
      } else {
        throw new Error('Failed to reset onboarding');
      }
    } catch (error: any) {
      logger.error('Error resetting onboarding:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  return {
    currentStep,
    completedSteps,
    onboardingData,
    isLoading,
    error,
    updateStep,
    completeStep,
    skipStep,
    saveOnboardingData,
    loadOnboardingProgress,
    resetOnboarding,
  };
};
