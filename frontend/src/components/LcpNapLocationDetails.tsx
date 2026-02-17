import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, Linking, useWindowDimensions, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { X, ExternalLink, MapPin, Navigation2 } from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';

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

interface LcpNapLocationDetailsProps {
  location: LocationMarker;
  onClose: () => void;
  isMobile?: boolean;
}

const LcpNapLocationDetails: React.FC<LcpNapLocationDetailsProps> = ({
  location,
  onClose,
  isMobile: propIsMobile = false
}) => {
  const { width } = useWindowDimensions();
  const isMobile = propIsMobile || width < 768;
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      const theme = await AsyncStorage.getItem('theme');
      setIsDarkMode(theme === 'dark');
    };
    loadSettings();
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

  const formatDate = (dateStr: string | undefined): string => {
    if (!dateStr) return 'Not available';
    try {
      return new Date(dateStr).toLocaleString();
    } catch (e) {
      return dateStr;
    }
  };

  const valueStyle = {
    color: isDarkMode ? '#ffffff' : '#111827',
    fontSize: 16,
  };

  const renderField = (label: string, content: React.ReactNode) => (
    <View style={[styles.fieldContainer, { borderBottomColor: isDarkMode ? '#1f2937' : '#e5e7eb' }]}>
      <Text style={[styles.fieldLabel, { color: isDarkMode ? '#9ca3af' : '#6b7280' }]}>{label}</Text>
      <View style={styles.fieldValueContainer}>
        {typeof content === 'string' ? <Text style={valueStyle} selectable={true}>{content}</Text> : content}
      </View>
    </View>
  );

  const getImageUrl = (url: string): string => {
    if (!url) return '';
    if (url.includes('drive.google.com')) {
      // Extract ID from various Google Drive URL formats
      const match = url.match(/\/d\/(.+?)(?:\/|$)/) || url.match(/id=(.+?)(?:&|$)/);
      if (match && match[1]) {
        // Use Google's direct image CDN for better compatibility with React Native
        return `https://lh3.googleusercontent.com/d/${match[1]}`;
      }
    }
    return url;
  };

  const [loadingImages, setLoadingImages] = useState<{ [key: string]: boolean }>({});

  const renderImageField = (label: string, url: string | undefined | null) => {
    if (!url) return null;
    const imageUrl = getImageUrl(url);
    const imageKey = `${label}-${url}`;

    return renderField(label, (
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          resizeMode="cover"
          onLoadStart={() => setLoadingImages(prev => ({ ...prev, [imageKey]: true }))}
          onLoadEnd={() => setLoadingImages(prev => ({ ...prev, [imageKey]: false }))}
        />
        {loadingImages[imageKey] && (
          <View style={[StyleSheet.absoluteFill, styles.imageLoader]}>
            <ActivityIndicator color="#ffffff" />
          </View>
        )}
        <Pressable
          onPress={() => Linking.openURL(url)}
          style={[styles.externalLinkOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
        >
          <View style={styles.externalLinkContent}>
            <ExternalLink width={14} height={14} color="white" />
            <Text style={styles.externalLinkLabel}>View Original</Text>
          </View>
        </Pressable>
      </View>
    ));
  };

  return (
    <View style={[
      styles.container,
      {
        borderLeftWidth: !isMobile ? 1 : 0,
        backgroundColor: isDarkMode ? '#030712' : '#f9fafb',
        borderLeftColor: isDarkMode ? 'rgba(255,255,255,0.3)' : '#d1d5db'
      }
    ]}>
      {/* Header */}
      <View style={[
        styles.header,
        {
          backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
          borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb',
          paddingTop: isMobile ? 60 : 12
        }
      ]}>
        <View style={styles.headerTitleContainer}>
          <Text
            style={[
              styles.headerTitle,
              { fontSize: isMobile ? 18 : 24, color: isDarkMode ? '#ffffff' : '#111827' }
            ]}
            numberOfLines={1}
            selectable={true}
          >
            {location.lcpnap_name}
          </Text>
        </View>

        <Pressable onPress={onClose}>
          <X width={28} height={28} color={isDarkMode ? '#9ca3af' : '#4b5563'} />
        </Pressable>
      </View>

      <ScrollView style={styles.flex1} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {renderField('LCP Name', location.lcp_name)}
          {renderField('NAP Name', location.nap_name)}
          {location.street && renderField('Street', location.street)}
          {location.barangay && renderField('Barangay', location.barangay)}
          {location.city && renderField('City', location.city)}
          {location.region && renderField('Region', location.region)}
          {location.port_total !== undefined && renderField('Port Total', String(location.port_total))}

          {renderField('Session Status', (
            <View style={styles.sessionGrid}>
              <View style={styles.sessionItem}>
                <Text style={[styles.sessionLabel, { color: '#22c55e' }]}>Online</Text>
                <View style={[styles.sessionBadge, { backgroundColor: isDarkMode ? '#14532d' : '#dcfce7' }]}>
                  <Text style={[styles.sessionBadgeText, { color: isDarkMode ? '#86efac' : '#166534' }]}>
                    {location.active_sessions || 0}
                  </Text>
                </View>
              </View>

              <View style={styles.sessionItem}>
                <Text style={[styles.sessionLabel, { color: '#fb923c' }]}>Offline</Text>
                <View style={[styles.sessionBadge, { backgroundColor: isDarkMode ? '#7c2d12' : '#ffedd5' }]}>
                  <Text style={[styles.sessionBadgeText, { color: isDarkMode ? '#fdba74' : '#9a3412' }]}>
                    {location.offline_sessions || 0}
                  </Text>
                </View>
              </View>

              <View style={styles.sessionItem}>
                <Text style={[styles.sessionLabel, { color: isDarkMode ? '#9ca3af' : '#4b5563' }]}>Inactive</Text>
                <View style={[styles.sessionBadge, { backgroundColor: isDarkMode ? '#374151' : '#f3f4f6' }]}>
                  <Text style={[styles.sessionBadgeText, { color: isDarkMode ? '#d1d5db' : '#1f2937' }]}>
                    {location.inactive_sessions || 0}
                  </Text>
                </View>
              </View>

              <View style={styles.sessionItem}>
                <Text style={[styles.sessionLabel, { color: '#ef4444' }]}>Blocked</Text>
                <View style={[styles.sessionBadge, { backgroundColor: isDarkMode ? '#7f1d1d' : '#fee2e2' }]}>
                  <Text style={[styles.sessionBadgeText, { color: isDarkMode ? '#fca5a5' : '#991b1b' }]}>
                    {location.blocked_sessions || 0}
                  </Text>
                </View>
              </View>

              <View style={styles.sessionItem}>
                <Text style={[styles.sessionLabel, { color: '#a855f7' }]}>Not Found</Text>
                <View style={[styles.sessionBadge, { backgroundColor: isDarkMode ? '#581c87' : '#f3e8ff' }]}>
                  <Text style={[styles.sessionBadgeText, { color: isDarkMode ? '#e9d5ff' : '#6b21a8' }]}>
                    {location.not_found_sessions || 0}
                  </Text>
                </View>
              </View>
            </View>
          ))}

          {renderField('Coordinates', (
            <View style={styles.coordinatesContainer}>
              <View style={styles.miniMapWrapper}>
                <WebView
                  scrollEnabled={false}
                  source={{
                    html: `
                      <!DOCTYPE html>
                      <html>
                      <head>
                          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                          <style>
                              body { margin: 0; padding: 0; background: ${isDarkMode ? '#1f2937' : '#f3f4f6'}; }
                              #map { height: 100vh; width: 100vw; }
                              .leaflet-marker-icon { border: 2px solid white; border-radius: 50%; background: #22c55e !important; width: 12px !important; height: 12px !important; margin-left: -8px !important; margin-top: -8px !important; box-shadow: 0 2px 4px rgba(0,0,0,0.3); }
                              .leaflet-marker-shadow { display: none; }
                          </style>
                      </head>
                      <body>
                          <div id="map"></div>
                          <script>
                              var map = L.map('map', {
                                  zoomControl: false,
                                  attributionControl: false,
                                  dragging: false,
                                  touchZoom: false,
                                  doubleClickZoom: false,
                                  scrollWheelZoom: false,
                                  boxZoom: false
                              }).setView([${location.latitude}, ${location.longitude}], 16);
                              
                              L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                                  maxZoom: 19
                              }).addTo(map);

                              var greenIcon = L.divIcon({
                                  className: 'leaflet-marker-icon'
                              });

                              L.marker([${location.latitude}, ${location.longitude}], {icon: greenIcon}).addTo(map);
                          </script>
                      </body>
                      </html>
                    `
                  }}
                  style={styles.miniMap}
                />
              </View>
              <View style={styles.latLongRow}>
                <Text style={[styles.latLongLabel, { color: isDarkMode ? '#9ca3af' : '#6b7280' }]}>
                  Lat & Long:
                </Text>
                <Text style={[styles.latLongValue, { color: isDarkMode ? '#ffffff' : '#111827' }]} selectable={true}>
                  {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                </Text>
              </View>
            </View>
          ))}

          {renderImageField('Reading Image', location.reading_image_url)}
          {renderImageField('Image 1', location.image1_url)}
          {renderImageField('Image 2', location.image2_url)}

          {location.modified_by && renderField('Modified By', location.modified_by)}
          {location.modified_date && renderField('Modified Date', formatDate(location.modified_date))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  header: {
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontWeight: '500',
  },
  flex1: {
    flex: 1,
  },
  content: {
    width: '100%',
    paddingVertical: 8,
  },
  fieldContainer: {
    flexDirection: 'column',
    borderBottomWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 2,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  fieldValueContainer: {
    width: '100%',
  },
  imageLinkContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  imageLinkText: {
    flex: 1,
    marginRight: 8,
  },
  sessionGrid: {
    flex: 1,
    gap: 8,
    marginTop: 4,
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sessionLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  sessionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  sessionBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  imageContainer: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 8,
    position: 'relative',
    backgroundColor: '#1f2937',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  externalLinkOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  externalLinkContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  externalLinkLabel: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  imageLoader: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  coordinatesContainer: {
    marginTop: 8,
    gap: 12,
  },
  miniMapWrapper: {
    height: 150,
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  miniMap: {
    ...StyleSheet.absoluteFillObject,
  },
  miniMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  miniMarkerInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  latLongRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  latLongLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  latLongValue: {
    fontSize: 15,
  },
});

export default LcpNapLocationDetails;
