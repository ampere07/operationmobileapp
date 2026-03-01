import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Linking,
  useWindowDimensions,
  StyleSheet
} from 'react-native';
import { X, ExternalLink, Edit } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WorkOrderDetailsProps } from '../types/workOrder';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';

const WorkOrderDetails: React.FC<WorkOrderDetailsProps & { isDarkMode?: boolean; colorPalette?: ColorPalette | null }> = ({
  workOrder,
  onClose,
  onEdit,
  isDarkMode: propDarkMode,
  colorPalette: propColorPalette
}) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [isDarkMode, setIsDarkMode] = useState(propDarkMode ?? true);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(propColorPalette ?? null);
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState<string>('');
  const [userRoleId, setUserRoleId] = useState<number | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        if (propDarkMode === undefined) {
          const theme = await AsyncStorage.getItem('theme');
          setIsDarkMode(theme !== 'light');
        }

        if (!propColorPalette) {
          const palette = await settingsColorPaletteService.getActive();
          setColorPalette(palette);
        }

        const authData = await AsyncStorage.getItem('authData');
        if (authData) {
          try {
            const parsed = JSON.parse(authData);
            const rId = parsed.role_id || parsed.roleId || null;
            setUserRoleId(rId);
            setUserRole(parsed.role?.toLowerCase() || parsed.roleName?.toLowerCase() || '');
          } catch (error) {
            console.error('Error parsing auth data:', error);
          }
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    if (propDarkMode !== undefined) setIsDarkMode(propDarkMode);
  }, [propDarkMode]);

  useEffect(() => {
    if (propColorPalette) setColorPalette(propColorPalette);
  }, [propColorPalette]);

  const handleDoneClick = () => {
    // Placeholder for future implementation
    console.log('Done clicked');
  };

  const handleEditClick = () => {
    // Placeholder for future implementation
    console.log('Edit clicked');
  };

  if (!workOrder) return null;

  const formatDate = (dateStr?: string | null): string => {
    if (!dateStr) return 'Not set';
    try {
      return new Date(dateStr).toLocaleString();
    } catch (e) {
      return dateStr;
    }
  };

  const getStatusColor = (status: string | undefined | null): string => {
    if (!status) return '#9ca3af';
    switch (status.toLowerCase()) {
      case 'completed':
      case 'done':
        return '#4ade80';
      case 'in progress':
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

  const getStatusBgColor = (status: string | undefined | null): string => {
    if (!status) return isDarkMode ? 'rgba(156, 163, 175, 0.15)' : 'rgba(156, 163, 175, 0.1)';
    switch (status.toLowerCase()) {
      case 'completed':
      case 'done':
        return isDarkMode ? 'rgba(74, 222, 128, 0.15)' : 'rgba(74, 222, 128, 0.1)';
      case 'in progress':
        return isDarkMode ? 'rgba(96, 165, 250, 0.15)' : 'rgba(96, 165, 250, 0.1)';
      case 'pending':
        return isDarkMode ? 'rgba(251, 146, 60, 0.15)' : 'rgba(251, 146, 60, 0.1)';
      case 'failed':
      case 'cancelled':
        return isDarkMode ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)';
      case 'on hold':
        return isDarkMode ? 'rgba(167, 139, 250, 0.15)' : 'rgba(167, 139, 250, 0.1)';
      default:
        return isDarkMode ? 'rgba(156, 163, 175, 0.15)' : 'rgba(156, 163, 175, 0.1)';
    }
  };

  const dynamicValueColor = isDarkMode ? '#ffffff' : '#111827';
  const valStyle = [st.valueText, { color: dynamicValueColor }];

  const renderImageLink = (url: string | undefined | null, label: string) => (
    <View style={st.imageLinkRow}>
      <Text style={[st.imageLinkText, { color: dynamicValueColor }]} numberOfLines={1} selectable={true}>
        {url || 'No image available'}
      </Text>
      {url && (
        <Pressable onPress={() => Linking.openURL(url || '')}>
          <ExternalLink width={16} height={16} color={isDarkMode ? '#9ca3af' : '#4b5563'} />
        </Pressable>
      )}
    </View>
  );

  // Define all fields to display
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
    'image1',
    'image2',
    'image3',
    'signature',
  ];

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
      image1: 'Image 1',
      image2: 'Image 2',
      image3: 'Image 3',
      signature: 'Signature',
    };
    return labels[fieldKey] || fieldKey;
  };

  const fieldRenderers: Record<string, () => React.ReactNode> = {
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
    image1: () => renderImageLink(workOrder.image_1, 'Image 1'),
    image2: () => renderImageLink(workOrder.image_2, 'Image 2'),
    image3: () => renderImageLink(workOrder.image_3, 'Image 3'),
    signature: () => renderImageLink(workOrder.signature, 'Signature'),
  };

  const renderFieldContent = (fieldKey: string) => {
    const renderer = fieldRenderers[fieldKey];
    if (!renderer) return null;

    // Skip image/signature fields if no data
    const imageFields = ['image1', 'image2', 'image3', 'signature'];
    if (imageFields.includes(fieldKey)) {
      const fieldMap: Record<string, string | undefined> = {
        image1: workOrder.image_1,
        image2: workOrder.image_2,
        image3: workOrder.image_3,
        signature: workOrder.signature,
      };
      if (!fieldMap[fieldKey]) return null;
    }

    return (
      <View style={[st.fieldRow, { borderBottomColor: isDarkMode ? '#1f2937' : '#e5e7eb' }]}>
        <Text style={[st.fieldLabel, { color: isDarkMode ? '#9ca3af' : '#6b7280' }]}>{getFieldLabel(fieldKey)}</Text>
        <View style={st.fieldValueWrap}>
          {renderer()}
        </View>
      </View>
    );
  };

  return (
    <View style={[st.container, {
      borderLeftWidth: !isMobile ? 1 : 0,
      backgroundColor: isDarkMode ? '#030712' : '#f9fafb',
      borderLeftColor: isDarkMode ? 'rgba(255,255,255,0.3)' : '#d1d5db'
    }]}>
      {/* Header */}
      <View style={[st.header, {
        paddingTop: isMobile ? 16 : 12,
        backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
        borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb'
      }]}>
        <View style={st.headerLeft}>
          <Text
            style={[st.headerName, {
              maxWidth: isMobile ? 200 : undefined,
              fontSize: isMobile ? 20 : 24,
              color: isDarkMode ? '#ffffff' : '#111827'
            }]}
            numberOfLines={1}
          >
            Work Order #{workOrder.id}
          </Text>
          {loading && <Text style={[st.loadingLabel, { color: isDarkMode ? '#fb923c' : '#7c3aed' }]}>Loading...</Text>}
        </View>

        <View style={st.headerActions}>
          {workOrder.work_status?.toLowerCase().includes('pending') || workOrder.work_status?.toLowerCase().includes('in progress') ? (
            <Pressable
              style={[st.actionBtn, { backgroundColor: colorPalette?.primary || '#7c3aed', marginRight: 8 }]}
              onPress={onEdit}
            >
              <Text style={[st.actionBtnText, { color: '#ffffff', fontSize: isMobile ? 14 : 16 }]}>Edit</Text>
            </Pressable>
          ) : null}

          <Pressable onPress={onClose} style={{ padding: 4 }}>
            <X width={28} height={28} color={isDarkMode ? '#9ca3af' : '#4b5563'} />
          </Pressable>
        </View>
      </View>

      {userRole !== 'technician' && userRole !== 'agent' && userRoleId !== 4 && (workOrder.work_status?.toLowerCase() === 'pending' || workOrder.work_status?.toLowerCase() === 'in progress') && (
        <View style={[st.editBar, {
          backgroundColor: isDarkMode ? '#111827' : '#f3f4f6',
          borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb'
        }]}>
          <View style={st.editBarInner}>
            <Pressable onPress={onEdit} disabled={loading} style={st.editBtnWrap}>
              <View style={[st.editIconCircle, { backgroundColor: loading ? (isDarkMode ? '#4b5563' : '#9ca3af') : (colorPalette?.primary || '#7c3aed') }]}>
                <Edit width={18} height={18} color="#ffffff" />
              </View>
              <Text style={[st.editLabel, { color: isDarkMode ? '#d1d5db' : '#374151' }]}>Edit</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Content */}
      <ScrollView style={st.flex1} showsVerticalScrollIndicator={false} contentContainerStyle={st.scrollContent}>
        <View style={[st.fieldsContainer, { backgroundColor: isDarkMode ? '#030712' : '#f9fafb' }]}>
          <View>
            {defaultFields.map((fieldKey) => (
              <React.Fragment key={fieldKey}>
                {renderFieldContent(fieldKey)}
              </React.Fragment>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const st = StyleSheet.create({
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerName: {
    fontWeight: '500',
  },
  loadingLabel: {
    marginLeft: 12,
    fontSize: 14,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#ffffff',
    fontWeight: '500',
  },
  editBar: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  editBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  editBtnWrap: {
    flexDirection: 'column',
    alignItems: 'center',
    padding: 8,
    borderRadius: 6,
  },
  editIconCircle: {
    padding: 8,
    borderRadius: 9999,
  },
  editLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  statusBadgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  statusTextHeader: {
    fontSize: 13,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
    alignSelf: 'flex-start',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  flex1: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  fieldsContainer: {
    width: '100%',
    minHeight: '100%',
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  fieldRow: {
    flexDirection: 'column',
    borderBottomWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 16,
    alignItems: 'flex-start',
    gap: 2,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  fieldValueWrap: {
    width: '100%',
  },
  valueText: {
    fontSize: 16,
  },
  imageLinkRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  imageLinkText: {
    flex: 1,
    marginRight: 8,
    fontSize: 16,
  },
});

export default WorkOrderDetails;
