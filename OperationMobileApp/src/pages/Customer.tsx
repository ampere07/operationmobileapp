import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { CreditCard, Search, Circle, X, ListFilter, ArrowUp, ArrowDown, RefreshCw, Filter } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BillingDetails from '../components/CustomerDetails';
import { getBillingRecords, BillingRecord } from '../services/billingService';
import { getCustomerDetail, CustomerDetailData } from '../services/customerDetailService';
import { BillingDetailRecord } from '../types/billing';
import { getCities, City } from '../services/cityService';
import { getRegions, Region } from '../services/regionService';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';
import CustomerFunnelFilter from '../filter/CustomerFunnelFilter';

const convertCustomerDataToBillingDetail = (customerData: CustomerDetailData): BillingDetailRecord => {
  return {
    id: customerData.billingAccount?.accountNo || '',
    applicationId: customerData.billingAccount?.accountNo || '',
    customerName: customerData.fullName,
    address: customerData.address,
    status: customerData.billingAccount?.billingStatusId === 2 ? 'Active' : 'Inactive',
    balance: customerData.billingAccount?.accountBalance || 0,
    onlineStatus: customerData.billingAccount?.billingStatusId === 2 ? 'Online' : 'Offline',
    cityId: null,
    regionId: null,
    timestamp: customerData.updatedAt || '',
    billingStatus: customerData.billingAccount?.billingStatusId ? `Status ${customerData.billingAccount.billingStatusId}` : '',
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

const allColumns = [
  { key: 'status', label: 'Status', width: 112 },
  { key: 'billingStatus', label: 'Billing Status', width: 112 },
  { key: 'accountNo', label: 'Account No.', width: 128 },
  { key: 'dateInstalled', label: 'Date Installed', width: 112 },
  { key: 'customerName', label: 'Full Name', width: 160 },
  { key: 'address', label: 'Address', width: 224 },
  { key: 'contactNumber', label: 'Contact Number', width: 144 },
  { key: 'emailAddress', label: 'Email Address', width: 192 },
  { key: 'plan', label: 'Plan', width: 160 },
  { key: 'balance', label: 'Account Balance', width: 128 },
  { key: 'username', label: 'Username', width: 128 },
  { key: 'connectionType', label: 'Connection Type', width: 144 },
  { key: 'routerModel', label: 'Router Model', width: 128 },
  { key: 'routerModemSN', label: 'Router/Modem SN', width: 144 },
  { key: 'lcpnap', label: 'LCPNAP', width: 128 },
  { key: 'port', label: 'PORT', width: 112 },
  { key: 'vlan', label: 'VLAN', width: 96 },
  { key: 'billingDay', label: 'Billing Day', width: 112 },
  { key: 'totalPaid', label: 'Total Paid', width: 112 },
  { key: 'provider', label: 'Provider', width: 96 },
  { key: 'lcp', label: 'LCP', width: 112 },
  { key: 'nap', label: 'NAP', width: 112 },
  { key: 'modifiedBy', label: 'Modified By', width: 128 },
  { key: 'modifiedDate', label: 'Modified Date', width: 144 },
  { key: 'barangay', label: 'Barangay', width: 128 },
  { key: 'city', label: 'City', width: 112 },
  { key: 'region', label: 'Region', width: 112 },
  { key: 'lcpnapport', label: 'LCPNAPPORT', width: 144 },
  { key: 'usageType', label: 'Usage Type', width: 128 },
  { key: 'referredBy', label: 'Referred By', width: 144 },
  { key: 'secondContactNumber', label: 'Second Contact Number', width: 160 },
  { key: 'referrersAccountNumber', label: 'Referrer\'s Account Number', width: 176 },
  { key: 'relatedInvoices', label: 'Related Invoices', width: 144 },
  { key: 'relatedStatementOfAccount', label: 'Related Statement of Account', width: 208 },
  { key: 'relatedDiscounts', label: 'Related Discounts', width: 144 },
  { key: 'relatedStaggeredInstallation', label: 'Related Staggered Installation', width: 208 },
  { key: 'relatedStaggeredPayments', label: 'Related Staggered Payments', width: 208 },
  { key: 'relatedOverdues', label: 'Related Overdues', width: 144 },
  { key: 'relatedDCNotices', label: 'Related DC Notices', width: 160 },
  { key: 'relatedServiceOrders', label: 'Related Service Orders', width: 176 },
  { key: 'relatedDisconnectedLogs', label: 'Related Disconnected Logs', width: 192 },
  { key: 'relatedReconnectionLogs', label: 'Related Reconnection Logs', width: 192 },
  { key: 'relatedChangeDueLogs', label: 'Related Change Due Logs', width: 192 },
  { key: 'relatedTransactions', label: 'Related Transactions', width: 160 },
  { key: 'relatedDetailsUpdateLogs', label: 'Related Details Update Logs', width: 192 },
  { key: 'computedAddress', label: '_ComputedAddress', width: 160 },
  { key: 'computedStatus', label: '_ComputedStatus', width: 144 },
  { key: 'relatedAdvancedPayments', label: 'Related Advanced Payments', width: 192 },
  { key: 'relatedPaymentPortalLogs', label: 'Related Payment Portal Logs', width: 192 },
  { key: 'relatedInventoryLogs', label: 'Related Inventory Logs', width: 176 },
  { key: 'computedAccountNo', label: '_ComputedAccountNo', width: 176 },
  { key: 'relatedOnlineStatus', label: 'Related Online Status', width: 176 },
  { key: 'group', label: 'Group', width: 112 },
  { key: 'mikrotikId', label: 'Mikrotik ID', width: 128 },
  { key: 'sessionIP', label: 'Session IP', width: 128 },
  { key: 'relatedBorrowedLogs', label: 'Related Borrowed Logs', width: 176 },
  { key: 'relatedPlanChangeLogs', label: 'Related Plan Change Logs', width: 192 },
  { key: 'relatedServiceChargeLogs', label: 'Related Service Charge Logs', width: 192 },
  { key: 'relatedAdjustedAccountLogs', label: 'Related Adjusted Account Logs', width: 208 },
  { key: 'referralContactNo', label: 'Referral Contact No.', width: 160 },
  { key: 'logs', label: 'Logs', width: 96 },
  { key: 'relatedSecurityDeposits', label: 'Related Security Deposits', width: 192 },
  { key: 'relatedApprovedTransactions', label: 'Related Approved Transaction', width: 208 },
  { key: 'relatedAttachments', label: 'Related Attachments', width: 160 }
];

const Customer: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetailData | null>(null);
  const [billingRecords, setBillingRecords] = useState<BillingRecord[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('card');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => allColumns.map(col => col.key));
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [hoveredColumn, setHoveredColumn] = useState<string | null>(null);
  const [columnOrder, setColumnOrder] = useState<string[]>(allColumns.map(col => col.key));
  const [sidebarWidth, setSidebarWidth] = useState<number>(256);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);
  const [isFunnelFilterOpen, setIsFunnelFilterOpen] = useState<boolean>(false);
  const [activeFilters, setActiveFilters] = useState<any>({});
  const dropdownRef = useRef<View>(null);
  const filterDropdownRef = useRef<View>(null);

  useEffect(() => {
    const loadStoredData = async () => {
      try {
        const theme = await AsyncStorage.getItem('theme');
        setIsDarkMode(theme === 'dark' || theme === null);

        const savedColumns = await AsyncStorage.getItem('customerTableVisibleColumns');
        if (savedColumns) {
          setVisibleColumns(JSON.parse(savedColumns));
        }

        const savedFilters = await AsyncStorage.getItem('customerFilters');
        if (savedFilters) {
          setActiveFilters(JSON.parse(savedFilters));
        }
      } catch (err) {
        console.error('Failed to load stored data:', err);
      }
    };

    loadStoredData();
  }, []);

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

  useEffect(() => {
    const fetchBillingData = async () => {
      try {
        setIsLoading(true);
        const data = await getBillingRecords();
        setBillingRecords(data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch billing records:', err);
        setError('Failed to load billing records. Please try again.');
        setBillingRecords([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchBillingData();
  }, []);

  const getCityName = useMemo(() => {
    const cityMap = new Map(cities.map(c => [c.id, c.name]));
    return (cityId: number | null | undefined): string => {
      if (!cityId) return 'Unknown City';
      return cityMap.get(cityId) || `City ${cityId}`;
    };
  }, [cities]);

  const locationItems: LocationItem[] = useMemo(() => {
    const items: LocationItem[] = [
      {
        id: 'all',
        name: 'All',
        count: billingRecords.length
      }
    ];
    
    cities.forEach((city) => {
      const cityCount = billingRecords.filter(record => record.cityId === city.id).length;
      items.push({
        id: String(city.id),
        name: city.name,
        count: cityCount
      });
    });

    return items;
  }, [cities, billingRecords]);

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
      case 'status':
        return (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Circle 
              size={12}
              color={record.onlineStatus === 'Online' ? '#4ade80' : '#9ca3af'}
              fill={record.onlineStatus === 'Online' ? '#4ade80' : '#9ca3af'}
            />
            <Text style={{ 
              fontSize: 12, 
              color: record.onlineStatus === 'Online' ? '#4ade80' : '#9ca3af' 
            }}>
              {record.onlineStatus}
            </Text>
          </View>
        );
      case 'billingStatus':
        return <Text>{record.billingStatus || 'Active'}</Text>;
      case 'accountNo':
        return <Text style={{ color: '#f87171' }}>{record.applicationId}</Text>;
      case 'dateInstalled':
        return <Text>{record.dateInstalled || '-'}</Text>;
      case 'customerName':
        return <Text>{record.customerName}</Text>;
      case 'address':
        return <Text numberOfLines={1}>{record.address}</Text>;
      case 'contactNumber':
        return <Text>{record.contactNumber || '-'}</Text>;
      case 'emailAddress':
        return <Text>{record.emailAddress || '-'}</Text>;
      case 'plan':
        return <Text>{record.plan || '-'}</Text>;
      case 'balance':
        return <Text>{`₱ ${record.balance.toFixed(2)}`}</Text>;
      case 'username':
        return <Text>{record.username || '-'}</Text>;
      case 'connectionType':
        return <Text>{record.connectionType || '-'}</Text>;
      case 'routerModel':
        return <Text>{record.routerModel || '-'}</Text>;
      case 'routerModemSN':
        return <Text>{record.routerModemSN || '-'}</Text>;
      case 'lcpnap':
        return <Text>{record.lcpnap || '-'}</Text>;
      case 'port':
        return <Text>{record.port || '-'}</Text>;
      case 'vlan':
        return <Text>{record.vlan || '-'}</Text>;
      case 'billingDay':
        return <Text>{record.billingDay === 0 ? 'Every end of month' : (record.billingDay || '-')}</Text>;
      case 'totalPaid':
        return <Text>{`₱ ${record.totalPaid?.toFixed(2) || '0.00'}`}</Text>;
      case 'provider':
        return <Text>{record.provider || '-'}</Text>;
      case 'lcp':
        return <Text>{record.lcp || '-'}</Text>;
      case 'nap':
        return <Text>{record.nap || '-'}</Text>;
      case 'modifiedBy':
        return <Text>{record.modifiedBy || '-'}</Text>;
      case 'modifiedDate':
        return <Text>{record.modifiedDate || '-'}</Text>;
      case 'barangay':
        return <Text>{record.barangay || '-'}</Text>;
      case 'city':
        return <Text>{record.city || '-'}</Text>;
      case 'region':
        return <Text>{record.region || '-'}</Text>;
      case 'lcpnapport':
        return <Text>{(record as any).lcpnapport || '-'}</Text>;
      case 'usageType':
        return <Text>{(record as any).usageType || '-'}</Text>;
      case 'referredBy':
        return <Text>{(record as any).referredBy || '-'}</Text>;
      case 'secondContactNumber':
        return <Text>{(record as any).secondContactNumber || '-'}</Text>;
      case 'referrersAccountNumber':
        return <Text>{(record as any).referrersAccountNumber || '-'}</Text>;
      case 'group':
        return <Text>{(record as any).group || '-'}</Text>;
      case 'mikrotikId':
        return <Text>{(record as any).mikrotikId || '-'}</Text>;
      case 'sessionIP':
        return <Text>{(record as any).sessionIP || '-'}</Text>;
      case 'referralContactNo':
        return <Text>{(record as any).referralContactNo || '-'}</Text>;
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
        return <Text>-</Text>;
      case 'computedAddress':
        return <Text>{(record as any).computedAddress || 
               (record.address ? (record.address.length > 25 ? `${record.address.substring(0, 25)}...` : record.address) : '-')}</Text>;
      case 'computedStatus':
        return <Text>{(record as any).computedStatus || 
               `${record.status || 'Inactive'} | P ${record.balance.toFixed(0)}`}</Text>;
      case 'computedAccountNo':
        return <Text>{(record as any).computedAccountNo || 
               `${record.applicationId} | ${record.customerName}${record.address ? (' | ' + record.address.substring(0, 10) + '...') : ''}`}</Text>;
      default:
        return <Text>-</Text>;
    }
  };

  const handleRefresh = async () => {
    try {
      setIsLoading(true);
      const data = await getBillingRecords();
      setBillingRecords(data);
      setError(null);
    } catch (err) {
      console.error('Failed to refresh billing records:', err);
      setError('Failed to refresh billing records. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateSampleData = async () => {
    Alert.alert(
      'Generate Sample Data',
      'Generate sample SOA and invoices for ALL accounts in database (regardless of billing day, status, or any restrictions)?\n\nThis will process EVERY account that has a date_installed value.\n\n✨ NEW: Includes PDF generation + Email queue + SMS notifications!\n\nContinue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'OK',
          onPress: async () => {
            setIsLoading(true);
            
            const API_BASE_URL = 'https://backend.atssfiber.ph/api';
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
                  Alert.alert('Error', `Generation failed for account ${firstError.account_no}: ${firstError.error}`);
                } else {
                  Alert.alert('Error', result.message || 'Generation failed');
                }
                setError(result.message);
                setIsLoading(false);
                return;
              }
              
              const data = await getBillingRecords();
              setBillingRecords(data);
              setError(null);
              
              const invoiceCount = result.data?.invoices?.success || 0;
              const soaCount = result.data?.statements?.success || 0;
              const accountCount = result.data?.total_accounts || 0;
              const invoiceErrors = result.data?.invoices?.failed || 0;
              const soaErrors = result.data?.statements?.failed || 0;
              
              const invoiceNotifications = result.data?.invoices?.notifications?.length || 0;
              const soaNotifications = result.data?.statements?.notifications?.length || 0;
              
              if (invoiceErrors > 0 || soaErrors > 0) {
                const errors = [
                  ...(result.data?.invoices?.errors || []),
                  ...(result.data?.statements?.errors || [])
                ];
                console.error('Generation errors:', errors);
                Alert.alert('Success', `Generated ${invoiceCount} invoices and ${soaCount} statements for ${accountCount} accounts.\n\nFailed: ${invoiceErrors} invoices, ${soaErrors} statements.\n\nNotifications queued: ${invoiceNotifications + soaNotifications}\n\nCheck console for errors.`);
              } else {
                Alert.alert('Success', `✅ Success!\n\nGenerated:\n- ${invoiceCount} invoices\n- ${soaCount} statements\n- ${accountCount} accounts processed\n\n📧 Notifications:\n- ${invoiceNotifications + soaNotifications} emails queued\n- ${invoiceNotifications + soaNotifications} SMS sent\n- ${invoiceNotifications + soaNotifications} PDFs created\n\n(All accounts with date_installed, regardless of billing day or status)`);
              }
            } catch (err) {
              console.error('Generation failed:', err);
              setError('Generation failed. Please try again.');
              Alert.alert('Error', 'Generation failed: ' + (err as Error).message);
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleToggleColumn = async (columnKey: string) => {
    const newColumns = visibleColumns.includes(columnKey)
      ? visibleColumns.filter(key => key !== columnKey)
      : [...visibleColumns, columnKey];
    setVisibleColumns(newColumns);
    await AsyncStorage.setItem('customerTableVisibleColumns', JSON.stringify(newColumns));
  };

  const handleSelectAllColumns = async () => {
    const allKeys = allColumns.map(col => col.key);
    setVisibleColumns(allKeys);
    await AsyncStorage.setItem('customerTableVisibleColumns', JSON.stringify(allKeys));
  };

  const handleDeselectAllColumns = async () => {
    setVisibleColumns([]);
    await AsyncStorage.setItem('customerTableVisibleColumns', JSON.stringify([]));
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

  return (
    <View style={{ 
      height: '100%',
      flexDirection: 'row',
      overflow: 'hidden',
      backgroundColor: isDarkMode ? '#030712' : '#f9fafb'
    }}>
      <View style={{ 
        width: sidebarWidth,
        borderRightWidth: 1,
        flexShrink: 0,
        flexDirection: 'column',
        position: 'relative',
        backgroundColor: isDarkMode ? '#111827' : '#ffffff',
        borderRightColor: isDarkMode ? '#374151' : '#e5e7eb'
      }}>
        <View style={{ 
          padding: 16,
          borderBottomWidth: 1,
          flexShrink: 0,
          borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb'
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ 
              fontSize: 18,
              fontWeight: '600',
              color: isDarkMode ? '#ffffff' : '#111827'
            }}>
              Customer Details
            </Text>
          </View>
        </View>
        <ScrollView style={{ flex: 1 }}>
          {locationItems.map((location) => (
            <Pressable
              key={location.id}
              onPress={() => setSelectedLocation(location.id)}
              style={({ pressed }) => ({
                width: '100%',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 16,
                paddingVertical: 12,
                fontSize: 14,
                backgroundColor: selectedLocation === location.id
                  ? (colorPalette?.primary ? `${colorPalette.primary}33` : 'rgba(249, 115, 22, 0.2)')
                  : pressed
                    ? (isDarkMode ? '#1f2937' : '#f3f4f6')
                    : 'transparent'
              })}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <CreditCard size={16} color={selectedLocation === location.id ? (colorPalette?.primary || '#fb923c') : (isDarkMode ? '#d1d5db' : '#6b7280')} style={{ marginRight: 8 }} />
                <Text style={{ 
                  textTransform: 'capitalize',
                  color: selectedLocation === location.id ? (colorPalette?.primary || '#fb923c') : (isDarkMode ? '#d1d5db' : '#6b7280')
                }}>
                  {location.name}
                </Text>
              </View>
              {location.count > 0 && (
                <View style={{
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 9999,
                  fontSize: 12,
                  backgroundColor: selectedLocation === location.id ? (colorPalette?.primary || '#ea580c') : (isDarkMode ? '#374151' : '#e5e7eb')
                }}>
                  <Text style={{ color: selectedLocation === location.id ? '#ffffff' : (isDarkMode ? '#d1d5db' : '#6b7280') }}>
                    {location.count}
                  </Text>
                </View>
              )}
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={{ 
        flex: 1,
        overflow: 'hidden',
        backgroundColor: isDarkMode ? '#111827' : '#f9fafb'
      }}>
        <View style={{ flexDirection: 'column', height: '100%' }}>
          <View style={{ 
            padding: 16,
            borderBottomWidth: 1,
            flexShrink: 0,
            backgroundColor: isDarkMode ? '#111827' : '#ffffff',
            borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb'
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ position: 'relative', flex: 1 }}>
                <TextInput
                  placeholder="Search customer records..."
                  placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
                  value={searchQuery}
                  onChangeText={(text) => setSearchQuery(text)}
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
                  style={({ pressed }) => ({
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 4,
                    fontSize: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: pressed ? (isDarkMode ? '#374151' : '#e5e7eb') : 'transparent'
                  })}
                >
                  <Filter size={20} color={isDarkMode ? '#ffffff' : '#111827'} />
                </Pressable>
                {displayMode === 'table' && (
                  <View style={{ position: 'relative' }} ref={filterDropdownRef}>
                    <Pressable
                      style={({ pressed }) => ({
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 4,
                        fontSize: 14,
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: pressed ? (isDarkMode ? '#374151' : '#e5e7eb') : 'transparent'
                      })}
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
                          borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb'
                        }}>
                          <Text style={{ 
                            fontSize: 14,
                            fontWeight: '500',
                            color: isDarkMode ? '#ffffff' : '#111827'
                          }}>
                            Column Visibility
                          </Text>
                          <View style={{ flexDirection: 'row', gap: 8 }}>
                            <Pressable onPress={handleSelectAllColumns}>
                              <Text style={{ 
                                fontSize: 12,
                                color: colorPalette?.primary || '#f97316'
                              }}>
                                Select All
                              </Text>
                            </Pressable>
                            <Text style={{ color: isDarkMode ? '#4b5563' : '#9ca3af' }}>|</Text>
                            <Pressable onPress={handleDeselectAllColumns}>
                              <Text style={{ 
                                fontSize: 12,
                                color: colorPalette?.primary || '#f97316'
                              }}>
                                Deselect All
                              </Text>
                            </Pressable>
                          </View>
                        </View>
                        <ScrollView style={{ flex: 1 }}>
                          {allColumns.map((column) => (
                            <Pressable
                              key={column.key}
                              onPress={() => handleToggleColumn(column.key)}
                              style={({ pressed }) => ({
                                flexDirection: 'row',
                                alignItems: 'center',
                                paddingHorizontal: 16,
                                paddingVertical: 8,
                                fontSize: 14,
                                backgroundColor: pressed ? (isDarkMode ? '#374151' : '#f3f4f6') : 'transparent'
                              })}
                            >
                              <View style={{ 
                                width: 16,
                                height: 16,
                                borderRadius: 4,
                                marginRight: 12,
                                borderWidth: 1,
                                borderColor: isDarkMode ? '#4b5563' : '#d1d5db',
                                backgroundColor: visibleColumns.includes(column.key) ? (colorPalette?.primary || '#ea580c') : (isDarkMode ? '#374151' : '#ffffff'),
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                {visibleColumns.includes(column.key) && (
                                  <Text style={{ color: '#ffffff', fontSize: 12 }}>✓</Text>
                                )}
                              </View>
                              <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>{column.label}</Text>
                            </Pressable>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>
                )}
                <View style={{ position: 'relative', zIndex: 50 }} ref={dropdownRef}>
                  <Pressable
                    style={({ pressed }) => ({
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 4,
                      fontSize: 14,
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: pressed ? (isDarkMode ? '#374151' : '#e5e7eb') : 'transparent'
                    })}
                    onPress={() => setDropdownOpen(!dropdownOpen)}
                  >
                    <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>
                      {displayMode === 'card' ? 'Card View' : 'Table View'}
                    </Text>
                    <Text style={{ color: isDarkMode ? '#ffffff' : '#111827', marginLeft: 4 }}>▼</Text>
                  </Pressable>
                  {dropdownOpen && (
                    <View style={{ 
                      position: 'absolute',
                      marginTop: 4,
                      width: 144,
                      borderRadius: 4,
                      backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                      borderWidth: 1,
                      borderColor: isDarkMode ? '#374151' : '#e5e7eb'
                    }}>
                      <Pressable
                        onPress={() => {
                          setDisplayMode('card');
                          setDropdownOpen(false);
                        }}
                        style={({ pressed }) => ({
                          width: '100%',
                          paddingHorizontal: 16,
                          paddingVertical: 8,
                          fontSize: 14,
                          backgroundColor: pressed ? (isDarkMode ? '#374151' : '#f3f4f6') : 'transparent'
                        })}
                      >
                        <Text style={{ 
                          color: displayMode === 'card' ? (colorPalette?.primary || '#f97316') : (isDarkMode ? '#ffffff' : '#111827')
                        }}>
                          Card View
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          setDisplayMode('table');
                          setDropdownOpen(false);
                        }}
                        style={({ pressed }) => ({
                          width: '100%',
                          paddingHorizontal: 16,
                          paddingVertical: 8,
                          fontSize: 14,
                          backgroundColor: pressed ? (isDarkMode ? '#374151' : '#f3f4f6') : 'transparent'
                        })}
                      >
                        <Text style={{ 
                          color: displayMode === 'table' ? (colorPalette?.primary || '#f97316') : (isDarkMode ? '#ffffff' : '#111827')
                        }}>
                          Table View
                        </Text>
                      </Pressable>
                    </View>
                  )}
                </View>
                <Pressable
                  onPress={handleGenerateSampleData}
                  disabled={isLoading}
                  style={({ pressed }) => ({
                    backgroundColor: isLoading ? '#4b5563' : pressed ? '#15803d' : '#16a34a',
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 4,
                    fontSize: 14
                  })}
                >
                  <Text style={{ color: '#ffffff' }}>
                    {isLoading ? 'Generating...' : 'Generate Sample Data'}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleRefresh}
                  disabled={isLoading}
                  style={({ pressed }) => ({
                    backgroundColor: isLoading ? '#4b5563' : pressed ? (colorPalette?.accent || '#c2410c') : (colorPalette?.primary || '#ea580c'),
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 4,
                    fontSize: 14,
                    flexDirection: 'row',
                    alignItems: 'center'
                  })}
                >
                  <RefreshCw size={20} color="#ffffff" />
                </Pressable>
              </View>
            </View>
          </View>
          
          <View style={{ flex: 1, overflow: 'hidden' }}>
            <ScrollView style={{ height: '100%' }}>
              {isLoading ? (
                <View style={{ 
                  paddingHorizontal: 16,
                  paddingVertical: 48,
                  alignItems: 'center'
                }}>
                  <ActivityIndicator size="large" color={colorPalette?.primary || '#ea580c'} />
                  <Text style={{ 
                    marginTop: 16,
                    color: isDarkMode ? '#9ca3af' : '#6b7280'
                  }}>
                    Loading customer records...
                  </Text>
                </View>
              ) : error ? (
                <View style={{ 
                  paddingHorizontal: 16,
                  paddingVertical: 48,
                  alignItems: 'center'
                }}>
                  <Text style={{ color: isDarkMode ? '#f87171' : '#dc2626' }}>{error}</Text>
                  <Pressable 
                    onPress={handleRefresh}
                    style={{ 
                      marginTop: 16,
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 4,
                      backgroundColor: isDarkMode ? '#374151' : '#e5e7eb'
                    }}
                  >
                    <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>Retry</Text>
                  </Pressable>
                </View>
              ) : displayMode === 'card' ? (
                filteredBillingRecords.length > 0 ? (
                  <View>
                    {filteredBillingRecords.map((record) => (
                      <Pressable
                        key={record.id}
                        onPress={() => handleRecordClick(record)}
                        style={({ pressed }) => ({
                          paddingHorizontal: 16,
                          paddingVertical: 12,
                          borderBottomWidth: 1,
                          borderBottomColor: isDarkMode ? '#1f2937' : '#e5e7eb',
                          backgroundColor: selectedCustomer?.billingAccount?.accountNo === record.applicationId 
                            ? (isDarkMode ? '#1f2937' : '#f3f4f6')
                            : pressed
                              ? (isDarkMode ? '#1f2937' : '#f3f4f6')
                              : 'transparent'
                        })}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={{ 
                              color: '#f87171',
                              fontWeight: '500',
                              fontSize: 14,
                              marginBottom: 4
                            }}>
                              {record.applicationId} | {record.customerName} | {record.address}
                            </Text>
                            <Text style={{ 
                              fontSize: 14,
                              color: isDarkMode ? '#ffffff' : '#111827'
                            }}>
                              {record.status} | ₱ {record.balance.toFixed(2)}
                            </Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 16, flexShrink: 0 }}>
                            <Circle 
                              size={12}
                              color={record.onlineStatus === 'Online' ? '#4ade80' : '#9ca3af'}
                              fill={record.onlineStatus === 'Online' ? '#4ade80' : '#9ca3af'}
                            />
                            <Text style={{ 
                              fontSize: 14,
                              color: record.onlineStatus === 'Online' ? '#4ade80' : '#9ca3af'
                            }}>
                              {record.onlineStatus}
                            </Text>
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
                      color: isDarkMode ? '#9ca3af' : '#6b7280'
                    }}>
                      No customer records found matching your filters
                    </Text>
                  </View>
                )
              ) : (
                <ScrollView horizontal>
                  <View>
                    <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb', backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6' }}>
                      {filteredColumns.map((column, index) => (
                        <Pressable
                          key={column.key}
                          onPress={() => handleSort(column.key)}
                          style={{
                            paddingVertical: 12,
                            paddingHorizontal: 12,
                            backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6',
                            width: column.width,
                            borderRightWidth: index < filteredColumns.length - 1 ? 1 : 0,
                            borderRightColor: isDarkMode ? '#374151' : '#e5e7eb',
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }}
                        >
                          <Text style={{ color: isDarkMode ? '#9ca3af' : '#6b7280', fontWeight: '400' }}>
                            {column.label}
                          </Text>
                          {sortColumn === column.key && (
                            sortDirection === 'desc' ? (
                              <ArrowDown size={16} color={colorPalette?.accent || '#fb923c'} />
                            ) : (
                              <ArrowUp size={16} color={colorPalette?.accent || '#fb923c'} />
                            )
                          )}
                        </Pressable>
                      ))}
                    </View>
                    {filteredBillingRecords.length > 0 ? (
                      filteredBillingRecords.map((record) => (
                        <Pressable 
                          key={record.id}
                          onPress={() => handleRecordClick(record)}
                          style={({ pressed }) => ({
                            flexDirection: 'row',
                            borderBottomWidth: 1,
                            borderBottomColor: isDarkMode ? '#1f2937' : '#e5e7eb',
                            backgroundColor: selectedCustomer?.billingAccount?.accountNo === record.applicationId 
                              ? (isDarkMode ? '#1f2937' : '#f3f4f6')
                              : pressed
                                ? (isDarkMode ? '#111827' : '#f9fafb')
                                : 'transparent'
                          })}
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
                              <View style={{ overflow: 'hidden' }}>
                                {renderCellValue(record, column.key)}
                              </View>
                            </View>
                          ))}
                        </Pressable>
                      ))
                    ) : (
                      <View style={{ paddingHorizontal: 16, paddingVertical: 48, alignItems: 'center' }}>
                        <Text style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>
                          No customer records found matching your filters
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

      {(selectedCustomer || isLoadingDetails) && (
        <View style={{ flexShrink: 0, overflow: 'hidden' }}>
          {isLoadingDetails ? (
            <View style={{ 
              width: 600,
              height: '100%',
              alignItems: 'center',
              justifyContent: 'center',
              borderLeftWidth: 1,
              backgroundColor: isDarkMode ? '#111827' : '#ffffff',
              borderLeftColor: isDarkMode ? 'rgba(255, 255, 255, 0.3)' : '#d1d5db'
            }}>
              <View style={{ alignItems: 'center' }}>
                <ActivityIndicator size="large" color={colorPalette?.primary || '#ea580c'} style={{ marginBottom: 16 }} />
                <Text style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>Loading details...</Text>
              </View>
            </View>
          ) : selectedCustomer ? (
            <BillingDetails
              billingRecord={convertCustomerDataToBillingDetail(selectedCustomer)}
              onlineStatusRecords={[]}
              onClose={handleCloseDetails}
            />
          ) : null}
        </View>
      )}

      <CustomerFunnelFilter
        isOpen={isFunnelFilterOpen}
        onClose={() => setIsFunnelFilterOpen(false)}
        onApplyFilters={async (filters) => {
          console.log('Applied filters:', filters);
          setActiveFilters(filters);
          await AsyncStorage.setItem('customerFilters', JSON.stringify(filters));
          setIsFunnelFilterOpen(false);
        }}
        currentFilters={activeFilters}
      />
    </View>
  );
};

export default Customer;
