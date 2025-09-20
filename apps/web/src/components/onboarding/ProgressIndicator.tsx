import React from 'react';

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  completedSteps: string[];
  progress: number;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  currentStep,
  totalSteps,
  completedSteps,
  progress,
}) => {
  const steps = Array.from({ length: totalSteps }, (_, index) => ({
    number: index + 1,
    isCompleted: index < currentStep || completedSteps.includes(`step-${index}`),
    isCurrent: index === currentStep,
    isUpcoming: index > currentStep,
  }));

  const getStepStatus = (step: typeof steps[0]) => {
    if (step.isCompleted) return 'completed';
    if (step.isCurrent) return 'current';
    if (step.isUpcoming) return 'upcoming';
    return 'upcoming';
  };

  const getStepIcon = (step: typeof steps[0]) => {
    if (step.isCompleted) {
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" fill="#10B981"/>
          <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    }
    
    if (step.isCurrent) {
      return (
        <div className="current-step-indicator">
          <div className="pulse-ring"></div>
          <div className="pulse-dot"></div>
        </div>
      );
    }
    
    return (
      <span className="step-number">{step.number}</span>
    );
  };

  return (
    <div className="progress-indicator">
      <div className="progress-header">
        <div className="progress-title">
          <h4>Onboarding Progress</h4>
          <span className="progress-percentage">{Math.round(progress)}%</span>
        </div>
        <div className="progress-description">
          Step {currentStep + 1} of {totalSteps}
        </div>
      </div>

      <div className="progress-bar-container">
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="steps-container">
        {steps.map((step, index) => (
          <div
            key={index}
            className={`step-item ${getStepStatus(step)}`}
          >
            <div className="step-indicator">
              {getStepIcon(step)}
            </div>
            <div className="step-content">
              <div className="step-label">
                Step {step.number}
              </div>
              <div className="step-status">
                {step.isCompleted && 'Completed'}
                {step.isCurrent && 'Current'}
                {step.isUpcoming && 'Upcoming'}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="progress-stats">
        <div className="stat-item">
          <span className="stat-value">{completedSteps.length}</span>
          <span className="stat-label">Completed</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{totalSteps - currentStep - 1}</span>
          <span className="stat-label">Remaining</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{Math.round(progress)}%</span>
          <span className="stat-label">Progress</span>
        </div>
      </div>
    </div>
  );
};

export default ProgressIndicator;
