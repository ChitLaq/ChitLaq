// Friend Recommendation Algorithm Performance Benchmarks
// Author: ChitLaq Development Team
// Date: 2024-01-15

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const recommendationProcessingTime = new Trend('recommendation_processing_time');
const recommendationCacheHitRate = new Rate('recommendation_cache_hit_rate');
const recommendationErrorRate = new Rate('recommendation_error_rate');
const recommendationsGenerated = new Counter('recommendations_generated');
const recommendationQualityScore = new Trend('recommendation_quality_score');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_KEY = __ENV.API_KEY || 'test-api-key';
const TEST_USER_ID = __ENV.TEST_USER_ID || 'test-user-1';

// Test scenarios
export const scenarios = {
    // Baseline performance test
    baseline: {
        executor: 'constant-vus',
        vus: 10,
        duration: '2m',
        tags: { test_type: 'baseline' }
    },
    
    // Load test
    load: {
        executor: 'ramping-vus',
        startVUs: 0,
        stages: [
            { duration: '1m', target: 50 },
            { duration: '3m', target: 100 },
            { duration: '2m', target: 150 },
            { duration: '1m', target: 0 }
        ],
        tags: { test_type: 'load' }
    },
    
    // Stress test
    stress: {
        executor: 'ramping-vus',
        startVUs: 0,
        stages: [
            { duration: '1m', target: 100 },
            { duration: '2m', target: 200 },
            { duration: '2m', target: 300 },
            { duration: '1m', target: 0 }
        ],
        tags: { test_type: 'stress' }
    },
    
    // Spike test
    spike: {
        executor: 'ramping-vus',
        startVUs: 0,
        stages: [
            { duration: '1m', target: 50 },
            { duration: '30s', target: 500 },
            { duration: '1m', target: 50 },
            { duration: '1m', target: 0 }
        ],
        tags: { test_type: 'spike' }
    }
};

// Test data
const testUsers = [
    'test-user-1',
    'test-user-2',
    'test-user-3',
    'test-user-4',
    'test-user-5'
];

const privacyLevels = ['university', 'department', 'year', 'public'];
const limits = [10, 20, 50];

// Helper functions
function getRandomUser() {
    return testUsers[Math.floor(Math.random() * testUsers.length)];
}

function getRandomPrivacyLevel() {
    return privacyLevels[Math.floor(Math.random() * privacyLevels.length)];
}

function getRandomLimit() {
    return limits[Math.floor(Math.random() * limits.length)];
}

function calculateQualityScore(recommendations) {
    if (!recommendations || recommendations.length === 0) {
        return 0;
    }
    
    let totalScore = 0;
    let diversityScore = 0;
    let universityMatchScore = 0;
    
    const departments = new Set();
    const universities = new Set();
    
    recommendations.forEach(rec => {
        totalScore += rec.score || 0;
        
        if (rec.metadata && rec.metadata.departmentName) {
            departments.add(rec.metadata.departmentName);
        }
        
        if (rec.metadata && rec.metadata.universityName) {
            universities.add(rec.metadata.universityName);
        }
        
        if (rec.metadata && rec.metadata.universityName === 'Test University') {
            universityMatchScore += 1;
        }
    });
    
    const avgScore = totalScore / recommendations.length;
    const diversity = departments.size / recommendations.length;
    const universityMatch = universityMatchScore / recommendations.length;
    
    return (avgScore * 0.4 + diversity * 0.3 + universityMatch * 0.3);
}

