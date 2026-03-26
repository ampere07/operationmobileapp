import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, Modal, Image, Platform, DeviceEventEmitter, KeyboardAvoidingView, Alert, Keyboard, StyleSheet, ActivityIndicator, InteractionManager } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import SignatureScreen from 'react-native-signature-canvas';
import * as ExpoFileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { ChevronLeft, X, ChevronDown, Camera, CheckCircle, AlertCircle, XCircle, Search, Check } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { UserData } from '../types/api';
import { updateJobOrder } from '../services/jobOrderService';
import { userService } from '../services/userService';
import { planService, Plan } from '../services/planService';
import { getAllLCPNAPs, LCPNAP, getMostUsedLCPNAPs } from '../services/lcpnapService';
import { getAllVLANs, VLAN } from '../services/vlanService';
import { getAllUsageTypes, UsageType } from '../services/usageTypeService';
import { getAllInventoryItems, InventoryItem } from '../services/inventoryItemService';
import { createJobOrderItems, JobOrderItem } from '../services/jobOrderItemService';
import { updateApplication } from '../services/applicationService';
import apiClient from '../config/api';
import { getActiveImageSize } from '../services/imageSettingsService';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';
import LocationPicker from '../components/LocationPicker';
import { pppoeService, UsernamePattern } from '../services/pppoeService';
import ImagePreview from '../components/ImagePreview';

interface JobOrderDoneFormTechModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (formData: any) => void;
  jobOrderData?: any;
}

type RouterModelEntry = { model: string; brand: string; description: string; id: number };

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
  proofImage: File | null;
}

interface OrderItem {
  itemId: string;
  quantity: string;
}

// ─── Mini Modal Item Component ──────────────────────────────────────────────
interface MiniModalItemProps {
  label: string;
  isSelected: boolean;
  onPress: (label: string) => void;
  isDarkMode: boolean;
  primaryColor: string;
  imageUrl?: string | null;
}

