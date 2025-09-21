// Mutual Connection Scoring for Friend Recommendations
// Author: ChitLaq Development Team
// Date: 2024-01-15

export interface MutualConnectionData {
    score: number;
    count: number;
    connections: {
        userId: string;
        displayName: string;
        avatarUrl?: string;
        universityName?: string;
        departmentName?: string;
        relationshipStrength: number;
        lastInteraction?: Date;
    }[];
    analysis: {
        averageStrength: number;
        universityDistribution: { [universityId: string]: number };
        departmentDistribution: { [departmentId: string]: number };
        yearDistribution: { [year: string]: number };
        interactionFrequency: number;
        connectionQuality: number;
    };
    metadata: {
        totalConnections: number;
        mutualPercentage: number;
        strongestConnection?: string;
        weakestConnection?: string;
        mostRecentConnection?: string;
        oldestConnection?: string;
    };
}

export interface ConnectionStrength {
    userId: string;
    strength: number;
    factors: {
        directInteraction: number;
        sharedInterests: number;
        universityConnection: number;
        timeDecay: number;
        engagementLevel: number;
    };
    lastInteraction?: Date;
    interactionCount: number;
    interactionTypes: { [type: string]: number };
}

export class MutualConnectionScoring {
    private connectionCache: Map<string, any> = new Map();
    private strengthCache: Map<string, ConnectionStrength> = new Map();
    private analysisCache: Map<string, any> = new Map();

    // Scoring parameters
    private parameters = {
        minMutualConnections: 1,
        maxMutualConnections: 50,
        strengthWeight: 0.4,
        countWeight: 0.3,
        qualityWeight: 0.2,
        recencyWeight: 0.1,
        universityBonus: 0.1,
        departmentBonus: 0.05,
        yearBonus: 0.03
    };

    // Strength calculation factors
    private strengthFactors = {
        directInteraction: 0.3,
        sharedInterests: 0.25,
        universityConnection: 0.2,
        timeDecay: 0.15,
        engagementLevel: 0.1
    };

    // Time decay parameters
    private timeDecay = {
        recent: 1.0,      // Last 7 days
        week: 0.9,        // Last 30 days
        month: 0.7,       // Last 90 days
        quarter: 0.5,     // Last 365 days
        year: 0.3,        // Older than 1 year
        veryOld: 0.1      // Older than 2 years
    };

    constructor() {
        this.initializeCaches();
    }

    /**
     * Calculate mutual connection score between two users
     */
    async calculateScore(userId: string, candidateId: string): Promise<MutualConnectionData> {
        try {
            const cacheKey = `${userId}:${candidateId}`;
            
            // Check cache first
            if (this.connectionCache.has(cacheKey)) {
                const cached = this.connectionCache.get(cacheKey);
                if (!this.isCacheExpired(cached)) {
                    return cached.data;
                }
            }

            // Get mutual connections
            const mutualConnections = await this.getMutualConnections(userId, candidateId);
            
            if (mutualConnections.length === 0) {
                return this.createEmptyResult();
            }

            // Calculate connection strengths
            const connectionStrengths = await this.calculateConnectionStrengths(mutualConnections, userId, candidateId);
            
            // Analyze mutual connections
            const analysis = await this.analyzeMutualConnections(mutualConnections, connectionStrengths);
            
            // Calculate final score
            const score = this.calculateFinalScore(mutualConnections, connectionStrengths, analysis);
            
            // Create result
            const result: MutualConnectionData = {
                score,
                count: mutualConnections.length,
                connections: mutualConnections.map(conn => ({
                    userId: conn.id,
                    displayName: conn.display_name,
                    avatarUrl: conn.avatar_url,
                    universityName: conn.university_name,
                    departmentName: conn.department_name,
                    relationshipStrength: connectionStrengths.find(s => s.userId === conn.id)?.strength || 0,
                    lastInteraction: conn.last_interaction
                })),
                analysis,
                metadata: this.generateMetadata(mutualConnections, connectionStrengths)
            };

            // Cache result
            this.connectionCache.set(cacheKey, {
                data: result,
                timestamp: Date.now()
            });

            return result;

        } catch (error) {
            console.error('Error calculating mutual connection score:', error);
            return this.createEmptyResult();
        }
    }

    /**
     * Get mutual connections between two users
     */
    private async getMutualConnections(userId: string, candidateId: string): Promise<any[]> {
        try {
            // This would typically query the database using the get_mutual_connections function
            // For now, return mock data
            const mockConnections = Array.from({ length: Math.floor(Math.random() * 20) + 1 }, (_, i) => ({
                id: `user_${i}`,
                display_name: `User ${i}`,
                avatar_url: `https://example.com/avatar_${i}.jpg`,
                university_name: `University ${Math.floor(Math.random() * 5)}`,
                department_name: `Department ${Math.floor(Math.random() * 10)}`,
                last_interaction: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
            }));

            return mockConnections;
        } catch (error) {
            console.error('Error getting mutual connections:', error);
            return [];
        }
    }

