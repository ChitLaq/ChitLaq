# ChitLaq M1 MVP - Social Media Platform for Universities

> **Production-ready social media platform designed specifically for university communities**

[![Docker](https://img.shields.io/badge/Docker-Ready-blue?logo=docker)](https://docker.com)
[![Supabase](https://img.shields.io/badge/Supabase-Self--Hosted-green?logo=supabase)](https://supabase.com)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Performance](https://img.shields.io/badge/Performance-Optimized-brightgreen)](docs/performance.md)

## 🚀 Quick Start

Get ChitLaq running in **5 minutes** with our one-command deployment:

```bash
# 1. Clone the repository
git clone https://github.com/your-org/chitlaq.git
cd chitlaq

# 2. Configure environment
cp env.example .env
# Edit .env with your configuration

# 3. Deploy everything
bash scripts/deploy.sh
```

**That's it!** 🎉 Your ChitLaq instance will be running at `http://localhost`

## 📋 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Quick Deployment](#-quick-deployment)
- [Configuration](#-configuration)
- [Development](#-development)
- [Monitoring](#-monitoring)
- [Security](#-security)
- [Performance](#-performance)
- [Backup & Recovery](#-backup--recovery)
- [API Documentation](#-api-documentation)
- [Contributing](#-contributing)
- [Support](#-support)

## ✨ Features

### 🎓 University-Focused Social Network
- **University Email Validation**: Secure registration with edu domain verification
- **Department Networks**: Connect with peers in your academic department
- **Academic Calendar Integration**: Event-aware content and interactions
- **Cross-University Collaboration**: Safe inter-university networking

### 💬 Real-time Communication
- **Instant Messaging**: Ultra-fast WebSocket-powered chat
- **Live Notifications**: Real-time updates for all interactions
- **Typing Indicators**: Live conversation feedback
- **Message History**: Persistent, searchable message archive

### 📱 Social Features
- **Smart Feed Algorithm**: Personalized content based on interests and connections
- **University Trending**: Campus-specific trending topics and hashtags
- **Friend Suggestions**: Intelligent recommendations based on academic networks
- **Content Discovery**: Advanced search and exploration tools

### 🛡️ Privacy & Safety
- **Granular Privacy Controls**: Fine-tune who sees your content
- **Content Moderation**: AI-powered + human moderation workflows
- **Block & Report**: Comprehensive safety tools
- **GDPR Compliant**: Privacy-first architecture

### 📊 Analytics & Insights
- **Real-time Metrics**: Comprehensive monitoring with Prometheus + Grafana
- **User Analytics**: Privacy-compliant engagement insights
- **Performance Monitoring**: 99.9% uptime with automated alerting
- **Business Intelligence**: University community health metrics

## 🏗️ Architecture

ChitLaq uses a **hybrid monorepo architecture** optimized for performance and maintainability:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Nginx Proxy   │    │   Grafana UI    │    │  Supabase UI    │
│   (Port 80/443) │    │   (Port 3000)   │    │   (Port 3010)   │
└─────────┬───────┘    └─────────────────┘    └─────────────────┘
          │
┌─────────▼───────┐    ┌─────────────────┐    ┌─────────────────┐
│  Kong Gateway   │────│  Auth Service   │    │ Storage Service │
│   (Port 8000)   │    │   (Port 9999)   │    │   (Port 5000)   │
└─────────┬───────┘    └─────────────────┘    └─────────────────┘
          │
┌─────────▼───────┐    ┌─────────────────┐    ┌─────────────────┐
│   PostgreSQL    │    │      Redis      │    │   Prometheus    │
│   (Port 5432)   │    │   (Port 6379)   │    │   (Port 9090)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 🎯 Performance-First Tech Stack
- **Database**: PostgreSQL 15 with optimized indexing
- **Cache**: Redis with intelligent caching strategies
- **Real-time**: Supabase Realtime + Custom WebSocket
- **API Gateway**: Kong with rate limiting and security
- **Reverse Proxy**: Nginx with SSL termination
- **Monitoring**: Prometheus + Grafana stack
- **Storage**: Supabase Storage with image optimization

## 🚀 Quick Deployment

### Prerequisites
- **Docker** 20.10+ and **Docker Compose** 2.0+
- **16GB RAM** and **8 vCPU** (production) / 8GB RAM (development)
- **20GB** free disk space
- **Domain name** with DNS access (production)

### 1. Environment Setup

```bash
# Copy environment template
cp env.example .env

# Edit configuration (required variables)
nano .env
```

**🔑 Required Configuration:**
```bash
# Database
POSTGRES_PASSWORD=your_super_secure_password

# JWT Security
JWT_SECRET=your_jwt_secret_minimum_32_characters_long
SECRET_KEY_BASE=your_secret_key_base_minimum_64_characters_long

# Supabase Keys (generate at https://supabase.com/docs/guides/api#api-keys)
ANON_KEY=your_anon_key_here
SERVICE_ROLE_KEY=your_service_role_key_here

# Domains
SITE_URL=https://chitlaq.com
API_EXTERNAL_URL=https://api.chitlaq.com

# Email (use any SMTP provider)
SMTP_HOST=smtp.resend.com
SMTP_USER=resend
SMTP_PASS=your_smtp_password
```

### 2. SSL Certificates (Production)

```bash
# Install Certbot
sudo apt install certbot

# Generate certificates
sudo certbot certonly --standalone -d chitlaq.com -d api.chitlaq.com -d grafana.chitlaq.com

# Copy certificates
sudo cp /etc/letsencrypt/live/chitlaq.com/*.pem ssl/chitlaq.com/
```

### 3. Deploy

```bash
# Production deployment
bash scripts/deploy.sh production

# Development deployment
bash scripts/deploy.sh development

# Force rebuild
bash scripts/deploy.sh production true

# Skip backup
bash scripts/deploy.sh production false true
```

### 4. Verify Deployment

```bash
# Check all services
docker compose ps

# View logs
docker compose logs -f

# Run health checks
curl http://localhost/health
```

## ⚙️ Configuration

### Environment Variables

| Category | Variable | Description | Default |
|----------|----------|-------------|---------|
| **Database** | `POSTGRES_PASSWORD` | PostgreSQL password | - |
| **Security** | `JWT_SECRET` | JWT signing secret (32+ chars) | - |
| **Auth** | `ANON_KEY` | Supabase anonymous key | - |
| **Auth** | `SERVICE_ROLE_KEY` | Supabase service role key | - |
| **Email** | `SMTP_HOST` | SMTP server hostname | - |
| **Cache** | `REDIS_MAX_MEMORY` | Redis memory limit | `512mb` |
| **Monitoring** | `GRAFANA_PASSWORD` | Grafana admin password | - |

### University Email Configuration

```bash
# Add supported university domains
UNIVERSITY_EMAIL_DOMAINS=edu.tr,ac.uk,edu,ac.in

# Configure required email prefixes
ALLOWED_EMAIL_PREFIXES=cs_,eng_,med_,law_,bus_,art_
```

### Performance Tuning

```bash
# Database connections
POSTGRES_MAX_CONNECTIONS=200
POSTGRES_POOL_SIZE=20

# Rate limiting
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW=900

# Real-time connections
REALTIME_MAX_CONNECTIONS=10000
```

## 🔧 Development

### Local Development Setup

```bash
# 1. Clone and setup
git clone https://github.com/your-org/chitlaq.git
cd chitlaq

# 2. Development environment
cp env.example .env
# Configure with development settings

# 3. Start development stack
docker compose -f docker-compose.yml -f docker-compose.override.yml up -d

# 4. Access development services
open http://localhost:3000    # Grafana
open http://localhost:3010    # Supabase Studio
open http://localhost:8025    # MailHog (email testing)
open http://localhost:5050    # pgAdmin
```

### Development Services

| Service | URL | Purpose |
|---------|-----|---------|
| **Grafana** | http://localhost:3000 | Monitoring dashboard |
| **Supabase Studio** | http://localhost:3010 | Database admin |
| **MailHog** | http://localhost:8025 | Email testing |
| **pgAdmin** | http://localhost:5050 | PostgreSQL admin |
| **Redis Commander** | http://localhost:8081 | Redis admin |
| **Jaeger** | http://localhost:16686 | Distributed tracing |

### Useful Commands

```bash
# View logs
docker compose logs -f [service]

# Database shell
docker exec -it chitlaq_postgres psql -U postgres

# Redis shell
docker exec -it chitlaq_redis redis-cli

# Restart service
docker compose restart [service]

# Clean rebuild
docker compose down -v && docker compose up -d --build
```

## 📊 Monitoring

### Grafana Dashboards

Access Grafana at `http://localhost:3000` (admin/admin)

**Pre-configured dashboards:**
- 📊 **System Overview**: CPU, memory, disk, network
- 🗄️ **Database Metrics**: PostgreSQL performance and queries
- 🔄 **Cache Performance**: Redis hit rates and memory usage
- 🌐 **HTTP Metrics**: Request rates, response times, errors
- 👥 **User Analytics**: Registration, engagement, retention
- 🎯 **Business Metrics**: Posts, messages, social interactions

### Prometheus Metrics

Key metrics monitored:
- **Response Time**: API endpoint performance (target: <200ms)
- **Error Rate**: Application error percentage (target: <1%)
- **Database Performance**: Query times, connections (target: <50ms)
- **Cache Hit Rate**: Redis performance (target: >90%)
- **Real-time Connections**: WebSocket connection health

### Alerting

Automated alerts for:
- 🚨 High error rates (>5%)
- 🐌 Slow response times (>500ms)
- 💾 Low disk space (<20%)
- 🔥 High CPU usage (>80%)
- 📉 Service downtime

## 🔒 Security

### Authentication & Authorization
- **University Email Verification**: Mandatory .edu domain validation
- **JWT Tokens**: Short-lived with refresh rotation
- **Row Level Security**: Database-level access control
- **Rate Limiting**: API abuse prevention
- **Session Management**: Secure multi-device support

### Data Protection
- **GDPR Compliant**: Privacy by design
- **Data Encryption**: At rest and in transit
- **Audit Logging**: Comprehensive activity tracking
- **Right to Deletion**: Complete data removal
- **Privacy Controls**: Granular user settings

### Infrastructure Security
- **SSL/TLS**: End-to-end encryption
- **Network Isolation**: Container-level security
- **Firewall Rules**: Port-based access control
- **Security Headers**: OWASP recommendations
- **Regular Updates**: Automated security patches

### Security Hardening Checklist

```bash
# Run security audit
bash scripts/security-audit.sh

# Update all dependencies
docker compose pull
docker compose up -d

# Review access logs
tail -f nginx/logs/access.log

# Check failed login attempts
docker compose logs auth | grep "failed"
```

## ⚡ Performance

### Optimization Features
- **Database Indexing**: Optimized query performance
- **Redis Caching**: Multi-layer cache strategy
- **CDN Ready**: Static asset optimization
- **Connection Pooling**: Efficient resource usage
- **Lazy Loading**: Progressive content loading
- **Image Optimization**: Automatic format conversion

### Performance Targets
- **API Response Time**: <150ms (p95)
- **Database Queries**: <50ms (p95)
- **WebSocket Latency**: <100ms (p95)
- **Page Load Time**: <2s
- **Uptime**: 99.9%
- **Concurrent Users**: 1000+

### Monitoring Performance

```bash
# Database performance
docker exec chitlaq_postgres psql -U postgres -c "
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC LIMIT 10;"

# Cache hit ratio
docker exec chitlaq_redis redis-cli info stats | grep keyspace

# Response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost/api/health
```

## 💾 Backup & Recovery

### Automated Backups

```bash
# Run manual backup
bash backup-scripts/backup.sh

# Schedule automated backups (crontab)
0 2 * * * /path/to/chitlaq/backup-scripts/backup.sh

# Backup includes:
# - PostgreSQL database dump
# - Redis data snapshot
# - Storage files archive
# - Configuration files
```

### Backup Configuration

```bash
# Retention period
BACKUP_RETENTION_DAYS=30

# Encryption
BACKUP_ENCRYPTION_KEY=your_backup_encryption_key

# Remote storage (optional)
BACKUP_S3_BUCKET=chitlaq-backups
```

### Recovery Procedures

```bash
# List available backups
ls -la backups/

# Restore from backup
bash scripts/restore.sh backups/postgres_20240101_120000.sql.gz

# Emergency recovery
docker compose down
docker volume rm chitlaq_postgres_data
docker compose up -d postgres
# Restore from backup
```

## 📚 API Documentation

### Authentication

```bash
# Login with university email
POST /auth/v1/token
{
  "email": "student@university.edu",
  "password": "securepassword"
}

# Refresh token
POST /auth/v1/token?grant_type=refresh_token
{
  "refresh_token": "your_refresh_token"
}
```

### Social Features

```bash
# Create post
POST /rest/v1/posts
{
  "content": "Hello ChitLaq! #university #social",
  "visibility": "public"
}

# Follow user
POST /rest/v1/follows
{
  "followee_id": "user-uuid"
}

# Get personalized feed
GET /rest/v1/feed?limit=20&offset=0
```

### Real-time Features

```javascript
// WebSocket connection
const ws = new WebSocket('ws://localhost:8000/realtime/v1/websocket');

// Subscribe to user messages
ws.send(JSON.stringify({
  type: 'SUBSCRIBE',
  payload: { channel: 'messages:user-id' }
}));
```

For complete API documentation, visit: `/docs/api/`

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

```bash
# 1. Fork and clone
git clone https://github.com/your-fork/chitlaq.git

# 2. Create feature branch
git checkout -b feature/amazing-feature

# 3. Make changes and test
docker compose up -d
# Run tests

# 4. Commit and push
git commit -m "Add amazing feature"
git push origin feature/amazing-feature

# 5. Create Pull Request
```

### Code Standards
- **ESLint** configuration for TypeScript/JavaScript
- **Prettier** for code formatting
- **Conventional Commits** for commit messages
- **Jest** for testing
- **Documentation** required for new features

## 🆘 Support

### Getting Help

- 📖 **Documentation**: Check the `/docs` directory
- 🐛 **Issues**: [GitHub Issues](https://github.com/your-org/chitlaq/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/your-org/chitlaq/discussions)
- 📧 **Email**: support@chitlaq.com

### Troubleshooting

**Common issues and solutions:**

#### Service won't start
```bash
# Check logs
docker compose logs [service-name]

# Check resource usage
docker stats

# Restart service
docker compose restart [service-name]
```

#### Database connection issues
```bash
# Verify PostgreSQL is running
docker exec chitlaq_postgres pg_isready

# Check connection settings
grep POSTGRES_ .env

# Reset database
docker compose down postgres
docker volume rm chitlaq_postgres_data
docker compose up -d postgres
```

#### High memory usage
```bash
# Check memory usage
docker stats

# Reduce Redis memory
echo "CONFIG SET maxmemory 256mb" | docker exec -i chitlaq_redis redis-cli

# Restart services
docker compose restart
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Supabase** for the amazing open-source backend platform
- **PostgreSQL** for reliable data storage
- **Redis** for high-performance caching
- **Docker** for containerization
- **Nginx** for reverse proxy capabilities
- **Prometheus & Grafana** for monitoring excellence

---

<p align="center">
  <b>Built with ❤️ for university communities worldwide</b>
</p>

<p align="center">
  <a href="https://chitlaq.com">Website</a> •
  <a href="/docs">Documentation</a> •
  <a href="https://github.com/your-org/chitlaq/issues">Report Bug</a> •
  <a href="https://github.com/your-org/chitlaq/discussions">Request Feature</a>
</p>
