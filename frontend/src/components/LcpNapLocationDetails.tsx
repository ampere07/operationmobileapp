import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, Linking, useWindowDimensions, StyleSheet } from 'react-native';
import { X, ExternalLink, MapPin } from 'lucide-react-native';
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

  const renderImageLink = (label: string, url: string | undefined | null) => {
    if (!url) return null;
    return renderField(label, (
      <View style={styles.imageLinkContainer}>
        <Text style={[styles.imageLinkText, valueStyle]} numberOfLines={1} selectable={true}>
          {url}
        </Text>
        <Pressable onPress={() => Linking.openURL(url)}>
          <ExternalLink width={16} height={16} color={isDarkMode ? '#9ca3af' : '#4b5563'} />
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

          {renderField('Coordinates', `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`)}

          {renderImageLink('Reading Image', location.reading_image_url)}
          {renderImageLink('Image 1', location.image1_url)}
          {renderImageLink('Image 2', location.image2_url)}

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
});

export default LcpNapLocationDetails;
