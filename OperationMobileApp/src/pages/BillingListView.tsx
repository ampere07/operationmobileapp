import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Pressable, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { CreditCard, Search, Circle } from 'lucide-react-native';
import BillingDetails from '../components/CustomerDetails';
import { getBillingRecords, BillingRecord } from '../services/billingService';
import { getCustomerDetail, CustomerDetailData } from '../services/customerDetailService';
import { BillingDetailRecord } from '../types/billing';
import { getCities, City } from '../services/cityService';
import { getRegions, Region } from '../services/regionService';

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

interface LocationItem {
  id: string;
  name: string;
  count: number;
}

type DisplayMode = 'card' | 'table';

const BillingListView: React.FC = () => {
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetailData | null>(null);
  const [billingRecords, setBillingRecords] = useState<BillingRecord[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('table');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<View>(null);

  const [visibleColumns, setVisibleColumns] = useState([
    'status', 'billingStatus', 'accountNo', 'dateInstalled', 'customerName',
    'address', 'contactNumber', 'emailAddress', 'plan', 'balance'
  ]);

  const allColumns = [
    { key: 'status', label: 'Status', width: 112 },
    { key: 'billingStatus', label: 'Billing Status', width: 112 },
    { key: 'accountNo', label: 'Account No.', width: 128 },
    { key: 'dateInstalled', label: 'Date Installed', width: 112 },
    { key: 'customerName', label: 'Full Name', width: 160 },
    { key: 'address', label: 'Address', width: 224 },
    { key: 'contactNumber', label: 'Contact Number', width: 144 },
    { key: 'emailAddress', label: 'Email Address', width: 192 },
    { key: 'plan', label: 'Plan', width: 160 },
    { key: 'balance', label: 'Account Balance', width: 128 },
    { key: 'username', label: 'Username', width: 128 },
    { key: 'connectionType', label: 'Connection Type', width: 144 },
    { key: 'routerModel', label: 'Router Model', width: 128 },
    { key: 'routerModemSN', label: 'Router/Modem SN', width: 144 },
    { key: 'lcpnap', label: 'LCPNAP', width: 128 },
    { key: 'port', label: 'PORT', width: 112 },
    { key: 'vlan', label: 'VLAN', width: 96 },
    { key: 'billingDay', label: 'Billing Day', width: 112 },
    { key: 'totalPaid', label: 'Total Paid', width: 112 },
    { key: 'provider', label: 'Provider', width: 96 }
  ];
  
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
    const fetchBillingData = async () => {
      try {
        setIsLoading(true);
        const data = await getBillingRecords();
        setBillingRecords(data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch billing records:', err);
        setError('Failed to load billing records. Please try again.');
        setBillingRecords([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchBillingData();
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
        count: billingRecords.length
      }
    ];
    
    cities.forEach((city) => {
      const cityCount = billingRecords.filter(record => record.cityId === city.id).length;
      items.push({
        id: String(city.id),
        name: city.name,
        count: cityCount
      });
    });

    return items;
  }, [cities, billingRecords]);

  const filteredBillingRecords = useMemo(() => {
    return billingRecords.filter(record => {
      const matchesLocation = selectedLocation === 'all' || 
                             record.cityId === Number(selectedLocation);
      
      const matchesSearch = searchQuery === '' || 
                           record.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           record.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           record.applicationId.includes(searchQuery);
      
      return matchesLocation && matchesSearch;
    });
  }, [billingRecords, selectedLocation, searchQuery]);

  const handleRowClick = async (record: BillingRecord) => {
    try {
      setIsLoadingDetails(true);
      console.log('Fetching customer detail for account:', record.applicationId);
      const customerData = await getCustomerDetail(record.applicationId);
      console.log('Fetched customer data:', customerData);
      setSelectedCustomer(customerData);
    } catch (error) {
      console.error('Failed to fetch customer details:', error);
      setError('Failed to load customer details');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleCloseDetails = () => {
    setSelectedCustomer(null);
  };

  const handleRefresh = async () => {
    try {
      setIsLoading(true);
      const data = await getBillingRecords();
      setBillingRecords(data);
      setError(null);
    } catch (err) {
      console.error('Failed to refresh billing records:', err);
      setError('Failed to refresh billing records. Please try again.');
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

  const renderCellValue = (record: BillingRecord, columnKey: string) => {
    switch (columnKey) {
      case 'status':
        return (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Circle 
              size={12}
              color={record.onlineStatus === 'Online' ? '#4ade80' : '#9ca3af'}
              fill={record.onlineStatus === 'Online' ? '#4ade80' : '#9ca3af'}
            />
            <Text style={{ 
              fontSize: 12, 
              color: record.onlineStatus === 'Online' ? '#4ade80' : '#9ca3af' 
            }}>
              {record.onlineStatus}
            </Text>
          </View>
        );
      case 'billingStatus':
        return <Text style={{ color: '#ffffff' }}>{record.billingStatus || 'Active'}</Text>;
      case 'accountNo':
        return <Text style={{ color: '#f87171' }}>{record.applicationId}</Text>;
      case 'dateInstalled':
        return <Text style={{ color: '#ffffff' }}>{record.dateInstalled || '-'}</Text>;
      case 'customerName':
        return <Text style={{ color: '#ffffff' }}>{record.customerName}</Text>;
      case 'address':
        return <Text style={{ color: '#ffffff' }} numberOfLines={1}>{record.address}</Text>;
      case 'contactNumber':
        return <Text style={{ color: '#ffffff' }}>{record.contactNumber || '-'}</Text>;
      case 'emailAddress':
        return <Text style={{ color: '#ffffff' }}>{record.emailAddress || '-'}</Text>;
      case 'plan':
        return <Text style={{ color: '#ffffff' }}>{record.plan || '-'}</Text>;
      case 'balance':
        return <Text style={{ color: '#ffffff' }}>{`₱ ${record.balance.toFixed(2)}`}</Text>;
      case 'username':
        return <Text style={{ color: '#ffffff' }}>{record.username || '-'}</Text>;
      case 'connectionType':
        return <Text style={{ color: '#ffffff' }}>{record.connectionType || '-'}</Text>;
      case 'routerModel':
        return <Text style={{ color: '#ffffff' }}>{record.routerModel || '-'}</Text>;
      case 'routerModemSN':
        return <Text style={{ color: '#ffffff' }}>{record.routerModemSN || '-'}</Text>;
      case 'lcpnap':
        return <Text style={{ color: '#ffffff' }}>{record.lcpnap || '-'}</Text>;
      case 'port':
        return <Text style={{ color: '#ffffff' }}>{record.port || '-'}</Text>;
      case 'vlan':
        return <Text style={{ color: '#ffffff' }}>{record.vlan || '-'}</Text>;
      case 'billingDay':
        return <Text style={{ color: '#ffffff' }}>{record.billingDay === 0 ? 'Every end of month' : (record.billingDay || '-')}</Text>;
      case 'totalPaid':
        return <Text style={{ color: '#ffffff' }}>{`₱ ${record.totalPaid?.toFixed(2) || '0.00'}`}</Text>;
      case 'provider':
        return <Text style={{ color: '#ffffff' }}>{record.provider || '-'}</Text>;
      default:
        return <Text style={{ color: '#ffffff' }}>-</Text>;
    }
  };

  const displayedColumns = allColumns.filter(col => visibleColumns.includes(col.key));

  return (
    <View style={{ backgroundColor: '#030712', height: '100%', flexDirection: 'row', overflow: 'hidden' }}>
      <View style={{ width: 256, backgroundColor: '#111827', borderRightWidth: 1, borderRightColor: '#374151', flexShrink: 0, flexDirection: 'column' }}>
        <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#374151', flexShrink: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#ffffff' }}>Billing List View</Text>
          </View>
        </View>
        <ScrollView style={{ flex: 1 }}>
          {locationItems.map((location) => (
            <Pressable
              key={location.id}
              onPress={() => setSelectedLocation(location.id)}
              style={({ pressed }) => [
                {
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
                      ? '#1f2937' 
                      : 'transparent'
                }
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <CreditCard size={16} color={selectedLocation === location.id ? '#fb923c' : '#d1d5db'} style={{ marginRight: 8 }} />
                <Text style={{ 
                  textTransform: 'capitalize',
                  color: selectedLocation === location.id ? '#fb923c' : '#d1d5db'
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
                  backgroundColor: selectedLocation === location.id ? '#ea580c' : '#374151'
                }}>
                  <Text style={{ color: selectedLocation === location.id ? '#ffffff' : '#d1d5db' }}>
                    {location.count}
                  </Text>
                </View>
              )}
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={{ flex: 1, backgroundColor: '#111827', overflow: 'hidden' }}>
        <View style={{ flexDirection: 'column', height: '100%' }}>
          <View style={{ backgroundColor: '#111827', padding: 16, borderBottomWidth: 1, borderBottomColor: '#374151', flexShrink: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ position: 'relative', flex: 1 }}>
                <TextInput
                  placeholder="Search billing records..."
                  placeholderTextColor="#9ca3af"
                  value={searchQuery}
                  onChangeText={(text) => setSearchQuery(text)}
                  style={{
                    width: '100%',
                    backgroundColor: '#1f2937',
                    color: '#ffffff',
                    borderWidth: 1,
                    borderColor: '#374151',
                    borderRadius: 4,
                    paddingLeft: 40,
                    paddingRight: 16,
                    paddingVertical: 8
                  }}
                />
                <View style={{ position: 'absolute', left: 12, top: 10 }}>
                  <Search size={16} color="#9ca3af" />
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ position: 'relative' }} ref={dropdownRef}>
                  <Pressable
                    style={{ 
                      backgroundColor: '#374151', 
                      paddingHorizontal: 16, 
                      paddingVertical: 8, 
                      borderRadius: 4, 
                      fontSize: 14,
                      flexDirection: 'row',
                      alignItems: 'center'
                    }}
                    onPress={() => setDropdownOpen(!dropdownOpen)}
                  >
                    <Text style={{ color: '#ffffff' }}>{displayMode === 'card' ? 'Card Type' : 'Table Type'}</Text>
                    <View style={{ width: 16, height: 16, marginLeft: 4 }}>
                      <Text style={{ color: '#ffffff' }}>▼</Text>
                    </View>
                  </Pressable>
                  {dropdownOpen && (
                    <View style={{ 
                      position: 'absolute', 
                      right: 0, 
                      marginTop: 4, 
                      width: 144, 
                      backgroundColor: '#1f2937', 
                      borderWidth: 1, 
                      borderColor: '#374151', 
                      borderRadius: 4,
                      zIndex: 10
                    }}>
                      <Pressable
                        onPress={() => {
                          setDisplayMode('card');
                          setDropdownOpen(false);
                        }}
                        style={({ pressed }) => ({
                          width: '100%',
                          paddingHorizontal: 16,
                          paddingVertical: 8,
                          fontSize: 14,
                          backgroundColor: pressed ? '#374151' : 'transparent'
                        })}
                      >
                        <Text style={{ color: displayMode === 'card' ? '#f97316' : '#ffffff' }}>
                          Card Type
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          setDisplayMode('table');
                          setDropdownOpen(false);
                        }}
                        style={({ pressed }) => ({
                          width: '100%',
                          paddingHorizontal: 16,
                          paddingVertical: 8,
                          fontSize: 14,
                          backgroundColor: pressed ? '#374151' : 'transparent'
                        })}
                      >
                        <Text style={{ color: displayMode === 'table' ? '#f97316' : '#ffffff' }}>
                          Table Type
                        </Text>
                      </Pressable>
                    </View>
                  )}
                </View>
                <Pressable
                  onPress={handleRefresh}
                  disabled={isLoading}
                  style={({ pressed }) => ({
                    backgroundColor: isLoading ? '#4b5563' : pressed ? '#c2410c' : '#ea580c',
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 4,
                    fontSize: 14
                  })}
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
                <View style={{ paddingHorizontal: 16, paddingVertical: 48, alignItems: 'center', justifyContent: 'center' }}>
                  <ActivityIndicator size="large" color="#f97316" />
                  <Text style={{ marginTop: 16, color: '#9ca3af' }}>Loading billing records...</Text>
                </View>
              ) : error ? (
                <View style={{ paddingHorizontal: 16, paddingVertical: 48, alignItems: 'center' }}>
                  <Text style={{ color: '#f87171' }}>{error}</Text>
                  <Pressable 
                    onPress={handleRefresh}
                    style={{ 
                      marginTop: 16, 
                      backgroundColor: '#374151', 
                      paddingHorizontal: 16, 
                      paddingVertical: 8, 
                      borderRadius: 4 
                    }}
                  >
                    <Text style={{ color: '#ffffff' }}>Retry</Text>
                  </Pressable>
                </View>
              ) : (
                <ScrollView horizontal>
                  <View>
                    <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#374151', backgroundColor: '#1f2937' }}>
                      {displayedColumns.map((column, index) => (
                        <View
                          key={column.key}
                          style={{
                            paddingVertical: 12,
                            paddingHorizontal: 12,
                            backgroundColor: '#1f2937',
                            width: column.width,
                            borderRightWidth: index < displayedColumns.length - 1 ? 1 : 0,
                            borderRightColor: '#374151'
                          }}
                        >
                          <Text style={{ color: '#9ca3af', fontWeight: '400' }}>
                            {column.label}
                          </Text>
                        </View>
                      ))}
                    </View>
                    {filteredBillingRecords.length > 0 ? (
                      filteredBillingRecords.map((record) => (
                        <Pressable 
                          key={record.id}
                          onPress={() => handleRowClick(record)}
                          style={({ pressed }) => ({
                            flexDirection: 'row',
                            borderBottomWidth: 1,
                            borderBottomColor: '#1f2937',
                            backgroundColor: selectedCustomer?.billingAccount?.accountNo === record.applicationId 
                              ? '#1f2937' 
                              : pressed 
                                ? '#111827' 
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
                                borderRightColor: '#1f2937'
                              }}
                            >
                              {renderCellValue(record, column.key)}
                            </View>
                          ))}
                        </Pressable>
                      ))
                    ) : (
                      <View style={{ paddingHorizontal: 16, paddingVertical: 48, alignItems: 'center' }}>
                        <Text style={{ color: '#9ca3af' }}>
                          No billing records found matching your filters
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

      {(selectedCustomer || isLoadingDetails) && (
        <View style={{ flexShrink: 0, overflow: 'hidden' }}>
          {isLoadingDetails ? (
            <View style={{ 
              width: 600, 
              backgroundColor: '#111827', 
              height: '100%', 
              alignItems: 'center', 
              justifyContent: 'center', 
              borderLeftWidth: 1, 
              borderLeftColor: 'rgba(255, 255, 255, 0.3)' 
            }}>
              <View style={{ alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#f97316" style={{ marginBottom: 16 }} />
                <Text style={{ color: '#9ca3af' }}>Loading details...</Text>
              </View>
            </View>
          ) : selectedCustomer ? (
            <BillingDetails
              billingRecord={convertCustomerDataToBillingDetail(selectedCustomer)}
              onlineStatusRecords={[]}
              onClose={handleCloseDetails}
            />
          ) : null}
        </View>
      )}
    </View>
  );
};

export default BillingListView;
