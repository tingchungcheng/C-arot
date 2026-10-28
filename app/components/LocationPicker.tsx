'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { debounce } from 'lodash';

// Create a wrapper component for the map
const LeafletMap = dynamic(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => <div className="h-80 flex items-center justify-center bg-[#0a0a0a] rounded-xl border-2 border-[#ff6b35]/30 text-[#f5e6d3]/60">加载地图...</div>
});

interface LocationData {
  place: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
}

interface LocationPickerProps {
  value: LocationData | null;
  onChange: (location: LocationData) => void;
}

export default function LocationPicker({ value, onChange }: LocationPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [manualInput, setManualInput] = useState(value?.place || '');
  const [showMap, setShowMap] = useState(false);
  const [position, setPosition] = useState<[number, number]>([
    value?.latitude || 3.139,
    value?.longitude || 101.687
  ]);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    // Import Leaflet CSS
    import('leaflet/dist/leaflet.css');
  }, []);

  const getTimezone = async (lat: number, lng: number): Promise<string> => {
    try {
      const response = await fetch('/api/timezone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: lat, longitude: lng })
      });
      const data = await response.json();
      return data.timezone || 'Asia/Kuala_Lumpur';
    } catch (error) {
      console.error('Error getting timezone:', error);
      return 'Asia/Kuala_Lumpur';
    }
  };

  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        {
          headers: {
            'User-Agent': 'C-arot/1.0 (https://c-arot.app)',
            'Referer': typeof window !== 'undefined' ? window.location.origin : ''
          }
        }
      );
      const data = await response.json();
      return data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  };

  const handleMapClick = async (lat: number, lng: number) => {
    setPosition([lat, lng]);
    const placeName = await reverseGeocode(lat, lng);
    const timezone = await getTimezone(lat, lng);
    setManualInput(placeName);
    onChange({
      place: placeName,
      latitude: lat,
      longitude: lng,
      timezone
    });
  };

  const searchNominatim = useCallback(
    debounce(async (query: string) => {
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`,
          {
            headers: {
              'User-Agent': 'C-arot/1.0 (https://c-arot.app)',
              'Referer': typeof window !== 'undefined' ? window.location.origin : ''
            }
          }
        );
        const data = await response.json();
        setSearchResults(data);
      } catch (error) {
        console.error('Error searching:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500),
    []
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    searchNominatim(query);
  };

  const handleSelectResult = async (result: NominatimResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setPosition([lat, lng]);
    setManualInput(result.display_name);
    setSearchQuery('');
    setSearchResults([]);
    
    const timezone = await getTimezone(lat, lng);
    onChange({
      place: result.display_name,
      latitude: lat,
      longitude: lng,
      timezone
    });

    if (mapRef.current) {
      mapRef.current.setView([lat, lng], 13);
    }
  };

  const handleManualInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setManualInput(e.target.value);
  };

  const handleManualInputBlur = () => {
    if (manualInput && value) {
      onChange({
        ...value,
        place: manualInput
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Manual input */}
      <div>
        <label className="block text-[#f5e6d3] mb-2 text-sm">地点名称</label>
        <input
          type="text"
          value={manualInput}
          onChange={handleManualInputChange}
          onBlur={handleManualInputBlur}
          placeholder="输入地点名称"
          className="w-full px-4 py-3 bg-[#0a0a0a] text-[#f5e6d3] rounded-xl border-2 border-[#ff6b35]/30 focus:border-[#ff6b35] focus:outline-none"
        />
      </div>

      {/* Toggle map button */}
      <button
        type="button"
        onClick={() => setShowMap(!showMap)}
        className="w-full px-4 py-3 bg-[#1a1a1a] text-[#ff6b35] rounded-xl border-2 border-[#ff6b35]/30 hover:border-[#ff6b35] transition-all flex items-center justify-center space-x-2"
      >
        <span>{showMap ? '隐藏' : '显示'}地图</span>
        <span>{showMap ? '🗺️' : '📍'}</span>
      </button>

      {showMap && (
        <div className="space-y-4">
          {/* Search box */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="搜索地点..."
              className="w-full px-4 py-3 bg-[#0a0a0a] text-[#f5e6d3] rounded-xl border-2 border-[#ff6b35]/30 focus:border-[#ff6b35] focus:outline-none"
            />
            {isSearching && (
              <div className="absolute right-3 top-3 text-[#ff6b35]">🔍</div>
            )}

            {/* Search results */}
            {searchResults.length > 0 && (
              <div className="absolute z-50 w-full mt-2 bg-[#1a1a1a] border-2 border-[#ff6b35]/30 rounded-xl overflow-hidden shadow-2xl">
                {searchResults.map((result, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleSelectResult(result)}
                    className="w-full px-4 py-3 text-left text-[#f5e6d3] hover:bg-[#ff6b35]/20 transition-colors border-b border-[#ff6b35]/10 last:border-0"
                  >
                    <div className="text-sm">{result.display_name}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Map */}
          <LeafletMap
            position={position}
            onLocationSelect={handleMapClick}
            markerPosition={value ? [value.latitude, value.longitude] : undefined}
          />

          {value && (
            <div className="text-xs text-[#f5e6d3]/60 space-y-1">
              <p>📍 坐标: {value.latitude.toFixed(4)}, {value.longitude.toFixed(4)}</p>
              <p>🕐 时区: {value.timezone}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
