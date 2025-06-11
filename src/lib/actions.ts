"use server";

import type { DistanceMatrix, ClusteringParams, ClusteringResult } from '@/types';
import { DistanceMatrixSchema } from '@/lib/schemas';

// Simulate API delay
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function runClusteringAlgorithm(
  distanceMatrixString: string,
  params: ClusteringParams
): Promise<ClusteringResult> {
  await sleep(1500); // Simulate network latency

  let distanceMatrix: DistanceMatrix;
  try {
    const parsedData = JSON.parse(distanceMatrixString);
    const validationResult = DistanceMatrixSchema.safeParse(parsedData);
    if (!validationResult.success) {
      console.error("Invalid distance matrix format:", validationResult.error.flatten().fieldErrors);
      return { error: "Invalid distance matrix JSON format. Each entry must have 'from', 'to', and 'distance' (all numbers)." };
    }
    distanceMatrix = validationResult.data;
  } catch (e) {
    console.error("Failed to parse distance matrix JSON:", e);
    return { error: "Failed to parse distance matrix JSON. Ensure it's valid JSON." };
  }

  if (!distanceMatrix || distanceMatrix.length === 0) {
    return { warning: "No data provided in the distance matrix or the file is empty." };
  }

  // Basic validation based on parameters
  if (params.minClusters > params.maxClusters) {
    return { warning: "Minimum clusters cannot be greater than maximum clusters. Please adjust your parameters." };
  }
  if (params.minClusterSize <= 0) {
    return { warning: "Minimum cluster size must be positive. Please adjust your parameters." };
  }
  
  const allNodes = new Set<number>();
  distanceMatrix.forEach(entry => {
    allNodes.add(entry.from);
    allNodes.add(entry.to);
  });
  const uniqueNodesCount = allNodes.size;

  if (uniqueNodesCount < params.minClusters * params.minClusterSize) {
    return {
      warning: `It might be impossible to form ${params.minClusters} clusters, each with at least ${params.minClusterSize} members, from only ${uniqueNodesCount} unique data points.
      Suggestions:
      - Reduce the minimum number of clusters.
      - Reduce the minimum cluster size.
      - Provide a dataset with more unique points or adjust constraints if points are highly disconnected.`
    };
  }
  
  if (uniqueNodesCount < params.minClusters) {
     return { warning: `Cannot form ${params.minClusters} clusters from only ${uniqueNodesCount} unique data points.` };
  }

  // Simulate a successful response that tries to adhere to some constraints
  // This is a placeholder and not a real clustering algorithm
  const numClustersToGenerate = Math.min(params.maxClusters, Math.max(params.minClusters, Math.floor(uniqueNodesCount / params.minClusterSize) || 1 ));
  
  const nodesArray = Array.from(allNodes);
  const generatedClusters: ClusteringResult['clusters'] = [];
  let SlicedNodes = [...nodesArray];

  for (let i = 0; i < numClustersToGenerate; i++) {
    if(SlicedNodes.length === 0) break;
    const clusterSize = Math.max(params.minClusterSize, Math.ceil(SlicedNodes.length / (numClustersToGenerate - i)));
    const members = SlicedNodes.splice(0, Math.min(clusterSize, SlicedNodes.length));
    if (members.length >= params.minClusterSize) {
       generatedClusters.push({ id: i + 1, members });
    } else if (generatedClusters.length > 0 && SlicedNodes.length === 0) {
      // Add remaining small group to the last cluster if it exists
      generatedClusters[generatedClusters.length-1].members.push(...members);
    } else if (SlicedNodes.length === 0 && members.length > 0){
      // if it's the only cluster and smaller than minClusterSize
       return { 
         warning: `Could not form clusters satisfying all constraints. The remaining ${members.length} points are not enough to form a cluster of size ${params.minClusterSize}. Try adjusting parameters.`
       }
    }
  }
  
  if (generatedClusters.length < params.minClusters && generatedClusters.length > 0) {
     return { 
       warning: `Could only form ${generatedClusters.length} clusters satisfying the minimum size. This is less than the required minimum of ${params.minClusters} clusters.
       Suggestions:
       - Reduce the minimum cluster size.
       - Reduce the minimum number of clusters required.
       - The data might be too sparse or small for the given constraints.`
     };
  }
  
  if(generatedClusters.length === 0 && uniqueNodesCount > 0) {
    return {
      warning: `Could not form any clusters satisfying the minimum size of ${params.minClusterSize} from ${uniqueNodesCount} unique data points.
      Suggestions:
      - Reduce the minimum cluster size.
      - Ensure your data is interconnected enough to form clusters.`
    }
  }


  return {
    clusters: generatedClusters,
  };

  // Example of API error simulation
  // return { error: "The clustering service is currently unavailable (simulated). Please try again later." };
}
