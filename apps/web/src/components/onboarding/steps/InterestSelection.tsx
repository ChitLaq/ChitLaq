import React, { useState, useEffect, useCallback } from 'react';
import { trackOnboardingEvent } from '../../../utils/onboarding-analytics';
import { getLogger } from '../../../utils/logger';

const logger = getLogger('InterestSelection');

interface InterestSelectionProps {
  user: any;
  onboardingData: any;
  onComplete: (data: any) => void;
  onSkip?: () => void;
  onBack?: () => void;
  isLoading: boolean;
  error?: string;
}

interface InterestCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  interests: Interest[];
  color: string;
}

interface Interest {
  id: string;
  name: string;
  description: string;
  popularity: number; // 0-100
  isTrending: boolean;
}

const INTEREST_CATEGORIES: InterestCategory[] = [
  {
    id: 'academics',
    name: 'Academics',
    description: 'Academic subjects and research',
    icon: '🎓',
    color: '#3B82F6',
    interests: [
      { id: 'computer-science', name: 'Computer Science', description: 'Programming, algorithms, software engineering', popularity: 95, isTrending: true },
      { id: 'mathematics', name: 'Mathematics', description: 'Calculus, statistics, discrete math', popularity: 80, isTrending: false },
      { id: 'physics', name: 'Physics', description: 'Quantum mechanics, thermodynamics, astrophysics', popularity: 70, isTrending: false },
      { id: 'biology', name: 'Biology', description: 'Genetics, molecular biology, ecology', popularity: 75, isTrending: false },
      { id: 'chemistry', name: 'Chemistry', description: 'Organic, inorganic, physical chemistry', popularity: 65, isTrending: false },
      { id: 'engineering', name: 'Engineering', description: 'Mechanical, electrical, civil engineering', popularity: 85, isTrending: true },
      { id: 'medicine', name: 'Medicine', description: 'Pre-med, medical research, healthcare', popularity: 90, isTrending: true },
      { id: 'business', name: 'Business', description: 'Finance, marketing, entrepreneurship', popularity: 80, isTrending: false },
      { id: 'psychology', name: 'Psychology', description: 'Cognitive, social, clinical psychology', popularity: 70, isTrending: false },
      { id: 'economics', name: 'Economics', description: 'Microeconomics, macroeconomics, econometrics', popularity: 60, isTrending: false },
    ],
  },
  {
    id: 'technology',
    name: 'Technology',
    description: 'Tech trends and innovations',
    icon: '💻',
    color: '#10B981',
    interests: [
      { id: 'artificial-intelligence', name: 'Artificial Intelligence', description: 'Machine learning, neural networks, AI ethics', popularity: 95, isTrending: true },
      { id: 'web-development', name: 'Web Development', description: 'Frontend, backend, full-stack development', popularity: 90, isTrending: true },
      { id: 'mobile-development', name: 'Mobile Development', description: 'iOS, Android, React Native', popularity: 80, isTrending: false },
      { id: 'data-science', name: 'Data Science', description: 'Analytics, visualization, big data', popularity: 85, isTrending: true },
      { id: 'cybersecurity', name: 'Cybersecurity', description: 'Information security, ethical hacking', popularity: 75, isTrending: true },
      { id: 'blockchain', name: 'Blockchain', description: 'Cryptocurrency, smart contracts, DeFi', popularity: 70, isTrending: false },
      { id: 'cloud-computing', name: 'Cloud Computing', description: 'AWS, Azure, Google Cloud', popularity: 80, isTrending: false },
      { id: 'devops', name: 'DevOps', description: 'CI/CD, containerization, automation', popularity: 70, isTrending: false },
      { id: 'game-development', name: 'Game Development', description: 'Unity, Unreal Engine, game design', popularity: 60, isTrending: false },
      { id: 'robotics', name: 'Robotics', description: 'Automation, robotics engineering', popularity: 65, isTrending: false },
    ],
  },
  {
    id: 'lifestyle',
    name: 'Lifestyle',
    description: 'Personal interests and hobbies',
    icon: '🌟',
    color: '#F59E0B',
    interests: [
      { id: 'fitness', name: 'Fitness', description: 'Gym, running, yoga, sports', popularity: 85, isTrending: true },
      { id: 'cooking', name: 'Cooking', description: 'Recipes, food culture, culinary arts', popularity: 70, isTrending: false },
      { id: 'travel', name: 'Travel', description: 'Adventure, culture, photography', popularity: 80, isTrending: false },
      { id: 'music', name: 'Music', description: 'Playing instruments, music production', popularity: 75, isTrending: false },
      { id: 'art', name: 'Art', description: 'Painting, drawing, digital art', popularity: 60, isTrending: false },
      { id: 'photography', name: 'Photography', description: 'Digital, film, portrait photography', popularity: 65, isTrending: false },
      { id: 'reading', name: 'Reading', description: 'Books, literature, academic papers', popularity: 70, isTrending: false },
      { id: 'gaming', name: 'Gaming', description: 'Video games, esports, game design', popularity: 80, isTrending: true },
      { id: 'fashion', name: 'Fashion', description: 'Style, design, sustainability', popularity: 55, isTrending: false },
      { id: 'gardening', name: 'Gardening', description: 'Plants, sustainability, urban farming', popularity: 50, isTrending: false },
    ],
  },
  {
    id: 'social',
    name: 'Social',
    description: 'Community and social causes',
    icon: '🤝',
    color: '#EF4444',
    interests: [
      { id: 'volunteering', name: 'Volunteering', description: 'Community service, social impact', popularity: 70, isTrending: false },
      { id: 'environment', name: 'Environment', description: 'Climate change, sustainability, conservation', popularity: 80, isTrending: true },
      { id: 'social-justice', name: 'Social Justice', description: 'Equality, human rights, activism', popularity: 75, isTrending: true },
      { id: 'education', name: 'Education', description: 'Teaching, tutoring, educational reform', popularity: 70, isTrending: false },
      { id: 'healthcare', name: 'Healthcare', description: 'Public health, medical advocacy', popularity: 65, isTrending: false },
      { id: 'mental-health', name: 'Mental Health', description: 'Wellness, therapy, support groups', popularity: 80, isTrending: true },
      { id: 'diversity', name: 'Diversity & Inclusion', description: 'Cultural awareness, equity', popularity: 70, isTrending: false },
      { id: 'entrepreneurship', name: 'Entrepreneurship', description: 'Startups, innovation, business', popularity: 75, isTrending: false },
      { id: 'leadership', name: 'Leadership', description: 'Student government, team management', popularity: 60, isTrending: false },
      { id: 'networking', name: 'Networking', description: 'Professional connections, mentorship', popularity: 70, isTrending: false },
    ],
  },
];

