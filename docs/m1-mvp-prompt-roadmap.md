# ChitLaq M1 MVP - Expert Prompt Engineering Roadmap
*15+ Years Context & Prompt Engineering Experience*

> **Strategic Approach:** Progressive, dependency-aware prompt sequences for maximum code quality and minimal iteration cycles

---

## 🎯 Context Engineering Strategy

### Core Principles (15+ Years Experience)

**1. Progressive Context Building**
- Start with foundation layer prompts
- Build context incrementally across sprints
- Maintain consistency through established patterns
- Leverage previous outputs as context for subsequent prompts

**2. Dependency-Aware Prompt Sequencing**
- Each prompt builds on verified previous outputs
- Clear handoff points between prompts
- Rollback strategies for failed implementations
- Context preservation across development sessions

**3. Domain-Specific Expertise Integration**
- Senior-level architectural decisions embedded in prompts
- Performance optimization guidance in every prompt
- Security-first approach in all implementation prompts
- Production-ready code patterns as default expectations

**4. Iterative Refinement Protocol**
- Test-driven prompt sequences
- Validation checkpoints after each major component
- Performance benchmarking integration
- Code quality gates before progression

---

## 📋 Prompt Roadmap Overview

### Sprint Structure (6 Sprints × 14 Days Each)
```
Sprint 1: Infrastructure & Auth Foundation
├── Week 1: Infrastructure Setup (7 prompts)
├── Week 2: Authentication System (6 prompts)
└── Validation: Security & Performance Testing

Sprint 2: Profile & Social Foundation  
├── Week 3: Profile Management (5 prompts)
├── Week 4: Social Features (7 prompts)
└── Validation: Integration & UI Testing

Sprint 3: Content & Feed Algorithm
├── Week 5: Content Creation System (6 prompts)
├── Week 6: Feed Algorithm & UI (5 prompts)
└── Validation: Performance & Algorithm Testing

Sprint 4: Real-time & Search
├── Week 7: WebSocket Implementation (6 prompts)
├── Week 8: Search Engine (5 prompts)
└── Validation: Real-time Performance Testing

Sprint 5: Notifications & Analytics
├── Week 9: Notification System (5 prompts)
├── Week 10: Analytics & Monitoring (6 prompts)
└── Validation: System Integration Testing

Sprint 6: Monetization & Admin
├── Week 11: Ad Integration (4 prompts)
├── Week 12: Admin Panel & Launch (7 prompts)
└── Final: Production Deployment & Launch
```

---

## 🚀 SPRINT 1: Infrastructure & Authentication Foundation

### Week 1: Infrastructure Setup (Days 1-7)

#### **PROMPT 1.1: Docker Compose Infrastructure Setup**
```
CONTEXT: You are a senior DevOps engineer with 15+ years of experience in containerized applications and production-grade infrastructure setup.

OBJECTIVE: Create a complete Docker Compose infrastructure for ChitLaq M1 MVP that includes self-hosted Supabase stack, monitoring, and all necessary services for a social media platform.

REQUIREMENTS:
- Self-hosted Supabase complete stack (PostgreSQL, Kong, GoTrue, PostgREST, Realtime, Storage)
- Redis for caching and session management
- Nginx reverse proxy with SSL termination
- Prometheus & Grafana for monitoring
- Production-ready configuration with proper resource limits
- Environment variable management with .env.example
- Health checks for all services
- Automated backup configuration
- Network isolation and security

TECHNICAL CONSTRAINTS:
- Single VPS deployment (16GB RAM, 8 vCPU)
- Budget-optimized resource allocation
- Must handle 1000+ concurrent users
- <200ms API response times
- 99.9% uptime target

DELIVERABLES:
1. docker-compose.yml with all services
2. docker-compose.override.yml for development
3. .env.example with all required variables
4. nginx.conf with optimal configuration
5. prometheus.yml configuration
6. backup-scripts/ directory with automated backup
7. scripts/deploy.sh for one-command deployment
8. README.md with setup instructions

VALIDATION CRITERIA:
- All services start successfully
- Health checks pass for all services
- SSL certificates auto-provision
- Monitoring dashboards accessible
- Database connections established
- Storage buckets created automatically

Follow production-ready practices and include comprehensive error handling.
```

#### **PROMPT 1.2: Environment Configuration & Security Setup**
```
CONTEXT: You are a senior security engineer with 15+ years experience in application security and infrastructure hardening.

PREVIOUS CONTEXT: Use the Docker Compose setup from PROMPT 1.1 as the foundation.

OBJECTIVE: Create comprehensive environment configuration, security hardening, and SSL/TLS setup for the ChitLaq infrastructure.

REQUIREMENTS:
- Complete environment variable configuration
- SSL/TLS certificates with Let's Encrypt automation
- Firewall rules and security hardening
- JWT secret generation and management
- Database security configuration
- Rate limiting and DDoS protection
- Nginx security headers
- Log rotation and security monitoring
- Backup encryption

SECURITY FEATURES:
- Strong password policies
- Database connection encryption
- API rate limiting (100 req/min per IP)
- CORS configuration
- Security headers (HSTS, CSP, X-Frame-Options)
- Fail2ban integration
- Automated security updates
- Intrusion detection alerts

DELIVERABLES:
1. .env.production with security-optimized defaults
2. ssl-setup.sh for Let's Encrypt automation
3. firewall-config.sh with iptables rules
4. security-hardening.sh script
5. nginx/security.conf with security headers
6. monitoring/security-alerts.yml
7. backup/encrypt-backup.sh
8. docs/security-checklist.md

VALIDATION CRITERIA:
- SSL A+ rating on SSL Labs
- All security headers present
- Rate limiting functional
- Encrypted backups working
- Security monitoring alerts active
- Database connections encrypted

Include detailed security documentation and emergency procedures.
```

#### **PROMPT 1.3: Database Schema & Migrations Setup**
```
CONTEXT: You are a senior database architect with 15+ years experience in PostgreSQL, performance optimization, and schema design for high-traffic applications.

PREVIOUS CONTEXT: Use the secured infrastructure from PROMPT 1.2.

OBJECTIVE: Design and implement the complete PostgreSQL database schema for ChitLaq M1 MVP with performance optimization, proper indexing, and migration system.

REQUIREMENTS:
- Complete schema implementation from development plan
- Performance-optimized indexes
- Row Level Security (RLS) policies
- Database functions for complex queries
- Migration system with rollback capability
- Database performance monitoring
- Connection pooling configuration
- Read replica setup preparation

SCHEMA COMPONENTS:
- User authentication & profiles
- Social relationships (follows, blocks)
- Content system (posts, likes, shares)
- Messaging system (conversations, messages)
- Notifications system
- Analytics & logging
- Admin & moderation tools

PERFORMANCE OPTIMIZATIONS:
- Proper indexing strategy
- Materialized views for analytics
- Partitioning for large tables
- Query optimization
- Connection pooling
- Cache-friendly design

DELIVERABLES:
1. migrations/001_initial_schema.sql
2. migrations/002_indexes_optimization.sql
3. migrations/003_rls_policies.sql
4. migrations/004_functions_procedures.sql
5. seed-data/universities.sql
6. seed-data/demo-data.sql (for development)
7. database/connection-pool.conf
8. monitoring/db-performance.sql
9. scripts/migrate.sh
10. docs/database-design.md

VALIDATION CRITERIA:
- All migrations run successfully
- RLS policies enforce security
- Index usage optimized for common queries
- Performance targets met (<50ms query time)
- Seed data loads correctly
- Connection pooling functional

Include performance benchmarking and optimization recommendations.
```

#### **PROMPT 1.4: Monitoring & Observability Stack**
```
CONTEXT: You are a senior SRE with 15+ years experience in monitoring, observability, and incident response for high-traffic applications.

PREVIOUS CONTEXT: Use the database setup from PROMPT 1.3 and infrastructure from previous prompts.

OBJECTIVE: Implement comprehensive monitoring, logging, and observability stack for ChitLaq M1 MVP with proactive alerting and performance tracking.

REQUIREMENTS:
- Prometheus metrics collection
- Grafana dashboards for all services
- Application performance monitoring (APM)
- Log aggregation and analysis
- Alert manager configuration
- Custom metrics for business KPIs
- Health check endpoints
- Performance benchmarking tools

MONITORING TARGETS:
- Infrastructure metrics (CPU, RAM, Disk, Network)
- Application metrics (response times, error rates)
- Database performance (query times, connections)
- WebSocket connection metrics
- User engagement metrics
- Business metrics (signups, posts, messages)
- Security metrics (failed logins, rate limiting)

ALERTING RULES:
- Critical: API response time >500ms
- Warning: Error rate >1%
- Critical: Database connections >200
- Warning: Disk usage >80%
- Critical: Memory usage >90%
- Business: Signup rate drops >50%

DELIVERABLES:
1. prometheus/prometheus.yml
2. grafana/dashboards/ (10+ dashboards)
3. alertmanager/alerts.yml
4. logging/loki-config.yml
5. apm/opentelemetry-config.yml
6. scripts/health-check.sh
7. monitoring/custom-metrics.js
8. docs/monitoring-runbook.md
9. alerts/notification-channels.yml
10. benchmarks/performance-tests.js

VALIDATION CRITERIA:
- All dashboards display data correctly
- Alerts trigger on threshold breach
- Logs are searchable and structured
- Health checks return accurate status
- Performance baselines established
- Custom business metrics tracked

Include SLA definitions and incident response procedures.
```

