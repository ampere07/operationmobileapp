import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, Modal, Alert, ActivityIndicator, Image, useWindowDimensions } from 'react-native';
import { X, Camera, MapPin, ChevronDown, CheckCircle, AlertCircle, Loader2 } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { getRegions, getCities, City } from '../services/cityService';
import { barangayService, Barangay } from '../services/barangayService';
import { locationDetailService, LocationDetail } from '../services/locationDetailService';
import { getActiveImageSize, resizeImage, ImageSizeSetting } from '../services/imageSettingsService';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';
import apiClient from '../config/api';

interface AddLcpNapLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

interface LCP {
  id: number;
  lcp_name: string;
}

interface NAP {
  id: number;
  nap_name: string;
}

interface Region {
  id: number;
  name: string;
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

const AddLcpNapLocationModal: React.FC<AddLcpNapLocationModalProps> = ({
  isOpen,
  onClose,
  onSave,

}) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const modalWidth = isMobile ? '100%' : 600;

  const getCurrentUser = async () => {
    try {
      const authData = await AsyncStorage.getItem('authData');
      if (authData) {
        const user = JSON.parse(authData);
        return user.email || '';
      }
    } catch (error) {
      console.error('Error getting current user:', error);
    }
    return '';
  };

  const [currentUserEmail, setCurrentUserEmail] = useState('');

  const [formData, setFormData] = useState({
    reading_image: null as { uri: string; type: string; name: string } | null,
    street: '',
    barangay: '',
    city: '',
    region: '',
    location: '',
    lcp_name: '',
    nap_name: '',
    port_total: '',
    lcpnap_name: '',
    coordinates: '',
    image: null as { uri: string; type: string; name: string } | null,
    image_2: null as { uri: string; type: string; name: string } | null,
    modified_by: '',
  });

  const [imagePreviews, setImagePreviews] = useState({
    reading_image: null as string | null,
    image: null as string | null,
    image_2: null as string | null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showLoadingModal, setShowLoadingModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loadingPercentage, setLoadingPercentage] = useState(0);
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultType, setResultType] = useState<'success' | 'error'>('success');
  const [resultMessage, setResultMessage] = useState('');
  const [lcpList, setLcpList] = useState<LCP[]>([]);
  const [napList, setNapList] = useState<NAP[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [allCities, setAllCities] = useState<City[]>([]);
  const [allBarangays, setAllBarangays] = useState<Barangay[]>([]);
  const [allLocations, setAllLocations] = useState<LocationDetail[]>([]);
  const [showCoordinatesMap, setShowCoordinatesMap] = useState<boolean>(false);
  const [activeImageSize, setActiveImageSize] = useState<ImageSizeSetting | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);

