# ChitLaq M1 MVP - Senior Development Plan
*15+ Years Experience Based Implementation Strategy*

> **Target:** Complete social media platform with 14 core features on $100/month budget using self-hosted Supabase

---

## 🎯 Requirements Analysis & Prioritization

### Core Features Matrix (14 Features)
| Priority | Feature | Complexity | Dependencies | Sprint |
|----------|---------|------------|--------------|--------|
| **P0** | Auth | High | Supabase Auth | 1 |
| **P0** | Onboarding | Medium | Auth | 1 |
| **P1** | Profile | Medium | Auth, Storage | 2 |
| **P1** | Posts | High | Profile, Storage | 3 |
| **P1** | Friend | Medium | Profile | 2 |
| **P2** | Feed | High | Posts, Friend, Analytics | 3 |
| **P2** | Search Bar | High | Posts, Profile | 4 |
| **P2** | Chat/Messaging | Very High | Auth, Real-time | 4 |
| **P2** | Real-time | Very High | Supabase Realtime | 4 |
| **P3** | Notifications | High | All above | 5 |
| **P3** | Analytics | Medium | All features | 5 |
| **P3** | Monitoring | Medium | Infrastructure | 5 |
| **P4** | Monetization | Low | Feed, Analytics | 6 |
| **P4** | Admin Access | Medium | All features | 6 |

### Development Phases
```
Phase 1 (Weeks 1-2): Foundation & Core Identity
Phase 2 (Weeks 3-4): Social Features & Content
Phase 3 (Weeks 5-6): Advanced Features & Real-time
Phase 4 (Weeks 7-8): Business Features & Polish
```

---

## 🏗️ Self-Hosted Supabase Architecture

### Complete Supabase Stack
```yaml
# docker-compose.supabase.yml
version: '3.8'

services:
  # Core Database
  postgres:
    image: postgres:15-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: postgres
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_HOST_AUTH_METHOD: trust
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./supabase/migrations:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"
    command: postgres -c wal_level=logical
    deploy:
      resources:
        limits:
          memory: 4G

  # Supabase Studio (Database Admin)
  studio:
    image: supabase/studio:20231103-6ba2214
    restart: unless-stopped
    environment:
      SUPABASE_URL: http://kong:8000
      STUDIO_PG_META_URL: http://meta:8080
      SUPABASE_ANON_KEY: ${ANON_KEY}
      SUPABASE_SERVICE_KEY: ${SERVICE_ROLE_KEY}
    ports:
      - "3010:3000"
    depends_on:
      - kong
      - meta

  # Kong API Gateway
  kong:
    image: kong:2.8.1
    restart: unless-stopped
    environment:
      KONG_DATABASE: "off"
      KONG_DECLARATIVE_CONFIG: /var/lib/kong/kong.yml
      KONG_DNS_ORDER: LAST,A,CNAME
      KONG_PLUGINS: request-transformer,cors,key-auth,acl,rate-limiting
    ports:
      - "8000:8000"
      - "8443:8443"
    volumes:
      - ./supabase/kong.yml:/var/lib/kong/kong.yml

  # PostgREST API
  rest:
    image: postgrest/postgrest:v10.1.1
    restart: unless-stopped
    environment:
      PGRST_DB_URI: postgres://authenticator:${POSTGRES_PASSWORD}@postgres:5432/postgres
      PGRST_DB_SCHEMAS: public,storage,graphql_public
      PGRST_DB_ANON_ROLE: anon
      PGRST_JWT_SECRET: ${JWT_SECRET}
      PGRST_DB_USE_LEGACY_GUCS: "false"
    depends_on:
      - postgres

  # Supabase Auth (GoTrue)
  auth:
    image: supabase/gotrue:v2.99.0
    restart: unless-stopped
    environment:
      GOTRUE_API_HOST: 0.0.0.0
      GOTRUE_API_PORT: 9999
      API_EXTERNAL_URL: ${API_EXTERNAL_URL}
      GOTRUE_DB_DRIVER: postgres
      GOTRUE_DB_DATABASE_URL: postgres://supabase_auth_admin:${POSTGRES_PASSWORD}@postgres:5432/postgres
      GOTRUE_SITE_URL: ${SITE_URL}
      GOTRUE_URI_ALLOW_LIST: ${ADDITIONAL_REDIRECT_URLS}
      GOTRUE_DISABLE_SIGNUP: ${DISABLE_SIGNUP}
      GOTRUE_JWT_ADMIN_ROLES: service_role
      GOTRUE_JWT_AUD: authenticated
      GOTRUE_JWT_DEFAULT_GROUP_NAME: authenticated
      GOTRUE_JWT_EXP: ${JWT_EXPIRY}
      GOTRUE_JWT_SECRET: ${JWT_SECRET}
      GOTRUE_EXTERNAL_EMAIL_ENABLED: ${ENABLE_EMAIL_SIGNUP}
      GOTRUE_MAILER_AUTOCONFIRM: ${ENABLE_EMAIL_AUTOCONFIRM}
      GOTRUE_SMTP_ADMIN_EMAIL: ${SMTP_ADMIN_EMAIL}
      GOTRUE_SMTP_HOST: ${SMTP_HOST}
      GOTRUE_SMTP_PORT: ${SMTP_PORT}
      GOTRUE_SMTP_USER: ${SMTP_USER}
      GOTRUE_SMTP_PASS: ${SMTP_PASS}
      GOTRUE_SMTP_SENDER_NAME: ${SMTP_SENDER_NAME}
      GOTRUE_MAILER_URLPATHS_INVITE: ${MAILER_URLPATHS_INVITE}
      GOTRUE_MAILER_URLPATHS_CONFIRMATION: ${MAILER_URLPATHS_CONFIRMATION}
      GOTRUE_MAILER_URLPATHS_RECOVERY: ${MAILER_URLPATHS_RECOVERY}
      GOTRUE_MAILER_URLPATHS_EMAIL_CHANGE: ${MAILER_URLPATHS_EMAIL_CHANGE}
    depends_on:
      - postgres

  # Supabase Realtime
  realtime:
    image: supabase/realtime:v2.25.35
    restart: unless-stopped
    environment:
      PORT: 4000
      DB_HOST: postgres
      DB_PORT: 5432
      DB_USER: supabase_admin
      DB_PASSWORD: ${POSTGRES_PASSWORD}
      DB_NAME: postgres
      DB_AFTER_CONNECT_QUERY: 'SET search_path TO _realtime'
      DB_ENC_KEY: supabase_realtime_admin
      API_JWT_SECRET: ${JWT_SECRET}
      FLY_ALLOC_ID: fly123
      FLY_APP_NAME: realtime
      SECRET_KEY_BASE: ${SECRET_KEY_BASE}
      ERL_AFLAGS: -proto_dist inet_tcp
      ENABLE_TAILSCALE: "false"
      DNS_NODES: "''"
    command: >
      sh -c "/app/bin/migrate && /app/bin/realtime eval 'Realtime.Release.seeds(Realtime.Repo)' && /app/bin/server"
    depends_on:
      - postgres

  # Supabase Storage
  storage:
    image: supabase/storage-api:v0.40.4
    restart: unless-stopped
    environment:
      ANON_KEY: ${ANON_KEY}
      SERVICE_KEY: ${SERVICE_ROLE_KEY}
      POSTGREST_URL: http://rest:3000
      PGRST_JWT_SECRET: ${JWT_SECRET}
      DATABASE_URL: postgres://supabase_storage_admin:${POSTGRES_PASSWORD}@postgres:5432/postgres
      FILE_SIZE_LIMIT: 52428800
      STORAGE_BACKEND: file
      FILE_STORAGE_BACKEND_PATH: /var/lib/storage
      TENANT_ID: stub
      REGION: stub
      GLOBAL_S3_BUCKET: stub
      ENABLE_IMAGE_TRANSFORMATION: "true"
      IMGPROXY_URL: http://imgproxy:5001
    volumes:
      - storage_data:/var/lib/storage
    depends_on:
      - postgres
      - rest
      - imgproxy

  # Image Processing
  imgproxy:
    image: darthsim/imgproxy:v3.8.0
    restart: unless-stopped
    environment:
      IMGPROXY_BIND: ":5001"
      IMGPROXY_LOCAL_FILESYSTEM_ROOT: /var/lib/storage
      IMGPROXY_USE_ETAG: "true"
      IMGPROXY_ENABLE_WEBP_DETECTION: "true"
    volumes:
      - storage_data:/var/lib/storage

  # Database Metadata API
  meta:
    image: supabase/postgres-meta:v0.68.0
    restart: unless-stopped
    environment:
      PG_META_PORT: 8080
      PG_META_DB_HOST: postgres
      PG_META_DB_PORT: 5432
      PG_META_DB_NAME: postgres
      PG_META_DB_USER: supabase_admin
      PG_META_DB_PASSWORD: ${POSTGRES_PASSWORD}
    depends_on:
      - postgres

volumes:
  postgres_data:
  storage_data:
```

