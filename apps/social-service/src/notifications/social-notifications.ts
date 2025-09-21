// Social Notifications System
// Author: ChitLaq Development Team
// Date: 2024-01-15

import Redis from 'ioredis';
import { logger } from '../utils/logger';
import { metrics } from '../utils/metrics';

export interface NotificationTemplate {
    id: string;
    type: string;
    title: string;
    body: string;
    icon?: string;
    actionUrl?: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    category: string;
    channels: ('push' | 'email' | 'in_app')[];
    variables: string[];
}

export interface Notification {
    id: string;
    userId: string;
    type: string;
    title: string;
    body: string;
    icon?: string;
    actionUrl?: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    category: string;
    channels: ('push' | 'email' | 'in_app')[];
    data: Record<string, any>;
    sentAt?: Date;
    readAt?: Date;
    clickedAt?: Date;
    status: 'pending' | 'sent' | 'delivered' | 'failed' | 'read' | 'clicked';
    retryCount: number;
    maxRetries: number;
    scheduledFor?: Date;
    expiresAt?: Date;
}

export interface NotificationPreferences {
    userId: string;
    categories: Record<string, {
        push: boolean;
        email: boolean;
        in_app: boolean;
    }>;
    quietHours: {
        enabled: boolean;
        start: string; // HH:MM format
        end: string; // HH:MM format
        timezone: string;
    };
    frequency: 'immediate' | 'digest' | 'weekly' | 'never';
    language: string;
    updatedAt: Date;
}

export interface NotificationStats {
    totalSent: number;
    totalDelivered: number;
    totalRead: number;
    totalClicked: number;
    deliveryRate: number;
    readRate: number;
    clickRate: number;
    byType: Record<string, number>;
    byCategory: Record<string, number>;
    byChannel: Record<string, number>;
}

export class SocialNotificationService {
    private redis: Redis;
    private templates: Map<string, NotificationTemplate> = new Map();
    private config: {
        redis: {
            host: string;
            port: number;
            password?: string;
            db: number;
        };
        channels: {
            push: {
                enabled: boolean;
                vapidKeys: {
                    publicKey: string;
                    privateKey: string;
                };
            };
            email: {
                enabled: boolean;
                provider: string;
                apiKey: string;
            };
            in_app: {
                enabled: boolean;
                maxPerUser: number;
                retentionDays: number;
            };
        };
        limits: {
            maxNotificationsPerUser: number;
            maxRetries: number;
            retryDelayMs: number;
            batchSize: number;
        };
    };

    constructor() {
        this.config = {
            redis: {
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT || '6379'),
                password: process.env.REDIS_PASSWORD,
                db: parseInt(process.env.REDIS_DB || '2') // Use different DB for notifications
            },
            channels: {
                push: {
                    enabled: process.env.PUSH_NOTIFICATIONS_ENABLED === 'true',
                    vapidKeys: {
                        publicKey: process.env.VAPID_PUBLIC_KEY || '',
                        privateKey: process.env.VAPID_PRIVATE_KEY || ''
                    }
                },
                email: {
                    enabled: process.env.EMAIL_NOTIFICATIONS_ENABLED === 'true',
                    provider: process.env.EMAIL_PROVIDER || 'sendgrid',
                    apiKey: process.env.EMAIL_API_KEY || ''
                },
                in_app: {
                    enabled: true,
                    maxPerUser: 100,
                    retentionDays: 30
                }
            },
            limits: {
                maxNotificationsPerUser: 1000,
                maxRetries: 3,
                retryDelayMs: 5000,
                batchSize: 100
            }
        };

