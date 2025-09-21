# Profile Management API Documentation

## Overview

The Profile Management API provides comprehensive endpoints for managing user profiles, including CRUD operations, privacy controls, university integration, and profile completion tracking. This API is designed to handle university-specific features and ensure data privacy and security.

## Base URL

```
https://api.chitlaq.com/v1/profiles
```

## Authentication

All endpoints require authentication using a valid JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

## Rate Limiting

- **Standard endpoints**: 100 requests per minute per user
- **Search endpoints**: 50 requests per minute per user
- **University sync**: 10 requests per minute per user

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

## Endpoints

### 1. Create Profile

Creates a new user profile with university email validation.

**Endpoint**: `POST /profiles`

**Request Body**:
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "username": "johndoe",
  "universityEmail": "john.doe@university.edu",
  "major": "Computer Science",
  "academicYear": 2024,
  "department": "Computer Science Department",
  "faculty": "Engineering",
  "bio": "Passionate about technology and innovation",
  "profilePicture": "https://example.com/profile.jpg",
  "socialLinks": {
    "linkedin": "https://linkedin.com/in/johndoe",
    "github": "https://github.com/johndoe"
  },
  "privacySettings": {
    "profileVisibility": "university",
    "showEmail": false,
    "showPhone": false,
    "showAcademicInfo": true,
    "showSocialLinks": false
  }
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "userId": "user-123",
    "firstName": "John",
    "lastName": "Doe",
    "username": "johndoe",
    "universityEmail": "john.doe@university.edu",
    "major": "Computer Science",
    "academicYear": 2024,
    "department": "Computer Science Department",
    "faculty": "Engineering",
    "bio": "Passionate about technology and innovation",
    "profilePicture": "https://example.com/profile.jpg",
    "socialLinks": {
      "linkedin": "https://linkedin.com/in/johndoe",
      "github": "https://github.com/johndoe"
    },
    "privacySettings": {
      "profileVisibility": "university",
      "showEmail": false,
      "showPhone": false,
      "showAcademicInfo": true,
      "showSocialLinks": false
    },
    "profileCompletionScore": 75,
    "isUniversityVerified": true,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  },
  "message": "Profile created successfully"
}
```

**Validation Errors** (400 Bad Request):
```json
{
  "success": false,
  "error": "Validation failed: First name is required",
  "code": "VALIDATION_ERROR",
  "details": {
    "field": "firstName",
    "message": "First name is required"
  }
}
```

### 2. Get Profile

Retrieves a user profile by user ID.

**Endpoint**: `GET /profiles/{userId}`

**Parameters**:
- `userId` (path): The user ID

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "userId": "user-123",
    "firstName": "John",
    "lastName": "Doe",
    "username": "johndoe",
    "universityEmail": "john.doe@university.edu",
    "major": "Computer Science",
    "academicYear": 2024,
    "department": "Computer Science Department",
    "faculty": "Engineering",
    "bio": "Passionate about technology and innovation",
    "profilePicture": "https://example.com/profile.jpg",
    "socialLinks": {
      "linkedin": "https://linkedin.com/in/johndoe",
      "github": "https://github.com/johndoe"
    },
    "privacySettings": {
      "profileVisibility": "university",
      "showEmail": false,
      "showPhone": false,
      "showAcademicInfo": true,
      "showSocialLinks": false
    },
    "profileCompletionScore": 75,
    "isUniversityVerified": true,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

**Profile Not Found** (404 Not Found):
```json
{
  "success": false,
  "error": "Profile not found",
  "code": "PROFILE_NOT_FOUND"
}
```

### 3. Update Profile

Updates an existing user profile.

**Endpoint**: `PUT /profiles/{userId}`

**Parameters**:
- `userId` (path): The user ID

**Request Body**:
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "major": "Data Science",
  "academicYear": 2025,
  "bio": "Updated bio content",
  "profilePicture": "https://example.com/new-profile.jpg"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "userId": "user-123",
    "firstName": "Jane",
    "lastName": "Smith",
    "username": "johndoe",
    "universityEmail": "john.doe@university.edu",
    "major": "Data Science",
    "academicYear": 2025,
    "bio": "Updated bio content",
    "profilePicture": "https://example.com/new-profile.jpg",
    "profileCompletionScore": 85,
    "isUniversityVerified": true,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T12:00:00Z"
  },
  "message": "Profile updated successfully"
}
```

