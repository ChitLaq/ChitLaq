// Department Discovery Feature
// Author: ChitLaq Development Team
// Date: 2024-01-15

import { logger } from '../utils/logger';
import { metrics } from '../utils/metrics';
import { UniversityNetworkService, Department, AcademicProgram } from '../services/UniversityNetworkService';

export interface DepartmentSearchOptions {
    query?: string;
    faculty?: string;
    universityId?: string;
    limit?: number;
    offset?: number;
    sortBy?: 'name' | 'studentCount' | 'facultyCount' | 'established';
    sortOrder?: 'asc' | 'desc';
}

export interface DepartmentRecommendation {
    department: Department;
    score: number;
    reasons: string[];
    mutualConnections?: number;
    sharedInterests?: string[];
}

export interface DepartmentStats {
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

export interface FacultyInfo {
    id: string;
    name: string;
    departments: string[];
    position: string;
    email?: string;
    researchAreas?: string[];
    publications?: number;
    hIndex?: number;
}

export class DepartmentDiscovery {
    private universityService: UniversityNetworkService;
    private config: {
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
                mutualConnections: number;
                sharedInterests: number;
                universityMatch: number;
                programRelevance: number;
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
            search: {
                minQueryLength: 2,
                maxResults: 100,
                fuzzySearchEnabled: true,
                searchFields: ['name', 'code', 'description', 'faculty']
            },
            recommendations: {
                maxRecommendations: 20,
                minScore: 0.1,
                weightFactors: {
                    mutualConnections: 0.3,
                    sharedInterests: 0.25,
                    universityMatch: 0.25,
                    programRelevance: 0.2
                }
            },
            caching: {
                ttl: 3600, // 1 hour
                maxCacheSize: 1000
            }
        };
    }

    /**
     * Search departments across universities
     */
    async searchDepartments(options: DepartmentSearchOptions = {}): Promise<Department[]> {
        try {
            const startTime = Date.now();
            
            // Validate search query
            if (options.query && options.query.length < this.config.search.minQueryLength) {
                return [];
            }

            let departments: Department[] = [];

            if (options.universityId) {
                // Search within specific university
                departments = await this.universityService.getDepartments(options.universityId, {
                    limit: options.limit,
                    offset: options.offset,
                    faculty: options.faculty
                });
            } else {
                // Search across all universities
                departments = await this.searchAllDepartments(options);
            }

            // Apply text search if query provided
            if (options.query) {
                departments = this.filterDepartmentsByQuery(departments, options.query);
            }

            // Sort results
            if (options.sortBy) {
                departments = this.sortDepartments(departments, options.sortBy, options.sortOrder || 'asc');
            }

            // Apply pagination
            const offset = options.offset || 0;
            const limit = options.limit || this.config.search.maxResults;
            departments = departments.slice(offset, offset + limit);

            // Update metrics
            const duration = Date.now() - startTime;
            metrics.recordHistogram('department_search_duration_ms', duration, {
                hasQuery: !!options.query,
                hasFilters: !!(options.faculty || options.universityId),
                resultCount: departments.length
            });

            metrics.incrementCounter('department_searches_total', {
                hasQuery: !!options.query,
                hasFilters: !!(options.faculty || options.universityId)
            });

            logger.info('Department search completed', {
                query: options.query,
                filters: {
                    faculty: options.faculty,
                    universityId: options.universityId
                },
                resultCount: departments.length,
                duration
            });

            return departments;

        } catch (error) {
            logger.error('Error searching departments', {
                options,
                error: error.message
            });
            return [];
        }
    }

    /**
     * Get department recommendations for user
     */
    async getDepartmentRecommendations(
        userId: string,
        userUniversityId: string,
        userInterests: string[],
        userConnections: string[],
        options: {
            limit?: number;
            excludeJoined?: boolean;
            includeCrossUniversity?: boolean;
        } = {}
    ): Promise<DepartmentRecommendation[]> {
        try {
            const startTime = Date.now();
            const limit = options.limit || this.config.recommendations.maxRecommendations;

            // Get user's current departments (if any)
            const userDepartments = await this.getUserDepartments(userId);
            const excludeDepartmentIds = options.excludeJoined ? userDepartments.map(d => d.id) : [];

            // Get all departments
            const allDepartments = await this.searchAllDepartments({});
            
            // Filter departments
            let candidateDepartments = allDepartments.filter(dept => {
                // Exclude already joined departments
                if (excludeDepartmentIds.includes(dept.id)) {
                    return false;
                }

                // Filter by university if not including cross-university
                if (!options.includeCrossUniversity && dept.universityId !== userUniversityId) {
                    return false;
                }

                return true;
            });

            // Calculate recommendation scores
            const recommendations: DepartmentRecommendation[] = [];
            
            for (const department of candidateDepartments) {
                const score = await this.calculateDepartmentScore(
                    department,
                    userInterests,
                    userConnections,
                    userUniversityId
                );

                if (score >= this.config.recommendations.minScore) {
                    const reasons = this.generateRecommendationReasons(
                        department,
                        userInterests,
                        userConnections,
                        userUniversityId
                    );

                    recommendations.push({
                        department,
                        score,
                        reasons,
                        mutualConnections: this.countMutualConnections(department, userConnections),
                        sharedInterests: this.findSharedInterests(department, userInterests)
                    });
                }
            }

            // Sort by score (highest first)
            recommendations.sort((a, b) => b.score - a.score);

            // Apply limit
            const finalRecommendations = recommendations.slice(0, limit);

            // Update metrics
            const duration = Date.now() - startTime;
            metrics.recordHistogram('department_recommendations_duration_ms', duration, {
                userId: this.hashUserId(userId),
                universityId: userUniversityId,
                recommendationCount: finalRecommendations.length
            });

            metrics.incrementCounter('department_recommendations_generated_total', {
                userId: this.hashUserId(userId),
                universityId: userUniversityId
            });

            logger.info('Department recommendations generated', {
                userId: this.hashUserId(userId),
                userUniversityId,
                recommendationCount: finalRecommendations.length,
                duration
            });

            return finalRecommendations;

        } catch (error) {
            logger.error('Error generating department recommendations', {
                userId: this.hashUserId(userId),
                userUniversityId,
                error: error.message
            });
            return [];
        }
    }

