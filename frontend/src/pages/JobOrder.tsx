import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Alert, Dimensions, DeviceEventEmitter, RefreshControl, StyleSheet } from 'react-native';
import { Search, ListFilter, Menu, X, ArrowLeft, RefreshCw } from 'lucide-react-native';
import { FlashList } from '@shopify/flash-list';
import AsyncStorage from '@react-native-async-storage/async-storage';
import JobOrderDetails from '../components/JobOrderDetails';
import JobOrderFunnelFilter, { FilterValues } from '../components/filters/JobOrderFunnelFilter';
import { useJobOrderContext } from '../contexts/JobOrderContext';
import { getBillingStatuses, BillingStatus } from '../services/lookupService';
import { JobOrder } from '../types/jobOrder';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';

const StatusText = React.memo(({ status, type }: { status?: string | null, type: 'onsite' | 'billing' }) => {
  if (!status) return <Text style={{ color: '#9ca3af' }}>-</Text>;

  let textColor = '';

  if (type === 'onsite') {
    switch (status.toLowerCase()) {
      case 'done':
      case 'completed':
        textColor = '#4ade80';
        break;
      case 'reschedule':
        textColor = '#60a5fa';
        break;
      case 'inprogress':
      case 'in progress':
        textColor = '#60a5fa';
        break;
      case 'pending':
        textColor = '#fb923c';
        break;
      case 'failed':
      case 'cancelled':
        textColor = '#ef4444';
        break;
      default:
        textColor = '#9ca3af';
    }
  } else {
    switch (status.toLowerCase()) {
      case 'done':
      case 'active':
      case 'completed':
        textColor = '#4ade80';
        break;
      case 'pending':
      case 'in progress':
        textColor = '#fb923c';
        break;
      case 'suspended':
      case 'overdue':
        textColor = '#ef4444';
        break;
      case 'cancelled':
        textColor = '#ef4444';
        break;
      default:
        textColor = '#9ca3af';
    }
  }

  return (
    <Text style={{ fontWeight: 'bold', textTransform: 'uppercase', color: textColor }}>
      {status === 'inprogress' ? 'In Progress' : status}
    </Text>
  );
});

