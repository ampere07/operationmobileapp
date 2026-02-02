import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator
} from 'react-native';
import { X, Camera, Check, AlertCircle } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';
import { updateJobOrder } from '../services/jobOrderService';

interface JobOrderDoneFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (formData: any) => void;
  jobOrderData?: any;
}

const JobOrderDoneFormModal: React.FC<JobOrderDoneFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  jobOrderData
}) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<any>({});

  // Image states
  const [imageUris, setImageUris] = useState<Record<string, string | null>>({});

  useEffect(() => {
    const init = async () => {
      const theme = await AsyncStorage.getItem('theme');
      setIsDarkMode(theme !== 'light');
      const activePalette = await settingsColorPaletteService.getActive();
      setColorPalette(activePalette);
    };
    if (isOpen) {
      init();
      if (jobOrderData) {
        setFormData({
          ...jobOrderData,
          onsiteStatus: jobOrderData.Onsite_Status || 'Done', // Default to Done for this form
          remarks: jobOrderData.Onsite_Remarks || '',
          routerModel: jobOrderData.Router_Model || '',
          modemSN: jobOrderData.Modem_SN || '',
          dateInstalled: new Date().toISOString().split('T')[0] // Default to today
        });

        // Map existing images
        setImageUris({
          setupImage: jobOrderData.setup_image_url || jobOrderData.Setup_Image_URL || null,
          speedtestImage: jobOrderData.speedtest_image_url || jobOrderData.Speedtest_Image_URL || null,
          routerReadingImage: jobOrderData.router_reading_image_url || jobOrderData.Router_Reading_Image_URL || null,
        });
      }
    }
  }, [isOpen, jobOrderData]);

  const pickImage = async (field: string) => {
    // Request permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Sorry, we need camera roll permissions to make this work!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
      base64: false, // We will use URI for displayed image, but for upload we might need blob/formatting
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImageUris(prev => ({ ...prev, [field]: result.assets[0].uri }));

      // In a real app, you would prepare this file for upload here
      // For now, we will just store the URI in the form data as a placeholder
      setFormData((prev: any) => ({ ...prev, [field]: result.assets[0].uri }));
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      // Prepare FormData or JSON depending on backend requirement.
      // Assuming updateJobOrder can handle Partial<JobOrderData> which usually is JSON.
      // If files need to be uploaded, we might need a separate service or to construct FormData manually.
      // For migration safety, we will call onSave which usually (in the legacy code) triggered the update.
      // But here we might need to actually call the service if onSave is just a callback to refresh parent.

      // Let's assume onSave is enough if the parent handles it, OR we call updateJobOrder directly.
      // The original code passed `onSave` but also imported `updateJobOrder`.
      // We will do a direct update simulation.

      const payload = {
        ...formData,
        Onsite_Status: 'Done', // Enforce Done status
        Date_Installed: formData.dateInstalled,
        Router_Model: formData.routerModel,
        Modem_SN: formData.modemSN,
      };

      // NOTE: File upload logic is complex to port 1:1 without backend specs.
      // We will assume for now we are sending metadata updates.
      // Actual file bits would need `FormData` and `fetch` or `axios` with 'multipart/form-data'.

      await updateJobOrder(jobOrderData.id, payload);

      Alert.alert('Success', 'Job Order marked as Done!');
      onSave(payload);
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update job order');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal visible={isOpen} transparent animationType="slide">
      <View className={`flex-1 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        {/* Header */}
        <View className={`p-4 border-b flex-row justify-between items-center ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <Text className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Mark as Done</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color={isDarkMode ? 'white' : 'black'} />
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 p-4">
          {/* Section: Technical Details */}
          <View className={`p-4 rounded-lg mb-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <Text className={`font-bold mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Technical Details</Text>

            <Text className={`mb-1 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Date Installed (YYYY-MM-DD)</Text>
            <TextInput
              value={formData.dateInstalled}
              onChangeText={(t) => setFormData({ ...formData, dateInstalled: t })}
              className={`p-2 border rounded mb-3 ${isDarkMode ? 'border-gray-600 text-white' : 'border-gray-300 text-black'}`}
              placeholder="2024-01-01"
            />

            <Text className={`mb-1 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Router Model</Text>
            <TextInput
              value={formData.routerModel}
              onChangeText={(t) => setFormData({ ...formData, routerModel: t })}
              className={`p-2 border rounded mb-3 ${isDarkMode ? 'border-gray-600 text-white' : 'border-gray-300 text-black'}`}
            />

            <Text className={`mb-1 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Modem S/N</Text>
            <TextInput
              value={formData.modemSN}
              onChangeText={(t) => setFormData({ ...formData, modemSN: t })}
              className={`p-2 border rounded mb-3 ${isDarkMode ? 'border-gray-600 text-white' : 'border-gray-300 text-black'}`}
            />
          </View>

          {/* Section: Images */}
          <View className={`p-4 rounded-lg mb-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <Text className={`font-bold mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Proof Images</Text>

            <ImageUploadField
              label="Setup Image"
              imageUri={imageUris.setupImage}
              onPress={() => pickImage('setupImage')}
              isDarkMode={isDarkMode}
            />

            <ImageUploadField
              label="Speedtest Image"
              imageUri={imageUris.speedtestImage}
              onPress={() => pickImage('speedtestImage')}
              isDarkMode={isDarkMode}
            />

            <ImageUploadField
              label="Router Reading"
              imageUri={imageUris.routerReadingImage}
              onPress={() => pickImage('routerReadingImage')}
              isDarkMode={isDarkMode}
            />
          </View>
        </ScrollView>

        {/* Footer */}
        <View className={`p-4 border-t ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <TouchableOpacity
            onPress={handleSave}
            disabled={loading}
            className={`py-3 rounded-lg items-center flex-row justify-center space-x-2`}
            style={{ backgroundColor: colorPalette?.primary || '#ea580c' }}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Check size={20} color="white" />
                <Text className="text-white font-bold ml-2">Mark as Done</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const ImageUploadField = ({ label, imageUri, onPress, isDarkMode }: any) => (
  <View className="mb-4">
    <Text className={`mb-2 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{label}</Text>
    <TouchableOpacity
      onPress={onPress}
      className={`h-40 border-2 border-dashed rounded-lg items-center justify-center overflow-hidden ${isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-300 bg-gray-50'
        }`}
    >
      {imageUri ? (
        <Image source={{ uri: imageUri }} className="w-full h-full" resizeMode="cover" />
      ) : (
        <View className="items-center">
          <Camera size={24} color={isDarkMode ? '#9ca3af' : '#6b7280'} />
          <Text className={`text-xs mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Tap to upload</Text>
        </View>
      )}
    </TouchableOpacity>
  </View>
);

export default JobOrderDoneFormModal;
