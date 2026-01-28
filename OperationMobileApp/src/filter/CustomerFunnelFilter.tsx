import React, { useState, useEffect } from 'react';
import { View, Text, Modal, Pressable, ScrollView, TextInput } from 'react-native';
import { X, ChevronLeft, ChevronRight } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';

interface CustomerFunnelFilterProps {
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

const STORAGE_KEY = 'customerFunnelFilters';

const allColumns: Column[] = [
  // Customers table
  { key: 'id', label: 'ID', table: 'customers', dataType: 'bigint' },
  { key: 'first_name', label: 'First Name', table: 'customers', dataType: 'varchar' },
  { key: 'middle_initial', label: 'Middle Initial', table: 'customers', dataType: 'varchar' },
  { key: 'last_name', label: 'Last Name', table: 'customers', dataType: 'varchar' },
  { key: 'email_address', label: 'Email Address', table: 'customers', dataType: 'varchar' },
  { key: 'contact_number_primary', label: 'Contact Number Primary', table: 'customers', dataType: 'varchar' },
  { key: 'contact_number_secondary', label: 'Contact Number Secondary', table: 'customers', dataType: 'varchar' },
  { key: 'address', label: 'Address', table: 'customers', dataType: 'text' },
  { key: 'location', label: 'Location', table: 'customers', dataType: 'varchar' },
  { key: 'barangay', label: 'Barangay', table: 'customers', dataType: 'varchar' },
  { key: 'city', label: 'City', table: 'customers', dataType: 'varchar' },
  { key: 'region', label: 'Region', table: 'customers', dataType: 'varchar' },
  { key: 'address_coordinates', label: 'Address Coordinates', table: 'customers', dataType: 'varchar' },
  { key: 'housing_status', label: 'Housing Status', table: 'customers', dataType: 'enum' },
  { key: 'referred_by', label: 'Referred By', table: 'customers', dataType: 'varchar' },
  { key: 'group_id', label: 'Group ID', table: 'customers', dataType: 'bigint' },
  { key: 'created_by', label: 'Created By', table: 'customers', dataType: 'bigint' },
  { key: 'created_at', label: 'Created At', table: 'customers', dataType: 'datetime' },
  { key: 'updated_by', label: 'Updated By', table: 'customers', dataType: 'bigint' },
  { key: 'updated_at', label: 'Updated At', table: 'customers', dataType: 'datetime' },
  
  // Billing Accounts table
  { key: 'billing_id', label: 'Billing ID', table: 'billing_accounts', dataType: 'bigint' },
  { key: 'customer_id', label: 'Customer ID', table: 'billing_accounts', dataType: 'bigint' },
  { key: 'account_no', label: 'Account No', table: 'billing_accounts', dataType: 'varchar' },
  { key: 'date_installed', label: 'Date Installed', table: 'billing_accounts', dataType: 'date' },
  { key: 'plan_id', label: 'Plan ID', table: 'billing_accounts', dataType: 'bigint' },
  { key: 'account_balance', label: 'Account Balance', table: 'billing_accounts', dataType: 'decimal' },
  { key: 'balance_update_date', label: 'Balance Update Date', table: 'billing_accounts', dataType: 'datetime' },
  { key: 'billing_day', label: 'Billing Day', table: 'billing_accounts', dataType: 'int' },
  { key: 'billing_status_id', label: 'Billing Status ID', table: 'billing_accounts', dataType: 'bigint' },
  { key: 'billing_created_by', label: 'Created By', table: 'billing_accounts', dataType: 'bigint' },
  { key: 'billing_created_at', label: 'Created At', table: 'billing_accounts', dataType: 'datetime' },
  { key: 'billing_updated_by', label: 'Updated By', table: 'billing_accounts', dataType: 'bigint' },
  { key: 'billing_updated_at', label: 'Updated At', table: 'billing_accounts', dataType: 'datetime' },
  
  // Technical Details table
  { key: 'technical_id', label: 'Technical ID', table: 'technical_details', dataType: 'bigint' },
  { key: 'account_id', label: 'Account ID', table: 'technical_details', dataType: 'bigint' },
  { key: 'username', label: 'Username', table: 'technical_details', dataType: 'varchar' },
  { key: 'username_status', label: 'Username Status', table: 'technical_details', dataType: 'varchar' },
  { key: 'connection_type', label: 'Connection Type', table: 'technical_details', dataType: 'varchar' },
  { key: 'router_model', label: 'Router Model', table: 'technical_details', dataType: 'varchar' },
  { key: 'router_modem_sn', label: 'Router Modem SN', table: 'technical_details', dataType: 'varchar' },
  { key: 'ip_address', label: 'IP Address', table: 'technical_details', dataType: 'varchar' },
  { key: 'lcp', label: 'LCP', table: 'technical_details', dataType: 'varchar' },
  { key: 'nap', label: 'NAP', table: 'technical_details', dataType: 'varchar' },
  { key: 'port', label: 'Port', table: 'technical_details', dataType: 'varchar' },
  { key: 'vlan', label: 'VLAN', table: 'technical_details', dataType: 'varchar' },
  { key: 'lcpnap', label: 'LCPNAP', table: 'technical_details', dataType: 'varchar' },
  { key: 'usage_type_id', label: 'Usage Type ID', table: 'technical_details', dataType: 'bigint' },
  { key: 'technical_created_by', label: 'Created By', table: 'technical_details', dataType: 'bigint' },
  { key: 'technical_created_at', label: 'Created At', table: 'technical_details', dataType: 'datetime' },
  { key: 'technical_updated_by', label: 'Updated By', table: 'technical_details', dataType: 'bigint' },
  { key: 'technical_updated_at', label: 'Updated At', table: 'technical_details', dataType: 'datetime' },
];

const CustomerFunnelFilter: React.FC<CustomerFunnelFilterProps> = ({
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

  const groupedColumns = {
    customers: allColumns.filter(col => col.table === 'customers'),
    billing_accounts: allColumns.filter(col => col.table === 'billing_accounts'),
    technical_details: allColumns.filter(col => col.table === 'technical_details')
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
          value={currentValue?.value || ''}
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
                      Customers Details
                    </Text>
                    <View style={{ flexDirection: 'column', gap: 8, width: '100%' }}>
                      {groupedColumns.customers.map(column => (
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

                  <View>
                    <Text style={{ fontSize: 12, fontWeight: '600', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: isDarkMode ? '#9ca3af' : '#4b5563' }}>
                      Billing Accounts Details
                    </Text>
                    <View style={{ flexDirection: 'column', gap: 8, width: '100%' }}>
                      {groupedColumns.billing_accounts.map(column => (
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

                  <View>
                    <Text style={{ fontSize: 12, fontWeight: '600', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: isDarkMode ? '#9ca3af' : '#4b5563' }}>
                      Technical Details
                    </Text>
                    <View style={{ flexDirection: 'column', gap: 8, width: '100%' }}>
                      {groupedColumns.technical_details.map(column => (
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

export default CustomerFunnelFilter;
