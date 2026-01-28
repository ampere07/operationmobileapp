import React, { useState, useEffect } from 'react';
import { View, Text, Modal, Pressable, ScrollView, TextInput } from 'react-native';
import { X, ChevronLeft, ChevronRight } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';

interface ApplicationFunnelFilterProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilters: (filters: FilterValues) => void;
}

interface FilterValues {
  [key: string]: {
    type: 'text' | 'number' | 'date' | 'boolean';
    value?: string | boolean;
    from?: string | number;
    to?: string | number;
  };
}

interface Column {
  key: string;
  label: string;
  dataType: 'varchar' | 'text' | 'int' | 'bigint' | 'decimal' | 'date' | 'datetime' | 'boolean';
}

const allColumns: Column[] = [
  { key: 'id', label: 'ID', dataType: 'bigint' },
  { key: 'timestamp', label: 'Timestamp', dataType: 'datetime' },
  { key: 'email_address', label: 'Email Address', dataType: 'varchar' },
  { key: 'first_name', label: 'First Name', dataType: 'varchar' },
  { key: 'middle_initial', label: 'Middle Initial', dataType: 'varchar' },
  { key: 'last_name', label: 'Last Name', dataType: 'varchar' },
  { key: 'mobile_number', label: 'Mobile Number', dataType: 'varchar' },
  { key: 'secondary_mobile_number', label: 'Secondary Mobile Number', dataType: 'varchar' },
  { key: 'installation_address', label: 'Installation Address', dataType: 'text' },
  { key: 'landmark', label: 'Landmark', dataType: 'text' },
  { key: 'region', label: 'Region', dataType: 'varchar' },
  { key: 'city', label: 'City', dataType: 'varchar' },
  { key: 'barangay', label: 'Barangay', dataType: 'varchar' },
  { key: 'village', label: 'Village', dataType: 'varchar' },
  { key: 'desired_plan_id', label: 'Desired Plan ID', dataType: 'bigint' },
  { key: 'promo_id', label: 'Promo ID', dataType: 'bigint' },
  { key: 'referrer_account_id', label: 'Referrer Account ID', dataType: 'bigint' },
  { key: 'referred_by', label: 'Referred By', dataType: 'varchar' },
  { key: 'proof_of_billing_url', label: 'Proof of Billing URL', dataType: 'varchar' },
  { key: 'government_valid_id_url', label: 'Government Valid ID URL', dataType: 'varchar' },
  { key: 'second_government_valid_id_url', label: 'Second Government Valid ID URL', dataType: 'varchar' },
  { key: 'house_front_picture_url', label: 'House Front Picture URL', dataType: 'varchar' },
  { key: 'document_attachment_url', label: 'Document Attachment URL', dataType: 'varchar' },
  { key: 'other_isp_bill_url', label: 'Other ISP Bill URL', dataType: 'varchar' },
  { key: 'terms_agreed', label: 'Terms Agreed', dataType: 'boolean' },
  { key: 'status', label: 'Status', dataType: 'varchar' },
  { key: 'created_at', label: 'Created At', dataType: 'datetime' },
  { key: 'created_by_user_id', label: 'Created By User ID', dataType: 'bigint' },
  { key: 'updated_at', label: 'Updated At', dataType: 'datetime' },
  { key: 'updated_by_user_id', label: 'Updated By User ID', dataType: 'bigint' },
];

const ApplicationFunnelFilter: React.FC<ApplicationFunnelFilterProps> = ({
  isOpen,
  onClose,
  onApplyFilters
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

  const handleColumnClick = (column: Column) => {
    setSelectedColumn(column);
  };

  const handleBack = () => {
    setSelectedColumn(null);
  };

  const handleApply = () => {
    onApplyFilters(filterValues);
    onClose();
  };

  const handleReset = () => {
    setFilterValues({});
    setSelectedColumn(null);
  };

  const isNumericType = (dataType: string) => {
    return ['int', 'bigint', 'decimal'].includes(dataType);
  };

  const isDateType = (dataType: string) => {
    return ['date', 'datetime'].includes(dataType);
  };

  const isBooleanType = (dataType: string) => {
    return dataType === 'boolean';
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

  const handleBooleanChange = (columnKey: string, value: string) => {
    setFilterValues(prev => ({
      ...prev,
      [columnKey]: {
        type: 'boolean',
        value: value === 'true'
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

  const renderFilterInput = () => {
    if (!selectedColumn) return null;

    const currentValue = filterValues[selectedColumn.key];

    if (isBooleanType(selectedColumn.dataType)) {
      return (
        <View>
          <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#d1d5db' : '#374151' }}>
            Select Value
          </Text>
          <View style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 4, borderWidth: 1, backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', borderColor: isDarkMode ? '#374151' : '#d1d5db' }}>
            <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>
              {currentValue?.value === true ? 'Yes' : currentValue?.value === false ? 'No' : 'All'}
            </Text>
          </View>
        </View>
      );
    }

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
                  <Text style={{ fontSize: 18, fontWeight: '600', color: isDarkMode ? '#ffffff' : '#111827' }}>
                    {selectedColumn ? selectedColumn.label : 'Filter'}
                  </Text>
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
                      Applications Table
                    </Text>
                    <View style={{ flexDirection: 'column', gap: 8, width: '100%' }}>
                      {allColumns.map(column => (
                        <Pressable
                          key={column.key}
                          onPress={() => handleColumnClick(column)}
                          style={{ width: '100%', padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb' }}
                        >
                          <Text style={{ fontSize: 14, fontWeight: '500', color: isDarkMode ? '#ffffff' : '#111827' }}>
                            {column.label}
                          </Text>
                          <ChevronRight size={16} color={isDarkMode ? '#9ca3af' : '#4b5563'} />
                        </Pressable>
                      ))}
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
                  <Text style={{ textAlign: 'center', color: isDarkMode ? '#ffffff' : '#111827' }}>Clear</Text>
                </Pressable>
                <Pressable
                  onPress={handleApply}
                  style={{ flex: 1, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 4, backgroundColor: colorPalette?.primary || '#ea580c' }}
                >
                  <Text style={{ textAlign: 'center', color: '#ffffff' }}>Done</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default ApplicationFunnelFilter;
