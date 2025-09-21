// University Network Service
// Author: ChitLaq Development Team
// Date: 2024-01-15

import Redis from 'ioredis';
import { logger } from '../utils/logger';
import { metrics } from '../utils/metrics';

export interface University {
    id: string;
    name: string;
    domain: string;
    country: string;
    state?: string;
    city: string;
    type: 'public' | 'private' | 'community' | 'research';
    size: 'small' | 'medium' | 'large' | 'mega';
    established: number;
    website: string;
    logo?: string;
    description?: string;
    features: UniversityFeatures;
    settings: UniversitySettings;
    createdAt: Date;
    updatedAt: Date;
}

export interface UniversityFeatures {
    departments: boolean;
    academicCalendar: boolean;
    campusEvents: boolean;
    studyGroups: boolean;
    announcements: boolean;
    clubs: boolean;
    alumni: boolean;
    crossUniversity: boolean;
    lmsIntegration: boolean;
    studentIdVerification: boolean;
}

export interface UniversitySettings {
    allowCrossUniversity: boolean;
    requireStudentIdVerification: boolean;
    enableAlumniAccess: boolean;
    enableClubIntegration: boolean;
    enableEventIntegration: boolean;
    enableAcademicCalendar: boolean;
    enableStudyGroups: boolean;
    enableAnnouncements: boolean;
    enableDepartmentDiscovery: boolean;
    enableCampusLocationTagging: boolean;
}

export interface Department {
    id: string;
    universityId: string;
    name: string;
    code: string;
    description?: string;
    faculty: string;
    headOfDepartment?: string;
    email?: string;
    website?: string;
    location?: string;
    established?: number;
    studentCount?: number;
    facultyCount?: number;
    programs: AcademicProgram[];
    createdAt: Date;
    updatedAt: Date;
}

export interface AcademicProgram {
    id: string;
    departmentId: string;
    name: string;
    code: string;
    level: 'undergraduate' | 'graduate' | 'doctoral' | 'certificate';
    duration: number; // in years
    credits: number;
    description?: string;
    requirements?: string[];
    careerPaths?: string[];
    createdAt: Date;
    updatedAt: Date;
}

