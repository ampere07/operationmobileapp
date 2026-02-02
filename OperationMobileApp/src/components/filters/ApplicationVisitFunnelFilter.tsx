import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView
} from 'react-native';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { settingsColorPaletteService, ColorPalette } from '../../services/settingsColorPaletteService';
import { FilterValues } from '../../utils/filterUtils';

export { FilterValues };

interface Column {
  key: string;
  label: string;
  table: string;
  dataType: 'varchar' | 'text' | 'int' | 'bigint' | 'decimal' | 'date' | 'datetime' | 'enum';
}

const STORAGE_KEY = 'applicationVisitFunnelFilters';

const allColumns: Column[] = [
  { key: 'id', label: 'ID', table: 'application_visits', dataType: 'bigint' },
  { key: 'application_id', label: 'Application ID', table: 'application_visits', dataType: 'bigint' },
  { key: 'timestamp', label: 'Timestamp', table: 'application_visits', dataType: 'datetime' },
  { key: 'assigned_email', label: 'Assigned Email', table: 'application_visits', dataType: 'varchar' },
  { key: 'visit_by', label: 'Visit By', table: 'application_visits', dataType: 'varchar' },
  { key: 'visit_with', label: 'Visit With', table: 'application_visits', dataType: 'varchar' },
  { key: 'visit_with_other', label: 'Visit With (Other)', table: 'application_visits', dataType: 'varchar' },
  { key: 'visit_status', label: 'Visit Status', table: 'application_visits', dataType: 'enum' },
  { key: 'visit_remarks', label: 'Visit Remarks', table: 'application_visits', dataType: 'text' },
  { key: 'status_remarks', label: 'Status Remarks', table: 'application_visits', dataType: 'text' },
  { key: 'application_status', label: 'Application Status', table: 'application_visits', dataType: 'varchar' },
  { key: 'full_name', label: 'Full Name', table: 'application_visits', dataType: 'varchar' },
  { key: 'full_address', label: 'Full Address', table: 'application_visits', dataType: 'text' },
  { key: 'referred_by', label: 'Referred By', table: 'application_visits', dataType: 'varchar' },
  { key: 'updated_by_user_email', label: 'Updated By User Email', table: 'application_visits', dataType: 'varchar' },
  { key: 'created_at', label: 'Created At', table: 'application_visits', dataType: 'datetime' },
  { key: 'updated_at', label: 'Updated At', table: 'application_visits', dataType: 'datetime' },
  { key: 'first_name', label: 'First Name', table: 'application_visits', dataType: 'varchar' },
  { key: 'middle_initial', label: 'Middle Initial', table: 'application_visits', dataType: 'varchar' },
  { key: 'last_name', label: 'Last Name', table: 'application_visits', dataType: 'varchar' },
  { key: 'region', label: 'Region', table: 'application_visits', dataType: 'varchar' },
  { key: 'city', label: 'City', table: 'application_visits', dataType: 'varchar' },
  { key: 'barangay', label: 'Barangay', table: 'application_visits', dataType: 'varchar' },
  { key: 'location', label: 'Location', table: 'application_visits', dataType: 'varchar' },
  { key: 'choose_plan', label: 'Choose Plan', table: 'application_visits', dataType: 'varchar' },
  { key: 'promo', label: 'Promo', table: 'application_visits', dataType: 'varchar' },
  { key: 'house_front_picture_url', label: 'House Front Picture URL', table: 'application_visits', dataType: 'text' },
  { key: 'image1_url', label: 'Image 1 URL', table: 'application_visits', dataType: 'text' },
  { key: 'image2_url', label: 'Image 2 URL', table: 'application_visits', dataType: 'text' },
  { key: 'image3_url', label: 'Image 3 URL', table: 'application_visits', dataType: 'text' },
];

interface ApplicationVisitFunnelFilterProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilters: (filters: FilterValues) => void;
  currentFilters?: FilterValues;
}

