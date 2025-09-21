-- Profile Analytics Database Views and Functions
-- This file contains SQL views and functions for profile analytics and metrics

-- =============================================
-- ANALYTICS EVENTS TABLE
-- =============================================

-- Create analytics_events table if it doesn't exist
CREATE TABLE IF NOT EXISTS analytics_events (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    session_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    data JSONB NOT NULL DEFAULT '{}',
    metadata JSONB NOT NULL DEFAULT '{}',
    privacy JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for analytics_events
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_timestamp ON analytics_events(user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type_timestamp ON analytics_events(event_type, timestamp);

-- Create GIN index for JSONB data
CREATE INDEX IF NOT EXISTS idx_analytics_events_data_gin ON analytics_events USING GIN(data);
CREATE INDEX IF NOT EXISTS idx_analytics_events_metadata_gin ON analytics_events USING GIN(metadata);
CREATE INDEX IF NOT EXISTS idx_analytics_events_privacy_gin ON analytics_events USING GIN(privacy);

-- =============================================
-- PROFILE INSIGHTS TABLE
-- =============================================

-- Create profile_insights table
CREATE TABLE IF NOT EXISTS profile_insights (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    insight_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
    impact INTEGER NOT NULL CHECK (impact >= 0 AND impact <= 100),
    actionable BOOLEAN NOT NULL DEFAULT false,
    category VARCHAR(100) NOT NULL,
    data JSONB NOT NULL DEFAULT '{}',
    recommendations TEXT[],
    metrics JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    dismissed BOOLEAN NOT NULL DEFAULT false,
    implemented BOOLEAN NOT NULL DEFAULT false,
    dismissed_at TIMESTAMP WITH TIME ZONE,
    implemented_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for profile_insights
CREATE INDEX IF NOT EXISTS idx_profile_insights_user_id ON profile_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_insights_insight_type ON profile_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_profile_insights_priority ON profile_insights(priority);
CREATE INDEX IF NOT EXISTS idx_profile_insights_category ON profile_insights(category);
CREATE INDEX IF NOT EXISTS idx_profile_insights_created_at ON profile_insights(created_at);
CREATE INDEX IF NOT EXISTS idx_profile_insights_dismissed ON profile_insights(dismissed);
CREATE INDEX IF NOT EXISTS idx_profile_insights_implemented ON profile_insights(implemented);
CREATE INDEX IF NOT EXISTS idx_profile_insights_user_dismissed ON profile_insights(user_id, dismissed);
CREATE INDEX IF NOT EXISTS idx_profile_insights_user_implemented ON profile_insights(user_id, implemented);

-- =============================================
-- PROFILE RECOMMENDATIONS TABLE
-- =============================================

-- Create profile_recommendations table
CREATE TABLE IF NOT EXISTS profile_recommendations (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
    impact INTEGER NOT NULL CHECK (impact >= 0 AND impact <= 100),
    effort VARCHAR(20) NOT NULL CHECK (effort IN ('low', 'medium', 'high')),
    category VARCHAR(100) NOT NULL,
    steps JSONB NOT NULL DEFAULT '[]',
    expected_outcome TEXT,
    metrics JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'dismissed')),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    dismissed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for profile_recommendations
CREATE INDEX IF NOT EXISTS idx_profile_recommendations_user_id ON profile_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_recommendations_type ON profile_recommendations(type);
CREATE INDEX IF NOT EXISTS idx_profile_recommendations_priority ON profile_recommendations(priority);
CREATE INDEX IF NOT EXISTS idx_profile_recommendations_category ON profile_recommendations(category);
CREATE INDEX IF NOT EXISTS idx_profile_recommendations_status ON profile_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_profile_recommendations_created_at ON profile_recommendations(created_at);
CREATE INDEX IF NOT EXISTS idx_profile_recommendations_user_status ON profile_recommendations(user_id, status);

-- =============================================
-- ANALYTICS CONSENT TABLE
-- =============================================

-- Create analytics_consent table
CREATE TABLE IF NOT EXISTS analytics_consent (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL UNIQUE,
    consent_given BOOLEAN NOT NULL DEFAULT false,
    purposes TEXT[] NOT NULL DEFAULT '{}',
    data_categories TEXT[] NOT NULL DEFAULT '{}',
    retention_period INTEGER NOT NULL DEFAULT 365,
    consent_version VARCHAR(50) NOT NULL,
    granted_at TIMESTAMP WITH TIME ZONE,
    revoked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for analytics_consent
CREATE INDEX IF NOT EXISTS idx_analytics_consent_user_id ON analytics_consent(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_consent_consent_given ON analytics_consent(consent_given);
CREATE INDEX IF NOT EXISTS idx_analytics_consent_granted_at ON analytics_consent(granted_at);
CREATE INDEX IF NOT EXISTS idx_analytics_consent_revoked_at ON analytics_consent(revoked_at);

-- =============================================
-- PROFILE METRICS VIEWS
-- =============================================

-- Daily profile metrics view
CREATE OR REPLACE VIEW profile_metrics_daily AS
SELECT 
    user_id,
    DATE(timestamp) as metric_date,
    COUNT(*) FILTER (WHERE event_type = 'profile_view') as profile_views,
    COUNT(DISTINCT data->>'viewerId') FILTER (WHERE event_type = 'profile_view') as unique_viewers,
    AVG((data->>'duration')::numeric) FILTER (WHERE event_type = 'profile_view') as avg_view_duration,
    COUNT(*) FILTER (WHERE event_type = 'profile_edit') as profile_edits,
    COUNT(DISTINCT jsonb_array_elements_text(data->'updatedFields')) FILTER (WHERE event_type = 'profile_edit') as fields_updated,
    COUNT(*) FILTER (WHERE event_type = 'avatar_upload') as avatar_uploads,
    COUNT(*) FILTER (WHERE event_type = 'avatar_upload' AND (data->>'success')::boolean = true) as successful_uploads,
    COUNT(*) FILTER (WHERE event_type = 'privacy_change') as privacy_changes,
    COUNT(*) FILTER (WHERE event_type = 'university_network_interaction') as network_interactions,
    COUNT(*) FILTER (WHERE event_type = 'profile_completion_milestone') as completion_milestones,
    COUNT(*) FILTER (WHERE event_type = 'recommendation_view') as recommendation_views,
    COUNT(*) FILTER (WHERE event_type = 'recommendation_implement') as recommendation_implementations,
    COUNT(*) FILTER (WHERE event_type = 'insight_dismiss') as insight_dismissals
FROM analytics_events
WHERE timestamp >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY user_id, DATE(timestamp)
ORDER BY user_id, metric_date DESC;

-- Weekly profile metrics view
CREATE OR REPLACE VIEW profile_metrics_weekly AS
SELECT 
    user_id,
    DATE_TRUNC('week', timestamp) as week_start,
    COUNT(*) FILTER (WHERE event_type = 'profile_view') as profile_views,
    COUNT(DISTINCT data->>'viewerId') FILTER (WHERE event_type = 'profile_view') as unique_viewers,
    AVG((data->>'duration')::numeric) FILTER (WHERE event_type = 'profile_view') as avg_view_duration,
    COUNT(*) FILTER (WHERE event_type = 'profile_edit') as profile_edits,
    COUNT(DISTINCT jsonb_array_elements_text(data->'updatedFields')) FILTER (WHERE event_type = 'profile_edit') as fields_updated,
    COUNT(*) FILTER (WHERE event_type = 'avatar_upload') as avatar_uploads,
    COUNT(*) FILTER (WHERE event_type = 'avatar_upload' AND (data->>'success')::boolean = true) as successful_uploads,
    COUNT(*) FILTER (WHERE event_type = 'privacy_change') as privacy_changes,
    COUNT(*) FILTER (WHERE event_type = 'university_network_interaction') as network_interactions,
    COUNT(*) FILTER (WHERE event_type = 'profile_completion_milestone') as completion_milestones,
    COUNT(*) FILTER (WHERE event_type = 'recommendation_view') as recommendation_views,
    COUNT(*) FILTER (WHERE event_type = 'recommendation_implement') as recommendation_implementations,
    COUNT(*) FILTER (WHERE event_type = 'insight_dismiss') as insight_dismissals
FROM analytics_events
WHERE timestamp >= CURRENT_DATE - INTERVAL '12 weeks'
GROUP BY user_id, DATE_TRUNC('week', timestamp)
ORDER BY user_id, week_start DESC;

-- Monthly profile metrics view
CREATE OR REPLACE VIEW profile_metrics_monthly AS
SELECT 
    user_id,
    DATE_TRUNC('month', timestamp) as month_start,
    COUNT(*) FILTER (WHERE event_type = 'profile_view') as profile_views,
    COUNT(DISTINCT data->>'viewerId') FILTER (WHERE event_type = 'profile_view') as unique_viewers,
    AVG((data->>'duration')::numeric) FILTER (WHERE event_type = 'profile_view') as avg_view_duration,
    COUNT(*) FILTER (WHERE event_type = 'profile_edit') as profile_edits,
    COUNT(DISTINCT jsonb_array_elements_text(data->'updatedFields')) FILTER (WHERE event_type = 'profile_edit') as fields_updated,
    COUNT(*) FILTER (WHERE event_type = 'avatar_upload') as avatar_uploads,
    COUNT(*) FILTER (WHERE event_type = 'avatar_upload' AND (data->>'success')::boolean = true) as successful_uploads,
    COUNT(*) FILTER (WHERE event_type = 'privacy_change') as privacy_changes,
    COUNT(*) FILTER (WHERE event_type = 'university_network_interaction') as network_interactions,
    COUNT(*) FILTER (WHERE event_type = 'profile_completion_milestone') as completion_milestones,
    COUNT(*) FILTER (WHERE event_type = 'recommendation_view') as recommendation_views,
    COUNT(*) FILTER (WHERE event_type = 'recommendation_implement') as recommendation_implementations,
    COUNT(*) FILTER (WHERE event_type = 'insight_dismiss') as insight_dismissals
FROM analytics_events
WHERE timestamp >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY user_id, DATE_TRUNC('month', timestamp)
ORDER BY user_id, month_start DESC;

-- =============================================
-- PROFILE ENGAGEMENT METRICS
-- =============================================

-- Profile engagement summary view
CREATE OR REPLACE VIEW profile_engagement_summary AS
SELECT 
    user_id,
    COUNT(*) as total_events,
    COUNT(DISTINCT session_id) as total_sessions,
    COUNT(*) FILTER (WHERE event_type = 'profile_view') as profile_views,
    COUNT(*) FILTER (WHERE event_type = 'profile_edit') as profile_edits,
    COUNT(*) FILTER (WHERE event_type = 'avatar_upload') as avatar_uploads,
    COUNT(*) FILTER (WHERE event_type = 'university_network_interaction') as network_interactions,
    COUNT(*) FILTER (WHERE event_type = 'recommendation_view') as recommendation_views,
    COUNT(*) FILTER (WHERE event_type = 'recommendation_implement') as recommendation_implementations,
    AVG((data->>'duration')::numeric) FILTER (WHERE event_type = 'profile_view') as avg_view_duration,
    MAX(timestamp) as last_activity,
    MIN(timestamp) as first_activity
FROM analytics_events
WHERE timestamp >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY user_id
ORDER BY total_events DESC;

-- Profile completion progress view
CREATE OR REPLACE VIEW profile_completion_progress AS
SELECT 
    user_id,
    MAX((data->>'milestone')::numeric) FILTER (WHERE event_type = 'profile_completion_milestone') as current_completion_score,
    COUNT(*) FILTER (WHERE event_type = 'profile_completion_milestone') as milestones_reached,
    MAX(timestamp) FILTER (WHERE event_type = 'profile_completion_milestone') as last_milestone_date,
    COUNT(*) FILTER (WHERE event_type = 'profile_edit') as total_edits,
    COUNT(DISTINCT jsonb_array_elements_text(data->'updatedFields')) FILTER (WHERE event_type = 'profile_edit') as unique_fields_updated
FROM analytics_events
WHERE timestamp >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY user_id
ORDER BY current_completion_score DESC NULLS LAST;

-- =============================================
-- RECOMMENDATION EFFECTIVENESS METRICS
-- =============================================

-- Recommendation effectiveness view
CREATE OR REPLACE VIEW recommendation_effectiveness AS
SELECT 
    user_id,
    COUNT(*) FILTER (WHERE event_type = 'recommendation_view') as total_views,
    COUNT(*) FILTER (WHERE event_type = 'recommendation_implement') as total_implementations,
    COUNT(*) FILTER (WHERE event_type = 'insight_dismiss') as total_dismissals,
    CASE 
        WHEN COUNT(*) FILTER (WHERE event_type = 'recommendation_view') > 0 
        THEN (COUNT(*) FILTER (WHERE event_type = 'recommendation_implement')::numeric / 
              COUNT(*) FILTER (WHERE event_type = 'recommendation_view')::numeric) * 100
        ELSE 0 
    END as implementation_rate,
    CASE 
        WHEN COUNT(*) FILTER (WHERE event_type = 'recommendation_view') > 0 
        THEN (COUNT(*) FILTER (WHERE event_type = 'insight_dismiss')::numeric / 
              COUNT(*) FILTER (WHERE event_type = 'recommendation_view')::numeric) * 100
        ELSE 0 
    END as dismissal_rate,
    AVG((data->>'implementationTime')::numeric) FILTER (WHERE event_type = 'recommendation_implement') as avg_implementation_time
FROM analytics_events
WHERE timestamp >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY user_id
ORDER BY implementation_rate DESC;

-- Recommendation type effectiveness
CREATE OR REPLACE VIEW recommendation_type_effectiveness AS
SELECT 
    data->>'recommendationType' as recommendation_type,
    COUNT(*) FILTER (WHERE event_type = 'recommendation_view') as total_views,
    COUNT(*) FILTER (WHERE event_type = 'recommendation_implement') as total_implementations,
    COUNT(*) FILTER (WHERE event_type = 'insight_dismiss') as total_dismissals,
    CASE 
        WHEN COUNT(*) FILTER (WHERE event_type = 'recommendation_view') > 0 
        THEN (COUNT(*) FILTER (WHERE event_type = 'recommendation_implement')::numeric / 
              COUNT(*) FILTER (WHERE event_type = 'recommendation_view')::numeric) * 100
        ELSE 0 
    END as implementation_rate,
    AVG((data->>'implementationTime')::numeric) FILTER (WHERE event_type = 'recommendation_implement') as avg_implementation_time
FROM analytics_events
WHERE timestamp >= CURRENT_DATE - INTERVAL '30 days'
    AND data->>'recommendationType' IS NOT NULL
GROUP BY data->>'recommendationType'
ORDER BY implementation_rate DESC;

-- =============================================
-- USER ACTIVITY PATTERNS
-- =============================================

-- User activity patterns view
CREATE OR REPLACE VIEW user_activity_patterns AS
SELECT 
    user_id,
    EXTRACT(HOUR FROM timestamp) as hour_of_day,
    EXTRACT(DOW FROM timestamp) as day_of_week,
    COUNT(*) as event_count,
    COUNT(DISTINCT session_id) as session_count,
    AVG((data->>'duration')::numeric) as avg_duration
FROM analytics_events
WHERE timestamp >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY user_id, EXTRACT(HOUR FROM timestamp), EXTRACT(DOW FROM timestamp)
ORDER BY user_id, hour_of_day, day_of_week;

-- Peak activity hours view
CREATE OR REPLACE VIEW peak_activity_hours AS
SELECT 
    user_id,
    EXTRACT(HOUR FROM timestamp) as hour,
    COUNT(*) as event_count,
    RANK() OVER (PARTITION BY user_id ORDER BY COUNT(*) DESC) as hour_rank
FROM analytics_events
WHERE timestamp >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY user_id, EXTRACT(HOUR FROM timestamp)
HAVING COUNT(*) > 0
ORDER BY user_id, hour_rank;

-- =============================================
-- PRIVACY AND CONSENT METRICS
-- =============================================

-- Privacy consent metrics view
CREATE OR REPLACE VIEW privacy_consent_metrics AS
SELECT 
    ac.user_id,
    ac.consent_given,
    ac.purposes,
    ac.data_categories,
    ac.retention_period,
    ac.consent_version,
    ac.granted_at,
    ac.revoked_at,
    COUNT(ae.id) FILTER (WHERE ae.timestamp >= ac.granted_at AND (ac.revoked_at IS NULL OR ae.timestamp < ac.revoked_at)) as events_with_consent,
    COUNT(ae.id) FILTER (WHERE ae.timestamp >= ac.granted_at AND (ac.revoked_at IS NULL OR ae.timestamp < ac.revoked_at) AND (ae.privacy->>'anonymized')::boolean = true) as anonymized_events
FROM analytics_consent ac
LEFT JOIN analytics_events ae ON ac.user_id = ae.user_id
GROUP BY ac.user_id, ac.consent_given, ac.purposes, ac.data_categories, ac.retention_period, ac.consent_version, ac.granted_at, ac.revoked_at
ORDER BY ac.user_id;

-- =============================================
-- ANALYTICS FUNCTIONS
-- =============================================

-- Function to get user profile metrics for a specific period
CREATE OR REPLACE FUNCTION get_user_profile_metrics(
    p_user_id VARCHAR(255),
    p_start_date TIMESTAMP WITH TIME ZONE,
    p_end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
    user_id VARCHAR(255),
    profile_views BIGINT,
    unique_viewers BIGINT,
    avg_view_duration NUMERIC,
    profile_edits BIGINT,
    fields_updated BIGINT,
    avatar_uploads BIGINT,
    successful_uploads BIGINT,
    privacy_changes BIGINT,
    network_interactions BIGINT,
    completion_milestones BIGINT,
    recommendation_views BIGINT,
    recommendation_implementations BIGINT,
    insight_dismissals BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ae.user_id,
        COUNT(*) FILTER (WHERE ae.event_type = 'profile_view') as profile_views,
        COUNT(DISTINCT ae.data->>'viewerId') FILTER (WHERE ae.event_type = 'profile_view') as unique_viewers,
        AVG((ae.data->>'duration')::numeric) FILTER (WHERE ae.event_type = 'profile_view') as avg_view_duration,
        COUNT(*) FILTER (WHERE ae.event_type = 'profile_edit') as profile_edits,
        COUNT(DISTINCT jsonb_array_elements_text(ae.data->'updatedFields')) FILTER (WHERE ae.event_type = 'profile_edit') as fields_updated,
        COUNT(*) FILTER (WHERE ae.event_type = 'avatar_upload') as avatar_uploads,
        COUNT(*) FILTER (WHERE ae.event_type = 'avatar_upload' AND (ae.data->>'success')::boolean = true) as successful_uploads,
        COUNT(*) FILTER (WHERE ae.event_type = 'privacy_change') as privacy_changes,
        COUNT(*) FILTER (WHERE ae.event_type = 'university_network_interaction') as network_interactions,
        COUNT(*) FILTER (WHERE ae.event_type = 'profile_completion_milestone') as completion_milestones,
        COUNT(*) FILTER (WHERE ae.event_type = 'recommendation_view') as recommendation_views,
        COUNT(*) FILTER (WHERE ae.event_type = 'recommendation_implement') as recommendation_implementations,
        COUNT(*) FILTER (WHERE ae.event_type = 'insight_dismiss') as insight_dismissals
    FROM analytics_events ae
    WHERE ae.user_id = p_user_id
        AND ae.timestamp >= p_start_date
        AND ae.timestamp <= p_end_date
    GROUP BY ae.user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get recommendation effectiveness for a user
CREATE OR REPLACE FUNCTION get_user_recommendation_effectiveness(
    p_user_id VARCHAR(255),
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    user_id VARCHAR(255),
    total_views BIGINT,
    total_implementations BIGINT,
    total_dismissals BIGINT,
    implementation_rate NUMERIC,
    dismissal_rate NUMERIC,
    avg_implementation_time NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ae.user_id,
        COUNT(*) FILTER (WHERE ae.event_type = 'recommendation_view') as total_views,
        COUNT(*) FILTER (WHERE ae.event_type = 'recommendation_implement') as total_implementations,
        COUNT(*) FILTER (WHERE ae.event_type = 'insight_dismiss') as total_dismissals,
        CASE 
            WHEN COUNT(*) FILTER (WHERE ae.event_type = 'recommendation_view') > 0 
            THEN (COUNT(*) FILTER (WHERE ae.event_type = 'recommendation_implement')::numeric / 
                  COUNT(*) FILTER (WHERE ae.event_type = 'recommendation_view')::numeric) * 100
            ELSE 0 
        END as implementation_rate,
        CASE 
            WHEN COUNT(*) FILTER (WHERE ae.event_type = 'recommendation_view') > 0 
            THEN (COUNT(*) FILTER (WHERE ae.event_type = 'insight_dismiss')::numeric / 
                  COUNT(*) FILTER (WHERE ae.event_type = 'recommendation_view')::numeric) * 100
            ELSE 0 
        END as dismissal_rate,
        AVG((ae.data->>'implementationTime')::numeric) FILTER (WHERE ae.event_type = 'recommendation_implement') as avg_implementation_time
    FROM analytics_events ae
    WHERE ae.user_id = p_user_id
        AND ae.timestamp >= p_start_date
        AND ae.timestamp <= p_end_date
    GROUP BY ae.user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get user activity patterns
CREATE OR REPLACE FUNCTION get_user_activity_patterns(
    p_user_id VARCHAR(255),
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    user_id VARCHAR(255),
    hour_of_day NUMERIC,
    day_of_week NUMERIC,
    event_count BIGINT,
    session_count BIGINT,
    avg_duration NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ae.user_id,
        EXTRACT(HOUR FROM ae.timestamp) as hour_of_day,
        EXTRACT(DOW FROM ae.timestamp) as day_of_week,
        COUNT(*) as event_count,
        COUNT(DISTINCT ae.session_id) as session_count,
        AVG((ae.data->>'duration')::numeric) as avg_duration
    FROM analytics_events ae
    WHERE ae.user_id = p_user_id
        AND ae.timestamp >= p_start_date
        AND ae.timestamp <= p_end_date
    GROUP BY ae.user_id, EXTRACT(HOUR FROM ae.timestamp), EXTRACT(DOW FROM ae.timestamp)
    ORDER BY event_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old analytics data
CREATE OR REPLACE FUNCTION cleanup_old_analytics_data(
    p_retention_days INTEGER DEFAULT 365
)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete old analytics events
    DELETE FROM analytics_events 
    WHERE timestamp < CURRENT_DATE - INTERVAL '1 day' * p_retention_days;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Delete expired insights
    DELETE FROM profile_insights 
    WHERE expires_at IS NOT NULL 
        AND expires_at < CURRENT_DATE;
    
    -- Delete expired recommendations
    DELETE FROM profile_recommendations 
    WHERE expires_at IS NOT NULL 
        AND expires_at < CURRENT_DATE;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_analytics_events_updated_at
    BEFORE UPDATE ON analytics_events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analytics_consent_updated_at
    BEFORE UPDATE ON analytics_consent
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on analytics tables
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_consent ENABLE ROW LEVEL SECURITY;

-- Analytics events policies
CREATE POLICY analytics_events_user_access ON analytics_events
    FOR ALL TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY analytics_events_service_access ON analytics_events
    FOR ALL TO service_role
    USING (true);

-- Profile insights policies
CREATE POLICY profile_insights_user_access ON profile_insights
    FOR ALL TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY profile_insights_service_access ON profile_insights
    FOR ALL TO service_role
    USING (true);

-- Profile recommendations policies
CREATE POLICY profile_recommendations_user_access ON profile_recommendations
    FOR ALL TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY profile_recommendations_service_access ON profile_recommendations
    FOR ALL TO service_role
    USING (true);

-- Analytics consent policies
CREATE POLICY analytics_consent_user_access ON analytics_consent
    FOR ALL TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY analytics_consent_service_access ON analytics_consent
    FOR ALL TO service_role
    USING (true);

-- =============================================
-- GRANTS
-- =============================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON analytics_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON profile_insights TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON profile_recommendations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON analytics_consent TO authenticated;

-- Grant permissions to service role
GRANT ALL ON analytics_events TO service_role;
GRANT ALL ON profile_insights TO service_role;
GRANT ALL ON profile_recommendations TO service_role;
GRANT ALL ON analytics_consent TO service_role;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION get_user_profile_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_recommendation_effectiveness TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_activity_patterns TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_analytics_data TO service_role;
