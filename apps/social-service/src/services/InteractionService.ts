// Social Interaction Service
// Author: ChitLaq Development Team
// Date: 2024-01-15

import { Pool } from 'pg';
import Redis from 'ioredis';
import { logger } from '../utils/logger';
import { metrics } from '../utils/metrics';

export interface SocialRelationship {
    id: string;
    followerId: string;
    followingId: string;
    relationshipType: 'FOLLOW' | 'BLOCK' | 'MUTE';
    status: 'ACTIVE' | 'PENDING' | 'INACTIVE';
    createdAt: Date;
    updatedAt: Date;
    metadata?: Record<string, any>;
}

export interface SocialAction {
    targetUserId: string;
    action: 'follow' | 'unfollow' | 'block' | 'unblock' | 'mute' | 'unmute';
    reason?: string;
    metadata?: Record<string, any>;
}

export interface BatchActionResult {
    action: string;
    targetUserId: string;
    success: boolean;
    error?: string;
    relationship?: SocialRelationship;
}

export interface SocialActivity {
    id: string;
    userId: string;
    type: string;
    targetUserId?: string;
    description: string;
    timestamp: Date;
    metadata?: Record<string, any>;
}

export interface SocialStatistics {
    followers: number;
    following: number;
    blocked: number;
    muted: number;
    mutualConnections: number;
    universityConnections: number;
    departmentConnections: number;
    recentActivity: number;
}

export interface CanFollowResult {
    allowed: boolean;
    reason?: string;
    code?: string;
}

export interface SocialActivityQuery {
    limit: number;
    offset: number;
    type?: string;
    since?: Date;
    until?: Date;
}

export interface SocialActivityResult {
    items: SocialActivity[];
    total: number;
    hasMore: boolean;
}

export class InteractionService {
    private dbPool: Pool;
    private redis: Redis;
    private config: {
        database: {
            host: string;
            port: number;
            database: string;
            user: string;
            password: string;
        };
        redis: {
            host: string;
            port: number;
            password?: string;
            db: number;
        };
        limits: {
            maxFollowers: number;
            maxFollowing: number;
            maxBlocks: number;
            maxMutes: number;
        };
    };

    constructor() {
        this.config = {
            database: {
                host: process.env.DB_HOST || 'localhost',
                port: parseInt(process.env.DB_PORT || '5432'),
                database: process.env.DB_NAME || 'chitlaq',
                user: process.env.DB_USER || 'postgres',
                password: process.env.DB_PASSWORD || 'password'
            },
            redis: {
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT || '6379'),
                password: process.env.REDIS_PASSWORD,
                db: parseInt(process.env.REDIS_DB || '0')
            },
            limits: {
                maxFollowers: parseInt(process.env.MAX_FOLLOWERS || '5000'),
                maxFollowing: parseInt(process.env.MAX_FOLLOWING || '1000'),
                maxBlocks: parseInt(process.env.MAX_BLOCKS || '1000'),
                maxMutes: parseInt(process.env.MAX_MUTES || '500')
            }
        };

