-- Migration: 005_user_profiles.sql
-- Description: Create user profile system with university integration
-- Author: ChitLaq Development Team
-- Date: 2024-01-15

BEGIN;

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Basic Information
    username VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    bio TEXT,
    profile_picture VARCHAR(500),
    cover_photo VARCHAR(500),
    
    -- University Information
    university_id UUID NOT NULL REFERENCES universities(id) ON DELETE RESTRICT,
    university_email VARCHAR(255) NOT NULL,
    academic_year INTEGER CHECK (academic_year >= 1 AND academic_year <= 10),
    graduation_year INTEGER CHECK (graduation_year >= 1950 AND graduation_year <= 2050),
    major VARCHAR(100),
    minor VARCHAR(100),
    department VARCHAR(100),
    faculty VARCHAR(100),
    student_id VARCHAR(50),
    
    -- Contact Information
    email VARCHAR(255),
    phone VARCHAR(20),
    website VARCHAR(500),
    linkedin VARCHAR(100),
    github VARCHAR(100),
    twitter VARCHAR(100),
    
    -- Location Information
    campus_location VARCHAR(100),
    city VARCHAR(100),
    country VARCHAR(2),
    timezone VARCHAR(50),
    
    -- Social Preferences
    is_discoverable BOOLEAN NOT NULL DEFAULT true,
    show_email BOOLEAN NOT NULL DEFAULT false,
    show_phone BOOLEAN NOT NULL DEFAULT false,
    show_location BOOLEAN NOT NULL DEFAULT true,
    show_academic_info BOOLEAN NOT NULL DEFAULT true,
    allow_direct_messages BOOLEAN NOT NULL DEFAULT true,
    allow_friend_requests BOOLEAN NOT NULL DEFAULT true,
    
    -- Verification Status
    email_verified BOOLEAN NOT NULL DEFAULT false,
    university_verified BOOLEAN NOT NULL DEFAULT false,
    profile_verified BOOLEAN NOT NULL DEFAULT false,
    identity_verified BOOLEAN NOT NULL DEFAULT false,
    
    -- Activity Statistics
    posts_count INTEGER NOT NULL DEFAULT 0 CHECK (posts_count >= 0),
    followers_count INTEGER NOT NULL DEFAULT 0 CHECK (followers_count >= 0),
    following_count INTEGER NOT NULL DEFAULT 0 CHECK (following_count >= 0),
    likes_count INTEGER NOT NULL DEFAULT 0 CHECK (likes_count >= 0),
    comments_count INTEGER NOT NULL DEFAULT 0 CHECK (comments_count >= 0),
    
    -- Profile Completion
    completion_score INTEGER NOT NULL DEFAULT 0 CHECK (completion_score >= 0 AND completion_score <= 100),
    completion_percentage INTEGER NOT NULL DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    last_updated TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- Metadata
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP
);

-- Create university_profiles table
CREATE TABLE IF NOT EXISTS university_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Basic Information
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) NOT NULL UNIQUE,
    country VARCHAR(2) NOT NULL,
    region VARCHAR(100),
    city VARCHAR(100),
    
    -- Academic Information
    type VARCHAR(20) NOT NULL DEFAULT 'public' CHECK (type IN ('public', 'private', 'community', 'technical', 'research')),
    accreditation VARCHAR(255),
    established_year INTEGER CHECK (established_year >= 1000 AND established_year <= EXTRACT(YEAR FROM NOW())),
    student_count INTEGER CHECK (student_count >= 0),
    faculty_count INTEGER CHECK (faculty_count >= 0),
    
    -- Contact Information
    website VARCHAR(500),
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    postal_code VARCHAR(20),
    
    -- Academic Structure
    faculties JSON NOT NULL DEFAULT '[]',
    departments JSON NOT NULL DEFAULT '[]',
    programs JSON NOT NULL DEFAULT '[]',
    degrees JSON NOT NULL DEFAULT '[]',
    
    -- Academic Calendar
    academic_year_start VARCHAR(5) NOT NULL DEFAULT '09-01',
    academic_year_end VARCHAR(5) NOT NULL DEFAULT '05-31',
    semester_system VARCHAR(20) NOT NULL DEFAULT 'semester' CHECK (semester_system IN ('semester', 'quarter', 'trimester', 'year')),
    current_semester VARCHAR(50),
    current_year INTEGER,
    
    -- University Features
    has_graduate_programs BOOLEAN NOT NULL DEFAULT false,
    has_online_programs BOOLEAN NOT NULL DEFAULT false,
    has_international_programs BOOLEAN NOT NULL DEFAULT false,
    has_research_programs BOOLEAN NOT NULL DEFAULT false,
    
    -- Social Features
    allow_student_networking BOOLEAN NOT NULL DEFAULT true,
    allow_alumni_networking BOOLEAN NOT NULL DEFAULT true,
    allow_faculty_networking BOOLEAN NOT NULL DEFAULT false,
    allow_cross_university_networking BOOLEAN NOT NULL DEFAULT false,
    
    -- Verification
    is_verified BOOLEAN NOT NULL DEFAULT false,
    verification_level VARCHAR(20) NOT NULL DEFAULT 'basic' CHECK (verification_level IN ('basic', 'verified', 'premium')),
    verification_date TIMESTAMP,
    verified_by VARCHAR(255),
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'inactive', 'pending', 'suspended')),
    is_public BOOLEAN NOT NULL DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP
);

