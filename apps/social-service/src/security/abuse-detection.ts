// Abuse Detection System
// Author: ChitLaq Development Team
// Date: 2024-01-15

import Redis from 'ioredis';
import { logger } from '../utils/logger';
import { metrics } from '../utils/metrics';

export interface AbusePattern {
    id: string;
    name: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    patterns: RegExp[];
    threshold: number;
    windowMs: number;
    action: 'warn' | 'block' | 'ban' | 'report';
    cooldownMs: number;
}

export interface AbuseEvent {
    id: string;
    userId: string;
    patternId: string;
    severity: string;
    detectedAt: Date;
    context: Record<string, any>;
    action: string;
    resolved: boolean;
    resolvedAt?: Date;
    resolvedBy?: string;
}

export interface AbuseMetrics {
    totalEvents: number;
    eventsBySeverity: Record<string, number>;
    eventsByPattern: Record<string, number>;
    topAbusers: Array<{ userId: string; count: number }>;
    recentEvents: AbuseEvent[];
}

export class AbuseDetector {
    private redis: Redis;
    private patterns: Map<string, AbusePattern> = new Map();
    private config: {
        redis: {
            host: string;
            port: number;
            password?: string;
            db: number;
        };
        thresholds: {
            warning: number;
            blocking: number;
            banning: number;
        };
        cooldowns: {
            warning: number;
            blocking: number;
            banning: number;
        };
    };

    constructor() {
        this.config = {
            redis: {
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT || '6379'),
                password: process.env.REDIS_PASSWORD,
                db: parseInt(process.env.REDIS_DB || '1') // Use different DB for abuse detection
            },
            thresholds: {
                warning: 3,
                blocking: 5,
                banning: 10
            },
            cooldowns: {
                warning: 3600000, // 1 hour
                blocking: 86400000, // 24 hours
                banning: 604800000 // 7 days
            }
        };

