import React, { useState, useEffect, useCallback } from 'react';
import { trackOnboardingEvent } from '../../../utils/onboarding-analytics';
import { getLogger } from '../../../utils/logger';

const logger = getLogger('UniversityNetwork');

interface UniversityNetworkProps {
  user: any;
  onboardingData: any;
  onComplete: (data: any) => void;
  onSkip?: () => void;
  onBack?: () => void;
  isLoading: boolean;
  error?: string;
}

interface SuggestedUser {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  profilePicture?: string;
  yearOfStudy: string;
  major: string;
  bio: string;
  mutualConnections: number;
  sharedInterests: string[];
  isOnline: boolean;
  lastActive: string;
}

interface UniversityStats {
  totalStudents: number;
  activeUsers: number;
  popularMajors: string[];
  recentGraduates: number;
  facultyCount: number;
}

const UniversityNetwork: React.FC<UniversityNetworkProps> = ({
  user,
  onboardingData,
  onComplete,
  onSkip,
  onBack,
  isLoading,
  error,
}) => {
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [universityStats, setUniversityStats] = useState<UniversityStats | null>(null);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'same-major' | 'same-year' | 'shared-interests'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Load university network data
  useEffect(() => {
    loadUniversityNetworkData();
  }, [user]);

  // Load suggested users based on filter
  useEffect(() => {
    if (user) {
      loadSuggestedUsers();
    }
  }, [user, filterType, searchQuery]);

  // Load university network data
  const loadUniversityNetworkData = useCallback(async () => {
    try {
      const response = await fetch(`/api/universities/${user.universityId}/stats`);
      if (response.ok) {
        const stats = await response.json();
        setUniversityStats(stats);
      }
    } catch (error) {
      logger.error('Error loading university stats:', error);
    }
  }, [user]);

  // Load suggested users
  const loadSuggestedUsers = useCallback(async () => {
    setIsLoadingSuggestions(true);
    
    try {
      const params = new URLSearchParams({
        filter: filterType,
        search: searchQuery,
        limit: '20',
      });

      const response = await fetch(`/api/users/suggestions?${params}`);
      if (response.ok) {
        const suggestions = await response.json();
        setSuggestedUsers(suggestions);
      }
    } catch (error) {
      logger.error('Error loading suggested users:', error);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [filterType, searchQuery]);

  // Handle user selection
  const handleUserToggle = useCallback((userId: string) => {
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else if (prev.length < 10) { // Limit to 10 connections
        return [...prev, userId];
      }
      return prev;
    });
  }, []);

  // Handle filter change
  const handleFilterChange = useCallback((filter: typeof filterType) => {
    setFilterType(filter);
  }, []);

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);

    try {
      // Send connection requests
      if (selectedUsers.length > 0) {
        const response = await fetch('/api/users/connections/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userIds: selectedUsers,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to send connection requests');
        }
      }

      // Track network setup completion
      trackOnboardingEvent('university_network_setup', {
        userId: user.id,
        connectionsRequested: selectedUsers.length,
        filterType,
        university: user.universityName,
        userType: user.userType,
      });

      logger.info(`University network setup completed for user ${user.id}: ${selectedUsers.length} connections requested`);

      onComplete({
        selectedUsers,
        connectionsRequested: selectedUsers.length,
        completed: true,
      });
    } catch (error) {
      logger.error('Error completing university network setup:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedUsers, filterType, user, onComplete]);

  // Get selected user objects
  const getSelectedUserObjects = useCallback(() => {
    return suggestedUsers.filter(user => selectedUsers.includes(user.id));
  }, [suggestedUsers, selectedUsers]);

  const selectedUserObjects = getSelectedUserObjects();

  // Filter users based on search
  const filteredUsers = suggestedUsers.filter(user => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.firstName.toLowerCase().includes(query) ||
      user.lastName.toLowerCase().includes(query) ||
      user.username.toLowerCase().includes(query) ||
      user.major.toLowerCase().includes(query)
    );
  });

  return (
    <div className="university-network-step">
      <div className="university-network-container">
        {/* Header */}
        <div className="network-header">
          <h3>Connect with Your University</h3>
          <p>Discover and connect with students, faculty, and staff from {user.universityName}</p>
          
          {universityStats && (
            <div className="university-stats">
              <div className="stat-item">
                <span className="stat-number">{universityStats.totalStudents.toLocaleString()}</span>
                <span className="stat-label">Total Students</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{universityStats.activeUsers.toLocaleString()}</span>
                <span className="stat-label">Active on ChitLaq</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{universityStats.facultyCount.toLocaleString()}</span>
                <span className="stat-label">Faculty & Staff</span>
              </div>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="network-filters">
          <div className="filter-tabs">
            <button
              className={`filter-tab ${filterType === 'all' ? 'active' : ''}`}
              onClick={() => handleFilterChange('all')}
            >
              All
            </button>
            <button
              className={`filter-tab ${filterType === 'same-major' ? 'active' : ''}`}
              onClick={() => handleFilterChange('same-major')}
            >
              Same Major
            </button>
            <button
              className={`filter-tab ${filterType === 'same-year' ? 'active' : ''}`}
              onClick={() => handleFilterChange('same-year')}
            >
              Same Year
            </button>
            <button
              className={`filter-tab ${filterType === 'shared-interests' ? 'active' : ''}`}
              onClick={() => handleFilterChange('shared-interests')}
            >
              Shared Interests
            </button>
          </div>

          <div className="search-container">
            <div className="search-input-container">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
                <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2"/>
              </svg>
              <input
                type="text"
                placeholder="Search by name, major, or username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
          </div>
        </div>

        {/* Selected Connections */}
        {selectedUsers.length > 0 && (
          <div className="selected-connections-section">
            <h4>Selected Connections ({selectedUsers.length}/10)</h4>
            <div className="selected-connections-list">
              {selectedUserObjects.map(user => (
                <div key={user.id} className="selected-connection-item">
                  <div className="connection-avatar">
                    {user.profilePicture ? (
                      <img src={user.profilePicture} alt={`${user.firstName} ${user.lastName}`} />
                    ) : (
                      <div className="avatar-placeholder">
                        {user.firstName[0]}{user.lastName[0]}
                      </div>
                    )}
                  </div>
                  <div className="connection-info">
                    <span className="connection-name">{user.firstName} {user.lastName}</span>
                    <span className="connection-major">{user.major}</span>
                  </div>
                  <button
                    className="remove-connection"
                    onClick={() => handleUserToggle(user.id)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2"/>
                      <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suggested Users */}
        <div className="suggested-users-section">
          <h4>Suggested Connections</h4>
          
          {isLoadingSuggestions ? (
            <div className="loading-suggestions">
              <div className="loading-spinner"></div>
              <p>Finding people you might know...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="no-suggestions">
              <p>No suggestions found. Try adjusting your filters or search.</p>
            </div>
          ) : (
            <div className="suggested-users-list">
              {filteredUsers.map(suggestedUser => (
                <div
                  key={suggestedUser.id}
                  className={`suggested-user-card ${selectedUsers.includes(suggestedUser.id) ? 'selected' : ''}`}
                  onClick={() => handleUserToggle(suggestedUser.id)}
                >
                  <div className="user-avatar">
                    {suggestedUser.profilePicture ? (
                      <img src={suggestedUser.profilePicture} alt={`${suggestedUser.firstName} ${suggestedUser.lastName}`} />
                    ) : (
                      <div className="avatar-placeholder">
                        {suggestedUser.firstName[0]}{suggestedUser.lastName[0]}
                      </div>
                    )}
                    {suggestedUser.isOnline && <div className="online-indicator"></div>}
                  </div>
                  
                  <div className="user-info">
                    <div className="user-name">
                      <h5>{suggestedUser.firstName} {suggestedUser.lastName}</h5>
                      <span className="username">@{suggestedUser.username}</span>
                    </div>
                    
                    <div className="user-details">
                      <span className="year-major">{suggestedUser.yearOfStudy} • {suggestedUser.major}</span>
                      {suggestedUser.bio && (
                        <p className="user-bio">{suggestedUser.bio}</p>
                      )}
                    </div>
                    
                    <div className="connection-reasons">
                      {suggestedUser.mutualConnections > 0 && (
                        <span className="reason-tag">
                          {suggestedUser.mutualConnections} mutual connection{suggestedUser.mutualConnections !== 1 ? 's' : ''}
                        </span>
                      )}
                      {suggestedUser.sharedInterests.length > 0 && (
                        <span className="reason-tag">
                          {suggestedUser.sharedInterests.length} shared interest{suggestedUser.sharedInterests.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="user-actions">
                    <button
                      className={`connect-button ${selectedUsers.includes(suggestedUser.id) ? 'selected' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUserToggle(suggestedUser.id);
                      }}
                    >
                      {selectedUsers.includes(suggestedUser.id) ? (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Selected
                        </>
                      ) : (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2"/>
                            <circle cx="8.5" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                            <line x1="20" y1="8" x2="20" y2="14" stroke="currentColor" strokeWidth="2"/>
                            <line x1="23" y1="11" x2="17" y2="11" stroke="currentColor" strokeWidth="2"/>
                          </svg>
                          Connect
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Popular Majors */}
        {universityStats?.popularMajors && (
          <div className="popular-majors-section">
            <h4>Popular Majors at {user.universityName}</h4>
            <div className="popular-majors-list">
              {universityStats.popularMajors.map((major, index) => (
                <span key={major} className="major-tag">
                  #{index + 1} {major}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="network-actions">
          <button
            className="btn btn-primary btn-large"
            onClick={handleSubmit}
            disabled={isSubmitting || isLoading}
          >
            {isSubmitting ? (
              <>
                <div className="loading-spinner"></div>
                Sending Requests...
              </>
            ) : selectedUsers.length > 0 ? (
              `Send ${selectedUsers.length} Connection Request${selectedUsers.length !== 1 ? 's' : ''}`
            ) : (
              'Continue Without Connections'
            )}
          </button>
          
          {onSkip && (
            <button
              className="btn btn-link"
              onClick={onSkip}
              disabled={isSubmitting || isLoading}
            >
              Skip for now
            </button>
          )}
        </div>

        {/* Tips */}
        <div className="network-tips">
          <h4>💡 Tips</h4>
          <ul>
            <li>Connect with people in your major for study groups and collaboration</li>
            <li>Find classmates from your year to build friendships</li>
            <li>Connect with faculty and staff for mentorship opportunities</li>
            <li>You can always send more connection requests later</li>
          </ul>
        </div>

        {/* University Context */}
        <div className="university-context">
          <div className="university-badge">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor"/>
            </svg>
            <span>Building your {user.universityName} network</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UniversityNetwork;
