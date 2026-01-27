import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, ChevronRight, Tag } from 'lucide-react';
import DiscountDetails from '../components/DiscountDetails';
import DiscountFormModal from '../modals/DiscountFormModal';
import * as discountService from '../services/discountService';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';

interface DiscountRecord {
  id: string;
  fullName: string;
  accountNo: string;
  contactNumber: string;
  emailAddress: string;
  address: string;
  plan: string;
  provider: string;
  discountId: string;
  discountAmount: number;
  discountStatus: string;
  dateCreated: string;
  processedBy: string;
  processedDate: string;
  approvedBy: string;
  approvedByEmail?: string;
  modifiedBy: string;
  modifiedDate: string;
  userEmail: string;
  remarks: string;
  cityId?: number;
  barangay?: string;
  city?: string;
  completeAddress?: string;
  onlineStatus?: string;
}

interface LocationItem {
  id: string;
  name: string;
  count: number;
}

const getDiscountRecords = async (): Promise<DiscountRecord[]> => {
  try {
    const response = await discountService.getAll();
    if (response.success && response.data) {
      return response.data.map((discount: any) => {
        const customer = discount.billing_account?.customer;
        const plan = discount.billing_account?.plan;
        
        return {
          id: String(discount.id),
          fullName: customer?.full_name || 
                    [customer?.first_name, customer?.middle_initial, customer?.last_name]
                      .filter(Boolean).join(' ') || 'N/A',
          accountNo: discount.account_no || 'N/A',
          contactNumber: customer?.contact_number_primary || 'N/A',
          emailAddress: customer?.email_address || 'N/A',
          address: customer?.address || 'N/A',
          completeAddress: [
            customer?.address,
            customer?.location,
            customer?.barangay,
            customer?.city,
            customer?.region
          ].filter(Boolean).join(', ') || 'N/A',
          plan: plan?.plan_name || 'N/A',
          provider: 'N/A',
          discountId: String(discount.id),
          discountAmount: parseFloat(discount.discount_amount) || 0,
          discountStatus: discount.status || 'Unknown',
          dateCreated: discount.created_at ? new Date(discount.created_at).toLocaleDateString() : 'N/A',
          processedBy: discount.processed_by_user?.full_name || discount.processed_by_user?.username || 'N/A',
          processedDate: discount.processed_date ? new Date(discount.processed_date).toLocaleDateString() : 'N/A',
          approvedBy: discount.approved_by_user?.full_name || discount.approved_by_user?.username || 'N/A',
          approvedByEmail: discount.approved_by_user?.email_address || discount.approved_by_user?.email,
          modifiedBy: discount.updated_by_user?.full_name || discount.updated_by_user?.username || 'N/A',
          modifiedDate: discount.updated_at ? new Date(discount.updated_at).toLocaleString() : 'N/A',
          userEmail: discount.processed_by_user?.email_address || discount.processed_by_user?.email || 'N/A',
          remarks: discount.remarks || '',
          cityId: undefined,
          barangay: customer?.barangay,
          city: customer?.city,
          onlineStatus: undefined
        };
      });
    }
    return [];
  } catch (error) {
    console.error('Error fetching discount records:', error);
    throw error;
  }
};

const getCities = async () => {
  return [
    { id: 1, name: 'Quezon City' },
    { id: 2, name: 'Manila' },
    { id: 3, name: 'Makati' }
  ];
};

const getRegions = async () => {
  return [
    { id: 1, name: 'Metro Manila' },
    { id: 2, name: 'Calabarzon' }
  ];
};