const InterestSelection: React.FC<InterestSelectionProps> = ({
  user,
  onboardingData,
  onComplete,
  onSkip,
  onBack,
  isLoading,
  error,
}) => {
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCategories, setFilteredCategories] = useState<InterestCategory[]>(INTEREST_CATEGORIES);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recommendations, setRecommendations] = useState<Interest[]>([]);

  // Filter categories based on search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredCategories(INTEREST_CATEGORIES);
      return;
    }

    const filtered = INTEREST_CATEGORIES.map(category => ({
      ...category,
      interests: category.interests.filter(interest =>
        interest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        interest.description.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    })).filter(category => category.interests.length > 0);

    setFilteredCategories(filtered);
  }, [searchQuery]);

  // Generate recommendations based on user's university and profile
  useEffect(() => {
    const generateRecommendations = () => {
      const allInterests = INTEREST_CATEGORIES.flatMap(cat => cat.interests);
      
      // Sort by popularity and trending status
      const sorted = allInterests.sort((a, b) => {
        if (a.isTrending && !b.isTrending) return -1;
        if (!a.isTrending && b.isTrending) return 1;
        return b.popularity - a.popularity;
      });

      // Get top 6 recommendations
      setRecommendations(sorted.slice(0, 6));
    };

    generateRecommendations();
  }, []);

  // Handle interest selection
  const handleInterestToggle = useCallback((interestId: string) => {
    setSelectedInterests(prev => {
      if (prev.includes(interestId)) {
        return prev.filter(id => id !== interestId);
      } else if (prev.length < 10) { // Limit to 10 interests
        return [...prev, interestId];
      }
      return prev;
    });
  }, []);

  // Handle category selection
  const handleCategoryToggle = useCallback((categoryId: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(id => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  }, []);

  // Handle recommendation selection
  const handleRecommendationSelect = useCallback((interestId: string) => {
    handleInterestToggle(interestId);
  }, [handleInterestToggle]);

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    if (selectedInterests.length === 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Track interest selection
      trackOnboardingEvent('interests_selected', {
        userId: user.id,
        interestCount: selectedInterests.length,
        selectedInterests,
        selectedCategories,
        university: user.universityName,
        userType: user.userType,
      });

      logger.info(`Interests selected for user ${user.id}: ${selectedInterests.length} interests`);

      onComplete({
        selectedInterests,
        selectedCategories,
        completed: true,
      });
    } catch (error) {
      logger.error('Error completing interest selection:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedInterests, selectedCategories, user, onComplete]);

  // Get selected interest objects
  const getSelectedInterestObjects = useCallback(() => {
    const allInterests = INTEREST_CATEGORIES.flatMap(cat => cat.interests);
    return allInterests.filter(interest => selectedInterests.includes(interest.id));
  }, [selectedInterests]);

  const selectedInterestObjects = getSelectedInterestObjects();

  return (
    <div className="interest-selection-step">
      <div className="interest-selection-container">
        {/* Header */}
        <div className="interest-header">
          <h3>What interests you?</h3>
          <p>Select topics you're passionate about to personalize your feed</p>
          <div className="selection-counter">
            {selectedInterests.length}/10 selected
          </div>
        </div>

        {/* Search */}
        <div className="interest-search">
          <div className="search-input-container">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
              <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2"/>
            </svg>
            <input
              type="text"
              placeholder="Search interests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        {/* Recommendations */}
        {selectedInterests.length === 0 && (
          <div className="recommendations-section">
            <h4>Popular at {user.universityName}</h4>
            <div className="recommendation-tags">
              {recommendations.map(interest => (
                <button
                  key={interest.id}
                  className={`recommendation-tag ${interest.isTrending ? 'trending' : ''}`}
                  onClick={() => handleRecommendationSelect(interest.id)}
                >
                  {interest.name}
                  {interest.isTrending && <span className="trending-badge">🔥</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Selected Interests */}
        {selectedInterests.length > 0 && (
          <div className="selected-interests-section">
            <h4>Selected Interests</h4>
            <div className="selected-interests-list">
              {selectedInterestObjects.map(interest => (
                <div key={interest.id} className="selected-interest-item">
                  <span className="interest-name">{interest.name}</span>
                  <button
                    className="remove-interest"
                    onClick={() => handleInterestToggle(interest.id)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2"/>
                      <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Interest Categories */}
        <div className="interest-categories">
          {filteredCategories.map(category => (
            <div key={category.id} className="interest-category">
              <div className="category-header">
                <div className="category-info">
                  <span className="category-icon">{category.icon}</span>
                  <div className="category-details">
                    <h4>{category.name}</h4>
                    <p>{category.description}</p>
                  </div>
                </div>
                <button
                  className={`category-toggle ${selectedCategories.includes(category.id) ? 'selected' : ''}`}
                  onClick={() => handleCategoryToggle(category.id)}
                >
                  {selectedCategories.includes(category.id) ? 'Selected' : 'Select All'}
                </button>
              </div>
              
              <div className="category-interests">
                {category.interests.map(interest => (
                  <button
                    key={interest.id}
                    className={`interest-tag ${selectedInterests.includes(interest.id) ? 'selected' : ''} ${interest.isTrending ? 'trending' : ''}`}
                    onClick={() => handleInterestToggle(interest.id)}
                    disabled={!selectedInterests.includes(interest.id) && selectedInterests.length >= 10}
                  >
                    <div className="interest-content">
                      <span className="interest-name">{interest.name}</span>
                      <span className="interest-description">{interest.description}</span>
                    </div>
                    <div className="interest-meta">
                      {interest.isTrending && <span className="trending-badge">🔥</span>}
                      <span className="popularity-badge">{interest.popularity}%</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* No Results */}
        {filteredCategories.length === 0 && searchQuery && (
          <div className="no-results">
            <p>No interests found for "{searchQuery}"</p>
            <button
              className="btn btn-link"
              onClick={() => setSearchQuery('')}
            >
              Clear search
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="interest-actions">
          <button
            className="btn btn-primary btn-large"
            onClick={handleSubmit}
            disabled={isSubmitting || isLoading || selectedInterests.length === 0}
          >
            {isSubmitting ? (
              <>
                <div className="loading-spinner"></div>
                Saving Interests...
              </>
            ) : (
              `Continue with ${selectedInterests.length} interest${selectedInterests.length !== 1 ? 's' : ''}`
            )}
          </button>
          
          {onSkip && (
            <button
              className="btn btn-link"
              onClick={onSkip}
              disabled={isSubmitting || isLoading}
            >
              Skip for now
            </button>
          )}
        </div>

        {/* Tips */}
        <div className="interest-tips">
          <h4>💡 Tips</h4>
          <ul>
            <li>Select 3-5 interests for the best personalized experience</li>
            <li>You can always add or remove interests later</li>
            <li>Trending topics are popular at your university</li>
            <li>Your interests help us show you relevant content and connect you with like-minded people</li>
          </ul>
        </div>

        {/* University Context */}
        <div className="university-context">
          <div className="university-badge">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor"/>
            </svg>
            <span>Personalizing your {user.universityName} experience</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterestSelection;
