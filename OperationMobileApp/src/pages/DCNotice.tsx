import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, Linking } from 'react-native';
import { Search } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';
import { dcNoticeService, DCNotice } from '../services/dcNoticeService';

const DCNoticePage: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [selectedDate, setSelectedDate] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dcNoticeRecords, setDCNoticeRecords] = useState<DCNotice[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [refreshButtonHovered, setRefreshButtonHovered] = useState(false);

  const dateItems = [
    { date: 'All', id: '' },
  ];

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const theme = await AsyncStorage.getItem('theme');
        setIsDarkMode(theme === 'dark' || theme === null);
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

  useEffect(() => {
    fetchDCNoticeData();
  }, []);

  const fetchDCNoticeData = async () => {
    try {
      setIsLoading(true);
      const response = await dcNoticeService.getAll();
      
      if (response.success) {
        setDCNoticeRecords(response.data || []);
        setError(null);
      } else {
        setError('Failed to load DC Notice records');
        setDCNoticeRecords([]);
      }
    } catch (err) {
      console.error('Failed to fetch DC Notice records:', err);
      setError('Failed to load DC Notice records. Please try again.');
      setDCNoticeRecords([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    await fetchDCNoticeData();
  };

  const filteredRecords = dcNoticeRecords.filter(record => {
    const matchesSearch = searchQuery === '' || 
      record.account_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const handleOpenLink = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      }
    } catch (err) {
      console.error('Failed to open link:', err);
    }
  };

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
              DC Notice
            </Text>
          </View>
        </View>
        <ScrollView style={{ flex: 1 }}>
          {dateItems.map((item, index) => (
            <Pressable
              key={index}
              onPress={() => setSelectedDate(item.date)}
              style={({ pressed }) => ({
                width: '100%',
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 12,
                backgroundColor: selectedDate === item.date
                  ? (colorPalette?.primary ? `${colorPalette.primary}33` : 'rgba(249, 115, 22, 0.2)')
                  : pressed
                    ? (isDarkMode ? '#1f2937' : '#f3f4f6')
                    : 'transparent'
              })}
            >
              <Text style={{ 
                fontSize: 14,
                fontWeight: '500',
                flexDirection: 'row',
                alignItems: 'center',
                color: selectedDate === item.date ? (colorPalette?.primary || '#fb923c') : (isDarkMode ? '#d1d5db' : '#6b7280')
              }}>
                <Text style={{ marginRight: 8 }}>📄</Text>
                {item.date}
              </Text>
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
            <View style={{ flexDirection: 'column', gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ position: 'relative', flex: 1 }}>
                  <TextInput
                    placeholder="Search DC Notice records..."
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
                      ? '#4b5563' 
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
                    Loading DC Notice records...
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
              ) : filteredRecords.length > 0 ? (
                <ScrollView horizontal>
                  <View>
                    <View style={{ 
                      flexDirection: 'row',
                      borderBottomWidth: 1,
                      borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb',
                      backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6'
                    }}>
                      <View style={{ 
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        width: 80
                      }}>
                        <Text style={{ 
                          fontSize: 12,
                          fontWeight: '500',
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                          color: isDarkMode ? '#9ca3af' : '#6b7280'
                        }}>ID</Text>
                      </View>
                      <View style={{ 
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        width: 150
                      }}>
                        <Text style={{ 
                          fontSize: 12,
                          fontWeight: '500',
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                          color: isDarkMode ? '#9ca3af' : '#6b7280'
                        }}>Account No</Text>
                      </View>
                      <View style={{ 
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        width: 200
                      }}>
                        <Text style={{ 
                          fontSize: 12,
                          fontWeight: '500',
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                          color: isDarkMode ? '#9ca3af' : '#6b7280'
                        }}>Customer Name</Text>
                      </View>
                      <View style={{ 
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        width: 150
                      }}>
                        <Text style={{ 
                          fontSize: 12,
                          fontWeight: '500',
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                          color: isDarkMode ? '#9ca3af' : '#6b7280'
                        }}>DC Notice Date</Text>
                      </View>
                      <View style={{ 
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        width: 120
                      }}>
                        <Text style={{ 
                          fontSize: 12,
                          fontWeight: '500',
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                          color: isDarkMode ? '#9ca3af' : '#6b7280'
                        }}>Invoice ID</Text>
                      </View>
                      <View style={{ 
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        width: 120
                      }}>
                        <Text style={{ 
                          fontSize: 12,
                          fontWeight: '500',
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                          color: isDarkMode ? '#9ca3af' : '#6b7280'
                        }}>Print Link</Text>
                      </View>
                    </View>
                    {filteredRecords.map((record) => (
                      <Pressable 
                        key={record.id}
                        style={({ pressed }) => ({
                          flexDirection: 'row',
                          borderBottomWidth: 1,
                          borderBottomColor: isDarkMode ? '#1f2937' : '#e5e7eb',
                          backgroundColor: pressed 
                            ? (isDarkMode ? '#1f2937' : '#f9fafb')
                            : (isDarkMode ? '#111827' : '#ffffff')
                        })}
                      >
                        <View style={{ 
                          paddingHorizontal: 16,
                          paddingVertical: 12,
                          width: 80
                        }}>
                          <Text style={{ 
                            fontSize: 14,
                            color: isDarkMode ? '#d1d5db' : '#111827'
                          }}>{record.id}</Text>
                        </View>
                        <View style={{ 
                          paddingHorizontal: 16,
                          paddingVertical: 12,
                          width: 150
                        }}>
                          <Text style={{ 
                            fontSize: 14,
                            color: isDarkMode ? '#d1d5db' : '#111827'
                          }}>{record.account_no || '-'}</Text>
                        </View>
                        <View style={{ 
                          paddingHorizontal: 16,
                          paddingVertical: 12,
                          width: 200
                        }}>
                          <Text style={{ 
                            fontSize: 14,
                            color: isDarkMode ? '#d1d5db' : '#111827'
                          }}>{record.full_name || '-'}</Text>
                        </View>
                        <View style={{ 
                          paddingHorizontal: 16,
                          paddingVertical: 12,
                          width: 150
                        }}>
                          <Text style={{ 
                            fontSize: 14,
                            color: isDarkMode ? '#d1d5db' : '#111827'
                          }}>{formatDate(record.dc_notice_date)}</Text>
                        </View>
                        <View style={{ 
                          paddingHorizontal: 16,
                          paddingVertical: 12,
                          width: 120
                        }}>
                          <Text style={{ 
                            fontSize: 14,
                            color: isDarkMode ? '#d1d5db' : '#111827'
                          }}>{record.invoice_id || '-'}</Text>
                        </View>
                        <View style={{ 
                          paddingHorizontal: 16,
                          paddingVertical: 12,
                          width: 120
                        }}>
                          {record.print_link ? (
                            <Pressable onPress={() => handleOpenLink(record.print_link!)}>
                              <Text style={{ color: '#3b82f6' }}>View</Text>
                            </Pressable>
                          ) : (
                            <Text style={{ 
                              fontSize: 14,
                              color: isDarkMode ? '#d1d5db' : '#111827'
                            }}>-</Text>
                          )}
                        </View>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              ) : (
                <View style={{ 
                  height: '100%',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Text style={{ 
                    color: isDarkMode ? '#6b7280' : '#9ca3af'
                  }}>
                    No items
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </View>
    </View>
  );
};

export default DCNoticePage;
