import React, { useState, useEffect, useRef, useMemo } from 'react';
import { CreditCard, Search, Circle, X, ListFilter, ArrowUp, ArrowDown, RefreshCw, Filter } from 'lucide-react';
import BillingDetails from '../components/CustomerDetails';
import { getBillingRecords, BillingRecord } from '../services/billingService';
import { getCustomerDetail, CustomerDetailData } from '../services/customerDetailService';
import { BillingDetailRecord } from '../types/billing';
import { getCities, City } from '../services/cityService';
import { getRegions, Region } from '../services/regionService';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';
import CustomerFunnelFilter from '../filter/CustomerFunnelFilter';
import { useBillingContext } from '../contexts/BillingContext';

const convertCustomerDataToBillingDetail = (customerData: CustomerDetailData): BillingDetailRecord => {
  return {
    id: customerData.billingAccount?.accountNo || '',
    applicationId: customerData.billingAccount?.accountNo || '',
    customerName: customerData.fullName,
    address: customerData.address,
    status: customerData.billingAccount?.billingStatusId === 2 ? 'Active' : 'Inactive',
    balance: customerData.billingAccount?.accountBalance || 0,
    onlineStatus: customerData.onlineSessionStatus || (customerData.billingAccount?.billingStatusId === 2 ? 'Online' : 'Offline'),
    cityId: null,
    regionId: null,
    timestamp: customerData.updatedAt || '',
    billingStatus: customerData.billingAccount?.billingStatusName || (customerData.billingAccount?.billingStatusId ? `Status ${customerData.billingAccount.billingStatusId}` : ''),
    dateInstalled: customerData.billingAccount?.dateInstalled || '',
    contactNumber: customerData.contactNumberPrimary,
    secondContactNumber: customerData.contactNumberSecondary || '',
    emailAddress: customerData.emailAddress || '',
    plan: customerData.desiredPlan || '',
    username: customerData.technicalDetails?.username || '',
    connectionType: customerData.technicalDetails?.connectionType || '',
    routerModel: customerData.technicalDetails?.routerModel || '',
    routerModemSN: customerData.technicalDetails?.routerModemSn || '',
    lcpnap: customerData.technicalDetails?.lcpnap || '',
    port: customerData.technicalDetails?.port || '',
    vlan: customerData.technicalDetails?.vlan || '',
    billingDay: customerData.billingAccount?.billingDay || 0,
    totalPaid: 0,
    provider: '',
    lcp: customerData.technicalDetails?.lcp || '',
    nap: customerData.technicalDetails?.nap || '',
    modifiedBy: '',
    modifiedDate: customerData.updatedAt || '',
    barangay: customerData.barangay || '',
    city: customerData.city || '',
    region: customerData.region || '',

    usageType: customerData.technicalDetails?.usageTypeId ? `Type ${customerData.technicalDetails.usageTypeId}` : '',
    referredBy: customerData.referredBy || '',
    referralContactNo: '',
    groupName: customerData.groupName || '',
    mikrotikId: '',
    sessionIp: customerData.technicalDetails?.ipAddress || '',
    houseFrontPicture: customerData.houseFrontPictureUrl || '',
    accountBalance: customerData.billingAccount?.accountBalance || 0,
    housingStatus: customerData.housingStatus || '',
    location: customerData.location || '',
    addressCoordinates: customerData.addressCoordinates || '',
  };
};

interface LocationItem {
  id: string;
  name: string;
  count: number;
}

type DisplayMode = 'card' | 'table';

