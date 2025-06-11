import { z } from "zod";

export const ClusterFormSchema = z.object({
  distanceMatrixFile: z.custom<FileList>((val) => val instanceof FileList && val.length > 0, "Please upload a JSON file."),
  minClusters: z.coerce.number().int().positive({ message: "Must be a positive integer." }).min(1, "Minimum 1 cluster."),
  maxClusters: z.coerce.number().int().positive({ message: "Must be a positive integer." }).min(1, "Minimum 1 cluster."),
  minClusterSize: z.coerce.number().int().positive({ message: "Must be a positive integer." }).min(1, "Minimum size of 1."),
}).refine(data => data.minClusters <= data.maxClusters, {
  message: "Min clusters cannot exceed max clusters.",
  path: ["maxClusters"],
});

export type ClusterFormValues = z.infer<typeof ClusterFormSchema>;

export const DistanceEntrySchema = z.object({
  from: z.number(),
  to: z.number(),
  distance: z.number(),
});

export const DistanceMatrixSchema = z.array(DistanceEntrySchema);
