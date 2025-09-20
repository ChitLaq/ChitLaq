# ChitLaq Authentication API - Quick Start Guide

## Overview

This guide will help you get started with the ChitLaq Authentication API in under 10 minutes. You'll learn how to register users, authenticate them, and manage their sessions.

## Prerequisites

- Node.js 16+ or any HTTP client
- Valid university email address
- Basic understanding of REST APIs and JWT tokens

## Base URL

```
Production: https://api.chitlaq.com/v1
Staging: https://staging-api.chitlaq.com/v1
Development: http://localhost:3000/api/v1
```

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

## Step 1: Register a New User

### Request

```http
POST /auth/register
Content-Type: application/json

{
  "email": "student@university.edu",
  "password": "SecurePassword123!",
  "confirmPassword": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

### Response

```json
{
  "success": true,
  "data": {
    "userId": "user_123456789",
    "email": "student@university.edu",
    "firstName": "John",
    "lastName": "Doe",
    "universityId": "1",
    "isEmailVerified": false,
    "createdAt": "2023-12-01T10:00:00Z"
  },
  "message": "User registered successfully. Please verify your email."
}
```

### Important Notes

- **University Email Required**: Only emails from approved university domains are accepted
- **Password Requirements**: Minimum 8 characters with uppercase, lowercase, number, and special character
- **Email Verification**: Users must verify their email before full access

## Step 2: Login User

### Request

```http
POST /auth/login
Content-Type: application/json

{
  "email": "student@university.edu",
  "password": "SecurePassword123!"
}
```

### Response

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600,
    "user": {
      "id": "user_123456789",
      "email": "student@university.edu",
      "firstName": "John",
      "lastName": "Doe",
      "universityId": "1",
      "isEmailVerified": true
    }
  },
  "message": "Login successful"
}
```

### Token Usage

Store the `accessToken` securely and include it in subsequent requests:

```http
GET /auth/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Step 3: Access Protected Resources

### Get User Profile

```http
GET /auth/profile
Authorization: Bearer <access-token>
```

### Response

```json
{
  "success": true,
  "data": {
    "id": "user_123456789",
    "email": "student@university.edu",
    "firstName": "John",
    "lastName": "Doe",
    "universityId": "1",
    "isEmailVerified": true,
    "createdAt": "2023-12-01T10:00:00Z",
    "updatedAt": "2023-12-01T10:00:00Z"
  }
}
```

## Step 4: Refresh Token (When Needed)

When your access token expires (typically after 1 hour), use the refresh token:

### Request

```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Response

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600
  }
}
```

## Step 5: Logout

### Request

```http
POST /auth/logout
Authorization: Bearer <access-token>
```

### Response

```json
{
  "success": true,
  "message": "Logout successful"
}
```

## Complete Example (JavaScript)

```javascript
class ChitLaqAuth {
  constructor(baseURL = 'https://api.chitlaq.com/v1') {
    this.baseURL = baseURL;
    this.accessToken = null;
    this.refreshToken = null;
  }

  async register(userData) {
    const response = await fetch(`${this.baseURL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });
    
    return await response.json();
  }

  async login(email, password) {
    const response = await fetch(`${this.baseURL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    
    const data = await response.json();
    
    if (data.success) {
      this.accessToken = data.data.accessToken;
      this.refreshToken = data.data.refreshToken;
    }
    
    return data;
  }

  async getProfile() {
    const response = await fetch(`${this.baseURL}/auth/profile`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });
    
    return await response.json();
  }

  async refreshAccessToken() {
    const response = await fetch(`${this.baseURL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken: this.refreshToken }),
    });
    
    const data = await response.json();
    
    if (data.success) {
      this.accessToken = data.data.accessToken;
      this.refreshToken = data.data.refreshToken;
    }
    
    return data;
  }

  async logout() {
    const response = await fetch(`${this.baseURL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });
    
    this.accessToken = null;
    this.refreshToken = null;
    
    return await response.json();
  }
}

// Usage
const auth = new ChitLaqAuth();

// Register
const registerResult = await auth.register({
  email: 'student@university.edu',
  password: 'SecurePassword123!',
  confirmPassword: 'SecurePassword123!',
  firstName: 'John',
  lastName: 'Doe'
});

// Login
const loginResult = await auth.login('student@university.edu', 'SecurePassword123!');

// Get profile
const profile = await auth.getProfile();

// Logout
await auth.logout();
```

## Error Handling

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Human-readable error message",
  "code": "MACHINE_READABLE_CODE",
  "details": { ... },
  "timestamp": "2023-12-01T10:00:00Z",
  "requestId": "req_123456789"
}
```

### Common Error Codes

| Code | Description | Action |
|------|-------------|---------|
| `INVALID_EMAIL_DOMAIN` | Email not from approved university | Use valid university email |
| `WEAK_PASSWORD` | Password doesn't meet requirements | Use stronger password |
| `USER_ALREADY_EXISTS` | Email already registered | Try logging in instead |
| `INVALID_CREDENTIALS` | Wrong email/password | Check credentials |
| `ACCOUNT_LOCKED` | Too many failed attempts | Wait or contact support |
| `TOKEN_EXPIRED` | Access token expired | Refresh token |
| `RATE_LIMIT_EXCEEDED` | Too many requests | Wait before retrying |

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Registration**: 5 requests per hour per IP
- **Login**: 10 requests per 5 minutes per IP
- **Password Reset**: 3 requests per hour per email
- **General API**: 1000 requests per hour per token

Rate limit headers are included in responses:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

## Security Best Practices

1. **Store tokens securely**: Use secure storage (not localStorage for production)
2. **Implement token refresh**: Automatically refresh expired tokens
3. **Validate university emails**: Always validate email domains
4. **Handle errors gracefully**: Implement proper error handling
5. **Use HTTPS**: Always use HTTPS in production
6. **Implement logout**: Clear tokens on logout

## Next Steps

- [Authentication Flow Guide](./authentication-flow.md) - Detailed authentication workflows
- [Security Best Practices](./security-best-practices.md) - Security implementation guide
- [Integration Examples](./integration-examples.md) - Real-world integration examples
- [API Reference](../api/authentication-api.yaml) - Complete API documentation

## Support

- **Documentation**: [https://docs.chitlaq.com](https://docs.chitlaq.com)
- **API Status**: [https://status.chitlaq.com](https://status.chitlaq.com)
- **Support Email**: api-support@chitlaq.com
- **Community**: [https://community.chitlaq.com](https://community.chitlaq.com)
