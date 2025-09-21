# Social API Reference

## Overview

The ChitLaq Social API provides comprehensive endpoints for managing social relationships, university networks, friend recommendations, and real-time social interactions. This API is designed for university-focused social platforms with privacy-first architecture and real-time capabilities.

## Base URL

```
Production: https://api.chitlaq.com/v1/social
Development: http://localhost:3001/api/v1/social
```

## Authentication

All API requests require authentication using JWT tokens:

```http
Authorization: Bearer <jwt_token>
```

## Rate Limiting

- **Standard endpoints**: 1000 requests per hour per user
- **Bulk operations**: 100 requests per hour per user
- **Real-time events**: 5000 events per hour per user

## Response Format

All responses follow a consistent JSON format:

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req_123456789",
    "version": "1.0"
  },
  "errors": []
}
```

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "data": null,
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req_123456789",
    "version": "1.0"
  },
  "errors": [
    {
      "code": "VALIDATION_ERROR",
      "message": "Invalid user ID format",
      "field": "targetUserId",
      "details": "User ID must be a valid UUID"
    }
  ]
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Invalid or missing authentication token |
| `FORBIDDEN` | 403 | Insufficient permissions for the operation |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `RATE_LIMIT_EXCEEDED` | 429 | Rate limit exceeded |
| `UNIVERSITY_NOT_VERIFIED` | 403 | University email not verified |
| `PRIVACY_VIOLATION` | 403 | Operation violates privacy settings |
| `BLOCKED_USER` | 403 | Target user has blocked the requester |
| `DUPLICATE_ACTION` | 409 | Action already performed |

## Social Relationships

### Follow User

Create a follow relationship between users.

```http
POST /relationships/follow
```

**Request Body:**
```json
{
  "targetUserId": "uuid",
  "metadata": {
    "source": "discovery",
    "context": "university_network"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "relationshipId": "rel_123456789",
    "sourceUserId": "uuid",
    "targetUserId": "uuid",
    "relationshipType": "follows",
    "status": "active",
    "createdAt": "2024-01-15T10:30:00Z",
    "metadata": {
      "source": "discovery",
      "context": "university_network"
    }
  }
}
```

### Unfollow User

Remove a follow relationship.

```http
DELETE /relationships/follow
```

**Request Body:**
```json
{
  "targetUserId": "uuid"
}
```

### Block User

Block a user to prevent interactions.

```http
POST /relationships/block
```

**Request Body:**
```json
{
  "targetUserId": "uuid",
  "reason": "spam|harassment|inappropriate_content|other",
  "details": "Optional details about the block reason"
}
```

### Get User Relationships

Retrieve relationships for a user.

```http
GET /relationships/{userId}
```

**Query Parameters:**
- `type`: Relationship type filter (`follows`, `followers`, `blocked`, `mutual`)
- `status`: Status filter (`active`, `pending`, `blocked`)
- `limit`: Number of results (default: 50, max: 100)
- `offset`: Pagination offset (default: 0)
- `universityOnly`: Filter to university connections only (boolean)

**Response:**
```json
{
  "success": true,
  "data": {
    "relationships": [
      {
        "relationshipId": "rel_123456789",
        "sourceUserId": "uuid",
        "targetUserId": "uuid",
        "relationshipType": "follows",
        "status": "active",
        "createdAt": "2024-01-15T10:30:00Z",
        "targetUser": {
          "userId": "uuid",
          "username": "johndoe",
          "displayName": "John Doe",
          "avatar": "https://cdn.chitlaq.com/avatars/uuid.jpg",
          "university": {
            "id": "univ_123",
            "name": "University of Technology",
            "department": "Computer Science"
          }
        }
      }
    ],
    "pagination": {
      "total": 150,
      "limit": 50,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

## University Networks

### Get University Members

Retrieve users from the same university.

```http
GET /university/{universityId}/members
```

**Query Parameters:**
- `department`: Filter by department
- `academicYear`: Filter by academic year
- `graduationYear`: Filter by graduation year
- `limit`: Number of results (default: 50, max: 100)
- `offset`: Pagination offset (default: 0)
- `excludeFollowing`: Exclude already followed users (boolean)

**Response:**
```json
{
  "success": true,
  "data": {
    "members": [
      {
        "userId": "uuid",
        "username": "johndoe",
        "displayName": "John Doe",
        "avatar": "https://cdn.chitlaq.com/avatars/uuid.jpg",
        "university": {
          "id": "univ_123",
          "name": "University of Technology",
          "department": "Computer Science",
          "academicYear": "2024",
          "graduationYear": "2026"
        },
        "mutualConnections": 5,
        "isFollowing": false,
        "canFollow": true
      }
    ],
    "pagination": {
      "total": 1250,
      "limit": 50,
      "offset": 0,
      "hasMore": true
    },
    "filters": {
      "department": "Computer Science",
      "academicYear": "2024"
    }
  }
}
```

### Get Department Members

Retrieve users from a specific department.

```http
GET /university/{universityId}/departments/{departmentId}/members
```

### Get Academic Year Cohort

Retrieve users from the same academic year.

```http
GET /university/{universityId}/academic-years/{year}/members
```

## Friend Recommendations

### Get Recommendations

Retrieve personalized friend recommendations.

```http
GET /recommendations/friends
```

**Query Parameters:**
- `algorithm`: Recommendation algorithm (`university`, `mutual`, `interests`, `hybrid`)
- `limit`: Number of recommendations (default: 20, max: 50)
- `excludeFollowing`: Exclude already followed users (boolean)
- `universityOnly`: Limit to university connections (boolean)

**Response:**
```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "userId": "uuid",
        "username": "johndoe",
        "displayName": "John Doe",
        "avatar": "https://cdn.chitlaq.com/avatars/uuid.jpg",
        "university": {
          "id": "univ_123",
          "name": "University of Technology",
          "department": "Computer Science",
          "academicYear": "2024"
        },
        "score": 0.85,
        "reasons": [
          {
            "type": "mutual_connections",
            "description": "5 mutual connections",
            "weight": 0.4
          },
          {
            "type": "university_network",
            "description": "Same university and department",
            "weight": 0.3
          },
          {
            "type": "interests",
            "description": "Shared interests: Technology, Programming",
            "weight": 0.3
          }
        ],
        "mutualConnections": 5,
        "sharedInterests": ["Technology", "Programming", "AI"],
        "isFollowing": false,
        "canFollow": true
      }
    ],
    "algorithm": "hybrid",
    "totalRecommendations": 20,
    "generatedAt": "2024-01-15T10:30:00Z"
  }
}
```

### Update Recommendation Preferences

Update user's recommendation preferences.

```http
PUT /recommendations/preferences
```

**Request Body:**
```json
{
  "algorithms": {
    "university": true,
    "mutual": true,
    "interests": false,
    "hybrid": true
  },
  "weights": {
    "university": 0.4,
    "mutual": 0.3,
    "interests": 0.3
  },
  "filters": {
    "universityOnly": true,
    "excludeFollowing": true,
    "minMutualConnections": 2
  }
}
```

## Social Analytics

### Get User Engagement Metrics

Retrieve engagement metrics for a user.

```http
GET /analytics/engagement/{userId}
```

**Query Parameters:**
- `timeRange`: Time range (`1d`, `7d`, `30d`, `90d`)
- `metrics`: Comma-separated list of metrics to include

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "timeRange": "30d",
    "metrics": {
      "profileViews": 1250,
      "postViews": 5600,
      "interactions": 890,
      "newConnections": 25,
      "engagementRate": 0.15,
      "activityScore": 75.5
    },
    "trends": {
      "profileViews": {
        "direction": "increasing",
        "changePercent": 12.5
      },
      "interactions": {
        "direction": "stable",
        "changePercent": 2.1
      }
    },
    "generatedAt": "2024-01-15T10:30:00Z"
  }
}
```

### Get Network Growth Metrics

Retrieve network growth metrics.

```http
GET /analytics/network/growth
```

**Query Parameters:**
- `timeRange`: Time range (`1d`, `7d`, `30d`, `90d`)
- `universityId`: Filter by university
- `granularity`: Data granularity (`hour`, `day`, `week`)

**Response:**
```json
{
  "success": true,
  "data": {
    "timeRange": "30d",
    "granularity": "day",
    "metrics": {
      "totalConnections": 12500,
      "newConnections": 450,
      "lostConnections": 120,
      "netGrowth": 330,
      "growthRate": 0.026,
      "averageConnectionsPerUser": 8.5
    },
    "dailyData": [
      {
        "date": "2024-01-15",
        "newConnections": 15,
        "lostConnections": 4,
        "netGrowth": 11
      }
    ],
    "trends": {
      "direction": "increasing",
      "changePercent": 8.2
    }
  }
}
```

## Real-time Social Events

### Subscribe to Social Events

Subscribe to real-time social events via WebSocket.

```javascript
const ws = new WebSocket('wss://api.chitlaq.com/v1/social/events');

ws.onopen = function() {
  // Subscribe to events
  ws.send(JSON.stringify({
    type: 'subscribe',
    events: ['follow', 'unfollow', 'block', 'post_like', 'post_comment'],
    filters: {
      userId: 'current_user_id',
      universityId: 'univ_123'
    }
  }));
};

ws.onmessage = function(event) {
  const data = JSON.parse(event.data);
  console.log('Social event:', data);
};
```

### Event Types

| Event Type | Description | Payload |
|------------|-------------|---------|
| `follow` | User followed someone | `{ sourceUserId, targetUserId, timestamp }` |
| `unfollow` | User unfollowed someone | `{ sourceUserId, targetUserId, timestamp }` |
| `block` | User blocked someone | `{ sourceUserId, targetUserId, reason, timestamp }` |
| `post_like` | User liked a post | `{ userId, postId, timestamp }` |
| `post_comment` | User commented on a post | `{ userId, postId, commentId, timestamp }` |
| `profile_view` | User viewed a profile | `{ viewerId, profileId, timestamp }` |

## Privacy Controls

### Get Privacy Settings

Retrieve user's privacy settings.

```http
GET /privacy/settings
```

**Response:**
```json
{
  "success": true,
  "data": {
    "profileVisibility": "university_only",
    "connectionVisibility": "mutual_connections",
    "activityVisibility": "followers_only",
    "searchVisibility": "university_only",
    "recommendationOptIn": true,
    "dataSharing": {
      "analytics": true,
      "personalization": true,
      "research": false
    }
  }
}
```

### Update Privacy Settings

Update user's privacy settings.

```http
PUT /privacy/settings
```

**Request Body:**
```json
{
  "profileVisibility": "university_only|followers_only|public",
  "connectionVisibility": "mutual_connections|followers_only|public",
  "activityVisibility": "followers_only|public",
  "searchVisibility": "university_only|public",
  "recommendationOptIn": true,
  "dataSharing": {
    "analytics": true,
    "personalization": true,
    "research": false
  }
}
```

## Moderation Actions

### Report User

Report a user for inappropriate behavior.

```http
POST /moderation/report
```

**Request Body:**
```json
{
  "targetUserId": "uuid",
  "reason": "spam|harassment|inappropriate_content|fake_profile|other",
  "details": "Detailed description of the issue",
  "evidence": {
    "postIds": ["post_123", "post_456"],
    "messageIds": ["msg_789"],
    "screenshots": ["https://cdn.chitlaq.com/reports/screenshot1.jpg"]
  }
}
```

### Get Moderation Status

Check moderation status for a user.

```http
GET /moderation/status/{userId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "status": "active|restricted|suspended|banned",
    "restrictions": [
      {
        "type": "post_creation",
        "reason": "Spam violations",
        "expiresAt": "2024-02-15T10:30:00Z"
      }
    ],
    "reports": {
      "total": 3,
      "resolved": 2,
      "pending": 1
    },
    "lastModerationAction": {
      "action": "warning",
      "reason": "Spam content",
      "timestamp": "2024-01-10T10:30:00Z"
    }
  }
}
```

## Bulk Operations

### Bulk Follow

Follow multiple users in a single request.

```http
POST /relationships/bulk/follow
```

**Request Body:**
```json
{
  "targetUserIds": ["uuid1", "uuid2", "uuid3"],
  "metadata": {
    "source": "university_network",
    "context": "department_discovery"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "successful": [
      {
        "targetUserId": "uuid1",
        "relationshipId": "rel_123",
        "status": "created"
      }
    ],
    "failed": [
      {
        "targetUserId": "uuid2",
        "error": "User has blocked you",
        "code": "BLOCKED_USER"
      }
    ],
    "summary": {
      "total": 3,
      "successful": 1,
      "failed": 2
    }
  }
}
```

### Bulk Unfollow

Unfollow multiple users in a single request.

```http
DELETE /relationships/bulk/follow
```

**Request Body:**
```json
{
  "targetUserIds": ["uuid1", "uuid2", "uuid3"]
}
```

## Webhooks

### Configure Webhook

Set up webhook for social events.

```http
POST /webhooks
```

**Request Body:**
```json
{
  "url": "https://your-app.com/webhooks/social",
  "events": ["follow", "unfollow", "block", "post_like"],
  "secret": "your_webhook_secret",
  "active": true
}
```

### Webhook Payload

```json
{
  "id": "webhook_123456789",
  "type": "follow",
  "data": {
    "sourceUserId": "uuid",
    "targetUserId": "uuid",
    "timestamp": "2024-01-15T10:30:00Z"
  },
  "created": "2024-01-15T10:30:00Z"
}
```

## SDKs and Libraries

### JavaScript/TypeScript

```bash
npm install @chitlaq/social-sdk
```

```javascript
import { ChitLaqSocial } from '@chitlaq/social-sdk';

