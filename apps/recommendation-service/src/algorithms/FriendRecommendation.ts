// Friend Recommendation Algorithm
// Author: ChitLaq Development Team
// Date: 2024-01-15

import { UniversityScoring } from '../scoring/UniversityScoring';
import { MutualConnectionScoring } from '../scoring/MutualConnectionScoring';
import { InterestSimilarity } from '../ml/InterestSimilarity';
import { RecommendationCache } from '../cache/RecommendationCache';
import { AlgorithmUtils } from '../utils/algorithm-utils';

export interface RecommendationCandidate {
    userId: string;
    score: number;
    factors: {
        university: number;
        mutualConnections: number;
        interests: number;
        engagement: number;
        geography: number;
        recency: number;
        profileCompletion: number;
        socialHistory: number;
    };
    explanations: string[];
    metadata: {
        universityName?: string;
        mutualCount?: number;
        sharedInterests?: string[];
        lastActive?: Date;
        profileCompleteness?: number;
        interactionHistory?: any[];
    };
}

export interface RecommendationRequest {
    userId: string;
    limit?: number;
    excludeUsers?: string[];
    includeTypes?: string[];
    excludeTypes?: string[];
    minScore?: number;
    maxAge?: number; // in days
    diversityFactor?: number;
    privacyLevel?: 'public' | 'university' | 'friends' | 'private';
}

export interface RecommendationResponse {
    recommendations: RecommendationCandidate[];
    totalCandidates: number;
    algorithmVersion: string;
    processingTime: number;
    cacheHit: boolean;
    metadata: {
        factors: {
            university: number;
            mutualConnections: number;
            interests: number;
            engagement: number;
            geography: number;
        };
        diversity: number;
        privacy: string;
        timestamp: Date;
    };
}

export class FriendRecommendationAlgorithm {
    private universityScoring: UniversityScoring;
    private mutualConnectionScoring: MutualConnectionScoring;
    private interestSimilarity: InterestSimilarity;
    private recommendationCache: RecommendationCache;
    private algorithmUtils: AlgorithmUtils;

    // Algorithm weights (configurable)
    private weights = {
        university: 0.40,
        mutualConnections: 0.25,
        interests: 0.20,
        engagement: 0.10,
        geography: 0.05
    };

    // Bonus factors
    private bonusFactors = {
        recency: 0.05,
        profileCompletion: 0.03,
        socialHistory: 0.02
    };

    constructor(
        universityScoring: UniversityScoring,
        mutualConnectionScoring: MutualConnectionScoring,
        interestSimilarity: InterestSimilarity,
        recommendationCache: RecommendationCache,
        algorithmUtils: AlgorithmUtils
    ) {
        this.universityScoring = universityScoring;
        this.mutualConnectionScoring = mutualConnectionScoring;
        this.interestSimilarity = interestSimilarity;
        this.recommendationCache = recommendationCache;
        this.algorithmUtils = algorithmUtils;
    }

    /**
     * Generate friend recommendations for a user
     */
    async generateRecommendations(request: RecommendationRequest): Promise<RecommendationResponse> {
        const startTime = Date.now();
        
        try {
            // Check cache first
            const cacheKey = this.generateCacheKey(request);
            const cachedResult = await this.recommendationCache.get(cacheKey);
            
            if (cachedResult && !this.isCacheExpired(cachedResult)) {
                return {
                    ...cachedResult,
                    cacheHit: true,
                    processingTime: Date.now() - startTime
                };
            }

            // Get user profile and preferences
            const userProfile = await this.algorithmUtils.getUserProfile(request.userId);
            if (!userProfile) {
                throw new Error(`User profile not found for user: ${request.userId}`);
            }

            // Get candidate users
            const candidates = await this.getCandidateUsers(request, userProfile);
            
            // Score each candidate
            const scoredCandidates = await this.scoreCandidates(candidates, userProfile, request);
            
            // Apply diversity and filtering
            const filteredCandidates = this.applyFilters(scoredCandidates, request);
            
            // Sort by score and apply limit
            const sortedCandidates = filteredCandidates
                .sort((a, b) => b.score - a.score)
                .slice(0, request.limit || 20);

            // Generate explanations
            const recommendations = await this.generateExplanations(sortedCandidates, userProfile);

            const result: RecommendationResponse = {
                recommendations,
                totalCandidates: candidates.length,
                algorithmVersion: '2.13.0',
                processingTime: Date.now() - startTime,
                cacheHit: false,
                metadata: {
                    factors: this.weights,
                    diversity: this.calculateDiversity(recommendations),
                    privacy: request.privacyLevel || 'university',
                    timestamp: new Date()
                }
            };

            // Cache the result
            await this.recommendationCache.set(cacheKey, result, 1800); // 30 minutes

            return result;

        } catch (error) {
            console.error('Error generating recommendations:', error);
            throw new Error(`Failed to generate recommendations: ${error.message}`);
        }
    }

