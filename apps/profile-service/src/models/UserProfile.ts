import { DataTypes, Model, Optional, Sequelize } from 'sequelize';
import { UniversityProfile } from './UniversityProfile';

// User Profile Interface
export interface IUserProfile {
  id: string;
  userId: string;
  
  // Basic Information
  username: string;
  displayName: string;
  bio?: string;
  profilePicture?: string;
  coverPhoto?: string;
  
  // University Information
  universityId: string;
  universityEmail: string;
  academicYear?: number;
  graduationYear?: number;
  major?: string;
  minor?: string;
  department?: string;
  faculty?: string;
  studentId?: string;
  
  // Contact Information (with privacy controls)
  email?: string;
  phone?: string;
  website?: string;
  linkedin?: string;
  github?: string;
  twitter?: string;
  
  // Location Information
  campusLocation?: string;
  city?: string;
  country?: string;
  timezone?: string;
  
  // Social Preferences
  isDiscoverable: boolean;
  showEmail: boolean;
  showPhone: boolean;
  showLocation: boolean;
  showAcademicInfo: boolean;
  allowDirectMessages: boolean;
  allowFriendRequests: boolean;
  
  // Verification Status
  emailVerified: boolean;
  universityVerified: boolean;
  profileVerified: boolean;
  identityVerified: boolean;
  
  // Activity Statistics
  postsCount: number;
  followersCount: number;
  followingCount: number;
  likesCount: number;
  commentsCount: number;
  
  // Profile Completion
  completionScore: number;
  completionPercentage: number;
  lastUpdated: Date;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  
  // Relationships
  university?: UniversityProfile;
}

// Optional fields for creation
export interface IUserProfileCreation extends Optional<IUserProfile, 
  'id' | 'bio' | 'profilePicture' | 'coverPhoto' | 'academicYear' | 
  'graduationYear' | 'major' | 'minor' | 'department' | 'faculty' | 
  'studentId' | 'email' | 'phone' | 'website' | 'linkedin' | 'github' | 
  'twitter' | 'campusLocation' | 'city' | 'country' | 'timezone' | 
  'postsCount' | 'followersCount' | 'followingCount' | 'likesCount' | 
  'commentsCount' | 'completionScore' | 'completionPercentage' | 
  'emailVerified' | 'universityVerified' | 'profileVerified' | 
  'identityVerified' | 'createdAt' | 'updatedAt' | 'deletedAt'
> {}

// User Profile Model
export class UserProfile extends Model<IUserProfile, IUserProfileCreation> implements IUserProfile {
  public id!: string;
  public userId!: string;
  
  // Basic Information
  public username!: string;
  public displayName!: string;
  public bio?: string;
  public profilePicture?: string;
  public coverPhoto?: string;
  
  // University Information
  public universityId!: string;
  public universityEmail!: string;
  public academicYear?: number;
  public graduationYear?: number;
  public major?: string;
  public minor?: string;
  public department?: string;
  public faculty?: string;
  public studentId?: string;
  
  // Contact Information
  public email?: string;
  public phone?: string;
  public website?: string;
  public linkedin?: string;
  public github?: string;
  public twitter?: string;
  
  // Location Information
  public campusLocation?: string;
  public city?: string;
  public country?: string;
  public timezone?: string;
  
  // Social Preferences
  public isDiscoverable!: boolean;
  public showEmail!: boolean;
  public showPhone!: boolean;
  public showLocation!: boolean;
  public showAcademicInfo!: boolean;
  public allowDirectMessages!: boolean;
  public allowFriendRequests!: boolean;
  
  // Verification Status
  public emailVerified!: boolean;
  public universityVerified!: boolean;
  public profileVerified!: boolean;
  public identityVerified!: boolean;
  
  // Activity Statistics
  public postsCount!: number;
  public followersCount!: number;
  public followingCount!: number;
  public likesCount!: number;
  public commentsCount!: number;
  
  // Profile Completion
  public completionScore!: number;
  public completionPercentage!: number;
  public lastUpdated!: Date;
  
  // Metadata
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public deletedAt?: Date;
  
  // Relationships
  public university?: UniversityProfile;
  
  // Instance methods
  public async updateCompletionScore(): Promise<void> {
    const completionFields = [
      'username', 'displayName', 'bio', 'profilePicture',
      'major', 'academicYear', 'city', 'country',
      'website', 'linkedin', 'github'
    ];
    
    let completedFields = 0;
    for (const field of completionFields) {
      if (this.getDataValue(field)) {
        completedFields++;
      }
    }
    
    this.completionScore = completedFields;
    this.completionPercentage = Math.round((completedFields / completionFields.length) * 100);
    this.lastUpdated = new Date();
    
    await this.save();
  }
  
  public isProfileComplete(): boolean {
    return this.completionPercentage >= 80;
  }
  
  public getPublicProfile(): Partial<IUserProfile> {
    const publicFields: (keyof IUserProfile)[] = [
      'id', 'username', 'displayName', 'bio', 'profilePicture', 'coverPhoto',
      'universityId', 'academicYear', 'graduationYear', 'major', 'minor',
      'campusLocation', 'city', 'country', 'postsCount', 'followersCount',
      'followingCount', 'emailVerified', 'universityVerified', 'profileVerified'
    ];
    
    const publicProfile: Partial<IUserProfile> = {};
    
    for (const field of publicFields) {
      if (this.getDataValue(field) !== undefined) {
        publicProfile[field] = this.getDataValue(field);
      }
    }
    
    // Apply privacy controls
    if (!this.showEmail && this.email) {
      delete publicProfile.email;
    }
    
    if (!this.showPhone && this.phone) {
      delete publicProfile.phone;
    }
    
    if (!this.showLocation) {
      delete publicProfile.campusLocation;
      delete publicProfile.city;
      delete publicProfile.country;
    }
    
    if (!this.showAcademicInfo) {
      delete publicProfile.major;
      delete publicProfile.minor;
      delete publicProfile.academicYear;
      delete publicProfile.graduationYear;
    }
    
    return publicProfile;
  }
  
