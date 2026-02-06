import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, Modal, Linking } from 'react-native';
import { X, ExternalLink, Edit, Settings } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ServiceOrderEditModal from '../modals/ServiceOrderEditModal';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';

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
    affiliate: string;
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
    userEmail: string;
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
  };
  onClose: () => void;
  isMobile?: boolean;
}

const ServiceOrderDetails: React.FC<ServiceOrderDetailsProps> = ({ serviceOrder, onClose, isMobile = false }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [showFieldSettings, setShowFieldSettings] = useState(false);

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
    'affiliate',
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
    'userEmail',
    'requestedBy',
    'assignedEmail',
    'supportRemarks',
    'supportStatus',
    'repairCategory',
    'priorityLevel',
    'newRouterSn',
    'newLcpnap',
    'newPlan',
    'image1Url',
    'image2Url',
    'image3Url',
    'clientSignatureUrl',
    'serviceCharge'
  ];

  const [fieldVisibility, setFieldVisibility] = useState<Record<string, boolean>>(() => {
    return defaultFields.reduce((acc: Record<string, boolean>, field) => ({ ...acc, [field]: true }), {});
  });

  const [fieldOrder, setFieldOrder] = useState<string[]>(defaultFields);

  useEffect(() => {
    const loadSettings = async () => {
      const theme = await AsyncStorage.getItem('theme');
      setIsDarkMode(theme === 'dark');

      const savedVisibility = await AsyncStorage.getItem(FIELD_VISIBILITY_KEY);
      if (savedVisibility) {
        setFieldVisibility(JSON.parse(savedVisibility));
      }

      const savedOrder = await AsyncStorage.getItem(FIELD_ORDER_KEY);
      if (savedOrder) {
        setFieldOrder(JSON.parse(savedOrder));
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(FIELD_VISIBILITY_KEY, JSON.stringify(fieldVisibility));
  }, [fieldVisibility]);

  useEffect(() => {
    AsyncStorage.setItem(FIELD_ORDER_KEY, JSON.stringify(fieldOrder));
  }, [fieldOrder]);

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

  const handleEditClick = () => {
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
  };

  const handleSaveEdit = (formData: any) => {
    console.log('Service order updated:', formData);
    setIsEditModalOpen(false);
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
      affiliate: 'Affiliate',
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
      userEmail: 'User Email',
      requestedBy: 'Requested by',
      assignedEmail: 'Assigned Email',
      supportRemarks: 'Support Remarks',
      supportStatus: 'Support Status',
      repairCategory: 'Repair Category',
      priorityLevel: 'Priority Level',
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

  const toggleFieldVisibility = (field: string) => {
    setFieldVisibility((prev: Record<string, boolean>) => ({ ...prev, [field]: !prev[field] }));
  };

  const selectAllFields = () => {
    const allVisible: Record<string, boolean> = defaultFields.reduce((acc: Record<string, boolean>, field) => ({ ...acc, [field]: true }), {});
    setFieldVisibility(allVisible);
  };

  const deselectAllFields = () => {
    const allHidden: Record<string, boolean> = defaultFields.reduce((acc: Record<string, boolean>, field) => ({ ...acc, [field]: false }), {});
    setFieldVisibility(allHidden);
  };

  const resetFieldSettings = () => {
    const allVisible: Record<string, boolean> = defaultFields.reduce((acc: Record<string, boolean>, field) => ({ ...acc, [field]: true }), {});
    setFieldVisibility(allVisible);
    setFieldOrder(defaultFields);
  };

  const getStatusColor = (status: string | undefined, type: 'support' | 'visit'): string => {
    if (!status) return '#9ca3af';

    if (type === 'support') {
      switch (status.toLowerCase()) {
        case 'resolved':
        case 'completed':
          return '#4ade80';
        case 'in-progress':
        case 'in progress':
          return '#60a5fa';
        case 'pending':
          return '#fb923c';
        case 'closed':
        case 'cancelled':
          return '#9ca3af';
        default:
          return '#9ca3af';
      }
    } else {
      switch (status.toLowerCase()) {
        case 'completed':
          return '#4ade80';
        case 'scheduled':
        case 'reschedule':
        case 'in progress':
          return '#60a5fa';
        case 'pending':
          return '#fb923c';
        case 'cancelled':
        case 'failed':
          return '#ef4444';
        default:
          return '#9ca3af';
      }
    }
  };

  const renderField = (label: string, value: any) => (
    <View style={{ flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: isDarkMode ? '#1f2937' : '#d1d5db' }}>
      <Text style={{ width: 160, fontSize: 14, color: isDarkMode ? '#9ca3af' : '#4b5563' }}>{label}</Text>
      <Text style={{ flex: 1, color: isDarkMode ? '#ffffff' : '#111827' }}>
        {value || '-'}
      </Text>
    </View>
  );

  const renderImageField = (label: string, url: string | undefined, displayText: string) => (
    <View style={{ flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: isDarkMode ? '#1f2937' : '#d1d5db' }}>
      <Text style={{ width: 160, fontSize: 14, color: isDarkMode ? '#9ca3af' : '#4b5563' }}>{label}</Text>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
        <Text style={{ flex: 1, color: isDarkMode ? '#ffffff' : '#111827', marginRight: 8 }} numberOfLines={1}>
          {url ? displayText : '-'}
        </Text>
        {url && (
          <Pressable onPress={() => Linking.openURL(url)}>
            <ExternalLink width={16} height={16} color={isDarkMode ? '#ffffff' : '#111827'} />
          </Pressable>
        )}
      </View>
    </View>
  );

  const renderFieldContent = (fieldKey: string) => {
    if (!fieldVisibility[fieldKey]) return null;

    switch (fieldKey) {
      case 'ticketId':
        return renderField('Ticket ID', serviceOrder.ticketId);
      case 'timestamp':
        return renderField('Timestamp', serviceOrder.timestamp);
      case 'accountNumber':
        return (
          <View style={{ flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: isDarkMode ? '#1f2937' : '#d1d5db' }}>
            <Text style={{ width: 160, fontSize: 14, color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Account No.</Text>
            <Text style={{ color: '#ef4444', flex: 1 }}>
              {serviceOrder.accountNumber} | {serviceOrder.fullName} | {serviceOrder.fullAddress}
            </Text>
          </View>
        );
      case 'dateInstalled':
        return renderField('Date Installed', serviceOrder.dateInstalled);
      case 'fullName':
        return renderField('Full Name', serviceOrder.fullName);
      case 'contactNumber':
        return renderField('Contact Number', serviceOrder.contactNumber);
      case 'fullAddress':
        return renderField('Full Address', serviceOrder.fullAddress);
      case 'houseFrontPicture':
        return renderImageField('House Front Picture', serviceOrder.houseFrontPicture, serviceOrder.houseFrontPicture);
      case 'emailAddress':
        return renderField('Email Address', serviceOrder.emailAddress);
      case 'plan':
        return renderField('Plan', serviceOrder.plan);
      case 'affiliate':
        return renderField('Affiliate', serviceOrder.affiliate);
      case 'username':
        return renderField('Username', serviceOrder.username);
      case 'connectionType':
        return renderField('Connection Type', serviceOrder.connectionType);
      case 'routerModemSN':
        return renderField('Router/Modem SN', serviceOrder.routerModemSN);
      case 'lcp':
        return renderField('LCP', serviceOrder.lcp);
      case 'nap':
        return renderField('NAP', serviceOrder.nap);
      case 'port':
        return renderField('PORT', serviceOrder.port);
      case 'vlan':
        return renderField('VLAN', serviceOrder.vlan);
      case 'concern':
        return renderField('Concern', serviceOrder.concern);
      case 'concernRemarks':
        return renderField('Concern Remarks', serviceOrder.concernRemarks);
      case 'visitStatus':
        return (
          <View style={{ flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: isDarkMode ? '#1f2937' : '#d1d5db' }}>
            <Text style={{ width: 160, fontSize: 14, color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Visit Status</Text>
            <Text style={{ flex: 1, fontWeight: 'bold', textTransform: 'uppercase', color: getStatusColor(serviceOrder.visitStatus, 'visit') }}>
              {serviceOrder.visitStatus || '-'}
            </Text>
          </View>
        );
      case 'visitBy':
        return renderField('Visit By', serviceOrder.visitBy);
      case 'visitWith':
        return renderField('Visit With', serviceOrder.visitWith);
      case 'visitWithOther':
        return renderField('Visit With Other', serviceOrder.visitWithOther);
      case 'visitRemarks':
        return renderField('Visit Remarks', serviceOrder.visitRemarks);
      case 'modifiedBy':
        return renderField('Modified By', serviceOrder.modifiedBy);
      case 'modifiedDate':
        return renderField('Modified Date', serviceOrder.modifiedDate);
      case 'userEmail':
        return renderField('User Email', serviceOrder.userEmail);
      case 'requestedBy':
        return renderField('Requested by', serviceOrder.requestedBy);
      case 'assignedEmail':
        return renderField('Assigned Email', serviceOrder.assignedEmail);
      case 'supportRemarks':
        return renderField('Support Remarks', serviceOrder.supportRemarks);
      case 'supportStatus':
        return (
          <View style={{ flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: isDarkMode ? '#1f2937' : '#d1d5db' }}>
            <Text style={{ width: 160, fontSize: 14, color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Support Status</Text>
            <Text style={{ flex: 1, fontWeight: 'bold', textTransform: 'uppercase', color: getStatusColor(serviceOrder.supportStatus, 'support') }}>
              {serviceOrder.supportStatus || '-'}
            </Text>
          </View>
        );
      case 'repairCategory':
        return renderField('Repair Category', serviceOrder.repairCategory);
      case 'priorityLevel':
        return renderField('Priority Level', serviceOrder.priorityLevel);
      case 'newRouterSn':
        return renderField('New Router SN', serviceOrder.newRouterSn);
      case 'newLcpnap':
        return renderField('New LCP/NAP', serviceOrder.newLcpnap);
      case 'newPlan':
        return renderField('New Plan', serviceOrder.newPlan);
      case 'image1Url':
        return renderImageField('Time In Image', serviceOrder.image1Url, 'View Image');
      case 'image2Url':
        return renderImageField('Modem Setup Image', serviceOrder.image2Url, 'View Image');
      case 'image3Url':
        return renderImageField('Time Out Image', serviceOrder.image3Url, 'View Image');
      case 'clientSignatureUrl':
        return renderImageField('Client Signature', serviceOrder.clientSignatureUrl, 'View Signature');
      case 'serviceCharge':
        return (
          <View style={{ flexDirection: 'row', paddingVertical: 8 }}>
            <Text style={{ width: 160, fontSize: 14, color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Service Charge</Text>
            <Text style={{ flex: 1, color: isDarkMode ? '#ffffff' : '#111827' }}>{serviceOrder.serviceCharge}</Text>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={{ height: '100%', flexDirection: 'column', overflow: 'hidden', position: 'relative', borderLeftWidth: !isMobile ? 1 : 0, backgroundColor: isDarkMode ? '#030712' : '#ffffff', borderLeftColor: isDarkMode ? 'rgba(255,255,255,0.3)' : '#d1d5db' }}>
      <View style={{ padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6', borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ fontWeight: '500', maxWidth: isMobile ? 200 : 448, fontSize: isMobile ? 14 : 16, color: isDarkMode ? '#ffffff' : '#111827' }} numberOfLines={1}>
            {serviceOrder.accountNumber} | {serviceOrder.fullName} | {serviceOrder.contactAddress}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable
            style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 2, flexDirection: 'row', alignItems: 'center', backgroundColor: colorPalette?.primary || '#ea580c' }}
            onPress={handleEditClick}
          >
            <Edit width={16} height={16} color="#ffffff" style={{ marginRight: 4 }} />
            <Text style={{ color: '#ffffff' }}>Edit</Text>
          </Pressable>

          <Pressable
            onPress={() => setShowFieldSettings(!showFieldSettings)}
            style={{ position: 'relative' }}
          >
            <Settings width={16} height={16} color={isDarkMode ? '#9ca3af' : '#4b5563'} />
          </Pressable>

          <Pressable onPress={onClose}>
            <X width={18} height={18} color={isDarkMode ? '#9ca3af' : '#4b5563'} />
          </Pressable>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={{ marginHorizontal: 'auto', paddingVertical: 4, paddingHorizontal: 16, backgroundColor: isDarkMode ? '#030712' : '#ffffff' }}>
          <View style={{ gap: 4 }}>
            {fieldOrder.map((fieldKey) => (
              <React.Fragment key={fieldKey}>
                {renderFieldContent(fieldKey)}
              </React.Fragment>
            ))}
          </View>
        </View>
      </ScrollView>

      {showFieldSettings && (
        <Modal
          visible={showFieldSettings}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowFieldSettings(false)}
        >
          <Pressable
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}
            onPress={() => setShowFieldSettings(false)}
          >
            <Pressable
              style={{ width: '90%', maxWidth: 400, borderRadius: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, borderWidth: 1, maxHeight: '80%', backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', borderColor: isDarkMode ? '#374151' : '#e5e7eb' }}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb' }}>
                <Text style={{ fontWeight: '600', color: isDarkMode ? '#ffffff' : '#111827' }}>Field Visibility</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Pressable onPress={selectAllFields}>
                    <Text style={{ color: '#2563eb', fontSize: 12 }}>Show All</Text>
                  </Pressable>
                  <Text style={{ color: isDarkMode ? '#6b7280' : '#9ca3af' }}>|</Text>
                  <Pressable onPress={deselectAllFields}>
                    <Text style={{ color: '#2563eb', fontSize: 12 }}>Hide All</Text>
                  </Pressable>
                  <Text style={{ color: isDarkMode ? '#6b7280' : '#9ca3af' }}>|</Text>
                  <Pressable onPress={resetFieldSettings}>
                    <Text style={{ color: '#2563eb', fontSize: 12 }}>Reset</Text>
                  </Pressable>
                </View>
              </View>
              <ScrollView style={{ padding: 8 }} showsVerticalScrollIndicator={false}>
                {fieldOrder.map((fieldKey) => (
                  <Pressable
                    key={fieldKey}
                    onPress={() => toggleFieldVisibility(fieldKey)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 4 }}
                  >
                    <View style={{ height: 16, width: 16, borderRadius: 4, borderWidth: 1, borderColor: '#d1d5db', backgroundColor: fieldVisibility[fieldKey] ? '#2563eb' : '#ffffff', alignItems: 'center', justifyContent: 'center' }}>
                      {fieldVisibility[fieldKey] && <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: 'bold' }}>✓</Text>}
                    </View>
                    <Text style={{ fontSize: 14, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                      {getFieldLabel(fieldKey)}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
      )}

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

export default ServiceOrderDetails;
