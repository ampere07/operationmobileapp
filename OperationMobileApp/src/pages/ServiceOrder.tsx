import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Modal, ActivityIndicator } from 'react-native';
import { FileText, Search, Circle, X, ListFilter, ArrowUp, ArrowDown, Menu, Filter, RefreshCw } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ServiceOrderDetails from '../components/ServiceOrderDetails';
import ServiceOrderFunnelFilter from '../components/filters/ServiceOrderFunnelFilter';
import { getServiceOrders, ServiceOrderData } from '../services/serviceOrderService';
import { getCities, City } from '../services/cityService';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';

interface ServiceOrder {
  id: string;
  ticketId: string;
  timestamp: string;
  accountNumber: string;
  fullName: string;
  contactAddress: string;
  dateInstalled: string;
  contactNumber: string;
  fullAddress: string;
  houseFrontPicture: string;
  emailAddress: string;
  plan: string;
  provider: string;
  affiliate: string;
  username: string;
  connectionType: string;
  routerModemSN: string;
  lcp: string;
  nap: string;
  port: string;
  vlan: string;
  concern: string;
  concernRemarks: string;
  visitStatus: string;
  visitBy: string;
  visitWith: string;
  visitWithOther: string;
  visitRemarks: string;
  modifiedBy: string;
  modifiedDate: string;
  userEmail: string;
  requestedBy: string;
  assignedEmail: string;
  supportRemarks: string;
  serviceCharge: string;
  repairCategory?: string;
  supportStatus?: string;
  priorityLevel?: string;
  newRouterSn?: string;
  newLcpnap?: string;
  newPlan?: string;
  clientSignatureUrl?: string;
  image1Url?: string;
  image2Url?: string;
  image3Url?: string;
}

interface LocationItem {
  id: string;
  name: string;
  count: number;
}

type DisplayMode = 'card' | 'table';
type MobileView = 'locations' | 'orders' | 'details';

const allColumns = [
  { key: 'timestamp', label: 'Timestamp', width: 160 },
  { key: 'fullName', label: 'Full Name', width: 160 },
  { key: 'contactNumber', label: 'Contact Number', width: 144 },
  { key: 'fullAddress', label: 'Full Address', width: 224 },
  { key: 'concern', label: 'Concern', width: 144 },
  { key: 'concernRemarks', label: 'Concern Remarks', width: 192 },
  { key: 'requestedBy', label: 'Requested By', width: 144 },
  { key: 'supportStatus', label: 'Support Status', width: 128 },
  { key: 'assignedEmail', label: 'Assigned Email', width: 192 },
  { key: 'repairCategory', label: 'Repair Category', width: 144 },
  { key: 'visitStatus', label: 'Visit Status', width: 128 },
  { key: 'modifiedBy', label: 'Modified By', width: 128 },
  { key: 'modifiedDate', label: 'Modified Date', width: 160 }
];

