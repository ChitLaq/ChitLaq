-- Relationship Functions for Social Graph System
-- Author: ChitLaq Development Team
-- Date: 2024-01-15

-- Function to create a new relationship
CREATE OR REPLACE FUNCTION create_relationship(
    p_follower_id UUID,
    p_following_id UUID,
    p_relationship_type VARCHAR(50),
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    relationship_id UUID;
    initial_strength INTEGER;
BEGIN
    -- Validate inputs
    IF p_follower_id = p_following_id THEN
        RAISE EXCEPTION 'Cannot create relationship with self';
    END IF;
    
    IF p_relationship_type NOT IN (
        'follow', 'block', 'university_connection', 'mutual_connection',
        'recommended_connection', 'alumni_connection', 'department_connection',
        'year_connection', 'interest_connection', 'event_connection'
    ) THEN
        RAISE EXCEPTION 'Invalid relationship type: %', p_relationship_type;
    END IF;
    
    -- Check if relationship already exists
    IF EXISTS (
        SELECT 1 FROM social_relationships 
        WHERE follower_id = p_follower_id 
        AND following_id = p_following_id 
        AND relationship_type = p_relationship_type
    ) THEN
        RAISE EXCEPTION 'Relationship already exists';
    END IF;
    
    -- Check for blocking relationships
    IF EXISTS (
        SELECT 1 FROM social_relationships 
        WHERE (follower_id = p_follower_id AND following_id = p_following_id AND relationship_type = 'block')
        OR (follower_id = p_following_id AND following_id = p_follower_id AND relationship_type = 'block')
    ) THEN
        RAISE EXCEPTION 'Blocking relationship exists';
    END IF;
    
    -- Calculate initial strength
    initial_strength := CASE p_relationship_type
        WHEN 'follow' THEN 50
        WHEN 'block' THEN 0
        WHEN 'university_connection' THEN 70
        WHEN 'mutual_connection' THEN 80
        WHEN 'recommended_connection' THEN 60
        WHEN 'alumni_connection' THEN 75
        WHEN 'department_connection' THEN 65
        WHEN 'year_connection' THEN 60
        WHEN 'interest_connection' THEN 55
        WHEN 'event_connection' THEN 50
        ELSE 50
    END;
    
    -- Adjust strength based on metadata
    IF p_metadata ? 'confidence' THEN
        initial_strength := (initial_strength * (p_metadata->>'confidence')::INTEGER) / 100;
    END IF;
    
    IF p_metadata ? 'context' AND p_metadata->'context' ? 'mutualConnections' THEN
        initial_strength := initial_strength + LEAST((p_metadata->'context'->>'mutualConnections')::INTEGER * 2, 20);
    END IF;
    
    IF p_metadata ? 'context' AND p_metadata->'context' ? 'interactionScore' THEN
        initial_strength := initial_strength + LEAST((p_metadata->'context'->>'interactionScore')::INTEGER, 10);
    END IF;
    
    -- Clamp strength to valid range
    initial_strength := GREATEST(0, LEAST(100, initial_strength));
    
    -- Create relationship
    INSERT INTO social_relationships (
        follower_id, following_id, relationship_type, strength, metadata
    ) VALUES (
        p_follower_id, p_following_id, p_relationship_type, initial_strength, p_metadata
    ) RETURNING id INTO relationship_id;
    
    -- Update connection counts
    IF p_relationship_type = 'follow' THEN
        UPDATE social_graph_nodes 
        SET connections = jsonb_set(
            jsonb_set(connections, '{following}', to_jsonb((connections->>'following')::INTEGER + 1)),
            '{followers}', to_jsonb((connections->>'followers')::INTEGER + 1)
        )
        WHERE user_id IN (p_follower_id, p_following_id);
    ELSIF p_relationship_type = 'block' THEN
        UPDATE social_graph_nodes 
        SET connections = jsonb_set(connections, '{blockedUsers}', to_jsonb((connections->>'blockedUsers')::INTEGER + 1))
        WHERE user_id = p_follower_id;
    END IF;
    
    RETURN relationship_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update relationship strength
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
    relationship_updated_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get current relationship
    SELECT strength, updated_at INTO current_strength, relationship_updated_at
    FROM social_relationships 
    WHERE id = p_relationship_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Relationship not found';
    END IF;
    
    -- Calculate new strength
    new_strength := current_strength;
    
    -- Boost from interactions
    new_strength := new_strength + LEAST(p_interactions * 0.5, 20);
    
    -- Boost from mutual connections
    new_strength := new_strength + LEAST(p_mutual_connections * 1, 15);
    
    -- Time decay
    days_since_update := EXTRACT(EPOCH FROM (NOW() - relationship_updated_at)) / 86400;
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

-- Function to get mutual connections
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

-- Function to calculate network density
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

-- Function to get connection recommendations
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
    ),
    department_recommendations AS (
        SELECT 
            up.user_id as recommended_user_id,
            'department'::TEXT as recommendation_type,
            65::INTEGER as confidence,
            ARRAY['Same department: ' || dept.name] as reasons,
            ARRAY[]::UUID[] as mutual_connections,
            ARRAY[]::TEXT[] as shared_interests,
            jsonb_build_object(
                'department_id', up.department_id,
                'department_name', dept.name
            ) as metadata
        FROM user_profiles up
        INNER JOIN departments dept ON dept.id = up.department_id
        INNER JOIN user_profile up_user ON up_user.department_id = up.department_id
        WHERE up.user_id != p_user_id
        AND up.user_id NOT IN (SELECT following_id FROM existing_connections)
        AND up.department_id = up_user.department_id
        AND up.department_id IS NOT NULL
    ),
    year_recommendations AS (
        SELECT 
            up.user_id as recommended_user_id,
            'year'::TEXT as recommendation_type,
            60::INTEGER as confidence,
            ARRAY['Same academic year: ' || up.graduation_year::TEXT] as reasons,
            ARRAY[]::UUID[] as mutual_connections,
            ARRAY[]::TEXT[] as shared_interests,
            jsonb_build_object(
                'graduation_year', up.graduation_year
            ) as metadata
        FROM user_profiles up
        INNER JOIN user_profile up_user ON up_user.graduation_year = up.graduation_year
        WHERE up.user_id != p_user_id
        AND up.user_id NOT IN (SELECT following_id FROM existing_connections)
        AND up.graduation_year = up_user.graduation_year
        AND up.graduation_year IS NOT NULL
    ),
    interest_recommendations AS (
        SELECT 
            up.user_id as recommended_user_id,
            'interest'::TEXT as recommendation_type,
            55::INTEGER as confidence,
            ARRAY['Shared interests: ' || array_to_string(up.interests, ', ')] as reasons,
            ARRAY[]::UUID[] as mutual_connections,
            up.interests as shared_interests,
            jsonb_build_object(
                'shared_interests', up.interests,
                'interest_count', array_length(up.interests, 1)
            ) as metadata
        FROM user_profiles up
        INNER JOIN user_profile up_user ON up_user.interests && up.interests
        WHERE up.user_id != p_user_id
        AND up.user_id NOT IN (SELECT following_id FROM existing_connections)
        AND up.interests && up_user.interests
        AND up.interests IS NOT NULL
    )
    SELECT * FROM mutual_connection_recommendations
    WHERE 'mutual_connection' = ANY(p_types)
    UNION ALL
    SELECT * FROM university_recommendations
    WHERE 'university' = ANY(p_types)
    UNION ALL
    SELECT * FROM department_recommendations
    WHERE 'department' = ANY(p_types)
    UNION ALL
    SELECT * FROM year_recommendations
    WHERE 'year' = ANY(p_types)
    UNION ALL
    SELECT * FROM interest_recommendations
    WHERE 'interest' = ANY(p_types)
    ORDER BY confidence DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get relationship statistics
