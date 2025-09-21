import { SupabaseClient } from '@supabase/supabase-js';
import { UserProfile } from '../models/UserProfile';
import { UniversityProfile } from '../models/UniversityProfile';
import { UniversityMapper } from '../utils/university-mapper';
import { CustomError } from '../../../shared/errors/CustomError';

export interface UniversitySyncResult {
  success: boolean;
  universityId?: string;
  universityName?: string;
  universityDomain?: string;
  universityPrefix?: string;
  changes: string[];
  errors: string[];
}

export interface UniversityValidationResult {
  isValid: boolean;
  universityId?: string;
  universityName?: string;
  universityDomain?: string;
  universityPrefix?: string;
  errors: string[];
  warnings: string[];
}

export class UniversitySync {
  private supabase: SupabaseClient;
  private universityMapper: UniversityMapper;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.universityMapper = new UniversityMapper(supabase);
  }

  /**
   * Sync user profile with university data
   */
  public async syncUserWithUniversity(profile: UserProfile): Promise<UniversitySyncResult> {
    const result: UniversitySyncResult = {
      success: false,
      changes: [],
      errors: []
    };

    try {
      if (!profile.universityEmail) {
        result.errors.push('University email is required for synchronization');
        return result;
      }

      // Map email to university
      const universityData = await this.universityMapper.mapEmailToUniversity(profile.universityEmail);
      
      if (!universityData.universityId) {
        result.errors.push('University not found for the provided email domain');
        return result;
      }

      // Get university profile
      const university = await this.getUniversityProfile(universityData.universityId);
      if (!university) {
        result.errors.push('University profile not found');
        return result;
      }

      // Validate university status
      if (university.status !== 'active') {
        result.errors.push('University is not active');
        return result;
      }

      if (!university.allowStudentNetworking) {
        result.errors.push('University does not allow student networking');
        return result;
      }

      // Check for changes
      const changes: string[] = [];
      
      if (profile.universityId !== universityData.universityId) {
        changes.push('University ID updated');
      }
      
      if (profile.universityName !== universityData.universityName) {
        changes.push('University name updated');
      }
      
      if (profile.universityDomain !== universityData.universityDomain) {
        changes.push('University domain updated');
      }
      
      if (profile.universityPrefix !== universityData.universityPrefix) {
        changes.push('University prefix updated');
      }

      // Validate academic information against university
      const academicValidation = await this.validateAcademicInformation(profile, university);
      if (!academicValidation.isValid) {
        result.errors.push(...academicValidation.errors);
      }
      
      if (academicValidation.warnings.length > 0) {
        result.changes.push(...academicValidation.warnings);
      }

      // Update profile with university data
      if (changes.length > 0) {
        await this.updateProfileUniversityData(profile.userId, {
          universityId: universityData.universityId,
          universityName: universityData.universityName,
          universityDomain: universityData.universityDomain,
          universityPrefix: universityData.universityPrefix
        });
      }

      result.success = true;
      result.universityId = universityData.universityId;
      result.universityName = universityData.universityName;
      result.universityDomain = universityData.universityDomain;
      result.universityPrefix = universityData.universityPrefix;
      result.changes = changes;

    } catch (error) {
      result.errors.push(`Synchronization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  /**
   * Validate university email against approved universities
   */
  public async validateUniversityEmail(email: string): Promise<UniversityValidationResult> {
    const result: UniversityValidationResult = {
      isValid: false,
      errors: [],
      warnings: []
    };

    try {
      if (!email) {
        result.errors.push('Email is required');
        return result;
      }

      // Extract domain from email
      const domain = this.extractDomainFromEmail(email);
      if (!domain) {
        result.errors.push('Invalid email format');
        return result;
      }

      // Check if domain is from an educational institution
      if (!domain.endsWith('.edu')) {
        result.errors.push('Email must be from an educational institution (.edu domain)');
        return result;
      }

      // Find university by domain
      const university = await this.getUniversityByDomain(domain);
      if (!university) {
        result.errors.push('University not found for the provided email domain');
        return result;
      }

      // Validate university status
      if (!university.approved) {
        result.errors.push('University is not approved');
        return result;
      }

      if (university.status !== 'active') {
        result.errors.push('University is not active');
        return result;
      }

      if (!university.allowStudentNetworking) {
        result.errors.push('University does not allow student networking');
        return result;
      }

      // Validate email prefix if university has specific requirements
      const prefix = this.extractPrefixFromEmail(email);
      if (university.prefixes && university.prefixes.length > 0) {
        if (!prefix || !university.prefixes.includes(prefix)) {
          result.warnings.push(`Email prefix '${prefix}' does not match approved prefixes for ${university.name}`);
        }
      }

      result.isValid = true;
      result.universityId = university.id;
      result.universityName = university.name;
      result.universityDomain = university.domain;
      result.universityPrefix = prefix;

    } catch (error) {
      result.errors.push(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  /**
   * Validate academic information against university
   */
  public async validateAcademicInformation(
    profile: UserProfile,
    university: UniversityProfile
  ): Promise<UniversityValidationResult> {
    const result: UniversityValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    try {
      // Validate major against university programs
      if (profile.major && university.programs && university.programs.length > 0) {
        if (!university.programs.includes(profile.major)) {
          result.warnings.push(`Major '${profile.major}' not found in university programs`);
        }
      }

      // Validate department against university departments
      if (profile.department && university.departments && university.departments.length > 0) {
        if (!university.departments.includes(profile.department)) {
          result.warnings.push(`Department '${profile.department}' not found in university departments`);
        }
      }

      // Validate faculty against university faculties
      if (profile.faculty && university.faculties && university.faculties.length > 0) {
        if (!university.faculties.includes(profile.faculty)) {
          result.warnings.push(`Faculty '${profile.faculty}' not found in university faculties`);
        }
      }

      // Validate academic year against university academic calendar
      if (profile.academicYear && university.academicCalendar) {
        const currentMonth = new Date().getMonth() + 1;
        const { startMonth, endMonth } = university.academicCalendar;
        
        if (currentMonth < startMonth || currentMonth > endMonth) {
          result.warnings.push('Current date is outside the university academic calendar');
        }
      }

    } catch (error) {
      result.isValid = false;
      result.errors.push(`Academic validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  /**
   * Get university profile by ID
   */
  public async getUniversityProfile(universityId: string): Promise<UniversityProfile | null> {
    try {
      const { data, error } = await this.supabase
        .from('university_profiles')
        .select('*')
        .eq('id', universityId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No rows found
        }
        throw new CustomError(`Failed to retrieve university profile: ${error.message}`, 500);
      }

      return data as UniversityProfile;
    } catch (error) {
      throw new CustomError(`Failed to retrieve university profile: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
    }
  }

  /**
   * Get university by domain
   */
  public async getUniversityByDomain(domain: string): Promise<UniversityProfile | null> {
    try {
      const { data, error } = await this.supabase
        .from('university_profiles')
        .select('*')
        .eq('domain', domain)
        .eq('approved', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No rows found
        }
        throw new CustomError(`Failed to retrieve university by domain: ${error.message}`, 500);
      }

      return data as UniversityProfile;
    } catch (error) {
      throw new CustomError(`Failed to retrieve university by domain: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
    }
  }

  /**
   * Get all approved universities
   */
  public async getApprovedUniversities(): Promise<UniversityProfile[]> {
    try {
      const { data, error } = await this.supabase
        .from('university_profiles')
        .select('*')
        .eq('approved', true)
        .eq('status', 'active')
        .order('name');

      if (error) {
        throw new CustomError(`Failed to retrieve approved universities: ${error.message}`, 500);
      }

      return data as UniversityProfile[];
    } catch (error) {
      throw new CustomError(`Failed to retrieve approved universities: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
    }
  }

  /**
   * Search universities by name or domain
   */
  public async searchUniversities(query: string): Promise<UniversityProfile[]> {
    try {
      const { data, error } = await this.supabase
        .from('university_profiles')
        .select('*')
        .eq('approved', true)
        .eq('status', 'active')
        .or(`name.ilike.%${query}%,domain.ilike.%${query}%`)
        .order('name')
        .limit(20);

      if (error) {
        throw new CustomError(`Failed to search universities: ${error.message}`, 500);
      }

      return data as UniversityProfile[];
    } catch (error) {
      throw new CustomError(`Failed to search universities: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
    }
  }

  /**
   * Get universities by country
   */
  public async getUniversitiesByCountry(country: string): Promise<UniversityProfile[]> {
    try {
      const { data, error } = await this.supabase
        .from('university_profiles')
        .select('*')
        .eq('approved', true)
        .eq('status', 'active')
        .eq('country', country)
        .order('name');

      if (error) {
        throw new CustomError(`Failed to retrieve universities by country: ${error.message}`, 500);
      }

      return data as UniversityProfile[];
    } catch (error) {
      throw new CustomError(`Failed to retrieve universities by country: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
    }
  }

  /**
   * Update profile with university data
   */
  private async updateProfileUniversityData(
    userId: string,
    universityData: {
      universityId: string;
      universityName: string;
      universityDomain: string;
      universityPrefix: string;
    }
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('user_profiles')
        .update({
          university_id: universityData.universityId,
          university_name: universityData.universityName,
          university_domain: universityData.universityDomain,
          university_prefix: universityData.universityPrefix,
          updated_at: new Date()
        })
        .eq('user_id', userId);

      if (error) {
        throw new CustomError(`Failed to update profile university data: ${error.message}`, 500);
      }
    } catch (error) {
      throw new CustomError(`Failed to update profile university data: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
    }
  }

  /**
   * Extract domain from email
   */
  private extractDomainFromEmail(email: string): string | null {
    const match = email.match(/@([a-zA-Z0-9.-]+)$/);
    return match ? match[1] : null;
  }

  /**
   * Extract prefix from email
   */
  private extractPrefixFromEmail(email: string): string | null {
    const match = email.match(/^([^@]+)@/);
    return match ? match[1] : null;
  }

  /**
   * Get university statistics
   */
  public async getUniversityStatistics(universityId: string): Promise<{
    totalStudents: number;
    activeStudents: number;
    verifiedStudents: number;
    averageCompletionScore: number;
    topMajors: Array<{ major: string; count: number }>;
    academicYearDistribution: Array<{ year: number; count: number }>;
  }> {
    try {
      // Get total students
      const { count: totalStudents, error: totalError } = await this.supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('university_id', universityId);

      if (totalError) {
        throw new CustomError(`Failed to get total students: ${totalError.message}`, 500);
      }

      // Get active students (created in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { count: activeStudents, error: activeError } = await this.supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('university_id', universityId)
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (activeError) {
        throw new CustomError(`Failed to get active students: ${activeError.message}`, 500);
      }

      // Get verified students
      const { count: verifiedStudents, error: verifiedError } = await this.supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('university_id', universityId)
        .eq('is_university_verified', true);

      if (verifiedError) {
        throw new CustomError(`Failed to get verified students: ${verifiedError.message}`, 500);
      }

      // Get average completion score
      const { data: completionData, error: completionError } = await this.supabase
        .from('user_profiles')
        .select('profile_completion_score')
        .eq('university_id', universityId)
        .not('profile_completion_score', 'is', null);

      if (completionError) {
        throw new CustomError(`Failed to get completion scores: ${completionError.message}`, 500);
      }

      const averageCompletionScore = completionData && completionData.length > 0
        ? completionData.reduce((sum, profile) => sum + profile.profile_completion_score, 0) / completionData.length
        : 0;

      // Get top majors
      const { data: majorData, error: majorError } = await this.supabase
        .from('user_profiles')
        .select('major')
        .eq('university_id', universityId)
        .not('major', 'is', null);

      if (majorError) {
        throw new CustomError(`Failed to get majors: ${majorError.message}`, 500);
      }

      const majorCounts: Record<string, number> = {};
      majorData?.forEach(profile => {
        if (profile.major) {
          majorCounts[profile.major] = (majorCounts[profile.major] || 0) + 1;
        }
      });

      const topMajors = Object.entries(majorCounts)
        .map(([major, count]) => ({ major, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Get academic year distribution
      const { data: yearData, error: yearError } = await this.supabase
        .from('user_profiles')
        .select('academic_year')
        .eq('university_id', universityId)
        .not('academic_year', 'is', null);

      if (yearError) {
        throw new CustomError(`Failed to get academic years: ${yearError.message}`, 500);
      }

      const yearCounts: Record<number, number> = {};
      yearData?.forEach(profile => {
        if (profile.academic_year) {
          yearCounts[profile.academic_year] = (yearCounts[profile.academic_year] || 0) + 1;
        }
      });

      const academicYearDistribution = Object.entries(yearCounts)
        .map(([year, count]) => ({ year: parseInt(year), count }))
        .sort((a, b) => a.year - b.year);

      return {
        totalStudents: totalStudents || 0,
        activeStudents: activeStudents || 0,
        verifiedStudents: verifiedStudents || 0,
        averageCompletionScore: Math.round(averageCompletionScore),
        topMajors,
        academicYearDistribution
      };
    } catch (error) {
      throw new CustomError(`Failed to get university statistics: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
    }
  }
}
