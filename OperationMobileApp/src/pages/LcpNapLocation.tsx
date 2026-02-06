import React, { useState, useEffect, useRef } from 'react';
import { Loader2, MapPin } from 'lucide-react';
import AddLcpNapLocationModal from '../modals/AddLcpNapLocationModal';
import LcpNapLocationDetails from '../components/LcpNapLocationDetails';
import { GOOGLE_MAPS_API_KEY } from '../config/maps';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';
import apiClient from '../config/api';

interface LocationMarker {
  id: number;
  lcpnap_name: string;
  lcp_name: string;
  nap_name: string;
  coordinates: string;
  latitude: number;
  longitude: number;
  street?: string;
  city?: string;
  region?: string;
  barangay?: string;
  port_total?: number;
  reading_image_url?: string;
  image1_url?: string;
  image2_url?: string;
  modified_by?: string;
  modified_date?: string;
  active_sessions?: number;
  inactive_sessions?: number;
  offline_sessions?: number;
  blocked_sessions?: number;
  not_found_sessions?: number;
}

interface LcpNapGroup {
  lcpnap_id: number;
  lcpnap_name: string;
  locations: LocationMarker[];
  count: number;
}

interface LcpNapItem {
  id: number;
  name: string;
  count: number;
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
}



const LcpNapLocation: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [markers, setMarkers] = useState<LocationMarker[]>([]);
  const [lcpNapGroups, setLcpNapGroups] = useState<LcpNapGroup[]>([]);
  const [selectedLcpNapId, setSelectedLcpNapId] = useState<number | string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState<number>(256);
  const [isResizingSidebar, setIsResizingSidebar] = useState<boolean>(false);
  const [isMapReady, setIsMapReady] = useState<boolean>(false);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<LocationMarker | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const sidebarStartXRef = useRef<number>(0);
  const sidebarStartWidthRef = useRef<number>(0);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const theme = localStorage.getItem('theme');
      setIsDarkMode(theme !== 'light');
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    const theme = localStorage.getItem('theme');
    setIsDarkMode(theme !== 'light');

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const fetchColorPalette = async () => {
      try {
        const activePalette = await settingsColorPaletteService.getActive();
        setColorPalette(activePalette);
      } catch (err) {
        console.error('Failed to fetch color palette:', err);
      }
    };
    fetchColorPalette();
  }, []);

  useEffect(() => {
    loadGoogleMapsScript();
    loadLocations();

    return () => {
      clearMarkers();
      if (infoWindowRef.current) {
        infoWindowRef.current.close();
        infoWindowRef.current = null;
      }
      mapInstanceRef.current = null;
      setIsMapReady(false);
    };
  }, []);

  useEffect(() => {
    if (markers.length > 0) {
      groupLocationsByLcpNap();
    }
  }, [markers]);

  useEffect(() => {
    if (isMapReady && markers.length > 0 && selectedLcpNapId === 'all') {
      updateMapMarkers(markers);
    }
  }, [isMapReady]);

  useEffect(() => {
    if (!isResizingSidebar) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingSidebar) return;

      const diff = e.clientX - sidebarStartXRef.current;
      const newWidth = Math.max(200, Math.min(500, sidebarStartWidthRef.current + diff));

      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizingSidebar(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingSidebar]);

  const loadGoogleMapsScript = () => {
    if (window.google?.maps) {
      initializeMap();
      return;
    }

    const existingScript = document.getElementById('google-maps-script');
    if (existingScript) {
      existingScript.addEventListener('load', initializeMap);
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=marker`;
    script.async = true;
    script.defer = true;
    script.onload = initializeMap;
    script.onerror = () => {
      console.error('Failed to load Google Maps script');
      setIsMapReady(false);
    };
    document.head.appendChild(script);
  };

  const initializeMap = () => {
    if (!mapRef.current || !window.google?.maps) return;

    try {
      const map = new google.maps.Map(mapRef.current, {
        center: { lat: 12.8797, lng: 121.7740 },
        zoom: 6,
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
        zoomControl: true,
        styles: [
          {
            featureType: 'all',
            elementType: 'geometry',
            stylers: [{ color: '#1f2937' }]
          },
          {
            featureType: 'water',
            elementType: 'geometry',
            stylers: [{ color: '#0f172a' }]
          },
          {
            featureType: 'road',
            elementType: 'geometry',
            stylers: [{ color: '#374151' }]
          },
          {
            featureType: 'poi',
            stylers: [{ visibility: 'off' }]
          },
          {
            featureType: 'transit',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          },
          {
            featureType: 'road',
            elementType: 'labels.icon',
            stylers: [{ visibility: 'off' }]
          },
          {
            elementType: 'labels.text.fill',
            stylers: [{ color: '#9ca3af' }]
          },
          {
            elementType: 'labels.text.stroke',
            stylers: [{ color: '#111827' }]
          }
        ]
      });

      infoWindowRef.current = new google.maps.InfoWindow();
      mapInstanceRef.current = map;
      setIsMapReady(true);
    } catch (error) {
      console.error('Error initializing map:', error);
      setIsMapReady(false);
    }
  };

  const parseCoordinates = (coordString: string): { latitude: number; longitude: number } | null => {
    if (!coordString) return null;

    const coords = coordString.split(',').map(c => c.trim());
    if (coords.length !== 2) return null;

    const latitude = parseFloat(coords[0]);
    const longitude = parseFloat(coords[1]);

    if (isNaN(latitude) || isNaN(longitude)) return null;

    return { latitude, longitude };
  };

  const loadLocations = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get<ApiResponse<any[]>>('/lcp-nap-locations');
      const data = response.data;

      if (data.success && data.data) {
        const locationData = data.data
          .map((item: any) => {
            const coords = parseCoordinates(item.coordinates);
            if (!coords) return null;

            return {
              id: item.id,
              lcpnap_name: item.lcpnap_name,
              lcp_name: item.lcp_name || 'N/A',
              nap_name: item.nap_name || 'N/A',
              coordinates: item.coordinates,
              latitude: coords.latitude,
              longitude: coords.longitude,
              street: item.street,
              city: item.city,
              region: item.region,
              barangay: item.barangay,
              port_total: item.port_total,
              reading_image_url: item.reading_image_url,
              image1_url: item.image1_url,
              image2_url: item.image2_url,
              modified_by: item.modified_by,
              modified_date: item.modified_date,
              active_sessions: item.active_sessions,
              inactive_sessions: item.inactive_sessions,
              offline_sessions: item.offline_sessions,
              blocked_sessions: item.blocked_sessions,
              not_found_sessions: item.not_found_sessions
            } as LocationMarker;
          })
          .filter((marker): marker is LocationMarker => marker !== null);

        setMarkers(locationData);

        if (mapInstanceRef.current) {
          updateMapMarkers(locationData);
        }
      }
    } catch (error) {
      console.error('Error loading locations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const groupLocationsByLcpNap = () => {
    const grouped: { [key: string]: LcpNapGroup } = {};

    markers.forEach(marker => {
      if (!grouped[marker.lcpnap_name]) {
        grouped[marker.lcpnap_name] = {
          lcpnap_id: marker.id,
          lcpnap_name: marker.lcpnap_name,
          locations: [],
          count: 0
        };
      }
      grouped[marker.lcpnap_name].locations.push(marker);
      grouped[marker.lcpnap_name].count++;
    });

    const groupArray = Object.values(grouped).sort((a, b) =>
      a.lcpnap_name.localeCompare(b.lcpnap_name)
    );

    setLcpNapGroups(groupArray);
  };

  const clearMarkers = () => {
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
  };

  const createMarkerIcon = (): google.maps.Symbol => {
    return {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 8,
      fillColor: '#22c55e',
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 2,
    };
  };

  const updateMapMarkers = (locations: LocationMarker[]) => {
    if (!mapInstanceRef.current || !window.google?.maps) {
      console.warn('Map not ready');
      return;
    }

    clearMarkers();

    const bounds = new google.maps.LatLngBounds();

    locations.forEach(location => {
      const position = { lat: location.latitude, lng: location.longitude };

      const marker = new google.maps.Marker({
        position,
        map: mapInstanceRef.current,
        icon: createMarkerIcon(),
        title: location.lcpnap_name
      });

      marker.addListener('click', () => {
        setSelectedLocation(location);
      });

      // Add hover event listeners to show info window
      marker.addListener('mouseover', () => {
        if (infoWindowRef.current) {
          const addressParts = [
            location.street,
            location.barangay,
            location.city,
            location.region
          ].filter(Boolean);

          const address = addressParts.length > 0
            ? addressParts.join(', ')
            : 'No address available';

          const contentString = `
            <div style="padding: 8px; min-width: 200px;">
              <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1f2937;">
                ${location.lcpnap_name}
              </h3>
              <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">
                <strong>LCP:</strong> ${location.lcp_name}
              </div>
              <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">
                <strong>NAP:</strong> ${location.nap_name}
              </div>
              ${location.port_total ? `
                <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">
                  <strong>Ports:</strong> ${location.port_total}
                </div>
              ` : ''}
              <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
                <div style="font-size: 12px; margin-bottom: 4px;">
                  <strong style="color: #22c55e;">Online:</strong> 
                  <span style="color: #22c55e; font-weight: 600;">${location.active_sessions || 0}</span>
                </div>
                <div style="font-size: 12px; margin-bottom: 4px;">
                  <strong style="color: #f59e0b;">Offline:</strong> 
                  <span style="color: #f59e0b; font-weight: 600;">${location.offline_sessions || 0}</span>
                </div>
                <div style="font-size: 12px; margin-bottom: 4px;">
                  <strong style="color: #6b7280;">Inactive:</strong> 
                  <span style="color: #6b7280; font-weight: 600;">${location.inactive_sessions || 0}</span>
                </div>
                <div style="font-size: 12px; margin-bottom: 4px;">
                  <strong style="color: #ef4444;">Blocked:</strong> 
                  <span style="color: #ef4444; font-weight: 600;">${location.blocked_sessions || 0}</span>
                </div>
                <div style="font-size: 12px; margin-bottom: 4px;">
                  <strong style="color: #8b5cf6;">Not Found:</strong> 
                  <span style="color: #8b5cf6; font-weight: 600;">${location.not_found_sessions || 0}</span>
                </div>
              </div>
              <div style="font-size: 12px; color: #6b7280; margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
                ${address}
              </div>
            </div>
          `;

          infoWindowRef.current.setContent(contentString);
          infoWindowRef.current.open(mapInstanceRef.current, marker);
        }
      });

      marker.addListener('mouseout', () => {
        if (infoWindowRef.current) {
          infoWindowRef.current.close();
        }
      });

      markersRef.current.push(marker);
      bounds.extend(position);
    });

    if (locations.length > 0) {
      mapInstanceRef.current.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
    }
  };

  const handleLcpNapSelect = (lcpNapId: number | string) => {
    setSelectedLcpNapId(lcpNapId);

    if (lcpNapId === 'all') {
      updateMapMarkers(markers);
    } else {
      const selectedGroup = lcpNapGroups.find(g => g.lcpnap_id === lcpNapId);
      if (selectedGroup) {
        updateMapMarkers(selectedGroup.locations);
      }
    }
  };

  const handleLocationSelect = (location: LocationMarker) => {
    if (!mapInstanceRef.current) return;

    mapInstanceRef.current.setCenter({ lat: location.latitude, lng: location.longitude });
    mapInstanceRef.current.setZoom(15);

    const marker = markersRef.current.find(m => {
      const pos = m.getPosition();
      return pos && pos.lat() === location.latitude && pos.lng() === location.longitude;
    });

    if (marker && infoWindowRef.current) {
      google.maps.event.trigger(marker, 'click');
    }
  };

  const handleMouseDownSidebarResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingSidebar(true);
    sidebarStartXRef.current = e.clientX;
    sidebarStartWidthRef.current = sidebarWidth;
  };

  const handleSaveLocation = () => {
    loadLocations();
  };

  const lcpNapItems: LcpNapItem[] = [
    {
      id: 0,
      name: 'All',
      count: markers.length
    },
    ...lcpNapGroups.map(group => ({
      id: group.lcpnap_id,
      name: group.lcpnap_name,
      count: group.count
    }))
  ];

  const getSelectedGroup = () => {
    if (selectedLcpNapId === 'all') return null;
    return lcpNapGroups.find(g => g.lcpnap_id === selectedLcpNapId);
  };

  const selectedGroup = getSelectedGroup();

  return (
    <div className={`${isDarkMode ? 'bg-gray-950' : 'bg-gray-50'
      } h-full flex overflow-hidden`}>
      <div className={`border-r flex-shrink-0 flex flex-col relative ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
        }`} style={{ width: `${sidebarWidth}px` }}>
        <div className={`p-4 border-b flex-shrink-0 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'
          }`}>
          <div className="flex items-center justify-between mb-1">
            <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>LCP/NAP Locations</h2>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {lcpNapItems.map((item) => (
            <button
              key={item.id === 0 ? 'all' : item.id}
              onClick={() => handleLcpNapSelect(item.id === 0 ? 'all' : item.id)}
              className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
                } ${(item.id === 0 && selectedLcpNapId === 'all') || (item.id !== 0 && selectedLcpNapId === item.id)
                  ? 'bg-orange-500 bg-opacity-20 text-orange-400 font-medium'
                  : isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}
            >
              <div className="flex items-center">
                <MapPin className="h-4 w-4 mr-2" />
                <span>{item.name}</span>
              </div>
              {item.count > 0 && (
                <span className={`px-2 py-1 rounded-full text-xs ${(item.id === 0 && selectedLcpNapId === 'all') || (item.id !== 0 && selectedLcpNapId === item.id)
                  ? 'bg-orange-600 text-white'
                  : isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
                  }`}>
                  {item.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div
          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-orange-500 transition-colors z-10"
          onMouseDown={handleMouseDownSidebarResize}
        />
      </div>

      <div className={`overflow-hidden flex-1 ${isDarkMode ? 'bg-gray-900' : 'bg-white'
        }`}>
        <div className="flex flex-col h-full">
          <div className={`p-4 border-b flex-shrink-0 ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
            }`}>
            <div className="flex items-center justify-between">
              <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>Map View</h3>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 text-white rounded flex items-center gap-2 text-sm transition-colors"
                style={{
                  backgroundColor: colorPalette?.primary || '#ea580c'
                }}
                onMouseEnter={(e) => {
                  if (colorPalette?.accent) {
                    e.currentTarget.style.backgroundColor = colorPalette.accent;
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = colorPalette?.primary || '#ea580c';
                }}
              >
                <MapPin className="h-4 w-4" />
                Add LCPNAP
              </button>
            </div>
          </div>

          <div className="flex-1 relative z-0">
            <div
              ref={mapRef}
              className="absolute inset-0 w-full h-full z-0"
            />

            {isLoading && (
              <div className={`absolute inset-0 bg-opacity-75 flex items-center justify-center z-[1000] ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'
                }`}>
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                  <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>Loading map...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <AddLcpNapLocationModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleSaveLocation}
      />

      {selectedLocation && (
        <div className="flex-shrink-0 overflow-hidden">
          <LcpNapLocationDetails
            location={selectedLocation}
            onClose={() => setSelectedLocation(null)}
          />
        </div>
      )}
    </div>
  );
};

export default LcpNapLocation;
