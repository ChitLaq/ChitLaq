import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HeartIcon,
  ChatBubbleLeftIcon,
  ShareIcon,
  BookmarkIcon,
  EllipsisHorizontalIcon,
  UserPlusIcon,
  UserMinusIcon,
  EyeIcon,
  ClockIcon,
  GlobeAltIcon,
  LockClosedIcon,
  SparklesIcon,
  TrendingUpIcon,
  FireIcon
} from '@heroicons/react/24/outline';
import { 
  HeartIcon as HeartSolidIcon,
  BookmarkIcon as BookmarkSolidIcon
} from '@heroicons/react/24/solid';
import { useAuth } from '../../hooks/use-auth';
import { useSocialActions } from '../../hooks/use-social-actions';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../../utils/social-utils';

interface SocialActivity {
  id: string;
  type: 'post' | 'follow' | 'like' | 'comment' | 'share' | 'achievement' | 'event' | 'milestone';
  user: {
    id: string;
    username: string;
    displayName: string;
    profilePicture?: string;
    university?: {
      name: string;
      logo?: string;
    };
    department?: string;
    academicYear?: string;
    isVerified?: boolean;
  };
  content: {
    text?: string;
    image?: string;
    link?: {
      url: string;
      title: string;
      description: string;
      image?: string;
    };
  };
  metadata: {
    likes: number;
    comments: number;
    shares: number;
    views: number;
    isLiked: boolean;
    isBookmarked: boolean;
    isShared: boolean;
    privacy: 'public' | 'friends' | 'university' | 'department';
    tags: string[];
    location?: string;
  };
  timestamp: string;
  relatedUsers?: Array<{
    id: string;
    username: string;
    displayName: string;
    profilePicture?: string;
  }>;
  engagement?: {
    trend: 'up' | 'down' | 'stable';
    change: number;
  };
}

interface SocialActivityFeedProps {
  className?: string;
  userId?: string;
  universityId?: string;
  departmentId?: string;
  showFilters?: boolean;
  showTrending?: boolean;
  maxItems?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
  onActivityClick?: (activity: SocialActivity) => void;
  onUserClick?: (userId: string) => void;
}

