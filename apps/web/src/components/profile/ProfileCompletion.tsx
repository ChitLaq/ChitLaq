import React, { useState, useCallback, useEffect } from 'react';
import './ProfileCompletion.css';

export interface ProfileCompletionProps {
  profile: {
    username?: string;
    bio?: string;
    avatar?: string;
    university?: string;
    academicYear?: string;
    interests?: string[];
    location?: string;
    birthDate?: string;
    phone?: string;
    website?: string;
    socialLinks?: {
      twitter?: string;
      linkedin?: string;
      github?: string;
    };
  };
  onComplete: (field: string, value: any) => void;
  className?: string;
}

export interface CompletionStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  required: boolean;
  completed: boolean;
  weight: number;
}

const ProfileCompletion: React.FC<ProfileCompletionProps> = ({
  profile,
  onComplete,
  className = ''
}) => {
  const [activeStep, setActiveStep] = useState<string>('');
  const [showAllSteps, setShowAllSteps] = useState(false);

  // Calculate completion steps
  const getCompletionSteps = useCallback((): CompletionStep[] => {
    return [
      {
        id: 'username',
        title: 'Username',
        description: 'Choose a unique username for your profile',
        icon: '👤',
        required: true,
        completed: !!profile.username,
        weight: 20
      },
      {
        id: 'bio',
        title: 'Bio',
        description: 'Tell others about yourself',
        icon: '📝',
        required: false,
        completed: !!profile.bio,
        weight: 15
      },
      {
        id: 'avatar',
        title: 'Profile Picture',
        description: 'Add a profile picture to personalize your account',
        icon: '📸',
        required: false,
        completed: !!profile.avatar,
        weight: 15
      },
      {
        id: 'university',
        title: 'University',
        description: 'Connect with your university community',
        icon: '🎓',
        required: true,
        completed: !!profile.university,
        weight: 20
      },
      {
        id: 'academicYear',
        title: 'Academic Year',
        description: 'Share your academic year',
        icon: '📚',
        required: false,
        completed: !!profile.academicYear,
        weight: 10
      },
      {
        id: 'interests',
        title: 'Interests',
        description: 'Add your interests to discover relevant content',
        icon: '❤️',
        required: false,
        completed: !!profile.interests && profile.interests.length > 0,
        weight: 10
      },
      {
        id: 'location',
        title: 'Location',
        description: 'Share your location to connect with nearby users',
        icon: '📍',
        required: false,
        completed: !!profile.location,
        weight: 5
      },
      {
        id: 'birthDate',
        title: 'Birth Date',
        description: 'Add your birth date for age verification',
        icon: '🎂',
        required: false,
        completed: !!profile.birthDate,
        weight: 5
      }
    ];
  }, [profile]);

  // Calculate completion percentage
  const getCompletionPercentage = useCallback((): number => {
    const steps = getCompletionSteps();
    const totalWeight = steps.reduce((sum, step) => sum + step.weight, 0);
    const completedWeight = steps
      .filter(step => step.completed)
      .reduce((sum, step) => sum + step.weight, 0);
    return Math.round((completedWeight / totalWeight) * 100);
  }, [getCompletionSteps]);

  // Get completion status
  const getCompletionStatus = useCallback((): 'incomplete' | 'partial' | 'complete' => {
    const percentage = getCompletionPercentage();
    if (percentage >= 90) return 'complete';
    if (percentage >= 50) return 'partial';
    return 'incomplete';
  }, [getCompletionPercentage]);

  // Get completion message
  const getCompletionMessage = useCallback((): string => {
    const status = getCompletionStatus();
    const percentage = getCompletionPercentage();
    
    switch (status) {
      case 'complete':
        return 'Your profile is complete! Great job!';
      case 'partial':
        return `Your profile is ${percentage}% complete. Add more information to improve your profile.`;
      default:
        return `Your profile is ${percentage}% complete. Complete the required fields to get started.`;
    }
  }, [getCompletionStatus, getCompletionPercentage]);

  // Get completion color
  const getCompletionColor = useCallback((): string => {
    const status = getCompletionStatus();
    switch (status) {
      case 'complete': return 'profile-completion--complete';
      case 'partial': return 'profile-completion--partial';
      default: return 'profile-completion--incomplete';
    }
  }, [getCompletionStatus]);

  // Handle step click
  const handleStepClick = useCallback((stepId: string) => {
    setActiveStep(stepId);
  }, []);

  // Handle show all steps toggle
  const handleShowAllStepsToggle = useCallback(() => {
    setShowAllSteps(!showAllSteps);
  }, [showAllSteps]);

  // Handle step completion
  const handleStepCompletion = useCallback((stepId: string, value: any) => {
    onComplete(stepId, value);
    setActiveStep('');
  }, [onComplete]);

  // Get step component
  const getStepComponent = useCallback((step: CompletionStep) => {
    switch (step.id) {
      case 'username':
        return (
          <div className="profile-completion__step-content">
            <input
              type="text"
              placeholder="Enter your username"
              value={profile.username || ''}
              onChange={(e) => handleStepCompletion('username', e.target.value)}
              className="profile-completion__input"
            />
          </div>
        );
      
      case 'bio':
        return (
          <div className="profile-completion__step-content">
            <textarea
              placeholder="Tell others about yourself..."
              value={profile.bio || ''}
              onChange={(e) => handleStepCompletion('bio', e.target.value)}
              className="profile-completion__textarea"
              rows={4}
            />
          </div>
        );
      
      case 'avatar':
        return (
          <div className="profile-completion__step-content">
            <div className="profile-completion__avatar-upload">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      handleStepCompletion('avatar', event.target?.result);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className="profile-completion__file-input"
              />
              <div className="profile-completion__avatar-preview">
                {profile.avatar ? (
                  <img src={profile.avatar} alt="Profile" className="profile-completion__avatar-image" />
                ) : (
                  <div className="profile-completion__avatar-placeholder">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      
      case 'university':
        return (
          <div className="profile-completion__step-content">
            <select
              value={profile.university || ''}
              onChange={(e) => handleStepCompletion('university', e.target.value)}
              className="profile-completion__select"
            >
              <option value="">Select your university</option>
              <option value="MIT">Massachusetts Institute of Technology</option>
              <option value="Stanford">Stanford University</option>
              <option value="Harvard">Harvard University</option>
              <option value="Berkeley">University of California, Berkeley</option>
              <option value="Caltech">California Institute of Technology</option>
            </select>
          </div>
        );
      
      case 'academicYear':
        return (
          <div className="profile-completion__step-content">
            <select
              value={profile.academicYear || ''}
              onChange={(e) => handleStepCompletion('academicYear', e.target.value)}
              className="profile-completion__select"
            >
              <option value="">Select your academic year</option>
              <option value="Freshman">Freshman</option>
              <option value="Sophomore">Sophomore</option>
              <option value="Junior">Junior</option>
              <option value="Senior">Senior</option>
              <option value="Graduate">Graduate</option>
              <option value="PhD">PhD</option>
            </select>
          </div>
        );
      
      case 'interests':
        return (
          <div className="profile-completion__step-content">
            <div className="profile-completion__interests">
              {['Technology', 'Science', 'Art', 'Music', 'Sports', 'Travel', 'Food', 'Books'].map((interest) => (
                <label key={interest} className="profile-completion__interest">
                  <input
                    type="checkbox"
                    checked={profile.interests?.includes(interest) || false}
                    onChange={(e) => {
                      const currentInterests = profile.interests || [];
                      const newInterests = e.target.checked
                        ? [...currentInterests, interest]
                        : currentInterests.filter(i => i !== interest);
                      handleStepCompletion('interests', newInterests);
                    }}
                  />
                  <span>{interest}</span>
                </label>
              ))}
            </div>
          </div>
        );
      
      case 'location':
        return (
          <div className="profile-completion__step-content">
            <input
              type="text"
              placeholder="Enter your location"
              value={profile.location || ''}
              onChange={(e) => handleStepCompletion('location', e.target.value)}
              className="profile-completion__input"
            />
          </div>
        );
      
      case 'birthDate':
        return (
          <div className="profile-completion__step-content">
            <input
              type="date"
              value={profile.birthDate || ''}
              onChange={(e) => handleStepCompletion('birthDate', e.target.value)}
              className="profile-completion__input"
            />
          </div>
        );
      
      default:
        return null;
    }
  }, [profile, handleStepCompletion]);

  const steps = getCompletionSteps();
  const completionPercentage = getCompletionPercentage();
  const completionStatus = getCompletionStatus();
  const completionMessage = getCompletionMessage();
  const completionColor = getCompletionColor();

  return (
    <div className={`profile-completion ${className}`}>
      {/* Header */}
      <div className="profile-completion__header">
        <h3 className="profile-completion__title">Complete Your Profile</h3>
        <div className={`profile-completion__status ${completionColor}`}>
          <div className="profile-completion__status-circle">
            <span className="profile-completion__status-value">{completionPercentage}%</span>
          </div>
          <div className="profile-completion__status-label">{completionMessage}</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="profile-completion__progress">
        <div className="profile-completion__progress-bar">
          <div 
            className="profile-completion__progress-fill"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
        <div className="profile-completion__progress-text">
          {completionPercentage}% Complete
        </div>
      </div>

      {/* Steps */}
      <div className="profile-completion__steps">
        {steps.map((step) => (
          <div key={step.id} className="profile-completion__step">
            <div 
              className={`profile-completion__step-header ${step.completed ? 'profile-completion__step-header--completed' : ''}`}
              onClick={() => handleStepClick(step.id)}
            >
              <div className="profile-completion__step-icon">
                {step.completed ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20,6 9,17 4,12" />
                  </svg>
                ) : (
                  <span>{step.icon}</span>
                )}
              </div>
              <div className="profile-completion__step-info">
                <div className="profile-completion__step-title">
                  {step.title}
                  {step.required && <span className="profile-completion__step-required">*</span>}
                </div>
                <div className="profile-completion__step-description">{step.description}</div>
              </div>
              <div className="profile-completion__step-actions">
                {step.completed ? (
                  <div className="profile-completion__step-completed">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20,6 9,17 4,12" />
                    </svg>
                  </div>
                ) : (
                  <div className="profile-completion__step-incomplete">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="9,18 15,12 9,6" />
                    </svg>
                  </div>
                )}
              </div>
            </div>

            {activeStep === step.id && (
              <div className="profile-completion__step-body">
                {getStepComponent(step)}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Show All Steps Toggle */}
      <div className="profile-completion__show-all">
        <button
          className="profile-completion__show-all-button"
          onClick={handleShowAllStepsToggle}
        >
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
            className={`profile-completion__show-all-icon ${showAllSteps ? 'profile-completion__show-all-icon--expanded' : ''}`}
          >
            <polyline points="6,9 12,15 18,9" />
          </svg>
          {showAllSteps ? 'Hide All Steps' : 'Show All Steps'}
        </button>
      </div>

      {/* Footer */}
      <div className="profile-completion__footer">
        <div className="profile-completion__footer-info">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
          <span>Complete your profile to improve your experience</span>
        </div>
      </div>
    </div>
  );
};

export default ProfileCompletion;
