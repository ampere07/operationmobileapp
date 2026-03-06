import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View, Text, Pressable, TextInput, ScrollView, Modal, Alert,
  Image, Platform, KeyboardAvoidingView, StyleSheet, Keyboard, InteractionManager, ActivityIndicator
} from 'react-native';
import { Camera, CheckCircle, AlertCircle, Loader2, Search, Check, X, ChevronDown } from 'lucide-react-native';
import { FlashList } from '@shopify/flash-list';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { getRegions, getCities, City } from '../services/cityService';
import { barangayService, Barangay } from '../services/barangayService';
import { getActiveImageSize, ImageSizeSetting } from '../services/imageSettingsService';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';
import apiClient from '../config/api';

// ─── Interfaces ────────────────────────────────────────────────────────────────

interface AddLcpNapLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

interface LCP { id: number; lcp_name: string; }
interface NAP { id: number; nap_name: string; }
interface Region { id: number; name: string; }
interface ApiResponse<T = any> { success: boolean; data?: T; message?: string; error?: string; }

// ─── Helper (outside component so it is never recreated) ───────────────────────

async function getCurrentUser(): Promise<string> {
  try {
    const authData = await AsyncStorage.getItem('authData');
    if (authData) {
      const user = JSON.parse(authData);
      return user.email || '';
    }
  } catch (e) {
    console.error('Error getting current user:', e);
  }
  return '';
}

// ─── Sub-components (defined OUTSIDE parent so React doesn't remount them) ────

interface ImageUploadFieldProps {
  label: string;
  field: 'reading_image' | 'image' | 'image_2';
  required?: boolean;
  error?: string;
  previewUri: string | null;
  isDarkMode: boolean;
  onPress: (field: 'reading_image' | 'image' | 'image_2') => void;
}

