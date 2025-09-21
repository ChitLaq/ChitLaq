// Algorithm Utilities for Friend Recommendations
// Author: ChitLaq Development Team
// Date: 2024-01-15

import { Pool } from 'pg';

export interface UserProfile {
    user_id: string;
    email: string;
    university_id: string;
    university_name: string;
    department_id?: string;
    department_name?: string;
    graduation_year?: number;
    major?: string;
    interests: string[];
    location?: {
        latitude: number;
        longitude: number;
        city: string;
        state: string;
        country: string;
    };
    profile_completion_score: number;
    last_active: Date;
    user_type: string;
    privacy_settings: {
        profile_visibility: string;
        university_visibility: string;
        interest_visibility: string;
        location_visibility: string;
    };
}

export interface UserEngagementPattern {
    timePattern: {
        hours: number[];
        days: number[];
        peakHours: number[];
        peakDays: number[];
    };
    activityPattern: {
        activities: number[];
        postFrequency: number;
        likeFrequency: number;
        commentFrequency: number;
        shareFrequency: number;
    };
    contentPattern: {
        contentTypes: number[];
        topicDistribution: { [topic: string]: number };
        languageUsage: { [language: string]: number };
        mediaUsage: { [type: string]: number };
    };
}

export interface UserInteraction {
    id: string;
    type: 'like' | 'comment' | 'share' | 'mention' | 'message' | 'follow';
    target_user_id: string;
    content_id?: string;
    created_at: Date;
    metadata?: any;
}

export interface GeographicLocation {
    latitude: number;
    longitude: number;
    city: string;
    state: string;
    country: string;
    timezone: string;
}

export class AlgorithmUtils {
    private dbPool: Pool;
    private cache: Map<string, any> = new Map();
    private cacheTTL: Map<string, number> = new Map();

    constructor(dbPool: Pool) {
        this.dbPool = dbPool;
    }

