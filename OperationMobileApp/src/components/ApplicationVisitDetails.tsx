import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Linking, Alert, Modal, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ExternalLink, X, Edit, RotateCw, Settings, Check, ArrowDown, ArrowUp } from 'lucide-react-native';
// Revert to original imports to keep functions valid, even if unused directly on UI
import { getApplication } from '../services/applicationService';
import { updateApplicationVisit } from '../services/applicationVisitService';
import MoveToJoModal from '../modals/MoveToJoModal';
import ApplicationVisitFormModal from '../modals/ApplicationVisitFormModal';
// import JOAssignFormModal from '../modals/JOAssignFormModal'; // Not migrated yet, commented out to avoid build error but noted.
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';
import { ApplicationVisitData } from '../services/applicationVisitService';

interface ApplicationVisitDetailsProps {
  visit: any; // Using looser typing to match previous robust version
  onClose: () => void;
  onRefresh?: () => void;
  isMobile?: boolean;
  // Keeping original prop names if any extended ones used, though 'visit' vs 'applicationVisit' mapping is handled
  onUpdate?: () => void; // Alias for onRefresh
}

const ApplicationVisitDetails: React.FC<ApplicationVisitDetailsProps> = ({
  visit: initialVisit,
  onClose,
  onRefresh,
  onUpdate
}) => {
  // --- STATE RESTORATION FROM ORIGINAL FILE (Step 368) ---
  const [applicationVisit, setApplicationVisit] = useState(initialVisit); // Local state for immediate updates
  const [applicationDetails, setApplicationDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMoveConfirmation, setShowMoveConfirmation] = useState(false);

  // Modals
  const [showEditModal, setShowEditModal] = useState(false); // Used for both "Edit Status" and "Edit Visit" in simplified version, mapping to ApplicationVisitFormModal

  const [userRole, setUserRole] = useState<string>('');
  const [showSuccessModal, setShowSuccessModal] = useState(false); // For inline status updates
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [showInlineConfirmation, setShowInlineConfirmation] = useState(false); // For inline status updates
  const [pendingStatusUpdate, setPendingStatusUpdate] = useState<string | null>(null);

  const [isDarkMode, setIsDarkMode] = useState(false);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);

  // Field Config State (Restored)
  const [showFieldSettings, setShowFieldSettings] = useState(false);
  const FIELD_VISIBILITY_KEY = 'applicationVisitDetailsFieldVisibility';
  const FIELD_ORDER_KEY = 'applicationVisitDetailsFieldOrder';

  const defaultFields = [
    'timestamp', 'referredBy', 'fullName', 'contactNumber', 'secondContactNumber',
    'emailAddress', 'address', 'chosenPlan', 'landmark', 'visitBy', 'visitWith',
    'visitWithOther', 'visitType', 'visitStatus', 'visitNotes', 'assignedEmail',
    'applicationStatus', 'modifiedBy', 'modifiedDate', 'houseFrontPicture',
    'image1', 'image2', 'image3'
  ];

  const [fieldVisibility, setFieldVisibility] = useState<Record<string, boolean>>({});
  const [fieldOrder, setFieldOrder] = useState<string[]>(defaultFields);

  // --- EFFECT HOOKS ---

  useEffect(() => {
    setApplicationVisit(initialVisit);
  }, [initialVisit]);

  useEffect(() => {
    const init = async () => {
      const theme = await AsyncStorage.getItem('theme');
      setIsDarkMode(theme !== 'light');
      const palette = await settingsColorPaletteService.getActive();
      setColorPalette(palette);

      const authData = await AsyncStorage.getItem('authData');
      if (authData) {
        try {
          const user = JSON.parse(authData);
          setUserRole(user.role?.toLowerCase() || '');
        } catch (e) { }
      }

      // Restore Field Settings
      const savedVis = await AsyncStorage.getItem(FIELD_VISIBILITY_KEY);
      if (savedVis) {
        setFieldVisibility(JSON.parse(savedVis));
      } else {
        setFieldVisibility(defaultFields.reduce((acc, f) => ({ ...acc, [f]: true }), {}));
      }

      const savedOrder = await AsyncStorage.getItem(FIELD_ORDER_KEY);
      if (savedOrder) {
        setFieldOrder(JSON.parse(savedOrder));
      }
    };
    init();
  }, []);

  // Save Settings
  useEffect(() => {
    const saveSettings = async () => {
      if (Object.keys(fieldVisibility).length > 0) {
        await AsyncStorage.setItem(FIELD_VISIBILITY_KEY, JSON.stringify(fieldVisibility));
      }
      await AsyncStorage.setItem(FIELD_ORDER_KEY, JSON.stringify(fieldOrder));
    };
    saveSettings();
  }, [fieldVisibility, fieldOrder]);

  // Fetch Extra Data
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


  // --- LOGIC FUNCTIONS (Restored) ---

  const handleValuesChange = () => { /* Placeholder if needed for inline editing */ };

  const handleMoveToJO = () => {
    setShowMoveConfirmation(true);
  };

  const handleConfirmMoveToJO = () => {
    setShowMoveConfirmation(false);
    // Original logic opened JOAssignFormModal. 
    // Since we don't have it in RN yet, we show Alert.
    Alert.alert('Coming Soon', 'Job Order Assignment workflow is under construction for mobile.');
  };

  const handleEditVisit = () => { // Maps to opening the form modal
    setShowEditModal(true);
  };

  const handleSaveEditedVisit = (updatedVisit: any) => {
    // Logic from `handleSaveJOForm` or `handleSaveEditedVisit` in original
    setApplicationVisit({ ...applicationVisit, ...updatedVisit });
    if (onUpdate) onUpdate();
    if (onRefresh) onRefresh();
    setShowEditModal(false);
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return 'Not scheduled';
    try { return new Date(dateStr).toLocaleString(); } catch (e) { return dateStr; }
  };

  const getFullName = () => {
    return applicationVisit.full_name ||
      [applicationVisit.first_name, applicationVisit.middle_initial, applicationVisit.last_name].filter(Boolean).join(' ');
  };

  // Status Updates
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

  const handleStatusUpdate = async (newStatus: string | null) => {
    try {
      setLoading(true);
      const authData = await AsyncStorage.getItem('authData');
      let updatedByEmail = null;
      if (authData) {
        const user = JSON.parse(authData);
        updatedByEmail = user.email;
      }

      await updateApplicationVisit(applicationVisit.id, {
        visit_status: newStatus,
        updated_by_user_email: updatedByEmail
      } as any);

      setApplicationVisit({ ...applicationVisit, visit_status: newStatus || '' });
      Alert.alert('Success', newStatus ? `Status updated to ${newStatus}` : 'Status cleared');

      if (onUpdate) onUpdate();
      if (onRefresh) onRefresh();

    } catch (err: any) {
      Alert.alert('Error', 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };


  // Field Settings Logic
  const toggleFieldVisibility = (field: string) => {
    setFieldVisibility((prev: Record<string, boolean>) => ({ ...prev, [field]: !prev[field] }));
  };

  const resetFieldSettings = () => {
    setFieldVisibility(defaultFields.reduce((acc, f) => ({ ...acc, [f]: true }), {}));
    setFieldOrder(defaultFields);
  };

  // --- RENDER HELPERS ---

  const renderFieldContent = (fieldKey: string) => {
    if (!fieldVisibility[fieldKey]) return null;

    // Helper to reduce boilerplate
    const Row = ({ label, value }: { label: string, value: any }) => (
      <View className={`flex-row justify-between py-3 border-b border-gray-100 dark:border-gray-800`}>
        <Text className={`w-1/3 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{label}</Text>
        <Text className={`flex-1 text-right text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{value}</Text>
      </View>
    );

    const ImageRow = ({ label, url }: { label: string, url?: string }) => {
      if (!url) return null;
      return (
        <View className="mb-4 mt-2">
          <Text className={`text-sm mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{label}</Text>
          <TouchableOpacity
            onPress={() => Linking.openURL(url).catch(() => Alert.alert('Error', 'Cannot open image'))}
            className="h-48 bg-gray-200 dark:bg-gray-800 rounded-lg overflow-hidden relative"
          >
            <Image source={{ uri: url }} className="w-full h-full" resizeMode="cover" />
            <View className="absolute bottom-2 right-2 bg-black/60 p-2 rounded-full">
              <ExternalLink size={16} color="white" />
            </View>
          </TouchableOpacity>
        </View>
      );
    }

    switch (fieldKey) {
      case 'timestamp': return <Row label="Timestamp" value={formatDate(applicationVisit.created_at)} />;
      case 'referredBy': return <Row label="Referred By" value={applicationVisit.referred_by || 'Not specified'} />;
      case 'fullName': return <Row label="Full Name" value={getFullName()} />;
      case 'contactNumber': return <Row label="Contact" value={applicationDetails?.mobile_number || 'Not provided'} />;
      case 'secondContactNumber': return <Row label="Second Contact" value={applicationDetails?.secondary_mobile_number || 'Not provided'} />;
      case 'emailAddress': return <Row label="Email" value={applicationDetails?.email_address || 'Not provided'} />;
      case 'address': return <Row label="Address" value={applicationVisit.full_address || 'Not provided'} />;
      case 'chosenPlan': return <Row label="Chosen Plan" value={applicationDetails?.desired_plan || 'Not specified'} />;
      case 'landmark': return <Row label="Landmark" value={applicationDetails?.landmark || 'Not provided'} />;
      case 'visitBy': return <Row label="Visit By" value={applicationVisit.visit_by || 'Not assigned'} />;
      case 'visitWith': return <Row label="Visit With" value={applicationVisit.visit_with || 'None'} />;
      case 'visitWithOther': return <Row label="Visit With (Other)" value={applicationVisit.visit_with_other || 'None'} />;
      case 'visitType': return <Row label="Visit Type" value="Initial Visit" />;

      case 'visitStatus':
        const colorClass =
          (applicationVisit.visit_status?.toLowerCase() === 'completed') ? 'text-green-500' :
            (applicationVisit.visit_status?.toLowerCase() === 'failed') ? 'text-red-500' :
              'text-orange-500';
        return (
          <View className="flex-row justify-between py-3 border-b border-gray-100 dark:border-gray-800">
            <Text className={`w-1/3 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Visit Status</Text>
            <TouchableOpacity onPress={() => handleStatusClick(applicationVisit.visit_status)}>
              {/* Allow clicking to cycle or edit status if logic added, for now just displays */}
              <Text className={`flex-1 text-right text-sm font-bold uppercase ${colorClass}`}>
                {applicationVisit.visit_status || 'Scheduled'}
              </Text>
            </TouchableOpacity>
          </View>
        );

      case 'visitNotes': return <Row label="Visit Notes" value={applicationVisit.visit_remarks || 'No notes'} />;
      case 'assignedEmail': return <Row label="Assigned Email" value={applicationVisit.assigned_email || 'Not assigned'} />;
      case 'applicationStatus': return <Row label="App Status" value={applicationVisit.application_status || applicationDetails?.status || 'Pending'} />;
      case 'modifiedBy': return <Row label="Modified By" value={applicationVisit.updated_by_user_email || 'System'} />;
      case 'modifiedDate': return <Row label="Modified Date" value={formatDate(applicationVisit.updated_at)} />;

      case 'houseFrontPicture': return <ImageRow label="House Front" url={applicationVisit.house_front_picture_url} />;
      case 'image1': return <ImageRow label="Image 1" url={applicationVisit.image1_url} />;
      case 'image2': return <ImageRow label="Image 2" url={applicationVisit.image2_url} />;
      case 'image3': return <ImageRow label="Image 3" url={applicationVisit.image3_url} />;

      default: return null;
    }
  };

  return (
    <View className={`flex-1 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
      {/* Header */}
      <View className={`flex-row items-center justify-between px-4 py-3 border-b ${isDarkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'}`}>
        <View className="flex-1 mr-4">
          <Text className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`} numberOfLines={1}>
            {getFullName()}
          </Text>
          <Text className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            ID: {applicationVisit.id}
          </Text>
        </View>
        <View className="flex-row items-center space-x-2">
          <TouchableOpacity
            onPress={() => setShowFieldSettings(true)}
            className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 mx-1"
          >
            <Settings size={20} color={isDarkMode ? 'white' : 'black'} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleEditVisit} className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 mx-1">
            <Edit size={20} color={isDarkMode ? 'white' : 'black'} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} className="p-2">
            <X size={24} color={isDarkMode ? 'white' : 'black'} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 p-4">
        {/* Dynamic Fields */}
        <View className={`mb-6 p-4 rounded-lg bg-gray-50 dark:bg-gray-800`}>
          {fieldOrder.map(fieldKey => (
            <View key={fieldKey}>
              {renderFieldContent(fieldKey)}
            </View>
          ))}

          {/* Fallback msg if all hidden */}
          {fieldOrder.every(k => !fieldVisibility[k]) && (
            <Text className="text-center text-gray-500 py-4">All fields hidden</Text>
          )}
        </View>

        {/* Actions */}
        <View className="mb-8">
          {applicationVisit.application_status !== 'COMPLETED' && (
            <TouchableOpacity
              onPress={handleMoveToJO}
              className="py-3 rounded-lg items-center mb-3"
              style={{ backgroundColor: colorPalette?.primary || '#ea580c' }}
            >
              <Text className="text-white font-bold">Move to Job Order</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Field Settings Modal */}
      <Modal visible={showFieldSettings} animationType="slide" transparent>
        <View className="flex-1 bg-black/50 justify-end">
          <View className={`h-3/4 rounded-t-xl ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
            <View className="flex-row justify-between items-center p-4 border-b border-gray-200 dark:border-gray-800">
              <Text className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Field Visibility</Text>
              <TouchableOpacity onPress={resetFieldSettings} className="mr-2">
                <RotateCw size={16} color={isDarkMode ? 'white' : 'gray'} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowFieldSettings(false)}>
                <X size={24} color={isDarkMode ? 'white' : 'black'} />
              </TouchableOpacity>
            </View>
            <ScrollView className="p-4">
              <Text className={`mb-4 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Toggle fields to show/hide. Drag & Drop reordering is not supported on mobile unique views yet.
              </Text>
              {defaultFields.map(field => (
                <TouchableOpacity
                  key={field}
                  onPress={() => toggleFieldVisibility(field)}
                  className={`flex-row justify-between items-center py-3 border-b border-gray-100 dark:border-gray-800`}
                >
                  <Text className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                    {field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </Text>
                  {fieldVisibility[field] && <Check size={16} color="green" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modals */}
      <ApplicationVisitFormModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={() => handleSaveEditedVisit({})}
        visitData={applicationVisit}
      />

      <MoveToJoModal // Simple confirmation
        isOpen={showMoveConfirmation}
        title="Move to Job Order"
        message={`Are you sure you want to move ${getFullName()}?`}
        onConfirm={handleConfirmMoveToJO}
        onCancel={() => setShowMoveConfirmation(false)}
      />

      {/* Inline Confirmation for Status Update */}
      {showInlineConfirmation && (
        <Modal visible={true} transparent animationType="fade">
          <View className="flex-1 bg-black/50 justify-center items-center p-4">
            <View className={`w-full max-w-xs p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <Text className={`text-lg font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Update Status?</Text>
              <Text className={`mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Change status to "{pendingStatusUpdate}"?
              </Text>
              <View className="flex-row justify-end space-x-2">
                <TouchableOpacity onPress={() => setShowInlineConfirmation(false)} className="px-4 py-2">
                  <Text className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleConfirmStatusUpdate} className="px-4 py-2 bg-blue-500 rounded">
                  <Text className="text-white">Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

    </View>
  );
};

export default ApplicationVisitDetails;
