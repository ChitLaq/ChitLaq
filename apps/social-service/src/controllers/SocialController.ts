// Social Interactions Controller
// Author: ChitLaq Development Team
// Date: 2024-01-15

import { Request, Response, NextFunction } from 'express';
import { InteractionService } from '../services/InteractionService';
import { SocialEventHandler } from '../events/SocialEventHandler';
import { AbuseDetectionService } from '../security/abuse-detection';
import { SocialNotificationService } from '../notifications/social-notifications';
import { RateLimiter } from '../middleware/rate-limiting';
import { validateRequest, ValidationError } from '../utils/validation';
import { logger } from '../utils/logger';
import { metrics } from '../utils/metrics';

export interface AuthenticatedRequest extends Request {
    user: {
        id: string;
        email: string;
        university_id: string;
        role: string;
    };
}

export interface SocialActionRequest extends AuthenticatedRequest {
    body: {
        targetUserId: string;
        action?: string;
        reason?: string;
        metadata?: Record<string, any>;
    };
}

export interface BatchSocialActionRequest extends AuthenticatedRequest {
    body: {
        actions: Array<{
            targetUserId: string;
            action: 'follow' | 'unfollow' | 'block' | 'unblock' | 'mute' | 'unmute';
            reason?: string;
            metadata?: Record<string, any>;
        }>;
    };
}

export interface SocialActivityRequest extends AuthenticatedRequest {
    query: {
        limit?: string;
        offset?: string;
        type?: string;
        since?: string;
        until?: string;
    };
}

export class SocialController {
    private interactionService: InteractionService;
    private eventHandler: SocialEventHandler;
    private abuseDetection: AbuseDetectionService;
    private notificationService: SocialNotificationService;
    private rateLimiter: RateLimiter;

    constructor() {
        this.interactionService = new InteractionService();
        this.eventHandler = new SocialEventHandler();
        this.abuseDetection = new AbuseDetectionService();
        this.notificationService = new SocialNotificationService();
        this.rateLimiter = new RateLimiter();
    }

    /**
     * Follow a user
     */
    async followUser(req: SocialActionRequest, res: Response, next: NextFunction): Promise<void> {
        const startTime = Date.now();
        
        try {
            const { targetUserId, reason, metadata } = req.body;
            const userId = req.user.id;

            // Validate request
            await validateRequest(req, {
                targetUserId: { required: true, type: 'string', format: 'uuid' },
                reason: { type: 'string', maxLength: 500 },
                metadata: { type: 'object' }
            });

            // Rate limiting
            await this.rateLimiter.checkLimit(userId, 'follow', 100, 3600); // 100 follows per hour

            // Abuse detection
            const abuseScore = await this.abuseDetection.analyzeAction(userId, 'follow', {
                targetUserId,
                frequency: await this.getActionFrequency(userId, 'follow'),
                patterns: await this.getUserPatterns(userId)
            });

            if (abuseScore > 0.8) {
                throw new Error('Action blocked due to suspicious activity');
            }

            // Check if user can follow target
            const canFollow = await this.interactionService.canFollowUser(userId, targetUserId);
            if (!canFollow.allowed) {
                return res.status(403).json({
                    success: false,
                    error: canFollow.reason,
                    code: canFollow.code
                });
            }

            // Perform follow action
            const result = await this.interactionService.followUser(userId, targetUserId, {
                reason,
                metadata,
                timestamp: new Date()
            });

            // Emit real-time event
            await this.eventHandler.emitFollowEvent({
                followerId: userId,
                followingId: targetUserId,
                timestamp: new Date(),
                metadata: result.metadata
            });

            // Send notification
            await this.notificationService.sendFollowNotification({
                recipientId: targetUserId,
                senderId: userId,
                action: 'follow',
                metadata: result.metadata
            });

            // Update metrics
            metrics.incrementCounter('social_follows_total', {
                user_id: userId,
                target_user_id: targetUserId,
                university_id: req.user.university_id
            });

            const processingTime = Date.now() - startTime;
            metrics.recordHistogram('social_action_processing_time', processingTime, {
                action: 'follow'
            });

            res.status(200).json({
                success: true,
                data: {
                    relationship: result.relationship,
                    metadata: result.metadata,
                    processingTime
                }
            });

        } catch (error) {
            logger.error('Follow user error:', {
                userId: req.user.id,
                targetUserId: req.body.targetUserId,
                error: error.message,
                stack: error.stack
            });

            metrics.incrementCounter('social_errors_total', {
                action: 'follow',
                error_type: error.constructor.name
            });

            next(error);
        }
    }