const ImageUploadField = React.memo<ImageUploadFieldProps>(
  ({ label, field, required, error, previewUri, isDarkMode, onPress }) => (
    <View>
      <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#ffffff' : '#111827' }}>
        {label}{required && <Text style={{ color: '#ef4444' }}>*</Text>}
      </Text>
      <Pressable
        onPress={() => onPress(field)}
        style={{
          width: '100%', height: 192, borderWidth: 1, borderRadius: 4,
          overflow: 'hidden',
          backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6',
          borderColor: isDarkMode ? '#374151' : '#d1d5db',
        }}
      >
        {previewUri ? (
          <View style={{ width: '100%', height: '100%' }}>
            <Image source={{ uri: previewUri }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
            <View style={{
              position: 'absolute', bottom: 8, right: 8, backgroundColor: '#22c55e',
              paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4,
              flexDirection: 'row', alignItems: 'center',
            }}>
              <Camera width={14} height={14} color="#ffffff" />
              <Text style={{ color: '#ffffff', fontSize: 12, marginLeft: 4 }}>Uploaded</Text>
            </View>
          </View>
        ) : (
          <View style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
            <Camera width={32} height={32} color={isDarkMode ? '#9ca3af' : '#4b5563'} />
            <Text style={{ fontSize: 14, marginTop: 8, color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Tap to upload</Text>
          </View>
        )}
      </Pressable>
      {error && <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{error}</Text>}
    </View>
  ),
);

interface DropdownFieldProps {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  error?: string;
  required?: boolean;
  isDarkMode: boolean;
  primaryColor: string;
}

const DropdownField = React.memo<DropdownFieldProps>(
  ({ label, value, options, onChange, placeholder, disabled, error, required, isDarkMode, primaryColor }) => (
    <View style={{ marginBottom: 0 }}>
      <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#d1d5db' : '#374151' }}>
        {label}{required && <Text style={{ color: '#ef4444' }}>*</Text>}
      </Text>
      <View style={{
        borderWidth: 1, borderRadius: 8, overflow: 'hidden',
        borderColor: error ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db'),
        backgroundColor: disabled ? (isDarkMode ? '#374151' : '#f3f4f6') : (isDarkMode ? '#1f2937' : '#ffffff'),
        opacity: disabled ? 0.6 : 1,
      }}>
        <Picker
          selectedValue={value}
          onValueChange={(v) => !disabled && onChange(String(v))}
          enabled={!disabled}
          style={{ color: isDarkMode ? '#fff' : '#000' }}
          dropdownIconColor={isDarkMode ? '#fff' : '#000'}
        >
          <Picker.Item label={placeholder} value="" enabled={false} color={isDarkMode ? '#6b7280' : '#9ca3af'} />
          {options.map((opt, i) => (
            <Picker.Item key={i} label={opt.label} value={opt.value} />
          ))}
        </Picker>
      </View>
      {error && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
          <View style={{
            width: 16, height: 16, borderRadius: 8, backgroundColor: primaryColor,
            alignItems: 'center', justifyContent: 'center', marginRight: 8,
          }}>
            <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>!</Text>
          </View>
          <Text style={{ fontSize: 12, color: primaryColor }}>{error}</Text>
        </View>
      )}
    </View>
  ),
);

// ─── Mini Modal Item Component ──────────────────────────────────────────────
interface MiniModalItemProps {
  label: string;
  isSelected: boolean;
  onPress: (label: string) => void;
  isDarkMode: boolean;
  primaryColor: string;
}

const MiniModalItem = React.memo<MiniModalItemProps>(
  ({ label, isSelected, onPress, isDarkMode, primaryColor }) => (
    <Pressable
      onPress={() => onPress(label)}
      style={({ pressed }) => [
        styles.miniModalItem,
        { backgroundColor: pressed ? (isDarkMode ? 'rgba(124, 58, 237, 0.1)' : '#f3f4f6') : 'transparent' }
      ]}
    >
      <Text style={[styles.miniModalItemText, {
        color: isSelected ? primaryColor : (isDarkMode ? '#e5e7eb' : '#374151'),
        fontWeight: isSelected ? '700' : 'bold',
        flex: 1
      }]}>
        {label}
      </Text>
      {isSelected && <Check size={24} color={primaryColor} />}
    </Pressable>
  ),
);

// Stable HTML — defined once at module level, never recreated
const LEAFLET_HTML = `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>html,body,#map{height:100%;margin:0;padding:0;}</style>
  </head>
  <body>
    <div id="map"></div>
    <script>
      var map = L.map('map',{zoomControl:false}).setView([14.46658,121.201807],16);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap'}).addTo(map);
      var marker = L.marker([14.46658,121.201807],{draggable:false}).addTo(map);
      map.on('click',function(e){
        marker.setLatLng([e.latlng.lat,e.latlng.lng]);
        window.ReactNativeWebView.postMessage(JSON.stringify({lat:e.latlng.lat,lng:e.latlng.lng}));
      });
      function handleUpdate(data){
        if(data&&data.type==='updateLocation'){map.setView([data.lat,data.lng],16);marker.setLatLng([data.lat,data.lng]);}
      }
      document.addEventListener('message',function(e){try{handleUpdate(typeof e.data==='string'?JSON.parse(e.data):e.data);}catch(err){}});
      window.postMessageCustom=function(data){handleUpdate(data);};
    </script>
  </body>
</html>`;

interface MapSectionProps {
  onMapPress: (coords: { latitude: number; longitude: number }) => void;
  onGetMyLocation: () => void;
  isDarkMode: boolean;
  colorPalette: ColorPalette | null;
  webViewRef: React.RefObject<any>;
  loading: boolean;
}

const MapSection = React.memo<MapSectionProps>(
  ({ onMapPress, onGetMyLocation, isDarkMode, colorPalette, webViewRef, loading }) => (
    <View style={{
      marginTop: 12, borderWidth: 1, borderRadius: 8, overflow: 'hidden',
      borderColor: isDarkMode ? '#374151' : '#d1d5db',
    }}>
      <WebView
        ref={webViewRef}
        source={{ html: LEAFLET_HTML }}
        style={{ width: '100%', height: 320 }}
        javaScriptEnabled={true}
        scrollEnabled={false}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.lat && data.lng) onMapPress({ latitude: data.lat, longitude: data.lng });
          } catch (e) { /* ignore */ }
        }}
      />
      <View style={{
        paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1,
        backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6',
        borderTopColor: isDarkMode ? '#374151' : '#e5e7eb',
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <Text style={{ fontSize: 12, color: isDarkMode ? '#9ca3af' : '#6b7280' }}>Tap map to drop pin</Text>
        <Pressable
          onPress={onGetMyLocation}
          disabled={loading}
          style={{
            paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4,
            backgroundColor: loading ? (isDarkMode ? '#374151' : '#d1d5db') : (colorPalette?.primary || '#7c3aed'),
          }}
        >
          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '500' }}>
            {loading ? 'Locating...' : 'Get My Location'}
          </Text>
        </Pressable>
      </View>
    </View>
  ),
);

// ─── Initial form state ────────────────────────────────────────────────────────

const INITIAL_FORM = {
  reading_image: null as { uri: string; type: string; name: string } | null,
  street: '',
  barangay: '',
  city: '',
  region: '',
  lcp_name: '',
  nap_name: '',
  port_total: '',
  lcpnap_name: '',
  coordinates: '',
  image: null as { uri: string; type: string; name: string } | null,
  image_2: null as { uri: string; type: string; name: string } | null,
  modified_by: '',
};

const INITIAL_PREVIEWS = { reading_image: null as string | null, image: null as string | null, image_2: null as string | null };

// ─── Main Component ────────────────────────────────────────────────────────────

