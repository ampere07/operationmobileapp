import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Receipt, Search, ChevronDown, CheckCheck, X, Check } from 'lucide-react';
import TransactionListDetails from '../components/TransactionListDetails';
import { transactionService } from '../services/transactionService';
import LoadingModal from '../components/LoadingModal';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';
import { useTransactionContext } from '../contexts/TransactionContext';
import { Transaction } from '../types/transaction';
import BillingDetails from '../components/CustomerDetails';
import { getCustomerDetail, CustomerDetailData } from '../services/customerDetailService';
import { BillingDetailRecord } from '../types/billing';

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

interface TransactionListProps {
  onNavigate?: (section: string, extra?: string) => void;
}

const TransactionList: React.FC<TransactionListProps> = ({ onNavigate }) => {
  const { transactions, isLoading: loading, error, silentRefresh } = useTransactionContext();
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sidebarWidth, setSidebarWidth] = useState<number>(256);
  const [isResizingSidebar, setIsResizingSidebar] = useState<boolean>(false);
  const sidebarStartXRef = useRef<number>(0);
  const sidebarStartWidthRef = useRef<number>(0);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  // Local state for batch approval (kept local as it's UI functionality)
  const [isBatchApproveMode, setIsBatchApproveMode] = useState<boolean>(false);
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<string[]>([]);
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [showFailedModal, setShowFailedModal] = useState<boolean>(false);
  const [approvalMessage, setApprovalMessage] = useState<string>('');
  const [approvalDetails, setApprovalDetails] = useState<any>(null);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetailData | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;



  // Dark mode synchronization logic
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

  // Fetch color palette
  useEffect(() => {
    const fetchThemeData = async () => {
      try {
        const activePalette = await settingsColorPaletteService.getActive();
        setColorPalette(activePalette);
      } catch (err) {
        console.error('Failed to fetch color palette:', err);
      }
    };

    fetchThemeData();
  }, []);

  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return 'No date';
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch (e) {
      return dateStr;
    }
  };

  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `₱${numAmount.toFixed(2)}`;
  };


  const locationItems: LocationItem[] = [
    {
      id: 'all',
      name: 'All',
      count: transactions.length
    }
  ];

  const locationSet = new Set<string>();
  transactions.forEach(transaction => {
    const location = transaction.account?.customer?.city?.toLowerCase();
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
        count: transactions.filter(t =>
          t.account?.customer?.city?.toLowerCase() === location).length
      });
    }
  });

  const filteredTransactions = useMemo(() => {
    return transactions.filter(transaction => {
      const transactionLocation = transaction.account?.customer?.city?.toLowerCase();
      const matchesLocation = selectedLocation === 'all' || transactionLocation === selectedLocation;

      const matchesSearch = searchQuery === '' ||
        transaction.account?.customer?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.account?.account_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.reference_no?.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesLocation && matchesSearch;
    });
  }, [transactions, selectedLocation, searchQuery]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedLocation, searchQuery]);

  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredTransactions.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTransactions, currentPage]);

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);

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
          Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredTransactions.length)}</span> of <span className="font-medium">{filteredTransactions.length}</span> results
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

  const handleRowClick = (transaction: Transaction) => {
    if (isBatchApproveMode) {
      if (transaction.status.toLowerCase() === 'pending') {
        toggleTransactionSelection(transaction.id);
      }
    } else {
      console.log('Transaction clicked:', transaction);
      console.log('Customer data:', transaction.account?.customer);
      console.log('Full name:', transaction.account?.customer?.full_name);
      setSelectedTransaction(transaction);
      setSelectedCustomer(null); // Clear customer view when switching transactions
    }
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

  const toggleTransactionSelection = (transactionId: string) => {
    const transaction = transactions.find(t => t.id === transactionId);
    if (!transaction || transaction.status.toLowerCase() !== 'pending') {
      return;
    }

    setSelectedTransactionIds(prev => {
      if (prev.includes(transactionId)) {
        return prev.filter(id => id !== transactionId);
      } else {
        return [...prev, transactionId];
      }
    });
  };

  const toggleSelectAll = () => {
    const pendingTransactions = filteredTransactions.filter(t => t.status.toLowerCase() === 'pending');
    const pendingTransactionIds = pendingTransactions.map(t => t.id);

    if (selectedTransactionIds.length === pendingTransactionIds.length && pendingTransactionIds.length > 0) {
      setSelectedTransactionIds([]);
    } else {
      setSelectedTransactionIds(pendingTransactionIds);
    }
  };

  const handleCancelApprove = () => {
    setIsBatchApproveMode(false);
    setSelectedTransactionIds([]);
  };

  const handleBatchApprove = async () => {
    if (selectedTransactionIds.length === 0) {
      return;
    }

    setShowConfirmModal(true);
  };

  const confirmBatchApproval = async () => {
    setShowConfirmModal(false);

    try {
      setIsApproving(true);
      // Removed setError(null) as error is now managed by context primarily, though local error handling for this action would be ideal.
      // We'll rely on global error or modal for now.

      const result = await transactionService.batchApproveTransactions(selectedTransactionIds);

      if (result.success) {
        const successCount = result.data?.success?.length || 0;
        const failedCount = result.data?.failed?.length || 0;

        setApprovalDetails(result.data);

        if (failedCount > 0) {
          setApprovalMessage(
            `Batch approval completed with some failures: ${successCount} successful, ${failedCount} failed`
          );
          setShowFailedModal(true);
        } else {
          setApprovalMessage(
            `Successfully approved ${successCount} transaction(s)`
          );
          setShowSuccessModal(true);
        }

        setIsBatchApproveMode(false);
        setSelectedTransactionIds([]);

        // Refresh transactions using context
        await silentRefresh();
      } else {
        setApprovalMessage(result.message || 'Failed to approve transactions');
        setShowFailedModal(true);
      }
    } catch (err: any) {
      console.error('Batch approval error:', err);
      setApprovalMessage(`Failed to approve transactions: ${err.message}`);
      setShowFailedModal(true);
    } finally {
      setIsApproving(false);
    }
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

  const StatusText = ({ status }: { status: string }) => {
    let textColor = '';

    switch (status.toLowerCase()) {
      case 'done':
      case 'completed':
        textColor = 'text-green-500';
        break;
      case 'pending':
        textColor = 'text-yellow-500';
        break;
      case 'processing':
        textColor = 'text-blue-500';
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
      <div className={`hidden md:flex border-r flex-shrink-0 flex-col relative ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
        }`} style={{ width: `${sidebarWidth}px` }}>
        <div className={`p-4 border-b flex-shrink-0 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'
          }`}>
          <div className="flex items-center justify-between mb-1">
            <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>Transactions</h2>
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
                <Receipt className="h-4 w-4 mr-2" />
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

        <div
          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize transition-colors z-10"
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
          onMouseDown={handleMouseDownSidebarResize}
        />
      </div>

      <div className={`overflow-hidden flex-1 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
        }`}>
        <div className="flex flex-col h-full">
          <div className={`p-4 border-b flex-shrink-0 ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
            }`}>
            <div className="flex items-center space-x-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search transactions..."
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
                onClick={() => isBatchApproveMode ? handleCancelApprove() : setIsBatchApproveMode(true)}
                className="px-4 py-2 rounded flex items-center transition-colors text-white"
                style={{
                  backgroundColor: isBatchApproveMode ? '#dc2626' : (colorPalette?.primary || '#ea580c')
                }}
                onMouseEnter={(e) => {
                  if (isBatchApproveMode) {
                    e.currentTarget.style.backgroundColor = '#b91c1c';
                  } else if (colorPalette?.accent) {
                    e.currentTarget.style.backgroundColor = colorPalette.accent;
                  }
                }}
                onMouseLeave={(e) => {
                  if (isBatchApproveMode) {
                    e.currentTarget.style.backgroundColor = '#dc2626';
                  } else if (colorPalette?.primary) {
                    e.currentTarget.style.backgroundColor = colorPalette.primary;
                  }
                }}
              >
                {isBatchApproveMode ? (
                  <>
                    <X className="h-4 w-4 mr-2" />
                    <span>Cancel Approve</span>
                  </>
                ) : (
                  <>
                    <CheckCheck className="h-4 w-4 mr-2" />
                    <span>Batch Approve</span>
                  </>
                )}
              </button>
              {isBatchApproveMode && (
                <button
                  onClick={handleBatchApprove}
                  disabled={selectedTransactionIds.length === 0 || isApproving}
                  className={`px-4 py-2 rounded flex items-center transition-colors ${selectedTransactionIds.length === 0 || isApproving
                    ? isDarkMode
                      ? 'bg-gray-700 text-gray-500 border border-gray-600 cursor-not-allowed'
                      : 'bg-gray-300 text-gray-500 border border-gray-400 cursor-not-allowed'
                    : isDarkMode
                      ? 'bg-green-600 text-white border border-green-700 hover:bg-green-700'
                      : 'bg-green-500 text-white border border-green-600 hover:bg-green-600'
                    }`}
                >
                  <Check className="h-4 w-4 mr-2" />
                  <span>{isApproving ? 'Approving...' : `Approve (${selectedTransactionIds.length})`}</span>
                </button>
              )}
              <button className={`px-4 py-2 rounded flex items-center ${isDarkMode
                ? 'bg-gray-800 text-white border border-gray-700'
                : 'bg-gray-200 text-gray-900 border border-gray-300'
                }`}>
                <span className="mr-2">Filter</span>
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-x-auto overflow-y-auto">
              {loading ? (
                <div className={`px-4 py-12 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  <div className="animate-pulse flex flex-col items-center">
                    <div className={`h-4 w-1/3 rounded mb-4 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
                    <div className={`h-4 w-1/2 rounded ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
                  </div>
                  <p className="mt-4">Loading transactions...</p>
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
                      {isBatchApproveMode && (
                        <th className={`px-4 py-3 text-left ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                          <input
                            type="checkbox"
                            checked={
                              selectedTransactionIds.length > 0 &&
                              selectedTransactionIds.length === filteredTransactions.filter(t => t.status.toLowerCase() === 'pending').length &&
                              filteredTransactions.filter(t => t.status.toLowerCase() === 'pending').length > 0
                            }
                            onChange={toggleSelectAll}
                            className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                            style={{
                              accentColor: colorPalette?.primary || '#ea580c'
                            }}
                          />
                        </th>
                      )}
                      <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>Date Processed</th>
                      <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>Status</th>
                      <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>Account No.</th>
                      <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>Received Payment</th>
                      <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>Payment Method</th>
                      <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>Processed By</th>
                      <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>Full Name</th>
                      <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>OR No.</th>
                      <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>Reference No.</th>
                      <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>Remarks</th>
                      <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>Transaction Type</th>
                      <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>Image</th>
                      <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>Barangay</th>
                      <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>Contact No</th>
                      <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>Payment Date</th>
                      <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>City</th>
                      <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>Plan</th>
                      <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>Account Balance</th>
                      <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>Created At</th>
                      <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>Updated At</th>
                    </tr>
                  </thead>
                  <tbody className={`${isDarkMode ? 'bg-gray-900 divide-y divide-gray-800' : 'bg-white divide-y divide-gray-200'
                    }`}>
                    {paginatedTransactions.length > 0 ? (
                      paginatedTransactions.map((transaction) => {
                        const isSelected = selectedTransactionIds.includes(transaction.id);
                        const isPending = transaction.status.toLowerCase() === 'pending';
                        const canSelect = isBatchApproveMode && isPending;

                        return (
                          <tr
                            key={transaction.id}
                            className={`${canSelect ? 'cursor-pointer' : isBatchApproveMode ? 'cursor-not-allowed' : 'cursor-pointer'
                              } ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
                              } ${!isSelected && selectedTransaction?.id === transaction.id
                                ? (isDarkMode ? 'bg-gray-800' : 'bg-gray-100')
                                : !isSelected && isBatchApproveMode && !isPending
                                  ? (isDarkMode ? 'bg-gray-800 opacity-50' : 'bg-gray-200 opacity-50')
                                  : ''
                              }`}
                            style={isSelected ? {
                              backgroundColor: colorPalette?.primary ? `${colorPalette.primary}33` : 'rgba(249, 115, 22, 0.2)'
                            } : {}}
                            onClick={() => handleRowClick(transaction)}
                          >
                            {isBatchApproveMode && (
                              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleTransactionSelection(transaction.id)}
                                  disabled={!isPending}
                                  className={`w-4 h-4 rounded border-gray-300 ${isPending ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                                    }`}
                                  style={{
                                    accentColor: colorPalette?.primary || '#ea580c'
                                  }}
                                />
                              </td>
                            )}
                            <td className={`px-4 py-3 whitespace-nowrap ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                              }`}>{formatDate(transaction.date_processed)}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-red-400 font-medium">{transaction.account?.account_no || '-'}</td>
                            <td className={`px-4 py-3 whitespace-nowrap font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'
                              }`}>{formatCurrency(transaction.received_payment)}</td>
                            <td className={`px-4 py-3 whitespace-nowrap ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                              }`}>{transaction.payment_method}</td>
                            <td className={`px-4 py-3 whitespace-nowrap ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                              }`}>{transaction.processed_by_user || '-'}</td>
                            <td className={`px-4 py-3 whitespace-nowrap ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                              }`}>{transaction.account?.customer?.full_name || '-'}</td>
                            <td className={`px-4 py-3 whitespace-nowrap ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                              }`}>{transaction.or_no}</td>
                            <td className={`px-4 py-3 whitespace-nowrap ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                              }`}>{transaction.reference_no}</td>
                            <td className={`px-4 py-3 max-w-xs truncate ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                              }`}>{transaction.remarks || 'No remarks'}</td>
                            <td className="px-4 py-3 whitespace-nowrap"><StatusText status={transaction.status} /></td>
                            <td className={`px-4 py-3 whitespace-nowrap ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                              }`}>{transaction.transaction_type}</td>
                            <td className={`px-4 py-3 whitespace-nowrap ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                              }`}>{transaction.image_url ? 'Yes' : '-'}</td>
                            <td className={`px-4 py-3 whitespace-nowrap ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                              }`}>{transaction.account?.customer?.barangay || '-'}</td>
                            <td className={`px-4 py-3 whitespace-nowrap ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                              }`}>{transaction.account?.customer?.contact_number_primary || '-'}</td>
                            <td className={`px-4 py-3 whitespace-nowrap ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                              }`}>{formatDate(transaction.payment_date)}</td>
                            <td className={`px-4 py-3 whitespace-nowrap ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                              }`}>{transaction.account?.customer?.city || '-'}</td>
                            <td className={`px-4 py-3 whitespace-nowrap ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                              }`}>{transaction.account?.customer?.desired_plan || '-'}</td>
                            <td className={`px-4 py-3 whitespace-nowrap ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                              }`}>{formatCurrency(transaction.account?.account_balance || 0)}</td>
                            <td className={`px-4 py-3 whitespace-nowrap ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                              }`}>{formatDate(transaction.created_at)}</td>
                            <td className={`px-4 py-3 whitespace-nowrap ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                              }`}>{formatDate(transaction.updated_at)}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={isBatchApproveMode ? 21 : 20} className={`px-4 py-12 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                          {transactions.length > 0
                            ? 'No transactions found matching your filters'
                            : 'No transactions found.'}
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

      {selectedTransaction && (
        <div className="flex-shrink-0 overflow-hidden">
          <TransactionListDetails
            transaction={selectedTransaction}
            onClose={() => setSelectedTransaction(null)}
            onNavigate={onNavigate}
            onViewCustomer={handleViewCustomer}
          />
        </div>)}

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

      <LoadingModal
        isOpen={isApproving}
        message="Approving transactions..."
        percentage={50}
      />

      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-lg p-6 max-w-md w-full mx-4 border ${isDarkMode
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white border-gray-300'
            }`}>
            <h3 className={`text-xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>Confirm Batch Approval</h3>
            <p className={`mb-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
              Are you sure you want to approve {selectedTransactionIds.length} transaction(s)? This will update account balances and apply payments to invoices.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmBatchApproval}
                className="text-white px-6 py-2 rounded transition-colors"
                style={{
                  backgroundColor: colorPalette?.primary || '#22c55e'
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
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-lg p-6 max-w-md w-full mx-4 border ${isDarkMode
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white border-gray-300'
            }`}>
            <h3 className={`text-xl font-semibold mb-4 text-green-500`}>Success</h3>
            <p className={`mb-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>{approvalMessage}</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowSuccessModal(false)}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {showFailedModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-lg p-6 max-w-2xl w-full mx-4 border ${isDarkMode
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white border-gray-300'
            }`}>
            <h3 className={`text-xl font-semibold mb-4 text-red-500`}>Batch Approval Results</h3>
            <p className={`mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>{approvalMessage}</p>

            {approvalDetails && approvalDetails.failed && approvalDetails.failed.length > 0 && (
              <div className={`mb-6 p-4 rounded max-h-96 overflow-y-auto ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'
                }`}>
                <h4 className={`font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>Failed Transactions:</h4>
                <ul className="space-y-2">
                  {approvalDetails.failed.map((fail: any, index: number) => (
                    <li key={index} className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                      <span className="font-medium">ID: {fail.transaction_id}</span> - {fail.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowFailedModal(false)}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionList;