### Database Schema Design
```sql
-- supabase/migrations/20240101000000_initial_schema.sql

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "vector" CASCADE;

-- Create custom schemas
CREATE SCHEMA IF NOT EXISTS profiles;
CREATE SCHEMA IF NOT EXISTS content;
CREATE SCHEMA IF NOT EXISTS social;
CREATE SCHEMA IF NOT EXISTS messaging;
CREATE SCHEMA IF NOT EXISTS notifications;
CREATE SCHEMA IF NOT EXISTS analytics;
CREATE SCHEMA IF NOT EXISTS admin;

-- University validation table
CREATE TABLE public.allowed_universities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  domain TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  prefixes TEXT[] DEFAULT '{}',
  country TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User profiles (extends auth.users)
CREATE TABLE profiles.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL CHECK (username ~ '^[a-zA-Z0-9_]{3,20}$'),
  display_name TEXT NOT NULL CHECK (LENGTH(display_name) <= 50),
  bio TEXT CHECK (LENGTH(bio) <= 160),
  avatar_url TEXT,
  banner_url TEXT,
  university_domain TEXT REFERENCES public.allowed_universities(domain),
  university_prefix TEXT,
  graduation_year INTEGER,
  website_url TEXT,
  location TEXT,
  birth_date DATE,
  is_verified BOOLEAN DEFAULT FALSE,
  is_private BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Social relationships
CREATE TABLE social.follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  followee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, followee_id),
  CHECK (follower_id != followee_id)
);

CREATE TABLE social.blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id)
);

-- Content system
CREATE TYPE content.post_type AS ENUM ('text', 'image', 'link', 'poll');
CREATE TYPE content.visibility_type AS ENUM ('public', 'followers', 'private');

CREATE TABLE content.posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (LENGTH(content) <= 280),
  post_type content.post_type DEFAULT 'text',
  visibility content.visibility_type DEFAULT 'public',
  hashtags TEXT[] DEFAULT '{}',
  mentions UUID[] DEFAULT '{}',
  media_urls TEXT[] DEFAULT '{}',
  link_preview JSONB,
  poll_data JSONB,
  like_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  parent_post_id UUID REFERENCES content.posts(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Post interactions
CREATE TABLE content.post_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES content.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

CREATE TABLE content.post_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES content.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  share_type TEXT DEFAULT 'repost',
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messaging system
CREATE TYPE messaging.conversation_type AS ENUM ('direct', 'group');

CREATE TABLE messaging.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type messaging.conversation_type DEFAULT 'direct',
  name TEXT,
  description TEXT,
  avatar_url TEXT,
  is_archived BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE messaging.conversation_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES messaging.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_read_at TIMESTAMP WITH TIME ZONE,
  is_muted BOOLEAN DEFAULT FALSE,
  UNIQUE(conversation_id, user_id)
);

CREATE TYPE messaging.message_type AS ENUM ('text', 'image', 'file', 'system');

CREATE TABLE messaging.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES messaging.conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  message_type messaging.message_type DEFAULT 'text',
  content TEXT NOT NULL,
  media_urls TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  reply_to_id UUID REFERENCES messaging.messages(id),
  is_edited BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications
CREATE TYPE notifications.notification_type AS ENUM (
  'follow', 'like', 'comment', 'mention', 'message', 'system'
);

CREATE TABLE notifications.user_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type notifications.notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT FALSE,
  is_muted BOOLEAN DEFAULT FALSE,
  action_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE notifications.notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type notifications.notification_type NOT NULL,
  email_enabled BOOLEAN DEFAULT TRUE,
  push_enabled BOOLEAN DEFAULT TRUE,
  in_app_enabled BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, type)
);

-- Analytics
CREATE TABLE analytics.user_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id UUID,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  referer TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE analytics.daily_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL UNIQUE,
  daily_active_users INTEGER DEFAULT 0,
  new_users INTEGER DEFAULT 0,
  total_posts INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  total_likes INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin tools
CREATE TABLE admin.moderation_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  target_type TEXT NOT NULL, -- 'user', 'post', 'message'
  target_id UUID NOT NULL,
  action_type TEXT NOT NULL, -- 'warn', 'suspend', 'ban', 'delete'
  reason TEXT NOT NULL,
  duration INTERVAL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE admin.user_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id),
  reported_user_id UUID REFERENCES auth.users(id),
  reported_post_id UUID REFERENCES content.posts(id),
  reported_message_id UUID REFERENCES messaging.messages(id),
  report_type TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_user_profiles_username ON profiles.user_profiles(username);
CREATE INDEX idx_user_profiles_university ON profiles.user_profiles(university_domain);
CREATE INDEX idx_follows_follower ON social.follows(follower_id);
CREATE INDEX idx_follows_followee ON social.follows(followee_id);
CREATE INDEX idx_posts_author_created ON content.posts(author_id, created_at DESC);
CREATE INDEX idx_posts_hashtags ON content.posts USING GIN(hashtags);
CREATE INDEX idx_posts_content_fts ON content.posts USING GIN(to_tsvector('english', content));
CREATE INDEX idx_messages_conversation_created ON messaging.messages(conversation_id, created_at DESC);
CREATE INDEX idx_notifications_user_created ON notifications.user_notifications(user_id, created_at DESC);
CREATE INDEX idx_user_events_type_created ON analytics.user_events(event_type, created_at);

-- Row Level Security (RLS) Policies
ALTER TABLE profiles.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE social.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE social.blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE content.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE content.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE messaging.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messaging.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messaging.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications.user_notifications ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (detailed policies in separate files)
CREATE POLICY "Users can view public profiles" ON profiles.user_profiles
  FOR SELECT USING (NOT is_private OR id = auth.uid());

CREATE POLICY "Users can update own profile" ON profiles.user_profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can view non-blocked posts" ON content.posts
  FOR SELECT USING (
    visibility = 'public' 
    AND NOT EXISTS (
      SELECT 1 FROM social.blocks 
      WHERE blocker_id = author_id AND blocked_id = auth.uid()
    )
  );
```

---

## 🚀 Sprint-Based Development Plan

### **SPRINT 1: Foundation & Authentication (Week 1-2)**

#### Sprint Goal: Secure foundation with university email validation

#### Day-by-Day Breakdown:

**Day 1-2: Infrastructure Setup**
```bash
# Infrastructure deployment
./scripts/deploy-supabase.sh
./scripts/setup-domain.sh
./scripts/configure-ssl.sh
```

**Day 3-5: Authentication System**
```typescript
// apps/auth-service/src/validators/university-email.ts
export class UniversityEmailValidator {
  async validateEmail(email: string): Promise<ValidationResult> {
    const [localPart, domain] = email.split('@');
    
    // Check if university domain is allowed
    const university = await this.supabase
      .from('allowed_universities')
      .select('*')
      .eq('domain', domain.toLowerCase())
      .eq('is_active', true)
      .single();
    
    if (!university.data) {
      throw new Error('University not allowed');
    }
    
    // Check prefix requirements
    if (university.data.prefixes?.length > 0) {
      const hasValidPrefix = university.data.prefixes.some(prefix =>
        localPart.toLowerCase().startsWith(prefix.toLowerCase())
      );
      
      if (!hasValidPrefix) {
        throw new Error('Invalid email prefix for this university');
      }
    }
    
    return {
      isValid: true,
      university: university.data,
      extractedPrefix: this.extractPrefix(localPart, university.data.prefixes)
    };
  }
  
  private extractPrefix(localPart: string, prefixes: string[]): string {
    return prefixes.find(prefix => 
      localPart.toLowerCase().startsWith(prefix.toLowerCase())
    ) || '';
  }
}
```