        this.dbPool = new Pool(this.config.database);
        this.redis = new Redis(this.config.redis);
    }

    /**
     * Check if user can follow target user
     */
    async canFollowUser(userId: string, targetUserId: string): Promise<CanFollowResult> {
        try {
            // Check if trying to follow self
            if (userId === targetUserId) {
                return {
                    allowed: false,
                    reason: 'Cannot follow yourself',
                    code: 'SELF_FOLLOW'
                };
            }

            // Check if target user exists and is active
            const targetUser = await this.getUserProfile(targetUserId);
            if (!targetUser || !targetUser.is_active) {
                return {
                    allowed: false,
                    reason: 'User not found or inactive',
                    code: 'USER_NOT_FOUND'
                };
            }

            // Check if already following
            const existingRelationship = await this.getRelationship(userId, targetUserId, 'FOLLOW');
            if (existingRelationship && existingRelationship.status === 'ACTIVE') {
                return {
                    allowed: false,
                    reason: 'Already following this user',
                    code: 'ALREADY_FOLLOWING'
                };
            }

            // Check if blocked by target user
            const blockedByTarget = await this.getRelationship(targetUserId, userId, 'BLOCK');
            if (blockedByTarget && blockedByTarget.status === 'ACTIVE') {
                return {
                    allowed: false,
                    reason: 'Cannot follow this user',
                    code: 'BLOCKED_BY_USER'
                };
            }

            // Check if user has blocked target
            const blockedTarget = await this.getRelationship(userId, targetUserId, 'BLOCK');
            if (blockedTarget && blockedTarget.status === 'ACTIVE') {
                return {
                    allowed: false,
                    reason: 'Cannot follow blocked user',
                    code: 'USER_BLOCKED'
                };
            }

            // Check following limit
            const followingCount = await this.getFollowingCount(userId);
            if (followingCount >= this.config.limits.maxFollowing) {
                return {
                    allowed: false,
                    reason: 'Following limit reached',
                    code: 'FOLLOWING_LIMIT'
                };
            }

            // Check target user's follower limit
            const followersCount = await this.getFollowersCount(targetUserId);
            if (followersCount >= this.config.limits.maxFollowers) {
                return {
                    allowed: false,
                    reason: 'User has reached follower limit',
                    code: 'FOLLOWER_LIMIT'
                };
            }

            // Check privacy settings
            const canFollowByPrivacy = await this.checkPrivacySettings(userId, targetUserId);
            if (!canFollowByPrivacy.allowed) {
                return canFollowByPrivacy;
            }

            return { allowed: true };

        } catch (error) {
            logger.error('Error checking if user can follow', {
                userId,
                targetUserId,
                error: error.message
            });
            return {
                allowed: false,
                reason: 'Internal error',
                code: 'INTERNAL_ERROR'
            };
        }
    }

    /**
     * Follow a user
     */
    async followUser(userId: string, targetUserId: string, options: {
        reason?: string;
        metadata?: Record<string, any>;
        timestamp: Date;
    }): Promise<{ relationship: SocialRelationship; metadata: Record<string, any> }> {
        const client = await this.dbPool.connect();
        
        try {
            await client.query('BEGIN');

            // Create follow relationship
            const relationship = await this.createRelationship(client, {
                followerId: userId,
                followingId: targetUserId,
                relationshipType: 'FOLLOW',
                status: 'ACTIVE',
                metadata: options.metadata
            });

            // Record social activity
            await this.recordSocialActivity(client, {
                userId,
                type: 'follow',
                targetUserId,
                description: `Started following ${targetUserId}`,
                metadata: options.metadata
            });

            // Update cache
            await this.updateRelationshipCache(userId, targetUserId, 'FOLLOW', 'ACTIVE');

            // Get metadata for notifications
            const metadata = await this.getFollowMetadata(userId, targetUserId);

            await client.query('COMMIT');

            // Update metrics
            metrics.incrementCounter('social_follows_total', {
                user_id: userId,
                target_user_id: targetUserId
            });

            logger.info('User followed successfully', {
                userId,
                targetUserId,
                relationshipId: relationship.id
            });

            return { relationship, metadata };

        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Error following user', {
                userId,
                targetUserId,
                error: error.message
            });
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Unfollow a user
     */
    async unfollowUser(userId: string, targetUserId: string): Promise<{ relationship: SocialRelationship | null }> {
        const client = await this.dbPool.connect();
        
        try {
            await client.query('BEGIN');

            // Get existing relationship
            const existingRelationship = await this.getRelationship(userId, targetUserId, 'FOLLOW');
            
            if (!existingRelationship) {
                await client.query('ROLLBACK');
                return { relationship: null };
            }

            // Update relationship status
            const updatedRelationship = await this.updateRelationshipStatus(
                client,
                existingRelationship.id,
                'INACTIVE'
            );

            // Record social activity
            await this.recordSocialActivity(client, {
                userId,
                type: 'unfollow',
                targetUserId,
                description: `Stopped following ${targetUserId}`
            });

            // Update cache
            await this.updateRelationshipCache(userId, targetUserId, 'FOLLOW', 'INACTIVE');

            await client.query('COMMIT');

            // Update metrics
            metrics.incrementCounter('social_unfollows_total', {
                user_id: userId,
                target_user_id: targetUserId
            });

            logger.info('User unfollowed successfully', {
                userId,
                targetUserId,
                relationshipId: existingRelationship.id
            });

            return { relationship: updatedRelationship };

        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Error unfollowing user', {
                userId,
                targetUserId,
                error: error.message
            });
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Block a user
     */
    async blockUser(userId: string, targetUserId: string, options: {
        reason?: string;
        timestamp: Date;
    }): Promise<{ relationship: SocialRelationship }> {
        const client = await this.dbPool.connect();
        
        try {
            await client.query('BEGIN');

            // Check if already blocked
            const existingBlock = await this.getRelationship(userId, targetUserId, 'BLOCK');
            if (existingBlock && existingBlock.status === 'ACTIVE') {
                await client.query('ROLLBACK');
                return { relationship: existingBlock };
            }

            // Deactivate any existing follow relationship
            const existingFollow = await this.getRelationship(userId, targetUserId, 'FOLLOW');
            if (existingFollow && existingFollow.status === 'ACTIVE') {
                await this.updateRelationshipStatus(client, existingFollow.id, 'INACTIVE');
            }

            // Create or update block relationship
            let relationship: SocialRelationship;
            if (existingBlock) {
                relationship = await this.updateRelationshipStatus(client, existingBlock.id, 'ACTIVE');
            } else {
                relationship = await this.createRelationship(client, {
                    followerId: userId,
                    followingId: targetUserId,
                    relationshipType: 'BLOCK',
                    status: 'ACTIVE',
                    metadata: { reason: options.reason }
                });
            }

            // Record social activity
            await this.recordSocialActivity(client, {
                userId,
                type: 'block',
                targetUserId,
                description: `Blocked ${targetUserId}`,
                metadata: { reason: options.reason }
            });

            // Update cache
            await this.updateRelationshipCache(userId, targetUserId, 'BLOCK', 'ACTIVE');

            await client.query('COMMIT');

            // Update metrics
            metrics.incrementCounter('social_blocks_total', {
                user_id: userId,
                target_user_id: targetUserId
            });

            logger.info('User blocked successfully', {
                userId,
                targetUserId,
                relationshipId: relationship.id
            });

            return { relationship };

        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Error blocking user', {
                userId,
                targetUserId,
                error: error.message
            });
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Unblock a user
     */
    async unblockUser(userId: string, targetUserId: string): Promise<{ relationship: SocialRelationship | null }> {
        const client = await this.dbPool.connect();
        
        try {
            await client.query('BEGIN');

            // Get existing block relationship
            const existingBlock = await this.getRelationship(userId, targetUserId, 'BLOCK');
            
            if (!existingBlock || existingBlock.status !== 'ACTIVE') {
                await client.query('ROLLBACK');
                return { relationship: null };
            }

            // Update relationship status
            const updatedRelationship = await this.updateRelationshipStatus(
                client,
                existingBlock.id,
                'INACTIVE'
            );

            // Record social activity
            await this.recordSocialActivity(client, {
                userId,
                type: 'unblock',
                targetUserId,
                description: `Unblocked ${targetUserId}`
            });

            // Update cache
            await this.updateRelationshipCache(userId, targetUserId, 'BLOCK', 'INACTIVE');

            await client.query('COMMIT');

            // Update metrics
            metrics.incrementCounter('social_unblocks_total', {
                user_id: userId,
                target_user_id: targetUserId
            });

            logger.info('User unblocked successfully', {
                userId,
                targetUserId,
                relationshipId: existingBlock.id
            });

            return { relationship: updatedRelationship };

        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Error unblocking user', {
                userId,
                targetUserId,
                error: error.message
            });
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Mute a user
     */
    async muteUser(userId: string, targetUserId: string, options: {
        reason?: string;
        timestamp: Date;
    }): Promise<{ relationship: SocialRelationship }> {
        const client = await this.dbPool.connect();
        
        try {
            await client.query('BEGIN');

            // Check if already muted
            const existingMute = await this.getRelationship(userId, targetUserId, 'MUTE');
            if (existingMute && existingMute.status === 'ACTIVE') {
                await client.query('ROLLBACK');
                return { relationship: existingMute };
            }

            // Create or update mute relationship
            let relationship: SocialRelationship;
            if (existingMute) {
                relationship = await this.updateRelationshipStatus(client, existingMute.id, 'ACTIVE');
            } else {
                relationship = await this.createRelationship(client, {
                    followerId: userId,
                    followingId: targetUserId,
                    relationshipType: 'MUTE',
                    status: 'ACTIVE',
                    metadata: { reason: options.reason }
                });
            }

            // Record social activity
            await this.recordSocialActivity(client, {
                userId,
                type: 'mute',
                targetUserId,
                description: `Muted ${targetUserId}`,
                metadata: { reason: options.reason }
            });

            // Update cache
            await this.updateRelationshipCache(userId, targetUserId, 'MUTE', 'ACTIVE');

            await client.query('COMMIT');

            // Update metrics
            metrics.incrementCounter('social_mutes_total', {
                user_id: userId,
                target_user_id: targetUserId
            });

            logger.info('User muted successfully', {
                userId,
                targetUserId,
                relationshipId: relationship.id
            });

            return { relationship };

        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Error muting user', {
                userId,
                targetUserId,
                error: error.message
            });
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Unmute a user
     */
    async unmuteUser(userId: string, targetUserId: string): Promise<{ relationship: SocialRelationship | null }> {
        const client = await this.dbPool.connect();
        
        try {
            await client.query('BEGIN');

            // Get existing mute relationship
            const existingMute = await this.getRelationship(userId, targetUserId, 'MUTE');
            
            if (!existingMute || existingMute.status !== 'ACTIVE') {
                await client.query('ROLLBACK');
                return { relationship: null };
            }

            // Update relationship status
            const updatedRelationship = await this.updateRelationshipStatus(
                client,
                existingMute.id,
                'INACTIVE'
            );

            // Record social activity
            await this.recordSocialActivity(client, {
                userId,
                type: 'unmute',
                targetUserId,
                description: `Unmuted ${targetUserId}`
            });

            // Update cache
            await this.updateRelationshipCache(userId, targetUserId, 'MUTE', 'INACTIVE');

            await client.query('COMMIT');

            // Update metrics
            metrics.incrementCounter('social_unmutes_total', {
                user_id: userId,
                target_user_id: targetUserId
            });

            logger.info('User unmuted successfully', {
                userId,
                targetUserId,
                relationshipId: existingMute.id
            });

            return { relationship: updatedRelationship };

        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Error unmuting user', {
                userId,
                targetUserId,
                error: error.message
            });
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Report a user
     */
    async reportUser(userId: string, targetUserId: string, options: {
        reason: string;
        metadata?: Record<string, any>;
        timestamp: Date;
    }): Promise<{ report: any; metadata: Record<string, any> }> {
        const client = await this.dbPool.connect();
        
        try {
            await client.query('BEGIN');

            // Create report
            const report = await this.createReport(client, {
                reporterId: userId,
                reportedId: targetUserId,
                reason: options.reason,
                metadata: options.metadata
            });

            // Record social activity
            await this.recordSocialActivity(client, {
                userId,
                type: 'report',
                targetUserId,
                description: `Reported ${targetUserId}`,
                metadata: { reason: options.reason }
            });

            await client.query('COMMIT');

            // Update metrics
            metrics.incrementCounter('social_reports_total', {
                user_id: userId,
                target_user_id: targetUserId
            });

            logger.info('User reported successfully', {
                userId,
                targetUserId,
                reportId: report.id
            });

            return { report, metadata: options.metadata || {} };

        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Error reporting user', {
                userId,
                targetUserId,
                error: error.message
            });
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Process batch social actions
     */
    async processBatchActions(userId: string, actions: SocialAction[]): Promise<BatchActionResult[]> {
        const results: BatchActionResult[] = [];

        for (const action of actions) {
            try {
                let result: any = {};

                switch (action.action) {
                    case 'follow':
                        const canFollow = await this.canFollowUser(userId, action.targetUserId);
                        if (canFollow.allowed) {
                            result = await this.followUser(userId, action.targetUserId, {
                                reason: action.reason,
                                metadata: action.metadata,
                                timestamp: new Date()
                            });
                        } else {
                            throw new Error(canFollow.reason || 'Cannot follow user');
                        }
                        break;

                    case 'unfollow':
                        result = await this.unfollowUser(userId, action.targetUserId);
                        break;

                    case 'block':
                        result = await this.blockUser(userId, action.targetUserId, {
                            reason: action.reason,
                            timestamp: new Date()
                        });
                        break;

                    case 'unblock':
                        result = await this.unblockUser(userId, action.targetUserId);
                        break;

                    case 'mute':
                        result = await this.muteUser(userId, action.targetUserId, {
                            reason: action.reason,
                            timestamp: new Date()
                        });
                        break;

                    case 'unmute':
                        result = await this.unmuteUser(userId, action.targetUserId);
                        break;

                    default:
                        throw new Error(`Unknown action: ${action.action}`);
                }

                results.push({
                    action: action.action,
                    targetUserId: action.targetUserId,
                    success: true,
                    relationship: result.relationship
                });

            } catch (error) {
                results.push({
                    action: action.action,
                    targetUserId: action.targetUserId,
                    success: false,
                    error: error.message
                });
            }
        }

        return results;
    }

    /**
     * Get social activity for user
     */
    async getSocialActivity(userId: string, query: SocialActivityQuery): Promise<SocialActivityResult> {
        try {
            const { limit, offset, type, since, until } = query;

            let whereClause = 'WHERE user_id = $1';
            const params: any[] = [userId];
            let paramIndex = 2;

            if (type) {
                whereClause += ` AND type = $${paramIndex}`;
                params.push(type);
                paramIndex++;
            }

            if (since) {
                whereClause += ` AND timestamp >= $${paramIndex}`;
                params.push(since);
                paramIndex++;
            }

            if (until) {
                whereClause += ` AND timestamp <= $${paramIndex}`;
                params.push(until);
                paramIndex++;
            }

            // Get total count
            const countQuery = `SELECT COUNT(*) FROM social_activities ${whereClause}`;
            const countResult = await this.dbPool.query(countQuery, params);
            const total = parseInt(countResult.rows[0].count);

            // Get activities
            const activitiesQuery = `
                SELECT * FROM social_activities 
                ${whereClause}
                ORDER BY timestamp DESC 
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `;
            params.push(limit, offset);

            const activitiesResult = await this.dbPool.query(activitiesQuery, params);
            const activities = activitiesResult.rows.map(row => this.mapRowToSocialActivity(row));

            return {
                items: activities,
                total,
                hasMore: offset + limit < total
            };

        } catch (error) {
            logger.error('Error getting social activity', {
                userId,
                query,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Get user relationships
     */
    async getUserRelationships(userId: string, targetUserId: string): Promise<Record<string, any>> {
        try {
            const relationships = await Promise.all([
                this.getRelationship(userId, targetUserId, 'FOLLOW'),
                this.getRelationship(userId, targetUserId, 'BLOCK'),
                this.getRelationship(userId, targetUserId, 'MUTE'),
                this.getRelationship(targetUserId, userId, 'FOLLOW'),
                this.getRelationship(targetUserId, userId, 'BLOCK'),
                this.getRelationship(targetUserId, userId, 'MUTE')
            ]);

            return {
                following: relationships[0]?.status === 'ACTIVE' || false,
                blocked: relationships[1]?.status === 'ACTIVE' || false,
                muted: relationships[2]?.status === 'ACTIVE' || false,
                followedBy: relationships[3]?.status === 'ACTIVE' || false,
                blockedBy: relationships[4]?.status === 'ACTIVE' || false,
                mutedBy: relationships[5]?.status === 'ACTIVE' || false
            };

        } catch (error) {
            logger.error('Error getting user relationships', {
                userId,
                targetUserId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Get social statistics for user
     */
    async getSocialStatistics(userId: string): Promise<SocialStatistics> {
        try {
            const [
                followersCount,
                followingCount,
                blockedCount,
                mutedCount,
                mutualConnections,
                universityConnections,
                departmentConnections,
                recentActivity
            ] = await Promise.all([
                this.getFollowersCount(userId),
                this.getFollowingCount(userId),
                this.getBlockedCount(userId),
                this.getMutedCount(userId),
                this.getMutualConnectionsCount(userId),
                this.getUniversityConnectionsCount(userId),
                this.getDepartmentConnectionsCount(userId),
                this.getRecentActivityCount(userId)
            ]);

            return {
                followers: followersCount,
                following: followingCount,
                blocked: blockedCount,
                muted: mutedCount,
                mutualConnections,
                universityConnections,
                departmentConnections,
                recentActivity
            };

        } catch (error) {
            logger.error('Error getting social statistics', {
                userId,
                error: error.message
            });
            throw error;
        }
    }

    // Helper methods
    private async getUserProfile(userId: string): Promise<any> {
        const query = 'SELECT * FROM users WHERE id = $1 AND is_active = true';
        const result = await this.dbPool.query(query, [userId]);
        return result.rows[0];
    }

    private async getRelationship(followerId: string, followingId: string, type: string): Promise<SocialRelationship | null> {
        const query = `
            SELECT * FROM social_relationships 
            WHERE follower_id = $1 AND following_id = $2 AND relationship_type = $3
        `;
        const result = await this.dbPool.query(query, [followerId, followingId, type]);
        return result.rows[0] ? this.mapRowToRelationship(result.rows[0]) : null;
    }

    private async createRelationship(client: any, data: {
        followerId: string;
        followingId: string;
        relationshipType: string;
        status: string;
        metadata?: Record<string, any>;
    }): Promise<SocialRelationship> {
        const query = `
            INSERT INTO social_relationships (follower_id, following_id, relationship_type, status, metadata)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        const result = await client.query(query, [
            data.followerId,
            data.followingId,
            data.relationshipType,
            data.status,
            JSON.stringify(data.metadata || {})
        ]);
        return this.mapRowToRelationship(result.rows[0]);
    }

    private async updateRelationshipStatus(client: any, relationshipId: string, status: string): Promise<SocialRelationship> {
        const query = `
            UPDATE social_relationships 
            SET status = $1, updated_at = NOW()
            WHERE id = $2
            RETURNING *
        `;
        const result = await client.query(query, [status, relationshipId]);
        return this.mapRowToRelationship(result.rows[0]);
    }

    private async recordSocialActivity(client: any, data: {
        userId: string;
        type: string;
        targetUserId?: string;
        description: string;
        metadata?: Record<string, any>;
    }): Promise<void> {
        const query = `
            INSERT INTO social_activities (user_id, type, target_user_id, description, metadata)
            VALUES ($1, $2, $3, $4, $5)
        `;
        await client.query(query, [
            data.userId,
            data.type,
            data.targetUserId,
            data.description,
            JSON.stringify(data.metadata || {})
        ]);
    }

    private async createReport(client: any, data: {
        reporterId: string;
        reportedId: string;
        reason: string;
        metadata?: Record<string, any>;
    }): Promise<any> {
        const query = `
            INSERT INTO user_reports (reporter_id, reported_id, reason, metadata, status)
            VALUES ($1, $2, $3, $4, 'PENDING')
            RETURNING *
        `;
        const result = await client.query(query, [
            data.reporterId,
            data.reportedId,
            data.reason,
            JSON.stringify(data.metadata || {})
        ]);
        return result.rows[0];
    }

    private async updateRelationshipCache(userId: string, targetUserId: string, type: string, status: string): Promise<void> {
        const key = `relationship:${userId}:${targetUserId}:${type}`;
        await this.redis.setex(key, 3600, status); // Cache for 1 hour
    }

    private async getFollowMetadata(userId: string, targetUserId: string): Promise<Record<string, any>> {
        // Get metadata for follow notifications
        const [userProfile, targetProfile] = await Promise.all([
            this.getUserProfile(userId),
            this.getUserProfile(targetUserId)
        ]);

        return {
            universityMatch: userProfile?.university_id === targetProfile?.university_id,
            departmentMatch: userProfile?.department_id === targetProfile?.department_id,
            mutualConnections: await this.getMutualConnectionsCount(userId, targetUserId),
            sharedInterests: await this.getSharedInterests(userId, targetUserId)
        };
    }

    private async checkPrivacySettings(userId: string, targetUserId: string): Promise<CanFollowResult> {
        // Check if target user's privacy settings allow following
        const query = `
            SELECT privacy_settings FROM user_profiles 
            WHERE user_id = $1
        `;
        const result = await this.dbPool.query(query, [targetUserId]);
        
        if (result.rows.length === 0) {
            return { allowed: true }; // Default to allowed if no privacy settings
        }

        const privacySettings = result.rows[0].privacy_settings;
        if (privacySettings?.profile_visibility === 'private') {
            return {
                allowed: false,
                reason: 'User profile is private',
                code: 'PRIVATE_PROFILE'
            };
        }

        return { allowed: true };
    }

    // Count methods
    private async getFollowersCount(userId: string): Promise<number> {
        const query = `
            SELECT COUNT(*) FROM social_relationships 
            WHERE following_id = $1 AND relationship_type = 'FOLLOW' AND status = 'ACTIVE'
        `;
        const result = await this.dbPool.query(query, [userId]);
        return parseInt(result.rows[0].count);
    }

    private async getFollowingCount(userId: string): Promise<number> {
        const query = `
            SELECT COUNT(*) FROM social_relationships 
            WHERE follower_id = $1 AND relationship_type = 'FOLLOW' AND status = 'ACTIVE'
        `;
        const result = await this.dbPool.query(query, [userId]);
        return parseInt(result.rows[0].count);
    }

    private async getBlockedCount(userId: string): Promise<number> {
        const query = `
            SELECT COUNT(*) FROM social_relationships 
            WHERE follower_id = $1 AND relationship_type = 'BLOCK' AND status = 'ACTIVE'
        `;
        const result = await this.dbPool.query(query, [userId]);
        return parseInt(result.rows[0].count);
    }

    private async getMutedCount(userId: string): Promise<number> {
        const query = `
            SELECT COUNT(*) FROM social_relationships 
            WHERE follower_id = $1 AND relationship_type = 'MUTE' AND status = 'ACTIVE'
        `;
        const result = await this.dbPool.query(query, [userId]);
        return parseInt(result.rows[0].count);
    }

    private async getMutualConnectionsCount(userId: string, targetUserId?: string): Promise<number> {
        if (targetUserId) {
            // Get mutual connections between two users
            const query = `
                SELECT COUNT(*) FROM (
                    SELECT sr1.following_id FROM social_relationships sr1
                    WHERE sr1.follower_id = $1 AND sr1.relationship_type = 'FOLLOW' AND sr1.status = 'ACTIVE'
                    INTERSECT
                    SELECT sr2.following_id FROM social_relationships sr2
                    WHERE sr2.follower_id = $2 AND sr2.relationship_type = 'FOLLOW' AND sr2.status = 'ACTIVE'
                ) mutuals
            `;
            const result = await this.dbPool.query(query, [userId, targetUserId]);
            return parseInt(result.rows[0].count);
        } else {
            // Get total mutual connections for user
            return 0; // Simplified for now
        }
    }

    private async getUniversityConnectionsCount(userId: string): Promise<number> {
        const query = `
            SELECT COUNT(*) FROM social_relationships sr
            INNER JOIN user_profiles up1 ON sr.follower_id = up1.user_id
            INNER JOIN user_profiles up2 ON sr.following_id = up2.user_id
            WHERE sr.follower_id = $1 AND sr.relationship_type = 'FOLLOW' AND sr.status = 'ACTIVE'
            AND up1.university_id = up2.university_id
        `;
        const result = await this.dbPool.query(query, [userId]);
        return parseInt(result.rows[0].count);
    }

    private async getDepartmentConnectionsCount(userId: string): Promise<number> {
        const query = `
            SELECT COUNT(*) FROM social_relationships sr
            INNER JOIN user_profiles up1 ON sr.follower_id = up1.user_id
            INNER JOIN user_profiles up2 ON sr.following_id = up2.user_id
            WHERE sr.follower_id = $1 AND sr.relationship_type = 'FOLLOW' AND sr.status = 'ACTIVE'
            AND up1.department_id = up2.department_id
        `;
        const result = await this.dbPool.query(query, [userId]);
        return parseInt(result.rows[0].count);
    }

    private async getRecentActivityCount(userId: string): Promise<number> {
        const query = `
            SELECT COUNT(*) FROM social_activities 
            WHERE user_id = $1 AND timestamp > NOW() - INTERVAL '7 days'
        `;
        const result = await this.dbPool.query(query, [userId]);
        return parseInt(result.rows[0].count);
    }

    private async getSharedInterests(userId: string, targetUserId: string): Promise<string[]> {
        const query = `
            SELECT up1.interests FROM user_profiles up1
            WHERE up1.user_id = $1
            UNION
            SELECT up2.interests FROM user_profiles up2
            WHERE up2.user_id = $2
        `;
        const result = await this.dbPool.query(query, [userId, targetUserId]);
        
        if (result.rows.length < 2) return [];
        
        const interests1 = result.rows[0].interests || [];
        const interests2 = result.rows[1].interests || [];
        
        return interests1.filter((interest: string) => interests2.includes(interest));
    }

    private async getActionFrequency(userId: string, action: string, timeWindow: number): Promise<number> {
        const query = `
            SELECT COUNT(*) FROM social_activities 
            WHERE user_id = $1 AND type = $2 AND timestamp > NOW() - INTERVAL '${timeWindow} seconds'
        `;
        const result = await this.dbPool.query(query, [userId, action]);
        return parseInt(result.rows[0].count);
    }

    private async getUserPatterns(userId: string): Promise<any> {
        // Get user behavior patterns for abuse detection
        const query = `
            SELECT type, COUNT(*) as count, 
                   AVG(EXTRACT(EPOCH FROM (timestamp - LAG(timestamp) OVER (ORDER BY timestamp)))) as avg_interval
            FROM social_activities 
            WHERE user_id = $1 AND timestamp > NOW() - INTERVAL '24 hours'
            GROUP BY type
        `;
        const result = await this.dbPool.query(query, [userId]);
        return result.rows;
    }

    // Mapping methods
    private mapRowToRelationship(row: any): SocialRelationship {
        return {
            id: row.id,
            followerId: row.follower_id,
            followingId: row.following_id,
            relationshipType: row.relationship_type,
            status: row.status,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            metadata: row.metadata ? JSON.parse(row.metadata) : {}
        };
    }

    private mapRowToSocialActivity(row: any): SocialActivity {
        return {
            id: row.id,
            userId: row.user_id,
            type: row.type,
            targetUserId: row.target_user_id,
            description: row.description,
            timestamp: row.timestamp,
            metadata: row.metadata ? JSON.parse(row.metadata) : {}
        };
    }
}
