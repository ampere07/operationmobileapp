import React, { useState, useEffect, useRef } from 'react';
import { FileText, Search, ChevronDown, ListFilter, ArrowUp, ArrowDown, Menu, X, ArrowLeft, RefreshCw, Filter } from 'lucide-react';
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
  { key: 'timestamp', label: 'Timestamp', width: 'min-w-40' },
  { key: 'dateInstalled', label: 'Date Installed', width: 'min-w-36' },
  { key: 'installationFee', label: 'Installation Fee', width: 'min-w-32' },
  { key: 'billingDay', label: 'Billing Day', width: 'min-w-28' },
  { key: 'billingStatusId', label: 'Billing Status ID', width: 'min-w-32' },
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
  { key: 'onsiteStatus', label: 'Onsite Status', width: 'min-w-32' },
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
  const dropdownRef = useRef<HTMLDivElement>(null);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);
  const sidebarStartXRef = useRef<number>(0);
  const sidebarStartWidthRef = useRef<number>(0);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);
  const [activeFilters, setActiveFilters] = useState<any>(() => {
    const saved = localStorage.getItem('jobOrderFilters');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        console.error('Failed to load filters:', err);
      }
    }
    return {};
  });

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
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setFilterDropdownOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownRef, filterDropdownRef]);

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

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const theme = localStorage.getItem('theme');
      setIsDarkMode(theme !== 'light');
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    const theme = localStorage.getItem('theme');
    setIsDarkMode(theme !== 'light');

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const authData = localStorage.getItem('authData');
    if (authData) {
      try {
        const userData = JSON.parse(authData);
        setUserRole(userData.role || '');
        setUserEmail(userData.email || '');
      } catch (error) {
      }
    }
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const citiesData = await getCities();
      setCities(citiesData);
      
      const billingStatusesData = await getBillingStatuses();
      setBillingStatuses(billingStatusesData);
      
      const authData = localStorage.getItem('authData');
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
  
  // Helper function to apply funnel filters
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

  // Apply funnel filters
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
    if (!status) return <span className="text-gray-400">-</span>;
    
    let textColor = '';
    
    if (type === 'onsite') {
      switch (status.toLowerCase()) {
        case 'done':
        case 'completed':
          textColor = 'text-green-400';
          break;
        case 'reschedule':
          textColor = 'text-blue-400';
          break;
        case 'inprogress':
        case 'in progress':
          textColor = 'text-blue-400';
          break;
        case 'pending':
          textColor = 'text-orange-400';
          break;
        case 'failed':
        case 'cancelled':
          textColor = 'text-red-500';
          break;
        default:
          textColor = 'text-gray-400';
      }
    } else {
      switch (status.toLowerCase()) {
        case 'done':
        case 'active':
        case 'completed':
          textColor = 'text-green-400';
          break;
        case 'pending':
        case 'in progress':
          textColor = 'text-orange-400';
          break;
        case 'suspended':
        case 'overdue':
          textColor = 'text-red-500';
          break;
        case 'cancelled':
          textColor = 'text-red-500';
          break;
        default:
          textColor = 'text-gray-400';
      }
    }
    
    return (
      <span className={`${textColor} font-bold uppercase`}>
        {status === 'inprogress' ? 'In Progress' : status}
      </span>
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

  const handleDragStart = (e: React.DragEvent, columnKey: string) => {
    setDraggedColumn(columnKey);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, columnKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedColumn && draggedColumn !== columnKey) {
      setDragOverColumn(columnKey);
    }
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, targetColumnKey: string) => {
    e.preventDefault();
    
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

  const handleMouseDownResize = (e: React.MouseEvent, columnKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingColumn(columnKey);
    startXRef.current = e.clientX;
    
    const th = (e.target as HTMLElement).closest('th');
    if (th) {
      startWidthRef.current = th.offsetWidth;
    }
  };

  useEffect(() => {
    if (!resizingColumn) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingColumn) return;
      
      const diff = e.clientX - startXRef.current;
      const newWidth = Math.max(100, startWidthRef.current + diff);
      
      setColumnWidths(prev => ({
        ...prev,
        [resizingColumn]: newWidth
      }));
    };

    const handleMouseUp = () => {
      setResizingColumn(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingColumn]);

  useEffect(() => {
    if (!isResizingSidebar) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingSidebar) return;
      
      const diff = e.clientX - sidebarStartXRef.current;
      const newWidth = Math.max(200, Math.min(500, sidebarStartWidthRef.current + diff));
      
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizingSidebar(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingSidebar]);

  const handleMouseDownSidebarResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingSidebar(true);
    sidebarStartXRef.current = e.clientX;
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

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-full ${
        isDarkMode ? 'bg-gray-950' : 'bg-gray-50'
      }`}>
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 mb-3" style={{ borderTopColor: colorPalette?.primary || '#ea580c', borderBottomColor: colorPalette?.primary || '#ea580c' }}></div>
          <p className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
            Loading job orders...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center h-full ${
        isDarkMode ? 'bg-gray-950' : 'bg-gray-50'
      }`}>
        <div className={`${
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
        } border rounded-md p-6 max-w-lg`}>
          <h3 className="text-red-500 text-lg font-medium mb-2">Error</h3>
          <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-4`}>
            {error}
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="text-white py-2 px-4 rounded transition-colors"
            style={{
              backgroundColor: colorPalette?.primary || '#ea580c'
            }}
            onMouseEnter={(e) => {
              if (colorPalette?.accent) {
                e.currentTarget.style.backgroundColor = colorPalette.accent;
              }
            }}
            onMouseLeave={(e) => {
              if (colorPalette?.primary) {
                e.currentTarget.style.backgroundColor = colorPalette.primary;
              }
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${
      isDarkMode ? 'bg-gray-950' : 'bg-gray-50'
    } h-full flex flex-col md:flex-row overflow-hidden`}>
      {/* Mobile Location View */}
      {mobileView === 'locations' && (
        <div className={`md:hidden flex-1 flex flex-col overflow-hidden ${
          isDarkMode ? 'bg-gray-950' : 'bg-gray-50'
        }`}>
          <div className={`${
            isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
          } p-4 border-b`}>
            <h2 className={`text-lg font-semibold ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Job Orders
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {locationItems.map((location) => (
              <button
              key={location.id}
              onClick={() => handleLocationSelect(location.id)}
              className={`w-full flex items-center justify-between px-4 py-4 text-sm transition-colors border-b ${isDarkMode ? 'hover:bg-gray-800 border-gray-800' : 'hover:bg-gray-100 border-gray-200'}`}
              style={selectedLocation === location.id ? {
              backgroundColor: colorPalette?.primary ? `${colorPalette.primary}33` : 'rgba(249, 115, 22, 0.2)',
              color: colorPalette?.primary || '#fb923c'
              } : {
              color: isDarkMode ? '#d1d5db' : '#374151'
              }}
              >
                <div className="flex items-center">
                  <FileText className="h-5 w-5 mr-3" />
                  <span className="capitalize text-base">{location.name}</span>
                </div>
                {location.count > 0 && (
                  <span
                    className="px-3 py-1 rounded-full text-sm"
                    style={selectedLocation === location.id ? {
                      backgroundColor: colorPalette?.primary || '#ea580c',
                      color: 'white'
                    } : {
                      backgroundColor: isDarkMode ? '#374151' : '#e5e7eb',
                      color: isDarkMode ? '#d1d5db' : '#374151'
                    }}
                  >
                    {location.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mobile Overlay Menu */}
      {mobileMenuOpen && userRole.toLowerCase() !== 'technician' && mobileView === 'orders' && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setMobileMenuOpen(false)} />
          <div className={`absolute inset-y-0 left-0 w-64 shadow-xl flex flex-col ${
            isDarkMode ? 'bg-gray-900' : 'bg-white'
          }`}>
            <div className={`p-4 border-b flex items-center justify-between ${
              isDarkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <h2 className={`text-lg font-semibold ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Filters
              </h2>
              <button 
                onClick={() => setMobileMenuOpen(false)} 
                className={isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {locationItems.map((location) => (
                <button
                  key={location.id}
                  onClick={() => handleLocationSelect(location.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
                  style={selectedLocation === location.id ? {
                    backgroundColor: colorPalette?.primary ? `${colorPalette.primary}33` : 'rgba(249, 115, 22, 0.2)',
                    color: colorPalette?.primary || '#fb923c',
                    fontWeight: 500
                  } : {
                    color: isDarkMode ? '#d1d5db' : '#374151'
                  }}
                >
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    <span className="capitalize">{location.name}</span>
                  </div>
                  {location.count > 0 && (
                  <span
                  className="px-2 py-1 rounded-full text-xs"
                  style={selectedLocation === location.id ? {
                  backgroundColor: colorPalette?.primary || '#ea580c',
                      color: 'white'
                  } : {
                      backgroundColor: isDarkMode ? '#374151' : '#e5e7eb',
                        color: isDarkMode ? '#d1d5db' : '#374151'
                        }}
                      >
                        {location.count}
                      </span>
                    )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar - Hidden on mobile */}
      {userRole.toLowerCase() !== 'technician' && (
      <div className={`hidden md:flex border-r flex-shrink-0 flex-col relative ${
        isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
      }`} style={{ width: `${sidebarWidth}px` }}>
        <div className={`p-4 border-b flex-shrink-0 ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className="flex items-center mb-1">
            <h2 className={`text-lg font-semibold ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Job Orders
            </h2>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {locationItems.map((location) => (
            <button
              key={location.id}
              onClick={() => {
                setSelectedLocation(location.id);
              }}
              className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors ${
                isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
              }`}
              style={selectedLocation === location.id ? {
                backgroundColor: colorPalette?.primary ? `${colorPalette.primary}33` : 'rgba(249, 115, 22, 0.2)',
                color: colorPalette?.primary || '#fb923c',
                fontWeight: 500
              } : {
                color: isDarkMode ? '#d1d5db' : '#374151'
              }}
            >
              <div className="flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                <span className="capitalize">{location.name}</span>
              </div>
              {location.count > 0 && (
                <span
                  className="px-2 py-1 rounded-full text-xs"
                  style={selectedLocation === location.id ? {
                    backgroundColor: colorPalette?.primary || '#ea580c',
                    color: 'white'
                  } : {
                    backgroundColor: isDarkMode ? '#374151' : '#e5e7eb',
                    color: isDarkMode ? '#d1d5db' : '#374151'
                  }}
                >
                  {location.count}
                </span>
              )}
            </button>
          ))}
        </div>
        
        {/* Resize Handle */}
        <div
          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize transition-colors z-10"
          onMouseDown={handleMouseDownSidebarResize}
          style={{
            backgroundColor: isResizingSidebar ? (colorPalette?.primary || '#ea580c') : 'transparent'
          }}
          onMouseEnter={(e) => {
            if (!isResizingSidebar && colorPalette?.primary) {
              e.currentTarget.style.backgroundColor = colorPalette.primary;
            }
          }}
          onMouseLeave={(e) => {
            if (!isResizingSidebar) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        />
      </div>
      )}

      <div className={`${
        isDarkMode ? 'bg-gray-900' : 'bg-white'
      } overflow-hidden flex-1 flex flex-col md:pb-0 ${mobileView === 'locations' || mobileView === 'details' ? 'hidden md:flex' : ''}`}>
        <div className="flex flex-col h-full">
          <div className={`p-4 border-b flex-shrink-0 ${
            isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center space-x-3">
              {userRole.toLowerCase() !== 'technician' && mobileView === 'orders' && (
                <button
                  onClick={() => setMobileMenuOpen(true)}
                  className="md:hidden bg-gray-700 hover:bg-gray-600 text-white p-2 rounded text-sm transition-colors flex items-center justify-center"
                  aria-label="Open filter menu"
                >
                  <Menu className="h-5 w-5" />
                </button>
              )}
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search job orders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full rounded pl-10 pr-4 py-2 focus:outline-none ${isDarkMode ? 'bg-gray-800 text-white border-gray-700' : 'bg-gray-100 text-gray-900 border-gray-300'} border`}
                  onFocus={(e) => {
                    if (colorPalette?.primary) {
                      e.currentTarget.style.borderColor = colorPalette.primary;
                      e.currentTarget.style.boxShadow = `0 0 0 1px ${colorPalette.primary}`;
                    }
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = isDarkMode ? '#374151' : '#d1d5db';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
                <Search className={`absolute left-3 top-2.5 h-4 w-4 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`} />
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setIsFunnelFilterOpen(true)}
                  className={`px-4 py-2 rounded text-sm transition-colors flex items-center ${
                    isDarkMode
                      ? 'hover:bg-gray-700 text-white'
                      : 'hover:bg-gray-200 text-gray-900'
                  }`}
                >
                  <Filter className="h-5 w-5" />
                </button>
                {displayMode === 'table' && (
                  <div className="relative" ref={filterDropdownRef}>
                    <button
                      className={`px-4 py-2 rounded text-sm transition-colors flex items-center ${
                        isDarkMode
                          ? 'hover:bg-gray-800 text-white'
                          : 'hover:bg-gray-100 text-gray-900'
                      }`}
                      onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
                    >
                      <ListFilter className="h-5 w-5" />
                    </button>
                    {filterDropdownOpen && (
                      <>
                        {/* Mobile Overlay */}
                        <div className="md:hidden fixed inset-0 z-50">
                          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setFilterDropdownOpen(false)} />
                          <div className={`absolute inset-x-4 top-20 bottom-4 border rounded shadow-lg flex flex-col ${
                            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
                          }`}>
                            <div className={`p-3 border-b flex items-center justify-between ${
                              isDarkMode ? 'border-gray-700' : 'border-gray-200'
                            }`}>
                              <span className={`text-sm font-medium ${
                                isDarkMode ? 'text-white' : 'text-gray-900'
                              }`}>
                                Column Visibility
                              </span>
                              <button 
                                onClick={() => setFilterDropdownOpen(false)} 
                                className={isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}
                              >
                                <X className="h-5 w-5" />
                              </button>
                            </div>
                            <div className={`p-3 border-b flex items-center justify-between ${
                              isDarkMode ? 'border-gray-700' : 'border-gray-200'
                            }`}>
                              <button
                                onClick={handleSelectAllColumns}
                                className="text-sm px-3 py-1 rounded transition-colors"
                                style={{
                                  color: colorPalette?.primary || '#f97316',
                                  backgroundColor: isDarkMode ? '#374151' : '#e5e7eb'
                                }}
                              >
                                Select All
                              </button>
                              <button
                                onClick={handleDeselectAllColumns}
                                className="text-sm px-3 py-1 rounded transition-colors"
                                style={{
                                  color: colorPalette?.primary || '#f97316',
                                  backgroundColor: isDarkMode ? '#374151' : '#e5e7eb'
                                }}
                              >
                                Deselect All
                              </button>
                            </div>
                            <div className="overflow-y-auto flex-1">
                              {allColumns.map((column) => (
                                <label
                                  key={column.key}
                                  className={`flex items-center px-4 py-3 cursor-pointer text-sm border-b ${
                                    isDarkMode 
                                      ? 'hover:bg-gray-700 text-white border-gray-700' 
                                      : 'hover:bg-gray-100 text-gray-900 border-gray-200'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={visibleColumns.includes(column.key)}
                                    onChange={() => handleToggleColumn(column.key)}
                                    className={`mr-3 h-4 w-4 rounded text-orange-600 focus:ring-orange-500 ${
                                      isDarkMode 
                                        ? 'border-gray-600 bg-gray-700 focus:ring-offset-gray-800' 
                                        : 'border-gray-300 bg-white focus:ring-offset-white'
                                    }`}
                                  />
                                  <span>{column.label}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Desktop Dropdown */}
                        <div className={`hidden md:flex absolute top-full right-0 mt-2 w-80 border rounded shadow-lg z-50 max-h-96 flex-col ${
                          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
                        }`}>
                          <div className={`p-3 border-b flex items-center justify-between ${
                            isDarkMode ? 'border-gray-700' : 'border-gray-200'
                          }`}>
                            <span className={`text-sm font-medium ${
                              isDarkMode ? 'text-white' : 'text-gray-900'
                            }`}>
                              Column Visibility
                            </span>
                            <div className="flex space-x-2">
                              <button
                                onClick={handleSelectAllColumns}
                                className="text-xs transition-colors"
                                style={{
                                  color: colorPalette?.primary || '#f97316'
                                }}
                                onMouseEnter={(e) => {
                                  if (colorPalette?.accent) {
                                    e.currentTarget.style.color = colorPalette.accent;
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (colorPalette?.primary) {
                                    e.currentTarget.style.color = colorPalette.primary;
                                  }
                                }}
                              >
                                Select All
                              </button>
                              <span className="text-gray-600">|</span>
                              <button
                                onClick={handleDeselectAllColumns}
                                className="text-xs transition-colors"
                                style={{
                                  color: colorPalette?.primary || '#f97316'
                                }}
                                onMouseEnter={(e) => {
                                  if (colorPalette?.accent) {
                                    e.currentTarget.style.color = colorPalette.accent;
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (colorPalette?.primary) {
                                    e.currentTarget.style.color = colorPalette.primary;
                                  }
                                }}
                              >
                                Deselect All
                              </button>
                            </div>
                          </div>
                          <div className="overflow-y-auto flex-1">
                            {allColumns.map((column) => (
                              <label
                                key={column.key}
                                className={`flex items-center px-4 py-2 cursor-pointer text-sm ${
                                  isDarkMode 
                                    ? 'hover:bg-gray-700 text-white' 
                                    : 'hover:bg-gray-100 text-gray-900'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={visibleColumns.includes(column.key)}
                                  onChange={() => handleToggleColumn(column.key)}
                                  className="mr-3 h-4 w-4 rounded border-gray-600 bg-gray-700 text-orange-600 focus:ring-orange-500 focus:ring-offset-gray-800"
                                />
                                <span>{column.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
                <div className="relative" ref={dropdownRef}>
                  <button
                    className={`px-4 py-2 rounded text-sm transition-colors flex items-center ${
                      isDarkMode 
                        ? 'hover:bg-gray-800 text-white' 
                        : 'hover:bg-gray-100 text-gray-900'
                    }`}
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                  >
                    <span>{displayMode === 'card' ? 'Card View' : 'Table View'}</span>
                    <ChevronDown className="w-4 h-4 ml-1" />
                  </button>
                  {dropdownOpen && (
                    <div className={`absolute top-full right-0 mt-1 w-36 border rounded shadow-lg z-50 ${
                      isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
                    }`}>
                      <button
                        onClick={() => {
                          setDisplayMode('card');
                          setDropdownOpen(false);
                        }}
                        className={`block w-full text-left px-4 py-2 text-sm transition-colors ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                        style={displayMode === 'card' ? {
                          color: colorPalette?.primary || '#f97316'
                        } : {
                          color: isDarkMode ? '#ffffff' : '#111827'
                        }}
                      >
                        Card View
                      </button>
                      <button
                        onClick={() => {
                          setDisplayMode('table');
                          setDropdownOpen(false);
                        }}
                        className={`block w-full text-left px-4 py-2 text-sm transition-colors ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                        style={displayMode === 'table' ? {
                          color: colorPalette?.primary || '#f97316'
                        } : {
                          color: isDarkMode ? '#ffffff' : '#111827'
                        }}
                      >
                        Table View
                      </button>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="text-white px-3 py-2 rounded text-sm flex items-center transition-colors disabled:bg-gray-600"
                  style={{
                    backgroundColor: isRefreshing ? '#4b5563' : (colorPalette?.primary || '#ea580c')
                  }}
                  onMouseEnter={(e) => {
                    if (!isRefreshing && colorPalette?.accent) {
                      e.currentTarget.style.backgroundColor = colorPalette.accent;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isRefreshing && colorPalette?.primary) {
                      e.currentTarget.style.backgroundColor = colorPalette.primary;
                    }
                  }}
                  aria-label="Refresh"
                >
                  <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto">
              {displayMode === 'card' ? (
                sortedJobOrders.length > 0 ? (
                  <div className="space-y-0">
                    {sortedJobOrders.map((jobOrder) => (
                      <div
                        key={jobOrder.id}
                        onClick={() => window.innerWidth < 768 ? handleMobileRowClick(jobOrder) : handleRowClick(jobOrder)}
                        className={`px-4 py-3 cursor-pointer transition-colors border-b ${
                          isDarkMode 
                            ? `hover:bg-gray-800 border-gray-800 ${selectedJobOrder?.id === jobOrder.id ? 'bg-gray-800' : ''}` 
                            : `hover:bg-gray-100 border-gray-200 ${selectedJobOrder?.id === jobOrder.id ? 'bg-gray-100' : ''}`
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className={`font-medium text-sm mb-1 ${
                              isDarkMode ? 'text-white' : 'text-gray-900'
                            }`}>
                              {getClientFullName(jobOrder)}
                            </div>
                            <div className={`text-xs ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              {formatDate(jobOrder.Timestamp || jobOrder.timestamp)} | {getClientFullAddress(jobOrder)}
                            </div>
                          </div>
                          <div className="flex flex-col items-end space-y-1 ml-4 flex-shrink-0">
                            <StatusText status={jobOrder.Onsite_Status || jobOrder.onsite_status} type="onsite" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={`text-center py-12 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    No job orders found matching your filters
                  </div>
                )
              ) : (
                <div className="overflow-x-auto overflow-y-hidden">
                  <table ref={tableRef} className="w-max min-w-full text-sm border-separate border-spacing-0">
                    <thead>
                      <tr className={`border-b sticky top-0 z-10 ${
                        isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-100'
                      }`}>
                        {filteredColumns.map((column, index) => (
                          <th
                            key={column.key}
                            draggable
                            onDragStart={(e) => handleDragStart(e, column.key)}
                            onDragOver={(e) => handleDragOver(e, column.key)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, column.key)}
                            onDragEnd={handleDragEnd}
                            className={`text-left py-3 px-3 font-normal ${column.width} whitespace-nowrap relative group cursor-move ${
                              isDarkMode 
                                ? `text-gray-400 bg-gray-800 ${index < filteredColumns.length - 1 ? 'border-r border-gray-700' : ''}` 
                                : `text-gray-600 bg-gray-100 ${index < filteredColumns.length - 1 ? 'border-r border-gray-200' : ''}`
                            } ${
                              draggedColumn === column.key ? 'opacity-50' : ''
                            } ${
                              dragOverColumn === column.key ? '' : ''
                            }`}
                            style={{
                              width: columnWidths[column.key] ? `${columnWidths[column.key]}px` : undefined,
                              ...(dragOverColumn === column.key ? {
                                backgroundColor: colorPalette?.primary ? `${colorPalette.primary}33` : 'rgba(249, 115, 22, 0.2)'
                              } : {})
                            }}
                            onMouseEnter={() => setHoveredColumn(column.key)}
                            onMouseLeave={() => setHoveredColumn(null)}
                          >
                            <div className="flex items-center justify-between">
                              <span>{column.label}</span>
                              {(hoveredColumn === column.key || sortColumn === column.key) && (
                                <button
                                  onClick={() => handleSort(column.key)}
                                  className="ml-2 transition-colors"
                                >
                                  {sortColumn === column.key && sortDirection === 'desc' ? (
                                    <ArrowDown
                                      className="h-4 w-4"
                                      style={{
                                        color: colorPalette?.primary || '#fb923c'
                                      }}
                                    />
                                  ) : (
                                    <ArrowUp
                                      className="h-4 w-4 text-gray-400 transition-colors"
                                      style={{
                                        color: hoveredColumn === column.key ? (colorPalette?.primary || '#fb923c') : undefined
                                      }}
                                    />
                                  )}
                                </button>
                              )}
                            </div>
                            {index < filteredColumns.length - 1 && (
                              <div
                                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize group-hover:bg-gray-600"
                                style={{
                                  backgroundColor: hoveredColumn === column.key ? (colorPalette?.primary || '#f97316') : undefined
                                }}
                                onMouseDown={(e) => handleMouseDownResize(e, column.key)}
                              />
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedJobOrders.length > 0 ? (
                        sortedJobOrders.map((jobOrder) => (
                          <tr 
                            key={jobOrder.id} 
                            className={`border-b cursor-pointer transition-colors ${
                              isDarkMode 
                                ? `border-gray-800 hover:bg-gray-900 ${selectedJobOrder?.id === jobOrder.id ? 'bg-gray-800' : ''}` 
                                : `border-gray-200 hover:bg-gray-100 ${selectedJobOrder?.id === jobOrder.id ? 'bg-gray-100' : ''}`
                            }`}
                            onClick={() => window.innerWidth < 768 ? handleMobileRowClick(jobOrder) : handleRowClick(jobOrder)}
                          >
                            {filteredColumns.map((column, index) => (
                              <td 
                                key={column.key}
                                className={`py-4 px-3 ${
                                  isDarkMode 
                                    ? `text-white ${index < filteredColumns.length - 1 ? 'border-r border-gray-800' : ''}` 
                                    : `text-gray-900 ${index < filteredColumns.length - 1 ? 'border-r border-gray-200' : ''}`
                                }`}
                                style={{ 
                                  width: columnWidths[column.key] ? `${columnWidths[column.key]}px` : undefined,
                                  maxWidth: columnWidths[column.key] ? `${columnWidths[column.key]}px` : undefined
                                }}
                              >
                                <div className="truncate" title={renderCellValue(jobOrder, column.key)}>
                                  {renderCellValue(jobOrder, column.key)}
                                </div>
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={filteredColumns.length} className={`px-4 py-12 text-center border-b ${
                            isDarkMode ? 'text-gray-400 border-gray-800' : 'text-gray-600 border-gray-200'
                          }`}>
                            {jobOrders.length > 0
                              ? 'No job orders found matching your filters'
                              : 'No job orders found. Create your first job order.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedJobOrder && mobileView === 'details' && (
        <div className={`md:hidden flex-1 flex flex-col overflow-hidden ${
          isDarkMode ? 'bg-gray-950' : 'bg-gray-50'
        }`}>
          <JobOrderDetails 
            jobOrder={selectedJobOrder}
            onClose={handleMobileBack}
            onRefresh={fetchData}
            isMobile={true}
          />
        </div>
      )}

      {selectedJobOrder && mobileView !== 'details' && (
        <div className="hidden md:block flex-shrink-0 overflow-hidden">
          <JobOrderDetails 
            jobOrder={selectedJobOrder}
            onClose={() => setSelectedJobOrder(null)}
            onRefresh={fetchData}
            isMobile={false}
          />
        </div>
      )}

      <JobOrderFunnelFilter
        isOpen={isFunnelFilterOpen}
        onClose={() => setIsFunnelFilterOpen(false)}
        onApplyFilters={(filters) => {
          console.log('Applied filters:', filters);
          setActiveFilters(filters);
          localStorage.setItem('jobOrderFilters', JSON.stringify(filters));
          setIsFunnelFilterOpen(false);
        }}
        currentFilters={activeFilters}
      />
    </div>
  );
};

export default JobOrderPage;