#### **PROMPT 1.5: CI/CD Pipeline & Deployment Automation**
```
CONTEXT: You are a senior DevOps engineer with 15+ years experience in CI/CD, automated deployments, and release management.

PREVIOUS CONTEXT: Use the monitoring setup from PROMPT 1.4 and all previous infrastructure components.

OBJECTIVE: Create a robust CI/CD pipeline with automated testing, deployment, and rollback capabilities for ChitLaq M1 MVP.

REQUIREMENTS:
- GitHub Actions CI/CD pipeline
- Multi-environment support (dev, staging, prod)
- Automated testing integration
- Zero-downtime deployment strategy
- Rollback mechanisms
- Security scanning integration
- Performance testing automation
- Deployment notifications

PIPELINE STAGES:
1. Code quality checks (linting, formatting)
2. Security scanning (SAST, dependency check)
3. Unit & integration testing
4. Build & containerization
5. Staging deployment & testing
6. Production deployment approval
7. Health checks & monitoring
8. Notification & documentation

DEPLOYMENT FEATURES:
- Blue-green deployment strategy
- Database migration automation
- Configuration management
- Secrets management
- Service health validation
- Automated rollback triggers
- Performance regression detection

DELIVERABLES:
1. .github/workflows/ci.yml
2. .github/workflows/cd-staging.yml
3. .github/workflows/cd-production.yml
4. scripts/deploy-staging.sh
5. scripts/deploy-production.sh
6. scripts/rollback.sh
7. testing/integration-tests.js
8. security/scan-config.yml
9. deployment/health-checks.sh
10. docs/deployment-guide.md

VALIDATION CRITERIA:
- Pipeline runs successfully end-to-end
- Automated tests pass
- Security scans complete without critical issues
- Staging deployment works flawlessly
- Health checks validate deployment success
- Rollback mechanism tested and functional

Include disaster recovery procedures and deployment best practices.
```

#### **PROMPT 1.6: Performance Optimization & Load Testing**
```
CONTEXT: You are a senior performance engineer with 15+ years experience in application optimization, load testing, and scalability planning.

PREVIOUS CONTEXT: Use the complete infrastructure from PROMPT 1.5 and all previous components.

OBJECTIVE: Implement comprehensive performance optimization and load testing framework to ensure ChitLaq M1 MVP meets performance targets.

REQUIREMENTS:
- Load testing framework setup
- Performance optimization guidelines
- Caching strategy implementation
- Database query optimization
- CDN configuration planning
- Scalability testing scenarios
- Performance monitoring integration
- Bottleneck identification tools

PERFORMANCE TARGETS:
- API Response Time: <150ms (p95)
- WebSocket Latency: <100ms (p95)
- Database Query Time: <50ms (p95)
- Concurrent Users: 1000+
- Messages per Second: 50,000+
- Page Load Time: <2s
- Uptime: 99.9%

LOAD TESTING SCENARIOS:
- User registration flow (100 concurrent)
- Feed loading performance (500 concurrent)
- Real-time messaging load (1000 connections)
- Search functionality stress test
- Database connection pool limits
- File upload performance testing
- Admin panel load testing

DELIVERABLES:
1. load-testing/k6-scripts/
2. performance/optimization-guide.md
3. caching/redis-strategy.js
4. database/query-optimization.sql
5. cdn/configuration.js
6. monitoring/performance-alerts.yml
7. scripts/benchmark.sh
8. reports/performance-baseline.md
9. scaling/capacity-planning.md
10. optimization/recommendations.md

VALIDATION CRITERIA:
- All performance targets achieved
- Load tests pass without degradation
- Caching reduces database load by 70%
- Query optimization improves response times
- Bottlenecks identified and documented
- Scaling recommendations provided

Include capacity planning and optimization roadmap.
```

#### **PROMPT 1.7: Infrastructure Documentation & Handoff**
```
CONTEXT: You are a senior technical writer and infrastructure architect with 15+ years experience in system documentation and knowledge transfer.

PREVIOUS CONTEXT: Use all infrastructure components from PROMPTS 1.1-1.6.

OBJECTIVE: Create comprehensive infrastructure documentation, operational runbooks, and knowledge transfer materials for ChitLaq M1 MVP infrastructure.

REQUIREMENTS:
- Complete system architecture documentation
- Operational runbooks for common scenarios
- Troubleshooting guides with solutions
- Security procedures and incident response
- Backup and disaster recovery procedures
- Scaling and maintenance guidelines
- Developer onboarding documentation
- Infrastructure as Code documentation

DOCUMENTATION COMPONENTS:
- System architecture diagrams
- Service interdependency maps
- Configuration management guide
- Monitoring and alerting guide
- Deployment procedures
- Security protocols
- Emergency procedures
- Performance optimization guide

OPERATIONAL PROCEDURES:
- Daily health checks
- Weekly maintenance tasks
- Monthly performance reviews
- Incident response procedures
- Backup verification process
- Security audit procedures
- Capacity planning reviews
- Update and patching procedures

DELIVERABLES:
1. docs/architecture-overview.md
2. docs/infrastructure-setup.md
3. runbooks/daily-operations.md
4. runbooks/incident-response.md
5. runbooks/backup-recovery.md
6. troubleshooting/common-issues.md
7. security/procedures.md
8. development/local-setup.md
9. scaling/growth-planning.md
10. maintenance/schedules.md

VALIDATION CRITERIA:
- Documentation is complete and accurate
- Runbooks are tested and functional
- Troubleshooting guides solve real issues
- New team members can setup environment
- All procedures are validated
- Knowledge transfer successful

Include architecture decision records and future recommendations.
```

### Week 2: Authentication System (Days 8-14)

#### **PROMPT 1.8: University Email Validation System**
```
CONTEXT: You are a senior backend engineer with 15+ years experience in authentication systems, email validation, and educational institution verification.

PREVIOUS CONTEXT: Use the complete infrastructure from Week 1 (PROMPTS 1.1-1.7).

OBJECTIVE: Implement a robust university email validation system that verifies student emails against approved universities with prefix validation and fraud prevention.

REQUIREMENTS:
- University domain whitelist management
- Email prefix validation (e.g., cs_, eng_, med_)
- Real-time validation API endpoint
- Fraud detection and prevention
- Email verification workflow
- Admin interface for university management
- Batch validation capabilities
- Integration with Supabase Auth

VALIDATION FEATURES:
- Domain verification against approved list
- Prefix pattern matching
- Disposable email detection
- Rate limiting for validation attempts
- Suspicious pattern detection
- Geographic validation (optional)
- Academic year validation
- Department/faculty verification

SECURITY MEASURES:
- Request rate limiting (10/min per IP)
- Email enumeration prevention
- Validation attempt logging
- Suspicious activity detection
- CAPTCHA integration for repeated attempts
- Audit trail for all validations

DELIVERABLES:
1. apps/auth-service/src/validators/university-email.ts
2. apps/auth-service/src/models/university.ts
3. apps/auth-service/src/middleware/rate-limit.ts
4. apps/auth-service/src/routes/validation.ts
5. database/seed-data/universities.sql
6. apps/auth-service/src/utils/fraud-detection.ts
7. apps/auth-service/tests/university-validation.test.ts
8. apps/admin/src/components/university-management.tsx
9. docs/university-validation-api.md
10. scripts/import-universities.js

VALIDATION CRITERIA:
- Validates legitimate university emails
- Rejects invalid domains and prefixes
- Rate limiting prevents abuse
- Fraud detection catches suspicious patterns
- Admin interface manages universities
- API documentation is complete

Include comprehensive test coverage and edge case handling.
```

#### **PROMPT 1.9: Supabase Auth Integration & JWT Management**
```
CONTEXT: You are a senior authentication architect with 15+ years experience in JWT systems, OAuth flows, and secure session management.

PREVIOUS CONTEXT: Use the university email validation from PROMPT 1.8 and infrastructure setup.

OBJECTIVE: Create a secure authentication system using Supabase Auth with custom JWT handling, session management, and university email integration.

REQUIREMENTS:
- Supabase Auth configuration
- Custom JWT claims for university data
- Secure session management
- Refresh token rotation
- Multi-device login support
- Email verification workflow
- Password reset functionality
- Account security features

AUTHENTICATION FLOW:
1. University email validation
2. Supabase Auth registration
3. Email verification required
4. Profile creation with university data
5. JWT issuance with custom claims
6. Session establishment
7. Refresh token management

SECURITY FEATURES:
- JWT with short expiration (15 minutes)
- Refresh token rotation
- Device fingerprinting
- Login attempt monitoring
- Account lockout policies
- Suspicious activity detection
- Session invalidation
- Password strength enforcement

DELIVERABLES:
1. apps/auth-service/src/auth/supabase-config.ts
2. apps/auth-service/src/auth/jwt-manager.ts
3. apps/auth-service/src/auth/session-manager.ts
4. apps/auth-service/src/middleware/auth-middleware.ts
5. apps/auth-service/src/routes/auth-routes.ts
6. apps/auth-service/src/utils/security-utils.ts
7. apps/web/src/hooks/use-auth.ts
8. apps/web/src/context/auth-context.tsx
9. apps/auth-service/tests/auth-flow.test.ts
10. docs/authentication-guide.md

VALIDATION CRITERIA:
- University email validation integrated
- JWT tokens contain university claims
- Session management secure and efficient
- Email verification enforced
- Security policies implemented
- Multi-device support functional

Include security audit checklist and penetration testing recommendations.
```

#### **PROMPT 1.10: Onboarding Flow & User Experience**
```
CONTEXT: You are a senior frontend engineer with 15+ years experience in user experience design, conversion optimization, and progressive web applications.

PREVIOUS CONTEXT: Use the authentication system from PROMPT 1.9 and all previous components.

OBJECTIVE: Create an engaging, conversion-optimized onboarding flow that guides users through account creation, email verification, profile setup, and initial platform exploration.

REQUIREMENTS:
- Multi-step onboarding wizard
- Email verification with resend capability
- Profile creation with university integration
- Interest selection for feed personalization
- Friend suggestions based on university
- Progressive disclosure of features
- Mobile-responsive design
- Analytics tracking throughout flow

ONBOARDING STEPS:
1. University email entry and validation
2. Password creation with strength meter
3. Email verification (with countdown/resend)
4. Basic profile information
5. Profile picture upload (optional)
6. Interest/topic selection
7. University network discovery
8. Initial friend suggestions
9. Platform tour and feature introduction
10. First post creation prompt

UX OPTIMIZATIONS:
- Progress indicator with completion percentage
- Contextual help and tooltips
- Error handling with clear messaging
- Auto-save for partial completion
- Skip options for non-essential steps
- Gamification elements (completion badges)
- Personalized welcome messages
- Social proof elements

DELIVERABLES:
1. apps/web/src/components/onboarding/OnboardingWizard.tsx
2. apps/web/src/components/onboarding/steps/EmailVerification.tsx
3. apps/web/src/components/onboarding/steps/ProfileSetup.tsx
4. apps/web/src/components/onboarding/steps/InterestSelection.tsx
5. apps/web/src/components/onboarding/steps/UniversityNetwork.tsx
6. apps/web/src/components/onboarding/ProgressIndicator.tsx
7. apps/web/src/hooks/use-onboarding.ts
8. apps/web/src/styles/onboarding.css
9. apps/web/src/utils/onboarding-analytics.ts
10. apps/web/tests/onboarding-flow.test.tsx

VALIDATION CRITERIA:
- Onboarding completion rate >80%
- Email verification completion >90%
- Profile completion rate >75%
- Mobile experience optimized
- Analytics tracking comprehensive
- Error handling graceful

Include A/B testing setup and conversion optimization recommendations.
```

