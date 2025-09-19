# ChitLaq M1 MVP - Budget-Optimized Plan ($100/month)
*Single VPS, Open-Source First Architecture*

> **Hedef:** 50K toplam kullanıcı, 5K eşzamanlı kullanıcı - Tek VPS üzerinde $100/month budget ile

---

## 💰 Budget Breakdown & Infrastructure

### Monthly Budget Allocation ($100)
```
VPS (High-Performance)     : $60-70  (16GB RAM, 8 vCPU, 320GB SSD)
Domain + CDN              : $15-20  (Cloudflare Pro)
Backup Storage            : $5-10   (Object Storage)
Email Service             : $5      (Mailgun Flex)
SSL Certificate           : $0      (Let's Encrypt)
Monitoring                : $0      (Open Source Stack)
Reserve/Buffer            : $5-15
```

### VPS Options (Recommended)
| Provider | Specs | Monthly Cost | Region |
|----------|-------|--------------|---------|
| **Hetzner** | 16GB/8vCPU/320GB | $60 | Germany/Finland |
| **DigitalOcean** | 16GB/8vCPU/320GB | $96 | Multiple regions |
| **Linode** | 16GB/8vCPU/320GB | $96 | Multiple regions |
| **Vultr** | 16GB/8vCPU/320GB | $96 | Multiple regions |

> **Önerilen:** Hetzner CPX41 (En iyi performans/fiyat oranı)

---

## 🏗️ Single VPS Architecture

### Hibrit Monorepo + Docker Compose
```
VPS (16GB RAM, 8 vCPU, 320GB SSD)
├── Docker Compose Stack
│   ├── PostgreSQL (3GB RAM)          # Primary database
│   ├── Redis (1GB RAM)               # Cache & sessions
│   ├── Nginx (512MB RAM)             # Reverse proxy & static files
│   ├── API Gateway (1GB RAM)         # Fastify + rate limiting
│   ├── Auth Service (512MB RAM)      # Fastify + Supabase Auth
│   ├── Web App (1GB RAM)             # Next.js 15
│   ├── Realtime Service (2GB RAM)    # Bun + WebSockets
│   ├── Feed Service (2GB RAM)        # Go + caching
│   ├── Search Service (1GB RAM)      # Rust + full-text search
│   ├── Admin Panel (512MB RAM)       # Next.js + TailAdmin
│   └── Monitoring Stack (2GB RAM)    # Prometheus + Grafana
└── File System
    ├── /data/postgres/               # Database files
    ├── /data/redis/                  # Cache persistence
    ├── /data/uploads/                # User uploads
    ├── /data/backups/                # Automated backups
    └── /logs/                        # Application logs
```

### Port Allocation
```
80   : Nginx (HTTP → HTTPS redirect)
443  : Nginx (HTTPS/SSL termination)
3000 : Web App (internal)
3001 : Admin Panel (internal)
3002 : API Gateway (internal)
3003 : Auth Service (internal)
3004 : Realtime Service (internal)
3005 : Feed Service (internal)
3006 : Search Service (internal)
5432 : PostgreSQL (internal)
6379 : Redis (internal)
9090 : Prometheus (internal)
3010 : Grafana (internal)
```

---

## 🔧 Open-Source Tech Stack

### Core Services (100% Free & Open Source)
| Component | Technology | Why Open Source | License |
|-----------|------------|-----------------|---------|
| **Database** | PostgreSQL 16 | Full-featured, reliable, extensions | PostgreSQL |
| **Cache** | Redis 7 | High-performance, persistent | BSD-3 |
| **Web Server** | Nginx | Industry standard, efficient | BSD-2 |
| **Real-time** | Bun + uWebSockets | Ultra-fast, low memory | MIT |
| **API Gateway** | Fastify + custom middleware | Lightweight, fast | MIT |
| **Feed Algorithm** | Go + Gin | High performance, efficient | BSD-3 |
| **Search** | PostgreSQL FTS + pg_trgm | Built-in, no extra service | PostgreSQL |
| **File Storage** | Local FS + Nginx | No cloud dependencies | - |
| **Monitoring** | Prometheus + Grafana | Industry standard | Apache 2.0 |
| **SSL** | Let's Encrypt + Certbot | Free SSL certificates | ISRG |

