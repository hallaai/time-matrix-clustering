
"use server";

import type { DistanceMatrix, ClusteringParams, ClusteringResult, Cluster, ClusterMetric } from '@/types';
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

// K-Medoids simulation for a specific k
async function runKMedoidsSimulation(
    targetK: number,
    uniqueNodes: number[],
    distanceMap: Map<number, Map<number, number>>,
    minClusterSize: number
): Promise<{ clusters: Cluster[], totalIntraClusterDistance: number }> {
    if (targetK <= 0 || targetK > uniqueNodes.length) {
        return { clusters: [], totalIntraClusterDistance: Infinity };
    }

    const maxIterations = 10;
    let currentMedoids = shuffleArray([...uniqueNodes]).slice(0, targetK);
    
    if (currentMedoids.length < targetK) {
         // Not enough unique nodes to form targetK medoids (should be caught before calling, but safeguard)
        return { clusters: [], totalIntraClusterDistance: Infinity };
    }

    let previousMedoidsJSON = "";

    for (let iter = 0; iter < maxIterations; iter++) {
        const currentClustersMap = new Map<number, number[]>(); // medoidId -> list of memberIds
        currentMedoids.forEach(m => currentClustersMap.set(m, []));

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
                currentClustersMap.get(closestMedoid)!.push(node);
            }
        }

        // Update step
        const newMedoids: number[] = [];
        for (const medoid of currentMedoids) {
            const members = currentClustersMap.get(medoid) || [];
            if (members.length === 0) { // This medoid lost all members
                // Re-initialize this medoid from a random member if possible or keep it
                const randomMemberForLostMedoid = uniqueNodes[Math.floor(Math.random() * uniqueNodes.length)];
                newMedoids.push(randomMemberForLostMedoid); 
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
        }
        
        currentMedoids = [...new Set(newMedoids)]; // Ensure unique medoids
        
        // Refill if medoids count dropped below targetK
        if (currentMedoids.length < targetK) {
            const existingMedoidsSet = new Set(currentMedoids);
            const availableNodesForRefill = uniqueNodes.filter(n => !existingMedoidsSet.has(n));
            const shuffledAvailable = shuffleArray(availableNodesForRefill);
            let needed = targetK - currentMedoids.length;
            for(let i=0; i < needed && i < shuffledAvailable.length; i++){
                currentMedoids.push(shuffledAvailable[i]);
            }
        }
        if (currentMedoids.length < targetK) { // Still not enough, abort for this k
             return { clusters: [], totalIntraClusterDistance: Infinity };
        }
        
        const sortedMedoidsJSON = JSON.stringify([...currentMedoids].sort((a,b)=>a-b));
        if (previousMedoidsJSON === sortedMedoidsJSON) {
          break; // Converged
        }
        previousMedoidsJSON = sortedMedoidsJSON;
    }

    // Final assignment and calculation
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
    
    const formedClusters: Cluster[] = [];
    let clusterIdCounter = 1;
    let totalIntraClusterDistance = 0;

    for (const medoid of currentMedoids) {
        const members = finalClusterMap.get(medoid) || [];
        if (members.length >= minClusterSize) {
            formedClusters.push({ id: clusterIdCounter++, members: members.sort((a, b) => a - b) });
            // Calculate intra-cluster distance for this valid cluster
            for (const member of members) {
                if (member !== medoid) { // Distance from medoid to itself is 0
                    totalIntraClusterDistance += getDistance(medoid, member, distanceMap);
                }
            }
        }
    }
    
    // If no valid clusters were formed that meet minClusterSize, distance is effectively Infinity
    if (formedClusters.length === 0 && targetK > 0) {
        return { clusters: [], totalIntraClusterDistance: Infinity };
    }

    return { clusters: formedClusters.sort((a,b) => a.id - b.id), totalIntraClusterDistance };
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
  
  const baseParamWarnings = validateBaseParams(params);
  if (baseParamWarnings) return { warning: baseParamWarnings };

  const allNodesSet = new Set<number>();
  parsedMatrix.forEach(entry => {
    allNodesSet.add(entry.from);
    allNodesSet.add(entry.to);
  });
  const uniqueNodes = Array.from(allNodesSet);
  const uniqueNodesCount = uniqueNodes.length;

  const nodeCountWarnings = validateNodeCounts(uniqueNodesCount, params);
  if (nodeCountWarnings) return { warning: nodeCountWarnings};
  
  const distanceMap = buildDistanceMap(parsedMatrix, allNodesSet);
  
  const allMetrics: ClusterMetric[] = [];
  let bestK = -1;
  let minTotalIntraClusterDistance = Infinity;
  let bestClusters: Cluster[] = [];
  let overallWarning: string | undefined = undefined;

  for (let k = params.minClusters; k <= params.maxClusters; k++) {
    if (k > uniqueNodesCount) {
        allMetrics.push({ k, totalIntraClusterDistance: Infinity, numberOfValidClusters: 0 });
        continue; // Cannot form k clusters if k > number of unique nodes
    }
    if (k * params.minClusterSize > uniqueNodesCount && k > 0) {
        allMetrics.push({ k, totalIntraClusterDistance: Infinity, numberOfValidClusters: 0 });
        continue; // Not enough nodes for k clusters of minClusterSize
    }

    const resultForK = await runKMedoidsSimulation(k, uniqueNodes, distanceMap, params.minClusterSize);
    allMetrics.push({ 
        k, 
        totalIntraClusterDistance: resultForK.totalIntraClusterDistance,
        numberOfValidClusters: resultForK.clusters.length 
    });

    if (resultForK.clusters.length > 0 && resultForK.totalIntraClusterDistance < minTotalIntraClusterDistance) {
        minTotalIntraClusterDistance = resultForK.totalIntraClusterDistance;
        bestK = k;
        bestClusters = resultForK.clusters;
    }
  }

  if (bestK === -1 && uniqueNodesCount > 0) { // No k yielded valid clusters
    overallWarning = `The algorithm did not form any clusters satisfying the minimum size of ${params.minClusterSize} for any k between ${params.minClusters} and ${params.maxClusters}.
    Suggestions:
    - Reduce minimum cluster size.
    - Data might be too sparse or constraints too strict.`;
    return { allMetrics, warning: overallWarning };
  } else if (bestK !== -1 && bestClusters.length < params.minClusters && params.minClusters > 0) {
     overallWarning = `The best solution found has ${bestClusters.length} clusters (for k=${bestK}), which is less than the desired minimum of ${params.minClusters}.
     Consider adjusting parameters if more clusters are strictly required.`;
  } else if (bestK === -1 && uniqueNodesCount === 0) {
    overallWarning = "No unique data points found in the distance matrix to perform clustering.";
    return { warning: overallWarning };
  }


  return {
    chosenClusters: bestClusters,
    chosenK: bestK,
    allMetrics,
    warning: overallWarning
  };
}


