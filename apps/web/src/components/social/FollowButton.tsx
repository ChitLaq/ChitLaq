import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserPlusIcon, 
  UserMinusIcon, 
  CheckIcon,
  XMarkIcon,
  HeartIcon,
  HeartIcon as HeartSolidIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';
import { useSocialActions } from '../../hooks/use-social-actions';
import { cn } from '../../utils/social-utils';

interface FollowButtonProps {
  userId: string;
  isFollowing: boolean;
  isLiked?: boolean;
  showLike?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  showCount?: boolean;
  followerCount?: number;
  followingCount?: number;
  onFollowChange?: (isFollowing: boolean) => void;
  onLikeChange?: (isLiked: boolean) => void;
  className?: string;
  disabled?: boolean;
  loading?: boolean;
}

const FollowButton: React.FC<FollowButtonProps> = ({
  userId,
  isFollowing,
  isLiked = false,
  showLike = false,
  size = 'md',
  variant = 'primary',
  showCount = false,
  followerCount = 0,
  followingCount = 0,
  onFollowChange,
  onLikeChange,
  className,
  disabled = false,
  loading = false
}) => {
  const { followUser, unfollowUser, likeUser, unlikeUser } = useSocialActions();
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleFollow = useCallback(async () => {
    if (isLoading || disabled || loading) return;
    
    setIsLoading(true);
    setShowError(false);
    setErrorMessage('');
    
    try {
      if (isFollowing) {
        await unfollowUser(userId);
        onFollowChange?.(false);
      } else {
        await followUser(userId);
        onFollowChange?.(true);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
      }
    } catch (error: any) {
      setShowError(true);
      setErrorMessage(error.message || 'Failed to update follow status');
      setTimeout(() => setShowError(false), 3000);
    } finally {
      setIsLoading(false);
    }
  }, [userId, isFollowing, followUser, unfollowUser, onFollowChange, isLoading, disabled, loading]);

  const handleLike = useCallback(async () => {
    if (isLoading || disabled || loading) return;
    
    setIsLoading(true);
    setShowError(false);
    setErrorMessage('');
    
    try {
      if (isLiked) {
        await unlikeUser(userId);
        onLikeChange?.(false);
      } else {
        await likeUser(userId);
        onLikeChange?.(true);
      }
    } catch (error: any) {
      setShowError(true);
      setErrorMessage(error.message || 'Failed to update like status');
      setTimeout(() => setShowError(false), 3000);
    } finally {
      setIsLoading(false);
    }
  }, [userId, isLiked, likeUser, unlikeUser, onLikeChange, isLoading, disabled, loading]);

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-1.5 text-sm';
      case 'lg':
        return 'px-6 py-3 text-lg';
      default:
        return 'px-4 py-2 text-base';
    }
  };

  const getVariantClasses = () => {
    if (showError) {
      return 'bg-red-600 text-white hover:bg-red-700 border-red-600';
    }
    
    if (showSuccess) {
      return 'bg-green-600 text-white hover:bg-green-700 border-green-600';
    }
    
    switch (variant) {
      case 'secondary':
        return isFollowing
          ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 border-gray-200 dark:border-gray-600'
          : 'bg-gray-600 text-white hover:bg-gray-700 border-gray-600';
      case 'outline':
        return isFollowing
          ? 'bg-transparent text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
          : 'bg-transparent text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20';
      case 'ghost':
        return isFollowing
          ? 'bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border-transparent'
          : 'bg-transparent text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-transparent';
      default:
        return isFollowing
          ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 border-gray-200 dark:border-gray-600'
          : 'bg-blue-600 text-white hover:bg-blue-700 border-blue-600';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 'w-4 h-4';
      case 'lg':
        return 'w-6 h-6';
      default:
        return 'w-5 h-5';
    }
  };

  const getSpinnerSize = () => {
    switch (size) {
      case 'sm':
        return 'w-3 h-3';
      case 'lg':
        return 'w-5 h-5';
      default:
        return 'w-4 h-4';
    }
  };

  return (
    <div className={cn("relative", className)}>
      <div className="flex items-center space-x-2">
        {/* Like Button */}
        {showLike && (
          <motion.button
            onClick={handleLike}
            disabled={isLoading || disabled || loading}
            className={cn(
              "p-2 rounded-full transition-colors",
              isLiked
                ? "text-red-500 bg-red-50 dark:bg-red-900/20"
                : "text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20",
              (isLoading || disabled || loading) && "opacity-50 cursor-not-allowed"
            )}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title={isLiked ? "Unlike" : "Like"}
          >
            {isLiked ? (
              <HeartSolid className={getIconSize()} />
            ) : (
              <HeartIcon className={getIconSize()} />
            )}
          </motion.button>
        )}

        {/* Follow Button */}
        <motion.button
          onClick={handleFollow}
          disabled={isLoading || disabled || loading}
          className={cn(
            "inline-flex items-center space-x-2 rounded-lg font-medium transition-all duration-200 border",
            getSizeClasses(),
            getVariantClasses(),
            (isLoading || disabled || loading) && "opacity-50 cursor-not-allowed"
          )}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <AnimatePresence mode="wait">
            {isLoading || loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={cn("border-2 border-current border-t-transparent rounded-full animate-spin", getSpinnerSize())}
              />
            ) : showSuccess ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <CheckIcon className={getIconSize()} />
              </motion.div>
            ) : showError ? (
              <motion.div
                key="error"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <XMarkIcon className={getIconSize()} />
              </motion.div>
            ) : isFollowing ? (
              <motion.div
                key="following"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center space-x-1"
              >
                <UserMinusIcon className={getIconSize()} />
                <span>Following</span>
              </motion.div>
            ) : (
              <motion.div
                key="follow"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center space-x-1"
              >
                <UserPlusIcon className={getIconSize()} />
                <span>Follow</span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* Count Display */}
      {showCount && (
        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center space-x-1">
            <span className="font-medium">{followerCount.toLocaleString()}</span>
            <span>followers</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="font-medium">{followingCount.toLocaleString()}</span>
            <span>following</span>
          </div>
        </div>
      )}

      {/* Error Message */}
      <AnimatePresence>
        {showError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 mt-2 px-3 py-2 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-sm rounded-lg shadow-lg z-10"
          >
            {errorMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Message */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 mt-2 px-3 py-2 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-sm rounded-lg shadow-lg z-10"
          >
            Successfully followed!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FollowButton;
