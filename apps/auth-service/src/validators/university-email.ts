/**
 * University Email Validation System
 * 
 * Comprehensive email validation for university students with fraud detection
 * and prefix validation capabilities.
 * 
 * @author ChitLaq Development Team
 * @version 1.0.0
 */

import { University } from '../models/university';
import { FraudDetection } from '../utils/fraud-detection';
import { RateLimiter } from '../middleware/rate-limit';

export interface ValidationResult {
  isValid: boolean;
  isUniversity: boolean;
  isPrefixValid: boolean;
  isDisposable: boolean;
  isSuspicious: boolean;
  university?: {
    id: string;
    name: string;
    domain: string;
    country: string;
    type: 'public' | 'private' | 'community';
    prefixes: string[];
  };
  prefix?: {
    pattern: string;
    department?: string;
    faculty?: string;
    level?: 'undergraduate' | 'graduate' | 'phd' | 'faculty';
  };
  riskScore: number;
  reasons: string[];
  timestamp: Date;
}

export interface ValidationOptions {
  strictMode?: boolean;
  allowFaculty?: boolean;
  allowStaff?: boolean;
  requirePrefix?: boolean;
  checkAcademicYear?: boolean;
  enableFraudDetection?: boolean;
  enableGeographicValidation?: boolean;
}

export class UniversityEmailValidator {
  private fraudDetection: FraudDetection;
  private rateLimiter: RateLimiter;
  private disposableEmailDomains: Set<string>;
  private suspiciousPatterns: RegExp[];

  constructor() {
    this.fraudDetection = new FraudDetection();
    this.rateLimiter = new RateLimiter();
    this.disposableEmailDomains = new Set();
    this.suspiciousPatterns = [
      /^[a-z]+\d{4,}@/, // Pattern: name1234@
      /^[a-z]{1,2}\d{6,}@/, // Pattern: ab123456@
      /^test\d*@/, // Pattern: test123@
      /^user\d*@/, // Pattern: user123@
      /^admin\d*@/, // Pattern: admin123@
      /^temp\d*@/, // Pattern: temp123@
      /^fake\d*@/, // Pattern: fake123@
      /^dummy\d*@/, // Pattern: dummy123@
      /^sample\d*@/, // Pattern: sample123@
      /^example\d*@/, // Pattern: example123@
    ];

    this.loadDisposableEmailDomains();
  }

  /**
   * Validates a university email address
   */
  async validateEmail(
    email: string,
    options: ValidationOptions = {},
    clientIp?: string
  ): Promise<ValidationResult> {
    const startTime = Date.now();
    const reasons: string[] = [];
    let riskScore = 0;

    // Rate limiting check
    if (clientIp && !(await this.rateLimiter.checkLimit(clientIp, 'email_validation'))) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    // Basic email format validation
    if (!this.isValidEmailFormat(email)) {
      return {
        isValid: false,
        isUniversity: false,
        isPrefixValid: false,
        isDisposable: false,
        isSuspicious: false,
        riskScore: 100,
        reasons: ['Invalid email format'],
        timestamp: new Date()
      };
    }

    const [localPart, domain] = email.toLowerCase().split('@');

    // Check if domain is a university domain
    const university = await this.findUniversityByDomain(domain);
    const isUniversity = !!university;

    if (!isUniversity) {
      reasons.push('Domain not found in university database');
      riskScore += 30;
    }

    // Check for disposable email
    const isDisposable = await this.isDisposableEmail(domain);
    if (isDisposable) {
      reasons.push('Disposable email domain detected');
      riskScore += 50;
    }

    // Check for suspicious patterns
    const isSuspicious = this.detectSuspiciousPattern(localPart);
    if (isSuspicious) {
      reasons.push('Suspicious email pattern detected');
      riskScore += 40;
    }

    // Validate prefix if university found
    let prefixValidation = null;
    let isPrefixValid = false;

    if (university && options.requirePrefix !== false) {
      prefixValidation = this.validatePrefix(localPart, university.prefixes);
      isPrefixValid = prefixValidation.isValid;

      if (!isPrefixValid) {
        reasons.push('Invalid or missing prefix pattern');
        riskScore += 20;
      }
    }

    // Faculty/Staff validation
    if (university && !options.allowFaculty && prefixValidation?.level === 'faculty') {
      reasons.push('Faculty emails not allowed');
      riskScore += 25;
    }

    if (university && !options.allowStaff && prefixValidation?.level === 'staff') {
      reasons.push('Staff emails not allowed');
      riskScore += 25;
    }

    // Academic year validation
    if (options.checkAcademicYear && university) {
      const academicYearValid = this.validateAcademicYear(localPart);
      if (!academicYearValid) {
        reasons.push('Invalid academic year pattern');
        riskScore += 15;
      }
    }

    // Geographic validation
    if (options.enableGeographicValidation && university) {
      const geoValid = await this.validateGeographicLocation(domain, clientIp);
      if (!geoValid) {
        reasons.push('Geographic validation failed');
        riskScore += 35;
      }
    }

    // Fraud detection
    if (options.enableFraudDetection !== false) {
      const fraudScore = await this.fraudDetection.analyzeEmail(email, {
        university,
        prefix: prefixValidation,
        clientIp,
        userAgent: options.userAgent
      });
      riskScore += fraudScore;
    }

    // Log validation attempt
    await this.logValidationAttempt({
      email,
      isValid: riskScore < 50,
      riskScore,
      reasons,
      university: university?.id,
      clientIp,
      timestamp: new Date(),
      processingTime: Date.now() - startTime
    });

    const isValid = riskScore < 50 && isUniversity && !isDisposable && !isSuspicious;

    return {
      isValid,
      isUniversity,
      isPrefixValid,
      isDisposable,
      isSuspicious,
      university: university ? {
        id: university.id,
        name: university.name,
        domain: university.domain,
        country: university.country,
        type: university.type,
        prefixes: university.prefixes
      } : undefined,
      prefix: prefixValidation,
      riskScore,
      reasons,
      timestamp: new Date()
    };
  }

