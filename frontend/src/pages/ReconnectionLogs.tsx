import React, { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, Search, Circle, X } from 'lucide-react';
import ReconnectionLogsDetails from '../components/ReconnectionLogsDetails';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';
import { API_BASE_URL } from '../config/api';


interface ReconnectionLogRecord {
  id: string;
  accountNo: string;
  customerName: string;
  address: string;
  contactNumber?: string;
  emailAddress?: string;
  plan?: string;
  balance?: number;
  status?: string;
  reconnectionDate?: string;
  reconnectedBy?: string;
  reason?: string;
  remarks?: string;
  cityId?: number;
  appliedDate?: string;
  reconnectionFee?: number;
  daysDisconnected?: number;
  reconnectionCode?: string;
  onlineStatus?: string;
  username?: string;
  splynxId?: string;
  mikrotikId?: string;
  provider?: string;
  date?: string;
  barangay?: string;
  city?: string;
  dateFormat?: string;
}

interface LocationItem {
  id: string;
  name: string;
  count: number;
}

const ReconnectionLogs: React.FC = () => {
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLog, setSelectedLog] = useState<ReconnectionLogRecord | null>(null);
  const [logRecords, setLogRecords] = useState<ReconnectionLogRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);

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
    const checkDarkMode = () => {
      const theme = localStorage.getItem('theme');
      setIsDarkMode(theme === 'dark');
    };

    checkDarkMode();

    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  // Essential table columns - only show the most important ones initially
  const [visibleColumns, setVisibleColumns] = useState([
    'date', 'accountNo', 'username', 'reconnectionFee', 'plan', 'remarks', 'splynxId', 'mikrotikId', 'provider'
  ]);

  // All available columns for the table
  const allColumns = [
    { key: 'date', label: 'Date', width: 'min-w-36' },
    { key: 'accountNo', label: 'Account No.', width: 'min-w-32' },
    { key: 'username', label: 'Username', width: 'min-w-36' },
    { key: 'reconnectionFee', label: 'Reconnection Fee', width: 'min-w-40' },
    { key: 'plan', label: 'Plan', width: 'min-w-40' },
    { key: 'remarks', label: 'Remarks', width: 'min-w-40' },
    { key: 'splynxId', label: 'Splynx ID', width: 'min-w-32' },
    { key: 'mikrotikId', label: 'Mikrotik ID', width: 'min-w-32' },
    { key: 'provider', label: 'Provider', width: 'min-w-28' },
    { key: 'status', label: 'Status', width: 'min-w-28' },
    { key: 'customerName', label: 'Full Name', width: 'min-w-40' },
    { key: 'address', label: 'Address', width: 'min-w-56' },
    { key: 'contactNumber', label: 'Contact Number', width: 'min-w-36' },
    { key: 'emailAddress', label: 'Email Address', width: 'min-w-48' },
    { key: 'balance', label: 'Account Balance', width: 'min-w-32' },
    { key: 'reconnectionDate', label: 'Reconnection Date', width: 'min-w-36' },
    { key: 'reconnectedBy', label: 'Reconnected By', width: 'min-w-36' },
    { key: 'reason', label: 'Reason', width: 'min-w-40' },
    { key: 'appliedDate', label: 'Applied Date', width: 'min-w-32' },
    { key: 'daysDisconnected', label: 'Days Disconnected', width: 'min-w-36' },
    { key: 'reconnectionCode', label: 'Reconnection Code', width: 'min-w-36' }
  ];



  // Fetch reconnection log data
  useEffect(() => {
    const fetchReconnectionData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`${API_BASE_URL}/reconnection-logs`);
        const result = await response.json();

        if (result.status === 'success') {
          setLogRecords(result.data);
        } else {
          throw new Error(result.message || 'Failed to fetch logs');
        }
      } catch (err: any) {
        console.error('Failed to fetch reconnection logs:', err);
        setError(err.message || 'Failed to load reconnection logs. Please try again.');
        setLogRecords([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReconnectionData();
  }, []);

  // Memoize location items for performance
  const locationItems: LocationItem[] = useMemo(() => {
    const items: LocationItem[] = [
      {
        id: 'all',
        name: 'All',
        count: logRecords.length
      }
    ];

    // Create a map to count records by cityId
    const cityCountMap = new Map<number, number>();

    logRecords.forEach(record => {
      if (record.cityId !== undefined) {
        const currentCount = cityCountMap.get(record.cityId) || 0;
        cityCountMap.set(record.cityId, currentCount + 1);
      }
    });

    // Add city items
    cityCountMap.forEach((count, cityId) => {
      items.push({
        id: String(cityId),
        name: getCityName(cityId),
        count
      });
    });

    return items;
  }, [logRecords]);

  // Mock function to get city name by ID (would be replaced with actual data)
  function getCityName(cityId: number): string {
    const cityMap: Record<number, string> = {
      1: 'Binangonan',
      2: 'Cardona'
    };

    return cityMap[cityId] || `City ${cityId}`;
  }

  // Memoize filtered records for performance
  const filteredLogRecords = useMemo(() => {
    return logRecords.filter(record => {
      const matchesLocation = selectedLocation === 'all' ||
        (record.cityId !== undefined && record.cityId === Number(selectedLocation));

      const matchesSearch = searchQuery === '' ||
        record.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.accountNo.includes(searchQuery);

      return matchesLocation && matchesSearch;
    });
  }, [logRecords, selectedLocation, searchQuery]);

  const handleRowClick = (record: ReconnectionLogRecord) => {
    setSelectedLog(record);
  };

  const handleCloseDetails = () => {
    setSelectedLog(null);
  };

  const handleRefresh = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/reconnection-logs`);
      const result = await response.json();

      if (result.status === 'success') {
        setLogRecords(result.data);
      } else {
        throw new Error(result.message || 'Failed to refresh logs');
      }
    } catch (err: any) {
      console.error('Failed to refresh reconnection logs:', err);
      setError(err.message || 'Failed to refresh reconnection logs. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleColumn = (columnKey: string) => {
    setVisibleColumns(prev =>
      prev.includes(columnKey)
        ? prev.filter(col => col !== columnKey)
        : [...prev, columnKey]
    );
  };

  const renderCellValue = (record: ReconnectionLogRecord, columnKey: string) => {
    switch (columnKey) {
      case 'date':
        return record.date || (record.reconnectionDate ? record.reconnectionDate.split(' ')[0] : '-');
      case 'accountNo':
        return <span className="text-red-400">{record.accountNo}</span>;
      case 'username':
        return record.username || '-';
      case 'reconnectionFee':
        return record.reconnectionFee ? `₱ ${record.reconnectionFee.toFixed(2)}` : '-';
      case 'plan':
        return record.plan || '-';
      case 'remarks':
        return record.remarks || '-';
      case 'splynxId':
        return record.splynxId || '-';
      case 'mikrotikId':
        return record.mikrotikId || '-';
      case 'provider':
        return record.provider || '-';
      case 'status':
        return (
          <div className="flex items-center space-x-2">
            <Circle
              className={`h-3 w-3 text-green-400 fill-green-400`}
            />
            <span className="text-xs text-green-400">
              Reconnected
            </span>
          </div>
        );
      case 'customerName':
        return record.customerName;
      case 'address':
        return <span title={record.address}>{record.address}</span>;
      case 'contactNumber':
        return record.contactNumber || '-';
      case 'emailAddress':
        return record.emailAddress || '-';
      case 'balance':
        return record.balance ? `₱ ${record.balance.toFixed(2)}` : '-';
      case 'reconnectionDate':
        return record.reconnectionDate || '-';
      case 'reconnectedBy':
        return record.reconnectedBy || '-';
      case 'reason':
        return record.reason || '-';
      case 'appliedDate':
        return record.appliedDate || '-';
      case 'daysDisconnected':
        return record.daysDisconnected !== undefined ? record.daysDisconnected : '-';
      case 'reconnectionCode':
        return record.reconnectionCode || '-';
      default:
        return '-';
    }
  };

  const displayedColumns = allColumns.filter(col => visibleColumns.includes(col.key));

  return (
    <div className={`h-full flex overflow-hidden ${isDarkMode ? 'bg-gray-950' : 'bg-gray-50'
      }`}>
      <div className={`w-64 border-r flex-shrink-0 flex flex-col ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
        }`}>
        <div className={`p-4 border-b flex-shrink-0 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'
          }`}>
          <div className="flex items-center justify-between mb-1">
            <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>Reconnection Logs</h2>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {locationItems.map((location) => (
            <button
              key={location.id}
              onClick={() => setSelectedLocation(location.id)}
              className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors ${selectedLocation === location.id
                ? 'bg-orange-500 bg-opacity-20 text-orange-400'
                : isDarkMode ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'
                }`}
            >
              <div className="flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2" />
                <span className="capitalize">{location.name}</span>
              </div>
              {location.count > 0 && (
                <span className={`px-2 py-1 rounded-full text-xs ${selectedLocation === location.id
                  ? 'bg-orange-600 text-white'
                  : isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
                  }`}>
                  {location.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className={`flex-1 overflow-hidden ${isDarkMode ? 'bg-gray-900' : 'bg-white'
        }`}>
        <div className="flex flex-col h-full">
          <div className={`p-4 border-b flex-shrink-0 ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
            }`}>
            <div className="flex items-center space-x-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search reconnection logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full rounded pl-10 pr-4 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 ${isDarkMode
                    ? 'bg-gray-800 text-white border-gray-700'
                    : 'bg-white text-gray-900 border-gray-300'
                    }`}
                />
                <Search className={`absolute left-3 top-2.5 h-4 w-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`} />
              </div>
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="text-white px-4 py-2 rounded text-sm transition-colors"
                style={{
                  backgroundColor: isLoading ? '#4b5563' : (colorPalette?.primary || '#ea580c')
                }}
                onMouseEnter={(e) => {
                  if (!isLoading && colorPalette?.accent) {
                    e.currentTarget.style.backgroundColor = colorPalette.accent;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isLoading) {
                    e.currentTarget.style.backgroundColor = colorPalette?.primary || '#ea580c';
                  }
                }}
              >
                {isLoading ? 'Loading...' : 'Refresh'}
              </button>
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
                  <p className="mt-4">Loading reconnection logs...</p>
                </div>
              ) : error ? (
                <div className={`px-4 py-12 text-center ${isDarkMode ? 'text-red-400' : 'text-red-600'
                  }`}>
                  <p>{error}</p>
                  <button
                    onClick={handleRefresh}
                    className={`mt-4 text-white px-4 py-2 rounded ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-500 hover:bg-gray-600'
                      }`}>
                    Retry
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto overflow-y-hidden">
                  <table className="w-max min-w-full text-sm border-separate border-spacing-0">
                    <thead>
                      <tr className={`border-b sticky top-0 z-10 ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
                        }`}>
                        {displayedColumns.map((column, index) => (
                          <th
                            key={column.key}
                            className={`text-left py-3 px-3 font-normal ${column.width} whitespace-nowrap ${isDarkMode ? 'text-gray-400 bg-gray-800' : 'text-gray-600 bg-gray-50'
                              } ${index < displayedColumns.length - 1
                                ? isDarkMode ? 'border-r border-gray-700' : 'border-r border-gray-200'
                                : ''
                              }`}
                          >
                            {column.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLogRecords.length > 0 ? (
                        filteredLogRecords.map((record) => (
                          <tr
                            key={record.id}
                            className={`border-b cursor-pointer transition-colors ${isDarkMode
                              ? 'border-gray-800 hover:bg-gray-900'
                              : 'border-gray-200 hover:bg-gray-50'
                              } ${selectedLog?.id === record.id
                                ? isDarkMode ? 'bg-gray-800' : 'bg-gray-100'
                                : ''
                              }`}
                            onClick={() => handleRowClick(record)}
                          >
                            {displayedColumns.map((column, index) => (
                              <td
                                key={column.key}
                                className={`py-4 px-3 whitespace-nowrap ${isDarkMode ? 'text-white' : 'text-gray-900'
                                  } ${index < displayedColumns.length - 1
                                    ? isDarkMode ? 'border-r border-gray-800' : 'border-r border-gray-200'
                                    : ''
                                  }`}
                              >
                                {renderCellValue(record, column.key)}
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={displayedColumns.length} className={`px-4 py-12 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                            No reconnection logs found matching your filters
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

      {selectedLog && (
        <div className={`w-full max-w-3xl border-l flex-shrink-0 relative ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
          }`}>
          <div className="absolute top-4 right-4 z-10">
            <button
              onClick={handleCloseDetails}
              className={`transition-colors rounded p-1 ${isDarkMode
                ? 'text-gray-400 hover:text-white bg-gray-800'
                : 'text-gray-600 hover:text-gray-900 bg-gray-100'
                }`}
            >
              <X size={20} />
            </button>
          </div>
          <ReconnectionLogsDetails
            reconnectionRecord={selectedLog}
          />
        </div>
      )}
    </div>
  );
};

export default ReconnectionLogs;