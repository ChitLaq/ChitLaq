import React, { useState, useCallback, useEffect } from 'react';
import { useProfile } from '../../hooks/use-profile';
import { useAuth } from '../../hooks/use-auth';
import AvatarUpload from './AvatarUpload';
import ProfileCompletion from './ProfileCompletion';
import './ProfileHeader.css';

export interface ProfileHeaderProps {
  userId: string;
  isOwnProfile?: boolean;
  onEditProfile?: () => void;
  onFollow?: () => void;
  onUnfollow?: () => void;
  onMessage?: () => void;
  className?: string;
}

export interface ProfileStats {
  posts: number;
  followers: number;
  following: number;
  likes: number;
  views: number;
}

export interface ProfileActions {
  isFollowing: boolean;
  isBlocked: boolean;
  canMessage: boolean;
  canFollow: boolean;
  canEdit: boolean;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  userId,
  isOwnProfile = false,
  onEditProfile,
  onFollow,
  onUnfollow,
  onMessage,
  className = ''
}) => {
  const { user: currentUser } = useAuth();
  const {
    profile,
    stats,
    actions,
    isLoading,
    error,
    updateProfile,
    followUser,
    unfollowUser,
    blockUser,
    unblockUser
  } = useProfile(userId);

  const [isEditingAvatar, setIsEditingAvatar] = useState(false);
  const [showStats, setShowStats] = useState(true);
  const [isFollowing, setIsFollowing] = useState(actions?.isFollowing || false);
  const [isBlocked, setIsBlocked] = useState(actions?.isBlocked || false);

  // Update local state when actions change
  useEffect(() => {
    if (actions) {
      setIsFollowing(actions.isFollowing);
      setIsBlocked(actions.isBlocked);
    }
  }, [actions]);

  // Handle avatar upload
  const handleAvatarUpload = useCallback(async (avatarFile: File) => {
    try {
      await updateProfile({ avatar: avatarFile });
      setIsEditingAvatar(false);
    } catch (error) {
      console.error('Failed to update avatar:', error);
    }
  }, [updateProfile]);

  // Handle follow/unfollow
  const handleFollowToggle = useCallback(async () => {
    try {
      if (isFollowing) {
        await unfollowUser(userId);
        setIsFollowing(false);
        onUnfollow?.();
      } else {
        await followUser(userId);
        setIsFollowing(true);
        onFollow?.();
      }
    } catch (error) {
      console.error('Failed to toggle follow:', error);
    }
  }, [isFollowing, userId, followUser, unfollowUser, onFollow, onUnfollow]);

  // Handle block/unblock
  const handleBlockToggle = useCallback(async () => {
    try {
      if (isBlocked) {
        await unblockUser(userId);
        setIsBlocked(false);
      } else {
        await blockUser(userId);
        setIsBlocked(true);
      }
    } catch (error) {
      console.error('Failed to toggle block:', error);
    }
  }, [isBlocked, userId, blockUser, unblockUser]);

  // Handle message
  const handleMessage = useCallback(() => {
    onMessage?.();
  }, [onMessage]);

  // Handle edit profile
  const handleEditProfile = useCallback(() => {
    onEditProfile?.();
  }, [onEditProfile]);

  // Format numbers for display
  const formatNumber = useCallback((num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }, []);

  // Get user display name
  const getDisplayName = useCallback((): string => {
    if (!profile) return 'Loading...';
    return profile.displayName || profile.username || 'Unknown User';
  }, [profile]);

  // Get user title/subtitle
  const getUserTitle = useCallback((): string => {
    if (!profile) return '';
    if (profile.university) {
      return `${profile.university.name} • ${profile.academicYear || 'Student'}`;
    }
    return profile.bio || '';
  }, [profile]);

  // Get verification status
  const getVerificationStatus = useCallback((): 'verified' | 'pending' | 'unverified' => {
    if (!profile) return 'unverified';
    if (profile.isVerified) return 'verified';
    if (profile.verificationStatus === 'pending') return 'pending';
    return 'unverified';
  }, [profile]);

  // Loading state
  if (isLoading) {
    return (
      <div className={`profile-header profile-header--loading ${className}`}>
        <div className="profile-header__skeleton">
          <div className="profile-header__avatar-skeleton" />
          <div className="profile-header__info-skeleton">
            <div className="profile-header__name-skeleton" />
            <div className="profile-header__title-skeleton" />
            <div className="profile-header__bio-skeleton" />
          </div>
          <div className="profile-header__actions-skeleton">
            <div className="profile-header__button-skeleton" />
            <div className="profile-header__button-skeleton" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`profile-header profile-header--error ${className}`}>
        <div className="profile-header__error">
          <div className="profile-header__error-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <div className="profile-header__error-message">
            Failed to load profile
          </div>
          <button 
            className="profile-header__retry-button"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // No profile data
  if (!profile) {
    return (
      <div className={`profile-header profile-header--empty ${className}`}>
        <div className="profile-header__empty">
          <div className="profile-header__empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div className="profile-header__empty-message">
            Profile not found
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`profile-header ${className}`}>
      {/* Background Banner */}
      {profile.bannerUrl && (
        <div className="profile-header__banner">
          <img
            src={profile.bannerUrl}
            alt={`${getDisplayName()}'s banner`}
            className="profile-header__banner-image"
            loading="lazy"
          />
          <div className="profile-header__banner-overlay" />
        </div>
      )}

      {/* Main Content */}
      <div className="profile-header__content">
        {/* Avatar Section */}
        <div className="profile-header__avatar-section">
          <div className="profile-header__avatar-container">
            <img
              src={profile.avatarUrl || '/default-avatar.png'}
              alt={`${getDisplayName()}'s avatar`}
              className="profile-header__avatar"
              loading="lazy"
            />
            
            {/* Verification Badge */}
            {getVerificationStatus() === 'verified' && (
              <div className="profile-header__verification-badge" title="Verified">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12l2 2 4-4" />
                  <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3" />
                  <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3" />
                  <path d="M12 3c0 1-1 3-3 3s-3-2-3-3 1-3 3-3 3 2 3 3" />
                  <path d="M12 21c0-1 1-3 3-3s3 2 3 3-1 3-3 3-3-2-3-3" />
                </svg>
              </div>
            )}

            {/* Edit Avatar Button */}
            {isOwnProfile && (
              <button
                className="profile-header__edit-avatar-button"
                onClick={() => setIsEditingAvatar(true)}
                title="Edit avatar"
                aria-label="Edit avatar"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            )}
          </div>

          {/* Profile Completion */}
          {isOwnProfile && (
            <div className="profile-header__completion">
              <ProfileCompletion profile={profile} />
            </div>
          )}
        </div>

        {/* Profile Info */}
        <div className="profile-header__info">
          <div className="profile-header__name-section">
            <h1 className="profile-header__name">
              {getDisplayName()}
            </h1>
            
            {/* Username */}
            {profile.username && (
              <div className="profile-header__username">
                @{profile.username}
              </div>
            )}

            {/* User Title */}
            {getUserTitle() && (
              <div className="profile-header__title">
                {getUserTitle()}
              </div>
            )}
          </div>

          {/* Bio */}
          {profile.bio && (
            <div className="profile-header__bio">
              <p>{profile.bio}</p>
            </div>
          )}

          {/* Stats */}
          {showStats && stats && (
            <div className="profile-header__stats">
              <button
                className="profile-header__stat"
                onClick={() => {/* Navigate to posts */}}
                title="View posts"
              >
                <span className="profile-header__stat-number">
                  {formatNumber(stats.posts)}
                </span>
                <span className="profile-header__stat-label">Posts</span>
              </button>
              
              <button
                className="profile-header__stat"
                onClick={() => {/* Navigate to followers */}}
                title="View followers"
              >
                <span className="profile-header__stat-number">
                  {formatNumber(stats.followers)}
                </span>
                <span className="profile-header__stat-label">Followers</span>
              </button>
              
              <button
                className="profile-header__stat"
                onClick={() => {/* Navigate to following */}}
                title="View following"
              >
                <span className="profile-header__stat-number">
                  {formatNumber(stats.following)}
                </span>
                <span className="profile-header__stat-label">Following</span>
              </button>
              
              <button
                className="profile-header__stat"
                onClick={() => {/* Navigate to likes */}}
                title="View likes"
              >
                <span className="profile-header__stat-number">
                  {formatNumber(stats.likes)}
                </span>
                <span className="profile-header__stat-label">Likes</span>
              </button>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="profile-header__actions">
          {isOwnProfile ? (
            <button
              className="profile-header__action profile-header__action--primary"
              onClick={handleEditProfile}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit Profile
            </button>
          ) : (
            <div className="profile-header__action-group">
              {actions?.canMessage && (
                <button
                  className="profile-header__action profile-header__action--secondary"
                  onClick={handleMessage}
                  title="Send message"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  Message
                </button>
              )}
              
              {actions?.canFollow && (
                <button
                  className={`profile-header__action ${
                    isFollowing 
                      ? 'profile-header__action--following' 
                      : 'profile-header__action--primary'
                  }`}
                  onClick={handleFollowToggle}
                  title={isFollowing ? 'Unfollow' : 'Follow'}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {isFollowing ? (
                      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    ) : (
                      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    )}
                    <circle cx="8.5" cy="7" r="4" />
                    <line x1="20" y1="8" x2="20" y2="14" />
                    <line x1="23" y1="11" x2="17" y2="11" />
                  </svg>
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
              )}
              
              <button
                className="profile-header__action profile-header__action--danger"
                onClick={handleBlockToggle}
                title={isBlocked ? 'Unblock' : 'Block'}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                </svg>
                {isBlocked ? 'Unblock' : 'Block'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Avatar Upload Modal */}
      {isEditingAvatar && (
        <div className="profile-header__avatar-modal">
          <div className="profile-header__avatar-modal-content">
            <div className="profile-header__avatar-modal-header">
              <h3>Update Avatar</h3>
              <button
                className="profile-header__avatar-modal-close"
                onClick={() => setIsEditingAvatar(false)}
                aria-label="Close"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <AvatarUpload
              type="avatar"
              onUploadComplete={handleAvatarUpload}
              onUploadError={(error) => console.error('Avatar upload failed:', error)}
              cropEnabled={true}
              aspectRatio={1}
              showPreview={true}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileHeader;
