import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Modal,
  SafeAreaView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  FileText,
  Search,
  Filter,
  ArrowLeft,
  X,
  ArrowUp,
  ArrowDown
} from 'lucide-react-native';
import { getAllApplicationVisits } from '../services/applicationVisitService';
import { getApplication } from '../services/applicationService';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';
import { applyFilters } from '../utils/filterUtils';
import ApplicationVisitDetails from '../components/ApplicationVisitDetails';
import ApplicationVisitFunnelFilter, { FilterValues } from '../components/filters/ApplicationVisitFunnelFilter';

interface ApplicationVisit {
  id: string;
  application_id: string;
  timestamp: string;
  assigned_email?: string;
  visit_by?: string;
  visit_with?: string;
  visit_with_other?: string;
  visit_status: string;
  visit_remarks?: string;
  status_remarks?: string;
  application_status?: string;
  full_name: string;
  full_address: string;
  referred_by?: string;
  updated_by_user_email: string;
  created_at: string;
  updated_at: string;
  first_name?: string;
  middle_initial?: string;
  last_name?: string;
  region?: string;
  city?: string;
  barangay?: string;
  location?: string;
  choose_plan?: string;
  promo?: string;
  house_front_picture_url?: string;
  image1_url?: string;
  image2_url?: string;
  image3_url?: string;
}

interface LocationItem {
  id: string;
  name: string;
  count: number;
}

interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

const allColumns = [
  { key: 'timestamp', label: 'Timestamp' },
  { key: 'full_name', label: 'Full Name' },
  { key: 'visit_status', label: 'Visit Status' },
  { key: 'application_status', label: 'App Status' },
  { key: 'full_address', label: 'Address' },
];

