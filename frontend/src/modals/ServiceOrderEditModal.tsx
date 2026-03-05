import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, TextInput, ScrollView, Modal, Pressable, Image, Alert, ActivityIndicator, Platform, KeyboardAvoidingView, Keyboard, StyleSheet, FlatList, InteractionManager } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { X, ChevronDown, Search, Check } from 'lucide-react-native';
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

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '95%',
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
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  saveButton: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
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
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  connectionTypeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  connectionTypeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  signatureContainer: {
    height: 160,
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
  signatureText: {
    fontSize: 14,
  },
  signatureImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  clearSignatureButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#ef4444',
    borderRadius: 6,
  },
  clearSignatureText: {
    color: '#ffffff',
    fontSize: 12,
  },
  signatureCanvasContainer: {
    height: 240,
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
  },
  itemRow: {
    zIndex: 10,
    marginBottom: 16,
  },
  itemRowContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  itemSearchContainer: {
    flex: 1,
    position: 'relative',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  itemSelectText: {
    fontSize: 16,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    zIndex: 999,
    overflow: 'hidden',
    elevation: 1000,
  },
  dropdownSearchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dropdownSearchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
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
  dropdownItemImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    resizeMode: 'cover',
  },
  dropdownSelectedIndicator: {
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
  itemQtyContainer: {
    width: 96,
  },
  itemRemoveButton: {
    padding: 12,
  },
  miniModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  miniModalContent_mini: {
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
  miniModalSearchInput: {
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 12,
  },
  miniModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
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

const ServiceOrderEditModal: React.FC<ServiceOrderEditModalProps> = ({
  isOpen,
  onClose,
  onSave,
  serviceOrderData
}) => {
  const serviceOrderId = serviceOrderData?.id;
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
  const [plans, setPlans] = useState<Array<{ name: string; price: string | number }>>([]);
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
  const [lcpnapSearch, setLcpnapSearch] = useState('');
  const [routerModelSearch, setRouterModelSearch] = useState('');
  const [isLcpnapMiniModalVisible, setIsLcpnapMiniModalVisible] = useState(false);
  const [isRouterModelMiniModalVisible, setIsRouterModelMiniModalVisible] = useState(false);
  const [openItemIndex, setOpenItemIndex] = useState<number | null>(null);

  // Deferred rendering: prevent heavy form from rendering on the same frame modal opens
  const [isContentReady, setIsContentReady] = useState(false);
  const initialDataLoadedRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      initialDataLoadedRef.current = false;
      const handle = InteractionManager.runAfterInteractions(() => {
        setIsContentReady(true);
      });
      return () => handle.cancel();
    } else {
      setIsContentReady(false);
      initialDataLoadedRef.current = false;
    }
  }, [isOpen]);

  // Load User Data and Theme - batched with Promise.allSettled
  useEffect(() => {
    let cancelled = false;
    const loadSettings = async () => {
      const [themeResult, authResult, paletteResult] = await Promise.allSettled([
        AsyncStorage.getItem('theme'),
        AsyncStorage.getItem('authData'),
        settingsColorPaletteService.getActive(),
      ]);
      if (cancelled) return;
      if (themeResult.status === 'fulfilled') {
        setIsDarkMode(themeResult.value !== 'light');
      }
      if (authResult.status === 'fulfilled' && authResult.value) {
        try {
          setCurrentUser(JSON.parse(authResult.value));
        } catch (error) {}
      }
      if (paletteResult.status === 'fulfilled') {
        setColorPalette(paletteResult.value);
      }
    };
    loadSettings();
    return () => { cancelled = true; };
  }, []);

  // Consolidated data fetching - all independent API calls batched into one effect
  // This prevents multiple simultaneous state update storms that crash the app
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    const fetchAllData = async () => {
      // Fire all independent API calls in parallel with Promise.allSettled
      // so one failure doesn't block the rest
      const [
        routerModelResult,
        inventoryResult,
        technicianResult,
        technicalDetailsResult,
        concernResult,
      ] = await Promise.allSettled([
        routerModelService.getAllRouterModels(),
        getAllInventoryItems(),
        apiClient.get<{ success: boolean; data: any[] }>('/users'),
        Promise.all([
          apiClient.get<{ success: boolean; data: any[] }>('/lcp'),
          apiClient.get<{ success: boolean; data: any[] }>('/nap'),
          apiClient.get<{ success: boolean; data: any[] }>('/vlan'),
          getAllLCPNAPs('', 1, 1000),
          apiClient.get<{ success: boolean; data: any[] }>('/plans'),
        ]),
        concernService.getAllConcerns(),
      ]);

      if (!isMounted) return;

      // Router Models
      if (routerModelResult.status === 'fulfilled') {
        setRouterModels(routerModelResult.value);
      } else {
        console.error('Failed to fetch router models:', routerModelResult.reason);
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
        if (response.data.success && Array.isArray(response.data.data)) {
          const technicianUsers = response.data.data
            .filter((user: any) => {
              const role = typeof user.role === 'string' ? user.role : (user.role as any)?.role_name || '';
              return role.toLowerCase() === 'technician';
            })
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
          setTechnicians(technicianUsers);
        }
      } else {
        console.error('Error fetching technicians:', technicianResult.reason);
      }

      // Technical Details (LCP, NAP, VLAN, LCPNAPs, Plans)
      if (technicalDetailsResult.status === 'fulfilled') {
        const [lcpResponse, napResponse, vlanResponse, lcpnapsRes, planResponse] = technicalDetailsResult.value;

        if (lcpResponse.data.success && Array.isArray(lcpResponse.data.data)) {
          const lcpOptions = lcpResponse.data.data.map((item: any) => item.lcp_name || item.lcp || item.name).filter(Boolean);
          setLcps(lcpOptions as string[]);
        }

        if (napResponse.data.success && Array.isArray(napResponse.data.data)) {
          const napOptions = napResponse.data.data.map((item: any) => item.nap_name || item.nap || item.name).filter(Boolean);
          setNaps(napOptions as string[]);
        }

        if (vlanResponse.data.success && Array.isArray(vlanResponse.data.data)) {
          const vlanOptions = vlanResponse.data.data.map((item: any) => item.value).filter(Boolean);
          setVlans(vlanOptions as string[]);
        }

        if (planResponse.data.success && Array.isArray(planResponse.data.data)) {
          setPlans(planResponse.data.data.map((p: any) => ({
            name: p.plan_name || p.name || '',
            price: p.price || 0
          })).filter((p: any) => p.name));
        }

        if (lcpnapsRes.success && Array.isArray(lcpnapsRes.data)) {
          setLcpnaps(lcpnapsRes.data);
        }
      } else {
        console.error('Error fetching technical details:', technicalDetailsResult.reason);
      }

      // Concerns
      if (concernResult.status === 'fulfilled') {
        setConcerns(concernResult.value);
      } else {
        console.error('Error fetching concerns:', concernResult.reason);
      }
    };

    fetchAllData();

    // Fetch service order items separately (depends on serviceOrderData)
    const fetchServiceOrderItems = async () => {
      if (serviceOrderData && serviceOrderId) {
        try {
          const response = await apiClient.get(`/service-order-items?service_order_id=${serviceOrderId}`);
          const data = response.data;

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
    };

    fetchServiceOrderItems();

    return () => {
      isMounted = false;
    };
  }, [isOpen, serviceOrderData]);




  // Used Ports Effect - separate because it depends on formData.newLcpnap
  useEffect(() => {
    if (!isOpen || !formData.newLcpnap) {
      setUsedPorts([]);
      setTotalPorts(32);
      return;
    }

    let isMounted = true;

    const fetchUsedPortsFunc = async () => {
      try {
        // Also fetch total ports for this LCP-NAP
        const lcpnapsRes = await getAllLCPNAPs(formData.newLcpnap, 1, 1);

        if (!isMounted) return;

        if (lcpnapsRes.success && Array.isArray(lcpnapsRes.data) && lcpnapsRes.data.length > 0) {
          const match = lcpnapsRes.data.find((item: any) => item.lcpnap_name === formData.newLcpnap);
          if (match) {
            setTotalPorts(match.port_total || 32);
          }
        }

        const usedRes = await getUsedPorts(formData.newLcpnap, serviceOrderId);

        if (!isMounted) return;

        if (usedRes.success && usedRes.data) {
          setUsedPorts(usedRes.data.used);
          if (!totalPorts) setTotalPorts(usedRes.data.total);
        } else {
          setUsedPorts([]);
          if (!totalPorts) setTotalPorts(32);
        }
      } catch (error) {
        console.error('Error fetching used ports/location:', error);
        if (isMounted) {
          setUsedPorts([]);
          setTotalPorts(32);
        }
      }
    };
    fetchUsedPortsFunc();

    return () => { isMounted = false; };
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

  // Save draft to AsyncStorage - debounced to prevent async storm on every keystroke
  useEffect(() => {
    if (!isOpen || !serviceOrderData || !serviceOrderId || !initialDataLoadedRef.current) return;

    const timer = setTimeout(async () => {
      try {
        await AsyncStorage.setItem(`serviceOrderDraft_${serviceOrderId}`, JSON.stringify(formData));
      } catch (error) {
        console.error('Failed to save draft:', error);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [formData, isOpen, serviceOrderData, serviceOrderId]);

  // Save order items draft - debounced
  useEffect(() => {
    if (!isOpen || !serviceOrderData || !serviceOrderId || !initialDataLoadedRef.current) return;

    const timer = setTimeout(async () => {
      try {
        await AsyncStorage.setItem(`serviceOrderItemsDraft_${serviceOrderId}`, JSON.stringify(orderItems));
      } catch (error) {
        console.error('Failed to save order items draft:', error);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [orderItems, isOpen, serviceOrderData, serviceOrderId]);

  // Load draft on open - runs after initial form data is set
  useEffect(() => {
    if (!isOpen || !serviceOrderData || !serviceOrderId) return;

    const timer = setTimeout(async () => {
      try {
        const savedDraft = await AsyncStorage.getItem(`serviceOrderDraft_${serviceOrderId}`);
        const savedItemsDraft = await AsyncStorage.getItem(`serviceOrderItemsDraft_${serviceOrderId}`);

        if (savedDraft) {
          const parsedDraft = JSON.parse(savedDraft);
          setFormData(prev => ({
            ...prev,
            ...parsedDraft
          }));
        }

        if (savedItemsDraft) {
          setOrderItems(JSON.parse(savedItemsDraft));
        }
      } catch (error) {
        console.error('Failed to load draft:', error);
      } finally {
        // Mark initial load done so draft saves can start
        initialDataLoadedRef.current = true;
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [isOpen, serviceOrderData, serviceOrderId]);

  const handleInputChange = useCallback((field: keyof ServiceOrderEditFormData, value: string) => {
    setFormData(prev => {
      const newState = { ...prev, [field]: value };
      if (field === 'newLcp' || field === 'newNap' || field === 'newLcpnap') {
        newState.newPort = '';
      }

      return newState;
    });
    setErrors(prev => {
      if (prev[field]) {
        return { ...prev, [field]: '' };
      }
      return prev;
    });
  }, []);

  const handleImageChange = useCallback(async (field: keyof ImageFiles) => {
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
  }, [errors]);

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

  const handleSignatureClear = useCallback(() => {
    if (signatureRef.current) {
      signatureRef.current.clearSignature();
    }
    setImageFiles(prev => ({ ...prev, clientSignatureFile: null }));
    setFormData(prev => ({ ...prev, clientSignature: '' }));
  }, []);

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
      // SmartOLT and Technical Details Validation
      if (updatedFormData.connectionType === 'Fiber') {
        // Validate New Router Modem SN if provided
        const isNewModemSnVisible = updatedFormData.visitStatus === 'Done' &&
          (updatedFormData.repairCategory === 'Migrate' || updatedFormData.repairCategory === 'Replace Router');

        if (isNewModemSnVisible && updatedFormData.newRouterModemSN?.trim()) {
          // 1. SmartOLT Validation Logic (Check if exists first)
          try {
            console.log('[SMARTOLT VALIDATION] Validating New Modem SN:', updatedFormData.newRouterModemSN);
            const smartOltResponse = await apiClient.get('/smart-olt/validate-sn', {
              params: { sn: updatedFormData.newRouterModemSN }
            });

            if (!(smartOltResponse.data as any).success) {
              setLoading(false);
              const errorMsg = 'sn not existing in smart olt';
              setErrors(prev => ({ ...prev, newRouterModemSN: errorMsg }));
              Alert.alert('SmartOLT Verification Failed', errorMsg);
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

          // 2. Duplicate SN Check (Technical Details)
          try {
            const duplicateResponse = await apiClient.get('/job-orders', {
              params: {
                search: updatedFormData.newRouterModemSN,
                limit: 50
              }
            });

            if (duplicateResponse.data && duplicateResponse.data.success && Array.isArray(duplicateResponse.data.data)) {
              const isDuplicate = duplicateResponse.data.data.some((jo: any) => {
                const joSN = jo.modem_sn || jo.Modem_SN || jo.modem_router_sn;
                return String(joSN || '').trim().toLowerCase() === updatedFormData.newRouterModemSN.trim().toLowerCase();
              });

              if (isDuplicate) {
                setLoading(false);
                const errorMessage = 'Please check on Customer Details. SN Duplicate Detected.';
                setErrors(prev => ({ ...prev, newRouterModemSN: errorMessage }));
                Alert.alert('Validation Error', errorMessage);
                return;
              }
            }
          } catch (error) {
            console.error('Error checking duplicate SN:', error);
          }
        }
      }

      // Clear drafts
      if (serviceOrderId) {
        try {
          await AsyncStorage.removeItem(`serviceOrderDraft_${serviceOrderId}`);
          await AsyncStorage.removeItem(`serviceOrderItemsDraft_${serviceOrderId}`);
        } catch (e) {
          console.error('Error clearing draft:', e);
        }
      }

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
          service_order_id: parseInt(String(serviceOrderId)),
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
        successMessage += '\n\nRADIUS account disabled for pullout and port cleared.';
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

  const handleItemChange = useCallback((index: number, field: keyof OrderItem, value: string) => {
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

  // Memoize filtered lists to prevent expensive re-computation on every render
  const filteredInventoryItems = useMemo(() =>
    inventoryItems.filter(invItem => invItem.item_name.toLowerCase().includes(itemSearch.toLowerCase())),
    [inventoryItems, itemSearch]
  );

  const visitByTechnicians = useMemo(() =>
    technicians.filter(t => t.name !== formData.visitWith && t.name !== formData.visitWithOther),
    [technicians, formData.visitWith, formData.visitWithOther]
  );

  const visitWithTechnicians = useMemo(() =>
    technicians.filter(t => t.name !== formData.visitBy && t.name !== formData.visitWithOther),
    [technicians, formData.visitBy, formData.visitWithOther]
  );

  const visitWithOtherTechnicians = useMemo(() =>
    technicians.filter(t => t.name !== formData.visitBy && t.name !== formData.visitWith),
    [technicians, formData.visitBy, formData.visitWith]
  );

  const failedVisitWithTechnicians = useMemo(() =>
    technicians.filter(t => t.name !== formData.visitBy),
    [technicians, formData.visitBy]
  );

  const filteredLcpnaps = useMemo(() => {
    const query = lcpnapSearch.toLowerCase();
    return lcpnaps
      .filter(ln => ln && ln.lcpnap_name && ln.lcpnap_name.toLowerCase().includes(query))
      .slice(0, 50);
  }, [lcpnaps, lcpnapSearch]);

  const filteredRouterModels = useMemo(() => {
    const query = routerModelSearch.toLowerCase();
    return routerModels
      .filter(rm => rm && rm.model && rm.model.toLowerCase().includes(query))
      .slice(0, 50);
  }, [routerModels, routerModelSearch]);

  // Memoize ports array to avoid recreating on every render
  const availablePorts = useMemo(() => {
    return Array.from({ length: totalPorts }, (_, i) => {
      return `P${(i + 1).toString().padStart(2, '0')}`;
    });
  }, [totalPorts]);

  // Render Helpers
  const activeColor = colorPalette?.primary || '#7c3aed';

  const renderLabel = (text: string, required = false) => (
    <Text style={[styles.label, { color: isDarkMode ? '#d1d5db' : '#374151' }]}>
      {text} {required && <Text style={styles.required}>*</Text>}
    </Text>
  );

  const renderInput = (
    field: keyof ServiceOrderEditFormData,
    placeholder: string,
    editable = true,
    keyboardType: 'default' | 'numeric' | 'email-address' = 'default'
  ) => (
    <View style={styles.inputGroup}>
      {renderLabel(placeholder.replace('Enter ', ''), !editable && field !== 'dateInstalled' ? false : true)}
      <TextInput
        style={[styles.textInput, {
          backgroundColor: !editable
            ? (isDarkMode ? '#374151' : '#f3f4f6')
            : (isDarkMode ? '#1f2937' : '#ffffff'),
          color: !editable
            ? (isDarkMode ? '#9ca3af' : '#6b7280')
            : (isDarkMode ? '#ffffff' : '#111827'),
          borderColor: errors[field] ? '#ef4444' : (!editable ? (isDarkMode ? '#4b5563' : '#e5e7eb') : (isDarkMode ? '#374151' : '#d1d5db'))
        }]}
        value={String(formData[field])}
        onChangeText={(text) => handleInputChange(field, text)}
        placeholder={placeholder}
        placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
        editable={editable}
        keyboardType={keyboardType}
      />
      {errors[field] && (
        <Text style={styles.errorText}>{errors[field]}</Text>
      )}
    </View>
  );

  const renderPicker = (
    field: keyof ServiceOrderEditFormData,
    items: string[],
    label: string,
    enabled = true
  ) => (
    <View style={styles.inputGroup}>
      {renderLabel(label)}
      <View style={[styles.pickerContainer, {
        borderColor: errors[field] ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db'),
        backgroundColor: isDarkMode ? '#1f2937' : '#ffffff'
      }]}>
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
      {errors[field] && (
        <Text style={styles.errorText}>{errors[field]}</Text>
      )}
    </View>
  );

  const renderLcpNapPicker = () => (
    <View style={styles.inputGroup}>
      {renderLabel('New LCP-NAP', true)}
      <Pressable
        onPress={() => {
          setIsLcpnapMiniModalVisible(true);
          setLcpnapSearch('');
        }}
        style={[styles.searchContainer, {
          backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
          borderColor: errors.newLcpnap ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db'),
          height: 50,
        }]}
      >
        <Search size={18} color={isDarkMode ? '#9CA3AF' : '#4B5563'} />
        <Text style={{
          flex: 1,
          paddingHorizontal: 12,
          color: formData.newLcpnap ? (isDarkMode ? '#ffffff' : '#111827') : (isDarkMode ? '#9ca3af' : '#6b7280'),
          fontSize: 16
        }}>
          {formData.newLcpnap || "Select LCP-NAP"}
        </Text>
        <ChevronDown size={18} color={isDarkMode ? '#9CA3AF' : '#4B5563'} />
      </Pressable>
      {errors.newLcpnap && (
        <Text style={styles.errorText}>{errors.newLcpnap}</Text>
      )}
    </View>
  );

  const renderNewPortPicker = () => {
    return (
      <View style={styles.inputGroup}>
        {renderLabel('New Port', true)}
        <View style={[styles.pickerContainer, {
          borderColor: errors.newPort ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db'),
          backgroundColor: isDarkMode ? '#1f2937' : '#ffffff'
        }]}>
          <Picker
            selectedValue={formData.newPort}
            onValueChange={(val) => handleInputChange('newPort', val)}
            dropdownIconColor={isDarkMode ? '#fff' : '#000'}
            style={{ color: isDarkMode ? '#fff' : '#000' }}
          >
            <Picker.Item label="Select Port" value="" color={isDarkMode ? '#9ca3af' : '#6b7280'} />
            {availablePorts.map((port) => {
              const isUsed = usedPorts.some(up => up.toUpperCase() === port.toUpperCase());
              const isSelected = formData.newPort.toUpperCase() === port.toUpperCase();
              if (isUsed && !isSelected) return null; // Hide used ports unless selected
              return <Picker.Item key={port} label={port} value={port} color={isDarkMode ? '#fff' : '#000'} />;
            })}
          </Picker>
        </View>
        {errors.newPort && (
          <Text style={styles.errorText}>{errors.newPort}</Text>
        )}
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={[styles.modalContent, { backgroundColor: isDarkMode ? '#111827' : '#f9fafb' }]}>

          {/* Header */}
          <View style={[styles.header, {
            backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
            borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb'
          }]}>
            <View style={styles.headerTitleContainer}>
              <Text style={[styles.headerTitle, { color: isDarkMode ? '#ffffff' : '#111827' }]}>
                {serviceOrderData?.ticket_id || serviceOrderData?.id} | {formData.fullName}
              </Text>
            </View>
            <View style={styles.headerActions}>
              <Pressable
                onPress={onClose}
                disabled={loading}
                style={[styles.cancelButton, {
                  borderColor: loading ? (isDarkMode ? '#374151' : '#e5e7eb') : activeColor,
                  opacity: loading ? 0.6 : 1
                }]}
              >
                <Text style={[styles.cancelButtonText, {
                  color: loading ? (isDarkMode ? '#4b5563' : '#9ca3af') : activeColor
                }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSave}
                disabled={loading}
                style={[styles.saveButton, { backgroundColor: loading ? (isDarkMode ? '#4b5563' : '#9ca3af') : activeColor }]}
              >
                {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveButtonText}>Save</Text>}
              </Pressable>
            </View>
          </View>

          <View style={styles.contentContainer}>
            {!isContentReady ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }}>
                <ActivityIndicator size="large" color={activeColor} />
                <Text style={{ color: isDarkMode ? '#9ca3af' : '#6b7280', marginTop: 12, fontSize: 14 }}>Loading form...</Text>
              </View>
            ) : (
            <ScrollView
              style={styles.contentContainer}
              contentContainerStyle={styles.scrollViewContent}
              scrollEnabled={scrollEnabled}
              keyboardShouldPersistTaps="handled"
              removeClippedSubviews={true}
            >
              <View style={styles.inputGroup}>

                {renderInput('accountNo', 'Account No', false)}
                {renderInput('dateInstalled', 'Date Installed', false)}

                {renderInput('fullName', 'Full Name', false)}
                {renderInput('contactNumber', 'Contact Number', false)}
                {renderInput('emailAddress', 'Email Address', false)}
                {renderInput('plan', 'Plan', false)}
                {renderInput('username', 'Username', false)}

                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: isDarkMode ? '#d1d5db' : '#374151' }]}>Full Address</Text>
                  <TextInput
                    value={formData.fullAddress}
                    editable={false}
                    multiline={true}
                    numberOfLines={2}
                    placeholderTextColor={isDarkMode ? '#9CA3AF' : '#4B5563'}
                    style={[styles.textInput, {
                      backgroundColor: isDarkMode ? '#374151' : '#f3f4f6',
                      borderColor: isDarkMode ? '#4b5563' : '#e5e7eb',
                      color: isDarkMode ? '#9ca3af' : '#6b7280',
                      textAlignVertical: 'top'
                    }]}
                  />
                </View>

                {/* Connection Type */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: isDarkMode ? '#d1d5db' : '#374151' }]}>Connection Type</Text>
                  <View style={styles.connectionTypeContainer}>
                    <Pressable
                      onPress={() => handleInputChange('connectionType', 'Fiber')}
                      style={[styles.connectionTypeButton, {
                        backgroundColor: formData.connectionType === 'Fiber' ? activeColor : (isDarkMode ? '#1f2937' : '#ffffff'),
                        borderColor: formData.connectionType === 'Fiber' ? activeColor : (isDarkMode ? '#374151' : '#d1d5db')
                      }]}
                    >
                      <Text style={{
                        color: formData.connectionType === 'Fiber' ? '#ffffff' : (isDarkMode ? '#ffffff' : '#000000'),
                        fontWeight: '500'
                      }}>Fiber</Text>
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

                    <View style={styles.inputGroup}>
                      {renderLabel('Assigned Email', true)}
                      <View style={[styles.pickerContainer, {
                        borderColor: errors.assignedEmail ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db'),
                        backgroundColor: isDarkMode ? '#1f2937' : '#ffffff'
                      }]}>
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
                      {errors.assignedEmail && (
                        <Text style={styles.errorText}>{errors.assignedEmail}</Text>
                      )}
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

                            {/* Router Model Selection */}
                            <View style={styles.inputGroup}>
                              {renderLabel('Router Model', true)}
                              <Pressable
                                onPress={() => {
                                  setIsRouterModelMiniModalVisible(true);
                                  setRouterModelSearch('');
                                }}
                                style={[styles.searchContainer, {
                                  backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                                  borderColor: errors.routerModel ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db'),
                                  height: 50,
                                }]}
                              >
                                <Search size={18} color={isDarkMode ? '#9CA3AF' : '#4B5563'} />
                                <Text style={{
                                  flex: 1,
                                  paddingHorizontal: 12,
                                  color: formData.routerModel ? (isDarkMode ? '#ffffff' : '#111827') : (isDarkMode ? '#9ca3af' : '#6b7280'),
                                  fontSize: 16
                                }}>
                                  {formData.routerModel || "Select Router Model"}
                                </Text>
                                <ChevronDown size={18} color={isDarkMode ? '#9CA3AF' : '#4B5563'} />
                              </Pressable>
                              {errors.routerModel && (
                                <Text style={styles.errorText}>{errors.routerModel}</Text>
                              )}
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
                        <View style={styles.inputGroup}>
                          {renderLabel('Visit By', true)}
                          <View style={[styles.pickerContainer, {
                            borderColor: errors.visitBy ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db'),
                            backgroundColor: isDarkMode ? '#1f2937' : '#ffffff'
                          }]}>
                            <Picker
                              selectedValue={formData.visitBy}
                              onValueChange={(val) => handleInputChange('visitBy', val)}
                              dropdownIconColor={isDarkMode ? '#fff' : '#000'}
                              style={{ color: isDarkMode ? '#fff' : '#000' }}
                            >
                              <Picker.Item label="Select Visit By" value="" color={isDarkMode ? '#9ca3af' : '#6b7280'} />
                              {visitByTechnicians.map((t, i) => (
                                <Picker.Item key={i} label={t.name} value={t.name} color={isDarkMode ? '#fff' : '#000'} />
                              ))}
                            </Picker>
                          </View>
                          {errors.visitBy && (
                            <Text style={styles.errorText}>{errors.visitBy}</Text>
                          )}
                        </View>

                        {/* Visit With */}
                        <View style={styles.inputGroup}>
                          {renderLabel('Visit With')}
                          <View style={[styles.pickerContainer, {
                            borderColor: errors.visitWith ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db'),
                            backgroundColor: isDarkMode ? '#1f2937' : '#ffffff'
                          }]}>
                            <Picker
                              selectedValue={formData.visitWith}
                              onValueChange={(val) => handleInputChange('visitWith', val)}
                              dropdownIconColor={isDarkMode ? '#fff' : '#000'}
                              style={{ color: isDarkMode ? '#fff' : '#000' }}
                            >
                              <Picker.Item label="Select Visit With" value="" color={isDarkMode ? '#9ca3af' : '#6b7280'} />
                              <Picker.Item label="None" value="None" color={isDarkMode ? '#fff' : '#000'} />
                              {visitWithTechnicians.map((t, i) => (
                                <Picker.Item key={i} label={t.name} value={t.name} color={isDarkMode ? '#fff' : '#000'} />
                              ))}
                            </Picker>
                          </View>
                          {errors.visitWith && (
                            <Text style={styles.errorText}>{errors.visitWith}</Text>
                          )}
                        </View>

                        {/* Visit With Other */}
                        <View style={styles.inputGroup}>
                          {renderLabel('Visit With Other')}
                          <View style={[styles.pickerContainer, {
                            borderColor: errors.visitWithOther ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db'),
                            backgroundColor: isDarkMode ? '#1f2937' : '#ffffff'
                          }]}>
                            <Picker
                              selectedValue={formData.visitWithOther}
                              onValueChange={(val) => handleInputChange('visitWithOther', val)}
                              dropdownIconColor={isDarkMode ? '#fff' : '#000'}
                              style={{ color: isDarkMode ? '#fff' : '#000' }}
                            >
                              <Picker.Item label="Select Visit With Other" value="" color={isDarkMode ? '#9ca3af' : '#6b7280'} />
                              <Picker.Item label="None" value="None" color={isDarkMode ? '#fff' : '#000'} />
                              {visitWithOtherTechnicians.map((t, i) => (
                                <Picker.Item key={i} label={t.name} value={t.name} color={isDarkMode ? '#fff' : '#000'} />
                              ))}
                            </Picker>
                          </View>
                          {errors.visitWithOther && (
                            <Text style={styles.errorText}>{errors.visitWithOther}</Text>
                          )}
                        </View>

                        {renderInput('visitRemarks', 'Visit Remarks')}

                        <View style={[styles.inputGroup, { zIndex: 50 }]}>
                          {renderLabel('Client Signature')}
                          {!isDrawingSignature ? (
                            <View>
                              <Pressable
                                onPress={() => setIsDrawingSignature(true)}
                                style={[styles.signatureContainer, {
                                  borderColor: isDarkMode ? '#4b5563' : '#9ca3af',
                                  backgroundColor: isDarkMode ? '#1f2937' : '#f9fafb'
                                }]}
                              >
                                {imageFiles.clientSignatureFile || formData.clientSignature ? (
                                  <Image
                                    source={{ uri: imageFiles.clientSignatureFile?.uri || formData.clientSignature }}
                                    style={styles.signatureImage}
                                  />
                                ) : (
                                  <View style={styles.signaturePlaceholder}>
                                    <Text style={[styles.signatureText, { color: isDarkMode ? '#9ca3af' : '#6b7280' }]}>Tap to Draw Signature</Text>
                                  </View>
                                )}
                              </Pressable>
                              {imageFiles.clientSignatureFile && (
                                <Pressable onPress={handleSignatureClear} style={styles.clearSignatureButton}>
                                  <Text style={styles.clearSignatureText}>Clear Signature</Text>
                                </Pressable>
                              )}
                            </View>
                          ) : (
                            <View style={[styles.signatureCanvasContainer, { borderColor: isDarkMode ? '#6b7280' : '#d1d5db' }]}>
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
                                style={styles.signatureCloseButton}
                              >
                                <X size={20} color="#000" />
                              </Pressable>
                            </View>
                          )}
                        </View>

                        <View style={styles.inputGroup}>
                          {renderLabel('Items', true)}
                          {orderItems.map((item, idx) => (
                            <View key={idx} style={[styles.itemRow, { zIndex: openItemIndex === idx ? 1000 : 1 }]}>
                              <View style={styles.itemRowContent}>
                                <View style={styles.itemSearchContainer}>
                                  <Pressable
                                    onPress={() => setOpenItemIndex(openItemIndex === idx ? null : idx)}
                                    style={[styles.searchContainer, {
                                      borderColor: errors.items ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db'),
                                      backgroundColor: isDarkMode ? '#1f2937' : '#ffffff'
                                    }]}
                                  >
                                    <Text style={[styles.itemSelectText, {
                                      color: item.itemId ? (isDarkMode ? '#ffffff' : '#111827') : (isDarkMode ? '#9ca3af' : '#6b7280')
                                    }]}>
                                      {item.itemId || 'Select Item'}
                                    </Text>
                                    <ChevronDown size={20} color={isDarkMode ? '#9ca3af' : '#6b7280'} />
                                  </Pressable>

                                  {openItemIndex === idx && (
                                    <View style={[styles.dropdown, {
                                      backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                                      borderColor: isDarkMode ? '#374151' : '#e5e7eb'
                                    }]}>
                                      <View style={[styles.dropdownSearchContainer, {
                                        borderColor: isDarkMode ? '#374151' : '#f3f4f6',
                                        backgroundColor: isDarkMode ? '#111827' : '#f9fafb'
                                      }]}>
                                        <Search size={18} color={isDarkMode ? '#9ca3af' : '#6b7280'} />
                                        <TextInput
                                          style={[styles.dropdownSearchInput, { color: isDarkMode ? '#ffffff' : '#111827' }]}
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
                                        onScrollBeginDrag={() => setScrollEnabled(false)}
                                        onScrollEndDrag={() => setScrollEnabled(true)}
                                        onMomentumScrollBegin={() => setScrollEnabled(false)}
                                        onMomentumScrollEnd={() => setScrollEnabled(true)}
                                      >
                                        <Pressable
                                          style={[styles.dropdownItem, {
                                            borderBottomColor: isDarkMode ? '#374151' : '#f3f4f6',
                                            backgroundColor: item.itemId === 'None' ? (isDarkMode ? 'rgba(234, 88, 12, 0.2)' : '#fff7ed') : 'transparent'
                                          }]}
                                          onPress={() => {
                                            handleItemChange(idx, 'itemId', 'None');
                                            setOpenItemIndex(null);
                                            setItemSearch('');
                                            Keyboard.dismiss();
                                          }}
                                        >
                                          <View style={styles.dropdownItemContent}>
                                            <Text style={[styles.dropdownItemText, {
                                              color: item.itemId === 'None' ? (colorPalette?.primary || '#f97316') : (isDarkMode ? '#e5e7eb' : '#374151'),
                                              fontWeight: item.itemId === 'None' ? '500' : 'normal'
                                            }]}>
                                              None
                                            </Text>
                                            {item.itemId === 'None' && (
                                              <View style={[styles.dropdownSelectedIndicator, { backgroundColor: colorPalette?.primary || '#f97316' }]} />
                                            )}
                                          </View>
                                        </Pressable>

                                        {filteredInventoryItems
                                          .map((invItem) => (
                                            <Pressable
                                              key={invItem.id}
                                              style={[styles.dropdownItem, {
                                                borderBottomColor: isDarkMode ? '#374151' : '#f3f4f6',
                                                backgroundColor: item.itemId === invItem.item_name ? (isDarkMode ? 'rgba(234, 88, 12, 0.2)' : '#fff7ed') : 'transparent'
                                              }]}
                                              onPress={() => {
                                                handleItemChange(idx, 'itemId', invItem.item_name);
                                                setOpenItemIndex(null);
                                                setItemSearch('');
                                                Keyboard.dismiss();
                                              }}
                                            >
                                              <View style={styles.dropdownItemContent}>
                                                <Text style={[styles.dropdownItemText, {
                                                  flex: 1,
                                                  marginRight: 8,
                                                  color: item.itemId === invItem.item_name ? (colorPalette?.primary || '#f97316') : (isDarkMode ? '#e5e7eb' : '#374151'),
                                                  fontWeight: item.itemId === invItem.item_name ? '500' : 'normal'
                                                }]}>
                                                  {invItem.item_name}
                                                </Text>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                  {(invItem.image_url || (invItem as any).image) && (
                                                    <Image
                                                      source={{ uri: convertGoogleDriveUrl(invItem.image_url || (invItem as any).image) || undefined }}
                                                      style={styles.dropdownItemImage}
                                                    />
                                                  )}
                                                  {item.itemId === invItem.item_name && (
                                                    <View style={[styles.dropdownSelectedIndicator, { backgroundColor: colorPalette?.primary || '#f97316' }]} />
                                                  )}
                                                </View>
                                              </View>
                                            </Pressable>
                                          ))}

                                        {filteredInventoryItems.length === 0 && (
                                          <View style={styles.emptyDropdown}>
                                            <Text style={[styles.emptyDropdownText, { color: isDarkMode ? '#6b7280' : '#9ca3af' }]}>
                                              No results found
                                            </Text>
                                          </View>
                                        )}
                                      </ScrollView>
                                    </View>
                                  )}
                                </View>

                                <View style={styles.itemQtyContainer}>
                                  <TextInput
                                    style={[styles.textInput, {
                                      borderColor: errors.items ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db'),
                                      backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                                      color: isDarkMode ? '#ffffff' : '#111827'
                                    }]}
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
                                    style={styles.itemRemoveButton}
                                  >
                                    <X size={20} color="#ef4444" />
                                  </Pressable>
                                )}
                              </View>
                            </View>
                          ))}
                          {errors.items && (
                            <Text style={styles.errorText}>{errors.items}</Text>
                          )}
                        </View>

                        <View style={styles.inputGroup}>
                          {renderLabel('Time In Image')}
                          <Pressable
                            onPress={() => handleImageChange('timeInFile')}
                            style={[styles.signatureContainer, {
                              borderColor: isDarkMode ? '#4b5563' : '#9ca3af',
                              backgroundColor: isDarkMode ? '#1f2937' : '#f9fafb'
                            }]}
                          >
                            {imageFiles.timeInFile || formData.timeIn ? (
                              <Image source={{ uri: imageFiles.timeInFile?.uri || formData.timeIn }} style={styles.signatureImage} />
                            ) : <Text style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>Upload Time In</Text>}
                          </Pressable>
                        </View>

                        <View style={styles.inputGroup}>
                          {renderLabel('Modem Setup Image')}
                          <Pressable
                            onPress={() => handleImageChange('modemSetupFile')}
                            style={[styles.signatureContainer, {
                              borderColor: isDarkMode ? '#4b5563' : '#9ca3af',
                              backgroundColor: isDarkMode ? '#1f2937' : '#f9fafb'
                            }]}
                          >
                            {imageFiles.modemSetupFile || formData.modemSetupImage ? (
                              <Image source={{ uri: imageFiles.modemSetupFile?.uri || formData.modemSetupImage }} style={styles.signatureImage} />
                            ) : <Text style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>Upload Modem Setup</Text>}
                          </Pressable>
                        </View>

                        <View style={styles.inputGroup}>
                          {renderLabel('Time Out Image')}
                          <Pressable
                            onPress={() => handleImageChange('timeOutFile')}
                            style={[styles.signatureContainer, {
                              borderColor: isDarkMode ? '#4b5563' : '#9ca3af',
                              backgroundColor: isDarkMode ? '#1f2937' : '#f9fafb'
                            }]}
                          >
                            {imageFiles.timeOutFile || formData.timeOut ? (
                              <Image source={{ uri: imageFiles.timeOutFile?.uri || formData.timeOut }} style={styles.signatureImage} />
                            ) : <Text style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>Upload Time Out</Text>}
                          </Pressable>
                        </View>
                      </>
                    )}

                    {/* Failed/Reschedule Fields */}
                    {(formData.visitStatus === 'Reschedule' || formData.visitStatus === 'Failed') && (
                      <>
                        {/* Visit By/With/Other/Remarks for Reschedule/Failed */}
                        <View style={styles.inputGroup}>
                          {renderLabel('Visit By', true)}
                          <View style={[styles.pickerContainer, {
                            borderColor: isDarkMode ? '#374151' : '#d1d5db',
                            backgroundColor: isDarkMode ? '#1f2937' : '#ffffff'
                          }]}>
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

                        <View style={styles.inputGroup}>
                          {renderLabel('Visit With', true)}
                          <View style={[styles.pickerContainer, {
                            borderColor: isDarkMode ? '#374151' : '#d1d5db',
                            backgroundColor: isDarkMode ? '#1f2937' : '#ffffff'
                          }]}>
                            <Picker
                              selectedValue={formData.visitWith}
                              onValueChange={(val) => handleInputChange('visitWith', val)}
                              dropdownIconColor={isDarkMode ? '#fff' : '#000'}
                              style={{ color: isDarkMode ? '#fff' : '#000' }}
                            >
                              <Picker.Item label="Select Visit With" value="" color={isDarkMode ? '#9ca3af' : '#6b7280'} />
                              {failedVisitWithTechnicians.map((t, i) => (
                                <Picker.Item key={i} label={t.name} value={t.name} color={isDarkMode ? '#fff' : '#000'} />
                              ))}
                            </Picker>
                          </View>
                        </View>

                        <View style={styles.inputGroup}>
                          {renderLabel('Visit With Other', true)}
                          <View style={[styles.pickerContainer, {
                            borderColor: isDarkMode ? '#374151' : '#d1d5db',
                            backgroundColor: isDarkMode ? '#1f2937' : '#ffffff'
                          }]}>
                            <Picker
                              selectedValue={formData.visitWithOther}
                              onValueChange={(val) => handleInputChange('visitWithOther', val)}
                              dropdownIconColor={isDarkMode ? '#fff' : '#000'}
                              style={{ color: isDarkMode ? '#fff' : '#000' }}
                            >
                              <Picker.Item label="Select Visit With Other" value="" color={isDarkMode ? '#9ca3af' : '#6b7280'} />
                              {failedVisitWithTechnicians.map((t, i) => (
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
                <View style={styles.inputGroup}>
                  {renderLabel('Concern', true)}
                  {isTechnician ? (
                    <TextInput
                      style={[styles.textInput, {
                        backgroundColor: isDarkMode ? '#374151' : '#f3f4f6',
                        borderColor: isDarkMode ? '#4b5563' : '#e5e7eb',
                        color: isDarkMode ? '#9ca3af' : '#6b7280'
                      }]}
                      value={formData.concern}
                      editable={false}
                    />
                  ) : (
                    <>
                      <View style={[styles.pickerContainer, {
                        borderColor: errors.concern ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db'),
                        backgroundColor: isDarkMode ? '#1f2937' : '#ffffff'
                      }]}>
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
                      {errors.concern && (
                        <Text style={styles.errorText}>{errors.concern}</Text>
                      )}
                    </>
                  )}
                </View>

                {formData.concern === 'Upgrade/Downgrade Plan' && (
                  <View style={styles.inputGroup}>
                    {renderLabel('New Plan', true)}
                    <View style={[styles.pickerContainer, {
                      borderColor: errors.newPlan ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db'),
                      backgroundColor: isDarkMode ? '#1f2937' : '#ffffff'
                    }]}>
                      <Picker
                        selectedValue={formData.newPlan}
                        onValueChange={(val) => handleInputChange('newPlan', val)}
                        dropdownIconColor={isDarkMode ? '#fff' : '#000'}
                        style={{ color: isDarkMode ? '#fff' : '#000' }}
                      >
                        <Picker.Item label="Select New Plan" value="" color={isDarkMode ? '#9ca3af' : '#6b7280'} />
                        {plans.map((p, idx) => {
                          const formattedPrice = parseFloat(p.price.toString());
                          const displayValue = `${p.name} - ${formattedPrice}`;
                          return <Picker.Item key={idx} label={displayValue} value={displayValue} color={isDarkMode ? '#fff' : '#000'} />;
                        })}
                      </Picker>
                    </View>
                    {errors.newPlan && (
                      <Text style={styles.errorText}>{errors.newPlan}</Text>
                    )}
                  </View>
                )}

                {renderInput('concernRemarks', 'Concern Remarks', !isTechnician)}
                {renderInput('modifiedBy', 'Modified By', false)}
                {renderInput('supportRemarks', 'Support Remarks')}
                {renderInput('serviceCharge', 'Service Charge', true, 'numeric')}

              </View>
            </ScrollView>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* LCP-NAP Mini Modal */}
      <Modal
        visible={isLcpnapMiniModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsLcpnapMiniModalVisible(false)}
      >
        <View style={styles.miniModalOverlay}>
          <View style={[styles.miniModalContent_mini, { backgroundColor: isDarkMode ? '#1f2937' : '#ffffff' }]}>
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
                  autoFocus={true}
                  style={[styles.miniModalSearchInput, { color: isDarkMode ? '#ffffff' : '#111827' }]}
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
              keyExtractor={(item) => item.id.toString()}
              ItemSeparatorComponent={() => (
                <View style={{ height: 16 }} />
              )}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    handleInputChange('newLcpnap', item.lcpnap_name);
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
                    color: formData.newLcpnap === item.lcpnap_name
                      ? (colorPalette?.primary || '#7c3aed')
                      : (isDarkMode ? '#e5e7eb' : '#374151'),
                    fontWeight: formData.newLcpnap === item.lcpnap_name ? '700' : 'bold',
                    flex: 1
                  }]}>
                    {item.lcpnap_name}
                  </Text>
                  {formData.newLcpnap === item.lcpnap_name && (
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
          <View style={[styles.miniModalContent_mini, { backgroundColor: isDarkMode ? '#1f2937' : '#ffffff' }]}>
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
                  style={[styles.miniModalSearchInput, { color: isDarkMode ? '#ffffff' : '#111827' }]}
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
    </Modal>
  );
};

export default ServiceOrderEditModal;
