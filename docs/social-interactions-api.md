# Social Interactions API Documentation

## Overview

The Social Interactions API provides comprehensive endpoints for managing social relationships, interactions, and real-time events in the ChitLaq platform. This API enables users to follow, unfollow, block, mute, report, and interact with other users while maintaining security, rate limiting, and abuse detection.

## Base URL

```
https://api.chitlaq.com/v1/social
```

## Authentication

All endpoints require authentication using JWT tokens. Include the token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

## Rate Limiting

The API implements comprehensive rate limiting to prevent abuse:

- **Follow/Unfollow**: 100 follows per hour, 200 unfollows per hour
- **Block/Unblock**: 50 blocks per hour, 100 unblocks per hour
- **Mute/Unmute**: 200 mutes per hour, 200 unmutes per hour
- **Report**: 10 reports per hour
- **Batch Operations**: 5 batch operations per hour
- **General API**: 100 requests per 15 minutes

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Time when the rate limit resets

## Error Handling

The API uses standard HTTP status codes and returns error responses in the following format:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional error details"
  }
}
```

## Endpoints

### 1. Follow User

Follow another user to see their content in your feed.

**Endpoint**: `POST /follow`

**Request Body**:
```json
{
  "targetUserId": "user123"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "rel123",
    "followerId": "user456",
    "followingId": "user123",
    "relationshipType": "FOLLOW",
    "status": "ACTIVE",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

**Status Codes**:
- `200`: Successfully followed
- `400`: Invalid request data
- `401`: Unauthorized
- `404`: Target user not found
- `429`: Rate limit exceeded
- `500`: Internal server error

### 2. Unfollow User

Stop following a user to remove their content from your feed.

**Endpoint**: `POST /unfollow`

**Request Body**:
```json
{
  "targetUserId": "user123"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "unfollowed": true
  }
}
```

**Status Codes**:
- `200`: Successfully unfollowed
- `400`: Invalid request data
- `401`: Unauthorized
- `404`: Target user not found
- `429`: Rate limit exceeded
- `500`: Internal server error

### 3. Block User

Block a user to prevent them from seeing your content and interacting with you.

**Endpoint**: `POST /block`

**Request Body**:
```json
{
  "targetUserId": "user123"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "rel123",
    "followerId": "user456",
    "followingId": "user123",
    "relationshipType": "BLOCK",
    "status": "ACTIVE",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

**Status Codes**:
- `200`: Successfully blocked
- `400`: Invalid request data
- `401`: Unauthorized
- `404`: Target user not found
- `429`: Rate limit exceeded
- `500`: Internal server error

### 4. Unblock User

Remove a block on a user to allow them to see your content again.

**Endpoint**: `POST /unblock`

**Request Body**:
```json
{
  "targetUserId": "user123"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "unblocked": true
  }
}
```

**Status Codes**:
- `200`: Successfully unblocked
- `400`: Invalid request data
- `401`: Unauthorized
- `404`: Target user not found
- `429`: Rate limit exceeded
- `500`: Internal server error

### 5. Mute User

Mute a user to hide their content from your feed without unfollowing them.

**Endpoint**: `POST /mute`

**Request Body**:
```json
{
  "targetUserId": "user123"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "muted": true
  }
}
```

**Status Codes**:
- `200`: Successfully muted
- `400`: Invalid request data
- `401`: Unauthorized
- `404`: Target user not found
- `429`: Rate limit exceeded
- `500`: Internal server error

### 6. Unmute User

Remove a mute on a user to see their content in your feed again.

**Endpoint**: `POST /unmute`

**Request Body**:
```json
{
  "targetUserId": "user123"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "unmuted": true
  }
}
```

**Status Codes**:
- `200`: Successfully unmuted
- `400`: Invalid request data
- `401`: Unauthorized
- `404`: Target user not found
- `429`: Rate limit exceeded
- `500`: Internal server error

### 7. Report User

Report a user for violating community guidelines.

**Endpoint**: `POST /report`

**Request Body**:
```json
{
  "targetUserId": "user123",
  "reason": "spam",
  "details": "User is posting spam content"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "reported": true,
    "reportId": "report123"
  }
}
```

**Status Codes**:
- `200`: Successfully reported
- `400`: Invalid request data
- `401`: Unauthorized
- `404`: Target user not found
- `429`: Rate limit exceeded
- `500`: Internal server error

### 8. View Profile

Track when a user views another user's profile.

**Endpoint**: `POST /view-profile`

**Request Body**:
```json
{
  "targetUserId": "user123"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "viewed": true
  }
}
```

**Status Codes**:
- `200`: Successfully tracked
- `400`: Invalid request data
- `401`: Unauthorized
- `404`: Target user not found
- `500`: Internal server error

### 9. Batch Follow

Follow multiple users at once.

**Endpoint**: `POST /batch-follow`

**Request Body**:
```json
{
  "targetUserIds": ["user123", "user456", "user789"]
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "successful": ["user123", "user456"],
    "failed": ["user789"],
    "errors": {
      "user789": "User not found"
    }
  }
}
```

**Status Codes**:
- `200`: Batch operation completed
- `400`: Invalid request data
- `401`: Unauthorized
- `429`: Rate limit exceeded
- `500`: Internal server error

### 10. Get Relationship Status

Get the relationship status between two users.

**Endpoint**: `GET /relationship-status`

**Query Parameters**:
- `targetUserId`: ID of the target user

**Response**:
```json
{
  "success": true,
  "data": {
    "relationshipType": "FOLLOW",
    "status": "ACTIVE",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

**Status Codes**:
- `200`: Successfully retrieved
- `400`: Invalid request data
- `401`: Unauthorized
- `500`: Internal server error

### 11. Get User Relationships

Get all relationships for a user.

**Endpoint**: `GET /relationships`

**Query Parameters**:
- `userId`: ID of the user (optional, defaults to current user)
- `type`: Relationship type filter (optional)
- `status`: Relationship status filter (optional)
- `limit`: Maximum number of results (optional, default: 50)
- `offset`: Number of results to skip (optional, default: 0)

**Response**:
```json
{
  "success": true,
  "data": {
    "followers": ["user123", "user456"],
    "following": ["user789", "user012"],
    "blocked": ["user345"],
    "muted": ["user678"],
    "total": {
      "followers": 2,
      "following": 2,
      "blocked": 1,
      "muted": 1
    }
  }
}
```

**Status Codes**:
- `200`: Successfully retrieved
- `400`: Invalid request data
- `401`: Unauthorized
- `500`: Internal server error

## Real-time Events

The API supports real-time events via WebSocket connections for social interactions.

### WebSocket Connection

**Endpoint**: `wss://api.chitlaq.com/social/ws`

**Authentication**: Send authentication message after connection:

```json
{
  "type": "authenticate",
  "data": {
    "userId": "user123",
    "token": "jwt_token"
  }
}
```

### Event Subscription

Subscribe to specific event types:

```json
{
  "type": "subscribe",
  "data": {
    "eventTypes": ["user_followed", "user_unfollowed", "user_blocked"],
    "filters": {
      "priority": "high"
    }
  }
}
```

### Event Unsubscription

Unsubscribe from event types:

```json
{
  "type": "unsubscribe",
  "data": {
    "eventTypes": ["user_followed"]
  }
}
```

### Event Messages

Receive real-time events:

```json
{
  "type": "social_event",
  "data": {
    "id": "event123",
    "type": "user_followed",
    "data": {
      "followerId": "user456",
      "followingId": "user123"
    },
    "timestamp": "2024-01-15T10:30:00Z",
    "priority": "medium"
  }
}
```

## Data Models

### Relationship

```typescript
interface Relationship {
  id: string;
  followerId: string;
  followingId: string;
  relationshipType: 'FOLLOW' | 'BLOCK' | 'MUTE';
  status: 'ACTIVE' | 'PENDING' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
}
```

### Social Event

```typescript
interface SocialEvent {
  id: string;
  type: string;
  userId: string;
  targetUserId?: string;
  data: Record<string, any>;
  timestamp: Date;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  channels: ('websocket' | 'server_sent_events' | 'push')[];
  ttl: number;
}
```

## Security Features

### Rate Limiting

- Comprehensive rate limiting for all endpoints
- Different limits for different operations
- Rate limit headers in responses
- Automatic retry-after headers for exceeded limits

### Abuse Detection

- Real-time content analysis for abuse patterns
- Automatic escalation based on severity
- User blocking and banning capabilities
- Fraud detection and prevention

### Input Validation

- Strict input validation for all endpoints
- SQL injection prevention
- XSS protection
- CSRF protection

### Privacy Protection

- User ID hashing in logs
- Sensitive data redaction
- Audit trail for all operations
- GDPR compliance features

## Error Codes

| Code | Description |
|------|-------------|
| `INVALID_USER_ID` | Invalid user ID provided |
| `USER_NOT_FOUND` | Target user does not exist |
| `SELF_OPERATION` | Cannot perform operation on yourself |
| `RATE_LIMIT_EXCEEDED` | Rate limit exceeded for operation |
| `ABUSE_DETECTED` | Abuse pattern detected in request |
| `RELATIONSHIP_EXISTS` | Relationship already exists |
| `RELATIONSHIP_NOT_FOUND` | Relationship does not exist |
| `INVALID_RELATIONSHIP_TYPE` | Invalid relationship type |
| `INVALID_REPORT_REASON` | Invalid report reason |
| `AUTHENTICATION_REQUIRED` | Authentication required |
| `AUTHORIZATION_FAILED` | Authorization failed |
| `INTERNAL_SERVER_ERROR` | Internal server error |

## Best Practices

### Client Implementation

1. **Handle Rate Limits**: Implement exponential backoff for rate limit errors
2. **WebSocket Management**: Reconnect WebSocket connections on failure
3. **Error Handling**: Implement comprehensive error handling for all endpoints
4. **Caching**: Cache relationship data to reduce API calls
5. **Batch Operations**: Use batch endpoints for multiple operations

### Security

1. **Token Management**: Store JWT tokens securely
2. **Input Validation**: Validate all user inputs before sending
3. **Error Handling**: Don't expose sensitive information in error messages
4. **Rate Limiting**: Respect rate limits and implement backoff strategies

### Performance

1. **Connection Pooling**: Use connection pooling for HTTP requests
2. **WebSocket Reuse**: Reuse WebSocket connections when possible
3. **Batch Operations**: Use batch endpoints for multiple operations
4. **Caching**: Implement appropriate caching strategies

## Monitoring and Analytics

### Metrics

The API provides comprehensive metrics for monitoring:

- Request count and response times
- Rate limit violations
- Abuse detection events
- WebSocket connection statistics
- Error rates and types

### Logging

All operations are logged with:

- User ID (hashed for privacy)
- Operation type and parameters
- Response status and timing
- Error details and stack traces
- Security events and violations

### Alerts

Automatic alerts are configured for:

- High error rates
- Rate limit violations
- Abuse detection events
- WebSocket connection issues
- Performance degradation

## Support

For API support and questions:

- **Documentation**: [https://docs.chitlaq.com](https://docs.chitlaq.com)
- **Support Email**: api-support@chitlaq.com
- **Status Page**: [https://status.chitlaq.com](https://status.chitlaq.com)
- **GitHub Issues**: [https://github.com/chitlaq/api/issues](https://github.com/chitlaq/api/issues)
