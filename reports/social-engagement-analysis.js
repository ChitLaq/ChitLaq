// Social Engagement Analysis Report
// Author: ChitLaq Development Team
// Date: 2024-01-15

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

class SocialEngagementAnalyzer {
  constructor() {
    this.reportData = {
      generatedAt: new Date().toISOString(),
      timeRange: '30 days',
      summary: {},
      metrics: {},
      insights: [],
      recommendations: [],
      charts: {}
    };
  }

  async generateReport(universityId = null) {
    console.log('🔍 Starting social engagement analysis...');
    
    try {
      await this.analyzeUserEngagement(universityId);
      await this.analyzeContentEngagement(universityId);
      await this.analyzeSocialInteractions(universityId);
      await this.analyzeCommunityHealth(universityId);
      await this.analyzeTrends(universityId);
      await this.generateInsights(universityId);
      await this.generateRecommendations(universityId);
      
      const reportPath = await this.saveReport(universityId);
      console.log(`✅ Report generated successfully: ${reportPath}`);
      
      return this.reportData;
    } catch (error) {
      console.error('❌ Error generating report:', error);
      throw error;
    }
  }

  async analyzeUserEngagement(universityId) {
    console.log('📊 Analyzing user engagement...');
    
    const timeFilter = universityId 
      ? `AND up.university_id = '${universityId}'`
      : '';

    // Get user activity statistics
    const { data: userStats, error: userError } = await supabase.rpc('get_user_segmentation_metrics', {
      time_filter: "timestamp >= NOW() - INTERVAL '30 days'",
      university_filter: universityId ? `university_id = '${universityId}'` : '1=1'
    });

    if (userError) throw userError;

    // Get daily active users
    const { data: dauData, error: dauError } = await supabase
      .from('analytics.social_activity_events')
      .select('user_id, timestamp')
      .gte('timestamp', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (dauError) throw dauError;

    // Calculate DAU, WAU, MAU
    const uniqueUsers = new Set(dauData.map(event => event.user_id));
    const dailyActiveUsers = this.calculateDailyActiveUsers(dauData);
    const weeklyActiveUsers = this.calculateWeeklyActiveUsers(dauData);
    const monthlyActiveUsers = uniqueUsers.size;

    this.reportData.metrics.userEngagement = {
      totalUsers: userStats?.total_users || 0,
      activeUsers: userStats?.active_users || 0,
      passiveUsers: userStats?.passive_users || 0,
      newUsers: userStats?.new_users || 0,
      returningUsers: userStats?.returning_users || 0,
      powerUsers: userStats?.power_users || 0,
      atRiskUsers: userStats?.at_risk_users || 0,
      dailyActiveUsers,
      weeklyActiveUsers,
      monthlyActiveUsers,
      engagementRate: monthlyActiveUsers > 0 ? (dailyActiveUsers / monthlyActiveUsers) * 100 : 0,
      retentionRate: userStats?.new_users > 0 ? (userStats.returning_users / userStats.new_users) * 100 : 0
    };
  }

  async analyzeContentEngagement(universityId) {
    console.log('📝 Analyzing content engagement...');
    
    const timeFilter = universityId 
      ? `AND up.university_id = '${universityId}'`
      : '';

    // Get posts and interactions
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select(`
        id, content, created_at, user_id,
        user_profiles!inner(university_id),
        post_interactions(id, interaction_type, created_at)
      `)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .eq(universityId ? 'user_profiles.university_id' : 'id', universityId || '');

    if (postsError) throw postsError;

    // Calculate content metrics
    const totalPosts = posts.length;
    const totalInteractions = posts.reduce((sum, post) => sum + post.post_interactions.length, 0);
    const avgInteractionsPerPost = totalPosts > 0 ? totalInteractions / totalPosts : 0;
    
    // Interaction type breakdown
    const interactionTypes = {};
    posts.forEach(post => {
      post.post_interactions.forEach(interaction => {
        interactionTypes[interaction.interaction_type] = 
          (interactionTypes[interaction.interaction_type] || 0) + 1;
      });
    });

    // Content creation rate
    const contentCreationRate = totalPosts / 30; // Posts per day

    this.reportData.metrics.contentEngagement = {
      totalPosts,
      totalInteractions,
      avgInteractionsPerPost,
      interactionTypes,
      contentCreationRate,
      postsPerUser: this.reportData.metrics.userEngagement?.monthlyActiveUsers > 0 
        ? totalPosts / this.reportData.metrics.userEngagement.monthlyActiveUsers 
        : 0
    };
  }

  async analyzeSocialInteractions(universityId) {
    console.log('🤝 Analyzing social interactions...');
    
    // Get social relationships
    const { data: relationships, error: relError } = await supabase
      .from('social_relationships')
      .select(`
        source_user_id, target_user_id, relationship_type, created_at,
        source_user:user_profiles!source_user_id(university_id),
        target_user:user_profiles!target_user_id(university_id)
      `)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (relError) throw relError;

    // Filter by university if specified
    const filteredRelationships = universityId 
      ? relationships.filter(rel => 
          rel.source_user?.university_id === universityId || 
          rel.target_user?.university_id === universityId
        )
      : relationships;

    // Calculate social metrics
    const follows = filteredRelationships.filter(rel => rel.relationship_type === 'follows');
    const unfollows = filteredRelationships.filter(rel => rel.relationship_type === 'unfollows');
    const blocks = filteredRelationships.filter(rel => rel.relationship_type === 'blocks');

    const netGrowth = follows.length - unfollows.length;
    const followUnfollowRatio = unfollows.length > 0 ? follows.length / unfollows.length : follows.length;

    // Network density calculation
    const uniqueUsers = new Set([
      ...filteredRelationships.map(rel => rel.source_user_id),
      ...filteredRelationships.map(rel => rel.target_user_id)
    ]);
    const totalPossibleConnections = uniqueUsers.size * (uniqueUsers.size - 1);
    const actualConnections = follows.length;
    const networkDensity = totalPossibleConnections > 0 ? actualConnections / totalPossibleConnections : 0;

    this.reportData.metrics.socialInteractions = {
      totalRelationships: filteredRelationships.length,
      follows: follows.length,
      unfollows: unfollows.length,
      blocks: blocks.length,
      netGrowth,
      followUnfollowRatio,
      networkDensity,
      averageConnectionsPerUser: uniqueUsers.size > 0 ? actualConnections / uniqueUsers.size : 0
    };
  }

  async analyzeCommunityHealth(universityId) {
    console.log('🏥 Analyzing community health...');
    
    // Get user reports and flags
    const { data: reports, error: reportsError } = await supabase
      .from('analytics.user_reports')
      .select('*')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .eq(universityId ? 'university_id' : 'id', universityId || '');

    if (reportsError) throw reportsError;

    const { data: flags, error: flagsError } = await supabase
      .from('analytics.user_flags')
      .select('*')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (flagsError) throw flagsError;

    // Calculate safety metrics
    const totalReports = reports.length;
    const resolvedReports = reports.filter(r => r.status === 'resolved').length;
    const resolutionRate = totalReports > 0 ? (resolvedReports / totalReports) * 100 : 100;

    const spamFlags = flags.filter(f => f.flag_type === 'spam').length;
    const botFlags = flags.filter(f => f.flag_type === 'bot').length;
    const totalFlags = flags.length;

    const totalUsers = this.reportData.metrics.userEngagement?.totalUsers || 1;
    const spamRate = (spamFlags / totalUsers) * 100;
    const abuseRate = (totalReports / totalUsers) * 100;

    // Community sentiment analysis (simplified)
    const sentimentScore = this.calculateSentimentScore();

    this.reportData.metrics.communityHealth = {
      totalReports,
      resolvedReports,
      resolutionRate,
      totalFlags,
      spamFlags,
      botFlags,
      spamRate,
      abuseRate,
      sentimentScore,
      safetyScore: Math.max(0, 100 - (spamRate + abuseRate)),
      moderationEfficiency: resolutionRate
    };
  }

  async analyzeTrends(universityId) {
    console.log('📈 Analyzing trends...');
    
    // Get daily activity data
    const { data: dailyActivity, error: dailyError } = await supabase
      .from('analytics.daily_social_activity')
      .select('*')
      .gte('activity_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .eq(universityId ? 'university_id' : 'id', universityId || '')
      .order('activity_date', { ascending: true });

    if (dailyError) throw dailyError;

    // Calculate trends
    const trends = this.calculateTrends(dailyActivity);
    
    this.reportData.metrics.trends = trends;
  }

  async generateInsights(universityId) {
    console.log('💡 Generating insights...');
    
    const insights = [];
    const metrics = this.reportData.metrics;

    // Engagement insights
    if (metrics.userEngagement?.engagementRate < 20) {
      insights.push({
        type: 'engagement',
        severity: 'high',
        title: 'Low Daily Engagement Rate',
        description: `Daily engagement rate is ${metrics.userEngagement.engagementRate.toFixed(1)}%, which is below the recommended 20%`,
        recommendation: 'Implement push notifications and improve content discovery algorithms'
      });
    }

    // Content insights
    if (metrics.contentEngagement?.avgInteractionsPerPost < 5) {
      insights.push({
        type: 'content',
        severity: 'medium',
        title: 'Low Content Interaction Rate',
        description: `Average interactions per post is ${metrics.contentEngagement.avgInteractionsPerPost.toFixed(1)}`,
        recommendation: 'Improve content quality and implement better recommendation systems'
      });
    }

    // Social insights
    if (metrics.socialInteractions?.followUnfollowRatio < 2) {
      insights.push({
        type: 'social',
        severity: 'medium',
        title: 'High Unfollow Rate',
        description: `Follow/unfollow ratio is ${metrics.socialInteractions.followUnfollowRatio.toFixed(1)}`,
        recommendation: 'Investigate user satisfaction and improve connection quality'
      });
    }

    // Health insights
    if (metrics.communityHealth?.safetyScore < 80) {
      insights.push({
        type: 'safety',
        severity: 'high',
        title: 'Community Safety Concerns',
        description: `Safety score is ${metrics.communityHealth.safetyScore.toFixed(1)}/100`,
        recommendation: 'Strengthen moderation tools and user reporting mechanisms'
      });
    }

    this.reportData.insights = insights;
  }

  async generateRecommendations(universityId) {
    console.log('🎯 Generating recommendations...');
    
    const recommendations = [];
    const metrics = this.reportData.metrics;

    // Growth recommendations
    if (metrics.socialInteractions?.netGrowth < 100) {
      recommendations.push({
        priority: 'high',
        category: 'growth',
        title: 'Improve User Acquisition',
        description: 'Network growth is below optimal levels',
        actions: [
          'Implement referral program',
          'Improve onboarding experience',
          'Add gamification elements',
          'Optimize recommendation algorithm'
        ],
        expectedImpact: 'Increase user acquisition by 25-30%'
      });
    }

    // Engagement recommendations
    if (metrics.userEngagement?.engagementRate < 30) {
      recommendations.push({
        priority: 'high',
        category: 'engagement',
        title: 'Boost User Engagement',
        description: 'User engagement levels need improvement',
        actions: [
          'Implement push notifications',
          'Create community challenges',
          'Add trending topics feature',
          'Improve content discovery'
        ],
        expectedImpact: 'Increase engagement rate by 40-50%'
      });
    }

    // Content recommendations
    if (metrics.contentEngagement?.contentCreationRate < 10) {
      recommendations.push({
        priority: 'medium',
        category: 'content',
        title: 'Increase Content Creation',
        description: 'Content creation rate is low',
        actions: [
          'Add content creation incentives',
          'Implement content templates',
          'Create content creation challenges',
          'Improve content creation tools'
        ],
        expectedImpact: 'Increase content creation by 60-80%'
      });
    }

    this.reportData.recommendations = recommendations;
  }

  calculateDailyActiveUsers(activityData) {
    const dailyUsers = new Map();
    
    activityData.forEach(event => {
      const date = event.timestamp.split('T')[0];
      if (!dailyUsers.has(date)) {
        dailyUsers.set(date, new Set());
      }
      dailyUsers.get(date).add(event.user_id);
    });

    const dailyCounts = Array.from(dailyUsers.values()).map(users => users.size);
    return dailyCounts.length > 0 ? dailyCounts.reduce((a, b) => a + b, 0) / dailyCounts.length : 0;
  }

  calculateWeeklyActiveUsers(activityData) {
    const weeklyUsers = new Map();
    
    activityData.forEach(event => {
      const week = this.getWeekStart(new Date(event.timestamp));
      if (!weeklyUsers.has(week)) {
        weeklyUsers.set(week, new Set());
      }
      weeklyUsers.get(week).add(event.user_id);
    });

    const weeklyCounts = Array.from(weeklyUsers.values()).map(users => users.size);
    return weeklyCounts.length > 0 ? weeklyCounts.reduce((a, b) => a + b, 0) / weeklyCounts.length : 0;
  }

  getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff)).toISOString().split('T')[0];
  }

  calculateSentimentScore() {
    // Simplified sentiment calculation
    // In production, this would use a proper NLP service
    return 75; // Placeholder value
  }

  calculateTrends(dailyActivity) {
    if (dailyActivity.length < 2) return {};

    const activityByDate = {};
    dailyActivity.forEach(activity => {
      if (!activityByDate[activity.activity_date]) {
        activityByDate[activity.activity_date] = 0;
      }
      activityByDate[activity.activity_date] += activity.activity_count;
    });

    const dates = Object.keys(activityByDate).sort();
    const values = dates.map(date => activityByDate[date]);

    // Calculate trend direction
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    const trend = secondAvg > firstAvg ? 'increasing' : 'decreasing';
    const changePercent = ((secondAvg - firstAvg) / firstAvg) * 100;

    return {
      direction: trend,
      changePercent: changePercent,
      firstHalfAverage: firstAvg,
      secondHalfAverage: secondAvg,
      totalActivities: values.reduce((a, b) => a + b, 0)
    };
  }

  async saveReport(universityId) {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `social-engagement-analysis-${universityId || 'global'}-${timestamp}.json`;
    const filepath = path.join(__dirname, filename);

    // Create summary
    this.reportData.summary = {
      totalUsers: this.reportData.metrics.userEngagement?.totalUsers || 0,
      activeUsers: this.reportData.metrics.userEngagement?.monthlyActiveUsers || 0,
      engagementRate: this.reportData.metrics.userEngagement?.engagementRate || 0,
      safetyScore: this.reportData.metrics.communityHealth?.safetyScore || 0,
      networkGrowth: this.reportData.metrics.socialInteractions?.netGrowth || 0,
      totalInsights: this.reportData.insights.length,
      totalRecommendations: this.reportData.recommendations.length
    };

    await fs.promises.writeFile(filepath, JSON.stringify(this.reportData, null, 2));
    return filepath;
  }
}