#### **PROMPT 1.11: Authentication Security & Compliance**
```
CONTEXT: You are a senior cybersecurity consultant with 15+ years experience in application security, compliance frameworks, and educational data protection.

PREVIOUS CONTEXT: Use the onboarding flow from PROMPT 1.10 and all authentication components.

OBJECTIVE: Implement comprehensive security measures, compliance features, and data protection controls for the authentication system to meet educational data privacy requirements.

REQUIREMENTS:
- GDPR/CCPA compliance features
- Educational data privacy (FERPA considerations)
- Security audit logging
- Data retention policies
- Account deletion procedures
- Privacy controls and consents
- Security incident response
- Vulnerability management

SECURITY IMPLEMENTATIONS:
- Account lockout after failed attempts
- Suspicious login detection
- IP-based rate limiting
- Device fingerprinting
- Geolocation anomaly detection
- Password policy enforcement
- Two-factor authentication preparation
- Security headers implementation

COMPLIANCE FEATURES:
- Data processing consent management
- Right to data portability
- Right to be forgotten implementation
- Data retention policy enforcement
- Privacy policy integration
- Cookie consent management
- Data processing records
- Breach notification procedures

DELIVERABLES:
1. apps/auth-service/src/security/audit-logger.ts
2. apps/auth-service/src/security/threat-detection.ts
3. apps/auth-service/src/compliance/gdpr-controls.ts
4. apps/auth-service/src/compliance/data-retention.ts
5. apps/web/src/components/privacy/ConsentManager.tsx
6. apps/web/src/components/privacy/PrivacyControls.tsx
7. security/policies/authentication-security.md
8. compliance/procedures/data-protection.md
9. apps/auth-service/tests/security-compliance.test.ts
10. docs/security-compliance-guide.md

VALIDATION CRITERIA:
- Security policies fully implemented
- Compliance features functional
- Audit logging comprehensive
- Data protection controls active
- Privacy consents properly managed
- Security testing passed

Include security assessment checklist and compliance verification procedures.
```

#### **PROMPT 1.12: Authentication Testing & Performance**
```
CONTEXT: You are a senior QA engineer with 15+ years experience in authentication testing, security testing, and performance validation.

PREVIOUS CONTEXT: Use the complete authentication system from PROMPTS 1.8-1.11.

OBJECTIVE: Create comprehensive testing suite for authentication system including unit tests, integration tests, security tests, and performance benchmarks.

REQUIREMENTS:
- Complete unit test coverage (>95%)
- Integration test scenarios
- Security penetration testing
- Performance load testing
- End-to-end user journey testing
- Error handling validation
- Accessibility testing
- Cross-browser compatibility

TESTING CATEGORIES:
- Unit Tests: All authentication functions
- Integration: Auth flow with database
- Security: Penetration testing scenarios
- Performance: Load testing with 1000+ users
- E2E: Complete user registration journey
- API: Authentication endpoint testing
- UI: Frontend component testing
- Accessibility: WCAG 2.1 compliance

SECURITY TEST SCENARIOS:
- SQL injection attempts
- JWT token manipulation
- Session hijacking attempts
- Rate limiting bypass attempts
- Email enumeration attacks
- Password brute force attacks
- CSRF attack prevention
- XSS vulnerability testing

DELIVERABLES:
1. apps/auth-service/tests/unit/university-validation.test.ts
2. apps/auth-service/tests/integration/auth-flow.test.ts
3. apps/auth-service/tests/security/penetration.test.ts
4. apps/auth-service/tests/performance/load-test.js
5. apps/web/tests/e2e/onboarding-journey.test.ts
6. apps/web/tests/accessibility/auth-a11y.test.ts
7. testing/fixtures/test-data.json
8. testing/utils/test-helpers.ts
9. testing/reports/coverage-report.html
10. docs/testing-strategy.md

VALIDATION CRITERIA:
- Unit test coverage >95%
- All integration tests pass
- Security tests identify no critical vulnerabilities
- Performance targets met under load
- E2E tests cover all user journeys
- Accessibility standards met

Include test automation setup and continuous testing integration.
```

#### **PROMPT 1.13: Authentication Documentation & API Specification**
```
CONTEXT: You are a senior technical writer with 15+ years experience in API documentation, developer experience, and authentication system documentation.

PREVIOUS CONTEXT: Use the complete authenticated and tested system from PROMPTS 1.8-1.12.

OBJECTIVE: Create comprehensive documentation for the authentication system including API specifications, integration guides, and developer resources.

REQUIREMENTS:
- Complete API documentation with OpenAPI spec
- Developer integration guides
- SDK/client library documentation
- Authentication flow diagrams
- Security best practices guide
- Troubleshooting documentation
- Migration guides for future updates
- Performance optimization guide

DOCUMENTATION STRUCTURE:
- API Reference (OpenAPI/Swagger)
- Quick Start Guide
- Authentication Flow Documentation
- Security Implementation Guide
- Integration Examples
- SDKs and Client Libraries
- Error Codes and Troubleshooting
- Performance Optimization
- Best Practices

API DOCUMENTATION:
- Complete endpoint documentation
- Request/response examples
- Error code definitions
- Rate limiting information
- Authentication requirements
- SDK code examples
- Postman collection
- Interactive API explorer

DELIVERABLES:
1. docs/api/authentication-api.yaml (OpenAPI spec)
2. docs/guides/quick-start.md
3. docs/guides/authentication-flow.md
4. docs/guides/security-best-practices.md
5. docs/guides/integration-examples.md
6. docs/troubleshooting/common-issues.md
7. docs/sdks/javascript-client.md
8. docs/performance/optimization-guide.md
9. api-docs/postman-collection.json
10. examples/integration-samples/

VALIDATION CRITERIA:
- API documentation complete and accurate
- Code examples tested and functional
- Integration guides enable successful implementation
- Troubleshooting guides solve real issues
- Performance recommendations validated
- Developer feedback incorporated

Include developer portal setup and documentation maintenance procedures.
```

---

## 🚀 SPRINT 2: Profile & Social Foundation

### Week 3: Profile Management (Days 15-21)

#### **PROMPT 2.1: User Profile Data Architecture**
```
CONTEXT: You are a senior backend architect with 15+ years experience in user profile systems, data modeling, and social platform design.

PREVIOUS CONTEXT: Use the complete authentication system from Sprint 1 as foundation.

OBJECTIVE: Design and implement a comprehensive user profile system with university integration, privacy controls, and extensible data architecture.

REQUIREMENTS:
- Complete profile data model implementation
- University-specific profile fields
- Privacy control granularity
- Profile verification system
- Academic information management
- Social connections preparation
- Profile completion tracking
- Data migration capabilities

PROFILE COMPONENTS:
- Basic Information (name, username, bio)
- University Data (domain, prefix, graduation year)
- Academic Information (major, year, interests)
- Contact Information (with privacy controls)
- Social Preferences (discoverable, public profile)
- Verification Status (email, university, profile)
- Activity Statistics (posts, followers, following)
- Profile Completion Score

UNIVERSITY INTEGRATION:
- Automatic university detection from email
- Department/faculty mapping
- Academic year calculation
- University-specific profile fields
- Campus location integration
- Academic calendar awareness
- University network features
- Alumni status handling

DELIVERABLES:
1. apps/profile-service/src/models/UserProfile.ts
2. apps/profile-service/src/models/UniversityProfile.ts
3. apps/profile-service/src/services/ProfileService.ts
4. apps/profile-service/src/utils/university-mapper.ts
5. database/migrations/005_user_profiles.sql
6. apps/profile-service/src/validators/profile-validator.ts
7. apps/profile-service/src/privacy/privacy-controls.ts
8. apps/profile-service/tests/profile-service.test.ts
9. docs/profile-data-model.md
10. examples/profile-api-usage.js

VALIDATION CRITERIA:
- Profile data model supports all requirements
- University integration seamless
- Privacy controls granular and functional
- Profile completion tracking accurate
- Data validation comprehensive
- Performance optimized for queries

Include data migration strategy and privacy impact assessment.
```