  useEffect(() => {
    const loadTheme = async () => {
      const theme = await AsyncStorage.getItem('theme');
      setIsDarkMode(theme === 'dark');
      const userEmail = await getCurrentUser();
      setCurrentUserEmail(userEmail);
      setFormData(prev => ({ ...prev, modified_by: userEmail }));
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

  useEffect(() => {
    if (isOpen) {
      // Delay data loading slightly to allow modal animation to start smoothly
      const timer = setTimeout(() => {
        loadDropdownData();
        fetchImageSizeSettings();
        resetForm();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const fetchImageSizeSettings = async () => {
    try {
      const settings = await getActiveImageSize();
      setActiveImageSize(settings);
    } catch (error) {
      setActiveImageSize(null);
    }
  };

  useEffect(() => {
    if (formData.lcp_name && formData.nap_name) {
      const generatedName = `${formData.lcp_name} ${formData.nap_name}`;
      setFormData(prev => ({ ...prev, lcpnap_name: generatedName }));
    }
  }, [formData.lcp_name, formData.nap_name]);

  const loadDropdownData = async () => {
    try {
      const [lcpResponse, napResponse, regionsData, citiesData, barangaysData, locationsData] = await Promise.all([
        apiClient.get<ApiResponse<LCP[]>>('/lcp'),
        apiClient.get<ApiResponse<NAP[]>>('/nap'),
        getRegions(),
        getCities(),
        barangayService.getAll(),
        locationDetailService.getAll()
      ]);

      const lcpData = lcpResponse.data;
      const napData = napResponse.data;

      if (lcpData.success) {
        setLcpList(lcpData.data || []);
      }
      if (napData.success) {
        setNapList(napData.data || []);
      }
      if (Array.isArray(regionsData)) {
        setRegions(regionsData);
      }
      if (Array.isArray(citiesData)) {
        setAllCities(citiesData);
      }
      if (barangaysData.success && Array.isArray(barangaysData.data)) {
        setAllBarangays(barangaysData.data);
      }
      if (locationsData.success && Array.isArray(locationsData.data)) {
        setAllLocations(locationsData.data);
      }
    } catch (error) {
      console.error('Error loading dropdown data:', error);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.lcp_name) {
      newErrors.lcp_name = 'LCP is required';
    }
    if (!formData.nap_name) {
      newErrors.nap_name = 'NAP is required';
    }
    if (!formData.port_total) {
      newErrors.port_total = 'PORT TOTAL is required';
    }
    if (!formData.lcpnap_name.trim()) {
      newErrors.lcpnap_name = 'LCPNAP is required';
    }
    if (!formData.coordinates.trim()) {
      newErrors.coordinates = 'Coordinates is required';
    }
    if (!formData.image) {
      newErrors.image = 'Image is required';
    }
    if (!formData.image_2) {
      newErrors.image_2 = 'Image 2 is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleImageUpload = async (field: 'reading_image' | 'image' | 'image_2') => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Permission to access media library is required');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const fileData = {
          uri: asset.uri,
          type: 'image/jpeg',
          name: `${field}_${Date.now()}.jpg`
        };

        setFormData(prev => ({ ...prev, [field]: fileData }));
        setImagePreviews(prev => ({ ...prev, [field]: asset.uri }));

        if (errors[field]) {
          setErrors(prev => ({ ...prev, [field]: '' }));
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setShowLoadingModal(true);
    setUploadProgress(0);
    setLoadingPercentage(0);

    const progressInterval = setInterval(() => {
      setLoadingPercentage(prev => {
        if (prev >= 99) return 99;
        if (prev >= 90) return prev + 0.5;
        if (prev >= 70) return prev + 1;
        return prev + 3;
      });
    }, 200);

    try {
      const submitData = new FormData();

      console.log('=== FORM SUBMISSION DEBUG START ===');
      console.log('Form Data:', {
        reading_image: formData.reading_image?.name,
        street: formData.street,
        barangay: formData.barangay,
        city: formData.city,
        region: formData.region,
        location: formData.location,
        lcp_name: formData.lcp_name,
        nap_name: formData.nap_name,
        port_total: formData.port_total,
        lcpnap_name: formData.lcpnap_name,
        coordinates: formData.coordinates,
        image: formData.image?.name,
        image_2: formData.image_2?.name,
        modified_by: formData.modified_by,
      });

      if (formData.reading_image) {
        submitData.append('reading_image', formData.reading_image as any);
      }
      submitData.append('street', formData.street);
      submitData.append('barangay', formData.barangay);
      submitData.append('city', formData.city);
      submitData.append('region', formData.region);
      submitData.append('location', formData.location);
      submitData.append('lcp_id', formData.lcp_name);
      submitData.append('nap_id', formData.nap_name);
      submitData.append('port_total', formData.port_total);
      submitData.append('lcpnap_name', formData.lcpnap_name);
      submitData.append('coordinates', formData.coordinates);
      if (formData.image) {
        submitData.append('image', formData.image as any);
      }
      if (formData.image_2) {
        submitData.append('image_2', formData.image_2 as any);
      }
      submitData.append('modified_by', formData.modified_by);

      console.log('Sending POST request to: /lcpnap');

      const response = await apiClient.post<ApiResponse>('/lcpnap', submitData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const data = response.data;
      console.log('Response data:', data);

      if (!data.success) {
        console.error('Request failed:', data);
        throw new Error(data.message || data.error || 'Failed to save LCPNAP');
      }

      console.log('=== FORM SUBMISSION SUCCESS ===');
      clearInterval(progressInterval);
      setLoadingPercentage(100);
      await new Promise(resolve => setTimeout(resolve, 500));
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
      console.error('=== FORM SUBMISSION ERROR ===');
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      console.error('Full error:', error);

      clearInterval(progressInterval);
      setShowLoadingModal(false);
      setResultType('error');
      setResultMessage(error.message || 'Failed to save LCP/NAP location');
      setShowResultModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      reading_image: null,
      street: '',
      barangay: '',
      city: '',
      region: '',
      location: '',
      lcp_name: '',
      nap_name: '',
      port_total: '',
      lcpnap_name: '',
      coordinates: '',
      image: null,
      image_2: null,
      modified_by: currentUserEmail,
    });
    setImagePreviews({
      reading_image: null,
      image: null,
      image_2: null,
    });
    setErrors({});
  };

  const handleRegionChange = (regionName: string) => {
    setFormData(prev => ({
      ...prev,
      region: regionName,
      city: '',
      barangay: '',
      location: ''
    }));
  };

  const handleCityChange = (cityName: string) => {
    setFormData(prev => ({
      ...prev,
      city: cityName,
      barangay: '',
      location: ''
    }));
  };

  const handleBarangayChange = (barangayName: string) => {
    setFormData(prev => ({
      ...prev,
      barangay: barangayName,
      location: ''
    }));
  };

  const getFilteredCities = () => {
    if (!formData.region) return [];
    const selectedRegion = regions.find(reg => reg.name === formData.region);
    if (!selectedRegion) return [];
    return allCities.filter(city => city.region_id === selectedRegion.id);
  };

  const getFilteredBarangays = () => {
    if (!formData.city) return [];
    const selectedCity = allCities.find(city => city.name === formData.city);
    if (!selectedCity) return [];
    return allBarangays.filter(brgy => brgy.city_id === selectedCity.id);
  };

  const getFilteredLocations = () => {
    if (!formData.barangay) return [];
    const selectedBarangay = allBarangays.find(brgy => brgy.barangay === formData.barangay);
    if (!selectedBarangay) return [];
    return allLocations.filter(loc => loc.barangay_id === selectedBarangay.id);
  };

  const filteredCities = getFilteredCities();
  const filteredBarangays = getFilteredBarangays();
  const filteredLocations = getFilteredLocations();

  const handleToggleMap = () => {
    setShowCoordinatesMap(!showCoordinatesMap);
  };

  const ImageUploadField: React.FC<{
    label: string;
    field: 'reading_image' | 'image' | 'image_2';
    required?: boolean;
    error?: string;
  }> = ({ label, field, required, error }) => (
    <View>
      <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#ffffff' : '#111827' }}>
        {label}{required && <Text style={{ color: '#ef4444' }}>*</Text>}
      </Text>
      <Pressable
        onPress={() => handleImageUpload(field)}
        style={{ position: 'relative', width: '100%', height: 192, borderWidth: 1, borderRadius: 4, overflow: 'hidden', backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6', borderColor: isDarkMode ? '#374151' : '#d1d5db' }}
      >
        {imagePreviews[field] ? (
          <View style={{ position: 'relative', width: '100%', height: '100%' }}>
            <Image
              source={{ uri: imagePreviews[field]! }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="contain"
            />
            <View style={{ position: 'absolute', bottom: 8, right: 8, backgroundColor: '#22c55e', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, flexDirection: 'row', alignItems: 'center' }}>
              <Camera width={14} height={14} color="#ffffff" />
              <Text style={{ color: '#ffffff', fontSize: 12, marginLeft: 4 }}>Uploaded</Text>
            </View>
          </View>
        ) : (
          <View style={{ width: '100%', height: '100%', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <Camera width={32} height={32} color={isDarkMode ? '#9ca3af' : '#4b5563'} />
            <Text style={{ fontSize: 14, marginTop: 8, color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Click to upload</Text>
          </View>
        )}
      </Pressable>
      {error && <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{error}</Text>}
    </View>
  );

  const DropdownField: React.FC<{
    label: string;
    value: string;
    options: { label: string; value: string }[];
    onChange: (value: string) => void;
    placeholder: string;
    disabled?: boolean;
    error?: string;
    required?: boolean;
  }> = ({ label, value, options, onChange, placeholder, disabled, error, required }) => {
    const [showOptions, setShowOptions] = useState(false);

    return (
      <View>
        <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#ffffff' : '#111827' }}>
          {label}{required && <Text style={{ color: '#ef4444' }}>*</Text>}
        </Text>
        <View style={{ position: 'relative' }}>
          <Pressable
            onPress={() => !disabled && setShowOptions(!showOptions)}
            disabled={disabled}
            style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 4, borderWidth: 1, borderColor: isDarkMode ? '#374151' : '#d1d5db', backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', opacity: disabled ? 0.5 : 1 }}
          >
            <Text style={{ color: value ? (isDarkMode ? '#ffffff' : '#111827') : (isDarkMode ? '#6b7280' : '#9ca3af') }}>
              {value || placeholder}
            </Text>
          </Pressable>
          <View style={{ position: 'absolute', right: 12, top: 8, pointerEvents: 'none' }}>
            <ChevronDown width={20} height={20} color={isDarkMode ? '#9ca3af' : '#4b5563'} />
          </View>
        </View>
        {showOptions && !disabled && (
          <Modal
            visible={showOptions}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowOptions(false)}
          >
            <Pressable
              style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}
              onPress={() => setShowOptions(false)}
            >
              <View style={{ width: '80%', maxHeight: '60%', borderRadius: 8, backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', padding: 8 }}>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <Pressable
                    onPress={() => {
                      onChange('');
                      setShowOptions(false);
                    }}
                    style={{ paddingVertical: 12, paddingHorizontal: 16 }}
                  >
                    <Text style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>{placeholder}</Text>
                  </Pressable>
                  {options.map((option, index) => (
                    <Pressable
                      key={index}
                      onPress={() => {
                        onChange(option.value);
                        setShowOptions(false);
                      }}
                      style={{ paddingVertical: 12, paddingHorizontal: 16, backgroundColor: value === option.value ? (isDarkMode ? '#374151' : '#f3f4f6') : 'transparent' }}
                    >
                      <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>{option.label}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </Pressable>
          </Modal>
        )}
        {error && <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{error}</Text>}
      </View>
    );
  };



  return (
    <>
      {showLoadingModal && (
        <Modal visible={showLoadingModal} transparent={true} animationType="fade">
          <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 10000, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ borderRadius: 8, padding: 32, flexDirection: 'column', alignItems: 'center', gap: 24, minWidth: 320, backgroundColor: isDarkMode ? '#1f2937' : '#ffffff' }}>
              <Loader2
                width={80}
                height={80}
                color={colorPalette?.primary || '#ea580c'}
              />
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 36, fontWeight: 'bold', color: isDarkMode ? '#ffffff' : '#111827' }}>{loadingPercentage}%</Text>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {showResultModal && (
        <Modal visible={showResultModal} transparent={true} animationType="fade">
          <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 10000, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ borderRadius: 8, padding: 32, flexDirection: 'column', alignItems: 'center', gap: 16, maxWidth: 448, backgroundColor: isDarkMode ? '#1f2937' : '#ffffff' }}>
              {resultType === 'success' ? (
                <>
                  <CheckCircle width={64} height={64} color="#22c55e" />
                  <Text style={{ fontSize: 20, fontWeight: '600', color: isDarkMode ? '#ffffff' : '#111827' }}>Success!</Text>
                  <Text style={{ textAlign: 'center', color: isDarkMode ? '#d1d5db' : '#374151' }}>{resultMessage}</Text>
                </>
              ) : (
                <>
                  <AlertCircle width={64} height={64} color="#ef4444" />
                  <Text style={{ fontSize: 20, fontWeight: '600', color: isDarkMode ? '#ffffff' : '#111827' }}>Error</Text>
                  <Text style={{ textAlign: 'center', color: isDarkMode ? '#d1d5db' : '#374151' }}>{resultMessage}</Text>
                  <Pressable
                    onPress={() => setShowResultModal(false)}
                    style={{ marginTop: 16, paddingHorizontal: 24, paddingVertical: 8, backgroundColor: '#ea580c', borderRadius: 4 }}
                  >
                    <Text style={{ color: '#ffffff' }}>Close</Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        </Modal>
      )}

      <Modal
        visible={isOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={handleClose}
      >
        <Pressable
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9998 }}
          onPress={handleClose}
        />

        <View style={{ position: 'absolute', right: 0, top: 0, height: '100%', width: modalWidth, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, zIndex: 9999, flexDirection: 'column', backgroundColor: isDarkMode ? '#111827' : '#ffffff' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16, paddingTop: isMobile ? 60 : 16, borderBottomWidth: 1, borderBottomColor: isDarkMode ? '#1f2937' : '#d1d5db', backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6' }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: isDarkMode ? '#ffffff' : '#111827' }}>LCP NAP Location Form</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Pressable
                onPress={handleClose}
                style={{ paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderRadius: 4, borderColor: isDarkMode ? '#ea580c' : '#ea580c', backgroundColor: 'transparent' }}
              >
                <Text style={{ color: isDarkMode ? '#fb923c' : '#ea580c' }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSubmit}
                disabled={loading}
                style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 4, backgroundColor: colorPalette?.primary || '#ea580c', opacity: loading ? 0.5 : 1 }}
              >
                <Text style={{ color: '#ffffff' }}>{loading ? 'Saving...' : 'Save'}</Text>
              </Pressable>
            </View>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 24, paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}
          >
            <View style={{ gap: 16 }}>
              <ImageUploadField label="Reading Image" field="reading_image" />

              <View>
                <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#ffffff' : '#111827' }}>Street</Text>
                <TextInput
                  value={formData.street}
                  onChangeText={(value) => setFormData({ ...formData, street: value })}
                  style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 4, borderWidth: 1, borderColor: isDarkMode ? '#374151' : '#d1d5db', backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', color: isDarkMode ? '#ffffff' : '#111827' }}
                  placeholderTextColor={isDarkMode ? '#6b7280' : '#9ca3af'}
                />
              </View>

              <DropdownField
                label="Region"
                value={formData.region}
                options={regions.map(r => ({ label: r.name, value: r.name }))}
                onChange={handleRegionChange}
                placeholder="Select Region"
              />

              <DropdownField
                label="City"
                value={formData.city}
                options={filteredCities.map(c => ({ label: c.name, value: c.name }))}
                onChange={handleCityChange}
                placeholder={formData.region ? 'Select City' : 'All'}
                disabled={!formData.region}
              />

              <DropdownField
                label="Barangay"
                value={formData.barangay}
                options={filteredBarangays.map(b => ({ label: b.barangay, value: b.barangay }))}
                onChange={handleBarangayChange}
                placeholder={formData.city ? 'Select Barangay' : 'All'}
                disabled={!formData.city}
              />

              <DropdownField
                label="Location"
                value={formData.location}
                options={filteredLocations.map(l => ({ label: l.location_name, value: l.location_name }))}
                onChange={(value) => setFormData({ ...formData, location: value })}
                placeholder={formData.barangay ? 'Select Location' : 'All'}
                disabled={!formData.barangay}
              />

              <DropdownField
                label="LCP"
                value={formData.lcp_name}
                options={lcpList.map(lcp => ({ label: lcp.lcp_name, value: lcp.lcp_name }))}
                onChange={(value) => setFormData({ ...formData, lcp_name: value })}
                placeholder="Select LCP"
                required
                error={errors.lcp_name}
              />

              <DropdownField
                label="NAP"
                value={formData.nap_name}
                options={napList.map(nap => ({ label: nap.nap_name, value: nap.nap_name }))}
                onChange={(value) => setFormData({ ...formData, nap_name: value })}
                placeholder="Select NAP"
                required
                error={errors.nap_name}
              />

              <View>
                <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#ffffff' : '#111827' }}>
                  PORT TOTAL<Text style={{ color: '#ef4444' }}>*</Text>
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable
                    onPress={() => setFormData({ ...formData, port_total: '8' })}
                    style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 4, borderWidth: 1, borderColor: formData.port_total === '8' ? '#ea580c' : (isDarkMode ? '#374151' : '#d1d5db'), backgroundColor: formData.port_total === '8' ? '#ea580c' : (isDarkMode ? '#1f2937' : '#ffffff') }}
                  >
                    <Text style={{ textAlign: 'center', color: formData.port_total === '8' ? '#ffffff' : (isDarkMode ? '#d1d5db' : '#374151') }}>8</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setFormData({ ...formData, port_total: '16' })}
                    style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 4, borderWidth: 1, borderColor: formData.port_total === '16' ? '#ea580c' : (isDarkMode ? '#374151' : '#d1d5db'), backgroundColor: formData.port_total === '16' ? '#ea580c' : (isDarkMode ? '#1f2937' : '#ffffff') }}
                  >
                    <Text style={{ textAlign: 'center', color: formData.port_total === '16' ? '#ffffff' : (isDarkMode ? '#d1d5db' : '#374151') }}>16</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setFormData({ ...formData, port_total: '32' })}
                    style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 4, borderWidth: 1, borderColor: formData.port_total === '32' ? '#ea580c' : (isDarkMode ? '#374151' : '#d1d5db'), backgroundColor: formData.port_total === '32' ? '#ea580c' : (isDarkMode ? '#1f2937' : '#ffffff') }}
                  >
                    <Text style={{ textAlign: 'center', color: formData.port_total === '32' ? '#ffffff' : (isDarkMode ? '#d1d5db' : '#374151') }}>32</Text>
                  </Pressable>
                </View>
                {errors.port_total && <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{errors.port_total}</Text>}
              </View>

              <View>
                <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#ffffff' : '#111827' }}>
                  LCPNAP<Text style={{ color: '#ef4444' }}>*</Text>
                </Text>
                <TextInput
                  value={formData.lcpnap_name}
                  editable={false}
                  style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 4, borderWidth: 1, borderColor: isDarkMode ? '#374151' : '#d1d5db', backgroundColor: isDarkMode ? '#374151' : '#f3f4f6', color: isDarkMode ? '#d1d5db' : '#6b7280' }}
                  placeholder="Auto-generated from LCP and NAP"
                  placeholderTextColor={isDarkMode ? '#6b7280' : '#9ca3af'}
                />
                {errors.lcpnap_name && <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{errors.lcpnap_name}</Text>}
                <Text style={{ fontSize: 12, marginTop: 4, color: isDarkMode ? '#9ca3af' : '#6b7280' }}>Format: LCP-XXX NAP-XXX</Text>
              </View>

              <View>
                <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#ffffff' : '#111827' }}>
                  Coordinates<Text style={{ color: '#ef4444' }}>*</Text>
                </Text>
                <View style={{ position: 'relative' }}>
                  <TextInput
                    value={formData.coordinates}
                    onChangeText={(value) => setFormData({ ...formData, coordinates: value })}
                    placeholder="14.466580, 121.201807"
                    placeholderTextColor={isDarkMode ? '#6b7280' : '#9ca3af'}
                    style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 8, paddingRight: 40, borderRadius: 4, borderWidth: 1, borderColor: isDarkMode ? '#374151' : '#d1d5db', backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', color: isDarkMode ? '#ffffff' : '#111827' }}
                  />
                  <Pressable
                    onPress={handleToggleMap}
                    style={{ position: 'absolute', right: 12, top: 8 }}
                  >
                    <MapPin width={20} height={20} color={isDarkMode ? '#9ca3af' : '#4b5563'} />
                  </Pressable>
                </View>
                {errors.coordinates && <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{errors.coordinates}</Text>}

                {showCoordinatesMap && (
                  <View style={{ marginTop: 12, borderWidth: 1, borderRadius: 4, overflow: 'hidden', borderColor: isDarkMode ? '#374151' : '#d1d5db' }}>
                    <View style={{ width: '100%', height: 400, backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>Map Not Available on Mobile</Text>
                    </View>
                    <View style={{ paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6', borderTopColor: isDarkMode ? '#374151' : '#d1d5db' }}>
                      <Text style={{ fontSize: 12, color: isDarkMode ? '#9ca3af' : '#6b7280' }}>Click on the map to set coordinates</Text>
                    </View>
                  </View>
                )}
              </View>

              <ImageUploadField label="Image" field="image" required error={errors.image} />

              <ImageUploadField label="Image 2" field="image_2" required error={errors.image_2} />

              <View>
                <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#ffffff' : '#111827' }}>Modified By</Text>
                <TextInput
                  value={formData.modified_by}
                  editable={false}
                  style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 4, borderWidth: 1, borderColor: isDarkMode ? '#374151' : '#d1d5db', backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6', color: isDarkMode ? '#9ca3af' : '#6b7280' }}
                />
              </View>
            </View>
          </ScrollView>


        </View>
      </Modal>
    </>
  );
};

export default AddLcpNapLocationModal;
