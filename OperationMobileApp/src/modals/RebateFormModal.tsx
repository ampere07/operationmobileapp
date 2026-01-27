import React, { useState, useEffect } from 'react';
import { X, Minus, Plus, ChevronDown } from 'lucide-react';
import LoadingModal from '../components/LoadingModal';
import * as massRebateService from '../services/massRebateService';
import * as lcpnapService from '../services/lcpnapService';
import * as lcpService from '../services/lcpService';
import * as locationDetailService from '../services/locationDetailService';
import { userService } from '../services/userService';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';

interface RebateFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

type RebateType = 'lcpnap' | 'lcp' | 'location' | null;

const RebateFormModal: React.FC<RebateFormModalProps> = ({
  isOpen,
  onClose,
  onSave
}) => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);

  const getUserEmail = () => {
    try {
      const authData = localStorage.getItem('authData');
      if (authData) {
        const userData = JSON.parse(authData);
        return userData.email || userData.user?.email || 'unknown@example.com';
      }
      return 'unknown@example.com';
    } catch (error) {
      console.error('Error getting user email:', error);
      return 'unknown@example.com';
    }
  };

  const [formData, setFormData] = useState({
    numberOfDays: 0,
    rebateType: null as RebateType,
    selectedId: null as number | null,
    month: '',
    status: 'Pending',
    createdBy: getUserEmail(),
    approvedBy: '',
    modifiedBy: null as string | null
  });

  const [lcpnapList, setLcpnapList] = useState<lcpnapService.LCPNAP[]>([]);
  const [lcpList, setLcpList] = useState<lcpService.LCP[]>([]);
  const [locationList, setLocationList] = useState<locationDetailService.LocationDetail[]>([]);
  const [usersList, setUsersList] = useState<Array<{ email: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [loadingPercentage, setLoadingPercentage] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const checkDarkMode = () => {
      const theme = localStorage.getItem('theme');
      setIsDarkMode(theme === 'dark' || theme === null);
    };

    checkDarkMode();

    const observer = new MutationObserver(() => {
      checkDarkMode();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

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
      setFormData(prev => ({
        ...prev,
        createdBy: getUserEmail(),
        status: 'Pending'
      }));
      loadAllData();
    }
  }, [isOpen]);

  const loadAllData = async () => {
    try {
      const [lcpnapResponse, lcpResponse, locationResponse, usersResponse] = await Promise.all([
        lcpnapService.getAllLCPNAPs(),
        lcpService.getAllLCPs(),
        locationDetailService.locationDetailService.getAll(),
        userService.getAllUsers()
      ]);

      if (lcpnapResponse.success) {
        setLcpnapList(lcpnapResponse.data);
      }

      if (lcpResponse.success) {
        setLcpList(lcpResponse.data);
      }

      if (locationResponse.success) {
        setLocationList(locationResponse.data);
      }

      if (usersResponse.success && usersResponse.data) {
        const users = usersResponse.data.map(user => ({
          email: user.email_address || user.username || 'No email'
        }));
        setUsersList(users);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };



  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleNumberChange = (operation: 'increase' | 'decrease') => {
    const currentValue = formData.numberOfDays;
    let newValue: number;

    if (operation === 'increase') {
      newValue = currentValue + 1;
    } else {
      newValue = Math.max(0, currentValue - 1);
    }

    setFormData(prev => ({ ...prev, numberOfDays: newValue }));
  };

  const handleRebateTypeChange = (type: RebateType) => {
    setFormData(prev => ({ ...prev, rebateType: type, selectedId: null }));
    if (errors.rebateType) {
      setErrors(prev => ({ ...prev, rebateType: '' }));
    }
    if (errors.selectedId) {
      setErrors(prev => ({ ...prev, selectedId: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (formData.numberOfDays <= 0) {
      newErrors.numberOfDays = 'Number of Days must be greater than 0';
    }

    if (!formData.rebateType) {
      newErrors.rebateType = 'Please select a rebate type';
    }

    if (formData.rebateType && !formData.selectedId) {
      newErrors.selectedId = 'Please select an item from the dropdown';
    }

    if (!formData.month) {
      newErrors.month = 'Please select a month';
    }

    if (!formData.approvedBy || formData.approvedBy.trim() === '') {
      newErrors.approvedBy = 'Approved By is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      alert('Please fill in all required fields correctly.');
      return;
    }

    setLoading(true);
    setLoadingPercentage(0);

    try {
      setLoadingPercentage(20);

      let selectedRebateName = '';
      if (formData.rebateType === 'lcpnap') {
        const selected = lcpnapList.find(item => item.id === formData.selectedId);
        selectedRebateName = selected?.lcpnap_name || '';
      } else if (formData.rebateType === 'lcp') {
        const selected = lcpList.find(item => item.id === formData.selectedId);
        selectedRebateName = selected?.lcp_name || '';
      } else if (formData.rebateType === 'location') {
        const selected = locationList.find(item => item.id === formData.selectedId);
        selectedRebateName = selected?.location_name || '';
      }

      const payload: massRebateService.MassRebateData = {
        number_of_dates: formData.numberOfDays,
        rebate_type: formData.rebateType as 'lcpnap' | 'lcp' | 'location',
        selected_rebate: selectedRebateName,
        month: formData.month,
        status: 'Pending',
        created_by: formData.createdBy,
        modified_by: formData.approvedBy
      };

      setLoadingPercentage(50);
      await massRebateService.create(payload);

      setLoadingPercentage(100);
      await new Promise(resolve => setTimeout(resolve, 500));

      alert('Rebate created successfully!');
      onSave();
      onClose();
    } catch (error) {
      console.error('Error creating rebate:', error);
      alert(`Failed to save rebate: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
      setLoadingPercentage(0);
    }
  };

  const handleCancel = () => {
    setFormData({
      numberOfDays: 0,
      rebateType: null,
      selectedId: null,
      month: '',
      status: 'Pending',
      createdBy: getUserEmail(),
      approvedBy: '',
      modifiedBy: null
    });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <LoadingModal 
        isOpen={loading} 
        message="Saving rebate..." 
        percentage={loadingPercentage} 
      />
      
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-end z-50">
        <div className={`h-full w-full max-w-2xl shadow-2xl transform transition-transform duration-300 ease-in-out translate-x-0 overflow-hidden flex flex-col ${
          isDarkMode ? 'bg-gray-900' : 'bg-white'
        }`}>
          <div className={`px-6 py-4 flex items-center justify-between border-b ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'
          }`}>
            <h2 className={`text-xl font-semibold ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>Rebate Form</h2>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleCancel}
                className={`px-4 py-2 rounded text-sm text-white ${
                  isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-400 hover:bg-gray-500'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded text-sm flex items-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  'Save'
                )}
              </button>
              <button
                onClick={onClose}
                className={`transition-colors ${
                  isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <X size={24} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Number of Days<span className="text-red-500">*</span>
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  value={formData.numberOfDays}
                  onChange={(e) => handleInputChange('numberOfDays', parseInt(e.target.value) || 0)}
                  className={`flex-1 px-3 py-2 border rounded-l focus:outline-none focus:border-orange-500 ${
                    isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                  } ${errors.numberOfDays ? 'border-red-500' : isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}
                />
                <div className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => handleNumberChange('decrease')}
                    className={`px-3 py-1 text-white border border-l-0 ${
                      isDarkMode ? 'bg-gray-700 hover:bg-gray-600 border-gray-700' : 'bg-gray-300 hover:bg-gray-400 border-gray-300'
                    }`}
                  >
                    <Minus size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNumberChange('increase')}
                    className={`px-3 py-1 text-white border border-l-0 border-t-0 rounded-r ${
                      isDarkMode ? 'bg-gray-700 hover:bg-gray-600 border-gray-700' : 'bg-gray-300 hover:bg-gray-400 border-gray-300'
                    }`}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
              {errors.numberOfDays && <p className="text-red-500 text-xs mt-1">{errors.numberOfDays}</p>}
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Rebate Type<span className="text-red-500">*</span>
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => handleRebateTypeChange('lcpnap')}
                  className={`flex-1 px-4 py-2 rounded border transition-colors ${
                    formData.rebateType === 'lcpnap'
                      ? 'bg-orange-600 border-orange-600 text-white'
                      : isDarkMode
                      ? 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
                      : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  LCPNAP
                </button>
                <button
                  type="button"
                  onClick={() => handleRebateTypeChange('lcp')}
                  className={`flex-1 px-4 py-2 rounded border transition-colors ${
                    formData.rebateType === 'lcp'
                      ? 'bg-orange-600 border-orange-600 text-white'
                      : isDarkMode
                      ? 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
                      : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  LCP
                </button>
                <button
                  type="button"
                  onClick={() => handleRebateTypeChange('location')}
                  className={`flex-1 px-4 py-2 rounded border transition-colors ${
                    formData.rebateType === 'location'
                      ? 'bg-orange-600 border-orange-600 text-white'
                      : isDarkMode
                      ? 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
                      : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  Location
                </button>
              </div>
              {errors.rebateType && <p className="text-red-500 text-xs mt-1">{errors.rebateType}</p>}
            </div>

            {formData.rebateType === 'lcpnap' && (
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Select LCPNAP<span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={formData.selectedId || ''}
                    onChange={(e) => handleInputChange('selectedId', e.target.value ? parseInt(e.target.value) : null)}
                    className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 appearance-none ${
                      isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                    } ${errors.selectedId ? 'border-red-500' : isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}
                  >
                    <option value="">Select LCPNAP</option>
                    {lcpnapList.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.lcpnap_name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className={`absolute right-3 top-2.5 pointer-events-none ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`} size={20} />
                </div>
                {errors.selectedId && <p className="text-red-500 text-xs mt-1">{errors.selectedId}</p>}
              </div>
            )}

            {formData.rebateType === 'lcp' && (
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Select LCP<span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={formData.selectedId || ''}
                    onChange={(e) => handleInputChange('selectedId', e.target.value ? parseInt(e.target.value) : null)}
                    className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 appearance-none ${
                      isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                    } ${errors.selectedId ? 'border-red-500' : isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}
                  >
                    <option value="">Select LCP</option>
                    {lcpList.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.lcp_name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" size={20} />
                </div>
                {errors.selectedId && <p className="text-red-500 text-xs mt-1">{errors.selectedId}</p>}
              </div>
            )}

            {formData.rebateType === 'location' && (
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Select Location<span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={formData.selectedId || ''}
                    onChange={(e) => handleInputChange('selectedId', e.target.value ? parseInt(e.target.value) : null)}
                    className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 appearance-none ${
                      isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                    } ${errors.selectedId ? 'border-red-500' : isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}
                  >
                    <option value="">Select Location</option>
                    {locationList.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.location_name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" size={20} />
                </div>
                {errors.selectedId && <p className="text-red-500 text-xs mt-1">{errors.selectedId}</p>}
              </div>
            )}

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Month<span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={formData.month}
                  onChange={(e) => handleInputChange('month', e.target.value)}
                  className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 appearance-none ${
                    isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                  } ${errors.month ? 'border-red-500' : isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}
                >
                  <option value="">Select Month</option>
                  <option value="January">January</option>
                  <option value="February">February</option>
                  <option value="March">March</option>
                  <option value="April">April</option>
                  <option value="May">May</option>
                  <option value="June">June</option>
                  <option value="July">July</option>
                  <option value="August">August</option>
                  <option value="September">September</option>
                  <option value="October">October</option>
                  <option value="November">November</option>
                  <option value="December">December</option>
                </select>
                <ChevronDown className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" size={20} />
              </div>
              {errors.month && <p className="text-red-500 text-xs mt-1">{errors.month}</p>}
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Status
              </label>
              <input
                type="text"
                value={formData.status}
                readOnly
                className={`w-full px-3 py-2 border rounded cursor-not-allowed ${
                  isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-gray-100 border-gray-300 text-gray-500'
                }`}
              />
              <p className={`text-xs mt-1 ${
                isDarkMode ? 'text-gray-500' : 'text-gray-600'
              }`}>Default status is Pending when creating a new rebate</p>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Created By
              </label>
              <input
                type="text"
                value={formData.createdBy}
                readOnly
                className={`w-full px-3 py-2 border rounded cursor-not-allowed ${
                  isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-gray-100 border-gray-300 text-gray-500'
                }`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Approved By<span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={formData.approvedBy}
                  onChange={(e) => handleInputChange('approvedBy', e.target.value)}
                  className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 appearance-none ${
                    isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                  } ${
                    errors.approvedBy ? 'border-red-500' : isDarkMode ? 'border-gray-700' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select Approver</option>
                  {usersList.map((user, index) => (
                    <option key={index} value={user.email}>
                      {user.email}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" size={20} />
              </div>
              {errors.approvedBy && (
                <p className="text-red-500 text-xs mt-1">{errors.approvedBy}</p>
              )}
              <p className={`text-xs mt-1 ${
                isDarkMode ? 'text-gray-500' : 'text-gray-600'
              }`}>
                Select the person who will approve this rebate
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default RebateFormModal;