#### **PROMPT 2.2: Profile Creation & Management API**
```
CONTEXT: You are a senior API developer with 15+ years experience in RESTful API design, data validation, and user management systems.

PREVIOUS CONTEXT: Use the profile data architecture from PROMPT 2.1 and authentication foundation.

OBJECTIVE: Implement comprehensive profile management APIs with CRUD operations, validation, privacy controls, and university-specific features.

REQUIREMENTS:
- Complete CRUD API endpoints
- Profile validation and sanitization
- Privacy setting management
- University data synchronization
- Profile completion scoring
- Activity tracking integration
- Batch operations support
- API versioning preparation

API ENDPOINTS:
- POST /profiles - Create profile
- GET /profiles/{id} - Get profile (with privacy)
- PUT /profiles/{id} - Update profile
- PATCH /profiles/{id} - Partial update
- DELETE /profiles/{id} - Soft delete profile
- GET /profiles/me - Current user profile
- PUT /profiles/me/privacy - Privacy settings
- GET /profiles/completion - Completion status

VALIDATION FEATURES:
- Username uniqueness and format validation
- Bio length and content filtering
- University data verification
- Contact information validation
- Profile picture requirements
- Academic information validation
- Privacy setting validation
- Rate limiting for updates

PRIVACY CONTROLS:
- Profile visibility settings
- Contact information privacy
- Activity visibility controls
- University network visibility
- Search visibility settings
- Direct message permissions
- Following/follower privacy
- Academic information privacy

DELIVERABLES:
1. apps/profile-service/src/routes/profile-routes.ts
2. apps/profile-service/src/controllers/ProfileController.ts
3. apps/profile-service/src/middleware/profile-validation.ts
4. apps/profile-service/src/middleware/privacy-middleware.ts
5. apps/profile-service/src/utils/profile-completion.ts
6. apps/profile-service/src/services/UniversitySync.ts
7. apps/profile-service/tests/profile-api.test.ts
8. docs/api/profile-endpoints.md
9. examples/profile-api-examples.http
10. schemas/profile-api-schema.json

VALIDATION CRITERIA:
- All CRUD operations functional
- Validation prevents invalid data
- Privacy controls enforce restrictions
- University synchronization works
- API responses optimized
- Error handling comprehensive

Include API documentation and rate limiting specifications.
```

#### **PROMPT 2.3: Profile Media Management & Storage**
```
CONTEXT: You are a senior full-stack engineer with 15+ years experience in media management, file storage systems, and image processing.

PREVIOUS CONTEXT: Use the profile API from PROMPT 2.2 and existing infrastructure.

OBJECTIVE: Implement comprehensive media management for user profiles including avatar uploads, image processing, storage optimization, and CDN integration.

REQUIREMENTS:
- Avatar and banner image upload
- Image processing and optimization
- Multiple format/size generation
- Storage cost optimization
- CDN integration preparation
- Malware scanning
- Content moderation
- Backup and recovery

IMAGE PROCESSING:
- Automatic format conversion (WebP, AVIF)
- Multiple size generation (thumbnail, medium, large)
- Quality optimization by use case
- Compression with quality preservation
- Metadata stripping for privacy
- Face detection for cropping suggestions
- Inappropriate content detection
- Storage size optimization

STORAGE STRATEGY:
- Supabase Storage integration
- Hierarchical folder structure
- File naming conventions
- Duplicate detection and deduplication
- Automatic cleanup of unused files
- Backup to external storage
- CDN-ready file organization
- Cost monitoring and optimization

SECURITY FEATURES:
- File type validation
- Size limit enforcement
- Malware scanning
- Content policy enforcement
- Rate limiting for uploads
- User quota management
- Audit trail for all operations
- Privacy-compliant storage

DELIVERABLES:
1. apps/media-service/src/services/MediaService.ts
2. apps/media-service/src/processors/ImageProcessor.ts
3. apps/media-service/src/storage/SupabaseStorage.ts
4. apps/media-service/src/security/FileValidator.ts
5. apps/media-service/src/utils/image-optimizer.ts
6. apps/web/src/components/ImageUpload.tsx
7. apps/web/src/hooks/use-image-upload.ts
8. apps/media-service/tests/media-processing.test.ts
9. scripts/media-cleanup.js
10. docs/media-management-guide.md

VALIDATION CRITERIA:
- Image upload and processing functional
- Multiple formats generated correctly
- Storage organized and optimized
- Security validations prevent malicious uploads
- Performance targets met for processing
- CDN integration ready

Include storage cost analysis and optimization recommendations.
```

#### **PROMPT 2.4: Profile UI Components & User Experience**
```
CONTEXT: You are a senior frontend developer with 15+ years experience in React development, component design systems, and user interface optimization.

PREVIOUS CONTEXT: Use the media management from PROMPT 2.3 and all profile backend services.

OBJECTIVE: Create beautiful, responsive, and accessible profile UI components with excellent user experience and modern design patterns.

REQUIREMENTS:
- Complete profile viewing interface
- Profile editing with real-time validation
- Image upload with preview and cropping
- Privacy setting controls
- University information display
- Profile completion indicators
- Social connection previews
- Mobile-optimized responsive design

UI COMPONENTS:
- ProfileHeader (avatar, name, stats)
- ProfileBio (with edit capabilities)
- UniversityInfo (dynamic university display)
- ProfileTabs (posts, media, about)
- EditProfileModal (comprehensive editing)
- AvatarUpload (drag-drop with cropping)
- PrivacyControls (granular settings)
- ProfileCompletion (gamified progress)

UX OPTIMIZATIONS:
- Smooth transitions and animations
- Optimistic UI updates
- Progressive image loading
- Skeleton loading states
- Error handling with recovery options
- Accessibility (WCAG 2.1 AA)
- Keyboard navigation support
- Touch-friendly mobile interface

DESIGN SYSTEM:
- Consistent typography and spacing
- Color scheme with dark mode support
- Responsive breakpoints
- Reusable component library
- Icon system integration
- Animation library integration
- Theme customization capabilities
- Component documentation

DELIVERABLES:
1. apps/web/src/components/profile/ProfileHeader.tsx
2. apps/web/src/components/profile/ProfileEditor.tsx
3. apps/web/src/components/profile/AvatarUpload.tsx
4. apps/web/src/components/profile/UniversityCard.tsx
5. apps/web/src/components/profile/PrivacySettings.tsx
6. apps/web/src/components/profile/ProfileCompletion.tsx
7. apps/web/src/hooks/use-profile.ts
8. apps/web/src/styles/profile-components.css
9. apps/web/src/utils/profile-utils.ts
10. apps/web/tests/profile-components.test.tsx

VALIDATION CRITERIA:
- All components render correctly across devices
- Edit functionality works seamlessly
- Image upload provides excellent UX
- Privacy controls are intuitive
- Accessibility standards met
- Performance optimized for mobile

Include design system documentation and component library.
```

#### **PROMPT 2.5: Profile Analytics & Insights**
```
CONTEXT: You are a senior data engineer with 15+ years experience in user analytics, behavioral tracking, and privacy-compliant data collection.

PREVIOUS CONTEXT: Use the complete profile system from PROMPTS 2.1-2.4.

OBJECTIVE: Implement comprehensive profile analytics that track user engagement, profile optimization insights, and privacy-compliant data collection for improving user experience.

REQUIREMENTS:
- Profile engagement tracking
- Completion rate analytics
- University network insights
- Privacy-compliant data collection
- User behavior analysis
- Profile optimization recommendations
- A/B testing framework integration
- GDPR-compliant analytics

ANALYTICS COMPONENTS:
- Profile view tracking
- Edit completion rates
- Feature usage analytics
- University network engagement
- Privacy setting patterns
- Profile completion correlation
- User journey analytics
- Performance metrics tracking

INSIGHTS GENERATION:
- Profile optimization suggestions
- University network recommendations
- Engagement improvement tips
- Privacy education insights
- Feature adoption analysis
- User segment analysis
- Retention correlation analysis
- Content performance insights

PRIVACY COMPLIANCE:
- Anonymized data collection
- User consent management
- Data retention policies
- Right to data deletion
- Analytics opt-out mechanisms
- GDPR Article 6 compliance
- Data minimization principles
- Transparency reporting

DELIVERABLES:
1. apps/analytics-service/src/collectors/ProfileAnalytics.ts
2. apps/analytics-service/src/insights/ProfileInsights.ts
3. apps/analytics-service/src/privacy/ConsentManager.ts
4. apps/web/src/components/analytics/ProfileInsights.tsx
5. apps/analytics-service/src/models/AnalyticsEvent.ts
6. apps/analytics-service/src/aggregators/ProfileMetrics.ts
7. apps/analytics-service/tests/profile-analytics.test.ts
8. database/analytics/profile-metrics-views.sql
9. docs/profile-analytics-guide.md
10. compliance/analytics-privacy-assessment.md

VALIDATION CRITERIA:
- Analytics collection respects privacy
- Insights provide actionable recommendations
- Data retention policies enforced
- User consent properly managed
- Performance impact minimal
- Compliance requirements met

Include privacy impact assessment and data governance documentation.
```

### Week 4: Social Features Foundation (Days 22-28)

#### **PROMPT 2.6: Social Graph Architecture**
```
CONTEXT: You are a senior system architect with 15+ years experience in social networking platforms, graph databases, and scalable relationship management.

PREVIOUS CONTEXT: Use the complete profile system from Week 3.

OBJECTIVE: Design and implement a scalable social graph system for following, followers, blocking, and university-based connections with performance optimization.

REQUIREMENTS:
- Follow/unfollow relationship management
- Bidirectional relationship tracking
- Blocking and privacy enforcement
- University network discovery
- Mutual connection calculations
- Social graph analytics
- Relationship history tracking
- Performance optimization for queries

SOCIAL RELATIONSHIPS:
- Following relationships (asymmetric)
- Blocked users (privacy enforcement)
- University connections (automatic discovery)
- Mutual followers calculation
- Relationship strength scoring
- Connection recommendations
- Social graph traversal
- Relationship audit trail

PERFORMANCE OPTIMIZATIONS:
- Efficient relationship queries
- Cached follower/following counts
- Denormalized relationship data
- Graph traversal optimization
- Bulk relationship operations
- Real-time relationship updates
- Memory-efficient data structures
- Query result caching

UNIVERSITY NETWORKING:
- Automatic university network discovery
- Department-based connections
- Year-based recommendations
- Campus proximity features
- Academic interest matching
- University event integration
- Alumni network features
- Inter-university connections

DELIVERABLES:
1. apps/social-service/src/models/SocialGraph.ts
2. apps/social-service/src/services/RelationshipService.ts
3. apps/social-service/src/utils/graph-traversal.ts
4. apps/social-service/src/cache/relationship-cache.ts
5. database/migrations/006_social_relationships.sql
6. apps/social-service/src/analytics/social-metrics.ts
7. apps/social-service/tests/social-graph.test.ts
8. database/functions/relationship-functions.sql
9. docs/social-graph-architecture.md
10. performance/social-graph-benchmarks.js

VALIDATION CRITERIA:
- Relationship operations performant (<50ms)
- University network discovery accurate
- Blocking enforcement comprehensive
- Graph traversal optimized
- Analytics provide valuable insights
- Scalability tested to 10K+ connections

Include graph database migration strategy and performance tuning guide.
```

