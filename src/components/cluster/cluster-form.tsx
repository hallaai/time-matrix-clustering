"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ClusterFormSchema, type ClusterFormValues } from '@/lib/schemas';
import type { ClusteringResult } from '@/types';
import { runClusteringAlgorithm } from '@/lib/actions';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";


interface ClusterFormProps {
  onProcessing: (isProcessing: boolean) => void;
  onResults: (results: ClusteringResult | null) => void;
}

export function ClusterForm({ onProcessing, onResults }: ClusterFormProps) {
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
      // RHF will handle the FileList for the schema
    } else {
      setFileName(null);
    }
  };

  async function onSubmit(values: ClusterFormValues) {
    onProcessing(true);
    onResults(null);

    const file = values.distanceMatrixFile[0];
    if (!file) {
      toast({
        title: "Error",
        description: "No file selected.",
        variant: "destructive",
      });
      onProcessing(false);
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const fileContent = e.target?.result as string;
        const result = await runClusteringAlgorithm(fileContent, {
          minClusters: values.minClusters,
          maxClusters: values.maxClusters,
          minClusterSize: values.minClusterSize,
        });
        onResults(result);
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
            variant: "default", // Use default for warnings, or a custom one
            duration: 9000,
          });
        }
      } catch (error) {
        console.error("Error processing or calling API:", error);
        onResults({ error: 'An unexpected error occurred. Check console for details.' });
        toast({
          title: "Processing Error",
          description: "An unexpected error occurred while processing your request.",
          variant: "destructive",
        });
      } finally {
        onProcessing(false);
      }
    };
    reader.onerror = () => {
      onResults({ error: 'Failed to read the uploaded file.' });
      toast({
        title: "File Read Error",
        description: "Failed to read the uploaded file.",
        variant: "destructive",
      });
      onProcessing(false);
    };
    reader.readAsText(file);
  }

  return (
    <Card className="w-full max-w-lg shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Configure Clustering</CardTitle>
        <CardDescription>Upload your distance matrix (JSON) and set parameters.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
            
            <Button 
              type="submit" 
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
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
