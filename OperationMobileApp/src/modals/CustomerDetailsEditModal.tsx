import React, { useState, useEffect } from 'react';
import { X, ChevronDown, Calendar, Camera } from 'lucide-react';
import { getRegions, getCities, City } from '../services/cityService';
import { barangayService, Barangay } from '../services/barangayService';
import { locationDetailService, LocationDetail } from '../services/locationDetailService';
import { planService, Plan } from '../services/planService';
import { routerModelService, RouterModel } from '../services/routerModelService';
import { getAllPorts, Port } from '../services/portService';
import { getAllLCPNAPs, LCPNAP } from '../services/lcpnapService';
import { getAllVLANs, VLAN } from '../services/vlanService';
import { getAllUsageTypes, UsageType } from '../services/usageTypeService';
import { getAllGroups, Group } from '../services/groupService';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';
import { getActiveImageSize, resizeImage, ImageSizeSetting } from '../services/imageSettingsService';

interface CustomerDetailsEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (formData: any) => void;
  recordData?: any;
  editType: 'customer_details' | 'billing_details' | 'technical_details';
}

interface ModalConfig {
  isOpen: boolean;
  type: 'success' | 'error' | 'warning' | 'confirm' | 'loading';
  title: string;
  message: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

const CustomerDetailsEditModal: React.FC<CustomerDetailsEditModalProps> = ({
  isOpen,
  onClose,
  onSave,
  recordData,
  editType: initialEditType
}) => {
  const [isDarkMode, setIsDarkMode] = useState(localStorage.getItem('theme') === 'dark');
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingPercentage, setLoadingPercentage] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [editType, setEditType] = useState<'customer_details' | 'billing_details' | 'technical_details'>(initialEditType);
  
  const [formData, setFormData] = useState<any>({});
  
