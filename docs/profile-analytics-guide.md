# Profile Analytics & Insights Implementation Guide

## Overview

This guide provides comprehensive documentation for the Profile Analytics & Insights system implemented for the ChitLaq M1 MVP. The system enables privacy-compliant user behavior tracking, insight generation, and recommendation delivery to improve user experience and profile completion.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Components](#core-components)
3. [Data Models](#data-models)
4. [API Reference](#api-reference)
5. [Privacy & Compliance](#privacy--compliance)
6. [Implementation Guide](#implementation-guide)
7. [Configuration](#configuration)
8. [Monitoring & Maintenance](#monitoring--maintenance)
9. [Troubleshooting](#troubleshooting)
10. [Best Practices](#best-practices)

## Architecture Overview

The Profile Analytics system follows a modular architecture with clear separation of concerns:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Analytics     │    │   Database      │
│   Components    │◄──►│   Service       │◄──►│   (PostgreSQL)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Event         │    │   Insights      │    │   Metrics       │
│   Collection    │    │   Generation    │    │   Aggregation   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Key Principles

- **Privacy-First**: All data collection respects user consent and privacy preferences
- **Real-Time**: Insights and recommendations are generated in near real-time
- **Scalable**: Designed to handle high-volume event processing
- **Compliant**: GDPR, CCPA, and FERPA compliant data handling

## Core Components

### 1. ProfileAnalytics (Event Collector)

**Location**: `apps/analytics-service/src/collectors/ProfileAnalytics.ts`

**Purpose**: Collects and processes user interaction events with privacy compliance.

**Key Features**:
- Event validation and sanitization
- Privacy compliance checking
- Batch processing for performance
- Error handling and retry logic
- Data anonymization support

**Usage Example**:
```typescript
import { ProfileAnalytics } from './collectors/ProfileAnalytics';
import { createProfileViewEvent } from './models/AnalyticsEvent';

const analytics = new ProfileAnalytics();

// Collect a profile view event
const event = createProfileViewEvent(
  userId,
  sessionId,
  {
    profileId: 'profile_123',
    viewerId: 'viewer_456',
    isOwnProfile: false,
    duration: 30,
    sectionsViewed: ['header', 'about']
  },
  metadata,
  privacySettings
);

await analytics.collectEvent(event);
```

### 2. ProfileInsights (Insight Generator)

**Location**: `apps/analytics-service/src/insights/ProfileInsights.ts`

**Purpose**: Generates actionable insights and recommendations based on user behavior.

**Key Features**:
- Profile completion insights
- Engagement pattern analysis
- University network recommendations
- Privacy optimization suggestions
- A/B testing framework integration

**Usage Example**:
```typescript
import { ProfileInsights } from './insights/ProfileInsights';

const insights = new ProfileInsights();

// Generate insights for a user
const userInsights = await insights.generateInsights(userId, events);

// Generate recommendations
const recommendations = await insights.generateRecommendations(userId, events);
```

### 3. ConsentManager (Privacy Controller)

**Location**: `apps/analytics-service/src/privacy/ConsentManager.ts`

**Purpose**: Manages user consent and ensures privacy compliance.

**Key Features**:
- Consent tracking and validation
- Data subject request processing
- Privacy preference management
- Compliance reporting
- Data retention management

**Usage Example**:
```typescript
import { ConsentManager } from './privacy/ConsentManager';

const consentManager = new ConsentManager();

// Grant consent
await consentManager.grantConsent({
  userId: 'user_123',
  purposes: ['analytics', 'personalization'],
  dataCategories: ['behavioral', 'technical'],
  retentionPeriod: 365,
  version: '1.0'
});

// Check consent
const hasConsent = await consentManager.hasConsent(userId, 'analytics');
```

### 4. ProfileMetricsAggregator (Metrics Processor)

**Location**: `apps/analytics-service/src/aggregators/ProfileMetrics.ts`

**Purpose**: Aggregates and analyzes user metrics for reporting and insights.

**Key Features**:
- Multi-period metrics calculation
- Performance benchmarking
- Trend analysis
- Comparative metrics
- Export capabilities

**Usage Example**:
```typescript
import { ProfileMetricsAggregator } from './aggregators/ProfileMetrics';

const aggregator = new ProfileMetricsAggregator(
  userId,
  'weekly',
  startDate,
  endDate
);

aggregator.addEvents(events);
const metrics = aggregator.generateMetrics();
```

## Data Models

### AnalyticsEvent

The core data structure for all user interaction events:

```typescript
interface AnalyticsEvent {
  id: string;
  userId: string;
  sessionId: string;
  eventType: EventType;
  timestamp: Date;
  data: EventData;
  metadata: EventMetadata;
  privacy: PrivacySettings;
}
```

**Event Types**:
- `profile_view`: User views a profile
- `profile_edit`: User edits their profile
- `avatar_upload`: User uploads an avatar
- `privacy_change`: User changes privacy settings
- `university_network_interaction`: User interacts with university network
- `profile_completion_milestone`: User reaches a completion milestone
- `recommendation_view`: User views a recommendation
- `recommendation_implement`: User implements a recommendation
- `insight_dismiss`: User dismisses an insight
- `analytics_opt_in`: User opts into analytics
- `analytics_opt_out`: User opts out of analytics

### ProfileInsight

Generated insights for user profile optimization:

```typescript
interface ProfileInsight {
  id: string;
  userId: string;
  insightType: 'completion' | 'engagement' | 'privacy' | 'network' | 'optimization';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  impact: number;
  actionable: boolean;
  category: string;
  data: Record<string, any>;
  recommendations: string[];
  metrics: {
    current: number;
    target: number;
    trend: 'up' | 'down' | 'stable';
    change: number;
  };
  createdAt: Date;
  expiresAt?: Date;
  dismissed: boolean;
  implemented: boolean;
}
```

### ProfileRecommendation

Actionable recommendations for profile improvement:

```typescript
interface ProfileRecommendation {
  id: string;
  userId: string;
  type: 'profile_optimization' | 'privacy_improvement' | 'network_expansion' | 'content_strategy';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  impact: number;
  effort: 'low' | 'medium' | 'high';
  category: string;
  steps: {
    id: string;
    title: string;
    description: string;
    completed: boolean;
    estimatedTime: number;
  }[];
  expectedOutcome: string;
  metrics: {
    baseline: number;
    target: number;
    timeframe: string;
  };
  createdAt: Date;
  expiresAt?: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
}
```

## API Reference

### Analytics Service Endpoints

#### Collect Event
```http
POST /api/analytics/events
Content-Type: application/json

{
  "eventType": "profile_view",
  "data": {
    "profileId": "profile_123",
    "viewerId": "viewer_456",
    "isOwnProfile": false,
    "duration": 30,
    "sectionsViewed": ["header", "about"]
  }
}
```

#### Get User Insights
```http
GET /api/analytics/insights/{userId}
```

#### Get User Recommendations
```http
GET /api/analytics/recommendations/{userId}
```

#### Grant Consent
```http
POST /api/analytics/consent
Content-Type: application/json

{
  "purposes": ["analytics", "personalization"],
  "dataCategories": ["behavioral", "technical"],
  "retentionPeriod": 365
}
```

#### Revoke Consent
```http
DELETE /api/analytics/consent/{userId}
```

### Database Views

#### Profile Metrics Views
- `profile_metrics_daily`: Daily aggregated metrics
- `profile_metrics_weekly`: Weekly aggregated metrics
- `profile_metrics_monthly`: Monthly aggregated metrics
- `profile_engagement_summary`: User engagement summary
- `profile_completion_progress`: Profile completion tracking
- `recommendation_effectiveness`: Recommendation performance metrics
- `user_activity_patterns`: User behavior patterns

#### Database Functions
- `get_user_profile_metrics(user_id, start_date, end_date)`: Get user metrics for period
- `get_user_recommendation_effectiveness(user_id, start_date, end_date)`: Get recommendation effectiveness
- `get_user_activity_patterns(user_id, start_date, end_date)`: Get activity patterns
- `cleanup_old_analytics_data(retention_days)`: Clean up old data

## Privacy & Compliance

### GDPR Compliance

The system implements comprehensive GDPR compliance features:

1. **Consent Management**: Explicit consent tracking and management
2. **Data Minimization**: Only collect necessary data
3. **Purpose Limitation**: Data used only for specified purposes
4. **Storage Limitation**: Automatic data retention and deletion
5. **Data Subject Rights**: Support for access, rectification, erasure, and portability
6. **Privacy by Design**: Privacy considerations built into the system

### CCPA Compliance

California Consumer Privacy Act compliance features:

1. **Right to Know**: Users can request information about data collection
2. **Right to Delete**: Users can request data deletion
3. **Right to Opt-Out**: Users can opt-out of data sale/sharing
4. **Non-Discrimination**: No discrimination for exercising privacy rights

### FERPA Compliance

Family Educational Rights and Privacy Act compliance for educational data:

1. **Educational Record Protection**: Special handling of educational data
2. **Parental Rights**: Support for parental access to student data
3. **Directory Information**: Proper handling of directory information
4. **Disclosure Controls**: Strict controls on data disclosure

### Privacy Controls

#### User Privacy Settings
```typescript
interface PrivacySettings {
  anonymized: boolean;
  retentionDays: number;
  consentGiven: boolean;
  purpose: string[];
  legalBasis: 'consent' | 'legitimate_interest' | 'contract' | 'legal_obligation';
  dataCategories: string[];
  processingActivities: string[];
}
```

#### Data Anonymization
- IP address anonymization
- User ID hashing for cross-session tracking
- Data aggregation to prevent individual identification
- Automatic PII detection and removal

## Implementation Guide

### 1. Frontend Integration

#### React Hook for Analytics
```typescript
import { useProfileAnalytics } from '../hooks/use-profile-analytics';

function ProfileComponent() {
  const { trackEvent, insights, recommendations } = useProfileAnalytics();

  const handleProfileView = (profileId: string, duration: number) => {
    trackEvent('profile_view', {
      profileId,
      duration,
      sectionsViewed: ['header', 'about']
    });
  };

  return (
    <div>
      {/* Profile content */}
      <ProfileInsights insights={insights} recommendations={recommendations} />
    </div>
  );
}
```

#### Profile Insights Component
```typescript
import ProfileInsights from '../components/analytics/ProfileInsights';

function Dashboard() {
  return (
    <ProfileInsights
      userId={userId}
      insights={insights}
      recommendations={recommendations}
      onDismissInsight={handleDismissInsight}
      onImplementInsight={handleImplementInsight}
      onStartRecommendation={handleStartRecommendation}
      onCompleteStep={handleCompleteStep}
    />
  );
}
```

### 2. Backend Service Setup

#### Service Initialization
```typescript
import { ProfileAnalytics } from './collectors/ProfileAnalytics';
import { ProfileInsights } from './insights/ProfileInsights';
import { ConsentManager } from './privacy/ConsentManager';

class AnalyticsService {
  private profileAnalytics: ProfileAnalytics;
  private profileInsights: ProfileInsights;
  private consentManager: ConsentManager;

  constructor() {
    this.profileAnalytics = new ProfileAnalytics();
    this.profileInsights = new ProfileInsights();
    this.consentManager = new ConsentManager();
  }

  async collectEvent(event: AnalyticsEvent): Promise<boolean> {
    // Check consent before collection
    const hasConsent = await this.consentManager.hasConsent(
      event.userId, 
      'analytics'
    );
    
    if (!hasConsent) {
      return false;
    }

    return await this.profileAnalytics.collectEvent(event);
  }
}
```

### 3. Database Setup

#### Run Migrations
```bash
# Apply analytics database schema
psql -d chitlaq -f database/analytics/profile-metrics-views.sql
```

#### Initialize Sample Data
```sql
-- Insert sample consent record
INSERT INTO analytics_consent (id, user_id, consent_given, purposes, data_categories, retention_period, consent_version, granted_at)
VALUES (
  'consent_123',
  'user_123',
  true,
  ARRAY['analytics', 'personalization'],
  ARRAY['behavioral', 'technical'],
  365,
  '1.0',
  NOW()
);
```

## Configuration

### Environment Variables

```bash
# Analytics Service Configuration
ANALYTICS_SERVICE_PORT=3003
ANALYTICS_SERVICE_HOST=localhost

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/chitlaq
ANALYTICS_DB_POOL_SIZE=10
ANALYTICS_DB_TIMEOUT=30000

# Privacy Configuration
DEFAULT_RETENTION_DAYS=365
ANONYMIZATION_ENABLED=true
CONSENT_VERSION=1.0

# Performance Configuration
BATCH_SIZE=100
BATCH_TIMEOUT=5000
MAX_EVENTS_PER_REQUEST=1000

# Monitoring Configuration
METRICS_ENABLED=true
METRICS_PORT=9090
LOG_LEVEL=info
```

### Service Configuration

```typescript
// config/analytics.ts
export const analyticsConfig = {
  service: {
    port: process.env.ANALYTICS_SERVICE_PORT || 3003,
    host: process.env.ANALYTICS_SERVICE_HOST || 'localhost',
  },
  database: {
    url: process.env.DATABASE_URL,
    poolSize: parseInt(process.env.ANALYTICS_DB_POOL_SIZE || '10'),
    timeout: parseInt(process.env.ANALYTICS_DB_TIMEOUT || '30000'),
  },
  privacy: {
    defaultRetentionDays: parseInt(process.env.DEFAULT_RETENTION_DAYS || '365'),
    anonymizationEnabled: process.env.ANONYMIZATION_ENABLED === 'true',
    consentVersion: process.env.CONSENT_VERSION || '1.0',
  },
  performance: {
    batchSize: parseInt(process.env.BATCH_SIZE || '100'),
    batchTimeout: parseInt(process.env.BATCH_TIMEOUT || '5000'),
    maxEventsPerRequest: parseInt(process.env.MAX_EVENTS_PER_REQUEST || '1000'),
  },
  monitoring: {
    enabled: process.env.METRICS_ENABLED === 'true',
    port: parseInt(process.env.METRICS_PORT || '9090'),
    logLevel: process.env.LOG_LEVEL || 'info',
  },
};
```

## Monitoring & Maintenance

### Key Metrics to Monitor

1. **Event Collection Metrics**:
   - Events collected per minute
   - Collection success rate
   - Batch processing performance
   - Error rates by event type

2. **Insight Generation Metrics**:
   - Insights generated per user
   - Insight implementation rate
   - Recommendation effectiveness
   - User engagement with insights

3. **Privacy Compliance Metrics**:
   - Consent rates
   - Data subject requests processed
   - Data retention compliance
   - Anonymization effectiveness

4. **Performance Metrics**:
   - API response times
   - Database query performance
   - Memory usage
   - CPU utilization

### Monitoring Setup

#### Prometheus Metrics
```typescript
import { register, Counter, Histogram, Gauge } from 'prom-client';

// Event collection metrics
const eventsCollected = new Counter({
  name: 'analytics_events_collected_total',
  help: 'Total number of analytics events collected',
  labelNames: ['event_type', 'user_id', 'status']
});

const eventProcessingTime = new Histogram({
  name: 'analytics_event_processing_duration_seconds',
  help: 'Time spent processing analytics events',
  labelNames: ['event_type']
});

// Insight generation metrics
const insightsGenerated = new Counter({
  name: 'analytics_insights_generated_total',
  help: 'Total number of insights generated',
  labelNames: ['insight_type', 'priority']
});

const insightImplementationRate = new Gauge({
  name: 'analytics_insight_implementation_rate',
  help: 'Rate of insight implementation',
  labelNames: ['insight_type']
});
```

#### Health Checks
```typescript
import { HealthCheck } from './health-check';

const healthCheck = new HealthCheck();

// Database health check
healthCheck.addCheck('database', async () => {
  const result = await db.query('SELECT 1');
  return result.rows.length > 0;
});

// Analytics service health check
healthCheck.addCheck('analytics', async () => {
  const response = await fetch('http://localhost:3003/health');
  return response.ok;
});
```

### Maintenance Tasks

#### Daily Tasks
- Monitor event collection rates
- Check for failed event processing
- Review privacy compliance metrics
- Monitor database performance

#### Weekly Tasks
- Analyze insight effectiveness
- Review recommendation performance
- Check data retention compliance
- Update privacy policies if needed

#### Monthly Tasks
- Generate analytics reports
- Review and optimize database queries
- Update consent management
- Conduct privacy impact assessments

## Troubleshooting

### Common Issues

#### 1. Event Collection Failures

**Symptoms**: Events not being collected or processed
**Causes**: 
- Database connection issues
- Invalid event data
- Privacy consent not granted
- Service overload

**Solutions**:
```typescript
// Check database connection
const dbHealth = await db.query('SELECT 1');

// Validate event data
const validation = validateEvent(event);
if (!validation.valid) {
  console.error('Invalid event:', validation.errors);
}

// Check consent
const hasConsent = await consentManager.hasConsent(userId, 'analytics');
if (!hasConsent) {
  console.warn('No consent for analytics');
}
```

#### 2. Insight Generation Issues

**Symptoms**: No insights generated for users
**Causes**:
- Insufficient event data
- Configuration issues
- Algorithm errors
- Privacy restrictions

**Solutions**:
```typescript
// Check event data availability
const eventCount = await db.query(
  'SELECT COUNT(*) FROM analytics_events WHERE user_id = $1',
  [userId]
);

// Verify insight generation configuration
const config = await getInsightConfig();
console.log('Insight config:', config);

// Check privacy settings
const privacySettings = await getPrivacySettings(userId);
if (privacySettings.anonymized) {
  console.warn('User data is anonymized, limited insights available');
}
```

#### 3. Performance Issues

**Symptoms**: Slow response times, high memory usage
**Causes**:
- Large event volumes
- Inefficient database queries
- Memory leaks
- Resource constraints

**Solutions**:
```typescript
// Optimize database queries
const optimizedQuery = `
  SELECT user_id, COUNT(*) as event_count
  FROM analytics_events
  WHERE timestamp >= $1 AND timestamp <= $2
  GROUP BY user_id
  HAVING COUNT(*) > $3
`;

// Implement pagination
const paginatedEvents = await getEvents({
  userId,
  limit: 100,
  offset: page * 100
});

// Monitor memory usage
const memoryUsage = process.memoryUsage();
console.log('Memory usage:', memoryUsage);
```

### Debug Mode

Enable debug mode for detailed logging:

```typescript
// Enable debug logging
process.env.LOG_LEVEL = 'debug';

// Debug event collection
const debugEvent = {
  ...event,
  _debug: {
    timestamp: new Date().toISOString(),
    source: 'profile-component',
    version: '1.0.0'
  }
};

// Debug insight generation
const debugInsights = await profileInsights.generateInsights(userId, events, {
  debug: true,
  verbose: true
});
```

## Best Practices

### 1. Event Collection

- **Minimize Data**: Only collect necessary data
- **Validate Early**: Validate events before processing
- **Batch Processing**: Use batch processing for performance
- **Error Handling**: Implement robust error handling
- **Privacy First**: Always check consent before collection

### 2. Insight Generation

- **User-Centric**: Focus on user value and experience
- **Actionable**: Provide clear, actionable recommendations
- **Timely**: Generate insights when they're most relevant
- **Personalized**: Tailor insights to individual users
- **Measurable**: Track insight effectiveness

### 3. Privacy Compliance

- **Explicit Consent**: Always obtain explicit consent
- **Data Minimization**: Collect only what's necessary
- **Purpose Limitation**: Use data only for stated purposes
- **Retention Limits**: Implement automatic data retention
- **User Rights**: Support all user privacy rights

### 4. Performance Optimization

- **Database Indexing**: Properly index frequently queried columns
- **Query Optimization**: Optimize database queries
- **Caching**: Implement appropriate caching strategies
- **Batch Processing**: Use batch processing for bulk operations
- **Monitoring**: Continuously monitor performance metrics

### 5. Security

- **Data Encryption**: Encrypt sensitive data at rest and in transit
- **Access Controls**: Implement proper access controls
- **Audit Logging**: Log all data access and modifications
- **Regular Updates**: Keep dependencies and systems updated
- **Security Testing**: Regular security testing and assessments

### 6. Testing

- **Unit Tests**: Comprehensive unit test coverage
- **Integration Tests**: Test component interactions
- **Privacy Tests**: Test privacy compliance features
- **Performance Tests**: Load and stress testing
- **User Acceptance Tests**: Test with real users

## Conclusion

The Profile Analytics & Insights system provides a comprehensive, privacy-compliant solution for understanding user behavior and improving user experience. By following this guide and implementing the recommended best practices, you can ensure a robust, scalable, and compliant analytics system that provides valuable insights while respecting user privacy.

For additional support or questions, please refer to the troubleshooting section or contact the development team.
