// Department Directory Component
// Author: ChitLaq Development Team
// Date: 2024-01-15

import React, { useState, useEffect } from 'react';
import { 
    Search, 
    Filter, 
    BookOpen, 
    Users, 
    GraduationCap, 
    MapPin,
    Phone,
    Mail,
    Globe,
    Star,
    TrendingUp,
    Calendar,
    Award,
    Building
} from 'lucide-react';

interface Department {
    id: string;
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

interface AcademicProgram {
    id: string;
    name: string;
    code: string;
    level: 'undergraduate' | 'graduate' | 'doctoral' | 'certificate';
    duration: number;
    credits: number;
    description?: string;
    requirements?: string[];
    careerPaths?: string[];
}

interface FacultyMember {
    id: string;
    name: string;
    position: string;
    email?: string;
    researchAreas?: string[];
    publications?: number;
    hIndex?: number;
    profileImage?: string;
}

interface DepartmentStats {
    totalDepartments: number;
    totalPrograms: number;
    totalStudents: number;
    totalFaculty: number;
    averageProgramsPerDepartment: number;
    topDepartments: Array<{
        department: Department;
        studentCount: number;
        programCount: number;
    }>;
}

interface DepartmentDirectoryProps {
    universityId: string;
    userId: string;
    userRole: 'student' | 'faculty' | 'staff' | 'admin';
}

export const DepartmentDirectory: React.FC<DepartmentDirectoryProps> = ({
    universityId,
    userId,
    userRole
}) => {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [faculty, setFaculty] = useState<FacultyMember[]>([]);
    const [stats, setStats] = useState<DepartmentStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterFaculty, setFilterFaculty] = useState<string>('all');
    const [filterLevel, setFilterLevel] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'name' | 'studentCount' | 'facultyCount' | 'established'>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    useEffect(() => {
        loadDepartmentData();
    }, [universityId]);

    const loadDepartmentData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Load departments
            const departmentsResponse = await fetch(`/api/universities/${universityId}/departments`);
            if (!departmentsResponse.ok) {
                throw new Error('Failed to load departments');
            }
            const departmentsData = await departmentsResponse.json();
            setDepartments(departmentsData);

            // Load faculty
            const facultyResponse = await fetch(`/api/universities/${universityId}/faculty`);
            if (facultyResponse.ok) {
                const facultyData = await facultyResponse.json();
                setFaculty(facultyData);
            }

            // Load stats
            const statsResponse = await fetch(`/api/universities/${universityId}/department-stats`);
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

    const handleFilterChange = (type: string, value: string) => {
        if (type === 'faculty') {
            setFilterFaculty(value);
        } else if (type === 'level') {
            setFilterLevel(value);
        }
    };

