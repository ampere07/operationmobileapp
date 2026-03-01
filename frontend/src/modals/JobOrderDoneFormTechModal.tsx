import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, Modal, Image, Linking, Platform, DeviceEventEmitter, KeyboardAvoidingView, Alert, Keyboard, StyleSheet, ActivityIndicator, FlatList } from 'react-native';
import SignatureScreen from 'react-native-signature-canvas';
import * as ExpoFileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { X, ChevronDown, Camera, MapPin, CheckCircle, AlertCircle, XCircle, Loader2, Search, Check } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { UserData } from '../types/api';
import { updateJobOrder } from '../services/jobOrderService';
import { userService } from '../services/userService';
import { planService, Plan } from '../services/planService';
import { routerModelService, RouterModel } from '../services/routerModelService';
import { getAllPorts, Port } from '../services/portService';
import { getAllLCPNAPs, LCPNAP, getMostUsedLCPNAPs } from '../services/lcpnapService';
import { getAllVLANs, VLAN } from '../services/vlanService';

import { getAllUsageTypes, UsageType } from '../services/usageTypeService';
import { getAllInventoryItems, InventoryItem } from '../services/inventoryItemService';
import { createJobOrderItems, JobOrderItem } from '../services/jobOrderItemService';
import { getRegions, getCities, City } from '../services/cityService';
import { barangayService, Barangay } from '../services/barangayService';
import { locationDetailService, LocationDetail } from '../services/locationDetailService';
import { updateApplication } from '../services/applicationService';
import apiClient from '../config/api';
import { getActiveImageSize, resizeImage, ImageSizeSetting } from '../services/imageSettingsService';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';
import LocationPicker from '../components/LocationPicker';
import { pppoeService, UsernamePattern } from '../services/pppoeService';
import ImagePreview from '../components/ImagePreview';

interface Region {
  id: number;
  name: string;
}

interface JobOrderDoneFormTechModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (formData: any) => void;
  jobOrderData?: any;
}



interface JobOrderDoneFormData {
  dateInstalled: string;
  usageType: string;
  choosePlan: string;
  connectionType: string;
  routerModel: string;
  modemSN: string;

  region: string;
  city: string;
  barangay: string;
  lcpnap: string;
  port: string;
  vlan: string;
  onsiteStatus: string;
  onsiteRemarks: string;
  signedContractImage: File | null;
  setupImage: File | null;
  boxReadingImage: File | null;
  routerReadingImage: File | null;
  portLabelImage: File | null;
  clientSignatureImage: File | null;
  speedTestImage: File | null;
  modifiedBy: string;
  modifiedDate: string;
  itemName1: string;
  visit_by: string;
  visit_with: string;
  visit_with_other: string;
  statusRemarks: string;
  ip: string;
  addressCoordinates: string;
}

interface OrderItem {
  itemId: string;
  quantity: string;
}

