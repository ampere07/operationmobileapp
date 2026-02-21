import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Alert, Dimensions, RefreshControl } from 'react-native';
import { FileText, Search, Circle, X, ListFilter, ArrowUp, ArrowDown, Menu, RefreshCw, ArrowLeft } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ServiceOrderDetails from '../components/ServiceOrderDetails';
// import ServiceOrderFunnelFilter from '../components/filters/ServiceOrderFunnelFilter';
import { useServiceOrderContext, type ServiceOrder } from '../contexts/ServiceOrderContext';
import { getCities, City } from '../services/cityService';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';


interface LocationItem {
  id: string;
  name: string;
  count: number;
}

type DisplayMode = 'card' | 'table';
type MobileView = 'locations' | 'orders' | 'details';

const allColumns = [
  { key: 'timestamp', label: 'Timestamp', width: 'min-w-40' },
  { key: 'supportStatus', label: 'Support Status', width: 'min-w-32' },
  { key: 'visitStatus', label: 'Visit Status', width: 'min-w-32' },
  { key: 'fullName', label: 'Full Name', width: 'min-w-40' },
  { key: 'contactNumber', label: 'Contact Number', width: 'min-w-36' },
  { key: 'fullAddress', label: 'Full Address', width: 'min-w-56' },
  { key: 'concern', label: 'Concern', width: 'min-w-36' },
  { key: 'concernRemarks', label: 'Concern Remarks', width: 'min-w-48' },
  { key: 'requestedBy', label: 'Requested By', width: 'min-w-36' },
  { key: 'assignedEmail', label: 'Assigned Email', width: 'min-w-48' },
  { key: 'repairCategory', label: 'Repair Category', width: 'min-w-36' },
  { key: 'modifiedBy', label: 'Modified By', width: 'min-w-32' },
  { key: 'modifiedDate', label: 'Modified Date', width: 'min-w-40' }
];

