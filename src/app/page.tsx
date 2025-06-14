"use client";

import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { SiteHeader } from '@/components/layout/site-header';
import { ClusterForm } from '@/components/cluster/cluster-form';
import { Loader2, MapIcon, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

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
  const [showMap, setShowMap] = useState(false);
  const [footerYear, setFooterYear] = useState<number | null>(null);
  const [mapRenderKey, setMapRenderKey] = useState(0);
  const { toast } = useToast();
  const [worksData, setWorksData] = useState<any[] | null>(null);
  const [worksDataError, setWorksDataError] = useState<string | null>(null);

  useEffect(() => {
    setFooterYear(new Date().getFullYear());
  }, []);

  const handleWorksDataChange = (works: any[] | null, error?: string) => {
    setWorksData(works);
    setWorksDataError(error || null);
  };

  const canDrawMap = useMemo(() => {
    return !!worksData && !worksDataError;
  }, [worksData, worksDataError]);

  const handleDrawOnMap = () => {
    if (canDrawMap) {
      setShowMap(!showMap);
    } else {
      toast({
        title: "Cannot Draw Map",
        description: worksDataError || "No works data loaded.",
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
          onWorksDataChange={handleWorksDataChange}
        />

        {(worksData) && (
            <div className="w-full max-w-lg flex flex-col items-center space-y-4">
                {worksDataError && (
                    <Alert variant="destructive" className="w-full">
                        <AlertTriangle className="h-5 w-5" />
                        <AlertTitle>Works Data Error</AlertTitle>
                        <AlertDescription>{worksDataError}</AlertDescription>
                    </Alert>
                )}
                <Button onClick={handleDrawOnMap} disabled={!canDrawMap}>
                    <MapIcon className="mr-2 h-5 w-5" />
                    {showMap ? "Hide Map" : "Draw on Map"}
                </Button>
            </div>
        )}


        {showMap && worksData && (
            <div
                key={`map-works-${mapRenderKey}`}
                className="w-full max-w-4xl h-[500px] mt-8 rounded-lg shadow-xl border overflow-hidden"
            >
                <ClusterMapDisplay
                    works={worksData!}
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

