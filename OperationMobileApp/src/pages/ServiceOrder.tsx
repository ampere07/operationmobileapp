import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FileText, Search, Circle, X, ListFilter, ArrowUp, ArrowDown, Menu, Filter, RefreshCw } from 'lucide-react';
import ServiceOrderDetails from '../components/ServiceOrderDetails';
import ServiceOrderFunnelFilter from '../components/filters/ServiceOrderFunnelFilter';
import { getServiceOrders, ServiceOrderData } from '../services/serviceOrderService';
import { getCities, City } from '../services/cityService';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';

interface ServiceOrder {
  id: string;
  ticketId: string;
  timestamp: string;
  accountNumber: string;
  fullName: string;
  contactAddress: string;
  dateInstalled: string;
  contactNumber: string;
  fullAddress: string;
  houseFrontPicture: string;
  emailAddress: string;
  plan: string;
  provider: string;
  affiliate: string;
  username: string;
  connectionType: string;
  routerModemSN: string;
  lcp: string;
  nap: string;
  port: string;
  vlan: string;
  concern: string;
  concernRemarks: string;
  visitStatus: string;
  visitBy: string;
  visitWith: string;
  visitWithOther: string;
  visitRemarks: string;
  modifiedBy: string;
  modifiedDate: string;
  userEmail: string;
  requestedBy: string;
  assignedEmail: string;
  supportRemarks: string;
  serviceCharge: string;
  repairCategory?: string;
  supportStatus?: string;
  priorityLevel?: string;
  newRouterSn?: string;
  newLcpnap?: string;
  newPlan?: string;
  clientSignatureUrl?: string;
  image1Url?: string;
  image2Url?: string;
  image3Url?: string;
  rawUpdatedAt?: string; // Added for filtering
}

interface LocationItem {
  id: string;
  name: string;
  count: number;
}

type DisplayMode = 'card' | 'table';
type MobileView = 'locations' | 'orders' | 'details';

const allColumns = [
  { key: 'timestamp', label: 'Timestamp', width: 'min-w-40' },
  { key: 'fullName', label: 'Full Name', width: 'min-w-40' },
  { key: 'contactNumber', label: 'Contact Number', width: 'min-w-36' },
  { key: 'fullAddress', label: 'Full Address', width: 'min-w-56' },
  { key: 'concern', label: 'Concern', width: 'min-w-36' },
  { key: 'concernRemarks', label: 'Concern Remarks', width: 'min-w-48' },
  { key: 'requestedBy', label: 'Requested By', width: 'min-w-36' },
  { key: 'supportStatus', label: 'Support Status', width: 'min-w-32' },
  { key: 'assignedEmail', label: 'Assigned Email', width: 'min-w-48' },
  { key: 'repairCategory', label: 'Repair Category', width: 'min-w-36' },
  { key: 'visitStatus', label: 'Visit Status', width: 'min-w-32' },
  { key: 'modifiedBy', label: 'Modified By', width: 'min-w-32' },
  { key: 'modifiedDate', label: 'Modified Date', width: 'min-w-40' }
];

