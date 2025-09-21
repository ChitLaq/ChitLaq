-- University Features Migration
-- Author: ChitLaq Development Team
-- Date: 2024-01-15

-- Create university_profiles table
CREATE TABLE IF NOT EXISTS university_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) UNIQUE NOT NULL,
    country VARCHAR(100) NOT NULL,
    state VARCHAR(100),
    city VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('public', 'private', 'community', 'research')),
    size VARCHAR(50) NOT NULL CHECK (size IN ('small', 'medium', 'large', 'mega')),
    established INTEGER,
    website VARCHAR(500),
    logo VARCHAR(500),
    description TEXT,
    features JSONB DEFAULT '{}',
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create departments table
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    university_id UUID REFERENCES university_profiles(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(20) NOT NULL,
    description TEXT,
    faculty VARCHAR(255) NOT NULL,
    head_of_department VARCHAR(255),
    email VARCHAR(255),
    website VARCHAR(500),
    location VARCHAR(255),
    established INTEGER,
    student_count INTEGER DEFAULT 0,
    faculty_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(university_id, code)
);

-- Create academic_programs table
CREATE TABLE IF NOT EXISTS academic_programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(20) NOT NULL,
    level VARCHAR(50) NOT NULL CHECK (level IN ('undergraduate', 'graduate', 'doctoral', 'certificate')),
    duration INTEGER NOT NULL, -- in years
    credits INTEGER NOT NULL,
    description TEXT,
    requirements TEXT[],
    career_paths TEXT[],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(department_id, code)
);

-- Create academic_years table
CREATE TABLE IF NOT EXISTS academic_years (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    university_id UUID REFERENCES university_profiles(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(university_id, year)
);

-- Create semesters table
CREATE TABLE IF NOT EXISTS semesters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academic_year_id UUID REFERENCES academic_years(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(academic_year_id, code)
);

-- Create campus_events table
CREATE TABLE IF NOT EXISTS campus_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    university_id UUID REFERENCES university_profiles(id) ON DELETE CASCADE,
    academic_year_id UUID REFERENCES academic_years(id),
    semester_id UUID REFERENCES semesters(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('academic', 'social', 'sports', 'cultural', 'career', 'workshop', 'conference')),
    category VARCHAR(100) NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    location VARCHAR(255),
    organizer VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    website VARCHAR(500),
    max_attendees INTEGER,
    current_attendees INTEGER DEFAULT 0,
    is_public BOOLEAN DEFAULT true,
    requires_registration BOOLEAN DEFAULT false,
    tags TEXT[] DEFAULT '{}',
    image_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create university_announcements table
CREATE TABLE IF NOT EXISTS university_announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    university_id UUID REFERENCES university_profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('general', 'academic', 'administrative', 'emergency', 'event')),
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    target_audience VARCHAR(50) NOT NULL CHECK (target_audience IN ('all', 'students', 'faculty', 'staff', 'alumni', 'specific_department')),
    target_department_id UUID REFERENCES departments(id),
    target_academic_year INTEGER,
    published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    author_id UUID NOT NULL,
    author_name VARCHAR(255) NOT NULL,
    attachments TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create study_groups table
