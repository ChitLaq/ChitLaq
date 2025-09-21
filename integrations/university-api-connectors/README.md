# University API Connectors

This directory contains integration connectors for various university systems and APIs. These connectors enable seamless data synchronization between external university systems and the ChitLaq platform.

## Overview

The university API connectors provide:

- **Student Information System (SIS) Integration**: Sync student data, enrollment, and academic records
- **Learning Management System (LMS) Integration**: Connect with Canvas, Blackboard, Moodle, etc.
- **Calendar System Integration**: Sync academic calendars and events
- **Directory Services Integration**: Connect with LDAP/Active Directory
- **Library System Integration**: Sync library resources and services
- **Financial System Integration**: Connect with student billing and financial aid systems

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                University API Connectors                    │
├─────────────────────────────────────────────────────────────┤
│  SIS Connectors    │  LMS Connectors      │  Calendar      │
│  - Banner          │  - Canvas            │  - Google      │
│  - PeopleSoft      │  - Blackboard        │  - Outlook     │
│  - Colleague       │  - Moodle            │  - Exchange    │
│  - PowerSchool     │  - Sakai             │  - iCal        │
├─────────────────────────────────────────────────────────────┤
│  Directory         │  Library             │  Financial     │
│  - LDAP            │  - Alma              │  - Banner      │
│  - Active Directory│  - Koha              │  - PeopleSoft  │
│  - OpenLDAP        │  - Evergreen         │  - Colleague   │
│  - FreeIPA         │  - LibGuides         │  - PowerSchool │
├─────────────────────────────────────────────────────────────┤
│  Authentication    │  Data Sync           │  Monitoring    │
│  - OAuth 2.0       │  - Real-time         │  - Health      │
│  - SAML            │  - Batch             │  - Metrics     │
│  - JWT             │  - Incremental       │  - Alerts      │
│  - API Keys        │  - Full Sync         │  - Logging     │
└─────────────────────────────────────────────────────────────┘
```

## Connector Types

### 1. Student Information System (SIS) Connectors

#### Banner Connector
- **File**: `sis/banner-connector.ts`
- **Features**: Student enrollment, academic records, course catalog
- **Authentication**: OAuth 2.0, API Keys
- **Data Sync**: Real-time, batch, incremental

#### PeopleSoft Connector
- **File**: `sis/peoplesoft-connector.ts`
- **Features**: Student data, financial aid, course management
- **Authentication**: OAuth 2.0, SAML
- **Data Sync**: Real-time, batch

#### Colleague Connector
- **File**: `sis/colleague-connector.ts`
- **Features**: Student records, course scheduling, grades
- **Authentication**: API Keys, Basic Auth
- **Data Sync**: Batch, incremental

### 2. Learning Management System (LMS) Connectors

#### Canvas Connector
- **File**: `lms/canvas-connector.ts`
- **Features**: Course data, assignments, grades, discussions
- **Authentication**: OAuth 2.0, API Keys
- **Data Sync**: Real-time, batch

#### Blackboard Connector
- **File**: `lms/blackboard-connector.ts`
- **Features**: Course content, student progress, assessments
- **Authentication**: OAuth 2.0, SAML
- **Data Sync**: Real-time, batch

#### Moodle Connector
- **File**: `lms/moodle-connector.ts`
- **Features**: Course data, user management, activities
- **Authentication**: API Keys, Basic Auth
- **Data Sync**: Batch, incremental

### 3. Calendar System Connectors

#### Google Calendar Connector
- **File**: `calendar/google-calendar-connector.ts`
- **Features**: Academic calendar, events, scheduling
- **Authentication**: OAuth 2.0
- **Data Sync**: Real-time, batch

#### Microsoft Outlook Connector
- **File**: `calendar/outlook-connector.ts`
- **Features**: Exchange calendar, events, meetings
- **Authentication**: OAuth 2.0, Microsoft Graph
- **Data Sync**: Real-time, batch

### 4. Directory Services Connectors

#### LDAP Connector
- **File**: `directory/ldap-connector.ts`
- **Features**: User authentication, group membership, attributes
- **Authentication**: LDAP Bind
- **Data Sync**: Real-time, batch

#### Active Directory Connector
- **File**: `directory/active-directory-connector.ts`
- **Features**: User management, group policies, authentication
- **Authentication**: LDAP, Kerberos
- **Data Sync**: Real-time, batch

### 5. Library System Connectors

#### Alma Connector
- **File**: `library/alma-connector.ts`
- **Features**: Library resources, circulation, reserves
- **Authentication**: API Keys, OAuth 2.0
- **Data Sync**: Real-time, batch

#### Koha Connector
- **File**: `library/koha-connector.ts`
- **Features**: Catalog data, circulation, user management
- **Authentication**: API Keys
- **Data Sync**: Batch, incremental

### 6. Financial System Connectors

#### Banner Financial Connector
- **File**: `financial/banner-financial-connector.ts`
- **Features**: Student billing, financial aid, payments
- **Authentication**: OAuth 2.0, API Keys
- **Data Sync**: Real-time, batch

#### PeopleSoft Financial Connector
- **File**: `financial/peoplesoft-financial-connector.ts`
- **Features**: Financial aid, billing, payment processing
- **Authentication**: OAuth 2.0, SAML
- **Data Sync**: Real-time, batch

## Configuration

### Environment Variables

```bash
# SIS Configuration
SIS_BANNER_API_URL=https://banner.university.edu/api
SIS_BANNER_API_KEY=your_api_key
SIS_BANNER_OAUTH_CLIENT_ID=your_client_id
SIS_BANNER_OAUTH_CLIENT_SECRET=your_client_secret

