import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { useRouter } from 'next/router';
import { useAuth } from '../src/hooks/use-auth';
import { useOnboarding } from '../src/hooks/use-onboarding';
import OnboardingWizard from '../src/components/onboarding/OnboardingWizard';
import EmailVerification from '../src/components/onboarding/steps/EmailVerification';
import ProfileSetup from '../src/components/onboarding/steps/ProfileSetup';
import InterestSelection from '../src/components/onboarding/steps/InterestSelection';
import UniversityNetwork from '../src/components/onboarding/steps/UniversityNetwork';
import { trackOnboardingEvent } from '../src/utils/onboarding-analytics';

// Mock dependencies
jest.mock('next/router');
jest.mock('../src/hooks/use-auth');
jest.mock('../src/hooks/use-onboarding');
jest.mock('../src/utils/onboarding-analytics');
jest.mock('../../../utils/logger');

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  pathname: '/onboarding',
  query: { step: 'email-verification' },
};

const mockUser = {
  id: 'user-123',
  email: 'john.doe@mit.edu',
  firstName: 'John',
  lastName: 'Doe',
  username: 'johndoe',
  universityName: 'MIT',
  universityId: 'uni-1',
  userType: 'student',
  isEmailVerified: false,
  onboardingCompleted: false,
};

const mockOnboardingData = {
  'email-verification': { verified: true },
  'profile-setup': { completed: true },
  'interest-selection': { selectedInterests: ['computer-science', 'ai'] },
  'university-network': { selectedUsers: ['user-456'] },
};

const mockUseAuth = {
  user: mockUser,
  isAuthenticated: true,
  resendVerificationEmail: jest.fn(),
  verifyEmail: jest.fn(),
};

const mockUseOnboarding = {
  currentStep: 'email-verification',
  completedSteps: [],
  onboardingData: mockOnboardingData,
  isLoading: false,
  error: null,
  updateStep: jest.fn(),
  completeStep: jest.fn(),
  skipStep: jest.fn(),
  saveOnboardingData: jest.fn(),
  loadOnboardingProgress: jest.fn(),
  resetOnboarding: jest.fn(),
};

