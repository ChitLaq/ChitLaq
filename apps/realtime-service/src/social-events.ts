// Real-time Social Events Service
// Author: ChitLaq Development Team
// Date: 2024-01-15

import { Server as SocketIOServer } from 'socket.io';
import { Redis } from 'ioredis';
import { logger } from '../utils/logger';
import { metrics } from '../utils/metrics';

export interface SocialEvent {
    id: string;
    type: string;
    userId: string;
    targetUserId?: string;
    data: Record<string, any>;
    timestamp: Date;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    channels: ('websocket' | 'server_sent_events' | 'push')[];
    ttl: number; // Time to live in seconds
}

export interface EventSubscription {
    userId: string;
    eventTypes: string[];
    channels: string[];
    filters: Record<string, any>;
    createdAt: Date;
    expiresAt: Date;
}

export interface EventMetrics {
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsByPriority: Record<string, number>;
    eventsByChannel: Record<string, number>;
    activeSubscriptions: number;
    averageLatency: number;
    errorRate: number;
}

export class SocialEventService {
    private io: SocketIOServer;
    private redis: Redis;
    private subscriptions: Map<string, EventSubscription> = new Map();
    private config: {
        redis: {
            host: string;
            port: number;
            password?: string;
            db: number;
        };
        websocket: {
            enabled: boolean;
            cors: {
                origin: string[];
                credentials: boolean;
            };
            pingTimeout: number;
            pingInterval: number;
        };
        serverSentEvents: {
            enabled: boolean;
            maxConnections: number;
            heartbeatInterval: number;
        };
        push: {
            enabled: boolean;
            vapidKeys: {
                publicKey: string;
                privateKey: string;
            };
        };
        limits: {
            maxEventsPerUser: number;
            maxSubscriptionsPerUser: number;
            eventRetentionDays: number;
            subscriptionTimeoutMs: number;
        };
    };

    constructor(io: SocketIOServer) {
        this.io = io;
        this.config = {
            redis: {
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT || '6379'),
                password: process.env.REDIS_PASSWORD,
                db: parseInt(process.env.REDIS_DB || '3') // Use different DB for real-time events
            },
            websocket: {
                enabled: process.env.WEBSOCKET_ENABLED === 'true',
                cors: {
                    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
                    credentials: true
                },
                pingTimeout: 60000,
                pingInterval: 25000
            },
            serverSentEvents: {
                enabled: process.env.SSE_ENABLED === 'true',
                maxConnections: 1000,
                heartbeatInterval: 30000
            },
            push: {
                enabled: process.env.PUSH_NOTIFICATIONS_ENABLED === 'true',
                vapidKeys: {
                    publicKey: process.env.VAPID_PUBLIC_KEY || '',
                    privateKey: process.env.VAPID_PRIVATE_KEY || ''
                }
            },
            limits: {
                maxEventsPerUser: 1000,
                maxSubscriptionsPerUser: 10,
                eventRetentionDays: 7,
                subscriptionTimeoutMs: 3600000 // 1 hour
            }
        };

