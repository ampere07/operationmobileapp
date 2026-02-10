import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Alert, Dimensions, DeviceEventEmitter, RefreshControl } from 'react-native';
import { FileText, Search, ChevronDown, ListFilter, ArrowUp, ArrowDown, Menu, X, ArrowLeft, RefreshCw } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import JobOrderDetails from '../components/JobOrderDetails';
// import JobOrderFunnelFilter from '../components/filters/JobOrderFunnelFilter';
import { useJobOrderContext } from '../contexts/JobOrderContext';
import { getCities, City } from '../services/cityService';
import { getBillingStatuses, BillingStatus } from '../services/lookupService';
import { JobOrder } from '../types/jobOrder';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';

interface LocationItem {
  id: string;
  name: string;
  count: number;
}

type DisplayMode = 'card' | 'table';

const allColumns = [
  { key: 'timestamp', label: 'Timestamp', width: 'min-w-40' },
  { key: 'billingStatusId', label: 'Billing Status ID', width: 'min-w-32' },
  { key: 'onsiteStatus', label: 'Onsite Status', width: 'min-w-32' },
  { key: 'dateInstalled', label: 'Date Installed', width: 'min-w-36' },
  { key: 'installationFee', label: 'Installation Fee', width: 'min-w-32' },
  { key: 'billingDay', label: 'Billing Day', width: 'min-w-28' },
  { key: 'modemRouterSN', label: 'Modem/Router SN', width: 'min-w-36' },
  { key: 'routerModel', label: 'Router Model', width: 'min-w-32' },
  { key: 'groupName', label: 'Group Name', width: 'min-w-32' },
  { key: 'lcpnap', label: 'LCPNAP', width: 'min-w-28' },
  { key: 'port', label: 'PORT', width: 'min-w-24' },
  { key: 'vlan', label: 'VLAN', width: 'min-w-24' },
  { key: 'username', label: 'Username', width: 'min-w-32' },
  { key: 'ipAddress', label: 'IP Address', width: 'min-w-32' },
  { key: 'connectionType', label: 'Connection Type', width: 'min-w-36' },
  { key: 'usageType', label: 'Usage Type', width: 'min-w-32' },
  { key: 'usernameStatus', label: 'Username Status', width: 'min-w-32' },
  { key: 'visitBy', label: 'Visit By', width: 'min-w-32' },
  { key: 'visitWith', label: 'Visit With', width: 'min-w-32' },
  { key: 'visitWithOther', label: 'Visit With Other', width: 'min-w-32' },
  { key: 'onsiteRemarks', label: 'Onsite Remarks', width: 'min-w-40' },
  { key: 'statusRemarks', label: 'Status Remarks', width: 'min-w-40' },
  { key: 'addressCoordinates', label: 'Address Coordinates', width: 'min-w-40' },
  { key: 'contractLink', label: 'Contract Link', width: 'min-w-48' },
  { key: 'clientSignatureUrl', label: 'Client Signature URL', width: 'min-w-48' },
  { key: 'setupImageUrl', label: 'Setup Image URL', width: 'min-w-48' },
  { key: 'speedtestImageUrl', label: 'Speedtest Image URL', width: 'min-w-48' },
  { key: 'signedContractImageUrl', label: 'Signed Contract Image URL', width: 'min-w-48' },
  { key: 'boxReadingImageUrl', label: 'Box Reading Image URL', width: 'min-w-48' },
  { key: 'routerReadingImageUrl', label: 'Router Reading Image URL', width: 'min-w-48' },
  { key: 'portLabelImageUrl', label: 'Port Label Image URL', width: 'min-w-48' },
  { key: 'houseFrontPictureUrl', label: 'House Front Picture URL', width: 'min-w-48' },
  { key: 'createdAt', label: 'Created At', width: 'min-w-40' },
  { key: 'createdByUserEmail', label: 'Created By User Email', width: 'min-w-48' },
  { key: 'updatedAt', label: 'Updated At', width: 'min-w-40' },
  { key: 'updatedByUserEmail', label: 'Updated By User Email', width: 'min-w-48' },
  { key: 'assignedEmail', label: 'Assigned Email', width: 'min-w-48' },
  { key: 'pppoeUsername', label: 'PPPoE Username', width: 'min-w-36' },
  { key: 'pppoePassword', label: 'PPPoE Password', width: 'min-w-36' },
  { key: 'fullName', label: 'Full Name of Client', width: 'min-w-48' },
  { key: 'address', label: 'Full Address of Client', width: 'min-w-56' },
  { key: 'contractTemplate', label: 'Contract Template', width: 'min-w-36' },
  { key: 'modifiedBy', label: 'Modified By', width: 'min-w-32' },
  { key: 'modifiedDate', label: 'Modified Date', width: 'min-w-40' },
  { key: 'firstName', label: 'First Name', width: 'min-w-32' },
  { key: 'middleInitial', label: 'Middle Initial', width: 'min-w-28' },
  { key: 'lastName', label: 'Last Name', width: 'min-w-32' },
  { key: 'contactNumber', label: 'Contact Number', width: 'min-w-36' },
  { key: 'secondContactNumber', label: 'Second Contact Number', width: 'min-w-40' },
  { key: 'emailAddress', label: 'Email Address', width: 'min-w-48' },
  { key: 'region', label: 'Region', width: 'min-w-28' },
  { key: 'city', label: 'City', width: 'min-w-28' },
  { key: 'barangay', label: 'Barangay', width: 'min-w-32' },
  { key: 'location', label: 'Location', width: 'min-w-32' },
  { key: 'choosePlan', label: 'Choose Plan', width: 'min-w-36' },
  { key: 'referredBy', label: 'Referred By', width: 'min-w-32' },
  { key: 'startTimestamp', label: 'Start Timestamp', width: 'min-w-40' },
  { key: 'endTimestamp', label: 'End Timestamp', width: 'min-w-40' },
  { key: 'duration', label: 'Duration', width: 'min-w-28' }
];