**Unauthorized Access** (403 Forbidden):
```json
{
  "success": false,
  "error": "Unauthorized access",
  "code": "UNAUTHORIZED"
}
```

### 4. Delete Profile

Deletes a user profile.

**Endpoint**: `DELETE /profiles/{userId}`

**Parameters**:
- `userId` (path): The user ID

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Profile deleted successfully"
}
```

**Profile Not Found** (404 Not Found):
```json
{
  "success": false,
  "error": "Profile not found",
  "code": "PROFILE_NOT_FOUND"
}
```

### 5. Get Profile by Username

Retrieves a user profile by username.

**Endpoint**: `GET /profiles/username/{username}`

**Parameters**:
- `username` (path): The username

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "userId": "user-123",
    "firstName": "John",
    "lastName": "Doe",
    "username": "johndoe",
    "major": "Computer Science",
    "academicYear": 2024,
    "bio": "Passionate about technology and innovation",
    "profilePicture": "https://example.com/profile.jpg",
    "socialLinks": {
      "linkedin": "https://linkedin.com/in/johndoe",
      "github": "https://github.com/johndoe"
    },
    "profileCompletionScore": 75,
    "isUniversityVerified": true,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

**Username Not Found** (404 Not Found):
```json
{
  "success": false,
  "error": "Username not found",
  "code": "USERNAME_NOT_FOUND"
}
```

### 6. Search Profiles

Searches for user profiles based on various criteria.

**Endpoint**: `GET /profiles/search`

**Query Parameters**:
- `query` (optional): Search query for name, username, or bio
- `university` (optional): Filter by university name
- `major` (optional): Filter by major
- `academicYear` (optional): Filter by academic year
- `department` (optional): Filter by department
- `faculty` (optional): Filter by faculty
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 10, max: 50)

**Example Request**:
```
GET /profiles/search?query=computer science&university=University of Technology&major=Computer Science&page=1&limit=10
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "profiles": [
      {
        "userId": "user-123",
        "firstName": "John",
        "lastName": "Doe",
        "username": "johndoe",
        "major": "Computer Science",
        "academicYear": 2024,
        "universityName": "University of Technology",
        "profilePicture": "https://example.com/profile.jpg",
        "profileCompletionScore": 75,
        "isUniversityVerified": true
      },
      {
        "userId": "user-456",
        "firstName": "Jane",
        "lastName": "Smith",
        "username": "janesmith",
        "major": "Computer Science",
        "academicYear": 2025,
        "universityName": "University of Technology",
        "profilePicture": "https://example.com/profile2.jpg",
        "profileCompletionScore": 80,
        "isUniversityVerified": true
      }
    ],
    "total": 2,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

### 7. Get Profile Completion Score

Retrieves the profile completion score and suggestions.

**Endpoint**: `GET /profiles/{userId}/completion`

**Parameters**:
- `userId` (path): The user ID

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "score": 75,
    "missingFields": ["profilePicture", "bio"],
    "suggestions": [
      "Add a profile picture to increase your profile completion score",
      "Write a bio to tell others about yourself"
    ]
  }
}
```

### 8. Update Privacy Settings

Updates the privacy settings for a user profile.

**Endpoint**: `PUT /profiles/{userId}/privacy`

**Parameters**:
- `userId` (path): The user ID

**Request Body**:
```json
{
  "profileVisibility": "university",
  "showEmail": false,
  "showPhone": false,
  "showAcademicInfo": true,
  "showSocialLinks": false
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "profileVisibility": "university",
    "showEmail": false,
    "showPhone": false,
    "showAcademicInfo": true,
    "showSocialLinks": false
  },
  "message": "Privacy settings updated successfully"
}
```

### 9. Get Privacy Settings

Retrieves the privacy settings for a user profile.

**Endpoint**: `GET /profiles/{userId}/privacy`

**Parameters**:
- `userId` (path): The user ID

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "profileVisibility": "university",
    "showEmail": false,
    "showPhone": false,
    "showAcademicInfo": true,
    "showSocialLinks": false
  }
}
```

### 10. Get Public Profiles

