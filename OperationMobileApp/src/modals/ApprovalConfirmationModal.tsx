import React, { useState, useEffect } from 'react';
import { View, Text, Modal, Pressable } from 'react-native';
import { X } from 'lucide-react-native';
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
    const loadTheme = async () => {
      const theme = await AsyncStorage.getItem('theme');
      setIsDarkMode(theme === 'dark');
    };
    loadTheme();
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
    <Modal
      transparent={true}
      visible={isOpen}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.6)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ borderRadius: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 10, width: '100%', maxWidth: 448, marginHorizontal: 16, backgroundColor: isDarkMode ? '#1f2937' : '#ffffff' }}>
          <View style={{ padding: 24 }}>
            <Text style={{ fontSize: 20, fontWeight: '600', marginBottom: 16, color: isDarkMode ? '#ffffff' : '#111827' }}>
              Confirm
            </Text>
            
            <Text style={{ marginBottom: 32, color: isDarkMode ? '#d1d5db' : '#374151' }}>
              Are you sure you want to approve this job order?
            </Text>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
              <Pressable
                onPress={onClose}
                disabled={loading}
                style={{ paddingHorizontal: 24, paddingVertical: 8, borderRadius: 4, opacity: loading ? 0.5 : 1, backgroundColor: isDarkMode ? '#374151' : '#e5e7eb' }}
              >
                <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={onConfirm}
                disabled={loading}
                style={{ paddingHorizontal: 24, paddingVertical: 8, borderRadius: 4, opacity: loading ? 0.5 : 1, backgroundColor: colorPalette?.primary || '#ea580c' }}
              >
                <Text style={{ color: '#ffffff' }}>
                  {loading ? 'Processing...' : 'Approve'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default ApprovalConfirmationModal;
