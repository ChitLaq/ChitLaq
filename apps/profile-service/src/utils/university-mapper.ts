import { UniversityProfile, IUniversityProfile } from '../models/UniversityProfile';
import { CacheManager } from './cache-manager';
import { AuditLogger } from './audit-logger';

export interface UniversityMappingResult {
  university: IUniversityProfile;
  domain: string;
  prefix?: string;
  isValid: boolean;
  confidence: number;
}

export interface AcademicYearInfo {
  currentYear: number;
  currentSemester: string;
  academicYearStart: Date;
  academicYearEnd: Date;
  isActive: boolean;
}

export class UniversityMapper {
  private cacheManager: CacheManager;
  private auditLogger: AuditLogger;
  private universityCache: Map<string, IUniversityProfile> = new Map();

  constructor() {
    this.cacheManager = new CacheManager();
    this.auditLogger = new AuditLogger();
  }

  /**
   * Get university information from email address
   */
  async getUniversityFromEmail(email: string): Promise<IUniversityProfile | null> {
    try {
      const domain = this.extractDomainFromEmail(email);
      if (!domain) {
        return null;
      }

      // Check cache first
      const cached = this.universityCache.get(domain);
      if (cached) {
        return cached;
      }

      // Check Redis cache
      const redisCached = await this.cacheManager.get(`university:${domain}`);
      if (redisCached) {
        this.universityCache.set(domain, redisCached);
        return redisCached;
      }

      // Query database
      const university = await UniversityProfile.findOne({
        where: { domain },
        attributes: [
          'id', 'name', 'domain', 'country', 'region', 'city', 'type',
          'accreditation', 'establishedYear', 'studentCount', 'facultyCount',
          'website', 'email', 'phone', 'address', 'postalCode',
          'faculties', 'departments', 'programs', 'degrees',
          'academicYearStart', 'academicYearEnd', 'semesterSystem',
          'currentSemester', 'currentYear',
          'hasGraduatePrograms', 'hasOnlinePrograms', 'hasInternationalPrograms', 'hasResearchPrograms',
          'allowStudentNetworking', 'allowAlumniNetworking', 'allowFacultyNetworking', 'allowCrossUniversityNetworking',
          'isVerified', 'verificationLevel', 'verificationDate', 'verifiedBy',
          'status', 'isPublic', 'createdAt', 'updatedAt'
        ]
      });

      if (!university) {
        await this.auditLogger.logProfileEvent('UNIVERSITY_NOT_FOUND', 'system', {
          email,
          domain,
          action: 'university_lookup'
        });
        return null;
      }

      const universityData = university.toJSON();
      
      // Cache the result
      this.universityCache.set(domain, universityData);
      await this.cacheManager.set(`university:${domain}`, universityData, 86400); // 24 hours

      return universityData;
    } catch (error) {
      await this.auditLogger.logProfileEvent('UNIVERSITY_LOOKUP_ERROR', 'system', {
        email,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Map email to university with detailed analysis
   */
  async mapEmailToUniversity(email: string): Promise<UniversityMappingResult> {
    try {
      const domain = this.extractDomainFromEmail(email);
      const prefix = this.extractPrefixFromEmail(email);

      if (!domain) {
        return {
          university: null as any,
          domain: '',
          prefix,
          isValid: false,
          confidence: 0
        };
      }

      const university = await this.getUniversityFromEmail(email);
      
      if (!university) {
        return {
          university: null as any,
          domain,
          prefix,
          isValid: false,
          confidence: 0
        };
      }

      // Calculate confidence score
      const confidence = this.calculateConfidenceScore(university, domain, prefix);

      // Validate email format
      const isValid = this.validateUniversityEmail(email, university);

      return {
        university,
        domain,
        prefix,
        isValid,
        confidence
      };
    } catch (error) {
      await this.auditLogger.logProfileEvent('UNIVERSITY_MAPPING_ERROR', 'system', {
        email,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get academic year information for a university
   */
  async getAcademicYearInfo(universityId: string): Promise<AcademicYearInfo | null> {
    try {
      const university = await UniversityProfile.findByPk(universityId);
      if (!university) {
        return null;
      }

      const now = new Date();
      const currentYear = university.getCurrentAcademicYear();
      const currentSemester = university.getCurrentSemester();

      // Calculate academic year dates
      const [startMonth, startDay] = university.academicYearStart.split('-').map(Number);
      const [endMonth, endDay] = university.academicYearEnd.split('-').map(Number);

      const academicYearStart = new Date(currentYear, startMonth - 1, startDay);
      const academicYearEnd = new Date(currentYear, endMonth - 1, endDay);

      // Check if we're in the current academic year
      const isActive = now >= academicYearStart && now <= academicYearEnd;

      return {
        currentYear,
        currentSemester,
        academicYearStart,
        academicYearEnd,
        isActive
      };
    } catch (error) {
      await this.auditLogger.logProfileEvent('ACADEMIC_YEAR_LOOKUP_ERROR', 'system', {
        universityId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get available programs for a university
   */
  async getUniversityPrograms(universityId: string, filters?: {
    level?: 'undergraduate' | 'graduate' | 'doctoral';
    faculty?: string;
    department?: string;
  }): Promise<string[]> {
    try {
      const university = await UniversityProfile.findByPk(universityId);
      if (!university) {
        return [];
      }

      let programs = university.programs;

      // Apply filters
      if (filters?.level) {
        programs = programs.filter(program => 
          this.isProgramLevel(program, filters.level!)
        );
      }

      if (filters?.faculty) {
        programs = programs.filter(program => 
          this.isProgramInFaculty(program, filters.faculty!)
        );
      }

      if (filters?.department) {
        programs = programs.filter(program => 
          this.isProgramInDepartment(program, filters.department!)
        );
      }

      return programs;
    } catch (error) {
      await this.auditLogger.logProfileEvent('PROGRAMS_LOOKUP_ERROR', 'system', {
        universityId,
        filters,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get available degrees for a university
   */
  async getUniversityDegrees(universityId: string): Promise<string[]> {
    try {
      const university = await UniversityProfile.findByPk(universityId);
      if (!university) {
        return [];
      }

      return university.degrees;
    } catch (error) {
      await this.auditLogger.logProfileEvent('DEGREES_LOOKUP_ERROR', 'system', {
        universityId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get faculties and departments for a university
   */
  async getUniversityStructure(universityId: string): Promise<{
    faculties: string[];
    departments: string[];
    facultyDepartments: { [faculty: string]: string[] };
  }> {
    try {
      const university = await UniversityProfile.findByPk(universityId);
      if (!university) {
        return {
          faculties: [],
          departments: [],
          facultyDepartments: {}
        };
      }

      // Group departments by faculty
      const facultyDepartments: { [faculty: string]: string[] } = {};
      for (const faculty of university.faculties) {
        facultyDepartments[faculty] = university.departments.filter(dept =>
          this.isDepartmentInFaculty(dept, faculty)
        );
      }

      return {
        faculties: university.faculties,
        departments: university.departments,
        facultyDepartments
      };
    } catch (error) {
      await this.auditLogger.logProfileEvent('UNIVERSITY_STRUCTURE_LOOKUP_ERROR', 'system', {
        universityId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Validate if email belongs to university
   */
  async validateUniversityEmail(email: string, universityId?: string): Promise<boolean> {
    try {
      const domain = this.extractDomainFromEmail(email);
      if (!domain) {
        return false;
      }

      let university: IUniversityProfile | null = null;

      if (universityId) {
        university = await UniversityProfile.findByPk(universityId);
      } else {
        university = await this.getUniversityFromEmail(email);
      }

      if (!university) {
        return false;
      }

      return this.validateUniversityEmail(email, university);
    } catch (error) {
      await this.auditLogger.logProfileEvent('EMAIL_VALIDATION_ERROR', 'system', {
        email,
        universityId,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Get university statistics
   */
  async getUniversityStatistics(universityId: string): Promise<{
    totalStudents: number;
    activeStudents: number;
    alumniCount: number;
    facultyCount: number;
    programsCount: number;
    departmentsCount: number;
  }> {
    try {
      const university = await UniversityProfile.findByPk(universityId);
      if (!university) {
        throw new Error('University not found');
      }

      // Get student counts from user profiles
      const totalStudents = await this.getStudentCount(universityId);
      const activeStudents = await this.getActiveStudentCount(universityId);
      const alumniCount = await this.getAlumniCount(universityId);

      return {
        totalStudents,
        activeStudents,
        alumniCount,
        facultyCount: university.facultyCount || 0,
        programsCount: university.programs.length,
        departmentsCount: university.departments.length
      };
    } catch (error) {
      await this.auditLogger.logProfileEvent('UNIVERSITY_STATISTICS_ERROR', 'system', {
        universityId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Extract domain from email
   */
  private extractDomainFromEmail(email: string): string | null {
    const parts = email.split('@');
    if (parts.length !== 2) {
      return null;
    }
    return parts[1].toLowerCase();
  }

  /**
   * Extract prefix from email
   */
  private extractPrefixFromEmail(email: string): string | null {
    const parts = email.split('@');
    if (parts.length !== 2) {
      return null;
    }
    return parts[0].toLowerCase();
  }

  /**
   * Calculate confidence score for university mapping
   */
  private calculateConfidenceScore(
    university: IUniversityProfile,
    domain: string,
    prefix?: string
  ): number {
    let score = 0;

    // Base score for university found
    score += 50;

    // University verification status
    if (university.isVerified) {
      score += 30;
    }

    // University status
    if (university.status === 'active') {
      score += 20;
    }

    // Domain match
    if (university.domain === domain) {
      score += 10;
    }

    // Prefix validation (if available)
    if (prefix && this.isValidStudentPrefix(prefix)) {
      score += 10;
    }

    return Math.min(score, 100);
  }

  /**
   * Validate university email format
   */
  private validateUniversityEmail(email: string, university: IUniversityProfile): boolean {
    const domain = this.extractDomainFromEmail(email);
    if (!domain) {
      return false;
    }

    // Check domain match
    if (university.domain !== domain) {
      return false;
    }

    // Check university status
    if (university.status !== 'active') {
      return false;
    }

    // Check if university allows student networking
    if (!university.allowStudentNetworking) {
      return false;
    }

    return true;
  }

  /**
   * Check if prefix is valid student prefix
   */
  private isValidStudentPrefix(prefix: string): boolean {
    // Common student email patterns
    const patterns = [
      /^[a-z]+\d+$/,           // letters followed by numbers
      /^\d+[a-z]+$/,           // numbers followed by letters
      /^[a-z]+\.[a-z]+$/,      // firstname.lastname
      /^[a-z]+\.[a-z]+\d+$/,   // firstname.lastname + numbers
      /^[a-z]+\d+[a-z]+$/      // letters + numbers + letters
    ];

    return patterns.some(pattern => pattern.test(prefix));
  }

  /**
   * Check if program is of specific level
   */
  private isProgramLevel(program: string, level: string): boolean {
    const levelKeywords = {
      undergraduate: ['bachelor', 'undergraduate', 'bsc', 'ba', 'beng', 'btech'],
      graduate: ['master', 'graduate', 'msc', 'ma', 'meng', 'mtech', 'mba'],
      doctoral: ['phd', 'doctorate', 'doctoral', 'dphil']
    };

    const keywords = levelKeywords[level] || [];
    return keywords.some(keyword => 
      program.toLowerCase().includes(keyword)
    );
  }

  /**
   * Check if program is in specific faculty
   */
  private isProgramInFaculty(program: string, faculty: string): boolean {
    // This would need to be implemented based on your data structure
    // For now, return true as placeholder
    return true;
  }

  /**
   * Check if program is in specific department
   */
  private isProgramInDepartment(program: string, department: string): boolean {
    // This would need to be implemented based on your data structure
    // For now, return true as placeholder
    return true;
  }

  /**
   * Check if department is in specific faculty
   */
  private isDepartmentInFaculty(department: string, faculty: string): boolean {
    // This would need to be implemented based on your data structure
    // For now, return true as placeholder
    return true;
  }

  /**
   * Get student count for university
   */
  private async getStudentCount(universityId: string): Promise<number> {
    // TODO: Implement with UserProfile model
    return 0;
  }

  /**
   * Get active student count for university
   */
  private async getActiveStudentCount(universityId: string): Promise<number> {
    // TODO: Implement with UserProfile model
    return 0;
  }

  /**
   * Get alumni count for university
   */
  private async getAlumniCount(universityId: string): Promise<number> {
    // TODO: Implement with UserProfile model
    return 0;
  }
}
