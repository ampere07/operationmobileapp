import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, Modal, Pressable, Image, Alert, ActivityIndicator, Platform, KeyboardAvoidingView, StyleSheet, TouchableOpacity } from 'react-native';
import { Picker } from '@react-native-picker/picker'; // requires @react-native-picker/picker package
import * as ImagePicker from 'expo-image-picker'; // requires expo-image-picker
import { X, Calendar, ChevronDown, Minus, Plus, Upload } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker'; // requires @react-native-community/datetimepicker
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../config/api';
import { getAllInventoryItems, InventoryItem } from '../services/inventoryItemService';
import { createServiceOrderItems, ServiceOrderItem, deleteServiceOrderItem } from '../services/serviceOrderItemService';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';
// import { getActiveImageSize, resizeImage, ImageSizeSetting } from '../services/imageSettingsService'; // Web only, currently disabled for mobile

interface UserData {
  email?: string;
  email_address?: string;
  role?: string | { role_name: string };
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
  userEmail: string;
  supportRemarks: string;
  serviceCharge: string;
  status: string;
  newRouterModemSN: string;
  newLcp: string;
  newNap: string;
  newPort: string;
  newVlan: string;
  routerModel: string;
}

interface ImageFiles {
  timeInFile: ImagePicker.ImagePickerAsset | null;
  modemSetupFile: ImagePicker.ImagePickerAsset | null;
  timeOutFile: ImagePicker.ImagePickerAsset | null;
  clientSignatureFile: ImagePicker.ImagePickerAsset | null;
}