Retrieves public profiles based on various criteria.

**Endpoint**: `GET /profiles/public`

**Query Parameters**:
- `university` (optional): Filter by university name
- `major` (optional): Filter by major
- `academicYear` (optional): Filter by academic year
- `department` (optional): Filter by department
- `faculty` (optional): Filter by faculty
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 10, max: 50)

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "profiles": [
      {
        "userId": "user-123",
        "firstName": "John",
        "lastName": "Doe",
        "username": "johndoe",
        "major": "Computer Science",
        "academicYear": 2024,
        "universityName": "University of Technology",
        "profilePicture": "https://example.com/profile.jpg",
        "profileCompletionScore": 75,
        "isUniversityVerified": true
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

### 11. Get Profile Statistics

Retrieves profile statistics for a user.

**Endpoint**: `GET /profiles/{userId}/statistics`

**Parameters**:
- `userId` (path): The user ID

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "totalProfiles": 1000,
    "verifiedProfiles": 800,
    "averageCompletionScore": 75,
    "topMajors": [
      { "major": "Computer Science", "count": 200 },
      { "major": "Data Science", "count": 150 }
    ],
    "universityDistribution": [
      { "university": "University of Technology", "count": 300 },
      { "university": "State University", "count": 250 }
    ]
  }
}
```

### 12. Sync with University

Synchronizes a user profile with university data.

**Endpoint**: `POST /profiles/{userId}/sync-university`

**Parameters**:
- `userId` (path): The user ID

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "success": true,
    "universityId": "university-123",
    "universityName": "University of Technology",
    "universityDomain": "university.edu",
    "universityPrefix": "john.doe",
    "changes": ["University name updated"],
    "errors": []
  },
  "message": "Profile synchronized with university successfully"
}
```

**Sync Errors** (400 Bad Request):
```json
{
  "success": false,
  "error": "University not found for the provided email domain",
  "code": "UNIVERSITY_NOT_FOUND"
}
```

### 13. Validate University Email

Validates a university email address.

**Endpoint**: `POST /profiles/validate-email`

**Request Body**:
```json
{
  "email": "john.doe@university.edu"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "isValid": true,
    "universityId": "university-123",
    "universityName": "University of Technology",
    "universityDomain": "university.edu",
    "universityPrefix": "john.doe",
    "errors": [],
    "warnings": []
  }
}
```

**Validation Errors** (400 Bad Request):
```json
{
  "success": false,
  "error": "University not found for the provided email domain",
  "code": "UNIVERSITY_NOT_FOUND"
}
```

### 14. Get Universities

Retrieves a list of universities.

**Endpoint**: `GET /profiles/universities`

