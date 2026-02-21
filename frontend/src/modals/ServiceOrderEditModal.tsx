import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, ScrollView, Modal, Pressable, Image, Alert, ActivityIndicator, Platform, KeyboardAvoidingView, TouchableOpacity, Keyboard } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { X, Calendar, ChevronDown, Minus, Plus, Upload, Eraser, CheckCircle, Search } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SignatureScreen from 'react-native-signature-canvas';
import * as ExpoFileSystem from 'expo-file-system';

import apiClient from '../config/api';
import { getAllInventoryItems, InventoryItem } from '../services/inventoryItemService';
import { createServiceOrderItems, ServiceOrderItem, deleteServiceOrderItems } from '../services/serviceOrderItemService';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';
import { concernService, Concern } from '../services/concernService';
import { getUsedPorts } from '../services/portService';
import { getAllLCPNAPs, LCPNAP } from '../services/lcpnapService';

import { routerModelService, RouterModel } from '../services/routerModelService';

// Define UserData interface locally if not available in '../types/api'
interface UserData {
  email?: string;
  email_address?: string;
  role?: string | { role_name: string };
  role_id?: number;
  first_name?: string;
  last_name?: string;
  username?: string;
}

interface ServiceOrderEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (formData: any) => void;
  serviceOrderData?: any;
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
  supportRemarks: string;
  serviceCharge: string;
  status: string;
  newRouterModemSN: string;
  newLcp: string;
  newNap: string;
  newPort: string;
  newVlan: string;
  routerModel: string;
  newPlan: string;

  newLcpnap: string;
  fullAddress: string;
}

interface ImageFiles {
  timeInFile: ImagePicker.ImagePickerAsset | null;
  modemSetupFile: ImagePicker.ImagePickerAsset | null;
  timeOutFile: ImagePicker.ImagePickerAsset | null;
  clientSignatureFile: ImagePicker.ImagePickerAsset | null;
}