-- Create user_interests table
CREATE TABLE IF NOT EXISTS user_interests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    interest VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create user_skills table
CREATE TABLE IF NOT EXISTS user_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    skill VARCHAR(100) NOT NULL,
    level VARCHAR(20) CHECK (level IN ('beginner', 'intermediate', 'advanced', 'expert')),
    category VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create user_achievements table
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    achievement VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    date_earned DATE,
    verified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create university_departments table
CREATE TABLE IF NOT EXISTS university_departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID NOT NULL REFERENCES university_profiles(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(20),
    faculty VARCHAR(100),
    description TEXT,
    head_of_department VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    website VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create university_programs table
CREATE TABLE IF NOT EXISTS university_programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID NOT NULL REFERENCES university_profiles(id) ON DELETE CASCADE,
    department_id UUID REFERENCES university_departments(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(20),
    level VARCHAR(20) CHECK (level IN ('undergraduate', 'graduate', 'doctoral', 'certificate')),
    degree_type VARCHAR(50),
    duration_years DECIMAL(3,1),
    description TEXT,
    requirements TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for user_profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_user_profiles_university_id ON user_profiles(university_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_discoverable ON user_profiles(is_discoverable);
CREATE INDEX IF NOT EXISTS idx_user_profiles_completion_percentage ON user_profiles(completion_percentage);
CREATE INDEX IF NOT EXISTS idx_user_profiles_major ON user_profiles(major);
CREATE INDEX IF NOT EXISTS idx_user_profiles_academic_year ON user_profiles(academic_year);
CREATE INDEX IF NOT EXISTS idx_user_profiles_graduation_year ON user_profiles(graduation_year);
CREATE INDEX IF NOT EXISTS idx_user_profiles_city ON user_profiles(city);
CREATE INDEX IF NOT EXISTS idx_user_profiles_country ON user_profiles(country);
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at ON user_profiles(created_at);
CREATE INDEX IF NOT EXISTS idx_user_profiles_updated_at ON user_profiles(updated_at);

-- Create indexes for university_profiles
CREATE INDEX IF NOT EXISTS idx_university_profiles_domain ON university_profiles(domain);
CREATE INDEX IF NOT EXISTS idx_university_profiles_country ON university_profiles(country);
CREATE INDEX IF NOT EXISTS idx_university_profiles_type ON university_profiles(type);
CREATE INDEX IF NOT EXISTS idx_university_profiles_status ON university_profiles(status);
CREATE INDEX IF NOT EXISTS idx_university_profiles_is_verified ON university_profiles(is_verified);
CREATE INDEX IF NOT EXISTS idx_university_profiles_is_public ON university_profiles(is_public);
CREATE INDEX IF NOT EXISTS idx_university_profiles_created_at ON university_profiles(created_at);

-- Create indexes for user_interests
CREATE INDEX IF NOT EXISTS idx_user_interests_profile_id ON user_interests(profile_id);
CREATE INDEX IF NOT EXISTS idx_user_interests_interest ON user_interests(interest);
CREATE INDEX IF NOT EXISTS idx_user_interests_category ON user_interests(category);

-- Create indexes for user_skills
CREATE INDEX IF NOT EXISTS idx_user_skills_profile_id ON user_skills(profile_id);
CREATE INDEX IF NOT EXISTS idx_user_skills_skill ON user_skills(skill);
CREATE INDEX IF NOT EXISTS idx_user_skills_level ON user_skills(level);
CREATE INDEX IF NOT EXISTS idx_user_skills_category ON user_skills(category);

-- Create indexes for user_achievements
CREATE INDEX IF NOT EXISTS idx_user_achievements_profile_id ON user_achievements(profile_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_category ON user_achievements(category);
CREATE INDEX IF NOT EXISTS idx_user_achievements_date_earned ON user_achievements(date_earned);
CREATE INDEX IF NOT EXISTS idx_user_achievements_verified ON user_achievements(verified);

-- Create indexes for university_departments
CREATE INDEX IF NOT EXISTS idx_university_departments_university_id ON university_departments(university_id);
CREATE INDEX IF NOT EXISTS idx_university_departments_faculty ON university_departments(faculty);
CREATE INDEX IF NOT EXISTS idx_university_departments_name ON university_departments(name);

-- Create indexes for university_programs
CREATE INDEX IF NOT EXISTS idx_university_programs_university_id ON university_programs(university_id);
CREATE INDEX IF NOT EXISTS idx_university_programs_department_id ON university_programs(department_id);
CREATE INDEX IF NOT EXISTS idx_university_programs_level ON university_programs(level);
CREATE INDEX IF NOT EXISTS idx_university_programs_degree_type ON university_programs(degree_type);

-- Create RLS policies for user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY user_profiles_own_view ON user_profiles
    FOR SELECT USING (user_id = current_user_id());

-- Users can update their own profile
CREATE POLICY user_profiles_own_update ON user_profiles
    FOR UPDATE USING (user_id = current_user_id());

-- Users can insert their own profile
CREATE POLICY user_profiles_own_insert ON user_profiles
    FOR INSERT WITH CHECK (user_id = current_user_id());

-- Users can delete their own profile
CREATE POLICY user_profiles_own_delete ON user_profiles
    FOR DELETE USING (user_id = current_user_id());

-- Public profiles are viewable by everyone
CREATE POLICY user_profiles_public_view ON user_profiles
    FOR SELECT USING (is_discoverable = true);

-- Admins can view all profiles
CREATE POLICY user_profiles_admin_view ON user_profiles
    FOR ALL TO admin USING (true);

-- Create RLS policies for university_profiles
ALTER TABLE university_profiles ENABLE ROW LEVEL SECURITY;

-- Public universities are viewable by everyone
CREATE POLICY university_profiles_public_view ON university_profiles
    FOR SELECT USING (is_public = true AND status = 'active');

-- Admins can manage all universities
CREATE POLICY university_profiles_admin_all ON university_profiles
    FOR ALL TO admin USING (true);

-- Create RLS policies for user_interests
ALTER TABLE user_interests ENABLE ROW LEVEL SECURITY;

-- Users can view interests of public profiles
CREATE POLICY user_interests_public_view ON user_interests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = user_interests.profile_id 
            AND user_profiles.is_discoverable = true
        )
    );

-- Users can manage their own interests
CREATE POLICY user_interests_own_manage ON user_interests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = user_interests.profile_id 
            AND user_profiles.user_id = current_user_id()
        )
    );