const MiniModalItem = React.memo<MiniModalItemProps>(
  ({ label, isSelected, onPress, isDarkMode, primaryColor, imageUrl }) => (
    <Pressable
      onPress={() => onPress(label)}
      style={({ pressed }) => [
        styles.miniModalItem,
        { backgroundColor: pressed ? (isDarkMode ? 'rgba(124, 58, 237, 0.1)' : '#f3f4f6') : 'transparent' }
      ]}
    >
      <Text style={[styles.miniModalItemText, {
        color: isSelected ? primaryColor : (isDarkMode ? '#e5e7eb' : '#374151'),
        fontWeight: isSelected ? '700' : 'bold',
        flex: 1
      }]}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {imageUrl && (
          <Image
            source={{ uri: imageUrl || undefined }}
            style={{ width: 40, height: 40, borderRadius: 6, backgroundColor: '#f3f4f6', resizeMode: 'cover' }}
          />
        )}
        {isSelected && <Check size={24} color={primaryColor} />}
      </View>
    </Pressable>
  )
);

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
  const isDarkMode = false;
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);



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
    addressCoordinates: '',
    proofImage: null
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [submittingDots, setSubmittingDots] = useState('');

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      setSubmittingDots('.');
      interval = setInterval(() => {
        setSubmittingDots(prev => (prev.length >= 3 ? '.' : prev + '.'));
      }, 500);
    } else {
      setSubmittingDots('');
    }
    return () => clearInterval(interval);
  }, [loading]);

  const [technicians, setTechnicians] = useState<Array<{ email: string; name: string }>>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [routerModels, setRouterModels] = useState<RouterModelEntry[]>([]);
  const [lcpnaps, setLcpnaps] = useState<LCPNAP[]>([]);
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
    proofImage: string | null;
  }>({
    signedContractImage: null,
    setupImage: null,
    boxReadingImage: null,
    routerReadingImage: null,
    portLabelImage: null,
    clientSignatureImage: null,
    speedTestImage: null,
    proofImage: null
  });

  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState<{
    title: string;
    messages: Array<{ type: 'success' | 'warning' | 'error'; text: string }>;
  }>({ title: '', messages: [] });
  const [showLoadingModal, setShowLoadingModal] = useState(false);
  const [loadingPercentage, setLoadingPercentage] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [usernamePattern, setUsernamePattern] = useState<UsernamePattern | null>(null);
  const [techInputValue, setTechInputValue] = useState<string>('');
  const [lcpnapSearch, setLcpnapSearch] = useState('');
  const [itemSearchModal, setItemSearchModal] = useState('');
  const [routerModelSearch, setRouterModelSearch] = useState('');
  const [isRouterModelMiniModalVisible, setIsRouterModelMiniModalVisible] = useState(false);
  const [isItemMiniModalVisible, setIsItemMiniModalVisible] = useState(false);
  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);
  const [usedPorts, setUsedPorts] = useState<Set<string>>(new Set());

  const [isLcpnapMiniModalVisible, setIsLcpnapMiniModalVisible] = useState(false);
  const [isUsageTypeMiniModalVisible, setIsUsageTypeMiniModalVisible] = useState(false);
  const [isPortMiniModalVisible, setIsPortMiniModalVisible] = useState(false);
  const [isVlanMiniModalVisible, setIsVlanMiniModalVisible] = useState(false);
  const [isTechMiniModalVisible, setIsTechMiniModalVisible] = useState(false);

  const [usageTypeSearch, setUsageTypeSearch] = useState('');
  const [portSearch, setPortSearch] = useState('');
  const [vlanSearch, setVlanSearch] = useState('');
  const [techSearch, setTechSearch] = useState('');
  const [activeTechField, setActiveTechField] = useState<'visit_by' | 'visit_with' | 'visit_with_other' | null>(null);

  const [mostUsedLcpnaps, setMostUsedLcpnaps] = useState<LCPNAP[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isDoneRendering, setIsDoneRendering] = useState(false);

  // Shared mounted flag – set false on unmount so ALL async callbacks can bail out
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Open-session counter – incremented each time the modal transitions to isOpen=true.
  // Every async fetch captures this snapshot; if it changes (modal closed + reopened)
  // the stale callback sees the mismatch and silently discards its results.
  const openCycleRef = useRef(0);

  // Deferred rendering: prevent heavy form from rendering on the same frame modal opens
  const [isContentReady, setIsContentReady] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Use InteractionManager for better performance during modal transition,
      // but add a safety fallback timeout in case InteractionManager is blocked.
      const handle = InteractionManager.runAfterInteractions(() => {
        if (isMountedRef.current) {
          setIsContentReady(true);
        }
      });

      const safetyTimeout = setTimeout(() => {
        if (isMountedRef.current) {
          setIsContentReady(true);
        }
      }, 500); // 500ms safety fallback

      return () => {
        handle.cancel();
        clearTimeout(safetyTimeout);
      };
    } else {
      setIsContentReady(false);
    }
  }, [isOpen]);

  // Deferred rendering for the "Done" form section to prevent crashes on state change
  useEffect(() => {
    if (formData.onsiteStatus === 'Done') {
      const timer = setTimeout(() => {
        if (isMountedRef.current) {
          setIsDoneRendering(true);
        }
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setIsDoneRendering(false);
    }
  }, [formData.onsiteStatus]);

  // Signature State
  const signatureRef = useRef<any>(null);
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




  // Consolidated data fetching - all independent API calls batched into one effect.
  // Uses openCycleRef so rapid open/close cycles never cause stale state merges.
  useEffect(() => {
    if (!isOpen) {
      // Full cleanup when modal closes – reset EVERYTHING to prevent state leaks
      setFormData({
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
          month: '2-digit', day: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit', second: '2-digit',
          hour12: true
        }),
        itemName1: '',
        visit_by: '',
        visit_with: '',
        visit_with_other: '',
        statusRemarks: '',
        ip: '',
        addressCoordinates: '',
        proofImage: null
      });
      setImagePreviews({
        signedContractImage: null,
        setupImage: null,
        boxReadingImage: null,
        routerReadingImage: null,
        portLabelImage: null,
        clientSignatureImage: null,
        speedTestImage: null,
        proofImage: null
      });
      setErrors({});
      setOrderItems([{ itemId: '', quantity: '' }]);
      setTechInputValue('');
      return;
    }

    // Bump the session counter every time we open
    openCycleRef.current += 1;
    const session = openCycleRef.current;

    // Helper: returns true only if THIS fetch's session is still active
    const isCurrentSession = () =>
      isMountedRef.current && openCycleRef.current === session;

    // AbortController lets us cancel in-flight axios requests when the
    // modal closes before the requests complete.
    const controller = new AbortController();

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
      ] = await Promise.allSettled([
        getActiveImageSize(),
        pppoeService.getPatterns('username'),
        getAllLCPNAPs('', 1, 1000),
        getAllVLANs(),
        getAllUsageTypes(),
        getAllInventoryItems('', 1, 1000),
        userService.getUsersByRole('technician'),
        planService.getAllPlans(),
      ]);

      // Bail if the modal was closed (or reopened) while we were waiting
      if (!isCurrentSession()) return;

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

      // Inventory Items & Router Models
      if (inventoryResult.status === 'fulfilled') {
        const response = inventoryResult.value;
        if (response.success && Array.isArray(response.data)) {
          // Normal Items (Category 1)
          const filteredItems = response.data.filter(item => {
            const catId = item.category_id || (item as any).Category_ID || (item as any).categoryId || (item as any).category;
            return catId === 1 || String(catId) === '1';
          });
          setInventoryItems(filteredItems);

          // Router Models (Category 11)
          const combinedRouterModels = response.data
            .filter(item => {
              if (!item) return false;
              const catId = item.category_id || (item as any).Category_ID || (item as any).categoryId || (item as any).category;
              return (catId === 11 || String(catId) === '11') && item.item_name;
            })
            .map((item, index) => ({
              model: item.item_name,
              brand: 'Inventory',
              description: item.item_description || '',
              id: index
            }));

          setRouterModels(combinedRouterModels);
        } else {
          setInventoryItems([]);
          setRouterModels([]);
        }
      } else {
        setInventoryItems([]);
        setRouterModels([]);
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

      // Check session again before the sequential most-used LCPNAPs fetch
      if (!isCurrentSession()) return;

      // Fetch most used LCPNAPs
      try {
        const resp = await getMostUsedLCPNAPs();
        if (isCurrentSession() && resp.success) {
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
            const response = await apiClient.get(`/job-order-items?job_order_id=${jobOrderId}`, {
              signal: controller.signal
            });
            const data = response.data as { success: boolean; data: any[] };

            if (!isCurrentSession()) return;

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
          } catch (error: any) {
            // Ignore AbortError – it's an intentional cancellation
            if (error?.name !== 'AbortError' && error?.code !== 'ERR_CANCELED' && isCurrentSession()) {
              setOrderItems([{ itemId: '', quantity: '' }]);
            }
          }
        }
      }
    };

    fetchJobOrderItems();

    return () => {
      // Cancel in-flight HTTP requests immediately when this effect re-runs or unmounts
      controller.abort();
    };
  }, [isOpen, jobOrderData]);


  // Fetch used ports for the selected LCPNAP
  useEffect(() => {
    if (!isOpen || !formData.lcpnap) {
      setUsedPorts(new Set());
      return;
    }

    const session = openCycleRef.current;
    const isCurrentSession = () => isMountedRef.current && openCycleRef.current === session;
    const controller = new AbortController();

    const fetchUsedPorts = async () => {
      try {
        const response = await apiClient.get('/job-orders', {
          params: {
            lcpnap: formData.lcpnap,
            limit: 2000
          },
          signal: controller.signal
        });

        if (!isCurrentSession()) return;

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
      } catch (error: any) {
        if (error?.name !== 'AbortError' && error?.code !== 'ERR_CANCELED') {
          console.error('Failed to fetch used ports:', error);
        }
      }
    };

    fetchUsedPorts();

    return () => { controller.abort(); };
  }, [isOpen, formData.lcpnap, jobOrderData]);

  useEffect(() => {
    if (!jobOrderData || !isOpen) return;

    const session = openCycleRef.current;
    const isCurrentSession = () => isMountedRef.current && openCycleRef.current === session;
    const controller = new AbortController();

    const loadedOnsiteStatus = jobOrderData.Onsite_Status || jobOrderData.onsite_status || 'In Progress';

    const isEmptyValue = (value: any): boolean => {
      if (value === null || value === undefined || value === '') return true;
      if (typeof value === 'string') {
        const trimmed = value.trim().toLowerCase();
        return trimmed === 'null' || trimmed === 'undefined';
      }
      return false;
    };

    const getValue = (value: any): string => isEmptyValue(value) ? '' : value;

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
        if (year < 2020) return today;

        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        return `${year}-${month}-${day}`;
      } catch (error) {
        return today;
      }
    };

    const sanitize = (v: any): string => {
      const s = (v || '').toString().trim().toLowerCase();
      return (s === 'undefined' || s === 'null') ? '' : (v || '').toString();
    };

    const buildFormData = (appData?: any) => ({
      dateInstalled: formatDateForInput(jobOrderData.Date_Installed || jobOrderData.date_installed),
      usageType: sanitize(jobOrderData.Usage_Type || jobOrderData.usage_type),
      choosePlan: getValue(jobOrderData.Desired_Plan || jobOrderData.desired_plan || jobOrderData.Choose_Plan || jobOrderData.choose_plan || jobOrderData.plan),
      connectionType: getValue(jobOrderData.Connection_Type || jobOrderData.connection_type),
      routerModel: sanitize(jobOrderData.Router_Model || jobOrderData.router_model),
      modemSN: getValue(jobOrderData.Modem_SN || jobOrderData.modem_sn),
      lcpnap: getValue(jobOrderData.LCPNAP || jobOrderData.lcpnap),
      port: getValue(jobOrderData.PORT || jobOrderData.port),
      vlan: getValue(jobOrderData.VLAN || jobOrderData.vlan),
      region: getValue((appData?.region) || jobOrderData.Region || jobOrderData.region),
      city: getValue((appData?.city) || jobOrderData.City || jobOrderData.city),
      barangay: getValue((appData?.barangay) || jobOrderData.Barangay || jobOrderData.barangay),
      onsiteStatus: loadedOnsiteStatus,
      onsiteRemarks: getValue(jobOrderData.Onsite_Remarks || jobOrderData.onsite_remarks),
      itemName1: getValue(jobOrderData.Item_Name_1 || jobOrderData.item_name_1),
      visit_by: getValue(jobOrderData.Visit_By || jobOrderData.visit_by),
      visit_with: getValue(jobOrderData.Visit_With || jobOrderData.visit_with),
      visit_with_other: getValue(jobOrderData.Visit_With_Other || jobOrderData.visit_with_other),
      statusRemarks: getValue(jobOrderData.Status_Remarks || jobOrderData.status_remarks),
      ip: getValue(jobOrderData.IP || jobOrderData.ip),
      addressCoordinates: getValue((appData?.long_lat) || jobOrderData.Address_Coordinates || jobOrderData.address_coordinates)
    });

    const buildImagePreviews = (safeConvert: (val: any) => string | null) => ({
      signedContractImage: safeConvert(jobOrderData.signed_contract_image_url || jobOrderData.Signed_Contract_Image_URL),
      setupImage: safeConvert(jobOrderData.setup_image_url || jobOrderData.Setup_Image_URL),
      boxReadingImage: safeConvert(jobOrderData.box_reading_image_url || jobOrderData.Box_Reading_Image_URL),
      routerReadingImage: safeConvert(jobOrderData.router_reading_image_url || jobOrderData.Router_Reading_Image_URL),
      portLabelImage: safeConvert(jobOrderData.port_label_image_url || jobOrderData.Port_Label_Image_URL),
      clientSignatureImage: safeConvert(jobOrderData.client_signature_url || jobOrderData.Client_Signature_URL),
      speedTestImage: safeConvert(jobOrderData.speedtest_image_url || jobOrderData.Speedtest_Image_URL),
      proofImage: safeConvert(jobOrderData.proof_image_url || jobOrderData.Proof_Image_URL)
    });

    const safeConvertUrl = (val: any): string | null => {
      const url = val || '';
      if (url && typeof url === 'string' && url.startsWith('http')) {
        return convertGoogleDriveUrl(url);
      }
      return null;
    };

    const fetchApplicationData = async () => {
      try {
        const applicationId = jobOrderData.application_id || jobOrderData.Application_ID;
        if (applicationId) {
          const appResponse = await apiClient.get<{ success: boolean; application: any }>(
            `/applications/${applicationId}`,
            { signal: controller.signal }
          );

          // Discard if the modal was closed or a new open-cycle started
          if (!isCurrentSession()) return;

          if (appResponse.data.success && appResponse.data.application) {
            setFormData(prev => ({ ...prev, ...buildFormData(appResponse.data.application) }));
            setImagePreviews(buildImagePreviews(safeConvertUrl));
          } else {
            setFormData(prev => ({ ...prev, ...buildFormData() }));
            setImagePreviews(buildImagePreviews(safeConvertUrl));
          }
        } else {
          if (!isCurrentSession()) return;
          setFormData(prev => ({ ...prev, ...buildFormData() }));
          setImagePreviews(buildImagePreviews(safeConvertUrl));
        }
      } catch (error: any) {
        // Ignore AbortError – it's an intentional cancellation
        if (error?.name === 'AbortError' || error?.code === 'ERR_CANCELED') return;
        if (!isCurrentSession()) return;
        setFormData(prev => ({ ...prev, ...buildFormData() }));
        setImagePreviews(buildImagePreviews(safeConvertUrl));
      }
    };

    fetchApplicationData();

    return () => {
      controller.abort();
    };
  }, [jobOrderData, isOpen]);

  const handleInputChange = useCallback((field: keyof JobOrderDoneFormData, value: string | File | null) => {
    let finalValue = value;
    if (typeof value === 'string' && field === 'modemSN') {
      finalValue = value.toUpperCase();
    }
    setFormData(prev => {
      const newData = { ...prev, [field]: finalValue };
      if (field === 'lcpnap') newData.port = '';
      if (field === 'region') { newData.city = ''; newData.barangay = ''; }
      if (field === 'city') newData.barangay = '';
      return newData;
    });
    setErrors(prev => {
      if (prev[field]) {
        return { ...prev, [field]: '' };
      }
      return prev;
    });
  }, []);

  const handleImageUpload = useCallback((field: 'signedContractImage' | 'setupImage' | 'boxReadingImage' | 'routerReadingImage' | 'portLabelImage' | 'clientSignatureImage' | 'speedTestImage' | 'proofImage', file: any) => {
    setFormData(prev => ({ ...prev, [field]: file }));
    setImagePreviews(prev => ({ ...prev, [field]: file ? file.uri : null }));
    setErrors(prev => prev[field] ? { ...prev, [field]: '' } : prev);
  }, []);

  const handleSignatureOK = async (signature: string) => {
    setIsDrawingSignature(false);
    setScrollEnabled(true);
    try {
      const path = `${(ExpoFileSystem as any).cacheDirectory}signature_${Date.now()}.png`;
      const base64Code = signature.replace('data:image/png;base64,', '');
      await (ExpoFileSystem as any).writeAsStringAsync(path, base64Code, {
        encoding: 'base64',
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
      }

      if (!formData.visit_by.trim()) newErrors.visit_by = 'Visit By is required';
      if (!formData.visit_with.trim()) newErrors.visit_with = 'Visit With is required';
      if (!formData.visit_with_other.trim()) newErrors.visit_with_other = 'Visit With(Other) is required';
      if (!formData.onsiteRemarks.trim()) newErrors.onsiteRemarks = 'Onsite Remarks is required';
      if (!formData.addressCoordinates.trim()) newErrors.addressCoordinates = 'Address Coordinates is required';

      const selectedItems = orderItems.filter(item => item.itemId && item.itemId !== 'None');
      const hasNoneItem = orderItems.some(item => item.itemId === 'None');

      if (selectedItems.length === 0 && !hasNoneItem) {
        newErrors.items = 'At least one item or "None" is required';
      } else {
        orderItems.forEach((item, index) => {
          if (item.itemId && item.itemId !== 'None') {
            if (!item.quantity || parseInt(item.quantity) <= 0) {
              newErrors[`quantity_${index}`] = 'Valid quantity is required';
              if (!newErrors.items) newErrors.items = `Quantity required for ${item.itemId}`;
            }
          }
        });
      }

      // Image and Signature Validations for 'Done'
      if (!formData.boxReadingImage && !jobOrderData?.box_reading_image_url && !jobOrderData?.Box_Reading_Image_URL)
        newErrors.boxReadingImage = 'Box Reading Image is required';

      if (!formData.routerReadingImage && !jobOrderData?.router_reading_image_url && !jobOrderData?.Router_Reading_Image_URL)
        newErrors.routerReadingImage = 'Router Reading Image is required';

      if ((formData.connectionType === 'Antenna' || formData.connectionType === 'Local') &&
        !formData.portLabelImage && !jobOrderData?.port_label_image_url && !jobOrderData?.Port_Label_Image_URL)
        newErrors.portLabelImage = 'Port Label Image is required';

      if (!formData.setupImage && !jobOrderData?.setup_image_url && !jobOrderData?.Setup_Image_URL)
        newErrors.setupImage = 'Setup Image is required';

      if (!formData.signedContractImage && !jobOrderData?.signed_contract_image_url && !jobOrderData?.Signed_Contract_Image_URL)
        newErrors.signedContractImage = 'Signed Contract Image is required';

      if (!formData.clientSignatureImage && !jobOrderData?.client_signature_url && !jobOrderData?.Client_Signature_URL)
        newErrors.clientSignatureImage = 'Client Signature is required';

      if (!formData.speedTestImage && !jobOrderData?.speedtest_image_url && !jobOrderData?.Speedtest_Image_URL)
        newErrors.speedTestImage = 'Speed Test Image is required';


    }

    if (formData.onsiteStatus === 'Failed' || formData.onsiteStatus === 'Reschedule') {
      if (!formData.visit_by.trim()) newErrors.visit_by = 'Visit By is required';
      if (!formData.visit_with.trim()) newErrors.visit_with = 'Visit With is required';
      if (!formData.visit_with_other.trim()) newErrors.visit_with_other = 'Visit With(Other) is required';
      if (!formData.onsiteRemarks.trim()) newErrors.onsiteRemarks = 'Onsite Remarks is required';
      if (!formData.statusRemarks.trim()) newErrors.statusRemarks = 'Status Remarks is required';
      if (!formData.proofImage && !jobOrderData?.proof_image_url && !jobOrderData?.Proof_Image_URL) newErrors.proofImage = 'Proof Image is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (isDrawingSignature) {
      Alert.alert('Signature Required', 'Please click the "Save" button below the signature pad first to confirm your signature.');
      return;
    }

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
      showMessageModal('Validation Error', [
        { type: 'error', text: 'Please fill in all required fields before saving.' }
      ]);
      return;
    }

    // Modem SN Duplicate Validation (Job Orders & Technical Details)
    // Refactored to show specific validation steps in the loading modal
    const jobOrderId = jobOrderData?.id || jobOrderData?.JobOrder_ID;
    
    if (!jobOrderId) {
      showMessageModal('Error', [
        { type: 'error', text: 'Cannot update job order: Missing ID' }
      ]);
      return;
    }

    setLoading(true);
    setShowLoadingModal(true);
    setLoadingPercentage(0);
    setCurrentStep(0);
    setLoadingMessage('Starting validation...');

    const saveMessages: Array<{ type: 'success' | 'warning' | 'error'; text: string }> = [];
    let progressInterval: NodeJS.Timeout | null = null;

    try {
      // 1. SmartOLT Validation (Fiber only)
      if (updatedFormData.onsiteStatus === 'Done' && updatedFormData.modemSN.trim() && updatedFormData.connectionType === 'Fiber') {
        setLoadingMessage('Checking SN in SmartOLT...');
        setLoadingPercentage(10);
        try {
          const smartOltResponse = await apiClient.get('/smart-olt/validate-sn', {
            params: { sn: updatedFormData.modemSN }
          });
          if (!(smartOltResponse.data as any).success) {
            throw new Error('sn not existing in smart olt');
          }
        } catch (error: any) {
          throw new Error(error.response?.data?.message || 'sn not existing in smart olt');
        }
      }
      
      setCurrentStep(1);
      setLoadingPercentage(20);
      await new Promise(resolve => setTimeout(resolve, 600));

      // 2 & 3. Duplicate SN Check (Job Orders & Technical Details)
      if (updatedFormData.onsiteStatus === 'Done' && updatedFormData.modemSN.trim()) {
        setLoadingMessage('Checking SN duplicate in Job Orders...');
        setLoadingPercentage(35);
        
        try {
          const duplicateResponse = await apiClient.get('/job-orders/validate-sn', {
            params: {
              sn: updatedFormData.modemSN,
              exclude_id: jobOrderId
            }
          });

          if (duplicateResponse.data && !duplicateResponse.data.success && (duplicateResponse.data as any).is_duplicate) {
            const source = (duplicateResponse.data as any).source;
            if (source === 'job_orders') {
              throw new Error((duplicateResponse.data as any).message || 'SN Duplicate Detected in Job Orders.');
            }
            
            // Job Order pass, check Technical Details
            setCurrentStep(2);
            setLoadingPercentage(50);
            setLoadingMessage('Checking SN duplicate in Technical Details...');
            await new Promise(resolve => setTimeout(resolve, 800));
            
            if (source === 'technical_details') {
              throw new Error((duplicateResponse.data as any).message || 'SN Duplicate Detected in Technical Details.');
            }
          }
          
          // Passing both
          setCurrentStep(2);
          setLoadingPercentage(50);
          setLoadingMessage('Checking SN duplicate in Technical Details...');
          await new Promise(resolve => setTimeout(resolve, 800));
        } catch (error: any) {
          throw error;
        }
      } else {
        // Skip duplicate checks if not 'Done'
        setCurrentStep(1);
        setLoadingPercentage(35);
        await new Promise(resolve => setTimeout(resolve, 400));
        setCurrentStep(2);
        setLoadingPercentage(55);
        await new Promise(resolve => setTimeout(resolve, 400));
      }

      // 4. Proceed to Saving
      setCurrentStep(3);
      setLoadingPercentage(65);
      setLoadingMessage('Finalizing and saving changes...');
      
      progressInterval = setInterval(() => {
        setLoadingPercentage(prev => {
          if (prev >= 98) return 98;
          return prev + 1;
        });
      }, 500);



      const now = new Date();
      const currentDateTime = now.getFullYear() + '-' + 
        String(now.getMonth() + 1).padStart(2, '0') + '-' + 
        String(now.getDate()).padStart(2, '0') + ' ' + 
        String(now.getHours()).padStart(2, '0') + ':' + 
        String(now.getMinutes()).padStart(2, '0') + ':' + 
        String(now.getSeconds()).padStart(2, '0');

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
        desired_plan: updatedFormData.choosePlan,
        end_time: currentDateTime
      };

      if (updatedFormData.onsiteStatus === 'Done') {
        jobOrderUpdateData.connection_type = updatedFormData.connectionType;
        jobOrderUpdateData.modem_router_sn = updatedFormData.modemSN;
        jobOrderUpdateData.ip_address = updatedFormData.ip;
        jobOrderUpdateData.onsite_remarks = updatedFormData.onsiteRemarks;
        jobOrderUpdateData.address_coordinates = updatedFormData.addressCoordinates || '';
        jobOrderUpdateData.onsite_status = 'Done';
        
        // Add tech input username if applicable
        const hasTechInput = usernamePattern && usernamePattern.sequence.some(item => (item as any).type === 'tech_input');
        if (hasTechInput && techInputValue.trim()) {
          jobOrderUpdateData.pppoe_username = techInputValue.trim();
        }
      }

      if (['Done', 'Failed', 'Reschedule'].includes(updatedFormData.onsiteStatus)) {
        const firstName = (jobOrderData?.First_Name || jobOrderData?.first_name || '').trim();
        const middleInitial = (jobOrderData?.Middle_Initial || jobOrderData?.middle_initial || '').trim();
        const fullLastName = (jobOrderData?.Last_Name || jobOrderData?.last_name || '').trim();
        const folderName = `(joborder)${firstName} ${middleInitial} ${fullLastName}`.trim();

        const imageFormData = new FormData();
        imageFormData.append('folder_name', folderName);

        let hasImages = false;
        const safeAppendImage = (fieldName: string, fileObj: any) => {
          if (!fileObj) return;
          const fileName = fileObj.name || `${fieldName}_${Date.now()}.jpg`;
          imageFormData.append(fieldName, fileObj, fileName);
          hasImages = true;
        };

        if (updatedFormData.onsiteStatus === 'Done') {
          safeAppendImage('signed_contract_image', formData.signedContractImage);
          safeAppendImage('setup_image', formData.setupImage);
          safeAppendImage('box_reading_image', formData.boxReadingImage);
          safeAppendImage('router_reading_image', formData.routerReadingImage);
          safeAppendImage('port_label_image', formData.portLabelImage);
          safeAppendImage('client_signature_image', formData.clientSignatureImage);
          safeAppendImage('speed_test_image', formData.speedTestImage);
        }

        if (updatedFormData.onsiteStatus === 'Failed' || updatedFormData.onsiteStatus === 'Reschedule') {
          safeAppendImage('proof_image', formData.proofImage);
        }

        if (hasImages) {

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
              proof_image_url?: string;
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
            if (imageUrls.proof_image_url) {
              jobOrderUpdateData.proof_image_url = imageUrls.proof_image_url;
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

      // RADIUS account creation is now handled by the backend during job order update
      // when onsiteStatus is set to 'Done'.
      if (updatedFormData.onsiteStatus === 'Done' && jobOrderResponse.data) {
        const { pppoe_username, pppoe_password } = jobOrderResponse.data;
        if (pppoe_username && pppoe_password) {
          saveMessages.push({
            type: 'success',
            text: `RADIUS/PPPoE Credentials: Username: ${pppoe_username}, Password: ${pppoe_password}`
          });
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

        if (validItems.length > 0) {
          try {
            const numericJobOrderId = parseInt((jobOrderData.JobOrder_ID || jobOrderData.id || 0).toString());
            if (!numericJobOrderId || isNaN(numericJobOrderId)) {
              throw new Error('Invalid Job Order ID for items saving');
            }

            const itemsToCreate: JobOrderItem[] = validItems.map(item => ({
              job_order_id: numericJobOrderId,
              item_name: item.itemId,
              quantity: parseInt(item.quantity)
            }));

            const createResponse = await createJobOrderItems(itemsToCreate);
            if (!createResponse.success) {
              throw new Error(createResponse.message || 'Failed to create job order items');
            }
          } catch (itemsError: any) {
            saveMessages.push({
              type: 'warning',
              text: `Items saving warning: ${itemsError.message || 'Check connection'}`
            });
          }
        }
      }

      if (progressInterval) clearInterval(progressInterval);
      setLoadingPercentage(100);
      await new Promise(resolve => setTimeout(resolve, 500));

      setErrors({});
      setLoading(false);
      setShowLoadingModal(false);
      setLoadingPercentage(0);
      onSave(updatedFormData);
      DeviceEventEmitter.emit('jobOrderUpdated');
      onClose();
    } catch (error: any) {
      if (progressInterval) clearInterval(progressInterval);
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error occurred';

      setLoading(false);
      setShowLoadingModal(false);
      setLoadingPercentage(0);

      // Special handling for RADIUS error to match user requirements exactly
      const displayMessage = errorMessage === 'radius api error occured contact support' 
        ? errorMessage 
        : `Failed to update records: ${errorMessage}`;

      showMessageModal('Error', [
        { type: 'error', text: displayMessage }
      ]);
    }
  };

  const fullName = useMemo(() => `${jobOrderData?.First_Name || jobOrderData?.first_name || ''} ${jobOrderData?.Middle_Initial || jobOrderData?.middle_initial || ''} ${jobOrderData?.Last_Name || jobOrderData?.last_name || ''}`.trim(), [jobOrderData]);

  const selectedLcpnap = useMemo(() => lcpnaps.find(ln => ln.lcpnap_name === formData.lcpnap), [lcpnaps, formData.lcpnap]);
  const portTotal = Number(selectedLcpnap?.port_total || 0) || 0;

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
    const query = itemSearchModal.toLowerCase();
    return inventoryItems
      .filter(invItem => {
        if (!invItem || !invItem.item_name) return false;
        return String(invItem.item_name).toLowerCase().includes(query);
      })
      .slice(0, 50);
  }, [inventoryItems, itemSearchModal]);

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

  const handleLcpnapItemPress = useCallback((name: string) => {
    handleInputChange('lcpnap', name);
    setIsLcpnapMiniModalVisible(false);
    setLcpnapSearch('');
    Keyboard.dismiss();
  }, [handleInputChange]);

  const handleRouterModelItemPress = useCallback((model: string) => {
    handleInputChange('routerModel', model);
    setIsRouterModelMiniModalVisible(false);
    setRouterModelSearch('');
    Keyboard.dismiss();
  }, [handleInputChange]);

  const handleInventoryItemPress = useCallback((name: string) => {
    if (activeItemIndex !== null) {
      handleItemChange(activeItemIndex, 'itemId', name);
    }
    setIsItemMiniModalVisible(false);
    setItemSearchModal('');
    setActiveItemIndex(null);
    Keyboard.dismiss();
  }, [activeItemIndex, handleItemChange]);

  const handleUsageTypeItemPress = useCallback((name: string) => {
    handleInputChange('usageType', name);
    setIsUsageTypeMiniModalVisible(false);
    setUsageTypeSearch('');
    Keyboard.dismiss();
  }, [handleInputChange]);

  const handlePortItemPress = useCallback((name: string) => {
    handleInputChange('port', name);
    setIsPortMiniModalVisible(false);
    setPortSearch('');
    Keyboard.dismiss();
  }, [handleInputChange]);

  const handleVlanItemPress = useCallback((name: string) => {
    handleInputChange('vlan', name);
    setIsVlanMiniModalVisible(false);
    setVlanSearch('');
    Keyboard.dismiss();
  }, [handleInputChange]);

  const handleTechItemPress = useCallback((name: string) => {
    if (activeTechField) {
      handleInputChange(activeTechField, name);
    }
    setIsTechMiniModalVisible(false);
    setTechSearch('');
    setActiveTechField(null);
    Keyboard.dismiss();
  }, [activeTechField, handleInputChange]);

  const filteredUsageTypes = useMemo(() => {
    const query = usageTypeSearch.toLowerCase();
    return usageTypes
      .map(ut => String(ut.usage_name || (ut as any).Usage_Name))
      .filter(name => name.toLowerCase().includes(query))
      .slice(0, 50);
  }, [usageTypes, usageTypeSearch]);

  const availablePorts = useMemo(() => {
    const ports = Array.from({ length: portTotal }, (_, i) => `P${(i + 1).toString().padStart(2, '0')}`);
    return ports.filter(p => !usedPorts.has(p));
  }, [portTotal, usedPorts]);

  const filteredPorts = useMemo(() => {
    const query = portSearch.toLowerCase();
    return availablePorts
      .filter(p => p.toLowerCase().includes(query))
      .slice(0, 50);
  }, [availablePorts, portSearch]);

  const filteredVlans = useMemo(() => {
    const query = vlanSearch.toLowerCase();
    return vlans
      .filter(vlan => vlan.value != null)
      .map(vlan => vlan.value!.toString())
      .filter(v => v.toLowerCase().includes(query))
      .slice(0, 50);
  }, [vlans, vlanSearch]);

  const filteredTechs = useMemo(() => {
    const query = techSearch.toLowerCase();
    let list = technicians;
    if (activeTechField === 'visit_by') list = visitByTechnicians;
    else if (activeTechField === 'visit_with') list = visitWithTechnicians;
    else if (activeTechField === 'visit_with_other') list = visitWithOtherTechnicians;
    
    // Add "None" for Visit With and Visit With Other
    const finalList = (activeTechField === 'visit_with' || activeTechField === 'visit_with_other')
      ? [{ name: 'None', email: '' }, ...list]
      : list;

    return finalList
      .filter(t => t.name.toLowerCase().includes(query))
      .slice(0, 50);
  }, [technicians, techSearch, activeTechField, visitByTechnicians, visitWithTechnicians, visitWithOtherTechnicians]);

  const renderLcpnapItem = useCallback(({ item, extraData }: any) => {
    const name = item.lcpnap_name || item.name || '';
    if (!name) return null;
    return (
      <MiniModalItem
        label={name}
        isSelected={extraData.selectedValue === name}
        onPress={extraData.onPress}
        isDarkMode={extraData.isDarkMode}
        primaryColor={extraData.primaryColor}
      />
    );
  }, []);

  const renderRouterModelItem = useCallback(({ item, extraData }: any) => {
    if (!item?.model) return null;
    return (
      <MiniModalItem
        label={item.model}
        isSelected={extraData.selectedValue === item.model}
        onPress={extraData.onPress}
        isDarkMode={extraData.isDarkMode}
        primaryColor={extraData.primaryColor}
      />
    );
  }, []);

  const renderItemItem = useCallback(({ item, extraData }: any) => {
    if (!item?.item_name) return null;
    return (
      <MiniModalItem
        label={item.item_name}
        isSelected={extraData.selectedValue === item.item_name}
        onPress={extraData.onPress}
        isDarkMode={extraData.isDarkMode}
        primaryColor={extraData.primaryColor}
        imageUrl={item.image_url ? convertGoogleDriveUrl(item.image_url) : null}
      />
    );
  }, []); // assuming convertGoogleDriveUrl is available globally in the file scope

  return (
    <>

      {/* ─── Loading Modal with Validation Steps ─────────────────────────── */}
      <Modal
        visible={showLoadingModal}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
      >
        <View style={styles.loadingModalOverlay}>
          <View style={[styles.loadingModalContent, { backgroundColor: isDarkMode ? '#1f2937' : '#ffffff' }]}>
            <ActivityIndicator size="large" color={colorPalette?.primary || '#7c3aed'} />
            <Text style={[styles.loadingPercentage, { color: colorPalette?.primary || '#7c3aed', marginTop: 16 }]}>
              {Math.round(loadingPercentage)}%
            </Text>
            <Text style={{ 
              marginTop: 8, 
              color: isDarkMode ? '#e5e7eb' : '#374151', 
              fontSize: 16, 
              fontWeight: '600',
              textAlign: 'center' 
            }}>
              {loadingMessage || 'Processing...'}
            </Text>
            
            {/* Steps indicator */}
            <View style={{ marginTop: 24, width: '100%' }}>
              {[
                'SmartOLT Validation',
                'Job Order duplicate check',
                'Technical Details check',
                'Saving changes'
              ].map((step, index) => (
                <View key={index} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <View style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: currentStep > index 
                      ? '#10b981' 
                      : (currentStep === index ? (colorPalette?.primary || '#7c3aed') : (isDarkMode ? '#374151' : '#e5e7eb')),
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12
                  }}>
                    {currentStep > index ? (
                      <Check size={14} color="white" />
                    ) : (
                      <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>{index + 1}</Text>
                    )}
                  </View>
                  <Text style={{ 
                    color: currentStep >= index 
                      ? (isDarkMode ? '#ffffff' : '#111827') 
                      : (isDarkMode ? '#9ca3af' : '#6b7280'),
                    fontSize: 14,
                    fontWeight: currentStep === index ? 'bold' : 'normal'
                  }}>
                    {step}
                  </Text>
                  {currentStep === index && (
                    <ActivityIndicator size="small" color={colorPalette?.primary || '#7c3aed'} style={{ marginLeft: 8 }} />
                  )}
                </View>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── Message Modal ───────────────────────────────────────────── */}
      <Modal
        visible={showModal}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={() => setShowModal(false)}
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

      {/* ─── LCP-NAP Mini Modal ──────────────────────────────────────── */}
      <Modal
        visible={isLcpnapMiniModalVisible}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
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
                  autoFocus={isLcpnapMiniModalVisible}
                />
                {lcpnapSearch.length > 0 && (
                  <Pressable onPress={() => setLcpnapSearch('')}>
                    <X size={18} color={isDarkMode ? '#9CA3AF' : '#4B5563'} />
                  </Pressable>
                )}
              </View>
            </View>
            <View style={{ height: 350, width: '100%' }}>
              <FlashList
                data={filteredLcpnaps}
                extraData={{ selectedValue: formData.lcpnap, onPress: handleLcpnapItemPress, isDarkMode, primaryColor: colorPalette?.primary || '#7c3aed' }}
                // @ts-ignore
                estimatedItemSize={60}
                keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
                ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
                renderItem={renderLcpnapItem}
                ListEmptyComponent={
                  <View style={styles.miniModalEmpty}>
                    <Text style={{ color: isDarkMode ? '#9CA3AF' : '#4B5563', fontSize: 16 }}>No results found</Text>
                  </View>
                }
                contentContainerStyle={{ paddingHorizontal: 40, paddingBottom: 20 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── Router Model Mini Modal ─────────────────────────────────── */}
      <Modal
        visible={isRouterModelMiniModalVisible}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
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
                  autoFocus={isRouterModelMiniModalVisible}
                  style={[styles.searchInput, { color: isDarkMode ? '#ffffff' : '#111827' }]}
                />
                {routerModelSearch.length > 0 && (
                  <Pressable onPress={() => setRouterModelSearch('')}>
                    <X size={18} color={isDarkMode ? '#9CA3AF' : '#4B5563'} />
                  </Pressable>
                )}
              </View>
            </View>
            <View style={{ height: 350, width: '100%' }}>
              <FlashList
                data={filteredRouterModels}
                extraData={{ selectedValue: formData.routerModel, onPress: handleRouterModelItemPress, isDarkMode, primaryColor: colorPalette?.primary || '#7c3aed' }}
                // @ts-ignore
                estimatedItemSize={60}
                keyExtractor={(item, index) => item.model ? item.model.toString() : index.toString()}
                ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
                renderItem={renderRouterModelItem}
                ListEmptyComponent={
                  <View style={styles.miniModalEmpty}>
                    <Text style={{ color: isDarkMode ? '#9CA3AF' : '#4B5563', fontSize: 16 }}>No results found</Text>
                  </View>
                }
                contentContainerStyle={{ paddingHorizontal: 40, paddingBottom: 20 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── Item Selection Mini Modal ───────────────────────────────── */}
      <Modal
        visible={isItemMiniModalVisible}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={() => setIsItemMiniModalVisible(false)}
      >
        <View style={styles.miniModalOverlay}>
          <View style={[styles.miniModalContent, { backgroundColor: isDarkMode ? '#1f2937' : '#ffffff' }]}>
            <View style={[styles.miniModalHeader, { borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb' }]}>
              <Text style={[styles.miniModalTitle, { color: isDarkMode ? '#ffffff' : '#111827' }]}>Select Item</Text>
              <Pressable onPress={() => setIsItemMiniModalVisible(false)} style={styles.miniModalClose}>
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
                  placeholder="Search Item..."
                  value={itemSearchModal}
                  onChangeText={setItemSearchModal}
                  placeholderTextColor={isDarkMode ? '#9CA3AF' : '#4B5563'}
                  style={[styles.searchInput, { color: isDarkMode ? '#ffffff' : '#111827' }]}
                  autoFocus={isItemMiniModalVisible}
                />
                {itemSearchModal.length > 0 && (
                  <Pressable onPress={() => setItemSearchModal('')}>
                    <X size={18} color={isDarkMode ? '#9CA3AF' : '#4B5563'} />
                  </Pressable>
                )}
              </View>
            </View>
            <View style={{ height: 350, width: '100%' }}>
              <FlashList
                data={[
                  ...("None".toLowerCase().includes(itemSearchModal.toLowerCase()) ? [{ id: -1, item_name: 'None', image_url: null } as any] : []),
                  ...filteredInventoryItems
                ]}
                extraData={{ selectedValue: activeItemIndex !== null ? orderItems[activeItemIndex]?.itemId : '', onPress: handleInventoryItemPress, isDarkMode, primaryColor: colorPalette?.primary || '#7c3aed' }}
                // @ts-ignore
                estimatedItemSize={60}
                keyExtractor={(item, index) => item.id !== undefined ? item.id.toString() : index.toString()}
                ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
                renderItem={renderItemItem}
                ListEmptyComponent={
                  <View style={styles.miniModalEmpty}>
                    <Text style={{ color: isDarkMode ? '#9CA3AF' : '#4B5563', fontSize: 16 }}>No results found</Text>
                  </View>
                }
                contentContainerStyle={{ paddingHorizontal: 40, paddingBottom: 20 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── Usage Type Mini Modal ──────────────────────────────────── */}
      <Modal
        visible={isUsageTypeMiniModalVisible}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={() => setIsUsageTypeMiniModalVisible(false)}
      >
        <View style={styles.miniModalOverlay}>
          <View style={[styles.miniModalContent, { backgroundColor: isDarkMode ? '#1f2937' : '#ffffff' }]}>
            <View style={[styles.miniModalHeader, { borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb' }]}>
              <Text style={[styles.miniModalTitle, { color: isDarkMode ? '#ffffff' : '#111827' }]}>Select Usage Type</Text>
              <Pressable onPress={() => setIsUsageTypeMiniModalVisible(false)} style={styles.miniModalClose}>
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
                  placeholder="Search Usage Type..."
                  value={usageTypeSearch}
                  onChangeText={setUsageTypeSearch}
                  placeholderTextColor={isDarkMode ? '#9CA3AF' : '#4B5563'}
                  style={[styles.searchInput, { color: isDarkMode ? '#ffffff' : '#111827' }]}
                  autoFocus={isUsageTypeMiniModalVisible}
                />
                {usageTypeSearch.length > 0 && (
                  <Pressable onPress={() => setUsageTypeSearch('')}>
                    <X size={18} color={isDarkMode ? '#9CA3AF' : '#4B5563'} />
                  </Pressable>
                )}
              </View>
            </View>
            <View style={{ height: 350, width: '100%' }}>
              <FlashList
                data={filteredUsageTypes}
                extraData={{ selectedValue: formData.usageType, onPress: handleUsageTypeItemPress, isDarkMode, primaryColor: colorPalette?.primary || '#7c3aed' }}
                // @ts-ignore
                estimatedItemSize={60}
                keyExtractor={(item, index) => index.toString()}
                ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
                renderItem={({ item, extraData }) => (
                  <MiniModalItem
                    label={item}
                    isSelected={extraData.selectedValue === item}
                    onPress={extraData.onPress}
                    isDarkMode={extraData.isDarkMode}
                    primaryColor={extraData.primaryColor}
                  />
                )}
                ListEmptyComponent={
                  <View style={styles.miniModalEmpty}>
                    <Text style={{ color: isDarkMode ? '#9CA3AF' : '#4B5563', fontSize: 16 }}>No results found</Text>
                  </View>
                }
                contentContainerStyle={{ paddingHorizontal: 40, paddingBottom: 20 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── Port Mini Modal ────────────────────────────────────────── */}
      <Modal
        visible={isPortMiniModalVisible}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={() => setIsPortMiniModalVisible(false)}
      >
        <View style={styles.miniModalOverlay}>
          <View style={[styles.miniModalContent, { backgroundColor: isDarkMode ? '#1f2937' : '#ffffff' }]}>
            <View style={[styles.miniModalHeader, { borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb' }]}>
              <Text style={[styles.miniModalTitle, { color: isDarkMode ? '#ffffff' : '#111827' }]}>Select PORT</Text>
              <Pressable onPress={() => setIsPortMiniModalVisible(false)} style={styles.miniModalClose}>
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
                  placeholder="Search PORT..."
                  value={portSearch}
                  onChangeText={setPortSearch}
                  placeholderTextColor={isDarkMode ? '#9CA3AF' : '#4B5563'}
                  style={[styles.searchInput, { color: isDarkMode ? '#ffffff' : '#111827' }]}
                  autoFocus={isPortMiniModalVisible}
                />
                {portSearch.length > 0 && (
                  <Pressable onPress={() => setPortSearch('')}>
                    <X size={18} color={isDarkMode ? '#9CA3AF' : '#4B5563'} />
                  </Pressable>
                )}
              </View>
            </View>
            <View style={{ height: 350, width: '100%' }}>
              <FlashList
                data={filteredPorts}
                extraData={{ selectedValue: formData.port, onPress: handlePortItemPress, isDarkMode, primaryColor: colorPalette?.primary || '#7c3aed' }}
                // @ts-ignore
                estimatedItemSize={60}
                keyExtractor={(item, index) => index.toString()}
                ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
                renderItem={({ item, extraData }) => (
                  <MiniModalItem
                    label={item}
                    isSelected={extraData.selectedValue === item}
                    onPress={extraData.onPress}
                    isDarkMode={extraData.isDarkMode}
                    primaryColor={extraData.primaryColor}
                  />
                )}
                ListEmptyComponent={
                  <View style={styles.miniModalEmpty}>
                    <Text style={{ color: isDarkMode ? '#9CA3AF' : '#4B5563', fontSize: 16 }}>No results found</Text>
                  </View>
                }
                contentContainerStyle={{ paddingHorizontal: 40, paddingBottom: 20 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── Vlan Mini Modal ────────────────────────────────────────── */}
      <Modal
        visible={isVlanMiniModalVisible}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={() => setIsVlanMiniModalVisible(false)}
      >
        <View style={styles.miniModalOverlay}>
          <View style={[styles.miniModalContent, { backgroundColor: isDarkMode ? '#1f2937' : '#ffffff' }]}>
            <View style={[styles.miniModalHeader, { borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb' }]}>
              <Text style={[styles.miniModalTitle, { color: isDarkMode ? '#ffffff' : '#111827' }]}>Select VLAN</Text>
              <Pressable onPress={() => setIsVlanMiniModalVisible(false)} style={styles.miniModalClose}>
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
                  placeholder="Search VLAN..."
                  value={vlanSearch}
                  onChangeText={setVlanSearch}
                  placeholderTextColor={isDarkMode ? '#9CA3AF' : '#4B5563'}
                  style={[styles.searchInput, { color: isDarkMode ? '#ffffff' : '#111827' }]}
                  autoFocus={isVlanMiniModalVisible}
                />
                {vlanSearch.length > 0 && (
                  <Pressable onPress={() => setVlanSearch('')}>
                    <X size={18} color={isDarkMode ? '#9CA3AF' : '#4B5563'} />
                  </Pressable>
                )}
              </View>
            </View>
            <View style={{ height: 350, width: '100%' }}>
              <FlashList
                data={filteredVlans}
                extraData={{ selectedValue: formData.vlan, onPress: handleVlanItemPress, isDarkMode, primaryColor: colorPalette?.primary || '#7c3aed' }}
                // @ts-ignore
                estimatedItemSize={60}
                keyExtractor={(item, index) => index.toString()}
                ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
                renderItem={({ item, extraData }) => (
                  <MiniModalItem
                    label={item}
                    isSelected={extraData.selectedValue === item}
                    onPress={extraData.onPress}
                    isDarkMode={extraData.isDarkMode}
                    primaryColor={extraData.primaryColor}
                  />
                )}
                ListEmptyComponent={
                  <View style={styles.miniModalEmpty}>
                    <Text style={{ color: isDarkMode ? '#9CA3AF' : '#4B5563', fontSize: 16 }}>No results found</Text>
                  </View>
                }
                contentContainerStyle={{ paddingHorizontal: 40, paddingBottom: 20 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── Technician Mini Modal ──────────────────────────────────── */}
      <Modal
        visible={isTechMiniModalVisible}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={() => setIsTechMiniModalVisible(false)}
      >
        <View style={styles.miniModalOverlay}>
          <View style={[styles.miniModalContent, { backgroundColor: isDarkMode ? '#1f2937' : '#ffffff' }]}>
            <View style={[styles.miniModalHeader, { borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb' }]}>
              <Text style={[styles.miniModalTitle, { color: isDarkMode ? '#ffffff' : '#111827' }]}>
                {activeTechField === 'visit_by' ? 'Select Visit By' : activeTechField === 'visit_with' ? 'Select Visit With' : 'Select Visit With (Other)'}
              </Text>
              <Pressable onPress={() => setIsTechMiniModalVisible(false)} style={styles.miniModalClose}>
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
                  placeholder="Search Technician..."
                  value={techSearch}
                  onChangeText={setTechSearch}
                  placeholderTextColor={isDarkMode ? '#9CA3AF' : '#4B5563'}
                  style={[styles.searchInput, { color: isDarkMode ? '#ffffff' : '#111827' }]}
                  autoFocus={isTechMiniModalVisible}
                />
                {techSearch.length > 0 && (
                  <Pressable onPress={() => setTechSearch('')}>
                    <X size={18} color={isDarkMode ? '#9CA3AF' : '#4B5563'} />
                  </Pressable>
                )}
              </View>
            </View>
            <View style={{ height: 350, width: '100%' }}>
              <FlashList
                data={filteredTechs}
                extraData={{ selectedValue: activeTechField ? formData[activeTechField] : '', onPress: handleTechItemPress, isDarkMode, primaryColor: colorPalette?.primary || '#7c3aed' }}
                // @ts-ignore
                estimatedItemSize={60}
                keyExtractor={(item, index) => item.email || index.toString()}
                ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
                renderItem={({ item, extraData }) => (
                  <MiniModalItem
                    label={item.name}
                    isSelected={extraData.selectedValue === item.name}
                    onPress={extraData.onPress}
                    isDarkMode={extraData.isDarkMode}
                    primaryColor={extraData.primaryColor}
                  />
                )}
                ListEmptyComponent={
                  <View style={styles.miniModalEmpty}>
                    <Text style={{ color: isDarkMode ? '#9CA3AF' : '#4B5563', fontSize: 16 }}>No results found</Text>
                  </View>
                }
                contentContainerStyle={{ paddingHorizontal: 40, paddingBottom: 20 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── Main Form Modal ─────────────────────────────────────────── */}
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
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View style={[styles.modalContainer, { backgroundColor: isDarkMode ? '#111827' : '#f9fafb' }]}>
            <View style={[styles.header, {
              backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
              borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb',
              position: 'relative',
              justifyContent: 'center',
              height: 60,
              paddingHorizontal: 0
            }]}>
              <Pressable
                onPress={onClose}
                disabled={loading}
                style={[styles.cancelButton, {
                  position: 'absolute',
                  left: 16,
                  zIndex: 10,
                  borderColor: loading ? (isDarkMode ? '#374151' : '#e5e7eb') : (colorPalette?.primary || '#7c3aed'),
                  opacity: loading ? 0.6 : 1
                }]}
              >
                <Text style={[styles.cancelButtonText, {
                  color: loading ? (isDarkMode ? '#4b5563' : '#9ca3af') : (colorPalette?.primary || '#7c3aed')
                }]}>Cancel</Text>
              </Pressable>

              <View style={{
                position: 'absolute',
                left: 100,
                right: 100,
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Text
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={[styles.headerTitle, {
                    color: isDarkMode ? '#ffffff' : '#111827',
                    textAlign: 'center',
                    fontSize: 18
                  }]}
                >
                  {fullName}
                </Text>
              </View>

              <View style={{
                position: 'absolute',
                right: 16,
                zIndex: 10
              }}>
                <Pressable
                  onPress={handleSave}
                  disabled={loading}
                  style={[styles.submitButton, {
                    backgroundColor: loading ? (isDarkMode ? '#4b5563' : '#9ca3af') : (colorPalette?.primary || '#7c3aed'),
                    paddingVertical: 8,
                    paddingHorizontal: 16
                  }]}
                >
                  <Text style={styles.submitButtonText}>{loading ? `Submitting${submittingDots}` : 'Submit'}</Text>
                </Pressable>
              </View>
            </View>

            <View style={[styles.contentContainer, { flex: 1 }]}>
              {!isContentReady ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }}>
                  <ActivityIndicator size="large" color={colorPalette?.primary || '#7c3aed'} />
                  <Text style={{ color: isDarkMode ? '#9ca3af' : '#6b7280', marginTop: 12, fontSize: 14 }}>Loading form...</Text>
                </View>
              ) : (
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
                        <TextInput
                          value={formData.choosePlan}
                          editable={false}
                          placeholderTextColor={isDarkMode ? '#9CA3AF' : '#4B5563'}
                          style={[styles.textInput, {
                            opacity: 0.75,
                            backgroundColor: isDarkMode ? '#374151' : '#f3f4f6',
                            borderColor: errors.choosePlan ? '#ef4444' : (isDarkMode ? '#4b5563' : '#d1d5db'),
                            color: isDarkMode ? '#d1d5db' : '#4b5563'
                          }]}
                        />
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


                    {formData.onsiteStatus === 'Done' && (isDoneRendering ? (
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
                            <Pressable
                              onPress={() => setIsUsageTypeMiniModalVisible(true)}
                              style={[styles.searchContainer, {
                                backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                                borderColor: errors.usageType ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db'),
                                paddingVertical: 12
                              }]}
                            >
                              <Search size={18} color={isDarkMode ? '#9CA3AF' : '#4B5563'} />
                              <Text style={{
                                flex: 1,
                                paddingHorizontal: 12,
                                color: formData.usageType ? (isDarkMode ? '#ffffff' : '#111827') : (isDarkMode ? '#9CA3AF' : '#4B5563'),
                                fontSize: 14
                              }}>
                                {formData.usageType || "Select Usage Type..."}
                              </Text>
                              <ChevronDown size={18} color={isDarkMode ? '#9CA3AF' : '#4B5563'} />
                            </Pressable>
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
                                <Pressable
                                  onPress={() => setIsPortMiniModalVisible(true)}
                                  style={[styles.searchContainer, {
                                    backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                                    borderColor: errors.port ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db'),
                                    paddingVertical: 12
                                  }]}
                                >
                                  <Search size={18} color={isDarkMode ? '#9CA3AF' : '#4B5563'} />
                                  <Text style={{
                                    flex: 1,
                                    paddingHorizontal: 12,
                                    color: formData.port ? (isDarkMode ? '#ffffff' : '#111827') : (isDarkMode ? '#9CA3AF' : '#4B5563'),
                                    fontSize: 14
                                  }}>
                                    {formData.port || "Select PORT..."}
                                  </Text>
                                  <ChevronDown size={18} color={isDarkMode ? '#9CA3AF' : '#4B5563'} />
                                </Pressable>
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
                                <Pressable
                                  onPress={() => setIsVlanMiniModalVisible(true)}
                                  style={[styles.searchContainer, {
                                    backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                                    borderColor: errors.vlan ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db'),
                                    paddingVertical: 12
                                  }]}
                                >
                                  <Search size={18} color={isDarkMode ? '#9CA3AF' : '#4B5563'} />
                                  <Text style={{
                                    flex: 1,
                                    paddingHorizontal: 12,
                                    color: formData.vlan ? (isDarkMode ? '#ffffff' : '#111827') : (isDarkMode ? '#9CA3AF' : '#4B5563'),
                                    fontSize: 14
                                  }}>
                                    {formData.vlan || "Select VLAN..."}
                                  </Text>
                                  <ChevronDown size={18} color={isDarkMode ? '#9CA3AF' : '#4B5563'} />
                                </Pressable>
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
                            <Pressable
                              onPress={() => {
                                setActiveTechField('visit_by');
                                setIsTechMiniModalVisible(true);
                              }}
                              style={[styles.searchContainer, {
                                backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                                borderColor: errors.visit_by ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db'),
                                paddingVertical: 12
                              }]}
                            >
                              <Search size={18} color={isDarkMode ? '#9CA3AF' : '#4B5563'} />
                              <Text style={{
                                flex: 1,
                                paddingHorizontal: 12,
                                color: formData.visit_by ? (isDarkMode ? '#ffffff' : '#111827') : (isDarkMode ? '#9CA3AF' : '#4B5563'),
                                fontSize: 14
                              }}>
                                {formData.visit_by || "Select Visit By..."}
                              </Text>
                              <ChevronDown size={18} color={isDarkMode ? '#9CA3AF' : '#4B5563'} />
                            </Pressable>
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
                            <Pressable
                              onPress={() => {
                                setActiveTechField('visit_with');
                                setIsTechMiniModalVisible(true);
                              }}
                              style={[styles.searchContainer, {
                                backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                                borderColor: errors.visit_with ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db'),
                                paddingVertical: 12
                              }]}
                            >
                              <Search size={18} color={isDarkMode ? '#9CA3AF' : '#4B5563'} />
                              <Text style={{
                                flex: 1,
                                paddingHorizontal: 12,
                                color: formData.visit_with ? (isDarkMode ? '#ffffff' : '#111827') : (isDarkMode ? '#9CA3AF' : '#4B5563'),
                                fontSize: 14
                              }}>
                                {formData.visit_with || "Select Visit With..."}
                              </Text>
                              <ChevronDown size={18} color={isDarkMode ? '#9CA3AF' : '#4B5563'} />
                            </Pressable>
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
                            <Pressable
                              onPress={() => {
                                setActiveTechField('visit_with_other');
                                setIsTechMiniModalVisible(true);
                              }}
                              style={[styles.searchContainer, {
                                backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                                borderColor: errors.visit_with_other ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db'),
                                paddingVertical: 12
                              }]}
                            >
                              <Search size={18} color={isDarkMode ? '#9CA3AF' : '#4B5563'} />
                              <Text style={{
                                flex: 1,
                                paddingHorizontal: 12,
                                color: formData.visit_with_other ? (isDarkMode ? '#ffffff' : '#111827') : (isDarkMode ? '#9CA3AF' : '#4B5563'),
                                fontSize: 14
                              }}>
                                {formData.visit_with_other || "Visit With(Other)..."}
                              </Text>
                              <ChevronDown size={18} color={isDarkMode ? '#9CA3AF' : '#4B5563'} />
                            </Pressable>
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
                          label="Box Reading Image *"
                          onUpload={(file) => handleImageUpload('boxReadingImage', file)}
                          error={errors.boxReadingImage}
                          colorPrimary={colorPalette?.primary || '#7c3aed'}
                        />

                        <ImagePreview
                          imageUrl={imagePreviews.routerReadingImage}
                          label="Router Reading Image *"
                          onUpload={(file) => handleImageUpload('routerReadingImage', file)}
                          error={errors.routerReadingImage}
                          colorPrimary={colorPalette?.primary || '#7c3aed'}
                        />

                        {(formData.connectionType === 'Antenna' || formData.connectionType === 'Local') && (
                          <ImagePreview
                            imageUrl={imagePreviews.portLabelImage}
                            label="Port Label Image *"
                            onUpload={(file) => handleImageUpload('portLabelImage', file)}
                            error={errors.portLabelImage}
                            colorPrimary={colorPalette?.primary || '#7c3aed'}
                          />
                        )}

                        <ImagePreview
                          imageUrl={imagePreviews.setupImage}
                          label="Setup Image *"
                          onUpload={(file) => handleImageUpload('setupImage', file)}
                          error={errors.setupImage}
                          colorPrimary={colorPalette?.primary || '#7c3aed'}
                        />

                        <ImagePreview
                          imageUrl={imagePreviews.signedContractImage}
                          label="Signed Contract Image *"
                          onUpload={(file) => handleImageUpload('signedContractImage', file)}
                          error={errors.signedContractImage}
                          colorPrimary={colorPalette?.primary || '#7c3aed'}
                        />

                        <View style={styles.inputGroup}>
                          <Text style={[styles.label, { color: isDarkMode ? '#d1d5db' : '#374151' }]}>
                            Client Signature Image<Text style={styles.required}>*</Text>
                          </Text>
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
                            <View style={[styles.signatureCanvasContainer, { borderColor: isDarkMode ? '#374151' : '#d1d5db', flexDirection: 'column' }]}>
                              <View style={{ flex: 1 }}>
                                <SignatureScreen
                                  ref={signatureRef}
                                  onOK={handleSignatureOK}
                                  onEmpty={() => Alert.alert('Empty', 'Please provide a signature before saving')}
                                  onBegin={() => setScrollEnabled(false)}
                                  onEnd={() => setScrollEnabled(true)}
                                  webStyle={`.m-signature-pad--footer {display: none;} .m-signature-pad {box-shadow: none; border: none;} .m-signature-pad--body {border: none;} body,html {width: 100%; height: 100%; margin: 0; padding: 0;}`}
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
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, borderTopWidth: 1, borderColor: isDarkMode ? '#4b5563' : '#e5e7eb', backgroundColor: isDarkMode ? '#374151' : '#f9fafb' }}>
                                <Pressable onPress={() => signatureRef.current?.clearSignature()} style={{ padding: 8 }}>
                                  <Text style={{ color: '#ef4444', fontWeight: 'bold' }}>Clear</Text>
                                </Pressable>
                                <Pressable onPress={() => signatureRef.current?.readSignature()} style={{ paddingVertical: 8, paddingHorizontal: 16, backgroundColor: '#10b981', borderRadius: 6 }}>
                                  <Text style={{ color: 'white', fontWeight: 'bold' }}>Save</Text>
                                </Pressable>
                              </View>
                            </View>
                          )}
                          {errors.clientSignatureImage && (
                            <Text style={[styles.errorText, { color: '#ef4444', marginTop: 4 }]}>{errors.clientSignatureImage}</Text>
                          )}
                        </View>

                        <ImagePreview
                          imageUrl={imagePreviews.speedTestImage}
                          label="Speed Test Image *"
                          onUpload={(file) => handleImageUpload('speedTestImage', file)}
                          error={errors.speedTestImage}
                          colorPrimary={colorPalette?.primary || '#7c3aed'}
                        />

                        <View style={styles.inputGroup}>
                          <Text style={[styles.label, { color: isDarkMode ? '#d1d5db' : '#374151' }]}>
                            Items<Text style={styles.required}>*</Text>
                          </Text>
                          {orderItems.map((item, index) => (
                            <View
                              key={index}
                              style={styles.itemRow}
                            >
                              <View style={styles.itemRowContent}>
                                <View style={styles.itemSearchContainer}>
                                  {/* Item trigger button — same pattern as LCP-NAP */}
                                  <Pressable
                                    onPress={() => {
                                      setActiveItemIndex(index);
                                      setItemSearchModal('');
                                      setIsItemMiniModalVisible(true);
                                    }}
                                    style={[styles.searchContainer, {
                                      backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                                      borderColor: errors[`item_${index}`] ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db'),
                                      paddingVertical: 12
                                    }]}
                                  >
                                    <Search size={18} color={isDarkMode ? '#9CA3AF' : '#4B5563'} />
                                    <Text style={[styles.searchInput, {
                                      color: item.itemId ? (isDarkMode ? '#ffffff' : '#111827') : (isDarkMode ? '#9CA3AF' : '#4B5563')
                                    }]}>
                                      {item.itemId || `Select Item ${index + 1}...`}
                                    </Text>
                                    {item.itemId ? (
                                      <Pressable
                                        onPress={() => {
                                          handleItemChange(index, 'itemId', '');
                                        }}
                                        style={{ padding: 4 }}
                                        hitSlop={8}
                                      >
                                        <X size={18} color={isDarkMode ? '#9CA3AF' : '#4B5563'} />
                                      </Pressable>
                                    ) : (
                                      <ChevronDown size={18} color={isDarkMode ? '#9CA3AF' : '#4B5563'} />
                                    )}
                                  </Pressable>
                                  {errors[`item_${index}`] && (
                                    <Text style={[styles.errorText, { color: colorPalette?.primary || '#7c3aed', marginTop: 4 }]}>{errors[`item_${index}`]}</Text>
                                  )}
                                </View>

                                {item.itemId && item.itemId !== 'None' && (
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
                    ) : (
                      <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                        <ActivityIndicator size="small" color={colorPalette?.primary || '#7c3aed'} />
                        <Text style={{ marginTop: 8, color: isDarkMode ? '#9ca3af' : '#6b7280', fontSize: 12 }}>Preparing technical fields...</Text>
                      </View>
                    ))}

                    {(formData.onsiteStatus === 'Failed' || formData.onsiteStatus === 'Reschedule') && (
                      <View style={styles.inputGroup}>
                          <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: isDarkMode ? '#d1d5db' : '#374151' }]}>
                              Visit By<Text style={styles.required}>*</Text>
                            </Text>
                            <View>
                              <Pressable
                                onPress={() => {
                                  setActiveTechField('visit_by');
                                  setIsTechMiniModalVisible(true);
                                }}
                                style={[styles.searchContainer, {
                                  backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                                  borderColor: errors.visit_by ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db'),
                                  paddingVertical: 12
                                }]}
                              >
                                <Search size={18} color={isDarkMode ? '#9CA3AF' : '#4B5563'} />
                                <Text style={{
                                  flex: 1,
                                  paddingHorizontal: 12,
                                  color: formData.visit_by ? (isDarkMode ? '#ffffff' : '#111827') : (isDarkMode ? '#9CA3AF' : '#4B5563'),
                                  fontSize: 14
                                }}>
                                  {formData.visit_by || "Select Visit By..."}
                                </Text>
                                <ChevronDown size={18} color={isDarkMode ? '#9CA3AF' : '#4B5563'} />
                              </Pressable>
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
                              <Pressable
                                onPress={() => {
                                  setActiveTechField('visit_with');
                                  setIsTechMiniModalVisible(true);
                                }}
                                style={[styles.searchContainer, {
                                  backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                                  borderColor: errors.visit_with ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db'),
                                  paddingVertical: 12
                                }]}
                              >
                                <Search size={18} color={isDarkMode ? '#9CA3AF' : '#4B5563'} />
                                <Text style={{
                                  flex: 1,
                                  paddingHorizontal: 12,
                                  color: formData.visit_with ? (isDarkMode ? '#ffffff' : '#111827') : (isDarkMode ? '#9CA3AF' : '#4B5563'),
                                  fontSize: 14
                                }}>
                                  {formData.visit_with || "Select Visit With..."}
                                </Text>
                                <ChevronDown size={18} color={isDarkMode ? '#9CA3AF' : '#4B5563'} />
                              </Pressable>
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
                              <Pressable
                                onPress={() => {
                                  setActiveTechField('visit_with_other');
                                  setIsTechMiniModalVisible(true);
                                }}
                                style={[styles.searchContainer, {
                                  backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                                  borderColor: errors.visit_with_other ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db'),
                                  paddingVertical: 12
                                }]}
                              >
                                <Search size={18} color={isDarkMode ? '#9CA3AF' : '#4B5563'} />
                                <Text style={{
                                  flex: 1,
                                  paddingHorizontal: 12,
                                  color: formData.visit_with_other ? (isDarkMode ? '#ffffff' : '#111827') : (isDarkMode ? '#9CA3AF' : '#4B5563'),
                                  fontSize: 14
                                }}>
                                  {formData.visit_with_other || "Visit With(Other)..."}
                                </Text>
                                <ChevronDown size={18} color={isDarkMode ? '#9CA3AF' : '#4B5563'} />
                              </Pressable>
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

                        <ImagePreview
                          imageUrl={imagePreviews.proofImage}
                          label="Proof Image"
                          onUpload={(file) => handleImageUpload('proofImage', file)}
                          error={errors.proofImage}
                          colorPrimary={colorPalette?.primary || '#7c3aed'}
                        />
                      </View>
                    )}
                  </View>
                </ScrollView>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
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
    paddingBottom: 100,
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
