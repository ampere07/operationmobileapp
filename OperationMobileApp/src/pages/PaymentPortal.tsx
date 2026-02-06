import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Globe, Search, ChevronDown } from 'lucide-react';
import PaymentPortalDetails from '../components/PaymentPortalDetails';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';
import { paymentPortalLogsService, PaymentPortalLog } from '../services/paymentPortalLogsService';
import { usePaymentPortalContext, PaymentPortalRecord } from '../contexts/PaymentPortalContext';
import BillingDetails from '../components/CustomerDetails';
import { getCustomerDetail, CustomerDetailData } from '../services/customerDetailService';
import { BillingDetailRecord } from '../types/billing';

// Interfaces for payment portal data (PaymentPortalRecord is imported now)
// Removed local PaymentPortalRecord interface

interface LocationItem {
  id: string;
  name: string;
  count: number;
}

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

const PaymentPortal: React.FC = () => {
  const { paymentPortalRecords: records, isLoading: loading, error, silentRefresh } = usePaymentPortalContext();
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRecord, setSelectedRecord] = useState<PaymentPortalRecord | null>(null);
  // Removed local records, loading, error state
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetailData | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Format date function
  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return 'No date';
    try {
      return new Date(dateStr).toLocaleString();
    } catch (e) {
      return dateStr;
    }
  };

  // Format currency function
  const formatCurrency = (amount: number) => {
    return `₱${amount.toFixed(2)}`;
  };

  // Fetch data from API (placeholder for now)
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
    silentRefresh();
  }, [silentRefresh]);


  // Generate location items with counts based on real data
  const locationItems: LocationItem[] = [
    {
      id: 'all',
      name: 'All',
      count: records.length
    }
  ];

  // Add unique locations from the data
  const locationSet = new Set<string>();
  records.forEach(record => {
    const location = record.city?.toLowerCase();
    if (location) {
      locationSet.add(location);
    }
  });
  const uniqueLocations = Array.from(locationSet);

  uniqueLocations.forEach(location => {
    if (location) {
      locationItems.push({
        id: location,
        name: location.charAt(0).toUpperCase() + location.slice(1),
        count: records.filter(record =>
          record.city?.toLowerCase() === location).length
      });
    }
  });

  // Filter records based on location and search query
  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      const recordLocation = record.city?.toLowerCase();
      const matchesLocation = selectedLocation === 'all' || recordLocation === selectedLocation;

      const matchesSearch = searchQuery === '' ||
        record.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (record.accountNo || record.account_id?.toString()).toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.reference_no?.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesLocation && matchesSearch;
    });
  }, [records, selectedLocation, searchQuery]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedLocation, searchQuery]);

  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRecords, currentPage]);

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const PaginationControls = () => {
    if (totalPages <= 1) return null;

    return (
      <div className={`flex items-center justify-between px-4 py-3 border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
        <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredRecords.length)}</span> of <span className="font-medium">{filteredRecords.length}</span> results
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

  const handleRowClick = (record: PaymentPortalRecord) => {
    setSelectedRecord(record);
    setSelectedCustomer(null); // Clear customer view when switching records
  };

  const handleViewCustomer = async (accountNo: string) => {
    setIsLoadingDetails(true);
    try {
      const detail = await getCustomerDetail(accountNo);
      if (detail) {
        setSelectedCustomer(detail);
      }
    } catch (err) {
      console.error('Error fetching customer details:', err);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // Status text color component
  const StatusText = ({ status }: { status: string }) => {
    let textColor = '';

    switch (status.toLowerCase()) {
      case 'completed':
      case 'success':
      case 'paid':
        textColor = 'text-green-500';
        break;
      case 'pending':
      case 'processing':
      case 'queued':
        textColor = 'text-yellow-500';
        break;
      case 'failed':
      case 'cancelled':
        textColor = 'text-red-500';
        break;
      default:
        textColor = 'text-gray-400';
    }

    return (
      <span className={`${textColor} capitalize`}>
        {status}
      </span>
    );
  };

  return (
    <div className={`h-full flex flex-col md:flex-row overflow-hidden pb-16 md:pb-0 ${isDarkMode ? 'bg-gray-950' : 'bg-gray-50'
      }`}>
      {/* Location Sidebar Container */}
      <div className={`hidden md:flex w-64 border-r flex-shrink-0 flex flex-col ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
        }`}>
        <div className={`p-4 border-b flex-shrink-0 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'
          }`}>
          <div className="flex items-center justify-between mb-1">
            <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>Payment Portal</h2>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {locationItems.map((location) => (
            <button
              key={location.id}
              onClick={() => {
                setSelectedLocation(location.id);
              }}
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
                <Globe className="h-4 w-4 mr-2" />
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
      </div>

      {/* Payment Portal Records List - Shrinks when detail view is shown */}
      <div className={`overflow-hidden flex-1 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
        }`}>
        <div className="flex flex-col h-full">
          {/* Search Bar */}
          <div className={`p-4 border-b flex-shrink-0 ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
            }`}>
            <div className="flex items-center space-x-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search payment portal records..."
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
              <button className={`px-4 py-2 rounded flex items-center ${isDarkMode
                ? 'bg-gray-800 text-white border border-gray-700'
                : 'bg-gray-200 text-gray-900 border border-gray-300'
                }`}>
                <span className="mr-2">Filter</span>
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-x-auto overflow-y-auto">
              {loading ? (
                <div className={`px-4 py-12 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  <div className="animate-pulse flex flex-col items-center">
                    <div className={`h-4 w-1/3 rounded mb-4 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
                    <div className={`h-4 w-1/2 rounded ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
                  </div>
                  <p className="mt-4">Loading payment portal records...</p>
                </div>
              ) : error ? (
                <div className={`px-4 py-12 text-center ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                  <p>{error}</p>
                  <button
                    onClick={() => window.location.reload()}
                    className={`mt-4 px-4 py-2 rounded text-white ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-400 hover:bg-gray-500'}`}>
                    Retry
                  </button>
                </div>
              ) : (
                <table className={`min-w-full text-sm ${isDarkMode ? 'divide-y divide-gray-700' : 'divide-y divide-gray-200'
                  }`}>
                  <thead className={`sticky top-0 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'
                    }`}>
                    <tr>
                      <th scope="col" className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                        Date Time
                      </th>
                      <th scope="col" className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                        Status
                      </th>
                      <th scope="col" className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                        Transaction Status
                      </th>
                      <th scope="col" className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                        Account No
                      </th>
                      <th scope="col" className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                        Received Payment
                      </th>
                      <th scope="col" className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                        Reference No
                      </th>
                      <th scope="col" className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                        Contact No
                      </th>
                      <th scope="col" className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                        Account Balance
                      </th>
                      <th scope="col" className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                        Checkout ID
                      </th>
                      <th scope="col" className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                        Provider
                      </th>
                    </tr>
                  </thead>
                  <tbody className={`${isDarkMode ? 'bg-gray-900 divide-y divide-gray-800' : 'bg-white divide-y divide-gray-200'
                    }`}>
                    {paginatedRecords.length > 0 ? (
                      paginatedRecords.map((record) => (
                        <tr
                          key={record.id}
                          className={`cursor-pointer ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
                            } ${selectedRecord?.id === record.id ? (isDarkMode ? 'bg-gray-800' : 'bg-gray-100') : ''}`}
                          onClick={() => handleRowClick(record)}
                        >
                          <td className={`px-4 py-3 whitespace-nowrap ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                            {record.date_time || 'N/A'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-red-400 font-medium">
                            {record.accountNo || record.account_id}
                          </td>
                          <td className={`px-4 py-3 whitespace-nowrap font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'
                            }`}>
                            {formatCurrency(record.total_amount || 0)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <StatusText status={record.status || 'N/A'} />
                          </td>
                          <td className={`px-4 py-3 whitespace-nowrap ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                            {record.reference_no || 'N/A'}
                          </td>
                          <td className={`px-4 py-3 whitespace-nowrap ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                            {record.contactNo || 'N/A'}
                          </td>
                          <td className={`px-4 py-3 whitespace-nowrap ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                            {formatCurrency(record.accountBalance || 0)}
                          </td>
                          <td className={`px-4 py-3 whitespace-nowrap ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                            {record.checkout_id || 'N/A'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <StatusText status={record.transaction_status || 'N/A'} />
                          </td>
                          <td className={`px-4 py-3 whitespace-nowrap ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                            {record.provider || 'N/A'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={10} className={`px-4 py-12 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                          {records.length > 0
                            ? 'No payment portal records found matching your filters'
                            : 'No payment portal records found.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
            <PaginationControls />
          </div>
        </div>
      </div>

      {/* Payment Portal Detail View - Only visible when a record is selected */}
      {selectedRecord && (
        <div className="flex-shrink-0 overflow-hidden">
          <PaymentPortalDetails
            record={selectedRecord}
            onClose={() => setSelectedRecord(null)}
            onViewCustomer={handleViewCustomer}
          />
        </div>
      )}

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
              onClose={() => setSelectedCustomer(null)}
            />
          ) : null}
        </div>
      )}
    </div>
  );
};

export default PaymentPortal;