// Main test function
export default function() {
    const userId = getRandomUser();
    const privacyLevel = getRandomPrivacyLevel();
    const limit = getRandomLimit();
    
    const startTime = Date.now();
    
    // Generate recommendations
    const response = http.post(`${BASE_URL}/api/recommendations/generate`, {
        userId: userId,
        limit: limit,
        privacyLevel: privacyLevel,
        diversityFactor: 0.3
    }, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`
        },
        timeout: '30s'
    });
    
    const endTime = Date.now();
    const processingTime = endTime - startTime;
    
    // Record metrics
    recommendationProcessingTime.add(processingTime);
    recommendationCacheHitRate.add(response.json('cacheHit') || false);
    recommendationErrorRate.add(response.status !== 200);
    
    if (response.status === 200) {
        const data = response.json();
        const recommendations = data.recommendations || [];
        
        recommendationsGenerated.add(recommendations.length);
        recommendationQualityScore.add(calculateQualityScore(recommendations));
        
        // Verify response structure
        check(response, {
            'status is 200': (r) => r.status === 200,
            'response time < 2s': (r) => r.timings.duration < 2000,
            'has recommendations': (r) => {
                const data = r.json();
                return data.recommendations && Array.isArray(data.recommendations);
            },
            'recommendations count > 0': (r) => {
                const data = r.json();
                return data.recommendations && data.recommendations.length > 0;
            },
            'has algorithm version': (r) => {
                const data = r.json();
                return data.algorithmVersion && typeof data.algorithmVersion === 'string';
            },
            'has processing time': (r) => {
                const data = r.json();
                return typeof data.processingTime === 'number' && data.processingTime > 0;
            },
            'has metadata': (r) => {
                const data = r.json();
                return data.metadata && typeof data.metadata === 'object';
            }
        });
        
        // Verify recommendation structure
        if (recommendations.length > 0) {
            const firstRec = recommendations[0];
            check(firstRec, {
                'recommendation has userId': (rec) => rec.userId && typeof rec.userId === 'string',
                'recommendation has score': (rec) => typeof rec.score === 'number' && rec.score >= 0 && rec.score <= 1,
                'recommendation has factors': (rec) => rec.factors && typeof rec.factors === 'object',
                'recommendation has metadata': (rec) => rec.metadata && typeof rec.metadata === 'object',
                'recommendation has explanation': (rec) => rec.explanation && typeof rec.explanation === 'string'
            });
        }
    } else {
        console.error(`Request failed with status ${response.status}: ${response.body}`);
    }
    
    // Small delay between requests
    sleep(0.1);
}

// Setup function
export function setup() {
    console.log('Setting up recommendation benchmarks...');
    
    // Verify API is accessible
    const healthCheck = http.get(`${BASE_URL}/health`);
    if (healthCheck.status !== 200) {
        throw new Error(`API health check failed: ${healthCheck.status}`);
    }
    
    console.log('API health check passed');
    
    // Warm up cache with some requests
    console.log('Warming up cache...');
    for (let i = 0; i < 5; i++) {
        const userId = getRandomUser();
        const response = http.post(`${BASE_URL}/api/recommendations/generate`, {
            userId: userId,
            limit: 20,
            privacyLevel: 'university'
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            }
        });
        
        if (response.status === 200) {
            console.log(`Cache warm-up request ${i + 1} successful`);
        } else {
            console.warn(`Cache warm-up request ${i + 1} failed: ${response.status}`);
        }
    }
    
    console.log('Cache warm-up completed');
    
    return {
        baseUrl: BASE_URL,
        apiKey: API_KEY,
        testUserId: TEST_USER_ID
    };
}

// Teardown function
export function teardown(data) {
    console.log('Cleaning up recommendation benchmarks...');
    
    // Clear cache if needed
    const clearCache = http.post(`${BASE_URL}/api/recommendations/clear-cache`, {}, {
        headers: {
            'Authorization': `Bearer ${API_KEY}`
        }
    });
    
    if (clearCache.status === 200) {
        console.log('Cache cleared successfully');
    } else {
        console.warn(`Cache clear failed: ${clearCache.status}`);
    }
    
    console.log('Recommendation benchmarks completed');
}

// Thresholds for different test types
export const thresholds = {
    // Baseline thresholds
    baseline: {
        'recommendation_processing_time': ['p(95)<1000', 'p(99)<2000'],
        'recommendation_error_rate': ['rate<0.01'],
        'recommendation_cache_hit_rate': ['rate>0.8'],
        'recommendation_quality_score': ['avg>0.7']
    },
    
    // Load test thresholds
    load: {
        'recommendation_processing_time': ['p(95)<1500', 'p(99)<3000'],
        'recommendation_error_rate': ['rate<0.05'],
        'recommendation_cache_hit_rate': ['rate>0.7'],
        'recommendation_quality_score': ['avg>0.6']
    },
    
    // Stress test thresholds
    stress: {
        'recommendation_processing_time': ['p(95)<2000', 'p(99)<5000'],
        'recommendation_error_rate': ['rate<0.1'],
        'recommendation_cache_hit_rate': ['rate>0.5'],
        'recommendation_quality_score': ['avg>0.5']
    },
    
    // Spike test thresholds
    spike: {
        'recommendation_processing_time': ['p(95)<3000', 'p(99)<10000'],
        'recommendation_error_rate': ['rate<0.2'],
        'recommendation_cache_hit_rate': ['rate>0.3'],
        'recommendation_quality_score': ['avg>0.4']
    }
};

// Additional test scenarios
export const additionalScenarios = {
    // University-specific recommendations
    universityRecommendations: {
        executor: 'constant-vus',
        vus: 20,
        duration: '1m',
        tags: { test_type: 'university' },
        exec: 'testUniversityRecommendations'
    },
    
    // Department-specific recommendations
    departmentRecommendations: {
        executor: 'constant-vus',
        vus: 20,
        duration: '1m',
        tags: { test_type: 'department' },
        exec: 'testDepartmentRecommendations'
    },
    
    // Interest-based recommendations
    interestRecommendations: {
        executor: 'constant-vus',
        vus: 20,
        duration: '1m',
        tags: { test_type: 'interest' },
        exec: 'testInterestRecommendations'
    },
    
    // Mutual connection recommendations
    mutualConnectionRecommendations: {
        executor: 'constant-vus',
        vus: 20,
        duration: '1m',
        tags: { test_type: 'mutual' },
        exec: 'testMutualConnectionRecommendations'
    }
};

// Test university recommendations
export function testUniversityRecommendations() {
    const userId = getRandomUser();
    
    const response = http.post(`${BASE_URL}/api/recommendations/generate`, {
        userId: userId,
        limit: 20,
        privacyLevel: 'university',
        diversityFactor: 0.3
    }, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`
        }
    });
    
    if (response.status === 200) {
        const data = response.json();
        const recommendations = data.recommendations || [];
        
        // Verify all recommendations are from the same university
        const universityMatches = recommendations.filter(rec => 
            rec.metadata && rec.metadata.universityName === 'Test University'
        );
        
        check(response, {
            'university recommendations match': (r) => universityMatches.length === recommendations.length,
            'university recommendations quality': (r) => calculateQualityScore(recommendations) > 0.7
        });
    }
    
    sleep(0.1);
}

