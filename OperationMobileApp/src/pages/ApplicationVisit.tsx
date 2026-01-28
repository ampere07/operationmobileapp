import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Alert, ActivityIndicator, Image, DeviceEventEmitter } from 'react-native';
import { FileText, Search, ChevronDown, RefreshCw, ListFilter, ArrowUp, ArrowDown, Menu, X, ArrowLeft, Filter } from 'lucide-react-native';
import ApplicationVisitDetails from '../components/ApplicationVisitDetails';
import ApplicationVisitFunnelFilter, { FilterValues } from '../filter/ApplicationVisitFunnelFilter';
import { getAllApplicationVisits } from '../services/applicationVisitService';
import { getApplication } from '../services/applicationService';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';
import { applyFilters } from '../utils/filterUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ApplicationVisit {
  id: string;
  application_id: string;
  timestamp: string;
  assigned_email?: string;
  visit_by?: string;
  visit_with?: string;
  visit_with_other?: string;
  visit_status: string;
  visit_remarks?: string;
  status_remarks?: string;
  application_status?: string;
  full_name: string;
  full_address: string;
  referred_by?: string;
  updated_by_user_email: string;
  created_at: string;
  updated_at: string;
  first_name?: string;
  middle_initial?: string;
  last_name?: string;
  region?: string;
  city?: string;
  barangay?: string;
  location?: string;
  choose_plan?: string;
  promo?: string;
  house_front_picture_url?: string;
  image1_url?: string;
  image2_url?: string;
  image3_url?: string;
}

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

