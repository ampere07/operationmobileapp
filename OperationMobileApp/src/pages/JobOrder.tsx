import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Modal, ActivityIndicator } from 'react-native';
import { FileText, Search, ChevronDown, ListFilter, ArrowUp, ArrowDown, Menu, X, ArrowLeft, RefreshCw, Filter } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import JobOrderDetails from '../components/JobOrderDetails';
import JobOrderFunnelFilter from '../components/filters/JobOrderFunnelFilter';
import { getJobOrders } from '../services/jobOrderService';
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
  { key: 'timestamp', label: 'Timestamp', width: 160 },
  { key: 'dateInstalled', label: 'Date Installed', width: 144 },
  { key: 'installationFee', label: 'Installation Fee', width: 128 },
  { key: 'billingDay', label: 'Billing Day', width: 112 },
  { key: 'billingStatusId', label: 'Billing Status ID', width: 128 },
  { key: 'modemRouterSN', label: 'Modem/Router SN', width: 144 },
  { key: 'routerModel', label: 'Router Model', width: 128 },
  { key: 'groupName', label: 'Group Name', width: 128 },
  { key: 'lcpnap', label: 'LCPNAP', width: 112 },
  { key: 'port', label: 'PORT', width: 96 },
  { key: 'vlan', label: 'VLAN', width: 96 },
  { key: 'username', label: 'Username', width: 128 },
  { key: 'ipAddress', label: 'IP Address', width: 128 },
  { key: 'connectionType', label: 'Connection Type', width: 144 },
  { key: 'usageType', label: 'Usage Type', width: 128 },
  { key: 'usernameStatus', label: 'Username Status', width: 128 },
  { key: 'visitBy', label: 'Visit By', width: 128 },
  { key: 'visitWith', label: 'Visit With', width: 128 },
  { key: 'visitWithOther', label: 'Visit With Other', width: 128 },
  { key: 'onsiteStatus', label: 'Onsite Status', width: 128 },
  { key: 'onsiteRemarks', label: 'Onsite Remarks', width: 160 },
  { key: 'statusRemarks', label: 'Status Remarks', width: 160 },
  { key: 'addressCoordinates', label: 'Address Coordinates', width: 160 },
  { key: 'contractLink', label: 'Contract Link', width: 192 },
  { key: 'clientSignatureUrl', label: 'Client Signature URL', width: 192 },
  { key: 'setupImageUrl', label: 'Setup Image URL', width: 192 },
  { key: 'speedtestImageUrl', label: 'Speedtest Image URL', width: 192 },
  { key: 'signedContractImageUrl', label: 'Signed Contract Image URL', width: 192 },
  { key: 'boxReadingImageUrl', label: 'Box Reading Image URL', width: 192 },
  { key: 'routerReadingImageUrl', label: 'Router Reading Image URL', width: 192 },
  { key: 'portLabelImageUrl', label: 'Port Label Image URL', width: 192 },
  { key: 'houseFrontPictureUrl', label: 'House Front Picture URL', width: 192 },
  { key: 'createdAt', label: 'Created At', width: 160 },
  { key: 'createdByUserEmail', label: 'Created By User Email', width: 192 },
  { key: 'updatedAt', label: 'Updated At', width: 160 },
  { key: 'updatedByUserEmail', label: 'Updated By User Email', width: 192 },
  { key: 'assignedEmail', label: 'Assigned Email', width: 192 },
  { key: 'pppoeUsername', label: 'PPPoE Username', width: 144 },
  { key: 'pppoePassword', label: 'PPPoE Password', width: 144 },
  { key: 'fullName', label: 'Full Name of Client', width: 192 },
  { key: 'address', label: 'Full Address of Client', width: 224 },
  { key: 'contractTemplate', label: 'Contract Template', width: 144 },
  { key: 'modifiedBy', label: 'Modified By', width: 128 },
  { key: 'modifiedDate', label: 'Modified Date', width: 160 },
  { key: 'firstName', label: 'First Name', width: 128 },
  { key: 'middleInitial', label: 'Middle Initial', width: 112 },
  { key: 'lastName', label: 'Last Name', width: 128 },
  { key: 'contactNumber', label: 'Contact Number', width: 144 },
  { key: 'secondContactNumber', label: 'Second Contact Number', width: 160 },
  { key: 'emailAddress', label: 'Email Address', width: 192 },
  { key: 'region', label: 'Region', width: 112 },
  { key: 'city', label: 'City', width: 112 },
  { key: 'barangay', label: 'Barangay', width: 128 },
  { key: 'location', label: 'Location', width: 128 },
  { key: 'choosePlan', label: 'Choose Plan', width: 144 },
  { key: 'referredBy', label: 'Referred By', width: 128 },
  { key: 'startTimestamp', label: 'Start Timestamp', width: 160 },
  { key: 'endTimestamp', label: 'End Timestamp', width: 160 },
  { key: 'duration', label: 'Duration', width: 112 }
];

