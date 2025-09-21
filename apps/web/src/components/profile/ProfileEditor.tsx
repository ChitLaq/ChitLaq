import React, { useState, useCallback, useEffect } from 'react';
import { useProfile } from '../../hooks/use-profile';
import { useAuth } from '../../hooks/use-auth';
import AvatarUpload from './AvatarUpload';
import UniversityCard from './UniversityCard';
import PrivacySettings from './PrivacySettings';
import './ProfileEditor.css';

export interface ProfileEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (profile: any) => void;
  className?: string;
}

export interface ProfileFormData {
  displayName: string;
  username: string;
  bio: string;
  location: string;
  website: string;
  birthDate: string;
  gender: string;
  interests: string[];
  avatar?: File;
  banner?: File;
  privacy: {
    profileVisibility: 'public' | 'friends' | 'private';
    showEmail: boolean;
    showLocation: boolean;
    showBirthDate: boolean;
    showInterests: boolean;
  };
}

const ProfileEditor: React.FC<ProfileEditorProps> = ({
  isOpen,
  onClose,
  onSave,
  className = ''
}) => {
  const { user: currentUser } = useAuth();
  const {
    profile,
    isLoading,
    error,
    updateProfile,
    validateUsername
  } = useProfile(currentUser?.id || '');

  const [formData, setFormData] = useState<ProfileFormData>({
    displayName: '',
    username: '',
    bio: '',
    location: '',
    website: '',
    birthDate: '',
    gender: '',
    interests: [],
    privacy: {
      profileVisibility: 'public',
      showEmail: false,
      showLocation: false,
      showBirthDate: false,
      showInterests: true
    }
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'basic' | 'details' | 'privacy'>('basic');

  // Initialize form data when profile loads
  useEffect(() => {
    if (profile) {
      setFormData({
        displayName: profile.displayName || '',
        username: profile.username || '',
        bio: profile.bio || '',
        location: profile.location || '',
        website: profile.website || '',
        birthDate: profile.birthDate || '',
        gender: profile.gender || '',
        interests: profile.interests || [],
        privacy: {
          profileVisibility: profile.privacy?.profileVisibility || 'public',
          showEmail: profile.privacy?.showEmail || false,
          showLocation: profile.privacy?.showLocation || false,
          showBirthDate: profile.privacy?.showBirthDate || false,
          showInterests: profile.privacy?.showInterests || true
        }
      });
    }
  }, [profile]);

  // Handle input changes
  const handleInputChange = useCallback((field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  }, [errors]);

  // Handle privacy setting changes
  const handlePrivacyChange = useCallback((field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      privacy: {
        ...prev.privacy,
        [field]: value
      }
    }));
  }, []);

  // Handle interest changes
  const handleInterestChange = useCallback((interests: string[]) => {
    setFormData(prev => ({
      ...prev,
      interests
    }));
  }, []);

  // Validate form field
  const validateField = useCallback(async (field: string, value: any): Promise<string> => {
    switch (field) {
      case 'displayName':
        if (!value.trim()) return 'Display name is required';
        if (value.length < 2) return 'Display name must be at least 2 characters';
        if (value.length > 50) return 'Display name must be less than 50 characters';
        break;

      case 'username':
        if (!value.trim()) return 'Username is required';
        if (!/^[a-zA-Z0-9_]+$/.test(value)) return 'Username can only contain letters, numbers, and underscores';
        if (value.length < 3) return 'Username must be at least 3 characters';
        if (value.length > 30) return 'Username must be less than 30 characters';
        
        // Check if username is available
        if (value !== profile?.username) {
          try {
            const isAvailable = await validateUsername(value);
            if (!isAvailable) return 'Username is already taken';
          } catch (error) {
            return 'Failed to validate username';
          }
        }
        break;

      case 'bio':
        if (value.length > 500) return 'Bio must be less than 500 characters';
        break;

      case 'website':
        if (value && !/^https?:\/\/.+/.test(value)) {
          return 'Website must be a valid URL starting with http:// or https://';
        }
        break;

      case 'birthDate':
        if (value) {
          const birthDate = new Date(value);
          const today = new Date();
          const age = today.getFullYear() - birthDate.getFullYear();
          if (age < 13) return 'You must be at least 13 years old';
          if (age > 120) return 'Please enter a valid birth date';
        }
        break;
    }

    return '';
  }, [profile, validateUsername]);

  // Handle field blur
  const handleFieldBlur = useCallback(async (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    
    const error = await validateField(field, formData[field as keyof ProfileFormData]);
    if (error) {
      setErrors(prev => ({ ...prev, [field]: error }));
    }
  }, [formData, validateField]);

  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    try {
      // Validate all fields
      const validationErrors: Record<string, string> = {};
      
      for (const field of ['displayName', 'username', 'bio', 'website', 'birthDate']) {
        const error = await validateField(field, formData[field as keyof ProfileFormData]);
        if (error) {
          validationErrors[field] = error;
        }
      }

      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        setIsSubmitting(false);
        return;
      }

      // Update profile
      await updateProfile(formData);
      
      onSave?.(formData);
      onClose();
    } catch (error) {
      console.error('Failed to update profile:', error);
      setErrors({ submit: 'Failed to update profile. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateField, updateProfile, onSave, onClose]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    onClose();
  }, [onClose]);

  // Handle tab change
  const handleTabChange = useCallback((tab: 'basic' | 'details' | 'privacy') => {
    setActiveTab(tab);
  }, []);

  // Get character count for bio
  const getBioCharacterCount = useCallback(() => {
    return formData.bio.length;
  }, [formData.bio]);

  // Get bio character count color
  const getBioCharacterCountColor = useCallback(() => {
    const count = getBioCharacterCount();
    if (count > 450) return 'text-red-500';
    if (count > 400) return 'text-yellow-500';
    return 'text-gray-500';
  }, [getBioCharacterCount]);

  if (!isOpen) return null;

  return (
    <div className={`profile-editor ${className}`}>
      <div className="profile-editor__overlay" onClick={handleCancel} />
      
      <div className="profile-editor__modal">
        <div className="profile-editor__header">
          <h2 className="profile-editor__title">Edit Profile</h2>
          <button
            className="profile-editor__close"
            onClick={handleCancel}
            aria-label="Close"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="profile-editor__tabs">
          <button
            className={`profile-editor__tab ${activeTab === 'basic' ? 'profile-editor__tab--active' : ''}`}
            onClick={() => handleTabChange('basic')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Basic Info
          </button>
          
          <button
            className={`profile-editor__tab ${activeTab === 'details' ? 'profile-editor__tab--active' : ''}`}
            onClick={() => handleTabChange('details')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            Details
          </button>
          
          <button
            className={`profile-editor__tab ${activeTab === 'privacy' ? 'profile-editor__tab--active' : ''}`}
            onClick={() => handleTabChange('privacy')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <circle cx="12" cy="16" r="1" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Privacy
          </button>
        </div>

        <form className="profile-editor__form" onSubmit={handleSubmit}>
          <div className="profile-editor__content">
            {/* Basic Info Tab */}
            {activeTab === 'basic' && (
              <div className="profile-editor__tab-content">
                {/* Avatar Upload */}
                <div className="profile-editor__section">
                  <label className="profile-editor__label">Profile Picture</label>
                  <AvatarUpload
                    type="avatar"
                    onUploadComplete={(file) => handleInputChange('avatar', file)}
                    onUploadError={(error) => console.error('Avatar upload failed:', error)}
                    cropEnabled={true}
                    aspectRatio={1}
                    showPreview={true}
                  />
                </div>

                {/* Display Name */}
                <div className="profile-editor__field">
                  <label className="profile-editor__label" htmlFor="displayName">
                    Display Name *
                  </label>
                  <input
                    id="displayName"
                    type="text"
                    className={`profile-editor__input ${errors.displayName ? 'profile-editor__input--error' : ''}`}
                    value={formData.displayName}
                    onChange={(e) => handleInputChange('displayName', e.target.value)}
                    onBlur={() => handleFieldBlur('displayName')}
                    placeholder="Enter your display name"
                    maxLength={50}
                    required
                  />
                  {errors.displayName && (
                    <div className="profile-editor__error">{errors.displayName}</div>
                  )}
                </div>

                {/* Username */}
                <div className="profile-editor__field">
                  <label className="profile-editor__label" htmlFor="username">
                    Username *
                  </label>
                  <input
                    id="username"
                    type="text"
                    className={`profile-editor__input ${errors.username ? 'profile-editor__input--error' : ''}`}
                    value={formData.username}
                    onChange={(e) => handleInputChange('username', e.target.value.toLowerCase())}
                    onBlur={() => handleFieldBlur('username')}
                    placeholder="Enter your username"
                    maxLength={30}
                    required
                  />
                  {errors.username && (
                    <div className="profile-editor__error">{errors.username}</div>
                  )}
                </div>

                {/* Bio */}
                <div className="profile-editor__field">
                  <label className="profile-editor__label" htmlFor="bio">
                    Bio
                  </label>
                  <textarea
                    id="bio"
                    className={`profile-editor__textarea ${errors.bio ? 'profile-editor__textarea--error' : ''}`}
                    value={formData.bio}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    onBlur={() => handleFieldBlur('bio')}
                    placeholder="Tell us about yourself..."
                    maxLength={500}
                    rows={4}
                  />
                  <div className="profile-editor__character-count">
                    <span className={getBioCharacterCountColor()}>
                      {getBioCharacterCount()}/500
                    </span>
                  </div>
                  {errors.bio && (
                    <div className="profile-editor__error">{errors.bio}</div>
                  )}
                </div>
              </div>
            )}

            {/* Details Tab */}
            {activeTab === 'details' && (
              <div className="profile-editor__tab-content">
                {/* University Info */}
                {profile?.university && (
                  <div className="profile-editor__section">
                    <label className="profile-editor__label">University</label>
                    <UniversityCard university={profile.university} />
                  </div>
                )}

                {/* Location */}
                <div className="profile-editor__field">
                  <label className="profile-editor__label" htmlFor="location">
                    Location
                  </label>
                  <input
                    id="location"
                    type="text"
                    className="profile-editor__input"
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    placeholder="City, Country"
                    maxLength={100}
                  />
                </div>

                {/* Website */}
                <div className="profile-editor__field">
                  <label className="profile-editor__label" htmlFor="website">
                    Website
                  </label>
                  <input
                    id="website"
                    type="url"
                    className={`profile-editor__input ${errors.website ? 'profile-editor__input--error' : ''}`}
                    value={formData.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    onBlur={() => handleFieldBlur('website')}
                    placeholder="https://yourwebsite.com"
                    maxLength={200}
                  />
                  {errors.website && (
                    <div className="profile-editor__error">{errors.website}</div>
                  )}
                </div>

                {/* Birth Date */}
                <div className="profile-editor__field">
                  <label className="profile-editor__label" htmlFor="birthDate">
                    Birth Date
                  </label>
                  <input
                    id="birthDate"
                    type="date"
                    className={`profile-editor__input ${errors.birthDate ? 'profile-editor__input--error' : ''}`}
                    value={formData.birthDate}
                    onChange={(e) => handleInputChange('birthDate', e.target.value)}
                    onBlur={() => handleFieldBlur('birthDate')}
                  />
                  {errors.birthDate && (
                    <div className="profile-editor__error">{errors.birthDate}</div>
                  )}
                </div>

                {/* Gender */}
                <div className="profile-editor__field">
                  <label className="profile-editor__label" htmlFor="gender">
                    Gender
                  </label>
                  <select
                    id="gender"
                    className="profile-editor__select"
                    value={formData.gender}
                    onChange={(e) => handleInputChange('gender', e.target.value)}
                  >
                    <option value="">Prefer not to say</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="non-binary">Non-binary</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Interests */}
                <div className="profile-editor__field">
                  <label className="profile-editor__label">Interests</label>
                  <div className="profile-editor__interests">
                    {formData.interests.map((interest, index) => (
                      <div key={index} className="profile-editor__interest-tag">
                        <span>{interest}</span>
                        <button
                          type="button"
                          className="profile-editor__interest-remove"
                          onClick={() => {
                            const newInterests = formData.interests.filter((_, i) => i !== index);
                            handleInterestChange(newInterests);
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                    ))}
                    <input
                      type="text"
                      className="profile-editor__interest-input"
                      placeholder="Add interest..."
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const value = e.currentTarget.value.trim();
                          if (value && !formData.interests.includes(value)) {
                            handleInterestChange([...formData.interests, value]);
                            e.currentTarget.value = '';
                          }
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Privacy Tab */}
            {activeTab === 'privacy' && (
              <div className="profile-editor__tab-content">
                <PrivacySettings
                  privacy={formData.privacy}
                  onChange={handlePrivacyChange}
                />
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="profile-editor__actions">
            <button
              type="button"
              className="profile-editor__button profile-editor__button--secondary"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            
            <button
              type="submit"
              className="profile-editor__button profile-editor__button--primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <svg className="profile-editor__spinner" width="16" height="16" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="4" fill="none" />
                  </svg>
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="profile-editor__submit-error">
              {errors.submit}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default ProfileEditor;
