export interface SocialRelationship {
  id: string;
  followerId: string;
  followingId: string;
  relationshipType: RelationshipType;
  status: RelationshipStatus;
  strength: number; // 0-100 relationship strength score
  metadata: RelationshipMetadata;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

export type RelationshipType = 
  | 'follow'
  | 'block'
  | 'university_connection'
  | 'mutual_connection'
  | 'recommended_connection'
  | 'alumni_connection'
  | 'department_connection'
  | 'year_connection'
  | 'interest_connection'
  | 'event_connection';

export type RelationshipStatus = 
  | 'active'
  | 'pending'
  | 'blocked'
  | 'muted'
  | 'archived'
  | 'expired';

export interface RelationshipMetadata {
  source: 'manual' | 'automatic' | 'recommendation' | 'university' | 'event';
  confidence: number; // 0-100 confidence score
  tags: string[];
  context: {
    universityId?: string;
    departmentId?: string;
    year?: number;
    interests?: string[];
    events?: string[];
    mutualConnections?: number;
    interactionScore?: number;
  };
  privacy: {
    visible: boolean;
    discoverable: boolean;
    shareable: boolean;
  };
}

export interface SocialGraphNode {
  id: string;
  userId: string;
  nodeType: 'user' | 'university' | 'department' | 'interest' | 'event';
  properties: NodeProperties;
  connections: ConnectionInfo;
  metrics: NodeMetrics;
  lastActivity: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface NodeProperties {
  displayName: string;
  description?: string;
  avatar?: string;
  university?: {
    id: string;
    name: string;
    domain: string;
  };
  department?: {
    id: string;
    name: string;
    code: string;
  };
  year?: number;
  interests?: string[];
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  privacy: {
    profileVisibility: 'public' | 'university' | 'connections' | 'private';
    connectionVisibility: 'public' | 'connections' | 'private';
    discoveryEnabled: boolean;
  };
}

export interface ConnectionInfo {
  followers: number;
  following: number;
  mutualConnections: number;
  blockedUsers: number;
  universityConnections: number;
  departmentConnections: number;
  yearConnections: number;
  interestConnections: number;
  eventConnections: number;
}

export interface NodeMetrics {
  engagementScore: number; // 0-100
  influenceScore: number; // 0-100
  activityLevel: 'high' | 'medium' | 'low';
  connectionGrowth: number; // percentage change
  interactionFrequency: number; // interactions per day
  lastInteraction: Date;
  topInterests: string[];
  activeHours: number[]; // hours of day when most active
}

export interface GraphTraversalResult {
  nodes: SocialGraphNode[];
  relationships: SocialRelationship[];
  path: string[];
  distance: number;
  weight: number;
  metadata: {
    traversalTime: number;
    nodesVisited: number;
    relationshipsTraversed: number;
    cacheHits: number;
  };
}

export interface SocialGraphQuery {
  startNode: string;
  endNode?: string;
  maxDepth: number;
  relationshipTypes?: RelationshipType[];
  filters?: GraphFilters;
  sortBy?: 'distance' | 'strength' | 'relevance' | 'activity';
  limit?: number;
  offset?: number;
}

export interface GraphFilters {
  universityId?: string;
  departmentId?: string;
  year?: number;
  interests?: string[];
  minStrength?: number;
  maxDistance?: number;
  activityLevel?: 'high' | 'medium' | 'low';
  privacyLevel?: 'public' | 'university' | 'connections' | 'private';
  excludeBlocked?: boolean;
  includeMutual?: boolean;
}

export interface ConnectionRecommendation {
  id: string;
  userId: string;
  recommendedUserId: string;
  recommendationType: 'mutual_connection' | 'university' | 'department' | 'year' | 'interest' | 'location' | 'activity';
  confidence: number; // 0-100
  reasons: string[];
  mutualConnections: string[];
  sharedInterests: string[];
  metadata: {
    universityId?: string;
    departmentId?: string;
    year?: number;
    distance?: number;
    interactionScore?: number;
    activityScore?: number;
  };
  createdAt: Date;
  expiresAt: Date;
  status: 'pending' | 'accepted' | 'dismissed' | 'expired';
}

export interface SocialGraphAnalytics {
  userId: string;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  startDate: Date;
  endDate: Date;
  generatedAt: Date;
  
