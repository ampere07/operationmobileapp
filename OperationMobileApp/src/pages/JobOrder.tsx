import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  ScrollView,
  ActivityIndicator,
  Modal,
  SafeAreaView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  FileText,
  Search,
  ChevronDown,
  Menu,
  X,
  RefreshCw,
  ArrowLeft,
  ArrowUpDown,
  Check,
  MoreVertical
} from 'lucide-react-native';
import { getJobOrders } from '../services/jobOrderService';
import { getCities, City } from '../services/cityService';
import { JobOrder } from '../types/jobOrder';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';
import JobOrderDetails from '../components/JobOrderDetails';
import JobOrderFunnelFilter from '../components/filters/JobOrderFunnelFilter';

interface LocationItem {
  id: string;
  name: string;
  count: number;
}

interface SortOption {
  key: keyof JobOrder | string;
  label: string;
}

const sortOptions: SortOption[] = [
  { key: 'id', label: 'ID (Default)' },
  { key: 'Timestamp', label: 'Date Created' },
  { key: 'Date_Installed', label: 'Date Installed' },
  { key: 'First_Name', label: 'Client Name' },
  { key: 'Onsite_Status', label: 'Status' },
  { key: 'City', label: 'City' },
];

const JobOrderPage: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedJobOrder, setSelectedJobOrder] = useState<JobOrder | null>(null);
  const [jobOrders, setJobOrders] = useState<JobOrder[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('');

  // Mobile specific state
  const [mobileView, setMobileView] = useState<'locations' | 'orders' | 'details'>('locations');
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);
  const [activeFilters, setActiveFilters] = useState<any>({});
  const [isFunnelFilterOpen, setIsFunnelFilterOpen] = useState(false);

  // Sorting State
  const [sortKey, setSortKey] = useState<string>('id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isSortModalOpen, setIsSortModalOpen] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const savedFilters = await AsyncStorage.getItem('jobOrderFilters');
        if (savedFilters) setActiveFilters(JSON.parse(savedFilters));

        const theme = await AsyncStorage.getItem('theme');
        setIsDarkMode(theme !== 'light');

        const authData = await AsyncStorage.getItem('authData');
        if (authData) {
          const userData = JSON.parse(authData);
          setUserRole(userData.role || '');
        }

        const activePalette = await settingsColorPaletteService.getActive();
        setColorPalette(activePalette);

      } catch (e) { console.error(e); }
    };
    init();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const citiesData = await getCities();
      setCities(citiesData || []);

      const response = await getJobOrders();
      if (response && (response.success || Array.isArray(response.data))) {
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
      setError(`Failed to load data: ${err.message}`);
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
      jobOrder.First_Name || jobOrder.first_name,
      jobOrder.Middle_Initial || jobOrder.middle_initial ? (jobOrder.Middle_Initial || jobOrder.middle_initial) + '.' : '',
      jobOrder.Last_Name || jobOrder.last_name
    ].filter(Boolean).join(' ').trim() || '-';
  };

  const getClientFullAddress = (jobOrder: JobOrder): string => {
    const addressParts = [
      jobOrder.Address || jobOrder.address,
      jobOrder.Location || jobOrder.location,
      jobOrder.Barangay || jobOrder.barangay,
      jobOrder.City || jobOrder.city
    ].filter(Boolean);
    return addressParts.length > 0 ? addressParts.join(', ') : '-';
  };

  // --- Filtering & Sorting Logic ---

  // 1. Basic Filters (Location & Search)
  let filteredJobOrders = jobOrders.filter(jobOrder => {
    const jobLocation = ((jobOrder.City || jobOrder.city) || '').toLowerCase();
    const cityMatch = selectedLocation === 'all' || jobLocation.includes(selectedLocation) || selectedLocation.includes(jobLocation);

    const fullName = getClientFullName(jobOrder).toLowerCase();
    const searchMatch = searchQuery === '' ||
      fullName.includes(searchQuery.toLowerCase()) ||
      String(jobOrder.id).includes(searchQuery) ||
      ((jobOrder.Address || jobOrder.address) || '').toLowerCase().includes(searchQuery.toLowerCase());

    return cityMatch && searchMatch;
  });

  // 2. Advanced Funnel Filters
  if (Object.keys(activeFilters).length > 0) {
    filteredJobOrders = filteredJobOrders.filter(job => {
      return Object.entries(activeFilters).every(([key, filter]: [string, any]) => {
        if (!filter.value && !filter.from && !filter.to) return true;

        const itemValue = (job as any)[key];

        if (filter.type === 'text' && filter.value) {
          return String(itemValue || '').toLowerCase().includes(filter.value.toLowerCase());
        }
        if (filter.type === 'number' || filter.type === 'date') {
          const val = itemValue;
          // Simple range check (could be enhanced for stricter types)
          if (filter.from && val < filter.from) return false;
          if (filter.to && val > filter.to) return false;
          return true;
        }
        return true;
      });
    });
  }

  // 3. Sorting
  const sortedJobOrders = [...filteredJobOrders].sort((a: any, b: any) => {
    let valA = a[sortKey];
    let valB = b[sortKey];

    // Handle specific fallback keys if the primary key is missing (e.g. casing differences)
    if (sortKey === 'First_Name') {
      valA = a.First_Name || a.first_name || '';
      valB = b.First_Name || b.first_name || '';
    } else if (sortKey === 'Timestamp') {
      valA = a.Timestamp || a.timestamp || a.created_at || '';
      valB = b.Timestamp || b.timestamp || b.created_at || '';
    } else if (sortKey === 'id') {
      valA = parseInt(String(a.id || 0));
      valB = parseInt(String(b.id || 0));
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const getStatusColorClass = (status: string | undefined | null) => {
    if (!status) return 'text-gray-400';
    const s = status.toLowerCase();
    if (s.includes('done') || s.includes('active')) return 'text-green-500';
    if (s.includes('pending') || s.includes('progress')) return 'text-orange-500';
    if (s.includes('fail') || s.includes('cancel')) return 'text-red-500';
    return 'text-blue-500';
  };

  const formatDate = (dateStr?: string | null): string => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch { return '-'; }
  };

  const handleApplyFilters = (newFilters: any) => {
    setActiveFilters(newFilters);
    AsyncStorage.setItem('jobOrderFilters', JSON.stringify(newFilters));
  };

  // --- Render Items ---

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
        <View className="flex-1 mr-2">
          <Text className={`font-bold text-base mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {getClientFullName(item)}
          </Text>
          <Text className={`text-xs mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            ID: {item.id} • {formatDate(item.Timestamp || item.timestamp)}
          </Text>
          <Text className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`} numberOfLines={1}>
            {getClientFullAddress(item)}
          </Text>
        </View>
        <View className="items-end">
          <Text className={`text-xs font-bold uppercase mb-1 ${getStatusColorClass(item.Onsite_Status)}`}>
            {item.Onsite_Status || 'PENDING'}
          </Text>
          <Text className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            {item.Region || item.region || ''}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  // --- Views ---

  if (loading && !isRefreshing) {
    return (
      <View className={`flex-1 justify-center items-center ${isDarkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
        <ActivityIndicator size="large" color={colorPalette?.primary || '#ea580c'} />
        <Text className={`mt-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Loading job orders...</Text>
      </View>
    );
  }

  // 1. Locations View
  if (mobileView === 'locations') {
    const locationItems: LocationItem[] = [
      { id: 'all', name: 'All Locations', count: jobOrders.length }
    ];
    cities.forEach(city => {
      const count = jobOrders.filter(j =>
        ((j.City || j.city) || '').toLowerCase().includes(city.name.toLowerCase())
      ).length;
      if (count > 0) {
        locationItems.push({ id: city.name.toLowerCase(), name: city.name, count });
      }
    });

    return (
      <SafeAreaView className={`flex-1 ${isDarkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
        <View className={`p-4 border-b flex-row justify-between items-center ${isDarkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'}`}>
          <Text className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Job Orders
          </Text>
          <TouchableOpacity onPress={handleRefresh}>
            <RefreshCw size={20} color={isDarkMode ? 'white' : 'black'} />
          </TouchableOpacity>
        </View>
        <FlatList
          data={locationItems}
          keyExtractor={(item) => item.id}
          renderItem={renderLocationItem}
        />
      </SafeAreaView>
    );
  }

  // 2. Orders List View
  if (mobileView === 'orders') {
    return (
      <SafeAreaView className={`flex-1 ${isDarkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
        {/* Header with Search */}
        <View className={`px-4 py-2 border-b space-y-3 ${isDarkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'}`}>
          <View className="flex-row items-center space-x-2">
            <TouchableOpacity onPress={() => setMobileView('locations')} className="mr-1">
              <ArrowLeft size={24} color={isDarkMode ? 'white' : 'black'} />
            </TouchableOpacity>
            <View className="flex-1 relative">``
              <TextInput
                placeholder="Search name, id, address..."
                placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
                value={searchQuery}
                onChangeText={setSearchQuery}
                className={`pl-9 pr-4 py-2 rounded-lg border text-sm ${isDarkMode ? 'bg-gray-800 text-white border-gray-700' : 'bg-gray-100 text-gray-900 border-gray-300'
                  }`}
              />
              <View className="absolute left-3 top-2.5">
                <Search size={16} color={isDarkMode ? '#9ca3af' : '#6b7280'} />
              </View>
            </View>
          </View>

          {/* Action Row: Sort & Filter */}
          <View className="flex-row space-x-2 justify-between">
            <TouchableOpacity
              onPress={() => setIsSortModalOpen(true)}
              className={`flex-1 flex-row items-center justify-center py-2 rounded border ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-gray-100'}`}
            >
              <ArrowUpDown size={16} color={isDarkMode ? 'white' : 'black'} />
              <Text className={`ml-2 text-xs font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>
                Sort: {sortOptions.find(o => o.key === sortKey)?.label || 'ID'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setIsFunnelFilterOpen(true)}
              className={`flex-1 flex-row items-center justify-center py-2 rounded border ${Object.keys(activeFilters).length > 0
                ? (isDarkMode ? 'border-orange-500 bg-orange-900/20' : 'border-orange-500 bg-orange-50')
                : (isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-gray-100')
                }`}
            >
              <Menu size={16} color={Object.keys(activeFilters).length > 0 ? '#f97316' : (isDarkMode ? 'white' : 'black')} />
              <Text className={`ml-2 text-xs font-bold ${Object.keys(activeFilters).length > 0 ? 'text-orange-500' : (isDarkMode ? 'text-white' : 'text-black')}`}>
                Filters {Object.keys(activeFilters).length > 0 ? `(${Object.keys(activeFilters).length})` : ''}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          data={sortedJobOrders}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderJobOrderItem}
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          className="flex-1"
          ListEmptyComponent={
            <View className="p-8 items-center">
              <Text className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                No job orders found.
              </Text>
            </View>
          }
        />

        {/* Sort Modal */}
        <Modal visible={isSortModalOpen} transparent animationType="slide">
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setIsSortModalOpen(false)}
            className="flex-1 bg-black/50 justify-end"
          >
            <View className={`rounded-t-xl p-4 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
              <View className="flex-row justify-between items-center mb-4 border-b pb-2 border-gray-200 dark:border-gray-700">
                <Text className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>Sort By</Text>
                <TouchableOpacity onPress={() => setIsSortModalOpen(false)}>
                  <X size={24} color={isDarkMode ? 'white' : 'black'} />
                </TouchableOpacity>
              </View>

              <View className="flex-row mb-4 bg-gray-100 dark:bg-gray-800 rounded p-1">
                <TouchableOpacity
                  onPress={() => setSortOrder('asc')}
                  className={`flex-1 items-center py-2 rounded ${sortOrder === 'asc' ? 'bg-white shadow dark:bg-gray-700' : ''}`}
                >
                  <Text className={isDarkMode ? 'text-white' : 'text-black'}>Ascending</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setSortOrder('desc')}
                  className={`flex-1 items-center py-2 rounded ${sortOrder === 'desc' ? 'bg-white shadow dark:bg-gray-700' : ''}`}
                >
                  <Text className={isDarkMode ? 'text-white' : 'text-black'}>Descending</Text>
                </TouchableOpacity>
              </View>

              <ScrollView className="max-h-96">
                {sortOptions.map(option => (
                  <TouchableOpacity
                    key={option.key as string}
                    onPress={() => {
                      setSortKey(option.key as string);
                      setIsSortModalOpen(false);
                    }}
                    className={`flex-row justify-between items-center py-4 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}
                  >
                    <Text className={isDarkMode ? 'text-white' : 'text-gray-900'}>{option.label}</Text>
                    {sortKey === option.key && <Check size={18} color={colorPalette?.primary || '#ea580c'} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

        <JobOrderFunnelFilter
          isOpen={isFunnelFilterOpen}
          onClose={() => setIsFunnelFilterOpen(false)}
          onApplyFilters={handleApplyFilters}
          currentFilters={activeFilters}
        />
      </SafeAreaView>
    );
  }

  // 3. Details View
  if (mobileView === 'details' && selectedJobOrder) {
    return (
      <SafeAreaView className={`flex-1 ${isDarkMode ? 'bg-gray-950' : 'bg-white'}`}>
        <JobOrderDetails
          jobOrder={selectedJobOrder}
          onClose={() => setMobileView('orders')}
          onRefresh={() => {
            fetchData();
            setMobileView('orders');
          }}
          isMobile={true}
        />
      </SafeAreaView>
    );
  }

  return null;
};

export default JobOrderPage;