const ApplicationVisitFunnelFilter: React.FC<ApplicationVisitFunnelFilterProps> = ({
  isOpen,
  onClose,
  onApplyFilters,
  currentFilters
}) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<Column | null>(null);
  const [filterValues, setFilterValues] = useState<FilterValues>({});

  useEffect(() => {
    const init = async () => {
      const theme = await AsyncStorage.getItem('theme');
      setIsDarkMode(theme !== 'light');
      const activePalette = await settingsColorPaletteService.getActive();
      setColorPalette(activePalette);

      const savedFilters = await AsyncStorage.getItem(STORAGE_KEY);
      if (savedFilters) {
        setFilterValues(JSON.parse(savedFilters));
      } else if (currentFilters) {
        setFilterValues(currentFilters);
      }
    };
    if (isOpen) init();
  }, [isOpen, currentFilters]);

  const handleApply = async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filterValues));
    onApplyFilters(filterValues);
    onClose();
  };

  const handleReset = async () => {
    setFilterValues({});
    setSelectedColumn(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
  };

  const isNumericType = (dataType: string) => ['int', 'bigint', 'decimal'].includes(dataType);
  const isDateType = (dataType: string) => ['date', 'datetime'].includes(dataType);

  const renderFilterInput = () => {
    if (!selectedColumn) return null;
    const currentValue = filterValues[selectedColumn.key] || {};

    if (isNumericType(selectedColumn.dataType) || isDateType(selectedColumn.dataType)) {
      return (
        <View className="space-y-4">
          <View className="mb-4">
            <Text className={`mb-2 font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>From</Text>
            <TextInput
              value={String(currentValue.from || '')}
              onChangeText={(t) => setFilterValues(prev => ({
                ...prev,
                [selectedColumn.key]: {
                  ...prev[selectedColumn.key],
                  type: isNumericType(selectedColumn.dataType) ? 'number' : 'date',
                  from: t
                }
              }))}
              placeholder={isDateType(selectedColumn.dataType) ? "YYYY-MM-DD" : "Min Value"}
              placeholderTextColor={isDarkMode ? '#6b7280' : '#9ca3af'}
              className={`p-3 rounded border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
            />
          </View>
          <View>
            <Text className={`mb-2 font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>To</Text>
            <TextInput
              value={String(currentValue.to || '')}
              onChangeText={(t) => setFilterValues(prev => ({
                ...prev,
                [selectedColumn.key]: {
                  ...prev[selectedColumn.key],
                  type: isNumericType(selectedColumn.dataType) ? 'number' : 'date',
                  to: t
                }
              }))}
              placeholder={isDateType(selectedColumn.dataType) ? "YYYY-MM-DD" : "Max Value"}
              placeholderTextColor={isDarkMode ? '#6b7280' : '#9ca3af'}
              className={`p-3 rounded border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
            />
          </View>
        </View>
      );
    }

    return (
      <View>
        <Text className={`mb-2 font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Search Value</Text>
        <TextInput
          value={String(currentValue.value || '')}
          onChangeText={(t) => setFilterValues(prev => ({
            ...prev,
            [selectedColumn.key]: {
              ...prev[selectedColumn.key],
              type: 'text',
              value: t
            }
          }))}
          placeholder={`Enter ${selectedColumn.label}`}
          placeholderTextColor={isDarkMode ? '#6b7280' : '#9ca3af'}
          className={`p-3 rounded border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
        />
      </View>
    );
  };

  if (!isOpen) return null;

  return (
    <Modal visible={isOpen} animationType="slide" transparent>
      <View className={`flex-1 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        {/* Header */}
        <SafeAreaView className={`border-b ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <View className="flex-row items-center justify-between p-4">
            <View className="flex-row items-center space-x-2">
              {selectedColumn && (
                <TouchableOpacity onPress={() => setSelectedColumn(null)} className="mr-2">
                  <ChevronLeft size={24} color={isDarkMode ? 'white' : 'black'} />
                </TouchableOpacity>
              )}
              <Text className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {selectedColumn ? selectedColumn.label : 'Filters'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={isDarkMode ? 'white' : 'black'} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        {/* Content */}
        <ScrollView className="flex-1 p-4">
          {selectedColumn ? (
            renderFilterInput()
          ) : (
            <View>
              <Text className={`text-sm font-bold mb-3 uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Application Visit Details
              </Text>
              {allColumns.map(col => {
                const hasFilter = filterValues[col.key] && (filterValues[col.key].value || filterValues[col.key].from || filterValues[col.key].to);
                return (
                  <TouchableOpacity
                    key={col.key}
                    onPress={() => setSelectedColumn(col)}
                    className={`flex-row items-center justify-between p-4 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}
                  >
                    <View className="flex-row items-center space-x-2">
                      <Text className={isDarkMode ? 'text-white' : 'text-gray-900'}>{col.label}</Text>
                      {hasFilter && (
                        <View style={{ backgroundColor: colorPalette?.primary || '#ea580c' }} className="w-2 h-2 rounded-full ml-2" />
                      )}
                    </View>
                    <ChevronRight size={16} color={isDarkMode ? 'gray' : 'lightgray'} />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <SafeAreaView className={`p-4 border-t ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <View className="flex-row space-x-3">
            <TouchableOpacity
              onPress={handleReset}
              className={`flex-1 py-3 rounded-lg flex items-center justify-center ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}
            >
              <Text className={isDarkMode ? 'text-white' : 'text-gray-900'}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleApply}
              style={{ backgroundColor: colorPalette?.primary || '#ea580c' }}
              className="flex-1 py-3 rounded-lg flex items-center justify-center"
            >
              <Text className="text-white font-bold">Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

export default ApplicationVisitFunnelFilter;
