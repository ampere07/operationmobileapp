import React, { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, Users, FileText, LogOut, ChevronRight, User, Building2, Shield, FileCheck, Wrench, Map, MapPinned, MapPin, Package, CreditCard, List, Router, DollarSign, Receipt, FileBarChart, Clock, Calendar, UserCheck, AlertTriangle, Tag, MessageSquare, Settings, Network, Activity, AlertCircle } from 'lucide-react';
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
    const checkDarkMode = () => {
      const theme = localStorage.getItem('theme');
      setIsDarkMode(theme === 'dark' || theme === null);
    };

    checkDarkMode();

    const observer = new MutationObserver(() => {
      checkDarkMode();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
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
        { id: 'soa', label: 'SOA', icon: FileText, allowedRoles: ['administrator'] },
        { id: 'invoice', label: 'Invoice', icon: Receipt, allowedRoles: ['administrator'] },
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
        // { id: 'application-visit', label: 'Application Visit', icon: MapPin, allowedRoles: ['administrator', 'technician'] },
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
      allowedRoles: ['administrator', 'technician'],
      children: [
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
        { id: 'sms-template', label: 'SMS Template', icon: MessageSquare, allowedRoles: ['administrator'] },
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
      <div key={item.id}>
        <button
          onClick={() => {
            if (hasChildren) {
              toggleExpanded(item.id);
            } else {
              onSectionChange(item.id);
            }
          }}
          className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors ${level > 0 ? 'pl-8' : 'pl-4'
            } ${isCurrentItemActive
              ? ''
              : isDarkMode
                ? 'text-gray-300 hover:text-white hover:bg-gray-700'
                : 'text-gray-700 hover:text-black hover:bg-gray-100'
            }`}
          style={isCurrentItemActive ? {
            backgroundColor: colorPalette?.primary ? `${colorPalette.primary}33` : isDarkMode ? 'rgba(249, 115, 22, 0.2)' : 'rgba(249, 115, 22, 0.1)',
            color: colorPalette?.primary || (isDarkMode ? '#fb923c' : '#ea580c'),
            borderRightWidth: '2px',
            borderRightStyle: 'solid',
            borderRightColor: colorPalette?.primary || '#ea580c'
          } : {}}
        >
          <div className="flex items-center">
            <IconComponent className={`h-5 w-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
              } ${!isCollapsed ? 'mr-3' : ''}`} />
            {!isCollapsed && <span>{item.label}</span>}
          </div>
          {hasChildren && !isCollapsed && (
            <ChevronRight
              className={`h-4 w-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                } transition-transform ${isExpanded ? 'transform rotate-90' : ''
                } ${isCollapsed ? 'hidden' : ''}`}
            />
          )}
        </button>

        {hasChildren && isExpanded && !isCollapsed && (
          <div>
            {item.children!.map(child => renderMenuItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`${isCollapsed ? 'w-0 border-none' : 'w-64 border-r'
      } h-full ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'
      } flex flex-col transition-all duration-300 ease-in-out overflow-hidden`}>
      <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden scrollbar-none">
        {filteredMenuItems.map(item => renderMenuItem(item))}
      </nav>

      <div className={`px-3 py-3 ${isDarkMode ? 'border-gray-600' : 'border-gray-300'
        } border-t flex-shrink-0`}>
        {!isCollapsed && (
          <div className="mb-3">
            <div className={`text-xs mb-2 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
              {currentDateTime}
            </div>
            <div className="flex items-center mb-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-200 border-gray-300'
                } border-2`}>
                <User className={`h-5 w-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`} />
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <div className={`text-sm font-medium truncate ${isDarkMode ? 'text-gray-200' : 'text-gray-800'
                  }`}>
                  {userEmail || 'user@example.com'}
                </div>
                <div className={`text-xs truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                  {userRole}
                </div>
              </div>
            </div>
            <div className={`h-px ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'
              } mb-2`} />
          </div>
        )}

        <button
          onClick={onLogout}
          className={`w-full px-3 py-2 ${isDarkMode
            ? 'text-gray-300 hover:text-white hover:bg-gray-700'
            : 'text-gray-700 hover:text-black hover:bg-gray-100'
            } rounded transition-colors text-sm flex items-center justify-center`}
        >
          <LogOut className={`h-4 w-4 ${!isCollapsed ? 'mr-2' : ''}`} />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
