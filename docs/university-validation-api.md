# University Email Validation API Documentation

## Overview

The University Email Validation API provides comprehensive email validation for university students, faculty, and staff. It ensures that only legitimate university email addresses are accepted for registration, with advanced fraud detection and security measures.

## Base URL

```
https://api.chitlaq.com/validate
```

## Authentication

All API endpoints require authentication via API key or JWT token.

```bash
Authorization: Bearer <your-jwt-token>
# OR
X-API-Key: <your-api-key>
```

## Endpoints

### 1. Validate Email

Validates if an email belongs to an approved university and matches prefix rules.

**Endpoint:** `POST /validate/email`

**Request Body:**
```json
{
  "email": "john.doe@mit.edu"
}
```

**Response (Success):**
```json
{
  "isValid": true,
  "university": {
    "id": "uuid",
    "name": "Massachusetts Institute of Technology",
    "domain": "mit.edu",
    "country": "US",
    "type": "private",
    "status": "active",
    "prefixes": ["cs_*", "eng_*", "med_*"],
    "departments": ["Computer Science", "Engineering", "Medicine"],
    "faculties": ["School of Engineering", "School of Science"],
    "academic_year_format": "YYYY",
    "email_format": "firstname.lastname@mit.edu",
    "verification_required": true,
    "max_students": 12000,
    "current_students": 0,
    "established_year": 1861,
    "website": "https://web.mit.edu",
    "contact_email": "admissions@mit.edu",
    "phone": "+1-617-253-1000",
    "address": "77 Massachusetts Ave",
    "city": "Cambridge",
    "state": "MA",
    "postal_code": "02139",
    "timezone": "America/New_York",
    "language": "en",
    "accreditation": ["NEASC", "ABET"],
    "partnerships": [],
    "features": {
      "allowFaculty": true,
      "allowStaff": true,
      "allowAlumni": false,
      "requirePrefix": true,
      "requireAcademicYear": false,
      "allowMultipleEmails": false,
      "enableGeographicValidation": true,
      "enableFraudDetection": true
    },
    "metadata": {
      "lastVerified": "2024-01-01T00:00:00Z",
      "verificationSource": "official",
      "notes": "Top-tier private research university",
      "tags": ["research", "engineering", "technology"],
      "priority": 1
    },
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

**Response (Error):**
```json
{
  "isValid": false,
  "reason": "Email domain not associated with an approved university."
}
```

**Error Codes:**
- `400` - Bad Request (invalid email format, missing email)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

### 2. Batch Email Validation

Validates multiple emails in a single request.

**Endpoint:** `POST /validate/batch`

**Request Body:**
```json
{
  "emails": [
    "john.doe@mit.edu",
    "jane.smith@stanford.edu",
    "invalid@fakeuniversity.edu"
  ]
}
```

**Response:**
```json
{
  "results": [
    {
      "email": "john.doe@mit.edu",
      "isValid": true,
      "university": {
        "name": "Massachusetts Institute of Technology",
        "domain": "mit.edu"
      }
    },
    {
      "email": "jane.smith@stanford.edu",
      "isValid": true,
      "university": {
        "name": "Stanford University",
        "domain": "stanford.edu"
      }
    },
    {
      "email": "invalid@fakeuniversity.edu",
      "isValid": false,
      "reason": "Email domain not associated with an approved university."
    }
  ],
  "summary": {
    "total": 3,
    "valid": 2,
    "invalid": 1
  }
}
```

### 3. Get University Information

Retrieves detailed information about a specific university.

**Endpoint:** `GET /universities/{university_id}`

**Response:**
```json
{
  "id": "uuid",
  "name": "Massachusetts Institute of Technology",
  "domain": "mit.edu",
  "country": "US",
  "type": "private",
  "status": "active",
  "prefixes": ["cs_*", "eng_*", "med_*"],
  "departments": ["Computer Science", "Engineering", "Medicine"],
  "faculties": ["School of Engineering", "School of Science"],
  "academic_year_format": "YYYY",
  "email_format": "firstname.lastname@mit.edu",
  "verification_required": true,
  "max_students": 12000,
  "current_students": 0,
  "established_year": 1861,
  "website": "https://web.mit.edu",
  "contact_email": "admissions@mit.edu",
  "phone": "+1-617-253-1000",
  "address": "77 Massachusetts Ave",
  "city": "Cambridge",
  "state": "MA",
  "postal_code": "02139",
  "timezone": "America/New_York",
  "language": "en",
  "accreditation": ["NEASC", "ABET"],
  "partnerships": [],
  "features": {
    "allowFaculty": true,
    "allowStaff": true,
    "allowAlumni": false,
    "requirePrefix": true,
    "requireAcademicYear": false,
    "allowMultipleEmails": false,
    "enableGeographicValidation": true,
    "enableFraudDetection": true
  },
  "metadata": {
    "lastVerified": "2024-01-01T00:00:00Z",
    "verificationSource": "official",
    "notes": "Top-tier private research university",
    "tags": ["research", "engineering", "technology"],
    "priority": 1
  },
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

### 4. List Universities

Retrieves a list of all approved universities with optional filtering.

**Endpoint:** `GET /universities`

**Query Parameters:**
- `country` (optional) - Filter by country code (e.g., "US", "GB", "CA")
- `type` (optional) - Filter by university type ("public", "private", "community")
- `status` (optional) - Filter by status ("active", "inactive", "pending")
- `search` (optional) - Search by name or domain
- `limit` (optional) - Number of results per page (default: 50, max: 100)
- `offset` (optional) - Number of results to skip (default: 0)

**Example Request:**
```
GET /universities?country=US&type=private&status=active&limit=20
```

**Response:**
```json
{
  "universities": [
    {
      "id": "uuid",
      "name": "Massachusetts Institute of Technology",
      "domain": "mit.edu",
      "country": "US",
      "type": "private",
      "status": "active",
      "current_students": 0,
      "established_year": 1861,
      "website": "https://web.mit.edu",
      "contact_email": "admissions@mit.edu",
      "phone": "+1-617-253-1000",
      "address": "77 Massachusetts Ave",
      "city": "Cambridge",
      "state": "MA",
      "postal_code": "02139",
      "timezone": "America/New_York",
      "language": "en",
      "accreditation": ["NEASC", "ABET"],
      "partnerships": [],
      "features": {
        "allowFaculty": true,
        "allowStaff": true,
        "allowAlumni": false,
        "requirePrefix": true,
        "requireAcademicYear": false,
        "allowMultipleEmails": false,
        "enableGeographicValidation": true,
        "enableFraudDetection": true
      },
      "metadata": {
        "lastVerified": "2024-01-01T00:00:00Z",
        "verificationSource": "official",
        "notes": "Top-tier private research university",
        "tags": ["research", "engineering", "technology"],
        "priority": 1
      },
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "total": 1,
    "limit": 20,
    "offset": 0,
    "has_more": false
  }
}
```

### 5. Get Fraud Statistics

Retrieves fraud statistics for an IP address or email.

**Endpoint:** `GET /fraud/stats`

**Query Parameters:**
- `ip` (optional) - IP address to get statistics for
- `email` (optional) - Email address to get statistics for

**Response:**
```json
{
  "ip_address": "192.168.1.1",
  "email": "test@example.com",
  "total_attempts": 5,
  "blocked_attempts": 2,
  "risk_score": 75,
  "last_attempt": "2024-01-01T12:00:00Z",
  "is_blocked": true,
  "block_reason": "High risk score and multiple failed attempts"
}
```

### 6. Unblock Entry

Removes an IP address or email from the blocklist.

**Endpoint:** `DELETE /blocklist/{identifier}`

**Path Parameters:**
- `identifier` - IP address or email to unblock

**Response:**
```json
{
  "success": true,
  "message": "Entry successfully unblocked"
}
```

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Email Validation:** 10 requests per minute per IP address
- **Batch Validation:** 5 requests per minute per IP address
- **University Information:** 100 requests per minute per IP address
- **Fraud Statistics:** 20 requests per minute per IP address

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9
X-RateLimit-Reset: 1640995200
```

## Error Handling

All errors follow a consistent format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional error details"
  }
}
```

**Common Error Codes:**
- `INVALID_EMAIL_FORMAT` - Email format is invalid
- `DOMAIN_NOT_APPROVED` - Email domain is not in approved list
- `PREFIX_VALIDATION_FAILED` - Email prefix doesn't match required patterns
- `DISPOSABLE_EMAIL` - Disposable email addresses are not allowed
- `RATE_LIMIT_EXCEEDED` - Too many requests from this IP
- `FRAUD_DETECTED` - Suspicious activity detected
- `UNIVERSITY_NOT_FOUND` - University not found
- `INTERNAL_ERROR` - Internal server error

## Security Features

### Fraud Detection

The API includes advanced fraud detection:

1. **Pattern Analysis:** Detects suspicious email patterns
2. **IP Monitoring:** Tracks fraud attempts by IP address
3. **Email Monitoring:** Tracks fraud attempts by email address
4. **Risk Scoring:** Calculates risk scores based on multiple factors
5. **Automatic Blocking:** Blocks high-risk IPs and emails

### Security Headers

All responses include security headers:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'
```

### Input Validation

- Email format validation
- Domain whitelist checking
- Prefix pattern matching
- Disposable email detection
- SQL injection prevention
- XSS protection

## Usage Examples

### JavaScript/Node.js

```javascript
const axios = require('axios');

async function validateEmail(email) {
  try {
    const response = await axios.post('https://api.chitlaq.com/validate/email', {
      email: email
    }, {
      headers: {
        'Authorization': 'Bearer your-jwt-token',
        'Content-Type': 'application/json'
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Validation error:', error.response.data);
    throw error;
  }
}

// Usage
validateEmail('john.doe@mit.edu')
  .then(result => {
    if (result.isValid) {
      console.log('Valid university email:', result.university.name);
    } else {
      console.log('Invalid email:', result.reason);
    }
  })
  .catch(error => {
    console.error('Error:', error.message);
  });
```

### Python

```python
import requests

def validate_email(email):
    url = 'https://api.chitlaq.com/validate/email'
    headers = {
        'Authorization': 'Bearer your-jwt-token',
        'Content-Type': 'application/json'
    }
    data = {'email': email}
    
    try:
        response = requests.post(url, json=data, headers=headers)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f'Validation error: {e}')
        raise

# Usage
try:
    result = validate_email('john.doe@mit.edu')
    if result['isValid']:
        print(f'Valid university email: {result["university"]["name"]}')
    else:
        print(f'Invalid email: {result["reason"]}')
except Exception as e:
    print(f'Error: {e}')
```

### cURL

```bash
# Validate single email
curl -X POST https://api.chitlaq.com/validate/email \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{"email": "john.doe@mit.edu"}'

# Batch validation
curl -X POST https://api.chitlaq.com/validate/batch \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{"emails": ["john.doe@mit.edu", "jane.smith@stanford.edu"]}'

# Get university information
curl -X GET https://api.chitlaq.com/universities/uuid \
  -H "Authorization: Bearer your-jwt-token"

# List universities
curl -X GET "https://api.chitlaq.com/universities?country=US&type=private" \
  -H "Authorization: Bearer your-jwt-token"
```

## Webhooks

The API supports webhooks for real-time notifications:

### Fraud Detection Webhook

**Endpoint:** `POST /webhooks/fraud-detection`

**Payload:**
```json
{
  "event": "fraud_detected",
  "timestamp": "2024-01-01T12:00:00Z",
  "data": {
    "email": "test@example.com",
    "ip_address": "192.168.1.1",
    "reason": "High risk score",
    "risk_score": 85,
    "action": "blocked"
  }
}
```

### University Status Change Webhook

**Endpoint:** `POST /webhooks/university-status`

**Payload:**
```json
{
  "event": "university_status_changed",
  "timestamp": "2024-01-01T12:00:00Z",
  "data": {
    "university_id": "uuid",
    "name": "University Name",
    "domain": "university.edu",
    "old_status": "active",
    "new_status": "inactive",
    "reason": "Administrative decision"
  }
}
```

## Monitoring and Analytics

The API provides comprehensive monitoring:

### Metrics

- Request count and response times
- Validation success/failure rates
- Fraud detection statistics
- Rate limit violations
- Error rates by endpoint

### Logs

- All validation attempts
- Fraud detection events
- Security incidents
- Performance metrics
- Error details

### Alerts

- High fraud detection rates
- Unusual traffic patterns
- System errors
- Performance degradation
- Security incidents

## Support

For technical support or questions:

- **Email:** support@chitlaq.com
- **Documentation:** https://docs.chitlaq.com
- **Status Page:** https://status.chitlaq.com
- **GitHub Issues:** https://github.com/chitlaq/api/issues

## Changelog

### Version 1.0.0 (2024-01-01)
- Initial release
- Email validation
- Fraud detection
- University management
- Rate limiting
- Security features