**Query Parameters**:
- `search` (optional): Search query for university name or domain
- `country` (optional): Filter by country

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "university-123",
      "name": "University of Technology",
      "domain": "university.edu",
      "country": "United States",
      "status": "active",
      "approved": true,
      "allowStudentNetworking": true,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    },
    {
      "id": "university-456",
      "name": "State University",
      "domain": "state.edu",
      "country": "United States",
      "status": "active",
      "approved": true,
      "allowStudentNetworking": true,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### 15. Get University Statistics

Retrieves statistics for a specific university.

**Endpoint**: `GET /profiles/universities/{universityId}/statistics`

**Parameters**:
- `universityId` (path): The university ID

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "totalStudents": 1000,
    "activeStudents": 800,
    "verifiedStudents": 750,
    "averageCompletionScore": 75,
    "topMajors": [
      { "major": "Computer Science", "count": 200 },
      { "major": "Data Science", "count": 150 }
    ],
    "academicYearDistribution": [
      { "year": 2024, "count": 300 },
      { "year": 2025, "count": 250 }
    ]
  }
}
```

**University Not Found** (404 Not Found):
```json
{
  "success": false,
  "error": "University not found",
  "code": "UNIVERSITY_NOT_FOUND"
}
```

## Data Models

### UserProfile

```typescript
interface UserProfile {
  userId: string;
  firstName: string;
  lastName: string;
  username: string;
  universityEmail: string;
  major?: string;
  academicYear?: number;
  department?: string;
  faculty?: string;
  bio?: string;
  profilePicture?: string;
  socialLinks?: {
    linkedin?: string;
    github?: string;
    twitter?: string;
    website?: string;
  };
  privacySettings: {
    profileVisibility: 'public' | 'university' | 'private';
    showEmail: boolean;
    showPhone: boolean;
    showAcademicInfo: boolean;
    showSocialLinks: boolean;
  };
  profileCompletionScore: number;
  isUniversityVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### UniversityProfile

```typescript
interface UniversityProfile {
  id: string;
  name: string;
  domain: string;
  country: string;
  status: 'active' | 'inactive' | 'suspended';
  approved: boolean;
  allowStudentNetworking: boolean;
  programs?: string[];
  departments?: string[];
  faculties?: string[];
  academicCalendar?: {
    startMonth: number;
    endMonth: number;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

## Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Request validation failed |
| `PROFILE_NOT_FOUND` | Profile not found |
| `USERNAME_NOT_FOUND` | Username not found |
| `UNAUTHORIZED` | Unauthorized access |
| `UNIVERSITY_NOT_FOUND` | University not found |
| `UNIVERSITY_NOT_APPROVED` | University not approved |
| `UNIVERSITY_NOT_ACTIVE` | University not active |
| `UNIVERSITY_NETWORKING_DISABLED` | University does not allow student networking |
| `EMAIL_VALIDATION_FAILED` | University email validation failed |
| `PRIVACY_VIOLATION` | Privacy settings violation |
| `RATE_LIMIT_EXCEEDED` | Rate limit exceeded |
| `INTERNAL_SERVER_ERROR` | Internal server error |

## Rate Limiting

The API implements rate limiting to ensure fair usage and prevent abuse:

- **Standard endpoints**: 100 requests per minute per user
- **Search endpoints**: 50 requests per minute per user
- **University sync**: 10 requests per minute per user

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Pagination

List endpoints support pagination with the following parameters:

- `page`: Page number (1-based, default: 1)
- `limit`: Results per page (default: 10, max: 50)

Pagination metadata is included in responses:

```json
{
  "data": [...],
  "total": 100,
  "page": 1,
  "limit": 10,
  "totalPages": 10
}
```

## Privacy and Security

The API implements comprehensive privacy and security measures:

1. **Authentication**: All endpoints require valid JWT tokens
2. **Authorization**: Users can only access their own profiles unless explicitly allowed
3. **Privacy Controls**: Granular privacy settings for different profile fields
4. **Data Validation**: Comprehensive validation of all input data
5. **Rate Limiting**: Protection against abuse and excessive requests
6. **Audit Logging**: All profile changes are logged for security and compliance

## Examples

### Complete Profile Creation Flow

```bash
# 1. Validate university email
curl -X POST https://api.chitlaq.com/v1/profiles/validate-email \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"email": "john.doe@university.edu"}'

# 2. Create profile
curl -X POST https://api.chitlaq.com/v1/profiles \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "username": "johndoe",
    "universityEmail": "john.doe@university.edu",
    "major": "Computer Science",
    "academicYear": 2024
  }'

# 3. Sync with university
curl -X POST https://api.chitlaq.com/v1/profiles/user-123/sync-university \
  -H "Authorization: Bearer <token>"
```

### Profile Search and Discovery

```bash
# Search for Computer Science students
curl -X GET "https://api.chitlaq.com/v1/profiles/search?major=Computer Science&university=University of Technology" \
  -H "Authorization: Bearer <token>"

# Get public profiles from a specific university
curl -X GET "https://api.chitlaq.com/v1/profiles/public?university=University of Technology&page=1&limit=20" \
  -H "Authorization: Bearer <token>"
```

### Privacy Management

```bash
# Update privacy settings
curl -X PUT https://api.chitlaq.com/v1/profiles/user-123/privacy \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "profileVisibility": "university",
    "showEmail": false,
    "showAcademicInfo": true
  }'

# Get privacy settings
curl -X GET https://api.chitlaq.com/v1/profiles/user-123/privacy \
  -H "Authorization: Bearer <token>"
```

## Support

For API support and questions:

- **Documentation**: [https://docs.chitlaq.com](https://docs.chitlaq.com)
- **Support Email**: api-support@chitlaq.com
- **Status Page**: [https://status.chitlaq.com](https://status.chitlaq.com)
