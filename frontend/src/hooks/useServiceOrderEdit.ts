import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Alert, Keyboard, InteractionManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as ExpoFileSystem from 'expo-file-system/legacy';
import apiClient from '../config/api';
import { getAllInventoryItems, InventoryItem } from '../services/inventoryItemService';
import { createServiceOrderItems, ServiceOrderItem } from '../services/serviceOrderItemService';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';
import { concernService, Concern } from '../services/concernService';
import { getUsedPorts } from '../services/portService';
import { getAllLCPNAPs, LCPNAP } from '../services/lcpnapService';
import { technicianService } from '../services/technicianService';


export interface UserData {
  email?: string;
  email_address?: string;
  role?: string | { role_name: string };
  role_id?: number;
  first_name?: string;
  last_name?: string;
  username?: string;
}

export interface OrderItem {
  itemId: string;
  quantity: string;
}

export interface ServiceOrderEditFormData {
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
  proofImage: string;
}

export interface ImageFiles {
  timeInFile: ImagePicker.ImagePickerAsset | null;
  modemSetupFile: ImagePicker.ImagePickerAsset | null;
  timeOutFile: ImagePicker.ImagePickerAsset | null;
  clientSignatureFile: ImagePicker.ImagePickerAsset | null;
  proofImageFile: ImagePicker.ImagePickerAsset | null;
}

