# Migration Guide

## Overview

This guide provides comprehensive migration instructions for upgrading the ChitLaq Authentication API. It covers version-specific migrations, breaking changes, and step-by-step upgrade procedures.

## Table of Contents

1. [Migration Overview](#migration-overview)
2. [Version History](#version-history)
3. [Pre-Migration Checklist](#pre-migration-checklist)
4. [Migration Procedures](#migration-procedures)
5. [Breaking Changes](#breaking-changes)
6. [Database Migrations](#database-migrations)
7. [Configuration Changes](#configuration-changes)
8. [Client-Side Updates](#client-side-updates)
9. [Rollback Procedures](#rollback-procedures)
10. [Post-Migration Validation](#post-migration-validation)

## Migration Overview

### Migration Types

- **Major Version**: Breaking changes, requires careful planning
- **Minor Version**: New features, backward compatible
- **Patch Version**: Bug fixes, fully backward compatible

### Migration Strategy

1. **Planning Phase**
   - Review release notes
   - Identify breaking changes
   - Plan migration timeline
   - Prepare rollback plan

2. **Testing Phase**
   - Test in staging environment
   - Validate all functionality
   - Performance testing
   - Security validation

3. **Execution Phase**
   - Backup current system
   - Execute migration steps
   - Monitor system health
   - Validate functionality

4. **Validation Phase**
   - Run test suite
   - Monitor metrics
   - User acceptance testing
   - Performance validation

## Version History

### Version 2.0.0 (Current)

**Release Date**: 2024-01-15

**New Features**:
- Enhanced security with multi-factor authentication
- Improved university email validation
- Advanced threat detection
- GDPR/CCPA compliance features
- Performance optimizations

**Breaking Changes**:
- JWT token format updated
- API response structure changes
- Database schema modifications
- Configuration file format changes

### Version 1.5.0

**Release Date**: 2023-12-01

**New Features**:
- Rate limiting improvements
- Enhanced logging
- Better error handling
- Performance monitoring

**Breaking Changes**:
- Rate limit header format changes
- Log format modifications

### Version 1.0.0

**Release Date**: 2023-10-01

**Initial Release**:
- Basic authentication system
- University email validation
- JWT token management
- User registration and login

## Pre-Migration Checklist

### System Requirements

- [ ] **Server Requirements**
  - [ ] Node.js >= 18.0.0
  - [ ] PostgreSQL >= 14.0
  - [ ] Redis >= 6.0
  - [ ] Nginx >= 1.20

- [ ] **Dependencies**
  - [ ] All npm packages updated
  - [ ] Database extensions installed
  - [ ] System packages updated
  - [ ] Security patches applied

### Backup Requirements

- [ ] **Database Backup**
  - [ ] Full database dump
  - [ ] Schema backup
  - [ ] User data backup
  - [ ] Configuration backup

- [ ] **Application Backup**
  - [ ] Source code backup
  - [ ] Configuration files
  - [ ] Environment variables
  - [ ] SSL certificates

- [ ] **System Backup**
  - [ ] Server configuration
  - [ ] Nginx configuration
  - [ ] System logs
  - [ ] Monitoring configuration

### Testing Requirements

- [ ] **Staging Environment**
  - [ ] Staging server provisioned
  - [ ] Test data prepared
  - [ ] Migration scripts tested
  - [ ] Rollback procedures tested

- [ ] **Test Cases**
  - [ ] Authentication flow tests
  - [ ] API endpoint tests
  - [ ] Database migration tests
  - [ ] Performance tests

## Migration Procedures

### Major Version Migration (1.x → 2.0)

#### Step 1: Prepare Migration Environment

```bash
# Create migration directory
mkdir -p /opt/chitlaq/migration
cd /opt/chitlaq/migration

# Download migration scripts
wget https://releases.chitlaq.com/migration/v2.0.0/migration-scripts.tar.gz
tar -xzf migration-scripts.tar.gz

# Set permissions
chmod +x *.sh
```

#### Step 2: Backup Current System

```bash
# Database backup
pg_dump -h localhost -U chitlaq_user -d chitlaq_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Application backup
tar -czf app_backup_$(date +%Y%m%d_%H%M%S).tar.gz /opt/chitlaq/app

# Configuration backup
cp -r /opt/chitlaq/config /opt/chitlaq/config_backup_$(date +%Y%m%d_%H%M%S)
```

#### Step 3: Update Dependencies

```bash
# Update Node.js (if needed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Update npm packages
cd /opt/chitlaq/app
npm update
npm audit fix
```

#### Step 4: Database Migration

```bash
# Run database migration
./migrate-database.sh --version 2.0.0 --backup

# Verify migration
./verify-database.sh --version 2.0.0
```

#### Step 5: Update Configuration

```bash
# Update configuration files
./update-config.sh --version 2.0.0

# Validate configuration
./validate-config.sh
```

#### Step 6: Deploy New Version

```bash
# Deploy new application
./deploy-app.sh --version 2.0.0

# Start services
systemctl start chitlaq-auth
systemctl start chitlaq-api
systemctl start chitlaq-web
```

#### Step 7: Post-Deployment Validation

```bash
# Run health checks
./health-check.sh

# Run test suite
npm test

# Monitor logs
tail -f /var/log/chitlaq/app.log
```

### Minor Version Migration

#### Step 1: Update Dependencies

```bash
# Update npm packages
npm update

# Check for security vulnerabilities
npm audit
```

#### Step 2: Deploy New Version

```bash
# Deploy new version
git pull origin main
npm install
npm run build

# Restart services
systemctl restart chitlaq-auth
```

#### Step 3: Validate Deployment

```bash
# Run health checks
curl -f http://localhost:3000/health

# Check logs
journalctl -u chitlaq-auth -f
```

### Patch Version Migration

#### Step 1: Quick Update

```bash
# Pull latest changes
git pull origin main

# Install dependencies
npm install

# Restart service
systemctl restart chitlaq-auth
```

#### Step 2: Verify Update

```bash
# Check service status
systemctl status chitlaq-auth

# Test API endpoint
curl -f http://localhost:3000/health
```

## Breaking Changes

### Version 2.0.0 Breaking Changes

#### JWT Token Format Changes

**Before (v1.x)**:
```json
{
  "sub": "user123",
  "email": "user@university.edu",
  "iat": 1640995200,
  "exp": 1640998800
}
```

**After (v2.0.0)**:
```json
{
  "sub": "user123",
  "email": "user@university.edu",
  "university_id": "uni123",
  "role": "student",
  "iat": 1640995200,
  "exp": 1640998800,
  "iss": "chitlaq.com",
  "aud": "chitlaq-api"
}
```

**Migration Steps**:
1. Update JWT verification logic
2. Handle new token claims
3. Update client-side token handling

#### API Response Structure Changes

**Before (v1.x)**:
```json
{
  "success": true,
  "data": {
    "user": { "id": "123", "email": "user@university.edu" }
  }
}
```

**After (v2.0.0)**:
```json
{
  "success": true,
  "data": {
    "user": { 
      "id": "123", 
      "email": "user@university.edu",
      "university_id": "uni123",
      "role": "student"
    }
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "2.0.0"
  }
}
```

**Migration Steps**:
1. Update client-side response parsing
2. Handle new metadata fields
3. Update error handling logic

#### Database Schema Changes

**New Tables**:
```sql
-- University management
CREATE TABLE universities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  country VARCHAR(2) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User roles
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  role VARCHAR(50) NOT NULL,
  granted_at TIMESTAMP DEFAULT NOW(),
  granted_by UUID REFERENCES users(id)
);
```

**Migration Steps**:
1. Run database migration scripts
2. Update data access layer
3. Migrate existing data

#### Configuration Changes

**Before (v1.x)**:
```env
JWT_SECRET=your-secret-key
DB_HOST=localhost
DB_PORT=5432
```

**After (v2.0.0)**:
```env
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
JWT_ISSUER=chitlaq.com
JWT_AUDIENCE=chitlaq-api
DB_HOST=localhost
DB_PORT=5432
DB_SSL=true
```

**Migration Steps**:
1. Update environment variables
2. Add new configuration options
3. Update deployment scripts

## Database Migrations

### Migration Scripts

#### Schema Migration

```sql
-- migration_001_schema_update.sql
BEGIN;

-- Add new columns
ALTER TABLE users ADD COLUMN university_id UUID;
ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'student';
ALTER TABLE users ADD COLUMN last_login TIMESTAMP;
ALTER TABLE users ADD COLUMN login_count INTEGER DEFAULT 0;

-- Create new tables
CREATE TABLE universities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  country VARCHAR(2) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL,
  granted_at TIMESTAMP DEFAULT NOW(),
  granted_by UUID REFERENCES users(id)
);

-- Create indexes
CREATE INDEX idx_users_university_id ON users(university_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);

-- Update existing data
UPDATE users SET role = 'student' WHERE role IS NULL;

COMMIT;
```

#### Data Migration

```sql
-- migration_002_data_migration.sql
BEGIN;

-- Migrate university data
INSERT INTO universities (domain, name, country, status)
SELECT DISTINCT 
  SUBSTRING(email FROM '@(.+)$') as domain,
  'University' as name,
  'US' as country,
  'active' as status
FROM users
WHERE email LIKE '%@%.edu'
ON CONFLICT (domain) DO NOTHING;

-- Update user university_id
UPDATE users 
SET university_id = u.id
FROM universities u
WHERE SUBSTRING(users.email FROM '@(.+)$') = u.domain;

-- Create default roles
INSERT INTO user_roles (user_id, role)
SELECT id, role
FROM users
WHERE role IS NOT NULL;

COMMIT;
```

#### Index Migration

```sql
-- migration_003_indexes.sql
BEGIN;

-- Add performance indexes
CREATE INDEX CONCURRENTLY idx_users_email_university ON users(email, university_id);
CREATE INDEX CONCURRENTLY idx_users_last_login ON users(last_login);
CREATE INDEX CONCURRENTLY idx_sessions_user_id_active ON sessions(user_id, is_active);
CREATE INDEX CONCURRENTLY idx_audit_logs_user_id_timestamp ON audit_logs(user_id, timestamp);

-- Add partial indexes
CREATE INDEX CONCURRENTLY idx_users_active ON users(id) WHERE status = 'active';
CREATE INDEX CONCURRENTLY idx_sessions_active ON sessions(id) WHERE is_active = true;

COMMIT;
```

### Migration Execution

#### Automated Migration

```bash
#!/bin/bash
# migrate-database.sh

set -e

VERSION=$1
BACKUP_DIR="/opt/chitlaq/backups"
MIGRATION_DIR="/opt/chitlaq/migrations"

echo "Starting database migration to version $VERSION"

# Create backup
if [ "$2" = "--backup" ]; then
    echo "Creating database backup..."
    pg_dump -h localhost -U chitlaq_user -d chitlaq_db > "$BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql"
fi

# Run migrations
echo "Running database migrations..."
for migration in $(ls $MIGRATION_DIR/*.sql | sort); do
    echo "Executing migration: $(basename $migration)"
    psql -h localhost -U chitlaq_user -d chitlaq_db -f "$migration"
done

# Verify migration
echo "Verifying migration..."
psql -h localhost -U chitlaq_user -d chitlaq_db -c "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1;"

echo "Database migration completed successfully"
```

#### Manual Migration

```bash
# Connect to database
psql -h localhost -U chitlaq_user -d chitlaq_db

# Run migration scripts
\i migration_001_schema_update.sql
\i migration_002_data_migration.sql
\i migration_003_indexes.sql

# Verify changes
\d users
\d universities
\d user_roles

# Exit
\q
```

## Configuration Changes

### Environment Variables

#### New Variables

```env
# JWT Configuration
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_ISSUER=chitlaq.com
JWT_AUDIENCE=chitlaq-api
JWT_ALGORITHM=HS256

# Database Configuration
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=false
DB_POOL_MIN=2
DB_POOL_MAX=20

# Security Configuration
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
ENABLE_MFA=true
MFA_ISSUER=ChitLaq

# Monitoring Configuration
ENABLE_METRICS=true
METRICS_PORT=9090
LOG_LEVEL=info
```

#### Updated Variables

```env
# Updated JWT configuration
JWT_SECRET=your-new-secret-key  # Rotated for security
JWT_EXPIRES_IN=1h              # Changed from 24h
JWT_REFRESH_EXPIRES_IN=30d     # New refresh token expiry

# Updated database configuration
DB_HOST=localhost              # No change
DB_PORT=5432                  # No change
DB_NAME=chitlaq_db            # No change
DB_USER=chitlaq_user          # No change
DB_PASSWORD=your-password     # Rotated for security
```

### Application Configuration

#### Updated Config Files

```javascript
// config/database.js
module.exports = {
  development: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true',
    pool: {
      min: parseInt(process.env.DB_POOL_MIN) || 2,
      max: parseInt(process.env.DB_POOL_MAX) || 20,
      acquire: 30000,
      idle: 10000
    }
  }
};
```

```javascript
// config/jwt.js
module.exports = {
  accessToken: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    issuer: process.env.JWT_ISSUER || 'chitlaq.com',
    audience: process.env.JWT_AUDIENCE || 'chitlaq-api',
    algorithm: process.env.JWT_ALGORITHM || 'HS256'
  },
  refreshToken: {
    secret: process.env.JWT_REFRESH_SECRET,
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    issuer: process.env.JWT_ISSUER || 'chitlaq.com',
    audience: process.env.JWT_AUDIENCE || 'chitlaq-api',
    algorithm: process.env.JWT_ALGORITHM || 'HS256'
  }
};
```

### Nginx Configuration

#### Updated Nginx Config

```nginx
# nginx.conf
server {
    listen 443 ssl http2;
    server_name api.chitlaq.com;
    
    # SSL Configuration
    ssl_certificate /etc/ssl/certs/chitlaq.crt;
    ssl_certificate_key /etc/ssl/private/chitlaq.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=auth:10m rate=10r/m;
    limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m;
    
    # API Routes
    location /auth/ {
        limit_req zone=auth burst=5 nodelay;
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Client-Side Updates

### JavaScript SDK Updates

#### Updated SDK Usage

```javascript
// Before (v1.x)
import { ChitLaqAuth } from '@chitlaq/auth-sdk';

const auth = new ChitLaqAuth({
  apiUrl: 'https://api.chitlaq.com',
  apiKey: 'your-api-key'
});

// After (v2.0.0)
import { ChitLaqAuth } from '@chitlaq/auth-sdk';

const auth = new ChitLaqAuth({
  apiUrl: 'https://api.chitlaq.com',
  apiKey: 'your-api-key',
  version: '2.0.0',
  enableMFA: true,
  tokenRefresh: true
});
```

#### Updated Token Handling

```javascript
// Before (v1.x)
const token = await auth.login(email, password);
localStorage.setItem('token', token);

// After (v2.0.0)
const authResult = await auth.login(email, password);
localStorage.setItem('accessToken', authResult.accessToken);
localStorage.setItem('refreshToken', authResult.refreshToken);

// Automatic token refresh
auth.onTokenRefresh((newTokens) => {
  localStorage.setItem('accessToken', newTokens.accessToken);
  localStorage.setItem('refreshToken', newTokens.refreshToken);
});
```

#### Updated User Data Handling

```javascript
// Before (v1.x)
const user = await auth.getCurrentUser();
console.log(user.email);

// After (v2.0.0)
const user = await auth.getCurrentUser();
console.log(user.email);
console.log(user.universityId);
console.log(user.role);
```

### React Component Updates

#### Updated Auth Context

```javascript
// Before (v1.x)
const AuthContext = createContext({
  user: null,
  token: null,
  login: () => {},
  logout: () => {}
});

// After (v2.0.0)
const AuthContext = createContext({
  user: null,
  accessToken: null,
  refreshToken: null,
  login: () => {},
  logout: () => {},
  refreshTokens: () => {},
  enableMFA: () => {}
});
```

#### Updated Auth Hook

```javascript
// Before (v1.x)
const useAuth = () => {
  const { user, token, login, logout } = useContext(AuthContext);
  return { user, token, login, logout };
};

// After (v2.0.0)
const useAuth = () => {
  const { 
    user, 
    accessToken, 
    refreshToken, 
    login, 
    logout, 
    refreshTokens, 
    enableMFA 
  } = useContext(AuthContext);
  
  return { 
    user, 
    accessToken, 
    refreshToken, 
    login, 
    logout, 
    refreshTokens, 
    enableMFA 
  };
};
```

### Mobile App Updates

#### Updated React Native Integration

```javascript
// Before (v1.x)
import { ChitLaqAuth } from '@chitlaq/auth-react-native';

const auth = new ChitLaqAuth({
  apiUrl: 'https://api.chitlaq.com'
});

// After (v2.0.0)
import { ChitLaqAuth } from '@chitlaq/auth-react-native';

const auth = new ChitLaqAuth({
  apiUrl: 'https://api.chitlaq.com',
  version: '2.0.0',
  enableBiometrics: true,
  enableMFA: true
});
```

#### Updated Token Storage

```javascript
// Before (v1.x)
import AsyncStorage from '@react-native-async-storage/async-storage';

await AsyncStorage.setItem('token', token);

// After (v2.0.0)
import * as SecureStore from 'expo-secure-store';

await SecureStore.setItemAsync('accessToken', accessToken);
await SecureStore.setItemAsync('refreshToken', refreshToken);
```

## Rollback Procedures

### Database Rollback

#### Automated Rollback

```bash
#!/bin/bash
# rollback-database.sh

set -e

BACKUP_FILE=$1
DB_NAME="chitlaq_db"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup-file>"
    exit 1
fi

echo "Rolling back database to $BACKUP_FILE"

# Stop application
systemctl stop chitlaq-auth
systemctl stop chitlaq-api

# Restore database
echo "Restoring database from backup..."
psql -h localhost -U chitlaq_user -d $DB_NAME < "$BACKUP_FILE"

# Start application
systemctl start chitlaq-auth
systemctl start chitlaq-api

echo "Database rollback completed successfully"
```

#### Manual Rollback

```bash
# Stop services
systemctl stop chitlaq-auth
systemctl stop chitlaq-api

# Restore database
psql -h localhost -U chitlaq_user -d chitlaq_db < backup_20240115_103000.sql

# Start services
systemctl start chitlaq-auth
systemctl start chitlaq-api
```

### Application Rollback

#### Git Rollback

```bash
# Rollback to previous version
git checkout v1.5.0

# Install dependencies
npm install

# Restart services
systemctl restart chitlaq-auth
systemctl restart chitlaq-api
```

#### Docker Rollback

```bash
# Rollback to previous image
docker-compose down
docker-compose up -d --scale chitlaq-auth=0
docker-compose up -d chitlaq-auth:v1.5.0
```

### Configuration Rollback

```bash
# Restore configuration files
cp -r /opt/chitlaq/config_backup_20240115_103000/* /opt/chitlaq/config/

# Restart services
systemctl restart chitlaq-auth
systemctl restart chitlaq-api
systemctl restart nginx
```

## Post-Migration Validation

### Health Checks

#### API Health Check

```bash
#!/bin/bash
# health-check.sh

API_URL="https://api.chitlaq.com"
HEALTH_ENDPOINT="$API_URL/health"

echo "Running health checks..."

# Check API health
response=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_ENDPOINT")
if [ "$response" = "200" ]; then
    echo "✅ API health check passed"
else
    echo "❌ API health check failed (HTTP $response)"
    exit 1
fi

# Check database connectivity
db_check=$(curl -s "$API_URL/health/database")
if echo "$db_check" | grep -q "healthy"; then
    echo "✅ Database health check passed"
else
    echo "❌ Database health check failed"
    exit 1
fi

# Check Redis connectivity
redis_check=$(curl -s "$API_URL/health/redis")
if echo "$redis_check" | grep -q "healthy"; then
    echo "✅ Redis health check passed"
else
    echo "❌ Redis health check failed"
    exit 1
fi

echo "All health checks passed!"
```

#### Functional Tests

```bash
#!/bin/bash
# functional-tests.sh

API_URL="https://api.chitlaq.com"

echo "Running functional tests..."

# Test user registration
echo "Testing user registration..."
register_response=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@university.edu","password":"Test123!","firstName":"Test","lastName":"User"}')

if echo "$register_response" | grep -q "success"; then
    echo "✅ User registration test passed"
else
    echo "❌ User registration test failed"
    exit 1
fi

# Test user login
echo "Testing user login..."
login_response=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@university.edu","password":"Test123!"}')

if echo "$login_response" | grep -q "accessToken"; then
    echo "✅ User login test passed"
else
    echo "❌ User login test failed"
    exit 1
fi

echo "All functional tests passed!"
```

### Performance Validation

#### Load Testing

```bash
#!/bin/bash
# load-test.sh

API_URL="https://api.chitlaq.com"

echo "Running load tests..."

# Run k6 load test
k6 run --vus 100 --duration 5m load-test.js

# Check results
if [ $? -eq 0 ]; then
    echo "✅ Load tests passed"
else
    echo "❌ Load tests failed"
    exit 1
fi
```

#### Performance Monitoring

```bash
#!/bin/bash
# performance-monitor.sh

echo "Monitoring performance metrics..."

# Check response times
response_time=$(curl -s -w "%{time_total}" -o /dev/null "https://api.chitlaq.com/health")
if (( $(echo "$response_time < 1.0" | bc -l) )); then
    echo "✅ Response time acceptable: ${response_time}s"
else
    echo "❌ Response time too high: ${response_time}s"
fi

# Check memory usage
memory_usage=$(ps aux | grep chitlaq-auth | awk '{sum+=$6} END {print sum/1024}')
if (( $(echo "$memory_usage < 512" | bc -l) )); then
    echo "✅ Memory usage acceptable: ${memory_usage}MB"
else
    echo "❌ Memory usage too high: ${memory_usage}MB"
fi
```

### Security Validation

#### Security Scan

```bash
#!/bin/bash
# security-scan.sh

echo "Running security scans..."

# Run OWASP ZAP scan
zap-baseline.py -t https://api.chitlaq.com -r security-report.html

# Check for vulnerabilities
if grep -q "HIGH" security-report.html; then
    echo "❌ High severity vulnerabilities found"
    exit 1
else
    echo "✅ No high severity vulnerabilities found"
fi
```

#### SSL/TLS Validation

```bash
#!/bin/bash
# ssl-validation.sh

echo "Validating SSL/TLS configuration..."

# Check SSL certificate
ssl_check=$(echo | openssl s_client -servername api.chitlaq.com -connect api.chitlaq.com:443 2>/dev/null | openssl x509 -noout -dates)
if [ $? -eq 0 ]; then
    echo "✅ SSL certificate valid"
else
    echo "❌ SSL certificate invalid"
    exit 1
fi

# Check TLS version
tls_check=$(echo | openssl s_client -servername api.chitlaq.com -connect api.chitlaq.com:443 2>/dev/null | grep "Protocol")
if echo "$tls_check" | grep -q "TLSv1.2\|TLSv1.3"; then
    echo "✅ TLS version acceptable"
else
    echo "❌ TLS version too old"
    exit 1
fi
```

## Conclusion

This migration guide provides comprehensive instructions for upgrading the ChitLaq Authentication API. Always test migrations in a staging environment before applying to production, and maintain proper backups for rollback scenarios.

### Key Points

- **Plan thoroughly**: Review all changes and plan migration timeline
- **Test extensively**: Validate all functionality in staging
- **Backup everything**: Maintain backups for rollback scenarios
- **Monitor closely**: Watch system health during and after migration
- **Document changes**: Keep records of all modifications
- **Train team**: Ensure team understands new features and changes

### Support

For migration assistance:
- **Documentation**: [docs.chitlaq.com](https://docs.chitlaq.com)
- **Support**: support@chitlaq.com
- **Community**: [discord.gg/chitlaq](https://discord.gg/chitlaq)
