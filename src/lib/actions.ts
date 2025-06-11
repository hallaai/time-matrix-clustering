
"use server";

import type { DistanceMatrix, ClusteringParams, ClusteringResult } from '@/types';
import { DistanceMatrixSchema } from '@/lib/schemas';

// Simulate API delay
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to shuffle an array (Fisher-Yates shuffle)
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array]; // Create a copy to avoid mutating the original
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export async function runClusteringAlgorithm(
  distanceMatrixString: string,
  params: ClusteringParams
): Promise<ClusteringResult> {
  await sleep(1500); // Simulate network latency / processing time

  // This is a placeholder/simulated clustering algorithm for demonstration purposes.
  // It shuffles nodes and then distributes them into clusters based on the given parameters 
  // but does not perform actual distance-based clustering (e.g., k-means, hierarchical).
  // For a real-world application, a proper clustering library or a more sophisticated algorithm 
  // that uses the distance matrix effectively would be necessary.

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

  if (uniqueNodesCount === 0) {
    return { warning: "No unique data points found in the distance matrix." };
  }

  if (uniqueNodesCount < params.minClusters * params.minClusterSize && uniqueNodesCount > 0) {
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

  const numClustersToGenerate = Math.min(params.maxClusters, Math.max(params.minClusters, Math.floor(uniqueNodesCount / params.minClusterSize) || 1 ));
  
  const nodesArray = Array.from(allNodes);
  const shuffledNodes = shuffleArray(nodesArray); // Shuffle nodes before assignment
  let remainingNodes = [...shuffledNodes];

  const generatedClusters: ClusteringResult['clusters'] = [];

  for (let i = 0; i < numClustersToGenerate; i++) {
    if(remainingNodes.length === 0) break;
    
    // Calculate an ideal size, but ensure it meets minClusterSize if possible
    let idealSizePerCluster = Math.ceil(remainingNodes.length / (numClustersToGenerate - i));
    let clusterSize = Math.max(params.minClusterSize, idealSizePerCluster);
    
    // Ensure we don't try to take more nodes than available or leave too few for remaining clusters
    if (remainingNodes.length < clusterSize) {
      clusterSize = remainingNodes.length; // Take all remaining if less than calculated size
    } else {
       // Check if taking clusterSize leaves enough for other clusters to meet minClusterSize
       const nodesAfterThisCluster = remainingNodes.length - clusterSize;
       const remainingClustersToForm = (numClustersToGenerate - (i + 1));
       if (remainingClustersToForm > 0 && nodesAfterThisCluster < remainingClustersToForm * params.minClusterSize) {
           // Adjust clusterSize to leave enough for future clusters
           clusterSize = Math.max(params.minClusterSize, remainingNodes.length - (remainingClustersToForm * params.minClusterSize));
           // ensure clusterSize is not negative or zero if remainingNodes.length is small
           clusterSize = Math.max(params.minClusterSize, clusterSize > 0 ? clusterSize : params.minClusterSize); 
           clusterSize = Math.min(remainingNodes.length, clusterSize); // Don't take more than available
       }
    }


    const members = remainingNodes.splice(0, clusterSize);

    if (members.length >= params.minClusterSize) {
       generatedClusters.push({ id: i + 1, members });
    } else if (members.length > 0) { 
      // If members were taken but less than minClusterSize (e.g., at the end)
      // and if there are already formed clusters, add to the last one.
      if (generatedClusters.length > 0) {
        generatedClusters[generatedClusters.length-1].members.push(...members);
      } else {
        // Not enough to form even one cluster of minClusterSize
        // This case should ideally be caught by earlier checks or result in a warning if no clusters are formed.
        // For safety, add them back to remainingNodes to be handled by post-loop logic.
        remainingNodes.push(...members); 
        break; 
      }
    }
  }
  
  // Handle any leftover nodes after the loop (e.g. if numClustersToGenerate was too low)
  if (remainingNodes.length > 0 && generatedClusters.length > 0) {
      // Distribute remaining nodes among existing clusters if possible, or add to the last one.
      // This is a simple strategy; a real algorithm would be more nuanced.
      generatedClusters[generatedClusters.length - 1].members.push(...remainingNodes);
      remainingNodes = []; // Clear remainingNodes
  }


  if (generatedClusters.length === 0 && uniqueNodesCount > 0) {
    return {
      warning: `Could not form any clusters satisfying the minimum size of ${params.minClusterSize} from ${uniqueNodesCount} unique data points using the current parameters.
      Suggestions:
      - Reduce the minimum cluster size.
      - Reduce the minimum number of clusters if it's too high for the data.
      - Ensure your data is interconnected enough to form clusters.`
    };
  }
  
  if (generatedClusters.length > 0 && generatedClusters.length < params.minClusters) {
     return { 
       warning: `Could only form ${generatedClusters.length} clusters satisfying the minimum size. This is less than the desired minimum of ${params.minClusters} clusters.
       Suggestions:
       - Reduce the minimum cluster size.
       - Reduce the minimum number of clusters required.
       - The data might be too sparse or small for the given constraints.`
     };
  }

  // Final check if any formed cluster is below minClusterSize (can happen due to leftover distribution)
  // This is mostly a safeguard for the simulation.
  const validClusters = generatedClusters.filter(c => c.members.length >= params.minClusterSize);
  if (validClusters.length !== generatedClusters.length && validClusters.length === 0 && uniqueNodesCount > 0) {
     return {
      warning: `No clusters could be formed that meet the minimum size of ${params.minClusterSize} after attempting to distribute all points. Please check parameters or data.`
    };
  }


  return {
    clusters: validClusters.length > 0 ? validClusters : (generatedClusters.length > 0 ? generatedClusters : []), // Return validClusters if any, else generated (which might be empty or have small clusters)
    // Add a general warning if validClusters is empty but generatedClusters was not, and it was expected to form clusters.
    warning: (validClusters.length === 0 && generatedClusters.length > 0 && params.minClusters > 0) 
             ? `Formed ${generatedClusters.length} initial groups, but none met the final minimum size criteria of ${params.minClusterSize}. Consider adjusting parameters.` 
             : undefined
  };
}
