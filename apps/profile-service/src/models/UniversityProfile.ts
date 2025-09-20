import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

// University Profile Interface
export interface IUniversityProfile {
  id: string;
  
  // Basic Information
  name: string;
  domain: string;
  country: string;
  region?: string;
  city?: string;
  
  // Academic Information
  type: 'public' | 'private' | 'community' | 'technical' | 'research';
  accreditation?: string;
  establishedYear?: number;
  studentCount?: number;
  facultyCount?: number;
  
  // Contact Information
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
  postalCode?: string;
  
  // Academic Structure
  faculties: string[];
  departments: string[];
  programs: string[];
  degrees: string[];
  
  // Academic Calendar
  academicYearStart: string; // MM-DD format
  academicYearEnd: string;   // MM-DD format
  semesterSystem: 'semester' | 'quarter' | 'trimester' | 'year';
  currentSemester?: string;
  currentYear?: number;
  
  // University Features
  hasGraduatePrograms: boolean;
  hasOnlinePrograms: boolean;
  hasInternationalPrograms: boolean;
  hasResearchPrograms: boolean;
  
  // Social Features
  allowStudentNetworking: boolean;
  allowAlumniNetworking: boolean;
  allowFacultyNetworking: boolean;
  allowCrossUniversityNetworking: boolean;
  
  // Verification
  isVerified: boolean;
  verificationLevel: 'basic' | 'verified' | 'premium';
  verificationDate?: Date;
  verifiedBy?: string;
  
  // Status
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  isPublic: boolean;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

// Optional fields for creation
export interface IUniversityProfileCreation extends Optional<IUniversityProfile,
  'region' | 'city' | 'accreditation' | 'establishedYear' | 'studentCount' |
  'facultyCount' | 'website' | 'email' | 'phone' | 'address' | 'postalCode' |
  'currentSemester' | 'currentYear' | 'verificationDate' | 'verifiedBy' |
  'createdAt' | 'updatedAt' | 'deletedAt'
> {}

// University Profile Model
export class UniversityProfile extends Model<IUniversityProfile, IUniversityProfileCreation> implements IUniversityProfile {
  public id!: string;
  
  // Basic Information
  public name!: string;
  public domain!: string;
  public country!: string;
  public region?: string;
  public city?: string;
  
  // Academic Information
  public type!: 'public' | 'private' | 'community' | 'technical' | 'research';
  public accreditation?: string;
  public establishedYear?: number;
  public studentCount?: number;
  public facultyCount?: number;
  
  // Contact Information
  public website?: string;
  public email?: string;
  public phone?: string;
  public address?: string;
  public postalCode?: string;
  
  // Academic Structure
  public faculties!: string[];
  public departments!: string[];
  public programs!: string[];
  public degrees!: string[];
  
  // Academic Calendar
  public academicYearStart!: string;
  public academicYearEnd!: string;
  public semesterSystem!: 'semester' | 'quarter' | 'trimester' | 'year';
  public currentSemester?: string;
  public currentYear?: number;
  
  // University Features
  public hasGraduatePrograms!: boolean;
  public hasOnlinePrograms!: boolean;
  public hasInternationalPrograms!: boolean;
  public hasResearchPrograms!: boolean;
  
  // Social Features
  public allowStudentNetworking!: boolean;
  public allowAlumniNetworking!: boolean;
  public allowFacultyNetworking!: boolean;
  public allowCrossUniversityNetworking!: boolean;
  
  // Verification
  public isVerified!: boolean;
  public verificationLevel!: 'basic' | 'verified' | 'premium';
  public verificationDate?: Date;
  public verifiedBy?: string;
  
  // Status
  public status!: 'active' | 'inactive' | 'pending' | 'suspended';
  public isPublic!: boolean;
  
  // Metadata
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public deletedAt?: Date;
  
  // Instance methods
  public getCurrentAcademicYear(): number {
    const now = new Date();
    const currentYear = now.getFullYear();
    const [startMonth, startDay] = this.academicYearStart.split('-').map(Number);
    const [endMonth, endDay] = this.academicYearEnd.split('-').map(Number);
    
    const academicYearStart = new Date(currentYear, startMonth - 1, startDay);
    const academicYearEnd = new Date(currentYear, endMonth - 1, endDay);
    
    // If we're before the academic year start, we're in the previous academic year
    if (now < academicYearStart) {
      return currentYear - 1;
    }
    
    // If we're after the academic year end, we're in the next academic year
    if (now > academicYearEnd) {
      return currentYear + 1;
    }
    
    return currentYear;
  }
  
  public getCurrentSemester(): string {
    const now = new Date();
    const currentYear = this.getCurrentAcademicYear();
    
    switch (this.semesterSystem) {
      case 'semester':
        const [startMonth] = this.academicYearStart.split('-').map(Number);
        const [endMonth] = this.academicYearEnd.split('-').map(Number);
        
        if (now.getMonth() >= startMonth - 1 && now.getMonth() < startMonth + 5) {
          return `Fall ${currentYear}`;
        } else {
          return `Spring ${currentYear + 1}`;
        }
        
      case 'quarter':
        const quarter = Math.floor((now.getMonth() - startMonth + 1 + 12) % 12 / 3) + 1;
        return `Q${quarter} ${currentYear}`;
        
      case 'trimester':
        const trimester = Math.floor((now.getMonth() - startMonth + 1 + 12) % 12 / 4) + 1;
        return `T${trimester} ${currentYear}`;
        
      default:
        return `${currentYear}`;
    }
  }
  
