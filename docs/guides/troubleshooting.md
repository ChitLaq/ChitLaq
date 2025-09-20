# Troubleshooting Guide

## Overview

This guide provides comprehensive troubleshooting information for the ChitLaq Authentication API. It covers common issues, error codes, debugging techniques, and resolution steps.

## Table of Contents

1. [Common Issues](#common-issues)
2. [Error Codes](#error-codes)
3. [Debugging Techniques](#debugging-techniques)
4. [Performance Issues](#performance-issues)
5. [Integration Issues](#integration-issues)
6. [Security Issues](#security-issues)
7. [Database Issues](#database-issues)
8. [Network Issues](#network-issues)
9. [Monitoring and Logs](#monitoring-and-logs)
10. [Support Resources](#support-resources)

## Common Issues

### Authentication Issues

#### Issue: "Invalid credentials" error

**Symptoms:**
- User receives "Invalid credentials" error when logging in
- Login attempts fail even with correct credentials

**Possible Causes:**
- Incorrect email or password
- Account locked due to too many failed attempts
- Password expired
- Account deactivated

**Resolution Steps:**

1. **Verify Credentials**
   ```bash
   # Check if email exists
   curl -X GET "https://api.chitlaq.com/auth/check-email" \
        -H "Content-Type: application/json" \
        -d '{"email": "user@university.edu"}'
   ```

2. **Check Account Status**
   ```bash
   # Check account status
   curl -X GET "https://api.chitlaq.com/auth/account-status" \
        -H "Authorization: Bearer <token>"
   ```

3. **Reset Password**
   ```bash
   # Request password reset
   curl -X POST "https://api.chitlaq.com/auth/forgot-password" \
        -H "Content-Type: application/json" \
        -d '{"email": "user@university.edu"}'
   ```

#### Issue: Token expiration errors

**Symptoms:**
- "Token expired" error messages
- User gets logged out frequently
- API calls return 401 Unauthorized

**Resolution Steps:**

1. **Check Token Expiration**
   ```javascript
   // Decode JWT token to check expiration
   const token = localStorage.getItem('accessToken');
   const decoded = jwt.decode(token);
   console.log('Token expires at:', new Date(decoded.exp * 1000));
   ```

2. **Implement Token Refresh**
   ```javascript
   // Automatic token refresh
   const refreshToken = async () => {
     try {
       const response = await fetch('/auth/refresh', {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
         },
         body: JSON.stringify({
           refreshToken: localStorage.getItem('refreshToken')
         })
       });
       
       if (response.ok) {
         const data = await response.json();
         localStorage.setItem('accessToken', data.accessToken);
         localStorage.setItem('refreshToken', data.refreshToken);
       }
     } catch (error) {
       console.error('Token refresh failed:', error);
       // Redirect to login
       window.location.href = '/login';
     }
   };
   ```

#### Issue: University email validation failures

**Symptoms:**
- "Invalid university email" error during registration
- Email validation fails for valid university emails

**Resolution Steps:**

1. **Check University Domain**
   ```bash
   # Verify university domain
   curl -X GET "https://api.chitlaq.com/auth/universities" \
        -H "Content-Type: application/json"
   ```

2. **Validate Email Format**
   ```javascript
   // Client-side validation
   const validateUniversityEmail = (email) => {
     const universityDomains = [
       'university.edu',
       'college.edu',
       'institute.edu'
     ];
     
     const domain = email.split('@')[1];
     return universityDomains.includes(domain);
   };
   ```

### Registration Issues

#### Issue: Registration fails with "Email already exists"

**Symptoms:**
- User cannot register with existing email
- Error message indicates email is already in use

**Resolution Steps:**

1. **Check if Account Exists**
   ```bash
   # Check account existence
   curl -X GET "https://api.chitlaq.com/auth/check-email" \
        -H "Content-Type: application/json" \
        -d '{"email": "user@university.edu"}'
   ```

2. **Handle Existing Account**
   ```javascript
   // Handle existing account scenario
   if (response.data.exists) {
     // Offer password reset or login
     showMessage('Account already exists. Please log in or reset your password.');
   }
   ```

#### Issue: Email verification not working

**Symptoms:**
- Verification emails not received
- Verification links not working
- Email verification timeout

**Resolution Steps:**

1. **Check Email Delivery**
   ```bash
   # Check email delivery status
   curl -X GET "https://api.chitlaq.com/auth/verification-status" \
        -H "Authorization: Bearer <token>"
   ```

2. **Resend Verification Email**
   ```bash
   # Resend verification email
   curl -X POST "https://api.chitlaq.com/auth/resend-verification" \
        -H "Authorization: Bearer <token>"
   ```

3. **Check Spam Folder**
   - Instruct users to check spam/junk folder
   - Add chitlaq.com to email whitelist

### API Integration Issues

#### Issue: CORS errors

**Symptoms:**
- "CORS policy" errors in browser console
- API calls blocked by browser
- Preflight requests failing

**Resolution Steps:**

1. **Check CORS Configuration**
   ```javascript
   // Server-side CORS configuration
   const corsOptions = {
     origin: ['https://chitlaq.com', 'https://app.chitlaq.com'],
     credentials: true,
     methods: ['GET', 'POST', 'PUT', 'DELETE'],
     allowedHeaders: ['Content-Type', 'Authorization']
   };
   ```

2. **Client-side Configuration**
   ```javascript
   // Include credentials in requests
   fetch('/api/auth/login', {
     method: 'POST',
     credentials: 'include',
     headers: {
       'Content-Type': 'application/json'
     },
     body: JSON.stringify(credentials)
   });
   ```

#### Issue: Rate limiting errors

**Symptoms:**
- "Too many requests" error messages
- API calls blocked after multiple attempts
- Rate limit headers in response

**Resolution Steps:**

1. **Check Rate Limit Headers**
   ```javascript
   // Check rate limit headers
   const response = await fetch('/api/auth/login');
   console.log('Rate limit remaining:', response.headers.get('X-RateLimit-Remaining'));
   console.log('Rate limit reset:', response.headers.get('X-RateLimit-Reset'));
   ```

2. **Implement Exponential Backoff**
   ```javascript
   // Exponential backoff retry
   const retryWithBackoff = async (fn, maxRetries = 3) => {
     for (let i = 0; i < maxRetries; i++) {
       try {
         return await fn();
       } catch (error) {
         if (error.status === 429 && i < maxRetries - 1) {
           const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
           await new Promise(resolve => setTimeout(resolve, delay));
         } else {
           throw error;
         }
       }
     }
   };
   ```

## Error Codes

### HTTP Status Codes

| Code | Status | Description | Resolution |
|------|--------|-------------|------------|
| 200 | OK | Request successful | - |
| 201 | Created | Resource created successfully | - |
| 400 | Bad Request | Invalid request data | Check request format and required fields |
| 401 | Unauthorized | Authentication required | Provide valid authentication token |
| 403 | Forbidden | Access denied | Check user permissions and roles |
| 404 | Not Found | Resource not found | Verify resource ID and endpoint |
| 409 | Conflict | Resource already exists | Handle existing resource scenario |
| 422 | Unprocessable Entity | Validation failed | Check input validation rules |
| 429 | Too Many Requests | Rate limit exceeded | Implement backoff and retry logic |
| 500 | Internal Server Error | Server error | Check server logs and contact support |
| 503 | Service Unavailable | Service temporarily unavailable | Retry after service restoration |

### Application Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| AUTH_001 | Invalid credentials | Verify email and password |
| AUTH_002 | Token expired | Refresh authentication token |
| AUTH_003 | Account locked | Wait for lockout period or contact support |
| AUTH_004 | Email not verified | Complete email verification process |
| AUTH_005 | University email required | Use valid university email address |
| AUTH_006 | Password too weak | Use stronger password meeting requirements |
| AUTH_007 | Account deactivated | Contact support for account reactivation |
| AUTH_008 | Session expired | Re-authenticate user |
| AUTH_009 | Invalid refresh token | Clear stored tokens and re-login |
| AUTH_010 | Rate limit exceeded | Implement backoff and retry logic |

### Database Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| DB_001 | Connection failed | Check database connectivity |
| DB_002 | Query timeout | Optimize query or increase timeout |
| DB_003 | Constraint violation | Check data integrity rules |
| DB_004 | Deadlock detected | Retry transaction |
| DB_005 | Insufficient permissions | Check database user permissions |
| DB_006 | Table not found | Verify database schema |
| DB_007 | Column not found | Check table structure |
| DB_008 | Data type mismatch | Verify data types in request |

## Debugging Techniques

### Client-Side Debugging

#### Enable Debug Logging

```javascript
// Enable debug mode
localStorage.setItem('debug', 'chitlaq:*');

// Debug authentication flow
const debugAuth = (step, data) => {
  console.log(`[AUTH DEBUG] ${step}:`, data);
};

// Usage
debugAuth('Login attempt', { email: 'user@university.edu' });
debugAuth('Token received', { token: 'jwt-token' });
debugAuth('Token validation', { valid: true });
```

#### Network Request Debugging

```javascript
// Intercept and log all requests
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  console.log('Request:', args);
  const response = await originalFetch(...args);
  console.log('Response:', response);
  return response;
};

// Log request/response details
const logRequest = (url, options, response) => {
  console.group(`API Request: ${url}`);
  console.log('Options:', options);
  console.log('Response Status:', response.status);
  console.log('Response Headers:', response.headers);
  console.groupEnd();
};
```

#### Token Debugging

```javascript
// Decode and inspect JWT token
const inspectToken = (token) => {
  try {
    const decoded = jwt.decode(token);
    console.log('Token payload:', decoded);
    console.log('Token expires:', new Date(decoded.exp * 1000));
    console.log('Token issued:', new Date(decoded.iat * 1000));
    console.log('Time until expiry:', (decoded.exp * 1000) - Date.now(), 'ms');
  } catch (error) {
    console.error('Token decode error:', error);
  }
};
```

### Server-Side Debugging

#### Enable Debug Logging

```javascript
// Enable debug logging
process.env.DEBUG = 'chitlaq:*';

// Debug middleware
const debugMiddleware = (req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  console.log('Query:', req.query);
  next();
};

app.use(debugMiddleware);
```

#### Database Query Debugging

```javascript
// Log database queries
const debugQueries = (query, params) => {
  console.log('SQL Query:', query);
  console.log('Parameters:', params);
  console.log('Execution time:', Date.now() - startTime, 'ms');
};

// Usage
const startTime = Date.now();
const result = await db.query(
  'SELECT * FROM users WHERE email = $1',
  [email]
);
debugQueries('SELECT * FROM users WHERE email = $1', [email]);
```

#### Error Stack Tracing

```javascript
// Enhanced error logging
const logError = (error, context) => {
  console.error('Error occurred:', {
    message: error.message,
    stack: error.stack,
    context: context,
    timestamp: new Date().toISOString(),
    userId: context.userId,
    requestId: context.requestId
  });
};

// Usage
try {
  // Some operation
} catch (error) {
  logError(error, {
    userId: req.user?.id,
    requestId: req.id,
    operation: 'user_login'
  });
}
```

## Performance Issues

### Slow API Responses

#### Issue: High response times

**Symptoms:**
- API responses taking >2 seconds
- Timeout errors
- Poor user experience

**Debugging Steps:**

1. **Check Response Times**
   ```bash
   # Measure API response time
   curl -w "@curl-format.txt" -o /dev/null -s "https://api.chitlaq.com/auth/login"
   ```

2. **Profile Database Queries**
   ```sql
   -- Check slow queries
   SELECT query, mean_time, calls, total_time
   FROM pg_stat_statements
   ORDER BY mean_time DESC
   LIMIT 10;
   ```

3. **Monitor Resource Usage**
   ```bash
   # Check server resources
   top
   htop
   iotop
   ```

**Resolution Steps:**

1. **Optimize Database Queries**
   ```sql
   -- Add missing indexes
   CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
   CREATE INDEX CONCURRENTLY idx_sessions_user_id ON sessions(user_id);
   ```

2. **Implement Caching**
   ```javascript
   // Redis caching
   const cacheUser = async (userId, userData) => {
     await redis.setex(`user:${userId}`, 3600, JSON.stringify(userData));
   };
   
   const getCachedUser = async (userId) => {
     const cached = await redis.get(`user:${userId}`);
     return cached ? JSON.parse(cached) : null;
   };
   ```

3. **Connection Pooling**
   ```javascript
   // Database connection pooling
   const pool = new Pool({
     host: process.env.DB_HOST,
     port: process.env.DB_PORT,
     database: process.env.DB_NAME,
     user: process.env.DB_USER,
     password: process.env.DB_PASSWORD,
     max: 20,
     idleTimeoutMillis: 30000,
     connectionTimeoutMillis: 2000,
   });
   ```

### Memory Issues

#### Issue: High memory usage

**Symptoms:**
- Server running out of memory
- Out of memory errors
- Performance degradation

**Debugging Steps:**

1. **Monitor Memory Usage**
   ```bash
   # Check memory usage
   free -h
   ps aux --sort=-%mem | head -10
   ```

2. **Node.js Memory Profiling**
   ```javascript
   // Memory usage monitoring
   const memoryUsage = process.memoryUsage();
   console.log('Memory usage:', {
     rss: Math.round(memoryUsage.rss / 1024 / 1024) + ' MB',
     heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + ' MB',
     heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB',
     external: Math.round(memoryUsage.external / 1024 / 1024) + ' MB'
   });
   ```

**Resolution Steps:**

1. **Optimize Memory Usage**
   ```javascript
   // Clear unused variables
   const cleanup = () => {
     if (global.gc) {
       global.gc();
     }
   };
   
   // Set memory limits
   process.setMaxListeners(0);
   ```

2. **Implement Garbage Collection**
   ```bash
   # Enable garbage collection
   node --expose-gc --max-old-space-size=4096 app.js
   ```

## Integration Issues

### Third-Party Service Issues

#### Issue: Email service failures

**Symptoms:**
- Verification emails not sent
- Email delivery failures
- SMTP connection errors

**Resolution Steps:**

1. **Check Email Service Status**
   ```bash
   # Test SMTP connection
   telnet smtp.gmail.com 587
   ```

2. **Implement Fallback Email Service**
   ```javascript
   // Email service fallback
   const sendEmail = async (to, subject, body) => {
     const services = [
       { name: 'primary', config: primaryEmailConfig },
       { name: 'fallback', config: fallbackEmailConfig }
     ];
     
     for (const service of services) {
       try {
         await service.config.send(to, subject, body);
         return { success: true, service: service.name };
       } catch (error) {
         console.error(`Email service ${service.name} failed:`, error);
       }
     }
     
     throw new Error('All email services failed');
   };
   ```

#### Issue: University domain validation failures

**Symptoms:**
- Valid university emails rejected
- Domain validation errors
- University not found errors

**Resolution Steps:**

1. **Update University Database**
   ```sql
   -- Add new university domain
   INSERT INTO universities (domain, name, country, status)
   VALUES ('newuniversity.edu', 'New University', 'US', 'active');
   ```

2. **Implement Domain Validation**
   ```javascript
   // Domain validation
   const validateDomain = async (domain) => {
     try {
       const response = await fetch(`https://dns.google/resolve?name=${domain}&type=MX`);
       const data = await response.json();
       return data.Answer && data.Answer.length > 0;
     } catch (error) {
       return false;
     }
   };
   ```

## Security Issues

### Authentication Bypass

#### Issue: Unauthorized access

**Symptoms:**
- Users accessing restricted resources
- Authentication bypass attempts
- Security audit failures

**Resolution Steps:**

1. **Audit Authentication Flow**
   ```javascript
   // Security audit logging
   const auditAuth = (req, res, next) => {
     const authHeader = req.headers.authorization;
     if (!authHeader || !authHeader.startsWith('Bearer ')) {
       logSecurityEvent('AUTH_BYPASS_ATTEMPT', {
         ip: req.ip,
         userAgent: req.get('User-Agent'),
         path: req.path
       });
       return res.status(401).json({ error: 'Authentication required' });
     }
     next();
   };
   ```

2. **Implement Rate Limiting**
   ```javascript
   // Aggressive rate limiting for auth endpoints
   const authRateLimit = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 3, // 3 attempts per window
     message: 'Too many authentication attempts',
     standardHeaders: true,
     legacyHeaders: false,
   });
   ```

### Data Exposure

#### Issue: Sensitive data in logs

**Symptoms:**
- PII in log files
- Passwords in error messages
- Sensitive data in API responses

**Resolution Steps:**

1. **Implement Data Sanitization**
   ```javascript
   // Sanitize sensitive data
   const sanitizeData = (data) => {
     const sensitive = ['password', 'token', 'ssn', 'creditCard'];
     const sanitized = { ...data };
     
     sensitive.forEach(field => {
       if (sanitized[field]) {
         sanitized[field] = '***REDACTED***';
       }
     });
     
     return sanitized;
   };
   ```

2. **Secure Logging**
   ```javascript
   // Secure logging configuration
   const secureLogger = winston.createLogger({
     format: winston.format.combine(
       winston.format.timestamp(),
       winston.format.json(),
       winston.format.printf(({ timestamp, level, message, ...meta }) => {
         return JSON.stringify({
           timestamp,
           level,
           message,
           meta: sanitizeData(meta)
         });
       })
     )
   });
   ```

## Database Issues

### Connection Issues

#### Issue: Database connection failures

**Symptoms:**
- "Connection refused" errors
- Database timeout errors
- Connection pool exhaustion

**Resolution Steps:**

1. **Check Database Connectivity**
   ```bash
   # Test database connection
   psql -h localhost -U chitlaq_user -d chitlaq_db
   ```

2. **Monitor Connection Pool**
   ```javascript
   // Connection pool monitoring
   const monitorPool = () => {
     console.log('Pool status:', {
       totalCount: pool.totalCount,
       idleCount: pool.idleCount,
       waitingCount: pool.waitingCount
     });
   };
   
   setInterval(monitorPool, 30000); // Every 30 seconds
   ```

3. **Implement Connection Retry**
   ```javascript
   // Connection retry logic
   const connectWithRetry = async (maxRetries = 3) => {
     for (let i = 0; i < maxRetries; i++) {
       try {
         await pool.connect();
         return;
       } catch (error) {
         if (i === maxRetries - 1) throw error;
         await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
       }
     }
   };
   ```

### Query Performance Issues

#### Issue: Slow database queries

**Symptoms:**
- Query timeouts
- High CPU usage
- Database locks

**Resolution Steps:**

1. **Analyze Query Performance**
   ```sql
   -- Enable query logging
   SET log_statement = 'all';
   SET log_duration = on;
   SET log_min_duration_statement = 1000; -- Log queries > 1s
   ```

2. **Optimize Queries**
   ```sql
   -- Add missing indexes
   EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'user@university.edu';
   
   -- Create index if needed
   CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
   ```

3. **Implement Query Caching**
   ```javascript
   // Query result caching
   const cacheQuery = async (query, params, ttl = 300) => {
     const key = `query:${Buffer.from(query + JSON.stringify(params)).toString('base64')}`;
     const cached = await redis.get(key);
     
     if (cached) {
       return JSON.parse(cached);
     }
     
     const result = await db.query(query, params);
     await redis.setex(key, ttl, JSON.stringify(result.rows));
     
     return result.rows;
   };
   ```

## Network Issues

### DNS Resolution Issues

#### Issue: Domain resolution failures

**Symptoms:**
- "DNS resolution failed" errors
- API endpoints unreachable
- Intermittent connectivity issues

**Resolution Steps:**

1. **Check DNS Resolution**
   ```bash
   # Test DNS resolution
   nslookup api.chitlaq.com
   dig api.chitlaq.com
   ```

2. **Implement DNS Fallback**
   ```javascript
   // DNS fallback configuration
   const dnsConfig = {
     servers: [
       '8.8.8.8',
       '8.8.4.4',
       '1.1.1.1',
       '1.0.0.1'
     ]
   };
   ```

### SSL/TLS Issues

#### Issue: Certificate validation failures

**Symptoms:**
- "Certificate verify failed" errors
- SSL handshake failures
- Mixed content warnings

**Resolution Steps:**

1. **Check Certificate Validity**
   ```bash
   # Check certificate
   openssl s_client -connect api.chitlaq.com:443 -servername api.chitlaq.com
   ```

2. **Update Certificate**
   ```bash
   # Renew Let's Encrypt certificate
   certbot renew --nginx
   ```

## Monitoring and Logs

### Log Analysis

#### Accessing Logs

```bash
# Application logs
tail -f /var/log/chitlaq/app.log

# Error logs
tail -f /var/log/chitlaq/error.log

# Security logs
tail -f /var/log/chitlaq/security.log

# Database logs
tail -f /var/log/postgresql/postgresql.log
```

#### Log Filtering

```bash
# Filter by error level
grep "ERROR" /var/log/chitlaq/app.log

# Filter by user ID
grep "userId:12345" /var/log/chitlaq/app.log

# Filter by time range
grep "2024-01-15" /var/log/chitlaq/app.log
```

### Monitoring Dashboards

#### Grafana Dashboards

- **System Overview**: CPU, memory, disk usage
- **Application Metrics**: Request rate, response time, error rate
- **Database Metrics**: Connection count, query performance
- **Security Metrics**: Failed logins, blocked IPs, threats

#### Prometheus Alerts

```yaml
# High error rate alert
- alert: HighErrorRate
  expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "High error rate detected"
    description: "Error rate is {{ $value }} requests per second"
```

## Support Resources

### Documentation

- [API Reference](https://docs.chitlaq.com/api)
- [Authentication Guide](https://docs.chitlaq.com/auth)
- [Security Best Practices](https://docs.chitlaq.com/security)
- [Integration Examples](https://docs.chitlaq.com/examples)

### Community Support

- **GitHub Issues**: [github.com/chitlaq/issues](https://github.com/chitlaq/issues)
- **Discord Community**: [discord.gg/chitlaq](https://discord.gg/chitlaq)
- **Stack Overflow**: Tag questions with `chitlaq`

### Professional Support

- **Email Support**: support@chitlaq.com
- **Priority Support**: enterprise@chitlaq.com
- **Security Issues**: security@chitlaq.com

### Status Page

- **Service Status**: [status.chitlaq.com](https://status.chitlaq.com)
- **Incident Updates**: Real-time status updates
- **Maintenance Windows**: Scheduled maintenance notifications

## Conclusion

This troubleshooting guide provides comprehensive information for resolving common issues with the ChitLaq Authentication API. For issues not covered in this guide, please refer to the support resources or contact the development team.

Remember to:
- Check logs first for error details
- Verify configuration and environment variables
- Test with minimal reproducible examples
- Document issues for future reference
- Follow security best practices when debugging