CREATE TABLE IF NOT EXISTS study_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    university_id UUID REFERENCES university_profiles(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    subject VARCHAR(255) NOT NULL,
    course_code VARCHAR(50),
    academic_year INTEGER NOT NULL,
    semester VARCHAR(50) NOT NULL,
    max_members INTEGER DEFAULT 10,
    current_members INTEGER DEFAULT 0,
    meeting_schedule VARCHAR(255),
    meeting_location VARCHAR(255),
    is_public BOOLEAN DEFAULT true,
    requires_approval BOOLEAN DEFAULT false,
    tags TEXT[] DEFAULT '{}',
    created_by UUID NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create university_clubs table
CREATE TABLE IF NOT EXISTS university_clubs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    university_id UUID REFERENCES university_profiles(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL CHECK (category IN ('academic', 'cultural', 'sports', 'social', 'professional', 'volunteer')),
    type VARCHAR(50) NOT NULL CHECK (type IN ('official', 'unofficial')),
    established INTEGER,
    president VARCHAR(255) NOT NULL,
    vice_president VARCHAR(255),
    treasurer VARCHAR(255),
    secretary VARCHAR(255),
    email VARCHAR(255),
    website VARCHAR(500),
    social_media JSONB DEFAULT '{}',
    meeting_schedule VARCHAR(255),
    meeting_location VARCHAR(255),
    membership_fee DECIMAL(10,2),
    max_members INTEGER,
    current_members INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create event_registrations table
CREATE TABLE IF NOT EXISTS event_registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES campus_events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    registration_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'waitlist', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- Create study_group_members table
CREATE TABLE IF NOT EXISTS study_group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    study_group_id UUID REFERENCES study_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'removed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(study_group_id, user_id)
);

-- Create club_members table
CREATE TABLE IF NOT EXISTS club_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id UUID REFERENCES university_clubs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('member', 'officer', 'president', 'vice_president', 'treasurer', 'secretary')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'removed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(club_id, user_id)
);

-- Create event_reminders table
CREATE TABLE IF NOT EXISTS event_reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES campus_events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    reminder_type VARCHAR(20) NOT NULL CHECK (reminder_type IN ('email', 'push', 'sms')),
    reminder_time TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, user_id, reminder_type)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_university_profiles_domain ON university_profiles(domain);
CREATE INDEX IF NOT EXISTS idx_university_profiles_country ON university_profiles(country);
CREATE INDEX IF NOT EXISTS idx_university_profiles_type ON university_profiles(type);
CREATE INDEX IF NOT EXISTS idx_university_profiles_size ON university_profiles(size);

CREATE INDEX IF NOT EXISTS idx_departments_university_id ON departments(university_id);
CREATE INDEX IF NOT EXISTS idx_departments_faculty ON departments(faculty);
CREATE INDEX IF NOT EXISTS idx_departments_name ON departments(name);

CREATE INDEX IF NOT EXISTS idx_academic_programs_department_id ON academic_programs(department_id);
CREATE INDEX IF NOT EXISTS idx_academic_programs_level ON academic_programs(level);

CREATE INDEX IF NOT EXISTS idx_academic_years_university_id ON academic_years(university_id);
CREATE INDEX IF NOT EXISTS idx_academic_years_year ON academic_years(year);

CREATE INDEX IF NOT EXISTS idx_semesters_academic_year_id ON semesters(academic_year_id);