const ServiceOrder: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedServiceOrder, setSelectedServiceOrder] = useState<ServiceOrder | null>(null);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
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
    const saved = localStorage.getItem('serviceOrderFilters');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        console.error('Failed to load filters:', err);
      }
    }
    return {};
  });

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

  useEffect(() => {
    const authData = localStorage.getItem('authData');
    if (authData) {
      try {
        const userData = JSON.parse(authData);
        setUserRole(userData.role || '');
        setUserEmail(userData.email || '');
      } catch (error) {
        console.error('Error parsing auth data:', error);
      }
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        console.log('Fetching cities...');
        const citiesData = await getCities();
        setCities(citiesData || []);

        console.log('Fetching service orders from service_orders table...');
        const authData = localStorage.getItem('authData');
        let assignedEmail: string | undefined;

        if (authData) {
          try {
            const userData = JSON.parse(authData);
            if (userData.role && userData.role.toLowerCase() === 'technician' && userData.email) {
              assignedEmail = userData.email;
              console.log('Filtering service orders for technician:', assignedEmail);
            }
          } catch (error) {
            console.error('Error parsing auth data:', error);
          }
        }

        const response = await getServiceOrders(assignedEmail);
        console.log('Service Orders API Response:', response);

        if (response.success && Array.isArray(response.data)) {
          console.log(`Found ${response.data.length} service orders`);

          const processedOrders: ServiceOrder[] = response.data.map((order: ServiceOrderData) => ({
            id: order.id || '',
            ticketId: order.ticket_id || order.id || '',
            timestamp: formatDate(order.timestamp),
            accountNumber: order.account_no || '',
            fullName: order.full_name || '',
            contactAddress: order.contact_address || '',
            dateInstalled: order.date_installed || '',
            contactNumber: order.contact_number || '',
            fullAddress: order.full_address || '',
            houseFrontPicture: order.house_front_picture_url || '',
            emailAddress: order.email_address || '',
            plan: order.plan || '',
            provider: '',
            affiliate: order.group_name || '',
            username: order.username || '',
            connectionType: order.connection_type || '',
            routerModemSN: order.router_modem_sn || '',
            lcp: order.lcp || '',
            nap: order.nap || '',
            port: order.port || '',
            vlan: order.vlan || '',
            concern: order.concern || '',
            concernRemarks: order.concern_remarks || '',
            visitStatus: order.visit_status || '',
            visitBy: order.visit_by_user || '',
            visitWith: order.visit_with || '',
            visitWithOther: '',
            visitRemarks: order.visit_remarks || '',
            modifiedBy: order.updated_by_user || '',
            modifiedDate: formatDate(order.updated_at),
            userEmail: order.assigned_email || '',
            requestedBy: order.requested_by || '',
            assignedEmail: order.assigned_email || '',
            supportRemarks: order.support_remarks || '',
            serviceCharge: order.service_charge ? `₱${order.service_charge}` : '₱0.00',
            repairCategory: order.repair_category || '',
            supportStatus: order.support_status || '',
            priorityLevel: order.priority_level || '',
            newRouterSn: order.new_router_sn || '',
            newLcpnap: order.new_lcpnap || '',
            newPlan: order.new_plan || '',
            clientSignatureUrl: order.client_signature_url || '',
            image1Url: order.image1_url || '',
            image2Url: order.image2_url || '',
            image3Url: order.image3_url || '',
            rawUpdatedAt: order.updated_at || '' // Capture raw date
          }));

          setServiceOrders(processedOrders);
          console.log('Service orders data processed successfully');
        } else {
          console.warn('No service orders returned from API or invalid response format', response);
          setServiceOrders([]);

          if (response.table) {
            console.info(`Table name specified in response: ${response.table}`);
          }

          if (response.message) {
            if (response.message.includes('SQLSTATE') || response.message.includes('table')) {
              const formattedMessage = `Database error: ${response.message}`;
              setError(formattedMessage);
              console.error(formattedMessage);
            } else {
              setError(response.message);
            }
          }
        }
      } catch (err: any) {
        console.error('Error fetching data:', err);
        setError(`Failed to load data: ${err.message || 'Unknown error'}`);
        setServiceOrders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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

  // Helper function to apply funnel filters
  const applyFunnelFilters = (orders: ServiceOrder[], filters: any): ServiceOrder[] => {
    if (!filters || Object.keys(filters).length === 0) return orders;

    return orders.filter(order => {
      return Object.entries(filters).every(([key, filter]: [string, any]) => {
        const orderValue = (order as any)[key];

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

  const filteredServiceOrders = useMemo(() => {
    // Robust detection for Technician role (Role ID 2 or role name 'technician')
    const numericRoleId = Number(userRole); // Using userRole from state which was populated from authData
    let userRoleString = '';

    // Double check authData directly for robustness similar to ApplicationVisit.tsx
    try {
      const authData = localStorage.getItem('authData');
      if (authData) {
        const parsed = JSON.parse(authData);
        userRoleString = (parsed.role || '').toLowerCase();
      }
    } catch (e) { }

    const isTechnician = numericRoleId === 2 || userRoleString === 'technician';

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

      return matchesLocation && matchesSearch;
    });

    // Apply funnel filters
    filtered = applyFunnelFilters(filtered, activeFilters);

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
          case 'supportStatus':
            aValue = a.supportStatus || '';
            bValue = b.supportStatus || '';
            break;
          case 'assignedEmail':
            aValue = a.assignedEmail || '';
            bValue = b.assignedEmail || '';
            break;
          case 'repairCategory':
            aValue = a.repairCategory || '';
            bValue = b.repairCategory || '';
            break;
          case 'visitStatus':
            aValue = a.visitStatus || '';
            bValue = b.visitStatus || '';
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
  }, [serviceOrders, selectedLocation, searchQuery, sortColumn, sortDirection, activeFilters]);

  const StatusText = ({ status, type }: { status?: string, type: 'support' | 'visit' }) => {
    if (!status) return <span className="text-gray-400">Unknown</span>;

    let textColor = '';

    if (type === 'support') {
      switch (status.toLowerCase()) {
        case 'resolved':
        case 'completed':
          textColor = 'text-green-400';
          break;
        case 'in-progress':
        case 'in progress':
          textColor = 'text-blue-400';
          break;
        case 'pending':
          textColor = 'text-orange-400';
          break;
        case 'closed':
        case 'cancelled':
          textColor = 'text-gray-400';
          break;
        default:
          textColor = 'text-gray-400';
      }
    } else {
      switch (status.toLowerCase()) {
        case 'completed':
          textColor = 'text-green-400';
          break;
        case 'scheduled':
        case 'reschedule':
        case 'in progress':
          textColor = 'text-blue-400';
          break;
        case 'pending':
          textColor = 'text-orange-400';
          break;
        case 'cancelled':
        case 'failed':
          textColor = 'text-red-500';
          break;
        default:
          textColor = 'text-gray-400';
      }
    }

    return (
      <span className={`${textColor} font-bold uppercase`}>
        {status === 'in-progress' ? 'In Progress' : status}
      </span>
    );
  };

  const handleRowClick = (serviceOrder: ServiceOrder) => {
    setSelectedServiceOrder(serviceOrder);
    if (window.innerWidth < 768) {
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

  const handleRefresh = async () => {
    try {
      setLoading(true);
      const authData = localStorage.getItem('authData');
      let assignedEmail: string | undefined;

      if (authData) {
        try {
          const userData = JSON.parse(authData);
          if (userData.role && userData.role.toLowerCase() === 'technician' && userData.email) {
            assignedEmail = userData.email;
          }
        } catch (error) {
          console.error('Error parsing auth data:', error);
        }
      }

      const response = await getServiceOrders(assignedEmail);

      if (response.success && Array.isArray(response.data)) {
        const processedOrders: ServiceOrder[] = response.data.map((order: ServiceOrderData) => ({
          id: order.id || '',
          ticketId: order.ticket_id || order.id || '',
          timestamp: formatDate(order.timestamp),
          accountNumber: order.account_no || '',
          fullName: order.full_name || '',
          contactAddress: order.contact_address || '',
          dateInstalled: order.date_installed || '',
          contactNumber: order.contact_number || '',
          fullAddress: order.full_address || '',
          houseFrontPicture: order.house_front_picture_url || '',
          emailAddress: order.email_address || '',
          plan: order.plan || '',
          provider: '',
          affiliate: order.group_name || '',
          username: order.username || '',
          connectionType: order.connection_type || '',
          routerModemSN: order.router_modem_sn || '',
          lcp: order.lcp || '',
          nap: order.nap || '',
          port: order.port || '',
          vlan: order.vlan || '',
          concern: order.concern || '',
          concernRemarks: order.concern_remarks || '',
          visitStatus: order.visit_status || '',
          visitBy: order.visit_by_user || '',
          visitWith: order.visit_with || '',
          visitWithOther: '',
          visitRemarks: order.visit_remarks || '',
          modifiedBy: order.updated_by_user || '',
          modifiedDate: formatDate(order.updated_at),
          userEmail: order.assigned_email || '',
          requestedBy: order.requested_by || '',
          assignedEmail: order.assigned_email || '',
          supportRemarks: order.support_remarks || '',
          serviceCharge: order.service_charge ? `₱${order.service_charge}` : '₱0.00',
          repairCategory: order.repair_category || '',
          supportStatus: order.support_status || ''
        }));

        setServiceOrders(processedOrders);
        setError(null);
      }
    } catch (err: any) {
      console.error('Failed to refresh service orders:', err);
      setError('Failed to refresh service orders. Please try again.');
    } finally {
      setLoading(false);
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
      case 'fullName':
        return serviceOrder.fullName;
      case 'contactNumber':
        return serviceOrder.contactNumber;
      case 'fullAddress':
        return <span title={serviceOrder.fullAddress}>{serviceOrder.fullAddress}</span>;
      case 'concern':
        return serviceOrder.concern;
      case 'concernRemarks':
        return serviceOrder.concernRemarks || '-';
      case 'requestedBy':
        return serviceOrder.requestedBy || '-';
      case 'supportStatus':
        return <StatusText status={serviceOrder.supportStatus} type="support" />;
      case 'assignedEmail':
        return serviceOrder.assignedEmail || '-';
      case 'repairCategory':
        return serviceOrder.repairCategory || '-';
      case 'visitStatus':
        return <StatusText status={serviceOrder.visitStatus} type="visit" />;
      case 'modifiedBy':
        return serviceOrder.modifiedBy || '-';
      case 'modifiedDate':
        return serviceOrder.modifiedDate;
      default:
        return '-';
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-full ${isDarkMode ? 'bg-gray-950' : 'bg-gray-50'
        }`}>
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-orange-500 mb-3"></div>
          <p className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
            Loading service orders...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center h-full ${isDarkMode ? 'bg-gray-950' : 'bg-gray-50'
        }`}>
        <div className={`border rounded-md p-6 max-w-lg ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
          }`}>
          <h3 className="text-red-500 text-lg font-medium mb-2">Error</h3>
          <p className={`mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>{error}</p>
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
    <div className={`${isDarkMode ? 'bg-gray-950' : 'bg-gray-50'
      } h-full flex flex-col md:flex-row overflow-hidden`}>
      {/* Desktop Sidebar - Hidden on mobile */}
      {userRole.toLowerCase() !== 'technician' && (
        <div className={`hidden md:flex border-r flex-shrink-0 flex-col relative ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
          }`} style={{ width: `${sidebarWidth}px` }}>
          <div className={`p-4 border-b flex-shrink-0 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
            <div className="flex items-center mb-1">
              <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>Service Orders</h2>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {locationItems.map((location) => (
              <button
                key={location.id}
                onClick={() => setSelectedLocation(location.id)}
                className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
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

          <div
            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-orange-500 transition-colors z-10"
            onMouseDown={handleMouseDownSidebarResize}
          />
        </div>
      )}

      {/* Mobile Location View */}
      {mobileView === 'locations' && (
        <div className={`md:hidden flex-1 flex flex-col overflow-hidden ${isDarkMode ? 'bg-gray-950' : 'bg-gray-50'
          }`}>
          <div className={`p-4 border-b ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
            }`}>
            <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>Service Orders</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {locationItems.map((location) => (
              <button
                key={location.id}
                onClick={() => handleLocationSelect(location.id)}
                className={`w-full flex items-center justify-between px-4 py-4 text-sm transition-colors border-b ${isDarkMode
                  ? 'hover:bg-gray-800 border-gray-800 text-gray-300'
                  : 'hover:bg-gray-100 border-gray-200 text-gray-700'
                  }`}
              >
                <div className="flex items-center">
                  <FileText className="h-5 w-5 mr-3" />
                  <span className="capitalize text-base">{location.name}</span>
                </div>
                {location.count > 0 && (
                  <span className={`px-3 py-1 rounded-full text-sm ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
                    }`}>
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
          <div className={`absolute inset-y-0 left-0 w-64 shadow-xl flex flex-col ${isDarkMode ? 'bg-gray-900' : 'bg-white'
            }`}>
            <div className={`p-4 border-b flex items-center justify-between ${isDarkMode ? 'border-gray-700' : 'border-gray-200'
              }`}>
              <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>Filters</h2>
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
                  className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-gray-800 ${selectedLocation === location.id
                    ? 'bg-orange-500 bg-opacity-20 text-orange-400'
                    : 'text-gray-300'
                    }`}
                >
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    <span className="capitalize">{location.name}</span>
                  </div>
                  {location.count > 0 && (
                    <span className={`px-2 py-1 rounded-full text-xs ${selectedLocation === location.id
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-700 text-gray-300'
                      }`}>
                      {location.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={`overflow-hidden flex-1 flex flex-col ${isDarkMode ? 'bg-gray-900' : 'bg-white'
        } ${mobileView === 'locations' || mobileView === 'details' ? 'hidden md:flex' : ''}`}>
        <div className="flex flex-col h-full">
          <div className={`p-4 border-b flex-shrink-0 ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
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
                  placeholder="Search service orders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full rounded pl-10 pr-4 py-2 border focus:outline-none ${isDarkMode
                    ? 'bg-gray-800 text-white border-gray-700'
                    : 'bg-gray-100 text-gray-900 border-gray-300'
                    }`}
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
                <Search className={`absolute left-3 top-2.5 h-4 w-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`} />
              </div>
              <div className="hidden md:flex space-x-2">
                <button
                  onClick={() => setIsFunnelFilterOpen(true)}
                  className={`px-4 py-2 rounded text-sm transition-colors flex items-center ${isDarkMode
                    ? 'hover:bg-gray-700 text-white'
                    : 'hover:bg-gray-200 text-gray-900'
                    }`}
                >
                  <Filter className="h-5 w-5" />
                </button>
                {displayMode === 'table' && (
                  <div className="relative" ref={filterDropdownRef}>
                    <button
                      className={`px-4 py-2 rounded text-sm transition-colors flex items-center ${isDarkMode
                        ? 'hover:bg-gray-800 text-white'
                        : 'hover:bg-gray-100 text-gray-900'
                        }`}
                      onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
                    >
                      <ListFilter className="h-5 w-5" />
                    </button>
                    {filterDropdownOpen && (
                      <div className={`absolute top-full right-0 mt-2 w-80 border rounded shadow-lg z-50 max-h-96 flex flex-col ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
                        }`}>
                        <div className={`p-3 border-b flex items-center justify-between ${isDarkMode ? 'border-gray-700' : 'border-gray-200'
                          }`}>
                          <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'
                            }`}>Column Visibility</span>
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
                              className={`flex items-center px-4 py-2 cursor-pointer text-sm ${isDarkMode
                                ? 'hover:bg-gray-700 text-white'
                                : 'hover:bg-gray-100 text-gray-900'
                                }`}
                            >
                              <input
                                type="checkbox"
                                checked={visibleColumns.includes(column.key)}
                                onChange={() => handleToggleColumn(column.key)}
                                className={`mr-3 h-4 w-4 rounded text-orange-600 focus:ring-orange-500 ${isDarkMode
                                  ? 'border-gray-600 bg-gray-700 focus:ring-offset-gray-800'
                                  : 'border-gray-300 bg-white focus:ring-offset-white'
                                  }`}
                              />
                              <span>{column.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div className="relative z-50" ref={dropdownRef}>
                  <button
                    className={`px-4 py-2 rounded text-sm transition-colors flex items-center ${isDarkMode
                      ? 'hover:bg-gray-800 text-white'
                      : 'hover:bg-gray-100 text-gray-900'
                      }`}
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                  >
                    <span>{displayMode === 'card' ? 'Card View' : 'Table View'}</span>
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {dropdownOpen && (
                    <div className={`fixed right-auto mt-1 w-36 border rounded shadow-lg ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
                      }`}>
                      <button
                        onClick={() => {
                          setDisplayMode('card');
                          setDropdownOpen(false);
                        }}
                        className={`block w-full text-left px-4 py-2 text-sm transition-colors ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                          }`}
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
                        className={`block w-full text-left px-4 py-2 text-sm transition-colors ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                          }`}
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
                  disabled={loading}
                  className="text-white px-3 py-2 rounded text-sm flex items-center transition-colors disabled:bg-gray-600"
                  style={{
                    backgroundColor: loading ? '#4b5563' : (colorPalette?.primary || '#ea580c')
                  }}
                  onMouseEnter={(e) => {
                    if (!loading && colorPalette?.accent) {
                      e.currentTarget.style.backgroundColor = colorPalette.accent;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!loading && colorPalette?.primary) {
                      e.currentTarget.style.backgroundColor = colorPalette.primary;
                    }
                  }}
                >
                  <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto">
              {loading ? (
                <div className="px-4 py-12 text-center text-gray-400">
                  <div className="animate-pulse flex flex-col items-center">
                    <div className="h-4 w-1/3 bg-gray-700 rounded mb-4"></div>
                    <div className="h-4 w-1/2 bg-gray-700 rounded"></div>
                  </div>
                  <p className="mt-4">Loading service orders...</p>
                </div>
              ) : error ? (
                <div className="px-4 py-12 text-center text-red-400">
                  <p>{error}</p>
                  <button
                    onClick={handleRefresh}
                    className="mt-4 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded">
                    Retry
                  </button>
                </div>
              ) : displayMode === 'card' ? (
                filteredServiceOrders.length > 0 ? (
                  <div className="space-y-0">
                    {filteredServiceOrders.map((serviceOrder) => (
                      <div
                        key={serviceOrder.id}
                        onClick={() => window.innerWidth < 768 ? handleMobileRowClick(serviceOrder) : handleRowClick(serviceOrder)}
                        className={`px-4 py-3 cursor-pointer transition-colors border-b ${isDarkMode
                          ? `hover:bg-gray-800 border-gray-800 ${selectedServiceOrder?.id === serviceOrder.id ? 'bg-gray-800' : ''}`
                          : `hover:bg-gray-100 border-gray-200 ${selectedServiceOrder?.id === serviceOrder.id ? 'bg-gray-100' : ''}`
                          }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className={`font-medium text-sm mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'
                              }`}>
                              {serviceOrder.fullName}
                            </div>
                            <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                              }`}>
                              {serviceOrder.timestamp} | {serviceOrder.fullAddress}
                            </div>
                          </div>
                          <div className="flex flex-col items-end space-y-1 ml-4 flex-shrink-0">
                            <StatusText status={serviceOrder.supportStatus} type="support" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={`text-center py-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                    No service orders found matching your filters
                  </div>
                )
              ) : (
                <div className="overflow-x-auto overflow-y-hidden">
                  <table ref={tableRef} className="w-max min-w-full text-sm border-separate border-spacing-0">
                    <thead>
                      <tr className={`border-b sticky top-0 z-10 ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-100'
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
                            className={`text-left py-3 px-3 font-normal ${column.width} whitespace-nowrap relative group cursor-move ${isDarkMode
                              ? `text-gray-400 bg-gray-800 ${index < filteredColumns.length - 1 ? 'border-r border-gray-700' : ''}`
                              : `text-gray-600 bg-gray-100 ${index < filteredColumns.length - 1 ? 'border-r border-gray-200' : ''}`
                              } ${draggedColumn === column.key ? 'opacity-50' : ''
                              } ${dragOverColumn === column.key ? 'bg-orange-500 bg-opacity-20' : ''
                              }`}
                            style={{ width: columnWidths[column.key] ? `${columnWidths[column.key]}px` : undefined }}
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
                                    <ArrowDown className="h-4 w-4 text-orange-400" />
                                  ) : (
                                    <ArrowUp className="h-4 w-4 text-gray-400 hover:text-orange-400" />
                                  )}
                                </button>
                              )}
                            </div>
                            {index < filteredColumns.length - 1 && (
                              <div
                                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-orange-500 group-hover:bg-gray-600"
                                onMouseDown={(e) => handleMouseDownResize(e, column.key)}
                              />
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredServiceOrders.length > 0 ? (
                        filteredServiceOrders.map((serviceOrder) => (
                          <tr
                            key={serviceOrder.id}
                            className={`border-b cursor-pointer transition-colors ${isDarkMode
                              ? `border-gray-800 hover:bg-gray-900 ${selectedServiceOrder?.id === serviceOrder.id ? 'bg-gray-800' : ''}`
                              : `border-gray-200 hover:bg-gray-100 ${selectedServiceOrder?.id === serviceOrder.id ? 'bg-gray-100' : ''}`
                              }`}
                            onClick={() => window.innerWidth < 768 ? handleMobileRowClick(serviceOrder) : handleRowClick(serviceOrder)}
                          >
                            {filteredColumns.map((column, index) => (
                              <td
                                key={column.key}
                                className={`py-4 px-3 ${isDarkMode
                                  ? `text-white ${index < filteredColumns.length - 1 ? 'border-r border-gray-800' : ''}`
                                  : `text-gray-900 ${index < filteredColumns.length - 1 ? 'border-r border-gray-200' : ''}`
                                  }`}
                                style={{
                                  width: columnWidths[column.key] ? `${columnWidths[column.key]}px` : undefined,
                                  maxWidth: columnWidths[column.key] ? `${columnWidths[column.key]}px` : undefined
                                }}
                              >
                                <div className="truncate">
                                  {renderCellValue(serviceOrder, column.key)}
                                </div>
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={filteredColumns.length} className={`px-4 py-12 text-center border-b ${isDarkMode ? 'text-gray-400 border-gray-800' : 'text-gray-600 border-gray-200'
                            }`}>
                            No service orders found matching your filters
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

      {selectedServiceOrder && mobileView === 'details' && (
        <div className={`md:hidden flex-1 flex flex-col overflow-hidden ${isDarkMode ? 'bg-gray-950' : 'bg-gray-50'
          }`}>
          <ServiceOrderDetails
            serviceOrder={selectedServiceOrder}
            onClose={handleMobileBack}
            isMobile={true}
          />
        </div>
      )}

      {selectedServiceOrder && mobileView !== 'details' && (
        <div className="hidden md:block flex-shrink-0 overflow-hidden">
          <ServiceOrderDetails
            serviceOrder={selectedServiceOrder}
            onClose={() => setSelectedServiceOrder(null)}
            isMobile={false}
          />
        </div>
      )}

      <ServiceOrderFunnelFilter
        isOpen={isFunnelFilterOpen}
        onClose={() => setIsFunnelFilterOpen(false)}
        onApplyFilters={(filters) => {
          console.log('Applied filters:', filters);
          setActiveFilters(filters);
          localStorage.setItem('serviceOrderFilters', JSON.stringify(filters));
          setIsFunnelFilterOpen(false);
        }}
        currentFilters={activeFilters}
      />
    </div>
  );
};

export default ServiceOrder;
