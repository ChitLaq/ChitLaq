import React, { useState, useCallback, useEffect } from 'react';
import './PrivacySettings.css';

export interface PrivacySettings {
  profileVisibility: 'public' | 'friends' | 'private';
  showEmail: boolean;
  showLocation: boolean;
  showBirthDate: boolean;
  showInterests: boolean;
  showUniversity: boolean;
  showAcademicYear: boolean;
  showPosts: 'public' | 'friends' | 'private';
  showFollowers: 'public' | 'friends' | 'private';
  showFollowing: 'public' | 'friends' | 'private';
  allowMessages: 'everyone' | 'friends' | 'none';
  allowFriendRequests: 'everyone' | 'friends' | 'none';
  allowTagging: boolean;
  allowMentions: boolean;
  showOnlineStatus: boolean;
  showLastSeen: boolean;
  allowSearchEngines: boolean;
  allowDataCollection: boolean;
  allowAnalytics: boolean;
  allowMarketing: boolean;
}

export interface PrivacySettingsProps {
  privacy: PrivacySettings;
  onChange: (field: string, value: any) => void;
  className?: string;
}

export interface PrivacyLevel {
  level: 'public' | 'friends' | 'private';
  label: string;
  description: string;
  icon: string;
}

const PrivacySettings: React.FC<PrivacySettingsProps> = ({
  privacy,
  onChange,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'social' | 'data'>('profile');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Privacy levels
  const privacyLevels: PrivacyLevel[] = [
    {
      level: 'public',
      label: 'Public',
      description: 'Visible to everyone',
      icon: '🌐'
    },
    {
      level: 'friends',
      label: 'Friends Only',
      description: 'Visible to your friends',
      icon: '👥'
    },
    {
      level: 'private',
      label: 'Private',
      description: 'Only visible to you',
      icon: '🔒'
    }
  ];

  // Handle setting change
  const handleSettingChange = useCallback((field: string, value: any) => {
    onChange(field, value);
  }, [onChange]);

  // Handle tab change
  const handleTabChange = useCallback((tab: 'profile' | 'social' | 'data') => {
    setActiveTab(tab);
  }, []);

  // Handle advanced toggle
  const handleAdvancedToggle = useCallback(() => {
    setShowAdvanced(!showAdvanced);
  }, [showAdvanced]);

  // Get privacy level info
  const getPrivacyLevelInfo = useCallback((level: string): PrivacyLevel => {
    return privacyLevels.find(p => p.level === level) || privacyLevels[0];
  }, [privacyLevels]);

  // Get overall privacy score
  const getPrivacyScore = useCallback((): number => {
    const settings = Object.values(privacy);
    const privateSettings = settings.filter(setting => 
      setting === 'private' || setting === 'none' || setting === false
    ).length;
    return Math.round((privateSettings / settings.length) * 100);
  }, [privacy]);

  // Get privacy score color
  const getPrivacyScoreColor = useCallback((): string => {
    const score = getPrivacyScore();
    if (score >= 80) return 'privacy-score--high';
    if (score >= 50) return 'privacy-score--medium';
    return 'privacy-score--low';
  }, [getPrivacyScore]);

  // Get privacy score label
  const getPrivacyScoreLabel = useCallback((): string => {
    const score = getPrivacyScore();
    if (score >= 80) return 'High Privacy';
    if (score >= 50) return 'Medium Privacy';
    return 'Low Privacy';
  }, [getPrivacyScore]);

  return (
    <div className={`privacy-settings ${className}`}>
      {/* Header */}
      <div className="privacy-settings__header">
        <h3 className="privacy-settings__title">Privacy Settings</h3>
        <div className="privacy-settings__score">
          <div className={`privacy-settings__score-circle ${getPrivacyScoreColor()}`}>
            <span className="privacy-settings__score-value">{getPrivacyScore()}%</span>
          </div>
          <div className="privacy-settings__score-label">{getPrivacyScoreLabel()}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="privacy-settings__tabs">
        <button
          className={`privacy-settings__tab ${activeTab === 'profile' ? 'privacy-settings__tab--active' : ''}`}
          onClick={() => handleTabChange('profile')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          Profile
        </button>
        
        <button
          className={`privacy-settings__tab ${activeTab === 'social' ? 'privacy-settings__tab--active' : ''}`}
          onClick={() => handleTabChange('social')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          Social
        </button>
        
        <button
          className={`privacy-settings__tab ${activeTab === 'data' ? 'privacy-settings__tab--active' : ''}`}
          onClick={() => handleTabChange('data')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <circle cx="12" cy="16" r="1" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Data
        </button>
      </div>

      {/* Content */}
      <div className="privacy-settings__content">
        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="privacy-settings__tab-content">
            {/* Profile Visibility */}
            <div className="privacy-settings__section">
              <h4 className="privacy-settings__section-title">Profile Visibility</h4>
              <div className="privacy-settings__section-description">
                Control who can see your profile information
              </div>
              
              <div className="privacy-settings__radio-group">
                {privacyLevels.map((level) => (
                  <label key={level.level} className="privacy-settings__radio-option">
                    <input
                      type="radio"
                      name="profileVisibility"
                      value={level.level}
                      checked={privacy.profileVisibility === level.level}
                      onChange={(e) => handleSettingChange('profileVisibility', e.target.value)}
                    />
                    <div className="privacy-settings__radio-content">
                      <div className="privacy-settings__radio-icon">{level.icon}</div>
                      <div className="privacy-settings__radio-info">
                        <div className="privacy-settings__radio-label">{level.label}</div>
                        <div className="privacy-settings__radio-description">{level.description}</div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Personal Information */}
            <div className="privacy-settings__section">
              <h4 className="privacy-settings__section-title">Personal Information</h4>
              <div className="privacy-settings__section-description">
                Choose what personal information to display on your profile
              </div>
              
              <div className="privacy-settings__toggle-group">
                <label className="privacy-settings__toggle">
                  <input
                    type="checkbox"
                    checked={privacy.showEmail}
                    onChange={(e) => handleSettingChange('showEmail', e.target.checked)}
                  />
                  <div className="privacy-settings__toggle-content">
                    <div className="privacy-settings__toggle-label">Show Email</div>
                    <div className="privacy-settings__toggle-description">Display your email address on your profile</div>
                  </div>
                </label>

                <label className="privacy-settings__toggle">
                  <input
                    type="checkbox"
                    checked={privacy.showLocation}
                    onChange={(e) => handleSettingChange('showLocation', e.target.checked)}
                  />
                  <div className="privacy-settings__toggle-content">
                    <div className="privacy-settings__toggle-label">Show Location</div>
                    <div className="privacy-settings__toggle-description">Display your location on your profile</div>
                  </div>
                </label>

                <label className="privacy-settings__toggle">
                  <input
                    type="checkbox"
                    checked={privacy.showBirthDate}
                    onChange={(e) => handleSettingChange('showBirthDate', e.target.checked)}
                  />
                  <div className="privacy-settings__toggle-content">
                    <div className="privacy-settings__toggle-label">Show Birth Date</div>
                    <div className="privacy-settings__toggle-description">Display your birth date on your profile</div>
                  </div>
                </label>

                <label className="privacy-settings__toggle">
                  <input
                    type="checkbox"
                    checked={privacy.showInterests}
                    onChange={(e) => handleSettingChange('showInterests', e.target.checked)}
                  />
                  <div className="privacy-settings__toggle-content">
                    <div className="privacy-settings__toggle-label">Show Interests</div>
                    <div className="privacy-settings__toggle-description">Display your interests on your profile</div>
                  </div>
                </label>

                <label className="privacy-settings__toggle">
                  <input
                    type="checkbox"
                    checked={privacy.showUniversity}
                    onChange={(e) => handleSettingChange('showUniversity', e.target.checked)}
                  />
                  <div className="privacy-settings__toggle-content">
                    <div className="privacy-settings__toggle-label">Show University</div>
                    <div className="privacy-settings__toggle-description">Display your university information</div>
                  </div>
                </label>

                <label className="privacy-settings__toggle">
                  <input
                    type="checkbox"
                    checked={privacy.showAcademicYear}
                    onChange={(e) => handleSettingChange('showAcademicYear', e.target.checked)}
                  />
                  <div className="privacy-settings__toggle-content">
                    <div className="privacy-settings__toggle-label">Show Academic Year</div>
                    <div className="privacy-settings__toggle-description">Display your academic year</div>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Social Tab */}
        {activeTab === 'social' && (
          <div className="privacy-settings__tab-content">
            {/* Social Activity */}
            <div className="privacy-settings__section">
              <h4 className="privacy-settings__section-title">Social Activity</h4>
              <div className="privacy-settings__section-description">
                Control who can see your social activity
              </div>
              
              <div className="privacy-settings__select-group">
                <div className="privacy-settings__select">
                  <label className="privacy-settings__select-label">Posts</label>
                  <select
                    value={privacy.showPosts}
                    onChange={(e) => handleSettingChange('showPosts', e.target.value)}
                  >
                    <option value="public">Public</option>
                    <option value="friends">Friends Only</option>
                    <option value="private">Private</option>
                  </select>
                </div>

                <div className="privacy-settings__select">
                  <label className="privacy-settings__select-label">Followers</label>
                  <select
                    value={privacy.showFollowers}
                    onChange={(e) => handleSettingChange('showFollowers', e.target.value)}
                  >
                    <option value="public">Public</option>
                    <option value="friends">Friends Only</option>
                    <option value="private">Private</option>
                  </select>
                </div>

                <div className="privacy-settings__select">
                  <label className="privacy-settings__select-label">Following</label>
                  <select
                    value={privacy.showFollowing}
                    onChange={(e) => handleSettingChange('showFollowing', e.target.value)}
                  >
                    <option value="public">Public</option>
                    <option value="friends">Friends Only</option>
                    <option value="private">Private</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Interactions */}
            <div className="privacy-settings__section">
              <h4 className="privacy-settings__section-title">Interactions</h4>
              <div className="privacy-settings__section-description">
                Control who can interact with you
              </div>
              
              <div className="privacy-settings__select-group">
                <div className="privacy-settings__select">
                  <label className="privacy-settings__select-label">Messages</label>
                  <select
                    value={privacy.allowMessages}
                    onChange={(e) => handleSettingChange('allowMessages', e.target.value)}
                  >
                    <option value="everyone">Everyone</option>
                    <option value="friends">Friends Only</option>
                    <option value="none">No One</option>
                  </select>
                </div>

                <div className="privacy-settings__select">
                  <label className="privacy-settings__select-label">Friend Requests</label>
                  <select
                    value={privacy.allowFriendRequests}
                    onChange={(e) => handleSettingChange('allowFriendRequests', e.target.value)}
                  >
                    <option value="everyone">Everyone</option>
                    <option value="friends">Friends Only</option>
                    <option value="none">No One</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Tagging and Mentions */}
            <div className="privacy-settings__section">
              <h4 className="privacy-settings__section-title">Tagging and Mentions</h4>
              <div className="privacy-settings__section-description">
                Control tagging and mention permissions
              </div>
              
              <div className="privacy-settings__toggle-group">
                <label className="privacy-settings__toggle">
                  <input
                    type="checkbox"
                    checked={privacy.allowTagging}
                    onChange={(e) => handleSettingChange('allowTagging', e.target.checked)}
                  />
                  <div className="privacy-settings__toggle-content">
                    <div className="privacy-settings__toggle-label">Allow Tagging</div>
                    <div className="privacy-settings__toggle-description">Let others tag you in posts</div>
                  </div>
                </label>

                <label className="privacy-settings__toggle">
                  <input
                    type="checkbox"
                    checked={privacy.allowMentions}
                    onChange={(e) => handleSettingChange('allowMentions', e.target.checked)}
                  />
                  <div className="privacy-settings__toggle-content">
                    <div className="privacy-settings__toggle-label">Allow Mentions</div>
                    <div className="privacy-settings__toggle-description">Let others mention you in posts</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Online Status */}
            <div className="privacy-settings__section">
              <h4 className="privacy-settings__section-title">Online Status</h4>
              <div className="privacy-settings__section-description">
                Control your online presence visibility
              </div>
              
              <div className="privacy-settings__toggle-group">
                <label className="privacy-settings__toggle">
                  <input
                    type="checkbox"
                    checked={privacy.showOnlineStatus}
                    onChange={(e) => handleSettingChange('showOnlineStatus', e.target.checked)}
                  />
                  <div className="privacy-settings__toggle-content">
                    <div className="privacy-settings__toggle-label">Show Online Status</div>
                    <div className="privacy-settings__toggle-description">Display when you're online</div>
                  </div>
                </label>

                <label className="privacy-settings__toggle">
                  <input
                    type="checkbox"
                    checked={privacy.showLastSeen}
                    onChange={(e) => handleSettingChange('showLastSeen', e.target.checked)}
                  />
                  <div className="privacy-settings__toggle-content">
                    <div className="privacy-settings__toggle-label">Show Last Seen</div>
                    <div className="privacy-settings__toggle-description">Display when you were last active</div>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Data Tab */}
        {activeTab === 'data' && (
          <div className="privacy-settings__tab-content">
            {/* Search and Discovery */}
            <div className="privacy-settings__section">
              <h4 className="privacy-settings__section-title">Search and Discovery</h4>
              <div className="privacy-settings__section-description">
                Control how your profile appears in search results
              </div>
              
              <div className="privacy-settings__toggle-group">
                <label className="privacy-settings__toggle">
                  <input
                    type="checkbox"
                    checked={privacy.allowSearchEngines}
                    onChange={(e) => handleSettingChange('allowSearchEngines', e.target.checked)}
                  />
                  <div className="privacy-settings__toggle-content">
                    <div className="privacy-settings__toggle-label">Allow Search Engines</div>
                    <div className="privacy-settings__toggle-description">Let search engines index your profile</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Data Collection */}
            <div className="privacy-settings__section">
              <h4 className="privacy-settings__section-title">Data Collection</h4>
              <div className="privacy-settings__section-description">
                Control how your data is collected and used
              </div>
              
              <div className="privacy-settings__toggle-group">
                <label className="privacy-settings__toggle">
                  <input
                    type="checkbox"
                    checked={privacy.allowDataCollection}
                    onChange={(e) => handleSettingChange('allowDataCollection', e.target.checked)}
                  />
                  <div className="privacy-settings__toggle-content">
                    <div className="privacy-settings__toggle-label">Allow Data Collection</div>
                    <div className="privacy-settings__toggle-description">Allow collection of your usage data</div>
                  </div>
                </label>

                <label className="privacy-settings__toggle">
                  <input
                    type="checkbox"
                    checked={privacy.allowAnalytics}
                    onChange={(e) => handleSettingChange('allowAnalytics', e.target.checked)}
                  />
                  <div className="privacy-settings__toggle-content">
                    <div className="privacy-settings__toggle-label">Allow Analytics</div>
                    <div className="privacy-settings__toggle-description">Allow analytics tracking</div>
                  </div>
                </label>

                <label className="privacy-settings__toggle">
                  <input
                    type="checkbox"
                    checked={privacy.allowMarketing}
                    onChange={(e) => handleSettingChange('allowMarketing', e.target.checked)}
                  />
                  <div className="privacy-settings__toggle-content">
                    <div className="privacy-settings__toggle-label">Allow Marketing</div>
                    <div className="privacy-settings__toggle-description">Allow marketing communications</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Advanced Settings */}
            <div className="privacy-settings__section">
              <button
                className="privacy-settings__advanced-toggle"
                onClick={handleAdvancedToggle}
              >
                <svg 
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2"
                  className={`privacy-settings__advanced-icon ${showAdvanced ? 'privacy-settings__advanced-icon--expanded' : ''}`}
                >
                  <polyline points="6,9 12,15 18,9" />
                </svg>
                Advanced Settings
              </button>

              {showAdvanced && (
                <div className="privacy-settings__advanced-content">
                  <div className="privacy-settings__advanced-description">
                    These settings provide additional control over your privacy and data usage.
                  </div>
                  
                  <div className="privacy-settings__advanced-actions">
                    <button className="privacy-settings__advanced-action">
                      Export Data
                    </button>
                    <button className="privacy-settings__advanced-action">
                      Delete Account
                    </button>
                    <button className="privacy-settings__advanced-action">
                      Request Data Deletion
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="privacy-settings__footer">
        <div className="privacy-settings__footer-info">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
          <span>Your privacy settings are automatically saved</span>
        </div>
      </div>
    </div>
  );
};

export default PrivacySettings;