const ApplicationVisit: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedVisit, setSelectedVisit] = useState<ApplicationVisit | null>(null);
  const [applicationVisits, setApplicationVisits] = useState<ApplicationVisit[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
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
      setIsDarkMode(theme === 'dark' || theme === null);
    };

    checkDarkMode();

    const listener = DeviceEventEmitter.addListener('themeChange', () => {
      checkDarkMode();
    });

    return () => listener.remove();
  }, []);

  useEffect(() => {
    const loadVisibleColumns = async () => {
      const saved = await AsyncStorage.getItem('applicationVisitVisibleColumns');
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
        }
      }
    };
    
    loadAuthData();
  }, []);

  const fetchApplicationVisits = useCallback(async (isInitialLoad: boolean = false) => {
    try {
      if (isInitialLoad) {
        setLoading(true);
      }
      
      const authData = await AsyncStorage.getItem('authData');
      let assignedEmail: string | undefined;
      
      if (authData) {
        try {
          const userData = JSON.parse(authData);
          if (userData.role && userData.role.toLowerCase() === 'technician' && userData.email) {
            assignedEmail = userData.email;
          }
        } catch (err) {
        }
      }
      
      const response = await getAllApplicationVisits(assignedEmail);
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch application visits');
      }
      
      if (response.success && Array.isArray(response.data)) {
        
        const visits: ApplicationVisit[] = response.data.map((visit: any) => ({
          id: visit.id || '',
          application_id: visit.application_id || '',
          timestamp: visit.timestamp || visit.created_at || '',
          assigned_email: visit.assigned_email || '',
          visit_by: visit.visit_by || '',
          visit_with: visit.visit_with || '',
          visit_with_other: visit.visit_with_other || '',
          visit_status: visit.visit_status || 'Scheduled',
          visit_remarks: visit.visit_remarks || '',
          status_remarks: visit.status_remarks || '',
          application_status: visit.application_status || 'Pending',
          full_name: visit.full_name || '',
          full_address: visit.full_address || '',
          referred_by: visit.referred_by || '',
          updated_by_user_email: visit.updated_by_user_email || 'System',
          created_at: visit.created_at || '',
          updated_at: visit.updated_at || '',
          first_name: visit.first_name || '',
          middle_initial: visit.middle_initial || '',
          last_name: visit.last_name || '',
          region: visit.region || '',
          city: visit.city || '',
          barangay: visit.barangay || '',
          location: visit.location || '',
          choose_plan: visit.choose_plan || '',
          promo: visit.promo || '',
          house_front_picture_url: visit.house_front_picture_url || '',
          image1_url: visit.image1_url || '',
          image2_url: visit.image2_url || '',
          image3_url: visit.image3_url || '',
        }));
        
        setApplicationVisits(visits);
        setError(null);
      } else {
        setApplicationVisits([]);
        if (response.message) {
          setError(response.message);
        }
      }
    } catch (err: any) {
      if (isInitialLoad) {
        setError(err.message || 'Failed to load application visits. Please try again.');
        setApplicationVisits([]);
      }
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchApplicationVisits(true);
  }, [fetchApplicationVisits]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchApplicationVisits(false);
    }, 5 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [fetchApplicationVisits]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchApplicationVisits(false);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleVisitUpdate = async () => {
    await fetchApplicationVisits(false);
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
      setError(`Failed to select visit: ${err.message || 'Unknown error'}`);
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
          textColor = '#f472b6';
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
    const newColumns = visibleColumns.includes(columnKey)
      ? visibleColumns.filter(key => key !== columnKey)
      : [...visibleColumns, columnKey];
    setVisibleColumns(newColumns);
    await AsyncStorage.setItem('applicationVisitVisibleColumns', JSON.stringify(newColumns));
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

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: isDarkMode ? '#030712' : '#f9fafb' }}>
        <View style={{ flexDirection: 'column', alignItems: 'center' }}>
          <ActivityIndicator 
            size="large"
            color={colorPalette?.primary || '#ea580c'}
          />
          <Text style={{ marginTop: 12, color: isDarkMode ? '#d1d5db' : '#374151' }}>Loading application visits...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: isDarkMode ? '#030712' : '#f9fafb' }}>
        <View style={{ borderRadius: 6, padding: 24, maxWidth: 512, backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', borderWidth: 1, borderColor: isDarkMode ? '#374151' : '#e5e7eb' }}>
          <Text style={{ color: '#ef4444', fontSize: 18, fontWeight: '500', marginBottom: 8 }}>Error</Text>
          <Text style={{ marginBottom: 16, color: isDarkMode ? '#d1d5db' : '#374151' }}>{error}</Text>
          <View style={{ flexDirection: 'column' }}>
            <Pressable
              onPress={() => fetchApplicationVisits(true)}
              style={{ paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6, backgroundColor: colorPalette?.primary || '#ea580c' }}
            >
              <Text style={{ color: '#ffffff', textAlign: 'center' }}>Retry</Text>
            </Pressable>
            
            <View style={{ marginTop: 16, padding: 16, borderRadius: 6, maxHeight: 192, backgroundColor: isDarkMode ? '#111827' : '#f3f4f6' }}>
              <ScrollView>
                <Text style={{ fontSize: 12, color: isDarkMode ? '#9ca3af' : '#4b5563' }}>
                  {error.includes("SQLSTATE") ? (
                    <>
                      <Text style={{ color: '#f87171' }}>Database Error:</Text>
                      {'\n'}
                      {error.includes("Table") ? "Table name mismatch - check the database schema" : error}
                      {'\n\n'}
                      <Text style={{ color: '#fbbf24' }}>Suggestion:</Text>
                      {'\n'}
                      Verify that the table 'application_visits' exists in your database.
                    </>
                  ) : error}
                </Text>
              </ScrollView>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: isDarkMode ? '#030712' : '#f9fafb' }}>
      <View style={{ flex: 1, flexDirection: 'row', overflow: 'hidden' }}>
        {userRole.toLowerCase() !== 'technician' && (
          <View style={{ width: sidebarWidth, borderRightWidth: 1, borderColor: isDarkMode ? '#374151' : '#e5e7eb', backgroundColor: isDarkMode ? '#111827' : '#ffffff' }}>
            <View style={{ padding: 16, borderBottomWidth: 1, borderColor: isDarkMode ? '#374151' : '#e5e7eb' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontSize: 18, fontWeight: '600', color: isDarkMode ? '#ffffff' : '#111827' }}>Application Visits</Text>
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
                    backgroundColor: selectedLocation === location.id ? (colorPalette?.primary ? `${colorPalette.primary}33` : 'rgba(249, 115, 22, 0.2)') : 'transparent'
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <FileText size={16} style={{ marginRight: 8 }} color={selectedLocation === location.id ? (colorPalette?.primary || '#fb923c') : (isDarkMode ? '#d1d5db' : '#4b5563')} />
                    <Text style={{ textTransform: 'capitalize', fontSize: 14, color: selectedLocation === location.id ? (colorPalette?.primary || '#fb923c') : (isDarkMode ? '#d1d5db' : '#374151') }}>{location.name}</Text>
                  </View>
                  {location.count > 0 && (
                    <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9999, backgroundColor: selectedLocation === location.id ? (colorPalette?.primary || '#ea580c') : (isDarkMode ? '#374151' : '#e5e7eb') }}>
                      <Text style={{ fontSize: 12, color: selectedLocation === location.id ? '#ffffff' : (isDarkMode ? '#d1d5db' : '#374151') }}>
                        {location.count}
                      </Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {mobileView === 'locations' && (
          <View style={{ flex: 1, flexDirection: 'column', overflow: 'hidden', backgroundColor: isDarkMode ? '#030712' : '#f9fafb' }}>
            <View style={{ padding: 16, borderBottomWidth: 1, borderColor: isDarkMode ? '#374151' : '#e5e7eb', backgroundColor: isDarkMode ? '#111827' : '#ffffff' }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: isDarkMode ? '#ffffff' : '#111827' }}>Application Visits</Text>
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
                    borderColor: isDarkMode ? '#1f2937' : '#e5e7eb',
                    backgroundColor: selectedLocation === location.id ? (colorPalette?.primary ? `${colorPalette.primary}33` : 'rgba(249, 115, 22, 0.2)') : 'transparent'
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <FileText size={20} style={{ marginRight: 12 }} color={selectedLocation === location.id ? (colorPalette?.primary || '#fb923c') : (isDarkMode ? '#d1d5db' : '#4b5563')} />
                    <Text style={{ textTransform: 'capitalize', fontSize: 16, color: selectedLocation === location.id ? (colorPalette?.primary || '#fb923c') : (isDarkMode ? '#d1d5db' : '#374151') }}>{location.name}</Text>
                  </View>
                  {location.count > 0 && (
                    <View style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 9999, backgroundColor: selectedLocation === location.id ? (colorPalette?.primary || '#ea580c') : (isDarkMode ? '#374151' : '#d1d5db') }}>
                      <Text style={{ fontSize: 14, color: selectedLocation === location.id ? '#ffffff' : (isDarkMode ? '#d1d5db' : '#4b5563') }}>
                        {location.count}
                      </Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {mobileMenuOpen && userRole.toLowerCase() !== 'technician' && mobileView === 'visits' && (
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
                      <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9999, backgroundColor: selectedLocation === location.id ? (colorPalette?.primary || '#ea580c') : (isDarkMode ? '#374151' : '#e5e7eb') }}>
                        <Text style={{ fontSize: 12, color: selectedLocation === location.id ? '#ffffff' : (isDarkMode ? '#d1d5db' : '#374151') }}>
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

        <View style={{ flex: 1, flexDirection: 'column', backgroundColor: isDarkMode ? '#111827' : '#f9fafb', display: (mobileView === 'locations' || mobileView === 'details') ? 'none' : 'flex' }}>
          <View style={{ flexDirection: 'column', flex: 1 }}>
            <View style={{ padding: 16, borderBottomWidth: 1, borderColor: isDarkMode ? '#374151' : '#e5e7eb', backgroundColor: isDarkMode ? '#111827' : '#ffffff' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                {userRole.toLowerCase() !== 'technician' && mobileView === 'visits' && (
                  <Pressable
                    onPress={() => setMobileMenuOpen(true)}
                    style={{ padding: 8, borderRadius: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: isDarkMode ? '#374151' : '#e5e7eb' }}
                  >
                    <Menu size={20} color={isDarkMode ? '#ffffff' : '#111827'} />
                  </Pressable>
                )}
                <View style={{ position: 'relative', flex: 1 }}>
                  <TextInput
                    placeholder="Search application visits..."
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
                        <>
                          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 }}>
                            <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)' }} onPress={() => setFilterDropdownOpen(false)} />
                            <View style={{ position: 'absolute', left: 16, right: 16, top: 80, bottom: 16, borderRadius: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5, flexDirection: 'column', backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', borderWidth: 1, borderColor: isDarkMode ? '#374151' : '#e5e7eb' }}>
                              <View style={{ padding: 12, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderColor: isDarkMode ? '#374151' : '#e5e7eb' }}>
                                <Text style={{ fontSize: 14, fontWeight: '500', color: isDarkMode ? '#ffffff' : '#111827' }}>Column Visibility</Text>
                                <Pressable onPress={() => setFilterDropdownOpen(false)}>
                                  <X size={20} color={isDarkMode ? '#9ca3af' : '#4b5563'} />
                                </Pressable>
                              </View>
                              <View style={{ padding: 12, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderColor: isDarkMode ? '#374151' : '#e5e7eb' }}>
                                <Pressable
                                  onPress={handleSelectAllColumns}
                                  style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6, backgroundColor: isDarkMode ? '#374151' : '#e5e7eb' }}
                                >
                                  <Text style={{ color: colorPalette?.primary || '#fb923c', fontSize: 14 }}>
                                    Select All
                                  </Text>
                                </Pressable>
                                <Pressable
                                  onPress={handleDeselectAllColumns}
                                  style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6, backgroundColor: isDarkMode ? '#374151' : '#e5e7eb' }}
                                >
                                  <Text style={{ color: colorPalette?.primary || '#fb923c', fontSize: 14 }}>
                                    Deselect All
                                  </Text>
                                </Pressable>
                              </View>
                              <ScrollView style={{ flex: 1 }}>
                                {allColumns.map((column) => (
                                  <Pressable
                                    key={column.key}
                                    style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderColor: isDarkMode ? '#374151' : '#e5e7eb' }}
                                    onPress={() => handleToggleColumn(column.key)}
                                  >
                                    <View style={{ marginRight: 12, height: 16, width: 16, borderRadius: 4, backgroundColor: visibleColumns.includes(column.key) ? '#ea580c' : (isDarkMode ? '#374151' : '#e5e7eb'), borderWidth: 1, borderColor: visibleColumns.includes(column.key) ? '#ea580c' : '#4b5563' }} />
                                    <Text style={{ color: isDarkMode ? '#ffffff' : '#111827', fontSize: 14 }}>{column.label}</Text>
                                  </Pressable>
                                ))}
                              </ScrollView>
                            </View>
                          </View>
                        </>
                      )}
                    </View>
                  )}
                  <View style={{ position: 'relative', zIndex: 50 }} ref={dropdownRef}>
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
                    onPress={handleRefresh}
                    disabled={isRefreshing}
                    style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, flexDirection: 'row', alignItems: 'center', backgroundColor: isRefreshing ? '#4b5563' : (colorPalette?.primary || '#ea580c') }}
                  >
                    <RefreshCw size={16} color="#ffffff" />
                  </Pressable>
                </View>
              </View>
            </View>
            
            <View style={{ flex: 1, overflow: 'hidden' }}>
              <ScrollView style={{ flex: 1 }}>
                {displayMode === 'card' ? (
                  filteredVisits.length > 0 ? (
                    <View>
                      {sortedVisits.map((visit) => (
                        <Pressable
                          key={visit.id}
                          onPress={() => handleMobileRowClick(visit)}
                          style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderColor: isDarkMode ? '#1f2937' : '#e5e7eb', backgroundColor: selectedVisit?.id === visit.id ? (isDarkMode ? '#1f2937' : '#f3f4f6') : 'transparent' }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontWeight: '500', fontSize: 14, marginBottom: 4, color: isDarkMode ? '#ffffff' : '#111827' }}>
                                {visit.full_name}
                              </Text>
                              <Text style={{ fontSize: 12, color: isDarkMode ? '#9ca3af' : '#4b5563' }}>
                                {formatDate(visit.timestamp)} | {visit.full_address}
                              </Text>
                            </View>
                            <View style={{ flexDirection: 'column', alignItems: 'flex-end', marginLeft: 16 }}>
                              <StatusText status={visit.visit_status || 'Scheduled'} type="visit" />
                            </View>
                          </View>
                        </Pressable>
                      ))}
                    </View>
                  ) : (
                    <View style={{ paddingVertical: 48, alignItems: 'center' }}>
                      <Text style={{ color: isDarkMode ? '#9ca3af' : '#4b5563' }}>
                        {applicationVisits.length > 0
                          ? 'No application visits found matching your filters'
                          : 'No application visits found. Create your first visit by scheduling from the Applications page.'}
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
                              width: columnWidths[column.key] || 160,
                              ...((dragOverColumn === column.key && colorPalette?.primary) ? { backgroundColor: `${colorPalette.primary}33` } : {})
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
                                      color={hoveredColumn === column.key ? (colorPalette?.primary || '#fb923c') : '#9ca3af'}
                                    />
                                  )}
                                </Pressable>
                              )}
                            </View>
                          </View>
                        ))}
                      </View>
                      <View>
                        {filteredVisits.length > 0 ? (
                          sortedVisits.map((visit) => (
                            <Pressable 
                              key={visit.id} 
                              style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: isDarkMode ? '#1f2937' : '#e5e7eb', backgroundColor: selectedVisit?.id === visit.id ? (isDarkMode ? '#1f2937' : '#f3f4f6') : 'transparent' }}
                              onPress={() => handleMobileRowClick(visit)}
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
                                    {renderCellDisplay(visit, column.key)}
                                  </Text>
                                </View>
                              ))}
                            </Pressable>
                          ))
                        ) : (
                          <View style={{ paddingHorizontal: 16, paddingVertical: 48, alignItems: 'center', borderBottomWidth: 1, borderColor: isDarkMode ? '#1f2937' : '#e5e7eb' }}>
                            <Text style={{ color: isDarkMode ? '#9ca3af' : '#4b5563' }}>
                              {applicationVisits.length > 0
                                ? 'No application visits found matching your filters'
                                : 'No application visits found. Create your first visit by scheduling from the Applications page.'}
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

        {selectedVisit && mobileView === 'details' && (
          <View style={{ flex: 1, flexDirection: 'column', overflow: 'hidden', backgroundColor: isDarkMode ? '#030712' : '#f9fafb' }}>
            <ApplicationVisitDetails 
              applicationVisit={selectedVisit}
              onClose={handleMobileBack}
              onUpdate={handleVisitUpdate}
              isMobile={true}
            />
          </View>
        )}

        {selectedVisit && mobileView !== 'details' && (
          <View style={{ display: 'none' }}>
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
    </View>
  );
};

export default ApplicationVisit;
