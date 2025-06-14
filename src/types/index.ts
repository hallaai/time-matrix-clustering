
export interface DistanceEntry {
  from: number;
  to: number;
  distance: number;
}

export type DistanceMatrix = DistanceEntry[];

export interface Cluster {
  id: number;
  members: number[];
}

export interface ClusteringParams {
  minClusters: number;
  maxClusters: number;
  minClusterSize: number;
}

export interface ClusteringRequestData extends ClusteringParams {
  distanceMatrix: DistanceMatrix;
}

export interface ClusterMetric {
  k: number;
  totalIntraClusterDistance: number;
  numberOfValidClusters: number;
}

export interface ClusteringResult {
  chosenClusters?: Cluster[];
  chosenK?: number;
  allMetrics?: ClusterMetric[];
  warning?: string;
  error?: string; // For critical API call errors
}

export interface LocationEntry {
  name: string;
  lat: number;
  lon: number;
  point: number;
}

export type LocationData = LocationEntry[];