describe('Onboarding Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useAuth as jest.Mock).mockReturnValue(mockUseAuth);
    (useOnboarding as jest.Mock).mockReturnValue(mockUseOnboarding);
    (trackOnboardingEvent as jest.Mock).mockResolvedValue(undefined);
  });

  describe('OnboardingWizard', () => {
    it('renders onboarding wizard correctly', () => {
      render(<OnboardingWizard />);
      
      expect(screen.getByText('ChitLaq')).toBeInTheDocument();
      expect(screen.getByText('Welcome to your university network')).toBeInTheDocument();
      expect(screen.getByText('Verify Your Email')).toBeInTheDocument();
    });

    it('redirects to login if not authenticated', () => {
      (useAuth as jest.Mock).mockReturnValue({
        ...mockUseAuth,
        isAuthenticated: false,
        user: null,
      });

      render(<OnboardingWizard />);
      
      expect(mockRouter.push).toHaveBeenCalledWith('/login');
    });

    it('redirects to feed if onboarding already completed', () => {
      (useAuth as jest.Mock).mockReturnValue({
        ...mockUseAuth,
        user: { ...mockUser, onboardingCompleted: true },
      });

      render(<OnboardingWizard />);
      
      expect(mockRouter.push).toHaveBeenCalledWith('/feed');
    });

    it('tracks onboarding start event', () => {
      render(<OnboardingWizard />);
      
      expect(trackOnboardingEvent).toHaveBeenCalledWith('onboarding_started', {
        userId: mockUser.id,
        university: mockUser.universityName,
        userType: mockUser.userType,
      });
    });

    it('handles step completion', async () => {
      render(<OnboardingWizard />);
      
      // Simulate step completion
      const wizard = screen.getByTestId('onboarding-wizard');
      fireEvent.click(wizard);
      
      await waitFor(() => {
        expect(mockUseOnboarding.completeStep).toHaveBeenCalled();
      });
    });

    it('handles step skip', async () => {
      render(<OnboardingWizard />);
      
      const skipButton = screen.getByText('Skip onboarding');
      fireEvent.click(skipButton);
      
      await waitFor(() => {
        expect(mockUseOnboarding.skipStep).toHaveBeenCalled();
      });
    });

    it('shows loading state', () => {
      (useOnboarding as jest.Mock).mockReturnValue({
        ...mockUseOnboarding,
        isLoading: true,
      });

      render(<OnboardingWizard />);
      
      expect(screen.getByText('Setting up your experience...')).toBeInTheDocument();
    });

    it('shows error state', () => {
      (useOnboarding as jest.Mock).mockReturnValue({
        ...mockUseOnboarding,
        error: 'Something went wrong',
      });

      render(<OnboardingWizard />);
      
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });

  describe('EmailVerification', () => {
    it('renders email verification step correctly', () => {
      render(
        <EmailVerification
          user={mockUser}
          onboardingData={mockOnboardingData}
          onComplete={jest.fn()}
          isLoading={false}
        />
      );
      
      expect(screen.getByText('Check Your Email')).toBeInTheDocument();
      expect(screen.getByText(mockUser.email)).toBeInTheDocument();
      expect(screen.getByPlaceholderText('000000')).toBeInTheDocument();
    });

    it('handles verification code input', () => {
      render(
        <EmailVerification
          user={mockUser}
          onboardingData={mockOnboardingData}
          onComplete={jest.fn()}
          isLoading={false}
        />
      );
      
      const codeInput = screen.getByPlaceholderText('000000');
      fireEvent.change(codeInput, { target: { value: '123456' } });
      
      expect(codeInput).toHaveValue('123456');
    });

    it('auto-submits when 6 digits are entered', async () => {
      const mockOnComplete = jest.fn();
      (mockUseAuth.verifyEmail as jest.Mock).mockResolvedValue(undefined);
      
      render(
        <EmailVerification
          user={mockUser}
          onboardingData={mockOnboardingData}
          onComplete={mockOnComplete}
          isLoading={false}
        />
      );
      
      const codeInput = screen.getByPlaceholderText('000000');
      fireEvent.change(codeInput, { target: { value: '123456' } });
      
      await waitFor(() => {
        expect(mockUseAuth.verifyEmail).toHaveBeenCalledWith(mockUser.email, '123456');
      });
    });

    it('handles verification success', async () => {
      const mockOnComplete = jest.fn();
      (mockUseAuth.verifyEmail as jest.Mock).mockResolvedValue(undefined);
      
      render(
        <EmailVerification
          user={mockUser}
          onboardingData={mockOnboardingData}
          onComplete={mockOnComplete}
          isLoading={false}
        />
      );
      
      const codeInput = screen.getByPlaceholderText('000000');
      fireEvent.change(codeInput, { target: { value: '123456' } });
      
      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalledWith({
          verified: true,
          verificationCode: '123456',
          attempts: 1,
        });
      });
    });

    it('handles verification failure', async () => {
      (mockUseAuth.verifyEmail as jest.Mock).mockRejectedValue(new Error('Invalid code'));
      
      render(
        <EmailVerification
          user={mockUser}
          onboardingData={mockOnboardingData}
          onComplete={jest.fn()}
          isLoading={false}
        />
      );
      
      const codeInput = screen.getByPlaceholderText('000000');
      fireEvent.change(codeInput, { target: { value: '123456' } });
      
      await waitFor(() => {
        expect(screen.getByText('Invalid verification code. Please try again.')).toBeInTheDocument();
      });
    });

    it('handles resend verification', async () => {
      (mockUseAuth.resendVerificationEmail as jest.Mock).mockResolvedValue(undefined);
      
      render(
        <EmailVerification
          user={mockUser}
          onboardingData={mockOnboardingData}
          onComplete={jest.fn()}
          isLoading={false}
        />
      );
      
      const resendButton = screen.getByText('Resend verification code');
      fireEvent.click(resendButton);
      
      await waitFor(() => {
        expect(mockUseAuth.resendVerificationEmail).toHaveBeenCalledWith(mockUser.email);
      });
    });

    it('shows success state for already verified email', () => {
      (useAuth as jest.Mock).mockReturnValue({
        ...mockUseAuth,
        user: { ...mockUser, isEmailVerified: true },
      });
      
      render(
        <EmailVerification
          user={{ ...mockUser, isEmailVerified: true }}
          onboardingData={mockOnboardingData}
          onComplete={jest.fn()}
          isLoading={false}
        />
      );
      
      expect(screen.getByText('Email Verified!')).toBeInTheDocument();
    });
  });

  describe('ProfileSetup', () => {
    it('renders profile setup step correctly', () => {
      render(
        <ProfileSetup
          user={mockUser}
          onboardingData={mockOnboardingData}
          onComplete={jest.fn()}
          isLoading={false}
        />
      );
      
      expect(screen.getByText('Complete Your Profile')).toBeInTheDocument();
      expect(screen.getByLabelText('First Name *')).toBeInTheDocument();
      expect(screen.getByLabelText('Last Name *')).toBeInTheDocument();
      expect(screen.getByLabelText('Username *')).toBeInTheDocument();
    });

    it('handles form input changes', () => {
      render(
        <ProfileSetup
          user={mockUser}
          onboardingData={mockOnboardingData}
          onComplete={jest.fn()}
          isLoading={false}
        />
      );
      
      const firstNameInput = screen.getByLabelText('First Name *');
      fireEvent.change(firstNameInput, { target: { value: 'Jane' } });
      
      expect(firstNameInput).toHaveValue('Jane');
    });

    it('validates required fields', async () => {
      const mockOnComplete = jest.fn();
      
      render(
        <ProfileSetup
          user={mockUser}
          onboardingData={mockOnboardingData}
          onComplete={mockOnComplete}
          isLoading={false}
        />
      );
      
      const submitButton = screen.getByText('Complete Profile');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('First name is required')).toBeInTheDocument();
      });
    });

    it('handles profile picture upload', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      
      // Mock fetch for file upload
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ url: 'https://example.com/image.jpg' }),
      });
      
      render(
        <ProfileSetup
          user={mockUser}
          onboardingData={mockOnboardingData}
          onComplete={jest.fn()}
          isLoading={false}
        />
      );
      
      const fileInput = screen.getByLabelText('Upload Photo');
      fireEvent.change(fileInput, { target: { files: [mockFile] } });
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/users/upload-profile-picture', expect.any(Object));
      });
    });

    it('checks username availability', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ available: true }),
      });
      
      render(
        <ProfileSetup
          user={mockUser}
          onboardingData={mockOnboardingData}
          onComplete={jest.fn()}
          isLoading={false}
        />
      );
      
      const usernameInput = screen.getByLabelText('Username *');
      fireEvent.change(usernameInput, { target: { value: 'johndoe123' } });
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/users/check-username', expect.any(Object));
      });
    });

    it('shows username suggestions', () => {
      render(
        <ProfileSetup
          user={mockUser}
          onboardingData={mockOnboardingData}
          onComplete={jest.fn()}
          isLoading={false}
        />
      );
      
      const firstNameInput = screen.getByLabelText('First Name *');
      const lastNameInput = screen.getByLabelText('Last Name *');
      
      fireEvent.change(firstNameInput, { target: { value: 'John' } });
      fireEvent.change(lastNameInput, { target: { value: 'Doe' } });
      
      expect(screen.getByText('Suggestions:')).toBeInTheDocument();
    });
  });

  describe('InterestSelection', () => {
    it('renders interest selection step correctly', () => {
      render(
        <InterestSelection
          user={mockUser}
          onboardingData={mockOnboardingData}
          onComplete={jest.fn()}
          isLoading={false}
        />
      );
      
      expect(screen.getByText('What interests you?')).toBeInTheDocument();
      expect(screen.getByText('Select topics you\'re passionate about to personalize your feed')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search interests...')).toBeInTheDocument();
    });

    it('handles interest selection', () => {
      render(
        <InterestSelection
          user={mockUser}
          onboardingData={mockOnboardingData}
          onComplete={jest.fn()}
          isLoading={false}
        />
      );
      
      const interestTags = screen.getAllByText(/Computer Science|Mathematics|Physics/);
      fireEvent.click(interestTags[0]);
      
      expect(screen.getByText('1/10 selected')).toBeInTheDocument();
    });

    it('limits interest selection to 10', () => {
      render(
        <InterestSelection
          user={mockUser}
          onboardingData={mockOnboardingData}
          onComplete={jest.fn()}
          isLoading={false}
        />
      );
      
      const interestTags = screen.getAllByText(/Computer Science|Mathematics|Physics|Biology|Chemistry/);
      
      // Select 10 interests
      for (let i = 0; i < 10; i++) {
        fireEvent.click(interestTags[i]);
      }
      
      // Try to select 11th interest
      fireEvent.click(interestTags[10]);
      
      expect(screen.getByText('10/10 selected')).toBeInTheDocument();
    });

    it('handles search functionality', () => {
      render(
        <InterestSelection
          user={mockUser}
          onboardingData={mockOnboardingData}
          onComplete={jest.fn()}
          isLoading={false}
        />
      );
      
      const searchInput = screen.getByPlaceholderText('Search interests...');
      fireEvent.change(searchInput, { target: { value: 'computer' } });
      
      expect(searchInput).toHaveValue('computer');
    });

    it('shows recommendations', () => {
      render(
        <InterestSelection
          user={mockUser}
          onboardingData={mockOnboardingData}
          onComplete={jest.fn()}
          isLoading={false}
        />
      );
      
      expect(screen.getByText(`Popular at ${mockUser.universityName}`)).toBeInTheDocument();
    });

    it('handles form submission', async () => {
      const mockOnComplete = jest.fn();
      
      render(
        <InterestSelection
          user={mockUser}
          onboardingData={mockOnboardingData}
          onComplete={mockOnComplete}
          isLoading={false}
        />
      );
      
      // Select an interest
      const interestTags = screen.getAllByText(/Computer Science/);
      fireEvent.click(interestTags[0]);
      
      const submitButton = screen.getByText(/Continue with 1 interest/);
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalled();
      });
    });
  });

  describe('UniversityNetwork', () => {
    const mockSuggestedUsers = [
      {
        id: 'user-456',
        firstName: 'Jane',
        lastName: 'Smith',
        username: 'janesmith',
        yearOfStudy: 'Junior',
        major: 'Computer Science',
        bio: 'Passionate about AI and machine learning',
        mutualConnections: 2,
        sharedInterests: ['Computer Science', 'AI'],
        isOnline: true,
        lastActive: '2024-01-01T00:00:00Z',
      },
    ];

    const mockUniversityStats = {
      totalStudents: 10000,
      activeUsers: 5000,
      popularMajors: ['Computer Science', 'Engineering', 'Business'],
      recentGraduates: 2000,
      facultyCount: 500,
    };

    beforeEach(() => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockUniversityStats),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSuggestedUsers),
        });
    });

    it('renders university network step correctly', async () => {
      render(
        <UniversityNetwork
          user={mockUser}
          onboardingData={mockOnboardingData}
          onComplete={jest.fn()}
          isLoading={false}
        />
      );
      
      expect(screen.getByText('Connect with Your University')).toBeInTheDocument();
      expect(screen.getByText(`Discover and connect with students, faculty, and staff from ${mockUser.universityName}`)).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.getByText('10,000')).toBeInTheDocument(); // Total students
        expect(screen.getByText('5,000')).toBeInTheDocument(); // Active users
      });
    });

    it('handles user selection', async () => {
      render(
        <UniversityNetwork
          user={mockUser}
          onboardingData={mockOnboardingData}
          onComplete={jest.fn()}
          isLoading={false}
        />
      );
      
      await waitFor(() => {
        const userCard = screen.getByText('Jane Smith');
        fireEvent.click(userCard);
      });
      
      expect(screen.getByText('Selected Connections (1/10)')).toBeInTheDocument();
    });

    it('handles filter changes', async () => {
      render(
        <UniversityNetwork
          user={mockUser}
          onboardingData={mockOnboardingData}
          onComplete={jest.fn()}
          isLoading={false}
        />
      );
      
      const sameMajorTab = screen.getByText('Same Major');
      fireEvent.click(sameMajorTab);
      
      expect(sameMajorTab).toHaveClass('active');
    });

    it('handles search functionality', async () => {
      render(
        <UniversityNetwork
          user={mockUser}
          onboardingData={mockOnboardingData}
          onComplete={jest.fn()}
          isLoading={false}
        />
      );
      
      const searchInput = screen.getByPlaceholderText('Search by name, major, or username...');
      fireEvent.change(searchInput, { target: { value: 'jane' } });
      
      expect(searchInput).toHaveValue('jane');
    });

    it('shows popular majors', async () => {
      render(
        <UniversityNetwork
          user={mockUser}
          onboardingData={mockOnboardingData}
          onComplete={jest.fn()}
          isLoading={false}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByText(`Popular Majors at ${mockUser.universityName}`)).toBeInTheDocument();
        expect(screen.getByText('#1 Computer Science')).toBeInTheDocument();
      });
    });

    it('handles form submission', async () => {
      const mockOnComplete = jest.fn();
      
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockUniversityStats),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSuggestedUsers),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });
      
      render(
        <UniversityNetwork
          user={mockUser}
          onboardingData={mockOnboardingData}
          onComplete={mockOnComplete}
          isLoading={false}
        />
      );
      
      // Select a user
      await waitFor(() => {
        const userCard = screen.getByText('Jane Smith');
        fireEvent.click(userCard);
      });
      
      const submitButton = screen.getByText('Send 1 Connection Request');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalled();
      });
    });
  });

  describe('Analytics Integration', () => {
    it('tracks onboarding events', () => {
      render(<OnboardingWizard />);
      
      expect(trackOnboardingEvent).toHaveBeenCalledWith('onboarding_started', {
        userId: mockUser.id,
        university: mockUser.universityName,
        userType: mockUser.userType,
      });
    });

    it('tracks step completion events', async () => {
      const mockOnComplete = jest.fn();
      
      render(
        <EmailVerification
          user={mockUser}
          onboardingData={mockOnboardingData}
          onComplete={mockOnComplete}
          isLoading={false}
        />
      );
      
      const codeInput = screen.getByPlaceholderText('000000');
      fireEvent.change(codeInput, { target: { value: '123456' } });
      
      await waitFor(() => {
        expect(trackOnboardingEvent).toHaveBeenCalledWith('email_verification_success', {
          userId: mockUser.id,
          attempts: 1,
          university: mockUser.universityName,
        });
      });
    });

    it('tracks interest selection events', () => {
      render(
        <InterestSelection
          user={mockUser}
          onboardingData={mockOnboardingData}
          onComplete={jest.fn()}
          isLoading={false}
        />
      );
      
      const interestTags = screen.getAllByText(/Computer Science/);
      fireEvent.click(interestTags[0]);
      
      expect(trackOnboardingEvent).toHaveBeenCalledWith('interest_selected', {
        userId: mockUser.id,
        interestId: 'computer-science',
        university: mockUser.universityName,
      });
    });
  });

  describe('Error Handling', () => {
    it('handles network errors gracefully', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
      
      render(
        <UniversityNetwork
          user={mockUser}
          onboardingData={mockOnboardingData}
          onComplete={jest.fn()}
          isLoading={false}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByText('No suggestions found. Try adjusting your filters or search.')).toBeInTheDocument();
      });
    });

    it('handles validation errors', async () => {
      render(
        <ProfileSetup
          user={mockUser}
          onboardingData={mockOnboardingData}
          onComplete={jest.fn()}
          isLoading={false}
        />
      );
      
      const submitButton = screen.getByText('Complete Profile');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('First name is required')).toBeInTheDocument();
        expect(screen.getByText('Last name is required')).toBeInTheDocument();
        expect(screen.getByText('Username is required')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(
        <EmailVerification
          user={mockUser}
          onboardingData={mockOnboardingData}
          onComplete={jest.fn()}
          isLoading={false}
        />
      );
      
      const codeInput = screen.getByLabelText('Enter verification code');
      expect(codeInput).toBeInTheDocument();
    });

    it('supports keyboard navigation', () => {
      render(
        <InterestSelection
          user={mockUser}
          onboardingData={mockOnboardingData}
          onComplete={jest.fn()}
          isLoading={false}
        />
      );
      
      const searchInput = screen.getByPlaceholderText('Search interests...');
      searchInput.focus();
      
      expect(document.activeElement).toBe(searchInput);
    });

    it('has proper focus management', () => {
      render(
        <ProfileSetup
          user={mockUser}
          onboardingData={mockOnboardingData}
          onComplete={jest.fn()}
          isLoading={false}
        />
      );
      
      const firstNameInput = screen.getByLabelText('First Name *');
      firstNameInput.focus();
      
      expect(document.activeElement).toBe(firstNameInput);
    });
  });
});
