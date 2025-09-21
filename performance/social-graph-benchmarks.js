// Social Graph Performance Benchmarks
// Author: ChitLaq Development Team
// Date: 2024-01-15

const { performance } = require('perf_hooks');
const Redis = require('redis');
const { Pool } = require('pg');

// Configuration
const config = {
    database: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'chitlaq',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'password'
    },
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || null
    },
    benchmarks: {
        iterations: 1000,
        warmupIterations: 100,
        concurrency: 10
    }
};

// Database and Redis connections
let dbPool;
let redisClient;

// Initialize connections
async function initializeConnections() {
    dbPool = new Pool(config.database);
    redisClient = Redis.createClient(config.redis);
    await redisClient.connect();
}

// Cleanup connections
async function cleanupConnections() {
    if (dbPool) await dbPool.end();
    if (redisClient) await redisClient.quit();
}

// Benchmark utilities
class Benchmark {
    constructor(name) {
        this.name = name;
        this.results = [];
    }

    async run(fn, iterations = config.benchmarks.iterations) {
        console.log(`Running benchmark: ${this.name}`);
        
        // Warmup
        for (let i = 0; i < config.benchmarks.warmupIterations; i++) {
            await fn();
        }
        
        // Actual benchmark
        const start = performance.now();
        for (let i = 0; i < iterations; i++) {
            const iterationStart = performance.now();
            await fn();
            const iterationEnd = performance.now();
            this.results.push(iterationEnd - iterationStart);
        }
        const end = performance.now();
        
        const totalTime = end - start;
        const avgTime = this.results.reduce((a, b) => a + b, 0) / this.results.length;
        const minTime = Math.min(...this.results);
        const maxTime = Math.max(...this.results);
        const p95Time = this.results.sort((a, b) => a - b)[Math.floor(this.results.length * 0.95)];
        const p99Time = this.results.sort((a, b) => a - b)[Math.floor(this.results.length * 0.99)];
        
        return {
            name: this.name,
            iterations,
            totalTime,
            avgTime,
            minTime,
            maxTime,
            p95Time,
            p99Time,
            throughput: iterations / (totalTime / 1000)
        };
    }
}

// Database benchmark functions
class DatabaseBenchmarks {
    static async createRelationship() {
        const client = await dbPool.connect();
        try {
            await client.query(`
                SELECT create_relationship(
                    gen_random_uuid(),
                    gen_random_uuid(),
                    'follow',
                    '{"confidence": 80}'::jsonb
                )
            `);
        } finally {
            client.release();
        }
    }

    static async getMutualConnections() {
        const client = await dbPool.connect();
        try {
            const user1 = await client.query('SELECT id FROM users LIMIT 1');
            const user2 = await client.query('SELECT id FROM users OFFSET 1 LIMIT 1');
            
            if (user1.rows.length > 0 && user2.rows.length > 0) {
                await client.query(`
                    SELECT * FROM get_mutual_connections($1, $2, 50)
                `, [user1.rows[0].id, user2.rows[0].id]);
            }
        } finally {
            client.release();
        }
    }

    static async getConnectionRecommendations() {
        const client = await dbPool.connect();
        try {
            const user = await client.query('SELECT id FROM users LIMIT 1');
            if (user.rows.length > 0) {
                await client.query(`
                    SELECT * FROM get_connection_recommendations($1, 20, ARRAY['mutual_connection', 'university'])
                `, [user.rows[0].id]);
            }
        } finally {
            client.release();
        }
    }

    static async calculateNetworkDensity() {
        const client = await dbPool.connect();
        try {
            const user = await client.query('SELECT id FROM users LIMIT 1');
            if (user.rows.length > 0) {
                await client.query(`
                    SELECT calculate_network_density($1)
                `, [user.rows[0].id]);
            }
        } finally {
            client.release();
        }
    }

    static async findShortestPath() {
        const client = await dbPool.connect();
        try {
            const users = await client.query('SELECT id FROM users LIMIT 2');
            if (users.rows.length >= 2) {
                await client.query(`
                    SELECT * FROM find_shortest_path($1, $2, 6)
                `, [users.rows[0].id, users.rows[1].id]);
            }
        } finally {
            client.release();
        }
    }

    static async getRelationshipStatistics() {
        const client = await dbPool.connect();
        try {
            const user = await client.query('SELECT id FROM users LIMIT 1');
            if (user.rows.length > 0) {
                await client.query(`
                    SELECT * FROM get_relationship_statistics($1)
                `, [user.rows[0].id]);
            }
        } finally {
            client.release();
        }
    }

