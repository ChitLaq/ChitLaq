import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProfileHeader } from '../components/profile/ProfileHeader';
import { ProfileEditor } from '../components/profile/ProfileEditor';
import { AvatarUpload } from '../components/profile/AvatarUpload';
import { UniversityCard } from '../components/profile/UniversityCard';
import { PrivacySettings } from '../components/profile/PrivacySettings';
import { ProfileCompletion } from '../components/profile/ProfileCompletion';
import { useProfile } from '../hooks/use-profile';
import { ProfileUtils } from '../utils/profile-utils';

// Mock the useProfile hook
jest.mock('../hooks/use-profile');
const mockUseProfile = useProfile as jest.MockedFunction<typeof useProfile>;

// Mock the ProfileUtils
jest.mock('../utils/profile-utils');
const mockProfileUtils = ProfileUtils as jest.Mocked<typeof ProfileUtils>;

// Mock fetch
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock FileReader
global.FileReader = jest.fn().mockImplementation(() => ({
  readAsDataURL: jest.fn(),
  onload: null,
  result: 'data:image/jpeg;base64,test-image-data',
}));

// Mock URL
global.URL.createObjectURL = jest.fn(() => 'mock-url');
global.URL.revokeObjectURL = jest.fn();

describe('Profile Components', () => {
  const mockProfile = {
    id: '1',
    username: 'testuser',
    email: 'test@university.edu',
    bio: 'Test bio',
    avatar: 'https://example.com/avatar.jpg',
    university: 'MIT',
    academicYear: 'Junior',
    interests: ['Technology', 'Science'],
    location: 'Boston, MA',
    birthDate: '2000-01-01',
    phone: '+1234567890',
    website: 'https://testuser.com',
    socialLinks: {
      twitter: 'https://twitter.com/testuser',
      linkedin: 'https://linkedin.com/in/testuser',
      github: 'https://github.com/testuser'
    },
    privacy: {
      profileVisibility: 'public' as const,
      showEmail: false,
      showLocation: true,
      showBirthDate: false,
      showInterests: true,
      showUniversity: true,
      showAcademicYear: true,
      showPosts: 'public' as const,
      showFollowers: 'public' as const,
      showFollowing: 'public' as const,
      allowMessages: 'everyone' as const,
      allowFriendRequests: 'everyone' as const,
      allowTagging: true,
      allowMentions: true,
      showOnlineStatus: true,
      showLastSeen: true,
      allowSearchEngines: true,
      allowDataCollection: true,
      allowAnalytics: true,
      allowMarketing: false
    },
    stats: {
      posts: 10,
      followers: 100,
      following: 50,
      likes: 500,
      comments: 100
    },
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-12-01T00:00:00Z'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseProfile.mockReturnValue({
      profile: mockProfile,
      loading: false,
      error: null,
      updating: false,
      updateProfile: jest.fn(),
      saveProfile: jest.fn(),
      resetProfile: jest.fn(),
      validateProfile: jest.fn(),
      getProfileCompletion: jest.fn(() => 85),
      getProfileStats: jest.fn(() => mockProfile.stats),
      isDirty: false,
      hasUnsavedChanges: false
    });
  });

  describe('ProfileHeader', () => {
    it('renders profile header with user information', () => {
      render(<ProfileHeader profile={mockProfile} />);
      
      expect(screen.getByText('testuser')).toBeInTheDocument();
      expect(screen.getByText('Test bio')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText('50')).toBeInTheDocument();
    });

    it('displays avatar image', () => {
      render(<ProfileHeader profile={mockProfile} />);
      
      const avatar = screen.getByAltText('Profile');
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    });

    it('handles edit button click', () => {
      const onEdit = jest.fn();
      render(<ProfileHeader profile={mockProfile} onEdit={onEdit} />);
      
      const editButton = screen.getByText('Edit Profile');
      fireEvent.click(editButton);
      
      expect(onEdit).toHaveBeenCalled();
    });

    it('handles follow button click', () => {
      const onFollow = jest.fn();
      render(<ProfileHeader profile={mockProfile} onFollow={onFollow} />);
      
      const followButton = screen.getByText('Follow');
      fireEvent.click(followButton);
      
      expect(onFollow).toHaveBeenCalled();
    });

    it('shows loading state', () => {
      mockUseProfile.mockReturnValue({
        ...mockUseProfile(),
        loading: true
      });
      
      render(<ProfileHeader profile={mockProfile} />);
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('ProfileEditor', () => {
    it('renders profile editor form', () => {
      render(<ProfileEditor profile={mockProfile} onSave={jest.fn()} onCancel={jest.fn()} />);
      
      expect(screen.getByDisplayValue('testuser')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test bio')).toBeInTheDocument();
      expect(screen.getByDisplayValue('MIT')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Junior')).toBeInTheDocument();
    });

    it('handles form input changes', () => {
      const onSave = jest.fn();
      render(<ProfileEditor profile={mockProfile} onSave={onSave} onCancel={jest.fn()} />);
      
      const usernameInput = screen.getByDisplayValue('testuser');
      fireEvent.change(usernameInput, { target: { value: 'newusername' } });
      
      expect(usernameInput).toHaveValue('newusername');
    });

    it('validates form data on save', async () => {
      const onSave = jest.fn();
      mockProfileUtils.validateProfile.mockReturnValue({
        valid: true,
        errors: [],
        warnings: []
      });
      
      render(<ProfileEditor profile={mockProfile} onSave={onSave} onCancel={jest.fn()} />);
      
      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(mockProfileUtils.validateProfile).toHaveBeenCalled();
        expect(onSave).toHaveBeenCalled();
      });
    });

    it('shows validation errors', async () => {
      mockProfileUtils.validateProfile.mockReturnValue({
        valid: false,
        errors: ['Username is required'],
        warnings: []
      });
      
      render(<ProfileEditor profile={mockProfile} onSave={jest.fn()} onCancel={jest.fn()} />);
      
      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText('Username is required')).toBeInTheDocument();
      });
    });

    it('handles cancel button click', () => {
      const onCancel = jest.fn();
      render(<ProfileEditor profile={mockProfile} onSave={jest.fn()} onCancel={onCancel} />);
      
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
      
      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe('AvatarUpload', () => {
    it('renders avatar upload component', () => {
      render(<AvatarUpload avatar={mockProfile.avatar} onUpload={jest.fn()} onRemove={jest.fn()} />);
      
      expect(screen.getByAltText('Profile')).toBeInTheDocument();
      expect(screen.getByText('Upload Photo')).toBeInTheDocument();
      expect(screen.getByText('Remove Photo')).toBeInTheDocument();
    });

    it('handles file upload', async () => {
      const onUpload = jest.fn();
      render(<AvatarUpload avatar={mockProfile.avatar} onUpload={onUpload} onRemove={jest.fn()} />);
      
      const fileInput = screen.getByLabelText('Upload Photo');
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      
      fireEvent.change(fileInput, { target: { files: [file] } });
      
      await waitFor(() => {
        expect(onUpload).toHaveBeenCalled();
      });
    });

    it('handles remove button click', () => {
      const onRemove = jest.fn();
      render(<AvatarUpload avatar={mockProfile.avatar} onUpload={jest.fn()} onRemove={onRemove} />);
      
      const removeButton = screen.getByText('Remove Photo');
      fireEvent.click(removeButton);
      
      expect(onRemove).toHaveBeenCalled();
    });

    it('shows placeholder when no avatar', () => {
      render(<AvatarUpload avatar={undefined} onUpload={jest.fn()} onRemove={jest.fn()} />);
      
      expect(screen.getByText('Upload Photo')).toBeInTheDocument();
      expect(screen.queryByAltText('Profile')).not.toBeInTheDocument();
    });
  });

  describe('UniversityCard', () => {
    it('renders university card with information', () => {
      render(<UniversityCard university={mockProfile.university} onEdit={jest.fn()} />);
      
      expect(screen.getByText('MIT')).toBeInTheDocument();
      expect(screen.getByText('Edit University')).toBeInTheDocument();
    });

    it('handles edit button click', () => {
      const onEdit = jest.fn();
      render(<UniversityCard university={mockProfile.university} onEdit={onEdit} />);
      
      const editButton = screen.getByText('Edit University');
      fireEvent.click(editButton);
      
      expect(onEdit).toHaveBeenCalled();
    });

    it('shows placeholder when no university', () => {
      render(<UniversityCard university={undefined} onEdit={jest.fn()} />);
      
      expect(screen.getByText('Add University')).toBeInTheDocument();
    });
  });

  describe('PrivacySettings', () => {
    it('renders privacy settings with tabs', () => {
      render(<PrivacySettings privacy={mockProfile.privacy} onChange={jest.fn()} />);
      
      expect(screen.getByText('Profile')).toBeInTheDocument();
      expect(screen.getByText('Social')).toBeInTheDocument();
      expect(screen.getByText('Data')).toBeInTheDocument();
    });

    it('handles tab switching', () => {
      render(<PrivacySettings privacy={mockProfile.privacy} onChange={jest.fn()} />);
      
      const socialTab = screen.getByText('Social');
      fireEvent.click(socialTab);
      
      expect(screen.getByText('Social Activity')).toBeInTheDocument();
    });

    it('handles privacy setting changes', () => {
      const onChange = jest.fn();
      render(<PrivacySettings privacy={mockProfile.privacy} onChange={onChange} />);
      
      const showEmailToggle = screen.getByLabelText('Show Email');
      fireEvent.click(showEmailToggle);
      
      expect(onChange).toHaveBeenCalledWith('showEmail', true);
    });

    it('shows privacy score', () => {
      render(<PrivacySettings privacy={mockProfile.privacy} onChange={jest.fn()} />);
      
      expect(screen.getByText(/\d+%/)).toBeInTheDocument();
    });

    it('handles advanced settings toggle', () => {
      render(<PrivacySettings privacy={mockProfile.privacy} onChange={jest.fn()} />);
      
      const dataTab = screen.getByText('Data');
      fireEvent.click(dataTab);
      
      const advancedToggle = screen.getByText('Advanced Settings');
      fireEvent.click(advancedToggle);
      
      expect(screen.getByText('Export Data')).toBeInTheDocument();
    });
  });

  describe('ProfileCompletion', () => {
    it('renders profile completion component', () => {
      render(<ProfileCompletion profile={mockProfile} onComplete={jest.fn()} />);
      
      expect(screen.getByText('Complete Your Profile')).toBeInTheDocument();
      expect(screen.getByText(/\d+% Complete/)).toBeInTheDocument();
    });

    it('shows completion steps', () => {
      render(<ProfileCompletion profile={mockProfile} onComplete={jest.fn()} />);
      
      expect(screen.getByText('Username')).toBeInTheDocument();
      expect(screen.getByText('Bio')).toBeInTheDocument();
      expect(screen.getByText('Profile Picture')).toBeInTheDocument();
    });

    it('handles step completion', () => {
      const onComplete = jest.fn();
      render(<ProfileCompletion profile={mockProfile} onComplete={onComplete} />);
      
      const usernameStep = screen.getByText('Username');
      fireEvent.click(usernameStep);
      
      const usernameInput = screen.getByDisplayValue('testuser');
      fireEvent.change(usernameInput, { target: { value: 'newusername' } });
      
      expect(onComplete).toHaveBeenCalledWith('username', 'newusername');
    });

    it('shows completed steps', () => {
      render(<ProfileCompletion profile={mockProfile} onComplete={jest.fn()} />);
      
      // Check for completed step indicators
      const completedSteps = screen.getAllByText('✓');
      expect(completedSteps.length).toBeGreaterThan(0);
    });

    it('handles show all steps toggle', () => {
      render(<ProfileCompletion profile={mockProfile} onComplete={jest.fn()} />);
      
      const showAllButton = screen.getByText('Show All Steps');
      fireEvent.click(showAllButton);
      
      expect(screen.getByText('Hide All Steps')).toBeInTheDocument();
    });
  });

  describe('ProfileUtils', () => {
    it('validates profile data correctly', () => {
      const result = ProfileUtils.validateProfile({
        username: 'testuser',
        bio: 'Test bio',
        email: 'test@university.edu'
      });
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('calculates profile completion', () => {
      const completion = ProfileUtils.calculateProfileCompletion(mockProfile);
      
      expect(completion.percentage).toBeGreaterThan(0);
      expect(completion.completedFields).toContain('username');
      expect(completion.missingFields).toHaveLength(0);
    });

    it('generates profile recommendations', () => {
      const recommendations = ProfileUtils.generateRecommendations(mockProfile);
      
      expect(recommendations).toBeInstanceOf(Array);
      expect(recommendations.length).toBeGreaterThan(0);
    });

    it('formats profile data for display', () => {
      const formatted = ProfileUtils.formatProfileData(mockProfile);
      
      expect(formatted.formattedStats).toBeDefined();
      expect(formatted.formattedDates).toBeDefined();
      expect(formatted.completion).toBeDefined();
      expect(formatted.recommendations).toBeDefined();
    });

    it('formats numbers correctly', () => {
      expect(ProfileUtils.formatNumber(1000)).toBe('1.0K');
      expect(ProfileUtils.formatNumber(1000000)).toBe('1.0M');
      expect(ProfileUtils.formatNumber(500)).toBe('500');
    });

    it('formats dates correctly', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 3600000);
      
      expect(ProfileUtils.formatDate(oneHourAgo.toISOString())).toBe('1 hour ago');
    });

    it('generates profile URL', () => {
      const url = ProfileUtils.generateProfileUrl('testuser');
      expect(url).toBe('/profile/testuser');
    });

    it('extracts username from URL', () => {
      const username = ProfileUtils.extractUsernameFromUrl('/profile/testuser');
      expect(username).toBe('testuser');
    });

    it('checks if profile is public ready', () => {
      const isReady = ProfileUtils.isProfilePublicReady(mockProfile);
      expect(typeof isReady).toBe('boolean');
    });

    it('gets profile visibility score', () => {
      const score = ProfileUtils.getProfileVisibilityScore(mockProfile);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('generates profile analytics', () => {
      const analytics = ProfileUtils.generateProfileAnalytics(mockProfile);
      
      expect(analytics.views).toBeDefined();
      expect(analytics.engagement).toBeDefined();
      expect(analytics.demographics).toBeDefined();
    });

    it('exports profile data', () => {
      const exported = ProfileUtils.exportProfileData(mockProfile);
      const parsed = JSON.parse(exported);
      
      expect(parsed.profile.username).toBe('testuser');
      expect(parsed.exportedAt).toBeDefined();
    });

    it('imports profile data', () => {
      const exported = ProfileUtils.exportProfileData(mockProfile);
      const imported = ProfileUtils.importProfileData(exported);
      
      expect(imported).toBeDefined();
      expect(imported?.username).toBe('testuser');
    });
  });

  describe('Integration Tests', () => {
    it('profile header and editor work together', async () => {
      const onEdit = jest.fn();
      const onSave = jest.fn();
      
      render(
        <div>
          <ProfileHeader profile={mockProfile} onEdit={onEdit} />
          <ProfileEditor profile={mockProfile} onSave={onSave} onCancel={jest.fn()} />
        </div>
      );
      
      const editButton = screen.getByText('Edit Profile');
      fireEvent.click(editButton);
      
      expect(onEdit).toHaveBeenCalled();
    });

    it('privacy settings and profile completion work together', () => {
      const onPrivacyChange = jest.fn();
      const onProfileComplete = jest.fn();
      
      render(
        <div>
          <PrivacySettings privacy={mockProfile.privacy} onChange={onPrivacyChange} />
          <ProfileCompletion profile={mockProfile} onComplete={onProfileComplete} />
        </div>
      );
      
      const showEmailToggle = screen.getByLabelText('Show Email');
      fireEvent.click(showEmailToggle);
      
      expect(onPrivacyChange).toHaveBeenCalled();
    });

    it('avatar upload and profile header work together', async () => {
      const onUpload = jest.fn();
      
      render(
        <div>
          <AvatarUpload avatar={mockProfile.avatar} onUpload={onUpload} onRemove={jest.fn()} />
          <ProfileHeader profile={mockProfile} />
        </div>
      );
      
      const fileInput = screen.getByLabelText('Upload Photo');
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      
      fireEvent.change(fileInput, { target: { files: [file] } });
      
      await waitFor(() => {
        expect(onUpload).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles profile loading errors', () => {
      mockUseProfile.mockReturnValue({
        ...mockUseProfile(),
        error: new Error('Failed to load profile')
      });
      
      render(<ProfileHeader profile={mockProfile} />);
      
      expect(screen.getByText('Error loading profile')).toBeInTheDocument();
    });

    it('handles profile update errors', async () => {
      mockUseProfile.mockReturnValue({
        ...mockUseProfile(),
        error: new Error('Failed to update profile')
      });
      
      render(<ProfileEditor profile={mockProfile} onSave={jest.fn()} onCancel={jest.fn()} />);
      
      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText('Error updating profile')).toBeInTheDocument();
      });
    });

    it('handles file upload errors', async () => {
      const onUpload = jest.fn(() => {
        throw new Error('Upload failed');
      });
      
      render(<AvatarUpload avatar={mockProfile.avatar} onUpload={onUpload} onRemove={jest.fn()} />);
      
      const fileInput = screen.getByLabelText('Upload Photo');
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      
      fireEvent.change(fileInput, { target: { files: [file] } });
      
      await waitFor(() => {
        expect(screen.getByText('Upload failed')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('profile header has proper ARIA labels', () => {
      render(<ProfileHeader profile={mockProfile} />);
      
      expect(screen.getByRole('img', { name: 'Profile' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Edit Profile' })).toBeInTheDocument();
    });

    it('profile editor has proper form labels', () => {
      render(<ProfileEditor profile={mockProfile} onSave={jest.fn()} onCancel={jest.fn()} />);
      
      expect(screen.getByLabelText('Username')).toBeInTheDocument();
      expect(screen.getByLabelText('Bio')).toBeInTheDocument();
      expect(screen.getByLabelText('University')).toBeInTheDocument();
    });

    it('privacy settings have proper form controls', () => {
      render(<PrivacySettings privacy={mockProfile.privacy} onChange={jest.fn()} />);
      
      expect(screen.getByRole('tablist')).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Profile' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Social' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Data' })).toBeInTheDocument();
    });

    it('profile completion has proper step indicators', () => {
      render(<ProfileCompletion profile={mockProfile} onComplete={jest.fn()} />);
      
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText('Complete Your Profile')).toBeInTheDocument();
    });
  });
});
