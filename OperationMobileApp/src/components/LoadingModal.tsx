import React, { useState, useEffect } from 'react';
import { View, Text, Modal, ActivityIndicator } from 'react-native';
import { Loader2 } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';

interface LoadingModalProps {
  isOpen: boolean;
  message?: string;
  percentage?: number;
}

const LoadingModal: React.FC<LoadingModalProps> = ({ 
  isOpen, 
  message = 'Processing...', 
  percentage 
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
    >
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ borderRadius: 8, padding: 24, maxWidth: 384, width: '100%', marginHorizontal: 16, backgroundColor: isDarkMode ? '#1f2937' : '#ffffff' }}>
          <View style={{ flexDirection: 'column', alignItems: 'center' }}>
            <Loader2 
              size={48}
              color={colorPalette?.primary || '#ea580c'}
              style={{ marginBottom: 16 }}
            />
            <Text style={{ textAlign: 'center', marginBottom: 8, color: isDarkMode ? '#ffffff' : '#111827' }}>{message}</Text>
            
            {percentage !== undefined && (
              <View style={{ width: '100%' }}>
                <View style={{ width: '100%', borderRadius: 9999, height: 10, marginBottom: 8, backgroundColor: isDarkMode ? '#374151' : '#e5e7eb' }}>
                  <View 
                    style={{ 
                      height: 10, 
                      borderRadius: 9999,
                      width: `${percentage}%`,
                      backgroundColor: colorPalette?.primary || '#ea580c'
                    }}
                  />
                </View>
                <Text 
                  style={{
                    textAlign: 'center',
                    fontSize: 14,
                    fontWeight: '500',
                    color: colorPalette?.primary || '#ea580c'
                  }}
                >
                  {percentage}%
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default LoadingModal;
