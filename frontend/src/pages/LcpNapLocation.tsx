import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, useWindowDimensions, ActivityIndicator, TextInput, StyleSheet, Modal } from 'react-native';
import { MapPin, Search, Plus } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ExpoLocation from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
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

const parseCoordinates = (coordString: string): { latitude: number; longitude: number } | null => {
  if (!coordString) return null;

  const coords = coordString.split(',').map(c => c.trim());
  if (coords.length !== 2) return null;

  const latitude = parseFloat(coords[0]);
  const longitude = parseFloat(coords[1]);

  if (isNaN(latitude) || isNaN(longitude)) return null;

  return { latitude, longitude };
};

const LcpNapLocation: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [markers, setMarkers] = useState<LocationMarker[]>([]);
  const [selectedLcpNapId, setSelectedLcpNapId] = useState<number | string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [sidebarWidth] = useState<number>(256);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<LocationMarker | null>(null);
  const [userRole, setUserRole] = useState<number | null>(null);

  const mapRef = useRef<MapView>(null);
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  // Consolidate initialization logic
  useEffect(() => {
    const initData = async () => {
      try {
        const [theme, activePalette, authData] = await Promise.all([
          AsyncStorage.getItem('theme'),
          settingsColorPaletteService.getActive(),
          AsyncStorage.getItem('authData')
        ]);

        setIsDarkMode(theme !== 'light');
        setColorPalette(activePalette);
        if (authData) {
          const parsedUser = JSON.parse(authData);
          setUserRole(parsedUser.role_id);
        }
      } catch (err) {
        console.error('Initialization error:', err);
      }
    };

    initData();
  }, []);

  // Request location permissions
  useEffect(() => {
    (async () => {
      let { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Permission to access location was denied');
      }
    })();
  }, []);

  const loadLocations = useCallback(async () => {
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
              lcpnap_name: item.lcpnap_name || 'Unnamed',
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

          try {
            mapRef.current.fitToCoordinates(coordinates, {
              edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
              animated: true
            });
          } catch (e) {
            console.warn('fitToCoordinates failed:', e);
          }
        }
      }
    } catch (error) {
      console.error('Error loading locations:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  // Memoize grouping logic to avoid unnecessary re-calculations
  const lcpNapGroups = useMemo(() => {
    const grouped: { [key: string]: LcpNapGroup } = {};

    markers.forEach(marker => {
      const groupName = marker.lcpnap_name || 'Unnamed';
      if (!grouped[groupName]) {
        grouped[groupName] = {
          lcpnap_id: marker.id,
          lcpnap_name: groupName,
          locations: [],
          count: 0
        };
      }
      grouped[groupName].locations.push(marker);
      grouped[groupName].count++;
    });

    return Object.values(grouped).sort((a, b) =>
      (a.lcpnap_name || '').localeCompare(b.lcpnap_name || '')
    );
  }, [markers]);

  const lcpNapItems = useMemo(() => [
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
  ], [markers.length, lcpNapGroups]);

  const getMarkersToDisplay = useMemo((): LocationMarker[] => {
    let displayedMarkers = markers;

    if (selectedLcpNapId !== 'all') {
      const group = lcpNapGroups.find(g => g.lcpnap_id === selectedLcpNapId);
      displayedMarkers = group ? group.locations : [];
    }

    const query = searchQuery.trim().toLowerCase();
    if (query) {
      displayedMarkers = displayedMarkers.filter(marker =>
        (marker.lcpnap_name || '').toLowerCase().includes(query) ||
        (marker.lcp_name || '').toLowerCase().includes(query) ||
        (marker.nap_name || '').toLowerCase().includes(query)
      );
    }

    return displayedMarkers;
  }, [markers, selectedLcpNapId, lcpNapGroups, searchQuery]);

  const handleMapReady = useCallback(() => {
    if (mapRef.current) {
      try {
        mapRef.current.setMapBoundaries(
          { latitude: 21.1, longitude: 126.6 }, // North East
          { latitude: 4.4, longitude: 114.1 }   // South West
        );
      } catch (e) {
        console.warn('setMapBoundaries failed:', e);
      }
    }
  }, []);

  const handleLcpNapSelect = useCallback((lcpNapId: number | string) => {
    setSelectedLcpNapId(lcpNapId);

    const targetMarkers = lcpNapId === 'all'
      ? markers
      : lcpNapGroups.find(g => g.lcpnap_id === lcpNapId)?.locations || [];

    if (targetMarkers.length > 0 && mapRef.current) {
      const coordinates = targetMarkers.map(loc => ({
        latitude: loc.latitude,
        longitude: loc.longitude
      })).filter(coord =>
        !isNaN(coord.latitude) && !isNaN(coord.longitude) &&
        coord.latitude >= -90 && coord.latitude <= 90 &&
        coord.longitude >= -180 && coord.longitude <= 180
      );

      if (coordinates.length > 0) {
        try {
          mapRef.current.fitToCoordinates(coordinates, {
            edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
            animated: true
          });
        } catch (e) {
          console.warn('fitToCoordinates failed in selection:', e);
        }
      }
    }
  }, [markers, lcpNapGroups, selectedLcpNapId]);

  const handleLocationSelect = useCallback((location: LocationMarker) => {
    if (!mapRef.current) return;

    try {
      mapRef.current.animateToRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01
      }, 1000);
    } catch (e) {
      console.warn('animateToRegion failed:', e);
    }

    setSelectedLocation(location);
  }, []);

  const handleSaveLocation = useCallback(() => {
    loadLocations();
  }, [loadLocations]);

  const renderLocationItem = useCallback((item: LcpNapItem, isHorizontal: boolean = false) => {
    const isSelected = (item.id === 0 && selectedLcpNapId === 'all') || (item.id !== 0 && selectedLcpNapId === item.id);
    const primaryColor = colorPalette?.primary || '#ea580c';
    const textColor = isSelected ? primaryColor : (isDarkMode ? '#d1d5db' : '#374151');

    return (
      <Pressable
        key={item.id === 0 ? 'all' : item.id}
        onPress={() => handleLcpNapSelect(item.id === 0 ? 'all' : item.id)}
        style={[
          styles.locationItem,
          isHorizontal && styles.locationItemHorizontal,
          isSelected && {
            backgroundColor: `${primaryColor}33`,
            borderBottomWidth: isHorizontal ? 3 : 0,
            borderColor: primaryColor,
          }
        ]}
      >
        <View style={styles.locationItemContent}>
          <MapPin
            size={16}
            color={textColor}
            style={styles.iconMargin}
          />
          <Text style={[styles.locationItemText, { color: textColor, fontWeight: isSelected ? '500' : 'normal' }]}>
            {item.name}
          </Text>
        </View>
        {item.count > 0 && !isHorizontal && (
          <View style={[styles.badge, { backgroundColor: isSelected ? primaryColor : (isDarkMode ? '#374151' : '#e5e7eb') }]}>
            <Text style={[styles.badgeText, { color: isSelected ? 'white' : (isDarkMode ? '#d1d5db' : '#374151') }]}>
              {item.count}
            </Text>
          </View>
        )}
        {item.count > 0 && isHorizontal && (
          <Text style={[styles.countText, { color: isSelected ? primaryColor : (isDarkMode ? '#9ca3af' : '#6b7280') }]}>
            ({item.count})
          </Text>
        )}
      </Pressable>
    );
  }, [selectedLcpNapId, colorPalette, isDarkMode, handleLcpNapSelect]);

  const markersToDisplay = getMarkersToDisplay;

  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? '#030712' : '#f9fafb', flexDirection: isTablet ? 'row' : 'column' }]}>
      {/* Desktop Sidebar */}
      {isTablet && userRole !== 2 && (
        <View style={[styles.sidebar, { width: sidebarWidth, backgroundColor: isDarkMode ? '#111827' : '#ffffff', borderColor: isDarkMode ? '#374151' : '#e5e7eb' }]}>
          <View style={[styles.sidebarHeader, { borderColor: isDarkMode ? '#374151' : '#e5e7eb' }]}>
            <Text style={[styles.sidebarTitle, { color: isDarkMode ? '#ffffff' : '#111827' }]}>LCP/NAP Locations</Text>
          </View>

          <ScrollView style={styles.flex1}>
            {lcpNapItems.map((item) => renderLocationItem(item, false))}
          </ScrollView>
        </View>
      )}

      {/* Map View Area */}
      <View style={[styles.flex1, { backgroundColor: isDarkMode ? '#111827' : '#ffffff' }]}>
        <View style={styles.flexColumnFull}>
          <View style={[styles.searchContainer, { backgroundColor: isDarkMode ? '#111827' : '#ffffff', borderColor: isDarkMode ? '#374151' : '#e5e7eb' }]}>
            <View style={[styles.searchWrapper, { backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6', borderColor: isDarkMode ? '#374151' : '#e5e7eb' }]}>
              <Search size={20} color={isDarkMode ? '#9ca3af' : '#6b7280'} style={styles.iconMargin} />
              <TextInput
                style={[styles.searchInput, { color: isDarkMode ? '#ffffff' : '#111827' }]}
                placeholder="Search locations..."
                placeholderTextColor="#9ca3af"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>

          <View style={styles.mapContainer}>
            <MapView
              ref={mapRef}
              style={styles.map}
              initialRegion={{
                latitude: 12.8797,
                longitude: 121.7740,
                latitudeDelta: 12,
                longitudeDelta: 12
              }}
              minZoomLevel={5.8}
              maxZoomLevel={20}
              rotateEnabled={false}
              pitchEnabled={false}
              showsUserLocation={true}
              showsMyLocationButton={true}
              onMapReady={handleMapReady}
            >
              {markersToDisplay.map((location) => (
                <Marker
                  key={location.id}
                  coordinate={{
                    latitude: location.latitude,
                    longitude: location.longitude
                  }}
                  title={location.lcpnap_name}
                  description={`LCP: ${location.lcp_name} | NAP: ${location.nap_name}`}
                  pinColor="#22c55e"
                  onPress={() => handleLocationSelect(location)}
                  tracksViewChanges={false}
                />
              ))}
            </MapView>

            <Pressable
              onPress={() => setShowAddModal(true)}
              style={[styles.addButton, { backgroundColor: colorPalette?.primary || '#ea580c' }]}
            >
              <Plus size={24} color="white" />
            </Pressable>

            {isLoading && (
              <View style={[styles.loaderOverlay, { backgroundColor: isDarkMode ? 'rgba(17, 24, 39, 0.75)' : 'rgba(243, 244, 246, 0.75)' }]}>
                <View style={styles.loaderContent}>
                  <ActivityIndicator size="large" color="#f97316" />
                  <Text style={{ fontSize: 14, color: isDarkMode ? '#ffffff' : '#111827' }}>Loading map...</Text>
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
        isTablet ? (
          <View style={styles.detailsContainer}>
            <LcpNapLocationDetails
              location={selectedLocation}
              onClose={() => setSelectedLocation(null)}
              isMobile={false}
            />
          </View>
        ) : (
          <Modal
            visible={!!selectedLocation}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setSelectedLocation(null)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.mobileDetailsContainer}>
                <LcpNapLocationDetails
                  location={selectedLocation}
                  onClose={() => setSelectedLocation(null)}
                  isMobile={true}
                />
              </View>
            </View>
          </Modal>
        )
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  flex1: {
    flex: 1,
  },
  flexColumnFull: {
    flexDirection: 'column',
    flex: 1,
  },
  sidebar: {
    borderRightWidth: 1,
    flexShrink: 0,
    flexDirection: 'column',
    position: 'relative',
  },
  sidebarHeader: {
    padding: 16,
    borderBottomWidth: 1,
    flexShrink: 0,
  },
  sidebarTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  locationItemHorizontal: {
    justifyContent: 'center',
    minWidth: 100,
  },
  locationItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationItemText: {
    fontSize: 14,
  },
  iconMargin: {
    marginRight: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  badgeText: {
    fontSize: 12,
  },
  countText: {
    fontSize: 12,
    marginLeft: 8,
  },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
    flexShrink: 0,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
    zIndex: 0,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  addButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 1001,
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  loaderContent: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
  },
  detailsContainer: {
    flexShrink: 0,
    overflow: 'hidden',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  mobileDetailsContainer: {
    height: '80%',
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
});

export default LcpNapLocation;
