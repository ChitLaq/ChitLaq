-- Migration: 006_social_relationships.sql
-- Description: Create social graph tables and indexes for relationship management
-- Author: ChitLaq Development Team
-- Date: 2024-01-15

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Create social_relationships table
CREATE TABLE IF NOT EXISTS social_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) NOT NULL CHECK (relationship_type IN (
        'follow',
        'block',
        'university_connection',
        'mutual_connection',
        'recommended_connection',
        'alumni_connection',
        'department_connection',
        'year_connection',
        'interest_connection',
        'event_connection'
    )),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN (
        'active',
        'pending',
        'blocked',
        'muted',
        'archived',
        'expired'
    )),
    strength INTEGER NOT NULL DEFAULT 50 CHECK (strength >= 0 AND strength <= 100),
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT unique_relationship UNIQUE (follower_id, following_id, relationship_type),
    CONSTRAINT no_self_relationship CHECK (follower_id != following_id),
    CONSTRAINT valid_metadata CHECK (jsonb_typeof(metadata) = 'object')
);

-- Create social_graph_nodes table
CREATE TABLE IF NOT EXISTS social_graph_nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    node_type VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (node_type IN (
        'user',
        'university',
        'department',
        'interest',
        'event'
    )),
    properties JSONB NOT NULL DEFAULT '{}',
    connections JSONB NOT NULL DEFAULT '{}',
    metrics JSONB NOT NULL DEFAULT '{}',
    last_activity TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_user_node UNIQUE (user_id, node_type),
    CONSTRAINT valid_properties CHECK (jsonb_typeof(properties) = 'object'),
    CONSTRAINT valid_connections CHECK (jsonb_typeof(connections) = 'object'),
    CONSTRAINT valid_metrics CHECK (jsonb_typeof(metrics) = 'object')
);

-- Create connection_recommendations table
CREATE TABLE IF NOT EXISTS connection_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recommended_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recommendation_type VARCHAR(50) NOT NULL CHECK (recommendation_type IN (
        'mutual_connection',
        'university',
        'department',
        'year',
        'interest',
        'location',
        'activity'
    )),
    confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
    reasons TEXT[] NOT NULL DEFAULT '{}',
    mutual_connections UUID[] NOT NULL DEFAULT '{}',
    shared_interests TEXT[] NOT NULL DEFAULT '{}',
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',
        'accepted',
        'dismissed',
        'expired'
    )),
    
    -- Constraints
    CONSTRAINT unique_recommendation UNIQUE (user_id, recommended_user_id, recommendation_type),
    CONSTRAINT no_self_recommendation CHECK (user_id != recommended_user_id),
    CONSTRAINT valid_metadata CHECK (jsonb_typeof(metadata) = 'object')
);