// All available columns for the table - extended list to match BillingListView
const allColumns = [
  { key: 'status', label: 'Status', width: 'min-w-28' },
  { key: 'billingStatus', label: 'Billing Status', width: 'min-w-28' },
  { key: 'accountNo', label: 'Account No.', width: 'min-w-32' },
  { key: 'dateInstalled', label: 'Date Installed', width: 'min-w-28' },
  { key: 'customerName', label: 'Full Name', width: 'min-w-40' },
  { key: 'address', label: 'Address', width: 'min-w-56' },
  { key: 'contactNumber', label: 'Contact Number', width: 'min-w-36' },
  { key: 'emailAddress', label: 'Email Address', width: 'min-w-48' },
  { key: 'plan', label: 'Plan', width: 'min-w-40' },
  { key: 'balance', label: 'Account Balance', width: 'min-w-32' },
  { key: 'username', label: 'Username', width: 'min-w-32' },
  { key: 'connectionType', label: 'Connection Type', width: 'min-w-36' },
  { key: 'routerModel', label: 'Router Model', width: 'min-w-32' },
  { key: 'routerModemSN', label: 'Router/Modem SN', width: 'min-w-36' },
  { key: 'lcpnap', label: 'LCPNAP', width: 'min-w-32' },
  { key: 'port', label: 'PORT', width: 'min-w-28' },
  { key: 'vlan', label: 'VLAN', width: 'min-w-24' },
  { key: 'billingDay', label: 'Billing Day', width: 'min-w-28' },
  { key: 'totalPaid', label: 'Total Paid', width: 'min-w-28' },
  { key: 'provider', label: 'Provider', width: 'min-w-24' },
  { key: 'lcp', label: 'LCP', width: 'min-w-28' },
  { key: 'nap', label: 'NAP', width: 'min-w-28' },
  { key: 'modifiedBy', label: 'Modified By', width: 'min-w-32' },
  { key: 'modifiedDate', label: 'Modified Date', width: 'min-w-36' },
  { key: 'barangay', label: 'Barangay', width: 'min-w-32' },
  { key: 'city', label: 'City', width: 'min-w-28' },
  { key: 'region', label: 'Region', width: 'min-w-28' },
  { key: 'lcpnapport', label: 'LCPNAPPORT', width: 'min-w-36' },
  { key: 'usageType', label: 'Usage Type', width: 'min-w-32' },
  { key: 'referredBy', label: 'Referred By', width: 'min-w-36' },
  { key: 'secondContactNumber', label: 'Second Contact Number', width: 'min-w-40' },
  { key: 'referrersAccountNumber', label: 'Referrer\'s Account Number', width: 'min-w-44' },
  { key: 'relatedInvoices', label: 'Related Invoices', width: 'min-w-36' },
  { key: 'relatedStatementOfAccount', label: 'Related Statement of Account', width: 'min-w-52' },
  { key: 'relatedDiscounts', label: 'Related Discounts', width: 'min-w-36' },
  { key: 'relatedStaggeredInstallation', label: 'Related Staggered Installation', width: 'min-w-52' },
  { key: 'relatedStaggeredPayments', label: 'Related Staggered Payments', width: 'min-w-52' },
  { key: 'relatedOverdues', label: 'Related Overdues', width: 'min-w-36' },
  { key: 'relatedDCNotices', label: 'Related DC Notices', width: 'min-w-40' },
  { key: 'relatedServiceOrders', label: 'Related Service Orders', width: 'min-w-44' },
  { key: 'relatedDisconnectedLogs', label: 'Related Disconnected Logs', width: 'min-w-48' },
  { key: 'relatedReconnectionLogs', label: 'Related Reconnection Logs', width: 'min-w-48' },
  { key: 'relatedChangeDueLogs', label: 'Related Change Due Logs', width: 'min-w-48' },
  { key: 'relatedTransactions', label: 'Related Transactions', width: 'min-w-40' },
  { key: 'relatedDetailsUpdateLogs', label: 'Related Details Update Logs', width: 'min-w-48' },
  { key: 'computedAddress', label: '_ComputedAddress', width: 'min-w-40' },
  { key: 'computedStatus', label: '_ComputedStatus', width: 'min-w-36' },
  { key: 'relatedAdvancedPayments', label: 'Related Advanced Payments', width: 'min-w-48' },
  { key: 'relatedPaymentPortalLogs', label: 'Related Payment Portal Logs', width: 'min-w-48' },
  { key: 'relatedInventoryLogs', label: 'Related Inventory Logs', width: 'min-w-44' },
  { key: 'computedAccountNo', label: '_ComputedAccountNo', width: 'min-w-44' },
  { key: 'relatedOnlineStatus', label: 'Related Online Status', width: 'min-w-44' },
  { key: 'group', label: 'Group', width: 'min-w-28' },
  { key: 'mikrotikId', label: 'Mikrotik ID', width: 'min-w-32' },
  { key: 'sessionIP', label: 'Session IP', width: 'min-w-32' },
  { key: 'relatedBorrowedLogs', label: 'Related Borrowed Logs', width: 'min-w-44' },
  { key: 'relatedPlanChangeLogs', label: 'Related Plan Change Logs', width: 'min-w-48' },
  { key: 'relatedServiceChargeLogs', label: 'Related Service Charge Logs', width: 'min-w-48' },
  { key: 'relatedAdjustedAccountLogs', label: 'Related Adjusted Account Logs', width: 'min-w-52' },
  { key: 'referralContactNo', label: 'Referral Contact No.', width: 'min-w-40' },
  { key: 'logs', label: 'Logs', width: 'min-w-24' },
  { key: 'relatedSecurityDeposits', label: 'Related Security Deposits', width: 'min-w-48' },
  { key: 'relatedApprovedTransactions', label: 'Related Approved Transaction', width: 'min-w-52' },
  { key: 'relatedAttachments', label: 'Related Attachments', width: 'min-w-40' }
];

interface CustomerProps {
  initialSearchQuery?: string;
  autoOpenAccountNo?: string;
}

