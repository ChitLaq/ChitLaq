// Campus Events Feature
// Author: ChitLaq Development Team
// Date: 2024-01-15

import { logger } from '../utils/logger';
import { metrics } from '../utils/metrics';
import { UniversityNetworkService, CampusEvent } from '../services/UniversityNetworkService';

export interface EventRegistration {
    id: string;
    eventId: string;
    userId: string;
    registrationDate: Date;
    status: 'confirmed' | 'waitlist' | 'cancelled';
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface EventCategory {
    id: string;
    name: string;
    description: string;
    icon?: string;
    color?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface EventSearchOptions {
    query?: string;
    type?: string;
    category?: string;
    startDate?: Date;
    endDate?: Date;
    location?: string;
    organizer?: string;
    isPublic?: boolean;
    requiresRegistration?: boolean;
    tags?: string[];
    limit?: number;
    offset?: number;
    sortBy?: 'startDate' | 'title' | 'currentAttendees' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
}

export interface EventRecommendation {
    event: CampusEvent;
    score: number;
    reasons: string[];
    mutualAttendees?: number;
    sharedInterests?: string[];
}

export interface EventStats {
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsByCategory: Record<string, number>;
    upcomingEvents: number;
    pastEvents: number;
    totalRegistrations: number;
    averageAttendeesPerEvent: number;
    mostPopularEvent: CampusEvent | null;
    mostActiveOrganizer: string;
    eventsByMonth: Record<string, number>;
}

export interface EventAnalytics {
    eventId: string;
    totalViews: number;
    totalRegistrations: number;
    totalAttendees: number;
    registrationRate: number;
    attendanceRate: number;
    viewsByDay: Record<string, number>;
    registrationsByDay: Record<string, number>;
    attendeeDemographics: {
        byYear: Record<string, number>;
        byDepartment: Record<string, number>;
        byGender: Record<string, number>;
    };
    feedback: {
        averageRating: number;
        totalRatings: number;
        ratings: Record<string, number>;
        comments: string[];
    };
}

export class CampusEvents {
    private universityService: UniversityNetworkService;
    private config: {
        events: {
            maxEventsPerUniversity: number;
            maxEventDuration: number; // in days
            minEventDuration: number; // in minutes
            allowedTypes: string[];
            allowedCategories: string[];
            maxAttendeesPerEvent: number;
            maxTagsPerEvent: number;
        };
        search: {
            minQueryLength: number;
            maxResults: number;
            fuzzySearchEnabled: boolean;
            searchFields: string[];
        };
        recommendations: {
            maxRecommendations: number;
            minScore: number;
            weightFactors: {
                mutualAttendees: number;
                sharedInterests: number;
                universityMatch: number;
                eventRelevance: number;
                timeRelevance: number;
            };
        };
        caching: {
            ttl: number;
            maxCacheSize: number;
        };
    };

    constructor(universityService: UniversityNetworkService) {
        this.universityService = universityService;
        this.config = {
            events: {
                maxEventsPerUniversity: 1000,
                maxEventDuration: 365, // 1 year
                minEventDuration: 15, // 15 minutes
                allowedTypes: ['academic', 'social', 'sports', 'cultural', 'career', 'workshop', 'conference'],
                allowedCategories: ['lecture', 'workshop', 'seminar', 'conference', 'social', 'sports', 'cultural', 'career', 'networking', 'volunteer'],
                maxAttendeesPerEvent: 10000,
                maxTagsPerEvent: 10
            },
            search: {
                minQueryLength: 2,
                maxResults: 100,
                fuzzySearchEnabled: true,
                searchFields: ['title', 'description', 'location', 'organizer', 'tags']
            },
            recommendations: {
                maxRecommendations: 20,
                minScore: 0.1,
                weightFactors: {
                    mutualAttendees: 0.3,
                    sharedInterests: 0.25,
                    universityMatch: 0.2,
                    eventRelevance: 0.15,
                    timeRelevance: 0.1
                }
            },
            caching: {
                ttl: 3600, // 1 hour
                maxCacheSize: 1000
            }
        };
    }

    /**
     * Search campus events
     */
    async searchEvents(
        universityId: string,
        options: EventSearchOptions = {}
    ): Promise<CampusEvent[]> {
        try {
            const startTime = Date.now();
            
            // Validate search query
            if (options.query && options.query.length < this.config.search.minQueryLength) {
                return [];
            }

            // Get events from university service
            let events = await this.universityService.getCampusEvents(universityId, {
                limit: options.limit,
                offset: options.offset,
                type: options.type,
                category: options.category,
                startDate: options.startDate,
                endDate: options.endDate,
                isPublic: options.isPublic
            });

            // Apply additional filters
            if (options.query) {
                events = this.filterEventsByQuery(events, options.query);
            }

            if (options.location) {
                events = events.filter(event => 
                    event.location.toLowerCase().includes(options.location!.toLowerCase())
                );
            }

            if (options.organizer) {
                events = events.filter(event => 
                    event.organizer.toLowerCase().includes(options.organizer!.toLowerCase())
                );
            }

            if (options.requiresRegistration !== undefined) {
                events = events.filter(event => 
                    event.requiresRegistration === options.requiresRegistration
                );
            }

            if (options.tags && options.tags.length > 0) {
                events = events.filter(event => 
                    options.tags!.some(tag => event.tags.includes(tag))
                );
            }

            // Sort results
            if (options.sortBy) {
                events = this.sortEvents(events, options.sortBy, options.sortOrder || 'asc');
            }

            // Apply pagination
            const offset = options.offset || 0;
            const limit = options.limit || this.config.search.maxResults;
            events = events.slice(offset, offset + limit);

            // Update metrics
            const duration = Date.now() - startTime;
            metrics.recordHistogram('campus_events_search_duration_ms', duration, {
                universityId,
                hasQuery: !!options.query,
                hasFilters: !!(options.type || options.category || options.location),
                resultCount: events.length
            });

            metrics.incrementCounter('campus_events_searches_total', {
                universityId,
                hasQuery: !!options.query,
                hasFilters: !!(options.type || options.category || options.location)
            });

            logger.info('Campus events search completed', {
                universityId,
                query: options.query,
                filters: {
                    type: options.type,
                    category: options.category,
                    location: options.location,
                    organizer: options.organizer
                },
                resultCount: events.length,
                duration
            });

            return events;

        } catch (error) {
            logger.error('Error searching campus events', {
                universityId,
                options,
                error: error.message
            });
            return [];
        }
    }

    /**
     * Get event recommendations for user
     */
    async getEventRecommendations(
        userId: string,
        userUniversityId: string,
        userInterests: string[],
        userAttendees: string[],
        options: {
            limit?: number;
            excludeAttended?: boolean;
            includeCrossUniversity?: boolean;
            timeRange?: number; // in days
        } = {}
    ): Promise<EventRecommendation[]> {
        try {
            const startTime = Date.now();
            const limit = options.limit || this.config.recommendations.maxRecommendations;

            // Get user's attended events (if excluding)
            const userAttendedEvents = options.excludeAttended 
                ? await this.getUserAttendedEvents(userId)
                : [];

            // Get all events
            const allEvents = await this.universityService.getCampusEvents(userUniversityId, {});
            
            // Filter events
            let candidateEvents = allEvents.filter(event => {
                // Exclude already attended events
                if (userAttendedEvents.includes(event.id)) {
                    return false;
                }

                // Filter by university if not including cross-university
                if (!options.includeCrossUniversity && event.universityId !== userUniversityId) {
                    return false;
                }

                // Filter by time range
                if (options.timeRange) {
                    const now = new Date();
                    const futureDate = new Date(now.getTime() + options.timeRange * 24 * 60 * 60 * 1000);
                    if (event.startDate > futureDate) {
                        return false;
                    }
                }

                // Only show future events
                return event.startDate > new Date();
            });

            // Calculate recommendation scores
            const recommendations: EventRecommendation[] = [];
            
            for (const event of candidateEvents) {
                const score = await this.calculateEventScore(
                    event,
                    userInterests,
                    userAttendees,
                    userUniversityId
                );

                if (score >= this.config.recommendations.minScore) {
                    const reasons = this.generateEventRecommendationReasons(
                        event,
                        userInterests,
                        userAttendees,
                        userUniversityId
                    );

                    recommendations.push({
                        event,
                        score,
                        reasons,
                        mutualAttendees: this.countMutualAttendees(event, userAttendees),
                        sharedInterests: this.findSharedInterests(event, userInterests)
                    });
                }
            }

            // Sort by score (highest first)
            recommendations.sort((a, b) => b.score - a.score);

            // Apply limit
            const finalRecommendations = recommendations.slice(0, limit);

            // Update metrics
            const duration = Date.now() - startTime;
            metrics.recordHistogram('event_recommendations_duration_ms', duration, {
                userId: this.hashUserId(userId),
                universityId: userUniversityId,
                recommendationCount: finalRecommendations.length
            });

            metrics.incrementCounter('event_recommendations_generated_total', {
                userId: this.hashUserId(userId),
                universityId: userUniversityId
            });

            logger.info('Event recommendations generated', {
                userId: this.hashUserId(userId),
                userUniversityId,
                recommendationCount: finalRecommendations.length,
                duration
            });

            return finalRecommendations;

        } catch (error) {
            logger.error('Error generating event recommendations', {
                userId: this.hashUserId(userId),
                userUniversityId,
                error: error.message
            });
            return [];
        }
    }

    /**
     * Register for event
     */
    async registerForEvent(
        eventId: string,
        userId: string,
        notes?: string
    ): Promise<EventRegistration | null> {
        try {
            // Get event
            const event = await this.getEvent(eventId);
            if (!event) {
                return null;
            }

            // Check if event is full
            if (event.maxAttendees && event.currentAttendees >= event.maxAttendees) {
                return null;
            }

            // Check if user is already registered
            const existingRegistration = await this.getEventRegistration(eventId, userId);
            if (existingRegistration) {
                return null;
            }

            // Create registration
            const registration: EventRegistration = {
                id: this.generateRegistrationId(),
                eventId,
                userId,
                registrationDate: new Date(),
                status: 'confirmed',
                notes,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            // Store registration
            await this.storeRegistration(registration);

            // Update event attendee count
            event.currentAttendees++;
            event.updatedAt = new Date();
            await this.updateEvent(event);

            // Update metrics
            metrics.incrementCounter('event_registrations_total', {
                eventId,
                universityId: event.universityId,
                eventType: event.type
            });

            logger.info('User registered for event', {
                registrationId: registration.id,
                eventId,
                userId: this.hashUserId(userId),
                universityId: event.universityId
            });

            return registration;

        } catch (error) {
            logger.error('Error registering for event', {
                eventId,
                userId: this.hashUserId(userId),
                error: error.message
            });
            return null;
        }
    }

    /**
     * Cancel event registration
     */
    async cancelEventRegistration(eventId: string, userId: string): Promise<boolean> {
        try {
            // Get registration
            const registration = await this.getEventRegistration(eventId, userId);
            if (!registration) {
                return false;
            }

            // Update registration status
            registration.status = 'cancelled';
            registration.updatedAt = new Date();
            await this.updateRegistration(registration);

            // Update event attendee count
            const event = await this.getEvent(eventId);
            if (event) {
                event.currentAttendees--;
                event.updatedAt = new Date();
                await this.updateEvent(event);
            }

            // Update metrics
            metrics.incrementCounter('event_registrations_cancelled_total', {
                eventId,
                universityId: event?.universityId
            });

            logger.info('User cancelled event registration', {
                registrationId: registration.id,
                eventId,
                userId: this.hashUserId(userId),
                universityId: event?.universityId
            });

            return true;

        } catch (error) {
            logger.error('Error cancelling event registration', {
                eventId,
                userId: this.hashUserId(userId),
                error: error.message
            });
            return false;
        }
    }

    /**
     * Get event statistics
     */
    async getEventStats(universityId: string, year?: number): Promise<EventStats> {
        try {
            const targetYear = year || new Date().getFullYear();
            const startDate = new Date(targetYear, 0, 1);
            const endDate = new Date(targetYear, 11, 31);

            const events = await this.universityService.getCampusEvents(universityId, {
                startDate,
                endDate
            });

            const stats: EventStats = {
                totalEvents: events.length,
                eventsByType: {},
                eventsByCategory: {},
                upcomingEvents: 0,
                pastEvents: 0,
                totalRegistrations: 0,
                averageAttendeesPerEvent: 0,
                mostPopularEvent: null,
                mostActiveOrganizer: '',
                eventsByMonth: {}
            };

            const now = new Date();
            let maxAttendees = 0;
            const organizerCounts: Record<string, number> = {};
            const eventsByMonth: Record<string, number> = {};

            for (const event of events) {
                // Count by type
                stats.eventsByType[event.type] = (stats.eventsByType[event.type] || 0) + 1;

                // Count by category
                stats.eventsByCategory[event.category] = (stats.eventsByCategory[event.category] || 0) + 1;

                // Count upcoming vs past
                if (event.startDate > now) {
                    stats.upcomingEvents++;
                } else {
                    stats.pastEvents++;
                }

                // Count registrations
                stats.totalRegistrations += event.currentAttendees;

                // Track most popular event
                if (event.currentAttendees > maxAttendees) {
                    maxAttendees = event.currentAttendees;
                    stats.mostPopularEvent = event;
                }

                // Count by organizer
                organizerCounts[event.organizer] = (organizerCounts[event.organizer] || 0) + 1;

                // Count by month
                const month = event.startDate.toISOString().slice(0, 7);
                eventsByMonth[month] = (eventsByMonth[month] || 0) + 1;
            }

            // Calculate averages
            if (stats.totalEvents > 0) {
                stats.averageAttendeesPerEvent = stats.totalRegistrations / stats.totalEvents;
            }

            // Find most active organizer
            let maxOrganizerCount = 0;
            for (const [organizer, count] of Object.entries(organizerCounts)) {
                if (count > maxOrganizerCount) {
                    maxOrganizerCount = count;
                    stats.mostActiveOrganizer = organizer;
                }
            }

            stats.eventsByMonth = eventsByMonth;

            return stats;

        } catch (error) {
            logger.error('Error getting event stats', {
                universityId,
                year,
                error: error.message
            });
            return {
                totalEvents: 0,
                eventsByType: {},
                eventsByCategory: {},
                upcomingEvents: 0,
                pastEvents: 0,
                totalRegistrations: 0,
                averageAttendeesPerEvent: 0,
                mostPopularEvent: null,
                mostActiveOrganizer: '',
                eventsByMonth: {}
            };
        }
    }

    /**
     * Get event analytics
     */
    async getEventAnalytics(eventId: string): Promise<EventAnalytics | null> {
        try {
            const event = await this.getEvent(eventId);
            if (!event) {
                return null;
            }

            const analytics: EventAnalytics = {
                eventId,
                totalViews: 0,
                totalRegistrations: 0,
                totalAttendees: 0,
                registrationRate: 0,
                attendanceRate: 0,
                viewsByDay: {},
                registrationsByDay: {},
                attendeeDemographics: {
                    byYear: {},
                    byDepartment: {},
                    byGender: {}
                },
                feedback: {
                    averageRating: 0,
                    totalRatings: 0,
                    ratings: {},
                    comments: []
                }
            };

            // Get registrations for this event
            const registrations = await this.getEventRegistrations(eventId);
            analytics.totalRegistrations = registrations.length;
            analytics.totalAttendees = registrations.filter(r => r.status === 'confirmed').length;

            // Calculate rates
            if (analytics.totalViews > 0) {
                analytics.registrationRate = (analytics.totalRegistrations / analytics.totalViews) * 100;
            }
            if (analytics.totalRegistrations > 0) {
                analytics.attendanceRate = (analytics.totalAttendees / analytics.totalRegistrations) * 100;
            }

            return analytics;

        } catch (error) {
            logger.error('Error getting event analytics', {
                eventId,
                error: error.message
            });
            return null;
        }
    }

    /**
     * Filter events by search query
     */
    private filterEventsByQuery(events: CampusEvent[], query: string): CampusEvent[] {
        const queryLower = query.toLowerCase();
        
        return events.filter(event => {
            // Search in title
            if (event.title.toLowerCase().includes(queryLower)) {
                return true;
            }

            // Search in description
            if (event.description.toLowerCase().includes(queryLower)) {
                return true;
            }

            // Search in location
            if (event.location.toLowerCase().includes(queryLower)) {
                return true;
            }

            // Search in organizer
            if (event.organizer.toLowerCase().includes(queryLower)) {
                return true;
            }

            // Search in tags
            for (const tag of event.tags) {
                if (tag.toLowerCase().includes(queryLower)) {
                    return true;
                }
            }

            return false;
        });
    }

    /**
     * Sort events by specified criteria
     */
    private sortEvents(
        events: CampusEvent[],
        sortBy: string,
        sortOrder: 'asc' | 'desc'
    ): CampusEvent[] {
        return events.sort((a, b) => {
            let aValue: any;
            let bValue: any;

            switch (sortBy) {
                case 'startDate':
                    aValue = a.startDate;
                    bValue = b.startDate;
                    break;
                case 'title':
                    aValue = a.title;
                    bValue = b.title;
                    break;
                case 'currentAttendees':
                    aValue = a.currentAttendees;
                    bValue = b.currentAttendees;
                    break;
                case 'createdAt':
                    aValue = a.createdAt;
                    bValue = b.createdAt;
                    break;
                default:
                    aValue = a.startDate;
                    bValue = b.startDate;
            }

            if (sortOrder === 'desc') {
                return bValue > aValue ? 1 : bValue < aValue ? -1 : 0;
            } else {
                return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
            }
        });
    }

    /**
     * Calculate recommendation score for event
     */
    private async calculateEventScore(
        event: CampusEvent,
        userInterests: string[],
        userAttendees: string[],
        userUniversityId: string
    ): Promise<number> {
        let score = 0;

        // University match score
        if (event.universityId === userUniversityId) {
            score += this.config.recommendations.weightFactors.universityMatch;
        }

        // Interest relevance score
        const sharedInterests = this.findSharedInterests(event, userInterests);
        if (sharedInterests.length > 0) {
            score += (sharedInterests.length / userInterests.length) * 
                    this.config.recommendations.weightFactors.sharedInterests;
        }

        // Mutual attendees score
        const mutualAttendees = this.countMutualAttendees(event, userAttendees);
        if (mutualAttendees > 0) {
            score += Math.min(mutualAttendees / 10, 1) * 
                    this.config.recommendations.weightFactors.mutualAttendees;
        }

        // Event relevance score
        const eventRelevance = this.calculateEventRelevance(event, userInterests);
        score += eventRelevance * this.config.recommendations.weightFactors.eventRelevance;

        // Time relevance score
        const timeRelevance = this.calculateTimeRelevance(event);
        score += timeRelevance * this.config.recommendations.weightFactors.timeRelevance;

        return Math.min(score, 1); // Cap at 1.0
    }

    /**
     * Generate event recommendation reasons
     */
    private generateEventRecommendationReasons(
        event: CampusEvent,
        userInterests: string[],
        userAttendees: string[],
        userUniversityId: string
    ): string[] {
        const reasons: string[] = [];

        // University match
        if (event.universityId === userUniversityId) {
            reasons.push('Same university');
        }

        // Shared interests
        const sharedInterests = this.findSharedInterests(event, userInterests);
        if (sharedInterests.length > 0) {
            reasons.push(`Shared interests: ${sharedInterests.join(', ')}`);
        }

        // Mutual attendees
        const mutualAttendees = this.countMutualAttendees(event, userAttendees);
        if (mutualAttendees > 0) {
            reasons.push(`${mutualAttendees} mutual attendees`);
        }

        // Event type relevance
        if (userInterests.includes(event.type)) {
            reasons.push(`Matches your interest in ${event.type} events`);
        }

        // Time relevance
        const daysUntilEvent = Math.ceil((event.startDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntilEvent <= 7) {
            reasons.push('Happening soon');
        }

        return reasons;
    }

    /**
     * Find shared interests between user and event
     */
    private findSharedInterests(event: CampusEvent, userInterests: string[]): string[] {
        const sharedInterests: string[] = [];
        const eventInterests = [event.type, event.category, ...event.tags];

        for (const userInterest of userInterests) {
            for (const eventInterest of eventInterests) {
                if (eventInterest.toLowerCase().includes(userInterest.toLowerCase()) ||
                    userInterest.toLowerCase().includes(eventInterest.toLowerCase())) {
                    if (!sharedInterests.includes(userInterest)) {
                        sharedInterests.push(userInterest);
                    }
                }
            }
        }

        return sharedInterests;
    }

    /**
     * Count mutual attendees in event
     */
    private countMutualAttendees(event: CampusEvent, userAttendees: string[]): number {
        // This would typically check actual attendees
        // For now, return a mock count based on event size
        return Math.floor(event.currentAttendees * 0.1);
    }

    /**
     * Calculate event relevance score
     */
    private calculateEventRelevance(event: CampusEvent, userInterests: string[]): number {
        if (userInterests.length === 0) {
            return 0;
        }

        let relevantTags = 0;
        for (const tag of event.tags) {
            for (const interest of userInterests) {
                if (tag.toLowerCase().includes(interest.toLowerCase()) ||
                    interest.toLowerCase().includes(tag.toLowerCase())) {
                    relevantTags++;
                    break;
                }
            }
        }

        return relevantTags / event.tags.length;
    }

    /**
     * Calculate time relevance score
     */
    private calculateTimeRelevance(event: CampusEvent): number {
        const now = new Date();
        const daysUntilEvent = Math.ceil((event.startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        // Higher score for events happening soon
        if (daysUntilEvent <= 7) {
            return 1.0;
        } else if (daysUntilEvent <= 30) {
            return 0.7;
        } else if (daysUntilEvent <= 90) {
            return 0.4;
        } else {
            return 0.1;
        }
    }

    /**
     * Get user's attended events
     */
    private async getUserAttendedEvents(userId: string): Promise<string[]> {
        // This would typically query user's event attendance
        // For now, return empty array
        return [];
    }

    /**
     * Get event by ID
     */
    private async getEvent(eventId: string): Promise<CampusEvent | null> {
        // This would typically use Redis or database
        // For now, return null
        return null;
    }

    /**
     * Update event
     */
    private async updateEvent(event: CampusEvent): Promise<void> {
        // This would typically use Redis or database
        // For now, just log the operation
        logger.debug('Updating event', { eventId: event.id });
    }

    /**
     * Get event registration
     */
    private async getEventRegistration(eventId: string, userId: string): Promise<EventRegistration | null> {
        // This would typically use Redis or database
        // For now, return null
        return null;
    }

    /**
     * Store registration
     */
    private async storeRegistration(registration: EventRegistration): Promise<void> {
        // This would typically use Redis or database
        // For now, just log the operation
        logger.debug('Storing registration', { registrationId: registration.id });
    }

    /**
     * Update registration
     */
    private async updateRegistration(registration: EventRegistration): Promise<void> {
        // This would typically use Redis or database
        // For now, just log the operation
        logger.debug('Updating registration', { registrationId: registration.id });
    }

    /**
     * Get event registrations
     */
    private async getEventRegistrations(eventId: string): Promise<EventRegistration[]> {
        // This would typically use Redis or database
        // For now, return empty array
        return [];
    }

    /**
     * Generate unique registration ID
     */
    private generateRegistrationId(): string {
        return `reg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Hash user ID for privacy
     */
    private hashUserId(userId: string): string {
        return Buffer.from(userId).toString('base64').slice(0, 16);
    }
}
