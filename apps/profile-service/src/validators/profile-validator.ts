import { IUserProfileCreation, ProfileUpdateData } from '../models/UserProfile';
import { UniversityProfile } from '../models/UniversityProfile';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ProfileValidationOptions {
  strictMode?: boolean;
  allowPartial?: boolean;
  validateUniversity?: boolean;
  validateUniqueness?: boolean;
}

export class ProfileValidator {
  private readonly USERNAME_MIN_LENGTH = 3;
  private readonly USERNAME_MAX_LENGTH = 50;
  private readonly DISPLAY_NAME_MIN_LENGTH = 1;
  private readonly DISPLAY_NAME_MAX_LENGTH = 100;
  private readonly BIO_MAX_LENGTH = 500;
  private readonly MAJOR_MAX_LENGTH = 100;
  private readonly MINOR_MAX_LENGTH = 100;
  private readonly DEPARTMENT_MAX_LENGTH = 100;
  private readonly FACULTY_MAX_LENGTH = 100;
  private readonly STUDENT_ID_MAX_LENGTH = 50;
  private readonly PHONE_MAX_LENGTH = 20;
  private readonly WEBSITE_MAX_LENGTH = 500;
  private readonly SOCIAL_HANDLE_MAX_LENGTH = 100;
  private readonly LOCATION_MAX_LENGTH = 100;
  private readonly TIMEZONE_MAX_LENGTH = 50;