# LMS Configuration
LMS_CANVAS_API_URL=https://university.instructure.com/api
LMS_CANVAS_API_KEY=your_api_key
LMS_CANVAS_OAUTH_CLIENT_ID=your_client_id
LMS_CANVAS_OAUTH_CLIENT_SECRET=your_client_secret

# Calendar Configuration
CALENDAR_GOOGLE_CLIENT_ID=your_client_id
CALENDAR_GOOGLE_CLIENT_SECRET=your_client_secret
CALENDAR_GOOGLE_REDIRECT_URI=https://your-app.com/auth/google/callback

# Directory Configuration
DIRECTORY_LDAP_URL=ldap://ldap.university.edu:389
DIRECTORY_LDAP_BASE_DN=dc=university,dc=edu
DIRECTORY_LDAP_BIND_DN=cn=admin,dc=university,dc=edu
DIRECTORY_LDAP_BIND_PASSWORD=your_password

# Library Configuration
LIBRARY_ALMA_API_URL=https://api-na.hosted.exlibrisgroup.com
LIBRARY_ALMA_API_KEY=your_api_key

# Financial Configuration
FINANCIAL_BANNER_API_URL=https://banner-financial.university.edu/api
FINANCIAL_BANNER_API_KEY=your_api_key
```

### Configuration Files

#### `config/connectors.json`
```json
{
  "sis": {
    "banner": {
      "enabled": true,
      "apiUrl": "https://banner.university.edu/api",
      "authType": "oauth2",
      "syncInterval": 300,
      "batchSize": 1000
    },
    "peoplesoft": {
      "enabled": false,
      "apiUrl": "https://peoplesoft.university.edu/api",
      "authType": "oauth2",
      "syncInterval": 600,
      "batchSize": 500
    }
  },
  "lms": {
    "canvas": {
      "enabled": true,
      "apiUrl": "https://university.instructure.com/api",
      "authType": "oauth2",
      "syncInterval": 300,
      "batchSize": 1000
    }
  },
  "calendar": {
    "google": {
      "enabled": true,
      "authType": "oauth2",
      "syncInterval": 60,
      "batchSize": 100
    }
  },
  "directory": {
    "ldap": {
      "enabled": true,
      "url": "ldap://ldap.university.edu:389",
      "baseDn": "dc=university,dc=edu",
      "syncInterval": 3600,
      "batchSize": 500
    }
  }
}
```

## Usage

### 1. Initialize Connectors

```typescript
import { ConnectorManager } from './connector-manager';
import { BannerConnector } from './sis/banner-connector';
import { CanvasConnector } from './lms/canvas-connector';
import { GoogleCalendarConnector } from './calendar/google-calendar-connector';

const connectorManager = new ConnectorManager();

// Register connectors
connectorManager.registerConnector('sis', 'banner', new BannerConnector());
connectorManager.registerConnector('lms', 'canvas', new CanvasConnector());
connectorManager.registerConnector('calendar', 'google', new GoogleCalendarConnector());

// Initialize all connectors
await connectorManager.initializeAll();
```

### 2. Sync Data

```typescript
// Sync student data from Banner
const bannerConnector = connectorManager.getConnector('sis', 'banner');
await bannerConnector.syncStudents();

// Sync course data from Canvas
const canvasConnector = connectorManager.getConnector('lms', 'canvas');
await canvasConnector.syncCourses();

// Sync calendar events from Google Calendar
const googleCalendarConnector = connectorManager.getConnector('calendar', 'google');
await googleCalendarConnector.syncEvents();
```

### 3. Real-time Updates

```typescript
// Set up real-time listeners
bannerConnector.on('studentUpdated', (student) => {
  console.log('Student updated:', student);
});

canvasConnector.on('courseUpdated', (course) => {
  console.log('Course updated:', course);
});

googleCalendarConnector.on('eventCreated', (event) => {
  console.log('Event created:', event);
});
```

## Data Mapping

### Student Data Mapping

```typescript
interface StudentDataMapping {
  // Banner to ChitLaq
  banner: {
    id: 'student_id';
    firstName: 'first_name';
    lastName: 'last_name';
    email: 'email_address';
    studentId: 'student_id';
    academicYear: 'academic_year';
    major: 'major_code';
    gpa: 'gpa';
    enrollmentStatus: 'enrollment_status';
  };
  
