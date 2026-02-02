import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, TextInput, StyleSheet } from 'react-native';
import { X, ChevronLeft, ChevronRight } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { settingsColorPaletteService, ColorPalette } from '../../services/settingsColorPaletteService';

interface JobOrderFunnelFilterProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilters: (filters: FilterValues) => void;
  currentFilters?: FilterValues;
}

export interface FilterValues {
  [key: string]: {
    type: 'text' | 'number' | 'date';
    value?: string;
    from?: string | number;
    to?: string | number;
  };
}

interface Column {
  key: string;
  label: string;
  table: string;
  dataType: 'varchar' | 'text' | 'int' | 'bigint' | 'decimal' | 'date' | 'datetime' | 'enum';
}

const STORAGE_KEY = 'jobOrderFunnelFilters';

const allColumns: Column[] = [
  { key: 'id', label: 'ID', table: 'job_orders', dataType: 'bigint' },
  { key: 'application_id', label: 'Application ID', table: 'job_orders', dataType: 'bigint' },
  { key: 'date_installed', label: 'Date Installed', table: 'job_orders', dataType: 'date' },
  { key: 'billing_status_id', label: 'Billing Status ID', table: 'job_orders', dataType: 'bigint' },
  { key: 'router_model', label: 'Router Model', table: 'job_orders', dataType: 'varchar' },
  { key: 'group_name', label: 'Group Name', table: 'job_orders', dataType: 'varchar' },
  { key: 'full_name', label: 'Full Name', table: 'job_orders', dataType: 'varchar' },
  { key: 'address', label: 'Address', table: 'job_orders', dataType: 'text' },
  { key: 'contact_number', label: 'Contact Number', table: 'job_orders', dataType: 'varchar' },
  { key: 'email_address', label: 'Email Address', table: 'job_orders', dataType: 'varchar' },
  { key: 'onsite_status', label: 'Onsite Status', table: 'job_orders', dataType: 'enum' },
];

const JobOrderFunnelFilter: React.FC<JobOrderFunnelFilterProps> = ({
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
        try {
          setFilterValues(JSON.parse(savedFilters));
        } catch (e) { }
      } else if (currentFilters) {
        setFilterValues(currentFilters);
      }
    };
    init();
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

  const handleTextChange = (columnKey: string, value: string) => {
    setFilterValues(prev => ({
      ...prev,
      [columnKey]: { type: 'text', value }
    }));
  };

  const handleRangeChange = (columnKey: string, field: 'from' | 'to', value: string) => {
    setFilterValues(prev => ({
      ...prev,
      [columnKey]: { ...prev[columnKey], type: isDateType(selectedColumn?.dataType || '') ? 'date' : 'number', [field]: value }
    }));
  };

  const renderFilterInput = () => {
    if (!selectedColumn) return null;
    const currentValue = filterValues[selectedColumn.key];

    const inputStyle = {
      backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
      borderColor: isDarkMode ? '#374151' : '#d1d5db',
      color: isDarkMode ? '#ffffff' : '#111827'
    };

    if (isNumericType(selectedColumn.dataType) || isDateType(selectedColumn.dataType)) {
      return (
        <View className="space-y-4">
          <View>
            <Text className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>From</Text>
            <TextInput
              value={String(currentValue?.from || '')}
              onChangeText={(val) => handleRangeChange(selectedColumn.key, 'from', val)}
              placeholder={isDateType(selectedColumn.dataType) ? "YYYY-MM-DD" : "Min value"}
              placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
              className="border rounded px-3 py-2"
              style={inputStyle}
            />
          </View>
          <View>
            <Text className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>To</Text>
            <TextInput
              value={String(currentValue?.to || '')}
              onChangeText={(val) => handleRangeChange(selectedColumn.key, 'to', val)}
              placeholder={isDateType(selectedColumn.dataType) ? "YYYY-MM-DD" : "Max value"}
              placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
              className="border rounded px-3 py-2"
              style={inputStyle}
            />
          </View>
        </View>
      );
    }

    return (
      <View>
        <Text className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Contains</Text>
        <TextInput
          value={currentValue?.value || ''}
          onChangeText={(val) => handleTextChange(selectedColumn.key, val)}
          placeholder={`Search ${selectedColumn.label}`}
          placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
          className="border rounded px-3 py-2"
          style={inputStyle}
        />
      </View>
    );
  };

  return (
    <Modal visible={isOpen} animationType="slide" transparent>
      <View className="flex-1 bg-black/50 justify-end">
        <View className={`h-[80%] rounded-t-xl ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
          <View className={`flex-row justify-between items-center p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            {selectedColumn ? (
              <TouchableOpacity onPress={() => setSelectedColumn(null)} className="flex-row items-center">
                <ChevronLeft size={20} color={isDarkMode ? 'white' : 'black'} />
                <Text className={`ml-2 text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedColumn.label}</Text>
              </TouchableOpacity>
            ) : (
              <Text className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Filters</Text>
            )}
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={isDarkMode ? 'white' : 'black'} />
            </TouchableOpacity>
          </View>

          <View className="flex-1 p-4">
            {selectedColumn ? renderFilterInput() : (
              <ScrollView>
                {allColumns.map(col => {
                  const hasFilter = filterValues[col.key] && (filterValues[col.key].value || filterValues[col.key].from || filterValues[col.key].to);
                  return (
                    <TouchableOpacity
                      key={col.key}
                      onPress={() => setSelectedColumn(col)}
                      className={`flex-row justify-between items-center py-4 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}
                    >
                      <View className="flex-row items-center">
                        <Text className={isDarkMode ? 'text-white' : 'text-gray-800'}>{col.label}</Text>
                        {hasFilter && <View className="w-2 h-2 rounded-full ml-2 bg-orange-500" />}
                      </View>
                      <ChevronRight size={18} color={isDarkMode ? '#6b7280' : '#d1d5db'} />
                    </TouchableOpacity>
                  )
                })}
              </ScrollView>
            )}
          </View>

          <View className={`border-t p-4 flex-row space-x-4 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <TouchableOpacity onPress={handleReset} className={`flex-1 py-3 rounded-lg items-center ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
              <Text className={isDarkMode ? 'text-white' : 'text-gray-900'}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleApply}
              className="flex-1 py-3 rounded-lg items-center"
              style={{ backgroundColor: colorPalette?.primary || '#ea580c' }}
            >
              <Text className="text-white font-bold">Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default JobOrderFunnelFilter;
