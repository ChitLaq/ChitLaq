// Social Utilities
// Author: ChitLaq Development Team
// Date: 2024-01-15

/**
 * Social interaction utilities for the ChitLaq platform
 */

// Types for social utilities
export interface SocialInteraction {
  type: 'follow' | 'unfollow' | 'block' | 'unblock' | 'mute' | 'unmute';
  userId: string;
  targetUserId: string;
  timestamp: Date;
}

export interface UserConnection {
  userId: string;
  targetUserId: string;
  relationshipType: 'follows' | 'blocks' | 'mutual';
  createdAt: Date;
}

export interface SocialMetrics {
  followers: number;
  following: number;
  mutualConnections: number;
  universityConnections: number;
  departmentConnections: number;
}

/**
 * Format social metrics for display
 */
export function formatSocialMetrics(metrics: SocialMetrics): {
  followers: string;
  following: string;
  mutual: string;
  university: string;
  department: string;
} {
  return {
    followers: formatNumber(metrics.followers),
    following: formatNumber(metrics.following),
    mutual: formatNumber(metrics.mutualConnections),
    university: formatNumber(metrics.universityConnections),
    department: formatNumber(metrics.departmentConnections),
  };
}

/**
 * Format numbers for display (e.g., 1000 -> 1K, 1000000 -> 1M)
 */
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

/**
 * Calculate mutual connections between two users
 */
export function calculateMutualConnections(
  userConnections: string[],
  targetConnections: string[]
): string[] {
  return userConnections.filter(userId => targetConnections.includes(userId));
}

/**
 * Generate friend recommendation reasons
 */
export function generateRecommendationReason(
  reasonType: 'mutual' | 'university' | 'department' | 'academic_year' | 'interests',
  count?: number
): string {
  switch (reasonType) {
    case 'mutual':
      return count ? `${count} mutual friends` : 'Mutual friends';
    case 'university':
      return 'Same university';
    case 'department':
      return 'Same department';
    case 'academic_year':
      return 'Same academic year';
    case 'interests':
      return 'Shared interests';
    default:
      return 'Recommended for you';
  }
}
