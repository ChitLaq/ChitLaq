import { 
  SocialGraphNode, 
  SocialRelationship, 
  GraphTraversalResult, 
  SocialGraphQuery, 
  GraphFilters,
  RelationshipType,
  RelationshipStatus
} from '../models/SocialGraph';

export interface TraversalOptions {
  maxDepth: number;
  relationshipTypes?: RelationshipType[];
  filters?: GraphFilters;
  sortBy?: 'distance' | 'strength' | 'relevance' | 'activity';
  limit?: number;
  offset?: number;
  includeBlocked?: boolean;
  includeMuted?: boolean;
  bidirectional?: boolean;
}

export interface TraversalNode {
  id: string;
  userId: string;
  distance: number;
  weight: number;
  path: string[];
  relationships: SocialRelationship[];
  node: SocialGraphNode;
}

export interface TraversalMetrics {
  nodesVisited: number;
  relationshipsTraversed: number;
  cacheHits: number;
  traversalTime: number;
  memoryUsage: number;
  depthReached: number;
}

export class GraphTraversalEngine {
  private visitedNodes: Set<string> = new Set();
  private traversalQueue: TraversalNode[] = [];
  private results: TraversalNode[] = [];
  private metrics: TraversalMetrics;
  private startTime: number;

  constructor() {
    this.metrics = {
      nodesVisited: 0,
      relationshipsTraversed: 0,
      cacheHits: 0,
      traversalTime: 0,
      memoryUsage: 0,
      depthReached: 0
    };
    this.startTime = Date.now();
  }

  async traverseGraph(
    startNodeId: string,
    options: TraversalOptions,
    getNode: (nodeId: string) => Promise<SocialGraphNode | null>,
    getRelationships: (nodeId: string, types?: RelationshipType[]) => Promise<SocialRelationship[]>
  ): Promise<GraphTraversalResult> {
    try {
      this.reset();
      
      // Get start node
      const startNode = await getNode(startNodeId);
      if (!startNode) {
        throw new Error(`Start node ${startNodeId} not found`);
      }

      // Initialize traversal
      this.traversalQueue.push({
        id: startNodeId,
        userId: startNode.userId,
        distance: 0,
        weight: 1.0,
        path: [startNodeId],
        relationships: [],
        node: startNode
      });

      this.visitedNodes.add(startNodeId);
      this.metrics.nodesVisited++;

      // Perform traversal
      await this.performTraversal(options, getNode, getRelationships);

      // Process results
      const processedResults = this.processResults(options);

      // Calculate final metrics
      this.metrics.traversalTime = Date.now() - this.startTime;
      this.metrics.memoryUsage = this.estimateMemoryUsage();

      return {
        nodes: processedResults.map(r => r.node),
        relationships: processedResults.flatMap(r => r.relationships),
        path: processedResults[0]?.path || [],
        distance: processedResults[0]?.distance || 0,
        weight: processedResults[0]?.weight || 0,
        metadata: {
          traversalTime: this.metrics.traversalTime,
          nodesVisited: this.metrics.nodesVisited,
          relationshipsTraversed: this.metrics.relationshipsTraversed,
          cacheHits: this.metrics.cacheHits
        }
      };
    } catch (error) {
      console.error('Error in graph traversal:', error);
      throw error;
    }
  }

  private async performTraversal(
    options: TraversalOptions,
    getNode: (nodeId: string) => Promise<SocialGraphNode | null>,
    getRelationships: (nodeId: string, types?: RelationshipType[]) => Promise<SocialRelationship[]>
  ): Promise<void> {
    while (this.traversalQueue.length > 0) {
      const current = this.traversalQueue.shift()!;
      
      // Check depth limit
      if (current.distance >= options.maxDepth) {
        continue;
      }

      // Update depth reached
      this.metrics.depthReached = Math.max(this.metrics.depthReached, current.distance);

      // Get relationships for current node
      const relationships = await getRelationships(current.id, options.relationshipTypes);
      this.metrics.relationshipsTraversed += relationships.length;

      // Process each relationship
      for (const relationship of relationships) {
        await this.processRelationship(
          current,
          relationship,
          options,
          getNode
        );
      }

      // Add to results if it meets criteria
      if (this.shouldIncludeInResults(current, options)) {
        this.results.push(current);
      }
    }
  }