    /**
     * Get user profile from database
     */
    async getUserProfile(userId: string): Promise<UserProfile | null> {
        const cacheKey = `profile:${userId}`;
        
        // Check cache first
        if (this.isCacheValid(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const query = `
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
                    up.last_active,
                    up.user_type,
                    up.privacy_settings
                FROM users u
                INNER JOIN user_profiles up ON up.user_id = u.id
                LEFT JOIN universities univ ON univ.id = up.university_id
                LEFT JOIN departments dept ON dept.id = up.department_id
                WHERE u.id = $1
            `;

            const result = await this.dbPool.query(query, [userId]);
            
            if (result.rows.length === 0) {
                return null;
            }

            const profile = result.rows[0];
            
            // Parse JSON fields
            profile.interests = profile.interests || [];
            profile.location = profile.location ? JSON.parse(profile.location) : null;
            profile.privacy_settings = profile.privacy_settings ? JSON.parse(profile.privacy_settings) : {};

            // Cache the result
            this.cache.set(cacheKey, profile);
            this.cacheTTL.set(cacheKey, Date.now() + 3600000); // 1 hour

            return profile;
        } catch (error) {
            console.error('Error getting user profile:', error);
            return null;
        }
    }

    /**
     * Get blocked users for a user
     */
    async getBlockedUsers(userId: string): Promise<string[]> {
        const cacheKey = `blocked:${userId}`;
        
        if (this.isCacheValid(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const query = `
                SELECT following_id
                FROM social_relationships
                WHERE follower_id = $1 
                AND relationship_type = 'block' 
                AND status = 'active'
            `;

            const result = await this.dbPool.query(query, [userId]);
            const blockedUsers = result.rows.map(row => row.following_id);

            // Cache the result
            this.cache.set(cacheKey, blockedUsers);
            this.cacheTTL.set(cacheKey, Date.now() + 1800000); // 30 minutes

            return blockedUsers;
        } catch (error) {
            console.error('Error getting blocked users:', error);
            return [];
        }
    }

    /**
     * Get existing connections for a user
     */
    async getExistingConnections(userId: string): Promise<string[]> {
        const cacheKey = `connections:${userId}`;
        
        if (this.isCacheValid(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const query = `
                SELECT following_id
                FROM social_relationships
                WHERE follower_id = $1 
                AND relationship_type = 'follow' 
                AND status = 'active'
                UNION
                SELECT follower_id
                FROM social_relationships
                WHERE following_id = $1 
                AND relationship_type = 'follow' 
                AND status = 'active'
            `;

            const result = await this.dbPool.query(query, [userId]);
            const connections = result.rows.map(row => row.following_id);

            // Cache the result
            this.cache.set(cacheKey, connections);
            this.cacheTTL.set(cacheKey, Date.now() + 1800000); // 30 minutes

            return connections;
        } catch (error) {
            console.error('Error getting existing connections:', error);
            return [];
        }
    }

    /**
     * Get user engagement pattern
     */
    async getUserEngagementPattern(userId: string): Promise<UserEngagementPattern | null> {
        const cacheKey = `engagement:${userId}`;
        
        if (this.isCacheValid(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            // Get time-based activity patterns
            const timePattern = await this.getTimePattern(userId);
            
            // Get activity frequency patterns
            const activityPattern = await this.getActivityPattern(userId);
            
            // Get content interaction patterns
            const contentPattern = await this.getContentPattern(userId);

            const engagementPattern: UserEngagementPattern = {
                timePattern,
                activityPattern,
                contentPattern
            };

            // Cache the result
            this.cache.set(cacheKey, engagementPattern);
            this.cacheTTL.set(cacheKey, Date.now() + 3600000); // 1 hour

            return engagementPattern;
        } catch (error) {
            console.error('Error getting user engagement pattern:', error);
            return null;
        }
    }

    /**
     * Get user interactions with another user
     */
    async getUserInteractions(userId: string, targetUserId: string): Promise<UserInteraction[]> {
        const cacheKey = `interactions:${userId}:${targetUserId}`;
        
        if (this.isCacheValid(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const query = `
                SELECT 
                    id,
                    type,
                    target_user_id,
                    content_id,
                    created_at,
                    metadata
                FROM user_interactions
                WHERE (user_id = $1 AND target_user_id = $2)
                OR (user_id = $2 AND target_user_id = $1)
                ORDER BY created_at DESC
                LIMIT 100
            `;

            const result = await this.dbPool.query(query, [userId, targetUserId]);
            const interactions = result.rows.map(row => ({
                ...row,
                metadata: row.metadata ? JSON.parse(row.metadata) : null
            }));

            // Cache the result
            this.cache.set(cacheKey, interactions);
            this.cacheTTL.set(cacheKey, Date.now() + 1800000); // 30 minutes

            return interactions;
        } catch (error) {
            console.error('Error getting user interactions:', error);
            return [];
        }
    }

    /**
     * Calculate distance between two coordinates
     */
    calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371; // Earth's radius in kilometers
        const dLat = this.toRadians(lat2 - lat1);
        const dLon = this.toRadians(lon2 - lon1);
        
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    /**
     * Execute database query with error handling
     */
    async executeQuery(query: string, params: any[] = []): Promise<any[]> {
        try {
            const result = await this.dbPool.query(query, params);
            return result.rows;
        } catch (error) {
            console.error('Database query error:', error);
            throw error;
        }
    }

    /**
     * Get time-based activity pattern
     */
    private async getTimePattern(userId: string): Promise<any> {
        try {
            const query = `
                SELECT 
                    EXTRACT(HOUR FROM created_at) as hour,
                    EXTRACT(DOW FROM created_at) as day_of_week,
                    COUNT(*) as activity_count
                FROM user_activities
                WHERE user_id = $1
                AND created_at >= NOW() - INTERVAL '30 days'
                GROUP BY EXTRACT(HOUR FROM created_at), EXTRACT(DOW FROM created_at)
                ORDER BY activity_count DESC
            `;

            const result = await this.dbPool.query(query, [userId]);
            
            // Process results into pattern arrays
            const hours = new Array(24).fill(0);
            const days = new Array(7).fill(0);
            
            result.rows.forEach(row => {
                hours[parseInt(row.hour)] = parseInt(row.activity_count);
                days[parseInt(row.day_of_week)] += parseInt(row.activity_count);
            });

            // Find peak hours and days
            const peakHours = this.findPeaks(hours, 3);
            const peakDays = this.findPeaks(days, 2);

            return {
                hours,
                days,
                peakHours,
                peakDays
            };
        } catch (error) {
            console.error('Error getting time pattern:', error);
            return {
                hours: new Array(24).fill(0),
                days: new Array(7).fill(0),
                peakHours: [],
                peakDays: []
            };
        }
    }

    /**
     * Get activity frequency pattern
     */
    private async getActivityPattern(userId: string): Promise<any> {
        try {
            const query = `
                SELECT 
                    activity_type,
                    COUNT(*) as frequency
                FROM user_activities
                WHERE user_id = $1
                AND created_at >= NOW() - INTERVAL '30 days'
                GROUP BY activity_type
            `;

            const result = await this.dbPool.query(query, [userId]);
            
            const activities = new Array(6).fill(0); // 6 activity types
            let postFrequency = 0;
            let likeFrequency = 0;
            let commentFrequency = 0;
            let shareFrequency = 0;

            result.rows.forEach(row => {
                const frequency = parseInt(row.frequency);
                
                switch (row.activity_type) {
                    case 'post':
                        postFrequency = frequency;
                        activities[0] = frequency;
                        break;
                    case 'like':
                        likeFrequency = frequency;
                        activities[1] = frequency;
                        break;
                    case 'comment':
                        commentFrequency = frequency;
                        activities[2] = frequency;
                        break;
                    case 'share':
                        shareFrequency = frequency;
                        activities[3] = frequency;
                        break;
                    case 'follow':
                        activities[4] = frequency;
                        break;
                    case 'message':
                        activities[5] = frequency;
                        break;
                }
            });

            return {
                activities,
                postFrequency,
                likeFrequency,
                commentFrequency,
                shareFrequency
            };
        } catch (error) {
            console.error('Error getting activity pattern:', error);
            return {
                activities: new Array(6).fill(0),
                postFrequency: 0,
                likeFrequency: 0,
                commentFrequency: 0,
                shareFrequency: 0
            };
        }
    }

    /**
     * Get content interaction pattern
     */
    private async getContentPattern(userId: string): Promise<any> {
        try {
            const query = `
                SELECT 
                    content_type,
                    topic,
                    language,
                    media_type,
                    COUNT(*) as interaction_count
                FROM content_interactions
                WHERE user_id = $1
                AND created_at >= NOW() - INTERVAL '30 days'
                GROUP BY content_type, topic, language, media_type
            `;

            const result = await this.dbPool.query(query, [userId]);
            
            const contentTypes = new Array(5).fill(0); // 5 content types
            const topicDistribution: { [topic: string]: number } = {};
            const languageUsage: { [language: string]: number } = {};
            const mediaUsage: { [type: string]: number } = {};

            result.rows.forEach(row => {
                const count = parseInt(row.interaction_count);
                
                // Content type distribution
                switch (row.content_type) {
                    case 'text':
                        contentTypes[0] += count;
                        break;
                    case 'image':
                        contentTypes[1] += count;
                        break;
                    case 'video':
                        contentTypes[2] += count;
                        break;
                    case 'link':
                        contentTypes[3] += count;
                        break;
                    case 'poll':
                        contentTypes[4] += count;
                        break;
                }

                // Topic distribution
                if (row.topic) {
                    topicDistribution[row.topic] = (topicDistribution[row.topic] || 0) + count;
                }

                // Language usage
                if (row.language) {
                    languageUsage[row.language] = (languageUsage[row.language] || 0) + count;
                }

                // Media usage
                if (row.media_type) {
                    mediaUsage[row.media_type] = (mediaUsage[row.media_type] || 0) + count;
                }
            });

            return {
                contentTypes,
                topicDistribution,
                languageUsage,
                mediaUsage
            };
        } catch (error) {
            console.error('Error getting content pattern:', error);
            return {
                contentTypes: new Array(5).fill(0),
                topicDistribution: {},
                languageUsage: {},
                mediaUsage: {}
            };
        }
    }

    /**
     * Find peak values in an array
     */
    private findPeaks(array: number[], count: number): number[] {
        const indexed = array.map((value, index) => ({ value, index }));
        indexed.sort((a, b) => b.value - a.value);
        return indexed.slice(0, count).map(item => item.index);
    }

    /**
     * Convert degrees to radians
     */
    private toRadians(degrees: number): number {
        return degrees * (Math.PI / 180);
    }

    /**
     * Check if cache entry is valid
     */
    private isCacheValid(key: string): boolean {
        const ttl = this.cacheTTL.get(key);
        if (!ttl || Date.now() > ttl) {
            this.cache.delete(key);
            this.cacheTTL.delete(key);
            return false;
        }
        return this.cache.has(key);
    }

    /**
     * Clear cache
     */
    clearCache(): void {
        this.cache.clear();
        this.cacheTTL.clear();
    }

    /**
     * Get cache statistics
     */
    getCacheStats(): any {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }

    /**
     * Batch process multiple users
     */
    async batchProcessUsers(userIds: string[], processor: (userId: string) => Promise<any>): Promise<any[]> {
        const batchSize = 10;
        const results: any[] = [];

        for (let i = 0; i < userIds.length; i += batchSize) {
            const batch = userIds.slice(i, i + batchSize);
            const batchPromises = batch.map(processor);
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
        }

        return results;
    }

    /**
     * Validate user ID format
     */
    isValidUserId(userId: string): boolean {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(userId);
    }

    /**
     * Sanitize input string
     */
    sanitizeInput(input: string): string {
        return input.trim().replace(/[<>]/g, '');
    }

    /**
     * Generate cache key
     */
    generateCacheKey(prefix: string, ...parts: string[]): string {
        return `${prefix}:${parts.join(':')}`;
    }

    /**
     * Log algorithm performance
     */
    logPerformance(operation: string, duration: number, metadata?: any): void {
        console.log(`[ALGORITHM_PERF] ${operation}: ${duration}ms`, metadata);
    }

    /**
     * Get database connection pool
     */
    getDbPool(): Pool {
        return this.dbPool;
    }
}
