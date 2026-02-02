import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  Dimensions,
  Image,
  TextInput,
  Modal
} from 'react-native';
import {
  X,
  ExternalLink,
  Edit,
  Settings,
  Menu,
  Check
} from 'lucide-react-native';
// @ts-ignore
import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateJobOrder, approveJobOrder } from '../services/jobOrderService';
import { getBillingStatuses, BillingStatus } from '../services/lookupService';
import { JobOrderDetailsProps } from '../types/jobOrder';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';

// Imported Modals
import JobOrderDoneFormModal from '../modals/JobOrderDoneFormModal';
import JobOrderEditFormModal from '../modals/JobOrderEditFormModal';
import ApprovalConfirmationModal from '../modals/ApprovalConfirmationModal';

// Placeholder for Tech Modal as it is likely similar to Done Modal or not yet migrated
const JobOrderDoneFormTechModal = ({ isOpen, onClose }: any) => null;

const ConfirmationModal = ({ isOpen, title, message, onConfirm, onCancel }: any) => (
  <Modal visible={isOpen} transparent animationType="fade">
    <View className="flex-1 bg-black/50 justify-center items-center p-4">
      <View className="bg-white dark:bg-gray-900 p-6 rounded-lg w-full max-w-sm">
        <Text className="text-xl font-bold mb-2 dark:text-white">{title}</Text>
        <Text className="mb-4 dark:text-gray-300">{message}</Text>
        <View className="flex-row justify-end space-x-2">
          <TouchableOpacity onPress={onCancel} className="bg-gray-200 dark:bg-gray-700 px-4 py-2 rounded">
            <Text className="dark:text-white">Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onConfirm} className="bg-blue-600 px-4 py-2 rounded">
            <Text className="text-white">Confirm</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

