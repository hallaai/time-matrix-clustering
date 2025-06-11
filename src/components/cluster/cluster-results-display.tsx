
"use client";

import type { ClusteringResult } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';

interface ClusterResultsDisplayProps {
  results: ClusteringResult | null;
  isProcessing: boolean; 
}

export function ClusterResultsDisplay({ results, isProcessing }: ClusterResultsDisplayProps) {
  if (isProcessing) {
    return null;
  }

  if (!results) {
    return (
      <Card className="w-full max-w-lg mt-8 shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center text-muted-foreground">
            <Info className="mr-2 h-5 w-5" />
            <p>Upload data and run clustering to see results here.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg mt-8 shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Clustering Output</CardTitle>
        {results.clusters && results.clusters.length > 0 && !results.error && (
            <CardDescription>Clustering process completed.</CardDescription>
        )}
         {results.error && (
            <CardDescription>An error occurred during processing.</CardDescription>
        )}
        {results.warning && !results.error && (
             <CardDescription>Process completed with warnings.</CardDescription>
        )}
         {results.clusters && results.clusters.length === 0 && !results.warning && !results.error && (
            <CardDescription>Process completed, but no clusters were formed.</CardDescription>
        )}

      </CardHeader>
      <CardContent>
        {results.error && (
          <Alert variant="destructive" className="mb-4">
            <XCircle className="h-5 w-5" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{results.error}</AlertDescription>
          </Alert>
        )}
        {results.warning && (
          <Alert variant="default" className="mb-4 border-yellow-500/50 text-yellow-700 dark:border-yellow-400/50 dark:text-yellow-300 [&>svg]:text-yellow-600 dark:[&>svg]:text-yellow-400">
             <AlertTriangle className="h-5 w-5" />
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription className="whitespace-pre-line">{results.warning}</AlertDescription>
          </Alert>
        )}
        {results.clusters && results.clusters.length > 0 && !results.error && (
          <div>
            <Alert variant="default" className="mb-4 border-green-500/50 text-green-700 dark:border-green-400/50 dark:text-green-300 [&>svg]:text-green-600 dark:[&>svg]:text-green-400">
              <CheckCircle className="h-5 w-5" />
              <AlertTitle>Success!</AlertTitle>
              <AlertDescription>Clustering completed successfully.</AlertDescription>
            </Alert>
            <h3 className="font-semibold text-lg mb-2 text-foreground">Generated Clusters:</h3>
            <ul className="space-y-1 list-disc list-inside text-foreground">
              {results.clusters.map(cluster => (
                <li key={cluster.id}>
                  <span className="font-medium">Cluster {cluster.id}:</span> {cluster.members.join(', ')}
                </li>
              ))}
            </ul>
          </div>
        )}
        {results.clusters && results.clusters.length === 0 && !results.warning && !results.error && (
           <Alert variant="default" className="mb-4">
            <Info className="h-5 w-5" />
            <AlertTitle>No Clusters Formed</AlertTitle>
            <AlertDescription>The algorithm did not form any clusters based on the provided data and parameters. This might happen with very sparse data or strict constraints. Consider adjusting parameters.</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