  /**
   * Validates multiple emails in batch
   */
  async validateBatch(
    emails: string[],
    options: ValidationOptions = {},
    clientIp?: string
  ): Promise<ValidationResult[]> {
    if (emails.length > 100) {
      throw new Error('Batch size cannot exceed 100 emails');
    }

    // Rate limiting for batch operations
    if (clientIp && !(await this.rateLimiter.checkLimit(clientIp, 'batch_validation'))) {
      throw new Error('Rate limit exceeded for batch operations');
    }

    const results = await Promise.all(
      emails.map(email => this.validateEmail(email, options, clientIp))
    );

    return results;
  }

  /**
   * Checks if email format is valid
   */
  private isValidEmailFormat(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(email) && email.length <= 254;
  }

  /**
   * Finds university by domain
   */
  private async findUniversityByDomain(domain: string): Promise<University | null> {
    try {
      const university = await University.findOne({
        where: { domain },
        include: ['prefixes']
      });
      return university;
    } catch (error) {
      console.error('Error finding university:', error);
      return null;
    }
  }

  /**
   * Checks if email domain is disposable
   */
  private async isDisposableEmail(domain: string): Promise<boolean> {
    if (this.disposableEmailDomains.has(domain)) {
      return true;
    }

    // Check against online disposable email list
    try {
      const response = await fetch(`https://disposable.debounce.io/?email=${domain}`);
      const data = await response.json();
      return data.disposable === 'true';
    } catch (error) {
      console.error('Error checking disposable email:', error);
      return false;
    }
  }

  /**
   * Detects suspicious patterns in email local part
   */
  private detectSuspiciousPattern(localPart: string): boolean {
    return this.suspiciousPatterns.some(pattern => pattern.test(localPart));
  }

  /**
   * Validates email prefix against university patterns
   */
  private validatePrefix(localPart: string, universityPrefixes: string[]): {
    isValid: boolean;
    pattern?: string;
    department?: string;
    faculty?: string;
    level?: 'undergraduate' | 'graduate' | 'phd' | 'faculty' | 'staff';
  } {
    for (const prefix of universityPrefixes) {
      const regex = new RegExp(`^${prefix.replace(/\*/g, '.*')}`);
      if (regex.test(localPart)) {
        return {
          isValid: true,
          pattern: prefix,
          department: this.extractDepartment(prefix),
          faculty: this.extractFaculty(prefix),
          level: this.extractLevel(prefix)
        };
      }
    }

    return { isValid: false };
  }

