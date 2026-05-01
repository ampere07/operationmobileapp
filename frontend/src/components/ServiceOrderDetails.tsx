import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, Modal, Linking, useWindowDimensions, StyleSheet, Alert } from 'react-native';
import { X, ExternalLink, Edit, ChevronLeft, Play, Square, MapPin } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ServiceOrderEditModal from '../modals/ServiceOrderEditModal';
import ConfirmationModal from '../modals/MoveToJoModal';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';
import { useServiceOrderContext } from '../contexts/ServiceOrderContext';
import { updateServiceOrder } from '../services/serviceOrderService';
import { getCustomerDetail, CustomerDetailData } from '../services/customerDetailService';
import { techInOutService } from '../services/techInOutService';

interface ServiceOrderDetailsProps {
  serviceOrder: {
    id: string;
    ticketId: string;
    timestamp: string;
    accountNumber: string;
    fullName: string;
    contactAddress: string;
    dateInstalled: string;
    contactNumber: string;
    fullAddress: string;
    houseFrontPicture: string;
    emailAddress: string;
    plan: string;
    affiliate?: string;
    username: string;
    connectionType: string;
    routerModemSN: string;
    lcp: string;
    nap: string;
    port: string;
    vlan: string;
    concern: string;
    concernRemarks: string;
    visitStatus: string;
    visitBy: string;
    visitWith: string;
    visitWithOther: string;
    visitRemarks: string;
    modifiedBy: string;
    modifiedDate: string;
    requestedBy: string;
    assignedEmail: string;
    supportRemarks: string;
    serviceCharge: string;
    repairCategory?: string;
    supportStatus?: string;
    priorityLevel?: string;
    newRouterSn?: string;
    newLcpnap?: string;
    newPlan?: string;
    clientSignatureUrl?: string;
    image1Url?: string;
    image2Url?: string;
    image3Url?: string;
    region?: string;
    city?: string;
    barangay?: string;
    start_time?: string | null;
    end_time?: string | null;
    proof_of_billing_url?: string;
    government_valid_id_url?: string;
    second_government_valid_id_url?: string;
    document_attachment_url?: string;
    other_isp_bill_url?: string;
  };
  onClose: () => void;
  isMobile?: boolean;
  userRoleProp?: string;
  userRoleIdProp?: number | null;
}

const FIELD_VISIBILITY_KEY = 'serviceOrderDetailsFieldVisibility';
const FIELD_ORDER_KEY = 'serviceOrderDetailsFieldOrder';

const defaultFields = [
  'ticketId',
  'timestamp',
  'accountNumber',
  'dateInstalled',
  'startTime',
  'endTime',
  'duration',
  'fullName',
  'contactNumber',
  'fullAddress',
  'addressCoordinates',
  'houseFrontPicture',
  'emailAddress',
  'plan',
  'username',
  'connectionType',
  'routerModemSN',
  'lcp',
  'nap',
  'port',
  'vlan',
  'concern',
  'concernRemarks',
  'visitStatus',
  'visitBy',
  'visitWith',
  'visitWithOther',
  'visitRemarks',
  'modifiedBy',
  'modifiedDate',
  'requestedBy',
  'assignedEmail',
  'supportRemarks',
  'supportStatus',
  'repairCategory',
  'newRouterSn',
  'newLcpnap',
  'newPlan',
  'image1Url',
  'image2Url',
  'image3Url',
  'clientSignatureUrl',
  'serviceCharge',
  'proof_of_billing_url',
  'government_valid_id_url',
  'second_government_valid_id_url',
  'document_attachment_url',
  'other_isp_bill_url'
];

const initialVisibility = defaultFields.reduce((acc: Record<string, boolean>, field) => ({ ...acc, [field]: true }), {});

const formatDate = (dateStr?: string | null): string => {
  if (!dateStr) return 'Not set';
  try {
    const d = new Date(dateStr.replace(' ', 'T'));
    if (isNaN(d.getTime())) return dateStr;
    const datePart = `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
    const timePart = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${datePart} ${timePart}`;
  } catch (e) {
    return dateStr || 'Not set';
  }
};

const formatDateOnly = (dateStr?: string | null): string => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr.replace(' ', 'T'));
    if (isNaN(d.getTime())) return dateStr;
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
  } catch (e) {
    return dateStr;
  }
};

