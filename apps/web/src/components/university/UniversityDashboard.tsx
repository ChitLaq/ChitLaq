// University Dashboard Component
// Author: ChitLaq Development Team
// Date: 2024-01-15

import React, { useState, useEffect } from 'react';
import { 
    Calendar, 
    Users, 
    BookOpen, 
    MapPin, 
    Clock, 
    TrendingUp,
    Bell,
    Search,
    Filter,
    Plus,
    Star,
    Heart,
    Share2,
    MoreHorizontal
} from 'lucide-react';

interface University {
    id: string;
    name: string;
    domain: string;
    country: string;
    city: string;
    type: string;
    size: string;
    established: number;
    website: string;
    logo?: string;
    description?: string;
    features: {
        departments: boolean;
        academicCalendar: boolean;
        campusEvents: boolean;
        studyGroups: boolean;
        announcements: boolean;
        clubs: boolean;
        alumni: boolean;
        crossUniversity: boolean;
    };
}

interface Department {
    id: string;
    name: string;
    code: string;
    description?: string;
    faculty: string;
    studentCount?: number;
    facultyCount?: number;
    programs: Array<{
        id: string;
        name: string;
        code: string;
        level: string;
        duration: number;
        credits: number;
    }>;
}

interface CampusEvent {
    id: string;
    title: string;
    description: string;
    type: string;
    category: string;
    startDate: Date;
    endDate: Date;
    location: string;
    organizer: string;
    currentAttendees: number;
    maxAttendees?: number;
    isPublic: boolean;
    requiresRegistration: boolean;
    tags: string[];
    imageUrl?: string;
}

interface UniversityAnnouncement {
    id: string;
    title: string;
    content: string;
    type: string;
    priority: string;
    targetAudience: string;
    publishedAt: Date;
    expiresAt?: Date;
    isActive: boolean;
    authorName: string;
}

interface StudyGroup {
    id: string;
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
}

interface UniversityClub {
    id: string;
    name: string;
    description: string;
    category: string;
    type: string;
    established: number;
    president: string;
    email?: string;
    website?: string;
    meetingSchedule?: string;
    meetingLocation?: string;
    membershipFee?: number;
    maxMembers?: number;
    currentMembers: number;
    isActive: boolean;
    tags: string[];
}

interface UniversityStats {
    totalDepartments: number;
    totalPrograms: number;
    totalStudents: number;
    totalFaculty: number;
    totalEvents: number;
    totalStudyGroups: number;
    totalClubs: number;
    activeAnnouncements: number;
    crossUniversityConnections: number;
    engagementRate: number;
}

interface UniversityDashboardProps {
    universityId: string;
    userId: string;
    userRole: 'student' | 'faculty' | 'staff' | 'admin';
}