**Day 6-7: Onboarding Flow**
```typescript
// apps/web/src/components/onboarding/OnboardingWizard.tsx
export default function OnboardingWizard() {
  const [step, setStep] = useState(1);
  const [profileData, setProfileData] = useState<OnboardingData>({});
  
  const steps = [
    { component: EmailVerificationStep, title: "Verify Your University Email" },
    { component: BasicInfoStep, title: "Tell Us About Yourself" },
    { component: InterestsStep, title: "Choose Your Interests" },
    { component: ProfilePictureStep, title: "Add a Profile Picture" },
    { component: WelcomeStep, title: "Welcome to ChitLaq!" }
  ];
  
  return (
    <div className="max-w-md mx-auto p-6">
      <ProgressBar currentStep={step} totalSteps={steps.length} />
      <StepComponent 
        data={profileData}
        onNext={(data) => {
          setProfileData(prev => ({ ...prev, ...data }));
          setStep(prev => prev + 1);
        }}
        onBack={() => setStep(prev => prev - 1)}
      />
    </div>
  );
}
```

#### Deliverables:
- [x] Self-hosted Supabase stack running
- [x] University email validation system
- [x] Complete onboarding flow (5 steps)
- [x] SSL certificates and domain setup
- [x] Basic monitoring dashboard

---

### **SPRINT 2: Profiles & Social Foundation (Week 3-4)**

#### Sprint Goal: User profiles and basic social features

**Day 8-10: Profile Management**
```typescript
// apps/profile-service/src/profile-manager.ts
export class ProfileManager {
  async createProfile(userId: string, data: CreateProfileData): Promise<UserProfile> {
    // Upload avatar if provided
    let avatarUrl = null;
    if (data.avatar) {
      avatarUrl = await this.uploadAvatar(userId, data.avatar);
    }
    
    // Create profile in database
    const { data: profile, error } = await this.supabase
      .from('user_profiles')
      .insert({
        id: userId,
        username: data.username,
        display_name: data.displayName,
        bio: data.bio,
        avatar_url: avatarUrl,
        university_domain: data.universityDomain,
        university_prefix: data.universityPrefix,
        graduation_year: data.graduationYear
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Initialize notification preferences
    await this.initializeNotificationPreferences(userId);
    
    return profile;
  }
  
  private async uploadAvatar(userId: string, file: File): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/avatar.${fileExt}`;
    
    const { data, error } = await this.supabase.storage
      .from('avatars')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      });
    
    if (error) throw error;
    
    const { data: { publicUrl } } = this.supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);
    
    return publicUrl;
  }
}
```

**Day 11-12: Friend System**
```typescript
// apps/social-service/src/friend-manager.ts
export class FriendManager {
  async followUser(followerId: string, followeeId: string): Promise<void> {
    // Check if users are not blocked
    const isBlocked = await this.checkIfBlocked(followerId, followeeId);
    if (isBlocked) {
      throw new Error('Cannot follow blocked user');
    }
    
    // Create follow relationship
    const { error } = await this.supabase
      .from('follows')
      .insert({ follower_id: followerId, followee_id: followeeId });
    
    if (error) throw error;
    
    // Send notification
    await this.sendFollowNotification(followeeId, followerId);
    
    // Update analytics
    await this.trackEvent('user_followed', { followerId, followeeId });
  }
  
  async generateFriendSuggestions(userId: string, limit = 10): Promise<UserSuggestion[]> {
    // Algorithm: Mutual connections + same university + similar interests
    const { data: suggestions } = await this.supabase.rpc('get_friend_suggestions', {
      user_id: userId,
      suggestion_limit: limit
    });
    
    return suggestions.map(s => ({
      userId: s.user_id,
      username: s.username,
      displayName: s.display_name,
      avatarUrl: s.avatar_url,
      mutualFriends: s.mutual_count,
      reason: this.getSuggestionReason(s)
    }));
  }
}
```

**Day 13-14: Profile UI & Social Features**
```typescript
// apps/web/src/components/profile/ProfilePage.tsx
export default function ProfilePage({ username }: { username: string }) {
  const { data: profile, isLoading } = useProfile(username);
  const { data: posts } = useUserPosts(profile?.id);
  const { data: followStats } = useFollowStats(profile?.id);
  const currentUser = useCurrentUser();
  
  if (isLoading) return <ProfileSkeleton />;
  
  return (
    <div className="max-w-2xl mx-auto">
      <ProfileHeader 
        profile={profile}
        isOwnProfile={currentUser?.id === profile?.id}
        followStats={followStats}
      />
      
      <ProfileTabs>
        <Tab name="Posts">
          <PostsList posts={posts} />
        </Tab>
        <Tab name="Media">
          <MediaGrid posts={posts?.filter(p => p.media_urls?.length > 0)} />
        </Tab>
        <Tab name="Likes">
          <LikedPosts userId={profile.id} />
        </Tab>
      </ProfileTabs>
    </div>
  );
}
```

#### Deliverables:
- [x] Complete profile management system
- [x] Avatar upload with image processing
- [x] Follow/unfollow functionality
- [x] Friend suggestions algorithm
- [x] Profile privacy settings
- [x] Responsive profile UI

---

### **SPRINT 3: Content System & Feed Algorithm (Week 5-6)**

#### Sprint Goal: Post creation and intelligent feed

**Day 15-17: Post Creation System**
```typescript
// apps/content-service/src/post-manager.ts
export class PostManager {
  async createPost(authorId: string, data: CreatePostData): Promise<Post> {
    // Process content for hashtags and mentions
    const processedContent = await this.processContent(data.content);
    
    // Upload media if present
    const mediaUrls = [];
    if (data.media?.length > 0) {
      for (const file of data.media) {
        const url = await this.uploadMedia(authorId, file);
        mediaUrls.push(url);
      }
    }
    
    // Generate link preview if URL detected
    let linkPreview = null;
    if (processedContent.links.length > 0) {
      linkPreview = await this.generateLinkPreview(processedContent.links[0]);
    }
    
    // Create post
    const { data: post, error } = await this.supabase
      .from('posts')
      .insert({
        author_id: authorId,
        content: data.content,
        post_type: this.determinePostType(data),
        hashtags: processedContent.hashtags,
        mentions: processedContent.mentions,
        media_urls: mediaUrls,
        link_preview: linkPreview,
        visibility: data.visibility || 'public'
      })
      .select(`
        *,
        author:user_profiles(username, display_name, avatar_url)
      `)
      .single();
    
    if (error) throw error;
    
    // Invalidate follower feeds
    await this.invalidateFollowerFeeds(authorId);
    
    // Send mention notifications
    await this.sendMentionNotifications(post.id, processedContent.mentions);
    
    return post;
  }
  