  /**
   * Validate profile creation data
   */
  async validateProfileCreation(
    profileData: IUserProfileCreation,
    options: ProfileValidationOptions = {}
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields validation
    this.validateRequiredFields(profileData, errors);

    // Field format validation
    this.validateFieldFormats(profileData, errors, warnings);

    // Business logic validation
    await this.validateBusinessLogic(profileData, errors, warnings, options);

    // University validation
    if (options.validateUniversity !== false) {
      await this.validateUniversity(profileData, errors, warnings);
    }

    // Uniqueness validation
    if (options.validateUniqueness !== false) {
      await this.validateUniqueness(profileData, errors, options);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate profile update data
   */
  async validateProfileUpdate(
    updateData: ProfileUpdateData,
    options: ProfileValidationOptions = {}
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Field format validation
    this.validateFieldFormats(updateData, errors, warnings);

    // Business logic validation
    await this.validateBusinessLogic(updateData, errors, warnings, options);

    // Uniqueness validation for updated fields
    if (options.validateUniqueness !== false) {
      await this.validateUniqueness(updateData, errors, options);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate required fields
   */
  private validateRequiredFields(profileData: IUserProfileCreation, errors: string[]): void {
    const requiredFields = [
      { field: 'displayName', name: 'Display Name' },
      { field: 'universityEmail', name: 'University Email' }
    ];

    for (const { field, name } of requiredFields) {
      if (!profileData[field as keyof IUserProfileCreation]) {
        errors.push(`${name} is required`);
      }
    }
  }

  /**
   * Validate field formats
   */
  private validateFieldFormats(
    data: IUserProfileCreation | ProfileUpdateData,
    errors: string[],
    warnings: string[]
  ): void {
    // Username validation
    if (data.username !== undefined) {
      this.validateUsername(data.username, errors, warnings);
    }

    // Display name validation
    if (data.displayName !== undefined) {
      this.validateDisplayName(data.displayName, errors, warnings);
    }

    // Bio validation
    if (data.bio !== undefined) {
      this.validateBio(data.bio, errors, warnings);
    }

    // Email validation
    if (data.email !== undefined) {
      this.validateEmail(data.email, errors, warnings);
    }

    if (data.universityEmail !== undefined) {
      this.validateUniversityEmail(data.universityEmail, errors, warnings);
    }

    // Phone validation
    if (data.phone !== undefined) {
      this.validatePhone(data.phone, errors, warnings);
    }

    // Website validation
    if (data.website !== undefined) {
      this.validateWebsite(data.website, errors, warnings);
    }

    // Social media validation
    if (data.linkedin !== undefined) {
      this.validateLinkedIn(data.linkedin, errors, warnings);
    }

    if (data.github !== undefined) {
      this.validateGitHub(data.github, errors, warnings);
    }

    if (data.twitter !== undefined) {
      this.validateTwitter(data.twitter, errors, warnings);
    }

    // Academic information validation
    if (data.major !== undefined) {
      this.validateMajor(data.major, errors, warnings);
    }

    if (data.minor !== undefined) {
      this.validateMinor(data.minor, errors, warnings);
    }

    if (data.department !== undefined) {
      this.validateDepartment(data.department, errors, warnings);
    }

    if (data.faculty !== undefined) {
      this.validateFaculty(data.faculty, errors, warnings);
    }

    if (data.academicYear !== undefined) {
      this.validateAcademicYear(data.academicYear, errors, warnings);
    }

    if (data.graduationYear !== undefined) {
      this.validateGraduationYear(data.graduationYear, errors, warnings);
    }

    if (data.studentId !== undefined) {
      this.validateStudentId(data.studentId, errors, warnings);
    }

    // Location validation
    if (data.city !== undefined) {
      this.validateCity(data.city, errors, warnings);
    }

    if (data.country !== undefined) {
      this.validateCountry(data.country, errors, warnings);
    }

    if (data.timezone !== undefined) {
      this.validateTimezone(data.timezone, errors, warnings);
    }
  }

  /**
   * Validate business logic
   */
  private async validateBusinessLogic(
    data: IUserProfileCreation | ProfileUpdateData,
    errors: string[],
    warnings: string[],
    options: ProfileValidationOptions
  ): Promise<void> {
    // Academic year and graduation year consistency
    if (data.academicYear !== undefined && data.graduationYear !== undefined) {
      this.validateAcademicYearConsistency(data.academicYear, data.graduationYear, errors, warnings);
    }

    // Profile picture and cover photo validation
    if (data.profilePicture !== undefined) {
      this.validateProfilePicture(data.profilePicture, errors, warnings);
    }

    if (data.coverPhoto !== undefined) {
      this.validateCoverPhoto(data.coverPhoto, errors, warnings);
    }

    // Privacy settings validation
    this.validatePrivacySettings(data, errors, warnings);

    // Academic information completeness
    if (options.strictMode) {
      this.validateAcademicCompleteness(data, errors, warnings);
    }
  }

  /**
   * Validate university information
   */
  private async validateUniversity(
    data: IUserProfileCreation | ProfileUpdateData,
    errors: string[],
    warnings: string[]
  ): Promise<void> {
    if (data.universityEmail) {
      try {
        const domain = this.extractDomainFromEmail(data.universityEmail);
        if (!domain) {
          errors.push('Invalid university email format');
          return;
        }

        const university = await UniversityProfile.findOne({
          where: { domain }
        });

        if (!university) {
          errors.push('University not found for the provided email domain');
          return;
        }

        if (university.status !== 'active') {
          errors.push('University is not active');
          return;
        }

        if (!university.allowStudentNetworking) {
          errors.push('University does not allow student networking');
          return;
        }

        // Validate academic information against university
        if (data.major && !university.programs.includes(data.major)) {
          warnings.push('Major not found in university programs');
        }

        if (data.department && !university.departments.includes(data.department)) {
          warnings.push('Department not found in university departments');
        }

        if (data.faculty && !university.faculties.includes(data.faculty)) {
          warnings.push('Faculty not found in university faculties');
        }

      } catch (error) {
        errors.push('Error validating university information');
      }
    }
  }

  /**
   * Validate uniqueness constraints
   */
  private async validateUniqueness(
    data: IUserProfileCreation | ProfileUpdateData,
    errors: string[],
    options: ProfileValidationOptions
  ): Promise<void> {
    // Username uniqueness
    if (data.username) {
      const existingProfile = await this.findProfileByUsername(data.username);
      if (existingProfile) {
        errors.push('Username is already taken');
      }
    }

    // Email uniqueness (if provided)
    if (data.email) {
      const existingProfile = await this.findProfileByEmail(data.email);
      if (existingProfile) {
        errors.push('Email is already in use');
      }
    }

    // Student ID uniqueness (if provided)
    if (data.studentId && data.universityId) {
      const existingProfile = await this.findProfileByStudentId(data.studentId, data.universityId);
      if (existingProfile) {
        errors.push('Student ID is already in use at this university');
      }
    }
  }

  /**
   * Validate username
   */
  private validateUsername(username: string, errors: string[], warnings: string[]): void {
    if (!username) {
      errors.push('Username is required');
      return;
    }

    if (username.length < this.USERNAME_MIN_LENGTH) {
      errors.push(`Username must be at least ${this.USERNAME_MIN_LENGTH} characters long`);
    }

    if (username.length > this.USERNAME_MAX_LENGTH) {
      errors.push(`Username must be no more than ${this.USERNAME_MAX_LENGTH} characters long`);
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      errors.push('Username can only contain letters, numbers, and underscores');
    }

    if (!/^[a-zA-Z]/.test(username)) {
      errors.push('Username must start with a letter');
    }

    if (username.endsWith('_')) {
      warnings.push('Username ending with underscore may be confusing');
    }

    // Check for reserved usernames
    const reservedUsernames = ['admin', 'root', 'system', 'api', 'www', 'mail', 'support', 'help'];
    if (reservedUsernames.includes(username.toLowerCase())) {
      errors.push('Username is reserved and cannot be used');
    }
  }

  /**
   * Validate display name
   */
  private validateDisplayName(displayName: string, errors: string[], warnings: string[]): void {
    if (!displayName) {
      errors.push('Display name is required');
      return;
    }

    if (displayName.length < this.DISPLAY_NAME_MIN_LENGTH) {
      errors.push(`Display name must be at least ${this.DISPLAY_NAME_MIN_LENGTH} character long`);
    }

    if (displayName.length > this.DISPLAY_NAME_MAX_LENGTH) {
      errors.push(`Display name must be no more than ${this.DISPLAY_NAME_MAX_LENGTH} characters long`);
    }

    if (displayName.trim() !== displayName) {
      warnings.push('Display name should not have leading or trailing spaces');
    }

    // Check for potentially offensive content
    if (this.containsOffensiveContent(displayName)) {
      warnings.push('Display name may contain inappropriate content');
    }
  }

  /**
   * Validate bio
   */
  private validateBio(bio: string, errors: string[], warnings: string[]): void {
    if (bio && bio.length > this.BIO_MAX_LENGTH) {
      errors.push(`Bio must be no more than ${this.BIO_MAX_LENGTH} characters long`);
    }

    if (bio && this.containsOffensiveContent(bio)) {
      warnings.push('Bio may contain inappropriate content');
    }

    if (bio && bio.trim().length < 10) {
      warnings.push('Bio is very short, consider adding more information');
    }
  }

  /**
   * Validate email
   */
  private validateEmail(email: string, errors: string[], warnings: string[]): void {
    if (!email) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push('Invalid email format');
      return;
    }

    if (email.length > 255) {
      errors.push('Email is too long');
    }

    // Check for disposable email domains
    const disposableDomains = ['10minutemail.com', 'tempmail.org', 'guerrillamail.com'];
    const domain = email.split('@')[1];
    if (disposableDomains.includes(domain)) {
      warnings.push('Disposable email addresses are not recommended');
    }
  }

  /**
   * Validate university email
   */
  private validateUniversityEmail(email: string, errors: string[], warnings: string[]): void {
    if (!email) {
      errors.push('University email is required');
      return;
    }

    this.validateEmail(email, errors, warnings);

    const domain = this.extractDomainFromEmail(email);
    if (!domain) {
      errors.push('Invalid university email format');
      return;
    }

    if (!domain.endsWith('.edu')) {
      errors.push('University email must be from an educational institution (.edu domain)');
    }
  }

  /**
   * Validate phone number
   */
  private validatePhone(phone: string, errors: string[], warnings: string[]): void {
    if (!phone) return;

    if (phone.length > this.PHONE_MAX_LENGTH) {
      errors.push(`Phone number must be no more than ${this.PHONE_MAX_LENGTH} characters long`);
    }

    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))) {
      errors.push('Invalid phone number format');
    }
  }