  // Connection metrics
  connections: {
    total: number;
    new: number;
    lost: number;
    netGrowth: number;
    growthRate: number;
  };
  
  // Relationship metrics
  relationships: {
    followers: number;
    following: number;
    mutual: number;
    blocked: number;
    university: number;
    department: number;
    year: number;
    interest: number;
  };
  
  // Engagement metrics
  engagement: {
    profileViews: number;
    connectionRequests: number;
    acceptedRequests: number;
    rejectedRequests: number;
    blocks: number;
    unblocks: number;
    recommendationsViewed: number;
    recommendationsAccepted: number;
  };
  
  // Network metrics
  network: {
    networkSize: number;
    networkDensity: number;
    clusteringCoefficient: number;
    averagePathLength: number;
    influenceScore: number;
    reachScore: number;
  };
  
  // University network metrics
  universityNetwork: {
    totalConnections: number;
    departmentConnections: number;
    yearConnections: number;
    crossDepartmentConnections: number;
    alumniConnections: number;
    networkGrowth: number;
  };
  
  // Activity patterns
  activity: {
    peakHours: number[];
    peakDays: string[];
    connectionActivity: number;
    discoveryActivity: number;
    recommendationActivity: number;
  };
}

export interface GraphPerformanceMetrics {
  queryTime: number;
  nodesProcessed: number;
  relationshipsProcessed: number;
  cacheHitRate: number;
  memoryUsage: number;
  cpuUsage: number;
  databaseQueries: number;
  cacheQueries: number;
  errors: number;
}

// Factory functions for creating social graph entities
export const createSocialRelationship = (
  followerId: string,
  followingId: string,
  relationshipType: RelationshipType,
  metadata: Partial<RelationshipMetadata> = {}
): Omit<SocialRelationship, 'id' | 'createdAt' | 'updatedAt'> => ({
  followerId,
  followingId,
  relationshipType,
  status: 'active',
  strength: calculateInitialStrength(relationshipType, metadata),
  metadata: {
    source: 'manual',
    confidence: 100,
    tags: [],
    context: {},
    privacy: {
      visible: true,
      discoverable: true,
      shareable: true
    },
    ...metadata
  }
});

export const createSocialGraphNode = (
  userId: string,
  properties: Partial<NodeProperties> = {}
): Omit<SocialGraphNode, 'id' | 'createdAt' | 'updatedAt' | 'lastActivity'> => ({
  userId,
  nodeType: 'user',
  properties: {
    displayName: '',
    privacy: {
      profileVisibility: 'public',
      connectionVisibility: 'public',
      discoveryEnabled: true
    },
    ...properties
  },
  connections: {
    followers: 0,
    following: 0,
    mutualConnections: 0,
    blockedUsers: 0,
    universityConnections: 0,
    departmentConnections: 0,
    yearConnections: 0,
    interestConnections: 0,
    eventConnections: 0
  },
  metrics: {
    engagementScore: 0,
    influenceScore: 0,
    activityLevel: 'low',
    connectionGrowth: 0,
    interactionFrequency: 0,
    lastInteraction: new Date(),
    topInterests: [],
    activeHours: []
  }
});

export const createConnectionRecommendation = (
  userId: string,
  recommendedUserId: string,
  recommendationType: ConnectionRecommendation['recommendationType'],
  confidence: number,
  reasons: string[],
  metadata: Partial<ConnectionRecommendation['metadata']> = {}
): Omit<ConnectionRecommendation, 'id' | 'createdAt' | 'expiresAt'> => ({
  userId,
  recommendedUserId,
  recommendationType,
  confidence,
  reasons,
  mutualConnections: [],
  sharedInterests: [],
  metadata: {
    interactionScore: 0,
    activityScore: 0,
    ...metadata
  },
  status: 'pending'
});

// Utility functions
export const calculateInitialStrength = (
  relationshipType: RelationshipType,
  metadata: Partial<RelationshipMetadata>
): number => {
  const baseStrength: Record<RelationshipType, number> = {
    follow: 50,
    block: 0,
    university_connection: 70,
    mutual_connection: 80,
    recommended_connection: 60,
    alumni_connection: 75,
    department_connection: 65,
    year_connection: 60,
    interest_connection: 55,
    event_connection: 50
  };

  let strength = baseStrength[relationshipType] || 50;

  // Adjust based on metadata
  if (metadata.confidence) {
    strength = (strength * metadata.confidence) / 100;
  }

  if (metadata.context?.mutualConnections) {
    strength += Math.min(metadata.context.mutualConnections * 2, 20);
  }

  if (metadata.context?.interactionScore) {
    strength += Math.min(metadata.context.interactionScore, 10);
  }

  return Math.min(Math.max(strength, 0), 100);
};

export const calculateRelationshipStrength = (
  relationship: SocialRelationship,
  interactions: number,
  mutualConnections: number,
  timeDecay: number = 0.1
): number => {
  let strength = relationship.strength;

  // Boost from interactions
  strength += Math.min(interactions * 0.5, 20);

  // Boost from mutual connections
  strength += Math.min(mutualConnections * 1, 15);

  // Time decay
  const daysSinceUpdate = (Date.now() - relationship.updatedAt.getTime()) / (1000 * 60 * 60 * 24);
  strength -= daysSinceUpdate * timeDecay;

  return Math.min(Math.max(strength, 0), 100);
};

export const isRelationshipActive = (relationship: SocialRelationship): boolean => {
  return relationship.status === 'active' && 
         (!relationship.expiresAt || relationship.expiresAt > new Date());
};

export const canEstablishRelationship = (
  followerId: string,
  followingId: string,
  relationshipType: RelationshipType,
  existingRelationships: SocialRelationship[]
): { allowed: boolean; reason?: string } => {
  // Check for existing relationships
  const existing = existingRelationships.find(
    r => r.followerId === followerId && r.followingId === followingId
  );

  if (existing) {
    if (existing.relationshipType === 'block') {
      return { allowed: false, reason: 'User is blocked' };
    }
    if (existing.status === 'active') {
      return { allowed: false, reason: 'Relationship already exists' };
    }
  }

  // Check for blocking relationships
  const isBlocked = existingRelationships.some(
    r => (r.followerId === followerId && r.followingId === followingId && r.relationshipType === 'block') ||
         (r.followerId === followingId && r.followingId === followerId && r.relationshipType === 'block')
  );

  if (isBlocked) {
    return { allowed: false, reason: 'Blocking relationship exists' };
  }

  // Self-relationship check
  if (followerId === followingId) {
    return { allowed: false, reason: 'Cannot establish relationship with self' };
  }

  return { allowed: true };
};

export const getRelationshipTypes = (): RelationshipType[] => [
  'follow',
  'block',
  'university_connection',
  'mutual_connection',
  'recommended_connection',
  'alumni_connection',
  'department_connection',
  'year_connection',
  'interest_connection',
  'event_connection'
];

export const getRelationshipTypeDisplayName = (type: RelationshipType): string => {
  const displayNames: Record<RelationshipType, string> = {
    follow: 'Following',
    block: 'Blocked',
    university_connection: 'University Connection',
    mutual_connection: 'Mutual Connection',
    recommended_connection: 'Recommended Connection',
    alumni_connection: 'Alumni Connection',
    department_connection: 'Department Connection',
    year_connection: 'Year Connection',
    interest_connection: 'Interest Connection',
    event_connection: 'Event Connection'
  };

  return displayNames[type] || type;
};

export const getRelationshipTypeDescription = (type: RelationshipType): string => {
  const descriptions: Record<RelationshipType, string> = {
    follow: 'User is following another user',
    block: 'User has blocked another user',
    university_connection: 'Connection through same university',
    mutual_connection: 'Connection through mutual friends',
    recommended_connection: 'System-recommended connection',
    alumni_connection: 'Connection through alumni network',
    department_connection: 'Connection through same department',
    year_connection: 'Connection through same academic year',
    interest_connection: 'Connection through shared interests',
    event_connection: 'Connection through shared events'
  };

  return descriptions[type] || 'Unknown relationship type';
};

export const validateSocialRelationship = (relationship: Partial<SocialRelationship>): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!relationship.followerId || typeof relationship.followerId !== 'string') {
    errors.push('Follower ID is required and must be a string');
  }

