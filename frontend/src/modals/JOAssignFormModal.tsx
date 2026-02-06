import React, { useState, useEffect } from 'react';
import { X, Calendar, ChevronDown, Minus, Plus, Loader2 } from 'lucide-react';
import { createJobOrder, JobOrderData } from '../services/jobOrderService';
import { updateApplication } from '../services/applicationService';
import { getContractTemplates, ContractTemplate } from '../services/lookupService';
import { getAllGroups, Group } from '../services/groupService';
import apiClient from '../config/api';
import { UserData } from '../types/api';
import { userService } from '../services/userService';
import { getRegions, getCities, City } from '../services/cityService';
import { barangayService, Barangay } from '../services/barangayService';
import { locationDetailService, LocationDetail } from '../services/locationDetailService';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';

interface JOAssignFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (formData: JobOrderData) => void;
  applicationData?: any;
}

interface ModalConfig {
  isOpen: boolean;
  type: 'success' | 'error' | 'warning' | 'confirm' | 'loading';
  title: string;
  message: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface JOFormData {
  timestamp: string;

  status: string;
  referredBy: string;
  firstName: string;
  middleInitial: string;
  lastName: string;
  contactNumber: string;
  email: string;
  address: string;
  barangay: string;
  city: string;
  region: string;
  location: string;
  choosePlan: string;
  promo: string;
  remarks: string;
  installationFee: number;
  contractTemplate: string;
  billingDay: string;
  isLastDayOfMonth: boolean;
  onsiteStatus: string;
  assignedEmail: string;
  modifiedBy: string;
  modifiedDate: string;
  installationLandmark: string;
}

const JOAssignFormModal: React.FC<JOAssignFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  applicationData
}) => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);

  const getCurrentUser = (): UserData | null => {
    try {
      const authData = localStorage.getItem('authData');
      if (authData) {
        return JSON.parse(authData);
      }
    } catch (error) {
      return null;
    }
    return null;
  };

  const currentUser = getCurrentUser();
  const currentUserEmail = currentUser?.email || 'unknown@ampere.com';

  const [formData, setFormData] = useState<JOFormData>({
    timestamp: new Date().toLocaleString('sv-SE').replace(' ', ' '),

    status: '',
    referredBy: '',
    firstName: '',
    middleInitial: '',
    lastName: '',
    contactNumber: '',
    email: '',
    address: '',
    barangay: '',
    city: '',
    region: '',
    location: '',
    choosePlan: '',
    promo: '',
    remarks: '',
    installationFee: 0.00,
    contractTemplate: '0',
    billingDay: '',
    isLastDayOfMonth: false,
    onsiteStatus: 'In Progress',
    assignedEmail: '',
    modifiedBy: currentUserEmail,
    modifiedDate: new Date().toLocaleString('sv-SE').replace(' ', ' '),
    installationLandmark: ''
  });

  interface Region {
    id: number;
    name: string;
  }

  interface Plan {
    id: number;
    name: string;
    description?: string;
    price?: number;
  }

  interface Promo {
    id: number;
    promo_name: string;
    description?: string;
  }

  interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
  }

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadingPercentage, setLoadingPercentage] = useState(0);
  const [pendingJobOrder, setPendingJobOrder] = useState<any>(null);

  const [modal, setModal] = useState<ModalConfig>({
    isOpen: false,
    type: 'success',
    title: '',
    message: ''
  });

  const [contractTemplates, setContractTemplates] = useState<ContractTemplate[]>([]);
  const [lookupLoading, setLookupLoading] = useState(true);

  const [regions, setRegions] = useState<Region[]>([]);
  const [allCities, setAllCities] = useState<City[]>([]);
  const [allBarangays, setAllBarangays] = useState<Barangay[]>([]);
  const [allLocations, setAllLocations] = useState<LocationDetail[]>([]);

  const [plans, setPlans] = useState<Plan[]>([]);
  const [promos, setPromos] = useState<Promo[]>([]);
  const [technicians, setTechnicians] = useState<Array<{ email: string; name: string }>>([]);
  const [groups, setGroups] = useState<Group[]>([]);

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
    const fetchTechnicians = async () => {
      if (isOpen) {
        try {
          const response = await userService.getUsersByRole('technician');
          if (response.success && response.data) {
            const technicianList = response.data
              .filter((user: any) => user.first_name || user.last_name)
              .map((user: any) => {
                const firstName = (user.first_name || '').trim();
                const lastName = (user.last_name || '').trim();
                const fullName = `${firstName} ${lastName}`.trim();
                return {
                  email: user.email_address || user.email || '',
                  name: fullName || user.username || user.email_address || user.email || ''
                };
              })
              .filter((tech: any) => tech.name && tech.email);
            setTechnicians(technicianList);
          }
        } catch (error) {
          setTechnicians([]);
        }
      }
    };

    fetchTechnicians();
  }, [isOpen]);

  useEffect(() => {
    const fetchGroups = async () => {
      if (isOpen) {
        try {
          const response = await getAllGroups();
          if (response.success && Array.isArray(response.data)) {
            setGroups(response.data);
          } else {
            setGroups([]);
          }
        } catch (error) {
          setGroups([]);
        }
      }
    };

    fetchGroups();
  }, [isOpen]);

  useEffect(() => {
    const fetchLookupData = async () => {
      try {
        setLookupLoading(true);
        const templates = await getContractTemplates();
        setContractTemplates(templates);
      } catch (error) {
        setLookupLoading(false);
      } finally {
        setLookupLoading(false);
      }
    };

    if (isOpen) {
      fetchLookupData();
    }
  }, [isOpen]);

  useEffect(() => {
    const loadPlans = async () => {
      if (isOpen) {
        try {
          const response = await apiClient.get<ApiResponse<Plan[]> | Plan[]>('/plans');
          const data = response.data;

          if (data && typeof data === 'object' && 'success' in data && data.success && Array.isArray(data.data)) {
            setPlans(data.data);
          } else if (Array.isArray(data)) {
            setPlans(data);
          } else {
            setPlans([]);
          }
        } catch (error) {
          setPlans([]);
        }
      }
    };

    loadPlans();
  }, [isOpen]);

  useEffect(() => {
    const loadPromos = async () => {
      if (isOpen) {
        try {
          const response = await apiClient.get<ApiResponse<Promo[]> | Promo[]>('/promos');
          const data = response.data;

          if (data && typeof data === 'object' && 'success' in data && data.success && Array.isArray(data.data)) {
            setPromos(data.data);
          } else if (Array.isArray(data)) {
            setPromos(data);
          } else {
            setPromos([]);
          }
        } catch (error) {
          setPromos([]);
        }
      }
    };

    loadPromos();
  }, [isOpen]);

  useEffect(() => {
    const fetchRegions = async () => {
      if (isOpen) {
        try {
          const fetchedRegions = await getRegions();

          if (Array.isArray(fetchedRegions)) {
            setRegions(fetchedRegions);
          } else {
            setRegions([]);
          }
        } catch (error) {
          setRegions([]);
        }
      }
    };

    fetchRegions();
  }, [isOpen]);

  useEffect(() => {
    const fetchAllCities = async () => {
      if (isOpen) {
        try {
          const fetchedCities = await getCities();

          if (Array.isArray(fetchedCities)) {
            setAllCities(fetchedCities);
          } else {
            setAllCities([]);
          }
        } catch (error) {
          setAllCities([]);
        }
      }
    };

    fetchAllCities();
  }, [isOpen]);

  useEffect(() => {
    const fetchAllBarangays = async () => {
      if (isOpen) {
        try {
          const response = await barangayService.getAll();

          if (response.success && Array.isArray(response.data)) {
            setAllBarangays(response.data);
          } else {
            setAllBarangays([]);
          }
        } catch (error) {
          setAllBarangays([]);
        }
      }
    };

    fetchAllBarangays();
  }, [isOpen]);

  useEffect(() => {
    const fetchAllLocations = async () => {
      if (isOpen) {
        try {
          const response = await locationDetailService.getAll();

          if (response.success && Array.isArray(response.data)) {
            setAllLocations(response.data);
          } else {
            setAllLocations([]);
          }
        } catch (error) {
          setAllLocations([]);
        }
      }
    };

    fetchAllLocations();
  }, [isOpen]);

  useEffect(() => {
    if (applicationData && isOpen) {
      setFormData(prev => ({
        ...prev,
        referredBy: applicationData.referred_by || '',
        firstName: applicationData.first_name || '',
        middleInitial: applicationData.middle_initial || '',
        lastName: applicationData.last_name || '',
        contactNumber: applicationData.mobile_number || '',
        email: applicationData.email_address || '',
        address: applicationData.installation_address || '',
        barangay: applicationData.barangay || '',
        city: applicationData.city || '',
        region: applicationData.region || '',
        location: applicationData.location || '',
        choosePlan: applicationData.desired_plan || '',
        promo: applicationData.promo || '',
        installationLandmark: applicationData.landmark || ''
      }));
    }
  }, [applicationData, isOpen]);

  const handleInputChange = (field: keyof JOFormData, value: string | number | boolean) => {
    if (field === 'billingDay') {
      const numValue = parseInt(value as string);
      if (!isNaN(numValue) && numValue > 30) {
        // If user tries to type > 30, keep the previous value or do nothing if this is direct input
        // However, since we are in the handler, preventing the update is sufficient
        return;
      }
    }

    setFormData(prev => {
      const newData = { ...prev, [field]: value };

      if (field === 'isLastDayOfMonth' && value === true) {
        newData.billingDay = '0';
      }

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

      return newData;
    });
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleInstallationFeeChange = (value: string) => {
    if (value === '' || value === '-') {
      setFormData(prev => ({ ...prev, installationFee: 0 }));
    } else {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        setFormData(prev => ({ ...prev, installationFee: numValue }));
      }
    }
    if (errors.installationFee) {
      setErrors(prev => ({ ...prev, installationFee: '' }));
    }
  };

  const handleNumberChange = (field: 'installationFee' | 'contractTemplate' | 'billingDay', increment: boolean) => {
    setFormData(prev => {
      if (field === 'installationFee') {
        return {
          ...prev,
          [field]: increment ? prev[field] + 0.01 : Math.max(0, prev[field] - 0.01)
        };
      } else if (field === 'billingDay') {
        const currentValue = parseInt(prev[field]) || 1;
        const newValue = increment ? Math.min(30, currentValue + 1) : Math.max(1, currentValue - 1);
        return {
          ...prev,
          [field]: newValue.toString()
        };
      } else {
        const currentValue = parseInt(prev[field]) || 0;
        const newValue = increment ? currentValue + 1 : Math.max(0, currentValue - 1);
        return {
          ...prev,
          [field]: newValue.toString()
        };
      }
    });
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.timestamp.trim()) {
      newErrors.timestamp = 'Timestamp is required';
    }



    if (!formData.status.trim()) {
      newErrors.status = 'Status is required';
    }

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First Name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last Name is required';
    }

    if (!formData.contactNumber.trim()) {
      newErrors.contactNumber = 'Contact Number is required';
    } else if (!/^[0-9+\-\s()]+$/.test(formData.contactNumber.trim())) {
      newErrors.contactNumber = 'Please enter a valid contact number';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    }

    if (!formData.region.trim()) {
      newErrors.region = 'Region is required';
    }

    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    }

    if (!formData.barangay.trim()) {
      newErrors.barangay = 'Barangay is required';
    }

    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }

    if (!formData.choosePlan.trim()) {
      newErrors.choosePlan = 'Choose Plan is required';
    }

    if (formData.installationFee < 0) {
      newErrors.installationFee = 'Installation fee cannot be negative';
    }

    if (!formData.contractTemplate.trim()) {
      newErrors.contractTemplate = 'Contract Template is required';
    }

    const billingDayNum = parseInt(formData.billingDay);
    if (!formData.isLastDayOfMonth) {
      if (isNaN(billingDayNum) || billingDayNum < 1) {
        newErrors.billingDay = 'Billing Day must be at least 1';
      } else if (billingDayNum > 30) {
        newErrors.billingDay = 'Billing Day cannot exceed 30';
      }
    }

    if (formData.status === 'Confirmed') {
      if (!formData.onsiteStatus.trim()) {
        newErrors.onsiteStatus = 'Onsite Status is required when status is Confirmed';
      }

      if (formData.onsiteStatus !== 'Failed' && !formData.assignedEmail.trim()) {
        newErrors.assignedEmail = 'Assigned Email is required when onsite status is not Failed';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const mapFormDataToJobOrder = (applicationId: string, data: JOFormData = formData): any => {
    const toNullIfEmpty = (value: string | number | undefined): string | null => {
      if (value === undefined || value === null || value === '' || value === 'None' || value === 'All') {
        return null;
      }
      return String(value);
    };

    const toNullIfEmptyOrZero = (value: string | number | undefined): string | null => {
      if (value === undefined || value === null || value === '' || value === 0 || value === '0') {
        return null;
      }
      return String(value);
    };

    const currentTimestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const formattedTimestamp = data.timestamp ?
      new Date(data.timestamp).toISOString().slice(0, 19).replace('T', ' ') :
      currentTimestamp;

    return {
      application_id: applicationId,
      timestamp: formattedTimestamp,
      installation_fee: data.installationFee || 0,
      billing_day: data.isLastDayOfMonth ? 0 : (parseInt(data.billingDay) || 30),
      billing_status: 'In Progress',
      modem_router_sn: toNullIfEmpty(data.contractTemplate),
      onsite_status: data.onsiteStatus || 'In Progress',
      assigned_email: toNullIfEmpty(data.assignedEmail),
      onsite_remarks: toNullIfEmpty(data.remarks),
      contract_link: null,
      username: null,
      group_name: null,
      house_front_picture_url: applicationData?.house_front_picture_url || null,
      installation_landmark: toNullIfEmpty(data.installationLandmark),
      created_by_user_email: data.modifiedBy,
      updated_by_user_email: data.modifiedBy,
    };
  };

  const handleSave = async () => {
    const updatedFormData = {
      ...formData,
      modifiedBy: currentUserEmail,
      modifiedDate: new Date().toLocaleString('sv-SE').replace(' ', ' ')
    };

    setFormData(updatedFormData);

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

    if (!applicationData?.id) {
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Missing application ID. Cannot create job order.'
      });
      return;
    }

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
      const jobOrderData = mapFormDataToJobOrder(applicationData.id, updatedFormData);
      const result = await createJobOrder(jobOrderData);

      if (!result.success) {
        throw new Error(result.message || 'Failed to create job order');
      }

      try {
        const applicationUpdateData: any = {
          promo: updatedFormData.promo || null,
          status: 'In Progress'
        };

        await updateApplication(applicationData.id.toString(), applicationUpdateData);
      } catch (appError: any) {
        // Silently log promo update failures to avoid blocking the user
        // with the "Partial Success" modal, as the Job Order itself was created.
        console.error('Application promo update failed:', appError);
      }

      clearInterval(progressInterval);
      setLoadingPercentage(100);
      await new Promise(resolve => setTimeout(resolve, 500));

      setPendingJobOrder(result.data);
      setErrors({});
      setModal({
        isOpen: true,
        type: 'success',
        title: 'Success',
        message: 'Job Order created successfully!',
        onConfirm: () => {
          onSave(pendingJobOrder!);
          setPendingJobOrder(null);
          onClose();
          setModal({ ...modal, isOpen: false });
        }
      });
    } catch (error: any) {
      let errorMessage = 'Unknown error occurred';

      if (error.response?.data?.errors) {
        const validationErrors = error.response.data.errors;
        const errorDetails = Object.entries(validationErrors)
          .map(([field, messages]: [string, any]) => {
            const messageArray = Array.isArray(messages) ? messages : [messages];
            return `${field}: ${messageArray.join(', ')}`;
          })
          .join('\n');
        errorMessage = `Validation failed:\n${errorDetails}`;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      clearInterval(progressInterval);
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Failed to Create Job Order',
        message: `Failed to create job order: ${errorMessage}`
      });
    } finally {
      setLoading(false);
      setLoadingPercentage(0);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  const getFilteredCities = () => {
    if (!formData.region) return [];
    const selectedRegion = regions.find(reg => reg.name === formData.region);
    if (!selectedRegion) return [];
    return allCities.filter(city => city.region_id === selectedRegion.id);
  };

  const getFilteredBarangays = () => {
    if (!formData.city) return [];
    const selectedCity = allCities.find(city => city.name === formData.city);
    if (!selectedCity) return [];
    return allBarangays.filter(brgy => brgy.city_id !== undefined && brgy.city_id === selectedCity.id);
  };

  const getFilteredLocations = () => {
    if (!formData.barangay) return [];
    const selectedBarangay = allBarangays.find(brgy => brgy.barangay === formData.barangay);
    if (!selectedBarangay || !selectedBarangay.id) return [];
    return allLocations.filter(loc => loc.barangay_id === selectedBarangay.id);
  };

  const filteredCities = getFilteredCities();
  const filteredBarangays = getFilteredBarangays();
  const filteredLocations = getFilteredLocations();

  if (!isOpen) return null;

  return (
    <>
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-[10000] flex items-center justify-center">
          <div className={`rounded-lg p-8 flex flex-col items-center space-y-6 min-w-[320px] ${isDarkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
            <Loader2
              className="w-20 h-20 animate-spin"
              style={{ color: colorPalette?.primary || '#ea580c' }}
            />
            <div className="text-center">
              <p className={`text-4xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>{loadingPercentage}%</p>
            </div>
          </div>
        </div>
      )}

      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-end z-50">
        <div className={`h-full w-full max-w-2xl shadow-2xl transform transition-transform duration-300 ease-in-out translate-x-0 overflow-hidden flex flex-col ${isDarkMode ? 'bg-gray-900' : 'bg-white'
          }`}>
          <div className={`px-6 py-4 flex items-center justify-between border-b ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'
            }`}>
            <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>JO Assign Form</h2>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleCancel}
                className={`px-4 py-2 rounded text-sm transition-colors ${isDarkMode
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
                {loading ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={onClose}
                className={`transition-colors ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                <X size={24} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                  Timestamp<span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="datetime-local"
                    value={formData.timestamp}
                    onChange={(e) => handleInputChange('timestamp', e.target.value)}
                    className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 ${isDarkMode
                      ? 'bg-gray-800 text-white border-gray-700'
                      : 'bg-white text-gray-900 border-gray-300'
                      } ${errors.timestamp ? 'border-red-500' : ''}`}
                  />
                  <Calendar className={`absolute right-3 top-2.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`} size={20} />
                </div>
                {errors.timestamp && <p className="text-red-500 text-xs mt-1">{errors.timestamp}</p>}
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                  Status<span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 appearance-none ${isDarkMode
                      ? 'bg-gray-800 text-white border-gray-700'
                      : 'bg-white text-gray-900 border-gray-300'
                      } ${errors.status ? 'border-red-500' : ''}`}
                  >
                    <option value="" disabled>Select Status</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="For Confirmation">For Confirmation</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                  <ChevronDown className={`absolute right-3 top-2.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`} size={20} />
                </div>
                {errors.status && <p className="text-red-500 text-xs mt-1">{errors.status}</p>}
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>Referred By</label>
                <input
                  type="text"
                  value={formData.referredBy}
                  onChange={(e) => handleInputChange('referredBy', e.target.value)}
                  className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 ${isDarkMode
                    ? 'bg-gray-800 text-white border-gray-700'
                    : 'bg-white text-gray-900 border-gray-300'
                    }`}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                  First Name<span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 ${isDarkMode
                    ? 'bg-gray-800 text-white border-gray-700'
                    : 'bg-white text-gray-900 border-gray-300'
                    } ${errors.firstName ? 'border-red-500' : ''}`}
                />
                {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>Middle Initial</label>
                <input
                  type="text"
                  value={formData.middleInitial}
                  onChange={(e) => handleInputChange('middleInitial', e.target.value)}
                  maxLength={1}
                  className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 ${isDarkMode
                    ? 'bg-gray-800 text-white border-gray-700'
                    : 'bg-white text-gray-900 border-gray-300'
                    }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                  Last Name<span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 ${isDarkMode
                    ? 'bg-gray-800 text-white border-gray-700'
                    : 'bg-white text-gray-900 border-gray-300'
                    } ${errors.lastName ? 'border-red-500' : ''}`}
                />
                {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                  Contact Number<span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.contactNumber}
                  onChange={(e) => handleInputChange('contactNumber', e.target.value)}
                  className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 ${isDarkMode
                    ? 'bg-gray-800 text-white border-gray-700'
                    : 'bg-white text-gray-900 border-gray-300'
                    } ${errors.contactNumber ? 'border-red-500' : ''}`}
                />
                {errors.contactNumber && <p className="text-red-500 text-xs mt-1">{errors.contactNumber}</p>}
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                  Applicant Email Address<span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 ${isDarkMode
                    ? 'bg-gray-800 text-white border-gray-700'
                    : 'bg-white text-gray-900 border-gray-300'
                    } ${errors.email ? 'border-red-500' : ''}`}
                />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                  Address<span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 ${isDarkMode
                    ? 'bg-gray-800 text-white border-gray-700'
                    : 'bg-white text-gray-900 border-gray-300'
                    } ${errors.address ? 'border-red-500' : ''}`}
                />
                {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                  Region<span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={formData.region}
                    onChange={(e) => handleInputChange('region', e.target.value)}
                    className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 appearance-none ${isDarkMode
                      ? 'bg-gray-800 text-white border-gray-700'
                      : 'bg-white text-gray-900 border-gray-300'
                      } ${errors.region ? 'border-red-500' : ''}`}
                  >
                    <option value="">Select Region</option>
                    {formData.region && !regions.some(reg => reg.name === formData.region) && (
                      <option value={formData.region}>{formData.region}</option>
                    )}
                    {regions.map((region) => (
                      <option key={region.id} value={region.name}>
                        {region.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className={`absolute right-3 top-2.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`} size={20} />
                </div>
                {errors.region && <p className="text-red-500 text-xs mt-1">{errors.region}</p>}
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                  City<span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    disabled={!formData.region}
                    className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 appearance-none disabled:opacity-50 disabled:cursor-not-allowed ${isDarkMode
                      ? 'bg-gray-800 text-white border-gray-700'
                      : 'bg-white text-gray-900 border-gray-300'
                      } ${errors.city ? 'border-red-500' : ''}`}
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
                  <ChevronDown className={`absolute right-3 top-2.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`} size={20} />
                </div>
                {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                  Barangay<span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={formData.barangay}
                    onChange={(e) => handleInputChange('barangay', e.target.value)}
                    disabled={!formData.city}
                    className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 appearance-none disabled:opacity-50 disabled:cursor-not-allowed ${isDarkMode
                      ? 'bg-gray-800 text-white border-gray-700'
                      : 'bg-white text-gray-900 border-gray-300'
                      } ${errors.barangay ? 'border-red-500' : ''}`}
                  >
                    <option value="">{formData.city ? 'Select Barangay' : 'Select City First'}</option>
                    {formData.barangay && !filteredBarangays.some(b => b.barangay === formData.barangay) && (
                      <option value={formData.barangay}>{formData.barangay}</option>
                    )}
                    {filteredBarangays.map((barangay) => (
                      <option key={barangay.id} value={barangay.barangay}>
                        {barangay.barangay}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className={`absolute right-3 top-2.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`} size={20} />
                </div>
                {errors.barangay && <p className="text-red-500 text-xs mt-1">{errors.barangay}</p>}
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                  Location<span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    disabled={!formData.barangay}
                    className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 appearance-none disabled:opacity-50 disabled:cursor-not-allowed ${isDarkMode
                      ? 'bg-gray-800 text-white border-gray-700'
                      : 'bg-white text-gray-900 border-gray-300'
                      } ${errors.location ? 'border-red-500' : ''}`}
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
                  <ChevronDown className={`absolute right-3 top-2.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`} size={20} />
                </div>
                {errors.location && <p className="text-red-500 text-xs mt-1">{errors.location}</p>}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                  Choose Plan<span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={formData.choosePlan}
                    onChange={(e) => handleInputChange('choosePlan', e.target.value)}
                    className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 appearance-none ${isDarkMode
                      ? 'bg-gray-800 text-white border-gray-700'
                      : 'bg-white text-gray-900 border-gray-300'
                      } ${errors.choosePlan ? 'border-red-500' : ''}`}
                  >
                    <option value="">Select Plan</option>
                    {formData.choosePlan && !plans.some(plan => {
                      const planWithPrice = plan.price ? `${plan.name} - P${plan.price}` : plan.name;
                      return planWithPrice === formData.choosePlan || plan.name === formData.choosePlan;
                    }) && (
                        <option value={formData.choosePlan}>{formData.choosePlan}</option>
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
                  <ChevronDown className={`absolute right-3 top-2.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`} size={20} />
                </div>
                {errors.choosePlan && <p className="text-red-500 text-xs mt-1">{errors.choosePlan}</p>}
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                  Promo
                </label>
                <div className="relative">
                  <select
                    value={formData.promo}
                    onChange={(e) => handleInputChange('promo', e.target.value)}
                    className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 appearance-none ${isDarkMode
                      ? 'bg-gray-800 text-white border-gray-700'
                      : 'bg-white text-gray-900 border-gray-300'
                      }`}
                  >
                    <option value="">Select Promo</option>
                    <option value="None">None</option>
                    {formData.promo && formData.promo !== 'None' && !promos.some(p => p.promo_name === formData.promo) && (
                      <option value={formData.promo}>{formData.promo}</option>
                    )}
                    {promos.map((promo) => (
                      <option key={promo.id} value={promo.promo_name}>
                        {promo.promo_name}{promo.description ? ` - ${promo.description}` : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className={`absolute right-3 top-2.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`} size={20} />
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>Remarks</label>
                <textarea
                  value={formData.remarks}
                  onChange={(e) => handleInputChange('remarks', e.target.value)}
                  rows={3}
                  className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 resize-none ${isDarkMode
                    ? 'bg-gray-800 text-white border-gray-700'
                    : 'bg-white text-gray-900 border-gray-300'
                    }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                  Installation Fee<span className="text-red-500">*</span>
                </label>
                <div className={`flex items-center border rounded ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
                  }`}>
                  <span className={`px-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>₱</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.installationFee === 0 ? '' : formData.installationFee}
                    onChange={(e) => handleInstallationFeeChange(e.target.value)}
                    className={`flex-1 px-3 py-2 bg-transparent focus:outline-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield] ${isDarkMode ? 'text-white' : 'text-gray-900'
                      } ${errors.installationFee ? 'border-red-500' : ''}`}
                    placeholder="0.00"
                  />
                </div>
                {errors.installationFee && <p className="text-red-500 text-xs mt-1">{errors.installationFee}</p>}
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                  Contract Template<span className="text-red-500">*</span>
                </label>
                <div className={`flex items-center border rounded ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
                  } ${errors.contractTemplate ? 'border-red-500' : ''}`}>
                  <input
                    type="number"
                    value={formData.contractTemplate}
                    onChange={(e) => handleInputChange('contractTemplate', e.target.value)}
                    className={`flex-1 px-3 py-2 bg-transparent focus:outline-none ${isDarkMode ? 'text-white' : 'text-gray-900'
                      }`}
                  />
                  <div className="flex">
                    <button
                      type="button"
                      onClick={() => handleNumberChange('contractTemplate', false)}
                      className={`px-3 py-2 border-l transition-colors ${isDarkMode
                        ? 'text-gray-400 hover:text-white border-gray-700'
                        : 'text-gray-600 hover:text-gray-900 border-gray-300'
                        }`}
                    >
                      <Minus size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNumberChange('contractTemplate', true)}
                      className={`px-3 py-2 border-l transition-colors ${isDarkMode
                        ? 'text-gray-400 hover:text-white border-gray-700'
                        : 'text-gray-600 hover:text-gray-900 border-gray-300'
                        }`}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
                {errors.contractTemplate && <p className="text-red-500 text-xs mt-1">{errors.contractTemplate}</p>}
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                  Billing Day<span className="text-red-500">*</span>
                </label>
                <div className={`flex items-center border rounded ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
                  }`}>
                  <input
                    type="number"
                    min="1"
                    max="28"
                    value={formData.billingDay}
                    onChange={(e) => handleInputChange('billingDay', e.target.value)}
                    disabled={formData.isLastDayOfMonth}
                    className={`flex-1 px-3 py-2 bg-transparent focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${isDarkMode ? 'text-white' : 'text-gray-900'
                      } ${errors.billingDay ? 'border-red-500' : ''}`}
                  />
                  <div className="flex">
                    <button
                      type="button"
                      onClick={() => handleNumberChange('billingDay', false)}
                      disabled={formData.isLastDayOfMonth}
                      className={`px-3 py-2 border-l transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isDarkMode
                        ? 'text-gray-400 hover:text-white border-gray-700'
                        : 'text-gray-600 hover:text-gray-900 border-gray-300'
                        }`}
                    >
                      <Minus size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNumberChange('billingDay', true)}
                      disabled={formData.isLastDayOfMonth}
                      className={`px-3 py-2 border-l transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isDarkMode
                        ? 'text-gray-400 hover:text-white border-gray-700'
                        : 'text-gray-600 hover:text-gray-900 border-gray-300'
                        }`}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                <div className="mt-2 flex items-center">
                  <input
                    type="checkbox"
                    id="isLastDayOfMonth"
                    checked={formData.isLastDayOfMonth}
                    onChange={(e) => handleInputChange('isLastDayOfMonth', e.target.checked)}
                    className={`w-4 h-4 rounded text-orange-600 focus:ring-orange-500 focus:ring-2 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
                      }`}
                  />
                  <label htmlFor="isLastDayOfMonth" className={`ml-2 text-sm cursor-pointer ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                    Always use last day of the month
                  </label>
                </div>

                {parseInt(formData.billingDay) > 30 && !formData.isLastDayOfMonth && (
                  <p className="text-orange-500 text-xs mt-1 flex items-center">
                    <span className="mr-1">⚠</span>
                    Billing Day must be between 1 and 30
                  </p>
                )}
                {errors.billingDay && <p className="text-red-500 text-xs mt-1">{errors.billingDay}</p>}
              </div>
            </div>

            <div className="space-y-4">
              {formData.status === 'Confirmed' && (
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                    Onsite Status<span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={formData.onsiteStatus}
                      onChange={(e) => handleInputChange('onsiteStatus', e.target.value)}
                      className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 appearance-none ${isDarkMode
                        ? 'bg-gray-800 text-white border-gray-700'
                        : 'bg-white text-gray-900 border-gray-300'
                        } ${errors.onsiteStatus ? 'border-red-500' : ''}`}
                    >
                      <option value="In Progress">In Progress</option>
                      <option value="Done">Done</option>
                      <option value="Failed">Failed</option>
                      <option value="Reschedule">Reschedule</option>
                    </select>
                    <ChevronDown className={`absolute right-3 top-2.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`} size={20} />
                  </div>
                  {errors.onsiteStatus && <p className="text-red-500 text-xs mt-1">{errors.onsiteStatus}</p>}
                </div>
              )}

              {formData.status === 'Confirmed' && formData.onsiteStatus !== 'Failed' && (
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                    Assigned Email<span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={formData.assignedEmail}
                      onChange={(e) => handleInputChange('assignedEmail', e.target.value)}
                      className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 appearance-none ${isDarkMode
                        ? 'bg-gray-800 text-white border-gray-700'
                        : 'bg-white text-gray-900 border-gray-300'
                        } ${errors.assignedEmail ? 'border-red-500' : ''}`}
                    >
                      <option value="">Select Assigned Email</option>
                      {formData.assignedEmail && !technicians.some(t => t.email === formData.assignedEmail) && (
                        <option value={formData.assignedEmail}>{formData.assignedEmail}</option>
                      )}
                      {technicians.map((technician, index) => (
                        <option key={index} value={technician.email}>
                          {technician.email}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className={`absolute right-3 top-2.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`} size={20} />
                  </div>
                  {errors.assignedEmail && <p className="text-red-500 text-xs mt-1">{errors.assignedEmail}</p>}
                </div>
              )}

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                  Modified By<span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.modifiedBy}
                  readOnly
                  className={`w-full px-3 py-2 border rounded cursor-not-allowed ${isDarkMode
                    ? 'bg-gray-700 border-gray-700 text-gray-400'
                    : 'bg-gray-100 border-gray-300 text-gray-600'
                    }`}
                  title="Auto-populated with logged-in user"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                  Modified Date<span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="datetime-local"
                    value={formData.modifiedDate}
                    readOnly
                    className={`w-full px-3 py-2 border rounded cursor-not-allowed ${isDarkMode
                      ? 'bg-gray-700 border-gray-700 text-gray-400'
                      : 'bg-gray-100 border-gray-300 text-gray-600'
                      }`}
                    title="Auto-populated with current timestamp"
                  />
                  <Calendar className={`absolute right-3 top-2.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`} size={20} />
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>Installation Landmark</label>
                <input
                  type="text"
                  value={formData.installationLandmark}
                  onChange={(e) => handleInputChange('installationLandmark', e.target.value)}
                  className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 ${isDarkMode
                    ? 'bg-gray-800 text-white border-gray-700'
                    : 'bg-white text-gray-900 border-gray-300'
                    }`}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {modal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60]">
          <div className={`border rounded-lg p-8 max-w-md w-full mx-4 ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
            }`}>
            {modal.type === 'loading' ? (
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-4" style={{ borderColor: colorPalette?.primary || '#ea580c' }}></div>
                </div>
                <h3 className={`text-xl font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>{modal.title}</h3>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>{modal.message}</p>
              </div>
            ) : (
              <>
                <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>{modal.title}</h3>
                <p className={`mb-6 whitespace-pre-line ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>{modal.message}</p>
                <div className="flex items-center justify-end gap-3">
                  {modal.type === 'confirm' ? (
                    <>
                      <button
                        onClick={modal.onCancel}
                        className={`px-4 py-2 rounded transition-colors ${isDarkMode
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
    </>
  );
};

export default JOAssignFormModal;
