import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { LayoutDashboard, Users, FileText, LogOut, ChevronRight, User, Building2, Shield, FileCheck, Wrench, Map, MapPinned, MapPin, Package, CreditCard, List, Router, DollarSign, Receipt, FileBarChart, Clock, Calendar, UserCheck, AlertTriangle, Tag, MessageSquare, Settings, Network, Activity, AlertCircle } from 'lucide-react-native';
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

  if (userRole?.toLowerCase() === 'customer') return null;

  const menuItems: MenuItem[] = [
    // { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, allowedRoles: ['administrator', 'customer'] },
    // { id: 'live-monitor', label: 'Live Monitor', icon: Activity, allowedRoles: ['administrator'] },
    // {
    //   id: 'billing',
    //   label: 'Billing',
    //   icon: CreditCard,
    //   allowedRoles: ['administrator', 'customer'],
    //   children: [
    //     { id: 'customer', label: 'Customer', icon: User, allowedRoles: ['administrator'] },
    //     { id: 'transaction-list', label: 'Transaction List', icon: Receipt, allowedRoles: ['administrator'] },
    //     { id: 'payment-portal', label: 'Payment Portal', icon: DollarSign, allowedRoles: ['administrator'] },
    //     { id: 'soa', label: 'SOA', icon: FileText, allowedRoles: ['administrator'] },
    //     { id: 'invoice', label: 'Invoice', icon: Receipt, allowedRoles: ['administrator'] },
    //     { id: 'overdue', label: 'Overdue', icon: Clock, allowedRoles: ['administrator'] },
    //     { id: 'dc-notice', label: 'DC Notice', icon: AlertTriangle, allowedRoles: ['administrator'] },
    //     { id: 'mass-rebate', label: 'Rebates', icon: DollarSign, allowedRoles: ['administrator'] },
    //     { id: 'staggered-payment', label: 'Staggered', icon: Calendar, allowedRoles: ['administrator'] },
    //     { id: 'discounts', label: 'Discounts', icon: Tag, allowedRoles: ['administrator'] },
    //     { id: 'billing-config', label: 'Billing Configurations', icon: Receipt, allowedRoles: ['administrator'] }
    //   ]
    // },
    {
      id: 'application',
      label: 'Application',
      icon: FileCheck,
      allowedRoles: ['administrator', 'technician'],
      children: [
        { id: 'application-management', label: 'Application', icon: FileCheck, allowedRoles: ['administrator'] },
        // { id: 'application-visit', label: 'Application Visit', icon: MapPin, allowedRoles: ['administrator', 'technician'] },
        // { id: 'promo-list', label: 'Promo', icon: Tag, allowedRoles: ['administrator'] },
        // { id: 'plan-list', label: 'Plan', icon: List, allowedRoles: ['administrator'] },
        // { id: 'location-list', label: 'Location', icon: MapPin, allowedRoles: ['administrator'] },
        // { id: 'status-remarks-list', label: 'Status Remarks', icon: List, allowedRoles: ['administrator'] }
      ]
    },
    {
      id: 'job-order-group',
      label: 'Job Order',
      icon: Wrench,
      allowedRoles: ['administrator', 'technician'],
      children: [
        { id: 'job-order', label: 'Job Order', icon: Wrench, allowedRoles: ['administrator', 'technician'] },
        // { id: 'lcp', label: 'LCP', icon: Network, allowedRoles: ['administrator'] },
        // { id: 'nap', label: 'NAP', icon: Network, allowedRoles: ['administrator'] },
        // { id: 'usage-type', label: 'Usage Type', icon: Activity, allowedRoles: ['administrator'] }
      ]
    },
    // {
    //   id: 'sms',
    //   label: 'SMS',
    //   icon: MessageSquare,
    //   allowedRoles: ['administrator'],
    //   children: [
    //     { id: 'sms-blast', label: 'SMS Blast', icon: MessageSquare, allowedRoles: ['administrator'] }
    //   ]
    // },
    {
      id: 'support',
      label: 'Support',
      icon: Wrench,
      allowedRoles: ['administrator', 'technician'],
      children: [
        { id: 'service-order', label: 'Service Order', icon: Wrench, allowedRoles: ['administrator', 'technician'] }
      ]
    },
    // {
    //   id: 'inventory-group',
    //   label: 'Inventory',
    //   icon: Package,
    //   allowedRoles: ['administrator'],
    //   children: [
    //     { id: 'inventory', label: 'Inventory', icon: Package, allowedRoles: ['administrator'] },
    //     { id: 'inventory-category-list', label: 'Inventory Category List', icon: List, allowedRoles: ['administrator'] }
    //   ]
    // },
    {
      id: 'technical',
      label: 'Technical',
      icon: Network,
      allowedRoles: ['administrator', 'technician'],
      children: [
        { id: 'lcp-nap-location', label: 'LCP/NAP Location', icon: MapPinned, allowedRoles: ['administrator', 'technician'] },
        // { id: 'radius-config', label: 'Radius Config', icon: MapPin, allowedRoles: ['administrator'] },
        // { id: 'sms-config', label: 'SMS Config', icon: MessageSquare, allowedRoles: ['administrator'] },
        // { id: 'sms-template', label: 'SMS Template', icon: MessageSquare, allowedRoles: ['administrator'] },
        // { id: 'email-templates', label: 'Email Templates', icon: FileText, allowedRoles: ['administrator'] },
        // { id: 'pppoe-setup', label: 'PPPoE Setup', icon: Router, allowedRoles: ['administrator'] },
        // { id: 'concern-config', label: 'Concern Config', icon: AlertCircle, allowedRoles: ['administrator'] }
      ]
    },
    // {
    //   id: 'users',
    //   label: 'Users',
    //   icon: Users,
    //   allowedRoles: ['administrator'],
    //   children: [
    //     { id: 'user-management', label: 'Users Management', icon: User, allowedRoles: ['administrator'] },
    //     { id: 'organization-management', label: 'Organization Management', icon: Building2, allowedRoles: ['administrator'] },
    //     { id: 'group-management', label: 'Affiliate', icon: Shield, allowedRoles: ['administrator'] }
    //   ]
    // },
    // {
    //   id: 'logs',
    //   label: 'logs',
    //   icon: Users,
    //   allowedRoles: ['administrator'],
    //   children: [
    //     { id: 'expenses-log', label: 'Expenses Log', icon: FileBarChart, allowedRoles: ['administrator'] },
    //     { id: 'disconnected-logs', label: 'Disconnected Logs', icon: AlertTriangle, allowedRoles: ['administrator'] },
    //     { id: 'reconnection-logs', label: 'Reconnection Logs', icon: FileBarChart, allowedRoles: ['administrator'] },
    //     { id: 'logs', label: 'System Logs', icon: FileText, allowedRoles: ['administrator'] }
    //   ]
    // },
    // { id: 'settings', label: 'Settings', icon: Settings, allowedRoles: ['administrator', 'technician'] },
  ];

  const filterMenuByRole = (items: MenuItem[]): MenuItem[] => {
    // If the user is a customer, always return an empty menu (hide sidebar content)
    const normalizedUserRole = userRole ? userRole.toLowerCase().trim() : '';
    if (normalizedUserRole === 'customer') {
      return [];
    }

    return items.filter(item => {
      if (!item.allowedRoles || item.allowedRoles.length === 0) {
        return true;
      }

      const hasAccess = item.allowedRoles.some(role =>
        role.toLowerCase().trim() === normalizedUserRole
      );

      if (hasAccess && item.children) {
        item.children = filterMenuByRole(item.children); // Recursive call
        if (item.children.length === 0) {
          return false;
        }
      }

      return hasAccess;
    });
  };

  const filteredMenuItems = filterMenuByRole(menuItems);

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

    return (
      <View key={item.id}>
        <Pressable
          onPress={() => {
            if (hasChildren) {
              toggleExpanded(item.id);
            } else {
              onSectionChange(item.id);
            }
          }}
          style={{
            width: '100%',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 12,
            paddingLeft: level > 0 ? 32 : 16,
            backgroundColor: isCurrentItemActive
              ? (colorPalette?.primary ? `${colorPalette.primary}33` : (isDarkMode ? 'rgba(249, 115, 22, 0.2)' : 'rgba(249, 115, 22, 0.1)'))
              : 'transparent',
            borderRightWidth: isCurrentItemActive ? 2 : 0,
            borderRightColor: isCurrentItemActive ? (colorPalette?.primary || '#ea580c') : 'transparent'
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <IconComponent
              size={20}
              color={isDarkMode ? '#9ca3af' : '#4b5563'}
              style={{ marginRight: !isCollapsed ? 12 : 0 }}
            />
            {!isCollapsed && (
              <Text style={{
                fontSize: 14,
                color: isCurrentItemActive
                  ? (colorPalette?.primary || (isDarkMode ? '#fb923c' : '#ea580c'))
                  : (isDarkMode ? '#d1d5db' : '#374151')
              }}>
                {item.label}
              </Text>
            )}
          </View>
          {hasChildren && !isCollapsed && (
            <ChevronRight
              size={16}
              color={isDarkMode ? '#9ca3af' : '#4b5563'}
              style={{
                transform: [{ rotate: isExpanded ? '90deg' : '0deg' }],
                display: isCollapsed ? 'none' : 'flex'
              }}
            />
          )}
        </Pressable>

        {hasChildren && isExpanded && !isCollapsed && (
          <View>
            {item.children!.map(child => renderMenuItem(child, level + 1))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={{
      width: isCollapsed ? 80 : 256,
      borderRightWidth: 1,
      height: '100%',
      backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
      borderRightColor: isDarkMode ? '#4b5563' : '#d1d5db',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <ScrollView
        style={{ flex: 1, paddingVertical: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {filteredMenuItems.map(item => renderMenuItem(item))}
      </ScrollView>

      <View style={{
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: isDarkMode ? '#4b5563' : '#d1d5db',
        flexShrink: 0
      }}>
        {!isCollapsed && (
          <View style={{ marginBottom: 12 }}>
            <View style={{ marginBottom: 8 }}>
              <Text style={{
                fontSize: 12,
                textAlign: 'center',
                color: isDarkMode ? '#9ca3af' : '#4b5563'
              }}>
                {currentDateTime}
              </Text>
            </View>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 8
            }}>
              <View style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isDarkMode ? '#374151' : '#e5e7eb',
                borderWidth: 2,
                borderColor: isDarkMode ? '#4b5563' : '#d1d5db'
              }}>
                <User size={20} color={isDarkMode ? '#9ca3af' : '#4b5563'} />
              </View>
              <View style={{ marginLeft: 12, flex: 1, minWidth: 0 }}>
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 14,
                    fontWeight: '500',
                    color: isDarkMode ? '#e5e7eb' : '#1f2937'
                  }}
                >
                  {userEmail || 'user@example.com'}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 12,
                    color: isDarkMode ? '#9ca3af' : '#4b5563'
                  }}
                >
                  {userRole}
                </Text>
              </View>
            </View>
            <View style={{
              height: 1,
              backgroundColor: isDarkMode ? '#374151' : '#d1d5db',
              marginBottom: 8
            }} />
          </View>
        )}

        <Pressable
          onPress={onLogout}
          style={{
            width: '100%',
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 4,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <LogOut
            size={16}
            color={isDarkMode ? '#d1d5db' : '#374151'}
            style={{ marginRight: !isCollapsed ? 8 : 0 }}
          />
          {!isCollapsed && (
            <Text style={{
              fontSize: 14,
              color: isDarkMode ? '#d1d5db' : '#374151'
            }}>
              Logout
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
};

export default Sidebar;
