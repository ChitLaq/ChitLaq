import { useState, useCallback } from 'react';
import { useAuth } from './use-auth';
import { useSupabase } from './use-supabase';
import { useToast } from './use-toast';
import { useAnalytics } from './use-analytics';

interface SocialActionOptions {
  onSuccess?: (data?: any) => void;
  onError?: (error: Error) => void;
  optimistic?: boolean;
}

interface FollowResult {
  success: boolean;
  isFollowing: boolean;
  followerCount: number;
  followingCount: number;
}

interface LikeResult {
  success: boolean;
  isLiked: boolean;
  likeCount: number;
}

interface BlockResult {
  success: boolean;
  isBlocked: boolean;
}

interface SocialMetrics {
  followers: number;
  following: number;
  likes: number;
  posts: number;
  engagement: number;
}

export const useSocialActions = () => {
  const { user } = useAuth();
  const { supabase } = useSupabase();
  const { showToast } = useToast();
  const { trackEvent } = useAnalytics();
  
  const [loading, setLoading] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const setLoadingState = useCallback((action: string, isLoading: boolean) => {
    setLoading(prev => {
      const newSet = new Set(prev);
      if (isLoading) {
        newSet.add(action);
      } else {
        newSet.delete(action);
      }
      return newSet;
    });
  }, []);

  const handleError = useCallback((error: Error, action: string) => {
    console.error(`Error in ${action}:`, error);
    setError(error.message);
    showToast({
      type: 'error',
      title: 'Action Failed',
      message: error.message || 'Something went wrong. Please try again.'
    });
  }, [showToast]);

  const handleSuccess = useCallback((action: string, data?: any) => {
    setError(null);
    trackEvent('social_action', {
      action,
      userId: user?.id,
      ...data
    });
  }, [trackEvent, user?.id]);

  // Follow/Unfollow User
  const followUser = useCallback(async (
    targetUserId: string, 
    options: SocialActionOptions = {}
  ): Promise<FollowResult> => {
    if (!user?.id) {
      throw new Error('User must be authenticated');
    }

    if (user.id === targetUserId) {
      throw new Error('Cannot follow yourself');
    }

    const actionKey = `follow-${targetUserId}`;
    setLoadingState(actionKey, true);

    try {
      const { data, error } = await supabase
        .from('user_relationships')
        .insert({
          follower_id: user.id,
          following_id: targetUserId,
          relationship_type: 'follow',
          created_at: new Date().toISOString()
        })
        .select(`
          id,
          follower_id,
          following_id,
          relationship_type,
          created_at
        `)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      // Update follower/following counts
      const { data: followerCount } = await supabase
        .from('user_relationships')
        .select('id', { count: 'exact' })
        .eq('following_id', targetUserId)
        .eq('relationship_type', 'follow');

      const { data: followingCount } = await supabase
        .from('user_relationships')
        .select('id', { count: 'exact' })
        .eq('follower_id', user.id)
        .eq('relationship_type', 'follow');

      const result: FollowResult = {
        success: true,
        isFollowing: true,
        followerCount: followerCount?.length || 0,
        followingCount: followingCount?.length || 0
      };

      handleSuccess('follow_user', { targetUserId, result });
      options.onSuccess?.(result);

      showToast({
        type: 'success',
        title: 'Following',
        message: 'You are now following this user'
      });

      return result;
    } catch (error) {
      const err = error as Error;
      handleError(err, 'follow_user');
      options.onError?.(err);
      throw err;
    } finally {
      setLoadingState(actionKey, false);
    }
  }, [user?.id, supabase, setLoadingState, handleError, handleSuccess, showToast]);

  const unfollowUser = useCallback(async (
    targetUserId: string, 
    options: SocialActionOptions = {}
  ): Promise<FollowResult> => {
    if (!user?.id) {
      throw new Error('User must be authenticated');
    }

    const actionKey = `unfollow-${targetUserId}`;
    setLoadingState(actionKey, true);

    try {
      const { error } = await supabase
        .from('user_relationships')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId)
        .eq('relationship_type', 'follow');

      if (error) {
        throw new Error(error.message);
      }

      // Update follower/following counts
      const { data: followerCount } = await supabase
        .from('user_relationships')
        .select('id', { count: 'exact' })
        .eq('following_id', targetUserId)
        .eq('relationship_type', 'follow');

      const { data: followingCount } = await supabase
        .from('user_relationships')
        .select('id', { count: 'exact' })
        .eq('follower_id', user.id)
        .eq('relationship_type', 'follow');

      const result: FollowResult = {
        success: true,
        isFollowing: false,
        followerCount: followerCount?.length || 0,
        followingCount: followingCount?.length || 0
      };

      handleSuccess('unfollow_user', { targetUserId, result });
      options.onSuccess?.(result);

      showToast({
        type: 'info',
        title: 'Unfollowed',
        message: 'You are no longer following this user'
      });

      return result;
    } catch (error) {
      const err = error as Error;
      handleError(err, 'unfollow_user');
      options.onError?.(err);
      throw err;
    } finally {
      setLoadingState(actionKey, false);
    }
  }, [user?.id, supabase, setLoadingState, handleError, handleSuccess, showToast]);

  // Like/Unlike User
  const likeUser = useCallback(async (
    targetUserId: string, 
    options: SocialActionOptions = {}
  ): Promise<LikeResult> => {
    if (!user?.id) {
      throw new Error('User must be authenticated');
    }

    if (user.id === targetUserId) {
      throw new Error('Cannot like yourself');
    }

    const actionKey = `like-${targetUserId}`;
    setLoadingState(actionKey, true);

    try {
      const { data, error } = await supabase
        .from('user_likes')
        .insert({
          liker_id: user.id,
          liked_id: targetUserId,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      // Update like count
      const { data: likeCount } = await supabase
        .from('user_likes')
        .select('id', { count: 'exact' })
        .eq('liked_id', targetUserId);

      const result: LikeResult = {
        success: true,
        isLiked: true,
        likeCount: likeCount?.length || 0
      };

      handleSuccess('like_user', { targetUserId, result });
      options.onSuccess?.(result);

      return result;
    } catch (error) {
      const err = error as Error;
      handleError(err, 'like_user');
      options.onError?.(err);
      throw err;
    } finally {
      setLoadingState(actionKey, false);
    }
  }, [user?.id, supabase, setLoadingState, handleError, handleSuccess]);

  const unlikeUser = useCallback(async (
    targetUserId: string, 
    options: SocialActionOptions = {}
  ): Promise<LikeResult> => {
    if (!user?.id) {
      throw new Error('User must be authenticated');
    }

    const actionKey = `unlike-${targetUserId}`;
    setLoadingState(actionKey, true);

    try {
      const { error } = await supabase
        .from('user_likes')
        .delete()
        .eq('liker_id', user.id)
        .eq('liked_id', targetUserId);

      if (error) {
        throw new Error(error.message);
      }

      // Update like count
      const { data: likeCount } = await supabase
        .from('user_likes')
        .select('id', { count: 'exact' })
        .eq('liked_id', targetUserId);

      const result: LikeResult = {
        success: true,
        isLiked: false,
        likeCount: likeCount?.length || 0
      };

      handleSuccess('unlike_user', { targetUserId, result });
      options.onSuccess?.(result);

      return result;
    } catch (error) {
      const err = error as Error;
      handleError(err, 'unlike_user');
      options.onError?.(err);
      throw err;
    } finally {
      setLoadingState(actionKey, false);
    }
  }, [user?.id, supabase, setLoadingState, handleError, handleSuccess]);

  // Block/Unblock User
  const blockUser = useCallback(async (
    targetUserId: string, 
    options: SocialActionOptions = {}
  ): Promise<BlockResult> => {
    if (!user?.id) {
      throw new Error('User must be authenticated');
    }

    if (user.id === targetUserId) {
      throw new Error('Cannot block yourself');
    }

    const actionKey = `block-${targetUserId}`;
    setLoadingState(actionKey, true);

    try {
      // First, unfollow if following
      await supabase
        .from('user_relationships')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId)
        .eq('relationship_type', 'follow');

      // Then block
      const { data, error } = await supabase
        .from('user_relationships')
        .insert({
          follower_id: user.id,
          following_id: targetUserId,
          relationship_type: 'block',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      const result: BlockResult = {
        success: true,
        isBlocked: true
      };

      handleSuccess('block_user', { targetUserId, result });
      options.onSuccess?.(result);

      showToast({
        type: 'warning',
        title: 'User Blocked',
        message: 'This user has been blocked and cannot interact with you'
      });

      return result;
    } catch (error) {
      const err = error as Error;
      handleError(err, 'block_user');
      options.onError?.(err);
      throw err;
    } finally {
      setLoadingState(actionKey, false);
    }
  }, [user?.id, supabase, setLoadingState, handleError, handleSuccess, showToast]);

  const unblockUser = useCallback(async (
    targetUserId: string, 
    options: SocialActionOptions = {}
  ): Promise<BlockResult> => {
    if (!user?.id) {
      throw new Error('User must be authenticated');
    }

    const actionKey = `unblock-${targetUserId}`;
    setLoadingState(actionKey, true);

    try {
      const { error } = await supabase
        .from('user_relationships')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId)
        .eq('relationship_type', 'block');

      if (error) {
        throw new Error(error.message);
      }

      const result: BlockResult = {
        success: true,
        isBlocked: false
      };

      handleSuccess('unblock_user', { targetUserId, result });
      options.onSuccess?.(result);

      showToast({
        type: 'success',
        title: 'User Unblocked',
        message: 'This user has been unblocked'
      });

      return result;
    } catch (error) {
      const err = error as Error;
      handleError(err, 'unblock_user');
      options.onError?.(err);
      throw err;
    } finally {
      setLoadingState(actionKey, false);
    }
  }, [user?.id, supabase, setLoadingState, handleError, handleSuccess, showToast]);

  // Activity Actions
  const likeActivity = useCallback(async (
    activityId: string, 
    options: SocialActionOptions = {}
  ): Promise<LikeResult> => {
    if (!user?.id) {
      throw new Error('User must be authenticated');
    }

    const actionKey = `like-activity-${activityId}`;
    setLoadingState(actionKey, true);

    try {
      const { data, error } = await supabase
        .from('activity_likes')
        .insert({
          user_id: user.id,
          activity_id: activityId,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      // Update like count
      const { data: likeCount } = await supabase
        .from('activity_likes')
        .select('id', { count: 'exact' })
        .eq('activity_id', activityId);

      const result: LikeResult = {
        success: true,
        isLiked: true,
        likeCount: likeCount?.length || 0
      };

      handleSuccess('like_activity', { activityId, result });
      options.onSuccess?.(result);

      return result;
    } catch (error) {
      const err = error as Error;
      handleError(err, 'like_activity');
      options.onError?.(err);
      throw err;
    } finally {
      setLoadingState(actionKey, false);
    }
  }, [user?.id, supabase, setLoadingState, handleError, handleSuccess]);

  const unlikeActivity = useCallback(async (
    activityId: string, 
    options: SocialActionOptions = {}
  ): Promise<LikeResult> => {
    if (!user?.id) {
      throw new Error('User must be authenticated');
    }

    const actionKey = `unlike-activity-${activityId}`;
    setLoadingState(actionKey, true);

    try {
      const { error } = await supabase
        .from('activity_likes')
        .delete()
        .eq('user_id', user.id)
        .eq('activity_id', activityId);

      if (error) {
        throw new Error(error.message);
      }

      // Update like count
      const { data: likeCount } = await supabase
        .from('activity_likes')
        .select('id', { count: 'exact' })
        .eq('activity_id', activityId);

      const result: LikeResult = {
        success: true,
        isLiked: false,
        likeCount: likeCount?.length || 0
      };

      handleSuccess('unlike_activity', { activityId, result });
      options.onSuccess?.(result);

      return result;
    } catch (error) {
      const err = error as Error;
      handleError(err, 'unlike_activity');
      options.onError?.(err);
      throw err;
    } finally {
      setLoadingState(actionKey, false);
    }
  }, [user?.id, supabase, setLoadingState, handleError, handleSuccess]);

  const bookmarkActivity = useCallback(async (
    activityId: string, 
    options: SocialActionOptions = {}
  ): Promise<{ success: boolean; isBookmarked: boolean }> => {
    if (!user?.id) {
      throw new Error('User must be authenticated');
    }

    const actionKey = `bookmark-activity-${activityId}`;
    setLoadingState(actionKey, true);

    try {
      const { data, error } = await supabase
        .from('activity_bookmarks')
        .insert({
          user_id: user.id,
          activity_id: activityId,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      const result = {
        success: true,
        isBookmarked: true
      };

      handleSuccess('bookmark_activity', { activityId, result });
      options.onSuccess?.(result);

      return result;
    } catch (error) {
      const err = error as Error;
      handleError(err, 'bookmark_activity');
      options.onError?.(err);
      throw err;
    } finally {
      setLoadingState(actionKey, false);
    }
  }, [user?.id, supabase, setLoadingState, handleError, handleSuccess]);

  const unbookmarkActivity = useCallback(async (
    activityId: string, 
    options: SocialActionOptions = {}
  ): Promise<{ success: boolean; isBookmarked: boolean }> => {
    if (!user?.id) {
      throw new Error('User must be authenticated');
    }

    const actionKey = `unbookmark-activity-${activityId}`;
    setLoadingState(actionKey, true);

    try {
      const { error } = await supabase
        .from('activity_bookmarks')
        .delete()
        .eq('user_id', user.id)
        .eq('activity_id', activityId);

      if (error) {
        throw new Error(error.message);
      }

      const result = {
        success: true,
        isBookmarked: false
      };

      handleSuccess('unbookmark_activity', { activityId, result });
      options.onSuccess?.(result);

      return result;
    } catch (error) {
      const err = error as Error;
      handleError(err, 'unbookmark_activity');
      options.onError?.(err);
      throw err;
    } finally {
      setLoadingState(actionKey, false);
    }
  }, [user?.id, supabase, setLoadingState, handleError, handleSuccess]);

  const shareActivity = useCallback(async (
    activityId: string, 
    options: SocialActionOptions = {}
  ): Promise<{ success: boolean; shareCount: number }> => {
    if (!user?.id) {
      throw new Error('User must be authenticated');
    }

    const actionKey = `share-activity-${activityId}`;
    setLoadingState(actionKey, true);

    try {
      const { data, error } = await supabase
        .from('activity_shares')
        .insert({
          user_id: user.id,
          activity_id: activityId,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      // Update share count
      const { data: shareCount } = await supabase
        .from('activity_shares')
        .select('id', { count: 'exact' })
        .eq('activity_id', activityId);

      const result = {
        success: true,
        shareCount: shareCount?.length || 0
      };

      handleSuccess('share_activity', { activityId, result });
      options.onSuccess?.(result);

      return result;
    } catch (error) {
      const err = error as Error;
      handleError(err, 'share_activity');
      options.onError?.(err);
      throw err;
    } finally {
      setLoadingState(actionKey, false);
    }
  }, [user?.id, supabase, setLoadingState, handleError, handleSuccess]);

  // Get Social Metrics
  const getSocialMetrics = useCallback(async (userId: string): Promise<SocialMetrics> => {
    try {
      const [followersResult, followingResult, likesResult, postsResult] = await Promise.all([
        supabase
          .from('user_relationships')
          .select('id', { count: 'exact' })
          .eq('following_id', userId)
          .eq('relationship_type', 'follow'),
        supabase
          .from('user_relationships')
          .select('id', { count: 'exact' })
          .eq('follower_id', userId)
          .eq('relationship_type', 'follow'),
        supabase
          .from('user_likes')
          .select('id', { count: 'exact' })
          .eq('liked_id', userId),
        supabase
          .from('posts')
          .select('id', { count: 'exact' })
          .eq('author_id', userId)
      ]);

      const followers = followersResult.data?.length || 0;
      const following = followingResult.data?.length || 0;
      const likes = likesResult.data?.length || 0;
      const posts = postsResult.data?.length || 0;
      const engagement = posts > 0 ? (likes / posts) : 0;

      return {
        followers,
        following,
        likes,
        posts,
        engagement
      };
    } catch (error) {
      console.error('Error getting social metrics:', error);
      throw error;
    }
  }, [supabase]);

  // Check Relationship Status
  const getRelationshipStatus = useCallback(async (targetUserId: string) => {
    if (!user?.id) {
      return { isFollowing: false, isBlocked: false, isLiked: false };
    }

    try {
      const [followResult, blockResult, likeResult] = await Promise.all([
        supabase
          .from('user_relationships')
          .select('relationship_type')
          .eq('follower_id', user.id)
          .eq('following_id', targetUserId)
          .eq('relationship_type', 'follow')
          .single(),
        supabase
          .from('user_relationships')
          .select('relationship_type')
          .eq('follower_id', user.id)
          .eq('following_id', targetUserId)
          .eq('relationship_type', 'block')
          .single(),
        supabase
          .from('user_likes')
          .select('id')
          .eq('liker_id', user.id)
          .eq('liked_id', targetUserId)
          .single()
      ]);

      return {
        isFollowing: !!followResult.data,
        isBlocked: !!blockResult.data,
        isLiked: !!likeResult.data
      };
    } catch (error) {
      console.error('Error getting relationship status:', error);
      return { isFollowing: false, isBlocked: false, isLiked: false };
    }
  }, [user?.id, supabase]);

  return {
    // Follow/Unfollow
    followUser,
    unfollowUser,
    
    // Like/Unlike
    likeUser,
    unlikeUser,
    
    // Block/Unblock
    blockUser,
    unblockUser,
    
    // Activity Actions
    likeActivity,
    unlikeActivity,
    bookmarkActivity,
    unbookmarkActivity,
    shareActivity,
    
    // Utilities
    getSocialMetrics,
    getRelationshipStatus,
    
    // State
    loading,
    error,
    isLoading: (action: string) => loading.has(action)
  };
};