const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const JobOrderDoneFormTechModal: React.FC<JobOrderDoneFormTechModalProps> = ({
  isOpen,
  onClose,
  onSave,
  jobOrderData
}) => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);

  useEffect(() => {
    const checkDarkMode = async () => {
      try {
        const theme = await AsyncStorage.getItem('theme');
        setIsDarkMode(theme === 'dark' || theme === null);
      } catch (e) {
        setIsDarkMode(true);
      }
    };

    checkDarkMode();
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

  const [currentUser, setCurrentUser] = useState<UserData | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const authData = await AsyncStorage.getItem('authData');
        if (authData) {
          setCurrentUser(JSON.parse(authData));
        }
      } catch (error) {
        console.error('Failed to fetch auth data:', error);
      }
    };
    fetchUserData();
  }, []);

  const currentUserEmail = currentUser?.email || 'unknown@unknown.com';

  const [formData, setFormData] = useState<JobOrderDoneFormData>({
    dateInstalled: getTodayDate(),
    usageType: '',
    choosePlan: '',
    connectionType: '',
    routerModel: '',
    modemSN: '',

    region: '',
    city: '',
    barangay: '',
    lcpnap: '',
    port: '',
    vlan: '',
    onsiteStatus: 'In Progress',
    onsiteRemarks: '',
    signedContractImage: null,
    setupImage: null,
    boxReadingImage: null,
    routerReadingImage: null,
    portLabelImage: null,
    clientSignatureImage: null,
    speedTestImage: null,
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
    itemName1: '',
    visit_by: '',
    visit_with: '',
    visit_with_other: '',
    statusRemarks: '',
    ip: '',
    addressCoordinates: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [technicians, setTechnicians] = useState<Array<{ email: string; name: string }>>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [routerModels, setRouterModels] = useState<RouterModel[]>([]);
  const [lcpnaps, setLcpnaps] = useState<LCPNAP[]>([]);
  const [ports, setPorts] = useState<Port[]>([]);
  const [vlans, setVlans] = useState<VLAN[]>([]);

  const [usageTypes, setUsageTypes] = useState<UsageType[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);

  const [orderItems, setOrderItems] = useState<OrderItem[]>([{ itemId: '', quantity: '' }]);
  const [imagePreviews, setImagePreviews] = useState<{
    signedContractImage: string | null;
    setupImage: string | null;
    boxReadingImage: string | null;
    routerReadingImage: string | null;
    portLabelImage: string | null;
    clientSignatureImage: string | null;
    speedTestImage: string | null;
  }>({
    signedContractImage: null,
    setupImage: null,
    boxReadingImage: null,
    routerReadingImage: null,
    portLabelImage: null,
    clientSignatureImage: null,
    speedTestImage: null
  });

  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState<{
    title: string;
    messages: Array<{ type: 'success' | 'warning' | 'error'; text: string }>;
  }>({ title: '', messages: [] });
  const [showLoadingModal, setShowLoadingModal] = useState(false);
  const [loadingPercentage, setLoadingPercentage] = useState(0);
  const [activeImageSize, setActiveImageSize] = useState<ImageSizeSetting | null>(null);
  const [usernamePattern, setUsernamePattern] = useState<UsernamePattern | null>(null);
  const [techInputValue, setTechInputValue] = useState<string>('');
  const [lcpnapSearch, setLcpnapSearch] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [routerModelSearch, setRouterModelSearch] = useState('');
  const [isRouterModelMiniModalVisible, setIsRouterModelMiniModalVisible] = useState(false);
  const [openItemIndex, setOpenItemIndex] = useState<number | null>(null);
  const [usedPorts, setUsedPorts] = useState<Set<string>>(new Set());

  const [isLcpnapMiniModalVisible, setIsLcpnapMiniModalVisible] = useState(false);
  const [mostUsedLcpnaps, setMostUsedLcpnaps] = useState<LCPNAP[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Signature State
  const signatureRef = useRef<any>(null);
  const routerModelInputRef = useRef<TextInput>(null);
  const [isDrawingSignature, setIsDrawingSignature] = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      handleInputChange('dateInstalled', `${year}-${month}-${day}`);
    }
  };

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

  const isCloudUrl = (url: string | null): boolean => {
    if (!url) return false;
    return url.startsWith('http') && !url.includes('localhost') && !url.includes('127.0.0.1');
  };



  // Consolidated data fetching - all independent API calls batched into one effect
  // This prevents 12+ simultaneous state update storms that crash the app
  useEffect(() => {
    if (!isOpen) {
      // Cleanup when modal closes
      setOrderItems([{ itemId: '', quantity: '' }]);
      setTechInputValue('');
      return;
    }

    let isMounted = true;

    const fetchAllData = async () => {
      // Fire all independent API calls in parallel with Promise.allSettled
      // so one failure doesn't block the rest
      const [
        imageSizeResult,
        usernamePatternResult,
        lcpnapResult,
        vlanResult,
        usageTypeResult,
        inventoryResult,
        technicianResult,
        planResult,
        routerModelResult,
      ] = await Promise.allSettled([
        getActiveImageSize(),
        pppoeService.getPatterns('username'),
        getAllLCPNAPs('', 1, 1000),
        getAllVLANs(),
        getAllUsageTypes(),
        getAllInventoryItems(),
        userService.getUsersByRole('technician'),
        planService.getAllPlans(),
        routerModelService.getAllRouterModels(),
      ]);

      if (!isMounted) return;

      // Image Size
      if (imageSizeResult.status === 'fulfilled') {
        setActiveImageSize(imageSizeResult.value);
      } else {
        setActiveImageSize(null);
      }

      // Username Pattern
      if (usernamePatternResult.status === 'fulfilled') {
        const patterns = usernamePatternResult.value;
        if (patterns && patterns.length > 0) {
          const pattern = patterns[0];
          setUsernamePattern(pattern);
          const existingUsername = jobOrderData?.pppoe_username || jobOrderData?.PPPoE_Username || '';
          if (existingUsername && pattern.sequence.some((item: any) => item.type === 'tech_input')) {
            setTechInputValue(existingUsername);
          }
        }
      } else {
        console.error('Failed to fetch username pattern:', usernamePatternResult.reason);
        setUsernamePattern(null);
      }

      // LCPNAPs
      if (lcpnapResult.status === 'fulfilled') {
        const response = lcpnapResult.value;
        if (response.success && Array.isArray(response.data)) {
          setLcpnaps(response.data);
        } else {
          setLcpnaps([]);
        }
      } else {
        setLcpnaps([]);
      }

      // VLANs
      if (vlanResult.status === 'fulfilled') {
        const response = vlanResult.value;
        if (response.success && Array.isArray(response.data)) {
          setVlans(response.data);
        } else {
          setVlans([]);
        }
      } else {
        setVlans([]);
      }

      // Usage Types
      if (usageTypeResult.status === 'fulfilled') {
        const response = usageTypeResult.value;
        if (response.success && Array.isArray(response.data)) {
          const filtered = (response.data as any[]).filter(ut => {
            const val = ut.usage_name || ut.Usage_Name || ut.usageName;
            if (!val) return false;
            const name = String(val).trim().toLowerCase();
            return name !== 'undefined' && name !== 'null' && name !== '' && !name.includes('undefined');
          });
          setUsageTypes(filtered);
        } else {
          setUsageTypes([]);
        }
      } else {
        setUsageTypes([]);
      }

      // Inventory Items
      if (inventoryResult.status === 'fulfilled') {
        const response = inventoryResult.value;
        if (response.success && Array.isArray(response.data)) {
          const filteredItems = response.data.filter(item => {
            const catId = item.category_id || (item as any).Category_ID || (item as any).categoryId;
            return catId === 1 || String(catId) === '1';
          });
          setInventoryItems(filteredItems);
        } else {
          setInventoryItems([]);
        }
      } else {
        setInventoryItems([]);
      }

      // Technicians
      if (technicianResult.status === 'fulfilled') {
        const response = technicianResult.value;
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
      }

      // Plans
      if (planResult.status === 'fulfilled') {
        setPlans(planResult.value);
      }

      // Router Models
      if (routerModelResult.status === 'fulfilled') {
        const filtered = routerModelResult.value.filter((rm: any) => {
          if (!rm.model) return false;
          const name = String(rm.model).trim().toLowerCase();
          return name !== 'undefined' && name !== 'null' && name !== '' && !name.includes('undefined');
        });
        setRouterModels(filtered);
      }
      // Fetch most used LCPNAPs
      try {
        const resp = await getMostUsedLCPNAPs();
        if (resp.success) {
          setMostUsedLcpnaps(resp.data);
        }
      } catch (err) {
        console.error('Error fetching most used LCPNAPs:', err);
      }
    };

    fetchAllData();

    // Fetch job order items separately (depends on jobOrderData)
    const fetchJobOrderItems = async () => {
      if (jobOrderData) {
        const jobOrderId = jobOrderData.id || jobOrderData.JobOrder_ID;
        if (jobOrderId) {
          try {
            const response = await apiClient.get(`/job-order-items?job_order_id=${jobOrderId}`);
            const data = response.data as { success: boolean; data: any[] };

            if (!isMounted) return;

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
            if (isMounted) setOrderItems([{ itemId: '', quantity: '' }]);
          }
        }
      }
    };

    fetchJobOrderItems();

    return () => {
      isMounted = false;
    };
  }, [isOpen, jobOrderData]);

  // Ports fetching - depends on formData.lcpnap which changes independently
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    const fetchPorts = async () => {
      if (formData.lcpnap) {
        try {
          const jobOrderId = jobOrderData?.id || jobOrderData?.JobOrder_ID;
          const response = await getAllPorts(formData.lcpnap, 1, 100, true, jobOrderId);

          if (!isMounted) return;

          if (response.success && Array.isArray(response.data)) {
            setPorts(response.data);
          } else {
            setPorts([]);
          }
        } catch (error) {
          if (isMounted) setPorts([]);
        }
      } else {
        setPorts([]);
      }
    };
    fetchPorts();

    return () => { isMounted = false; };
  }, [isOpen, jobOrderData, formData.lcpnap]);

  // Fetch used ports for the selected LCPNAP
  useEffect(() => {
    if (!isOpen || !formData.lcpnap) {
      setUsedPorts(new Set());
      return;
    }

    let isMounted = true;

    const fetchUsedPorts = async () => {
      try {
        const response = await apiClient.get('/job-orders', {
          params: {
            lcpnap: formData.lcpnap,
            limit: 2000
          }
        });

        if (!isMounted) return;

        if (response.data && response.data.success && Array.isArray(response.data.data)) {
          const used = new Set<string>();
          const currentId = jobOrderData?.id || jobOrderData?.JobOrder_ID;

          response.data.data.forEach((jo: any) => {
            const joLcpnap = jo.lcpnap || jo.LCPNAP;

            if (joLcpnap === formData.lcpnap) {
              const joPort = jo.port || jo.PORT;
              const joId = jo.id || jo.JobOrder_ID;

              if (joPort && String(joId) !== String(currentId)) {
                used.add(joPort.toString());
              }
            }
          });

          setUsedPorts(used);
        }
      } catch (error) {
        console.error('Failed to fetch used ports:', error);
      }
    };

    fetchUsedPorts();

    return () => { isMounted = false; };
  }, [isOpen, formData.lcpnap, jobOrderData]);

  useEffect(() => {
    if (jobOrderData && isOpen) {

      const loadedOnsiteStatus = jobOrderData.Onsite_Status || jobOrderData.onsite_status || 'In Progress';

      const isEmptyValue = (value: any): boolean => {
        if (value === null || value === undefined || value === '') return true;
        if (typeof value === 'string') {
          const trimmed = value.trim().toLowerCase();
          return trimmed === 'null' || trimmed === 'undefined';
        }
        return false;
      };

      const getValue = (value: any, fieldName: string): string => {
        const result = isEmptyValue(value) ? '' : value;
        return result;
      };

      const formatDateForInput = (dateValue: any): string => {
        const today = getTodayDate();
        const isEmpty = (val: any) => {
          if (!val) return true;
          if (typeof val === 'string') {
            const t = val.trim().toLowerCase();
            return t === '' || t === 'null' || t === 'undefined' || t === '0000-00-00' || t.startsWith('0000-00-00');
          }
          return false;
        };

        if (isEmpty(dateValue)) return today;

        try {
          const date = new Date(dateValue);
          if (isNaN(date.getTime())) return today;

          const year = date.getFullYear();
          if (year < 2020) return today; // Any date before 2020 is likely invalid or default

          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');

          return `${year}-${month}-${day}`;
        } catch (error) {
          return today;
        }
      };

      const fetchApplicationData = async () => {
        try {
          const applicationId = jobOrderData.application_id || jobOrderData.Application_ID;
          if (applicationId) {
            const appResponse = await apiClient.get<{ success: boolean; application: any }>(`/applications/${applicationId}`);
            if (appResponse.data.success && appResponse.data.application) {
              const appData = appResponse.data.application;

              const newFormData = {
                dateInstalled: formatDateForInput(jobOrderData.Date_Installed || jobOrderData.date_installed),
                usageType: (jobOrderData.Usage_Type || jobOrderData.usage_type || '').toString().trim().toLowerCase() === 'undefined' ? '' : (jobOrderData.Usage_Type || jobOrderData.usage_type || ''),
                choosePlan: getValue(jobOrderData.Desired_Plan || jobOrderData.desired_plan || jobOrderData.Choose_Plan || jobOrderData.choose_plan || jobOrderData.plan, 'choosePlan'),
                connectionType: getValue(jobOrderData.Connection_Type || jobOrderData.connection_type, 'connectionType'),
                routerModel: (jobOrderData.Router_Model || jobOrderData.router_model || '').toString().trim().toLowerCase() === 'undefined' ? '' : (jobOrderData.Router_Model || jobOrderData.router_model || ''),
                modemSN: getValue(jobOrderData.Modem_SN || jobOrderData.modem_sn, 'modemSN'),

                lcpnap: getValue(jobOrderData.LCPNAP || jobOrderData.lcpnap, 'lcpnap'),
                port: getValue(jobOrderData.PORT || jobOrderData.port, 'port'),
                vlan: getValue(jobOrderData.VLAN || jobOrderData.vlan, 'vlan'),
                region: getValue(appData.region || jobOrderData.Region || jobOrderData.region, 'region'),
                city: getValue(appData.city || jobOrderData.City || jobOrderData.city, 'city'),
                barangay: getValue(appData.barangay || jobOrderData.Barangay || jobOrderData.barangay, 'barangay'),
                onsiteStatus: loadedOnsiteStatus,
                onsiteRemarks: getValue(jobOrderData.Onsite_Remarks || jobOrderData.onsite_remarks, 'onsiteRemarks'),
                itemName1: getValue(jobOrderData.Item_Name_1 || jobOrderData.item_name_1, 'itemName1'),
                visit_by: getValue(jobOrderData.Visit_By || jobOrderData.visit_by, 'visit_by'),
                visit_with: getValue(jobOrderData.Visit_With || jobOrderData.visit_with, 'visit_with'),
                visit_with_other: getValue(jobOrderData.Visit_With_Other || jobOrderData.visit_with_other, 'visit_with_other'),
                statusRemarks: getValue(jobOrderData.Status_Remarks || jobOrderData.status_remarks, 'statusRemarks'),
                ip: getValue(jobOrderData.IP || jobOrderData.ip, 'ip'),
                addressCoordinates: getValue(jobOrderData.Address_Coordinates || jobOrderData.address_coordinates, 'addressCoordinates')
              };

              setFormData(prev => ({
                ...prev,
                ...newFormData
              }));

              // Initialize image previews from database values (only if they are actual URLs)
              const safeConvert = (val: any) => {
                const url = val || '';
                if (url && typeof url === 'string' && url.startsWith('http')) {
                  return convertGoogleDriveUrl(url);
                }
                return null;
              };

              setImagePreviews({
                signedContractImage: safeConvert(jobOrderData.signed_contract_image_url || jobOrderData.Signed_Contract_Image_URL),
                setupImage: safeConvert(jobOrderData.setup_image_url || jobOrderData.Setup_Image_URL),
                boxReadingImage: safeConvert(jobOrderData.box_reading_image_url || jobOrderData.Box_Reading_Image_URL),
                routerReadingImage: safeConvert(jobOrderData.router_reading_image_url || jobOrderData.Router_Reading_Image_URL),
                portLabelImage: safeConvert(jobOrderData.port_label_image_url || jobOrderData.Port_Label_Image_URL),
                clientSignatureImage: safeConvert(jobOrderData.client_signature_url || jobOrderData.Client_Signature_URL),
                speedTestImage: safeConvert(jobOrderData.speedtest_image_url || jobOrderData.Speedtest_Image_URL)
              });
            }
          } else {
            loadDefaultFormData();
          }
        } catch (error) {
          loadDefaultFormData();
        }
      };

      const loadDefaultFormData = () => {
        const newFormData = {
          dateInstalled: formatDateForInput(jobOrderData.Date_Installed || jobOrderData.date_installed),
          usageType: (jobOrderData.Usage_Type || jobOrderData.usage_type || '').toString().trim().toLowerCase() === 'undefined' ? '' : (jobOrderData.Usage_Type || jobOrderData.usage_type || ''),
          choosePlan: getValue(jobOrderData.Desired_Plan || jobOrderData.desired_plan || jobOrderData.Choose_Plan || jobOrderData.choose_plan || jobOrderData.plan, 'choosePlan'),
          connectionType: getValue(jobOrderData.Connection_Type || jobOrderData.connection_type, 'connectionType'),
          routerModel: (jobOrderData.Router_Model || jobOrderData.router_model || '').toString().trim().toLowerCase() === 'undefined' ? '' : (jobOrderData.Router_Model || jobOrderData.router_model || ''),
          modemSN: getValue(jobOrderData.Modem_SN || jobOrderData.modem_sn, 'modemSN'),

          lcpnap: getValue(jobOrderData.LCPNAP || jobOrderData.lcpnap, 'lcpnap'),
          port: getValue(jobOrderData.PORT || jobOrderData.port, 'port'),
          vlan: getValue(jobOrderData.VLAN || jobOrderData.vlan, 'vlan'),
          region: getValue(jobOrderData.Region || jobOrderData.region, 'region'),
          city: getValue(jobOrderData.City || jobOrderData.city, 'city'),
          barangay: getValue(jobOrderData.Barangay || jobOrderData.barangay, 'barangay'),
          onsiteStatus: loadedOnsiteStatus,
          onsiteRemarks: getValue(jobOrderData.Onsite_Remarks || jobOrderData.onsite_remarks, 'onsiteRemarks'),
          itemName1: getValue(jobOrderData.Item_Name_1 || jobOrderData.item_name_1, 'itemName1'),
          visit_by: getValue(jobOrderData.Visit_By || jobOrderData.visit_by, 'visit_by'),
          visit_with: getValue(jobOrderData.Visit_With || jobOrderData.visit_with, 'visit_with'),
          visit_with_other: getValue(jobOrderData.Visit_With_Other || jobOrderData.visit_with_other, 'visit_with_other'),
          statusRemarks: getValue(jobOrderData.Status_Remarks || jobOrderData.status_remarks, 'statusRemarks'),
          ip: getValue(jobOrderData.IP || jobOrderData.ip, 'ip'),
          addressCoordinates: getValue(jobOrderData.Address_Coordinates || jobOrderData.address_coordinates, 'addressCoordinates')
        };

        setFormData(prev => ({
          ...prev,
          ...newFormData
        }));

        // Initialize image previews from database values (only if they are actual URLs)
        const safeConvertDefault = (val: any) => {
          const url = val || '';
          if (url && typeof url === 'string' && url.startsWith('http')) {
            return convertGoogleDriveUrl(url);
          }
          return null;
        };

        setImagePreviews({
          signedContractImage: safeConvertDefault(jobOrderData.signed_contract_image_url || jobOrderData.Signed_Contract_Image_URL),
          setupImage: safeConvertDefault(jobOrderData.setup_image_url || jobOrderData.Setup_Image_URL),
          boxReadingImage: safeConvertDefault(jobOrderData.box_reading_image_url || jobOrderData.Box_Reading_Image_URL),
          routerReadingImage: safeConvertDefault(jobOrderData.router_reading_image_url || jobOrderData.Router_Reading_Image_URL),
          portLabelImage: safeConvertDefault(jobOrderData.port_label_image_url || jobOrderData.Port_Label_Image_URL),
          clientSignatureImage: safeConvertDefault(jobOrderData.client_signature_url || jobOrderData.Client_Signature_URL),
          speedTestImage: safeConvertDefault(jobOrderData.speedtest_image_url || jobOrderData.Speedtest_Image_URL)
        });
      };

      fetchApplicationData();
    }
  }, [jobOrderData, isOpen]);

  const handleInputChange = useCallback((field: keyof JobOrderDoneFormData, value: string | File | null) => {
    if (field === 'addressCoordinates') {
      console.log('[INPUT DEBUG] Address Coordinates changed to:', value);
    }

    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      if (field === 'lcpnap') {
        newData.port = '';
      }
      if (field === 'region') {
        newData.city = '';
        newData.barangay = '';
      }
      if (field === 'city') {
        newData.barangay = '';
      }
      if (field === 'barangay') {
      }
      return newData;
    });
    setErrors(prev => {
      if (prev[field]) {
        return { ...prev, [field]: '' };
      }
      return prev;
    });
  }, []);

  const handleImageUpload = useCallback((field: 'signedContractImage' | 'setupImage' | 'boxReadingImage' | 'routerReadingImage' | 'portLabelImage' | 'clientSignatureImage' | 'speedTestImage', file: any) => {
    try {
      // In React Native/Expo, the file object from ImagePicker is { uri, name, type }
      // We don't need to create object URLs or resize with web APIs.

      console.log(`[UPLOAD] Received file for ${field}:`, file);

      setFormData(prev => ({ ...prev, [field]: file }));

      // Use the URI directly for preview
      setImagePreviews(prev => ({ ...prev, [field]: file ? file.uri : null }));

      setErrors(prev => {
        if (prev[field]) {
          return { ...prev, [field]: '' };
        }
        return prev;
      });
    } catch (error) {
      console.error(`[UPLOAD ERROR] ${field}:`, error);
      // Fallback
      setFormData(prev => ({ ...prev, [field]: file }));
      setImagePreviews(prev => ({ ...prev, [field]: file ? file.uri : null }));
    }
  }, []);

  const handleSignatureOK = async (signature: string) => {
    setIsDrawingSignature(false);
    setScrollEnabled(true);
    try {
      const path = `${(ExpoFileSystem as any).cacheDirectory}signature_${Date.now()}.png`;
      const base64Code = signature.replace('data:image/png;base64,', '');
      await (ExpoFileSystem as any).writeAsStringAsync(path, base64Code, {
        encoding: (ExpoFileSystem as any).EncodingType.Base64,
      });

      const file = {
        uri: path,
        name: `signature_${Date.now()}.png`,
        type: 'image/png',
        size: base64Code.length * 0.75 // Approximate size
      };

      handleImageUpload('clientSignatureImage', file);
    } catch (e) {
      console.error('Error handling signature:', e);
      Alert.alert('Error', 'Failed to save signature');
    }
  };

  const handleSignatureClear = () => {
    if (signatureRef.current) {
      signatureRef.current.clearSignature();
    }
    setFormData(prev => ({ ...prev, clientSignatureImage: null }));
    setImagePreviews(prev => ({ ...prev, clientSignatureImage: null }));
  };

  const handleItemChange = useCallback((index: number, field: 'itemId' | 'quantity', value: string) => {
    setOrderItems(prevItems => {
      const newItems = prevItems.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      );

      // Auto-add new row if item selected in the last row
      if (field === 'itemId' && value && index === prevItems.length - 1) {
        return [...newItems, { itemId: '', quantity: '' }];
      }

      return newItems;
    });
  }, []);

  const handleRemoveItem = useCallback((index: number) => {
    setOrderItems(prev => {
      if (prev.length > 1) {
        return prev.filter((_, i) => i !== index);
      }
      return prev;
    });
  }, []);

  const showMessageModal = (title: string, messages: Array<{ type: 'success' | 'warning' | 'error'; text: string }>) => {
    setModalContent({ title, messages });
    setShowModal(true);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    const isValidImageUrl = (url: any): boolean => {
      if (!url) return false;
      if (typeof url !== 'string') return false;
      const trimmed = url.trim().toLowerCase();
      return trimmed !== '' && trimmed !== 'null' && trimmed !== 'undefined';
    };

    if (!formData.choosePlan.trim()) newErrors.choosePlan = 'Choose Plan is required';
    if (!formData.onsiteStatus.trim()) newErrors.onsiteStatus = 'Onsite Status is required';

    if (!formData.region.trim()) newErrors.region = 'Region is required';
    if (!formData.city.trim()) newErrors.city = 'City is required';
    if (!formData.barangay.trim()) newErrors.barangay = 'Barangay is required';

    if (formData.onsiteStatus === 'Done') {
      if (!formData.dateInstalled.trim()) newErrors.dateInstalled = 'Date Installed is required';
      if (!formData.usageType.trim()) newErrors.usageType = 'Usage Type is required';
      if (!formData.connectionType.trim()) newErrors.connectionType = 'Connection Type is required';
      if (!formData.routerModel.trim()) newErrors.routerModel = 'Router Model is required';
      if (!formData.modemSN.trim()) newErrors.modemSN = 'Modem SN is required';

      // Check if tech_input is required for PPPoE username
      if (usernamePattern && usernamePattern.sequence.some(item => item.type === 'tech_input')) {
        if (!techInputValue.trim()) {
          newErrors.techInput = 'PPPoE Username is required';
        }
      }

      if (formData.connectionType === 'Antenna') {
        if (!formData.ip.trim()) newErrors.ip = 'IP is required';

      } else if (formData.connectionType === 'Fiber') {
        if (!formData.lcpnap.trim()) newErrors.lcpnap = 'LCP-NAP is required';
        if (!formData.port.trim()) newErrors.port = 'PORT is required';
        if (!formData.vlan.trim()) newErrors.vlan = 'VLAN is required';
      } else if (formData.connectionType === 'Local') {

      }

      if (!formData.visit_by.trim()) newErrors.visit_by = 'Visit By is required';
      if (!formData.visit_with.trim()) newErrors.visit_with = 'Visit With is required';
      if (!formData.visit_with_other.trim()) newErrors.visit_with_other = 'Visit With(Other) is required';
      if (!formData.onsiteRemarks.trim()) newErrors.onsiteRemarks = 'Onsite Remarks is required';
      if (!formData.addressCoordinates.trim()) newErrors.addressCoordinates = 'Address Coordinates is required';

      const validItems = orderItems.filter(item => item.itemId && item.quantity && item.itemId !== 'None');
      const hasNoneItem = orderItems.some(item => item.itemId === 'None');

      if (validItems.length === 0 && !hasNoneItem) {
        newErrors.items = 'At least one item with quantity is required';
      } else {
        for (let i = 0; i < validItems.length; i++) {
          if (!validItems[i].itemId) {
            newErrors[`item_${i}`] = 'Item is required';
          }
          if (!validItems[i].quantity || parseInt(validItems[i].quantity) <= 0) {
            newErrors[`quantity_${i}`] = 'Valid quantity is required';
          }
        }
      }


    }

    if (formData.onsiteStatus === 'Failed' || formData.onsiteStatus === 'Reschedule') {
      if (!formData.visit_by.trim()) newErrors.visit_by = 'Visit By is required';
      if (!formData.visit_with.trim()) newErrors.visit_with = 'Visit With is required';
      if (!formData.visit_with_other.trim()) newErrors.visit_with_other = 'Visit With(Other) is required';
      if (!formData.onsiteRemarks.trim()) newErrors.onsiteRemarks = 'Onsite Remarks is required';
      if (!formData.statusRemarks.trim()) newErrors.statusRemarks = 'Status Remarks is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    console.log('[SAVE START] ========================================');
    console.log('[SAVE START] handleSave function called');
    console.log('[SAVE START] jobOrderData:', jobOrderData);
    console.log('[SAVE START] jobOrderData.id:', jobOrderData?.id);
    console.log('[SAVE START] jobOrderData.JobOrder_ID:', jobOrderData?.JobOrder_ID);

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

    console.log('[SAVE START] updatedFormData:', updatedFormData);
    setFormData(updatedFormData);

    if (!validateForm()) {
      console.log('[SAVE VALIDATION] Form validation failed');
      console.log('[SAVE VALIDATION] Errors:', errors);
      showMessageModal('Validation Error', [
        { type: 'error', text: 'Please fill in all required fields before saving.' }
      ]);
      return;
    }

    // SmartOLT and Technical Details Validation
    if (formData.onsiteStatus === 'Done' && formData.connectionType === 'Fiber' && formData.modemSN.trim()) {
      setLoading(true);

      // 1. SmartOLT Validation Logic (Check if exists first)
      try {
        console.log('[SMARTOLT VALIDATION] Validating Modem SN:', formData.modemSN);

        const smartOltResponse = await apiClient.get('/smart-olt/validate-sn', {
          params: { sn: formData.modemSN }
        });

        if (!(smartOltResponse.data as any).success) {
          console.log('[SMARTOLT VALIDATION] Failed:', smartOltResponse.data);
          setLoading(false);
          const errorMsg = 'sn not existing in smart olt';
          setErrors(prev => ({
            ...prev,
            modemSN: errorMsg
          }));
          showMessageModal('SmartOLT Verification Failed', [
            { type: 'error', text: errorMsg }
          ]);
          return;
        }
        console.log('[SMARTOLT VALIDATION] Success');
      } catch (error: any) {
        console.error('[SMARTOLT VALIDATION] API Error:', error);
        setLoading(false);
        const errorMessage = error.response?.data?.message || 'Failed to validate Modem SN with SmartOLT system.';
        setErrors(prev => ({
          ...prev,
          modemSN: errorMessage
        }));
        showMessageModal('Validation Error', [
          { type: 'error', text: errorMessage }
        ]);
        return;
      }

      // 2. Duplicate SN Check (Technical Details)
      try {
        // Check if SN exists in other Job Orders
        const duplicateResponse = await apiClient.get('/job-orders', {
          params: {
            search: formData.modemSN,
            limit: 50 // Check enough records
          }
        });

        if (duplicateResponse.data && duplicateResponse.data.success && Array.isArray(duplicateResponse.data.data)) {
          const currentId = jobOrderData?.id || jobOrderData?.JobOrder_ID;
          const isDuplicate = duplicateResponse.data.data.some((jo: any) => {
            const joId = jo.id || jo.JobOrder_ID;
            // Check potential SN fields from API response
            const joSN = jo.modem_sn || jo.Modem_SN || jo.modem_router_sn;
            // Compare SNs (case-insensitive) and ensure it's not the current job order
            return String(joId) !== String(currentId) &&
              String(joSN || '').trim().toLowerCase() === formData.modemSN.trim().toLowerCase();
          });

          if (isDuplicate) {
            setLoading(false);
            const errorMessage = 'Please check on Customer Details. SN Duplicate Detected.';
            setErrors(prev => ({
              ...prev,
              modemSN: errorMessage
            }));
            showMessageModal('Validation Error', [
              { type: 'error', text: errorMessage }
            ]);
            return;
          }
        }
      } catch (error) {
        console.error('Error checking duplicate SN:', error);
      }

      setLoading(false);
    }



    console.log('[SAVE VALIDATION] Form validation passed');

    if (!jobOrderData?.id && !jobOrderData?.JobOrder_ID) {
      console.error('[SAVE ERROR] Cannot proceed - jobOrderData is missing ID');
      console.error('[SAVE ERROR] jobOrderData:', jobOrderData);
      showMessageModal('Error', [
        { type: 'error', text: 'Cannot update job order: Missing ID' }
      ]);
      return;
    }

    console.log('[SAVE ID CHECK] Job order has ID, proceeding...');

    setLoading(true);
    setShowLoadingModal(true);
    setLoadingPercentage(0);

    const progressInterval = setInterval(() => {
      setLoadingPercentage(prev => {
        if (prev >= 99) return 99;
        if (prev >= 90) return prev + 0.5;
        if (prev >= 70) return prev + 1;
        return prev + 3;
      });
    }, 200);

    const saveMessages: Array<{ type: 'success' | 'warning' | 'error'; text: string }> = [];

    try {
      const jobOrderId = jobOrderData.id || jobOrderData.JobOrder_ID;

      if (!jobOrderId) {
        console.error('[SAVE ERROR] ========================================');
        console.error('[SAVE ERROR] Missing job order ID');
        console.error('[SAVE ERROR] jobOrderData_keys:', Object.keys(jobOrderData || {}));
        console.error('[SAVE ERROR] jobOrderData_id:', jobOrderData?.id);
        console.error('[SAVE ERROR] jobOrderData_JobOrder_ID:', jobOrderData?.JobOrder_ID);
        console.error('[SAVE ERROR] ========================================');

        saveMessages.push({
          type: 'error',
          text: 'Cannot update: Missing job order ID'
        });

        setLoading(false);
        setShowLoadingModal(false);
        showMessageModal('Error', saveMessages);
        return;
      }

      console.log('[SAVE ID CHECK] ========================================');
      console.log('[SAVE ID CHECK] Job Order ID found:', jobOrderId);
      console.log('[SAVE ID CHECK] typeof jobOrderId:', typeof jobOrderId);
      console.log('[SAVE ID CHECK] This ID will be used to UPDATE existing record');
      console.log('[SAVE ID CHECK] ========================================');

      const jobOrderUpdateData: any = {
        date_installed: updatedFormData.dateInstalled,
        usage_type: updatedFormData.usageType,
        router_model: updatedFormData.routerModel,
        lcpnap: updatedFormData.lcpnap,
        port: updatedFormData.port,
        vlan: updatedFormData.vlan,
        visit_by: updatedFormData.visit_by,
        visit_with: updatedFormData.visit_with,
        visit_with_other: updatedFormData.visit_with_other,
        updated_by_user_email: updatedFormData.modifiedBy,
        desired_plan: updatedFormData.choosePlan
      };

      if (updatedFormData.onsiteStatus === 'Done') {
        jobOrderUpdateData.connection_type = updatedFormData.connectionType;
        jobOrderUpdateData.modem_router_sn = updatedFormData.modemSN;
        jobOrderUpdateData.ip_address = updatedFormData.ip;
        jobOrderUpdateData.onsite_remarks = updatedFormData.onsiteRemarks;
        jobOrderUpdateData.address_coordinates = updatedFormData.addressCoordinates || '';
        jobOrderUpdateData.onsite_status = 'Done';


        console.log('[SAVE DEBUG] Address Coordinates:', updatedFormData.addressCoordinates);



        const firstName = (jobOrderData?.First_Name || jobOrderData?.first_name || '').trim();
        const middleInitial = (jobOrderData?.Middle_Initial || jobOrderData?.middle_initial || '').trim();
        const fullLastName = (jobOrderData?.Last_Name || jobOrderData?.last_name || '').trim();
        const folderName = `(joborder)${firstName} ${middleInitial} ${fullLastName}`.trim();

        const imageFormData = new FormData();
        imageFormData.append('folder_name', folderName);

        console.log('[UPLOAD START] Preparing images for upload...');

        if (formData.signedContractImage) {
          console.log(`[APPEND] Signed Contract: ${(formData.signedContractImage.size / 1024 / 1024).toFixed(2)}MB`);
          imageFormData.append('signed_contract_image', formData.signedContractImage, formData.signedContractImage.name);
        }
        if (formData.setupImage) {
          console.log(`[APPEND] Setup: ${(formData.setupImage.size / 1024 / 1024).toFixed(2)}MB`);
          imageFormData.append('setup_image', formData.setupImage, formData.setupImage.name);
        }
        if (formData.boxReadingImage) {
          console.log(`[APPEND] Box Reading: ${(formData.boxReadingImage.size / 1024 / 1024).toFixed(2)}MB`);
          imageFormData.append('box_reading_image', formData.boxReadingImage, formData.boxReadingImage.name);
        }
        if (formData.routerReadingImage) {
          console.log(`[APPEND] Router Reading: ${(formData.routerReadingImage.size / 1024 / 1024).toFixed(2)}MB`);
          imageFormData.append('router_reading_image', formData.routerReadingImage, formData.routerReadingImage.name);
        }
        if (formData.portLabelImage) {
          console.log(`[APPEND] Port Label: ${(formData.portLabelImage.size / 1024 / 1024).toFixed(2)}MB`);
          imageFormData.append('port_label_image', formData.portLabelImage, formData.portLabelImage.name);
        }
        if (formData.clientSignatureImage) {
          console.log(`[APPEND] Client Signature: ${(formData.clientSignatureImage.size / 1024 / 1024).toFixed(2)}MB`);
          imageFormData.append('client_signature_image', formData.clientSignatureImage, formData.clientSignatureImage.name);
        }
        if (formData.speedTestImage) {
          console.log(`[APPEND] Speed Test: ${(formData.speedTestImage.size / 1024 / 1024).toFixed(2)}MB`);
          imageFormData.append('speed_test_image', formData.speedTestImage, formData.speedTestImage.name);
        }

        console.log('[UPLOAD] FormData prepared, sending to backend...');

        try {
          const uploadResponse = await apiClient.post<{
            success: boolean;
            message: string;
            data?: {
              signed_contract_image_url?: string;
              setup_image_url?: string;
              box_reading_image_url?: string;
              router_reading_image_url?: string;
              port_label_image_url?: string;
              client_signature_image_url?: string;
              speedtest_image_url?: string;
            };
            folder_id?: string;
          }>(`/job-orders/${jobOrderId}/upload-images`, imageFormData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          });

          if (uploadResponse.data.success && uploadResponse.data.data) {
            const imageUrls = uploadResponse.data.data;

            if (imageUrls.signed_contract_image_url) {
              jobOrderUpdateData.signed_contract_image_url = imageUrls.signed_contract_image_url;
            }
            if (imageUrls.setup_image_url) {
              jobOrderUpdateData.setup_image_url = imageUrls.setup_image_url;
            }
            if (imageUrls.box_reading_image_url) {
              jobOrderUpdateData.box_reading_image_url = imageUrls.box_reading_image_url;
            }
            if (imageUrls.router_reading_image_url) {
              jobOrderUpdateData.router_reading_image_url = imageUrls.router_reading_image_url;
            }
            if (imageUrls.port_label_image_url) {
              jobOrderUpdateData.port_label_image_url = imageUrls.port_label_image_url;
            }
            if (imageUrls.client_signature_image_url) {
              jobOrderUpdateData.client_signature_url = imageUrls.client_signature_image_url;
            }
            if (imageUrls.speedtest_image_url) {
              jobOrderUpdateData.speedtest_image_url = imageUrls.speedtest_image_url;
            }
          }
        } catch (uploadError: any) {
          const errorMsg = uploadError.response?.data?.message || uploadError.message || 'Unknown error';
          saveMessages.push({
            type: 'warning',
            text: `Failed to upload images to Google Drive: ${errorMsg}`
          });
        }
      }

      if (updatedFormData.onsiteStatus === 'Failed' || updatedFormData.onsiteStatus === 'Reschedule') {
        jobOrderUpdateData.onsite_remarks = updatedFormData.onsiteRemarks;
        jobOrderUpdateData.status_remarks = updatedFormData.statusRemarks;
        jobOrderUpdateData.onsite_status = updatedFormData.onsiteStatus;
      }

      if (updatedFormData.onsiteStatus === 'In Progress') {
        jobOrderUpdateData.onsite_status = 'In Progress';

      }

      console.log('[API CALL] ========================================');
      console.log('[API CALL] ABOUT TO CALL: updateJobOrder()');
      console.log('[API CALL] Method: PUT');
      console.log('[API CALL] Endpoint: /job-orders/' + jobOrderId);
      console.log('[API CALL] Job Order ID:', jobOrderId);
      console.log('[API CALL] typeof jobOrderId:', typeof jobOrderId);
      console.log('[API CALL] Update Data Keys:', Object.keys(jobOrderUpdateData));
      console.log('[API CALL] Full Update Data:', JSON.stringify(jobOrderUpdateData, null, 2));
      console.log('[API CALL] IMPORTANT: This should UPDATE existing row, NOT create new row');
      console.log('[API CALL] ========================================');

      const jobOrderResponse = await updateJobOrder(jobOrderId, jobOrderUpdateData);

      console.log('[API RESPONSE] ========================================');
      console.log('[API RESPONSE] updateJobOrder completed');
      console.log('[API RESPONSE] Full response:', JSON.stringify(jobOrderResponse, null, 2));
      console.log('[API RESPONSE] success:', jobOrderResponse?.success);
      console.log('[API RESPONSE] message:', jobOrderResponse?.message);
      console.log('[API RESPONSE] data:', jobOrderResponse?.data);
      console.log('[API RESPONSE] ========================================');

      if (!jobOrderResponse.success) {
        console.error('[SAVE ERROR] updateJobOrder failed:', jobOrderResponse);
        throw new Error(jobOrderResponse.message || 'Job order update failed');
      }

      console.log('[SAVE SUCCESS] Job order updated successfully');

      saveMessages.push({
        type: 'success',
        text: 'Job order updated successfully'
      });

      // Clear saved draft
      if (jobOrderId) {
        try {
          await AsyncStorage.removeItem(`jobOrderDraft_${jobOrderId}`);
          await AsyncStorage.removeItem(`jobOrderItemsDraft_${jobOrderId}`);
        } catch (e) {
          console.error('Error clearing draft:', e);
        }
      }

      // RADIUS/PPPoE Login - Execute AFTER LCPNAP/Port are saved
      if (updatedFormData.onsiteStatus === 'Done') {
        const hasTechInput = usernamePattern && usernamePattern.sequence.some(item => item.type === 'tech_input');
        let credentialsUpdated = false;

        const credentialsUpdateData: any = {};

        if (hasTechInput && techInputValue.trim()) {
          credentialsUpdateData.pppoe_username = techInputValue.trim();
          credentialsUpdated = true;
          // Password will be auto-generated by backend when username is provided without password
          console.log('[SAVE DEBUG] Tech Input PPPoE Username:', techInputValue.trim());
          console.log('[SAVE DEBUG] Password will be auto-generated by backend');
        } else {
          const planNameForRadius = updatedFormData.choosePlan.includes(' - P')
            ? updatedFormData.choosePlan.split(' - P')[0].trim()
            : updatedFormData.choosePlan;

          try {
            const radiusResponse = await apiClient.post<{
              success: boolean;
              message: string;
              data?: {
                username: string;
                password: string;
                group: string;
                credentials_exist?: boolean;
                radius_response?: any;
              };
            }>(`/job-orders/${jobOrderId}/create-radius-account`);

            if (radiusResponse.data.success && radiusResponse.data.data) {
              const { username, password, credentials_exist } = radiusResponse.data.data;

              // Update credentials data
              credentialsUpdateData.pppoe_username = username;
              credentialsUpdateData.pppoe_password = password;
              credentialsUpdated = true;

              if (credentials_exist) {
                saveMessages.push({
                  type: 'warning',
                  text: `PPPoE credentials already exist: Username: ${username}, Password: ${password}, Plan: ${planNameForRadius}`
                });
              } else {
                saveMessages.push({
                  type: 'success',
                  text: `RADIUS Account Created: Username: ${username}, Password: ${password}, Plan: ${planNameForRadius}`
                });
              }
            } else {
              saveMessages.push({
                type: 'warning',
                text: `RADIUS account creation failed: ${radiusResponse.data.message}`
              });
            }
          } catch (radiusError: any) {
            const errorMsg = radiusError.response?.data?.message || radiusError.message || 'Unknown error';
            saveMessages.push({
              type: 'warning',
              text: `RADIUS account creation failed: ${errorMsg}`
            });
          }
        }

        if (credentialsUpdated) {
          console.log('[API CALL] ========================================');
          console.log('[API CALL] SAVING CREDENTIALS (Second Pass)');
          console.log('[API CALL] Credentials Data:', credentialsUpdateData);

          try {
            // Update the job order again with the credentials
            // Merge with original update data to ensure required fields are present if needed by backend validation
            // But ideally we only send what's new. Safe to send partial update if backend allows,
            // otherwise might need full payload. Assuming `updateJobOrder` merges or handles partials.
            // Safe bet: send just the credentials if backend is flexible, but `updateJobOrder` function
            // usually sends exactly what's passed.
            const credentialSaveResponse = await updateJobOrder(jobOrderId, credentialsUpdateData);

            if (!credentialSaveResponse.success) {
              console.error('[SAVE ERROR] Failed to save credentials:', credentialSaveResponse);
              saveMessages.push({
                type: 'error',
                text: `Failed to save generated credentials: ${credentialSaveResponse.message}`
              });
            } else {
              console.log('[SAVE SUCCESS] Credentials saved successfully');
            }
          } catch (credError: any) {
            console.error('[SAVE ERROR] Credential save exception:', credError);
            saveMessages.push({
              type: 'error',
              text: `Error saving credentials: ${credError.message}`
            });
          }
        }
      }

      let applicationId = jobOrderData.application_id || jobOrderData.Application_ID || jobOrderData.account_id;

      if (!applicationId) {
        try {
          const jobOrderResponse = await apiClient.get<{ success: boolean; data: any }>(`/job-orders/${jobOrderId}`);
          if (jobOrderResponse.data.success && jobOrderResponse.data.data) {
            applicationId = jobOrderResponse.data.data.application_id;
          }
        } catch (fetchError: any) {
        }
      }

      if (applicationId) {
        try {
          const firstName = jobOrderData?.First_Name || jobOrderData?.first_name || '';
          const middleInitial = jobOrderData?.Middle_Initial || jobOrderData?.middle_initial || '';
          const lastName = jobOrderData?.Last_Name || jobOrderData?.last_name || '';
          const mobileNumber = jobOrderData?.Mobile_Number || jobOrderData?.mobile_number || '';
          const secondaryMobile = jobOrderData?.Secondary_Mobile_Number || jobOrderData?.secondary_mobile_number || '';
          const emailAddress = jobOrderData?.Email_Address || jobOrderData?.email_address || '';
          const installationAddress = jobOrderData?.Installation_Address || jobOrderData?.installation_address || '';
          const landmark = jobOrderData?.Landmark || jobOrderData?.landmark || '';
          const referredBy = jobOrderData?.Referred_By || jobOrderData?.referred_by || '';
          const promo = jobOrderData?.Promo || jobOrderData?.promo || '';

          const applicationUpdateData: any = {
            first_name: firstName,
            middle_initial: middleInitial,
            last_name: lastName,
            mobile_number: mobileNumber,
            secondary_mobile_number: secondaryMobile,
            email_address: emailAddress,
            installation_address: installationAddress,
            landmark: landmark,
            region: updatedFormData.region,
            city: updatedFormData.city,
            barangay: updatedFormData.barangay,
            desired_plan: updatedFormData.choosePlan,
            referred_by: referredBy,
            promo: promo
          };

          const applicationResponse = await updateApplication(applicationId.toString(), applicationUpdateData);

          saveMessages.push({
            type: 'success',
            text: `Application updated: Plan: ${updatedFormData.choosePlan}, Location: ${updatedFormData.region}, ${updatedFormData.city}, ${updatedFormData.barangay}`
          });
        } catch (appError: any) {
          const errorMsg = appError.response?.data?.message || appError.message || 'Unknown error';
          saveMessages.push({
            type: 'warning',
            text: `Application update failed: ${errorMsg} (Application ID: ${applicationId})`
          });
        }
      } else {
        saveMessages.push({
          type: 'warning',
          text: 'Cannot update application - missing application ID'
        });
      }

      if (updatedFormData.onsiteStatus === 'Done') {
        const validItems = orderItems.filter(item => {
          const quantity = parseInt(item.quantity);
          const isValid = item.itemId && item.itemId.trim() !== '' && !isNaN(quantity) && quantity > 0;
          return isValid;
        });

        console.log('[SAVE ITEMS] Valid items to save:', validItems.length, validItems);

        if (validItems.length > 0) {
          try {
            const numericJobOrderId = parseInt((jobOrderData.JobOrder_ID || jobOrderData.id || 0).toString());
            console.log('[SAVE ITEMS] Using Job Order ID:', numericJobOrderId);

            if (!numericJobOrderId || isNaN(numericJobOrderId)) {
              throw new Error('Invalid Job Order ID for items saving');
            }



            const itemsToCreate: JobOrderItem[] = validItems.map(item => ({
              job_order_id: numericJobOrderId,
              item_name: item.itemId,
              quantity: parseInt(item.quantity)
            }));

            console.log('[SAVE ITEMS] Creating new items:', itemsToCreate);
            const createResponse = await createJobOrderItems(itemsToCreate);

            if (!createResponse.success) {
              throw new Error(createResponse.message || 'Failed to create job order items');
            }

            console.log('[SAVE ITEMS] Items processing completed successfully');
          } catch (itemsError: any) {
            console.error('[SAVE ITEMS] ERROR:', itemsError);
            saveMessages.push({
              type: 'warning',
              text: `Items saving warning: ${itemsError.message || 'Check connection'}`
            });
          }
        }
      }

      clearInterval(progressInterval);
      setLoadingPercentage(100);
      await new Promise(resolve => setTimeout(resolve, 500));

      console.log('[SAVE COMPLETE] ========================================');
      console.log('[SAVE COMPLETE] All operations completed successfully');
      console.log('[SAVE COMPLETE] Final save messages:', saveMessages);
      console.log('[SAVE COMPLETE] ========================================');

      setErrors({});
      setLoading(false);
      setShowLoadingModal(false);
      setLoadingPercentage(0);
      onSave(updatedFormData);
      DeviceEventEmitter.emit('jobOrderUpdated');
      onClose();
    } catch (error: any) {
      clearInterval(progressInterval);
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error occurred';

      console.error('[SAVE ERROR] ========================================');
      console.error('[SAVE ERROR] Save operation failed');
      console.error('[SAVE ERROR] Error:', error);
      console.error('[SAVE ERROR] Error message:', errorMessage);
      console.error('[SAVE ERROR] Error response:', error.response);
      console.error('[SAVE ERROR] ========================================');

      setLoading(false);
      setShowLoadingModal(false);
      setLoadingPercentage(0);
      showMessageModal('Error', [
        { type: 'error', text: `Failed to update records: ${errorMessage}` }
      ]);
    }
  };

  const fullName = useMemo(() => `${jobOrderData?.First_Name || jobOrderData?.first_name || ''} ${jobOrderData?.Middle_Initial || jobOrderData?.middle_initial || ''} ${jobOrderData?.Last_Name || jobOrderData?.last_name || ''}`.trim(), [jobOrderData]);

  const selectedLcpnap = useMemo(() => lcpnaps.find(ln => ln.lcpnap_name === formData.lcpnap), [lcpnaps, formData.lcpnap]);
  const portTotal = selectedLcpnap?.port_total || 0;

  // Memoize filtered lists to prevent expensive re-computation on every render
  const filteredRouterModels = useMemo(() => {
    const query = routerModelSearch.toLowerCase();
    return routerModels
      .filter(rm => {
        if (!rm || !rm.model) return false;
        return String(rm.model).toLowerCase().includes(query);
      })
      .slice(0, 50);
  }, [routerModels, routerModelSearch]);

  const filteredLcpnaps = useMemo(() => {
    const query = lcpnapSearch.toLowerCase();

    if (!query) {
      return mostUsedLcpnaps;
    }

    return lcpnaps
      .filter(ln => {
        if (!ln || !ln.lcpnap_name) return false;
        return String(ln.lcpnap_name).toLowerCase().includes(query);
      })
      .slice(0, 50);
  }, [lcpnaps, lcpnapSearch, mostUsedLcpnaps]);

  const filteredInventoryItems = useMemo(() => {
    const query = itemSearch.toLowerCase();
    return inventoryItems
      .filter(invItem => {
        if (!invItem || !invItem.item_name) return false;
        return String(invItem.item_name).toLowerCase().includes(query);
      })
      .slice(0, 50);
  }, [inventoryItems, itemSearch]);

  const visitByTechnicians = useMemo(() =>
    technicians.filter(t => t.name !== formData.visit_with && t.name !== formData.visit_with_other),
    [technicians, formData.visit_with, formData.visit_with_other]
  );

  const visitWithTechnicians = useMemo(() =>
    technicians.filter(t => t.name !== formData.visit_by && t.name !== formData.visit_with_other),
    [technicians, formData.visit_by, formData.visit_with_other]
  );

  const visitWithOtherTechnicians = useMemo(() =>
    technicians.filter(t => t.name !== formData.visit_by && t.name !== formData.visit_with),
    [technicians, formData.visit_by, formData.visit_with]
  );

  const failedVisitByTechnicians = useMemo(() =>
    technicians, [technicians]
  );

  const failedVisitWithTechnicians = useMemo(() =>
    technicians.filter(t => t.name !== formData.visit_by),
    [technicians, formData.visit_by]
  );

  const failedVisitWithOtherTechnicians = useMemo(() =>
    technicians.filter(t => t.name !== formData.visit_by && t.name !== formData.visit_with),
    [technicians, formData.visit_by, formData.visit_with]
  );

  if (!isOpen) return null;

  return (
    <Modal
      visible={isOpen}
      transparent={true}
      animationType="slide"
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <Modal
          visible={showLoadingModal}
          transparent={true}
          animationType="fade"
        >
          <View style={styles.loadingModalOverlay}>
            <View style={[styles.loadingModalContent, { backgroundColor: isDarkMode ? '#1f2937' : '#ffffff' }]}>
              <ActivityIndicator
                size="large"
                color={colorPalette?.primary || '#7c3aed'}
              />
              <View>
                <Text style={[styles.loadingPercentage, { color: isDarkMode ? '#ffffff' : '#111827' }]}>{loadingPercentage}%</Text>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showModal}
          transparent={true}
          animationType="fade"
        >
          <View style={styles.messageModalOverlay}>
            <View style={[styles.messageModalContent, { backgroundColor: isDarkMode ? '#1f2937' : '#ffffff' }]}>
              <View style={[styles.messageModalHeader, { borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb' }]}>
                <Text style={[styles.messageModalTitle, { color: isDarkMode ? '#ffffff' : '#111827' }]}>{modalContent.title}</Text>
                <Pressable
                  onPress={() => setShowModal(false)}
                  style={styles.messageModalClose}
                >
                  <X size={20} color={isDarkMode ? '#9CA3AF' : '#4B5563'} />
                </Pressable>
              </View>
              <View style={styles.messageList}>
                <View>
                  {modalContent.messages.map((message, index) => (
                    <View
                      key={index}
                      style={[styles.messageItem, {
                        backgroundColor: message.type === 'success'
                          ? (isDarkMode ? 'rgba(20, 83, 45, 0.3)' : '#dcfce7')
                          : message.type === 'warning'
                            ? (isDarkMode ? 'rgba(113, 63, 18, 0.3)' : '#fef9c3')
                            : (isDarkMode ? 'rgba(127, 29, 29, 0.3)' : '#fee2e2'),
                        borderColor: message.type === 'success'
                          ? (isDarkMode ? '#15803d' : '#86efac')
                          : message.type === 'warning'
                            ? (isDarkMode ? '#a16207' : '#fde047')
                            : (isDarkMode ? '#b91c1c' : '#fca5a5')
                      }]}
                    >
                      {message.type === 'success' && (
                        <CheckCircle color="#22c55e" size={20} style={{ marginTop: 2 }} />
                      )}
                      {message.type === 'warning' && (
                        <AlertCircle color="#eab308" size={20} style={{ marginTop: 2 }} />
                      )}
                      {message.type === 'error' && (
                        <XCircle color="#ef4444" size={20} style={{ marginTop: 2 }} />
                      )}
                      <Text
                        style={[styles.messageText, {
                          color: message.type === 'success'
                            ? (isDarkMode ? '#bbf7d0' : '#166534')
                            : message.type === 'warning'
                              ? (isDarkMode ? '#fef08a' : '#854d0e')
                              : (isDarkMode ? '#fecaca' : '#991b1b')
                        }]}
                      >
                        {message.text}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
              <View style={[styles.messageModalFooter, { borderTopColor: isDarkMode ? '#374151' : '#e5e7eb' }]}>
                <Pressable
                  onPress={() => setShowModal(false)}
                  style={[styles.messageModalButton, {
                    backgroundColor: colorPalette?.primary || '#7c3aed'
                  }]}
                >
                  <Text style={styles.messageModalButtonText}>Close</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* LCP-NAP Selection Mini-Modal */}
        <Modal
          visible={isLcpnapMiniModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsLcpnapMiniModalVisible(false)}
        >
          <View style={styles.miniModalOverlay}>
            <View style={[styles.miniModalContent, { backgroundColor: isDarkMode ? '#1f2937' : '#ffffff' }]}>
              <View style={[styles.miniModalHeader, { borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb' }]}>
                <Text style={[styles.miniModalTitle, { color: isDarkMode ? '#ffffff' : '#111827' }]}>Select LCP-NAP</Text>
                <Pressable onPress={() => setIsLcpnapMiniModalVisible(false)} style={styles.miniModalClose}>
                  <X size={24} color={isDarkMode ? '#9CA3AF' : '#4B5563'} />
                </Pressable>
              </View>

              <View style={styles.miniModalSearchContainer}>
                <View style={[styles.searchContainer, {
                  backgroundColor: isDarkMode ? '#111827' : '#f9fafb',
                  borderColor: isDarkMode ? '#374151' : '#e5e7eb'
                }]}>
                  <Search size={18} color={isDarkMode ? '#9CA3AF' : '#4B5563'} />
                  <TextInput
                    placeholder="Search LCP-NAP..."
                    value={lcpnapSearch}
                    onChangeText={setLcpnapSearch}
                    placeholderTextColor={isDarkMode ? '#9CA3AF' : '#4B5563'}
                    style={[styles.searchInput, { color: isDarkMode ? '#ffffff' : '#111827' }]}
                    autoFocus={true}
                  />
                  {lcpnapSearch.length > 0 && (
                    <Pressable onPress={() => setLcpnapSearch('')}>
                      <X size={18} color={isDarkMode ? '#9CA3AF' : '#4B5563'} />
                    </Pressable>
                  )}
                </View>
              </View>

              <FlatList
                data={filteredLcpnaps}
                keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
                ItemSeparatorComponent={() => (
                  <View style={{ height: 16 }} />
                )}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => {
                      const name = item.lcpnap_name || (item as any).name || '';
                      handleInputChange('lcpnap', name);
                      setIsLcpnapMiniModalVisible(false);
                      setLcpnapSearch('');
                      Keyboard.dismiss();
                    }}
                    style={({ pressed }) => [
                      styles.miniModalItem,
                      {
                        backgroundColor: pressed
                          ? (isDarkMode ? 'rgba(124, 58, 237, 0.1)' : '#f3f4f6')
                          : 'transparent'
                      }
                    ]}
                  >
                    <Text style={[styles.miniModalItemText, {
                      color: formData.lcpnap === (item.lcpnap_name || (item as any).name)
                        ? (colorPalette?.primary || '#7c3aed')
                        : (isDarkMode ? '#e5e7eb' : '#374151'),
                      fontWeight: formData.lcpnap === (item.lcpnap_name || (item as any).name) ? '700' : 'bold',
                      flex: 1
                    }]}>
                      {item.lcpnap_name || (item as any).name}
                    </Text>
                    {formData.lcpnap === (item.lcpnap_name || (item as any).name) && (
                      <Check size={24} color={colorPalette?.primary || '#7c3aed'} />
                    )}
                  </Pressable>
                )}
                ListEmptyComponent={
                  <View style={styles.miniModalEmpty}>
                    <Text style={{ color: isDarkMode ? '#9CA3AF' : '#4B5563', fontSize: 16 }}>No results found</Text>
                  </View>
                }
                contentContainerStyle={{ paddingHorizontal: 40, paddingBottom: 20 }}
                style={{ flexGrow: 1 }}
              />
            </View>
          </View>
        </Modal>

        {/* Router Model Mini Modal */}
        <Modal
          visible={isRouterModelMiniModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsRouterModelMiniModalVisible(false)}
        >
          <View style={styles.miniModalOverlay}>
            <View style={[styles.miniModalContent, { backgroundColor: isDarkMode ? '#1f2937' : '#ffffff' }]}>
              <View style={[styles.miniModalHeader, { borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb' }]}>
                <Text style={[styles.miniModalTitle, { color: isDarkMode ? '#ffffff' : '#111827' }]}>Select Router Model</Text>
                <Pressable onPress={() => setIsRouterModelMiniModalVisible(false)} style={styles.miniModalClose}>
                  <X size={24} color={isDarkMode ? '#9CA3AF' : '#4B5563'} />
                </Pressable>
              </View>

              <View style={styles.miniModalSearchContainer}>
                <View style={[styles.searchContainer, {
                  backgroundColor: isDarkMode ? '#111827' : '#f9fafb',
                  borderColor: isDarkMode ? '#374151' : '#e5e7eb'
                }]}>
                  <Search size={18} color={isDarkMode ? '#9CA3AF' : '#4B5563'} />
                  <TextInput
                    placeholder="Search Router Model..."
                    value={routerModelSearch}
                    onChangeText={setRouterModelSearch}
                    placeholderTextColor={isDarkMode ? '#9CA3AF' : '#4B5563'}
                    autoFocus={true}
                    style={[styles.searchInput, { color: isDarkMode ? '#ffffff' : '#111827' }]}
                  />
                  {routerModelSearch.length > 0 && (
                    <Pressable onPress={() => setRouterModelSearch('')}>
                      <X size={18} color={isDarkMode ? '#9CA3AF' : '#4B5563'} />
                    </Pressable>
                  )}
                </View>
              </View>

              <FlatList
                data={filteredRouterModels}
                keyExtractor={(item, index) => item.model ? item.model.toString() : index.toString()}
                ItemSeparatorComponent={() => (
                  <View style={{ height: 16 }} />
                )}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => {
                      handleInputChange('routerModel', item.model);
                      setIsRouterModelMiniModalVisible(false);
                      setRouterModelSearch('');
                      Keyboard.dismiss();
                    }}
                    style={({ pressed }) => [
                      styles.miniModalItem,
                      {
                        backgroundColor: pressed
                          ? (isDarkMode ? 'rgba(124, 58, 237, 0.1)' : '#f3f4f6')
                          : 'transparent'
                      }
                    ]}
                  >
                    <Text style={[styles.miniModalItemText, {
                      color: formData.routerModel === item.model
                        ? (colorPalette?.primary || '#7c3aed')
                        : (isDarkMode ? '#e5e7eb' : '#374151'),
                      fontWeight: formData.routerModel === item.model ? '700' : 'bold',
                      flex: 1
                    }]}>
                      {item.model}
                    </Text>
                    {formData.routerModel === item.model && (
                      <Check size={24} color={colorPalette?.primary || '#7c3aed'} />
                    )}
                  </Pressable>
                )}
                ListEmptyComponent={
                  <View style={styles.miniModalEmpty}>
                    <Text style={{ color: isDarkMode ? '#9CA3AF' : '#4B5563', fontSize: 16 }}>No results found</Text>
                  </View>
                }
                contentContainerStyle={{ paddingHorizontal: 40, paddingBottom: 20 }}
                style={{ flexGrow: 1 }}
              />
            </View>
          </View>
        </Modal>

        <View style={[styles.modalContainer, { backgroundColor: isDarkMode ? '#111827' : '#f9fafb' }]}>
          <View style={[styles.header, {
            backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
            borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb'
          }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.headerTitle, { color: isDarkMode ? '#ffffff' : '#111827' }]}>{fullName}</Text>
            </View>
            <View style={styles.headerActions}>
              <Pressable
                onPress={onClose}
                disabled={loading}
                style={[styles.cancelButton, {
                  borderColor: loading ? (isDarkMode ? '#374151' : '#e5e7eb') : (colorPalette?.primary || '#7c3aed'),
                  opacity: loading ? 0.6 : 1
                }]}
              >
                <Text style={[styles.cancelButtonText, {
                  color: loading ? (isDarkMode ? '#4b5563' : '#9ca3af') : (colorPalette?.primary || '#7c3aed')
                }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSave}
                disabled={loading}
                style={[styles.submitButton, {
                  backgroundColor: loading ? (isDarkMode ? '#4b5563' : '#9ca3af') : (colorPalette?.primary || '#7c3aed')
                }]}
              >
                <Text style={styles.submitButtonText}>{loading ? 'Submitting...' : 'Submit'}</Text>
              </Pressable>
            </View>
          </View>

          <View style={[styles.contentContainer, { flex: 1 }]}>
            <ScrollView
              style={styles.contentContainer}
              contentContainerStyle={styles.scrollViewContent}
              scrollEnabled={scrollEnabled}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.inputGroup}>
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: isDarkMode ? '#d1d5db' : '#374151' }]}>
                    Choose Plan<Text style={styles.required}>*</Text>
                  </Text>
                  <View>
                    <View style={[styles.pickerContainer, {
                      borderColor: errors.choosePlan ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db'),
                      backgroundColor: isDarkMode ? '#1f2937' : '#ffffff'
                    }]}>
                      <Picker
                        selectedValue={formData.choosePlan}
                        onValueChange={(value) => handleInputChange('choosePlan', value)}
                        style={{ color: isDarkMode ? '#fff' : '#000' }}
                        dropdownIconColor={isDarkMode ? '#fff' : '#000'}
                      >
                        <Picker.Item key="default" label="Select Plan" value="" enabled={false} />
                        {formData.choosePlan && !plans.some(plan => {
                          const planWithPrice = plan.price ? `${plan.name} - P${plan.price}` : plan.name;
                          return planWithPrice === formData.choosePlan || plan.name === formData.choosePlan;
                        }) && (
                            <Picker.Item key="custom" label={formData.choosePlan} value={formData.choosePlan} />
                          )}
                        {plans.map((plan) => {
                          const planWithPrice = plan.price ? `${plan.name} - P${plan.price}` : plan.name;
                          return (
                            <Picker.Item key={plan.id} label={planWithPrice} value={planWithPrice} />
                          );
                        })}
                      </Picker>
                    </View>
                  </View>
                  {errors.choosePlan && (
                    <View style={styles.errorContainer}>
                      <View style={[styles.errorIcon, { backgroundColor: colorPalette?.primary || '#7c3aed' }]}>
                        <Text style={styles.errorIconText}>!</Text>
                      </View>
                      <Text style={[styles.errorText, { color: colorPalette?.primary || '#7c3aed' }]}>{errors.choosePlan}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: isDarkMode ? '#d1d5db' : '#374151' }]}>
                    Onsite Status<Text style={styles.required}>*</Text>
                  </Text>
                  <View>
                    <View style={[styles.pickerContainer, {
                      borderColor: errors.onsiteStatus ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db'),
                      backgroundColor: isDarkMode ? '#1f2937' : '#ffffff'
                    }]}>
                      <Picker
                        selectedValue={formData.onsiteStatus}
                        onValueChange={(value) => handleInputChange('onsiteStatus', value)}
                        style={{ color: isDarkMode ? '#fff' : '#000' }}
                        dropdownIconColor={isDarkMode ? '#fff' : '#000'}
                      >
                        <Picker.Item key="in-progress" label="In Progress" value="In Progress" />
                        <Picker.Item key="done" label="Done" value="Done" />
                        <Picker.Item key="failed" label="Failed" value="Failed" />
                        <Picker.Item key="reschedule" label="Reschedule" value="Reschedule" />
                      </Picker>
                    </View>
                  </View>
                  {errors.onsiteStatus && (
                    <View style={styles.errorContainer}>
                      <View style={[styles.errorIcon, { backgroundColor: colorPalette?.primary || '#7c3aed' }]}>
                        <Text style={styles.errorIconText}>!</Text>
                      </View>
                      <Text style={[styles.errorText, { color: colorPalette?.primary || '#7c3aed' }]}>{errors.onsiteStatus}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: isDarkMode ? '#d1d5db' : '#374151' }]}>Region</Text>
                  <TextInput
                    value={formData.region}
                    editable={false}
                    placeholderTextColor={isDarkMode ? '#9CA3AF' : '#4B5563'}
                    style={[styles.textInput, {
                      opacity: 0.75,
                      backgroundColor: isDarkMode ? '#374151' : '#f3f4f6',
                      borderColor: isDarkMode ? '#4b5563' : '#d1d5db',
                      color: isDarkMode ? '#d1d5db' : '#4b5563'
                    }]}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: isDarkMode ? '#d1d5db' : '#374151' }]}>City</Text>
                  <TextInput
                    value={formData.city}
                    editable={false}
                    placeholderTextColor={isDarkMode ? '#9CA3AF' : '#4B5563'}
                    style={[styles.textInput, {
                      opacity: 0.75,
                      backgroundColor: isDarkMode ? '#374151' : '#f3f4f6',
                      borderColor: isDarkMode ? '#4b5563' : '#d1d5db',
                      color: isDarkMode ? '#d1d5db' : '#4b5563'
                    }]}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: isDarkMode ? '#d1d5db' : '#374151' }]}>Barangay</Text>
                  <TextInput
                    value={formData.barangay}
                    editable={false}
                    placeholderTextColor={isDarkMode ? '#9CA3AF' : '#4B5563'}
                    style={[styles.textInput, {
                      opacity: 0.75,
                      backgroundColor: isDarkMode ? '#374151' : '#f3f4f6',
                      borderColor: isDarkMode ? '#4b5563' : '#d1d5db',
                      color: isDarkMode ? '#d1d5db' : '#4b5563'
                    }]}
                  />
                </View>


                {formData.onsiteStatus === 'Done' && (
                  <>
                    <View style={styles.inputGroup}>
                      <Text style={[styles.label, { color: isDarkMode ? '#d1d5db' : '#374151' }]}>
                        Date Installed<Text style={styles.required}>*</Text>
                      </Text>
                      <View>
                        <Pressable
                          onPress={() => setShowDatePicker(true)}
                          style={[styles.datePickerButton, {
                            borderColor: errors.dateInstalled ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db'),
                            backgroundColor: isDarkMode ? '#1f2937' : '#ffffff'
                          }]}
                        >
                          <Text style={{
                            color: formData.dateInstalled ? (isDarkMode ? '#ffffff' : '#111827') : (isDarkMode ? '#6b7280' : '#9ca3af')
                          }}>
                            {formData.dateInstalled || 'Select Date'}
                          </Text>
                        </Pressable>
                        {showDatePicker && (
                          <DateTimePicker
                            value={formData.dateInstalled ? new Date(formData.dateInstalled) : new Date()}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={onDateChange}
                            maximumDate={new Date()}
                          />
                        )}
                      </View>
                      {errors.dateInstalled && (
                        <View style={styles.errorContainer}>
                          <View style={[styles.errorIcon, { backgroundColor: colorPalette?.primary || '#7c3aed' }]}>
                            <Text style={styles.errorIconText}>!</Text>
                          </View>
                          <Text style={[styles.errorText, { color: colorPalette?.primary || '#7c3aed' }]}>This entry is required</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={[styles.label, { color: isDarkMode ? '#d1d5db' : '#374151' }]}>
                        Usage Type<Text style={styles.required}>*</Text>
                      </Text>
                      <View>
                        <View style={[styles.pickerContainer, {
                          borderColor: errors.usageType ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db'),
                          backgroundColor: isDarkMode ? '#1f2937' : '#ffffff'
                        }]}>
                          <Picker
                            selectedValue={formData.usageType}
                            onValueChange={(value) => handleInputChange('usageType', value)}
                            style={{ color: isDarkMode ? '#fff' : '#000' }}
                            dropdownIconColor={isDarkMode ? '#fff' : '#000'}
                          >
                            <Picker.Item key="default" label="Select Usage Type" value="" enabled={false} />
                            {(() => {
                              if (!formData.usageType) return null;
                              const val = String(formData.usageType);
                              const low = val.toLowerCase().trim();
                              if (low === 'undefined' || low === 'null' || low === '' || low.includes('undefined')) return null;

                              const isExisting = usageTypes.some(ut => {
                                const name = String(ut.usage_name || (ut as any).Usage_Name || '').trim().toLowerCase();
                                return name === low;
                              });
                              if (isExisting) return null;

                              return <Picker.Item key="custom" label={val} value={val} />;
                            })()}
                            {usageTypes
                              .filter(ut => {
                                const val = ut.usage_name || (ut as any).Usage_Name || (ut as any).usageName;
                                if (!val) return false;
                                const name = String(val).trim().toLowerCase();
                                return name !== 'undefined' && name !== 'null' && name !== '' && !name.includes('undefined');
                              })
                              .map((usageType) => (
                                <Picker.Item
                                  key={usageType.id || usageType.usage_name}
                                  label={String(usageType.usage_name || (usageType as any).Usage_Name)}
                                  value={String(usageType.usage_name || (usageType as any).Usage_Name)}
                                />
                              ))}
                          </Picker>
                        </View>
                      </View>
                      {errors.usageType && (
                        <View style={styles.errorContainer}>
                          <View style={[styles.errorIcon, { backgroundColor: colorPalette?.primary || '#7c3aed' }]}>
                            <Text style={styles.errorIconText}>!</Text>
                          </View>
                          <Text style={[styles.errorText, { color: colorPalette?.primary || '#7c3aed' }]}>This entry is required</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={[styles.label, { color: isDarkMode ? '#d1d5db' : '#374151' }]}>
                        Connection Type<Text style={styles.required}>*</Text>
                      </Text>
                      <View style={styles.connectionTypeContainer}>
                        <Pressable
                          onPress={() => handleInputChange('connectionType', 'Antenna')}
                          style={[styles.connectionTypeButton, {
                            backgroundColor: formData.connectionType === 'Antenna'
                              ? (colorPalette?.primary || '#7c3aed')
                              : (isDarkMode ? '#1f2937' : '#f3f4f6'),
                            borderColor: formData.connectionType === 'Antenna'
                              ? (colorPalette?.accent || '#dc2626')
                              : (isDarkMode ? '#374151' : '#d1d5db')
                          }]}
                        >
                          <Text style={[styles.connectionTypeText, {
                            color: formData.connectionType === 'Antenna'
                              ? '#ffffff'
                              : (isDarkMode ? '#d1d5db' : '#374151')
                          }]}>Antenna</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => handleInputChange('connectionType', 'Fiber')}
                          style={[styles.connectionTypeButton, {
                            backgroundColor: formData.connectionType === 'Fiber'
                              ? (colorPalette?.primary || '#7c3aed')
                              : (isDarkMode ? '#1f2937' : '#f3f4f6'),
                            borderColor: formData.connectionType === 'Fiber'
                              ? (colorPalette?.accent || '#dc2626')
                              : (isDarkMode ? '#374151' : '#d1d5db')
                          }]}
                        >
                          <Text style={[styles.connectionTypeText, {
                            color: formData.connectionType === 'Fiber'
                              ? '#ffffff'
                              : (isDarkMode ? '#d1d5db' : '#374151')
                          }]}>Fiber</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => handleInputChange('connectionType', 'Local')}
                          style={[styles.connectionTypeButton, {
                            backgroundColor: formData.connectionType === 'Local'
                              ? (colorPalette?.primary || '#7c3aed')
                              : (isDarkMode ? '#1f2937' : '#f3f4f6'),
                            borderColor: formData.connectionType === 'Local'
                              ? (colorPalette?.accent || '#dc2626')
                              : (isDarkMode ? '#374151' : '#d1d5db')
                          }]}
                        >
                          <Text style={[styles.connectionTypeText, {
                            color: formData.connectionType === 'Local'
                              ? '#ffffff'
                              : (isDarkMode ? '#d1d5db' : '#374151')
                          }]}>Local</Text>
                        </Pressable>
                      </View>
                      {errors.connectionType && (
                        <View style={styles.errorContainer}>
                          <View style={[styles.errorIcon, { backgroundColor: colorPalette?.primary || '#7c3aed' }]}>
                            <Text style={styles.errorIconText}>!</Text>
                          </View>
                          <Text style={[styles.errorText, { color: colorPalette?.primary || '#7c3aed' }]}>This entry is required</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={[styles.label, { color: isDarkMode ? '#d1d5db' : '#374151' }]}>
                        Router Model<Text style={styles.required}>*</Text>
                      </Text>
                      <Pressable
                        onPress={() => setIsRouterModelMiniModalVisible(true)}
                        style={[styles.searchContainer, {
                          backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                          borderColor: errors.routerModel ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db'),
                          height: 50,
                          paddingHorizontal: 12,
                        }]}
                      >
                        <Search size={18} color={isDarkMode ? '#9CA3AF' : '#4B5563'} />
                        <Text style={{
                          flex: 1,
                          paddingHorizontal: 12,
                          color: formData.routerModel ? (isDarkMode ? '#ffffff' : '#111827') : (isDarkMode ? '#9CA3AF' : '#4B5563'),
                          fontSize: 14
                        }}>
                          {formData.routerModel || "Select Router Model..."}
                        </Text>
                        <ChevronDown size={18} color={isDarkMode ? '#9CA3AF' : '#4B5563'} />
                      </Pressable>
                      {errors.routerModel && (
                        <View style={styles.errorContainer}>
                          <View style={[styles.errorIcon, { backgroundColor: colorPalette?.primary || '#7c3aed' }]}>
                            <Text style={styles.errorIconText}>!</Text>
                          </View>
                          <Text style={[styles.errorText, { color: colorPalette?.primary || '#7c3aed' }]}>This entry is required</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={[styles.label, { color: isDarkMode ? '#d1d5db' : '#374151' }]}>
                        Modem SN<Text style={styles.required}>*</Text>
                      </Text>
                      <TextInput
                        value={formData.modemSN}
                        onChangeText={(text) => handleInputChange('modemSN', text)}
                        placeholderTextColor={isDarkMode ? '#9CA3AF' : '#4B5563'}
                        style={[styles.textInput, {
                          backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                          color: isDarkMode ? '#ffffff' : '#111827',
                          borderColor: errors.modemSN ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db')
                        }]}
                      />
                      {errors.modemSN && (
                        <View style={styles.errorContainer}>
                          <View style={[styles.errorIcon, { backgroundColor: colorPalette?.primary || '#7c3aed' }]}>
                            <Text style={styles.errorIconText}>!</Text>
                          </View>
                          <Text style={[styles.errorText, { color: colorPalette?.primary || '#7c3aed' }]}>{errors.modemSN}</Text>
                        </View>
                      )}
                    </View>

                    {usernamePattern && usernamePattern.sequence.some(item => item.type === 'tech_input') && (
                      <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: isDarkMode ? '#d1d5db' : '#374151' }]}>
                          PPPoE Username<Text style={styles.required}>*</Text>
                        </Text>
                        <TextInput
                          value={techInputValue}
                          onChangeText={(text) => {
                            setTechInputValue(text);
                            if (errors.techInput) {
                              setErrors(prev => ({ ...prev, techInput: '' }));
                            }
                          }}
                          placeholder="Enter PPPoE username"
                          placeholderTextColor={isDarkMode ? '#9CA3AF' : '#4B5563'}
                          style={[styles.textInput, {
                            backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                            color: isDarkMode ? '#ffffff' : '#111827',
                            borderColor: errors.techInput ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db')
                          }]}
                        />
                        {errors.techInput && (
                          <View style={styles.errorContainer}>
                            <View style={[styles.errorIcon, { backgroundColor: colorPalette?.primary || '#7c3aed' }]}>
                              <Text style={styles.errorIconText}>!</Text>
                            </View>
                            <Text style={[styles.errorText, { color: colorPalette?.primary || '#7c3aed' }]}>{errors.techInput}</Text>
                          </View>
                        )}
                        {!techInputValue.trim() && !errors.techInput && (
                          <Text style={{ fontSize: 12, marginTop: 4, color: isDarkMode ? '#9ca3af' : '#4b5563' }}>
                            This will be used as the PPPoE username
                          </Text>
                        )}
                      </View>
                    )}

                    {formData.connectionType === 'Antenna' && (
                      <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: isDarkMode ? '#d1d5db' : '#374151' }]}>
                          IP<Text style={styles.required}>*</Text>
                        </Text>
                        <TextInput
                          value={formData.ip}
                          onChangeText={(text) => handleInputChange('ip', text)}
                          placeholderTextColor={isDarkMode ? '#9CA3AF' : '#4B5563'}
                          style={[styles.textInput, {
                            backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                            color: isDarkMode ? '#ffffff' : '#111827',
                            borderColor: errors.ip ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db')
                          }]}
                        />
                        {errors.ip && (
                          <View style={styles.errorContainer}>
                            <View style={[styles.errorIcon, { backgroundColor: colorPalette?.primary || '#7c3aed' }]}>
                              <Text style={styles.errorIconText}>!</Text>
                            </View>
                            <Text style={[styles.errorText, { color: colorPalette?.primary || '#7c3aed' }]}>This entry is required</Text>
                          </View>
                        )}
                      </View>
                    )}

                    {formData.connectionType === 'Fiber' && (
                      <View style={styles.inputGroup}>
                        <View style={styles.inputGroup}>
                          <Text style={[styles.label, { color: isDarkMode ? '#d1d5db' : '#374151' }]}>
                            LCP-NAP<Text style={styles.required}>*</Text>
                          </Text>
                          <Pressable
                            onPress={() => {
                              setIsLcpnapMiniModalVisible(true);
                              setLcpnapSearch(''); // Clear search on open to show recommendations (Top 5)
                            }}
                            style={[styles.searchContainer, {
                              backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                              borderColor: errors.lcpnap ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db'),
                              paddingVertical: 12
                            }]}
                          >
                            <Search size={18} color={isDarkMode ? '#9CA3AF' : '#4B5563'} />
                            <Text style={[styles.searchInput, {
                              color: formData.lcpnap ? (isDarkMode ? '#ffffff' : '#111827') : (isDarkMode ? '#9CA3AF' : '#4B5563')
                            }]}>
                              {formData.lcpnap || "Select LCP-NAP..."}
                            </Text>
                            <ChevronDown size={18} color={isDarkMode ? '#9CA3AF' : '#4B5563'} />
                          </Pressable>
                          {errors.lcpnap && (
                            <View style={styles.errorContainer}>
                              <View style={[styles.errorIcon, { backgroundColor: colorPalette?.primary || '#7c3aed' }]}>
                                <Text style={styles.errorIconText}>!</Text>
                              </View>
                              <Text style={[styles.errorText, { color: colorPalette?.primary || '#7c3aed' }]}>{errors.lcpnap}</Text>
                            </View>
                          )}
                        </View>

                        <View style={styles.inputGroup}>
                          <Text style={[styles.label, { color: isDarkMode ? '#d1d5db' : '#374151' }]}>
                            PORT<Text style={styles.required}>*</Text>
                          </Text>
                          <View>
                            <View style={[styles.pickerContainer, {
                              borderColor: errors.port ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db'),
                              backgroundColor: isDarkMode ? '#1f2937' : '#ffffff'
                            }]}>
                              <Picker
                                selectedValue={formData.port}
                                onValueChange={(value) => handleInputChange('port', value)}
                                style={{ color: isDarkMode ? '#fff' : '#000' }}
                                dropdownIconColor={isDarkMode ? '#fff' : '#000'}
                              >
                                <Picker.Item label="Select PORT" value="" enabled={false} />
                                {(() => {
                                  if (!formData.port) return null;
                                  const p = String(formData.port);
                                  const low = p.toLowerCase().trim();
                                  if (low === 'undefined' || low === 'null' || low.includes('undefined')) return null;

                                  const isGenerated = Array.from({ length: portTotal }).some((_, i) => `p${(i + 1).toString().padStart(2, '0')}` === p);
                                  if (isGenerated) return null;

                                  return <Picker.Item label={p} value={p} />;
                                })()}
                                {Array.from({ length: portTotal }, (_, i) => {
                                  const portVal = `P${(i + 1).toString().padStart(2, '0')}`;

                                  if (usedPorts.has(portVal)) {
                                    return null;
                                  }

                                  return (
                                    <Picker.Item key={portVal} label={portVal} value={portVal} />
                                  );
                                })}
                              </Picker>
                            </View>
                          </View>
                          {errors.port && (
                            <View style={styles.errorContainer}>
                              <View style={[styles.errorIcon, { backgroundColor: colorPalette?.primary || '#7c3aed' }]}>
                                <Text style={styles.errorIconText}>!</Text>
                              </View>
                              <Text style={[styles.errorText, { color: colorPalette?.primary || '#7c3aed' }]}>{errors.port}</Text>
                            </View>
                          )}
                        </View>

                        <View style={styles.inputGroup}>
                          <Text style={[styles.label, { color: isDarkMode ? '#d1d5db' : '#374151' }]}>
                            VLAN<Text style={styles.required}>*</Text>
                          </Text>
                          <View>
                            <View style={[styles.pickerContainer, {
                              borderColor: errors.vlan ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db'),
                              backgroundColor: isDarkMode ? '#1f2937' : '#ffffff'
                            }]}>
                              <Picker
                                selectedValue={formData.vlan}
                                onValueChange={(value) => handleInputChange('vlan', value)}
                                style={{ color: isDarkMode ? '#fff' : '#000' }}
                                dropdownIconColor={isDarkMode ? '#fff' : '#000'}
                              >
                                <Picker.Item key="default" label="Select VLAN" value="" enabled={false} />
                                {(() => {
                                  if (!formData.vlan) return null;
                                  const v = String(formData.vlan);
                                  const low = v.toLowerCase().trim();
                                  if (low === 'undefined' || low === 'null' || low.includes('undefined')) return null;

                                  const isExisting = vlans.some(vlan => vlan.value.toString() === v);
                                  if (isExisting) return null;

                                  return <Picker.Item key="custom" label={v} value={v} />;
                                })()}
                                {vlans.map((vlan) => (
                                  <Picker.Item key={vlan.vlan_id} label={vlan.value.toString()} value={vlan.value.toString()} />
                                ))}
                              </Picker>
                            </View>
                          </View>
                          {errors.vlan && (
                            <View style={styles.errorContainer}>
                              <View style={[styles.errorIcon, { backgroundColor: colorPalette?.primary || '#7c3aed' }]}>
                                <Text style={styles.errorIconText}>!</Text>
                              </View>
                              <Text style={[styles.errorText, { color: colorPalette?.primary || '#7c3aed' }]}>{errors.vlan}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    )}

                    <View style={styles.inputGroup}>
                      <Text style={[styles.label, { color: isDarkMode ? '#d1d5db' : '#374151' }]}>
                        Visit By<Text style={styles.required}>*</Text>
                      </Text>
                      <View>
                        <View style={[styles.pickerContainer, {
                          borderColor: errors.visit_by ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db'),
                          backgroundColor: isDarkMode ? '#1f2937' : '#ffffff'
                        }]}>
                          <Picker
                            selectedValue={formData.visit_by}
                            onValueChange={(value) => handleInputChange('visit_by', value)}
                            style={{ color: isDarkMode ? '#fff' : '#000' }}
                            dropdownIconColor={isDarkMode ? '#fff' : '#000'}
                          >
                            <Picker.Item key="default" label="Select Visit By" value="" enabled={false} />
                            {(() => {
                              if (!formData.visit_by) return null;
                              const val = String(formData.visit_by);
                              const low = val.toLowerCase().trim();
                              if (low === 'undefined' || low === 'null' || low.includes('undefined')) return null;
                              if (technicians.some(t => t.name === val)) return null;
                              return <Picker.Item key="custom" label={val} value={val} />;
                            })()}
                            {visitByTechnicians.map((technician, index) => (
                              <Picker.Item key={technician.email || index} label={technician.name} value={technician.name} />
                            ))}
                          </Picker>
                        </View>
                      </View>
                      {errors.visit_by && (
                        <View style={styles.errorContainer}>
                          <View style={[styles.errorIcon, { backgroundColor: colorPalette?.primary || '#7c3aed' }]}>
                            <Text style={styles.errorIconText}>!</Text>
                          </View>
                          <Text style={[styles.errorText, { color: colorPalette?.primary || '#7c3aed' }]}>{errors.visit_by}</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={[styles.label, { color: isDarkMode ? '#d1d5db' : '#374151' }]}>
                        Visit With<Text style={styles.required}>*</Text>
                      </Text>
                      <View>
                        <View style={[styles.pickerContainer, {
                          borderColor: errors.visit_with ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db'),
                          backgroundColor: isDarkMode ? '#1f2937' : '#ffffff'
                        }]}>
                          <Picker
                            selectedValue={formData.visit_with}
                            onValueChange={(value) => handleInputChange('visit_with', value)}
                            style={{ color: isDarkMode ? '#fff' : '#000' }}
                            dropdownIconColor={isDarkMode ? '#fff' : '#000'}
                          >
                            <Picker.Item label="Select Visit With" value="" enabled={false} />
                            <Picker.Item label="None" value="None" />
                            {(() => {
                              if (!formData.visit_with) return null;
                              const val = String(formData.visit_with);
                              const low = val.toLowerCase().trim();
                              if (low === 'undefined' || low === 'null' || low.includes('undefined')) return null;
                              if (val === 'None' || val === '') return null;
                              if (technicians.some(t => t.name === val)) return null;
                              return <Picker.Item label={val} value={val} />;
                            })()}
                            {visitWithTechnicians.map((technician, index) => (
                              <Picker.Item key={index} label={technician.name} value={technician.name} />
                            ))}
                          </Picker>
                        </View>
                      </View>
                      {errors.visit_with && (
                        <View style={styles.errorContainer}>
                          <View style={[styles.errorIcon, { backgroundColor: colorPalette?.primary || '#7c3aed' }]}>
                            <Text style={styles.errorIconText}>!</Text>
                          </View>
                          <Text style={[styles.errorText, { color: colorPalette?.primary || '#7c3aed' }]}>{errors.visit_with}</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={[styles.label, { color: isDarkMode ? '#d1d5db' : '#374151' }]}>
                        Visit With(Other)<Text style={styles.required}>*</Text>
                      </Text>
                      <View>
                        <View style={[styles.pickerContainer, {
                          borderColor: errors.visit_with_other ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db'),
                          backgroundColor: isDarkMode ? '#1f2937' : '#ffffff'
                        }]}>
                          <Picker
                            selectedValue={formData.visit_with_other}
                            onValueChange={(value) => handleInputChange('visit_with_other', value)}
                            style={{ color: isDarkMode ? '#fff' : '#000' }}
                            dropdownIconColor={isDarkMode ? '#fff' : '#000'}
                          >
                            <Picker.Item label="Visit With(Other)" value="" enabled={false} />
                            <Picker.Item label="None" value="None" />
                            {(() => {
                              if (!formData.visit_with_other) return null;
                              const val = String(formData.visit_with_other);
                              const low = val.toLowerCase().trim();
                              if (low === 'undefined' || low === 'null' || low.includes('undefined')) return null;
                              if (val === 'None' || val === '') return null;
                              if (technicians.some(t => t.name === val)) return null;
                              return <Picker.Item label={val} value={val} />;
                            })()}
                            {visitWithOtherTechnicians.map((technician, index) => (
                              <Picker.Item key={index} label={technician.name} value={technician.name} />
                            ))}
                          </Picker>
                        </View>
                      </View>
                      {errors.visit_with_other && (
                        <View style={styles.errorContainer}>
                          <View style={[styles.errorIcon, { backgroundColor: colorPalette?.primary || '#7c3aed' }]}>
                            <Text style={styles.errorIconText}>!</Text>
                          </View>
                          <Text style={[styles.errorText, { color: colorPalette?.primary || '#7c3aed' }]}>{errors.visit_with_other}</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={[styles.label, { color: isDarkMode ? '#d1d5db' : '#374151' }]}>
                        Onsite Remarks<Text style={styles.required}>*</Text>
                      </Text>
                      <TextInput
                        value={formData.onsiteRemarks}
                        onChangeText={(text) => handleInputChange('onsiteRemarks', text)}
                        multiline={true}
                        numberOfLines={4}
                        placeholderTextColor={isDarkMode ? '#9CA3AF' : '#4B5563'}
                        style={[styles.textInput, styles.textArea, {
                          backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                          color: isDarkMode ? '#ffffff' : '#111827',
                          borderColor: errors.onsiteRemarks ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db')
                        }]}
                      />
                      {errors.onsiteRemarks && (
                        <View style={styles.errorContainer}>
                          <View style={[styles.errorIcon, { backgroundColor: colorPalette?.primary || '#7c3aed' }]}>
                            <Text style={styles.errorIconText}>!</Text>
                          </View>
                          <Text style={[styles.errorText, { color: colorPalette?.primary || '#7c3aed' }]}>{errors.onsiteRemarks}</Text>
                        </View>
                      )}
                    </View>

                    <ImagePreview
                      imageUrl={imagePreviews.boxReadingImage}
                      label="Box Reading Image"
                      onUpload={(file) => handleImageUpload('boxReadingImage', file)}
                      error={errors.boxReadingImage}
                    />

                    <ImagePreview
                      imageUrl={imagePreviews.routerReadingImage}
                      label="Router Reading Image"
                      onUpload={(file) => handleImageUpload('routerReadingImage', file)}
                      error={errors.routerReadingImage}
                    />

                    {(formData.connectionType === 'Antenna' || formData.connectionType === 'Local') && (
                      <ImagePreview
                        imageUrl={imagePreviews.portLabelImage}
                        label="Port Label Image"
                        onUpload={(file) => handleImageUpload('portLabelImage', file)}
                        error={errors.portLabelImage}
                      />
                    )}

                    <ImagePreview
                      imageUrl={imagePreviews.setupImage}
                      label="Setup Image"
                      onUpload={(file) => handleImageUpload('setupImage', file)}
                      error={errors.setupImage}
                    />

                    <ImagePreview
                      imageUrl={imagePreviews.signedContractImage}
                      label="Signed Contract Image"
                      onUpload={(file) => handleImageUpload('signedContractImage', file)}
                      error={errors.signedContractImage}
                    />

                    <View style={styles.inputGroup}>
                      <Text style={[styles.label, { color: isDarkMode ? '#d1d5db' : '#374151' }]}>Client Signature Image</Text>
                      {!isDrawingSignature ? (
                        <View>
                          <Pressable
                            onPress={() => setIsDrawingSignature(true)}
                            style={[styles.signatureContainer, {
                              borderColor: errors.clientSignatureImage ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db'),
                              backgroundColor: isDarkMode ? '#1f2937' : '#f9fafb'
                            }]}
                          >
                            {imagePreviews.clientSignatureImage ? (
                              <Image
                                source={{ uri: imagePreviews.clientSignatureImage }}
                                style={{ width: '100%', height: '100%', resizeMode: 'contain' }}
                              />
                            ) : (
                              <View style={styles.signaturePlaceholder}>
                                <View style={[styles.signatureIconCircle, { backgroundColor: (colorPalette?.primary || '#7c3aed') + '20' }]}>
                                  <Camera size={24} color={colorPalette?.primary || '#7c3aed'} />
                                </View>
                                <Text style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>Tap to Draw Signature</Text>
                              </View>
                            )}
                          </Pressable>
                          {imagePreviews.clientSignatureImage && (
                            <View style={styles.signatureActions}>
                              <Pressable
                                onPress={() => handleImageUpload('clientSignatureImage', null)}
                                style={styles.removeButton}
                              >
                                <X size={16} color="#ef4444" />
                                <Text style={styles.removeButtonText}>Remove</Text>
                              </Pressable>
                              <Pressable
                                onPress={() => setIsDrawingSignature(true)}
                                style={[styles.redrawButton, { backgroundColor: colorPalette?.primary || '#7c3aed' }]}
                              >
                                <Text style={styles.redrawButtonText}>Redraw</Text>
                              </Pressable>
                            </View>
                          )}
                        </View>
                      ) : (
                        <View style={[styles.signatureCanvasContainer, { borderColor: isDarkMode ? '#374151' : '#d1d5db' }]}>
                          <SignatureScreen
                            ref={signatureRef}
                            onOK={handleSignatureOK}
                            onEmpty={() => Alert.alert('Empty', 'Please provide a signature before saving')}
                            onBegin={() => setScrollEnabled(false)}
                            onEnd={() => setScrollEnabled(true)}
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
                            style={styles.signatureCloseButton}
                          >
                            <X size={20} color="#000" />
                          </Pressable>
                        </View>
                      )}
                      {errors.clientSignatureImage && (
                        <Text style={[styles.errorText, { color: '#ef4444', marginTop: 4 }]}>{errors.clientSignatureImage}</Text>
                      )}
                    </View>

                    <ImagePreview
                      imageUrl={imagePreviews.speedTestImage}
                      label="Speed Test Image"
                      onUpload={(file) => handleImageUpload('speedTestImage', file)}
                      error={errors.speedTestImage}
                    />

                    <View style={styles.inputGroup}>
                      <Text style={[styles.label, { color: isDarkMode ? '#d1d5db' : '#374151' }]}>
                        Items<Text style={styles.required}>*</Text>
                      </Text>
                      {orderItems.map((item, index) => (
                        <View
                          key={index}
                          style={[styles.itemRow, { zIndex: openItemIndex === index ? 1000 : 1 }]}
                        >
                          <View style={styles.itemRowContent}>
                            <View style={styles.itemSearchContainer}>
                              <View style={{ zIndex: openItemIndex === index ? 1000 : 1 }}>
                                {/* Search Input Field for Item */}
                                <View style={[styles.searchContainer, {
                                  backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                                  borderColor: errors[`item_${index}`] ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db')
                                }]}>
                                  <Search size={18} color={isDarkMode ? '#9CA3AF' : '#4B5563'} />
                                  <TextInput
                                    placeholder={`Select Item ${index + 1}`}
                                    value={openItemIndex === index ? itemSearch : (item.itemId || itemSearch)}
                                    onChangeText={(text) => {
                                      setItemSearch(text);
                                      if (openItemIndex !== index) setOpenItemIndex(index);
                                    }}
                                    onFocus={() => {
                                      setOpenItemIndex(index);
                                      setItemSearch('');
                                    }}
                                    placeholderTextColor={isDarkMode ? '#9CA3AF' : '#4B5563'}
                                    style={[styles.searchInput, { color: isDarkMode ? '#ffffff' : '#111827' }]}
                                  />
                                  {(openItemIndex === index || item.itemId) && (
                                    <Pressable
                                      onPress={() => {
                                        if (openItemIndex === index) {
                                          setOpenItemIndex(null);
                                          setItemSearch('');
                                        } else {
                                          handleItemChange(index, 'itemId', '');
                                          setItemSearch('');
                                        }
                                      }}
                                      style={{ padding: 4 }}
                                    >
                                      <X size={18} color={isDarkMode ? '#9CA3AF' : '#4B5563'} />
                                    </Pressable>
                                  )}
                                  {openItemIndex !== index && !item.itemId && (
                                    <ChevronDown size={18} color={isDarkMode ? '#9CA3AF' : '#4B5563'} />
                                  )}
                                </View>

                                {/* Dropdown Menu for Item */}
                                {openItemIndex === index && (
                                  <View style={[styles.dropdown, {
                                    backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                                    borderColor: isDarkMode ? '#374151' : '#e5e7eb',
                                    elevation: 10
                                  }]}>
                                    <ScrollView
                                      style={{ maxHeight: 240 }}
                                      nestedScrollEnabled={true}
                                      onScrollBeginDrag={() => setScrollEnabled(false)}
                                      onScrollEndDrag={() => setScrollEnabled(true)}
                                      onMomentumScrollBegin={() => setScrollEnabled(false)}
                                      onMomentumScrollEnd={() => setScrollEnabled(true)}
                                      keyboardShouldPersistTaps="always"
                                    >
                                      {"None".toLowerCase().includes(itemSearch.toLowerCase()) && (
                                        <Pressable
                                          key="none-item-option"
                                          style={[styles.dropdownItem, {
                                            borderBottomColor: isDarkMode ? '#374151' : '#f3f4f6',
                                            backgroundColor: item.itemId === 'None'
                                              ? (isDarkMode ? 'rgba(234, 88, 12, 0.2)' : '#fff7ed')
                                              : 'transparent'
                                          }]}
                                          onPress={() => {
                                            handleItemChange(index, 'itemId', 'None');
                                            setOpenItemIndex(null);
                                            setItemSearch('');
                                          }}
                                        >
                                          <View style={styles.dropdownItemContent}>
                                            <Text style={[styles.dropdownItemText, {
                                              color: item.itemId === 'None'
                                                ? (colorPalette?.primary || '#f97316')
                                                : (isDarkMode ? '#e5e7eb' : '#374151'),
                                              fontWeight: item.itemId === 'None' ? '500' : 'normal'
                                            }]}>
                                              None
                                            </Text>
                                            {item.itemId === 'None' && (
                                              <View style={[styles.dropdownItemSelectedIndicator, { backgroundColor: colorPalette?.primary || '#f97316' }]} />
                                            )}
                                          </View>
                                        </Pressable>
                                      )}

                                      {filteredInventoryItems.length > 0 ? (
                                        filteredInventoryItems.map((invItem, idx) => (
                                          <Pressable
                                            key={invItem.id ? invItem.id.toString() : idx.toString()}
                                            style={[styles.dropdownItem, {
                                              borderBottomColor: isDarkMode ? '#374151' : '#f3f4f6',
                                              backgroundColor: item.itemId === invItem.item_name
                                                ? (isDarkMode ? 'rgba(234, 88, 12, 0.2)' : '#fff7ed')
                                                : 'transparent'
                                            }]}
                                            onPress={() => {
                                              handleItemChange(index, 'itemId', invItem.item_name);
                                              setOpenItemIndex(null);
                                              setItemSearch('');
                                              Keyboard.dismiss();
                                            }}
                                          >
                                            <View style={styles.dropdownItemContent}>
                                              <Text style={[styles.dropdownItemText, {
                                                flex: 1,
                                                marginRight: 8,
                                                color: item.itemId === invItem.item_name
                                                  ? (colorPalette?.primary || '#f97316')
                                                  : (isDarkMode ? '#e5e7eb' : '#374151'),
                                                fontWeight: item.itemId === invItem.item_name ? '500' : 'normal'
                                              }]}>
                                                {invItem.item_name}
                                              </Text>
                                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                {(invItem.image_url || (invItem as any).image) && (
                                                  <Image
                                                    source={{ uri: convertGoogleDriveUrl(invItem.image_url || (invItem as any).image) || undefined }}
                                                    style={{ width: 48, height: 48, borderRadius: 8, backgroundColor: '#f3f4f6', resizeMode: 'cover' }}
                                                  />
                                                )}
                                                {item.itemId === invItem.item_name && (
                                                  <View style={[styles.dropdownItemSelectedIndicator, { backgroundColor: colorPalette?.primary || '#f97316' }]} />
                                                )}
                                              </View>
                                            </View>
                                          </Pressable>
                                        ))
                                      ) : (
                                        ! "None".toLowerCase().includes(itemSearch.toLowerCase()) && (
                                          <View style={styles.emptyDropdown}>
                                            <Text style={[styles.emptyDropdownText, { color: isDarkMode ? '#6b7280' : '#9ca3af' }]}>
                                              No results found for "{itemSearch}"
                                            </Text>
                                          </View>
                                        )
                                      )}
                                    </ScrollView>
                                  </View>
                                )}
                              </View>
                              {errors[`item_${index}`] && (
                                <Text style={[styles.errorText, { color: colorPalette?.primary || '#7c3aed', marginTop: 4 }]}>{errors[`item_${index}`]}</Text>
                              )}
                            </View>

                            {item.itemId && (
                              <View style={styles.itemQtyContainer}>
                                <TextInput
                                  keyboardType="numeric"
                                  value={item.quantity.toString()}
                                  onChangeText={(text) => handleItemChange(index, 'quantity', text)}
                                  placeholder="Qty"
                                  placeholderTextColor={isDarkMode ? '#9CA3AF' : '#4B5563'}
                                  style={[styles.textInput, {
                                    backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                                    color: isDarkMode ? '#ffffff' : '#111827',
                                    borderColor: isDarkMode ? '#374151' : '#d1d5db'
                                  }]}
                                />
                                {errors[`quantity_${index}`] && (
                                  <Text style={[styles.errorText, { color: colorPalette?.primary || '#7c3aed', marginTop: 4 }]}>{errors[`quantity_${index}`]}</Text>
                                )}
                              </View>
                            )}

                            {orderItems.length > 1 && (
                              <Pressable
                                onPress={() => handleRemoveItem(index)}
                                style={styles.removeItemButton}
                              >
                                <X size={20} color={isDarkMode ? '#F87171' : '#EF4444'} />
                              </Pressable>
                            )}
                          </View>
                        </View>
                      ))}
                      {errors.items && (
                        <View style={styles.errorContainer}>
                          <View style={[styles.errorIcon, { backgroundColor: colorPalette?.primary || '#7c3aed' }]}>
                            <Text style={styles.errorIconText}>!</Text>
                          </View>
                          <Text style={[styles.errorText, { color: colorPalette?.primary || '#7c3aed' }]}>{errors.items}</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.inputGroup}>
                      <LocationPicker
                        value={formData.addressCoordinates}
                        onChange={(coordinates) => handleInputChange('addressCoordinates', coordinates)}
                        isDarkMode={isDarkMode}
                        label="Address Coordinates"
                        required={true}
                        error={errors.addressCoordinates}
                      />
                    </View>
                  </>
                )}

                {(formData.onsiteStatus === 'Failed' || formData.onsiteStatus === 'Reschedule') && (
                  <View style={styles.inputGroup}>
                    <View style={styles.inputGroup}>
                      <Text style={[styles.label, { color: isDarkMode ? '#d1d5db' : '#374151' }]}>
                        Visit By<Text style={styles.required}>*</Text>
                      </Text>
                      <View>
                        <View style={[styles.pickerContainer, {
                          borderColor: errors.visit_by ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db'),
                          backgroundColor: isDarkMode ? '#1f2937' : '#ffffff'
                        }]}>
                          <Picker
                            selectedValue={formData.visit_by}
                            onValueChange={(value) => handleInputChange('visit_by', value)}
                            style={{ color: isDarkMode ? '#fff' : '#000' }}
                            dropdownIconColor={isDarkMode ? '#fff' : '#000'}
                          >
                            <Picker.Item label="Select Visit By" value="" enabled={false} />
                            {(() => {
                              if (!formData.visit_by) return null;
                              const val = String(formData.visit_by);
                              const low = val.toLowerCase().trim();
                              if (low === 'undefined' || low === 'null' || low.includes('undefined')) return null;
                              if (technicians.some(t => t.name === val)) return null;
                              return <Picker.Item label={val} value={val} />;
                            })()}
                            {failedVisitByTechnicians.map((technician, index) => (
                              <Picker.Item key={index} label={technician.name} value={technician.name} />
                            ))}
                          </Picker>
                        </View>
                      </View>
                      {errors.visit_by && (
                        <View style={styles.errorContainer}>
                          <View style={[styles.errorIcon, { backgroundColor: colorPalette?.primary || '#7c3aed' }]}>
                            <Text style={styles.errorIconText}>!</Text>
                          </View>
                          <Text style={[styles.errorText, { color: colorPalette?.primary || '#7c3aed' }]}>{errors.visit_by}</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={[styles.label, { color: isDarkMode ? '#d1d5db' : '#374151' }]}>
                        Visit With<Text style={styles.required}>*</Text>
                      </Text>
                      <View>
                        <View style={[styles.pickerContainer, {
                          borderColor: errors.visit_with ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db'),
                          backgroundColor: isDarkMode ? '#1f2937' : '#ffffff'
                        }]}>
                          <Picker
                            selectedValue={formData.visit_with}
                            onValueChange={(value) => handleInputChange('visit_with', value)}
                            style={{ color: isDarkMode ? '#fff' : '#000' }}
                            dropdownIconColor={isDarkMode ? '#fff' : '#000'}
                          >
                            <Picker.Item key="default" label="Select Visit With" value="" enabled={false} />
                            <Picker.Item key="none" label="None" value="None" />
                            {(() => {
                              if (!formData.visit_with) return null;
                              const val = String(formData.visit_with);
                              const low = val.toLowerCase().trim();
                              if (low === 'undefined' || low === 'null' || low.includes('undefined')) return null;
                              if (val === 'None' || val === '') return null;
                              if (technicians.some(t => t.name === val)) return null;
                              return <Picker.Item key="custom" label={val} value={val} />;
                            })()}
                            {failedVisitWithTechnicians.map((technician, index) => (
                              <Picker.Item key={technician.email || index} label={technician.name} value={technician.name} />
                            ))}
                          </Picker>
                        </View>
                      </View>
                      {errors.visit_with && (
                        <View style={styles.errorContainer}>
                          <View style={[styles.errorIcon, { backgroundColor: colorPalette?.primary || '#7c3aed' }]}>
                            <Text style={styles.errorIconText}>!</Text>
                          </View>
                          <Text style={[styles.errorText, { color: colorPalette?.primary || '#7c3aed' }]}>{errors.visit_with}</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={[styles.label, { color: isDarkMode ? '#d1d5db' : '#374151' }]}>
                        Visit With(Other)<Text style={styles.required}>*</Text>
                      </Text>
                      <View>
                        <View style={[styles.pickerContainer, {
                          borderColor: errors.visit_with_other ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db'),
                          backgroundColor: isDarkMode ? '#1f2937' : '#ffffff'
                        }]}>
                          <Picker
                            selectedValue={formData.visit_with_other}
                            onValueChange={(value) => handleInputChange('visit_with_other', value)}
                            style={{ color: isDarkMode ? '#fff' : '#000' }}
                            dropdownIconColor={isDarkMode ? '#fff' : '#000'}
                          >
                            <Picker.Item label="Visit With(Other)" value="" enabled={false} />
                            <Picker.Item label="None" value="None" />
                            {(() => {
                              if (!formData.visit_with_other) return null;
                              const val = String(formData.visit_with_other);
                              const low = val.toLowerCase().trim();
                              if (low === 'undefined' || low === 'null' || low.includes('undefined')) return null;
                              if (val === 'None' || val === '') return null;
                              if (technicians.some(t => t.name === val)) return null;
                              return <Picker.Item label={val} value={val} />;
                            })()}
                            {failedVisitWithOtherTechnicians.map((technician, index) => (
                              <Picker.Item key={index} label={technician.name} value={technician.name} />
                            ))}
                          </Picker>
                        </View>
                      </View>
                      {errors.visit_with_other && (
                        <View style={styles.errorContainer}>
                          <View style={[styles.errorIcon, { backgroundColor: colorPalette?.primary || '#7c3aed' }]}>
                            <Text style={styles.errorIconText}>!</Text>
                          </View>
                          <Text style={[styles.errorText, { color: colorPalette?.primary || '#7c3aed' }]}>{errors.visit_with_other}</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={[styles.label, { color: isDarkMode ? '#d1d5db' : '#374151' }]}>
                        Onsite Remarks<Text style={styles.required}>*</Text>
                      </Text>
                      <TextInput
                        value={formData.onsiteRemarks}
                        onChangeText={(text) => handleInputChange('onsiteRemarks', text)}
                        multiline={true}
                        numberOfLines={4}
                        placeholderTextColor={isDarkMode ? '#9CA3AF' : '#4B5563'}
                        style={[styles.textInput, styles.textArea, {
                          backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                          color: isDarkMode ? '#ffffff' : '#111827',
                          borderColor: errors.onsiteRemarks ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db')
                        }]}
                      />
                      {errors.onsiteRemarks && (
                        <View style={styles.errorContainer}>
                          <View style={[styles.errorIcon, { backgroundColor: colorPalette?.primary || '#7c3aed' }]}>
                            <Text style={styles.errorIconText}>!</Text>
                          </View>
                          <Text style={[styles.errorText, { color: colorPalette?.primary || '#7c3aed' }]}>{errors.onsiteRemarks}</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={[styles.label, { color: isDarkMode ? '#d1d5db' : '#374151' }]}>
                        Status Remarks<Text style={styles.required}>*</Text>
                      </Text>
                      <View>
                        <View style={[styles.pickerContainer, {
                          borderColor: errors.statusRemarks ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db'),
                          backgroundColor: isDarkMode ? '#1f2937' : '#ffffff'
                        }]}>
                          <Picker
                            selectedValue={formData.statusRemarks}
                            onValueChange={(value) => handleInputChange('statusRemarks', value)}
                            style={{ color: isDarkMode ? '#fff' : '#000' }}
                            dropdownIconColor={isDarkMode ? '#fff' : '#000'}
                          >
                            <Picker.Item label="Select Status Remarks" value="" />
                            <Picker.Item label="Customer Request" value="Customer Request" />
                            <Picker.Item label="Bad Weather" value="Bad Weather" />
                            <Picker.Item label="Technician Unavailable" value="Technician Unavailable" />
                            <Picker.Item label="Equipment Issue" value="Equipment Issue" />
                          </Picker>
                        </View>
                      </View>
                      {errors.statusRemarks && (
                        <View style={styles.errorContainer}>
                          <View style={[styles.errorIcon, { backgroundColor: colorPalette?.primary || '#7c3aed' }]}>
                            <Text style={styles.errorIconText}>!</Text>
                          </View>
                          <Text style={[styles.errorText, { color: colorPalette?.primary || '#7c3aed' }]}>{errors.statusRemarks}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    height: '90%',
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 8,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  submitButton: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 8,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  contentContainer: {
    flex: 1,
  },
  scrollViewContent: {
    padding: 24,
    paddingBottom: 40,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  required: {
    color: '#ef4444',
  },
  inputContainer: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  textInput: {
    width: '100%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 8,
  },
  textArea: {
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  datePickerButton: {
    width: '100%',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  errorIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  errorIconText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  errorText: {
    fontSize: 12,
  },
  connectionTypeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  connectionTypeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectionTypeText: {
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
  },
  dropdown: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '100%',
    marginTop: 4,
    zIndex: 50,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 5,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  dropdownItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownItemText: {
    fontSize: 14,
  },
  dropdownItemSelectedIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f97316',
  },
  emptyDropdown: {
    paddingHorizontal: 16,
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyDropdownText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  signatureContainer: {
    height: 192,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  signaturePlaceholder: {
    alignItems: 'center',
  },
  signatureIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  signatureActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#ef4444',
    fontSize: 12,
    marginLeft: 4,
  },
  redrawButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  redrawButtonText: {
    color: '#ffffff',
    fontSize: 12,
  },
  signatureCanvasContainer: {
    height: 288,
    borderWidth: 1,
    backgroundColor: '#ffffff',
    marginBottom: 8,
    overflow: 'hidden',
    borderRadius: 8,
  },
  signatureCloseButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 9999,
    zIndex: 10,
    elevation: 2,
  },
  itemRow: {
    marginBottom: 16,
  },
  itemRowContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  itemSearchContainer: {
    flex: 1,
  },
  itemQtyContainer: {
    width: 96,
  },
  removeItemButton: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingModalContent: {
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    minWidth: 320,
  },
  loadingPercentage: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  messageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  messageModalContent: {
    borderRadius: 12,
    width: '100%',
    maxWidth: 672,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  messageModalHeader: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  messageModalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  messageModalClose: {
    padding: 4,
  },
  messageList: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  messageItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  messageText: {
    fontSize: 14,
    flex: 1,
  },
  messageModalFooter: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  messageModalButton: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 8,
  },
  messageModalButtonText: {
    color: '#ffffff',
    fontWeight: '500',
    textAlign: 'center',
  },
  miniModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  miniModalContent: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  miniModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  miniModalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  miniModalClose: {
    padding: 4,
  },
  miniModalSearchContainer: {
    padding: 12,
  },
  miniModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  miniModalItemText: {
    fontSize: 24,
    textAlign: 'left',
  },
  miniModalEmpty: {
    padding: 24,
    alignItems: 'center',
  },
});

export default JobOrderDoneFormTechModal;
