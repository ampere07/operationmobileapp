import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, Modal, Linking, useWindowDimensions, StyleSheet } from 'react-native';
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

const ServiceOrderDetails: React.FC<ServiceOrderDetailsProps> = ({ serviceOrder, onClose, isMobile: propIsMobile = false }) => {
  const { width } = useWindowDimensions();
  const isMobile = propIsMobile || width < 768;
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

  const valueStyle = {
    color: isDarkMode ? '#ffffff' : '#111827',
    fontSize: 16,
  };

  const renderField = (label: string, content: React.ReactNode) => (
    <View style={[styles.fieldContainer, { borderBottomColor: isDarkMode ? '#1f2937' : '#e5e7eb' }]}>
      <Text style={[styles.fieldLabel, { color: isDarkMode ? '#9ca3af' : '#6b7280' }]}>{label}</Text>
      <View style={styles.fieldValueContainer}>
        {typeof content === 'string' ? <Text style={valueStyle} selectable={true}>{content || '-'}</Text> : content}
      </View>
    </View>
  );

  const renderImageLink = (label: string, url: string | undefined | null) => {
    return renderField(label, (
      <View style={styles.imageLinkContainer}>
        <Text style={[styles.imageLinkText, valueStyle]} numberOfLines={1} selectable={true}>
          {url || 'No image available'}
        </Text>
        {url && (
          <Pressable onPress={() => Linking.openURL(url)}>
            <ExternalLink width={16} height={16} color={isDarkMode ? '#9ca3af' : '#4b5563'} />
          </Pressable>
        )}
      </View>
    ));
  };

  const renderFieldContent = (fieldKey: string) => {
    if (!fieldVisibility[fieldKey]) return null;

    switch (fieldKey) {
      case 'ticketId':
        return renderField('Ticket ID', serviceOrder.ticketId);
      case 'timestamp':
        return renderField('Timestamp', serviceOrder.timestamp);
      case 'accountNumber':
        return renderField('Account Details', (
          <Text style={{ color: '#ef4444', fontSize: 16 }} selectable={true}>
            {serviceOrder.accountNumber} | {serviceOrder.fullName} | {serviceOrder.fullAddress}
          </Text>
        ));
      case 'dateInstalled':
        return renderField('Date Installed', serviceOrder.dateInstalled);
      case 'fullName':
        return renderField('Full Name', serviceOrder.fullName);
      case 'contactNumber':
        return renderField('Contact Number', serviceOrder.contactNumber);
      case 'fullAddress':
        return renderField('Full Address', serviceOrder.fullAddress);
      case 'houseFrontPicture':
        return renderImageLink('House Front Picture', serviceOrder.houseFrontPicture);
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
        return renderField('Visit Status', (
          <Text style={{ fontWeight: '600', textTransform: 'uppercase', color: getStatusColor(serviceOrder.visitStatus, 'visit') }} selectable={true}>
            {serviceOrder.visitStatus || '-'}
          </Text>
        ));
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
        return renderField('Support Status', (
          <Text style={{ fontWeight: '600', textTransform: 'uppercase', color: getStatusColor(serviceOrder.supportStatus, 'support') }} selectable={true}>
            {serviceOrder.supportStatus || '-'}
          </Text>
        ));
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
        return renderImageLink('Time In Image', serviceOrder.image1Url);
      case 'image2Url':
        return renderImageLink('Modem Setup Image', serviceOrder.image2Url);
      case 'image3Url':
        return renderImageLink('Time Out Image', serviceOrder.image3Url);
      case 'clientSignatureUrl':
        return renderImageLink('Client Signature', serviceOrder.clientSignatureUrl);
      case 'serviceCharge':
        return renderField('Service Charge', serviceOrder.serviceCharge);
      default:
        return null;
    }
  };

  return (
    <View style={[
      styles.container,
      {
        borderLeftWidth: !isMobile ? 1 : 0,
        backgroundColor: isDarkMode ? '#030712' : '#f9fafb',
        borderLeftColor: isDarkMode ? 'rgba(255,255,255,0.3)' : '#d1d5db'
      }
    ]}>
      {/* Header */}
      <View style={[
        styles.header,
        {
          backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
          borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb'
        }
      ]}>
        <View style={styles.headerTitleContainer}>
          <Text
            style={[
              styles.headerTitle,
              { fontSize: isMobile ? 14 : 18, color: isDarkMode ? '#ffffff' : '#111827' }
            ]}
            numberOfLines={1}
            selectable={true}
          >
            {serviceOrder.accountNumber} | {serviceOrder.fullName}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <Pressable
            style={[styles.headerButton, { backgroundColor: colorPalette?.primary || '#ea580c' }]}
            onPress={handleEditClick}
          >
            <Edit width={16} height={16} color="#ffffff" style={{ marginRight: 4 }} />
            <Text style={styles.headerButtonText}>Edit</Text>
          </Pressable>

          <Pressable
            onPress={() => setShowFieldSettings(!showFieldSettings)}
            style={styles.settingsButton}
          >
            <Settings width={20} height={20} color={isDarkMode ? '#9ca3af' : '#4b5563'} />
          </Pressable>

          <Pressable onPress={onClose}>
            <X width={28} height={28} color={isDarkMode ? '#9ca3af' : '#4b5563'} />
          </Pressable>
        </View>
      </View>

      <ScrollView style={styles.flex1} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {fieldOrder.map((fieldKey) => (
            <React.Fragment key={fieldKey}>
              {renderFieldContent(fieldKey)}
            </React.Fragment>
          ))}
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
            style={styles.modalOverlay}
            onPress={() => setShowFieldSettings(false)}
          >
            <Pressable
              style={[
                styles.modalContent,
                {
                  backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                  borderColor: isDarkMode ? '#374151' : '#e5e7eb'
                }
              ]}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={[styles.modalHeader, { borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb' }]}>
                <Text style={[styles.modalTitle, { color: isDarkMode ? '#ffffff' : '#111827' }]}>Field Visibility</Text>
                <View style={styles.modalHeaderActions}>
                  <Pressable onPress={selectAllFields}>
                    <Text style={styles.modalActionText}>Show All</Text>
                  </Pressable>
                  <Text style={{ color: isDarkMode ? '#6b7280' : '#9ca3af' }}>|</Text>
                  <Pressable onPress={deselectAllFields}>
                    <Text style={styles.modalActionText}>Hide All</Text>
                  </Pressable>
                  <Text style={{ color: isDarkMode ? '#6b7280' : '#9ca3af' }}>|</Text>
                  <Pressable onPress={resetFieldSettings}>
                    <Text style={styles.modalActionText}>Reset</Text>
                  </Pressable>
                </View>
              </View>
              <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
                {fieldOrder.map((fieldKey) => (
                  <Pressable
                    key={fieldKey}
                    onPress={() => toggleFieldVisibility(fieldKey)}
                    style={styles.modalItem}
                  >
                    <View style={[
                      styles.checkbox,
                      {
                        backgroundColor: fieldVisibility[fieldKey] ? (colorPalette?.primary || '#2563eb') : 'transparent',
                        borderColor: isDarkMode ? '#374151' : '#d1d5db'
                      }
                    ]}>
                      {fieldVisibility[fieldKey] && <Text style={styles.checkboxTick}>✓</Text>}
                    </View>
                    <Text style={[styles.modalItemText, { color: isDarkMode ? '#d1d5db' : '#374151' }]}>
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

const styles = StyleSheet.create({
  container: {
    height: '100%',
    flexDirection: 'column',
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  header: {
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButtonText: {
    color: '#ffffff',
    fontWeight: '500',
    fontSize: 14,
  },
  settingsButton: {
    padding: 4,
  },
  flex1: {
    flex: 1,
  },
  content: {
    width: '100%',
    paddingVertical: 8,
  },
  fieldContainer: {
    flexDirection: 'column',
    borderBottomWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 2,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  fieldValueContainer: {
    width: '100%',
  },
  imageLinkContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  imageLinkText: {
    flex: 1,
    marginRight: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 8,
    borderWidth: 1,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontWeight: '600',
  },
  modalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalActionText: {
    color: '#2563eb',
    fontSize: 12,
  },
  modalList: {
    padding: 8,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 4,
  },
  checkbox: {
    height: 18,
    width: 18,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxTick: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalItemText: {
    fontSize: 14,
  },
});

export default ServiceOrderDetails;
