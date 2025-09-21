// Social Analytics Dashboard
// Author: ChitLaq Development Team
// Date: 2024-01-15

import React, { useState, useEffect } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend,
  ArcElement
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { 
  Users, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Activity,
  Heart,
  MessageCircle,
  Share2,
  Eye,
  Target,
  Shield,
  Users2,
  BarChart3,
  PieChart,
  Calendar,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface SocialDashboardProps {
  supabase: SupabaseClient;
  universityId?: string;
}

interface DashboardMetrics {
  totalUsers: number;
  activeUsers: number;
  newConnections: number;
  engagementRate: number;
  communityHealth: number;
  safetyScore: number;
  diversityIndex: number;
  growthRate: number;
}

interface TrendData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
    tension: number;
  }[];
}

interface InsightCard {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'growth' | 'engagement' | 'health' | 'safety' | 'diversity';
  value: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
}

const SocialDashboard: React.FC<SocialDashboardProps> = ({ supabase, universityId }) => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [insights, setInsights] = useState<InsightCard[]>([]);
  const [trendData, setTrendData] = useState<TrendData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [selectedMetric, setSelectedMetric] = useState<string>('all');

  useEffect(() => {
    loadDashboardData();
  }, [universityId, timeRange]);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load metrics
      const metricsResponse = await fetch(`/api/analytics/social/metrics?universityId=${universityId}&timeRange=${timeRange}`);
      const metricsData = await metricsResponse.json();
      setMetrics(metricsData);

      // Load insights
      const insightsResponse = await fetch(`/api/analytics/social/insights?universityId=${universityId}`);
      const insightsData = await insightsResponse.json();
      setInsights(insightsData);

      // Load trend data
      const trendResponse = await fetch(`/api/analytics/social/trends?universityId=${universityId}&timeRange=${timeRange}`);
      const trendData = await trendResponse.json();
      setTrendData(trendData);

    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      case 'high': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/20';
      case 'medium': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
      case 'low': return 'text-green-600 bg-green-100 dark:bg-green-900/20';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-red-500" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'growth': return <Users className="w-5 h-5" />;
      case 'engagement': return <Heart className="w-5 h-5" />;
      case 'health': return <Shield className="w-5 h-5" />;
      case 'safety': return <AlertTriangle className="w-5 h-5" />;
      case 'diversity': return <Users2 className="w-5 h-5" />;
      default: return <BarChart3 className="w-5 h-5" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Loading dashboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <span className="text-red-700 dark:text-red-300">Error: {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Social Analytics Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {universityId ? `University: ${universityId}` : 'Platform Overview'}
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Time Range Selector */}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as '7d' | '30d' | '90d')}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>

          {/* Refresh Button */}
          <button
            onClick={loadDashboardData}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>

          {/* Export Button */}
          <button className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Users</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.totalUsers.toLocaleString()}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
            <div className="mt-2 flex items-center space-x-1">
              {getTrendIcon('up')}
              <span className="text-sm text-green-600 dark:text-green-400">+12.5%</span>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Users</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.activeUsers.toLocaleString()}</p>
              </div>
              <Activity className="w-8 h-8 text-green-500" />
            </div>
            <div className="mt-2 flex items-center space-x-1">
              {getTrendIcon('up')}
              <span className="text-sm text-green-600 dark:text-green-400">+8.3%</span>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">New Connections</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.newConnections.toLocaleString()}</p>
              </div>
              <Users2 className="w-8 h-8 text-purple-500" />
            </div>
            <div className="mt-2 flex items-center space-x-1">
              {getTrendIcon('up')}
              <span className="text-sm text-green-600 dark:text-green-400">+15.2%</span>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Engagement Rate</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{(metrics.engagementRate * 100).toFixed(1)}%</p>
              </div>
              <Heart className="w-8 h-8 text-red-500" />
            </div>
            <div className="mt-2 flex items-center space-x-1">
              {getTrendIcon('up')}
              <span className="text-sm text-green-600 dark:text-green-400">+5.7%</span>
            </div>
          </div>
        </div>
      )}

      {/* Health Score Cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Community Health</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.communityHealth.toFixed(1)}</p>
              </div>
              <Shield className="w-8 h-8 text-green-500" />
            </div>
            <div className="mt-2">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full" 
                  style={{ width: `${metrics.communityHealth}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Safety Score</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.safetyScore.toFixed(1)}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
            </div>
            <div className="mt-2">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-yellow-500 h-2 rounded-full" 
                  style={{ width: `${metrics.safetyScore}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Diversity Index</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.diversityIndex.toFixed(1)}</p>
              </div>
              <PieChart className="w-8 h-8 text-blue-500" />
            </div>
            <div className="mt-2">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full" 
                  style={{ width: `${metrics.diversityIndex}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Growth Trend Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Network Growth Trend</h3>
          {trendData && (
            <Line
              data={trendData}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'top' as const,
                  },
                  title: {
                    display: false,
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                  },
                },
              }}
            />
          )}
        </div>

        {/* Engagement Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Engagement Distribution</h3>
          <Doughnut
            data={{
              labels: ['High', 'Medium', 'Low'],
              datasets: [
                {
                  data: [45, 35, 20],
                  backgroundColor: ['#10B981', '#F59E0B', '#EF4444'],
                  borderWidth: 0,
                },
              ],
            }}
            options={{
              responsive: true,
              plugins: {
                legend: {
                  position: 'bottom' as const,
                },
              },
            }}
          />
        </div>
      </div>

      {/* Insights Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Key Insights</h3>
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            >
              <option value="all">All Insights</option>
              <option value="growth">Growth</option>
              <option value="engagement">Engagement</option>
              <option value="health">Health</option>
              <option value="safety">Safety</option>
              <option value="diversity">Diversity</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {insights
            .filter(insight => selectedMetric === 'all' || insight.type === selectedMetric)
            .map((insight) => (
              <div
                key={insight.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    {getTypeIcon(insight.type)}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(insight.severity)}`}>
                      {insight.severity}
                    </span>
                  </div>
                  {getTrendIcon(insight.trend)}
                </div>

                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">{insight.title}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{insight.description}</p>

                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    {insight.value.toLocaleString()}
                  </span>
                  <span className={`text-sm font-medium ${
                    insight.change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {insight.change >= 0 ? '+' : ''}{insight.change.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Recommendations Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Actionable Recommendations</h3>
        <div className="space-y-4">
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-semibold text-gray-900 dark:text-white">Improve Network Growth</h4>
              <span className="px-2 py-1 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full text-xs font-medium">
                High Priority
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Network growth rate is below optimal levels. Consider implementing gamification features and improving the recommendation algorithm.
            </p>
            <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
              <span>Impact: High</span>
              <span>Effort: Medium</span>
              <span>Timeline: 2-4 weeks</span>
            </div>
          </div>

          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-semibold text-gray-900 dark:text-white">Boost Social Engagement</h4>
              <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-full text-xs font-medium">
                Medium Priority
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Social interaction frequency is low. Add push notifications for social activities and create community challenges.
            </p>
            <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
              <span>Impact: High</span>
              <span>Effort: Medium</span>
              <span>Timeline: 3-6 weeks</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SocialDashboard;