-- Create social_graph_analytics table
CREATE TABLE IF NOT EXISTS social_graph_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    period VARCHAR(20) NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly', 'yearly')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Connection metrics
    total_connections INTEGER NOT NULL DEFAULT 0,
    new_connections INTEGER NOT NULL DEFAULT 0,
    lost_connections INTEGER NOT NULL DEFAULT 0,
    net_growth INTEGER NOT NULL DEFAULT 0,
    growth_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    
    -- Relationship metrics
    followers_count INTEGER NOT NULL DEFAULT 0,
    following_count INTEGER NOT NULL DEFAULT 0,
    mutual_count INTEGER NOT NULL DEFAULT 0,
    blocked_count INTEGER NOT NULL DEFAULT 0,
    university_connections INTEGER NOT NULL DEFAULT 0,
    department_connections INTEGER NOT NULL DEFAULT 0,
    year_connections INTEGER NOT NULL DEFAULT 0,
    interest_connections INTEGER NOT NULL DEFAULT 0,
    
    -- Engagement metrics
    profile_views INTEGER NOT NULL DEFAULT 0,
    connection_requests INTEGER NOT NULL DEFAULT 0,
    accepted_requests INTEGER NOT NULL DEFAULT 0,
    rejected_requests INTEGER NOT NULL DEFAULT 0,
    blocks_count INTEGER NOT NULL DEFAULT 0,
    unblocks_count INTEGER NOT NULL DEFAULT 0,
    recommendations_viewed INTEGER NOT NULL DEFAULT 0,
    recommendations_accepted INTEGER NOT NULL DEFAULT 0,
    
    -- Network metrics
    network_size INTEGER NOT NULL DEFAULT 0,
    network_density DECIMAL(5,4) NOT NULL DEFAULT 0.0000,
    clustering_coefficient DECIMAL(5,4) NOT NULL DEFAULT 0.0000,
    average_path_length DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    influence_score INTEGER NOT NULL DEFAULT 0,
    reach_score INTEGER NOT NULL DEFAULT 0,
    
    -- University network metrics
    total_university_connections INTEGER NOT NULL DEFAULT 0,
    department_connections_count INTEGER NOT NULL DEFAULT 0,
    year_connections_count INTEGER NOT NULL DEFAULT 0,
    cross_department_connections INTEGER NOT NULL DEFAULT 0,
    alumni_connections INTEGER NOT NULL DEFAULT 0,
    university_network_growth INTEGER NOT NULL DEFAULT 0,
    
    -- Activity patterns
    peak_hours INTEGER[] NOT NULL DEFAULT '{}',
    peak_days TEXT[] NOT NULL DEFAULT '{}',
    connection_activity INTEGER NOT NULL DEFAULT 0,
    discovery_activity INTEGER NOT NULL DEFAULT 0,
    recommendation_activity INTEGER NOT NULL DEFAULT 0,
    
    -- Constraints
    CONSTRAINT unique_user_period UNIQUE (user_id, period, start_date),
    CONSTRAINT valid_date_range CHECK (start_date <= end_date)
);

-- Create indexes for social_relationships table
CREATE INDEX IF NOT EXISTS idx_social_relationships_follower_id ON social_relationships(follower_id);
CREATE INDEX IF NOT EXISTS idx_social_relationships_following_id ON social_relationships(following_id);
CREATE INDEX IF NOT EXISTS idx_social_relationships_type ON social_relationships(relationship_type);
CREATE INDEX IF NOT EXISTS idx_social_relationships_status ON social_relationships(status);
CREATE INDEX IF NOT EXISTS idx_social_relationships_strength ON social_relationships(strength);
CREATE INDEX IF NOT EXISTS idx_social_relationships_created_at ON social_relationships(created_at);
CREATE INDEX IF NOT EXISTS idx_social_relationships_updated_at ON social_relationships(updated_at);
CREATE INDEX IF NOT EXISTS idx_social_relationships_expires_at ON social_relationships(expires_at) WHERE expires_at IS NOT NULL;

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_social_relationships_follower_type ON social_relationships(follower_id, relationship_type);
CREATE INDEX IF NOT EXISTS idx_social_relationships_following_type ON social_relationships(following_id, relationship_type);
CREATE INDEX IF NOT EXISTS idx_social_relationships_follower_status ON social_relationships(follower_id, status);
CREATE INDEX IF NOT EXISTS idx_social_relationships_following_status ON social_relationships(following_id, status);
CREATE INDEX IF NOT EXISTS idx_social_relationships_type_status ON social_relationships(relationship_type, status);
CREATE INDEX IF NOT EXISTS idx_social_relationships_follower_following ON social_relationships(follower_id, following_id);

-- GIN indexes for JSONB columns
CREATE INDEX IF NOT EXISTS idx_social_relationships_metadata ON social_relationships USING GIN(metadata);
CREATE INDEX IF NOT EXISTS idx_social_relationships_metadata_context ON social_relationships USING GIN((metadata->'context'));
CREATE INDEX IF NOT EXISTS idx_social_relationships_metadata_privacy ON social_relationships USING GIN((metadata->'privacy'));

-- Partial indexes for active relationships
CREATE INDEX IF NOT EXISTS idx_social_relationships_active ON social_relationships(follower_id, following_id, relationship_type) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_social_relationships_follow_active ON social_relationships(follower_id, following_id) WHERE relationship_type = 'follow' AND status = 'active';
CREATE INDEX IF NOT EXISTS idx_social_relationships_block_active ON social_relationships(follower_id, following_id) WHERE relationship_type = 'block' AND status = 'active';

