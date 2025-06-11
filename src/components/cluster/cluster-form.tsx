
"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ClusterFormSchema, type ClusterFormValues } from '@/lib/schemas';
import type { ClusteringResult } from '@/types';
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
}

export function ClusterForm({ onResultsChange, onProcessingStatusChange, currentProcessingStatus }: ClusterFormProps) {
  const [fileName, setFileName] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<ClusterFormValues>({
    resolver: zodResolver(ClusterFormSchema),
    defaultValues: {
      minClusters: 2,
      maxClusters: 5,
      minClusterSize: 2,
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
    } else {
      setFileName(null);
    }
  };

  async function onSubmit(values: ClusterFormValues) {
    onProcessingStatusChange('reading_file');
    onResultsChange(null); 

    const file = values.distanceMatrixFile[0];
    if (!file) {
      toast({
        title: "Error",
        description: "No file selected.",
        variant: "destructive",
      });
      onProcessingStatusChange('idle');
      return;
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
          });
        } else if (result.warning) {
           toast({
            title: "Clustering Warning",
            description: result.warning,
            variant: "default",
            duration: 9000,
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
      onResultsChange({ error: 'Failed to read the uploaded file.' });
      toast({
        title: "File Read Error",
        description: "Failed to read the uploaded file.",
        variant: "destructive",
      });
      onProcessingStatusChange('idle');
    };
    reader.readAsText(file);
  }
  
  const isFormEffectivelyDisabled = currentProcessingStatus !== 'idle';

  return (
    <Card className={cn("w-full max-w-lg shadow-lg", { 'opacity-70': isFormEffectivelyDisabled })}>
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Configure Clustering</CardTitle>
        <CardDescription>Upload your distance matrix (JSON) and set parameters.</CardDescription>
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
                          handleFileChange(e);
                        }}
                        className="text-foreground"
                      />
                    </FormControl>
                    {fileName && <p className="text-sm text-muted-foreground mt-1">Selected: {fileName}</p>}
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
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {currentProcessingStatus === 'reading_file' ? 'Preparing File...' : 'Analyzing Clusters...'}
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
