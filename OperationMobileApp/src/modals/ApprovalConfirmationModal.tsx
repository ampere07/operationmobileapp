import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';

interface ApprovalConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

const ApprovalConfirmationModal: React.FC<ApprovalConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  loading = false
}) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);

  useEffect(() => {
    const init = async () => {
      const theme = await AsyncStorage.getItem('theme');
      setIsDarkMode(theme !== 'light');
      const activePalette = await settingsColorPaletteService.getActive();
      setColorPalette(activePalette);
    };
    if (isOpen) init();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <Modal visible={isOpen} transparent animationType="fade">
      <View className="flex-1 justify-center items-center bg-black/60 p-4">
        <View className={`rounded-lg w-full max-w-sm p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
          <Text className={`text-xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>Confirm</Text>

          <Text className={`mb-8 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
            Are you sure you want to approve this job order?
          </Text>

          <View className="flex-row justify-end space-x-3">
            <TouchableOpacity
              onPress={onClose}
              disabled={loading}
              className={`px-4 py-2 rounded ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                }`}
            >
              <Text className={isDarkMode ? 'text-white' : 'text-gray-900'}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onConfirm}
              disabled={loading}
              className="px-4 py-2 rounded"
              style={{
                backgroundColor: colorPalette?.primary || '#ea580c'
              }}
            >
              <Text className="text-white font-bold">
                {loading ? 'Processing...' : 'Approve'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default ApprovalConfirmationModal;
