import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, AlertCircle, CheckCircle } from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';

interface AddPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  editingPlan?: Plan | null;
}

interface Plan {
  id: number;
  name: string;
  description?: string;
  price: number;
  is_active?: boolean;
  modified_date?: string;
  modified_by?: string;
  created_at?: string;
  updated_at?: string;
}

interface NotificationModal {
  isOpen: boolean;
  type: 'success' | 'error';
  title: string;
  message: string;
}

const AddPlanModal: React.FC<AddPlanModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingPlan
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDarkMode, setIsDarkMode] = useState(localStorage.getItem('theme') === 'dark');
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);
  const [notification, setNotification] = useState<NotificationModal>({
    isOpen: false,
    type: 'success',
    title: '',
    message: ''
  });

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
    if (isOpen && editingPlan) {
      setFormData({
        name: editingPlan.name,
        description: editingPlan.description || '',
        price: editingPlan.price || 0
      });
    } else if (isOpen && !editingPlan) {
      resetForm();
    }
  }, [isOpen, editingPlan]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: 0
    });
    setErrors({});
  };

  const showNotification = (type: 'success' | 'error', title: string, message: string) => {
    setNotification({
      isOpen: true,
      type,
      title,
      message
    });
  };

  const closeNotification = () => {
    setNotification({
      ...notification,
      isOpen: false
    });
    
    // If it was a success notification, close the modal and refresh
    if (notification.type === 'success') {
      handleClose();
      onSave();
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Plan name is required';
    }

    if (formData.price < 0) {
      newErrors.price = 'Price cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: formData.price
      };

      const url = editingPlan 
        ? `${API_BASE_URL}/plans/${editingPlan.id}`
        : `${API_BASE_URL}/plans`;
      
      const method = editingPlan ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        showNotification(
          'success',
          'Success',
          data.message || `Plan ${editingPlan ? 'updated' : 'added'} successfully`
        );
        // Don't close immediately - wait for user to click OK on notification
      } else {
        if (data.errors) {
          const errorMessages = Object.values(data.errors).flat().join('\n');
          showNotification('error', 'Validation Error', errorMessages);
        } else {
          showNotification(
            'error',
            'Error',
            data.message || `Failed to ${editingPlan ? 'update' : 'add'} plan`
          );
        }
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      showNotification(
        'error',
        'Error',
        `Failed to ${editingPlan ? 'update' : 'add'} plan: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const incrementPrice = () => {
    setFormData({ ...formData, price: formData.price + 1 });
  };

  const decrementPrice = () => {
    if (formData.price > 0) {
      setFormData({ ...formData, price: formData.price - 1 });
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-end z-50" onClick={handleClose}>
        <div 
          className={`h-full w-3/4 md:w-full md:max-w-2xl shadow-2xl transform transition-transform duration-300 ease-in-out overflow-hidden flex flex-col ${
            isDarkMode ? 'bg-gray-900' : 'bg-white'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={`px-6 py-4 flex items-center justify-between border-b ${
            isDarkMode
              ? 'bg-gray-800 border-gray-700'
              : 'bg-gray-100 border-gray-300'
          }`}>
            <h2 className={`text-xl font-semibold ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>{editingPlan ? 'Edit Plan' : 'Add Plan'}</h2>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleClose}
                className={`px-4 py-2 rounded text-sm ${
                  isDarkMode
                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
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
                  e.currentTarget.style.backgroundColor = colorPalette?.primary || '#ea580c';
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
                onClick={handleClose}
                className={isDarkMode ? 'text-gray-400 hover:text-white transition-colors' : 'text-gray-600 hover:text-gray-900 transition-colors'}
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
                Plan Name<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 ${
                  errors.name ? 'border-red-500' : isDarkMode ? 'border-gray-700' : 'border-gray-300'
                } ${
                  isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                }`}
                placeholder="Enter plan name"
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 resize-none ${
                  isDarkMode
                    ? 'bg-gray-800 border-gray-700 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                placeholder="Enter plan description"
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Price<span className="text-red-500">*</span>
              </label>
              <div className="flex items-stretch">
                <div className={`flex items-center px-4 border rounded-l-lg border-r-0 ${
                  isDarkMode
                    ? 'bg-gray-800 border-gray-700'
                    : 'bg-gray-100 border-gray-300'
                }`}>
                  <span className={`font-medium ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>₱</span>
                </div>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) || 0 })}
                  className={`flex-1 px-4 py-3 border focus:border-orange-500 focus:outline-none text-center border-l-0 border-r-0 ${
                    errors.price ? 'border-red-500' : isDarkMode ? 'border-gray-700' : 'border-gray-300'
                  } ${
                    isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                  }`}
                  step="0.01"
                  min="0"
                />
                <div className={`flex flex-col border-t border-b border-r rounded-r-lg overflow-hidden ${
                  isDarkMode
                    ? 'border-gray-700 bg-gray-800'
                    : 'border-gray-300 bg-gray-100'
                }`}>
                  <button
                    type="button"
                    onClick={incrementPrice}
                    className={`flex-1 px-3 py-1.5 flex items-center justify-center border-b ${
                      isDarkMode
                        ? 'text-gray-400 hover:text-white hover:bg-gray-600 border-gray-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200 border-gray-300'
                    }`}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={decrementPrice}
                    className={`flex-1 px-3 py-1.5 flex items-center justify-center ${
                      isDarkMode
                        ? 'text-gray-400 hover:text-white hover:bg-gray-600'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                    }`}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
            </div>

            <div>
              <div className={`p-4 border rounded-lg ${
                isDarkMode
                  ? 'bg-blue-900/20 border-blue-700/30'
                  : 'bg-blue-50 border-blue-200'
              }`}>
                <p className={`text-sm ${
                  isDarkMode ? 'text-blue-300' : 'text-blue-700'
                }`}>
                  <strong>Note:</strong> Modified date and user information will be set automatically when the plan is created or updated.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {notification.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]" onClick={closeNotification}>
          <div 
            className={`max-w-md w-full mx-4 rounded-lg shadow-xl ${
              isDarkMode ? 'bg-gray-800' : 'bg-white'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-start space-x-4">
                <div className={`flex-shrink-0 ${
                  notification.type === 'success' ? 'text-green-500' : 'text-red-500'
                }`}>
                  {notification.type === 'success' ? (
                    <CheckCircle size={24} />
                  ) : (
                    <AlertCircle size={24} />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className={`text-lg font-semibold mb-2 ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {notification.title}
                  </h3>
                  <p className={`text-sm whitespace-pre-line ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    {notification.message}
                  </p>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={closeNotification}
                  className="px-4 py-2 rounded text-sm text-white"
                  style={{
                    backgroundColor: colorPalette?.primary || '#ea580c'
                  }}
                  onMouseEnter={(e) => {
                    if (colorPalette?.accent) {
                      e.currentTarget.style.backgroundColor = colorPalette.accent;
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = colorPalette?.primary || '#ea580c';
                  }}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AddPlanModal;