        this.redis = new Redis(this.config.redis);
        this.initializePatterns();
    }

    /**
     * Initialize abuse detection patterns
     */
    private initializePatterns(): void {
        const patterns: AbusePattern[] = [
            // Spam patterns
            {
                id: 'spam_repetitive',
                name: 'Repetitive Content',
                description: 'Detects repetitive or spam-like content',
                severity: 'medium',
                patterns: [
                    /(.)\1{10,}/g, // Repeated characters
                    /(.)\1{5,}/g, // Repeated characters (shorter)
                    /(.)\1{3,}/g // Repeated characters (very short)
                ],
                threshold: 3,
                windowMs: 3600000, // 1 hour
                action: 'warn',
                cooldownMs: 3600000 // 1 hour
            },
            {
                id: 'spam_links',
                name: 'Excessive Links',
                description: 'Detects excessive use of links',
                severity: 'high',
                patterns: [
                    /https?:\/\/[^\s]+/g, // HTTP/HTTPS links
                    /www\.[^\s]+/g, // WWW links
                    /[^\s]+\.[a-z]{2,}/g // Domain-like patterns
                ],
                threshold: 5,
                windowMs: 3600000, // 1 hour
                action: 'block',
                cooldownMs: 86400000 // 24 hours
            },
            {
                id: 'spam_mentions',
                name: 'Excessive Mentions',
                description: 'Detects excessive use of mentions',
                severity: 'medium',
                patterns: [
                    /@[a-zA-Z0-9_]+/g // Mentions
                ],
                threshold: 10,
                windowMs: 3600000, // 1 hour
                action: 'warn',
                cooldownMs: 3600000 // 1 hour
            },
            {
                id: 'spam_hashtags',
                name: 'Excessive Hashtags',
                description: 'Detects excessive use of hashtags',
                severity: 'low',
                patterns: [
                    /#[a-zA-Z0-9_]+/g // Hashtags
                ],
                threshold: 15,
                windowMs: 3600000, // 1 hour
                action: 'warn',
                cooldownMs: 3600000 // 1 hour
            },

            // Harassment patterns
            {
                id: 'harassment_threats',
                name: 'Threats and Intimidation',
                description: 'Detects threatening or intimidating language',
                severity: 'critical',
                patterns: [
                    /(kill|murder|death|die|harm|hurt|violence|threat)/gi,
                    /(suicide|self-harm|cut|burn)/gi,
                    /(bomb|explosive|weapon|gun|knife)/gi
                ],
                threshold: 1,
                windowMs: 3600000, // 1 hour
                action: 'ban',
                cooldownMs: 604800000 // 7 days
            },
            {
                id: 'harassment_hate',
                name: 'Hate Speech',
                description: 'Detects hate speech and discriminatory language',
                severity: 'high',
                patterns: [
                    /(hate|disgusting|disgust|repulsive|vile)/gi,
                    /(stupid|idiot|moron|retard|dumb)/gi,
                    /(ugly|fat|skinny|gross|nasty)/gi
                ],
                threshold: 3,
                windowMs: 3600000, // 1 hour
                action: 'block',
                cooldownMs: 86400000 // 24 hours
            },
            {
                id: 'harassment_bullying',
                name: 'Bullying Behavior',
                description: 'Detects bullying and harassment patterns',
                severity: 'high',
                patterns: [
                    /(bully|harass|intimidate|threaten)/gi,
                    /(stalk|follow|chase|hunt)/gi,
                    /(expose|reveal|leak|spread)/gi
                ],
                threshold: 2,
                windowMs: 3600000, // 1 hour
                action: 'block',
                cooldownMs: 86400000 // 24 hours
            },

            // Inappropriate content patterns
            {
                id: 'inappropriate_sexual',
                name: 'Sexual Content',
                description: 'Detects sexual or inappropriate content',
                severity: 'high',
                patterns: [
                    /(sex|sexual|porn|nude|naked|breast|penis|vagina)/gi,
                    /(fuck|fucking|fucked|shit|bitch|whore|slut)/gi,
                    /(dick|cock|pussy|ass|tits|boobs)/gi
                ],
                threshold: 2,
                windowMs: 3600000, // 1 hour
                action: 'block',
                cooldownMs: 86400000 // 24 hours
            },
            {
                id: 'inappropriate_violence',
                name: 'Violent Content',
                description: 'Detects violent or graphic content',
                severity: 'high',
                patterns: [
                    /(violence|violent|blood|gore|torture|rape)/gi,
                    /(fight|fighting|beat|beating|punch|kick)/gi,
                    /(war|battle|combat|attack|assault)/gi
                ],
                threshold: 3,
                windowMs: 3600000, // 1 hour
                action: 'block',
                cooldownMs: 86400000 // 24 hours
            },

            // Fraud patterns
            {
                id: 'fraud_phishing',
                name: 'Phishing Attempts',
                description: 'Detects potential phishing attempts',
                severity: 'critical',
                patterns: [
                    /(click here|click this|verify|confirm|update)/gi,
                    /(password|login|account|security)/gi,
                    /(urgent|immediate|asap|quickly)/gi
                ],
                threshold: 2,
                windowMs: 3600000, // 1 hour
                action: 'ban',
                cooldownMs: 604800000 // 7 days
            },
            {
                id: 'fraud_scam',
                name: 'Scam Attempts',
                description: 'Detects potential scam attempts',
                severity: 'high',
                patterns: [
                    /(free money|easy money|quick cash|get rich)/gi,
                    /(investment|trading|crypto|bitcoin)/gi,
                    /(lottery|winner|prize|reward)/gi
                ],
                threshold: 2,
                windowMs: 3600000, // 1 hour
                action: 'block',
                cooldownMs: 86400000 // 24 hours
            },

            // Bot patterns
            {
                id: 'bot_automated',
                name: 'Automated Behavior',
                description: 'Detects automated or bot-like behavior',
                severity: 'medium',
                patterns: [
                    /(bot|automated|script|program)/gi,
                    /(spam|mass|bulk|batch)/gi,
                    /(fake|artificial|synthetic)/gi
                ],
                threshold: 3,
                windowMs: 3600000, // 1 hour
                action: 'warn',
                cooldownMs: 3600000 // 1 hour
            },
            {
                id: 'bot_rapid',
                name: 'Rapid Activity',
                description: 'Detects rapid or suspicious activity patterns',
                severity: 'medium',
                patterns: [
                    /(rapid|fast|quick|instant|immediate)/gi,
                    /(multiple|several|many|lots)/gi,
                    /(repeated|repetitive|duplicate)/gi
                ],
                threshold: 5,
                windowMs: 600000, // 10 minutes
                action: 'warn',
                cooldownMs: 3600000 // 1 hour
            }
        ];

        patterns.forEach(pattern => {
            this.patterns.set(pattern.id, pattern);
        });
    }

    /**
     * Analyze content for abuse patterns
     */
    async analyzeContent(
        userId: string, 
        content: string, 
        context: Record<string, any> = {}
    ): Promise<AbuseEvent[]> {
        const events: AbuseEvent[] = [];
        
        try {
            for (const [patternId, pattern] of this.patterns) {
                const matches = this.findMatches(content, pattern.patterns);
                
                if (matches.length >= pattern.threshold) {
                    const event = await this.createAbuseEvent(
                        userId,
                        patternId,
                        pattern,
                        matches,
                        context
                    );
                    
                    if (event) {
                        events.push(event);
                        
                        // Update metrics
                        metrics.incrementCounter('abuse_detected_total', {
                            pattern: patternId,
                            severity: pattern.severity,
                            userId: this.hashUserId(userId)
                        });
                        
                        logger.warn('Abuse pattern detected', {
                            userId: this.hashUserId(userId),
                            patternId,
                            severity: pattern.severity,
                            matches: matches.length,
                            threshold: pattern.threshold
                        });
                    }
                }
            }

            // Check for cumulative abuse
            if (events.length > 0) {
                await this.checkCumulativeAbuse(userId, events);
            }

            return events;

        } catch (error) {
            logger.error('Error analyzing content for abuse', {
                userId: this.hashUserId(userId),
                error: error.message
            });
            return [];
        }
    }

    /**
     * Find matches for patterns in content
     */
    private findMatches(content: string, patterns: RegExp[]): string[] {
        const matches: string[] = [];
        
        for (const pattern of patterns) {
            const patternMatches = content.match(pattern);
            if (patternMatches) {
                matches.push(...patternMatches);
            }
        }
        
        return matches;
    }

    /**
     * Create abuse event
     */
    private async createAbuseEvent(
        userId: string,
        patternId: string,
        pattern: AbusePattern,
        matches: string[],
        context: Record<string, any>
    ): Promise<AbuseEvent | null> {
        try {
            // Check if user is in cooldown
            const cooldownKey = `abuse_cooldown:${userId}:${patternId}`;
            const inCooldown = await this.redis.get(cooldownKey);
            
            if (inCooldown) {
                logger.debug('User in cooldown for pattern', {
                    userId: this.hashUserId(userId),
                    patternId,
                    cooldownUntil: inCooldown
                });
                return null;
            }

            // Create event
            const event: AbuseEvent = {
                id: this.generateEventId(),
                userId,
                patternId,
                severity: pattern.severity,
                detectedAt: new Date(),
                context: {
                    ...context,
                    matches: matches.slice(0, 10), // Limit matches for storage
                    matchCount: matches.length
                },
                action: pattern.action,
                resolved: false
            };

            // Store event
            await this.storeAbuseEvent(event);

            // Set cooldown
            await this.redis.setex(
                cooldownKey,
                Math.ceil(pattern.cooldownMs / 1000),
                new Date(Date.now() + pattern.cooldownMs).toISOString()
            );

            // Check for escalation
            await this.checkEscalation(userId, event);

            return event;

        } catch (error) {
            logger.error('Error creating abuse event', {
                userId: this.hashUserId(userId),
                patternId,
                error: error.message
            });
            return null;
        }
    }

    /**
     * Check for cumulative abuse
     */
    private async checkCumulativeAbuse(userId: string, events: AbuseEvent[]): Promise<void> {
        try {
            const windowMs = 3600000; // 1 hour
            const recentEvents = await this.getRecentEvents(userId, windowMs);
            
            const totalEvents = recentEvents.length + events.length;
            const criticalEvents = recentEvents.filter(e => e.severity === 'critical').length +
                                 events.filter(e => e.severity === 'critical').length;
            const highEvents = recentEvents.filter(e => e.severity === 'high').length +
                             events.filter(e => e.severity === 'high').length;

            // Escalate based on cumulative abuse
            if (criticalEvents > 0) {
                await this.escalateUser(userId, 'critical', 'Multiple critical abuse patterns detected');
            } else if (highEvents >= 3) {
                await this.escalateUser(userId, 'high', 'Multiple high-severity abuse patterns detected');
            } else if (totalEvents >= 10) {
                await this.escalateUser(userId, 'medium', 'Excessive abuse patterns detected');
            }

        } catch (error) {
            logger.error('Error checking cumulative abuse', {
                userId: this.hashUserId(userId),
                error: error.message
            });
        }
    }

    /**
     * Check for escalation
     */
    private async checkEscalation(userId: string, event: AbuseEvent): Promise<void> {
        try {
            const escalationKey = `abuse_escalation:${userId}`;
            const escalationData = await this.redis.get(escalationKey);
            
            let escalation = escalationData ? JSON.parse(escalationData) : {
                level: 'none',
                count: 0,
                lastEscalation: null
            };

            // Update escalation based on event severity
            if (event.severity === 'critical') {
                escalation.level = 'critical';
                escalation.count += 3;
            } else if (event.severity === 'high') {
                escalation.level = 'high';
                escalation.count += 2;
            } else if (event.severity === 'medium') {
                escalation.level = 'medium';
                escalation.count += 1;
            }

            escalation.lastEscalation = new Date().toISOString();

            // Store escalation data
            await this.redis.setex(
                escalationKey,
                86400, // 24 hours
                JSON.stringify(escalation)
            );

            // Take action based on escalation level
            if (escalation.level === 'critical' && escalation.count >= 3) {
                await this.escalateUser(userId, 'critical', 'Critical abuse escalation threshold reached');
            } else if (escalation.level === 'high' && escalation.count >= 5) {
                await this.escalateUser(userId, 'high', 'High abuse escalation threshold reached');
            } else if (escalation.level === 'medium' && escalation.count >= 10) {
                await this.escalateUser(userId, 'medium', 'Medium abuse escalation threshold reached');
            }

        } catch (error) {
            logger.error('Error checking escalation', {
                userId: this.hashUserId(userId),
                error: error.message
            });
        }
    }

    /**
     * Escalate user based on abuse level
     */
    private async escalateUser(userId: string, level: string, reason: string): Promise<void> {
        try {
            const escalationKey = `abuse_escalation:${userId}`;
            const escalationData = await this.redis.get(escalationKey);
            
            let escalation = escalationData ? JSON.parse(escalationData) : {
                level: 'none',
                count: 0,
                lastEscalation: null
            };

            escalation.level = level;
            escalation.lastEscalation = new Date().toISOString();
            escalation.reason = reason;

            // Store escalation data
            await this.redis.setex(
                escalationKey,
                86400, // 24 hours
                JSON.stringify(escalation)
            );

            // Update metrics
            metrics.incrementCounter('abuse_escalation_total', {
                level,
                userId: this.hashUserId(userId)
            });

            logger.warn('User escalated due to abuse', {
                userId: this.hashUserId(userId),
                level,
                reason
            });

            // TODO: Implement actual escalation actions (blocking, banning, etc.)

        } catch (error) {
            logger.error('Error escalating user', {
                userId: this.hashUserId(userId),
                level,
                error: error.message
            });
        }
    }

    /**
     * Store abuse event
     */
    private async storeAbuseEvent(event: AbuseEvent): Promise<void> {
        try {
            const key = `abuse_event:${event.id}`;
            await this.redis.setex(
                key,
                86400 * 30, // 30 days
                JSON.stringify(event)
            );

            // Add to user's event list
            const userEventsKey = `abuse_events:${event.userId}`;
            await this.redis.lpush(userEventsKey, event.id);
            await this.redis.expire(userEventsKey, 86400 * 30); // 30 days

            // Add to pattern's event list
            const patternEventsKey = `abuse_pattern_events:${event.patternId}`;
            await this.redis.lpush(patternEventsKey, event.id);
            await this.redis.expire(patternEventsKey, 86400 * 30); // 30 days

        } catch (error) {
            logger.error('Error storing abuse event', {
                eventId: event.id,
                error: error.message
            });
        }
    }

    /**
     * Get recent events for user
     */
    private async getRecentEvents(userId: string, windowMs: number): Promise<AbuseEvent[]> {
        try {
            const userEventsKey = `abuse_events:${userId}`;
            const eventIds = await this.redis.lrange(userEventsKey, 0, 100);
            
            const events: AbuseEvent[] = [];
            const cutoffTime = new Date(Date.now() - windowMs);

            for (const eventId of eventIds) {
                const eventKey = `abuse_event:${eventId}`;
                const eventData = await this.redis.get(eventKey);
                
                if (eventData) {
                    const event: AbuseEvent = JSON.parse(eventData);
                    if (new Date(event.detectedAt) > cutoffTime) {
                        events.push(event);
                    }
                }
            }

            return events;

        } catch (error) {
            logger.error('Error getting recent events', {
                userId: this.hashUserId(userId),
                error: error.message
            });
            return [];
        }
    }

    /**
     * Get abuse metrics
     */
    async getMetrics(): Promise<AbuseMetrics> {
        try {
            const metrics: AbuseMetrics = {
                totalEvents: 0,
                eventsBySeverity: {},
                eventsByPattern: {},
                topAbusers: [],
                recentEvents: []
            };

            // Get all event keys
            const eventKeys = await this.redis.keys('abuse_event:*');
            metrics.totalEvents = eventKeys.length;

            // Process events
            for (const key of eventKeys) {
                const eventData = await this.redis.get(key);
                if (eventData) {
                    const event: AbuseEvent = JSON.parse(eventData);
                    
                    // Count by severity
                    metrics.eventsBySeverity[event.severity] = 
                        (metrics.eventsBySeverity[event.severity] || 0) + 1;
                    
                    // Count by pattern
                    metrics.eventsByPattern[event.patternId] = 
                        (metrics.eventsByPattern[event.patternId] || 0) + 1;
                    
                    // Add to recent events (last 100)
                    if (metrics.recentEvents.length < 100) {
                        metrics.recentEvents.push(event);
                    }
                }
            }

            // Sort recent events by date
            metrics.recentEvents.sort((a, b) => 
                new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime()
            );

            // Get top abusers
            const userEventKeys = await this.redis.keys('abuse_events:*');
            const userCounts: Record<string, number> = {};

            for (const key of userEventKeys) {
                const userId = key.split(':')[2];
                const count = await this.redis.llen(key);
                userCounts[userId] = count;
            }

            metrics.topAbusers = Object.entries(userCounts)
                .map(([userId, count]) => ({ userId, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 10);

            return metrics;

        } catch (error) {
            logger.error('Error getting abuse metrics', {
                error: error.message
            });
            return {
                totalEvents: 0,
                eventsBySeverity: {},
                eventsByPattern: {},
                topAbusers: [],
                recentEvents: []
            };
        }
    }

    /**
     * Resolve abuse event
     */
    async resolveEvent(eventId: string, resolvedBy: string): Promise<boolean> {
        try {
            const eventKey = `abuse_event:${eventId}`;
            const eventData = await this.redis.get(eventKey);
            
            if (!eventData) {
                return false;
            }

            const event: AbuseEvent = JSON.parse(eventData);
            event.resolved = true;
            event.resolvedAt = new Date();
            event.resolvedBy = resolvedBy;

            await this.redis.setex(
                eventKey,
                86400 * 30, // 30 days
                JSON.stringify(event)
            );

            logger.info('Abuse event resolved', {
                eventId,
                resolvedBy
            });

            return true;

        } catch (error) {
            logger.error('Error resolving abuse event', {
                eventId,
                resolvedBy,
                error: error.message
            });
            return false;
        }
    }

    /**
     * Check if user is blocked
     */
    async isUserBlocked(userId: string): Promise<boolean> {
        try {
            const escalationKey = `abuse_escalation:${userId}`;
            const escalationData = await this.redis.get(escalationKey);
            
            if (!escalationData) {
                return false;
            }

            const escalation = JSON.parse(escalationData);
            return escalation.level === 'critical' || escalation.level === 'high';

        } catch (error) {
            logger.error('Error checking if user is blocked', {
                userId: this.hashUserId(userId),
                error: error.message
            });
            return false;
        }
    }

    /**
     * Get user abuse status
     */
    async getUserAbuseStatus(userId: string): Promise<{
        level: string;
        count: number;
        lastEscalation: string | null;
        blocked: boolean;
    }> {
        try {
            const escalationKey = `abuse_escalation:${userId}`;
            const escalationData = await this.redis.get(escalationKey);
            
            if (!escalationData) {
                return {
                    level: 'none',
                    count: 0,
                    lastEscalation: null,
                    blocked: false
                };
            }

            const escalation = JSON.parse(escalationData);
            return {
                level: escalation.level,
                count: escalation.count,
                lastEscalation: escalation.lastEscalation,
                blocked: escalation.level === 'critical' || escalation.level === 'high'
            };

        } catch (error) {
            logger.error('Error getting user abuse status', {
                userId: this.hashUserId(userId),
                error: error.message
            });
            return {
                level: 'none',
                count: 0,
                lastEscalation: null,
                blocked: false
            };
        }
    }

    /**
     * Generate unique event ID
     */
    private generateEventId(): string {
        return `abuse_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
