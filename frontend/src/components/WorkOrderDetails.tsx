import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Linking,
  useWindowDimensions,
  StyleSheet
} from 'react-native';
import { X, ExternalLink, Play, Square } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WorkOrderDetailsProps } from '../types/workOrder';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';
import { updateWorkOrder } from '../services/workOrderService';
import ConfirmationModal from '../modals/MoveToJoModal';

const formatDate = (dateStr?: string | null): string => {
  if (!dateStr) return 'Not set';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const datePart = `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
    const timePart = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${datePart} ${timePart}`;
  } catch (e) {
    return dateStr || 'Not set';
  }
};

const getStatusColor = (status: string | undefined | null): string => {
  if (!status) return '#9ca3af';
  const s = status.toLowerCase().trim();
  switch (s) {
    case 'completed':
    case 'done':
      return '#4ade80';
    case 'in progress':
    case 'inprogress':
      return '#60a5fa';
    case 'pending':
      return '#fb923c';
    case 'failed':
    case 'cancelled':
      return '#ef4444';
    case 'on hold':
      return '#a78bfa';
    default:
      return '#9ca3af';
  }
};

const getFieldLabel = (fieldKey: string): string => {
  const labels: Record<string, string> = {
    workOrderId: 'Work Order ID',
    instructions: 'Instructions / Brief Description',
    reportTo: 'Report To',
    assignTo: 'Assign To',
    workStatus: 'Work Status',
    remarks: 'Remarks',
    requestedBy: 'Requested By',
    requestedDate: 'Requested Date',
    updatedBy: 'Updated By',
    updatedDate: 'Updated Date',
    startTime: 'Start Time',
    endTime: 'End Time',
    duration: 'Duration',
    image1: 'Image 1',
    image2: 'Image 2',
    image3: 'Image 3',
    signature: 'Signature',
  };
  return labels[fieldKey] || fieldKey;
};

const defaultFields = [
  'workOrderId',
  'instructions',
  'reportTo',
  'assignTo',
  'workStatus',
  'remarks',
  'requestedBy',
  'requestedDate',
  'updatedBy',
  'updatedDate',
  'startTime',
  'endTime',
  'duration',
  'image1',
  'image2',
  'image3',
  'signature',
];

