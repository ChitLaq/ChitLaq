// Social Components Tests
// Author: ChitLaq Development Team
// Date: 2024-01-15

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { createClient } from '@supabase/supabase-js';
import PeopleDiscovery from '../src/components/social/PeopleDiscovery';
import UniversityNetwork from '../src/components/social/UniversityNetwork';
import FollowButton from '../src/components/social/FollowButton';
import SocialActivityFeed from '../src/components/social/SocialActivityFeed';

// Mock Supabase client
const mockSupabase = createClient('https://test.supabase.co', 'test-key');

// Mock user data
const mockUser = {
  id: 'user-1',
  email: 'test@university.edu',
  academic_year: '2024',
  university_id: 'university-1'
};

const mockProfiles = [
  {
    id: 'user-2',
    username: 'john_doe',
    biography: 'Computer Science student',
    profile_picture: '/avatar1.jpg',
    university_id: 'university-1',
    university_name: 'Test University'
  },
  {
    id: 'user-3',
    username: 'jane_smith',
    biography: 'Engineering student',
    profile_picture: '/avatar2.jpg',
    university_id: 'university-1',
    university_name: 'Test University'
  }
];

// Mock hooks
jest.mock('../src/hooks/use-auth', () => ({
  useAuth: () => ({
    user: mockUser
  })
}));

jest.mock('../src/hooks/use-social-actions', () => ({
  useSocialActions: () => ({
    followUser: jest.fn(),
    unfollowUser: jest.fn(),
    isFollowing: jest.fn(() => false)
  })
}));

describe('PeopleDiscovery Component', () => {
  beforeEach(() => {
    // Mock Supabase queries
    mockSupabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        neq: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: mockProfiles,
            error: null
          })
        })
      })
    });
  });

  test('renders people discovery component', async () => {
    render(<PeopleDiscovery supabase={mockSupabase} />);
    
    await waitFor(() => {
      expect(screen.getByText('Loading recommendations...')).toBeInTheDocument();
    });
  });

  test('displays recommended users', async () => {
    render(<PeopleDiscovery supabase={mockSupabase} />);
    
    await waitFor(() => {
      expect(screen.getByText('john_doe')).toBeInTheDocument();
      expect(screen.getByText('jane_smith')).toBeInTheDocument();
    });
  });

  test('handles follow button clicks', async () => {
    const { useSocialActions } = require('../src/hooks/use-social-actions');
    const mockFollowUser = jest.fn();
    const mockUnfollowUser = jest.fn();
    
    useSocialActions.mockReturnValue({
      followUser: mockFollowUser,
      unfollowUser: mockUnfollowUser,
      isFollowing: jest.fn(() => false)
    });

    render(<PeopleDiscovery supabase={mockSupabase} />);
    
    await waitFor(() => {
      const followButtons = screen.getAllByText('Follow');
      fireEvent.click(followButtons[0]);
      expect(mockFollowUser).toHaveBeenCalled();
    });
  });
});

describe('UniversityNetwork Component', () => {
  test('renders university network component', () => {
    render(
      <UniversityNetwork 
        universityId="university-1" 
        supabase={mockSupabase} 
      />
    );
    
    expect(screen.getByText('University Network')).toBeInTheDocument();
  });

  test('displays navigation tabs', () => {
    render(
      <UniversityNetwork 
        universityId="university-1" 
        supabase={mockSupabase} 
      />
    );
    
    expect(screen.getByText('Departments')).toBeInTheDocument();
    expect(screen.getByText('My Academic Year')).toBeInTheDocument();
    expect(screen.getByText('Campus Feed')).toBeInTheDocument();
  });
});

describe('FollowButton Component', () => {
  test('renders follow button', () => {
    render(
      <FollowButton
        userId="user-1"
        targetUserId="user-2"
        initialIsFollowing={false}
      />
    );
    
    expect(screen.getByText('Follow')).toBeInTheDocument();
  });

  test('renders following button when already following', () => {
    render(
      <FollowButton
        userId="user-1"
        targetUserId="user-2"
        initialIsFollowing={true}
      />
    );
    
    expect(screen.getByText('Following')).toBeInTheDocument();
  });

  test('handles follow toggle', async () => {
    const mockOnToggle = jest.fn();
    
    render(
      <FollowButton
        userId="user-1"
        targetUserId="user-2"
        initialIsFollowing={false}
        onToggle={mockOnToggle}
      />
    );
    
    const followButton = screen.getByText('Follow');
    fireEvent.click(followButton);
    
    expect(mockOnToggle).toHaveBeenCalledWith('user-2', false);
  });
});

describe('SocialActivityFeed Component', () => {
  beforeEach(() => {
    // Mock Supabase queries for activity feed
    mockSupabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [{ target_user_id: 'user-2' }],
            error: null
          })
        }),
        in: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: [
                {
                  id: 'post-1',
                  content: 'Hello world!',
                  created_at: '2024-01-15T10:00:00Z',
                  user_id: 'user-2',
                  user_profiles: { username: 'john_doe' }
                }
              ],
              error: null
            })
          })
        })
      })
    });
  });

  test('renders social activity feed', async () => {
    render(<SocialActivityFeed supabase={mockSupabase} />);
    
    await waitFor(() => {
      expect(screen.getByText('Social Activity Feed')).toBeInTheDocument();
    });
  });

  test('displays activity items', async () => {
    render(<SocialActivityFeed supabase={mockSupabase} />);
    
    await waitFor(() => {
      expect(screen.getByText('Hello world!')).toBeInTheDocument();
      expect(screen.getByText('john_doe')).toBeInTheDocument();
    });
  });
});

describe('Social Utils', () => {
  const { formatNumber, generateRecommendationReason } = require('../src/utils/social-utils');

  test('formats numbers correctly', () => {
    expect(formatNumber(1000)).toBe('1.0K');
    expect(formatNumber(1000000)).toBe('1.0M');
    expect(formatNumber(500)).toBe('500');
  });

  test('generates recommendation reasons', () => {
    expect(generateRecommendationReason('mutual', 5)).toBe('5 mutual friends');
    expect(generateRecommendationReason('university')).toBe('Same university');
    expect(generateRecommendationReason('department')).toBe('Same department');
  });
});