  const [regions, setRegions] = useState<any[]>([]);
  const [allCities, setAllCities] = useState<City[]>([]);
  const [allBarangays, setAllBarangays] = useState<Barangay[]>([]);
  const [allLocations, setAllLocations] = useState<LocationDetail[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [routerModels, setRouterModels] = useState<RouterModel[]>([]);
  const [lcpnaps, setLcpnaps] = useState<LCPNAP[]>([]);
  const [ports, setPorts] = useState<Port[]>([]);
  const [vlans, setVlans] = useState<VLAN[]>([]);
  const [usageTypes, setUsageTypes] = useState<UsageType[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [lcpOptions, setLcpOptions] = useState<string[]>([]);
  const [napOptions, setNapOptions] = useState<string[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [activeImageSize, setActiveImageSize] = useState<ImageSizeSetting | null>(null);

  const [modal, setModal] = useState<ModalConfig>({
    isOpen: false,
    type: 'success',
    title: '',
    message: ''
  });

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
    setEditType(initialEditType);
  }, [initialEditType]);

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
    if (!isOpen) {
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
      setImagePreview(null);
    }
  }, [isOpen, imagePreview]);

  useEffect(() => {
    if (isOpen && recordData) {
      console.log('CustomerDetailsEditModal - recordData:', recordData);
      console.log('CustomerDetailsEditModal - editType:', editType);
      
      if (editType === 'customer_details') {
        // Split customerName into parts if firstName is not available
        let firstName = recordData.firstName || recordData.first_name || '';
        let middleInitial = recordData.middleInitial || recordData.middle_initial || '';
        let lastName = recordData.lastName || recordData.last_name || '';
        
        // If we don't have firstName but have customerName, try to split it
        if (!firstName && recordData.customerName) {
          const nameParts = recordData.customerName.split(' ');
          if (nameParts.length >= 2) {
            firstName = nameParts[0];
            lastName = nameParts[nameParts.length - 1];
            if (nameParts.length > 2) {
              middleInitial = nameParts[1].charAt(0);
            }
          } else if (nameParts.length === 1) {
            firstName = nameParts[0];
          }
        }
        
        const houseFrontPictureUrl = recordData.houseFrontPicture || recordData.house_front_picture || '';
        
        const newFormData = {
          firstName,
          middleInitial,
          lastName,
          emailAddress: recordData.emailAddress || recordData.email_address || recordData.email || '',
          contactNumberPrimary: recordData.contactNumberPrimary || recordData.contact_number_primary || recordData.contactNumber || '',
          contactNumberSecondary: recordData.contactNumberSecondary || recordData.contact_number_secondary || recordData.secondContactNumber || '',
          address: recordData.address || '',
          region: recordData.region || '',
          city: recordData.city || '',
          barangay: recordData.barangay || '',
          location: recordData.location || '',
          addressCoordinates: recordData.addressCoordinates || recordData.address_coordinates || '',
          housingStatus: recordData.housingStatus || recordData.housing_status || '',
          referredBy: recordData.referredBy || recordData.referred_by || '',
          groupName: recordData.groupName || recordData.group_name || recordData.group || '',
          houseFrontPicture: houseFrontPictureUrl
        };
        
        console.log('CustomerDetailsEditModal - formData:', newFormData);
        setFormData(newFormData);
        
        const convertedUrl = convertGoogleDriveUrl(houseFrontPictureUrl);
        if (convertedUrl) {
          setImagePreview(convertedUrl);
        } else {
          setImagePreview(null);
        }
      } else if (editType === 'billing_details') {
        const formatDateForInput = (dateValue: any): string => {
          if (!dateValue) return '';
          try {
            const date = new Date(dateValue);
            if (isNaN(date.getTime())) return '';
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          } catch (error) {
            return '';
          }
        };

        setFormData({
          dateInstalled: formatDateForInput(recordData.dateInstalled || recordData.date_installed),
          plan: recordData.plan || '',
          accountBalance: recordData.accountBalance || recordData.account_balance || recordData.balance || '0.00',
          billingDay: (recordData.billingDay !== undefined ? recordData.billingDay : recordData.billing_day) || '',
          billingStatus: recordData.status || recordData.billing_status || ''
        });
      } else if (editType === 'technical_details') {
        const lcpnapValue = recordData.lcpnap || recordData.LCPNAP || '';
        const parts = lcpnapValue.split('-');
        
        setFormData({
          username: recordData.username || recordData.pppoe_username || '',
          usernameStatus: recordData.usernameStatus || recordData.username_status || recordData.onlineStatus || recordData.online_status || '',
          connectionType: recordData.connectionType || recordData.connection_type || '',
          routerModel: recordData.routerModel || recordData.router_model || '',
          routerModemSn: recordData.routerModemSn || recordData.router_modem_sn || recordData.routerModemSN || '',
          ipAddress: recordData.ipAddress || recordData.ip_address || recordData.sessionIp || recordData.sessionIP || '',
          lcp: parts.length === 2 ? parts[0] : '',
          nap: parts.length === 2 ? parts[1] : '',
          port: recordData.port || recordData.PORT || '',
          vlan: recordData.vlan || recordData.VLAN || '',
          lcpnap: lcpnapValue,
          usageType: recordData.usageType || recordData.usage_type || ''
        });
      }
    }
  }, [isOpen, recordData, editType]);

  useEffect(() => {
    const fetchData = async () => {
      if (!isOpen) return;

      try {
        if (editType === 'customer_details') {
          const [fetchedRegions, fetchedCities, barangaysRes, locationsRes, groupsRes] = await Promise.all([
            getRegions(),
            getCities(),
            barangayService.getAll(),
            locationDetailService.getAll(),
            getAllGroups()
          ]);
          
          setRegions(Array.isArray(fetchedRegions) ? fetchedRegions : []);
          setAllCities(Array.isArray(fetchedCities) ? fetchedCities : []);
          setAllBarangays(barangaysRes.success && Array.isArray(barangaysRes.data) ? barangaysRes.data : []);
          setAllLocations(locationsRes.success && Array.isArray(locationsRes.data) ? locationsRes.data : []);
          setGroups(groupsRes.success && Array.isArray(groupsRes.data) ? groupsRes.data : []);
        } else if (editType === 'billing_details') {
          const fetchedPlans = await planService.getAllPlans();
          setPlans(Array.isArray(fetchedPlans) ? fetchedPlans : []);
        } else if (editType === 'technical_details') {
          const [fetchedRouterModels, lcpnapsRes, vlansRes, usageTypesRes] = await Promise.all([
            routerModelService.getAllRouterModels(),
            getAllLCPNAPs('', 1, 1000),
            getAllVLANs(),
            getAllUsageTypes()
          ]);

          setRouterModels(fetchedRouterModels);
          
          if (lcpnapsRes.success && Array.isArray(lcpnapsRes.data)) {
            setLcpnaps(lcpnapsRes.data);
            const uniqueLcps = new Set<string>();
            const uniqueNaps = new Set<string>();
            lcpnapsRes.data.forEach((item: LCPNAP) => {
              const parts = item.lcpnap_name.split('-');
              if (parts.length === 2) {
                uniqueLcps.add(parts[0]);
                uniqueNaps.add(parts[1]);
              }
            });
            setLcpOptions(Array.from(uniqueLcps).sort());
            setNapOptions(Array.from(uniqueNaps).sort());
          }

          setVlans(vlansRes.success && Array.isArray(vlansRes.data) ? vlansRes.data : []);
          setUsageTypes(usageTypesRes.success && Array.isArray(usageTypesRes.data) ? usageTypesRes.data : []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, [isOpen, editType]);

  useEffect(() => {
    const fetchPorts = async () => {
      if (isOpen && editType === 'technical_details' && formData.lcpnap) {
        try {
          const response = await getAllPorts(formData.lcpnap, 1, 100, false);
          if (response.success && Array.isArray(response.data)) {
            setPorts(response.data);
          }
        } catch (error) {
          console.error('Failed to fetch ports:', error);
        }
      } else {
        setPorts([]);
      }
    };
    fetchPorts();
  }, [isOpen, editType, formData.lcpnap]);

  useEffect(() => {
    if (editType === 'technical_details' && formData.lcp && formData.nap) {
      const generatedLcpnap = `${formData.lcp}-${formData.nap}`;
      setFormData((prev: any) => ({ ...prev, lcpnap: generatedLcpnap }));
    } else if (editType === 'technical_details' && (!formData.lcp || !formData.nap)) {
      setFormData((prev: any) => ({ ...prev, lcpnap: '' }));
    }
  }, [editType, formData.lcp, formData.nap]);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => {
      const newData = { ...prev, [field]: value };
      
      if (editType === 'customer_details') {
        if (field === 'region') {
          newData.city = '';
          newData.barangay = '';
          newData.location = '';
        } else if (field === 'city') {
          newData.barangay = '';
          newData.location = '';
        } else if (field === 'barangay') {
          newData.location = '';
        }
      } else if (editType === 'technical_details') {
        if (field === 'lcp' || field === 'nap') {
          newData.port = '';
        }
        if (field === 'connectionType') {
          if (value === 'Fiber') {
            newData.ipAddress = '';
          } else if (value === 'Antenna' || value === 'Local') {
            newData.lcp = '';
            newData.nap = '';
            newData.lcpnap = '';
            newData.port = '';
            newData.vlan = '';
          }
        }
      }
      
      return newData;
    });
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const getFilteredCities = () => {
    if (!formData.region) return [];
    const selectedRegion = regions.find((reg: any) => reg.name === formData.region);
    if (!selectedRegion) return [];
    return allCities.filter(city => city.region_id === selectedRegion.id);
  };

  const getFilteredBarangays = () => {
    if (!formData.city) return [];
    const selectedCity = allCities.find(city => city.name === formData.city);
    if (!selectedCity) return [];
    return allBarangays.filter(brgy => brgy.city_id === selectedCity.id);
  };

  const getFilteredLocations = () => {
    if (!formData.barangay) return [];
    const selectedBarangay = allBarangays.find(brgy => brgy.barangay === formData.barangay);
    if (!selectedBarangay) return [];
    return allLocations.filter(loc => loc.barangay_id === selectedBarangay.id);
  };

  const filteredCities = getFilteredCities();
  const filteredBarangays = getFilteredBarangays();
  const filteredLocations = getFilteredLocations();

  const convertGoogleDriveUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;
    
    const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
      return `https://drive.google.com/uc?export=view&id=${fileIdMatch[1]}`;
    }
    
    const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idMatch && idMatch[1]) {
      return `https://drive.google.com/uc?export=view&id=${idMatch[1]}`;
    }
    
    return url;
  };

  const isGoogleDriveUrl = (url: string | null): boolean => {
    return url ? url.includes('drive.google.com') : false;
  };

  const ImagePreview: React.FC<{
    imageUrl: string | null;
    label: string;
    onUpload: (file: File) => void;
    error?: string;
  }> = ({ imageUrl, label, onUpload, error }) => {
    const [imageLoadError, setImageLoadError] = useState(false);
    const isGDrive = isGoogleDriveUrl(imageUrl);
    const isBlobUrl = imageUrl?.startsWith('blob:');

    return (
      <div>
        <label className={`block text-sm font-medium mb-2 ${
          isDarkMode ? 'text-gray-300' : 'text-gray-700'
        }`}>{label}</label>
        <div className={`relative w-full h-48 border rounded overflow-hidden cursor-pointer ${
          isDarkMode ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' : 'bg-gray-100 border-gray-300 hover:bg-gray-200'
        }`}>
          <input 
            type="file" 
            accept="image/*" 
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                onUpload(e.target.files[0]);
                setImageLoadError(false);
              }
            }} 
            className="absolute inset-0 opacity-0 cursor-pointer z-10" 
          />
          {imageUrl ? (
            <div className="relative w-full h-full">
              {isBlobUrl || (!isGDrive && !imageLoadError) ? (
                <img 
                  src={imageUrl} 
                  alt={label} 
                  className="w-full h-full object-contain"
                  onError={() => setImageLoadError(true)}
                />
              ) : (
                <div className={`w-full h-full flex flex-col items-center justify-center ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  <Camera size={32} />
                  <span className="text-sm mt-2 text-center px-4">Image stored in Google Drive</span>
                  {imageUrl && (
                    <a 
                      href={imageUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-orange-500 text-xs mt-2 hover:underline z-20"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View in Drive
                    </a>
                  )}
                </div>
              )}
              <div className="absolute bottom-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs flex items-center pointer-events-none">
                <Camera className="mr-1" size={14} />Uploaded
              </div>
            </div>
          ) : (
            <div className={`w-full h-full flex flex-col items-center justify-center ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              <Camera size={32} />
              <span className="text-sm mt-2">Click to upload</span>
            </div>
          )}
        </div>
        {error && (
          <div className="flex items-center mt-1">
            <div className="flex items-center justify-center w-4 h-4 rounded-full bg-orange-500 text-white text-xs mr-2">!</div>
            <p className="text-orange-500 text-xs">This entry is required</p>
          </div>
        )}
      </div>
    );
  };

  const handleImageUpload = async (file: File) => {
    try {
      let processedFile = file;
      const originalSize = (file.size / 1024 / 1024).toFixed(2);
      
      if (activeImageSize && activeImageSize.image_size_value < 100) {
        try {
          const resizedFile = await resizeImage(file, activeImageSize.image_size_value);
          const resizedSize = (resizedFile.size / 1024 / 1024).toFixed(2);
          
          if (resizedFile.size < file.size) {
            processedFile = resizedFile;
            console.log(`[RESIZE SUCCESS] House Front Picture: ${originalSize}MB → ${resizedSize}MB (${activeImageSize.image_size_value}%, saved ${((1 - resizedFile.size / file.size) * 100).toFixed(1)}%)`);
          } else {
            console.log(`[RESIZE SKIP] House Front Picture: Resized file (${resizedSize}MB) is not smaller than original (${originalSize}MB), using original`);
          }
        } catch (resizeError) {
          console.error('[RESIZE FAILED] House Front Picture:', resizeError);
          processedFile = file;
        }
      }
      
      handleInputChange('houseFrontPicture', processedFile);
      
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
      
      const previewUrl = URL.createObjectURL(processedFile);
      setImagePreview(previewUrl);
      
      if (errors.houseFrontPicture) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.houseFrontPicture;
          return newErrors;
        });
      }
      
      console.log(`[STATE UPDATE] houseFrontPicture stored: ${(processedFile.size / 1024 / 1024).toFixed(2)}MB`);
    } catch (error) {
      console.error('[UPLOAD ERROR] House Front Picture:', error);
      
      handleInputChange('houseFrontPicture', file);
      
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
      
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (editType === 'customer_details') {
      if (!formData.firstName?.trim()) newErrors.firstName = 'First Name is required';
      if (!formData.lastName?.trim()) newErrors.lastName = 'Last Name is required';
      if (!formData.emailAddress?.trim()) newErrors.emailAddress = 'Email is required';
      if (!formData.contactNumberPrimary?.trim()) newErrors.contactNumberPrimary = 'Contact Number is required';
      if (!formData.address?.trim()) newErrors.address = 'Address is required';
      if (!formData.region?.trim()) newErrors.region = 'Region is required';
      if (!formData.city?.trim()) newErrors.city = 'City is required';
      if (!formData.barangay?.trim()) newErrors.barangay = 'Barangay is required';
      if (!formData.location?.trim()) newErrors.location = 'Location is required';
    } else if (editType === 'billing_details') {
      if (!formData.plan?.trim()) newErrors.plan = 'Plan is required';
      if (!formData.billingStatus?.trim()) newErrors.billingStatus = 'Billing Status is required';
    } else if (editType === 'technical_details') {
      if (!formData.username?.trim()) newErrors.username = 'Username is required';
      if (!formData.connectionType?.trim()) newErrors.connectionType = 'Connection Type is required';
      if (!formData.routerModel?.trim()) newErrors.routerModel = 'Router Model is required';
      
      if (formData.connectionType === 'Fiber') {
        if (!formData.lcp?.trim()) newErrors.lcp = 'LCP is required';
        if (!formData.nap?.trim()) newErrors.nap = 'NAP is required';
        if (!formData.port?.trim()) newErrors.port = 'Port is required';
        if (!formData.vlan?.trim()) newErrors.vlan = 'VLAN is required';
      }
      
      if (formData.connectionType === 'Antenna' || formData.connectionType === 'Local') {
        if (!formData.ipAddress?.trim()) newErrors.ipAddress = 'IP Address is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    const isValid = validateForm();
    
    if (!isValid) {
      setModal({
        isOpen: true,
        type: 'warning',
        title: 'Validation Error',
        message: 'Please fill in all required fields before saving.'
      });
      return;
    }

    onSave(formData);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  const getModalTitle = () => {
    if (editType === 'customer_details') return 'Edit Customer Details';
    if (editType === 'billing_details') return 'Edit Billing Details';
    if (editType === 'technical_details') return 'Edit Technical Details';
    return 'Edit Details';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-end z-50">
      <div className={`h-full w-full max-w-2xl shadow-2xl transform transition-transform duration-300 ease-in-out translate-x-0 overflow-hidden flex flex-col ${
        isDarkMode ? 'bg-gray-900' : 'bg-white'
      }`}>
        <div className={`px-6 py-4 flex items-center justify-between border-b ${
          isDarkMode
            ? 'bg-gray-800 border-gray-700'
            : 'bg-gray-100 border-gray-300'
        }`}>
          <h2 className={`text-xl font-semibold ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>{getModalTitle()}</h2>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleCancel}
              className={`px-4 py-2 rounded text-sm ${
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
              className={isDarkMode ? 'text-gray-400 hover:text-white transition-colors' : 'text-gray-600 hover:text-gray-900 transition-colors'}
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>Edit Type</label>
              <div className="relative">
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value as 'customer_details' | 'billing_details' | 'technical_details')}
                  className={`w-full px-3 py-2 rounded border appearance-none ${
                    isDarkMode
                      ? 'bg-gray-800 border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none`}
                >
                  <option value="customer_details">Customer Details</option>
                  <option value="billing_details">Billing Details</option>
                  <option value="technical_details">Technical Details</option>
                </select>
                <ChevronDown className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" size={20} />
              </div>
            </div>

            {editType === 'customer_details' && (
              <>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    First Name<span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.firstName || ''}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    onFocus={(e) => {
                      if (colorPalette?.primary) {
                        e.currentTarget.style.borderColor = colorPalette.primary;
                        e.currentTarget.style.boxShadow = `0 0 0 1px ${colorPalette.primary}`;
                      }
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = errors.firstName ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db');
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    className={`w-full px-3 py-2 border rounded focus:outline-none transition-colors ${
                      errors.firstName ? 'border-red-500' : isDarkMode ? 'border-gray-700' : 'border-gray-300'
                    } ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}
                  />
                  {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Middle Initial
                  </label>
                  <input
                    type="text"
                    value={formData.middleInitial || ''}
                    onChange={(e) => handleInputChange('middleInitial', e.target.value)}
                    maxLength={1}
                    onFocus={(e) => {
                      if (colorPalette?.primary) {
                        e.currentTarget.style.borderColor = colorPalette.primary;
                        e.currentTarget.style.boxShadow = `0 0 0 1px ${colorPalette.primary}`;
                      }
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = isDarkMode ? '#374151' : '#d1d5db';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    className={`w-full px-3 py-2 border rounded focus:outline-none transition-colors ${
                      isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Last Name<span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.lastName || ''}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    onFocus={(e) => {
                      if (colorPalette?.primary) {
                        e.currentTarget.style.borderColor = colorPalette.primary;
                        e.currentTarget.style.boxShadow = `0 0 0 1px ${colorPalette.primary}`;
                      }
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = errors.lastName ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db');
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    className={`w-full px-3 py-2 border rounded focus:outline-none transition-colors ${
                      errors.lastName ? 'border-red-500' : isDarkMode ? 'border-gray-700' : 'border-gray-300'
                    } ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}
                  />
                  {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Email Address<span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.emailAddress || ''}
                    onChange={(e) => handleInputChange('emailAddress', e.target.value)}
                    onFocus={(e) => {
                      if (colorPalette?.primary) {
                        e.currentTarget.style.borderColor = colorPalette.primary;
                        e.currentTarget.style.boxShadow = `0 0 0 1px ${colorPalette.primary}`;
                      }
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = errors.emailAddress ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db');
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    className={`w-full px-3 py-2 border rounded focus:outline-none transition-colors ${
                      errors.emailAddress ? 'border-red-500' : isDarkMode ? 'border-gray-700' : 'border-gray-300'
                    } ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}
                  />
                  {errors.emailAddress && <p className="text-red-500 text-xs mt-1">{errors.emailAddress}</p>}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Contact Number<span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.contactNumberPrimary || ''}
                    onChange={(e) => handleInputChange('contactNumberPrimary', e.target.value)}
                    onFocus={(e) => {
                      if (colorPalette?.primary) {
                        e.currentTarget.style.borderColor = colorPalette.primary;
                        e.currentTarget.style.boxShadow = `0 0 0 1px ${colorPalette.primary}`;
                      }
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = errors.contactNumberPrimary ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db');
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    className={`w-full px-3 py-2 border rounded focus:outline-none transition-colors ${
                      errors.contactNumberPrimary ? 'border-red-500' : isDarkMode ? 'border-gray-700' : 'border-gray-300'
                    } ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}
                  />
                  {errors.contactNumberPrimary && <p className="text-red-500 text-xs mt-1">{errors.contactNumberPrimary}</p>}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Second Contact Number
                  </label>
                  <input
                    type="text"
                    value={formData.contactNumberSecondary || ''}
                    onChange={(e) => handleInputChange('contactNumberSecondary', e.target.value)}
                    onFocus={(e) => {
                      if (colorPalette?.primary) {
                        e.currentTarget.style.borderColor = colorPalette.primary;
                        e.currentTarget.style.boxShadow = `0 0 0 1px ${colorPalette.primary}`;
                      }
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = isDarkMode ? '#374151' : '#d1d5db';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    className={`w-full px-3 py-2 border rounded focus:outline-none transition-colors ${
                      isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Address<span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.address || ''}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    onFocus={(e) => {
                      if (colorPalette?.primary) {
                        e.currentTarget.style.borderColor = colorPalette.primary;
                        e.currentTarget.style.boxShadow = `0 0 0 1px ${colorPalette.primary}`;
                      }
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = errors.address ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db');
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    className={`w-full px-3 py-2 border rounded focus:outline-none transition-colors ${
                      errors.address ? 'border-red-500' : isDarkMode ? 'border-gray-700' : 'border-gray-300'
                    } ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}
                  />
                  {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Region<span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={formData.region || ''}
                      onChange={(e) => handleInputChange('region', e.target.value)}
                      onFocus={(e) => {
                        if (colorPalette?.primary) {
                          e.currentTarget.style.borderColor = colorPalette.primary;
                          e.currentTarget.style.boxShadow = `0 0 0 1px ${colorPalette.primary}`;
                        }
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = errors.region ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db');
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                      className={`w-full px-3 py-2 border rounded focus:outline-none transition-colors appearance-none ${
                        errors.region ? 'border-red-500' : isDarkMode ? 'border-gray-700' : 'border-gray-300'
                      } ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}
                    >
                      <option value="">Select Region</option>
                      {formData.region && !regions.some((reg: any) => reg.name === formData.region) && (
                        <option value={formData.region}>{formData.region}</option>
                      )}
                      {regions.map((region: any) => (
                        <option key={region.id} value={region.name}>
                          {region.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className={`absolute right-3 top-2.5 pointer-events-none ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} size={20} />
                  </div>
                  {errors.region && <p className="text-red-500 text-xs mt-1">{errors.region}</p>}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    City<span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={formData.city || ''}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      disabled={!formData.region}
                      onFocus={(e) => {
                        if (colorPalette?.primary && !e.currentTarget.disabled) {
                          e.currentTarget.style.borderColor = colorPalette.primary;
                          e.currentTarget.style.boxShadow = `0 0 0 1px ${colorPalette.primary}`;
                        }
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = errors.city ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db');
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                      className={`w-full px-3 py-2 border rounded focus:outline-none transition-colors appearance-none disabled:opacity-50 disabled:cursor-not-allowed ${
                        errors.city ? 'border-red-500' : isDarkMode ? 'border-gray-700' : 'border-gray-300'
                      } ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}
                    >
                      <option value="">{formData.region ? 'Select City' : 'Select Region First'}</option>
                      {formData.city && !filteredCities.some(city => city.name === formData.city) && (
                        <option value={formData.city}>{formData.city}</option>
                      )}
                      {filteredCities.map((city) => (
                        <option key={city.id} value={city.name}>
                          {city.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" size={20} />
                  </div>
                  {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Barangay<span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={formData.barangay || ''}
                      onChange={(e) => handleInputChange('barangay', e.target.value)}
                      disabled={!formData.city}
                      onFocus={(e) => {
                        if (colorPalette?.primary && !e.currentTarget.disabled) {
                          e.currentTarget.style.borderColor = colorPalette.primary;
                          e.currentTarget.style.boxShadow = `0 0 0 1px ${colorPalette.primary}`;
                        }
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = errors.barangay ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db');
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                      className={`w-full px-3 py-2 border rounded focus:outline-none transition-colors appearance-none disabled:opacity-50 disabled:cursor-not-allowed ${
                        errors.barangay ? 'border-red-500' : isDarkMode ? 'border-gray-700' : 'border-gray-300'
                      } ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}
                    >
                      <option value="">{formData.city ? 'Select Barangay' : 'Select City First'}</option>
                      {formData.barangay && !filteredBarangays.some(brgy => brgy.barangay === formData.barangay) && (
                        <option value={formData.barangay}>{formData.barangay}</option>
                      )}
                      {filteredBarangays.map((barangay) => (
                        <option key={barangay.id} value={barangay.barangay}>
                          {barangay.barangay}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" size={20} />
                  </div>
                  {errors.barangay && <p className="text-red-500 text-xs mt-1">{errors.barangay}</p>}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Location<span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={formData.location || ''}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                      disabled={!formData.barangay}
                      onFocus={(e) => {
                        if (colorPalette?.primary && !e.currentTarget.disabled) {
                          e.currentTarget.style.borderColor = colorPalette.primary;
                          e.currentTarget.style.boxShadow = `0 0 0 1px ${colorPalette.primary}`;
                        }
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = errors.location ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db');
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                      className={`w-full px-3 py-2 border rounded focus:outline-none transition-colors appearance-none disabled:opacity-50 disabled:cursor-not-allowed ${
                        errors.location ? 'border-red-500' : isDarkMode ? 'border-gray-700' : 'border-gray-300'
                      } ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}
                    >
                      <option value="">{formData.barangay ? 'Select Location' : 'Select Barangay First'}</option>
                      {formData.location && formData.location.trim() !== '' && !filteredLocations.some(loc => loc.location_name === formData.location) && (
                        <option value={formData.location}>{formData.location}</option>
                      )}
                      {filteredLocations.map((location) => (
                        <option key={location.id} value={location.location_name}>
                          {location.location_name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" size={20} />
                  </div>
                  {errors.location && <p className="text-red-500 text-xs mt-1">{errors.location}</p>}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Housing Status
                  </label>
                  <div className="relative">
                    <select
                      value={formData.housingStatus || ''}
                      onChange={(e) => handleInputChange('housingStatus', e.target.value)}
                      onFocus={(e) => {
                        if (colorPalette?.primary) {
                          e.currentTarget.style.borderColor = colorPalette.primary;
                          e.currentTarget.style.boxShadow = `0 0 0 1px ${colorPalette.primary}`;
                        }
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = isDarkMode ? '#374151' : '#d1d5db';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                      className={`w-full px-3 py-2 border rounded focus:outline-none transition-colors appearance-none ${
                        isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      <option value="">Select Housing Status</option>
                      <option value="Owned">Owned</option>
                      <option value="Rented">Rented</option>
                      <option value="Family Owned">Family Owned</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" size={20} />
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Referred By
                  </label>
                  <input
                    type="text"
                    value={formData.referredBy || ''}
                    onChange={(e) => handleInputChange('referredBy', e.target.value)}
                    onFocus={(e) => {
                      if (colorPalette?.primary) {
                        e.currentTarget.style.borderColor = colorPalette.primary;
                        e.currentTarget.style.boxShadow = `0 0 0 1px ${colorPalette.primary}`;
                      }
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = isDarkMode ? '#374151' : '#d1d5db';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    className={`w-full px-3 py-2 border rounded focus:outline-none transition-colors ${
                      isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Group Name
                  </label>
                  <div className="relative">
                    <select
                      value={formData.groupName || ''}
                      onChange={(e) => handleInputChange('groupName', e.target.value)}
                      onFocus={(e) => {
                        if (colorPalette?.primary) {
                          e.currentTarget.style.borderColor = colorPalette.primary;
                          e.currentTarget.style.boxShadow = `0 0 0 1px ${colorPalette.primary}`;
                        }
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = isDarkMode ? '#374151' : '#d1d5db';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                      className={`w-full px-3 py-2 border rounded focus:outline-none transition-colors appearance-none ${
                        isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      <option value="">Select Group</option>
                      {formData.groupName && !groups.some(group => group.group_name === formData.groupName) && (
                        <option value={formData.groupName}>{formData.groupName}</option>
                      )}
                      {groups.map((group) => (
                        <option key={group.id} value={group.group_name}>
                          {group.group_name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" size={20} />
                  </div>
                </div>

                <ImagePreview
                  imageUrl={imagePreview || (typeof formData.houseFrontPicture === 'string' ? formData.houseFrontPicture : null)}
                  label="House Front Picture"
                  onUpload={handleImageUpload}
                  error={errors.houseFrontPicture}
                />
              </>
            )}

            {editType === 'billing_details' && (
              <>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Date Installed
                  </label>
                  <div className="relative">
                    <input 
                      type="date" 
                      value={formData.dateInstalled || ''} 
                      readOnly
                      className={`w-full px-3 py-2 border rounded focus:outline-none ${
                        isDarkMode ? 'bg-gray-700 text-gray-400 border-gray-600 cursor-not-allowed' : 'bg-gray-100 text-gray-500 border-gray-300 cursor-not-allowed'
                      }`}
                    />
                    <Calendar className={`absolute right-3 top-2.5 pointer-events-none ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} size={20} />
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Plan<span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select 
                      value={formData.plan || ''} 
                      onChange={(e) => handleInputChange('plan', e.target.value)} 
                      onFocus={(e) => {
                        if (colorPalette?.primary) {
                          e.currentTarget.style.borderColor = colorPalette.primary;
                          e.currentTarget.style.boxShadow = `0 0 0 1px ${colorPalette.primary}`;
                        }
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = errors.plan ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db');
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                      className={`w-full px-3 py-2 border rounded focus:outline-none transition-colors appearance-none ${
                        errors.plan ? 'border-red-500' : isDarkMode ? 'border-gray-700' : 'border-gray-300'
                      } ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}
                    >
                      <option value="">Select Plan</option>
                      {formData.plan && !plans.some(plan => {
                        const planWithPrice = plan.price ? `${plan.name} - P${plan.price}` : plan.name;
                        return planWithPrice === formData.plan || plan.name === formData.plan;
                      }) && (
                        <option value={formData.plan}>{formData.plan}</option>
                      )}
                      {plans.map((plan) => {
                        const planWithPrice = plan.price ? `${plan.name} - P${plan.price}` : plan.name;
                        return (
                          <option key={plan.id} value={planWithPrice}>
                            {planWithPrice}
                          </option>
                        );
                      })}
                    </select>
                    <ChevronDown className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" size={20} />
                  </div>
                  {errors.plan && <p className="text-red-500 text-xs mt-1">{errors.plan}</p>}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Account Balance
                  </label>
                  <input 
                    type="text" 
                    value={`₱${formData.accountBalance || '0.00'}`} 
                    readOnly
                    className={`w-full px-3 py-2 border rounded focus:outline-none ${
                      isDarkMode ? 'bg-gray-700 text-gray-400 border-gray-600 cursor-not-allowed' : 'bg-gray-100 text-gray-500 border-gray-300 cursor-not-allowed'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Billing Day
                  </label>
                  <input 
                    type="number" 
                    value={formData.billingDay || ''} 
                    onChange={(e) => handleInputChange('billingDay', e.target.value)} 
                    min="0"
                    max="31"
                    placeholder="0 for end of month, 1-31 for specific day"
                    onFocus={(e) => {
                      if (colorPalette?.primary) {
                        e.currentTarget.style.borderColor = colorPalette.primary;
                        e.currentTarget.style.boxShadow = `0 0 0 1px ${colorPalette.primary}`;
                      }
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = isDarkMode ? '#374151' : '#d1d5db';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    className={`w-full px-3 py-2 border rounded focus:outline-none transition-colors ${
                      isDarkMode ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300'
                    }`}
                  />
                  <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Enter 0 for end of month billing, or 1-31 for specific day
                  </p>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Billing Status<span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select 
                      value={formData.billingStatus || ''} 
                      onChange={(e) => handleInputChange('billingStatus', e.target.value)} 
                      onFocus={(e) => {
                        if (colorPalette?.primary) {
                          e.currentTarget.style.borderColor = colorPalette.primary;
                          e.currentTarget.style.boxShadow = `0 0 0 1px ${colorPalette.primary}`;
                        }
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = errors.billingStatus ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db');
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                      className={`w-full px-3 py-2 border rounded focus:outline-none transition-colors appearance-none ${
                        errors.billingStatus ? 'border-red-500' : isDarkMode ? 'border-gray-700' : 'border-gray-300'
                      } ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}
                    >
                      <option value="">Select Billing Status</option>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="Suspended">Suspended</option>
                      <option value="Pending">Pending</option>
                      <option value="Disconnected">Disconnected</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" size={20} />
                  </div>
                  {errors.billingStatus && <p className="text-red-500 text-xs mt-1">{errors.billingStatus}</p>}
                </div>
              </>
            )}

            {editType === 'technical_details' && (
              <>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Username<span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    value={formData.username || ''} 
                    onChange={(e) => handleInputChange('username', e.target.value)} 
                    onFocus={(e) => {
                      if (colorPalette?.primary) {
                        e.currentTarget.style.borderColor = colorPalette.primary;
                        e.currentTarget.style.boxShadow = `0 0 0 1px ${colorPalette.primary}`;
                      }
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = errors.username ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db');
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    className={`w-full px-3 py-2 border rounded focus:outline-none transition-colors ${
                      errors.username ? 'border-red-500' : isDarkMode ? 'border-gray-700' : 'border-gray-300'
                    } ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}
                  />
                  {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username}</p>}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Username Status
                  </label>
                  <div className="relative">
                    <select 
                      value={formData.usernameStatus || ''} 
                      onChange={(e) => handleInputChange('usernameStatus', e.target.value)} 
                      onFocus={(e) => {
                        if (colorPalette?.primary) {
                          e.currentTarget.style.borderColor = colorPalette.primary;
                          e.currentTarget.style.boxShadow = `0 0 0 1px ${colorPalette.primary}`;
                        }
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = isDarkMode ? '#374151' : '#d1d5db';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                      className={`w-full px-3 py-2 border rounded focus:outline-none transition-colors appearance-none ${
                        isDarkMode ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300'
                      }`}
                    >
                      <option value="">Select Username Status</option>
                      <option value="Online">Online</option>
                      <option value="Offline">Offline</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" size={20} />
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Connection Type<span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button 
                      type="button" 
                      onClick={() => handleInputChange('connectionType', 'Antenna')} 
                      className={`py-2 px-4 rounded border transition-colors duration-200 ${
                        formData.connectionType === 'Antenna' 
                          ? 'text-white border-transparent'
                          : (isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-100 border-gray-300 text-gray-700')
                      }`}
                      style={{
                        backgroundColor: formData.connectionType === 'Antenna' ? (colorPalette?.primary || '#ea580c') : undefined,
                        borderColor: formData.connectionType === 'Antenna' ? (colorPalette?.primary || '#ea580c') : undefined
                      }}
                    >
                      Antenna
                    </button>
                    <button 
                      type="button" 
                      onClick={() => handleInputChange('connectionType', 'Fiber')} 
                      className={`py-2 px-4 rounded border transition-colors duration-200 ${
                        formData.connectionType === 'Fiber' 
                          ? 'text-white border-transparent'
                          : (isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-100 border-gray-300 text-gray-700')
                      }`}
                      style={{
                        backgroundColor: formData.connectionType === 'Fiber' ? (colorPalette?.primary || '#ea580c') : undefined,
                        borderColor: formData.connectionType === 'Fiber' ? (colorPalette?.primary || '#ea580c') : undefined
                      }}
                    >
                      Fiber
                    </button>
                    <button 
                      type="button" 
                      onClick={() => handleInputChange('connectionType', 'Local')} 
                      className={`py-2 px-4 rounded border transition-colors duration-200 ${
                        formData.connectionType === 'Local' 
                          ? 'text-white border-transparent'
                          : (isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-100 border-gray-300 text-gray-700')
                      }`}
                      style={{
                        backgroundColor: formData.connectionType === 'Local' ? (colorPalette?.primary || '#ea580c') : undefined,
                        borderColor: formData.connectionType === 'Local' ? (colorPalette?.primary || '#ea580c') : undefined
                      }}
                    >
                      Local
                    </button>
                  </div>
                  {errors.connectionType && <p className="text-red-500 text-xs mt-1">{errors.connectionType}</p>}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Router Model<span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select 
                      value={formData.routerModel || ''} 
                      onChange={(e) => handleInputChange('routerModel', e.target.value)} 
                      onFocus={(e) => {
                        if (colorPalette?.primary) {
                          e.currentTarget.style.borderColor = colorPalette.primary;
                          e.currentTarget.style.boxShadow = `0 0 0 1px ${colorPalette.primary}`;
                        }
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = errors.routerModel ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db');
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                      className={`w-full px-3 py-2 border rounded focus:outline-none transition-colors appearance-none ${
                        errors.routerModel ? 'border-red-500' : isDarkMode ? 'border-gray-700' : 'border-gray-300'
                      } ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}
                    >
                      <option value="">Select Router Model</option>
                      {routerModels.map((model, index) => (
                        <option key={index} value={model.model}>
                          {model.model}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" size={20} />
                  </div>
                  {errors.routerModel && <p className="text-red-500 text-xs mt-1">{errors.routerModel}</p>}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Router Modem SN
                  </label>
                  <input 
                    type="text" 
                    value={formData.routerModemSn || ''} 
                    onChange={(e) => handleInputChange('routerModemSn', e.target.value)} 
                    onFocus={(e) => {
                      if (colorPalette?.primary) {
                        e.currentTarget.style.borderColor = colorPalette.primary;
                        e.currentTarget.style.boxShadow = `0 0 0 1px ${colorPalette.primary}`;
                      }
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = isDarkMode ? '#374151' : '#d1d5db';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    className={`w-full px-3 py-2 border rounded focus:outline-none transition-colors ${
                      isDarkMode ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300'
                    }`}
                  />
                </div>

                {(formData.connectionType === 'Antenna' || formData.connectionType === 'Local') && (
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      IP Address<span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      value={formData.ipAddress || ''} 
                      onChange={(e) => handleInputChange('ipAddress', e.target.value)} 
                      onFocus={(e) => {
                        if (colorPalette?.primary) {
                          e.currentTarget.style.borderColor = colorPalette.primary;
                          e.currentTarget.style.boxShadow = `0 0 0 1px ${colorPalette.primary}`;
                        }
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = errors.ipAddress ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db');
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                      className={`w-full px-3 py-2 border rounded focus:outline-none transition-colors ${
                        errors.ipAddress ? 'border-red-500' : isDarkMode ? 'border-gray-700' : 'border-gray-300'
                      } ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}
                    />
                    {errors.ipAddress && <p className="text-red-500 text-xs mt-1">{errors.ipAddress}</p>}
                  </div>
                )}

                {formData.connectionType === 'Fiber' && (
                  <>
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        LCP<span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <select 
                          value={formData.lcp || ''} 
                          onChange={(e) => handleInputChange('lcp', e.target.value)} 
                          onFocus={(e) => {
                            if (colorPalette?.primary) {
                              e.currentTarget.style.borderColor = colorPalette.primary;
                              e.currentTarget.style.boxShadow = `0 0 0 1px ${colorPalette.primary}`;
                            }
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = errors.lcp ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db');
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                          className={`w-full px-3 py-2 border rounded focus:outline-none transition-colors appearance-none ${
                            errors.lcp ? 'border-red-500' : isDarkMode ? 'border-gray-700' : 'border-gray-300'
                          } ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}
                        >
                          <option value="">Select LCP</option>
                          {lcpOptions.map((lcp, index) => (
                            <option key={index} value={lcp}>
                              {lcp}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" size={20} />
                      </div>
                      {errors.lcp && <p className="text-red-500 text-xs mt-1">{errors.lcp}</p>}
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        NAP<span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <select 
                          value={formData.nap || ''} 
                          onChange={(e) => handleInputChange('nap', e.target.value)} 
                          onFocus={(e) => {
                            if (colorPalette?.primary) {
                              e.currentTarget.style.borderColor = colorPalette.primary;
                              e.currentTarget.style.boxShadow = `0 0 0 1px ${colorPalette.primary}`;
                            }
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = errors.nap ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db');
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                          className={`w-full px-3 py-2 border rounded focus:outline-none transition-colors appearance-none ${
                            errors.nap ? 'border-red-500' : isDarkMode ? 'border-gray-700' : 'border-gray-300'
                          } ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}
                        >
                          <option value="">Select NAP</option>
                          {napOptions.map((nap, index) => (
                            <option key={index} value={nap}>
                              {nap}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" size={20} />
                      </div>
                      {errors.nap && <p className="text-red-500 text-xs mt-1">{errors.nap}</p>}
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        LCPNAP (Auto-generated)
                      </label>
                      <input 
                        type="text" 
                        value={formData.lcpnap || ''} 
                        readOnly
                        className={`w-full px-3 py-2 border rounded focus:outline-none ${
                          isDarkMode ? 'bg-gray-700 text-gray-400 border-gray-600 cursor-not-allowed' : 'bg-gray-100 text-gray-500 border-gray-300 cursor-not-allowed'
                        }`}
                      />
                      <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Automatically generated from LCP + NAP
                      </p>
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Port<span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <select 
                          value={formData.port || ''} 
                          onChange={(e) => handleInputChange('port', e.target.value)} 
                          disabled={!formData.lcpnap}
                          onFocus={(e) => {
                            if (colorPalette?.primary && !e.currentTarget.disabled) {
                              e.currentTarget.style.borderColor = colorPalette.primary;
                              e.currentTarget.style.boxShadow = `0 0 0 1px ${colorPalette.primary}`;
                            }
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = errors.port ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db');
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                          className={`w-full px-3 py-2 border rounded focus:outline-none transition-colors appearance-none disabled:opacity-50 disabled:cursor-not-allowed ${
                            errors.port ? 'border-red-500' : isDarkMode ? 'border-gray-700' : 'border-gray-300'
                          } ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}
                        >
                          <option value="">{formData.lcpnap ? 'Select Port' : 'Select LCP and NAP first'}</option>
                          {ports.map((port) => (
                            <option key={port.id} value={port.PORT_ID}>
                              {port.Label || port.PORT_ID}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" size={20} />
                      </div>
                      {errors.port && <p className="text-red-500 text-xs mt-1">{errors.port}</p>}
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        VLAN<span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <select 
                          value={formData.vlan || ''} 
                          onChange={(e) => handleInputChange('vlan', e.target.value)} 
                          onFocus={(e) => {
                            if (colorPalette?.primary) {
                              e.currentTarget.style.borderColor = colorPalette.primary;
                              e.currentTarget.style.boxShadow = `0 0 0 1px ${colorPalette.primary}`;
                            }
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = errors.vlan ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db');
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                          className={`w-full px-3 py-2 border rounded focus:outline-none transition-colors appearance-none ${
                            errors.vlan ? 'border-red-500' : isDarkMode ? 'border-gray-700' : 'border-gray-300'
                          } ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}
                        >
                          <option value="">Select VLAN</option>
                          {vlans.map((vlan) => (
                            <option key={vlan.vlan_id} value={vlan.value}>
                              {vlan.value}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" size={20} />
                      </div>
                      {errors.vlan && <p className="text-red-500 text-xs mt-1">{errors.vlan}</p>}
                    </div>
                  </>
                )}

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Usage Type
                  </label>
                  <div className="relative">
                    <select 
                      value={formData.usageType || ''} 
                      onChange={(e) => handleInputChange('usageType', e.target.value)} 
                      onFocus={(e) => {
                        if (colorPalette?.primary) {
                          e.currentTarget.style.borderColor = colorPalette.primary;
                          e.currentTarget.style.boxShadow = `0 0 0 1px ${colorPalette.primary}`;
                        }
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = isDarkMode ? '#374151' : '#d1d5db';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                      className={`w-full px-3 py-2 border rounded focus:outline-none transition-colors appearance-none ${
                        isDarkMode ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300'
                      }`}
                    >
                      <option value="">Select Usage Type</option>
                      {usageTypes.map((usageType) => (
                        <option key={usageType.id} value={usageType.usage_name}>
                          {usageType.usage_name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" size={20} />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {modal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60]">
          <div className={`border rounded-lg p-8 max-w-md w-full mx-4 ${
            isDarkMode
              ? 'bg-gray-900 border-gray-700'
              : 'bg-white border-gray-300'
          }`}>
            {modal.type === 'loading' ? (
              <div className="text-center">
                <div className="flex justify-center mb-6">
                  <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-orange-500"></div>
                </div>
                <p className="text-white text-4xl font-bold">{loadingPercentage}%</p>
              </div>
            ) : (
              <>
                <h3 className={`text-lg font-semibold mb-4 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>{modal.title}</h3>
                <p className={`mb-6 whitespace-pre-line ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>{modal.message}</p>
                <div className="flex items-center justify-end gap-3">
                  {modal.type === 'confirm' ? (
                    <>
                      <button
                        onClick={modal.onCancel}
                        className={`px-4 py-2 rounded transition-colors ${
                          isDarkMode
                            ? 'bg-gray-700 hover:bg-gray-600 text-white'
                            : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                        }`}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={modal.onConfirm}
                        className="px-4 py-2 text-white rounded transition-colors"
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
                        Confirm
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        if (modal.onConfirm) {
                          modal.onConfirm();
                        } else {
                          setModal({ ...modal, isOpen: false });
                        }
                      }}
                      className="px-4 py-2 text-white rounded transition-colors"
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
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDetailsEditModal;