        this.redis = new Redis(this.config.redis);
        this.initializeWebSocket();
        this.initializeServerSentEvents();
        this.initializePushNotifications();
        this.startEventProcessing();
    }

    /**
     * Initialize WebSocket server
     */
    private initializeWebSocket(): void {
        if (!this.config.websocket.enabled) {
            return;
        }

        this.io.on('connection', (socket) => {
            logger.info('WebSocket client connected', {
                socketId: socket.id,
                clientIp: socket.handshake.address
            });

            // Handle authentication
            socket.on('authenticate', async (data) => {
                try {
                    const { userId, token } = data;
                    
                    // TODO: Validate JWT token
                    if (!userId || !token) {
                        socket.emit('error', { message: 'Invalid authentication data' });
                        return;
                    }

                    // Join user-specific room
                    socket.join(`user:${userId}`);
                    
                    // Store socket mapping
                    await this.redis.setex(
                        `socket:${socket.id}`,
                        3600, // 1 hour
                        userId
                    );

                    socket.emit('authenticated', { userId });
                    
                    logger.info('WebSocket client authenticated', {
                        socketId: socket.id,
                        userId: this.hashUserId(userId)
                    });

                } catch (error) {
                    logger.error('WebSocket authentication error', {
                        socketId: socket.id,
                        error: error.message
                    });
                    socket.emit('error', { message: 'Authentication failed' });
                }
            });

            // Handle event subscriptions
            socket.on('subscribe', async (data) => {
                try {
                    const { eventTypes, filters } = data;
                    const userId = await this.getUserIdFromSocket(socket.id);
                    
                    if (!userId) {
                        socket.emit('error', { message: 'Not authenticated' });
                        return;
                    }

                    await this.subscribeToEvents(userId, eventTypes, ['websocket'], filters);
                    socket.emit('subscribed', { eventTypes, filters });

                } catch (error) {
                    logger.error('WebSocket subscription error', {
                        socketId: socket.id,
                        error: error.message
                    });
                    socket.emit('error', { message: 'Subscription failed' });
                }
            });

            // Handle event unsubscriptions
            socket.on('unsubscribe', async (data) => {
                try {
                    const { eventTypes } = data;
                    const userId = await this.getUserIdFromSocket(socket.id);
                    
                    if (!userId) {
                        socket.emit('error', { message: 'Not authenticated' });
                        return;
                    }

                    await this.unsubscribeFromEvents(userId, eventTypes, ['websocket']);
                    socket.emit('unsubscribed', { eventTypes });

                } catch (error) {
                    logger.error('WebSocket unsubscription error', {
                        socketId: socket.id,
                        error: error.message
                    });
                    socket.emit('error', { message: 'Unsubscription failed' });
                }
            });

            // Handle disconnection
            socket.on('disconnect', async () => {
                try {
                    const userId = await this.getUserIdFromSocket(socket.id);
                    
                    if (userId) {
                        await this.cleanupUserSubscriptions(userId, ['websocket']);
                    }

                    await this.redis.del(`socket:${socket.id}`);
                    
                    logger.info('WebSocket client disconnected', {
                        socketId: socket.id,
                        userId: userId ? this.hashUserId(userId) : 'unknown'
                    });

                } catch (error) {
                    logger.error('WebSocket disconnection error', {
                        socketId: socket.id,
                        error: error.message
                    });
                }
            });
        });
    }

    /**
     * Initialize Server-Sent Events
     */
    private initializeServerSentEvents(): void {
        if (!this.config.serverSentEvents.enabled) {
            return;
        }

        // TODO: Implement SSE endpoint
        // This would be handled by the Express server
        logger.info('Server-Sent Events initialized');
    }

    /**
     * Initialize Push Notifications
     */
    private initializePushNotifications(): void {
        if (!this.config.push.enabled) {
            return;
        }

        // TODO: Implement push notification service
        // This would integrate with Firebase Cloud Messaging or similar
        logger.info('Push notifications initialized');
    }

    /**
     * Start event processing loop
     */
    private startEventProcessing(): void {
        // Process events from Redis queue
        setInterval(async () => {
            try {
                await this.processEventQueue();
            } catch (error) {
                logger.error('Error processing event queue', {
                    error: error.message
                });
            }
        }, 1000); // Process every second

        // Cleanup expired subscriptions
        setInterval(async () => {
            try {
                await this.cleanupExpiredSubscriptions();
            } catch (error) {
                logger.error('Error cleaning up expired subscriptions', {
                    error: error.message
                });
            }
        }, 60000); // Cleanup every minute
    }

    /**
     * Publish social event
     */
    async publishEvent(
        type: string,
        userId: string,
        data: Record<string, any>,
        options: {
            targetUserId?: string;
            priority?: 'low' | 'medium' | 'high' | 'urgent';
            channels?: ('websocket' | 'server_sent_events' | 'push')[];
            ttl?: number;
        } = {}
    ): Promise<SocialEvent> {
        try {
            const event: SocialEvent = {
                id: this.generateEventId(),
                type,
                userId,
                targetUserId: options.targetUserId,
                data,
                timestamp: new Date(),
                priority: options.priority || 'medium',
                channels: options.channels || ['websocket'],
                ttl: options.ttl || 3600 // 1 hour default
            };

            // Store event
            await this.storeEvent(event);

            // Add to processing queue
            await this.redis.lpush('event_queue', JSON.stringify(event));

            // Update metrics
            metrics.incrementCounter('social_events_published_total', {
                type,
                priority: event.priority,
                userId: this.hashUserId(userId)
            });

            logger.info('Social event published', {
                eventId: event.id,
                type,
                userId: this.hashUserId(userId),
                targetUserId: options.targetUserId ? this.hashUserId(options.targetUserId) : undefined,
                priority: event.priority,
                channels: event.channels
            });

            return event;

        } catch (error) {
            logger.error('Error publishing social event', {
                type,
                userId: this.hashUserId(userId),
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Subscribe to events
     */
    async subscribeToEvents(
        userId: string,
        eventTypes: string[],
        channels: string[],
        filters: Record<string, any> = {}
    ): Promise<EventSubscription> {
        try {
            const subscription: EventSubscription = {
                userId,
                eventTypes,
                channels,
                filters,
                createdAt: new Date(),
                expiresAt: new Date(Date.now() + this.config.limits.subscriptionTimeoutMs)
            };

            const subscriptionId = this.generateSubscriptionId(userId);
            this.subscriptions.set(subscriptionId, subscription);

            // Store in Redis for persistence
            await this.redis.setex(
                `subscription:${subscriptionId}`,
                Math.ceil(this.config.limits.subscriptionTimeoutMs / 1000),
                JSON.stringify(subscription)
            );

            // Add to user's subscription list
            await this.redis.sadd(`user_subscriptions:${userId}`, subscriptionId);
            await this.redis.expire(`user_subscriptions:${userId}`, 86400); // 24 hours

            logger.info('User subscribed to events', {
                userId: this.hashUserId(userId),
                eventTypes,
                channels,
                subscriptionId
            });

            return subscription;

        } catch (error) {
            logger.error('Error subscribing to events', {
                userId: this.hashUserId(userId),
                eventTypes,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Unsubscribe from events
     */
    async unsubscribeFromEvents(
        userId: string,
        eventTypes: string[],
        channels: string[]
    ): Promise<void> {
        try {
            const userSubscriptions = await this.redis.smembers(`user_subscriptions:${userId}`);
            
            for (const subscriptionId of userSubscriptions) {
                const subscriptionData = await this.redis.get(`subscription:${subscriptionId}`);
                if (subscriptionData) {
                    const subscription: EventSubscription = JSON.parse(subscriptionData);
                    
                    // Remove matching event types and channels
                    subscription.eventTypes = subscription.eventTypes.filter(
                        type => !eventTypes.includes(type)
                    );
                    subscription.channels = subscription.channels.filter(
                        channel => !channels.includes(channel)
                    );
                    
                    if (subscription.eventTypes.length === 0 || subscription.channels.length === 0) {
                        // Remove subscription if no event types or channels left
                        await this.redis.del(`subscription:${subscriptionId}`);
                        await this.redis.srem(`user_subscriptions:${userId}`, subscriptionId);
                        this.subscriptions.delete(subscriptionId);
                    } else {
                        // Update subscription
                        await this.redis.setex(
                            `subscription:${subscriptionId}`,
                            Math.ceil((subscription.expiresAt.getTime() - Date.now()) / 1000),
                            JSON.stringify(subscription)
                        );
                    }
                }
            }

            logger.info('User unsubscribed from events', {
                userId: this.hashUserId(userId),
                eventTypes,
                channels
            });

        } catch (error) {
            logger.error('Error unsubscribing from events', {
                userId: this.hashUserId(userId),
                eventTypes,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Process event queue
     */
    private async processEventQueue(): Promise<void> {
        try {
            const eventData = await this.redis.brpop('event_queue', 1);
            if (!eventData) {
                return;
            }

            const event: SocialEvent = JSON.parse(eventData[1]);
            await this.deliverEvent(event);

        } catch (error) {
            logger.error('Error processing event queue', {
                error: error.message
            });
        }
    }

    /**
     * Deliver event to subscribers
     */
    private async deliverEvent(event: SocialEvent): Promise<void> {
        try {
            const startTime = Date.now();

            // Find subscribers for this event
            const subscribers = await this.findSubscribers(event);

            // Deliver to each subscriber
            for (const subscriber of subscribers) {
                try {
                    await this.deliverToSubscriber(event, subscriber);
                } catch (error) {
                    logger.error('Error delivering event to subscriber', {
                        eventId: event.id,
                        subscriberId: subscriber.subscriptionId,
                        error: error.message
                    });
                }
            }

            // Update metrics
            const latency = Date.now() - startTime;
            metrics.recordHistogram('social_event_delivery_latency', latency, {
                type: event.type,
                priority: event.priority
            });

            metrics.incrementCounter('social_events_delivered_total', {
                type: event.type,
                priority: event.priority,
                subscriberCount: subscribers.length
            });

        } catch (error) {
            logger.error('Error delivering event', {
                eventId: event.id,
                error: error.message
            });
        }
    }

    /**
     * Find subscribers for event
     */
    private async findSubscribers(event: SocialEvent): Promise<Array<{
        subscriptionId: string;
        subscription: EventSubscription;
    }>> {
        const subscribers: Array<{
            subscriptionId: string;
            subscription: EventSubscription;
        }> = [];

        try {
            // Get all subscriptions
            const subscriptionKeys = await this.redis.keys('subscription:*');
            
            for (const key of subscriptionKeys) {
                const subscriptionData = await this.redis.get(key);
                if (subscriptionData) {
                    const subscription: EventSubscription = JSON.parse(subscriptionData);
                    
                    // Check if subscription matches event
                    if (this.matchesSubscription(event, subscription)) {
                        const subscriptionId = key.split(':')[1];
                        subscribers.push({ subscriptionId, subscription });
                    }
                }
            }

            return subscribers;

        } catch (error) {
            logger.error('Error finding subscribers', {
                eventId: event.id,
                error: error.message
            });
            return [];
        }
    }

    /**
     * Check if event matches subscription
     */
    private matchesSubscription(event: SocialEvent, subscription: EventSubscription): boolean {
        // Check event type
        if (!subscription.eventTypes.includes(event.type)) {
            return false;
        }

        // Check if subscription is expired
        if (new Date() > subscription.expiresAt) {
            return false;
        }

        // Check filters
        for (const [key, value] of Object.entries(subscription.filters)) {
            if (event.data[key] !== value) {
                return false;
            }
        }

        return true;
    }

    /**
     * Deliver event to specific subscriber
     */
    private async deliverToSubscriber(
        event: SocialEvent,
        subscriber: { subscriptionId: string; subscription: EventSubscription }
    ): Promise<void> {
        const { subscription } = subscriber;

        // Deliver via WebSocket
        if (subscription.channels.includes('websocket') && this.config.websocket.enabled) {
            await this.deliverViaWebSocket(event, subscription);
        }

        // Deliver via Server-Sent Events
        if (subscription.channels.includes('server_sent_events') && this.config.serverSentEvents.enabled) {
            await this.deliverViaSSE(event, subscription);
        }

        // Deliver via Push Notification
        if (subscription.channels.includes('push') && this.config.push.enabled) {
            await this.deliverViaPush(event, subscription);
        }
    }

    /**
     * Deliver event via WebSocket
     */
    private async deliverViaWebSocket(event: SocialEvent, subscription: EventSubscription): Promise<void> {
        try {
            const room = `user:${subscription.userId}`;
            this.io.to(room).emit('social_event', {
                id: event.id,
                type: event.type,
                data: event.data,
                timestamp: event.timestamp,
                priority: event.priority
            });

            logger.debug('Event delivered via WebSocket', {
                eventId: event.id,
                userId: this.hashUserId(subscription.userId)
            });

        } catch (error) {
            logger.error('Error delivering event via WebSocket', {
                eventId: event.id,
                userId: this.hashUserId(subscription.userId),
                error: error.message
            });
        }
    }

    /**
     * Deliver event via Server-Sent Events
     */
    private async deliverViaSSE(event: SocialEvent, subscription: EventSubscription): Promise<void> {
        try {
            // TODO: Implement SSE delivery
            // This would send the event to the user's SSE connection
            logger.debug('Event delivered via SSE', {
                eventId: event.id,
                userId: this.hashUserId(subscription.userId)
            });

        } catch (error) {
            logger.error('Error delivering event via SSE', {
                eventId: event.id,
                userId: this.hashUserId(subscription.userId),
                error: error.message
            });
        }
    }

    /**
     * Deliver event via Push Notification
     */
    private async deliverViaPush(event: SocialEvent, subscription: EventSubscription): Promise<void> {
        try {
            // TODO: Implement push notification delivery
            // This would send a push notification to the user's device
            logger.debug('Event delivered via push', {
                eventId: event.id,
                userId: this.hashUserId(subscription.userId)
            });

        } catch (error) {
            logger.error('Error delivering event via push', {
                eventId: event.id,
                userId: this.hashUserId(subscription.userId),
                error: error.message
            });
        }
    }

    /**
     * Store event
     */
    private async storeEvent(event: SocialEvent): Promise<void> {
        try {
            const key = `event:${event.id}`;
            await this.redis.setex(
                key,
                event.ttl,
                JSON.stringify(event)
            );

            // Add to user's event list
            const userEventsKey = `user_events:${event.userId}`;
            await this.redis.lpush(userEventsKey, event.id);
            await this.redis.ltrim(userEventsKey, 0, this.config.limits.maxEventsPerUser - 1);
            await this.redis.expire(userEventsKey, this.config.limits.eventRetentionDays * 86400);

        } catch (error) {
            logger.error('Error storing event', {
                eventId: event.id,
                error: error.message
            });
        }
    }

    /**
     * Get user ID from socket
     */
    private async getUserIdFromSocket(socketId: string): Promise<string | null> {
        try {
            return await this.redis.get(`socket:${socketId}`);
        } catch (error) {
            logger.error('Error getting user ID from socket', {
                socketId,
                error: error.message
            });
            return null;
        }
    }

    /**
     * Cleanup user subscriptions
     */
    private async cleanupUserSubscriptions(userId: string, channels: string[]): Promise<void> {
        try {
            const userSubscriptions = await this.redis.smembers(`user_subscriptions:${userId}`);
            
            for (const subscriptionId of userSubscriptions) {
                const subscriptionData = await this.redis.get(`subscription:${subscriptionId}`);
                if (subscriptionData) {
                    const subscription: EventSubscription = JSON.parse(subscriptionData);
                    
                    // Remove channels
                    subscription.channels = subscription.channels.filter(
                        channel => !channels.includes(channel)
                    );
                    
                    if (subscription.channels.length === 0) {
                        // Remove subscription if no channels left
                        await this.redis.del(`subscription:${subscriptionId}`);
                        await this.redis.srem(`user_subscriptions:${userId}`, subscriptionId);
                        this.subscriptions.delete(subscriptionId);
                    } else {
                        // Update subscription
                        await this.redis.setex(
                            `subscription:${subscriptionId}`,
                            Math.ceil((subscription.expiresAt.getTime() - Date.now()) / 1000),
                            JSON.stringify(subscription)
                        );
                    }
                }
            }

        } catch (error) {
            logger.error('Error cleaning up user subscriptions', {
                userId: this.hashUserId(userId),
                error: error.message
            });
        }
    }

    /**
     * Cleanup expired subscriptions
     */
    private async cleanupExpiredSubscriptions(): Promise<void> {
        try {
            const subscriptionKeys = await this.redis.keys('subscription:*');
            const now = new Date();
            
            for (const key of subscriptionKeys) {
                const subscriptionData = await this.redis.get(key);
                if (subscriptionData) {
                    const subscription: EventSubscription = JSON.parse(subscriptionData);
                    
                    if (now > subscription.expiresAt) {
                        await this.redis.del(key);
                        await this.redis.srem(`user_subscriptions:${subscription.userId}`, key.split(':')[1]);
                        this.subscriptions.delete(key.split(':')[1]);
                    }
                }
            }

        } catch (error) {
            logger.error('Error cleaning up expired subscriptions', {
                error: error.message
            });
        }
    }

    /**
     * Get event metrics
     */
    async getEventMetrics(): Promise<EventMetrics> {
        try {
            const metrics: EventMetrics = {
                totalEvents: 0,
                eventsByType: {},
                eventsByPriority: {},
                eventsByChannel: {},
                activeSubscriptions: 0,
                averageLatency: 0,
                errorRate: 0
            };

            // Get all event keys
            const eventKeys = await this.redis.keys('event:*');
            metrics.totalEvents = eventKeys.length;

            // Process events
            for (const key of eventKeys) {
                const eventData = await this.redis.get(key);
                if (eventData) {
                    const event: SocialEvent = JSON.parse(eventData);
                    
                    // Count by type
                    metrics.eventsByType[event.type] = (metrics.eventsByType[event.type] || 0) + 1;
                    
                    // Count by priority
                    metrics.eventsByPriority[event.priority] = (metrics.eventsByPriority[event.priority] || 0) + 1;
                    
                    // Count by channel
                    event.channels.forEach(channel => {
                        metrics.eventsByChannel[channel] = (metrics.eventsByChannel[channel] || 0) + 1;
                    });
                }
            }

            // Count active subscriptions
            const subscriptionKeys = await this.redis.keys('subscription:*');
            metrics.activeSubscriptions = subscriptionKeys.length;

            return metrics;

        } catch (error) {
            logger.error('Error getting event metrics', {
                error: error.message
            });
            return {
                totalEvents: 0,
                eventsByType: {},
                eventsByPriority: {},
                eventsByChannel: {},
                activeSubscriptions: 0,
                averageLatency: 0,
                errorRate: 0
            };
        }
    }

    /**
     * Generate unique event ID
     */
    private generateEventId(): string {
        return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Generate unique subscription ID
     */
    private generateSubscriptionId(userId: string): string {
        return `sub_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