const SocialActivityFeed: React.FC<SocialActivityFeedProps> = ({
  className,
  userId,
  universityId,
  departmentId,
  showFilters = true,
  showTrending = true,
  maxItems = 20,
  autoRefresh = true,
  refreshInterval = 30000,
  onActivityClick,
  onUserClick
}) => {
  const { user } = useAuth();
  const { likeActivity, unlikeActivity, bookmarkActivity, unbookmarkActivity, shareActivity } = useSocialActions();
  
  const [activities, setActivities] = useState<SocialActivity[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<SocialActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'following' | 'university' | 'trending'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState<Set<string>>(new Set());
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch activities
  const fetchActivities = useCallback(async () => {
    try {
      setError(null);
      
      // Mock data - replace with actual API call
      const mockActivities: SocialActivity[] = [
        {
          id: '1',
          type: 'post',
          user: {
            id: 'user1',
            username: 'alex_chen',
            displayName: 'Alex Chen',
            profilePicture: '/avatars/alex.jpg',
            university: { name: 'Stanford University', logo: '/logos/stanford.png' },
            department: 'Computer Science',
            academicYear: 'Junior',
            isVerified: true
          },
          content: {
            text: 'Just finished building my first AI model! The results are incredible. Can\'t wait to share more about the technical details. #AI #MachineLearning #Stanford',
            image: '/images/ai-model.jpg'
          },
          metadata: {
            likes: 45,
            comments: 12,
            shares: 8,
            views: 234,
            isLiked: false,
            isBookmarked: false,
            isShared: false,
            privacy: 'public',
            tags: ['AI', 'MachineLearning', 'Stanford'],
            location: 'Stanford, CA'
          },
          timestamp: '2024-01-15T10:30:00Z',
          engagement: {
            trend: 'up',
            change: 0.15
          }
        },
        {
          id: '2',
          type: 'follow',
          user: {
            id: 'user2',
            username: 'sarah_johnson',
            displayName: 'Sarah Johnson',
            profilePicture: '/avatars/sarah.jpg',
            university: { name: 'Stanford University', logo: '/logos/stanford.png' },
            department: 'Psychology',
            academicYear: 'Senior'
          },
          content: {
            text: 'started following'
          },
          metadata: {
            likes: 0,
            comments: 0,
            shares: 0,
            views: 0,
            isLiked: false,
            isBookmarked: false,
            isShared: false,
            privacy: 'public',
            tags: []
          },
          timestamp: '2024-01-15T09:15:00Z',
          relatedUsers: [
            {
              id: 'user3',
              username: 'mike_wilson',
              displayName: 'Mike Wilson',
              profilePicture: '/avatars/mike.jpg'
            }
          ]
        },
        {
          id: '3',
          type: 'achievement',
          user: {
            id: 'user4',
            username: 'emma_davis',
            displayName: 'Emma Davis',
            profilePicture: '/avatars/emma.jpg',
            university: { name: 'Stanford University', logo: '/logos/stanford.png' },
            department: 'Business',
            academicYear: 'Graduate'
          },
          content: {
            text: 'achieved a new milestone: Published Research Paper'
          },
          metadata: {
            likes: 23,
            comments: 5,
            shares: 3,
            views: 89,
            isLiked: false,
            isBookmarked: false,
            isShared: false,
            privacy: 'public',
            tags: ['Research', 'Achievement']
          },
          timestamp: '2024-01-15T08:45:00Z'
        }
      ];
      
      setActivities(mockActivities);
      setLastRefresh(new Date());
    } catch (err) {
      setError('Failed to load activities');
      console.error('Error fetching activities:', err);
    }
  }, [userId, universityId, departmentId]);

  useEffect(() => {
    const loadActivities = async () => {
      setLoading(true);
      await fetchActivities();
      setLoading(false);
    };

    loadActivities();

    // Set up auto-refresh
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(fetchActivities, refreshInterval);
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [fetchActivities, autoRefresh, refreshInterval]);

  // Filter activities
  useEffect(() => {
    let filtered = activities;

    // Filter by type
    switch (selectedFilter) {
      case 'following':
        // Filter to show only activities from followed users
        filtered = filtered.filter(activity => 
          activity.user.id !== user?.id // Exclude own activities
        );
        break;
      case 'university':
        filtered = filtered.filter(activity => 
          activity.user.university?.name === 'Stanford University'
        );
        break;
      case 'trending':
        filtered = filtered.filter(activity => 
          activity.engagement?.trend === 'up' && activity.engagement.change > 0.1
        );
        break;
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(activity =>
        activity.content.text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.metadata.tags.some(tag => 
          tag.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    setFilteredActivities(filtered.slice(0, maxItems));
  }, [activities, selectedFilter, searchTerm, maxItems, user?.id]);

  const handleLike = useCallback(async (activity: SocialActivity) => {
    if (actionLoading.has(activity.id)) return;
    
    setActionLoading(prev => new Set(prev).add(activity.id));
    
    try {
      if (activity.metadata.isLiked) {
        await unlikeActivity(activity.id);
        setActivities(prev => prev.map(a => 
          a.id === activity.id 
            ? { 
                ...a, 
                metadata: { 
                  ...a.metadata, 
                  isLiked: false, 
                  likes: a.metadata.likes - 1 
                } 
              }
            : a
        ));
      } else {
        await likeActivity(activity.id);
        setActivities(prev => prev.map(a => 
          a.id === activity.id 
            ? { 
                ...a, 
                metadata: { 
                  ...a.metadata, 
                  isLiked: true, 
                  likes: a.metadata.likes + 1 
                } 
              }
            : a
        ));
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    } finally {
      setActionLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(activity.id);
        return newSet;
      });
    }
  }, [likeActivity, unlikeActivity, actionLoading]);

  const handleBookmark = useCallback(async (activity: SocialActivity) => {
    if (actionLoading.has(activity.id)) return;
    
    setActionLoading(prev => new Set(prev).add(activity.id));
    
    try {
      if (activity.metadata.isBookmarked) {
        await unbookmarkActivity(activity.id);
        setActivities(prev => prev.map(a => 
          a.id === activity.id 
            ? { ...a, metadata: { ...a.metadata, isBookmarked: false } }
            : a
        ));
      } else {
        await bookmarkActivity(activity.id);
        setActivities(prev => prev.map(a => 
          a.id === activity.id 
            ? { ...a, metadata: { ...a.metadata, isBookmarked: true } }
            : a
        ));
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    } finally {
      setActionLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(activity.id);
        return newSet;
      });
    }
  }, [bookmarkActivity, unbookmarkActivity, actionLoading]);

  const handleShare = useCallback(async (activity: SocialActivity) => {
    if (actionLoading.has(activity.id)) return;
    
    setActionLoading(prev => new Set(prev).add(activity.id));
    
    try {
      await shareActivity(activity.id);
      setActivities(prev => prev.map(a => 
        a.id === activity.id 
          ? { 
              ...a, 
              metadata: { 
                ...a.metadata, 
                isShared: true, 
                shares: a.metadata.shares + 1 
              } 
            }
          : a
      ));
    } catch (error) {
      console.error('Error sharing:', error);
    } finally {
      setActionLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(activity.id);
        return newSet;
      });
    }
  }, [shareActivity, actionLoading]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'post':
        return <ChatBubbleLeftIcon className="w-5 h-5 text-blue-500" />;
      case 'follow':
        return <UserPlusIcon className="w-5 h-5 text-green-500" />;
      case 'like':
        return <HeartIcon className="w-5 h-5 text-red-500" />;
      case 'comment':
        return <ChatBubbleLeftIcon className="w-5 h-5 text-purple-500" />;
      case 'share':
        return <ShareIcon className="w-5 h-5 text-orange-500" />;
      case 'achievement':
        return <SparklesIcon className="w-5 h-5 text-yellow-500" />;
      case 'event':
        return <ClockIcon className="w-5 h-5 text-indigo-500" />;
      case 'milestone':
        return <TrendingUpIcon className="w-5 h-5 text-pink-500" />;
      default:
        return <SparklesIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const getPrivacyIcon = (privacy: string) => {
    switch (privacy) {
      case 'public':
        return <GlobeAltIcon className="w-4 h-4 text-green-500" />;
      case 'friends':
        return <UserPlusIcon className="w-4 h-4 text-blue-500" />;
      case 'university':
        return <AcademicCapIcon className="w-4 h-4 text-purple-500" />;
      case 'department':
        return <BuildingOfficeIcon className="w-4 h-4 text-orange-500" />;
      default:
        return <LockClosedIcon className="w-4 h-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className={cn("space-y-4", className)}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm animate-pulse">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("text-center py-8", className)}>
        <div className="text-red-500 mb-4">{error}</div>
        <button 
          onClick={fetchActivities}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Social Activity
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Stay connected with your university community
          </p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
          <ClockIcon className="w-4 h-4" />
          <span>Updated {formatDistanceToNow(lastRefresh)} ago</span>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search activities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          </div>

          {/* Filter Tabs */}
          <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            {[
              { key: 'all', label: 'All', icon: SparklesIcon },
              { key: 'following', label: 'Following', icon: UserPlusIcon },
              { key: 'university', label: 'University', icon: AcademicCapIcon },
              { key: 'trending', label: 'Trending', icon: FireIcon }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setSelectedFilter(key as any)}
                className={cn(
                  "flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                  selectedFilter === key
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Activities */}
      <AnimatePresence>
        {filteredActivities.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
              <SparklesIcon className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No activities found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Try adjusting your filters or check back later for new updates.
            </p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {filteredActivities.map((activity) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => onActivityClick?.(activity)}
              >
                <div className="flex items-start space-x-4">
                  {/* Activity Icon */}
                  <div className="flex-shrink-0">
                    {getActivityIcon(activity.type)}
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <img
                        src={activity.user.profilePicture || '/default-avatar.png'}
                        alt={activity.user.displayName}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                            {activity.user.displayName}
                          </h3>
                          {activity.user.isVerified && (
                            <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                              <CheckIcon className="w-3 h-3 text-white" />
                            </div>
                          )}
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            @{activity.user.username}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                          {activity.user.university && (
                            <span>{activity.user.university.name}</span>
                          )}
                          {activity.user.department && (
                            <>
                              <span>•</span>
                              <span>{activity.user.department}</span>
                            </>
                          )}
                          {activity.user.academicYear && (
                            <>
                              <span>•</span>
                              <span>{activity.user.academicYear}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getPrivacyIcon(activity.metadata.privacy)}
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDistanceToNow(new Date(activity.timestamp))} ago
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="mb-4">
                      {activity.content.text && (
                        <p className="text-gray-700 dark:text-gray-300 mb-3">
                          {activity.content.text}
                        </p>
                      )}

                      {activity.content.image && (
                        <img
                          src={activity.content.image}
                          alt="Activity content"
                          className="w-full max-w-md rounded-lg object-cover"
                        />
                      )}

                      {activity.content.link && (
                        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                          <div className="flex space-x-3">
                            {activity.content.link.image && (
                              <img
                                src={activity.content.link.image}
                                alt="Link preview"
                                className="w-20 h-20 rounded object-cover"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-gray-900 dark:text-white truncate">
                                {activity.content.link.title}
                              </h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                                {activity.content.link.description}
                              </p>
                              <p className="text-xs text-blue-600 dark:text-blue-400 truncate mt-1">
                                {activity.content.link.url}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Tags */}
                      {activity.metadata.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {activity.metadata.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-6">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLike(activity);
                          }}
                          disabled={actionLoading.has(activity.id)}
                          className={cn(
                            "flex items-center space-x-2 text-sm transition-colors",
                            activity.metadata.isLiked
                              ? "text-red-500"
                              : "text-gray-500 dark:text-gray-400 hover:text-red-500"
                          )}
                        >
                          {activity.metadata.isLiked ? (
                            <HeartSolidIcon className="w-5 h-5" />
                          ) : (
                            <HeartIcon className="w-5 h-5" />
                          )}
                          <span>{activity.metadata.likes}</span>
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // Handle comment
                          }}
                          className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-500 transition-colors"
                        >
                          <ChatBubbleLeftIcon className="w-5 h-5" />
                          <span>{activity.metadata.comments}</span>
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShare(activity);
                          }}
                          disabled={actionLoading.has(activity.id)}
                          className={cn(
                            "flex items-center space-x-2 text-sm transition-colors",
                            activity.metadata.isShared
                              ? "text-green-500"
                              : "text-gray-500 dark:text-gray-400 hover:text-green-500"
                          )}
                        >
                          <ShareIcon className="w-5 h-5" />
                          <span>{activity.metadata.shares}</span>
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBookmark(activity);
                          }}
                          disabled={actionLoading.has(activity.id)}
                          className={cn(
                            "flex items-center space-x-2 text-sm transition-colors",
                            activity.metadata.isBookmarked
                              ? "text-yellow-500"
                              : "text-gray-500 dark:text-gray-400 hover:text-yellow-500"
                          )}
                        >
                          {activity.metadata.isBookmarked ? (
                            <BookmarkSolidIcon className="w-5 h-5" />
                          ) : (
                            <BookmarkIcon className="w-5 h-5" />
                          )}
                        </button>
                      </div>

                      <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                        <EyeIcon className="w-4 h-4" />
                        <span>{activity.metadata.views}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SocialActivityFeed;