    /**
     * Calculate connection strengths for mutual connections
     */
    private async calculateConnectionStrengths(connections: any[], userId: string, candidateId: string): Promise<ConnectionStrength[]> {
        const strengths: ConnectionStrength[] = [];

        for (const connection of connections) {
            const strength = await this.calculateConnectionStrength(connection.id, userId, candidateId);
            strengths.push(strength);
        }

        return strengths;
    }

    /**
     * Calculate strength of a single connection
     */
    private async calculateConnectionStrength(connectionId: string, userId: string, candidateId: string): Promise<ConnectionStrength> {
        const cacheKey = `${connectionId}:${userId}:${candidateId}`;
        
        if (this.strengthCache.has(cacheKey)) {
            return this.strengthCache.get(cacheKey);
        }

        try {
            // Get interaction data
            const interactions = await this.getUserInteractions(connectionId, userId, candidateId);
            
            // Calculate individual factors
            const directInteraction = this.calculateDirectInteractionScore(interactions);
            const sharedInterests = await this.calculateSharedInterestsScore(connectionId, userId, candidateId);
            const universityConnection = await this.calculateUniversityConnectionScore(connectionId, userId, candidateId);
            const timeDecay = this.calculateTimeDecayScore(interactions);
            const engagementLevel = this.calculateEngagementLevelScore(interactions);

            const factors = {
                directInteraction,
                sharedInterests,
                universityConnection,
                timeDecay,
                engagementLevel
            };

            // Calculate weighted strength
            const strength = 
                (directInteraction * this.strengthFactors.directInteraction) +
                (sharedInterests * this.strengthFactors.sharedInterests) +
                (universityConnection * this.strengthFactors.universityConnection) +
                (timeDecay * this.strengthFactors.timeDecay) +
                (engagementLevel * this.strengthFactors.engagementLevel);

            const result: ConnectionStrength = {
                userId: connectionId,
                strength: Math.min(1.0, strength),
                factors,
                lastInteraction: interactions.length > 0 ? new Date(Math.max(...interactions.map(i => new Date(i.created_at).getTime()))) : undefined,
                interactionCount: interactions.length,
                interactionTypes: this.aggregateInteractionTypes(interactions)
            };

            // Cache result
            this.strengthCache.set(cacheKey, result);

            return result;

        } catch (error) {
            console.error('Error calculating connection strength:', error);
            return {
                userId: connectionId,
                strength: 0,
                factors: {
                    directInteraction: 0,
                    sharedInterests: 0,
                    universityConnection: 0,
                    timeDecay: 0,
                    engagementLevel: 0
                },
                interactionCount: 0,
                interactionTypes: {}
            };
        }
    }

    /**
     * Calculate direct interaction score
     */
    private calculateDirectInteractionScore(interactions: any[]): number {
        if (interactions.length === 0) return 0;

        // Score based on interaction frequency and types
        let score = 0;
        const now = Date.now();

        for (const interaction of interactions) {
            const daysSince = (now - new Date(interaction.created_at).getTime()) / (1000 * 60 * 60 * 24);
            const recencyFactor = this.getTimeDecayFactor(daysSince);

            switch (interaction.type) {
                case 'like':
                    score += 0.1 * recencyFactor;
                    break;
                case 'comment':
                    score += 0.3 * recencyFactor;
                    break;
                case 'share':
                    score += 0.5 * recencyFactor;
                    break;
                case 'mention':
                    score += 0.4 * recencyFactor;
                    break;
                case 'message':
                    score += 0.6 * recencyFactor;
                    break;
                case 'follow':
                    score += 0.8 * recencyFactor;
                    break;
            }
        }

        return Math.min(1.0, score);
    }

    /**
     * Calculate shared interests score
     */
    private async calculateSharedInterestsScore(connectionId: string, userId: string, candidateId: string): Promise<number> {
        try {
            // Get user interests
            const userInterests = await this.getUserInterests(userId);
            const candidateInterests = await this.getUserInterests(candidateId);
            const connectionInterests = await this.getUserInterests(connectionId);

            if (!userInterests || !candidateInterests || !connectionInterests) return 0;

            // Calculate intersection
            const userCandidateIntersection = userInterests.filter(interest => candidateInterests.includes(interest));
            const connectionIntersection = connectionInterests.filter(interest => userCandidateIntersection.includes(interest));

            if (userCandidateIntersection.length === 0) return 0;

            return connectionIntersection.length / userCandidateIntersection.length;
        } catch (error) {
            console.error('Error calculating shared interests score:', error);
            return 0;
        }
    }

