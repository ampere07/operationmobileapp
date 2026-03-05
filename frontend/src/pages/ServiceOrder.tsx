import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Dimensions, RefreshControl, StyleSheet } from 'react-native';
import { FileText, Search, X, Menu, RefreshCw, ArrowLeft } from 'lucide-react-native';
import { FlashList } from '@shopify/flash-list';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ServiceOrderDetails from '../components/ServiceOrderDetails';
import { useServiceOrderContext, type ServiceOrder } from '../contexts/ServiceOrderContext';
import { getCities, City } from '../services/cityService';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';

interface LocationItem {
  id: string;
  name: string;
  count: number;
}

type MobileView = 'locations' | 'orders' | 'details';

const StatusText = React.memo(({ status, type }: { status?: string, type: 'support' | 'visit' }) => {
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
    <Text style={{ fontWeight: 'bold', textTransform: 'uppercase', color: textColor }}>
      {status === 'in-progress' ? 'In Progress' : status}
    </Text>
  );
});

const so = StyleSheet.create({
  container: { height: '100%', overflow: 'hidden' },
  // Sidebar
  sidebar: { borderRightWidth: 1, flexShrink: 0, flexDirection: 'column', position: 'relative' },
  sidebarHeader: { padding: 16, borderBottomWidth: 1, flexShrink: 0 },
  sidebarTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  sidebarTitle: { fontSize: 18, fontWeight: '600' },
  flex1: { flex: 1 },
  // Location items
  locationItem: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  locationRow: { flexDirection: 'row', alignItems: 'center' },
  locationName: { textTransform: 'capitalize', fontSize: 14 },
  mr8: { marginRight: 8 },
  mr12: { marginRight: 12 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9999 },
  badgeText: { fontSize: 12 },
  badgeLg: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 9999 },
  badgeLgText: { fontSize: 14 },
  // Mobile locations
  mobileLocations: { flex: 1, flexDirection: 'column', overflow: 'hidden' },
  mobileLocHeader: { padding: 16, paddingTop: 60, borderBottomWidth: 1 },
  mobileLocationItem: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1 },
  mobileLocationName: { textTransform: 'capitalize', fontSize: 16 },
  // Mobile overlay
  mobileOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 },
  mobileBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  mobileSidebar: { position: 'absolute', top: 0, left: 0, bottom: 0, width: 256, flexDirection: 'column' },
  mobileSidebarHeader: { padding: 16, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  // Main content
  mainContent: { overflow: 'hidden', flex: 1, flexDirection: 'column' },
  mainInner: { flexDirection: 'column', height: '100%' },
  // Toolbar
  toolbar: { padding: 16, paddingTop: 60, borderBottomWidth: 1, flexShrink: 0 },
  toolbarRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBtn: { padding: 8, borderRadius: 4 },
  menuBtn: { backgroundColor: '#374151', padding: 8, borderRadius: 4 },
  searchWrap: { position: 'relative', flex: 1 },
  searchInput: { width: '100%', borderRadius: 4, paddingLeft: 40, paddingRight: 16, paddingVertical: 8, borderWidth: 1 },
  searchIcon: { position: 'absolute', left: 12, top: 10 },
  actionsRow: { flexDirection: 'row', gap: 8 },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 4, flexDirection: 'row', alignItems: 'center' },
  // List area
  listArea: { flex: 1, overflow: 'hidden', flexDirection: 'column' },
  loadingWrap: { paddingHorizontal: 16, paddingVertical: 48, alignItems: 'center' },
  skeletonCol: { flexDirection: 'column', alignItems: 'center' },
  skeletonBar1: { height: 16, width: '33%', borderRadius: 4, marginBottom: 16 },
  skeletonBar2: { height: 16, width: '50%', borderRadius: 4 },
  loadingText: { marginTop: 16 },
  retryBtn: { marginTop: 16, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 4 },
  retryText: { color: 'white' },
  // Cards
  cardRow: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  cardInner: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  cardLeft: { flex: 1, minWidth: 0 },
  cardName: { fontWeight: '500', fontSize: 14, marginBottom: 4 },
  cardSub: { fontSize: 12 },
  cardRight: { flexDirection: 'column', alignItems: 'flex-end', gap: 4, marginLeft: 16, flexShrink: 0 },
  emptyWrap: { alignItems: 'center', paddingVertical: 48 },
  // Pagination
  paginationBar: { borderTopWidth: 1, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  paginationInfo: { fontSize: 14 },
  bold500: { fontWeight: '500' },
  paginationBtns: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pageBtn: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 4 },
  pageBtnText: { fontSize: 14 },
  pageIndicatorWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pageIndicator: { paddingHorizontal: 8, fontSize: 14 },
  // Detail panels
  mobileDetail: { flex: 1, flexDirection: 'column', overflow: 'hidden' },
  tabletDetail: { flexShrink: 0, overflow: 'hidden' },
});