export const useServiceOrderEdit = (isOpen: boolean, serviceOrderData: any, onClose: () => void, onSave: (data: any) => void) => {
  const serviceOrderId = serviceOrderData?.id;
  const isMountedRef = useRef(true);
  const openCycleRef = useRef(0);
  const signatureRef = useRef<any>(null);
  const initialDataLoadedRef = useRef(false);

  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [isContentReady, setIsContentReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [isDrawingSignature, setIsDrawingSignature] = useState(false);
  const [loadingPercentage, setLoadingPercentage] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [showLoadingModal, setShowLoadingModal] = useState(false);

  // Data Lists
  const [technicians, setTechnicians] = useState<Array<{ name: string; email: string }>>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [routerModels, setRouterModels] = useState<any[]>([]);
  const [lcpnaps, setLcpnaps] = useState<LCPNAP[]>([]);
  const [vlans, setVlans] = useState<string[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [concerns, setConcerns] = useState<Concern[]>([]);
  const [usedPorts, setUsedPorts] = useState<string[]>([]);
  const [totalPorts, setTotalPorts] = useState<number>(32);

  const [orderItems, setOrderItems] = useState<OrderItem[]>([{ itemId: '', quantity: '' }]);
  const [formData, setFormData] = useState<ServiceOrderEditFormData>(initialFormState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [imageFiles, setImageFiles] = useState<ImageFiles>({
    timeInFile: null,
    modemSetupFile: null,
    timeOutFile: null,
    clientSignatureFile: null,
    proofImageFile: null
  });

  // Active Picker State
  const [activePicker, setActivePicker] = useState<string | null>(null);
  const [searchQueries, setSearchQueries] = useState<Record<string, string>>({});
  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);
  const [activeTechField, setActiveTechField] = useState<'visitBy' | 'visitWith' | 'visitWithOther' | null>(null);

  const currentUserEmail = currentUser?.email_address || currentUser?.email || 'unknown@ampere.com';
  const isTechnician = useMemo(() => {
    if (!currentUser) return false;
    const role = typeof currentUser.role === 'string' ? currentUser.role : currentUser.role?.role_name || '';
    return currentUser.role_id === 2 || role.toLowerCase() === 'technician';
  }, [currentUser]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // Initialization
  useEffect(() => {
    if (isOpen) {
      initialDataLoadedRef.current = false;
      const handle = InteractionManager.runAfterInteractions(() => {
        if (isMountedRef.current) setIsContentReady(true);
      });
      const safetyTimeout = setTimeout(() => {
        if (isMountedRef.current) setIsContentReady(true);
      }, 300);
      return () => { handle.cancel(); clearTimeout(safetyTimeout); };
    } else {
      setIsContentReady(false);
      initialDataLoadedRef.current = false;
      setActivePicker(null);
      setSearchQueries({});
    }
  }, [isOpen]);

  // Load Settings
  useEffect(() => {
    let cancelled = false;
    const loadSettings = async () => {
      const [authResult, paletteResult] = await Promise.allSettled([
        AsyncStorage.getItem('authData'),
        settingsColorPaletteService.getActive(),
      ]);
      if (cancelled) return;
      if (authResult.status === 'fulfilled' && authResult.value) {
        try { setCurrentUser(JSON.parse(authResult.value)); } catch (error) {}
      }
      if (paletteResult.status === 'fulfilled') setColorPalette(paletteResult.value);
    };
    loadSettings();
    return () => { cancelled = true; };
  }, []);

  // Sync Form Data
  useEffect(() => {
    if (serviceOrderData && isOpen) {
      setFormData(prev => ({
        ...prev,
        ...mapApiToForm(serviceOrderData),
        modifiedBy: currentUserEmail
      }));
    }
  }, [serviceOrderData, isOpen, currentUserEmail]);

  // Main Data Fetching
  useEffect(() => {
    if (!isOpen) return;
    openCycleRef.current += 1;
    const session = openCycleRef.current;
    const controller = new AbortController();

    const fetchAllData = async () => {
      const [invRes, techRes, detailsRes, concernRes] = await Promise.allSettled([
        getAllInventoryItems('', 1, 1000),
        technicianService.getAllTechnicians(),
        Promise.all([
          apiClient.get('/vlan', { signal: controller.signal }),
          getAllLCPNAPs('', 1, 1000),
          apiClient.get('/plans', { signal: controller.signal }),
        ]),
        concernService.getAllConcerns(),
      ]);

      if (!isMountedRef.current || openCycleRef.current !== session) return;

      if (invRes.status === 'fulfilled' && invRes.value.success) {
        setInventoryItems(invRes.value.data.filter((i: any) => String(i.category_id || i.Category_ID || i.categoryId || i.category) === '1'));
        setRouterModels(invRes.value.data
          .filter((i: any) => String(i.category_id || i.Category_ID || i.categoryId || i.category) === '11' && i.item_name)
          .map((i: any, idx: number) => ({ model: i.item_name, id: idx })));
      }

      if (techRes.status === 'fulfilled' && techRes.value.success && techRes.value.data) {
        setTechnicians((techRes.value.data as any[])
          .filter((u: any) => u.first_name || u.last_name)
          .map((u: any) => {
            const firstName = (u.first_name || '').trim();
            const middleInitial = u.middle_initial ? `${u.middle_initial.trim()}. ` : '';
            const lastName = (u.last_name || '').trim();
            const fullName = `${firstName} ${middleInitial}${lastName}`.trim();
            return {
              email: u.id.toString(), // Using id as the unique identifier
              name: fullName || 'Unknown Technician'
            };
          }));
      }

      if (detailsRes.status === 'fulfilled') {
        const [vRes, lRes, pRes] = detailsRes.value;
        if (vRes.data?.success) setVlans(vRes.data.data.map((i: any) => i.value).filter(Boolean));
        if (lRes.success) setLcpnaps(lRes.data);
        if (pRes.data?.success) setPlans(pRes.data.data.map((p: any) => ({ name: p.plan_name || p.name || '', price: p.price || 0 })));
      }

      if (concernRes.status === 'fulfilled') setConcerns(concernRes.value);
    };

    fetchAllData();
    return () => controller.abort();
  }, [isOpen]);

  // Fetch Order Items
  useEffect(() => {
    if (!isOpen || !serviceOrderId) return;
    const session = openCycleRef.current;
    
    const fetchItems = async () => {
      try {
        const res = await apiClient.get(`/service-order-items?service_order_id=${serviceOrderId}`);
        if (!isMountedRef.current || openCycleRef.current !== session) return;
        if (res.data?.success && Array.isArray(res.data.data)) {
          const unique = new Map();
          res.data.data.forEach((i: any) => {
            const key = i.item_name;
            const existing = unique.get(key) || { itemId: key, quantity: 0 };
            unique.set(key, { itemId: key, quantity: (parseInt(existing.quantity) + parseInt(i.quantity || 0)).toString() });
          });
          const formatted = Array.from(unique.values());
          formatted.push({ itemId: '', quantity: '' });
          setOrderItems(formatted);
        }
      } catch (e) {}
    };
    fetchItems();
  }, [isOpen, serviceOrderId]);

  // Used Ports
  useEffect(() => {
    if (!isOpen || !formData.newLcpnap) {
      setUsedPorts([]);
      return;
    }
    const session = openCycleRef.current;
    const fetchPorts = async () => {
      try {
        const lRes = await getAllLCPNAPs(formData.newLcpnap, 1, 1);
        if (!isMountedRef.current || openCycleRef.current !== session) return;
        if (lRes.success && lRes.data?.[0]) setTotalPorts(lRes.data[0].port_total || 32);
        
        const uRes = await getUsedPorts(formData.newLcpnap, undefined, formData.accountNo);
        if (!isMountedRef.current || openCycleRef.current !== session) return;
        if (uRes.success && uRes.data) setUsedPorts(uRes.data.used);
      } catch (e) {}
    };
    fetchPorts();
  }, [isOpen, formData.newLcpnap, formData.accountNo]);

  // Drafts
  useEffect(() => {
    if (!isOpen || !serviceOrderId || !initialDataLoadedRef.current) return;
    const t = setTimeout(async () => {
      try {
        await AsyncStorage.setItem(`serviceOrderDraft_${serviceOrderId}`, JSON.stringify(formData));
        await AsyncStorage.setItem(`serviceOrderItemsDraft_${serviceOrderId}`, JSON.stringify(orderItems));
      } catch (e) {}
    }, 1500);
    return () => clearTimeout(t);
  }, [formData, orderItems, isOpen, serviceOrderId]);

  useEffect(() => {
    if (!isOpen || !serviceOrderId) return;
    const session = openCycleRef.current;
    const t = setTimeout(async () => {
      try {
        const d = await AsyncStorage.getItem(`serviceOrderDraft_${serviceOrderId}`);
        const i = await AsyncStorage.getItem(`serviceOrderItemsDraft_${serviceOrderId}`);
        if (!isMountedRef.current || openCycleRef.current !== session) return;
        if (d) setFormData(prev => ({ ...prev, ...JSON.parse(d) }));
        if (i) setOrderItems(JSON.parse(i));
      } finally {
        if (isMountedRef.current && openCycleRef.current === session) initialDataLoadedRef.current = true;
      }
    }, 800);
    return () => clearTimeout(t);
  }, [isOpen, serviceOrderId]);

  // Handlers
  const handleInputChange = useCallback((field: keyof ServiceOrderEditFormData, value: string) => {
    let finalValue = value;
    if (field === 'routerModemSN' || field === 'newRouterModemSN') {
      finalValue = value.toUpperCase();
    }
    setFormData((prev: ServiceOrderEditFormData) => ({ 
      ...prev, 
      [field]: finalValue,
      ...( (field === 'newLcp' || field === 'newNap' || field === 'newLcpnap') ? { newPort: '' } : {} )
    }));
    setErrors(prev => (prev[field] ? { ...prev, [field]: '' } : prev));
  }, []);

  const handleImageUpload = (field: keyof ImageFiles, file: any) => {
    setImageFiles(prev => ({ ...prev, [field]: file }));
    setErrors(prev => (prev[field] ? { ...prev, [field]: '' } : prev));
  };

  const handleSignatureOK = async (signature: string) => {
    setIsDrawingSignature(false);
    setScrollEnabled(true);
    try {
      const path = `${(ExpoFileSystem as any).cacheDirectory}signature_${Date.now()}.png`;
      const base64Code = signature.replace('data:image/png;base64,', '');
      await (ExpoFileSystem as any).writeAsStringAsync(path, base64Code, { encoding: 'base64' });
      
      const file = {
        uri: path,
        name: `signature_${Date.now()}.png`,
        type: 'image/png',
        size: base64Code.length * 0.75 // Approximate size
      };

      setImageFiles(prev => ({ ...prev, clientSignatureFile: file as any }));
    } catch (e) {
      console.error('Error handling signature:', e);
      Alert.alert('Error', 'Failed to save signature');
    }
  };

  const handleItemChange = useCallback((index: number, field: keyof OrderItem, value: string) => {
    setOrderItems(prev => {
      const next = prev.map((item, i) => {
        if (i === index) {
          const updatedItem = { ...item, [field]: value };
          if (field === 'itemId' && value === 'None') {
            updatedItem.quantity = '';
          }
          return updatedItem;
        }
        return item;
      });
      if (field === 'itemId' && value && index === prev.length - 1) next.push({ itemId: '', quantity: '' });
      return next;
    });
  }, []);

  const handleSaveInternal = async () => {
    if (isDrawingSignature) { Alert.alert('Wait', 'Save signature pad first.'); return; }
    
    const finalData = { ...formData, modifiedBy: currentUserEmail, modifiedDate: new Date().toLocaleString() };
    setFormData(finalData);

    if (!validateForm(finalData, orderItems, imageFiles, usedPorts, setErrors)) {
      Alert.alert('Error', 'Check required fields.');
      return;
    }

    setLoading(true);
    setShowLoadingModal(true);
    setLoadingPercentage(0);
    setCurrentStep(0);
    setLoadingMessage('Initializing validation...');

    let progressInterval: NodeJS.Timeout | null = null;

    try {
      // Logic to determine if newRouterModemSN is visible
      const isNewModemSnVisible = finalData.visitStatus === 'Done' && (finalData.repairCategory === 'Migrate' || finalData.repairCategory === 'Replace Router');
      const modemSN = finalData.newRouterModemSN?.trim();

      if (isNewModemSnVisible && modemSN) {
        // Step 1: SmartOLT Validation
        if (finalData.connectionType === 'Fiber') {
          setLoadingMessage('Checking SN in SmartOLT...');
          setLoadingPercentage(10);
          try {
            const smartOltResponse = await apiClient.get('/smart-olt/validate-sn', { params: { sn: modemSN } });
            if (!smartOltResponse.data?.success) {
               throw new Error('sn not existing in smart olt');
            }
          } catch (error: any) {
            throw new Error(error.response?.data?.message || 'sn not existing in smart olt');
          }
        }
        
        setCurrentStep(1);
        setLoadingPercentage(20);
        await new Promise(resolve => setTimeout(resolve, 600));

        // Steps 2 & 3: Duplicate SN Check
        setLoadingMessage('Checking SN duplicate in Job Orders...');
        setLoadingPercentage(35);
        
        const duplicateResponse = await apiClient.get('/job-orders/validate-sn', {
          params: { sn: modemSN }
        });

        if (duplicateResponse.data && !duplicateResponse.data.success && (duplicateResponse.data as any).is_duplicate) {
          const source = (duplicateResponse.data as any).source;
          if (source === 'job_orders') {
            throw new Error((duplicateResponse.data as any).message || 'SN Duplicate Detected in Job Orders.');
          }
          
          setCurrentStep(2);
          setLoadingPercentage(50);
          setLoadingMessage('Checking SN duplicate in Technical Details...');
          await new Promise(resolve => setTimeout(resolve, 800));
          
          if (source === 'technical_details') {
            throw new Error((duplicateResponse.data as any).message || 'SN Duplicate Detected in Technical Details.');
          }
        }
        
        setCurrentStep(2);
        setLoadingPercentage(55);
        setLoadingMessage('Checking SN duplicate in Technical Details...');
        await new Promise(resolve => setTimeout(resolve, 800));
      } else {
        // Skip validation steps
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

      // Cleanup drafts
      await AsyncStorage.removeItem(`serviceOrderDraft_${serviceOrderId}`);
      await AsyncStorage.removeItem(`serviceOrderItemsDraft_${serviceOrderId}`);

      // Upload Images
      const uploaded: any = {};
      const fileKeyMap = { timeInFile: 'image1_url', modemSetupFile: 'image2_url', timeOutFile: 'image3_url', clientSignatureFile: 'client_signature_url', proofImageFile: 'proof_image_url' };
      for (const [fKey, aKey] of Object.entries(fileKeyMap)) {
        const asset = (imageFiles as any)[fKey];
        if (asset) {
          const fd = new FormData();
          fd.append('file', { uri: asset.uri, name: asset.uri.split('/').pop(), type: (asset as any).mimeType || 'image/png' } as any);
          const uRes = await apiClient.post('/google-drive/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
          if (uRes.data?.success) uploaded[aKey] = uRes.data.data.url;
        }
      }

      // Update SO
      const updatePayload = mapFormToApi(finalData, uploaded, currentUserEmail, serviceOrderData);
      const res = await apiClient.put(`/service-orders/${serviceOrderId}`, updatePayload);
      if (!res.data?.success) throw new Error(res.data?.message || 'Update failed');

      // Update Items
      const validItems = orderItems.filter(i => i.itemId && i.itemId.trim() !== '' && i.itemId !== 'None');
      if (validItems.length > 0) {
        try {
          const existing = await apiClient.get(`/service-order-items?service_order_id=${serviceOrderId}`);
          if (existing.data?.success) {
            for (const item of existing.data.data) await apiClient.delete(`/service-order-items/${item.id}`);
          }
        } catch(e){}
        await createServiceOrderItems(validItems.map(i => ({ service_order_id: parseInt(String(serviceOrderId)), item_name: i.itemId, quantity: parseInt(i.quantity) || 1 })));
      }

      if (progressInterval) clearInterval(progressInterval);
      setLoadingPercentage(100);
      await new Promise(resolve => setTimeout(resolve, 500));

      setLoading(false);
      setShowLoadingModal(false);
      onSave(finalData);
      Alert.alert('Success', 'Updated!');
      onClose();
    } catch (e: any) {
      if (progressInterval) clearInterval(progressInterval);
      setLoading(false);
      setShowLoadingModal(false);
      Alert.alert('Error', e.message);
    }
  };

  // Filtered Lists for Pickers
  const filtered = {
    inventory: useMemo(() => {
      const query = (searchQueries.inventory || '').toLowerCase();
      const list = inventoryItems.filter(i => i.item_name.toLowerCase().includes(query));
      return [{ id: 'none', item_name: 'None' } as any, ...list];
    }, [inventoryItems, searchQueries.inventory]),
    lcpnaps: useMemo(() => lcpnaps.filter(l => l.lcpnap_name.toLowerCase().includes((searchQueries.lcpnaps || '').toLowerCase())).slice(0, 50), [lcpnaps, searchQueries.lcpnaps]),
    routerModels: useMemo(() => routerModels.filter(r => r.model.toLowerCase().includes((searchQueries.routerModels || '').toLowerCase())).slice(0, 50), [routerModels, searchQueries.routerModels]),
    technicians: useMemo(() => {
      const query = (searchQueries.technician || '').toLowerCase();
      let list = technicians;
      if (activeTechField === 'visitBy') list = technicians.filter(t => t.name !== formData.visitWith && t.name !== formData.visitWithOther);
      else if (activeTechField === 'visitWith') list = technicians.filter(t => t.name !== formData.visitBy && t.name !== formData.visitWithOther);
      else if (activeTechField === 'visitWithOther') list = technicians.filter(t => t.name !== formData.visitBy && t.name !== formData.visitWith);
      
      const finalList = (activeTechField === 'visitWith' || activeTechField === 'visitWithOther') ? [{ name: 'None', email: '' }, ...list] : list;
      return finalList.filter(t => t.name.toLowerCase().includes(query));
    }, [technicians, searchQueries.technician, activeTechField, formData.visitBy, formData.visitWith, formData.visitWithOther]),
    supportStatuses: useMemo(() => ['Resolved', 'Failed', 'In Progress', 'For Visit'].filter(s => s.toLowerCase().includes((searchQueries.supportStatus || '').toLowerCase())), [searchQueries.supportStatus]),
    visitStatuses: useMemo(() => ['Done', 'In Progress', 'Failed', 'Reschedule'].filter(s => s.toLowerCase().includes((searchQueries.visitStatus || '').toLowerCase())), [searchQueries.visitStatus]),
    assignedEmails: useMemo(() => technicians.filter(t => t.name.toLowerCase().includes((searchQueries.assignedEmail || '').toLowerCase()) || t.email.toLowerCase().includes((searchQueries.assignedEmail || '').toLowerCase())), [technicians, searchQueries.assignedEmail]),
    repairCategories: useMemo(() => ['Fiber Relaying', 'Migrate', 'others', 'Pullout', 'Reboot/Reconfig Router', 'Relocate Router', 'Relocate', 'Replace Patch Cord', 'Replace Router', 'Resplice', 'Transfer LCP/NAP/PORT', 'Update Vlan'].filter(s => s.toLowerCase().includes((searchQueries.repairCategory || '').toLowerCase())), [searchQueries.repairCategory]),
    ports: useMemo(() => {
      const ports = Array.from({ length: totalPorts }, (_, i) => `P${(i + 1).toString().padStart(2, '0')}`);
      const available = ports.filter(p => !usedPorts.some(up => up.toUpperCase() === p.toUpperCase()));
      return available.filter(p => p.toLowerCase().includes((searchQueries.port || '').toLowerCase()));
    }, [totalPorts, usedPorts, searchQueries.port]),
    vlans: useMemo(() => vlans.filter(v => v.toLowerCase().includes((searchQueries.vlan || '').toLowerCase())), [vlans, searchQueries.vlan]),
    concerns: useMemo(() => concerns.filter(c => c.concern_name.toLowerCase().includes((searchQueries.concern || '').toLowerCase())), [concerns, searchQueries.concern]),
    plans: useMemo(() => plans.map(p => `${p.name} - ${parseFloat(p.price.toString())}`).filter(p => p.toLowerCase().includes((searchQueries.plan || '').toLowerCase())), [plans, searchQueries.plan]),
  };

  return {
    formData, setFormData, errors, setErrors, loading, isContentReady, colorPalette, isTechnician, currentUserEmail,
    handleInputChange, handleImageUpload, handleSave: handleSaveInternal,
    activePicker, setActivePicker, searchQueries, setSearchQueries, filtered,
    orderItems, setOrderItems, activeItemIndex, setActiveItemIndex, handleItemChange,
    imageFiles, isDrawingSignature, setIsDrawingSignature, signatureRef, handleSignatureOK, scrollEnabled, setScrollEnabled,
    activeTechField, setActiveTechField,
    loadingPercentage, loadingMessage, currentStep, showLoadingModal
  };
};

const initialFormState: ServiceOrderEditFormData = {
  accountNo: '', dateInstalled: '', fullName: '', contactNumber: '', emailAddress: '', plan: '', username: '', connectionType: '',
  routerModemSN: '', lcp: '', nap: '', port: '', vlan: '', supportStatus: 'In Progress', visitStatus: 'In Progress',
  repairCategory: '', visitBy: '', visitWith: '', visitWithOther: '', visitRemarks: '', clientSignature: '',
  itemName1: '', timeIn: '', modemSetupImage: '', timeOut: '', assignedEmail: '', concern: '', concernRemarks: '',
  modifiedBy: '', modifiedDate: '', supportRemarks: '', serviceCharge: '0.00', status: 'unused',
  newRouterModemSN: '', newLcp: '', newNap: '', newPort: '', newVlan: '', routerModel: '', newPlan: '', newLcpnap: '', fullAddress: '', proofImage: ''
};

const mapApiToForm = (d: any): Partial<ServiceOrderEditFormData> => {
  const normPort = (p: any) => { if (!p) return ''; const n = String(p).replace(/[^\d]/g, ''); return n ? `P${n.padStart(2, '0')}` : ''; };
  const formatDate = (s: string) => { if (!s) return ''; try { const d = new Date(s); return d.toISOString().split('T')[0]; } catch(e) { return s.split(' ')[0]; } };
  
  return {
    accountNo: d.accountNumber || d.account_no || '',
    dateInstalled: formatDate(d.dateInstalled || d.date_installed),
    fullName: d.fullName || d.full_name || '',
    contactNumber: d.contactNumber || d.contact_number || '',
    emailAddress: d.emailAddress || d.email_address || '',
    plan: d.plan || '',
    username: d.username || '',
    connectionType: d.connectionType || d.connection_type || '',
    routerModemSN: d.routerModemSN || d.router_modem_sn || '',
    lcp: d.lcp || '', nap: d.nap || '', port: normPort(d.port || d.PORT), vlan: d.vlan || '',
    supportStatus: (d.supportStatus || d.support_status) === 'Pending' ? 'In Progress' : (d.supportStatus || d.support_status || 'In Progress'),
    visitStatus: (d.visitStatus || d.visit_status) === 'Pending' ? 'In Progress' : (d.visitStatus || d.visit_status || 'In Progress'),
    repairCategory: d.repairCategory || d.repair_category || '',
    visitBy: d.visitBy || d.visit_by || '', visitWith: d.visitWith || d.visit_with || '', visitWithOther: d.visitWithOther || d.visit_with_other || '',
    visitRemarks: d.visitRemarks || d.visit_remarks || '', clientSignature: d.clientSignature || d.client_signature_url || d.client_signature || '',
    timeIn: d.timeIn || d.image1_url || d.time_in || '', modemSetupImage: d.modemSetupImage || d.image2_url || d.modem_setup_image || '',
    timeOut: d.timeOut || d.image3_url || d.time_out || '', assignedEmail: d.assignedEmail || d.assigned_email || '', concern: d.concern || '',
    concernRemarks: d.concernRemarks || d.concern_remarks || '', supportRemarks: d.supportRemarks || d.support_remarks || '',
    newPlan: d.new_plan || '', serviceCharge: (d.serviceCharge || d.service_charge || '0.00').toString().replace('₱', '').trim(),
    status: d.status || 'unused', newRouterModemSN: d.newRouterModemSN || d.new_router_modem_sn || '',
    newLcp: d.newLcp || d.new_lcp || '', newNap: d.newNap || d.new_nap || '', newPort: normPort(d.newPort || d.new_port),
    newVlan: d.newVlan || d.new_vlan || '', routerModel: d.routerModel || d.router_model || '',
    newLcpnap: d.newLcpnap || d.new_lcpnap || '', fullAddress: d.fullAddress || d.full_address || '', proofImage: d.proofImage || d.proof_image_url || d.proof_image || ''
  };
};

const mapFormToApi = (f: ServiceOrderEditFormData, uploads: any, user: string, original: any) => ({
  account_no: f.accountNo, support_status: f.supportStatus, visit_status: f.visitStatus, repair_category: f.repairCategory,
  visit_by_user: f.visitBy, visit_with: f.visitWith, visit_with_other: f.visitWithOther, visit_remarks: f.visitRemarks,
  client_signature_url: uploads.client_signature_url || f.clientSignature || '', image1_url: uploads.image1_url || f.timeIn,
  image2_url: uploads.image2_url || f.modemSetupImage, image3_url: uploads.image3_url || f.timeOut, proof_image_url: uploads.proof_image_url || f.proofImage || '',
  assigned_email: f.assignedEmail, concern: f.concern, concern_remarks: f.concernRemarks, updated_by_user: user, support_remarks: f.supportRemarks,
  service_charge: parseFloat(f.serviceCharge), status: f.status, new_router_modem_sn: f.newRouterModemSN, new_lcp: f.newLcp, new_nap: f.newNap,
  new_lcpnap: f.newLcpnap, new_port: f.newPort, new_vlan: f.newVlan, router_model: f.routerModel, new_plan: f.newPlan,
  old_lcp: f.lcp, old_nap: f.nap, old_port: f.port, old_vlan: f.vlan, old_lcpnap: original?.old_lcpnap || original?.lcpnap || '',
  old_router_modem_sn: f.routerModemSN, end_time: new Date().toISOString().slice(0, 19).replace('T', ' ')
});

const validateForm = (f: ServiceOrderEditFormData, items: OrderItem[], images: ImageFiles, usedPorts: string[], setErrors: any) => {
  const e: Record<string, string> = {};
  if (!f.supportStatus) e.supportStatus = 'Required';
  if (!f.concern) e.concern = 'Required';
  if (f.concern === 'Upgrade/Downgrade Plan' && !f.newPlan) e.newPlan = 'Required';
  if (f.supportStatus === 'For Visit') {
    if (!f.assignedEmail) e.assignedEmail = 'Required';
    if (f.visitStatus === 'Done') {
      if (!items.some(i => i.itemId && i.quantity && i.itemId !== 'None') && !items.some(i => i.itemId === 'None')) e.items = 'Required item or "None"';
      if (!f.visitBy) e.visitBy = 'Required';
      const reloc = ['Migrate', 'Relocate', 'Transfer LCP/NAP/PORT'];
      if (reloc.includes(f.repairCategory)) {
        if (f.repairCategory === 'Migrate' && !f.newRouterModemSN) e.newRouterModemSN = 'Required';
        if (!f.newLcpnap) e.newLcpnap = 'Required';
        if (!f.newPort) e.newPort = 'Required';
        else if (usedPorts.some(p => p.toUpperCase() === f.newPort.toUpperCase())) e.newPort = 'Port taken';
        if (!['Relocate', 'Transfer LCP/NAP/PORT'].includes(f.repairCategory) && !f.routerModel) e.routerModel = 'Required';
      }
      if (f.repairCategory === 'Replace Router' && !f.newRouterModemSN) e.newRouterModemSN = 'Required';
      if (!f.timeIn && !images.timeInFile) e.timeInFile = 'Required';
      if (!f.modemSetupImage && !images.modemSetupFile) e.modemSetupFile = 'Required';
      if (!f.clientSignature && !images.clientSignatureFile) e.clientSignatureFile = 'Required';
    } else if (['Reschedule', 'Failed'].includes(f.visitStatus)) {
      if (!f.visitBy) e.visitBy = 'Required';
      if (!f.visitWith) e.visitWith = 'Required';
      if (!f.visitWithOther) e.visitWithOther = 'Required';
    }
  }
  if (f.supportStatus === 'Failed' || (f.supportStatus === 'For Visit' && f.visitStatus === 'Failed')) {
    if (!f.proofImage && !images.proofImageFile) e.proofImageFile = 'Required';
  }
  setErrors(e);
  return Object.keys(e).length === 0;
};