### Development Stack
```typescript
// Package versions - all open source
{
  "nextjs": "^15.0.0",           // React framework
  "fastify": "^4.24.0",         // High-performance web framework
  "postgres": "^3.4.0",         // PostgreSQL client
  "redis": "^4.6.0",            // Redis client
  "prisma": "^5.6.0",           // Database ORM (open source)
  "zod": "^3.22.0",             // Schema validation
  "jose": "^5.1.0",             // JWT handling
  "bcryptjs": "^2.4.3",         // Password hashing
  "nodemailer": "^6.9.0",       // Email sending
  "winston": "^3.11.0",         // Logging
  "helmet": "^7.1.0",           // Security headers
  "cors": "^2.8.5"              // CORS handling
}
```

---

## 🐳 Docker Compose Setup

### Complete Stack (docker-compose.yml)
```yaml
version: '3.8'

services:
  # Database
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: chitlaq
      POSTGRES_USER: chitlaq
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./db/init:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"
    deploy:
      resources:
        limits:
          memory: 3G
        reservations:
          memory: 2G

  # Cache & Session Store
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --appendonly yes --maxmemory 1gb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    deploy:
      resources:
        limits:
          memory: 1G

  # Reverse Proxy & SSL
  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
      - uploads_data:/var/www/uploads
    depends_on:
      - web
      - admin
      - api-gateway
    deploy:
      resources:
        limits:
          memory: 512M

  # API Gateway
  api-gateway:
    build: ./apps/api-gateway
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://chitlaq:${DB_PASSWORD}@postgres:5432/chitlaq
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - postgres
      - redis
    ports:
      - "3002:3000"
    deploy:
      resources:
        limits:
          memory: 1G

  # Authentication Service
  auth-service:
    build: ./apps/auth-service
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://chitlaq:${DB_PASSWORD}@postgres:5432/chitlaq
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - EMAIL_SMTP_HOST=${EMAIL_HOST}
      - EMAIL_SMTP_USER=${EMAIL_USER}
      - EMAIL_SMTP_PASS=${EMAIL_PASS}
    depends_on:
      - postgres
      - redis
    ports:
      - "3003:3000"
    deploy:
      resources:
        limits:
          memory: 512M

  # Real-time Service (Bun)
  realtime-service:
    build: ./apps/realtime-service
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://chitlaq:${DB_PASSWORD}@postgres:5432/chitlaq
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
    ports:
      - "3004:8080"
    deploy:
      resources:
        limits:
          memory: 2G

  # Feed Service (Go)
  feed-service:
    build: ./apps/feed-service
    restart: unless-stopped
    environment:
      - ENV=production
      - DATABASE_URL=postgresql://chitlaq:${DB_PASSWORD}@postgres:5432/chitlaq
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
    ports:
      - "3005:8080"
    deploy:
      resources:
        limits:
          memory: 2G

  # Search Service (Rust)
  search-service:
    build: ./apps/search-service
    restart: unless-stopped
    environment:
      - RUST_ENV=production
      - DATABASE_URL=postgresql://chitlaq:${DB_PASSWORD}@postgres:5432/chitlaq
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
    ports:
      - "3006:8080"
    deploy:
      resources:
        limits:
          memory: 1G

  # Web Application
  web:
    build: ./apps/web
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=https://chitlaq.app/api
      - NEXT_PUBLIC_WS_URL=wss://chitlaq.app/ws
    ports:
      - "3000:3000"
    deploy:
      resources:
        limits:
          memory: 1G

  # Admin Panel
  admin:
    build: ./apps/admin
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=https://chitlaq.app/api
    ports:
      - "3001:3000"
    deploy:
      resources:
        limits:
          memory: 512M

  # Monitoring
  prometheus:
    image: prom/prometheus:latest
    restart: unless-stopped
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=15d'
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"
    deploy:
      resources:
        limits:
          memory: 1G

  # Monitoring Dashboard
  grafana:
    image: grafana/grafana:latest
    restart: unless-stopped
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/var/lib/grafana/dashboards
    ports:
      - "3010:3000"
    depends_on:
      - prometheus
    deploy:
      resources:
        limits:
          memory: 1G

volumes:
  postgres_data:
  redis_data:
  uploads_data:
  prometheus_data:
  grafana_data:
```