  /**
   * Validate website URL
   */
  private validateWebsite(website: string, errors: string[], warnings: string[]): void {
    if (!website) return;

    if (website.length > this.WEBSITE_MAX_LENGTH) {
      errors.push(`Website URL must be no more than ${this.WEBSITE_MAX_LENGTH} characters long`);
    }

    try {
      const url = new URL(website);
      if (!['http:', 'https:'].includes(url.protocol)) {
        errors.push('Website URL must use HTTP or HTTPS protocol');
      }
    } catch {
      errors.push('Invalid website URL format');
    }
  }

  /**
   * Validate LinkedIn handle
   */
  private validateLinkedIn(linkedin: string, errors: string[], warnings: string[]): void {
    if (!linkedin) return;

    if (linkedin.length > this.SOCIAL_HANDLE_MAX_LENGTH) {
      errors.push(`LinkedIn handle must be no more than ${this.SOCIAL_HANDLE_MAX_LENGTH} characters long`);
    }

    if (!/^[a-zA-Z0-9\-_]+$/.test(linkedin)) {
      errors.push('LinkedIn handle can only contain letters, numbers, hyphens, and underscores');
    }
  }

  /**
   * Validate GitHub handle
   */
  private validateGitHub(github: string, errors: string[], warnings: string[]): void {
    if (!github) return;

    if (github.length > this.SOCIAL_HANDLE_MAX_LENGTH) {
      errors.push(`GitHub handle must be no more than ${this.SOCIAL_HANDLE_MAX_LENGTH} characters long`);
    }

    if (!/^[a-zA-Z0-9\-_]+$/.test(github)) {
      errors.push('GitHub handle can only contain letters, numbers, hyphens, and underscores');
    }
  }

