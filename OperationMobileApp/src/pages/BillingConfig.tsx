import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, Modal as RNModal } from 'react-native';
import { Receipt, Hash, Edit2, Trash2, Save, X, Calendar, RefreshCw } from 'lucide-react-native';
import { customAccountNumberService, CustomAccountNumber } from '../services/customAccountNumberService';
import apiClient from '../config/api';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface BillingConfigData {
  advance_generation_day: number;
  due_date_day: number;
  disconnection_day: number;
  overdue_day: number;
  disconnection_notice: number;
}

interface BillingConfigResponse {
  success: boolean;
  data: BillingConfigData | null;
  message?: string;
}

interface ModalConfig {
  isOpen: boolean;
  type: 'success' | 'error' | 'warning' | 'confirm';
  title: string;
  message: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

const BillingConfig: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [customAccountNumber, setCustomAccountNumber] = useState<CustomAccountNumber | null>(null);
  const [isEditingAccountNumber, setIsEditingAccountNumber] = useState<boolean>(false);
  const [accountNumberInput, setAccountNumberInput] = useState<string>('');
  const [loadingAccountNumber, setLoadingAccountNumber] = useState<boolean>(false);

  const [billingConfig, setBillingConfig] = useState<BillingConfigData | null>(null);
  const [isEditingBillingConfig, setIsEditingBillingConfig] = useState<boolean>(false);
  const [billingConfigInput, setBillingConfigInput] = useState<BillingConfigData>({
    advance_generation_day: 0,
    due_date_day: 0,
    disconnection_day: 0,
    overdue_day: 0,
    disconnection_notice: 0
  });
  const [loadingBillingConfig, setLoadingBillingConfig] = useState<boolean>(false);