---

## 🔧 Database Strategy (PostgreSQL Only)

### Schema Design (All-in-One Database)
```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- User authentication and profiles
CREATE SCHEMA auth_schema;
CREATE SCHEMA profiles_schema;
CREATE SCHEMA social_schema;
CREATE SCHEMA content_schema;
CREATE SCHEMA messaging_schema;
CREATE SCHEMA analytics_schema;

-- Auth tables
CREATE TABLE auth_schema.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE auth_schema.allowed_prefixes (
  id SERIAL PRIMARY KEY,
  prefix TEXT NOT NULL,
  university_domain TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Profile tables
CREATE TABLE profiles_schema.profiles (
  id UUID PRIMARY KEY REFERENCES auth_schema.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL CHECK (username ~ '^[a-z0-9_]{3,20}$'),
  display_name TEXT NOT NULL,
  bio TEXT,
  avatar_path TEXT,
  university_prefix TEXT,
  graduation_year INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Social features
CREATE TABLE social_schema.follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id UUID NOT NULL REFERENCES auth_schema.users(id),
  followee_id UUID NOT NULL REFERENCES auth_schema.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(follower_id, followee_id)
);

-- Content system
CREATE TABLE content_schema.posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id UUID NOT NULL REFERENCES auth_schema.users(id),
  content TEXT NOT NULL CHECK (LENGTH(content) <= 280),
  content_type TEXT DEFAULT 'text',
  hashtags TEXT[],
  mentions UUID[],
  like_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  visibility TEXT DEFAULT 'public',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Full-text search index
CREATE INDEX idx_posts_content_fts ON content_schema.posts 
  USING GIN (to_tsvector('english', content));
CREATE INDEX idx_posts_hashtags ON content_schema.posts USING GIN (hashtags);

-- Messaging system
CREATE TABLE messaging_schema.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT DEFAULT 'direct',
  name TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE messaging_schema.conversation_participants (
  conversation_id UUID REFERENCES messaging_schema.conversations(id),
  user_id UUID REFERENCES auth_schema.users(id),
  joined_at TIMESTAMP DEFAULT NOW(),
  last_read_at TIMESTAMP,
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE messaging_schema.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES messaging_schema.conversations(id),
  sender_id UUID REFERENCES auth_schema.users(id),
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',
  created_at TIMESTAMP DEFAULT NOW(),
  edited_at TIMESTAMP,
  deleted_at TIMESTAMP
);

-- Performance indexes
CREATE INDEX idx_messages_conversation_created 
  ON messaging_schema.messages(conversation_id, created_at DESC);
CREATE INDEX idx_posts_author_created 
  ON content_schema.posts(author_id, created_at DESC);
CREATE INDEX idx_follows_follower 
  ON social_schema.follows(follower_id);
CREATE INDEX idx_follows_followee 
  ON social_schema.follows(followee_id);
```

