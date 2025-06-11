
"use server";

import type { DistanceMatrix, ClusteringParams, ClusteringResult } from '@/types';
import { DistanceMatrixSchema } from '@/lib/schemas';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

function buildDistanceMap(distanceMatrix: DistanceMatrix, allNodes: Set<number>): Map<number, Map<number, number>> {
    const map = new Map<number, Map<number, number>>();
    allNodes.forEach(node1 => {
        map.set(node1, new Map<number, number>());
        allNodes.forEach(node2 => {
            if (node1 === node2) {
                map.get(node1)!.set(node2, 0);
            } else {
                map.get(node1)!.set(node2, Infinity); // Default to Infinity
            }
        });
    });

    for (const entry of distanceMatrix) {
        map.get(entry.from)?.set(entry.to, entry.distance);
        map.get(entry.to)?.set(entry.from, entry.distance); // Assuming symmetric distances
    }
    return map;
}

function getDistance(node1: number, node2: number, distanceMap: Map<number, Map<number, number>>): number {
    return distanceMap.get(node1)?.get(node2) ?? Infinity;
}


export async function runClusteringAlgorithm(
  distanceMatrixString: string,
  params: ClusteringParams
): Promise<ClusteringResult> {
  await sleep(1500); // Simulate network latency / processing time

  let parsedMatrix: DistanceMatrix;
  try {
    const rawParsedData = JSON.parse(distanceMatrixString);
    const validationResult = DistanceMatrixSchema.safeParse(rawParsedData);
    if (!validationResult.success) {
      console.error("Invalid distance matrix format:", validationResult.error.flatten().fieldErrors);
      return { error: "Invalid distance matrix JSON. Each entry must have 'from', 'to', and 'distance' (all numbers)." };
    }
    parsedMatrix = validationResult.data;
  } catch (e) {
    console.error("Failed to parse distance matrix JSON:", e);
    return { error: "Failed to parse distance matrix JSON. Ensure it's valid JSON." };
  }

  if (!parsedMatrix || parsedMatrix.length === 0) {
    return { warning: "No data provided in the distance matrix or the file is empty." };
  }

  if (params.minClusters <= 0) {
    return { warning: "Minimum number of clusters must be positive."};
  }
   if (params.maxClusters <= 0) {
    return { warning: "Maximum number of clusters must be positive."};
  }
  if (params.minClusters > params.maxClusters) {
    return { warning: "Minimum clusters cannot be greater than maximum clusters." };
  }
  if (params.minClusterSize <= 0) {
    return { warning: "Minimum cluster size must be positive." };
  }
  
  const allNodesSet = new Set<number>();
  parsedMatrix.forEach(entry => {
    allNodesSet.add(entry.from);
    allNodesSet.add(entry.to);
  });
  const uniqueNodes = Array.from(allNodesSet);
  const uniqueNodesCount = uniqueNodes.length;

  if (uniqueNodesCount === 0) {
    return { warning: "No unique data points found in the distance matrix." };
  }

  if (uniqueNodesCount < params.minClusters) {
     return { warning: `Cannot form ${params.minClusters} clusters from only ${uniqueNodesCount} unique data points. Reduce min clusters or provide more data.` };
  }
   if (uniqueNodesCount < params.minClusterSize) {
    return { warning: `Cannot form clusters of size ${params.minClusterSize} from only ${uniqueNodesCount} data points. Reduce min cluster size or provide more data.` };
  }

  if (uniqueNodesCount < params.minClusters * params.minClusterSize && params.minClusters > 0) {
    return {
      warning: `It's likely impossible to form ${params.minClusters} clusters, each with at least ${params.minClusterSize} members, from only ${uniqueNodesCount} unique data points.
      Suggestions:
      - Reduce the minimum number of clusters.
      - Reduce the minimum cluster size.`
    };
  }
  
  const distanceMap = buildDistanceMap(parsedMatrix, allNodesSet);
  
  const k = Math.min(params.maxClusters, Math.max(params.minClusters, Math.floor(uniqueNodesCount / params.minClusterSize) || 1));
  if (k <= 0 && uniqueNodesCount > 0) {
     return { warning: `Could not determine a valid number of clusters (k=${k}) based on parameters. Ensure minClusterSize allows for cluster formation.`}
  }
   if (k > uniqueNodesCount) {
    return { warning: `Target number of clusters (k=${k}) is greater than the number of unique nodes (${uniqueNodesCount}). Adjust parameters.`}
  }


  const maxIterations = 10;
  let currentMedoids = shuffleArray([...uniqueNodes]).slice(0, k);
  if (currentMedoids.length < k) {
      return { warning: `Not enough unique nodes (${currentMedoids.length}) to select ${k} initial medoids. Adjust parameters or data.` };
  }

  let currentClusters: Map<number, number[]>; // medoidId -> list of memberIds
  let previousMedoids: number[] = [];

  for (let iter = 0; iter < maxIterations; iter++) {
    currentClusters = new Map();
    currentMedoids.forEach(m => currentClusters.set(m, []));

    // Assignment step
    for (const node of uniqueNodes) {
      let closestMedoid = -1;
      let minDistance = Infinity;
      for (const medoid of currentMedoids) {
        const dist = getDistance(node, medoid, distanceMap);
        if (dist < minDistance) {
          minDistance = dist;
          closestMedoid = medoid;
        }
      }
      if (closestMedoid !== -1) {
        currentClusters.get(closestMedoid)!.push(node);
      }
    }

    // Update step
    const newMedoids: number[] = [];
    let medoidChangedInIteration = false;
    for (const medoid of currentMedoids) {
        const members = currentClusters.get(medoid) || [];
        if (members.length === 0) { // This medoid lost all members
            // Try to re-initialize this medoid or pick a different one if needed
            // For simplicity, we might lose a medoid here if not careful
            // A robust way would be to ensure k medoids are always present
            continue; 
        }

        let bestNewMedoidForCluster = members[0];
        let minSumDist = Infinity;

        for (const potentialMedoid of members) {
            let currentSumDist = 0;
            for (const member of members) {
                currentSumDist += getDistance(potentialMedoid, member, distanceMap);
            }
            if (currentSumDist < minSumDist) {
                minSumDist = currentSumDist;
                bestNewMedoidForCluster = potentialMedoid;
            }
        }
        newMedoids.push(bestNewMedoidForCluster);
        if (bestNewMedoidForCluster !== medoid) {
            medoidChangedInIteration = true;
        }
    }
    
    // Ensure unique medoids; if duplicates, refill strategy might be needed
    currentMedoids = [...new Set(newMedoids)]; 
    // If we have fewer medoids than k due to convergence, refill
    if (currentMedoids.length < k) {
        const existingMedoidsSet = new Set(currentMedoids);
        const availableNodesForRefill = uniqueNodes.filter(n => !existingMedoidsSet.has(n));
        const shuffledAvailable = shuffleArray(availableNodesForRefill);
        let needed = k - currentMedoids.length;
        for(let i=0; i<needed && i < shuffledAvailable.length; i++){
            currentMedoids.push(shuffledAvailable[i]);
        }
    }
     if (currentMedoids.length < k) { // Still not enough medoids (e.g. uniqueNodesCount < k)
         // This situation should be caught earlier, but as a safeguard.
         return { warning: `Could not maintain ${k} distinct medoids during iterations. Current medoids: ${currentMedoids.length}. Adjust parameters.`}
     }


    // Check for convergence (if medoids didn't change and iteration > 0)
    const sortedCurrentMedoids = [...currentMedoids].sort((a,b) => a-b);
    const sortedPreviousMedoids = [...previousMedoids].sort((a,b) => a-b);

    if (iter > 0 && !medoidChangedInIteration && 
        sortedCurrentMedoids.length === sortedPreviousMedoids.length &&
        sortedCurrentMedoids.every((val, index) => val === sortedPreviousMedoids[index])) {
      break; 
    }
    previousMedoids = [...currentMedoids];
  }

  // Final assignment based on final medoids
  const finalClusterMap = new Map<number, number[]>();
  currentMedoids.forEach(m => finalClusterMap.set(m, []));

  for (const node of uniqueNodes) {
    let closestMedoid = -1;
    let minDistance = Infinity;
    for (const medoid of currentMedoids) {
      const dist = getDistance(node, medoid, distanceMap);
      if (dist < minDistance) {
        minDistance = dist;
        closestMedoid = medoid;
      }
    }
    if (closestMedoid !== -1) {
      finalClusterMap.get(closestMedoid)!.push(node);
    }
  }

  let resultClusters: ClusteringResult['clusters'] = [];
  let clusterIdCounter = 1;
  for (const members of finalClusterMap.values()) {
    if (members.length >= params.minClusterSize) {
      resultClusters.push({ id: clusterIdCounter++, members: members.sort((a, b) => a - b) });
    }
  }
  
  // Sort clusters by ID for consistent output order
  resultClusters.sort((a, b) => a.id - b.id);

  if (resultClusters.length === 0 && uniqueNodesCount > 0) {
    return {
      warning: `The algorithm did not form any clusters satisfying the minimum size of ${params.minClusterSize} from ${uniqueNodesCount} unique data points.
      Suggestions:
      - Reduce minimum cluster size.
      - Adjust min/max number of clusters.
      - Data might be too sparse or constraints too strict for this simplified algorithm.`
    };
  }
  
  let warningMessage: string | undefined = undefined;
  if (resultClusters.length > 0 && resultClusters.length < params.minClusters) {
     warningMessage = `Could only form ${resultClusters.length} clusters satisfying the minimum size. This is less than the desired minimum of ${params.minClusters} clusters.
     Suggestions:
     - Reduce minimum cluster size or minimum number of clusters.
     - The data might be too sparse for the given constraints.`;
  }
  
  if (resultClusters.length > params.maxClusters) {
      // This is unlikely if k was capped by maxClusters, but as a safeguard
      resultClusters = resultClusters.slice(0, params.maxClusters);
      const newWarning = `Formed ${resultClusters.length} clusters, but truncated to the maximum allowed ${params.maxClusters}.`;
      warningMessage = warningMessage ? `${warningMessage}\n${newWarning}` : newWarning;
  }

  return {
    clusters: resultClusters,
    warning: warningMessage
  };
}

    