import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, Image, Modal as RNModal, ActivityIndicator, Alert } from 'react-native';
import { X, Calendar, ChevronDown, Minus, Plus } from 'lucide-react-native';
import { UserData } from '../types/api';
import apiClient from '../config/api';
import { getAllInventoryItems, InventoryItem } from '../services/inventoryItemService';
import { createServiceOrderItems, ServiceOrderItem, deleteServiceOrderItems } from '../services/serviceOrderItemService';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';
import { getActiveImageSize, resizeImage, ImageSizeSetting } from '../services/imageSettingsService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

interface ServiceOrderEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (formData: any) => void;
  serviceOrderData?: any;
}

interface ModalConfig {
  isOpen: boolean;
  type: 'success' | 'error' | 'warning' | 'confirm' | 'loading';
  title: string;
  message: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface OrderItem {
  itemId: string;
  quantity: string;
}

interface ServiceOrderEditFormData {
  accountNo: string;
  dateInstalled: string;
  fullName: string;
  contactNumber: string;
  emailAddress: string;
  plan: string;
  affiliate: string;
  username: string;
  connectionType: string;
  routerModemSN: string;
  lcp: string;
  nap: string;
  port: string;
  vlan: string;
  supportStatus: string;
  visitStatus: string;
  repairCategory: string;
  visitBy: string;
  visitWith: string;
  visitWithOther: string;
  visitRemarks: string;
  clientSignature: string;
  itemName1: string;
  timeIn: string;
  modemSetupImage: string;
  timeOut: string;
  assignedEmail: string;
  concern: string;
  concernRemarks: string;
  modifiedBy: string;
  modifiedDate: string;
  userEmail: string;
  supportRemarks: string;
  serviceCharge: string;
  status: string;
  newRouterModemSN: string;
  newLcp: string;
  newNap: string;
  newPort: string;
  newVlan: string;
  routerModel: string;
}

interface ImageFiles {
  timeInFile: File | null;
  modemSetupFile: File | null;
  timeOutFile: File | null;
  clientSignatureFile: File | null;
}

const ServiceOrderEditModal: React.FC<ServiceOrderEditModalProps> = ({
  isOpen,
  onClose,
  onSave,
  serviceOrderData
}) => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);
  const [activeImageSize, setActiveImageSize] = useState<ImageSizeSetting | null>(null);

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

  const [currentUserEmail, setCurrentUserEmail] = useState<string>('unknown@ampere.com');

  const [technicians, setTechnicians] = useState<UserData[]>([]);
  const [lcps, setLcps] = useState<string[]>([]);
  const [naps, setNaps] = useState<string[]>([]);
  const [ports, setPorts] = useState<string[]>([]);
  const [vlans, setVlans] = useState<string[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([{ itemId: '', quantity: '' }]);

  const [formData, setFormData] = useState<ServiceOrderEditFormData>({
    accountNo: '',
    dateInstalled: '',
    fullName: '',
    contactNumber: '',
    emailAddress: '',
    plan: '',
    affiliate: '',
    username: '',
    connectionType: '',
    routerModemSN: '',
    lcp: '',
    nap: '',
    port: '',
    vlan: '',
    supportStatus: 'In Progress',
    visitStatus: '',
    repairCategory: '',
    visitBy: '',
    visitWith: '',
    visitWithOther: '',
    visitRemarks: '',
    clientSignature: '',
    itemName1: '',
    timeIn: '',
    modemSetupImage: '',
    timeOut: '',
    assignedEmail: '',
    concern: '',
    concernRemarks: '',
    modifiedBy: '',
    modifiedDate: new Date().toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }),
    userEmail: '',
    supportRemarks: '',
    serviceCharge: '0.00',
    status: 'unused',
    newRouterModemSN: '',
    newLcp: '',
    newNap: '',
    newPort: '',
    newVlan: '',
    routerModel: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [imageFiles, setImageFiles] = useState<ImageFiles>({
    timeInFile: null,
    modemSetupFile: null,
    timeOutFile: null,
    clientSignatureFile: null
  });
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imagePreviews, setImagePreviews] = useState<{
    timeInFile: string | null;
    modemSetupFile: string | null;
    timeOutFile: string | null;
    clientSignatureFile: string | null;
  }>({
    timeInFile: null,
    modemSetupFile: null,
    timeOutFile: null,
    clientSignatureFile: null
  });
  
  const [modal, setModal] = useState<ModalConfig>({
    isOpen: false,
    type: 'success',
    title: '',
    message: ''
  });

  const formatDateForInput = (dateStr?: string): string => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (e) {
      return '';
    }
  };

  useEffect(() => {
    const checkDarkMode = async () => {
      const theme = await AsyncStorage.getItem('theme');
      setIsDarkMode(theme === 'dark' || theme === null);
    };

    checkDarkMode();
  }, []);

  useEffect(() => {
    const fetchColorPalette = async () => {
      const palette = await settingsColorPaletteService.getActive();
      setColorPalette(palette);
    };
    fetchColorPalette();
  }, []);

  useEffect(() => {
    const fetchActiveImageSize = async () => {
      if (isOpen) {
        try {
          const imageSizeSettings = await getActiveImageSize();
          setActiveImageSize(imageSizeSettings);
          console.log('Active image size settings:', imageSizeSettings);
        } catch (error) {
          console.error('Error fetching active image size:', error);
        }
      }
    };
    fetchActiveImageSize();
  }, [isOpen]);

  useEffect(() => {
    const initCurrentUser = async () => {
      const user = await getCurrentUser();
      const email = user?.email || 'unknown@ampere.com';
      setCurrentUserEmail(email);
      setFormData(prev => ({ ...prev, modifiedBy: email, userEmail: email }));
    };
    initCurrentUser();
  }, []);

  useEffect(() => {
    const fetchServiceOrderItems = async () => {
      if (isOpen && serviceOrderData) {
        const serviceOrderId = serviceOrderData.id;
        if (serviceOrderId) {
          try {
            const response = await apiClient.get(`/service-order-items?service_order_id=${serviceOrderId}`);
            const data = response.data as { success: boolean; data: any[] };
            
            if (data.success && Array.isArray(data.data)) {
              const items = data.data;
              
              if (items.length > 0) {
                const uniqueItems = new Map();
                
                items.forEach((item: any) => {
                  const key = item.item_name;
                  if (uniqueItems.has(key)) {
                    const existing = uniqueItems.get(key);
                    uniqueItems.set(key, {
                      itemId: item.item_name || '',
                      quantity: (parseInt(existing.quantity) + parseInt(item.quantity || 0)).toString()
                    });
                  } else {
                    uniqueItems.set(key, {
                      itemId: item.item_name || '',
                      quantity: item.quantity ? item.quantity.toString() : ''
                    });
                  }
                });
                
                const formattedItems = Array.from(uniqueItems.values());
                formattedItems.push({ itemId: '', quantity: '' });
                
                setOrderItems(formattedItems);
              } else {
                setOrderItems([{ itemId: '', quantity: '' }]);
              }
            }
          } catch (error) {
            setOrderItems([{ itemId: '', quantity: '' }]);
          }
        }
      }
    };
    
    fetchServiceOrderItems();
  }, [isOpen, serviceOrderData]);

  useEffect(() => {
    const fetchInventoryItems = async () => {
      if (isOpen) {
        try {
          const response = await getAllInventoryItems();
          
          if (response.success && Array.isArray(response.data)) {
            setInventoryItems(response.data);
          } else {
            setInventoryItems([]);
          }
        } catch (error) {
          setInventoryItems([]);
        }
      }
    };
    
    fetchInventoryItems();
  }, [isOpen]);

  useEffect(() => {
    const fetchTechnicians = async () => {
      try {
        const response = await apiClient.get<{ success: boolean; data: UserData[] }>('/users');
        if (response.data.success && Array.isArray(response.data.data)) {
          const technicianUsers = response.data.data.filter(user => {
            const role = typeof user.role === 'string' ? user.role : (user.role as any)?.role_name || '';
            return role.toLowerCase() === 'technician';
          });
          console.log('Fetched technicians:', technicianUsers);
          setTechnicians(technicianUsers);
        }
      } catch (error) {
        console.error('Error fetching technicians:', error);
      }
    };

    const fetchTechnicalDetails = async () => {
      try {
        const [lcpResponse, napResponse, portResponse, vlanResponse] = await Promise.all([
          apiClient.get<{ success: boolean; data: any[] }>('/lcp'),
          apiClient.get<{ success: boolean; data: any[] }>('/nap'),
          apiClient.get<{ success: boolean; data: any[] }>('/port'),
          apiClient.get<{ success: boolean; data: any[] }>('/vlan')
        ]);

        if (lcpResponse.data.success && Array.isArray(lcpResponse.data.data)) {
          const lcpOptions = lcpResponse.data.data.map(item => item.lcp_name || item.lcp || item.name).filter(Boolean);
          setLcps(lcpOptions as string[]);
        }

        if (napResponse.data.success && Array.isArray(napResponse.data.data)) {
          const napOptions = napResponse.data.data.map(item => item.nap_name || item.nap || item.name).filter(Boolean);
          setNaps(napOptions as string[]);
        }

        if (portResponse.data.success && Array.isArray(portResponse.data.data)) {
          const portOptions = portResponse.data.data.map(item => item.Label).filter(Boolean);
          setPorts(portOptions as string[]);
        }

        if (vlanResponse.data.success && Array.isArray(vlanResponse.data.data)) {
          const vlanOptions = vlanResponse.data.data.map(item => item.value).filter(Boolean);
          setVlans(vlanOptions as string[]);
        }
      } catch (error) {
        console.error('Error fetching technical details:', error);
      }
    };
    
    if (isOpen) {
      fetchTechnicians();
      fetchTechnicalDetails();
    }
  }, [isOpen]);

  useEffect(() => {
    if (serviceOrderData && isOpen) {
      console.log('ServiceOrderEditModal - Received data:', serviceOrderData);
      console.log('Date Installed (dateInstalled):', serviceOrderData.dateInstalled);
      console.log('Date Installed (date_installed):', serviceOrderData.date_installed);
      
      setFormData(prev => ({
        ...prev,
        accountNo: serviceOrderData.accountNumber || serviceOrderData.account_no || '',
        dateInstalled: formatDateForInput(serviceOrderData.dateInstalled || serviceOrderData.date_installed),
        fullName: serviceOrderData.fullName || serviceOrderData.full_name || '',
        contactNumber: serviceOrderData.contactNumber || serviceOrderData.contact_number || '',
        emailAddress: serviceOrderData.emailAddress || serviceOrderData.email_address || '',
        plan: serviceOrderData.plan || '',
        affiliate: serviceOrderData.affiliate || serviceOrderData.group_name || '',
        username: serviceOrderData.username || '',
        connectionType: serviceOrderData.connectionType || serviceOrderData.connection_type || '',
        routerModemSN: serviceOrderData.routerModemSN || serviceOrderData.router_modem_sn || '',
        lcp: serviceOrderData.lcp || '',
        nap: serviceOrderData.nap || '',
        port: serviceOrderData.port || '',
        vlan: serviceOrderData.vlan || '',
        supportStatus: serviceOrderData.supportStatus || serviceOrderData.support_status || 'In Progress',
        visitStatus: serviceOrderData.visitStatus || serviceOrderData.visit_status || '',
        repairCategory: serviceOrderData.repairCategory || serviceOrderData.repair_category || '',
        visitBy: serviceOrderData.visitBy || serviceOrderData.visit_by || '',
        visitWith: serviceOrderData.visitWith || serviceOrderData.visit_with || '',
        visitWithOther: serviceOrderData.visitWithOther || serviceOrderData.visit_with_other || '',
        visitRemarks: serviceOrderData.visitRemarks || serviceOrderData.visit_remarks || '',
        clientSignature: serviceOrderData.clientSignature || serviceOrderData.client_signature || '',
        itemName1: serviceOrderData.itemName1 || serviceOrderData.item_name_1 || '',
        timeIn: serviceOrderData.timeIn || serviceOrderData.time_in || '',
        modemSetupImage: serviceOrderData.modemSetupImage || serviceOrderData.modem_setup_image || '',
        timeOut: serviceOrderData.timeOut || serviceOrderData.time_out || '',
        assignedEmail: serviceOrderData.assignedEmail || serviceOrderData.assigned_email || '',
        concern: serviceOrderData.concern || '',
        concernRemarks: serviceOrderData.concernRemarks || serviceOrderData.concern_remarks || '',
        userEmail: serviceOrderData.userEmail || serviceOrderData.assignedEmail || serviceOrderData.assigned_email || currentUserEmail,
        supportRemarks: serviceOrderData.supportRemarks || serviceOrderData.support_remarks || '',
        serviceCharge: serviceOrderData.serviceCharge ? serviceOrderData.serviceCharge.toString().replace('₱', '').trim() : (serviceOrderData.service_charge ? serviceOrderData.service_charge.toString().replace('₱', '').trim() : '0.00'),
        status: serviceOrderData.status || 'unused',
        newRouterModemSN: '',
        newLcp: '',
        newNap: '',
        newPort: '',
        newVlan: '',
        routerModel: ''
      }));
    }
  }, [serviceOrderData, isOpen, currentUserEmail]);

  const handleInputChange = (field: keyof ServiceOrderEditFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleImageChange = async (field: keyof ImageFiles, file: File | null) => {
    if (file && activeImageSize && activeImageSize.image_size_value < 100) {
      try {
        console.log(`Resizing ${field} image...`);
        console.log('Original file size:', (file.size / 1024 / 1024).toFixed(2), 'MB');
        
        const resizedFile = await resizeImage(file, activeImageSize.image_size_value);
        
        console.log('Resized file size:', (resizedFile.size / 1024 / 1024).toFixed(2), 'MB');
        console.log('Size reduction:', ((1 - resizedFile.size / file.size) * 100).toFixed(2), '%');
        
        const fileToUse = resizedFile.size < file.size ? resizedFile : file;
        setImageFiles(prev => ({ ...prev, [field]: fileToUse }));
        
        const previewUrl = URL.createObjectURL(fileToUse);
        setImagePreviews(prev => ({ ...prev, [field]: previewUrl }));
        
        if (errors[field]) {
          setErrors(prev => ({ ...prev, [field]: '' }));
        }
      } catch (error) {
        console.error('Error resizing image:', error);
        setImageFiles(prev => ({ ...prev, [field]: file }));
        
        const previewUrl = URL.createObjectURL(file);
        setImagePreviews(prev => ({ ...prev, [field]: previewUrl }));
        
        if (errors[field]) {
          setErrors(prev => ({ ...prev, [field]: '' }));
        }
      }
    } else {
      setImageFiles(prev => ({ ...prev, [field]: file }));
      
      if (file) {
        const previewUrl = URL.createObjectURL(file);
        setImagePreviews(prev => ({ ...prev, [field]: previewUrl }));
        
        if (errors[field]) {
          setErrors(prev => ({ ...prev, [field]: '' }));
        }
      }
    }
  };

  const uploadImageToGoogleDrive = async (file: File): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post<{ success: boolean; data: { url: string }; message?: string }>(
        '/google-drive/upload',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (!response.data.success || !response.data.data?.url) {
        throw new Error(response.data.message || 'Upload failed');
      }

      return response.data.data.url;
    } catch (error: any) {
      console.error('Error uploading to Google Drive:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to upload image');
    }
  };

  const uploadAllImages = async (): Promise<{ image1_url: string; image2_url: string; image3_url: string; client_signature_url: string }> => {
    const urls = { image1_url: '', image2_url: '', image3_url: '', client_signature_url: '' };
    const filesToUpload = [
      { file: imageFiles.clientSignatureFile, key: 'client_signature_url' },
      { file: imageFiles.timeInFile, key: 'image1_url' },
      { file: imageFiles.modemSetupFile, key: 'image2_url' },
      { file: imageFiles.timeOutFile, key: 'image3_url' }
    ].filter(item => item.file !== null);

    const totalFiles = filesToUpload.length;
    if (totalFiles === 0) {
      setUploadProgress(100);
      return urls;
    }

    for (let i = 0; i < filesToUpload.length; i++) {
      const { file, key } = filesToUpload[i];
      if (file) {
        const url = await uploadImageToGoogleDrive(file);
        urls[key as keyof typeof urls] = url;
        setUploadProgress(Math.round(((i + 1) / totalFiles) * 100));
      }
    }

    return urls;
  };

  const handleNumberChange = (field: 'serviceCharge', increment: boolean) => {
    setFormData(prev => {
      const currentValue = parseFloat(prev[field]) || 0;
      const newValue = increment ? currentValue + 1 : Math.max(0, currentValue - 1);
      return {
        ...prev,
        [field]: newValue.toFixed(2)
      };
    });
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.accountNo.trim()) newErrors.accountNo = 'Account No is required';
    if (!formData.fullName.trim()) newErrors.fullName = 'Full Name is required';
    if (!formData.contactNumber.trim()) newErrors.contactNumber = 'Contact Number is required';
    
    if (!formData.emailAddress.trim()) {
      newErrors.emailAddress = 'Email Address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.emailAddress.trim())) {
      newErrors.emailAddress = 'Please enter a valid email address';
    }
    
    if (!formData.plan.trim()) newErrors.plan = 'Plan is required';
    if (!formData.username.trim()) newErrors.username = 'Username is required';
    if (!formData.connectionType.trim()) newErrors.connectionType = 'Connection Type is required';
    if (!formData.supportStatus.trim()) newErrors.supportStatus = 'Support Status is required';
    if (!formData.concern.trim()) newErrors.concern = 'Concern is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleItemChange = (index: number, field: 'itemId' | 'quantity', value: string) => {
    const newOrderItems = [...orderItems];
    newOrderItems[index][field] = value;
    setOrderItems(newOrderItems);
    
    if (field === 'itemId' && value && index === orderItems.length - 1) {
      setOrderItems([...newOrderItems, { itemId: '', quantity: '' }]);
    }
  };

  const handleRemoveItem = (index: number) => {
    if (orderItems.length > 1) {
      const newOrderItems = orderItems.filter((_, i) => i !== index);
      setOrderItems(newOrderItems);
    }
  };

  const handleSave = async () => {
    const updatedFormData = {
      ...formData,
      modifiedBy: currentUserEmail,
      modifiedDate: new Date().toLocaleString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      })
    };
    
    setFormData(updatedFormData);
    
    if (!validateForm()) {
      setModal({
        isOpen: true,
        type: 'warning',
        title: 'Validation Error',
        message: 'Please fill in all required fields before saving.'
      });
      return;
    }

    if (!serviceOrderData?.id) {
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Cannot update service order: Missing ID'
      });
      return;
    }

    setModal({
      isOpen: true,
      type: 'loading',
      title: 'Saving',
      message: 'Please wait while we save your changes...'
    });
    
    setLoading(true);
    setUploadProgress(0);
    
    try {
      const serviceOrderId = serviceOrderData.id;
      
      setModal({
        isOpen: true,
        type: 'loading',
        title: 'Uploading Images',
        message: `Uploading images to Google Drive... 0%`
      });
      
      const imageUrls = await uploadAllImages();
      
      setModal({
        isOpen: true,
        type: 'loading',
        title: 'Saving Service Order',
        message: 'Saving service order details...'
      });
      
      const serviceOrderUpdateData: any = {
        account_no: updatedFormData.accountNo,
        date_installed: updatedFormData.dateInstalled,
        full_name: updatedFormData.fullName,
        contact_number: updatedFormData.contactNumber,
        email_address: updatedFormData.emailAddress,
        plan: updatedFormData.plan,
        group_name: updatedFormData.affiliate,
        username: updatedFormData.username,
        connection_type: updatedFormData.connectionType,
        router_modem_sn: updatedFormData.routerModemSN,
        lcp: updatedFormData.lcp,
        nap: updatedFormData.nap,
        port: updatedFormData.port,
        vlan: updatedFormData.vlan,
        support_status: updatedFormData.supportStatus,
        visit_status: updatedFormData.visitStatus,
        repair_category: updatedFormData.repairCategory,
        visit_by_user: updatedFormData.visitBy,
        visit_with: updatedFormData.visitWith,
        visit_remarks: updatedFormData.visitRemarks,
        client_signature: updatedFormData.clientSignature,
        item_name_1: updatedFormData.itemName1,
        image1_url: imageUrls.image1_url || formData.timeIn,
        image2_url: imageUrls.image2_url || formData.modemSetupImage,
        image3_url: imageUrls.image3_url || formData.timeOut,
        client_signature_url: imageUrls.client_signature_url || formData.clientSignature,
        assigned_email: updatedFormData.assignedEmail || updatedFormData.userEmail,
        concern: updatedFormData.concern,
        concern_remarks: updatedFormData.concernRemarks,
        updated_by: updatedFormData.modifiedBy,
        support_remarks: updatedFormData.supportRemarks,
        service_charge: parseFloat(updatedFormData.serviceCharge),
        status: updatedFormData.status,
        new_router_modem_sn: updatedFormData.newRouterModemSN,
        new_lcp: updatedFormData.newLcp,
        new_nap: updatedFormData.newNap,
        new_port: updatedFormData.newPort,
        new_vlan: updatedFormData.newVlan,
        router_model: updatedFormData.routerModel
      };

      const response = await apiClient.put<{ success: boolean; message?: string; data?: any }>(
        `/service-orders/${serviceOrderId}`, 
        serviceOrderUpdateData
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Service order update failed');
      }

      const validItems = orderItems.filter(item => {
        const quantity = parseInt(item.quantity);
        const isValid = item.itemId && item.itemId.trim() !== '' && !isNaN(quantity) && quantity > 0;
        return isValid;
      });

      if (validItems.length > 0) {
        try {
          const existingItemsResponse = await apiClient.get<{ success: boolean; data: any[] }>(`/service-order-items?service_order_id=${serviceOrderId}`);
          
          if (existingItemsResponse.data.success && existingItemsResponse.data.data.length > 0) {
            const existingItems = existingItemsResponse.data.data;
            
            for (const item of existingItems) {
              try {
                await apiClient.delete(`/service-order-items/${item.id}`);
              } catch (deleteErr) {
                console.error('Error deleting existing item:', deleteErr);
              }
            }
          }
        } catch (deleteError: any) {
          console.error('Error fetching/deleting existing items:', deleteError);
        }

        const serviceOrderItems: ServiceOrderItem[] = validItems.map(item => {
          return {
            service_order_id: parseInt(serviceOrderId.toString()),
            item_name: item.itemId,
            quantity: parseInt(item.quantity)
          };
        });
        
        try {
          const itemsResponse = await createServiceOrderItems(serviceOrderItems);
          
          if (!itemsResponse.success) {
            throw new Error(itemsResponse.message || 'Failed to create service order items');
          }
        } catch (itemsError: any) {
          console.error('Error saving items:', itemsError);
          const errorMsg = itemsError.response?.data?.message || itemsError.message || 'Unknown error';
          setLoading(false);
          setModal({
            isOpen: true,
            type: 'error',
            title: 'Failed to Save Items',
            message: `Service order updated but failed to save items: ${errorMsg}`,
            onConfirm: () => {
              setModal({ ...modal, isOpen: false });
            }
          });
          return;
        }
      }

      setModal({
        isOpen: true,
        type: 'success',
        title: 'Success',
        message: 'Service Order updated successfully!',
        onConfirm: () => {
          setErrors({});
          onSave(updatedFormData);
          onClose();
          setModal({ ...modal, isOpen: false });
        }
      });
    } catch (error: any) {
      console.error('Error updating service order:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error occurred';
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Failed to Update',
        message: `Failed to update service order: ${errorMessage}`,
        onConfirm: () => {
          setModal({ ...modal, isOpen: false });
        }
      });
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const pickImage = async (field: keyof ImageFiles) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setImagePreviews(prev => ({ ...prev, [field]: uri }));
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <View style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
        alignItems: 'flex-end',
        zIndex: 50
      }}>
        <View style={{
          height: '100%',
          width: '100%',
          maxWidth: 672,
          backgroundColor: isDarkMode ? '#111827' : '#ffffff',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.25,
          shadowRadius: 16,
          elevation: 16,
          overflow: 'hidden',
          flexDirection: 'column'
        }}>
          <View style={{
            paddingHorizontal: 24,
            paddingVertical: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottomWidth: 1,
            backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6',
            borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb'
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Pressable onPress={onClose}>
                <X size={24} color={isDarkMode ? '#9ca3af' : '#4b5563'} />
              </Pressable>
              <Text style={{
                fontSize: 20,
                fontWeight: '600',
                color: isDarkMode ? '#ffffff' : '#111827'
              }}>
                {serviceOrderData?.ticket_id || serviceOrderData?.id} | {formData.fullName}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Pressable 
                onPress={onClose}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 4,
                  borderWidth: 1,
                  borderColor: isDarkMode ? '#ea580c' : '#9ca3af',
                  backgroundColor: 'transparent'
                }}
              >
                <Text style={{ color: isDarkMode ? '#ea580c' : '#ffffff', fontSize: 14 }}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable 
                onPress={handleSave}
                disabled={loading}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 4,
                  backgroundColor: colorPalette?.primary || '#ea580c',
                  opacity: loading ? 0.5 : 1
                }}
              >
                <Text style={{ color: '#ffffff', fontSize: 14 }}>Save</Text>
              </Pressable>
            </View>
          </View>

          <ScrollView style={{ flex: 1, padding: 24 }} contentContainerStyle={{ gap: 16 }}>
            <View>
              <Text style={{
                fontSize: 14,
                fontWeight: '500',
                marginBottom: 8,
                color: isDarkMode ? '#d1d5db' : '#374151'
              }}>
                Account No<Text style={{ color: '#ef4444' }}>*</Text>
              </Text>
              <View style={{ position: 'relative' }}>
                <TextInput
                  value={formData.accountNo}
                  onChangeText={(text) => handleInputChange('accountNo', text)}
                  style={{
                    width: '100%',
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderWidth: 1,
                    borderRadius: 4,
                    backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                    color: isDarkMode ? '#ffffff' : '#111827',
                    borderColor: errors.accountNo ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db')
                  }}
                />
                <View style={{ position: 'absolute', right: 12, top: 10 }}>
                  <ChevronDown size={20} color={isDarkMode ? '#9ca3af' : '#4b5563'} />
                </View>
              </View>
              {errors.accountNo && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  <View style={{
                    width: 16,
                    height: 16,
                    borderRadius: 8,
                    backgroundColor: '#ea580c',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 8
                  }}>
                    <Text style={{ color: '#ffffff', fontSize: 12 }}>!</Text>
                  </View>
                  <Text style={{ color: '#ea580c', fontSize: 12 }}>This entry is required</Text>
                </View>
              )}
            </View>

            <View>
              <Text style={{
                fontSize: 14,
                fontWeight: '500',
                marginBottom: 8,
                color: isDarkMode ? '#d1d5db' : '#374151'
              }}>
                Date Installed<Text style={{ color: '#ef4444' }}>*</Text>
              </Text>
              <View style={{ position: 'relative' }}>
                <TextInput
                  value={formData.dateInstalled}
                  onChangeText={(text) => handleInputChange('dateInstalled', text)}
                  style={{
                    width: '100%',
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderWidth: 1,
                    borderRadius: 4,
                    backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                    color: isDarkMode ? '#ffffff' : '#111827',
                    borderColor: errors.dateInstalled ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db')
                  }}
                />
                <View style={{ position: 'absolute', right: 12, top: 10 }}>
                  <Calendar size={20} color={isDarkMode ? '#9ca3af' : '#4b5563'} />
                </View>
              </View>
              {errors.dateInstalled && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  <View style={{
                    width: 16,
                    height: 16,
                    borderRadius: 8,
                    backgroundColor: '#ea580c',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 8
                  }}>
                    <Text style={{ color: '#ffffff', fontSize: 12 }}>!</Text>
                  </View>
                  <Text style={{ color: '#ea580c', fontSize: 12 }}>This entry is required</Text>
                </View>
              )}
            </View>

            <View>
              <Text style={{
                fontSize: 14,
                fontWeight: '500',
                marginBottom: 8,
                color: isDarkMode ? '#d1d5db' : '#374151'
              }}>
                Full Name<Text style={{ color: '#ef4444' }}>*</Text>
              </Text>
              <TextInput
                value={formData.fullName}
                onChangeText={(text) => handleInputChange('fullName', text)}
                style={{
                  width: '100%',
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderWidth: 1,
                  borderRadius: 4,
                  backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                  color: isDarkMode ? '#ffffff' : '#111827',
                  borderColor: errors.fullName ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db')
                }}
              />
              {errors.fullName && <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{errors.fullName}</Text>}
            </View>

            <View>
              <Text style={{
                fontSize: 14,
                fontWeight: '500',
                marginBottom: 8,
                color: isDarkMode ? '#d1d5db' : '#374151'
              }}>
                Contact Number<Text style={{ color: '#ef4444' }}>*</Text>
              </Text>
              <TextInput
                value={formData.contactNumber}
                onChangeText={(text) => handleInputChange('contactNumber', text)}
                style={{
                  width: '100%',
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderWidth: 1,
                  borderRadius: 4,
                  backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                  color: isDarkMode ? '#ffffff' : '#111827',
                  borderColor: errors.contactNumber ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db')
                }}
              />
              {errors.contactNumber && <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{errors.contactNumber}</Text>}
            </View>

            <View>
              <Text style={{
                fontSize: 14,
                fontWeight: '500',
                marginBottom: 8,
                color: isDarkMode ? '#d1d5db' : '#374151'
              }}>
                Email Address<Text style={{ color: '#ef4444' }}>*</Text>
              </Text>
              <TextInput
                value={formData.emailAddress}
                onChangeText={(text) => handleInputChange('emailAddress', text)}
                keyboardType="email-address"
                style={{
                  width: '100%',
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderWidth: 1,
                  borderRadius: 4,
                  backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                  color: isDarkMode ? '#ffffff' : '#111827',
                  borderColor: errors.emailAddress ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db')
                }}
              />
              {errors.emailAddress && <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{errors.emailAddress}</Text>}
            </View>

            <View>
              <Text style={{
                fontSize: 14,
                fontWeight: '500',
                marginBottom: 8,
                color: isDarkMode ? '#d1d5db' : '#374151'
              }}>
                Plan<Text style={{ color: '#ef4444' }}>*</Text>
              </Text>
              <TextInput
                value={formData.plan}
                editable={false}
                style={{
                  width: '100%',
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderWidth: 1,
                  borderRadius: 4,
                  backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6',
                  color: isDarkMode ? '#9ca3af' : '#6b7280',
                  borderColor: errors.plan ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db')
                }}
              />
              {errors.plan && <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{errors.plan}</Text>}
            </View>

            <View>
              <Text style={{
                fontSize: 14,
                fontWeight: '500',
                marginBottom: 8,
                color: isDarkMode ? '#d1d5db' : '#374151'
              }}>
                Concern<Text style={{ color: '#ef4444' }}>*</Text>
              </Text>
              <TextInput
                value={formData.concern}
                onChangeText={(text) => handleInputChange('concern', text)}
                style={{
                  width: '100%',
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderWidth: 1,
                  borderRadius: 4,
                  backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                  color: isDarkMode ? '#ffffff' : '#111827',
                  borderColor: errors.concern ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db')
                }}
              />
              {errors.concern && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  <View style={{
                    width: 16,
                    height: 16,
                    borderRadius: 8,
                    backgroundColor: '#ea580c',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 8
                  }}>
                    <Text style={{ color: '#ffffff', fontSize: 12 }}>!</Text>
                  </View>
                  <Text style={{ color: '#ea580c', fontSize: 12 }}>This entry is required</Text>
                </View>
              )}
            </View>

            <View>
              <Text style={{
                fontSize: 14,
                fontWeight: '500',
                marginBottom: 8,
                color: isDarkMode ? '#d1d5db' : '#374151'
              }}>
                Service Charge<Text style={{ color: '#ef4444' }}>*</Text>
              </Text>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1,
                borderRadius: 4,
                backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                borderColor: isDarkMode ? '#374151' : '#d1d5db'
              }}>
                <Text style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  color: isDarkMode ? '#ffffff' : '#111827'
                }}>₱</Text>
                <TextInput
                  value={formData.serviceCharge}
                  onChangeText={(text) => handleInputChange('serviceCharge', text)}
                  keyboardType="decimal-pad"
                  style={{
                    flex: 1,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    color: isDarkMode ? '#ffffff' : '#111827'
                  }}
                />
                <View style={{ flexDirection: 'row' }}>
                  <Pressable
                    onPress={() => handleNumberChange('serviceCharge', false)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderLeftWidth: 1,
                      borderLeftColor: isDarkMode ? '#374151' : '#d1d5db'
                    }}
                  >
                    <Minus size={16} color={isDarkMode ? '#9ca3af' : '#4b5563'} />
                  </Pressable>
                  <Pressable
                    onPress={() => handleNumberChange('serviceCharge', true)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderLeftWidth: 1,
                      borderLeftColor: isDarkMode ? '#374151' : '#d1d5db'
                    }}
                  >
                    <Plus size={16} color={isDarkMode ? '#9ca3af' : '#4b5563'} />
                  </Pressable>
                </View>
              </View>
              {errors.serviceCharge && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  <View style={{
                    width: 16,
                    height: 16,
                    borderRadius: 8,
                    backgroundColor: '#ea580c',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 8
                  }}>
                    <Text style={{ color: '#ffffff', fontSize: 12 }}>!</Text>
                  </View>
                  <Text style={{ color: '#ea580c', fontSize: 12 }}>This entry is required</Text>
                </View>
              )}
            </View>
          </ScrollView>
        </View>

        {modal.isOpen && (
          <RNModal visible={modal.isOpen} transparent animationType="fade">
            <View style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 60
            }}>
              <View style={{
                borderWidth: 1,
                borderRadius: 8,
                padding: 24,
                maxWidth: 448,
                width: '100%',
                marginHorizontal: 16,
                backgroundColor: isDarkMode ? '#111827' : '#ffffff',
                borderColor: isDarkMode ? '#374151' : '#e5e7eb'
              }}>
                {modal.type === 'loading' ? (
                  <>
                    <View style={{ flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <ActivityIndicator size="large" color="#ea580c" style={{ marginBottom: 16 }} />
                      {modal.title === 'Uploading Images' && uploadProgress > 0 && (
                        <Text style={{ fontSize: 36, fontWeight: 'bold', color: '#ffffff' }}>{uploadProgress}%</Text>
                      )}
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={{
                      fontSize: 18,
                      fontWeight: '600',
                      marginBottom: 16,
                      textAlign: 'center',
                      color: isDarkMode ? '#ffffff' : '#111827'
                    }}>{modal.title}</Text>
                    <Text style={{
                      marginBottom: 24,
                      textAlign: 'center',
                      color: isDarkMode ? '#d1d5db' : '#374151'
                    }}>{modal.message}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                      <Pressable
                        onPress={() => {
                          if (modal.onConfirm) {
                            modal.onConfirm();
                          } else {
                            setModal({ ...modal, isOpen: false });
                          }
                        }}
                        style={{
                          paddingHorizontal: 24,
                          paddingVertical: 8,
                          backgroundColor: '#ea580c',
                          borderRadius: 4
                        }}
                      >
                        <Text style={{ color: '#ffffff' }}>OK</Text>
                      </Pressable>
                    </View>
                  </>
                )}
              </View>
            </View>
          </RNModal>
        )}
      </View>
    </>
  );
};

export default ServiceOrderEditModal;
