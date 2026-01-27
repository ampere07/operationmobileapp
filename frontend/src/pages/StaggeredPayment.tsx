import React, { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import StaggeredListDetails from '../components/StaggeredListDetails';
import StaggeredInstallationFormModal from '../modals/StaggeredInstallationFormModal';
import { staggeredInstallationService } from '../services/staggeredInstallationService';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';

interface StaggeredInstallation {
  id: string;
  account_no: string;
  staggered_install_no: string;
  staggered_date: string;
  staggered_balance: number;
  months_to_pay: number;
  monthly_payment: number;
  modified_by: string;
  modified_date: string;
  user_email: string;
  remarks: string;
  status: string;
  month1: string | null;
  month2: string | null;
  month3: string | null;
  month4: string | null;
  month5: string | null;
  month6: string | null;
  month7: string | null;
  month8: string | null;
  month9: string | null;
  month10: string | null;
  month11: string | null;
  month12: string | null;
  created_at: string;
  updated_at: string;
  billing_account?: {
    id: number;
    account_no: string;
    customer: {
      full_name: string;
      contact_number_primary: string;
      barangay: string;
      city: string;
      desired_plan: string;
      address: string;
      region: string;
    };
    account_balance: number;
  };
}

const StaggeredPayment: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [selectedDate, setSelectedDate] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStaggered, setSelectedStaggered] = useState<StaggeredInstallation | null>(null);
  const [staggeredRecords, setStaggeredRecords] = useState<StaggeredInstallation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState<number>(256);
  const [isResizingSidebar, setIsResizingSidebar] = useState<boolean>(false);
  const sidebarStartXRef = useRef<number>(0);
  const sidebarStartWidthRef = useRef<number>(0);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);
  const [isStaggeredFormModalOpen, setIsStaggeredFormModalOpen] = useState<boolean>(false);

  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `₱${numAmount.toFixed(2)}`;
  };

  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return 'No date';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
      });
    } catch (e) {
      return dateStr;
    }
  };

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
    const fetchStaggeredPaymentData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log('Fetching staggered installations from API...');
        const result = await staggeredInstallationService.getAll();
        
        if (result.success && result.data) {
          setStaggeredRecords(result.data);
          console.log('Staggered installations loaded:', result.data.length);
        } else {
          throw new Error(result.message || 'Failed to fetch staggered installations');
        }
      } catch (err: any) {
        console.error('Failed to fetch staggered installations:', err);
        setError(`Failed to load staggered installations: ${err.message || 'Unknown error'}`);
        setStaggeredRecords([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchStaggeredPaymentData();
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

  const handleRefresh = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await staggeredInstallationService.getAll();
      
      if (result.success && result.data) {
        setStaggeredRecords(result.data);
        console.log('Staggered installations refreshed:', result.data.length);
      } else {
        throw new Error(result.message || 'Failed to refresh staggered installations');
      }
    } catch (err: any) {
      console.error('Failed to refresh staggered installations:', err);
      setError(`Failed to refresh: ${err.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRowClick = (staggered: StaggeredInstallation) => {
    console.log('Staggered clicked:', staggered);
    setSelectedStaggered(staggered);
  };

  const filteredRecords = staggeredRecords.filter(record => {
    const matchesSearch = searchQuery === '' || 
      record.account_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.staggered_install_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.billing_account?.customer?.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

  const StatusBadge = ({ status }: { status: string }) => {
    let colorClass = '';
    
    switch (status.toLowerCase()) {
      case 'active':
        colorClass = 'text-green-500';
        break;
      case 'pending':
        colorClass = 'text-yellow-500';
        break;
      case 'completed':
        colorClass = 'text-blue-500';
        break;
      default:
        colorClass = 'text-gray-400';
    }
    
    return (
      <span className={`${colorClass} capitalize`}>
        {status}
      </span>
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

  const handleOpenStaggeredFormModal = () => {
    setIsStaggeredFormModalOpen(true);
  };

  const handleCloseStaggeredFormModal = () => {
    setIsStaggeredFormModalOpen(false);
  };

  const handleSaveStaggered = async (formData: any) => {
    try {
      // The form modal handles the save internally, just refresh the list
      await handleRefresh();
      handleCloseStaggeredFormModal();
    } catch (error) {
      console.error('Error saving staggered installation:', error);
    }
  };

  return (
    <div className={`h-full flex overflow-hidden ${
      isDarkMode ? 'bg-gray-950' : 'bg-gray-50'
    }`}>
      <div className={`border-r flex-shrink-0 flex flex-col relative ${
        isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
      }`} style={{ width: `${sidebarWidth}px` }}>
        <div className={`p-4 border-b flex-shrink-0 ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <h2 className={`text-lg font-semibold ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>Staggered</h2>
            <div>
              <button 
                className="flex items-center space-x-1 text-white px-3 py-1 rounded text-sm transition-colors"
                onClick={handleOpenStaggeredFormModal}
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
              className={`w-full flex items-center px-4 py-3 text-sm transition-colors ${
                isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
              } ${
                selectedDate === item.date
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

      <div className={`overflow-hidden flex-1 ${
        isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <div className="flex flex-col h-full">
          <div className={`p-4 border-b flex-shrink-0 ${
            isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className="flex flex-col space-y-3">
              <div className="flex items-center space-x-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Search Staggered Payment records..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-full rounded pl-10 pr-4 py-2 focus:outline-none focus:ring-1 focus:border ${
                      isDarkMode
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
                  <Search className={`absolute left-3 top-2.5 h-4 w-4 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
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
          
          <div className="flex-1 overflow-hidden">
            <div className="h-full overflow-x-auto overflow-y-auto pb-4">
              {isLoading ? (
                <div className={`px-4 py-12 text-center ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  <div className="animate-pulse flex flex-col items-center">
                    <div className={`h-4 w-1/3 rounded mb-4 ${
                      isDarkMode ? 'bg-gray-700' : 'bg-gray-300'
                    }`}></div>
                    <div className={`h-4 w-1/2 rounded ${
                      isDarkMode ? 'bg-gray-700' : 'bg-gray-300'
                    }`}></div>
                  </div>
                  <p className="mt-4">Loading Staggered Payment records...</p>
                </div>
              ) : error ? (
                <div className={`px-4 py-12 text-center ${
                  isDarkMode ? 'text-red-400' : 'text-red-600'
                }`}>
                  <p>{error}</p>
                  <button 
                    onClick={handleRefresh}
                    className={`mt-4 px-4 py-2 rounded ${
                      isDarkMode
                        ? 'bg-gray-700 hover:bg-gray-600 text-white'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                    }`}>
                    Retry
                  </button>
                </div>
              ) : filteredRecords.length > 0 ? (
                <table className={`min-w-full divide-y text-sm ${
                  isDarkMode ? 'divide-gray-700' : 'divide-gray-200'
                }`}>
                  <thead className={`sticky top-0 ${
                    isDarkMode ? 'bg-gray-800' : 'bg-gray-100'
                  }`}>
                    <tr>
                      <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>Install No.</th>
                      <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>Account No.</th>
                      <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>Full Name</th>
                      <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>Staggered Balance</th>
                      <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>Monthly Payment</th>
                      <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>Months to Pay</th>
                      <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>Status</th>
                      <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>Staggered Date</th>
                      <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>Modified By</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${
                    isDarkMode ? 'bg-gray-900 divide-gray-800' : 'bg-white divide-gray-200'
                  }`}>
                    {filteredRecords.map((record) => (
                      <tr 
                        key={record.id}
                        className={`cursor-pointer ${
                          isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
                        } ${selectedStaggered?.id === record.id ? (isDarkMode ? 'bg-gray-800' : 'bg-gray-100') : ''}`}
                        onClick={() => handleRowClick(record)}
                      >
                        <td className={`px-4 py-3 whitespace-nowrap ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-900'
                        }`}>{record.staggered_install_no}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-red-400 font-medium">{record.account_no}</td>
                        <td className={`px-4 py-3 whitespace-nowrap ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-900'
                        }`}>{record.billing_account?.customer?.full_name || '-'}</td>
                        <td className={`px-4 py-3 whitespace-nowrap font-medium ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}>{formatCurrency(record.staggered_balance)}</td>
                        <td className={`px-4 py-3 whitespace-nowrap font-medium ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}>{formatCurrency(record.monthly_payment)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={record.months_to_pay === 0 ? 'text-green-500 font-bold' : 'font-bold'} style={record.months_to_pay !== 0 ? { color: colorPalette?.accent || '#fb923c' } : {}}>
                            {record.months_to_pay}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={record.status} /></td>
                        <td className={`px-4 py-3 whitespace-nowrap ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-900'
                        }`}>{formatDate(record.staggered_date)}</td>
                        <td className={`px-4 py-3 whitespace-nowrap ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-900'
                        }`}>{record.modified_by || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className={`h-full flex flex-col items-center justify-center ${
                  isDarkMode ? 'text-gray-500' : 'text-gray-400'
                }`}>
                  <h1 className="text-2xl mb-4">Staggered Payment</h1>
                  <p className="text-lg">No payment records found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedStaggered && (
        <div className="flex-shrink-0 overflow-hidden">
          <StaggeredListDetails 
            staggered={selectedStaggered}
            onClose={() => setSelectedStaggered(null)}
          />
        </div>
      )}

      {/* Staggered Installation Form Modal */}
      <StaggeredInstallationFormModal
        isOpen={isStaggeredFormModalOpen}
        onClose={handleCloseStaggeredFormModal}
        onSave={handleSaveStaggered}
      />
    </div>
  );
};

export default StaggeredPayment;
