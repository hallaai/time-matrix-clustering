
import { z } from "zod";

export const ClusterFormSchema = z.object({
  distanceMatrixFile: z.custom<FileList>((val) => val instanceof FileList && val.length > 0, "Please upload a Distance Matrix JSON file."),
  locationsFile: z.custom<FileList>((val) => val instanceof FileList && val.length > 0, "Please upload a Locations JSON file.").optional(),
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

export const LocationEntrySchema = z.object({
  name: z.string(),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  point: z.number().int(),
});

export const LocationsFileSchema = z.array(LocationEntrySchema);
