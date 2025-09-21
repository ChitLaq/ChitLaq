// University-based Recommendation Scoring
// Author: ChitLaq Development Team
// Date: 2024-01-15

export interface UniversityScore {
    score: number;
    factors: {
        sameUniversity: number;
        sameDepartment: number;
        sameYear: number;
        sameMajor: number;
        alumniConnection: number;
        geographicProximity: number;
        universityRanking: number;
        departmentRanking: number;
    };
    metadata: {
        universityId: string;
        universityName: string;
        departmentId?: string;
        departmentName?: string;
        graduationYear?: number;
        major?: string;
        isAlumni: boolean;
        distance?: number;
    };
}

export interface UniversityProfile {
    university_id: string;
    university_name: string;
    department_id?: string;
    department_name?: string;
    graduation_year?: number;
    major?: string;
    current_year?: number;
    location?: {
        latitude: number;
        longitude: number;
        city: string;
        state: string;
        country: string;
    };
    ranking?: {
        global: number;
        national: number;
        department: number;
    };
    size?: {
        total_students: number;
        undergraduate: number;
        graduate: number;
    };
    type?: 'public' | 'private' | 'community' | 'research';
    specialties?: string[];
}

export class UniversityScoring {
    private universityCache: Map<string, UniversityProfile> = new Map();
    private departmentCache: Map<string, any> = new Map();
    private rankingCache: Map<string, any> = new Map();

    // Scoring weights for university factors
    private weights = {
        sameUniversity: 0.40,
        sameDepartment: 0.25,
        sameYear: 0.15,
        sameMajor: 0.10,
        alumniConnection: 0.05,
        geographicProximity: 0.03,
        universityRanking: 0.01,
        departmentRanking: 0.01
    };

    // Bonus multipliers
    private bonuses = {
        topUniversity: 1.2,
        researchUniversity: 1.1,
        sameRegion: 1.05,
        recentGraduate: 1.1,
        currentStudent: 1.15
    };

    constructor() {
        this.initializeCaches();
    }

    /**
     * Calculate university-based recommendation score
     */
    async calculateScore(userProfile: UniversityProfile, candidateProfile: UniversityProfile): Promise<number> {
        try {
            const score = await this.calculateUniversityScore(userProfile, candidateProfile);
            return score.score;
        } catch (error) {
            console.error('Error calculating university score:', error);
            return 0;
        }
    }

    /**
     * Calculate detailed university score with factors
     */
    async calculateUniversityScore(userProfile: UniversityProfile, candidateProfile: UniversityProfile): Promise<UniversityScore> {
        const factors = {
            sameUniversity: 0,
            sameDepartment: 0,
            sameYear: 0,
            sameMajor: 0,
            alumniConnection: 0,
            geographicProximity: 0,
            universityRanking: 0,
            departmentRanking: 0
        };

        let totalScore = 0;

        // Same university scoring (40% weight)
        if (userProfile.university_id === candidateProfile.university_id) {
            factors.sameUniversity = 1.0;
            totalScore += factors.sameUniversity * this.weights.sameUniversity;

            // Same department scoring (25% weight)
            if (userProfile.department_id && candidateProfile.department_id && 
                userProfile.department_id === candidateProfile.department_id) {
                factors.sameDepartment = 1.0;
                totalScore += factors.sameDepartment * this.weights.sameDepartment;

                // Same major scoring (10% weight)
                if (userProfile.major && candidateProfile.major && 
                    userProfile.major === candidateProfile.major) {
                    factors.sameMajor = 1.0;
                    totalScore += factors.sameMajor * this.weights.sameMajor;
                }
            }

            // Same year scoring (15% weight)
            if (userProfile.graduation_year && candidateProfile.graduation_year) {
                const yearDiff = Math.abs(userProfile.graduation_year - candidateProfile.graduation_year);
                if (yearDiff === 0) {
                    factors.sameYear = 1.0;
                } else if (yearDiff === 1) {
                    factors.sameYear = 0.8;
                } else if (yearDiff <= 2) {
                    factors.sameYear = 0.6;
                } else if (yearDiff <= 5) {
                    factors.sameYear = 0.4;
                } else {
                    factors.sameYear = 0.2;
                }
                totalScore += factors.sameYear * this.weights.sameYear;
            }

            // Alumni connection scoring (5% weight)
            const alumniScore = await this.calculateAlumniConnection(userProfile, candidateProfile);
            factors.alumniConnection = alumniScore;
            totalScore += factors.alumniConnection * this.weights.alumniConnection;
        }

        // Geographic proximity scoring (3% weight)
        if (userProfile.location && candidateProfile.location) {
            const distance = this.calculateDistance(
                userProfile.location.latitude,
                userProfile.location.longitude,
                candidateProfile.location.latitude,
                candidateProfile.location.longitude
            );
            factors.geographicProximity = this.calculateGeographicScore(distance);
            totalScore += factors.geographicProximity * this.weights.geographicProximity;
        }

        // University ranking scoring (1% weight)
        const universityRankingScore = await this.calculateUniversityRankingScore(userProfile, candidateProfile);
        factors.universityRanking = universityRankingScore;
        totalScore += factors.universityRanking * this.weights.universityRanking;

        // Department ranking scoring (1% weight)
        const departmentRankingScore = await this.calculateDepartmentRankingScore(userProfile, candidateProfile);
        factors.departmentRanking = departmentRankingScore;
        totalScore += factors.departmentRanking * this.weights.departmentRanking;

        // Apply bonuses
        totalScore = this.applyBonuses(totalScore, userProfile, candidateProfile);

        return {
            score: Math.min(1.0, totalScore),
            factors,
            metadata: {
                universityId: candidateProfile.university_id,
                universityName: candidateProfile.university_name,
                departmentId: candidateProfile.department_id,
                departmentName: candidateProfile.department_name,
                graduationYear: candidateProfile.graduation_year,
                major: candidateProfile.major,
                isAlumni: this.isAlumni(userProfile, candidateProfile),
                distance: userProfile.location && candidateProfile.location ? 
                    this.calculateDistance(
                        userProfile.location.latitude,
                        userProfile.location.longitude,
                        candidateProfile.location.latitude,
                        candidateProfile.location.longitude
                    ) : undefined
            }
        };
    }

