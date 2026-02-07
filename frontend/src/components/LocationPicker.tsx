import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, Pressable, Platform, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
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
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    if (value && value.trim()) {
      const parts = value.split(',').map(p => p.trim());
      if (parts.length === 2) {
        const lat = parseFloat(parts[0]);
        const lng = parseFloat(parts[1]);
        if (!isNaN(lat) && !isNaN(lng)) {
          setCoordinates({ lat, lng });
          updateMapPosition(lat, lng);
        }
      }
    }
  }, [value]);

  const updateMapPosition = (lat: number, lng: number) => {
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        updateMap(${lat}, ${lng});
        true;
      `);
    }
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'locationSelected') {
        const { lat, lng } = data.payload;
        const roundedLat = parseFloat(lat.toFixed(6));
        const roundedLng = parseFloat(lng.toFixed(6));
        setCoordinates({ lat: roundedLat, lng: roundedLng });
        onChange(`${roundedLat}, ${roundedLng}`);
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  };

  const handleGetCurrentLocation = async () => {
    setIsGettingLocation(true);

    try {
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

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Permission to access location was denied');
        setIsGettingLocation(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 5000
      });

      const { latitude, longitude } = location.coords;
      const roundedLat = parseFloat(latitude.toFixed(6));
      const roundedLng = parseFloat(longitude.toFixed(6));

      setCoordinates({ lat: roundedLat, lng: roundedLng });
      onChange(`${roundedLat}, ${roundedLng}`);
      updateMapPosition(roundedLat, roundedLng);

    } catch (error: any) {
      console.error('Error getting location:', error);
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

  const leafletHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          body { margin: 0; padding: 0; }
          #map { width: 100%; height: 100vh; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map').setView([14.5995, 120.9842], 13);
          var marker;

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
          }).addTo(map);

          function updateMap(lat, lng) {
            if (marker) {
              marker.setLatLng([lat, lng]);
            } else {
              marker = L.marker([lat, lng], { draggable: true }).addTo(map);
              marker.on('dragend', function(e) {
                var position = marker.getLatLng();
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'locationSelected',
                  payload: { lat: position.lat, lng: position.lng }
                }));
              });
            }
            map.setView([lat, lng], 16);
          }

          map.on('click', function(e) {
            var lat = e.latlng.lat;
            var lng = e.latlng.lng;
            
            if (marker) {
              marker.setLatLng([lat, lng]);
            } else {
              marker = L.marker([lat, lng], { draggable: true }).addTo(map);
              marker.on('dragend', function(e) {
                var position = marker.getLatLng();
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'locationSelected',
                  payload: { lat: position.lat, lng: position.lng }
                }));
              });
            }
            
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'locationSelected',
              payload: { lat: lat, lng: lng }
            }));
          });
          
          ${coordinates ? `updateMap(${coordinates.lat}, ${coordinates.lng});` : ''}
        </script>
      </body>
    </html>
  `;

  return (
    <View className="mb-4">
      <Text className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
        {label}{required && <Text className="text-red-500">*</Text>}
      </Text>

      <View className={`border rounded-lg overflow-hidden ${isDarkMode ? 'border-gray-700' : 'border-gray-300'
        } ${error ? 'border-red-500' : ''}`}>
        <View className="relative h-64 w-full bg-gray-200">
          <WebView
            ref={webViewRef}
            originWhitelist={['*']}
            source={{ html: leafletHtml }}
            onMessage={handleWebViewMessage}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            style={{ flex: 1 }}
          />

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