    /**
     * Calculate university connection score
     */
    private async calculateUniversityConnectionScore(connectionId: string, userId: string, candidateId: string): Promise<number> {
        try {
            const userUniversity = await this.getUserUniversity(userId);
            const candidateUniversity = await this.getUserUniversity(candidateId);
            const connectionUniversity = await this.getUserUniversity(connectionId);

            if (!userUniversity || !candidateUniversity || !connectionUniversity) return 0;

            // Check if connection is from same university as either user
            if (connectionUniversity.id === userUniversity.id || connectionUniversity.id === candidateUniversity.id) {
                return 1.0;
            }

            // Check if connection is from same university as both users
            if (userUniversity.id === candidateUniversity.id && connectionUniversity.id === userUniversity.id) {
                return 1.0;
            }

            return 0;
        } catch (error) {
            console.error('Error calculating university connection score:', error);
            return 0;
        }
    }

    /**
     * Calculate time decay score
     */
    private calculateTimeDecayScore(interactions: any[]): number {
        if (interactions.length === 0) return 0;

        const now = Date.now();
        let totalScore = 0;

        for (const interaction of interactions) {
            const daysSince = (now - new Date(interaction.created_at).getTime()) / (1000 * 60 * 60 * 24);
            const decayFactor = this.getTimeDecayFactor(daysSince);
            totalScore += decayFactor;
        }

        return totalScore / interactions.length;
    }

    /**
     * Calculate engagement level score
     */
    private calculateEngagementLevelScore(interactions: any[]): number {
        if (interactions.length === 0) return 0;

        // Calculate engagement based on interaction diversity and frequency
        const uniqueTypes = new Set(interactions.map(i => i.type)).size;
        const frequency = interactions.length;
        const diversity = uniqueTypes / 6; // Assuming 6 interaction types
        const frequencyScore = Math.min(1.0, frequency / 10); // Normalize to 10 interactions

        return (diversity + frequencyScore) / 2;
    }

    /**
     * Analyze mutual connections
     */
    private async analyzeMutualConnections(connections: any[], strengths: ConnectionStrength[]): Promise<any> {
        const analysis = {
            averageStrength: 0,
            universityDistribution: {} as { [universityId: string]: number },
            departmentDistribution: {} as { [departmentId: string]: number },
            yearDistribution: {} as { [year: string]: number },
            interactionFrequency: 0,
            connectionQuality: 0
        };

        if (connections.length === 0) return analysis;

        // Calculate average strength
        analysis.averageStrength = strengths.reduce((sum, s) => sum + s.strength, 0) / strengths.length;

        // Calculate distributions
        for (const connection of connections) {
            // University distribution
            if (connection.university_name) {
                analysis.universityDistribution[connection.university_name] = 
                    (analysis.universityDistribution[connection.university_name] || 0) + 1;
            }

            // Department distribution
            if (connection.department_name) {
                analysis.departmentDistribution[connection.department_name] = 
                    (analysis.departmentDistribution[connection.department_name] || 0) + 1;
            }

            // Year distribution (mock data)
            const year = Math.floor(Math.random() * 4) + 2020;
            analysis.yearDistribution[year.toString()] = 
                (analysis.yearDistribution[year.toString()] || 0) + 1;
        }

        // Calculate interaction frequency
        analysis.interactionFrequency = strengths.reduce((sum, s) => sum + s.interactionCount, 0) / connections.length;

        // Calculate connection quality
        const highQualityConnections = strengths.filter(s => s.strength > 0.7).length;
        analysis.connectionQuality = highQualityConnections / connections.length;

        return analysis;
    }

    /**
     * Calculate final mutual connection score
     */
    private calculateFinalScore(connections: any[], strengths: ConnectionStrength[], analysis: any): number {
        if (connections.length === 0) return 0;

        // Base score from count (normalized)
        const countScore = Math.min(1.0, connections.length / this.parameters.maxMutualConnections);

        // Strength score
        const strengthScore = analysis.averageStrength;

        // Quality score
        const qualityScore = analysis.connectionQuality;

        // Recency score
        const recencyScore = this.calculateRecencyScore(strengths);

        // Calculate weighted final score
        const finalScore = 
            (countScore * this.parameters.countWeight) +
            (strengthScore * this.parameters.strengthWeight) +
            (qualityScore * this.parameters.qualityWeight) +
            (recencyScore * this.parameters.recencyWeight);

        return Math.min(1.0, finalScore);
    }

