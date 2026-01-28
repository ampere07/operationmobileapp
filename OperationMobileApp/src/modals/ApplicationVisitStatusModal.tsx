import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Image, Alert, ActivityIndicator } from 'react-native';
import { X, ChevronDown, Camera, Loader2 } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateApplicationVisit, uploadApplicationVisitImages } from '../services/applicationVisitService';
import { updateApplication } from '../services/applicationService';
import { getRegions, getCities, City } from '../services/cityService';
import { barangayService, Barangay } from '../services/barangayService';
import { locationDetailService, LocationDetail } from '../services/locationDetailService';
import { statusRemarksService, StatusRemark } from '../services/statusRemarksService';
import { userService } from '../services/userService';
import { planService, Plan } from '../services/planService';
import { getActiveImageSize, resizeImage, ImageSizeSetting } from '../services/imageSettingsService';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';

interface Region {
  id: number;
  name: string;
}

interface ApplicationVisitStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedVisit: any) => void;
  visitData: {
    id: string;
    first_name: string;
    middle_initial?: string;
    last_name: string;
    visit_status?: string;
    visit_remarks?: string;
    status_remarks?: string;
    visit_notes?: string;
    assigned_email?: string;
    visit_by?: string;
    visit_with?: string;
    visit_with_other?: string;
    application_status?: string;
    [key: string]: any;
  };
}

