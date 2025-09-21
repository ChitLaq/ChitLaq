# Social Features Troubleshooting Guide

## Overview

This guide provides solutions to common issues encountered when implementing and using ChitLaq's social features. It covers authentication problems, API errors, performance issues, and integration challenges.

## Table of Contents

1. [Authentication Issues](#authentication-issues)
2. [API Errors](#api-errors)
3. [Performance Problems](#performance-problems)
4. [Integration Issues](#integration-issues)
5. [Data Synchronization](#data-synchronization)
6. [Real-time Features](#real-time-features)
7. [Privacy & Security](#privacy--security)
8. [University Integration](#university-integration)
9. [Recommendation System](#recommendation-system)
10. [Analytics & Monitoring](#analytics--monitoring)

## Authentication Issues

### Issue: Invalid University Email

**Symptoms:**
- Error: "University email not verified"
- Registration fails with university email
- Login rejected for valid university email

**Causes:**
- University domain not in approved list
- Email format validation failure
- University verification service down

**Solutions:**

1. **Check University Domain**
```typescript
// Verify university domain is approved
const approvedDomains = await chitlaq.university.getApprovedDomains();
const userDomain = email.split('@')[1];
const isApproved = approvedDomains.includes(userDomain);

if (!isApproved) {
  throw new Error(`University domain ${userDomain} is not approved`);
}
```

2. **Validate Email Format**
```typescript
// Validate university email format
function validateUniversityEmail(email: string): boolean {
  const universityEmailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return universityEmailRegex.test(email);
}
```

3. **Check University Service Status**
```typescript
// Check if university verification service is available
const serviceStatus = await chitlaq.university.checkServiceStatus();
if (!serviceStatus.available) {
  throw new Error('University verification service is temporarily unavailable');
}
```

### Issue: JWT Token Expired

**Symptoms:**
- Error: "Token expired"
- API calls return 401 Unauthorized
- User session lost unexpectedly

**Solutions:**

1. **Implement Token Refresh**
```typescript
class AuthManager {
  private refreshToken: string;
  
  async refreshAccessToken(): Promise<string> {
    try {
      const response = await this.apiClient.post('/auth/refresh', {
        refreshToken: this.refreshToken
      });
      
      this.accessToken = response.data.accessToken;
      return this.accessToken;
    } catch (error) {
      // Redirect to login
      this.redirectToLogin();
      throw error;
    }
  }
  
  async makeAuthenticatedRequest(url: string, options: RequestOptions) {
    try {
      return await this.apiClient.request({ url, ...options });
    } catch (error) {
      if (error.response?.status === 401) {
        await this.refreshAccessToken();
        return await this.apiClient.request({ url, ...options });
      }
      throw error;
    }
  }
}
```

2. **Handle Token Expiration Gracefully**
```typescript
// Add token expiration check
function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}
```

## API Errors

### Issue: Rate Limiting

**Symptoms:**
- Error: "Rate limit exceeded"
- HTTP 429 status code
- API calls throttled

**Solutions:**

1. **Implement Exponential Backoff**
```typescript
class RateLimitHandler {
  async makeRequestWithRetry<T>(
    requestFn: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        if (error.response?.status === 429) {
          const retryAfter = error.response.headers['retry-after'] || Math.pow(2, attempt);
          await this.delay(retryAfter * 1000);
          continue;
        }
        throw error;
      }
    }
    throw new Error('Max retries exceeded');
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

2. **Monitor Rate Limit Headers**
```typescript
// Check rate limit headers
function checkRateLimit(response: AxiosResponse) {
  const remaining = response.headers['x-ratelimit-remaining'];
  const resetTime = response.headers['x-ratelimit-reset'];
  
  if (remaining && parseInt(remaining) < 10) {
    console.warn(`Rate limit warning: ${remaining} requests remaining`);
  }
}
```

### Issue: Validation Errors

**Symptoms:**
- Error: "Validation failed"
- HTTP 400 status code
- Specific field validation errors

**Solutions:**

1. **Validate Data Before Sending**
```typescript
class DataValidator {
  validateFollowRequest(data: FollowRequest): ValidationResult {
    const errors: string[] = [];
    
    if (!data.targetUserId || !this.isValidUUID(data.targetUserId)) {
      errors.push('targetUserId must be a valid UUID');
    }
    
    if (data.metadata && typeof data.metadata !== 'object') {
      errors.push('metadata must be an object');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
}
```

2. **Handle Validation Errors Gracefully**
```typescript
try {
  await socialService.followUser(targetUserId);
} catch (error) {
  if (error.response?.status === 400) {
    const validationErrors = error.response.data.errors;
    validationErrors.forEach((err: any) => {
      console.error(`Validation error in ${err.field}: ${err.message}`);
    });
  }
}
```

## Performance Problems

### Issue: Slow API Responses

**Symptoms:**
- API calls taking > 2 seconds
- Timeout errors
- Poor user experience

**Solutions:**

1. **Implement Request Caching**
```typescript
class CachedSocialService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTTL = 5 * 60 * 1000; // 5 minutes
  
  async getFollowers(userId: string, useCache: boolean = true) {
    const cacheKey = `followers:${userId}`;
    
    if (useCache) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
        return cached.data;
      }
    }
    
    const data = await this.socialService.getFollowers(userId);
    
    if (useCache) {
      this.cache.set(cacheKey, { data, timestamp: Date.now() });
    }
    
    return data;
  }
}
```

2. **Use Pagination for Large Datasets**
```typescript
async function getAllFollowers(userId: string) {
  const allFollowers = [];
  let offset = 0;
  const limit = 100;
  
  while (true) {
    const batch = await socialService.getFollowers(userId, { limit, offset });
    allFollowers.push(...batch.data);
    
    if (batch.data.length < limit) {
      break; // No more data
    }
    
    offset += limit;
  }
  
  return allFollowers;
}
```

### Issue: Memory Leaks

**Symptoms:**
- Increasing memory usage over time
- Application crashes
- Slow performance

**Solutions:**

1. **Clean Up Event Listeners**
```typescript
class SocialEventManager {
  private listeners = new Map<string, Function[]>();
  
  addEventListener(event: string, listener: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }
  
  removeEventListener(event: string, listener: Function) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(listener);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }
  
  cleanup() {
    this.listeners.clear();
  }
}
```

2. **Implement Connection Pooling**
```typescript
class ConnectionPool {
  private connections: WebSocket[] = [];
  private maxConnections = 10;
  
  getConnection(): WebSocket {
    if (this.connections.length < this.maxConnections) {
      const ws = new WebSocket('wss://api.chitlaq.com/events');
      this.connections.push(ws);
      return ws;
    }
    
    // Reuse existing connection
    return this.connections[0];
  }
  
  cleanup() {
    this.connections.forEach(ws => ws.close());
    this.connections = [];
  }
}
```

## Integration Issues

### Issue: WebSocket Connection Failures

**Symptoms:**
- WebSocket connection drops frequently
- Real-time events not received
- Connection timeout errors

**Solutions:**

1. **Implement Reconnection Logic**
```typescript
class ReconnectingWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  
  connect(url: string) {
    this.ws = new WebSocket(url);
    
    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
    };
    
    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.attemptReconnect(url);
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }
  
  private attemptReconnect(url: string) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      setTimeout(() => {
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.connect(url);
      }, delay);
    }
  }
}
```

2. **Handle Network Interruptions**
```typescript
class NetworkMonitor {
  private isOnline = navigator.onLine;
  
  constructor() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.onNetworkRestored();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.onNetworkLost();
    });
  }
  
  private onNetworkRestored() {
    console.log('Network connection restored');
    // Reconnect WebSocket, retry failed requests, etc.
  }
  
  private onNetworkLost() {
    console.log('Network connection lost');
    // Pause real-time updates, queue requests, etc.
  }
}
```

### Issue: CORS Errors

**Symptoms:**
- CORS policy errors in browser
- API calls blocked by browser
- Preflight request failures

**Solutions:**

1. **Configure CORS Headers**
```typescript
// Server-side CORS configuration
app.use(cors({
  origin: [
    'https://app.chitlaq.com',
    'https://admin.chitlaq.com',
    'http://localhost:3000' // Development
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
```

2. **Handle CORS in Client**
```typescript
// Configure axios with credentials
const apiClient = axios.create({
  baseURL: 'https://api.chitlaq.com',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});
```

## Data Synchronization

### Issue: Data Inconsistency

**Symptoms:**
- User data out of sync
- Stale data displayed
- Inconsistent state across components

**Solutions:**

1. **Implement Data Versioning**
```typescript
interface VersionedData {
  data: any;
  version: number;
  lastUpdated: string;
}

class DataSynchronizer {
  private localData = new Map<string, VersionedData>();
  
  async syncData(key: string, remoteData: any) {
    const local = this.localData.get(key);
    const remote = {
      data: remoteData,
      version: Date.now(),
      lastUpdated: new Date().toISOString()
    };
    
    if (!local || remote.version > local.version) {
      this.localData.set(key, remote);
      return remote.data;
    }
    
    return local.data;
  }
}
```

2. **Use Optimistic Updates**
```typescript
class OptimisticUpdater {
  async followUser(targetUserId: string) {
    // Optimistically update UI
    this.updateUI({ type: 'FOLLOW', targetUserId });
    
    try {
      const result = await this.socialService.followUser(targetUserId);
      // Update with actual result
      this.updateUI({ type: 'FOLLOW_SUCCESS', result });
    } catch (error) {
      // Revert optimistic update
      this.updateUI({ type: 'FOLLOW_ERROR', targetUserId, error });
    }
  }
}
```

## Real-time Features

### Issue: Missing Real-time Events

**Symptoms:**
- Real-time updates not received
- Stale data in UI
- WebSocket events not firing

**Solutions:**

1. **Verify Event Subscription**
```typescript
class EventSubscriber {
  subscribeToEvents(events: string[], filters: any) {
    const subscription = {
      type: 'subscribe',
      events,
      filters
    };
    
    this.ws.send(JSON.stringify(subscription));
    
    // Verify subscription
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'subscription_confirmed') {
        console.log('Event subscription confirmed');
      }
    };
  }
}
```

2. **Handle Event Ordering**
```typescript
class EventProcessor {
  private eventQueue: any[] = [];
  private processing = false;
  
  addEvent(event: any) {
    this.eventQueue.push(event);
    this.processEvents();
  }
  
  private async processEvents() {
    if (this.processing) return;
    
    this.processing = true;
    
    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift();
      await this.processEvent(event);
    }
    
    this.processing = false;
  }
}
```

## Privacy & Security

### Issue: Privacy Settings Not Applied

**Symptoms:**
- Users can see restricted content
- Privacy settings ignored
- Data exposed inappropriately

**Solutions:**

1. **Validate Privacy Settings**
```typescript
class PrivacyValidator {
  canViewProfile(viewerId: string, profileOwnerId: string, privacySettings: any): boolean {
    if (viewerId === profileOwnerId) return true;
    
    switch (privacySettings.profileVisibility) {
      case 'public':
        return true;
      case 'university_only':
        return this.isSameUniversity(viewerId, profileOwnerId);
      case 'followers_only':
        return this.isFollowing(viewerId, profileOwnerId);
      case 'private':
        return false;
      default:
        return false;
    }
  }
}
```

2. **Implement Data Filtering**
```typescript
class DataFilter {
  filterUserData(userData: any, viewerId: string, privacySettings: any): any {
    const filtered = { ...userData };
    
    if (!this.canViewContactInfo(viewerId, userData.id, privacySettings)) {
      delete filtered.email;
      delete filtered.phone;
    }
    
    if (!this.canViewActivity(viewerId, userData.id, privacySettings)) {
      delete filtered.recentActivity;
    }
    
    return filtered;
  }
}
```

## University Integration

### Issue: University Data Sync Failures

**Symptoms:**
- University data not updated
- Student information outdated
- Department changes not reflected

**Solutions:**

1. **Implement Retry Logic**
```typescript
class UniversitySyncService {
  async syncUniversityData(universityId: string, retries: number = 3) {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const data = await this.fetchUniversityData(universityId);
        await this.updateLocalData(universityId, data);
        return data;
      } catch (error) {
        if (attempt === retries - 1) {
          throw error;
        }
        
        const delay = Math.pow(2, attempt) * 1000;
        await this.delay(delay);
      }
    }
  }
}
```

2. **Handle Partial Sync Failures**
```typescript
class PartialSyncHandler {
  async syncWithFallback(universityId: string) {
    try {
      return await this.fullSync(universityId);
    } catch (error) {
      console.warn('Full sync failed, attempting partial sync');
      return await this.partialSync(universityId);
    }
  }
  
