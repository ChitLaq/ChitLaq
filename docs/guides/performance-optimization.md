# Performance Optimization Guide

## Overview

This guide provides comprehensive performance optimization strategies for the ChitLaq Authentication API. It covers database optimization, caching strategies, API performance, and monitoring techniques.

## Table of Contents

1. [Performance Overview](#performance-overview)
2. [Database Optimization](#database-optimization)
3. [Caching Strategies](#caching-strategies)
4. [API Performance](#api-performance)
5. [Frontend Optimization](#frontend-optimization)
6. [Infrastructure Optimization](#infrastructure-optimization)
7. [Monitoring and Profiling](#monitoring-and-profiling)
8. [Performance Testing](#performance-testing)

## Performance Overview

### Performance Targets

- **API Response Time**: < 200ms (95th percentile)
- **Database Query Time**: < 50ms (95th percentile)
- **Authentication Flow**: < 500ms end-to-end
- **Concurrent Users**: 10,000+ simultaneous connections
- **Throughput**: 1,000+ requests per second

### Key Metrics

- **Response Time**: Time from request to response
- **Throughput**: Requests processed per second
- **Error Rate**: Percentage of failed requests
- **Resource Utilization**: CPU, memory, disk, network usage
- **Database Performance**: Query execution time, connection pool usage

## Database Optimization

### Query Optimization

#### Index Optimization

```sql
-- User authentication indexes
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY idx_users_email_password ON users(email, password_hash);
CREATE INDEX CONCURRENTLY idx_users_status ON users(status) WHERE status = 'active';

-- Session management indexes
CREATE INDEX CONCURRENTLY idx_sessions_user_id ON sessions(user_id);
CREATE INDEX CONCURRENTLY idx_sessions_token ON sessions(refresh_token);
CREATE INDEX CONCURRENTLY idx_sessions_active ON sessions(user_id, is_active) WHERE is_active = true;

-- Audit log indexes
CREATE INDEX CONCURRENTLY idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX CONCURRENTLY idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX CONCURRENTLY idx_audit_logs_action ON audit_logs(action);

-- University validation indexes
CREATE INDEX CONCURRENTLY idx_universities_domain ON universities(domain);
CREATE INDEX CONCURRENTLY idx_universities_status ON universities(status) WHERE status = 'active';
```

#### Query Performance Analysis

```sql
-- Enable query statistics
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Analyze slow queries
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    stddev_time,
    rows
FROM pg_stat_statements
WHERE mean_time > 100  -- Queries taking > 100ms
ORDER BY mean_time DESC
LIMIT 10;

-- Check index usage
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_scan = 0  -- Unused indexes
ORDER BY tablename;
```

#### Query Optimization Examples

```sql
-- Optimize user lookup
-- Before: Full table scan
SELECT * FROM users WHERE email = 'user@university.edu';

-- After: Index scan
SELECT id, email, first_name, last_name, status 
FROM users 
WHERE email = 'user@university.edu' 
AND status = 'active';

-- Optimize session validation
-- Before: Multiple queries
SELECT * FROM sessions WHERE refresh_token = $1;
SELECT * FROM users WHERE id = $1;

-- After: Single join query
SELECT u.id, u.email, u.status, s.expires_at
FROM sessions s
JOIN users u ON s.user_id = u.id
WHERE s.refresh_token = $1 
AND s.is_active = true 
AND s.expires_at > NOW();
```

### Connection Pooling

#### PgBouncer Configuration

```ini
# pgbouncer.ini
[databases]
chitlaq_db = host=localhost port=5432 dbname=chitlaq_db

[pgbouncer]
listen_port = 6432
listen_addr = 127.0.0.1
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 20
reserve_pool_size = 5
reserve_pool_timeout = 3
max_db_connections = 100
max_user_connections = 50
server_round_robin = 1
ignore_startup_parameters = extra_float_digits
```

#### Application Connection Pool

```javascript
// Database connection pool configuration
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,                    // Maximum connections
  min: 5,                     // Minimum connections
  idleTimeoutMillis: 30000,   // Close idle connections after 30s
  connectionTimeoutMillis: 2000, // Connection timeout
  acquireTimeoutMillis: 60000,   // Acquire timeout
  createTimeoutMillis: 30000,    // Create timeout
  destroyTimeoutMillis: 5000,    // Destroy timeout
  reapIntervalMillis: 1000,      // Reap interval
  createRetryIntervalMillis: 200, // Retry interval
  ssl: {
    rejectUnauthorized: false
  }
});

// Connection pool monitoring
const monitorPool = () => {
  console.log('Pool status:', {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount
  });
};

setInterval(monitorPool, 30000);
```

### Database Partitioning

#### Table Partitioning

```sql
-- Partition audit logs by date
CREATE TABLE audit_logs (
    id UUID DEFAULT gen_random_uuid(),
    user_id UUID,
    action VARCHAR(100),
    timestamp TIMESTAMP DEFAULT NOW(),
    details JSONB
) PARTITION BY RANGE (timestamp);

-- Create monthly partitions
CREATE TABLE audit_logs_2024_01 PARTITION OF audit_logs
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE audit_logs_2024_02 PARTITION OF audit_logs
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Create indexes on partitions
CREATE INDEX idx_audit_logs_2024_01_user_id ON audit_logs_2024_01(user_id);
CREATE INDEX idx_audit_logs_2024_01_timestamp ON audit_logs_2024_01(timestamp);
```

## Caching Strategies

### Redis Caching

#### Cache Configuration

```javascript
// Redis configuration
const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
  db: 0,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
  lazyConnect: true,
  keepAlive: 30000,
  family: 4,
  connectTimeout: 10000,
  commandTimeout: 5000
});

// Cache key strategies
const CACHE_KEYS = {
  USER: (id) => `user:${id}`,
  USER_SESSION: (id) => `session:${id}`,
  UNIVERSITY: (domain) => `university:${domain}`,
  RATE_LIMIT: (ip) => `rate_limit:${ip}`,
  EMAIL_VALIDATION: (email) => `email_validation:${email}`
};
```

#### Cache Implementation

```javascript
// User data caching
const cacheUser = async (user) => {
  const key = CACHE_KEYS.USER(user.id);
  const data = {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    universityId: user.universityId,
    role: user.role,
    status: user.status
  };
  
  await redis.setex(key, 3600, JSON.stringify(data)); // 1 hour TTL
};

const getCachedUser = async (userId) => {
  const key = CACHE_KEYS.USER(userId);
  const cached = await redis.get(key);
  return cached ? JSON.parse(cached) : null;
};

// Session caching
const cacheSession = async (session) => {
  const key = CACHE_KEYS.USER_SESSION(session.userId);
  const data = {
    userId: session.userId,
    refreshToken: session.refreshToken,
    expiresAt: session.expiresAt,
    isActive: session.isActive
  };
  
  await redis.setex(key, 86400, JSON.stringify(data)); // 24 hours TTL
};

// University data caching
const cacheUniversity = async (university) => {
  const key = CACHE_KEYS.UNIVERSITY(university.domain);
  await redis.setex(key, 86400, JSON.stringify(university)); // 24 hours TTL
};

const getCachedUniversity = async (domain) => {
  const key = CACHE_KEYS.UNIVERSITY(domain);
  const cached = await redis.get(key);
  return cached ? JSON.parse(cached) : null;
};
```

#### Cache Invalidation

```javascript
// Cache invalidation strategies
const invalidateUserCache = async (userId) => {
  const key = CACHE_KEYS.USER(userId);
  await redis.del(key);
};

const invalidateUserSessionCache = async (userId) => {
  const key = CACHE_KEYS.USER_SESSION(userId);
  await redis.del(key);
};

// Pattern-based invalidation
const invalidateUserPattern = async (pattern) => {
  const keys = await redis.keys(`user:${pattern}*`);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
};

// Cache warming
const warmCache = async () => {
  // Warm user cache for active users
  const activeUsers = await db.query(
    'SELECT * FROM users WHERE status = $1 AND last_login > $2',
    ['active', new Date(Date.now() - 24 * 60 * 60 * 1000)]
  );
  
  for (const user of activeUsers.rows) {
    await cacheUser(user);
  }
  
  // Warm university cache
  const universities = await db.query('SELECT * FROM universities WHERE status = $1', ['active']);
  for (const university of universities.rows) {
    await cacheUniversity(university);
  }
};
```

### Application-Level Caching

#### In-Memory Caching

```javascript
// LRU cache for frequently accessed data
const LRU = require('lru-cache');

const userCache = new LRU({
  max: 1000,           // Maximum number of items
  ttl: 1000 * 60 * 5,  // 5 minutes TTL
  updateAgeOnGet: true,
  updateAgeOnHas: true
});

const universityCache = new LRU({
  max: 500,
  ttl: 1000 * 60 * 60, // 1 hour TTL
  updateAgeOnGet: true
});

// Cache middleware
const cacheMiddleware = (ttl = 300) => {
  return (req, res, next) => {
    const key = `cache:${req.originalUrl}`;
    const cached = userCache.get(key);
    
    if (cached) {
      return res.json(cached);
    }
    
    const originalSend = res.send;
    res.send = function(data) {
      userCache.set(key, JSON.parse(data), ttl * 1000);
      originalSend.call(this, data);
    };
    
    next();
  };
};
```

## API Performance

### Request Optimization

#### Request Batching

```javascript
// Batch multiple requests
const batchRequests = async (requests) => {
  const results = await Promise.allSettled(requests);
  return results.map((result, index) => ({
    index,
    success: result.status === 'fulfilled',
    data: result.status === 'fulfilled' ? result.value : null,
    error: result.status === 'rejected' ? result.reason : null
  }));
};

// Usage
const requests = [
  fetch('/api/users/1'),
  fetch('/api/users/2'),
  fetch('/api/users/3')
];

const results = await batchRequests(requests);
```

#### Request Deduplication

```javascript
// Request deduplication
const requestCache = new Map();

const deduplicateRequest = async (key, requestFn) => {
  if (requestCache.has(key)) {
    return requestCache.get(key);
  }
  
  const promise = requestFn();
  requestCache.set(key, promise);
  
  // Clean up after completion
  promise.finally(() => {
    requestCache.delete(key);
  });
  
  return promise;
};

// Usage
const getUser = (userId) => {
  return deduplicateRequest(`user:${userId}`, () => {
    return fetch(`/api/users/${userId}`);
  });
};
```

### Response Optimization

#### Response Compression

```javascript
// Gzip compression middleware
const compression = require('compression');

app.use(compression({
  level: 6,                    // Compression level (1-9)
  threshold: 1024,             // Only compress responses > 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));
```

#### Response Caching

```javascript
// HTTP caching headers
const setCacheHeaders = (res, maxAge = 3600) => {
  res.set({
    'Cache-Control': `public, max-age=${maxAge}`,
    'ETag': generateETag(res.body),
    'Last-Modified': new Date().toUTCString()
  });
};

// Conditional requests
const handleConditionalRequest = (req, res, data) => {
  const ifNoneMatch = req.headers['if-none-match'];
  const ifModifiedSince = req.headers['if-modified-since'];
  
  const etag = generateETag(data);
  const lastModified = new Date(data.updatedAt).toUTCString();
  
  if (ifNoneMatch === etag) {
    return res.status(304).end();
  }
  
  if (ifModifiedSince && new Date(ifModifiedSince) >= new Date(data.updatedAt)) {
    return res.status(304).end();
  }
  
  res.set({
    'ETag': etag,
    'Last-Modified': lastModified
  });
  
  res.json(data);
};
```

### Database Query Optimization

#### Query Optimization

```javascript
// Optimized user authentication
const authenticateUser = async (email, password) => {
  // Use prepared statement
  const query = `
    SELECT id, email, password_hash, first_name, last_name, 
           university_id, role, status, last_login
    FROM users 
    WHERE email = $1 AND status = 'active'
  `;
  
  const result = await db.query(query, [email]);
  
  if (result.rows.length === 0) {
    throw new Error('Invalid credentials');
  }
  
  const user = result.rows[0];
  const isValid = await bcrypt.compare(password, user.password_hash);
  
  if (!isValid) {
    throw new Error('Invalid credentials');
  }
  
  // Update last login
  await db.query(
    'UPDATE users SET last_login = NOW() WHERE id = $1',
    [user.id]
  );
  
  return user;
};

// Optimized session management
const createSession = async (userId, userAgent, ipAddress) => {
  const query = `
    INSERT INTO sessions (user_id, user_agent, ip_address, is_active, created_at, expires_at)
    VALUES ($1, $2, $3, true, NOW(), NOW() + INTERVAL '30 days')
    RETURNING id, refresh_token, expires_at
  `;
  
  const result = await db.query(query, [userId, userAgent, ipAddress]);
  return result.rows[0];
};
```

## Frontend Optimization

### Bundle Optimization

#### Code Splitting

```javascript
// Route-based code splitting
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));

// Component-based code splitting
const UserProfile = lazy(() => import('./components/UserProfile'));
const UniversitySelector = lazy(() => import('./components/UniversitySelector'));

// Usage
<Suspense fallback={<LoadingSpinner />}>
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route path="/dashboard" element={<DashboardPage />} />
  </Routes>
</Suspense>
```

#### Bundle Analysis

```bash
# Analyze bundle size
npm run build
npx webpack-bundle-analyzer build/static/js/*.js

# Check for duplicate dependencies
npx duplicate-package-checker-webpack-plugin
```

### API Call Optimization

#### Request Debouncing

```javascript
// Debounce API calls
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
};

// Usage
const [searchTerm, setSearchTerm] = useState('');
const debouncedSearchTerm = useDebounce(searchTerm, 300);

useEffect(() => {
  if (debouncedSearchTerm) {
    searchUsers(debouncedSearchTerm);
  }
}, [debouncedSearchTerm]);
```

#### Request Cancellation

```javascript
// Cancel previous requests
const useCancellableRequest = () => {
  const abortControllerRef = useRef(null);
  
  const makeRequest = useCallback(async (url, options = {}) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller
    abortControllerRef.current = new AbortController();
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: abortControllerRef.current.signal
      });
      
      return response;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Request cancelled');
        return null;
      }
      throw error;
    }
  }, []);
  
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);
  
  return makeRequest;
};
```

## Infrastructure Optimization

### Load Balancing

#### Nginx Load Balancing

```nginx
# nginx.conf
upstream chitlaq_backend {
    least_conn;
    server 127.0.0.1:3001 weight=3;
    server 127.0.0.1:3002 weight=3;
    server 127.0.0.1:3003 weight=2;
    keepalive 32;
}

server {
    listen 443 ssl http2;
    server_name api.chitlaq.com;
    
    location / {
        proxy_pass http://chitlaq_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 5s;
        proxy_send_timeout 10s;
        proxy_read_timeout 10s;
    }
}
```

#### Application Load Balancing

```javascript
// Round-robin load balancing
const servers = [
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003'
];

let currentServer = 0;

const getNextServer = () => {
  const server = servers[currentServer];
  currentServer = (currentServer + 1) % servers.length;
  return server;
};

// Health check
const checkServerHealth = async (server) => {
  try {
    const response = await fetch(`${server}/health`, { timeout: 5000 });
    return response.ok;
  } catch (error) {
    return false;
  }
};

// Filter healthy servers
const getHealthyServers = async () => {
  const healthChecks = await Promise.allSettled(
    servers.map(checkServerHealth)
  );
  
  return servers.filter((_, index) => 
    healthChecks[index].status === 'fulfilled' && 
    healthChecks[index].value
  );
};
```

### CDN Configuration

#### Static Asset Optimization

```javascript
// CDN configuration
const cdnConfig = {
  baseUrl: 'https://cdn.chitlaq.com',
  assets: {
    images: '/images',
    scripts: '/scripts',
    styles: '/styles'
  },
  optimization: {
    images: {
      quality: 85,
      format: 'webp',
      sizes: [320, 640, 1024, 1920]
    },
    scripts: {
      minify: true,
      gzip: true,
      cache: '1y'
    },
    styles: {
      minify: true,
      gzip: true,
      cache: '1y'
    }
  }
};

// Asset URL generation
const getAssetUrl = (type, filename) => {
  const baseUrl = cdnConfig.baseUrl;
  const path = cdnConfig.assets[type];
  return `${baseUrl}${path}/${filename}`;
};
```

## Monitoring and Profiling

### Performance Monitoring

#### Application Metrics

```javascript
// Performance metrics collection
const performanceMetrics = {
  requestCount: 0,
  totalResponseTime: 0,
  errorCount: 0,
  activeConnections: 0
};

// Metrics middleware
const metricsMiddleware = (req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    
    performanceMetrics.requestCount++;
    performanceMetrics.totalResponseTime += responseTime;
    
    if (res.statusCode >= 400) {
      performanceMetrics.errorCount++;
    }
    
    // Log slow requests
    if (responseTime > 1000) {
      console.warn(`Slow request: ${req.method} ${req.path} - ${responseTime}ms`);
    }
  });
  
  next();
};

// Metrics endpoint
app.get('/metrics', (req, res) => {
  const avgResponseTime = performanceMetrics.totalResponseTime / performanceMetrics.requestCount;
  
  res.json({
    requests: {
      total: performanceMetrics.requestCount,
      errors: performanceMetrics.errorCount,
      success_rate: (1 - performanceMetrics.errorCount / performanceMetrics.requestCount) * 100
    },
    performance: {
      avg_response_time: avgResponseTime,
      active_connections: performanceMetrics.activeConnections
    }
  });
});
```

#### Database Monitoring

```javascript
// Database performance monitoring
const dbMetrics = {
  queryCount: 0,
  totalQueryTime: 0,
  slowQueries: [],
  connectionPool: {
    total: 0,
    idle: 0,
    waiting: 0
  }
};

// Query monitoring
const monitorQuery = (query, params, startTime) => {
  const queryTime = Date.now() - startTime;
  
  dbMetrics.queryCount++;
  dbMetrics.totalQueryTime += queryTime;
  
  if (queryTime > 100) { // Log queries > 100ms
    dbMetrics.slowQueries.push({
      query: query.substring(0, 100),
      params,
      time: queryTime,
      timestamp: new Date()
    });
  }
};

// Database metrics endpoint
app.get('/metrics/database', (req, res) => {
  const avgQueryTime = dbMetrics.totalQueryTime / dbMetrics.queryCount;
  
  res.json({
    queries: {
      total: dbMetrics.queryCount,
      avg_time: avgQueryTime,
      slow_queries: dbMetrics.slowQueries.length
    },
    connection_pool: dbMetrics.connectionPool,
    recent_slow_queries: dbMetrics.slowQueries.slice(-10)
  });
});
```

### Profiling

#### CPU Profiling

```javascript
// CPU profiling
const v8 = require('v8');

const startProfiling = () => {
  v8.setFlagsFromString('--prof');
  console.log('CPU profiling started');
};

const stopProfiling = () => {
  v8.setFlagsFromString('--no-prof');
  console.log('CPU profiling stopped');
};

// Memory profiling
const profileMemory = () => {
  const heapStats = v8.getHeapStatistics();
  const memoryUsage = process.memoryUsage();
  
  console.log('Memory usage:', {
    rss: Math.round(memoryUsage.rss / 1024 / 1024) + ' MB',
    heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + ' MB',
    heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB',
    external: Math.round(memoryUsage.external / 1024 / 1024) + ' MB'
  });
  
  console.log('Heap statistics:', {
    totalHeapSize: Math.round(heapStats.total_heap_size / 1024 / 1024) + ' MB',
    usedHeapSize: Math.round(heapStats.used_heap_size / 1024 / 1024) + ' MB',
    heapSizeLimit: Math.round(heapStats.heap_size_limit / 1024 / 1024) + ' MB'
  });
};
```

## Performance Testing

### Load Testing

#### K6 Load Tests

```javascript
// k6-load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 200 }, // Ramp up to 200 users
    { duration: '5m', target: 200 }, // Stay at 200 users
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'], // 95% of requests < 200ms
    http_req_failed: ['rate<0.1'],    // Error rate < 10%
  },
};

export default function() {
  // Test user registration
  let registerResponse = http.post('https://api.chitlaq.com/auth/register', {
    email: `test${__VU}@university.edu`,
    password: 'Test123!',
    firstName: 'Test',
    lastName: 'User'
  });
  
  check(registerResponse, {
    'registration status is 201': (r) => r.status === 201,
    'registration response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  sleep(1);
  
  // Test user login
  let loginResponse = http.post('https://api.chitlaq.com/auth/login', {
    email: `test${__VU}@university.edu`,
    password: 'Test123!'
  });
  
  check(loginResponse, {
    'login status is 200': (r) => r.status === 200,
    'login response time < 300ms': (r) => r.timings.duration < 300,
  });
  
  sleep(1);
}
```

#### Stress Testing

```javascript
// k6-stress-test.js
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  stages: [
    { duration: '1m', target: 1000 }, // Ramp up to 1000 users
    { duration: '3m', target: 1000 }, // Stay at 1000 users
    { duration: '1m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95% of requests < 1s
    http_req_failed: ['rate<0.2'],     // Error rate < 20%
  },
};

export default function() {
  let response = http.get('https://api.chitlaq.com/health');
  
  check(response, {
    'health check status is 200': (r) => r.status === 200,
    'health check response time < 100ms': (r) => r.timings.duration < 100,
  });
}
```

### Performance Benchmarks

#### Benchmark Suite

```javascript
// benchmark-suite.js
const benchmark = require('benchmark');
const suite = new benchmark.Suite();

// Database query benchmark
suite.add('User lookup by email', async function() {
  await db.query('SELECT * FROM users WHERE email = $1', ['test@university.edu']);
});

// Cache lookup benchmark
suite.add('Cache lookup', async function() {
  await redis.get('user:123');
});

// JWT verification benchmark
suite.add('JWT verification', async function() {
  jwt.verify(token, process.env.JWT_SECRET);
});

suite.on('complete', function() {
  console.log('Fastest is ' + this.filter('fastest').map('name'));
});

suite.run({ async: true });
```

## Conclusion

This performance optimization guide provides comprehensive strategies for improving the ChitLaq Authentication API performance. Regular monitoring, profiling, and testing are essential for maintaining optimal performance as the system scales.

### Key Takeaways

- **Monitor continuously**: Track key metrics and set up alerts
- **Optimize databases**: Use proper indexing and query optimization
- **Implement caching**: Reduce database load and improve response times
- **Load test regularly**: Validate performance under various loads
- **Profile applications**: Identify and fix performance bottlenecks
- **Scale horizontally**: Use load balancing and CDN for better performance