  private async processContent(content: string): Promise<ProcessedContent> {
    const hashtags = Array.from(content.matchAll(/#(\w+)/g), m => m[1]);
    const mentionMatches = Array.from(content.matchAll(/@(\w+)/g), m => m[1]);
    const links = Array.from(content.matchAll(urlRegex), m => m[0]);
    
    // Resolve mentions to user IDs
    const mentions = [];
    if (mentionMatches.length > 0) {
      const { data: users } = await this.supabase
        .from('user_profiles')
        .select('id')
        .in('username', mentionMatches);
      
      mentions.push(...users.map(u => u.id));
    }
    
    return { hashtags, mentions, links };
  }
}
```

**Day 18-20: Feed Algorithm (Go Service)**
```go
// apps/feed-service/internal/algorithm/feed.go
package algorithm

import (
    "context"
    "time"
    "database/sql"
    "github.com/go-redis/redis/v8"
)

type FeedGenerator struct {
    db    *sql.DB
    redis *redis.Client
}

type ScoredPost struct {
    Post  Post    `json:"post"`
    Score float64 `json:"score"`
}

func (f *FeedGenerator) GeneratePersonalizedFeed(ctx context.Context, userID string, limit int) ([]Post, error) {
    // Check cache first
    cacheKey := fmt.Sprintf("feed:%s", userID)
    cached, err := f.redis.Get(ctx, cacheKey).Result()
    if err == nil {
        var posts []Post
        json.Unmarshal([]byte(cached), &posts)
        return posts, nil
    }
    
    // Get user preferences and social graph
    userPrefs, err := f.getUserPreferences(ctx, userID)
    if err != nil {
        return nil, err
    }
    
    follows, err := f.getUserFollows(ctx, userID)
    if err != nil {
        return nil, err
    }
    
    interests, err := f.getUserInterests(ctx, userID)
    if err != nil {
        return nil, err
    }
    
    // Score-based feed algorithm
    var scoredPosts []ScoredPost
    
    // 1. Following posts (weight: 1.0)
    followingPosts, err := f.getFollowingPosts(ctx, follows, 48*time.Hour)
    if err == nil {
        for _, post := range followingPosts {
            score := f.calculateEngagementScore(post) * 1.0
            score = f.applyRecencyBoost(score, post.CreatedAt)
            scoredPosts = append(scoredPosts, ScoredPost{Post: post, Score: score})
        }
    }
    
    // 2. Interest-based posts (weight: 0.7)
    interestPosts, err := f.getInterestBasedPosts(ctx, interests, 24*time.Hour)
    if err == nil {
        for _, post := range interestPosts {
            score := f.calculateEngagementScore(post) * 0.7
            score = f.applyRecencyBoost(score, post.CreatedAt)
            scoredPosts = append(scoredPosts, ScoredPost{Post: post, Score: score})
        }
    }
    
    // 3. Trending posts (weight: 0.5)
    trendingPosts, err := f.getTrendingPosts(ctx, 6*time.Hour)
    if err == nil {
        for _, post := range trendingPosts {
            score := f.calculateEngagementScore(post) * 0.5
            score = f.applyRecencyBoost(score, post.CreatedAt)
            scoredPosts = append(scoredPosts, ScoredPost{Post: post, Score: score})
        }
    }
    
    // 4. University-based posts (weight: 0.6)
    universityPosts, err := f.getUniversityPosts(ctx, userPrefs.UniversityDomain, 12*time.Hour)
    if err == nil {
        for _, post := range universityPosts {
            score := f.calculateEngagementScore(post) * 0.6
            score = f.applyRecencyBoost(score, post.CreatedAt)
            scoredPosts = append(scoredPosts, ScoredPost{Post: post, Score: score})
        }
    }
    
    // Sort by score and deduplicate
    sort.Slice(scoredPosts, func(i, j int) bool {
        return scoredPosts[i].Score > scoredPosts[j].Score
    })
    
    posts := f.deduplicateAndLimit(scoredPosts, limit)
    
    // Cache for 5 minutes
    postsJSON, _ := json.Marshal(posts)
    f.redis.Set(ctx, cacheKey, postsJSON, 5*time.Minute)
    
    return posts, nil
}

func (f *FeedGenerator) calculateEngagementScore(post Post) float64 {
    // Engagement score based on likes, shares, comments, and views
    likeWeight := 1.0
    shareWeight := 3.0
    commentWeight := 2.0
    viewWeight := 0.1
    
    score := float64(post.LikeCount)*likeWeight +
             float64(post.ShareCount)*shareWeight +
             float64(post.ReplyCount)*commentWeight +
             float64(post.ViewCount)*viewWeight
    
    // Normalize by follower count to prevent bias toward popular users
    if post.AuthorFollowerCount > 0 {
        score = score / math.Log10(float64(post.AuthorFollowerCount))
    }
    
    return score
}

func (f *FeedGenerator) applyRecencyBoost(score float64, createdAt time.Time) float64 {
    // Apply time decay: posts lose 50% of their score every 24 hours
    hoursOld := time.Since(createdAt).Hours()
    timeFactor := math.Pow(0.5, hoursOld/24.0)
    return score * timeFactor
}
```

**Day 21: Feed UI & Performance**
```typescript
// apps/web/src/components/feed/InfiniteFeed.tsx
export default function InfiniteFeed() {
  const { 
    data: feedPages, 
    fetchNextPage, 
    hasNextPage,
    isLoading 
  } = useInfiniteQuery({
    queryKey: ['feed'],
    queryFn: ({ pageParam = 0 }) => fetchFeed({ offset: pageParam, limit: 20 }),
    getNextPageParam: (lastPage, pages) => 
      lastPage.length === 20 ? pages.length * 20 : undefined,
  });
  
  const posts = feedPages?.pages.flatMap(page => page) ?? [];
  
  const { ref, inView } = useInView({
    threshold: 0,
    rootMargin: '100px',
  });
  
  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, fetchNextPage]);
  
  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
      
      {hasNextPage && (
        <div ref={ref} className="flex justify-center p-4">
          <Spinner />
        </div>
      )}
      
      {!hasNextPage && posts.length > 0 && (
        <div className="text-center text-gray-500 py-8">
          You've reached the end of your feed!
        </div>
      )}
    </div>
  );
}
```

#### Deliverables:
- [x] Complete post creation system
- [x] Media upload with compression
- [x] Hashtag and mention processing
- [x] Link preview generation
- [x] Advanced feed algorithm (Go service)
- [x] Infinite scroll feed UI
- [x] Feed caching and optimization

---

### **SPRINT 4: Real-time Messaging & Search (Week 7-8)**

#### Sprint Goal: Real-time chat and comprehensive search

**Day 22-25: Real-time Messaging (Bun + WebSocket)**
```typescript
// apps/realtime-service/src/websocket-server.ts
import { ServerWebSocket } from "bun";

interface WSData {
  userId: string;
  connectionId: string;
  rooms: Set<string>;
}

class ChitLaqRealtimeServer {
  private connections = new Map<string, ServerWebSocket<WSData>>();
  private rooms = new Map<string, Set<string>>();
  
  constructor() {
    this.server = Bun.serve<WSData>({
      port: 8080,
      fetch: this.handleHTTP.bind(this),
      websocket: {
        open: this.handleConnection.bind(this),
        message: this.handleMessage.bind(this),
        close: this.handleDisconnection.bind(this),
      },
    });
  }
  
  async handleConnection(ws: ServerWebSocket<WSData>) {
    // Authenticate user via JWT
    const token = ws.data.token;
    const user = await this.verifyJWT(token);
    
    if (!user) {
      ws.close(1008, "Authentication failed");
      return;
    }
    
    // Setup connection data
    const connectionId = crypto.randomUUID();
    ws.data = {
      userId: user.id,
      connectionId,
      rooms: new Set()
    };
    
    this.connections.set(connectionId, ws);
    
    // Join user's conversation rooms
    const conversations = await this.getUserConversations(user.id);
    for (const conv of conversations) {
      this.joinRoom(ws, `conversation:${conv.id}`);
    }
    
    // Send online status
    this.broadcastUserStatus(user.id, 'online');
    
    console.log(`User ${user.id} connected (${connectionId})`);
  }
  