  private async partialSync(universityId: string) {
    const results = await Promise.allSettled([
      this.syncStudents(universityId),
      this.syncDepartments(universityId),
      this.syncCourses(universityId)
    ]);
    
    return {
      students: results[0].status === 'fulfilled' ? results[0].value : null,
      departments: results[1].status === 'fulfilled' ? results[1].value : null,
      courses: results[2].status === 'fulfilled' ? results[2].value : null
    };
  }
}
```

## Recommendation System

### Issue: Poor Recommendation Quality

**Symptoms:**
- Irrelevant recommendations
- Low user engagement with recommendations
- Recommendations not personalized

**Solutions:**

1. **Improve Algorithm Parameters**
```typescript
class RecommendationOptimizer {
  async optimizeRecommendations(userId: string) {
    const userBehavior = await this.analyzeUserBehavior(userId);
    const optimalWeights = this.calculateOptimalWeights(userBehavior);
    
    return {
      university: optimalWeights.university,
      mutual: optimalWeights.mutual,
      interests: optimalWeights.interests
    };
  }
  
  private calculateOptimalWeights(behavior: any) {
    // Adjust weights based on user behavior
    if (behavior.followsUniversityConnections > 0.7) {
      return { university: 0.6, mutual: 0.2, interests: 0.2 };
    } else if (behavior.followsMutualConnections > 0.7) {
      return { university: 0.2, mutual: 0.6, interests: 0.2 };
    } else {
      return { university: 0.3, mutual: 0.3, interests: 0.4 };
    }
  }
}
```

2. **Implement Feedback Loop**
```typescript
class RecommendationFeedback {
  async recordFeedback(recommendationId: string, feedback: any) {
    await this.analyticsService.record('recommendation_feedback', {
      recommendationId,
      feedback,
      timestamp: new Date().toISOString()
    });
    
    // Update user preferences based on feedback
    await this.updateUserPreferences(feedback);
  }
  