  /**
   * Validate Twitter handle
   */
  private validateTwitter(twitter: string, errors: string[], warnings: string[]): void {
    if (!twitter) return;

    if (twitter.length > this.SOCIAL_HANDLE_MAX_LENGTH) {
      errors.push(`Twitter handle must be no more than ${this.SOCIAL_HANDLE_MAX_LENGTH} characters long`);
    }

    if (!/^[a-zA-Z0-9_]+$/.test(twitter)) {
      errors.push('Twitter handle can only contain letters, numbers, and underscores');
    }

    if (twitter.startsWith('@')) {
      warnings.push('Twitter handle should not include the @ symbol');
    }
  }

  /**
   * Validate major
   */
  private validateMajor(major: string, errors: string[], warnings: string[]): void {
    if (!major) return;

    if (major.length > this.MAJOR_MAX_LENGTH) {
      errors.push(`Major must be no more than ${this.MAJOR_MAX_LENGTH} characters long`);
    }

    if (this.containsOffensiveContent(major)) {
      warnings.push('Major field may contain inappropriate content');
    }
  }

  /**
   * Validate minor
   */
  private validateMinor(minor: string, errors: string[], warnings: string[]): void {
    if (!minor) return;

    if (minor.length > this.MINOR_MAX_LENGTH) {
      errors.push(`Minor must be no more than ${this.MINOR_MAX_LENGTH} characters long`);
    }

    if (this.containsOffensiveContent(minor)) {
      warnings.push('Minor field may contain inappropriate content');
    }
  }

  /**
   * Validate department
   */
  private validateDepartment(department: string, errors: string[], warnings: string[]): void {
    if (!department) return;

    if (department.length > this.DEPARTMENT_MAX_LENGTH) {
      errors.push(`Department must be no more than ${this.DEPARTMENT_MAX_LENGTH} characters long`);
    }

    if (this.containsOffensiveContent(department)) {
      warnings.push('Department field may contain inappropriate content');
    }
  }

  /**
   * Validate faculty
   */
  private validateFaculty(faculty: string, errors: string[], warnings: string[]): void {
    if (!faculty) return;

    if (faculty.length > this.FACULTY_MAX_LENGTH) {
      errors.push(`Faculty must be no more than ${this.FACULTY_MAX_LENGTH} characters long`);
    }

    if (this.containsOffensiveContent(faculty)) {
      warnings.push('Faculty field may contain inappropriate content');
    }
  }

  /**
   * Validate academic year
   */
  private validateAcademicYear(academicYear: number, errors: string[], warnings: string[]): void {
    if (academicYear < 1 || academicYear > 10) {
      errors.push('Academic year must be between 1 and 10');
    }

    if (academicYear > 6) {
      warnings.push('Academic year seems unusually high');
    }
  }

  /**
   * Validate graduation year
   */
  private validateGraduationYear(graduationYear: number, errors: string[], warnings: string[]): void {
    const currentYear = new Date().getFullYear();
    
    if (graduationYear < 1950 || graduationYear > currentYear + 10) {
      errors.push(`Graduation year must be between 1950 and ${currentYear + 10}`);
    }

    if (graduationYear < currentYear - 50) {
      warnings.push('Graduation year seems very old');
    }

    if (graduationYear > currentYear + 5) {
      warnings.push('Graduation year is in the future');
    }
  }

  /**
   * Validate student ID
   */
  private validateStudentId(studentId: string, errors: string[], warnings: string[]): void {
    if (!studentId) return;

    if (studentId.length > this.STUDENT_ID_MAX_LENGTH) {
      errors.push(`Student ID must be no more than ${this.STUDENT_ID_MAX_LENGTH} characters long`);
    }

    if (!/^[a-zA-Z0-9\-_]+$/.test(studentId)) {
      errors.push('Student ID can only contain letters, numbers, hyphens, and underscores');
    }
  }