    /**
     * Unfollow a user
     */
    async unfollowUser(req: SocialActionRequest, res: Response, next: NextFunction): Promise<void> {
        const startTime = Date.now();
        
        try {
            const { targetUserId } = req.body;
            const userId = req.user.id;

            // Validate request
            await validateRequest(req, {
                targetUserId: { required: true, type: 'string', format: 'uuid' }
            });

            // Rate limiting
            await this.rateLimiter.checkLimit(userId, 'unfollow', 200, 3600); // 200 unfollows per hour

            // Perform unfollow action
            const result = await this.interactionService.unfollowUser(userId, targetUserId);

            // Emit real-time event
            await this.eventHandler.emitUnfollowEvent({
                followerId: userId,
                followingId: targetUserId,
                timestamp: new Date()
            });

            // Update metrics
            metrics.incrementCounter('social_unfollows_total', {
                user_id: userId,
                target_user_id: targetUserId
            });

            const processingTime = Date.now() - startTime;
            metrics.recordHistogram('social_action_processing_time', processingTime, {
                action: 'unfollow'
            });

            res.status(200).json({
                success: true,
                data: {
                    relationship: result.relationship,
                    processingTime
                }
            });

        } catch (error) {
            logger.error('Unfollow user error:', {
                userId: req.user.id,
                targetUserId: req.body.targetUserId,
                error: error.message
            });

            next(error);
        }
    }

    /**
     * Block a user
     */
    async blockUser(req: SocialActionRequest, res: Response, next: NextFunction): Promise<void> {
        const startTime = Date.now();
        
        try {
            const { targetUserId, reason } = req.body;
            const userId = req.user.id;

            // Validate request
            await validateRequest(req, {
                targetUserId: { required: true, type: 'string', format: 'uuid' },
                reason: { type: 'string', maxLength: 1000 }
            });

            // Rate limiting
            await this.rateLimiter.checkLimit(userId, 'block', 50, 3600); // 50 blocks per hour

            // Abuse detection
            const abuseScore = await this.abuseDetection.analyzeAction(userId, 'block', {
                targetUserId,
                frequency: await this.getActionFrequency(userId, 'block'),
                patterns: await this.getUserPatterns(userId)
            });

            if (abuseScore > 0.9) {
                throw new Error('Action blocked due to excessive blocking activity');
            }

            // Perform block action
            const result = await this.interactionService.blockUser(userId, targetUserId, {
                reason,
                timestamp: new Date()
            });

            // Emit real-time event
            await this.eventHandler.emitBlockEvent({
                blockerId: userId,
                blockedId: targetUserId,
                timestamp: new Date(),
                reason
            });

            // Update metrics
            metrics.incrementCounter('social_blocks_total', {
                user_id: userId,
                target_user_id: targetUserId
            });

            const processingTime = Date.now() - startTime;
            metrics.recordHistogram('social_action_processing_time', processingTime, {
                action: 'block'
            });

            res.status(200).json({
                success: true,
                data: {
                    relationship: result.relationship,
                    processingTime
                }
            });

        } catch (error) {
            logger.error('Block user error:', {
                userId: req.user.id,
                targetUserId: req.body.targetUserId,
                error: error.message
            });

            next(error);
        }
    }