const ServiceOrderPage: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedServiceOrder, setSelectedServiceOrder] = useState<ServiceOrder | null>(null);
  const { serviceOrders, isLoading, error, refreshServiceOrders, silentRefresh } = useServiceOrderContext();
  const [cities, setCities] = useState<City[]>([]);
  const [userRole, setUserRole] = useState<string>('');
  const [userRoleId, setUserRoleId] = useState<number | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [userFullName, setUserFullName] = useState<string>('');
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
  // const [isFunnelFilterOpen, setIsFunnelFilterOpen] = useState<boolean>(false);
  const dropdownRef = useRef<View>(null);
  const filterDropdownRef = useRef<View>(null);
  const tableRef = useRef<ScrollView>(null);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);
  const sidebarStartXRef = useRef<number>(0);
  const sidebarStartWidthRef = useRef<number>(0);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 50;

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

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedLocation, searchQuery, sortColumn, sortDirection]);

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
          const role = userData.role || '';
          const roleId = userData.role_id || null;
          setUserRole(role);
          setUserRoleId(roleId);
          setUserEmail(userData.email || '');
          setUserFullName(userData.full_name || '');

          if (role.toLowerCase() === 'technician' || roleId === 2 || role.toLowerCase() === 'agent' || roleId === 4) {
            setMobileView('orders');
            setSelectedLocation('all');
          }
        } catch (error) {
          console.error('Error parsing auth data:', error);
        }
      }
    };
    loadAuthData();
  }, []);

  // Fetch cities
  useEffect(() => {
    const fetchCities = async () => {
      try {
        const citiesData = await getCities();
        setCities(citiesData || []);
      } catch (err) {
        console.error('Failed to fetch cities:', err);
      }
    };

    fetchCities();
  }, []);

  // Trigger silent refresh on mount to ensure data is fresh but no spinner if cached
  useEffect(() => {
    silentRefresh();
  }, [silentRefresh]);

  const handleRefresh = async () => {
    await refreshServiceOrders();
  };

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



  const filteredServiceOrders = useMemo(() => {
    // Robust detection for Technician role (Role ID 2 or role name 'technician')
    const numericRoleId = Number(userRole); // Using userRole from state which was populated from authData
    let userRoleString = '';

    // Double check authData directly for robustness similar to ApplicationVisit.tsx
    const checkAuthData = async () => {
      try {
        const authData = await AsyncStorage.getItem('authData');
        if (authData) {
          const parsed = JSON.parse(authData);
          userRoleString = (parsed.role || '').toLowerCase();
        }
      } catch (e) { }
    };

    const isTechnician = numericRoleId === 2 || userRoleString === 'technician' || numericRoleId === 4 || userRoleString === 'agent';

    let filtered = serviceOrders.filter(serviceOrder => {
      // 1. Technician 7-Day Filter for 'Resolved' tickets
      if (isTechnician) {
        const supportStatus = (serviceOrder.supportStatus || '').toLowerCase().trim();

        // Only filter if status is 'Resolved'
        if (supportStatus === 'resolved') {
          const updatedAt = serviceOrder.rawUpdatedAt;

          // If we have a date, check if it's older than 7 days
          if (updatedAt) {
            const updatedDate = new Date(updatedAt);
            if (!isNaN(updatedDate.getTime())) {
              const sevenDaysAgo = new Date();
              sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

              // If older than 7 days, HIDE it (return false)
              if (updatedDate < sevenDaysAgo) {
                return false;
              }
            }
          }
        }
      }

      const matchesLocation = selectedLocation === 'all' ||
        serviceOrder.fullAddress.toLowerCase().includes(selectedLocation.toLowerCase());

      const matchesSearch = searchQuery === '' ||
        serviceOrder.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        serviceOrder.fullAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (serviceOrder.concern && serviceOrder.concern.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesLocation || !matchesSearch) return false;

      // Role-based filtering: Agents (role_id 4) only see their own referrals
      if (userRole.toLowerCase() === 'agent' || userRoleId === 4) {
        const referredBy = (serviceOrder.referredBy || '').toLowerCase();
        // Only match if referredBy contains user's full name or email
        const matchesAgent =
          (userFullName && referredBy.includes(userFullName.toLowerCase())) ||
          (userEmail && referredBy.includes(userEmail.toLowerCase()));

        if (!matchesAgent) return false;
      }

      return true;
    });



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
          case 'supportStatus':
            aValue = a.supportStatus || '';
            bValue = b.supportStatus || '';
            break;
          case 'visitStatus':
            aValue = a.visitStatus || '';
            bValue = b.visitStatus || '';
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
          case 'assignedEmail':
            aValue = a.assignedEmail || '';
            bValue = b.assignedEmail || '';
            break;
          case 'repairCategory':
            aValue = a.repairCategory || '';
            bValue = b.repairCategory || '';
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
  }, [serviceOrders, selectedLocation, searchQuery, sortColumn, sortDirection, userRole]);

  // Derived paginated records
  const paginatedServiceOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredServiceOrders.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredServiceOrders, currentPage]);

  const totalPages = Math.ceil(filteredServiceOrders.length / itemsPerPage);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const { width } = Dimensions.get('window');
  const isTablet = width >= 768;

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
    if (!isTablet) {
      setMobileView('details');
    }
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

  const handleDragStart = (e: any, columnKey: string) => {
    setDraggedColumn(columnKey);
  };

  const handleDragOver = (e: any, columnKey: string) => {
    if (draggedColumn && draggedColumn !== columnKey) {
      setDragOverColumn(columnKey);
    }
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: any, targetColumnKey: string) => {
    if (!draggedColumn || draggedColumn === targetColumnKey) {
      setDraggedColumn(null);
      setDragOverColumn(null);
      return;
    }

    const newOrder = [...columnOrder];
    const draggedIndex = newOrder.indexOf(draggedColumn);
    const targetIndex = newOrder.indexOf(targetColumnKey);

    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedColumn);

    setColumnOrder(newOrder);
    setDraggedColumn(null);
    setDragOverColumn(null);
  };

  const handleDragEnd = () => {
    setDraggedColumn(null);
    setDragOverColumn(null);
  };

  const handleMouseDownResize = (e: any, columnKey: string) => {
    setResizingColumn(columnKey);
    startXRef.current = e.nativeEvent.pageX;
    startWidthRef.current = columnWidths[columnKey] || 100;
  };

  const handleMouseDownSidebarResize = (e: any) => {
    setIsResizingSidebar(true);
    sidebarStartXRef.current = e.nativeEvent.pageX;
    sidebarStartWidthRef.current = sidebarWidth;
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
        return serviceOrder.timestamp;
      case 'supportStatus':
        return <StatusText status={serviceOrder.supportStatus} type="support" />;
      case 'visitStatus':
        return <StatusText status={serviceOrder.visitStatus} type="visit" />;
      case 'fullName':
        return serviceOrder.fullName;
      case 'contactNumber':
        return serviceOrder.contactNumber;
      case 'fullAddress':
        return serviceOrder.fullAddress;
      case 'concern':
        return serviceOrder.concern;
      case 'concernRemarks':
        return serviceOrder.concernRemarks || '-';
      case 'requestedBy':
        return serviceOrder.requestedBy || '-';
      case 'assignedEmail':
        return serviceOrder.assignedEmail || '-';
      case 'repairCategory':
        return serviceOrder.repairCategory || '-';
      case 'modifiedBy':
        return serviceOrder.modifiedBy || '-';
      case 'modifiedDate':
        return serviceOrder.modifiedDate;
      default:
        return '-';
    }
  };

  return (
    <View style={{
      height: '100%',
      flexDirection: isTablet ? 'row' : 'column',
      overflow: 'hidden',
      backgroundColor: isDarkMode ? '#030712' : '#f9fafb'
    }}>
      {userRole.toLowerCase() !== 'technician' && userRole.toLowerCase() !== 'agent' && isTablet && (
        <View style={{
          width: sidebarWidth,
          borderRightWidth: 1,
          flexShrink: 0,
          flexDirection: 'column',
          position: 'relative',
          backgroundColor: isDarkMode ? '#111827' : '#ffffff',
          borderColor: isDarkMode ? '#374151' : '#e5e7eb'
        }}>
          <View style={{
            padding: 16,
            borderBottomWidth: 1,
            flexShrink: 0,
            borderColor: isDarkMode ? '#374151' : '#e5e7eb'
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Text style={{
                fontSize: 18,
                fontWeight: '600',
                color: isDarkMode ? '#ffffff' : '#111827'
              }}>Service Orders</Text>
            </View>
          </View>
          <ScrollView
            style={{ flex: 1 }}
            refreshControl={
              <RefreshControl
                refreshing={isLoading}
                onRefresh={handleRefresh}
                tintColor={colorPalette?.primary || '#ea580c'}
                colors={[colorPalette?.primary || '#ea580c']}
              />
            }
          >
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
                    textTransform: 'capitalize',
                    fontSize: 14,
                    color: selectedLocation === location.id ? (colorPalette?.primary || '#fb923c') : (isDarkMode ? '#d1d5db' : '#374151'),
                    fontWeight: selectedLocation === location.id ? '500' : 'normal'
                  }}>{location.name}</Text>
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
                      color: selectedLocation === location.id ? 'white' : (isDarkMode ? '#d1d5db' : '#374151')
                    }}>{location.count}</Text>
                  </View>
                )}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {mobileView === 'locations' && userRole.toLowerCase() !== 'technician' && userRole.toLowerCase() !== 'agent' && userRoleId !== 2 && userRoleId !== 4 && (
        <View style={{
          flex: 1,
          flexDirection: 'column',
          overflow: 'hidden',
          backgroundColor: isDarkMode ? '#030712' : '#f9fafb',
          display: isTablet ? 'none' : 'flex'
        }}>
          <View style={{
            padding: 16,
            paddingTop: 60,
            borderBottomWidth: 1,
            backgroundColor: isDarkMode ? '#111827' : '#ffffff',
            borderColor: isDarkMode ? '#374151' : '#e5e7eb'
          }}>
            <Text style={{
              fontSize: 18,
              fontWeight: '600',
              color: isDarkMode ? '#ffffff' : '#111827'
            }}>Service Orders</Text>
          </View>
          <ScrollView
            style={{ flex: 1 }}
            refreshControl={
              <RefreshControl
                refreshing={isLoading}
                onRefresh={handleRefresh}
                tintColor={colorPalette?.primary || '#ea580c'}
                colors={[colorPalette?.primary || '#ea580c']}
              />
            }
          >
            {locationItems.map((location) => (
              <Pressable
                key={location.id}
                onPress={() => handleLocationSelect(location.id)}
                style={{
                  width: '100%',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 16,
                  paddingVertical: 16,
                  borderBottomWidth: 1,
                  backgroundColor: selectedLocation === location.id
                    ? (colorPalette?.primary ? `${colorPalette.primary}33` : 'rgba(249, 115, 22, 0.2)')
                    : 'transparent',
                  borderColor: isDarkMode ? '#1f2937' : '#e5e7eb'
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <FileText size={20} color={selectedLocation === location.id ? (colorPalette?.primary || '#fb923c') : (isDarkMode ? '#d1d5db' : '#374151')} style={{ marginRight: 12 }} />
                  <Text style={{
                    textTransform: 'capitalize',
                    fontSize: 16,
                    color: selectedLocation === location.id ? (colorPalette?.primary || '#fb923c') : (isDarkMode ? '#d1d5db' : '#374151')
                  }}>{location.name}</Text>
                </View>
                {location.count > 0 && (
                  <View style={{
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                    borderRadius: 9999,
                    backgroundColor: selectedLocation === location.id
                      ? (colorPalette?.primary || '#ea580c')
                      : (isDarkMode ? '#374151' : '#e5e7eb')
                  }}>
                    <Text style={{
                      fontSize: 14,
                      color: selectedLocation === location.id ? 'white' : (isDarkMode ? '#d1d5db' : '#374151')
                    }}>{location.count}</Text>
                  </View>
                )}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {mobileMenuOpen && userRole.toLowerCase() !== 'technician' && userRole.toLowerCase() !== 'agent' && userRoleId !== 2 && userRoleId !== 4 && mobileView === 'orders' && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 50
        }}>
          <Pressable
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)'
            }}
            onPress={() => setMobileMenuOpen(false)}
          />
          <View style={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: 256,
            backgroundColor: isDarkMode ? '#111827' : '#ffffff',
            flexDirection: 'column'
          }}>
            <View style={{
              padding: 16,
              borderBottomWidth: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderColor: isDarkMode ? '#374151' : '#e5e7eb'
            }}>
              <Text style={{
                fontSize: 18,
                fontWeight: '600',
                color: isDarkMode ? '#ffffff' : '#111827'
              }}>Filters</Text>
              <Pressable onPress={() => setMobileMenuOpen(false)}>
                <X size={24} color={isDarkMode ? '#9ca3af' : '#4b5563'} />
              </Pressable>
            </View>
            <ScrollView style={{ flex: 1 }}>
              {locationItems.map((location) => (
                <Pressable
                  key={location.id}
                  onPress={() => handleLocationSelect(location.id)}
                  style={{
                    width: '100%',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    backgroundColor: selectedLocation === location.id
                      ? 'rgba(249, 115, 22, 0.2)'
                      : 'transparent'
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <FileText size={16} color={selectedLocation === location.id ? '#fb923c' : '#d1d5db'} style={{ marginRight: 8 }} />
                    <Text style={{
                      textTransform: 'capitalize',
                      fontSize: 14,
                      color: selectedLocation === location.id ? '#fb923c' : '#d1d5db'
                    }}>{location.name}</Text>
                  </View>
                  {location.count > 0 && (
                    <View style={{
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 9999,
                      backgroundColor: selectedLocation === location.id ? '#ea580c' : '#374151'
                    }}>
                      <Text style={{
                        fontSize: 12,
                        color: selectedLocation === location.id ? 'white' : '#d1d5db'
                      }}>{location.count}</Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      <View style={{
        overflow: 'hidden',
        flex: 1,
        flexDirection: 'column',
        backgroundColor: isDarkMode ? '#111827' : '#ffffff',
        display: ((mobileView === 'locations' && userRole.toLowerCase() !== 'technician' && userRole.toLowerCase() !== 'agent' && userRoleId !== 2 && userRoleId !== 4) || mobileView === 'details') && !isTablet ? 'none' : 'flex'
      }}>
        <View style={{ flexDirection: 'column', height: '100%' }}>
          <View style={{
            padding: 16,
            paddingTop: 60,
            borderBottomWidth: 1,
            flexShrink: 0,
            backgroundColor: isDarkMode ? '#111827' : '#ffffff',
            borderColor: isDarkMode ? '#374151' : '#e5e7eb'
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {!isTablet && mobileView === 'orders' && userRole.toLowerCase() !== 'technician' && userRole.toLowerCase() !== 'agent' && userRoleId !== 2 && userRoleId !== 4 && (
                <Pressable
                  onPress={handleMobileBack}
                  style={{
                    padding: 8,
                    borderRadius: 4,
                  }}
                >
                  <ArrowLeft size={24} color={isDarkMode ? '#ffffff' : '#111827'} />
                </Pressable>
              )}
              {userRole.toLowerCase() !== 'technician' && userRole.toLowerCase() !== 'agent' && userRoleId !== 2 && userRoleId !== 4 && mobileView === 'orders' && (
                <Pressable
                  onPress={() => setMobileMenuOpen(true)}
                  style={{
                    backgroundColor: '#374151',
                    padding: 8,
                    borderRadius: 4
                  }}
                >
                  <Menu size={20} color="white" />
                </Pressable>
              )}
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
                  onPress={handleRefresh}
                  disabled={isLoading}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 4,
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: isLoading ? '#4b5563' : (colorPalette?.primary || '#ea580c')
                  }}
                >
                  <RefreshCw size={20} color="white" />
                </Pressable>
              </View>
            </View>
          </View>

          <View style={{ flex: 1, overflow: 'hidden', flexDirection: 'column' }}>
            <ScrollView
              style={{ flex: 1 }}
              refreshControl={
                <RefreshControl
                  refreshing={isLoading}
                  onRefresh={handleRefresh}
                  tintColor={colorPalette?.primary || '#ea580c'}
                  colors={[colorPalette?.primary || '#ea580c']}
                />
              }
            >
              {isLoading ? (
                <View style={{
                  paddingHorizontal: 16,
                  paddingVertical: 48,
                  alignItems: 'center'
                }}>
                  <View style={{ flexDirection: 'column', alignItems: 'center' }}>
                    <View style={{
                      height: 16,
                      width: '33%',
                      borderRadius: 4,
                      marginBottom: 16,
                      backgroundColor: isDarkMode ? '#374151' : '#d1d5db'
                    }} />
                    <View style={{
                      height: 16,
                      width: '50%',
                      borderRadius: 4,
                      backgroundColor: isDarkMode ? '#374151' : '#d1d5db'
                    }} />
                  </View>
                  <Text style={{
                    marginTop: 16,
                    color: isDarkMode ? '#9ca3af' : '#4b5563'
                  }}>Loading service orders...</Text>
                </View>
              ) : error ? (
                <View style={{
                  paddingHorizontal: 16,
                  paddingVertical: 48,
                  alignItems: 'center'
                }}>
                  <Text style={{ color: isDarkMode ? '#f87171' : '#dc2626' }}>{error}</Text>
                  <Pressable
                    onPress={handleRefresh}
                    style={{
                      marginTop: 16,
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 4,
                      backgroundColor: isDarkMode ? '#374151' : '#9ca3af'
                    }}
                  >
                    <Text style={{ color: 'white' }}>Retry</Text>
                  </Pressable>
                </View>
              ) : (
                paginatedServiceOrders.length > 0 ? (
                  <View>
                    {paginatedServiceOrders.map((serviceOrder) => (
                      <Pressable
                        key={serviceOrder.id}
                        onPress={() => !isTablet ? handleMobileRowClick(serviceOrder) : handleRowClick(serviceOrder)}
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 12,
                          borderBottomWidth: 1,
                          backgroundColor: selectedServiceOrder?.id === serviceOrder.id ? (isDarkMode ? '#1f2937' : '#f3f4f6') : 'transparent',
                          borderColor: isDarkMode ? '#1f2937' : '#e5e7eb'
                        }}
                      >
                        <View style={{
                          flexDirection: 'row',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between'
                        }}>
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
                          <View style={{
                            flexDirection: 'column',
                            alignItems: 'flex-end',
                            gap: 4,
                            marginLeft: 16,
                            flexShrink: 0
                          }}>
                            <StatusText status={serviceOrder.supportStatus} type="support" />
                          </View>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <View style={{
                    alignItems: 'center',
                    paddingVertical: 48
                  }}>
                    <Text style={{
                      color: isDarkMode ? '#9ca3af' : '#4b5563'
                    }}>No service orders found matching your filters</Text>
                  </View>
                )
              )}
            </ScrollView>

            {!isLoading && filteredServiceOrders.length > 0 && totalPages > 1 && (
              <View style={{
                borderTopWidth: 1,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: isDarkMode ? '#111827' : '#ffffff',
                borderColor: isDarkMode ? '#374151' : '#e5e7eb'
              }}>
                <View>
                  <Text style={{
                    fontSize: 14,
                    color: isDarkMode ? '#9ca3af' : '#4b5563'
                  }}>
                    Showing <Text style={{ fontWeight: '500' }}>{(currentPage - 1) * itemsPerPage + 1}</Text> to <Text style={{ fontWeight: '500' }}>{Math.min(currentPage * itemsPerPage, filteredServiceOrders.length)}</Text> of <Text style={{ fontWeight: '500' }}>{filteredServiceOrders.length}</Text> results
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Pressable
                    onPress={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 4,
                      borderRadius: 4,
                      backgroundColor: currentPage === 1
                        ? (isDarkMode ? '#1f2937' : '#f3f4f6')
                        : (isDarkMode ? '#374151' : '#ffffff'),
                      borderWidth: currentPage === 1 ? 0 : 1,
                      borderColor: '#d1d5db'
                    }}
                  >
                    <Text style={{
                      fontSize: 14,
                      color: currentPage === 1
                        ? (isDarkMode ? '#4b5563' : '#9ca3af')
                        : (isDarkMode ? '#ffffff' : '#374151')
                    }}>Previous</Text>
                  </Pressable>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={{
                      paddingHorizontal: 8,
                      fontSize: 14,
                      color: isDarkMode ? '#ffffff' : '#111827'
                    }}>
                      Page {currentPage} of {totalPages}
                    </Text>
                  </View>

                  <Pressable
                    onPress={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 4,
                      borderRadius: 4,
                      backgroundColor: currentPage === totalPages
                        ? (isDarkMode ? '#1f2937' : '#f3f4f6')
                        : (isDarkMode ? '#374151' : '#ffffff'),
                      borderWidth: currentPage === totalPages ? 0 : 1,
                      borderColor: '#d1d5db'
                    }}
                  >
                    <Text style={{
                      fontSize: 14,
                      color: currentPage === totalPages
                        ? (isDarkMode ? '#4b5563' : '#9ca3af')
                        : (isDarkMode ? '#ffffff' : '#374151')
                    }}>Next</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        </View>
      </View>

      {selectedServiceOrder && mobileView === 'details' && (
        <View style={{
          flex: 1,
          flexDirection: 'column',
          overflow: 'hidden',
          backgroundColor: isDarkMode ? '#030712' : '#f9fafb',
          display: isTablet ? 'none' : 'flex'
        }}>
          <ServiceOrderDetails
            serviceOrder={selectedServiceOrder}
            onClose={handleMobileBack}
            isMobile={true}
          />
        </View>
      )}

      {selectedServiceOrder && mobileView !== 'details' && (
        <View style={{
          flexShrink: 0,
          overflow: 'hidden',
          display: isTablet ? 'flex' : 'none'
        }}>
          <ServiceOrderDetails
            serviceOrder={selectedServiceOrder}
            onClose={() => setSelectedServiceOrder(null)}
            isMobile={false}
          />
        </View>
      )}


    </View>
  );
};

export default ServiceOrderPage;
