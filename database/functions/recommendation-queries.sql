-- Friend Recommendation Database Functions
-- Author: ChitLaq Development Team
-- Date: 2024-01-15

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- Function to get user profile for recommendations
CREATE OR REPLACE FUNCTION get_user_profile_for_recommendations(
    p_user_id UUID
) RETURNS TABLE (
    user_id UUID,
    email TEXT,
    university_id UUID,
    university_name TEXT,
    department_id UUID,
    department_name TEXT,
    graduation_year INTEGER,
    major TEXT,
    interests TEXT[],
    location JSONB,
    profile_completion_score INTEGER,
    last_active TIMESTAMP WITH TIME ZONE,
    user_type TEXT,
    privacy_settings JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id as user_id,
        u.email,
        up.university_id,
        univ.name as university_name,
        up.department_id,
        dept.name as department_name,
        up.graduation_year,
        up.major,
        up.interests,
        up.location,
        up.profile_completion_score,
        u.last_active,
        up.user_type,
        up.privacy_settings
    FROM users u
    LEFT JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN universities univ ON up.university_id = univ.id
    LEFT JOIN departments dept ON up.department_id = dept.id
    WHERE u.id = p_user_id
    AND u.is_active = true
    AND u.email_verified = true;
END;
$$ LANGUAGE plpgsql;

-- Function to get candidate users for recommendations
CREATE OR REPLACE FUNCTION get_candidate_users_for_recommendations(
    p_user_id UUID,
    p_privacy_level TEXT DEFAULT 'university',
    p_limit INTEGER DEFAULT 100
) RETURNS TABLE (
    id UUID,
    email TEXT,
    university_id UUID,
    university_name TEXT,
    department_id UUID,
    department_name TEXT,
    graduation_year INTEGER,
    major TEXT,
    interests TEXT[],
    location JSONB,
    profile_completion_score INTEGER,
    last_active TIMESTAMP WITH TIME ZONE,
    user_type TEXT
) AS $$
DECLARE
    user_university_id UUID;
    user_department_id UUID;
    user_graduation_year INTEGER;
BEGIN
    -- Get user's university and department info
    SELECT up.university_id, up.department_id, up.graduation_year
    INTO user_university_id, user_department_id, user_graduation_year
    FROM user_profiles up
    WHERE up.user_id = p_user_id;

    RETURN QUERY
    SELECT 
        u.id,
        u.email,
        up.university_id,
        univ.name as university_name,
        up.department_id,
        dept.name as department_name,
        up.graduation_year,
        up.major,
        up.interests,
        up.location,
        up.profile_completion_score,
        u.last_active,
        up.user_type
    FROM users u
    INNER JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN universities univ ON up.university_id = univ.id
    LEFT JOIN departments dept ON up.department_id = dept.id
    WHERE u.id != p_user_id
    AND u.is_active = true
    AND u.email_verified = true
    AND up.profile_completion_score >= 50
    AND u.last_active > NOW() - INTERVAL '30 days'
    AND (
        CASE p_privacy_level
            WHEN 'university' THEN up.university_id = user_university_id
            WHEN 'department' THEN up.department_id = user_department_id
            WHEN 'year' THEN up.graduation_year = user_graduation_year
            ELSE true
        END
    )
    ORDER BY 
        CASE WHEN up.university_id = user_university_id THEN 1 ELSE 2 END,
        CASE WHEN up.department_id = user_department_id THEN 1 ELSE 2 END,
        CASE WHEN up.graduation_year = user_graduation_year THEN 1 ELSE 2 END,
        up.profile_completion_score DESC,
        u.last_active DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get mutual connections between two users
CREATE OR REPLACE FUNCTION get_mutual_connections(
    p_user1_id UUID,
    p_user2_id UUID
) RETURNS TABLE (
    user_id UUID,
    email TEXT,
    university_id UUID,
    university_name TEXT,
    department_id UUID,
    department_name TEXT,
    graduation_year INTEGER,
    major TEXT,
    interests TEXT[],
    location JSONB,
    profile_completion_score INTEGER,
    last_active TIMESTAMP WITH TIME ZONE,
    user_type TEXT,
    connection_strength FLOAT
) AS $$
BEGIN
    RETURN QUERY
    WITH user1_following AS (
        SELECT following_id
        FROM social_relationships
        WHERE follower_id = p_user1_id
        AND relationship_type = 'FOLLOW'
        AND status = 'ACTIVE'
    ),
    user2_following AS (
        SELECT following_id
        FROM social_relationships
        WHERE follower_id = p_user2_id
        AND relationship_type = 'FOLLOW'
        AND status = 'ACTIVE'
    ),
    mutual_following AS (
        SELECT u1f.following_id
        FROM user1_following u1f
        INNER JOIN user2_following u2f ON u1f.following_id = u2f.following_id
    )
    SELECT 
        u.id,
        u.email,
        up.university_id,
        univ.name as university_name,
        up.department_id,
        dept.name as department_name,
        up.graduation_year,
        up.major,
        up.interests,
        up.location,
        up.profile_completion_score,
        u.last_active,
        up.user_type,
        CASE 
            WHEN up.university_id = (SELECT university_id FROM user_profiles WHERE user_id = p_user1_id) THEN 1.0
            WHEN up.department_id = (SELECT department_id FROM user_profiles WHERE user_id = p_user1_id) THEN 0.8
            WHEN up.graduation_year = (SELECT graduation_year FROM user_profiles WHERE user_id = p_user1_id) THEN 0.6
            ELSE 0.4
        END as connection_strength
    FROM users u
    INNER JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN universities univ ON up.university_id = univ.id
    LEFT JOIN departments dept ON up.department_id = dept.id
    INNER JOIN mutual_following mf ON u.id = mf.following_id
    WHERE u.is_active = true
    AND u.email_verified = true
    ORDER BY connection_strength DESC, up.profile_completion_score DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get blocked users for a user
CREATE OR REPLACE FUNCTION get_blocked_users(
    p_user_id UUID
) RETURNS TABLE (
    blocked_user_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT sr.following_id as blocked_user_id
    FROM social_relationships sr
    WHERE sr.follower_id = p_user_id
    AND sr.relationship_type = 'BLOCK'
    AND sr.status = 'ACTIVE';
END;
$$ LANGUAGE plpgsql;

-- Function to get existing connections for a user
CREATE OR REPLACE FUNCTION get_existing_connections(
    p_user_id UUID
) RETURNS TABLE (
    connected_user_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT sr.following_id as connected_user_id
    FROM social_relationships sr
    WHERE sr.follower_id = p_user_id
    AND sr.relationship_type = 'FOLLOW'
    AND sr.status = 'ACTIVE'
    UNION
    SELECT sr.follower_id as connected_user_id
    FROM social_relationships sr
    WHERE sr.following_id = p_user_id
    AND sr.relationship_type = 'FOLLOW'
    AND sr.status = 'ACTIVE';
END;
$$ LANGUAGE plpgsql;

-- Function to calculate interest similarity between two users
CREATE OR REPLACE FUNCTION calculate_interest_similarity(
    p_user1_id UUID,
    p_user2_id UUID
) RETURNS TABLE (
    similarity_score FLOAT,
    shared_interests TEXT[],
    user1_interests TEXT[],
    user2_interests TEXT[],
    category_similarity JSONB
) AS $$
DECLARE
    user1_interests TEXT[];
    user2_interests TEXT[];
    shared_interests TEXT[];
    similarity_score FLOAT;
    category_similarity JSONB;
BEGIN
    -- Get interests for both users
    SELECT up1.interests, up2.interests
    INTO user1_interests, user2_interests
    FROM user_profiles up1, user_profiles up2
    WHERE up1.user_id = p_user1_id
    AND up2.user_id = p_user2_id;

    -- Calculate shared interests
    SELECT ARRAY(
        SELECT unnest(user1_interests)
        INTERSECT
        SELECT unnest(user2_interests)
    ) INTO shared_interests;

    -- Calculate similarity score using Jaccard similarity
    IF array_length(user1_interests, 1) IS NULL OR array_length(user2_interests, 1) IS NULL THEN
        similarity_score := 0.0;
    ELSE
        similarity_score := array_length(shared_interests, 1)::FLOAT / 
                           array_length(
                               ARRAY(
                                   SELECT unnest(user1_interests)
                                   UNION
                                   SELECT unnest(user2_interests)
                               ), 1
                           );
    END IF;

    -- Calculate category similarity (simplified)
    category_similarity := jsonb_build_object(
        'shared_count', array_length(shared_interests, 1),
        'user1_count', array_length(user1_interests, 1),
        'user2_count', array_length(user2_interests, 1),
        'jaccard_similarity', similarity_score
    );

    RETURN QUERY
    SELECT 
        similarity_score,
        shared_interests,
        user1_interests,
        user2_interests,
        category_similarity;
END;
$$ LANGUAGE plpgsql;

-- Function to get university-based recommendations
CREATE OR REPLACE FUNCTION get_university_recommendations(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 20
) RETURNS TABLE (
    user_id UUID,
    email TEXT,
    university_id UUID,
    university_name TEXT,
    department_id UUID,
    department_name TEXT,
    graduation_year INTEGER,
    major TEXT,
    interests TEXT[],
    location JSONB,
    profile_completion_score INTEGER,
    last_active TIMESTAMP WITH TIME ZONE,
    user_type TEXT,
    recommendation_score FLOAT
) AS $$
DECLARE
    user_university_id UUID;
    user_department_id UUID;
    user_graduation_year INTEGER;
BEGIN
    -- Get user's university and department info
    SELECT up.university_id, up.department_id, up.graduation_year
    INTO user_university_id, user_department_id, user_graduation_year
    FROM user_profiles up
    WHERE up.user_id = p_user_id;

    RETURN QUERY
    SELECT 
        u.id,
        u.email,
        up.university_id,
        univ.name as university_name,
        up.department_id,
        dept.name as department_name,
        up.graduation_year,
        up.major,
        up.interests,
        up.location,
        up.profile_completion_score,
        u.last_active,
        up.user_type,
        (
            CASE WHEN up.university_id = user_university_id THEN 1.0 ELSE 0.0 END +
            CASE WHEN up.department_id = user_department_id THEN 0.8 ELSE 0.0 END +
            CASE WHEN up.graduation_year = user_graduation_year THEN 0.6 ELSE 0.0 END +
            (up.profile_completion_score::FLOAT / 100.0) * 0.4 +
            CASE WHEN u.last_active > NOW() - INTERVAL '7 days' THEN 0.2 ELSE 0.0 END
        ) as recommendation_score
    FROM users u
    INNER JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN universities univ ON up.university_id = univ.id
    LEFT JOIN departments dept ON up.department_id = dept.id
    WHERE u.id != p_user_id
    AND u.is_active = true
    AND u.email_verified = true
    AND up.profile_completion_score >= 50
    AND u.last_active > NOW() - INTERVAL '30 days'
    AND up.university_id = user_university_id
    AND u.id NOT IN (
        SELECT sr.following_id
        FROM social_relationships sr
        WHERE sr.follower_id = p_user_id
        AND sr.relationship_type IN ('FOLLOW', 'BLOCK')
        AND sr.status = 'ACTIVE'
    )
    ORDER BY recommendation_score DESC, up.profile_completion_score DESC, u.last_active DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get department-based recommendations
CREATE OR REPLACE FUNCTION get_department_recommendations(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 20
) RETURNS TABLE (
    user_id UUID,
    email TEXT,
    university_id UUID,
    university_name TEXT,
    department_id UUID,
    department_name TEXT,
    graduation_year INTEGER,
    major TEXT,
    interests TEXT[],
    location JSONB,
    profile_completion_score INTEGER,
    last_active TIMESTAMP WITH TIME ZONE,
    user_type TEXT,
    recommendation_score FLOAT
) AS $$
DECLARE
    user_university_id UUID;
    user_department_id UUID;
    user_graduation_year INTEGER;
BEGIN
    -- Get user's university and department info
    SELECT up.university_id, up.department_id, up.graduation_year
    INTO user_university_id, user_department_id, user_graduation_year
    FROM user_profiles up
    WHERE up.user_id = p_user_id;

    RETURN QUERY
    SELECT 
        u.id,
        u.email,
        up.university_id,
        univ.name as university_name,
        up.department_id,
        dept.name as department_name,
        up.graduation_year,
        up.major,
        up.interests,
        up.location,
        up.profile_completion_score,
        u.last_active,
        up.user_type,
        (
            CASE WHEN up.department_id = user_department_id THEN 1.0 ELSE 0.0 END +
            CASE WHEN up.graduation_year = user_graduation_year THEN 0.8 ELSE 0.0 END +
            CASE WHEN up.university_id = user_university_id THEN 0.6 ELSE 0.0 END +
            (up.profile_completion_score::FLOAT / 100.0) * 0.4 +
            CASE WHEN u.last_active > NOW() - INTERVAL '7 days' THEN 0.2 ELSE 0.0 END
        ) as recommendation_score
    FROM users u
    INNER JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN universities univ ON up.university_id = univ.id
    LEFT JOIN departments dept ON up.department_id = dept.id
    WHERE u.id != p_user_id
    AND u.is_active = true
    AND u.email_verified = true
    AND up.profile_completion_score >= 50
    AND u.last_active > NOW() - INTERVAL '30 days'
    AND up.department_id = user_department_id
    AND u.id NOT IN (
        SELECT sr.following_id
        FROM social_relationships sr
        WHERE sr.follower_id = p_user_id
        AND sr.relationship_type IN ('FOLLOW', 'BLOCK')
        AND sr.status = 'ACTIVE'
    )
    ORDER BY recommendation_score DESC, up.profile_completion_score DESC, u.last_active DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get mutual connection recommendations
CREATE OR REPLACE FUNCTION get_mutual_connection_recommendations(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 20
) RETURNS TABLE (
    user_id UUID,
    email TEXT,
    university_id UUID,
    university_name TEXT,
    department_id UUID,
    department_name TEXT,
    graduation_year INTEGER,
    major TEXT,
    interests TEXT[],
    location JSONB,
    profile_completion_score INTEGER,
    last_active TIMESTAMP WITH TIME ZONE,
    user_type TEXT,
    mutual_connections_count INTEGER,
    recommendation_score FLOAT
) AS $$
BEGIN
    RETURN QUERY
    WITH user_following AS (
        SELECT following_id
        FROM social_relationships
        WHERE follower_id = p_user_id
        AND relationship_type = 'FOLLOW'
        AND status = 'ACTIVE'
    ),
    mutual_connections AS (
        SELECT 
            sr.following_id as candidate_id,
            COUNT(*) as mutual_count
        FROM social_relationships sr
        INNER JOIN user_following uf ON sr.follower_id = uf.following_id
        WHERE sr.relationship_type = 'FOLLOW'
        AND sr.status = 'ACTIVE'
        AND sr.following_id != p_user_id
        AND sr.following_id NOT IN (
            SELECT sr2.following_id
            FROM social_relationships sr2
            WHERE sr2.follower_id = p_user_id
            AND sr2.relationship_type IN ('FOLLOW', 'BLOCK')
            AND sr2.status = 'ACTIVE'
        )
        GROUP BY sr.following_id
        HAVING COUNT(*) >= 2
    )
    SELECT 
        u.id,
        u.email,
        up.university_id,
        univ.name as university_name,
        up.department_id,
        dept.name as department_name,
        up.graduation_year,
        up.major,
        up.interests,
        up.location,
        up.profile_completion_score,
        u.last_active,
        up.user_type,
        mc.mutual_count as mutual_connections_count,
        (
            (mc.mutual_count::FLOAT / 10.0) * 0.6 +
            (up.profile_completion_score::FLOAT / 100.0) * 0.3 +
            CASE WHEN u.last_active > NOW() - INTERVAL '7 days' THEN 0.1 ELSE 0.0 END
        ) as recommendation_score
    FROM users u
    INNER JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN universities univ ON up.university_id = univ.id
    LEFT JOIN departments dept ON up.department_id = dept.id
    INNER JOIN mutual_connections mc ON u.id = mc.candidate_id
    WHERE u.is_active = true
    AND u.email_verified = true
    AND up.profile_completion_score >= 50
    AND u.last_active > NOW() - INTERVAL '30 days'
    ORDER BY recommendation_score DESC, mc.mutual_count DESC, up.profile_completion_score DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get interest-based recommendations
CREATE OR REPLACE FUNCTION get_interest_based_recommendations(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 20
) RETURNS TABLE (
    user_id UUID,
    email TEXT,
    university_id UUID,
    university_name TEXT,
    department_id UUID,
    department_name TEXT,
    graduation_year INTEGER,
    major TEXT,
    interests TEXT[],
    location JSONB,
    profile_completion_score INTEGER,
    last_active TIMESTAMP WITH TIME ZONE,
    user_type TEXT,
    shared_interests_count INTEGER,
    recommendation_score FLOAT
) AS $$
DECLARE
    user_interests TEXT[];
BEGIN
    -- Get user's interests
    SELECT up.interests
    INTO user_interests
    FROM user_profiles up
    WHERE up.user_id = p_user_id;

    RETURN QUERY
    SELECT 
        u.id,
        u.email,
        up.university_id,
        univ.name as university_name,
        up.department_id,
        dept.name as department_name,
        up.graduation_year,
        up.major,
        up.interests,
        up.location,
        up.profile_completion_score,
        u.last_active,
        up.user_type,
        array_length(
            ARRAY(
                SELECT unnest(user_interests)
                INTERSECT
                SELECT unnest(up.interests)
            ), 1
        ) as shared_interests_count,
        (
            (array_length(
                ARRAY(
                    SELECT unnest(user_interests)
                    INTERSECT
                    SELECT unnest(up.interests)
                ), 1
            )::FLOAT / array_length(user_interests, 1)) * 0.7 +
            (up.profile_completion_score::FLOAT / 100.0) * 0.2 +
            CASE WHEN u.last_active > NOW() - INTERVAL '7 days' THEN 0.1 ELSE 0.0 END
        ) as recommendation_score
    FROM users u
    INNER JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN universities univ ON up.university_id = univ.id
    LEFT JOIN departments dept ON up.department_id = dept.id
    WHERE u.id != p_user_id
    AND u.is_active = true
    AND u.email_verified = true
    AND up.profile_completion_score >= 50
    AND u.last_active > NOW() - INTERVAL '30 days'
    AND up.interests && user_interests
    AND u.id NOT IN (
        SELECT sr.following_id
        FROM social_relationships sr
        WHERE sr.follower_id = p_user_id
        AND sr.relationship_type IN ('FOLLOW', 'BLOCK')
        AND sr.status = 'ACTIVE'
    )
    ORDER BY recommendation_score DESC, shared_interests_count DESC, up.profile_completion_score DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get comprehensive friend recommendations
CREATE OR REPLACE FUNCTION get_comprehensive_friend_recommendations(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_privacy_level TEXT DEFAULT 'university'
) RETURNS TABLE (
    user_id UUID,
    email TEXT,
    university_id UUID,
    university_name TEXT,
    department_id UUID,
    department_name TEXT,
    graduation_year INTEGER,
    major TEXT,
    interests TEXT[],
    location JSONB,
    profile_completion_score INTEGER,
    last_active TIMESTAMP WITH TIME ZONE,
    user_type TEXT,
    recommendation_score FLOAT,
    recommendation_factors JSONB
) AS $$
DECLARE
    user_university_id UUID;
    user_department_id UUID;
    user_graduation_year INTEGER;
    user_interests TEXT[];
BEGIN
    -- Get user's profile information
    SELECT up.university_id, up.department_id, up.graduation_year, up.interests
    INTO user_university_id, user_department_id, user_graduation_year, user_interests
    FROM user_profiles up
    WHERE up.user_id = p_user_id;

    RETURN QUERY
    WITH candidate_users AS (
        SELECT 
            u.id,
            u.email,
            up.university_id,
            univ.name as university_name,
            up.department_id,
            dept.name as department_name,
            up.graduation_year,
            up.major,
            up.interests,
            up.location,
            up.profile_completion_score,
            u.last_active,
            up.user_type,
            -- University factor
            CASE WHEN up.university_id = user_university_id THEN 1.0 ELSE 0.0 END as university_factor,
            -- Department factor
            CASE WHEN up.department_id = user_department_id THEN 1.0 ELSE 0.0 END as department_factor,
            -- Graduation year factor
            CASE WHEN up.graduation_year = user_graduation_year THEN 1.0 ELSE 0.0 END as year_factor,
            -- Interest similarity factor
            (array_length(
                ARRAY(
                    SELECT unnest(user_interests)
                    INTERSECT
                    SELECT unnest(up.interests)
                ), 1
            )::FLOAT / NULLIF(array_length(user_interests, 1), 0)) as interest_factor,
            -- Profile completion factor
            (up.profile_completion_score::FLOAT / 100.0) as completion_factor,
            -- Activity factor
            CASE WHEN u.last_active > NOW() - INTERVAL '7 days' THEN 1.0 ELSE 0.0 END as activity_factor
        FROM users u
        INNER JOIN user_profiles up ON u.id = up.user_id
        LEFT JOIN universities univ ON up.university_id = univ.id
        LEFT JOIN departments dept ON up.department_id = dept.id
        WHERE u.id != p_user_id
        AND u.is_active = true
        AND u.email_verified = true
        AND up.profile_completion_score >= 50
        AND u.last_active > NOW() - INTERVAL '30 days'
        AND (
            CASE p_privacy_level
                WHEN 'university' THEN up.university_id = user_university_id
                WHEN 'department' THEN up.department_id = user_department_id
                WHEN 'year' THEN up.graduation_year = user_graduation_year
                ELSE true
            END
        )
        AND u.id NOT IN (
            SELECT sr.following_id
            FROM social_relationships sr
            WHERE sr.follower_id = p_user_id
            AND sr.relationship_type IN ('FOLLOW', 'BLOCK')
            AND sr.status = 'ACTIVE'
        )
    )
    SELECT 
        cu.id,
        cu.email,
        cu.university_id,
        cu.university_name,
        cu.department_id,
        cu.department_name,
        cu.graduation_year,
        cu.major,
        cu.interests,
        cu.location,
        cu.profile_completion_score,
        cu.last_active,
        cu.user_type,
        -- Weighted recommendation score
        (
            cu.university_factor * 0.40 +
            cu.department_factor * 0.25 +
            cu.year_factor * 0.15 +
            cu.interest_factor * 0.15 +
            cu.completion_factor * 0.03 +
            cu.activity_factor * 0.02
        ) as recommendation_score,
        -- Recommendation factors breakdown
        jsonb_build_object(
            'university_factor', cu.university_factor,
            'department_factor', cu.department_factor,
            'year_factor', cu.year_factor,
            'interest_factor', cu.interest_factor,
            'completion_factor', cu.completion_factor,
            'activity_factor', cu.activity_factor
        ) as recommendation_factors
    FROM candidate_users cu
    ORDER BY recommendation_score DESC, cu.profile_completion_score DESC, cu.last_active DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to update recommendation cache
CREATE OR REPLACE FUNCTION update_recommendation_cache(
    p_user_id UUID,
    p_recommendations JSONB,
    p_ttl_seconds INTEGER DEFAULT 300
) RETURNS BOOLEAN AS $$
BEGIN
    -- This function would typically interact with Redis
    -- For now, we'll just return true as a placeholder
    -- In a real implementation, this would use a Redis extension or external service
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to get recommendation statistics
CREATE OR REPLACE FUNCTION get_recommendation_statistics(
    p_user_id UUID
) RETURNS TABLE (
    total_recommendations INTEGER,
    university_recommendations INTEGER,
    department_recommendations INTEGER,
    mutual_connection_recommendations INTEGER,
    interest_based_recommendations INTEGER,
    average_score FLOAT,
    last_updated TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_recommendations,
        COUNT(CASE WHEN up.university_id = (SELECT university_id FROM user_profiles WHERE user_id = p_user_id) THEN 1 END)::INTEGER as university_recommendations,
        COUNT(CASE WHEN up.department_id = (SELECT department_id FROM user_profiles WHERE user_id = p_user_id) THEN 1 END)::INTEGER as department_recommendations,
        0::INTEGER as mutual_connection_recommendations, -- Placeholder
        0::INTEGER as interest_based_recommendations, -- Placeholder
        AVG(up.profile_completion_score)::FLOAT as average_score,
        NOW() as last_updated
    FROM users u
    INNER JOIN user_profiles up ON u.id = up.user_id
    WHERE u.id != p_user_id
    AND u.is_active = true
    AND u.email_verified = true
    AND up.profile_completion_score >= 50
    AND u.last_active > NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_university_department 
ON user_profiles(university_id, department_id);

CREATE INDEX IF NOT EXISTS idx_user_profiles_graduation_year 
ON user_profiles(graduation_year);

CREATE INDEX IF NOT EXISTS idx_user_profiles_interests 
ON user_profiles USING GIN(interests);

CREATE INDEX IF NOT EXISTS idx_user_profiles_completion_score 
ON user_profiles(profile_completion_score);

CREATE INDEX IF NOT EXISTS idx_users_last_active 
ON users(last_active);

CREATE INDEX IF NOT EXISTS idx_social_relationships_follower_following 
ON social_relationships(follower_id, following_id, relationship_type, status);

-- Create materialized view for recommendation performance
CREATE MATERIALIZED VIEW IF NOT EXISTS recommendation_performance_stats AS
SELECT 
    DATE_TRUNC('day', NOW()) as date,
    COUNT(DISTINCT u.id) as total_active_users,
    COUNT(DISTINCT up.university_id) as total_universities,
    COUNT(DISTINCT up.department_id) as total_departments,
    AVG(up.profile_completion_score) as avg_completion_score,
    COUNT(DISTINCT sr.follower_id) as total_connections,
    AVG(up.profile_completion_score) FILTER (WHERE up.profile_completion_score >= 80) as avg_completion_high_quality
FROM users u
INNER JOIN user_profiles up ON u.id = up.user_id
LEFT JOIN social_relationships sr ON u.id = sr.follower_id AND sr.relationship_type = 'FOLLOW' AND sr.status = 'ACTIVE'
WHERE u.is_active = true
AND u.email_verified = true
AND u.last_active > NOW() - INTERVAL '30 days';

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_recommendation_performance_stats_date 
ON recommendation_performance_stats(date);

-- Refresh materialized view function
CREATE OR REPLACE FUNCTION refresh_recommendation_performance_stats()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY recommendation_performance_stats;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_profile_for_recommendations(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_candidate_users_for_recommendations(UUID, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_mutual_connections(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_blocked_users(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_existing_connections(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_interest_similarity(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_university_recommendations(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_department_recommendations(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_mutual_connection_recommendations(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_interest_based_recommendations(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_comprehensive_friend_recommendations(UUID, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_recommendation_cache(UUID, JSONB, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_recommendation_statistics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_recommendation_performance_stats() TO authenticated;

-- Grant select on materialized view
GRANT SELECT ON recommendation_performance_stats TO authenticated;