    /**
     * Unblock a user
     */
    async unblockUser(req: SocialActionRequest, res: Response, next: NextFunction): Promise<void> {
        const startTime = Date.now();
        
        try {
            const { targetUserId } = req.body;
            const userId = req.user.id;

            // Validate request
            await validateRequest(req, {
                targetUserId: { required: true, type: 'string', format: 'uuid' }
            });

            // Rate limiting
            await this.rateLimiter.checkLimit(userId, 'unblock', 100, 3600); // 100 unblocks per hour

            // Perform unblock action
            const result = await this.interactionService.unblockUser(userId, targetUserId);

            // Emit real-time event
            await this.eventHandler.emitUnblockEvent({
                blockerId: userId,
                blockedId: targetUserId,
                timestamp: new Date()
            });

            // Update metrics
            metrics.incrementCounter('social_unblocks_total', {
                user_id: userId,
                target_user_id: targetUserId
            });

            const processingTime = Date.now() - startTime;
            metrics.recordHistogram('social_action_processing_time', processingTime, {
                action: 'unblock'
            });

            res.status(200).json({
                success: true,
                data: {
                    relationship: result.relationship,
                    processingTime
                }
            });

        } catch (error) {
            logger.error('Unblock user error:', {
                userId: req.user.id,
                targetUserId: req.body.targetUserId,
                error: error.message
            });

            next(error);
        }
    }

    /**
     * Mute a user
     */
    async muteUser(req: SocialActionRequest, res: Response, next: NextFunction): Promise<void> {
        const startTime = Date.now();
        
        try {
            const { targetUserId, reason } = req.body;
            const userId = req.user.id;

            // Validate request
            await validateRequest(req, {
                targetUserId: { required: true, type: 'string', format: 'uuid' },
                reason: { type: 'string', maxLength: 500 }
            });

            // Rate limiting
            await this.rateLimiter.checkLimit(userId, 'mute', 200, 3600); // 200 mutes per hour

            // Perform mute action
            const result = await this.interactionService.muteUser(userId, targetUserId, {
                reason,
                timestamp: new Date()
            });

            // Emit real-time event
            await this.eventHandler.emitMuteEvent({
                muterId: userId,
                mutedId: targetUserId,
                timestamp: new Date(),
                reason
            });

            // Update metrics
            metrics.incrementCounter('social_mutes_total', {
                user_id: userId,
                target_user_id: targetUserId
            });

            const processingTime = Date.now() - startTime;
            metrics.recordHistogram('social_action_processing_time', processingTime, {
                action: 'mute'
            });

            res.status(200).json({
                success: true,
                data: {
                    relationship: result.relationship,
                    processingTime
                }
            });

        } catch (error) {
            logger.error('Mute user error:', {
                userId: req.user.id,
                targetUserId: req.body.targetUserId,
                error: error.message
            });

            next(error);
        }
    }

    /**
     * Unmute a user
     */
    async unmuteUser(req: SocialActionRequest, res: Response, next: NextFunction): Promise<void> {
        const startTime = Date.now();
        
        try {
            const { targetUserId } = req.body;
            const userId = req.user.id;

            // Validate request
            await validateRequest(req, {
                targetUserId: { required: true, type: 'string', format: 'uuid' }
            });

            // Rate limiting
            await this.rateLimiter.checkLimit(userId, 'unmute', 200, 3600); // 200 unmutes per hour

            // Perform unmute action
            const result = await this.interactionService.unmuteUser(userId, targetUserId);

            // Emit real-time event
            await this.eventHandler.emitUnmuteEvent({
                muterId: userId,
                mutedId: targetUserId,
                timestamp: new Date()
            });

            // Update metrics
            metrics.incrementCounter('social_unmutes_total', {
                user_id: userId,
                target_user_id: targetUserId
            });

            const processingTime = Date.now() - startTime;
            metrics.recordHistogram('social_action_processing_time', processingTime, {
                action: 'unmute'
            });

            res.status(200).json({
                success: true,
                data: {
                    relationship: result.relationship,
                    processingTime
                }
            });

        } catch (error) {
            logger.error('Unmute user error:', {
                userId: req.user.id,
                targetUserId: req.body.targetUserId,
                error: error.message
            });

            next(error);
        }
    }

