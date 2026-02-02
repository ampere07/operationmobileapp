import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator
} from 'react-native';
import { X, Check } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';
import { updateJobOrder } from '../services/jobOrderService';

interface JobOrderEditFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (formData: any) => void;
  jobOrderData?: any;
}

const JobOrderEditFormModal: React.FC<JobOrderEditFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  jobOrderData
}) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<any>({});

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
        setFormData({ ...jobOrderData });
      }
    }
  }, [isOpen, jobOrderData]);

  const handleUpdate = async () => {
    try {
      setLoading(true);
      await updateJobOrder(jobOrderData.id, formData);
      Alert.alert('Success', 'Job Order updated successfully!');
      onSave(formData);
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
          <Text className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Edit Job Order</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color={isDarkMode ? 'white' : 'black'} />
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 p-4">
          {/* Section: Client Details */}
          <View className={`p-4 rounded-lg mb-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <Text className={`font-bold mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Client Details</Text>
            <FormField
              label="First Name"
              value={formData.First_Name || formData.first_name}
              onChangeText={(t: string) => setFormData({ ...formData, First_Name: t })}
              isDarkMode={isDarkMode}
            />
            <FormField
              label="Last Name"
              value={formData.Last_Name || formData.last_name}
              onChangeText={(t: string) => setFormData({ ...formData, Last_Name: t })}
              isDarkMode={isDarkMode}
            />
            <FormField
              label="Contact Number"
              value={formData.Contact_Number}
              onChangeText={(t: string) => setFormData({ ...formData, Contact_Number: t })}
              isDarkMode={isDarkMode}
            />
            <FormField
              label="Email"
              value={formData.Email_Address}
              onChangeText={(t: string) => setFormData({ ...formData, Email_Address: t })}
              isDarkMode={isDarkMode}
            />
          </View>

          {/* Section: Service Details */}
          <View className={`p-4 rounded-lg mb-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <Text className={`font-bold mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Service Details</Text>
            <FormField
              label="Plan"
              value={formData.Choose_Plan || formData.choose_plan}
              onChangeText={(t: string) => setFormData({ ...formData, Choose_Plan: t })}
              isDarkMode={isDarkMode}
            />
            <FormField
              label="Connection Type"
              value={formData.Connection_Type}
              onChangeText={(t: string) => setFormData({ ...formData, Connection_Type: t })}
              isDarkMode={isDarkMode}
            />
            <FormField
              label="Router Model"
              value={formData.Router_Model}
              onChangeText={(t: string) => setFormData({ ...formData, Router_Model: t })}
              isDarkMode={isDarkMode}
            />
          </View>

          {/* Section: Status */}
          <View className={`p-4 rounded-lg mb-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <Text className={`font-bold mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Status</Text>
            <FormField
              label="Onsite Status"
              value={formData.Onsite_Status}
              onChangeText={(t: string) => setFormData({ ...formData, Onsite_Status: t })}
              isDarkMode={isDarkMode}
            />
            <FormField
              label="Remarks"
              value={formData.Onsite_Remarks}
              onChangeText={(t: string) => setFormData({ ...formData, Onsite_Remarks: t })}
              isDarkMode={isDarkMode}
              multiline
            />
          </View>
        </ScrollView>

        {/* Footer */}
        <View className={`p-4 border-t ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <TouchableOpacity
            onPress={handleUpdate}
            disabled={loading}
            className={`py-3 rounded-lg items-center flex-row justify-center space-x-2`}
            style={{ backgroundColor: colorPalette?.primary || '#ea580c' }}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Check size={20} color="white" />
                <Text className="text-white font-bold ml-2">Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const FormField = ({ label, value, onChangeText, isDarkMode, multiline = false }: any) => (
  <View className="mb-3">
    <Text className={`mb-1 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{label}</Text>
    <TextInput
      value={value}
      onChangeText={onChangeText}
      multiline={multiline}
      className={`p-2 border rounded ${isDarkMode ? 'border-gray-600 text-white' : 'border-gray-300 text-black'} ${multiline ? 'h-20 text-top' : ''}`}
    />
  </View>
);

export default JobOrderEditFormModal;
