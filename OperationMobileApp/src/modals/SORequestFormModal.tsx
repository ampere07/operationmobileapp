import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Modal, ActivityIndicator, Alert } from 'react-native';
import { X, ChevronDown, CheckCircle } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoadingModal from '../components/LoadingModal';
import * as serviceOrderService from '../services/serviceOrderService';
import * as concernService from '../services/concernService';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';

interface SORequestFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  customerData?: {
    accountNo: string;
    dateInstalled: string;
    fullName: string;
    contactNumber: string;
    plan: string;
    provider: string;
    username: string;
    emailAddress?: string;
  };
}

const SORequestFormModal: React.FC<SORequestFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  customerData
}) => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);

  const getUserEmail = async () => {
    try {
      const authData = await AsyncStorage.getItem('authData');
      if (authData) {
        const userData = JSON.parse(authData);
        return userData.email || userData.user?.email || 'unknown@example.com';
      }
      return 'unknown@example.com';
    } catch (error) {
      console.error('Error getting user email:', error);
      return 'unknown@example.com';
    }
  };

  const generateTicketId = () => {
    const randomDigits = Math.floor(1000000 + Math.random() * 9000000);
    return randomDigits.toString();
  };

  const [formData, setFormData] = useState({
    ticketId: '',
    accountNo: '',
    dateInstalled: '',
    fullName: '',
    contactNumber: '',
    plan: '',
    provider: '',
    username: '',
    concern: '',
    concernRemarks: '',
    accountEmail: '',
    status: 'unused'
  });

  const [concerns, setConcerns] = useState<concernService.Concern[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingPercentage, setLoadingPercentage] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [showConcernPicker, setShowConcernPicker] = useState(false);

  useEffect(() => {
    const checkDarkMode = async () => {
      const theme = await AsyncStorage.getItem('theme');
      setIsDarkMode(theme === 'dark' || theme === null);
    };

    checkDarkMode();
  }, []);

  useEffect(() => {
    const fetchColorPalette = async () => {
      const palette = await settingsColorPaletteService.getActive();
      setColorPalette(palette);
    };
    fetchColorPalette();
  }, []);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        ticketId: generateTicketId(),
        accountNo: customerData?.accountNo || '',
        dateInstalled: customerData?.dateInstalled || '',
        fullName: customerData?.fullName || '',
        contactNumber: customerData?.contactNumber || '',
        plan: customerData?.plan || '',
        provider: customerData?.provider || '',
        username: customerData?.username || '',
        accountEmail: customerData?.emailAddress || '',
        concern: '',
        concernRemarks: '',
        status: 'unused'
      });
      loadData();
    }
  }, [isOpen, customerData]);

  const loadData = async () => {
    try {
      const concernsResponse = await concernService.concernService.getAllConcerns();
      setConcerns(concernsResponse || []);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.accountNo) {
      newErrors.accountNo = 'Account No. is required';
    }

    if (!formData.dateInstalled) {
      newErrors.dateInstalled = 'Date Installed is required';
    }

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full Name is required';
    }

    if (!formData.contactNumber.trim()) {
      newErrors.contactNumber = 'Contact Number is required';
    }

    if (!formData.plan) {
      newErrors.plan = 'Plan is required';
    }

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    }

    if (!formData.concern) {
      newErrors.concern = 'Concern is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fill in all required fields.');
      return;
    }

    setLoading(true);
    setLoadingPercentage(0);

    try {
      setLoadingPercentage(20);

      const userEmail = await getUserEmail();
      const payload: any = {
        ticket_id: formData.ticketId,
        account_no: formData.accountNo,
        timestamp: new Date().toISOString(),
        support_status: 'Open',
        concern: formData.concern,
        concern_remarks: formData.concernRemarks,
        priority_level: 'Medium',
        requested_by: formData.accountEmail || formData.accountNo,
        visit_status: 'Pending',
        created_by_user: userEmail,
        status: 'unused'
      };

      setLoadingPercentage(50);
      await serviceOrderService.createServiceOrder(payload);

      setLoadingPercentage(100);
      await new Promise(resolve => setTimeout(resolve, 500));

      setShowSuccess(true);
    } catch (error) {
      console.error('Error creating SO request:', error);
      Alert.alert('Error', `Failed to save SO request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
      setLoadingPercentage(0);
    }
  };

  const handleCancel = () => {
    setFormData({
      ticketId: '',
      accountNo: '',
      dateInstalled: '',
      fullName: '',
      contactNumber: '',
      plan: '',
      provider: '',
      username: '',
      accountEmail: '',
      concern: '',
      concernRemarks: '',
      status: 'unused'
    });
    setErrors({});
    onClose();
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    onSave();
    handleCancel();
  };

  if (!isOpen) return null;

  return (
    <>
      <LoadingModal 
        isOpen={loading} 
        message="Saving SO request..." 
        percentage={loadingPercentage} 
      />
      
      <Modal
        visible={showSuccess}
        transparent={true}
        animationType="fade"
        onRequestClose={handleSuccessClose}
      >
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <View style={{ borderRadius: 8, padding: 24, maxWidth: 384, width: '100%', marginHorizontal: 16, backgroundColor: isDarkMode ? '#1f2937' : '#ffffff' }}>
            <View style={{ flexDirection: 'column', alignItems: 'center' }}>
              <CheckCircle color="#22c55e" size={64} style={{ marginBottom: 16 }} />
              <Text style={{ textAlign: 'center', marginBottom: 24, color: isDarkMode ? '#ffffff' : '#111827' }}>
                SO Request created successfully!
              </Text>
              
              <Pressable
                onPress={handleSuccessClose}
                style={{ paddingHorizontal: 24, paddingVertical: 8, borderRadius: 4, backgroundColor: colorPalette?.primary || '#ea580c' }}
              >
                <Text style={{ color: '#ffffff' }}>
                  OK
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      
      <Modal
        visible={isOpen}
        transparent={false}
        animationType="slide"
        onRequestClose={onClose}
      >
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', zIndex: 50 }}>
          <View style={{ height: '100%', width: '100%', maxWidth: 672, shadowColor: '#000', shadowOffset: { width: 0, height: 25 }, shadowOpacity: 0.5, shadowRadius: 50, elevation: 20, transform: [{ translateX: 0 }], overflow: 'hidden', flexDirection: 'column', backgroundColor: isDarkMode ? '#111827' : '#ffffff' }}>
            <View style={{ paddingHorizontal: 24, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6', borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb' }}>
              <Text style={{ fontSize: 20, fontWeight: '600', color: isDarkMode ? '#ffffff' : '#111827' }}>
                SO Request
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Pressable
                  onPress={handleCancel}
                  style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 4, backgroundColor: isDarkMode ? '#374151' : '#9ca3af' }}
                >
                  <Text style={{ fontSize: 14, color: '#ffffff' }}>
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleSave}
                  disabled={loading}
                  style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 4, flexDirection: 'row', alignItems: 'center', opacity: loading ? 0.5 : 1, backgroundColor: colorPalette?.primary || '#ea580c' }}
                >
                  {loading ? (
                    <>
                      <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 8 }} />
                      <Text style={{ fontSize: 14, color: '#ffffff' }}>
                        Saving...
                      </Text>
                    </>
                  ) : (
                    <Text style={{ fontSize: 14, color: '#ffffff' }}>
                      Save
                    </Text>
                  )}
                </Pressable>
                <Pressable
                  onPress={onClose}
                  style={{ color: isDarkMode ? '#9ca3af' : '#4b5563' }}
                >
                  <X size={24} color={isDarkMode ? '#9ca3af' : '#4b5563'} />
                </Pressable>
              </View>
            </View>

            <ScrollView style={{ flex: 1, padding: 24 }} contentContainerStyle={{ gap: 16 }}>
              <View>
                <Text style={{ display: 'flex', fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                  Ticket ID<Text style={{ color: '#ef4444' }}>*</Text>
                </Text>
                <TextInput
                  value={formData.ticketId}
                  editable={false}
                  style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderRadius: 4, backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6', borderColor: isDarkMode ? '#374151' : '#d1d5db', color: isDarkMode ? '#9ca3af' : '#6b7280' }}
                />
              </View>

              <View>
                <Text style={{ display: 'flex', fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                  Account No.<Text style={{ color: '#ef4444' }}>*</Text>
                </Text>
                <TextInput
                  value={formData.accountNo}
                  editable={false}
                  style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderRadius: 4, backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6', color: isDarkMode ? '#f87171' : '#dc2626', borderColor: errors.accountNo ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db') }}
                />
                {errors.accountNo && <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{errors.accountNo}</Text>}
              </View>

              <View>
                <Text style={{ display: 'flex', fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                  Date Installed<Text style={{ color: '#ef4444' }}>*</Text>
                </Text>
                <TextInput
                  value={formData.dateInstalled}
                  onChangeText={(value) => handleInputChange('dateInstalled', value)}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={isDarkMode ? '#6b7280' : '#9ca3af'}
                  style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderRadius: 4, backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', color: isDarkMode ? '#ffffff' : '#111827', borderColor: errors.dateInstalled ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db') }}
                />
                {errors.dateInstalled && <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{errors.dateInstalled}</Text>}
              </View>

              <View>
                <Text style={{ display: 'flex', fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                  Full Name<Text style={{ color: '#ef4444' }}>*</Text>
                </Text>
                <TextInput
                  value={formData.fullName}
                  onChangeText={(value) => handleInputChange('fullName', value)}
                  style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderRadius: 4, backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', color: isDarkMode ? '#ffffff' : '#111827', borderColor: errors.fullName ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db') }}
                />
                {errors.fullName && <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{errors.fullName}</Text>}
              </View>

              <View>
                <Text style={{ display: 'flex', fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                  Contact Number<Text style={{ color: '#ef4444' }}>*</Text>
                </Text>
                <TextInput
                  value={formData.contactNumber}
                  onChangeText={(value) => handleInputChange('contactNumber', value)}
                  keyboardType="phone-pad"
                  style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderRadius: 4, backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', color: isDarkMode ? '#ffffff' : '#111827', borderColor: errors.contactNumber ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db') }}
                />
                {errors.contactNumber && <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{errors.contactNumber}</Text>}
              </View>

              <View>
                <Text style={{ display: 'flex', fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                  Plan<Text style={{ color: '#ef4444' }}>*</Text>
                </Text>
                <View style={{ paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderRadius: 4, backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6', borderColor: isDarkMode ? '#374151' : '#d1d5db' }}>
                  <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>
                    {formData.plan || 'No plan'}
                  </Text>
                </View>
                {errors.plan && <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{errors.plan}</Text>}
              </View>

              <View>
                <Text style={{ display: 'flex', fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                  Affiliate
                </Text>
                <View style={{ paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderRadius: 4, backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6', borderColor: isDarkMode ? '#374151' : '#d1d5db' }}>
                  <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>
                    {formData.provider || 'No affiliate'}
                  </Text>
                </View>
              </View>

              <View>
                <Text style={{ display: 'flex', fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                  Username<Text style={{ color: '#ef4444' }}>*</Text>
                </Text>
                <TextInput
                  value={formData.username}
                  onChangeText={(value) => handleInputChange('username', value)}
                  style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderRadius: 4, backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', color: isDarkMode ? '#ffffff' : '#111827', borderColor: errors.username ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db') }}
                />
                {errors.username && <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{errors.username}</Text>}
              </View>

              <View>
                <Text style={{ display: 'flex', fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                  Concern<Text style={{ color: '#ef4444' }}>*</Text>
                </Text>
                <Pressable
                  onPress={() => setShowConcernPicker(true)}
                  style={{ position: 'relative' }}
                >
                  <View style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderRadius: 4, backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', borderColor: errors.concern ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db'), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ color: formData.concern ? (isDarkMode ? '#ffffff' : '#111827') : (isDarkMode ? '#6b7280' : '#9ca3af') }}>
                      {formData.concern || 'Select Concern'}
                    </Text>
                    <ChevronDown color={isDarkMode ? '#9ca3af' : '#4b5563'} size={20} />
                  </View>
                </Pressable>
                {errors.concern && <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{errors.concern}</Text>}
              </View>

              <View>
                <Text style={{ display: 'flex', fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                  Concern Remarks<Text style={{ color: '#ef4444' }}>*</Text>
                </Text>
                <TextInput
                  value={formData.concernRemarks}
                  onChangeText={(value) => handleInputChange('concernRemarks', value)}
                  multiline
                  numberOfLines={4}
                  placeholder="Enter concern details..."
                  placeholderTextColor={isDarkMode ? '#6b7280' : '#9ca3af'}
                  style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderRadius: 4, backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', color: isDarkMode ? '#ffffff' : '#111827', borderColor: isDarkMode ? '#374151' : '#d1d5db', textAlignVertical: 'top', height: 100 }}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showConcernPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowConcernPicker(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: isDarkMode ? '#111827' : '#ffffff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 16, color: isDarkMode ? '#ffffff' : '#111827' }}>Select Concern</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {concerns.map((concern) => (
                <Pressable
                  key={concern.id}
                  onPress={() => {
                    handleInputChange('concern', concern.concern_name);
                    setShowConcernPicker(false);
                  }}
                  style={{ paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb' }}
                >
                  <Text style={{ fontSize: 16, color: formData.concern === concern.concern_name ? (colorPalette?.primary || '#3b82f6') : (isDarkMode ? '#d1d5db' : '#374151') }}>
                    {concern.concern_name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              onPress={() => setShowConcernPicker(false)}
              style={{ marginTop: 16, paddingVertical: 12, backgroundColor: isDarkMode ? '#374151' : '#e5e7eb', borderRadius: 4 }}
            >
              <Text style={{ textAlign: 'center', color: isDarkMode ? '#d1d5db' : '#374151', fontWeight: '500' }}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default SORequestFormModal;
