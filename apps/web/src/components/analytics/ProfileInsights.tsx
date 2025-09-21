import React, { useState, useEffect, useCallback } from 'react';
import './ProfileInsights.css';

export interface ProfileInsight {
  id: string;
  userId: string;
  insightType: 'completion' | 'engagement' | 'privacy' | 'network' | 'optimization';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  impact: number;
  actionable: boolean;
  category: string;
  data: Record<string, any>;
  recommendations: string[];
  metrics: {
    current: number;
    target: number;
    trend: 'up' | 'down' | 'stable';
    change: number;
  };
  createdAt: Date;
  expiresAt?: Date;
  dismissed: boolean;
  implemented: boolean;
}

export interface ProfileRecommendation {
  id: string;
  userId: string;
  type: 'profile_optimization' | 'privacy_improvement' | 'network_expansion' | 'content_strategy';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  impact: number;
  effort: 'low' | 'medium' | 'high';
  category: string;
  steps: {
    id: string;
    title: string;
    description: string;
    completed: boolean;
    estimatedTime: number;
  }[];
  expectedOutcome: string;
  metrics: {
    baseline: number;
    target: number;
    timeframe: string;
  };
  createdAt: Date;
  expiresAt?: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
}

export interface ProfileInsightsProps {
  userId: string;
  insights: ProfileInsight[];
  recommendations: ProfileRecommendation[];
  onDismissInsight: (insightId: string) => void;
  onImplementInsight: (insightId: string) => void;
  onStartRecommendation: (recommendationId: string) => void;
  onCompleteStep: (recommendationId: string, stepId: string) => void;
  className?: string;
}

