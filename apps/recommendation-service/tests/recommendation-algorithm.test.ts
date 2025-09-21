// Friend Recommendation Algorithm Tests
// Author: ChitLaq Development Team
// Date: 2024-01-15

import { FriendRecommendationAlgorithm } from '../src/algorithms/FriendRecommendation';
import { UniversityScoring } from '../src/scoring/UniversityScoring';
import { MutualConnectionScoring } from '../src/scoring/MutualConnectionScoring';
import { InterestSimilarity } from '../src/ml/InterestSimilarity';
import { RecommendationCache } from '../src/cache/RecommendationCache';
import { AlgorithmUtils } from '../src/utils/algorithm-utils';
import { Pool } from 'pg';

describe('Friend Recommendation Algorithm', () => {
    let algorithm: FriendRecommendationAlgorithm;
    let universityScoring: UniversityScoring;
    let mutualConnectionScoring: MutualConnectionScoring;
    let interestSimilarity: InterestSimilarity;
    let recommendationCache: RecommendationCache;
    let algorithmUtils: AlgorithmUtils;
    let dbPool: Pool;

    beforeAll(async () => {
        // Initialize database connection
        dbPool = new Pool({
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5432'),
            database: process.env.DB_NAME || 'chitlaq_test',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || 'password'
        });

        // Initialize components
        universityScoring = new UniversityScoring();
        mutualConnectionScoring = new MutualConnectionScoring();
        interestSimilarity = new InterestSimilarity();
        
        recommendationCache = new RecommendationCache({
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD,
            keyPrefix: 'test:rec:',
            defaultTTL: 300,
            maxMemory: '100mb',
            evictionPolicy: 'allkeys-lru'
        });

        algorithmUtils = new AlgorithmUtils(dbPool);

        // Initialize main algorithm
        algorithm = new FriendRecommendationAlgorithm(
            universityScoring,
            mutualConnectionScoring,
            interestSimilarity,
            recommendationCache,
            algorithmUtils
        );

        // Connect to cache
        await recommendationCache.connect();
    });

    afterAll(async () => {
        await recommendationCache.disconnect();
        await dbPool.end();
    });

    beforeEach(() => {
        // Clear caches before each test
        universityScoring.clearCaches();
        mutualConnectionScoring.clearCaches();
        interestSimilarity.clearCaches();
        algorithmUtils.clearCache();
    });

    describe('Algorithm Initialization', () => {
        test('should initialize with default configuration', () => {
            const config = algorithm.getConfiguration();
            
            expect(config.weights.university).toBe(0.40);
            expect(config.weights.mutualConnections).toBe(0.25);
            expect(config.weights.interests).toBe(0.20);
            expect(config.weights.engagement).toBe(0.10);
            expect(config.weights.geography).toBe(0.05);
            expect(config.version).toBe('2.13.0');
        });

        test('should update weights correctly', () => {
            const newWeights = {
                university: 0.50,
                mutualConnections: 0.30,
                interests: 0.15,
                engagement: 0.05,
                geography: 0.00
            };

            algorithm.updateWeights(newWeights);
            const config = algorithm.getConfiguration();

            expect(config.weights.university).toBe(0.50);
            expect(config.weights.mutualConnections).toBe(0.30);
            expect(config.weights.interests).toBe(0.15);
            expect(config.weights.engagement).toBe(0.05);
            expect(config.weights.geography).toBe(0.00);
        });
    });

    describe('Recommendation Generation', () => {
        test('should generate recommendations for valid user', async () => {
            const request = {
                userId: 'test-user-1',
                limit: 10,
                privacyLevel: 'university' as const
            };

            // Mock user profile
            jest.spyOn(algorithmUtils, 'getUserProfile').mockResolvedValue({
                user_id: 'test-user-1',
                email: 'test1@university.edu',
                university_id: 'university-1',
                university_name: 'Test University',
                department_id: 'dept-1',
                department_name: 'Computer Science',
                graduation_year: 2024,
                major: 'Computer Science',
                interests: ['Programming', 'AI', 'Web Development'],
                location: {
                    latitude: 40.7128,
                    longitude: -74.0060,
                    city: 'New York',
                    state: 'NY',
                    country: 'USA'
                },
                profile_completion_score: 85,
                last_active: new Date(),
                user_type: 'student',
                privacy_settings: {
                    profile_visibility: 'university',
                    university_visibility: 'public',
                    interest_visibility: 'public',
                    location_visibility: 'university'
                }
            });

            // Mock candidate users
            jest.spyOn(algorithmUtils, 'executeQuery').mockResolvedValue([
                {
                    id: 'candidate-1',
                    email: 'candidate1@university.edu',
                    university_id: 'university-1',
                    university_name: 'Test University',
                    department_id: 'dept-1',
                    department_name: 'Computer Science',
                    graduation_year: 2024,
                    major: 'Computer Science',
                    interests: ['Programming', 'AI', 'Machine Learning'],
                    location: {
                        latitude: 40.7128,
                        longitude: -74.0060,
                        city: 'New York',
                        state: 'NY',
                        country: 'USA'
                    },
                    profile_completion_score: 90,
                    last_active: new Date(),
                    user_type: 'student'
                },
                {
                    id: 'candidate-2',
                    email: 'candidate2@university.edu',
                    university_id: 'university-1',
                    university_name: 'Test University',
                    department_id: 'dept-2',
                    department_name: 'Mathematics',
                    graduation_year: 2023,
                    major: 'Mathematics',
                    interests: ['Mathematics', 'Statistics', 'Data Science'],
                    location: {
                        latitude: 40.7128,
                        longitude: -74.0060,
                        city: 'New York',
                        state: 'NY',
                        country: 'USA'
                    },
                    profile_completion_score: 75,
                    last_active: new Date(),
                    user_type: 'student'
                }
            ]);

            // Mock blocked users and existing connections
            jest.spyOn(algorithmUtils, 'getBlockedUsers').mockResolvedValue([]);
            jest.spyOn(algorithmUtils, 'getExistingConnections').mockResolvedValue([]);

            const result = await algorithm.generateRecommendations(request);

            expect(result).toBeDefined();
            expect(result.recommendations).toBeDefined();
            expect(result.recommendations.length).toBeGreaterThan(0);
            expect(result.algorithmVersion).toBe('2.13.0');
            expect(result.processingTime).toBeGreaterThan(0);
            expect(result.cacheHit).toBe(false);
            expect(result.metadata.factors).toBeDefined();
            expect(result.metadata.diversity).toBeGreaterThan(0);
        });

        test('should respect privacy level restrictions', async () => {
            const request = {
                userId: 'test-user-1',
                limit: 10,
                privacyLevel: 'friends' as const
            };

            // Mock user profile with restrictive privacy
            jest.spyOn(algorithmUtils, 'getUserProfile').mockResolvedValue({
                user_id: 'test-user-1',
                email: 'test1@university.edu',
                university_id: 'university-1',
                university_name: 'Test University',
                department_id: 'dept-1',
                department_name: 'Computer Science',
                graduation_year: 2024,
                major: 'Computer Science',
                interests: ['Programming', 'AI'],
                location: {
                    latitude: 40.7128,
                    longitude: -74.0060,
                    city: 'New York',
                    state: 'NY',
                    country: 'USA'
                },
                profile_completion_score: 85,
                last_active: new Date(),
                user_type: 'student',
                privacy_settings: {
                    profile_visibility: 'friends',
                    university_visibility: 'friends',
                    interest_visibility: 'friends',
                    location_visibility: 'friends'
                }
            });

            // Mock empty results for restrictive privacy
            jest.spyOn(algorithmUtils, 'executeQuery').mockResolvedValue([]);
            jest.spyOn(algorithmUtils, 'getBlockedUsers').mockResolvedValue([]);
            jest.spyOn(algorithmUtils, 'getExistingConnections').mockResolvedValue([]);

            const result = await algorithm.generateRecommendations(request);

            expect(result.recommendations).toHaveLength(0);
            expect(result.totalCandidates).toBe(0);
        });

        test('should exclude blocked users and existing connections', async () => {
            const request = {
                userId: 'test-user-1',
                limit: 10,
                privacyLevel: 'university' as const
            };

            // Mock user profile
            jest.spyOn(algorithmUtils, 'getUserProfile').mockResolvedValue({
                user_id: 'test-user-1',
                email: 'test1@university.edu',
                university_id: 'university-1',
                university_name: 'Test University',
                department_id: 'dept-1',
                department_name: 'Computer Science',
                graduation_year: 2024,
                major: 'Computer Science',
                interests: ['Programming', 'AI'],
                location: {
                    latitude: 40.7128,
                    longitude: -74.0060,
                    city: 'New York',
                    state: 'NY',
                    country: 'USA'
                },
                profile_completion_score: 85,
                last_active: new Date(),
                user_type: 'student',
                privacy_settings: {
                    profile_visibility: 'university',
                    university_visibility: 'public',
                    interest_visibility: 'public',
                    location_visibility: 'university'
                }
            });

            // Mock blocked users and existing connections
            jest.spyOn(algorithmUtils, 'getBlockedUsers').mockResolvedValue(['blocked-user-1', 'blocked-user-2']);
            jest.spyOn(algorithmUtils, 'getExistingConnections').mockResolvedValue(['existing-user-1', 'existing-user-2']);

            // Mock candidate users (should exclude blocked and existing)
            jest.spyOn(algorithmUtils, 'executeQuery').mockResolvedValue([
                {
                    id: 'valid-candidate-1',
                    email: 'valid1@university.edu',
                    university_id: 'university-1',
                    university_name: 'Test University',
                    department_id: 'dept-1',
                    department_name: 'Computer Science',
                    graduation_year: 2024,
                    major: 'Computer Science',
                    interests: ['Programming', 'AI'],
                    location: {
                        latitude: 40.7128,
                        longitude: -74.0060,
                        city: 'New York',
                        state: 'NY',
                        country: 'USA'
                    },
                    profile_completion_score: 90,
                    last_active: new Date(),
                    user_type: 'student'
                }
            ]);

            const result = await algorithm.generateRecommendations(request);

            expect(result.recommendations).toBeDefined();
            expect(result.recommendations.length).toBeGreaterThan(0);
            
            // Verify no blocked or existing users in recommendations
            const recommendationIds = result.recommendations.map(r => r.userId);
            expect(recommendationIds).not.toContain('blocked-user-1');
            expect(recommendationIds).not.toContain('blocked-user-2');
            expect(recommendationIds).not.toContain('existing-user-1');
            expect(recommendationIds).not.toContain('existing-user-2');
        });

        test('should apply diversity factor correctly', async () => {
            const request = {
                userId: 'test-user-1',
                limit: 10,
                diversityFactor: 0.5,
                privacyLevel: 'university' as const
            };

            // Mock user profile
            jest.spyOn(algorithmUtils, 'getUserProfile').mockResolvedValue({
                user_id: 'test-user-1',
                email: 'test1@university.edu',
                university_id: 'university-1',
                university_name: 'Test University',
                department_id: 'dept-1',
                department_name: 'Computer Science',
                graduation_year: 2024,
                major: 'Computer Science',
                interests: ['Programming', 'AI'],
                location: {
                    latitude: 40.7128,
                    longitude: -74.0060,
                    city: 'New York',
                    state: 'NY',
                    country: 'USA'
                },
                profile_completion_score: 85,
                last_active: new Date(),
                user_type: 'student',
                privacy_settings: {
                    profile_visibility: 'university',
                    university_visibility: 'public',
                    interest_visibility: 'public',
                    location_visibility: 'university'
                }
            });

            // Mock diverse candidate users
            jest.spyOn(algorithmUtils, 'executeQuery').mockResolvedValue([
                {
                    id: 'candidate-1',
                    email: 'candidate1@university.edu',
                    university_id: 'university-1',
                    university_name: 'Test University',
                    department_id: 'dept-1',
                    department_name: 'Computer Science',
                    graduation_year: 2024,
                    major: 'Computer Science',
                    interests: ['Programming', 'AI'],
                    location: {
                        latitude: 40.7128,
                        longitude: -74.0060,
                        city: 'New York',
                        state: 'NY',
                        country: 'USA'
                    },
                    profile_completion_score: 90,
                    last_active: new Date(),
                    user_type: 'student'
                },
                {
                    id: 'candidate-2',
                    email: 'candidate2@university.edu',
                    university_id: 'university-1',
                    university_name: 'Test University',
                    department_id: 'dept-2',
                    department_name: 'Mathematics',
                    graduation_year: 2024,
                    major: 'Mathematics',
                    interests: ['Mathematics', 'Statistics'],
                    location: {
                        latitude: 40.7128,
                        longitude: -74.0060,
                        city: 'New York',
                        state: 'NY',
                        country: 'USA'
                    },
                    profile_completion_score: 85,
                    last_active: new Date(),
                    user_type: 'student'
                },
                {
                    id: 'candidate-3',
                    email: 'candidate3@university.edu',
                    university_id: 'university-1',
                    university_name: 'Test University',
                    department_id: 'dept-3',
                    department_name: 'Physics',
                    graduation_year: 2024,
                    major: 'Physics',
                    interests: ['Physics', 'Research'],
                    location: {
                        latitude: 40.7128,
                        longitude: -74.0060,
                        city: 'New York',
                        state: 'NY',
                        country: 'USA'
                    },
                    profile_completion_score: 80,
                    last_active: new Date(),
                    user_type: 'student'
                }
            ]);

            jest.spyOn(algorithmUtils, 'getBlockedUsers').mockResolvedValue([]);
            jest.spyOn(algorithmUtils, 'getExistingConnections').mockResolvedValue([]);

            const result = await algorithm.generateRecommendations(request);

            expect(result.recommendations).toBeDefined();
            expect(result.metadata.diversity).toBeGreaterThan(0);
            
            // Verify diversity in recommendations
            const departments = result.recommendations.map(r => r.metadata.departmentName).filter(Boolean);
            const uniqueDepartments = new Set(departments);
            expect(uniqueDepartments.size).toBeGreaterThan(1);
        });
    });

    describe('Scoring Components', () => {
        test('university scoring should prioritize same university', async () => {
            const userProfile = {
                university_id: 'university-1',
                university_name: 'Test University',
                department_id: 'dept-1',
                department_name: 'Computer Science',
                graduation_year: 2024,
                major: 'Computer Science',
                location: {
                    latitude: 40.7128,
                    longitude: -74.0060,
                    city: 'New York',
                    state: 'NY',
                    country: 'USA'
                }
            };

            const sameUniversityCandidate = {
                university_id: 'university-1',
                university_name: 'Test University',
                department_id: 'dept-1',
                department_name: 'Computer Science',
                graduation_year: 2024,
                major: 'Computer Science',
                location: {
                    latitude: 40.7128,
                    longitude: -74.0060,
                    city: 'New York',
                    state: 'NY',
                    country: 'USA'
                }
            };

            const differentUniversityCandidate = {
                university_id: 'university-2',
                university_name: 'Different University',
                department_id: 'dept-1',
                department_name: 'Computer Science',
                graduation_year: 2024,
                major: 'Computer Science',
                location: {
                    latitude: 40.7128,
                    longitude: -74.0060,
                    city: 'New York',
                    state: 'NY',
                    country: 'USA'
                }
            };

            const sameUniversityScore = await universityScoring.calculateScore(userProfile, sameUniversityCandidate);
            const differentUniversityScore = await universityScoring.calculateScore(userProfile, differentUniversityCandidate);

            expect(sameUniversityScore).toBeGreaterThan(differentUniversityScore);
        });

        test('mutual connection scoring should work correctly', async () => {
            const mutualData = await mutualConnectionScoring.calculateScore('user-1', 'user-2');
            
            expect(mutualData).toBeDefined();
            expect(mutualData.score).toBeGreaterThanOrEqual(0);
            expect(mutualData.score).toBeLessThanOrEqual(1);
            expect(mutualData.count).toBeGreaterThanOrEqual(0);
            expect(mutualData.connections).toBeDefined();
            expect(mutualData.analysis).toBeDefined();
            expect(mutualData.metadata).toBeDefined();
        });

        test('interest similarity should calculate correctly', async () => {
            const userProfile = {
                userId: 'user-1',
                interests: ['Programming', 'AI', 'Web Development'],
                categories: {
                    'Technology': ['Programming', 'AI', 'Web Development'],
                    'Academic': ['Computer Science']
                },
                weights: {
                    'Programming': 0.8,
                    'AI': 0.7,
                    'Web Development': 0.6
                },
                behavioralData: {
                    postInterests: { 'Programming': 10, 'AI': 8, 'Web Development': 6 },
                    likeInterests: { 'Programming': 15, 'AI': 12, 'Web Development': 9 },
                    shareInterests: { 'Programming': 5, 'AI': 4, 'Web Development': 3 },
                    searchInterests: { 'Programming': 20, 'AI': 15, 'Web Development': 10 },
                    timeSpent: { 'Programming': 120, 'AI': 90, 'Web Development': 60 }
                },
                temporalData: {
                    recentInterests: ['Programming', 'AI'],
                    trendingInterests: ['AI', 'Machine Learning'],
                    seasonalInterests: {},
                    historicalInterests: {}
                },
                lastUpdated: new Date()
            };

            const candidateProfile = {
                userId: 'user-2',
                interests: ['Programming', 'AI', 'Machine Learning'],
                categories: {
                    'Technology': ['Programming', 'AI', 'Machine Learning'],
                    'Academic': ['Computer Science']
                },
                weights: {
                    'Programming': 0.7,
                    'AI': 0.9,
                    'Machine Learning': 0.8
                },
                behavioralData: {
                    postInterests: { 'Programming': 8, 'AI': 12, 'Machine Learning': 10 },
                    likeInterests: { 'Programming': 12, 'AI': 18, 'Machine Learning': 15 },
                    shareInterests: { 'Programming': 4, 'AI': 6, 'Machine Learning': 5 },
                    searchInterests: { 'Programming': 15, 'AI': 25, 'Machine Learning': 20 },
                    timeSpent: { 'Programming': 100, 'AI': 150, 'Machine Learning': 120 }
                },
                temporalData: {
                    recentInterests: ['AI', 'Machine Learning'],
                    trendingInterests: ['AI', 'Deep Learning'],
                    seasonalInterests: {},
                    historicalInterests: {}
                },
                lastUpdated: new Date()
            };

            const similarity = await interestSimilarity.calculateSimilarity(userProfile, candidateProfile);

            expect(similarity).toBeDefined();
            expect(similarity.score).toBeGreaterThan(0);
            expect(similarity.score).toBeLessThanOrEqual(1);
            expect(similarity.sharedInterests).toContain('Programming');
            expect(similarity.sharedInterests).toContain('AI');
            expect(similarity.categorySimilarity).toBeDefined();
            expect(similarity.semanticSimilarity).toBeGreaterThanOrEqual(0);
            expect(similarity.behavioralSimilarity).toBeGreaterThanOrEqual(0);
            expect(similarity.temporalSimilarity).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Caching', () => {
        test('should cache recommendations correctly', async () => {
            const request = {
                userId: 'test-user-1',
                limit: 10,
                privacyLevel: 'university' as const
            };

            // Mock user profile
            jest.spyOn(algorithmUtils, 'getUserProfile').mockResolvedValue({
                user_id: 'test-user-1',
                email: 'test1@university.edu',
                university_id: 'university-1',
                university_name: 'Test University',
                department_id: 'dept-1',
                department_name: 'Computer Science',
                graduation_year: 2024,
                major: 'Computer Science',
                interests: ['Programming', 'AI'],
                location: {
                    latitude: 40.7128,
                    longitude: -74.0060,
                    city: 'New York',
                    state: 'NY',
                    country: 'USA'
                },
                profile_completion_score: 85,
                last_active: new Date(),
                user_type: 'student',
                privacy_settings: {
                    profile_visibility: 'university',
                    university_visibility: 'public',
                    interest_visibility: 'public',
                    location_visibility: 'university'
                }
            });

            // Mock candidate users
            jest.spyOn(algorithmUtils, 'executeQuery').mockResolvedValue([
                {
                    id: 'candidate-1',
                    email: 'candidate1@university.edu',
                    university_id: 'university-1',
                    university_name: 'Test University',
                    department_id: 'dept-1',
                    department_name: 'Computer Science',
                    graduation_year: 2024,
                    major: 'Computer Science',
                    interests: ['Programming', 'AI'],
                    location: {
                        latitude: 40.7128,
                        longitude: -74.0060,
                        city: 'New York',
                        state: 'NY',
                        country: 'USA'
                    },
                    profile_completion_score: 90,
                    last_active: new Date(),
                    user_type: 'student'
                }
            ]);

            jest.spyOn(algorithmUtils, 'getBlockedUsers').mockResolvedValue([]);
            jest.spyOn(algorithmUtils, 'getExistingConnections').mockResolvedValue([]);

            // First call - should not be cached
            const result1 = await algorithm.generateRecommendations(request);
            expect(result1.cacheHit).toBe(false);

            // Second call - should be cached
            const result2 = await algorithm.generateRecommendations(request);
            expect(result2.cacheHit).toBe(true);
            expect(result2.processingTime).toBeLessThan(result1.processingTime);
        });
    });

    describe('Error Handling', () => {
        test('should handle invalid user ID', async () => {
            const request = {
                userId: 'invalid-user-id',
                limit: 10,
                privacyLevel: 'university' as const
            };

            jest.spyOn(algorithmUtils, 'getUserProfile').mockResolvedValue(null);

            await expect(algorithm.generateRecommendations(request)).rejects.toThrow('User profile not found');
        });

        test('should handle database errors gracefully', async () => {
            const request = {
                userId: 'test-user-1',
                limit: 10,
                privacyLevel: 'university' as const
            };

            jest.spyOn(algorithmUtils, 'getUserProfile').mockRejectedValue(new Error('Database connection failed'));

            await expect(algorithm.generateRecommendations(request)).rejects.toThrow('Failed to generate recommendations');
        });

        test('should handle cache errors gracefully', async () => {
            const request = {
                userId: 'test-user-1',
                limit: 10,
                privacyLevel: 'university' as const
            };

            // Mock user profile
            jest.spyOn(algorithmUtils, 'getUserProfile').mockResolvedValue({
                user_id: 'test-user-1',
                email: 'test1@university.edu',
                university_id: 'university-1',
                university_name: 'Test University',
                department_id: 'dept-1',
                department_name: 'Computer Science',
                graduation_year: 2024,
                major: 'Computer Science',
                interests: ['Programming', 'AI'],
                location: {
                    latitude: 40.7128,
                    longitude: -74.0060,
                    city: 'New York',
                    state: 'NY',
                    country: 'USA'
                },
                profile_completion_score: 85,
                last_active: new Date(),
                user_type: 'student',
                privacy_settings: {
                    profile_visibility: 'university',
                    university_visibility: 'public',
                    interest_visibility: 'public',
                    location_visibility: 'university'
                }
            });

            // Mock cache error
            jest.spyOn(recommendationCache, 'get').mockRejectedValue(new Error('Cache connection failed'));

            // Mock candidate users
            jest.spyOn(algorithmUtils, 'executeQuery').mockResolvedValue([
                {
                    id: 'candidate-1',
                    email: 'candidate1@university.edu',
                    university_id: 'university-1',
                    university_name: 'Test University',
                    department_id: 'dept-1',
                    department_name: 'Computer Science',
                    graduation_year: 2024,
                    major: 'Computer Science',
                    interests: ['Programming', 'AI'],
                    location: {
                        latitude: 40.7128,
                        longitude: -74.0060,
                        city: 'New York',
                        state: 'NY',
                        country: 'USA'
                    },
                    profile_completion_score: 90,
                    last_active: new Date(),
                    user_type: 'student'
                }
            ]);

            jest.spyOn(algorithmUtils, 'getBlockedUsers').mockResolvedValue([]);
            jest.spyOn(algorithmUtils, 'getExistingConnections').mockResolvedValue([]);

            // Should still work despite cache error
            const result = await algorithm.generateRecommendations(request);
            expect(result).toBeDefined();
            expect(result.cacheHit).toBe(false);
        });
    });

    describe('Performance', () => {
        test('should generate recommendations within acceptable time', async () => {
            const request = {
                userId: 'test-user-1',
                limit: 20,
                privacyLevel: 'university' as const
            };

            // Mock user profile
            jest.spyOn(algorithmUtils, 'getUserProfile').mockResolvedValue({
                user_id: 'test-user-1',
                email: 'test1@university.edu',
                university_id: 'university-1',
                university_name: 'Test University',
                department_id: 'dept-1',
                department_name: 'Computer Science',
                graduation_year: 2024,
                major: 'Computer Science',
                interests: ['Programming', 'AI'],
                location: {
                    latitude: 40.7128,
                    longitude: -74.0060,
                    city: 'New York',
                    state: 'NY',
                    country: 'USA'
                },
                profile_completion_score: 85,
                last_active: new Date(),
                user_type: 'student',
                privacy_settings: {
                    profile_visibility: 'university',
                    university_visibility: 'public',
                    interest_visibility: 'public',
                    location_visibility: 'university'
                }
            });

            // Mock multiple candidate users
            const candidates = Array.from({ length: 50 }, (_, i) => ({
                id: `candidate-${i}`,
                email: `candidate${i}@university.edu`,
                university_id: 'university-1',
                university_name: 'Test University',
                department_id: `dept-${(i % 5) + 1}`,
                department_name: `Department ${(i % 5) + 1}`,
                graduation_year: 2024,
                major: `Major ${(i % 5) + 1}`,
                interests: ['Programming', 'AI'],
                location: {
                    latitude: 40.7128,
                    longitude: -74.0060,
                    city: 'New York',
                    state: 'NY',
                    country: 'USA'
                },
                profile_completion_score: 80 + (i % 20),
                last_active: new Date(),
                user_type: 'student'
            }));

            jest.spyOn(algorithmUtils, 'executeQuery').mockResolvedValue(candidates);
            jest.spyOn(algorithmUtils, 'getBlockedUsers').mockResolvedValue([]);
            jest.spyOn(algorithmUtils, 'getExistingConnections').mockResolvedValue([]);

            const startTime = Date.now();
            const result = await algorithm.generateRecommendations(request);
            const endTime = Date.now();

            expect(result.processingTime).toBeLessThan(1000); // Should complete within 1 second
            expect(endTime - startTime).toBeLessThan(1000);
            expect(result.recommendations.length).toBeLessThanOrEqual(20);
        });
    });
});
