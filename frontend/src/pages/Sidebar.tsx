import React, { useState, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { FileCheck, Wrench, MapPinned, LogOut, Settings } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  onLogout: () => void;
  isCollapsed?: boolean;
  userRole: string;
  userEmail?: string;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
  allowedRoles?: string[];
}

const Sidebar: React.FC<SidebarProps> = ({ activeSection, onSectionChange, onLogout, userRole }) => {
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

  if (userRole?.toLowerCase() === 'customer') return null;

  const menuItems: MenuItem[] = [
    { id: 'application-management', label: 'Application', icon: FileCheck, allowedRoles: ['administrator'] },
    { id: 'job-order', label: 'Job Order', icon: Wrench, allowedRoles: ['administrator', 'technician'] },
    { id: 'service-order', label: 'Service Order', icon: Settings, allowedRoles: ['administrator', 'technician'] }, // Changed icon to Settings to differentiate
    { id: 'lcp-nap-location', label: 'LCP/NAP', icon: MapPinned, allowedRoles: ['administrator', 'technician'] },
  ];

  const filterMenuByRole = (items: MenuItem[]): MenuItem[] => {
    const normalizedUserRole = userRole ? userRole.toLowerCase().trim() : '';
    return items.filter(item => {
      if (!item.allowedRoles || item.allowedRoles.length === 0) return true;
      return item.allowedRoles.some(role => role.toLowerCase().trim() === normalizedUserRole);
    });
  };

  const filteredMenuItems = filterMenuByRole(menuItems);

  return (
    <View style={{
      width: '100%',
      height: 60,
      flexDirection: 'row',
      backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
      borderTopWidth: 1,
      borderTopColor: isDarkMode ? '#4b5563' : '#d1d5db',
      justifyContent: 'space-around',
      alignItems: 'center',
      paddingHorizontal: 10,
    }}>
      {filteredMenuItems.map((item) => {
        const isActive = activeSection === item.id;
        const IconComponent = item.icon;

        return (
          <Pressable
            key={item.id}
            onPress={() => onSectionChange(item.id)}
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              padding: 8,
            }}
          >
            <IconComponent
              size={24}
              color={isActive
                ? (colorPalette?.primary || '#ea580c')
                : (isDarkMode ? '#9ca3af' : '#4b5563')}
            />
            <Text style={{
              fontSize: 10,
              marginTop: 4,
              color: isActive
                ? (colorPalette?.primary || '#ea580c')
                : (isDarkMode ? '#9ca3af' : '#4b5563')
            }}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}

      {/* Logout Item */}
      <Pressable
        onPress={onLogout}
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          padding: 8,
        }}
      >
        <LogOut
          size={24}
          color={isDarkMode ? '#9ca3af' : '#4b5563'}
        />
        <Text style={{
          fontSize: 10,
          marginTop: 4,
          color: isDarkMode ? '#9ca3af' : '#4b5563'
        }}>
          Logout
        </Text>
      </Pressable>
    </View>
  );
};

export default Sidebar;