const JobOrderPage: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedJobOrder, setSelectedJobOrder] = useState<JobOrder | null>(null);
  const [jobOrders, setJobOrders] = useState<JobOrder[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [billingStatuses, setBillingStatuses] = useState<BillingStatus[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
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
  const [isFunnelFilterOpen, setIsFunnelFilterOpen] = useState<boolean>(false);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);
  const sidebarStartXRef = useRef<number>(0);
  const sidebarStartWidthRef = useRef<number>(0);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);
  const [activeFilters, setActiveFilters] = useState<any>({});
  const [userEmail, setUserEmail] = useState<string>('');

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
        }
      }
    };

    loadAuthData();
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
    const loadFilters = async () => {
      const saved = await AsyncStorage.getItem('jobOrderFilters');
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

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const citiesData = await getCities();
      setCities(citiesData);
      
      const billingStatusesData = await getBillingStatuses();
      setBillingStatuses(billingStatusesData);
      
      const authData = await AsyncStorage.getItem('authData');
      let assignedEmail: string | undefined;
      
      if (authData) {
        try {
          const userData = JSON.parse(authData);
          console.log('User data:', userData);
          if (userData.role && userData.role.toLowerCase() === 'technician' && userData.email) {
            assignedEmail = userData.email;
          }
        } catch (error) {
          console.error('Error parsing authData:', error);
        }
      }
      
      console.log('Fetching job orders with assignedEmail:', assignedEmail);
      const response = await getJobOrders(assignedEmail);
      console.log('Job orders response:', response);
      
      if (response.success && Array.isArray(response.data)) {
        const processedOrders: JobOrder[] = response.data.map((order, index) => {
          const id = order.id || order.JobOrder_ID || String(index);
          
          return {
            ...order,
            id: id
          };
        });
        
        console.log('Processed orders count:', processedOrders.length);
        setJobOrders(processedOrders);
      } else {
        console.log('No data or unsuccessful response');
        setJobOrders([]);
      }
    } catch (err: any) {
      console.error('Fetch data error:', err);
      setError(`Failed to load data: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  useEffect(() => {
    fetchData();
  }, []);
  
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
  
  const applyFunnelFilters = (orders: JobOrder[], filters: any): JobOrder[] => {
    if (!filters || Object.keys(filters).length === 0) return orders;

    return orders.filter(order => {
      return Object.entries(filters).every(([key, filter]: [string, any]) => {
        const orderValue = (order as any)[key] || (order as any)[key.toLowerCase()] || (order as any)[key.charAt(0).toUpperCase() + key.slice(1).replace(/_./g, (match) => match.charAt(1).toUpperCase())];
        
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

  filteredJobOrders = applyFunnelFilters(filteredJobOrders, activeFilters);

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
        case 'dateInstalled': return jo.Date_Installed || jo.date_installed || '';
        case 'installationFee': return jo.Installation_Fee || jo.installation_fee || 0;
        case 'billingDay': return jo.Billing_Day ?? jo.billing_day ?? 0;
        case 'billingStatusId': return jo.billing_status_id || jo.Billing_Status_ID || '';
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
        case 'onsiteStatus': return jo.Onsite_Status || jo.onsite_status || '';
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
            Loading job orders...
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
          }}>
            {error}
          </Text>
          <Pressable
            onPress={() => handleRefresh()}
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
              }}>
                Job Orders
              </Text>
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
                {displayMode === 'table' && (
                  <Pressable
                    onPress={() => setFilterDropdownOpen(!filterDropdownOpen)}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 4,
                      backgroundColor: 'transparent'
                    }}
                  >
                    <ListFilter size={20} color={isDarkMode ? '#ffffff' : '#111827'} />
                  </Pressable>
                )}
                <Pressable
                  onPress={() => setDropdownOpen(!dropdownOpen)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 4,
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: 'transparent'
                  }}
                >
                  <Text style={{ color: isDarkMode ? '#ffffff' : '#111827', fontSize: 14 }}>
                    {displayMode === 'card' ? 'Card View' : 'Table View'}
                  </Text>
                  <ChevronDown size={16} color={isDarkMode ? '#ffffff' : '#111827'} style={{ marginLeft: 4 }} />
                </Pressable>
                <Pressable
                  onPress={handleRefresh}
                  disabled={isRefreshing}
                  style={{
                    backgroundColor: isRefreshing ? '#4b5563' : (colorPalette?.primary || '#ea580c'),
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
              {displayMode === 'card' ? (
                sortedJobOrders.length > 0 ? (
                  <View>
                    {sortedJobOrders.map((jobOrder) => (
                      <Pressable
                        key={jobOrder.id}
                        onPress={() => handleRowClick(jobOrder)}
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 12,
                          borderBottomWidth: 1,
                          borderBottomColor: isDarkMode ? '#1f2937' : '#e5e7eb',
                          backgroundColor: selectedJobOrder?.id === jobOrder.id 
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
                              {getClientFullName(jobOrder)}
                            </Text>
                            <Text style={{
                              fontSize: 12,
                              color: isDarkMode ? '#9ca3af' : '#4b5563'
                            }}>
                              {formatDate(jobOrder.Timestamp || jobOrder.timestamp)} | {getClientFullAddress(jobOrder)}
                            </Text>
                          </View>
                          <View style={{ flexDirection: 'column', alignItems: 'flex-end', gap: 4, marginLeft: 16, flexShrink: 0 }}>
                            <StatusText status={jobOrder.Onsite_Status || jobOrder.onsite_status} type="onsite" />
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
                      No job orders found matching your filters
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
                    {sortedJobOrders.length > 0 ? (
                      sortedJobOrders.map((jobOrder) => (
                        <Pressable 
                          key={jobOrder.id} 
                          onPress={() => handleRowClick(jobOrder)}
                          style={{
                            flexDirection: 'row',
                            borderBottomWidth: 1,
                            borderBottomColor: isDarkMode ? '#1f2937' : '#e5e7eb',
                            backgroundColor: selectedJobOrder?.id === jobOrder.id 
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
                              <Text 
                                style={{ color: isDarkMode ? '#ffffff' : '#111827' }}
                                numberOfLines={1}
                              >
                                {renderCellValue(jobOrder, column.key)}
                              </Text>
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
                          {jobOrders.length > 0
                            ? 'No job orders found matching your filters'
                            : 'No job orders found. Create your first job order.'}
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

      {selectedJobOrder && (
        <View style={{ flexShrink: 0, overflow: 'hidden' }}>
          <JobOrderDetails 
            jobOrder={selectedJobOrder}
            onClose={() => setSelectedJobOrder(null)}
            onRefresh={fetchData}
            isMobile={false}
          />
        </View>
      )}

      <Modal
        visible={dropdownOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDropdownOpen(false)}
      >
        <Pressable 
          style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' }}
          onPress={() => setDropdownOpen(false)}
        >
          <View style={{
            backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
            borderWidth: 1,
            borderColor: isDarkMode ? '#374151' : '#d1d5db',
            borderRadius: 4,
            width: 144
          }}>
            <Pressable
              onPress={() => {
                setDisplayMode('card');
                setDropdownOpen(false);
              }}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8
              }}
            >
              <Text style={{
                fontSize: 14,
                color: displayMode === 'card' 
                  ? (colorPalette?.primary || '#f97316')
                  : (isDarkMode ? '#ffffff' : '#111827')
              }}>
                Card View
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setDisplayMode('table');
                setDropdownOpen(false);
              }}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8
              }}
            >
              <Text style={{
                fontSize: 14,
                color: displayMode === 'table' 
                  ? (colorPalette?.primary || '#f97316')
                  : (isDarkMode ? '#ffffff' : '#111827')
              }}>
                Table View
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <JobOrderFunnelFilter
        isOpen={isFunnelFilterOpen}
        onClose={() => setIsFunnelFilterOpen(false)}
        onApplyFilters={async (filters) => {
          console.log('Applied filters:', filters);
          setActiveFilters(filters);
          await AsyncStorage.setItem('jobOrderFilters', JSON.stringify(filters));
          setIsFunnelFilterOpen(false);
        }}
        currentFilters={activeFilters}
      />
    </View>
  );
};

export default JobOrderPage;