#### **PROMPT 2.7: Friend Recommendations Algorithm**
```
CONTEXT: You are a senior algorithm engineer with 15+ years experience in recommendation systems, machine learning, and social graph analysis.

PREVIOUS CONTEXT: Use the social graph architecture from PROMPT 2.6.

OBJECTIVE: Implement an intelligent friend recommendation algorithm that suggests relevant connections based on university networks, mutual connections, and engagement patterns.

REQUIREMENTS:
- Multi-factor recommendation algorithm
- University-based recommendations
- Mutual connection scoring
- Interest-based matching
- Engagement pattern analysis
- Real-time recommendation updates
- Privacy-respecting recommendations
- A/B testing framework integration

RECOMMENDATION FACTORS:
- University network proximity (40% weight)
- Mutual connections strength (25% weight)
- Academic interest similarity (20% weight)
- Engagement pattern matching (10% weight)
- Geographic proximity (5% weight)
- Recent activity correlation (bonus factor)
- Profile completion similarity (bonus factor)
- Social interaction history (bonus factor)

ALGORITHM COMPONENTS:
- University network scoring
- Mutual connection analysis
- Interest vector similarity
- Engagement pattern recognition
- Geographic distance calculation
- Recency boost application
- Diversity injection
- Spam/fake account filtering

PERFORMANCE FEATURES:
- Real-time score calculation
- Batch recommendation processing
- Cached recommendation lists
- Incremental updates
- Memory-efficient algorithms
- Distributed computation support
- A/B testing infrastructure
- Recommendation explanation

DELIVERABLES:
1. apps/recommendation-service/src/algorithms/FriendRecommendation.ts
2. apps/recommendation-service/src/scoring/UniversityScoring.ts
3. apps/recommendation-service/src/scoring/MutualConnectionScoring.ts
4. apps/recommendation-service/src/ml/InterestSimilarity.ts
5. apps/recommendation-service/src/cache/RecommendationCache.ts
6. apps/recommendation-service/src/utils/algorithm-utils.ts
7. apps/recommendation-service/tests/recommendation-algorithm.test.ts
8. database/functions/recommendation-queries.sql
9. docs/recommendation-algorithm-guide.md
10. performance/recommendation-benchmarks.js

VALIDATION CRITERIA:
- Recommendations relevantly accurate (>75% acceptance)
- Algorithm performs under 100ms per user
- University connections prioritized correctly
- Privacy restrictions respected
- Real-time updates functional
- A/B testing framework operational

Include algorithm tuning guide and recommendation quality metrics.
```

#### **PROMPT 2.8: Social Actions & Interactions**
```
CONTEXT: You are a senior backend developer with 15+ years experience in social platform interactions, event-driven architectures, and real-time systems.

PREVIOUS CONTEXT: Use the friend recommendation system from PROMPT 2.7.

OBJECTIVE: Implement comprehensive social interaction APIs including follow/unfollow, blocking, friend requests, and real-time social activity feeds.

REQUIREMENTS:
- Follow/unfollow operations with notifications
- Block/unblock functionality
- Friend request system (optional)
- Social activity event streaming
- Batch social operations
- Privacy-aware interactions
- Rate limiting and abuse prevention
- Activity history tracking

SOCIAL ACTIONS:
- Follow user (with notification)
- Unfollow user (silent operation)
- Block user (privacy enforcement)
- Unblock user (restore visibility)
- Mute user (hide content, keep following)
- Report user (moderation integration)
- View profile (analytics tracking)
- Interact with content (engagement tracking)

EVENT STREAMING:
- Real-time follow notifications
- Social activity feed updates
- University network updates
- Recommendation list updates
- Privacy setting change propagation
- Content visibility updates
- Moderation action notifications
- System-wide announcement distribution

ABUSE PREVENTION:
- Rate limiting for follow actions
- Spam detection algorithms
- Bulk operation monitoring
- Suspicious pattern detection
- Account reputation scoring
- Automated restriction triggers
- Moderation queue integration
- Appeal process automation

DELIVERABLES:
1. apps/social-service/src/controllers/SocialController.ts
2. apps/social-service/src/events/SocialEventHandler.ts
3. apps/social-service/src/services/InteractionService.ts
4. apps/social-service/src/middleware/rate-limiting.ts
5. apps/social-service/src/security/abuse-detection.ts
6. apps/social-service/src/notifications/social-notifications.ts
7. apps/social-service/tests/social-interactions.test.ts
8. apps/realtime-service/src/social-events.ts
9. docs/social-interactions-api.md
10. monitoring/social-metrics-dashboard.json

VALIDATION CRITERIA:
- All social actions complete successfully
- Real-time events delivered reliably
- Rate limiting prevents abuse
- Privacy restrictions enforced
- Performance targets met under load
- Notification system responsive

Include abuse detection tuning and social metrics dashboard.
```

#### **PROMPT 2.9: University Network Features**
```
CONTEXT: You are a senior product engineer with 15+ years experience in educational technology, community building, and university social platforms.

PREVIOUS CONTEXT: Use the social interactions from PROMPT 2.8.

OBJECTIVE: Implement university-specific networking features including department discovery, academic year connections, campus events integration, and university-wide announcements.

REQUIREMENTS:
- Department-based user discovery
- Academic year networking
- Campus event integration
- University announcement system
- Academic calendar integration
- Study group formation features
- University-specific trending topics
- Cross-university collaboration

UNIVERSITY FEATURES:
- Department/faculty directories
- Academic year cohort discovery
- Class schedule integration
- Campus event calendar
- University club integration
- Study group recommendations
- Academic project collaboration
- Alumni network access

COMMUNITY BUILDING:
- University-specific hashtags
- Campus location tagging
- Academic interest groups
- Course-based discussions
- University news feed
- Student government integration
- Campus resource sharing
- Academic achievement sharing

INTEGRATION CAPABILITIES:
- University LMS integration (preparation)
- Academic calendar sync
- Campus WiFi-based features
- University email integration
- Student ID verification
- Academic transcript integration
- University service integration
- Campus facility booking

DELIVERABLES:
1. apps/university-service/src/services/UniversityNetworkService.ts
2. apps/university-service/src/features/DepartmentDiscovery.ts
3. apps/university-service/src/features/AcademicCalendar.ts
4. apps/university-service/src/features/CampusEvents.ts
5. apps/web/src/components/university/UniversityDashboard.tsx
6. apps/web/src/components/university/DepartmentDirectory.tsx
7. apps/university-service/tests/university-features.test.ts
8. database/migrations/007_university_features.sql
9. docs/university-integration-guide.md
10. integrations/university-api-connectors/

VALIDATION CRITERIA:
- Department discovery functional
- Academic calendar integration works
- Campus events display correctly
- University-specific features enhance engagement
- Cross-university features promote collaboration
- Performance optimized for university-scale usage

Include university partnership integration guide and expansion roadmap.
```

#### **PROMPT 2.10: Social Features UI & User Experience**
```
CONTEXT: You are a senior UX/UI engineer with 15+ years experience in social platform design, user interaction patterns, and mobile-first development.

PREVIOUS CONTEXT: Use all social and university features from previous prompts.

OBJECTIVE: Create intuitive, engaging, and accessible user interfaces for all social features including friend discovery, university networking, and social interactions.

REQUIREMENTS:
- Friend discovery and recommendation UI
- University network exploration interface
- Social action interfaces (follow, block, etc.)
- Social activity feeds and notifications
- People search and filtering
- University-specific dashboards
- Mobile-optimized responsive design
- Accessibility compliance (WCAG 2.1 AA)

UI COMPONENTS:
- PeopleDiscovery (recommendation cards)
- UniversityNetwork (department, year views)
- FollowButton (with loading states)
- SocialActivityFeed (real-time updates)
- UserCard (with social actions)
- DepartmentDirectory (searchable list)
- SocialMetrics (follower/following counts)
- RecommendationExplanation (transparency)

INTERACTION PATTERNS:
- Smooth follow/unfollow animations
- Optimistic UI updates
- Real-time notification badges
- Progressive loading for large lists
- Gesture support for mobile actions
- Contextual action menus
- Social proof indicators
- Empty state illustrations

USER EXPERIENCE:
- Onboarding for social features
- Gamification elements (connection milestones)
- Social discovery flows
- Privacy control accessibility
- University pride elements
- Community engagement features
- Social interaction feedback
- Error recovery mechanisms

DELIVERABLES:
1. apps/web/src/components/social/PeopleDiscovery.tsx
2. apps/web/src/components/social/UniversityNetwork.tsx
3. apps/web/src/components/social/FollowButton.tsx
4. apps/web/src/components/social/SocialActivityFeed.tsx
5. apps/web/src/components/university/DepartmentDirectory.tsx
6. apps/web/src/hooks/use-social-actions.ts
7. apps/web/src/styles/social-components.css
8. apps/web/src/utils/social-utils.ts
9. apps/web/tests/social-components.test.tsx
10. design-system/social-interaction-patterns.md

VALIDATION CRITERIA:
- All social interactions intuitive and responsive
- University features promote engagement
- Mobile experience optimized
- Accessibility standards met
- Loading states provide clear feedback
- Error handling graceful and helpful

Include user testing results and interaction design guidelines.
```