CREATE INDEX IF NOT EXISTS idx_campus_events_university_id ON campus_events(university_id);
CREATE INDEX IF NOT EXISTS idx_campus_events_academic_year_id ON campus_events(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_campus_events_start_date ON campus_events(start_date);
CREATE INDEX IF NOT EXISTS idx_campus_events_type ON campus_events(type);
CREATE INDEX IF NOT EXISTS idx_campus_events_category ON campus_events(category);
CREATE INDEX IF NOT EXISTS idx_campus_events_is_public ON campus_events(is_public);

CREATE INDEX IF NOT EXISTS idx_university_announcements_university_id ON university_announcements(university_id);
CREATE INDEX IF NOT EXISTS idx_university_announcements_published_at ON university_announcements(published_at);
CREATE INDEX IF NOT EXISTS idx_university_announcements_type ON university_announcements(type);
CREATE INDEX IF NOT EXISTS idx_university_announcements_priority ON university_announcements(priority);
CREATE INDEX IF NOT EXISTS idx_university_announcements_is_active ON university_announcements(is_active);

CREATE INDEX IF NOT EXISTS idx_study_groups_university_id ON study_groups(university_id);
CREATE INDEX IF NOT EXISTS idx_study_groups_subject ON study_groups(subject);
CREATE INDEX IF NOT EXISTS idx_study_groups_academic_year ON study_groups(academic_year);
CREATE INDEX IF NOT EXISTS idx_study_groups_is_public ON study_groups(is_public);

CREATE INDEX IF NOT EXISTS idx_university_clubs_university_id ON university_clubs(university_id);
CREATE INDEX IF NOT EXISTS idx_university_clubs_category ON university_clubs(category);
CREATE INDEX IF NOT EXISTS idx_university_clubs_type ON university_clubs(type);

CREATE INDEX IF NOT EXISTS idx_event_registrations_event_id ON event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_user_id ON event_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_status ON event_registrations(status);

CREATE INDEX IF NOT EXISTS idx_study_group_members_study_group_id ON study_group_members(study_group_id);
CREATE INDEX IF NOT EXISTS idx_study_group_members_user_id ON study_group_members(user_id);

CREATE INDEX IF NOT EXISTS idx_club_members_club_id ON club_members(club_id);
CREATE INDEX IF NOT EXISTS idx_club_members_user_id ON club_members(user_id);

CREATE INDEX IF NOT EXISTS idx_event_reminders_event_id ON event_reminders(event_id);
CREATE INDEX IF NOT EXISTS idx_event_reminders_user_id ON event_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_event_reminders_reminder_time ON event_reminders(reminder_time);

-- Create RLS policies
ALTER TABLE university_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE campus_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE university_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE university_clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_reminders ENABLE ROW LEVEL SECURITY;

-- University profiles policies
CREATE POLICY university_profiles_select ON university_profiles FOR SELECT USING (true);
CREATE POLICY university_profiles_insert ON university_profiles FOR INSERT WITH CHECK (auth.role() = 'admin');
CREATE POLICY university_profiles_update ON university_profiles FOR UPDATE USING (auth.role() = 'admin');
CREATE POLICY university_profiles_delete ON university_profiles FOR DELETE USING (auth.role() = 'admin');

-- Departments policies
CREATE POLICY departments_select ON departments FOR SELECT USING (true);
CREATE POLICY departments_insert ON departments FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM university_profiles up 
        WHERE up.id = university_id AND 
        (auth.role() = 'admin' OR auth.uid() = up.created_by)
    )
);
CREATE POLICY departments_update ON departments FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM university_profiles up 
        WHERE up.id = university_id AND 
        (auth.role() = 'admin' OR auth.uid() = up.created_by)
    )
);
CREATE POLICY departments_delete ON departments FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM university_profiles up 
        WHERE up.id = university_id AND 
        (auth.role() = 'admin' OR auth.uid() = up.created_by)
    )
);

-- Academic programs policies
CREATE POLICY academic_programs_select ON academic_programs FOR SELECT USING (true);
CREATE POLICY academic_programs_insert ON academic_programs FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM departments d 
        JOIN university_profiles up ON d.university_id = up.id
        WHERE d.id = department_id AND 
        (auth.role() = 'admin' OR auth.uid() = up.created_by)
    )
);

-- Campus events policies
CREATE POLICY campus_events_select ON campus_events FOR SELECT USING (is_public = true OR auth.role() = 'admin');
CREATE POLICY campus_events_insert ON campus_events FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM university_profiles up 
        WHERE up.id = university_id AND 
        (auth.role() = 'admin' OR auth.uid() = up.created_by)
    )
);

-- University announcements policies
CREATE POLICY university_announcements_select ON university_announcements FOR SELECT USING (is_active = true OR auth.role() = 'admin');
CREATE POLICY university_announcements_insert ON university_announcements FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM university_profiles up 
        WHERE up.id = university_id AND 
        (auth.role() = 'admin' OR auth.uid() = up.created_by)
    )
);

-- Study groups policies
CREATE POLICY study_groups_select ON study_groups FOR SELECT USING (is_public = true OR auth.uid() = created_by OR auth.role() = 'admin');
CREATE POLICY study_groups_insert ON study_groups FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY study_groups_update ON study_groups FOR UPDATE USING (auth.uid() = created_by OR auth.role() = 'admin');
CREATE POLICY study_groups_delete ON study_groups FOR DELETE USING (auth.uid() = created_by OR auth.role() = 'admin');