  async handleMessage(ws: ServerWebSocket<WSData>, message: string | Buffer) {
    try {
      const data = JSON.parse(message.toString());
      
      switch (data.type) {
        case 'SEND_MESSAGE':
          await this.handleSendMessage(ws, data.payload);
          break;
        case 'JOIN_CONVERSATION':
          await this.handleJoinConversation(ws, data.payload);
          break;
        case 'TYPING_START':
          this.handleTypingIndicator(ws, data.payload, true);
          break;
        case 'TYPING_STOP':
          this.handleTypingIndicator(ws, data.payload, false);
          break;
        case 'READ_MESSAGE':
          await this.handleMessageRead(ws, data.payload);
          break;
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
      ws.send(JSON.stringify({
        type: 'ERROR',
        payload: { message: 'Invalid message format' }
      }));
    }
  }
  
  private async handleSendMessage(ws: ServerWebSocket<WSData>, payload: any) {
    const { conversationId, content, messageType = 'text', replyToId } = payload;
    
    // Verify user is member of conversation
    const isMember = await this.verifyConversationMembership(ws.data.userId, conversationId);
    if (!isMember) {
      throw new Error('Not a member of this conversation');
    }
    
    // Save message to database
    const message = await this.saveMessage({
      conversation_id: conversationId,
      sender_id: ws.data.userId,
      content,
      message_type: messageType,
      reply_to_id: replyToId
    });
    
    // Broadcast to conversation participants
    const roomKey = `conversation:${conversationId}`;
    this.broadcastToRoom(roomKey, {
      type: 'NEW_MESSAGE',
      payload: message
    }, ws.data.connectionId); // Exclude sender
    
    // Send delivery confirmation to sender
    ws.send(JSON.stringify({
      type: 'MESSAGE_DELIVERED',
      payload: { 
        tempId: payload.tempId,
        messageId: message.id,
        timestamp: message.created_at
      }
    }));
    
    // Update conversation's updated_at
    await this.updateConversationTimestamp(conversationId);
    
    // Send push notifications to offline users
    await this.sendPushNotifications(conversationId, message, ws.data.userId);
  }
  
  private async handleTypingIndicator(ws: ServerWebSocket<WSData>, payload: any, isTyping: boolean) {
    const { conversationId } = payload;
    const roomKey = `conversation:${conversationId}`;
    
    this.broadcastToRoom(roomKey, {
      type: isTyping ? 'USER_TYPING' : 'USER_STOPPED_TYPING',
      payload: {
        userId: ws.data.userId,
        conversationId
      }
    }, ws.data.connectionId);
  }
  
  private broadcastToRoom(roomKey: string, message: any, excludeConnectionId?: string) {
    const connections = this.rooms.get(roomKey);
    if (!connections) return;
    
    const messageStr = JSON.stringify(message);
    connections.forEach(connectionId => {
      if (connectionId !== excludeConnectionId) {
        const ws = this.connections.get(connectionId);
        if (ws && ws.readyState === 1) {
          ws.send(messageStr);
        }
      }
    });
  }
}
```

**Day 26-27: Search System (Rust + Actix)**
```rust
// apps/search-service/src/search_engine.rs
use actix_web::{web, HttpResponse, Result};
use serde::{Deserialize, Serialize};
use sqlx::{PgPool, Row};
use std::time::Instant;

#[derive(Deserialize)]
pub struct SearchQuery {
    q: String,
    #[serde(rename = "type")]
    search_type: Option<SearchType>,
    limit: Option<i32>,
    offset: Option<i32>,
    filters: Option<SearchFilters>,
}

#[derive(Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SearchType {
    Users,
    Posts,
    Hashtags,
    All,
}

#[derive(Deserialize)]
pub struct SearchFilters {
    university: Option<String>,
    date_range: Option<DateRange>,
    verified_only: Option<bool>,
}

#[derive(Serialize)]
pub struct SearchResults {
    users: Vec<UserSearchResult>,
    posts: Vec<PostSearchResult>,
    hashtags: Vec<HashtagSearchResult>,
    total_count: i32,
    execution_time_ms: u64,
    suggestions: Vec<String>,
}

pub async fn search(
    query: web::Query<SearchQuery>,
    pool: web::Data<PgPool>,
) -> Result<HttpResponse> {
    let start_time = Instant::now();
    let search_term = query.q.trim();
    
    if search_term.is_empty() {
        return Ok(HttpResponse::BadRequest().json("Search query cannot be empty"));
    }
    
    // Execute searches in parallel
    let (users_result, posts_result, hashtags_result) = tokio::join!(
        search_users(&pool, search_term, &query),
        search_posts(&pool, search_term, &query),
        search_hashtags(&pool, search_term, &query)
    );
    
    let users = users_result.unwrap_or_default();
    let posts = posts_result.unwrap_or_default();
    let hashtags = hashtags_result.unwrap_or_default();
    
    // Generate search suggestions
    let suggestions = if users.is_empty() && posts.is_empty() && hashtags.is_empty() {
        generate_suggestions(&pool, search_term).await.unwrap_or_default()
    } else {
        Vec::new()
    };
    
    let execution_time = start_time.elapsed().as_millis() as u64;
    
    Ok(HttpResponse::Ok().json(SearchResults {
        users,
        posts,
        hashtags,
        total_count: calculate_total_count(&users, &posts, &hashtags),
        execution_time_ms: execution_time,
        suggestions,
    }))
}

