import React, { useState, useEffect, useCallback, useRef } from 'react';
import { trackOnboardingEvent } from '../../../utils/onboarding-analytics';
import { getLogger } from '../../../utils/logger';

const logger = getLogger('ProfileSetup');

interface ProfileSetupProps {
  user: any;
  onboardingData: any;
  onComplete: (data: any) => void;
  onSkip?: () => void;
  onBack?: () => void;
  isLoading: boolean;
  error?: string;
}

interface ProfileData {
  firstName: string;
  lastName: string;
  username: string;
  bio: string;
  profilePicture: File | null;
  profilePictureUrl: string | null;
  yearOfStudy: string;
  major: string;
  interests: string[];
  location: string;
  website: string;
  socialLinks: {
    linkedin: string;
    twitter: string;
    github: string;
  };
}

const ProfileSetup: React.FC<ProfileSetupProps> = ({
  user,
  onboardingData,
  onComplete,
  onSkip,
  onBack,
  isLoading,
  error,
}) => {
  const [profileData, setProfileData] = useState<ProfileData>({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    username: user?.username || '',
    bio: '',
    profilePicture: null,
    profilePictureUrl: null,
    yearOfStudy: '',
    major: '',
    interests: [],
    location: '',
    website: '',
    socialLinks: {
      linkedin: '',
      twitter: '',
      github: '',
    },
  });

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isValidating, setIsValidating] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'error' | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const usernameTimeoutRef = useRef<NodeJS.Timeout>();

  // Auto-save functionality
  useEffect(() => {
    const autoSaveTimeout = setTimeout(async () => {
      if (profileData.firstName || profileData.lastName || profileData.bio) {
        await handleAutoSave();
      }
    }, 2000);

    return () => clearTimeout(autoSaveTimeout);
  }, [profileData.firstName, profileData.lastName, profileData.bio]);

  // Username availability check
  useEffect(() => {
    if (usernameTimeoutRef.current) {
      clearTimeout(usernameTimeoutRef.current);
    }

    if (profileData.username && profileData.username.length >= 3) {
      usernameTimeoutRef.current = setTimeout(() => {
        checkUsernameAvailability(profileData.username);
      }, 500);
    } else {
      setUsernameAvailable(null);
      setUsernameError('');
    }

    return () => {
      if (usernameTimeoutRef.current) {
        clearTimeout(usernameTimeoutRef.current);
      }
    };
  }, [profileData.username]);

  // Check username availability
  const checkUsernameAvailability = useCallback(async (username: string) => {
    if (!username || username.length < 3) return;

    setIsCheckingUsername(true);
    setUsernameError('');

    try {
      const response = await fetch('/api/users/check-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });

      const data = await response.json();

      if (response.ok) {
        setUsernameAvailable(data.available);
        if (!data.available) {
          setUsernameError('Username is already taken');
        }
      } else {
        setUsernameError(data.error || 'Error checking username');
        setUsernameAvailable(false);
      }
    } catch (error) {
      logger.error('Error checking username availability:', error);
      setUsernameError('Error checking username availability');
      setUsernameAvailable(false);
    } finally {
      setIsCheckingUsername(false);
    }
  }, []);

  // Handle profile picture upload
  const handleProfilePictureUpload = useCallback(async (file: File) => {
    if (!file) return;

    // Validate file
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setFormErrors(prev => ({ ...prev, profilePicture: 'File size must be less than 5MB' }));
      return;
    }

    if (!file.type.startsWith('image/')) {
      setFormErrors(prev => ({ ...prev, profilePicture: 'Please select an image file' }));
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('profilePicture', file);

      const response = await fetch('/api/users/upload-profile-picture', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setProfileData(prev => ({
          ...prev,
          profilePicture: file,
          profilePictureUrl: data.url,
        }));
        setFormErrors(prev => ({ ...prev, profilePicture: '' }));
        
        // Track profile picture upload
        trackOnboardingEvent('profile_picture_uploaded', {
          userId: user.id,
          fileSize: file.size,
          fileType: file.type,
        });
      } else {
        const error = await response.json();
        setFormErrors(prev => ({ ...prev, profilePicture: error.message || 'Upload failed' }));
      }
    } catch (error) {
      logger.error('Error uploading profile picture:', error);
      setFormErrors(prev => ({ ...prev, profilePicture: 'Upload failed. Please try again.' }));
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [user.id]);

  // Handle file input change
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProfilePictureUpload(file);
    }
  }, [handleProfilePictureUpload]);

  // Handle input changes
  const handleInputChange = useCallback((field: string, value: any) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
    setFormErrors(prev => ({ ...prev, [field]: '' }));
  }, []);

  // Handle social link changes
  const handleSocialLinkChange = useCallback((platform: string, value: string) => {
    setProfileData(prev => ({
      ...prev,
      socialLinks: { ...prev.socialLinks, [platform]: value },
    }));
  }, []);

  // Auto-save functionality
  const handleAutoSave = useCallback(async () => {
    setAutoSaveStatus('saving');
    
    try {
      await fetch('/api/users/auto-save-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          profileData: {
            firstName: profileData.firstName,
            lastName: profileData.lastName,
            bio: profileData.bio,
          },
        }),
      });
      
      setAutoSaveStatus('saved');
      setTimeout(() => setAutoSaveStatus(null), 2000);
    } catch (error) {
      logger.error('Auto-save failed:', error);
      setAutoSaveStatus('error');
      setTimeout(() => setAutoSaveStatus(null), 3000);
    }
  }, [user.id, profileData.firstName, profileData.lastName, profileData.bio]);

  // Validate form
  const validateForm = useCallback(() => {
    const errors: Record<string, string> = {};

    if (!profileData.firstName.trim()) {
      errors.firstName = 'First name is required';
    }

    if (!profileData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    }

    if (!profileData.username.trim()) {
      errors.username = 'Username is required';
    } else if (profileData.username.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(profileData.username)) {
      errors.username = 'Username can only contain letters, numbers, and underscores';
    } else if (usernameAvailable === false) {
      errors.username = 'Username is already taken';
    }

    if (profileData.bio && profileData.bio.length > 500) {
      errors.bio = 'Bio must be less than 500 characters';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [profileData, usernameAvailable]);

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    if (!validateForm()) {
      return;
    }

    setIsValidating(true);

    try {
      // Track profile completion
      trackOnboardingEvent('profile_setup_completed', {
        userId: user.id,
        hasProfilePicture: !!profileData.profilePicture,
        hasBio: !!profileData.bio,
        hasSocialLinks: Object.values(profileData.socialLinks).some(link => link.trim()),
        university: user.universityName,
      });

      logger.info(`Profile setup completed for user ${user.id}`);

      onComplete({
        profileData,
        completed: true,
      });
    } catch (error) {
      logger.error('Error completing profile setup:', error);
    } finally {
      setIsValidating(false);
    }
  }, [validateForm, profileData, user, onComplete]);

  // Generate username suggestions
  const generateUsernameSuggestions = useCallback(() => {
    const suggestions = [];
    const firstName = profileData.firstName.toLowerCase();
    const lastName = profileData.lastName.toLowerCase();
    
    if (firstName && lastName) {
      suggestions.push(`${firstName}.${lastName}`);
      suggestions.push(`${firstName}${lastName}`);
      suggestions.push(`${firstName}_${lastName}`);
      suggestions.push(`${firstName}${lastName}${Math.floor(Math.random() * 100)}`);
    }
    
    return suggestions;
  }, [profileData.firstName, profileData.lastName]);

  const usernameSuggestions = generateUsernameSuggestions();

  return (
    <div className="profile-setup-step">
      <div className="profile-setup-container">
        {/* Auto-save indicator */}
        {autoSaveStatus && (
          <div className={`auto-save-indicator ${autoSaveStatus}`}>
            {autoSaveStatus === 'saving' && 'Saving...'}
            {autoSaveStatus === 'saved' && 'Saved'}
            {autoSaveStatus === 'error' && 'Save failed'}
          </div>
        )}

        {/* Profile Picture Section */}
        <div className="profile-picture-section">
          <h3>Profile Picture</h3>
          <div className="profile-picture-upload">
            <div className="profile-picture-preview">
              {profileData.profilePictureUrl ? (
                <img
                  src={profileData.profilePictureUrl}
                  alt="Profile preview"
                  className="profile-preview-image"
                />
              ) : (
                <div className="profile-picture-placeholder">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </div>
              )}
            </div>
            
            <div className="upload-actions">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="file-input"
                disabled={isUploading}
              />
              <button
                className="btn btn-secondary"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <div className="loading-spinner"></div>
                    Uploading... {uploadProgress}%
                  </>
                ) : (
                  'Upload Photo'
                )}
              </button>
              <p className="upload-hint">JPG, PNG or GIF. Max 5MB.</p>
            </div>
            
            {formErrors.profilePicture && (
              <div className="error-message">{formErrors.profilePicture}</div>
            )}
          </div>
        </div>

        {/* Basic Information */}
        <div className="basic-info-section">
          <h3>Basic Information</h3>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">First Name *</label>
              <input
                id="firstName"
                type="text"
                value={profileData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                className={formErrors.firstName ? 'error' : ''}
                placeholder="Enter your first name"
                disabled={isLoading}
              />
              {formErrors.firstName && (
                <div className="error-message">{formErrors.firstName}</div>
              )}
            </div>
            
            <div className="form-group">
              <label htmlFor="lastName">Last Name *</label>
              <input
                id="lastName"
                type="text"
                value={profileData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                className={formErrors.lastName ? 'error' : ''}
                placeholder="Enter your last name"
                disabled={isLoading}
              />
              {formErrors.lastName && (
                <div className="error-message">{formErrors.lastName}</div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="username">Username *</label>
            <div className="username-input-container">
              <input
                id="username"
                type="text"
                value={profileData.username}
                onChange={(e) => handleInputChange('username', e.target.value.toLowerCase())}
                className={`username-input ${formErrors.username ? 'error' : ''} ${usernameAvailable === true ? 'available' : ''}`}
                placeholder="Choose a username"
                disabled={isLoading}
              />
              {isCheckingUsername && (
                <div className="username-checking">
                  <div className="loading-spinner"></div>
                </div>
              )}
              {usernameAvailable === true && (
                <div className="username-available">✓ Available</div>
              )}
            </div>
            
            {formErrors.username && (
              <div className="error-message">{formErrors.username}</div>
            )}
            
            {usernameSuggestions.length > 0 && !profileData.username && (
              <div className="username-suggestions">
                <p>Suggestions:</p>
                <div className="suggestion-tags">
                  {usernameSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      className="suggestion-tag"
                      onClick={() => handleInputChange('username', suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Academic Information */}
        <div className="academic-info-section">
          <h3>Academic Information</h3>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="yearOfStudy">Year of Study</label>
              <select
                id="yearOfStudy"
                value={profileData.yearOfStudy}
                onChange={(e) => handleInputChange('yearOfStudy', e.target.value)}
                disabled={isLoading}
              >
                <option value="">Select year</option>
                <option value="freshman">Freshman</option>
                <option value="sophomore">Sophomore</option>
                <option value="junior">Junior</option>
                <option value="senior">Senior</option>
                <option value="graduate">Graduate</option>
                <option value="phd">PhD</option>
                <option value="postdoc">Postdoc</option>
                <option value="faculty">Faculty</option>
                <option value="staff">Staff</option>
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="major">Major/Department</label>
              <input
                id="major"
                type="text"
                value={profileData.major}
                onChange={(e) => handleInputChange('major', e.target.value)}
                placeholder="e.g., Computer Science"
                disabled={isLoading}
              />
            </div>
          </div>
        </div>

        {/* Bio Section */}
        <div className="bio-section">
          <h3>About You</h3>
          <div className="form-group">
            <label htmlFor="bio">Bio</label>
            <textarea
              id="bio"
              value={profileData.bio}
              onChange={(e) => handleInputChange('bio', e.target.value)}
              className={formErrors.bio ? 'error' : ''}
              placeholder="Tell us about yourself, your interests, and what you're studying..."
              rows={4}
              maxLength={500}
              disabled={isLoading}
            />
            <div className="character-count">
              {profileData.bio.length}/500
            </div>
            {formErrors.bio && (
              <div className="error-message">{formErrors.bio}</div>
            )}
          </div>
        </div>

        {/* Social Links */}
        <div className="social-links-section">
          <h3>Social Links (Optional)</h3>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="linkedin">LinkedIn</label>
              <input
                id="linkedin"
                type="url"
                value={profileData.socialLinks.linkedin}
                onChange={(e) => handleSocialLinkChange('linkedin', e.target.value)}
                placeholder="https://linkedin.com/in/yourname"
                disabled={isLoading}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="twitter">Twitter</label>
              <input
                id="twitter"
                type="url"
                value={profileData.socialLinks.twitter}
                onChange={(e) => handleSocialLinkChange('twitter', e.target.value)}
                placeholder="https://twitter.com/yourname"
                disabled={isLoading}
              />
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="github">GitHub</label>
            <input
              id="github"
              type="url"
              value={profileData.socialLinks.github}
              onChange={(e) => handleSocialLinkChange('github', e.target.value)}
              placeholder="https://github.com/yourname"
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="profile-actions">
          <button
            className="btn btn-primary btn-large"
            onClick={handleSubmit}
            disabled={isValidating || isLoading || !validateForm()}
          >
            {isValidating ? (
              <>
                <div className="loading-spinner"></div>
                Completing Profile...
              </>
            ) : (
              'Complete Profile'
            )}
          </button>
          
          {onSkip && (
            <button
              className="btn btn-link"
              onClick={onSkip}
              disabled={isValidating || isLoading}
            >
              Skip for now
            </button>
          )}
        </div>

        {/* University Context */}
        <div className="university-context">
          <div className="university-badge">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor"/>
            </svg>
            <span>Building your {user.universityName} profile</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSetup;
