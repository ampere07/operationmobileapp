import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, Modal, Linking, useWindowDimensions, StyleSheet } from 'react-native';
import { X, ExternalLink, Edit } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ServiceOrderEditModal from '../modals/ServiceOrderEditModal';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';
import { useServiceOrderContext } from '../contexts/ServiceOrderContext';

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
  'fullName',
  'contactNumber',
  'fullAddress',
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
  'serviceCharge'
];

const initialVisibility = defaultFields.reduce((acc: Record<string, boolean>, field) => ({ ...acc, [field]: true }), {});

const formatDate = (dateStr?: string | null): string => {
  if (!dateStr) return 'Not set';
  try {
    return new Date(dateStr).toLocaleString();
  } catch (e) {
    return dateStr || 'Not set';
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
    fullName: 'Full Name',
    contactNumber: 'Contact Number',
    fullAddress: 'Full Address',
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
    serviceCharge: 'Service Charge'
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
  const [fieldVisibility, setFieldVisibility] = useState<Record<string, boolean>>(initialVisibility);
  const [fieldOrder, setFieldOrder] = useState<string[]>(defaultFields);

  useEffect(() => {
    const loadSettings = async () => {
      const authData = await AsyncStorage.getItem('authData');
      if (authData && (!userRoleProp || userRoleIdProp === null)) {
        try {
          const userData = JSON.parse(authData);
          if (!userRoleProp) setUserRole(userData.role?.toLowerCase() || '');
          if (userRoleIdProp === null) setUserRoleId(Number(userData.role_id));
        } catch (error) { }
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

  const handleEditClick = useCallback(() => setIsEditModalOpen(true), []);
  const handleCloseEditModal = useCallback(() => setIsEditModalOpen(false), []);
  const handleSaveEdit = useCallback(() => {
    setIsEditModalOpen(false);
    silentRefresh();
  }, [silentRefresh]);

  const toggleFieldVisibility = useCallback((field: string) => {
    setFieldVisibility(prev => ({ ...prev, [field]: !prev[field] }));
  }, []);

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
    const val = (serviceOrder as any)[fieldKey];
    if (val === null || val === undefined || val === '') return true;
    if (val === '-' || val === 'None' || val === 'Not assigned' || val === 'No remarks' || val === 'Not set') return true;

    // Special check for images
    if (['houseFrontPicture', 'image1Url', 'image2Url', 'image3Url', 'clientSignatureUrl'].includes(fieldKey)) {
      return !val || val === 'No image available';
    }

    // Special check for numeric/currency
    if (fieldKey === 'serviceCharge') {
      return !val || val === '0';
    }

    return false;
  }, [serviceOrder]);

  const fieldRenderers: Record<string, () => React.ReactNode> = useMemo(() => ({
    ticketId: () => <Text style={valStyle}>{serviceOrder.ticketId}</Text>,
    timestamp: () => <Text style={valStyle}>{serviceOrder.timestamp}</Text>,
    accountNumber: () => (
      <Text style={[styles.accountDetailsText, styles.valueText]} selectable={true}>
        {serviceOrder.accountNumber} | {serviceOrder.fullName} | {serviceOrder.fullAddress}
      </Text>
    ),
    dateInstalled: () => <Text style={valStyle}>{serviceOrder.dateInstalled ? serviceOrder.dateInstalled.split(/[ T]/)[0] : '-'}</Text>,
    fullName: () => <Text style={valStyle}>{serviceOrder.fullName}</Text>,
    contactNumber: () => <Text style={valStyle}>{serviceOrder.contactNumber}</Text>,
    fullAddress: () => <Text style={valStyle}>{serviceOrder.fullAddress}</Text>,
    houseFrontPicture: () => renderImageLinkContent(serviceOrder.houseFrontPicture),
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
  }), [serviceOrder, userRole, userRoleId, isFieldEmpty]);

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
      <Text style={[styles.imageLinkText, styles.valueText, { color: '#111827' }]} numberOfLines={1} selectable={true}>
        {url || 'No image available'}
      </Text>
      {url && (
        <Pressable onPress={() => Linking.openURL(url)}>
          <ExternalLink width={16} height={16} color="#4b5563" />
        </Pressable>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { borderLeftWidth: !isMobile ? 1 : 0, backgroundColor: '#f9fafb', borderLeftColor: '#d1d5db' }]}>
      <View style={[styles.header, { backgroundColor: '#ffffff', borderBottomColor: '#e5e7eb', paddingTop: isMobile ? 60 : 12 }]}>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { fontSize: isMobile ? 14 : 18, color: '#111827' }]} numberOfLines={1} selectable={true}>
            {serviceOrder.accountNumber} | {serviceOrder.fullName}
          </Text>
        </View>

        <View style={styles.headerActions}>
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
          <Pressable onPress={onClose}>
            <X width={28} height={28} color="#4b5563" />
          </Pressable>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: { height: '100%', flexDirection: 'column', overflow: 'hidden', position: 'relative', width: '100%' },
  header: { padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1 },
  headerTitleContainer: { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 },
  headerTitle: { fontWeight: '500' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4, flexDirection: 'row', alignItems: 'center' },
  headerButtonText: { color: '#ffffff', fontWeight: '500', fontSize: 14 },
  headerButtonIcon: { marginRight: 4 },
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
});

export default ServiceOrderDetails;