const social = new ChitLaqSocial({
  apiKey: 'your_api_key',
  baseUrl: 'https://api.chitlaq.com/v1/social'
});

// Follow a user
await social.relationships.follow('target_user_id');

// Get recommendations
const recommendations = await social.recommendations.getFriends({
  algorithm: 'hybrid',
  limit: 20
});
```

### Python

```bash
pip install chitlaq-social
```

```python
from chitlaq_social import ChitLaqSocial

social = ChitLaqSocial(
    api_key='your_api_key',
    base_url='https://api.chitlaq.com/v1/social'
)

# Follow a user
social.relationships.follow('target_user_id')

# Get recommendations
recommendations = social.recommendations.get_friends(
    algorithm='hybrid',
    limit=20
)
```

## Best Practices

### Performance Optimization

1. **Use pagination** for large result sets
2. **Implement caching** for frequently accessed data
3. **Use bulk operations** for multiple actions
4. **Filter results** to reduce payload size
5. **Use WebSocket** for real-time updates

### Error Handling

1. **Implement retry logic** with exponential backoff
2. **Handle rate limiting** gracefully
3. **Validate responses** before processing
4. **Log errors** for debugging
5. **Provide user feedback** for failed operations

### Security

1. **Validate all inputs** before sending requests
2. **Use HTTPS** for all API calls
3. **Implement proper authentication** token management
4. **Respect user privacy** settings
5. **Handle sensitive data** appropriately

### Rate Limiting

1. **Monitor rate limit headers** in responses
2. **Implement request queuing** for high-volume operations
3. **Use bulk endpoints** when possible
4. **Cache responses** to reduce API calls
5. **Implement backoff strategies** for rate limit errors

## Support

For API support and questions:

- **Documentation**: https://docs.chitlaq.com/api/social
- **Support Email**: api-support@chitlaq.com
- **Status Page**: https://status.chitlaq.com
- **Community Forum**: https://community.chitlaq.com
