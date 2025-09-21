import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AcademicCapIcon,
  UserGroupIcon,
  MapPinIcon,
  CalendarIcon,
  StarIcon,
  TrendingUpIcon,
  UsersIcon,
  BuildingOfficeIcon,
  BookOpenIcon,
  SparklesIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../hooks/use-auth';
import { useSocialActions } from '../../hooks/use-social-actions';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../../utils/social-utils';

interface UniversityNetworkData {
  university: {
    id: string;
    name: string;
    logo?: string;
    domain: string;
    location: string;
    type: string;
    size: string;
  };
  departments: Department[];
  academicYears: AcademicYear[];
  recentActivity: Activity[];
  trendingTopics: TrendingTopic[];
  statistics: NetworkStatistics;
}

interface Department {
  id: string;
  name: string;
  code: string;
  faculty: string;
  studentCount: number;
  facultyCount: number;
  recentGraduates: number;
  topInterests: string[];
  isActive: boolean;
}

interface AcademicYear {
  year: number;
  studentCount: number;
  departments: string[];
  topInterests: string[];
  graduationRate: number;
}

interface Activity {
  id: string;
  type: 'new_student' | 'graduation' | 'achievement' | 'event' | 'post';
  user: {
    id: string;
    username: string;
    displayName: string;
    profilePicture?: string;
    department?: string;
  };
  description: string;
  timestamp: string;
  metadata?: any;
}

interface TrendingTopic {
  id: string;
  topic: string;
  postCount: number;
  engagement: number;
  growth: number;
  category: string;
}

interface NetworkStatistics {
  totalStudents: number;
  totalFaculty: number;
  totalDepartments: number;
  activeUsers: number;
  newConnections: number;
  engagementRate: number;
}

interface UniversityNetworkProps {
  universityId: string;
  className?: string;
  showStatistics?: boolean;
  showActivity?: boolean;
  showTrending?: boolean;
  maxItems?: number;
}