const JobOrderDetails: React.FC<JobOrderDetailsProps> = ({ jobOrder, onClose, onRefresh, isMobile = false }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [isDoneModalOpen, setIsDoneModalOpen] = useState(false);
  const [isDoneTechModalOpen, setIsDoneTechModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);

  const [billingStatuses, setBillingStatuses] = useState<BillingStatus[]>([]);
  const [userRole, setUserRole] = useState<string>('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Field settings
  const [showFieldSettings, setShowFieldSettings] = useState(false);
  const FIELD_VISIBILITY_KEY = 'jobOrderDetailsFieldVisibility';
  const defaultFields = [
    'timestamp', 'jobOrderNumber', 'referredBy', 'fullName', 'contactNumber',
    'fullAddress', 'billingStatus', 'choosePlan', 'statusRemarks', 'remarks',
    'connectionType', 'routerModel', 'dateInstalled', 'visitBy', 'onsiteStatus',
    'setupImage', 'speedtestImage'
  ];

  const [fieldVisibility, setFieldVisibility] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const init = async () => {
      try {
        const theme = await AsyncStorage.getItem('theme');
        setIsDarkMode(theme !== 'light');

        const authData = await AsyncStorage.getItem('authData');
        if (authData) {
          const userData = JSON.parse(authData);
          setUserRole(userData.role?.toLowerCase() || '');
        }

        const activePalette = await settingsColorPaletteService.getActive();
        setColorPalette(activePalette);

        const statuses = await getBillingStatuses();
        setBillingStatuses(statuses || []);

        const savedVisibility = await AsyncStorage.getItem(FIELD_VISIBILITY_KEY);
        if (savedVisibility) {
          setFieldVisibility(JSON.parse(savedVisibility));
        } else {
          const allVisible = defaultFields.reduce((acc: any, field) => ({ ...acc, [field]: true }), {});
          setFieldVisibility(allVisible);
        }
      } catch (e) { console.error(e); }
    };
    init();
  }, []);

  const getClientFullName = (): string => {
    return [
      jobOrder.First_Name,
      jobOrder.Middle_Initial ? jobOrder.Middle_Initial + '.' : '',
      jobOrder.Last_Name
    ].filter(Boolean).join(' ').trim() || 'Unknown Client';
  };

  const getClientFullAddress = (): string => {
    const addressParts = [
      jobOrder.Installation_Address || jobOrder.Address,
      jobOrder.Location,
      jobOrder.Barangay,
      jobOrder.City,
      jobOrder.Region
    ].filter(Boolean);
    return addressParts.length > 0 ? addressParts.join(', ') : 'No address provided';
  };

  const formatDate = (dateStr?: string | null): string => {
    if (!dateStr) return 'Not scheduled';
    try {
      return new Date(dateStr).toLocaleString();
    } catch (e) { return String(dateStr); }
  };

  const openLink = (url?: string) => {
    if (url) Linking.openURL(url).catch(e => Alert.alert('Error', 'Could not open link'));
  };

  // Action Handlers
  const handleEditClick = () => {
    setIsEditModalOpen(true);
  };

  const handleDoneClick = () => {
    if (userRole === 'technician') {
      setIsDoneTechModalOpen(true); // Assuming we'll use same modal for now or implement Tech one later
      // setIsDoneModalOpen(true); // Fallback
    } else {
      setIsDoneModalOpen(true);
    }
  };

  const handleApproveClick = () => {
    setIsApprovalModalOpen(true);
  };

  const handleEditSave = (formData: any) => {
    setSuccessMessage('Job Order updated successfully.');
    setShowSuccessModal(true);
    if (onRefresh) onRefresh();
  };

  const handleDoneSave = (formData: any) => {
    setSuccessMessage('Job Order marked as done.');
    setShowSuccessModal(true);
    if (onRefresh) onRefresh();
  };

  const handleApproveConfirm = async () => {
    try {
      setLoading(true);
      await approveJobOrder(jobOrder.id);
      setIsApprovalModalOpen(false);
      setSuccessMessage('Job Order approved successfully.');
      setShowSuccessModal(true);
      if (onRefresh) onRefresh();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to approve job order');
    } finally {
      setLoading(false);
    }
  };

  const renderField = (label: string, value: string | null | undefined, key: string, isLink = false, isImage = false) => {
    if (fieldVisibility[key] === false) return null;

    return (
      <View className={`border-b border-gray-100 dark:border-gray-800 py-3`}>
        <Text className="text-gray-500 text-xs mb-1">{label}</Text>
        {isImage && value ? (
          <TouchableOpacity onPress={() => openLink(value)}>
            <Text className="text-blue-500 underline truncate">{value}</Text>
          </TouchableOpacity>
        ) : isLink && value ? (
          <TouchableOpacity onPress={() => openLink(value)} className="flex-row items-center">
            <Text className="text-blue-500 underline mr-2">{value}</Text>
            <ExternalLink size={14} color="#3b82f6" />
          </TouchableOpacity>
        ) : (
          <Text className="text-gray-900 dark:text-gray-100 font-medium">{value || '-'}</Text>
        )}
      </View>
    );
  };

  return (
    <View className="flex-1 bg-white dark:bg-gray-950">
      <View className="flex-row items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <View className="flex-1">
          <Text className="text-lg font-bold text-gray-900 dark:text-white" numberOfLines={1}>
            {getClientFullName()}
          </Text>
        </View>
        <View className="flex-row space-x-2">
          <TouchableOpacity
            onPress={handleEditClick}
            className="p-2 bg-gray-100 dark:bg-gray-800 rounded"
          >
            <Edit size={20} color={isDarkMode ? 'white' : 'black'} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} className="p-2">
            <X size={24} color={isDarkMode ? 'white' : 'black'} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 p-4">
        {/* Helper Action Buttons */}
        <View className="flex-row space-x-2 mb-6">
          <TouchableOpacity
            className="flex-1 py-3 rounded-lg flex-row justify-center items-center"
            style={{ backgroundColor: colorPalette?.primary || '#ea580c' }}
            onPress={handleDoneClick}
          >
            <Check color="white" size={18} />
            <Text className="text-white font-bold ml-2">Mark Done</Text>
          </TouchableOpacity>
          {userRole === 'administrator' && (
            <TouchableOpacity
              className="flex-1 bg-green-600 py-3 rounded-lg flex-row justify-center items-center"
              onPress={handleApproveClick}
            >
              <Text className="text-white font-bold">Approve</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Fields */}
        <View className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-4">
          <Text className="text-gray-500 uppercase text-xs font-bold mb-4">Job Information</Text>
          {renderField('Job Order #', String(jobOrder.id), 'jobOrderNumber')}
          {renderField('Timestamp', formatDate(jobOrder.Create_DateTime || jobOrder.created_at), 'timestamp')}
          {renderField('Status', jobOrder.Onsite_Status, 'onsiteStatus')}
          {renderField('Plan', jobOrder.Choose_Plan || jobOrder.choose_plan, 'choosePlan')}
          {renderField('Billing Status', String(jobOrder.billing_status_id || jobOrder.Billing_Status_ID || '-'), 'billingStatus')}
        </View>

        <View className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-4">
          <Text className="text-gray-500 uppercase text-xs font-bold mb-4">Client Details</Text>
          {renderField('Full Name', getClientFullName(), 'fullName')}
          {renderField('Address', getClientFullAddress(), 'fullAddress')}
          {renderField('Contact', jobOrder.Contact_Number, 'contactNumber')}
          {renderField('Email', jobOrder.Email_Address, 'emailAddress')}
        </View>

        <View className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-20">
          <Text className="text-gray-500 uppercase text-xs font-bold mb-4">Technical Details</Text>
          {renderField('Router Model', jobOrder.Router_Model, 'routerModel')}
          {renderField('Connection Type', jobOrder.Connection_Type, 'connectionType')}
          {renderField('Date Installed', formatDate(jobOrder.Date_Installed || jobOrder.date_installed), 'dateInstalled')}
          {renderField('Setup Image', jobOrder.setup_image_url || jobOrder.Setup_Image_URL, 'setupImage', true, true)}
        </View>
      </ScrollView>

      {/* Settings FAB */}
      <TouchableOpacity
        className="absolute bottom-6 right-6 w-12 h-12 rounded-full justify-center items-center z-50 bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700"
        onPress={() => setShowFieldSettings(!showFieldSettings)}
      >
        <Settings size={24} color={isDarkMode ? 'white' : 'gray'} />
      </TouchableOpacity>

      {/* Field Settings Modal */}
      <Modal visible={showFieldSettings} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white dark:bg-gray-900 rounded-t-xl h-1/2 p-4">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="font-bold text-lg dark:text-white">Field Visibility</Text>
              <TouchableOpacity onPress={() => setShowFieldSettings(false)}>
                <X size={24} color={isDarkMode ? 'white' : 'black'} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {defaultFields.map(key => (
                <TouchableOpacity
                  key={key}
                  className="flex-row items-center py-3 border-b border-gray-100 dark:border-gray-800"
                  onPress={() => setFieldVisibility(prev => ({ ...prev, [key]: !prev[key] }))}
                >
                  <View className={`w-5 h-5 border rounded mr-3 flex items-center justify-center ${fieldVisibility[key] ? 'bg-blue-500 border-blue-500' : 'border-gray-400'}`}>
                    {fieldVisibility[key] && <Check size={14} color="white" />}
                  </View>
                  <Text className="capitalize dark:text-gray-200">{key.replace(/([A-Z])/g, ' $1')}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <JobOrderDoneFormModal
        isOpen={isDoneModalOpen}
        onClose={() => setIsDoneModalOpen(false)}
        onSave={handleDoneSave}
        jobOrderData={jobOrder}
      />

      <JobOrderEditFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleEditSave}
        jobOrderData={jobOrder}
      />

      <ApprovalConfirmationModal
        isOpen={isApprovalModalOpen}
        onClose={() => setIsApprovalModalOpen(false)}
        onConfirm={handleApproveConfirm}
        loading={loading}
      />

      <ConfirmationModal
        isOpen={showSuccessModal}
        title="Success"
        message={successMessage}
        onConfirm={() => setShowSuccessModal(false)}
        onCancel={() => setShowSuccessModal(false)}
      />
    </View>
  );
};

export default JobOrderDetails;
