import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Alert, Dimensions } from 'react-native';
import { FileText, Search, ChevronDown, RefreshCw, ListFilter, ArrowUp, ArrowDown, Menu, X, ArrowLeft, Filter, ChevronLeft, ChevronRight } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ApplicationVisitDetails from '../components/ApplicationVisitDetails';
import ApplicationVisitFunnelFilter, { FilterValues } from '../filter/ApplicationVisitFunnelFilter';
import { useApplicationVisitContext, type ApplicationVisit } from '../contexts/ApplicationVisitContext';
import { getApplication } from '../services/applicationService';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';
import { applyFilters } from '../utils/filterUtils';


interface LocationItem {
  id: string;
  name: string;
  count: number;
}

type DisplayMode = 'card' | 'table';

const allColumns = [
  { key: 'timestamp', label: 'Timestamp', width: 'min-w-40' },
  { key: 'fullName', label: 'Full Name', width: 'min-w-48' },
  { key: 'assignedEmail', label: 'Assigned Email', width: 'min-w-48' },
  { key: 'visitStatus', label: 'Visit Status', width: 'min-w-32' },
  { key: 'applicationStatus', label: 'Application Status', width: 'min-w-36' },
  { key: 'statusRemarks', label: 'Status Remarks', width: 'min-w-40' },
  { key: 'referredBy', label: 'Referred By', width: 'min-w-32' },
  { key: 'fullAddress', label: 'Full Address', width: 'min-w-56' },
  { key: 'visitBy', label: 'Visit By', width: 'min-w-32' },
  { key: 'visitWith', label: 'Visit With', width: 'min-w-32' },
  { key: 'visitWithOther', label: 'Visit With (Other)', width: 'min-w-32' },
  { key: 'visitRemarks', label: 'Visit Remarks', width: 'min-w-40' },
  { key: 'modifiedDate', label: 'Modified Date', width: 'min-w-40' },
  { key: 'modifiedBy', label: 'Modified By', width: 'min-w-32' },
  { key: 'firstName', label: 'First Name', width: 'min-w-32' },
  { key: 'middleInitial', label: 'Middle Initial', width: 'min-w-28' },
  { key: 'lastName', label: 'Last Name', width: 'min-w-32' },
  { key: 'region', label: 'Region', width: 'min-w-28' },
  { key: 'city', label: 'City', width: 'min-w-28' },
  { key: 'barangay', label: 'Barangay', width: 'min-w-32' },
  { key: 'location', label: 'Location', width: 'min-w-32' },
  { key: 'choosePlan', label: 'Choose Plan', width: 'min-w-36' },
  { key: 'promo', label: 'Promo', width: 'min-w-28' },
  { key: 'houseFrontPicture', label: 'House Front Picture', width: 'min-w-48' },
  { key: 'image1', label: 'Image 1', width: 'min-w-48' },
  { key: 'image2', label: 'Image 2', width: 'min-w-48' },
  { key: 'image3', label: 'Image 3', width: 'min-w-48' },
  { key: 'applicationId', label: 'Application ID', width: 'min-w-32' },
  { key: 'createdAt', label: 'Created At', width: 'min-w-40' }
];