-- University clubs policies
CREATE POLICY university_clubs_select ON university_clubs FOR SELECT USING (true);
CREATE POLICY university_clubs_insert ON university_clubs FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM university_profiles up 
        WHERE up.id = university_id AND 
        (auth.role() = 'admin' OR auth.uid() = up.created_by)
    )
);

-- Event registrations policies
CREATE POLICY event_registrations_select ON event_registrations FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'admin');
CREATE POLICY event_registrations_insert ON event_registrations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY event_registrations_update ON event_registrations FOR UPDATE USING (auth.uid() = user_id OR auth.role() = 'admin');
CREATE POLICY event_registrations_delete ON event_registrations FOR DELETE USING (auth.uid() = user_id OR auth.role() = 'admin');

-- Study group members policies
CREATE POLICY study_group_members_select ON study_group_members FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'admin');
CREATE POLICY study_group_members_insert ON study_group_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY study_group_members_update ON study_group_members FOR UPDATE USING (auth.uid() = user_id OR auth.role() = 'admin');
CREATE POLICY study_group_members_delete ON study_group_members FOR DELETE USING (auth.uid() = user_id OR auth.role() = 'admin');

-- Club members policies
CREATE POLICY club_members_select ON club_members FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'admin');
CREATE POLICY club_members_insert ON club_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY club_members_update ON club_members FOR UPDATE USING (auth.uid() = user_id OR auth.role() = 'admin');
CREATE POLICY club_members_delete ON club_members FOR DELETE USING (auth.uid() = user_id OR auth.role() = 'admin');

-- Event reminders policies
CREATE POLICY event_reminders_select ON event_reminders FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'admin');
CREATE POLICY event_reminders_insert ON event_reminders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY event_reminders_update ON event_reminders FOR UPDATE USING (auth.uid() = user_id OR auth.role() = 'admin');
CREATE POLICY event_reminders_delete ON event_reminders FOR DELETE USING (auth.uid() = user_id OR auth.role() = 'admin');

