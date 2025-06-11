"use client";

import React, { useState } from 'react';
import { SiteHeader } from '@/components/layout/site-header';
import { ClusterForm } from '@/components/cluster/cluster-form';
import { ClusterResultsDisplay } from '@/components/cluster/cluster-results-display';
import type { ClusteringResult } from '@/types';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ClusteringResult | null>(null);

  return (
    <>
      <SiteHeader />
      <main className="flex-1 flex flex-col items-center justify-start p-6 md:p-12 space-y-8">
        <ClusterForm 
          onProcessing={setIsProcessing} 
          onResults={setResults} 
        />
        {isProcessing && (
          <div className="flex flex-col items-center justify-center text-muted-foreground p-8 rounded-lg">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg font-medium">Processing clusters...</p>
            <p className="text-sm">This may take a moment.</p>
          </div>
        )}
        <ClusterResultsDisplay results={results} isProcessing={isProcessing} />
      </main>
      <footer className="py-6 px-4 text-center text-sm text-muted-foreground border-t">
        © {new Date().getFullYear()} ClusterVision. All rights reserved.
      </footer>
    </>
  );
}
