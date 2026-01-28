import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Pressable, Linking } from 'react-native';
import { 
  X, ExternalLink, Edit, XOctagon, RotateCw, Settings
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApplication } from '../services/applicationService';
import { updateApplicationVisit } from '../services/applicationVisitService';
import ConfirmationModal from '../modals/MoveToJoModal';
import JOAssignFormModal from '../modals/JOAssignFormModal';
import ApplicationVisitStatusModal from '../modals/ApplicationVisitStatusModal';
import { JobOrderData } from '../services/jobOrderService';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';

interface ApplicationVisitDetailsProps {
  applicationVisit: {
    id: string;
    application_id: string;
    timestamp?: string;
    assigned_email?: string;
    visit_by?: string;
    visit_with?: string;
    visit_with_other?: string;
    visit_status?: string;
    visit_remarks?: string;
    status_remarks?: string;
    application_status?: string;
    full_name: string;
    full_address: string;
    referred_by?: string;
    updated_by_user_email: string;
    created_at?: string;
    updated_at?: string;
    first_name?: string;
    middle_initial?: string;
    last_name?: string;
    house_front_picture_url?: string;
    image1_url?: string;
    image2_url?: string;
    image3_url?: string;
    [key: string]: any;
  };
  onClose: () => void;
  onUpdate?: () => void;
  isMobile?: boolean;
}

