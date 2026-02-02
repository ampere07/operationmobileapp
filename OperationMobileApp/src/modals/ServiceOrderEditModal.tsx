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
  Image,
  SafeAreaView
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { X, Camera, Check } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';
import {
  updateServiceOrder,
  uploadServiceOrderImages,
  ServiceOrderData
} from '../services/serviceOrderService';
import apiClient from '../config/api';

// Note: For inventory and tech fetching, we ideally use services. 
// Assuming apiClient is available and configured.

interface ServiceOrderEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (formData: any) => void;
  serviceOrderData?: ServiceOrderData;
}

const ServiceOrderEditModal: React.FC<ServiceOrderEditModalProps> = ({
  isOpen,
  onClose,
  onSave,
  serviceOrderData
}) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);
  const [loading, setLoading] = useState(false);

  // Data Lists
  const [technicians, setTechnicians] = useState<Array<{ name: string; email: string }>>([]);
  const [concerns, setConcerns] = useState<string[]>([]); // Simplified for now

  // Form State
  const [formData, setFormData] = useState<Partial<ServiceOrderData>>({});
  const [imageUris, setImageUris] = useState<{
    image1: string | null;
    image2: string | null;
    image3: string | null;
    client_signature: string | null;
  }>({
    image1: null,
    image2: null,
    image3: null,
    client_signature: null
  });

  useEffect(() => {
    const init = async () => {
      const theme = await AsyncStorage.getItem('theme');
      setIsDarkMode(theme !== 'light');
      const activePalette = await settingsColorPaletteService.getActive();
      setColorPalette(activePalette);
    };

    if (isOpen) {
      init();
      fetchTechnicians();
      if (serviceOrderData) {
        setFormData({ ...serviceOrderData });
        setImageUris({
          image1: serviceOrderData.image1_url || null,
          image2: serviceOrderData.image2_url || null,
          image3: serviceOrderData.image3_url || null,
          client_signature: serviceOrderData.client_signature_url || null
        });
      }
    }
  }, [isOpen, serviceOrderData]);

  const fetchTechnicians = async () => {
    try {
      // Simplified fetch - can implement proper service call
      const response = await apiClient.get<{ success: boolean; data: any[] }>('/users');
      if (response.data?.success && Array.isArray(response.data.data)) {
        const techs = response.data.data
          .filter(u => u.role?.toLowerCase?.() === 'technician' || u.role?.role_name === 'technician')
          .map(u => ({ name: `${u.first_name} ${u.last_name}`, email: u.email }));
        setTechnicians(techs);
      }
    } catch (e) { console.error(e); }
  };

  const handleInputChange = (key: keyof ServiceOrderData, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const pickImage = async (key: keyof typeof imageUris) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera roll permissions are required.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImageUris(prev => ({ ...prev, [key]: result.assets[0].uri }));
    }
  };

  const handleSubmit = async () => {
    if (!formData.id) return;

    try {
      setLoading(true);

      // 1. Update Service Order Info
      await updateServiceOrder(formData.id, formData);

      // 2. Upload changed images
      const imagesToUpload: any = {};
      let hasImages = false;

      // Check for local file URIs (not http)
      if (imageUris.image1 && !imageUris.image1.startsWith('http')) {
        imagesToUpload.image1 = { uri: imageUris.image1, name: 'image1.jpg', type: 'image/jpeg' };
        hasImages = true;
      }
      if (imageUris.image2 && !imageUris.image2.startsWith('http')) {
        imagesToUpload.image2 = { uri: imageUris.image2, name: 'image2.jpg', type: 'image/jpeg' };
        hasImages = true;
      }
      if (imageUris.image3 && !imageUris.image3.startsWith('http')) {
        imagesToUpload.image3 = { uri: imageUris.image3, name: 'image3.jpg', type: 'image/jpeg' };
        hasImages = true;
      }
      if (imageUris.client_signature && !imageUris.client_signature.startsWith('http')) {
        imagesToUpload.client_signature = { uri: imageUris.client_signature, name: 'signature.jpg', type: 'image/jpeg' };
        hasImages = true;
      }

      if (hasImages) {
        await uploadServiceOrderImages(formData.id, imagesToUpload);
      }

      Alert.alert('Success', 'Service Order updated successfully!');
      onSave(formData);
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update service order.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal visible={isOpen} animationType="slide" transparent>
      <View className={`flex-1 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <SafeAreaView className={`border-b ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <View className="flex-row justify-between items-center p-4">
            <Text className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Edit Ticket #{formData.ticket_id}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={isDarkMode ? 'white' : 'black'} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        <ScrollView className="flex-1 p-4">
          {/* Status Section */}
          <View className={`p-4 rounded-lg mb-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <Text className={`font-bold mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Status & Assignment</Text>

            <Text className={`text-xs mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Support Status</Text>
            <View className={`border rounded mb-3 ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-300'}`}>
              <Picker
                selectedValue={formData.support_status}
                onValueChange={(v) => handleInputChange('support_status', v)}
                style={{ color: isDarkMode ? 'white' : 'black' }}
                dropdownIconColor={isDarkMode ? 'white' : 'black'}
              >
                <Picker.Item label="Open" value="Open" />
                <Picker.Item label="In Progress" value="In Progress" />
                <Picker.Item label="Resolved" value="Resolved" />
                <Picker.Item label="Closed" value="Closed" />
              </Picker>
            </View>

            <Text className={`text-xs mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Visit Status</Text>
            <View className={`border rounded mb-3 ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-300'}`}>
              <Picker
                selectedValue={formData.visit_status}
                onValueChange={(v) => handleInputChange('visit_status', v)}
                style={{ color: isDarkMode ? 'white' : 'black' }}
                dropdownIconColor={isDarkMode ? 'white' : 'black'}
              >
                <Picker.Item label="Pending" value="Pending" />
                <Picker.Item label="Scheduled" value="Scheduled" />
                <Picker.Item label="Completed" value="Completed" />
                <Picker.Item label="Cancelled" value="Cancelled" />
              </Picker>
            </View>

            <Text className={`text-xs mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Assigned Tech</Text>
            <View className={`border rounded mb-3 ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-300'}`}>
              <Picker
                selectedValue={formData.assigned_email}
                onValueChange={(v) => handleInputChange('assigned_email', v)}
                style={{ color: isDarkMode ? 'white' : 'black' }}
                dropdownIconColor={isDarkMode ? 'white' : 'black'}
              >
                <Picker.Item label="Unassigned" value="" />
                {technicians.map(t => (
                  <Picker.Item key={t.email} label={t.name} value={t.email} />
                ))}
              </Picker>
            </View>
          </View>

          {/* Remarks Section */}
          <View className={`p-4 rounded-lg mb-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <Text className={`font-bold mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Remarks</Text>

            <Text className={`text-xs mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Concern Remarks</Text>
            <TextInput
              value={formData.concern_remarks || ''}
              onChangeText={t => handleInputChange('concern_remarks', t)}
              multiline
              className={`p-2 border rounded mb-3 h-20 text-top ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-black'}`}
            />

            <Text className={`text-xs mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Visit Remarks</Text>
            <TextInput
              value={formData.visit_remarks || ''}
              onChangeText={t => handleInputChange('visit_remarks', t)}
              multiline
              className={`p-2 border rounded mb-3 h-20 text-top ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-black'}`}
            />
          </View>

          {/* Images Section */}
          <View className={`p-4 rounded-lg mb-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <Text className={`font-bold mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Proof of Work</Text>

            {['image1', 'image2', 'image3', 'client_signature'].map((key) => (
              <View key={key} className="mb-4">
                <Text className={`mb-2 text-xs capitalize ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {key.replace('_', ' ')}
                </Text>
                <TouchableOpacity
                  onPress={() => pickImage(key as any)}
                  className={`h-40 border-2 border-dashed rounded-lg items-center justify-center overflow-hidden ${isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-300 bg-gray-50'
                    }`}
                >
                  {/* @ts-ignore */}
                  {imageUris[key] ? (
                    /* @ts-ignore */
                    <Image source={{ uri: imageUris[key] }} className="w-full h-full" resizeMode="cover" />
                  ) : (
                    <View className="items-center">
                      <Camera size={24} color={isDarkMode ? '#9ca3af' : '#6b7280'} />
                      <Text className={`text-xs mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Tap to upload</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </ScrollView>

        <View className={`p-4 border-t ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            className={`py-3 rounded-lg flex-row justify-center items-center space-x-2`}
            style={{ backgroundColor: colorPalette?.primary || '#ea580c' }}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Check size={20} color="white" />
                <Text className="text-white font-bold ml-2">Update Order</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default ServiceOrderEditModal;
