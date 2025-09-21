// Interest Similarity Calculation for Friend Recommendations
// Author: ChitLaq Development Team
// Date: 2024-01-15

export interface InterestVector {
    interests: string[];
    weights: { [interest: string]: number };
    categories: { [category: string]: string[] };
    embeddings?: number[];
    lastUpdated: Date;
}

export interface InterestSimilarityResult {
    score: number;
    sharedInterests: string[];
    categorySimilarity: { [category: string]: number };
    semanticSimilarity: number;
    behavioralSimilarity: number;
    temporalSimilarity: number;
    metadata: {
        totalInterests: number;
        sharedCount: number;
        categoryOverlap: number;
        interestDiversity: number;
        recencyScore: number;
    };
}

export interface InterestCategory {
    name: string;
    interests: string[];
    weight: number;
    subcategories?: string[];
}

export interface UserInterestProfile {
    userId: string;
    interests: string[];
    categories: { [category: string]: string[] };
    weights: { [interest: string]: number };
    behavioralData: {
        postInterests: { [interest: string]: number };
        likeInterests: { [interest: string]: number };
        shareInterests: { [interest: string]: number };
        searchInterests: { [interest: string]: number };
        timeSpent: { [interest: string]: number };
    };
    temporalData: {
        recentInterests: string[];
        trendingInterests: string[];
        seasonalInterests: { [season: string]: string[] };
        historicalInterests: { [period: string]: string[] };
    };
    socialData: {
        friendInterests: { [interest: string]: number };
        universityInterests: { [interest: string]: number };
        departmentInterests: { [interest: string]: number };
    };
    lastUpdated: Date;
}

export class InterestSimilarity {
    private interestCache: Map<string, InterestVector> = new Map();
    private categoryCache: Map<string, InterestCategory> = new Map();
    private embeddingCache: Map<string, number[]> = new Map();
    private similarityCache: Map<string, InterestSimilarityResult> = new Map();