const ServiceOrderPage: React.FC = () => {
  const isDarkMode = false; // Forced light mode as per user request
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [selectedServiceOrder, setSelectedServiceOrder] = useState<ServiceOrder | null>(null);
  const { serviceOrders, isLoading, error, refreshServiceOrders, silentRefresh } = useServiceOrderContext();
  const [cities, setCities] = useState<City[]>([]);
  const [userRole, setUserRole] = useState<string>('');
  const [userRoleId, setUserRoleId] = useState<number | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [userFullName, setUserFullName] = useState<string>('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [mobileView, setMobileView] = useState<MobileView>('locations');
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 15;

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Batch all mount-time async loads into a single effect
  useEffect(() => {
    let cancelled = false;
    const initLoad = async () => {
      const [authResult, paletteResult, citiesResult] = await Promise.allSettled([
        AsyncStorage.getItem('authData'),
        settingsColorPaletteService.getActive(),
        getCities(),
      ]);

      if (cancelled) return;

      if (authResult.status === 'fulfilled' && authResult.value) {
        try {
          const userData = JSON.parse(authResult.value);
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
        } catch (error) { }
      }
      if (paletteResult.status === 'fulfilled') {
        setColorPalette(paletteResult.value);
      }
      if (citiesResult.status === 'fulfilled') {
        setCities(citiesResult.value || []);
      }
    };
    initLoad();
    return () => { cancelled = true; };
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedLocation, debouncedSearch]);

  useEffect(() => {
    silentRefresh();
  }, [silentRefresh]);

  const handleRefresh = useCallback(async () => {
    await refreshServiceOrders();
  }, [refreshServiceOrders]);

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
        const cityCount = serviceOrders.filter(order =>
          order.fullAddress.toLowerCase().includes(city.name.toLowerCase())
        ).length;

        items.push({
          id: city.name.toLowerCase(),
          name: city.name,
          count: cityCount
        });
      });
    } else {
      const locationSet = new Set<string>();

      serviceOrders.forEach(order => {
        const addressParts = order.fullAddress.split(',');
        if (addressParts.length >= 2) {
          const cityPart = addressParts[addressParts.length - 2].trim().toLowerCase();
          if (cityPart && cityPart !== '') {
            locationSet.add(cityPart);
          }
        }
      });

      Array.from(locationSet).forEach(location => {
        const cityCount = serviceOrders.filter(order =>
          order.fullAddress.toLowerCase().includes(location)
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
    const isTechnician = userRole.toLowerCase() === 'technician' || userRoleId === 2 ||
      userRole.toLowerCase() === 'agent' || userRoleId === 4;

    const lowerSearch = debouncedSearch.toLowerCase();

    let filtered = serviceOrders.filter(serviceOrder => {
      // 1. Technician 7-Day Filter for 'Resolved' tickets
      if (isTechnician) {
        const supportStatus = (serviceOrder.supportStatus || '').toLowerCase().trim();

        if (supportStatus === 'resolved') {
          const updatedAt = serviceOrder.rawUpdatedAt;

          if (updatedAt) {
            const updatedDate = new Date(updatedAt);
            if (!isNaN(updatedDate.getTime())) {
              const sevenDaysAgo = new Date();
              sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

              if (updatedDate < sevenDaysAgo) {
                return false;
              }
            }
          }
        }
      }

      const matchesLocation = selectedLocation === 'all' ||
        serviceOrder.fullAddress.toLowerCase().includes(selectedLocation.toLowerCase());

      const matchesSearch = debouncedSearch === '' ||
        serviceOrder.fullName.toLowerCase().includes(lowerSearch) ||
        serviceOrder.fullAddress.toLowerCase().includes(lowerSearch) ||
        (serviceOrder.concern && serviceOrder.concern.toLowerCase().includes(lowerSearch));

      if (!matchesLocation || !matchesSearch) return false;

      // Role-based filtering: Agents (role_id 4) only see their own referrals
      if (userRole.toLowerCase() === 'agent' || userRoleId === 4) {
        const referredBy = (serviceOrder.referredBy || '').toLowerCase();
        const matchesAgent =
          (userFullName && referredBy.includes(userFullName.toLowerCase())) ||
          (userEmail && referredBy.includes(userEmail.toLowerCase()));

        if (!matchesAgent) return false;
      }

      return true;
    });

    // Sort by ID descending
    filtered.sort((a, b) => {
      const idA = parseInt(a.id) || 0;
      const idB = parseInt(b.id) || 0;
      return idB - idA;
    });

    return filtered;
  }, [serviceOrders, selectedLocation, debouncedSearch, userRole, userRoleId, userFullName, userEmail]);

  const shouldPaginate = userRoleId !== 1 && userRoleId !== 7;

  const paginatedServiceOrders = useMemo(() => {
    if (!shouldPaginate) return filteredServiceOrders;
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredServiceOrders.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredServiceOrders, currentPage, shouldPaginate]);

  const totalPages = useMemo(() => {
    if (!shouldPaginate) return 1;
    return Math.ceil(filteredServiceOrders.length / itemsPerPage);
  }, [filteredServiceOrders.length, shouldPaginate]);

  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(prev => {
      if (newPage >= 1 && newPage <= totalPages) return newPage;
      return prev;
    });
  }, [totalPages]);

  const { width } = Dimensions.get('window');
  const isTablet = width >= 768;

  const handleRowClick = useCallback((serviceOrder: ServiceOrder) => {
    setSelectedServiceOrder(serviceOrder);
    if (!isTablet) {
      setMobileView('details');
    }
  }, [isTablet]);

  const handleLocationSelect = useCallback((locationId: string) => {
    setSelectedLocation(locationId);
    setMobileMenuOpen(false);
    setMobileView('orders');
  }, []);

  const handleMobileBack = useCallback(() => {
    if (mobileView === 'details') {
      setSelectedServiceOrder(null);
      setMobileView('orders');
    } else if (mobileView === 'orders') {
      setMobileView('locations');
    }
  }, [mobileView]);

  const handleMobileRowClick = useCallback((serviceOrder: ServiceOrder) => {
    setSelectedServiceOrder(serviceOrder);
    setMobileView('details');
  }, []);

  return (
    <View style={[so.container, {
      flexDirection: isTablet ? 'row' : 'column',
      backgroundColor: '#f9fafb'
    }]}>
      {userRole.toLowerCase() !== 'technician' && userRole.toLowerCase() !== 'agent' && isTablet && (
        <View style={[so.sidebar, {
          width: 256,
          backgroundColor: '#ffffff',
          borderColor: '#e5e7eb'
        }]}>
          <View style={[so.sidebarHeader, { borderColor: '#e5e7eb' }]}>
            <View style={so.sidebarTitleRow}>
              <Text style={[so.sidebarTitle, { color: '#111827' }]}>Service Orders</Text>
            </View>
          </View>
          <ScrollView
            style={so.flex1}
            refreshControl={
              <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} tintColor={colorPalette?.primary || '#7c3aed'} colors={[colorPalette?.primary || '#7c3aed']} />
            }
          >
            {locationItems.map((location) => (
              <Pressable
                key={location.id}
                onPress={() => setSelectedLocation(location.id)}
                style={[so.locationItem, {
                  backgroundColor: selectedLocation === location.id ? (colorPalette?.primary ? `${colorPalette.primary}33` : 'rgba(249, 115, 22, 0.2)') : 'transparent'
                }]}
              >
                <View style={so.locationRow}>
                  <FileText size={16} color={selectedLocation === location.id ? (colorPalette?.primary || '#fb923c') : '#374151'} style={so.mr8} />
                  <Text style={[so.locationName, {
                    color: selectedLocation === location.id ? (colorPalette?.primary || '#fb923c') : '#374151',
                    fontWeight: selectedLocation === location.id ? '500' : 'normal'
                  }]}>{location.name}</Text>
                </View>
                {location.count > 0 && (
                  <View style={[so.badge, {
                    backgroundColor: selectedLocation === location.id ? (colorPalette?.primary || '#7c3aed') : '#e5e7eb'
                  }]}>
                    <Text style={[so.badgeText, { color: selectedLocation === location.id ? 'white' : '#374151' }]}>{location.count}</Text>
                  </View>
                )}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {mobileView === 'locations' && userRole.toLowerCase() !== 'technician' && userRole.toLowerCase() !== 'agent' && userRoleId !== 2 && userRoleId !== 4 && (
        <View style={[so.mobileLocations, {
          backgroundColor: '#f9fafb',
          display: isTablet ? 'none' : 'flex'
        }]}>
          <View style={[so.mobileLocHeader, {
            backgroundColor: '#ffffff',
            borderColor: '#e5e7eb'
          }]}>
            <Text style={[so.sidebarTitle, { color: '#111827' }]}>Service Orders</Text>
          </View>
          <ScrollView
            style={so.flex1}
            refreshControl={
              <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} tintColor={colorPalette?.primary || '#7c3aed'} colors={[colorPalette?.primary || '#7c3aed']} />
            }
          >
            {locationItems.map((location) => (
              <Pressable
                key={location.id}
                onPress={() => handleLocationSelect(location.id)}
                style={[so.mobileLocationItem, {
                  backgroundColor: selectedLocation === location.id ? (colorPalette?.primary ? `${colorPalette.primary}33` : 'rgba(249, 115, 22, 0.2)') : 'transparent',
                  borderColor: '#e5e7eb'
                }]}
              >
                <View style={so.locationRow}>
                  <FileText size={20} color={selectedLocation === location.id ? (colorPalette?.primary || '#fb923c') : '#374151'} style={so.mr12} />
                  <Text style={[so.mobileLocationName, {
                    color: selectedLocation === location.id ? (colorPalette?.primary || '#fb923c') : '#374151'
                  }]}>{location.name}</Text>
                </View>
                {location.count > 0 && (
                  <View style={[so.badgeLg, {
                    backgroundColor: selectedLocation === location.id ? (colorPalette?.primary || '#7c3aed') : '#e5e7eb'
                  }]}>
                    <Text style={[so.badgeLgText, { color: selectedLocation === location.id ? 'white' : '#374151' }]}>{location.count}</Text>
                  </View>
                )}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {mobileMenuOpen && userRole.toLowerCase() !== 'technician' && userRole.toLowerCase() !== 'agent' && userRoleId !== 2 && userRoleId !== 4 && mobileView === 'orders' && (
        <View style={so.mobileOverlay}>
          <Pressable style={so.mobileBackdrop} onPress={() => setMobileMenuOpen(false)} />
          <View style={[so.mobileSidebar, { backgroundColor: '#ffffff' }]}>
            <View style={[so.mobileSidebarHeader, { borderColor: '#e5e7eb' }]}>
              <Text style={[so.sidebarTitle, { color: '#111827' }]}>Filters</Text>
              <Pressable onPress={() => setMobileMenuOpen(false)}>
                <X size={24} color="#4b5563" />
              </Pressable>
            </View>
            <ScrollView style={so.flex1}>
              {locationItems.map((location) => (
                <Pressable
                  key={location.id}
                  onPress={() => handleLocationSelect(location.id)}
                  style={[so.locationItem, {
                    backgroundColor: selectedLocation === location.id ? 'rgba(249, 115, 22, 0.2)' : 'transparent'
                  }]}
                >
                  <View style={so.locationRow}>
                    <FileText size={16} color={selectedLocation === location.id ? '#fb923c' : '#374151'} style={so.mr8} />
                    <Text style={[so.locationName, { color: selectedLocation === location.id ? '#fb923c' : '#374151' }]}>{location.name}</Text>
                  </View>
                  {location.count > 0 && (
                    <View style={[so.badge, { backgroundColor: selectedLocation === location.id ? '#7c3aed' : '#e5e7eb' }]}>
                      <Text style={[so.badgeText, { color: selectedLocation === location.id ? 'white' : '#374151' }]}>{location.count}</Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      <View style={[so.mainContent, {
        backgroundColor: '#ffffff',
        display: ((mobileView === 'locations' && userRole.toLowerCase() !== 'technician' && userRole.toLowerCase() !== 'agent' && userRoleId !== 2 && userRoleId !== 4) || mobileView === 'details') && !isTablet ? 'none' : 'flex'
      }]}>
        <View style={so.mainInner}>
          <View style={[so.toolbar, {
            backgroundColor: '#ffffff',
            borderColor: '#e5e7eb'
          }]}>
            <View style={so.toolbarRow}>
              {!isTablet && mobileView === 'orders' && userRole.toLowerCase() !== 'technician' && userRole.toLowerCase() !== 'agent' && userRoleId !== 2 && userRoleId !== 4 && (
                <Pressable onPress={handleMobileBack} style={so.iconBtn}>
                  <ArrowLeft size={24} color="#111827" />
                </Pressable>
              )}
              {userRole.toLowerCase() !== 'technician' && userRole.toLowerCase() !== 'agent' && userRoleId !== 2 && userRoleId !== 4 && mobileView === 'orders' && (
                <Pressable onPress={() => setMobileMenuOpen(true)} style={so.menuBtn}>
                  <Menu size={20} color="white" />
                </Pressable>
              )}
              <View style={so.searchWrap}>
                <TextInput
                  placeholder="Search service orders..."
                  placeholderTextColor="#6b7280"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  style={[so.searchInput, {
                    backgroundColor: '#f3f4f6',
                    color: '#111827',
                    borderColor: '#d1d5db'
                  }]}
                />
                <View style={so.searchIcon}>
                  <Search size={16} color="#6b7280" />
                </View>
              </View>
              <View style={so.actionsRow}>
                <Pressable
                  onPress={handleRefresh}
                  disabled={isLoading}
                  style={[so.actionBtn, { backgroundColor: isLoading ? '#4b5563' : (colorPalette?.primary || '#7c3aed') }]}
                >
                  <RefreshCw size={20} color="white" />
                </Pressable>
              </View>
            </View>
          </View>

          <View style={so.listArea}>
            {isLoading ? (
              <ScrollView
                style={so.flex1}
                refreshControl={
                  <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} tintColor={colorPalette?.primary || '#7c3aed'} colors={[colorPalette?.primary || '#7c3aed']} />
                }
              >
                <View style={so.loadingWrap}>
                  <View style={so.skeletonCol}>
                    <View style={[so.skeletonBar1, { backgroundColor: '#d1d5db' }]} />
                    <View style={[so.skeletonBar2, { backgroundColor: '#d1d5db' }]} />
                  </View>
                  <Text style={[so.loadingText, { color: '#4b5563' }]}>Loading service orders...</Text>
                </View>
              </ScrollView>
            ) : error ? (
              <ScrollView
                style={so.flex1}
                refreshControl={
                  <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} tintColor={colorPalette?.primary || '#7c3aed'} colors={[colorPalette?.primary || '#7c3aed']} />
                }
              >
                <View style={so.loadingWrap}>
                  <Text style={{ color: '#dc2626' }}>{error}</Text>
                  <Pressable onPress={handleRefresh} style={[so.retryBtn, { backgroundColor: '#9ca3af' }]}>
                    <Text style={so.retryText}>Retry</Text>
                  </Pressable>
                </View>
              </ScrollView>
            ) : (
              <View style={so.flex1}>
                <FlashList
                  data={paginatedServiceOrders}
                  keyExtractor={(item) => String(item.id)}
                  refreshControl={
                    <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} tintColor={colorPalette?.primary || '#7c3aed'} colors={[colorPalette?.primary || '#7c3aed']} />
                  }
                  ListEmptyComponent={
                    <View style={so.emptyWrap}>
                      <Text style={{ color: '#4b5563' }}>No service orders found matching your filters</Text>
                    </View>
                  }
                  renderItem={({ item: serviceOrder }) => (
                    <Pressable
                      onPress={() => !isTablet ? handleMobileRowClick(serviceOrder) : handleRowClick(serviceOrder)}
                      style={[so.cardRow, {
                        backgroundColor: selectedServiceOrder?.id === serviceOrder.id ? '#f3f4f6' : 'transparent',
                        borderColor: '#e5e7eb'
                      }]}
                    >
                      <View style={so.cardInner}>
                        <View style={so.cardLeft}>
                          <Text style={[so.cardName, { color: '#111827' }]}>{serviceOrder.fullName}</Text>
                          <Text style={[so.cardSub, { color: '#4b5563' }]}>
                            {serviceOrder.timestamp} | {serviceOrder.fullAddress}
                          </Text>
                        </View>
                        <View style={so.cardRight}>
                          <StatusText
                            status={(userRole.toLowerCase() === 'technician' || userRoleId === 2) ? serviceOrder.visitStatus : serviceOrder.supportStatus}
                            type={(userRole.toLowerCase() === 'technician' || userRoleId === 2) ? 'visit' : 'support'}
                          />
                        </View>
                      </View>
                    </Pressable>
                  )}
                />
              </View>
            )}
          </View>

          {!isLoading && shouldPaginate && filteredServiceOrders.length > 0 && totalPages > 1 && (
            <View style={[so.paginationBar, {
              backgroundColor: '#ffffff',
              borderColor: '#e5e7eb'
            }]}>
              <View>
                <Text style={[so.paginationInfo, { color: '#4b5563' }]}>
                  Showing <Text style={so.bold500}>{(currentPage - 1) * itemsPerPage + 1}</Text> to <Text style={so.bold500}>{Math.min(currentPage * itemsPerPage, filteredServiceOrders.length)}</Text> of <Text style={so.bold500}>{filteredServiceOrders.length}</Text> results
                </Text>
              </View>
              <View style={so.paginationBtns}>
                <Pressable
                  onPress={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  style={[so.pageBtn, {
                    backgroundColor: currentPage === 1 ? '#f3f4f6' : '#ffffff',
                    borderWidth: currentPage === 1 ? 0 : 1, borderColor: '#d1d5db'
                  }]}
                >
                  <Text style={[so.pageBtnText, { color: currentPage === 1 ? '#9ca3af' : '#374151' }]}>Previous</Text>
                </Pressable>

                <View style={so.pageIndicatorWrap}>
                  <Text style={[so.pageIndicator, { color: '#111827' }]}>Page {currentPage} of {totalPages}</Text>
                </View>

                <Pressable
                  onPress={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  style={[so.pageBtn, {
                    backgroundColor: currentPage === totalPages ? '#f3f4f6' : '#ffffff',
                    borderWidth: currentPage === totalPages ? 0 : 1, borderColor: '#d1d5db'
                  }]}
                >
                  <Text style={[so.pageBtnText, { color: currentPage === totalPages ? '#9ca3af' : '#374151' }]}>Next</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </View>

      {
        selectedServiceOrder && mobileView === 'details' && (
          <View style={[so.mobileDetail, {
            backgroundColor: '#f9fafb',
            display: isTablet ? 'none' : 'flex'
          }]}>
            <ServiceOrderDetails
              serviceOrder={selectedServiceOrder as ServiceOrder}
              onClose={handleMobileBack}
              isMobile={true}
            />
          </View>
        )
      }

      {
        selectedServiceOrder && mobileView !== 'details' && (
          <View style={[so.tabletDetail, { display: isTablet ? 'flex' : 'none' }]}>
            <ServiceOrderDetails
              serviceOrder={selectedServiceOrder as ServiceOrder}
              onClose={() => setSelectedServiceOrder(null)}
              isMobile={false}
            />
          </View>
        )
      }

    </View >
  );
};

export default ServiceOrderPage;
