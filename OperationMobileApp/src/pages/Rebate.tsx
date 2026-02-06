import React, { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import RebateFormModal from '../modals/RebateFormModal';
import RebateDetails from '../components/RebateDetails';
import apiClient from '../config/api';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';
import BillingDetails from '../components/CustomerDetails';
import { getCustomerDetail, CustomerDetailData } from '../services/customerDetailService';
import { BillingDetailRecord } from '../types/billing';

interface RebateRecord {
  id: number;
  number_of_dates: number;
  rebate_type: string;
  selected_rebate: string;
  month: string;
  status: string;
  created_by: string;
  modified_by: string | null;
  modified_date: string;
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

const Rebate: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [selectedDate, setSelectedDate] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [rebateRecords, setRebateRecords] = useState<RebateRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedRebate, setSelectedRebate] = useState<RebateRecord | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState<number>(256);
  const [isResizingSidebar, setIsResizingSidebar] = useState<boolean>(false);
  const sidebarStartXRef = useRef<number>(0);
  const sidebarStartWidthRef = useRef<number>(0);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetailData | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 50;

  const dateItems = [
    { date: 'All', id: '' },
  ];

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
    fetchRebateData();
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

  const fetchRebateData = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get<RebateRecord[]>('/rebates');
      console.log('Rebate API response:', response.data);
      setRebateRecords(response.data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch Rebate records:', err);
      setError('Failed to load Rebate records. Please try again.');
      setRebateRecords([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    await fetchRebateData();
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

  const filteredRecords = rebateRecords.filter(record => {
    const matchesSearch = searchQuery === '' ||
      record.selected_rebate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.rebate_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.month.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Reset page when search or date filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedDate]);

  const paginatedRecords = React.useMemo(() => {
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

  return (
    <div className={`h-full flex flex-col md:flex-row overflow-hidden pb-16 md:pb-0 ${isDarkMode ? 'bg-gray-950' : 'bg-gray-50'
      }`}>
      <div className={`hidden md:flex border-r flex-shrink-0 flex flex-col relative ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
        }`} style={{ width: `${sidebarWidth}px` }}>
        <div className={`p-4 border-b flex-shrink-0 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'
          }`}>
          <div className="flex items-center justify-between mb-1">
            <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>Rebates</h2>
            <div>
              <button
                className="flex items-center space-x-1 text-white px-3 py-1 rounded text-sm transition-colors"
                onClick={() => setIsModalOpen(true)}
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
                <span className="font-bold">+</span>
                <span>Add</span>
              </button>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {dateItems.map((item, index) => (
            <button
              key={index}
              onClick={() => setSelectedDate(item.date)}
              className={`w-full flex items-center px-4 py-3 text-sm transition-colors ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
                } ${selectedDate === item.date
                  ? ''
                  : isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}
              style={selectedDate === item.date ? {
                backgroundColor: colorPalette?.primary ? `${colorPalette.primary}33` : 'rgba(249, 115, 22, 0.2)',
                color: colorPalette?.primary || '#fb923c'
              } : {}}
            >
              <span className="text-sm font-medium flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
                {item.date}
              </span>
            </button>
          ))}
        </div>

        {/* Resize Handle */}
        <div
          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize transition-colors z-10"
          onMouseDown={handleMouseDownSidebarResize}
          style={{
            backgroundColor: isResizingSidebar ? (colorPalette?.primary || '#f97316') : 'transparent'
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

      <div className={`overflow-hidden ${selectedRebate ? 'flex-1' : 'flex-1'} ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
        }`}>
        <div className="flex flex-col h-full">
          <div className={`p-4 border-b flex-shrink-0 ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
            }`}>
            <div className="flex flex-col space-y-3">
              <div className="flex items-center space-x-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Search Rebate records..."
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
                <button
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className="text-white px-4 py-2 rounded text-sm transition-colors disabled:bg-gray-600"
                  style={{
                    backgroundColor: isLoading ? '#4b5563' : (colorPalette?.primary || '#ea580c')
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
                  {isLoading ? 'Loading...' : 'Refresh'}
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
                  <p className="mt-4">Loading Rebate records...</p>
                </div>
              ) : error ? (
                <div className={`px-4 py-12 text-center ${isDarkMode ? 'text-red-400' : 'text-red-600'
                  }`}>
                  <p>{error}</p>
                  <button
                    onClick={handleRefresh}
                    className={`mt-4 px-4 py-2 rounded ${isDarkMode
                      ? 'bg-gray-700 hover:bg-gray-600 text-white'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                      }`}>
                    Retry
                  </button>
                </div>
              ) : filteredRecords.length > 0 ? (
                <table className={`min-w-full divide-y text-sm ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'
                  }`}>
                  <thead className={`sticky top-0 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'
                    }`}>
                    <tr>
                      <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>ID</th>
                      <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>Rebate Type</th>
                      <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>Selected Rebate</th>
                      <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>Month</th>
                      <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>Number of Dates</th>
                      <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>Status</th>
                      <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>Approved By</th>
                      <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>Modified Date</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDarkMode ? 'bg-gray-900 divide-gray-800' : 'bg-white divide-gray-200'
                    }`}>
                    {paginatedRecords.map((record) => (
                      <tr
                        key={record.id}
                        onClick={() => setSelectedRebate(record)}
                        className={`cursor-pointer ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
                          }`}
                      >
                        <td className={`px-4 py-3 whitespace-nowrap ${isDarkMode ? 'text-gray-300' : 'text-gray-900'
                          }`}>{record.id}</td>
                        <td className={`px-4 py-3 whitespace-nowrap capitalize ${isDarkMode ? 'text-gray-300' : 'text-gray-900'
                          }`}>{record.rebate_type}</td>
                        <td className={`px-4 py-3 whitespace-nowrap ${isDarkMode ? 'text-gray-300' : 'text-gray-900'
                          }`}>{record.selected_rebate}</td>
                        <td className={`px-4 py-3 whitespace-nowrap ${isDarkMode ? 'text-gray-300' : 'text-gray-900'
                          }`}>{record.month}</td>
                        <td className={`px-4 py-3 whitespace-nowrap ${isDarkMode ? 'text-gray-300' : 'text-gray-900'
                          }`}>{record.number_of_dates}</td>
                        <td className={`px-4 py-3 whitespace-nowrap ${isDarkMode ? 'text-gray-300' : 'text-gray-900'
                          }`}>{record.status}</td>
                        <td className={`px-4 py-3 whitespace-nowrap ${isDarkMode ? 'text-gray-300' : 'text-gray-900'
                          }`}>{record.modified_by || '-'}</td>
                        <td className={`px-4 py-3 whitespace-nowrap ${isDarkMode ? 'text-gray-300' : 'text-gray-900'
                          }`}>{record.modified_date || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className={`h-full flex flex-col items-center justify-center ${isDarkMode ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                  <h1 className="text-2xl mb-4" style={{ color: colorPalette?.primary || '#f97316' }}>Rebate Component</h1>
                  <p className="text-lg">No Rebate records found</p>
                </div>
              )}
            </div>
            {!isLoading && !error && filteredRecords.length > 0 && <PaginationControls />}
          </div>
        </div>
      </div>

      {selectedRebate && (
        <div className="flex-shrink-0 overflow-hidden">
          <RebateDetails
            rebate={selectedRebate as any}
            onClose={() => {
              setSelectedRebate(null);
              handleRefresh();
            }}
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

      <RebateFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={() => {
          setIsModalOpen(false);
          handleRefresh();
        }}
      />
    </div>
  );
};

export default Rebate;