const UniversityNetwork: React.FC<UniversityNetworkProps> = ({
  universityId,
  className,
  showStatistics = true,
  showActivity = true,
  showTrending = true,
  maxItems = 10
}) => {
  const { user } = useAuth();
  const { followUser, unfollowUser } = useSocialActions();
  
  const [networkData, setNetworkData] = useState<UniversityNetworkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<'departments' | 'years' | 'activity' | 'trending'>('departments');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');

  // Fetch network data
  useEffect(() => {
    const fetchNetworkData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Mock data - replace with actual API call
        const mockData: UniversityNetworkData = {
          university: {
            id: universityId,
            name: 'Stanford University',
            logo: '/logos/stanford.png',
            domain: 'stanford.edu',
            location: 'Stanford, CA',
            type: 'Research University',
            size: 'Large'
          },
          departments: [
            {
              id: '1',
              name: 'Computer Science',
              code: 'CS',
              faculty: 'Engineering',
              studentCount: 1200,
              facultyCount: 45,
              recentGraduates: 180,
              topInterests: ['AI', 'Machine Learning', 'Software Engineering', 'Data Science'],
              isActive: true
            },
            {
              id: '2',
              name: 'Psychology',
              code: 'PSY',
              faculty: 'Humanities & Sciences',
              studentCount: 800,
              facultyCount: 32,
              recentGraduates: 120,
              topInterests: ['Cognitive Science', 'Social Psychology', 'Neuroscience', 'Research'],
              isActive: true
            },
            {
              id: '3',
              name: 'Business',
              code: 'BUS',
              faculty: 'Graduate School of Business',
              studentCount: 600,
              facultyCount: 28,
              recentGraduates: 90,
              topInterests: ['Entrepreneurship', 'Finance', 'Marketing', 'Strategy'],
              isActive: true
            }
          ],
          academicYears: [
            {
              year: 2024,
              studentCount: 450,
              departments: ['Computer Science', 'Psychology', 'Business'],
              topInterests: ['AI', 'Sustainability', 'Entrepreneurship'],
              graduationRate: 0.95
            },
            {
              year: 2023,
              studentCount: 420,
              departments: ['Computer Science', 'Psychology', 'Business'],
              topInterests: ['Machine Learning', 'Social Impact', 'Innovation'],
              graduationRate: 0.93
            },
            {
              year: 2022,
              studentCount: 380,
              departments: ['Computer Science', 'Psychology', 'Business'],
              topInterests: ['Data Science', 'Mental Health', 'Leadership'],
              graduationRate: 0.91
            }
          ],
          recentActivity: [
            {
              id: '1',
              type: 'new_student',
              user: {
                id: 'user1',
                username: 'alex_chen',
                displayName: 'Alex Chen',
                profilePicture: '/avatars/alex.jpg',
                department: 'Computer Science'
              },
              description: 'joined the Computer Science department',
              timestamp: '2024-01-15T10:30:00Z'
            },
            {
              id: '2',
              type: 'achievement',
              user: {
                id: 'user2',
                username: 'sarah_johnson',
                displayName: 'Sarah Johnson',
                profilePicture: '/avatars/sarah.jpg',
                department: 'Psychology'
              },
              description: 'published research on cognitive science',
              timestamp: '2024-01-15T09:15:00Z'
            },
            {
              id: '3',
              type: 'event',
              user: {
                id: 'user3',
                username: 'mike_wilson',
                displayName: 'Mike Wilson',
                profilePicture: '/avatars/mike.jpg',
                department: 'Business'
              },
              description: 'organized a startup pitch competition',
              timestamp: '2024-01-14T16:45:00Z'
            }
          ],
          trendingTopics: [
            {
              id: '1',
              topic: 'AI Ethics',
              postCount: 45,
              engagement: 320,
              growth: 0.15,
              category: 'Technology'
            },
            {
              id: '2',
              topic: 'Climate Change',
              postCount: 38,
              engagement: 280,
              growth: 0.22,
              category: 'Environment'
            },
            {
              id: '3',
              topic: 'Mental Health',
              postCount: 32,
              engagement: 250,
              growth: 0.18,
              category: 'Health'
            }
          ],
          statistics: {
            totalStudents: 17000,
            totalFaculty: 2100,
            totalDepartments: 7,
            activeUsers: 12000,
            newConnections: 450,
            engagementRate: 0.78
          }
        };
        
        setNetworkData(mockData);
      } catch (err) {
        setError('Failed to load university network data');
        console.error('Error fetching network data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchNetworkData();
  }, [universityId]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'new_student':
        return <UserGroupIcon className="w-5 h-5 text-green-500" />;
      case 'graduation':
        return <AcademicCapIcon className="w-5 h-5 text-blue-500" />;
      case 'achievement':
        return <StarIcon className="w-5 h-5 text-yellow-500" />;
      case 'event':
        return <CalendarIcon className="w-5 h-5 text-purple-500" />;
      case 'post':
        return <BookOpenIcon className="w-5 h-5 text-gray-500" />;
      default:
        return <SparklesIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'new_student':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'graduation':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      case 'achievement':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      case 'event':
        return 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800';
      case 'post':
        return 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800';
      default:
        return 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800';
    }
  };

  const filteredDepartments = networkData?.departments.filter(dept => {
    if (selectedDepartment !== 'all' && dept.faculty !== selectedDepartment) return false;
    if (searchTerm && !dept.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  }) || [];

  const filteredYears = networkData?.academicYears.filter(year => {
    if (selectedYear !== 'all' && year.year.toString() !== selectedYear) return false;
    return true;
  }) || [];

  const filteredActivity = networkData?.recentActivity.filter(activity => {
    if (searchTerm && !activity.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  }).slice(0, maxItems) || [];

  const filteredTrending = networkData?.trendingTopics.filter(topic => {
    if (searchTerm && !topic.topic.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  }).slice(0, maxItems) || [];

  if (loading) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
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

  if (!networkData) {
    return (
      <div className={cn("text-center py-8", className)}>
        <div className="text-gray-500">No network data available</div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center space-x-4 mb-4">
          {networkData.university.logo && (
            <img
              src={networkData.university.logo}
              alt={networkData.university.name}
              className="w-16 h-16 rounded-lg object-cover"
            />
          )}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {networkData.university.name}
            </h2>
            <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
              <span>{networkData.university.location}</span>
              <span>•</span>
              <span>{networkData.university.type}</span>
              <span>•</span>
              <span>{networkData.university.size}</span>
            </div>
          </div>
        </div>

        {/* Statistics */}
        {showStatistics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {networkData.statistics.totalStudents.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Students</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {networkData.statistics.totalFaculty.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Faculty</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {networkData.statistics.totalDepartments}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Departments</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {Math.round(networkData.statistics.engagementRate * 100)}%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Engagement</div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6">
            {[
              { key: 'departments', label: 'Departments', icon: BuildingOfficeIcon },
              { key: 'years', label: 'Academic Years', icon: CalendarIcon },
              { key: 'activity', label: 'Recent Activity', icon: TrendingUpIcon },
              { key: 'trending', label: 'Trending Topics', icon: SparklesIcon }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setSelectedView(key as any)}
                className={cn(
                  "flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors",
                  selectedView === key
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                )}
              >
                <Icon className="w-5 h-5" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Search and Filters */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder={`Search ${selectedView}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              
              {selectedView === 'departments' && (
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="all">All Faculties</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Humanities & Sciences">Humanities & Sciences</option>
                  <option value="Graduate School of Business">Graduate School of Business</option>
                </select>
              )}
              
              {selectedView === 'years' && (
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="all">All Years</option>
                  <option value="2024">2024</option>
                  <option value="2023">2023</option>
                  <option value="2022">2022</option>
                </select>
              )}
            </div>
          </div>

          {/* Content */}
          <AnimatePresence mode="wait">
            {selectedView === 'departments' && (
              <motion.div
                key="departments"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                {filteredDepartments.map((department) => (
                  <div
                    key={department.id}
                    className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {department.name}
                          </h3>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {department.code}
                          </span>
                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full">
                            {department.faculty}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-6 text-sm text-gray-600 dark:text-gray-400 mb-3">
                          <div className="flex items-center space-x-1">
                            <UsersIcon className="w-4 h-4" />
                            <span>{department.studentCount.toLocaleString()} students</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <AcademicCapIcon className="w-4 h-4" />
                            <span>{department.facultyCount} faculty</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <StarIcon className="w-4 h-4" />
                            <span>{department.recentGraduates} recent graduates</span>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-1">
                          {department.topInterests.map((interest) => (
                            <span
                              key={interest}
                              className="px-2 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs rounded-full"
                            >
                              {interest}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                        <ChevronRightIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {selectedView === 'years' && (
              <motion.div
                key="years"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                {filteredYears.map((year) => (
                  <div
                    key={year.year}
                    className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Class of {year.year}
                          </h3>
                          <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs rounded-full">
                            {Math.round(year.graduationRate * 100)}% graduation rate
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-6 text-sm text-gray-600 dark:text-gray-400 mb-3">
                          <div className="flex items-center space-x-1">
                            <UsersIcon className="w-4 h-4" />
                            <span>{year.studentCount.toLocaleString()} students</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <BuildingOfficeIcon className="w-4 h-4" />
                            <span>{year.departments.length} departments</span>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-1">
                          {year.topInterests.map((interest) => (
                            <span
                              key={interest}
                              className="px-2 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs rounded-full"
                            >
                              {interest}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {selectedView === 'activity' && showActivity && (
              <motion.div
                key="activity"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                {filteredActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className={cn("border rounded-lg p-4", getActivityColor(activity.type))}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <img
                            src={activity.user.profilePicture || '/default-avatar.png'}
                            alt={activity.user.displayName}
                            className="w-6 h-6 rounded-full object-cover"
                          />
                          <span className="font-medium text-gray-900 dark:text-white">
                            {activity.user.displayName}
                          </span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            @{activity.user.username}
                          </span>
                        </div>
                        <p className="text-gray-700 dark:text-gray-300 text-sm">
                          {activity.description}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {formatDistanceToNow(new Date(activity.timestamp))} ago
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {selectedView === 'trending' && showTrending && (
              <motion.div
                key="trending"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                {filteredTrending.map((topic) => (
                  <div
                    key={topic.id}
                    className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            #{topic.topic}
                          </h3>
                          <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-xs rounded-full">
                            {topic.category}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-6 text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-center space-x-1">
                            <BookOpenIcon className="w-4 h-4" />
                            <span>{topic.postCount} posts</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <HeartIcon className="w-4 h-4" />
                            <span>{topic.engagement} engagement</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <TrendingUpIcon className="w-4 h-4" />
                            <span>+{Math.round(topic.growth * 100)}% growth</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default UniversityNetwork;
