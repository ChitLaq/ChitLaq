# ChitLaq M1 MVP - Hibrit Monorepo Planı
*Senior Architecture & Implementation Guide*

> **Hedef:** 50K toplam kullanıcı, 5K eşzamanlı kullanıcı destekleyen yüksek performanslı hibrit sosyal medya platformu

---

## 🏗️ Mimari Kararları & Gerekçeler

### Hibrit Monorepo Stratejisi

**Neden Hibrit Monorepo?**
- **Hızlı geliştirme** ve **kolay refactoring** (shared code, atomic changes)
- **Consistent tooling** ve **unified CI/CD**
- **Type safety** across services (TypeScript shared interfaces)
- **Selective deployment** capability (performance critical services ayrı scale edilebilir)

```
chitlaq/
├── apps/                    # Deployable applications
│   ├── web/                 # Next.js 15 (App Router)
│   ├── admin/               # Next.js + TailAdmin
│   ├── api-gateway/         # Fastify + Kong integration
│   ├── auth-service/        # Fastify (high throughput)
│   ├── realtime-service/    # Bun + uWS (ultra-fast WebSocket)
│   ├── feed-service/        # Go + Gin (high compute)
│   └── search-service/      # Rust + Actix (ultra-performance)
├── packages/                # Shared libraries
│   ├── shared-types/        # TypeScript definitions
│   ├── shared-utils/        # Common utilities
│   ├── database-client/     # Supabase client wrapper
│   ├── cache-client/        # Redis client
│   └── ui-components/       # React component library
├── tools/                   # Development tools
│   ├── eslint-config/
│   ├── tsconfig/
│   └── db-migrations/
└── infra/                   # Infrastructure as Code
    ├── docker/
    ├── k8s/
    └── terraform/
```

### Performance-First Tech Stack

| Servis | Teknoloji | Gerekçe |
|--------|-----------|---------|
| **Realtime** | Bun + uWebSockets.js | 1M+ concurrent connections, <1ms latency |
| **Feed Algorithm** | Go + Gin + fasthttp | High CPU compute, goroutine efficiency |
| **Search** | Rust + Actix Web | Zero-cost abstractions, memory safety |
| **API Gateway** | Fastify + Kong | TypeScript DX + enterprise features |
| **Auth** | Fastify + Supabase Auth | High req/s capability, simple integration |
| **Web App** | Next.js 15 + Turbopack | React Server Components, edge streaming |
| **Admin** | Next.js + TailAdmin | Rapid admin panel development |

---

## 🔧 Core Infrastructure

### Database Strategy: Supabase + Smart Scaling

```sql
-- Schema organization (single DB, multiple schemas)
CREATE SCHEMA IF NOT EXISTS auth_schema;
CREATE SCHEMA IF NOT EXISTS social_schema;
CREATE SCHEMA IF NOT EXISTS content_schema;
CREATE SCHEMA IF NOT EXISTS messaging_schema;
CREATE SCHEMA IF NOT EXISTS analytics_schema;
```

**Performance Optimizations:**
- **Connection pooling** via PgBouncer (500 max connections)
- **Read replicas** for feed/search queries
- **Redis cluster** for hot data (feed cache, session store)
- **PostgreSQL extensions**: pg_trgm, pg_stat_statements, pgvector (future AI features)

### Real-time Architecture: Supabase + WebSocket Hybrid

