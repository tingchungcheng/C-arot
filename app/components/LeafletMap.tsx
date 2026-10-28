'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
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

interface LeafletMapProps {
  position: [number, number];
  onLocationSelect: (lat: number, lng: number) => void;
  markerPosition?: [number, number];
}

export default function LeafletMap({ position, onLocationSelect, markerPosition }: LeafletMapProps) {
  const mapRef = useRef<L.Map | null>(null);

  return (
    <div className="h-80 rounded-xl overflow-hidden border-2 border-[#ff6b35]/30 relative">
      <MapContainer
        center={position}
        zoom={13}
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
        {markerPosition && <Marker position={markerPosition} />}
      </MapContainer>

      <style jsx global>{`
        .leaflet-container {
          background: #0a0a0a;
        }
        .leaflet-tile {
          filter: grayscale(80%) brightness(0.6) contrast(1.2);
        }
        .leaflet-control-zoom a {
          background-color: #1a1a1a !important;
          color: #ff6b35 !important;
          border: 1px solid rgba(255, 107, 53, 0.3) !important;
        }
        .leaflet-control-zoom a:hover {
          background-color: rgba(255, 107, 53, 0.2) !important;
          border-color: #ff6b35 !important;
        }
        .leaflet-control-attribution {
          background-color: rgba(26, 26, 26, 0.8) !important;
          color: #f5e6d3 !important;
          font-size: 10px !important;
        }
        .leaflet-control-attribution a {
          color: #ff6b35 !important;
        }
      `}</style>
    </div>
  );
}