        this.redis = new Redis(this.config.redis);
        this.initializeTemplates();
    }

    /**
     * Initialize notification templates
     */
    private initializeTemplates(): void {
        const templates: NotificationTemplate[] = [
            // Social interactions
            {
                id: 'follow',
                type: 'social_follow',
                title: 'New Follower',
                body: '{followerName} started following you',
                icon: '👥',
                actionUrl: '/profile/{followerId}',
                priority: 'medium',
                category: 'social',
                channels: ['push', 'in_app'],
                variables: ['followerName', 'followerId']
            },
            {
                id: 'unfollow',
                type: 'social_unfollow',
                title: 'Follower Update',
                body: '{followerName} stopped following you',
                icon: '👥',
                actionUrl: '/profile/{followerId}',
                priority: 'low',
                category: 'social',
                channels: ['in_app'],
                variables: ['followerName', 'followerId']
            },
            {
                id: 'block',
                type: 'social_block',
                title: 'Blocked User',
                body: 'You have been blocked by {blockerName}',
                icon: '🚫',
                actionUrl: '/blocked',
                priority: 'high',
                category: 'social',
                channels: ['in_app'],
                variables: ['blockerName']
            },
            {
                id: 'unblock',
                type: 'social_unblock',
                title: 'Unblocked',
                body: 'You have been unblocked by {unblockerName}',
                icon: '✅',
                actionUrl: '/profile/{unblockerId}',
                priority: 'medium',
                category: 'social',
                channels: ['in_app'],
                variables: ['unblockerName', 'unblockerId']
            },
            {
                id: 'mute',
                type: 'social_mute',
                title: 'Muted User',
                body: 'You have been muted by {muterName}',
                icon: '🔇',
                actionUrl: '/muted',
                priority: 'low',
                category: 'social',
                channels: ['in_app'],
                variables: ['muterName']
            },
            {
                id: 'unmute',
                type: 'social_unmute',
                title: 'Unmuted',
                body: 'You have been unmuted by {unmuterName}',
                icon: '🔊',
                actionUrl: '/profile/{unmuterId}',
                priority: 'low',
                category: 'social',
                channels: ['in_app'],
                variables: ['unmuterName', 'unmuterId']
            },
            {
                id: 'report',
                type: 'social_report',
                title: 'Content Reported',
                body: 'Your content has been reported by {reporterName}',
                icon: '⚠️',
                actionUrl: '/reports',
                priority: 'high',
                category: 'moderation',
                channels: ['push', 'email', 'in_app'],
                variables: ['reporterName']
            },

            // Content interactions
            {
                id: 'post_like',
                type: 'content_like',
                title: 'Post Liked',
                body: '{likerName} liked your post',
                icon: '❤️',
                actionUrl: '/post/{postId}',
                priority: 'low',
                category: 'content',
                channels: ['in_app'],
                variables: ['likerName', 'postId']
            },
            {
                id: 'post_comment',
                type: 'content_comment',
                title: 'New Comment',
                body: '{commenterName} commented on your post',
                icon: '💬',
                actionUrl: '/post/{postId}',
                priority: 'medium',
                category: 'content',
                channels: ['push', 'in_app'],
                variables: ['commenterName', 'postId']
            },
            {
                id: 'post_share',
                type: 'content_share',
                title: 'Post Shared',
                body: '{sharerName} shared your post',
                icon: '📤',
                actionUrl: '/post/{postId}',
                priority: 'medium',
                category: 'content',
                channels: ['push', 'in_app'],
                variables: ['sharerName', 'postId']
            },
            {
                id: 'post_mention',
                type: 'content_mention',
                title: 'Mentioned in Post',
                body: '{authorName} mentioned you in a post',
                icon: '📝',
                actionUrl: '/post/{postId}',
                priority: 'high',
                category: 'content',
                channels: ['push', 'in_app'],
                variables: ['authorName', 'postId']
            },

            // University network
            {
                id: 'university_connection',
                type: 'university_connection',
                title: 'University Connection',
                body: '{connectionName} from your university joined ChitLaq',
                icon: '🎓',
                actionUrl: '/profile/{connectionId}',
                priority: 'medium',
                category: 'university',
                channels: ['push', 'in_app'],
                variables: ['connectionName', 'connectionId']
            },
            {
                id: 'university_event',
                type: 'university_event',
                title: 'University Event',
                body: 'New event at {universityName}: {eventTitle}',
                icon: '📅',
                actionUrl: '/events/{eventId}',
                priority: 'medium',
                category: 'university',
                channels: ['push', 'in_app'],
                variables: ['universityName', 'eventTitle', 'eventId']
            },

            // System notifications
            {
                id: 'system_maintenance',
                type: 'system_maintenance',
                title: 'Scheduled Maintenance',
                body: 'ChitLaq will be under maintenance from {startTime} to {endTime}',
                icon: '🔧',
                actionUrl: '/maintenance',
                priority: 'high',
                category: 'system',
                channels: ['push', 'email', 'in_app'],
                variables: ['startTime', 'endTime']
            },
            {
                id: 'system_update',
                type: 'system_update',
                title: 'App Update Available',
                body: 'A new version of ChitLaq is available with exciting features!',
                icon: '🆕',
                actionUrl: '/update',
                priority: 'medium',
                category: 'system',
                channels: ['push', 'in_app'],
                variables: []
            },
            {
                id: 'system_security',
                type: 'system_security',
                title: 'Security Alert',
                body: 'Unusual activity detected on your account. Please verify your identity.',
                icon: '🔒',
                actionUrl: '/security',
                priority: 'urgent',
                category: 'security',
                channels: ['push', 'email', 'in_app'],
                variables: []
            },

            // Moderation
            {
                id: 'content_removed',
                type: 'content_removed',
                title: 'Content Removed',
                body: 'Your {contentType} has been removed for violating community guidelines',
                icon: '❌',
                actionUrl: '/guidelines',
                priority: 'high',
                category: 'moderation',
                channels: ['push', 'email', 'in_app'],
                variables: ['contentType']
            },
            {
                id: 'account_suspended',
                type: 'account_suspended',
                title: 'Account Suspended',
                body: 'Your account has been suspended for {duration}. Reason: {reason}',
                icon: '⏸️',
                actionUrl: '/suspension',
                priority: 'urgent',
                category: 'moderation',
                channels: ['push', 'email', 'in_app'],
                variables: ['duration', 'reason']
            },
            {
                id: 'account_restored',
                type: 'account_restored',
                title: 'Account Restored',
                body: 'Your account has been restored. Welcome back to ChitLaq!',
                icon: '✅',
                actionUrl: '/profile',
                priority: 'high',
                category: 'moderation',
                channels: ['push', 'email', 'in_app'],
                variables: []
            }
        ];

        templates.forEach(template => {
            this.templates.set(template.id, template);
        });
    }

    /**
     * Send notification to user
     */
    async sendNotification(
        userId: string,
        templateId: string,
        data: Record<string, any>,
        options: {
            priority?: 'low' | 'medium' | 'high' | 'urgent';
            channels?: ('push' | 'email' | 'in_app')[];
            scheduledFor?: Date;
            expiresAt?: Date;
        } = {}
    ): Promise<Notification | null> {
        try {
            const template = this.templates.get(templateId);
            if (!template) {
                logger.error('Notification template not found', { templateId });
                return null;
            }

            // Check user preferences
            const preferences = await this.getUserPreferences(userId);
            if (!preferences) {
                logger.warn('User preferences not found', { userId: this.hashUserId(userId) });
                return null;
            }

            // Check if user is in quiet hours
            if (this.isInQuietHours(preferences.quietHours)) {
                logger.debug('User in quiet hours, skipping notification', {
                    userId: this.hashUserId(userId),
                    templateId
                });
                return null;
            }

            // Filter channels based on preferences
            const allowedChannels = this.filterChannelsByPreferences(
                options.channels || template.channels,
                preferences,
                template.category
            );

            if (allowedChannels.length === 0) {
                logger.debug('No allowed channels for notification', {
                    userId: this.hashUserId(userId),
                    templateId,
                    category: template.category
                });
                return null;
            }

            // Create notification
            const notification: Notification = {
                id: this.generateNotificationId(),
                userId,
                type: template.type,
                title: this.interpolateTemplate(template.title, data),
                body: this.interpolateTemplate(template.body, data),
                icon: template.icon,
                actionUrl: template.actionUrl ? this.interpolateTemplate(template.actionUrl, data) : undefined,
                priority: options.priority || template.priority,
                category: template.category,
                channels: allowedChannels,
                data,
                status: 'pending',
                retryCount: 0,
                maxRetries: this.config.limits.maxRetries,
                scheduledFor: options.scheduledFor,
                expiresAt: options.expiresAt
            };

            // Store notification
            await this.storeNotification(notification);

            // Send immediately if not scheduled
            if (!notification.scheduledFor) {
                await this.processNotification(notification);
            }

            // Update metrics
            metrics.incrementCounter('notifications_created_total', {
                type: template.type,
                category: template.category,
                userId: this.hashUserId(userId)
            });

            logger.info('Notification created', {
                notificationId: notification.id,
                userId: this.hashUserId(userId),
                type: template.type,
                channels: allowedChannels
            });

            return notification;

        } catch (error) {
            logger.error('Error sending notification', {
                userId: this.hashUserId(userId),
                templateId,
                error: error.message
            });
            return null;
        }
    }

    /**
     * Process notification (send to channels)
     */
    private async processNotification(notification: Notification): Promise<void> {
        try {
            for (const channel of notification.channels) {
                try {
                    await this.sendToChannel(notification, channel);
                } catch (error) {
                    logger.error('Error sending to channel', {
                        notificationId: notification.id,
                        channel,
                        error: error.message
                    });
                    
                    // Increment retry count
                    notification.retryCount++;
                    
                    // Schedule retry if under limit
                    if (notification.retryCount < notification.maxRetries) {
                        await this.scheduleRetry(notification, channel);
                    } else {
                        notification.status = 'failed';
                        await this.updateNotification(notification);
                    }
                }
            }

            // Update status if all channels processed successfully
            if (notification.status === 'pending') {
                notification.status = 'sent';
                notification.sentAt = new Date();
                await this.updateNotification(notification);
            }

        } catch (error) {
            logger.error('Error processing notification', {
                notificationId: notification.id,
                error: error.message
            });
        }
    }

    /**
     * Send notification to specific channel
     */
    private async sendToChannel(notification: Notification, channel: string): Promise<void> {
        switch (channel) {
            case 'push':
                await this.sendPushNotification(notification);
                break;
            case 'email':
                await this.sendEmailNotification(notification);
                break;
            case 'in_app':
                await this.sendInAppNotification(notification);
                break;
            default:
                throw new Error(`Unknown channel: ${channel}`);
        }
    }

    /**
     * Send push notification
     */
    private async sendPushNotification(notification: Notification): Promise<void> {
        if (!this.config.channels.push.enabled) {
            throw new Error('Push notifications not enabled');
        }

        // TODO: Implement actual push notification sending
        // This would integrate with a service like Firebase Cloud Messaging
        logger.info('Push notification sent', {
            notificationId: notification.id,
            userId: this.hashUserId(notification.userId)
        });
    }

    /**
     * Send email notification
     */
    private async sendEmailNotification(notification: Notification): Promise<void> {
        if (!this.config.channels.email.enabled) {
            throw new Error('Email notifications not enabled');
        }

        // TODO: Implement actual email sending
        // This would integrate with a service like SendGrid or AWS SES
        logger.info('Email notification sent', {
            notificationId: notification.id,
            userId: this.hashUserId(notification.userId)
        });
    }

    /**
     * Send in-app notification
     */
    private async sendInAppNotification(notification: Notification): Promise<void> {
        if (!this.config.channels.in_app.enabled) {
            throw new Error('In-app notifications not enabled');
        }

        // Store in user's notification list
        const userNotificationsKey = `notifications:${notification.userId}`;
        await this.redis.lpush(userNotificationsKey, notification.id);
        
        // Limit notifications per user
        await this.redis.ltrim(userNotificationsKey, 0, this.config.channels.in_app.maxPerUser - 1);
        
        // Set expiration
        await this.redis.expire(userNotificationsKey, this.config.channels.in_app.retentionDays * 86400);

        logger.info('In-app notification sent', {
            notificationId: notification.id,
            userId: this.hashUserId(notification.userId)
        });
    }

    /**
     * Get user notifications
     */
    async getUserNotifications(
        userId: string,
        options: {
            limit?: number;
            offset?: number;
            category?: string;
            status?: string;
            unreadOnly?: boolean;
        } = {}
    ): Promise<Notification[]> {
        try {
            const userNotificationsKey = `notifications:${userId}`;
            const notificationIds = await this.redis.lrange(
                userNotificationsKey,
                options.offset || 0,
                (options.offset || 0) + (options.limit || 50) - 1
            );

            const notifications: Notification[] = [];
            
            for (const notificationId of notificationIds) {
                const notification = await this.getNotification(notificationId);
                if (notification) {
                    // Apply filters
                    if (options.category && notification.category !== options.category) {
                        continue;
                    }
                    if (options.status && notification.status !== options.status) {
                        continue;
                    }
                    if (options.unreadOnly && notification.readAt) {
                        continue;
                    }
                    
                    notifications.push(notification);
                }
            }

            return notifications;

        } catch (error) {
            logger.error('Error getting user notifications', {
                userId: this.hashUserId(userId),
                error: error.message
            });
            return [];
        }
    }

    /**
     * Mark notification as read
     */
    async markAsRead(notificationId: string, userId: string): Promise<boolean> {
        try {
            const notification = await this.getNotification(notificationId);
            if (!notification || notification.userId !== userId) {
                return false;
            }

            notification.readAt = new Date();
            notification.status = 'read';
            await this.updateNotification(notification);

            // Update metrics
            metrics.incrementCounter('notifications_read_total', {
                type: notification.type,
                category: notification.category,
                userId: this.hashUserId(userId)
            });

            logger.info('Notification marked as read', {
                notificationId,
                userId: this.hashUserId(userId)
            });

            return true;

        } catch (error) {
            logger.error('Error marking notification as read', {
                notificationId,
                userId: this.hashUserId(userId),
                error: error.message
            });
            return false;
        }
    }

    /**
     * Mark notification as clicked
     */
    async markAsClicked(notificationId: string, userId: string): Promise<boolean> {
        try {
            const notification = await this.getNotification(notificationId);
            if (!notification || notification.userId !== userId) {
                return false;
            }

            notification.clickedAt = new Date();
            notification.status = 'clicked';
            await this.updateNotification(notification);

            // Update metrics
            metrics.incrementCounter('notifications_clicked_total', {
                type: notification.type,
                category: notification.category,
                userId: this.hashUserId(userId)
            });

            logger.info('Notification marked as clicked', {
                notificationId,
                userId: this.hashUserId(userId)
            });

            return true;

        } catch (error) {
            logger.error('Error marking notification as clicked', {
                notificationId,
                userId: this.hashUserId(userId),
                error: error.message
            });
            return false;
        }
    }

    /**
     * Get user notification preferences
     */
    async getUserPreferences(userId: string): Promise<NotificationPreferences | null> {
        try {
            const key = `notification_preferences:${userId}`;
            const data = await this.redis.get(key);
            
            if (!data) {
                // Return default preferences
                return {
                    userId,
                    categories: {
                        social: { push: true, email: false, in_app: true },
                        content: { push: true, email: false, in_app: true },
                        university: { push: true, email: false, in_app: true },
                        system: { push: true, email: true, in_app: true },
                        security: { push: true, email: true, in_app: true },
                        moderation: { push: true, email: true, in_app: true }
                    },
                    quietHours: {
                        enabled: false,
                        start: '22:00',
                        end: '08:00',
                        timezone: 'UTC'
                    },
                    frequency: 'immediate',
                    language: 'en',
                    updatedAt: new Date()
                };
            }

            return JSON.parse(data);

        } catch (error) {
            logger.error('Error getting user preferences', {
                userId: this.hashUserId(userId),
                error: error.message
            });
            return null;
        }
    }

    /**
     * Update user notification preferences
     */
    async updateUserPreferences(
        userId: string,
        preferences: Partial<NotificationPreferences>
    ): Promise<boolean> {
        try {
            const existing = await this.getUserPreferences(userId);
            if (!existing) {
                return false;
            }

            const updated: NotificationPreferences = {
                ...existing,
                ...preferences,
                updatedAt: new Date()
            };

            const key = `notification_preferences:${userId}`;
            await this.redis.setex(key, 86400 * 365, JSON.stringify(updated)); // 1 year

            logger.info('User preferences updated', {
                userId: this.hashUserId(userId)
            });

            return true;

        } catch (error) {
            logger.error('Error updating user preferences', {
                userId: this.hashUserId(userId),
                error: error.message
            });
            return false;
        }
    }

    /**
     * Get notification statistics
     */
    async getNotificationStats(): Promise<NotificationStats> {
        try {
            const stats: NotificationStats = {
                totalSent: 0,
                totalDelivered: 0,
                totalRead: 0,
                totalClicked: 0,
                deliveryRate: 0,
                readRate: 0,
                clickRate: 0,
                byType: {},
                byCategory: {},
                byChannel: {}
            };

            // Get all notification keys
            const notificationKeys = await this.redis.keys('notification:*');
            
            for (const key of notificationKeys) {
                const notificationData = await this.redis.get(key);
                if (notificationData) {
                    const notification: Notification = JSON.parse(notificationData);
                    
                    // Count by status
                    if (notification.status === 'sent' || notification.status === 'delivered') {
                        stats.totalSent++;
                    }
                    if (notification.status === 'delivered') {
                        stats.totalDelivered++;
                    }
                    if (notification.readAt) {
                        stats.totalRead++;
                    }
                    if (notification.clickedAt) {
                        stats.totalClicked++;
                    }
                    
                    // Count by type
                    stats.byType[notification.type] = (stats.byType[notification.type] || 0) + 1;
                    
                    // Count by category
                    stats.byCategory[notification.category] = (stats.byCategory[notification.category] || 0) + 1;
                    
                    // Count by channel
                    notification.channels.forEach(channel => {
                        stats.byChannel[channel] = (stats.byChannel[channel] || 0) + 1;
                    });
                }
            }

            // Calculate rates
            if (stats.totalSent > 0) {
                stats.deliveryRate = (stats.totalDelivered / stats.totalSent) * 100;
                stats.readRate = (stats.totalRead / stats.totalSent) * 100;
                stats.clickRate = (stats.totalClicked / stats.totalSent) * 100;
            }

            return stats;

        } catch (error) {
            logger.error('Error getting notification stats', {
                error: error.message
            });
            return {
                totalSent: 0,
                totalDelivered: 0,
                totalRead: 0,
                totalClicked: 0,
                deliveryRate: 0,
                readRate: 0,
                clickRate: 0,
                byType: {},
                byCategory: {},
                byChannel: {}
            };
        }
    }

    /**
     * Store notification
     */
    private async storeNotification(notification: Notification): Promise<void> {
        try {
            const key = `notification:${notification.id}`;
            await this.redis.setex(
                key,
                86400 * 30, // 30 days
                JSON.stringify(notification)
            );

            // Add to user's notification list
            const userNotificationsKey = `notifications:${notification.userId}`;
            await this.redis.lpush(userNotificationsKey, notification.id);
            await this.redis.expire(userNotificationsKey, 86400 * 30); // 30 days

        } catch (error) {
            logger.error('Error storing notification', {
                notificationId: notification.id,
                error: error.message
            });
        }
    }

    /**
     * Get notification by ID
     */
    private async getNotification(notificationId: string): Promise<Notification | null> {
        try {
            const key = `notification:${notificationId}`;
            const data = await this.redis.get(key);
            
            if (!data) {
                return null;
            }

            return JSON.parse(data);

        } catch (error) {
            logger.error('Error getting notification', {
                notificationId,
                error: error.message
            });
            return null;
        }
    }

    /**
     * Update notification
     */
    private async updateNotification(notification: Notification): Promise<void> {
        try {
            const key = `notification:${notification.id}`;
            await this.redis.setex(
                key,
                86400 * 30, // 30 days
                JSON.stringify(notification)
            );

        } catch (error) {
            logger.error('Error updating notification', {
                notificationId: notification.id,
                error: error.message
            });
        }
    }

    /**
     * Schedule retry for failed notification
     */
    private async scheduleRetry(notification: Notification, channel: string): Promise<void> {
        try {
            const retryKey = `notification_retry:${notification.id}:${channel}`;
            const retryTime = Date.now() + this.config.limits.retryDelayMs;
            
            await this.redis.zadd('notification_retries', retryTime, retryKey);
            
            logger.info('Notification retry scheduled', {
                notificationId: notification.id,
                channel,
                retryTime: new Date(retryTime)
            });

        } catch (error) {
            logger.error('Error scheduling notification retry', {
                notificationId: notification.id,
                channel,
                error: error.message
            });
        }
    }

    /**
     * Interpolate template with data
     */
    private interpolateTemplate(template: string, data: Record<string, any>): string {
        return template.replace(/\{(\w+)\}/g, (match, key) => {
            return data[key] || match;
        });
    }

    /**
     * Filter channels by user preferences
     */
    private filterChannelsByPreferences(
        channels: string[],
        preferences: NotificationPreferences,
        category: string
    ): string[] {
        const categoryPrefs = preferences.categories[category];
        if (!categoryPrefs) {
            return channels;
        }

        return channels.filter(channel => {
            return categoryPrefs[channel as keyof typeof categoryPrefs] === true;
        });
    }

    /**
     * Check if user is in quiet hours
     */
    private isInQuietHours(quietHours: NotificationPreferences['quietHours']): boolean {
        if (!quietHours.enabled) {
            return false;
        }

        const now = new Date();
        const currentTime = now.toLocaleTimeString('en-US', {
            hour12: false,
            timeZone: quietHours.timezone
        });

        const start = quietHours.start;
        const end = quietHours.end;

        // Handle overnight quiet hours (e.g., 22:00 to 08:00)
        if (start > end) {
            return currentTime >= start || currentTime <= end;
        }

        return currentTime >= start && currentTime <= end;
    }

    /**
     * Generate unique notification ID
     */
    private generateNotificationId(): string {
        return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Hash user ID for privacy
     */
    private hashUserId(userId: string): string {
        return Buffer.from(userId).toString('base64').slice(0, 16);
    }

    /**
     * Close Redis connection
     */
    async close(): Promise<void> {
        await this.redis.quit();
    }
}