    /**
     * Report a user
     */
    async reportUser(req: SocialActionRequest, res: Response, next: NextFunction): Promise<void> {
        const startTime = Date.now();
        
        try {
            const { targetUserId, reason, metadata } = req.body;
            const userId = req.user.id;

            // Validate request
            await validateRequest(req, {
                targetUserId: { required: true, type: 'string', format: 'uuid' },
                reason: { required: true, type: 'string', minLength: 10, maxLength: 2000 },
                metadata: { type: 'object' }
            });

            // Rate limiting
            await this.rateLimiter.checkLimit(userId, 'report', 10, 3600); // 10 reports per hour

            // Abuse detection
            const abuseScore = await this.abuseDetection.analyzeAction(userId, 'report', {
                targetUserId,
                frequency: await this.getActionFrequency(userId, 'report'),
                patterns: await this.getUserPatterns(userId)
            });

            if (abuseScore > 0.7) {
                throw new Error('Action blocked due to excessive reporting activity');
            }

            // Perform report action
            const result = await this.interactionService.reportUser(userId, targetUserId, {
                reason,
                metadata,
                timestamp: new Date()
            });

            // Emit real-time event
            await this.eventHandler.emitReportEvent({
                reporterId: userId,
                reportedId: targetUserId,
                timestamp: new Date(),
                reason,
                metadata
            });

            // Send to moderation queue
            await this.notificationService.sendModerationReport({
                reporterId: userId,
                reportedId: targetUserId,
                reason,
                metadata: result.metadata
            });

            // Update metrics
            metrics.incrementCounter('social_reports_total', {
                user_id: userId,
                target_user_id: targetUserId,
                reason_type: this.categorizeReportReason(reason)
            });

            const processingTime = Date.now() - startTime;
            metrics.recordHistogram('social_action_processing_time', processingTime, {
                action: 'report'
            });

            res.status(200).json({
                success: true,
                data: {
                    report: result.report,
                    processingTime
                }
            });

        } catch (error) {
            logger.error('Report user error:', {
                userId: req.user.id,
                targetUserId: req.body.targetUserId,
                error: error.message
            });

            next(error);
        }
    }

    /**
     * Batch social actions
     */
    async batchSocialActions(req: BatchSocialActionRequest, res: Response, next: NextFunction): Promise<void> {
        const startTime = Date.now();
        
        try {
            const { actions } = req.body;
            const userId = req.user.id;

            // Validate request
            await validateRequest(req, {
                actions: {
                    required: true,
                    type: 'array',
                    minLength: 1,
                    maxLength: 50,
                    items: {
                        type: 'object',
                        properties: {
                            targetUserId: { type: 'string', format: 'uuid' },
                            action: { type: 'string', enum: ['follow', 'unfollow', 'block', 'unblock', 'mute', 'unmute'] },
                            reason: { type: 'string', maxLength: 1000 },
                            metadata: { type: 'object' }
                        }
                    }
                }
            });

            // Rate limiting for batch operations
            await this.rateLimiter.checkLimit(userId, 'batch_social', 5, 3600); // 5 batch operations per hour

            // Abuse detection for batch operations
            const abuseScore = await this.abuseDetection.analyzeBatchAction(userId, actions);
            if (abuseScore > 0.8) {
                throw new Error('Batch action blocked due to suspicious activity');
            }

            // Process batch actions
            const results = await this.interactionService.processBatchActions(userId, actions);

            // Emit batch events
            await this.eventHandler.emitBatchSocialEvent({
                userId,
                actions: results,
                timestamp: new Date()
            });

            // Update metrics
            metrics.incrementCounter('social_batch_actions_total', {
                user_id: userId,
                action_count: actions.length
            });

            const processingTime = Date.now() - startTime;
            metrics.recordHistogram('social_batch_processing_time', processingTime);

            res.status(200).json({
                success: true,
                data: {
                    results,
                    summary: {
                        total: actions.length,
                        successful: results.filter(r => r.success).length,
                        failed: results.filter(r => !r.success).length
                    },
                    processingTime
                }
            });

        } catch (error) {
            logger.error('Batch social actions error:', {
                userId: req.user.id,
                actionCount: req.body.actions?.length,
                error: error.message
            });

            next(error);
        }
    }