const getStatusColor = (status: string | undefined, type: 'support' | 'visit'): string => {
  if (!status) return '#9ca3af';
  const lower = status.toLowerCase().trim();
  if (type === 'support') {
    if (['resolved', 'completed', 'done'].includes(lower)) return '#4ade80';
    if (['in-progress', 'in progress'].includes(lower)) return '#60a5fa';
    if (lower === 'pending') return '#fb923c';
    return '#9ca3af';
  } else {
    if (['completed', 'done'].includes(lower)) return '#4ade80';
    if (['scheduled', 'reschedule', 'in progress'].includes(lower)) return '#60a5fa';
    if (lower === 'pending') return '#fb923c';
    if (['cancelled', 'failed'].includes(lower)) return '#ef4444';
    return '#9ca3af';
  }
};

const getFieldLabel = (fieldKey: string): string => {
  const labels: Record<string, string> = {
    ticketId: 'Ticket ID',
    timestamp: 'Timestamp',
    accountNumber: 'Account No.',
    dateInstalled: 'Date Installed',
    startTime: 'Start Time',
    endTime: 'End Time',
    duration: 'Duration',
    fullName: 'Full Name',
    contactNumber: 'Contact Number',
    fullAddress: 'Full Address',
    addressCoordinates: 'Address Coordinates',
    houseFrontPicture: 'House Front Picture',
    emailAddress: 'Email Address',
    plan: 'Plan',
    username: 'Username',
    connectionType: 'Connection Type',
    routerModemSN: 'Router/Modem SN',
    lcp: 'LCP',
    nap: 'NAP',
    port: 'PORT',
    vlan: 'VLAN',
    concern: 'Concern',
    concernRemarks: 'Concern Remarks',
    visitStatus: 'Visit Status',
    visitBy: 'Visit By',
    visitWith: 'Visit With',
    visitWithOther: 'Visit With Other',
    visitRemarks: 'Visit Remarks',
    modifiedBy: 'Modified By',
    modifiedDate: 'Modified Date',
    requestedBy: 'Requested by',
    assignedEmail: 'Assigned Email',
    supportRemarks: 'Support Remarks',
    supportStatus: 'Support Status',
    repairCategory: 'Repair Category',
    newRouterSn: 'New Router SN',
    newLcpnap: 'New LCP/NAP',
    newPlan: 'New Plan',
    image1Url: 'Time In Image',
    image2Url: 'Modem Setup Image',
    image3Url: 'Time Out Image',
    clientSignatureUrl: 'Client Signature',
    serviceCharge: 'Service Charge',
    proof_of_billing_url: 'Proof of Billing',
    government_valid_id_url: 'Government Valid ID',
    second_government_valid_id_url: 'Second Government Valid ID',
    document_attachment_url: 'Document Attachment',
    other_isp_bill_url: 'Other ISP Bill'
  };
  return labels[fieldKey] || fieldKey;
};