const AddLcpNapLocationModal: React.FC<AddLcpNapLocationModalProps> = ({ isOpen, onClose, onSave }) => {

  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [imagePreviews, setImagePreviews] = useState(INITIAL_PREVIEWS);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showLoadingModal, setShowLoadingModal] = useState(false);
  const [loadingPercentage, setLoadingPercentage] = useState(0);
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultType, setResultType] = useState<'success' | 'error'>('success');
  const [resultMessage, setResultMessage] = useState('');
  const [lcpList, setLcpList] = useState<LCP[]>([]);
  const [napList, setNapList] = useState<NAP[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [allCities, setAllCities] = useState<City[]>([]);
  const [allBarangays, setAllBarangays] = useState<Barangay[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);

  const [isLcpMiniModalVisible, setIsLcpMiniModalVisible] = useState(false);
  const [lcpSearch, setLcpSearch] = useState('');

  const [isNapMiniModalVisible, setIsNapMiniModalVisible] = useState(false);
  const [napSearch, setNapSearch] = useState('');

  const webViewRef = useRef<WebView>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const primaryColor = colorPalette?.primary || '#7c3aed';

  // Deferred rendering for heavy modal
  const [isContentReady, setIsContentReady] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const handle = InteractionManager.runAfterInteractions(() => {
        setIsContentReady(true);
      });
      return () => handle.cancel();
    } else {
      setIsContentReady(false);
    }
  }, [isOpen]);

  // ── Bootstrap ─────────────────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      const [theme, email] = await Promise.all([
        AsyncStorage.getItem('theme'),
        getCurrentUser(),
      ]);
      setIsDarkMode(theme === 'dark');
      setCurrentUserEmail(email);
      setFormData(prev => ({ ...prev, modified_by: email }));
    })();
  }, []);

  useEffect(() => {
    settingsColorPaletteService.getActive()
      .then(setColorPalette)
      .catch(e => console.error('Failed to fetch color palette:', e));
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      loadDropdownData();
      fetchImageSizeSettings();
      resetForm();
    }, 150);
    return () => clearTimeout(timer);
  }, [isOpen]);

  // ── Auto-generate lcpnap_name ────────────────────────────────────────────

  useEffect(() => {
    if (formData.lcp_name && formData.nap_name) {
      const generated = `${formData.lcp_name} ${formData.nap_name}`.trim();
      setFormData(prev => ({ ...prev, lcpnap_name: generated }));
    }
  }, [formData.lcp_name, formData.nap_name]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

  // ── Data Loaders ─────────────────────────────────────────────────────────

  const fetchImageSizeSettings = async () => {
    try {
      await getActiveImageSize();
    } catch { /* ignore */ }
  };

  const loadDropdownData = async () => {
    try {
      const [lcpRes, napRes, regionsData, citiesData, barangaysData] = await Promise.all([
        apiClient.get<ApiResponse<LCP[]>>('/lcp'),
        apiClient.get<ApiResponse<NAP[]>>('/nap'),
        getRegions(),
        getCities(),
        barangayService.getAll(),
      ]);

      if (lcpRes.data.success) setLcpList(lcpRes.data.data || []);
      if (napRes.data.success) setNapList(napRes.data.data || []);

      const toArray = (d: any): any[] =>
        Array.isArray(d) ? d : (d?.success && Array.isArray(d.data) ? d.data : []);

      setRegions(toArray(regionsData));
      setAllCities(toArray(citiesData));
      setAllBarangays(toArray(barangaysData));
    } catch (e) {
      console.error('Error loading dropdown data:', e);
    }
  };

  // ── Memoised derived lists ────────────────────────────────────────────────

  const filteredCities = useMemo(() => {
    if (!formData.region) return [];
    const reg = regions.find(r => r.name === formData.region);
    return reg ? allCities.filter(c => c.region_id === reg.id) : [];
  }, [formData.region, regions, allCities]);

  const filteredBarangays = useMemo(() => {
    if (!formData.city) return [];
    const city = allCities.find(c => c.name === formData.city);
    return city ? allBarangays.filter(b => b.city_id === city.id) : [];
  }, [formData.city, allCities, allBarangays]);

  const filteredLcpList = useMemo(() => {
    const query = lcpSearch.toLowerCase();
    if (!query) return lcpList;
    return lcpList.filter(l => l.lcp_name?.toLowerCase().includes(query));
  }, [lcpList, lcpSearch]);

  const filteredNapList = useMemo(() => {
    const query = napSearch.toLowerCase();
    if (!query) return napList;
    return napList.filter(n => n.nap_name?.toLowerCase().includes(query));
  }, [napList, napSearch]);

  // ── Handlers (stable references) ─────────────────────────────────────────

  const resetForm = useCallback(() => {
    setFormData({ ...INITIAL_FORM, modified_by: currentUserEmail });
    setImagePreviews(INITIAL_PREVIEWS);
    setErrors({});
  }, [currentUserEmail]);

  const handleClose = useCallback(() => {
    onClose();
    resetForm();
  }, [onClose, resetForm]);

  const handleRegionChange = useCallback((regionName: string) => {
    setFormData(prev => ({ ...prev, region: regionName, city: '', barangay: '' }));
  }, []);

  const handleCityChange = useCallback((cityName: string) => {
    setFormData(prev => ({ ...prev, city: cityName, barangay: '' }));
  }, []);

  const handleBarangayChange = useCallback((barangayName: string) => {
    setFormData(prev => ({ ...prev, barangay: barangayName }));
  }, []);

  const handleLcpChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, lcp_name: value }));
  }, []);

  const handleNapChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, nap_name: value }));
  }, []);

  const handleStreetChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, street: value }));
  }, []);

  const handleCoordinatesChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, coordinates: value }));
  }, []);

  const handlePortTotalSelect = useCallback((val: string) => {
    setFormData(prev => ({ ...prev, port_total: val }));
  }, []);

  const handleLcpItemPress = useCallback((name: string) => {
    handleLcpChange(name);
    setIsLcpMiniModalVisible(false);
    setLcpSearch('');
    Keyboard.dismiss();
  }, [handleLcpChange]);

  const handleNapItemPress = useCallback((name: string) => {
    handleNapChange(name);
    setIsNapMiniModalVisible(false);
    setNapSearch('');
    Keyboard.dismiss();
  }, [handleNapChange]);

  const renderLcpItem = useCallback(({ item, extraData }: any) => {
    if (!item?.lcp_name) return null;
    return (
      <MiniModalItem
        label={item.lcp_name}
        isSelected={extraData.selectedValue === item.lcp_name}
        onPress={extraData.onPress}
        isDarkMode={extraData.isDarkMode}
        primaryColor={extraData.primaryColor}
      />
    );
  }, []);

  const renderNapItem = useCallback(({ item, extraData }: any) => {
    if (!item?.nap_name) return null;
    return (
      <MiniModalItem
        label={item.nap_name}
        isSelected={extraData.selectedValue === item.nap_name}
        onPress={extraData.onPress}
        isDarkMode={extraData.isDarkMode}
        primaryColor={extraData.primaryColor}
      />
    );
  }, []);

  const handleMapPress = useCallback(({ latitude, longitude }: { latitude: number; longitude: number }) => {
    setFormData(prev => {
      const newCoords = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      if (prev.coordinates === newCoords) return prev;
      return { ...prev, coordinates: newCoords };
    });
  }, []);

  const handleGetMyLocation = useCallback(async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please grant location permissions to use this feature.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;
      const coords = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      setFormData(prev => ({ ...prev, coordinates: coords }));
      const msg = JSON.stringify({ type: 'updateLocation', lat, lng });
      webViewRef.current?.injectJavaScript(
        `if(window.postMessageCustom){window.postMessageCustom(${msg});}else{document.dispatchEvent(new MessageEvent('message',{data:${msg}}));}true;`
      );
    } catch (e) {
      console.error('Error getting location:', e);
      Alert.alert('Error', 'Failed to get your location.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleImageUpload = useCallback(async (field: 'reading_image' | 'image' | 'image_2') => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Required', 'Permission to access media library is required');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const fileData = { uri: asset.uri, type: 'image/jpeg', name: `${field}_${Date.now()}.jpg` };
        setFormData(prev => ({ ...prev, [field]: fileData }));
        setImagePreviews(prev => ({ ...prev, [field]: asset.uri }));
        setErrors(prev => ({ ...prev, [field]: '' }));
      }
    } catch (e) {
      console.error('Error picking image:', e);
      Alert.alert('Error', 'Failed to pick image');
    }
  }, []);

  // ── Validation ───────────────────────────────────────────────────────────

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Debug: log all field values before validation
    console.log('[LCPNAP] validateForm — current formData:', {
      lcpnap_name: formData.lcpnap_name,
      street: formData.street,
      region: formData.region,
      city: formData.city,
      barangay: formData.barangay,
      lcp_name: formData.lcp_name,
      nap_name: formData.nap_name,
      port_total: formData.port_total,
      coordinates: formData.coordinates,
      modified_by: formData.modified_by,
    });

    if (!formData.lcpnap_name.trim()) newErrors.lcpnap_name = 'LCPNAP NAME is required';
    if (!formData.street.trim()) newErrors.street = 'STREET is required';
    if (!formData.region) newErrors.region = 'REGION is required';
    if (!formData.city) newErrors.city = 'CITY is required';
    if (!formData.barangay) newErrors.barangay = 'BARANGAY is required';
    if (!formData.lcp_name) newErrors.lcp_name = 'LCP is required';
    if (!formData.nap_name) newErrors.nap_name = 'NAP is required';
    if (!formData.port_total) newErrors.port_total = 'PORT TOTAL is required';
    if (!formData.coordinates.trim()) newErrors.coordinates = 'Coordinates is required';

    const isValid = Object.keys(newErrors).length === 0;
    console.log('[LCPNAP] validateForm — valid?', isValid, '| errors:', newErrors);

    setErrors(newErrors);
    return isValid;
  };

  // ── Submit ───────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    console.log('[LCPNAP] Save button pressed — running validation...');
    if (!validateForm()) {
      console.log('[LCPNAP] Validation failed — aborting submit');
      return;
    }
    console.log('[LCPNAP] Validation passed — showing loading modal...');

    setLoading(true);
    setShowLoadingModal(true);
    setLoadingPercentage(0);

    progressIntervalRef.current = setInterval(() => {
      setLoadingPercentage(prev => {
        if (prev >= 99) return 99;
        if (prev >= 90) return prev + 0.5;
        if (prev >= 70) return prev + 1;
        return prev + 3;
      });
    }, 200);

    const clearProgress = () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };

    try {
      const submitData = new FormData();
      if (formData.reading_image) submitData.append('reading_image', formData.reading_image as any);
      submitData.append('street', formData.street);
      submitData.append('barangay', formData.barangay);
      submitData.append('city', formData.city);
      submitData.append('region', formData.region);
      submitData.append('lcp_id', formData.lcp_name);
      submitData.append('nap_id', formData.nap_name);
      submitData.append('port_total', formData.port_total);
      submitData.append('lcpnap_name', formData.lcpnap_name);
      submitData.append('coordinates', formData.coordinates);
      if (formData.image) submitData.append('image', formData.image as any);
      if (formData.image_2) submitData.append('image_2', formData.image_2 as any);
      submitData.append('modified_by', formData.modified_by);

      // ── Debug: log every field being sent ──────────────────────────────
      console.log('[LCPNAP] Submitting fields:', {
        street: formData.street,
        barangay: formData.barangay,
        city: formData.city,
        region: formData.region,
        lcp_id: formData.lcp_name,
        nap_id: formData.nap_name,
        port_total: formData.port_total,
        lcpnap_name: formData.lcpnap_name,
        coordinates: formData.coordinates,
        modified_by: formData.modified_by,
        has_reading_image: !!formData.reading_image,
        has_image: !!formData.image,
        has_image_2: !!formData.image_2,
      });

      const response = await apiClient.post<ApiResponse>('/lcpnap', submitData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      console.log('[LCPNAP] Response status:', response.status);
      console.log('[LCPNAP] Response data:', JSON.stringify(response.data, null, 2));

      if (!response.data.success) {
        throw new Error(response.data.message || response.data.error || 'Failed to save LCPNAP');
      }

      clearProgress();
      setLoadingPercentage(100);
      await new Promise(r => setTimeout(r, 400));
      setShowLoadingModal(false);
      setResultType('success');
      setResultMessage('LCP/NAP location created successfully');
      setShowResultModal(true);

      setTimeout(() => {
        setShowResultModal(false);
        onSave();
        handleClose();
      }, 2000);

    } catch (error: any) {
      clearProgress();
      // ── Debug: log the full error response ────────────────────────────
      console.error('[LCPNAP] Save error:', error?.message);
      console.error('[LCPNAP] HTTP status:', error?.response?.status);
      console.error('[LCPNAP] Response data:', JSON.stringify(error?.response?.data, null, 2));
      if (error?.response?.data?.errors) {
        console.error('[LCPNAP] Validation errors:', JSON.stringify(error.response.data.errors, null, 2));
      }
      setShowLoadingModal(false);
      setResultType('error');
      const errMsg = error?.response?.data?.message || error?.message || 'Failed to save LCP/NAP location';
      setResultMessage(errMsg);
      setShowResultModal(true);
    } finally {
      setLoading(false);
    }
  };

  // ── Picker option arrays (memoised) ──────────────────────────────────────

  const regionOptions = useMemo(() => regions.map(r => ({ label: r.name, value: r.name })), [regions]);
  const cityOptions = useMemo(() => filteredCities.map(c => ({ label: c.name, value: c.name })), [filteredCities]);
  const barangayOptions = useMemo(() => filteredBarangays.map(b => ({ label: b.barangay, value: b.barangay })), [filteredBarangays]);
  const lcpOptions = useMemo(() => lcpList.map(l => ({ label: l.lcp_name, value: l.lcp_name })), [lcpList]);
  const napOptions = useMemo(() => napList.map(n => ({ label: n.nap_name, value: n.nap_name })), [napList]);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <>




      {/* Main Modal */}
      <Modal
        visible={isOpen}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={handleClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContainer, { backgroundColor: isDarkMode ? '#111827' : '#f9fafb' }]}>

            {/* Header */}
            <View style={[styles.header, { backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb' }]}>
              <Text style={[styles.headerTitle, { color: isDarkMode ? '#ffffff' : '#111827' }]}>LCPNAP Form</Text>
              <View style={styles.headerActions}>
                <Pressable
                  onPress={handleClose}
                  disabled={loading}
                  style={[styles.cancelButton, { borderColor: loading ? (isDarkMode ? '#374151' : '#e5e7eb') : primaryColor, opacity: loading ? 0.6 : 1 }]}
                >
                  <Text style={[styles.cancelButtonText, { color: loading ? (isDarkMode ? '#4b5563' : '#9ca3af') : primaryColor }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleSubmit}
                  disabled={loading}
                  style={[styles.submitButton, { backgroundColor: loading ? (isDarkMode ? '#4b5563' : '#9ca3af') : primaryColor }]}
                >
                  <Text style={styles.submitButtonText}>{loading ? 'Saving...' : 'Save'}</Text>
                </Pressable>
              </View>
            </View>

            <ScrollView
              style={styles.contentContainer}
              contentContainerStyle={styles.scrollViewContent}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
              {!isContentReady ? (
                <View style={{ height: 400, alignItems: 'center', justifyContent: 'center' }}>
                  <ActivityIndicator size="large" color={primaryColor} />
                </View>
              ) : (
                <View style={{ gap: 16 }}>

                  <ImageUploadField
                    label="Reading Image"
                    field="reading_image"
                    previewUri={imagePreviews.reading_image}
                    isDarkMode={isDarkMode}
                    onPress={handleImageUpload}
                  />

                  {/* Street */}
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#ffffff' : '#111827' }}>
                      Street<Text style={{ color: '#ef4444' }}>*</Text>
                    </Text>
                    <TextInput
                      value={formData.street}
                      onChangeText={handleStreetChange}
                      style={{
                        width: '100%', paddingHorizontal: 12, paddingVertical: 8,
                        borderRadius: 4, borderWidth: 1,
                        borderColor: errors.street ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db'),
                        backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                        color: isDarkMode ? '#ffffff' : '#111827',
                      }}
                      placeholderTextColor={isDarkMode ? '#6b7280' : '#9ca3af'}
                      placeholder="Enter street"
                    />
                    {errors.street && <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{errors.street}</Text>}
                  </View>

                  <DropdownField
                    label="Region" value={formData.region} options={regionOptions}
                    onChange={handleRegionChange} placeholder="Select Region"
                    required error={errors.region} isDarkMode={isDarkMode} primaryColor={primaryColor}
                  />

                  <DropdownField
                    label="City" value={formData.city} options={cityOptions}
                    onChange={handleCityChange} placeholder={formData.region ? 'Select City' : 'All'}
                    disabled={!formData.region} required error={errors.city}
                    isDarkMode={isDarkMode} primaryColor={primaryColor}
                  />

                  <DropdownField
                    label="Barangay" value={formData.barangay} options={barangayOptions}
                    onChange={handleBarangayChange} placeholder={formData.city ? 'Select Barangay' : 'All'}
                    disabled={!formData.city} required error={errors.barangay}
                    isDarkMode={isDarkMode} primaryColor={primaryColor}
                  />

                  {/* LCP Filter Modal Trigger */}
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#ffffff' : '#111827' }}>
                      LCP<Text style={{ color: '#ef4444' }}>*</Text>
                    </Text>
                    <Pressable
                      onPress={() => { setIsLcpMiniModalVisible(true); setLcpSearch(''); }}
                      style={{
                        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                        width: '100%', paddingHorizontal: 16, paddingVertical: 14,
                        borderRadius: 8, borderWidth: 1,
                        borderColor: errors.lcp_name ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db'),
                        backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                      }}
                    >
                      <Text style={{ color: formData.lcp_name ? (isDarkMode ? '#ffffff' : '#111827') : (isDarkMode ? '#6b7280' : '#9ca3af'), fontSize: 16 }}>
                        {formData.lcp_name || 'Select LCP'}
                      </Text>
                      <ChevronDown size={20} color={isDarkMode ? '#9CA3AF' : '#6B7280'} />
                    </Pressable>
                    {errors.lcp_name && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: primaryColor, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
                          <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>!</Text>
                        </View>
                        <Text style={{ fontSize: 12, color: primaryColor }}>{errors.lcp_name}</Text>
                      </View>
                    )}
                  </View>

                  {/* NAP Filter Modal Trigger */}
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#ffffff' : '#111827' }}>
                      NAP<Text style={{ color: '#ef4444' }}>*</Text>
                    </Text>
                    <Pressable
                      onPress={() => { setIsNapMiniModalVisible(true); setNapSearch(''); }}
                      style={{
                        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                        width: '100%', paddingHorizontal: 16, paddingVertical: 14,
                        borderRadius: 8, borderWidth: 1,
                        borderColor: errors.nap_name ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db'),
                        backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                      }}
                    >
                      <Text style={{ color: formData.nap_name ? (isDarkMode ? '#ffffff' : '#111827') : (isDarkMode ? '#6b7280' : '#9ca3af'), fontSize: 16 }}>
                        {formData.nap_name || 'Select NAP'}
                      </Text>
                      <ChevronDown size={20} color={isDarkMode ? '#9CA3AF' : '#6B7280'} />
                    </Pressable>
                    {errors.nap_name && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: primaryColor, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
                          <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>!</Text>
                        </View>
                        <Text style={{ fontSize: 12, color: primaryColor }}>{errors.nap_name}</Text>
                      </View>
                    )}
                  </View>


                  {/* Port Total */}
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#ffffff' : '#111827' }}>
                      PORT TOTAL<Text style={{ color: '#ef4444' }}>*</Text>
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {(['8', '16', '32'] as const).map(val => {
                        const isActive = formData.port_total === val;
                        return (
                          <Pressable
                            key={val}
                            onPress={() => handlePortTotalSelect(val)}
                            style={{
                              flex: 1, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 6,
                              borderWidth: isActive ? 2 : 1,
                              borderColor: isActive ? primaryColor : (isDarkMode ? '#374151' : '#d1d5db'),
                              backgroundColor: isActive ? primaryColor : (isDarkMode ? '#1f2937' : '#ffffff'),
                            }}
                          >
                            <Text style={{ textAlign: 'center', fontWeight: isActive ? '700' : '400', color: isActive ? '#ffffff' : (isDarkMode ? '#d1d5db' : '#374151') }}>
                              {val}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    {errors.port_total && <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{errors.port_total}</Text>}
                  </View>

                  {/* LCPNAP Name (auto-generated) */}
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#ffffff' : '#111827' }}>
                      LCPNAP NAME<Text style={{ color: '#ef4444' }}>*</Text>
                    </Text>
                    <TextInput
                      value={formData.lcpnap_name}
                      editable={false}
                      style={{
                        width: '100%', paddingHorizontal: 12, paddingVertical: 8,
                        borderRadius: 4, borderWidth: 1,
                        borderColor: isDarkMode ? '#374151' : '#d1d5db',
                        backgroundColor: isDarkMode ? '#374151' : '#f3f4f6',
                        color: isDarkMode ? '#d1d5db' : '#6b7280',
                      }}
                      placeholder="Auto-generated from LCP and NAP"
                      placeholderTextColor={isDarkMode ? '#6b7280' : '#9ca3af'}
                    />
                    {errors.lcpnap_name && <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{errors.lcpnap_name}</Text>}
                    <Text style={{ fontSize: 12, marginTop: 4, color: isDarkMode ? '#9ca3af' : '#6b7280' }}>Format: LCP-XXX NAP-XXX</Text>
                  </View>

                  {/* Coordinates + Map */}
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#ffffff' : '#111827' }}>
                      Coordinates<Text style={{ color: '#ef4444' }}>*</Text>
                    </Text>
                    <TextInput
                      value={formData.coordinates}
                      onChangeText={handleCoordinatesChange}
                      placeholder="14.466580, 121.201807"
                      placeholderTextColor={isDarkMode ? '#6b7280' : '#9ca3af'}
                      style={{
                        width: '100%', paddingHorizontal: 12, paddingVertical: 8,
                        borderRadius: 4, borderWidth: 1,
                        borderColor: errors.coordinates ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db'),
                        backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                        color: isDarkMode ? '#ffffff' : '#111827',
                      }}
                    />
                    {errors.coordinates && <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{errors.coordinates}</Text>}

                    <MapSection
                      onMapPress={handleMapPress}
                      onGetMyLocation={handleGetMyLocation}
                      isDarkMode={isDarkMode}
                      colorPalette={colorPalette}
                      webViewRef={webViewRef}
                      loading={loading}
                    />
                  </View>

                  <ImageUploadField
                    label="Image" field="image"
                    previewUri={imagePreviews.image}
                    isDarkMode={isDarkMode} onPress={handleImageUpload}
                  />

                  <ImageUploadField
                    label="Image 2" field="image_2"
                    previewUri={imagePreviews.image_2}
                    isDarkMode={isDarkMode} onPress={handleImageUpload}
                  />

                  {/* Modified By */}
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#ffffff' : '#111827' }}>Modified By</Text>
                    <TextInput
                      value={formData.modified_by}
                      editable={false}
                      style={{
                        width: '100%', paddingHorizontal: 12, paddingVertical: 8,
                        borderRadius: 4, borderWidth: 1,
                        borderColor: isDarkMode ? '#374151' : '#d1d5db',
                        backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6',
                        color: isDarkMode ? '#9ca3af' : '#6b7280',
                      }}
                    />
                  </View>

                </View>
              )}
            </ScrollView>

            {/* Loading overlay — inside modal container, always visible on Android */}
            {showLoadingModal && (
              <View style={styles.inModalOverlay}>
                <View style={[styles.resultCard, { backgroundColor: isDarkMode ? '#1f2937' : '#ffffff' }]}>
                  <Loader2 width={72} height={72} color={primaryColor} />
                  <Text style={{ fontSize: 32, fontWeight: 'bold', marginTop: 16, color: isDarkMode ? '#ffffff' : '#111827' }}>
                    {Math.floor(loadingPercentage)}%
                  </Text>
                </View>
              </View>
            )}

            {/* Result overlay — inside modal container */}
            {showResultModal && (
              <View style={styles.inModalOverlay}>
                <View style={[styles.resultCard, { backgroundColor: isDarkMode ? '#1f2937' : '#ffffff' }]}>
                  {resultType === 'success' ? (
                    <>
                      <CheckCircle width={64} height={64} color="#22c55e" />
                      <Text style={{ fontSize: 20, fontWeight: '600', marginTop: 12, color: isDarkMode ? '#ffffff' : '#111827' }}>Success!</Text>
                      <Text style={{ textAlign: 'center', marginTop: 8, color: isDarkMode ? '#d1d5db' : '#374151' }}>{resultMessage}</Text>
                    </>
                  ) : (
                    <>
                      <AlertCircle width={64} height={64} color="#ef4444" />
                      <Text style={{ fontSize: 20, fontWeight: '600', marginTop: 12, color: isDarkMode ? '#ffffff' : '#111827' }}>Error</Text>
                      <Text style={{ textAlign: 'center', marginTop: 8, color: isDarkMode ? '#d1d5db' : '#374151' }}>{resultMessage}</Text>
                      <Pressable
                        onPress={() => setShowResultModal(false)}
                        style={{ marginTop: 16, paddingHorizontal: 24, paddingVertical: 8, backgroundColor: primaryColor, borderRadius: 6 }}
                      >
                        <Text style={{ color: '#ffffff' }}>Close</Text>
                      </Pressable>
                    </>
                  )}
                </View>
              </View>
            )}

            {/* LCP Selection Mini-Modal */}
            <Modal
              visible={isLcpMiniModalVisible}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setIsLcpMiniModalVisible(false)}
            >
              <View style={styles.miniModalOverlay}>
                <View style={[styles.miniModalContent, { backgroundColor: isDarkMode ? '#1f2937' : '#ffffff' }]}>
                  <View style={[styles.miniModalHeader, { borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb' }]}>
                    <Text style={[styles.miniModalTitle, { color: isDarkMode ? '#ffffff' : '#111827' }]}>Select LCP</Text>
                    <Pressable onPress={() => setIsLcpMiniModalVisible(false)} style={styles.miniModalClose}>
                      <X size={24} color={isDarkMode ? '#9CA3AF' : '#4B5563'} />
                    </Pressable>
                  </View>

                  <View style={styles.miniModalSearchContainer}>
                    <View style={[styles.searchContainer, {
                      backgroundColor: isDarkMode ? '#111827' : '#f9fafb',
                      borderColor: isDarkMode ? '#374151' : '#e5e7eb'
                    }]}>
                      <Search size={18} color={isDarkMode ? '#9CA3AF' : '#4B5563'} />
                      <TextInput
                        placeholder="Search LCP..."
                        value={lcpSearch}
                        onChangeText={setLcpSearch}
                        placeholderTextColor={isDarkMode ? '#9CA3AF' : '#4B5563'}
                        style={[styles.searchInput, { color: isDarkMode ? '#ffffff' : '#111827' }]}
                        autoFocus={true}
                      />
                      {lcpSearch.length > 0 && (
                        <Pressable onPress={() => setLcpSearch('')}>
                          <X size={18} color={isDarkMode ? '#9CA3AF' : '#4B5563'} />
                        </Pressable>
                      )}
                    </View>
                  </View>

                  <View style={{ height: 350, width: '100%' }}>
                    <FlashList
                      data={filteredLcpList}
                      extraData={{ selectedValue: formData.lcp_name, onPress: handleLcpItemPress, isDarkMode, primaryColor }}
                      // @ts-ignore
                      estimatedItemSize={60}
                      keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
                      ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
                      renderItem={renderLcpItem}
                      ListEmptyComponent={
                        <View style={styles.miniModalEmpty}>
                          <Text style={{ color: isDarkMode ? '#9CA3AF' : '#4B5563', fontSize: 16 }}>No results found</Text>
                        </View>
                      }
                      contentContainerStyle={{ paddingHorizontal: 40, paddingBottom: 20 }}
                    />
                  </View>
                </View>
              </View>
            </Modal>

            {/* NAP Selection Mini-Modal */}
            <Modal
              visible={isNapMiniModalVisible}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setIsNapMiniModalVisible(false)}
            >
              <View style={styles.miniModalOverlay}>
                <View style={[styles.miniModalContent, { backgroundColor: isDarkMode ? '#1f2937' : '#ffffff' }]}>
                  <View style={[styles.miniModalHeader, { borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb' }]}>
                    <Text style={[styles.miniModalTitle, { color: isDarkMode ? '#ffffff' : '#111827' }]}>Select NAP</Text>
                    <Pressable onPress={() => setIsNapMiniModalVisible(false)} style={styles.miniModalClose}>
                      <X size={24} color={isDarkMode ? '#9CA3AF' : '#4B5563'} />
                    </Pressable>
                  </View>

                  <View style={styles.miniModalSearchContainer}>
                    <View style={[styles.searchContainer, {
                      backgroundColor: isDarkMode ? '#111827' : '#f9fafb',
                      borderColor: isDarkMode ? '#374151' : '#e5e7eb'
                    }]}>
                      <Search size={18} color={isDarkMode ? '#9CA3AF' : '#4B5563'} />
                      <TextInput
                        placeholder="Search NAP..."
                        value={napSearch}
                        onChangeText={setNapSearch}
                        placeholderTextColor={isDarkMode ? '#9CA3AF' : '#4B5563'}
                        style={[styles.searchInput, { color: isDarkMode ? '#ffffff' : '#111827' }]}
                        autoFocus={true}
                      />
                      {napSearch.length > 0 && (
                        <Pressable onPress={() => setNapSearch('')}>
                          <X size={18} color={isDarkMode ? '#9CA3AF' : '#4B5563'} />
                        </Pressable>
                      )}
                    </View>
                  </View>

                  <View style={{ height: 350, width: '100%' }}>
                    <FlashList
                      data={filteredNapList}
                      extraData={{ selectedValue: formData.nap_name, onPress: handleNapItemPress, isDarkMode, primaryColor }}
                      // @ts-ignore
                      estimatedItemSize={60}
                      keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
                      ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
                      renderItem={renderNapItem}
                      ListEmptyComponent={
                        <View style={styles.miniModalEmpty}>
                          <Text style={{ color: isDarkMode ? '#9CA3AF' : '#4B5563', fontSize: 16 }}>No results found</Text>
                        </View>
                      }
                      contentContainerStyle={{ paddingHorizontal: 40, paddingBottom: 20 }}
                    />
                  </View>
                </View>
              </View>
            </Modal>

          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  inModalOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  resultCard: {
    borderRadius: 12, padding: 32, alignItems: 'center', minWidth: 280, maxWidth: 380,
  },
  modalOverlay: {
    flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    height: '92%', width: '100%',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    overflow: 'hidden', flexDirection: 'column',
  },
  header: {
    paddingHorizontal: 24, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 20, fontWeight: '600' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cancelButton: { paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderRadius: 8 },
  cancelButtonText: { fontSize: 14, fontWeight: '500' },
  submitButton: { paddingHorizontal: 24, paddingVertical: 8, borderRadius: 8 },
  submitButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '500' },
  contentContainer: { flex: 1 },
  scrollViewContent: { padding: 24, paddingBottom: 48 },
  miniModalOverlay: {
    flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  miniModalContent: {
    width: '100%', maxWidth: 400, maxHeight: '80%', borderRadius: 12,
    overflow: 'hidden', elevation: 5, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84,
  },
  miniModalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
  },
  miniModalTitle: { fontSize: 18, fontWeight: '600' },
  miniModalClose: { padding: 4 },
  miniModalSearchContainer: { padding: 12 },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 16 },
  miniModalItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40,
  },
  miniModalItemText: { fontSize: 24, textAlign: 'left' },
  miniModalEmpty: { padding: 24, alignItems: 'center' },
});

export default AddLcpNapLocationModal;
