"use client";

import React, { useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';

interface ClusterMapDisplayProps {
  works?: any[]; // Optional works data
}

export default function ClusterMapDisplay({ works }: ClusterMapDisplayProps) {

  const pointsToDisplay = useMemo(() => {
    const points: { lat: number; lon: number; name: string; }[] = [];

    // Add works data points
    if (works && Array.isArray(works)) {
      works.forEach((work, index) => {
        if (work.coordinates && typeof work.coordinates.lat === 'number' && typeof work.coordinates.lon === 'number') {
          points.push({
            name: work.name || `Work ${index + 1}`,
            lat: work.coordinates.lat,
            lon: work.coordinates.lon,
          });
        }
      });
    }

    return points;

  }, [works]);


  if (!pointsToDisplay || pointsToDisplay.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground bg-gray-100 dark:bg-gray-800">
        <p className="p-4 text-center">No work data points to display on the map. <br /> Please upload a valid works data JSON.</p>
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
      {pointsToDisplay.map((point, index) => (
        <CircleMarker
          key={`work-${index}`}
          center={[point.lat, point.lon]}
          radius={7} // Slightly larger markers
          pathOptions={{ 
            color: 'blue', 
            fillColor: 'blue', 
            fillOpacity: 0.8,
            weight: 2 // Add a border to markers
          }}
        >
          <Popup>
            <div className="text-sm">
              <p className="font-bold text-base mb-1">{point.name}</p>
              <p><span className="font-semibold">Coords:</span> {point.lat.toFixed(4)}, {point.lon.toFixed(4)}</p>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