    /**
     * Get department statistics
     */
    async getDepartmentStats(universityId?: string): Promise<DepartmentStats> {
        try {
            const departments = universityId 
                ? await this.universityService.getDepartments(universityId)
                : await this.searchAllDepartments({});

            const stats: DepartmentStats = {
                totalDepartments: departments.length,
                totalPrograms: 0,
                totalStudents: 0,
                totalFaculty: 0,
                averageProgramsPerDepartment: 0,
                topDepartments: []
            };

            // Calculate totals
            for (const department of departments) {
                stats.totalPrograms += department.programs.length;
                stats.totalStudents += department.studentCount || 0;
                stats.totalFaculty += department.facultyCount || 0;
            }

            // Calculate average
            if (stats.totalDepartments > 0) {
                stats.averageProgramsPerDepartment = stats.totalPrograms / stats.totalDepartments;
            }

            // Get top departments by student count
            const sortedDepartments = departments
                .filter(d => d.studentCount && d.studentCount > 0)
                .sort((a, b) => (b.studentCount || 0) - (a.studentCount || 0))
                .slice(0, 10);

            stats.topDepartments = sortedDepartments.map(dept => ({
                department: dept,
                studentCount: dept.studentCount || 0,
                programCount: dept.programs.length
            }));

            return stats;

        } catch (error) {
            logger.error('Error getting department stats', {
                universityId,
                error: error.message
            });
            return {
                totalDepartments: 0,
                totalPrograms: 0,
                totalStudents: 0,
                totalFaculty: 0,
                averageProgramsPerDepartment: 0,
                topDepartments: []
            };
        }
    }

    /**
     * Get faculty information for department
     */
    async getDepartmentFaculty(departmentId: string): Promise<FacultyInfo[]> {
        try {
            // This would typically integrate with university systems
            // For now, return mock data structure
            const faculty: FacultyInfo[] = [
                {
                    id: 'faculty_1',
                    name: 'Dr. John Smith',
                    departments: [departmentId],
                    position: 'Professor',
                    email: 'john.smith@university.edu',
                    researchAreas: ['Computer Science', 'Machine Learning'],
                    publications: 45,
                    hIndex: 12
                },
                {
                    id: 'faculty_2',
                    name: 'Dr. Jane Doe',
                    departments: [departmentId],
                    position: 'Associate Professor',
                    email: 'jane.doe@university.edu',
                    researchAreas: ['Data Science', 'Statistics'],
                    publications: 32,
                    hIndex: 8
                }
            ];

            return faculty;

        } catch (error) {
            logger.error('Error getting department faculty', {
                departmentId,
                error: error.message
            });
            return [];
        }
    }

    /**
     * Get academic programs for department
     */
    async getDepartmentPrograms(departmentId: string): Promise<AcademicProgram[]> {
        try {
            const department = await this.universityService.getDepartment(departmentId);
            return department?.programs || [];

        } catch (error) {
            logger.error('Error getting department programs', {
                departmentId,
                error: error.message
            });
            return [];
        }
    }

    /**
     * Search departments across all universities
     */
    private async searchAllDepartments(options: DepartmentSearchOptions): Promise<Department[]> {
        try {
            const allDepartments: Department[] = [];
            const universities = await this.universityService.getAllUniversities();

            for (const university of universities) {
                const departments = await this.universityService.getDepartments(university.id, {
                    limit: 1000, // Get all departments for this university
                    faculty: options.faculty
                });
                allDepartments.push(...departments);
            }

            return allDepartments;

        } catch (error) {
            logger.error('Error searching all departments', {
                error: error.message
            });
            return [];
        }
    }