  const [modal, setModal] = useState<ModalConfig>({
    isOpen: false,
    type: 'success',
    title: '',
    message: ''
  });

  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);

  const fetchCustomAccountNumber = async () => {
    try {
      setLoadingAccountNumber(true);
      const response = await customAccountNumberService.get();
      if (response.success && response.data) {
        setCustomAccountNumber(response.data);
        setAccountNumberInput(response.data.starting_number);
      } else {
        setCustomAccountNumber(null);
        setAccountNumberInput('');
      }
    } catch (error) {
      console.error('Error fetching custom account number:', error);
    } finally {
      setLoadingAccountNumber(false);
    }
  };

  const fetchBillingConfig = async () => {
    try {
      setLoadingBillingConfig(true);
      const response = await apiClient.get<BillingConfigResponse>('/billing-config');
      if (response.data.success && response.data.data) {
        setBillingConfig(response.data.data);
        setBillingConfigInput(response.data.data);
      } else {
        setBillingConfig(null);
      }
    } catch (error) {
      console.error('Error fetching billing config:', error);
    } finally {
      setLoadingBillingConfig(false);
    }
  };

  useEffect(() => {
    const checkDarkMode = async () => {
      const theme = await AsyncStorage.getItem('theme');
      setIsDarkMode(theme === 'dark' || theme === null);
    };

    checkDarkMode();
  }, []);

  useEffect(() => {
    fetchCustomAccountNumber();
    fetchBillingConfig();
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

  const handleSaveAccountNumber = async () => {
    try {
      setLoadingAccountNumber(true);
      const trimmedInput = accountNumberInput.trim();
      
      if (trimmedInput !== '' && trimmedInput.length > 7) {
        setModal({
          isOpen: true,
          type: 'error',
          title: 'Validation Error',
          message: 'Starting number must not exceed 7 characters'
        });
        setLoadingAccountNumber(false);
        return;
      }

      if (customAccountNumber) {
        await customAccountNumberService.update(trimmedInput);
        setModal({
          isOpen: true,
          type: 'success',
          title: 'Success',
          message: 'Starting account number updated successfully'
        });
      } else {
        await customAccountNumberService.create(trimmedInput);
        setModal({
          isOpen: true,
          type: 'success',
          title: 'Success',
          message: 'Starting account number created successfully'
        });
      }
      await fetchCustomAccountNumber();
      setIsEditingAccountNumber(false);
    } catch (error: any) {
      console.error('Error saving custom account number:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Unknown error occurred';
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: `Failed to save: ${errorMessage}`
      });
    } finally {
      setLoadingAccountNumber(false);
    }
  };

  const handleDeleteAccountNumber = async () => {
    if (!customAccountNumber) return;

    setModal({
      isOpen: true,
      type: 'confirm',
      title: 'Confirm Deletion',
      message: 'Are you sure you want to delete the starting account number?',
      onConfirm: async () => {
        try {
          setLoadingAccountNumber(true);
          await customAccountNumberService.delete();
          setModal({
            isOpen: true,
            type: 'success',
            title: 'Success',
            message: 'Starting account number deleted successfully'
          });
          setCustomAccountNumber(null);
          setAccountNumberInput('');
          setIsEditingAccountNumber(false);
        } catch (error: any) {
          console.error('Error deleting custom account number:', error);
          setModal({
            isOpen: true,
            type: 'error',
            title: 'Error',
            message: `Failed to delete: ${error.response?.data?.message || error.message}`
          });
        } finally {
          setLoadingAccountNumber(false);
        }
      },
      onCancel: () => {
        setModal({ ...modal, isOpen: false });
      }
    });
  };

  const handleCancelEdit = () => {
    if (customAccountNumber) {
      setAccountNumberInput(customAccountNumber.starting_number);
    } else {
      setAccountNumberInput('');
    }
    setIsEditingAccountNumber(false);
  };

  const handleSaveBillingConfig = async () => {
    try {
      setLoadingBillingConfig(true);
      
      const authData = await AsyncStorage.getItem('authData');
      let userEmail = 'unknown@user.com';
      
      if (authData) {
        try {
          const userData = JSON.parse(authData);
          userEmail = userData.email || userData.user?.email || 'unknown@user.com';
        } catch (error) {
          console.error('Error parsing auth data:', error);
        }
      }

      const payload: any = {
        user_email: userEmail
      };

      if (billingConfigInput.advance_generation_day !== undefined && billingConfigInput.advance_generation_day !== null) {
        payload.advance_generation_day = billingConfigInput.advance_generation_day;
      }
      if (billingConfigInput.due_date_day !== undefined && billingConfigInput.due_date_day !== null) {
        payload.due_date_day = billingConfigInput.due_date_day;
      }
      if (billingConfigInput.disconnection_day !== undefined && billingConfigInput.disconnection_day !== null) {
        payload.disconnection_day = billingConfigInput.disconnection_day;
      }
      if (billingConfigInput.overdue_day !== undefined && billingConfigInput.overdue_day !== null) {
        payload.overdue_day = billingConfigInput.overdue_day;
      }
      if (billingConfigInput.disconnection_notice !== undefined && billingConfigInput.disconnection_notice !== null) {
        payload.disconnection_notice = billingConfigInput.disconnection_notice;
      }

      if (billingConfig) {
        await apiClient.put('/billing-config', payload);
        setModal({
          isOpen: true,
          type: 'success',
          title: 'Success',
          message: 'Billing configuration updated successfully'
        });
      } else {
        await apiClient.post('/billing-config', payload);
        setModal({
          isOpen: true,
          type: 'success',
          title: 'Success',
          message: 'Billing configuration created successfully'
        });
      }
      await fetchBillingConfig();
      setIsEditingBillingConfig(false);
    } catch (error: any) {
      console.error('Error saving billing config:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Unknown error occurred';
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: `Failed to save: ${errorMessage}`
      });
    } finally {
      setLoadingBillingConfig(false);
    }
  };

  const handleDeleteBillingConfig = async () => {
    if (!billingConfig) return;

    setModal({
      isOpen: true,
      type: 'confirm',
      title: 'Confirm Deletion',
      message: 'Are you sure you want to delete the billing configuration?',
      onConfirm: async () => {
        try {
          setLoadingBillingConfig(true);
          await apiClient.delete('/billing-config');
          setModal({
            isOpen: true,
            type: 'success',
            title: 'Success',
            message: 'Billing configuration deleted successfully'
          });
          setBillingConfig(null);
          setBillingConfigInput({
            advance_generation_day: 0,
            due_date_day: 0,
            disconnection_day: 0,
            overdue_day: 0,
            disconnection_notice: 0
          });
          setIsEditingBillingConfig(false);
        } catch (error: any) {
          console.error('Error deleting billing config:', error);
          setModal({
            isOpen: true,
            type: 'error',
            title: 'Error',
            message: `Failed to delete: ${error.response?.data?.message || error.message}`
          });
        } finally {
          setLoadingBillingConfig(false);
        }
      },
      onCancel: () => {
        setModal({ ...modal, isOpen: false });
      }
    });
  };

  const handleCancelBillingConfigEdit = () => {
    if (billingConfig) {
      setBillingConfigInput(billingConfig);
    } else {
      setBillingConfigInput({
        advance_generation_day: 0,
        due_date_day: 0,
        disconnection_day: 0,
        overdue_day: 0,
        disconnection_notice: 0
      });
    }
    setIsEditingBillingConfig(false);
  };

  interface BillingGenerationResponse {
    success: boolean;
    data: {
      invoices: { success: number; failed: number };
      statements: { success: number; failed: number };
    };
    message?: string;
  }

  const handleTestGeneration = async () => {
    try {
      setLoadingBillingConfig(true);
      
      const response = await apiClient.post<BillingGenerationResponse>('/billing-generation/force-generate-all');
      
      if (response.data.success) {
        const data = response.data.data;
        const totalGenerated = data.invoices.success + data.statements.success;
        const totalFailed = data.invoices.failed + data.statements.failed;
        
        setModal({
          isOpen: true,
          type: 'success',
          title: 'Test Generation Complete',
          message: `Successfully generated ${totalGenerated} billing records. ${totalFailed > 0 ? `${totalFailed} failed.` : ''} Check SOA and Invoice pages to review.`
        });
      } else {
        setModal({
          isOpen: true,
          type: 'error',
          title: 'Generation Failed',
          message: response.data.message || 'Failed to generate billing records'
        });
      }
    } catch (error: any) {
      console.error('Error testing billing generation:', error);
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: `Test generation failed: ${error.response?.data?.error || error.message}`
      });
    } finally {
      setLoadingBillingConfig(false);
    }
  };

  const handleBillingConfigInputChange = (field: keyof BillingConfigData, value: string) => {
    if (value === '') {
      setBillingConfigInput(prev => ({
        ...prev,
        [field]: '' as any
      }));
      return;
    }
    
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 31) {
      setBillingConfigInput(prev => ({
        ...prev,
        [field]: numValue
      }));
    }
  };

  return (
    <ScrollView style={{ padding: 24, flex: 1, backgroundColor: isDarkMode ? '#030712' : '#f9fafb' }}>
      <View style={{ marginBottom: 24, paddingBottom: 24, borderBottomWidth: 1, borderColor: isDarkMode ? '#374151' : '#e5e7eb' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontSize: 24, fontWeight: '600', marginBottom: 8, color: isDarkMode ? '#ffffff' : '#111827' }}>
              Billing Configurations
            </Text>
          </View>
        </View>
      </View>

      <View style={{ gap: 24 }}>
        <View style={{ paddingBottom: 24, borderBottomWidth: 1, borderColor: isDarkMode ? '#374151' : '#e5e7eb' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: isDarkMode ? '#ffffff' : '#111827' }}>
              Starting Account Number
            </Text>
          </View>
          
          <View style={{ gap: 16 }}>
            <Text style={{ fontSize: 14, color: isDarkMode ? '#9ca3af' : '#4b5563' }}>
              Set a custom starting number for new billing accounts. This can only be created once. You can edit or delete it after creation.
            </Text>

            {loadingAccountNumber ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 32 }}>
                <ActivityIndicator size="large" color="#ea580c" />
              </View>
            ) : customAccountNumber && !isEditingAccountNumber ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ height: 40, width: 40, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colorPalette?.primary ? `${colorPalette.primary}33` : 'rgba(249, 115, 22, 0.2)' }}>
                    <Hash size={20} color={colorPalette?.primary || '#fb923c'} />
                  </View>
                  <View>
                    <Text style={{ fontWeight: '500', fontSize: 18, color: isDarkMode ? '#ffffff' : '#111827' }}>{customAccountNumber.starting_number}</Text>
                    <Text style={{ fontSize: 12, color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Current starting number</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Pressable
                    onPress={() => setIsEditingAccountNumber(true)}
                    style={{ padding: 8, borderRadius: 6 }}
                  >
                    <Edit2 size={18} color="#60a5fa" />
                  </Pressable>
                  <Pressable
                    onPress={handleDeleteAccountNumber}
                    style={{ padding: 8, borderRadius: 6 }}
                  >
                    <Trash2 size={18} color="#f87171" />
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={{ gap: 16 }}>
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                    Starting Number
                  </Text>
                  <TextInput
                    value={accountNumberInput}
                    onChangeText={setAccountNumberInput}
                    placeholder="e.g., ABC1234 (optional, max 7 characters)"
                    placeholderTextColor={isDarkMode ? '#6b7280' : '#9ca3af'}
                    maxLength={7}
                    autoCapitalize="characters"
                    style={{ width: '100%', paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderRadius: 6, backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', borderColor: isDarkMode ? '#374151' : '#d1d5db', color: isDarkMode ? '#ffffff' : '#111827' }}
                    editable={!loadingAccountNumber}
                  />
                  <Text style={{ fontSize: 12, marginTop: 8, color: isDarkMode ? '#6b7280' : '#4b5563' }}>
                    Enter any combination of letters and numbers (max 7 characters). Leave blank to generate without prefix.
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Pressable
                    onPress={handleSaveAccountNumber}
                    disabled={loadingAccountNumber}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, opacity: loadingAccountNumber ? 0.5 : 1, borderRadius: 6, backgroundColor: loadingAccountNumber ? '#4b5563' : (colorPalette?.primary || '#ea580c') }}
                  >
                    <Save size={18} color="#ffffff" />
                    <Text style={{ color: '#ffffff' }}>{customAccountNumber ? 'Update' : 'Create'}</Text>
                  </Pressable>
                  {customAccountNumber && (
                    <Pressable
                      onPress={handleCancelEdit}
                      disabled={loadingAccountNumber}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, opacity: loadingAccountNumber ? 0.5 : 1, borderRadius: 6, backgroundColor: isDarkMode ? '#374151' : '#9ca3af' }}
                    >
                      <X size={18} color="#ffffff" />
                      <Text style={{ color: '#ffffff' }}>Cancel</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            )}
          </View>
        </View>

        <View style={{ paddingBottom: 24, borderBottomWidth: 1, borderColor: isDarkMode ? '#374151' : '#e5e7eb' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: isDarkMode ? '#ffffff' : '#111827' }}>
              Billing Day Configuration
            </Text>
          </View>
          
          <View style={{ gap: 16 }}>
            <Text style={{ fontSize: 14, color: isDarkMode ? '#9ca3af' : '#4b5563' }}>
              Configure the day intervals for billing operations. This can only be created once. You can edit or delete it after creation.
            </Text>

            {loadingBillingConfig ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 32 }}>
                <ActivityIndicator size="large" color="#ea580c" />
              </View>
            ) : billingConfig && !isEditingBillingConfig ? (
              <View style={{ gap: 16 }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
                  <View style={{ flex: 1, minWidth: 200, padding: 16, borderRadius: 6, backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6' }}>
                    <Text style={{ fontSize: 12, marginBottom: 4, color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Advance Generation Day</Text>
                    <Text style={{ fontWeight: '500', fontSize: 18, color: isDarkMode ? '#ffffff' : '#111827' }}>{billingConfig.advance_generation_day}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 200, padding: 16, borderRadius: 6, backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6' }}>
                    <Text style={{ fontSize: 12, marginBottom: 4, color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Due Date Day</Text>
                    <Text style={{ fontWeight: '500', fontSize: 18, color: isDarkMode ? '#ffffff' : '#111827' }}>{billingConfig.due_date_day}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 200, padding: 16, borderRadius: 6, backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6' }}>
                    <Text style={{ fontSize: 12, marginBottom: 4, color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Disconnection Day</Text>
                    <Text style={{ fontWeight: '500', fontSize: 18, color: isDarkMode ? '#ffffff' : '#111827' }}>{billingConfig.disconnection_day}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 200, padding: 16, borderRadius: 6, backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6' }}>
                    <Text style={{ fontSize: 12, marginBottom: 4, color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Overdue Day</Text>
                    <Text style={{ fontWeight: '500', fontSize: 18, color: isDarkMode ? '#ffffff' : '#111827' }}>{billingConfig.overdue_day}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 200, padding: 16, borderRadius: 6, backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6' }}>
                    <Text style={{ fontSize: 12, marginBottom: 4, color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Disconnection Notice</Text>
                    <Text style={{ fontWeight: '500', fontSize: 18, color: isDarkMode ? '#ffffff' : '#111827' }}>{billingConfig.disconnection_notice}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 8 }}>
                  <Pressable
                    onPress={() => setIsEditingBillingConfig(true)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6 }}
                  >
                    <Edit2 size={18} color="#60a5fa" />
                    <Text style={{ color: '#60a5fa' }}>Edit</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleDeleteBillingConfig}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6 }}
                  >
                    <Trash2 size={18} color="#f87171" />
                    <Text style={{ color: '#f87171' }}>Delete</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={{ gap: 16 }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
                  <View style={{ flex: 1, minWidth: 200 }}>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: '#d1d5db', marginBottom: 8 }}>
                      Advance Generation Day
                    </Text>
                    <TextInput
                      value={String(billingConfigInput.advance_generation_day)}
                      onChangeText={(value) => handleBillingConfigInputChange('advance_generation_day', value)}
                      keyboardType="numeric"
                      style={{ width: '100%', paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderRadius: 6, backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', borderColor: isDarkMode ? '#374151' : '#d1d5db', color: isDarkMode ? '#ffffff' : '#111827' }}
                      editable={!loadingBillingConfig}
                    />
                    <Text style={{ fontSize: 12, marginTop: 8, color: isDarkMode ? '#6b7280' : '#4b5563' }}>
                      Days before billing day to generate bills (0-31, 0 = disabled)
                    </Text>
                  </View>

                  <View style={{ flex: 1, minWidth: 200 }}>
                    <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                      Due Date Day
                    </Text>
                    <TextInput
                      value={String(billingConfigInput.due_date_day)}
                      onChangeText={(value) => handleBillingConfigInputChange('due_date_day', value)}
                      keyboardType="numeric"
                      style={{ width: '100%', paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderRadius: 6, backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', borderColor: isDarkMode ? '#374151' : '#d1d5db', color: isDarkMode ? '#ffffff' : '#111827' }}
                      editable={!loadingBillingConfig}
                    />
                    <Text style={{ fontSize: 12, marginTop: 8, color: isDarkMode ? '#6b7280' : '#4b5563' }}>
                      Days after billing day for payment due date (0-31, 0 = same day)
                    </Text>
                  </View>

                  <View style={{ flex: 1, minWidth: 200 }}>
                    <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                      Disconnection Day
                    </Text>
                    <TextInput
                      value={String(billingConfigInput.disconnection_day)}
                      onChangeText={(value) => handleBillingConfigInputChange('disconnection_day', value)}
                      keyboardType="numeric"
                      style={{ width: '100%', paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderRadius: 6, backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', borderColor: isDarkMode ? '#374151' : '#d1d5db', color: isDarkMode ? '#ffffff' : '#111827' }}
                      editable={!loadingBillingConfig}
                    />
                    <Text style={{ fontSize: 12, marginTop: 8, color: isDarkMode ? '#6b7280' : '#4b5563' }}>
                      Days after due date to disconnect service (0-31, 0 = disabled)
                    </Text>
                  </View>

                  <View style={{ flex: 1, minWidth: 200 }}>
                    <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                      Overdue Day
                    </Text>
                    <TextInput
                      value={String(billingConfigInput.overdue_day)}
                      onChangeText={(value) => handleBillingConfigInputChange('overdue_day', value)}
                      keyboardType="numeric"
                      style={{ width: '100%', paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderRadius: 6, backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', borderColor: isDarkMode ? '#374151' : '#d1d5db', color: isDarkMode ? '#ffffff' : '#111827' }}
                      editable={!loadingBillingConfig}
                    />
                    <Text style={{ fontSize: 12, marginTop: 8, color: isDarkMode ? '#6b7280' : '#4b5563' }}>
                      Days after due date to mark as overdue (0-31, 0 = same day)
                    </Text>
                  </View>

                  <View style={{ flex: 1, minWidth: 200 }}>
                    <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                      Disconnection Notice
                    </Text>
                    <TextInput
                      value={String(billingConfigInput.disconnection_notice)}
                      onChangeText={(value) => handleBillingConfigInputChange('disconnection_notice', value)}
                      keyboardType="numeric"
                      style={{ width: '100%', paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderRadius: 6, backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', borderColor: isDarkMode ? '#374151' : '#d1d5db', color: isDarkMode ? '#ffffff' : '#111827' }}
                      editable={!loadingBillingConfig}
                    />
                    <Text style={{ fontSize: 12, marginTop: 8, color: isDarkMode ? '#6b7280' : '#4b5563' }}>
                      Days before disconnection to send notice (0-31, 0 = disabled)
                    </Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Pressable
                    onPress={handleSaveBillingConfig}
                    disabled={loadingBillingConfig}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, opacity: loadingBillingConfig ? 0.5 : 1, borderRadius: 6, backgroundColor: loadingBillingConfig ? '#4b5563' : (colorPalette?.primary || '#ea580c') }}
                  >
                    <Save size={18} color="#ffffff" />
                    <Text style={{ color: '#ffffff' }}>{billingConfig ? 'Update' : 'Create'}</Text>
                  </Pressable>
                  {billingConfig && (
                    <Pressable
                      onPress={handleCancelBillingConfigEdit}
                      disabled={loadingBillingConfig}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, opacity: loadingBillingConfig ? 0.5 : 1, borderRadius: 6, backgroundColor: isDarkMode ? '#374151' : '#9ca3af' }}
                    >
                      <X size={18} color="#ffffff" />
                      <Text style={{ color: '#ffffff' }}>Cancel</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            )}
          </View>
        </View>

        <View style={{ paddingBottom: 24, borderBottomWidth: 1, borderColor: isDarkMode ? '#374151' : '#e5e7eb' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: isDarkMode ? '#ffffff' : '#111827' }}>
              Test Billing Generation
            </Text>
          </View>
          
          <View style={{ gap: 16 }}>
            <Text style={{ fontSize: 14, color: isDarkMode ? '#9ca3af' : '#4b5563' }}>
              Test the billing generation system by generating SOA and invoices for all active accounts. This will create new billing records for testing purposes.
            </Text>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Pressable
                onPress={handleTestGeneration}
                disabled={loadingBillingConfig}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#2563eb', opacity: loadingBillingConfig ? 0.5 : 1, borderRadius: 6 }}
              >
                <RefreshCw size={18} color="#ffffff" />
                <Text style={{ color: '#ffffff' }}>Test Generate All Billings</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>

      <RNModal
        visible={modal.isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setModal({ ...modal, isOpen: false })}
      >
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ borderRadius: 8, padding: 24, maxWidth: 448, width: '100%', marginHorizontal: 16, backgroundColor: isDarkMode ? '#111827' : '#ffffff', borderWidth: 1, borderColor: isDarkMode ? '#374151' : '#e5e7eb' }}>
            <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 16, color: isDarkMode ? '#ffffff' : '#111827' }}>{modal.title}</Text>
            <Text style={{ marginBottom: 24, color: isDarkMode ? '#d1d5db' : '#374151' }}>{modal.message}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
              {modal.type === 'confirm' ? (
                <>
                  <Pressable
                    onPress={modal.onCancel}
                    style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6, backgroundColor: isDarkMode ? '#374151' : '#9ca3af' }}
                  >
                    <Text style={{ color: '#ffffff' }}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={modal.onConfirm}
                    style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6, backgroundColor: colorPalette?.primary || '#ea580c' }}
                  >
                    <Text style={{ color: '#ffffff' }}>Confirm</Text>
                  </Pressable>
                </>
              ) : (
                <Pressable
                  onPress={() => setModal({ ...modal, isOpen: false })}
                  style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6, backgroundColor: colorPalette?.primary || '#ea580c' }}
                >
                  <Text style={{ color: '#ffffff' }}>OK</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </RNModal>
    </ScrollView>
  );
};

export default BillingConfig;