  private async processRelationship(
    current: TraversalNode,
    relationship: SocialRelationship,
    options: TraversalOptions,
    getNode: (nodeId: string) => Promise<SocialGraphNode | null>
  ): Promise<void> {
    // Determine target node ID
    const targetNodeId = relationship.followingId === current.id 
      ? relationship.followerId 
      : relationship.followingId;

    // Skip if already visited
    if (this.visitedNodes.has(targetNodeId)) {
      return;
    }

    // Apply filters
    if (!this.passesFilters(relationship, options.filters)) {
      return;
    }

    // Get target node
    const targetNode = await getNode(targetNodeId);
    if (!targetNode) {
      return;
    }

    // Calculate new distance and weight
    const newDistance = current.distance + 1;
    const newWeight = this.calculateWeight(current, relationship, targetNode);

    // Create new traversal node
    const newTraversalNode: TraversalNode = {
      id: targetNodeId,
      userId: targetNode.userId,
      distance: newDistance,
      weight: newWeight,
      path: [...current.path, targetNodeId],
      relationships: [...current.relationships, relationship],
      node: targetNode
    };

    // Add to queue
    this.traversalQueue.push(newTraversalNode);
    this.visitedNodes.add(targetNodeId);
    this.metrics.nodesVisited++;
  }

  private shouldIncludeInResults(
    node: TraversalNode,
    options: TraversalOptions
  ): boolean {
    // Check distance
    if (node.distance === 0) {
      return false; // Don't include start node
    }

    // Check limit
    if (options.limit && this.results.length >= options.limit) {
      return false;
    }

    // Apply additional filters
    if (options.filters) {
      if (options.filters.minStrength && node.weight < options.filters.minStrength) {
        return false;
      }
      if (options.filters.maxDistance && node.distance > options.filters.maxDistance) {
        return false;
      }
    }

    return true;
  }

  private passesFilters(
    relationship: SocialRelationship,
    filters?: GraphFilters
  ): boolean {
    if (!filters) {
      return true;
    }

    // Check relationship status
    if (relationship.status === 'blocked' && !filters.includeBlocked) {
      return false;
    }
    if (relationship.status === 'muted' && !filters.includeMuted) {
      return false;
    }

    // Check strength
    if (filters.minStrength && relationship.strength < filters.minStrength) {
      return false;
    }

    // Check university filter
    if (filters.universityId && 
        relationship.metadata.context.universityId !== filters.universityId) {
      return false;
    }

    // Check department filter
    if (filters.departmentId && 
        relationship.metadata.context.departmentId !== filters.departmentId) {
      return false;
    }

    // Check year filter
    if (filters.year && 
        relationship.metadata.context.year !== filters.year) {
      return false;
    }

    // Check interests filter
    if (filters.interests && filters.interests.length > 0) {
      const relationshipInterests = relationship.metadata.context.interests || [];
      const hasMatchingInterest = filters.interests.some(interest => 
        relationshipInterests.includes(interest)
      );
      if (!hasMatchingInterest) {
        return false;
      }
    }

    return true;
  }

  private calculateWeight(
    current: TraversalNode,
    relationship: SocialRelationship,
    targetNode: SocialGraphNode
  ): number {
    let weight = current.weight;

    // Base relationship strength
    weight *= (relationship.strength / 100);

    // Distance decay
    weight *= Math.pow(0.8, current.distance);

    // Node activity factor
    const activityFactor = this.getActivityFactor(targetNode);
    weight *= activityFactor;

    // Mutual connections boost
    if (relationship.metadata.context.mutualConnections) {
      const mutualBoost = Math.min(relationship.metadata.context.mutualConnections * 0.1, 0.5);
      weight += mutualBoost;
    }

    // Interaction score boost
    if (relationship.metadata.context.interactionScore) {
      const interactionBoost = Math.min(relationship.metadata.context.interactionScore * 0.05, 0.3);
      weight += interactionBoost;
    }

    return Math.min(Math.max(weight, 0), 1);
  }