// Main execution
async function main() {
  const analyzer = new SocialEngagementAnalyzer();
  
  // Get university ID from command line argument
  const universityId = process.argv[2] || null;
  
  try {
    const report = await analyzer.generateReport(universityId);
    
    console.log('\n📊 Social Engagement Analysis Report');
    console.log('=====================================');
    console.log(`Generated: ${report.generatedAt}`);
    console.log(`Time Range: ${report.timeRange}`);
    console.log(`University: ${universityId || 'All Universities'}`);
    console.log('\n📈 Summary:');
    console.log(`Total Users: ${report.summary.totalUsers.toLocaleString()}`);
    console.log(`Active Users: ${report.summary.activeUsers.toLocaleString()}`);
    console.log(`Engagement Rate: ${report.summary.engagementRate.toFixed(1)}%`);
    console.log(`Safety Score: ${report.summary.safetyScore.toFixed(1)}/100`);
    console.log(`Network Growth: ${report.summary.networkGrowth}`);
    console.log(`Insights: ${report.summary.totalInsights}`);
    console.log(`Recommendations: ${report.summary.totalRecommendations}`);
    
    if (report.insights.length > 0) {
      console.log('\n💡 Key Insights:');
      report.insights.forEach((insight, index) => {
        console.log(`${index + 1}. ${insight.title} (${insight.severity})`);
        console.log(`   ${insight.description}`);
      });
    }
    
    if (report.recommendations.length > 0) {
      console.log('\n🎯 Top Recommendations:');
      report.recommendations.slice(0, 3).forEach((rec, index) => {
        console.log(`${index + 1}. ${rec.title} (${rec.priority} priority)`);
        console.log(`   ${rec.description}`);
      });
    }
    
  } catch (error) {
    console.error('Failed to generate report:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = SocialEngagementAnalyzer;