const ServiceOrderEditModal: React.FC<ServiceOrderEditModalProps> = ({
  isOpen,
  onClose,
  onSave,
  serviceOrderData
}) => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);

  const [userRole, setUserRole] = useState<string>('');
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('unknown@ampere.com');

  const [technicians, setTechnicians] = useState<Array<{ name: string; email: string }>>([]);
  const [lcps, setLcps] = useState<string[]>([]);
  const [naps, setNaps] = useState<string[]>([]);
  const [ports, setPorts] = useState<string[]>([]);
  const [vlans, setVlans] = useState<string[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
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
    modifiedBy: '',
    modifiedDate: new Date().toISOString(),
    userEmail: '',
    supportRemarks: '',
    serviceCharge: '0.00',
    status: 'unused',
    newRouterModemSN: '',
    newLcp: '',
    newNap: '',
    newPort: '',
    newVlan: '',
    routerModel: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [imageFiles, setImageFiles] = useState<ImageFiles>({
    timeInFile: null,
    modemSetupFile: null,
    timeOutFile: null,
    clientSignatureFile: null
  });
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Load User Data and Theme
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const theme = await AsyncStorage.getItem('theme');
        setIsDarkMode(theme !== 'light'); // Default to dark if null or 'dark'

        const authData = await AsyncStorage.getItem('authData');
        if (authData) {
          const user = JSON.parse(authData);
          setCurrentUserEmail(user.email || 'unknown@ampere.com');
          setUserRole(user.role || '');
          setFormData(prev => ({ ...prev, userEmail: user.email || 'unknown@ampere.com' }));
        }

        const palette = await settingsColorPaletteService.getActive();
        setColorPalette(palette);
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };
    loadSettings();
  }, []);

  // Fetch Dropdown Data
  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        try {
          // Technicians
          const usersRes = await apiClient.get<{ success: boolean; data: any[] }>('/users');
          if (usersRes.data.success) {
            const techs = usersRes.data.data
              .filter(u => {
                const role = typeof u.role === 'string' ? u.role : (u.role as any)?.role_name || '';
                return role.toLowerCase() === 'technician';
              })
              .map(u => ({
                email: u.email_address || u.email || '',
                name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || ''
              }))
              .filter(t => t.name);
            setTechnicians(techs);
          }

          // Technical Details
          const [lcpRes, napRes, portRes, vlanRes] = await Promise.all([
            apiClient.get('/lcp'),
            apiClient.get('/nap'),
            apiClient.get('/port'),
            apiClient.get('/vlan')
          ]);

          if (lcpRes.data.success) setLcps(lcpRes.data.data.map((i: any) => i.lcp_name || i.lcp || i.name).filter(Boolean));
          if (napRes.data.success) setNaps(napRes.data.data.map((i: any) => i.nap_name || i.nap || i.name).filter(Boolean));
          if (portRes.data.success) setPorts(portRes.data.data.map((i: any) => i.Label).filter(Boolean));
          if (vlanRes.data.success) setVlans(vlanRes.data.data.map((i: any) => i.value).filter(Boolean));

          // Inventory
          const invRes = await getAllInventoryItems();
          if (invRes.success) setInventoryItems(invRes.data);

        } catch (error) {
          console.error('Error fetching data:', error);
        }
      };
      fetchData();
    }
  }, [isOpen]);

  // Load Service Order Data
  useEffect(() => {
    if (isOpen && serviceOrderData) {
      setFormData(prev => ({
        ...prev,
        accountNo: serviceOrderData.accountNumber || serviceOrderData.account_no || '',
        dateInstalled: serviceOrderData.dateInstalled || serviceOrderData.date_installed || '',
        fullName: serviceOrderData.fullName || serviceOrderData.full_name || '',
        contactNumber: serviceOrderData.contactNumber || serviceOrderData.contact_number || '',
        emailAddress: serviceOrderData.emailAddress || serviceOrderData.email_address || '',
        plan: serviceOrderData.plan || '',
        username: serviceOrderData.username || '',
        connectionType: serviceOrderData.connectionType || serviceOrderData.connection_type || '',
        routerModemSN: serviceOrderData.routerModemSN || serviceOrderData.router_modem_sn || '',
        lcp: serviceOrderData.lcp || '',
        nap: serviceOrderData.nap || '',
        port: serviceOrderData.port || '',
        vlan: serviceOrderData.vlan || '',
        supportStatus: serviceOrderData.supportStatus || serviceOrderData.support_status || 'In Progress',
        visitStatus: serviceOrderData.visitStatus || serviceOrderData.visit_status || 'In Progress',
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
        modifiedBy: currentUserEmail,
        modifiedDate: new Date().toLocaleString(),
        userEmail: currentUserEmail,
        supportRemarks: serviceOrderData.supportRemarks || serviceOrderData.support_remarks || '',
        serviceCharge: serviceOrderData.serviceCharge ? serviceOrderData.serviceCharge.toString().replace('₱', '').trim() : '0.00',
        status: serviceOrderData.status || 'unused',
      }));

      // Only fetch items if ID exists
      if (serviceOrderData.id) {
        apiClient.get(`/service-order-items?service_order_id=${serviceOrderData.id}`)
          .then(res => {
            if (res.data.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
              const formattedItems = res.data.data.map((item: any) => ({
                itemId: item.item_name || '',
                quantity: item.quantity ? item.quantity.toString() : ''
              }));
              // Ensure at least one empty item if formattedItems is empty (though length > 0 check handles it)
              setOrderItems(formattedItems.length ? formattedItems : [{ itemId: '', quantity: '' }]);
            } else {
              setOrderItems([{ itemId: '', quantity: '' }]);
            }
          })
          .catch(() => setOrderItems([{ itemId: '', quantity: '' }]));
      }
    }
  }, [isOpen, serviceOrderData, currentUserEmail]);

  const handleInputChange = (field: keyof ServiceOrderEditFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleImageChange = async (field: keyof ImageFiles) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, // Set to true if cropping is needed
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageFiles(prev => ({ ...prev, [field]: result.assets[0] }));
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const activeColor = colorPalette?.primary || '#ea580c';
  const textColor = isDarkMode ? '#ffffff' : '#111827';
  const subTextColor = isDarkMode ? '#9ca3af' : '#4b5563';
  const bgColor = isDarkMode ? '#1f2937' : '#ffffff';
  const inputBgColor = isDarkMode ? '#374151' : '#f9fafb';
  const borderColor = isDarkMode ? '#4b5563' : '#d1d5db';

  const uploadImageToGoogleDrive = async (asset: ImagePicker.ImagePickerAsset): Promise<string> => {
    const formData = new FormData();
    const filename = asset.uri.split('/').pop() || 'image.jpg';

    // Append the file correctly for React Native
    formData.append('file', {
      uri: asset.uri,
      name: filename,
      type: asset.mimeType || 'image/jpeg',
    } as any);

    const response = await apiClient.post('/google-drive/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    if (response.data.success && response.data.data?.url) {
      return response.data.data.url;
    }
    throw new Error('Upload failed');
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const serviceOrderId = serviceOrderData?.id;
      if (!serviceOrderId) throw new Error('Missing Service Order ID');

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
      const updateData = {
        account_no: formData.accountNo,
        date_installed: formData.dateInstalled,
        full_name: formData.fullName,
        contact_number: formData.contactNumber,
        email_address: formData.emailAddress,
        plan: formData.plan,
        username: formData.username,
        connection_type: formData.connectionType,
        router_modem_sn: formData.routerModemSN,
        lcp: formData.lcp,
        nap: formData.nap,
        port: formData.port,
        vlan: formData.vlan,
        support_status: formData.supportStatus,
        visit_status: formData.visitStatus,
        repair_category: formData.repairCategory,
        visit_by_user: formData.visitBy,
        visit_with: formData.visitWith,
        visit_remarks: formData.visitRemarks,
        client_signature: uploadedUrls.client_signature_url || formData.clientSignature,
        item_name_1: formData.itemName1,
        image1_url: uploadedUrls.image1_url || formData.timeIn,
        image2_url: uploadedUrls.image2_url || formData.modemSetupImage,
        image3_url: uploadedUrls.image3_url || formData.timeOut,
        assigned_email: formData.assignedEmail,
        concern: formData.concern,
        concern_remarks: formData.concernRemarks,
        updated_by: currentUserEmail,
        support_remarks: formData.supportRemarks,
        service_charge: parseFloat(formData.serviceCharge),
        status: formData.status,
        new_router_modem_sn: formData.newRouterModemSN,
        new_lcp: formData.newLcp,
        new_nap: formData.newNap,
        new_port: formData.newPort,
        new_vlan: formData.newVlan,
        router_model: formData.routerModel
      };

      await apiClient.put(`/service-orders/${serviceOrderId}`, updateData);

      // Save Items
      const validItems = orderItems.filter(i => i.itemId && i.itemId.trim() !== '');
      if (validItems.length > 0) {
        // First delete existing (simplified logic, ideally update)
        try {
          const existing = await apiClient.get(`/service-order-items?service_order_id=${serviceOrderId}`);
          if (existing.data.success && existing.data.data.length > 0) {
            for (const item of existing.data.data) {
              await deleteServiceOrderItem(item.id);
            }
          }
        } catch (e) { }

        const newItems: ServiceOrderItem[] = validItems.map(i => ({
          service_order_id: parseInt(serviceOrderId),
          item_name: i.itemId,
          quantity: parseInt(i.quantity) || 1
        }));
        await createServiceOrderItems(newItems);
      }

      onSave(updateData);
      Alert.alert('Success', 'Service Order updated successfully');
      onClose();

    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', error.message || 'Failed to update service order');
    } finally {
      setLoading(false);
    }
  };

  const handleItemChange = (index: number, field: keyof OrderItem, value: string) => {
    const newItems = [...orderItems];
    newItems[index][field] = value;
    setOrderItems(newItems);
    if (field === 'itemId' && value && index === orderItems.length - 1) {
      setOrderItems([...newItems, { itemId: '', quantity: '' }]);
    }
  };

  const renderLabel = (text: string, required = false) => (
    <Text className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
      {text} {required && <Text className="text-red-500">*</Text>}
    </Text>
  );

  const renderInput = (
    field: keyof ServiceOrderEditFormData,
    placeholder: string,
    editable = true,
    keyboardType: 'default' | 'numeric' | 'email-address' = 'default'
  ) => (
    <View className="mb-4">
      {renderLabel(placeholder.replace('Enter ', ''), !editable && field !== 'dateInstalled' ? false : true)}
      <TextInput
        className={`border rounded-lg p-3 text-base ${!editable
            ? (isDarkMode ? 'bg-gray-700 text-gray-400 border-gray-600' : 'bg-gray-100 text-gray-500 border-gray-200')
            : (isDarkMode ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300')
          } ${errors[field] ? 'border-red-500' : ''}`}
        value={String(formData[field])}
        onChangeText={(text) => handleInputChange(field, text)}
        placeholder={placeholder}
        placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
        editable={editable}
        keyboardType={keyboardType}
      />
      {errors[field] && (
        <Text className="text-red-500 text-xs mt-1">{errors[field]}</Text>
      )}
    </View>
  );

  const renderPicker = (
    field: keyof ServiceOrderEditFormData,
    items: string[],
    label: string
  ) => (
    <View className="mb-4">
      {renderLabel(label)}
      <View className={`border rounded-lg overflow-hidden ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-white'}`}>
        <Picker
          selectedValue={formData[field]}
          onValueChange={(val) => handleInputChange(field, val)}
          dropdownIconColor={isDarkMode ? '#fff' : '#000'}
          style={{ color: isDarkMode ? '#fff' : '#000' }}
        >
          <Picker.Item label={`Select ${label}`} value="" color={isDarkMode ? '#9ca3af' : '#6b7280'} />
          {items.map((item, idx) => (
            <Picker.Item key={idx} label={item} value={item} color={isDarkMode ? '#fff' : '#000'} />
          ))}
        </Picker>
      </View>
    </View>
  );

  if (!isOpen) return null;

  return (
    <Modal
      visible={isOpen}
      transparent={true}
      animationType="slide"
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <View className={`h-[90%] w-full shadow-2xl rounded-t-3xl overflow-hidden flex-col ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>

          {/* Header */}
          <View className={`px-6 py-4 flex-row items-center justify-between border-b ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'}`}>
            <View className="flex-row items-center space-x-3">
              <Text className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {serviceOrderData?.ticket_id} | {formData.fullName}
              </Text>
            </View>
            <View className="flex-row items-center space-x-3 gap-2">
              <Pressable
                onPress={onClose}
                className="px-4 py-2 border rounded-lg"
                style={{
                  borderColor: colorPalette?.primary || '#ea580c',
                }}
              >
                <Text style={{ color: colorPalette?.primary || '#ea580c' }} className="text-sm font-medium">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSave}
                disabled={loading}
                className="px-6 py-2 rounded-lg"
                style={{
                  backgroundColor: loading ? (isDarkMode ? '#4b5563' : '#9ca3af') : (colorPalette?.primary || '#ea580c')
                }}
              >
                {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text className="text-white text-sm font-medium">Save</Text>}
              </Pressable>
            </View>
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
          >
            <ScrollView className="flex-1 p-6" contentContainerStyle={{ paddingBottom: 40 }}>
              <View className="space-y-4">

                {/* Read Only Fields */}
                {renderInput('accountNo', 'Account No', false)}

                {/* Date Installed */}
                <View className="mb-4">
                  <Text className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Date Installed<Text className="text-red-500">*</Text></Text>
                  <View className="relative">
                    {Platform.OS === 'web' ? (
                      <TextInput
                        style={{
                          backgroundColor: isDarkMode ? '#1f2937' : '#fff',
                          color: isDarkMode ? '#fff' : '#000',
                          borderColor: errors.dateInstalled ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db'),
                          borderWidth: 1,
                          borderRadius: 8,
                          padding: 12
                        }}
                        value={formData.dateInstalled}
                        onChangeText={(t) => handleInputChange('dateInstalled', t)}
                      />
                    ) : (
                      <Pressable
                        onPress={() => setShowDatePicker(true)}
                        className={`border rounded-lg p-3 ${errors.dateInstalled ? 'border-red-500' : (isDarkMode ? 'border-gray-700' : 'border-gray-300')} ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}
                      >
                        <Text style={{ color: formData.dateInstalled ? (isDarkMode ? '#fff' : '#000') : (isDarkMode ? '#9ca3af' : '#6b7280') }}>
                          {formData.dateInstalled ? new Date(formData.dateInstalled).toLocaleDateString() : 'Select Date'}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                  {showDatePicker && (
                    <DateTimePicker
                      value={formData.dateInstalled ? new Date(formData.dateInstalled) : new Date()}
                      mode="date"
                      display="default"
                      onChange={(e, date) => {
                        setShowDatePicker(false);
                        if (date) handleInputChange('dateInstalled', date.toISOString().split('T')[0]);
                      }}
                    />
                  )}
                </View>

                {renderInput('fullName', 'Full Name', false)}
                {renderInput('contactNumber', 'Contact Number', false)}
                {renderInput('emailAddress', 'Email Address', false)}
                {renderInput('plan', 'Plan', false)}
                {renderInput('username', 'Username')}

                {/* Connection Type */}
                <View className="mb-4">
                  <Text className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Connection Type</Text>
                  <View className="flex-row gap-2">
                    <Pressable
                      onPress={() => handleInputChange('connectionType', 'Fiber')}
                      className={`px-4 py-2 rounded-lg border ${formData.connectionType === 'Fiber' ? '' : (isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-white')}`}
                      style={formData.connectionType === 'Fiber' ? { backgroundColor: activeColor, borderColor: activeColor } : {}}
                    >
                      <Text style={{ color: formData.connectionType === 'Fiber' ? '#fff' : (isDarkMode ? '#fff' : '#000') }}>Fiber</Text>
                    </Pressable>
                  </View>
                </View>

                {renderInput('routerModemSN', 'Router/Modem SN')}
                {renderInput('lcp', 'LCP', false)}
                {renderInput('nap', 'NAP', false)}
                {renderInput('port', 'PORT', false)}
                {renderInput('vlan', 'VLAN', false)}

                {renderPicker('supportStatus', ['Resolved', 'Failed', 'In Progress', 'For Visit'], 'Support Status')}

                {formData.supportStatus === 'For Visit' && (
                  <>
                    {renderPicker('visitStatus', ['Done', 'In Progress', 'Failed', 'Reschedule'], 'Visit Status')}

                    <View className="mb-4">
                      <Text className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Assigned Email</Text>
                      <View className={`border rounded-lg overflow-hidden ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-white'}`}>
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
                    </View>

                    {formData.visitStatus === 'Done' && (
                      <>
                        {renderPicker('repairCategory', ['Fiber Relaying', 'Migrate', 'others', 'Pullout', 'Reboot/Reconfig Router', 'Relocate Router', 'Relocate', 'Replace Patch Cord', 'Replace Router', 'Resplice', 'Transfer LCP/NAP/PORT', 'Update Vlan'], 'Repair Category')}

                        {(formData.repairCategory === 'Migrate' || formData.repairCategory === 'Relocate' || formData.repairCategory === 'Transfer LCP/NAP/PORT') && (
                          <>
                            {formData.repairCategory === 'Migrate' && renderInput('newRouterModemSN', 'New Router SN')}
                            {renderPicker('newLcp', lcps, 'New LCP')}
                            {renderPicker('newNap', naps, 'New NAP')}
                            {renderPicker('newPort', ports, 'New Port')}
                            {renderPicker('newVlan', vlans, 'New VLAN')}
                            {formData.repairCategory === 'Migrate' && renderInput('routerModel', 'Router Model')}
                          </>
                        )}
                        {(formData.repairCategory === 'Replace Router' || formData.repairCategory === 'Relocate Router') && (
                          <>
                            {formData.repairCategory === 'Replace Router' && renderInput('newRouterModemSN', 'New Router SN')}
                            {renderInput('routerModel', 'Router Model')}
                          </>
                        )}
                        {formData.repairCategory === 'Update Vlan' && renderPicker('newVlan', vlans, 'New VLAN')}

                        <View className="mb-4">
                          <Text className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Visit By</Text>
                          <View className={`border rounded-lg overflow-hidden ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-white'}`}>
                            <Picker
                              selectedValue={formData.visitBy}
                              onValueChange={(val) => handleInputChange('visitBy', val)}
                              dropdownIconColor={isDarkMode ? '#fff' : '#000'}
                              style={{ color: isDarkMode ? '#fff' : '#000' }}
                            >
                              <Picker.Item label="Select Visit By" value="" color={isDarkMode ? '#9ca3af' : '#6b7280'} />
                              {technicians.filter(t => t.name !== formData.visitWith && t.name !== formData.visitWithOther).map((t, i) => (
                                <Picker.Item key={i} label={t.name} value={t.name} color={isDarkMode ? '#fff' : '#000'} />
                              ))}
                            </Picker>
                          </View>
                        </View>

                        {renderInput('visitRemarks', 'Visit Remarks')}

                        <View className="mb-4">
                          <Text className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Client Signature</Text>
                          <Pressable
                            onPress={() => handleImageChange('clientSignatureFile')}
                            className={`h-40 border border-dashed rounded-lg items-center justify-center ${isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-400 bg-gray-50'}`}
                          >
                            {imageFiles.clientSignatureFile || formData.clientSignature ? (
                              <Image source={{ uri: imageFiles.clientSignatureFile?.uri || formData.clientSignature }} style={{ width: '100%', height: '100%', resizeMode: 'contain' }} />
                            ) : (
                              <Text className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Upload Signature</Text>
                            )}
                          </Pressable>
                        </View>

                        <View className="mb-4">
                          <Text className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Items</Text>
                          {orderItems.map((item, idx) => (
                            <View key={idx} className="flex-row gap-2 mb-2 items-center">
                              <View className={`flex-1 border rounded-lg overflow-hidden ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-white'}`}>
                                <Picker
                                  selectedValue={item.itemId}
                                  onValueChange={(val) => handleItemChange(idx, 'itemId', val)}
                                  dropdownIconColor={isDarkMode ? '#fff' : '#000'}
                                  style={{ color: isDarkMode ? '#fff' : '#000' }}
                                >
                                  <Picker.Item label="Select Item" value="" color={isDarkMode ? '#9ca3af' : '#6b7280'} />
                                  {inventoryItems.map(inv => <Picker.Item key={inv.id} label={inv.item_name} value={inv.item_name} color={isDarkMode ? '#fff' : '#000'} />)}
                                </Picker>
                              </View>
                              <View className="w-20">
                                <TextInput
                                  className={`border rounded-lg p-3 ${isDarkMode ? 'border-gray-700 bg-gray-800 text-white' : 'border-gray-300 bg-white text-black'}`}
                                  placeholder="Qty"
                                  placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
                                  value={item.quantity}
                                  keyboardType="numeric"
                                  onChangeText={(t) => handleItemChange(idx, 'quantity', t)}
                                />
                              </View>
                              {orderItems.length > 1 && (
                                <Pressable onPress={() => { const newItems = [...orderItems]; newItems.splice(idx, 1); setOrderItems(newItems); }}>
                                  <X size={20} color="#ef4444" />
                                </Pressable>
                              )}
                            </View>
                          ))}
                        </View>

                        <View className="mb-4">
                          <Text className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Time In Image</Text>
                          <Pressable onPress={() => handleImageChange('timeInFile')} className={`h-40 border border-dashed rounded-lg items-center justify-center ${isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-400 bg-gray-50'}`}>
                            {imageFiles.timeInFile || formData.timeIn ? (
                              <Image source={{ uri: imageFiles.timeInFile?.uri || formData.timeIn }} style={{ width: '100%', height: '100%', resizeMode: 'contain' }} />
                            ) : <Text className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Upload Time In</Text>}
                          </Pressable>
                        </View>

                        <View className="mb-4">
                          <Text className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Modem Setup Image</Text>
                          <Pressable onPress={() => handleImageChange('modemSetupFile')} className={`h-40 border border-dashed rounded-lg items-center justify-center ${isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-400 bg-gray-50'}`}>
                            {imageFiles.modemSetupFile || formData.modemSetupImage ? (
                              <Image source={{ uri: imageFiles.modemSetupFile?.uri || formData.modemSetupImage }} style={{ width: '100%', height: '100%', resizeMode: 'contain' }} />
                            ) : <Text className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Upload Modem Setup</Text>}
                          </Pressable>
                        </View>

                        <View className="mb-4">
                          <Text className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Time Out Image</Text>
                          <Pressable onPress={() => handleImageChange('timeOutFile')} className={`h-40 border border-dashed rounded-lg items-center justify-center ${isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-400 bg-gray-50'}`}>
                            {imageFiles.timeOutFile || formData.timeOut ? (
                              <Image source={{ uri: imageFiles.timeOutFile?.uri || formData.timeOut }} style={{ width: '100%', height: '100%', resizeMode: 'contain' }} />
                            ) : <Text className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Upload Time Out</Text>}
                          </Pressable>
                        </View>
                      </>
                    )}
                  </>
                )}

                {renderPicker('concern', ['No Internet', 'Slow Internet', 'Intermittent Connection', 'Router Issue', 'Billing Concern', 'Others'], 'Concern')}
                {renderInput('concernRemarks', 'Concern Remarks')}
                {renderInput('supportRemarks', 'Support Remarks')}
                {renderInput('serviceCharge', 'Service Charge', true, 'numeric')}

              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </View>
    </Modal>
  );
};

// Removed styles object as we are using NativeWind classes
const styles = StyleSheet.create({});

export default ServiceOrderEditModal;