const ApplicationVisitPage: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedVisit, setSelectedVisit] = useState<ApplicationVisit | null>(null);
  const { applicationVisits, isLoading, error, refreshApplicationVisits, silentRefresh } = useApplicationVisitContext();
  const [userRole, setUserRole] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('table');
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
  const [mobileView, setMobileView] = useState<'locations' | 'visits' | 'details'>('locations');
  const [isFunnelFilterOpen, setIsFunnelFilterOpen] = useState<boolean>(false);
  const [activeFilters, setActiveFilters] = useState<FilterValues>({});
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
    setCurrentPage(1);
  }, [selectedLocation, searchQuery, activeFilters, sortColumn, sortDirection]);

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
        const saved = await AsyncStorage.getItem('applicationVisitVisibleColumns');
        if (saved) {
          setVisibleColumns(JSON.parse(saved));
        }
      } catch (err) {
        console.error('Failed to load column visibility:', err);
      }
    };
    loadVisibleColumns();
  }, []);

  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return 'Not scheduled';
    try {
      return new Date(dateStr).toLocaleString();
    } catch (e) {
      return dateStr;
    }
  };

  useEffect(() => {
    const loadAuthData = async () => {
      const authData = await AsyncStorage.getItem('authData');
      if (authData) {
        try {
          const userData = JSON.parse(authData);
          setUserRole(userData.role || '');
        } catch (err) {
          // Error parsing auth data
        }
      }
    };
    loadAuthData();
  }, []);

  useEffect(() => {
    silentRefresh();
  }, [silentRefresh]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshApplicationVisits();
    setIsRefreshing(false);
  };



  const handleVisitUpdate = async () => {
    await silentRefresh();
  };

  const locationItems: LocationItem[] = [
    {
      id: 'all',
      name: 'All',
      count: applicationVisits.length
    }
  ];

  const locationSet = new Set<string>();
  applicationVisits.forEach(visit => {
    const addressParts = visit.full_address.split(',');
    const city = addressParts.length > 3 ? addressParts[3].trim() : '';
    if (city) {
      locationSet.add(city.toLowerCase());
    }
  });
  const uniqueLocations = Array.from(locationSet);

  uniqueLocations.forEach(location => {
    if (location) {
      locationItems.push({
        id: location,
        name: location.charAt(0).toUpperCase() + location.slice(1),
        count: applicationVisits.filter(visit => {
          const addressParts = visit.full_address.split(',');
          const city = addressParts.length > 3 ? addressParts[3].trim() : '';
          return city.toLowerCase() === location;
        }).length
      });
    }
  });

  let filteredVisits = applicationVisits.filter(visit => {
    const addressParts = visit.full_address.split(',');
    const city = addressParts.length > 3 ? addressParts[3].trim().toLowerCase() : '';
    const matchesLocation = selectedLocation === 'all' || city === selectedLocation;

    const matchesSearch = searchQuery === '' ||
      visit.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      visit.full_address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (visit.assigned_email || '').toLowerCase().includes(searchQuery.toLowerCase());

    return matchesLocation && matchesSearch;
  });

  filteredVisits = applyFilters(filteredVisits, activeFilters);

  const presortedVisits = [...filteredVisits].sort((a, b) => {
    const idA = parseInt(a.id) || 0;
    const idB = parseInt(b.id) || 0;
    return idB - idA;
  });

  const sortedVisits = [...presortedVisits].sort((a, b) => {
    if (!sortColumn) return 0;

    let aValue: any = '';
    let bValue: any = '';

    switch (sortColumn) {
      case 'timestamp':
        aValue = a.timestamp || '';
        bValue = b.timestamp || '';
        break;
      case 'fullName':
        aValue = a.full_name || '';
        bValue = b.full_name || '';
        break;
      case 'assignedEmail':
        aValue = a.assigned_email || '';
        bValue = b.assigned_email || '';
        break;
      case 'visitStatus':
        aValue = a.visit_status || '';
        bValue = b.visit_status || '';
        break;
      case 'applicationStatus':
        aValue = a.application_status || '';
        bValue = b.application_status || '';
        break;
      case 'statusRemarks':
        aValue = a.status_remarks || '';
        bValue = b.status_remarks || '';
        break;
      case 'referredBy':
        aValue = a.referred_by || '';
        bValue = b.referred_by || '';
        break;
      case 'fullAddress':
        aValue = a.full_address || '';
        bValue = b.full_address || '';
        break;
      case 'visitBy':
        aValue = a.visit_by || '';
        bValue = b.visit_by || '';
        break;
      case 'visitWith':
        aValue = a.visit_with || '';
        bValue = b.visit_with || '';
        break;
      case 'visitWithOther':
        aValue = a.visit_with_other || '';
        bValue = b.visit_with_other || '';
        break;
      case 'visitRemarks':
        aValue = a.visit_remarks || '';
        bValue = b.visit_remarks || '';
        break;
      case 'modifiedDate':
        aValue = a.updated_at || '';
        bValue = b.updated_at || '';
        break;
      case 'modifiedBy':
        aValue = a.updated_by_user_email || '';
        bValue = b.updated_by_user_email || '';
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
      case 'choosePlan':
        aValue = a.choose_plan || '';
        bValue = b.choose_plan || '';
        break;
      case 'promo':
        aValue = a.promo || '';
        bValue = b.promo || '';
        break;
      case 'applicationId':
        aValue = a.application_id || '';
        bValue = b.application_id || '';
        break;
      case 'createdAt':
        aValue = a.created_at || '';
        bValue = b.created_at || '';
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

  const paginatedVisits = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedVisits.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedVisits, currentPage]);

  const totalPages = Math.ceil(sortedVisits.length / itemsPerPage);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const { width } = Dimensions.get('window');
  const isTablet = width >= 768;

  const handleRowClick = async (visit: ApplicationVisit) => {
    try {
      if (!visit.application_status) {
        try {
          const applicationData = await getApplication(visit.application_id);

          const updatedVisit = {
            ...visit,
            application_status: applicationData.status || 'Pending'
          };

          setSelectedVisit(updatedVisit);
        } catch (err: any) {
          setSelectedVisit(visit);
        }
      } else {
        setSelectedVisit(visit);
      }
    } catch (err: any) {
      console.error('Failed to select visit:', err);
    }
  };

  const StatusText = ({ status, type }: { status: string; type: 'visit' | 'application' }) => {
    let textColor = '';

    if (type === 'visit') {
      switch (status.toLowerCase()) {
        case 'completed':
          textColor = '#4ade80';
          break;
        case 'scheduled':
          textColor = '#4ade80';
          break;
        case 'pending':
          textColor = '#fb923c';
          break;
        case 'cancelled':
          textColor = '#ef4444';
          break;
        default:
          textColor = '#9ca3af';
      }
    } else {
      switch (status.toLowerCase()) {
        case 'approved':
        case 'done':
        case 'schedule':
        case 'completed':
          textColor = '#4ade80';
          break;
        case 'pending':
          textColor = '#fb923c';
          break;
        case 'under review':
        case 'in progress':
          textColor = '#60a5fa';
          break;
        case 'rejected':
        case 'failed':
        case 'cancelled':
          textColor = '#ef4444';
          break;
        case 'no facility':
          textColor = '#f87171';
          break;
        case 'no slot':
          textColor = '#c084fc';
          break;
        case 'duplicate':
          textColor = '#f9a8d4';
          break;
        default:
          textColor = '#9ca3af';
      }
    }

    return (
      <Text style={{ color: textColor, fontWeight: 'bold', textTransform: 'uppercase' }}>
        {status}
      </Text>
    );
  };

  const handleToggleColumn = async (columnKey: string) => {
    setVisibleColumns(prev => {
      const newColumns = prev.includes(columnKey)
        ? prev.filter(key => key !== columnKey)
        : [...prev, columnKey];
      AsyncStorage.setItem('applicationVisitVisibleColumns', JSON.stringify(newColumns));
      return newColumns;
    });
  };

  const handleSelectAllColumns = async () => {
    const allKeys = allColumns.map(col => col.key);
    setVisibleColumns(allKeys);
    await AsyncStorage.setItem('applicationVisitVisibleColumns', JSON.stringify(allKeys));
  };

  const handleDeselectAllColumns = async () => {
    setVisibleColumns([]);
    await AsyncStorage.setItem('applicationVisitVisibleColumns', JSON.stringify([]));
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

  const renderCellValue = (visit: ApplicationVisit, columnKey: string) => {
    switch (columnKey) {
      case 'timestamp':
        return formatDate(visit.timestamp);
      case 'fullName':
        return visit.full_name;
      case 'assignedEmail':
        return visit.assigned_email || 'Unassigned';
      case 'visitStatus':
        return visit.visit_status || 'Scheduled';
      case 'applicationStatus':
        return visit.application_status || 'Pending';
      case 'statusRemarks':
        return visit.status_remarks || 'No remarks';
      case 'referredBy':
        return visit.referred_by || 'None';
      case 'fullAddress':
        return visit.full_address || 'No address';
      case 'visitBy':
        return visit.visit_by || 'Unassigned';
      case 'visitWith':
        return visit.visit_with || 'None';
      case 'visitWithOther':
        return visit.visit_with_other || 'None';
      case 'visitRemarks':
        return visit.visit_remarks || 'No remarks';
      case 'modifiedDate':
        return formatDate(visit.updated_at);
      case 'modifiedBy':
        return visit.updated_by_user_email;
      case 'firstName':
        return visit.first_name || '-';
      case 'middleInitial':
        return visit.middle_initial || '-';
      case 'lastName':
        return visit.last_name || '-';
      case 'region':
        return visit.region || '-';
      case 'city':
        return visit.city || '-';
      case 'barangay':
        return visit.barangay || '-';
      case 'location':
        return visit.location || '-';
      case 'choosePlan':
        return visit.choose_plan || '-';
      case 'promo':
        return visit.promo || '-';
      case 'applicationId':
        return visit.application_id;
      case 'createdAt':
        return formatDate(visit.created_at);
      default:
        return '-';
    }
  };

  const renderCellDisplay = (visit: ApplicationVisit, columnKey: string) => {
    if (columnKey === 'visitStatus') {
      return <StatusText status={visit.visit_status || 'Scheduled'} type="visit" />;
    }
    if (columnKey === 'applicationStatus') {
      return <StatusText status={visit.application_status || 'Pending'} type="application" />;
    }
    return renderCellValue(visit, columnKey);
  };

  const handleLocationSelect = (locationId: string) => {
    setSelectedLocation(locationId);
    setMobileMenuOpen(false);
    setMobileView('visits');
  };

  const handleMobileBack = () => {
    if (mobileView === 'details') {
      setSelectedVisit(null);
      setMobileView('visits');
    } else if (mobileView === 'visits') {
      setMobileView('locations');
    }
  };

  const handleMobileRowClick = async (visit: ApplicationVisit) => {
    await handleRowClick(visit);
    setMobileView('details');
  };

  return (
    <View style={{
      height: '100%',
      flexDirection: isTablet ? 'row' : 'column',
      overflow: 'hidden',
      paddingBottom: isTablet ? 0 : 64,
      backgroundColor: isDarkMode ? '#030712' : '#f9fafb'
    }}>
      {userRole.toLowerCase() !== 'technician' && isTablet && (
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
              }}>Application Visits</Text>
            </View>
          </View>
          <ScrollView style={{ flex: 1 }}>
            {locationItems.map((location) => (
              <Pressable
                key={location.id}
                onPress={() => {
                  setSelectedLocation(location.id);
                }}
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
                      color: selectedLocation === location.id ? 'white' : (isDarkMode ? '#d1d5db' : '#374151')
                    }}>{location.count}</Text>
                  </View>
                )}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {mobileView === 'locations' && (
        <View style={{
          flex: 1,
          flexDirection: 'column',
          overflow: 'hidden',
          backgroundColor: isDarkMode ? '#030712' : '#f9fafb',
          display: isTablet ? 'none' : 'flex'
        }}>
          <View style={{
            padding: 16,
            borderBottomWidth: 1,
            backgroundColor: isDarkMode ? '#111827' : '#ffffff',
            borderColor: isDarkMode ? '#374151' : '#e5e7eb'
          }}>
            <Text style={{
              fontSize: 18,
              fontWeight: '600',
              color: isDarkMode ? '#ffffff' : '#111827'
            }}>Application Visits</Text>
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
                      : (isDarkMode ? '#374151' : '#d1d5db')
                  }}>
                    <Text style={{
                      fontSize: 14,
                      color: selectedLocation === location.id ? 'white' : (isDarkMode ? '#d1d5db' : '#4b5563')
                    }}>{location.count}</Text>
                  </View>
                )}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {mobileMenuOpen && userRole.toLowerCase() !== 'technician' && mobileView === 'visits' && (
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
                        : (isDarkMode ? '#374151' : '#d1d5db')
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
        </View>
      )}

      <View style={{
        overflow: 'hidden',
        flex: 1,
        flexDirection: 'column',
        position: 'relative',
        zIndex: 30,
        backgroundColor: isDarkMode ? '#111827' : '#f9fafb',
        display: (mobileView === 'locations' || mobileView === 'details') && !isTablet ? 'none' : 'flex'
      }}>
        <View style={{ flexDirection: 'column', height: '100%' }}>
          <View style={{
            padding: 16,
            borderBottomWidth: 1,
            flexShrink: 0,
            position: 'relative',
            zIndex: 50,
            backgroundColor: isDarkMode ? '#111827' : '#ffffff',
            borderColor: isDarkMode ? '#374151' : '#e5e7eb'
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {userRole.toLowerCase() !== 'technician' && mobileView === 'visits' && (
                <Pressable
                  onPress={() => setMobileMenuOpen(true)}
                  style={{
                    padding: 8,
                    borderRadius: 4,
                    backgroundColor: isDarkMode ? '#374151' : '#e5e7eb'
                  }}
                >
                  <Menu size={20} color={isDarkMode ? 'white' : '#111827'} />
                </Pressable>
              )}
              <View style={{ position: 'relative', flex: 1 }}>
                <TextInput
                  placeholder="Search application visits..."
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
                      <>
                        {!isTablet && (
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
                              onPress={() => setFilterDropdownOpen(false)}
                            />
                            <View style={{
                              position: 'absolute',
                              left: 16,
                              right: 16,
                              top: 80,
                              bottom: 16,
                              borderRadius: 4,
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
                                <Pressable onPress={() => setFilterDropdownOpen(false)}>
                                  <X size={20} color={isDarkMode ? '#9ca3af' : '#4b5563'} />
                                </Pressable>
                              </View>
                              <View style={{
                                padding: 12,
                                borderBottomWidth: 1,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                borderColor: isDarkMode ? '#374151' : '#e5e7eb'
                              }}>
                                <Pressable
                                  onPress={handleSelectAllColumns}
                                  style={{
                                    paddingHorizontal: 12,
                                    paddingVertical: 4,
                                    borderRadius: 4,
                                    backgroundColor: isDarkMode ? '#374151' : '#e5e7eb'
                                  }}
                                >
                                  <Text style={{
                                    fontSize: 14,
                                    color: colorPalette?.primary || '#fb923c'
                                  }}>Select All</Text>
                                </Pressable>
                                <Pressable
                                  onPress={handleDeselectAllColumns}
                                  style={{
                                    paddingHorizontal: 12,
                                    paddingVertical: 4,
                                    borderRadius: 4,
                                    backgroundColor: isDarkMode ? '#374151' : '#e5e7eb'
                                  }}
                                >
                                  <Text style={{
                                    fontSize: 14,
                                    color: colorPalette?.primary || '#fb923c'
                                  }}>Deselect All</Text>
                                </Pressable>
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
                                      paddingVertical: 12,
                                      borderBottomWidth: 1,
                                      borderColor: isDarkMode ? '#374151' : '#e5e7eb'
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
                          </View>
                        )}

                        {isTablet && (
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
                                    color: colorPalette?.primary || '#fb923c'
                                  }}>Select All</Text>
                                </Pressable>
                                <Text style={{ color: isDarkMode ? '#4b5563' : '#9ca3af' }}>|</Text>
                                <Pressable onPress={handleDeselectAllColumns}>
                                  <Text style={{
                                    fontSize: 12,
                                    color: colorPalette?.primary || '#fb923c'
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
                      </>
                    )}
                  </View>
                )}
                <View style={{ position: 'relative', zIndex: 100 }} ref={dropdownRef}>
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
                          color: displayMode === 'card' ? (colorPalette?.primary || '#f97316') : (isDarkMode ? '#ffffff' : '#111827')
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
                          color: displayMode === 'table' ? (colorPalette?.primary || '#f97316') : (isDarkMode ? '#ffffff' : '#111827')
                        }}>Table View</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
                <Pressable
                  onPress={handleRefresh}
                  disabled={isRefreshing}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 4,
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: isRefreshing ? '#4b5563' : (colorPalette?.primary || '#ea580c')
                  }}
                >
                  <RefreshCw size={16} color="white" />
                </Pressable>
              </View>
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
                  }}>Loading application visits...</Text>
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
                  <View style={{
                    marginTop: 16,
                    padding: 16,
                    borderRadius: 4,
                    overflow: 'hidden',
                    maxHeight: 192,
                    backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6'
                  }}>
                    <Text style={{
                      fontSize: 12,
                      color: isDarkMode ? '#9ca3af' : '#4b5563'
                    }}>
                      {error}
                    </Text>
                  </View>
                </View>
              ) : displayMode === 'card' ? (
                paginatedVisits.length > 0 ? (
                  <View>
                    {paginatedVisits.map((visit) => (
                      <Pressable
                        key={visit.id}
                        onPress={() => !isTablet ? handleMobileRowClick(visit) : handleRowClick(visit)}
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 12,
                          borderBottomWidth: 1,
                          backgroundColor: selectedVisit?.id === visit.id ? (isDarkMode ? '#1f2937' : '#f3f4f6') : 'transparent',
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
                              {visit.full_name}
                            </Text>
                            <Text style={{
                              fontSize: 12,
                              color: isDarkMode ? '#9ca3af' : '#4b5563'
                            }}>
                              {formatDate(visit.timestamp)} | {visit.full_address}
                            </Text>
                          </View>
                          <View style={{
                            flexDirection: 'column',
                            alignItems: 'flex-end',
                            gap: 4,
                            marginLeft: 16,
                            flexShrink: 0
                          }}>
                            <StatusText status={visit.visit_status || 'Scheduled'} type="visit" />
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
                    }}>
                      {applicationVisits.length > 0
                        ? 'No application visits found matching your filters'
                        : 'No application visits found. Create your first visit by scheduling from the Applications page.'}
                    </Text>
                  </View>
                )
              ) : (
                <ScrollView horizontal style={{ overflow: 'hidden' }}>
                  <View>
                    <View style={{
                      flexDirection: 'row',
                      borderBottomWidth: 1,
                      position: 'relative',
                      zIndex: 10,
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
                            backgroundColor: dragOverColumn === column.key
                              ? (colorPalette?.primary ? `${colorPalette.primary}33` : 'rgba(249, 115, 22, 0.2)')
                              : (isDarkMode ? '#1f2937' : '#f3f4f6'),
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
                    {paginatedVisits.length > 0 ? (
                      paginatedVisits.map((visit) => (
                        <Pressable
                          key={visit.id}
                          onPress={() => !isTablet ? handleMobileRowClick(visit) : handleRowClick(visit)}
                          style={{
                            flexDirection: 'row',
                            borderBottomWidth: 1,
                            backgroundColor: selectedVisit?.id === visit.id ? (isDarkMode ? '#1f2937' : '#f3f4f6') : 'transparent',
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
                                {renderCellDisplay(visit, column.key)}
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
                        }}>
                          {applicationVisits.length > 0
                            ? 'No application visits found matching your filters'
                            : 'No application visits found. Create your first visit by scheduling from the Applications page.'}
                        </Text>
                      </View>
                    )}
                  </View>
                </ScrollView>
              )}
            </ScrollView>

            {!isLoading && sortedVisits.length > 0 && totalPages > 1 && (
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
                    Showing <Text style={{ fontWeight: '500' }}>{(currentPage - 1) * itemsPerPage + 1}</Text> to <Text style={{ fontWeight: '500' }}>{Math.min(currentPage * itemsPerPage, sortedVisits.length)}</Text> of <Text style={{ fontWeight: '500' }}>{sortedVisits.length}</Text> results
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

      {selectedVisit && mobileView === 'details' && (
        <View style={{
          flex: 1,
          flexDirection: 'column',
          overflow: 'hidden',
          backgroundColor: isDarkMode ? '#030712' : '#f9fafb',
          display: isTablet ? 'none' : 'flex'
        }}>
          <ApplicationVisitDetails
            applicationVisit={selectedVisit}
            onClose={handleMobileBack}
            onUpdate={handleVisitUpdate}
            isMobile={true}
          />
        </View>
      )}

      {selectedVisit && mobileView !== 'details' && (
        <View style={{
          flexShrink: 0,
          overflow: 'hidden',
          display: isTablet ? 'flex' : 'none'
        }}>
          <ApplicationVisitDetails
            applicationVisit={selectedVisit}
            onClose={() => setSelectedVisit(null)}
            onUpdate={handleVisitUpdate}
            isMobile={false}
          />
        </View>
      )}

      <ApplicationVisitFunnelFilter
        isOpen={isFunnelFilterOpen}
        onClose={() => setIsFunnelFilterOpen(false)}
        onApplyFilters={(filters) => {
          setActiveFilters(filters);
          setIsFunnelFilterOpen(false);
        }}
        currentFilters={activeFilters}
      />
    </View>
  );
};

export default ApplicationVisitPage;