  if (!relationship.followingId || typeof relationship.followingId !== 'string') {
    errors.push('Following ID is required and must be a string');
  }

  if (!relationship.relationshipType || !getRelationshipTypes().includes(relationship.relationshipType)) {
    errors.push('Valid relationship type is required');
  }

  if (relationship.strength !== undefined && (relationship.strength < 0 || relationship.strength > 100)) {
    errors.push('Relationship strength must be between 0 and 100');
  }

  if (relationship.metadata?.confidence !== undefined && (relationship.metadata.confidence < 0 || relationship.metadata.confidence > 100)) {
    errors.push('Confidence score must be between 0 and 100');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

export const validateSocialGraphNode = (node: Partial<SocialGraphNode>): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!node.userId || typeof node.userId !== 'string') {
    errors.push('User ID is required and must be a string');
  }

  if (!node.nodeType || !['user', 'university', 'department', 'interest', 'event'].includes(node.nodeType)) {
    errors.push('Valid node type is required');
  }

  if (node.properties?.privacy) {
    const privacy = node.properties.privacy;
    if (!['public', 'university', 'connections', 'private'].includes(privacy.profileVisibility)) {
      errors.push('Valid profile visibility setting is required');
    }
    if (!['public', 'connections', 'private'].includes(privacy.connectionVisibility)) {
      errors.push('Valid connection visibility setting is required');
    }
  }