function validateBaseParams(params: ClusteringParams): string | undefined {
  if (params.minClusters <= 0) return "Minimum number of clusters must be positive.";
  if (params.maxClusters <= 0) return "Maximum number of clusters must be positive.";
  if (params.minClusters > params.maxClusters) return "Minimum clusters cannot be greater than maximum clusters.";
  if (params.minClusterSize <= 0) return "Minimum cluster size must be positive.";
  return undefined;
}

function validateNodeCounts(uniqueNodesCount: number, params: ClusteringParams): string | undefined {
  if (uniqueNodesCount === 0) return "No unique data points found in the distance matrix.";
  if (uniqueNodesCount < params.minClusters && params.minClusters > 0) { // Check params.minClusters > 0 to avoid warning if minClusters is 0 or less (already caught by baseParamWarnings)
     return `Cannot form ${params.minClusters} clusters from only ${uniqueNodesCount} unique data points. Reduce min clusters or provide more data.`;
  }
   if (uniqueNodesCount < params.minClusterSize && params.minClusterSize > 0) {
    return `Cannot form clusters of size ${params.minClusterSize} from only ${uniqueNodesCount} data points. Reduce min cluster size or provide more data.`;
  }
  // This check is now implicitly handled by the loop in runClusteringAlgorithm, 
  // but keeping a general warning if initial minClusters * minClusterSize is impossible.
  if (uniqueNodesCount < params.minClusters * params.minClusterSize && params.minClusters > 0 && params.minClusterSize > 0) {
    return `It's likely impossible to form ${params.minClusters} clusters, each with at least ${params.minClusterSize} members, from only ${uniqueNodesCount} unique data points. The algorithm will attempt iterations, but consider adjusting parameters.`;
  }
  return undefined;
}