-- Create functions for university features
CREATE OR REPLACE FUNCTION get_university_stats(university_uuid UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'totalDepartments', COUNT(DISTINCT d.id),
        'totalPrograms', COUNT(DISTINCT ap.id),
        'totalStudents', COALESCE(SUM(d.student_count), 0),
        'totalFaculty', COALESCE(SUM(d.faculty_count), 0),
        'totalEvents', COUNT(DISTINCT ce.id),
        'totalStudyGroups', COUNT(DISTINCT sg.id),
        'totalClubs', COUNT(DISTINCT uc.id),
        'activeAnnouncements', COUNT(DISTINCT ua.id)
    ) INTO result
    FROM university_profiles up
    LEFT JOIN departments d ON up.id = d.university_id
    LEFT JOIN academic_programs ap ON d.id = ap.department_id
    LEFT JOIN campus_events ce ON up.id = ce.university_id AND ce.is_active = true
    LEFT JOIN study_groups sg ON up.id = sg.university_id AND sg.is_active = true
    LEFT JOIN university_clubs uc ON up.id = uc.university_id AND uc.is_active = true
    LEFT JOIN university_announcements ua ON up.id = ua.university_id AND ua.is_active = true
    WHERE up.id = university_uuid;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_department_programs(dept_uuid UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_agg(
        json_build_object(
            'id', id,
            'name', name,
            'code', code,
            'level', level,
            'duration', duration,
            'credits', credits,
            'description', description
        )
    ) INTO result
    FROM academic_programs
    WHERE department_id = dept_uuid AND is_active = true
    ORDER BY level, name;
    
    RETURN COALESCE(result, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_university_events(university_uuid UUID, start_date TIMESTAMP, end_date TIMESTAMP)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_agg(
        json_build_object(
            'id', id,
            'title', title,
            'description', description,
            'type', type,
            'category', category,
            'startDate', start_date,
            'endDate', end_date,
            'location', location,
            'organizer', organizer,
            'currentAttendees', current_attendees,
            'maxAttendees', max_attendees,
            'isPublic', is_public,
            'requiresRegistration', requires_registration,
            'tags', tags
        )
    ) INTO result
    FROM campus_events
    WHERE university_id = university_uuid 
    AND start_date >= start_date 
    AND end_date <= end_date
    AND is_active = true
    ORDER BY start_date;
    
    RETURN COALESCE(result, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_university_profiles_updated_at BEFORE UPDATE ON university_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_academic_programs_updated_at BEFORE UPDATE ON academic_programs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_academic_years_updated_at BEFORE UPDATE ON academic_years
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_semesters_updated_at BEFORE UPDATE ON semesters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campus_events_updated_at BEFORE UPDATE ON campus_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_university_announcements_updated_at BEFORE UPDATE ON university_announcements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_study_groups_updated_at BEFORE UPDATE ON study_groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_university_clubs_updated_at BEFORE UPDATE ON university_clubs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_registrations_updated_at BEFORE UPDATE ON event_registrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_study_group_members_updated_at BEFORE UPDATE ON study_group_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_club_members_updated_at BEFORE UPDATE ON club_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_reminders_updated_at BEFORE UPDATE ON event_reminders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data
INSERT INTO university_profiles (id, name, domain, country, city, type, size, established, website, description, features, settings) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Test University', 'test.edu', 'USA', 'Test City', 'public', 'large', 1900, 'https://test.edu', 'A leading research university', 
 '{"departments": true, "academicCalendar": true, "campusEvents": true, "studyGroups": true, "announcements": true, "clubs": true, "alumni": true, "crossUniversity": true}',
 '{"allowCrossUniversity": true, "requireStudentIdVerification": false, "enableAlumniAccess": true, "enableClubIntegration": true, "enableEventIntegration": true, "enableAcademicCalendar": true, "enableStudyGroups": true, "enableAnnouncements": true, "enableDepartmentDiscovery": true, "enableCampusLocationTagging": true}'
) ON CONFLICT (domain) DO NOTHING;

INSERT INTO departments (id, university_id, name, code, description, faculty, head_of_department, email, website, location, established, student_count, faculty_count) VALUES
('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'Computer Science', 'CS', 'Computer Science Department', 'Engineering', 'Dr. Smith', 'cs@test.edu', 'https://cs.test.edu', 'Building A', 1980, 500, 25),
('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', 'Mathematics', 'MATH', 'Mathematics Department', 'Sciences', 'Dr. Johnson', 'math@test.edu', 'https://math.test.edu', 'Building B', 1950, 300, 20)
ON CONFLICT (university_id, code) DO NOTHING;

INSERT INTO academic_programs (id, department_id, name, code, level, duration, credits, description, requirements, career_paths) VALUES
('550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440002', 'Bachelor of Computer Science', 'BCS', 'undergraduate', 4, 120, 'Undergraduate program in Computer Science', ARRAY['High School Diploma', 'Math Prerequisites'], ARRAY['Software Engineer', 'Data Scientist', 'Systems Analyst']),
('550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440002', 'Master of Computer Science', 'MCS', 'graduate', 2, 60, 'Graduate program in Computer Science', ARRAY['Bachelor Degree', 'Programming Experience'], ARRAY['Senior Software Engineer', 'Technical Lead', 'Research Scientist'])
ON CONFLICT (department_id, code) DO NOTHING;

INSERT INTO academic_years (id, university_id, year, start_date, end_date, is_active) VALUES
('550e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440001', 2024, '2024-01-01', '2024-12-31', true),
('550e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440001', 2025, '2025-01-01', '2025-12-31', false)
ON CONFLICT (university_id, year) DO NOTHING;

INSERT INTO semesters (id, academic_year_id, name, code, start_date, end_date, is_active) VALUES
('550e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440006', 'Spring 2024', 'SP24', '2024-01-15', '2024-05-15', true),
('550e8400-e29b-41d4-a716-446655440009', '550e8400-e29b-41d4-a716-446655440006', 'Fall 2024', 'FA24', '2024-08-15', '2024-12-15', false)
ON CONFLICT (academic_year_id, code) DO NOTHING;
