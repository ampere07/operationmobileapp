import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { settingsColorPaletteService, ColorPalette } from '../../services/settingsColorPaletteService';

interface ServiceOrderFunnelFilterProps {
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

const STORAGE_KEY = 'serviceOrderFunnelFilters';

const allColumns: Column[] = [
  { key: 'id', label: 'ID', table: 'service_orders', dataType: 'bigint' },
  { key: 'ticket_id', label: 'Ticket ID', table: 'service_orders', dataType: 'varchar' },
  { key: 'timestamp', label: 'Timestamp', table: 'service_orders', dataType: 'datetime' },
  { key: 'account_number', label: 'Account Number', table: 'service_orders', dataType: 'varchar' },
  { key: 'full_name', label: 'Full Name', table: 'service_orders', dataType: 'varchar' },
  { key: 'contact_address', label: 'Contact Address', table: 'service_orders', dataType: 'text' },
  { key: 'date_installed', label: 'Date Installed', table: 'service_orders', dataType: 'date' },
  { key: 'contact_number', label: 'Contact Number', table: 'service_orders', dataType: 'varchar' },
  { key: 'full_address', label: 'Full Address', table: 'service_orders', dataType: 'text' },
  { key: 'house_front_picture', label: 'House Front Picture', table: 'service_orders', dataType: 'text' },
  { key: 'email_address', label: 'Email Address', table: 'service_orders', dataType: 'varchar' },
  { key: 'plan', label: 'Plan', table: 'service_orders', dataType: 'varchar' },
  { key: 'provider', label: 'Provider', table: 'service_orders', dataType: 'varchar' },
  { key: 'affiliate', label: 'Affiliate', table: 'service_orders', dataType: 'varchar' },
  { key: 'username', label: 'Username', table: 'service_orders', dataType: 'varchar' },
  { key: 'connection_type', label: 'Connection Type', table: 'service_orders', dataType: 'enum' },
  { key: 'router_modem_sn', label: 'Router Modem SN', table: 'service_orders', dataType: 'varchar' },
  { key: 'lcp', label: 'LCP', table: 'service_orders', dataType: 'varchar' },
  { key: 'nap', label: 'NAP', table: 'service_orders', dataType: 'varchar' },
  { key: 'port', label: 'Port', table: 'service_orders', dataType: 'varchar' },
  { key: 'vlan', label: 'VLAN', table: 'service_orders', dataType: 'varchar' },
  { key: 'concern', label: 'Concern', table: 'service_orders', dataType: 'varchar' },
  { key: 'concern_remarks', label: 'Concern Remarks', table: 'service_orders', dataType: 'text' },
  { key: 'visit_status', label: 'Visit Status', table: 'service_orders', dataType: 'enum' },
  { key: 'visit_by', label: 'Visit By', table: 'service_orders', dataType: 'varchar' },
  { key: 'visit_with', label: 'Visit With', table: 'service_orders', dataType: 'varchar' },
  { key: 'visit_with_other', label: 'Visit With Other', table: 'service_orders', dataType: 'varchar' },
  { key: 'visit_remarks', label: 'Visit Remarks', table: 'service_orders', dataType: 'text' },
  { key: 'modified_by', label: 'Modified By', table: 'service_orders', dataType: 'varchar' },
  { key: 'modified_date', label: 'Modified Date', table: 'service_orders', dataType: 'datetime' },
  { key: 'user_email', label: 'User Email', table: 'service_orders', dataType: 'varchar' },
  { key: 'requested_by', label: 'Requested By', table: 'service_orders', dataType: 'varchar' },
  { key: 'assigned_email', label: 'Assigned Email', table: 'service_orders', dataType: 'varchar' },
  { key: 'support_remarks', label: 'Support Remarks', table: 'service_orders', dataType: 'text' },
  { key: 'service_charge', label: 'Service Charge', table: 'service_orders', dataType: 'decimal' },
  { key: 'repair_category', label: 'Repair Category', table: 'service_orders', dataType: 'varchar' },
  { key: 'support_status', label: 'Support Status', table: 'service_orders', dataType: 'enum' },
  { key: 'priority_level', label: 'Priority Level', table: 'service_orders', dataType: 'enum' },
  { key: 'new_router_sn', label: 'New Router SN', table: 'service_orders', dataType: 'varchar' },
  { key: 'new_lcpnap', label: 'New LCPNAP', table: 'service_orders', dataType: 'varchar' },
  { key: 'new_plan', label: 'New Plan', table: 'service_orders', dataType: 'varchar' },
  { key: 'client_signature_url', label: 'Client Signature URL', table: 'service_orders', dataType: 'text' },
  { key: 'image1_url', label: 'Image 1 URL', table: 'service_orders', dataType: 'text' },
  { key: 'image2_url', label: 'Image 2 URL', table: 'service_orders', dataType: 'text' },
  { key: 'image3_url', label: 'Image 3 URL', table: 'service_orders', dataType: 'text' },
  { key: 'created_at', label: 'Created At', table: 'service_orders', dataType: 'datetime' },
  { key: 'updated_at', label: 'Updated At', table: 'service_orders', dataType: 'datetime' },
  { key: 'created_by_user_email', label: 'Created By User Email', table: 'service_orders', dataType: 'varchar' },
  { key: 'updated_by_user_email', label: 'Updated By User Email', table: 'service_orders', dataType: 'varchar' },
];

const ServiceOrderFunnelFilter: React.FC<ServiceOrderFunnelFilterProps> = ({
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

  const getActiveFilterCount = () => {
    return Object.keys(filterValues).filter(key => {
      const filter = filterValues[key];
      if (filter.type === 'text') {
        return filter.value && filter.value.trim() !== '';
      }
      return filter.from !== undefined || filter.to !== undefined;
    }).length;
  };

  const groupedColumns = {
    service_orders: allColumns.filter(col => col.table === 'service_orders')
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
          value={typeof currentValue?.value === 'string' ? currentValue.value : ''}
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

  const activeFilterCount = getActiveFilterCount();

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
                    <div>
                      <h2 className={`text-lg font-semibold ${
                        isDarkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        {selectedColumn ? selectedColumn.label : 'Filter'}
                      </h2>
                      {!selectedColumn && activeFilterCount > 0 && (
                        <p className={`text-xs mt-1 ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active
                        </p>
                      )}
                    </div>
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
                        Service Order Details
                      </h3>
                      <div className="flex flex-col gap-2 w-full">
                        {groupedColumns.service_orders.map(column => {
                          const hasFilter = filterValues[column.key] && (
                            filterValues[column.key].value || 
                            filterValues[column.key].from !== undefined || 
                            filterValues[column.key].to !== undefined
                          );

                          return (
                            <div
                              key={column.key}
                              onClick={() => handleColumnClick(column)}
                              className={`w-full p-3 cursor-pointer transition-all flex items-center justify-between border-b ${
                                isDarkMode ? 'border-gray-700' : 'border-gray-200'
                              }`}
                            >
                              <div className="flex items-center space-x-2">
                                <span className={`text-sm font-medium ${
                                  isDarkMode ? 'text-white' : 'text-gray-900'
                                }`}>
                                  {column.label}
                                </span>
                                {hasFilter && (
                                  <span 
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: colorPalette?.primary || '#ea580c' }}
                                  />
                                )}
                              </div>
                              <ChevronRight className={`h-4 w-4 ${
                                isDarkMode ? 'text-gray-400' : 'text-gray-600'
                              }`} />
                            </div>
                          );
                        })}
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
                    Clear All
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
                    Apply Filters
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

export default ServiceOrderFunnelFilter;
