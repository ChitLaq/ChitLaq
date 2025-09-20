# Profile Data Model Documentation

## Overview

This document describes the comprehensive data model for the ChitLaq user profile system, including user profiles, university profiles, privacy controls, and related entities.

## Table of Contents

1. [User Profile Model](#user-profile-model)
2. [University Profile Model](#university-profile-model)
3. [Privacy Settings Model](#privacy-settings-model)
4. [Data Access Request Model](#data-access-request-model)
5. [Privacy Audit Log Model](#privacy-audit-log-model)
6. [Database Schema](#database-schema)
7. [Relationships](#relationships)
8. [Indexes and Performance](#indexes-and-performance)
9. [Data Validation](#data-validation)
10. [Privacy Controls](#privacy-controls)
11. [API Endpoints](#api-endpoints)
12. [Examples](#examples)

## User Profile Model

### Core Profile Information

```typescript
interface UserProfile {
  // Primary identifiers
  userId: string;                    // UUID, primary key, references auth.users(id)
  username: string;                  // Unique username (3-50 chars, alphanumeric + underscore)
  displayName?: string;              // Display name (1-100 chars)
  bio?: string;                      // Biography (max 500 chars)
  profilePictureUrl?: string;        // URL to profile picture
  profileLink?: string;              // Custom profile link
  
  // University Data
  universityId?: string;             // Foreign key to UniversityProfile
  universityName?: string;           // Cached university name
  universityDomain?: string;         // Cached university domain
  universityPrefix?: string;         // Email prefix (e.g., "student", "alumni")
  graduationYear?: number;           // Expected graduation year
  
  // Academic Information
  major?: string;                    // Primary field of study
  minor?: string;                    // Secondary field of study
  department?: string;               // Academic department
  faculty?: string;                  // Academic faculty
  academicYear?: number;             // Current academic year (1-10)
  studentId?: string;                // University student ID
  
  // Contact Information
  email?: string;                    // Primary email (with privacy control)
  universityEmail?: string;          // University email (required)
  contactEmail?: string;             // Publicly visible contact email
  phone?: string;                    // Phone number (with privacy control)
  
  // Social Links
  linkedin?: string;                 // LinkedIn handle
  github?: string;                   // GitHub handle
  twitter?: string;                  // Twitter handle
  website?: string;                  // Personal website URL
  
  // Location Information
  city?: string;                     // City
  country?: string;                  // Country (ISO 2-letter code)
  timezone?: string;                 // Timezone (IANA format)
  
  // Profile Media
  profilePicture?: string;           // Profile picture URL
  coverPhoto?: string;               // Cover photo URL
  
  // Privacy Settings
  showEmail: boolean;                // Show email publicly
  showPhone: boolean;                // Show phone publicly
  showLocation: boolean;             // Show location publicly
  showAcademicInfo: boolean;         // Show academic info publicly
  showSocialLinks: boolean;          // Show social links publicly
  showProfilePicture: boolean;       // Show profile picture publicly
  showCoverPhoto: boolean;           // Show cover photo publicly
  allowDirectMessages: boolean;      // Allow direct messages
  allowFriendRequests: boolean;      // Allow friend requests
  allowProfileViews: boolean;        // Allow profile views
  showOnlineStatus: boolean;         // Show online status
  showLastSeen: boolean;             // Show last seen
  showActivityStatus: boolean;       // Show activity status
  allowSearchEngines: boolean;       // Allow search engine indexing
  allowDataCollection: boolean;      // Allow data collection
  allowAnalytics: boolean;           // Allow analytics
  allowMarketing: boolean;           // Allow marketing
  allowThirdPartySharing: boolean;   // Allow third-party sharing
  dataRetentionPeriod: number;       // Data retention period in days
  
  // Visibility Levels
  profileVisibility: 'public' | 'university' | 'friends' | 'private';
  contactVisibility: 'public' | 'university' | 'friends' | 'private';
  academicVisibility: 'public' | 'university' | 'friends' | 'private';
  socialVisibility: 'public' | 'university' | 'friends' | 'private';
  locationVisibility: 'public' | 'university' | 'friends' | 'private';
  activityVisibility: 'public' | 'university' | 'friends' | 'private';
  
  // Verification Status
  isEmailVerified: boolean;          // Email verification status
  isUniversityVerified: boolean;     // University verification status
  isProfileVerified: boolean;        // Manual admin verification
  
  // Activity Statistics
  postCount: number;                 // Number of posts
  followerCount: number;             // Number of followers
  followingCount: number;            // Number of following
  
  // Profile Completion
  profileCompletionScore: number;    // Completion score (0-100)
  
  // Timestamps
  createdAt: Date;                   // Profile creation timestamp
  updatedAt: Date;                   // Last update timestamp
}
```

### Profile Creation Interface

```typescript
interface IUserProfileCreation {
  displayName: string;               // Required
  universityEmail: string;           // Required
  username?: string;                 // Optional, auto-generated if not provided
  bio?: string;
  major?: string;
  academicYear?: number;
  graduationYear?: number;
  city?: string;
  country?: string;
  timezone?: string;
  profilePicture?: string;
  coverPhoto?: string;
  showEmail?: boolean;
  showPhone?: boolean;
  showLocation?: boolean;
  showAcademicInfo?: boolean;
  showSocialLinks?: boolean;
  showProfilePicture?: boolean;
  showCoverPhoto?: boolean;
  allowDirectMessages?: boolean;
  allowFriendRequests?: boolean;
  allowProfileViews?: boolean;
  showOnlineStatus?: boolean;
  showLastSeen?: boolean;
  showActivityStatus?: boolean;
  allowSearchEngines?: boolean;
  allowDataCollection?: boolean;
  allowAnalytics?: boolean;
  allowMarketing?: boolean;
  allowThirdPartySharing?: boolean;
  dataRetentionPeriod?: number;
  profileVisibility?: 'public' | 'university' | 'friends' | 'private';
  contactVisibility?: 'public' | 'university' | 'friends' | 'private';
  academicVisibility?: 'public' | 'university' | 'friends' | 'private';
  socialVisibility?: 'public' | 'university' | 'friends' | 'private';
  locationVisibility?: 'public' | 'university' | 'friends' | 'private';
  activityVisibility?: 'public' | 'university' | 'friends' | 'private';
}
```

### Profile Update Interface

```typescript
interface ProfileUpdateData {
  displayName?: string;
  bio?: string;
  major?: string;
  minor?: string;
  department?: string;
  faculty?: string;
  academicYear?: number;
  graduationYear?: number;
  studentId?: string;
  email?: string;
  contactEmail?: string;
  phone?: string;
  linkedin?: string;
  github?: string;
  twitter?: string;
  website?: string;
  city?: string;
  country?: string;
  timezone?: string;
  profilePicture?: string;
  coverPhoto?: string;
  showEmail?: boolean;
  showPhone?: boolean;
  showLocation?: boolean;
  showAcademicInfo?: boolean;
  showSocialLinks?: boolean;
  showProfilePicture?: boolean;
  showCoverPhoto?: boolean;
  allowDirectMessages?: boolean;
  allowFriendRequests?: boolean;
  allowProfileViews?: boolean;
  showOnlineStatus?: boolean;
  showLastSeen?: boolean;
  showActivityStatus?: boolean;
  allowSearchEngines?: boolean;
  allowDataCollection?: boolean;
  allowAnalytics?: boolean;
  allowMarketing?: boolean;
  allowThirdPartySharing?: boolean;
  dataRetentionPeriod?: number;
  profileVisibility?: 'public' | 'university' | 'friends' | 'private';
  contactVisibility?: 'public' | 'university' | 'friends' | 'private';
  academicVisibility?: 'public' | 'university' | 'friends' | 'private';
  socialVisibility?: 'public' | 'university' | 'friends' | 'private';
  locationVisibility?: 'public' | 'university' | 'friends' | 'private';
  activityVisibility?: 'public' | 'university' | 'friends' | 'private';
}
```

## University Profile Model

```typescript
interface UniversityProfile {
  // Primary identifiers
  id: string;                        // UUID, primary key
  name: string;                      // University name (unique)
  domain: string;                    // Email domain (unique, e.g., "example.edu")
  prefixes: string[];                // Allowed email prefixes (e.g., ["student", "alumni"])
  
  // Location Information
  country: string;                   // Country (ISO 2-letter code)
  state?: string;                    // State/Province
  city?: string;                     // City
  campusLocations?: string[];        // Campus locations
  
  // Academic Information
  academicCalendar?: {               // Academic calendar
    startMonth: number;              // Start month (1-12)
    endMonth: number;                // End month (1-12)
  };
  programs: string[];                // Available programs/majors
  departments: string[];             // Academic departments
  faculties: string[];               // Academic faculties
  
  // Admin Configuration
  approved: boolean;                 // Admin approval status
  status: 'active' | 'inactive' | 'pending'; // University status
  allowStudentNetworking: boolean;   // Allow student networking
  moderatorIds?: string[];           // University moderator IDs
  
  // Timestamps
  createdAt: Date;                   // Creation timestamp
  updatedAt: Date;                   // Last update timestamp
}
```

## Privacy Settings Model

```typescript
interface PrivacySettings {
  // Contact Information Privacy
  showEmail: boolean;                // Show email publicly
  showPhone: boolean;                // Show phone publicly
  
  // Location Privacy
  showLocation: boolean;             // Show location publicly
  
  // Academic Information Privacy
  showAcademicInfo: boolean;         // Show academic info publicly
  
  // Social Links Privacy
  showSocialLinks: boolean;          // Show social links publicly
  
  // Profile Media Privacy
  showProfilePicture: boolean;       // Show profile picture publicly
  showCoverPhoto: boolean;           // Show cover photo publicly
  
  // Communication Privacy
  allowDirectMessages: boolean;      // Allow direct messages
  allowFriendRequests: boolean;      // Allow friend requests
  allowProfileViews: boolean;        // Allow profile views
  
  // Activity Privacy
  showOnlineStatus: boolean;         // Show online status
  showLastSeen: boolean;             // Show last seen
  showActivityStatus: boolean;       // Show activity status
  
  // Data Privacy
  allowSearchEngines: boolean;       // Allow search engine indexing
  allowDataCollection: boolean;      // Allow data collection
  allowAnalytics: boolean;           // Allow analytics
  allowMarketing: boolean;           // Allow marketing
  allowThirdPartySharing: boolean;   // Allow third-party sharing
  dataRetentionPeriod: number;       // Data retention period in days
  
  // Visibility Levels
  profileVisibility: 'public' | 'university' | 'friends' | 'private';
  contactVisibility: 'public' | 'university' | 'friends' | 'private';
  academicVisibility: 'public' | 'university' | 'friends' | 'private';
  socialVisibility: 'public' | 'university' | 'friends' | 'private';
  locationVisibility: 'public' | 'university' | 'friends' | 'private';
  activityVisibility: 'public' | 'university' | 'friends' | 'private';
}
```

## Data Access Request Model

```typescript
interface DataAccessRequest {
  id: string;                        // UUID, primary key
  requesterId: string;               // User requesting access
  requestedData: string[];           // Types of data requested
  purpose: string;                   // Purpose of data access
  status: 'pending' | 'approved' | 'denied' | 'expired';
  requestedAt: Date;                 // Request timestamp
  respondedAt?: Date;                // Response timestamp
  expiresAt: Date;                   // Expiration timestamp
  reason?: string;                   // Reason for approval/denial
}
```

## Privacy Audit Log Model

```typescript
interface PrivacyAuditLog {
  id: string;                        // UUID, primary key
  userId: string;                    // User whose data was accessed
  action: string;                    // Action performed
  dataAccessed: string[];            // Types of data accessed
  timestamp: Date;                   // Access timestamp
  ipAddress: string;                 // IP address of requester
  userAgent: string;                 // User agent of requester
  reason: string;                    // Reason for access
}
```

## Database Schema

### User Profiles Table

```sql
CREATE TABLE user_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT,
    bio TEXT,
    profile_picture_url TEXT,
    profile_link TEXT,
    
    -- University Data
    university_id UUID REFERENCES university_profiles(id) ON DELETE SET NULL,
    university_name TEXT,
    university_domain TEXT,
    university_prefix TEXT,
    graduation_year INT,
    
    -- Academic Information
    major TEXT,
    minor TEXT,
    department TEXT,
    faculty TEXT,
    academic_year INT,
    student_id TEXT,
    
    -- Contact Information
    email TEXT,
    university_email TEXT,
    contact_email TEXT,
    phone TEXT,
    
    -- Social Links
    linkedin TEXT,
    github TEXT,
    twitter TEXT,
    website TEXT,
    
    -- Location Information
    city TEXT,
    country TEXT,
    timezone TEXT,
    
    -- Profile Media
    profile_picture TEXT,
    cover_photo TEXT,
    
    -- Privacy Settings
    show_email BOOLEAN DEFAULT FALSE,
    show_phone BOOLEAN DEFAULT FALSE,
    show_location BOOLEAN DEFAULT TRUE,
    show_academic_info BOOLEAN DEFAULT TRUE,
    show_social_links BOOLEAN DEFAULT TRUE,
    show_profile_picture BOOLEAN DEFAULT TRUE,
    show_cover_photo BOOLEAN DEFAULT TRUE,
    allow_direct_messages BOOLEAN DEFAULT TRUE,
    allow_friend_requests BOOLEAN DEFAULT TRUE,
    allow_profile_views BOOLEAN DEFAULT TRUE,
    show_online_status BOOLEAN DEFAULT TRUE,
    show_last_seen BOOLEAN DEFAULT TRUE,
    show_activity_status BOOLEAN DEFAULT TRUE,
    allow_search_engines BOOLEAN DEFAULT FALSE,
    allow_data_collection BOOLEAN DEFAULT TRUE,
    allow_analytics BOOLEAN DEFAULT TRUE,
    allow_marketing BOOLEAN DEFAULT FALSE,
    allow_third_party_sharing BOOLEAN DEFAULT FALSE,
    data_retention_period INT DEFAULT 365,
    
    -- Visibility Levels
    profile_visibility TEXT DEFAULT 'university' CHECK (profile_visibility IN ('public', 'university', 'friends', 'private')),
    contact_visibility TEXT DEFAULT 'university' CHECK (contact_visibility IN ('public', 'university', 'friends', 'private')),
    academic_visibility TEXT DEFAULT 'university' CHECK (academic_visibility IN ('public', 'university', 'friends', 'private')),
    social_visibility TEXT DEFAULT 'university' CHECK (social_visibility IN ('public', 'university', 'friends', 'private')),
    location_visibility TEXT DEFAULT 'university' CHECK (location_visibility IN ('public', 'university', 'friends', 'private')),
    activity_visibility TEXT DEFAULT 'university' CHECK (activity_visibility IN ('public', 'university', 'friends', 'private')),
    
    -- Verification Status
    is_email_verified BOOLEAN DEFAULT FALSE,
    is_university_verified BOOLEAN DEFAULT FALSE,
    is_profile_verified BOOLEAN DEFAULT FALSE,
    
    -- Activity Statistics
    post_count INT DEFAULT 0,
    follower_count INT DEFAULT 0,
    following_count INT DEFAULT 0,
    
    -- Profile Completion
    profile_completion_score INT DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT username_min_length CHECK (LENGTH(username) >= 3),
    CONSTRAINT username_max_length CHECK (LENGTH(username) <= 50),
    CONSTRAINT username_valid_chars CHECK (username ~ '^[a-zA-Z0-9_]+$'),
    CONSTRAINT display_name_min_length CHECK (LENGTH(display_name) >= 1),
    CONSTRAINT display_name_max_length CHECK (LENGTH(display_name) <= 100),
    CONSTRAINT bio_max_length CHECK (LENGTH(bio) <= 500),
    CONSTRAINT academic_year_range CHECK (academic_year >= 1 AND academic_year <= 10),
    CONSTRAINT graduation_year_range CHECK (graduation_year >= 1950 AND graduation_year <= 2100),
    CONSTRAINT profile_completion_score_range CHECK (profile_completion_score >= 0 AND profile_completion_score <= 100)
);
```

### University Profiles Table

```sql
CREATE TABLE university_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    domain TEXT NOT NULL UNIQUE,
    prefixes TEXT[] DEFAULT ARRAY[]::TEXT[],
    country TEXT NOT NULL,
    state TEXT,
    city TEXT,
    campus_locations TEXT[] DEFAULT ARRAY[]::TEXT[],
    academic_calendar JSONB,
    programs TEXT[] DEFAULT ARRAY[]::TEXT[],
    departments TEXT[] DEFAULT ARRAY[]::TEXT[],
    faculties TEXT[] DEFAULT ARRAY[]::TEXT[],
    approved BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('active', 'inactive', 'pending')),
    allow_student_networking BOOLEAN DEFAULT TRUE,
    moderator_ids UUID[] DEFAULT ARRAY[]::UUID[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Data Access Requests Table

```sql
CREATE TABLE data_access_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    requested_data TEXT[] NOT NULL,
    purpose TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'expired')),
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Privacy Audit Logs Table

```sql
CREATE TABLE privacy_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    data_accessed TEXT[] NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET NOT NULL,
    user_agent TEXT NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Relationships

### Primary Relationships

1. **User Profile → Auth User**: One-to-one relationship via `user_id`
2. **User Profile → University Profile**: Many-to-one relationship via `university_id`
3. **Data Access Request → Auth User**: Many-to-one relationship via `requester_id`
4. **Privacy Audit Log → Auth User**: Many-to-one relationship via `user_id`

### Foreign Key Constraints

- `user_profiles.user_id` → `auth.users.id` (CASCADE DELETE)
- `user_profiles.university_id` → `university_profiles.id` (SET NULL)
- `data_access_requests.requester_id` → `auth.users.id` (CASCADE DELETE)
- `privacy_audit_logs.user_id` → `auth.users.id` (CASCADE DELETE)

## Indexes and Performance

### Primary Indexes

```sql
-- User Profiles
CREATE INDEX idx_user_profiles_username ON user_profiles (username);
CREATE INDEX idx_user_profiles_university_id ON user_profiles (university_id);
CREATE INDEX idx_user_profiles_is_public_profile ON user_profiles (profile_visibility);
CREATE INDEX idx_user_profiles_major ON user_profiles (major);
CREATE INDEX idx_user_profiles_academic_year ON user_profiles (academic_year);
CREATE INDEX idx_user_profiles_graduation_year ON user_profiles (graduation_year);
CREATE INDEX idx_user_profiles_created_at ON user_profiles (created_at);

-- University Profiles
CREATE INDEX idx_university_profiles_domain ON university_profiles (domain);
CREATE INDEX idx_university_profiles_name ON university_profiles (name);
CREATE INDEX idx_university_profiles_approved ON university_profiles (approved);
CREATE INDEX idx_university_profiles_status ON university_profiles (status);

-- Data Access Requests
CREATE INDEX idx_data_access_requests_requester_id ON data_access_requests (requester_id);
CREATE INDEX idx_data_access_requests_status ON data_access_requests (status);
CREATE INDEX idx_data_access_requests_expires_at ON data_access_requests (expires_at);

-- Privacy Audit Logs
CREATE INDEX idx_privacy_audit_logs_user_id ON privacy_audit_logs (user_id);
CREATE INDEX idx_privacy_audit_logs_timestamp ON privacy_audit_logs (timestamp);
CREATE INDEX idx_privacy_audit_logs_action ON privacy_audit_logs (action);
```

### Composite Indexes

```sql
-- User Profiles
CREATE INDEX idx_user_profiles_university_major ON user_profiles (university_id, major);
CREATE INDEX idx_user_profiles_university_year ON user_profiles (university_id, academic_year);
CREATE INDEX idx_user_profiles_visibility_created ON user_profiles (profile_visibility, created_at);

-- University Profiles
CREATE INDEX idx_university_profiles_country_status ON university_profiles (country, status);
CREATE INDEX idx_university_profiles_approved_status ON university_profiles (approved, status);
```

## Data Validation

### Field Validation Rules

1. **Username**: 3-50 characters, alphanumeric + underscore, must start with letter
2. **Display Name**: 1-100 characters, no leading/trailing spaces
3. **Bio**: Max 500 characters
4. **Email**: Valid email format, max 255 characters
5. **Phone**: Valid phone format, max 20 characters
6. **Website**: Valid URL format, max 500 characters
7. **Social Handles**: Alphanumeric + hyphens/underscores, max 100 characters
8. **Academic Year**: 1-10
9. **Graduation Year**: 1950-2100
10. **Country**: 2-letter ISO code
11. **Timezone**: Valid IANA timezone

### Business Logic Validation

1. **Academic Year Consistency**: Academic year and graduation year must be consistent
2. **University Email**: Must be from approved university domain
3. **Uniqueness**: Username, email, and student ID must be unique
4. **Privacy Settings**: Privacy settings must be consistent with data availability

## Privacy Controls

### Privacy Levels

1. **Public**: Visible to everyone
2. **University**: Visible to university members only
3. **Friends**: Visible to friends only
4. **Private**: Visible to user only

### Privacy Enforcement

1. **Data Filtering**: Apply privacy controls when retrieving profile data
2. **Access Control**: Check permissions before allowing data access
3. **Audit Logging**: Log all data access for compliance
4. **Data Retention**: Enforce data retention policies

## API Endpoints

### Profile Management

- `POST /api/profiles` - Create profile
- `GET /api/profiles/:userId` - Get profile
- `PUT /api/profiles/:userId` - Update profile
- `DELETE /api/profiles/:userId` - Delete profile
- `GET /api/profiles/search` - Search profiles

### University Management

- `GET /api/universities` - List universities
- `GET /api/universities/:id` - Get university
- `POST /api/universities` - Create university (admin)
- `PUT /api/universities/:id` - Update university (admin)

### Privacy Management

- `GET /api/profiles/:userId/privacy` - Get privacy settings
- `PUT /api/profiles/:userId/privacy` - Update privacy settings
- `GET /api/profiles/:userId/audit-logs` - Get audit logs
- `POST /api/data-access-requests` - Request data access

## Examples

### Creating a Profile

```typescript
const profileData: IUserProfileCreation = {
  displayName: 'John Doe',
  universityEmail: 'john.doe@university.edu',
  username: 'johndoe',
  bio: 'Computer Science student passionate about AI',
  major: 'Computer Science',
  academicYear: 3,
  graduationYear: 2025,
  city: 'New York',
  country: 'US',
  timezone: 'America/New_York',
  showEmail: false,
  showPhone: false,
  showLocation: true,
  showAcademicInfo: true,
  profileVisibility: 'university',
  contactVisibility: 'friends',
  academicVisibility: 'university'
};

const profile = await profileService.createProfile('user-123', profileData);
```

### Updating a Profile

```typescript
const updates: ProfileUpdateData = {
  bio: 'Updated bio with more information',
  major: 'Computer Science',
  minor: 'Mathematics',
  linkedin: 'johndoe',
  github: 'johndoe',
  showSocialLinks: true,
  socialVisibility: 'university'
};

const updatedProfile = await profileService.updateProfile('user-123', updates);
```

### Searching Profiles

```typescript
const searchResults = await profileService.searchProfiles('computer science', 10, 0);
```

### Privacy Controls

```typescript
const privacySettings: PrivacySettings = {
  showEmail: false,
  showPhone: false,
  showLocation: true,
  showAcademicInfo: true,
  showSocialLinks: true,
  allowDirectMessages: true,
  allowFriendRequests: true,
  profileVisibility: 'university',
  contactVisibility: 'friends',
  academicVisibility: 'university',
  socialVisibility: 'university',
  locationVisibility: 'university',
  activityVisibility: 'university'
};

await profileService.updatePrivacySettings('user-123', privacySettings);
```

### Data Access Request

```typescript
const request: DataAccessRequest = {
  requesterId: 'user-456',
  requestedData: ['email', 'phone', 'academic'],
  purpose: 'Research collaboration',
  status: 'pending',
  requestedAt: new Date(),
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
};

const createdRequest = await profileService.createDataAccessRequest(request);
```

This comprehensive data model provides a robust foundation for the ChitLaq user profile system, ensuring data integrity, privacy compliance, and optimal performance.