// Test department recommendations
export function testDepartmentRecommendations() {
    const userId = getRandomUser();
    
    const response = http.post(`${BASE_URL}/api/recommendations/generate`, {
        userId: userId,
        limit: 20,
        privacyLevel: 'department',
        diversityFactor: 0.3
    }, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`
        }
    });
    
    if (response.status === 200) {
        const data = response.json();
        const recommendations = data.recommendations || [];
        
        // Verify all recommendations are from the same department
        const departmentMatches = recommendations.filter(rec => 
            rec.metadata && rec.metadata.departmentName === 'Computer Science'
        );
        
        check(response, {
            'department recommendations match': (r) => departmentMatches.length === recommendations.length,
            'department recommendations quality': (r) => calculateQualityScore(recommendations) > 0.6
        });
    }
    
    sleep(0.1);
}

// Test interest-based recommendations
export function testInterestRecommendations() {
    const userId = getRandomUser();
    
    const response = http.post(`${BASE_URL}/api/recommendations/generate`, {
        userId: userId,
        limit: 20,
        privacyLevel: 'university',
        diversityFactor: 0.3,
        includeFactors: ['interests']
    }, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`
        }
    });
    
    if (response.status === 200) {
        const data = response.json();
        const recommendations = data.recommendations || [];
        
        // Verify recommendations have shared interests
        const interestMatches = recommendations.filter(rec => 
            rec.metadata && rec.metadata.sharedInterestsCount > 0
        );
        
        check(response, {
            'interest recommendations have shared interests': (r) => interestMatches.length > 0,
            'interest recommendations quality': (r) => calculateQualityScore(recommendations) > 0.5
        });
    }
    
    sleep(0.1);
}

// Test mutual connection recommendations
export function testMutualConnectionRecommendations() {
    const userId = getRandomUser();
    
    const response = http.post(`${BASE_URL}/api/recommendations/generate`, {
        userId: userId,
        limit: 20,
        privacyLevel: 'university',
        diversityFactor: 0.3,
        includeFactors: ['mutualConnections']
    }, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`
        }
    });
    
    if (response.status === 200) {
        const data = response.json();
        const recommendations = data.recommendations || [];
        
        // Verify recommendations have mutual connections
        const mutualMatches = recommendations.filter(rec => 
            rec.metadata && rec.metadata.mutualConnectionsCount > 0
        );
        
        check(response, {
            'mutual connection recommendations have mutuals': (r) => mutualMatches.length > 0,
            'mutual connection recommendations quality': (r) => calculateQualityScore(recommendations) > 0.5
        });
    }
    
    sleep(0.1);
}

// Performance analysis functions
export function analyzePerformance(data) {
    const analysis = {
        processingTime: {
            avg: data.metrics.recommendation_processing_time.avg,
            p95: data.metrics.recommendation_processing_time.p95,
            p99: data.metrics.recommendation_processing_time.p99,
            max: data.metrics.recommendation_processing_time.max
        },
        cacheHitRate: data.metrics.recommendation_cache_hit_rate.rate,
        errorRate: data.metrics.recommendation_error_rate.rate,
        recommendationsGenerated: data.metrics.recommendations_generated.count,
        qualityScore: {
            avg: data.metrics.recommendation_quality_score.avg,
            min: data.metrics.recommendation_quality_score.min,
            max: data.metrics.recommendation_quality_score.max
        }
    };
    
    // Performance recommendations
    const recommendations = [];
    
    if (analysis.processingTime.p95 > 2000) {
        recommendations.push('Consider optimizing database queries or increasing cache TTL');
    }
    
    if (analysis.cacheHitRate < 0.8) {
        recommendations.push('Consider implementing cache warming or increasing cache TTL');
    }
    
    if (analysis.errorRate > 0.05) {
        recommendations.push('Investigate and fix error sources');
    }
    
    if (analysis.qualityScore.avg < 0.6) {
        recommendations.push('Consider adjusting algorithm weights or improving candidate filtering');
    }
    
    return {
        analysis,
        recommendations
    };
}

// Export configuration for different environments
export const environments = {
    development: {
        BASE_URL: 'http://localhost:3000',
        API_KEY: 'dev-api-key',
        TEST_USER_ID: 'dev-user-1'
    },
    staging: {
        BASE_URL: 'https://staging.chitlaq.com',
        API_KEY: 'staging-api-key',
        TEST_USER_ID: 'staging-user-1'
    },
    production: {
        BASE_URL: 'https://api.chitlaq.com',
        API_KEY: 'prod-api-key',
        TEST_USER_ID: 'prod-user-1'
    }
};