  private getActivityFactor(node: SocialGraphNode): number {
    const activityLevels = {
      high: 1.2,
      medium: 1.0,
      low: 0.8
    };

    return activityLevels[node.metrics.activityLevel] || 1.0;
  }

  private processResults(options: TraversalOptions): TraversalNode[] {
    let processedResults = [...this.results];

    // Apply sorting
    if (options.sortBy) {
      processedResults = this.sortResults(processedResults, options.sortBy);
    }

    // Apply pagination
    if (options.offset || options.limit) {
      const start = options.offset || 0;
      const end = options.limit ? start + options.limit : undefined;
      processedResults = processedResults.slice(start, end);
    }

    return processedResults;
  }

  private sortResults(
    results: TraversalNode[],
    sortBy: string
  ): TraversalNode[] {
    switch (sortBy) {
      case 'distance':
        return results.sort((a, b) => a.distance - b.distance);
      case 'strength':
        return results.sort((a, b) => b.weight - a.weight);
      case 'relevance':
        return results.sort((a, b) => {
          const relevanceA = this.calculateRelevance(a);
          const relevanceB = this.calculateRelevance(b);
          return relevanceB - relevanceA;
        });
      case 'activity':
        return results.sort((a, b) => {
          const activityA = a.node.metrics.engagementScore;
          const activityB = b.node.metrics.engagementScore;
          return activityB - activityA;
        });
      default:
        return results;
    }
  }

  private calculateRelevance(node: TraversalNode): number {
    let relevance = node.weight;

    // Boost for high engagement
    relevance += (node.node.metrics.engagementScore / 100) * 0.3;

    // Boost for high influence
    relevance += (node.node.metrics.influenceScore / 100) * 0.2;

    // Boost for recent activity
    const daysSinceActivity = (Date.now() - node.node.lastActivity.getTime()) / (1000 * 60 * 60 * 24);
    const activityBoost = Math.max(0, 1 - (daysSinceActivity / 30)) * 0.2;
    relevance += activityBoost;

    // Boost for mutual connections
    const mutualBoost = Math.min(node.node.connections.mutualConnections * 0.05, 0.3);
    relevance += mutualBoost;

    return Math.min(Math.max(relevance, 0), 1);
  }

  private estimateMemoryUsage(): number {
    const nodeSize = 1024; // Approximate size of a node in bytes
    const relationshipSize = 512; // Approximate size of a relationship in bytes
    
    const totalNodes = this.visitedNodes.size;
    const totalRelationships = this.metrics.relationshipsTraversed;
    
    return (totalNodes * nodeSize) + (totalRelationships * relationshipSize);
  }

  private reset(): void {
    this.visitedNodes.clear();
    this.traversalQueue = [];
    this.results = [];
    this.metrics = {
      nodesVisited: 0,
      relationshipsTraversed: 0,
      cacheHits: 0,
      traversalTime: 0,
      memoryUsage: 0,
      depthReached: 0
    };
    this.startTime = Date.now();
  }
}

// Utility functions for graph analysis
export const findShortestPath = async (
  startNodeId: string,
  endNodeId: string,
  maxDepth: number,
  getNode: (nodeId: string) => Promise<SocialGraphNode | null>,
  getRelationships: (nodeId: string, types?: RelationshipType[]) => Promise<SocialRelationship[]>
): Promise<GraphTraversalResult | null> => {
  const engine = new GraphTraversalEngine();
  
  const result = await engine.traverseGraph(
    startNodeId,
    {
      maxDepth,
      relationshipTypes: ['follow', 'university_connection', 'mutual_connection'],
      filters: {
        excludeBlocked: true,
        includeMutual: true
      },
      sortBy: 'distance',
      limit: 1
    },
    getNode,
    getRelationships
  );

  // Check if end node was found
  const endNode = result.nodes.find(node => node.id === endNodeId);
  if (!endNode) {
    return null;
  }

  return result;
};