    static async calculateInfluenceScore() {
        const client = await dbPool.connect();
        try {
            const user = await client.query('SELECT id FROM users LIMIT 1');
            if (user.rows.length > 0) {
                await client.query(`
                    SELECT calculate_influence_score($1)
                `, [user.rows[0].id]);
            }
        } finally {
            client.release();
        }
    }

    static async getRelationshipTimeline() {
        const client = await dbPool.connect();
        try {
            const user = await client.query('SELECT id FROM users LIMIT 1');
            if (user.rows.length > 0) {
                await client.query(`
                    SELECT * FROM get_relationship_timeline($1, 30)
                `, [user.rows[0].id]);
            }
        } finally {
            client.release();
        }
    }

    static async getRelationshipAnalytics() {
        const client = await dbPool.connect();
        try {
            const user = await client.query('SELECT id FROM users LIMIT 1');
            if (user.rows.length > 0) {
                await client.query(`
                    SELECT * FROM get_relationship_analytics($1, 'weekly')
                `, [user.rows[0].id]);
            }
        } finally {
            client.release();
        }
    }
}

// Redis benchmark functions
class RedisBenchmarks {
    static async setRelationship() {
        const key = `relationship:${Math.random()}:${Math.random()}`;
        const value = JSON.stringify({
            type: 'follow',
            strength: 80,
            created_at: new Date().toISOString()
        });
        await redisClient.set(key, value, { EX: 3600 });
    }

    static async getRelationship() {
        const key = `relationship:${Math.random()}:${Math.random()}`;
        await redisClient.get(key);
    }

    static async setUserConnections() {
        const key = `connections:${Math.random()}:followers`;
        const value = JSON.stringify({
            count: 150,
            users: Array.from({ length: 150 }, () => Math.random())
        });
        await redisClient.set(key, value, { EX: 1800 });
    }

    static async getUserConnections() {
        const key = `connections:${Math.random()}:followers`;
        await redisClient.get(key);
    }

    static async setMutualConnections() {
        const key = `mutual:${Math.random()}:${Math.random()}`;
        const value = JSON.stringify({
            count: 25,
            users: Array.from({ length: 25 }, () => Math.random())
        });
        await redisClient.set(key, value, { EX: 900 });
    }

    static async getMutualConnections() {
        const key = `mutual:${Math.random()}:${Math.random()}`;
        await redisClient.get(key);
    }

    static async setRecommendations() {
        const key = `recommendations:${Math.random()}:mutual_connection`;
        const value = JSON.stringify({
            recommendations: Array.from({ length: 20 }, () => ({
                user_id: Math.random(),
                confidence: Math.floor(Math.random() * 100),
                reasons: ['Mutual connections', 'Same university']
            }))
        });
        await redisClient.set(key, value, { EX: 1800 });
    }

    static async getRecommendations() {
        const key = `recommendations:${Math.random()}:mutual_connection`;
        await redisClient.get(key);
    }

    static async setUserNode() {
        const key = `node:${Math.random()}`;
        const value = JSON.stringify({
            user_id: Math.random(),
            connections: {
                followers: 150,
                following: 200,
                blocked: 5
            },
            last_updated: new Date().toISOString()
        });
        await redisClient.set(key, value, { EX: 3600 });
    }

    static async getUserNode() {
        const key = `node:${Math.random()}`;
        await redisClient.get(key);
    }

    static async setNetworkMetrics() {
        const key = `metrics:${Math.random()}`;
        const value = JSON.stringify({
            density: 0.75,
            influence_score: 85,
            connection_count: 350,
            last_calculated: new Date().toISOString()
        });
        await redisClient.set(key, value, { EX: 7200 });
    }

    static async getNetworkMetrics() {
        const key = `metrics:${Math.random()}`;
        await redisClient.get(key);
    }
}

// Concurrent benchmark functions
class ConcurrentBenchmarks {
    static async concurrentRelationshipCreation() {
        const promises = Array.from({ length: config.benchmarks.concurrency }, async () => {
            const client = await dbPool.connect();
            try {
                await client.query(`
                    SELECT create_relationship(
                        gen_random_uuid(),
                        gen_random_uuid(),
                        'follow',
                        '{"confidence": 80}'::jsonb
                    )
                `);
            } finally {
                client.release();
            }
        });
        await Promise.all(promises);
    }

