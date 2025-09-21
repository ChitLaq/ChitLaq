// Academic Calendar Feature
// Author: ChitLaq Development Team
// Date: 2024-01-15

import { logger } from '../utils/logger';
import { metrics } from '../utils/metrics';
import { UniversityNetworkService, AcademicYear, Semester } from '../services/UniversityNetworkService';

export interface AcademicEvent {
    id: string;
    universityId: string;
    academicYearId: string;
    semesterId?: string;
    title: string;
    description: string;
    type: 'holiday' | 'exam' | 'registration' | 'graduation' | 'orientation' | 'break' | 'deadline' | 'event';
    category: string;
    startDate: Date;
    endDate: Date;
    isAllDay: boolean;
    location?: string;
    organizer?: string;
    contactEmail?: string;
    contactPhone?: string;
    website?: string;
    maxAttendees?: number;
    currentAttendees: number;
    isPublic: boolean;
    requiresRegistration: boolean;
    tags: string[];
    imageUrl?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface AcademicSchedule {
    academicYear: AcademicYear;
    semesters: Semester[];
    events: AcademicEvent[];
    holidays: AcademicEvent[];
    importantDates: AcademicEvent[];
}

export interface CalendarView {
    type: 'month' | 'week' | 'day' | 'agenda';
    startDate: Date;
    endDate: Date;
    events: AcademicEvent[];
    totalEvents: number;
}

export interface CalendarFilter {
    types?: string[];
    categories?: string[];
    semesters?: string[];
    isPublic?: boolean;
    requiresRegistration?: boolean;
    tags?: string[];
}

export interface CalendarStats {
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsByCategory: Record<string, number>;
    upcomingEvents: number;
    pastEvents: number;
    averageEventsPerMonth: number;
    mostActiveMonth: string;
    mostActiveDay: string;
}

export interface EventReminder {
    id: string;
    eventId: string;
    userId: string;
    reminderType: 'email' | 'push' | 'sms';
    reminderTime: Date;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export class AcademicCalendar {
    private universityService: UniversityNetworkService;
    private config: {
        calendar: {
            defaultView: 'month';
            maxEventsPerView: number;
            cacheTtl: number;
            reminderTypes: string[];
        };
        events: {
            maxEventsPerUniversity: number;
            maxEventDuration: number; // in days
            minEventDuration: number; // in minutes
            allowedTypes: string[];
            allowedCategories: string[];
        };
        notifications: {
            reminderAdvanceTime: number; // in minutes
            maxRemindersPerEvent: number;
            reminderTypes: string[];
        };
    };

    constructor(universityService: UniversityNetworkService) {
        this.universityService = universityService;
        this.config = {
            calendar: {
                defaultView: 'month',
                maxEventsPerView: 1000,
                cacheTtl: 3600, // 1 hour
                reminderTypes: ['email', 'push', 'sms']
            },
            events: {
                maxEventsPerUniversity: 1000,
                maxEventDuration: 365, // 1 year
                minEventDuration: 15, // 15 minutes
                allowedTypes: ['holiday', 'exam', 'registration', 'graduation', 'orientation', 'break', 'deadline', 'event'],
                allowedCategories: ['academic', 'administrative', 'social', 'sports', 'cultural', 'career', 'workshop', 'conference']
            },
            notifications: {
                reminderAdvanceTime: 60, // 1 hour
                maxRemindersPerEvent: 3,
                reminderTypes: ['email', 'push', 'sms']
            }
        };
    }

    /**
     * Get academic schedule for university
     */
    async getAcademicSchedule(
        universityId: string,
        year?: number
    ): Promise<AcademicSchedule | null> {
        try {
            const startTime = Date.now();
            const targetYear = year || new Date().getFullYear();

            // Get academic year
            const academicYear = await this.universityService.getAcademicYear(universityId, targetYear);
            if (!academicYear) {
                return null;
            }

            // Get events for the academic year
            const events = await this.getAcademicEvents(universityId, {
                academicYearId: academicYear.id,
                startDate: academicYear.startDate,
                endDate: academicYear.endDate
            });

            // Categorize events
            const holidays = events.filter(event => event.type === 'holiday');
            const importantDates = events.filter(event => 
                ['exam', 'registration', 'graduation', 'deadline'].includes(event.type)
            );

            const schedule: AcademicSchedule = {
                academicYear,
                semesters: academicYear.semesters,
                events,
                holidays,
                importantDates
            };

            // Update metrics
            const duration = Date.now() - startTime;
            metrics.recordHistogram('academic_schedule_duration_ms', duration, {
                universityId,
                year: targetYear.toString()
            });

            metrics.incrementCounter('academic_schedules_retrieved_total', {
                universityId,
                year: targetYear.toString()
            });

            logger.info('Academic schedule retrieved', {
                universityId,
                year: targetYear,
                eventCount: events.length,
                duration
            });

            return schedule;

        } catch (error) {
            logger.error('Error getting academic schedule', {
                universityId,
                year,
                error: error.message
            });
            return null;
        }
    }

    /**
     * Get calendar view
     */
    async getCalendarView(
        universityId: string,
        viewType: 'month' | 'week' | 'day' | 'agenda',
        startDate: Date,
        endDate: Date,
        filters: CalendarFilter = {}
    ): Promise<CalendarView> {
        try {
            const startTime = Date.now();

            // Get events for the date range
            const events = await this.getAcademicEvents(universityId, {
                startDate,
                endDate,
                ...filters
            });

            // Sort events by start date
            events.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

            const calendarView: CalendarView = {
                type: viewType,
                startDate,
                endDate,
                events,
                totalEvents: events.length
            };

            // Update metrics
            const duration = Date.now() - startTime;
            metrics.recordHistogram('calendar_view_duration_ms', duration, {
                universityId,
                viewType,
                eventCount: events.length
            });

            metrics.incrementCounter('calendar_views_retrieved_total', {
                universityId,
                viewType
            });

            logger.info('Calendar view retrieved', {
                universityId,
                viewType,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                eventCount: events.length,
                duration
            });

            return calendarView;

        } catch (error) {
            logger.error('Error getting calendar view', {
                universityId,
                viewType,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                error: error.message
            });
            return {
                type: viewType,
                startDate,
                endDate,
                events: [],
                totalEvents: 0
            };
        }
    }

    /**
     * Create academic event
     */
    async createAcademicEvent(
        universityId: string,
        eventData: Omit<AcademicEvent, 'id' | 'universityId' | 'currentAttendees' | 'createdAt' | 'updatedAt'>
    ): Promise<AcademicEvent | null> {
        try {
            // Validate event data
            if (!this.validateEventData(eventData)) {
                return null;
            }

            const event: AcademicEvent = {
                id: this.generateEventId(),
                universityId,
                currentAttendees: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
                ...eventData
            };

            // Store event
            const key = `academic_event:${universityId}:${event.id}`;
            await this.storeEvent(key, event);

            // Add to university's event list
            const universityEventsKey = `university_academic_events:${universityId}`;
            await this.addToEventList(universityEventsKey, event.id);

            // Update metrics
            metrics.incrementCounter('academic_events_created_total', {
                universityId,
                type: event.type,
                category: event.category
            });

            logger.info('Academic event created', {
                eventId: event.id,
                universityId,
                title: event.title,
                type: event.type,
                startDate: event.startDate.toISOString()
            });

            return event;

        } catch (error) {
            logger.error('Error creating academic event', {
                universityId,
                error: error.message
            });
            return null;
        }
    }

    /**
     * Update academic event
     */
    async updateAcademicEvent(
        eventId: string,
        updates: Partial<Omit<AcademicEvent, 'id' | 'universityId' | 'createdAt' | 'updatedAt'>>
    ): Promise<AcademicEvent | null> {
        try {
            // Get existing event
            const existingEvent = await this.getAcademicEvent(eventId);
            if (!existingEvent) {
                return null;
            }

            // Validate updates
            if (!this.validateEventUpdates(updates)) {
                return null;
            }

            // Update event
            const updatedEvent: AcademicEvent = {
                ...existingEvent,
                ...updates,
                updatedAt: new Date()
            };

            // Store updated event
            const key = `academic_event:${existingEvent.universityId}:${eventId}`;
            await this.storeEvent(key, updatedEvent);

            // Update metrics
            metrics.incrementCounter('academic_events_updated_total', {
                universityId: existingEvent.universityId,
                eventId
            });

            logger.info('Academic event updated', {
                eventId,
                universityId: existingEvent.universityId,
                title: updatedEvent.title
            });

            return updatedEvent;

        } catch (error) {
            logger.error('Error updating academic event', {
                eventId,
                error: error.message
            });
            return null;
        }
    }

    /**
     * Delete academic event
     */
    async deleteAcademicEvent(eventId: string): Promise<boolean> {
        try {
            // Get existing event
            const existingEvent = await this.getAcademicEvent(eventId);
            if (!existingEvent) {
                return false;
            }

            // Delete event
            const key = `academic_event:${existingEvent.universityId}:${eventId}`;
            await this.deleteEvent(key);

            // Remove from university's event list
            const universityEventsKey = `university_academic_events:${existingEvent.universityId}`;
            await this.removeFromEventList(universityEventsKey, eventId);

            // Update metrics
            metrics.incrementCounter('academic_events_deleted_total', {
                universityId: existingEvent.universityId,
                eventId
            });

            logger.info('Academic event deleted', {
                eventId,
                universityId: existingEvent.universityId,
                title: existingEvent.title
            });

            return true;

        } catch (error) {
            logger.error('Error deleting academic event', {
                eventId,
                error: error.message
            });
            return false;
        }
    }

    /**
     * Get academic events
     */
    async getAcademicEvents(
        universityId: string,
        options: {
            academicYearId?: string;
            semesterId?: string;
            startDate?: Date;
            endDate?: Date;
            types?: string[];
            categories?: string[];
            isPublic?: boolean;
            requiresRegistration?: boolean;
            tags?: string[];
            limit?: number;
            offset?: number;
        } = {}
    ): Promise<AcademicEvent[]> {
        try {
            const events: AcademicEvent[] = [];
            const eventKeys = await this.getEventKeys(universityId);

            for (const key of eventKeys) {
                const event = await this.getEvent(key);
                if (!event) {
                    continue;
                }

                // Apply filters
                if (options.academicYearId && event.academicYearId !== options.academicYearId) {
                    continue;
                }
                if (options.semesterId && event.semesterId !== options.semesterId) {
                    continue;
                }
                if (options.startDate && event.startDate < options.startDate) {
                    continue;
                }
                if (options.endDate && event.endDate > options.endDate) {
                    continue;
                }
                if (options.types && !options.types.includes(event.type)) {
                    continue;
                }
                if (options.categories && !options.categories.includes(event.category)) {
                    continue;
                }
                if (options.isPublic !== undefined && event.isPublic !== options.isPublic) {
                    continue;
                }
                if (options.requiresRegistration !== undefined && event.requiresRegistration !== options.requiresRegistration) {
                    continue;
                }
                if (options.tags && !options.tags.some(tag => event.tags.includes(tag))) {
                    continue;
                }

                events.push(event);
            }

            // Sort by start date
            events.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

            // Apply pagination
            const offset = options.offset || 0;
            const limit = options.limit || this.config.calendar.maxEventsPerView;
            
            return events.slice(offset, offset + limit);

        } catch (error) {
            logger.error('Error getting academic events', {
                universityId,
                error: error.message
            });
            return [];
        }
    }

    /**
     * Get academic event by ID
     */
    async getAcademicEvent(eventId: string): Promise<AcademicEvent | null> {
        try {
            const eventKeys = await this.getEventKeysByPattern(`*:${eventId}`);
            if (eventKeys.length === 0) {
                return null;
            }

            return await this.getEvent(eventKeys[0]);

        } catch (error) {
            logger.error('Error getting academic event', {
                eventId,
                error: error.message
            });
            return null;
        }
    }

    /**
     * Get calendar statistics
     */
    async getCalendarStats(universityId: string, year?: number): Promise<CalendarStats> {
        try {
            const targetYear = year || new Date().getFullYear();
            const startDate = new Date(targetYear, 0, 1);
            const endDate = new Date(targetYear, 11, 31);

            const events = await this.getAcademicEvents(universityId, {
                startDate,
                endDate
            });

            const stats: CalendarStats = {
                totalEvents: events.length,
                eventsByType: {},
                eventsByCategory: {},
                upcomingEvents: 0,
                pastEvents: 0,
                averageEventsPerMonth: 0,
                mostActiveMonth: '',
                mostActiveDay: ''
            };

            const now = new Date();
            const eventsByMonth: Record<string, number> = {};
            const eventsByDay: Record<string, number> = {};

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

                // Count by month
                const month = event.startDate.toISOString().slice(0, 7);
                eventsByMonth[month] = (eventsByMonth[month] || 0) + 1;

                // Count by day of week
                const day = event.startDate.toLocaleDateString('en-US', { weekday: 'long' });
                eventsByDay[day] = (eventsByDay[day] || 0) + 1;
            }

            // Calculate averages
            if (stats.totalEvents > 0) {
                stats.averageEventsPerMonth = stats.totalEvents / 12;
            }

            // Find most active month
            let maxMonthCount = 0;
            for (const [month, count] of Object.entries(eventsByMonth)) {
                if (count > maxMonthCount) {
                    maxMonthCount = count;
                    stats.mostActiveMonth = month;
                }
            }

            // Find most active day
            let maxDayCount = 0;
            for (const [day, count] of Object.entries(eventsByDay)) {
                if (count > maxDayCount) {
                    maxDayCount = count;
                    stats.mostActiveDay = day;
                }
            }

            return stats;

        } catch (error) {
            logger.error('Error getting calendar stats', {
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
                averageEventsPerMonth: 0,
                mostActiveMonth: '',
                mostActiveDay: ''
            };
        }
    }

    /**
     * Set event reminder
     */
    async setEventReminder(
        eventId: string,
        userId: string,
        reminderType: 'email' | 'push' | 'sms',
        reminderTime: Date
    ): Promise<EventReminder | null> {
        try {
            // Validate reminder type
            if (!this.config.notifications.reminderTypes.includes(reminderType)) {
                return null;
            }

            // Check if event exists
            const event = await this.getAcademicEvent(eventId);
            if (!event) {
                return null;
            }

            // Validate reminder time
            if (reminderTime >= event.startDate) {
                return null;
            }

            const reminder: EventReminder = {
                id: this.generateReminderId(),
                eventId,
                userId,
                reminderType,
                reminderTime,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            // Store reminder
            const key = `event_reminder:${eventId}:${userId}:${reminder.id}`;
            await this.storeReminder(key, reminder);

            // Update metrics
            metrics.incrementCounter('event_reminders_created_total', {
                eventId,
                reminderType
            });

            logger.info('Event reminder set', {
                reminderId: reminder.id,
                eventId,
                userId: this.hashUserId(userId),
                reminderType,
                reminderTime: reminderTime.toISOString()
            });

            return reminder;

        } catch (error) {
            logger.error('Error setting event reminder', {
                eventId,
                userId: this.hashUserId(userId),
                reminderType,
                error: error.message
            });
            return null;
        }
    }

    /**
     * Get event reminders for user
     */
    async getUserEventReminders(userId: string): Promise<EventReminder[]> {
        try {
            const reminders: EventReminder[] = [];
            const reminderKeys = await this.getReminderKeysByPattern(`*:${userId}:*`);

            for (const key of reminderKeys) {
                const reminder = await this.getReminder(key);
                if (reminder && reminder.isActive) {
                    reminders.push(reminder);
                }
            }

            // Sort by reminder time
            reminders.sort((a, b) => a.reminderTime.getTime() - b.reminderTime.getTime());

            return reminders;

        } catch (error) {
            logger.error('Error getting user event reminders', {
                userId: this.hashUserId(userId),
                error: error.message
            });
            return [];
        }
    }

    /**
     * Validate event data
     */
    private validateEventData(eventData: any): boolean {
        // Check required fields
        if (!eventData.title || !eventData.startDate || !eventData.endDate) {
            return false;
        }

        // Check event type
        if (!this.config.events.allowedTypes.includes(eventData.type)) {
            return false;
        }

        // Check event category
        if (!this.config.events.allowedCategories.includes(eventData.category)) {
            return false;
        }

        // Check date range
        if (eventData.startDate >= eventData.endDate) {
            return false;
        }

        // Check event duration
        const duration = eventData.endDate.getTime() - eventData.startDate.getTime();
        const durationDays = duration / (1000 * 60 * 60 * 24);
        if (durationDays > this.config.events.maxEventDuration) {
            return false;
        }

        return true;
    }

    /**
     * Validate event updates
     */
    private validateEventUpdates(updates: any): boolean {
        // Check event type if provided
        if (updates.type && !this.config.events.allowedTypes.includes(updates.type)) {
            return false;
        }

        // Check event category if provided
        if (updates.category && !this.config.events.allowedCategories.includes(updates.category)) {
            return false;
        }

        // Check date range if provided
        if (updates.startDate && updates.endDate && updates.startDate >= updates.endDate) {
            return false;
        }

        return true;
    }

    /**
     * Generate unique event ID
     */
    private generateEventId(): string {
        return `ae_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Generate unique reminder ID
     */
    private generateReminderId(): string {
        return `rem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Store event
     */
    private async storeEvent(key: string, event: AcademicEvent): Promise<void> {
        // This would typically use Redis or database
        // For now, just log the operation
        logger.debug('Storing event', { key, eventId: event.id });
    }

    /**
     * Get event
     */
    private async getEvent(key: string): Promise<AcademicEvent | null> {
        // This would typically use Redis or database
        // For now, return null
        return null;
    }

    /**
     * Delete event
     */
    private async deleteEvent(key: string): Promise<void> {
        // This would typically use Redis or database
        // For now, just log the operation
        logger.debug('Deleting event', { key });
    }

    /**
     * Get event keys
     */
    private async getEventKeys(universityId: string): Promise<string[]> {
        // This would typically use Redis or database
        // For now, return empty array
        return [];
    }

    /**
     * Get event keys by pattern
     */
    private async getEventKeysByPattern(pattern: string): Promise<string[]> {
        // This would typically use Redis or database
        // For now, return empty array
        return [];
    }

    /**
     * Add to event list
     */
    private async addToEventList(listKey: string, eventId: string): Promise<void> {
        // This would typically use Redis or database
        // For now, just log the operation
        logger.debug('Adding to event list', { listKey, eventId });
    }

    /**
     * Remove from event list
     */
    private async removeFromEventList(listKey: string, eventId: string): Promise<void> {
        // This would typically use Redis or database
        // For now, just log the operation
        logger.debug('Removing from event list', { listKey, eventId });
    }

    /**
     * Store reminder
     */
    private async storeReminder(key: string, reminder: EventReminder): Promise<void> {
        // This would typically use Redis or database
        // For now, just log the operation
        logger.debug('Storing reminder', { key, reminderId: reminder.id });
    }

    /**
     * Get reminder
     */
    private async getReminder(key: string): Promise<EventReminder | null> {
        // This would typically use Redis or database
        // For now, return null
        return null;
    }

    /**
     * Get reminder keys by pattern
     */
    private async getReminderKeysByPattern(pattern: string): Promise<string[]> {
        // This would typically use Redis or database
        // For now, return empty array
        return [];
    }

    /**
     * Hash user ID for privacy
     */
    private hashUserId(userId: string): string {
        return Buffer.from(userId).toString('base64').slice(0, 16);
    }
}
