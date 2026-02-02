import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';

interface ConfirmationModalProps {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isOpen: boolean;
}

const MoveToJoModal: React.FC<ConfirmationModalProps> = ({
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  isOpen
}) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);

  useEffect(() => {
    const init = async () => {
      const theme = await AsyncStorage.getItem('theme');
      setIsDarkMode(theme !== 'light');
      const palette = await settingsColorPaletteService.getActive();
      setColorPalette(palette);
    };
    init();
  }, []);

  return (
    <Modal visible={isOpen} transparent animationType="fade">
      <View className="flex-1 bg-black/50 justify-center items-center p-4">
        <View className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-sm shadow-xl">
          <Text className="text-xl font-bold mb-4 text-gray-900 dark:text-white">{title}</Text>
          <Text className="mb-6 text-gray-700 dark:text-gray-300">{message}</Text>

          <View className="flex-row justify-end space-x-3">
            <TouchableOpacity
              onPress={onCancel}
              className="bg-gray-200 dark:bg-gray-700 px-4 py-2 rounded"
            >
              <Text className="text-gray-900 dark:text-white font-medium">{cancelText}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onConfirm}
              className="px-4 py-2 rounded"
              style={{ backgroundColor: colorPalette?.primary || '#ea580c' }}
            >
              <Text className="text-white font-medium">{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default MoveToJoModal;