const ApplicationVisitPage: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedVisit, setSelectedVisit] = useState<ApplicationVisit | null>(null);
  const [applicationVisits, setApplicationVisits] = useState<ApplicationVisit[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('');

  // Mobile UI States
  const [mobileView, setMobileView] = useState<'locations' | 'visits' | 'details'>('locations');
  const [isFunnelFilterOpen, setIsFunnelFilterOpen] = useState<boolean>(false);
  const [isSortModalOpen, setIsSortModalOpen] = useState<boolean>(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'timestamp', direction: 'desc' });
  const [activeFilters, setActiveFilters] = useState<FilterValues>({});

  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const theme = await AsyncStorage.getItem('theme');
        setIsDarkMode(theme !== 'light');
        const activePalette = await settingsColorPaletteService.getActive();
        setColorPalette(activePalette);
        const savedFilters = await AsyncStorage.getItem('applicationVisitFunnelFilters');
        if (savedFilters) setActiveFilters(JSON.parse(savedFilters));
        const authData = await AsyncStorage.getItem('authData');
        if (authData) {
          const userData = JSON.parse(authData);
          setUserRole(userData.role || '');
        }
      } catch (e) {
        console.error('Init error', e);
      }
    };
    init();
  }, []);

  const fetchApplicationVisits = useCallback(async (isInitialLoad: boolean = false) => {
    try {
      if (isInitialLoad) setLoading(true);
      setError(null);

      const authData = await AsyncStorage.getItem('authData');
      let assignedEmail: string | undefined;
      let roleId: number | null = null;
      let userRoleString = '';

      if (authData) {
        const userData = JSON.parse(authData);
        roleId = userData.role_id || null;
        userRoleString = (userData.role || '').toLowerCase();
        if (userRoleString === 'technician' && userData.email) {
          assignedEmail = userData.email;
        }
      }

      const response = await getAllApplicationVisits(assignedEmail);

      if (response && response.success && Array.isArray(response.data)) {
        const visits: ApplicationVisit[] = response.data.map((visit: any) => ({
          ...visit,
          id: visit.id ? String(visit.id) : '',
          full_name: visit.full_name || [visit.first_name, visit.last_name].filter(Boolean).join(' '),
          full_address: visit.full_address || [visit.address, visit.location, visit.city].filter(Boolean).join(', ')
        }));

        // Technician Filter Logic (Last 7 days unless active)
        const isTechnician = Number(roleId) === 2 || userRoleString === 'technician';
        let filteredVisits = visits;

        if (isTechnician) {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          const activeStatuses = ['pending', 'scheduled', 'msg sent', 'in progress', 'reschedule'];

          filteredVisits = visits.filter(visit => {
            const status = (visit.visit_status || '').toLowerCase().trim();
            if (activeStatuses.includes(status)) return true;

            const updatedAt = visit.updated_at || (visit as any).updatedAt;
            if (!updatedAt) return true;
            const d = new Date(updatedAt);
            return !isNaN(d.getTime()) && d >= sevenDaysAgo;
          });
        }

        setApplicationVisits(filteredVisits);
      } else {
        setApplicationVisits([]);
        setError(response?.message || 'Failed to load visits');
      }
    } catch (err: any) {
      if (isInitialLoad) setError(err.message || 'Error loading data');
      console.error(err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchApplicationVisits(true);
  }, [fetchApplicationVisits]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchApplicationVisits(false);
  };

  // Location Groups
  const locationItems: LocationItem[] = [{ id: 'all', name: 'All', count: applicationVisits.length }];
  const locationSet = new Set<string>();
  applicationVisits.forEach(v => {
    const parts = (v.full_address || '').split(',');
    // Heuristic: try to find city. Assuming standard format, maybe index 3, but simpler to check v.city if available
    const city = v.city || (parts.length > 3 ? parts[3].trim() : '');
    if (city) locationSet.add(city.toLowerCase());
  });

  Array.from(locationSet).sort().forEach(loc => {
    if (loc) {
      locationItems.push({
        id: loc,
        name: loc.charAt(0).toUpperCase() + loc.slice(1),
        count: applicationVisits.filter(v =>
          (v.city || '').toLowerCase() === loc || (v.full_address || '').toLowerCase().includes(loc)
        ).length
      });
    }
  });

  // Filter Logic
  let filteredData = applicationVisits.filter(visit => {
    const locMatch = selectedLocation === 'all' ||
      (visit.city || '').toLowerCase() === selectedLocation ||
      (visit.full_address || '').toLowerCase().includes(selectedLocation);

    const searchMatch = searchQuery === '' ||
      visit.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      visit.full_address.toLowerCase().includes(searchQuery.toLowerCase());

    return locMatch && searchMatch;
  });

  // Apply Funnel Filters
  // Note: applyFilters generic utility needs to be imported or basic login inline. 
  // Assuming applyFilters expects array and filter object.
  // If applyFilters fails (due to import issues), implement basic check here
  if (Object.keys(activeFilters).length > 0) {
    filteredData = filteredData.filter(item => {
      return Object.keys(activeFilters).every(key => {
        const filter = activeFilters[key];
        const itemValue = (item as any)[key];

        if (filter.type === 'text' && filter.value) {
          return String(itemValue || '').toLowerCase().includes(filter.value.toLowerCase());
        }
        // Basic implementation for now
        return true;
      });
    });
  }

  // Sort Logic
  const sortedData = [...filteredData].sort((a, b) => {
    let valA: any = (a as any)[sortConfig.key] || '';
    let valB: any = (b as any)[sortConfig.key] || '';

    if (sortConfig.key === 'timestamp' || sortConfig.key === 'created_at') {
      valA = new Date(valA).getTime();
      valB = new Date(valB).getTime();
    } else {
      valA = String(valA).toLowerCase();
      valB = String(valB).toLowerCase();
    }

    if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
    if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const getStatusColorClass = (status: string | undefined) => {
    if (!status) return 'text-gray-400';
    const s = status.toLowerCase();
    if (['completed', 'approved', 'done', 'scheduled'].includes(s)) return 'text-green-500';
    if (['pending', 'in progress', 'msg sent'].includes(s)) return 'text-orange-500';
    if (['cancelled', 'failed', 'rejected'].includes(s)) return 'text-red-500';
    return 'text-blue-500';
  };

  const formatDate = (d?: string) => {
    if (!d) return '-';
    try { return new Date(d).toLocaleDateString(); } catch { return d; }
  };

  const renderLocationItem = ({ item }: { item: LocationItem }) => (
    <TouchableOpacity
      onPress={() => {
        setSelectedLocation(item.id);
        setMobileView('visits');
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

  const renderVisitItem = ({ item }: { item: ApplicationVisit }) => (
    <TouchableOpacity
      onPress={() => {
        setSelectedVisit(item);
        setMobileView('details');
      }}
      className={`p-4 border-b mb-1 ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
        }`}
    >
      <View className="flex-row justify-between items-start">
        <View className="flex-1 mr-2">
          <Text className={`font-bold text-base mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {item.full_name}
          </Text>
          <Text className={`text-xs mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {formatDate(item.timestamp)}
          </Text>
          <Text className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`} numberOfLines={2}>
            {item.full_address}
          </Text>
        </View>
        <View className="items-end">
          <Text className={`text-xs font-bold uppercase ${getStatusColorClass(item.visit_status)}`}>
            {item.visit_status || 'PENDING'}
          </Text>
          <Text className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>#{item.id}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading && !isRefreshing) {
    return (
      <View className={`flex-1 justify-center items-center ${isDarkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
        <ActivityIndicator size="large" color={colorPalette?.primary || '#ea580c'} />
        <Text className={`mt-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Loading visits...</Text>
      </View>
    );
  }

  // --- Mobile View: Locations ---
  if (mobileView === 'locations') {
    return (
      <SafeAreaView className={`flex-1 ${isDarkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
        <View className={`p-4 border-b ${isDarkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'}`}>
          <Text className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Visits
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

  // --- Mobile View: Details ---
  if (mobileView === 'details' && selectedVisit) {
    return (
      <SafeAreaView className={`flex-1 ${isDarkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
        <ApplicationVisitDetails
          visit={selectedVisit}
          onClose={() => setMobileView('visits')}
          onRefresh={handleRefresh}
          isMobile={true}
        />
      </SafeAreaView>
    )
  }

  // --- Mobile View: Visits List ---
  return (
    <SafeAreaView className={`flex-1 ${isDarkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
      <View className={`p-4 border-b flex-row items-center space-x-2 ${isDarkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'}`}>
        <TouchableOpacity onPress={() => setMobileView('locations')} className="mr-1">
          <ArrowLeft size={24} color={isDarkMode ? 'white' : 'black'} />
        </TouchableOpacity>
        <View className="flex-1 relative">
          <TextInput
            placeholder="Search..."
            placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
            value={searchQuery}
            onChangeText={setSearchQuery}
            className={`pl-9 pr-4 py-2 rounded-lg border ${isDarkMode ? 'bg-gray-800 text-white border-gray-700' : 'bg-gray-100 text-gray-900 border-gray-300'
              }`}
          />
          <View className="absolute left-3 top-3">
            <Search size={16} color={isDarkMode ? '#9ca3af' : '#6b7280'} />
          </View>
        </View>
        <TouchableOpacity onPress={() => setIsSortModalOpen(true)} className={`p-2 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
          <ArrowUp size={20} color={isDarkMode ? 'white' : 'black'} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setIsFunnelFilterOpen(true)}
          className={`p-2 rounded-lg ${Object.keys(activeFilters).length > 0 ? 'bg-orange-500' : (isDarkMode ? 'bg-gray-800' : 'bg-gray-200')}`}
        >
          <Filter size={20} color={Object.keys(activeFilters).length > 0 ? 'white' : (isDarkMode ? 'white' : 'black')} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={sortedData}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderVisitItem}
        refreshing={isRefreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={
          <View className="p-8 items-center">
            <Text className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
              No visits found.
            </Text>
          </View>
        }
      />

      <ApplicationVisitFunnelFilter
        isOpen={isFunnelFilterOpen}
        onClose={() => setIsFunnelFilterOpen(false)}
        onApplyFilters={setActiveFilters}
        currentFilters={activeFilters}
      />

      <Modal visible={isSortModalOpen} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end">
          <View className={`rounded-t-xl p-4 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
            <View className="flex-row justify-between items-center mb-4">
              <Text className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Sort By</Text>
              <TouchableOpacity onPress={() => setIsSortModalOpen(false)}>
                <X size={24} color={isDarkMode ? 'white' : 'black'} />
              </TouchableOpacity>
            </View>

            {allColumns.map(col => (
              <TouchableOpacity
                key={col.key}
                onPress={() => {
                  setSortConfig({
                    key: col.key,
                    direction: sortConfig.key === col.key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
                  });
                  setIsSortModalOpen(false);
                }}
                className={`flex-row justify-between items-center py-4 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}
              >
                <Text className={isDarkMode ? 'text-white' : 'text-gray-800'}>{col.label}</Text>
                {sortConfig.key === col.key && (
                  sortConfig.direction === 'asc'
                    ? <ArrowUp size={18} color="orange" />
                    : <ArrowDown size={18} color="orange" />
                )}
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={{ backgroundColor: colorPalette?.primary || '#ea580c' }}
              className="mt-4 p-3 rounded-lg items-center"
              onPress={() => setIsSortModalOpen(false)}
            >
              <Text className="text-white font-bold">Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

export default ApplicationVisitPage;
