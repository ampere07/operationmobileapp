import React, { useState, useEffect } from 'react';
import { X, Minus, Plus, Camera, Calendar, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import { getActiveImageSize, resizeImage, ImageSizeSetting } from '../services/imageSettingsService';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';

interface InventoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (formData: InventoryFormData) => void;
  editData?: InventoryFormData | null;
  initialCategory?: string;
}

interface InventoryFormData {
  itemName: string;
  itemDescription: string;
  supplier: string;
  quantityAlert: number;
  image: File | null;
  modifiedBy: string;
  modifiedDate: string;
  userEmail: string;
  category: string;
  totalStockAvailable: number;
  totalStockIn: number;
}

const InventoryFormModal: React.FC<InventoryFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editData,
  initialCategory = ''
}) => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [formData, setFormData] = useState<InventoryFormData>({
    itemName: '',
    itemDescription: '',
    supplier: '',
    quantityAlert: 0,
    image: null,
    modifiedBy: 'ravenampere0123@gmail.com',
    modifiedDate: new Date().toISOString().slice(0, 16),
    userEmail: 'ravenampere0123@gmail.com',
    category: '',
    totalStockAvailable: 0,
    totalStockIn: 0
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadingPercentage, setLoadingPercentage] = useState(0);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeImageSize, setActiveImageSize] = useState<ImageSizeSetting | null>(null);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);

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
    const fetchCategories = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/inventory-categories`);
        const data = await response.json();
        if (data.success) {
          const categoryNames = data.data.map((cat: { id: number; name: string }) => cat.name);
          setCategories(categoryNames);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchImageSizeSettings = async () => {
      if (isOpen) {
        try {
          const settings = await getActiveImageSize();
          setActiveImageSize(settings);
        } catch (error) {
          setActiveImageSize(null);
        }
      }
    };
    
    fetchImageSizeSettings();
  }, [isOpen]);

  useEffect(() => {
    if (editData) {
      setFormData({
        itemName: editData.itemName || '',
        itemDescription: editData.itemDescription || '',
        supplier: editData.supplier || '',
        quantityAlert: editData.quantityAlert || 0,
        image: editData.image || null,
        modifiedBy: editData.modifiedBy || 'ravenampere0123@gmail.com',
        modifiedDate: editData.modifiedDate || new Date().toISOString().slice(0, 16),
        userEmail: editData.userEmail || 'ravenampere0123@gmail.com',
        category: editData.category || '',
        totalStockAvailable: editData.totalStockAvailable || 0,
        totalStockIn: editData.totalStockIn || 0
      });
    } else {
      setFormData({
        itemName: '',
        itemDescription: '',
        supplier: '',
        quantityAlert: 0,
        image: null,
        modifiedBy: 'ravenampere0123@gmail.com',
        modifiedDate: new Date().toISOString().slice(0, 16),
        userEmail: 'ravenampere0123@gmail.com',
        category: initialCategory,
        totalStockAvailable: 0,
        totalStockIn: 0
      });
    }
    setErrors({});
  }, [editData, initialCategory]);

  if (!isOpen) return null;

  const handleInputChange = (field: keyof InventoryFormData, value: string | number | File | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleQuantityChange = (field: 'quantityAlert' | 'totalStockAvailable' | 'totalStockIn', increment: boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: increment ? prev[field] + 1 : Math.max(0, prev[field] - 1)
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        let processedFile = file;
        
        if (activeImageSize && activeImageSize.image_size_value < 100) {
          try {
            processedFile = await resizeImage(file, activeImageSize.image_size_value);
          } catch (resizeError) {
            processedFile = file;
          }
        }
        
        handleInputChange('image', processedFile);
      } catch (error) {
        handleInputChange('image', file);
      }
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.itemName.trim()) newErrors.itemName = 'Item Name is required';
    if (!formData.itemDescription.trim()) newErrors.itemDescription = 'Item Description is required';
    if (!formData.userEmail.trim()) newErrors.userEmail = 'User Email is required';
    if (!formData.modifiedDate.trim()) newErrors.modifiedDate = 'Modified Date is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setLoadingPercentage(0);
    
    const progressInterval = setInterval(() => {
      setLoadingPercentage(prev => {
        if (prev >= 99) return 99;
        if (prev >= 90) return prev + 1;
        if (prev >= 70) return prev + 2;
        return prev + 5;
      });
    }, 300);
    
    try {
      await onSave(formData);
      clearInterval(progressInterval);
      setLoadingPercentage(100);
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      clearInterval(progressInterval);
      console.error('Error saving inventory item:', error);
    } finally {
      setLoading(false);
      setLoadingPercentage(0);
    }
  };

  const handleCancel = () => {
    setErrors({});
    onClose();
  };

  return (
    <>
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-[10000] flex items-center justify-center">
          <div className={`rounded-lg p-8 flex flex-col items-center space-y-6 min-w-[320px] ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <Loader2 className="w-20 h-20 text-orange-500 animate-spin" />
            <div className="text-center">
              <p className={`text-4xl font-bold ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>{loadingPercentage}%</p>
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
            }`}>
              {editData ? 'Edit Inventory Item' : 'Add Inventory Item'}
            </h2>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleCancel}
                className={`px-4 py-2 rounded text-sm transition-colors ${
                  isDarkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
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
                  e.currentTarget.style.backgroundColor = colorPalette?.primary || '#ea580c';
                }}
              >
                {loading ? 'Saving...' : (editData ? 'Update' : 'Save')}
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
                Item Name<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.itemName}
                onChange={(e) => handleInputChange('itemName', e.target.value)}
                className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 ${
                  isDarkMode 
                    ? 'bg-gray-800 text-white border-gray-700' 
                    : 'bg-white text-gray-900 border-gray-300'
                } ${errors.itemName ? 'border-red-500' : ''}`}
                placeholder="Enter item name"
              />
              {errors.itemName && <p className="text-red-500 text-xs mt-1">{errors.itemName}</p>}
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Item Description<span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.itemDescription}
                onChange={(e) => handleInputChange('itemDescription', e.target.value)}
                rows={3}
                className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 resize-none ${
                  isDarkMode 
                    ? 'bg-gray-800 text-white border-gray-700' 
                    : 'bg-white text-gray-900 border-gray-300'
                } ${errors.itemDescription ? 'border-red-500' : ''}`}
                placeholder="Enter item description"
              />
              {errors.itemDescription && <p className="text-red-500 text-xs mt-1">{errors.itemDescription}</p>}
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Quantity Alert<span className="text-red-500">*</span>
              </label>
              <div className={`flex items-center border rounded ${
                isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
              }`}>
                <input
                  type="number"
                  value={formData.quantityAlert}
                  onChange={(e) => handleInputChange('quantityAlert', parseInt(e.target.value) || 0)}
                  className={`flex-1 px-3 py-2 bg-transparent focus:outline-none ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}
                  min="0"
                />
                <div className="flex">
                  <button
                    type="button"
                    onClick={() => handleQuantityChange('quantityAlert', false)}
                    className={`px-3 py-2 border-l transition-colors ${
                      isDarkMode 
                        ? 'text-gray-400 hover:text-white border-gray-700' 
                        : 'text-gray-600 hover:text-gray-900 border-gray-300'
                    }`}
                  >
                    <Minus size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuantityChange('quantityAlert', true)}
                    className={`px-3 py-2 border-l transition-colors ${
                      isDarkMode 
                        ? 'text-gray-400 hover:text-white border-gray-700' 
                        : 'text-gray-600 hover:text-gray-900 border-gray-300'
                    }`}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Image
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className={`w-full h-24 border-2 border-dashed rounded flex items-center justify-center transition-colors ${
                  isDarkMode 
                    ? 'bg-gray-800 border-gray-700 hover:border-gray-600' 
                    : 'bg-gray-50 border-gray-300 hover:border-gray-400'
                }`}>
                  <Camera className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} size={24} />
                </div>
                {formData.image && (
                  <p className={`text-xs mt-2 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>Selected: {formData.image.name}</p>
                )}
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Modified By
              </label>
              <div className={`px-3 py-2 border rounded ${
                isDarkMode 
                  ? 'bg-gray-900 border-gray-700 text-gray-400' 
                  : 'bg-gray-100 border-gray-300 text-gray-600'
              }`}>
                {formData.modifiedBy}
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Modified Date<span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="datetime-local"
                  value={formData.modifiedDate}
                  onChange={(e) => handleInputChange('modifiedDate', e.target.value)}
                  className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 ${
                    isDarkMode 
                      ? 'bg-gray-800 text-white border-gray-700' 
                      : 'bg-white text-gray-900 border-gray-300'
                  } ${errors.modifiedDate ? 'border-red-500' : ''}`}
                />
                <Calendar className={`absolute right-3 top-2.5 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`} size={20} />
              </div>
              {errors.modifiedDate && <p className="text-red-500 text-xs mt-1">{errors.modifiedDate}</p>}
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                User Email<span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formData.userEmail}
                onChange={(e) => handleInputChange('userEmail', e.target.value)}
                className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 ${
                  isDarkMode 
                    ? 'bg-gray-800 text-white border-gray-700' 
                    : 'bg-white text-gray-900 border-gray-300'
                } ${errors.userEmail ? 'border-red-500' : ''}`}
                placeholder="Enter user email"
              />
              {errors.userEmail && <p className="text-red-500 text-xs mt-1">{errors.userEmail}</p>}
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 ${
                  isDarkMode 
                    ? 'bg-gray-800 text-white border-gray-700' 
                    : 'bg-white text-gray-900 border-gray-300'
                }`}
              >
                <option value="">Select category</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Total Stock Available
              </label>
              <input
                type="number"
                value={formData.totalStockAvailable}
                onChange={(e) => handleInputChange('totalStockAvailable', parseInt(e.target.value) || 0)}
                className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 ${
                  isDarkMode 
                    ? 'bg-gray-800 text-white border-gray-700' 
                    : 'bg-white text-gray-900 border-gray-300'
                }`}
                min="0"
                placeholder="0"
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Total Stock IN
              </label>
              <input
                type="number"
                value={formData.totalStockIn}
                onChange={(e) => handleInputChange('totalStockIn', parseInt(e.target.value) || 0)}
                className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 ${
                  isDarkMode 
                    ? 'bg-gray-800 text-white border-gray-700' 
                    : 'bg-white text-gray-900 border-gray-300'
                }`}
                min="0"
                placeholder="0"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default InventoryFormModal;
