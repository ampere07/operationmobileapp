import React, { useState, useEffect } from 'react';
import { View, Text, Modal, Pressable, ScrollView, TextInput } from 'react-native';
import { X, ChevronLeft, ChevronRight } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';

interface ApplicationVisitFunnelFilterProps {
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
  dataType: 'varchar' | 'text' | 'int' | 'bigint' | 'datetime';
}

const STORAGE_KEY = 'applicationVisitFilters';

const allColumns: Column[] = [
  { key: 'id', label: 'ID', dataType: 'bigint' },
  { key: 'application_id', label: 'Application ID', dataType: 'bigint' },
  { key: 'timestamp', label: 'Timestamp', dataType: 'datetime' },
  { key: 'assigned_email', label: 'Assigned Email', dataType: 'varchar' },
  { key: 'visit_by_user_id', label: 'Visit By User ID', dataType: 'bigint' },
  { key: 'visit_with', label: 'Visit With', dataType: 'varchar' },
  { key: 'visit_status', label: 'Visit Status', dataType: 'varchar' },
  { key: 'visit_remarks', label: 'Visit Remarks', dataType: 'text' },
  { key: 'application_status', label: 'Application Status', dataType: 'varchar' },
  { key: 'status_remarks_id', label: 'Status Remarks ID', dataType: 'bigint' },
  { key: 'full_name', label: 'Full Name', dataType: 'varchar' },
  { key: 'full_address', label: 'Full Address', dataType: 'text' },
  { key: 'created_at', label: 'Created At', dataType: 'datetime' },
  { key: 'updated_at', label: 'Updated At', dataType: 'datetime' },
];

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
    const loadTheme = async () => {
      const theme = await AsyncStorage.getItem('theme');
      setIsDarkMode(theme === 'dark');
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
    const loadFilters = async () => {
      if (isOpen) {
        const savedFilters = await AsyncStorage.getItem(STORAGE_KEY);
        if (savedFilters) {
          try {
            setFilterValues(JSON.parse(savedFilters));
          } catch (err) {
            console.error('Failed to load saved filters:', err);
          }
        } else if (currentFilters) {
          setFilterValues(currentFilters);
        }
      }
    };
    loadFilters();
  }, [isOpen, currentFilters]);

  const handleColumnClick = (column: Column) => {
    setSelectedColumn(column);
  };

  const handleBack = () => {
    setSelectedColumn(null);
  };

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

  const isNumericType = (dataType: string) => {
    return ['int', 'bigint', 'decimal'].includes(dataType);
  };

  const isDateType = (dataType: string) => {
    return ['date', 'datetime'].includes(dataType);
  };

  const handleTextChange = (columnKey: string, value: string) => {
    setFilterValues(prev => ({
      ...prev,
      [columnKey]: {
        type: 'text',
        value
      }
    }));
  };

  const handleRangeChange = (columnKey: string, field: 'from' | 'to', value: string) => {
    setFilterValues(prev => ({
      ...prev,
      [columnKey]: {
        ...prev[columnKey],
        type: 'number',
        [field]: value
      }
    }));
  };

  const handleDateChange = (columnKey: string, field: 'from' | 'to', value: string) => {
    setFilterValues(prev => ({
      ...prev,
      [columnKey]: {
        ...prev[columnKey],
        type: 'date',
        [field]: value
      }
    }));
  };

  const getActiveFilterCount = () => {
    return Object.keys(filterValues).filter(key => {
      const filter = filterValues[key];
      if (filter.type === 'text') {
        return filter.value && filter.value.trim() !== '';
      }
      return filter.from !== undefined || filter.to !== undefined;
    }).length;
  };

  const renderFilterInput = () => {
    if (!selectedColumn) return null;

    const currentValue = filterValues[selectedColumn.key];

    if (isNumericType(selectedColumn.dataType)) {
      return (
        <View style={{ gap: 16 }}>
          <View>
            <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#d1d5db' : '#374151' }}>
              From
            </Text>
            <TextInput
              keyboardType="numeric"
              value={currentValue?.from?.toString() || ''}
              onChangeText={(text) => handleRangeChange(selectedColumn.key, 'from', text)}
              placeholder="Minimum value"
              placeholderTextColor={isDarkMode ? '#6b7280' : '#9ca3af'}
              style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 4, borderWidth: 1, backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', borderColor: isDarkMode ? '#374151' : '#d1d5db', color: isDarkMode ? '#ffffff' : '#111827' }}
            />
          </View>
          <View>
            <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#d1d5db' : '#374151' }}>
              To
            </Text>
            <TextInput
              keyboardType="numeric"
              value={currentValue?.to?.toString() || ''}
              onChangeText={(text) => handleRangeChange(selectedColumn.key, 'to', text)}
              placeholder="Maximum value"
              placeholderTextColor={isDarkMode ? '#6b7280' : '#9ca3af'}
              style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 4, borderWidth: 1, backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', borderColor: isDarkMode ? '#374151' : '#d1d5db', color: isDarkMode ? '#ffffff' : '#111827' }}
            />
          </View>
        </View>
      );
    }

    if (isDateType(selectedColumn.dataType)) {
      return (
        <View style={{ gap: 16 }}>
          <View>
            <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#d1d5db' : '#374151' }}>
              From
            </Text>
            <TextInput
              value={currentValue?.from?.toString() || ''}
              onChangeText={(text) => handleDateChange(selectedColumn.key, 'from', text)}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={isDarkMode ? '#6b7280' : '#9ca3af'}
              style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 4, borderWidth: 1, backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', borderColor: isDarkMode ? '#374151' : '#d1d5db', color: isDarkMode ? '#ffffff' : '#111827' }}
            />
          </View>
          <View>
            <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#d1d5db' : '#374151' }}>
              To
            </Text>
            <TextInput
              value={currentValue?.to?.toString() || ''}
              onChangeText={(text) => handleDateChange(selectedColumn.key, 'to', text)}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={isDarkMode ? '#6b7280' : '#9ca3af'}
              style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 4, borderWidth: 1, backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', borderColor: isDarkMode ? '#374151' : '#d1d5db', color: isDarkMode ? '#ffffff' : '#111827' }}
            />
          </View>
        </View>
      );
    }

    return (
      <View>
        <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#d1d5db' : '#374151' }}>
          Search Value
        </Text>
        <TextInput
          value={typeof currentValue?.value === 'string' ? currentValue.value : ''}
          onChangeText={(text) => handleTextChange(selectedColumn.key, text)}
          placeholder={`Enter ${selectedColumn.label.toLowerCase()}`}
          placeholderTextColor={isDarkMode ? '#6b7280' : '#9ca3af'}
          style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 4, borderWidth: 1, backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', borderColor: isDarkMode ? '#374151' : '#d1d5db', color: isDarkMode ? '#ffffff' : '#111827' }}
        />
      </View>
    );
  };

  if (!isOpen) return null;

  const activeFilterCount = getActiveFilterCount();

  return (
    <Modal
      transparent={true}
      visible={isOpen}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        <Pressable 
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onPress={onClose}
        />
        
        <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: 448, backgroundColor: isDarkMode ? '#111827' : '#ffffff' }}>
          <View style={{ height: '100%', flexDirection: 'column' }}>
            <View style={{ paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  {selectedColumn && (
                    <Pressable
                      onPress={handleBack}
                      style={{ padding: 8, borderRadius: 8 }}
                    >
                      <ChevronLeft size={20} color={isDarkMode ? '#9ca3af' : '#4b5563'} />
                    </Pressable>
                  )}
                  <View>
                    <Text style={{ fontSize: 18, fontWeight: '600', color: isDarkMode ? '#ffffff' : '#111827' }}>
                      {selectedColumn ? selectedColumn.label : 'Filter'}
                    </Text>
                    {!selectedColumn && activeFilterCount > 0 && (
                      <Text style={{ fontSize: 12, marginTop: 4, color: isDarkMode ? '#9ca3af' : '#4b5563' }}>
                        {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active
                      </Text>
                    )}
                  </View>
                </View>
                <Pressable
                  onPress={onClose}
                  style={{ padding: 8, borderRadius: 8 }}
                >
                  <X size={20} color={isDarkMode ? '#9ca3af' : '#4b5563'} />
                </Pressable>
              </View>
            </View>

            <ScrollView style={{ flex: 1, paddingHorizontal: 24, paddingVertical: 16 }}>
              {selectedColumn ? (
                renderFilterInput()
              ) : (
                <View style={{ gap: 24 }}>
                  <View>
                    <Text style={{ fontSize: 12, fontWeight: '600', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: isDarkMode ? '#9ca3af' : '#4b5563' }}>
                      Application Visits Table
                    </Text>
                    <View style={{ flexDirection: 'column', gap: 8, width: '100%' }}>
                      {allColumns.map(column => {
                        const hasFilter = filterValues[column.key] && (
                          filterValues[column.key].value || 
                          filterValues[column.key].from !== undefined || 
                          filterValues[column.key].to !== undefined
                        );

                        return (
                          <Pressable
                            key={column.key}
                            onPress={() => handleColumnClick(column)}
                            style={{ width: '100%', padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb' }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <Text style={{ fontSize: 14, fontWeight: '500', color: isDarkMode ? '#ffffff' : '#111827' }}>
                                {column.label}
                              </Text>
                              {hasFilter && (
                                <View 
                                  style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colorPalette?.primary || '#ea580c' }}
                                />
                              )}
                            </View>
                            <ChevronRight size={16} color={isDarkMode ? '#9ca3af' : '#4b5563'} />
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={{ paddingHorizontal: 24, paddingVertical: 16, borderTopWidth: 1, borderTopColor: isDarkMode ? '#374151' : '#e5e7eb' }}>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Pressable
                  onPress={handleReset}
                  style={{ flex: 1, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 4, backgroundColor: isDarkMode ? '#1f2937' : '#e5e7eb' }}
                >
                  <Text style={{ textAlign: 'center', color: isDarkMode ? '#ffffff' : '#111827' }}>Clear All</Text>
                </Pressable>
                <Pressable
                  onPress={handleApply}
                  style={{ flex: 1, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 4, backgroundColor: colorPalette?.primary || '#ea580c' }}
                >
                  <Text style={{ textAlign: 'center', color: '#ffffff' }}>Apply Filters</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default ApplicationVisitFunnelFilter;