  if (node.metrics?.engagementScore !== undefined && (node.metrics.engagementScore < 0 || node.metrics.engagementScore > 100)) {
    errors.push('Engagement score must be between 0 and 100');
  }

  if (node.metrics?.influenceScore !== undefined && (node.metrics.influenceScore < 0 || node.metrics.influenceScore > 100)) {
    errors.push('Influence score must be between 0 and 100');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

// Graph traversal utilities
export const createGraphQuery = (
  startNode: string,
  options: Partial<SocialGraphQuery> = {}
): SocialGraphQuery => ({
  startNode,
  maxDepth: 3,
  relationshipTypes: ['follow', 'university_connection'],
  filters: {
    excludeBlocked: true,
    includeMutual: true
  },
  sortBy: 'relevance',
  limit: 50,
  offset: 0,
  ...options
});

export const createGraphFilters = (
  filters: Partial<GraphFilters> = {}
): GraphFilters => ({
  excludeBlocked: true,
  includeMutual: true,
  minStrength: 0,
  maxDistance: 3,
  ...filters
});

// Serialization utilities
export const serializeSocialRelationship = (relationship: SocialRelationship): string => {
  return JSON.stringify({
    ...relationship,
    createdAt: relationship.createdAt.toISOString(),
    updatedAt: relationship.updatedAt.toISOString(),
    expiresAt: relationship.expiresAt?.toISOString()
  });
};

export const deserializeSocialRelationship = (serialized: string): SocialRelationship => {
  const parsed = JSON.parse(serialized);
  return {
    ...parsed,
    createdAt: new Date(parsed.createdAt),
    updatedAt: new Date(parsed.updatedAt),
    expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : undefined
  };
};

export const serializeSocialGraphNode = (node: SocialGraphNode): string => {
  return JSON.stringify({
    ...node,
    lastActivity: node.lastActivity.toISOString(),
    createdAt: node.createdAt.toISOString(),
    updatedAt: node.updatedAt.toISOString()
  });
};

export const deserializeSocialGraphNode = (serialized: string): SocialGraphNode => {
  const parsed = JSON.parse(serialized);
  return {
    ...parsed,
    lastActivity: new Date(parsed.lastActivity),
    createdAt: new Date(parsed.createdAt),
    updatedAt: new Date(parsed.updatedAt)
  };
};