    /**
     * Filter departments by search query
     */
    private filterDepartmentsByQuery(departments: Department[], query: string): Department[] {
        const queryLower = query.toLowerCase();
        
        return departments.filter(department => {
            // Search in name
            if (department.name.toLowerCase().includes(queryLower)) {
                return true;
            }

            // Search in code
            if (department.code.toLowerCase().includes(queryLower)) {
                return true;
            }

            // Search in description
            if (department.description && department.description.toLowerCase().includes(queryLower)) {
                return true;
            }

            // Search in faculty
            if (department.faculty.toLowerCase().includes(queryLower)) {
                return true;
            }

            // Search in programs
            for (const program of department.programs) {
                if (program.name.toLowerCase().includes(queryLower) ||
                    program.code.toLowerCase().includes(queryLower)) {
                    return true;
                }
            }

            return false;
        });
    }

    /**
     * Sort departments by specified criteria
     */
    private sortDepartments(
        departments: Department[],
        sortBy: string,
        sortOrder: 'asc' | 'desc'
    ): Department[] {
        return departments.sort((a, b) => {
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
    }

    /**
     * Calculate recommendation score for department
     */
    private async calculateDepartmentScore(
        department: Department,
        userInterests: string[],
        userConnections: string[],
        userUniversityId: string
    ): Promise<number> {
        let score = 0;

        // University match score
        if (department.universityId === userUniversityId) {
            score += this.config.recommendations.weightFactors.universityMatch;
        }

        // Interest relevance score
        const sharedInterests = this.findSharedInterests(department, userInterests);
        if (sharedInterests.length > 0) {
            score += (sharedInterests.length / userInterests.length) * 
                    this.config.recommendations.weightFactors.sharedInterests;
        }

        // Mutual connections score
        const mutualConnections = this.countMutualConnections(department, userConnections);
        if (mutualConnections > 0) {
            score += Math.min(mutualConnections / 10, 1) * 
                    this.config.recommendations.weightFactors.mutualConnections;
        }

        // Program relevance score
        const programRelevance = this.calculateProgramRelevance(department, userInterests);
        score += programRelevance * this.config.recommendations.weightFactors.programRelevance;

        return Math.min(score, 1); // Cap at 1.0
    }

    /**
     * Generate recommendation reasons
     */
    private generateRecommendationReasons(
        department: Department,
        userInterests: string[],
        userConnections: string[],
        userUniversityId: string
    ): string[] {
        const reasons: string[] = [];

        // University match
        if (department.universityId === userUniversityId) {
            reasons.push('Same university');
        }

        // Shared interests
        const sharedInterests = this.findSharedInterests(department, userInterests);
        if (sharedInterests.length > 0) {
            reasons.push(`Shared interests: ${sharedInterests.join(', ')}`);
        }

        // Mutual connections
        const mutualConnections = this.countMutualConnections(department, userConnections);
        if (mutualConnections > 0) {
            reasons.push(`${mutualConnections} mutual connections`);
        }

        // Program relevance
        const relevantPrograms = department.programs.filter(program =>
            userInterests.some(interest =>
                program.name.toLowerCase().includes(interest.toLowerCase()) ||
                program.description?.toLowerCase().includes(interest.toLowerCase())
            )
        );

        if (relevantPrograms.length > 0) {
            reasons.push(`${relevantPrograms.length} relevant programs`);
        }

        return reasons;
    }

    /**
     * Find shared interests between user and department
     */
    private findSharedInterests(department: Department, userInterests: string[]): string[] {
        const sharedInterests: string[] = [];
        const departmentInterests = [
            department.name,
            department.faculty,
            ...department.programs.map(p => p.name)
        ];

        for (const userInterest of userInterests) {
            for (const deptInterest of departmentInterests) {
                if (deptInterest.toLowerCase().includes(userInterest.toLowerCase()) ||
                    userInterest.toLowerCase().includes(deptInterest.toLowerCase())) {
                    if (!sharedInterests.includes(userInterest)) {
                        sharedInterests.push(userInterest);
                    }
                }
            }
        }

        return sharedInterests;
    }

    /**
     * Count mutual connections in department
     */
    private countMutualConnections(department: Department, userConnections: string[]): number {
        // This would typically check actual connections
        // For now, return a mock count based on department size
        return Math.floor((department.studentCount || 0) * 0.1);
    }

    /**
     * Calculate program relevance score
     */
    private calculateProgramRelevance(department: Department, userInterests: string[]): number {
        if (userInterests.length === 0) {
            return 0;
        }

        let relevantPrograms = 0;
        for (const program of department.programs) {
            for (const interest of userInterests) {
                if (program.name.toLowerCase().includes(interest.toLowerCase()) ||
                    program.description?.toLowerCase().includes(interest.toLowerCase())) {
                    relevantPrograms++;
                    break;
                }
            }
        }

        return relevantPrograms / department.programs.length;
    }

    /**
     * Get user's current departments
     */
    private async getUserDepartments(userId: string): Promise<Department[]> {
        // This would typically query user's department memberships
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
