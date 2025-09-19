-- database/query-optimization.sql
-- ChitLaq M1 MVP - Database Query Optimization
-- Senior Performance Engineer - 15+ years database optimization experience

-- ============================================================================
-- QUERY OPTIMIZATION FOR CHITLAQ M1 MVP
-- ============================================================================
-- This file contains optimized SQL queries, indexes, and performance
-- improvements for the ChitLaq social media platform.
--
-- Features:
-- - Optimized queries for common operations
-- - Performance indexes and constraints
-- - Query execution plans and analysis
-- - Database function optimizations
-- - Monitoring and profiling queries
-- ============================================================================

-- ============================================================================
-- 1. PERFORMANCE INDEXES
-- ============================================================================

-- User table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_hash ON users USING hash(email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_username_btree ON users USING btree(username);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_university ON users(university);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at_desc ON users(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_last_active ON users(last_active DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_verified ON users(verified) WHERE verified = true;

-- User profile indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_profiles_bio_gin ON user_profiles USING gin(to_tsvector('english', bio));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_profiles_location ON user_profiles(location);

-- Post table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_user_id_created ON posts(user_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_created_at_desc ON posts(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_likes_count_desc ON posts(likes_count DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_comments_count_desc ON posts(comments_count DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_content_gin ON posts USING gin(to_tsvector('english', content));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_hashtags_gin ON posts USING gin(hashtags);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_mentions_gin ON posts USING gin(mentions);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_visibility ON posts(visibility);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_deleted ON posts(deleted_at) WHERE deleted_at IS NULL;

-- Message table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_created_at_desc ON messages(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_read_status ON messages(read_at) WHERE read_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_content_gin ON messages USING gin(to_tsvector('english', content));

-- Conversation table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_participants_gin ON conversations USING gin(participants);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_updated_at_desc ON conversations(updated_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_type ON conversations(type);

-- User relationships indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_follows_user_following ON user_follows(user_id, following_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_follows_following_user ON user_follows(following_id, user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_follows_created_at ON user_follows(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_blocks_user_blocked ON user_blocks(user_id, blocked_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_blocks_blocked_user ON user_blocks(blocked_id, user_id);

-- Post interactions indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_likes_post_user ON post_likes(post_id, user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_likes_user_post ON post_likes(user_id, post_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_likes_created_at ON post_likes(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_comments_post_created ON post_comments(post_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_comments_user_created ON post_comments(user_id, created_at DESC);

-- Notification indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_read_status ON notifications(read_at) WHERE read_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_type ON notifications(type);

-- Search and analytics indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hashtags_name ON hashtags(name);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hashtags_usage_count ON hashtags(usage_count DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_analytics_user_date ON user_analytics(user_id, date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_analytics_post_date ON post_analytics(post_id, date);

-- ============================================================================
-- 2. OPTIMIZED QUERIES
-- ============================================================================

-- ============================================================================
-- 2.1 USER FEED QUERIES
-- ============================================================================

-- Optimized home feed query with proper indexing
-- This query fetches posts from followed users with pagination
CREATE OR REPLACE FUNCTION get_user_feed(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
    post_id UUID,
    user_id UUID,
    username VARCHAR,
    profile_picture TEXT,
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    likes_count INTEGER,
    comments_count INTEGER,
    user_liked BOOLEAN,
    hashtags TEXT[],
    mentions TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as post_id,
        p.user_id,
        u.username,
        up.profile_picture,
        p.content,
        p.created_at,
        p.likes_count,
        p.comments_count,
        CASE WHEN pl.id IS NOT NULL THEN true ELSE false END as user_liked,
        p.hashtags,
        p.mentions
    FROM posts p
    INNER JOIN users u ON p.user_id = u.id
    INNER JOIN user_profiles up ON u.id = up.user_id
    INNER JOIN user_follows uf ON p.user_id = uf.following_id
    LEFT JOIN post_likes pl ON p.id = pl.post_id AND pl.user_id = p_user_id
    WHERE uf.user_id = p_user_id
        AND p.deleted_at IS NULL
        AND p.visibility = 'public'
        AND u.deleted_at IS NULL
    ORDER BY p.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Optimized explore feed query
CREATE OR REPLACE FUNCTION get_explore_feed(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
    post_id UUID,
    user_id UUID,
    username VARCHAR,
    profile_picture TEXT,
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    likes_count INTEGER,
    comments_count INTEGER,
    user_liked BOOLEAN,
    hashtags TEXT[],
    mentions TEXT[],
    relevance_score FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as post_id,
        p.user_id,
        u.username,
        up.profile_picture,
        p.content,
        p.created_at,
        p.likes_count,
        p.comments_count,
        CASE WHEN pl.id IS NOT NULL THEN true ELSE false END as user_liked,
        p.hashtags,
        p.mentions,
        -- Relevance score based on likes, comments, and recency
        (p.likes_count * 0.4 + p.comments_count * 0.3 + 
         EXTRACT(EPOCH FROM (NOW() - p.created_at)) / -86400 * 0.3) as relevance_score
    FROM posts p
    INNER JOIN users u ON p.user_id = u.id
    INNER JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN post_likes pl ON p.id = pl.post_id AND pl.user_id = p_user_id
    LEFT JOIN user_follows uf ON p.user_id = uf.following_id AND uf.user_id = p_user_id
    WHERE p.deleted_at IS NULL
        AND p.visibility = 'public'
        AND u.deleted_at IS NULL
        AND uf.id IS NULL -- Exclude posts from followed users
    ORDER BY relevance_score DESC, p.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 2.2 SEARCH QUERIES
-- ============================================================================

-- Optimized user search query
CREATE OR REPLACE FUNCTION search_users(
    p_query TEXT,
    p_user_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
    user_id UUID,
    username VARCHAR,
    display_name VARCHAR,
    profile_picture TEXT,
    bio TEXT,
    university VARCHAR,
    verified BOOLEAN,
    followers_count INTEGER,
    following_count INTEGER,
    is_following BOOLEAN,
    is_blocked BOOLEAN,
    relevance_score FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id as user_id,
        u.username,
        up.display_name,
        up.profile_picture,
        up.bio,
        u.university,
        u.verified,
        u.followers_count,
        u.following_count,
        CASE WHEN uf.id IS NOT NULL THEN true ELSE false END as is_following,
        CASE WHEN ub.id IS NOT NULL THEN true ELSE false END as is_blocked,
        -- Relevance score based on username match, display name match, and follower count
        (CASE WHEN u.username ILIKE '%' || p_query || '%' THEN 1.0 ELSE 0.0 END * 0.5 +
         CASE WHEN up.display_name ILIKE '%' || p_query || '%' THEN 1.0 ELSE 0.0 END * 0.3 +
         CASE WHEN up.bio ILIKE '%' || p_query || '%' THEN 1.0 ELSE 0.0 END * 0.2) as relevance_score
    FROM users u
    INNER JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN user_follows uf ON u.id = uf.following_id AND uf.user_id = p_user_id
    LEFT JOIN user_blocks ub ON u.id = ub.blocked_id AND ub.user_id = p_user_id
    WHERE u.deleted_at IS NULL
        AND (u.username ILIKE '%' || p_query || '%' 
             OR up.display_name ILIKE '%' || p_query || '%'
             OR up.bio ILIKE '%' || p_query || '%')
        AND ub.id IS NULL -- Exclude blocked users
    ORDER BY relevance_score DESC, u.followers_count DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Optimized post search query with full-text search
CREATE OR REPLACE FUNCTION search_posts(
    p_query TEXT,
    p_user_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
    post_id UUID,
    user_id UUID,
    username VARCHAR,
    profile_picture TEXT,
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    likes_count INTEGER,
    comments_count INTEGER,
    user_liked BOOLEAN,
    hashtags TEXT[],
    mentions TEXT[],
    relevance_score FLOAT
) AS $$
DECLARE
    search_vector tsvector;
BEGIN
    -- Create search vector from query
    search_vector := plainto_tsquery('english', p_query);
    
    RETURN QUERY
    SELECT 
        p.id as post_id,
        p.user_id,
        u.username,
        up.profile_picture,
        p.content,
        p.created_at,
        p.likes_count,
        p.comments_count,
        CASE WHEN pl.id IS NOT NULL THEN true ELSE false END as user_liked,
        p.hashtags,
        p.mentions,
        -- Relevance score based on full-text search rank and engagement
        (ts_rank(p.content_vector, search_vector) * 0.6 +
         (p.likes_count * 0.2 + p.comments_count * 0.2)) as relevance_score
    FROM posts p
    INNER JOIN users u ON p.user_id = u.id
    INNER JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN post_likes pl ON p.id = pl.post_id AND pl.user_id = p_user_id
    WHERE p.deleted_at IS NULL
        AND p.visibility = 'public'
        AND u.deleted_at IS NULL
        AND p.content_vector @@ search_vector
    ORDER BY relevance_score DESC, p.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Optimized hashtag search query
CREATE OR REPLACE FUNCTION search_hashtags(
    p_query TEXT,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
    hashtag_id UUID,
    name VARCHAR,
    usage_count INTEGER,
    recent_posts_count INTEGER,
    relevance_score FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        h.id as hashtag_id,
        h.name,
        h.usage_count,
        h.recent_posts_count,
        -- Relevance score based on name match and usage count
        (CASE WHEN h.name ILIKE '%' || p_query || '%' THEN 1.0 ELSE 0.0 END * 0.7 +
         h.usage_count / 1000.0 * 0.3) as relevance_score
    FROM hashtags h
    WHERE h.name ILIKE '%' || p_query || '%'
    ORDER BY relevance_score DESC, h.usage_count DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 2.3 MESSAGING QUERIES
-- ============================================================================

-- Optimized conversation list query
CREATE OR REPLACE FUNCTION get_user_conversations(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
    conversation_id UUID,
    type VARCHAR,
    participants JSONB,
    last_message_content TEXT,
    last_message_created_at TIMESTAMP WITH TIME ZONE,
    last_message_sender_id UUID,
    unread_count INTEGER,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id as conversation_id,
        c.type,
        c.participants,
        lm.content as last_message_content,
        lm.created_at as last_message_created_at,
        lm.sender_id as last_message_sender_id,
        COALESCE(umc.unread_count, 0) as unread_count,
        c.updated_at
    FROM conversations c
    INNER JOIN LATERAL (
        SELECT content, created_at, sender_id
        FROM messages m
        WHERE m.conversation_id = c.id
        ORDER BY m.created_at DESC
        LIMIT 1
    ) lm ON true
    LEFT JOIN LATERAL (
        SELECT COUNT(*) as unread_count
        FROM messages m
        WHERE m.conversation_id = c.id
            AND m.sender_id != p_user_id
            AND m.read_at IS NULL
    ) umc ON true
    WHERE c.participants @> to_jsonb(p_user_id)
    ORDER BY c.updated_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Optimized message history query
CREATE OR REPLACE FUNCTION get_conversation_messages(
    p_conversation_id UUID,
    p_user_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
    message_id UUID,
    sender_id UUID,
    username VARCHAR,
    profile_picture TEXT,
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    message_type VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id as message_id,
        m.sender_id,
        u.username,
        up.profile_picture,
        m.content,
        m.created_at,
        m.read_at,
        m.type as message_type
    FROM messages m
    INNER JOIN users u ON m.sender_id = u.id
    INNER JOIN user_profiles up ON u.id = up.user_id
    WHERE m.conversation_id = p_conversation_id
        AND m.deleted_at IS NULL
    ORDER BY m.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 2.4 ANALYTICS QUERIES
-- ============================================================================

-- User engagement analytics
CREATE OR REPLACE FUNCTION get_user_engagement_stats(
    p_user_id UUID,
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_end_date DATE DEFAULT CURRENT_DATE
) RETURNS TABLE (
    total_posts INTEGER,
    total_likes_received INTEGER,
    total_comments_received INTEGER,
    total_followers_gained INTEGER,
    engagement_rate FLOAT,
    avg_likes_per_post FLOAT,
    avg_comments_per_post FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(p.id)::INTEGER as total_posts,
        COALESCE(SUM(p.likes_count), 0)::INTEGER as total_likes_received,
        COALESCE(SUM(p.comments_count), 0)::INTEGER as total_comments_received,
        COALESCE(SUM(ua.followers_gained), 0)::INTEGER as total_followers_gained,
        CASE 
            WHEN COUNT(p.id) > 0 THEN 
                (COALESCE(SUM(p.likes_count), 0) + COALESCE(SUM(p.comments_count), 0))::FLOAT / COUNT(p.id)
            ELSE 0.0 
        END as engagement_rate,
        CASE 
            WHEN COUNT(p.id) > 0 THEN COALESCE(SUM(p.likes_count), 0)::FLOAT / COUNT(p.id)
            ELSE 0.0 
        END as avg_likes_per_post,
        CASE 
            WHEN COUNT(p.id) > 0 THEN COALESCE(SUM(p.comments_count), 0)::FLOAT / COUNT(p.id)
            ELSE 0.0 
        END as avg_comments_per_post
    FROM posts p
    LEFT JOIN user_analytics ua ON p.user_id = ua.user_id 
        AND ua.date BETWEEN p_start_date AND p_end_date
    WHERE p.user_id = p_user_id
        AND p.created_at BETWEEN p_start_date AND p_end_date
        AND p.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Trending hashtags query
CREATE OR REPLACE FUNCTION get_trending_hashtags(
    p_hours INTEGER DEFAULT 24,
    p_limit INTEGER DEFAULT 20
) RETURNS TABLE (
    hashtag_id UUID,
    name VARCHAR,
    usage_count INTEGER,
    recent_usage_count INTEGER,
    trend_score FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        h.id as hashtag_id,
        h.name,
        h.usage_count,
        COALESCE(recent_usage.recent_count, 0) as recent_usage_count,
        -- Trend score based on recent usage vs total usage
        CASE 
            WHEN h.usage_count > 0 THEN 
                COALESCE(recent_usage.recent_count, 0)::FLOAT / h.usage_count
            ELSE 0.0 
        END as trend_score
    FROM hashtags h
    LEFT JOIN LATERAL (
        SELECT COUNT(*) as recent_count
        FROM posts p
        WHERE p.hashtags @> ARRAY[h.name]
            AND p.created_at >= NOW() - INTERVAL '1 hour' * p_hours
            AND p.deleted_at IS NULL
    ) recent_usage ON true
    WHERE h.usage_count > 0
    ORDER BY trend_score DESC, h.usage_count DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 3. PERFORMANCE MONITORING QUERIES
-- ============================================================================

-- Query performance monitoring
CREATE OR REPLACE VIEW query_performance_stats AS
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    stddev_time,
    rows,
    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements
WHERE mean_time > 100 -- Queries taking more than 100ms on average
ORDER BY mean_time DESC;

-- Index usage monitoring
CREATE OR REPLACE VIEW index_usage_stats AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    CASE 
        WHEN idx_scan = 0 THEN 'UNUSED'
        WHEN idx_scan < 100 THEN 'LOW_USAGE'
        ELSE 'ACTIVE'
    END as usage_status
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Table size monitoring
CREATE OR REPLACE VIEW table_size_stats AS
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    pg_total_relation_size(schemaname||'.'||tablename) as size_bytes,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes,
    n_live_tup as live_tuples,
    n_dead_tup as dead_tuples
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Connection monitoring
CREATE OR REPLACE VIEW connection_stats AS
SELECT 
    count(*) as total_connections,
    count(*) FILTER (WHERE state = 'active') as active_connections,
    count(*) FILTER (WHERE state = 'idle') as idle_connections,
    count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction,
    count(*) FILTER (WHERE state = 'idle in transaction (aborted)') as idle_in_transaction_aborted,
    count(*) FILTER (WHERE state = 'fastpath function call') as fastpath_function_call,
    count(*) FILTER (WHERE state = 'disabled') as disabled_connections
FROM pg_stat_activity;

-- ============================================================================
-- 4. DATABASE MAINTENANCE QUERIES
-- ============================================================================

-- Update table statistics
CREATE OR REPLACE FUNCTION update_table_statistics() RETURNS void AS $$
BEGIN
    ANALYZE users;
    ANALYZE user_profiles;
    ANALYZE posts;
    ANALYZE messages;
    ANALYZE conversations;
    ANALYZE user_follows;
    ANALYZE post_likes;
    ANALYZE post_comments;
    ANALYZE notifications;
    ANALYZE hashtags;
END;
$$ LANGUAGE plpgsql;

-- Clean up old data
CREATE OR REPLACE FUNCTION cleanup_old_data() RETURNS void AS $$
BEGIN
    -- Delete old notifications (older than 30 days)
    DELETE FROM notifications 
    WHERE created_at < NOW() - INTERVAL '30 days' 
        AND read_at IS NOT NULL;
    
    -- Delete old analytics data (older than 1 year)
    DELETE FROM user_analytics 
    WHERE date < CURRENT_DATE - INTERVAL '1 year';
    
    DELETE FROM post_analytics 
    WHERE date < CURRENT_DATE - INTERVAL '1 year';
    
    -- Vacuum and analyze tables
    VACUUM ANALYZE notifications;
    VACUUM ANALYZE user_analytics;
    VACUUM ANALYZE post_analytics;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. QUERY OPTIMIZATION TIPS
-- ============================================================================

/*
OPTIMIZATION TIPS:

1. INDEX USAGE:
   - Use EXPLAIN ANALYZE to check if indexes are being used
   - Create composite indexes for multi-column queries
   - Use partial indexes for filtered queries
   - Consider covering indexes for frequently accessed columns

2. QUERY STRUCTURE:
   - Use INNER JOIN instead of WHERE EXISTS when possible
   - Use LIMIT to reduce result set size
   - Use OFFSET with caution for large datasets
   - Consider cursor-based pagination for large result sets

3. DATA TYPES:
   - Use appropriate data types (UUID, TIMESTAMP, etc.)
   - Use arrays for multiple values (hashtags, mentions)
   - Use JSONB for flexible data structures

4. CONCURRENCY:
   - Use CONCURRENTLY for index creation on production
   - Use appropriate isolation levels
   - Consider connection pooling

5. MONITORING:
   - Monitor slow queries regularly
   - Check index usage statistics
   - Monitor table sizes and growth
   - Use pg_stat_statements for query analysis

6. MAINTENANCE:
   - Run VACUUM and ANALYZE regularly
   - Update table statistics after bulk operations
   - Clean up old data periodically
   - Monitor disk space usage
*/

-- ============================================================================
-- 6. EXAMPLE QUERY EXECUTION PLANS
-- ============================================================================

/*
-- Example: Check execution plan for user feed query
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) 
SELECT * FROM get_user_feed('user-uuid-here', 20, 0);

-- Example: Check execution plan for post search
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT * FROM search_posts('search query', 'user-uuid-here', 20, 0);

-- Example: Check execution plan for conversation messages
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT * FROM get_conversation_messages('conversation-uuid-here', 'user-uuid-here', 50, 0);
*/

-- ============================================================================
-- END OF QUERY OPTIMIZATION FILE
-- ============================================================================
