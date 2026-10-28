'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface MapClickHandlerProps {
  onLocationSelect: (lat: number, lng: number) => void;
}

function MapClickHandler({ onLocationSelect }: MapClickHandlerProps) {
  useMapEvents({
    click: (e) => {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function Recenter({ position, zoom }: { position: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) map.setView(position, zoom);
    else map.flyTo(position, zoom, { duration: 0.8 });
  }, [map, position[0], position[1], zoom]);
  return null;
}

interface LeafletMapProps {
  position: [number, number];
  onLocationSelect: (lat: number, lng: number) => void;
  markerPosition?: [number, number];
  zoom?: number;
}

export default function LeafletMap({ position, onLocationSelect, markerPosition, zoom = 11 }: LeafletMapProps) {
  const mapRef = useRef<L.Map | null>(null);

  return (
    <div className="relative z-0 isolate h-80 rounded-xl overflow-hidden border border-ob-border" data-testid="location-map">
      <MapContainer
        center={position}
        zoom={zoom}
        scrollWheelZoom={true}
        className="h-full w-full"
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          className="map-tiles"
        />
        <MapClickHandler onLocationSelect={onLocationSelect} />
        <Recenter position={position} zoom={zoom} />
        {markerPosition && <Marker position={markerPosition} />}
      </MapContainer>

      <style jsx global>{`
        .leaflet-container {
          background: var(--c-bg);
        }
        .leaflet-tile {
          filter: grayscale(80%) brightness(0.6) contrast(1.2);
        }
        .leaflet-control-zoom a {
          background-color: var(--c-ob-field) !important;
          color: var(--c-primary) !important;
          border: 1px solid var(--c-ob-border) !important;
        }
        .leaflet-control-zoom a:hover {
          background-color: var(--c-surface-3) !important;
          border-color: var(--c-primary) !important;
        }
        .leaflet-control-attribution {
          background-color: var(--c-surface-1) !important;
          color: var(--c-text) !important;
          font-size: 10px !important;
        }
        .leaflet-control-attribution a {
          color: var(--c-primary) !important;
        }
      `}</style>
    </div>
  );
}
