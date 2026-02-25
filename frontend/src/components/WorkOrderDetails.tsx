import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Modal,
  Alert,
  Platform,
  StyleSheet,
  useWindowDimensions
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { X, CheckCircle2 } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';
import { WorkOrder, WorkOrderDetailsProps } from '../types/workOrder';
import { ColorPalette } from '../services/settingsColorPaletteService';
import AssignWorkOrderModal from '../modals/AssignWorkOrderModal';

interface SuccessModalProps {
  isOpen: boolean;
  message: string;
  onClose: () => void;
  isDarkMode: boolean;
}

const SuccessModal: React.FC<SuccessModalProps> = ({ isOpen, message, onClose, isDarkMode }) => {
  return (
    <Modal
      visible={isOpen}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={st.modalOverlay}>
        <View style={[st.modalContent, { backgroundColor: isDarkMode ? '#1f2937' : '#ffffff' }]}>
          <View style={st.itemsCenter}>
            <View style={st.iconCircle}>
              <CheckCircle2 size={32} color="#16a34a" />
            </View>
            <Text style={[st.modalTitle, { color: isDarkMode ? '#ffffff' : '#111827' }]}>Success!</Text>
            <Text style={[st.modalMessage, { color: isDarkMode ? '#d1d5db' : '#6b7280' }]}>{message}</Text>
            <TouchableOpacity
              onPress={onClose}
              style={st.modalBtn}
            >
              <Text style={st.modalBtnText}>Great!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const WorkOrderDetails: React.FC<WorkOrderDetailsProps & { isDarkMode?: boolean; colorPalette?: ColorPalette | null }> = ({
  workOrder,
  onClose,
  isDarkMode = true,
  colorPalette
}) => {
  const [formData, setFormData] = useState<Partial<WorkOrder>>({
    instructions: '',
    report_to: '',
    assign_to: '',
    remarks: '',
    work_status: 'Pending'
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successModalConfig, setSuccessModalConfig] = useState({ isOpen: false, message: '' });
  const [userRole, setUserRole] = useState<number | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  useEffect(() => {
    const loadAuthData = async () => {
      try {
        const authData = await AsyncStorage.getItem('authData');
        if (authData) {
          const parsed = JSON.parse(authData);
          setUserRole(parsed.role_id || parsed.roleId || null);
        }
      } catch (e) {
        console.error('Error loading auth data:', e);
      }
    };
    loadAuthData();
  }, []);

  useEffect(() => {
    if (workOrder) {
      setFormData({
        instructions: workOrder.instructions || '',
        report_to: workOrder.report_to || '',
        assign_to: workOrder.assign_to || '',
        remarks: workOrder.remarks || '',
        work_status: workOrder.work_status || 'Pending'
      });
    }
  }, [workOrder]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.instructions?.trim()) newErrors.instructions = 'Instructions are required';
    if (!formData.report_to?.trim()) newErrors.report_to = 'Report To is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setLoading(true);

    try {
      const authData = await AsyncStorage.getItem('authData');
      const currentUserEmail = authData ? JSON.parse(authData)?.email : 'system';

      const payload = {
        ...formData,
        [workOrder ? 'updated_by' : 'requested_by']: currentUserEmail
      };

      const url = workOrder
        ? `${API_BASE_URL}/work-orders/${workOrder.id}`
        : `${API_BASE_URL}/work-orders`;

      const method = workOrder ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccessModalConfig({
          isOpen: true,
          message: data.message || `Work order ${workOrder ? 'updated' : 'added'} successfully`
        });
      } else {
        if (data.errors) {
          const errorMessages = Object.values(data.errors).flat().join('\n');
          Alert.alert('Validation errors', errorMessages);
        } else {
          Alert.alert('Error', data.message || `Failed to ${workOrder ? 'update' : 'add'} work order`);
        }
      }
    } catch (error: any) {
      Alert.alert('Error', `Error saving work order: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessClose = () => {
    setSuccessModalConfig({ isOpen: false, message: '' });
    onClose();
  };

  return (
    <>
      <Modal
        visible={!!workOrder || !workOrder}
        animationType="slide"
        onRequestClose={onClose}
        transparent={false}
      >
        <View style={[st.container, { backgroundColor: isDarkMode ? '#030712' : '#ffffff' }]}>
          {/* Header */}
          <View style={[st.header, {
            backgroundColor: isDarkMode ? '#111827' : '#f9fafb',
            borderBottomColor: isDarkMode ? '#1f2937' : '#e5e7eb',
            paddingTop: isTablet ? 16 : 60
          }]}>
            <View style={st.headerTitleContainer}>
              {/* Removed Title Text */}
            </View>
            <TouchableOpacity onPress={onClose} style={[st.actionIconBtn, { backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6' }]}>
              <X size={24} color={isDarkMode ? 'white' : 'black'} />
            </TouchableOpacity>
          </View>

          <ScrollView style={st.scrollView} contentContainerStyle={st.formWrapper}>
            <View style={st.actionsContainer}>
              {workOrder && userRole !== 1 && userRole !== 7 && (
                <TouchableOpacity
                  onPress={() => setShowAssignModal(true)}
                  style={[st.blueBtn, { marginBottom: 12 }]}
                >
                  <Text style={st.whiteBold}>Edit Location Details</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={handleSubmit}
                disabled={loading}
                style={[st.mainBtn, {
                  backgroundColor: colorPalette?.primary || '#ea580c',
                  opacity: loading ? 0.7 : 1,
                  marginBottom: 12
                }]}
              >
                {loading ? (
                  <View style={st.btnContent}>
                    <ActivityIndicator size="small" color="white" style={st.loaderMargin} />
                    <Text style={st.whiteBold}>Saving...</Text>
                  </View>
                ) : (
                  <Text style={st.whiteBold}>Save Order</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onClose}
                style={[st.cancelBtn, {
                  backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6',
                  borderColor: isDarkMode ? '#374151' : '#d1d5db'
                }]}
              >
                <Text style={{ color: isDarkMode ? 'white' : '#111827' }}>Cancel</Text>
              </TouchableOpacity>
            </View>

            <View style={st.fieldsContainer}>
              <View style={[st.fieldItem, { marginBottom: 16 }]}>
                <Text style={[st.fieldLabel, { color: isDarkMode ? '#d1d5db' : '#374151' }]}>
                  Instructions / Brief Description <Text style={st.requiredStar}>*</Text>
                </Text>
                <TextInput
                  value={formData.instructions}
                  onChangeText={(text) => setFormData({ ...formData, instructions: text })}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  placeholder="Enter detailed instructions here..."
                  placeholderTextColor={isDarkMode ? '#6b7280' : '#9ca3af'}
                  style={[st.textArea, {
                    borderColor: errors.instructions ? '#ef4444' : isDarkMode ? '#1f2937' : '#e5e7eb',
                    backgroundColor: isDarkMode ? '#111827' : '#ffffff',
                    color: isDarkMode ? '#ffffff' : '#111827'
                  }]}
                />
                {errors.instructions && <Text style={st.errorTip}>{errors.instructions}</Text>}
              </View>

              <View style={st.fieldItem}>
                <Text style={[st.fieldLabel, { color: isDarkMode ? '#d1d5db' : '#374151' }]}>
                  Report To <Text style={st.requiredStar}>*</Text>
                </Text>
                <TextInput
                  value={formData.report_to}
                  onChangeText={(text) => setFormData({ ...formData, report_to: text })}
                  placeholder="e.g. John Doe"
                  placeholderTextColor={isDarkMode ? '#6b7280' : '#9ca3af'}
                  style={[st.textInput, {
                    borderColor: errors.report_to ? '#ef4444' : isDarkMode ? '#1f2937' : '#e5e7eb',
                    backgroundColor: isDarkMode ? '#111827' : '#ffffff',
                    color: isDarkMode ? '#ffffff' : '#111827'
                  }]}
                />
                {errors.report_to && <Text style={st.errorTip}>{errors.report_to}</Text>}
              </View>

              <View style={st.fieldItem}>
                <Text style={[st.fieldLabel, { color: isDarkMode ? '#d1d5db' : '#374151' }]}>
                  Assign To
                </Text>
                <TextInput
                  value={formData.assign_to}
                  onChangeText={(text) => setFormData({ ...formData, assign_to: text })}
                  placeholder="e.g. Jane Smith"
                  placeholderTextColor={isDarkMode ? '#6b7280' : '#9ca3af'}
                  style={[st.textInput, {
                    borderColor: isDarkMode ? '#1f2937' : '#e5e7eb',
                    backgroundColor: isDarkMode ? '#111827' : '#ffffff',
                    color: isDarkMode ? '#ffffff' : '#111827'
                  }]}
                />
              </View>

              <View style={st.fieldItem}>
                <Text style={[st.fieldLabel, { color: isDarkMode ? '#d1d5db' : '#374151' }]}>
                  Status
                </Text>
                <View style={[st.pickerWrapper, {
                  backgroundColor: isDarkMode ? '#111827' : '#ffffff',
                  borderColor: isDarkMode ? '#1f2937' : '#e5e7eb'
                }]}>
                  <Picker
                    selectedValue={formData.work_status}
                    onValueChange={(itemValue) => setFormData({ ...formData, work_status: itemValue })}
                    style={{ color: isDarkMode ? 'white' : 'black', height: 50 }}
                    dropdownIconColor={isDarkMode ? 'white' : 'black'}
                  >
                    <Picker.Item label="Pending" value="Pending" />
                    <Picker.Item label="In Progress" value="In Progress" />
                    <Picker.Item label="Completed" value="Completed" />
                    <Picker.Item label="Failed" value="Failed" />
                    <Picker.Item label="Cancelled" value="Cancelled" />
                    <Picker.Item label="On Hold" value="On Hold" />
                  </Picker>
                </View>
              </View>

              <View style={st.fieldItem}>
                <Text style={[st.fieldLabel, { color: isDarkMode ? '#d1d5db' : '#374151' }]}>
                  Internal Remarks
                </Text>
                <TextInput
                  value={formData.remarks}
                  onChangeText={(text) => setFormData({ ...formData, remarks: text })}
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                  placeholder="Additional context or notes if any..."
                  placeholderTextColor={isDarkMode ? '#6b7280' : '#9ca3af'}
                  style={[st.textAreaSmall, {
                    borderColor: isDarkMode ? '#1f2937' : '#e5e7eb',
                    backgroundColor: isDarkMode ? '#111827' : '#ffffff',
                    color: isDarkMode ? '#ffffff' : '#111827'
                  }]}
                />
              </View>
            </View>
            <View style={st.bottomSpacer} />
          </ScrollView>
        </View>

        <SuccessModal
          isOpen={successModalConfig.isOpen}
          message={successModalConfig.message}
          onClose={handleSuccessClose}
          isDarkMode={isDarkMode}
        />

        {showAssignModal && (
          <AssignWorkOrderModal
            isOpen={showAssignModal}
            isEditMode={true}
            workOrder={workOrder}
            onClose={() => setShowAssignModal(false)}
            onSave={() => {
              setShowAssignModal(false);
              onClose();
            }}
            onRefresh={() => {
              setShowAssignModal(false);
              onClose();
            }}
          />
        )}
      </Modal>
    </>
  );
};

const st = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modalContent: { padding: 24, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 8, maxWidth: 400, width: '100%' },
  itemsCenter: { alignItems: 'center' },
  iconCircle: { height: 64, width: 64, borderRadius: 32, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  modalMessage: { fontSize: 14, textAlign: 'center', marginBottom: 24, paddingHorizontal: 8 },
  modalBtn: { width: '100%', height: 48, borderRadius: 12, backgroundColor: '#16a34a', alignItems: 'center', justifyContent: 'center', shadowColor: '#16a34a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
  modalBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1 },
  headerTitleContainer: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  actionIconBtn: { padding: 8, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  closeBtn: { padding: 8 },
  scrollView: { flex: 1 },
  formWrapper: { padding: 16 },
  actionsContainer: { flexDirection: 'column', marginBottom: 24 },
  blueBtn: { borderRadius: 12, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1, elevation: 1, height: 48 },
  mainBtn: { height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1, elevation: 1 },
  btnContent: { flexDirection: 'row', alignItems: 'center' },
  loaderMargin: { marginRight: 8 },
  whiteBold: { color: 'white', fontWeight: 'bold' },
  cancelBtn: { height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  fieldsContainer: {},
  fieldItem: { marginBottom: 4 },
  fieldLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  requiredStar: { color: '#ef4444' },
  textArea: { width: '100%', paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderRadius: 12, minHeight: 100 },
  textAreaSmall: { width: '100%', paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderRadius: 12, minHeight: 60 },
  textInput: { width: '100%', paddingHorizontal: 16, height: 48, borderWidth: 1, borderRadius: 12 },
  errorTip: { color: '#ef4444', fontSize: 12, marginTop: 4 },
  pickerWrapper: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  bottomSpacer: { height: 80 }
});

export default WorkOrderDetails;
