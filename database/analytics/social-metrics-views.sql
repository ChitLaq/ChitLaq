-- Social Metrics Views
-- Author: ChitLaq Development Team
-- Date: 2024-01-15

-- Create analytics schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS analytics;

-- Social Activity Events Table
CREATE TABLE IF NOT EXISTS analytics.social_activity_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL CHECK (activity_type IN ('follow', 'unfollow', 'block', 'unblock', 'post', 'like', 'comment', 'share')),
    target_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    target_post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
    university_id UUID REFERENCES public.universities(id) ON DELETE CASCADE,
    department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE,
    academic_year TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Network Growth Data Table
CREATE TABLE IF NOT EXISTS analytics.network_growth_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    total_connections INTEGER NOT NULL DEFAULT 0,
    new_connections INTEGER NOT NULL DEFAULT 0,
    active_users INTEGER NOT NULL DEFAULT 0,
    network_density DECIMAL(5,4) NOT NULL DEFAULT 0,
    average_connections_per_user DECIMAL(8,2) NOT NULL DEFAULT 0,
    university_id UUID REFERENCES public.universities(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Community Health Scores Table
CREATE TABLE IF NOT EXISTS analytics.community_health_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    overall_score DECIMAL(5,2) NOT NULL DEFAULT 0,
    engagement_score DECIMAL(5,2) NOT NULL DEFAULT 0,
    cohesion_score DECIMAL(5,2) NOT NULL DEFAULT 0,
    safety_score DECIMAL(5,2) NOT NULL DEFAULT 0,
    diversity_score DECIMAL(5,2) NOT NULL DEFAULT 0,
    growth_score DECIMAL(5,2) NOT NULL DEFAULT 0,
    university_id UUID REFERENCES public.universities(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User Flags Table
CREATE TABLE IF NOT EXISTS analytics.user_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    flag_type TEXT NOT NULL CHECK (flag_type IN ('spam', 'bot', 'fake_account', 'harassment', 'inappropriate_content')),
    reason TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'dismissed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- User Reports Table
CREATE TABLE IF NOT EXISTS analytics.user_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reported_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    reported_post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
    report_type TEXT NOT NULL CHECK (report_type IN ('spam', 'harassment', 'inappropriate_content', 'fake_account', 'other')),
    description TEXT,
    university_id UUID REFERENCES public.universities(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_social_activity_events_user_id ON analytics.social_activity_events(user_id);
CREATE INDEX IF NOT EXISTS idx_social_activity_events_timestamp ON analytics.social_activity_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_social_activity_events_activity_type ON analytics.social_activity_events(activity_type);
CREATE INDEX IF NOT EXISTS idx_social_activity_events_university_id ON analytics.social_activity_events(university_id);

CREATE INDEX IF NOT EXISTS idx_network_growth_data_timestamp ON analytics.network_growth_data(timestamp);
CREATE INDEX IF NOT EXISTS idx_network_growth_data_university_id ON analytics.network_growth_data(university_id);

CREATE INDEX IF NOT EXISTS idx_community_health_scores_timestamp ON analytics.community_health_scores(timestamp);
CREATE INDEX IF NOT EXISTS idx_community_health_scores_university_id ON analytics.community_health_scores(university_id);

CREATE INDEX IF NOT EXISTS idx_user_flags_user_id ON analytics.user_flags(user_id);
CREATE INDEX IF NOT EXISTS idx_user_flags_flag_type ON analytics.user_flags(flag_type);
CREATE INDEX IF NOT EXISTS idx_user_flags_severity ON analytics.user_flags(severity);
CREATE INDEX IF NOT EXISTS idx_user_flags_created_at ON analytics.user_flags(created_at);

CREATE INDEX IF NOT EXISTS idx_user_reports_reporter_id ON analytics.user_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_reported_user_id ON analytics.user_reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_report_type ON analytics.user_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_user_reports_status ON analytics.user_reports(status);
CREATE INDEX IF NOT EXISTS idx_user_reports_created_at ON analytics.user_reports(created_at);

-- RLS Policies
ALTER TABLE analytics.social_activity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.network_growth_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.community_health_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.user_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.user_reports ENABLE ROW LEVEL SECURITY;

-- Social Activity Events Policies
CREATE POLICY "Users can view their own social activity" ON analytics.social_activity_events
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own social activity" ON analytics.social_activity_events
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all social activity" ON analytics.social_activity_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Network Growth Data Policies
CREATE POLICY "Admins can view network growth data" ON analytics.network_growth_data
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Service role can manage network growth data" ON analytics.network_growth_data
    FOR ALL USING (auth.role() = 'service_role');

-- Community Health Scores Policies
CREATE POLICY "Admins can view community health scores" ON analytics.community_health_scores
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Service role can manage community health scores" ON analytics.community_health_scores
    FOR ALL USING (auth.role() = 'service_role');

-- User Flags Policies
CREATE POLICY "Users can view flags about themselves" ON analytics.user_flags
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all user flags" ON analytics.user_flags
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Service role can manage user flags" ON analytics.user_flags
    FOR ALL USING (auth.role() = 'service_role');

-- User Reports Policies
CREATE POLICY "Users can view their own reports" ON analytics.user_reports
    FOR SELECT USING (auth.uid() = reporter_id);

CREATE POLICY "Users can create reports" ON analytics.user_reports
    FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Admins can view all user reports" ON analytics.user_reports
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update user reports" ON analytics.user_reports
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Analytics Functions

-- Function to get connection metrics
CREATE OR REPLACE FUNCTION analytics.get_connection_metrics(
    time_filter TEXT DEFAULT 'timestamp >= NOW() - INTERVAL ''7 days''',
    university_filter TEXT DEFAULT '1=1'
)
RETURNS TABLE (
    total INTEGER,
    daily INTEGER,
    weekly INTEGER,
    monthly INTEGER,
    density DECIMAL,
    cross_university INTEGER,
    follow_unfollow_ratio DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    WITH connection_stats AS (
        SELECT 
            COUNT(*) as total_connections,
            COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 day') as daily_connections,
            COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as weekly_connections,
            COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as monthly_connections
        FROM public.social_relationships sr
        JOIN public.user_profiles up1 ON sr.source_user_id = up1.id
        JOIN public.user_profiles up2 ON sr.target_user_id = up2.id
        WHERE sr.relationship_type = 'follows'
        AND (university_filter = '1=1' OR up1.university_id::TEXT = university_filter)
    ),
    density_calc AS (
        SELECT 
            CASE 
                WHEN COUNT(DISTINCT up1.id) > 1 THEN 
                    COUNT(*)::DECIMAL / (COUNT(DISTINCT up1.id) * (COUNT(DISTINCT up1.id) - 1))
                ELSE 0 
            END as network_density
        FROM public.social_relationships sr
        JOIN public.user_profiles up1 ON sr.source_user_id = up1.id
        JOIN public.user_profiles up2 ON sr.target_user_id = up2.id
        WHERE sr.relationship_type = 'follows'
        AND (university_filter = '1=1' OR up1.university_id::TEXT = university_filter)
    ),
    cross_university_calc AS (
        SELECT COUNT(*) as cross_connections
        FROM public.social_relationships sr
        JOIN public.user_profiles up1 ON sr.source_user_id = up1.id
        JOIN public.user_profiles up2 ON sr.target_user_id = up2.id
        WHERE sr.relationship_type = 'follows'
        AND up1.university_id != up2.university_id
        AND (university_filter = '1=1' OR up1.university_id::TEXT = university_filter)
    ),
    follow_unfollow_calc AS (
        SELECT 
            COUNT(*) FILTER (WHERE relationship_type = 'follows') as follows,
            COUNT(*) FILTER (WHERE relationship_type = 'unfollows') as unfollows
        FROM public.social_relationships sr
        JOIN public.user_profiles up ON sr.source_user_id = up.id
        WHERE (university_filter = '1=1' OR up.university_id::TEXT = university_filter)
    )
    SELECT 
        cs.total_connections::INTEGER,
        cs.daily_connections::INTEGER,
        cs.weekly_connections::INTEGER,
        cs.monthly_connections::INTEGER,
        dc.network_density,
        cuc.cross_connections::INTEGER,
        CASE 
            WHEN fuc.unfollows > 0 THEN fuc.follows::DECIMAL / fuc.unfollows
            ELSE fuc.follows::DECIMAL
        END
    FROM connection_stats cs, density_calc dc, cross_university_calc cuc, follow_unfollow_calc fuc;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get mutual connection distribution
CREATE OR REPLACE FUNCTION analytics.get_mutual_connection_distribution(
    university_filter TEXT DEFAULT '1=1'
)
RETURNS TABLE (
    distribution JSONB,
    average DECIMAL,
    median DECIMAL,
    max INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH mutual_counts AS (
        SELECT 
            up1.id as user_id,
            COUNT(*) as mutual_count
        FROM public.user_profiles up1
        JOIN public.social_relationships sr1 ON up1.id = sr1.source_user_id
        JOIN public.social_relationships sr2 ON sr1.target_user_id = sr2.source_user_id
        JOIN public.user_profiles up2 ON sr2.target_user_id = up2.id
        WHERE sr1.relationship_type = 'follows'
        AND sr2.relationship_type = 'follows'
        AND up1.id = up2.id
        AND (university_filter = '1=1' OR up1.university_id::TEXT = university_filter)
        GROUP BY up1.id
    ),
    distribution_calc AS (
        SELECT 
            jsonb_object_agg(mutual_count::TEXT, count) as dist,
            AVG(mutual_count) as avg_count,
            PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY mutual_count) as median_count,
            MAX(mutual_count) as max_count
        FROM (
            SELECT mutual_count, COUNT(*) as count
            FROM mutual_counts
            GROUP BY mutual_count
        ) grouped
    )
    SELECT 
        dc.dist,
        dc.avg_count,
        dc.median_count,
        dc.max_count::INTEGER
    FROM distribution_calc dc;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get engagement metrics
CREATE OR REPLACE FUNCTION analytics.get_engagement_metrics(
    time_filter TEXT DEFAULT 'timestamp >= NOW() - INTERVAL ''7 days''',
    university_filter TEXT DEFAULT '1=1'
)
RETURNS TABLE (
    interaction_frequency DECIMAL,
    feature_adoption DECIMAL,
    community_participation DECIMAL,
    content_sharing_rate DECIMAL,
    discovery_effectiveness DECIMAL,
    retention_correlation DECIMAL,
    viral_coefficient DECIMAL,
    network_effect DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    WITH activity_stats AS (
        SELECT 
            COUNT(*) as total_activities,
            COUNT(DISTINCT user_id) as active_users
        FROM analytics.social_activity_events sae
        JOIN public.user_profiles up ON sae.user_id = up.id
        WHERE (university_filter = '1=1' OR up.university_id::TEXT = university_filter)
    ),
    content_stats AS (
        SELECT 
            COUNT(*) as total_posts,
            COUNT(DISTINCT user_id) as content_creators
        FROM public.posts p
        JOIN public.user_profiles up ON p.user_id = up.id
        WHERE (university_filter = '1=1' OR up.university_id::TEXT = university_filter)
    ),
    interaction_stats AS (
        SELECT 
            COUNT(*) as total_interactions,
            COUNT(DISTINCT user_id) as interacting_users
        FROM public.post_interactions pi
        JOIN public.user_profiles up ON pi.user_id = up.id
        WHERE (university_filter = '1=1' OR up.university_id::TEXT = university_filter)
    )
    SELECT 
        (as1.total_activities::DECIMAL / GREATEST(as1.active_users, 1)) as interaction_frequency,
        (cs.content_creators::DECIMAL / GREATEST(as1.active_users, 1)) as feature_adoption,
        (is1.interacting_users::DECIMAL / GREATEST(as1.active_users, 1)) as community_participation,
        (cs.total_posts::DECIMAL / GREATEST(as1.active_users, 1)) as content_sharing_rate,
        0.75 as discovery_effectiveness, -- Placeholder
        0.85 as retention_correlation, -- Placeholder
        1.2 as viral_coefficient, -- Placeholder
        0.9 as network_effect -- Placeholder
    FROM activity_stats as1, content_stats cs, interaction_stats is1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get community health metrics
CREATE OR REPLACE FUNCTION analytics.get_community_health_metrics(
    time_filter TEXT DEFAULT 'timestamp >= NOW() - INTERVAL ''7 days''',
    university_filter TEXT DEFAULT '1=1'
)
RETURNS TABLE (
    network_cohesion DECIMAL,
    graph_clustering DECIMAL,
    isolation_rate DECIMAL,
    spam_abuse_rate DECIMAL,
    community_sentiment DECIMAL,
    cross_departmental DECIMAL,
    alumni_engagement DECIMAL,
    university_pride DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    WITH connection_stats AS (
        SELECT 
            COUNT(*) as total_connections,
            COUNT(DISTINCT source_user_id) as connected_users
        FROM public.social_relationships sr
        JOIN public.user_profiles up ON sr.source_user_id = up.id
        WHERE sr.relationship_type = 'follows'
        AND (university_filter = '1=1' OR up.university_id::TEXT = university_filter)
    ),
    user_stats AS (
        SELECT COUNT(*) as total_users
        FROM public.user_profiles up
        WHERE (university_filter = '1=1' OR up.university_id::TEXT = university_filter)
    ),
    flag_stats AS (
        SELECT 
            COUNT(*) FILTER (WHERE flag_type = 'spam') as spam_flags,
            COUNT(*) FILTER (WHERE flag_type = 'bot') as bot_flags
        FROM analytics.user_flags uf
        JOIN public.user_profiles up ON uf.user_id = up.id
        WHERE (university_filter = '1=1' OR up.university_id::TEXT = university_filter)
    )
    SELECT 
        (cs.total_connections::DECIMAL / GREATEST(us.total_users, 1)) as network_cohesion,
        0.65 as graph_clustering, -- Placeholder
        ((us.total_users - cs.connected_users)::DECIMAL / GREATEST(us.total_users, 1)) as isolation_rate,
        ((fs.spam_flags + fs.bot_flags)::DECIMAL / GREATEST(us.total_users, 1)) as spam_abuse_rate,
        0.75 as community_sentiment, -- Placeholder
        0.6 as cross_departmental, -- Placeholder
        0.4 as alumni_engagement, -- Placeholder
        0.8 as university_pride -- Placeholder
    FROM connection_stats cs, user_stats us, flag_stats fs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get recommendation metrics
CREATE OR REPLACE FUNCTION analytics.get_recommendation_metrics(
    time_filter TEXT DEFAULT 'timestamp >= NOW() - INTERVAL ''7 days''',
    university_filter TEXT DEFAULT '1=1'
)
RETURNS TABLE (
    acceptance_rate DECIMAL,
    click_through_rate DECIMAL,
    conversion_rate DECIMAL,
    algorithm_accuracy DECIMAL,
    satisfaction_score DECIMAL,
    diversity DECIMAL,
    cold_start DECIMAL,
    long_term_engagement DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        0.15 as acceptance_rate, -- Placeholder
        0.25 as click_through_rate, -- Placeholder
        0.08 as conversion_rate, -- Placeholder
        0.78 as algorithm_accuracy, -- Placeholder
        0.72 as satisfaction_score, -- Placeholder
        0.65 as diversity, -- Placeholder
        0.45 as cold_start, -- Placeholder
        0.68 as long_term_engagement -- Placeholder
    ;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user segmentation metrics
CREATE OR REPLACE FUNCTION analytics.get_user_segmentation_metrics(
    time_filter TEXT DEFAULT 'timestamp >= NOW() - INTERVAL ''7 days''',
    university_filter TEXT DEFAULT '1=1'
)
RETURNS TABLE (
    active_users INTEGER,
    passive_users INTEGER,
    new_users INTEGER,
    returning_users INTEGER,
    power_users INTEGER,
    at_risk_users INTEGER,
    distribution JSONB,
    engagement JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH user_activity AS (
        SELECT 
            up.id,
            COUNT(sae.id) as activity_count,
            MAX(sae.timestamp) as last_activity,
            MIN(up.created_at) as user_created
        FROM public.user_profiles up
        LEFT JOIN analytics.social_activity_events sae ON up.id = sae.user_id
        WHERE (university_filter = '1=1' OR up.university_id::TEXT = university_filter)
        GROUP BY up.id
    ),
    segmentation AS (
        SELECT 
            COUNT(*) FILTER (WHERE activity_count > 10) as active,
            COUNT(*) FILTER (WHERE activity_count <= 10 AND activity_count > 0) as passive,
            COUNT(*) FILTER (WHERE user_created >= NOW() - INTERVAL '30 days') as new_users,
            COUNT(*) FILTER (WHERE last_activity >= NOW() - INTERVAL '7 days' AND user_created < NOW() - INTERVAL '30 days') as returning,
            COUNT(*) FILTER (WHERE activity_count > 50) as power,
            COUNT(*) FILTER (WHERE last_activity < NOW() - INTERVAL '30 days' AND user_created < NOW() - INTERVAL '30 days') as at_risk
        FROM user_activity
    )
    SELECT 
        s.active,
        s.passive,
        s.new_users,
        s.returning,
        s.power,
        s.at_risk,
        jsonb_build_object(
            'active', s.active,
            'passive', s.passive,
            'new', s.new_users,
            'returning', s.returning,
            'power', s.power,
            'at_risk', s.at_risk
        ),
        jsonb_build_object(
            'active', s.active::DECIMAL / GREATEST(s.active + s.passive, 1),
            'passive', s.passive::DECIMAL / GREATEST(s.active + s.passive, 1),
            'new', s.new_users::DECIMAL / GREATEST(s.new_users + s.returning, 1),
            'returning', s.returning::DECIMAL / GREATEST(s.new_users + s.returning, 1)
        )
    FROM segmentation s;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get average connections per user
CREATE OR REPLACE FUNCTION analytics.get_average_connections_per_user(
    university_filter TEXT DEFAULT '1=1'
)
RETURNS DECIMAL AS $$
DECLARE
    avg_connections DECIMAL;
BEGIN
    SELECT AVG(connection_count) INTO avg_connections
    FROM (
        SELECT COUNT(*) as connection_count
        FROM public.social_relationships sr
        JOIN public.user_profiles up ON sr.source_user_id = up.id
        WHERE sr.relationship_type = 'follows'
        AND (university_filter = '1=1' OR up.university_id::TEXT = university_filter)
        GROUP BY sr.source_user_id
    ) user_connections;
    
    RETURN COALESCE(avg_connections, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Views for easy access to analytics data

-- Daily social activity summary
CREATE OR REPLACE VIEW analytics.daily_social_activity AS
SELECT 
    DATE(timestamp) as activity_date,
    activity_type,
    university_id,
    COUNT(*) as activity_count,
    COUNT(DISTINCT user_id) as unique_users
FROM analytics.social_activity_events
GROUP BY DATE(timestamp), activity_type, university_id
ORDER BY activity_date DESC, activity_type;

-- Weekly network growth summary
CREATE OR REPLACE VIEW analytics.weekly_network_growth AS
SELECT 
    DATE_TRUNC('week', timestamp) as week_start,
    university_id,
    AVG(total_connections) as avg_total_connections,
    AVG(new_connections) as avg_new_connections,
    AVG(active_users) as avg_active_users,
    AVG(network_density) as avg_network_density
FROM analytics.network_growth_data
GROUP BY DATE_TRUNC('week', timestamp), university_id
ORDER BY week_start DESC;

-- Community health trends
CREATE OR REPLACE VIEW analytics.community_health_trends AS
SELECT 
    DATE_TRUNC('day', timestamp) as health_date,
    university_id,
    AVG(overall_score) as avg_overall_health,
    AVG(engagement_score) as avg_engagement,
    AVG(cohesion_score) as avg_cohesion,
    AVG(safety_score) as avg_safety,
    AVG(diversity_score) as avg_diversity,
    AVG(growth_score) as avg_growth
FROM analytics.community_health_scores
GROUP BY DATE_TRUNC('day', timestamp), university_id
ORDER BY health_date DESC;

-- User engagement summary
CREATE OR REPLACE VIEW analytics.user_engagement_summary AS
SELECT 
    up.id as user_id,
    up.username,
    up.university_id,
    COUNT(sae.id) as total_activities,
    COUNT(DISTINCT DATE(sae.timestamp)) as active_days,
    MAX(sae.timestamp) as last_activity,
    COUNT(DISTINCT sae.activity_type) as activity_types
FROM public.user_profiles up
LEFT JOIN analytics.social_activity_events sae ON up.id = sae.user_id
GROUP BY up.id, up.username, up.university_id
ORDER BY total_activities DESC;

-- Safety metrics summary
CREATE OR REPLACE VIEW analytics.safety_metrics_summary AS
SELECT 
    DATE_TRUNC('day', uf.created_at) as flag_date,
    uf.flag_type,
    up.university_id,
    COUNT(*) as flag_count,
    COUNT(*) FILTER (WHERE uf.status = 'resolved') as resolved_count
FROM analytics.user_flags uf
JOIN public.user_profiles up ON uf.user_id = up.id
GROUP BY DATE_TRUNC('day', uf.created_at), uf.flag_type, up.university_id
ORDER BY flag_date DESC, flag_type;

-- Grant permissions
GRANT USAGE ON SCHEMA analytics TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA analytics TO authenticated;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA analytics TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA analytics TO authenticated;

-- Grant service role permissions
GRANT ALL ON SCHEMA analytics TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA analytics TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA analytics TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA analytics TO service_role;