    /**
     * Get candidate users for recommendations
     */
    private async getCandidateUsers(request: RecommendationRequest, userProfile: any): Promise<any[]> {
        const excludeList = [
            request.userId,
            ...(request.excludeUsers || []),
            ...(await this.algorithmUtils.getBlockedUsers(request.userId)),
            ...(await this.algorithmUtils.getExistingConnections(request.userId))
        ];

        // Build query based on privacy level and preferences
        let query = `
            SELECT DISTINCT u.id, u.email, up.*, univ.name as university_name, dept.name as department_name
            FROM users u
            INNER JOIN user_profiles up ON up.user_id = u.id
            LEFT JOIN universities univ ON univ.id = up.university_id
            LEFT JOIN departments dept ON dept.id = up.department_id
            WHERE u.id != ALL($1)
            AND u.email_verified = true
            AND up.profile_completion_score >= 30
        `;

        const queryParams = [excludeList];

        // Apply privacy filters
        if (request.privacyLevel === 'university' || request.privacyLevel === 'friends') {
            query += ` AND up.university_id = $2`;
            queryParams.push(userProfile.university_id);
        }

        // Apply type filters
        if (request.includeTypes && request.includeTypes.length > 0) {
            query += ` AND up.user_type = ANY($${queryParams.length + 1})`;
            queryParams.push(request.includeTypes);
        }

        if (request.excludeTypes && request.excludeTypes.length > 0) {
            query += ` AND up.user_type != ALL($${queryParams.length + 1})`;
            queryParams.push(request.excludeTypes);
        }

        // Apply age filter
        if (request.maxAge) {
            query += ` AND up.last_active >= NOW() - INTERVAL '${request.maxAge} days'`;
        }

        // Apply minimum score filter
        if (request.minScore) {
            query += ` AND up.profile_completion_score >= $${queryParams.length + 1}`;
            queryParams.push(request.minScore);
        }

        query += ` ORDER BY up.profile_completion_score DESC, up.last_active DESC LIMIT 1000`;

        return await this.algorithmUtils.executeQuery(query, queryParams);
    }

    /**
     * Score all candidate users
     */
    private async scoreCandidates(candidates: any[], userProfile: any, request: RecommendationRequest): Promise<RecommendationCandidate[]> {
        const scoredCandidates: RecommendationCandidate[] = [];

        // Process candidates in batches for performance
        const batchSize = 50;
        for (let i = 0; i < candidates.length; i += batchSize) {
            const batch = candidates.slice(i, i + batchSize);
            const batchPromises = batch.map(candidate => this.scoreCandidate(candidate, userProfile, request));
            const batchResults = await Promise.all(batchPromises);
            scoredCandidates.push(...batchResults);
        }

        return scoredCandidates;
    }