    /**
     * Get social activity feed
     */
    async getSocialActivity(req: SocialActivityRequest, res: Response, next: NextFunction): Promise<void> {
        const startTime = Date.now();
        
        try {
            const userId = req.user.id;
            const { limit = '20', offset = '0', type, since, until } = req.query;

            // Validate query parameters
            const limitNum = parseInt(limit);
            const offsetNum = parseInt(offset);

            if (limitNum > 100) {
                return res.status(400).json({
                    success: false,
                    error: 'Limit cannot exceed 100'
                });
            }

            // Rate limiting for activity feed
            await this.rateLimiter.checkLimit(userId, 'activity_feed', 1000, 3600); // 1000 requests per hour

            // Get social activity
            const activity = await this.interactionService.getSocialActivity(userId, {
                limit: limitNum,
                offset: offsetNum,
                type,
                since: since ? new Date(since) : undefined,
                until: until ? new Date(until) : undefined
            });

            // Update metrics
            metrics.incrementCounter('social_activity_requests_total', {
                user_id: userId,
                type: type || 'all'
            });

            const processingTime = Date.now() - startTime;
            metrics.recordHistogram('social_activity_processing_time', processingTime);

            res.status(200).json({
                success: true,
                data: {
                    activity: activity.items,
                    pagination: {
                        limit: limitNum,
                        offset: offsetNum,
                        total: activity.total,
                        hasMore: activity.hasMore
                    },
                    processingTime
                }
            });

        } catch (error) {
            logger.error('Get social activity error:', {
                userId: req.user.id,
                error: error.message
            });

            next(error);
        }
    }

    /**
     * Get user relationships
     */
    async getUserRelationships(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        const startTime = Date.now();
        
        try {
            const userId = req.user.id;
            const targetUserId = req.params.userId;

            // Validate target user ID
            if (!targetUserId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetUserId)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid user ID'
                });
            }

            // Rate limiting
            await this.rateLimiter.checkLimit(userId, 'relationships', 500, 3600); // 500 requests per hour

            // Get relationships
            const relationships = await this.interactionService.getUserRelationships(userId, targetUserId);

            // Update metrics
            metrics.incrementCounter('social_relationship_requests_total', {
                user_id: userId,
                target_user_id: targetUserId
            });

            const processingTime = Date.now() - startTime;
            metrics.recordHistogram('social_relationship_processing_time', processingTime);

            res.status(200).json({
                success: true,
                data: {
                    relationships,
                    processingTime
                }
            });

        } catch (error) {
            logger.error('Get user relationships error:', {
                userId: req.user.id,
                targetUserId: req.params.userId,
                error: error.message
            });

            next(error);
        }
    }

    /**
     * Get social statistics
     */
    async getSocialStatistics(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        const startTime = Date.now();
        
        try {
            const userId = req.user.id;

            // Rate limiting
            await this.rateLimiter.checkLimit(userId, 'statistics', 100, 3600); // 100 requests per hour

            // Get statistics
            const statistics = await this.interactionService.getSocialStatistics(userId);

            // Update metrics
            metrics.incrementCounter('social_statistics_requests_total', {
                user_id: userId
            });

            const processingTime = Date.now() - startTime;
            metrics.recordHistogram('social_statistics_processing_time', processingTime);

            res.status(200).json({
                success: true,
                data: {
                    statistics,
                    processingTime
                }
            });

        } catch (error) {
            logger.error('Get social statistics error:', {
                userId: req.user.id,
                error: error.message
            });

            next(error);
        }
    }

    // Helper methods
    private async getActionFrequency(userId: string, action: string): Promise<number> {
        // Get action frequency in the last hour
        return await this.interactionService.getActionFrequency(userId, action, 3600);
    }

    private async getUserPatterns(userId: string): Promise<any> {
        // Get user behavior patterns
        return await this.interactionService.getUserPatterns(userId);
    }

    private categorizeReportReason(reason: string): string {
        const reasonLower = reason.toLowerCase();
        
        if (reasonLower.includes('spam') || reasonLower.includes('bot')) {
            return 'spam';
        } else if (reasonLower.includes('harassment') || reasonLower.includes('bully')) {
            return 'harassment';
        } else if (reasonLower.includes('inappropriate') || reasonLower.includes('offensive')) {
            return 'inappropriate_content';
        } else if (reasonLower.includes('fake') || reasonLower.includes('impersonat')) {
            return 'fake_account';
        } else {
            return 'other';
        }
    }
}
