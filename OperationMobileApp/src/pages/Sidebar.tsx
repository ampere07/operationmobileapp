import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image } from 'react-native';
import {
  LayoutDashboard, Users, FileText, LogOut, ChevronRight, User, Building2, Shield,
  FileCheck, Wrench, Map, MapPinned, MapPin, Package, CreditCard, List, Router,
  DollarSign, Receipt, FileBarChart, Clock, Calendar, UserCheck, AlertTriangle,
  Tag, MessageSquare, Settings, Network, Activity, AlertCircle
} from 'lucide-react-native';
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
  children?: MenuItem[];
  allowedRoles?: string[];
}

const Sidebar: React.FC<SidebarProps> = ({ activeSection, onSectionChange, onLogout, isCollapsed, userRole, userEmail }) => {
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);
  const [currentDateTime, setCurrentDateTime] = useState('');
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const dateOptions: Intl.DateTimeFormatOptions = {
        weekday: 'short',
        month: 'short',
        day: '2-digit',
        year: 'numeric'
      };
      const timeOptions: Intl.DateTimeFormatOptions = {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      };

      // Basic formatting for React Native
      const dateStr = now.toLocaleDateString('en-US', dateOptions);
      const timeStr = now.toLocaleTimeString('en-US', timeOptions);
      setCurrentDateTime(`${dateStr} ${timeStr}`);
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 60000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const checkDarkMode = async () => {
      const theme = await AsyncStorage.getItem('theme');
      setIsDarkMode(theme === 'dark' || theme === null);
    };

    checkDarkMode();
  }, []);

  useEffect(() => {
    const fetchColorPalette = async () => {
      if (!mountedRef.current) return;

      try {
        const activePalette = await settingsColorPaletteService.getActive();
        if (mountedRef.current) {
          setColorPalette(activePalette);
        }
      } catch (err) {
        console.error('Failed to fetch color palette:', err);
      }
    };

    fetchColorPalette();
  }, []);

  const menuItems: MenuItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, allowedRoles: ['administrator', 'customer'] },
    { id: 'live-monitor', label: 'Live Monitor', icon: Activity, allowedRoles: ['administrator'] },
    {
      id: 'billing',
      label: 'Billing',
      icon: CreditCard,
      allowedRoles: ['administrator', 'customer'],
      children: [
        { id: 'customer', label: 'Customer', icon: User, allowedRoles: ['administrator'] },
        { id: 'transaction-list', label: 'Transaction List', icon: Receipt, allowedRoles: ['administrator'] },
        { id: 'payment-portal', label: 'Payment Portal', icon: DollarSign, allowedRoles: ['administrator'] },
        { id: 'soa', label: 'SOA', icon: FileText, allowedRoles: ['administrator', 'customer'] },
        { id: 'invoice', label: 'Invoice', icon: Receipt, allowedRoles: ['administrator', 'customer'] },
        { id: 'overdue', label: 'Overdue', icon: Clock, allowedRoles: ['administrator'] },
        { id: 'dc-notice', label: 'DC Notice', icon: AlertTriangle, allowedRoles: ['administrator'] },
        { id: 'mass-rebate', label: 'Rebates', icon: DollarSign, allowedRoles: ['administrator'] },
        { id: 'staggered-payment', label: 'Staggered', icon: Calendar, allowedRoles: ['administrator'] },
        { id: 'discounts', label: 'Discounts', icon: Tag, allowedRoles: ['administrator'] },
        { id: 'billing-config', label: 'Billing Configurations', icon: Receipt, allowedRoles: ['administrator'] }
      ]
    },
    {
      id: 'application',
      label: 'Application',
      icon: FileCheck,
      allowedRoles: ['administrator', 'technician'],
      children: [
        { id: 'application-management', label: 'Application', icon: FileCheck, allowedRoles: ['administrator'] },
        { id: 'application-visit', label: 'Application Visit', icon: MapPin, allowedRoles: ['administrator', 'technician'] },
        { id: 'promo-list', label: 'Promo', icon: Tag, allowedRoles: ['administrator'] },
        { id: 'plan-list', label: 'Plan', icon: List, allowedRoles: ['administrator'] },
        { id: 'location-list', label: 'Location', icon: MapPin, allowedRoles: ['administrator'] },
        { id: 'status-remarks-list', label: 'Status Remarks', icon: List, allowedRoles: ['administrator'] }
      ]
    },
    {
      id: 'job-order-group',
      label: 'Job Order',
      icon: Wrench,
      allowedRoles: ['administrator', 'technician'],
      children: [
        { id: 'job-order', label: 'Job Order', icon: Wrench, allowedRoles: ['administrator', 'technician'] },
        { id: 'lcp', label: 'LCP', icon: Network, allowedRoles: ['administrator'] },
        { id: 'nap', label: 'NAP', icon: Network, allowedRoles: ['administrator'] },
        { id: 'usage-type', label: 'Usage Type', icon: Activity, allowedRoles: ['administrator'] }
      ]
    },
    {
      id: 'sms',
      label: 'SMS',
      icon: MessageSquare,
      allowedRoles: ['administrator'],
      children: [
        { id: 'sms-blast', label: 'SMS Blast', icon: MessageSquare, allowedRoles: ['administrator'] }
      ]
    },
    {
      id: 'support',
      label: 'Support',
      icon: Wrench,
      allowedRoles: ['administrator', 'technician', 'customer'],
      children: [
        { id: 'support', label: 'Support Ticket', icon: FileText, allowedRoles: ['customer'] },
        { id: 'service-order', label: 'Service Order', icon: Wrench, allowedRoles: ['administrator', 'technician'] }
      ]
    },
    {
      id: 'inventory-group',
      label: 'Inventory',
      icon: Package,
      allowedRoles: ['administrator'],
      children: [
        { id: 'inventory', label: 'Inventory', icon: Package, allowedRoles: ['administrator'] },
        { id: 'inventory-category-list', label: 'Inventory Category List', icon: List, allowedRoles: ['administrator'] }
      ]
    },
    {
      id: 'technical',
      label: 'Technical',
      icon: Network,
      allowedRoles: ['administrator', 'technician'],
      children: [
        { id: 'lcp-nap-location', label: 'LCP/NAP Location', icon: MapPinned, allowedRoles: ['administrator', 'technician'] },
        { id: 'radius-config', label: 'Radius Config', icon: MapPin, allowedRoles: ['administrator'] },
        { id: 'sms-config', label: 'SMS Config', icon: MessageSquare, allowedRoles: ['administrator'] },
        { id: 'email-templates', label: 'Email Templates', icon: FileText, allowedRoles: ['administrator'] },
        { id: 'pppoe-setup', label: 'PPPoE Setup', icon: Router, allowedRoles: ['administrator'] },
        { id: 'concern-config', label: 'Concern Config', icon: AlertCircle, allowedRoles: ['administrator'] }
      ]
    },
    {
      id: 'users',
      label: 'Users',
      icon: Users,
      allowedRoles: ['administrator'],
      children: [
        { id: 'user-management', label: 'Users Management', icon: User, allowedRoles: ['administrator'] },
        { id: 'organization-management', label: 'Organization Management', icon: Building2, allowedRoles: ['administrator'] },
        { id: 'group-management', label: 'Affiliate', icon: Shield, allowedRoles: ['administrator'] }
      ]
    },
    {
      id: 'logs',
      label: 'logs',
      icon: Users,
      allowedRoles: ['administrator'],
      children: [
        { id: 'expenses-log', label: 'Expenses Log', icon: FileBarChart, allowedRoles: ['administrator'] },
        { id: 'disconnected-logs', label: 'Disconnected Logs', icon: AlertTriangle, allowedRoles: ['administrator'] },
        { id: 'reconnection-logs', label: 'Reconnection Logs', icon: FileBarChart, allowedRoles: ['administrator'] },
        { id: 'logs', label: 'System Logs', icon: FileText, allowedRoles: ['administrator'] }
      ]
    },
    { id: 'settings', label: 'Settings', icon: Settings, allowedRoles: ['administrator', 'technician'] },
  ];

  const filterMenuByRole = (items: MenuItem[]): MenuItem[] => {
    return items.filter(item => {
      if (!item.allowedRoles || item.allowedRoles.length === 0) {
        return true;
      }

      const normalizedUserRole = userRole ? userRole.toLowerCase().trim() : '';

      const hasAccess = item.allowedRoles.some(role =>
        role.toLowerCase().trim() === normalizedUserRole
      );

      if (hasAccess && item.children) {
        // Recursively filter children
        // We need to return a new object with filtered children to avoid mutation issues 
        // if we were reusing objects, though here we recreate via map below.
        // For simplicity in this logic:
        const filteredChildren = filterMenuByRole(item.children); // This filters eagerly

        // If children exist but none are accessible, and it was a group, max hide it?
        // Original logic: "if (item.children.length === 0) return false;"
        if (filteredChildren.length === 0) {
          return false;
        }

        // WE MUST ASSIGN IT back to a new item object effectively
        item.children = filteredChildren;
      }

      return hasAccess;
    });
  };

  const getFilteredItems = () => {
    // Deep clone items to prevent mutation of the const definition during filtering
    const deepClone = (items: MenuItem[]): MenuItem[] =>
      items.map(item => ({
        ...item,
        children: item.children ? deepClone(item.children) : undefined
      }));

    return filterMenuByRole(deepClone(menuItems));
  };

  const filteredMenuItems = getFilteredItems();

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const renderMenuItem = (item: MenuItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.id);
    const isChildActive = hasChildren && item.children!.some(child => activeSection === child.id);
    const isActive = activeSection === item.id || (level === 0 && isChildActive);
    const isCurrentItemActive = activeSection === item.id;
    const IconComponent = item.icon;

    const basePadding = 16;
    const indent = level * 16;

    const activeStyle = isCurrentItemActive ? {
      backgroundColor: colorPalette?.primary ? `${colorPalette.primary}33` : isDarkMode ? 'rgba(249, 115, 22, 0.2)' : 'rgba(249, 115, 22, 0.1)',
    } : {};

    const activeTextStyle = isCurrentItemActive ? {
      color: colorPalette?.primary || (isDarkMode ? '#fb923c' : '#ea580c'),
    } : {
      color: isDarkMode ? '#d1d5db' : '#374151'
    };

    return (
      <View key={item.id}>
        <TouchableOpacity
          onPress={() => {
            if (hasChildren) {
              toggleExpanded(item.id);
            } else {
              onSectionChange(item.id);
            }
          }}
          className={`flex-row items-center justify-between py-3 pr-4`}
          style={[
            { paddingLeft: basePadding + indent },
            activeStyle,
            isCurrentItemActive ? {
              borderRightWidth: 4,
              borderRightColor: colorPalette?.primary || '#ea580c'
            } : {}
          ]}
        >
          <View className="flex-row items-center flex-1">
            <IconComponent
              size={20}
              color={isCurrentItemActive ? (activeTextStyle.color as string) : (isDarkMode ? '#9ca3af' : '#4b5563')}
              style={{ marginRight: 12 }}
            />
            {(!isCollapsed || level > 0) && ( // Always show text for children or if not collapsed
              <Text style={activeTextStyle} className="text-sm font-medium">
                {item.label}
              </Text>
            )}
          </View>

          {hasChildren && !isCollapsed && (
            <ChevronRight
              size={16}
              color={isDarkMode ? '#9ca3af' : '#4b5563'}
              style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }}
            />
          )}
        </TouchableOpacity>

        {hasChildren && isExpanded && !isCollapsed && (
          <View>
            {item.children!.map(child => renderMenuItem(child, level + 1))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View className={`flex-1 flex-col ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'
      }`}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {filteredMenuItems.map(item => renderMenuItem(item))}
      </ScrollView>

      <View className={`p-3 border-t ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
        {/* Footer User Info */}
        <View className="mb-3">
          <Text className={`text-xs mb-2 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {currentDateTime}
          </Text>
          <View className="flex-row items-center mb-2">
            <View className={`w-10 h-10 rounded-full items-center justify-center border-2 ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-200 border-gray-300'
              }`}>
              <User size={20} color={isDarkMode ? '#9ca3af' : '#4b5563'} />
            </View>
            {!isCollapsed && (
              <View className="ml-3 flex-1">
                <Text className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`} numberOfLines={1}>
                  {userEmail || 'user@example.com'}
                </Text>
                <Text className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} numberOfLines={1}>
                  {userRole}
                </Text>
              </View>
            )}
          </View>
          <View className={`h-[1px] ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'} mb-2`} />
        </View>

        <TouchableOpacity
          onPress={onLogout}
          className={`w-full px-3 py-2 rounded flex-row items-center justify-center ${isDarkMode ? 'bg-transparent' : 'bg-transparent'
            }`}
        >
          <LogOut size={16} color={isDarkMode ? '#d1d5db' : '#374151'} />
          {!isCollapsed && (
            <Text className={`ml-2 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Logout
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default Sidebar;
