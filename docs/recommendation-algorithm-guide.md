# Friend Recommendation Algorithm Guide

## Overview

The ChitLaq Friend Recommendation Algorithm is a sophisticated system designed to suggest relevant connections based on university networks, mutual connections, and engagement patterns. This guide provides comprehensive documentation for understanding, implementing, and optimizing the recommendation system.

## Table of Contents

1. [Architecture](#architecture)
2. [Algorithm Components](#algorithm-components)
3. [Scoring System](#scoring-system)
4. [Implementation Guide](#implementation-guide)
5. [API Reference](#api-reference)
6. [Configuration](#configuration)
7. [Performance Optimization](#performance-optimization)
8. [Testing](#testing)
9. [Monitoring](#monitoring)
10. [Troubleshooting](#troubleshooting)

## Architecture

### High-Level Design

The recommendation system follows a modular architecture with the following components:

```
┌─────────────────────────────────────────────────────────────┐
│                    Recommendation Service                    │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   Algorithm     │  │   Scoring       │  │   Caching    │ │
│  │   Engine        │  │   Components    │  │   Layer      │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   Database      │  │   Redis Cache   │  │   Analytics  │ │
│  │   Layer         │  │                 │  │   Service    │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Request Processing**: User requests recommendations with privacy level and preferences
2. **Profile Retrieval**: System fetches user profile and university information
3. **Candidate Generation**: Database queries identify potential connections
4. **Scoring**: Multiple scoring components evaluate each candidate
5. **Ranking**: Weighted scores are combined and ranked
6. **Diversity**: Diversity factor is applied to ensure variety
7. **Caching**: Results are cached for performance
8. **Response**: Ranked recommendations are returned to client

## Algorithm Components

### 1. FriendRecommendationAlgorithm

The main algorithm orchestrator that coordinates all scoring components and applies weighting.

**Key Features:**
- Configurable scoring weights
- Privacy level enforcement
- Diversity injection
- Spam account filtering
- Recommendation explanation

**Configuration:**
```typescript
interface AlgorithmConfig {
    weights: {
        university: number;      // 0.40 (default)
        mutualConnections: number; // 0.25 (default)
        interests: number;       // 0.20 (default)
        engagement: number;      // 0.10 (default)
        geography: number;       // 0.05 (default)
    };
    version: string;
    maxCandidates: number;
    diversityFactor: number;
    spamThreshold: number;
}
```

### 2. UniversityScoring

Prioritizes recommendations within the user's academic network.

**Scoring Factors:**
- Same university (1.0)
- Same department (0.8)
- Same graduation year (0.6)
- Same major (0.4)
- Geographic proximity (0.2)

**Implementation:**
```typescript
class UniversityScoring {
    async calculateScore(userProfile: UserProfile, candidateProfile: UserProfile): Promise<number> {
        let score = 0;
        
        // University match
        if (userProfile.university_id === candidateProfile.university_id) {
            score += 1.0;
        }
        
        // Department match
        if (userProfile.department_id === candidateProfile.department_id) {
            score += 0.8;
        }
        
        // Graduation year match
        if (userProfile.graduation_year === candidateProfile.graduation_year) {
            score += 0.6;
        }
        
        // Major match
        if (userProfile.major === candidateProfile.major) {
            score += 0.4;
        }
        
        // Geographic proximity
        const distance = this.calculateDistance(userProfile.location, candidateProfile.location);
        if (distance < 10) { // Within 10km
            score += 0.2;
        }
        
        return Math.min(score, 1.0);
    }
}
```

### 3. MutualConnectionScoring

Leverages existing social ties to suggest relevant connections.

**Scoring Factors:**
- Number of mutual connections
- Strength of mutual connections
- Connection quality (profile completion, activity)
- Network density

**Implementation:**
```typescript
class MutualConnectionScoring {
    async calculateScore(userId: string, candidateId: string): Promise<MutualConnectionData> {
        const mutualConnections = await this.getMutualConnections(userId, candidateId);
        
        let score = 0;
        let totalStrength = 0;
        
        for (const connection of mutualConnections) {
            const strength = this.calculateConnectionStrength(connection);
            totalStrength += strength;
            score += strength * 0.1; // Each mutual adds to score
        }
        
        // Normalize score
        score = Math.min(score, 1.0);
        
        return {
            score,
            count: mutualConnections.length,
            connections: mutualConnections,
            analysis: this.analyzeConnectionPatterns(mutualConnections),
            metadata: {
                averageStrength: totalStrength / mutualConnections.length,
                networkDensity: this.calculateNetworkDensity(mutualConnections)
            }
        };
    }
}
```

### 4. InterestSimilarity

Uses vector embeddings and cosine similarity to match users based on shared interests.

**Scoring Factors:**
- Shared interests (Jaccard similarity)
- Interest categories
- Semantic similarity
- Behavioral patterns
- Temporal trends

**Implementation:**
```typescript
class InterestSimilarity {
    async calculateSimilarity(userProfile: InterestProfile, candidateProfile: InterestProfile): Promise<InterestSimilarityData> {
        // Calculate shared interests
        const sharedInterests = this.getSharedInterests(userProfile.interests, candidateProfile.interests);
        
        // Calculate Jaccard similarity
        const jaccardSimilarity = sharedInterests.length / 
            (userProfile.interests.length + candidateProfile.interests.length - sharedInterests.length);
        
        // Calculate semantic similarity using embeddings
        const semanticSimilarity = await this.calculateSemanticSimilarity(
            userProfile.interests, 
            candidateProfile.interests
        );
        
        // Calculate behavioral similarity
        const behavioralSimilarity = this.calculateBehavioralSimilarity(
            userProfile.behavioralData,
            candidateProfile.behavioralData
        );
        
        // Calculate temporal similarity
        const temporalSimilarity = this.calculateTemporalSimilarity(
            userProfile.temporalData,
            candidateProfile.temporalData
        );
        
        // Combine scores
        const finalScore = (
            jaccardSimilarity * 0.4 +
            semanticSimilarity * 0.3 +
            behavioralSimilarity * 0.2 +
            temporalSimilarity * 0.1
        );
        
        return {
            score: finalScore,
            sharedInterests,
            categorySimilarity: this.calculateCategorySimilarity(userProfile, candidateProfile),
            semanticSimilarity,
            behavioralSimilarity,
            temporalSimilarity
        };
    }
}
```

### 5. RecommendationCache

Implements a robust caching layer using Redis for performance optimization.

**Features:**
- Multi-tier caching strategy
- Configurable TTLs
- Cache warming
- Incremental updates
- Cache invalidation

**Implementation:**
```typescript
class RecommendationCache {
    async getRecommendations(userId: string, privacyLevel: string): Promise<RecommendationResult | null> {
        const cacheKey = this.generateCacheKey(userId, privacyLevel);
        const cached = await this.redis.get(cacheKey);
        
        if (cached) {
            return JSON.parse(cached);
        }
        
        return null;
    }
    
    async setRecommendations(userId: string, privacyLevel: string, recommendations: RecommendationResult, ttl: number = 300): Promise<void> {
        const cacheKey = this.generateCacheKey(userId, privacyLevel);
        await this.redis.setex(cacheKey, ttl, JSON.stringify(recommendations));
    }
    
    async invalidateUserRecommendations(userId: string): Promise<void> {
        const pattern = `recommendations:${userId}:*`;
        const keys = await this.redis.keys(pattern);
        
        if (keys.length > 0) {
            await this.redis.del(...keys);
        }
    }
}
```

## Scoring System

### Weighted Scoring Formula

The final recommendation score is calculated using a weighted combination of all scoring components:

```
Final Score = (University Score × 0.40) + 
              (Mutual Connections Score × 0.25) + 
              (Interest Similarity Score × 0.20) + 
              (Engagement Score × 0.10) + 
              (Geographic Score × 0.05)
```

### Score Normalization

All individual scores are normalized to a 0-1 range:

```typescript
function normalizeScore(score: number, min: number, max: number): number {
    return Math.max(0, Math.min(1, (score - min) / (max - min)));
}
```

### Diversity Factor

To ensure variety in recommendations, a diversity factor is applied:

```typescript
function applyDiversityInjection(recommendations: Recommendation[], diversityFactor: number): Recommendation[] {
    if (diversityFactor <= 0) return recommendations;
    
    const diversified = [];
    const usedCategories = new Set();
    
    for (const rec of recommendations) {
        const category = rec.metadata.departmentName || 'other';
        
        if (!usedCategories.has(category) || Math.random() < diversityFactor) {
            diversified.push(rec);
            usedCategories.add(category);
        }
    }
    
    return diversified;
}
```

## Implementation Guide

### 1. Basic Setup

```typescript
import { FriendRecommendationAlgorithm } from './algorithms/FriendRecommendation';
import { UniversityScoring } from './scoring/UniversityScoring';
import { MutualConnectionScoring } from './scoring/MutualConnectionScoring';
import { InterestSimilarity } from './ml/InterestSimilarity';
import { RecommendationCache } from './cache/RecommendationCache';

// Initialize components
const universityScoring = new UniversityScoring();
const mutualConnectionScoring = new MutualConnectionScoring();
const interestSimilarity = new InterestSimilarity();
const recommendationCache = new RecommendationCache({
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT),
    password: process.env.REDIS_PASSWORD
});

// Initialize main algorithm
const algorithm = new FriendRecommendationAlgorithm(
    universityScoring,
    mutualConnectionScoring,
    interestSimilarity,
    recommendationCache
);
```

### 2. Generating Recommendations

```typescript
// Generate recommendations for a user
const request = {
    userId: 'user-123',
    limit: 20,
    privacyLevel: 'university',
    diversityFactor: 0.3
};

const result = await algorithm.generateRecommendations(request);

console.log(`Generated ${result.recommendations.length} recommendations`);
console.log(`Processing time: ${result.processingTime}ms`);
console.log(`Cache hit: ${result.cacheHit}`);
```

### 3. Customizing Weights

```typescript
// Update algorithm weights
algorithm.updateWeights({
    university: 0.50,      // Increase university weight
    mutualConnections: 0.30, // Increase mutual connections weight
    interests: 0.15,       // Decrease interests weight
    engagement: 0.05,      // Decrease engagement weight
    geography: 0.00        // Remove geography factor
});
```

### 4. Handling Privacy Levels

```typescript
// Different privacy levels
const privacyLevels = {
    'university': 'Show only users from same university',
    'department': 'Show only users from same department',
    'year': 'Show only users from same graduation year',
    'public': 'Show all users (with privacy restrictions)'
};

// Generate recommendations with specific privacy level
const result = await algorithm.generateRecommendations({
    userId: 'user-123',
    limit: 20,
    privacyLevel: 'department'
});
```

## API Reference

### RecommendationRequest

```typescript
interface RecommendationRequest {
    userId: string;
    limit?: number;                    // Default: 20
    privacyLevel?: 'university' | 'department' | 'year' | 'public';
    diversityFactor?: number;          // Default: 0.3
    excludeUsers?: string[];           // Users to exclude
    includeFactors?: string[];         // Specific factors to include
    excludeFactors?: string[];         // Specific factors to exclude
}
```

### RecommendationResult

```typescript
interface RecommendationResult {
    recommendations: Recommendation[];
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
        spamFiltered: number;
    };
}
```

### Recommendation

```typescript
interface Recommendation {
    userId: string;
    email: string;
    universityName: string;
    departmentName: string;
    graduationYear: number;
    major: string;
    interests: string[];
    profileCompletionScore: number;
    lastActive: Date;
    userType: string;
    score: number;
    factors: {
        university: number;
        mutualConnections: number;
        interests: number;
        engagement: number;
        geography: number;
    };
    metadata: {
        mutualConnectionsCount: number;
        sharedInterestsCount: number;
        departmentName: string;
        universityName: string;
        graduationYear: number;
        major: string;
        profileCompletionScore: number;
        lastActive: Date;
        userType: string;
    };
    explanation: string;
}
```

## Configuration

### Environment Variables

```bash
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_DB=0

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=chitlaq
DB_USER=postgres
DB_PASSWORD=your_db_password

# Algorithm Configuration
RECOMMENDATION_CACHE_TTL=300
RECOMMENDATION_MAX_CANDIDATES=1000
RECOMMENDATION_DIVERSITY_FACTOR=0.3
RECOMMENDATION_SPAM_THRESHOLD=0.1

# Performance Configuration
RECOMMENDATION_BATCH_SIZE=100
RECOMMENDATION_PARALLEL_WORKERS=4
RECOMMENDATION_TIMEOUT_MS=5000
```

### Algorithm Configuration

```typescript
// Default configuration
const defaultConfig = {
    weights: {
        university: 0.40,
        mutualConnections: 0.25,
        interests: 0.20,
        engagement: 0.10,
        geography: 0.05
    },
    version: '2.13.0',
    maxCandidates: 1000,
    diversityFactor: 0.3,
    spamThreshold: 0.1,
    cacheTTL: 300,
    batchSize: 100,
    parallelWorkers: 4,
    timeoutMs: 5000
};
```

## Performance Optimization

### 1. Database Optimization

```sql
-- Create indexes for better performance
CREATE INDEX idx_user_profiles_university_department 
ON user_profiles(university_id, department_id);

CREATE INDEX idx_user_profiles_graduation_year 
ON user_profiles(graduation_year);

CREATE INDEX idx_user_profiles_interests 
ON user_profiles USING GIN(interests);

CREATE INDEX idx_social_relationships_follower_following 
ON social_relationships(follower_id, following_id, relationship_type, status);
```

### 2. Caching Strategy

```typescript
// Multi-tier caching
const cacheStrategy = {
    L1: {
        type: 'memory',
        ttl: 60,        // 1 minute
        maxSize: 1000
    },
    L2: {
        type: 'redis',
        ttl: 300,       // 5 minutes
        maxSize: 10000
    },
    L3: {
        type: 'database',
        ttl: 3600,      // 1 hour
        maxSize: 100000
    }
};
```

### 3. Batch Processing

```typescript
// Process recommendations in batches
async function processBatchRecommendations(userIds: string[]): Promise<Map<string, RecommendationResult>> {
    const results = new Map();
    const batchSize = 100;
    
    for (let i = 0; i < userIds.length; i += batchSize) {
        const batch = userIds.slice(i, i + batchSize);
        const batchPromises = batch.map(userId => 
            algorithm.generateRecommendations({ userId, limit: 20 })
        );
        
        const batchResults = await Promise.all(batchPromises);
        batchResults.forEach((result, index) => {
            results.set(batch[index], result);
        });
    }
    
    return results;
}
```

### 4. Parallel Processing

```typescript
// Use worker threads for CPU-intensive tasks
import { Worker } from 'worker_threads';

async function calculateScoresInParallel(candidates: UserProfile[], userProfile: UserProfile): Promise<Score[]> {
    const workers = [];
    const chunkSize = Math.ceil(candidates.length / 4);
    
    for (let i = 0; i < 4; i++) {
        const chunk = candidates.slice(i * chunkSize, (i + 1) * chunkSize);
        const worker = new Worker('./score-worker.js', {
            workerData: { chunk, userProfile }
        });
        workers.push(worker);
    }
    
    const results = await Promise.all(workers.map(worker => 
        new Promise((resolve, reject) => {
            worker.on('message', resolve);
            worker.on('error', reject);
        })
    ));
    
    return results.flat();
}
```

## Testing

### 1. Unit Tests

```typescript
describe('FriendRecommendationAlgorithm', () => {
    test('should generate recommendations for valid user', async () => {
        const request = {
            userId: 'test-user-1',
            limit: 10,
            privacyLevel: 'university'
        };
        
        const result = await algorithm.generateRecommendations(request);
        
        expect(result).toBeDefined();
        expect(result.recommendations).toBeDefined();
        expect(result.recommendations.length).toBeGreaterThan(0);
        expect(result.algorithmVersion).toBe('2.13.0');
    });
    
    test('should respect privacy level restrictions', async () => {
        const request = {
            userId: 'test-user-1',
            limit: 10,
            privacyLevel: 'friends'
        };
        
        const result = await algorithm.generateRecommendations(request);
        
        expect(result.recommendations).toHaveLength(0);
    });
});
```

### 2. Integration Tests

```typescript
describe('Recommendation Integration', () => {
    test('should work with real database and cache', async () => {
        // Setup test data
        await setupTestUsers();
        await setupTestRelationships();
        
        // Generate recommendations
        const result = await algorithm.generateRecommendations({
            userId: 'test-user-1',
            limit: 20,
            privacyLevel: 'university'
        });
        
        // Verify results
        expect(result.recommendations.length).toBeGreaterThan(0);
        expect(result.cacheHit).toBe(false);
        
        // Test caching
        const cachedResult = await algorithm.generateRecommendations({
            userId: 'test-user-1',
            limit: 20,
            privacyLevel: 'university'
        });
        
        expect(cachedResult.cacheHit).toBe(true);
        expect(cachedResult.processingTime).toBeLessThan(result.processingTime);
    });
});
```

### 3. Performance Tests

```typescript
describe('Recommendation Performance', () => {
    test('should generate recommendations within acceptable time', async () => {
        const startTime = Date.now();
        
        const result = await algorithm.generateRecommendations({
            userId: 'test-user-1',
            limit: 20,
            privacyLevel: 'university'
        });
        
        const endTime = Date.now();
        const processingTime = endTime - startTime;
        
        expect(processingTime).toBeLessThan(1000); // Should complete within 1 second
        expect(result.processingTime).toBeLessThan(1000);
    });
    
    test('should handle high load', async () => {
        const promises = Array.from({ length: 100 }, (_, i) => 
            algorithm.generateRecommendations({
                userId: `test-user-${i}`,
                limit: 20,
                privacyLevel: 'university'
            })
        );
        
        const results = await Promise.all(promises);
        
        expect(results).toHaveLength(100);
        results.forEach(result => {
            expect(result.recommendations).toBeDefined();
            expect(result.processingTime).toBeLessThan(2000);
        });
    });
});
```

## Monitoring

### 1. Key Metrics

```typescript
// Track recommendation metrics
const metrics = {
    // Performance metrics
    processingTime: result.processingTime,
    cacheHitRate: result.cacheHit ? 1 : 0,
    recommendationsGenerated: result.recommendations.length,
    
    // Quality metrics
    averageScore: result.recommendations.reduce((sum, rec) => sum + rec.score, 0) / result.recommendations.length,
    diversityScore: result.metadata.diversity,
    spamFiltered: result.metadata.spamFiltered,
    
    // User engagement metrics
    clickThroughRate: 0, // Tracked separately
    conversionRate: 0,   // Tracked separately
    userSatisfaction: 0  // Tracked separately
};
```

### 2. Alerting

```typescript
// Set up alerts for critical metrics
const alerts = {
    processingTime: {
        threshold: 2000,  // 2 seconds
        severity: 'warning'
    },
    cacheHitRate: {
        threshold: 0.8,   // 80%
        severity: 'info'
    },
    errorRate: {
        threshold: 0.05,  // 5%
        severity: 'critical'
    }
};
```

### 3. Dashboard

```typescript
// Create monitoring dashboard
const dashboard = {
    title: 'Recommendation System Dashboard',
    panels: [
        {
            title: 'Processing Time',
            type: 'line',
            query: 'avg(recommendation_processing_time)'
        },
        {
            title: 'Cache Hit Rate',
            type: 'gauge',
            query: 'avg(recommendation_cache_hit_rate)'
        },
        {
            title: 'Recommendations Generated',
            type: 'counter',
            query: 'sum(recommendations_generated)'
        },
        {
            title: 'Error Rate',
            type: 'line',
            query: 'rate(recommendation_errors)'
        }
    ]
};
```

## Troubleshooting

### Common Issues

#### 1. Slow Performance

**Symptoms:**
- High processing times (>2 seconds)
- Timeout errors
- High CPU usage

**Solutions:**
- Check database indexes
- Optimize cache configuration
- Reduce candidate pool size
- Implement batch processing

#### 2. Low Cache Hit Rate

**Symptoms:**
- Cache hit rate < 80%
- High database load
- Slow response times

**Solutions:**
- Increase cache TTL
- Implement cache warming
- Optimize cache keys
- Check cache eviction policies

#### 3. Poor Recommendation Quality

**Symptoms:**
- Low user engagement
- High bounce rate
- User complaints

**Solutions:**
- Adjust scoring weights
- Improve candidate filtering
- Add more scoring factors
- Implement A/B testing

#### 4. Memory Issues

**Symptoms:**
- High memory usage
- Out of memory errors
- Slow garbage collection

**Solutions:**
- Implement streaming processing
- Reduce batch sizes
- Optimize data structures
- Add memory monitoring

### Debugging Tools

#### 1. Recommendation Explanation

```typescript
// Get detailed explanation for a recommendation
const explanation = await algorithm.explainRecommendation('user-123', 'candidate-456');
console.log(explanation);
```

#### 2. Performance Profiling

```typescript
// Profile recommendation generation
const profile = await algorithm.profileRecommendationGeneration('user-123');
console.log(profile);
```

#### 3. Cache Analysis

```typescript
// Analyze cache performance
const cacheAnalysis = await recommendationCache.analyzePerformance();
console.log(cacheAnalysis);
```

### Best Practices

1. **Regular Monitoring**: Set up comprehensive monitoring and alerting
2. **Performance Testing**: Run regular performance tests
3. **A/B Testing**: Continuously test algorithm improvements
4. **User Feedback**: Collect and analyze user feedback
5. **Data Quality**: Ensure high-quality input data
6. **Privacy Compliance**: Maintain strict privacy controls
7. **Documentation**: Keep documentation up to date
8. **Version Control**: Use semantic versioning for algorithm changes

## Conclusion

The ChitLaq Friend Recommendation Algorithm provides a robust, scalable, and privacy-compliant solution for suggesting relevant connections. By following this guide and implementing the recommended best practices, you can ensure optimal performance and user satisfaction.

For additional support or questions, please refer to the API documentation or contact the development team.