-- Create indexes for social_graph_nodes table
CREATE INDEX IF NOT EXISTS idx_social_graph_nodes_user_id ON social_graph_nodes(user_id);
CREATE INDEX IF NOT EXISTS idx_social_graph_nodes_type ON social_graph_nodes(node_type);
CREATE INDEX IF NOT EXISTS idx_social_graph_nodes_last_activity ON social_graph_nodes(last_activity);
CREATE INDEX IF NOT EXISTS idx_social_graph_nodes_created_at ON social_graph_nodes(created_at);
CREATE INDEX IF NOT EXISTS idx_social_graph_nodes_updated_at ON social_graph_nodes(updated_at);

-- Composite indexes for social_graph_nodes
CREATE INDEX IF NOT EXISTS idx_social_graph_nodes_user_type ON social_graph_nodes(user_id, node_type);
CREATE INDEX IF NOT EXISTS idx_social_graph_nodes_type_activity ON social_graph_nodes(node_type, last_activity);

-- GIN indexes for JSONB columns in social_graph_nodes
CREATE INDEX IF NOT EXISTS idx_social_graph_nodes_properties ON social_graph_nodes USING GIN(properties);
CREATE INDEX IF NOT EXISTS idx_social_graph_nodes_connections ON social_graph_nodes USING GIN(connections);
CREATE INDEX IF NOT EXISTS idx_social_graph_nodes_metrics ON social_graph_nodes USING GIN(metrics);

-- Specific GIN indexes for common queries
CREATE INDEX IF NOT EXISTS idx_social_graph_nodes_university ON social_graph_nodes USING GIN((properties->'university'));
CREATE INDEX IF NOT EXISTS idx_social_graph_nodes_department ON social_graph_nodes USING GIN((properties->'department'));
CREATE INDEX IF NOT EXISTS idx_social_graph_nodes_interests ON social_graph_nodes USING GIN((properties->'interests'));
CREATE INDEX IF NOT EXISTS idx_social_graph_nodes_privacy ON social_graph_nodes USING GIN((properties->'privacy'));

-- Create indexes for connection_recommendations table
CREATE INDEX IF NOT EXISTS idx_connection_recommendations_user_id ON connection_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_connection_recommendations_recommended_user_id ON connection_recommendations(recommended_user_id);
CREATE INDEX IF NOT EXISTS idx_connection_recommendations_type ON connection_recommendations(recommendation_type);
CREATE INDEX IF NOT EXISTS idx_connection_recommendations_confidence ON connection_recommendations(confidence);
CREATE INDEX IF NOT EXISTS idx_connection_recommendations_status ON connection_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_connection_recommendations_created_at ON connection_recommendations(created_at);
CREATE INDEX IF NOT EXISTS idx_connection_recommendations_expires_at ON connection_recommendations(expires_at);

-- Composite indexes for connection_recommendations
CREATE INDEX IF NOT EXISTS idx_connection_recommendations_user_status ON connection_recommendations(user_id, status);
CREATE INDEX IF NOT EXISTS idx_connection_recommendations_user_type ON connection_recommendations(user_id, recommendation_type);
CREATE INDEX IF NOT EXISTS idx_connection_recommendations_user_confidence ON connection_recommendations(user_id, confidence DESC);
CREATE INDEX IF NOT EXISTS idx_connection_recommendations_expires_status ON connection_recommendations(expires_at, status) WHERE status = 'pending';

-- GIN indexes for array and JSONB columns
CREATE INDEX IF NOT EXISTS idx_connection_recommendations_reasons ON connection_recommendations USING GIN(reasons);
CREATE INDEX IF NOT EXISTS idx_connection_recommendations_mutual_connections ON connection_recommendations USING GIN(mutual_connections);
CREATE INDEX IF NOT EXISTS idx_connection_recommendations_shared_interests ON connection_recommendations USING GIN(shared_interests);
CREATE INDEX IF NOT EXISTS idx_connection_recommendations_metadata ON connection_recommendations USING GIN(metadata);

-- Create indexes for social_graph_analytics table
CREATE INDEX IF NOT EXISTS idx_social_graph_analytics_user_id ON social_graph_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_social_graph_analytics_period ON social_graph_analytics(period);
CREATE INDEX IF NOT EXISTS idx_social_graph_analytics_start_date ON social_graph_analytics(start_date);
CREATE INDEX IF NOT EXISTS idx_social_graph_analytics_end_date ON social_graph_analytics(end_date);
CREATE INDEX IF NOT EXISTS idx_social_graph_analytics_generated_at ON social_graph_analytics(generated_at);

