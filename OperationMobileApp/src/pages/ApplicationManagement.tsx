import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { FileText, Search, ListFilter, ChevronDown, ArrowUp, ArrowDown, Menu, X, Filter, RefreshCw } from 'lucide-react-native';
import ApplicationDetails from '../components/ApplicationDetails';
import AddApplicationModal from '../modals/AddApplicationModal';
import ApplicationFunnelFilter from '../filter/ApplicationFunnelFilter';
import { getApplications } from '../services/applicationService';
import { getCities, City } from '../services/cityService';
import { getRegions, Region } from '../services/regionService';
import { Application as ApiApplication } from '../types/application';
import { locationEvents, LOCATION_EVENTS } from '../services/locationEvents';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Application {
  id: string;
  customerName: string;
  timestamp: string;
  address: string;
  location: string;
  city?: string;
  region?: string;
  barangay?: string;
  status?: string;
  email_address?: string;
  first_name?: string;
  middle_initial?: string;
  last_name?: string;
  mobile_number?: string;
  secondary_mobile_number?: string;
  installation_address?: string;
  landmark?: string;
  desired_plan?: string;
  promo?: string;
  referred_by?: string;
  create_date?: string;
  create_time?: string;
}

interface LocationItem {
  id: string;
  name: string;
  count: number;
}

type DisplayMode = 'card' | 'table';

const allColumns = [
  { key: 'timestamp', label: 'Timestamp', width: 'min-w-40' },
  { key: 'customerName', label: 'Customer Name', width: 'min-w-48' },
  { key: 'firstName', label: 'First Name', width: 'min-w-32' },
  { key: 'middleInitial', label: 'Middle Initial', width: 'min-w-28' },
  { key: 'lastName', label: 'Last Name', width: 'min-w-32' },
  { key: 'emailAddress', label: 'Email Address', width: 'min-w-48' },
  { key: 'mobileNumber', label: 'Mobile Number', width: 'min-w-36' },
  { key: 'secondaryMobileNumber', label: 'Secondary Mobile Number', width: 'min-w-40' },
  { key: 'installationAddress', label: 'Installation Address', width: 'min-w-56' },
  { key: 'landmark', label: 'Landmark', width: 'min-w-32' },
  { key: 'region', label: 'Region', width: 'min-w-28' },
  { key: 'city', label: 'City', width: 'min-w-28' },
  { key: 'barangay', label: 'Barangay', width: 'min-w-32' },
  { key: 'location', label: 'Location', width: 'min-w-40' },
  { key: 'desiredPlan', label: 'Desired Plan', width: 'min-w-36' },
  { key: 'promo', label: 'Promo', width: 'min-w-28' },
  { key: 'referredBy', label: 'Referred By', width: 'min-w-32' },
  { key: 'status', label: 'Status', width: 'min-w-28' },
  { key: 'createDate', label: 'Create Date', width: 'min-w-32' },
  { key: 'createTime', label: 'Create Time', width: 'min-w-28' }
];