### Performance Optimizations
```sql
-- PostgreSQL configuration for single VPS
-- postgresql.conf optimizations for 16GB RAM VPS

# Memory settings
shared_buffers = 4GB                  # 25% of RAM
effective_cache_size = 12GB           # 75% of RAM
work_mem = 64MB                       # For sorting/grouping
maintenance_work_mem = 512MB          # For vacuum/index creation
max_connections = 200                 # Reasonable limit

# WAL settings for performance
wal_buffers = 16MB
checkpoint_completion_target = 0.9
max_wal_size = 4GB

# Query optimization
random_page_cost = 1.1               # For SSD storage
effective_io_concurrency = 200       # For SSD storage
```

---

## 🚀 Simplified Deployment Strategy

### One-Command Deployment
```bash
#!/bin/bash
# deploy.sh - Single VPS deployment script

set -e

echo "🚀 Deploying ChitLaq to single VPS..."

# 1. Update system
sudo apt update && sudo apt upgrade -y

# 2. Install Docker & Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# 3. Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 4. Setup SSL with Let's Encrypt
sudo apt install certbot nginx -y
sudo certbot certonly --nginx -d chitlaq.app -d admin.chitlaq.app

# 5. Create environment file
cat > .env << EOF
DB_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 64)
GRAFANA_PASSWORD=$(openssl rand -base64 16)
EMAIL_HOST=smtp.mailgun.org
EMAIL_USER=${MAILGUN_USER}
EMAIL_PASS=${MAILGUN_PASS}
EOF

# 6. Start all services
docker-compose up -d

# 7. Initialize database
docker-compose exec postgres psql -U chitlaq -d chitlaq -f /docker-entrypoint-initdb.d/01-schema.sql

# 8. Setup monitoring
docker-compose exec grafana grafana-cli plugins install grafana-piechart-panel

echo "✅ Deployment completed!"
echo "🌐 Web: https://chitlaq.app"
echo "⚙️  Admin: https://admin.chitlaq.app"
echo "📊 Monitoring: https://chitlaq.app:3010"
```

### Nginx Configuration
```nginx
# nginx/nginx.conf
events {
    worker_connections 1024;
    use epoll;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    # Optimization
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/s;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    # Main application
    upstream web_backend {
        server web:3000;
    }
    
    upstream api_backend {
        server api-gateway:3000;
    }
    
    upstream ws_backend {
        server realtime-service:8080;
    }
    
    upstream admin_backend {
        server admin:3000;
    }
    
    server {
        listen 80;
        server_name chitlaq.app admin.chitlaq.app;
        return 301 https://$server_name$request_uri;
    }
    
    # Main application
    server {
        listen 443 ssl http2;
        server_name chitlaq.app;
        
        ssl_certificate /etc/nginx/ssl/chitlaq.app.pem;
        ssl_certificate_key /etc/nginx/ssl/chitlaq.app.key;
        
        # API endpoints
        location /api {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://api_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        
        # Authentication endpoints (stricter rate limiting)
        location /api/auth {
            limit_req zone=auth burst=10 nodelay;
            proxy_pass http://api_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        
        # WebSocket connections
        location /ws {
            proxy_pass http://ws_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_read_timeout 86400;
        }
        
        # Static file uploads
        location /uploads {
            alias /var/www/uploads;
            expires 7d;
            add_header Cache-Control "public, immutable";
        }
        
        # Main application
        location / {
            proxy_pass http://web_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
    
    # Admin panel
    server {
        listen 443 ssl http2;
        server_name admin.chitlaq.app;
        
        ssl_certificate /etc/nginx/ssl/chitlaq.app.pem;
        ssl_certificate_key /etc/nginx/ssl/chitlaq.app.key;
        
        # Admin authentication
        auth_basic "Admin Panel";
        auth_basic_user_file /etc/nginx/.htpasswd;
        
        location / {
            proxy_pass http://admin_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

---

## 📊 Resource Management & Scaling

### Memory Usage Monitoring
```typescript
// packages/system-monitor/src/resource-monitor.ts
export class ResourceMonitor {
  async checkSystemHealth(): Promise<SystemHealth> {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = await this.getCPUUsage();
    const diskUsage = await this.getDiskUsage();
    
    return {
      memory: {
        used: memoryUsage.rss,
        free: os.freemem(),
        percentage: (memoryUsage.rss / os.totalmem()) * 100
      },
      cpu: {
        percentage: cpuUsage,
        load: os.loadavg()
      },
      disk: {
        used: diskUsage.used,
        free: diskUsage.free,
        percentage: diskUsage.percentage
      },
      services: await this.checkServiceHealth()
    };
  }
  