  public getAcademicPrograms(): string[] {
    return this.programs;
  }
  
  public getAvailableDegrees(): string[] {
    return this.degrees;
  }
  
  public isStudentEligible(studentEmail: string): boolean {
    const emailDomain = studentEmail.split('@')[1];
    return emailDomain === this.domain;
  }
  
  public getPublicProfile(): Partial<IUniversityProfile> {
    return {
      id: this.id,
      name: this.name,
      domain: this.domain,
      country: this.country,
      region: this.region,
      city: this.city,
      type: this.type,
      establishedYear: this.establishedYear,
      studentCount: this.studentCount,
      facultyCount: this.facultyCount,
      website: this.website,
      faculties: this.faculties,
      departments: this.departments,
      programs: this.programs,
      degrees: this.degrees,
      hasGraduatePrograms: this.hasGraduatePrograms,
      hasOnlinePrograms: this.hasOnlinePrograms,
      hasInternationalPrograms: this.hasInternationalPrograms,
      hasResearchPrograms: this.hasResearchPrograms,
      isVerified: this.isVerified,
      verificationLevel: this.verificationLevel,
      status: this.status
    };
  }
  
  public updateAcademicCalendar(): void {
    this.currentYear = this.getCurrentAcademicYear();
    this.currentSemester = this.getCurrentSemester();
  }
}

// Model initialization
export const initUniversityProfile = (sequelize: Sequelize): typeof UniversityProfile => {
  UniversityProfile.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      
      // Basic Information
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
          len: [1, 255]
        }
      },
      domain: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true
        }
      },
      country: {
        type: DataTypes.STRING(2),
        allowNull: false,
        validate: {
          len: [2, 2]
        }
      },
      region: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      city: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      
      // Academic Information
      type: {
        type: DataTypes.ENUM('public', 'private', 'community', 'technical', 'research'),
        allowNull: false,
        defaultValue: 'public'
      },
      accreditation: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      establishedYear: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: 1000,
          max: new Date().getFullYear()
        }
      },
      studentCount: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: 0
        }
      },
      facultyCount: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: 0
        }
      },
      
      // Contact Information
      website: {
        type: DataTypes.STRING(500),
        allowNull: true,
        validate: {
          isUrl: true
        }
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: true,
        validate: {
          isEmail: true
        }
      },
      phone: {
        type: DataTypes.STRING(20),
        allowNull: true
      },
      address: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      postalCode: {
        type: DataTypes.STRING(20),
        allowNull: true
      },
      
      // Academic Structure
      faculties: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: []
      },
      departments: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: []
      },
      programs: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: []
      },
      degrees: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: []
      },
      
      // Academic Calendar
      academicYearStart: {
        type: DataTypes.STRING(5),
        allowNull: false,
        defaultValue: '09-01',
        validate: {
          is: /^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/
        }
      },
      academicYearEnd: {
        type: DataTypes.STRING(5),
        allowNull: false,
        defaultValue: '05-31',
        validate: {
          is: /^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/
        }
      },
      semesterSystem: {
        type: DataTypes.ENUM('semester', 'quarter', 'trimester', 'year'),
        allowNull: false,
        defaultValue: 'semester'
      },
      currentSemester: {
        type: DataTypes.STRING(50),
        allowNull: true
      },
      currentYear: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      
      // University Features
      hasGraduatePrograms: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      hasOnlinePrograms: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      hasInternationalPrograms: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      hasResearchPrograms: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      
      // Social Features
      allowStudentNetworking: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      allowAlumniNetworking: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      allowFacultyNetworking: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      allowCrossUniversityNetworking: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      
      // Verification
      isVerified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      verificationLevel: {
        type: DataTypes.ENUM('basic', 'verified', 'premium'),
        allowNull: false,
        defaultValue: 'basic'
      },
      verificationDate: {
        type: DataTypes.DATE,
        allowNull: true
      },
      verifiedBy: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      
      // Status
      status: {
        type: DataTypes.ENUM('active', 'inactive', 'pending', 'suspended'),
        allowNull: false,
        defaultValue: 'pending'
      },
      isPublic: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      
      // Metadata
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      deletedAt: {
        type: DataTypes.DATE,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: 'UniversityProfile',
      tableName: 'university_profiles',
      timestamps: true,
      paranoid: true,
      indexes: [
        {
          unique: true,
          fields: ['domain']
        },
        {
          fields: ['country']
        },
        {
          fields: ['type']
        },
        {
          fields: ['status']
        },
        {
          fields: ['isVerified']
        },
        {
          fields: ['isPublic']
        },
        {
          fields: ['createdAt']
        }
      ],
      hooks: {
        beforeSave: async (university: UniversityProfile) => {
          // Update academic calendar before saving
          university.updateAcademicCalendar();
        }
      }
    }
  );
  
  return UniversityProfile;
};

// Associations
export const associateUniversityProfile = (models: any): void => {
  UniversityProfile.hasMany(models.UserProfile, {
    foreignKey: 'universityId',
    as: 'students'
  });
  
  UniversityProfile.hasMany(models.UniversityDepartment, {
    foreignKey: 'universityId',
    as: 'departments'
  });
  
  UniversityProfile.hasMany(models.UniversityProgram, {
    foreignKey: 'universityId',
    as: 'programs'
  });
};
