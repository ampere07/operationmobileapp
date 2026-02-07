import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, Pressable, Platform, Alert } from 'react-native';
import MapView, { Marker, MapPressEvent, Region } from 'react-native-maps';
import { MapPin, Navigation } from 'lucide-react-native';
import * as Location from 'expo-location';

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
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const mapRef = useRef<MapView>(null);

  // Initial coordinates for map center (Manila default)
  const [region, setRegion] = useState<Region>({
    latitude: 14.5995,
    longitude: 120.9842,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  useEffect(() => {
    if (value && value.trim()) {
      const parts = value.split(',').map(p => p.trim());
      if (parts.length === 2) {
        const lat = parseFloat(parts[0]);
        const lng = parseFloat(parts[1]);
        if (!isNaN(lat) && !isNaN(lng)) {
          setCoordinates({ lat, lng });
          setRegion(prev => ({
            ...prev,
            latitude: lat,
            longitude: lng
          }));
        }
      }
    }
  }, [value]);

  const updateCoordinates = (lat: number, lng: number) => {
    const roundedLat = parseFloat(lat.toFixed(6));
    const roundedLng = parseFloat(lng.toFixed(6));
    setCoordinates({ lat: roundedLat, lng: roundedLng });
    onChange(`${roundedLat}, ${roundedLng}`);
  };

  const handleMapPress = (e: MapPressEvent) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    updateCoordinates(latitude, longitude);
  };

  const handleGetCurrentLocation = async () => {
    setIsGettingLocation(true);

    try {
      // 1. Check if location services are enabled
      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        Alert.alert(
          'Location Services Disabled',
          'Please enable location services in your device settings to use this feature.',
          [{ text: 'OK' }]
        );
        setIsGettingLocation(false);
        return;
      }

      // 2. Request permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Permission to access location was denied');
        setIsGettingLocation(false);
        return;
      }

      // 3. Get current position with timeout and accuracy options
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced, // Use Balanced accuracy for better performance/speed
        timeInterval: 5000
      });

      const { latitude, longitude } = location.coords;

      updateCoordinates(latitude, longitude);

      const newRegion = {
        latitude,
        longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      };

      setRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 1000);

    } catch (error: any) {
      console.error('Error getting location:', error);

      // Fallback or detailed error message
      let errorMessage = 'Unable to get your location.';
      if (error.code === 'E_LOCATION_SETTINGS_UNSATISFIED') {
        errorMessage = 'Location settings are not satisfied. Please check your settings.';
      } else if (error.code === 'E_LOCATION_UNAUTHORIZED') {
        errorMessage = 'App is not authorized to use location services.';
      } else if (error.message) {
        errorMessage += ` ${error.message}`;
      }

      Alert.alert('Error', errorMessage);
    } finally {
      setIsGettingLocation(false);
    }
  };

  return (
    <View className="mb-4">
      <Text className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
        {label}{required && <Text className="text-red-500">*</Text>}
      </Text>

      <View className={`border rounded-lg overflow-hidden ${isDarkMode ? 'border-gray-700' : 'border-gray-300'
        } ${error ? 'border-red-500' : ''}`}>
        <View className="relative h-64 w-full bg-gray-200">
          <MapView
            ref={mapRef}
            style={{ width: '100%', height: '100%' }}
            initialRegion={region}
            region={region}
            onRegionChangeComplete={(r) => setRegion(r)}
            onPress={handleMapPress}
          >
            {coordinates && (
              <Marker
                coordinate={{ latitude: coordinates.lat, longitude: coordinates.lng }}
                draggable
                onDragEnd={(e) => updateCoordinates(e.nativeEvent.coordinate.latitude, e.nativeEvent.coordinate.longitude)}
              />
            )}
          </MapView>

          <Pressable
            onPress={handleGetCurrentLocation}
            disabled={isGettingLocation}
            className={`absolute top-2 right-2 px-3 py-2 rounded shadow-lg flex-row items-center space-x-2 z-10 ${isDarkMode
              ? 'bg-gray-800'
              : 'bg-white'
              }`}
          >
            <Navigation size={16} color={isDarkMode ? 'white' : 'black'} className={`${isGettingLocation ? 'opacity-50' : ''}`} />
            <Text className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'} ml-2`}>
              {isGettingLocation ? 'Getting...' : 'Get My Location'}
            </Text>
          </Pressable>
        </View>

        <View className={`p-3 border-t flex-row items-center space-x-2 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
          }`}>
          <MapPin size={16} color={isDarkMode ? '#9CA3AF' : '#4B5563'} />
          <TextInput
            value={coordinates ? `${coordinates.lat}, ${coordinates.lng}` : ''}
            editable={false}
            placeholder="Click on map or use 'Get My Location'"
            placeholderTextColor={isDarkMode ? '#9CA3AF' : '#4B5563'}
            className={`flex-1 px-3 py-2 rounded text-sm ${isDarkMode
              ? 'bg-gray-900 text-gray-300 border-gray-700'
              : 'bg-white text-gray-900 border-gray-300'
              } border`}
          />
        </View>
      </View>

      {error && (
        <View className="flex-row items-center mt-1">
          <View className="flex items-center justify-center w-4 h-4 rounded-full bg-orange-500 mr-2">
            <Text className="text-white text-[10px] font-bold">!</Text>
          </View>
          <Text className="text-orange-500 text-xs">{error}</Text>
        </View>
      )}

      <Text className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        Click on the map to set location or drag the marker
      </Text>
    </View>
  );
};

export default LocationPicker;