    static async concurrentRedisOperations() {
        const promises = Array.from({ length: config.benchmarks.concurrency }, async () => {
            const key = `concurrent:${Math.random()}`;
            const value = JSON.stringify({ test: 'data', timestamp: Date.now() });
            await redisClient.set(key, value, { EX: 60 });
            await redisClient.get(key);
        });
        await Promise.all(promises);
    }

    static async concurrentRecommendationGeneration() {
        const promises = Array.from({ length: config.benchmarks.concurrency }, async () => {
            const client = await dbPool.connect();
            try {
                const user = await client.query('SELECT id FROM users LIMIT 1');
                if (user.rows.length > 0) {
                    await client.query(`
                        SELECT * FROM get_connection_recommendations($1, 10, ARRAY['mutual_connection'])
                    `, [user.rows[0].id]);
                }
            } finally {
                client.release();
            }
        });
        await Promise.all(promises);
    }
}

// Memory usage tracking
class MemoryTracker {
    static getMemoryUsage() {
        const usage = process.memoryUsage();
        return {
            rss: usage.rss / 1024 / 1024, // MB
            heapTotal: usage.heapTotal / 1024 / 1024, // MB
            heapUsed: usage.heapUsed / 1024 / 1024, // MB
            external: usage.external / 1024 / 1024, // MB
            arrayBuffers: usage.arrayBuffers / 1024 / 1024 // MB
        };
    }

    static logMemoryUsage(label) {
        const usage = this.getMemoryUsage();
        console.log(`${label} Memory Usage:`, usage);
        return usage;
    }
}

// Main benchmark runner
async function runBenchmarks() {
    console.log('Starting Social Graph Performance Benchmarks...\n');
    
    await initializeConnections();
    
    const results = [];
    
    try {
        // Database benchmarks
        console.log('=== Database Benchmarks ===\n');
        
        const dbBenchmarks = [
            { name: 'Create Relationship', fn: DatabaseBenchmarks.createRelationship },
            { name: 'Get Mutual Connections', fn: DatabaseBenchmarks.getMutualConnections },
            { name: 'Get Connection Recommendations', fn: DatabaseBenchmarks.getConnectionRecommendations },
            { name: 'Calculate Network Density', fn: DatabaseBenchmarks.calculateNetworkDensity },
            { name: 'Find Shortest Path', fn: DatabaseBenchmarks.findShortestPath },
            { name: 'Get Relationship Statistics', fn: DatabaseBenchmarks.getRelationshipStatistics },
            { name: 'Calculate Influence Score', fn: DatabaseBenchmarks.calculateInfluenceScore },
            { name: 'Get Relationship Timeline', fn: DatabaseBenchmarks.getRelationshipTimeline },
            { name: 'Get Relationship Analytics', fn: DatabaseBenchmarks.getRelationshipAnalytics }
        ];
        
        for (const benchmark of dbBenchmarks) {
            const benchmarkRunner = new Benchmark(benchmark.name);
            const result = await benchmarkRunner.run(benchmark.fn);
            results.push(result);
            console.log(`${result.name}: ${result.avgTime.toFixed(2)}ms avg, ${result.throughput.toFixed(2)} ops/sec\n`);
        }
        
        // Redis benchmarks
        console.log('=== Redis Benchmarks ===\n');
        
        const redisBenchmarks = [
            { name: 'Set Relationship', fn: RedisBenchmarks.setRelationship },
            { name: 'Get Relationship', fn: RedisBenchmarks.getRelationship },
            { name: 'Set User Connections', fn: RedisBenchmarks.setUserConnections },
            { name: 'Get User Connections', fn: RedisBenchmarks.getUserConnections },
            { name: 'Set Mutual Connections', fn: RedisBenchmarks.setMutualConnections },
            { name: 'Get Mutual Connections', fn: RedisBenchmarks.getMutualConnections },
            { name: 'Set Recommendations', fn: RedisBenchmarks.setRecommendations },
            { name: 'Get Recommendations', fn: RedisBenchmarks.getRecommendations },
            { name: 'Set User Node', fn: RedisBenchmarks.setUserNode },
            { name: 'Get User Node', fn: RedisBenchmarks.getUserNode },
            { name: 'Set Network Metrics', fn: RedisBenchmarks.setNetworkMetrics },
            { name: 'Get Network Metrics', fn: RedisBenchmarks.getNetworkMetrics }
        ];
        
        for (const benchmark of redisBenchmarks) {
            const benchmarkRunner = new Benchmark(benchmark.name);
            const result = await benchmarkRunner.run(benchmark.fn);
            results.push(result);
            console.log(`${result.name}: ${result.avgTime.toFixed(2)}ms avg, ${result.throughput.toFixed(2)} ops/sec\n`);
        }
        
        // Concurrent benchmarks
        console.log('=== Concurrent Benchmarks ===\n');
        
        const concurrentBenchmarks = [
            { name: 'Concurrent Relationship Creation', fn: ConcurrentBenchmarks.concurrentRelationshipCreation },
            { name: 'Concurrent Redis Operations', fn: ConcurrentBenchmarks.concurrentRedisOperations },
            { name: 'Concurrent Recommendation Generation', fn: ConcurrentBenchmarks.concurrentRecommendationGeneration }
        ];
        
        for (const benchmark of concurrentBenchmarks) {
            const benchmarkRunner = new Benchmark(benchmark.name);
            const result = await benchmarkRunner.run(benchmark.fn, 100); // Fewer iterations for concurrent tests
            results.push(result);
            console.log(`${result.name}: ${result.avgTime.toFixed(2)}ms avg, ${result.throughput.toFixed(2)} ops/sec\n`);
        }
        
        // Memory usage tracking
        console.log('=== Memory Usage ===\n');
        MemoryTracker.logMemoryUsage('Final');
        
        // Generate report
        generateReport(results);
        
    } catch (error) {
        console.error('Benchmark error:', error);
    } finally {
        await cleanupConnections();
    }
}

