import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, FlatList, Alert, Dimensions, Platform } from 'react-native';
import { FileText, Search, ListFilter, ChevronDown, ArrowUp, ArrowDown, Menu, X, Filter, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ApplicationDetails from '../components/ApplicationDetails';
import AddApplicationModal from '../modals/AddApplicationModal';
import ApplicationFunnelFilter from '../filter/ApplicationFunnelFilter';
import { useApplicationContext, Application } from '../contexts/ApplicationContext';
import { getCities, City } from '../services/cityService';
import { getRegions, Region } from '../services/regionService';
import { locationEvents, LOCATION_EVENTS } from '../services/locationEvents';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';


interface LocationItem {
  id: string;
  name: string;
  count: number;
}

type DisplayMode = 'card' | 'table';

const allColumns = [
  { key: 'timestamp', label: 'Timestamp', width: 'min-w-40' },
  { key: 'status', label: 'Status', width: 'min-w-28' },
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
  { key: 'createDate', label: 'Create Date', width: 'min-w-32' },
  { key: 'createTime', label: 'Create Time', width: 'min-w-28' }
];

const ApplicationManagement: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const { applications, isLoading, error, refreshApplications, silentRefresh } = useApplicationContext();
  const [cities, setCities] = useState<City[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [locationDataLoaded, setLocationDataLoaded] = useState<boolean>(false);
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
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 50;

  useEffect(() => {
    const checkDarkMode = async () => {
      const theme = await AsyncStorage.getItem('theme');
      setIsDarkMode(theme === 'dark' || theme === null);
    };

    checkDarkMode();
  }, []);

  useEffect(() => {
    const loadVisibleColumns = async () => {
      try {
        const saved = await AsyncStorage.getItem('applicationManagementVisibleColumns');
        if (saved) {
          setVisibleColumns(JSON.parse(saved));
        }
      } catch (err) {
        console.error('Failed to load column visibility:', err);
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
    if (!locationDataLoaded) return;
    silentRefresh();
  }, [locationDataLoaded, silentRefresh]);


  const handleRefresh = async () => {
    await refreshApplications();
  };

  const handleApplicationUpdate = () => {
    silentRefresh();
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

  const paginatedApplications = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredApplications.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredApplications, currentPage]);

  const totalPages = Math.ceil(filteredApplications.length / itemsPerPage);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleRowClick = (application: Application) => {
    setSelectedApplication(application);
  };

  const handleToggleColumn = async (columnKey: string) => {
    setVisibleColumns(prev => {
      const newColumns = prev.includes(columnKey)
        ? prev.filter(key => key !== columnKey)
        : [...prev, columnKey];
      AsyncStorage.setItem('applicationManagementVisibleColumns', JSON.stringify(newColumns));
      return newColumns;
    });
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

  const renderCellValue = (application: Application, columnKey: string) => {
    switch (columnKey) {
      case 'timestamp':
        return application.create_date && application.create_time
          ? `${application.create_date} ${application.create_time}`
          : application.timestamp || '-';
      case 'status':
        return application.status || '-';
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
      const statusColors: Record<string, string> = {
        'schedule': '#4ade80',
        'no facility': '#f87171',
        'cancelled': '#ef4444',
        'no slot': '#c084fc',
        'duplicate': '#f9a8d4',
        'in progress': '#60a5fa',
        'completed': '#4ade80',
        'pending': '#fb923c',
      };
      return (
        <Text style={{
          fontSize: 12,
          paddingHorizontal: 8,
          paddingVertical: 4,
          fontWeight: 'bold',
          textTransform: 'uppercase',
          color: statusColors[status.toLowerCase()] || '#9ca3af'
        }}>
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

  const { width } = Dimensions.get('window');
  const isTablet = width >= 768;

  return (
    <View style={{
      height: '100%',
      flexDirection: isTablet ? 'row' : 'column',
      overflow: 'hidden',
      backgroundColor: isDarkMode ? '#030712' : '#f9fafb'
    }}>
      {isTablet && (
        <View style={{
          width: sidebarWidth,
          borderRightWidth: 1,
          flexShrink: 0,
          flexDirection: 'column',
          position: 'relative',
          zIndex: 40,
          backgroundColor: isDarkMode ? '#111827' : '#ffffff',
          borderColor: isDarkMode ? '#374151' : '#e5e7eb'
        }}>
          <View style={{
            padding: 16,
            borderBottomWidth: 1,
            flexShrink: 0,
            borderColor: isDarkMode ? '#374151' : '#e5e7eb'
          }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 4
            }}>
              <Text style={{
                fontSize: 18,
                fontWeight: '600',
                color: isDarkMode ? '#ffffff' : '#111827'
              }}>Applications</Text>
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
                    textTransform: 'capitalize',
                    fontSize: 14,
                    color: selectedLocation === location.id ? (colorPalette?.primary || '#fb923c') : (isDarkMode ? '#d1d5db' : '#374151')
                  }}>{location.name}</Text>
                </View>
                {location.count > 0 && (
                  <View style={{
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 9999,
                    backgroundColor: selectedLocation === location.id
                      ? (colorPalette?.primary || '#ea580c')
                      : (isDarkMode ? '#374151' : '#d1d5db')
                  }}>
                    <Text style={{
                      fontSize: 12,
                      color: selectedLocation === location.id ? 'white' : (isDarkMode ? '#d1d5db' : '#4b5563')
                    }}>{location.count}</Text>
                  </View>
                )}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {mobileMenuOpen && (
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
                      ? (colorPalette?.primary ? `${colorPalette.primary}33` : 'rgba(249, 115, 22, 0.2)')
                      : 'transparent'
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <FileText size={16} color={selectedLocation === location.id ? (colorPalette?.primary || '#fb923c') : '#d1d5db'} style={{ marginRight: 8 }} />
                    <Text style={{
                      textTransform: 'capitalize',
                      fontSize: 14,
                      color: selectedLocation === location.id ? (colorPalette?.primary || '#fb923c') : '#d1d5db'
                    }}>{location.name}</Text>
                  </View>
                  {location.count > 0 && (
                    <View style={{
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 9999,
                      backgroundColor: selectedLocation === location.id
                        ? (colorPalette?.primary || '#ea580c')
                        : '#374151'
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
        paddingBottom: isTablet ? 0 : 64,
        backgroundColor: isDarkMode ? '#111827' : '#f9fafb'
      }}>
        <View style={{ flexDirection: 'column', height: '100%' }}>
          <View style={{
            padding: 16,
            borderBottomWidth: 1,
            flexShrink: 0,
            backgroundColor: isDarkMode ? '#111827' : '#ffffff',
            borderColor: isDarkMode ? '#374151' : '#e5e7eb'
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {!isTablet && (
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
                  placeholder="Search applications..."
                  placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  style={{
                    width: '100%',
                    borderRadius: 4,
                    paddingLeft: 40,
                    paddingRight: 16,
                    paddingVertical: 8,
                    backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                    color: isDarkMode ? '#ffffff' : '#111827',
                    borderWidth: 1,
                    borderColor: isDarkMode ? '#374151' : '#d1d5db'
                  }}
                  onFocus={() => {}}
                  onBlur={() => {}}
                />
                <View style={{ position: 'absolute', left: 12, top: 10 }}>
                  <Search size={16} color={isDarkMode ? '#9ca3af' : '#6b7280'} />
                </View>
              </View>
              {isTablet && (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable
                    onPress={() => setIsFunnelFilterOpen(true)}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 4
                    }}
                  >
                    <Filter size={20} color={isDarkMode ? '#ffffff' : '#111827'} />
                  </Pressable>
                  {displayMode === 'table' && (
                    <View style={{ position: 'relative' }} ref={filterDropdownRef}>
                      <Pressable
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 8,
                          borderRadius: 4
                        }}
                        onPress={() => setFilterDropdownOpen(!filterDropdownOpen)}
                      >
                        <ListFilter size={20} color={isDarkMode ? '#ffffff' : '#111827'} />
                      </Pressable>
                      {filterDropdownOpen && (
                        <View style={{
                          position: 'absolute',
                          top: '100%',
                          right: 0,
                          marginTop: 8,
                          width: 320,
                          borderRadius: 4,
                          zIndex: 50,
                          maxHeight: 384,
                          flexDirection: 'column',
                          backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                          borderWidth: 1,
                          borderColor: isDarkMode ? '#374151' : '#e5e7eb'
                        }}>
                          <View style={{
                            padding: 12,
                            borderBottomWidth: 1,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            borderColor: isDarkMode ? '#374151' : '#e5e7eb'
                          }}>
                            <Text style={{
                              fontSize: 14,
                              fontWeight: '500',
                              color: isDarkMode ? '#ffffff' : '#111827'
                            }}>Column Visibility</Text>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                              <Pressable onPress={handleSelectAllColumns}>
                                <Text style={{
                                  fontSize: 12,
                                  color: colorPalette?.primary || '#f97316'
                                }}>Select All</Text>
                              </Pressable>
                              <Text style={{ color: '#4b5563' }}>|</Text>
                              <Pressable onPress={handleDeselectAllColumns}>
                                <Text style={{
                                  fontSize: 12,
                                  color: colorPalette?.primary || '#f97316'
                                }}>Deselect All</Text>
                              </Pressable>
                            </View>
                          </View>
                          <ScrollView style={{ flex: 1 }}>
                            {allColumns.map((column) => (
                              <Pressable
                                key={column.key}
                                onPress={() => handleToggleColumn(column.key)}
                                style={{
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  paddingHorizontal: 16,
                                  paddingVertical: 8
                                }}
                              >
                                <View style={{
                                  width: 16,
                                  height: 16,
                                  borderRadius: 4,
                                  borderWidth: 1,
                                  borderColor: '#4b5563',
                                  backgroundColor: visibleColumns.includes(column.key) ? '#ea580c' : '#374151',
                                  marginRight: 12
                                }} />
                                <Text style={{
                                  fontSize: 14,
                                  color: isDarkMode ? '#ffffff' : '#111827'
                                }}>{column.label}</Text>
                              </Pressable>
                            ))}
                          </ScrollView>
                        </View>
                      )}
                    </View>
                  )}
                  <View style={{ position: 'relative' }} ref={dropdownRef}>
                    <Pressable
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 4,
                        flexDirection: 'row',
                        alignItems: 'center'
                      }}
                      onPress={() => setDropdownOpen(!dropdownOpen)}
                    >
                      <Text style={{ color: isDarkMode ? '#ffffff' : '#111827', fontSize: 14 }}>
                        {displayMode === 'card' ? 'Card View' : 'Table View'}
                      </Text>
                      <ChevronDown size={16} color={isDarkMode ? '#ffffff' : '#111827'} style={{ marginLeft: 4 }} />
                    </Pressable>
                    {dropdownOpen && (
                      <View style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        marginTop: 4,
                        width: 144,
                        borderRadius: 4,
                        borderWidth: 1,
                        zIndex: 50,
                        backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                        borderColor: isDarkMode ? '#374151' : '#e5e7eb'
                      }}>
                        <Pressable
                          onPress={() => {
                            setDisplayMode('card');
                            setDropdownOpen(false);
                          }}
                          style={{
                            width: '100%',
                            paddingHorizontal: 16,
                            paddingVertical: 8
                          }}
                        >
                          <Text style={{
                            fontSize: 14,
                            color: displayMode === 'card' ? (colorPalette?.primary || '#f97316') : (isDarkMode ? 'white' : '#111827')
                          }}>Card View</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => {
                            setDisplayMode('table');
                            setDropdownOpen(false);
                          }}
                          style={{
                            width: '100%',
                            paddingHorizontal: 16,
                            paddingVertical: 8
                          }}
                        >
                          <Text style={{
                            fontSize: 14,
                            color: displayMode === 'table' ? (colorPalette?.primary || '#f97316') : (isDarkMode ? 'white' : '#111827')
                          }}>Table View</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                  <Pressable
                    onPress={handleRefresh}
                    disabled={isLoading}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 4,
                      backgroundColor: isLoading ? '#4b5563' : (colorPalette?.primary || '#ea580c')
                    }}
                  >
                    <RefreshCw size={20} color="white" />
                  </Pressable>
                </View>
              )}
            </View>
          </View>

          <View style={{ flex: 1, overflow: 'hidden', flexDirection: 'column' }}>
            <ScrollView style={{ flex: 1 }}>
              {isLoading ? (
                <View style={{
                  paddingHorizontal: 16,
                  paddingVertical: 48,
                  alignItems: 'center',
                  color: isDarkMode ? '#9ca3af' : '#4b5563'
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
                  }}>Loading applications...</Text>
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
                    onPress={() => Alert.alert('Retry', 'Reload the application')}
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
              ) : displayMode === 'card' ? (
                paginatedApplications.length > 0 ? (
                  <View>
                    {paginatedApplications.map((application) => (
                      <Pressable
                        key={application.id}
                        onPress={() => handleRowClick(application)}
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 12,
                          borderBottomWidth: 1,
                          backgroundColor: selectedApplication?.id === application.id ? (isDarkMode ? '#1f2937' : '#f3f4f6') : 'transparent',
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
                              textTransform: 'uppercase',
                              color: isDarkMode ? '#ffffff' : '#111827'
                            }}>
                              {application.customerName}
                            </Text>
                            <Text style={{
                              fontSize: 12,
                              color: isDarkMode ? '#9ca3af' : '#4b5563'
                            }}>
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
                          <View style={{
                            flexDirection: 'column',
                            alignItems: 'flex-end',
                            gap: 4,
                            marginLeft: 16,
                            flexShrink: 0
                          }}>
                            {application.status && (
                              <View>
                                {renderCellDisplay(application, 'status')}
                              </View>
                            )}
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
                    }}>No applications found matching your filters</Text>
                  </View>
                )
              ) : (
                <ScrollView horizontal style={{ overflow: 'hidden' }}>
                  <View>
                    <View style={{
                      flexDirection: 'row',
                      borderBottomWidth: 1,
                      position: 'relative',
                      zIndex: 20,
                      backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6',
                      borderColor: isDarkMode ? '#374151' : '#e5e7eb'
                    }}>
                      {filteredColumns.map((column, index) => (
                        <Pressable
                          key={column.key}
                          style={{
                            paddingVertical: 12,
                            paddingHorizontal: 12,
                            minWidth: 100,
                            position: 'relative',
                            backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6',
                            borderRightWidth: index < filteredColumns.length - 1 ? 1 : 0,
                            borderColor: isDarkMode ? '#374151' : '#e5e7eb'
                          }}
                        >
                          <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }}>
                            <Text style={{
                              color: isDarkMode ? '#9ca3af' : '#4b5563'
                            }}>{column.label}</Text>
                            <Pressable onPress={() => handleSort(column.key)}>
                              {sortColumn === column.key && sortDirection === 'desc' ? (
                                <ArrowDown size={16} color={colorPalette?.primary || '#fb923c'} />
                              ) : (
                                <ArrowUp size={16} color={sortColumn === column.key ? (colorPalette?.primary || '#fb923c') : '#9ca3af'} />
                              )}
                            </Pressable>
                          </View>
                        </Pressable>
                      ))}
                    </View>
                    {paginatedApplications.length > 0 ? (
                      paginatedApplications.map((application) => (
                        <Pressable
                          key={application.id}
                          onPress={() => handleRowClick(application)}
                          style={{
                            flexDirection: 'row',
                            borderBottomWidth: 1,
                            backgroundColor: selectedApplication?.id === application.id ? (isDarkMode ? '#1f2937' : '#f3f4f6') : 'transparent',
                            borderColor: isDarkMode ? '#1f2937' : '#e5e7eb'
                          }}
                        >
                          {filteredColumns.map((column, index) => (
                            <View
                              key={column.key}
                              style={{
                                paddingVertical: 16,
                                paddingHorizontal: 12,
                                minWidth: 100,
                                borderRightWidth: index < filteredColumns.length - 1 ? 1 : 0,
                                borderColor: isDarkMode ? '#1f2937' : '#e5e7eb'
                              }}
                            >
                              <Text
                                numberOfLines={1}
                                style={{
                                  color: isDarkMode ? '#ffffff' : '#111827'
                                }}
                              >
                                {renderCellDisplay(application, column.key)}
                              </Text>
                            </View>
                          ))}
                        </Pressable>
                      ))
                    ) : (
                      <View style={{
                        paddingHorizontal: 16,
                        paddingVertical: 48,
                        alignItems: 'center',
                        borderBottomWidth: 1,
                        borderColor: isDarkMode ? '#1f2937' : '#e5e7eb'
                      }}>
                        <Text style={{
                          color: isDarkMode ? '#9ca3af' : '#4b5563'
                        }}>No applications found matching your filters</Text>
                      </View>
                    )}
                  </View>
                </ScrollView>
              )}
            </ScrollView>

            {!isLoading && filteredApplications.length > 0 && totalPages > 1 && (
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
                    Showing <Text style={{ fontWeight: '500' }}>{(currentPage - 1) * itemsPerPage + 1}</Text> to <Text style={{ fontWeight: '500' }}>{Math.min(currentPage * itemsPerPage, filteredApplications.length)}</Text> of <Text style={{ fontWeight: '500' }}>{filteredApplications.length}</Text> results
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

      {!isTablet && (
        <View style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          borderTopWidth: 1,
          zIndex: 40,
          backgroundColor: isDarkMode ? '#111827' : '#ffffff',
          borderColor: isDarkMode ? '#374151' : '#e5e7eb'
        }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {locationItems.map((location) => (
              <Pressable
                key={location.id}
                onPress={() => setSelectedLocation(location.id)}
                style={{
                  flexShrink: 0,
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  backgroundColor: selectedLocation === location.id
                    ? (colorPalette?.primary ? `${colorPalette.primary}33` : 'rgba(249, 115, 22, 0.2)')
                    : 'transparent'
                }}
              >
                <FileText size={20} color={selectedLocation === location.id ? (colorPalette?.primary || '#fb923c') : '#d1d5db'} style={{ marginBottom: 4 }} />
                <Text style={{
                  textTransform: 'capitalize',
                  fontSize: 12,
                  color: selectedLocation === location.id ? (colorPalette?.primary || '#fb923c') : '#d1d5db'
                }}>{location.name}</Text>
                {location.count > 0 && (
                  <View style={{
                    marginTop: 4,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 9999,
                    backgroundColor: selectedLocation === location.id
                      ? (colorPalette?.primary || '#ea580c')
                      : '#374151'
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
      )}

      {selectedApplication && (
        <View style={{ flexShrink: 0, overflow: 'hidden' }}>
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
          silentRefresh();
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