  public getContactInfo(): Partial<IUserProfile> {
    const contactInfo: Partial<IUserProfile> = {};
    
    if (this.showEmail && this.email) {
      contactInfo.email = this.email;
    }
    
    if (this.showPhone && this.phone) {
      contactInfo.phone = this.phone;
    }
    
    if (this.website) {
      contactInfo.website = this.website;
    }
    
    if (this.linkedin) {
      contactInfo.linkedin = this.linkedin;
    }
    
    if (this.github) {
      contactInfo.github = this.github;
    }
    
    if (this.twitter) {
      contactInfo.twitter = this.twitter;
    }
    
    return contactInfo;
  }
}

// Model initialization
export const initUserProfile = (sequelize: Sequelize): typeof UserProfile => {
  UserProfile.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      
      // Basic Information
      username: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        validate: {
          len: [3, 50],
          is: /^[a-zA-Z0-9_]+$/
        }
      },
      displayName: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
          len: [1, 100]
        }
      },
      bio: {
        type: DataTypes.TEXT,
        allowNull: true,
        validate: {
          len: [0, 500]
        }
      },
      profilePicture: {
        type: DataTypes.STRING(500),
        allowNull: true,
        validate: {
          isUrl: true
        }
      },
      coverPhoto: {
        type: DataTypes.STRING(500),
        allowNull: true,
        validate: {
          isUrl: true
        }
      },
      
      // University Information
      universityId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'universities',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      universityEmail: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
          isEmail: true
        }
      },
      academicYear: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: 1,
          max: 10
        }
      },
      graduationYear: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: 1950,
          max: 2050
        }
      },
      major: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      minor: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      department: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      faculty: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      studentId: {
        type: DataTypes.STRING(50),
        allowNull: true
      },
      
      // Contact Information
      email: {
        type: DataTypes.STRING(255),
        allowNull: true,
        validate: {
          isEmail: true
        }
      },
      phone: {
        type: DataTypes.STRING(20),
        allowNull: true,
        validate: {
          is: /^[\+]?[1-9][\d]{0,15}$/
        }
      },
      website: {
        type: DataTypes.STRING(500),
        allowNull: true,
        validate: {
          isUrl: true
        }
      },
      linkedin: {
        type: DataTypes.STRING(100),
        allowNull: true,
        validate: {
          is: /^[a-zA-Z0-9\-_]+$/
        }
      },
      github: {
        type: DataTypes.STRING(100),
        allowNull: true,
        validate: {
          is: /^[a-zA-Z0-9\-_]+$/
        }
      },
      twitter: {
        type: DataTypes.STRING(100),
        allowNull: true,
        validate: {
          is: /^[a-zA-Z0-9_]+$/
        }
      },
      
      // Location Information
      campusLocation: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      city: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      country: {
        type: DataTypes.STRING(2),
        allowNull: true,
        validate: {
          len: [2, 2]
        }
      },
      timezone: {
        type: DataTypes.STRING(50),
        allowNull: true
      },
      
      // Social Preferences
      isDiscoverable: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      showEmail: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      showPhone: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      showLocation: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      showAcademicInfo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      allowDirectMessages: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      allowFriendRequests: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      
      // Verification Status
      emailVerified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      universityVerified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      profileVerified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      identityVerified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      
      // Activity Statistics
      postsCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0
        }
      },
      followersCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0
        }
      },
      followingCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0
        }
      },
      likesCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0
        }
      },
      commentsCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0
        }
      },
      
      // Profile Completion
      completionScore: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0,
          max: 100
        }
      },
      completionPercentage: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0,
          max: 100
        }
      },
      lastUpdated: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
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
      modelName: 'UserProfile',
      tableName: 'user_profiles',
      timestamps: true,
      paranoid: true,
      indexes: [
        {
          unique: true,
          fields: ['userId']
        },
        {
          unique: true,
          fields: ['username']
        },
        {
          fields: ['universityId']
        },
        {
          fields: ['isDiscoverable']
        },
        {
          fields: ['completionPercentage']
        },
        {
          fields: ['createdAt']
        },
        {
          fields: ['updatedAt']
        }
      ],
      hooks: {
        beforeSave: async (profile: UserProfile) => {
          // Update completion score before saving
          await profile.updateCompletionScore();
        }
      }
    }
  );
  
  return UserProfile;
};

// Associations
export const associateUserProfile = (models: any): void => {
  UserProfile.belongsTo(models.University, {
    foreignKey: 'universityId',
    as: 'university'
  });
  
  UserProfile.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'user'
  });
  
  UserProfile.hasMany(models.UserInterest, {
    foreignKey: 'profileId',
    as: 'interests'
  });
  
  UserProfile.hasMany(models.UserSkill, {
    foreignKey: 'profileId',
    as: 'skills'
  });
  
  UserProfile.hasMany(models.UserAchievement, {
    foreignKey: 'profileId',
    as: 'achievements'
  });
};