  // PeopleSoft to ChitLaq
  peoplesoft: {
    id: 'emplid';
    firstName: 'first_name';
    lastName: 'last_name';
    email: 'email_address';
    studentId: 'emplid';
    academicYear: 'academic_year';
    major: 'academic_program';
    gpa: 'gpa';
    enrollmentStatus: 'enrollment_status';
  };
}
```

### Course Data Mapping

```typescript
interface CourseDataMapping {
  // Canvas to ChitLaq
  canvas: {
    id: 'id';
    name: 'name';
    code: 'course_code';
    description: 'description';
    startDate: 'start_at';
    endDate: 'end_at';
    instructor: 'teacher';
    credits: 'credits';
    department: 'department';
  };
  
  // Blackboard to ChitLaq
  blackboard: {
    id: 'id';
    name: 'name';
    code: 'courseId';
    description: 'description';
    startDate: 'startDate';
    endDate: 'endDate';
    instructor: 'instructor';
    credits: 'credits';
    department: 'department';
  };
}
```

## Error Handling

### Retry Logic

```typescript
interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  backoffMultiplier: number;
  maxRetryDelay: number;
}

const retryConfig: RetryConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  backoffMultiplier: 2,
  maxRetryDelay: 10000
};
```

### Error Types

```typescript
enum ConnectorErrorType {
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  API_RATE_LIMIT = 'API_RATE_LIMIT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  DATA_VALIDATION_ERROR = 'DATA_VALIDATION_ERROR',
  SYNC_FAILED = 'SYNC_FAILED',
  CONNECTION_TIMEOUT = 'CONNECTION_TIMEOUT'
}
```

## Monitoring and Logging

### Health Checks

```typescript
interface ConnectorHealth {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  lastSync: Date;
  errorCount: number;
  responseTime: number;
  uptime: number;
}
```

### Metrics

```typescript
interface ConnectorMetrics {
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  averageResponseTime: number;
  dataVolume: number;
  errorRate: number;
}
```

## Testing

### Unit Tests

```typescript
describe('Banner Connector', () => {
  let bannerConnector: BannerConnector;
  
  beforeEach(() => {
    bannerConnector = new BannerConnector();
  });
  
  it('should authenticate successfully', async () => {
    const result = await bannerConnector.authenticate();
    expect(result).toBe(true);
  });
  
  it('should sync student data', async () => {
    const students = await bannerConnector.syncStudents();
    expect(students).toHaveLength(10);
  });
});
```

### Integration Tests

```typescript
describe('Connector Integration', () => {
  it('should sync data from multiple sources', async () => {
    const connectorManager = new ConnectorManager();
    await connectorManager.initializeAll();
    
    const results = await connectorManager.syncAll();
    expect(results.every(r => r.success)).toBe(true);
  });
});
```

## Deployment

### Docker Configuration

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: university-connectors
spec:
  replicas: 3
  selector:
    matchLabels:
      app: university-connectors
  template:
    metadata:
      labels:
        app: university-connectors
    spec:
      containers:
      - name: connectors
        image: chitlaq/university-connectors:latest
        ports:
        - containerPort: 3000
        env:
        - name: SIS_BANNER_API_URL
          valueFrom:
            secretKeyRef:
              name: connector-secrets
              key: banner-api-url
        - name: SIS_BANNER_API_KEY
          valueFrom:
            secretKeyRef:
              name: connector-secrets
              key: banner-api-key
```

## Security

### Authentication

- Use OAuth 2.0 for modern APIs
- Implement API key rotation
- Use secure credential storage
- Enable two-factor authentication where possible

### Data Protection

- Encrypt data in transit (TLS)
- Encrypt sensitive data at rest
- Implement data masking for logs
- Use secure communication protocols

### Access Control

- Implement role-based access control
- Use least privilege principle
- Monitor access patterns
- Implement audit logging

## Troubleshooting

### Common Issues

1. **Authentication Failures**
   - Check API credentials
   - Verify OAuth configuration
   - Check token expiration

2. **Sync Failures**
   - Check network connectivity
   - Verify API endpoints
   - Check data format compatibility

3. **Performance Issues**
   - Optimize batch sizes
   - Implement caching
   - Use connection pooling

### Debug Mode

Enable debug mode for detailed logging:

```bash
DEBUG=connectors:* npm start
```

### Log Analysis

```bash
# View connector logs
kubectl logs -f deployment/university-connectors

# Filter error logs
kubectl logs deployment/university-connectors | grep ERROR

# Monitor sync performance
kubectl logs deployment/university-connectors | grep "sync completed"
```

## Contributing

### Adding New Connectors

1. Create a new connector class extending `BaseConnector`
2. Implement required methods
3. Add configuration options
4. Write unit tests
5. Update documentation

### Code Style

- Use TypeScript for type safety
- Follow ESLint configuration
- Write comprehensive tests
- Document all public methods

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:

- Create an issue in the repository
- Contact the development team
- Check the documentation
- Review the troubleshooting guide