const ServiceOrderEditModal: React.FC<ServiceOrderEditModalProps> = ({
  isOpen,
  onClose,
  onSave,
  serviceOrderData
}) => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);

  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const currentUserEmail = currentUser?.email || currentUser?.email_address || 'unknown@ampere.com';
  const isTechnician = currentUser?.role_id === 2 || (typeof currentUser?.role === 'string' && currentUser.role.toLowerCase() === 'technician') || (typeof currentUser?.role === 'object' && currentUser.role.role_name.toLowerCase() === 'technician');

  const [technicians, setTechnicians] = useState<Array<{ name: string; email: string }>>([]);
  const [lcps, setLcps] = useState<string[]>([]);
  const [naps, setNaps] = useState<string[]>([]);
  const [usedPorts, setUsedPorts] = useState<string[]>([]);
  const [totalPorts, setTotalPorts] = useState<number>(32);
  const [lcpnaps, setLcpnaps] = useState<LCPNAP[]>([]);
  const [vlans, setVlans] = useState<string[]>([]);
  const [concerns, setConcerns] = useState<Concern[]>([]);
  const [plans, setPlans] = useState<string[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [routerModels, setRouterModels] = useState<RouterModel[]>([]);

  const [orderItems, setOrderItems] = useState<OrderItem[]>([{ itemId: '', quantity: '' }]);

  const [formData, setFormData] = useState<ServiceOrderEditFormData>({
    accountNo: '',
    dateInstalled: '',
    fullName: '',
    contactNumber: '',
    emailAddress: '',
    plan: '',

    username: '',
    connectionType: '',
    routerModemSN: '',
    lcp: '',
    nap: '',
    port: '',
    vlan: '',
    supportStatus: 'In Progress',
    visitStatus: 'In Progress',
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
    supportRemarks: '',
    serviceCharge: '0.00',
    status: 'unused',
    newRouterModemSN: '',
    newLcp: '',
    newNap: '',
    newPort: '',
    newVlan: '',
    routerModel: '',
    newPlan: '',

    newLcpnap: '',
    fullAddress: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [imageFiles, setImageFiles] = useState<ImageFiles>({
    timeInFile: null,
    modemSetupFile: null,
    timeOutFile: null,
    clientSignatureFile: null
  });

  // Signature Drawing State
  const signatureRef = useRef<any>(null);
  const [isDrawingSignature, setIsDrawingSignature] = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const [itemSearch, setItemSearch] = useState('');
  const [openItemIndex, setOpenItemIndex] = useState<number | null>(null);

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
    if (!url) return false;
    return url.includes('drive.google.com') || url.includes('docs.google.com');
  };

  // Load User Data and Theme
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const theme = await AsyncStorage.getItem('theme');
        setIsDarkMode(theme !== 'light');

        const authData = await AsyncStorage.getItem('authData');
        if (authData) {
          const user = JSON.parse(authData);
          setCurrentUser(user);
        }

        const palette = await settingsColorPaletteService.getActive();
        setColorPalette(palette);
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };
    loadSettings();
  }, []);

  // UseEffects for data fetching
  useEffect(() => {
    const fetchRouterModels = async () => {
      if (isOpen) {
        try {
          const fetchedRouterModels = await routerModelService.getAllRouterModels();
          setRouterModels(fetchedRouterModels);
        } catch (error) {
          console.error('Failed to fetch router models:', error);
        }
      }
    };
    fetchRouterModels();
  }, [isOpen]);

  useEffect(() => {
    const fetchServiceOrderItems = async () => {
      if (isOpen && serviceOrderData) {
        const serviceOrderId = serviceOrderData.id;
        if (serviceOrderId) {
          try {
            const response = await apiClient.get(`/service-order-items?service_order_id=${serviceOrderId}`);
            const data = response.data;

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
            const filteredItems = response.data.filter(item => {
              const catId = item.category_id || (item as any).Category_ID || (item as any).categoryId;
              return catId === 1 || String(catId) === '1';
            });
            setInventoryItems(filteredItems);
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
        const response = await apiClient.get<{ success: boolean; data: any[] }>('/users');
        if (response.data.success && Array.isArray(response.data.data)) {
          const technicianUsers = response.data.data
            .filter(user => {
              const role = typeof user.role === 'string' ? user.role : (user.role as any)?.role_name || '';
              return role.toLowerCase() === 'technician';
            })
            .map(user => {
              const firstName = (user.first_name || '').trim();
              const lastName = (user.last_name || '').trim();
              const fullName = `${firstName} ${lastName}`.trim();
              return {
                email: user.email_address || user.email || '',
                name: fullName || user.username || user.email_address || user.email || ''
              };
            })
            .filter(tech => tech.name);
          setTechnicians(technicianUsers);
        }
      } catch (error) {
        console.error('Error fetching technicians:', error);
      }
    };

    const fetchTechnicalDetails = async () => {
      try {
        const [lcpResponse, napResponse, vlanResponse, lcpnapsRes] = await Promise.all([
          apiClient.get<{ success: boolean; data: any[] }>('/lcp'),
          apiClient.get<{ success: boolean; data: any[] }>('/nap'),
          apiClient.get<{ success: boolean; data: any[] }>('/vlan'),
          getAllLCPNAPs('', 1, 1000)
        ]);

        if (lcpResponse.data.success && Array.isArray(lcpResponse.data.data)) {
          const lcpOptions = lcpResponse.data.data.map(item => item.lcp_name || item.lcp || item.name).filter(Boolean);
          setLcps(lcpOptions as string[]);
        }

        if (napResponse.data.success && Array.isArray(napResponse.data.data)) {
          const napOptions = napResponse.data.data.map(item => item.nap_name || item.nap || item.name).filter(Boolean);
          setNaps(napOptions as string[]);
        }

        if (vlanResponse.data.success && Array.isArray(vlanResponse.data.data)) {
          const vlanOptions = vlanResponse.data.data.map(item => item.value).filter(Boolean);
          setVlans(vlanOptions as string[]);
        }

        // Plans
        const planResponse = await apiClient.get<{ success: boolean; data: any[] }>('/plans');
        if (planResponse.data.success && Array.isArray(planResponse.data.data)) {
          setPlans(planResponse.data.data.map((p: any) => p.plan_name || p.name).filter(Boolean));
        }

        if (lcpnapsRes.success && Array.isArray(lcpnapsRes.data)) {
          setLcpnaps(lcpnapsRes.data);
        }
      } catch (error) {
        console.error('Error fetching technical details:', error);
      }
    };

    const fetchConcerns = async () => {
      try {
        const data = await concernService.getAllConcerns();
        setConcerns(data);
      } catch (error) {
        console.error('Error fetching concerns:', error);
      }
    };

    if (isOpen) {
      fetchTechnicians();
      fetchTechnicalDetails();
      fetchConcerns();
    }
  }, [isOpen]);




  // Used Ports Effect
  useEffect(() => {
    const fetchUsedPortsFunc = async () => {
      if (isOpen && formData.newLcpnap) {
        try {
          const serviceOrderId = serviceOrderData?.id;

          // Also fetch total ports for this LCP-NAP
          const lcpnapsRes = await getAllLCPNAPs(formData.newLcpnap, 1, 1);
          if (lcpnapsRes.success && Array.isArray(lcpnapsRes.data) && lcpnapsRes.data.length > 0) {
            const match = lcpnapsRes.data.find((item: any) => item.lcpnap_name === formData.newLcpnap);
            if (match) {
              setTotalPorts(match.port_total || 32);
            }
          }

          const usedRes = await getUsedPorts(formData.newLcpnap, serviceOrderId);

          if (usedRes.success && usedRes.data) {
            setUsedPorts(usedRes.data.used);
            if (!totalPorts) setTotalPorts(usedRes.data.total);
          } else {
            setUsedPorts([]);
            if (!totalPorts) setTotalPorts(32);
          }
        } catch (error) {
          console.error('Error fetching used ports/location:', error);
          setUsedPorts([]);
          setTotalPorts(32);
        }
      } else {
        setUsedPorts([]);
        setTotalPorts(32);
      }
    };
    fetchUsedPortsFunc();
  }, [isOpen, formData.newLcpnap, serviceOrderData?.id]);

  // Initialize Form Data
  useEffect(() => {
    if (serviceOrderData && isOpen) {
      // Helper to format date for input if needed
      const formatDateForInput = (dateStr?: string): string => {
        if (!dateStr) return '';
        try {
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) return '';
          return date.toISOString().split('T')[0];
        } catch (e) { return ''; }
      };

      const normalizePort = (rawPort: any) => {
        if (!rawPort) return '';
        const portNum = String(rawPort).toUpperCase().replace(/[^\d]/g, '');
        return portNum ? `P${portNum.padStart(2, '0')}` : '';
      };

      setFormData(prev => ({
        ...prev,
        accountNo: serviceOrderData.accountNumber || serviceOrderData.account_no || '',
        dateInstalled: formatDateForInput(serviceOrderData.dateInstalled || serviceOrderData.date_installed),
        fullName: serviceOrderData.fullName || serviceOrderData.full_name || '',
        contactNumber: serviceOrderData.contactNumber || serviceOrderData.contact_number || '',
        emailAddress: serviceOrderData.emailAddress || serviceOrderData.email_address || '',
        plan: serviceOrderData.plan || '',

        username: serviceOrderData.username || '',
        connectionType: serviceOrderData.connectionType || serviceOrderData.connection_type || '',
        routerModemSN: serviceOrderData.routerModemSN || serviceOrderData.router_modem_sn || '',
        lcp: serviceOrderData.lcp || '',
        nap: serviceOrderData.nap || '',
        port: normalizePort(serviceOrderData.port || serviceOrderData.PORT),
        vlan: serviceOrderData.vlan || '',
        supportStatus: (serviceOrderData.supportStatus || serviceOrderData.support_status) === 'Pending'
          ? 'In Progress'
          : (serviceOrderData.supportStatus || serviceOrderData.support_status || 'In Progress'),
        visitStatus: serviceOrderData.visitStatus || serviceOrderData.visit_status === 'Pending' ? 'In Progress' : (serviceOrderData.visitStatus || serviceOrderData.visit_status || 'In Progress'),
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
        supportRemarks: serviceOrderData.supportRemarks || serviceOrderData.support_remarks || '',
        newPlan: serviceOrderData.new_plan || '',
        serviceCharge: serviceOrderData.serviceCharge ? serviceOrderData.serviceCharge.toString().replace('₱', '').trim() : (serviceOrderData.service_charge ? serviceOrderData.service_charge.toString().replace('₱', '').trim() : '0.00'),
        status: serviceOrderData.status || 'unused',
        newRouterModemSN: '',
        newLcp: '',
        newNap: '',
        newPort: '',
        newVlan: '',

        routerModel: '',
        fullAddress: serviceOrderData.fullAddress || serviceOrderData.full_address || ''
      }));
    }
  }, [serviceOrderData, isOpen, currentUserEmail]);

  const handleInputChange = (field: keyof ServiceOrderEditFormData, value: string) => {
    setFormData(prev => {
      const newState = { ...prev, [field]: value };
      if (field === 'newLcp' || field === 'newNap' || field === 'newLcpnap') {
        newState.newPort = '';
      }

      return newState;
    });
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleImageChange = async (field: keyof ImageFiles) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageFiles(prev => ({ ...prev, [field]: result.assets[0] }));
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadImageToGoogleDrive = async (asset: ImagePicker.ImagePickerAsset | { uri: string; mimeType?: string }): Promise<string> => {
    const formData = new FormData();
    const randomName = Math.random().toString(36).substring(7);
    const filename = asset.uri.split('/').pop() || `signature_${randomName}.png`;
    const fileType = (asset as any).mimeType || 'image/png';

    formData.append('file', {
      uri: asset.uri,
      name: filename,
      type: fileType,
    } as any);

    const response = await apiClient.post('/google-drive/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    if (response.data.success && response.data.data?.url) {
      return response.data.data.url;
    }
    throw new Error('Upload failed');
  };

  // Signature handlers
  const handleSignatureOK = async (signature: string) => {
    // signature is a base64 string provided by the component
    setIsDrawingSignature(false);
    setScrollEnabled(true);

    // Save base64 to a temporary file because upload expects URI
    try {
      const path = `${(ExpoFileSystem as any).cacheDirectory}signature_${Date.now()}.png`;
      // Remove data:image/png;base64, prefix
      const base64Code = signature.replace('data:image/png;base64,', '');

      await (ExpoFileSystem as any).writeAsStringAsync(path, base64Code, {
        encoding: (ExpoFileSystem as any).EncodingType.Base64,
      });

      // Set into state logic similar to other images
      // We'll treat it as clientSignatureFile
      const asset = {
        uri: path,
        mimeType: 'image/png',
        width: 500, // Dummy dimensions
        height: 200
      } as ImagePicker.ImagePickerAsset;

      setImageFiles(prev => ({ ...prev, clientSignatureFile: asset }));
      // Also update form data previews if needed, but we rely on imageFiles for upload
    } catch (e) {
      console.error('Error handling signature:', e);
      Alert.alert('Error', 'Failed to save signature');
    }
  };

  const handleSignatureClear = () => {
    if (signatureRef.current) {
      signatureRef.current.clearSignature();
    }
    // Also clear stored file
    setImageFiles(prev => ({ ...prev, clientSignatureFile: null }));
    setFormData(prev => ({ ...prev, clientSignature: '' }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Only validate fields if they are both visible and editable.
    // Read-only fields (accountNo, fullName, etc.) are removed from validation
    // to prevent blocking the user if the backend data is missing or incomplete.

    if (!formData.supportStatus) {
      newErrors.supportStatus = 'Support Status is required';
    }

    if (!formData.concern) {
      newErrors.concern = 'Concern is required';
    }

    if (formData.concern === 'Upgrade/Downgrade Plan' && !formData.newPlan) {
      newErrors.newPlan = 'New Plan is required';
    }

    // Only validate visit-related fields if supportStatus is 'For Visit'
    if (formData.supportStatus === 'For Visit') {
      if (!formData.assignedEmail) {
        newErrors.assignedEmail = 'Assigned Email is required';
      }

      // Logic matches conditional rendering in the ScrollView
      if (formData.visitStatus === 'Done') {
        const validItems = orderItems.filter(item => item.itemId && item.quantity);
        if (validItems.length === 0) {
          newErrors.items = 'At least one item required';
        }

        if (!formData.visitBy) {
          newErrors.visitBy = 'Visit By is required';
        }

        // Technical fields for specific relocation categories
        const relocationCategories = ['Migrate', 'Relocate', 'Transfer LCP/NAP/PORT'];
        if (relocationCategories.includes(formData.repairCategory)) {
          if (formData.repairCategory === 'Migrate' && !formData.newRouterModemSN) {
            newErrors.newRouterModemSN = 'New Router Modem SN is required';
          }
          if (!formData.newLcpnap) newErrors.newLcpnap = 'New LCP-NAP is required';
          if (!formData.newPort) newErrors.newPort = 'New Port is required';
          if (!formData.routerModel) newErrors.routerModel = 'Router Model is required';
        }

        if (formData.repairCategory === 'Replace Router' && !formData.newRouterModemSN) {
          newErrors.newRouterModemSN = 'New Router Modem SN is required';
        }
      } else if (formData.visitStatus === 'Reschedule' || formData.visitStatus === 'Failed') {
        if (!formData.visitBy) {
          newErrors.visitBy = 'Visit By is required';
        }
        // These are specifically marked as required in the UI for Failure/Reschedule scenarios
        if (!formData.visitWith) {
          newErrors.visitWith = 'Visit With is required';
        }
        if (!formData.visitWithOther) {
          newErrors.visitWithOther = 'Visit With Other is required';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
    setLoading(true);

    if (!validateForm()) {
      setLoading(false);
      Alert.alert('Validation Error', 'Please fill in all required fields.');
      return;
    }

    try {
      // SmartOLT Validation Logic
      if (updatedFormData.connectionType === 'Fiber') {
        // Validate New Router Modem SN if provided
        const isNewModemSnVisible = updatedFormData.visitStatus === 'Done' &&
          (updatedFormData.repairCategory === 'Migrate' || updatedFormData.repairCategory === 'Replace Router');

        if (isNewModemSnVisible && updatedFormData.newRouterModemSN?.trim()) {
          try {
            console.log('[SMARTOLT VALIDATION] Validating New Modem SN:', updatedFormData.newRouterModemSN);
            const smartOltResponse = await apiClient.get('/smart-olt/validate-sn', {
              params: { sn: updatedFormData.newRouterModemSN }
            });

            if (!(smartOltResponse.data as any).success) {
              setLoading(false);
              const errorMessage = (smartOltResponse.data as any).message || 'Invalid New Modem SN';
              setErrors(prev => ({ ...prev, newRouterModemSN: errorMessage }));
              Alert.alert('SmartOLT Verification Failed', errorMessage);
              return;
            }
          } catch (error: any) {
            console.error('[SMARTOLT VALIDATION] API Error:', error);
            setLoading(false);
            const errorMessage = error.response?.data?.message || 'Failed to validate New Modem SN with SmartOLT system.';
            setErrors(prev => ({ ...prev, newRouterModemSN: errorMessage }));
            Alert.alert('Validation Error', errorMessage);
            return;
          }
        }
      }

      const serviceOrderId = serviceOrderData?.id;
      if (!serviceOrderId) throw new Error('Missing Service Order ID');

      // Upload Images
      const uploadedUrls: any = {};
      const fileKeys: (keyof ImageFiles)[] = ['timeInFile', 'modemSetupFile', 'timeOutFile', 'clientSignatureFile'];
      const urlKeys = {
        timeInFile: 'image1_url',
        modemSetupFile: 'image2_url',
        timeOutFile: 'image3_url',
        clientSignatureFile: 'client_signature_url'
      };

      for (const key of fileKeys) {
        if (imageFiles[key]) {
          uploadedUrls[urlKeys[key]] = await uploadImageToGoogleDrive(imageFiles[key]!);
        }
      }

      // Update Service Order
      const updateData: any = {
        account_no: updatedFormData.accountNo,
        date_installed: updatedFormData.dateInstalled,
        full_name: updatedFormData.fullName,
        contact_number: updatedFormData.contactNumber,
        email_address: updatedFormData.emailAddress,
        plan: updatedFormData.plan,
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
        visit_with_other: updatedFormData.visitWithOther,
        visit_remarks: updatedFormData.visitRemarks,
        client_signature: uploadedUrls.client_signature_url || updatedFormData.clientSignature,
        item_name_1: updatedFormData.itemName1,
        image1_url: uploadedUrls.image1_url || updatedFormData.timeIn,
        image2_url: uploadedUrls.image2_url || updatedFormData.modemSetupImage,
        image3_url: uploadedUrls.image3_url || updatedFormData.timeOut,
        assigned_email: updatedFormData.assignedEmail,
        concern: updatedFormData.concern,
        concern_remarks: updatedFormData.concernRemarks,
        updated_by: currentUserEmail,
        updated_date: updatedFormData.modifiedDate,
        support_remarks: updatedFormData.supportRemarks,
        service_charge: parseFloat(updatedFormData.serviceCharge),
        status: updatedFormData.status,
        new_router_modem_sn: updatedFormData.newRouterModemSN,
        new_lcpnap: updatedFormData.newLcpnap,
        new_port: updatedFormData.newPort,
        new_vlan: updatedFormData.newVlan,
        router_model: updatedFormData.routerModel,
        new_plan: updatedFormData.newPlan
      };

      const response = await apiClient.put(`/service-orders/${serviceOrderId}`, updateData);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Service order update failed');
      }

      // Save Items
      const validItems = orderItems.filter(i => i.itemId && i.itemId.trim() !== '');
      if (validItems.length > 0) {
        try {
          const existing = await apiClient.get(`/service-order-items?service_order_id=${serviceOrderId}`);
          if (existing.data.success && existing.data.data.length > 0) {
            for (const item of existing.data.data) {
              try {
                await apiClient.delete(`/service-order-items/${item.id}`);
              } catch (e) { }
            }
          }
        } catch (e) { }

        const newItems: ServiceOrderItem[] = validItems.map(i => ({
          service_order_id: parseInt(serviceOrderId),
          item_name: i.itemId,
          quantity: parseInt(i.quantity) || 1
        }));
        await createServiceOrderItems(newItems);
      }

      let successMessage = 'Service Order updated successfully!';

      // Reconnection Messages
      if (response.data.reconnect_status === 'success') {
        if (updatedFormData.concern === 'Upgrade/Downgrade Plan') {
          successMessage = 'Plan upgraded and User reconnected successfully!';
        } else {
          successMessage = 'Service Order updated and User reconnected successfully!';
        }
      } else if (response.data.reconnect_status === 'balance_positive') {
        successMessage = 'Service Order updated. Reconnection skipped: Account has a remaining balance.';
      } else if (response.data.reconnect_status === 'failed') {
        successMessage = 'Service Order updated, but reconnection failed. Please check technical details.';
      }

      // Migration / Relocation Messages
      if (response.data.migration_status === 'success') {
        successMessage += '\n\nRADIUS account updated/relocated successfully!';
      } else if (response.data.migration_status === 'failed') {
        successMessage += '\n\nWarning: Failed to update RADIUS account for relocation.';
      }

      // Pullout Messages
      if (response.data.pullout_status === 'success') {
        successMessage += '\n\nRADIUS account disabled for pullout.';
      }

      onSave(updatedFormData);
      Alert.alert('Success', successMessage);
      onClose();

    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', error.message || 'Failed to update service order');
    } finally {
      setLoading(false);
    }
  };

  const handleItemChange = (index: number, field: keyof OrderItem, value: string) => {
    const newItems = [...orderItems];
    newItems[index][field] = value;
    setOrderItems(newItems);
    if (field === 'itemId' && value && index === orderItems.length - 1) {
      setOrderItems([...newItems, { itemId: '', quantity: '' }]);
    }
  };

  // Render Helpers
  const activeColor = colorPalette?.primary || '#ea580c';

  const renderLabel = (text: string, required = false) => (
    <Text className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
      {text} {required && <Text className="text-red-500">*</Text>}
    </Text>
  );

  const renderInput = (
    field: keyof ServiceOrderEditFormData,
    placeholder: string,
    editable = true,
    keyboardType: 'default' | 'numeric' | 'email-address' = 'default'
  ) => (
    <View className="mb-4">
      {renderLabel(placeholder.replace('Enter ', ''), !editable && field !== 'dateInstalled' ? false : true)}
      <TextInput
        className={`border rounded-lg p-3 text-base ${!editable
          ? (isDarkMode ? 'bg-gray-700 text-gray-400 border-gray-600' : 'bg-gray-100 text-gray-500 border-gray-200')
          : (isDarkMode ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300')
          } ${errors[field] ? 'border-red-500' : ''}`}
        value={String(formData[field])}
        onChangeText={(text) => handleInputChange(field, text)}
        placeholder={placeholder}
        placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
        editable={editable}
        keyboardType={keyboardType}
      />
      {errors[field] && (
        <Text className="text-red-500 text-xs mt-1">{errors[field]}</Text>
      )}
    </View>
  );

  const renderPicker = (
    field: keyof ServiceOrderEditFormData,
    items: string[],
    label: string,
    enabled = true
  ) => (
    <View className="mb-4">
      {renderLabel(label)}
      <View className={`border rounded-lg overflow-hidden ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-white'}`}>
        <Picker
          selectedValue={formData[field]}
          onValueChange={(val) => handleInputChange(field, val)}
          enabled={enabled}
          dropdownIconColor={isDarkMode ? '#fff' : '#000'}
          style={{ color: isDarkMode ? '#fff' : '#000' }}
        >
          <Picker.Item label={`Select ${label}`} value="" color={isDarkMode ? '#9ca3af' : '#6b7280'} />
          {items.map((item, idx) => (
            <Picker.Item key={idx} label={item} value={item} color={isDarkMode ? '#fff' : '#000'} />
          ))}
        </Picker>
      </View>
    </View>
  );

  const renderLcpNapPicker = () => (
    <View className="mb-4">
      {renderLabel('New LCP-NAP', true)}
      <View className={`border rounded-lg overflow-hidden ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-white'}`}>
        <Picker
          selectedValue={formData.newLcpnap}
          onValueChange={(val) => handleInputChange('newLcpnap', val)}
          dropdownIconColor={isDarkMode ? '#fff' : '#000'}
          style={{ color: isDarkMode ? '#fff' : '#000' }}
        >
          <Picker.Item label="Select LCP-NAP" value="" color={isDarkMode ? '#9ca3af' : '#6b7280'} />
          {lcpnaps.map((item) => (
            <Picker.Item key={item.id} label={item.lcpnap_name} value={item.lcpnap_name} color={isDarkMode ? '#fff' : '#000'} />
          ))}
        </Picker>
      </View>
    </View>
  );

  const renderNewPortPicker = () => {
    // Generate ports based on totalPorts
    const ports = Array.from({ length: totalPorts }, (_, i) => {
      const portVal = `P${(i + 1).toString().padStart(2, '0')}`;
      return portVal;
    });

    return (
      <View className="mb-4">
        {renderLabel('New Port', true)}
        <View className={`border rounded-lg overflow-hidden ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-white'}`}>
          <Picker
            selectedValue={formData.newPort}
            onValueChange={(val) => handleInputChange('newPort', val)}
            dropdownIconColor={isDarkMode ? '#fff' : '#000'}
            style={{ color: isDarkMode ? '#fff' : '#000' }}
          >
            <Picker.Item label="Select Port" value="" color={isDarkMode ? '#9ca3af' : '#6b7280'} />
            {ports.map((port) => {
              const isUsed = usedPorts.some(up => up.toUpperCase() === port.toUpperCase());
              const isSelected = formData.newPort.toUpperCase() === port.toUpperCase();
              if (isUsed && !isSelected) return null; // Hide used ports unless selected
              return <Picker.Item key={port} label={port} value={port} color={isDarkMode ? '#fff' : '#000'} />;
            })}
          </Picker>
        </View>
      </View>
    );
  };

  if (!isOpen) return null;

  return (
    <Modal
      visible={isOpen}
      transparent={true}
      animationType="slide"
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <View className={`h-[95%] w-full shadow-2xl rounded-t-3xl overflow-hidden flex-col ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>

          {/* Header */}
          <View className={`px-6 py-4 flex-row items-center justify-between border-b ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'}`}>
            <View className="flex-row items-center space-x-3">
              <Text className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {serviceOrderData?.ticket_id || serviceOrderData?.id} | {formData.fullName}
              </Text>
            </View>
            <View className="flex-row items-center space-x-3 gap-2">
              <Pressable
                onPress={onClose}
                className="px-4 py-2 border rounded-lg"
                style={{ borderColor: activeColor }}
              >
                <Text style={{ color: activeColor }} className="text-sm font-medium">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSave}
                disabled={loading}
                className="px-6 py-2 rounded-lg"
                style={{ backgroundColor: loading ? (isDarkMode ? '#4b5563' : '#9ca3af') : activeColor }}
              >
                {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text className="text-white text-sm font-medium">Save</Text>}
              </Pressable>
            </View>
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
          >
            <ScrollView
              className="flex-1 p-6"
              contentContainerStyle={{ paddingBottom: 40 }}
              scrollEnabled={scrollEnabled}
              keyboardShouldPersistTaps="handled"
            >
              <View className="space-y-4">

                {renderInput('accountNo', 'Account No', false)}
                {renderInput('dateInstalled', 'Date Installed', false)}

                {renderInput('fullName', 'Full Name', false)}
                {renderInput('contactNumber', 'Contact Number', false)}
                {renderInput('emailAddress', 'Email Address', false)}
                {renderInput('plan', 'Plan', false)}
                {renderInput('username', 'Username', false)}

                <View className="mb-4">
                  <Text className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Full Address</Text>
                  <TextInput
                    value={formData.fullAddress}
                    editable={false}
                    multiline={true}
                    numberOfLines={2}
                    placeholderTextColor={isDarkMode ? '#9CA3AF' : '#4B5563'}
                    className={`w-full px-3 py-2 border rounded-lg opacity-75 ${isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-gray-300'
                      : 'bg-gray-100 border-gray-300 text-gray-600'
                      }`}
                  />
                </View>

                {/* Connection Type */}
                <View className="mb-4">
                  <Text className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Connection Type</Text>
                  <View className="flex-row gap-2">
                    <Pressable
                      onPress={() => handleInputChange('connectionType', 'Fiber')}
                      className={`px-4 py-2 rounded-lg border ${formData.connectionType === 'Fiber' ? '' : (isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-white')}`}
                      style={formData.connectionType === 'Fiber' ? { backgroundColor: activeColor, borderColor: activeColor } : {}}
                    >
                      <Text style={{ color: formData.connectionType === 'Fiber' ? '#fff' : (isDarkMode ? '#fff' : '#000') }}>Fiber</Text>
                    </Pressable>
                  </View>
                </View>

                {renderInput('routerModemSN', 'Router/Modem SN', false)}
                {renderInput('lcp', 'LCP', false)}
                {renderInput('nap', 'NAP', false)}
                {renderInput('port', 'PORT', false)}
                {renderInput('vlan', 'VLAN', false)}

                {renderPicker('supportStatus', ['Resolved', 'Failed', 'In Progress', 'For Visit'], 'Support Status')}

                {formData.supportStatus === 'For Visit' && (
                  <>
                    {renderPicker('visitStatus', ['Done', 'In Progress', 'Failed', 'Reschedule'], 'Visit Status')}

                    <View className="mb-4">
                      {renderLabel('Assigned Email', true)}
                      <View className={`border rounded-lg overflow-hidden ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-white'}`}>
                        <Picker
                          selectedValue={formData.assignedEmail}
                          onValueChange={(val) => handleInputChange('assignedEmail', val)}
                          dropdownIconColor={isDarkMode ? '#fff' : '#000'}
                          style={{ color: isDarkMode ? '#fff' : '#000' }}
                        >
                          <Picker.Item label="Select Technician" value="" color={isDarkMode ? '#9ca3af' : '#6b7280'} />
                          {technicians.map((t, i) => (
                            <Picker.Item key={i} label={t.name} value={t.email} color={isDarkMode ? '#fff' : '#000'} />
                          ))}
                        </Picker>
                      </View>
                    </View>

                    {formData.visitStatus === 'Done' && (
                      <>
                        {renderPicker('repairCategory', ['Fiber Relaying', 'Migrate', 'others', 'Pullout', 'Reboot/Reconfig Router', 'Relocate Router', 'Relocate', 'Replace Patch Cord', 'Replace Router', 'Resplice', 'Transfer LCP/NAP/PORT', 'Update Vlan'], 'Repair Category')}

                        {(formData.repairCategory === 'Migrate' || formData.repairCategory === 'Relocate' || formData.repairCategory === 'Transfer LCP/NAP/PORT') && (
                          <>
                            {formData.repairCategory === 'Migrate' && renderInput('newRouterModemSN', 'New Router SN')}
                            {renderLcpNapPicker()}
                            {renderNewPortPicker()}
                            {renderPicker('newVlan', vlans, 'New VLAN')}

                            {/* Router Model Picker */}
                            <View className="mb-4">
                              {renderLabel('Router Model', true)}
                              <View className={`border rounded-lg overflow-hidden ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-white'}`}>
                                <Picker
                                  selectedValue={formData.routerModel}
                                  onValueChange={(val) => handleInputChange('routerModel', val)}
                                  dropdownIconColor={isDarkMode ? '#fff' : '#000'}
                                  style={{ color: isDarkMode ? '#fff' : '#000' }}
                                >
                                  <Picker.Item label="Select Router Model" value="" color={isDarkMode ? '#9ca3af' : '#6b7280'} />
                                  {routerModels.map((rm, i) => (
                                    <Picker.Item key={i} label={rm.model} value={rm.model} color={isDarkMode ? '#fff' : '#000'} />
                                  ))}
                                </Picker>
                              </View>
                            </View>
                          </>
                        )}
                        {(formData.repairCategory === 'Replace Router' || formData.repairCategory === 'Relocate Router') && (
                          <>
                            {formData.repairCategory === 'Replace Router' && renderInput('newRouterModemSN', 'New Router SN')}
                          </>
                        )}
                        {formData.repairCategory === 'Update Vlan' && renderPicker('newVlan', vlans, 'New VLAN')}

                        {/* Visit By */}
                        <View className="mb-4">
                          {renderLabel('Visit By', true)}
                          <View className={`border rounded-lg overflow-hidden ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-white'}`}>
                            <Picker
                              selectedValue={formData.visitBy}
                              onValueChange={(val) => handleInputChange('visitBy', val)}
                              dropdownIconColor={isDarkMode ? '#fff' : '#000'}
                              style={{ color: isDarkMode ? '#fff' : '#000' }}
                            >
                              <Picker.Item label="Select Visit By" value="" color={isDarkMode ? '#9ca3af' : '#6b7280'} />
                              {technicians.filter(t => t.name !== formData.visitWith && t.name !== formData.visitWithOther).map((t, i) => (
                                <Picker.Item key={i} label={t.name} value={t.name} color={isDarkMode ? '#fff' : '#000'} />
                              ))}
                            </Picker>
                          </View>
                        </View>

                        {/* Visit With */}
                        <View className="mb-4">
                          {renderLabel('Visit With')}
                          <View className={`border rounded-lg overflow-hidden ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-white'}`}>
                            <Picker
                              selectedValue={formData.visitWith}
                              onValueChange={(val) => handleInputChange('visitWith', val)}
                              dropdownIconColor={isDarkMode ? '#fff' : '#000'}
                              style={{ color: isDarkMode ? '#fff' : '#000' }}
                            >
                              <Picker.Item label="Select Visit With" value="" color={isDarkMode ? '#9ca3af' : '#6b7280'} />
                              <Picker.Item label="None" value="None" color={isDarkMode ? '#fff' : '#000'} />
                              {technicians.filter(t => t.name !== formData.visitBy && t.name !== formData.visitWithOther).map((t, i) => (
                                <Picker.Item key={i} label={t.name} value={t.name} color={isDarkMode ? '#fff' : '#000'} />
                              ))}
                            </Picker>
                          </View>
                        </View>

                        {/* Visit With Other */}
                        <View className="mb-4">
                          {renderLabel('Visit With Other')}
                          <View className={`border rounded-lg overflow-hidden ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-white'}`}>
                            <Picker
                              selectedValue={formData.visitWithOther}
                              onValueChange={(val) => handleInputChange('visitWithOther', val)}
                              dropdownIconColor={isDarkMode ? '#fff' : '#000'}
                              style={{ color: isDarkMode ? '#fff' : '#000' }}
                            >
                              <Picker.Item label="Select Visit With Other" value="" color={isDarkMode ? '#9ca3af' : '#6b7280'} />
                              <Picker.Item label="None" value="None" color={isDarkMode ? '#fff' : '#000'} />
                              {technicians.filter(t => t.name !== formData.visitBy && t.name !== formData.visitWith).map((t, i) => (
                                <Picker.Item key={i} label={t.name} value={t.name} color={isDarkMode ? '#fff' : '#000'} />
                              ))}
                            </Picker>
                          </View>
                        </View>

                        {renderInput('visitRemarks', 'Visit Remarks')}

                        <View className="mb-4 z-50">
                          {renderLabel('Client Signature')}
                          {!isDrawingSignature ? (
                            <View>
                              <Pressable
                                onPress={() => setIsDrawingSignature(true)}
                                className={`h-40 border border-dashed rounded-lg items-center justify-center mb-2 ${isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-400 bg-gray-50'}`}
                              >
                                {imageFiles.clientSignatureFile || formData.clientSignature ? (
                                  <Image source={{ uri: imageFiles.clientSignatureFile?.uri || formData.clientSignature }} style={{ width: '100%', height: '100%', resizeMode: 'contain' }} />
                                ) : (
                                  <View className="items-center">
                                    <Text className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Tap to Draw Signature</Text>
                                  </View>
                                )}
                              </Pressable>
                              {imageFiles.clientSignatureFile && (
                                <Pressable onPress={handleSignatureClear} className="self-end px-3 py-1 bg-red-500 rounded-md">
                                  <Text className="text-white text-xs">Clear Signature</Text>
                                </Pressable>
                              )}
                            </View>
                          ) : (
                            <View className="h-60 border border-gray-500 bg-white mb-2">
                              <SignatureScreen
                                ref={signatureRef}
                                onOK={handleSignatureOK}
                                onBegin={() => setScrollEnabled(false)}
                                onEnd={() => setScrollEnabled(true)}
                                onEmpty={() => console.log('Empty signature')}
                                descriptionText="Sign above"
                                clearText="Clear"
                                confirmText="Save"
                                webStyle={`.m-signature-pad--footer {display: flex; flex-direction: row; justify-content: space-between; margin-top: 10px;} .m-signature-pad--body {border: 1px solid #ccc;}`}
                              />
                              <Pressable
                                onPress={() => {
                                  setIsDrawingSignature(false);
                                  setScrollEnabled(true);
                                }}
                                className="absolute top-2 right-2 p-1 bg-gray-200 rounded-full z-10"
                              >
                                <X size={20} color="#000" />
                              </Pressable>
                            </View>
                          )}
                        </View>

                        <View className="mb-4">
                          {renderLabel('Items', true)}
                          {orderItems.map((item, idx) => (
                            <View key={idx} className="z-10 mb-4">
                              <View className="flex-row gap-2 items-start">
                                <View className="flex-1 relative">
                                  <Pressable
                                    onPress={() => setOpenItemIndex(openItemIndex === idx ? null : idx)}
                                    className={`flex-row items-center justify-between p-3 border rounded-lg ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-white'}`}
                                  >
                                    <Text className={`text-base ${item.itemId ? (isDarkMode ? 'text-white' : 'text-gray-900') : (isDarkMode ? 'text-gray-400' : 'text-gray-500')}`}>
                                      {item.itemId || 'Select Item'}
                                    </Text>
                                    <ChevronDown size={20} color={isDarkMode ? '#9ca3af' : '#6b7280'} />
                                  </Pressable>

                                  {openItemIndex === idx && (
                                    <View
                                      className={`absolute top-full left-0 right-0 mt-1 rounded-xl shadow-2xl border z-[999] overflow-hidden ${isDarkMode ? 'bg-gray-800 border-gray-700 shadow-black' : 'bg-white border-gray-200 shadow-gray-400'}`}
                                      style={{ elevation: 1000 }}
                                    >
                                      <View className={`px-4 py-3 border-b flex-row items-center space-x-2 ${isDarkMode ? 'border-gray-700 bg-gray-900/50' : 'border-gray-100 bg-gray-50'}`}>
                                        <Search size={18} color={isDarkMode ? '#9ca3af' : '#6b7280'} />
                                        <TextInput
                                          className={`flex-1 text-sm p-0 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                                          placeholder="Search items..."
                                          placeholderTextColor={isDarkMode ? '#6b7280' : '#9ca3af'}
                                          value={itemSearch}
                                          onChangeText={setItemSearch}
                                          autoFocus
                                        />
                                        {itemSearch !== '' && (
                                          <Pressable onPress={() => setItemSearch('')}>
                                            <X size={18} color={isDarkMode ? '#9ca3af' : '#6b7280'} />
                                          </Pressable>
                                        )}
                                      </View>

                                      <ScrollView
                                        style={{ maxHeight: 250 }}
                                        keyboardShouldPersistTaps="always"
                                        nestedScrollEnabled={true}
                                      >
                                        <Pressable
                                          className={`px-4 py-3 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'} ${item.itemId === 'None' ? (isDarkMode ? 'bg-orange-600/20' : 'bg-orange-50') : ''}`}
                                          onPress={() => {
                                            handleItemChange(idx, 'itemId', 'None');
                                            setOpenItemIndex(null);
                                            setItemSearch('');
                                            Keyboard.dismiss();
                                          }}
                                        >
                                          <View className="flex-row items-center justify-between">
                                            <Text className={`text-sm ${item.itemId === 'None' ? 'text-orange-500 font-medium' : (isDarkMode ? 'text-gray-200' : 'text-gray-700')}`}>
                                              None
                                            </Text>
                                            {item.itemId === 'None' && (
                                              <View className="w-2 h-2 rounded-full bg-orange-500" />
                                            )}
                                          </View>
                                        </Pressable>

                                        {inventoryItems
                                          .filter(invItem => invItem.item_name.toLowerCase().includes(itemSearch.toLowerCase()))
                                          .map((invItem) => (
                                            <Pressable
                                              key={invItem.id}
                                              className={`px-4 py-3 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'} ${item.itemId === invItem.item_name ? (isDarkMode ? 'bg-orange-600/20' : 'bg-orange-50') : ''}`}
                                              onPress={() => {
                                                handleItemChange(idx, 'itemId', invItem.item_name);
                                                setOpenItemIndex(null);
                                                setItemSearch('');
                                                Keyboard.dismiss();
                                              }}
                                            >
                                              <View className="flex-row items-center justify-between">
                                                <Text className={`text-sm flex-1 mr-2 ${item.itemId === invItem.item_name ? 'text-orange-500 font-medium' : (isDarkMode ? 'text-gray-200' : 'text-gray-700')}`}>
                                                  {invItem.item_name}
                                                </Text>
                                                <View className="flex-row items-center gap-2">
                                                  {(invItem.image_url || (invItem as any).image) && (
                                                    <Image
                                                      source={{ uri: convertGoogleDriveUrl(invItem.image_url || (invItem as any).image) || undefined }}
                                                      className="w-12 h-12 rounded-lg bg-gray-100"
                                                      resizeMode="cover"
                                                    />
                                                  )}
                                                  {item.itemId === invItem.item_name && (
                                                    <View className="w-2 h-2 rounded-full bg-orange-500" />
                                                  )}
                                                </View>
                                              </View>
                                            </Pressable>
                                          ))}

                                        {inventoryItems.filter(invItem => invItem.item_name.toLowerCase().includes(itemSearch.toLowerCase())).length === 0 && (
                                          <View className="px-4 py-8 items-center">
                                            <Text className={`text-sm italic ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                              No results found
                                            </Text>
                                          </View>
                                        )}
                                      </ScrollView>
                                    </View>
                                  )}
                                </View>

                                <View className="w-24">
                                  <TextInput
                                    className={`border rounded-lg p-3 text-base ${isDarkMode ? 'border-gray-700 bg-gray-800 text-white' : 'border-gray-300 bg-white text-black'}`}
                                    placeholder="Qty"
                                    placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
                                    value={item.quantity}
                                    keyboardType="numeric"
                                    onChangeText={(t) => handleItemChange(idx, 'quantity', t)}
                                  />
                                </View>

                                {orderItems.length > 1 && (
                                  <Pressable
                                    onPress={() => {
                                      const newItems = [...orderItems];
                                      newItems.splice(idx, 1);
                                      setOrderItems(newItems);
                                    }}
                                    className="p-3"
                                  >
                                    <X size={20} color="#ef4444" />
                                  </Pressable>
                                )}
                              </View>
                            </View>
                          ))}
                        </View>

                        <View className="mb-4">
                          {renderLabel('Time In Image')}
                          <Pressable onPress={() => handleImageChange('timeInFile')} className={`h-40 border border-dashed rounded-lg items-center justify-center ${isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-400 bg-gray-50'}`}>
                            {imageFiles.timeInFile || formData.timeIn ? (
                              <Image source={{ uri: imageFiles.timeInFile?.uri || formData.timeIn }} style={{ width: '100%', height: '100%', resizeMode: 'contain' }} />
                            ) : <Text className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Upload Time In</Text>}
                          </Pressable>
                        </View>

                        <View className="mb-4">
                          {renderLabel('Modem Setup Image')}
                          <Pressable onPress={() => handleImageChange('modemSetupFile')} className={`h-40 border border-dashed rounded-lg items-center justify-center ${isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-400 bg-gray-50'}`}>
                            {imageFiles.modemSetupFile || formData.modemSetupImage ? (
                              <Image source={{ uri: imageFiles.modemSetupFile?.uri || formData.modemSetupImage }} style={{ width: '100%', height: '100%', resizeMode: 'contain' }} />
                            ) : <Text className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Upload Modem Setup</Text>}
                          </Pressable>
                        </View>

                        <View className="mb-4">
                          {renderLabel('Time Out Image')}
                          <Pressable onPress={() => handleImageChange('timeOutFile')} className={`h-40 border border-dashed rounded-lg items-center justify-center ${isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-400 bg-gray-50'}`}>
                            {imageFiles.timeOutFile || formData.timeOut ? (
                              <Image source={{ uri: imageFiles.timeOutFile?.uri || formData.timeOut }} style={{ width: '100%', height: '100%', resizeMode: 'contain' }} />
                            ) : <Text className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Upload Time Out</Text>}
                          </Pressable>
                        </View>
                      </>
                    )}

                    {/* Failed/Reschedule Fields */}
                    {(formData.visitStatus === 'Reschedule' || formData.visitStatus === 'Failed') && (
                      <>
                        {/* Visit By/With/Other/Remarks for Reschedule/Failed */}
                        <View className="mb-4">
                          {renderLabel('Visit By', true)}
                          <View className={`border rounded-lg overflow-hidden ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-white'}`}>
                            <Picker
                              selectedValue={formData.visitBy}
                              onValueChange={(val) => handleInputChange('visitBy', val)}
                              dropdownIconColor={isDarkMode ? '#fff' : '#000'}
                              style={{ color: isDarkMode ? '#fff' : '#000' }}
                            >
                              <Picker.Item label="Select Visit By" value="" color={isDarkMode ? '#9ca3af' : '#6b7280'} />
                              {technicians.map((t, i) => (
                                <Picker.Item key={i} label={t.name} value={t.name} color={isDarkMode ? '#fff' : '#000'} />
                              ))}
                            </Picker>
                          </View>
                        </View>

                        <View className="mb-4">
                          {renderLabel('Visit With', true)}
                          <View className={`border rounded-lg overflow-hidden ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-white'}`}>
                            <Picker
                              selectedValue={formData.visitWith}
                              onValueChange={(val) => handleInputChange('visitWith', val)}
                              dropdownIconColor={isDarkMode ? '#fff' : '#000'}
                              style={{ color: isDarkMode ? '#fff' : '#000' }}
                            >
                              <Picker.Item label="Select Visit With" value="" color={isDarkMode ? '#9ca3af' : '#6b7280'} />
                              {technicians.filter(t => t.name !== formData.visitBy).map((t, i) => (
                                <Picker.Item key={i} label={t.name} value={t.name} color={isDarkMode ? '#fff' : '#000'} />
                              ))}
                            </Picker>
                          </View>
                        </View>

                        <View className="mb-4">
                          {renderLabel('Visit With Other', true)}
                          <View className={`border rounded-lg overflow-hidden ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-white'}`}>
                            <Picker
                              selectedValue={formData.visitWithOther}
                              onValueChange={(val) => handleInputChange('visitWithOther', val)}
                              dropdownIconColor={isDarkMode ? '#fff' : '#000'}
                              style={{ color: isDarkMode ? '#fff' : '#000' }}
                            >
                              <Picker.Item label="Select Visit With Other" value="" color={isDarkMode ? '#9ca3af' : '#6b7280'} />
                              {technicians.filter(t => t.name !== formData.visitBy).map((t, i) => (
                                <Picker.Item key={i} label={t.name} value={t.name} color={isDarkMode ? '#fff' : '#000'} />
                              ))}
                            </Picker>
                          </View>
                        </View>

                        {renderInput('visitRemarks', 'Visit Remarks')}
                      </>
                    )}
                  </>
                )}

                {/* Concern */}
                <View className="mb-4">
                  {renderLabel('Concern', true)}
                  {isTechnician ? (
                    <TextInput
                      className={`border rounded-lg p-3 text-base ${isDarkMode ? 'bg-gray-700 text-gray-400 border-gray-600' : 'bg-gray-100 text-gray-500 border-gray-200'}`}
                      value={formData.concern}
                      editable={false}
                    />
                  ) : (
                    <View className={`border rounded-lg overflow-hidden ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-white'}`}>
                      <Picker
                        selectedValue={formData.concern}
                        onValueChange={(val) => handleInputChange('concern', val)}
                        dropdownIconColor={isDarkMode ? '#fff' : '#000'}
                        style={{ color: isDarkMode ? '#fff' : '#000' }}
                      >
                        <Picker.Item label="Select Concern" value="" color={isDarkMode ? '#9ca3af' : '#6b7280'} />
                        {concerns.map(c => <Picker.Item key={c.id} label={c.concern_name} value={c.concern_name} color={isDarkMode ? '#fff' : '#000'} />)}
                      </Picker>
                    </View>
                  )}
                </View>

                {formData.concern === 'Upgrade/Downgrade Plan' && (
                  <View className="mb-4">
                    {renderLabel('New Plan', true)}
                    <View className={`border rounded-lg overflow-hidden ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-white'}`}>
                      <Picker
                        selectedValue={formData.newPlan}
                        onValueChange={(val) => handleInputChange('newPlan', val)}
                        dropdownIconColor={isDarkMode ? '#fff' : '#000'}
                        style={{ color: isDarkMode ? '#fff' : '#000' }}
                      >
                        <Picker.Item label="Select New Plan" value="" color={isDarkMode ? '#9ca3af' : '#6b7280'} />
                        {plans.map((p, idx) => <Picker.Item key={idx} label={p} value={p} color={isDarkMode ? '#fff' : '#000'} />)}
                      </Picker>
                    </View>
                  </View>
                )}

                {renderInput('concernRemarks', 'Concern Remarks', !isTechnician)}
                {renderInput('modifiedBy', 'Modified By', false)}
                {renderInput('supportRemarks', 'Support Remarks')}
                {renderInput('serviceCharge', 'Service Charge', true, 'numeric')}

              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </View>
    </Modal>
  );
};

export default ServiceOrderEditModal;
