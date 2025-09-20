/**
 * University Model
 * 
 * Database model for university information and email validation
 * 
 * @author ChitLaq Development Team
 * @version 1.0.0
 */

import { DataTypes, Model, Sequelize, Optional } from 'sequelize';

export interface UniversityAttributes {
  id: string;
  name: string;
  domain: string;
  country: string;
  type: 'public' | 'private' | 'community';
  status: 'active' | 'inactive' | 'suspended';
  prefixes: string[];
  departments: string[];
  faculties: string[];
  academicYearFormat: string;
  emailFormat: string;
  verificationRequired: boolean;
  maxStudents: number;
  currentStudents: number;
  establishedYear: number;
  website: string;
  contactEmail: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  timezone: string;
  language: string;
  accreditation: string[];
  partnerships: string[];
  features: {
    allowFaculty: boolean;
    allowStaff: boolean;
    allowAlumni: boolean;
    requirePrefix: boolean;
    requireAcademicYear: boolean;
    allowMultipleEmails: boolean;
    enableGeographicValidation: boolean;
    enableFraudDetection: boolean;
  };
  metadata: {
    lastVerified: Date;
    verificationSource: string;
    notes: string;
    tags: string[];
    priority: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface UniversityCreationAttributes extends Optional<UniversityAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class University extends Model<UniversityAttributes, UniversityCreationAttributes> implements UniversityAttributes {
  public id!: string;
  public name!: string;
  public domain!: string;
  public country!: string;
  public type!: 'public' | 'private' | 'community';
  public status!: 'active' | 'inactive' | 'suspended';
  public prefixes!: string[];
  public departments!: string[];
  public faculties!: string[];
  public academicYearFormat!: string;
  public emailFormat!: string;
  public verificationRequired!: boolean;
  public maxStudents!: number;
  public currentStudents!: number;
  public establishedYear!: number;
  public website!: string;
  public contactEmail!: string;
  public phone!: string;
  public address!: string;
  public city!: string;
  public state!: string;
  public postalCode!: string;
  public timezone!: string;
  public language!: string;
  public accreditation!: string[];
  public partnerships!: string[];
  public features!: {
    allowFaculty: boolean;
    allowStaff: boolean;
    allowAlumni: boolean;
    requirePrefix: boolean;
    requireAcademicYear: boolean;
    allowMultipleEmails: boolean;
    enableGeographicValidation: boolean;
    enableFraudDetection: boolean;
  };
  public metadata!: {
    lastVerified: Date;
    verificationSource: string;
    notes: string;
    tags: string[];
    priority: number;
  };
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  /**
   * Initialize the University model
   */
  public static initialize(sequelize: Sequelize): void {
    University.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        name: {
          type: DataTypes.STRING(255),
          allowNull: false,
          unique: true,
        },
        domain: {
          type: DataTypes.STRING(255),
          allowNull: false,
          unique: true,
          validate: {
            isEmail: true,
          },
        },
        country: {
          type: DataTypes.STRING(2),
          allowNull: false,
          validate: {
            len: [2, 2],
            isAlpha: true,
          },
        },
        type: {
          type: DataTypes.ENUM('public', 'private', 'community'),
          allowNull: false,
          defaultValue: 'public',
        },
        status: {
          type: DataTypes.ENUM('active', 'inactive', 'suspended'),
          allowNull: false,
          defaultValue: 'active',
        },
        prefixes: {
          type: DataTypes.JSON,
          allowNull: false,
          defaultValue: [],
          validate: {
            isArray: true,
          },
        },
        departments: {
          type: DataTypes.JSON,
          allowNull: false,
          defaultValue: [],
          validate: {
            isArray: true,
          },
        },
        faculties: {
          type: DataTypes.JSON,
          allowNull: false,
          defaultValue: [],
          validate: {
            isArray: true,
          },
        },
        academicYearFormat: {
          type: DataTypes.STRING(50),
          allowNull: false,
          defaultValue: 'YYYY',
        },
        emailFormat: {
          type: DataTypes.STRING(100),
          allowNull: false,
          defaultValue: 'firstname.lastname@domain.edu',
        },
        verificationRequired: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        maxStudents: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 50000,
          validate: {
            min: 0,
          },
        },
        currentStudents: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          validate: {
            min: 0,
          },
        },
        establishedYear: {
          type: DataTypes.INTEGER,
          allowNull: false,
          validate: {
            min: 1000,
            max: new Date().getFullYear(),
          },
        },
        website: {
          type: DataTypes.STRING(255),
          allowNull: true,
          validate: {
            isUrl: true,
          },
        },
        contactEmail: {
          type: DataTypes.STRING(255),
          allowNull: true,
          validate: {
            isEmail: true,
          },
        },
        phone: {
          type: DataTypes.STRING(50),
          allowNull: true,
        },
        address: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        city: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
        state: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
        postalCode: {
          type: DataTypes.STRING(20),
          allowNull: true,
        },
        timezone: {
          type: DataTypes.STRING(50),
          allowNull: false,
          defaultValue: 'UTC',
        },
        language: {
          type: DataTypes.STRING(10),
          allowNull: false,
          defaultValue: 'en',
        },
        accreditation: {
          type: DataTypes.JSON,
          allowNull: false,
          defaultValue: [],
          validate: {
            isArray: true,
          },
        },
        partnerships: {
          type: DataTypes.JSON,
          allowNull: false,
          defaultValue: [],
          validate: {
            isArray: true,
          },
        },
        features: {
          type: DataTypes.JSON,
          allowNull: false,
          defaultValue: {
            allowFaculty: false,
            allowStaff: false,
            allowAlumni: false,
            requirePrefix: true,
            requireAcademicYear: false,
            allowMultipleEmails: false,
            enableGeographicValidation: true,
            enableFraudDetection: true,
          },
        },
        metadata: {
          type: DataTypes.JSON,
          allowNull: false,
          defaultValue: {
            lastVerified: new Date(),
            verificationSource: 'manual',
            notes: '',
            tags: [],
            priority: 1,
          },
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        tableName: 'universities',
        timestamps: true,
        indexes: [
          {
            unique: true,
            fields: ['domain'],
          },
          {
            fields: ['country'],
          },
          {
            fields: ['type'],
          },
          {
            fields: ['status'],
          },
          {
            fields: ['name'],
          },
        ],
        hooks: {
          beforeUpdate: (university: University) => {
            university.updatedAt = new Date();
          },
        },
      }
    );
  }

  /**
   * Find university by domain
   */
  public static async findByDomain(domain: string): Promise<University | null> {
    return University.findOne({
      where: { domain: domain.toLowerCase() },
    });
  }

  /**
   * Find universities by country
   */
  public static async findByCountry(country: string): Promise<University[]> {
    return University.findAll({
      where: { country: country.toUpperCase() },
      order: [['name', 'ASC']],
    });
  }

  /**
   * Find active universities
   */
  public static async findActive(): Promise<University[]> {
    return University.findAll({
      where: { status: 'active' },
      order: [['name', 'ASC']],
    });
  }

  /**
   * Search universities by name or domain
   */
  public static async search(query: string): Promise<University[]> {
    return University.findAll({
      where: {
        [Sequelize.Op.or]: [
          { name: { [Sequelize.Op.iLike]: `%${query}%` } },
          { domain: { [Sequelize.Op.iLike]: `%${query}%` } },
        ],
        status: 'active',
      },
      order: [['name', 'ASC']],
      limit: 50,
    });
  }

  /**
   * Get university statistics
   */
  public static async getStatistics(): Promise<{
    total: number;
    active: number;
    inactive: number;
    suspended: number;
    byCountry: { [key: string]: number };
    byType: { [key: string]: number };
  }> {
    const total = await University.count();
    const active = await University.count({ where: { status: 'active' } });
    const inactive = await University.count({ where: { status: 'inactive' } });
    const suspended = await University.count({ where: { status: 'suspended' } });

    const byCountry = await University.findAll({
      attributes: [
        'country',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
      ],
      group: ['country'],
      raw: true,
    });

    const byType = await University.findAll({
      attributes: [
        'type',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
      ],
      group: ['type'],
      raw: true,
    });

    return {
      total,
      active,
      inactive,
      suspended,
      byCountry: byCountry.reduce((acc, item) => {
        acc[item.country] = parseInt(item.count);
        return acc;
      }, {} as { [key: string]: number }),
      byType: byType.reduce((acc, item) => {
        acc[item.type] = parseInt(item.count);
        return acc;
      }, {} as { [key: string]: number }),
    };
  }

  /**
   * Validate email against university patterns
   */
  public validateEmail(email: string): {
    isValid: boolean;
    prefix?: string;
    department?: string;
    faculty?: string;
    level?: string;
  } {
    const [localPart] = email.toLowerCase().split('@');
    
    for (const prefix of this.prefixes) {
      const regex = new RegExp(`^${prefix.replace(/\*/g, '.*')}`);
      if (regex.test(localPart)) {
        return {
          isValid: true,
          prefix,
          department: this.extractDepartment(prefix),
          faculty: this.extractFaculty(prefix),
          level: this.extractLevel(prefix),
        };
      }
    }

    return { isValid: false };
  }

  /**
   * Extract department from prefix
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
      'eco_': 'Economics',
    };

    return departmentMap[prefix] || undefined;
  }

  /**
   * Extract faculty from prefix
   */
  private extractFaculty(prefix: string): string | undefined {
    if (prefix.includes('faculty_')) return 'Faculty';
    if (prefix.includes('staff_')) return 'Staff';
    if (prefix.includes('admin_')) return 'Administration';
    return undefined;
  }

  /**
   * Extract academic level from prefix
   */
  private extractLevel(prefix: string): string {
    if (prefix.includes('ug_') || prefix.includes('undergrad_')) return 'undergraduate';
    if (prefix.includes('grad_') || prefix.includes('ms_') || prefix.includes('ma_')) return 'graduate';
    if (prefix.includes('phd_') || prefix.includes('dr_')) return 'phd';
    if (prefix.includes('faculty_') || prefix.includes('prof_')) return 'faculty';
    if (prefix.includes('staff_') || prefix.includes('admin_')) return 'staff';
    return 'undergraduate';
  }

  /**
   * Check if university allows specific user type
   */
  public allowsUserType(userType: 'student' | 'faculty' | 'staff' | 'alumni'): boolean {
    switch (userType) {
      case 'faculty':
        return this.features.allowFaculty;
      case 'staff':
        return this.features.allowStaff;
      case 'alumni':
        return this.features.allowAlumni;
      case 'student':
        return true; // Students are always allowed
      default:
        return false;
    }
  }

  /**
   * Get university display information
   */
  public getDisplayInfo(): {
    id: string;
    name: string;
    domain: string;
    country: string;
    type: string;
    status: string;
    website?: string;
    establishedYear: number;
    currentStudents: number;
    maxStudents: number;
  } {
    return {
      id: this.id,
      name: this.name,
      domain: this.domain,
      country: this.country,
      type: this.type,
      status: this.status,
      website: this.website,
      establishedYear: this.establishedYear,
      currentStudents: this.currentStudents,
      maxStudents: this.maxStudents,
    };
  }

  /**
   * Update student count
   */
  public async updateStudentCount(count: number): Promise<void> {
    if (count < 0) {
      throw new Error('Student count cannot be negative');
    }
    
    if (count > this.maxStudents) {
      throw new Error('Student count exceeds maximum allowed');
    }

    this.currentStudents = count;
    await this.save();
  }

  /**
   * Increment student count
   */
  public async incrementStudentCount(): Promise<void> {
    if (this.currentStudents >= this.maxStudents) {
      throw new Error('Maximum student capacity reached');
    }

    this.currentStudents += 1;
    await this.save();
  }

  /**
   * Decrement student count
   */
  public async decrementStudentCount(): Promise<void> {
    if (this.currentStudents <= 0) {
      throw new Error('Student count cannot be negative');
    }

    this.currentStudents -= 1;
    await this.save();
  }
}

export default University;
