import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, ScrollView, useWindowDimensions, ActivityIndicator } from 'react-native';
import { Loader2, MapPin, List, Map } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import AddLcpNapLocationModal from '../modals/AddLcpNapLocationModal';
import LcpNapLocationDetails from '../components/LcpNapLocationDetails';
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
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<LocationMarker | null>(null);
  const mapRef = useRef<MapView>(null);
  const sidebarStartXRef = useRef<number>(0);
  const sidebarStartWidthRef = useRef<number>(0);

  useEffect(() => {
    const checkDarkMode = async () => {
      const theme = await AsyncStorage.getItem('theme');
      setIsDarkMode(theme !== 'light');
    };

    checkDarkMode();
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
    loadLocations();
  }, []);

  useEffect(() => {
    if (markers.length > 0) {
      groupLocationsByLcpNap();
    }
  }, [markers]);

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

        if (locationData.length > 0 && mapRef.current) {
          const coordinates = locationData.map(loc => ({
            latitude: loc.latitude,
            longitude: loc.longitude
          }));
          mapRef.current.fitToCoordinates(coordinates, {
            edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
            animated: true
          });
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

  const handleLcpNapSelect = (lcpNapId: number | string) => {
    setSelectedLcpNapId(lcpNapId);

    if (lcpNapId === 'all') {
      if (markers.length > 0 && mapRef.current) {
        const coordinates = markers.map(loc => ({
          latitude: loc.latitude,
          longitude: loc.longitude
        }));
        mapRef.current.fitToCoordinates(coordinates, {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          animated: true
        });
      }
    } else {
      const selectedGroup = lcpNapGroups.find(g => g.lcpnap_id === lcpNapId);
      if (selectedGroup && selectedGroup.locations.length > 0 && mapRef.current) {
        const coordinates = selectedGroup.locations.map(loc => ({
          latitude: loc.latitude,
          longitude: loc.longitude
        }));
        mapRef.current.fitToCoordinates(coordinates, {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          animated: true
        });
      }
    }
  };

  const handleLocationSelect = (location: LocationMarker) => {
    if (!mapRef.current) return;

    mapRef.current.animateToRegion({
      latitude: location.latitude,
      longitude: location.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01
    }, 1000);

    setSelectedLocation(location);
  };

  const handleMouseDownSidebarResize = (e: any) => {
    setIsResizingSidebar(true);
    sidebarStartXRef.current = e.nativeEvent.pageX;
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

  const getMarkersToDisplay = (): LocationMarker[] => {
    if (selectedLcpNapId === 'all') return markers;
    const group = lcpNapGroups.find(g => g.lcpnap_id === selectedLcpNapId);
    return group ? group.locations : [];
  };

  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const renderLocationItem = (item: LcpNapItem, isHorizontal: boolean = false) => {
    const isSelected = (item.id === 0 && selectedLcpNapId === 'all') || (item.id !== 0 && selectedLcpNapId === item.id);

    return (
      <Pressable
        key={item.id === 0 ? 'all' : item.id}
        onPress={() => handleLcpNapSelect(item.id === 0 ? 'all' : item.id)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: isHorizontal ? 'center' : 'space-between',
          paddingHorizontal: 20,
          paddingVertical: 16,
          backgroundColor: isSelected
            ? (colorPalette?.primary ? `${colorPalette.primary}33` : 'rgba(249, 115, 22, 0.2)')
            : 'transparent',
          borderRadius: 0,
          marginRight: 0,
          borderBottomWidth: isHorizontal && isSelected ? 3 : 0,
          borderColor: isSelected ? (colorPalette?.primary || '#ea580c') : 'transparent',
          minWidth: isHorizontal ? 100 : 'auto'
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <MapPin
            size={16}
            color={isSelected
              ? (colorPalette?.primary || '#fb923c')
              : isDarkMode ? '#d1d5db' : '#374151'
            }
            style={{ marginRight: 8 }}
          />
          <Text style={{
            fontSize: 14,
            color: isSelected
              ? (colorPalette?.primary || '#fb923c')
              : isDarkMode ? '#d1d5db' : '#374151',
            fontWeight: isSelected ? '500' : 'normal'
          }}>{item.name}</Text>
        </View>
        {item.count > 0 && !isHorizontal && (
          <View style={{
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 9999,
            backgroundColor: isSelected
              ? (colorPalette?.primary || '#ea580c')
              : isDarkMode ? '#374151' : '#e5e7eb'
          }}>
            <Text style={{
              fontSize: 12,
              color: isSelected
                ? 'white'
                : isDarkMode ? '#d1d5db' : '#374151'
            }}>{item.count}</Text>
          </View>
        )}
        {item.count > 0 && isHorizontal && (
          <Text style={{
            fontSize: 12,
            marginLeft: 8,
            color: isSelected
              ? (colorPalette?.primary || '#fb923c')
              : isDarkMode ? '#9ca3af' : '#6b7280'
          }}>({item.count})</Text>
        )}
      </Pressable>
    );
  };

  return (
    <View style={{
      height: '100%',
      flexDirection: isTablet ? 'row' : 'column',
      overflow: 'hidden',
      backgroundColor: isDarkMode ? '#030712' : '#f9fafb'
    }}>
      {/* Desktop Sidebar */}
      {isTablet && (
        <View style={{
          width: sidebarWidth,
          borderRightWidth: 1,
          flexShrink: 0,
          flexDirection: 'column',
          position: 'relative',
          backgroundColor: isDarkMode ? '#111827' : '#ffffff',
          borderColor: isDarkMode ? '#374151' : '#e5e7eb'
        }}>
          <View style={{
            padding: 16,
            borderBottomWidth: 1,
            flexShrink: 0,
            borderColor: isDarkMode ? '#374151' : '#e5e7eb'
          }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 4
            }}>
              <Text style={{
                fontSize: 18,
                fontWeight: '600',
                color: isDarkMode ? '#ffffff' : '#111827'
              }}>LCP/NAP Locations</Text>
            </View>
          </View>

          <ScrollView style={{ flex: 1 }}>
            {lcpNapItems.map((item) => renderLocationItem(item, false))}
          </ScrollView>
        </View>
      )}

      {/* Map View Area */}
      <View style={{
        overflow: 'hidden',
        flex: 1,
        backgroundColor: isDarkMode ? '#111827' : '#ffffff'
      }}>
        <View style={{ flexDirection: 'column', height: '100%' }}>
          <View style={{
            padding: 16,
            borderBottomWidth: 1,
            flexShrink: 0,
            backgroundColor: isDarkMode ? '#111827' : '#ffffff',
            borderColor: isDarkMode ? '#374151' : '#e5e7eb'
          }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <Text style={{
                fontSize: 18,
                fontWeight: '600',
                color: isDarkMode ? '#ffffff' : '#111827'
              }}>Map View</Text>
              <Pressable
                onPress={() => setShowAddModal(true)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 4,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  backgroundColor: colorPalette?.primary || '#ea580c'
                }}
              >
                <MapPin size={16} color="white" />
                <Text style={{
                  color: 'white',
                  fontSize: 14
                }}>Add LCPNAP</Text>
              </Pressable>
            </View>
          </View>

          <View style={{ flex: 1, position: 'relative', zIndex: 0 }}>
            <MapView
              ref={mapRef}
              provider={PROVIDER_GOOGLE}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: '100%',
                height: '100%',
                zIndex: 0
              }}
              initialRegion={{
                latitude: 12.8797,
                longitude: 121.7740,
                latitudeDelta: 10,
                longitudeDelta: 10
              }}
              customMapStyle={[
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
              ]}
            >
              {getMarkersToDisplay().map((location) => (
                <Marker
                  key={location.id}
                  coordinate={{
                    latitude: location.latitude,
                    longitude: location.longitude
                  }}
                  title={location.lcpnap_name}
                  description={`LCP: ${location.lcp_name} | NAP: ${location.nap_name}`}
                  pinColor="#22c55e"
                  onPress={() => setSelectedLocation(location)}
                />
              ))}
            </MapView>

            {isLoading && (
              <View style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: isDarkMode ? 'rgba(17, 24, 39, 0.75)' : 'rgba(243, 244, 246, 0.75)',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000
              }}>
                <View style={{
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 12
                }}>
                  <ActivityIndicator size="large" color="#f97316" />
                  <Text style={{
                    fontSize: 14,
                    color: isDarkMode ? '#ffffff' : '#111827'
                  }}>Loading map...</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </View>

      <AddLcpNapLocationModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleSaveLocation}
      />

      {selectedLocation && (
        <View style={{ flexShrink: 0, overflow: 'hidden' }}>
          <LcpNapLocationDetails
            location={selectedLocation}
            onClose={() => setSelectedLocation(null)}
          />
        </View>
      )}

      {/* Mobile Bottom Bar - Horizontal Scroll */}
      {
        !isTablet && (
          <View style={{
            width: '100%',
            backgroundColor: isDarkMode ? '#111827' : '#ffffff',
            borderTopWidth: 1,
            borderColor: isDarkMode ? '#374151' : '#e5e7eb',
            paddingVertical: 0
          }}>
            <ScrollView
              horizontal={true}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 0 }}
            >
              {lcpNapItems.map((item) => renderLocationItem(item, true))}
            </ScrollView>
          </View>
        )
      }
    </View >
  );
};

export default LcpNapLocation;
