
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { SiteHeader } from '@/components/layout/site-header';
import { ClusterForm } from '@/components/cluster/cluster-form';
import { ClusterResultsDisplay } from '@/components/cluster/cluster-results-display';
import type { ClusteringResult, LocationData } from '@/types';
import { Loader2, MapIcon, AlertTriangle } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

export type ProcessingStatus = 'idle' | 'reading_file' | 'clustering';

const ClusterMapDisplay = dynamic(() => import('@/components/map/ClusterMapDisplay'), { 
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center text-muted-foreground p-8 rounded-lg w-full max-w-4xl h-96 border shadow-lg">
      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
      <p className="text-lg font-medium">Loading Map...</p>
    </div>
  )
});


export default function HomePage() {
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>('idle');
  const [clusteringProgress, setClusteringProgress] = useState(0);
  const [results, setResults] = useState<ClusteringResult | null>(null);
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [locationDataError, setLocationDataError] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [footerYear, setFooterYear] = useState<number | null>(null);
  const [mapRenderKey, setMapRenderKey] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    setFooterYear(new Date().getFullYear());
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (processingStatus === 'clustering') {
      setClusteringProgress(0);
      let currentProgress = 0;
      interval = setInterval(() => {
        currentProgress += 5; 
        if (currentProgress <= 100) {
          setClusteringProgress(currentProgress);
        } else {
          clearInterval(interval);
        }
      }, 75); 
    } else {
      setClusteringProgress(0); 
    }
    return () => clearInterval(interval);
  }, [processingStatus]);

  useEffect(() => {
    if (showMap) {
      setMapRenderKey(prevKey => prevKey + 1);
    }
  }, [showMap]);

  const handleLocationDataChange = (data: LocationData | null, error?: string) => {
    setLocationData(data);
    setLocationDataError(error || null);
    if (error) {
       setShowMap(false); 
    }
  };

  const { canDrawMap, mapButtonTooltip } = useMemo(() => {
    if (!results || !results.clusters || results.clusters.length === 0) {
      return { canDrawMap: false, mapButtonTooltip: "Perform clustering first." };
    }
    if (!locationData) {
      return { canDrawMap: false, mapButtonTooltip: "Upload valid location data." };
    }
    if (locationDataError) {
        return { canDrawMap: false, mapButtonTooltip: `Location data error: ${locationDataError}` };
    }

    const clusterPoints = new Set(results.clusters.flatMap(c => c.members));
    const locationPoints = new Set(locationData.map(l => l.point));

    if (clusterPoints.size === 0 && locationPoints.size > 0) {
        return { canDrawMap: true, mapButtonTooltip: "Draw available locations on map (no clusters to color)." };
    }
    if (clusterPoints.size > 0 && locationPoints.size === 0) {
        return { canDrawMap: false, mapButtonTooltip: "Location data is empty, cannot map cluster points." };
    }
    
    for (const point of Array.from(clusterPoints)) {
      if (!locationPoints.has(point)) {
        return { canDrawMap: false, mapButtonTooltip: `Point ${point} from clusters not found in location data.` };
      }
    }
    return { canDrawMap: true, mapButtonTooltip: "Show clusters on map" };
  }, [results, locationData, locationDataError]);


  const handleDrawOnMap = () => {
    if (canDrawMap) {
      setShowMap(prev => !prev);
      if (!showMap) {
         toast({ title: "Map Display", description: "Showing locations on map. Points from clusters will be colored." });
      } else {
         toast({ title: "Map Display", description: "Map hidden." });
      }
    } else {
      toast({
        title: "Cannot Draw Map",
        description: mapButtonTooltip,
        variant: "destructive"
      })
    }
  };

  return (
    <>
      <SiteHeader />
      <main className="flex-1 flex flex-col items-center justify-start p-6 md:p-12 space-y-8">
        <ClusterForm 
          onResultsChange={setResults} 
          onProcessingStatusChange={setProcessingStatus}
          currentProcessingStatus={processingStatus}
          onLocationDataChange={handleLocationDataChange}
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
            <Progress value={clusteringProgress} className="w-3/4 mt-2 mb-1" />
            <p className="text-sm">{clusteringProgress}%</p>
          </div>
        )}

        <ClusterResultsDisplay results={results} isProcessing={processingStatus !== 'idle'} />
        
        {results && results.clusters && results.clusters.length > 0 && (
          <div className="w-full max-w-lg flex justify-center">
            <Button onClick={handleDrawOnMap} disabled={!canDrawMap} title={mapButtonTooltip}>
              <MapIcon className="mr-2 h-5 w-5" />
              {showMap ? "Hide Map" : "Draw on Map"}
            </Button>
          </div>
        )}
         {locationDataError && (
            <Alert variant="destructive" className="w-full max-w-lg">
                <AlertTriangle className="h-5 w-5" />
                <AlertTitle>Location Data Error</AlertTitle>
                <AlertDescription>{locationDataError}</AlertDescription>
            </Alert>
        )}

        {showMap && results && locationData && (
          <div className="w-full max-w-4xl h-[500px] mt-8 rounded-lg shadow-xl border overflow-hidden">
            <ClusterMapDisplay 
              key={mapRenderKey}
              clusters={results.clusters || []} 
              locations={locationData} 
            />
          </div>
        )}
         {!showMap && results && results.clusters && results.clusters.length > 0 && locationData && !canDrawMap && mapButtonTooltip && mapButtonTooltip.includes("not found in location data") && (
             <Alert variant="destructive" className="w-full max-w-lg">
                <AlertTriangle className="h-5 w-5" />
                <AlertTitle>Map Data Mismatch</AlertTitle>
                <AlertDescription>{mapButtonTooltip} Please ensure location data includes all points present in your clusters.</AlertDescription>
            </Alert>
         )}

      </main>
      <footer className="py-6 px-4 text-center text-sm text-muted-foreground border-t">
        {footerYear !== null ? `© ${footerYear} ClusterVision. All rights reserved.` : 'Loading footer...'}
      </footer>
    </>
  );
}