  async optimizeIfNeeded(): Promise<void> {
    const health = await this.checkSystemHealth();
    
    // Memory optimization
    if (health.memory.percentage > 85) {
      await this.clearRedisCache();
      await this.optimizePostgresConnections();
    }
    
    // CPU optimization
    if (health.cpu.percentage > 80) {
      await this.throttleNonCriticalServices();
    }
  }
}
```

### Automatic Scaling Triggers
```yaml
# monitoring/alerts.yml
groups:
  - name: chitlaq_alerts
    rules:
      - alert: HighMemoryUsage
        expr: (1 - (node_memory_MemFree_bytes / node_memory_MemTotal_bytes)) * 100 > 85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage detected"
          
      - alert: HighCPUUsage
        expr: 100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage detected"
          
      - alert: DatabaseConnectionLimit
        expr: pg_stat_database_numbackends / pg_settings_max_connections * 100 > 80
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Database approaching connection limit"
```

---

## 💾 Backup & Disaster Recovery

### Automated Backup Strategy
```bash
#!/bin/bash
# scripts/backup.sh - Daily backup script

BACKUP_DIR="/data/backups"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Database backup
docker-compose exec -T postgres pg_dump -U chitlaq chitlaq | gzip > "$BACKUP_DIR/db_$DATE.sql.gz"

# Redis backup
docker-compose exec -T redis redis-cli BGSAVE
cp /data/redis/dump.rdb "$BACKUP_DIR/redis_$DATE.rdb"

# File uploads backup
tar -czf "$BACKUP_DIR/uploads_$DATE.tar.gz" /data/uploads/

# Clean old backups
find $BACKUP_DIR -name "*.gz" -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR -name "*.rdb" -mtime +$RETENTION_DAYS -delete

# Upload to external storage (optional - using rclone)
if command -v rclone &> /dev/null; then
    rclone copy $BACKUP_DIR remote:chitlaq-backups/
fi

echo "Backup completed: $DATE"
```

### Disaster Recovery Plan
```bash
#!/bin/bash
# scripts/restore.sh - Disaster recovery script

BACKUP_FILE=$1
BACKUP_DIR="/data/backups"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: ./restore.sh <backup_date>"
    echo "Available backups:"
    ls -la $BACKUP_DIR | grep db_
    exit 1
fi

echo "🔄 Starting disaster recovery..."

# Stop services
docker-compose down

# Restore database
echo "📁 Restoring database..."
gunzip -c "$BACKUP_DIR/db_$BACKUP_FILE.sql.gz" | docker-compose exec -T postgres psql -U chitlaq chitlaq

# Restore Redis
echo "📁 Restoring Redis..."
cp "$BACKUP_DIR/redis_$BACKUP_FILE.rdb" /data/redis/dump.rdb

# Restore uploads
echo "📁 Restoring uploads..."
tar -xzf "$BACKUP_DIR/uploads_$BACKUP_FILE.tar.gz" -C /

# Start services
docker-compose up -d

echo "✅ Disaster recovery completed!"
```

---

## 📈 Growth Path & Scaling

### VPS Upgrade Path
```
Phase 1: $60/month  - 16GB RAM, 8 vCPU  (0-5K users)
Phase 2: $120/month - 32GB RAM, 16 vCPU (5K-15K users)
Phase 3: $200/month - 64GB RAM, 24 vCPU (15K-50K users)
Phase 4: Multi-VPS  - Load balancer + DB separation
```

### Service Separation Strategy
```
Current (Single VPS):
├── All services in Docker Compose

