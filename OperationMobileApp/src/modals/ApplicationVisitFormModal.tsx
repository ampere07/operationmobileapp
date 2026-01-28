import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { X, ChevronDown, Loader2 } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createApplicationVisit, ApplicationVisitData } from '../services/applicationVisitService';
import { updateApplication } from '../services/applicationService';
import { UserData } from '../types/api';
import { userService } from '../services/userService';
import { getRegions, getCities, City } from '../services/cityService';
import { barangayService, Barangay } from '../services/barangayService';
import { locationDetailService, LocationDetail } from '../services/locationDetailService';
import { planService, Plan } from '../services/planService';
import apiClient from '../config/api';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';

interface ApplicationVisitFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (formData: ApplicationVisitData) => void;
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

interface VisitFormData {
  firstName: string;
  middleInitial: string;
  lastName: string;
  contactNumber: string;
  secondContactNumber: string;
  email: string;
  address: string;
  barangay: string;
  city: string;
  region: string;
  location: string;
  choosePlan: string;
  promo: string;
  remarks: string;
  assignedEmail: string;
  visit_by: string;
  visit_with: string;
  visit_with_other: string;
  visitType: string;
  visitNotes: string;
  status: string;
  createdBy: string;
  modifiedBy: string;
}

const ApplicationVisitFormModal: React.FC<ApplicationVisitFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  applicationData
}) => {
  const getCurrentUser = async (): Promise<UserData | null> => {
    try {
      const authData = await AsyncStorage.getItem('authData');
      if (authData) {
        return JSON.parse(authData);
      }
    } catch (error) {
      console.error('Error getting current user:', error);
    }
    return null;
  };

  const [currentUserEmail, setCurrentUserEmail] = useState('unknown@ampere.com');

  useEffect(() => {
    const loadUser = async () => {
      const user = await getCurrentUser();
      setCurrentUserEmail(user?.email || 'unknown@ampere.com');
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (isOpen && applicationData) {
      setFormData(prev => ({
        ...prev,
        firstName: applicationData.first_name || prev.firstName,
        middleInitial: applicationData.middle_initial || prev.middleInitial,
        lastName: applicationData.last_name || prev.lastName,
        contactNumber: applicationData.mobile_number || prev.contactNumber,
        secondContactNumber: applicationData.secondary_mobile_number || prev.secondContactNumber,
        email: applicationData.email_address || prev.email,
        address: applicationData.installation_address || prev.address,
        barangay: applicationData.barangay || prev.barangay,
        city: applicationData.city || prev.city,
        region: applicationData.region || prev.region,
        location: applicationData.location || prev.location,
        choosePlan: applicationData.desired_plan || prev.choosePlan,
        promo: applicationData.promo || prev.promo
      }));
    }
  }, [isOpen, applicationData]);
  

  const [formData, setFormData] = useState<VisitFormData>(() => {
    const initialSecondContact = applicationData?.secondary_mobile_number || '';
    
    return {
      firstName: applicationData?.first_name || '',
      middleInitial: applicationData?.middle_initial || '',
      lastName: applicationData?.last_name || '',
      contactNumber: applicationData?.mobile_number || '',
      secondContactNumber: initialSecondContact,
      email: applicationData?.email_address || '',
      address: applicationData?.installation_address || '',
      barangay: applicationData?.barangay || '',
      city: applicationData?.city || '',
      region: applicationData?.region || '',
      location: applicationData?.location || '',
      choosePlan: applicationData?.desired_plan || 'SwitchConnect - P799',
      promo: applicationData?.promo || '',
      remarks: '',
      assignedEmail: '',
      visit_by: '',
      visit_with: 'None',
      visit_with_other: '',
      visitType: 'Initial Visit',
      visitNotes: '',
      status: 'Scheduled',
      createdBy: currentUserEmail,
      modifiedBy: currentUserEmail
    };
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadingPercentage, setLoadingPercentage] = useState(0);
  const [technicians, setTechnicians] = useState<Array<{ email: string; name: string }>>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);

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
  
  const [modal, setModal] = useState<ModalConfig>({
    isOpen: false,
    type: 'success',
    title: '',
    message: ''
  });
  
  interface Region {
    id: number;
    name: string;
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

  const [regions, setRegions] = useState<Region[]>([]);
  const [allCities, setAllCities] = useState<City[]>([]);
  const [allBarangays, setAllBarangays] = useState<Barangay[]>([]);
  const [allLocations, setAllLocations] = useState<LocationDetail[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [promos, setPromos] = useState<Promo[]>([]);

  useEffect(() => {
    const fetchPlans = async () => {
      if (isOpen) {
        try {
          const response = await planService.getAllPlans();
          
          if (Array.isArray(response)) {
            setPlans(response);
          } else {
            setPlans([]);
          }
        } catch (error) {
          console.error('Error fetching Plans:', error);
          setPlans([]);
        }
      }
    };
    
    fetchPlans();
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
          console.error('Error loading promos:', error);
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
          console.error('Error fetching Regions:', error);
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
          console.error('Error fetching Cities:', error);
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
          console.error('Error fetching Barangays:', error);
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
          console.error('Error fetching Locations:', error);
          setAllLocations([]);
        }
      }
    };
    
    fetchAllLocations();
  }, [isOpen]);

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
              .filter((tech: any) => tech.name);
            setTechnicians(technicianList);
          }
        } catch (error) {
          console.error('Error fetching technicians:', error);
        }
      }
    };
    
    fetchTechnicians();
  }, [isOpen]);



  const handleInputChange = (field: keyof VisitFormData, value: string) => {
    setFormData(prev => {
      const newFormData = { ...prev, [field]: value };
      
      if (field === 'assignedEmail') {
        newFormData.visit_by = value;
      }
      
      if (field === 'region') {
        newFormData.city = '';
        newFormData.barangay = '';
        newFormData.location = '';
      } else if (field === 'city') {
        newFormData.barangay = '';
        newFormData.location = '';
      } else if (field === 'barangay') {
        newFormData.location = '';
      }
      
      return newFormData;
    });
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
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

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.assignedEmail.trim()) {
      newErrors.assignedEmail = 'Assigned Email is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const mapFormDataToVisitData = (applicationId: string): ApplicationVisitData => {
    const appId = parseInt(applicationId);
    
    if (isNaN(appId) || appId <= 0) {
      throw new Error(`Invalid application ID: ${applicationId}`);
    }
    
    return {
      application_id: appId,
      assigned_email: formData.assignedEmail,
      visit_by: formData.assignedEmail,
      visit_with: formData.visit_with !== 'Other' && formData.visit_with !== 'None' ? formData.visit_with : (formData.visit_with === 'Other' ? formData.visit_with_other : null),
      visit_status: formData.status,
      visit_remarks: formData.remarks || formData.visitNotes || null,
      application_status: 'Scheduled',
      region: formData.region,
      city: formData.city,
      barangay: formData.barangay,
      location: formData.location,
      choose_plan: formData.choosePlan,
      promo: formData.promo || null,
      house_front_picture_url: applicationData?.house_front_picture_url || null,
      created_by_user_email: currentUserEmail,
      updated_by_user_email: currentUserEmail
    };
  };

  const handleSave = async () => {
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
      console.error('No application ID available');
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Missing application ID. Cannot save visit.'
      });
      return;
    }

    setLoading(true);
    setLoadingPercentage(0);
    setModal({
      isOpen: true,
      type: 'loading',
      title: 'Submitting',
      message: 'Please wait while we process your request...'
    });
    
    const progressInterval = setInterval(() => {
      setLoadingPercentage(prev => {
        if (prev >= 99) return 99;
        if (prev >= 90) return prev + 0.5;
        if (prev >= 70) return prev + 1;
        return prev + 3;
      });
    }, 200);
    
    try {
      const applicationId = applicationData.id;
      
      const applicationUpdateData: any = {
        first_name: formData.firstName,
        middle_initial: formData.middleInitial || null,
        last_name: formData.lastName,
        mobile_number: formData.contactNumber,
        secondary_mobile_number: formData.secondContactNumber || null,
        email_address: formData.email,
        installation_address: formData.address,
        region: formData.region,
        city: formData.city,
        barangay: formData.barangay,
        location: formData.location,
        desired_plan: formData.choosePlan,
        promo: formData.promo || null
      };
      
      try {
        await updateApplication(applicationId.toString(), applicationUpdateData);
      } catch (appError: any) {
        console.error('Error updating application:', appError);
        
        clearInterval(progressInterval);
        const errorMsg = appError.response?.data?.message || appError.message || 'Unknown error';
        setModal({
          isOpen: true,
          type: 'error',
          title: 'Error',
          message: `Failed to update application data!\n\nError: ${errorMsg}\n\nPlease try again.`
        });
        setLoading(false);
        return;
      }
      
      const visitData = mapFormDataToVisitData(applicationId);
      
      const result = await createApplicationVisit(visitData);
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to create application visit');
      }
      
      clearInterval(progressInterval);
      setLoadingPercentage(100);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setModal({
        isOpen: true,
        type: 'success',
        title: 'Success',
        message: 'Visit created successfully!\n\nApplication data has been updated with the new location and plan information.',
        onConfirm: () => {
          setErrors({});
          onSave(visitData);
          onClose();
          setModal({ ...modal, isOpen: false });
        }
      });
    } catch (error: any) {
      console.error('Error creating application visit:', error);
      
      clearInterval(progressInterval);
      let errorMessage = 'Unknown error occurred';
      let errorDetails = '';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error.response?.data) {
        const responseData = error.response.data;
        errorMessage = responseData.message || 'Server error occurred';
        
        if (responseData.errors) {
          errorDetails = Object.entries(responseData.errors)
            .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
            .join('\n');
        } else if (responseData.error) {
          errorDetails = responseData.error;
        }
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      const fullErrorMessage = errorDetails 
        ? `${errorMessage}\n\nDetails:\n${errorDetails}` 
        : errorMessage;
      
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Failed to Schedule Visit',
        message: fullErrorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', zIndex: 50 }}>
      <View style={{ height: '100%', width: '100%', maxWidth: 672, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 10, backgroundColor: isDarkMode ? '#111827' : '#ffffff' }}>
        <View style={{ paddingHorizontal: 24, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6', borderBottomColor: isDarkMode ? '#374151' : '#d1d5db' }}>
          <Text style={{ fontSize: 20, fontWeight: '600', color: isDarkMode ? '#ffffff' : '#111827' }}>Application Form Visit</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Pressable
              onPress={handleCancel}
              style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 4, backgroundColor: isDarkMode ? '#374151' : '#e5e7eb' }}
            >
              <Text style={{ fontSize: 14, color: isDarkMode ? '#ffffff' : '#111827' }}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              disabled={loading}
              style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 4, opacity: loading ? 0.5 : 1, backgroundColor: colorPalette?.primary || '#ea580c', flexDirection: 'row', alignItems: 'center' }}
            >
              {loading ? (
                <>
                  <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 8 }} />
                  <Text style={{ color: '#ffffff', fontSize: 14 }}>Saving...</Text>
                </>
              ) : (
                <Text style={{ color: '#ffffff', fontSize: 14 }}>Save</Text>
              )}
            </Pressable>
            <Pressable onPress={onClose}>
              <X size={24} color={isDarkMode ? '#9ca3af' : '#4b5563'} />
            </Pressable>
          </View>
        </View>

        <ScrollView style={{ flex: 1, padding: 24 }} contentContainerStyle={{ gap: 24 }}>
          <View style={{ gap: 16 }}>
            <View>
              <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                First Name<Text style={{ color: '#ef4444' }}>*</Text>
              </Text>
              <TextInput
                value={formData.firstName}
                onChangeText={(text) => handleInputChange('firstName', text)}
                style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderRadius: 4, borderColor: errors.firstName ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db'), backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', color: isDarkMode ? '#ffffff' : '#111827' }}
              />
              {errors.firstName && <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{errors.firstName}</Text>}
            </View>

            <View>
              <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                Middle Initial
              </Text>
              <TextInput
                value={formData.middleInitial}
                onChangeText={(text) => handleInputChange('middleInitial', text)}
                maxLength={1}
                style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderRadius: 4, backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', borderColor: isDarkMode ? '#374151' : '#d1d5db', color: isDarkMode ? '#ffffff' : '#111827' }}
              />
            </View>

            <View>
              <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                Last Name<Text style={{ color: '#ef4444' }}>*</Text>
              </Text>
              <TextInput
                value={formData.lastName}
                onChangeText={(text) => handleInputChange('lastName', text)}
                style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderRadius: 4, borderColor: errors.lastName ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db'), backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', color: isDarkMode ? '#ffffff' : '#111827' }}
              />
              {errors.lastName && <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{errors.lastName}</Text>}
            </View>

            <View>
              <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                Contact Number<Text style={{ color: '#ef4444' }}>*</Text>
              </Text>
              <TextInput
                value={formData.contactNumber}
                onChangeText={(text) => handleInputChange('contactNumber', text)}
                style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderRadius: 4, borderColor: errors.contactNumber ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db'), backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', color: isDarkMode ? '#ffffff' : '#111827' }}
              />
              {errors.contactNumber && <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{errors.contactNumber}</Text>}
            </View>

            <View>
              <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                Second Contact Number
              </Text>
              <TextInput
                value={formData.secondContactNumber || ''}
                onChangeText={(text) => handleInputChange('secondContactNumber', text)}
                style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderRadius: 4, backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', borderColor: isDarkMode ? '#374151' : '#d1d5db', color: isDarkMode ? '#ffffff' : '#111827' }}
              />
            </View>

            <View>
              <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                Applicant Email Address<Text style={{ color: '#ef4444' }}>*</Text>
              </Text>
              <TextInput
                value={formData.email}
                onChangeText={(text) => handleInputChange('email', text)}
                keyboardType="email-address"
                style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderRadius: 4, borderColor: errors.email ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db'), backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', color: isDarkMode ? '#ffffff' : '#111827' }}
              />
              {errors.email && <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{errors.email}</Text>}
            </View>

            <View>
              <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                Address<Text style={{ color: '#ef4444' }}>*</Text>
              </Text>
              <TextInput
                value={formData.address}
                onChangeText={(text) => handleInputChange('address', text)}
                style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderRadius: 4, borderColor: errors.address ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db'), backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', color: isDarkMode ? '#ffffff' : '#111827' }}
              />
              {errors.address && <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{errors.address}</Text>}
            </View>

            <View>
              <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                Region<Text style={{ color: '#ef4444' }}>*</Text>
              </Text>
              <View style={{ position: 'relative' }}>
                <TextInput
                  value={formData.region}
                  editable={false}
                  style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderRadius: 4, borderColor: errors.region ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db'), backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', color: isDarkMode ? '#ffffff' : '#111827' }}
                />
                <View style={{ position: 'absolute', right: 12, top: 10 }}>
                  <ChevronDown size={20} color={isDarkMode ? '#9ca3af' : '#4b5563'} />
                </View>
              </View>
              {errors.region && <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{errors.region}</Text>}
            </View>

            <View>
              <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                City<Text style={{ color: '#ef4444' }}>*</Text>
              </Text>
              <View style={{ position: 'relative' }}>
                <TextInput
                  value={formData.city}
                  editable={false}
                  style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderRadius: 4, opacity: !formData.region ? 0.5 : 1, borderColor: errors.city ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db'), backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', color: isDarkMode ? '#ffffff' : '#111827' }}
                />
                <View style={{ position: 'absolute', right: 12, top: 10 }}>
                  <ChevronDown size={20} color="#9ca3af" />
                </View>
              </View>
              {errors.city && <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{errors.city}</Text>}
            </View>

            <View>
              <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                Barangay<Text style={{ color: '#ef4444' }}>*</Text>
              </Text>
              <View style={{ position: 'relative' }}>
                <TextInput
                  value={formData.barangay}
                  editable={false}
                  style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderRadius: 4, opacity: !formData.city ? 0.5 : 1, borderColor: errors.barangay ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db'), backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', color: isDarkMode ? '#ffffff' : '#111827' }}
                />
                <View style={{ position: 'absolute', right: 12, top: 10 }}>
                  <ChevronDown size={20} color="#9ca3af" />
                </View>
              </View>
              {errors.barangay && <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{errors.barangay}</Text>}
            </View>

            <View>
              <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                Location<Text style={{ color: '#ef4444' }}>*</Text>
              </Text>
              <View style={{ position: 'relative' }}>
                <TextInput
                  value={formData.location}
                  editable={false}
                  style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderRadius: 4, opacity: !formData.barangay ? 0.5 : 1, borderColor: errors.location ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db'), backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', color: isDarkMode ? '#ffffff' : '#111827' }}
                />
                <View style={{ position: 'absolute', right: 12, top: 10 }}>
                  <ChevronDown size={20} color="#9ca3af" />
                </View>
              </View>
              {errors.location && <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{errors.location}</Text>}
            </View>

            <View>
              <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                Choose Plan<Text style={{ color: '#ef4444' }}>*</Text>
              </Text>
              <View style={{ position: 'relative' }}>
                <TextInput
                  value={formData.choosePlan}
                  editable={false}
                  style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderRadius: 4, borderColor: errors.choosePlan ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db'), backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', color: isDarkMode ? '#ffffff' : '#111827' }}
                />
                <View style={{ position: 'absolute', right: 12, top: 10 }}>
                  <ChevronDown size={20} color="#9ca3af" />
                </View>
              </View>
              {errors.choosePlan && <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{errors.choosePlan}</Text>}
            </View>

            <View>
              <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                Promo
              </Text>
              <View style={{ position: 'relative' }}>
                <TextInput
                  value={formData.promo}
                  editable={false}
                  style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderRadius: 4, backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', borderColor: isDarkMode ? '#374151' : '#d1d5db', color: isDarkMode ? '#ffffff' : '#111827' }}
                />
                <View style={{ position: 'absolute', right: 12, top: 10 }}>
                  <ChevronDown size={20} color="#9ca3af" />
                </View>
              </View>
            </View>

            <View>
              <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                Remarks
              </Text>
              <TextInput
                value={formData.remarks}
                onChangeText={(text) => handleInputChange('remarks', text)}
                multiline
                numberOfLines={3}
                style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderRadius: 4, backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', borderColor: isDarkMode ? '#374151' : '#d1d5db', color: isDarkMode ? '#ffffff' : '#111827', textAlignVertical: 'top' }}
              />
            </View>

            <View>
              <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                Assigned Email<Text style={{ color: '#ef4444' }}>*</Text>
              </Text>
              <View style={{ position: 'relative' }}>
                <TextInput
                  value={formData.assignedEmail}
                  editable={false}
                  style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderRadius: 4, borderColor: errors.assignedEmail ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db'), backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', color: isDarkMode ? '#ffffff' : '#111827' }}
                />
                <View style={{ position: 'absolute', right: 12, top: 10 }}>
                  <ChevronDown size={20} color="#9ca3af" />
                </View>
              </View>
              {errors.assignedEmail && <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{errors.assignedEmail}</Text>}
            </View>
          </View>
        </ScrollView>
      </View>

      {modal.isOpen && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
          <View style={{ borderWidth: 1, borderRadius: 8, padding: 32, maxWidth: 448, width: '100%', marginHorizontal: 16, backgroundColor: isDarkMode ? '#111827' : '#ffffff', borderColor: isDarkMode ? '#374151' : '#d1d5db' }}>
            {modal.type === 'loading' ? (
              <View style={{ alignItems: 'center' }}>
                <View style={{ marginBottom: 24 }}>
                  <ActivityIndicator size="large" color="#ea580c" />
                </View>
                <Text style={{ color: '#ffffff', fontSize: 36, fontWeight: 'bold' }}>{loadingPercentage}%</Text>
              </View>
            ) : (
              <>
                <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 16, color: isDarkMode ? '#ffffff' : '#111827' }}>{modal.title}</Text>
                <Text style={{ marginBottom: 24, color: isDarkMode ? '#d1d5db' : '#374151' }}>{modal.message}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
                  {modal.type === 'confirm' ? (
                    <>
                      <Pressable
                        onPress={modal.onCancel}
                        style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 4, backgroundColor: isDarkMode ? '#374151' : '#e5e7eb' }}
                      >
                        <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>Cancel</Text>
                      </Pressable>
                      <Pressable
                        onPress={modal.onConfirm}
                        style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 4, backgroundColor: colorPalette?.primary || '#ea580c' }}
                      >
                        <Text style={{ color: '#ffffff' }}>Confirm</Text>
                      </Pressable>
                    </>
                  ) : (
                    <Pressable
                      onPress={() => {
                        if (modal.onConfirm) {
                          modal.onConfirm();
                        } else {
                          setModal({ ...modal, isOpen: false });
                        }
                      }}
                      style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 4, backgroundColor: colorPalette?.primary || '#ea580c' }}
                    >
                      <Text style={{ color: '#ffffff' }}>OK</Text>
                    </Pressable>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

export default ApplicationVisitFormModal;