const ServiceOrder: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedServiceOrder, setSelectedServiceOrder] = useState<ServiceOrder | null>(null);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('card');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(allColumns.map(col => col.key));
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [hoveredColumn, setHoveredColumn] = useState<string | null>(null);
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [columnOrder, setColumnOrder] = useState<string[]>(allColumns.map(col => col.key));
  const [sidebarWidth, setSidebarWidth] = useState<number>(256);
  const [isResizingSidebar, setIsResizingSidebar] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [mobileView, setMobileView] = useState<MobileView>('locations');
  const [isFunnelFilterOpen, setIsFunnelFilterOpen] = useState<boolean>(false);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);
  const sidebarStartXRef = useRef<number>(0);
  const sidebarStartWidthRef = useRef<number>(0);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);
  const [activeFilters, setActiveFilters] = useState<any>({});

  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return 'Not scheduled';
    try {
      return new Date(dateStr).toLocaleString();
    } catch (e) {
      return dateStr;
    }
  };

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

  useEffect(() => {
    const checkDarkMode = async () => {
      const theme = await AsyncStorage.getItem('theme');
      setIsDarkMode(theme !== 'light');
    };

    checkDarkMode();
  }, []);
  
  useEffect(() => {
    const loadAuthData = async () => {
      const authData = await AsyncStorage.getItem('authData');
      if (authData) {
        try {
          const userData = JSON.parse(authData);
          setUserRole(userData.role || '');
          setUserEmail(userData.email || '');
        } catch (error) {
          console.error('Error parsing auth data:', error);
        }
      }
    };

    loadAuthData();
  }, []);

  useEffect(() => {
    const loadFilters = async () => {
      const saved = await AsyncStorage.getItem('serviceOrderFilters');
      if (saved) {
        try {
          setActiveFilters(JSON.parse(saved));
        } catch (err) {
          console.error('Failed to load filters:', err);
        }
      }
    };

    loadFilters();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        console.log('Fetching cities...');
        const citiesData = await getCities();
        setCities(citiesData || []);
        
        console.log('Fetching service orders from service_orders table...');
        const authData = await AsyncStorage.getItem('authData');
        let assignedEmail: string | undefined;
        
        if (authData) {
          try {
            const userData = JSON.parse(authData);
            if (userData.role && userData.role.toLowerCase() === 'technician' && userData.email) {
              assignedEmail = userData.email;
              console.log('Filtering service orders for technician:', assignedEmail);
            }
          } catch (error) {
            console.error('Error parsing auth data:', error);
          }
        }
        
        const response = await getServiceOrders(assignedEmail);
        console.log('Service Orders API Response:', response);
        
        if (response.success && Array.isArray(response.data)) {
          console.log(`Found ${response.data.length} service orders`);
          
          const processedOrders: ServiceOrder[] = response.data.map((order: ServiceOrderData) => ({
            id: order.id || '',
            ticketId: order.ticket_id || order.id || '',
            timestamp: formatDate(order.timestamp),
            accountNumber: order.account_no || '',
            fullName: order.full_name || '',
            contactAddress: order.contact_address || '',
            dateInstalled: order.date_installed || '',
            contactNumber: order.contact_number || '',
            fullAddress: order.full_address || '',
            houseFrontPicture: order.house_front_picture_url || '',
            emailAddress: order.email_address || '',
            plan: order.plan || '',
            provider: '',
            affiliate: order.group_name || '',
            username: order.username || '',
            connectionType: order.connection_type || '',
            routerModemSN: order.router_modem_sn || '',
            lcp: order.lcp || '',
            nap: order.nap || '',
            port: order.port || '',
            vlan: order.vlan || '',
            concern: order.concern || '',
            concernRemarks: order.concern_remarks || '',
            visitStatus: order.visit_status || '',
            visitBy: order.visit_by_user || '',
            visitWith: order.visit_with || '',
            visitWithOther: '',
            visitRemarks: order.visit_remarks || '',
            modifiedBy: order.updated_by_user || '',
            modifiedDate: formatDate(order.updated_at),
            userEmail: order.assigned_email || '',
            requestedBy: order.requested_by || '',
            assignedEmail: order.assigned_email || '',
            supportRemarks: order.support_remarks || '',
            serviceCharge: order.service_charge ? `₱${order.service_charge}` : '₱0.00',
            repairCategory: order.repair_category || '',
            supportStatus: order.support_status || '',
            priorityLevel: order.priority_level || '',
            newRouterSn: order.new_router_sn || '',
            newLcpnap: order.new_lcpnap || '',
            newPlan: order.new_plan || '',
            clientSignatureUrl: order.client_signature_url || '',
            image1Url: order.image1_url || '',
            image2Url: order.image2_url || '',
            image3Url: order.image3_url || ''
          }));
          
          setServiceOrders(processedOrders);
          console.log('Service orders data processed successfully');
        } else {
          console.warn('No service orders returned from API or invalid response format', response);
          setServiceOrders([]);
          
          if (response.table) {
            console.info(`Table name specified in response: ${response.table}`);
          }
          
          if (response.message) {
            if (response.message.includes('SQLSTATE') || response.message.includes('table')) {
              const formattedMessage = `Database error: ${response.message}`;
              setError(formattedMessage);
              console.error(formattedMessage);
            } else {
              setError(response.message);
            }
          }
        }
      } catch (err: any) {
        console.error('Error fetching data:', err);
        setError(`Failed to load data: ${err.message || 'Unknown error'}`);
        setServiceOrders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);
  
  const locationItems: LocationItem[] = useMemo(() => {
    const items: LocationItem[] = [
      {
        id: 'all',
        name: 'All',
        count: serviceOrders.length
      }
    ];
    
    if (cities.length > 0) {
      cities.forEach(city => {
        const cityCount = serviceOrders.filter(so => 
          so.fullAddress.toLowerCase().includes(city.name.toLowerCase())
        ).length;
        
        items.push({
          id: city.name.toLowerCase(),
          name: city.name,
          count: cityCount
        });
      });
    } else {
      const locationSet = new Set<string>();
      
      serviceOrders.forEach(so => {
        const addressParts = so.fullAddress.split(',');
        if (addressParts.length >= 2) {
          const cityPart = addressParts[addressParts.length - 2].trim().toLowerCase();
          if (cityPart && cityPart !== '') {
            locationSet.add(cityPart);
          }
        }
      });
      
      Array.from(locationSet).forEach(location => {
        const cityCount = serviceOrders.filter(so => 
          so.fullAddress.toLowerCase().includes(location)
        ).length;
        
        items.push({
          id: location,
          name: location.charAt(0).toUpperCase() + location.slice(1),
          count: cityCount
        });
      });
    }
    
    return items;
  }, [cities, serviceOrders]);
  
  const applyFunnelFilters = (orders: ServiceOrder[], filters: any): ServiceOrder[] => {
    if (!filters || Object.keys(filters).length === 0) return orders;

    return orders.filter(order => {
      return Object.entries(filters).every(([key, filter]: [string, any]) => {
        const orderValue = (order as any)[key];
        
        if (filter.type === 'text') {
          if (!filter.value) return true;
          const value = String(orderValue || '').toLowerCase();
          return value.includes(filter.value.toLowerCase());
        }
        
        if (filter.type === 'number') {
          const numValue = Number(orderValue);
          if (isNaN(numValue)) return false;
          if (filter.from !== undefined && filter.from !== '' && numValue < Number(filter.from)) return false;
          if (filter.to !== undefined && filter.to !== '' && numValue > Number(filter.to)) return false;
          return true;
        }
        
        if (filter.type === 'date') {
          if (!orderValue) return false;
          const dateValue = new Date(orderValue).getTime();
          if (filter.from && dateValue < new Date(filter.from).getTime()) return false;
          if (filter.to && dateValue > new Date(filter.to).getTime()) return false;
          return true;
        }
        
        return true;
      });
    });
  };

  const filteredServiceOrders = useMemo(() => {
    let filtered = serviceOrders.filter(serviceOrder => {
      const matchesLocation = selectedLocation === 'all' || 
                             serviceOrder.fullAddress.toLowerCase().includes(selectedLocation.toLowerCase());
      
      const matchesSearch = searchQuery === '' || 
                           serviceOrder.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           serviceOrder.fullAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (serviceOrder.concern && serviceOrder.concern.toLowerCase().includes(searchQuery.toLowerCase()));
      
      return matchesLocation && matchesSearch;
    });

    filtered = applyFunnelFilters(filtered, activeFilters);

    filtered.sort((a, b) => {
      const idA = parseInt(a.id) || 0;
      const idB = parseInt(b.id) || 0;
      return idB - idA;
    });

    if (sortColumn) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: any = '';
        let bValue: any = '';

        switch (sortColumn) {
          case 'timestamp':
            aValue = a.timestamp || '';
            bValue = b.timestamp || '';
            break;
          case 'fullName':
            aValue = a.fullName || '';
            bValue = b.fullName || '';
            break;
          case 'contactNumber':
            aValue = a.contactNumber || '';
            bValue = b.contactNumber || '';
            break;
          case 'fullAddress':
            aValue = a.fullAddress || '';
            bValue = b.fullAddress || '';
            break;
          case 'concern':
            aValue = a.concern || '';
            bValue = b.concern || '';
            break;
          case 'concernRemarks':
            aValue = a.concernRemarks || '';
            bValue = b.concernRemarks || '';
            break;
          case 'requestedBy':
            aValue = a.requestedBy || '';
            bValue = b.requestedBy || '';
            break;
          case 'supportStatus':
            aValue = a.supportStatus || '';
            bValue = b.supportStatus || '';
            break;
          case 'assignedEmail':
            aValue = a.assignedEmail || '';
            bValue = b.assignedEmail || '';
            break;
          case 'repairCategory':
            aValue = a.repairCategory || '';
            bValue = b.repairCategory || '';
            break;
          case 'visitStatus':
            aValue = a.visitStatus || '';
            bValue = b.visitStatus || '';
            break;
          case 'modifiedBy':
            aValue = a.modifiedBy || '';
            bValue = b.modifiedBy || '';
            break;
          case 'modifiedDate':
            aValue = a.modifiedDate || '';
            bValue = b.modifiedDate || '';
            break;
          default:
            return 0;
        }

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [serviceOrders, selectedLocation, searchQuery, sortColumn, sortDirection, activeFilters]);
  
  const StatusText = ({ status, type }: { status?: string, type: 'support' | 'visit' }) => {
    if (!status) return <Text style={{ color: '#9ca3af' }}>Unknown</Text>;
    
    let textColor = '';
    
    if (type === 'support') {
      switch (status.toLowerCase()) {
        case 'resolved':
        case 'completed':
          textColor = '#4ade80';
          break;
        case 'in-progress':
        case 'in progress':
          textColor = '#60a5fa';
          break;
        case 'pending':
          textColor = '#fb923c';
          break;
        case 'closed':
        case 'cancelled':
          textColor = '#9ca3af';
          break;
        default:
          textColor = '#9ca3af';
      }
    } else {
      switch (status.toLowerCase()) {
        case 'completed':
          textColor = '#4ade80';
          break;
        case 'scheduled':
        case 'reschedule':
        case 'in progress':
          textColor = '#60a5fa';
          break;
        case 'pending':
          textColor = '#fb923c';
          break;
        case 'cancelled':
        case 'failed':
          textColor = '#ef4444';
          break;
        default:
          textColor = '#9ca3af';
      }
    }
    
    return (
      <Text style={{ color: textColor, fontWeight: 'bold', textTransform: 'uppercase' }}>
        {status === 'in-progress' ? 'In Progress' : status}
      </Text>
    );
  };

  const handleRowClick = (serviceOrder: ServiceOrder) => {
    setSelectedServiceOrder(serviceOrder);
    setMobileView('details');
  };

  const handleLocationSelect = (locationId: string) => {
    setSelectedLocation(locationId);
    setMobileMenuOpen(false);
    setMobileView('orders');
  };

  const handleMobileBack = () => {
    if (mobileView === 'details') {
      setSelectedServiceOrder(null);
      setMobileView('orders');
    } else if (mobileView === 'orders') {
      setMobileView('locations');
    }
  };

  const handleMobileRowClick = (serviceOrder: ServiceOrder) => {
    setSelectedServiceOrder(serviceOrder);
    setMobileView('details');
  };

  const handleRefresh = async () => {
    try {
      setLoading(true);
      const authData = await AsyncStorage.getItem('authData');
      let assignedEmail: string | undefined;
      
      if (authData) {
        try {
          const userData = JSON.parse(authData);
          if (userData.role && userData.role.toLowerCase() === 'technician' && userData.email) {
            assignedEmail = userData.email;
          }
        } catch (error) {
          console.error('Error parsing auth data:', error);
        }
      }
      
      const response = await getServiceOrders(assignedEmail);
      
      if (response.success && Array.isArray(response.data)) {
        const processedOrders: ServiceOrder[] = response.data.map((order: ServiceOrderData) => ({
          id: order.id || '',
          ticketId: order.ticket_id || order.id || '',
          timestamp: formatDate(order.timestamp),
          accountNumber: order.account_no || '',
          fullName: order.full_name || '',
          contactAddress: order.contact_address || '',
          dateInstalled: order.date_installed || '',
          contactNumber: order.contact_number || '',
          fullAddress: order.full_address || '',
          houseFrontPicture: order.house_front_picture_url || '',
          emailAddress: order.email_address || '',
          plan: order.plan || '',
          provider: '',
          affiliate: order.group_name || '',
          username: order.username || '',
          connectionType: order.connection_type || '',
          routerModemSN: order.router_modem_sn || '',
          lcp: order.lcp || '',
          nap: order.nap || '',
          port: order.port || '',
          vlan: order.vlan || '',
          concern: order.concern || '',
          concernRemarks: order.concern_remarks || '',
          visitStatus: order.visit_status || '',
          visitBy: order.visit_by_user || '',
          visitWith: order.visit_with || '',
          visitWithOther: '',
          visitRemarks: order.visit_remarks || '',
          modifiedBy: order.updated_by_user || '',
          modifiedDate: formatDate(order.updated_at),
          userEmail: order.assigned_email || '',
          requestedBy: order.requested_by || '',
          assignedEmail: order.assigned_email || '',
          supportRemarks: order.support_remarks || '',
          serviceCharge: order.service_charge ? `₱${order.service_charge}` : '₱0.00',
          repairCategory: order.repair_category || '',
          supportStatus: order.support_status || ''
        }));
        
        setServiceOrders(processedOrders);
        setError(null);
      }
    } catch (err: any) {
      console.error('Failed to refresh service orders:', err);
      setError('Failed to refresh service orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleColumn = (columnKey: string) => {
    setVisibleColumns(prev => {
      if (prev.includes(columnKey)) {
        return prev.filter(key => key !== columnKey);
      } else {
        return [...prev, columnKey];
      }
    });
  };

  const handleSelectAllColumns = () => {
    setVisibleColumns(allColumns.map(col => col.key));
  };

  const handleDeselectAllColumns = () => {
    setVisibleColumns([]);
  };

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      if (sortDirection === 'desc') {
        setSortColumn(null);
        setSortDirection('asc');
      } else {
        setSortDirection('desc');
      }
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  const filteredColumns = allColumns
    .filter(col => visibleColumns.includes(col.key))
    .sort((a, b) => {
      const indexA = columnOrder.indexOf(a.key);
      const indexB = columnOrder.indexOf(b.key);
      return indexA - indexB;
    });

  const renderCellValue = (serviceOrder: ServiceOrder, columnKey: string) => {
    switch (columnKey) {
      case 'timestamp':
        return <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>{serviceOrder.timestamp}</Text>;
      case 'fullName':
        return <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>{serviceOrder.fullName}</Text>;
      case 'contactNumber':
        return <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>{serviceOrder.contactNumber}</Text>;
      case 'fullAddress':
        return <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }} numberOfLines={1}>{serviceOrder.fullAddress}</Text>;
      case 'concern':
        return <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>{serviceOrder.concern}</Text>;
      case 'concernRemarks':
        return <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>{serviceOrder.concernRemarks || '-'}</Text>;
      case 'requestedBy':
        return <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>{serviceOrder.requestedBy || '-'}</Text>;
      case 'supportStatus':
        return <StatusText status={serviceOrder.supportStatus} type="support" />;
      case 'assignedEmail':
        return <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>{serviceOrder.assignedEmail || '-'}</Text>;
      case 'repairCategory':
        return <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>{serviceOrder.repairCategory || '-'}</Text>;
      case 'visitStatus':
        return <StatusText status={serviceOrder.visitStatus} type="visit" />;
      case 'modifiedBy':
        return <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>{serviceOrder.modifiedBy || '-'}</Text>;
      case 'modifiedDate':
        return <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>{serviceOrder.modifiedDate}</Text>;
      default:
        return <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>-</Text>;
    }
  };
  
  if (loading) {
    return (
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: isDarkMode ? '#030712' : '#f9fafb'
      }}>
        <View style={{ flexDirection: 'column', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colorPalette?.primary || '#ea580c'} />
          <Text style={{
            marginTop: 12,
            color: isDarkMode ? '#d1d5db' : '#374151'
          }}>
            Loading service orders...
          </Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: isDarkMode ? '#030712' : '#f9fafb'
      }}>
        <View style={{
          backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
          borderWidth: 1,
          borderColor: isDarkMode ? '#374151' : '#d1d5db',
          borderRadius: 6,
          padding: 24,
          maxWidth: 512
        }}>
          <Text style={{ color: '#ef4444', fontSize: 18, fontWeight: '500', marginBottom: 8 }}>Error</Text>
          <Text style={{
            color: isDarkMode ? '#d1d5db' : '#374151',
            marginBottom: 16
          }}>{error}</Text>
          <Pressable
            onPress={handleRefresh}
            style={{
              backgroundColor: colorPalette?.primary || '#ea580c',
              paddingVertical: 8,
              paddingHorizontal: 16,
              borderRadius: 4
            }}
          >
            <Text style={{ color: '#ffffff' }}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={{
      height: '100%',
      flexDirection: 'row',
      overflow: 'hidden',
      backgroundColor: isDarkMode ? '#030712' : '#f9fafb'
    }}>
      {userRole.toLowerCase() !== 'technician' && (
        <View style={{
          borderRightWidth: 1,
          borderRightColor: isDarkMode ? '#374151' : '#e5e7eb',
          flexShrink: 0,
          flexDirection: 'column',
          position: 'relative',
          backgroundColor: isDarkMode ? '#111827' : '#ffffff',
          width: sidebarWidth
        }}>
          <View style={{
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb',
            flexShrink: 0
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Text style={{
                fontSize: 18,
                fontWeight: '600',
                color: isDarkMode ? '#ffffff' : '#111827'
              }}>Service Orders</Text>
            </View>
          </View>
          <ScrollView style={{ flex: 1 }}>
            {locationItems.map((location) => (
              <Pressable
                key={location.id}
                onPress={() => setSelectedLocation(location.id)}
                style={{
                  width: '100%',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  backgroundColor: selectedLocation === location.id 
                    ? (colorPalette?.primary ? `${colorPalette.primary}33` : 'rgba(249, 115, 22, 0.2)')
                    : 'transparent'
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <FileText size={16} color={selectedLocation === location.id ? (colorPalette?.primary || '#fb923c') : (isDarkMode ? '#d1d5db' : '#374151')} style={{ marginRight: 8 }} />
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '500',
                    textTransform: 'capitalize',
                    color: selectedLocation === location.id
                      ? (colorPalette?.primary || '#fb923c')
                      : (isDarkMode ? '#d1d5db' : '#374151')
                  }}>
                    {location.name}
                  </Text>
                </View>
                {location.count > 0 && (
                  <View style={{
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 9999,
                    backgroundColor: selectedLocation === location.id
                      ? (colorPalette?.primary || '#ea580c')
                      : (isDarkMode ? '#374151' : '#e5e7eb')
                  }}>
                    <Text style={{
                      fontSize: 12,
                      color: selectedLocation === location.id ? '#ffffff' : (isDarkMode ? '#d1d5db' : '#374151')
                    }}>
                      {location.count}
                    </Text>
                  </View>
                )}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={{
        backgroundColor: isDarkMode ? '#111827' : '#ffffff',
        overflow: 'hidden',
        flex: 1,
        flexDirection: 'column'
      }}>
        <View style={{ flexDirection: 'column', height: '100%' }}>
          <View style={{
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb',
            flexShrink: 0,
            backgroundColor: isDarkMode ? '#111827' : '#ffffff'
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ position: 'relative', flex: 1 }}>
                <TextInput
                  placeholder="Search service orders..."
                  placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  style={{
                    width: '100%',
                    borderRadius: 4,
                    paddingLeft: 40,
                    paddingRight: 16,
                    paddingVertical: 8,
                    backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6',
                    color: isDarkMode ? '#ffffff' : '#111827',
                    borderWidth: 1,
                    borderColor: isDarkMode ? '#374151' : '#d1d5db'
                  }}
                />
                <View style={{ position: 'absolute', left: 12, top: 10 }}>
                  <Search size={16} color={isDarkMode ? '#9ca3af' : '#6b7280'} />
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable
                  onPress={() => setIsFunnelFilterOpen(true)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 4,
                    backgroundColor: 'transparent'
                  }}
                >
                  <Filter size={20} color={isDarkMode ? '#ffffff' : '#111827'} />
                </Pressable>
                <Pressable
                  onPress={handleRefresh}
                  disabled={loading}
                  style={{
                    backgroundColor: loading ? '#4b5563' : (colorPalette?.primary || '#ea580c'),
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 4,
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <RefreshCw size={20} color="#ffffff" />
                </Pressable>
              </View>
            </View>
          </View>
          
          <View style={{ flex: 1, overflow: 'hidden' }}>
            <ScrollView style={{ height: '100%' }}>
              {loading ? (
                <View style={{
                  paddingHorizontal: 16,
                  paddingVertical: 48,
                  alignItems: 'center',
                  color: isDarkMode ? '#9ca3af' : '#4b5563'
                }}>
                  <ActivityIndicator size="large" color={colorPalette?.primary || '#ea580c'} />
                  <Text style={{
                    marginTop: 16,
                    color: isDarkMode ? '#9ca3af' : '#4b5563'
                  }}>Loading service orders...</Text>
                </View>
              ) : error ? (
                <View style={{
                  paddingHorizontal: 16,
                  paddingVertical: 48,
                  alignItems: 'center',
                  color: isDarkMode ? '#f87171' : '#dc2626'
                }}>
                  <Text style={{ color: isDarkMode ? '#f87171' : '#dc2626' }}>{error}</Text>
                  <Pressable 
                    onPress={handleRefresh}
                    style={{
                      marginTop: 16,
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 4,
                      backgroundColor: isDarkMode ? '#374151' : '#e5e7eb'
                    }}>
                    <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>Retry</Text>
                  </Pressable>
                </View>
              ) : displayMode === 'card' ? (
                filteredServiceOrders.length > 0 ? (
                  <View>
                    {filteredServiceOrders.map((serviceOrder) => (
                      <Pressable
                        key={serviceOrder.id}
                        onPress={() => handleRowClick(serviceOrder)}
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 12,
                          borderBottomWidth: 1,
                          borderBottomColor: isDarkMode ? '#1f2937' : '#e5e7eb',
                          backgroundColor: selectedServiceOrder?.id === serviceOrder.id 
                            ? (isDarkMode ? '#1f2937' : '#f3f4f6')
                            : 'transparent'
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={{
                              fontWeight: '500',
                              fontSize: 14,
                              marginBottom: 4,
                              color: isDarkMode ? '#ffffff' : '#111827'
                            }}>
                              {serviceOrder.fullName}
                            </Text>
                            <Text style={{
                              fontSize: 12,
                              color: isDarkMode ? '#9ca3af' : '#4b5563'
                            }}>
                              {serviceOrder.timestamp} | {serviceOrder.fullAddress}
                            </Text>
                          </View>
                          <View style={{ flexDirection: 'column', alignItems: 'flex-end', gap: 4, marginLeft: 16, flexShrink: 0 }}>
                            <StatusText status={serviceOrder.supportStatus} type="support" />
                          </View>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <View style={{
                    alignItems: 'center',
                    paddingVertical: 48,
                    color: isDarkMode ? '#9ca3af' : '#4b5563'
                  }}>
                    <Text style={{ color: isDarkMode ? '#9ca3af' : '#4b5563' }}>
                      No service orders found matching your filters
                    </Text>
                  </View>
                )
              ) : (
                <ScrollView horizontal>
                  <View>
                    <View style={{
                      flexDirection: 'row',
                      borderBottomWidth: 1,
                      borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb',
                      backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6'
                    }}>
                      {filteredColumns.map((column, index) => (
                        <View
                          key={column.key}
                          style={{
                            paddingVertical: 12,
                            paddingHorizontal: 12,
                            width: column.width,
                            borderRightWidth: index < filteredColumns.length - 1 ? 1 : 0,
                            borderRightColor: isDarkMode ? '#374151' : '#e5e7eb',
                            backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6'
                          }}
                        >
                          <Text style={{
                            fontSize: 14,
                            fontWeight: '400',
                            color: isDarkMode ? '#9ca3af' : '#4b5563'
                          }}>
                            {column.label}
                          </Text>
                        </View>
                      ))}
                    </View>
                    {filteredServiceOrders.length > 0 ? (
                      filteredServiceOrders.map((serviceOrder) => (
                        <Pressable 
                          key={serviceOrder.id} 
                          onPress={() => handleRowClick(serviceOrder)}
                          style={{
                            flexDirection: 'row',
                            borderBottomWidth: 1,
                            borderBottomColor: isDarkMode ? '#1f2937' : '#e5e7eb',
                            backgroundColor: selectedServiceOrder?.id === serviceOrder.id 
                              ? (isDarkMode ? '#1f2937' : '#f3f4f6')
                              : 'transparent'
                          }}
                        >
                          {filteredColumns.map((column, index) => (
                            <View
                              key={column.key}
                              style={{
                                paddingVertical: 16,
                                paddingHorizontal: 12,
                                width: column.width,
                                borderRightWidth: index < filteredColumns.length - 1 ? 1 : 0,
                                borderRightColor: isDarkMode ? '#1f2937' : '#e5e7eb'
                              }}
                            >
                              {renderCellValue(serviceOrder, column.key)}
                            </View>
                          ))}
                        </Pressable>
                      ))
                    ) : (
                      <View style={{
                        paddingHorizontal: 16,
                        paddingVertical: 48,
                        alignItems: 'center'
                      }}>
                        <Text style={{ color: isDarkMode ? '#9ca3af' : '#4b5563' }}>
                          No service orders found matching your filters
                        </Text>
                      </View>
                    )}
                  </View>
                </ScrollView>
              )}
            </ScrollView>
          </View>
        </View>
      </View>

      {selectedServiceOrder && (
        <View style={{ flexShrink: 0, overflow: 'hidden' }}>
          <ServiceOrderDetails 
            serviceOrder={selectedServiceOrder} 
            onClose={() => setSelectedServiceOrder(null)}
            isMobile={false}
          />
        </View>
      )}

      <ServiceOrderFunnelFilter
        isOpen={isFunnelFilterOpen}
        onClose={() => setIsFunnelFilterOpen(false)}
        onApplyFilters={async (filters) => {
          console.log('Applied filters:', filters);
          setActiveFilters(filters);
          await AsyncStorage.setItem('serviceOrderFilters', JSON.stringify(filters));
          setIsFunnelFilterOpen(false);
        }}
        currentFilters={activeFilters}
      />
    </View>
  );
};

export default ServiceOrder;
