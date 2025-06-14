
"use client";

import React, { useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import type { Cluster, LocationData, LocationEntry } from '@/types';

interface ClusterMapDisplayProps {
  clusters: Cluster[]; // Can be empty if no clusters formed or only locations are shown
  locations: LocationData; // Assumed to be non-null & array by HomePage's conditional render
}

// Predefined distinct colors for clusters
const DEFAULT_CLUSTER_COLORS = [
  '#FF6347', // Tomato
  '#4682B4', // SteelBlue
  '#32CD32', // LimeGreen
  '#FFD700', // Gold
  '#6A5ACD', // SlateBlue
  '#FF69B4', // HotPink
  '#00CED1', // DarkTurquoise
  '#FFA500', // Orange
  '#8A2BE2', // BlueViolet
  '#D2691E', // Chocolate
  '#20B2AA', // LightSeaGreen
  '#9370DB', // MediumPurple
  '#FA8072', // Salmon
  '#7FFF00', // Chartreuse
  '#DC143C', // Crimson
];
const UNCLUSTERED_COLOR = '#808080'; // Grey for unclustered points

export default function ClusterMapDisplay({ clusters, locations }: ClusterMapDisplayProps) {
  const locationsMap = useMemo(() => {
    const map = new Map<number, LocationEntry>();
    if (locations && Array.isArray(locations)) {
      locations.forEach(loc => map.set(loc.point, loc));
    }
    return map;
  }, [locations]);

  const pointsToDisplay = useMemo(() => {
    const displayedPointsSet = new Set<number>();
    const points: (LocationEntry & { clusterId?: number; color: string })[] = [];

    // Add clustered points
    if (clusters && Array.isArray(clusters)) {
        clusters.forEach((cluster, clusterIndex) => {
          const color = DEFAULT_CLUSTER_COLORS[clusterIndex % DEFAULT_CLUSTER_COLORS.length];
          if (cluster.members && Array.isArray(cluster.members)) {
            cluster.members.forEach(pointId => {
              const loc = locationsMap.get(pointId);
              if (loc) {
                points.push({ ...loc, clusterId: cluster.id, color });
                displayedPointsSet.add(pointId);
              }
            });
          }
        });
    }


    // Add unclustered points from the locations file that aren't in any displayed cluster
    if (locations && Array.isArray(locations)) {
      locations.forEach(loc => {
        if (!displayedPointsSet.has(loc.point)) {
          points.push({ ...loc, color: UNCLUSTERED_COLOR }); // No clusterId means unclustered
          displayedPointsSet.add(loc.point); // Still add to set to avoid re-adding if logic changes
        }
      });
    }
    
    return points;

  }, [clusters, locationsMap, locations]);


  if (!pointsToDisplay || pointsToDisplay.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground bg-gray-100 dark:bg-gray-800">
        <p className="p-4 text-center">No location data points to display on the map. <br/> Please upload a valid locations file.</p>
      </div>
    );
  }

  // Calculate center of the map based on available points
  const getMapCenter = (): LatLngExpression => {
    if (pointsToDisplay.length === 0) return [60.1695, 24.9354]; // Default to Helsinki if no points
    let totalLat = 0;
    let totalLon = 0;
    pointsToDisplay.forEach(p => {
      totalLat += p.lat;
      totalLon += p.lon;
    });
    return [totalLat / pointsToDisplay.length, totalLon / pointsToDisplay.length];
  };
  
  const mapCenter = getMapCenter();
  const initialZoom = pointsToDisplay.length > 1 ? 7 : 10; // Zoom out more if multiple points

  return (
    <MapContainer center={mapCenter} zoom={initialZoom} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {pointsToDisplay.map((point) => (
        <CircleMarker
          key={`${point.point}-${point.clusterId || 'unclustered'}`} // More unique key
          center={[point.lat, point.lon]}
          radius={7} // Slightly larger markers
          pathOptions={{ 
            color: point.color, 
            fillColor: point.color, 
            fillOpacity: 0.8,
            weight: 2 // Add a border to markers
          }}
        >
          <Popup>
            <div className="text-sm">
                <p className="font-bold text-base mb-1">{point.name}</p>
                <p><span className="font-semibold">Point ID:</span> {point.point}</p>
                <p>
                    <span className="font-semibold">Cluster:</span> 
                    {point.clusterId !== undefined ? ` ${point.clusterId}` : ' Unclustered'}
                </p>
                <p><span className="font-semibold">Coords:</span> {point.lat.toFixed(4)}, {point.lon.toFixed(4)}</p>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