    /**
     * Score a single candidate user
     */
    private async scoreCandidate(candidate: any, userProfile: any, request: RecommendationRequest): Promise<RecommendationCandidate> {
        const factors = {
            university: 0,
            mutualConnections: 0,
            interests: 0,
            engagement: 0,
            geography: 0,
            recency: 0,
            profileCompletion: 0,
            socialHistory: 0
        };

        const explanations: string[] = [];
        const metadata: any = {};

        // University scoring (40% weight)
        factors.university = await this.universityScoring.calculateScore(userProfile, candidate);
        if (factors.university > 0) {
            explanations.push(`Same university: ${candidate.university_name}`);
            metadata.universityName = candidate.university_name;
        }

        // Mutual connections scoring (25% weight)
        const mutualData = await this.mutualConnectionScoring.calculateScore(userProfile.user_id, candidate.id);
        factors.mutualConnections = mutualData.score;
        if (mutualData.count > 0) {
            explanations.push(`${mutualData.count} mutual connections`);
            metadata.mutualCount = mutualData.count;
        }

        // Interest similarity scoring (20% weight)
        const interestData = await this.interestSimilarity.calculateSimilarity(userProfile, candidate);
        factors.interests = interestData.score;
        if (interestData.sharedInterests.length > 0) {
            explanations.push(`Shared interests: ${interestData.sharedInterests.slice(0, 3).join(', ')}`);
            metadata.sharedInterests = interestData.sharedInterests;
        }

        // Engagement pattern scoring (10% weight)
        factors.engagement = await this.calculateEngagementScore(userProfile, candidate);
        if (factors.engagement > 0.5) {
            explanations.push('Similar engagement patterns');
        }

        // Geographic proximity scoring (5% weight)
        factors.geography = await this.calculateGeographicScore(userProfile, candidate);
        if (factors.geography > 0.3) {
            explanations.push('Geographic proximity');
        }

        // Bonus factors
        factors.recency = this.calculateRecencyBonus(candidate);
        factors.profileCompletion = this.calculateProfileCompletionBonus(candidate);
        factors.socialHistory = await this.calculateSocialHistoryBonus(userProfile.user_id, candidate.id);

        // Calculate final score
        const baseScore = 
            (factors.university * this.weights.university) +
            (factors.mutualConnections * this.weights.mutualConnections) +
            (factors.interests * this.weights.interests) +
            (factors.engagement * this.weights.engagement) +
            (factors.geography * this.weights.geography);

        const bonusScore = 
            (factors.recency * this.bonusFactors.recency) +
            (factors.profileCompletion * this.bonusFactors.profileCompletion) +
            (factors.socialHistory * this.bonusFactors.socialHistory);

        const finalScore = Math.min(100, (baseScore + bonusScore) * 100);

        return {
            userId: candidate.id,
            score: finalScore,
            factors,
            explanations,
            metadata: {
                ...metadata,
                lastActive: candidate.last_active,
                profileCompleteness: candidate.profile_completion_score
            }
        };
    }

    /**
     * Calculate engagement pattern score
     */
    private async calculateEngagementScore(userProfile: any, candidate: any): Promise<number> {
        try {
            // Get engagement patterns for both users
            const userEngagement = await this.algorithmUtils.getUserEngagementPattern(userProfile.user_id);
            const candidateEngagement = await this.algorithmUtils.getUserEngagementPattern(candidate.id);

            if (!userEngagement || !candidateEngagement) {
                return 0;
            }

            // Calculate similarity in engagement patterns
            const timeSimilarity = this.calculateTimePatternSimilarity(userEngagement.timePattern, candidateEngagement.timePattern);
            const activitySimilarity = this.calculateActivityPatternSimilarity(userEngagement.activityPattern, candidateEngagement.activityPattern);
            const contentSimilarity = this.calculateContentPatternSimilarity(userEngagement.contentPattern, candidateEngagement.contentPattern);

            return (timeSimilarity + activitySimilarity + contentSimilarity) / 3;
        } catch (error) {
            console.error('Error calculating engagement score:', error);
            return 0;
        }
    }

    /**
     * Calculate geographic proximity score
     */
    private async calculateGeographicScore(userProfile: any, candidate: any): Promise<number> {
        try {
            if (!userProfile.location || !candidate.location) {
                return 0;
            }

            const distance = this.algorithmUtils.calculateDistance(
                userProfile.location.latitude,
                userProfile.location.longitude,
                candidate.location.latitude,
                candidate.location.longitude
            );

            // Score based on distance (closer = higher score)
            if (distance < 1) return 1.0; // Same city
            if (distance < 10) return 0.8; // Same region
            if (distance < 50) return 0.6; // Same state/province
            if (distance < 200) return 0.4; // Same country
            return 0.1; // Different country
        } catch (error) {
            console.error('Error calculating geographic score:', error);
            return 0;
        }
    }