export const findMutualConnections = async (
  userId1: string,
  userId2: string,
  maxDepth: number,
  getNode: (nodeId: string) => Promise<SocialGraphNode | null>,
  getRelationships: (nodeId: string, types?: RelationshipType[]) => Promise<SocialRelationship[]>
): Promise<SocialGraphNode[]> => {
  const engine = new GraphTraversalEngine();
  
  const result = await engine.traverseGraph(
    userId1,
    {
      maxDepth,
      relationshipTypes: ['follow', 'university_connection'],
      filters: {
        excludeBlocked: true,
        includeMutual: true
      },
      sortBy: 'relevance',
      limit: 100
    },
    getNode,
    getRelationships
  );

  // Find nodes that are also connected to userId2
  const mutualConnections: SocialGraphNode[] = [];
  
  for (const node of result.nodes) {
    const relationships = await getRelationships(node.id, ['follow']);
    const isConnectedToUser2 = relationships.some(rel => 
      rel.followingId === userId2 || rel.followerId === userId2
    );
    
    if (isConnectedToUser2) {
      mutualConnections.push(node);
    }
  }

  return mutualConnections;
};

export const calculateNetworkDensity = (
  nodes: SocialGraphNode[],
  relationships: SocialRelationship[]
): number => {
  const nodeCount = nodes.length;
  if (nodeCount < 2) {
    return 0;
  }

  const maxPossibleConnections = (nodeCount * (nodeCount - 1)) / 2;
  const actualConnections = relationships.length;
  
  return actualConnections / maxPossibleConnections;
};

export const calculateClusteringCoefficient = (
  nodeId: string,
  relationships: SocialRelationship[]
): number => {
  // Get all relationships for this node
  const nodeRelationships = relationships.filter(rel => 
    rel.followerId === nodeId || rel.followingId === nodeId
  );

  // Get connected nodes
  const connectedNodes = new Set<string>();
  nodeRelationships.forEach(rel => {
    if (rel.followerId === nodeId) {
      connectedNodes.add(rel.followingId);
    } else {
      connectedNodes.add(rel.followerId);
    }
  });

  const neighborCount = connectedNodes.size;
  if (neighborCount < 2) {
    return 0;
  }

  // Count connections between neighbors
  let neighborConnections = 0;
  const neighborArray = Array.from(connectedNodes);
  
  for (let i = 0; i < neighborArray.length; i++) {
    for (let j = i + 1; j < neighborArray.length; j++) {
      const hasConnection = relationships.some(rel => 
        (rel.followerId === neighborArray[i] && rel.followingId === neighborArray[j]) ||
        (rel.followerId === neighborArray[j] && rel.followingId === neighborArray[i])
      );
      
      if (hasConnection) {
        neighborConnections++;
      }
    }
  }

  const maxPossibleNeighborConnections = (neighborCount * (neighborCount - 1)) / 2;
  return neighborConnections / maxPossibleNeighborConnections;
};

export const findInfluentialNodes = (
  nodes: SocialGraphNode[],
  relationships: SocialRelationship[],
  limit: number = 10
): SocialGraphNode[] => {
  // Calculate influence score for each node
  const nodeInfluence = new Map<string, number>();
  
  nodes.forEach(node => {
    let influence = 0;
    
    // Base influence from followers
    influence += node.connections.followers * 1.0;
    
    // Boost from high-engagement followers
    const followerRelationships = relationships.filter(rel => rel.followingId === node.id);
    followerRelationships.forEach(rel => {
      const followerNode = nodes.find(n => n.id === rel.followerId);
      if (followerNode) {
        influence += followerNode.metrics.engagementScore * 0.1;
      }
    });
    
    // Boost from mutual connections
    influence += node.connections.mutualConnections * 0.5;
    
    // Boost from university connections
    influence += node.connections.universityConnections * 0.3;
    
    nodeInfluence.set(node.id, influence);
  });

  // Sort by influence and return top nodes
  return nodes
    .sort((a, b) => (nodeInfluence.get(b.id) || 0) - (nodeInfluence.get(a.id) || 0))
    .slice(0, limit);
};