CREATE OR REPLACE FUNCTION get_relationship_statistics(p_user_id UUID)
RETURNS TABLE(
    relationship_type VARCHAR(50),
    count INTEGER,
    average_strength DECIMAL,
    active_count INTEGER,
    pending_count INTEGER,
    blocked_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sr.relationship_type,
        COUNT(*)::INTEGER as count,
        AVG(sr.strength)::DECIMAL as average_strength,
        COUNT(*) FILTER (WHERE sr.status = 'active')::INTEGER as active_count,
        COUNT(*) FILTER (WHERE sr.status = 'pending')::INTEGER as pending_count,
        COUNT(*) FILTER (WHERE sr.status = 'blocked')::INTEGER as blocked_count
    FROM social_relationships sr
    WHERE sr.follower_id = p_user_id OR sr.following_id = p_user_id
    GROUP BY sr.relationship_type
    ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to find shortest path between users
CREATE OR REPLACE FUNCTION find_shortest_path(
    p_start_user_id UUID,
    p_end_user_id UUID,
    p_max_depth INTEGER DEFAULT 6
)
RETURNS TABLE(
    path_length INTEGER,
    path_users UUID[],
    path_relationships UUID[]
) AS $$
DECLARE
    current_depth INTEGER := 0;
    found_path BOOLEAN := FALSE;
    path_users UUID[] := ARRAY[p_start_user_id];
    path_relationships UUID[] := ARRAY[]::UUID[];
BEGIN
    -- Check if users are the same
    IF p_start_user_id = p_end_user_id THEN
        RETURN QUERY SELECT 0, ARRAY[p_start_user_id], ARRAY[]::UUID[];
        RETURN;
    END IF;
    
    -- Check for direct connection
    IF EXISTS (
        SELECT 1 FROM social_relationships 
        WHERE follower_id = p_start_user_id 
        AND following_id = p_end_user_id 
        AND relationship_type = 'follow' 
        AND status = 'active'
    ) THEN
        RETURN QUERY 
        SELECT 1, ARRAY[p_start_user_id, p_end_user_id], 
               ARRAY[(SELECT id FROM social_relationships 
                     WHERE follower_id = p_start_user_id 
                     AND following_id = p_end_user_id 
                     AND relationship_type = 'follow' 
                     AND status = 'active' LIMIT 1)];
        RETURN;
    END IF;
    
    -- Use recursive CTE to find shortest path
    WITH RECURSIVE path_search AS (
        -- Base case: start with the start user
        SELECT 
            p_start_user_id as user_id,
            0 as depth,
            ARRAY[p_start_user_id] as path,
            ARRAY[]::UUID[] as relationships
        UNION ALL
        -- Recursive case: find connected users
        SELECT 
            CASE 
                WHEN sr.follower_id = ps.user_id THEN sr.following_id
                ELSE sr.follower_id
            END as user_id,
            ps.depth + 1,
            ps.path || CASE 
                WHEN sr.follower_id = ps.user_id THEN sr.following_id
                ELSE sr.follower_id
            END,
            ps.relationships || sr.id
        FROM path_search ps
        INNER JOIN social_relationships sr ON (
            sr.follower_id = ps.user_id OR sr.following_id = ps.user_id
        )
        WHERE ps.depth < p_max_depth
        AND sr.relationship_type = 'follow'
        AND sr.status = 'active'
        AND NOT (CASE 
            WHEN sr.follower_id = ps.user_id THEN sr.following_id
            ELSE sr.follower_id
        END = ANY(ps.path)) -- Avoid cycles
    )
    SELECT 
        ps.depth,
        ps.path,
        ps.relationships
    FROM path_search ps
    WHERE ps.user_id = p_end_user_id
    ORDER BY ps.depth
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to get network influence score
CREATE OR REPLACE FUNCTION calculate_influence_score(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    followers_count INTEGER;
    following_count INTEGER;
    mutual_count INTEGER;
    engagement_score INTEGER;
    network_density DECIMAL;
    influence_score INTEGER;
BEGIN
    -- Get basic counts
    SELECT 
        COUNT(*) FILTER (WHERE follower_id = p_user_id AND relationship_type = 'follow' AND status = 'active'),
        COUNT(*) FILTER (WHERE following_id = p_user_id AND relationship_type = 'follow' AND status = 'active')
    INTO followers_count, following_count
    FROM social_relationships;
    
    -- Calculate mutual connections
    SELECT COUNT(*) INTO mutual_count
    FROM social_relationships sr1
    INNER JOIN social_relationships sr2 ON sr1.following_id = sr2.follower_id
    WHERE sr1.follower_id = p_user_id 
    AND sr2.following_id = p_user_id
    AND sr1.relationship_type = 'follow' 
    AND sr2.relationship_type = 'follow'
    AND sr1.status = 'active' 
    AND sr2.status = 'active';
    
    -- Calculate network density
    SELECT calculate_network_density(p_user_id) INTO network_density;
    
    -- Calculate engagement score (simplified)
    SELECT COALESCE(
        (SELECT AVG(strength) FROM social_relationships 
         WHERE follower_id = p_user_id AND relationship_type = 'follow' AND status = 'active'), 0
    ) INTO engagement_score;
    
    -- Calculate influence score (0-100)
    influence_score := LEAST(100, 
        (followers_count * 2) + 
        (mutual_count * 3) + 
        (network_density * 20) + 
        (engagement_score * 0.5)
    );
    
    RETURN GREATEST(0, influence_score);
END;
$$ LANGUAGE plpgsql;

-- Function to get relationship timeline
CREATE OR REPLACE FUNCTION get_relationship_timeline(
    p_user_id UUID,
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE(
    date DATE,
    relationships_created INTEGER,
    relationships_deleted INTEGER,
    net_growth INTEGER,
    total_relationships INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH date_series AS (
        SELECT generate_series(
            CURRENT_DATE - INTERVAL '1 day' * p_days,
            CURRENT_DATE,
            INTERVAL '1 day'
        )::DATE as date
    ),
    daily_changes AS (
        SELECT 
            ds.date,
            COUNT(*) FILTER (WHERE DATE(sr.created_at) = ds.date) as created,
            COUNT(*) FILTER (WHERE DATE(sr.updated_at) = ds.date AND sr.status = 'archived') as deleted
        FROM date_series ds
        LEFT JOIN social_relationships sr ON (
            sr.follower_id = p_user_id OR sr.following_id = p_user_id
        )
        GROUP BY ds.date
    ),
    cumulative_totals AS (
        SELECT 
            date,
            created,
            deleted,
            created - deleted as net_growth,
            SUM(created - deleted) OVER (ORDER BY date) as running_total
        FROM daily_changes
    )
    SELECT 
        date,
        created::INTEGER,
        deleted::INTEGER,
        net_growth::INTEGER,
        running_total::INTEGER
    FROM cumulative_totals
    ORDER BY date;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired relationships
CREATE OR REPLACE FUNCTION cleanup_expired_relationships()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM social_relationships 
    WHERE expires_at IS NOT NULL AND expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log cleanup activity
    INSERT INTO system_logs (level, message, metadata)
    VALUES ('INFO', 'Expired relationships cleaned up', 
            jsonb_build_object('deleted_count', deleted_count, 'timestamp', NOW()));
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired recommendations
CREATE OR REPLACE FUNCTION cleanup_expired_recommendations()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE connection_recommendations 
    SET status = 'expired' 
    WHERE expires_at < NOW() AND status = 'pending';
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    -- Log cleanup activity
    INSERT INTO system_logs (level, message, metadata)
    VALUES ('INFO', 'Expired recommendations cleaned up', 
            jsonb_build_object('updated_count', updated_count, 'timestamp', NOW()));
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_social_graph_views()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY active_relationships_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY user_connection_counts;
    
    -- Log refresh activity
    INSERT INTO system_logs (level, message, metadata)
    VALUES ('INFO', 'Social graph materialized views refreshed', 
            jsonb_build_object('timestamp', NOW()));
END;
$$ LANGUAGE plpgsql;

-- Function to get relationship analytics
CREATE OR REPLACE FUNCTION get_relationship_analytics(
    p_user_id UUID,
    p_period VARCHAR(20) DEFAULT 'weekly'
)
RETURNS TABLE(
    period_start DATE,
    period_end DATE,
    total_relationships INTEGER,
    new_relationships INTEGER,
    lost_relationships INTEGER,
    net_growth INTEGER,
    growth_rate DECIMAL,
    average_strength DECIMAL,
    top_relationship_types JSONB
) AS $$
DECLARE
    period_interval INTERVAL;
    period_start_date DATE;
    period_end_date DATE;
BEGIN
    -- Determine period interval
    period_interval := CASE p_period
        WHEN 'daily' THEN INTERVAL '1 day'
        WHEN 'weekly' THEN INTERVAL '1 week'
        WHEN 'monthly' THEN INTERVAL '1 month'
        WHEN 'yearly' THEN INTERVAL '1 year'
        ELSE INTERVAL '1 week'
    END;
    
    period_end_date := CURRENT_DATE;
    period_start_date := CURRENT_DATE - period_interval;
    
    RETURN QUERY
    WITH period_relationships AS (
        SELECT *
        FROM social_relationships
        WHERE (follower_id = p_user_id OR following_id = p_user_id)
        AND created_at >= period_start_date
        AND created_at < period_end_date
    ),
    previous_period_relationships AS (
        SELECT *
        FROM social_relationships
        WHERE (follower_id = p_user_id OR following_id = p_user_id)
        AND created_at >= (period_start_date - period_interval)
        AND created_at < period_start_date
    ),
    relationship_type_stats AS (
        SELECT 
            relationship_type,
            COUNT(*) as count
        FROM period_relationships
        GROUP BY relationship_type
        ORDER BY count DESC
        LIMIT 5
    )
    SELECT 
        period_start_date,
        period_end_date,
        (SELECT COUNT(*) FROM period_relationships)::INTEGER,
        (SELECT COUNT(*) FROM period_relationships WHERE status = 'active')::INTEGER,
        (SELECT COUNT(*) FROM previous_period_relationships WHERE status = 'archived')::INTEGER,
        ((SELECT COUNT(*) FROM period_relationships WHERE status = 'active') - 
         (SELECT COUNT(*) FROM previous_period_relationships WHERE status = 'archived'))::INTEGER,
        CASE 
            WHEN (SELECT COUNT(*) FROM previous_period_relationships) > 0 THEN
                (((SELECT COUNT(*) FROM period_relationships WHERE status = 'active') - 
                  (SELECT COUNT(*) FROM previous_period_relationships WHERE status = 'archived'))::DECIMAL / 
                 (SELECT COUNT(*) FROM previous_period_relationships)::DECIMAL) * 100
            ELSE 0
        END,
        (SELECT AVG(strength) FROM period_relationships)::DECIMAL,
        (SELECT jsonb_agg(jsonb_build_object('type', relationship_type, 'count', count)) 
         FROM relationship_type_stats)::JSONB;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_relationship(UUID, UUID, VARCHAR(50), JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION update_relationship_strength(UUID, INTEGER, INTEGER, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION get_mutual_connections(UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_network_density(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_connection_recommendations(UUID, INTEGER, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_relationship_statistics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION find_shortest_path(UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_influence_score(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_relationship_timeline(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_relationship_analytics(UUID, VARCHAR(20)) TO authenticated;

-- Grant system functions to service role
GRANT EXECUTE ON FUNCTION cleanup_expired_relationships() TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_expired_recommendations() TO service_role;
GRANT EXECUTE ON FUNCTION refresh_social_graph_views() TO service_role;

-- Add comments for documentation
COMMENT ON FUNCTION create_relationship(UUID, UUID, VARCHAR(50), JSONB) IS 'Creates a new social relationship between two users with validation and strength calculation';
COMMENT ON FUNCTION update_relationship_strength(UUID, INTEGER, INTEGER, DECIMAL) IS 'Updates relationship strength based on interactions, mutual connections, and time decay';
COMMENT ON FUNCTION get_mutual_connections(UUID, UUID, INTEGER) IS 'Finds mutual connections between two users with detailed information';
COMMENT ON FUNCTION calculate_network_density(UUID) IS 'Calculates the density of a user''s social network';
COMMENT ON FUNCTION get_connection_recommendations(UUID, INTEGER, TEXT[]) IS 'Generates personalized connection recommendations based on various factors';
COMMENT ON FUNCTION get_relationship_statistics(UUID) IS 'Returns comprehensive statistics about a user''s relationships';
COMMENT ON FUNCTION find_shortest_path(UUID, UUID, INTEGER) IS 'Finds the shortest path between two users in the social graph';
COMMENT ON FUNCTION calculate_influence_score(UUID) IS 'Calculates a user''s influence score based on network metrics';
COMMENT ON FUNCTION get_relationship_timeline(UUID, INTEGER) IS 'Returns a timeline of relationship changes for a user';
COMMENT ON FUNCTION get_relationship_analytics(UUID, VARCHAR(20)) IS 'Returns detailed analytics about a user''s relationships for a given period';
COMMENT ON FUNCTION cleanup_expired_relationships() IS 'Cleans up expired relationships and logs the activity';
COMMENT ON FUNCTION cleanup_expired_recommendations() IS 'Marks expired recommendations as expired and logs the activity';
COMMENT ON FUNCTION refresh_social_graph_views() IS 'Refreshes materialized views for social graph data';