export interface AcademicYear {
    id: string;
    universityId: string;
    year: number;
    startDate: Date;
    endDate: Date;
    semesters: Semester[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface Semester {
    id: string;
    academicYearId: string;
    name: string;
    code: string;
    startDate: Date;
    endDate: Date;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface CampusEvent {
    id: string;
    universityId: string;
    title: string;
    description: string;
    type: 'academic' | 'social' | 'sports' | 'cultural' | 'career' | 'workshop' | 'conference';
    category: string;
    startDate: Date;
    endDate: Date;
    location: string;
    organizer: string;
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

export interface UniversityAnnouncement {
    id: string;
    universityId: string;
    title: string;
    content: string;
    type: 'general' | 'academic' | 'administrative' | 'emergency' | 'event';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    targetAudience: 'all' | 'students' | 'faculty' | 'staff' | 'alumni' | 'specific_department';
    targetDepartmentId?: string;
    targetAcademicYear?: number;
    publishedAt: Date;
    expiresAt?: Date;
    isActive: boolean;
    authorId: string;
    authorName: string;
    attachments?: string[];
    createdAt: Date;
    updatedAt: Date;
}

export interface StudyGroup {
    id: string;
    universityId: string;
    name: string;
    description: string;
    subject: string;
    courseCode?: string;
    academicYear: number;
    semester: string;
    maxMembers: number;
    currentMembers: number;
    meetingSchedule: string;
    meetingLocation: string;
    isPublic: boolean;
    requiresApproval: boolean;
    tags: string[];
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface UniversityClub {
    id: string;
    universityId: string;
    name: string;
    description: string;
    category: 'academic' | 'cultural' | 'sports' | 'social' | 'professional' | 'volunteer';
    type: 'official' | 'unofficial';
    established: number;
    president: string;
    vicePresident?: string;
    treasurer?: string;
    secretary?: string;
    email?: string;
    website?: string;
    socialMedia?: Record<string, string>;
    meetingSchedule?: string;
    meetingLocation?: string;
    membershipFee?: number;
    maxMembers?: number;
    currentMembers: number;
    isActive: boolean;
    tags: string[];
    createdAt: Date;
    updatedAt: Date;
}

export interface UniversityNetworkMetrics {
    totalUniversities: number;
    totalDepartments: number;
    totalStudents: number;
    totalFaculty: number;
    totalEvents: number;
    totalStudyGroups: number;
    totalClubs: number;
    activeAnnouncements: number;
    crossUniversityConnections: number;
    engagementRate: number;
}

export class UniversityNetworkService {
    private redis: Redis;
    private config: {
        redis: {
            host: string;
            port: number;
            password?: string;
            db: number;
        };
        features: {
            departmentDiscovery: boolean;
            academicCalendar: boolean;
            campusEvents: boolean;
            studyGroups: boolean;
            announcements: boolean;
            clubs: boolean;
            alumni: boolean;
            crossUniversity: boolean;
        };
        limits: {
            maxEventsPerUniversity: number;
            maxStudyGroupsPerUser: number;
            maxAnnouncementsPerUniversity: number;
            maxClubsPerUniversity: number;
        };
    };

    constructor() {
        this.config = {
            redis: {
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT || '6379'),
                password: process.env.REDIS_PASSWORD,
                db: parseInt(process.env.REDIS_DB || '4') // Use different DB for university features
            },
            features: {
                departmentDiscovery: process.env.DEPARTMENT_DISCOVERY_ENABLED === 'true',
                academicCalendar: process.env.ACADEMIC_CALENDAR_ENABLED === 'true',
                campusEvents: process.env.CAMPUS_EVENTS_ENABLED === 'true',
                studyGroups: process.env.STUDY_GROUPS_ENABLED === 'true',
                announcements: process.env.ANNOUNCEMENTS_ENABLED === 'true',
                clubs: process.env.CLUBS_ENABLED === 'true',
                alumni: process.env.ALUMNI_ENABLED === 'true',
                crossUniversity: process.env.CROSS_UNIVERSITY_ENABLED === 'true'
            },
            limits: {
                maxEventsPerUniversity: 1000,
                maxStudyGroupsPerUser: 5,
                maxAnnouncementsPerUniversity: 100,
                maxClubsPerUniversity: 200
            }
        };

        this.redis = new Redis(this.config.redis);
    }

    /**
     * Get university by ID
     */
    async getUniversity(universityId: string): Promise<University | null> {
        try {
            const key = `university:${universityId}`;
            const data = await this.redis.get(key);
            
            if (!data) {
                return null;
            }

            return JSON.parse(data);

        } catch (error) {
            logger.error('Error getting university', {
                universityId,
                error: error.message
            });
            return null;
        }
    }

    /**
     * Get university by domain
     */
    async getUniversityByDomain(domain: string): Promise<University | null> {
        try {
            const universityId = await this.redis.get(`university_domain:${domain}`);
            if (!universityId) {
                return null;
            }

            return await this.getUniversity(universityId);

        } catch (error) {
            logger.error('Error getting university by domain', {
                domain,
                error: error.message
            });
            return null;
        }
    }

    /**
     * Get all universities
     */
    async getAllUniversities(options: {
        limit?: number;
        offset?: number;
        country?: string;
        type?: string;
        size?: string;
    } = {}): Promise<University[]> {
        try {
            const universities: University[] = [];
            const universityKeys = await this.redis.keys('university:*');
            
            for (const key of universityKeys) {
                const data = await this.redis.get(key);
                if (data) {
                    const university: University = JSON.parse(data);
                    
                    // Apply filters
                    if (options.country && university.country !== options.country) {
                        continue;
                    }
                    if (options.type && university.type !== options.type) {
                        continue;
                    }
                    if (options.size && university.size !== options.size) {
                        continue;
                    }
                    
                    universities.push(university);
                }
            }

            // Sort by name
            universities.sort((a, b) => a.name.localeCompare(b.name));

            // Apply pagination
            const offset = options.offset || 0;
            const limit = options.limit || 50;
            
            return universities.slice(offset, offset + limit);

        } catch (error) {
            logger.error('Error getting all universities', {
                error: error.message
            });
            return [];
        }
    }

    /**
     * Get departments for a university
     */
    async getDepartments(
        universityId: string,
        options: {
            limit?: number;
            offset?: number;
            faculty?: string;
        } = {}
    ): Promise<Department[]> {
        try {
            const departments: Department[] = [];
            const departmentKeys = await this.redis.keys(`department:${universityId}:*`);
            
            for (const key of departmentKeys) {
                const data = await this.redis.get(key);
                if (data) {
                    const department: Department = JSON.parse(data);
                    
                    // Apply filters
                    if (options.faculty && department.faculty !== options.faculty) {
                        continue;
                    }
                    
                    departments.push(department);
                }
            }

            // Sort by name
            departments.sort((a, b) => a.name.localeCompare(b.name));

            // Apply pagination
            const offset = options.offset || 0;
            const limit = options.limit || 50;
            
            return departments.slice(offset, offset + limit);

        } catch (error) {
            logger.error('Error getting departments', {
                universityId,
                error: error.message
            });
            return [];
        }
    }

    /**
     * Get department by ID
     */
    async getDepartment(departmentId: string): Promise<Department | null> {
        try {
            const key = `department:${departmentId}`;
            const data = await this.redis.get(key);
            
            if (!data) {
                return null;
            }

            return JSON.parse(data);

        } catch (error) {
            logger.error('Error getting department', {
                departmentId,
                error: error.message
            });
            return null;
        }
    }

    /**
     * Get academic year for university
     */
    async getAcademicYear(universityId: string, year?: number): Promise<AcademicYear | null> {
        try {
            const targetYear = year || new Date().getFullYear();
            const key = `academic_year:${universityId}:${targetYear}`;
            const data = await this.redis.get(key);
            
            if (!data) {
                return null;
            }

            return JSON.parse(data);

        } catch (error) {
            logger.error('Error getting academic year', {
                universityId,
                year,
                error: error.message
            });
            return null;
        }
    }

    /**
     * Get campus events for university
     */
    async getCampusEvents(
        universityId: string,
        options: {
            limit?: number;
            offset?: number;
            type?: string;
            category?: string;
            startDate?: Date;
            endDate?: Date;
            isPublic?: boolean;
        } = {}
    ): Promise<CampusEvent[]> {
        try {
            const events: CampusEvent[] = [];
            const eventKeys = await this.redis.keys(`campus_event:${universityId}:*`);
            
            for (const key of eventKeys) {
                const data = await this.redis.get(key);
                if (data) {
                    const event: CampusEvent = JSON.parse(data);
                    
                    // Apply filters
                    if (options.type && event.type !== options.type) {
                        continue;
                    }
                    if (options.category && event.category !== options.category) {
                        continue;
                    }
                    if (options.isPublic !== undefined && event.isPublic !== options.isPublic) {
                        continue;
                    }
                    if (options.startDate && event.startDate < options.startDate) {
                        continue;
                    }
                    if (options.endDate && event.endDate > options.endDate) {
                        continue;
                    }
                    
                    events.push(event);
                }
            }

            // Sort by start date
            events.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

            // Apply pagination
            const offset = options.offset || 0;
            const limit = options.limit || 50;
            
            return events.slice(offset, offset + limit);

        } catch (error) {
            logger.error('Error getting campus events', {
                universityId,
                error: error.message
            });
            return [];
        }
    }

    /**
     * Get university announcements
     */
    async getAnnouncements(
        universityId: string,
        options: {
            limit?: number;
            offset?: number;
            type?: string;
            priority?: string;
            targetAudience?: string;
            isActive?: boolean;
        } = {}
    ): Promise<UniversityAnnouncement[]> {
        try {
            const announcements: UniversityAnnouncement[] = [];
            const announcementKeys = await this.redis.keys(`announcement:${universityId}:*`);
            
            for (const key of announcementKeys) {
                const data = await this.redis.get(key);
                if (data) {
                    const announcement: UniversityAnnouncement = JSON.parse(data);
                    
                    // Apply filters
                    if (options.type && announcement.type !== options.type) {
                        continue;
                    }
                    if (options.priority && announcement.priority !== options.priority) {
                        continue;
                    }
                    if (options.targetAudience && announcement.targetAudience !== options.targetAudience) {
                        continue;
                    }
                    if (options.isActive !== undefined && announcement.isActive !== options.isActive) {
                        continue;
                    }
                    
                    announcements.push(announcement);
                }
            }

            // Sort by published date (newest first)
            announcements.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());

            // Apply pagination
            const offset = options.offset || 0;
            const limit = options.limit || 50;
            
            return announcements.slice(offset, offset + limit);

        } catch (error) {
            logger.error('Error getting announcements', {
                universityId,
                error: error.message
            });
            return [];
        }
    }

    /**
     * Get study groups for university
     */
    async getStudyGroups(
        universityId: string,
        options: {
            limit?: number;
            offset?: number;
            subject?: string;
            academicYear?: number;
            semester?: string;
            isPublic?: boolean;
        } = {}
    ): Promise<StudyGroup[]> {
        try {
            const studyGroups: StudyGroup[] = [];
            const studyGroupKeys = await this.redis.keys(`study_group:${universityId}:*`);
            
            for (const key of studyGroupKeys) {
                const data = await this.redis.get(key);
                if (data) {
                    const studyGroup: StudyGroup = JSON.parse(data);
                    
                    // Apply filters
                    if (options.subject && studyGroup.subject !== options.subject) {
                        continue;
                    }
                    if (options.academicYear && studyGroup.academicYear !== options.academicYear) {
                        continue;
                    }
                    if (options.semester && studyGroup.semester !== options.semester) {
                        continue;
                    }
                    if (options.isPublic !== undefined && studyGroup.isPublic !== options.isPublic) {
                        continue;
                    }
                    
                    studyGroups.push(studyGroup);
                }
            }

            // Sort by creation date (newest first)
            studyGroups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

            // Apply pagination
            const offset = options.offset || 0;
            const limit = options.limit || 50;
            
            return studyGroups.slice(offset, offset + limit);

        } catch (error) {
            logger.error('Error getting study groups', {
                universityId,
                error: error.message
            });
            return [];
        }
    }

    /**
     * Get university clubs
     */
    async getClubs(
        universityId: string,
        options: {
            limit?: number;
            offset?: number;
            category?: string;
            type?: string;
            isActive?: boolean;
        } = {}
    ): Promise<UniversityClub[]> {
        try {
            const clubs: UniversityClub[] = [];
            const clubKeys = await this.redis.keys(`club:${universityId}:*`);
            
            for (const key of clubKeys) {
                const data = await this.redis.get(key);
                if (data) {
                    const club: UniversityClub = JSON.parse(data);
                    
                    // Apply filters
                    if (options.category && club.category !== options.category) {
                        continue;
                    }
                    if (options.type && club.type !== options.type) {
                        continue;
                    }
                    if (options.isActive !== undefined && club.isActive !== options.isActive) {
                        continue;
                    }
                    
                    clubs.push(club);
                }
            }

            // Sort by name
            clubs.sort((a, b) => a.name.localeCompare(b.name));

            // Apply pagination
            const offset = options.offset || 0;
            const limit = options.limit || 50;
            
            return clubs.slice(offset, offset + limit);

        } catch (error) {
            logger.error('Error getting clubs', {
                universityId,
                error: error.message
            });
            return [];
        }
    }

    /**
     * Create campus event
     */
    async createCampusEvent(
        universityId: string,
        eventData: Omit<CampusEvent, 'id' | 'universityId' | 'currentAttendees' | 'createdAt' | 'updatedAt'>
    ): Promise<CampusEvent | null> {
        try {
            const event: CampusEvent = {
                id: this.generateEventId(),
                universityId,
                currentAttendees: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
                ...eventData
            };

            // Store event
            const key = `campus_event:${universityId}:${event.id}`;
            await this.redis.setex(
                key,
                86400 * 30, // 30 days
                JSON.stringify(event)
            );

            // Add to university's event list
            const universityEventsKey = `university_events:${universityId}`;
            await this.redis.lpush(universityEventsKey, event.id);
            await this.redis.ltrim(universityEventsKey, 0, this.config.limits.maxEventsPerUniversity - 1);
            await this.redis.expire(universityEventsKey, 86400 * 30); // 30 days

            // Update metrics
            metrics.incrementCounter('campus_events_created_total', {
                universityId,
                type: event.type,
                category: event.category
            });

            logger.info('Campus event created', {
                eventId: event.id,
                universityId,
                title: event.title,
                type: event.type
            });

            return event;

        } catch (error) {
            logger.error('Error creating campus event', {
                universityId,
                error: error.message
            });
            return null;
        }
    }

    /**
     * Create study group
     */
    async createStudyGroup(
        universityId: string,
        studyGroupData: Omit<StudyGroup, 'id' | 'universityId' | 'currentMembers' | 'createdAt' | 'updatedAt'>
    ): Promise<StudyGroup | null> {
        try {
            const studyGroup: StudyGroup = {
                id: this.generateStudyGroupId(),
                universityId,
                currentMembers: 1, // Creator is first member
                createdAt: new Date(),
                updatedAt: new Date(),
                ...studyGroupData
            };

            // Store study group
            const key = `study_group:${universityId}:${studyGroup.id}`;
            await this.redis.setex(
                key,
                86400 * 90, // 90 days
                JSON.stringify(studyGroup)
            );

            // Add to university's study group list
            const universityStudyGroupsKey = `university_study_groups:${universityId}`;
            await this.redis.lpush(universityStudyGroupsKey, studyGroup.id);
            await this.redis.expire(universityStudyGroupsKey, 86400 * 90); // 90 days

            // Add creator as member
            const memberKey = `study_group_members:${studyGroup.id}`;
            await this.redis.sadd(memberKey, studyGroup.createdBy);
            await this.redis.expire(memberKey, 86400 * 90); // 90 days

            // Update metrics
            metrics.incrementCounter('study_groups_created_total', {
                universityId,
                subject: studyGroup.subject,
                academicYear: studyGroup.academicYear.toString()
            });

            logger.info('Study group created', {
                studyGroupId: studyGroup.id,
                universityId,
                name: studyGroup.name,
                subject: studyGroup.subject
            });

            return studyGroup;

        } catch (error) {
            logger.error('Error creating study group', {
                universityId,
                error: error.message
            });
            return null;
        }
    }

    /**
     * Create university announcement
     */
    async createAnnouncement(
        universityId: string,
        announcementData: Omit<UniversityAnnouncement, 'id' | 'universityId' | 'createdAt' | 'updatedAt'>
    ): Promise<UniversityAnnouncement | null> {
        try {
            const announcement: UniversityAnnouncement = {
                id: this.generateAnnouncementId(),
                universityId,
                createdAt: new Date(),
                updatedAt: new Date(),
                ...announcementData
            };

            // Store announcement
            const key = `announcement:${universityId}:${announcement.id}`;
            await this.redis.setex(
                key,
                86400 * 30, // 30 days
                JSON.stringify(announcement)
            );

            // Add to university's announcement list
            const universityAnnouncementsKey = `university_announcements:${universityId}`;
            await this.redis.lpush(universityAnnouncementsKey, announcement.id);
            await this.redis.ltrim(universityAnnouncementsKey, 0, this.config.limits.maxAnnouncementsPerUniversity - 1);
            await this.redis.expire(universityAnnouncementsKey, 86400 * 30); // 30 days

            // Update metrics
            metrics.incrementCounter('announcements_created_total', {
                universityId,
                type: announcement.type,
                priority: announcement.priority,
                targetAudience: announcement.targetAudience
            });

            logger.info('University announcement created', {
                announcementId: announcement.id,
                universityId,
                title: announcement.title,
                type: announcement.type,
                priority: announcement.priority
            });

            return announcement;

        } catch (error) {
            logger.error('Error creating announcement', {
                universityId,
                error: error.message
            });
            return null;
        }
    }

    /**
     * Join study group
     */
    async joinStudyGroup(studyGroupId: string, userId: string): Promise<boolean> {
        try {
            // Get study group
            const studyGroupKeys = await this.redis.keys(`study_group:*:${studyGroupId}`);
            if (studyGroupKeys.length === 0) {
                return false;
            }

            const studyGroupData = await this.redis.get(studyGroupKeys[0]);
            if (!studyGroupData) {
                return false;
            }

            const studyGroup: StudyGroup = JSON.parse(studyGroupData);

            // Check if user is already a member
            const memberKey = `study_group_members:${studyGroupId}`;
            const isMember = await this.redis.sismember(memberKey, userId);
            if (isMember) {
                return false;
            }

            // Check if study group is full
            if (studyGroup.currentMembers >= studyGroup.maxMembers) {
                return false;
            }

            // Add user to study group
            await this.redis.sadd(memberKey, userId);

            // Update member count
            studyGroup.currentMembers++;
            studyGroup.updatedAt = new Date();
            await this.redis.setex(
                studyGroupKeys[0],
                86400 * 90, // 90 days
                JSON.stringify(studyGroup)
            );

            // Update metrics
            metrics.incrementCounter('study_group_joins_total', {
                studyGroupId,
                universityId: studyGroup.universityId
            });

            logger.info('User joined study group', {
                studyGroupId,
                userId: this.hashUserId(userId),
                universityId: studyGroup.universityId
            });

            return true;

        } catch (error) {
            logger.error('Error joining study group', {
                studyGroupId,
                userId: this.hashUserId(userId),
                error: error.message
            });
            return false;
        }
    }

    /**
     * Leave study group
     */
    async leaveStudyGroup(studyGroupId: string, userId: string): Promise<boolean> {
        try {
            // Get study group
            const studyGroupKeys = await this.redis.keys(`study_group:*:${studyGroupId}`);
            if (studyGroupKeys.length === 0) {
                return false;
            }

            const studyGroupData = await this.redis.get(studyGroupKeys[0]);
            if (!studyGroupData) {
                return false;
            }

            const studyGroup: StudyGroup = JSON.parse(studyGroupData);

            // Check if user is a member
            const memberKey = `study_group_members:${studyGroupId}`;
            const isMember = await this.redis.sismember(memberKey, userId);
            if (!isMember) {
                return false;
            }

            // Remove user from study group
            await this.redis.srem(memberKey, userId);

            // Update member count
            studyGroup.currentMembers--;
            studyGroup.updatedAt = new Date();
            await this.redis.setex(
                studyGroupKeys[0],
                86400 * 90, // 90 days
                JSON.stringify(studyGroup)
            );

            // Update metrics
            metrics.incrementCounter('study_group_leaves_total', {
                studyGroupId,
                universityId: studyGroup.universityId
            });

            logger.info('User left study group', {
                studyGroupId,
                userId: this.hashUserId(userId),
                universityId: studyGroup.universityId
            });

            return true;

        } catch (error) {
            logger.error('Error leaving study group', {
                studyGroupId,
                userId: this.hashUserId(userId),
                error: error.message
            });
            return false;
        }
    }

    /**
     * Get university network metrics
     */
    async getNetworkMetrics(): Promise<UniversityNetworkMetrics> {
        try {
            const metrics: UniversityNetworkMetrics = {
                totalUniversities: 0,
                totalDepartments: 0,
                totalStudents: 0,
                totalFaculty: 0,
                totalEvents: 0,
                totalStudyGroups: 0,
                totalClubs: 0,
                activeAnnouncements: 0,
                crossUniversityConnections: 0,
                engagementRate: 0
            };

            // Count universities
            const universityKeys = await this.redis.keys('university:*');
            metrics.totalUniversities = universityKeys.length;

            // Count departments
            const departmentKeys = await this.redis.keys('department:*');
            metrics.totalDepartments = departmentKeys.length;

            // Count events
            const eventKeys = await this.redis.keys('campus_event:*');
            metrics.totalEvents = eventKeys.length;

            // Count study groups
            const studyGroupKeys = await this.redis.keys('study_group:*');
            metrics.totalStudyGroups = studyGroupKeys.length;

            // Count clubs
            const clubKeys = await this.redis.keys('club:*');
            metrics.totalClubs = clubKeys.length;

            // Count active announcements
            const announcementKeys = await this.redis.keys('announcement:*');
            let activeAnnouncements = 0;
            
            for (const key of announcementKeys) {
                const data = await this.redis.get(key);
                if (data) {
                    const announcement: UniversityAnnouncement = JSON.parse(data);
                    if (announcement.isActive) {
                        activeAnnouncements++;
                    }
                }
            }
            metrics.activeAnnouncements = activeAnnouncements;

            // Calculate engagement rate (simplified)
            const totalInteractions = metrics.totalEvents + metrics.totalStudyGroups + metrics.totalClubs;
            const totalUsers = metrics.totalStudents + metrics.totalFaculty;
            metrics.engagementRate = totalUsers > 0 ? (totalInteractions / totalUsers) * 100 : 0;

            return metrics;

        } catch (error) {
            logger.error('Error getting network metrics', {
                error: error.message
            });
            return {
                totalUniversities: 0,
                totalDepartments: 0,
                totalStudents: 0,
                totalFaculty: 0,
                totalEvents: 0,
                totalStudyGroups: 0,
                totalClubs: 0,
                activeAnnouncements: 0,
                crossUniversityConnections: 0,
                engagementRate: 0
            };
        }
    }

    /**
     * Search universities
     */
    async searchUniversities(query: string, options: {
        limit?: number;
        country?: string;
        type?: string;
    } = {}): Promise<University[]> {
        try {
            const universities: University[] = [];
            const universityKeys = await this.redis.keys('university:*');
            
            for (const key of universityKeys) {
                const data = await this.redis.get(key);
                if (data) {
                    const university: University = JSON.parse(data);
                    
                    // Apply search query
                    const searchText = `${university.name} ${university.city} ${university.country}`.toLowerCase();
                    if (!searchText.includes(query.toLowerCase())) {
                        continue;
                    }
                    
                    // Apply filters
                    if (options.country && university.country !== options.country) {
                        continue;
                    }
                    if (options.type && university.type !== options.type) {
                        continue;
                    }
                    
                    universities.push(university);
                }
            }

            // Sort by relevance (name match first)
            universities.sort((a, b) => {
                const aMatch = a.name.toLowerCase().includes(query.toLowerCase());
                const bMatch = b.name.toLowerCase().includes(query.toLowerCase());
                
                if (aMatch && !bMatch) return -1;
                if (!aMatch && bMatch) return 1;
                
                return a.name.localeCompare(b.name);
            });

            // Apply limit
            const limit = options.limit || 20;
            return universities.slice(0, limit);

        } catch (error) {
            logger.error('Error searching universities', {
                query,
                error: error.message
            });
            return [];
        }
    }

    /**
     * Generate unique event ID
     */
    private generateEventId(): string {
        return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Generate unique study group ID
     */
    private generateStudyGroupId(): string {
        return `sg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Generate unique announcement ID
     */
    private generateAnnouncementId(): string {
        return `ann_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
