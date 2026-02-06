import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, Modal, ActivityIndicator, Alert } from 'react-native';
import { X } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';

interface AddApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  editingApplication?: ApplicationData | null;
}

interface ApplicationData {
  id?: string;
  first_name: string;
  middle_initial?: string;
  last_name: string;
  email_address: string;
  mobile_number: string;
  secondary_mobile_number?: string;
  installation_address: string;
  landmark?: string;
  region?: string;
  city?: string;
  barangay?: string;
  location?: string;
  desired_plan: string;
  promo?: string;
  referred_by?: string;
  status: string;
  terms_and_conditions: boolean;
  government_valid_id?: string;
}

const AddApplicationModal: React.FC<AddApplicationModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingApplication
}) => {
  const [formData, setFormData] = useState<ApplicationData>({
    first_name: '',
    middle_initial: '',
    last_name: '',
    email_address: '',
    mobile_number: '',
    secondary_mobile_number: '',
    installation_address: '',
    landmark: '',
    region: '',
    city: '',
    barangay: '',
    location: '',
    desired_plan: '',
    promo: '',
    referred_by: '',
    status: 'pending',
    terms_and_conditions: false,
    government_valid_id: ''
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
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

  const statusOptions = [
    { value: 'pending', label: 'Pending', color: '#fb923c' },
    { value: 'schedule', label: 'Scheduled', color: '#4ade80' },
    { value: 'no facility', label: 'No Facility', color: '#f87171' },
    { value: 'cancelled', label: 'Cancelled', color: '#ef4444' },
    { value: 'no slot', label: 'No Slot', color: '#facc15' },
    { value: 'duplicate', label: 'Duplicate', color: '#eab308' },
    { value: 'in progress', label: 'In Progress', color: '#60a5fa' },
    { value: 'completed', label: 'Completed', color: '#4ade80' }
  ];

  useEffect(() => {
    if (isOpen && editingApplication) {
      setFormData({
        first_name: editingApplication.first_name || '',
        middle_initial: editingApplication.middle_initial || '',
        last_name: editingApplication.last_name || '',
        email_address: editingApplication.email_address || '',
        mobile_number: editingApplication.mobile_number || '',
        secondary_mobile_number: editingApplication.secondary_mobile_number || '',
        installation_address: editingApplication.installation_address || '',
        landmark: editingApplication.landmark || '',
        region: editingApplication.region || '',
        city: editingApplication.city || '',
        barangay: editingApplication.barangay || '',
        location: editingApplication.location || '',
        desired_plan: editingApplication.desired_plan || '',
        promo: editingApplication.promo || '',
        referred_by: editingApplication.referred_by || '',
        status: editingApplication.status || 'pending',
        terms_and_conditions: editingApplication.terms_and_conditions || false,
        government_valid_id: editingApplication.government_valid_id || ''
      });
    } else if (isOpen && !editingApplication) {
      resetForm();
    }
  }, [isOpen, editingApplication]);

  const resetForm = () => {
    setFormData({
      first_name: '',
      middle_initial: '',
      last_name: '',
      email_address: '',
      mobile_number: '',
      secondary_mobile_number: '',
      installation_address: '',
      landmark: '',
      region: '',
      city: '',
      barangay: '',
      location: '',
      desired_plan: '',
      promo: '',
      referred_by: '',
      status: 'pending',
      terms_and_conditions: false,
      government_valid_id: ''
    });
    setErrors({});
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required';
    }

    if (!formData.email_address.trim()) {
      newErrors.email_address = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email_address)) {
      newErrors.email_address = 'Invalid email address format';
    }

    if (!formData.mobile_number.trim()) {
      newErrors.mobile_number = 'Mobile number is required';
    } else if (!/^[0-9]{10,11}$/.test(formData.mobile_number)) {
      newErrors.mobile_number = 'Mobile number must be 10-11 digits';
    }

    if (formData.secondary_mobile_number && !/^[0-9]{10,11}$/.test(formData.secondary_mobile_number)) {
      newErrors.secondary_mobile_number = 'Secondary mobile number must be 10-11 digits';
    }

    if (!formData.installation_address.trim()) {
      newErrors.installation_address = 'Installation address is required';
    }

    if (!formData.desired_plan.trim()) {
      newErrors.desired_plan = 'Desired plan is required';
    }

    if (!formData.terms_and_conditions) {
      newErrors.terms_and_conditions = 'You must agree to the terms and conditions';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const payload = {
        first_name: formData.first_name.trim(),
        middle_initial: formData.middle_initial?.trim() || '',
        last_name: formData.last_name.trim(),
        email_address: formData.email_address.trim(),
        mobile_number: formData.mobile_number.trim(),
        secondary_mobile_number: formData.secondary_mobile_number?.trim() || '',
        installation_address: formData.installation_address.trim(),
        landmark: formData.landmark?.trim() || '',
        region: formData.region?.trim() || '',
        city: formData.city?.trim() || '',
        barangay: formData.barangay?.trim() || '',
        location: formData.location?.trim() || '',
        desired_plan: formData.desired_plan.trim(),
        promo: formData.promo?.trim() || '',
        referred_by: formData.referred_by?.trim() || '',
        status: formData.status,
        terms_and_conditions: formData.terms_and_conditions,
        government_valid_id: formData.government_valid_id?.trim() || ''
      };

      const url = editingApplication 
        ? `${API_BASE_URL}/applications/${editingApplication.id}`
        : `${API_BASE_URL}/applications`;
      
      const method = editingApplication ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        Alert.alert('Success', data.message || `Application ${editingApplication ? 'updated' : 'created'} successfully`);
        onSave();
        handleClose();
      } else {
        if (data.errors) {
          const errorMessages = Object.values(data.errors).flat().join('\n');
          Alert.alert('Validation Errors', errorMessages);
        } else {
          Alert.alert('Error', data.message || `Failed to ${editingApplication ? 'update' : 'create'} application`);
        }
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      Alert.alert('Error', `Failed to ${editingApplication ? 'update' : 'create'} application: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal
      visible={isOpen}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', alignItems: 'flex-end' }}>
        <Pressable
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
          onPress={handleClose}
        />
        
        <View 
          style={{ height: '100%', width: '100%', maxWidth: 672, shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.25, shadowRadius: 24, overflow: 'hidden', flexDirection: 'column', backgroundColor: isDarkMode ? '#111827' : '#ffffff' }}
        >
          <View style={{ paddingHorizontal: 24, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6', borderBottomColor: isDarkMode ? '#374151' : '#d1d5db' }}>
            <Text style={{ fontSize: 20, fontWeight: '600', color: isDarkMode ? '#ffffff' : '#111827' }}>
              {editingApplication ? 'Edit Application' : 'New Application'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Pressable
                onPress={handleClose}
                style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 4, backgroundColor: isDarkMode ? '#374151' : '#e5e7eb' }}
              >
                <Text style={{ fontSize: 14, color: isDarkMode ? '#ffffff' : '#111827' }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSubmit}
                disabled={loading}
                style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 4, flexDirection: 'row', alignItems: 'center', backgroundColor: colorPalette?.primary || '#ea580c', opacity: loading ? 0.5 : 1 }}
              >
                {loading ? (
                  <>
                    <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 8 }} />
                    <Text style={{ color: '#ffffff', fontSize: 14 }}>Saving...</Text>
                  </>
                ) : (
                  <Text style={{ color: '#ffffff', fontSize: 14 }}>Save</Text>
                )}
              </Pressable>
              <Pressable onPress={handleClose}>
                <X width={24} height={24} color={isDarkMode ? '#9ca3af' : '#4b5563'} />
              </Pressable>
            </View>
          </View>

          <ScrollView style={{ flex: 1, padding: 24 }} showsVerticalScrollIndicator={false}>
            <View style={{ gap: 24 }}>
              <View>
                <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                  Status<Text style={{ color: '#ef4444' }}>*</Text>
                </Text>
                <View style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 4, borderWidth: 1, borderColor: isDarkMode ? '#374151' : '#d1d5db', backgroundColor: isDarkMode ? '#1f2937' : '#ffffff' }}>
                  {statusOptions.map(option => (
                    <Pressable
                      key={option.value}
                      onPress={() => setFormData({ ...formData, status: option.value })}
                      style={{ paddingVertical: 8 }}
                    >
                      <Text style={{ color: formData.status === option.value ? option.color : (isDarkMode ? '#ffffff' : '#111827') }}>
                        {option.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 16 }}>
                <View style={{ flex: 2 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                    First Name<Text style={{ color: '#ef4444' }}>*</Text>
                  </Text>
                  <TextInput
                    value={formData.first_name}
                    onChangeText={(value) => setFormData({ ...formData, first_name: value })}
                    placeholder="Enter first name"
                    placeholderTextColor={isDarkMode ? '#6b7280' : '#9ca3af'}
                    style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 4, borderWidth: 1, borderColor: errors.first_name ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db'), backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', color: isDarkMode ? '#ffffff' : '#111827' }}
                  />
                  {errors.first_name && <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{errors.first_name}</Text>}
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                    M.I.
                  </Text>
                  <TextInput
                    maxLength={2}
                    value={formData.middle_initial}
                    onChangeText={(value) => setFormData({ ...formData, middle_initial: value })}
                    placeholder="M.I."
                    placeholderTextColor={isDarkMode ? '#6b7280' : '#9ca3af'}
                    style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 4, borderWidth: 1, borderColor: isDarkMode ? '#374151' : '#d1d5db', backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', color: isDarkMode ? '#ffffff' : '#111827' }}
                  />
                </View>
              </View>

              <View>
                <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                  Last Name<Text style={{ color: '#ef4444' }}>*</Text>
                </Text>
                <TextInput
                  value={formData.last_name}
                  onChangeText={(value) => setFormData({ ...formData, last_name: value })}
                  placeholder="Enter last name"
                  placeholderTextColor={isDarkMode ? '#6b7280' : '#9ca3af'}
                  style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 4, borderWidth: 1, borderColor: errors.last_name ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db'), backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', color: isDarkMode ? '#ffffff' : '#111827' }}
                />
                {errors.last_name && <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{errors.last_name}</Text>}
              </View>

              <View>
                <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                  Email Address<Text style={{ color: '#ef4444' }}>*</Text>
                </Text>
                <TextInput
                  keyboardType="email-address"
                  value={formData.email_address}
                  onChangeText={(value) => setFormData({ ...formData, email_address: value })}
                  placeholder="example@email.com"
                  placeholderTextColor={isDarkMode ? '#6b7280' : '#9ca3af'}
                  style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 4, borderWidth: 1, borderColor: errors.email_address ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db'), backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', color: isDarkMode ? '#ffffff' : '#111827' }}
                />
                {errors.email_address && <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{errors.email_address}</Text>}
              </View>

              <View>
                <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                  Mobile Number<Text style={{ color: '#ef4444' }}>*</Text>
                </Text>
                <TextInput
                  keyboardType="phone-pad"
                  value={formData.mobile_number}
                  onChangeText={(value) => setFormData({ ...formData, mobile_number: value.replace(/\D/g, '') })}
                  placeholder="09123456789"
                  placeholderTextColor={isDarkMode ? '#6b7280' : '#9ca3af'}
                  maxLength={11}
                  style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 4, borderWidth: 1, borderColor: errors.mobile_number ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db'), backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', color: isDarkMode ? '#ffffff' : '#111827' }}
                />
                {errors.mobile_number && <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{errors.mobile_number}</Text>}
              </View>

              <View>
                <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                  Second Mobile Number
                </Text>
                <TextInput
                  keyboardType="phone-pad"
                  value={formData.secondary_mobile_number}
                  onChangeText={(value) => setFormData({ ...formData, secondary_mobile_number: value.replace(/\D/g, '') })}
                  placeholder="09123456789"
                  placeholderTextColor={isDarkMode ? '#6b7280' : '#9ca3af'}
                  maxLength={11}
                  style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 4, borderWidth: 1, borderColor: errors.secondary_mobile_number ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db'), backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', color: isDarkMode ? '#ffffff' : '#111827' }}
                />
                {errors.secondary_mobile_number && <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{errors.secondary_mobile_number}</Text>}
              </View>

              <View>
                <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                  Installation Address<Text style={{ color: '#ef4444' }}>*</Text>
                </Text>
                <TextInput
                  multiline
                  numberOfLines={3}
                  value={formData.installation_address}
                  onChangeText={(value) => setFormData({ ...formData, installation_address: value })}
                  placeholder="Enter full installation address"
                  placeholderTextColor={isDarkMode ? '#6b7280' : '#9ca3af'}
                  style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 4, borderWidth: 1, borderColor: errors.installation_address ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db'), backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', color: isDarkMode ? '#ffffff' : '#111827', textAlignVertical: 'top' }}
                />
                {errors.installation_address && <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{errors.installation_address}</Text>}
              </View>

              <View>
                <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                  Landmark
                </Text>
                <TextInput
                  value={formData.landmark}
                  onChangeText={(value) => setFormData({ ...formData, landmark: value })}
                  placeholder="Nearby landmark"
                  placeholderTextColor={isDarkMode ? '#6b7280' : '#9ca3af'}
                  style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 4, borderWidth: 1, borderColor: isDarkMode ? '#374151' : '#d1d5db', backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', color: isDarkMode ? '#ffffff' : '#111827' }}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 16 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                    Region
                  </Text>
                  <TextInput
                    value={formData.region}
                    onChangeText={(value) => setFormData({ ...formData, region: value })}
                    placeholder="Region"
                    placeholderTextColor={isDarkMode ? '#6b7280' : '#9ca3af'}
                    style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 4, borderWidth: 1, borderColor: isDarkMode ? '#374151' : '#d1d5db', backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', color: isDarkMode ? '#ffffff' : '#111827' }}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                    City
                  </Text>
                  <TextInput
                    value={formData.city}
                    onChangeText={(value) => setFormData({ ...formData, city: value })}
                    placeholder="City"
                    placeholderTextColor={isDarkMode ? '#6b7280' : '#9ca3af'}
                    style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 4, borderWidth: 1, borderColor: isDarkMode ? '#374151' : '#d1d5db', backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', color: isDarkMode ? '#ffffff' : '#111827' }}
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 16 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                    Barangay
                  </Text>
                  <TextInput
                    value={formData.barangay}
                    onChangeText={(value) => setFormData({ ...formData, barangay: value })}
                    placeholder="Barangay"
                    placeholderTextColor={isDarkMode ? '#6b7280' : '#9ca3af'}
                    style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 4, borderWidth: 1, borderColor: isDarkMode ? '#374151' : '#d1d5db', backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', color: isDarkMode ? '#ffffff' : '#111827' }}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                    Location
                  </Text>
                  <TextInput
                    value={formData.location}
                    onChangeText={(value) => setFormData({ ...formData, location: value })}
                    placeholder="Specific location"
                    placeholderTextColor={isDarkMode ? '#6b7280' : '#9ca3af'}
                    style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 4, borderWidth: 1, borderColor: isDarkMode ? '#374151' : '#d1d5db', backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', color: isDarkMode ? '#ffffff' : '#111827' }}
                  />
                </View>
              </View>

              <View>
                <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                  Desired Plan<Text style={{ color: '#ef4444' }}>*</Text>
                </Text>
                <TextInput
                  value={formData.desired_plan}
                  onChangeText={(value) => setFormData({ ...formData, desired_plan: value })}
                  placeholder="e.g., FLASH, TURBO, etc."
                  placeholderTextColor={isDarkMode ? '#6b7280' : '#9ca3af'}
                  style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 4, borderWidth: 1, borderColor: errors.desired_plan ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db'), backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', color: isDarkMode ? '#ffffff' : '#111827' }}
                />
                {errors.desired_plan && <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{errors.desired_plan}</Text>}
              </View>

              <View>
                <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                  Promo
                </Text>
                <TextInput
                  value={formData.promo}
                  onChangeText={(value) => setFormData({ ...formData, promo: value })}
                  placeholder="Promo code (if any)"
                  placeholderTextColor={isDarkMode ? '#6b7280' : '#9ca3af'}
                  style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 4, borderWidth: 1, borderColor: isDarkMode ? '#374151' : '#d1d5db', backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', color: isDarkMode ? '#ffffff' : '#111827' }}
                />
              </View>

              <View>
                <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                  Referred By
                </Text>
                <TextInput
                  value={formData.referred_by}
                  onChangeText={(value) => setFormData({ ...formData, referred_by: value })}
                  placeholder="Name of referrer (if any)"
                  placeholderTextColor={isDarkMode ? '#6b7280' : '#9ca3af'}
                  style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 4, borderWidth: 1, borderColor: isDarkMode ? '#374151' : '#d1d5db', backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', color: isDarkMode ? '#ffffff' : '#111827' }}
                />
              </View>

              <View>
                <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                  Government Valid ID
                </Text>
                <TextInput
                  value={formData.government_valid_id}
                  onChangeText={(value) => setFormData({ ...formData, government_valid_id: value })}
                  placeholder="Google Drive link or ID number"
                  placeholderTextColor={isDarkMode ? '#6b7280' : '#9ca3af'}
                  style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 4, borderWidth: 1, borderColor: isDarkMode ? '#374151' : '#d1d5db', backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', color: isDarkMode ? '#ffffff' : '#111827' }}
                />
                <Text style={{ fontSize: 12, marginTop: 4, color: isDarkMode ? '#6b7280' : '#4b5563' }}>
                  Upload to Google Drive and paste the link here
                </Text>
              </View>

              <View>
                <Pressable
                  onPress={() => setFormData({ ...formData, terms_and_conditions: !formData.terms_and_conditions })}
                  style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}
                >
                  <View style={{ marginTop: 4, height: 16, width: 16, borderRadius: 4, borderWidth: 1, borderColor: errors.terms_and_conditions ? '#ef4444' : (isDarkMode ? '#4b5563' : '#d1d5db'), backgroundColor: formData.terms_and_conditions ? (colorPalette?.primary || '#ea580c') : (isDarkMode ? '#374151' : '#ffffff'), alignItems: 'center', justifyContent: 'center' }}>
                    {formData.terms_and_conditions && <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: 'bold' }}>✓</Text>}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                      I agree to the Terms and Conditions<Text style={{ color: '#ef4444' }}>*</Text>
                    </Text>
                    <Text style={{ fontSize: 12, marginTop: 4, color: isDarkMode ? '#6b7280' : '#4b5563' }}>
                      By checking this box, you confirm that you have read and agree to our terms and conditions.
                    </Text>
                    {errors.terms_and_conditions && <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{errors.terms_and_conditions}</Text>}
                  </View>
                </Pressable>
              </View>

              <View style={{ padding: 16, borderWidth: 1, borderRadius: 8, backgroundColor: isDarkMode ? 'rgba(30, 58, 138, 0.2)' : '#eff6ff', borderColor: isDarkMode ? 'rgba(59, 130, 246, 0.3)' : '#bfdbfe' }}>
                <Text style={{ fontSize: 14, color: isDarkMode ? '#93c5fd' : '#1e40af' }}>
                  <Text style={{ fontWeight: 'bold' }}>Note:</Text> Timestamp will be automatically recorded when the application is created.
                </Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default AddApplicationModal;
