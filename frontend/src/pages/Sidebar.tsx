import React, { useState, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { FileCheck, Wrench, MapPinned, Settings, LayoutDashboard, ReceiptText, LifeBuoy, Menu as MenuIcon } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
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

const Sidebar: React.FC<SidebarProps> = ({ activeSection, onSectionChange, userRole }) => {
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);

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

  // No longer returning null for customers to allow showing the updated bottom navbar

  const menuItems: MenuItem[] = [
    { id: 'application-management', label: 'Application', icon: FileCheck, allowedRoles: ['administrator'] },
    { id: 'job-order', label: 'Job Order', icon: Wrench, allowedRoles: ['administrator', 'technician'] },
    { id: 'service-order', label: 'Service Order', icon: Settings, allowedRoles: ['administrator', 'technician'] },
    { id: 'lcp-nap-location', label: 'LCP/NAP', icon: MapPinned, allowedRoles: ['administrator', 'technician'] },
    // Customer specific items
    { id: 'customer-dashboard', label: 'Dashboard', icon: LayoutDashboard, allowedRoles: ['customer'] },
    { id: 'customer-bills', label: 'Bills', icon: ReceiptText, allowedRoles: ['customer'] },
    { id: 'customer-support', label: 'Support', icon: LifeBuoy, allowedRoles: ['customer'] },
    { id: 'menu', label: 'Menu', icon: MenuIcon, allowedRoles: ['customer', 'technician', 'administrator'] },
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
      height: 75,
      flexDirection: 'row',
      backgroundColor: '#ffffff',
      borderTopWidth: 1,
      borderTopColor: '#d1d5db',
      justifyContent: 'space-around',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingBottom: 15,
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
                : '#4b5563'}
            />
            <Text style={{
              fontSize: 10,
              marginTop: 4,
              color: isActive
                ? (colorPalette?.primary || '#ea580c')
                : '#4b5563'
            }}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}

    </View>
  );
};

export default Sidebar;
