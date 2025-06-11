
"use client";

import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import type { Cluster, LocationData, LocationEntry } from '@/types';

interface ClusterMapDisplayProps {
  clusters: Cluster[];
  locations: LocationData;
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
];
const UNCLUSTERED_COLOR = '#808080'; // Grey for unclustered points

export default function ClusterMapDisplay({ clusters, locations }: ClusterMapDisplayProps) {
  const locationsMap = useMemo(() => {
    const map = new Map<number, LocationEntry>();
    locations.forEach(loc => map.set(loc.point, loc));
    return map;
  }, [locations]);

  const pointsToDisplay = useMemo(() => {
    const displayedPoints = new Set<number>();
    const points: (LocationEntry & { clusterId?: number; color: string })[] = [];

    // Add clustered points
    clusters.forEach((cluster, clusterIndex) => {
      const color = DEFAULT_CLUSTER_COLORS[clusterIndex % DEFAULT_CLUSTER_COLORS.length];
      cluster.members.forEach(pointId => {
        const loc = locationsMap.get(pointId);
        if (loc) {
          points.push({ ...loc, clusterId: cluster.id, color });
          displayedPoints.add(pointId);
        }
      });
    });

    // Add unclustered points from the locations file that were not in any displayed cluster
    locations.forEach(loc => {
      if (!displayedPoints.has(loc.point)) {
        points.push({ ...loc, color: UNCLUSTERED_COLOR });
         displayedPoints.add(loc.point); // Ensure it's not added again if it was somehow missed
      }
    });
    
    return points;

  }, [clusters, locationsMap, locations]);


  if (pointsToDisplay.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No location data to display on the map.
      </div>
    );
  }

  // Calculate center of the map based on available points
  const getMapCenter = (): LatLngExpression => {
    if (pointsToDisplay.length === 0) return [60.1695, 24.9354]; // Default to Helsinki
    
    let totalLat = 0;
    let totalLon = 0;
    pointsToDisplay.forEach(p => {
      totalLat += p.lat;
      totalLon += p.lon;
    });
    return [totalLat / pointsToDisplay.length, totalLon / pointsToDisplay.length];
  };
  
  const mapCenter = getMapCenter();

  return (
    <MapContainer center={mapCenter} zoom={10} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {pointsToDisplay.map((point) => (
        <CircleMarker
          key={point.point}
          center={[point.lat, point.lon]}
          radius={6}
          pathOptions={{ 
            color: point.color, 
            fillColor: point.color, 
            fillOpacity: 0.8 
          }}
        >
          <Popup>
            <b>{point.name}</b><br />
            Point ID: {point.point}<br />
            {point.clusterId !== undefined ? `Cluster: ${point.clusterId}` : 'Unclustered'}<br />
            Lat: {point.lat.toFixed(4)}, Lon: {point.lon.toFixed(4)}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