export const UniversityDashboard: React.FC<UniversityDashboardProps> = ({
    universityId,
    userId,
    userRole
}) => {
    const [university, setUniversity] = useState<University | null>(null);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [events, setEvents] = useState<CampusEvent[]>([]);
    const [announcements, setAnnouncements] = useState<UniversityAnnouncement[]>([]);
    const [studyGroups, setStudyGroups] = useState<StudyGroup[]>([]);
    const [clubs, setClubs] = useState<UniversityClub[]>([]);
    const [stats, setStats] = useState<UniversityStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'departments' | 'events' | 'announcements' | 'study-groups' | 'clubs'>('overview');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<string>('all');

    useEffect(() => {
        loadUniversityData();
    }, [universityId]);

    const loadUniversityData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Load university information
            const universityResponse = await fetch(`/api/universities/${universityId}`);
            if (!universityResponse.ok) {
                throw new Error('Failed to load university data');
            }
            const universityData = await universityResponse.json();
            setUniversity(universityData);

            // Load departments
            const departmentsResponse = await fetch(`/api/universities/${universityId}/departments`);
            if (departmentsResponse.ok) {
                const departmentsData = await departmentsResponse.json();
                setDepartments(departmentsData);
            }

            // Load events
            const eventsResponse = await fetch(`/api/universities/${universityId}/events`);
            if (eventsResponse.ok) {
                const eventsData = await eventsResponse.json();
                setEvents(eventsData);
            }

            // Load announcements
            const announcementsResponse = await fetch(`/api/universities/${universityId}/announcements`);
            if (announcementsResponse.ok) {
                const announcementsData = await announcementsResponse.json();
                setAnnouncements(announcementsData);
            }

            // Load study groups
            const studyGroupsResponse = await fetch(`/api/universities/${universityId}/study-groups`);
            if (studyGroupsResponse.ok) {
                const studyGroupsData = await studyGroupsResponse.json();
                setStudyGroups(studyGroupsData);
            }

            // Load clubs
            const clubsResponse = await fetch(`/api/universities/${universityId}/clubs`);
            if (clubsResponse.ok) {
                const clubsData = await clubsResponse.json();
                setClubs(clubsData);
            }

            // Load stats
            const statsResponse = await fetch(`/api/universities/${universityId}/stats`);
            if (statsResponse.ok) {
                const statsData = await statsResponse.json();
                setStats(statsData);
            }

        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (query: string) => {
        setSearchQuery(query);
    };

    const handleFilterChange = (type: string) => {
        setFilterType(type);
    };

    const handleJoinStudyGroup = async (studyGroupId: string) => {
        try {
            const response = await fetch(`/api/study-groups/${studyGroupId}/join`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId }),
            });

            if (response.ok) {
                // Refresh study groups
                loadUniversityData();
            }
        } catch (err) {
            console.error('Error joining study group:', err);
        }
    };

    const handleJoinClub = async (clubId: string) => {
        try {
            const response = await fetch(`/api/clubs/${clubId}/join`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId }),
            });

            if (response.ok) {
                // Refresh clubs
                loadUniversityData();
            }
        } catch (err) {
            console.error('Error joining club:', err);
        }
    };

    const handleRegisterForEvent = async (eventId: string) => {
        try {
            const response = await fetch(`/api/events/${eventId}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId }),
            });

            if (response.ok) {
                // Refresh events
                loadUniversityData();
            }
        } catch (err) {
            console.error('Error registering for event:', err);
        }
    };

    if (loading) {
        return (
            <div className="university-dashboard-loading">
                <div className="loading-spinner"></div>
                <p>Loading university data...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="university-dashboard-error">
                <div className="error-icon">⚠️</div>
                <h3>Error Loading University Data</h3>
                <p>{error}</p>
                <button onClick={loadUniversityData} className="retry-button">
                    Try Again
                </button>
            </div>
        );
    }

    if (!university) {
        return (
            <div className="university-dashboard-not-found">
                <div className="not-found-icon">🏫</div>
                <h3>University Not Found</h3>
                <p>The requested university could not be found.</p>
            </div>
        );
    }

    return (
        <div className="university-dashboard">
            {/* Header */}
            <div className="university-header">
                <div className="university-info">
                    {university.logo && (
                        <img 
                            src={university.logo} 
                            alt={`${university.name} logo`}
                            className="university-logo"
                        />
                    )}
                    <div className="university-details">
                        <h1 className="university-name">{university.name}</h1>
                        <p className="university-location">
                            <MapPin size={16} />
                            {university.city}, {university.country}
                        </p>
                        <p className="university-type">
                            {university.type} • {university.size} • Established {university.established}
                        </p>
                        {university.description && (
                            <p className="university-description">{university.description}</p>
                        )}
                    </div>
                </div>
                <div className="university-actions">
                    <button className="action-button">
                        <Bell size={16} />
                        Notifications
                    </button>
                    <button className="action-button">
                        <Share2 size={16} />
                        Share
                    </button>
                    {userRole === 'admin' && (
                        <button className="action-button primary">
                            <Plus size={16} />
                            Manage
                        </button>
                    )}
                </div>
            </div>

            {/* Stats Overview */}
            {stats && (
                <div className="stats-overview">
                    <div className="stat-card">
                        <div className="stat-icon">
                            <BookOpen size={24} />
                        </div>
                        <div className="stat-content">
                            <h3>{stats.totalDepartments}</h3>
                            <p>Departments</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">
                            <Users size={24} />
                        </div>
                        <div className="stat-content">
                            <h3>{stats.totalStudents.toLocaleString()}</h3>
                            <p>Students</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">
                            <Calendar size={24} />
                        </div>
                        <div className="stat-content">
                            <h3>{stats.totalEvents}</h3>
                            <p>Events</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">
                            <TrendingUp size={24} />
                        </div>
                        <div className="stat-content">
                            <h3>{stats.engagementRate.toFixed(1)}%</h3>
                            <p>Engagement</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Navigation Tabs */}
            <div className="dashboard-tabs">
                <button 
                    className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
                    onClick={() => setActiveTab('overview')}
                >
                    Overview
                </button>
                <button 
                    className={`tab-button ${activeTab === 'departments' ? 'active' : ''}`}
                    onClick={() => setActiveTab('departments')}
                >
                    Departments
                </button>
                <button 
                    className={`tab-button ${activeTab === 'events' ? 'active' : ''}`}
                    onClick={() => setActiveTab('events')}
                >
                    Events
                </button>
                <button 
                    className={`tab-button ${activeTab === 'announcements' ? 'active' : ''}`}
                    onClick={() => setActiveTab('announcements')}
                >
                    Announcements
                </button>
                <button 
                    className={`tab-button ${activeTab === 'study-groups' ? 'active' : ''}`}
                    onClick={() => setActiveTab('study-groups')}
                >
                    Study Groups
                </button>
                <button 
                    className={`tab-button ${activeTab === 'clubs' ? 'active' : ''}`}
                    onClick={() => setActiveTab('clubs')}
                >
                    Clubs
                </button>
            </div>

            {/* Search and Filter */}
            <div className="search-filter-bar">
                <div className="search-input">
                    <Search size={16} />
                    <input
                        type="text"
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                    />
                </div>
                <div className="filter-dropdown">
                    <Filter size={16} />
                    <select 
                        value={filterType} 
                        onChange={(e) => handleFilterChange(e.target.value)}
                    >
                        <option value="all">All</option>
                        <option value="recent">Recent</option>
                        <option value="popular">Popular</option>
                        <option value="upcoming">Upcoming</option>
                    </select>
                </div>
            </div>

            {/* Tab Content */}
            <div className="tab-content">
                {activeTab === 'overview' && (
                    <div className="overview-content">
                        {/* Recent Announcements */}
                        <div className="content-section">
                            <h2>Recent Announcements</h2>
                            <div className="announcements-list">
                                {announcements.slice(0, 3).map((announcement) => (
                                    <div key={announcement.id} className="announcement-card">
                                        <div className="announcement-header">
                                            <h3>{announcement.title}</h3>
                                            <span className={`priority-badge ${announcement.priority}`}>
                                                {announcement.priority}
                                            </span>
                                        </div>
                                        <p className="announcement-content">
                                            {announcement.content.substring(0, 150)}...
                                        </p>
                                        <div className="announcement-meta">
                                            <span>By {announcement.authorName}</span>
                                            <span>•</span>
                                            <span>{new Date(announcement.publishedAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Upcoming Events */}
                        <div className="content-section">
                            <h2>Upcoming Events</h2>
                            <div className="events-list">
                                {events.slice(0, 3).map((event) => (
                                    <div key={event.id} className="event-card">
                                        <div className="event-image">
                                            {event.imageUrl ? (
                                                <img src={event.imageUrl} alt={event.title} />
                                            ) : (
                                                <div className="event-placeholder">
                                                    <Calendar size={24} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="event-content">
                                            <h3>{event.title}</h3>
                                            <p className="event-description">
                                                {event.description.substring(0, 100)}...
                                            </p>
                                            <div className="event-meta">
                                                <span>
                                                    <Clock size={14} />
                                                    {new Date(event.startDate).toLocaleDateString()}
                                                </span>
                                                <span>
                                                    <MapPin size={14} />
                                                    {event.location}
                                                </span>
                                                <span>
                                                    <Users size={14} />
                                                    {event.currentAttendees} attendees
                                                </span>
                                            </div>
                                            <div className="event-actions">
                                                <button 
                                                    className="action-button"
                                                    onClick={() => handleRegisterForEvent(event.id)}
                                                >
                                                    Register
                                                </button>
                                                <button className="action-button">
                                                    <Heart size={16} />
                                                </button>
                                                <button className="action-button">
                                                    <Share2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'departments' && (
                    <div className="departments-content">
                        <div className="departments-grid">
                            {departments.map((department) => (
                                <div key={department.id} className="department-card">
                                    <div className="department-header">
                                        <h3>{department.name}</h3>
                                        <span className="department-code">{department.code}</span>
                                    </div>
                                    <p className="department-faculty">{department.faculty}</p>
                                    {department.description && (
                                        <p className="department-description">
                                            {department.description.substring(0, 100)}...
                                        </p>
                                    )}
                                    <div className="department-stats">
                                        <span>
                                            <Users size={14} />
                                            {department.studentCount || 0} students
                                        </span>
                                        <span>
                                            <BookOpen size={14} />
                                            {department.programs.length} programs
                                        </span>
                                    </div>
                                    <div className="department-actions">
                                        <button className="action-button">View Details</button>
                                        <button className="action-button">Follow</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'events' && (
                    <div className="events-content">
                        <div className="events-grid">
                            {events.map((event) => (
                                <div key={event.id} className="event-card-large">
                                    <div className="event-image">
                                        {event.imageUrl ? (
                                            <img src={event.imageUrl} alt={event.title} />
                                        ) : (
                                            <div className="event-placeholder">
                                                <Calendar size={32} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="event-content">
                                        <div className="event-header">
                                            <h3>{event.title}</h3>
                                            <span className={`event-type-badge ${event.type}`}>
                                                {event.type}
                                            </span>
                                        </div>
                                        <p className="event-description">{event.description}</p>
                                        <div className="event-meta">
                                            <span>
                                                <Clock size={14} />
                                                {new Date(event.startDate).toLocaleDateString()}
                                            </span>
                                            <span>
                                                <MapPin size={14} />
                                                {event.location}
                                            </span>
                                            <span>
                                                <Users size={14} />
                                                {event.currentAttendees} attendees
                                            </span>
                                        </div>
                                        <div className="event-tags">
                                            {event.tags.map((tag) => (
                                                <span key={tag} className="tag">{tag}</span>
                                            ))}
                                        </div>
                                        <div className="event-actions">
                                            <button 
                                                className="action-button primary"
                                                onClick={() => handleRegisterForEvent(event.id)}
                                            >
                                                Register
                                            </button>
                                            <button className="action-button">
                                                <Heart size={16} />
                                            </button>
                                            <button className="action-button">
                                                <Share2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'announcements' && (
                    <div className="announcements-content">
                        <div className="announcements-list">
                            {announcements.map((announcement) => (
                                <div key={announcement.id} className="announcement-card-large">
                                    <div className="announcement-header">
                                        <h3>{announcement.title}</h3>
                                        <span className={`priority-badge ${announcement.priority}`}>
                                            {announcement.priority}
                                        </span>
                                    </div>
                                    <p className="announcement-content">{announcement.content}</p>
                                    <div className="announcement-meta">
                                        <span>By {announcement.authorName}</span>
                                        <span>•</span>
                                        <span>{new Date(announcement.publishedAt).toLocaleDateString()}</span>
                                        <span>•</span>
                                        <span className="announcement-type">{announcement.type}</span>
                                    </div>
                                    <div className="announcement-actions">
                                        <button className="action-button">Read More</button>
                                        <button className="action-button">
                                            <Share2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'study-groups' && (
                    <div className="study-groups-content">
                        <div className="study-groups-grid">
                            {studyGroups.map((studyGroup) => (
                                <div key={studyGroup.id} className="study-group-card">
                                    <div className="study-group-header">
                                        <h3>{studyGroup.name}</h3>
                                        <span className="study-group-subject">{studyGroup.subject}</span>
                                    </div>
                                    <p className="study-group-description">{studyGroup.description}</p>
                                    <div className="study-group-meta">
                                        <span>
                                            <BookOpen size={14} />
                                            {studyGroup.courseCode || 'General'}
                                        </span>
                                        <span>
                                            <Users size={14} />
                                            {studyGroup.currentMembers}/{studyGroup.maxMembers} members
                                        </span>
                                        <span>
                                            <Clock size={14} />
                                            {studyGroup.meetingSchedule}
                                        </span>
                                    </div>
                                    <div className="study-group-tags">
                                        {studyGroup.tags.map((tag) => (
                                            <span key={tag} className="tag">{tag}</span>
                                        ))}
                                    </div>
                                    <div className="study-group-actions">
                                        <button 
                                            className="action-button primary"
                                            onClick={() => handleJoinStudyGroup(studyGroup.id)}
                                        >
                                            Join Group
                                        </button>
                                        <button className="action-button">View Details</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'clubs' && (
                    <div className="clubs-content">
                        <div className="clubs-grid">
                            {clubs.map((club) => (
                                <div key={club.id} className="club-card">
                                    <div className="club-header">
                                        <h3>{club.name}</h3>
                                        <span className={`club-type-badge ${club.type}`}>
                                            {club.type}
                                        </span>
                                    </div>
                                    <p className="club-description">{club.description}</p>
                                    <div className="club-meta">
                                        <span>
                                            <Users size={14} />
                                            {club.currentMembers} members
                                        </span>
                                        <span>
                                            <Calendar size={14} />
                                            Established {club.established}
                                        </span>
                                        {club.membershipFee && (
                                            <span>
                                                <Star size={14} />
                                                ${club.membershipFee} fee
                                            </span>
                                        )}
                                    </div>
                                    <div className="club-tags">
                                        {club.tags.map((tag) => (
                                            <span key={tag} className="tag">{tag}</span>
                                        ))}
                                    </div>
                                    <div className="club-actions">
                                        <button 
                                            className="action-button primary"
                                            onClick={() => handleJoinClub(club.id)}
                                        >
                                            Join Club
                                        </button>
                                        <button className="action-button">View Details</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UniversityDashboard;
