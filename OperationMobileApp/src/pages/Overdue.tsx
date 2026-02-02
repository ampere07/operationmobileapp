import React, { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';
import { overdueService, Overdue } from '../services/overdueService';

const OverduePage: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [selectedDate, setSelectedDate] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [overdueRecords, setOverdueRecords] = useState<Overdue[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);

  // Pagination State with session storage
  const [currentPage, setCurrentPage] = useState(() => {
    const saved = sessionStorage.getItem('overduePage');
    return saved ? parseInt(saved) : 1;
  });
  const [hasMore, setHasMore] = useState(false);
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

  // Fetch data when page changes
  useEffect(() => {
    fetchOverdueData();
    // Save current page to session storage
    sessionStorage.setItem('overduePage', currentPage.toString());
  }, [currentPage]);

  const fetchOverdueData = async () => {
    try {
      setIsLoading(true);

      // PHASE 1: Fast load - Get basic data INSTANTLY
      const fastResponse = await overdueService.getAll(true, currentPage, itemsPerPage);

      if (fastResponse.success) {
        setOverdueRecords(fastResponse.data || []);
        setHasMore(fastResponse.pagination?.has_more || false);
        setIsLoading(false);
        setError(null);

        // PHASE 2: Load full data in background
        setTimeout(async () => {
          try {
            const fullResponse = await overdueService.getAll(false, currentPage, itemsPerPage);

            if (fullResponse.success) {
              setOverdueRecords(fullResponse.data || []);
              setHasMore(fullResponse.pagination?.has_more || false);
            }
          } catch (bgError) {
            console.warn('Background full data load failed:', bgError);
          }
        }, 100);
      } else {
        setError('Failed to load Overdue records');
        setOverdueRecords([]);
      }
    } catch (err) {
      console.error('Failed to fetch Overdue records:', err);
      setError('Failed to load Overdue records. Please try again.');
      setOverdueRecords([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    await fetchOverdueData();
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const filteredRecords = overdueRecords.filter(record => {
    const matchesSearch = searchQuery === '' ||
      record.account_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const PaginationControls = () => {
    return (
      <div className={`flex items-center justify-between px-4 py-3 border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
        <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Page <span className="font-medium">{currentPage}</span> - Showing <span className="font-medium">{filteredRecords.length}</span> records
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`px-3 py-2 rounded text-sm transition-colors flex items-center space-x-1 ${currentPage === 1
              ? (isDarkMode ? 'text-gray-600 bg-gray-800 cursor-not-allowed' : 'text-gray-400 bg-gray-100 cursor-not-allowed')
              : (isDarkMode ? 'text-white bg-gray-700 hover:bg-gray-600' : 'text-gray-700 bg-white hover:bg-gray-50 border border-gray-300')
              }`}
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Back</span>
          </button>

          <div className="flex items-center space-x-1">
            <span className={`px-2 text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Page {currentPage}
            </span>
          </div>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={!hasMore}
            className={`px-3 py-2 rounded text-sm transition-colors flex items-center space-x-1 ${!hasMore
              ? (isDarkMode ? 'text-gray-600 bg-gray-800 cursor-not-allowed' : 'text-gray-400 bg-gray-100 cursor-not-allowed')
              : (isDarkMode ? 'text-white bg-gray-700 hover:bg-gray-600' : 'text-gray-700 bg-white hover:bg-gray-50 border border-gray-300')
              }`}
          >
            <span>Next</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  };


  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div className={`h-full flex overflow-hidden ${isDarkMode ? 'bg-gray-950' : 'bg-gray-50'
      }`}>
      <div className={`w-64 border-r flex-shrink-0 flex flex-col ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
        }`}>
        <div className={`p-4 border-b flex-shrink-0 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'
          }`}>
          <div className="flex items-center justify-between mb-1">
            <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>Overdue</h2>
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
      </div>

      <div className={`flex-1 overflow-hidden ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
        }`}>
        <div className="flex flex-col h-full">
          <div className={`p-4 border-b flex-shrink-0 ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
            }`}>
            <div className="flex flex-col space-y-3">
              <div className="flex items-center space-x-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Search Overdue records..."
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

          <div className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto">
              {isLoading ? (
                <div className={`px-4 py-12 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                  <div className="animate-pulse flex flex-col items-center">
                    <div className={`h-4 w-1/3 rounded mb-4 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'
                      }`}></div>
                    <div className={`h-4 w-1/2 rounded ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'
                      }`}></div>
                  </div>
                  <p className="mt-4">Loading Overdue records...</p>
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
                <>
                  <div className="overflow-x-auto">
                    <table className={`min-w-full divide-y text-sm ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'
                      }`}>
                      <thead className={`sticky top-0 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'
                        }`}>
                        <tr>
                          <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>ID</th>
                          <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>Account No</th>
                          <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>Customer Name</th>
                          <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>Overdue Date</th>
                          <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>Invoice ID</th>
                          <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>Print Link</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${isDarkMode ? 'bg-gray-900 divide-gray-800' : 'bg-white divide-gray-200'
                        }`}>
                        {filteredRecords.map((record: Overdue) => (
                          <tr
                            key={record.id}
                            className={`${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
                              }`}
                          >
                            <td className={`px-4 py-3 whitespace-nowrap text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-900'
                              }`}>{record.id}</td>
                            <td className={`px-4 py-3 whitespace-nowrap text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-900'
                              }`}>{record.account_no || '-'}</td>
                            <td className={`px-4 py-3 whitespace-nowrap text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-900'
                              }`}>{record.full_name || '-'}</td>
                            <td className={`px-4 py-3 whitespace-nowrap text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-900'
                              }`}>{formatDate(record.overdue_date)}</td>
                            <td className={`px-4 py-3 whitespace-nowrap text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-900'
                              }`}>{record.invoice_id || '-'}</td>
                            <td className={`px-4 py-3 whitespace-nowrap text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-900'
                              }`}>
                              {record.print_link ? (
                                <span className="text-blue-500 cursor-default">
                                  View
                                </span>
                              ) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <PaginationControls />
                </>
              ) : (
                <div className={`h-full flex items-center justify-center ${isDarkMode ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                  No items
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverduePage;