#### **PROMPT 2.11: Social Analytics & Engagement Metrics**
```
CONTEXT: You are a senior data scientist with 15+ years experience in social platform analytics, user engagement optimization, and privacy-compliant data science.

PREVIOUS CONTEXT: Use the complete social features system from all previous prompts.

OBJECTIVE: Implement comprehensive social analytics that track network growth, engagement patterns, university community health, and provide actionable insights for platform optimization.

REQUIREMENTS:
- Social network growth analytics
- Engagement pattern analysis
- University community metrics
- Privacy-compliant data collection
- Real-time social activity monitoring
- Recommendation algorithm performance tracking
- Social graph health metrics
- User segmentation analytics

SOCIAL METRICS:
- Network growth rates (daily/weekly/monthly)
- Follow/unfollow patterns and ratios
- University network density analysis
- Mutual connection distributions
- Social activity engagement rates
- Recommendation acceptance rates
- Block/report frequency analysis
- Cross-university connection patterns

ENGAGEMENT ANALYTICS:
- Social interaction frequency
- University feature adoption rates
- Community participation metrics
- Content sharing patterns
- Social discovery effectiveness
- User retention correlation with social activity
- Viral coefficient calculations
- Network effect measurements

COMMUNITY HEALTH:
- University network cohesion metrics
- Social graph clustering analysis
- Isolation detection and intervention
- Spam/abuse pattern identification
- Community sentiment analysis
- Cross-departmental interaction rates
- Alumni engagement measurements
- University pride and engagement correlation

DELIVERABLES:
1. apps/analytics-service/src/social/SocialAnalytics.ts
2. apps/analytics-service/src/social/NetworkGrowthTracker.ts
3. apps/analytics-service/src/social/CommunityHealthMetrics.ts
4. apps/analytics-service/src/insights/SocialInsights.ts
5. apps/admin/src/components/analytics/SocialDashboard.tsx
6. database/analytics/social-metrics-views.sql
7. apps/analytics-service/tests/social-analytics.test.ts
8. reports/social-engagement-analysis.js
9. docs/social-analytics-guide.md
10. dashboards/social-metrics-grafana.json

VALIDATION CRITERIA:
- Analytics provide actionable insights
- Privacy compliance maintained
- Real-time metrics accurate
- University community health trackable
- Recommendation performance measurable
- Social graph optimization data available

Include social analytics dashboard and community health monitoring procedures.
```

#### **PROMPT 2.12: Social Features Documentation & Integration**
```
CONTEXT: You are a senior technical writer with 15+ years experience in API documentation, integration guides, and social platform documentation.

PREVIOUS CONTEXT: Use the complete social system with analytics from all previous prompts.

OBJECTIVE: Create comprehensive documentation for social features including API references, integration guides, best practices, and university-specific implementation guides.

REQUIREMENTS:
- Complete social API documentation
- University integration guidelines
- Social feature implementation examples
- Privacy and moderation guides
- Performance optimization documentation
- Analytics and insights guide
- Troubleshooting and debugging resources
- Future roadmap and extensibility

DOCUMENTATION STRUCTURE:
- Social API Reference
- University Network Integration Guide
- Friend Recommendation Implementation
- Privacy and Safety Features
- Social Analytics and Insights
- Performance Optimization Guide
- Moderation and Community Guidelines
- Integration Examples and SDKs

API DOCUMENTATION:
- Social relationship endpoints
- University network APIs
- Friend recommendation services
- Social analytics endpoints
- Real-time social events
- Privacy control APIs
- Moderation action APIs
- Bulk operation interfaces

INTEGRATION GUIDES:
- University LMS integration patterns
- Campus system connectivity
- Third-party social platform bridges
- Analytics system integration
- Moderation tool connections
- Academic calendar synchronization
- Student information system integration
- Alumni network connectivity

DELIVERABLES:
1. docs/api/social-api-reference.md
2. docs/integration/university-network-guide.md
3. docs/guides/friend-recommendation-implementation.md
4. docs/privacy/social-privacy-guide.md
5. docs/analytics/social-insights-guide.md
6. docs/performance/social-optimization.md
7. examples/social-integration-samples/
8. sdk/social-features-sdk/
9. troubleshooting/social-common-issues.md
10. roadmap/social-features-evolution.md

VALIDATION CRITERIA:
- Documentation comprehensive and accurate
- Integration examples functional
- API references complete with examples
- University guides enable successful implementation
- Privacy documentation ensures compliance
- Performance guides achieve optimization targets

Include developer portal integration and community contribution guidelines.
```

---

## 🚀 SPRINT 3: Content System & Feed Algorithm

### Week 5: Content Creation System (Days 29-35)

#### **PROMPT 3.1: Content Data Architecture & Storage**
```
CONTEXT: You are a senior backend architect with 15+ years experience in content management systems, social media platforms, and high-scale data architecture.

PREVIOUS CONTEXT: Use the complete social features system from Sprint 2.

OBJECTIVE: Design and implement a robust content management system for posts, media attachments, hashtags, mentions, and content relationships with performance optimization.

REQUIREMENTS:
- Scalable post data model
- Media attachment management
- Hashtag and mention processing
- Content versioning and editing
- Content relationship mapping
- Real-time content updates
- Content analytics preparation
- Multi-format content support

CONTENT DATA MODEL:
- Post entities with metadata
- Media attachment references
- Hashtag extraction and indexing
- User mention processing
- Content threading (replies/quotes)
- Content visibility controls
- Content moderation flags
- Engagement metrics tracking

PERFORMANCE OPTIMIZATIONS:
- Efficient content queries
- Media storage optimization
- Content caching strategies
- Real-time update propagation
- Bulk content operations
- Content search indexing
- Analytics data aggregation
- Memory-efficient data structures

CONTENT FEATURES:
- Text posts with rich formatting
- Image and video attachments
- Link preview generation
- Hashtag trending calculation
- Mention notification triggers
- Content threading and replies
- Content sharing mechanisms
- Draft saving and scheduling

DELIVERABLES:
1. apps/content-service/src/models/Content.ts
2. apps/content-service/src/models/MediaAttachment.ts
3. apps/content-service/src/services/ContentService.ts
4. apps/content-service/src/processors/HashtagProcessor.ts
5. apps/content-service/src/processors/MentionProcessor.ts
6. database/migrations/008_content_system.sql
7. apps/content-service/src/cache/content-cache.ts
8. apps/content-service/tests/content-architecture.test.ts
9. docs/content-data-architecture.md
10. performance/content-benchmarks.js

VALIDATION CRITERIA:
- Content model supports all post types
- Media attachments handled efficiently
- Hashtag/mention processing accurate
- Performance targets met for content operations
- Real-time updates propagate correctly
- Content relationships maintained properly

Include content scalability analysis and performance tuning recommendations.
```

#### **PROMPT 3.2: Content Creation & Publishing API**
```
CONTEXT: You are a senior API developer with 15+ years experience in content management APIs, real-time systems, and social media platforms.

PREVIOUS CONTEXT: Use the content data architecture from PROMPT 3.1.

OBJECTIVE: Implement comprehensive content creation and publishing APIs with validation, media processing, real-time distribution, and engagement tracking.

REQUIREMENTS:
- Content creation with validation
- Media upload and processing
- Real-time content publishing
- Content editing and versioning
- Bulk content operations
- Content scheduling capabilities
- Privacy and visibility controls
- Content moderation integration

API ENDPOINTS:
- POST /content - Create new content
- PUT /content/{id} - Update content
- DELETE /content/{id} - Delete content
- POST /content/media - Upload media
- GET /content/{id} - Get content details
- GET /content/feed - Get content feed
- POST /content/schedule - Schedule content
- GET /content/drafts - Get draft content

CONTENT PROCESSING:
- Text validation and sanitization
- Hashtag extraction and validation
- Mention processing and notification
- Link preview generation
- Media compression and optimization
- Content policy enforcement
- Spam detection and filtering
- Content quality scoring

REAL-TIME FEATURES:
- Instant content publishing
- Real-time engagement updates
- Live mention notifications
- Trending hashtag updates
- Content visibility propagation
- Social graph distribution
- Analytics event streaming
- Moderation alert triggers

DELIVERABLES:
1. apps/content-service/src/routes/content-routes.ts
2. apps/content-service/src/controllers/ContentController.ts
3. apps/content-service/src/validators/content-validator.ts
4. apps/content-service/src/processors/content-processor.ts
5. apps/content-service/src/publishers/content-publisher.ts
6. apps/content-service/src/middleware/content-middleware.ts
7. apps/content-service/tests/content-api.test.ts
8. docs/api/content-endpoints.md
9. examples/content-api-usage.http
10. monitoring/content-api-metrics.json

VALIDATION CRITERIA:
- Content creation API handles all content types
- Media processing optimized and reliable
- Real-time publishing performs well
- Content validation prevents policy violations
- API performance meets targets (<100ms)
- Error handling comprehensive and helpful

Include content API rate limiting and abuse prevention strategies.
```

#### **PROMPT 3.3: Media Processing & Optimization**
```
CONTEXT: You are a senior multimedia engineer with 15+ years experience in image/video processing, CDN optimization, and media streaming platforms.

PREVIOUS CONTEXT: Use the content creation API from PROMPT 3.2.

OBJECTIVE: Implement advanced media processing pipeline for images and videos with optimization, format conversion, thumbnail generation, and content analysis.

REQUIREMENTS:
- Multi-format image processing
- Video processing and compression
- Automatic format optimization
- Thumbnail and preview generation
- Content analysis and moderation
- Progressive loading support
- CDN integration preparation
- Storage optimization

IMAGE PROCESSING:
- Format conversion (JPEG, PNG, WebP, AVIF)
- Multiple resolution generation
- Quality optimization by use case
- Lossless compression techniques
- Metadata extraction and stripping
- Face detection for cropping
- Color analysis and enhancement
- Watermarking capabilities

VIDEO PROCESSING:
- Video compression and optimization
- Multiple quality levels (240p-1080p)
- Thumbnail extraction at intervals
- Video preview generation (GIF-like)
- Format conversion (MP4, WebM)
- Audio extraction and processing
- Subtitle and caption support
- Video length and size optimization

CONTENT ANALYSIS:
- Inappropriate content detection
- Copyright violation detection
- Text extraction from images (OCR)
- Object and scene recognition
- Content categorization
- Quality assessment scoring
- Accessibility feature generation
- Privacy-sensitive content detection

DELIVERABLES:
1. apps/media-service/src/processors/ImageProcessor.ts
2. apps/media-service/src/processors/VideoProcessor.ts
3. apps/media-service/src/analyzers/ContentAnalyzer.ts
4. apps/media-service/src/optimizers/MediaOptimizer.ts
5. apps/media-service/src/storage/MediaStorage.ts
6. apps/media-service/src/utils/format-converter.ts
7. apps/media-service/tests/media-processing.test.ts
8. scripts/media-batch-processing.js
9. docs/media-processing-guide.md
10. monitoring/media-processing-metrics.json

VALIDATION CRITERIA:
- Image processing generates all required formats
- Video compression maintains quality efficiently
- Content analysis accurately detects violations
- Processing performance meets targets (<30s for video)
- Storage optimization reduces costs significantly
- CDN integration ready for deployment

Include media processing cost analysis and optimization strategies.
```