async fn search_users(
    pool: &PgPool,
    query: &str,
    search_params: &SearchQuery,
) -> Result<Vec<UserSearchResult>, sqlx::Error> {
    let limit = search_params.limit.unwrap_or(10).min(50);
    let offset = search_params.offset.unwrap_or(0);
    
    let mut sql = String::from(r#"
        SELECT 
            p.id,
            p.username,
            p.display_name,
            p.bio,
            p.avatar_url,
            p.is_verified,
            p.university_domain,
            (
                ts_rank(
                    to_tsvector('english', p.username || ' ' || p.display_name || ' ' || COALESCE(p.bio, '')),
                    plainto_tsquery('english', $1)
                ) +
                similarity(p.username, $1) * 2 +
                similarity(p.display_name, $1)
            ) as rank,
            (SELECT COUNT(*) FROM follows WHERE followee_id = p.id) as follower_count
        FROM user_profiles p
        WHERE 
            (
                to_tsvector('english', p.username || ' ' || p.display_name || ' ' || COALESCE(p.bio, '')) 
                @@ plainto_tsquery('english', $1)
                OR similarity(p.username, $1) > 0.3
                OR similarity(p.display_name, $1) > 0.2
                OR p.username ILIKE '%' || $1 || '%'
                OR p.display_name ILIKE '%' || $1 || '%'
            )
            AND NOT p.is_private
    "#);
    
    let mut param_count = 1;
    
    // Add filters
    if let Some(filters) = &search_params.filters {
        if let Some(university) = &filters.university {
            param_count += 1;
            sql.push_str(&format!(" AND p.university_domain = ${}", param_count));
        }
        
        if filters.verified_only == Some(true) {
            sql.push_str(" AND p.is_verified = true");
        }
    }
    
    sql.push_str(" ORDER BY rank DESC, follower_count DESC");
    sql.push_str(&format!(" LIMIT {} OFFSET {}", limit, offset));
    
    let mut query_builder = sqlx::query(&sql).bind(query);
    
    // Bind filter parameters
    if let Some(filters) = &search_params.filters {
        if let Some(university) = &filters.university {
            query_builder = query_builder.bind(university);
        }
    }
    
    let rows = query_builder.fetch_all(pool).await?;
    
    let results = rows.into_iter().map(|row| UserSearchResult {
        id: row.get("id"),
        username: row.get("username"),
        display_name: row.get("display_name"),
        bio: row.get("bio"),
        avatar_url: row.get("avatar_url"),
        is_verified: row.get("is_verified"),
        university_domain: row.get("university_domain"),
        follower_count: row.get("follower_count"),
        relevance_score: row.get::<f64, _>("rank"),
    }).collect();
    
    Ok(results)
}

async fn search_posts(
    pool: &PgPool,
    query: &str,
    search_params: &SearchQuery,
) -> Result<Vec<PostSearchResult>, sqlx::Error> {
    let limit = search_params.limit.unwrap_or(20).min(100);
    let offset = search_params.offset.unwrap_or(0);
    
    let sql = r#"
        SELECT 
            p.id,
            p.content,
            p.hashtags,
            p.like_count,
            p.share_count,
            p.reply_count,
            p.created_at,
            up.username,
            up.display_name,
            up.avatar_url,
            up.is_verified,
            ts_rank(
                to_tsvector('english', p.content),
                plainto_tsquery('english', $1)
            ) as rank
        FROM posts p
        JOIN user_profiles up ON p.author_id = up.id
        WHERE 
            (
                to_tsvector('english', p.content) @@ plainto_tsquery('english', $1)
                OR $1 = ANY(p.hashtags)
                OR EXISTS (
                    SELECT 1 FROM unnest(p.hashtags) as hashtag 
                    WHERE similarity(hashtag, $1) > 0.5
                )
            )
            AND p.visibility = 'public'
            AND NOT p.is_deleted
        ORDER BY rank DESC, p.created_at DESC
        LIMIT $2 OFFSET $3
    "#;
    
    let rows = sqlx::query(sql)
        .bind(query)
        .bind(limit)
        .bind(offset)
        .fetch_all(pool)
        .await?;
    
    let results = rows.into_iter().map(|row| PostSearchResult {
        id: row.get("id"),
        content: row.get("content"),
        hashtags: row.get("hashtags"),
        like_count: row.get("like_count"),
        share_count: row.get("share_count"),
        reply_count: row.get("reply_count"),
        created_at: row.get("created_at"),
        author: AuthorInfo {
            username: row.get("username"),
            display_name: row.get("display_name"),
            avatar_url: row.get("avatar_url"),
            is_verified: row.get("is_verified"),
        },
        relevance_score: row.get::<f64, _>("rank"),
    }).collect();
    
    Ok(results)
}
```

**Day 28: Search UI & Integration**
```typescript
// apps/web/src/components/search/SearchPage.tsx
export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'users' | 'posts' | 'hashtags'>('all');
  const [filters, setFilters] = useState<SearchFilters>({});
  
  const { 
    data: searchResults, 
    isLoading,
    error 
  } = useSearchQuery({ query, type: activeTab, filters });
  
  const debouncedQuery = useDebounce(query, 300);
  
  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder="Search users, posts, or hashtags..."
        suggestions={searchResults?.suggestions}
      />
      
      <SearchTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        counts={{
          users: searchResults?.users.length,
          posts: searchResults?.posts.length,
          hashtags: searchResults?.hashtags.length
        }}
      />
      
      <SearchFilters
        filters={filters}
        onFiltersChange={setFilters}
        universities={availableUniversities}
      />
      
      <SearchResults
        results={searchResults}
        isLoading={isLoading}
        error={error}
        activeTab={activeTab}
        query={debouncedQuery}
      />
    </div>
  );
}
```

#### Deliverables:
- [x] Ultra-fast WebSocket messaging (Bun)
- [x] Real-time typing indicators
- [x] Message history with pagination
- [x] File sharing in messages
- [x] High-performance search (Rust)
- [x] Advanced search filters
- [x] Search suggestions and autocomplete

---

### **SPRINT 5: Notifications & Analytics (Week 9-10)**

#### Sprint Goal: Comprehensive notification system and analytics

**Day 29-31: Notification System**
```typescript
// apps/notification-service/src/notification-manager.ts
export class NotificationManager {
  async sendNotification(notification: CreateNotificationData): Promise<void> {
    // Save notification to database
    const savedNotification = await this.saveNotification(notification);
    
    // Get user preferences
    const preferences = await this.getUserNotificationPreferences(notification.userId);
    const typePrefs = preferences.find(p => p.type === notification.type);
    
    if (!typePrefs) return;
    
    // Send via enabled channels
    const promises = [];
    
    if (typePrefs.in_app_enabled) {
      promises.push(this.sendInAppNotification(savedNotification));
    }
    
    if (typePrefs.push_enabled) {
      promises.push(this.sendPushNotification(savedNotification));
    }
    
    if (typePrefs.email_enabled && this.isHighPriorityNotification(notification.type)) {
      promises.push(this.sendEmailNotification(savedNotification));
    }
    
    await Promise.allSettled(promises);
    
    // Update analytics
    await this.trackNotificationSent(notification.type);
  }
  
