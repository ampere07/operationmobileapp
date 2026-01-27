import React, { useState, useEffect } from 'react';
import { X, ChevronDown, CheckCircle } from 'lucide-react';
import LoadingModal from '../components/LoadingModal';
import * as serviceOrderService from '../services/serviceOrderService';
import * as concernService from '../services/concernService';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';

interface SORequestFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  customerData?: {
    accountNo: string;
    dateInstalled: string;
    fullName: string;
    contactNumber: string;
    plan: string;
    provider: string;
    username: string;
    emailAddress?: string;
  };
}

const SORequestFormModal: React.FC<SORequestFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  customerData
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

  const generateTicketId = () => {
    const randomDigits = Math.floor(1000000 + Math.random() * 9000000);
    return randomDigits.toString();
  };

  const [formData, setFormData] = useState({
    ticketId: '',
    accountNo: '',
    dateInstalled: '',
    fullName: '',
    contactNumber: '',
    plan: '',
    provider: '',
    username: '',
    concern: '',
    concernRemarks: '',
    accountEmail: '',
    status: 'unused'
  });

  const [concerns, setConcerns] = useState<concernService.Concern[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingPercentage, setLoadingPercentage] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSuccess, setShowSuccess] = useState(false);

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
      const palette = await settingsColorPaletteService.getActive();
      setColorPalette(palette);
    };
    fetchColorPalette();
  }, []);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        ticketId: generateTicketId(),
        accountNo: customerData?.accountNo || '',
        dateInstalled: customerData?.dateInstalled || '',
        fullName: customerData?.fullName || '',
        contactNumber: customerData?.contactNumber || '',
        plan: customerData?.plan || '',
        provider: customerData?.provider || '',
        username: customerData?.username || '',
        accountEmail: customerData?.emailAddress || '',
        concern: '',
        concernRemarks: '',
        status: 'unused'
      });
      loadData();
    }
  }, [isOpen, customerData]);

  const loadData = async () => {
    try {
      const concernsResponse = await concernService.concernService.getAllConcerns();
      setConcerns(concernsResponse || []);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.accountNo) {
      newErrors.accountNo = 'Account No. is required';
    }

    if (!formData.dateInstalled) {
      newErrors.dateInstalled = 'Date Installed is required';
    }

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full Name is required';
    }

    if (!formData.contactNumber.trim()) {
      newErrors.contactNumber = 'Contact Number is required';
    }

    if (!formData.plan) {
      newErrors.plan = 'Plan is required';
    }



    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    }

    if (!formData.concern) {
      newErrors.concern = 'Concern is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      alert('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    setLoadingPercentage(0);

    try {
      setLoadingPercentage(20);

      const payload: any = {
        ticket_id: formData.ticketId,
        account_no: formData.accountNo,
        timestamp: new Date().toISOString(),
        support_status: 'Open',
        concern: formData.concern,
        concern_remarks: formData.concernRemarks,
        priority_level: 'Medium',
        requested_by: formData.accountEmail || formData.accountNo,
        visit_status: 'Pending',
        created_by_user: getUserEmail(),
        status: 'unused'
      };

      setLoadingPercentage(50);
      await serviceOrderService.createServiceOrder(payload);

      setLoadingPercentage(100);
      await new Promise(resolve => setTimeout(resolve, 500));

      setShowSuccess(true);
    } catch (error) {
      console.error('Error creating SO request:', error);
      alert(`Failed to save SO request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
      setLoadingPercentage(0);
    }
  };

  const handleCancel = () => {
    setFormData({
      ticketId: '',
      accountNo: '',
      dateInstalled: '',
      fullName: '',
      contactNumber: '',
      plan: '',
      provider: '',
      username: '',
      accountEmail: '',
      concern: '',
      concernRemarks: '',
      status: 'unused'
    });
    setErrors({});
    onClose();
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    onSave();
    handleCancel();
  };

  if (!isOpen) return null;

  return (
    <>
      <LoadingModal 
        isOpen={loading} 
        message="Saving SO request..." 
        percentage={loadingPercentage} 
      />
      
      {showSuccess && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className={`rounded-lg p-6 max-w-sm w-full mx-4 ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="flex flex-col items-center">
              <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
              <p className={`text-center mb-6 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>SO Request created successfully!</p>
              
              <button
                onClick={handleSuccessClose}
                className="px-6 py-2 text-white rounded transition-colors"
                style={{
                  backgroundColor: colorPalette?.primary || '#ea580c'
                }}
                onMouseEnter={(e) => {
                  if (colorPalette?.accent) {
                    e.currentTarget.style.backgroundColor = colorPalette.accent;
                  }
                }}
                onMouseLeave={(e) => {
                  if (colorPalette?.primary) {
                    e.currentTarget.style.backgroundColor = colorPalette.primary;
                  }
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-end z-50">
        <div className={`h-full w-full max-w-2xl shadow-2xl transform transition-transform duration-300 ease-in-out translate-x-0 overflow-hidden flex flex-col ${
          isDarkMode ? 'bg-gray-900' : 'bg-white'
        }`}>
          <div className={`px-6 py-4 flex items-center justify-between border-b ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'
          }`}>
            <h2 className={`text-xl font-semibold ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>SO Request</h2>
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
                className="px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded text-sm flex items-center"
                style={{
                  backgroundColor: colorPalette?.primary || '#ea580c'
                }}
                onMouseEnter={(e) => {
                  if (colorPalette?.accent && !loading) {
                    e.currentTarget.style.backgroundColor = colorPalette.accent;
                  }
                }}
                onMouseLeave={(e) => {
                  if (colorPalette?.primary) {
                    e.currentTarget.style.backgroundColor = colorPalette.primary;
                  }
                }}
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

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Ticket ID<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.ticketId}
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
                Account No.<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.accountNo}
                readOnly
                className={`w-full px-3 py-2 border rounded cursor-not-allowed ${
                  isDarkMode ? 'bg-gray-800 text-red-400' : 'bg-gray-100 text-red-600'
                } ${
                  errors.accountNo ? 'border-red-500' : isDarkMode ? 'border-gray-700' : 'border-gray-300'
                }`}
              />
              {errors.accountNo && <p className="text-red-500 text-xs mt-1">{errors.accountNo}</p>}
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Date Installed<span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.dateInstalled}
                onChange={(e) => handleInputChange('dateInstalled', e.target.value)}
                className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-red-500 ${
                  isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                } ${
                  errors.dateInstalled ? 'border-red-500' : isDarkMode ? 'border-gray-700' : 'border-gray-300'
                }`}
              />
              {errors.dateInstalled && <p className="text-red-500 text-xs mt-1">{errors.dateInstalled}</p>}
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Full Name<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => handleInputChange('fullName', e.target.value)}
                className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-red-500 ${
                  isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                } ${
                  errors.fullName ? 'border-red-500' : isDarkMode ? 'border-gray-700' : 'border-gray-300'
                }`}
              />
              {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Contact Number<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.contactNumber}
                onChange={(e) => handleInputChange('contactNumber', e.target.value)}
                className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-red-500 ${
                  isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                } ${
                  errors.contactNumber ? 'border-red-500' : isDarkMode ? 'border-gray-700' : 'border-gray-300'
                }`}
              />
              {errors.contactNumber && <p className="text-red-500 text-xs mt-1">{errors.contactNumber}</p>}
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Plan<span className="text-red-500">*</span>
              </label>
              <div className={`px-3 py-2 border rounded ${
                isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-100 border-gray-300 text-gray-900'
              }`}>
                {formData.plan || 'No plan'}
              </div>
              {errors.plan && <p className="text-red-500 text-xs mt-1">{errors.plan}</p>}
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Affiliate
              </label>
              <div className={`px-3 py-2 border rounded ${
                isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-100 border-gray-300 text-gray-900'
              }`}>
                {formData.provider || 'No affiliate'}
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Username<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-red-500 ${
                  isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                } ${
                  errors.username ? 'border-red-500' : isDarkMode ? 'border-gray-700' : 'border-gray-300'
                }`}
              />
              {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username}</p>}
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Concern<span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={formData.concern}
                  onChange={(e) => handleInputChange('concern', e.target.value)}
                  className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-red-500 appearance-none ${
                    isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                  } ${
                    errors.concern ? 'border-red-500' : isDarkMode ? 'border-gray-700' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select Concern</option>
                  {concerns.map(concern => (
                    <option key={concern.id} value={concern.concern_name}>
                      {concern.concern_name}
                    </option>
                  ))}
                </select>
                <ChevronDown className={`absolute right-3 top-2.5 pointer-events-none ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`} size={20} />
              </div>
              {errors.concern && <p className="text-red-500 text-xs mt-1">{errors.concern}</p>}
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Concern Remarks<span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.concernRemarks}
                onChange={(e) => handleInputChange('concernRemarks', e.target.value)}
                rows={4}
                className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-red-500 resize-none ${
                  isDarkMode ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300'
                }`}
                placeholder="Enter concern details..."
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SORequestFormModal;
