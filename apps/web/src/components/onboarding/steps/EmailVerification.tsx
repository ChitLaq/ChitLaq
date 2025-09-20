import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../hooks/use-auth';
import { trackOnboardingEvent } from '../../../utils/onboarding-analytics';
import { getLogger } from '../../../utils/logger';

const logger = getLogger('EmailVerification');

interface EmailVerificationProps {
  user: any;
  onboardingData: any;
  onComplete: (data: any) => void;
  onSkip?: () => void;
  onBack?: () => void;
  isLoading: boolean;
  error?: string;
}

const EmailVerification: React.FC<EmailVerificationProps> = ({
  user,
  onboardingData,
  onComplete,
  onSkip,
  onBack,
  isLoading,
  error,
}) => {
  const { resendVerificationEmail, verifyEmail } = useAuth();
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verificationError, setVerificationError] = useState('');
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [maxAttempts] = useState(3);

  // Check if user is already verified
  useEffect(() => {
    if (user?.isEmailVerified) {
      setVerificationSuccess(true);
      // Auto-complete if already verified
      setTimeout(() => {
        onComplete({ verified: true, alreadyVerified: true });
      }, 1000);
    }
  }, [user?.isEmailVerified, onComplete]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Handle verification code input
  const handleCodeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6); // Only digits, max 6
    setVerificationCode(value);
    setVerificationError('');
    
    // Auto-submit when 6 digits are entered
    if (value.length === 6) {
      handleVerifyCode(value);
    }
  }, []);

  // Handle verification
  const handleVerifyCode = useCallback(async (code?: string) => {
    const codeToVerify = code || verificationCode;
    
    if (!codeToVerify || codeToVerify.length !== 6) {
      setVerificationError('Please enter a valid 6-digit verification code');
      return;
    }

    if (attempts >= maxAttempts) {
      setVerificationError('Too many failed attempts. Please request a new verification code.');
      return;
    }

    setIsVerifying(true);
    setVerificationError('');

    try {
      await verifyEmail(user.email, codeToVerify);
      
      setVerificationSuccess(true);
      setAttempts(0);
      
      // Track successful verification
      trackOnboardingEvent('email_verification_success', {
        userId: user.id,
        attempts: attempts + 1,
        university: user.universityName,
      });

      logger.info(`Email verification successful for user ${user.id}`);
      
      // Complete step after short delay
      setTimeout(() => {
        onComplete({
          verified: true,
          verificationCode: codeToVerify,
          attempts: attempts + 1,
        });
      }, 1500);
      
    } catch (error: any) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      
      if (newAttempts >= maxAttempts) {
        setVerificationError('Too many failed attempts. Please request a new verification code.');
      } else {
        setVerificationError(error.message || 'Invalid verification code. Please try again.');
      }
      
      // Track failed verification
      trackOnboardingEvent('email_verification_failed', {
        userId: user.id,
        attempts: newAttempts,
        error: error.message,
        university: user.universityName,
      });

      logger.warn(`Email verification failed for user ${user.id}: ${error.message}`);
    } finally {
      setIsVerifying(false);
    }
  }, [verificationCode, attempts, maxAttempts, user, verifyEmail, onComplete]);

  // Handle resend verification
  const handleResendCode = useCallback(async () => {
    if (resendCooldown > 0) return;

    setIsResending(true);
    setVerificationError('');

    try {
      await resendVerificationEmail(user.email);
      
      setResendCooldown(60); // 60 second cooldown
      setAttempts(0); // Reset attempts on resend
      
      // Track resend
      trackOnboardingEvent('email_verification_resend', {
        userId: user.id,
        university: user.universityName,
      });

      logger.info(`Verification email resent to ${user.email}`);
      
    } catch (error: any) {
      setVerificationError(error.message || 'Failed to resend verification code. Please try again.');
      
      // Track resend failure
      trackOnboardingEvent('email_verification_resend_failed', {
        userId: user.id,
        error: error.message,
        university: user.universityName,
      });

      logger.error(`Failed to resend verification email to ${user.email}: ${error.message}`);
    } finally {
      setIsResending(false);
    }
  }, [user, resendVerificationEmail, resendCooldown]);

  // Handle manual verification (if user clicks verify button)
  const handleManualVerify = useCallback(() => {
    handleVerifyCode();
  }, [handleVerifyCode]);

  if (verificationSuccess) {
    return (
      <div className="email-verification-step">
        <div className="verification-success">
          <div className="success-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" fill="#10B981" />
              <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h3>Email Verified!</h3>
          <p>Your university email has been successfully verified.</p>
          <div className="success-animation">
            <div className="checkmark"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="email-verification-step">
      <div className="verification-container">
        {/* Email Display */}
        <div className="email-display">
          <div className="email-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h3>Check Your Email</h3>
          <p>We've sent a 6-digit verification code to:</p>
          <div className="email-address">
            <strong>{user.email}</strong>
          </div>
        </div>

        {/* Verification Code Input */}
        <div className="verification-input">
          <label htmlFor="verification-code">Enter verification code</label>
          <div className="code-input-container">
            <input
              id="verification-code"
              type="text"
              value={verificationCode}
              onChange={handleCodeChange}
              placeholder="000000"
              maxLength={6}
              className={`code-input ${verificationError ? 'error' : ''}`}
              disabled={isVerifying || isLoading}
              autoComplete="one-time-code"
              autoFocus
            />
            <div className="code-input-feedback">
              {verificationCode.length === 6 && (
                <span className="code-complete">✓</span>
              )}
            </div>
          </div>
          
          {verificationError && (
            <div className="error-message">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" fill="#EF4444"/>
                <line x1="15" y1="9" x2="9" y2="15" stroke="white" strokeWidth="2"/>
                <line x1="9" y1="9" x2="15" y2="15" stroke="white" strokeWidth="2"/>
              </svg>
              {verificationError}
            </div>
          )}
        </div>

        {/* Attempts Counter */}
        {attempts > 0 && (
          <div className="attempts-counter">
            <p>Attempts: {attempts}/{maxAttempts}</p>
            {attempts >= maxAttempts && (
              <p className="attempts-warning">
                Please request a new verification code to continue.
              </p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="verification-actions">
          <button
            className="btn btn-primary btn-large"
            onClick={handleManualVerify}
            disabled={isVerifying || isLoading || verificationCode.length !== 6}
          >
            {isVerifying ? (
              <>
                <div className="loading-spinner"></div>
                Verifying...
              </>
            ) : (
              'Verify Email'
            )}
          </button>
        </div>

        {/* Resend Section */}
        <div className="resend-section">
          <p>Didn't receive the code?</p>
          <button
            className="btn btn-link"
            onClick={handleResendCode}
            disabled={isResending || resendCooldown > 0 || isLoading}
          >
            {isResending ? (
              'Sending...'
            ) : resendCooldown > 0 ? (
              `Resend in ${resendCooldown}s`
            ) : (
              'Resend verification code'
            )}
          </button>
        </div>

        {/* Help Section */}
        <div className="verification-help">
          <details>
            <summary>Need help?</summary>
            <div className="help-content">
              <ul>
                <li>Check your spam/junk folder</li>
                <li>Make sure you're checking the correct email address</li>
                <li>The code expires after 10 minutes</li>
                <li>Contact support if you continue having issues</li>
              </ul>
              <div className="help-actions">
                <a href="/support" className="btn btn-secondary btn-small">
                  Contact Support
                </a>
              </div>
            </div>
          </details>
        </div>

        {/* University Context */}
        <div className="university-context">
          <div className="university-badge">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor"/>
            </svg>
            <span>Verified {user.universityName} student</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailVerification;
