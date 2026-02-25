import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Modal,
  Alert,
  Image,
  Platform,
  StyleSheet,
  useWindowDimensions
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { X, Camera, ImageIcon, Trash2 } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import SignatureScreen, { SignatureViewRef } from 'react-native-signature-canvas';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';
import { userService } from '../services/userService';
import { API_BASE_URL } from '../config/api';

// Removed global Dimensions usage

interface AssignWorkOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  onRefresh?: () => void;
  isEditMode?: boolean;
  workOrder?: any;
}

interface User {
  email: string;
  name: string;
}

const AssignWorkOrderModal: React.FC<AssignWorkOrderModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onRefresh,
  isEditMode = false,
  workOrder
}) => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [assignees, setAssignees] = useState<User[]>([]);
  const [categories, setCategories] = useState<{ id: number, category: string }[]>([]);
  const [userRole, setUserRole] = useState<number | null>(null);
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const sigCanvas = useRef<SignatureViewRef>(null);

  const [formData, setFormData] = useState({
    instructions: '',
    work_category: '',
    report_to: '',
    assign_to: '',
    remarks: '',
    work_status: 'Pending'
  });

  const [images, setImages] = useState({
    image_1: null as any,
    image_2: null as any,
    image_3: null as any,
    signature: null as any
  });

  const [imagePreviews, setImagePreviews] = useState({
    image_1: '',
    image_2: '',
    image_3: '',
    signature: ''
  });

  const [loading, setLoading] = useState(false);
  const [loadingPercentage, setLoadingPercentage] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const init = async () => {
      const theme = await AsyncStorage.getItem('theme');
      setIsDarkMode(theme !== 'light');

      const palette = await settingsColorPaletteService.getActive();
      setColorPalette(palette);

      const authData = await AsyncStorage.getItem('authData');
      if (authData) {
        try {
          const parsed = JSON.parse(authData);
          setUserRole(parsed.role_id || parsed.roleId || null);
        } catch (e) { }
      }
    };
    init();
  }, []);

  useEffect(() => {
    const fetchTechnicians = async () => {
      if (!isOpen) return;
      try {
        const response = await userService.getUsersByRole('technician');
        if (response.success && response.data) {
          const list = response.data
            .map((user: any) => ({
              email: user.email_address || user.email || '',
              name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username
            }))
            .filter((t: User) => t.name && t.email);
          setTechnicians(list);
        }
      } catch (error) {
        setTechnicians([]);
      }
      try {
        // We fetch role by role since the service currently only supports single roleId
        const rolesToFetch = [1, 4, 5, 6];
        const allUsers: User[] = [];
        for (const roleId of rolesToFetch) {
          const response = await userService.getUsersByRoleId(roleId);
          if (response.success && response.data) {
            const list = response.data
              .map((user: any) => ({
                email: user.email_address || user.email || '',
                name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username
              }))
              .filter((t: User) => t.name && t.email);
            allUsers.push(...list);
          }
        }
        // Remove duplicates if any
        const uniqueUsers = Array.from(new Map(allUsers.map(u => [u.email, u])).values());
        setAssignees(uniqueUsers);
      } catch (error) {
        setAssignees([]);
      }
    };
    const fetchCategories = async () => {
      if (!isOpen) return;
      try {
        const response = await fetch(`${API_BASE_URL}/work-categories`);
        const result = await response.json();
        if (result.success && result.data) {
          setCategories(result.data);
        }
      } catch (error) {
        setCategories([]);
      }
    };
    fetchTechnicians();
    fetchCategories();

    if (isOpen) {
      if (isEditMode && workOrder) {
        setFormData({
          instructions: workOrder.instructions || '',
          work_category: workOrder.work_category || '',
          report_to: workOrder.report_to || '',
          assign_to: workOrder.assign_to || '',
          remarks: workOrder.remarks || '',
          work_status: workOrder.work_status || 'Pending'
        });
      } else {
        setFormData({
          instructions: '',
          work_category: '',
          report_to: '',
          assign_to: '',
          remarks: '',
          work_status: 'Pending'
        });
      }
      setImagePreviews({ image_1: '', image_2: '', image_3: '', signature: '' });
      setImages({ image_1: null, image_2: null, image_3: null, signature: null });
    }
  }, [isOpen, isEditMode, workOrder]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const pickImage = async (field: string, useCamera: boolean = false) => {
    let result;
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    };

    if (useCamera) {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission denied', 'Camera access is required to take photos.');
        return;
      }
      result = await ImagePicker.launchCameraAsync(options);
    } else {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission denied', 'Gallery access is required to pick photos.');
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync(options);
    }

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      const imageFile = {
        uri: asset.uri,
        type: 'image/jpeg',
        name: asset.fileName || `${field}_${Date.now()}.jpg`,
      };
      setImages(prev => ({ ...prev, [field]: imageFile }));
      setImagePreviews(prev => ({ ...prev, [field]: asset.uri }));
    }
  };

  const handleSignature = (signature: string) => {
    setImagePreviews(prev => ({ ...prev, signature }));
    const sigFile = {
      uri: signature,
      type: 'image/png',
      name: 'signature.png'
    };
    setImages(prev => ({ ...prev, signature: sigFile }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.instructions.trim()) newErrors.instructions = 'Instructions are required';
    if (!formData.work_category) newErrors.work_category = 'Work Category is required';
    if (!formData.report_to.trim()) newErrors.report_to = 'Report To is required';
    if (!formData.assign_to.trim()) newErrors.assign_to = 'Assign To is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      Alert.alert('Missing Info', 'Please fill in all required fields.');
      return;
    }

    setLoading(true);
    setLoadingPercentage(0);

    const progressInterval = setInterval(() => {
      setLoadingPercentage(prev => prev >= 90 ? prev : prev + 5);
    }, 200);

    try {
      const authData = await AsyncStorage.getItem('authData');
      const parsedUser = authData ? JSON.parse(authData) : null;
      const currentUserEmail = parsedUser ? (parsedUser.email_address || parsedUser.email || 'system') : 'system';

      const submitData = new FormData();
      submitData.append('instructions', formData.instructions);
      submitData.append('report_to', formData.report_to);
      submitData.append('assign_to', formData.assign_to);
      submitData.append('remarks', formData.remarks);
      submitData.append('requested_by', currentUserEmail);
      submitData.append('work_category', formData.work_category);

      if ((userRole !== 1 && userRole !== 7) || isEditMode) {
        submitData.append('work_status', formData.work_status);
      } else {
        submitData.append('work_status', 'Pending');
      }

      if (images.image_1) submitData.append('image_1', images.image_1 as any);
      if (images.image_2) submitData.append('image_2', images.image_2 as any);
      if (images.image_3) submitData.append('image_3', images.image_3 as any);
      if (images.signature) submitData.append('signature', images.signature as any);

      if (isEditMode && workOrder?.id) {
        submitData.append('_method', 'PUT');
      }

      const url = isEditMode && workOrder?.id
        ? `${API_BASE_URL}/work-orders/${workOrder.id}`
        : `${API_BASE_URL}/work-orders`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'multipart/form-data',
        },
        body: submitData
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to save');
      }

      clearInterval(progressInterval);
      setLoadingPercentage(100);

      setTimeout(() => {
        onSave();
        if (onRefresh) onRefresh();
      }, 500);

    } catch (error: any) {
      clearInterval(progressInterval);
      Alert.alert('Error', error.message || 'An error occurred');
    } finally {
      setTimeout(() => {
        setLoading(false);
        setLoadingPercentage(0);
      }, 500);
    }
  };

  const ImageUploadSection = ({ field, label }: { field: 'image_1' | 'image_2' | 'image_3', label: string }) => (
    <View style={st.imageSection}>
      <Text style={[st.fieldLabel, { color: isDarkMode ? '#d1d5db' : '#374151' }]}>
        {label}
      </Text>
      <View style={[st.dashedBox, {
        borderColor: isDarkMode ? '#374151' : '#e5e7eb',
        backgroundColor: isDarkMode ? '#111827' : '#f9fafb'
      }]}>
        {imagePreviews[field] ? (
          <View style={st.relativeFull}>
            <Image source={{ uri: imagePreviews[field] }} style={st.previewImg} resizeMode="cover" />
            <TouchableOpacity
              onPress={() => {
                setImagePreviews(prev => ({ ...prev, [field]: '' }));
                setImages(prev => ({ ...prev, [field]: null }));
              }}
              style={st.deleteBtn}
            >
              <Trash2 size={16} color="white" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={st.uploadActions}>
            <TouchableOpacity
              onPress={() => pickImage(field, false)}
              style={[st.uploadBtn, { marginRight: 16 }]}
            >
              <ImageIcon size={24} color="#ea580c" />
              <Text style={st.uploadBtnText}>GALLERY</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => pickImage(field, true)}
              style={st.uploadBtn}
            >
              <Camera size={24} color="#ea580c" />
              <Text style={st.uploadBtnText}>CAMERA</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <Modal visible={isOpen} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={[st.container, { backgroundColor: isDarkMode ? '#030712' : '#ffffff' }]}>
        {/* Loading Overlay */}
        {loading && (
          <View style={st.loadingOverlay}>
            <View style={[st.loadingBox, { backgroundColor: isDarkMode ? '#1f2937' : '#ffffff' }]}>
              <ActivityIndicator size="large" color="#ea580c" />
              <Text style={[st.loadingTitle, { color: isDarkMode ? '#ffffff' : '#111827' }]}>{loadingPercentage}%</Text>
              <Text style={[st.loadingSubTitle, { color: isDarkMode ? '#9ca3af' : '#4b5563' }]}>Saving your progress...</Text>
            </View>
          </View>
        )}

        {/* Header */}
        <View style={[st.header, {
          backgroundColor: isDarkMode ? '#111827' : '#f9fafb',
          borderBottomColor: isDarkMode ? '#1f2937' : '#e5e7eb',
          paddingTop: isTablet ? 16 : 60
        }]}>
          <View style={st.flexOne}>
            {/* Removed Title */}
          </View>
          <View style={st.headerBtns}>
            <TouchableOpacity onPress={onClose} style={[st.cancelHeaderBtn, { marginRight: 8 }]}>
              <Text style={st.cancelHeaderBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              disabled={loading}
              style={[st.saveHeaderBtn, {
                backgroundColor: colorPalette?.primary || '#ea580c',
                opacity: loading ? 0.5 : 1
              }]}
            >
              <Text style={st.saveHeaderBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={st.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={st.formWrapper}>
          <View style={st.fieldItem}>
            <Text style={[st.fieldLabel, { color: isDarkMode ? '#d1d5db' : '#374151' }]}>Instructions <Text style={st.requiredStar}>*</Text></Text>
            <TextInput
              value={formData.instructions}
              onChangeText={(text) => handleInputChange('instructions', text)}
              placeholder="Enter detailed instructions"
              placeholderTextColor={isDarkMode ? '#6b7280' : '#9ca3af'}
              style={[st.textInput, {
                borderColor: errors.instructions ? '#ef4444' : isDarkMode ? '#1f2937' : '#e5e7eb',
                backgroundColor: isDarkMode ? '#111827' : '#ffffff',
                color: isDarkMode ? '#ffffff' : '#111827'
              }]}
            />
          </View>

          <View style={st.fieldItem}>
            <Text style={[st.fieldLabel, { color: isDarkMode ? '#d1d5db' : '#374151' }]}>Work Category <Text style={st.requiredStar}>*</Text></Text>
            <View style={[st.pickerWrapper, {
              backgroundColor: isDarkMode ? '#111827' : '#ffffff',
              borderColor: isDarkMode ? '#1f2937' : '#e5e7eb'
            }]}>
              <Picker
                selectedValue={formData.work_category}
                onValueChange={(val) => handleInputChange('work_category', val)}
                style={{ color: isDarkMode ? 'white' : 'black' }}
                dropdownIconColor={isDarkMode ? 'white' : 'black'}
              >
                <Picker.Item label="Select Category" value="" />
                {categories.map(c => <Picker.Item key={c.id} label={c.category} value={c.category} />)}
              </Picker>
            </View>
          </View>

          <View style={st.row}>
            <View style={[st.flexOne, { marginRight: 16 }]}>
              <Text style={[st.fieldLabel, { color: isDarkMode ? '#d1d5db' : '#374151' }]}>Report To <Text style={st.requiredStar}>*</Text></Text>
              <TextInput
                value={formData.report_to}
                onChangeText={(text) => handleInputChange('report_to', text)}
                placeholder="Person name"
                placeholderTextColor={isDarkMode ? '#6b7280' : '#9ca3af'}
                style={[st.textInput, {
                  borderColor: errors.report_to ? '#ef4444' : isDarkMode ? '#1f2937' : '#e5e7eb',
                  backgroundColor: isDarkMode ? '#111827' : '#ffffff',
                  color: isDarkMode ? '#ffffff' : '#111827'
                }]}
              />
            </View>
            <View style={st.flexOne}>
              <Text style={[st.fieldLabel, { color: isDarkMode ? '#d1d5db' : '#374151' }]}>Assign To <Text style={st.requiredStar}>*</Text></Text>
              <View style={[st.pickerWrapper, {
                backgroundColor: isDarkMode ? '#111827' : '#ffffff',
                borderColor: isDarkMode ? '#1f2937' : '#e5e7eb'
              }]}>
                <Picker
                  selectedValue={formData.assign_to}
                  onValueChange={(val) => handleInputChange('assign_to', val)}
                  style={{ color: isDarkMode ? 'white' : 'black' }}
                  dropdownIconColor={isDarkMode ? 'white' : 'black'}
                >
                  <Picker.Item label="Select User" value="" />
                  {assignees.map(t => <Picker.Item key={t.email} label={t.email} value={t.email} />)}
                </Picker>
              </View>
            </View>
          </View>

          {((userRole !== 1 && userRole !== 7) || isEditMode) && (
            <View style={st.fieldItem}>
              <Text style={[st.fieldLabel, { color: isDarkMode ? '#d1d5db' : '#374151' }]}>Work Status</Text>
              <View style={[st.pickerWrapper, {
                backgroundColor: isDarkMode ? '#111827' : '#ffffff',
                borderColor: isDarkMode ? '#1f2937' : '#e5e7eb'
              }]}>
                <Picker
                  selectedValue={formData.work_status}
                  onValueChange={(val) => handleInputChange('work_status', val)}
                  style={{ color: isDarkMode ? 'white' : 'black' }}
                  dropdownIconColor={isDarkMode ? 'white' : 'black'}
                >
                  <Picker.Item label="Pending" value="Pending" />
                  <Picker.Item label="In Progress" value="In Progress" />
                  <Picker.Item label="Completed" value="Completed" />
                  <Picker.Item label="Failed" value="Failed" />
                  <Picker.Item label="Cancelled" value="Cancelled" />
                </Picker>
              </View>
            </View>
          )}

          <View style={st.fieldItem}>
            <Text style={[st.fieldLabel, { color: isDarkMode ? '#d1d5db' : '#374151' }]}>Remarks</Text>
            <TextInput
              value={formData.remarks}
              onChangeText={(text) => handleInputChange('remarks', text)}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              placeholder="Internal notes..."
              placeholderTextColor={isDarkMode ? '#6b7280' : '#9ca3af'}
              style={[st.textArea, {
                borderColor: isDarkMode ? '#1f2937' : '#e5e7eb',
                backgroundColor: isDarkMode ? '#111827' : '#ffffff',
                color: isDarkMode ? '#ffffff' : '#111827'
              }]}
            />
          </View>

          {isEditMode && (
            <View style={st.editSection}>
              <View style={{ marginBottom: 24 }}>
                <ImageUploadSection field="image_1" label="Project Photo 1" />
              </View>
              <View style={{ marginBottom: 24 }}>
                <ImageUploadSection field="image_2" label="Project Photo 2" />
              </View>
              <View style={{ marginBottom: 24 }}>
                <ImageUploadSection field="image_3" label="Project Photo 3" />
              </View>

              <View style={st.fieldItem}>
                <Text style={[st.fieldLabel, { color: isDarkMode ? '#d1d5db' : '#374151' }]}>
                  Client Signature
                </Text>
                <View style={[st.sigWrapper, { borderColor: isDarkMode ? '#1f2937' : '#e5e7eb' }]}>
                  {imagePreviews.signature ? (
                    <View style={st.sigPreview}>
                      <Image source={{ uri: imagePreviews.signature }} style={st.sigImg} resizeMode="contain" />
                      <TouchableOpacity
                        onPress={() => {
                          setImagePreviews(prev => ({ ...prev, signature: '' }));
                          setImages(prev => ({ ...prev, signature: null }));
                        }}
                        style={st.sigTrashBtn}
                      >
                        <Trash2 size={20} color="white" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={st.flexOne}>
                      <SignatureScreen
                        ref={sigCanvas}
                        onOK={handleSignature}
                        webStyle={signatureStyle}
                        descriptionText="Please sign above"
                        clearText="Clear"
                        confirmText="Lock Signature"
                      />
                    </View>
                  )}
                </View>
                <Text style={[st.hintText, { color: isDarkMode ? '#4b5563' : '#9ca3af' }]}>
                  * Tap 'Lock Signature' to confirm your drawing.
                </Text>
              </View>
            </View>
          )}
          <View style={st.bottomSpacer} />
        </ScrollView>
      </View>
    </Modal>
  );
};

const signatureStyle = `
  .m-signature-pad--footer { display: none; margin: 0px; }
  body,html { width: 100%; height: 100%; background-color: #fff; }
`;

const st = StyleSheet.create({
  container: { flex: 1 },
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 100, alignItems: 'center', justifyContent: 'center' },
  loadingBox: { padding: 32, borderRadius: 24, alignItems: 'center' },
  loadingTitle: { marginTop: 16, fontSize: 24, fontWeight: 'bold' },
  loadingSubTitle: { marginTop: 8, fontSize: 14 },
  header: { paddingHorizontal: 16, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  headerBtns: { flexDirection: 'row', alignItems: 'center' },
  cancelHeaderBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: '#e5e7eb' },
  cancelHeaderBtnText: { color: '#111827', fontWeight: 'bold' },
  saveHeaderBtn: { paddingHorizontal: 24, paddingVertical: 8, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 },
  saveHeaderBtnText: { color: 'white', fontWeight: 'bold' },
  scrollView: { flex: 1 },
  formWrapper: { padding: 16, paddingBottom: 40 },
  fieldItem: { marginBottom: 16 },
  fieldLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  requiredStar: { color: '#ef4444' },
  textInput: { width: '100%', paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderRadius: 12 },
  pickerWrapper: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  row: { flexDirection: 'row', marginBottom: 16 },
  flexOne: { flex: 1 },
  textArea: { width: '100%', paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderRadius: 12, minHeight: 100 },
  editSection: { marginTop: 16 },
  imageSection: { marginBottom: 16 },
  dashedBox: { borderWidth: 2, borderStyle: 'dashed', borderRadius: 12, padding: 16, alignItems: 'center', justifyContent: 'center', minHeight: 160 },
  relativeFull: { position: 'relative', width: '100%', alignItems: 'center' },
  previewImg: { width: '100%', height: 160, borderRadius: 8 },
  deleteBtn: { position: 'absolute', top: -10, right: -10, backgroundColor: '#ef4444', width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', elevation: 4 },
  uploadActions: { flexDirection: 'row' },
  uploadBtn: { alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12, backgroundColor: 'rgba(234, 88, 12, 0.1)', borderWidth: 1, borderColor: 'rgba(234, 88, 12, 0.2)' },
  uploadBtnText: { fontSize: 10, marginTop: 4, color: '#ea580c', fontWeight: 'bold' },
  sigWrapper: { borderWidth: 1, borderRadius: 16, overflow: 'hidden', position: 'relative', width: '100%', height: 320, backgroundColor: '#ffffff' },
  sigPreview: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  sigImg: { width: '100%', height: '100%' },
  sigTrashBtn: { position: 'absolute', top: 16, right: 16, backgroundColor: '#ef4444', width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', elevation: 4 },
  hintText: { fontSize: 10, marginTop: 8, fontStyle: 'italic' },
  bottomSpacer: { height: 40 }
});

export default AssignWorkOrderModal;