-- Create RLS policies for user_skills
ALTER TABLE user_skills ENABLE ROW LEVEL SECURITY;

-- Users can view skills of public profiles
CREATE POLICY user_skills_public_view ON user_skills
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = user_skills.profile_id 
            AND user_profiles.is_discoverable = true
        )
    );

-- Users can manage their own skills
CREATE POLICY user_skills_own_manage ON user_skills
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = user_skills.profile_id 
            AND user_profiles.user_id = current_user_id()
        )
    );

-- Create RLS policies for user_achievements
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- Users can view achievements of public profiles
CREATE POLICY user_achievements_public_view ON user_achievements
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = user_achievements.profile_id 
            AND user_profiles.is_discoverable = true
        )
    );

-- Users can manage their own achievements
CREATE POLICY user_achievements_own_manage ON user_achievements
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = user_achievements.profile_id 
            AND user_profiles.user_id = current_user_id()
        )
    );

-- Create functions for profile completion calculation
CREATE OR REPLACE FUNCTION calculate_profile_completion(profile_id UUID)
RETURNS INTEGER AS $$
DECLARE
    completion_score INTEGER := 0;
    total_fields INTEGER := 11; -- Total number of fields to check
BEGIN
    -- Check each field and increment score if present
    IF EXISTS (SELECT 1 FROM user_profiles WHERE id = profile_id AND username IS NOT NULL AND username != '') THEN
        completion_score := completion_score + 1;
    END IF;
    
    IF EXISTS (SELECT 1 FROM user_profiles WHERE id = profile_id AND display_name IS NOT NULL AND display_name != '') THEN
        completion_score := completion_score + 1;
    END IF;
    
    IF EXISTS (SELECT 1 FROM user_profiles WHERE id = profile_id AND bio IS NOT NULL AND bio != '') THEN
        completion_score := completion_score + 1;
    END IF;
    
    IF EXISTS (SELECT 1 FROM user_profiles WHERE id = profile_id AND profile_picture IS NOT NULL AND profile_picture != '') THEN
        completion_score := completion_score + 1;
    END IF;
    
    IF EXISTS (SELECT 1 FROM user_profiles WHERE id = profile_id AND major IS NOT NULL AND major != '') THEN
        completion_score := completion_score + 1;
    END IF;
    
    IF EXISTS (SELECT 1 FROM user_profiles WHERE id = profile_id AND academic_year IS NOT NULL) THEN
        completion_score := completion_score + 1;
    END IF;
    
    IF EXISTS (SELECT 1 FROM user_profiles WHERE id = profile_id AND city IS NOT NULL AND city != '') THEN
        completion_score := completion_score + 1;
    END IF;
    
    IF EXISTS (SELECT 1 FROM user_profiles WHERE id = profile_id AND country IS NOT NULL AND country != '') THEN
        completion_score := completion_score + 1;
    END IF;
    
    IF EXISTS (SELECT 1 FROM user_profiles WHERE id = profile_id AND website IS NOT NULL AND website != '') THEN
        completion_score := completion_score + 1;
    END IF;
    
    IF EXISTS (SELECT 1 FROM user_profiles WHERE id = profile_id AND linkedin IS NOT NULL AND linkedin != '') THEN
        completion_score := completion_score + 1;
    END IF;
    
    IF EXISTS (SELECT 1 FROM user_profiles WHERE id = profile_id AND github IS NOT NULL AND github != '') THEN
        completion_score := completion_score + 1;
    END IF;
    
    RETURN completion_score;