const ServiceOrderDetails: React.FC<ServiceOrderDetailsProps> = ({
  serviceOrder,
  onClose,
  isMobile: propIsMobile = false,
  userRoleProp,
  userRoleIdProp
}) => {
  const { width } = useWindowDimensions();
  const isMobile = propIsMobile || width < 768;
  const { silentRefresh } = useServiceOrderContext();
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(() => settingsColorPaletteService.getActiveSync());
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [showFieldSettings, setShowFieldSettings] = useState(false);
  const [userRole, setUserRole] = useState<string>(userRoleProp || '');
  const [userRoleId, setUserRoleId] = useState<number | null>(userRoleIdProp || null);
  const [customerDetail, setCustomerDetail] = useState<CustomerDetailData | null>(null);

  // Sync props to state if props change
  useEffect(() => {
    if (userRoleProp) setUserRole(userRoleProp);
  }, [userRoleProp]);

  useEffect(() => {
    if (userRoleIdProp !== undefined) setUserRoleId(userRoleIdProp);
  }, [userRoleIdProp]);
  const [fieldVisibility, setFieldVisibility] = useState<Record<string, boolean>>(initialVisibility);
  const [fieldOrder, setFieldOrder] = useState<string[]>(defaultFields);
  const checkIsStarted = (time?: string | null) => {
    if (!time) return false;
    const lowerTime = String(time).toLowerCase().trim();
    return !['0000-00-00 00:00:00', 'not set', '-', 'none', '', 'null', 'undefined'].includes(lowerTime);
  };

  const [isStarted, setIsStarted] = useState(checkIsStarted((serviceOrder as any).start_time));
  const [isEnded, setIsEnded] = useState(checkIsStarted((serviceOrder as any).end_time));
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());
  const [techStatus, setTechStatus] = useState<'online' | 'offline'>('offline');
  const [showTimeInWarning, setShowTimeInWarning] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isStarted && !isEnded) {
      interval = setInterval(() => {
        setNow(new Date());
      }, 1000);
    } else {
      setNow(new Date());
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isStarted, isEnded]);

  useEffect(() => {
    setIsStarted(checkIsStarted((serviceOrder as any).start_time));
    setIsEnded(checkIsStarted((serviceOrder as any).end_time));
  }, [serviceOrder]);
  
  useEffect(() => {
    const fetchCustomerDetail = async () => {
      if (serviceOrder.accountNumber) {
        try {
          const detail = await getCustomerDetail(serviceOrder.accountNumber);
          setCustomerDetail(detail);
        } catch (error) {
          console.error('Error fetching customer detail in ServiceOrderDetails:', error);
        }
      }
    };
    fetchCustomerDetail();
  }, [serviceOrder.accountNumber]);

  useEffect(() => {
    const loadSettings = async () => {
      const authData = await AsyncStorage.getItem('authData');
      let userData = null;
      if (authData) {
        try {
          userData = JSON.parse(authData);
          if (!userRoleProp) setUserRole(userData.role?.toLowerCase() || '');
          if (userRoleIdProp === null) setUserRoleId(Number(userData.role_id));

          // Check technician status - Always check if user is a technician
          const currentRole = userRoleProp || userData.role?.toLowerCase() || '';
          const currentRoleId = userRoleIdProp !== null ? userRoleIdProp : Number(userData.role_id);
          const isTechnician = (currentRole === 'technician' || currentRoleId === 2);
          
          if (isTechnician) {
            const userId = userData.id || userData.user_id || userData.user?.id;
            if (userId) {
              const response = await techInOutService.getStatus(userId);
              if (response.success && response.data) {
                const isOnline = !!(response.data.time_in && !response.data.time_out);
                setTechStatus(isOnline ? 'online' : 'offline');
              }
            }
          }
        } catch (error) {
          console.error('Error parsing auth data or fetching tech status:', error);
        }
      }

      const [savedVisibility, savedOrder] = await Promise.all([
        AsyncStorage.getItem(FIELD_VISIBILITY_KEY),
        AsyncStorage.getItem(FIELD_ORDER_KEY)
      ]);

      if (savedVisibility) setFieldVisibility(JSON.parse(savedVisibility));
      if (savedOrder) setFieldOrder(JSON.parse(savedOrder));
    };
    loadSettings();
  }, [userRoleProp, userRoleIdProp]);

  useEffect(() => {
    AsyncStorage.setItem(FIELD_VISIBILITY_KEY, JSON.stringify(fieldVisibility));
  }, [fieldVisibility]);

  useEffect(() => {
    AsyncStorage.setItem(FIELD_ORDER_KEY, JSON.stringify(fieldOrder));
  }, [fieldOrder]);

  const handleEditClick = useCallback(() => {
    if (userRole === 'technician' || userRoleId === 2 || String(userRoleId) === '2') {
      if (!isStarted) {
        Alert.alert(
          'Action Required',
          'You need to start the service order first.',
          [{ text: 'OK' }]
        );
        return;
      }
    }
    setIsEditModalOpen(true);
  }, [isStarted, userRole, userRoleId]);

  const handleCloseEditModal = useCallback(() => setIsEditModalOpen(false), []);
  const handleSaveEdit = useCallback(() => {
    setIsEditModalOpen(false);
    silentRefresh();
  }, [silentRefresh]);

  const toggleFieldVisibility = useCallback((field: string) => {
    setFieldVisibility(prev => ({ ...prev, [field]: !prev[field] }));
  }, []);

  const formatMySQLDate = () => {
    const now = new Date();
    return now.getFullYear() + '-' + 
      String(now.getMonth() + 1).padStart(2, '0') + '-' + 
      String(now.getDate()).padStart(2, '0') + ' ' + 
      String(now.getHours()).padStart(2, '0') + ':' + 
      String(now.getMinutes()).padStart(2, '0') + ':' + 
      String(now.getSeconds()).padStart(2, '0');
  };

  const handleStartTimer = async () => {
    try {
      const isTechnician = userRole === 'technician' || userRoleId === 2 || String(userRoleId) === '2';
      if (isTechnician && techStatus === 'offline') {
        setShowTimeInWarning(true);
        return;
      }

      setLoading(true);
      if (!serviceOrder.id) throw new Error('Cannot update service order: Missing ID');

      const currentTime = formatMySQLDate();
      await updateServiceOrder(serviceOrder.id, {
        start_time: currentTime,
      } as any);

      (serviceOrder as any).start_time = currentTime;
      setIsStarted(true);
      setSuccessMessage('Timer started successfully!');
      setShowSuccessModal(true);
      silentRefresh();
    } catch (err: any) {
      console.error('Failed to start timer:', err);
      setError(`Failed to start timer: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEndTimer = async () => {
    try {
      setLoading(true);
      if (!serviceOrder.id) throw new Error('Cannot update service order: Missing ID');

      const currentTime = formatMySQLDate();
      await updateServiceOrder(serviceOrder.id, {
        end_time: currentTime,
      } as any);

      (serviceOrder as any).end_time = currentTime;
      setIsEnded(true);
      setSuccessMessage('Timer ended successfully!');
      setShowSuccessModal(true);
      silentRefresh();
    } catch (err: any) {
      console.error('Failed to end timer:', err);
      setError(`Failed to end timer: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const selectAllFields = useCallback(() => {
    const allVisible = defaultFields.reduce((acc, field) => ({ ...acc, [field]: true }), {});
    setFieldVisibility(allVisible);
  }, []);

  const deselectAllFields = useCallback(() => {
    const allHidden = defaultFields.reduce((acc, field) => ({ ...acc, [field]: false }), {});
    setFieldVisibility(allHidden);
  }, []);

  const resetFieldSettings = useCallback(() => {
    setFieldVisibility(initialVisibility);
    setFieldOrder(defaultFields);
  }, []);

  const valStyle = [styles.valueText, { color: '#111827' }];

  const isFieldEmpty = useCallback((fieldKey: string): boolean => {
    if (fieldKey === 'duration') return !(serviceOrder as any).start_time;
    if (fieldKey === 'startTime') return !(serviceOrder as any).start_time;
    if (fieldKey === 'endTime') return !(serviceOrder as any).end_time;

    const val = (serviceOrder as any)[fieldKey];
    if (fieldKey === 'addressCoordinates') return !customerDetail?.addressCoordinates;
    if (val === null || val === undefined || val === '') return true;
    if (val === '-' || val === 'None' || val === 'Not assigned' || val === 'No remarks' || val === 'Not set') return true;

    // Special check for images
    if (['houseFrontPicture', 'image1Url', 'image2Url', 'image3Url', 'clientSignatureUrl', 'proof_of_billing_url', 'government_valid_id_url', 'second_government_valid_id_url', 'document_attachment_url', 'other_isp_bill_url'].includes(fieldKey)) {
      if (fieldKey === 'proof_of_billing_url') return !customerDetail?.proof_of_billing_url;
      if (fieldKey === 'government_valid_id_url') return !customerDetail?.government_valid_id_url;
      if (fieldKey === 'second_government_valid_id_url') return !customerDetail?.second_government_valid_id_url;
      if (fieldKey === 'document_attachment_url') return !customerDetail?.document_attachment_url;
      if (fieldKey === 'other_isp_bill_url') return !customerDetail?.other_isp_bill_url;
      if (fieldKey === 'houseFrontPicture') return !(customerDetail?.houseFrontPictureUrl || serviceOrder.houseFrontPicture);
      return !val || val === 'No image available';
    }

    // Special check for numeric/currency
    if (fieldKey === 'serviceCharge') {
      return !val || val === '0';
    }

    return false;
  }, [serviceOrder]);

  const getDurationString = (start?: string | null, end?: string | null): string => {
    if (!start) return 'N/A';
    try {
      const startTime = new Date(start.replace(' ', 'T')).getTime();
      const endTime = end ? new Date(end.replace(' ', 'T')).getTime() : now.getTime();
      
      if (isNaN(startTime) || isNaN(endTime)) return 'N/A';
      
      const diff = Math.max(0, endTime - startTime);
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      return `${hours}h ${minutes}m ${seconds}s`;
    } catch (e) {
      return 'N/A';
    }
  };

  const fieldRenderers: Record<string, () => React.ReactNode> = useMemo(() => ({
    ticketId: () => <Text style={valStyle}>{serviceOrder.ticketId}</Text>,
    timestamp: () => <Text style={valStyle}>{formatDate(serviceOrder.timestamp)}</Text>,
    accountNumber: () => (
      <Text style={[styles.accountDetailsText, styles.valueText]} selectable={true}>
        {serviceOrder.accountNumber} | {serviceOrder.fullName} | {serviceOrder.fullAddress}
      </Text>
    ),
    dateInstalled: () => <Text style={valStyle}>{formatDateOnly(serviceOrder.dateInstalled)}</Text>,
    startTime: () => <Text style={valStyle}>{formatDate((serviceOrder as any).start_time)}</Text>,
    endTime: () => <Text style={valStyle}>{formatDate((serviceOrder as any).end_time)}</Text>,
    duration: () => <Text style={valStyle}>{getDurationString((serviceOrder as any).start_time, (serviceOrder as any).end_time)}</Text>,
    fullName: () => <Text style={valStyle}>{serviceOrder.fullName}</Text>,
    contactNumber: () => <Text style={valStyle}>{serviceOrder.contactNumber}</Text>,
    fullAddress: () => <Text style={valStyle}>{serviceOrder.fullAddress}</Text>,
    addressCoordinates: () => {
      const coords = customerDetail?.addressCoordinates;
      return (
        <View style={styles.imageLinkContainer}>
          <Text style={valStyle}>{coords || 'Not provided'}</Text>
          {coords && (
            <Pressable onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coords)}`)}>
              <MapPin width={24} height={24} color="#4b5563" />
            </Pressable>
          )}
        </View>
      );
    },
    houseFrontPicture: () => renderImageLinkContent(customerDetail?.houseFrontPictureUrl || serviceOrder.houseFrontPicture),
    emailAddress: () => <Text style={valStyle}>{serviceOrder.emailAddress}</Text>,
    plan: () => <Text style={valStyle}>{serviceOrder.plan}</Text>,
    username: () => <Text style={valStyle}>{serviceOrder.username}</Text>,
    connectionType: () => <Text style={valStyle}>{serviceOrder.connectionType}</Text>,
    routerModemSN: () => <Text style={valStyle}>{serviceOrder.routerModemSN}</Text>,
    lcp: () => <Text style={valStyle}>{serviceOrder.lcp}</Text>,
    nap: () => <Text style={valStyle}>{serviceOrder.nap}</Text>,
    port: () => <Text style={valStyle}>{serviceOrder.port}</Text>,
    vlan: () => <Text style={valStyle}>{serviceOrder.vlan}</Text>,
    concern: () => <Text style={valStyle}>{serviceOrder.concern}</Text>,
    concernRemarks: () => <Text style={valStyle}>{serviceOrder.concernRemarks}</Text>,
    visitStatus: () => (
      <Text style={[styles.statusText, { color: getStatusColor(serviceOrder.visitStatus, 'visit') }]}>
        {serviceOrder.visitStatus === 'inprogress' ? 'In Progress' : (serviceOrder.visitStatus || 'Not set')}
      </Text>
    ),
    visitBy: () => <Text style={valStyle}>{serviceOrder.visitBy || 'Not assigned'}</Text>,
    visitWith: () => <Text style={valStyle}>{serviceOrder.visitWith || 'None'}</Text>,
    visitWithOther: () => <Text style={valStyle}>{serviceOrder.visitWithOther || 'None'}</Text>,
    visitRemarks: () => <Text style={valStyle}>{serviceOrder.visitRemarks || 'No remarks'}</Text>,
    modifiedBy: () => <Text style={valStyle}>{serviceOrder.modifiedBy || 'System'}</Text>,
    modifiedDate: () => <Text style={valStyle}>{formatDate(serviceOrder.modifiedDate)}</Text>,
    requestedBy: () => <Text style={valStyle}>{serviceOrder.requestedBy}</Text>,
    assignedEmail: () => <Text style={valStyle}>{serviceOrder.assignedEmail || 'Not assigned'}</Text>,
    supportRemarks: () => <Text style={valStyle}>{serviceOrder.supportRemarks || 'No remarks'}</Text>,
    supportStatus: () => (
      <Text style={[styles.statusText, { color: getStatusColor(serviceOrder.supportStatus, 'support') }]}>
        {serviceOrder.supportStatus || 'Not set'}
      </Text>
    ),
    repairCategory: () => <Text style={valStyle}>{serviceOrder.repairCategory || 'None'}</Text>,
    newRouterSn: () => <Text style={valStyle}>{serviceOrder.newRouterSn || 'None'}</Text>,
    newPlan: () => <Text style={valStyle}>{serviceOrder.newPlan || 'None'}</Text>,
    image1Url: () => renderImageLinkContent(serviceOrder.image1Url),
    image2Url: () => renderImageLinkContent(serviceOrder.image2Url),
    image3Url: () => renderImageLinkContent(serviceOrder.image3Url),
    clientSignatureUrl: () => renderImageLinkContent(serviceOrder.clientSignatureUrl),
    serviceCharge: () => <Text style={valStyle}>₱{parseFloat(serviceOrder.serviceCharge || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>,
    proof_of_billing_url: () => renderImageLinkContent(customerDetail?.proof_of_billing_url),
    government_valid_id_url: () => renderImageLinkContent(customerDetail?.government_valid_id_url),
    second_government_valid_id_url: () => renderImageLinkContent(customerDetail?.second_government_valid_id_url),
    document_attachment_url: () => renderImageLinkContent(customerDetail?.document_attachment_url),
    other_isp_bill_url: () => renderImageLinkContent(customerDetail?.other_isp_bill_url),
  }), [serviceOrder, userRole, userRoleId, isFieldEmpty, now, isStarted, isEnded, customerDetail]);

  const renderField = (label: string, content: React.ReactNode) => (
    <View style={[styles.fieldContainer, { borderBottomColor: '#e5e7eb' }]}>
      <Text style={[styles.fieldLabel, { color: '#6b7280' }]}>{label}</Text>
      <View style={styles.fieldValueContainer}>
        {content}
      </View>
    </View>
  );

  const renderImageLinkContent = (url: string | undefined | null) => (
    <View style={styles.imageLinkContainer}>
      {url ? (
        <Pressable 
          onPress={() => Linking.openURL(url)}
          style={({ pressed }) => [
            { opacity: pressed ? 0.7 : 1, flexDirection: 'row', alignItems: 'center' }
          ]}
        >
          <Text style={[styles.imageLinkText, styles.valueText, { color: '#2563eb', textDecorationLine: 'underline', flex: 0, marginRight: 4 }]} selectable={true}>
            View
          </Text>
          <ExternalLink width={14} height={14} color="#2563eb" />
        </Pressable>
      ) : (
        <Text style={[styles.imageLinkText, styles.valueText, { color: '#9ca3af' }]} selectable={true}>
          No image available
        </Text>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { borderLeftWidth: !isMobile ? 1 : 0, backgroundColor: '#f9fafb', borderLeftColor: '#d1d5db' }]}>
      <View style={[styles.header, { backgroundColor: '#ffffff', borderBottomColor: '#e5e7eb', paddingTop: isMobile ? 60 : 12 }]}>
        <View style={styles.headerTitleContainer}>
          <Pressable onPress={onClose} style={styles.backButton}>
            <ChevronLeft width={28} height={28} color="#4b5563" />
          </Pressable>
          <View style={styles.centeredTitle}>
            <Text style={[styles.headerTitle, { fontSize: isMobile ? 14 : 18, color: '#111827' }]} numberOfLines={1} selectable={true}>
              {serviceOrder.fullName}
            </Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          {!isStarted && (userRoleId === 2 || userRole?.toLowerCase() === 'technician') && (
            <Pressable
              style={[styles.iconBtn, { backgroundColor: colorPalette?.primary || '#10b981' }]}
              onPress={handleStartTimer}
              disabled={loading}
            >
              <Play width={18} height={18} color="#ffffff" />
            </Pressable>
          )}

          {userRole !== 'agent' && userRoleId !== 4 && (
            <>
              {!(serviceOrder.visitStatus?.toLowerCase().trim() === 'done' && (userRoleId === 2 || userRole === 'technician')) && (
                <Pressable style={[styles.headerButton, { backgroundColor: colorPalette?.primary || '#7c3aed' }]} onPress={handleEditClick}>
                  <Edit width={16} height={16} color="#ffffff" style={styles.headerButtonIcon} />
                  <Text style={styles.headerButtonText}>Edit</Text>
                </Pressable>
              )}
            </>
          )}
          {/* Symmetric placeholder if no actions are visible */}
          {(!userRole || userRole === 'agent' || userRoleId === 4) && (
            <View style={{ width: 28 }} />
          )}
        </View>
      </View>

      <ScrollView style={styles.flex1} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {fieldOrder.map(key => {
            if (!fieldVisibility[key] || isFieldEmpty(key)) return null;
            const renderer = fieldRenderers[key];
            if (!renderer) return null;
            return <React.Fragment key={key}>{renderField(getFieldLabel(key), renderer())}</React.Fragment>;
          })}
        </View>
      </ScrollView>


      {isEditModalOpen && (
        <ServiceOrderEditModal
          isOpen={isEditModalOpen}
          onClose={handleCloseEditModal}
          onSave={handleSaveEdit}
          serviceOrderData={serviceOrder}
        />
      )}

      {error && (
        <View style={[styles.errorBox, { backgroundColor: '#fef2f2', borderColor: '#fca5a5' }]}>
          <Text style={{ color: '#991b1b' }}>{error}</Text>
        </View>
      )}

      <ConfirmationModal
        isOpen={showSuccessModal}
        title="Success"
        message={successMessage}
        confirmText="OK"
        cancelText="Close"
        onConfirm={() => setShowSuccessModal(false)}
        onCancel={() => setShowSuccessModal(false)}
      />

      <ConfirmationModal
        isOpen={showTimeInWarning}
        title="Action Required"
        message="You need to time in first in the menu before starting a service order."
        confirmText="OK"
        cancelText="Close"
        onConfirm={() => setShowTimeInWarning(false)}
        onCancel={() => setShowTimeInWarning(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { height: '100%', flexDirection: 'column', overflow: 'hidden', position: 'relative', width: '100%' },
  header: { padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1 },
  headerTitleContainer: { flexDirection: 'row', alignItems: 'center', flex: 1, position: 'relative' },
  backButton: { position: 'absolute', left: 0, zIndex: 10 },
  centeredTitle: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontWeight: '500', textAlign: 'center' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4, flexDirection: 'row', alignItems: 'center' },
  headerButtonText: { color: '#ffffff', fontWeight: '500', fontSize: 14 },
  headerButtonIcon: { marginRight: 4 },
  iconBtn: { padding: 6, borderRadius: 9999, alignItems: 'center', justifyContent: 'center' },
  settingsButton: { padding: 4 },
  flex1: { flex: 1 },
  content: { width: '100%', paddingVertical: 8 },
  fieldContainer: { flexDirection: 'column', borderBottomWidth: 1, paddingVertical: 8, paddingHorizontal: 16, gap: 2 },
  fieldLabel: { fontSize: 14, fontWeight: '500' },
  fieldValueContainer: { width: '100%' },
  imageLinkContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  imageLinkText: { flex: 1, marginRight: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', maxWidth: 400, borderRadius: 8, borderWidth: 1, maxHeight: '80%', overflow: 'hidden' },
  modalHeader: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { fontWeight: '600' },
  modalHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modalActionText: { color: '#2563eb', fontSize: 12 },
  modalList: { padding: 8 },
  modalItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, paddingVertical: 8, borderRadius: 4 },
  checkbox: { height: 18, width: 18, borderRadius: 4, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  checkboxTick: { color: '#ffffff', fontSize: 12, fontWeight: 'bold' },
  modalItemText: { fontSize: 14 },
  valueText: { fontSize: 16 },
  accountDetailsText: { color: '#ef4444' },
  statusText: { fontWeight: '600', textTransform: 'uppercase' },
  errorBox: { padding: 12, margin: 12, borderRadius: 4, borderWidth: 1 },
});

export default ServiceOrderDetails;
