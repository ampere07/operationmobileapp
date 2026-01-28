import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { Search, ChevronRight, Tag } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);
  const [isDiscountFormModalOpen, setIsDiscountFormModalOpen] = useState<boolean>(false);
  const [addButtonHovered, setAddButtonHovered] = useState(false);

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

  const handleOpenDiscountFormModal = () => {
    setIsDiscountFormModalOpen(true);
  };

  const handleCloseDiscountFormModal = () => {
    setIsDiscountFormModalOpen(false);
  };

  const handleSaveDiscount = async (formData: any) => {
    try {
      await handleRefresh();
      handleCloseDiscountFormModal();
    } catch (error) {
      console.error('Error saving discount:', error);
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
              Discounts
            </Text>
            <Pressable 
              onPress={handleOpenDiscountFormModal}
              onPressIn={() => setAddButtonHovered(true)}
              onPressOut={() => setAddButtonHovered(false)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                paddingHorizontal: 12,
                paddingVertical: 4,
                borderRadius: 4,
                fontSize: 14,
                backgroundColor: addButtonHovered && colorPalette?.accent
                  ? colorPalette.accent
                  : colorPalette?.primary || '#ea580c'
              }}
            >
              <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>+</Text>
              <Text style={{ color: '#ffffff' }}>Add</Text>
            </Pressable>
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
              {location.id === 'all' ? (
                <>
                  <Text style={{ 
                    fontSize: 14,
                    color: selectedLocation === location.id ? (colorPalette?.primary || '#fb923c') : (isDarkMode ? '#d1d5db' : '#6b7280')
                  }}>
                    All
                  </Text>
                  {location.count > 0 && (
                    <View style={{
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 9999,
                      fontSize: 12,
                      backgroundColor: selectedLocation === location.id 
                        ? (colorPalette?.primary || '#ea580c')
                        : (isDarkMode ? '#374151' : '#d1d5db')
                    }}>
                      <Text style={{ 
                        color: selectedLocation === location.id ? '#ffffff' : (isDarkMode ? '#d1d5db' : '#4b5563')
                      }}>
                        {location.count}
                      </Text>
                    </View>
                  )}
                </>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <ChevronRight size={16} color={selectedLocation === location.id ? (colorPalette?.primary || '#fb923c') : (isDarkMode ? '#d1d5db' : '#6b7280')} style={{ marginRight: 8 }} />
                    <Text style={{ 
                      textTransform: 'capitalize',
                      fontSize: 14,
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
                      backgroundColor: selectedLocation === location.id 
                        ? (colorPalette?.primary || '#ea580c')
                        : (isDarkMode ? '#374151' : '#d1d5db')
                    }}>
                      <Text style={{ 
                        color: selectedLocation === location.id ? '#ffffff' : (isDarkMode ? '#d1d5db' : '#4b5563')
                      }}>
                        {location.count}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={{ 
        flex: 1,
        overflow: 'hidden',
        backgroundColor: isDarkMode ? '#030712' : '#f9fafb'
      }}>
        <View style={{ flexDirection: 'column', height: '100%' }}>
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
                    Loading discount records...
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
              ) : (
                <View>
                  {filteredDiscountRecords.length > 0 ? (
                    filteredDiscountRecords.map((record) => (
                      <Pressable
                        key={record.id}
                        onPress={() => handleRecordClick(record)}
                        style={({ pressed }) => ({
                          paddingHorizontal: 16,
                          paddingVertical: 12,
                          borderBottomWidth: 1,
                          borderBottomColor: isDarkMode ? '#1f2937' : '#e5e7eb',
                          backgroundColor: selectedDiscount?.id === record.id
                            ? (isDarkMode ? '#1f2937' : '#f3f4f6')
                            : pressed
                              ? (isDarkMode ? '#1f2937' : '#f3f4f6')
                              : 'transparent'
                        })}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={{ 
                              fontWeight: '500',
                              color: isDarkMode ? '#ffffff' : '#111827'
                            }}>
                              {record.fullName}
                            </Text>
                            <Text style={{ color: '#f87171', fontSize: 14 }}>
                              {record.accountNo} | {record.fullName} | {record.address}
                            </Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 16, flexShrink: 0 }}>
                            <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>
                              ₱{record.discountAmount.toFixed(2)}
                            </Text>
                          </View>
                        </View>
                      </Pressable>
                    ))
                  ) : (
                    <View style={{ 
                      alignItems: 'center',
                      paddingVertical: 48
                    }}>
                      <Text style={{ 
                        color: isDarkMode ? '#9ca3af' : '#6b7280'
                      }}>
                        No discount records found matching your filters
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </View>

      {selectedDiscount && (
        <View style={{ flexShrink: 0, overflow: 'hidden' }}>
          <DiscountDetails
            discountRecord={selectedDiscount}
            onClose={handleCloseDetails}
            onApproveSuccess={handleRefresh}
          />
        </View>
      )}

      <DiscountFormModal
        isOpen={isDiscountFormModalOpen}
        onClose={handleCloseDiscountFormModal}
        onSave={handleSaveDiscount}
      />
    </View>
  );
};

export default Discounts;