END;
$$ LANGUAGE plpgsql;

-- Create function to update profile completion
CREATE OR REPLACE FUNCTION update_profile_completion()
RETURNS TRIGGER AS $$
BEGIN
    NEW.completion_score := calculate_profile_completion(NEW.id);
    NEW.completion_percentage := ROUND((NEW.completion_score::DECIMAL / 11) * 100);
    NEW.last_updated := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update profile completion
CREATE TRIGGER trigger_update_profile_completion
    BEFORE INSERT OR UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_profile_completion();

-- Create function to get current academic year
CREATE OR REPLACE FUNCTION get_current_academic_year(university_id UUID)
RETURNS INTEGER AS $$
DECLARE
    academic_year_start VARCHAR(5);
    academic_year_end VARCHAR(5);
    current_year INTEGER;
    start_month INTEGER;
    start_day INTEGER;
    end_month INTEGER;
    end_day INTEGER;
    academic_year_start_date DATE;
    academic_year_end_date DATE;
    now_date DATE := CURRENT_DATE;
BEGIN
    -- Get academic year configuration
    SELECT university_profiles.academic_year_start, university_profiles.academic_year_end
    INTO academic_year_start, academic_year_end
    FROM university_profiles
    WHERE id = university_id;
    
    IF academic_year_start IS NULL OR academic_year_end IS NULL THEN
        RETURN EXTRACT(YEAR FROM now_date);
    END IF;
    
    -- Parse dates
    start_month := EXTRACT(MONTH FROM (academic_year_start || '-' || EXTRACT(YEAR FROM now_date))::DATE);
    start_day := EXTRACT(DAY FROM (academic_year_start || '-' || EXTRACT(YEAR FROM now_date))::DATE);
    end_month := EXTRACT(MONTH FROM (academic_year_end || '-' || EXTRACT(YEAR FROM now_date))::DATE);
    end_day := EXTRACT(DAY FROM (academic_year_end || '-' || EXTRACT(YEAR FROM now_date))::DATE);
    
    current_year := EXTRACT(YEAR FROM now_date);
    
    -- Create academic year dates
    academic_year_start_date := MAKE_DATE(current_year, start_month, start_day);
    academic_year_end_date := MAKE_DATE(current_year, end_month, end_day);
    
    -- Adjust for academic year that spans calendar years
    IF academic_year_start_date > academic_year_end_date THEN
        academic_year_end_date := MAKE_DATE(current_year + 1, end_month, end_day);
    END IF;
    
    -- Determine academic year
    IF now_date < academic_year_start_date THEN
        RETURN current_year - 1;
    ELSIF now_date > academic_year_end_date THEN
        RETURN current_year + 1;
    ELSE
        RETURN current_year;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create function to get current semester
