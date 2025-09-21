import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserPlusIcon, 
  UserMinusIcon, 
  HeartIcon, 
  ChatBubbleLeftIcon,
  MapPinIcon,
  AcademicCapIcon,
  StarIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import { useAuth } from '../../hooks/use-auth';
import { useSocialActions } from '../../hooks/use-social-actions';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../../utils/social-utils';

interface Recommendation {
  id: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    profilePicture?: string;
    biography?: string;
    university: {
      name: string;
      logo?: string;
    };
    department?: string;
    academicYear?: string;
    location?: string;
    interests: string[];
    mutualConnections: number;
    mutualInterests: string[];
    lastActive: string;
    isOnline: boolean;
  };
  reason: {
    type: 'mutual_connections' | 'mutual_interests' | 'university_network' | 'department' | 'academic_year' | 'location';
    description: string;
    confidence: number;
  };
  isFollowed: boolean;
  isBlocked: boolean;
  isLiked: boolean;
}

interface PeopleDiscoveryProps {
  className?: string;
  onUserAction?: (action: string, userId: string) => void;
  showFilters?: boolean;
  maxRecommendations?: number;
}

const PeopleDiscovery: React.FC<PeopleDiscoveryProps> = ({
  className,
  onUserAction,
  showFilters = true,
  maxRecommendations = 20
}) => {
  const { user } = useAuth();
  const { followUser, unfollowUser, likeUser, unlikeUser, blockUser, unblockUser } = useSocialActions();
  
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [filteredRecommendations, setFilteredRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilters, setSelectedFilters] = useState({
    reason: 'all',
    university: 'all',
    department: 'all',
    academicYear: 'all',
    onlineOnly: false,
    mutualConnections: false
  });
  const [dismissedUsers, setDismissedUsers] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<Set<string>>(new Set());

  // Fetch recommendations
  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Mock data - replace with actual API call
        const mockRecommendations: Recommendation[] = [
          {
            id: '1',
            user: {
              id: 'user1',
              username: 'alex_chen',
              displayName: 'Alex Chen',
              profilePicture: '/avatars/alex.jpg',
              biography: 'Computer Science student passionate about AI and machine learning. Love hiking and photography!',
              university: { name: 'Stanford University', logo: '/logos/stanford.png' },
              department: 'Computer Science',
              academicYear: 'Junior',
              location: 'Palo Alto, CA',
              interests: ['AI', 'Machine Learning', 'Photography', 'Hiking'],
              mutualConnections: 12,
              mutualInterests: ['AI', 'Machine Learning'],
              lastActive: '2024-01-15T10:30:00Z',
              isOnline: true
            },
            reason: {
              type: 'mutual_connections',
              description: '12 mutual connections',
              confidence: 0.85
            },
            isFollowed: false,
            isBlocked: false,
            isLiked: false
          },
          {
            id: '2',
            user: {
              id: 'user2',
              username: 'sarah_johnson',
              displayName: 'Sarah Johnson',
              profilePicture: '/avatars/sarah.jpg',
              biography: 'Psychology major with a focus on cognitive science. Coffee enthusiast and book lover.',
              university: { name: 'Stanford University', logo: '/logos/stanford.png' },
              department: 'Psychology',
              academicYear: 'Senior',
              location: 'Stanford, CA',
              interests: ['Psychology', 'Cognitive Science', 'Coffee', 'Reading'],
              mutualConnections: 5,
              mutualInterests: ['Coffee', 'Reading'],
              lastActive: '2024-01-15T09:15:00Z',
              isOnline: false
            },
            reason: {
              type: 'mutual_interests',
              description: '2 mutual interests',
              confidence: 0.72
            },
            isFollowed: false,
            isBlocked: false,
            isLiked: false
          }
        ];
        
        setRecommendations(mockRecommendations);
        setFilteredRecommendations(mockRecommendations);
      } catch (err) {
        setError('Failed to load recommendations');
        console.error('Error fetching recommendations:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, []);

  // Filter recommendations
  useEffect(() => {
    let filtered = recommendations.filter(rec => !dismissedUsers.has(rec.id));

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(rec =>
        rec.user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rec.user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rec.user.biography?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rec.user.interests.some(interest => 
          interest.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Reason filter
    if (selectedFilters.reason !== 'all') {
      filtered = filtered.filter(rec => rec.reason.type === selectedFilters.reason);
    }

    // University filter
    if (selectedFilters.university !== 'all') {
      filtered = filtered.filter(rec => rec.user.university.name === selectedFilters.university);
    }

    // Department filter
    if (selectedFilters.department !== 'all') {
      filtered = filtered.filter(rec => rec.user.department === selectedFilters.department);
    }

    // Academic year filter
    if (selectedFilters.academicYear !== 'all') {
      filtered = filtered.filter(rec => rec.user.academicYear === selectedFilters.academicYear);
    }

    // Online only filter
    if (selectedFilters.onlineOnly) {
      filtered = filtered.filter(rec => rec.user.isOnline);
    }

    // Mutual connections filter
    if (selectedFilters.mutualConnections) {
      filtered = filtered.filter(rec => rec.user.mutualConnections > 0);
    }

    setFilteredRecommendations(filtered);
  }, [recommendations, searchTerm, selectedFilters, dismissedUsers]);

  const handleFollow = useCallback(async (recommendation: Recommendation) => {
    if (actionLoading.has(recommendation.id)) return;
    
    setActionLoading(prev => new Set(prev).add(recommendation.id));
    
    try {
      if (recommendation.isFollowed) {
        await unfollowUser(recommendation.user.id);
        setRecommendations(prev => prev.map(rec => 
          rec.id === recommendation.id 
            ? { ...rec, isFollowed: false }
            : rec
        ));
        onUserAction?.('unfollow', recommendation.user.id);
      } else {
        await followUser(recommendation.user.id);
        setRecommendations(prev => prev.map(rec => 
          rec.id === recommendation.id 
            ? { ...rec, isFollowed: true }
            : rec
        ));
        onUserAction?.('follow', recommendation.user.id);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    } finally {
      setActionLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(recommendation.id);
        return newSet;
      });
    }
  }, [followUser, unfollowUser, onUserAction, actionLoading]);

  const handleLike = useCallback(async (recommendation: Recommendation) => {
    if (actionLoading.has(recommendation.id)) return;
    
    setActionLoading(prev => new Set(prev).add(recommendation.id));
    
    try {
      if (recommendation.isLiked) {
        await unlikeUser(recommendation.user.id);
        setRecommendations(prev => prev.map(rec => 
          rec.id === recommendation.id 
            ? { ...rec, isLiked: false }
            : rec
        ));
        onUserAction?.('unlike', recommendation.user.id);
      } else {
        await likeUser(recommendation.user.id);
        setRecommendations(prev => prev.map(rec => 
          rec.id === recommendation.id 
            ? { ...rec, isLiked: true }
            : rec
        ));
        onUserAction?.('like', recommendation.user.id);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    } finally {
      setActionLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(recommendation.id);
        return newSet;
      });
    }
  }, [likeUser, unlikeUser, onUserAction, actionLoading]);

  const handleDismiss = useCallback((recommendationId: string) => {
    setDismissedUsers(prev => new Set(prev).add(recommendationId));
    onUserAction?.('dismiss', recommendationId);
  }, [onUserAction]);

  const getReasonIcon = (type: string) => {
    switch (type) {
      case 'mutual_connections':
        return <UserPlusIcon className="w-4 h-4" />;
      case 'mutual_interests':
        return <HeartIcon className="w-4 h-4" />;
      case 'university_network':
        return <AcademicCapIcon className="w-4 h-4" />;
      case 'department':
        return <MapPinIcon className="w-4 h-4" />;
      case 'academic_year':
        return <StarIcon className="w-4 h-4" />;
      default:
        return <SparklesIcon className="w-4 h-4" />;
    }
  };

  const getReasonColor = (type: string) => {
    switch (type) {
      case 'mutual_connections':
        return 'text-blue-600 bg-blue-100';
      case 'mutual_interests':
        return 'text-pink-600 bg-pink-100';
      case 'university_network':
        return 'text-purple-600 bg-purple-100';
      case 'department':
        return 'text-green-600 bg-green-100';
      case 'academic_year':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className={cn("space-y-4", className)}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm animate-pulse">
            <div className="flex items-start space-x-4">
              <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
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
          onClick={() => window.location.reload()}
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
            Discover People
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Connect with students from your university and beyond
          </p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
          <SparklesIcon className="w-4 h-4" />
          <span>{filteredRecommendations.length} recommendations</span>
        </div>
      </div>

      {/* Search and Filters */}
      {showFilters && (
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, interests, or bio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <select
              value={selectedFilters.reason}
              onChange={(e) => setSelectedFilters(prev => ({ ...prev, reason: e.target.value }))}
              className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            >
              <option value="all">All reasons</option>
              <option value="mutual_connections">Mutual connections</option>
              <option value="mutual_interests">Mutual interests</option>
              <option value="university_network">University network</option>
              <option value="department">Same department</option>
              <option value="academic_year">Same year</option>
            </select>

            <select
              value={selectedFilters.university}
              onChange={(e) => setSelectedFilters(prev => ({ ...prev, university: e.target.value }))}
              className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            >
              <option value="all">All universities</option>
              <option value="Stanford University">Stanford University</option>
            </select>

            <select
              value={selectedFilters.department}
              onChange={(e) => setSelectedFilters(prev => ({ ...prev, department: e.target.value }))}
              className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            >
              <option value="all">All departments</option>
              <option value="Computer Science">Computer Science</option>
              <option value="Psychology">Psychology</option>
            </select>

            <label className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <input
                type="checkbox"
                checked={selectedFilters.onlineOnly}
                onChange={(e) => setSelectedFilters(prev => ({ ...prev, onlineOnly: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Online only</span>
            </label>

            <label className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <input
                type="checkbox"
                checked={selectedFilters.mutualConnections}
                onChange={(e) => setSelectedFilters(prev => ({ ...prev, mutualConnections: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Mutual connections</span>
            </label>
          </div>
        </div>
      )}

      {/* Recommendations */}
      <AnimatePresence>
        {filteredRecommendations.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
              <UserPlusIcon className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No recommendations found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Try adjusting your filters or check back later for new suggestions.
            </p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {filteredRecommendations.map((recommendation) => (
              <motion.div
                key={recommendation.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start space-x-4">
                  {/* Profile Picture */}
                  <div className="relative">
                    <img
                      src={recommendation.user.profilePicture || '/default-avatar.png'}
                      alt={recommendation.user.displayName}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                    {recommendation.user.isOnline && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
                    )}
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                        {recommendation.user.displayName}
                      </h3>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        @{recommendation.user.username}
                      </span>
                    </div>

                    <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400 mb-2">
                      <div className="flex items-center space-x-1">
                        <AcademicCapIcon className="w-4 h-4" />
                        <span>{recommendation.user.university.name}</span>
                      </div>
                      {recommendation.user.department && (
                        <div className="flex items-center space-x-1">
                          <MapPinIcon className="w-4 h-4" />
                          <span>{recommendation.user.department}</span>
                        </div>
                      )}
                      {recommendation.user.academicYear && (
                        <span>{recommendation.user.academicYear}</span>
                      )}
                    </div>

                    {recommendation.user.biography && (
                      <p className="text-gray-700 dark:text-gray-300 text-sm mb-3 line-clamp-2">
                        {recommendation.user.biography}
                      </p>
                    )}

                    {/* Interests */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {recommendation.user.interests.slice(0, 4).map((interest) => (
                        <span
                          key={interest}
                          className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-full"
                        >
                          {interest}
                        </span>
                      ))}
                      {recommendation.user.interests.length > 4 && (
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs rounded-full">
                          +{recommendation.user.interests.length - 4} more
                        </span>
                      )}
                    </div>

                    {/* Mutual Connections & Interests */}
                    <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                      {recommendation.user.mutualConnections > 0 && (
                        <span>{recommendation.user.mutualConnections} mutual connections</span>
                      )}
                      {recommendation.user.mutualInterests.length > 0 && (
                        <span>{recommendation.user.mutualInterests.length} mutual interests</span>
                      )}
                      <span>Active {formatDistanceToNow(new Date(recommendation.user.lastActive))} ago</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col space-y-2">
                    <button
                      onClick={() => handleDismiss(recommendation.id)}
                      className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      title="Dismiss"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Recommendation Reason */}
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={cn("flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium", getReasonColor(recommendation.reason.type))}>
                        {getReasonIcon(recommendation.reason.type)}
                        <span>{recommendation.reason.description}</span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {Math.round(recommendation.reason.confidence * 100)}% match
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleLike(recommendation)}
                        disabled={actionLoading.has(recommendation.id)}
                        className={cn(
                          "p-2 rounded-full transition-colors",
                          recommendation.isLiked
                            ? "text-red-500 bg-red-50 dark:bg-red-900/20"
                            : "text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                        )}
                        title={recommendation.isLiked ? "Unlike" : "Like"}
                      >
                        {recommendation.isLiked ? (
                          <HeartSolidIcon className="w-5 h-5" />
                        ) : (
                          <HeartIcon className="w-5 h-5" />
                        )}
                      </button>

                      <button
                        onClick={() => handleFollow(recommendation)}
                        disabled={actionLoading.has(recommendation.id)}
                        className={cn(
                          "px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2",
                          recommendation.isFollowed
                            ? "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                        )}
                      >
                        {actionLoading.has(recommendation.id) ? (
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : recommendation.isFollowed ? (
                          <>
                            <UserMinusIcon className="w-4 h-4" />
                            <span>Following</span>
                          </>
                        ) : (
                          <>
                            <UserPlusIcon className="w-4 h-4" />
                            <span>Follow</span>
                          </>
                        )}
                      </button>
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

export default PeopleDiscovery;