```typescript
// packages/realtime-client/index.ts
export class ChitLaqRealtime {
  private supabaseClient: SupabaseClient;
  private wsConnection: WebSocket;
  
  // Supabase Realtime for DB changes
  subscribeToUserFeed(userId: string) {
    return this.supabaseClient
      .channel(`user_feed:${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'content_schema',
        table: 'posts'
      }, callback);
  }
  
  // Custom WebSocket for chat (ultra-low latency)
  sendMessage(conversationId: string, message: Message) {
    this.wsConnection.send(JSON.stringify({
      type: 'SEND_MESSAGE',
      payload: { conversationId, message }
    }));
  }
}
```

---

## 🚀 M1 MVP Sprint Plan (6 Hafta)

### Sprint 0: Foundation (1 hafta)
**Hedef:** Monorepo setup + core infrastructure

#### Günlük Breakdown:
- **Gün 1-2:** Turbo monorepo setup, shared packages structure
- **Gün 3-4:** Supabase self-hosted deployment + schemas
- **Gün 5-6:** Basic CI/CD pipeline, Docker configs
- **Gün 7:** Development environment validation

#### Deliverables:
```bash
# Workspace setup
pnpm install
pnpm dev                    # All services start
pnpm build                  # All apps build successfully
pnpm test                   # All tests pass
```

**Technical Tasks:**
- [ ] Turbo monorepo with pnpm workspaces
- [ ] ESLint + Prettier + TypeScript shared configs
- [ ] Docker Compose for local development
- [ ] Supabase local setup + basic schemas
- [ ] GitHub Actions CI/CD pipeline

### Sprint 1: Auth + Security (1 hafta)
**Hedef:** Üniversite email validation + secure authentication

#### Core Features:
```typescript
// apps/auth-service/src/validators/email.ts
export async function validateUniversityEmail(email: string): Promise<boolean> {
  const [localPart, domain] = email.split('@');
  
  // Check allowed prefixes (cs_, ee_, 2025_ etc.)
  const allowedPrefixes = await getAllowedPrefixes();
  const hasValidPrefix = allowedPrefixes.some(prefix => 
    localPart.toLowerCase().startsWith(prefix.toLowerCase())
  );
  
  // Check university domain whitelist
  const allowedDomains = await getAllowedDomains();
  const hasValidDomain = allowedDomains.includes(domain.toLowerCase());
  
  return hasValidPrefix && hasValidDomain;
}
```

#### API Endpoints:
```typescript
// Authentication flow
POST /auth/signup           // University email validation + OTP
POST /auth/verify           // OTP verification + account creation
POST /auth/login            // Email + password / magic link
GET  /auth/me               // User session info
POST /auth/refresh          // Token refresh
POST /auth/logout           // Session termination
```

#### Acceptance Criteria:
- [ ] Sadece izinli university email ile kayıt
- [ ] Magic link + OTP double verification
- [ ] JWT + refresh token mechanism
- [ ] Rate limiting (5 attempts/minute)
- [ ] Audit logging for auth events

### Sprint 2: User Profiles + Social Graph (1 hafta)
**Hedef:** Profile management + basic social features

#### Profile System:
```typescript
// packages/shared-types/profile.ts
export interface UserProfile {
  id: string;
  username: string;          // Unique, 3-20 chars
  displayName: string;       // Public display name
  bio?: string;              // Max 160 chars
  avatarUrl?: string;        // Supabase Storage URL
  universityInfo: {
    prefix: string;          // cs_, ee_ etc.
    graduationYear?: number;
  };
  socialLinks: SocialLink[];
  privacySettings: PrivacySettings;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Social Features:
```sql
-- social_schema.follows
CREATE TABLE social_schema.follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES auth.users(id),
  followee_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(follower_id, followee_id)
);

-- social_schema.blocks
CREATE TABLE social_schema.blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES auth.users(id),
  blocked_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);
```

#### Performance Optimizations:
- **Avatar upload** via Supabase Storage with CDN
- **Username availability** check with debounced API
- **Friend suggestions** algorithm (mutual connections + same university)

### Sprint 3: Content System + Feed (1.5 hafta)
**Hedef:** Post creation + intelligent feed algorithm

#### Content Models:
```typescript
// packages/shared-types/content.ts
export interface Post {
  id: string;
  authorId: string;
  content: string;           // Max 280 chars
  contentType: 'text' | 'image' | 'link' | 'poll';
  metadata: {
    mentions: string[];      // @username mentions
    hashtags: string[];      // #hashtag extraction
    links: LinkPreview[];    // Auto-generated previews
  };
  engagement: {
    likeCount: number;
    shareCount: number;
    commentCount: number;
  };
  visibility: 'public' | 'followers' | 'private';
  createdAt: Date;
  updatedAt: Date;
}
```

#### Feed Algorithm (Go Implementation):
```go
// apps/feed-service/internal/algorithm/feed.go
type FeedGenerator struct {
    db     *sql.DB
    cache  *redis.Client
}

func (f *FeedGenerator) GeneratePersonalizedFeed(userID string, limit int) ([]Post, error) {
    // 1. Get user interests and follows
    interests, _ := f.getUserInterests(userID)
    follows, _ := f.getUserFollows(userID)
    
    // 2. Score-based algorithm
    posts := []ScoredPost{}
    
    // Following posts (weight: 1.0)
    followingPosts, _ := f.getFollowingPosts(follows, 48*time.Hour)
    for _, post := range followingPosts {
        score := f.calculateEngagementScore(post) * 1.0
        posts = append(posts, ScoredPost{Post: post, Score: score})
    }
    
    // Interest-based posts (weight: 0.7)
    interestPosts, _ := f.getInterestBasedPosts(interests, 24*time.Hour)
    for _, post := range interestPosts {
        score := f.calculateEngagementScore(post) * 0.7
        posts = append(posts, ScoredPost{Post: post, Score: score})
    }
    
    // Trending posts (weight: 0.5)
    trendingPosts, _ := f.getTrendingPosts(6*time.Hour)
    for _, post := range trendingPosts {
        score := f.calculateEngagementScore(post) * 0.5
        posts = append(posts, ScoredPost{Post: post, Score: score})
    }
    
    // Sort by score and return top results
    sort.Slice(posts, func(i, j int) bool {
        return posts[i].Score > posts[j].Score
    })
    
    return f.deduplicateAndLimit(posts, limit), nil
}
```

#### Content Creation Flow:
1. **Real-time preview** as user types
2. **Hashtag/mention autocomplete** with fuzzy search
3. **Link preview generation** via web scraping
4. **Content moderation** via automated filters
5. **Immediate feed invalidation** for followers

### Sprint 4: Real-time Messaging (1.5 hafta)
**Hedef:** Ultra-fast messaging with Bun + uWebSockets

#### WebSocket Server (Bun):
```typescript
// apps/realtime-service/src/websocket-server.ts
import { WebSocketServer } from 'uws';

interface WSConnection {
  userId: string;
  connectionId: string;
  lastSeen: Date;
  rooms: Set<string>;
}

class ChitLaqRealtimeServer {
  private connections = new Map<string, WSConnection>();
  private rooms = new Map<string, Set<string>>();
  
  constructor() {
    this.server = new WebSocketServer({
      port: 8080,
      compression: 'SHARED_COMPRESSOR',
      maxCompressedSize: 64 * 1024,
      maxBackpressure: 64 * 1024,
    });
    
    this.server.ws('/*', {
      message: this.handleMessage.bind(this),
      open: this.handleConnection.bind(this),
      close: this.handleDisconnection.bind(this),
    });
  }
  
  private async handleMessage(ws: any, message: ArrayBuffer) {
    const data = JSON.parse(Buffer.from(message).toString());
    
    switch (data.type) {
      case 'SEND_MESSAGE':
        await this.handleSendMessage(ws, data.payload);
        break;
      case 'JOIN_CONVERSATION':
        await this.handleJoinConversation(ws, data.payload);
        break;
      case 'TYPING_START':
        await this.handleTypingIndicator(ws, data.payload, true);
        break;
      case 'TYPING_STOP':
        await this.handleTypingIndicator(ws, data.payload, false);
        break;
    }
  }
  
  private async handleSendMessage(ws: any, payload: any) {
    const { conversationId, message } = payload;
    
    // Save to database
    const savedMessage = await this.saveMessage(conversationId, message);
    
    // Broadcast to conversation participants
    const participantIds = await this.getConversationParticipants(conversationId);
    this.broadcastToUsers(participantIds, {
      type: 'NEW_MESSAGE',
      payload: savedMessage
    });
    
    // Send delivery confirmation
    ws.send(JSON.stringify({
      type: 'MESSAGE_DELIVERED',
      payload: { messageId: savedMessage.id }
    }));
  }
}
```

#### Message Database Schema:
```sql
-- messaging_schema.conversations
CREATE TABLE messaging_schema.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type conversation_type NOT NULL DEFAULT 'direct',
  name TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- messaging_schema.conversation_participants
CREATE TABLE messaging_schema.conversation_participants (
  conversation_id UUID REFERENCES messaging_schema.conversations(id),
  user_id UUID REFERENCES auth.users(id),
  joined_at TIMESTAMP DEFAULT now(),
  last_read_at TIMESTAMP,
  role participant_role DEFAULT 'member',
  PRIMARY KEY (conversation_id, user_id)
);

-- messaging_schema.messages
CREATE TABLE messaging_schema.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES messaging_schema.conversations(id),
  sender_id UUID REFERENCES auth.users(id),
  content TEXT NOT NULL,
  message_type message_type DEFAULT 'text',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT now(),
  edited_at TIMESTAMP,
  deleted_at TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_messages_conversation_created 
  ON messaging_schema.messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender 
  ON messaging_schema.messages(sender_id);
```

#### Performance Targets:
- **Message delivery**: <100ms P95
- **Connection handling**: 10K concurrent per instance
- **Message throughput**: 50K messages/second
- **Memory usage**: <1GB per 10K connections

### Sprint 5: Search + Notifications (1 hafta)
**Hedef:** Blazing fast search + real-time notifications

#### Search Service (Rust + Actix):
```rust
// apps/search-service/src/search_engine.rs
use actix_web::{web, Result, HttpResponse};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;

#[derive(Deserialize)]
struct SearchQuery {
    q: String,
    search_type: Option<SearchType>,
    limit: Option<i32>,
    offset: Option<i32>,
}

#[derive(Serialize)]
enum SearchType {
    Users,
    Posts,
    Hashtags,
    All,
}

#[derive(Serialize)]
struct SearchResults {
    users: Vec<UserSearchResult>,
    posts: Vec<PostSearchResult>,
    hashtags: Vec<HashtagSearchResult>,
    total_count: i32,
    execution_time_ms: u64,
}

pub async fn search(
    query: web::Query<SearchQuery>,
    pool: web::Data<PgPool>,
) -> Result<HttpResponse> {
    let start_time = std::time::Instant::now();
    
    // Parallel search execution
    let (users, posts, hashtags) = tokio::join!(
        search_users(&pool, &query.q, query.limit.unwrap_or(10)),
        search_posts(&pool, &query.q, query.limit.unwrap_or(20)),
        search_hashtags(&pool, &query.q, query.limit.unwrap_or(5))
    );
    
    let execution_time = start_time.elapsed().as_millis() as u64;
    
    Ok(HttpResponse::Ok().json(SearchResults {
        users: users?,
        posts: posts?,
        hashtags: hashtags?,
        total_count: calculate_total_count(&users, &posts, &hashtags),
        execution_time_ms: execution_time,
    }))
}

async fn search_users(
    pool: &PgPool,
    query: &str,
    limit: i32,
) -> Result<Vec<UserSearchResult>, sqlx::Error> {
    sqlx::query_as!(
        UserSearchResult,
        r#"
        SELECT 
            p.id,
            p.username,
            p.display_name,
            p.avatar_url,
            p.university_info,
            ts_rank(
                to_tsvector('english', p.username || ' ' || p.display_name),
                plainto_tsquery('english', $1)
            ) as rank
        FROM profiles.profiles p
        WHERE 
            to_tsvector('english', p.username || ' ' || p.display_name) 
            @@ plainto_tsquery('english', $1)
            OR similarity(p.username, $1) > 0.3
        ORDER BY rank DESC, similarity(p.username, $1) DESC
        LIMIT $2
        "#,
        query,
        limit
    )
    .fetch_all(pool)
    .await
}
```

#### Notification System:
```typescript
// packages/notification-client/src/notification-service.ts
export class NotificationService {
  async sendNotification(notification: Notification) {
    // 1. Save to database
    await this.saveNotification(notification);
    
    // 2. Check user preferences
    const preferences = await this.getUserNotificationPreferences(notification.userId);
    if (preferences.muted.includes(notification.type)) {
      return;
    }
    
    // 3. Send via multiple channels
    await Promise.allSettled([
      this.sendWebSocketNotification(notification),
      this.sendWebPushNotification(notification),
      this.sendEmailNotification(notification), // For important notifications
    ]);
    
    // 4. Update notification statistics
    await this.updateNotificationStats(notification.type);
  }
  
  private async sendWebSocketNotification(notification: Notification) {
    const userConnections = await this.getUserConnections(notification.userId);
    
    userConnections.forEach(connection => {
      connection.send(JSON.stringify({
        type: 'NOTIFICATION',
        payload: notification
      }));
    });
  }
}
```

### Sprint 6: Admin Panel + Analytics (1 hafta)
**Hedef:** TailAdmin based admin panel + basic analytics

#### Admin Panel Features:
```typescript
// apps/admin/src/pages/dashboard.tsx
export default function AdminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const response = await fetch('/api/admin/stats');
      return response.json();
    },
    refetchInterval: 30000, // Update every 30 seconds
  });
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatsCard
        title="Active Users"
        value={stats?.activeUsers}
        change={stats?.activeUsersChange}
        icon={<UsersIcon />}
      />
      <StatsCard
        title="Messages/Hour"
        value={stats?.messagesPerHour}
        change={stats?.messagesChange}
        icon={<MessageIcon />}
      />
      <StatsCard
        title="Posts Today"
        value={stats?.postsToday}
        change={stats?.postsChange}
        icon={<DocumentIcon />}
      />
      <StatsCard
        title="Server Health"
        value={`${stats?.serverHealth}%`}
        status={stats?.serverHealth > 95 ? 'healthy' : 'warning'}
        icon={<ServerIcon />}
      />
    </div>
  );
}
```

#### Real-time Analytics Pipeline:
```typescript
// packages/analytics-client/src/event-tracker.ts
export class EventTracker {
  private eventBuffer: AnalyticsEvent[] = [];
  private flushInterval = 5000; // 5 seconds
  
  track(event: AnalyticsEvent) {
    this.eventBuffer.push({
      ...event,
      timestamp: new Date(),
      sessionId: this.getSessionId(),
      userId: this.getCurrentUserId(),
    });
    
    if (this.eventBuffer.length >= 100) {
      this.flush();
    }
  }
  
  private async flush() {
    if (this.eventBuffer.length === 0) return;
    
    const events = [...this.eventBuffer];
    this.eventBuffer = [];
    
    try {
      await fetch('/api/analytics/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events }),
      });
    } catch (error) {
      // Retry logic or store locally
      console.error('Failed to send analytics events:', error);
    }
  }
}
```

---

## 🔄 CI/CD & DevOps

### GitHub Actions Workflow:
```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm type-check
      - run: pnpm test
      - run: pnpm build

  deploy-staging:
    needs: test
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    steps:
      - run: echo "Deploy to staging"
      
  deploy-production:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - run: echo "Deploy to production"
```

### Docker Strategy:
```dockerfile
# apps/realtime-service/Dockerfile
FROM oven/bun:1.0-alpine

WORKDIR /app

# Install dependencies
COPY package.json pnpm-lock.yaml ./
RUN bun install --frozen-lockfile --production

# Copy source code
COPY . .

# Build application
RUN bun build --target=bun

EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

CMD ["bun", "start"]
```

---

## 📊 Performance Targets & Monitoring

### Key Metrics:
| Metric | Target | Critical Threshold |
|--------|--------|--------------------|
| **API Response Time** | P95 < 150ms | P95 > 300ms |
| **WebSocket Latency** | P95 < 100ms | P95 > 200ms |
| **Database Query Time** | P95 < 50ms | P95 > 100ms |
| **Search Response** | P95 < 200ms | P95 > 500ms |
| **Feed Generation** | P95 < 300ms | P95 > 1000ms |
| **Memory Usage** | < 80% | > 90% |
| **CPU Usage** | < 70% | > 85% |

### Monitoring Stack:
```yaml
# docker-compose.monitoring.yml
version: '3.8'
services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - ./monitoring/grafana/dashboards:/var/lib/grafana/dashboards
      
  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"
      - "14268:14268"
```

---

## 🔒 Security Implementation

### Authentication & Authorization:
```typescript
// packages/auth-middleware/src/jwt-middleware.ts
export function createJWTMiddleware(options: JWTOptions) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const token = extractTokenFromHeader(request.headers.authorization);
    
    if (!token) {
      return reply.status(401).send({ error: 'Missing authorization token' });
    }
    
    try {
      const payload = await verifyJWT(token);
      
      // Check token blacklist
      if (await isTokenBlacklisted(token)) {
        return reply.status(401).send({ error: 'Token has been revoked' });
      }
      
      // Rate limiting check
      await checkRateLimit(payload.userId, request.routerPath);
      
      request.user = payload;
    } catch (error) {
      return reply.status(401).send({ error: 'Invalid token' });
    }
  };
}
```

### Rate Limiting:
```typescript
// packages/rate-limiter/src/redis-rate-limiter.ts
export class RedisRateLimiter {
  async checkLimit(
    key: string,
    windowMs: number,
    maxRequests: number
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const pipeline = this.redis.pipeline();
    const now = Date.now();
    const window = Math.floor(now / windowMs);
    const redisKey = `ratelimit:${key}:${window}`;
    
    pipeline.incr(redisKey);
    pipeline.expire(redisKey, Math.ceil(windowMs / 1000));
    
    const results = await pipeline.exec();
    const current = results[0][1] as number;
    
    return {
      allowed: current <= maxRequests,
      remaining: Math.max(0, maxRequests - current),
      resetTime: (window + 1) * windowMs,
    };
  }
}
```

---

## 🧪 Testing Strategy

### Test Pyramid:
```typescript
// Unit Tests (70%)
describe('FeedAlgorithm', () => {
  it('should prioritize followed users posts', async () => {
    const algorithm = new FeedAlgorithm(mockDB, mockCache);
    const feed = await algorithm.generateFeed('user123', 10);
    
    expect(feed.posts).toHaveLength(10);
    expect(feed.posts[0].author).toBeInFollowList('user123');
  });
});

// Integration Tests (20%)
describe('Authentication Flow', () => {
  it('should complete full signup flow', async () => {
    const response = await request(app)
      .post('/auth/signup')
      .send({ email: 'cs_john@university.edu' });
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('verificationSent', true);
  });
});

// E2E Tests (10%)
describe('Messaging System', () => {
  it('should send and receive messages in real-time', async () => {
    const { browser, page } = await setupE2ETest();
    
    await page.goto('/messages');
    await page.type('[data-testid="message-input"]', 'Hello world');
    await page.click('[data-testid="send-button"]');
    
    await expect(page.locator('[data-testid="message"]')).toContainText('Hello world');
  });
});
```

---

## 🚀 Deployment Strategy

### Environment Configuration:
```typescript
// packages/config/src/environment.ts
export const config = {
  development: {
    database: {
      url: process.env.DATABASE_URL || 'postgresql://localhost:5432/chitlaq_dev',
      maxConnections: 10,
    },
    redis: {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    },
    supabase: {
      url: process.env.SUPABASE_URL || 'http://localhost:54321',
      anonKey: process.env.SUPABASE_ANON_KEY,
    },
  },
  
  production: {
    database: {
      url: process.env.DATABASE_URL,
      maxConnections: 100,
      ssl: { rejectUnauthorized: false },
    },
    redis: {
      url: process.env.REDIS_URL,
      tls: {},
    },
    supabase: {
      url: process.env.SUPABASE_URL,
      anonKey: process.env.SUPABASE_ANON_KEY,
    },
  },
};
```

### Kubernetes Deployment:
```yaml
# infra/k8s/realtime-service.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: realtime-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: realtime-service
  template:
    metadata:
      labels:
        app: realtime-service
    spec:
      containers:
      - name: realtime-service
        image: chitlaq/realtime-service:latest
        ports:
        - containerPort: 8080
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-secret
              key: url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: realtime-service
spec:
  selector:
    app: realtime-service
  ports:
  - port: 80
    targetPort: 8080
  type: LoadBalancer
```

---

## 📈 Success Metrics & KPIs

### Business Metrics:
- **Daily Active Users (DAU)**: Target 5K by week 8
- **Message Volume**: 50K messages/day
- **Post Engagement**: 2.5 avg likes per post
- **Session Duration**: 15+ minutes average
- **User Retention**: 60% Day-7 retention

### Technical Metrics:
- **System Uptime**: 99.9%
- **Zero-downtime Deployments**: 100%
- **Security Incidents**: 0
- **Performance SLA**: 95% within targets

---

## 🛣️ Post-MVP Roadmap

### M2 Features (Weeks 9-16):
- **Group Messaging** with role-based permissions
- **Advanced Search** with filters and saved searches
- **Mobile Apps** (React Native with shared business logic)
- **AI Content Moderation** (OpenAI integration)
- **Advanced Analytics** with user behavior insights

### M3 Features (Weeks 17-24):
- **Video/Audio Messages** with transcription
- **Stories Feature** (24-hour content)
- **Campus Events** integration
- **Third-party Integrations** (Google Calendar, Zoom)
- **Advanced Monetization** (premium features, sponsored content)

---

## 💡 Developer Experience (DX)

### Local Development Setup:
```bash
# One-command setup
git clone https://github.com/chitlaq/chitlaq.git
cd chitlaq
pnpm install
pnpm dev:setup    # Starts all services + dependencies
pnpm dev         # Development mode with hot reload

# Testing
pnpm test        # All tests
pnpm test:unit   # Unit tests only
pnpm test:e2e    # E2E tests only

# Database management
pnpm db:migrate  # Run migrations
pnpm db:seed     # Seed development data
pnpm db:reset    # Reset and reseed database
```

### Code Quality Tools:
```json
{
  "scripts": {
    "lint": "turbo run lint",
    "lint:fix": "turbo run lint:fix",
    "type-check": "turbo run type-check",
    "format": "prettier --write .",
    "prepare": "husky install"
  },
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,yml,yaml}": ["prettier --write"]
  }
}
```

---

## 🎯 Implementation Priority

### Week 1: Foundation
✅ Monorepo setup with Turbo  
✅ Shared packages structure  
✅ CI/CD pipeline  
✅ Local development environment  

### Week 2: Core Services
✅ Authentication service (Fastify)  
✅ Database schemas & RLS  
✅ API Gateway setup  
✅ Basic security middleware  

### Week 3: User Experience
✅ Profile management  
✅ Social graph (follow/unfollow)  
✅ Web app authentication flow  
✅ Basic admin panel  

### Week 4-5: Content & Feed
✅ Post creation & management  
✅ Feed algorithm (Go service)  
✅ Search functionality (Rust service)  
✅ Content moderation basics  

### Week 6: Real-time & Polish
✅ WebSocket messaging (Bun)  
✅ Notification system  
✅ Analytics implementation  
✅ Performance optimization  

---

Bu plan, senior seviyede bir yaklaşımla hibrit monorepo mimarisini kullanarak yüksek performanslı, ölçeklenebilir ve maintainable bir sosyal medya platformu oluşturmayı hedefliyor. Her sprint detaylı acceptance criteria ve technical implementation detayları ile birlikte planlanmış durumda.

<function_calls>
<invoke name="todo_write">
<parameter name="merge">true