    /**
     * Calculate recency bonus
     */
    private calculateRecencyBonus(candidate: any): number {
        if (!candidate.last_active) return 0;

        const daysSinceActive = (Date.now() - new Date(candidate.last_active).getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysSinceActive < 1) return 1.0; // Active today
        if (daysSinceActive < 7) return 0.8; // Active this week
        if (daysSinceActive < 30) return 0.6; // Active this month
        if (daysSinceActive < 90) return 0.4; // Active this quarter
        return 0.1; // Less active
    }

    /**
     * Calculate profile completion bonus
     */
    private calculateProfileCompletionBonus(candidate: any): number {
        const completionScore = candidate.profile_completion_score || 0;
        return completionScore / 100; // Normalize to 0-1
    }

    /**
     * Calculate social history bonus
     */
    private async calculateSocialHistoryBonus(userId: string, candidateId: string): Promise<number> {
        try {
            // Check for previous interactions
            const interactions = await this.algorithmUtils.getUserInteractions(userId, candidateId);
            
            if (interactions.length === 0) return 0;

            // Calculate bonus based on interaction quality and recency
            let bonus = 0;
            const now = Date.now();

            for (const interaction of interactions) {
                const daysSince = (now - new Date(interaction.created_at).getTime()) / (1000 * 60 * 60 * 24);
                const recencyFactor = Math.max(0, 1 - (daysSince / 365)); // Decay over a year
                
                switch (interaction.type) {
                    case 'like':
                        bonus += 0.1 * recencyFactor;
                        break;
                    case 'comment':
                        bonus += 0.2 * recencyFactor;
                        break;
                    case 'share':
                        bonus += 0.3 * recencyFactor;
                        break;
                    case 'mention':
                        bonus += 0.4 * recencyFactor;
                        break;
                }
            }

            return Math.min(1, bonus);
        } catch (error) {
            console.error('Error calculating social history bonus:', error);
            return 0;
        }
    }

    /**
     * Apply filters and diversity
     */
    private applyFilters(candidates: RecommendationCandidate[], request: RecommendationRequest): RecommendationCandidate[] {
        let filtered = candidates;

        // Apply minimum score filter
        if (request.minScore) {
            filtered = filtered.filter(c => c.score >= request.minScore);
        }

        // Apply diversity factor
        if (request.diversityFactor && request.diversityFactor > 0) {
            filtered = this.applyDiversityFilter(filtered, request.diversityFactor);
        }

        return filtered;
    }

    /**
     * Apply diversity filter to ensure variety in recommendations
     */
    private applyDiversityFilter(candidates: RecommendationCandidate[], diversityFactor: number): RecommendationCandidate[] {
        const diverse: RecommendationCandidate[] = [];
        const usedUniversities = new Set<string>();
        const usedDepartments = new Set<string>();

        for (const candidate of candidates) {
            const university = candidate.metadata.universityName;
            const department = candidate.metadata.departmentName;

            // Check diversity constraints
            const universityDiversity = !university || !usedUniversities.has(university) || usedUniversities.size < 5;
            const departmentDiversity = !department || !usedDepartments.has(department) || usedDepartments.size < 10;

            if (universityDiversity && departmentDiversity) {
                diverse.push(candidate);
                if (university) usedUniversities.add(university);
                if (department) usedDepartments.add(department);
            }

            // Stop if we have enough diverse candidates
            if (diverse.length >= candidates.length * diversityFactor) {
                break;
            }
        }

        return diverse;
    }

    /**
     * Generate explanations for recommendations
     */
    private async generateExplanations(candidates: RecommendationCandidate[], userProfile: any): Promise<RecommendationCandidate[]> {
        return candidates.map(candidate => {
            // Enhance explanations based on factors
            if (candidate.factors.university > 0.8) {
                candidate.explanations.push('Strong university connection');
            }
            if (candidate.factors.mutualConnections > 0.7) {
                candidate.explanations.push('High mutual connection overlap');
            }
            if (candidate.factors.interests > 0.6) {
                candidate.explanations.push('Strong interest alignment');
            }
            if (candidate.factors.engagement > 0.5) {
                candidate.explanations.push('Similar activity patterns');
            }

            // Add personalized explanations
            if (candidate.metadata.profileCompleteness > 80) {
                candidate.explanations.push('Complete profile');
            }
            if (candidate.metadata.lastActive && this.isRecentlyActive(candidate.metadata.lastActive)) {
                candidate.explanations.push('Recently active');
            }

            return candidate;
        });
    }