const JobOrderPage: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedJobOrder, setSelectedJobOrder] = useState<JobOrder | null>(null);
  const { jobOrders, isLoading, error, refreshJobOrders, silentRefresh } = useJobOrderContext();
  const [cities, setCities] = useState<City[]>([]);
  const [billingStatuses, setBillingStatuses] = useState<BillingStatus[]>([]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<string>('');
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
  const [mobileView, setMobileView] = useState<'locations' | 'orders' | 'details'>('locations');
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
  }, [selectedLocation, searchQuery, sortColumn, sortDirection]);

  const formatDate = (dateStr?: string | null): string => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleString();
    } catch (e) {
      return '-';
    }
  };

  const getLastDayOfMonth = (): number => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return lastDay.getDate();
  };

  const formatPrice = (price?: number | null): string => {
    if (price === null || price === undefined || price === 0) return '-';
    return `₱${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getBillingStatusName = (statusId?: number | null): string => {
    if (!statusId) return '-';

    if (billingStatuses.length === 0) {
      const defaultStatuses: { [key: number]: string } = {
        1: 'In Progress',
        2: 'Active',
        3: 'Suspended',
        4: 'Cancelled',
        5: 'Overdue'
      };
      return defaultStatuses[statusId] || '-';
    }

    const status = billingStatuses.find(s => s.id === statusId);
    return status ? status.status_name : '-';
  };

  const [userEmail, setUserEmail] = useState<string>('');
  const [userRoleId, setUserRoleId] = useState<number | null>(null);

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
          setUserRoleId(userData.role_id || null);
        } catch (error) {
        }
      }
    };
    loadAuthData();
  }, []);

  useEffect(() => {
    const fetchLookupData = async () => {
      try {
        const citiesData = await getCities();
        setCities(citiesData);

        const billingStatusesData = await getBillingStatuses();
        setBillingStatuses(billingStatusesData);
      } catch (err) {
        console.error('Failed to fetch lookup data:', err);
      }
    };

    fetchLookupData();
  }, []);

  useEffect(() => {
    silentRefresh();
  }, [silentRefresh]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshJobOrders();
    setIsRefreshing(false);
  };

  const getClientFullName = (jobOrder: JobOrder): string => {
    return [
      jobOrder.First_Name || jobOrder.first_name || '',
      jobOrder.Middle_Initial || jobOrder.middle_initial ? (jobOrder.Middle_Initial || jobOrder.middle_initial) + '.' : '',
      jobOrder.Last_Name || jobOrder.last_name || ''
    ].filter(Boolean).join(' ').trim() || '-';
  };

  const getClientFullAddress = (jobOrder: JobOrder): string => {
    const addressParts = [
      jobOrder.Address || jobOrder.address,
      jobOrder.Location || jobOrder.location,
      jobOrder.Barangay || jobOrder.barangay,
      jobOrder.City || jobOrder.city,
      jobOrder.Region || jobOrder.region
    ].filter(Boolean);

    return addressParts.length > 0 ? addressParts.join(', ') : '-';
  };

  const locationItems: LocationItem[] = [
    {
      id: 'all',
      name: 'All',
      count: jobOrders.length
    }
  ];

  cities.forEach(city => {
    const cityCount = jobOrders.filter(job => {
      const jobCity = ((job.City || job.city) || '').toLowerCase();
      const cityName = city.name.toLowerCase();
      return jobCity.includes(cityName) || cityName.includes(jobCity);
    }).length;

    locationItems.push({
      id: city.name.toLowerCase(),
      name: city.name,
      count: cityCount
    });
  });



  let filteredJobOrders = jobOrders.filter(jobOrder => {
    const jobLocation = ((jobOrder.City || jobOrder.city) || '').toLowerCase();

    const matchesLocation = selectedLocation === 'all' ||
      jobLocation.includes(selectedLocation) ||
      selectedLocation.includes(jobLocation);

    const fullName = getClientFullName(jobOrder).toLowerCase();
    const matchesSearch = searchQuery === '' ||
      fullName.includes(searchQuery.toLowerCase()) ||
      ((jobOrder.Address || jobOrder.address) || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      ((jobOrder.Assigned_Email || jobOrder.assigned_email) || '').toLowerCase().includes(searchQuery.toLowerCase());

    return matchesLocation && matchesSearch;
  });



  const presortedJobOrders = [...filteredJobOrders].sort((a, b) => {
    const idA = parseInt(String(a.id)) || 0;
    const idB = parseInt(String(b.id)) || 0;
    return idB - idA;
  });

  const sortedJobOrders = [...presortedJobOrders].sort((a, b) => {
    if (!sortColumn) return 0;

    let aValue: any = '';
    let bValue: any = '';

    const getVal = (jo: JobOrder, key: string) => {
      switch (key) {
        case 'timestamp': return jo.Timestamp || jo.timestamp || '';
        case 'billingStatusId': return jo.billing_status_id || jo.Billing_Status_ID || '';
        case 'onsiteStatus': return jo.Onsite_Status || jo.onsite_status || '';
        case 'dateInstalled': return jo.Date_Installed || jo.date_installed || '';
        case 'installationFee': return jo.Installation_Fee || jo.installation_fee || 0;
        case 'billingDay': return jo.Billing_Day ?? jo.billing_day ?? 0;
        case 'modemRouterSN': return jo.Modem_Router_SN || jo.modem_router_sn || '';
        case 'routerModel': return jo.Router_Model || jo.router_model || '';
        case 'groupName': return jo.group_name || jo.Group_Name || '';
        case 'lcpnap': return jo.LCPNAP || jo.lcpnap || '';
        case 'port': return jo.PORT || jo.Port || jo.port || '';
        case 'vlan': return jo.VLAN || jo.vlan || '';
        case 'username': return jo.Username || jo.username || '';
        case 'ipAddress': return jo.IP_Address || jo.ip_address || jo.IP || jo.ip || '';
        case 'connectionType': return jo.Connection_Type || jo.connection_type || '';
        case 'usageType': return jo.Usage_Type || jo.usage_type || '';
        case 'usernameStatus': return jo.username_status || jo.Username_Status || '';
        case 'visitBy': return jo.Visit_By || jo.visit_by || '';
        case 'visitWith': return jo.Visit_With || jo.visit_with || '';
        case 'visitWithOther': return jo.Visit_With_Other || jo.visit_with_other || '';
        case 'onsiteRemarks': return jo.Onsite_Remarks || jo.onsite_remarks || '';
        case 'statusRemarks': return jo.Status_Remarks || jo.status_remarks || '';
        case 'fullName': return getClientFullName(jo);
        case 'address': return getClientFullAddress(jo);
        case 'assignedEmail': return jo.Assigned_Email || jo.assigned_email || '';
        case 'createdAt': return jo.created_at || jo.Created_At || '';
        case 'updatedAt': return jo.updated_at || jo.Updated_At || '';
        default: return '';
      }
    };

    aValue = getVal(a, sortColumn);
    bValue = getVal(b, sortColumn);

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const paginatedJobOrders = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedJobOrders.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedJobOrders, currentPage]);

  const totalPages = Math.ceil(sortedJobOrders.length / itemsPerPage);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const { width } = Dimensions.get('window');
  const isTablet = width >= 768;

  const StatusText = ({ status, type }: { status?: string | null, type: 'onsite' | 'billing' }) => {
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
      <Text style={{ color: textColor, fontWeight: 'bold', textTransform: 'uppercase' }}>
        {status === 'inprogress' ? 'In Progress' : status}
      </Text>
    );
  };

  const handleLocationSelect = (locationId: string) => {
    setSelectedLocation(locationId);
    setMobileMenuOpen(false);
    setMobileView('orders');
  };

  const handleMobileBack = () => {
    if (mobileView === 'details') {
      setSelectedJobOrder(null);
      setMobileView('orders');
    } else if (mobileView === 'orders') {
      setMobileView('locations');
    }
  };

  const handleMobileRowClick = (jobOrder: JobOrder) => {
    setSelectedJobOrder(jobOrder);
    setMobileView('details');
  };

  const handleRowClick = (jobOrder: JobOrder) => {
    setSelectedJobOrder(jobOrder);
    if (width >= 768) {
      setMobileView('orders');
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

  const getValue = (value: any): string => {
    if (value === null || value === undefined || value === '') return '-';
    if (typeof value === 'string' && value.trim().toLowerCase() === 'null') return '-';
    return value;
  };

  const renderCellValue = (jobOrder: JobOrder, columnKey: string): string => {
    switch (columnKey) {
      case 'timestamp':
        return formatDate(jobOrder.Timestamp || jobOrder.timestamp);
      case 'dateInstalled':
        return formatDate(jobOrder.Date_Installed || jobOrder.date_installed);
      case 'installationFee':
        return formatPrice(jobOrder.Installation_Fee || jobOrder.installation_fee);
      case 'billingDay':
        const billingDay = jobOrder.Billing_Day ?? jobOrder.billing_day;
        if (billingDay === null || billingDay === undefined) return '-';
        const dayValue = Number(billingDay);
        if (isNaN(dayValue)) return '-';
        return dayValue === 0 ? String(getLastDayOfMonth()) : String(dayValue);
      case 'billingStatusId':
        return getValue(jobOrder.billing_status_id || jobOrder.Billing_Status_ID);
      case 'modemRouterSN':
        return getValue(jobOrder.Modem_Router_SN || jobOrder.modem_router_sn);
      case 'routerModel':
        return getValue(jobOrder.Router_Model || jobOrder.router_model);
      case 'groupName':
        return getValue(jobOrder.group_name || jobOrder.Group_Name);
      case 'lcpnap':
        return getValue(jobOrder.LCPNAP || jobOrder.lcpnap);
      case 'port':
        return getValue(jobOrder.PORT || jobOrder.Port || jobOrder.port);
      case 'vlan':
        return getValue(jobOrder.VLAN || jobOrder.vlan);
      case 'username':
        return getValue(jobOrder.Username || jobOrder.username);
      case 'ipAddress':
        return getValue(jobOrder.IP_Address || jobOrder.ip_address || jobOrder.IP || jobOrder.ip);
      case 'connectionType':
        return getValue(jobOrder.Connection_Type || jobOrder.connection_type);
      case 'usageType':
        return getValue(jobOrder.Usage_Type || jobOrder.usage_type);
      case 'usernameStatus':
        return getValue(jobOrder.username_status || jobOrder.Username_Status);
      case 'visitBy':
        return getValue(jobOrder.Visit_By || jobOrder.visit_by);
      case 'visitWith':
        return getValue(jobOrder.Visit_With || jobOrder.visit_with);
      case 'visitWithOther':
        return getValue(jobOrder.Visit_With_Other || jobOrder.visit_with_other);
      case 'onsiteStatus':
        return jobOrder.Onsite_Status || jobOrder.onsite_status || '-';
      case 'onsiteRemarks':
        return getValue(jobOrder.Onsite_Remarks || jobOrder.onsite_remarks);
      case 'statusRemarks':
        return getValue(jobOrder.Status_Remarks || jobOrder.status_remarks);
      case 'addressCoordinates':
        return getValue(jobOrder.Address_Coordinates || jobOrder.address_coordinates);
      case 'contractLink':
        return getValue(jobOrder.Contract_Link || jobOrder.contract_link);
      case 'clientSignatureUrl':
        return getValue(
          jobOrder.client_signature_url ||
          jobOrder.Client_Signature_URL ||
          jobOrder.client_signature_image_url ||
          jobOrder.Client_Signature_Image_URL
        );
      case 'setupImageUrl':
        return getValue(
          jobOrder.setup_image_url ||
          jobOrder.Setup_Image_URL ||
          jobOrder.Setup_Image_Url
        );
      case 'speedtestImageUrl':
        return getValue(
          jobOrder.speedtest_image_url ||
          jobOrder.Speedtest_Image_URL ||
          jobOrder.speedtest_image ||
          jobOrder.Speedtest_Image
        );
      case 'signedContractImageUrl':
        return getValue(
          jobOrder.signed_contract_image_url ||
          jobOrder.Signed_Contract_Image_URL ||
          jobOrder.signed_contract_url ||
          jobOrder.Signed_Contract_URL
        );
      case 'boxReadingImageUrl':
        return getValue(
          jobOrder.box_reading_image_url ||
          jobOrder.Box_Reading_Image_URL ||
          jobOrder.box_reading_url ||
          jobOrder.Box_Reading_URL
        );
      case 'routerReadingImageUrl':
        return getValue(
          jobOrder.router_reading_image_url ||
          jobOrder.Router_Reading_Image_URL ||
          jobOrder.router_reading_url ||
          jobOrder.Router_Reading_URL
        );
      case 'portLabelImageUrl':
        return getValue(
          jobOrder.port_label_image_url ||
          jobOrder.Port_Label_Image_URL ||
          jobOrder.port_label_url ||
          jobOrder.Port_Label_URL
        );
      case 'houseFrontPictureUrl':
        return getValue(
          jobOrder.house_front_picture_url ||
          jobOrder.House_Front_Picture_URL ||
          jobOrder.house_front_picture ||
          jobOrder.House_Front_Picture
        );
      case 'createdAt':
        return formatDate(jobOrder.created_at || jobOrder.Created_At);
      case 'createdByUserEmail':
        return getValue(jobOrder.created_by_user_email || jobOrder.Created_By_User_Email);
      case 'updatedAt':
        return formatDate(jobOrder.updated_at || jobOrder.Updated_At);
      case 'updatedByUserEmail':
        return getValue(jobOrder.updated_by_user_email || jobOrder.Updated_By_User_Email);
      case 'assignedEmail':
        return getValue(jobOrder.Assigned_Email || jobOrder.assigned_email);
      case 'pppoeUsername':
        return getValue(jobOrder.PPPoE_Username || jobOrder.pppoe_username);
      case 'pppoePassword':
        return getValue(jobOrder.PPPoE_Password || jobOrder.pppoe_password);
      case 'fullName':
        return getClientFullName(jobOrder);
      case 'address':
        return getClientFullAddress(jobOrder);
      case 'contractTemplate':
        return getValue(jobOrder.Contract_Template || jobOrder.contract_template);
      case 'modifiedBy':
        return getValue(jobOrder.Modified_By || jobOrder.modified_by);
      case 'modifiedDate':
        return formatDate(jobOrder.Modified_Date || jobOrder.modified_date);
      case 'firstName':
        return getValue(jobOrder.First_Name || jobOrder.first_name);
      case 'middleInitial':
        return getValue(jobOrder.Middle_Initial || jobOrder.middle_initial);
      case 'lastName':
        return getValue(jobOrder.Last_Name || jobOrder.last_name);
      case 'contactNumber':
        return getValue(jobOrder.Contact_Number || jobOrder.Mobile_Number || jobOrder.contact_number || jobOrder.mobile_number);
      case 'secondContactNumber':
        return getValue(jobOrder.Second_Contact_Number || jobOrder.Secondary_Mobile_Number || jobOrder.second_contact_number || jobOrder.secondary_mobile_number);
      case 'emailAddress':
        return getValue(jobOrder.Email_Address || jobOrder.Applicant_Email_Address || jobOrder.email_address || jobOrder.applicant_email_address);
      case 'region':
        return getValue(jobOrder.Region || jobOrder.region);
      case 'city':
        return getValue(jobOrder.City || jobOrder.city);
      case 'barangay':
        return getValue(jobOrder.Barangay || jobOrder.barangay);
      case 'location':
        return getValue(jobOrder.Location || jobOrder.location);
      case 'choosePlan':
        return getValue(jobOrder.Choose_Plan || jobOrder.Desired_Plan || jobOrder.choose_plan || jobOrder.desired_plan);
      case 'referredBy':
        return getValue(jobOrder.Referred_By || jobOrder.referred_by);
      case 'startTimestamp':
        return formatDate(jobOrder.StartTimeStamp || jobOrder.start_timestamp);
      case 'endTimestamp':
        return formatDate(jobOrder.EndTimeStamp || jobOrder.end_timestamp);
      case 'duration':
        return getValue(jobOrder.Duration || jobOrder.duration);
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
            paddingTop: 60,
            borderBottomWidth: 1,
            backgroundColor: isDarkMode ? '#111827' : '#ffffff',
            borderColor: isDarkMode ? '#374151' : '#e5e7eb'
          }}>
            <Text style={{
              fontSize: 18,
              fontWeight: '600',
              color: isDarkMode ? '#ffffff' : '#111827'
            }}>
              Job Orders
            </Text>
          </View>
          <ScrollView
            style={{ flex: 1 }}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
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

      {mobileMenuOpen && userRole.toLowerCase() !== 'technician' && mobileView === 'orders' && (
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
              }}>
                Filters
              </Text>
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
        </View>
      )}

      {userRole.toLowerCase() !== 'technician' && isTablet && (
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
              }}>
                Job Orders
              </Text>
            </View>
          </View>
          <ScrollView
            style={{ flex: 1 }}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={colorPalette?.primary || '#ea580c'}
                colors={[colorPalette?.primary || '#ea580c']}
              />
            }
          >
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

      <View style={{
        overflow: 'hidden',
        flex: 1,
        flexDirection: 'column',
        backgroundColor: isDarkMode ? '#111827' : '#ffffff',
        display: (mobileView === 'locations' || mobileView === 'details') && !isTablet ? 'none' : 'flex'
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
              {!isTablet && mobileView === 'orders' && (
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
              {userRole.toLowerCase() !== 'technician' && mobileView === 'orders' && (
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
                  placeholder="Search job orders..."
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
                  refreshing={isRefreshing}
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
                  }}>Loading job orders...</Text>
                </View>
              ) : error ? (
                <View style={{
                  paddingHorizontal: 16,
                  paddingVertical: 48,
                  alignItems: 'center'
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
              ) : (
                paginatedJobOrders.length > 0 ? (
                  <View>
                    {paginatedJobOrders.map((jobOrder) => (
                      <Pressable
                        key={jobOrder.id}
                        onPress={() => !isTablet ? handleMobileRowClick(jobOrder) : handleRowClick(jobOrder)}
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 12,
                          borderBottomWidth: 1,
                          backgroundColor: selectedJobOrder?.id === jobOrder.id ? (isDarkMode ? '#1f2937' : '#f3f4f6') : 'transparent',
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
                              {getClientFullName(jobOrder)}
                            </Text>
                            <Text style={{
                              fontSize: 12,
                              color: isDarkMode ? '#9ca3af' : '#4b5563'
                            }}>
                              {formatDate(jobOrder.Timestamp || jobOrder.timestamp)} | {getClientFullAddress(jobOrder)}
                            </Text>
                          </View>
                          <View style={{
                            flexDirection: 'column',
                            alignItems: 'flex-end',
                            gap: 4,
                            marginLeft: 16,
                            flexShrink: 0
                          }}>
                            <StatusText status={jobOrder.Onsite_Status || jobOrder.onsite_status} type="onsite" />
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
                    }}>No job orders found matching your filters</Text>
                  </View>
                )
              )}
            </ScrollView>

            {!isLoading && sortedJobOrders.length > 0 && totalPages > 1 && (
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
                    Showing <Text style={{ fontWeight: '500' }}>{(currentPage - 1) * itemsPerPage + 1}</Text> to <Text style={{ fontWeight: '500' }}>{Math.min(currentPage * itemsPerPage, sortedJobOrders.length)}</Text> of <Text style={{ fontWeight: '500' }}>{sortedJobOrders.length}</Text> results
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

      {selectedJobOrder && mobileView === 'details' && (
        <View style={{
          flex: 1,
          flexDirection: 'column',
          overflow: 'hidden',
          backgroundColor: isDarkMode ? '#030712' : '#f9fafb',
          display: isTablet ? 'none' : 'flex'
        }}>
          <JobOrderDetails
            jobOrder={selectedJobOrder}
            onClose={handleMobileBack}
            onRefresh={refreshJobOrders}
            isMobile={true}
          />
        </View>
      )}

      {selectedJobOrder && (mobileView !== 'details' || isTablet) && (
        <View style={{
          flexShrink: 0,
          overflow: 'hidden',
          display: isTablet ? 'flex' : 'none'
        }}>
          <JobOrderDetails
            jobOrder={selectedJobOrder}
            onClose={() => setSelectedJobOrder(null)}
            onRefresh={refreshJobOrders}
            isMobile={false}
          />
        </View>
      )}


    </View>
  );
};

export default JobOrderPage;
