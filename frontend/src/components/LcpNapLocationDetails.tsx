import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, Linking } from 'react-native';
import { X, ExternalLink } from 'lucide-react-native';
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
  isMobile = false
}) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);

  useEffect(() => {
    const loadTheme = async () => {
      const theme = await AsyncStorage.getItem('theme');
      setIsDarkMode(theme === 'dark');
    };
    loadTheme();
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

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return 'Not available';
    try {
      return new Date(dateStr).toLocaleString();
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <View style={{ height: '100%', flexDirection: 'column', overflow: 'hidden', position: 'relative', width: '100%', borderLeftWidth: !isMobile ? 1 : 0, backgroundColor: isDarkMode ? '#030712' : '#f9fafb', borderLeftColor: isDarkMode ? 'rgba(255,255,255,0.3)' : '#d1d5db' }}>
      <View style={{ padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 }}>
          <Text style={{ fontWeight: '500', maxWidth: isMobile ? 200 : undefined, fontSize: isMobile ? 14 : 16, color: isDarkMode ? '#ffffff' : '#111827' }} numberOfLines={1}>
            {location.lcpnap_name}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable onPress={onClose}>
            <X width={18} height={18} color={isDarkMode ? '#9ca3af' : '#4b5563'} />
          </Pressable>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={{ maxWidth: 672, marginHorizontal: 'auto', paddingVertical: 24, paddingHorizontal: 16, backgroundColor: isDarkMode ? '#030712' : '#f9fafb' }}>
          <View style={{ gap: 16 }}>
            <View style={{ flexDirection: 'row', borderBottomWidth: 1, paddingBottom: 16, borderBottomColor: isDarkMode ? '#1f2937' : '#e5e7eb' }}>
              <Text style={{ width: 160, fontSize: 14, color: isDarkMode ? '#9ca3af' : '#4b5563' }}>LCP:</Text>
              <Text style={{ flex: 1, color: isDarkMode ? '#ffffff' : '#111827' }}>{location.lcp_name}</Text>
            </View>

            <View style={{ flexDirection: 'row', borderBottomWidth: 1, paddingBottom: 16, borderBottomColor: isDarkMode ? '#1f2937' : '#e5e7eb' }}>
              <Text style={{ width: 160, fontSize: 14, color: isDarkMode ? '#9ca3af' : '#4b5563' }}>NAP:</Text>
              <Text style={{ flex: 1, color: isDarkMode ? '#ffffff' : '#111827' }}>{location.nap_name}</Text>
            </View>

            {location.street && (
              <View style={{ flexDirection: 'row', borderBottomWidth: 1, paddingBottom: 16, borderBottomColor: isDarkMode ? '#1f2937' : '#e5e7eb' }}>
                <Text style={{ width: 160, fontSize: 14, color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Street:</Text>
                <Text style={{ flex: 1, color: isDarkMode ? '#ffffff' : '#111827' }}>{location.street}</Text>
              </View>
            )}

            {location.barangay && (
              <View style={{ flexDirection: 'row', borderBottomWidth: 1, paddingBottom: 16, borderBottomColor: isDarkMode ? '#1f2937' : '#e5e7eb' }}>
                <Text style={{ width: 160, fontSize: 14, color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Barangay:</Text>
                <Text style={{ flex: 1, color: isDarkMode ? '#ffffff' : '#111827' }}>{location.barangay}</Text>
              </View>
            )}

            {location.city && (
              <View style={{ flexDirection: 'row', borderBottomWidth: 1, paddingBottom: 16, borderBottomColor: isDarkMode ? '#1f2937' : '#e5e7eb' }}>
                <Text style={{ width: 160, fontSize: 14, color: isDarkMode ? '#9ca3af' : '#4b5563' }}>City:</Text>
                <Text style={{ flex: 1, color: isDarkMode ? '#ffffff' : '#111827' }}>{location.city}</Text>
              </View>
            )}

            {location.region && (
              <View style={{ flexDirection: 'row', borderBottomWidth: 1, paddingBottom: 16, borderBottomColor: isDarkMode ? '#1f2937' : '#e5e7eb' }}>
                <Text style={{ width: 160, fontSize: 14, color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Region:</Text>
                <Text style={{ flex: 1, color: isDarkMode ? '#ffffff' : '#111827' }}>{location.region}</Text>
              </View>
            )}

            {location.port_total !== undefined && (
              <View style={{ flexDirection: 'row', borderBottomWidth: 1, paddingBottom: 16, borderBottomColor: isDarkMode ? '#1f2937' : '#e5e7eb' }}>
                <Text style={{ width: 160, fontSize: 14, color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Port Total:</Text>
                <Text style={{ flex: 1, color: isDarkMode ? '#ffffff' : '#111827' }}>{location.port_total}</Text>
              </View>
            )}

            <View style={{ borderBottomWidth: 1, paddingBottom: 16, borderBottomColor: isDarkMode ? '#1f2937' : '#e5e7eb' }}>
              <Text style={{ width: 160, fontSize: 14, marginBottom: 12, color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Session Status:</Text>
              <View style={{ flex: 1, gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: '#22c55e' }}>Online</Text>
                  <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9999, backgroundColor: isDarkMode ? '#14532d' : '#dcfce7' }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: isDarkMode ? '#86efac' : '#166534' }}>
                      {location.active_sessions || 0}
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: '#fb923c' }}>Offline</Text>
                  <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9999, backgroundColor: isDarkMode ? '#7c2d12' : '#ffedd5' }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: isDarkMode ? '#fdba74' : '#9a3412' }}>
                      {location.offline_sessions || 0}
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Inactive</Text>
                  <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9999, backgroundColor: isDarkMode ? '#374151' : '#f3f4f6' }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: isDarkMode ? '#d1d5db' : '#1f2937' }}>
                      {location.inactive_sessions || 0}
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: '#ef4444' }}>Blocked</Text>
                  <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9999, backgroundColor: isDarkMode ? '#7f1d1d' : '#fee2e2' }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: isDarkMode ? '#fca5a5' : '#991b1b' }}>
                      {location.blocked_sessions || 0}
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: '#a855f7' }}>Not Found</Text>
                  <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9999, backgroundColor: isDarkMode ? '#581c87' : '#f3e8ff' }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: isDarkMode ? '#e9d5ff' : '#6b21a8' }}>
                      {location.not_found_sessions || 0}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={{ flexDirection: 'row', borderBottomWidth: 1, paddingBottom: 16, borderBottomColor: isDarkMode ? '#1f2937' : '#e5e7eb' }}>
              <Text style={{ width: 160, fontSize: 14, color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Coordinates:</Text>
              <Text style={{ flex: 1, color: isDarkMode ? '#ffffff' : '#111827' }}>
                {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
              </Text>
            </View>

            {location.reading_image_url && (
              <View style={{ flexDirection: 'row', borderBottomWidth: 1, paddingVertical: 8, borderBottomColor: isDarkMode ? '#1f2937' : '#e5e7eb' }}>
                <Text style={{ width: 160, fontSize: 14, color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Reading Image</Text>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ flex: 1, marginRight: 8, color: isDarkMode ? '#ffffff' : '#111827' }} numberOfLines={1}>
                    {location.reading_image_url}
                  </Text>
                  <Pressable onPress={() => Linking.openURL(location.reading_image_url || '')}>
                    <ExternalLink width={16} height={16} color={isDarkMode ? '#9ca3af' : '#4b5563'} />
                  </Pressable>
                </View>
              </View>
            )}

            {location.image1_url && (
              <View style={{ flexDirection: 'row', borderBottomWidth: 1, paddingVertical: 8, borderBottomColor: isDarkMode ? '#1f2937' : '#e5e7eb' }}>
                <Text style={{ width: 160, fontSize: 14, color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Image 1</Text>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ flex: 1, marginRight: 8, color: isDarkMode ? '#ffffff' : '#111827' }} numberOfLines={1}>
                    {location.image1_url}
                  </Text>
                  <Pressable onPress={() => Linking.openURL(location.image1_url || '')}>
                    <ExternalLink width={16} height={16} color={isDarkMode ? '#9ca3af' : '#4b5563'} />
                  </Pressable>
                </View>
              </View>
            )}

            {location.image2_url && (
              <View style={{ flexDirection: 'row', borderBottomWidth: 1, paddingVertical: 8, borderBottomColor: isDarkMode ? '#1f2937' : '#e5e7eb' }}>
                <Text style={{ width: 160, fontSize: 14, color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Image 2</Text>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ flex: 1, marginRight: 8, color: isDarkMode ? '#ffffff' : '#111827' }} numberOfLines={1}>
                    {location.image2_url}
                  </Text>
                  <Pressable onPress={() => Linking.openURL(location.image2_url || '')}>
                    <ExternalLink width={16} height={16} color={isDarkMode ? '#9ca3af' : '#4b5563'} />
                  </Pressable>
                </View>
              </View>
            )}

            {location.modified_by && (
              <View style={{ flexDirection: 'row', borderBottomWidth: 1, paddingBottom: 16, borderBottomColor: isDarkMode ? '#1f2937' : '#e5e7eb' }}>
                <Text style={{ width: 160, fontSize: 14, color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Modified By:</Text>
                <Text style={{ flex: 1, color: isDarkMode ? '#ffffff' : '#111827' }}>{location.modified_by}</Text>
              </View>
            )}

            {location.modified_date && (
              <View style={{ flexDirection: 'row', borderBottomWidth: 1, paddingBottom: 16, borderBottomColor: isDarkMode ? '#1f2937' : '#e5e7eb' }}>
                <Text style={{ width: 160, fontSize: 14, color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Modified Date:</Text>
                <Text style={{ flex: 1, color: isDarkMode ? '#ffffff' : '#111827' }}>
                  {formatDate(location.modified_date)}
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default LcpNapLocationDetails;
