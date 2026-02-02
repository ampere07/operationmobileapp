import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
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
        <div>
          <label className={`text-sm font-medium mb-2 block ${
            isDarkMode ? 'text-gray-300' : 'text-gray-700'
          }`}>
            Select Value
          </label>
          <select
            value={currentValue?.value === true ? 'true' : currentValue?.value === false ? 'false' : ''}
            onChange={(e) => handleBooleanChange(selectedColumn.key, e.target.value)}
            className={`w-full px-3 py-2 rounded border ${
              isDarkMode 
                ? 'bg-gray-800 border-gray-700 text-white' 
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            <option value="">All</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </div>
      );
    }

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
                        Applications Table
                      </h3>
                      <div className="flex flex-col gap-2 w-full">
                        {allColumns.map(column => (
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

export default ApplicationFunnelFilter;