    // Interest categories and their weights
    private categories: InterestCategory[] = [
        {
            name: 'Academic',
            interests: ['Computer Science', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Engineering', 'Medicine', 'Law', 'Business', 'Economics'],
            weight: 0.3,
            subcategories: ['STEM', 'Humanities', 'Social Sciences', 'Professional']
        },
        {
            name: 'Technology',
            interests: ['Programming', 'AI/ML', 'Web Development', 'Mobile Apps', 'Data Science', 'Cybersecurity', 'Blockchain', 'IoT', 'Robotics', 'Gaming'],
            weight: 0.25,
            subcategories: ['Software', 'Hardware', 'Emerging Tech', 'Digital Media']
        },
        {
            name: 'Arts & Culture',
            interests: ['Music', 'Art', 'Literature', 'Film', 'Theater', 'Photography', 'Design', 'Fashion', 'Architecture', 'Museums'],
            weight: 0.2,
            subcategories: ['Visual Arts', 'Performing Arts', 'Literary Arts', 'Cultural Events']
        },
        {
            name: 'Sports & Fitness',
            interests: ['Football', 'Basketball', 'Soccer', 'Tennis', 'Swimming', 'Running', 'Gym', 'Yoga', 'Martial Arts', 'Outdoor Activities'],
            weight: 0.15,
            subcategories: ['Team Sports', 'Individual Sports', 'Fitness', 'Outdoor Recreation']
        },
        {
            name: 'Lifestyle',
            interests: ['Travel', 'Food', 'Cooking', 'Fashion', 'Beauty', 'Health', 'Wellness', 'Home Decor', 'Gardening', 'Pets'],
            weight: 0.1,
            subcategories: ['Personal Care', 'Home & Garden', 'Travel & Adventure', 'Health & Wellness']
        }
    ];

    // Similarity calculation weights
    private weights = {
        exactMatch: 0.4,
        categorySimilarity: 0.25,
        semanticSimilarity: 0.2,
        behavioralSimilarity: 0.1,
        temporalSimilarity: 0.05
    };

    // Interest embeddings (simplified - would typically use pre-trained models)
    private interestEmbeddings: { [interest: string]: number[] } = {};

    constructor() {
        this.initializeInterestEmbeddings();
        this.initializeCategories();
    }

    /**
     * Calculate interest similarity between two users
     */
    async calculateSimilarity(userProfile: UserInterestProfile, candidateProfile: UserInterestProfile): Promise<InterestSimilarityResult> {
        try {
            const cacheKey = `${userProfile.userId}:${candidateProfile.userId}`;
            
            // Check cache first
            if (this.similarityCache.has(cacheKey)) {
                const cached = this.similarityCache.get(cacheKey);
                if (!this.isCacheExpired(cached)) {
                    return cached;
                }
            }

            // Calculate different types of similarity
            const exactMatchScore = this.calculateExactMatchSimilarity(userProfile, candidateProfile);
            const categorySimilarity = this.calculateCategorySimilarity(userProfile, candidateProfile);
            const semanticSimilarity = await this.calculateSemanticSimilarity(userProfile, candidateProfile);
            const behavioralSimilarity = this.calculateBehavioralSimilarity(userProfile, candidateProfile);
            const temporalSimilarity = this.calculateTemporalSimilarity(userProfile, candidateProfile);

            // Calculate weighted final score
            const finalScore = 
                (exactMatchScore * this.weights.exactMatch) +
                (categorySimilarity.overall * this.weights.categorySimilarity) +
                (semanticSimilarity * this.weights.semanticSimilarity) +
                (behavioralSimilarity * this.weights.behavioralSimilarity) +
                (temporalSimilarity * this.weights.temporalSimilarity);

            // Generate shared interests
            const sharedInterests = this.findSharedInterests(userProfile, candidateProfile);

            // Create result
            const result: InterestSimilarityResult = {
                score: Math.min(1.0, finalScore),
                sharedInterests,
                categorySimilarity,
                semanticSimilarity,
                behavioralSimilarity,
                temporalSimilarity,
                metadata: {
                    totalInterests: userProfile.interests.length + candidateProfile.interests.length,
                    sharedCount: sharedInterests.length,
                    categoryOverlap: this.calculateCategoryOverlap(userProfile, candidateProfile),
                    interestDiversity: this.calculateInterestDiversity(userProfile, candidateProfile),
                    recencyScore: this.calculateRecencyScore(userProfile, candidateProfile)
                }
            };

            // Cache result
            this.similarityCache.set(cacheKey, result);

            return result;

        } catch (error) {
            console.error('Error calculating interest similarity:', error);
            return this.createEmptyResult();
        }
    }

    /**
     * Calculate exact match similarity
     */
    private calculateExactMatchSimilarity(userProfile: UserInterestProfile, candidateProfile: UserInterestProfile): number {
        const userInterests = new Set(userProfile.interests);
        const candidateInterests = new Set(candidateProfile.interests);
        
        const intersection = new Set([...userInterests].filter(x => candidateInterests.has(x)));
        const union = new Set([...userInterests, ...candidateInterests]);
        
        return intersection.size / union.size; // Jaccard similarity
    }

    /**
     * Calculate category-based similarity
     */
    private calculateCategorySimilarity(userProfile: UserInterestProfile, candidateProfile: UserInterestProfile): any {
        const categoryScores: { [category: string]: number } = {};
        let totalScore = 0;
        let categoryCount = 0;

        for (const category of this.categories) {
            const userCategoryInterests = userProfile.categories[category.name] || [];
            const candidateCategoryInterests = candidateProfile.categories[category.name] || [];
            
            if (userCategoryInterests.length === 0 && candidateCategoryInterests.length === 0) {
                categoryScores[category.name] = 0;
                continue;
            }

            const userSet = new Set(userCategoryInterests);
            const candidateSet = new Set(candidateCategoryInterests);
            const intersection = new Set([...userSet].filter(x => candidateSet.has(x)));
            const union = new Set([...userSet, ...candidateSet]);
            
            const categoryScore = intersection.size / union.size;
            categoryScores[category.name] = categoryScore;
            
            totalScore += categoryScore * category.weight;
            categoryCount++;
        }

        return {
            overall: categoryCount > 0 ? totalScore / categoryCount : 0,
            byCategory: categoryScores
        };
    }

    /**
     * Calculate semantic similarity using embeddings
     */
    private async calculateSemanticSimilarity(userProfile: UserInterestProfile, candidateProfile: UserInterestProfile): Promise<number> {
        try {
            const userEmbedding = await this.getUserInterestEmbedding(userProfile);
            const candidateEmbedding = await this.getUserInterestEmbedding(candidateProfile);
            
            if (!userEmbedding || !candidateEmbedding) {
                return 0;
            }

            return this.calculateCosineSimilarity(userEmbedding, candidateEmbedding);
        } catch (error) {
            console.error('Error calculating semantic similarity:', error);
            return 0;
        }
    }

    /**
     * Calculate behavioral similarity
     */
    private calculateBehavioralSimilarity(userProfile: UserInterestProfile, candidateProfile: UserInterestProfile): number {
        const userBehavior = userProfile.behavioralData;
        const candidateBehavior = candidateProfile.behavioralData;
        
        let totalSimilarity = 0;
        let behaviorCount = 0;

        // Compare post interests
        const postSimilarity = this.calculateBehavioralVectorSimilarity(userBehavior.postInterests, candidateBehavior.postInterests);
        totalSimilarity += postSimilarity;
        behaviorCount++;

        // Compare like interests
        const likeSimilarity = this.calculateBehavioralVectorSimilarity(userBehavior.likeInterests, candidateBehavior.likeInterests);
        totalSimilarity += likeSimilarity;
        behaviorCount++;

        // Compare share interests
        const shareSimilarity = this.calculateBehavioralVectorSimilarity(userBehavior.shareInterests, candidateBehavior.shareInterests);
        totalSimilarity += shareSimilarity;
        behaviorCount++;

        // Compare search interests
        const searchSimilarity = this.calculateBehavioralVectorSimilarity(userBehavior.searchInterests, candidateBehavior.searchInterests);
        totalSimilarity += searchSimilarity;
        behaviorCount++;

        // Compare time spent
        const timeSimilarity = this.calculateBehavioralVectorSimilarity(userBehavior.timeSpent, candidateBehavior.timeSpent);
        totalSimilarity += timeSimilarity;
        behaviorCount++;

        return behaviorCount > 0 ? totalSimilarity / behaviorCount : 0;
    }

    /**
     * Calculate temporal similarity
     */
    private calculateTemporalSimilarity(userProfile: UserInterestProfile, candidateProfile: UserInterestProfile): number {
        const userTemporal = userProfile.temporalData;
        const candidateTemporal = candidateProfile.temporalData;
        
        let totalSimilarity = 0;
        let temporalCount = 0;

        // Compare recent interests
        const recentSimilarity = this.calculateExactMatchSimilarity(
            { ...userProfile, interests: userTemporal.recentInterests },
            { ...candidateProfile, interests: candidateTemporal.recentInterests }
        );
        totalSimilarity += recentSimilarity;
        temporalCount++;

        // Compare trending interests
        const trendingSimilarity = this.calculateExactMatchSimilarity(
            { ...userProfile, interests: userTemporal.trendingInterests },
            { ...candidateProfile, interests: candidateTemporal.trendingInterests }
        );
        totalSimilarity += trendingSimilarity;
        temporalCount++;

        // Compare seasonal interests
        const currentSeason = this.getCurrentSeason();
        const userSeasonalInterests = userTemporal.seasonalInterests[currentSeason] || [];
        const candidateSeasonalInterests = candidateTemporal.seasonalInterests[currentSeason] || [];
        
        const seasonalSimilarity = this.calculateExactMatchSimilarity(
            { ...userProfile, interests: userSeasonalInterests },
            { ...candidateProfile, interests: candidateSeasonalInterests }
        );
        totalSimilarity += seasonalSimilarity;
        temporalCount++;

        return temporalCount > 0 ? totalSimilarity / temporalCount : 0;
    }

    /**
     * Find shared interests between users
     */
    private findSharedInterests(userProfile: UserInterestProfile, candidateProfile: UserInterestProfile): string[] {
        const userInterests = new Set(userProfile.interests);
        const candidateInterests = new Set(candidateProfile.interests);
        
        return [...userInterests].filter(interest => candidateInterests.has(interest));
    }

    /**
     * Calculate category overlap
     */
    private calculateCategoryOverlap(userProfile: UserInterestProfile, candidateProfile: UserInterestProfile): number {
        const userCategories = Object.keys(userProfile.categories);
        const candidateCategories = Object.keys(candidateProfile.categories);
        
        const intersection = userCategories.filter(cat => candidateCategories.includes(cat));
        const union = [...new Set([...userCategories, ...candidateCategories])];
        
        return union.length > 0 ? intersection.length / union.length : 0;
    }

    /**
     * Calculate interest diversity
     */
    private calculateInterestDiversity(userProfile: UserInterestProfile, candidateProfile: UserInterestProfile): number {
        const allInterests = [...userProfile.interests, ...candidateProfile.interests];
        const uniqueInterests = new Set(allInterests);
        
        return uniqueInterests.size / allInterests.length;
    }

    /**
     * Calculate recency score
     */
    private calculateRecencyScore(userProfile: UserInterestProfile, candidateProfile: UserInterestProfile): number {
        const now = Date.now();
        const userRecency = (now - userProfile.lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
        const candidateRecency = (now - candidateProfile.lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
        
        // Score based on how recent the interest profiles were updated
        const userScore = Math.max(0, 1 - (userRecency / 30)); // Decay over 30 days
        const candidateScore = Math.max(0, 1 - (candidateRecency / 30));
        
        return (userScore + candidateScore) / 2;
    }

    /**
     * Get user interest embedding
     */
    private async getUserInterestEmbedding(userProfile: UserInterestProfile): Promise<number[] | null> {
        const cacheKey = `embedding:${userProfile.userId}`;
        
        if (this.embeddingCache.has(cacheKey)) {
            return this.embeddingCache.get(cacheKey);
        }

        try {
            // Generate embedding from user interests
            const embedding = this.generateInterestEmbedding(userProfile.interests);
            
            // Cache embedding
            this.embeddingCache.set(cacheKey, embedding);
            
            return embedding;
        } catch (error) {
            console.error('Error generating user interest embedding:', error);
            return null;
        }
    }

    /**
     * Generate interest embedding (simplified)
     */
    private generateInterestEmbedding(interests: string[]): number[] {
        const embedding = new Array(50).fill(0); // 50-dimensional embedding
        
        for (const interest of interests) {
            const interestEmbedding = this.interestEmbeddings[interest];
            if (interestEmbedding) {
                for (let i = 0; i < embedding.length; i++) {
                    embedding[i] += interestEmbedding[i];
                }
            }
        }
        
        // Normalize embedding
        const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
        if (norm > 0) {
            for (let i = 0; i < embedding.length; i++) {
                embedding[i] /= norm;
            }
        }
        
        return embedding;
    }

    /**
     * Calculate behavioral vector similarity
     */
    private calculateBehavioralVectorSimilarity(vector1: { [key: string]: number }, vector2: { [key: string]: number }): number {
        const keys = new Set([...Object.keys(vector1), ...Object.keys(vector2)]);
        
        if (keys.size === 0) return 0;
        
        let dotProduct = 0;
        let norm1 = 0;
        let norm2 = 0;
        
        for (const key of keys) {
            const val1 = vector1[key] || 0;
            const val2 = vector2[key] || 0;
            
            dotProduct += val1 * val2;
            norm1 += val1 * val1;
            norm2 += val2 * val2;
        }
        
        if (norm1 === 0 || norm2 === 0) return 0;
        
        return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
    }

    /**
     * Calculate cosine similarity
     */
    private calculateCosineSimilarity(vector1: number[], vector2: number[]): number {
        if (vector1.length !== vector2.length) return 0;
        
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
     * Get current season
     */
    private getCurrentSeason(): string {
        const month = new Date().getMonth();
        if (month >= 2 && month <= 4) return 'spring';
        if (month >= 5 && month <= 7) return 'summer';
        if (month >= 8 && month <= 10) return 'autumn';
        return 'winter';
    }

    /**
     * Initialize interest embeddings (simplified)
     */
    private initializeInterestEmbeddings(): void {
        const allInterests = this.categories.flatMap(cat => cat.interests);
        
        for (const interest of allInterests) {
            // Generate random embedding (in practice, would use pre-trained model)
            this.interestEmbeddings[interest] = Array.from({ length: 50 }, () => Math.random() - 0.5);
        }
    }

    /**
     * Initialize categories
     */
    private initializeCategories(): void {
        for (const category of this.categories) {
            this.categoryCache.set(category.name, category);
        }
    }

    /**
     * Create empty result
     */
    private createEmptyResult(): InterestSimilarityResult {
        return {
            score: 0,
            sharedInterests: [],
            categorySimilarity: { overall: 0, byCategory: {} },
            semanticSimilarity: 0,
            behavioralSimilarity: 0,
            temporalSimilarity: 0,
            metadata: {
                totalInterests: 0,
                sharedCount: 0,
                categoryOverlap: 0,
                interestDiversity: 0,
                recencyScore: 0
            }
        };
    }

    /**
     * Check if cache is expired
     */
    private isCacheExpired(cached: any): boolean {
        const cacheAge = Date.now() - cached.timestamp;
        return cacheAge > 600000; // 10 minutes
    }

    /**
     * Update similarity weights
     */
    updateWeights(newWeights: Partial<typeof this.weights>): void {
        this.weights = { ...this.weights, ...newWeights };
    }

    /**
     * Get current configuration
     */
    getConfiguration(): any {
        return {
            weights: this.weights,
            categories: this.categories.map(cat => ({
                name: cat.name,
                weight: cat.weight,
                interestCount: cat.interests.length
            }))
        };
    }

    /**
     * Clear caches
     */
    clearCaches(): void {
        this.interestCache.clear();
        this.categoryCache.clear();
        this.embeddingCache.clear();
        this.similarityCache.clear();
    }

    /**
     * Get cache statistics
     */
    getCacheStats(): any {
        return {
            interestCache: this.interestCache.size,
            categoryCache: this.categoryCache.size,
            embeddingCache: this.embeddingCache.size,
            similarityCache: this.similarityCache.size
        };
    }
}