const ApplicationManagement: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [locationDataLoaded, setLocationDataLoaded] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('card');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    return allColumns.map(col => col.key);
  });
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
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isFunnelFilterOpen, setIsFunnelFilterOpen] = useState<boolean>(false);
  const dropdownRef = useRef<View>(null);
  const filterDropdownRef = useRef<View>(null);
  const tableRef = useRef<ScrollView>(null);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);
  const sidebarStartXRef = useRef<number>(0);
  const sidebarStartWidthRef = useRef<number>(0);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);

  useEffect(() => {
    const checkDarkMode = async () => {
      const theme = await AsyncStorage.getItem('theme');
      setIsDarkMode(theme === 'dark' || theme === null);
    };

    checkDarkMode();
  }, []);

  useEffect(() => {
    const loadVisibleColumns = async () => {
      const saved = await AsyncStorage.getItem('applicationManagementVisibleColumns');
      if (saved) {
        try {
          setVisibleColumns(JSON.parse(saved));
        } catch (err) {
          console.error('Failed to load column visibility:', err);
        }
      }
    };
    
    loadVisibleColumns();
  }, []);

  useEffect(() => {
    const fetchLocationData = async () => {
      try {
        const [citiesData, regionsData] = await Promise.all([
          getCities(),
          getRegions()
        ]);
        setCities(citiesData || []);
        setRegions(regionsData || []);
        setLocationDataLoaded(true);
      } catch (err) {
        console.error('Failed to fetch location data:', err);
        setCities([]);
        setRegions([]);
        setLocationDataLoaded(true);
      }
    };
    
    fetchLocationData();
  }, []);

  useEffect(() => {
    if (!locationDataLoaded) return;
    fetchApplications();
  }, [locationDataLoaded]);

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

  const fetchApplications = async () => {
    try {
      setIsLoading(true);
      const apiApplications = await getApplications();
      
      if (apiApplications && apiApplications.length > 0) {
        const transformedApplications: Application[] = apiApplications.map(app => {
          const regionName = app.region || '';
          const cityName = app.city || '';
          const barangayName = app.barangay || '';
          const addressLine = app.installation_address || app.address_line || app.address || '';
          const fullAddress = [regionName, cityName, barangayName, addressLine].filter(Boolean).join(', ');
          
          return {
            id: app.id || '',
            customerName: app.customer_name || `${app.first_name || ''} ${app.middle_initial || ''} ${app.last_name || ''}`.trim(),
            timestamp: app.timestamp || (app.create_date && app.create_time ? `${app.create_date} ${app.create_time}` : ''),
            address: addressLine,
            location: app.location || fullAddress,
            status: app.status || 'pending',
            city: cityName,
            region: regionName,
            barangay: barangayName,
            email_address: app.email_address,
            first_name: app.first_name,
            middle_initial: app.middle_initial,
            last_name: app.last_name,
            mobile_number: app.mobile_number,
            secondary_mobile_number: app.secondary_mobile_number,
            installation_address: app.installation_address,
            landmark: app.landmark,
            desired_plan: app.desired_plan,
            promo: app.promo,
            referred_by: app.referred_by,
            create_date: app.create_date,
            create_time: app.create_time
          };
        });
        
        setApplications(transformedApplications);
      } else {
        setApplications([]);
      }
      
      setError(null);
    } catch (err) {
      console.error('Failed to fetch applications:', err);
      setError('Failed to load applications. Please try again.');
      setApplications([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplicationUpdate = () => {
    fetchApplications();
  };
  
  useEffect(() => {
    const handleLocationUpdate = async () => {
      try {
        const citiesData = await getCities();
        setCities(citiesData || []);
      } catch (err) {
        console.error('Failed to refresh cities after location update:', err);
      }
    };

    locationEvents.on(LOCATION_EVENTS.LOCATIONS_UPDATED, handleLocationUpdate);

    return () => {
      locationEvents.off(LOCATION_EVENTS.LOCATIONS_UPDATED, handleLocationUpdate);
    };
  }, []);
  
  const locationItems: LocationItem[] = useMemo(() => {
    const items: LocationItem[] = [
      {
        id: 'all',
        name: 'All',
        count: applications.length
      }
    ];
    
    const cityGroups: Record<string, number> = {};
    applications.forEach(app => {
      const cityKey = app.city || 'Unknown';
      cityGroups[cityKey] = (cityGroups[cityKey] || 0) + 1;
    });
    
    Object.entries(cityGroups).forEach(([cityName, count]) => {
      items.push({
        id: cityName.toLowerCase(),
        name: cityName,
        count: count
      });
    });
    
    cities.forEach(city => {
      if (!cityGroups[city.name]) {
        items.push({
          id: String(city.id),
          name: city.name,
          count: 0
        });
      }
    });
    
    return items;
  }, [cities, applications]);

  const filteredApplications = useMemo(() => {
    let filtered = applications.filter(application => {
      const matchesLocation = selectedLocation === 'all' || 
                             (application.city && application.city.toLowerCase() === selectedLocation) ||  
                             selectedLocation === (application.city || '').toLowerCase();
      
      const matchesSearch = searchQuery === '' || 
                           application.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           application.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (application.timestamp && application.timestamp.includes(searchQuery));
      
      return matchesLocation && matchesSearch;
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
            aValue = a.create_date && a.create_time ? `${a.create_date} ${a.create_time}` : a.timestamp || '';
            bValue = b.create_date && b.create_time ? `${b.create_date} ${b.create_time}` : b.timestamp || '';
            break;
          case 'customerName':
            aValue = a.customerName || '';
            bValue = b.customerName || '';
            break;
          case 'firstName':
            aValue = a.first_name || '';
            bValue = b.first_name || '';
            break;
          case 'middleInitial':
            aValue = a.middle_initial || '';
            bValue = b.middle_initial || '';
            break;
          case 'lastName':
            aValue = a.last_name || '';
            bValue = b.last_name || '';
            break;
          case 'emailAddress':
            aValue = a.email_address || '';
            bValue = b.email_address || '';
            break;
          case 'mobileNumber':
            aValue = a.mobile_number || '';
            bValue = b.mobile_number || '';
            break;
          case 'secondaryMobileNumber':
            aValue = a.secondary_mobile_number || '';
            bValue = b.secondary_mobile_number || '';
            break;
          case 'installationAddress':
            aValue = a.installation_address || a.address || '';
            bValue = b.installation_address || b.address || '';
            break;
          case 'landmark':
            aValue = a.landmark || '';
            bValue = b.landmark || '';
            break;
          case 'region':
            aValue = a.region || '';
            bValue = b.region || '';
            break;
          case 'city':
            aValue = a.city || '';
            bValue = b.city || '';
            break;
          case 'barangay':
            aValue = a.barangay || '';
            bValue = b.barangay || '';
            break;
          case 'location':
            aValue = a.location || '';
            bValue = b.location || '';
            break;
          case 'desiredPlan':
            aValue = a.desired_plan || '';
            bValue = b.desired_plan || '';
            break;
          case 'promo':
            aValue = a.promo || '';
            bValue = b.promo || '';
            break;
          case 'referredBy':
            aValue = a.referred_by || '';
            bValue = b.referred_by || '';
            break;
          case 'status':
            aValue = a.status || '';
            bValue = b.status || '';
            break;
          case 'createDate':
            aValue = a.create_date || '';
            bValue = b.create_date || '';
            break;
          case 'createTime':
            aValue = a.create_time || '';
            bValue = b.create_time || '';
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
  }, [applications, selectedLocation, searchQuery, sortColumn, sortDirection]);

  const handleRowClick = (application: Application) => {
    setSelectedApplication(application);
  };

  const handleToggleColumn = async (columnKey: string) => {
    const newColumns = visibleColumns.includes(columnKey)
      ? visibleColumns.filter(key => key !== columnKey)
      : [...visibleColumns, columnKey];
    setVisibleColumns(newColumns);
    await AsyncStorage.setItem('applicationManagementVisibleColumns', JSON.stringify(newColumns));
  };

  const handleSelectAllColumns = async () => {
    const allKeys = allColumns.map(col => col.key);
    setVisibleColumns(allKeys);
    await AsyncStorage.setItem('applicationManagementVisibleColumns', JSON.stringify(allKeys));
  };

  const handleDeselectAllColumns = async () => {
    setVisibleColumns([]);
    await AsyncStorage.setItem('applicationManagementVisibleColumns', JSON.stringify([]));
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

  const handleDragStart = (columnKey: string) => {
    setDraggedColumn(columnKey);
  };

  const handleDragOver = (columnKey: string) => {
    if (draggedColumn && draggedColumn !== columnKey) {
      setDragOverColumn(columnKey);
    }
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (targetColumnKey: string) => {
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

  const renderCellValue = (application: Application, columnKey: string) => {
    switch (columnKey) {
      case 'timestamp':
        return application.create_date && application.create_time 
          ? `${application.create_date} ${application.create_time}` 
          : application.timestamp || '-';
      case 'customerName':
        return application.customerName;
      case 'firstName':
        return application.first_name || '-';
      case 'middleInitial':
        return application.middle_initial || '-';
      case 'lastName':
        return application.last_name || '-';
      case 'emailAddress':
        return application.email_address || '-';
      case 'mobileNumber':
        return application.mobile_number || '-';
      case 'secondaryMobileNumber':
        return application.secondary_mobile_number || '-';
      case 'installationAddress':
        return application.installation_address || application.address || '-';
      case 'landmark':
        return application.landmark || '-';
      case 'region':
        return application.region || '-';
      case 'city':
        return application.city || '-';
      case 'barangay':
        return application.barangay || '-';
      case 'location':
        return application.location || '-';
      case 'desiredPlan':
        return application.desired_plan || '-';
      case 'promo':
        return application.promo || '-';
      case 'referredBy':
        return application.referred_by || '-';
      case 'status':
        return application.status || '-';
      case 'createDate':
        return application.create_date || '-';
      case 'createTime':
        return application.create_time || '-';
      default:
        return '-';
    }
  };

  const renderCellDisplay = (application: Application, columnKey: string) => {
    if (columnKey === 'status') {
      const status = application.status || '-';
      let textColor = '';
      
      switch (status.toLowerCase()) {
        case 'schedule':
          textColor = '#4ade80';
          break;
        case 'no facility':
          textColor = '#f87171';
          break;
        case 'cancelled':
          textColor = '#ef4444';
          break;
        case 'no slot':
          textColor = '#c084fc';
          break;
        case 'duplicate':
          textColor = '#f472b6';
          break;
        case 'in progress':
          textColor = '#60a5fa';
          break;
        case 'completed':
          textColor = '#4ade80';
          break;
        case 'pending':
          textColor = '#fb923c';
          break;
        default:
          textColor = '#9ca3af';
      }
      
      return (
        <Text style={{ fontSize: 12, paddingHorizontal: 8, paddingVertical: 4, fontWeight: 'bold', textTransform: 'uppercase', color: textColor }}>
          {status}
        </Text>
      );
    }
    return renderCellValue(application, columnKey);
  };

  const handleLocationSelect = (locationId: string) => {
    setSelectedLocation(locationId);
    setMobileMenuOpen(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: isDarkMode ? '#030712' : '#f9fafb' }}>
      <View style={{ flex: 1, flexDirection: 'row', overflow: 'hidden' }}>
        <View style={{ width: sidebarWidth, borderRightWidth: 1, borderColor: isDarkMode ? '#374151' : '#e5e7eb', backgroundColor: isDarkMode ? '#111827' : '#ffffff' }}>
          <View style={{ padding: 16, borderBottomWidth: 1, borderColor: isDarkMode ? '#374151' : '#e5e7eb' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: isDarkMode ? '#ffffff' : '#111827' }}>Applications</Text>
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
                  backgroundColor: selectedLocation === location.id ? (colorPalette?.primary ? `${colorPalette.primary}33` : 'rgba(249, 115, 22, 0.2)') : 'transparent'
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <FileText size={16} style={{ marginRight: 8 }} color={selectedLocation === location.id ? (colorPalette?.primary || '#fb923c') : (isDarkMode ? '#d1d5db' : '#4b5563')} />
                  <Text style={{ textTransform: 'capitalize', fontSize: 14, color: selectedLocation === location.id ? (colorPalette?.primary || '#fb923c') : (isDarkMode ? '#d1d5db' : '#374151') }}>{location.name}</Text>
                </View>
                {location.count > 0 && (
                  <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9999, backgroundColor: selectedLocation === location.id ? (colorPalette?.primary || '#ea580c') : (isDarkMode ? '#374151' : '#d1d5db') }}>
                    <Text style={{ fontSize: 12, color: selectedLocation === location.id ? '#ffffff' : (isDarkMode ? '#d1d5db' : '#4b5563') }}>
                      {location.count}
                    </Text>
                  </View>
                )}
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {mobileMenuOpen && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 }}>
            <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)' }} onPress={() => setMobileMenuOpen(false)} />
            <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 256, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5, flexDirection: 'column', backgroundColor: isDarkMode ? '#111827' : '#ffffff' }}>
              <View style={{ padding: 16, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderColor: isDarkMode ? '#374151' : '#e5e7eb' }}>
                <Text style={{ fontSize: 18, fontWeight: '600', color: isDarkMode ? '#ffffff' : '#111827' }}>Filters</Text>
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
                      backgroundColor: selectedLocation === location.id ? (colorPalette?.primary ? `${colorPalette.primary}33` : 'rgba(249, 115, 22, 0.2)') : 'transparent'
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <FileText size={16} style={{ marginRight: 8 }} color={selectedLocation === location.id ? (colorPalette?.primary || '#fb923c') : '#d1d5db'} />
                      <Text style={{ textTransform: 'capitalize', fontSize: 14, color: selectedLocation === location.id ? (colorPalette?.primary || '#fb923c') : '#d1d5db' }}>{location.name}</Text>
                    </View>
                    {location.count > 0 && (
                      <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9999, backgroundColor: selectedLocation === location.id ? (colorPalette?.primary || '#ea580c') : '#374151' }}>
                        <Text style={{ fontSize: 12, color: selectedLocation === location.id ? '#ffffff' : '#d1d5db' }}>
                          {location.count}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </View>
        )}

        <View style={{ flex: 1, flexDirection: 'column', paddingBottom: 64, backgroundColor: isDarkMode ? '#111827' : '#f9fafb' }}>
          <View style={{ flexDirection: 'column', flex: 1 }}>
            <View style={{ padding: 16, borderBottomWidth: 1, borderColor: isDarkMode ? '#374151' : '#e5e7eb', backgroundColor: isDarkMode ? '#111827' : '#ffffff' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Pressable
                  onPress={() => setMobileMenuOpen(true)}
                  style={{ padding: 8, borderRadius: 6, backgroundColor: isDarkMode ? '#374151' : '#e5e7eb', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Menu size={20} color={isDarkMode ? '#ffffff' : '#111827'} />
                </Pressable>
                <View style={{ position: 'relative', flex: 1 }}>
                  <TextInput
                    placeholder="Search applications..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
                    style={{ width: '100%', borderRadius: 6, paddingLeft: 40, paddingRight: 16, paddingVertical: 8, backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', color: isDarkMode ? '#ffffff' : '#111827', borderWidth: 1, borderColor: isDarkMode ? '#374151' : '#d1d5db' }}
                  />
                  <View style={{ position: 'absolute', left: 12, top: 10 }}>
                    <Search size={16} color={isDarkMode ? '#9ca3af' : '#6b7280'} />
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable
                    onPress={() => setIsFunnelFilterOpen(true)}
                    style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6, flexDirection: 'row', alignItems: 'center' }}
                  >
                    <Filter size={20} color={isDarkMode ? '#ffffff' : '#111827'} />
                  </Pressable>
                  {displayMode === 'table' && (
                    <View style={{ position: 'relative' }} ref={filterDropdownRef}>
                      <Pressable
                        style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6, flexDirection: 'row', alignItems: 'center' }}
                        onPress={() => setFilterDropdownOpen(!filterDropdownOpen)}
                      >
                        <ListFilter size={20} color={isDarkMode ? '#ffffff' : '#111827'} />
                      </Pressable>
                      {filterDropdownOpen && (
                        <View style={{ position: 'absolute', top: '100%', right: 0, marginTop: 8, width: 320, borderRadius: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5, zIndex: 50, maxHeight: 384, flexDirection: 'column', backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', borderWidth: 1, borderColor: isDarkMode ? '#374151' : '#e5e7eb' }}>
                          <View style={{ padding: 12, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderColor: isDarkMode ? '#374151' : '#e5e7eb' }}>
                            <Text style={{ fontSize: 14, fontWeight: '500', color: isDarkMode ? '#ffffff' : '#111827' }}>Column Visibility</Text>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                              <Pressable
                                onPress={handleSelectAllColumns}
                              >
                                <Text style={{ fontSize: 12, color: colorPalette?.primary || '#f97316' }}>
                                  Select All
                                </Text>
                              </Pressable>
                              <Text style={{ color: '#4b5563' }}>|</Text>
                              <Pressable
                                onPress={handleDeselectAllColumns}
                              >
                                <Text style={{ fontSize: 12, color: colorPalette?.primary || '#f97316' }}>
                                  Deselect All
                                </Text>
                              </Pressable>
                            </View>
                          </View>
                          <ScrollView style={{ flex: 1 }}>
                            {allColumns.map((column) => (
                              <Pressable
                                key={column.key}
                                style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 }}
                                onPress={() => handleToggleColumn(column.key)}
                              >
                                <View style={{ marginRight: 12, height: 16, width: 16, borderRadius: 4, backgroundColor: visibleColumns.includes(column.key) ? '#ea580c' : (isDarkMode ? '#374151' : '#e5e7eb'), borderWidth: 1, borderColor: visibleColumns.includes(column.key) ? '#ea580c' : '#4b5563' }} />
                                <Text style={{ color: isDarkMode ? '#ffffff' : '#111827', fontSize: 14 }}>{column.label}</Text>
                              </Pressable>
                            ))}
                          </ScrollView>
                        </View>
                      )}
                    </View>
                  )}
                  <View style={{ position: 'relative' }} ref={dropdownRef}>
                    <Pressable
                      style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6, flexDirection: 'row', alignItems: 'center' }}
                      onPress={() => setDropdownOpen(!dropdownOpen)}
                    >
                      <Text style={{ color: isDarkMode ? '#ffffff' : '#111827', fontSize: 14 }}>{displayMode === 'card' ? 'Card View' : 'Table View'}</Text>
                      <ChevronDown size={16} style={{ marginLeft: 4 }} color={isDarkMode ? '#ffffff' : '#111827'} />
                    </Pressable>
                    {dropdownOpen && (
                      <View style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, width: 144, borderRadius: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5, borderWidth: 1, zIndex: 50, backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', borderColor: isDarkMode ? '#374151' : '#e5e7eb' }}>
                        <Pressable
                          onPress={() => {
                            setDisplayMode('card');
                            setDropdownOpen(false);
                          }}
                          style={{ width: '100%', paddingHorizontal: 16, paddingVertical: 8 }}
                        >
                          <Text style={{ fontSize: 14, color: displayMode === 'card' ? (colorPalette?.primary || '#f97316') : (isDarkMode ? '#ffffff' : '#111827') }}>
                            Card View
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() => {
                            setDisplayMode('table');
                            setDropdownOpen(false);
                          }}
                          style={{ width: '100%', paddingHorizontal: 16, paddingVertical: 8 }}
                        >
                          <Text style={{ fontSize: 14, color: displayMode === 'table' ? (colorPalette?.primary || '#f97316') : (isDarkMode ? '#ffffff' : '#111827') }}>
                            Table View
                          </Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                  <Pressable
                    onPress={() => fetchApplications()}
                    disabled={isLoading}
                    style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6, backgroundColor: isLoading ? '#4b5563' : (colorPalette?.primary || '#ea580c') }}
                  >
                    <RefreshCw size={20} color="#ffffff" />
                  </Pressable>
                </View>
              </View>
            </View>
            
            <View style={{ flex: 1, overflow: 'hidden' }}>
              <ScrollView style={{ flex: 1 }}>
                {isLoading ? (
                  <View style={{ paddingHorizontal: 16, paddingVertical: 48, alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={colorPalette?.primary || '#ea580c'} />
                    <Text style={{ marginTop: 16, color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Loading applications...</Text>
                  </View>
                ) : error ? (
                  <View style={{ paddingHorizontal: 16, paddingVertical: 48, alignItems: 'center' }}>
                    <Text style={{ color: isDarkMode ? '#f87171' : '#dc2626' }}>{error}</Text>
                    <Pressable 
                      onPress={() => fetchApplications()}
                      style={{ marginTop: 16, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6, backgroundColor: isDarkMode ? '#374151' : '#9ca3af' }}
                    >
                      <Text style={{ color: '#ffffff' }}>Retry</Text>
                    </Pressable>
                  </View>
                ) : displayMode === 'card' ? (
                  filteredApplications.length > 0 ? (
                    <View>
                      {filteredApplications.map((application) => (
                        <Pressable
                          key={application.id}
                          onPress={() => handleRowClick(application)}
                          style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderColor: isDarkMode ? '#1f2937' : '#e5e7eb', backgroundColor: selectedApplication?.id === application.id ? (isDarkMode ? '#1f2937' : '#f3f4f6') : 'transparent' }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontWeight: '500', fontSize: 14, marginBottom: 4, textTransform: 'uppercase', color: isDarkMode ? '#ffffff' : '#111827' }}>
                                {application.customerName}
                              </Text>
                              <Text style={{ fontSize: 12, color: isDarkMode ? '#9ca3af' : '#4b5563' }}>
                                {application.create_date && application.create_time 
                                  ? `${application.create_date} ${application.create_time}` 
                                  : application.timestamp || 'Not specified'}
                                {' | '}
                                {[
                                  application.installation_address || application.address,
                                  application.location,
                                  application.barangay,
                                  application.city,
                                  application.region
                                ].filter(Boolean).join(', ')}
                              </Text>
                            </View>
                            <View style={{ flexDirection: 'column', alignItems: 'flex-end', marginLeft: 16 }}>
                              {application.status && renderCellDisplay(application, 'status')}
                            </View>
                          </View>
                        </Pressable>
                      ))}
                    </View>
                  ) : (
                    <View style={{ paddingVertical: 48, alignItems: 'center' }}>
                      <Text style={{ color: isDarkMode ? '#9ca3af' : '#4b5563' }}>
                        No applications found matching your filters
                      </Text>
                    </View>
                  )
                ) : (
                  <ScrollView horizontal>
                    <View>
                      <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: isDarkMode ? '#374151' : '#e5e7eb', backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6' }}>
                        {filteredColumns.map((column, index) => (
                          <View
                            key={column.key}
                            style={{
                              paddingVertical: 12,
                              paddingHorizontal: 12,
                              backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6',
                              borderRightWidth: index < filteredColumns.length - 1 ? 1 : 0,
                              borderColor: isDarkMode ? '#374151' : '#e5e7eb',
                              opacity: draggedColumn === column.key ? 0.5 : 1,
                              width: columnWidths[column.key] || 160
                            }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                              <Text style={{ color: isDarkMode ? '#9ca3af' : '#4b5563' }}>{column.label}</Text>
                              {(hoveredColumn === column.key || sortColumn === column.key) && (
                                <Pressable
                                  onPress={() => handleSort(column.key)}
                                >
                                  {sortColumn === column.key && sortDirection === 'desc' ? (
                                    <ArrowDown
                                      size={16}
                                      color={colorPalette?.primary || '#fb923c'}
                                    />
                                  ) : (
                                    <ArrowUp
                                      size={16}
                                      color={sortColumn === column.key ? (colorPalette?.primary || '#fb923c') : '#9ca3af'}
                                    />
                                  )}
                                </Pressable>
                              )}
                            </View>
                          </View>
                        ))}
                      </View>
                      <View>
                        {filteredApplications.length > 0 ? (
                          filteredApplications.map((application) => (
                            <Pressable 
                              key={application.id} 
                              style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: isDarkMode ? '#1f2937' : '#e5e7eb', backgroundColor: selectedApplication?.id === application.id ? (isDarkMode ? '#1f2937' : '#f3f4f6') : 'transparent' }}
                              onPress={() => handleRowClick(application)}
                            >
                              {filteredColumns.map((column, index) => (
                                <View 
                                  key={column.key}
                                  style={{
                                    paddingVertical: 16,
                                    paddingHorizontal: 12,
                                    borderRightWidth: index < filteredColumns.length - 1 ? 1 : 0,
                                    borderColor: isDarkMode ? '#1f2937' : '#e5e7eb',
                                    width: columnWidths[column.key] || 160
                                  }}
                                >
                                  <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }} numberOfLines={1}>
                                    {renderCellDisplay(application, column.key)}
                                  </Text>
                                </View>
                              ))}
                            </Pressable>
                          ))
                        ) : (
                          <View style={{ paddingHorizontal: 16, paddingVertical: 48, alignItems: 'center', borderBottomWidth: 1, borderColor: isDarkMode ? '#1f2937' : '#e5e7eb' }}>
                            <Text style={{ color: isDarkMode ? '#9ca3af' : '#4b5563' }}>
                              No applications found matching your filters
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </ScrollView>
                )}
              </ScrollView>
            </View>
          </View>
        </View>

        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: 1, zIndex: 40, backgroundColor: isDarkMode ? '#111827' : '#ffffff', borderColor: isDarkMode ? '#374151' : '#e5e7eb' }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {locationItems.map((location) => (
              <Pressable
                key={location.id}
                onPress={() => setSelectedLocation(location.id)}
                style={{
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  backgroundColor: selectedLocation === location.id ? (colorPalette?.primary ? `${colorPalette.primary}33` : 'rgba(249, 115, 22, 0.2)') : 'transparent'
                }}
              >
                <FileText size={20} style={{ marginBottom: 4 }} color={selectedLocation === location.id ? (colorPalette?.primary || '#fb923c') : (isDarkMode ? '#d1d5db' : '#4b5563')} />
                <Text style={{ textTransform: 'capitalize', fontSize: 12, color: selectedLocation === location.id ? (colorPalette?.primary || '#fb923c') : (isDarkMode ? '#d1d5db' : '#4b5563') }}>{location.name}</Text>
                {location.count > 0 && (
                  <View style={{ marginTop: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 9999, backgroundColor: selectedLocation === location.id ? (colorPalette?.primary || '#ea580c') : '#374151' }}>
                    <Text style={{ fontSize: 12, color: selectedLocation === location.id ? '#ffffff' : '#d1d5db' }}>
                      {location.count}
                    </Text>
                  </View>
                )}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>

      {selectedApplication && (
        <View style={{ overflow: 'hidden' }}>
          <ApplicationDetails 
            application={selectedApplication} 
            onClose={() => setSelectedApplication(null)}
            onApplicationUpdate={handleApplicationUpdate}
          />
        </View>
      )}

      <AddApplicationModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={() => {
          fetchApplications();
          setIsAddModalOpen(false);
        }}
      />

      <ApplicationFunnelFilter
        isOpen={isFunnelFilterOpen}
        onClose={() => setIsFunnelFilterOpen(false)}
        onApplyFilters={(filters) => {
          console.log('Applied filters:', filters);
          setIsFunnelFilterOpen(false);
        }}
      />
    </View>
  );
};

export default ApplicationManagement;