  private async sendPushNotification(notification: UserNotification): Promise<void> {
    // Get user's push subscriptions
    const subscriptions = await this.getUserPushSubscriptions(notification.user_id);
    
    const payload = {
      title: notification.title,
      body: notification.message,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      data: {
        url: notification.action_url,
        notificationId: notification.id
      },
      actions: [
        { action: 'open', title: 'Open' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    };
    
    const promises = subscriptions.map(subscription => 
      webpush.sendNotification(subscription, JSON.stringify(payload))
        .catch(err => {
          console.error('Push notification failed:', err);
          // Remove invalid subscription
          if (err.statusCode === 410) {
            this.removePushSubscription(subscription.id);
          }
        })
    );
    
    await Promise.allSettled(promises);
  }
  
  async subscribeToNotifications(userId: string, subscription: PushSubscription): Promise<void> {
    // Validate subscription
    if (!subscription.endpoint || !subscription.keys) {
      throw new Error('Invalid push subscription');
    }
    
    // Save subscription to database
    await this.supabase
      .from('push_subscriptions')
      .upsert({
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh_key: subscription.keys.p256dh,
        auth_key: subscription.keys.auth,
        created_at: new Date().toISOString()
      });
  }
}
```

**Day 32-33: Analytics System**
```typescript
// apps/analytics-service/src/analytics-manager.ts
export class AnalyticsManager {
  private eventBuffer: AnalyticsEvent[] = [];
  private readonly BUFFER_SIZE = 1000;
  private readonly FLUSH_INTERVAL = 30000; // 30 seconds
  
  constructor() {
    // Auto-flush buffer periodically
    setInterval(() => this.flushBuffer(), this.FLUSH_INTERVAL);
  }
  
  async trackEvent(event: AnalyticsEvent): Promise<void> {
    // Add session and device info
    const enrichedEvent = {
      ...event,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      ip_address: this.getClientIP(),
      user_agent: this.getUserAgent(),
      session_id: this.getSessionId()
    };
    
    this.eventBuffer.push(enrichedEvent);
    
    // Flush if buffer is full
    if (this.eventBuffer.length >= this.BUFFER_SIZE) {
      await this.flushBuffer();
    }
  }
  
  private async flushBuffer(): Promise<void> {
    if (this.eventBuffer.length === 0) return;
    
    const events = [...this.eventBuffer];
    this.eventBuffer = [];
    
    try {
      // Batch insert to database
      await this.supabase
        .from('user_events')
        .insert(events);
      
      // Update real-time metrics
      await this.updateRealtimeMetrics(events);
      
    } catch (error) {
      console.error('Failed to flush analytics buffer:', error);
      // Re-add events to buffer for retry
      this.eventBuffer.unshift(...events);
    }
  }
  
  async generateDailyStats(date: Date): Promise<DailyStats> {
    const dateStr = date.toISOString().split('T')[0];
    
    // Run analytics queries in parallel
    const [
      dailyActiveUsers,
      newUsers,
      totalPosts,
      totalMessages,
      totalLikes,
      topHashtags,
      engagementMetrics
    ] = await Promise.all([
      this.getDailyActiveUsers(dateStr),
      this.getNewUsers(dateStr),
      this.getTotalPosts(dateStr),
      this.getTotalMessages(dateStr),
      this.getTotalLikes(dateStr),
      this.getTopHashtags(dateStr),
      this.getEngagementMetrics(dateStr)
    ]);
    
    const stats = {
      date: dateStr,
      daily_active_users: dailyActiveUsers,
      new_users: newUsers,
      total_posts: totalPosts,
      total_messages: totalMessages,
      total_likes: totalLikes,
      top_hashtags: topHashtags,
      engagement_rate: engagementMetrics.rate,
      average_session_duration: engagementMetrics.avgSessionDuration,
      updated_at: new Date()
    };
    
    // Save to database
    await this.supabase
      .from('daily_stats')
      .upsert(stats);
    
    return stats;
  }
  
  async getRealtimeMetrics(): Promise<RealtimeMetrics> {
    const [
      activeConnections,
      messagesPerMinute,
      postsPerMinute,
      currentOnlineUsers
    ] = await Promise.all([
      this.getActiveConnections(),
      this.getMessagesPerMinute(),
      this.getPostsPerMinute(),
      this.getCurrentOnlineUsers()
    ]);
    
    return {
      active_connections: activeConnections,
      messages_per_minute: messagesPerMinute,
      posts_per_minute: postsPerMinute,
      online_users: currentOnlineUsers,
      timestamp: new Date()
    };
  }
}
```

**Day 34-35: Monitoring Dashboard**
```typescript
// apps/admin/src/components/analytics/AnalyticsDashboard.tsx
export default function AnalyticsDashboard() {
  const { data: realtimeMetrics } = useQuery({
    queryKey: ['realtime-metrics'],
    queryFn: fetchRealtimeMetrics,
    refetchInterval: 5000, // Update every 5 seconds
  });
  
  const { data: dailyStats } = useQuery({
    queryKey: ['daily-stats'],
    queryFn: () => fetchDailyStats(30), // Last 30 days
  });
  
  return (
    <div className="space-y-6">
      {/* Real-time metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Online Users"
          value={realtimeMetrics?.online_users}
          icon={<UsersIcon />}
          trend={calculateTrend(realtimeMetrics?.online_users)}
        />
        <MetricCard
          title="Messages/Min"
          value={realtimeMetrics?.messages_per_minute}
          icon={<MessageIcon />}
          trend={calculateTrend(realtimeMetrics?.messages_per_minute)}
        />
        <MetricCard
          title="Posts/Min"
          value={realtimeMetrics?.posts_per_minute}
          icon={<DocumentIcon />}
          trend={calculateTrend(realtimeMetrics?.posts_per_minute)}
        />
        <MetricCard
          title="Active Connections"
          value={realtimeMetrics?.active_connections}
          icon={<GlobeIcon />}
          trend={calculateTrend(realtimeMetrics?.active_connections)}
        />
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UserGrowthChart data={dailyStats} />
        <EngagementChart data={dailyStats} />
        <TopHashtagsChart data={dailyStats} />
        <UniversityBreakdownChart data={dailyStats} />
      </div>
      
      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopUsersTable />
        <RecentActivityTable />
      </div>
    </div>
  );
}
```

#### Deliverables:
- [x] Complete notification system (in-app, push, email)
- [x] Notification preferences management
- [x] Comprehensive analytics tracking
- [x] Real-time metrics dashboard
- [x] Daily stats generation
- [x] Performance monitoring integration

---

### **SPRINT 6: Monetization & Admin Panel (Week 11-12)**

#### Sprint Goal: Revenue generation and admin tools

**Day 36-38: Google Ads Integration**
```typescript
// apps/web/src/components/ads/AdManager.tsx
export class AdManager {
  private static instance: AdManager;
  private adUnits: Map<string, AdUnit> = new Map();
  private impressionTracking: Map<string, number> = new Map();
  
  static getInstance(): AdManager {
    if (!AdManager.instance) {
      AdManager.instance = new AdManager();
    }
    return AdManager.instance;
  }
  
  async initializeAds(userId?: string): Promise<void> {
    // Load Google AdSense script
    if (!document.querySelector('script[src*="adsbygoogle"]')) {
      const script = document.createElement('script');
      script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-YOUR_PUBLISHER_ID';
      script.async = true;
      script.crossOrigin = 'anonymous';
      document.head.appendChild(script);
    }
    
    // Wait for script to load
    await this.waitForAdSense();
    
    // Configure ad targeting based on user data
    if (userId) {
      await this.setupPersonalizedAds(userId);
    }
  }
  
  async displayAd(containerId: string, adConfig: AdConfig): Promise<void> {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Ad container ${containerId} not found`);
      return;
    }
    
    // Check ad frequency capping
    if (!this.canShowAd(adConfig.adUnitId)) {
      return;
    }
    
    // Create ad element
    const adElement = document.createElement('ins');
    adElement.className = 'adsbygoogle';
    adElement.style.display = 'block';
    adElement.setAttribute('data-ad-client', 'ca-pub-YOUR_PUBLISHER_ID');
    adElement.setAttribute('data-ad-slot', adConfig.adUnitId);
    adElement.setAttribute('data-ad-format', adConfig.format);
    
    if (adConfig.responsive) {
      adElement.setAttribute('data-full-width-responsive', 'true');
    }
    
    container.appendChild(adElement);
    
    try {
      // Push ad to AdSense
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      
      // Track impression
      this.trackAdImpression(adConfig.adUnitId);
      
      // Track analytics
      await this.trackAdEvent('impression', {
        adUnitId: adConfig.adUnitId,
        placement: adConfig.placement,
        format: adConfig.format
      });
      
    } catch (error) {
      console.error('Failed to display ad:', error);
      this.handleAdError(containerId, error);
    }
  }
  
  private canShowAd(adUnitId: string): boolean {
    const impressions = this.impressionTracking.get(adUnitId) || 0;
    const maxImpressions = this.getMaxImpressions(adUnitId);
    
    return impressions < maxImpressions;
  }
  
  private async setupPersonalizedAds(userId: string): Promise<void> {
    try {
      // Get user interests and demographics (privacy-compliant)
      const userProfile = await this.getUserAdProfile(userId);
      
      // Configure targeting (without PII)
      const targeting = {
        interests: userProfile.interests,
        ageRange: this.getAgeRange(userProfile.birthYear),
        university: userProfile.universityType, // e.g., 'technical', 'liberal-arts'
        location: userProfile.country
      };
      
      // Apply targeting to future ad requests
      this.setAdTargeting(targeting);
      
    } catch (error) {
      console.error('Failed to setup personalized ads:', error);
      // Fall back to contextual advertising
    }
  }
}

// Feed ad component
export function FeedAd({ position }: { position: number }) {
  const adId = `feed-ad-${position}`;
  const adManager = AdManager.getInstance();
  
  useEffect(() => {
    const timer = setTimeout(() => {
      adManager.displayAd(adId, {
        adUnitId: '1234567890', // Your ad unit ID
        format: 'fluid',
        placement: 'feed',
        responsive: true
      });
    }, 1000); // Delay to improve user experience
    
    return () => clearTimeout(timer);
  }, [adId]);
  
  return (
    <div className="my-4 p-4 border-2 border-dashed border-gray-200 rounded-lg">
      <div className="text-xs text-gray-500 mb-2">Advertisement</div>
      <div id={adId} className="min-h-[200px]" />
    </div>
  );
}
```

**Day 39-41: Admin Panel (TailAdmin)**
```typescript
// apps/admin/src/components/moderation/ModerationDashboard.tsx
export default function ModerationDashboard() {
  const [activeTab, setActiveTab] = useState<'reports' | 'users' | 'posts' | 'actions'>('reports');
  const { data: pendingReports } = useQuery({
    queryKey: ['pending-reports'],
    queryFn: fetchPendingReports,
  });
  
  const { data: flaggedContent } = useQuery({
    queryKey: ['flagged-content'],
    queryFn: fetchFlaggedContent,
  });
  
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Content Moderation</h1>
        <p className="text-gray-600">Manage reports, users, and content</p>
      </div>
      
      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatsCard
          title="Pending Reports"
          value={pendingReports?.length || 0}
          icon={<ExclamationTriangleIcon />}
          color="yellow"
        />
        <StatsCard
          title="Active Users"
          value="12,456"
          icon={<UsersIcon />}
          color="green"
        />
        <StatsCard
          title="Flagged Posts"
          value={flaggedContent?.posts?.length || 0}
          icon={<FlagIcon />}
          color="red"
        />
        <StatsCard
          title="Mod Actions Today"
          value="23"
          icon={<ShieldCheckIcon />}
          color="blue"
        />
      </div>
      
      {/* Tabs */}
      <Tabs activeTab={activeTab} onTabChange={setActiveTab}>
        <Tab name="reports" title="Reports">
          <ReportsTable reports={pendingReports} />
        </Tab>
        <Tab name="users" title="Users">
          <UsersManagementTable />
        </Tab>
        <Tab name="posts" title="Posts">
          <PostModerationTable posts={flaggedContent?.posts} />
        </Tab>
        <Tab name="actions" title="Actions">
          <ModerationActionsTable />
        </Tab>
      </Tabs>
    </div>
  );
}

// User management component
export function UserManagementActions({ user }: { user: User }) {
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState<string | null>(null);
  
  const handleModerationAction = async (action: ModerationAction, reason: string, duration?: string) => {
    setIsLoading(true);
    
    try {
      await fetch('/api/admin/moderation/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType: 'user',
          targetId: user.id,
          actionType: action,
          reason,
          duration
        })
      });
      
      toast.success(`User ${action} successfully`);
      
    } catch (error) {
      toast.error(`Failed to ${action} user`);
    } finally {
      setIsLoading(false);
      setShowConfirmModal(null);
    }
  };
  
  return (
    <div className="flex space-x-2">
      <Button
        variant="warning"
        size="sm"
        onClick={() => setShowConfirmModal('warn')}
        disabled={isLoading}
      >
        Warn
      </Button>
      
      <Button
        variant="danger"
        size="sm"
        onClick={() => setShowConfirmModal('suspend')}
        disabled={isLoading}
      >
        Suspend
      </Button>
      
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setShowConfirmModal('ban')}
        disabled={isLoading}
      >
        Ban
      </Button>
      
      {showConfirmModal && (
        <ModerationActionModal
          action={showConfirmModal}
          user={user}
          onConfirm={handleModerationAction}
          onCancel={() => setShowConfirmModal(null)}
        />
      )}
    </div>
  );
}
```

**Day 42: Testing & Polish**
```typescript
// Comprehensive testing suite
describe('ChitLaq M1 MVP Integration Tests', () => {
  describe('Authentication Flow', () => {
    it('should complete university email signup', async () => {
      const testEmail = 'cs_test2024@hacettepe.edu.tr';
      
      // Test email validation
      const validation = await validateUniversityEmail(testEmail);
      expect(validation.isValid).toBe(true);
      
      // Test signup process
      const response = await request(app)
        .post('/auth/signup')
        .send({ email: testEmail, password: 'TestPass123!' });
      
      expect(response.status).toBe(200);
      expect(response.body.message).toContain('verification email sent');
    });
  });
  
  describe('Real-time Messaging', () => {
    it('should deliver messages instantly', async () => {
      const { user1, user2 } = await setupTestUsers();
      const ws1 = await connectWebSocket(user1.token);
      const ws2 = await connectWebSocket(user2.token);
      
      const conversation = await createDirectConversation(user1.id, user2.id);
      
      // Send message from user1
      const message = 'Hello from integration test!';
      ws1.send(JSON.stringify({
        type: 'SEND_MESSAGE',
        payload: { conversationId: conversation.id, content: message }
      }));
      
      // Verify user2 receives the message
      const receivedMessage = await waitForWebSocketMessage(ws2);
      expect(receivedMessage.type).toBe('NEW_MESSAGE');
      expect(receivedMessage.payload.content).toBe(message);
    });
  });
  
  describe('Feed Algorithm', () => {
    it('should generate personalized feed', async () => {
      const user = await createTestUser();
      const followedUsers = await createTestUsersWithPosts(5);
      
      // User follows other users
      for (const followedUser of followedUsers) {
        await followUser(user.id, followedUser.id);
      }
      
      // Generate feed
      const feed = await generateFeed(user.id, 20);
      
      expect(feed.length).toBeGreaterThan(0);
      expect(feed.every(post => post.score > 0)).toBe(true);
      
      // Verify followed users' posts appear first
      const firstPost = feed[0];
      const isFromFollowedUser = followedUsers.some(u => u.id === firstPost.author_id);
      expect(isFromFollowedUser).toBe(true);
    });
  });
});
```

#### Deliverables:
- [x] Google AdSense integration with targeting
- [x] Ad frequency capping and optimization
- [x] Revenue tracking and analytics
- [x] Complete admin panel with TailAdmin
- [x] Content moderation tools
- [x] User management system
- [x] Comprehensive testing suite

---

## 📊 Performance Benchmarks & Success Metrics

### Technical Performance Targets
```typescript
// Performance monitoring configuration
export const PERFORMANCE_TARGETS = {
  api: {
    responseTime: { p95: 150, critical: 300 }, // milliseconds
    throughput: { min: 1000, target: 5000 }, // requests/second
    errorRate: { max: 1, critical: 5 }, // percentage
  },
  websocket: {
    latency: { p95: 100, critical: 200 }, // milliseconds
    connections: { target: 10000, max: 15000 },
    messageRate: { target: 50000, max: 100000 }, // messages/second
  },
  database: {
    queryTime: { p95: 50, critical: 100 }, // milliseconds
    connections: { max: 200, critical: 250 },
    replication_lag: { max: 1000 }, // milliseconds
  },
  search: {
    responseTime: { p95: 200, critical: 500 }, // milliseconds
    indexingDelay: { max: 30 }, // seconds
    accuracy: { min: 85 }, // percentage
  }
};
```

### Business Success Metrics
```typescript
export const BUSINESS_METRICS = {
  user_growth: {
    daily_signups: { target: 50, stretch: 100 },
    retention_day_7: { target: 60, stretch: 75 }, // percentage
    retention_day_30: { target: 40, stretch: 55 }, // percentage
  },
  engagement: {
    daily_active_users: { target: 2000, stretch: 5000 },
    posts_per_user_per_day: { target: 2, stretch: 4 },
    messages_per_user_per_day: { target: 10, stretch: 20 },
    session_duration: { target: 15, stretch: 25 }, // minutes
  },
  monetization: {
    ad_impressions_per_user: { target: 5, max: 15 },
    ad_click_rate: { target: 1.5, stretch: 2.5 }, // percentage
    revenue_per_user_per_month: { target: 0.50, stretch: 1.00 }, // USD
  }
};
```

---

## 🚀 Deployment & Launch Strategy

### Pre-Launch Checklist
```bash
#!/bin/bash
# scripts/pre-launch-checklist.sh

