import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { AlertTriangle, Search, Circle, X } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DisconnectionLogsDetails from '../components/DisconnectionLogsDetails';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';

interface DisconnectionLogRecord {
  id: string;
  accountNo: string;
  customerName: string;
  address: string;
  contactNumber?: string;
  emailAddress?: string;
  plan?: string;
  balance?: number;
  status?: string;
  disconnectionDate?: string;
  disconnectedBy?: string;
  reason?: string;
  remarks?: string;
  cityId?: number;
  appliedDate?: string;
  reconnectionFee?: number;
  daysDisconnected?: number;
  disconnectionCode?: string;
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

const DisconnectionLogs: React.FC = () => {
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLog, setSelectedLog] = useState<DisconnectionLogRecord | null>(null);
  const [logRecords, setLogRecords] = useState<DisconnectionLogRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [refreshButtonHovered, setRefreshButtonHovered] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const theme = await AsyncStorage.getItem('theme');
        setIsDarkMode(theme === 'dark');
      } catch (err) {
        console.error('Failed to load theme:', err);
      }
    };
    
    loadTheme();
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

  const [visibleColumns, setVisibleColumns] = useState([
    'date', 'accountNo', 'username', 'remarks', 'splynxId', 'mikrotikId', 'provider'
  ]);

  const allColumns = [
    { key: 'date', label: 'Date', width: 144 },
    { key: 'accountNo', label: 'Account No.', width: 128 },
    { key: 'username', label: 'Username', width: 144 },
    { key: 'remarks', label: 'Remarks', width: 160 },
    { key: 'splynxId', label: 'Splynx ID', width: 128 },
    { key: 'mikrotikId', label: 'Mikrotik ID', width: 128 },
    { key: 'provider', label: 'Provider', width: 112 },
    { key: 'status', label: 'Status', width: 112 },
    { key: 'customerName', label: 'Full Name', width: 160 },
    { key: 'address', label: 'Address', width: 224 },
    { key: 'contactNumber', label: 'Contact Number', width: 144 },
    { key: 'emailAddress', label: 'Email Address', width: 192 },
    { key: 'plan', label: 'Plan', width: 160 },
    { key: 'balance', label: 'Account Balance', width: 128 },
    { key: 'disconnectionDate', label: 'Disconnection Date', width: 144 },
    { key: 'disconnectedBy', label: 'Disconnected By', width: 144 },
    { key: 'reason', label: 'Reason', width: 160 },
    { key: 'appliedDate', label: 'Applied Date', width: 128 },
    { key: 'reconnectionFee', label: 'Reconnection Fee', width: 144 },
    { key: 'daysDisconnected', label: 'Days Disconnected', width: 144 },
    { key: 'disconnectionCode', label: 'Disconnection Code', width: 144 }
  ];

  useEffect(() => {
    const fetchDisconnectionData = async () => {
      try {
        setIsLoading(true);
        
        setTimeout(() => {
          const mockData: DisconnectionLogRecord[] = [
            {
              id: '1',
              accountNo: '202305171',
              customerName: 'Emelyn G Manucay',
              address: '0033 Sitio Kay Habagat St, Tatala, Binangonan, Rizal',
              remarks: 'Pullout',
              splynxId: '202509181547536099',
              mikrotikId: '*1528',
              provider: 'SWITCH',
              username: 'manucaye0220251214',
              date: '9/18/2025 3:47:54 PM',
              barangay: 'Tatala',
              city: 'Binangonan',
              dateFormat: '9/18/2025',
              cityId: 1
            },
            {
              id: '2',
              accountNo: '202402023',
              customerName: 'Maria Santos',
              address: '456 Oak St, Lunsad, Binangonan, Rizal',
              remarks: 'Intermittent connection',
              splynxId: 'SPL67890',
              mikrotikId: 'MK54321',
              provider: 'SWITCH',
              username: 'maria.santos456',
              date: '9/19/2025 10:15:43 AM',
              barangay: 'Lunsad',
              city: 'Binangonan',
              dateFormat: '9/19/2025',
              cityId: 1
            },
            {
              id: '3',
              accountNo: '202403045',
              customerName: 'Robert Reyes',
              address: '789 Pine St, Libid, Binangonan, Rizal',
              remarks: 'Non-payment',
              splynxId: 'SPL24680',
              mikrotikId: 'MK13579',
              provider: 'SWITCH',
              username: 'robert.reyes789',
              date: '9/21/2025 09:05:11 AM',
              barangay: 'Libid',
              city: 'Binangonan',
              dateFormat: '9/21/2025',
              cityId: 1
            }
          ];
          
          setLogRecords(mockData);
          setError(null);
          setIsLoading(false);
        }, 1000);
      } catch (err) {
        console.error('Failed to fetch disconnection logs:', err);
        setError('Failed to load disconnection logs. Please try again.');
        setLogRecords([]);
        setIsLoading(false);
      }
    };
    
    fetchDisconnectionData();
  }, []);

  const locationItems: LocationItem[] = useMemo(() => {
    const items: LocationItem[] = [
      {
        id: 'all',
        name: 'All',
        count: logRecords.length
      }
    ];
    
    const cityCountMap = new Map<number, number>();
    
    logRecords.forEach(record => {
      if (record.cityId !== undefined) {
        const currentCount = cityCountMap.get(record.cityId) || 0;
        cityCountMap.set(record.cityId, currentCount + 1);
      }
    });
    
    cityCountMap.forEach((count, cityId) => {
      items.push({
        id: String(cityId),
        name: getCityName(cityId),
        count
      });
    });

    return items;
  }, [logRecords]);

  function getCityName(cityId: number): string {
    const cityMap: Record<number, string> = {
      1: 'Binangonan',
      2: 'Cardona'
    };
    
    return cityMap[cityId] || `City ${cityId}`;
  }

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

  const handleRowClick = (record: DisconnectionLogRecord) => {
    setSelectedLog(record);
  };

  const handleCloseDetails = () => {
    setSelectedLog(null);
  };

  const handleRefresh = async () => {
    try {
      setIsLoading(true);
      setTimeout(() => {
        const mockData: DisconnectionLogRecord[] = [
          {
            id: '1',
            accountNo: '202305171',
            customerName: 'Emelyn G Manucay',
            address: '0033 Sitio Kay Habagat St, Tatala, Binangonan, Rizal',
            remarks: 'Pullout',
            splynxId: '202509181547536099',
            mikrotikId: '*1528',
            provider: 'SWITCH',
            username: 'manucaye0220251214',
            date: '9/18/2025 3:47:54 PM',
            barangay: 'Tatala',
            city: 'Binangonan',
            dateFormat: '9/18/2025',
            cityId: 1
          },
          {
            id: '2',
            accountNo: '202402023',
            customerName: 'Maria Santos',
            address: '456 Oak St, Lunsad, Binangonan, Rizal',
            remarks: 'Intermittent connection',
            splynxId: 'SPL67890',
            mikrotikId: 'MK54321',
            provider: 'SWITCH',
            username: 'maria.santos456',
            date: '9/19/2025 10:15:43 AM',
            barangay: 'Lunsad',
            city: 'Binangonan',
            dateFormat: '9/19/2025',
            cityId: 1
          },
          {
            id: '3',
            accountNo: '202403045',
            customerName: 'Robert Reyes',
            address: '789 Pine St, Libid, Binangonan, Rizal',
            remarks: 'Non-payment',
            splynxId: 'SPL24680',
            mikrotikId: 'MK13579',
            provider: 'SWITCH',
            username: 'robert.reyes789',
            date: '9/21/2025 09:05:11 AM',
            barangay: 'Libid',
            city: 'Binangonan',
            dateFormat: '9/21/2025',
            cityId: 1
          }
        ];
        
        setLogRecords(mockData);
        setError(null);
        setIsLoading(false);
      }, 1000);
    } catch (err) {
      console.error('Failed to refresh disconnection logs:', err);
      setError('Failed to refresh disconnection logs. Please try again.');
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

  const renderCellValue = (record: DisconnectionLogRecord, columnKey: string) => {
    switch (columnKey) {
      case 'date':
        return <Text>{record.date || (record.disconnectionDate ? record.disconnectionDate.split(' ')[0] : '-')}</Text>;
      case 'accountNo':
        return <Text style={{ color: '#f87171' }}>{record.accountNo}</Text>;
      case 'username':
        return <Text>{record.username || '-'}</Text>;
      case 'remarks':
        return <Text>{record.remarks || '-'}</Text>;
      case 'splynxId':
        return <Text>{record.splynxId || '-'}</Text>;
      case 'mikrotikId':
        return <Text>{record.mikrotikId || '-'}</Text>;
      case 'provider':
        return <Text>{record.provider || 'SWITCH'}</Text>;
      case 'status':
        return (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Circle 
              size={12}
              color="#f87171"
              fill="#f87171"
            />
            <Text style={{ fontSize: 12, color: '#f87171' }}>
              {record.status}
            </Text>
          </View>
        );
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
        return <Text>{record.balance ? `₱ ${record.balance.toFixed(2)}` : '-'}</Text>;
      case 'disconnectionDate':
        return <Text>{record.disconnectionDate || '-'}</Text>;
      case 'disconnectedBy':
        return <Text>{record.disconnectedBy || '-'}</Text>;
      case 'reason':
        return <Text>{record.reason || '-'}</Text>;
      case 'appliedDate':
        return <Text>{record.appliedDate || '-'}</Text>;
      case 'reconnectionFee':
        return <Text>{record.reconnectionFee ? `₱ ${record.reconnectionFee.toFixed(2)}` : '-'}</Text>;
      case 'daysDisconnected':
        return <Text>{record.daysDisconnected !== undefined ? record.daysDisconnected : '-'}</Text>;
      case 'disconnectionCode':
        return <Text>{record.disconnectionCode || '-'}</Text>;
      default:
        return <Text>-</Text>;
    }
  };

  const displayedColumns = allColumns.filter(col => visibleColumns.includes(col.key));

  return (
    <View style={{ 
      height: '100%',
      flexDirection: 'row',
      overflow: 'hidden',
      backgroundColor: isDarkMode ? '#030712' : '#f9fafb'
    }}>
      <View style={{ 
        width: 256,
        borderRightWidth: 1,
        flexShrink: 0,
        flexDirection: 'column',
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
              Disconnection Logs
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
                  ? 'rgba(249, 115, 22, 0.2)'
                  : pressed
                    ? (isDarkMode ? '#1f2937' : '#f3f4f6')
                    : 'transparent'
              })}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <AlertTriangle size={16} color={selectedLocation === location.id ? '#fb923c' : (isDarkMode ? '#d1d5db' : '#6b7280')} style={{ marginRight: 8 }} />
                <Text style={{ 
                  textTransform: 'capitalize',
                  color: selectedLocation === location.id ? '#fb923c' : (isDarkMode ? '#d1d5db' : '#6b7280')
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
                  backgroundColor: selectedLocation === location.id ? '#ea580c' : (isDarkMode ? '#374151' : '#e5e7eb')
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
        backgroundColor: isDarkMode ? '#111827' : '#ffffff'
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
                  placeholder="Search disconnection logs..."
                  placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
                  value={searchQuery}
                  onChangeText={(text) => setSearchQuery(text)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  style={{
                    width: '100%',
                    borderRadius: 4,
                    paddingLeft: 40,
                    paddingRight: 16,
                    paddingVertical: 8,
                    backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                    color: isDarkMode ? '#ffffff' : '#111827',
                    borderWidth: 1,
                    borderColor: searchFocused && colorPalette?.primary
                      ? colorPalette.primary
                      : isDarkMode ? '#374151' : '#d1d5db'
                  }}
                />
                <View style={{ position: 'absolute', left: 12, top: 10 }}>
                  <Search size={16} color={isDarkMode ? '#9ca3af' : '#6b7280'} />
                </View>
              </View>
              <Pressable
                onPress={handleRefresh}
                onPressIn={() => setRefreshButtonHovered(true)}
                onPressOut={() => setRefreshButtonHovered(false)}
                disabled={isLoading}
                style={{
                  backgroundColor: isLoading 
                    ? (isDarkMode ? '#4b5563' : '#9ca3af')
                    : refreshButtonHovered && colorPalette?.accent
                      ? colorPalette.accent
                      : colorPalette?.primary || '#ea580c',
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 4,
                  fontSize: 14
                }}
              >
                <Text style={{ color: '#ffffff' }}>
                  {isLoading ? 'Loading...' : 'Refresh'}
                </Text>
              </Pressable>
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
                    Loading disconnection logs...
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
                      backgroundColor: isDarkMode ? '#374151' : '#6b7280'
                    }}
                  >
                    <Text style={{ color: '#ffffff' }}>Retry</Text>
                  </Pressable>
                </View>
              ) : (
                <ScrollView horizontal>
                  <View>
                    <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb', backgroundColor: isDarkMode ? '#1f2937' : '#f9fafb' }}>
                      {displayedColumns.map((column, index) => (
                        <View
                          key={column.key}
                          style={{
                            paddingVertical: 12,
                            paddingHorizontal: 12,
                            backgroundColor: isDarkMode ? '#1f2937' : '#f9fafb',
                            width: column.width,
                            borderRightWidth: index < displayedColumns.length - 1 ? 1 : 0,
                            borderRightColor: isDarkMode ? '#374151' : '#e5e7eb'
                          }}
                        >
                          <Text style={{ color: isDarkMode ? '#9ca3af' : '#6b7280', fontWeight: '400' }}>
                            {column.label}
                          </Text>
                        </View>
                      ))}
                    </View>
                    {filteredLogRecords.length > 0 ? (
                      filteredLogRecords.map((record) => (
                        <Pressable 
                          key={record.id}
                          onPress={() => handleRowClick(record)}
                          style={({ pressed }) => ({
                            flexDirection: 'row',
                            borderBottomWidth: 1,
                            borderBottomColor: isDarkMode ? '#1f2937' : '#e5e7eb',
                            backgroundColor: selectedLog?.id === record.id
                              ? (isDarkMode ? '#1f2937' : '#f3f4f6')
                              : pressed
                                ? (isDarkMode ? '#111827' : '#f9fafb')
                                : 'transparent'
                          })}
                        >
                          {displayedColumns.map((column, index) => (
                            <View
                              key={column.key}
                              style={{
                                paddingVertical: 16,
                                paddingHorizontal: 12,
                                width: column.width,
                                borderRightWidth: index < displayedColumns.length - 1 ? 1 : 0,
                                borderRightColor: isDarkMode ? '#1f2937' : '#e5e7eb'
                              }}
                            >
                              {renderCellValue(record, column.key)}
                            </View>
                          ))}
                        </Pressable>
                      ))
                    ) : (
                      <View style={{ paddingHorizontal: 16, paddingVertical: 48, alignItems: 'center' }}>
                        <Text style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>
                          No disconnection logs found matching your filters
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

      {selectedLog && (
        <View style={{ 
          width: 768,
          maxWidth: '100%',
          borderLeftWidth: 1,
          flexShrink: 0,
          position: 'relative',
          backgroundColor: isDarkMode ? '#111827' : '#ffffff',
          borderLeftColor: isDarkMode ? '#374151' : '#e5e7eb'
        }}>
          <View style={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }}>
            <Pressable
              onPress={handleCloseDetails}
              style={({ pressed }) => ({
                borderRadius: 4,
                padding: 4,
                backgroundColor: pressed
                  ? (isDarkMode ? '#374151' : '#e5e7eb')
                  : (isDarkMode ? '#1f2937' : '#f3f4f6')
              })}
            >
              <X size={20} color={isDarkMode ? '#9ca3af' : '#6b7280'} />
            </Pressable>
          </View>
          <DisconnectionLogsDetails
            disconnectionRecord={selectedLog}
          />
        </View>
      )}
    </View>
  );
};

export default DisconnectionLogs;