-- Composite indexes for social_graph_analytics
CREATE INDEX IF NOT EXISTS idx_social_graph_analytics_user_period ON social_graph_analytics(user_id, period);
CREATE INDEX IF NOT EXISTS idx_social_graph_analytics_user_date_range ON social_graph_analytics(user_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_social_graph_analytics_period_date ON social_graph_analytics(period, start_date);

-- GIN indexes for array columns
CREATE INDEX IF NOT EXISTS idx_social_graph_analytics_peak_hours ON social_graph_analytics USING GIN(peak_hours);
CREATE INDEX IF NOT EXISTS idx_social_graph_analytics_peak_days ON social_graph_analytics USING GIN(peak_days);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_social_relationships_updated_at 
    BEFORE UPDATE ON social_relationships 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_social_graph_nodes_updated_at 
    BEFORE UPDATE ON social_graph_nodes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to clean up expired relationships
CREATE OR REPLACE FUNCTION cleanup_expired_relationships()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM social_relationships 
    WHERE expires_at IS NOT NULL AND expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to clean up expired recommendations
CREATE OR REPLACE FUNCTION cleanup_expired_recommendations()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    UPDATE connection_recommendations 
    SET status = 'expired' 
    WHERE expires_at < NOW() AND status = 'pending';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to update relationship strength
CREATE OR REPLACE FUNCTION update_relationship_strength(
    p_relationship_id UUID,
    p_interactions INTEGER DEFAULT 0,
    p_mutual_connections INTEGER DEFAULT 0,
    p_time_decay DECIMAL DEFAULT 0.1
)
RETURNS INTEGER AS $$
DECLARE
    current_strength INTEGER;
    new_strength INTEGER;
    days_since_update DECIMAL;
BEGIN
    -- Get current relationship
    SELECT strength, updated_at INTO current_strength, days_since_update
    FROM social_relationships 
    WHERE id = p_relationship_id;
    
    IF NOT FOUND THEN
        RETURN 0;
    END IF;
    
    -- Calculate new strength
    new_strength := current_strength;
    
    -- Boost from interactions
    new_strength := new_strength + LEAST(p_interactions * 0.5, 20);
    
    -- Boost from mutual connections
    new_strength := new_strength + LEAST(p_mutual_connections * 1, 15);
    
    -- Time decay
    days_since_update := EXTRACT(EPOCH FROM (NOW() - updated_at)) / 86400;
    new_strength := new_strength - (days_since_update * p_time_decay);
    
    -- Clamp to valid range
    new_strength := GREATEST(0, LEAST(100, new_strength));
    
    -- Update relationship
    UPDATE social_relationships 
    SET strength = new_strength, updated_at = NOW()
    WHERE id = p_relationship_id;
    
    RETURN new_strength;
END;
$$ LANGUAGE plpgsql;

-- Create function to get mutual connections
CREATE OR REPLACE FUNCTION get_mutual_connections(
    p_user1_id UUID,
    p_user2_id UUID,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE(
    user_id UUID,
    display_name TEXT,
    avatar_url TEXT,
    university_name TEXT,
    department_name TEXT,
    mutual_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH user1_following AS (
        SELECT following_id
        FROM social_relationships 
        WHERE follower_id = p_user1_id 
        AND relationship_type = 'follow' 
        AND status = 'active'
    ),
    user2_following AS (
        SELECT following_id
        FROM social_relationships 
        WHERE follower_id = p_user2_id 
        AND relationship_type = 'follow' 
        AND status = 'active'
    ),
    mutual_users AS (
        SELECT u1.following_id as mutual_user_id
        FROM user1_following u1
        INNER JOIN user2_following u2 ON u1.following_id = u2.following_id
    )
    SELECT 
        u.id,
        up.display_name,
        up.avatar_url,
        univ.name as university_name,
        dept.name as department_name,
        (
            SELECT COUNT(*)
            FROM social_relationships sr
            WHERE sr.follower_id = mu.mutual_user_id
            AND sr.relationship_type = 'follow'
            AND sr.status = 'active'
            AND sr.following_id IN (SELECT following_id FROM user1_following UNION SELECT following_id FROM user2_following)
        ) as mutual_count
    FROM mutual_users mu
    INNER JOIN users u ON u.id = mu.mutual_user_id
    LEFT JOIN user_profiles up ON up.user_id = u.id
    LEFT JOIN universities univ ON univ.id = up.university_id
    LEFT JOIN departments dept ON dept.id = up.department_id
    ORDER BY mutual_count DESC, up.display_name
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Create function to calculate network density
CREATE OR REPLACE FUNCTION calculate_network_density(p_user_id UUID)
RETURNS DECIMAL AS $$
DECLARE
    node_count INTEGER;
    max_possible_connections INTEGER;
    actual_connections INTEGER;
    density DECIMAL;
BEGIN
    -- Get number of connected users
    SELECT COUNT(DISTINCT CASE 
        WHEN follower_id = p_user_id THEN following_id 
        ELSE follower_id 
    END) INTO node_count
    FROM social_relationships 
    WHERE (follower_id = p_user_id OR following_id = p_user_id)
    AND relationship_type = 'follow'
    AND status = 'active';
    
    IF node_count < 2 THEN
        RETURN 0;
    END IF;
    
    -- Calculate max possible connections
    max_possible_connections := (node_count * (node_count - 1)) / 2;
    
    -- Count actual connections between connected users
    WITH connected_users AS (
        SELECT DISTINCT CASE 
            WHEN follower_id = p_user_id THEN following_id 
            ELSE follower_id 
        END as connected_user_id
        FROM social_relationships 
        WHERE (follower_id = p_user_id OR following_id = p_user_id)
        AND relationship_type = 'follow'
        AND status = 'active'
    )
    SELECT COUNT(*) INTO actual_connections
    FROM social_relationships sr
    INNER JOIN connected_users cu1 ON sr.follower_id = cu1.connected_user_id
    INNER JOIN connected_users cu2 ON sr.following_id = cu2.connected_user_id
    WHERE sr.relationship_type = 'follow'
    AND sr.status = 'active';
    
    density := actual_connections::DECIMAL / max_possible_connections;
    RETURN density;
END;
$$ LANGUAGE plpgsql;

-- Create function to get connection recommendations
CREATE OR REPLACE FUNCTION get_connection_recommendations(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_types TEXT[] DEFAULT ARRAY['mutual_connection', 'university', 'department', 'year', 'interest']
)
RETURNS TABLE(
    recommended_user_id UUID,
    recommendation_type TEXT,
    confidence INTEGER,
    reasons TEXT[],
    mutual_connections UUID[],
    shared_interests TEXT[],
    metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH user_profile AS (
        SELECT up.*, u.email
        FROM user_profiles up
        INNER JOIN users u ON u.id = up.user_id
        WHERE up.user_id = p_user_id
    ),
    existing_connections AS (
        SELECT following_id
        FROM social_relationships 
        WHERE follower_id = p_user_id
        AND status = 'active'
        UNION
        SELECT follower_id
        FROM social_relationships 
        WHERE following_id = p_user_id
        AND relationship_type = 'block'
        AND status = 'active'
    ),
    mutual_connection_recommendations AS (
        SELECT 
            sr.following_id as recommended_user_id,
            'mutual_connection'::TEXT as recommendation_type,
            LEAST(80, 50 + (COUNT(*) * 5))::INTEGER as confidence,
            ARRAY['Mutual connections: ' || COUNT(*)::TEXT] as reasons,
            ARRAY_AGG(sr.follower_id) as mutual_connections,
            ARRAY[]::TEXT[] as shared_interests,
            jsonb_build_object(
                'mutual_connections_count', COUNT(*),
                'mutual_connection_ids', ARRAY_AGG(sr.follower_id)
            ) as metadata
        FROM social_relationships sr
        INNER JOIN social_relationships user_connections ON user_connections.following_id = sr.follower_id
        WHERE user_connections.follower_id = p_user_id
        AND sr.following_id NOT IN (SELECT following_id FROM existing_connections)
        AND sr.following_id != p_user_id
        AND sr.relationship_type = 'follow'
        AND sr.status = 'active'
        GROUP BY sr.following_id
        HAVING COUNT(*) >= 2
    ),
    university_recommendations AS (
        SELECT 
            up.user_id as recommended_user_id,
            'university'::TEXT as recommendation_type,
            70::INTEGER as confidence,
            ARRAY['Same university: ' || univ.name] as reasons,
            ARRAY[]::UUID[] as mutual_connections,
            ARRAY[]::TEXT[] as shared_interests,
            jsonb_build_object(
                'university_id', up.university_id,
                'university_name', univ.name
            ) as metadata
        FROM user_profiles up
        INNER JOIN universities univ ON univ.id = up.university_id
        INNER JOIN user_profile up_user ON up_user.university_id = up.university_id
        WHERE up.user_id != p_user_id
        AND up.user_id NOT IN (SELECT following_id FROM existing_connections)
        AND up.university_id = up_user.university_id
    )
    SELECT * FROM mutual_connection_recommendations
    WHERE 'mutual_connection' = ANY(p_types)
    UNION ALL
    SELECT * FROM university_recommendations
    WHERE 'university' = ANY(p_types)
    ORDER BY confidence DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Create materialized view for active relationships summary
CREATE MATERIALIZED VIEW IF NOT EXISTS active_relationships_summary AS
SELECT 
    follower_id,
    following_id,
    relationship_type,
    strength,
    created_at,
    updated_at,
    metadata->>'source' as source,
    metadata->'context'->>'universityId' as university_id,
    metadata->'context'->>'departmentId' as department_id,
    metadata->'context'->>'year' as year,
    metadata->'context'->'interests' as interests
FROM social_relationships
WHERE status = 'active';

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_active_relationships_summary_follower ON active_relationships_summary(follower_id);
CREATE INDEX IF NOT EXISTS idx_active_relationships_summary_following ON active_relationships_summary(following_id);
CREATE INDEX IF NOT EXISTS idx_active_relationships_summary_type ON active_relationships_summary(relationship_type);

-- Create materialized view for user connection counts
CREATE MATERIALIZED VIEW IF NOT EXISTS user_connection_counts AS
SELECT 
    u.id as user_id,
    COALESCE(followers.count, 0) as followers_count,
    COALESCE(following.count, 0) as following_count,
    COALESCE(blocks.count, 0) as blocks_count,
    COALESCE(university_connections.count, 0) as university_connections_count,
    COALESCE(department_connections.count, 0) as department_connections_count,
    COALESCE(year_connections.count, 0) as year_connections_count
FROM users u
LEFT JOIN (
    SELECT following_id, COUNT(*) as count
    FROM social_relationships
    WHERE relationship_type = 'follow' AND status = 'active'
    GROUP BY following_id
) followers ON followers.following_id = u.id
LEFT JOIN (
    SELECT follower_id, COUNT(*) as count
    FROM social_relationships
    WHERE relationship_type = 'follow' AND status = 'active'
    GROUP BY follower_id
) following ON following.follower_id = u.id
LEFT JOIN (
    SELECT follower_id, COUNT(*) as count
    FROM social_relationships
    WHERE relationship_type = 'block' AND status = 'active'
    GROUP BY follower_id
) blocks ON blocks.follower_id = u.id
LEFT JOIN (
    SELECT follower_id, COUNT(*) as count
    FROM social_relationships
    WHERE relationship_type = 'university_connection' AND status = 'active'
    GROUP BY follower_id
) university_connections ON university_connections.follower_id = u.id
LEFT JOIN (
    SELECT follower_id, COUNT(*) as count
    FROM social_relationships
    WHERE relationship_type = 'department_connection' AND status = 'active'
    GROUP BY follower_id
) department_connections ON department_connections.follower_id = u.id
LEFT JOIN (
    SELECT follower_id, COUNT(*) as count
    FROM social_relationships
    WHERE relationship_type = 'year_connection' AND status = 'active'
    GROUP BY follower_id
) year_connections ON year_connections.follower_id = u.id;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_user_connection_counts_user_id ON user_connection_counts(user_id);

-- Create function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_social_graph_views()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY active_relationships_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY user_connection_counts;
END;
$$ LANGUAGE plpgsql;

-- Create Row Level Security policies
ALTER TABLE social_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_graph_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE connection_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_graph_analytics ENABLE ROW LEVEL SECURITY;

-- RLS policies for social_relationships
CREATE POLICY "Users can view their own relationships" ON social_relationships
    FOR SELECT USING (
        follower_id = auth.uid() OR 
        following_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM social_relationships sr
            WHERE sr.follower_id = auth.uid() 
            AND sr.following_id = follower_id 
            AND sr.relationship_type = 'follow' 
            AND sr.status = 'active'
        )
    );

CREATE POLICY "Users can create their own relationships" ON social_relationships
    FOR INSERT WITH CHECK (follower_id = auth.uid());

CREATE POLICY "Users can update their own relationships" ON social_relationships
    FOR UPDATE USING (follower_id = auth.uid());

CREATE POLICY "Users can delete their own relationships" ON social_relationships
    FOR DELETE USING (follower_id = auth.uid());

-- RLS policies for social_graph_nodes
CREATE POLICY "Users can view their own nodes" ON social_graph_nodes
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM social_relationships sr
            WHERE sr.follower_id = auth.uid() 
            AND sr.following_id = user_id 
            AND sr.relationship_type = 'follow' 
            AND sr.status = 'active'
        )
    );

CREATE POLICY "Users can create their own nodes" ON social_graph_nodes
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own nodes" ON social_graph_nodes
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own nodes" ON social_graph_nodes
    FOR DELETE USING (user_id = auth.uid());

-- RLS policies for connection_recommendations
CREATE POLICY "Users can view their own recommendations" ON connection_recommendations
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own recommendations" ON connection_recommendations
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own recommendations" ON connection_recommendations
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own recommendations" ON connection_recommendations
    FOR DELETE USING (user_id = auth.uid());

-- RLS policies for social_graph_analytics
CREATE POLICY "Users can view their own analytics" ON social_graph_analytics
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can create analytics" ON social_graph_analytics
    FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update analytics" ON social_graph_analytics
    FOR UPDATE USING (true);

-- Create scheduled job to refresh materialized views (requires pg_cron extension)
-- SELECT cron.schedule('refresh-social-graph-views', '0 */6 * * *', 'SELECT refresh_social_graph_views();');

-- Create scheduled job to cleanup expired data
-- SELECT cron.schedule('cleanup-expired-relationships', '0 2 * * *', 'SELECT cleanup_expired_relationships();');
-- SELECT cron.schedule('cleanup-expired-recommendations', '0 3 * * *', 'SELECT cleanup_expired_recommendations();');

-- Insert sample data for testing (optional)
-- INSERT INTO social_relationships (follower_id, following_id, relationship_type, strength, metadata) VALUES
-- (uuid_generate_v4(), uuid_generate_v4(), 'follow', 75, '{"source": "manual", "confidence": 100}');

-- Add comments for documentation
COMMENT ON TABLE social_relationships IS 'Stores all social relationships between users including follows, blocks, and university connections';
COMMENT ON TABLE social_graph_nodes IS 'Represents nodes in the social graph with properties, connections, and metrics';
COMMENT ON TABLE connection_recommendations IS 'Stores system-generated connection recommendations for users';
COMMENT ON TABLE social_graph_analytics IS 'Aggregated analytics data for social graph metrics and insights';

COMMENT ON COLUMN social_relationships.strength IS 'Relationship strength score from 0-100 based on interactions and mutual connections';
COMMENT ON COLUMN social_relationships.metadata IS 'JSONB object containing relationship metadata like source, confidence, and context';
COMMENT ON COLUMN social_graph_nodes.properties IS 'JSONB object containing node properties like display name, university, and privacy settings';
COMMENT ON COLUMN social_graph_nodes.connections IS 'JSONB object containing connection counts and statistics';
COMMENT ON COLUMN social_graph_nodes.metrics IS 'JSONB object containing engagement and influence metrics';

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON social_relationships TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON social_graph_nodes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON connection_recommendations TO authenticated;
GRANT SELECT ON social_graph_analytics TO authenticated;

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION get_mutual_connections(UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_network_density(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_connection_recommendations(UUID, INTEGER, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION update_relationship_strength(UUID, INTEGER, INTEGER, DECIMAL) TO authenticated;