    /**
     * Calculate diversity score
     */
    private calculateDiversity(recommendations: RecommendationCandidate[]): number {
        if (recommendations.length === 0) return 0;

        const universities = new Set(recommendations.map(r => r.metadata.universityName).filter(Boolean));
        const departments = new Set(recommendations.map(r => r.metadata.departmentName).filter(Boolean));
        const interests = new Set(recommendations.flatMap(r => r.metadata.sharedInterests || []));

        const diversity = (universities.size + departments.size + interests.size) / (recommendations.length * 3);
        return Math.min(1, diversity);
    }

    /**
     * Generate cache key
     */
    private generateCacheKey(request: RecommendationRequest): string {
        const keyData = {
            userId: request.userId,
            limit: request.limit || 20,
            excludeUsers: request.excludeUsers || [],
            includeTypes: request.includeTypes || [],
            excludeTypes: request.excludeTypes || [],
            minScore: request.minScore || 0,
            maxAge: request.maxAge || 90,
            diversityFactor: request.diversityFactor || 0.8,
            privacyLevel: request.privacyLevel || 'university'
        };

        return `recommendations:${request.userId}:${Buffer.from(JSON.stringify(keyData)).toString('base64')}`;
    }

    /**
     * Check if cache is expired
     */
    private isCacheExpired(cachedResult: any): boolean {
        const cacheAge = Date.now() - new Date(cachedResult.metadata.timestamp).getTime();
        return cacheAge > 1800000; // 30 minutes
    }

    /**
     * Check if user is recently active
     */
    private isRecentlyActive(lastActive: Date): boolean {
        const daysSinceActive = (Date.now() - new Date(lastActive).getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceActive < 7;
    }

    /**
     * Calculate time pattern similarity
     */
    private calculateTimePatternSimilarity(pattern1: any, pattern2: any): number {
        if (!pattern1 || !pattern2) return 0;
        
        // Calculate similarity between time patterns (simplified)
        const similarity = this.calculateVectorSimilarity(pattern1.hours, pattern2.hours);
        return similarity;
    }

    /**
     * Calculate activity pattern similarity
     */
    private calculateActivityPatternSimilarity(pattern1: any, pattern2: any): number {
        if (!pattern1 || !pattern2) return 0;
        
        // Calculate similarity between activity patterns
        const similarity = this.calculateVectorSimilarity(pattern1.activities, pattern2.activities);
        return similarity;
    }

    /**
     * Calculate content pattern similarity
     */
    private calculateContentPatternSimilarity(pattern1: any, pattern2: any): number {
        if (!pattern1 || !pattern2) return 0;
        
        // Calculate similarity between content patterns
        const similarity = this.calculateVectorSimilarity(pattern1.contentTypes, pattern2.contentTypes);
        return similarity;
    }

    /**
     * Calculate vector similarity (cosine similarity)
     */
    private calculateVectorSimilarity(vector1: number[], vector2: number[]): number {
        if (!vector1 || !vector2 || vector1.length !== vector2.length) return 0;

        let dotProduct = 0;
        let norm1 = 0;
        let norm2 = 0;

        for (let i = 0; i < vector1.length; i++) {
            dotProduct += vector1[i] * vector2[i];
            norm1 += vector1[i] * vector1[i];
            norm2 += vector2[i] * vector2[i];
        }

        if (norm1 === 0 || norm2 === 0) return 0;

        return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
    }

    /**
     * Update algorithm weights
     */
    updateWeights(newWeights: Partial<typeof this.weights>): void {
        this.weights = { ...this.weights, ...newWeights };
    }

    /**
     * Get current algorithm configuration
     */
    getConfiguration(): any {
        return {
            weights: this.weights,
            bonusFactors: this.bonusFactors,
            version: '2.13.0'
        };
    }
}