  private async updateUserPreferences(feedback: any) {
    const preferences = await this.getUserPreferences(feedback.userId);
    
    if (feedback.positive) {
      preferences.boostAlgorithm(feedback.algorithm);
    } else {
      preferences.reduceAlgorithm(feedback.algorithm);
    }
    
    await this.saveUserPreferences(feedback.userId, preferences);
  }
}
```

## Analytics & Monitoring

### Issue: Analytics Data Inconsistency

**Symptoms:**
- Inconsistent metrics across dashboards
- Missing analytics data
- Incorrect calculations

**Solutions:**

1. **Implement Data Validation**
```typescript
class AnalyticsValidator {
  validateMetrics(metrics: any): ValidationResult {
    const errors: string[] = [];
    
    if (metrics.dau < 0 || metrics.dau > metrics.mau) {
      errors.push('DAU cannot be negative or greater than MAU');
    }
    
    if (metrics.engagementRate < 0 || metrics.engagementRate > 1) {
      errors.push('Engagement rate must be between 0 and 1');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
```

2. **Implement Data Reconciliation**
```typescript
class DataReconciler {
  async reconcileAnalyticsData(timeRange: TimeRange) {
    const sources = [
      this.getDatabaseMetrics(timeRange),
      this.getEventStoreMetrics(timeRange),
      this.getCacheMetrics(timeRange)
    ];
    
    const results = await Promise.all(sources);
    const reconciled = this.reconcileMetrics(results);
    
    return reconciled;
  }
  
  private reconcileMetrics(metrics: any[]): any {
    // Implement reconciliation logic
    return {
      dau: Math.max(...metrics.map(m => m.dau)),
      mau: Math.max(...metrics.map(m => m.mau)),
      engagementRate: metrics.reduce((sum, m) => sum + m.engagementRate, 0) / metrics.length
    };
  }
}
```

## Best Practices

### 1. Error Handling
- Always implement comprehensive error handling
- Use try-catch blocks for async operations
- Provide meaningful error messages to users
- Log errors for debugging

### 2. Performance
- Implement caching for frequently accessed data
- Use pagination for large datasets
- Optimize database queries
- Monitor performance metrics

### 3. Security
- Validate all input data
- Implement proper authentication
- Use HTTPS for all communications
- Follow privacy best practices

### 4. Monitoring
- Set up comprehensive logging
- Monitor API performance
- Track error rates
- Implement alerting for critical issues

## Support

For additional troubleshooting support:

- **Documentation**: https://docs.chitlaq.com/troubleshooting
- **Support Email**: support@chitlaq.com
- **Technical Support**: https://support.chitlaq.com
- **Community Forum**: https://community.chitlaq.com
- **GitHub Issues**: https://github.com/chitlaq/social-sdk/issues
