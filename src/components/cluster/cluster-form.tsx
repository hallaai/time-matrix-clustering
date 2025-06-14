
"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ClusterFormSchema, type ClusterFormValues, LocationsFileSchema } from '@/lib/schemas';
import type { ClusteringResult, LocationData } from '@/types';
import type { ProcessingStatus } from '@/app/page';
import { runClusteringAlgorithm } from '@/lib/actions';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';


interface ClusterFormProps {
  onResultsChange: (results: ClusteringResult | null) => void;
  onProcessingStatusChange: (status: ProcessingStatus) => void;
  currentProcessingStatus: ProcessingStatus;
  onLocationDataChange: (data: LocationData | null, error?: string) => void;
}

export function ClusterForm({ onResultsChange, onProcessingStatusChange, currentProcessingStatus, onLocationDataChange }: ClusterFormProps) {
  const [distanceMatrixFileName, setDistanceMatrixFileName] = useState<string | null>(null);
  const [locationsFileName, setLocationsFileName] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<ClusterFormValues>({
    resolver: zodResolver(ClusterFormSchema),
    defaultValues: {
      minClusters: 2,
      maxClusters: 5,
      minClusterSize: 2,
    },
  });

  const handleDistanceMatrixFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setDistanceMatrixFileName(file.name);
    } else {
      setDistanceMatrixFileName(null);
    }
  };
  
  const handleLocationsFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLocationsFileName(file.name); // Set name immediately for visual feedback
      onProcessingStatusChange('reading_file'); // Indicate processing starts
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const fileContent = e.target?.result as string;
          const parsedLocations = JSON.parse(fileContent);
          const validationResult = LocationsFileSchema.safeParse(parsedLocations);
          if (!validationResult.success) {
            const errorDetail = validationResult.error.flatten().fieldErrors;
            let errorMsg = "Invalid locations file format. ";
            // Try to make error message more specific
            if (errorDetail && Object.keys(errorDetail).length > 0) {
                 const firstErrorField = Object.keys(errorDetail)[0];
                 const firstErrorMessage = (errorDetail as any)[firstErrorField]?.[0] || "Check structure and data types (name: string, lat/lon: number, point: integer).";
                 errorMsg += `Error with field '${firstErrorField}': ${firstErrorMessage}`;
            } else {
                 errorMsg += "Check structure and data types (e.g. name: string, lat/lon: number, point: integer). Ensure all fields are present for each entry.";
            }

            toast({ title: "Locations File Error", description: errorMsg, variant: "destructive", duration: 9000 });
            onLocationDataChange(null, errorMsg);
            form.setError("locationsFile", { type: "manual", message: "Invalid locations file. See toast for details."});
            setLocationsFileName(`Error: ${file.name}`); // Update filename to show error
          } else {
            onLocationDataChange(validationResult.data, undefined); // Pass undefined for error if successful
            toast({ title: "Locations File Loaded", description: `${file.name} processed successfully. Contains ${validationResult.data.length} locations.`, variant: "default" });
            setLocationsFileName(file.name); // Confirm successful load with original name
          }
        } catch (err) {
          const errorMsg = "Failed to parse locations JSON. Ensure it's valid JSON.";
          toast({ title: "Locations File Error", description: errorMsg, variant: "destructive" });
          onLocationDataChange(null, errorMsg);
          form.setError("locationsFile", { type: "manual", message: errorMsg});
          setLocationsFileName(`Error: ${file.name}`);
        } finally {
            onProcessingStatusChange('idle'); // Processing finished for this file
        }
      };
      reader.onerror = () => {
        const errorMsg = "Failed to read the locations file.";
        toast({ title: "Locations File Error", description: errorMsg, variant: "destructive" });
        onLocationDataChange(null, errorMsg);
        form.setError("locationsFile", { type: "manual", message: errorMsg});
        setLocationsFileName(`Error: ${file.name}`);
        onProcessingStatusChange('idle');
      };
      reader.readAsText(file);
    } else {
      setLocationsFileName(null);
      onLocationDataChange(null); // Clear data if file is removed
      form.clearErrors("locationsFile"); // Clear error if file is removed
    }
  };


  async function onSubmit(values: ClusterFormValues) {
    onProcessingStatusChange('reading_file');
    onResultsChange(null); 

    const file = values.distanceMatrixFile[0];
    if (!file) {
      toast({
        title: "Error",
        description: "No distance matrix file selected.",
        variant: "destructive",
      });
      onProcessingStatusChange('idle');
      return;
    }

    // Ensure locationsFile is also processed if present and not yet done (or had error)
    // This primarily handles case where user selects location file then immediately hits submit
    // without blurring focus from the location file input (which triggers handleLocationsFileChange)
    if (values.locationsFile && values.locationsFile[0] && (!locationsFileName || locationsFileName.startsWith("Error:"))) {
        const locFile = values.locationsFile[0];
        // Create a new event object to pass to handleLocationsFileChange
        const mockEvent = { target: { files: [locFile] } } as unknown as React.ChangeEvent<HTMLInputElement>;
        handleLocationsFileChange(mockEvent); // Manually trigger processing
        // Since handleLocationsFileChange is async (due to FileReader), we might need to wait or adjust logic
        // For now, assume it sets error/data correctly. The main form submission will proceed.
        // User will see toast for location file errors if any.
    }


    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const fileContent = e.target?.result as string;
        onProcessingStatusChange('clustering'); 
        const result = await runClusteringAlgorithm(fileContent, {
          minClusters: values.minClusters,
          maxClusters: values.maxClusters,
          minClusterSize: values.minClusterSize,
        });
        onResultsChange(result);
        if (result.error) {
          toast({
            title: "Clustering Error",
            description: result.error,
            variant: "destructive",
            duration: 9000,
          });
        } else if (result.warning) {
           toast({
            title: "Clustering Warning",
            description: result.warning,
            variant: "default", // Warnings are not necessarily errors
            duration: 9000,
          });
        } else if (result.chosenClusters && result.chosenClusters.length > 0) {
            toast({
                title: "Clustering Successful",
                description: `Found optimal solution with ${result.chosenK} clusters.`,
                variant: "default"
            });
        } else {
             toast({
                title: "Clustering Note",
                description: "Process completed, but no clusters were formed satisfying all criteria.",
                variant: "default",
                duration: 7000
            });
        }

      } catch (error) {
        console.error("Error processing or calling API:", error);
        onResultsChange({ error: 'An unexpected error occurred. Check console for details.' });
        toast({
          title: "Processing Error",
          description: "An unexpected error occurred while processing your request.",
          variant: "destructive",
        });
      } finally {
        onProcessingStatusChange('idle');
      }
    };
    reader.onerror = () => {
      onResultsChange({ error: 'Failed to read the uploaded distance matrix file.' });
      toast({
        title: "File Read Error",
        description: "Failed to read the uploaded distance matrix file.",
        variant: "destructive",
      });
      onProcessingStatusChange('idle');
    };
    reader.readAsText(file);
  }
  
  const isFormEffectivelyDisabled = currentProcessingStatus !== 'idle';

  return (
    <Card className={cn("w-full max-w-lg shadow-lg", { 'opacity-70 pointer-events-none': isFormEffectivelyDisabled })}>
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Configure Clustering</CardTitle>
        <CardDescription>Upload data files (JSON) and set parameters.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <fieldset disabled={isFormEffectivelyDisabled} className="space-y-6">
              <FormField
                control={form.control}
                name="distanceMatrixFile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="distanceMatrixFile">Distance Matrix File (.json)</FormLabel>
                    <FormControl>
                      <Input
                        id="distanceMatrixFile"
                        type="file"
                        accept=".json"
                        onChange={(e) => {
                          field.onChange(e.target.files);
                          handleDistanceMatrixFileChange(e);
                        }}
                        className="text-foreground"
                      />
                    </FormControl>
                    {distanceMatrixFileName && <p className="text-sm text-muted-foreground mt-1">Selected: {distanceMatrixFileName}</p>}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="locationsFile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="locationsFile">Locations File (.json) (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        id="locationsFile"
                        type="file"
                        accept=".json"
                        onChange={(e) => {
                          field.onChange(e.target.files);
                          handleLocationsFileChange(e);
                        }}
                        className="text-foreground"
                      />
                    </FormControl>
                    {locationsFileName && <p className={cn("text-sm mt-1", locationsFileName.startsWith("Error:") ? "text-destructive font-medium" : "text-muted-foreground")}>Selected: {locationsFileName}</p>}
                    <FormMessage />
                  </FormItem>
                )}
              />


              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="minClusters"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="minClusters">Min Clusters</FormLabel>
                      <FormControl>
                        <Input id="minClusters" type="number" placeholder="e.g., 2" {...field} className="text-foreground"/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="maxClusters"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="maxClusters">Max Clusters</FormLabel>
                      <FormControl>
                        <Input id="maxClusters" type="number" placeholder="e.g., 10" {...field} className="text-foreground"/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="minClusterSize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="minClusterSize">Min Size/Cluster</FormLabel>
                      <FormControl>
                        <Input id="minClusterSize" type="number" placeholder="e.g., 3" {...field} className="text-foreground"/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </fieldset>
            
            <Button 
              type="submit" 
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
              disabled={isFormEffectivelyDisabled || form.formState.isSubmitting}
            >
              {currentProcessingStatus === 'reading_file' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Preparing Files...
                </>
              ) : currentProcessingStatus === 'clustering' ? (
                 <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing Clusters...
                </>
              ) : (
                "Run Clustering"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