    /**
     * Calculate recency score
     */
    private calculateRecencyScore(strengths: ConnectionStrength[]): number {
        if (strengths.length === 0) return 0;

        const now = Date.now();
        let totalRecency = 0;

        for (const strength of strengths) {
            if (strength.lastInteraction) {
                const daysSince = (now - strength.lastInteraction.getTime()) / (1000 * 60 * 60 * 24);
                const recencyFactor = this.getTimeDecayFactor(daysSince);
                totalRecency += recencyFactor;
            }
        }

        return totalRecency / strengths.length;
    }

    /**
     * Get time decay factor
     */
    private getTimeDecayFactor(daysSince: number): number {
        if (daysSince <= 7) return this.timeDecay.recent;
        if (daysSince <= 30) return this.timeDecay.week;
        if (daysSince <= 90) return this.timeDecay.month;
        if (daysSince <= 365) return this.timeDecay.quarter;
        if (daysSince <= 730) return this.timeDecay.year;
        return this.timeDecay.veryOld;
    }

    /**
     * Generate metadata
     */
    private generateMetadata(connections: any[], strengths: ConnectionStrength[]): any {
        const sortedStrengths = strengths.sort((a, b) => b.strength - a.strength);
        const sortedByDate = strengths
            .filter(s => s.lastInteraction)
            .sort((a, b) => b.lastInteraction!.getTime() - a.lastInteraction!.getTime());

        return {
            totalConnections: connections.length,
            mutualPercentage: (connections.length / 100) * 100, // Mock calculation
            strongestConnection: sortedStrengths[0]?.userId,
            weakestConnection: sortedStrengths[sortedStrengths.length - 1]?.userId,
            mostRecentConnection: sortedByDate[0]?.userId,
            oldestConnection: sortedByDate[sortedByDate.length - 1]?.userId
        };
    }

    /**
     * Aggregate interaction types
     */
    private aggregateInteractionTypes(interactions: any[]): { [type: string]: number } {
        const types: { [type: string]: number } = {};
        
        for (const interaction of interactions) {
            types[interaction.type] = (types[interaction.type] || 0) + 1;
        }

        return types;
    }

    /**
     * Create empty result
     */
    private createEmptyResult(): MutualConnectionData {
        return {
            score: 0,
            count: 0,
            connections: [],
            analysis: {
                averageStrength: 0,
                universityDistribution: {},
                departmentDistribution: {},
                yearDistribution: {},
                interactionFrequency: 0,
                connectionQuality: 0
            },
            metadata: {
                totalConnections: 0,
                mutualPercentage: 0
            }
        };
    }

    /**
     * Check if cache is expired
     */
    private isCacheExpired(cached: any): boolean {
        const cacheAge = Date.now() - cached.timestamp;
        return cacheAge > 300000; // 5 minutes
    }

    /**
     * Initialize caches
     */
    private initializeCaches(): void {
        console.log('Mutual connection scoring caches initialized');
    }

    // Mock methods for data retrieval (would typically query database)
    private async getUserInteractions(userId: string, targetUserId1: string, targetUserId2: string): Promise<any[]> {
        // Mock implementation
        return Array.from({ length: Math.floor(Math.random() * 10) }, (_, i) => ({
            id: `interaction_${i}`,
            type: ['like', 'comment', 'share', 'mention', 'message', 'follow'][Math.floor(Math.random() * 6)],
            created_at: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000)
        }));
    }

    private async getUserInterests(userId: string): Promise<string[]> {
        // Mock implementation
        const interests = ['Technology', 'Science', 'Art', 'Music', 'Sports', 'Travel', 'Food', 'Books'];
        return interests.slice(0, Math.floor(Math.random() * 5) + 1);
    }

    private async getUserUniversity(userId: string): Promise<any> {
        // Mock implementation
        return {
            id: `university_${Math.floor(Math.random() * 5)}`,
            name: `University ${Math.floor(Math.random() * 5)}`
        };
    }

    /**
     * Update scoring parameters
     */
    updateParameters(newParameters: Partial<typeof this.parameters>): void {
        this.parameters = { ...this.parameters, ...newParameters };
    }

    /**
     * Get current configuration
     */
    getConfiguration(): any {
        return {
            parameters: this.parameters,
            strengthFactors: this.strengthFactors,
            timeDecay: this.timeDecay
        };
    }

    /**
     * Clear caches
     */
    clearCaches(): void {
        this.connectionCache.clear();
        this.strengthCache.clear();
        this.analysisCache.clear();
    }

    /**
     * Get cache statistics
     */
    getCacheStats(): any {
        return {
            connectionCache: this.connectionCache.size,
            strengthCache: this.strengthCache.size,
            analysisCache: this.analysisCache.size
        };
    }
}
