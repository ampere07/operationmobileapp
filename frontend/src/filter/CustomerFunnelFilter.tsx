import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const [isDarkMode, setIsDarkMode] = useState(localStorage.getItem('theme') === 'dark');
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<Column | null>(null);
  const [filterValues, setFilterValues] = useState<FilterValues>({});

  useEffect(() => {
    if (isOpen) {
      const savedFilters = localStorage.getItem(STORAGE_KEY);
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
  }, [isOpen, currentFilters]);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDarkMode(localStorage.getItem('theme') === 'dark');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filterValues));
    onApplyFilters(filterValues);
    onClose();
  };

  const handleReset = () => {
    setFilterValues({});
    setSelectedColumn(null);
    localStorage.removeItem(STORAGE_KEY);
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
        <div className="space-y-4">
          <div>
            <label className={`text-sm font-medium mb-2 block ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              From
            </label>
            <input
              type="number"
              value={currentValue?.from || ''}
              onChange={(e) => handleRangeChange(selectedColumn.key, 'from', e.target.value)}
              placeholder="Minimum value"
              className={`w-full px-3 py-2 rounded border ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-700 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>
          <div>
            <label className={`text-sm font-medium mb-2 block ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              To
            </label>
            <input
              type="number"
              value={currentValue?.to || ''}
              onChange={(e) => handleRangeChange(selectedColumn.key, 'to', e.target.value)}
              placeholder="Maximum value"
              className={`w-full px-3 py-2 rounded border ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-700 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>
        </div>
      );
    }

    if (isDateType(selectedColumn.dataType)) {
      return (
        <div className="space-y-4">
          <div>
            <label className={`text-sm font-medium mb-2 block ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              From
            </label>
            <input
              type={selectedColumn.dataType === 'datetime' ? 'datetime-local' : 'date'}
              value={currentValue?.from || ''}
              onChange={(e) => handleDateChange(selectedColumn.key, 'from', e.target.value)}
              className={`w-full px-3 py-2 rounded border ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-700 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>
          <div>
            <label className={`text-sm font-medium mb-2 block ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              To
            </label>
            <input
              type={selectedColumn.dataType === 'datetime' ? 'datetime-local' : 'date'}
              value={currentValue?.to || ''}
              onChange={(e) => handleDateChange(selectedColumn.key, 'to', e.target.value)}
              className={`w-full px-3 py-2 rounded border ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-700 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>
        </div>
      );
    }

    return (
      <div>
        <label className={`text-sm font-medium mb-2 block ${
          isDarkMode ? 'text-gray-300' : 'text-gray-700'
        }`}>
          Search Value
        </label>
        <input
          type="text"
          value={currentValue?.value || ''}
          onChange={(e) => handleTextChange(selectedColumn.key, e.target.value)}
          placeholder={`Enter ${selectedColumn.label.toLowerCase()}`}
          className={`w-full px-3 py-2 rounded border ${
            isDarkMode 
              ? 'bg-gray-800 border-gray-700 text-white' 
              : 'bg-white border-gray-300 text-gray-900'
          }`}
        />
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />
        
        <div className="fixed inset-y-0 right-0 max-w-full flex">
          <div className={`w-screen max-w-md transform transition-transform ${
            isDarkMode ? 'bg-gray-900' : 'bg-white'
          }`}>
            <div className="h-full flex flex-col">
              <div className={`px-6 py-4 border-b ${
                isDarkMode ? 'border-gray-700' : 'border-gray-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {selectedColumn && (
                      <button
                        onClick={handleBack}
                        className={`p-2 rounded-lg transition-colors ${
                          isDarkMode 
                            ? 'hover:bg-gray-800 text-gray-400' 
                            : 'hover:bg-gray-100 text-gray-600'
                        }`}
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                    )}
                    <h2 className={`text-lg font-semibold ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {selectedColumn ? selectedColumn.label : 'Filter'}
                    </h2>
                  </div>
                  <button
                    onClick={onClose}
                    className={`p-2 rounded-lg transition-colors ${
                      isDarkMode 
                        ? 'hover:bg-gray-800 text-gray-400' 
                        : 'hover:bg-gray-100 text-gray-600'
                    }`}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4">
                {selectedColumn ? (
                  renderFilterInput()
                ) : (
                  <div className="space-y-6">
                    <div>
                      <h3 className={`text-sm font-semibold mb-3 uppercase tracking-wider ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        Customers Details
                      </h3>
                      <div className="flex flex-col gap-2 w-full">
                        {groupedColumns.customers.map(column => (
                          <div
                            key={column.key}
                            onClick={() => handleColumnClick(column)}
                            className={`w-full p-3 cursor-pointer transition-all flex items-center justify-between border-b ${
                              isDarkMode ? 'border-gray-700' : 'border-gray-200'
                            }`}
                          >
                            <span className={`text-sm font-medium ${
                              isDarkMode ? 'text-white' : 'text-gray-900'
                            }`}>
                              {column.label}
                            </span>
                            <ChevronRight className={`h-4 w-4 ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-600'
                            }`} />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className={`text-sm font-semibold mb-3 uppercase tracking-wider ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        Billing Accounts Details
                      </h3>
                      <div className="flex flex-col gap-2 w-full">
                        {groupedColumns.billing_accounts.map(column => (
                          <div
                            key={column.key}
                            onClick={() => handleColumnClick(column)}
                            className={`w-full p-3 cursor-pointer transition-all flex items-center justify-between border-b ${
                              isDarkMode ? 'border-gray-700' : 'border-gray-200'
                            }`}
                          >
                            <span className={`text-sm font-medium ${
                              isDarkMode ? 'text-white' : 'text-gray-900'
                            }`}>
                              {column.label}
                            </span>
                            <ChevronRight className={`h-4 w-4 ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-600'
                            }`} />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className={`text-sm font-semibold mb-3 uppercase tracking-wider ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        Technical Details
                      </h3>
                      <div className="flex flex-col gap-2 w-full">
                        {groupedColumns.technical_details.map(column => (
                          <div
                            key={column.key}
                            onClick={() => handleColumnClick(column)}
                            className={`w-full p-3 cursor-pointer transition-all flex items-center justify-between border-b ${
                              isDarkMode ? 'border-gray-700' : 'border-gray-200'
                            }`}
                          >
                            <span className={`text-sm font-medium ${
                              isDarkMode ? 'text-white' : 'text-gray-900'
                            }`}>
                              {column.label}
                            </span>
                            <ChevronRight className={`h-4 w-4 ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-600'
                            }`} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className={`px-6 py-4 border-t ${
                isDarkMode ? 'border-gray-700' : 'border-gray-200'
              }`}>
                <div className="flex space-x-3">
                  <button
                    onClick={handleReset}
                    className={`flex-1 px-4 py-2 rounded transition-colors ${
                      isDarkMode 
                        ? 'bg-gray-800 hover:bg-gray-700 text-white' 
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                    }`}
                  >
                    Clear
                  </button>
                  <button
                    onClick={handleApply}
                    className="flex-1 px-4 py-2 text-white rounded transition-colors"
                    style={{ backgroundColor: colorPalette?.primary || '#ea580c' }}
                    onMouseEnter={(e) => {
                      if (colorPalette?.accent) {
                        e.currentTarget.style.backgroundColor = colorPalette.accent;
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = colorPalette?.primary || '#ea580c';
                    }}
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerFunnelFilter;