echo "🚀 ChitLaq M1 MVP Pre-Launch Checklist"

# Infrastructure checks
echo "📋 Infrastructure Validation..."
./scripts/check-infrastructure.sh
./scripts/validate-ssl.sh
./scripts/test-backups.sh

# Security audit
echo "🔒 Security Audit..."
./scripts/security-scan.sh
./scripts/validate-rls-policies.sh
./scripts/check-rate-limits.sh

# Performance testing
echo "⚡ Performance Testing..."
./scripts/load-test.sh
./scripts/stress-test-websockets.sh
./scripts/benchmark-search.sh

# Feature validation
echo "✨ Feature Validation..."
./scripts/test-auth-flow.sh
./scripts/test-messaging.sh
./scripts/test-feed-algorithm.sh
./scripts/test-admin-panel.sh

# Monitoring setup
echo "📊 Monitoring Setup..."
./scripts/configure-alerts.sh
./scripts/setup-dashboards.sh
./scripts/test-notifications.sh

echo "✅ Pre-launch checklist completed!"
```

### Soft Launch Plan
```markdown
Week 1: Internal Testing
- Team testing with 10 accounts
- Core functionality validation
- Performance baseline

Week 2: Closed Beta
- 50 selected university students
- Feature feedback collection
- Bug fixes and optimizations

Week 3: Limited University Launch
- 1-2 partner universities
- 500 student target
- Social media promotion

Week 4: Full Launch
- All supported universities
- Public announcement
- Press release and marketing
```

---

## 💡 Post-Launch Growth Strategy

### Month 1-3: Stabilization
- Bug fixes and performance optimization
- User feedback implementation
- Basic analytics and insights
- University partnership expansion

### Month 4-6: Feature Enhancement
- Group messaging
- Advanced search filters
- Mobile app development
- AI-powered content recommendations

### Month 7-12: Scale & Monetize
- Premium features
- Advanced analytics for universities
- Third-party integrations
- Enterprise partnerships

---

Bu comprehensive development plan ile ChitLaq M1 MVP'yi 12 hafta içinde $100/month budget ile successful bir şekilde launch edebiliriz. Her sprint detaylı implementation stratejileri, performance targets ve business metrics ile birlikte planlanmış durumda.

<function_calls>
<invoke name="todo_write">
<parameter name="merge">true