const ProfileInsights: React.FC<ProfileInsightsProps> = ({
  userId,
  insights,
  recommendations,
  onDismissInsight,
  onImplementInsight,
  onStartRecommendation,
  onCompleteStep,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'insights' | 'recommendations'>('insights');
  const [selectedInsight, setSelectedInsight] = useState<ProfileInsight | null>(null);
  const [selectedRecommendation, setSelectedRecommendation] = useState<ProfileRecommendation | null>(null);
  const [filterPriority, setFilterPriority] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Filter insights based on priority and category
  const filteredInsights = insights.filter(insight => {
    const priorityMatch = filterPriority === 'all' || insight.priority === filterPriority;
    const categoryMatch = filterCategory === 'all' || insight.category === filterCategory;
    return priorityMatch && categoryMatch && !insight.dismissed;
  });

  // Filter recommendations based on priority and category
  const filteredRecommendations = recommendations.filter(rec => {
    const priorityMatch = filterPriority === 'all' || rec.priority === filterPriority;
    const categoryMatch = filterCategory === 'all' || rec.category === filterCategory;
    return priorityMatch && categoryMatch && rec.status !== 'dismissed';
  });

  // Get unique categories
  const categories = Array.from(new Set([
    ...insights.map(i => i.category),
    ...recommendations.map(r => r.category)
  ]));

  // Handle tab change
  const handleTabChange = useCallback((tab: 'insights' | 'recommendations') => {
    setActiveTab(tab);
    setSelectedInsight(null);
    setSelectedRecommendation(null);
  }, []);

  // Handle insight selection
  const handleInsightSelect = useCallback((insight: ProfileInsight) => {
    setSelectedInsight(insight);
    setSelectedRecommendation(null);
  }, []);

  // Handle recommendation selection
  const handleRecommendationSelect = useCallback((recommendation: ProfileRecommendation) => {
    setSelectedRecommendation(recommendation);
    setSelectedInsight(null);
  }, []);

  // Handle insight dismiss
  const handleInsightDismiss = useCallback((insightId: string) => {
    onDismissInsight(insightId);
    setSelectedInsight(null);
  }, [onDismissInsight]);

  // Handle insight implement
  const handleInsightImplement = useCallback((insightId: string) => {
    onImplementInsight(insightId);
    setSelectedInsight(null);
  }, [onImplementInsight]);

  // Handle recommendation start
  const handleRecommendationStart = useCallback((recommendationId: string) => {
    onStartRecommendation(recommendationId);
  }, [onStartRecommendation]);

  // Handle step completion
  const handleStepComplete = useCallback((recommendationId: string, stepId: string) => {
    onCompleteStep(recommendationId, stepId);
  }, [onCompleteStep]);

  // Get priority color
  const getPriorityColor = useCallback((priority: string): string => {
    switch (priority) {
      case 'high': return 'priority--high';
      case 'medium': return 'priority--medium';
      case 'low': return 'priority--low';
      default: return '';
    }
  }, []);

  // Get priority icon
  const getPriorityIcon = useCallback((priority: string): string => {
    switch (priority) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  }, []);

  // Get insight type icon
  const getInsightTypeIcon = useCallback((type: string): string => {
    switch (type) {
      case 'completion': return '📊';
      case 'engagement': return '👥';
      case 'privacy': return '🔒';
      case 'network': return '🌐';
      case 'optimization': return '⚡';
      default: return '📈';
    }
  }, []);

  // Get trend icon
  const getTrendIcon = useCallback((trend: string): string => {
    switch (trend) {
      case 'up': return '📈';
      case 'down': return '📉';
      case 'stable': return '➡️';
      default: return '➡️';
    }
  }, []);

  // Get effort color
  const getEffortColor = useCallback((effort: string): string => {
    switch (effort) {
      case 'low': return 'effort--low';
      case 'medium': return 'effort--medium';
      case 'high': return 'effort--high';
      default: return '';
    }
  }, []);

  return (
    <div className={`profile-insights ${className}`}>
      {/* Header */}
      <div className="profile-insights__header">
        <h2 className="profile-insights__title">Profile Insights & Recommendations</h2>
        <div className="profile-insights__stats">
          <div className="profile-insights__stat">
            <span className="profile-insights__stat-value">{insights.length}</span>
            <span className="profile-insights__stat-label">Insights</span>
          </div>
          <div className="profile-insights__stat">
            <span className="profile-insights__stat-value">{recommendations.length}</span>
            <span className="profile-insights__stat-label">Recommendations</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="profile-insights__tabs">
        <button
          className={`profile-insights__tab ${activeTab === 'insights' ? 'profile-insights__tab--active' : ''}`}
          onClick={() => handleTabChange('insights')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 3v18h18" />
            <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
          </svg>
          Insights ({filteredInsights.length})
        </button>
        <button
          className={`profile-insights__tab ${activeTab === 'recommendations' ? 'profile-insights__tab--active' : ''}`}
          onClick={() => handleTabChange('recommendations')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 11H5a2 2 0 0 0-2 2v3c0 1.1.9 2 2 2h4m0-7v7m0-7h10a2 2 0 0 1 2 2v3c0 1.1-.9 2-2 2H9m0-7V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
          </svg>
          Recommendations ({filteredRecommendations.length})
        </button>
      </div>

      {/* Filters */}
      <div className="profile-insights__filters">
        <div className="profile-insights__filter">
          <label className="profile-insights__filter-label">Priority:</label>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value as any)}
            className="profile-insights__filter-select"
          >
            <option value="all">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>
        </div>
        <div className="profile-insights__filter">
          <label className="profile-insights__filter-label">Category:</label>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="profile-insights__filter-select"
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>
                {category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="profile-insights__content">
        {activeTab === 'insights' && (
          <div className="profile-insights__insights">
            {filteredInsights.length === 0 ? (
              <div className="profile-insights__empty">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 3v18h18" />
                  <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
                </svg>
                <h3>No insights found</h3>
                <p>Try adjusting your filters or check back later for new insights.</p>
              </div>
            ) : (
              <div className="profile-insights__insights-grid">
                {filteredInsights.map(insight => (
                  <div
                    key={insight.id}
                    className={`profile-insights__insight ${getPriorityColor(insight.priority)}`}
                    onClick={() => handleInsightSelect(insight)}
                  >
                    <div className="profile-insights__insight-header">
                      <div className="profile-insights__insight-icon">
                        {getInsightTypeIcon(insight.insightType)}
                      </div>
                      <div className="profile-insights__insight-priority">
                        {getPriorityIcon(insight.priority)}
                      </div>
                    </div>
                    <div className="profile-insights__insight-content">
                      <h4 className="profile-insights__insight-title">{insight.title}</h4>
                      <p className="profile-insights__insight-description">{insight.description}</p>
                      <div className="profile-insights__insight-metrics">
                        <div className="profile-insights__insight-metric">
                          <span className="profile-insights__insight-metric-label">Impact:</span>
                          <span className="profile-insights__insight-metric-value">{insight.impact}%</span>
                        </div>
                        <div className="profile-insights__insight-metric">
                          <span className="profile-insights__insight-metric-label">Current:</span>
                          <span className="profile-insights__insight-metric-value">
                            {insight.metrics.current}
                            <span className="profile-insights__insight-trend">
                              {getTrendIcon(insight.metrics.trend)}
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="profile-insights__insight-actions">
                      {insight.actionable && (
                        <button
                          className="profile-insights__insight-action profile-insights__insight-action--primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInsightImplement(insight.id);
                          }}
                        >
                          Implement
                        </button>
                      )}
                      <button
                        className="profile-insights__insight-action profile-insights__insight-action--secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInsightDismiss(insight.id);
                        }}
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'recommendations' && (
          <div className="profile-insights__recommendations">
            {filteredRecommendations.length === 0 ? (
              <div className="profile-insights__empty">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 11H5a2 2 0 0 0-2 2v3c0 1.1.9 2 2 2h4m0-7v7m0-7h10a2 2 0 0 1 2 2v3c0 1.1-.9 2-2 2H9m0-7V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                </svg>
                <h3>No recommendations found</h3>
                <p>Try adjusting your filters or check back later for new recommendations.</p>
              </div>
            ) : (
              <div className="profile-insights__recommendations-grid">
                {filteredRecommendations.map(recommendation => (
                  <div
                    key={recommendation.id}
                    className={`profile-insights__recommendation ${getPriorityColor(recommendation.priority)}`}
                    onClick={() => handleRecommendationSelect(recommendation)}
                  >
                    <div className="profile-insights__recommendation-header">
                      <div className="profile-insights__recommendation-priority">
                        {getPriorityIcon(recommendation.priority)}
                      </div>
                      <div className={`profile-insights__recommendation-effort ${getEffortColor(recommendation.effort)}`}>
                        {recommendation.effort}
                      </div>
                    </div>
                    <div className="profile-insights__recommendation-content">
                      <h4 className="profile-insights__recommendation-title">{recommendation.title}</h4>
                      <p className="profile-insights__recommendation-description">{recommendation.description}</p>
                      <div className="profile-insights__recommendation-metrics">
                        <div className="profile-insights__recommendation-metric">
                          <span className="profile-insights__recommendation-metric-label">Impact:</span>
                          <span className="profile-insights__recommendation-metric-value">{recommendation.impact}%</span>
                        </div>
                        <div className="profile-insights__recommendation-metric">
                          <span className="profile-insights__recommendation-metric-label">Steps:</span>
                          <span className="profile-insights__recommendation-metric-value">
                            {recommendation.steps.filter(s => s.completed).length}/{recommendation.steps.length}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="profile-insights__recommendation-actions">
                      <button
                        className="profile-insights__recommendation-action profile-insights__recommendation-action--primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRecommendationStart(recommendation.id);
                        }}
                      >
                        Start
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {(selectedInsight || selectedRecommendation) && (
        <div className="profile-insights__modal">
          <div className="profile-insights__modal-content">
            <div className="profile-insights__modal-header">
              <h3 className="profile-insights__modal-title">
                {selectedInsight ? selectedInsight.title : selectedRecommendation?.title}
              </h3>
              <button
                className="profile-insights__modal-close"
                onClick={() => {
                  setSelectedInsight(null);
                  setSelectedRecommendation(null);
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="profile-insights__modal-body">
              {selectedInsight && (
                <div className="profile-insights__modal-insight">
                  <p className="profile-insights__modal-description">{selectedInsight.description}</p>
                  
                  <div className="profile-insights__modal-recommendations">
                    <h4>Recommendations:</h4>
                    <ul>
                      {selectedInsight.recommendations.map((rec, index) => (
                        <li key={index}>{rec}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="profile-insights__modal-metrics">
                    <h4>Metrics:</h4>
                    <div className="profile-insights__modal-metric">
                      <span>Current: {selectedInsight.metrics.current}</span>
                      <span>Target: {selectedInsight.metrics.target}</span>
                      <span>Trend: {getTrendIcon(selectedInsight.metrics.trend)}</span>
                    </div>
                  </div>
                </div>
              )}

              {selectedRecommendation && (
                <div className="profile-insights__modal-recommendation">
                  <p className="profile-insights__modal-description">{selectedRecommendation.description}</p>
                  
                  <div className="profile-insights__modal-steps">
                    <h4>Steps:</h4>
                    <div className="profile-insights__modal-steps-list">
                      {selectedRecommendation.steps.map(step => (
                        <div key={step.id} className="profile-insights__modal-step">
                          <div className="profile-insights__modal-step-header">
                            <input
                              type="checkbox"
                              checked={step.completed}
                              onChange={() => handleStepComplete(selectedRecommendation.id, step.id)}
                            />
                            <h5>{step.title}</h5>
                            <span className="profile-insights__modal-step-time">{step.estimatedTime}min</span>
                          </div>
                          <p>{step.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="profile-insights__modal-outcome">
                    <h4>Expected Outcome:</h4>
                    <p>{selectedRecommendation.expectedOutcome}</p>
                  </div>
                </div>
              )}
            </div>
            <div className="profile-insights__modal-footer">
              {selectedInsight && (
                <div className="profile-insights__modal-actions">
                  {selectedInsight.actionable && (
                    <button
                      className="profile-insights__modal-action profile-insights__modal-action--primary"
                      onClick={() => handleInsightImplement(selectedInsight.id)}
                    >
                      Implement
                    </button>
                  )}
                  <button
                    className="profile-insights__modal-action profile-insights__modal-action--secondary"
                    onClick={() => handleInsightDismiss(selectedInsight.id)}
                  >
                    Dismiss
                  </button>
                </div>
              )}
              {selectedRecommendation && (
                <div className="profile-insights__modal-actions">
                  <button
                    className="profile-insights__modal-action profile-insights__modal-action--primary"
                    onClick={() => handleRecommendationStart(selectedRecommendation.id)}
                  >
                    Start Recommendation
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileInsights;