const WorkOrderDetails: React.FC<WorkOrderDetailsProps & { isDarkMode?: boolean; colorPalette?: ColorPalette | null }> = ({
  workOrder,
  onClose,
  onEdit,
  onRefresh,
  isDarkMode: propDarkMode,
  colorPalette: propColorPalette
}) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(() => propColorPalette ?? settingsColorPaletteService.getActiveSync());
  const [userRole, setUserRole] = useState<string>('');
  const [userRoleId, setUserRoleId] = useState<number | null>(null);
  const [isStarted, setIsStarted] = useState(!!(workOrder as any).start_time);
  const [isEnded, setIsEnded] = useState(!!(workOrder as any).end_time);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');

  useEffect(() => {
    setIsStarted(!!(workOrder as any).start_time);
    setIsEnded(!!(workOrder as any).end_time);
  }, [workOrder]);

  useEffect(() => {
    const loadSettings = async () => {
      const authData = await AsyncStorage.getItem('authData');
      if (authData) {
        try {
          const parsed = JSON.parse(authData);
          setUserRoleId(parsed.role_id || parsed.roleId || null);
          setUserRole(parsed.role?.toLowerCase() || parsed.roleName?.toLowerCase() || '');
        } catch (error) { }
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    if (propColorPalette) setColorPalette(propColorPalette);
  }, [propColorPalette]);

  if (!workOrder) return null;

  const dynamicValueColor = '#111827';
  const valStyle = [st.valueText, { color: dynamicValueColor }];

  const renderImageLink = useCallback((url: string | undefined | null) => (
    <View style={st.imageLinkRow}>
      <Text style={[st.imageLinkText, { color: dynamicValueColor }]} numberOfLines={1} selectable={true}>
        {url || 'No image available'}
      </Text>
      {url && (
        <Pressable onPress={() => Linking.openURL(url || '')}>
          <ExternalLink width={16} height={16} color="#4b5563" />
        </Pressable>
      )}
    </View>
  ), []);

  const formatMySQLDate = () => {
    const now = new Date();
    return now.getFullYear() + '-' + 
      String(now.getMonth() + 1).padStart(2, '0') + '-' + 
      String(now.getDate()).padStart(2, '0') + ' ' + 
      String(now.getHours()).padStart(2, '0') + ':' + 
      String(now.getMinutes()).padStart(2, '0') + ':' + 
      String(now.getSeconds()).padStart(2, '0');
  };
  const handleStartTimer = async () => {
    try {
      setLoading(true);
      setError(null);
      if (!workOrder.id) throw new Error('Cannot update work order: Missing ID');

      const currentTime = formatMySQLDate();
      await updateWorkOrder(workOrder.id, {
        start_time: currentTime,
      } as any);

      (workOrder as any).start_time = currentTime;
      setIsStarted(true);
      setSuccessMessage('Work timer started successfully!');
      setShowSuccessModal(true);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setError(`Failed to start timer: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEndTimer = async () => {
    try {
      setLoading(true);
      setError(null);
      if (!workOrder.id) throw new Error('Cannot update work order: Missing ID');

      const currentTime = formatMySQLDate();
      await updateWorkOrder(workOrder.id, {
        end_time: currentTime,
      } as any);

      (workOrder as any).end_time = currentTime;
      setIsEnded(true);
      setSuccessMessage('Work timer ended successfully!');
      setShowSuccessModal(true);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setError(`Failed to end timer: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getDurationString = (start?: string | null, end?: string | null): string => {
    if (!start || !end) return 'N/A';
    const startTime = new Date(start.replace(' ', 'T')).getTime();
    const endTime = new Date(end.replace(' ', 'T')).getTime();
    if (isNaN(startTime) || isNaN(endTime)) return 'N/A';
    
    const diff = Math.max(0, endTime - startTime);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  const fieldRenderers: Record<string, () => React.ReactNode> = useMemo(() => ({
    workOrderId: () => <Text style={valStyle} selectable={true}>{workOrder.id || 'N/A'}</Text>,
    instructions: () => <Text style={valStyle} selectable={true}>{workOrder.instructions || 'No instructions'}</Text>,
    reportTo: () => <Text style={valStyle} selectable={true}>{workOrder.report_to || 'Not specified'}</Text>,
    assignTo: () => <Text style={valStyle} selectable={true}>{workOrder.assign_to || 'Not assigned'}</Text>,
    workStatus: () => (
      <Text style={[st.statusText, { color: getStatusColor(workOrder.work_status) }]}>
        {workOrder.work_status || 'Not set'}
      </Text>
    ),
    remarks: () => <Text style={valStyle} selectable={true}>{workOrder.remarks || 'No remarks'}</Text>,
    requestedBy: () => <Text style={valStyle} selectable={true}>{workOrder.requested_by || 'System'}</Text>,
    requestedDate: () => <Text style={valStyle} selectable={true}>{formatDate(workOrder.requested_date)}</Text>,
    updatedBy: () => <Text style={valStyle} selectable={true}>{workOrder.updated_by || 'Not updated'}</Text>,
    updatedDate: () => <Text style={valStyle} selectable={true}>{formatDate(workOrder.updated_date)}</Text>,
    startTime: () => <Text style={valStyle} selectable={true}>{formatDate((workOrder as any).start_time)}</Text>,
    endTime: () => <Text style={valStyle} selectable={true}>{formatDate((workOrder as any).end_time)}</Text>,
    duration: () => <Text style={valStyle} selectable={true}>{getDurationString((workOrder as any).start_time, (workOrder as any).end_time)}</Text>,
    image1: () => renderImageLink(workOrder.image_1),
    image2: () => renderImageLink(workOrder.image_2),
    image3: () => renderImageLink(workOrder.image_3),
    signature: () => renderImageLink(workOrder.signature),
  }), [workOrder, renderImageLink]);

  const isFieldEmpty = useCallback((fieldKey: string): boolean => {
    switch (fieldKey) {
      case 'workOrderId': return !workOrder.id;
      case 'instructions': return !workOrder.instructions || workOrder.instructions === 'No instructions';
      case 'reportTo': return !workOrder.report_to || workOrder.report_to === 'Not specified';
      case 'assignTo': return !workOrder.assign_to || workOrder.assign_to === 'Not assigned';
      case 'workStatus': return !workOrder.work_status || workOrder.work_status === 'Not set';
      case 'remarks': return !workOrder.remarks || workOrder.remarks === 'No remarks';
      case 'requestedBy': return !workOrder.requested_by || workOrder.requested_by === 'System';
      case 'requestedDate': return !workOrder.requested_date;
      case 'updatedBy': return !workOrder.updated_by || workOrder.updated_by === 'Not updated';
      case 'updatedDate': return !workOrder.updated_date;
      case 'startTime': return !(workOrder as any).start_time;
      case 'endTime': return !(workOrder as any).end_time;
      case 'duration': return !(workOrder as any).start_time || !(workOrder as any).end_time;
      case 'image1': return !workOrder.image_1;
      case 'image2': return !workOrder.image_2;
      case 'image3': return !workOrder.image_3;
      case 'signature': return !workOrder.signature;
      default: return false;
    }
  }, [workOrder]);

  const renderFieldContent = useCallback((fieldKey: string) => {
    const renderer = fieldRenderers[fieldKey];
    if (!renderer || isFieldEmpty(fieldKey)) return null;

    return (
      <View key={fieldKey} style={[st.fieldRow, { borderBottomColor: '#e5e7eb' }]}>
        <Text style={[st.fieldLabel, { color: '#6b7280' }]}>{getFieldLabel(fieldKey)}</Text>
        <View style={st.fieldValueWrap}>
          {renderer()}
        </View>
      </View>
    );
  }, [fieldRenderers, isFieldEmpty]);

  return (
    <View style={[st.container, {
      borderLeftWidth: !isMobile ? 1 : 0,
      backgroundColor: '#f9fafb',
      borderLeftColor: '#d1d5db'
    }]}>
      <View style={[st.header, {
        paddingTop: isMobile ? 60 : 12,
        backgroundColor: '#ffffff',
        borderBottomColor: '#e5e7eb'
      }]}>
        <View style={st.headerLeft}>
          <Text
            style={[st.headerName, {
              maxWidth: isMobile ? 200 : undefined,
              fontSize: isMobile ? 20 : 24,
              color: '#111827'
            }]}
            numberOfLines={1}
          >
            Work Order #{workOrder.id}
          </Text>
        </View>

        <View style={st.headerActions}>
          {(workOrder.work_status?.toLowerCase().includes('pending') || workOrder.work_status?.toLowerCase().includes('in progress')) && (
            <Pressable
              style={[st.actionBtn, { backgroundColor: colorPalette?.primary || '#7c3aed', marginRight: 8 }]}
              onPress={onEdit}
            >
              <Text style={[st.actionBtnText, { color: '#ffffff', fontSize: isMobile ? 14 : 16 }]}>Edit</Text>
            </Pressable>
          )}

          {userRoleId === 2 && !isEnded && (
            <>
              {!isStarted ? (
                <Pressable
                  style={[st.iconBtn, { backgroundColor: colorPalette?.primary || '#10b981', marginRight: 8 }]}
                  onPress={handleStartTimer}
                  disabled={loading}
                >
                  <Play width={18} height={18} color="#ffffff" />
                </Pressable>
              ) : (
                <Pressable
                  style={[st.iconBtn, { backgroundColor: colorPalette?.primary || '#ef4444', marginRight: 8 }]}
                  onPress={handleEndTimer}
                  disabled={loading}
                >
                  <Square width={18} height={18} color="#ffffff" />
                </Pressable>
              )}
            </>
          )}

          <Pressable onPress={onClose} style={{ padding: 4 }}>
            <X width={28} height={28} color="#4b5563" />
          </Pressable>
        </View>
      </View>

      {error && (
        <View style={[st.errorBox, {
          backgroundColor: '#fef2f2',
          borderColor: '#fca5a5'
        }]}>
          <Text style={{ color: '#991b1b' }}>{error}</Text>
        </View>
      )}

      <ScrollView style={st.flex1} showsVerticalScrollIndicator={false} contentContainerStyle={st.scrollContent}>
        <View style={[st.fieldsContainer, { backgroundColor: '#f9fafb' }]}>
          {defaultFields.map(renderFieldContent)}
        </View>
      </ScrollView>

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

const st = StyleSheet.create({
  container: { flex: 1, flexDirection: 'column', overflow: 'hidden', position: 'relative', width: '100%' },
  header: { padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  headerName: { fontWeight: '500' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 2, flexDirection: 'row', alignItems: 'center' },
  actionBtnText: { color: '#ffffff', fontWeight: '500' },
  iconBtn: { padding: 6, borderRadius: 9999, alignItems: 'center', justifyContent: 'center' },
  errorBox: { padding: 12, margin: 12, borderRadius: 4, borderWidth: 1 },
  statusText: { fontSize: 14, fontWeight: '600', textTransform: 'capitalize' },
  flex1: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  fieldsContainer: { width: '100%', minHeight: '100%', paddingVertical: 8 },
  fieldRow: { flexDirection: 'column', borderBottomWidth: 1, paddingVertical: 4, paddingHorizontal: 16, alignItems: 'flex-start', gap: 2 },
  fieldLabel: { fontSize: 14, fontWeight: '500' },
  fieldValueWrap: { width: '100%' },
  valueText: { fontSize: 16 },
  imageLinkRow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  imageLinkText: { flex: 1, marginRight: 8, fontSize: 16 },
});

export default WorkOrderDetails;