  /**
   * Extracts department from prefix pattern
   */
  private extractDepartment(prefix: string): string | undefined {
    const departmentMap: { [key: string]: string } = {
      'cs_': 'Computer Science',
      'eng_': 'Engineering',
      'med_': 'Medicine',
      'law_': 'Law',
      'bus_': 'Business',
      'art_': 'Arts',
      'sci_': 'Science',
      'edu_': 'Education',
      'psy_': 'Psychology',
      'eco_': 'Economics'
    };

    return departmentMap[prefix] || undefined;
  }

  /**
   * Extracts faculty from prefix pattern
   */
  private extractFaculty(prefix: string): string | undefined {
    if (prefix.includes('faculty_')) return 'Faculty';
    if (prefix.includes('staff_')) return 'Staff';
    if (prefix.includes('admin_')) return 'Administration';
    return undefined;
  }

  /**
   * Extracts academic level from prefix pattern
   */
  private extractLevel(prefix: string): 'undergraduate' | 'graduate' | 'phd' | 'faculty' | 'staff' {
    if (prefix.includes('ug_') || prefix.includes('undergrad_')) return 'undergraduate';
    if (prefix.includes('grad_') || prefix.includes('ms_') || prefix.includes('ma_')) return 'graduate';
    if (prefix.includes('phd_') || prefix.includes('dr_')) return 'phd';
    if (prefix.includes('faculty_') || prefix.includes('prof_')) return 'faculty';
    if (prefix.includes('staff_') || prefix.includes('admin_')) return 'staff';
    return 'undergraduate';
  }

  /**
   * Validates academic year pattern
   */
  private validateAcademicYear(localPart: string): boolean {
    // Pattern: year at the end (e.g., john.doe2024, jane.smith2023)
    const yearPattern = /\d{4}$/;
    if (yearPattern.test(localPart)) {
      const year = parseInt(localPart.slice(-4));
      const currentYear = new Date().getFullYear();
      return year >= currentYear - 6 && year <= currentYear + 1; // Allow 6 years back, 1 year forward
    }
    return true; // If no year pattern, assume valid
  }

  /**
   * Validates geographic location
   */
  private async validateGeographicLocation(domain: string, clientIp?: string): Promise<boolean> {
    if (!clientIp) return true;

    try {
      // Get university country
      const university = await this.findUniversityByDomain(domain);
      if (!university) return false;

      // Get client country (simplified - in production, use proper GeoIP service)
      const clientCountry = await this.getClientCountry(clientIp);
      
      // Allow if client is in same country or common countries
      const allowedCountries = [university.country, 'US', 'CA', 'GB', 'AU'];
      return allowedCountries.includes(clientCountry);
    } catch (error) {
      console.error('Error validating geographic location:', error);
      return true; // Allow if validation fails
    }
  }

  /**
   * Gets client country from IP (simplified implementation)
   */
  private async getClientCountry(ip: string): Promise<string> {
    try {
      const response = await fetch(`https://ipapi.co/${ip}/country/`);
      return await response.text();
    } catch (error) {
      console.error('Error getting client country:', error);
      return 'US'; // Default fallback
    }
  }

  /**
   * Loads disposable email domains
   */
  private async loadDisposableEmailDomains(): Promise<void> {
    const commonDisposableDomains = [
      '10minutemail.com',
      'tempmail.org',
      'guerrillamail.com',
      'mailinator.com',
      'yopmail.com',
      'temp-mail.org',
      'throwaway.email',
      'getnada.com',
      'maildrop.cc',
      'sharklasers.com'
    ];

    commonDisposableDomains.forEach(domain => {
      this.disposableEmailDomains.add(domain);
    });
  }

  /**
   * Logs validation attempt for audit trail
   */
  private async logValidationAttempt(data: {
    email: string;
    isValid: boolean;
    riskScore: number;
    reasons: string[];
    university?: string;
    clientIp?: string;
    timestamp: Date;
    processingTime: number;
  }): Promise<void> {
    try {
      // In production, log to database or external logging service
      console.log('Validation attempt:', {
        email: data.email.replace(/(.{2}).*(@.*)/, '$1***$2'), // Mask email
        isValid: data.isValid,
        riskScore: data.riskScore,
        reasons: data.reasons,
        university: data.university,
        clientIp: data.clientIp,
        timestamp: data.timestamp,
        processingTime: data.processingTime
      });
    } catch (error) {
      console.error('Error logging validation attempt:', error);
    }
  }
}

export default UniversityEmailValidator;