#### **PROMPT 3.4: Content Moderation & Safety**
```
CONTEXT: You are a senior content safety engineer with 15+ years experience in content moderation, machine learning, and community safety systems.

PREVIOUS CONTEXT: Use the media processing system from PROMPT 3.3.

OBJECTIVE: Implement comprehensive content moderation system with automated detection, human review workflows, and community safety features.

REQUIREMENTS:
- Automated content analysis
- Human moderation workflows
- Community reporting system
- Content policy enforcement
- Appeal and review processes
- Moderation analytics
- Cultural sensitivity awareness
- Educational content protection

AUTOMATED MODERATION:
- Text content analysis (hate speech, harassment)
- Image content recognition (inappropriate imagery)
- Video content scanning (violence, adult content)
- Spam and promotional content detection
- Link safety and malware detection
- Academic integrity protection
- Fake news and misinformation detection
- Copyright violation identification

HUMAN MODERATION:
- Moderation queue management
- Content review workflows
- Escalation procedures
- Moderator training materials
- Decision tracking and audit trails
- Community standards documentation
- Cultural context consideration
- Educational environment protection

COMMUNITY SAFETY:
- User reporting mechanisms
- Automated action triggers
- Content warning systems
- Safe space maintenance
- Crisis intervention protocols
- Mental health resource integration
- Cyberbullying prevention
- Academic harassment protection

DELIVERABLES:
1. apps/moderation-service/src/analyzers/ContentAnalyzer.ts
2. apps/moderation-service/src/workflows/ModerationWorkflow.ts
3. apps/moderation-service/src/detectors/PolicyViolationDetector.ts
4. apps/moderation-service/src/systems/ReportingSystem.ts
5. apps/admin/src/components/moderation/ModerationQueue.tsx
6. apps/moderation-service/src/ml/ContentClassifier.ts
7. apps/moderation-service/tests/content-moderation.test.ts
8. docs/content-moderation-guide.md
9. policies/community-standards.md
10. training/moderator-training-materials/

VALIDATION CRITERIA:
- Automated detection catches policy violations accurately
- Human moderation workflow efficient and fair
- Community reporting system accessible and responsive
- Moderation decisions consistent with policies
- Appeal process fair and timely
- Educational content appropriately protected

Include content policy documentation and moderation training program.
```

#### **PROMPT 3.5: Hashtag & Trending System**
```
CONTEXT: You are a senior algorithm engineer with 15+ years experience in trending algorithms, real-time analytics, and social media discovery systems.

PREVIOUS CONTEXT: Use the content moderation system from PROMPT 3.4.

OBJECTIVE: Implement intelligent hashtag processing and trending discovery system with real-time calculations, spam prevention, and university-specific trending.

REQUIREMENTS:
- Real-time hashtag processing
- Trending calculation algorithms
- University-specific trending
- Hashtag spam detection
- Historical trend analysis
- Hashtag recommendation system
- Community interest tracking
- Event-based trending spikes

HASHTAG PROCESSING:
- Automatic hashtag extraction
- Hashtag normalization and validation
- Related hashtag discovery
- Hashtag popularity scoring
- Cross-platform hashtag tracking
- Hashtag lifecycle management
- Hashtag search optimization
- Hashtag analytics collection

TRENDING ALGORITHMS:
- Real-time trending calculation
- Weighted engagement scoring
- Time-decay trend modeling
- University-specific trending
- Department/academic trending
- Geographic trend localization
- Event-driven spike detection
- Organic vs artificial trend detection

SPAM PREVENTION:
- Hashtag spam detection
- Coordinated hashtag manipulation detection
- Bot-driven trending prevention
- Fake engagement filtering
- Hashtag hijacking prevention
- Community guideline enforcement
- Abuse pattern recognition
- Reputation-based filtering

DELIVERABLES:
1. apps/trending-service/src/processors/HashtagProcessor.ts
2. apps/trending-service/src/algorithms/TrendingCalculator.ts
3. apps/trending-service/src/detectors/SpamDetector.ts
4. apps/trending-service/src/analytics/TrendAnalyzer.ts
5. apps/web/src/components/trending/TrendingHashtags.tsx
6. apps/trending-service/src/cache/trending-cache.ts
7. apps/trending-service/tests/trending-algorithms.test.ts
8. database/functions/trending-calculations.sql
9. docs/hashtag-trending-guide.md
10. monitoring/trending-metrics-dashboard.json

VALIDATION CRITERIA:
- Hashtag processing accurate and fast
- Trending calculations reflect real engagement
- University-specific trends relevant
- Spam detection prevents manipulation
- Real-time updates perform well
- Historical analysis provides insights

Include trending algorithm tuning guide and spam prevention strategies.
```

#### **PROMPT 3.6: Content Search & Discovery**
```
CONTEXT: You are a senior search engineer with 15+ years experience in search algorithms, information retrieval, and content discovery systems.

PREVIOUS CONTEXT: Use the hashtag and trending system from PROMPT 3.5.

OBJECTIVE: Implement comprehensive content search and discovery system with full-text search, semantic search capabilities, and personalized content discovery.

REQUIREMENTS:
- Full-text content search
- Semantic search capabilities
- Hashtag-based discovery
- User-based content filtering
- University-specific search
- Real-time search indexing
- Search result ranking
- Personalized discovery feeds

SEARCH CAPABILITIES:
- Full-text search across all content
- Hashtag search with autocomplete
- User search integration
- Media content search (OCR text)
- Date and time-range filtering
- University and department filtering
- Engagement-based ranking
- Semantic similarity matching

DISCOVERY FEATURES:
- Personalized content recommendations
- University-trending content
- Department-specific discovery
- Interest-based content surfacing
- Social graph influenced discovery
- Temporal content discovery
- Event-based content highlighting
- Academic calendar aware discovery

SEARCH OPTIMIZATION:
- Real-time search index updates
- Query performance optimization
- Result caching strategies
- Search result diversification
- Relevance score calculation
- Search analytics tracking
- A/B testing for search algorithms
- Search quality measurement

DELIVERABLES:
1. apps/search-service/src/engines/ContentSearchEngine.ts
2. apps/search-service/src/indexers/ContentIndexer.ts
3. apps/search-service/src/rankers/SearchRanker.ts
4. apps/search-service/src/discovery/ContentDiscovery.ts
5. apps/web/src/components/search/ContentSearch.tsx
6. apps/search-service/src/analytics/SearchAnalytics.ts
7. apps/search-service/tests/content-search.test.ts
8. database/search/content-search-indexes.sql
9. docs/content-search-guide.md
10. performance/search-performance-benchmarks.js

VALIDATION CRITERIA:
- Search results relevant and fast (<200ms)
- Discovery recommendations engaging
- University-specific search accurate
- Real-time indexing keeps content current
- Search analytics provide optimization insights
- Personalization improves user engagement

Include search optimization guide and discovery algorithm tuning procedures.
```

### Week 6: Feed Algorithm & UI (Days 36-42)

#### **PROMPT 3.7: Feed Algorithm Architecture (Go Service)**
```
CONTEXT: You are a senior algorithm engineer with 15+ years experience in recommendation systems, feed algorithms, and high-performance computing with Go.

PREVIOUS CONTEXT: Use the complete content search system from PROMPT 3.6.

OBJECTIVE: Implement a sophisticated feed generation algorithm in Go that personalizes content based on user preferences, social connections, university networks, and engagement patterns.

REQUIREMENTS:
- Multi-factor ranking algorithm
- Real-time personalization
- University network influence
- Social graph integration
- Engagement pattern learning
- Content freshness balancing
- Diversity injection
- Performance optimization for scale

RANKING FACTORS:
- Social graph proximity (30% weight)
- University network relevance (25% weight)
- Interest similarity (20% weight)
- Content engagement velocity (15% weight)
- Recency boost (10% weight)
- Content quality score (bonus)
- University events correlation (bonus)
- Academic calendar awareness (bonus)

ALGORITHM COMPONENTS:
- User preference profiling
- Social influence calculation
- University network scoring
- Content quality assessment
- Engagement velocity tracking
- Freshness decay functions
- Diversity optimization
- Real-time score computation

PERFORMANCE OPTIMIZATIONS:
- Concurrent processing with goroutines
- Memory-efficient data structures
- Cached intermediate calculations
- Batch score computations
- Redis-based caching layer
- Database query optimization
- Real-time update propagation
- Horizontal scaling preparation

DELIVERABLES:
1. apps/feed-service/internal/algorithm/feed_generator.go
2. apps/feed-service/internal/scoring/social_scoring.go
3. apps/feed-service/internal/scoring/university_scoring.go
4. apps/feed-service/internal/scoring/engagement_scoring.go
5. apps/feed-service/internal/cache/feed_cache.go
6. apps/feed-service/internal/models/feed_models.go
7. apps/feed-service/cmd/server/main.go
8. apps/feed-service/tests/algorithm_test.go
9. docs/feed-algorithm-design.md
10. performance/feed-benchmarks.go

VALIDATION CRITERIA:
- Feed generation <100ms per user
- Personalization improves engagement by >25%
- University content appropriately weighted
- Algorithm handles 10K+ concurrent users
- Real-time updates propagate quickly
- Content diversity maintained

Include algorithm tuning guide and performance optimization strategies.
```

