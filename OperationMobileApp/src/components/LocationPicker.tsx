import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation } from 'lucide-react';

interface LocationPickerProps {
  value: string;
  onChange: (coordinates: string) => void;
  isDarkMode: boolean;
  label?: string;
  required?: boolean;
  error?: string;
}

interface Coordinates {
  lat: number;
  lng: number;
}

const LocationPicker: React.FC<LocationPickerProps> = ({
  value,
  onChange,
  isDarkMode,
  label = 'Location',
  required = false,
  error
}) => {
  const [map, setMap] = useState<any>(null);
  const [marker, setMarker] = useState<any>(null);
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletLoaded = useRef(false);

  useEffect(() => {
    if (value && value.trim()) {
      const parts = value.split(',').map(p => p.trim());
      if (parts.length === 2) {
        const lat = parseFloat(parts[0]);
        const lng = parseFloat(parts[1]);
        if (!isNaN(lat) && !isNaN(lng)) {
          setCoordinates({ lat, lng });
        }
      }
    }
  }, [value]);

  useEffect(() => {
    const loadLeaflet = async () => {
      if (leafletLoaded.current) return;

      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;

      script.onload = () => {
        leafletLoaded.current = true;
        initializeMap();
      };

      document.head.appendChild(script);
    };

    const initializeMap = () => {
      if (!mapRef.current || map) return;

      const L = (window as any).L;
      if (!L) return;

      const initialLat = coordinates?.lat || 14.5995;
      const initialLng = coordinates?.lng || 120.9842;

      const newMap = L.map(mapRef.current).setView([initialLat, initialLng], 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(newMap);

      const newMarker = L.marker([initialLat, initialLng], {
        draggable: true
      }).addTo(newMap);

      newMarker.on('dragend', function(e: any) {
        const position = e.target.getLatLng();
        updateCoordinates(position.lat, position.lng);
      });

      newMap.on('click', function(e: any) {
        const { lat, lng } = e.latlng;
        newMarker.setLatLng([lat, lng]);
        updateCoordinates(lat, lng);
      });

      setMap(newMap);
      setMarker(newMarker);

      if (coordinates) {
        newMarker.setLatLng([coordinates.lat, coordinates.lng]);
        newMap.setView([coordinates.lat, coordinates.lng], 13);
      }
    };

    if (mapRef.current && !map) {
      loadLeaflet();
    }

    return () => {
      if (map) {
        map.remove();
      }
    };
  }, []);

  useEffect(() => {
    if (map && marker && coordinates) {
      marker.setLatLng([coordinates.lat, coordinates.lng]);
      map.setView([coordinates.lat, coordinates.lng], 13);
    }
  }, [coordinates, map, marker]);

  const updateCoordinates = (lat: number, lng: number) => {
    const roundedLat = parseFloat(lat.toFixed(6));
    const roundedLng = parseFloat(lng.toFixed(6));
    setCoordinates({ lat: roundedLat, lng: roundedLng });
    onChange(`${roundedLat}, ${roundedLng}`);
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setIsGettingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        updateCoordinates(latitude, longitude);
        
        if (marker && map) {
          marker.setLatLng([latitude, longitude]);
          map.setView([latitude, longitude], 15);
        }
        
        setIsGettingLocation(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('Unable to get your location. Please ensure location permissions are enabled.');
        setIsGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  return (
    <div>
      <label className={`block text-sm font-medium mb-2 ${
        isDarkMode ? 'text-gray-300' : 'text-gray-700'
      }`}>
        {label}{required && <span className="text-red-500">*</span>}
      </label>
      
      <div className={`border rounded overflow-hidden ${
        isDarkMode ? 'border-gray-700' : 'border-gray-300'
      } ${error ? 'border-red-500' : ''}`}>
        <div className="relative">
          <div 
            ref={mapRef} 
            className="w-full h-64"
            style={{ zIndex: 1 }}
          />
          
          <button
            type="button"
            onClick={handleGetCurrentLocation}
            disabled={isGettingLocation}
            className={`absolute top-2 right-2 px-3 py-2 rounded shadow-lg flex items-center space-x-2 z-[1000] transition-colors ${
              isDarkMode 
                ? 'bg-gray-800 hover:bg-gray-700 text-white' 
                : 'bg-white hover:bg-gray-50 text-gray-900'
            } ${isGettingLocation ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Navigation className={`h-4 w-4 ${isGettingLocation ? 'animate-spin' : ''}`} />
            <span className="text-sm">
              {isGettingLocation ? 'Getting...' : 'Get My Location'}
            </span>
          </button>
        </div>

        <div className={`p-3 border-t ${
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-center space-x-2">
            <MapPin className={`h-4 w-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
            <input
              type="text"
              value={coordinates ? `${coordinates.lat}, ${coordinates.lng}` : ''}
              readOnly
              placeholder="Click on map or use 'Get My Location'"
              className={`flex-1 px-3 py-2 rounded text-sm ${
                isDarkMode 
                  ? 'bg-gray-900 text-gray-300 border-gray-700' 
                  : 'bg-white text-gray-900 border-gray-300'
              } border cursor-not-allowed`}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center mt-1">
          <div className="flex items-center justify-center w-4 h-4 rounded-full bg-orange-500 text-white text-xs mr-2">!</div>
          <p className="text-orange-500 text-xs">{error}</p>
        </div>
      )}

      <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        Click on the map to set location or drag the marker
      </p>
    </div>
  );
};

export default LocationPicker;