const Discounts: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDiscount, setSelectedDiscount] = useState<DiscountRecord | null>(null);
  const [discountRecords, setDiscountRecords] = useState<DiscountRecord[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState<number>(256);
  const [isResizingSidebar, setIsResizingSidebar] = useState<boolean>(false);
  const sidebarStartXRef = useRef<number>(0);
  const sidebarStartWidthRef = useRef<number>(0);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);
  const [isDiscountFormModalOpen, setIsDiscountFormModalOpen] = useState<boolean>(false);

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
    const fetchLocationData = async () => {
      try {
        const [citiesData, regionsData] = await Promise.all([
          getCities(),
          getRegions()
        ]);
        setCities(citiesData || []);
        setRegions(regionsData || []);
      } catch (err) {
        console.error('Failed to fetch location data:', err);
        setCities([]);
        setRegions([]);
      }
    };
    
    fetchLocationData();
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
    const fetchDiscountData = async () => {
      try {
        setIsLoading(true);
        const data = await getDiscountRecords();
        setDiscountRecords(data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch discount records:', err);
        setError('Failed to load discount records. Please try again.');
        setDiscountRecords([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDiscountData();
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
        count: discountRecords.length
      }
    ];
    
    cities.forEach((city) => {
      const cityCount = discountRecords.filter(record => record.cityId === city.id).length;
      items.push({
        id: String(city.id),
        name: city.name,
        count: cityCount
      });
    });

    return items;
  }, [cities, discountRecords]);

  const filteredDiscountRecords = useMemo(() => {
    return discountRecords.filter(record => {
      const matchesLocation = selectedLocation === 'all' || 
                             record.cityId === Number(selectedLocation);
      
      const matchesSearch = searchQuery === '' || 
                           record.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           record.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           record.accountNo.includes(searchQuery);
      
      return matchesLocation && matchesSearch;
    });
  }, [discountRecords, selectedLocation, searchQuery]);

  const handleRecordClick = (record: DiscountRecord) => {
    setSelectedDiscount(record);
  };

  const handleCloseDetails = () => {
    setSelectedDiscount(null);
  };

  const handleRefresh = async () => {
    try {
      setIsLoading(true);
      const data = await getDiscountRecords();
      setDiscountRecords(data);
      setError(null);
    } catch (err) {
      console.error('Failed to refresh discount records:', err);
      setError('Failed to refresh discount records. Please try again.');
    } finally {
      setIsLoading(false);
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

  const handleOpenDiscountFormModal = () => {
    setIsDiscountFormModalOpen(true);
  };

  const handleCloseDiscountFormModal = () => {
    setIsDiscountFormModalOpen(false);
  };

  const handleSaveDiscount = async (formData: any) => {
    try {
      // The form modal handles the save internally, just refresh the list
      await handleRefresh();
      handleCloseDiscountFormModal();
    } catch (error) {
      console.error('Error saving discount:', error);
    }
  };

  return (
    <div className={`h-full flex flex-col md:flex-row overflow-hidden ${
      isDarkMode ? 'bg-gray-950' : 'bg-gray-50'
    }`}>
      <div className={`md:border-r border-t md:border-t-0 flex-shrink-0 flex flex-col order-2 md:order-1 relative ${
        isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
      }`} style={{ width: `${sidebarWidth}px` }}>
        <div className={`p-4 border-b flex-shrink-0 hidden md:block ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <h2 className={`text-lg font-semibold ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>Discounts</h2>
            <div>
              <button 
                className="flex items-center space-x-1 text-white px-3 py-1 rounded text-sm transition-colors"
                onClick={handleOpenDiscountFormModal}
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
        <div className="flex-1 overflow-y-auto md:block overflow-x-auto">
          <div className="flex md:flex-col md:space-y-0 space-x-2 md:space-x-0 p-2 md:p-0">
            {locationItems.map((location) => (
              <button
                key={location.id}
                onClick={() => setSelectedLocation(location.id)}
                className={`md:w-full flex-shrink-0 flex flex-col md:flex-row items-center md:justify-between px-4 py-3 text-sm transition-colors rounded-md md:rounded-none ${
                  isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
                } ${
                  selectedLocation === location.id
                    ? ''
                    : isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}
                style={selectedLocation === location.id ? {
                  backgroundColor: colorPalette?.primary ? `${colorPalette.primary}33` : 'rgba(249, 115, 22, 0.2)',
                  color: colorPalette?.primary || '#fb923c'
                } : {}}
              >
                {location.id === 'all' ? (
                  <>
                    <span className="text-xs md:text-sm whitespace-nowrap">All</span>
                    {location.count > 0 && (
                      <span className={`px-2 py-1 rounded-full text-xs mt-1 md:mt-0`}
                        style={selectedLocation === location.id ? {
                          backgroundColor: colorPalette?.primary || '#ea580c',
                          color: 'white'
                        } : {
                          backgroundColor: isDarkMode ? '#374151' : '#d1d5db',
                          color: isDarkMode ? '#d1d5db' : '#4b5563'
                        }}>
                        {location.count}
                      </span>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col md:flex-row items-center md:justify-between w-full">
                    <div className="flex items-center">
                      <ChevronRight size={16} className="mr-2 hidden md:block" />
                      <span className="capitalize text-xs md:text-sm whitespace-nowrap">{location.name}</span>
                    </div>
                    {location.count > 0 && (
                      <span className={`px-2 py-1 rounded-full text-xs mt-1 md:mt-0`}
                        style={selectedLocation === location.id ? {
                          backgroundColor: colorPalette?.primary || '#ea580c',
                          color: 'white'
                        } : {
                          backgroundColor: isDarkMode ? '#374151' : '#d1d5db',
                          color: isDarkMode ? '#d1d5db' : '#4b5563'
                        }}>
                        {location.count}
                      </span>
                    )}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        <div
          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize transition-colors z-10 hidden md:block"
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

      <div className={`flex-1 overflow-hidden order-1 md:order-2 ${
        isDarkMode ? 'bg-gray-950' : 'bg-gray-50'
      }`}>
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto">
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
                  <p className="mt-4">Loading discount records...</p>
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
              ) : (
                <div className="space-y-0">
                  {filteredDiscountRecords.length > 0 ? (
                    filteredDiscountRecords.map((record) => (
                      <div
                        key={record.id}
                        onClick={() => handleRecordClick(record)}
                        className={`px-4 py-3 cursor-pointer transition-colors border-b ${
                          isDarkMode ? 'hover:bg-gray-800 border-gray-800' : 'hover:bg-gray-100 border-gray-200'
                        } ${selectedDiscount?.id === record.id ? (isDarkMode ? 'bg-gray-800' : 'bg-gray-100') : ''}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className={`font-medium ${
                              isDarkMode ? 'text-white' : 'text-gray-900'
                            }`}>
                              {record.fullName}
                            </div>
                            <div className="text-red-400 text-sm">
                              {record.accountNo} | {record.fullName} | {record.address}
                            </div>
                          </div>
                          <div className="flex items-center ml-4 flex-shrink-0">
                            <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                              ₱{record.discountAmount.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className={`text-center py-12 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      No discount records found matching your filters
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedDiscount && (
        <div className="flex-shrink-0 overflow-hidden order-3">
          <DiscountDetails
            discountRecord={selectedDiscount}
            onClose={handleCloseDetails}
            onApproveSuccess={handleRefresh}
          />
        </div>
      )}

      {/* Discount Form Modal */}
      <DiscountFormModal
        isOpen={isDiscountFormModalOpen}
        onClose={handleCloseDiscountFormModal}
        onSave={handleSaveDiscount}
      />
    </div>
  );
};

export default Discounts;
