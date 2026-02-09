import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, Modal, Image, Linking, Platform, DeviceEventEmitter, KeyboardAvoidingView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { X, ChevronDown, Camera, MapPin, CheckCircle, AlertCircle, XCircle, Loader2, Search } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { UserData } from '../types/api';
import { updateJobOrder } from '../services/jobOrderService';
import { userService } from '../services/userService';
import { planService, Plan } from '../services/planService';
import { routerModelService, RouterModel } from '../services/routerModelService';
import { getAllPorts, Port } from '../services/portService';
import { getAllLCPNAPs, LCPNAP } from '../services/lcpnapService';
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
  location: string;
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
    dateInstalled: '',
    usageType: '',
    choosePlan: '',
    connectionType: '',
    routerModel: '',
    modemSN: '',

    region: '',
    city: '',
    barangay: '',
    location: '',
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
  const [openItemIndex, setOpenItemIndex] = useState<number | null>(null);

  const [isLcpnapOpen, setIsLcpnapOpen] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

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
    const fetchUsernamePattern = async () => {
      if (isOpen) {
        try {
          const patterns = await pppoeService.getPatterns('username');
          if (patterns && patterns.length > 0) {
            const pattern = patterns[0];
            setUsernamePattern(pattern);

            // Load existing pppoe_username if available
            const existingUsername = jobOrderData?.pppoe_username || jobOrderData?.PPPoE_Username || '';
            if (existingUsername && pattern.sequence.some(item => item.type === 'tech_input')) {
              setTechInputValue(existingUsername);
            }
          }
        } catch (error) {
          console.error('Failed to fetch username pattern:', error);
          setUsernamePattern(null);
        }
      }
    };

    fetchUsernamePattern();
  }, [isOpen, jobOrderData]);

  useEffect(() => {
    if (!isOpen) return;

    if (jobOrderData) {
      const isValidImageUrl = (url: any): boolean => {
        if (!url) return false;
        if (typeof url !== 'string') return false;
        const trimmed = url.trim().toLowerCase();
        return trimmed !== '' && trimmed !== 'null' && trimmed !== 'undefined';
      };

      const getImageUrl = (fieldVariations: string[]): string | null => {
        for (const field of fieldVariations) {
          const value = jobOrderData?.[field];
          if (isValidImageUrl(value)) {
            return value;
          }
        }
        return null;
      };

      const clientSignatureVariations = [
        'client_signature_image_url',
        'Client_Signature_Image_URL',
        'client_sig_image_url',
        'signature_image_url',
        'clientSignatureImageUrl',
        'ClientSignatureImageURL',
        'client_signature_url',
        'clientSignatureUrl'
      ];

      const newImagePreviews = {
        signedContractImage: convertGoogleDriveUrl(jobOrderData?.signed_contract_image_url || jobOrderData?.Signed_Contract_Image_URL),
        setupImage: convertGoogleDriveUrl(jobOrderData?.setup_image_url || jobOrderData?.Setup_Image_URL),
        boxReadingImage: convertGoogleDriveUrl(jobOrderData?.box_reading_image_url || jobOrderData?.Box_Reading_Image_URL),
        routerReadingImage: convertGoogleDriveUrl(jobOrderData?.router_reading_image_url || jobOrderData?.Router_Reading_Image_URL),
        portLabelImage: convertGoogleDriveUrl(jobOrderData?.port_label_image_url || jobOrderData?.Port_Label_Image_URL),
        clientSignatureImage: convertGoogleDriveUrl(getImageUrl(clientSignatureVariations)),
        speedTestImage: convertGoogleDriveUrl(jobOrderData?.speedtest_image_url || jobOrderData?.Speedtest_Image_URL)
      };

      setImagePreviews(newImagePreviews);

      const errorsToClear: string[] = [];
      if (newImagePreviews.signedContractImage) errorsToClear.push('signedContractImage');
      if (newImagePreviews.setupImage) errorsToClear.push('setupImage');
      if (newImagePreviews.boxReadingImage) errorsToClear.push('boxReadingImage');
      if (newImagePreviews.routerReadingImage) errorsToClear.push('routerReadingImage');
      if (newImagePreviews.portLabelImage) errorsToClear.push('portLabelImage');
      if (newImagePreviews.clientSignatureImage) errorsToClear.push('clientSignatureImage');
      if (newImagePreviews.speedTestImage) errorsToClear.push('speedTestImage');

      if (errorsToClear.length > 0) {
        setErrors(prev => {
          const newErrors = { ...prev };
          errorsToClear.forEach(key => delete newErrors[key]);
          return newErrors;
        });
      }
    } else {
      setImagePreviews({
        signedContractImage: null,
        setupImage: null,
        boxReadingImage: null,
        routerReadingImage: null,
        portLabelImage: null,
        clientSignatureImage: null,
        speedTestImage: null
      });
    }
  }, [jobOrderData, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setOrderItems([{ itemId: '', quantity: '' }]);
      setTechInputValue('');
      Object.values(imagePreviews).forEach(url => {
        if (url && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    }
  }, [isOpen, imagePreviews]);

  // Load existing job order items from database
  useEffect(() => {
    const fetchJobOrderItems = async () => {
      if (isOpen && jobOrderData) {
        const jobOrderId = jobOrderData.id || jobOrderData.JobOrder_ID;
        if (jobOrderId) {
          try {
            const response = await apiClient.get(`/job-order-items?job_order_id=${jobOrderId}`);
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

    fetchJobOrderItems();
  }, [isOpen, jobOrderData]);

  useEffect(() => {
    const fetchLcpnaps = async () => {
      if (isOpen) {
        try {
          const response = await getAllLCPNAPs('', 1, 1000);

          if (response.success && Array.isArray(response.data)) {
            setLcpnaps(response.data);
          } else {
            setLcpnaps([]);
          }
        } catch (error) {
          setLcpnaps([]);
        }
      }
    };

    fetchLcpnaps();
  }, [isOpen]);

  useEffect(() => {
    const fetchPorts = async () => {
      if (isOpen && formData.lcpnap) {
        try {
          const jobOrderId = jobOrderData?.id || jobOrderData?.JobOrder_ID;
          const response = await getAllPorts(formData.lcpnap, 1, 100, true, jobOrderId);

          if (response.success && Array.isArray(response.data)) {
            setPorts(response.data);
          } else {
            setPorts([]);
          }
        } catch (error) {
          setPorts([]);
        }
      } else if (isOpen && !formData.lcpnap) {
        setPorts([]);
      }
    };
    fetchPorts();
  }, [isOpen, jobOrderData, formData.lcpnap]);

  useEffect(() => {
    const fetchVlans = async () => {
      if (isOpen) {
        try {
          const response = await getAllVLANs();
          if (response.success && Array.isArray(response.data)) {
            setVlans(response.data);
          } else {
            setVlans([]);
          }
        } catch (error) {
          setVlans([]);
        }
      }
    };
    fetchVlans();
  }, [isOpen]);



  useEffect(() => {
    const fetchUsageTypes = async () => {
      if (isOpen) {
        try {
          const response = await getAllUsageTypes();

          if (response.success && Array.isArray(response.data)) {
            setUsageTypes(response.data);
          } else {
            setUsageTypes([]);
          }
        } catch (error) {
          setUsageTypes([]);
        }
      }
    };

    fetchUsageTypes();
  }, [isOpen]);

  useEffect(() => {
    const fetchInventoryItems = async () => {
      if (isOpen) {
        try {
          const response = await getAllInventoryItems();

          if (response.success && Array.isArray(response.data)) {
            // Filter only items with category_id = 1
            const filteredItems = response.data.filter(item =>
              item.category_id === 1 || String(item.category_id) === '1'
            );
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
        }
      }
    };

    fetchTechnicians();
  }, [isOpen]);

  useEffect(() => {
    const fetchPlans = async () => {
      if (isOpen) {
        try {
          const fetchedPlans = await planService.getAllPlans();
          setPlans(fetchedPlans);
        } catch (error) {
        }
      }
    };

    fetchPlans();
  }, [isOpen]);

  useEffect(() => {
    const fetchRouterModels = async () => {
      if (isOpen) {
        try {
          const fetchedRouterModels = await routerModelService.getAllRouterModels();
          setRouterModels(fetchedRouterModels);
        } catch (error) {
        }
      }
    };

    fetchRouterModels();
  }, [isOpen]);

  useEffect(() => {
    if (jobOrderData && isOpen) {

      const loadedOnsiteStatus = jobOrderData.Onsite_Status || jobOrderData.onsite_status || 'In Progress';

      const isEmptyValue = (value: any): boolean => {
        if (value === null || value === undefined || value === '') return true;
        if (typeof value === 'string') {
          const trimmed = value.trim().toLowerCase();
          return trimmed === 'null';
        }
        return false;
      };

      const getValue = (value: any, fieldName: string): string => {
        const result = isEmptyValue(value) ? '' : value;
        return result;
      };

      const formatDateForInput = (dateValue: any): string => {
        if (!dateValue || isEmptyValue(dateValue)) return '';

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

      const fetchApplicationData = async () => {
        try {
          const applicationId = jobOrderData.application_id || jobOrderData.Application_ID;
          if (applicationId) {
            const appResponse = await apiClient.get<{ success: boolean; application: any }>(`/applications/${applicationId}`);
            if (appResponse.data.success && appResponse.data.application) {
              const appData = appResponse.data.application;

              const newFormData = {
                dateInstalled: formatDateForInput(jobOrderData.Date_Installed || jobOrderData.date_installed),
                usageType: getValue(jobOrderData.Usage_Type || jobOrderData.usage_type, 'usageType'),
                choosePlan: getValue(jobOrderData.Desired_Plan || jobOrderData.desired_plan || jobOrderData.Choose_Plan || jobOrderData.choose_plan || jobOrderData.plan, 'choosePlan'),
                connectionType: getValue(jobOrderData.Connection_Type || jobOrderData.connection_type, 'connectionType'),
                routerModel: getValue(jobOrderData.Router_Model || jobOrderData.router_model, 'routerModel'),
                modemSN: getValue(jobOrderData.Modem_SN || jobOrderData.modem_sn, 'modemSN'),

                lcpnap: getValue(jobOrderData.LCPNAP || jobOrderData.lcpnap, 'lcpnap'),
                port: getValue(jobOrderData.PORT || jobOrderData.port, 'port'),
                vlan: getValue(jobOrderData.VLAN || jobOrderData.vlan, 'vlan'),
                region: getValue(appData.region || jobOrderData.Region || jobOrderData.region, 'region'),
                city: getValue(appData.city || jobOrderData.City || jobOrderData.city, 'city'),
                barangay: getValue(appData.barangay || jobOrderData.Barangay || jobOrderData.barangay, 'barangay'),
                location: getValue(appData.location || jobOrderData.Location || jobOrderData.location, 'location'),
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
          usageType: getValue(jobOrderData.Usage_Type || jobOrderData.usage_type, 'usageType'),
          choosePlan: getValue(jobOrderData.Desired_Plan || jobOrderData.desired_plan || jobOrderData.Choose_Plan || jobOrderData.choose_plan || jobOrderData.plan, 'choosePlan'),
          connectionType: getValue(jobOrderData.Connection_Type || jobOrderData.connection_type, 'connectionType'),
          routerModel: getValue(jobOrderData.Router_Model || jobOrderData.router_model, 'routerModel'),
          modemSN: getValue(jobOrderData.Modem_SN || jobOrderData.modem_sn, 'modemSN'),

          lcpnap: getValue(jobOrderData.LCPNAP || jobOrderData.lcpnap, 'lcpnap'),
          port: getValue(jobOrderData.PORT || jobOrderData.port, 'port'),
          vlan: getValue(jobOrderData.VLAN || jobOrderData.vlan, 'vlan'),
          region: getValue(jobOrderData.Region || jobOrderData.region, 'region'),
          city: getValue(jobOrderData.City || jobOrderData.city, 'city'),
          barangay: getValue(jobOrderData.Barangay || jobOrderData.barangay, 'barangay'),
          location: getValue(jobOrderData.Location || jobOrderData.location, 'location'),
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

  const handleInputChange = (field: keyof JobOrderDoneFormData, value: string | File | null) => {
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

  const handleImageUpload = (field: 'signedContractImage' | 'setupImage' | 'boxReadingImage' | 'routerReadingImage' | 'portLabelImage' | 'clientSignatureImage' | 'speedTestImage', file: any) => {
    try {
      // In React Native/Expo, the file object from ImagePicker is { uri, name, type }
      // We don't need to create object URLs or resize with web APIs.

      console.log(`[UPLOAD] Received file for ${field}:`, file);

      setFormData(prev => ({ ...prev, [field]: file }));

      // Use the URI directly for preview
      setImagePreviews(prev => ({ ...prev, [field]: file.uri }));

      if (errors[field]) {
        setErrors(prev => ({ ...prev, [field]: '' }));
      }
    } catch (error) {
      console.error(`[UPLOAD ERROR] ${field}:`, error);
      // Fallback
      setFormData(prev => ({ ...prev, [field]: file }));
      setImagePreviews(prev => ({ ...prev, [field]: file.uri }));
    }
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
    if (!formData.location.trim()) newErrors.location = 'Location is required';

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

      const validItems = orderItems.filter(item => item.itemId && item.quantity);
      if (validItems.length === 0) {
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
            location: updatedFormData.location,
            desired_plan: updatedFormData.choosePlan,
            referred_by: referredBy,
            promo: promo
          };

          const applicationResponse = await updateApplication(applicationId.toString(), applicationUpdateData);

          saveMessages.push({
            type: 'success',
            text: `Application updated: Plan: ${updatedFormData.choosePlan}, Location: ${updatedFormData.region}, ${updatedFormData.city}, ${updatedFormData.barangay}, ${updatedFormData.location}`
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

  if (!isOpen) return null;

  const fullName = `${jobOrderData?.First_Name || jobOrderData?.first_name || ''} ${jobOrderData?.Middle_Initial || jobOrderData?.middle_initial || ''} ${jobOrderData?.Last_Name || jobOrderData?.last_name || ''}`.trim();



  return (
    <Modal
      visible={isOpen}
      transparent={true}
      animationType="slide"
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <Modal
          visible={showLoadingModal}
          transparent={true}
          animationType="fade"
        >
          <View className="flex-1 bg-black/70 items-center justify-center">
            <View className={`rounded-xl p-8 items-center space-y-6 min-w-[320px] ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <Loader2
                size={80}
                color={colorPalette?.primary || '#ea580c'}
                className="animate-spin"
              />
              <View>
                <Text className={`text-4xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{loadingPercentage}%</Text>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showModal}
          transparent={true}
          animationType="fade"
        >
          <View className="flex-1 bg-black/75 items-center justify-center p-4">
            <View className={`rounded-xl shadow-xl max-w-2xl w-full max-h-[80%] overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <View className={`px-6 py-4 border-b flex-row items-center justify-between ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <Text className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{modalContent.title}</Text>
                <Pressable
                  onPress={() => setShowModal(false)}
                  className="p-1"
                >
                  <X size={20} color={isDarkMode ? '#9CA3AF' : '#4B5563'} />
                </Pressable>
              </View>
              <ScrollView className="px-6 py-4">
                <View className="space-y-3">
                  {modalContent.messages.map((message, index) => (
                    <View
                      key={index}
                      className={`flex-row items-start gap-3 p-3 rounded-lg border ${message.type === 'success'
                        ? (isDarkMode ? 'bg-green-900/30 border-green-700' : 'bg-green-100 border-green-300')
                        : message.type === 'warning'
                          ? (isDarkMode ? 'bg-yellow-900/30 border-yellow-700' : 'bg-yellow-100 border-yellow-300')
                          : (isDarkMode ? 'bg-red-900/30 border-red-700' : 'bg-red-100 border-red-300')
                        }`}
                    >
                      {message.type === 'success' && (
                        <CheckCircle className="text-green-500 mt-0.5" size={20} />
                      )}
                      {message.type === 'warning' && (
                        <AlertCircle className="text-yellow-500 mt-0.5" size={20} />
                      )}
                      {message.type === 'error' && (
                        <XCircle className="text-red-500 mt-0.5" size={20} />
                      )}
                      <Text
                        className={`text-sm flex-1 ${message.type === 'success'
                          ? (isDarkMode ? 'text-green-200' : 'text-green-800')
                          : message.type === 'warning'
                            ? (isDarkMode ? 'text-yellow-200' : 'text-yellow-800')
                            : (isDarkMode ? 'text-red-200' : 'text-red-800')
                          }`}
                      >
                        {message.text}
                      </Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
              <View className={`px-6 py-4 border-t flex-row justify-end ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <Pressable
                  onPress={() => setShowModal(false)}
                  className="px-6 py-2 rounded-lg"
                  style={{
                    backgroundColor: colorPalette?.primary || '#ea580c'
                  }}
                >
                  <Text className="text-white font-medium text-center">Close</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        <View className={`h-[90%] w-full shadow-2xl rounded-t-3xl overflow-hidden flex-col ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
          }`}>
          <View className={`px-6 py-4 flex-row items-center justify-between border-b ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'
            }`}>
            <View className="flex-row items-center space-x-3">
              <Text className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>{fullName}</Text>
            </View>
            <View className="flex-row items-center space-x-3 gap-2">
              <Pressable
                onPress={onClose}
                className="px-4 py-2 border rounded-lg"
                style={{
                  borderColor: colorPalette?.primary || '#ea580c',
                }}
              >
                <Text style={{ color: colorPalette?.primary || '#ea580c' }} className="text-sm font-medium">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSave}
                disabled={loading}
                className="px-6 py-2 rounded-lg"
                style={{
                  backgroundColor: loading ? (isDarkMode ? '#4b5563' : '#9ca3af') : (colorPalette?.primary || '#ea580c')
                }}
              >
                <Text className="text-white text-sm font-medium">{loading ? 'Saving...' : 'Save'}</Text>
              </Pressable>
            </View>
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
          >
            <ScrollView className="flex-1 p-6" contentContainerStyle={{ paddingBottom: 40 }}>
              <View className="space-y-4">
                <View className="mb-4">
                  <Text className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>Choose Plan<Text className="text-red-500">*</Text></Text>
                  <View className="relative">
                    <View className={`border rounded-lg overflow-hidden ${errors.choosePlan ? 'border-red-500' : (isDarkMode ? 'border-gray-700' : 'border-gray-300')} ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                      <Picker
                        selectedValue={formData.choosePlan}
                        onValueChange={(value) => handleInputChange('choosePlan', value)}
                        style={{ color: isDarkMode ? '#fff' : '#000' }}
                        dropdownIconColor={isDarkMode ? '#fff' : '#000'}
                      >
                        <Picker.Item key="default" label="Select Plan" value="" />
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
                    <View className="flex-row items-center mt-1">
                      <View
                        className="flex items-center justify-center w-4 h-4 rounded-full mr-2"
                        style={{ backgroundColor: colorPalette?.primary || '#ea580c' }}
                      >
                        <Text className="text-white text-[10px] font-bold">!</Text>
                      </View>
                      <Text className="text-xs" style={{ color: colorPalette?.primary || '#ea580c' }}>{errors.choosePlan}</Text>
                    </View>
                  )}
                </View>




                <View className="mb-4">
                  <Text className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>Onsite Status<Text className="text-red-500">*</Text></Text>
                  <View className="relative">
                    <View className={`border rounded-lg overflow-hidden ${errors.onsiteStatus ? 'border-red-500' : (isDarkMode ? 'border-gray-700' : 'border-gray-300')} ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
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
                    <View className="flex-row items-center mt-1">
                      <View
                        className="flex items-center justify-center w-4 h-4 rounded-full mr-2"
                        style={{ backgroundColor: colorPalette?.primary || '#ea580c' }}
                      >
                        <Text className="text-white text-[10px] font-bold">!</Text>
                      </View>
                      <Text className="text-xs" style={{ color: colorPalette?.primary || '#ea580c' }}>{errors.onsiteStatus}</Text>
                    </View>
                  )}
                </View>



                <View className="mb-4">
                  <Text className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>Region</Text>
                  <TextInput
                    value={formData.region}
                    editable={false}
                    placeholderTextColor={isDarkMode ? '#9CA3AF' : '#4B5563'}
                    className={`w-full px-3 py-2 border rounded-lg opacity-75 ${isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-gray-300'
                      : 'bg-gray-100 border-gray-300 text-gray-600'
                      }`}
                  />
                </View>

                <View className="mb-4">
                  <Text className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>City</Text>
                  <TextInput
                    value={formData.city}
                    editable={false}
                    placeholderTextColor={isDarkMode ? '#9CA3AF' : '#4B5563'}
                    className={`w-full px-3 py-2 border rounded-lg opacity-75 ${isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-gray-300'
                      : 'bg-gray-100 border-gray-300 text-gray-600'
                      }`}
                  />
                </View>

                <View className="mb-4">
                  <Text className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>Barangay</Text>
                  <TextInput
                    value={formData.barangay}
                    editable={false}
                    placeholderTextColor={isDarkMode ? '#9CA3AF' : '#4B5563'}
                    className={`w-full px-3 py-2 border rounded-lg opacity-75 ${isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-gray-300'
                      : 'bg-gray-100 border-gray-300 text-gray-600'
                      }`}
                  />
                </View>

                <View className="mb-4">
                  <Text className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>Location</Text>
                  <TextInput
                    value={formData.location}
                    editable={false}
                    placeholderTextColor={isDarkMode ? '#9CA3AF' : '#4B5563'}
                    className={`w-full px-3 py-2 border rounded-lg opacity-75 ${isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-gray-300'
                      : 'bg-gray-100 border-gray-300 text-gray-600'
                      }`}
                  />
                </View>

                {formData.onsiteStatus === 'Done' && (
                  <>
                    <View className="mb-4">
                      <Text className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>Date Installed<Text className="text-red-500">*</Text></Text>
                      <View className="relative">
                        <Pressable
                          onPress={() => setShowDatePicker(true)}
                          className={`w-full px-3 py-3 border rounded-lg ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'} ${errors.dateInstalled ? 'border-red-500' : ''}`}
                        >
                          <Text className={`${formData.dateInstalled ? (isDarkMode ? 'text-white' : 'text-gray-900') : (isDarkMode ? 'text-gray-500' : 'text-gray-400')}`}>
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
                        <View className="flex-row items-center mt-1">
                          <View
                            className="flex items-center justify-center w-4 h-4 rounded-full mr-2"
                            style={{ backgroundColor: colorPalette?.primary || '#ea580c' }}
                          >
                            <Text className="text-white text-[10px] font-bold">!</Text>
                          </View>
                          <Text className="text-xs" style={{ color: colorPalette?.primary || '#ea580c' }}>This entry is required</Text>
                        </View>
                      )}
                    </View>

                    <View className="mb-4">
                      <Text className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>Usage Type<Text className="text-red-500">*</Text></Text>
                      <View className="relative">
                        <View className={`border rounded-lg overflow-hidden ${errors.usageType ? 'border-red-500' : (isDarkMode ? 'border-gray-700' : 'border-gray-300')} ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                          <Picker
                            selectedValue={formData.usageType}
                            onValueChange={(value) => handleInputChange('usageType', value)}
                            style={{ color: isDarkMode ? '#fff' : '#000' }}
                            dropdownIconColor={isDarkMode ? '#fff' : '#000'}
                          >
                            <Picker.Item key="default" label="Select Usage Type" value="" />
                            {formData.usageType && !usageTypes.some(ut => ut.usage_name === formData.usageType) && (
                              <Picker.Item key="custom" label={formData.usageType} value={formData.usageType} />
                            )}
                            {usageTypes.map((usageType) => (
                              <Picker.Item key={usageType.id || usageType.usage_name} label={usageType.usage_name} value={usageType.usage_name} />
                            ))}
                          </Picker>
                        </View>
                      </View>
                      {errors.usageType && (
                        <View className="flex-row items-center mt-1">
                          <View
                            className="flex items-center justify-center w-4 h-4 rounded-full mr-2"
                            style={{ backgroundColor: colorPalette?.primary || '#ea580c' }}
                          >
                            <Text className="text-white text-[10px] font-bold">!</Text>
                          </View>
                          <Text className="text-xs" style={{ color: colorPalette?.primary || '#ea580c' }}>This entry is required</Text>
                        </View>
                      )}
                    </View>

                    <View className="mb-4">
                      <Text className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>Connection Type<Text className="text-red-500">*</Text></Text>
                      <View className="flex-row gap-2">
                        <Pressable
                          onPress={() => handleInputChange('connectionType', 'Antenna')}
                          className={`flex-1 py-3 px-4 rounded-lg border items-center justify-center ${formData.connectionType === 'Antenna'
                            ? 'text-white'
                            : (isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-300')
                            }`}
                          style={formData.connectionType === 'Antenna' ? {
                            backgroundColor: colorPalette?.primary || '#ea580c',
                            borderColor: colorPalette?.accent || '#dc2626'
                          } : {}}
                        >
                          <Text className={`font-medium ${formData.connectionType === 'Antenna' ? 'text-white' : (isDarkMode ? 'text-gray-300' : 'text-gray-700')}`}>Antenna</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => handleInputChange('connectionType', 'Fiber')}
                          className={`flex-1 py-3 px-4 rounded-lg border items-center justify-center ${formData.connectionType === 'Fiber'
                            ? 'text-white'
                            : (isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-300')
                            }`}
                          style={formData.connectionType === 'Fiber' ? {
                            backgroundColor: colorPalette?.primary || '#ea580c',
                            borderColor: colorPalette?.accent || '#dc2626'
                          } : {}}
                        >
                          <Text className={`font-medium ${formData.connectionType === 'Fiber' ? 'text-white' : (isDarkMode ? 'text-gray-300' : 'text-gray-700')}`}>Fiber</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => handleInputChange('connectionType', 'Local')}
                          className={`flex-1 py-3 px-4 rounded-lg border items-center justify-center ${formData.connectionType === 'Local'
                            ? 'text-white'
                            : (isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-300')
                            }`}
                          style={formData.connectionType === 'Local' ? {
                            backgroundColor: colorPalette?.primary || '#ea580c',
                            borderColor: colorPalette?.accent || '#dc2626'
                          } : {}}
                        >
                          <Text className={`font-medium ${formData.connectionType === 'Local' ? 'text-white' : (isDarkMode ? 'text-gray-300' : 'text-gray-700')}`}>Local</Text>
                        </Pressable>
                      </View>
                      {errors.connectionType && (
                        <View className="flex-row items-center mt-1">
                          <View
                            className="flex items-center justify-center w-4 h-4 rounded-full mr-2"
                            style={{ backgroundColor: colorPalette?.primary || '#ea580c' }}
                          >
                            <Text className="text-white text-[10px] font-bold">!</Text>
                          </View>
                          <Text className="text-xs" style={{ color: colorPalette?.primary || '#ea580c' }}>This entry is required</Text>
                        </View>
                      )}
                    </View>

                    <View className="mb-4">
                      <Text className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>Router Model<Text className="text-red-500">*</Text></Text>
                      <View className="relative">
                        <View className={`border rounded-lg overflow-hidden ${errors.routerModel ? 'border-red-500' : (isDarkMode ? 'border-gray-700' : 'border-gray-300')} ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                          <Picker
                            selectedValue={formData.routerModel}
                            onValueChange={(value) => handleInputChange('routerModel', value)}
                            style={{ color: isDarkMode ? '#fff' : '#000' }}
                            dropdownIconColor={isDarkMode ? '#fff' : '#000'}
                          >
                            <Picker.Item key="default" label="Select Router Model" value="" />
                            {formData.routerModel && !routerModels.some(rm => rm.model === formData.routerModel) && (
                              <Picker.Item key="custom" label={formData.routerModel} value={formData.routerModel} />
                            )}
                            {routerModels.map((routerModel, index) => (
                              <Picker.Item key={routerModel.model || index} label={routerModel.model} value={routerModel.model} />
                            ))}
                          </Picker>
                        </View>
                      </View>
                      {errors.routerModel && (
                        <View className="flex-row items-center mt-1">
                          <View
                            className="flex items-center justify-center w-4 h-4 rounded-full mr-2"
                            style={{ backgroundColor: colorPalette?.primary || '#ea580c' }}
                          >
                            <Text className="text-white text-[10px] font-bold">!</Text>
                          </View>
                          <Text className="text-xs" style={{ color: colorPalette?.primary || '#ea580c' }}>This entry is required</Text>
                        </View>
                      )}
                    </View>

                    <View className="mb-4">
                      <Text className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>Modem SN<Text className="text-red-500">*</Text></Text>
                      <TextInput
                        value={formData.modemSN}
                        onChangeText={(text) => handleInputChange('modemSN', text)}
                        placeholderTextColor={isDarkMode ? '#9CA3AF' : '#4B5563'}
                        className={`w-full px-3 py-2 border rounded-lg ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                          } ${errors.modemSN ? 'border-red-500' : (isDarkMode ? 'border-gray-700' : 'border-gray-300')}`}
                      />
                      {errors.modemSN && (
                        <View className="flex-row items-center mt-1">
                          <View
                            className="flex items-center justify-center w-4 h-4 rounded-full mr-2"
                            style={{ backgroundColor: colorPalette?.primary || '#ea580c' }}
                          >
                            <Text className="text-white text-[10px] font-bold">!</Text>
                          </View>
                          <Text className="text-xs" style={{ color: colorPalette?.primary || '#ea580c' }}>This entry is required</Text>
                        </View>
                      )}
                    </View>

                    {usernamePattern && usernamePattern.sequence.some(item => item.type === 'tech_input') && (
                      <View className="mb-4">
                        <Text className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>PPPoE Username<Text className="text-red-500">*</Text></Text>
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
                          className={`w-full px-3 py-2 border rounded-lg ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                            } ${errors.techInput ? 'border-red-500' : (isDarkMode ? 'border-gray-700' : 'border-gray-300')}`}
                        />
                        {errors.techInput && (
                          <View className="flex-row items-center mt-1">
                            <View
                              className="flex items-center justify-center w-4 h-4 rounded-full mr-2"
                              style={{ backgroundColor: colorPalette?.primary || '#ea580c' }}
                            >
                              <Text className="text-white text-[10px] font-bold">!</Text>
                            </View>
                            <Text className="text-xs" style={{ color: colorPalette?.primary || '#ea580c' }}>{errors.techInput}</Text>
                          </View>
                        )}
                        {!techInputValue.trim() && !errors.techInput && (
                          <Text className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>This will be used as the PPPoE username</Text>
                        )}
                      </View>
                    )}

                    {formData.connectionType === 'Antenna' && (
                      <View className="mb-4">
                        <Text className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>IP<Text className="text-red-500">*</Text></Text>
                        <TextInput
                          value={formData.ip}
                          onChangeText={(text) => handleInputChange('ip', text)}
                          placeholderTextColor={isDarkMode ? '#9CA3AF' : '#4B5563'}
                          className={`w-full px-3 py-2 border rounded-lg ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                            } ${errors.ip ? 'border-red-500' : (isDarkMode ? 'border-gray-700' : 'border-gray-300')}`}
                        />
                        {errors.ip && (
                          <View className="flex-row items-center mt-1">
                            <View
                              className="flex items-center justify-center w-4 h-4 rounded-full mr-2"
                              style={{ backgroundColor: colorPalette?.primary || '#ea580c' }}
                            >
                              <Text className="text-white text-[10px] font-bold">!</Text>
                            </View>
                            <Text className="text-xs" style={{ color: colorPalette?.primary || '#ea580c' }}>This entry is required</Text>
                          </View>
                        )}
                      </View>
                    )}

                    {formData.connectionType === 'Fiber' && (
                      <View className="mb-4">
                        <View className="mb-4">
                          <Text className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            LCP-NAP<Text className="text-red-500">*</Text>
                          </Text>
                          <View className="relative">
                            {/* Display Field (The "Closed" state) */}
                            <Pressable
                              onPress={() => setIsLcpnapOpen(!isLcpnapOpen)}
                              className={`flex-row items-center justify-between px-3 py-3 border rounded-lg ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
                                } ${errors.lcpnap ? 'border-red-500' : ''}`}
                            >
                              <Text className={`text-sm ${!formData.lcpnap ? (isDarkMode ? 'text-gray-500' : 'text-gray-400') : (isDarkMode ? 'text-white' : 'text-gray-900')}`}>
                                {formData.lcpnap || 'Select LCP-NAP'}
                              </Text>
                              <ChevronDown
                                size={18}
                                color={isDarkMode ? '#9CA3AF' : '#4B5563'}
                                style={{ transform: [{ rotate: isLcpnapOpen ? '180deg' : '0deg' }] }}
                              />
                            </Pressable>

                            {/* Dropdown Menu */}
                            {isLcpnapOpen && (
                              <View
                                className={`absolute left-0 right-0 top-full mt-1 z-50 rounded-lg shadow-2xl border overflow-hidden flex-col ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                                  }`}
                                style={{ elevation: 5 }}
                              >
                                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                                  {/* Search Box at Top of Dropdown */}
                                  <View className={`p-2 border-b ${isDarkMode ? 'border-gray-700 bg-gray-900/50' : 'border-gray-100 bg-gray-50'}`}>
                                    <View className={`flex-row items-center px-2 py-1.5 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
                                      }`}>
                                      <Search size={14} color="#9CA3AF" className="mr-2" />
                                      <TextInput
                                        autoFocus
                                        placeholder="Search LCP-NAP..."
                                        value={lcpnapSearch}
                                        onChangeText={setLcpnapSearch}
                                        placeholderTextColor={isDarkMode ? '#9CA3AF' : '#4B5563'}
                                        className={`flex-1 p-1 text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'
                                          }`}
                                      />
                                    </View>
                                  </View>

                                  {/* Options List */}
                                  <ScrollView className="max-h-60" nestedScrollEnabled={true} keyboardShouldPersistTaps="handled">
                                    {lcpnaps
                                      .filter(ln => ln.lcpnap_name.toLowerCase().includes(lcpnapSearch.toLowerCase()))
                                      .map((lcpnap) => (
                                        <Pressable
                                          key={lcpnap.id}
                                          className={`px-4 py-3 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'
                                            } ${formData.lcpnap === lcpnap.lcpnap_name ? (isDarkMode ? 'bg-orange-600/20' : 'bg-orange-50') : ''}`}
                                          onPress={() => {
                                            handleInputChange('lcpnap', lcpnap.lcpnap_name);
                                            setLcpnapSearch('');
                                            setIsLcpnapOpen(false);
                                          }}
                                        >
                                          <View className="flex-row items-center justify-between">
                                            <Text className={`text-sm ${formData.lcpnap === lcpnap.lcpnap_name ? 'text-orange-500 font-medium' : (isDarkMode ? 'text-gray-200' : 'text-gray-700')}`}>
                                              {lcpnap.lcpnap_name}
                                            </Text>
                                            {formData.lcpnap === lcpnap.lcpnap_name && (
                                              <View className="w-2 h-2 rounded-full bg-orange-500" />
                                            )}
                                          </View>
                                        </Pressable>
                                      ))}
                                    {lcpnaps.filter(ln => ln.lcpnap_name.toLowerCase().includes(lcpnapSearch.toLowerCase())).length === 0 && (
                                      <View className="px-4 py-8 items-center">
                                        <Text className={`text-sm italic ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                          No results found for "{lcpnapSearch}"
                                        </Text>
                                      </View>
                                    )}
                                  </ScrollView>
                                </KeyboardAvoidingView>
                              </View>
                            )}
                          </View>
                          {errors.lcpnap && (
                            <View className="flex-row items-center mt-1">
                              <View
                                className="flex items-center justify-center w-4 h-4 rounded-full mr-2"
                                style={{ backgroundColor: colorPalette?.primary || '#ea580c' }}
                              >
                                <Text className="text-white text-[10px] font-bold">!</Text>
                              </View>
                              <Text className="text-xs" style={{ color: colorPalette?.primary || '#ea580c' }}>This entry is required</Text>
                            </View>
                          )}
                        </View>

                        <View className="mb-4">
                          <Text className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                            }`}>PORT<Text className="text-red-500">*</Text></Text>
                          <View className="relative">
                            <View className={`border rounded-lg overflow-hidden ${errors.port ? 'border-red-500' : (isDarkMode ? 'border-gray-700' : 'border-gray-300')} ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                              <Picker
                                selectedValue={formData.port}
                                onValueChange={(value) => handleInputChange('port', value)}
                                style={{ color: isDarkMode ? '#fff' : '#000' }}
                                dropdownIconColor={isDarkMode ? '#fff' : '#000'}
                              >
                                <Picker.Item label="Select PORT" value="" />
                                <Picker.Item label="PORT 001" value="PORT 001" />
                                <Picker.Item label="PORT 002" value="PORT 002" />
                                <Picker.Item label="PORT 003" value="PORT 003" />
                                <Picker.Item label="PORT 004" value="PORT 004" />
                                <Picker.Item label="PORT 005" value="PORT 005" />
                                <Picker.Item label="PORT 006" value="PORT 006" />
                                <Picker.Item label="PORT 007" value="PORT 007" />
                                <Picker.Item label="PORT 008" value="PORT 008" />
                                <Picker.Item label="PORT 009" value="PORT 009" />
                                <Picker.Item label="PORT 010" value="PORT 010" />
                                <Picker.Item label="PORT 011" value="PORT 011" />
                                <Picker.Item label="PORT 012" value="PORT 012" />
                                <Picker.Item label="PORT 013" value="PORT 013" />
                                <Picker.Item label="PORT 014" value="PORT 014" />
                                <Picker.Item label="PORT 015" value="PORT 015" />
                                <Picker.Item label="PORT 016" value="PORT 016" />
                                <Picker.Item label="PORT 017" value="PORT 017" />
                                <Picker.Item label="PORT 018" value="PORT 018" />
                                <Picker.Item label="PORT 019" value="PORT 019" />
                                <Picker.Item label="PORT 020" value="PORT 020" />
                                <Picker.Item label="PORT 021" value="PORT 021" />
                                <Picker.Item label="PORT 022" value="PORT 022" />
                                <Picker.Item label="PORT 023" value="PORT 023" />
                                <Picker.Item label="PORT 024" value="PORT 024" />
                                <Picker.Item label="PORT 025" value="PORT 025" />
                                <Picker.Item label="PORT 026" value="PORT 026" />
                                <Picker.Item label="PORT 027" value="PORT 027" />
                                <Picker.Item label="PORT 028" value="PORT 028" />
                                <Picker.Item label="PORT 029" value="PORT 029" />
                                <Picker.Item label="PORT 030" value="PORT 030" />
                                <Picker.Item label="PORT 031" value="PORT 031" />
                                <Picker.Item label="PORT 032" value="PORT 032" />
                              </Picker>
                            </View>
                          </View>
                          {errors.port && (
                            <View className="flex-row items-center mt-1">
                              <View
                                className="flex items-center justify-center w-4 h-4 rounded-full mr-2"
                                style={{ backgroundColor: colorPalette?.primary || '#ea580c' }}
                              >
                                <Text className="text-white text-[10px] font-bold">!</Text>
                              </View>
                              <Text className="text-xs" style={{ color: colorPalette?.primary || '#ea580c' }}>This entry is required</Text>
                            </View>
                          )}
                        </View>

                        <View className="mb-4">
                          <Text className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                            }`}>VLAN<Text className="text-red-500">*</Text></Text>
                          <View className="relative">
                            <View className={`border rounded-lg overflow-hidden ${errors.vlan ? 'border-red-500' : (isDarkMode ? 'border-gray-700' : 'border-gray-300')} ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                              <Picker
                                selectedValue={formData.vlan}
                                onValueChange={(value) => handleInputChange('vlan', value)}
                                style={{ color: isDarkMode ? '#fff' : '#000' }}
                                dropdownIconColor={isDarkMode ? '#fff' : '#000'}
                              >
                                <Picker.Item key="default" label="Select VLAN" value="" />
                                {formData.vlan && !vlans.some(v => v.value.toString() === formData.vlan) && (
                                  <Picker.Item key="custom" label={formData.vlan} value={formData.vlan} />
                                )}
                                {vlans.map((vlan) => (
                                  <Picker.Item key={vlan.vlan_id} label={vlan.value.toString()} value={vlan.value.toString()} />
                                ))}
                              </Picker>
                            </View>
                          </View>
                          {errors.vlan && (
                            <View className="flex-row items-center mt-1">
                              <View
                                className="flex items-center justify-center w-4 h-4 rounded-full mr-2"
                                style={{ backgroundColor: colorPalette?.primary || '#ea580c' }}
                              >
                                <Text className="text-white text-[10px] font-bold">!</Text>
                              </View>
                              <Text className="text-xs" style={{ color: colorPalette?.primary || '#ea580c' }}>This entry is required</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    )}

                    <View className="mb-4">
                      <Text className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>Visit By<Text className="text-red-500">*</Text></Text>
                      <View className="relative">
                        <View className={`border rounded-lg overflow-hidden ${errors.visit_by ? 'border-red-500' : (isDarkMode ? 'border-gray-700' : 'border-gray-300')} ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                          <Picker
                            selectedValue={formData.visit_by}
                            onValueChange={(value) => handleInputChange('visit_by', value)}
                            style={{ color: isDarkMode ? '#fff' : '#000' }}
                            dropdownIconColor={isDarkMode ? '#fff' : '#000'}
                          >
                            <Picker.Item key="default" label="Select Visit By" value="" />
                            {formData.visit_by && !technicians.some(t => t.name === formData.visit_by) && (
                              <Picker.Item key="custom" label={formData.visit_by} value={formData.visit_by} />
                            )}
                            {technicians.filter(t => t.name !== formData.visit_with && t.name !== formData.visit_with_other).map((technician, index) => (
                              <Picker.Item key={technician.email || index} label={technician.name} value={technician.name} />
                            ))}
                          </Picker>
                        </View>
                      </View>
                      {errors.visit_by && (
                        <View className="flex-row items-center mt-1">
                          <View
                            className="flex items-center justify-center w-4 h-4 rounded-full mr-2"
                            style={{ backgroundColor: colorPalette?.primary || '#ea580c' }}
                          >
                            <Text className="text-white text-[10px] font-bold">!</Text>
                          </View>
                          <Text className="text-xs" style={{ color: colorPalette?.primary || '#ea580c' }}>{errors.visit_by}</Text>
                        </View>
                      )}
                    </View>

                    <View className="mb-4">
                      <Text className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>Visit With<Text className="text-red-500">*</Text></Text>
                      <View className="relative">
                        <View className={`border rounded-lg overflow-hidden ${errors.visit_with ? 'border-red-500' : (isDarkMode ? 'border-gray-700' : 'border-gray-300')} ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                          <Picker
                            selectedValue={formData.visit_with}
                            onValueChange={(value) => handleInputChange('visit_with', value)}
                            style={{ color: isDarkMode ? '#fff' : '#000' }}
                            dropdownIconColor={isDarkMode ? '#fff' : '#000'}
                          >
                            <Picker.Item label="Select Visit With" value="" />
                            <Picker.Item label="None" value="None" />
                            {formData.visit_with && formData.visit_with !== 'None' && formData.visit_with !== '' && !technicians.some(t => t.name === formData.visit_with) && (
                              <Picker.Item label={formData.visit_with} value={formData.visit_with} />
                            )}
                            {technicians.filter(t => t.name !== formData.visit_by && t.name !== formData.visit_with_other).map((technician, index) => (
                              <Picker.Item key={index} label={technician.name} value={technician.name} />
                            ))}
                          </Picker>
                        </View>
                      </View>
                      {errors.visit_with && (
                        <View className="flex-row items-center mt-1">
                          <View
                            className="flex items-center justify-center w-4 h-4 rounded-full mr-2"
                            style={{ backgroundColor: colorPalette?.primary || '#ea580c' }}
                          >
                            <Text className="text-white text-[10px] font-bold">!</Text>
                          </View>
                          <Text className="text-xs" style={{ color: colorPalette?.primary || '#ea580c' }}>{errors.visit_with}</Text>
                        </View>
                      )}
                    </View>

                    <View className="mb-4">
                      <Text className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>Visit With(Other)<Text className="text-red-500">*</Text></Text>
                      <View className="relative">
                        <View className={`border rounded-lg overflow-hidden ${errors.visit_with_other ? 'border-red-500' : (isDarkMode ? 'border-gray-700' : 'border-gray-300')} ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                          <Picker
                            selectedValue={formData.visit_with_other}
                            onValueChange={(value) => handleInputChange('visit_with_other', value)}
                            style={{ color: isDarkMode ? '#fff' : '#000' }}
                            dropdownIconColor={isDarkMode ? '#fff' : '#000'}
                          >
                            <Picker.Item label="Visit With(Other)" value="" />
                            <Picker.Item label="None" value="None" />
                            {formData.visit_with_other && formData.visit_with_other !== 'None' && formData.visit_with_other !== '' && !technicians.some(t => t.name === formData.visit_with_other) && (
                              <Picker.Item label={formData.visit_with_other} value={formData.visit_with_other} />
                            )}
                            {technicians.filter(t => t.name !== formData.visit_by && t.name !== formData.visit_with).map((technician, index) => (
                              <Picker.Item key={index} label={technician.name} value={technician.name} />
                            ))}
                          </Picker>
                        </View>
                      </View>
                      {errors.visit_with_other && (
                        <View className="flex-row items-center mt-1">
                          <View
                            className="flex items-center justify-center w-4 h-4 rounded-full mr-2"
                            style={{ backgroundColor: colorPalette?.primary || '#ea580c' }}
                          >
                            <Text className="text-white text-[10px] font-bold">!</Text>
                          </View>
                          <Text className="text-xs" style={{ color: colorPalette?.primary || '#ea580c' }}>{errors.visit_with_other}</Text>
                        </View>
                      )}
                    </View>

                    <View className="mb-4">
                      <Text className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>Onsite Remarks<Text className="text-red-500">*</Text></Text>
                      <TextInput
                        value={formData.onsiteRemarks}
                        onChangeText={(text) => handleInputChange('onsiteRemarks', text)}
                        multiline={true}
                        numberOfLines={4}
                        placeholderTextColor={isDarkMode ? '#9CA3AF' : '#4B5563'}
                        className={`w-full px-3 py-2 border rounded-lg ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                          } ${errors.onsiteRemarks ? 'border-red-500' : (isDarkMode ? 'border-gray-700' : 'border-gray-300')}`}
                        style={{ textAlignVertical: 'top' }}
                      />
                      {errors.onsiteRemarks && (
                        <View className="flex-row items-center mt-1">
                          <View
                            className="flex items-center justify-center w-4 h-4 rounded-full mr-2"
                            style={{ backgroundColor: colorPalette?.primary || '#ea580c' }}
                          >
                            <Text className="text-white text-[10px] font-bold">!</Text>
                          </View>
                          <Text className="text-xs" style={{ color: colorPalette?.primary || '#ea580c' }}>{errors.onsiteRemarks}</Text>
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

                    <ImagePreview
                      imageUrl={imagePreviews.clientSignatureImage}
                      label="Client Signature Image"
                      onUpload={(file) => handleImageUpload('clientSignatureImage', file)}
                      error={errors.clientSignatureImage}
                    />

                    <ImagePreview
                      imageUrl={imagePreviews.speedTestImage}
                      label="Speed Test Image"
                      onUpload={(file) => handleImageUpload('speedTestImage', file)}
                      error={errors.speedTestImage}
                    />

                    <View className="mb-4">
                      <Text className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>Items<Text className="text-red-500">*</Text></Text>
                      {orderItems.map((item, index) => (
                        <View key={index} className="mb-4">
                          <View className="flex-row items-start gap-2">
                            <View className="flex-1">
                              <View className="relative">
                                <Pressable
                                  onPress={() => {
                                    setOpenItemIndex(openItemIndex === index ? null : index);
                                    setItemSearch('');
                                  }}
                                  className={`flex-row items-center justify-between px-3 py-3 border rounded-lg ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
                                    }`}
                                >
                                  <Text className={`text-sm ${!item.itemId ? (isDarkMode ? 'text-gray-500' : 'text-gray-400') : (isDarkMode ? 'text-white' : 'text-gray-900')}`}>
                                    {item.itemId || `Select Item ${index + 1}`}
                                  </Text>
                                  <ChevronDown
                                    size={18}
                                    color={isDarkMode ? '#9CA3AF' : '#4B5563'}
                                    style={{ transform: [{ rotate: openItemIndex === index ? '180deg' : '0deg' }] }}
                                  />
                                </Pressable>

                                {openItemIndex === index && (
                                  <View
                                    className={`absolute left-0 right-0 top-full mt-1 z-50 rounded-lg shadow-2xl border overflow-hidden flex-col ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                                      }`}
                                    style={{ elevation: 10 }}
                                  >
                                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                                      <View className={`p-2 border-b ${isDarkMode ? 'border-gray-700 bg-gray-900/50' : 'border-gray-100 bg-gray-50'}`}>
                                        <View className={`flex-row items-center px-2 py-1.5 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
                                          }`}>
                                          <Search size={14} color="#9CA3AF" className="mr-2" />
                                          <TextInput
                                            autoFocus
                                            placeholder="Search item..."
                                            value={itemSearch}
                                            onChangeText={setItemSearch}
                                            placeholderTextColor={isDarkMode ? '#9CA3AF' : '#4B5563'}
                                            className={`flex-1 p-1 text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'
                                              }`}
                                          />
                                        </View>
                                      </View>

                                      <ScrollView className="max-h-60" nestedScrollEnabled={true} keyboardShouldPersistTaps="handled">
                                        <Pressable
                                          key="default-item"
                                          className={`px-4 py-3 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'
                                            }`}
                                          onPress={() => {
                                            handleItemChange(index, 'itemId', '');
                                            setOpenItemIndex(null);
                                            setItemSearch('');
                                          }}
                                        >
                                          <Text className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-400'}`}>
                                            Select Item {index + 1}
                                          </Text>
                                        </Pressable>
                                        {inventoryItems
                                          .filter(invItem => invItem.item_name.toLowerCase().includes(itemSearch.toLowerCase()))
                                          .map((invItem) => (
                                            <Pressable
                                              key={invItem.id}
                                              className={`px-4 py-3 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'
                                                } ${item.itemId === invItem.item_name ? (isDarkMode ? 'bg-orange-600/20' : 'bg-orange-50') : ''}`}
                                              onPress={() => {
                                                handleItemChange(index, 'itemId', invItem.item_name);
                                                setOpenItemIndex(null);
                                                setItemSearch('');
                                              }}
                                            >
                                              <View className="flex-row items-center justify-between">
                                                <Text className={`text-sm ${item.itemId === invItem.item_name ? 'text-orange-500 font-medium' : (isDarkMode ? 'text-gray-200' : 'text-gray-700')}`}>
                                                  {invItem.item_name}
                                                </Text>
                                                {item.itemId === invItem.item_name && (
                                                  <View className="w-2 h-2 rounded-full bg-orange-500" />
                                                )}
                                              </View>
                                            </Pressable>
                                          ))}
                                        {inventoryItems.filter(invItem => invItem.item_name.toLowerCase().includes(itemSearch.toLowerCase())).length === 0 && (
                                          <View key="no-results" className="px-4 py-8 items-center">
                                            <Text className={`text-sm italic ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                              No results found for "{itemSearch}"
                                            </Text>
                                          </View>
                                        )}
                                      </ScrollView>
                                    </KeyboardAvoidingView>
                                  </View>
                                )}
                              </View>
                              {errors[`item_${index}`] && (
                                <Text className="text-xs mt-1" style={{ color: colorPalette?.primary || '#ea580c' }}>{errors[`item_${index}`]}</Text>
                              )}
                            </View>

                            {item.itemId && (
                              <View className="w-24">
                                <TextInput
                                  keyboardType="numeric"
                                  value={item.quantity.toString()}
                                  onChangeText={(text) => handleItemChange(index, 'quantity', text)}
                                  placeholder="Qty"
                                  placeholderTextColor={isDarkMode ? '#9CA3AF' : '#4B5563'}
                                  className={`px-3 py-3 border rounded-lg ${isDarkMode ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300'
                                    }`}
                                />
                                {errors[`quantity_${index}`] && (
                                  <Text className="text-xs mt-1" style={{ color: colorPalette?.primary || '#ea580c' }}>{errors[`quantity_${index}`]}</Text>
                                )}
                              </View>
                            )}

                            {orderItems.length > 1 && (
                              <Pressable
                                onPress={() => handleRemoveItem(index)}
                                className="p-3 items-center justify-center"
                              >
                                <X size={20} color={isDarkMode ? '#F87171' : '#EF4444'} />
                              </Pressable>
                            )}
                          </View>
                        </View>
                      ))}
                      {errors.items && (
                        <View className="flex-row items-center mt-1">
                          <View
                            className="flex items-center justify-center w-4 h-4 rounded-full mr-2"
                            style={{ backgroundColor: colorPalette?.primary || '#ea580c' }}
                          >
                            <Text className="text-white text-[10px] font-bold">!</Text>
                          </View>
                          <Text className="text-xs" style={{ color: colorPalette?.primary || '#ea580c' }}>{errors.items}</Text>
                        </View>
                      )}
                    </View>

                    <LocationPicker
                      value={formData.addressCoordinates}
                      onChange={(coordinates) => handleInputChange('addressCoordinates', coordinates)}
                      isDarkMode={isDarkMode}
                      label="Address Coordinates"
                      required={true}
                      error={errors.addressCoordinates}
                    />
                  </>
                )}

                {(formData.onsiteStatus === 'Failed' || formData.onsiteStatus === 'Reschedule') && (
                  <View className="space-y-4">
                    <View className="mb-4">
                      <Text className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>Visit By<Text className="text-red-500">*</Text></Text>
                      <View className="relative">
                        <View className={`border rounded-lg overflow-hidden ${errors.visit_by ? 'border-red-500' : (isDarkMode ? 'border-gray-700' : 'border-gray-300')} ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                          <Picker
                            selectedValue={formData.visit_by}
                            onValueChange={(value) => handleInputChange('visit_by', value)}
                            style={{ color: isDarkMode ? '#fff' : '#000' }}
                            dropdownIconColor={isDarkMode ? '#fff' : '#000'}
                          >
                            <Picker.Item label="Select Visit By" value="" />
                            {formData.visit_by && !technicians.some(t => t.name === formData.visit_by) && (
                              <Picker.Item label={formData.visit_by} value={formData.visit_by} />
                            )}
                            {technicians.map((technician, index) => (
                              <Picker.Item key={index} label={technician.name} value={technician.name} />
                            ))}
                          </Picker>
                        </View>
                      </View>
                      {errors.visit_by && (
                        <View className="flex-row items-center mt-1">
                          <View
                            className="flex items-center justify-center w-4 h-4 rounded-full mr-2"
                            style={{ backgroundColor: colorPalette?.primary || '#ea580c' }}
                          >
                            <Text className="text-white text-[10px] font-bold">!</Text>
                          </View>
                          <Text className="text-xs" style={{ color: colorPalette?.primary || '#ea580c' }}>This entry is required</Text>
                        </View>
                      )}
                    </View>

                    <View className="mb-4">
                      <Text className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>Visit With<Text className="text-red-500">*</Text></Text>
                      <View className="relative">
                        <View className={`border rounded-lg overflow-hidden ${errors.visit_with ? 'border-red-500' : (isDarkMode ? 'border-gray-700' : 'border-gray-300')} ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                          <Picker
                            selectedValue={formData.visit_with}
                            onValueChange={(value) => handleInputChange('visit_with', value)}
                            style={{ color: isDarkMode ? '#fff' : '#000' }}
                            dropdownIconColor={isDarkMode ? '#fff' : '#000'}
                          >
                            <Picker.Item key="default" label="Select Visit With" value="" />
                            <Picker.Item key="none" label="None" value="None" />
                            {formData.visit_with && formData.visit_with !== 'None' && formData.visit_with !== '' && !technicians.some(t => t.name === formData.visit_with) && (
                              <Picker.Item key="custom" label={formData.visit_with} value={formData.visit_with} />
                            )}
                            {technicians.filter(t => t.name !== formData.visit_by).map((technician, index) => (
                              <Picker.Item key={technician.email || index} label={technician.name} value={technician.name} />
                            ))}
                          </Picker>
                        </View>
                      </View>
                      {errors.visit_with && (
                        <View className="flex-row items-center mt-1">
                          <View
                            className="flex items-center justify-center w-4 h-4 rounded-full mr-2"
                            style={{ backgroundColor: colorPalette?.primary || '#ea580c' }}
                          >
                            <Text className="text-white text-[10px] font-bold">!</Text>
                          </View>
                          <Text className="text-xs" style={{ color: colorPalette?.primary || '#ea580c' }}>This entry is required</Text>
                        </View>
                      )}
                    </View>

                    <View className="mb-4">
                      <Text className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>Visit With(Other)<Text className="text-red-500">*</Text></Text>
                      <View className="relative">
                        <View className={`border rounded-lg overflow-hidden ${errors.visit_with_other ? 'border-red-500' : (isDarkMode ? 'border-gray-700' : 'border-gray-300')} ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                          <Picker
                            selectedValue={formData.visit_with_other}
                            onValueChange={(value) => handleInputChange('visit_with_other', value)}
                            style={{ color: isDarkMode ? '#fff' : '#000' }}
                            dropdownIconColor={isDarkMode ? '#fff' : '#000'}
                          >
                            <Picker.Item key="default" label="Visit With(Other)" value="" />
                            <Picker.Item key="none" label="None" value="None" />
                            {formData.visit_with_other && formData.visit_with_other !== 'None' && formData.visit_with_other !== '' && !technicians.some(t => t.name === formData.visit_with_other) && (
                              <Picker.Item key="custom" label={formData.visit_with_other} value={formData.visit_with_other} />
                            )}
                            {technicians.filter(t => t.name !== formData.visit_by).map((technician, index) => (
                              <Picker.Item key={technician.email || index} label={technician.name} value={technician.name} />
                            ))}
                          </Picker>
                        </View>
                      </View>
                      {errors.visit_with_other && (
                        <View className="flex-row items-center mt-1">
                          <View
                            className="flex items-center justify-center w-4 h-4 rounded-full mr-2"
                            style={{ backgroundColor: colorPalette?.primary || '#ea580c' }}
                          >
                            <Text className="text-white text-[10px] font-bold">!</Text>
                          </View>
                          <Text className="text-xs" style={{ color: colorPalette?.primary || '#ea580c' }}>This entry is required</Text>
                        </View>
                      )}
                    </View>

                    <View className="mb-4">
                      <Text className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>Onsite Remarks<Text className="text-red-500">*</Text></Text>
                      <TextInput
                        value={formData.onsiteRemarks}
                        onChangeText={(text) => handleInputChange('onsiteRemarks', text)}
                        multiline={true}
                        numberOfLines={4}
                        placeholderTextColor={isDarkMode ? '#9CA3AF' : '#4B5563'}
                        className={`w-full px-3 py-2 border rounded-lg ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                          } ${errors.onsiteRemarks ? 'border-red-500' : (isDarkMode ? 'border-gray-700' : 'border-gray-300')}`}
                        style={{ textAlignVertical: 'top' }}
                      />
                      {errors.onsiteRemarks && (
                        <View className="flex-row items-center mt-1">
                          <View
                            className="flex items-center justify-center w-4 h-4 rounded-full mr-2"
                            style={{ backgroundColor: colorPalette?.primary || '#ea580c' }}
                          >
                            <Text className="text-white text-[10px] font-bold">!</Text>
                          </View>
                          <Text className="text-xs" style={{ color: colorPalette?.primary || '#ea580c' }}>This entry is required</Text>
                        </View>
                      )}
                    </View>

                    <View className="mb-4">
                      <Text className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>Status Remarks<Text className="text-red-500">*</Text></Text>
                      <View className="relative">
                        <View className={`border rounded-lg overflow-hidden ${errors.statusRemarks ? 'border-red-500' : (isDarkMode ? 'border-gray-700' : 'border-gray-300')} ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
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
                        <View className="flex-row items-center mt-1">
                          <View
                            className="flex items-center justify-center w-4 h-4 rounded-full mr-2"
                            style={{ backgroundColor: colorPalette?.primary || '#ea580c' }}
                          >
                            <Text className="text-white text-[10px] font-bold">!</Text>
                          </View>
                          <Text className="text-xs" style={{ color: colorPalette?.primary || '#ea580c' }}>This entry is required</Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View >
      </View >
    </Modal >
  );
};

export default JobOrderDoneFormTechModal;