    const handleSortChange = (field: string) => {
        if (field === sortBy) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field as any);
            setSortOrder('asc');
        }
    };

    const handleDepartmentSelect = (department: Department) => {
        setSelectedDepartment(department);
    };

    const handleFollowDepartment = async (departmentId: string) => {
        try {
            const response = await fetch(`/api/departments/${departmentId}/follow`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId }),
            });

            if (response.ok) {
                // Refresh departments
                loadDepartmentData();
            }
        } catch (err) {
            console.error('Error following department:', err);
        }
    };

    const filteredDepartments = departments.filter(dept => {
        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            if (!dept.name.toLowerCase().includes(query) &&
                !dept.code.toLowerCase().includes(query) &&
                !dept.faculty.toLowerCase().includes(query) &&
                !dept.description?.toLowerCase().includes(query)) {
                return false;
            }
        }

        // Faculty filter
        if (filterFaculty !== 'all' && dept.faculty !== filterFaculty) {
            return false;
        }

        // Level filter
        if (filterLevel !== 'all') {
            const hasProgramLevel = dept.programs.some(program => program.level === filterLevel);
            if (!hasProgramLevel) {
                return false;
            }
        }

        return true;
    });

    const sortedDepartments = [...filteredDepartments].sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortBy) {
            case 'name':
                aValue = a.name;
                bValue = b.name;
                break;
            case 'studentCount':
                aValue = a.studentCount || 0;
                bValue = b.studentCount || 0;
                break;
            case 'facultyCount':
                aValue = a.facultyCount || 0;
                bValue = b.facultyCount || 0;
                break;
            case 'established':
                aValue = a.established || 0;
                bValue = b.established || 0;
                break;
            default:
                aValue = a.name;
                bValue = b.name;
        }

        if (sortOrder === 'desc') {
            return bValue > aValue ? 1 : bValue < aValue ? -1 : 0;
        } else {
            return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        }
    });

    const uniqueFaculties = Array.from(new Set(departments.map(dept => dept.faculty)));

    if (loading) {
        return (
            <div className="department-directory-loading">
                <div className="loading-spinner"></div>
                <p>Loading departments...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="department-directory-error">
                <div className="error-icon">⚠️</div>
                <h3>Error Loading Departments</h3>
                <p>{error}</p>
                <button onClick={loadDepartmentData} className="retry-button">
                    Try Again
                </button>
            </div>
        );
    }

    return (
        <div className="department-directory">
            {/* Header */}
            <div className="directory-header">
                <div className="header-content">
                    <h1>Department Directory</h1>
                    <p>Explore academic departments and programs</p>
                </div>
                <div className="header-actions">
                    <button 
                        className={`view-toggle ${viewMode === 'grid' ? 'active' : ''}`}
                        onClick={() => setViewMode('grid')}
                    >
                        Grid
                    </button>
                    <button 
                        className={`view-toggle ${viewMode === 'list' ? 'active' : ''}`}
                        onClick={() => setViewMode('list')}
                    >
                        List
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            {stats && (
                <div className="stats-overview">
                    <div className="stat-card">
                        <div className="stat-icon">
                            <Building size={24} />
                        </div>
                        <div className="stat-content">
                            <h3>{stats.totalDepartments}</h3>
                            <p>Departments</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">
                            <BookOpen size={24} />
                        </div>
                        <div className="stat-content">
                            <h3>{stats.totalPrograms}</h3>
                            <p>Programs</p>
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
                            <GraduationCap size={24} />
                        </div>
                        <div className="stat-content">
                            <h3>{stats.totalFaculty}</h3>
                            <p>Faculty</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Search and Filters */}
            <div className="search-filters">
                <div className="search-input">
                    <Search size={16} />
                    <input
                        type="text"
                        placeholder="Search departments..."
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                    />
                </div>
                <div className="filters">
                    <div className="filter-group">
                        <Filter size={16} />
                        <select 
                            value={filterFaculty} 
                            onChange={(e) => handleFilterChange('faculty', e.target.value)}
                        >
                            <option value="all">All Faculties</option>
                            {uniqueFaculties.map(faculty => (
                                <option key={faculty} value={faculty}>{faculty}</option>
                            ))}
                        </select>
                    </div>
                    <div className="filter-group">
                        <select 
                            value={filterLevel} 
                            onChange={(e) => handleFilterChange('level', e.target.value)}
                        >
                            <option value="all">All Levels</option>
                            <option value="undergraduate">Undergraduate</option>
                            <option value="graduate">Graduate</option>
                            <option value="doctoral">Doctoral</option>
                            <option value="certificate">Certificate</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Sort Options */}
            <div className="sort-options">
                <span>Sort by:</span>
                <button 
                    className={`sort-button ${sortBy === 'name' ? 'active' : ''}`}
                    onClick={() => handleSortChange('name')}
                >
                    Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                </button>
                <button 
                    className={`sort-button ${sortBy === 'studentCount' ? 'active' : ''}`}
                    onClick={() => handleSortChange('studentCount')}
                >
                    Students {sortBy === 'studentCount' && (sortOrder === 'asc' ? '↑' : '↓')}
                </button>
                <button 
                    className={`sort-button ${sortBy === 'facultyCount' ? 'active' : ''}`}
                    onClick={() => handleSortChange('facultyCount')}
                >
                    Faculty {sortBy === 'facultyCount' && (sortOrder === 'asc' ? '↑' : '↓')}
                </button>
                <button 
                    className={`sort-button ${sortBy === 'established' ? 'active' : ''}`}
                    onClick={() => handleSortChange('established')}
                >
                    Established {sortBy === 'established' && (sortOrder === 'asc' ? '↑' : '↓')}
                </button>
            </div>

            {/* Results Count */}
            <div className="results-info">
                <p>Showing {sortedDepartments.length} of {departments.length} departments</p>
            </div>

            {/* Departments List/Grid */}
            <div className={`departments-container ${viewMode}`}>
                {sortedDepartments.map((department) => (
                    <div key={department.id} className="department-card">
                        <div className="department-header">
                            <h3>{department.name}</h3>
                            <span className="department-code">{department.code}</span>
                        </div>
                        <p className="department-faculty">{department.faculty}</p>
                        {department.description && (
                            <p className="department-description">
                                {department.description.substring(0, 150)}...
                            </p>
                        )}
                        <div className="department-stats">
                            <div className="stat">
                                <Users size={14} />
                                <span>{department.studentCount || 0} students</span>
                            </div>
                            <div className="stat">
                                <GraduationCap size={14} />
                                <span>{department.facultyCount || 0} faculty</span>
                            </div>
                            <div className="stat">
                                <BookOpen size={14} />
                                <span>{department.programs.length} programs</span>
                            </div>
                            {department.established && (
                                <div className="stat">
                                    <Calendar size={14} />
                                    <span>Est. {department.established}</span>
                                </div>
                            )}
                        </div>
                        <div className="department-programs">
                            <h4>Programs:</h4>
                            <div className="programs-list">
                                {department.programs.slice(0, 3).map((program) => (
                                    <span key={program.id} className="program-tag">
                                        {program.name} ({program.level})
                                    </span>
                                ))}
                                {department.programs.length > 3 && (
                                    <span className="more-programs">
                                        +{department.programs.length - 3} more
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="department-actions">
                            <button 
                                className="action-button primary"
                                onClick={() => handleDepartmentSelect(department)}
                            >
                                View Details
                            </button>
                            <button 
                                className="action-button"
                                onClick={() => handleFollowDepartment(department.id)}
                            >
                                Follow
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Department Detail Modal */}
            {selectedDepartment && (
                <div className="department-modal-overlay" onClick={() => setSelectedDepartment(null)}>
                    <div className="department-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{selectedDepartment.name}</h2>
                            <button 
                                className="close-button"
                                onClick={() => setSelectedDepartment(null)}
                            >
                                ×
                            </button>
                        </div>
                        <div className="modal-content">
                            <div className="department-info">
                                <div className="info-section">
                                    <h3>Basic Information</h3>
                                    <div className="info-grid">
                                        <div className="info-item">
                                            <strong>Code:</strong> {selectedDepartment.code}
                                        </div>
                                        <div className="info-item">
                                            <strong>Faculty:</strong> {selectedDepartment.faculty}
                                        </div>
                                        {selectedDepartment.headOfDepartment && (
                                            <div className="info-item">
                                                <strong>Head:</strong> {selectedDepartment.headOfDepartment}
                                            </div>
                                        )}
                                        {selectedDepartment.established && (
                                            <div className="info-item">
                                                <strong>Established:</strong> {selectedDepartment.established}
                                            </div>
                                        )}
                                        {selectedDepartment.location && (
                                            <div className="info-item">
                                                <strong>Location:</strong> {selectedDepartment.location}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {selectedDepartment.description && (
                                    <div className="info-section">
                                        <h3>Description</h3>
                                        <p>{selectedDepartment.description}</p>
                                    </div>
                                )}

                                <div className="info-section">
                                    <h3>Statistics</h3>
                                    <div className="stats-grid">
                                        <div className="stat-item">
                                            <Users size={20} />
                                            <div>
                                                <strong>{selectedDepartment.studentCount || 0}</strong>
                                                <span>Students</span>
                                            </div>
                                        </div>
                                        <div className="stat-item">
                                            <GraduationCap size={20} />
                                            <div>
                                                <strong>{selectedDepartment.facultyCount || 0}</strong>
                                                <span>Faculty</span>
                                            </div>
                                        </div>
                                        <div className="stat-item">
                                            <BookOpen size={20} />
                                            <div>
                                                <strong>{selectedDepartment.programs.length}</strong>
                                                <span>Programs</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="info-section">
                                    <h3>Academic Programs</h3>
                                    <div className="programs-grid">
                                        {selectedDepartment.programs.map((program) => (
                                            <div key={program.id} className="program-card">
                                                <div className="program-header">
                                                    <h4>{program.name}</h4>
                                                    <span className={`program-level ${program.level}`}>
                                                        {program.level}
                                                    </span>
                                                </div>
                                                <div className="program-details">
                                                    <div className="program-meta">
                                                        <span>Code: {program.code}</span>
                                                        <span>Duration: {program.duration} years</span>
                                                        <span>Credits: {program.credits}</span>
                                                    </div>
                                                    {program.description && (
                                                        <p className="program-description">
                                                            {program.description}
                                                        </p>
                                                    )}
                                                    {program.careerPaths && program.careerPaths.length > 0 && (
                                                        <div className="career-paths">
                                                            <strong>Career Paths:</strong>
                                                            <div className="career-tags">
                                                                {program.careerPaths.map((path, index) => (
                                                                    <span key={index} className="career-tag">
                                                                        {path}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="info-section">
                                    <h3>Contact Information</h3>
                                    <div className="contact-info">
                                        {selectedDepartment.email && (
                                            <div className="contact-item">
                                                <Mail size={16} />
                                                <a href={`mailto:${selectedDepartment.email}`}>
                                                    {selectedDepartment.email}
                                                </a>
                                            </div>
                                        )}
                                        {selectedDepartment.website && (
                                            <div className="contact-item">
                                                <Globe size={16} />
                                                <a href={selectedDepartment.website} target="_blank" rel="noopener noreferrer">
                                                    {selectedDepartment.website}
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button 
                                className="action-button primary"
                                onClick={() => handleFollowDepartment(selectedDepartment.id)}
                            >
                                Follow Department
                            </button>
                            <button 
                                className="action-button"
                                onClick={() => setSelectedDepartment(null)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DepartmentDirectory;
