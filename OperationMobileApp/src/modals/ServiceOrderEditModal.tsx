import React, { useState, useEffect } from 'react';
import { X, Calendar, ChevronDown, Minus, Plus } from 'lucide-react';
import { UserData } from '../types/api';
import apiClient from '../config/api';
import { getAllInventoryItems, InventoryItem } from '../services/inventoryItemService';
import { createServiceOrderItems, ServiceOrderItem, deleteServiceOrderItems } from '../services/serviceOrderItemService';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';
import { getActiveImageSize, resizeImage, ImageSizeSetting } from '../services/imageSettingsService';

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

  const getCurrentUser = (): UserData | null => {
    try {
      const authData = localStorage.getItem('authData');
      if (authData) {
        return JSON.parse(authData);
      }
    } catch (error) {
      console.error('Error getting current user:', error);
    }
    return null;
  };

  const currentUser = getCurrentUser();
  const currentUserEmail = currentUser?.email || 'unknown@ampere.com';

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
    modifiedBy: currentUserEmail,
    modifiedDate: new Date().toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }),
    userEmail: currentUserEmail,
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
    if (!isOpen) {
      Object.values(imagePreviews).forEach(url => {
        if (url && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
      setImagePreviews({
        timeInFile: null,
        modemSetupFile: null,
        timeOutFile: null,
        clientSignatureFile: null
      });
    }
  }, [isOpen, imagePreviews]);

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
        
        if (imagePreviews[field] && imagePreviews[field]?.startsWith('blob:')) {
          URL.revokeObjectURL(imagePreviews[field]!);
        }
        
        const previewUrl = URL.createObjectURL(fileToUse);
        setImagePreviews(prev => ({ ...prev, [field]: previewUrl }));
        
        if (errors[field]) {
          setErrors(prev => ({ ...prev, [field]: '' }));
        }
      } catch (error) {
        console.error('Error resizing image:', error);
        setImageFiles(prev => ({ ...prev, [field]: file }));
        
        if (imagePreviews[field] && imagePreviews[field]?.startsWith('blob:')) {
          URL.revokeObjectURL(imagePreviews[field]!);
        }
        
        const previewUrl = URL.createObjectURL(file);
        setImagePreviews(prev => ({ ...prev, [field]: previewUrl }));
        
        if (errors[field]) {
          setErrors(prev => ({ ...prev, [field]: '' }));
        }
      }
    } else {
      setImageFiles(prev => ({ ...prev, [field]: file }));
      
      if (file) {
        if (imagePreviews[field] && imagePreviews[field]?.startsWith('blob:')) {
          URL.revokeObjectURL(imagePreviews[field]!);
        }
        
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

      // Save service order items
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

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-end z-50">
        <div className={`h-full w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col ${
          isDarkMode ? 'bg-gray-900' : 'bg-white'
        }`}>
          <div className={`px-6 py-4 flex items-center justify-between border-b ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'
          }`}>
            <div className="flex items-center space-x-3">
              <button onClick={onClose} className={`${
                isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              }`}>
                <X size={24} />
              </button>
              <h2 className={`text-xl font-semibold ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {serviceOrderData?.ticket_id || serviceOrderData?.id} | {formData.fullName}
              </h2>
            </div>
            <div className="flex items-center space-x-3">
              <button onClick={onClose} className={`px-4 py-2 rounded text-sm ${
                isDarkMode 
                  ? 'border border-orange-600 text-orange-600 hover:bg-orange-600 hover:text-white'
                  : 'bg-gray-400 hover:bg-gray-500 text-white'
              }`}>
                Cancel
              </button>
              <button 
                onClick={handleSave} 
                disabled={loading} 
                className="px-4 py-2 disabled:opacity-50 text-white rounded text-sm"
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
                Save
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>Account No<span className="text-red-500">*</span></label>
              <div className="relative">
                <select 
                  value={formData.accountNo} 
                  onChange={(e) => handleInputChange('accountNo', e.target.value)} 
                  className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 appearance-none ${
                    isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                  } ${errors.accountNo ? 'border-red-500' : isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}
                >
                  <option value="">Select Account</option>
                  {formData.accountNo && (
                    <option value={formData.accountNo}>{formData.accountNo}</option>
                  )}
                </select>
                <ChevronDown className={`absolute right-3 top-2.5 pointer-events-none ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`} size={20} />
              </div>
              {errors.accountNo && (
                <div className="flex items-center mt-1">
                  <div className="flex items-center justify-center w-4 h-4 rounded-full bg-orange-500 text-white text-xs mr-2">!</div>
                  <p className="text-orange-500 text-xs">This entry is required</p>
                </div>
              )}
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>Date Installed<span className="text-red-500">*</span></label>
              <div className="relative">
                <input 
                  type="date" 
                  value={formData.dateInstalled} 
                  onChange={(e) => handleInputChange('dateInstalled', e.target.value)} 
                  className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 ${
                    isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                  } ${errors.dateInstalled ? 'border-red-500' : isDarkMode ? 'border-gray-700' : 'border-gray-300'}`} 
                />
                <Calendar className={`absolute right-3 top-2.5 pointer-events-none ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`} size={20} />
              </div>
              {errors.dateInstalled && (
                <div className="flex items-center mt-1">
                  <div className="flex items-center justify-center w-4 h-4 rounded-full bg-orange-500 text-white text-xs mr-2">!</div>
                  <p className="text-orange-500 text-xs">This entry is required</p>
                </div>
              )}
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>Full Name<span className="text-red-500">*</span></label>
              <input 
                type="text" 
                value={formData.fullName} 
                onChange={(e) => handleInputChange('fullName', e.target.value)} 
                className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 ${
                  isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                } ${errors.fullName ? 'border-red-500' : isDarkMode ? 'border-gray-700' : 'border-gray-300'}`} 
              />
              {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>Contact Number<span className="text-red-500">*</span></label>
              <input 
                type="text" 
                value={formData.contactNumber} 
                onChange={(e) => handleInputChange('contactNumber', e.target.value)} 
                className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 ${
                  isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                } ${errors.contactNumber ? 'border-red-500' : isDarkMode ? 'border-gray-700' : 'border-gray-300'}`} 
              />
              {errors.contactNumber && <p className="text-red-500 text-xs mt-1">{errors.contactNumber}</p>}
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>Email Address<span className="text-red-500">*</span></label>
              <input 
                type="email" 
                value={formData.emailAddress} 
                onChange={(e) => handleInputChange('emailAddress', e.target.value)} 
                className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 ${
                  isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                } ${errors.emailAddress ? 'border-red-500' : isDarkMode ? 'border-gray-700' : 'border-gray-300'}`} 
              />
              {errors.emailAddress && <p className="text-red-500 text-xs mt-1">{errors.emailAddress}</p>}
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>Plan<span className="text-red-500">*</span></label>
              <input 
                type="text" 
                value={formData.plan} 
                onChange={(e) => handleInputChange('plan', e.target.value)} 
                className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 cursor-not-allowed ${
                  isDarkMode ? 'bg-gray-800 text-gray-400 border-gray-700' : 'bg-gray-100 text-gray-500 border-gray-300'
                } ${errors.plan ? 'border-red-500' : ''}`} 
                readOnly
              />
              {errors.plan && <p className="text-red-500 text-xs mt-1">{errors.plan}</p>}
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>Affiliate</label>
              <input 
                type="text" 
                value={formData.affiliate} 
                onChange={(e) => handleInputChange('affiliate', e.target.value)} 
                className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 cursor-not-allowed ${
                  isDarkMode ? 'bg-gray-800 text-gray-400 border-gray-700' : 'bg-gray-100 text-gray-500 border-gray-300'
                }`} 
                readOnly
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>Username<span className="text-red-500">*</span></label>
              <input 
                type="text" 
                value={formData.username} 
                onChange={(e) => handleInputChange('username', e.target.value)} 
                className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 ${
                  isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                } ${errors.username ? 'border-red-500' : isDarkMode ? 'border-gray-700' : 'border-gray-300'}`} 
              />
              {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username}</p>}
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>Connection Type<span className="text-red-500">*</span></label>
              <div className="grid grid-cols-3 gap-2">
                <button 
                  type="button" 
                  onClick={() => handleInputChange('connectionType', 'Fiber')} 
                  className={`py-2 px-4 rounded border transition-colors duration-200 ${
                    formData.connectionType === 'Fiber' 
                      ? 'bg-orange-600 border-orange-700' 
                      : isDarkMode
                      ? 'bg-gray-800 border-gray-700'
                      : 'bg-white border-gray-300'
                  } text-white`}
                >
                  Fiber
                </button>
              </div>
              {errors.connectionType && (
                <div className="flex items-center mt-1">
                  <div className="flex items-center justify-center w-4 h-4 rounded-full bg-orange-500 text-white text-xs mr-2">!</div>
                  <p className="text-orange-500 text-xs">This entry is required</p>
                </div>
              )}
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>Router/Modem SN<span className="text-red-500">*</span></label>
              <input 
                type="text" 
                value={formData.routerModemSN} 
                onChange={(e) => handleInputChange('routerModemSN', e.target.value)} 
                className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 ${
                  isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                } ${errors.routerModemSN ? 'border-red-500' : isDarkMode ? 'border-gray-700' : 'border-gray-300'}`} 
              />
              {errors.routerModemSN && (
                <div className="flex items-center mt-1">
                  <div className="flex items-center justify-center w-4 h-4 rounded-full bg-orange-500 text-white text-xs mr-2">!</div>
                  <p className="text-orange-500 text-xs">This entry is required</p>
                </div>
              )}
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>LCP</label>
              <input 
                type="text" 
                value={formData.lcp} 
                onChange={(e) => handleInputChange('lcp', e.target.value)} 
                className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 cursor-not-allowed ${
                  isDarkMode ? 'bg-gray-800 text-gray-400 border-gray-700' : 'bg-gray-100 text-gray-500 border-gray-300'
                }`} 
                readOnly
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>NAP</label>
              <input 
                type="text" 
                value={formData.nap} 
                onChange={(e) => handleInputChange('nap', e.target.value)} 
                className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 cursor-not-allowed ${
                  isDarkMode ? 'bg-gray-800 text-gray-400 border-gray-700' : 'bg-gray-100 text-gray-500 border-gray-300'
                }`} 
                readOnly
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>PORT<span className="text-red-500">*</span></label>
              <input 
                type="text" 
                value={formData.port} 
                onChange={(e) => handleInputChange('port', e.target.value)} 
                className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 cursor-not-allowed ${
                  isDarkMode ? 'bg-gray-800 text-gray-400 border-gray-700' : 'bg-gray-100 text-gray-500 border-gray-300'
                } ${errors.port ? 'border-red-500' : ''}`} 
                readOnly
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>VLAN<span className="text-red-500">*</span></label>
              <input 
                type="text" 
                value={formData.vlan} 
                onChange={(e) => handleInputChange('vlan', e.target.value)} 
                className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 cursor-not-allowed ${
                  isDarkMode ? 'bg-gray-800 text-gray-400 border-gray-700' : 'bg-gray-100 text-gray-500 border-gray-300'
                } ${errors.vlan ? 'border-red-500' : ''}`} 
                readOnly
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>Support Status</label>
              <div className="relative">
                <select 
                  value={formData.supportStatus} 
                  onChange={(e) => handleInputChange('supportStatus', e.target.value)} 
                  className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 appearance-none ${
                    isDarkMode ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300'
                  }`}
                >
                  <option value="Resolved">Resolved</option>
                  <option value="Failed">Failed</option>
                  <option value="In Progress">In Progress</option>
                  <option value="For Visit">For Visit</option>
                </select>
                <ChevronDown className={`absolute right-3 top-2.5 pointer-events-none ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`} size={20} />
              </div>
            </div>

            {formData.supportStatus === 'For Visit' && (
              <>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>Visit Status<span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select 
                      value={formData.visitStatus} 
                      onChange={(e) => handleInputChange('visitStatus', e.target.value)} 
                      className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 appearance-none ${
                        isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                      } ${errors.visitStatus ? 'border-red-500' : isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}
                    >
                      <option value="">Select Visit Status</option>
                      <option value="Done">Done</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Failed">Failed</option>
                      <option value="Reschedule">Reschedule</option>
                    </select>
                    <ChevronDown className={`absolute right-3 top-2.5 pointer-events-none ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`} size={20} />
                  </div>
                  {errors.visitStatus && (
                    <div className="flex items-center mt-1">
                      <div className="flex items-center justify-center w-4 h-4 rounded-full bg-orange-500 text-white text-xs mr-2">!</div>
                      <p className="text-orange-500 text-xs">This entry is required</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>Assigned Email<span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select 
                      value={formData.assignedEmail} 
                      onChange={(e) => {
                        console.log('Assigned Email changed to:', e.target.value);
                        handleInputChange('assignedEmail', e.target.value);
                      }} 
                      className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 appearance-none ${
                        isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                      } ${errors.assignedEmail ? 'border-red-500' : isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}
                    >
                      <option value="">Select Technician</option>
                      {technicians.map((tech) => {
                        const emailValue = (tech as any).email_address || tech.email || '';
                        console.log('Technician option:', tech, 'Email:', emailValue);
                        return (
                          <option key={emailValue} value={emailValue}>
                            {emailValue}
                          </option>
                        );
                      })}
                    </select>
                    <ChevronDown className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" size={20} />
                  </div>
                  {errors.assignedEmail && (
                    <div className="flex items-center mt-1">
                      <div className="flex items-center justify-center w-4 h-4 rounded-full bg-orange-500 text-white text-xs mr-2">!</div>
                      <p className="text-orange-500 text-xs">This entry is required</p>
                    </div>
                  )}
                </div>

                {formData.visitStatus === 'Done' && (
                  <>
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>Repair Category<span className="text-red-500">*</span></label>
                      <div className="relative">
                        <select 
                          value={formData.repairCategory} 
                          onChange={(e) => handleInputChange('repairCategory', e.target.value)} 
                          className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 appearance-none ${
                            isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                          } ${errors.repairCategory ? 'border-red-500' : isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}
                        >
                          <option value="">Select Repair Category</option>
                          <option value="Fiber Relaying">Fiber Relaying</option>
                          <option value="Migrate">Migrate</option>
                          <option value="others">others</option>
                          <option value="Pullout">Pullout</option>
                          <option value="Reboot/Reconfig Router">Reboot/Reconfig Router</option>
                          <option value="Relocate Router">Relocate Router</option>
                          <option value="Relocate">Relocate</option>
                          <option value="Replace Patch Cord">Replace Patch Cord</option>
                          <option value="Replace Router">Replace Router</option>
                          <option value="Resplice">Resplice</option>
                          <option value="Transfer LCP/NAP/PORT">Transfer LCP/NAP/PORT</option>
                          <option value="Update Vlan">Update Vlan</option>
                        </select>
                        <ChevronDown className={`absolute right-3 top-2.5 pointer-events-none ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`} size={20} />
                      </div>
                      {errors.repairCategory && (
                        <div className="flex items-center mt-1">
                          <div className="flex items-center justify-center w-4 h-4 rounded-full bg-orange-500 text-white text-xs mr-2">!</div>
                          <p className="text-orange-500 text-xs">This entry is required</p>
                        </div>
                      )}
                    </div>

                    {formData.repairCategory === 'Migrate' && (
                      <>
                        <div>
                          <label className={`block text-sm font-medium mb-2 ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>New Router Modem SN<span className="text-red-500">*</span></label>
                          <input 
                            type="text" 
                            value={formData.newRouterModemSN} 
                            onChange={(e) => handleInputChange('newRouterModemSN', e.target.value)} 
                            placeholder="Enter Router Modem SN"
                            className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 ${
                              isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                            } ${errors.newRouterModemSN ? 'border-red-500' : isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}
                          />
                          {errors.newRouterModemSN && (
                            <div className="flex items-center mt-1">
                              <div className="flex items-center justify-center w-4 h-4 rounded-full bg-orange-500 text-white text-xs mr-2">!</div>
                              <p className="text-orange-500 text-xs">This entry is required</p>
                            </div>
                          )}
                        </div>

                        <div>
                          <label className={`block text-sm font-medium mb-2 ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>New LCP<span className="text-red-500">*</span></label>
                          <div className="relative">
                            <select 
                              value={formData.newLcp} 
                              onChange={(e) => handleInputChange('newLcp', e.target.value)} 
                              className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 appearance-none ${
                                isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                              } ${errors.newLcp ? 'border-red-500' : isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}
                            >
                              <option value="">Select LCP</option>
                              {lcps.map((lcp) => (
                                <option key={lcp} value={lcp}>{lcp}</option>
                              ))}
                            </select>
                            <ChevronDown className={`absolute right-3 top-2.5 pointer-events-none ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-600'
                            }`} size={20} />
                          </div>
                          {errors.newLcp && (
                            <div className="flex items-center mt-1">
                              <div className="flex items-center justify-center w-4 h-4 rounded-full bg-orange-500 text-white text-xs mr-2">!</div>
                              <p className="text-orange-500 text-xs">This entry is required</p>
                            </div>
                          )}
                        </div>

                        <div>
                          <label className={`block text-sm font-medium mb-2 ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>New NAP<span className="text-red-500">*</span></label>
                          <div className="relative">
                            <select 
                              value={formData.newNap} 
                              onChange={(e) => handleInputChange('newNap', e.target.value)} 
                              className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 appearance-none ${
                                isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                              } ${errors.newNap ? 'border-red-500' : isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}
                            >
                              <option value="">Select NAP</option>
                              {naps.map((nap) => (
                                <option key={nap} value={nap}>{nap}</option>
                              ))}
                            </select>
                            <ChevronDown className={`absolute right-3 top-2.5 pointer-events-none ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-600'
                            }`} size={20} />
                          </div>
                          {errors.newNap && (
                            <div className="flex items-center mt-1">
                              <div className="flex items-center justify-center w-4 h-4 rounded-full bg-orange-500 text-white text-xs mr-2">!</div>
                              <p className="text-orange-500 text-xs">This entry is required</p>
                            </div>
                          )}
                        </div>

                        <div>
                          <label className={`block text-sm font-medium mb-2 ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>New Port<span className="text-red-500">*</span></label>
                          <div className="relative">
                            <select 
                              value={formData.newPort} 
                              onChange={(e) => handleInputChange('newPort', e.target.value)} 
                              className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 appearance-none ${
                                isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                              } ${errors.newPort ? 'border-red-500' : isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}
                            >
                              <option value="">Select Port</option>
                              {ports.map((port) => (
                                <option key={port} value={port}>{port}</option>
                              ))}
                            </select>
                            <ChevronDown className={`absolute right-3 top-2.5 pointer-events-none ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-600'
                            }`} size={20} />
                          </div>
                          {errors.newPort && (
                            <div className="flex items-center mt-1">
                              <div className="flex items-center justify-center w-4 h-4 rounded-full bg-orange-500 text-white text-xs mr-2">!</div>
                              <p className="text-orange-500 text-xs">This entry is required</p>
                            </div>
                          )}
                        </div>

                        <div>
                          <label className={`block text-sm font-medium mb-2 ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>New VLAN<span className="text-red-500">*</span></label>
                          <div className="relative">
                            <select 
                              value={formData.newVlan} 
                              onChange={(e) => handleInputChange('newVlan', e.target.value)} 
                              className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 appearance-none ${
                                isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                              } ${errors.newVlan ? 'border-red-500' : isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}
                            >
                              <option value="">Select VLAN</option>
                              {vlans.map((vlan) => (
                                <option key={vlan} value={vlan}>{vlan}</option>
                              ))}
                            </select>
                            <ChevronDown className={`absolute right-3 top-2.5 pointer-events-none ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-600'
                            }`} size={20} />
                          </div>
                          {errors.newVlan && (
                            <div className="flex items-center mt-1">
                              <div className="flex items-center justify-center w-4 h-4 rounded-full bg-orange-500 text-white text-xs mr-2">!</div>
                              <p className="text-orange-500 text-xs">This entry is required</p>
                            </div>
                          )}
                        </div>

                        <div>
                          <label className={`block text-sm font-medium mb-2 ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>Router Model<span className="text-red-500">*</span></label>
                          <input 
                            type="text" 
                            value={formData.routerModel} 
                            onChange={(e) => handleInputChange('routerModel', e.target.value)} 
                            placeholder="Enter Router Model"
                            className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 ${
                              isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                            } ${errors.routerModel ? 'border-red-500' : isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}
                          />
                          {errors.routerModel && (
                            <div className="flex items-center mt-1">
                              <div className="flex items-center justify-center w-4 h-4 rounded-full bg-orange-500 text-white text-xs mr-2">!</div>
                              <p className="text-orange-500 text-xs">This entry is required</p>
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {formData.repairCategory === 'Relocate Router' && (
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>Router Model<span className="text-red-500">*</span></label>
                        <input 
                          type="text" 
                          value={formData.routerModel} 
                          onChange={(e) => handleInputChange('routerModel', e.target.value)} 
                          placeholder="Enter Router Model"
                          className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 ${
                            isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                          } ${errors.routerModel ? 'border-red-500' : isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}
                        />
                        {errors.routerModel && (
                          <div className="flex items-center mt-1">
                            <div className="flex items-center justify-center w-4 h-4 rounded-full bg-orange-500 text-white text-xs mr-2">!</div>
                            <p className="text-orange-500 text-xs">This entry is required</p>
                          </div>
                        )}
                      </div>
                    )}

                    {formData.repairCategory === 'Relocate' && (
                      <>
                        <div>
                          <label className={`block text-sm font-medium mb-2 ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>New LCP<span className="text-red-500">*</span></label>
                          <div className="relative">
                            <select 
                              value={formData.newLcp} 
                              onChange={(e) => handleInputChange('newLcp', e.target.value)} 
                              className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 appearance-none ${
                                isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                              } ${errors.newLcp ? 'border-red-500' : isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}
                            >
                              <option value="">Select LCP</option>
                              {lcps.map((lcp) => (
                                <option key={lcp} value={lcp}>{lcp}</option>
                              ))}
                            </select>
                            <ChevronDown className={`absolute right-3 top-2.5 pointer-events-none ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-600'
                            }`} size={20} />
                          </div>
                          {errors.newLcp && (
                            <div className="flex items-center mt-1">
                              <div className="flex items-center justify-center w-4 h-4 rounded-full bg-orange-500 text-white text-xs mr-2">!</div>
                              <p className="text-orange-500 text-xs">This entry is required</p>
                            </div>
                          )}
                        </div>

                        <div>
                          <label className={`block text-sm font-medium mb-2 ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>New NAP<span className="text-red-500">*</span></label>
                          <div className="relative">
                            <select 
                              value={formData.newNap} 
                              onChange={(e) => handleInputChange('newNap', e.target.value)} 
                              className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 appearance-none ${
                                isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                              } ${errors.newNap ? 'border-red-500' : isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}
                            >
                              <option value="">Select NAP</option>
                              {naps.map((nap) => (
                                <option key={nap} value={nap}>{nap}</option>
                              ))}
                            </select>
                            <ChevronDown className={`absolute right-3 top-2.5 pointer-events-none ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-600'
                            }`} size={20} />
                          </div>
                          {errors.newNap && (
                            <div className="flex items-center mt-1">
                              <div className="flex items-center justify-center w-4 h-4 rounded-full bg-orange-500 text-white text-xs mr-2">!</div>
                              <p className="text-orange-500 text-xs">This entry is required</p>
                            </div>
                          )}
                        </div>

                        <div>
                          <label className={`block text-sm font-medium mb-2 ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>New Port<span className="text-red-500">*</span></label>
                          <div className="relative">
                            <select 
                              value={formData.newPort} 
                              onChange={(e) => handleInputChange('newPort', e.target.value)} 
                              className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 appearance-none ${
                                isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                              } ${errors.newPort ? 'border-red-500' : isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}
                            >
                              <option value="">Select Port</option>
                              {ports.map((port) => (
                                <option key={port} value={port}>{port}</option>
                              ))}
                            </select>
                            <ChevronDown className={`absolute right-3 top-2.5 pointer-events-none ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-600'
                            }`} size={20} />
                          </div>
                          {errors.newPort && (
                            <div className="flex items-center mt-1">
                              <div className="flex items-center justify-center w-4 h-4 rounded-full bg-orange-500 text-white text-xs mr-2">!</div>
                              <p className="text-orange-500 text-xs">This entry is required</p>
                            </div>
                          )}
                        </div>

                        <div>
                          <label className={`block text-sm font-medium mb-2 ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>New VLAN<span className="text-red-500">*</span></label>
                          <div className="relative">
                            <select 
                              value={formData.newVlan} 
                              onChange={(e) => handleInputChange('newVlan', e.target.value)} 
                              className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 appearance-none ${
                                isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                              } ${errors.newVlan ? 'border-red-500' : isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}
                            >
                              <option value="">Select VLAN</option>
                              {vlans.map((vlan) => (
                                <option key={vlan} value={vlan}>{vlan}</option>
                              ))}
                            </select>
                            <ChevronDown className={`absolute right-3 top-2.5 pointer-events-none ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-600'
                            }`} size={20} />
                          </div>
                          {errors.newVlan && (
                            <div className="flex items-center mt-1">
                              <div className="flex items-center justify-center w-4 h-4 rounded-full bg-orange-500 text-white text-xs mr-2">!</div>
                              <p className="text-orange-500 text-xs">This entry is required</p>
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {formData.repairCategory === 'Replace Router' && (
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>New Router Modem SN<span className="text-red-500">*</span></label>
                        <input 
                          type="text" 
                          value={formData.newRouterModemSN} 
                          onChange={(e) => handleInputChange('newRouterModemSN', e.target.value)} 
                          placeholder="Enter Router Modem SN"
                          className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 ${
                            isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                          } ${errors.newRouterModemSN ? 'border-red-500' : isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}
                        />
                        {errors.newRouterModemSN && (
                          <div className="flex items-center mt-1">
                            <div className="flex items-center justify-center w-4 h-4 rounded-full bg-orange-500 text-white text-xs mr-2">!</div>
                            <p className="text-orange-500 text-xs">This entry is required</p>
                          </div>
                        )}
                      </div>
                    )}

                    {formData.repairCategory === 'Transfer LCP/NAP/PORT' && (
                      <>
                        <div>
                          <label className={`block text-sm font-medium mb-2 ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>New LCP<span className="text-red-500">*</span></label>
                          <div className="relative">
                            <select 
                              value={formData.newLcp} 
                              onChange={(e) => handleInputChange('newLcp', e.target.value)} 
                              className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 appearance-none ${
                                isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                              } ${errors.newLcp ? 'border-red-500' : isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}
                            >
                              <option value="">Select LCP</option>
                              {lcps.map((lcp) => (
                                <option key={lcp} value={lcp}>{lcp}</option>
                              ))}
                            </select>
                            <ChevronDown className={`absolute right-3 top-2.5 pointer-events-none ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-600'
                            }`} size={20} />
                          </div>
                          {errors.newLcp && (
                            <div className="flex items-center mt-1">
                              <div className="flex items-center justify-center w-4 h-4 rounded-full bg-orange-500 text-white text-xs mr-2">!</div>
                              <p className="text-orange-500 text-xs">This entry is required</p>
                            </div>
                          )}
                        </div>

                        <div>
                          <label className={`block text-sm font-medium mb-2 ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>New NAP<span className="text-red-500">*</span></label>
                          <div className="relative">
                            <select 
                              value={formData.newNap} 
                              onChange={(e) => handleInputChange('newNap', e.target.value)} 
                              className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 appearance-none ${
                                isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                              } ${errors.newNap ? 'border-red-500' : isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}
                            >
                              <option value="">Select NAP</option>
                              {naps.map((nap) => (
                                <option key={nap} value={nap}>{nap}</option>
                              ))}
                            </select>
                            <ChevronDown className={`absolute right-3 top-2.5 pointer-events-none ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-600'
                            }`} size={20} />
                          </div>
                          {errors.newNap && (
                            <div className="flex items-center mt-1">
                              <div className="flex items-center justify-center w-4 h-4 rounded-full bg-orange-500 text-white text-xs mr-2">!</div>
                              <p className="text-orange-500 text-xs">This entry is required</p>
                            </div>
                          )}
                        </div>

                        <div>
                          <label className={`block text-sm font-medium mb-2 ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>New Port<span className="text-red-500">*</span></label>
                          <div className="relative">
                            <select 
                              value={formData.newPort} 
                              onChange={(e) => handleInputChange('newPort', e.target.value)} 
                              className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 appearance-none ${
                                isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                              } ${errors.newPort ? 'border-red-500' : isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}
                            >
                              <option value="">Select Port</option>
                              {ports.map((port) => (
                                <option key={port} value={port}>{port}</option>
                              ))}
                            </select>
                            <ChevronDown className={`absolute right-3 top-2.5 pointer-events-none ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-600'
                            }`} size={20} />
                          </div>
                          {errors.newPort && (
                            <div className="flex items-center mt-1">
                              <div className="flex items-center justify-center w-4 h-4 rounded-full bg-orange-500 text-white text-xs mr-2">!</div>
                              <p className="text-orange-500 text-xs">This entry is required</p>
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {formData.repairCategory === 'Update Vlan' && (
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>New VLAN<span className="text-red-500">*</span></label>
                        <div className="relative">
                          <select 
                            value={formData.newVlan} 
                            onChange={(e) => handleInputChange('newVlan', e.target.value)} 
                            className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 appearance-none ${
                              isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                            } ${errors.newVlan ? 'border-red-500' : isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}
                          >
                            <option value="">Select VLAN</option>
                            {vlans.map((vlan) => (
                              <option key={vlan} value={vlan}>{vlan}</option>
                            ))}
                          </select>
                          <ChevronDown className={`absolute right-3 top-2.5 pointer-events-none ${
                            isDarkMode ? 'text-gray-400' : 'text-gray-600'
                          }`} size={20} />
                        </div>
                        {errors.newVlan && (
                          <div className="flex items-center mt-1">
                            <div className="flex items-center justify-center w-4 h-4 rounded-full bg-orange-500 text-white text-xs mr-2">!</div>
                            <p className="text-orange-500 text-xs">This entry is required</p>
                          </div>
                        )}
                      </div>
                    )}

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>Visit By<span className="text-red-500">*</span></label>
                      <div className="relative">
                        <select 
                          value={formData.visitBy} 
                          onChange={(e) => handleInputChange('visitBy', e.target.value)} 
                          className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 appearance-none ${
                            isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                          } ${errors.visitBy ? 'border-red-500' : isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}
                        >
                          <option value="">Select Visit By</option>
                          {technicians.map((tech) => {
                            const emailValue = (tech as any).email_address || tech.email || '';
                            return (
                              <option key={emailValue} value={emailValue}>
                                {emailValue}
                              </option>
                            );
                          })}
                        </select>
                        <ChevronDown className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" size={20} />
                      </div>
                      {errors.visitBy && (
                        <div className="flex items-center mt-1">
                          <div className="flex items-center justify-center w-4 h-4 rounded-full bg-orange-500 text-white text-xs mr-2">!</div>
                          <p className="text-orange-500 text-xs">This entry is required</p>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>Visit With</label>
                      <div className="relative">
                        <select 
                          value={formData.visitWith} 
                          onChange={(e) => handleInputChange('visitWith', e.target.value)} 
                          className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 appearance-none ${
                            isDarkMode ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300'
                          }`}
                        >
                          <option value="">Select Visit With</option>
                          {technicians.map((tech) => {
                            const emailValue = (tech as any).email_address || tech.email || '';
                            return (
                              <option key={emailValue} value={emailValue}>
                                {emailValue}
                              </option>
                            );
                          })}
                        </select>
                        <ChevronDown className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" size={20} />
                      </div>
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>Visit With Other</label>
                      <div className="relative">
                        <select 
                          value={formData.visitWithOther} 
                          onChange={(e) => handleInputChange('visitWithOther', e.target.value)} 
                          className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 appearance-none ${
                            isDarkMode ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300'
                          }`}
                        >
                          <option value="">Select Visit With Other</option>
                          {technicians.map((tech) => {
                            const emailValue = (tech as any).email_address || tech.email || '';
                            return (
                              <option key={emailValue} value={emailValue}>
                                {emailValue}
                              </option>
                            );
                          })}
                        </select>
                        <ChevronDown className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" size={20} />
                      </div>
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>Visit Remarks<span className="text-red-500">*</span></label>
                      <textarea 
                        value={formData.visitRemarks} 
                        onChange={(e) => handleInputChange('visitRemarks', e.target.value)} 
                        rows={3} 
                        className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 resize-none ${
                          isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                        } ${errors.visitRemarks ? 'border-red-500' : isDarkMode ? 'border-gray-700' : 'border-gray-300'}`} 
                      />
                      {errors.visitRemarks && (
                        <div className="flex items-center mt-1">
                          <div className="flex items-center justify-center w-4 h-4 rounded-full bg-orange-500 text-white text-xs mr-2">!</div>
                          <p className="text-orange-500 text-xs">This entry is required</p>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>Client Signature<span className="text-red-500">*</span></label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageChange('clientSignatureFile', e.target.files?.[0] || null)}
                        className="hidden"
                        id="clientSignatureInput"
                      />
                      <label
                        htmlFor="clientSignatureInput"
                        className={`relative w-full h-48 border rounded overflow-hidden cursor-pointer flex flex-col items-center justify-center ${
                          isDarkMode ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' : 'bg-gray-100 border-gray-300 hover:bg-gray-200'
                        }`}
                      >
                        {imagePreviews.clientSignatureFile ? (
                          <div className="relative w-full h-full">
                            <img 
                              src={imagePreviews.clientSignatureFile} 
                              alt="Client Signature" 
                              className="w-full h-full object-contain"
                            />
                            <div className="absolute bottom-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs flex items-center pointer-events-none">
                              <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              Uploaded
                            </div>
                          </div>
                        ) : (
                          <>
                            <svg className={`w-12 h-12 mb-2 ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-500'
                            }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                            <p className={`text-sm ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>Click to upload</p>
                          </>
                        )}
                      </label>
                      {errors.clientSignature && (
                        <div className="flex items-center mt-1">
                          <div className="flex items-center justify-center w-4 h-4 rounded-full bg-orange-500 text-white text-xs mr-2">!</div>
                          <p className="text-orange-500 text-xs">This entry is required</p>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>Item Name 1<span className="text-red-500">*</span></label>
                      <div className="relative">
                        <select 
                          value={formData.itemName1} 
                          onChange={(e) => handleInputChange('itemName1', e.target.value)} 
                          className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 appearance-none ${
                            isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                          } ${errors.itemName1 ? 'border-red-500' : isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}
                        >
                          <option value="">Select Item</option>
                          {inventoryItems.map((invItem) => (
                            <option key={invItem.id} value={invItem.item_name}>
                              {invItem.item_name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className={`absolute right-3 top-2.5 pointer-events-none ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`} size={20} />
                      </div>
                      {errors.itemName1 && (
                        <div className="flex items-center mt-1">
                          <div className="flex items-center justify-center w-4 h-4 rounded-full bg-orange-500 text-white text-xs mr-2">!</div>
                          <p className="text-orange-500 text-xs">This entry is required</p>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>Time In<span className="text-red-500">*</span></label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageChange('timeInFile', e.target.files?.[0] || null)}
                        className="hidden"
                        id="timeInInput"
                      />
                      <label
                        htmlFor="timeInInput"
                        className={`relative w-full h-48 border rounded overflow-hidden cursor-pointer flex flex-col items-center justify-center ${
                          isDarkMode ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' : 'bg-gray-100 border-gray-300 hover:bg-gray-200'
                        }`}
                      >
                        {imagePreviews.timeInFile ? (
                          <div className="relative w-full h-full">
                            <img 
                              src={imagePreviews.timeInFile} 
                              alt="Time In" 
                              className="w-full h-full object-contain"
                            />
                            <div className="absolute bottom-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs flex items-center pointer-events-none">
                              <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              Uploaded
                            </div>
                          </div>
                        ) : (
                          <>
                            <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <p className="text-gray-400 text-sm">Click to upload</p>
                          </>
                        )}
                      </label>
                      {errors.timeIn && (
                        <div className="flex items-center mt-1">
                          <div className="flex items-center justify-center w-4 h-4 rounded-full bg-orange-500 text-white text-xs mr-2">!</div>
                          <p className="text-orange-500 text-xs">This entry is required</p>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>Modem Setup Image<span className="text-red-500">*</span></label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageChange('modemSetupFile', e.target.files?.[0] || null)}
                        className="hidden"
                        id="modemSetupInput"
                      />
                      <label
                        htmlFor="modemSetupInput"
                        className={`relative w-full h-48 border rounded overflow-hidden cursor-pointer flex flex-col items-center justify-center ${
                          isDarkMode ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' : 'bg-gray-100 border-gray-300 hover:bg-gray-200'
                        }`}
                      >
                        {imagePreviews.modemSetupFile ? (
                          <div className="relative w-full h-full">
                            <img 
                              src={imagePreviews.modemSetupFile} 
                              alt="Modem Setup" 
                              className="w-full h-full object-contain"
                            />
                            <div className="absolute bottom-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs flex items-center pointer-events-none">
                              <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              Uploaded
                            </div>
                          </div>
                        ) : (
                          <>
                            <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <p className="text-gray-400 text-sm">Click to upload</p>
                          </>
                        )}
                      </label>
                      {errors.modemSetupImage && (
                        <div className="flex items-center mt-1">
                          <div className="flex items-center justify-center w-4 h-4 rounded-full bg-orange-500 text-white text-xs mr-2">!</div>
                          <p className="text-orange-500 text-xs">This entry is required</p>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>Time Out<span className="text-red-500">*</span></label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageChange('timeOutFile', e.target.files?.[0] || null)}
                        className="hidden"
                        id="timeOutInput"
                      />
                      <label
                        htmlFor="timeOutInput"
                        className={`relative w-full h-48 border rounded overflow-hidden cursor-pointer flex flex-col items-center justify-center ${
                          isDarkMode ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' : 'bg-gray-100 border-gray-300 hover:bg-gray-200'
                        }`}
                      >
                        {imagePreviews.timeOutFile ? (
                          <div className="relative w-full h-full">
                            <img 
                              src={imagePreviews.timeOutFile} 
                              alt="Time Out" 
                              className="w-full h-full object-contain"
                            />
                            <div className="absolute bottom-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs flex items-center pointer-events-none">
                              <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              Uploaded
                            </div>
                          </div>
                        ) : (
                          <>
                            <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <p className="text-gray-400 text-sm">Click to upload</p>
                          </>
                        )}
                      </label>
                      {errors.timeOut && (
                        <div className="flex items-center mt-1">
                          <div className="flex items-center justify-center w-4 h-4 rounded-full bg-orange-500 text-white text-xs mr-2">!</div>
                          <p className="text-orange-500 text-xs">This entry is required</p>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {(formData.visitStatus === 'Reschedule' || formData.visitStatus === 'Failed') && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Visit By<span className="text-red-500">*</span></label>
                      <div className="relative">
                        <select 
                          value={formData.visitBy} 
                          onChange={(e) => handleInputChange('visitBy', e.target.value)} 
                          className={`w-full px-3 py-2 bg-gray-800 border ${errors.visitBy ? 'border-red-500' : 'border-gray-700'} rounded text-white focus:outline-none focus:border-orange-500 appearance-none`}
                        >
                          <option value="">Select Visit By</option>
                          {technicians.map((tech) => (
                            <option key={tech.email} value={tech.email}>
                              {tech.email}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" size={20} />
                      </div>
                      {errors.visitBy && (
                        <div className="flex items-center mt-1">
                          <div className="flex items-center justify-center w-4 h-4 rounded-full bg-orange-500 text-white text-xs mr-2">!</div>
                          <p className="text-orange-500 text-xs">This entry is required</p>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Visit With<span className="text-red-500">*</span></label>
                      <div className="relative">
                        <select 
                          value={formData.visitWith} 
                          onChange={(e) => handleInputChange('visitWith', e.target.value)} 
                          className={`w-full px-3 py-2 bg-gray-800 border ${errors.visitWith ? 'border-red-500' : 'border-gray-700'} rounded text-white focus:outline-none focus:border-orange-500 appearance-none`}
                        >
                          <option value="">Select Visit With</option>
                          {technicians.map((tech) => (
                            <option key={tech.email} value={tech.email}>
                              {tech.email}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" size={20} />
                      </div>
                      {errors.visitWith && (
                        <div className="flex items-center mt-1">
                          <div className="flex items-center justify-center w-4 h-4 rounded-full bg-orange-500 text-white text-xs mr-2">!</div>
                          <p className="text-orange-500 text-xs">This entry is required</p>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Visit With Other<span className="text-red-500">*</span></label>
                      <div className="relative">
                        <select 
                          value={formData.visitWithOther} 
                          onChange={(e) => handleInputChange('visitWithOther', e.target.value)} 
                          className={`w-full px-3 py-2 bg-gray-800 border ${errors.visitWithOther ? 'border-red-500' : 'border-gray-700'} rounded text-white focus:outline-none focus:border-orange-500 appearance-none`}
                        >
                          <option value="">Select Visit With Other</option>
                          {technicians.map((tech) => (
                            <option key={tech.email} value={tech.email}>
                              {tech.email}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" size={20} />
                      </div>
                      {errors.visitWithOther && (
                        <div className="flex items-center mt-1">
                          <div className="flex items-center justify-center w-4 h-4 rounded-full bg-orange-500 text-white text-xs mr-2">!</div>
                          <p className="text-orange-500 text-xs">This entry is required</p>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Visit Remarks<span className="text-red-500">*</span></label>
                      <textarea 
                        value={formData.visitRemarks} 
                        onChange={(e) => handleInputChange('visitRemarks', e.target.value)} 
                        rows={3} 
                        className={`w-full px-3 py-2 bg-gray-800 border ${errors.visitRemarks ? 'border-red-500' : 'border-gray-700'} rounded text-white focus:outline-none focus:border-orange-500 resize-none`} 
                      />
                      {errors.visitRemarks && (
                        <div className="flex items-center mt-1">
                          <div className="flex items-center justify-center w-4 h-4 rounded-full bg-orange-500 text-white text-xs mr-2">!</div>
                          <p className="text-orange-500 text-xs">This entry is required</p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </>
            )}

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>Items<span className="text-red-500">*</span></label>
              {orderItems.map((item, index) => (
                <div key={index} className="mb-3">
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <div className="relative">
                        <select 
                          value={item.itemId} 
                          onChange={(e) => handleItemChange(index, 'itemId', e.target.value)} 
                          className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 appearance-none ${
                            isDarkMode ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300'
                          }`}
                        >
                          <option value="">Select Item {index + 1}</option>
                          {inventoryItems.map((invItem) => (
                            <option key={invItem.id} value={invItem.item_name}>
                              {invItem.item_name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className={`absolute right-3 top-2.5 pointer-events-none ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`} size={20} />
                      </div>
                      {errors[`item_${index}`] && (
                        <p className="text-orange-500 text-xs mt-1">{errors[`item_${index}`]}</p>
                      )}
                    </div>
                    
                    {item.itemId && (
                      <div className="w-32">
                        <input 
                          type="number" 
                          value={item.quantity} 
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} 
                          placeholder="Qty"
                          min="1"
                          className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 ${
                            isDarkMode ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300'
                          }`}
                        />
                        {errors[`quantity_${index}`] && (
                          <p className="text-orange-500 text-xs mt-1">{errors[`quantity_${index}`]}</p>
                        )}
                      </div>
                    )}
                    
                    {orderItems.length > 1 && item.itemId && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="p-2 text-red-500 hover:text-red-400"
                      >
                        <X size={20} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {errors.items && (
                <div className="flex items-center mt-1">
                  <div className="flex items-center justify-center w-4 h-4 rounded-full bg-orange-500 text-white text-xs mr-2">!</div>
                  <p className="text-orange-500 text-xs">{errors.items}</p>
                </div>
              )}
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>Concern<span className="text-red-500">*</span></label>
              <div className="relative">
                <select 
                  value={formData.concern} 
                  onChange={(e) => handleInputChange('concern', e.target.value)} 
                  className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 appearance-none ${
                    isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                  } ${errors.concern ? 'border-red-500' : isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}
                >
                  <option value="">Select Concern</option>
                  <option value="No Internet">No Internet</option>
                  <option value="Slow Internet">Slow Internet</option>
                  <option value="Intermittent Connection">Intermittent Connection</option>
                  <option value="Router Issue">Router Issue</option>
                  <option value="Billing Concern">Billing Concern</option>
                  <option value="Others">Others</option>
                </select>
                <ChevronDown className={`absolute right-3 top-2.5 pointer-events-none ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`} size={20} />
              </div>
              {errors.concern && (
                <div className="flex items-center mt-1">
                  <div className="flex items-center justify-center w-4 h-4 rounded-full bg-orange-500 text-white text-xs mr-2">!</div>
                  <p className="text-orange-500 text-xs">This entry is required</p>
                </div>
              )}
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>Concern Remarks<span className="text-red-500">*</span></label>
              <textarea 
                value={formData.concernRemarks} 
                onChange={(e) => handleInputChange('concernRemarks', e.target.value)} 
                rows={3} 
                className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 resize-none ${
                  isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                } ${errors.concernRemarks ? 'border-red-500' : isDarkMode ? 'border-gray-700' : 'border-gray-300'}`} 
              />
              {errors.concernRemarks && (
                <div className="flex items-center mt-1">
                  <div className="flex items-center justify-center w-4 h-4 rounded-full bg-orange-500 text-white text-xs mr-2">!</div>
                  <p className="text-orange-500 text-xs">This entry is required</p>
                </div>
              )}
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>Modified By</label>
              <input 
                type="email" 
                value={formData.modifiedBy} 
                readOnly 
                className={`w-full px-3 py-2 border rounded cursor-not-allowed ${
                  isDarkMode ? 'bg-gray-700 border-gray-700 text-gray-400' : 'bg-gray-100 border-gray-300 text-gray-500'
                }`} 
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>Modified Date</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={formData.modifiedDate} 
                  readOnly 
                  className={`w-full px-3 py-2 border rounded cursor-not-allowed pr-10 ${
                    isDarkMode ? 'bg-gray-700 border-gray-700 text-gray-400' : 'bg-gray-100 border-gray-300 text-gray-500'
                  }`} 
                />
                <Calendar className={`absolute right-3 top-2.5 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`} size={20} />
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>User Email</label>
              <input 
                type="email" 
                value={formData.userEmail} 
                onChange={(e) => handleInputChange('userEmail', e.target.value)} 
                className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 ${
                  isDarkMode ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300'
                }`} 
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>Support Remarks<span className="text-red-500">*</span></label>
              <textarea 
                value={formData.supportRemarks} 
                onChange={(e) => handleInputChange('supportRemarks', e.target.value)} 
                rows={3} 
                className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 resize-none ${
                  isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                } ${errors.supportRemarks ? 'border-red-500' : isDarkMode ? 'border-gray-700' : 'border-gray-300'}`} 
              />
              {errors.supportRemarks && (
                <div className="flex items-center mt-1">
                  <div className="flex items-center justify-center w-4 h-4 rounded-full bg-orange-500 text-white text-xs mr-2">!</div>
                  <p className="text-orange-500 text-xs">This entry is required</p>
                </div>
              )}
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>Service Charge<span className="text-red-500">*</span></label>
              <div className={`flex items-center border rounded ${
                isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
              }`}>
                <span className={`px-3 py-2 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>₱</span>
                <input 
                  type="number" 
                  value={formData.serviceCharge} 
                  onChange={(e) => handleInputChange('serviceCharge', e.target.value)} 
                  step="0.01"
                  className={`flex-1 px-3 py-2 bg-transparent focus:outline-none ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`} 
                />
                <div className="flex">
                  <button 
                    type="button" 
                    onClick={() => handleNumberChange('serviceCharge', false)} 
                    className={`px-3 py-2 border-l ${
                      isDarkMode ? 'text-gray-400 hover:text-white border-gray-700' : 'text-gray-600 hover:text-gray-900 border-gray-300'
                    }`}
                  >
                    <Minus size={16} />
                  </button>
                  <button 
                    type="button" 
                    onClick={() => handleNumberChange('serviceCharge', true)} 
                    className={`px-3 py-2 border-l ${
                      isDarkMode ? 'text-gray-400 hover:text-white border-gray-700' : 'text-gray-600 hover:text-gray-900 border-gray-300'
                    }`}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
              {errors.serviceCharge && (
                <div className="flex items-center mt-1">
                  <div className="flex items-center justify-center w-4 h-4 rounded-full bg-orange-500 text-white text-xs mr-2">!</div>
                  <p className="text-orange-500 text-xs">This entry is required</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {modal.isOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
            <div className={`border rounded-lg p-6 max-w-md w-full mx-4 ${
              isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
            }`}>
              {modal.type === 'loading' ? (
                <>
                  <div className="flex flex-col items-center justify-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500 mb-4"></div>
                    {modal.title === 'Uploading Images' && uploadProgress > 0 && (
                      <h3 className="text-4xl font-bold text-white">{uploadProgress}%</h3>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-center mb-4">
                    {modal.type === 'success' && (
                      <div className="rounded-full bg-green-500 p-3">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                    {modal.type === 'error' && (
                      <div className="rounded-full bg-red-500 p-3">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                    )}
                    {modal.type === 'warning' && (
                      <div className="rounded-full bg-yellow-500 p-3">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <h3 className={`text-lg font-semibold mb-4 text-center ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>{modal.title}</h3>
                  <p className={`mb-6 whitespace-pre-line text-center ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>{modal.message}</p>
                  <div className="flex items-center justify-center gap-3">
                    {modal.type === 'confirm' ? (
                      <>
                        <button
                          onClick={modal.onCancel}
                          className={`px-4 py-2 rounded transition-colors ${
                            isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-300 hover:bg-gray-400 text-gray-900'
                          }`}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={modal.onConfirm}
                          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded transition-colors"
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
                        className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded transition-colors"
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
    </>
  );
};

export default ServiceOrderEditModal;
