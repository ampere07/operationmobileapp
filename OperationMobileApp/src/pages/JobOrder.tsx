import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  FileText,
  Search,
  ChevronDown,
  ListFilter,
  Menu,
  X,
  RefreshCw,
  Filter,
  ArrowLeft,
  ChevronRight
} from 'lucide-react-native';
import { getJobOrders } from '../services/jobOrderService';
import { getCities, City } from '../services/cityService';
import { getBillingStatuses, BillingStatus } from '../services/lookupService';
import { JobOrder } from '../types/jobOrder';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';
// Note: These components need to be migrated to React Native as well.
// For now, we will use inline placeholders or simplified versions if they are not yet migrated.
// import JobOrderDetails from '../components/JobOrderDetails';
// import JobOrderFunnelFilter from '../components/filters/JobOrderFunnelFilter';

interface LocationItem {
  id: string;
  name: string;
  count: number;
}

const allColumns = [
  // Keeping these for reference/filtering logic if needed, though simpler mobile view often doesn't need column config
  { key: 'timestamp', label: 'Timestamp' },
  { key: 'fullName', label: 'Full Name' },
  { key: 'address', label: 'Address' },
  { key: 'onsiteStatus', label: 'Onsite Status' },
  // ... other columns
];

const JobOrderPage: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedJobOrder, setSelectedJobOrder] = useState<JobOrder | null>(null);
  const [jobOrders, setJobOrders] = useState<JobOrder[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [billingStatuses, setBillingStatuses] = useState<BillingStatus[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('');

  // Mobile specific state
  const [mobileView, setMobileView] = useState<'locations' | 'orders' | 'details'>('locations');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [isFunnelFilterOpen, setIsFunnelFilterOpen] = useState<boolean>(false);

  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);
  const [activeFilters, setActiveFilters] = useState<any>({});

  useEffect(() => {
    const init = async () => {
      try {
        const savedFilters = await AsyncStorage.getItem('jobOrderFilters');
        if (savedFilters) {
          setActiveFilters(JSON.parse(savedFilters));
        }

        const theme = await AsyncStorage.getItem('theme');
        setIsDarkMode(theme !== 'light'); // Default to dark if null

        const authData = await AsyncStorage.getItem('authData');
        if (authData) {
          const userData = JSON.parse(authData);
          setUserRole(userData.role || '');
        }

        const activePalette = await settingsColorPaletteService.getActive();
        setColorPalette(activePalette);

      } catch (e) {
        console.error('Initialization error:', e);
      }
    };
    init();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const citiesData = await getCities();
      setCities(citiesData || []);

      const billingStatusesData = await getBillingStatuses();
      setBillingStatuses(billingStatusesData || []);

      // Note: getJobOrders service might need update to support AsyncStorage or passed token
      // For now assuming the service works or polyfills localStorage if shared
      const response = await getJobOrders();

      if (response && (response.success || Array.isArray(response.data))) {
        // Handle both response structures depending on service implementation
        const rawData = response.data || response;
        const dataArray = Array.isArray(rawData) ? rawData : [];

        const processedOrders: JobOrder[] = dataArray.map((order: any, index: number) => ({
          ...order,
          id: order.id || order.JobOrder_ID || String(index)
        }));
        setJobOrders(processedOrders);
      } else {
        setJobOrders([]);
      }
    } catch (err: any) {
      console.error('Fetch data error:', err);
      setError(`Failed to load data: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  const getClientFullName = (jobOrder: JobOrder): string => {
    return [
      jobOrder.First_Name || jobOrder.first_name || '',
      jobOrder.Middle_Initial || jobOrder.middle_initial ? (jobOrder.Middle_Initial || jobOrder.middle_initial) + '.' : '',
      jobOrder.Last_Name || jobOrder.last_name || ''
    ].filter(Boolean).join(' ').trim() || '-';
  };

  const getClientFullAddress = (jobOrder: JobOrder): string => {
    const addressParts = [
      jobOrder.Address || jobOrder.address,
      jobOrder.Location || jobOrder.location,
      jobOrder.Barangay || jobOrder.barangay,
      jobOrder.City || jobOrder.city,
      jobOrder.Region || jobOrder.region
    ].filter(Boolean);
    return addressParts.length > 0 ? addressParts.join(', ') : '-';
  };

  const locationItems: LocationItem[] = [
    { id: 'all', name: 'All', count: jobOrders.length }
  ];

  cities.forEach(city => {
    const cityCount = jobOrders.filter(job => {
      const jobCity = ((job.City || job.city) || '').toLowerCase();
      const cityName = city.name.toLowerCase();
      return jobCity.includes(cityName) || cityName.includes(jobCity);
    }).length;
    locationItems.push({
      id: city.name.toLowerCase(),
      name: city.name,
      count: cityCount
    });
  });

  // Filter logic
  let filteredJobOrders = jobOrders.filter(jobOrder => {
    const jobLocation = ((jobOrder.City || jobOrder.city) || '').toLowerCase();
    const matchesLocation = selectedLocation === 'all' ||
      jobLocation.includes(selectedLocation) ||
      selectedLocation.includes(jobLocation);

    const fullName = getClientFullName(jobOrder).toLowerCase();
    const matchesSearch = searchQuery === '' ||
      fullName.includes(searchQuery.toLowerCase()) ||
      ((jobOrder.Address || jobOrder.address) || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      ((jobOrder.Assigned_Email || jobOrder.assigned_email) || '').toLowerCase().includes(searchQuery.toLowerCase());

    return matchesLocation && matchesSearch;
  });

  // Sort by ID desc
  const sortedJobOrders = [...filteredJobOrders].sort((a, b) => {
    const idA = parseInt(String(a.id)) || 0;
    const idB = parseInt(String(b.id)) || 0;
    return idB - idA;
  });

  const getStatusColorClass = (status: string | undefined | null) => {
    if (!status) return 'text-gray-400';
    const s = status.toLowerCase();
    if (s.includes('done') || s.includes('completed') || s.includes('active')) return 'text-green-500';
    if (s.includes('pending') || s.includes('in progress')) return 'text-orange-500';
    if (s.includes('failed') || s.includes('cancelled') || s.includes('overdue')) return 'text-red-500';
    return 'text-blue-500';
  };

  const formatDate = (dateStr?: string | null): string => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleString();
    } catch { return '-'; }
  };

  // Render Functions
  const renderLocationItem = ({ item }: { item: LocationItem }) => (
    <TouchableOpacity
      onPress={() => {
        setSelectedLocation(item.id);
        setMobileView('orders');
      }}
      className={`flex-row items-center justify-between p-4 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'
        } ${selectedLocation === item.id ? (isDarkMode ? 'bg-gray-800' : 'bg-gray-100') : ''}`}
    >
      <View className="flex-row items-center">
        <FileText size={20} color={isDarkMode ? '#9ca3af' : '#4b5563'} />
        <Text className={`ml-3 text-base capitalize ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
          {item.name}
        </Text>
      </View>
      {item.count > 0 && (
        <View className="bg-orange-600 px-2 py-1 rounded-full">
          <Text className="text-white text-xs">{item.count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderJobOrderItem = ({ item }: { item: JobOrder }) => (
    <TouchableOpacity
      onPress={() => {
        setSelectedJobOrder(item);
        setMobileView('details');
      }}
      className={`p-4 border-b mb-1 ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
        }`}
    >
      <View className="flex-row justify-between items-start">
        <View className="flex-1">
          <Text className={`font-bold text-base mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {getClientFullName(item)}
          </Text>
          <Text className={`text-xs mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {formatDate(item.Timestamp || item.timestamp)}
          </Text>
          <Text className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`} numberOfLines={2}>
            {getClientFullAddress(item)}
          </Text>
        </View>
        <View className="ml-2">
          <Text className={`text-xs font-bold uppercase ${getStatusColorClass(item.Onsite_Status || item.onsite_status)}`}>
            {item.Onsite_Status || item.onsite_status || 'PENDING'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading && !isRefreshing) {
    return (
      <View className={`flex-1 justify-center items-center ${isDarkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
        <ActivityIndicator size="large" color={colorPalette?.primary || '#ea580c'} />
        <Text className={`mt-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Loading job orders...</Text>
      </View>
    );
  }

  // --- Mobile View: Locations ---
  if (mobileView === 'locations') {
    return (
      <SafeAreaView className={`flex-1 ${isDarkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
        <View className={`p-4 border-b ${isDarkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'}`}>
          <Text className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Job Orders
          </Text>
        </View>
        <FlatList
          data={locationItems}
          keyExtractor={(item) => item.id}
          renderItem={renderLocationItem}
        />
      </SafeAreaView>
    );
  }

  // --- Mobile View: Orders ---
  if (mobileView === 'orders') {
    return (
      <SafeAreaView className={`flex-1 ${isDarkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
        <View className={`p-4 border-b flex-row items-center space-x-3 ${isDarkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'}`}>
          <TouchableOpacity onPress={() => setMobileView('locations')} className="mr-2">
            <ArrowLeft size={24} color={isDarkMode ? 'white' : 'black'} />
          </TouchableOpacity>
          <View className="flex-1 relative">
            <TextInput
              placeholder="Search..."
              placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
              value={searchQuery}
              onChangeText={setSearchQuery}
              className={`pl-10 pr-4 py-2 rounded-lg border ${isDarkMode ? 'bg-gray-800 text-white border-gray-700' : 'bg-gray-100 text-gray-900 border-gray-300'
                }`}
            />
            <View className="absolute left-3 top-3">
              <Search size={18} color={isDarkMode ? '#9ca3af' : '#6b7280'} />
            </View>
          </View>
          <TouchableOpacity
            onPress={handleRefresh}
            className="p-2 rounded-lg"
            style={{ backgroundColor: colorPalette?.primary || '#ea580c' }}
          >
            <RefreshCw size={20} color="white" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={sortedJobOrders}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderJobOrderItem}
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <View className="p-8 items-center">
              <Text className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                No job orders found.
              </Text>
            </View>
          }
        />
      </SafeAreaView>
    );
  }

  // --- Mobile View: Details ---
  return (
    <SafeAreaView className={`flex-1 ${isDarkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
      <View className={`p-4 border-b flex-row items-center justify-between ${isDarkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'}`}>
        <TouchableOpacity onPress={() => setMobileView('orders')} className="flex-row items-center">
          <ArrowLeft size={24} color={isDarkMode ? 'white' : 'black'} />
          <Text className={`ml-2 text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Job Details
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 p-4">
        {selectedJobOrder ? (
          <View>
            <View className={`p-4 rounded-lg mb-4 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
              <Text className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {getClientFullName(selectedJobOrder)}
              </Text>
              <Text className={`mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {getClientFullAddress(selectedJobOrder)}
              </Text>

              <View className="flex-row justify-between border-t border-gray-700 pt-4">
                <View>
                  <Text className="text-gray-500 text-xs uppercase">Status</Text>
                  <Text className={`text-lg font-bold ${getStatusColorClass(selectedJobOrder.Onsite_Status)}`}>
                    {selectedJobOrder.Onsite_Status || 'PENDING'}
                  </Text>
                </View>
                <View>
                  <Text className="text-gray-500 text-xs uppercase">Job ID</Text>
                  <Text className={`text-lg ${isDarkMode ? 'text-white' : 'text-black'}`}>
                    {selectedJobOrder.id}
                  </Text>
                </View>
              </View>
            </View>

            <View className={`p-4 rounded-lg mb-4 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
              <Text className={`font-bold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Details</Text>

              <DetailRow label="Plan" value={selectedJobOrder.Choose_Plan || selectedJobOrder.choose_plan} dark={isDarkMode} />
              <DetailRow label="Connection" value={selectedJobOrder.Connection_Type} dark={isDarkMode} />
              <DetailRow label="Router Model" value={selectedJobOrder.Router_Model} dark={isDarkMode} />
              <DetailRow label="Contact" value={selectedJobOrder.Contact_Number} dark={isDarkMode} />
              <DetailRow label="Email" value={selectedJobOrder.Email_Address} dark={isDarkMode} />
              <DetailRow label="Installation Date" value={formatDate(selectedJobOrder.Date_Installed)} dark={isDarkMode} />
            </View>

            <View className="p-4 items-center">
              <Text className="text-gray-500 italic">
                Note: Full editing capabilities and advanced details view are being migrated.
              </Text>
            </View>
          </View>
        ) : (
          <Text className="text-center text-gray-500 mt-10">No order selected</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const DetailRow = ({ label, value, dark }: { label: string, value: any, dark: boolean }) => (
  <View className={`flex-row justify-between py-2 border-b ${dark ? 'border-gray-800' : 'border-gray-100'}`}>
    <Text className={dark ? 'text-gray-400' : 'text-gray-500'}>{label}</Text>
    <Text className={`font-medium ${dark ? 'text-gray-200' : 'text-gray-800'}`}>{value || '-'}</Text>
  </View>
);

export default JobOrderPage;
