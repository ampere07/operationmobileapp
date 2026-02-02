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
  Platform,
  Image,
  SafeAreaView
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { X, Camera, Check, Calendar } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';
import {
  createApplicationVisit,
  updateApplicationVisit,
  uploadApplicationVisitImages,
  ApplicationVisitData
} from '../services/applicationVisitService';

interface ApplicationVisitFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data?: any) => void;
  visitData?: ApplicationVisitData;
  applicationId?: number; // Required if creating new
}

const ApplicationVisitFormModal: React.FC<ApplicationVisitFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  visitData,
  applicationId
}) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);
  const [loading, setLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<ApplicationVisitData>>({});
  const [imageUris, setImageUris] = useState<{ image1: string | null; image2: string | null; image3: string | null }>({
    image1: null,
    image2: null,
    image3: null
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
      if (visitData) {
        setFormData({ ...visitData });
        setImageUris({
          image1: visitData.image1_url || null,
          image2: visitData.image2_url || null,
          image3: visitData.image3_url || null
        });
      } else {
        // New Visit Defaults
        setFormData({
          application_id: applicationId || 0,
          visit_status: 'Scheduled',
          visit_by: '',
          assigned_email: '',
          timestamp: new Date().toISOString()
        });
        setImageUris({ image1: null, image2: null, image3: null });
      }
    }
  }, [isOpen, visitData, applicationId]);

  const handleValuesChange = (key: keyof ApplicationVisitData, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const pickImage = async (key: 'image1' | 'image2' | 'image3') => {
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
    try {
      setLoading(true);

      // 1. Create or Update Visit Record
      let visitId = visitData?.id;

      const payload = { ...formData } as ApplicationVisitData;

      // Ensure required fields
      if (!payload.application_id) {
        Alert.alert('Error', 'Application ID is missing.');
        setLoading(false);
        return;
      }

      if (visitId) {
        await updateApplicationVisit(String(visitId), payload);
      } else {
        const response = await createApplicationVisit(payload);
        // Assuming create returns the new object with ID
        if (response && response.data && response.data.id) {
          visitId = response.data.id;
        }
      }

      // 2. Upload Images if any new ones selected
      // Note: Real implementation needs to check if URI is a local file (needs upload) or remote URL (already uploaded)
      // Simple check: startWith 'file:' or 'content:' usually means local new file. http means remote.

      if (visitId) {
        const imagesToUpload = {
          image1: imageUris.image1?.startsWith('http') ? null : (imageUris.image1 ? { uri: imageUris.image1, name: 'image1.jpg', type: 'image/jpeg' } : null),
          image2: imageUris.image2?.startsWith('http') ? null : (imageUris.image2 ? { uri: imageUris.image2, name: 'image2.jpg', type: 'image/jpeg' } : null),
          image3: imageUris.image3?.startsWith('http') ? null : (imageUris.image3 ? { uri: imageUris.image3, name: 'image3.jpg', type: 'image/jpeg' } : null),
        };

        if (imagesToUpload.image1 || imagesToUpload.image2 || imagesToUpload.image3) {
          // We need first/last name for the folder structure in backend usually?
          // The service signature asks for names. We'll use values from formData or placeholders.
          const fName = formData.first_name || 'Unknown';
          const lName = formData.last_name || 'User';

          // @ts-ignore - Valid RNFile objects passed
          await uploadApplicationVisitImages(String(visitId), fName, formData.middle_initial, lName, imagesToUpload);
        }
      }

      Alert.alert('Success', `Visit ${visitId ? 'updated' : 'scheduled'} successfully!`);
      onSave();
      onClose();
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', error.message || 'Failed to save visit.');
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
          <View className="flex-row justify-between items-center p-4">
            <Text className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {visitData ? 'Edit Visit' : 'Schedule Visit'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={isDarkMode ? 'white' : 'black'} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        <ScrollView className="flex-1 p-4">
          {/* Section: Visit Info */}
          <View className={`p-4 rounded-lg mb-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <Text className={`font-bold mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Visit Details</Text>

            <Text className={`mb-1 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Status</Text>
            <View className={`border rounded mb-3 ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
              <Picker
                selectedValue={formData.visit_status}
                onValueChange={(itemValue) => handleValuesChange('visit_status', itemValue || 'Scheduled')}
                style={{ color: isDarkMode ? 'white' : 'black' }}
                dropdownIconColor={isDarkMode ? 'white' : 'black'}
              >
                <Picker.Item label="Scheduled" value="Scheduled" />
                <Picker.Item label="Pending" value="Pending" />
                <Picker.Item label="In Progress" value="In Progress" />
                <Picker.Item label="Completed" value="Completed" />
                <Picker.Item label="Cancelled" value="Cancelled" />
                <Picker.Item label="Reschedule" value="Reschedule" />
              </Picker>
            </View>

            <Text className={`mb-1 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Assigned Email</Text>
            <TextInput
              value={formData.assigned_email}
              onChangeText={t => handleValuesChange('assigned_email', t)}
              className={`p-2 border rounded mb-3 ${isDarkMode ? 'border-gray-600 text-white' : 'border-gray-300 text-black'}`}
              placeholder="technician@example.com"
              placeholderTextColor={isDarkMode ? '#6b7280' : '#9ca3af'}
            />

            <Text className={`mb-1 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Visit By</Text>
            <TextInput
              value={formData.visit_by || ''}
              onChangeText={t => handleValuesChange('visit_by', t)}
              className={`p-2 border rounded mb-3 ${isDarkMode ? 'border-gray-600 text-white' : 'border-gray-300 text-black'}`}
            />

            {/* Timestamp / Date - Simplified as text for now, could use DatePicker */}
            <Text className={`mb-1 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Timestamp (YYYY-MM-DD HH:MM)</Text>
            <TextInput
              value={formData.timestamp}
              onChangeText={t => handleValuesChange('timestamp', t)}
              className={`p-2 border rounded mb-3 ${isDarkMode ? 'border-gray-600 text-white' : 'border-gray-300 text-black'}`}
            />
          </View>

          {/* Section: Remarks */}
          <View className={`p-4 rounded-lg mb-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <Text className={`font-bold mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Remarks</Text>

            <Text className={`mb-1 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Visit Remarks</Text>
            <TextInput
              value={formData.visit_remarks || ''}
              onChangeText={t => handleValuesChange('visit_remarks', t)}
              multiline
              className={`p-2 border rounded mb-3 h-20 text-top ${isDarkMode ? 'border-gray-600 text-white' : 'border-gray-300 text-black'}`}
            />

            <Text className={`mb-1 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Status Remarks</Text>
            <TextInput
              value={formData.status_remarks || ''}
              onChangeText={t => handleValuesChange('status_remarks', t)}
              multiline
              className={`p-2 border rounded mb-3 h-20 text-top ${isDarkMode ? 'border-gray-600 text-white' : 'border-gray-300 text-black'}`}
            />
          </View>

          {/* Section: Images */}
          <View className={`p-4 rounded-lg mb-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <Text className={`font-bold mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Attachments</Text>

            {['image1', 'image2', 'image3'].map((key, index) => (
              <View key={key} className="mb-4">
                <Text className={`mb-2 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Image {index + 1}</Text>
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

        {/* Footer */}
        <View className={`p-4 border-t ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            className={`py-3 rounded-lg items-center flex-row justify-center space-x-2`}
            style={{ backgroundColor: colorPalette?.primary || '#ea580c' }}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Check size={20} color="white" />
                <Text className="text-white font-bold ml-2">Save Visit</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default ApplicationVisitFormModal;