const jo = StyleSheet.create({
  container: { height: '100%', overflow: 'hidden' },
  // Mobile overlay
  mobileOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 },
  mobileBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  mobileSidebar: { position: 'absolute', top: 0, left: 0, bottom: 0, width: 256, flexDirection: 'column' },
  mobileSidebarHeader: { padding: 16, paddingTop: 60, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  // Sidebar
  sidebar: { borderRightWidth: 1, flexShrink: 0, flexDirection: 'column', position: 'relative' },
  sidebarHeaderBox: { padding: 16, borderBottomWidth: 1, flexShrink: 0 },
  sidebarTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  sidebarTitle: { fontSize: 18, fontWeight: '600' },
  pad16: { padding: 16 },
  // Main content
  mainContent: { overflow: 'hidden', flex: 1, flexDirection: 'column' },
  mainInner: { flexDirection: 'column', height: '100%' },
  // Toolbar
  toolbar: { padding: 16, borderBottomWidth: 1, flexShrink: 0 },
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
  flex1: { flex: 1 },
  // Loading
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

const JobOrderPage: React.FC = () => {

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [selectedJobOrder, setSelectedJobOrder] = useState<JobOrder | null>(null);
  const { jobOrders, isLoading, error, refreshJobOrders, silentRefresh } = useJobOrderContext();
  const [billingStatuses, setBillingStatuses] = useState<BillingStatus[]>([]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<string>('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [mobileView, setMobileView] = useState<'orders' | 'details'>('orders');
  const [isFunnelFilterOpen, setIsFunnelFilterOpen] = useState<boolean>(false);
  const [filterValues, setFilterValues] = useState<FilterValues>({});
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);

  const handleApplyFilters = useCallback((filters: FilterValues) => {
    setFilterValues(filters);
    setCurrentPage(1);
    setIsFunnelFilterOpen(false);
  }, []);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 15;

  // Debounce search input to avoid recomputing heavy filter on every keystroke
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
      const [authResult, paletteResult, billingResult] = await Promise.allSettled([
        AsyncStorage.getItem('authData'),
        settingsColorPaletteService.getActive(),
        getBillingStatuses(),
      ]);

      if (cancelled) return;

      if (authResult.status === 'fulfilled' && authResult.value) {
        try {
          const userData = JSON.parse(authResult.value);
          setUserRole(userData.role || '');
          setUserEmail(userData.email || '');
          setUserRoleId(userData.role_id || null);
          setUserFullName(userData.full_name || '');
        } catch (error) { }
      }
      if (paletteResult.status === 'fulfilled') {
        setColorPalette(paletteResult.value);
      }
      if (billingResult.status === 'fulfilled') {
        setBillingStatuses(billingResult.value);
      }
    };
    initLoad();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('jobOrderUpdated', () => {
      setSelectedJobOrder(null);
      setMobileView('orders');
      refreshJobOrders();
    });

    return () => {
      subscription.remove();
    };
  }, [refreshJobOrders]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  const formatDate = (dateStr?: string | null): string => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleString();
    } catch (e) {
      return '-';
    }
  };

  const formatPrice = (price?: number | null): string => {
    if (price === null || price === undefined || price === 0) return '-';
    return `₱${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const [userEmail, setUserEmail] = useState<string>('');
  const [userRoleId, setUserRoleId] = useState<number | null>(null);
  const [userFullName, setUserFullName] = useState<string>('');

  // Dark mode, auth data, and billing statuses are all loaded in the batched init effect above

  useEffect(() => {
    silentRefresh();
  }, [silentRefresh]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refreshJobOrders();
    setIsRefreshing(false);
  }, [refreshJobOrders]);

  const getClientFullName = useCallback((jobOrder: JobOrder): string => {
    return [
      jobOrder.First_Name || jobOrder.first_name || '',
      jobOrder.Middle_Initial || jobOrder.middle_initial ? (jobOrder.Middle_Initial || jobOrder.middle_initial) + '.' : '',
      jobOrder.Last_Name || jobOrder.last_name || ''
    ].filter(Boolean).join(' ').trim() || '-';
  }, []);

  const getClientFullAddress = useCallback((jobOrder: JobOrder): string => {
    const addressParts = [
      jobOrder.Installation_Address || jobOrder.installation_address || jobOrder.Address || jobOrder.address,
      jobOrder.Barangay || jobOrder.barangay,
      jobOrder.City || jobOrder.city,
      jobOrder.Region || jobOrder.region
    ].filter(Boolean);

    return addressParts.length > 0 ? addressParts.join(', ') : '-';
  }, []);





  const filteredJobOrders = useMemo(() => {
    const lowerSearch = debouncedSearch.toLowerCase();
    return jobOrders.filter(jobOrder => {
      const fullName = getClientFullName(jobOrder).toLowerCase();
      const matchesSearch = debouncedSearch === '' ||
        fullName.includes(lowerSearch) ||
        ((jobOrder.Address || jobOrder.address) || '').toLowerCase().includes(lowerSearch) ||
        ((jobOrder.Assigned_Email || jobOrder.assigned_email) || '').toLowerCase().includes(lowerSearch);

      if (!matchesSearch) return false;

      // Role-based filtering: Agents (role_id 4) only see their own referrals
      if (userRole.toLowerCase() === 'agent' || userRoleId === 4) {
        const referredBy = (jobOrder.Referred_By || jobOrder.referred_by || '').toLowerCase();
        // Only match if referredBy contains user's full name or email
        const matchesAgent =
          (userFullName && referredBy.includes(userFullName.toLowerCase())) ||
          (userEmail && referredBy.includes(userEmail.toLowerCase()));

        if (!matchesAgent) return false;
      }

      // Apply funnel filters
      for (const key in filterValues) {
        const filter = filterValues[key];
        let itemValue: any = '';

        // Determine item value based on key
        switch (key) {
          case 'id': itemValue = jobOrder.id; break;
          case 'application_id': itemValue = jobOrder.application_id; break;
          case 'timestamp': itemValue = jobOrder.Timestamp || jobOrder.timestamp; break;
          case 'date_installed': itemValue = jobOrder.Date_Installed || jobOrder.date_installed; break;
          case 'installation_fee': itemValue = jobOrder.Installation_Fee || jobOrder.installation_fee; break;
          case 'billing_day': itemValue = jobOrder.Billing_Day || jobOrder.billing_day; break;
          case 'billing_status_id': itemValue = jobOrder.billing_status_id || jobOrder.Billing_Status_ID; break;
          case 'modem_router_sn': itemValue = jobOrder.Modem_Router_SN || jobOrder.modem_router_sn; break;
          case 'router_model': itemValue = jobOrder.Router_Model || jobOrder.router_model; break;
          case 'group_name': itemValue = jobOrder.group_name || jobOrder.Group_Name; break;
          case 'lcpnap': itemValue = jobOrder.LCPNAP || jobOrder.lcpnap; break;
          case 'port': itemValue = jobOrder.PORT || jobOrder.Port || jobOrder.port; break;
          case 'vlan': itemValue = jobOrder.VLAN || jobOrder.vlan; break;
          case 'username': itemValue = jobOrder.Username || jobOrder.username; break;
          case 'ip_address': itemValue = jobOrder.IP_Address || jobOrder.ip_address || jobOrder.IP || jobOrder.ip; break;
          case 'connection_type': itemValue = jobOrder.Connection_Type || jobOrder.connection_type; break;
          case 'usage_type': itemValue = jobOrder.Usage_Type || jobOrder.usage_type; break;
          case 'username_status': itemValue = jobOrder.username_status || jobOrder.Username_Status; break;
          case 'visit_by': itemValue = jobOrder.Visit_By || jobOrder.visit_by; break;
          case 'visit_with': itemValue = jobOrder.Visit_With || jobOrder.visit_with; break;
          case 'visit_with_other': itemValue = jobOrder.Visit_With_Other || jobOrder.visit_with_other; break;
          case 'onsite_status': itemValue = jobOrder.Onsite_Status || jobOrder.onsite_status; break;
          case 'onsite_remarks': itemValue = jobOrder.Onsite_Remarks || jobOrder.onsite_remarks; break;
          case 'status_remarks': itemValue = jobOrder.Status_Remarks || jobOrder.status_remarks; break;
          case 'address_coordinates': itemValue = jobOrder.Address_Coordinates || jobOrder.address_coordinates; break;
          case 'contract_link': itemValue = jobOrder.Contract_Link || jobOrder.contract_link; break;
          case 'client_signature_url': itemValue = jobOrder.client_signature_url || jobOrder.Client_Signature_URL || jobOrder.client_signature_image_url || jobOrder.Client_Signature_Image_URL; break;
          case 'setup_image_url': itemValue = jobOrder.setup_image_url || jobOrder.Setup_Image_URL || jobOrder.Setup_Image_Url; break;
          case 'speedtest_image_url': itemValue = jobOrder.speedtest_image_url || jobOrder.Speedtest_Image_URL || jobOrder.speedtest_image || jobOrder.Speedtest_Image; break;
          case 'signed_contract_image_url': itemValue = jobOrder.signed_contract_image_url || jobOrder.Signed_Contract_Image_URL || jobOrder.signed_contract_url || jobOrder.Signed_Contract_URL; break;
          case 'box_reading_image_url': itemValue = jobOrder.box_reading_image_url || jobOrder.Box_Reading_Image_URL || jobOrder.box_reading_url || jobOrder.Box_Reading_URL; break;
          case 'router_reading_image_url': itemValue = jobOrder.router_reading_image_url || jobOrder.Router_Reading_Image_URL || jobOrder.router_reading_url || jobOrder.Router_Reading_URL; break;
          case 'port_label_image_url': itemValue = jobOrder.port_label_image_url || jobOrder.Port_Label_Image_URL || jobOrder.port_label_url || jobOrder.Port_Label_URL; break;
          case 'house_front_picture_url': itemValue = jobOrder.house_front_picture_url || jobOrder.House_Front_Picture_URL || jobOrder.house_front_picture || jobOrder.House_Front_Picture; break;
          case 'created_at': itemValue = jobOrder.created_at || jobOrder.Created_At; break;
          case 'created_by_user_email': itemValue = jobOrder.created_by_user_email || jobOrder.Created_By_User_Email; break;
          case 'updated_at': itemValue = jobOrder.updated_at || jobOrder.Updated_At; break;
          case 'updated_by_user_email': itemValue = jobOrder.updated_by_user_email || jobOrder.Updated_By_User_Email; break;
          case 'assigned_email': itemValue = jobOrder.Assigned_Email || jobOrder.assigned_email; break;
          case 'pppoe_username': itemValue = jobOrder.PPPoE_Username || jobOrder.pppoe_username; break;
          case 'pppoe_password': itemValue = jobOrder.PPPoE_Password || jobOrder.pppoe_password; break;
          case 'full_name': itemValue = getClientFullName(jobOrder); break;
          case 'address': itemValue = getClientFullAddress(jobOrder); break;
          case 'contract_template': itemValue = jobOrder.Contract_Template || jobOrder.contract_template; break;
          case 'first_name': itemValue = jobOrder.First_Name || jobOrder.first_name; break;
          case 'middle_initial': itemValue = jobOrder.Middle_Initial || jobOrder.middle_initial; break;
          case 'last_name': itemValue = jobOrder.Last_Name || jobOrder.last_name; break;
          case 'contact_number': itemValue = jobOrder.Contact_Number || jobOrder.Mobile_Number || jobOrder.contact_number || jobOrder.mobile_number; break;
          case 'second_contact_number': itemValue = jobOrder.Second_Contact_Number || jobOrder.Secondary_Mobile_Number || jobOrder.second_contact_number || jobOrder.secondary_mobile_number; break;
          case 'email_address': itemValue = jobOrder.Email_Address || jobOrder.Applicant_Email_Address || jobOrder.email_address || jobOrder.applicant_email_address; break;
          case 'region': itemValue = jobOrder.Region || jobOrder.region; break;
          case 'city': itemValue = jobOrder.City || jobOrder.city; break;
          case 'barangay': itemValue = jobOrder.Barangay || jobOrder.barangay; break;
          case 'location': itemValue = jobOrder.Region || jobOrder.region; break; // Approximating location as Region for now, usually it's a specific field but 'Location' was in columns
          case 'choose_plan': itemValue = jobOrder.Choose_Plan || jobOrder.Desired_Plan || jobOrder.choose_plan || jobOrder.desired_plan; break;
          case 'referred_by': itemValue = jobOrder.Referred_By || jobOrder.referred_by; break;
          case 'start_timestamp': itemValue = jobOrder.StartTimeStamp || jobOrder.start_timestamp; break;
          case 'end_timestamp': itemValue = jobOrder.EndTimeStamp || jobOrder.end_timestamp; break;
          case 'duration': itemValue = jobOrder.Duration || jobOrder.duration; break;
          default: itemValue = '';
        }

        if (filter.type === 'text' && filter.value) {
          if (!String(itemValue || '').toLowerCase().includes(filter.value.toLowerCase())) {
            return false;
          }
        } else if (filter.type === 'number') {
          const numValue = parseFloat(itemValue);
          if (filter.from !== undefined && numValue < Number(filter.from)) return false;
          if (filter.to !== undefined && numValue > Number(filter.to)) return false;
        } else if (filter.type === 'date') {
          const dateValue = new Date(itemValue).getTime();
          if (filter.from && dateValue < new Date(String(filter.from)).getTime()) return false;
          if (filter.to && dateValue > new Date(String(filter.to)).getTime()) return false;
        }
      }

      return true;
    });
  }, [jobOrders, debouncedSearch, userRole, userRoleId, userFullName, userEmail, filterValues, getClientFullName, getClientFullAddress]);

  const sortedJobOrders = useMemo(() => {
    return [...filteredJobOrders].sort((a, b) => {
      const idA = parseInt(String(a.id)) || 0;
      const idB = parseInt(String(b.id)) || 0;
      return idB - idA;
    });
  }, [filteredJobOrders]);

  const shouldPaginate = userRoleId !== 1 && userRoleId !== 7;

  const paginatedJobOrders = useMemo(() => {
    if (!shouldPaginate) return sortedJobOrders;
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedJobOrders.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedJobOrders, currentPage, shouldPaginate]);

  const totalPages = useMemo(() => {
    if (!shouldPaginate) return 1;
    return Math.ceil(sortedJobOrders.length / itemsPerPage);
  }, [sortedJobOrders.length, shouldPaginate]);

  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(prev => {
      const maxPage = totalPages;
      if (newPage >= 1 && newPage <= maxPage) return newPage;
      return prev;
    });
  }, [totalPages]);

  const { width } = Dimensions.get('window');
  const isTablet = width >= 768;

  const handleMobileBack = useCallback(() => {
    if (mobileView === 'details') {
      setSelectedJobOrder(null);
      setMobileView('orders');
    }
  }, [mobileView]);

  const handleMobileRowClick = useCallback((jobOrder: JobOrder) => {
    setSelectedJobOrder(jobOrder);
    setMobileView('details');
  }, []);

  const handleRowClick = useCallback((jobOrder: JobOrder) => {
    setSelectedJobOrder(jobOrder);
    if (width >= 768) {
      setMobileView('orders');
    }
  }, [width]);


  return (
    <View style={[jo.container, {
      flexDirection: isTablet ? 'row' : 'column',
      backgroundColor: '#f9fafb'
    }]}>


      {mobileMenuOpen && userRole.toLowerCase() !== 'technician' && userRole.toLowerCase() !== 'agent' && userRoleId !== 2 && userRoleId !== 4 && mobileView === 'orders' && (
        <View style={jo.mobileOverlay}>
          <Pressable style={jo.mobileBackdrop} onPress={() => setMobileMenuOpen(false)} />
          <View style={[jo.mobileSidebar, { backgroundColor: '#ffffff' }]}>
            <View style={[jo.mobileSidebarHeader, { borderColor: '#e5e7eb' }]}>
              <Text style={[jo.sidebarTitle, { color: '#111827' }]}>Filters</Text>
              <Pressable onPress={() => setMobileMenuOpen(false)}>
                <X size={24} color={'#4b5563'} />
              </Pressable>
            </View>
            <View style={jo.pad16}>
              <Text style={{ color: '#6b7280' }}>No filters available</Text>
            </View>
          </View>
        </View>
      )}

      {userRole.toLowerCase() !== 'technician' && userRole.toLowerCase() !== 'agent' && isTablet && (
        <View style={[jo.sidebar, {
          width: 256,
          backgroundColor: '#ffffff',
          borderColor: '#e5e7eb'
        }]}>
          <View style={[jo.sidebarHeaderBox, { borderColor: '#e5e7eb' }]}>
            <View style={jo.sidebarTitleRow}>
              <Text style={[jo.sidebarTitle, { color: '#111827' }]}>Job Orders</Text>
            </View>
          </View>
          <View style={jo.pad16}>
            <Text style={{ color: '#6b7280' }}>No filters available</Text>
          </View>
        </View>
      )}

      <View style={[jo.mainContent, {
        backgroundColor: '#ffffff',
        display: mobileView === 'details' && !isTablet ? 'none' : 'flex'
      }]}>
        <View style={jo.mainInner}>
          <View style={[jo.toolbar, {
            paddingTop: isTablet ? 16 : 60,
            backgroundColor: '#ffffff',
            borderColor: '#e5e7eb'
          }]}>
            <View style={jo.toolbarRow}>
              {!isTablet && mobileView === 'orders' && userRole.toLowerCase() !== 'technician' && userRole.toLowerCase() !== 'agent' && userRoleId !== 2 && userRoleId !== 4 && (
                <Pressable onPress={handleMobileBack} style={jo.iconBtn}>
                  <ArrowLeft size={24} color={'#111827'} />
                </Pressable>
              )}
              {userRole.toLowerCase() !== 'technician' && userRole.toLowerCase() !== 'agent' && userRoleId !== 2 && userRoleId !== 4 && mobileView === 'orders' && (
                <Pressable onPress={() => setMobileMenuOpen(true)} style={jo.menuBtn}>
                  <Menu size={20} color="white" />
                </Pressable>
              )}
              <View style={jo.searchWrap}>
                <TextInput
                  placeholder="Search job orders..."
                  placeholderTextColor={'#6b7280'}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  style={[jo.searchInput, {
                    backgroundColor: '#f3f4f6',
                    color: '#111827',
                    borderColor: '#d1d5db'
                  }]}
                />
                <View style={jo.searchIcon}>
                  <Search size={16} color={'#6b7280'} />
                </View>
              </View>
              <View style={jo.actionsRow}>
                {userRole.toLowerCase() !== 'agent' && userRoleId !== 4 && (
                  <Pressable
                    onPress={() => setIsFunnelFilterOpen(true)}
                    style={[jo.actionBtn, { backgroundColor: '#e5e7eb' }]}
                  >
                    <ListFilter size={20} color={'#374151'} />
                  </Pressable>
                )}

                <Pressable
                  onPress={handleRefresh}
                  disabled={isRefreshing}
                  style={[jo.actionBtn, { backgroundColor: isRefreshing ? '#4b5563' : (colorPalette?.primary || '#7c3aed') }]}
                >
                  <RefreshCw size={20} color="white" />
                </Pressable>
              </View>
            </View>
          </View>

          <View style={jo.listArea}>
            {isLoading ? (
              <ScrollView
                style={jo.flex1}
                refreshControl={
                  <RefreshControl
                    refreshing={isRefreshing}
                    onRefresh={handleRefresh}
                    tintColor={colorPalette?.primary || '#7c3aed'}
                    colors={[colorPalette?.primary || '#7c3aed']}
                  />
                }
              >
                <View style={jo.loadingWrap}>
                  <View style={jo.skeletonCol}>
                    <View style={[jo.skeletonBar1, { backgroundColor: '#d1d5db' }]} />
                    <View style={[jo.skeletonBar2, { backgroundColor: '#d1d5db' }]} />
                  </View>
                  <Text style={[jo.loadingText, { color: '#4b5563' }]}>Loading job orders...</Text>
                </View>
              </ScrollView>
            ) : error ? (
              <ScrollView
                style={jo.flex1}
                refreshControl={
                  <RefreshControl
                    refreshing={isRefreshing}
                    onRefresh={handleRefresh}
                    tintColor={colorPalette?.primary || '#7c3aed'}
                    colors={[colorPalette?.primary || '#7c3aed']}
                  />
                }
              >
                <View style={jo.loadingWrap}>
                  <Text style={{ color: '#dc2626' }}>{error}</Text>
                  <Pressable
                    onPress={() => Alert.alert('Retry', 'Reload the application')}
                    style={[jo.retryBtn, { backgroundColor: '#9ca3af' }]}
                  >
                    <Text style={jo.retryText}>Retry</Text>
                  </Pressable>
                </View>
              </ScrollView>
            ) : (
              <View style={jo.flex1}>
                <FlashList
                  data={paginatedJobOrders}
                  keyExtractor={(item) => String(item.id)}
                  refreshControl={
                    <RefreshControl
                      refreshing={isRefreshing}
                      onRefresh={handleRefresh}
                      tintColor={colorPalette?.primary || '#7c3aed'}
                      colors={[colorPalette?.primary || '#7c3aed']}
                    />
                  }
                  ListEmptyComponent={
                    <View style={jo.emptyWrap}>
                      <Text style={{ color: '#4b5563' }}>No job orders found matching your filters</Text>
                    </View>
                  }
                  renderItem={({ item: jobOrder }) => (
                    <Pressable
                      onPress={() => !isTablet ? handleMobileRowClick(jobOrder) : handleRowClick(jobOrder)}
                      style={[jo.cardRow, {
                        backgroundColor: selectedJobOrder?.id === jobOrder.id ? '#f3f4f6' : 'transparent',
                        borderColor: '#e5e7eb'
                      }]}
                    >
                      <View style={jo.cardInner}>
                        <View style={jo.cardLeft}>
                          <Text style={[jo.cardName, { color: '#111827' }]}>
                            {getClientFullName(jobOrder)}
                          </Text>
                          <Text style={[jo.cardSub, { color: '#4b5563' }]}>
                            {formatDate(jobOrder.Timestamp || jobOrder.timestamp)} | {getClientFullAddress(jobOrder)} | Fee: {formatPrice(jobOrder.Installation_Fee || jobOrder.installation_fee)}
                          </Text>
                        </View>
                        <View style={jo.cardRight}>
                          <StatusText status={jobOrder.Onsite_Status || jobOrder.onsite_status} type="onsite" />
                        </View>
                      </View>
                    </Pressable>
                  )}
                />
              </View>
            )}
          </View>

          {!isLoading && shouldPaginate && sortedJobOrders.length > 0 && totalPages > 1 && (
            <View style={[jo.paginationBar, {
              backgroundColor: '#ffffff',
              borderColor: '#e5e7eb'
            }]}>
              <View>
                <Text style={[jo.paginationInfo, { color: '#4b5563' }]}>
                  Showing <Text style={jo.bold500}>{(currentPage - 1) * itemsPerPage + 1}</Text> to <Text style={jo.bold500}>{Math.min(currentPage * itemsPerPage, sortedJobOrders.length)}</Text> of <Text style={jo.bold500}>{sortedJobOrders.length}</Text> results
                </Text>
              </View>
              <View style={jo.paginationBtns}>
                <Pressable
                  onPress={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  style={[jo.pageBtn, {
                    backgroundColor: currentPage === 1 ? '#f3f4f6' : '#ffffff',
                    borderWidth: currentPage === 1 ? 0 : 1,
                    borderColor: '#d1d5db'
                  }]}
                >
                  <Text style={[jo.pageBtnText, {
                    color: currentPage === 1 ? '#9ca3af' : '#374151'
                  }]}>Previous</Text>
                </Pressable>

                <View style={jo.pageIndicatorWrap}>
                  <Text style={[jo.pageIndicator, { color: '#111827' }]}>
                    Page {currentPage} of {totalPages}
                  </Text>
                </View>

                <Pressable
                  onPress={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  style={[jo.pageBtn, {
                    backgroundColor: currentPage === totalPages ? '#f3f4f6' : '#ffffff',
                    borderWidth: currentPage === totalPages ? 0 : 1,
                    borderColor: '#d1d5db'
                  }]}
                >
                  <Text style={[jo.pageBtnText, {
                    color: currentPage === totalPages ? '#9ca3af' : '#374151'
                  }]}>Next</Text>
                </Pressable>
              </View>
            </View>
          )}

        </View>
      </View>

      {
        selectedJobOrder && mobileView === 'details' && (
          <View style={[jo.mobileDetail, {
            backgroundColor: '#f9fafb',
            display: isTablet ? 'none' : 'flex'
          }]}>
            <JobOrderDetails
              jobOrder={selectedJobOrder as JobOrder}
              onClose={handleMobileBack}
              onRefresh={refreshJobOrders}
              isMobile={true}
            />
          </View>
        )
      }

      {
        selectedJobOrder && (mobileView !== 'details' || isTablet) && (
          <View style={[jo.tabletDetail, { display: isTablet ? 'flex' : 'none' }]}>
            <JobOrderDetails
              jobOrder={selectedJobOrder as JobOrder}
              onClose={() => setSelectedJobOrder(null)}
              onRefresh={refreshJobOrders}
              isMobile={false}
            />
          </View>
        )
      }

      <JobOrderFunnelFilter
        isOpen={isFunnelFilterOpen}
        onClose={() => setIsFunnelFilterOpen(false)}
        onApplyFilters={handleApplyFilters}
        currentFilters={filterValues}
      />
    </View >
  );
};

export default JobOrderPage;
