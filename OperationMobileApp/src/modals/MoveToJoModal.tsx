import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ConfirmationModalProps {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
  isOpen: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  isOpen
}) => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);

  useEffect(() => {
    const checkDarkMode = async () => {
      const theme = await AsyncStorage.getItem('theme');
      setIsDarkMode(theme === 'dark' || theme === null);
    };

    checkDarkMode();
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

  if (!isOpen) return null;
  
  return (
    <Modal visible={isOpen} transparent animationType="fade">
      <View style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 50
      }}>
        <View style={{
          borderRadius: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 8,
          elevation: 8,
          padding: 24,
          maxWidth: 448,
          width: '100%',
          marginHorizontal: 16,
          backgroundColor: isDarkMode ? '#1f2937' : '#ffffff'
        }}>
          <View style={{ marginBottom: 16 }}>
            <Text style={{
              fontSize: 20,
              fontWeight: '600',
              color: isDarkMode ? '#ffffff' : '#111827'
            }}>
              {title}
            </Text>
          </View>
          <Text style={{
            marginBottom: 24,
            color: isDarkMode ? '#d1d5db' : '#374151'
          }}>
            {message}
          </Text>
          <View style={{
            flexDirection: 'row',
            justifyContent: 'flex-end',
            gap: 16
          }}>
            <Pressable
              style={({ pressed }) => ({
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 4,
                backgroundColor: isDarkMode 
                  ? (pressed ? '#4b5563' : '#374151')
                  : (pressed ? '#d1d5db' : '#e5e7eb')
              })}
              onPress={onCancel}
            >
              <Text style={{
                color: isDarkMode ? '#ffffff' : '#111827'
              }}>
                {cancelText}
              </Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => ({
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 4,
                backgroundColor: pressed 
                  ? (colorPalette?.accent || '#c2410c')
                  : (colorPalette?.primary || '#ea580c')
              })}
              onPress={onConfirm}
            >
              <Text style={{ color: '#ffffff' }}>
                {confirmText}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default ConfirmationModal;