  /**
   * Validate city
   */
  private validateCity(city: string, errors: string[], warnings: string[]): void {
    if (!city) return;

    if (city.length > this.LOCATION_MAX_LENGTH) {
      errors.push(`City must be no more than ${this.LOCATION_MAX_LENGTH} characters long`);
    }

    if (this.containsOffensiveContent(city)) {
      warnings.push('City field may contain inappropriate content');
    }
  }

  /**
   * Validate country
   */
  private validateCountry(country: string, errors: string[], warnings: string[]): void {
    if (!country) return;

    if (country.length !== 2) {
      errors.push('Country must be a 2-letter ISO code');
    }

    if (!/^[A-Z]{2}$/.test(country)) {
      errors.push('Country code must be uppercase letters');
    }
  }

  /**
   * Validate timezone
   */
  private validateTimezone(timezone: string, errors: string[], warnings: string[]): void {
    if (!timezone) return;

    if (timezone.length > this.TIMEZONE_MAX_LENGTH) {
      errors.push(`Timezone must be no more than ${this.TIMEZONE_MAX_LENGTH} characters long`);
    }

    // Check if timezone is valid
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
    } catch {
      errors.push('Invalid timezone');
    }
  }

  /**
   * Validate academic year consistency
   */
  private validateAcademicYearConsistency(
    academicYear: number,
    graduationYear: number,
    errors: string[],
    warnings: string[]
  ): void {
    const currentYear = new Date().getFullYear();
    const expectedGraduationYear = currentYear + (4 - academicYear);

    if (Math.abs(graduationYear - expectedGraduationYear) > 2) {
      warnings.push('Academic year and graduation year seem inconsistent');
    }
  }

  /**
   * Validate profile picture
   */
  private validateProfilePicture(profilePicture: string, errors: string[], warnings: string[]): void {
    if (!profilePicture) return;

    try {
      const url = new URL(profilePicture);
      if (!['http:', 'https:'].includes(url.protocol)) {
        errors.push('Profile picture URL must use HTTP or HTTPS protocol');
      }
    } catch {
      errors.push('Invalid profile picture URL format');
    }
  }

  /**
   * Validate cover photo
   */
  private validateCoverPhoto(coverPhoto: string, errors: string[], warnings: string[]): void {
    if (!coverPhoto) return;

    try {
      const url = new URL(coverPhoto);
      if (!['http:', 'https:'].includes(url.protocol)) {
        errors.push('Cover photo URL must use HTTP or HTTPS protocol');
      }
    } catch {
      errors.push('Invalid cover photo URL format');
    }
  }

  /**
   * Validate privacy settings
   */
  private validatePrivacySettings(
    data: IUserProfileCreation | ProfileUpdateData,
    errors: string[],
    warnings: string[]
  ): void {
    // Check for conflicting privacy settings
    if (data.showEmail && !data.email) {
      warnings.push('Email visibility is enabled but no email is provided');
    }

    if (data.showPhone && !data.phone) {
      warnings.push('Phone visibility is enabled but no phone is provided');
    }

    if (data.showLocation && !data.city && !data.country) {
      warnings.push('Location visibility is enabled but no location is provided');
    }

    if (data.showAcademicInfo && !data.major && !data.academicYear) {
      warnings.push('Academic info visibility is enabled but no academic information is provided');
    }
  }

  /**
   * Validate academic completeness
   */
  private validateAcademicCompleteness(
    data: IUserProfileCreation | ProfileUpdateData,
    errors: string[],
    warnings: string[]
  ): void {
    const hasAcademicInfo = data.major || data.academicYear || data.department || data.faculty;
    
    if (!hasAcademicInfo) {
      warnings.push('Consider adding academic information to complete your profile');
    }

    if (data.major && !data.academicYear) {
      warnings.push('Consider adding your academic year along with your major');
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
   * Check for offensive content
   */
  private containsOffensiveContent(text: string): boolean {
    // Simple implementation - in production, use a proper content moderation service
    const offensiveWords = ['spam', 'fake', 'test', 'dummy'];
    const lowerText = text.toLowerCase();
    return offensiveWords.some(word => lowerText.includes(word));
  }

  /**
   * Find profile by username
   */
  private async findProfileByUsername(username: string): Promise<any> {
    // TODO: Implement with actual database query
    return null;
  }

  /**
   * Find profile by email
   */
  private async findProfileByEmail(email: string): Promise<any> {
    // TODO: Implement with actual database query
    return null;
  }

  /**
   * Find profile by student ID
   */
  private async findProfileByStudentId(studentId: string, universityId: string): Promise<any> {
    // TODO: Implement with actual database query
    return null;
  }
}
