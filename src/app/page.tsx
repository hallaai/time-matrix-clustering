
"use client";

import React, { useState, useEffect } from 'react';
import { SiteHeader } from '@/components/layout/site-header';
import { ClusterForm } from '@/components/cluster/cluster-form';
import { ClusterResultsDisplay } from '@/components/cluster/cluster-results-display';
import type { ClusteringResult } from '@/types';
import { Loader2 } from 'lucide-react';
import { Progress } from "@/components/ui/progress";

export type ProcessingStatus = 'idle' | 'reading_file' | 'clustering';

export default function HomePage() {
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>('idle');
  const [results, setResults] = useState<ClusteringResult | null>(null);
  const [footerYear, setFooterYear] = useState<number | null>(null);

  useEffect(() => {
    setFooterYear(new Date().getFullYear());
  }, []);

  return (
    <>
      <SiteHeader />
      <main className="flex-1 flex flex-col items-center justify-start p-6 md:p-12 space-y-8">
        <ClusterForm 
          onResultsChange={setResults} 
          onProcessingStatusChange={setProcessingStatus}
          currentProcessingStatus={processingStatus}
        />
        {processingStatus === 'reading_file' && (
          <div className="flex flex-col items-center justify-center text-muted-foreground p-8 rounded-lg w-full max-w-lg">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg font-medium">Reading & Preparing Data...</p>
            <p className="text-sm">Please wait while the file is processed.</p>
          </div>
        )}
        {processingStatus === 'clustering' && (
          <div className="flex flex-col items-center justify-center text-muted-foreground p-8 rounded-lg w-full max-w-lg">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg font-medium">Analyzing Clusters...</p>
            <p className="text-sm">This may take a moment.</p>
          </div>
        )}
        <ClusterResultsDisplay results={results} isProcessing={processingStatus !== 'idle'} />
      </main>
      <footer className="py-6 px-4 text-center text-sm text-muted-foreground border-t">
        {footerYear !== null ? `© ${footerYear} ClusterVision. All rights reserved.` : 'Loading footer...'}
      </footer>
    </>
  );
}