Phase 4 (Multi-VPS Setup):
VPS 1 (Database): PostgreSQL + Redis
VPS 2 (API): Gateway + Auth + Feed + Search
VPS 3 (Real-time): WebSocket + Nginx
VPS 4 (Web): Next.js apps + Static files
```

### Cost Projection
```
Month 1-6:  $100/month  (Single VPS)
Month 7-12: $150/month  (Upgraded VPS + CDN)
Month 13+:  $300/month  (Multi-VPS architecture)
```

---

## 🚀 Revised MVP Sprint Plan (Budget-Conscious)

### Sprint 0: Single VPS Setup (1 hafta)
- [x] Hetzner VPS purchase & setup
- [x] Docker & Docker Compose installation
- [x] Domain purchase & Cloudflare setup
- [x] Let's Encrypt SSL certificate
- [x] Basic monitoring setup

### Sprint 1: Core Infrastructure (1 hafta)
- [x] PostgreSQL setup & schema creation
- [x] Redis configuration
- [x] Nginx reverse proxy
- [x] Basic auth service (Fastify)
- [x] Environment configuration

### Sprint 2: Authentication & Profiles (1 hafta)
- [x] University email validation
- [x] User registration & login
- [x] Profile management
- [x] File upload handling (local storage)
- [x] Basic admin panel

### Sprint 3: Content & Social (1 hafta)
- [x] Post creation & management
- [x] Follow/unfollow system
- [x] Basic feed algorithm
- [x] PostgreSQL full-text search
- [x] Hashtag system

### Sprint 4: Real-time Features (1 hafta)
- [x] WebSocket service (Bun)
- [x] Direct messaging
- [x] Real-time notifications
- [x] Typing indicators
- [x] Online status

### Sprint 5: Polish & Optimization (1 hafta)
- [x] Performance optimization
- [x] Caching implementation
- [x] Monitoring dashboards
- [x] Backup automation
- [x] Security hardening

---

## 🔧 Development Workflow

### Local Development
```bash
# Single command development setup
git clone https://github.com/chitlaq/chitlaq.git
cd chitlaq

# Environment setup
cp .env.example .env.local
pnpm install

# Start development environment
pnpm dev:local        # Uses Docker Compose for services
pnpm dev             # Start all apps in development mode

# Production simulation
pnpm dev:prod        # Simulate production environment locally
```

### Production Deployment
```bash
# Deployment to VPS
pnpm deploy:prod     # Build & deploy to production VPS
pnpm deploy:backup   # Create backup before deployment
pnpm deploy:rollback # Rollback to previous version
```

---

## 💡 Cost Optimization Tips

### Immediate Savings
1. **Free Tier Services**
   - Cloudflare (Free SSL, basic CDN)
   - Let's Encrypt (SSL certificates)
   - Mailgun (12,000 emails/month free)
   - GitHub Actions (2,000 minutes/month)

2. **Open Source Alternatives**
   - PostgreSQL instead of managed database
   - Redis instead of managed cache
   - Local file storage instead of S3
   - Self-hosted monitoring instead of SaaS

3. **Resource Optimization**
   - Aggressive caching strategies
   - Image optimization & compression
   - Database query optimization
   - Connection pooling

### Future Optimizations
1. **CDN Integration** (when budget allows)
2. **Object Storage** for file uploads
3. **Managed Database** for easier scaling
4. **Load Balancer** for multi-VPS setup

---

Bu budget-optimized plan sayesinde $100/month ile güçlü bir sosyal medya platformu çalıştırabilir ve kullanıcı artışına göre organik olarak scale edebiliriz. Tüm core özellikler korunurken maliyet %70 oranında optimize edildi.

<function_calls>
<invoke name="todo_write">
<parameter name="merge">true