CREATE OR REPLACE FUNCTION get_current_semester(university_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
    semester_system VARCHAR(20);
    academic_year_start VARCHAR(5);
    current_year INTEGER;
    current_month INTEGER;
    start_month INTEGER;
    semester VARCHAR(50);
BEGIN
    -- Get semester system and academic year start
    SELECT university_profiles.semester_system, university_profiles.academic_year_start
    INTO semester_system, academic_year_start
    FROM university_profiles
    WHERE id = university_id;
    
    IF semester_system IS NULL OR academic_year_start IS NULL THEN
        RETURN 'Unknown';
    END IF;
    
    current_year := get_current_academic_year(university_id);
    current_month := EXTRACT(MONTH FROM CURRENT_DATE);
    start_month := EXTRACT(MONTH FROM (academic_year_start || '-' || current_year)::DATE);
    
    CASE semester_system
        WHEN 'semester' THEN
            IF current_month >= start_month AND current_month < start_month + 6 THEN
                semester := 'Fall ' || current_year;
            ELSE
                semester := 'Spring ' || (current_year + 1);
            END IF;
        WHEN 'quarter' THEN
            CASE 
                WHEN current_month >= start_month AND current_month < start_month + 3 THEN
                    semester := 'Q1 ' || current_year;
                WHEN current_month >= start_month + 3 AND current_month < start_month + 6 THEN
                    semester := 'Q2 ' || current_year;
                WHEN current_month >= start_month + 6 AND current_month < start_month + 9 THEN
                    semester := 'Q3 ' || current_year;
                ELSE
                    semester := 'Q4 ' || current_year;
            END CASE;
        WHEN 'trimester' THEN
            CASE 
                WHEN current_month >= start_month AND current_month < start_month + 4 THEN
                    semester := 'T1 ' || current_year;
                WHEN current_month >= start_month + 4 AND current_month < start_month + 8 THEN
                    semester := 'T2 ' || current_year;
                ELSE
                    semester := 'T3 ' || current_year;
            END CASE;
        ELSE
            semester := current_year::VARCHAR;
    END CASE;
    
    RETURN semester;
END;
$$ LANGUAGE plpgsql;

-- Create function to update university academic calendar
CREATE OR REPLACE FUNCTION update_university_academic_calendar()
RETURNS TRIGGER AS $$
BEGIN
    NEW.current_year := get_current_academic_year(NEW.id);
    NEW.current_semester := get_current_semester(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update academic calendar
CREATE TRIGGER trigger_update_university_academic_calendar
    BEFORE INSERT OR UPDATE ON university_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_university_academic_calendar();

-- Insert sample university data
INSERT INTO university_profiles (
    name, domain, country, type, established_year, student_count, faculty_count,
    website, email, phone, address,
    faculties, departments, programs, degrees,
    academic_year_start, academic_year_end, semester_system,
    has_graduate_programs, has_online_programs, has_international_programs, has_research_programs,
    allow_student_networking, allow_alumni_networking, allow_faculty_networking,
    is_verified, verification_level, status, is_public
) VALUES 
(
    'University of California, Berkeley',
    'berkeley.edu',
    'US',
    'public',
    1868,
    45000,
    2000,
    'https://www.berkeley.edu',
    'info@berkeley.edu',
    '+1-510-642-6000',
    'Berkeley, CA 94720, USA',
    '["Engineering", "Business", "Arts & Sciences", "Education", "Environmental Design", "Information", "Journalism", "Law", "Natural Resources", "Optometry", "Public Health", "Social Welfare"]',
    '["Computer Science", "Electrical Engineering", "Mechanical Engineering", "Business Administration", "Economics", "Psychology", "Biology", "Chemistry", "Physics", "Mathematics"]',
    '["Computer Science", "Electrical Engineering", "Business Administration", "Economics", "Psychology", "Biology", "Chemistry", "Physics", "Mathematics", "Data Science", "Public Policy"]',
    '["Bachelor of Science", "Bachelor of Arts", "Master of Science", "Master of Arts", "Master of Business Administration", "Doctor of Philosophy", "Juris Doctor", "Master of Public Health"]',
    '08-15',
    '05-15',
    'semester',
    true,
    true,
    true,
    true,
    true,
    true,
    false,
    true,
    'verified',
    'active',
    true
),
(
    'Stanford University',
    'stanford.edu',
    'US',
    'private',
    1885,
    17000,
    2100,
    'https://www.stanford.edu',
    'admission@stanford.edu',
    '+1-650-723-2300',
    'Stanford, CA 94305, USA',
    '["Engineering", "Business", "Education", "Humanities & Sciences", "Law", "Medicine"]',
    '["Computer Science", "Electrical Engineering", "Mechanical Engineering", "Business Administration", "Economics", "Psychology", "Biology", "Chemistry", "Physics", "Mathematics"]',
    '["Computer Science", "Electrical Engineering", "Business Administration", "Economics", "Psychology", "Biology", "Chemistry", "Physics", "Mathematics", "Data Science", "Public Policy"]',
    '["Bachelor of Science", "Bachelor of Arts", "Master of Science", "Master of Arts", "Master of Business Administration", "Doctor of Philosophy", "Juris Doctor", "Doctor of Medicine"]',
    '09-01',
    '06-15',
    'quarter',
    true,
    true,
    true,
    true,
    true,
    true,
    false,
    true,
    'verified',
    'active',
    true
),
(
    'Massachusetts Institute of Technology',
    'mit.edu',
    'US',
    'private',
    1861,
    12000,
    1000,
    'https://www.mit.edu',
    'admissions@mit.edu',
    '+1-617-253-1000',
    'Cambridge, MA 02139, USA',
    '["Engineering", "Science", "Architecture", "Management", "Humanities", "Arts"]',
    '["Computer Science", "Electrical Engineering", "Mechanical Engineering", "Physics", "Mathematics", "Biology", "Chemistry", "Economics", "Management"]',
    '["Computer Science", "Electrical Engineering", "Mechanical Engineering", "Physics", "Mathematics", "Biology", "Chemistry", "Economics", "Management", "Data Science"]',
    '["Bachelor of Science", "Master of Science", "Master of Engineering", "Doctor of Philosophy", "Master of Business Administration"]',
    '09-01',
    '05-31',
    'semester',
    true,
    false,
    true,
    true,
    true,
    true,
    false,
    true,
    'verified',
    'active',
    true
);

-- Create views for common queries
CREATE OR REPLACE VIEW public_profiles AS
SELECT 
    up.id,
    up.user_id,
    up.username,
    up.display_name,
    up.bio,
    up.profile_picture,
    up.cover_photo,
    up.university_id,
    up.university_email,
    up.academic_year,
    up.graduation_year,
    up.major,
    up.minor,
    up.department,
    up.faculty,
    up.campus_location,
    up.city,
    up.country,
    up.posts_count,
    up.followers_count,
    up.following_count,
    up.email_verified,
    up.university_verified,
    up.profile_verified,
    up.completion_percentage,
    up.created_at,
    up.updated_at,
    u.name as university_name,
    u.domain as university_domain,
    u.country as university_country,
    u.type as university_type,
    u.is_verified as university_is_verified
FROM user_profiles up
JOIN university_profiles u ON up.university_id = u.id
WHERE up.is_discoverable = true 
AND up.deleted_at IS NULL 
AND u.status = 'active' 
AND u.is_public = true;

-- Create view for university statistics
CREATE OR REPLACE VIEW university_statistics AS
SELECT 
    u.id,
    u.name,
    u.domain,
    u.country,
    u.type,
    u.student_count,
    u.faculty_count,
    COUNT(up.id) as active_students,
    COUNT(CASE WHEN up.graduation_year IS NOT NULL THEN 1 END) as alumni_count,
    AVG(up.completion_percentage) as avg_profile_completion,
    COUNT(CASE WHEN up.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as new_students_30_days
FROM university_profiles u
LEFT JOIN user_profiles up ON u.id = up.university_id AND up.deleted_at IS NULL
WHERE u.status = 'active' AND u.is_public = true
GROUP BY u.id, u.name, u.domain, u.country, u.type, u.student_count, u.faculty_count;

COMMIT;