    /**
     * Calculate alumni connection score
     */
    private async calculateAlumniConnection(userProfile: UniversityProfile, candidateProfile: UniversityProfile): Promise<number> {
        try {
            // Check if either user is alumni
            const userIsAlumni = this.isAlumni(userProfile, candidateProfile);
            const candidateIsAlumni = this.isAlumni(candidateProfile, userProfile);

            if (userIsAlumni && candidateIsAlumni) {
                // Both are alumni - check graduation year proximity
                if (userProfile.graduation_year && candidateProfile.graduation_year) {
                    const yearDiff = Math.abs(userProfile.graduation_year - candidateProfile.graduation_year);
                    if (yearDiff <= 5) return 1.0;
                    if (yearDiff <= 10) return 0.8;
                    if (yearDiff <= 20) return 0.6;
                    return 0.4;
                }
                return 0.8; // Both alumni, unknown years
            }

            if (userIsAlumni || candidateIsAlumni) {
                // One is alumni, one is current student
                return 0.6;
            }

            // Both are current students
            return 0.4;
        } catch (error) {
            console.error('Error calculating alumni connection:', error);
            return 0;
        }
    }

    /**
     * Calculate university ranking score
     */
    private async calculateUniversityRankingScore(userProfile: UniversityProfile, candidateProfile: UniversityProfile): Promise<number> {
        try {
            const userRanking = await this.getUniversityRanking(userProfile.university_id);
            const candidateRanking = await this.getUniversityRanking(candidateProfile.university_id);

            if (!userRanking || !candidateRanking) return 0;

            // Calculate similarity based on ranking proximity
            const rankingDiff = Math.abs(userRanking.global - candidateRanking.global);
            
            if (rankingDiff <= 50) return 1.0;
            if (rankingDiff <= 100) return 0.8;
            if (rankingDiff <= 200) return 0.6;
            if (rankingDiff <= 500) return 0.4;
            return 0.2;
        } catch (error) {
            console.error('Error calculating university ranking score:', error);
            return 0;
        }
    }

    /**
     * Calculate department ranking score
     */
    private async calculateDepartmentRankingScore(userProfile: UniversityProfile, candidateProfile: UniversityProfile): Promise<number> {
        try {
            if (!userProfile.department_id || !candidateProfile.department_id) return 0;

            const userDeptRanking = await this.getDepartmentRanking(userProfile.department_id);
            const candidateDeptRanking = await this.getDepartmentRanking(candidateProfile.department_id);

            if (!userDeptRanking || !candidateDeptRanking) return 0;

            // Calculate similarity based on department ranking proximity
            const rankingDiff = Math.abs(userDeptRanking.ranking - candidateDeptRanking.ranking);
            
            if (rankingDiff <= 10) return 1.0;
            if (rankingDiff <= 25) return 0.8;
            if (rankingDiff <= 50) return 0.6;
            if (rankingDiff <= 100) return 0.4;
            return 0.2;
        } catch (error) {
            console.error('Error calculating department ranking score:', error);
            return 0;
        }
    }

    /**
     * Calculate geographic score based on distance
     */
    private calculateGeographicScore(distance: number): number {
        if (distance < 1) return 1.0; // Same city
        if (distance < 10) return 0.8; // Same region
        if (distance < 50) return 0.6; // Same state/province
        if (distance < 200) return 0.4; // Same country
        if (distance < 1000) return 0.2; // Same continent
        return 0.1; // Different continent
    }