#### **PROMPT 3.8: Feed Caching & Performance Optimization**
```
CONTEXT: You are a senior performance engineer with 15+ years experience in caching strategies, Redis optimization, and high-throughput systems.

PREVIOUS CONTEXT: Use the Go feed algorithm from PROMPT 3.7.

OBJECTIVE: Implement comprehensive caching strategy for feed generation with Redis, pre-computation, cache invalidation, and performance monitoring.

REQUIREMENTS:
- Multi-layer caching strategy
- Feed pre-computation
- Intelligent cache invalidation
- Cache warming strategies
- Performance monitoring
- Memory optimization
- Cache consistency maintenance
- Scaling preparation

CACHING LAYERS:
- L1: In-memory application cache
- L2: Redis distributed cache
- L3: Database query result cache
- L4: CDN edge caching preparation
- Pre-computed user feeds
- Cached user preferences
- Cached social graph data
- Cached university network data

CACHE STRATEGIES:
- Time-based expiration (5-15 minutes)
- Event-based invalidation
- Lazy loading with background refresh
- Cache warming for active users
- Probabilistic cache refresh
- Cache stampede prevention
- Memory pressure handling
- Cache hit ratio optimization

PERFORMANCE FEATURES:
- Real-time cache metrics
- Cache hit/miss analytics
- Memory usage monitoring
- Cache invalidation tracking
- Performance baseline measurement
- Bottleneck identification
- Scaling threshold alerts
- Cost optimization analysis

DELIVERABLES:
1. apps/feed-service/internal/cache/redis_cache.go
2. apps/feed-service/internal/cache/memory_cache.go
3. apps/feed-service/internal/cache/cache_invalidator.go
4. apps/feed-service/internal/cache/cache_warmer.go
5. apps/feed-service/internal/monitoring/cache_metrics.go
6. apps/feed-service/internal/utils/cache_utils.go
7. scripts/cache-warming.go
8. monitoring/cache-performance-dashboard.json
9. docs/feed-caching-strategy.md
10. performance/cache-benchmarks.go

VALIDATION CRITERIA:
- Cache hit ratio >90% for active users
- Feed generation time reduced by >80%
- Memory usage optimized and monitored
- Cache invalidation accurate and timely
- Performance monitoring comprehensive
- Scaling thresholds properly configured

Include cache tuning guide and memory optimization strategies.
```

#### **PROMPT 3.9: Feed API & Content Delivery**
```
CONTEXT: You are a senior API developer with 15+ years experience in content delivery APIs, pagination strategies, and real-time data systems.

PREVIOUS CONTEXT: Use the cached feed system from PROMPT 3.8.

OBJECTIVE: Implement high-performance feed delivery API with pagination, real-time updates, content pre-loading, and mobile optimization.

REQUIREMENTS:
- Infinite scroll pagination
- Real-time feed updates
- Content pre-loading
- Mobile-optimized responses
- Feed refresh mechanisms
- Content filtering options
- Performance monitoring
- Error handling and fallbacks

API ENDPOINTS:
- GET /feed - Main personalized feed
- GET /feed/university - University-specific feed
- GET /feed/trending - Trending content feed
- GET /feed/following - Following-only feed
- POST /feed/refresh - Manual feed refresh
- GET /feed/realtime - Real-time feed updates
- PUT /feed/preferences - Update feed preferences
- GET /feed/analytics - Feed performance data

PAGINATION STRATEGIES:
- Cursor-based pagination for consistency
- Offset-based pagination for random access
- Time-based pagination for real-time updates
- Hybrid pagination for optimal UX
- Pre-loading next page content
- Infinite scroll optimization
- Jump-to-date functionality
- Page size optimization

REAL-TIME FEATURES:
- WebSocket feed updates
- Server-sent events for new content
- Real-time engagement updates
- Live trending content updates
- Instant new post notifications
- Real-time feed position maintenance
- Background content pre-fetching
- Optimistic UI update support

DELIVERABLES:
1. apps/feed-service/internal/handlers/feed_handler.go
2. apps/feed-service/internal/api/feed_api.go
3. apps/feed-service/internal/pagination/feed_pagination.go
4. apps/feed-service/internal/realtime/feed_updates.go
5. apps/web/src/hooks/use-infinite-feed.ts
6. apps/web/src/components/feed/InfiniteFeed.tsx
7. apps/feed-service/tests/feed_api_test.go
8. docs/api/feed-endpoints.md
9. examples/feed-api-usage.http
10. monitoring/feed-api-metrics.json

VALIDATION CRITERIA:
- Feed API responds <100ms consistently
- Infinite scroll performs smoothly
- Real-time updates delivered instantly
- Mobile performance optimized
- Pagination handles large datasets efficiently
- Error handling provides graceful degradation

Include API optimization guide and mobile performance best practices.
```

#### **PROMPT 3.10: Feed UI Components & User Experience**
```
CONTEXT: You are a senior frontend engineer with 15+ years experience in social media UIs, infinite scroll implementations, and mobile-first design.

PREVIOUS CONTEXT: Use the feed API from PROMPT 3.9.

OBJECTIVE: Create beautiful, performant, and engaging feed UI components with infinite scroll, real-time updates, and excellent mobile experience.

REQUIREMENTS:
- Infinite scroll feed interface
- Real-time content updates
- Post interaction components
- Feed filtering and sorting
- Mobile-optimized responsive design
- Accessibility compliance
- Performance optimization
- Error handling and loading states

FEED COMPONENTS:
- InfiniteFeed (main feed container)
- PostCard (individual post display)
- FeedHeader (sorting, filtering options)
- LoadingStates (skeleton screens)
- ErrorBoundary (error handling)
- RefreshIndicator (pull-to-refresh)
- NewPostsIndicator (real-time notifications)
- FeedFilters (content filtering UI)

INTERACTION FEATURES:
- Like/unlike with animation
- Share functionality
- Comment thread preview
- User mention interactions
- Hashtag click navigation
- Image/video media viewer
- Link preview expansion
- Context menu actions

UX OPTIMIZATIONS:
- Smooth infinite scroll
- Progressive image loading
- Optimistic UI updates
- Pull-to-refresh functionality
- Keyboard navigation support
- Voice-over accessibility
- Gesture support for mobile
- Dark mode support

DELIVERABLES:
1. apps/web/src/components/feed/InfiniteFeed.tsx
2. apps/web/src/components/feed/PostCard.tsx
3. apps/web/src/components/feed/FeedHeader.tsx
4. apps/web/src/components/feed/LoadingStates.tsx
5. apps/web/src/components/feed/MediaViewer.tsx
6. apps/web/src/hooks/use-infinite-scroll.ts
7. apps/web/src/styles/feed-components.css
8. apps/web/src/utils/feed-utils.ts
9. apps/web/tests/feed-components.test.tsx
10. design-system/feed-interaction-patterns.md

VALIDATION CRITERIA:
- Infinite scroll performs smoothly on all devices
- Real-time updates integrate seamlessly
- Post interactions responsive and intuitive
- Mobile experience optimized for touch
- Accessibility standards met (WCAG 2.1 AA)
- Loading states provide clear feedback

Include UX testing results and mobile optimization guidelines.
```

#### **PROMPT 3.11: Content Analytics & Insights**
```
CONTEXT: You are a senior data scientist with 15+ years experience in content analytics, user engagement analysis, and social media metrics.

PREVIOUS CONTEXT: Use the complete feed UI system from PROMPT 3.10.

OBJECTIVE: Implement comprehensive content analytics that track engagement patterns, content performance, feed effectiveness, and provide actionable insights for optimization.

REQUIREMENTS:
- Content performance analytics
- Feed algorithm effectiveness metrics
- User engagement pattern analysis
- Content lifecycle tracking
- A/B testing framework integration
- Real-time analytics dashboard
- Privacy-compliant data collection
- Predictive content insights

CONTENT METRICS:
- Post engagement rates (likes, shares, comments)
- Content reach and impression tracking
- Hashtag performance analytics
- Media content engagement analysis
- Link click-through rates
- Content lifespan and decay analysis
- Viral coefficient calculations
- University-specific content performance

FEED ANALYTICS:
- Feed personalization effectiveness
- Algorithm performance metrics
- User session engagement tracking
- Content discovery success rates
- Feed refresh frequency analysis
- Real-time update engagement
- Content filtering usage patterns
- Feed optimization opportunities

USER INSIGHTS:
- Content consumption patterns
- Engagement behavior analysis
- University network interaction patterns
- Content creation vs consumption ratios
- Peak activity time analysis
- Device and platform usage patterns
- Content preference evolution
- User journey optimization

DELIVERABLES:
1. apps/analytics-service/src/content/ContentAnalytics.ts
2. apps/analytics-service/src/feed/FeedAnalytics.ts
3. apps/analytics-service/src/insights/ContentInsights.ts
4. apps/admin/src/components/analytics/ContentDashboard.tsx
5. apps/analytics-service/src/tracking/engagement-tracker.ts
6. database/analytics/content-metrics-views.sql
7. apps/analytics-service/tests/content-analytics.test.ts
8. reports/content-performance-analysis.js
9. docs/content-analytics-guide.md
10. dashboards/content-metrics-grafana.json

VALIDATION CRITERIA:
- Analytics provide actionable content insights
- Feed algorithm performance measurable
- User engagement patterns clearly identified
- Real-time metrics accurate and timely
- Privacy compliance maintained
- Predictive insights improve content strategy

Include content optimization recommendations and A/B testing framework.
```

---

*Continuing with Sprint 4, 5, and 6 prompts in next response due to length constraints...*

Bu comprehensive prompt roadmap ile ChitLaq M1 MVP'yi sistematik ve aşamalı şekilde geliştirebiliriz. Her prompt, önceki çıktıları context olarak kullanarak progressively daha complex features inşa ediyor.

**Key Prompt Engineering Principles Applied:**
- **Context Continuity:** Her prompt önceki outputs'u reference ediyor
- **Progressive Complexity:** Basit foundation'dan complex features'a doğru
- **Senior-Level Expectations:** 15+ yıl experience embedded in every prompt
- **Validation-Driven:** Her prompt clear success criteria içeriyor
- **Performance-First:** Tüm prompts performance targets içeriyor

Would you like me to continue with Sprint 4, 5, and 6 prompts to complete the roadmap?

<function_calls>
<invoke name="todo_write">
<parameter name="merge">true
