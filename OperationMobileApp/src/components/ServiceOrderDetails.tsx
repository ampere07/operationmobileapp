import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  Modal,
  Image
} from 'react-native';
import {
  X,
  ExternalLink,
  Settings,
  Check,
  Pencil
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';
import { ServiceOrderData } from '../services/serviceOrderService';
import ServiceOrderEditModal from '../modals/ServiceOrderEditModal';

interface ServiceOrderDetailsProps {
  serviceOrder: ServiceOrderData;
  onClose: () => void;
  onRefresh?: () => void;
  isMobile?: boolean; // prop maintained for API compatibility but always true in RN
}

const ServiceOrderDetails: React.FC<ServiceOrderDetailsProps> = ({ serviceOrder, onClose, onRefresh }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);
  const [showFieldSettings, setShowFieldSettings] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<ServiceOrderData>(serviceOrder);

  // Default visible fields
  const defaultFields = [
    'ticket_id', 'timestamp', 'account_no', 'full_name', 'contact_number',
    'full_address', 'concern', 'concern_remarks', 'visit_status', 'support_status'
  ];

  const [fieldVisibility, setFieldVisibility] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const init = async () => {
      const theme = await AsyncStorage.getItem('theme');
      setIsDarkMode(theme !== 'light');
      const activePalette = await settingsColorPaletteService.getActive();
      setColorPalette(activePalette);

      const savedVisibility = await AsyncStorage.getItem('serviceOrderDetailsFieldVisibility');
      if (savedVisibility) {
        setFieldVisibility(JSON.parse(savedVisibility));
      } else {
        setFieldVisibility(defaultFields.reduce((acc, curr) => ({ ...acc, [curr]: true }), {}));
      }
    };
    init();
  }, []);

  useEffect(() => {
    setCurrentOrder(serviceOrder);
  }, [serviceOrder]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleString();
    } catch { return dateStr; }
  };

  const openLink = (url?: string) => {
    if (url) Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open link'));
  };

  const renderField = (label: string, value: string | number | undefined | null, key: string, isLink = false, isImage = false) => {
    if (fieldVisibility[key] === false) return null;

    return (
      <View className="border-b border-gray-100 dark:border-gray-800 py-3">
        <Text className="text-gray-500 text-xs mb-1">{label}</Text>
        {isImage && value ? (
          <TouchableOpacity onPress={() => openLink(String(value))}>
            <Text className="text-blue-500 underline truncate">View Image</Text>
          </TouchableOpacity>
        ) : isLink && value ? (
          <TouchableOpacity onPress={() => openLink(String(value))} className="flex-row items-center">
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
        <Text className="text-lg font-bold text-gray-900 dark:text-white flex-1" numberOfLines={1}>
          Ticket #{currentOrder.ticket_id}
        </Text>
        <View className="flex-row items-center space-x-2">
          <TouchableOpacity onPress={() => setIsEditModalOpen(true)} className="p-2 mr-2">
            <Pencil size={20} color={isDarkMode ? 'white' : 'black'} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} className="p-2">
            <X size={24} color={isDarkMode ? 'white' : 'black'} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 p-4">
        {/* Section: Ticket Info */}
        <View className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-4">
          <Text className="text-gray-500 uppercase text-xs font-bold mb-4">Ticket Info</Text>
          {renderField('Timestamp', formatDate(currentOrder.timestamp), 'timestamp')}
          {renderField('Status', currentOrder.support_status, 'support_status')}
          {renderField('Visit Status', currentOrder.visit_status, 'visit_status')}
        </View>

        {/* Section: Account Info */}
        <View className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-4">
          <Text className="text-gray-500 uppercase text-xs font-bold mb-4">Client Details</Text>
          {renderField('Account No', currentOrder.account_no, 'account_no')}
          {renderField('Full Name', currentOrder.full_name, 'full_name')}
          {renderField('Contact Number', currentOrder.contact_number, 'contact_number')}
          {renderField('Address', currentOrder.full_address, 'full_address')}
          {renderField('Email', currentOrder.email_address, 'email_address')}
        </View>

        {/* Section: Technical Info */}
        <View className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-4">
          <Text className="text-gray-500 uppercase text-xs font-bold mb-4">Technical Details</Text>
          {renderField('Concern', currentOrder.concern, 'concern')}
          {renderField('Concern Remarks', currentOrder.concern_remarks, 'concern_remarks')}
          {renderField('Requested By', currentOrder.requested_by, 'requested_by')}
          {renderField('Assigned To', currentOrder.assigned_email, 'assigned_email')}
          {renderField('Visit By', currentOrder.visit_by_user, 'visit_by_user')}
        </View>

        {/* Section: Images */}
        <View className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-20">
          <Text className="text-gray-500 uppercase text-xs font-bold mb-4">Attachments</Text>
          {renderField('House Front', currentOrder.house_front_picture_url, 'house_front_picture_url', true, true)}
          {renderField('Time In', currentOrder.image1_url, 'image1_url', true, true)}
          {renderField('Modem Setup', currentOrder.image2_url, 'image2_url', true, true)}
          {renderField('Time Out', currentOrder.image3_url, 'image3_url', true, true)}
        </View>
      </ScrollView>

      {/* Settings FAB */}
      <TouchableOpacity
        className="absolute bottom-6 right-6 w-12 h-12 rounded-full justify-center items-center z-50 bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700"
        onPress={() => setShowFieldSettings(true)}
      >
        <Settings size={24} color={isDarkMode ? 'white' : 'gray'} />
      </TouchableOpacity>

      {/* Field Visibility Modal */}
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
              {Object.keys(currentOrder).map(key => (
                <TouchableOpacity
                  key={key}
                  className="flex-row items-center py-3 border-b border-gray-100 dark:border-gray-800"
                  onPress={() => setFieldVisibility(prev => ({ ...prev, [key]: !prev[key] }))}
                >
                  <View className={`w-5 h-5 border rounded mr-3 flex items-center justify-center ${fieldVisibility[key] !== false ? 'bg-blue-500 border-blue-500' : 'border-gray-400'}`}>
                    {fieldVisibility[key] !== false && <Check size={14} color="white" />}
                  </View>
                  <Text className="capitalize dark:text-gray-200">{key.replace(/_/g, ' ')}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Modal */}
      <ServiceOrderEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={(updatedData) => {
          setCurrentOrder({ ...currentOrder, ...updatedData });
          if (onRefresh) onRefresh();
        }}
        serviceOrderData={currentOrder}
      />
    </View>
  );
};

export default ServiceOrderDetails;