const ApplicationVisitDetails: React.FC<ApplicationVisitDetailsProps> = ({ applicationVisit, onClose, onUpdate, isMobile = false }) => {
  const [applicationDetails, setApplicationDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMoveConfirmation, setShowMoveConfirmation] = useState(false);
  const [showJOAssignForm, setShowJOAssignForm] = useState(false);
  const [showEditStatusModal, setShowEditStatusModal] = useState(false);
  const [currentVisitData, setCurrentVisitData] = useState(applicationVisit);
  const [userRole, setUserRole] = useState<string>('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [showInlineConfirmation, setShowInlineConfirmation] = useState(false);
  const [pendingStatusUpdate, setPendingStatusUpdate] = useState<string | null>(null);
  const [detailsWidth, setDetailsWidth] = useState<number>(600);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);
  const [showFieldSettings, setShowFieldSettings] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const FIELD_VISIBILITY_KEY = 'applicationVisitDetailsFieldVisibility';
  const FIELD_ORDER_KEY = 'applicationVisitDetailsFieldOrder';

  const defaultFields = [
    'timestamp',
    'referredBy',
    'fullName',
    'contactNumber',
    'secondContactNumber',
    'emailAddress',
    'address',
    'chosenPlan',
    'landmark',
    'visitBy',
    'visitWith',
    'visitWithOther',
    'visitType',
    'visitStatus',
    'visitNotes',
    'assignedEmail',
    'applicationStatus',
    'modifiedBy',
    'modifiedDate',
    'houseFrontPicture',
    'image1',
    'image2',
    'image3'
  ];

  const [fieldVisibility, setFieldVisibility] = useState<Record<string, boolean>>({});
  const [fieldOrder, setFieldOrder] = useState<string[]>(defaultFields);

  useEffect(() => {
    const loadFieldSettings = async () => {
      try {
        const savedVisibility = await AsyncStorage.getItem(FIELD_VISIBILITY_KEY);
        const savedOrder = await AsyncStorage.getItem(FIELD_ORDER_KEY);
        
        if (savedVisibility) {
          setFieldVisibility(JSON.parse(savedVisibility));
        } else {
          const allVisible: Record<string, boolean> = defaultFields.reduce((acc: Record<string, boolean>, field) => ({ ...acc, [field]: true }), {});
          setFieldVisibility(allVisible);
        }
        
        if (savedOrder) {
          setFieldOrder(JSON.parse(savedOrder));
        }
      } catch (error) {
        const allVisible: Record<string, boolean> = defaultFields.reduce((acc: Record<string, boolean>, field) => ({ ...acc, [field]: true }), {});
        setFieldVisibility(allVisible);
      }
    };
    loadFieldSettings();
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

  useEffect(() => {
    const loadTheme = async () => {
      const theme = await AsyncStorage.getItem('theme');
      setIsDarkMode(theme === 'dark');
    };
    loadTheme();
  }, []);

  useEffect(() => {
    const loadUserRole = async () => {
      const authData = await AsyncStorage.getItem('authData');
      if (authData) {
        try {
          const user = JSON.parse(authData);
          setUserRole(user.role?.toLowerCase() || '');
        } catch (error) {
          // Error parsing user data
        }
      }
    };
    loadUserRole();
  }, []);

  useEffect(() => {
    setCurrentVisitData(applicationVisit);
  }, [applicationVisit]);

  useEffect(() => {
    const fetchApplicationData = async () => {
      if (!applicationVisit.application_id) return;
      
      try {
        setLoading(true);
        const appData = await getApplication(applicationVisit.application_id);
        setApplicationDetails(appData);
      } catch (err: any) {
        setError(`Failed to load application data: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchApplicationData();
  }, [applicationVisit.application_id]);

  const handleMoveToJO = () => {
    setShowMoveConfirmation(true);
  };

  const handleConfirmMoveToJO = () => {
    setShowMoveConfirmation(false);
    setShowJOAssignForm(true);
  };

  const handleSaveJOForm = (formData: JobOrderData) => {
    setShowJOAssignForm(false);
    if (onUpdate) {
      onUpdate();
    }
  };

  const handleEditVisit = () => {
    setShowEditStatusModal(true);
  };

  const handleSaveEditedVisit = (updatedVisit: any) => {
    setCurrentVisitData({ ...currentVisitData, ...updatedVisit });
    setShowEditStatusModal(false);
    if (onUpdate) {
      onUpdate();
    }
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return 'Not scheduled';
    try {
      return new Date(dateStr).toLocaleString();
    } catch (e) {
      return dateStr;
    }
  };

  const getFullName = () => {
    return currentVisitData.full_name || `${currentVisitData.first_name || ''} ${currentVisitData.middle_initial || ''} ${currentVisitData.last_name || ''}`.trim();
  };

  const handleStatusClick = (newStatus: string | null) => {
    setPendingStatusUpdate(newStatus);
    setShowInlineConfirmation(true);
  };

  const handleConfirmStatusUpdate = async () => {
    setShowInlineConfirmation(false);
    const newStatus = pendingStatusUpdate;
    setPendingStatusUpdate(null);
    
    if (newStatus === undefined) return;
    
    await handleStatusUpdate(newStatus);
  };

  const handleCancelStatusUpdate = () => {
    setShowInlineConfirmation(false);
    setPendingStatusUpdate(null);
  };

  const handleStatusUpdate = async (newStatus: string | null) => {
    try {
      setLoading(true);
      setError(null);
      
      const authData = await AsyncStorage.getItem('authData');
      let updatedByEmail = null;
      
      if (authData) {
        try {
          const user = JSON.parse(authData);
          updatedByEmail = user.email;
        } catch (error) {
          // Error parsing auth data
        }
      }
      
      await updateApplicationVisit(applicationVisit.id, { 
        visit_status: newStatus,
        updated_by_user_email: updatedByEmail
      });
      
      setCurrentVisitData({ ...currentVisitData, visit_status: newStatus || '' });
      
      const statusMessage = newStatus ? `Status updated to ${newStatus}` : 'Status cleared successfully';
      setSuccessMessage(statusMessage);
      setShowSuccessModal(true);
      
      if (onUpdate) {
        onUpdate();
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Unknown error occurred';
      setError(`Failed to update status: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const getFieldLabel = (fieldKey: string): string => {
    const labels: Record<string, string> = {
      timestamp: 'Timestamp',
      referredBy: 'Referred By',
      fullName: 'Full Name',
      contactNumber: 'Contact Number',
      secondContactNumber: 'Second Contact Number',
      emailAddress: 'Email Address',
      address: 'Address',
      chosenPlan: 'Chosen Plan',
      landmark: 'Landmark',
      visitBy: 'Visit By',
      visitWith: 'Visit With',
      visitWithOther: 'Visit With (Other)',
      visitType: 'Visit Type',
      visitStatus: 'Visit Status',
      visitNotes: 'Visit Notes',
      assignedEmail: 'Assigned Email',
      applicationStatus: 'Application Status',
      modifiedBy: 'Modified By',
      modifiedDate: 'Modified Date',
      houseFrontPicture: 'House Front Picture',
      image1: 'Image 1',
      image2: 'Image 2',
      image3: 'Image 3'
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

  const getStatusColor = (status?: string) => {
    if (!status) return '#fb923c';
    
    switch (status.toLowerCase()) {
      case 'completed':
      case 'scheduled':
        return '#4ade80';
      case 'failed':
      case 'cancelled':
        return '#ef4444';
      case 'in progress':
        return '#60a5fa';
      case 'pending':
        return '#fb923c';
      case 'approved':
      case 'schedule':
        return '#4ade80';
      case 'no facility':
        return '#f87171';
      case 'no slot':
        return '#c084fc';
      case 'duplicate':
        return '#f472b6';
      default:
        return '#fb923c';
    }
  };

  const renderFieldContent = (fieldKey: string) => {
    if (!fieldVisibility[fieldKey]) return null;

    switch (fieldKey) {
      case 'timestamp':
        return (
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, paddingBottom: 16, borderBottomColor: isDarkMode ? '#1f2937' : '#e5e7eb' }}>
            <Text style={{ width: 160, fontSize: 14, color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Timestamp:</Text>
            <Text style={{ flex: 1, color: isDarkMode ? '#ffffff' : '#111827' }}>{formatDate(currentVisitData.created_at) || 'Not available'}</Text>
          </View>
        );

      case 'referredBy':
        return (
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, paddingBottom: 16, borderBottomColor: isDarkMode ? '#1f2937' : '#e5e7eb' }}>
            <Text style={{ width: 160, fontSize: 14, color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Referred By:</Text>
            <Text style={{ flex: 1, color: isDarkMode ? '#ffffff' : '#111827' }}>{currentVisitData.referred_by || 'Not specified'}</Text>
          </View>
        );

      case 'fullName':
        return (
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, paddingBottom: 16, borderBottomColor: isDarkMode ? '#1f2937' : '#e5e7eb' }}>
            <Text style={{ width: 160, fontSize: 14, color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Full Name:</Text>
            <Text style={{ flex: 1, color: isDarkMode ? '#ffffff' : '#111827' }}>{getFullName()}</Text>
          </View>
        );

      case 'contactNumber':
        return (
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, paddingBottom: 16, borderBottomColor: isDarkMode ? '#1f2937' : '#e5e7eb' }}>
            <Text style={{ width: 160, fontSize: 14, color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Contact Number:</Text>
            <Text style={{ flex: 1, color: isDarkMode ? '#ffffff' : '#111827' }}>
              {applicationDetails?.mobile_number || 'Not provided'}
            </Text>
          </View>
        );

      case 'secondContactNumber':
        return (
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, paddingBottom: 16, borderBottomColor: isDarkMode ? '#1f2937' : '#e5e7eb' }}>
            <Text style={{ width: 160, fontSize: 14, color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Second Contact Number:</Text>
            <Text style={{ flex: 1, color: isDarkMode ? '#ffffff' : '#111827' }}>
              {applicationDetails?.secondary_mobile_number || 'Not provided'}
            </Text>
          </View>
        );

      case 'emailAddress':
        return (
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, paddingBottom: 16, borderBottomColor: isDarkMode ? '#1f2937' : '#e5e7eb' }}>
            <Text style={{ width: 160, fontSize: 14, color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Email Address:</Text>
            <Text style={{ flex: 1, color: isDarkMode ? '#ffffff' : '#111827' }}>
              {applicationDetails?.email_address || 'Not provided'}
            </Text>
          </View>
        );

      case 'address':
        return (
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, paddingBottom: 16, borderBottomColor: isDarkMode ? '#1f2937' : '#e5e7eb' }}>
            <Text style={{ width: 160, fontSize: 14, color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Address:</Text>
            <Text style={{ flex: 1, color: isDarkMode ? '#ffffff' : '#111827' }}>{currentVisitData.full_address || 'Not provided'}</Text>
          </View>
        );

      case 'chosenPlan':
        return (
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, paddingBottom: 16, borderBottomColor: isDarkMode ? '#1f2937' : '#e5e7eb' }}>
            <Text style={{ width: 160, fontSize: 14, color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Chosen Plan:</Text>
            <Text style={{ flex: 1, color: isDarkMode ? '#ffffff' : '#111827' }}>
              {applicationDetails?.desired_plan || 'Not specified'}
            </Text>
          </View>
        );

      case 'landmark':
        return (
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, paddingBottom: 16, borderBottomColor: isDarkMode ? '#1f2937' : '#e5e7eb' }}>
            <Text style={{ width: 160, fontSize: 14, color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Landmark:</Text>
            <Text style={{ flex: 1, color: isDarkMode ? '#ffffff' : '#111827' }}>{applicationDetails?.landmark || 'Not provided'}</Text>
          </View>
        );

      case 'visitBy':
        return (
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, paddingBottom: 16, borderBottomColor: isDarkMode ? '#1f2937' : '#e5e7eb' }}>
            <Text style={{ width: 160, fontSize: 14, color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Visit By:</Text>
            <Text style={{ flex: 1, color: isDarkMode ? '#ffffff' : '#111827' }}>{currentVisitData.visit_by || 'Not assigned'}</Text>
          </View>
        );

      case 'visitWith':
        return (
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, paddingBottom: 16, borderBottomColor: isDarkMode ? '#1f2937' : '#e5e7eb' }}>
            <Text style={{ width: 160, fontSize: 14, color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Visit With:</Text>
            <Text style={{ flex: 1, color: isDarkMode ? '#ffffff' : '#111827' }}>
              {currentVisitData.visit_with || 'None'}
            </Text>
          </View>
        );

      case 'visitWithOther':
        return (
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, paddingBottom: 16, borderBottomColor: isDarkMode ? '#1f2937' : '#e5e7eb' }}>
            <Text style={{ width: 160, fontSize: 14, color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Visit With (Other):</Text>
            <Text style={{ flex: 1, color: isDarkMode ? '#ffffff' : '#111827' }}>
              {currentVisitData.visit_with_other || 'None'}
            </Text>
          </View>
        );

      case 'visitType':
        return (
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, paddingBottom: 16, borderBottomColor: isDarkMode ? '#1f2937' : '#e5e7eb' }}>
            <Text style={{ width: 160, fontSize: 14, color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Visit Type:</Text>
            <Text style={{ flex: 1, color: isDarkMode ? '#ffffff' : '#111827' }}>Initial Visit</Text>
          </View>
        );

      case 'visitStatus':
        return (
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, paddingBottom: 16, borderBottomColor: isDarkMode ? '#1f2937' : '#e5e7eb' }}>
            <Text style={{ width: 160, fontSize: 14, color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Visit Status:</Text>
            <Text style={{ flex: 1, textTransform: 'capitalize', color: getStatusColor(currentVisitData.visit_status) }}>
              {currentVisitData.visit_status || 'Scheduled'}
            </Text>
          </View>
        );

      case 'visitNotes':
        return (
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, paddingBottom: 16, borderBottomColor: isDarkMode ? '#1f2937' : '#e5e7eb' }}>
            <Text style={{ width: 160, fontSize: 14, color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Visit Notes:</Text>
            <Text style={{ flex: 1, color: isDarkMode ? '#ffffff' : '#111827' }}>{currentVisitData.visit_remarks || 'No notes'}</Text>
          </View>
        );

      case 'assignedEmail':
        return (
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, paddingBottom: 16, borderBottomColor: isDarkMode ? '#1f2937' : '#e5e7eb' }}>
            <Text style={{ width: 160, fontSize: 14, color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Assigned Email:</Text>
            <Text style={{ flex: 1, color: isDarkMode ? '#ffffff' : '#111827' }}>
              {currentVisitData.assigned_email || 'Not assigned'}
            </Text>
          </View>
        );

      case 'applicationStatus':
        return (
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, paddingBottom: 16, borderBottomColor: isDarkMode ? '#1f2937' : '#e5e7eb' }}>
            <Text style={{ width: 160, fontSize: 14, color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Application Status:</Text>
            <Text style={{ flex: 1, textTransform: 'capitalize', color: getStatusColor(currentVisitData.application_status || applicationDetails?.status) }}>
              {currentVisitData.application_status || applicationDetails?.status || 'Pending'}
            </Text>
          </View>
        );

      case 'modifiedBy':
        return (
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, paddingBottom: 16, borderBottomColor: isDarkMode ? '#1f2937' : '#e5e7eb' }}>
            <Text style={{ width: 160, fontSize: 14, color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Modified By:</Text>
            <Text style={{ flex: 1, color: isDarkMode ? '#ffffff' : '#111827' }}>{currentVisitData.updated_by_user_email || 'System'}</Text>
          </View>
        );

      case 'modifiedDate':
        return (
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, paddingBottom: 16, borderBottomColor: isDarkMode ? '#1f2937' : '#e5e7eb' }}>
            <Text style={{ width: 160, fontSize: 14, color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Modified Date:</Text>
            <Text style={{ flex: 1, color: isDarkMode ? '#ffffff' : '#111827' }}>
              {formatDate(currentVisitData.updated_at) || 'Not modified'}
            </Text>
          </View>
        );

      case 'houseFrontPicture':
        return (
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, paddingVertical: 8, borderBottomColor: isDarkMode ? '#1f2937' : '#e5e7eb' }}>
            <Text style={{ width: 160, fontSize: 14, color: isDarkMode ? '#9ca3af' : '#4b5563' }}>House Front Picture</Text>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text numberOfLines={1} style={{ flex: 1, marginRight: 8, color: isDarkMode ? '#ffffff' : '#111827' }}>
                {currentVisitData.house_front_picture_url || 'No image available'}
              </Text>
              {currentVisitData.house_front_picture_url && (
                <Pressable onPress={() => Linking.openURL(currentVisitData.house_front_picture_url)}>
                  <ExternalLink size={16} color={isDarkMode ? '#9ca3af' : '#4b5563'} />
                </Pressable>
              )}
            </View>
          </View>
        );

      case 'image1':
        return (
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, paddingVertical: 8, borderBottomColor: isDarkMode ? '#1f2937' : '#e5e7eb' }}>
            <Text style={{ width: 160, fontSize: 14, color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Image 1</Text>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text numberOfLines={1} style={{ flex: 1, marginRight: 8, color: isDarkMode ? '#ffffff' : '#111827' }}>
                {currentVisitData.image1_url || 'No image available'}
              </Text>
              {currentVisitData.image1_url && (
                <Pressable onPress={() => Linking.openURL(currentVisitData.image1_url)}>
                  <ExternalLink size={16} color={isDarkMode ? '#9ca3af' : '#4b5563'} />
                </Pressable>
              )}
            </View>
          </View>
        );

      case 'image2':
        return (
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, paddingVertical: 8, borderBottomColor: isDarkMode ? '#1f2937' : '#e5e7eb' }}>
            <Text style={{ width: 160, fontSize: 14, color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Image 2</Text>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text numberOfLines={1} style={{ flex: 1, marginRight: 8, color: isDarkMode ? '#ffffff' : '#111827' }}>
                {currentVisitData.image2_url || 'No image available'}
              </Text>
              {currentVisitData.image2_url && (
                <Pressable onPress={() => Linking.openURL(currentVisitData.image2_url)}>
                  <ExternalLink size={16} color={isDarkMode ? '#9ca3af' : '#4b5563'} />
                </Pressable>
              )}
            </View>
          </View>
        );

      case 'image3':
        return (
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, paddingVertical: 8, borderBottomColor: isDarkMode ? '#1f2937' : '#e5e7eb' }}>
            <Text style={{ width: 160, fontSize: 14, color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Image 3</Text>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text numberOfLines={1} style={{ flex: 1, marginRight: 8, color: isDarkMode ? '#ffffff' : '#111827' }}>
                {currentVisitData.image3_url || 'No image available'}
              </Text>
              {currentVisitData.image3_url && (
                <Pressable onPress={() => Linking.openURL(currentVisitData.image3_url)}>
                  <ExternalLink size={16} color={isDarkMode ? '#9ca3af' : '#4b5563'} />
                </Pressable>
              )}
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={{ height: '100%', flexDirection: 'column', overflow: 'hidden', position: 'relative', width: '100%', backgroundColor: isDarkMode ? '#030712' : '#f9fafb', borderLeftWidth: isMobile ? 0 : 1, borderLeftColor: isDarkMode ? 'rgba(255, 255, 255, 0.3)' : '#d1d5db' }}>
      <View style={{ padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ fontWeight: '500', color: isDarkMode ? '#ffffff' : '#111827', fontSize: isMobile ? 14 : 16, maxWidth: isMobile ? 200 : undefined }}>{getFullName()}</Text>
          {loading && <Text style={{ marginLeft: 12, fontSize: 14, color: isDarkMode ? '#f97316' : '#ea580c' }}>Loading...</Text>}
        </View>
        
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {userRole !== 'technician' && userRole === 'administrator' && (
            <Pressable 
              style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 2, flexDirection: 'row', alignItems: 'center', backgroundColor: colorPalette?.primary || '#ea580c' }}
              onPress={handleMoveToJO}
            >
              <Text style={{ color: '#ffffff' }}>Move to JO</Text>
            </Pressable>
          )}
          <Pressable 
            style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 2, flexDirection: 'row', alignItems: 'center', backgroundColor: colorPalette?.primary || '#ea580c' }}
            onPress={handleEditVisit}
          >
            <Edit size={16} color="#ffffff" style={{ marginRight: 4 }} />
            <Text style={{ color: '#ffffff' }}>Visit Status</Text>
          </Pressable>
          
          <View style={{ position: 'relative' }}>
            <Pressable onPress={() => setShowFieldSettings(!showFieldSettings)}>
              <Settings size={16} color={isDarkMode ? '#9ca3af' : '#4b5563'} />
            </Pressable>
            {showFieldSettings && (
              <View style={{ position: 'absolute', right: 0, marginTop: 8, width: 320, borderRadius: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 5, borderWidth: 1, zIndex: 50, maxHeight: 384, backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', borderColor: isDarkMode ? '#374151' : '#e5e7eb' }}>
                <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb' }}>
                  <Text style={{ fontWeight: '600', color: isDarkMode ? '#ffffff' : '#111827' }}>Field Visibility & Order</Text>
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
                <ScrollView style={{ padding: 8 }}>
                  <Text style={{ fontSize: 12, marginBottom: 8, paddingHorizontal: 8, color: isDarkMode ? '#9ca3af' : '#6b7280' }}>
                    Drag to reorder fields
                  </Text>
                  {fieldOrder.map((fieldKey, index) => (
                    <Pressable
                      key={fieldKey}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 4, backgroundColor: isDarkMode ? '#374151' : '#f3f4f6' }}
                      onPress={() => toggleFieldVisibility(fieldKey)}
                    >
                      <Text style={{ fontSize: 12, color: isDarkMode ? '#6b7280' : '#9ca3af' }}>☰</Text>
                      <Text style={{ fontSize: 14, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                        {fieldVisibility[fieldKey] ? '✓' : '○'} {getFieldLabel(fieldKey)}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
          
          <Pressable onPress={onClose}>
            <X size={18} color={isDarkMode ? '#9ca3af' : '#4b5563'} />
          </Pressable>
        </View>
      </View>
      
      {userRole !== 'technician' && userRole === 'administrator' && (
        <View style={{ paddingVertical: 12, borderBottomWidth: 1, backgroundColor: isDarkMode ? '#111827' : '#f3f4f6', borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, gap: 16 }}>
            <Pressable 
              style={{ flexDirection: 'column', alignItems: 'center', padding: 8, borderRadius: 6 }}
              onPress={() => handleStatusClick('Failed')}
              disabled={loading}
            >
              <View style={{ padding: 8, borderRadius: 9999, backgroundColor: loading ? '#4b5563' : (colorPalette?.primary || '#ea580c') }}>
                <XOctagon size={18} color="#ffffff" />
              </View>
              <Text style={{ fontSize: 12, marginTop: 4, color: isDarkMode ? '#d1d5db' : '#374151' }}>Failed</Text>
            </Pressable>
            
            <Pressable 
              style={{ flexDirection: 'column', alignItems: 'center', padding: 8, borderRadius: 6 }}
              onPress={() => handleStatusClick('In Progress')}
              disabled={loading}
            >
              <View style={{ padding: 8, borderRadius: 9999, backgroundColor: loading ? '#4b5563' : (colorPalette?.primary || '#ea580c') }}>
                <RotateCw size={18} color="#ffffff" />
              </View>
              <Text style={{ fontSize: 12, marginTop: 4, color: isDarkMode ? '#d1d5db' : '#374151' }}>Visit In Progress</Text>
            </Pressable>
          </View>
        </View>
      )}
      
      {showInlineConfirmation && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <View style={{ borderRadius: 8, padding: 24, maxWidth: 448, width: '100%', marginHorizontal: 16, borderWidth: 1, backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', borderColor: isDarkMode ? '#374151' : '#d1d5db' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <View style={{ padding: 8, borderRadius: 9999, marginRight: 12, backgroundColor: colorPalette?.primary || '#ea580c' }}>
                {pendingStatusUpdate === 'Failed' ? (
                  <XOctagon size={20} color="#ffffff" />
                ) : (
                  <RotateCw size={20} color="#ffffff" />
                )}
              </View>
              <Text style={{ fontSize: 20, fontWeight: '600', color: isDarkMode ? '#ffffff' : '#111827' }}>Confirm Status Change</Text>
            </View>
            <Text style={{ marginBottom: 24, color: isDarkMode ? '#d1d5db' : '#374151' }}>
              {pendingStatusUpdate === 'Failed'
                ? 'Are you sure you want to mark this visit as "Failed"?'
                : 'Are you sure you want to mark this visit as "In Progress"?'
              }
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
              <Pressable
                onPress={handleCancelStatusUpdate}
                style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 4, backgroundColor: isDarkMode ? '#374151' : '#e5e7eb' }}
              >
                <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleConfirmStatusUpdate}
                style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 4, backgroundColor: colorPalette?.primary || '#ea580c' }}
              >
                <Text style={{ color: '#ffffff' }}>Confirm</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {error && (
        <View style={{ padding: 12, margin: 12, borderRadius: 4, backgroundColor: isDarkMode ? 'rgba(127, 29, 29, 0.2)' : '#fee2e2', borderWidth: 1, borderColor: isDarkMode ? '#991b1b' : '#fca5a5' }}>
          <Text style={{ color: isDarkMode ? '#fca5a5' : '#991b1b' }}>{error}</Text>
        </View>
      )}
      
      <ScrollView style={{ flex: 1 }}>
        <View style={{ maxWidth: 672, marginHorizontal: 'auto', paddingVertical: 24, paddingHorizontal: 16, backgroundColor: isDarkMode ? '#030712' : '#f9fafb' }}>
          <View style={{ gap: 16 }}>
            {fieldOrder.map((fieldKey) => (
              <React.Fragment key={fieldKey}>
                {renderFieldContent(fieldKey)}
              </React.Fragment>
            ))}
          </View>
        </View>
      </ScrollView>

      <ConfirmationModal
        isOpen={showMoveConfirmation}
        title="Confirm"
        message="Are you sure you want to move this application to JO?"
        confirmText="Move to JO"
        cancelText="Cancel"
        onConfirm={handleConfirmMoveToJO}
        onCancel={() => setShowMoveConfirmation(false)}
      />

      <JOAssignFormModal
        isOpen={showJOAssignForm}
        onClose={() => setShowJOAssignForm(false)}
        onSave={handleSaveJOForm}
        applicationData={{
          id: currentVisitData.application_id,
          referred_by: applicationDetails?.referred_by || currentVisitData.referred_by,
          first_name: applicationDetails?.first_name || currentVisitData.first_name,
          middle_initial: applicationDetails?.middle_initial || currentVisitData.middle_initial,
          last_name: applicationDetails?.last_name || currentVisitData.last_name,
          email_address: applicationDetails?.email_address,
          mobile_number: applicationDetails?.mobile_number,
          secondary_mobile_number: applicationDetails?.secondary_mobile_number,
          installation_address: applicationDetails?.installation_address || currentVisitData.full_address?.split(',')[0]?.trim() || '',
          barangay: applicationDetails?.barangay,
          city: applicationDetails?.city,
          region: applicationDetails?.region,
          location: applicationDetails?.location,
          desired_plan: applicationDetails?.desired_plan,
          landmark: applicationDetails?.landmark,
          house_front_picture_url: currentVisitData.house_front_picture_url || applicationDetails?.house_front_picture_url,
        }}
      />

      <ApplicationVisitStatusModal
        isOpen={showEditStatusModal}
        onClose={() => setShowEditStatusModal(false)}
        onSave={handleSaveEditedVisit}
        visitData={{
          id: currentVisitData.id,
          application_id: currentVisitData.application_id,
          first_name: applicationDetails?.first_name || currentVisitData.first_name || '',
          middle_initial: applicationDetails?.middle_initial || currentVisitData.middle_initial || '',
          last_name: applicationDetails?.last_name || currentVisitData.last_name || '',
          contact_number: applicationDetails?.mobile_number || '',
          second_contact_number: applicationDetails?.secondary_mobile_number || '',
          email_address: applicationDetails?.email_address || '',
          address: currentVisitData.full_address || '',
          barangay: applicationDetails?.barangay || '',
          city: applicationDetails?.city || '',
          region: applicationDetails?.region || '',
          location: applicationDetails?.location || '',
          choose_plan: applicationDetails?.desired_plan || '',
          visit_remarks: currentVisitData.visit_remarks || '',
          status_remarks: currentVisitData.status_remarks || '',
          visit_notes: currentVisitData.visit_remarks || '',
          assigned_email: currentVisitData.assigned_email || '',
          visit_by: currentVisitData.visit_by || '',
          visit_with: currentVisitData.visit_with || '',
          visit_with_other: currentVisitData.visit_with_other || '',
          application_status: currentVisitData.application_status || '',
          visit_status: currentVisitData.visit_status || '',
          image1_url: currentVisitData.image1_url || '',
          image2_url: currentVisitData.image2_url || '',
          image3_url: currentVisitData.image3_url || ''
        }}
      />

      <ConfirmationModal
        isOpen={showSuccessModal}
        title="Success"
        message={successMessage}
        confirmText="OK"
        cancelText="Close"
        onConfirm={() => setShowSuccessModal(false)}
        onCancel={() => setShowSuccessModal(false)}
      />
    </View>
  );
};

export default ApplicationVisitDetails;