export const detectCommunities = (
  nodes: SocialGraphNode[],
  relationships: SocialRelationship[]
): Map<string, string[]> => {
  const communities = new Map<string, string[]>();
  const visited = new Set<string>();
  
  nodes.forEach(node => {
    if (visited.has(node.id)) {
      return;
    }
    
    const community: string[] = [];
    const queue = [node.id];
    
    while (queue.length > 0) {
      const currentNodeId = queue.shift()!;
      
      if (visited.has(currentNodeId)) {
        continue;
      }
      
      visited.add(currentNodeId);
      community.push(currentNodeId);
      
      // Find connected nodes
      const connectedNodes = relationships
        .filter(rel => 
          (rel.followerId === currentNodeId || rel.followingId === currentNodeId) &&
          rel.status === 'active'
        )
        .map(rel => rel.followerId === currentNodeId ? rel.followingId : rel.followerId)
        .filter(id => !visited.has(id));
      
      queue.push(...connectedNodes);
    }
    
    if (community.length > 1) {
      communities.set(`community_${community[0]}`, community);
    }
  });
  
  return communities;
};

export const calculateNetworkMetrics = (
  nodes: SocialGraphNode[],
  relationships: SocialRelationship[]
): {
  nodeCount: number;
  relationshipCount: number;
  density: number;
  averageDegree: number;
  averagePathLength: number;
  clusteringCoefficient: number;
  connectedComponents: number;
} => {
  const nodeCount = nodes.length;
  const relationshipCount = relationships.length;
  
  // Calculate density
  const density = calculateNetworkDensity(nodes, relationships);
  
  // Calculate average degree
  const totalDegree = relationships.length * 2; // Each relationship contributes to 2 nodes
  const averageDegree = nodeCount > 0 ? totalDegree / nodeCount : 0;
  
  // Calculate average path length (simplified)
  const averagePathLength = calculateAveragePathLength(nodes, relationships);
  
  // Calculate average clustering coefficient
  const clusteringCoefficients = nodes.map(node => 
    calculateClusteringCoefficient(node.id, relationships)
  );
  const clusteringCoefficient = clusteringCoefficients.length > 0 
    ? clusteringCoefficients.reduce((sum, coeff) => sum + coeff, 0) / clusteringCoefficients.length
    : 0;
  
  // Count connected components
  const communities = detectCommunities(nodes, relationships);
  const connectedComponents = communities.size;
  
  return {
    nodeCount,
    relationshipCount,
    density,
    averageDegree,
    averagePathLength,
    clusteringCoefficient,
    connectedComponents
  };
};

const calculateAveragePathLength = (
  nodes: SocialGraphNode[],
  relationships: SocialRelationship[]
): number => {
  // Simplified calculation - in practice, you'd use more sophisticated algorithms
  // like Floyd-Warshall or Dijkstra's algorithm
  let totalPathLength = 0;
  let pathCount = 0;
  
  // Sample a subset of nodes for performance
  const sampleSize = Math.min(100, nodes.length);
  const sampleNodes = nodes.slice(0, sampleSize);
  
  for (let i = 0; i < sampleNodes.length; i++) {
    for (let j = i + 1; j < sampleNodes.length; j++) {
      const pathLength = findPathLength(sampleNodes[i].id, sampleNodes[j].id, relationships);
      if (pathLength > 0) {
        totalPathLength += pathLength;
        pathCount++;
      }
    }
  }
  
  return pathCount > 0 ? totalPathLength / pathCount : 0;
};

const findPathLength = (
  startId: string,
  endId: string,
  relationships: SocialRelationship[]
): number => {
  const queue = [{ id: startId, distance: 0 }];
  const visited = new Set<string>();
  
  while (queue.length > 0) {
    const { id, distance } = queue.shift()!;
    
    if (id === endId) {
      return distance;
    }
    
    if (visited.has(id)) {
      continue;
    }
    
    visited.add(id);
    
    // Find connected nodes
    const connectedNodes = relationships
      .filter(rel => 
        (rel.followerId === id || rel.followingId === id) &&
        rel.status === 'active'
      )
      .map(rel => rel.followerId === id ? rel.followingId : rel.followerId)
      .filter(connectedId => !visited.has(connectedId));
    
    connectedNodes.forEach(connectedId => {
      queue.push({ id: connectedId, distance: distance + 1 });
    });
  }
  
  return -1; // No path found
};