const Customer: React.FC<CustomerProps> = ({ initialSearchQuery, autoOpenAccountNo }) => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>(initialSearchQuery || '');
  const { billingRecords, isLoading: isTableLoading, error: contextError, refreshBillingRecords, silentRefresh } = useBillingContext();
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetailData | null>(null);
  const [cities, setCities] = useState<City[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const isLoading = isTableLoading || isActionLoading;
  const error = localError || contextError;
  const setError = setLocalError; // Alias for compatibility with existing code

  const [displayMode, setDisplayMode] = useState<DisplayMode>('card');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem('customerTableVisibleColumns');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        console.error('Failed to load column visibility:', err);
      }
    }
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
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);
  const [isFunnelFilterOpen, setIsFunnelFilterOpen] = useState<boolean>(false);
  const [activeFilters, setActiveFilters] = useState<any>(() => {
    const saved = localStorage.getItem('customerFilters');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        console.error('Failed to load filters:', err);
      }
    }
    return {};
  });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);
  const sidebarStartXRef = useRef<number>(0);
  const sidebarStartWidthRef = useRef<number>(0);

  // Fetch location data
  useEffect(() => {
    const checkDarkMode = () => {
      const theme = localStorage.getItem('theme');
      setIsDarkMode(theme === 'dark' || theme === null);
    };

    checkDarkMode();

    const observer = new MutationObserver(() => {
      checkDarkMode();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  // Handle click outside to close dropdowns
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
    const fetchLocationData = async () => {
      try {
        const [citiesData, regionsData, activePalette] = await Promise.all([
          getCities(),
          getRegions(),
          settingsColorPaletteService.getActive()
        ]);
        setCities(citiesData || []);
        setRegions(regionsData || []);
        setColorPalette(activePalette);
      } catch (err) {
        console.error('Failed to fetch location data:', err);
        setCities([]);
        setRegions([]);
      }
    };

    fetchLocationData();
  }, []);

  // Trigger silent refresh on mount to ensure data is fresh but no spinner if cached
  useEffect(() => {
    silentRefresh();
  }, [silentRefresh]);

  // Sync initialSearchQuery
  useEffect(() => {
    if (initialSearchQuery !== undefined) {
      setSearchQuery(initialSearchQuery);
    }
  }, [initialSearchQuery]);

  // Auto-open account if prop provided
  useEffect(() => {
    const autoOpen = async () => {
      if (autoOpenAccountNo) {
        setIsLoadingDetails(true);
        try {
          const detail = await getCustomerDetail(autoOpenAccountNo);
          if (detail) {
            setSelectedCustomer(detail);
          }
        } catch (err) {
          console.error('Error auto-opening customer details:', err);
        } finally {
          setIsLoadingDetails(false);
        }
      }
    };
    autoOpen();
  }, [autoOpenAccountNo]);

  // Memoize city name lookup for performance
  const getCityName = useMemo(() => {
    const cityMap = new Map(cities.map(c => [c.id, c.name]));
    return (cityId: number | null | undefined): string => {
      if (!cityId) return 'Unknown City';
      return cityMap.get(cityId) || `City ${cityId}`;
    };
  }, [cities]);

  // Memoize location items for performance
  const locationItems: LocationItem[] = useMemo(() => {
    // Single pass to count cities
    const cityCounts: Record<string, number> = {};

    // Initialize counts for all known cities to 0
    cities.forEach(city => {
      cityCounts[String(city.id)] = 0;
    });

    // Count appearances in billing records
    billingRecords.forEach(record => {
      if (record.cityId) {
        const cityIdStr = String(record.cityId);
        if (cityCounts[cityIdStr] !== undefined) { // Check undefined directly, 0 is falsy
          cityCounts[cityIdStr]++;
        }
      }
    });

    const items: LocationItem[] = [
      {
        id: 'all',
        name: 'All',
        count: billingRecords.length
      }
    ];

    // Add known cities with their counts
    cities.forEach((city) => {
      items.push({
        id: String(city.id),
        name: city.name,
        count: cityCounts[String(city.id)] || 0
      });
    });

    return items;
  }, [cities, billingRecords]);

  // Helper function to apply funnel filters
  const applyFunnelFilters = (records: BillingRecord[], filters: any): BillingRecord[] => {
    if (!filters || Object.keys(filters).length === 0) return records;

    return records.filter(record => {
      return Object.entries(filters).every(([key, filter]: [string, any]) => {
        const recordValue = (record as any)[key];

        if (filter.type === 'text') {
          if (!filter.value) return true;
          const value = String(recordValue || '').toLowerCase();
          return value.includes(filter.value.toLowerCase());
        }

        if (filter.type === 'number') {
          const numValue = Number(recordValue);
          if (isNaN(numValue)) return false;
          if (filter.from !== undefined && filter.from !== '' && numValue < Number(filter.from)) return false;
          if (filter.to !== undefined && filter.to !== '' && numValue > Number(filter.to)) return false;
          return true;
        }

        if (filter.type === 'date') {
          if (!recordValue) return false;
          const dateValue = new Date(recordValue).getTime();
          if (filter.from && dateValue < new Date(filter.from).getTime()) return false;
          if (filter.to && dateValue > new Date(filter.to).getTime()) return false;
          return true;
        }

        return true;
      });
    });
  };

  // Memoize filtered and sorted records for performance
  const filteredBillingRecords = useMemo(() => {
    let filtered = billingRecords.filter(record => {
      const matchesLocation = selectedLocation === 'all' ||
        record.cityId === Number(selectedLocation);

      const matchesSearch = searchQuery === '' ||
        record.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.applicationId.includes(searchQuery);

      return matchesLocation && matchesSearch;
    });

    // Apply funnel filters
    filtered = applyFunnelFilters(filtered, activeFilters);

    if (sortColumn) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: any = '';
        let bValue: any = '';

        switch (sortColumn) {
          case 'status':
          case 'onlineStatus':
            aValue = a.onlineStatus || '';
            bValue = b.onlineStatus || '';
            break;
          case 'billingStatus':
            aValue = a.billingStatus || 'Active';
            bValue = b.billingStatus || 'Active';
            break;
          case 'accountNo':
            aValue = a.applicationId || '';
            bValue = b.applicationId || '';
            break;
          case 'dateInstalled':
            aValue = a.dateInstalled || '';
            bValue = b.dateInstalled || '';
            break;
          case 'customerName':
            aValue = a.customerName || '';
            bValue = b.customerName || '';
            break;
          case 'address':
            aValue = a.address || '';
            bValue = b.address || '';
            break;
          case 'contactNumber':
            aValue = a.contactNumber || '';
            bValue = b.contactNumber || '';
            break;
          case 'emailAddress':
            aValue = a.emailAddress || '';
            bValue = b.emailAddress || '';
            break;
          case 'plan':
            aValue = a.plan || '';
            bValue = b.plan || '';
            break;
          case 'balance':
            aValue = a.balance || 0;
            bValue = b.balance || 0;
            break;
          case 'username':
            aValue = a.username || '';
            bValue = b.username || '';
            break;
          case 'connectionType':
            aValue = a.connectionType || '';
            bValue = b.connectionType || '';
            break;
          case 'routerModel':
            aValue = a.routerModel || '';
            bValue = b.routerModel || '';
            break;
          case 'routerModemSN':
            aValue = a.routerModemSN || '';
            bValue = b.routerModemSN || '';
            break;
          case 'lcpnap':
            aValue = a.lcpnap || '';
            bValue = b.lcpnap || '';
            break;
          case 'port':
            aValue = a.port || '';
            bValue = b.port || '';
            break;
          case 'vlan':
            aValue = a.vlan || '';
            bValue = b.vlan || '';
            break;
          case 'billingDay':
            aValue = a.billingDay || 0;
            bValue = b.billingDay || 0;
            break;
          case 'totalPaid':
            aValue = a.totalPaid || 0;
            bValue = b.totalPaid || 0;
            break;
          case 'provider':
            aValue = a.provider || '';
            bValue = b.provider || '';
            break;
          case 'lcp':
            aValue = a.lcp || '';
            bValue = b.lcp || '';
            break;
          case 'nap':
            aValue = a.nap || '';
            bValue = b.nap || '';
            break;
          case 'modifiedBy':
            aValue = a.modifiedBy || '';
            bValue = b.modifiedBy || '';
            break;
          case 'modifiedDate':
            aValue = a.modifiedDate || '';
            bValue = b.modifiedDate || '';
            break;
          case 'barangay':
            aValue = a.barangay || '';
            bValue = b.barangay || '';
            break;
          case 'city':
            aValue = a.city || '';
            bValue = b.city || '';
            break;
          case 'region':
            aValue = a.region || '';
            bValue = b.region || '';
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
  }, [billingRecords, selectedLocation, searchQuery, sortColumn, sortDirection, activeFilters]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedLocation, searchQuery, activeFilters, sortColumn, sortDirection]);

  // Derived paginated records
  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredBillingRecords.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredBillingRecords, currentPage]);

  const totalPages = Math.ceil(filteredBillingRecords.length / itemsPerPage);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // Pagination Controls Component
  const PaginationControls = () => {
    if (totalPages <= 1) return null;

    return (
      <div className={`flex items-center justify-between px-4 py-3 border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
        <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredBillingRecords.length)}</span> of <span className="font-medium">{filteredBillingRecords.length}</span> results
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`px-3 py-1 rounded text-sm transition-colors ${currentPage === 1
              ? (isDarkMode ? 'text-gray-600 bg-gray-800 cursor-not-allowed' : 'text-gray-400 bg-gray-100 cursor-not-allowed')
              : (isDarkMode ? 'text-white bg-gray-700 hover:bg-gray-600' : 'text-gray-700 bg-white hover:bg-gray-50 border border-gray-300')
              }`}
          >
            Previous
          </button>

          <div className="flex items-center space-x-1">
            {/* Simple page indicator for now, can be expanded to page numbers */}
            <span className={`px-2 text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Page {currentPage} of {totalPages}
            </span>
          </div>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`px-3 py-1 rounded text-sm transition-colors ${currentPage === totalPages
              ? (isDarkMode ? 'text-gray-600 bg-gray-800 cursor-not-allowed' : 'text-gray-400 bg-gray-100 cursor-not-allowed')
              : (isDarkMode ? 'text-white bg-gray-700 hover:bg-gray-600' : 'text-gray-700 bg-white hover:bg-gray-50 border border-gray-300')
              }`}
          >
            Next
          </button>
        </div>
      </div>
    );
  };


  const handleRecordClick = async (record: BillingRecord) => {
    try {
      setIsLoadingDetails(true);
      console.log('Fetching customer detail for account:', record.applicationId);
      const customerData = await getCustomerDetail(record.applicationId);
      console.log('Fetched customer data:', customerData);
      setSelectedCustomer(customerData);
    } catch (error) {
      console.error('Failed to fetch customer details:', error);
      setError('Failed to load customer details');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleCloseDetails = () => {
    setSelectedCustomer(null);
  };

  const renderCellValue = (record: BillingRecord, columnKey: string) => {
    switch (columnKey) {
      // Basic fields
      case 'status':
        const isOnline = ['Online', 'online', 'Active', 'active', 'Connected', 'connected'].includes(record.onlineStatus);
        return (
          <div className="flex items-center space-x-2">
            <Circle
              className={`h-3 w-3 ${isOnline
                ? 'text-green-400 fill-green-400'
                : 'text-gray-400 fill-gray-400'
                }`}
            />
            <span className={`text-xs ${isOnline
              ? 'text-green-400'
              : 'text-gray-400'
              }`}>
              {record.onlineStatus}
            </span>
          </div>
        );
      case 'billingStatus':
        return record.billingStatus || 'Active';
      case 'accountNo':
        return <span className="text-red-400">{record.applicationId}</span>;
      case 'dateInstalled':
        return record.dateInstalled || '-';
      case 'customerName':
        return record.customerName;
      case 'address':
        return <span title={record.address}>{record.address}</span>;
      case 'contactNumber':
        return record.contactNumber || '-';
      case 'emailAddress':
        return record.emailAddress || '-';
      case 'plan':
        return record.plan || '-';
      case 'balance':
        return `₱ ${record.balance.toFixed(2)}`;
      case 'username':
        return record.username || '-';
      case 'connectionType':
        return record.connectionType || '-';
      case 'routerModel':
        return record.routerModel || '-';
      case 'routerModemSN':
        return record.routerModemSN || '-';
      case 'lcpnap':
        return record.lcpnap || '-';
      case 'port':
        return record.port || '-';
      case 'vlan':
        return record.vlan || '-';
      case 'billingDay':
        return record.billingDay === 0 ? 'Every end of month' : (record.billingDay || '-');
      case 'totalPaid':
        return `₱ ${record.totalPaid?.toFixed(2) || '0.00'}`;
      case 'provider':
        return record.provider || '-';
      case 'lcp':
        return record.lcp || '-';
      case 'nap':
        return record.nap || '-';
      case 'modifiedBy':
        return record.modifiedBy || '-';
      case 'modifiedDate':
        return record.modifiedDate || '-';
      case 'barangay':
        return record.barangay || '-';
      case 'city':
        return record.city || '-';
      case 'region':
        return record.region || '-';

      // Fields from BillingDetailRecord
      case 'lcpnapport':
        return (record as any).lcpnapport || '-';
      case 'usageType':
        return (record as any).usageType || '-';
      case 'referredBy':
        return (record as any).referredBy || '-';
      case 'secondContactNumber':
        return (record as any).secondContactNumber || '-';
      case 'referrersAccountNumber':
        return (record as any).referrersAccountNumber || '-';
      case 'group':
        return (record as any).group || '-';
      case 'mikrotikId':
        return (record as any).mikrotikId || '-';
      case 'sessionIP':
        return (record as any).sessionIP || '-';
      case 'referralContactNo':
        return (record as any).referralContactNo || '-';

      // Related records - placeholders
      case 'relatedInvoices':
      case 'relatedStatementOfAccount':
      case 'relatedDiscounts':
      case 'relatedStaggeredInstallation':
      case 'relatedStaggeredPayments':
      case 'relatedOverdues':
      case 'relatedDCNotices':
      case 'relatedServiceOrders':
      case 'relatedDisconnectedLogs':
      case 'relatedReconnectionLogs':
      case 'relatedChangeDueLogs':
      case 'relatedTransactions':
      case 'relatedDetailsUpdateLogs':
      case 'relatedAdvancedPayments':
      case 'relatedPaymentPortalLogs':
      case 'relatedInventoryLogs':
      case 'relatedOnlineStatus':
      case 'relatedBorrowedLogs':
      case 'relatedPlanChangeLogs':
      case 'relatedServiceChargeLogs':
      case 'relatedAdjustedAccountLogs':
      case 'relatedSecurityDeposits':
      case 'relatedApprovedTransactions':
      case 'relatedAttachments':
      case 'logs':
        return '-';

      // Computed fields
      case 'computedAddress':
        return (record as any).computedAddress ||
          (record.address ? (record.address.length > 25 ? `${record.address.substring(0, 25)}...` : record.address) : '-');
      case 'computedStatus':
        return (record as any).computedStatus ||
          `${record.status || 'Inactive'} | P ${record.balance.toFixed(2)}`;
      case 'computedAccountNo':
        return (record as any).computedAccountNo ||
          `${record.applicationId} | ${record.customerName}${record.address ? (' | ' + record.address.substring(0, 10) + '...') : ''}`;

      default:
        return '-';
    }
  };

  const handleRefresh = async () => {
    try {
      // Use the context refresh function
      await refreshBillingRecords();
    } catch (err) {
      console.error('Failed to refresh billing records:', err);
    }
  };

  const handleProcessOverdueNotifications = async () => {
    if (!window.confirm('Process overdue notifications?\n\nThis will:\n- Update overdue table\n- Send email with PDF attachments\n- Send SMS notifications\n\nContinue?')) {
      return;
    }

    setIsActionLoading(true);

    const API_BASE_URL = window.location.hostname === 'localhost'
      ? 'https://backend.atssfiber.ph/api'
      : 'https://backend.atssfiber.ph/api';

    try {
      const response = await fetch(`${API_BASE_URL}/cron-test/process-overdue-notifications`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include'
      });

      const result = await response.json();

      if (!result.success) {
        alert('Overdue notification processing failed: ' + result.message);
        setError(result.message);
      } else {
        alert('✅ Overdue notifications processed successfully!\n\nCheck logs for details.');
        // Refresh data
        refreshBillingRecords();
      }
    } catch (err) {
      console.error('Processing failed:', err);
      alert('Processing failed: ' + (err as Error).message);
      setError('Processing failed. Please try again.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleProcessDisconnectionNotices = async () => {
    if (!window.confirm('Process disconnection notices?\n\nThis will:\n- Update disconnection notice table\n- Send email with PDF attachments\n- Send SMS notifications\n\nContinue?')) {
      return;
    }

    setIsActionLoading(true);

    const API_BASE_URL = window.location.hostname === 'localhost'
      ? 'https://backend.atssfiber.ph/api'
      : 'https://backend.atssfiber.ph/api';

    try {
      const response = await fetch(`${API_BASE_URL}/cron-test/process-disconnection-notices`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include'
      });

      const result = await response.json();

      if (!result.success) {
        alert('Disconnection notice processing failed: ' + result.message);
        setError(result.message);
      } else {
        alert('✅ Disconnection notices processed successfully!\n\nCheck logs for details.');
        // Refresh data
        refreshBillingRecords();
      }
    } catch (err) {
      console.error('Processing failed:', err);
      alert('Processing failed: ' + (err as Error).message);
      setError('Processing failed. Please try again.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleGenerateSampleData = async () => {
    if (!window.confirm('Generate sample SOA and invoices for ALL accounts in database (regardless of billing day, status, or any restrictions)?\n\nThis will process EVERY account that has a date_installed value.\n\n✨ NEW: Includes PDF generation + Email queue + SMS notifications!\n\nContinue?')) {
      return;
    }

    setIsActionLoading(true);

    const API_BASE_URL = window.location.hostname === 'localhost'
      ? 'https://backend.atssfiber.ph/api'
      : 'https://backend.atssfiber.ph/api';

    const generationDate = new Date().toISOString().split('T')[0];

    try {
      const response = await fetch(`${API_BASE_URL}/billing-generation/force-generate-all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          generation_date: generationDate,
          send_notifications: true
        })
      });

      const result = await response.json();

      if (!result.success) {
        const errorDetails = result.data?.invoices?.errors || [];
        const soaErrors = result.data?.statements?.errors || [];
        const allErrors = [...errorDetails, ...soaErrors];

        if (allErrors.length > 0) {
          console.error('Generation errors:', allErrors);
          const firstError = allErrors[0];
          alert(`Generation failed for account ${firstError.account_no}: ${firstError.error}`);
        } else {
          alert(result.message || 'Generation failed');
        }
        setError(result.message);
        setIsActionLoading(false);
        return;
      }

      // Refresh data
      refreshBillingRecords();
      setError(null);

      const invoiceCount = result.data?.invoices?.success || 0;
      const soaCount = result.data?.statements?.success || 0;
      const accountCount = result.data?.total_accounts || 0;
      const invoiceErrors = result.data?.invoices?.failed || 0;
      const soaErrors = result.data?.statements?.failed || 0;

      // Count notifications
      const invoiceNotifications = result.data?.invoices?.notifications?.length || 0;
      const soaNotifications = result.data?.statements?.notifications?.length || 0;

      if (invoiceErrors > 0 || soaErrors > 0) {
        const errors = [
          ...(result.data?.invoices?.errors || []),
          ...(result.data?.statements?.errors || [])
        ];
        console.error('Generation errors:', errors);
        alert(`Generated ${invoiceCount} invoices and ${soaCount} statements for ${accountCount} accounts.\n\nFailed: ${invoiceErrors} invoices, ${soaErrors} statements.\n\nNotifications queued: ${invoiceNotifications + soaNotifications}\n\nCheck console for errors.`);
      } else {
        alert(`✅ Success!\n\nGenerated:\n- ${invoiceCount} invoices\n- ${soaCount} statements\n- ${accountCount} accounts processed\n\n📧 Notifications:\n- ${invoiceNotifications + soaNotifications} emails queued\n- ${invoiceNotifications + soaNotifications} SMS sent\n- ${invoiceNotifications + soaNotifications} PDFs created\n\n(All accounts with date_installed, regardless of billing day or status)`);
      }
    } catch (err) {
      console.error('Generation failed:', err);
      setError('Generation failed. Please try again.');
      alert('Generation failed: ' + (err as Error).message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleToggleColumn = (columnKey: string) => {
    setVisibleColumns(prev => {
      const newColumns = prev.includes(columnKey)
        ? prev.filter(key => key !== columnKey)
        : [...prev, columnKey];
      localStorage.setItem('customerTableVisibleColumns', JSON.stringify(newColumns));
      return newColumns;
    });
  };

  const handleSelectAllColumns = () => {
    const allKeys = allColumns.map(col => col.key);
    setVisibleColumns(allKeys);
    localStorage.setItem('customerTableVisibleColumns', JSON.stringify(allKeys));
  };

  const handleDeselectAllColumns = () => {
    setVisibleColumns([]);
    localStorage.setItem('customerTableVisibleColumns', JSON.stringify([]));
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

  return (
    <div className={`h-full flex flex-col md:flex-row overflow-hidden pb-16 md:pb-0 ${isDarkMode ? 'bg-gray-950' : 'bg-gray-50'
      }`}>
      <div className={`hidden md:flex border-r flex-shrink-0 flex flex-col relative ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
        }`} style={{ width: `${sidebarWidth}px` }}>
        <div className={`p-4 border-b flex-shrink-0 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'
          }`}>
          <div className="flex items-center justify-between mb-1">
            <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>Customer Details</h2>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {locationItems.map((location) => (
            <button
              key={location.id}
              onClick={() => setSelectedLocation(location.id)}
              className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
                } ${selectedLocation === location.id
                  ? ''
                  : isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}
              style={selectedLocation === location.id ? {
                backgroundColor: colorPalette?.primary ? `${colorPalette.primary}33` : 'rgba(249, 115, 22, 0.2)',
                color: colorPalette?.primary || '#fb923c'
              } : {}}
            >
              <div className="flex items-center">
                <CreditCard className="h-4 w-4 mr-2" />
                <span className="capitalize">{location.name}</span>
              </div>
              {location.count > 0 && (
                <span
                  className={`px-2 py-1 rounded-full text-xs ${selectedLocation === location.id
                    ? 'text-white'
                    : isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
                    }`}
                  style={selectedLocation === location.id ? {
                    backgroundColor: colorPalette?.primary || '#ea580c'
                  } : {}}
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
          onMouseEnter={(e) => {
            if (colorPalette?.primary) {
              e.currentTarget.style.backgroundColor = colorPalette.primary;
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '';
          }}
        />
      </div>

      <div className={`flex-1 overflow-hidden ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
        }`}>
        <div className="flex flex-col h-full">
          <div className={`p-4 border-b flex-shrink-0 ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
            }`}>
            <div className="flex items-center space-x-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search customer records..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full rounded pl-10 pr-4 py-2 focus:outline-none focus:ring-1 focus:border ${isDarkMode
                    ? 'bg-gray-800 text-white border border-gray-700'
                    : 'bg-white text-gray-900 border border-gray-300'
                    }`}
                  style={{
                    '--tw-ring-color': colorPalette?.primary || '#ea580c'
                  } as React.CSSProperties}
                  onFocus={(e) => {
                    if (colorPalette?.primary) {
                      e.currentTarget.style.borderColor = colorPalette.primary;
                    }
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = isDarkMode ? '#374151' : '#d1d5db';
                  }}
                />
                <Search className={`absolute left-3 top-2.5 h-4 w-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`} />
              </div>
              <div className="flex space-x-2">
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
                        ? 'hover:bg-gray-700 text-white'
                        : 'hover:bg-gray-200 text-gray-900'
                        }`}
                      onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
                    >
                      <ListFilter className="h-5 w-5" />
                    </button>
                    {filterDropdownOpen && (
                      <div className={`absolute top-full right-0 mt-2 w-80 rounded shadow-lg z-50 max-h-96 flex flex-col ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
                        }`}>
                        <div className={`p-3 border-b flex items-center justify-between ${isDarkMode ? 'border-gray-700' : 'border-gray-200'
                          }`}>
                          <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'
                            }`}>Column Visibility</span>
                          <div className="flex space-x-2">
                            <button
                              onClick={handleSelectAllColumns}
                              className="text-xs"
                              style={{ color: colorPalette?.primary || '#f97316' }}
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
                            <span className={isDarkMode ? 'text-gray-600' : 'text-gray-400'}>|</span>
                            <button
                              onClick={handleDeselectAllColumns}
                              className="text-xs"
                              style={{ color: colorPalette?.primary || '#f97316' }}
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
                                className={`mr-3 h-4 w-4 rounded ${isDarkMode
                                  ? 'border-gray-600 bg-gray-700 focus:ring-offset-gray-800'
                                  : 'border-gray-300 bg-white focus:ring-offset-white'
                                  }`}
                                style={{
                                  accentColor: colorPalette?.primary || '#ea580c'
                                }}
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
                      ? 'hover:bg-gray-700 text-white'
                      : 'hover:bg-gray-200 text-gray-900'
                      }`}
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                  >
                    <span>{displayMode === 'card' ? 'Card View' : 'Table View'}</span>
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {dropdownOpen && (
                    <div className={`fixed right-auto mt-1 w-36 rounded shadow-lg ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
                      }`}>
                      <button
                        onClick={() => {
                          setDisplayMode('card');
                          setDropdownOpen(false);
                        }}
                        className={`block w-full text-left px-4 py-2 text-sm transition-colors ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                          } ${displayMode === 'card' ? '' : isDarkMode ? 'text-white' : 'text-gray-900'}`}
                        style={displayMode === 'card' ? { color: colorPalette?.primary || '#f97316' } : {}}
                      >
                        Card View
                      </button>
                      <button
                        onClick={() => {
                          setDisplayMode('table');
                          setDropdownOpen(false);
                        }}
                        className={`block w-full text-left px-4 py-2 text-sm transition-colors ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                          } ${displayMode === 'table' ? '' : isDarkMode ? 'text-white' : 'text-gray-900'}`}
                        style={displayMode === 'table' ? { color: colorPalette?.primary || '#f97316' } : {}}
                      >
                        Table View
                      </button>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleProcessOverdueNotifications}
                  disabled={isLoading}
                  className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 text-white px-4 py-2 rounded text-sm transition-colors"
                >
                  {isLoading ? 'Processing...' : 'Process Overdue'}
                </button>
                <button
                  onClick={handleProcessDisconnectionNotices}
                  disabled={isLoading}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white px-4 py-2 rounded text-sm transition-colors"
                >
                  {isLoading ? 'Processing...' : 'Process DC Notice'}
                </button>
                <button
                  onClick={handleGenerateSampleData}
                  disabled={isLoading}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded text-sm transition-colors"
                >
                  {isLoading ? 'Generating...' : 'Generate Sample Data'}
                </button>
                <button
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className="text-white px-4 py-2 rounded text-sm transition-colors disabled:bg-gray-600 flex items-center"
                  style={{
                    backgroundColor: colorPalette?.primary || '#ea580c',
                  }}
                  onMouseEnter={(e) => {
                    if (!isLoading && colorPalette?.accent) {
                      e.currentTarget.style.backgroundColor = colorPalette.accent;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isLoading && colorPalette?.primary) {
                      e.currentTarget.style.backgroundColor = colorPalette.primary;
                    }
                  }}
                >
                  <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className={`px-4 py-12 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                  <div className="animate-pulse flex flex-col items-center">
                    <div className={`h-4 w-1/3 rounded mb-4 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'
                      }`}></div>
                    <div className={`h-4 w-1/2 rounded ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'
                      }`}></div>
                  </div>
                  <p className="mt-4">Loading customer records...</p>
                </div>
              ) : error ? (
                <div className={`px-4 py-12 text-center ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                  <p>{error}</p>
                  <button
                    onClick={refreshBillingRecords}
                    className={`mt-4 px-4 py-2 rounded ${isDarkMode
                      ? 'bg-gray-700 hover:bg-gray-600 text-white'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                      }`}>
                    Retry
                  </button>
                </div>
              ) : (
                <>
                  {displayMode === 'card' ? (
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                      {paginatedRecords.length > 0 ? (
                        <div>
                          {paginatedRecords.map((record) => (
                            <div
                              key={record.id}
                              onClick={() => handleRecordClick(record)}
                              className={`px-4 py-3 cursor-pointer transition-colors border-b ${isDarkMode
                                ? 'hover:bg-gray-800 border-gray-800'
                                : 'hover:bg-gray-100 border-gray-200'
                                } ${selectedCustomer?.billingAccount?.accountNo === record.applicationId ? (isDarkMode ? 'bg-gray-800' : 'bg-gray-100') : ''}`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="text-red-400 font-medium text-sm mb-1">
                                    {record.applicationId} | {record.customerName} | {record.address}
                                  </div>
                                  <div className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'
                                    }`}>
                                    {record.status} | ₱ {record.balance.toFixed(2)}
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
                                  <Circle
                                    className={`h-3 w-3 ${['Online', 'online', 'Active', 'active', 'Connected', 'connected'].includes(record.onlineStatus) ? 'text-green-400 fill-green-400' : 'text-gray-400 fill-gray-400'}`}
                                  />
                                  <span className={`text-sm ${['Online', 'online', 'Active', 'active', 'Connected', 'connected'].includes(record.onlineStatus) ? 'text-green-400' : 'text-gray-400'}`}>
                                    {record.onlineStatus}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className={`text-center py-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                          No customer records found matching your filters
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-full relative flex flex-col">
                      <div className="flex-1 overflow-auto">
                        <table ref={tableRef} className="w-max min-w-full text-sm border-separate border-spacing-0">
                          <thead>
                            <tr className={`border-b sticky top-0 z-10 ${isDarkMode
                              ? 'border-gray-700 bg-gray-800'
                              : 'border-gray-200 bg-gray-100'
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
                                  className={`text-left py-3 px-3 font-normal ${column.width} whitespace-nowrap relative group cursor-move ${isDarkMode ? 'text-gray-400 bg-gray-800' : 'text-gray-600 bg-gray-100'
                                    } ${index < filteredColumns.length - 1 ? (isDarkMode ? 'border-r border-gray-700' : 'border-r border-gray-200') : ''} ${draggedColumn === column.key ? 'opacity-50' : ''
                                    } ${dragOverColumn === column.key ? '' : ''
                                    }`}
                                  style={dragOverColumn === column.key ? {
                                    backgroundColor: colorPalette?.primary ? `${colorPalette.primary}33` : 'rgba(249, 115, 22, 0.2)',
                                    width: columnWidths[column.key] ? `${columnWidths[column.key]}px` : undefined
                                  } : {
                                    width: columnWidths[column.key] ? `${columnWidths[column.key]}px` : undefined
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
                                          <ArrowDown className="h-4 w-4" style={{ color: colorPalette?.accent || '#fb923c' }} />
                                        ) : (
                                          <ArrowUp className="h-4 w-4 text-gray-400" style={{ color: hoveredColumn === column.key ? (colorPalette?.accent || '#fb923c') : undefined }} />
                                        )}
                                      </button>
                                    )}
                                  </div>
                                  {index < filteredColumns.length - 1 && (
                                    <div
                                      className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize ${isDarkMode ? 'group-hover:bg-gray-600' : 'group-hover:bg-gray-300'
                                        }`}
                                      style={{
                                        '--hover-bg': colorPalette?.primary || '#ea580c'
                                      } as React.CSSProperties}
                                      onMouseEnter={(e) => {
                                        if (colorPalette?.primary) {
                                          e.currentTarget.style.backgroundColor = colorPalette.primary;
                                        }
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = '';
                                      }}
                                      onMouseDown={(e) => handleMouseDownResize(e, column.key)}
                                    />
                                  )}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedRecords.length > 0 ? (
                              paginatedRecords.map((record) => (
                                <tr
                                  key={record.id}
                                  className={`border-b cursor-pointer transition-colors ${isDarkMode
                                    ? 'border-gray-800 hover:bg-gray-900'
                                    : 'border-gray-200 hover:bg-gray-50'
                                    } ${selectedCustomer?.billingAccount?.accountNo === record.applicationId ? (isDarkMode ? 'bg-gray-800' : 'bg-gray-100') : ''}`}
                                  onClick={() => handleRecordClick(record)}
                                >
                                  {filteredColumns.map((column, index) => (
                                    <td
                                      key={column.key}
                                      className={`py-4 px-3 ${isDarkMode ? 'text-white' : 'text-gray-900'
                                        } ${index < filteredColumns.length - 1 ? (isDarkMode ? 'border-r border-gray-800' : 'border-r border-gray-200') : ''}`}
                                      style={{
                                        width: columnWidths[column.key] ? `${columnWidths[column.key]}px` : undefined,
                                        maxWidth: columnWidths[column.key] ? `${columnWidths[column.key]}px` : undefined
                                      }}
                                    >
                                      <div className="truncate">
                                        {renderCellValue(record, column.key)}
                                      </div>
                                    </td>
                                  ))}
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={filteredColumns.length} className={`px-4 py-12 text-center border-b ${isDarkMode
                                  ? 'text-gray-400 border-gray-800'
                                  : 'text-gray-600 border-gray-200'
                                  }`}>
                                  No customer records found matching your filters
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            {!isLoading && !error && filteredBillingRecords.length > 0 && <PaginationControls />}
          </div>
        </div>
      </div>

      {(selectedCustomer || isLoadingDetails) && (
        <div className="flex-shrink-0 overflow-hidden">
          {isLoadingDetails ? (
            <div className={`w-[600px] h-full flex items-center justify-center border-l ${isDarkMode
              ? 'bg-gray-900 text-white border-white border-opacity-30'
              : 'bg-white text-gray-900 border-gray-300'
              }`}>
              <div className="text-center">
                <div
                  className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
                  style={{ borderBottomColor: colorPalette?.primary || '#ea580c' }}
                ></div>
                <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Loading details...</p>
              </div>
            </div>
          ) : selectedCustomer ? (
            <BillingDetails
              billingRecord={convertCustomerDataToBillingDetail(selectedCustomer)}
              onlineStatusRecords={[]}
              onClose={handleCloseDetails}
            />
          ) : null}
        </div>
      )}

      <CustomerFunnelFilter
        isOpen={isFunnelFilterOpen}
        onClose={() => setIsFunnelFilterOpen(false)}
        onApplyFilters={(filters) => {
          console.log('Applied filters:', filters);
          setActiveFilters(filters);
          localStorage.setItem('customerFilters', JSON.stringify(filters));
          setIsFunnelFilterOpen(false);
        }}
        currentFilters={activeFilters}
      />
    </div>
  );
};

export default Customer;