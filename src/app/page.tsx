
"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
      const totalDuration = 1500; 
      const steps = 20; 
      const increment = 100 / steps;
      const intervalTime = totalDuration / steps;

      interval = setInterval(() => {
        currentProgress += increment;
        if (currentProgress <= 100) {
          setClusteringProgress(currentProgress);
        } else {
          setClusteringProgress(100); 
          clearInterval(interval);
        }
      }, intervalTime);
    } else {
      setClusteringProgress(0);
    }
    return () => clearInterval(interval);
  }, [processingStatus]);

  const handleLocationDataChange = (data: LocationData | null, error?: string) => {
    setLocationData(data);
    setLocationDataError(error || null);
    if (error) {
       setShowMap(false); // Hide map if new location data has errors
    }
  };

  const { canDrawMap, mapButtonTooltip } = useMemo(() => {
    if (!results || !results.chosenClusters || results.chosenClusters.length === 0) {
      // If location data exists, allow drawing unclustered points
      if (locationData && (!locationDataError)) {
          return { canDrawMap: true, mapButtonTooltip: "Draw available locations on map (no clusters to color)."};
      }
      return { canDrawMap: false, mapButtonTooltip: "Perform clustering first or no valid clusters were formed." };
    }
    if (!locationData) {
      return { canDrawMap: false, mapButtonTooltip: "Upload valid location data to enable map display." };
    }
    if (locationDataError) {
        return { canDrawMap: false, mapButtonTooltip: `Location data error: ${locationDataError}` };
    }

    const clusterPoints = new Set(results.chosenClusters.flatMap(c => c.members));
    const locationPoints = new Set(locationData.map(l => l.point));
    
    if (clusterPoints.size === 0 && locationPoints.size > 0) {
        return { canDrawMap: true, mapButtonTooltip: "Draw available locations on map (no clusters to color)." };
    }
    if (clusterPoints.size > 0 && locationPoints.size === 0) {
        return { canDrawMap: false, mapButtonTooltip: "Location data is empty, cannot map cluster points." };
    }

    for (const point of Array.from(clusterPoints)) {
      if (!locationPoints.has(point)) {
        return { canDrawMap: false, mapButtonTooltip: `Point ${point} from clusters not found in location data. Please check your locations file.` };
      }
    }
    return { canDrawMap: true, mapButtonTooltip: showMap ? "Hide map" : "Show clusters and locations on map" };
  }, [results, locationData, locationDataError, showMap]);

  // Conditions for rendering map blocks
  const shouldRenderMainMap = showMap && !!results && !!results.chosenClusters && results.chosenClusters.length > 0 && !!locationData && !locationDataError && canDrawMap;
  const shouldRenderLocationsOnlyMap = showMap && !!locationData && !locationDataError && canDrawMap && (!results || !results.chosenClusters || results.chosenClusters.length === 0);

  const prevMainMapConditionRef = useRef(shouldRenderMainMap);
  const prevLocationsOnlyMapConditionRef = useRef(shouldRenderLocationsOnlyMap);

  useEffect(() => {
    const currentMainMapCondition = showMap && !!results && !!results.chosenClusters && results.chosenClusters.length > 0 && !!locationData && !locationDataError && canDrawMap;
    const currentLocationsOnlyMapCondition = showMap && !!locationData && !locationDataError && canDrawMap && (!results || !results.chosenClusters || results.chosenClusters.length === 0);

    if ((currentMainMapCondition && !prevMainMapConditionRef.current) || (currentLocationsOnlyMapCondition && !prevLocationsOnlyMapConditionRef.current)) {
        setMapRenderKey(prevKey => prevKey + 1);
    }

    prevMainMapConditionRef.current = currentMainMapCondition;
    prevLocationsOnlyMapConditionRef.current = currentLocationsOnlyMapCondition;
  }, [showMap, results, locationData, locationDataError, canDrawMap]);


  const handleDrawOnMap = () => {
    if (canDrawMap) {
      const newShowMapState = !showMap;
      setShowMap(newShowMapState);
      if (newShowMapState) { 
         toast({ title: "Map Display", description: "Showing locations on map. Points from clusters will be colored." });
      } else { 
         toast({ title: "Map Display", description: "Map hidden." });
      }
    } else {
      toast({
        title: "Cannot Draw Map",
        description: mapButtonTooltip,
        variant: "destructive",
        duration: 7000,
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
            <p className="text-sm">{clusteringProgress.toFixed(0)}%</p>
          </div>
        )}

        <ClusterResultsDisplay results={results} isProcessing={processingStatus !== 'idle'} />

        {(results || locationData) && processingStatus === 'idle' && (
            <div className="w-full max-w-lg flex flex-col items-center space-y-4">
                {locationDataError && (
                    <Alert variant="destructive" className="w-full">
                        <AlertTriangle className="h-5 w-5" />
                        <AlertTitle>Location Data Error</AlertTitle>
                        <AlertDescription>{locationDataError}</AlertDescription>
                    </Alert>
                )}
                {(results && results.chosenClusters && results.chosenClusters.length > 0) || (locationData && (!results || !results.chosenClusters || results.chosenClusters.length === 0)) ? (
                    <Button onClick={handleDrawOnMap} disabled={!canDrawMap} title={mapButtonTooltip}>
                        <MapIcon className="mr-2 h-5 w-5" />
                        {showMap ? "Hide Map" : "Draw on Map"}
                    </Button>
                ) : null}

                {!showMap && locationData && !canDrawMap && mapButtonTooltip && mapButtonTooltip.includes("not found in location data") && (
                     <Alert variant="destructive" className="w-full">
                        <AlertTriangle className="h-5 w-5" />
                        <AlertTitle>Map Data Mismatch</AlertTitle>
                        <AlertDescription>{mapButtonTooltip} Please ensure location data includes all points present in your clusters.</AlertDescription>
                    </Alert>
                 )}
            </div>
        )}


        {shouldRenderMainMap && (
          <div
            key={`map-main-${mapRenderKey}`} 
            className="w-full max-w-4xl h-[500px] mt-8 rounded-lg shadow-xl border overflow-hidden"
          >
            <ClusterMapDisplay
              clusters={results!.chosenClusters!} 
              locations={locationData!}
            />
          </div>
        )}
        {shouldRenderLocationsOnlyMap && (
             <div
                key={`map-loc-only-${mapRenderKey}`}
                className="w-full max-w-4xl h-[500px] mt-8 rounded-lg shadow-xl border overflow-hidden"
            >
                <ClusterMapDisplay
                clusters={[]} 
                locations={locationData!}
                />
            </div>
        )}

      </main>
      <footer className="py-6 px-4 text-center text-sm text-muted-foreground border-t">
        {footerYear !== null ? `© ${footerYear} ClusterVision. All rights reserved.` : 'Loading footer...'}
      </footer>
    </>
  );
}