    /**
     * Apply bonus multipliers
     */
    private applyBonuses(baseScore: number, userProfile: UniversityProfile, candidateProfile: UniversityProfile): number {
        let score = baseScore;

        // Top university bonus
        if (await this.isTopUniversity(candidateProfile.university_id)) {
            score *= this.bonuses.topUniversity;
        }

        // Research university bonus
        if (candidateProfile.type === 'research') {
            score *= this.bonuses.researchUniversity;
        }

        // Same region bonus
        if (userProfile.location && candidateProfile.location && 
            userProfile.location.state === candidateProfile.location.state) {
            score *= this.bonuses.sameRegion;
        }

        // Recent graduate bonus
        if (candidateProfile.graduation_year && 
            (new Date().getFullYear() - candidateProfile.graduation_year) <= 2) {
            score *= this.bonuses.recentGraduate;
        }

        // Current student bonus
        if (!candidateProfile.graduation_year || 
            candidateProfile.graduation_year >= new Date().getFullYear()) {
            score *= this.bonuses.currentStudent;
        }

        return score;
    }

    /**
     * Check if user is alumni
     */
    private isAlumni(userProfile: UniversityProfile, candidateProfile: UniversityProfile): boolean {
        if (!userProfile.graduation_year) return false;
        return userProfile.graduation_year < new Date().getFullYear();
    }

    /**
     * Calculate distance between two coordinates (Haversine formula)
     */
    private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371; // Earth's radius in kilometers
        const dLat = this.toRadians(lat2 - lat1);
        const dLon = this.toRadians(lon2 - lon1);
        
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    /**
     * Convert degrees to radians
     */
    private toRadians(degrees: number): number {
        return degrees * (Math.PI / 180);
    }

    /**
     * Get university ranking from cache or database
     */
    private async getUniversityRanking(universityId: string): Promise<any> {
        if (this.rankingCache.has(universityId)) {
            return this.rankingCache.get(universityId);
        }

        try {
            // This would typically query the database
            // For now, return a mock ranking
            const ranking = {
                global: Math.floor(Math.random() * 1000) + 1,
                national: Math.floor(Math.random() * 100) + 1,
                department: Math.floor(Math.random() * 50) + 1
            };

            this.rankingCache.set(universityId, ranking);
            return ranking;
        } catch (error) {
            console.error('Error getting university ranking:', error);
            return null;
        }
    }

    /**
     * Get department ranking from cache or database
     */
    private async getDepartmentRanking(departmentId: string): Promise<any> {
        if (this.departmentCache.has(departmentId)) {
            return this.departmentCache.get(departmentId);
        }

        try {
            // This would typically query the database
            // For now, return a mock ranking
            const ranking = {
                ranking: Math.floor(Math.random() * 100) + 1,
                specialty: 'Computer Science'
            };

            this.departmentCache.set(departmentId, ranking);
            return ranking;
        } catch (error) {
            console.error('Error getting department ranking:', error);
            return null;
        }
    }

    /**
     * Check if university is in top tier
     */
    private async isTopUniversity(universityId: string): Promise<boolean> {
        const ranking = await this.getUniversityRanking(universityId);
        return ranking && ranking.global <= 100;
    }

    /**
     * Initialize caches
     */
    private async initializeCaches(): Promise<void> {
        try {
            // Load university profiles into cache
            // This would typically load from database
            console.log('University scoring caches initialized');
        } catch (error) {
            console.error('Error initializing university scoring caches:', error);
        }
    }

    /**
     * Get university profile from cache or database
     */
    async getUniversityProfile(universityId: string): Promise<UniversityProfile | null> {
        if (this.universityCache.has(universityId)) {
            return this.universityCache.get(universityId);
        }

        try {
            // This would typically query the database
            // For now, return a mock profile
            const profile: UniversityProfile = {
                university_id: universityId,
                university_name: `University ${universityId}`,
                location: {
                    latitude: 40.7128 + (Math.random() - 0.5) * 10,
                    longitude: -74.0060 + (Math.random() - 0.5) * 10,
                    city: 'New York',
                    state: 'NY',
                    country: 'USA'
                },
                ranking: {
                    global: Math.floor(Math.random() * 1000) + 1,
                    national: Math.floor(Math.random() * 100) + 1,
                    department: Math.floor(Math.random() * 50) + 1
                },
                size: {
                    total_students: Math.floor(Math.random() * 50000) + 10000,
                    undergraduate: Math.floor(Math.random() * 40000) + 8000,
                    graduate: Math.floor(Math.random() * 10000) + 2000
                },
                type: Math.random() > 0.5 ? 'public' : 'private',
                specialties: ['Computer Science', 'Engineering', 'Business']
            };

            this.universityCache.set(universityId, profile);
            return profile;
        } catch (error) {
            console.error('Error getting university profile:', error);
            return null;
        }
    }

    /**
     * Update scoring weights
     */
    updateWeights(newWeights: Partial<typeof this.weights>): void {
        this.weights = { ...this.weights, ...newWeights };
    }

    /**
     * Get current scoring configuration
     */
    getConfiguration(): any {
        return {
            weights: this.weights,
            bonuses: this.bonuses
        };
    }

    /**
     * Clear caches
     */
    clearCaches(): void {
        this.universityCache.clear();
        this.departmentCache.clear();
        this.rankingCache.clear();
    }

    /**
     * Get cache statistics
     */
    getCacheStats(): any {
        return {
            universityCache: this.universityCache.size,
            departmentCache: this.departmentCache.size,
            rankingCache: this.rankingCache.size
        };
    }
}