// Generate performance report
function generateReport(results) {
    console.log('\n=== Performance Report ===\n');
    
    // Sort results by throughput
    results.sort((a, b) => b.throughput - a.throughput);
    
    console.log('Top 10 Fastest Operations:');
    results.slice(0, 10).forEach((result, index) => {
        console.log(`${index + 1}. ${result.name}: ${result.throughput.toFixed(2)} ops/sec`);
    });
    
    console.log('\nTop 10 Slowest Operations:');
    results.slice(-10).reverse().forEach((result, index) => {
        console.log(`${index + 1}. ${result.name}: ${result.throughput.toFixed(2)} ops/sec`);
    });
    
    // Calculate averages
    const dbResults = results.filter(r => r.name.includes('Create') || r.name.includes('Get') || r.name.includes('Calculate'));
    const redisResults = results.filter(r => r.name.includes('Set') || r.name.includes('Get'));
    const concurrentResults = results.filter(r => r.name.includes('Concurrent'));
    
    console.log('\n=== Summary Statistics ===\n');
    console.log(`Database Operations Average: ${(dbResults.reduce((a, b) => a + b.throughput, 0) / dbResults.length).toFixed(2)} ops/sec`);
    console.log(`Redis Operations Average: ${(redisResults.reduce((a, b) => a + b.throughput, 0) / redisResults.length).toFixed(2)} ops/sec`);
    console.log(`Concurrent Operations Average: ${(concurrentResults.reduce((a, b) => a + b.throughput, 0) / concurrentResults.length).toFixed(2)} ops/sec`);
    
    // Performance recommendations
    console.log('\n=== Performance Recommendations ===\n');
    
    const slowOperations = results.filter(r => r.throughput < 100);
    if (slowOperations.length > 0) {
        console.log('Slow operations that need optimization:');
        slowOperations.forEach(op => {
            console.log(`- ${op.name}: ${op.throughput.toFixed(2)} ops/sec`);
        });
    }
    
    const highLatencyOperations = results.filter(r => r.avgTime > 100);
    if (highLatencyOperations.length > 0) {
        console.log('\nHigh latency operations:');
        highLatencyOperations.forEach(op => {
            console.log(`- ${op.name}: ${op.avgTime.toFixed(2)}ms average`);
        });
    }
    
    // Save results to file
    const fs = require('fs');
    const reportData = {
        timestamp: new Date().toISOString(),
        results: results,
        summary: {
            totalOperations: results.length,
            averageThroughput: results.reduce((a, b) => a + b.throughput, 0) / results.length,
            slowOperations: slowOperations.length,
            highLatencyOperations: highLatencyOperations.length
        }
    };
    
    fs.writeFileSync('social-graph-benchmark-results.json', JSON.stringify(reportData, null, 2));
    console.log('\nBenchmark results saved to social-graph-benchmark-results.json');
}

// Run benchmarks if this file is executed directly
if (require.main === module) {
    runBenchmarks().catch(console.error);
}

module.exports = {
    Benchmark,
    DatabaseBenchmarks,
    RedisBenchmarks,
    ConcurrentBenchmarks,
    MemoryTracker,
    runBenchmarks
};
