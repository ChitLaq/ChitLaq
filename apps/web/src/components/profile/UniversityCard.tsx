import React, { useState, useCallback, useEffect } from 'react';
import { useProfile } from '../../hooks/use-profile';
import './UniversityCard.css';

export interface University {
  id: string;
  name: string;
  domain: string;
  country: string;
  state?: string;
  city?: string;
  type: 'public' | 'private' | 'community' | 'research';
  logo?: string;
  website?: string;
  description?: string;
  established?: number;
  studentCount?: number;
  ranking?: number;
  programs?: string[];
  colors?: {
    primary: string;
    secondary: string;
  };
}

export interface UniversityCardProps {
  university: University;
  showDetails?: boolean;
  showStats?: boolean;
  showPrograms?: boolean;
  isEditable?: boolean;
  onEdit?: (university: University) => void;
  className?: string;
}

export interface UniversityStats {
  totalStudents: number;
  activeUsers: number;
  recentGraduates: number;
  popularPrograms: string[];
}

const UniversityCard: React.FC<UniversityCardProps> = ({
  university,
  showDetails = true,
  showStats = true,
  showPrograms = false,
  isEditable = false,
  onEdit,
  className = ''
}) => {
  const [stats, setStats] = useState<UniversityStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);

  const { getUniversityStats } = useProfile('');

  // Load university stats
  useEffect(() => {
    if (showStats) {
      loadUniversityStats();
    }
  }, [showStats, university.id]);

  const loadUniversityStats = useCallback(async () => {
    try {
      setIsLoading(true);
      const universityStats = await getUniversityStats(university.id);
      setStats(universityStats);
    } catch (error) {
      console.error('Failed to load university stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, [university.id, getUniversityStats]);

  // Handle edit
  const handleEdit = useCallback(() => {
    onEdit?.(university);
  }, [university, onEdit]);

  // Handle expand/collapse
  const handleToggleExpand = useCallback(() => {
    setIsExpanded(!isExpanded);
  }, [isExpanded]);

  // Handle description toggle
  const handleToggleDescription = useCallback(() => {
    setShowFullDescription(!showFullDescription);
  }, [showFullDescription]);

  // Get university type display
  const getUniversityTypeDisplay = useCallback((): string => {
    const typeMap = {
      public: 'Public University',
      private: 'Private University',
      community: 'Community College',
      research: 'Research University'
    };
    return typeMap[university.type] || university.type;
  }, [university.type]);

  // Get university location
  const getUniversityLocation = useCallback((): string => {
    const parts = [university.city, university.state, university.country].filter(Boolean);
    return parts.join(', ');
  }, [university.city, university.state, university.country]);

  // Get truncated description
  const getTruncatedDescription = useCallback((): string => {
    if (!university.description) return '';
    const maxLength = 150;
    if (university.description.length <= maxLength) return university.description;
    return university.description.substring(0, maxLength) + '...';
  }, [university.description]);

  // Get ranking display
  const getRankingDisplay = useCallback((): string => {
    if (!university.ranking) return '';
    if (university.ranking <= 10) return `#${university.ranking} globally`;
    if (university.ranking <= 50) return `#${university.ranking} globally`;
    if (university.ranking <= 100) return `#${university.ranking} globally`;
    return `Ranked #${university.ranking}`;
  }, [university.ranking]);

  // Get student count display
  const getStudentCountDisplay = useCallback((): string => {
    if (!university.studentCount) return '';
    if (university.studentCount >= 1000000) {
      return `${(university.studentCount / 1000000).toFixed(1)}M students`;
    } else if (university.studentCount >= 1000) {
      return `${(university.studentCount / 1000).toFixed(1)}K students`;
    }
    return `${university.studentCount.toLocaleString()} students`;
  }, [university.studentCount]);

  // Get established year display
  const getEstablishedDisplay = useCallback((): string => {
    if (!university.established) return '';
    const currentYear = new Date().getFullYear();
    const years = currentYear - university.established;
    return `Est. ${university.established} (${years} years)`;
  }, [university.established]);

  // Get university colors
  const getUniversityColors = useCallback(() => {
    return university.colors || {
      primary: '#3B82F6',
      secondary: '#1E40AF'
    };
  }, [university.colors]);

  return (
    <div className={`university-card ${className}`}>
      {/* Header */}
      <div className="university-card__header">
        <div className="university-card__logo-container">
          {university.logo ? (
            <img
              src={university.logo}
              alt={`${university.name} logo`}
              className="university-card__logo"
              loading="lazy"
            />
          ) : (
            <div 
              className="university-card__logo-placeholder"
              style={{ backgroundColor: getUniversityColors().primary }}
            >
              {university.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <div className="university-card__info">
          <h3 className="university-card__name">{university.name}</h3>
          <p className="university-card__type">{getUniversityTypeDisplay()}</p>
          {getUniversityLocation() && (
            <p className="university-card__location">{getUniversityLocation()}</p>
          )}
        </div>

        {isEditable && (
          <button
            className="university-card__edit-button"
            onClick={handleEdit}
            title="Edit university information"
            aria-label="Edit university information"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        )}
      </div>

      {/* Quick Stats */}
      <div className="university-card__quick-stats">
        {university.ranking && (
          <div className="university-card__stat">
            <div className="university-card__stat-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
              </svg>
            </div>
            <div className="university-card__stat-content">
              <div className="university-card__stat-label">Ranking</div>
              <div className="university-card__stat-value">{getRankingDisplay()}</div>
            </div>
          </div>
        )}

        {university.studentCount && (
          <div className="university-card__stat">
            <div className="university-card__stat-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div className="university-card__stat-content">
              <div className="university-card__stat-label">Students</div>
              <div className="university-card__stat-value">{getStudentCountDisplay()}</div>
            </div>
          </div>
        )}

        {university.established && (
          <div className="university-card__stat">
            <div className="university-card__stat-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <div className="university-card__stat-content">
              <div className="university-card__stat-label">Established</div>
              <div className="university-card__stat-value">{getEstablishedDisplay()}</div>
            </div>
          </div>
        )}
      </div>

      {/* Description */}
      {showDetails && university.description && (
        <div className="university-card__description">
          <p className="university-card__description-text">
            {showFullDescription ? university.description : getTruncatedDescription()}
          </p>
          {university.description.length > 150 && (
            <button
              className="university-card__description-toggle"
              onClick={handleToggleDescription}
            >
              {showFullDescription ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      )}

      {/* Programs */}
      {showPrograms && university.programs && university.programs.length > 0 && (
        <div className="university-card__programs">
          <h4 className="university-card__programs-title">Popular Programs</h4>
          <div className="university-card__programs-list">
            {university.programs.slice(0, 3).map((program, index) => (
              <span key={index} className="university-card__program-tag">
                {program}
              </span>
            ))}
            {university.programs.length > 3 && (
              <span className="university-card__program-more">
                +{university.programs.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Community Stats */}
      {showStats && (
        <div className="university-card__community-stats">
          <div className="university-card__community-header">
            <h4 className="university-card__community-title">ChitLaq Community</h4>
            {isLoading && (
              <div className="university-card__loading">
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="4" fill="none" />
                </svg>
              </div>
            )}
          </div>

          {stats && (
            <div className="university-card__community-metrics">
              <div className="university-card__community-metric">
                <div className="university-card__community-metric-value">
                  {stats.activeUsers.toLocaleString()}
                </div>
                <div className="university-card__community-metric-label">Active Users</div>
              </div>
              
              <div className="university-card__community-metric">
                <div className="university-card__community-metric-value">
                  {stats.recentGraduates.toLocaleString()}
                </div>
                <div className="university-card__community-metric-label">Recent Graduates</div>
              </div>
            </div>
          )}

          {stats && stats.popularPrograms.length > 0 && (
            <div className="university-card__community-programs">
              <div className="university-card__community-programs-title">Popular Programs</div>
              <div className="university-card__community-programs-list">
                {stats.popularPrograms.slice(0, 3).map((program, index) => (
                  <span key={index} className="university-card__community-program-tag">
                    {program}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="university-card__actions">
        {university.website && (
          <a
            href={university.website}
            target="_blank"
            rel="noopener noreferrer"
            className="university-card__action university-card__action--primary"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15,3 21,3 21,9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            Visit Website
          </a>
        )}

        <button
          className="university-card__action university-card__action--secondary"
          onClick={handleToggleExpand}
        >
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
            className={`university-card__expand-icon ${isExpanded ? 'university-card__expand-icon--expanded' : ''}`}
          >
            <polyline points="6,9 12,15 18,9" />
          </svg>
          {isExpanded ? 'Show Less' : 'Show More'}
        </button>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="university-card__expanded">
          {/* Additional Details */}
          <div className="university-card__additional-details">
            <div className="university-card__detail">
              <div className="university-card__detail-label">Domain</div>
              <div className="university-card__detail-value">{university.domain}</div>
            </div>
            
            <div className="university-card__detail">
              <div className="university-card__detail-label">Type</div>
              <div className="university-card__detail-value">{getUniversityTypeDisplay()}</div>
            </div>
            
            {university.established && (
              <div className="university-card__detail">
                <div className="university-card__detail-label">Established</div>
                <div className="university-card__detail-value">{university.established}</div>
              </div>
            )}
          </div>

          {/* All Programs */}
          {university.programs && university.programs.length > 0 && (
            <div className="university-card__all-programs">
              <h4 className="university-card__all-programs-title">All Programs</h4>
              <div className="university-card__all-programs-list">
                {university.programs.map((program, index) => (
                  <span key={index} className="university-card__all-program-tag">
                    {program}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UniversityCard;
