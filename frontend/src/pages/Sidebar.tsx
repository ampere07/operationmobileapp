import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Animated, useWindowDimensions } from 'react-native';
import { FileCheck, Wrench, MapPinned, Settings, LayoutDashboard, ReceiptText, LifeBuoy, Menu as MenuIcon, Package, List, ClipboardCheck } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  isCollapsed?: boolean;
  userRole: string;
  userEmail?: string;
  roleId?: number | string;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
  allowedRoles?: string[];
  allowedRoleIds?: (number | string)[];
}

const Sidebar: React.FC<SidebarProps> = ({ activeSection, onSectionChange, userRole, roleId }) => {
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);
  const { width } = useWindowDimensions();
  const glideAnim = React.useRef(new Animated.Value(0)).current;

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

  const menuItems: MenuItem[] = [
    { id: 'application-management', label: 'Application', icon: FileCheck, allowedRoles: ['administrator'] },
    { id: 'job-order', label: 'Job Order', icon: Wrench, allowedRoles: ['administrator', 'technician', 'agent'], allowedRoleIds: [4, '4'] },
    { id: 'service-order', label: 'Service Order', icon: Settings, allowedRoles: ['administrator', 'technician'] },
    { id: 'work-order', label: 'Work Order', icon: ClipboardCheck, allowedRoles: ['agent', 'administrator', 'technician'], allowedRoleIds: [4, '4', 6, '6', 2, '2'] },
    { id: 'lcp-nap-location', label: 'LCP/NAP', icon: MapPinned, allowedRoles: ['administrator', 'technician'], allowedRoleIds: [6, '6'] },
    // Inventory specific items
    { id: 'inventory', label: 'Inventory', icon: Package, allowedRoles: ['inventorystaff'], allowedRoleIds: [5, '5'] },
    { id: 'inventory-category-list', label: 'Categories', icon: List, allowedRoles: ['inventorystaff'], allowedRoleIds: [5, '5'] },
    // Customer specific items
    { id: 'customer-dashboard', label: 'Dashboard', icon: LayoutDashboard, allowedRoles: ['customer'] },
    { id: 'customer-bills', label: 'Bills', icon: ReceiptText, allowedRoles: ['customer'] },
    { id: 'customer-support', label: 'Support', icon: LifeBuoy, allowedRoles: ['customer'] },
    { id: 'menu', label: 'Menu', icon: MenuIcon, allowedRoles: ['customer', 'technician', 'administrator', 'inventorystaff', 'agent'], allowedRoleIds: [5, '5', 4, '4', 6, '6'] },
  ];

  const filterMenuByRole = (items: MenuItem[]): MenuItem[] => {
    const normalizedUserRole = userRole ? userRole.toLowerCase().trim() : '';
    const currentRoleId = roleId ? String(roleId) : '';

    return items.filter(item => {
      if ((!item.allowedRoles || item.allowedRoles.length === 0) && (!item.allowedRoleIds || item.allowedRoleIds.length === 0)) return true;

      const roleMatched = item.allowedRoles?.some(role => role.toLowerCase().trim() === normalizedUserRole);
      const roleIdMatched = item.allowedRoleIds?.some(id => String(id) === currentRoleId);

      return roleMatched || roleIdMatched;
    });
  };

  const filteredMenuItems = filterMenuByRole(menuItems);

  useEffect(() => {
    const activeIndex = filteredMenuItems.findIndex(item => item.id === activeSection);
    if (activeIndex !== -1) {
      Animated.spring(glideAnim, {
        toValue: activeIndex,
        useNativeDriver: true,
        friction: 8,
        tension: 60
      }).start();
    }
  }, [activeSection, filteredMenuItems]);

  return (
    <View style={{
      position: 'absolute',
      bottom: 25,
      left: 16,
      right: 16,
      height: 68,
      flexDirection: 'row',
      backgroundColor: '#ffffff',
      borderRadius: 34,
      justifyContent: 'space-around',
      alignItems: 'center',
      paddingHorizontal: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 8,
      borderWidth: 1,
      borderColor: '#f1f5f9',
    }}>
      {/* Gliding Pill Indicator */}
      <Animated.View
        style={{
          position: 'absolute',
          height: 48,
          width: (width - 32 - 24) / filteredMenuItems.length - 8,
          backgroundColor: (colorPalette?.primary || '#7c3aed') + '15',
          borderRadius: 24,
          transform: [{
            translateX: glideAnim.interpolate({
              inputRange: filteredMenuItems.map((_, i) => i),
              outputRange: filteredMenuItems.map((_, i) => {
                const itemWidth = (width - 32 - 24) / filteredMenuItems.length;
                return (i * itemWidth) + 12 + 4; // Adjusted for padding and centering
              })
            })
          }],
          left: 0,
        }}
      />

      {filteredMenuItems.map((item) => {
        const isActive = activeSection === item.id;
        const IconComponent = item.icon;

        return (
          <Pressable
            key={item.id}
            onPress={() => onSectionChange(item.id)}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              zIndex: 10,
            }}
          >
            <IconComponent
              size={22}
              color={isActive
                ? (colorPalette?.primary || '#7c3aed')
                : '#4b5563'}
            />
            <Text style={{
              fontSize: 10,
              marginTop: 4,
              fontWeight: isActive ? '700' : '500',
              color: isActive
                ? (colorPalette?.primary || '#7c3aed')
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
