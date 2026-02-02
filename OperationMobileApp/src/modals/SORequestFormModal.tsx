import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { X, ChevronDown, CheckCircle } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const init = async () => {
      const theme = await AsyncStorage.getItem('theme');
      setIsDarkMode(theme !== 'light');
      const activePalette = await settingsColorPaletteService.getActive();
      setColorPalette(activePalette);
    };
    init();
  }, []);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        ticketId: Math.floor(1000000 + Math.random() * 9000000).toString(),
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
      loadConcerns();
    }
  }, [isOpen, customerData]);

  const loadConcerns = async () => {
    try {
      const concernsResponse = await concernService.concernService.getAllConcerns();
      setConcerns(concernsResponse || []);
    } catch (error) {
      console.error('Error loading concerns:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.accountNo) newErrors.accountNo = 'Account No. is required';
    if (!formData.fullName.trim()) newErrors.fullName = 'Full Name is required';
    if (!formData.contactNumber.trim()) newErrors.contactNumber = 'Contact Number is required';
    if (!formData.plan) newErrors.plan = 'Plan is required';
    if (!formData.username.trim()) newErrors.username = 'Username is required';
    if (!formData.concern) newErrors.concern = 'Concern is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fill in all required fields.');
      return;
    }

    setLoading(true);

    try {
      const authData = await AsyncStorage.getItem('authData');
      const userData = authData ? JSON.parse(authData) : null;
      const userEmail = userData?.email || userData?.user?.email || 'unknown@example.com';

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
        status: 'unused',
        // Fill in other required API fields from customerData if needed for creation
        full_name: formData.fullName,
        contact_number: formData.contactNumber,
        plan: formData.plan,
        username: formData.username
      };

      await serviceOrderService.createServiceOrder(payload);

      Alert.alert('Success', 'SO Request created successfully!', [
        {
          text: 'OK', onPress: () => {
            onSave();
            onClose();
          }
        }
      ]);
    } catch (error: any) {
      Alert.alert('Error', `Failed to save SO request: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal visible={isOpen} animationType="slide" transparent>
      <View className={`flex-1 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        {/* Header */}
        <SafeAreaView className={`border-b ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <View className="flex-row items-center justify-between p-4">
            <Text className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Create SO Request
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={isDarkMode ? 'white' : 'black'} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        <ScrollView className="flex-1 p-4">
          {/* Read-Only Info */}
          <View className={`p-4 rounded-lg mb-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <View className="mb-4">
              <Text className={`text-xs mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Ticket ID</Text>
              <Text className={`font-bold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{formData.ticketId}</Text>
            </View>

            <View className="mb-4">
              <Text className={`text-xs mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Account No.</Text>
              <Text className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{formData.accountNo || '-'}</Text>
            </View>

            <View className="mb-4">
              <Text className={`text-xs mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Full Name</Text>
              <Text className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{formData.fullName || '-'}</Text>
            </View>

            <View className="mb-4">
              <Text className={`text-xs mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Plan</Text>
              <Text className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{formData.plan || 'No Plan'}</Text>
            </View>
          </View>

          {/* Editable Fields */}
          <View className={`p-4 rounded-lg mb-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <Text className={`font-bold mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Request Details</Text>

            <Text className={`mb-1 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Contact Number *</Text>
            <TextInput
              value={formData.contactNumber}
              onChangeText={t => handleInputChange('contactNumber', t)}
              className={`p-3 border rounded mb-4 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
            />

            <Text className={`mb-1 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Concern *</Text>
            <View className={`border rounded mb-4 ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}>
              <Picker
                selectedValue={formData.concern}
                onValueChange={(itemValue) => handleInputChange('concern', itemValue)}
                style={{ color: isDarkMode ? 'white' : 'black' }}
                dropdownIconColor={isDarkMode ? 'white' : 'black'}
              >
                <Picker.Item label="Select Concern" value="" />
                {concerns.map(c => (
                  <Picker.Item key={c.id} label={c.concern_name} value={c.concern_name} />
                ))}
              </Picker>
            </View>
            {errors.concern && <Text className="text-red-500 text-xs mb-2">{errors.concern}</Text>}

            <Text className={`mb-1 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Remarks</Text>
            <TextInput
              value={formData.concernRemarks}
              onChangeText={t => handleInputChange('concernRemarks', t)}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              className={`p-3 border rounded h-24 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
              placeholder="Enter concern details..."
              placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
            />
          </View>
        </ScrollView>

        {/* Footer */}
        <View className={`p-4 border-t ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <TouchableOpacity
            onPress={handleSave}
            disabled={loading}
            className={`py-3 rounded-lg flex-row justify-center items-center`}
            style={{ backgroundColor: colorPalette?.primary || '#ea580c' }}
          >
            {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-lg">Create Request</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default SORequestFormModal;