interface ModalConfig {
  isOpen: boolean;
  type: 'success' | 'error' | 'warning' | 'confirm' | 'loading';
  title: string;
  message: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface StatusFormData {
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
  remarks: string;
  assignedEmail: string;
  modifiedBy: string;
}

interface TechnicianFormData {
  fullAddress: string;
  image1: File | null;
  image2: File | null;
  image3: File | null;
  visit_by: string;
  visit_with: string;
  visit_with_other: string;
  visitStatus: string;
  visitRemarks: string;
  statusRemarks: string;
}

const ApplicationVisitStatusModal: React.FC<ApplicationVisitStatusModalProps> = ({
  isOpen,
  onClose,
  onSave,
  visitData
}) => {
  const [userRole, setUserRole] = useState<string>('');
  const [pendingUpdate, setPendingUpdate] = useState<any>(null);
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
  
  const [modal, setModal] = useState<ModalConfig>({
    isOpen: false,
    type: 'success',
    title: '',
    message: ''
  });
  
  useEffect(() => {
    if (!isOpen) return;

    if (visitData) {
      const isValidImageUrl = (url: any): boolean => {
        if (!url) return false;
        if (typeof url !== 'string') return false;
        const trimmed = url.trim().toLowerCase();
        return trimmed !== '' && trimmed !== 'null' && trimmed !== 'undefined';
      };

      const newImagePreviews = {
        image1: convertGoogleDriveUrl(visitData?.image1_url || visitData?.image_1_url),
        image2: convertGoogleDriveUrl(visitData?.image2_url || visitData?.image_2_url),
        image3: convertGoogleDriveUrl(visitData?.image3_url || visitData?.image_3_url)
      };

      setImagePreviews(newImagePreviews);

      const errorsToClear: string[] = [];
      if (newImagePreviews.image1) errorsToClear.push('image1');
      if (newImagePreviews.image2) errorsToClear.push('image2');
      if (newImagePreviews.image3) errorsToClear.push('image3');

      if (errorsToClear.length > 0) {
        setErrors(prev => {
          const newErrors = { ...prev };
          errorsToClear.forEach(key => delete newErrors[key]);
          return newErrors;
        });
      }
    } else {
      setImagePreviews({
        image1: null,
        image2: null,
        image3: null
      });
    }
  }, [visitData, isOpen]);

  useEffect(() => {
    const loadAuthData = async () => {
      const authData = await AsyncStorage.getItem('authData');
      if (authData) {
        try {
          const user = JSON.parse(authData);
          setUserRole(user.role?.toLowerCase() || '');
        } catch (error) {
          // Error parsing user data
        }
      }
    };
    loadAuthData();
  }, []);

  const [formData, setFormData] = useState<StatusFormData>(() => {
    return {
      firstName: visitData?.first_name || '',
      middleInitial: visitData?.middle_initial || '',
      lastName: visitData?.last_name || '',
      contactNumber: visitData?.contact_number || '',
      secondContactNumber: visitData?.second_contact_number || '',
      email: visitData?.email_address || '',
      address: visitData?.address || '',
      barangay: visitData?.barangay || '',
      city: visitData?.city || '',
      region: visitData?.region || '',
      location: visitData?.location || '',
      choosePlan: visitData?.choose_plan || 'SwitchConnect - P799',
      remarks: visitData?.visit_remarks || '',
      assignedEmail: visitData?.assigned_email || '',
      modifiedBy: 'current_user@ampere.com'
    };
  });

  const [technicianFormData, setTechnicianFormData] = useState<TechnicianFormData>({
    fullAddress: visitData?.address || '',
    image1: null,
    image2: null,
    image3: null,
    visit_by: visitData?.visit_by || '',
    visit_with: visitData?.visit_with || '',
    visit_with_other: visitData?.visit_with_other || 'None',
    visitStatus: visitData?.visit_status || '',
    visitRemarks: visitData?.visit_remarks || '',
    statusRemarks: visitData?.status_remarks || ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadingPercentage, setLoadingPercentage] = useState(0);
  const [statusRemarks, setStatusRemarks] = useState<StatusRemark[]>([]);
  const [technicians, setTechnicians] = useState<Array<{ email: string; name: string }>>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [imagePreviews, setImagePreviews] = useState<{
    image1: string | null;
    image2: string | null;
    image3: string | null;
  }>({
    image1: null,
    image2: null,
    image3: null
  });
  const [activeImageSize, setActiveImageSize] = useState<ImageSizeSetting | null>(null);

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
  
  const [regions, setRegions] = useState<Region[]>([]);
  const [allCities, setAllCities] = useState<City[]>([]);
  const [allBarangays, setAllBarangays] = useState<Barangay[]>([]);
  const [allLocations, setAllLocations] = useState<LocationDetail[]>([]);

  useEffect(() => {
    if (visitData) {
      setFormData(prev => ({
        ...prev,
        firstName: visitData.first_name || prev.firstName,
        middleInitial: visitData.middle_initial || prev.middleInitial,
        lastName: visitData.last_name || prev.lastName,
        contactNumber: visitData.contact_number || prev.contactNumber,
        secondContactNumber: visitData.second_contact_number || prev.secondContactNumber,
        email: visitData.email_address || prev.email,
        address: visitData.address || prev.address,
        barangay: visitData.barangay || prev.barangay,
        city: visitData.city || prev.city,
        region: visitData.region || prev.region,
        location: visitData.location || prev.location,
        choosePlan: visitData.choose_plan || prev.choosePlan,
        remarks: visitData.visit_remarks || prev.remarks,
        assignedEmail: visitData.assigned_email || prev.assignedEmail
      }));

      setTechnicianFormData(prev => ({
        ...prev,
        fullAddress: visitData.address || prev.fullAddress,
        image1: null,
        image2: null,
        image3: null,
        visit_by: visitData.visit_by || prev.visit_by,
        visit_with: visitData.visit_with || prev.visit_with,
        visit_with_other: visitData.visit_with_other || 'None',
        visitStatus: visitData.visit_status || prev.visitStatus,
        visitRemarks: visitData.visit_remarks || prev.visitRemarks,
        statusRemarks: visitData.status_remarks || prev.statusRemarks
      }));
    }
  }, [visitData]);

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
    const fetchStatusRemarks = async () => {
      if (isOpen) {
        try {
          const fetchedStatusRemarks = await statusRemarksService.getAllStatusRemarks();
          setStatusRemarks(fetchedStatusRemarks);
        } catch (error) {
          // Error fetching status remarks
        }
      }
    };
    
    fetchStatusRemarks();
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
          // Error fetching technicians
        }
      }
    };
    
    fetchTechnicians();
  }, [isOpen, visitData]);

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
          setPlans([]);
        }
      }
    };
    
    fetchPlans();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && visitData) {
      setFormData({
        firstName: visitData.first_name || '',
        middleInitial: visitData.middle_initial || '',
        lastName: visitData.last_name || '',
        contactNumber: visitData.contact_number || '',
        secondContactNumber: visitData.second_contact_number || '',
        email: visitData.email_address || '',
        address: visitData.address || '',
        barangay: visitData.barangay || '',
        city: visitData.city || '',
        region: visitData.region || '',
        location: visitData.location || '',
        choosePlan: visitData.choose_plan || 'SwitchConnect - P799',
        remarks: visitData.visit_remarks || '',
        assignedEmail: visitData.assigned_email || '',
        modifiedBy: 'current_user@ampere.com'
      });

      setTechnicianFormData({
        fullAddress: visitData.address || '',
        image1: null,
        image2: null,
        image3: null,
        visit_by: visitData.visit_by || '',
        visit_with: visitData.visit_with || '',
        visit_with_other: visitData.visit_with_other || 'None',
        visitStatus: visitData.visit_status || '',
        visitRemarks: visitData.visit_remarks || '',
        statusRemarks: visitData.status_remarks || ''
      });
    }
  }, [isOpen, visitData]);

  const handleInputChange = (field: keyof StatusFormData, value: string) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      if (field === 'region') {
        newData.city = '';
        newData.barangay = '';
        newData.location = '';
      }
      if (field === 'city') {
        newData.barangay = '';
        newData.location = '';
      }
      if (field === 'barangay') {
        newData.location = '';
      }
      return newData;
    });
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleTechnicianInputChange = (field: keyof TechnicianFormData, value: string | File | null) => {
    setTechnicianFormData(prev => ({ ...prev, [field]: value }));
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleImageChange = async (field: 'image1' | 'image2' | 'image3', file: File) => {
    try {
      let processedFile = file;
      const originalSize = (file.size / 1024 / 1024).toFixed(2);
      
      if (activeImageSize && activeImageSize.image_size_value < 100) {
        try {
          const resizedFile = await resizeImage(file, activeImageSize.image_size_value);
          const resizedSize = (resizedFile.size / 1024 / 1024).toFixed(2);
          
          if (resizedFile.size < file.size) {
            processedFile = resizedFile;
            console.log(`[RESIZE SUCCESS] ${field}: ${originalSize}MB → ${resizedSize}MB (${activeImageSize.image_size_value}%, saved ${((1 - resizedFile.size / file.size) * 100).toFixed(1)}%)`);
          } else {
            console.log(`[RESIZE SKIP] ${field}: Resized file (${resizedSize}MB) is not smaller than original (${originalSize}MB), using original`);
          }
        } catch (resizeError) {
          console.error(`[RESIZE FAILED] ${field}:`, resizeError);
          processedFile = file;
        }
      }
      
      handleTechnicianInputChange(field, processedFile);
      
      const previewUrl = URL.createObjectURL(processedFile);
      setImagePreviews(prev => ({ ...prev, [field]: previewUrl }));
      
      if (errors[field]) {
        setErrors(prev => ({ ...prev, [field]: '' }));
      }
    } catch (error) {
      console.error(`[UPLOAD ERROR] ${field}:`, error);
      handleTechnicianInputChange(field, file);
      
      const previewUrl = URL.createObjectURL(file);
      setImagePreviews(prev => ({ ...prev, [field]: previewUrl }));
      
      if (errors[field]) {
        setErrors(prev => ({ ...prev, [field]: '' }));
      }
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (userRole === 'technician') {
      if (!technicianFormData.image1) {
        newErrors.image1 = 'Image is required';
      }
      if (!technicianFormData.visit_by.trim()) {
        newErrors.visit_by = 'Visit By is required';
      }
      if (!technicianFormData.visit_with.trim()) {
        newErrors.visit_with = 'Visit With is required';
      }
      if (!technicianFormData.visit_with_other.trim()) {
        newErrors.visit_with_other = 'Visit With (Other) is required';
      }
    } else {
      if (!formData.assignedEmail.trim()) {
        newErrors.assignedEmail = 'Assigned Email is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const mapFormDataToUpdateData = () => {
    if (userRole === 'technician') {
      const data: any = {
        visit_by: technicianFormData.visit_by,
        visit_with: technicianFormData.visit_with,
        visit_with_other: technicianFormData.visit_with_other,
        visit_status: technicianFormData.visitStatus,
        visit_remarks: technicianFormData.visitRemarks ? technicianFormData.visitRemarks.trim() : null,
        updated_by_user_id: null
      };
      
      if (technicianFormData.visitStatus === 'Not Ready' && technicianFormData.statusRemarks) {
        data.status_remarks = technicianFormData.statusRemarks;
      }
      
      return data;
    } else {
      return {
        assigned_email: formData.assignedEmail,
        visit_remarks: formData.remarks ? formData.remarks.trim() : null,
        region: formData.region,
        city: formData.city,
        barangay: formData.barangay,
        location: formData.location,
        choose_plan: formData.choosePlan,
        updated_by_user_id: null
      };
    }
  };

  const mapFormDataToApplicationUpdate = () => {
    const updateData: Record<string, any> = {
      first_name: formData.firstName,
      last_name: formData.lastName,
      mobile_number: formData.contactNumber,
      email_address: formData.email,
      installation_address: formData.address,
      region: formData.region,
      city: formData.city,
      barangay: formData.barangay
    };
    
    if (formData.middleInitial) {
      updateData.middle_initial = formData.middleInitial;
    }
    
    if (formData.secondContactNumber) {
      updateData.secondary_mobile_number = formData.secondContactNumber;
    }
    
    return updateData;
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
    
    if (!visitData?.id) {
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Missing visit ID. Cannot update status.'
      });
      return;
    }

    setLoading(true);
    setLoadingPercentage(0);
    setModal({
      isOpen: true,
      type: 'loading',
      title: 'Updating',
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
      if (!visitData?.application_id) {
        throw new Error('Missing application ID. Cannot update application data.');
      }

      const applicationUpdateData = mapFormDataToApplicationUpdate();
      
      try {
        await updateApplication(visitData.application_id.toString(), applicationUpdateData);
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
      
      const updateData = mapFormDataToUpdateData();
      
      const result = await updateApplicationVisit(visitData.id, updateData);
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to update application visit');
      }
      
      if (userRole === 'technician' && (technicianFormData.image1 || technicianFormData.image2 || technicianFormData.image3)) {
        try {
          const uploadResult = await uploadApplicationVisitImages(
            visitData.id,
            visitData.first_name,
            visitData.middle_initial,
            visitData.last_name,
            {
              image1: technicianFormData.image1,
              image2: technicianFormData.image2,
              image3: technicianFormData.image3
            }
          );
          
          clearInterval(progressInterval);
          setLoadingPercentage(100);
          await new Promise(resolve => setTimeout(resolve, 500));
          
          if (uploadResult.success) {
            const updatedVisit = { ...visitData, ...updateData, ...applicationUpdateData };
            setPendingUpdate(updatedVisit);
            setModal({
              isOpen: true,
              type: 'success',
              title: 'Success',
              message: `Application and visit details updated, images uploaded successfully!\n\nCustomer: ${visitData.first_name} ${visitData.last_name}`,
              onConfirm: () => {
                setErrors({});
                onSave(pendingUpdate!);
                setPendingUpdate(null);
                onClose();
                setModal({ ...modal, isOpen: false });
              }
            });
          } else {
            setModal({
              isOpen: true,
              type: 'warning',
              title: 'Partial Success',
              message: `Visit details updated, but image upload failed: ${uploadResult.message}`
            });
          }
        } catch (uploadError: any) {
          clearInterval(progressInterval);
          const errorMsg = uploadError.response?.data?.message || uploadError.message || 'Unknown error';
          setModal({
            isOpen: true,
            type: 'warning',
            title: 'Partial Success',
            message: `Visit details updated, but image upload failed: ${errorMsg}`
          });
        }
      } else {
        clearInterval(progressInterval);
        setLoadingPercentage(100);
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const updatedVisit = { ...visitData, ...updateData, ...applicationUpdateData };
        setPendingUpdate(updatedVisit);
        setModal({
        isOpen: true,
        type: 'success',
        title: 'Success',
        message: `Application and visit details updated successfully!\n\nCustomer: ${formData.firstName} ${formData.lastName}`,
          onConfirm: () => {
            setErrors({});
            onSave(pendingUpdate!);
            setPendingUpdate(null);
            onClose();
            setModal({ ...modal, isOpen: false });
          }
        });
      }
    } catch (error: any) {
      clearInterval(progressInterval);
      let errorMessage = 'Unknown error occurred';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Failed to Update',
        message: `Failed to update visit details: ${errorMessage}`
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  const getFullName = () => {
    return `${visitData.first_name || ''} ${visitData.middle_initial || ''} ${visitData.last_name || ''}`.trim();
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
      <View>
        <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#d1d5db' : '#374151' }}>
          {label}{label === 'Image 1' && <Text style={{ color: '#ef4444' }}>*</Text>}
        </Text>
        <Pressable style={{ position: 'relative', width: '100%', height: 192, borderWidth: 1, borderRadius: 4, overflow: 'hidden', backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6', borderColor: isDarkMode ? '#374151' : '#d1d5db' }}>
          {imageUrl ? (
            <View style={{ position: 'relative', width: '100%', height: '100%' }}>
              {isBlobUrl || (!isGDrive && !imageLoadError) ? (
                <Image 
                  source={{ uri: imageUrl }} 
                  style={{ width: '100%', height: '100%', resizeMode: 'contain' }}
                  onError={() => setImageLoadError(true)}
                />
              ) : (
                <View style={{ width: '100%', height: '100%', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <Camera size={32} color="#9ca3af" />
                  <Text style={{ fontSize: 14, marginTop: 8, textAlign: 'center', paddingHorizontal: 16, color: '#9ca3af' }}>Image stored in Google Drive</Text>
                </View>
              )}
              <View style={{ position: 'absolute', bottom: 8, right: 8, backgroundColor: '#22c55e', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, flexDirection: 'row', alignItems: 'center' }}>
                <Camera size={14} color="#ffffff" style={{ marginRight: 4 }} />
                <Text style={{ color: '#ffffff', fontSize: 12 }}>Uploaded</Text>
              </View>
            </View>
          ) : (
            <View style={{ width: '100%', height: '100%', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <Camera size={32} color="#9ca3af" />
              <Text style={{ fontSize: 14, marginTop: 8, color: '#9ca3af' }}>Click to upload</Text>
            </View>
          )}
        </Pressable>
        {error && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
            <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: '#f97316', alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
              <Text style={{ color: '#ffffff', fontSize: 12 }}>!</Text>
            </View>
            <Text style={{ color: '#f97316', fontSize: 12 }}>This entry is required</Text>
          </View>
        )}
      </View>
    );
  };

  if (!isOpen) return null;

  return (
    <>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', zIndex: 50 }}>
        <View style={{ height: '100%', width: '100%', maxWidth: 672, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 10, backgroundColor: isDarkMode ? '#111827' : '#ffffff' }}>
          <View style={{ paddingHorizontal: 24, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6', borderBottomColor: isDarkMode ? '#374151' : '#d1d5db' }}>
            <Text style={{ fontSize: 20, fontWeight: '600', color: isDarkMode ? '#ffffff' : '#111827' }}>{getFullName()}</Text>
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
            {userRole === 'technician' ? (
              <View style={{ gap: 16 }}>
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                    Full Address
                  </Text>
                  <TextInput
                    value={technicianFormData.fullAddress}
                    editable={false}
                    style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderRadius: 4, backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6', borderColor: isDarkMode ? '#374151' : '#d1d5db', color: isDarkMode ? '#9ca3af' : '#6b7280' }}
                  />
                </View>

                <ImagePreview
                  imageUrl={imagePreviews.image1}
                  label="Image 1"
                  onUpload={(file) => handleImageChange('image1', file)}
                  error={errors.image1}
                />

                {(technicianFormData.image1 || imagePreviews.image1) && (
                  <ImagePreview
                    imageUrl={imagePreviews.image2}
                    label="Image 2"
                    onUpload={(file) => handleImageChange('image2', file)}
                  />
                )}

                {(technicianFormData.image1 || imagePreviews.image1) && (technicianFormData.image2 || imagePreviews.image2) && (
                  <ImagePreview
                    imageUrl={imagePreviews.image3}
                    label="Image 3"
                    onUpload={(file) => handleImageChange('image3', file)}
                  />
                )}

                <View>
                  <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                    Visit By<Text style={{ color: '#ef4444' }}>*</Text>
                  </Text>
                  <View style={{ position: 'relative' }}>
                    <TextInput
                      value={technicianFormData.visit_by}
                      editable={false}
                      style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderRadius: 4, borderColor: errors.visit_by ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db'), backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', color: isDarkMode ? '#ffffff' : '#111827' }}
                    />
                  </View>
                  {errors.visit_by && <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4, flexDirection: 'row', alignItems: 'center' }}><Text style={{ marginRight: 4 }}>⚠</Text>{errors.visit_by}</Text>}
                </View>

                <View>
                  <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                    Visit With<Text style={{ color: '#ef4444' }}>*</Text>
                  </Text>
                  <View style={{ position: 'relative' }}>
                    <TextInput
                      value={technicianFormData.visit_with}
                      editable={false}
                      style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderRadius: 4, borderColor: errors.visit_with ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db'), backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', color: isDarkMode ? '#ffffff' : '#111827' }}
                    />
                  </View>
                  {errors.visit_with && <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4, flexDirection: 'row', alignItems: 'center' }}><Text style={{ marginRight: 4 }}>⚠</Text>{errors.visit_with}</Text>}
                </View>

                <View>
                  <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                    Visit With(Other)<Text style={{ color: '#ef4444' }}>*</Text>
                  </Text>
                  <View style={{ position: 'relative' }}>
                    <TextInput
                      value={technicianFormData.visit_with_other}
                      editable={false}
                      style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderRadius: 4, borderColor: errors.visit_with_other ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db'), backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', color: isDarkMode ? '#ffffff' : '#111827' }}
                    />
                  </View>
                  {errors.visit_with_other && <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4, flexDirection: 'row', alignItems: 'center' }}><Text style={{ marginRight: 4 }}>⚠</Text>{errors.visit_with_other}</Text>}
                </View>

                <View>
                  <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                    Visit Status
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Pressable
                      onPress={() => handleTechnicianInputChange('visitStatus', 'In Progress')}
                      style={{ flex: 1, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 4, backgroundColor: technicianFormData.visitStatus === 'In Progress' ? '#ea580c' : (isDarkMode ? '#1f2937' : '#e5e7eb') }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: '500', textAlign: 'center', color: technicianFormData.visitStatus === 'In Progress' ? '#ffffff' : (isDarkMode ? '#d1d5db' : '#374151') }}>
                        In Progress
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleTechnicianInputChange('visitStatus', 'OK to Install')}
                      style={{ flex: 1, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 4, backgroundColor: technicianFormData.visitStatus === 'OK to Install' ? '#ea580c' : (isDarkMode ? '#1f2937' : '#e5e7eb') }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: '500', textAlign: 'center', color: technicianFormData.visitStatus === 'OK to Install' ? '#ffffff' : (isDarkMode ? '#d1d5db' : '#374151') }}>
                        OK to Install
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleTechnicianInputChange('visitStatus', 'Not Ready')}
                      style={{ flex: 1, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 4, backgroundColor: technicianFormData.visitStatus === 'Not Ready' ? '#ea580c' : (isDarkMode ? '#1f2937' : '#e5e7eb') }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: '500', textAlign: 'center', color: technicianFormData.visitStatus === 'Not Ready' ? '#ffffff' : (isDarkMode ? '#d1d5db' : '#374151') }}>
                        Not Ready
                      </Text>
                    </Pressable>
                  </View>
                </View>

                {technicianFormData.visitStatus === 'Not Ready' && (
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                      Status Remarks
                    </Text>
                    <View style={{ position: 'relative' }}>
                      <TextInput
                        value={technicianFormData.statusRemarks}
                        editable={false}
                        style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderRadius: 4, backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', borderColor: isDarkMode ? '#374151' : '#d1d5db', color: isDarkMode ? '#ffffff' : '#111827' }}
                      />
                    </View>
                  </View>
                )}

                <View>
                  <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                    Visit Remarks
                  </Text>
                  <TextInput
                    value={technicianFormData.visitRemarks}
                    onChangeText={(text) => handleTechnicianInputChange('visitRemarks', text)}
                    multiline
                    numberOfLines={4}
                    style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderRadius: 4, backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', borderColor: isDarkMode ? '#374151' : '#d1d5db', color: isDarkMode ? '#ffffff' : '#111827', textAlignVertical: 'top' }}
                    placeholder="Enter visit remarks..."
                    placeholderTextColor="#9ca3af"
                  />
                </View>
              </View>
            ) : (
              <View style={{ gap: 16 }}>
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                    First Name
                  </Text>
                  <TextInput
                    value={formData.firstName}
                    onChangeText={(text) => handleInputChange('firstName', text)}
                    style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderRadius: 4, backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', borderColor: isDarkMode ? '#374151' : '#d1d5db', color: isDarkMode ? '#ffffff' : '#111827' }}
                  />
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
                    Last Name
                  </Text>
                  <TextInput
                    value={formData.lastName}
                    onChangeText={(text) => handleInputChange('lastName', text)}
                    style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderRadius: 4, backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', borderColor: isDarkMode ? '#374151' : '#d1d5db', color: isDarkMode ? '#ffffff' : '#111827' }}
                  />
                </View>

                <View>
                  <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                    Contact Number
                  </Text>
                  <TextInput
                    value={formData.contactNumber}
                    onChangeText={(text) => handleInputChange('contactNumber', text)}
                    style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderRadius: 4, backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', borderColor: isDarkMode ? '#374151' : '#d1d5db', color: isDarkMode ? '#ffffff' : '#111827' }}
                  />
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
                    Applicant Email Address
                  </Text>
                  <TextInput
                    value={formData.email}
                    onChangeText={(text) => handleInputChange('email', text)}
                    keyboardType="email-address"
                    style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderRadius: 4, backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', borderColor: isDarkMode ? '#374151' : '#d1d5db', color: isDarkMode ? '#ffffff' : '#111827' }}
                  />
                </View>

                <View>
                  <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                    Address
                  </Text>
                  <TextInput
                    value={formData.address}
                    onChangeText={(text) => handleInputChange('address', text)}
                    style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderRadius: 4, backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', borderColor: isDarkMode ? '#374151' : '#d1d5db', color: isDarkMode ? '#ffffff' : '#111827' }}
                  />
                </View>

                <View>
                  <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                    Region
                  </Text>
                  <View style={{ position: 'relative' }}>
                    <TextInput
                      value={formData.region}
                      editable={false}
                      style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderRadius: 4, backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', borderColor: isDarkMode ? '#374151' : '#d1d5db', color: isDarkMode ? '#ffffff' : '#111827' }}
                    />
                    <View style={{ position: 'absolute', right: 12, top: 10 }}>
                      <ChevronDown size={20} color={isDarkMode ? '#9ca3af' : '#4b5563'} />
                    </View>
                  </View>
                </View>

                <View>
                  <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                    City
                  </Text>
                  <View style={{ position: 'relative' }}>
                    <TextInput
                      value={formData.city}
                      editable={false}
                      style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderRadius: 4, opacity: !formData.region ? 0.5 : 1, backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', borderColor: isDarkMode ? '#374151' : '#d1d5db', color: isDarkMode ? '#ffffff' : '#111827' }}
                    />
                    <View style={{ position: 'absolute', right: 12, top: 10 }}>
                      <ChevronDown size={20} color="#9ca3af" />
                    </View>
                  </View>
                </View>

                <View>
                  <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                    Barangay
                  </Text>
                  <View style={{ position: 'relative' }}>
                    <TextInput
                      value={formData.barangay}
                      editable={false}
                      style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderRadius: 4, opacity: !formData.city ? 0.5 : 1, backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', borderColor: isDarkMode ? '#374151' : '#d1d5db', color: isDarkMode ? '#ffffff' : '#111827' }}
                    />
                    <View style={{ position: 'absolute', right: 12, top: 10 }}>
                      <ChevronDown size={20} color="#9ca3af" />
                    </View>
                  </View>
                </View>

                <View>
                  <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                    Location
                  </Text>
                  <View style={{ position: 'relative' }}>
                    <TextInput
                      value={formData.location}
                      editable={false}
                      style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderRadius: 4, opacity: !formData.barangay ? 0.5 : 1, backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', borderColor: isDarkMode ? '#374151' : '#d1d5db', color: isDarkMode ? '#ffffff' : '#111827' }}
                    />
                    <View style={{ position: 'absolute', right: 12, top: 10 }}>
                      <ChevronDown size={20} color="#9ca3af" />
                    </View>
                  </View>
                </View>

                <View>
                  <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                    Choose Plan
                  </Text>
                  <View style={{ position: 'relative' }}>
                    <TextInput
                      value={formData.choosePlan}
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
            )}
          </ScrollView>
        </View>
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
    </>
  );
};

export default ApplicationVisitStatusModal;
