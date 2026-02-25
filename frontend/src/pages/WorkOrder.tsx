import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  RefreshControl,
  Platform,
  StyleSheet,
  useWindowDimensions
} from 'react-native';
import { Search, Plus, Edit2, Trash2, RefreshCw } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';
import { useWorkOrderStore } from '../store/workOrderStore';
import { WorkOrder } from '../types/workOrder';
import WorkOrderDetails from '../components/WorkOrderDetails';
import AssignWorkOrderModal from '../modals/AssignWorkOrderModal';

const WorkOrderPage: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);

  const { workOrders, isLoading, fetchWorkOrders, error } = useWorkOrderStore();
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [deletingItems, setDeletingItems] = useState<Set<number>>(new Set());

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const [userRole, setUserRole] = useState<number | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  useEffect(() => {
    const loadAuthData = async () => {
      try {
        const authData = await AsyncStorage.getItem('authData');
        if (authData) {
          const parsed = JSON.parse(authData);
          setUserRole(parsed.role_id || parsed.roleId || null);
          setUserEmail(parsed.email_address || parsed.email || '');
          setUserName(`${parsed.first_name || ''} ${parsed.last_name || ''}`.trim() || parsed.username || '');
        }
      } catch (e) {
        console.error('Error loading auth data:', e);
      }
    };
    loadAuthData();
  }, []);

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
      try {
        const theme = await AsyncStorage.getItem('theme');
        setIsDarkMode(theme !== 'light');
      } catch (e) {
        console.error('Error loading theme:', e);
      }
    };
    loadTheme();
  }, []);

  useEffect(() => {
    fetchWorkOrders(1, 1000, '', '');
  }, [fetchWorkOrders]);

  const handleDelete = async (workOrder: WorkOrder) => {
    Alert.alert(
      "Confirm Delete",
      "⚠️ Are you sure you want to permanently delete this work order?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeletingItems(prev => new Set(prev).add(workOrder.id));
            try {
              const response = await fetch(`${API_BASE_URL}/work-orders/${workOrder.id}`, {
                method: 'DELETE',
                headers: {
                  'Accept': 'application/json',
                  'Content-Type': 'application/json',
                },
              });
              const data = await response.json();
              if (response.ok && data.success) {
                await fetchWorkOrders(1, 1000, '', '');
              } else {
                Alert.alert('Error', '❌ Failed to delete work order');
              }
            } catch (error) {
              console.error('Error deleting work order:', error);
            } finally {
              setDeletingItems(prev => {
                const newSet = new Set(prev);
                newSet.delete(workOrder.id);
                return newSet;
              });
            }
          }
        }
      ]
    );
  };

  const handleEdit = (workOrder: WorkOrder) => {
    setSelectedWorkOrder(workOrder);
    setShowDetailsModal(true);
  };

  const handleAddNew = () => {
    setSelectedWorkOrder(null);
    setShowAssignModal(true);
  };

  const handleCloseModal = () => {
    setShowDetailsModal(false);
    setSelectedWorkOrder(null);
    fetchWorkOrders(1, 1000, '', ''); // Refresh after close
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-PH', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  };

  const getFilteredWorkOrders = () => {
    let filtered = workOrders;

    // Apply role-based filtering for OSP (6) and Agent (4)
    if (userRole === 6 || userRole === 4) {
      filtered = filtered.filter((wo: WorkOrder) => {
        const targetAssign = (wo.assign_to || '').toLowerCase();
        return targetAssign === userEmail.toLowerCase() || targetAssign === userName.toLowerCase();
      });
    }

    if (!searchQuery) return filtered;

    return filtered.filter((wo: WorkOrder) =>
      (wo.instructions || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (wo.report_to || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (wo.assign_to || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (wo.requested_by || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const filteredWorkOrders = getFilteredWorkOrders();

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const totalPages = Math.ceil(filteredWorkOrders.length / itemsPerPage);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const paginatedWorkOrders = filteredWorkOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const PaginationControls = () => {
    if (totalPages <= 1) return null;

    return (
      <View style={[st.pagination, { backgroundColor: isDarkMode ? '#111827' : '#ffffff', borderColor: isDarkMode ? '#1f2937' : '#e5e7eb' }]}>
        <View style={st.paginationInfo}>
          <Text style={[st.paginationText, { color: isDarkMode ? '#9ca3af' : '#6b7280' }]}>
            Showing {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredWorkOrders.length)} of {filteredWorkOrders.length}
          </Text>
        </View>
        <View style={st.paginationBtns}>
          <TouchableOpacity
            onPress={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            style={[st.pageBtn, {
              backgroundColor: currentPage === 1 ? (isDarkMode ? '#1f2937' : '#f3f4f6') : (isDarkMode ? '#374151' : '#ffffff'),
              borderColor: isDarkMode ? '#4b5563' : '#d1d5db',
              borderWidth: currentPage === 1 ? 0 : 1
            }]}
          >
            <Text style={[st.pageBtnText, { color: currentPage === 1 ? '#4b5563' : isDarkMode ? '#ffffff' : '#374151' }]}>Prev</Text>
          </TouchableOpacity>

          <Text style={[st.pageCountText, { color: isDarkMode ? '#ffffff' : '#111827' }]}>
            {currentPage}/{totalPages}
          </Text>

          <TouchableOpacity
            onPress={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            style={[st.pageBtn, {
              backgroundColor: currentPage === totalPages ? (isDarkMode ? '#1f2937' : '#f3f4f6') : (isDarkMode ? '#374151' : '#ffffff'),
              borderColor: isDarkMode ? '#4b5563' : '#d1d5db',
              borderWidth: currentPage === totalPages ? 0 : 1
            }]}
          >
            <Text style={[st.pageBtnText, { color: currentPage === totalPages ? '#4b5563' : isDarkMode ? '#ffffff' : '#374151' }]}>Next</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const getStatusStyles = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'completed') return { text: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)', border: 'rgba(34, 197, 94, 0.2)' };
    if (s === 'in progress') return { text: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.2)' };
    if (s === 'failed' || s === 'cancelled') return { text: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.2)' };
    if (s === 'pending') return { text: '#f97316', bg: 'rgba(249, 115, 22, 0.1)', border: 'rgba(249, 115, 22, 0.2)' };
    return { text: '#6b7280', bg: 'rgba(107, 114, 128, 0.1)', border: 'rgba(107, 114, 128, 0.2)' };
  };

  return (
    <SafeAreaView style={[st.container, { backgroundColor: isDarkMode ? '#030712' : '#f9fafb' }]}>
      <View style={[st.header, {
        backgroundColor: isDarkMode ? '#111827' : '#ffffff',
        borderBottomColor: isDarkMode ? '#1f2937' : '#e5e7eb',
        paddingTop: isTablet ? 16 : 60
      }]}>
        <View style={st.toolbarRow}>
          <View style={st.searchBarContainer}>
            <Search size={20} color={isDarkMode ? '#6b7280' : '#9ca3af'} style={st.searchIcon} />
            <TextInput
              placeholder="Search work orders..."
              placeholderTextColor={isDarkMode ? '#6b7280' : '#9ca3af'}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={[st.searchInput, {
                backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6',
                color: isDarkMode ? '#ffffff' : '#111827',
                borderColor: isDarkMode ? '#374151' : '#d1d5db'
              }]}
            />
          </View>

          <View style={st.actionsRow}>
            <TouchableOpacity
              onPress={() => fetchWorkOrders(1, 1000, '', '')}
              disabled={isLoading}
              style={[st.actionIconBtn, { backgroundColor: isLoading ? (isDarkMode ? '#4b5563' : '#d1d5db') : (colorPalette?.primary || '#ea580c') }]}
            >
              <RefreshCw size={20} color="white" />
            </TouchableOpacity>

            {(userRole === 1 || userRole === 7) && (
              <TouchableOpacity
                onPress={handleAddNew}
                style={[st.actionIconBtn, { backgroundColor: colorPalette?.primary || '#ea580c' }]}
              >
                <Plus size={20} color="white" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      <ScrollView
        style={st.scrollView}
        contentContainerStyle={st.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading && workOrders.length > 0}
            onRefresh={() => fetchWorkOrders(1, 1000, '', '')}
            tintColor={isDarkMode ? 'white' : 'black'}
          />
        }
      >
        {isLoading && workOrders.length === 0 ? (
          <View style={st.centerContent}>
            <ActivityIndicator size="large" color={colorPalette?.primary || '#ea580c'} />
          </View>
        ) : error ? (
          <Text style={st.errorText}>{error}</Text>
        ) : filteredWorkOrders.length > 0 ? (
          <>
            <View style={st.cardList}>
              {paginatedWorkOrders.map((wo: WorkOrder) => {
                const statusStyles = getStatusStyles(wo.work_status || '');
                return (
                  <View
                    key={wo.id}
                    style={[st.card, { backgroundColor: isDarkMode ? '#111827' : '#ffffff', borderColor: isDarkMode ? '#1f2937' : '#e5e7eb', marginBottom: 16 }]}
                  >
                    <View style={st.cardBody}>
                      <View style={st.cardHeader}>
                        <View style={st.cardHeaderLeft}>
                          <Text numberOfLines={1} style={[st.cardTitle, { color: isDarkMode ? '#f3f4f6' : '#111827' }]}>{wo.instructions || ''}</Text>
                          <Text style={[st.cardId, { color: isDarkMode ? '#9ca3af' : '#6b7280' }]}>ID: #{wo.id}</Text>
                        </View>
                        <View style={[st.statusBadge, { backgroundColor: statusStyles.bg, borderColor: statusStyles.border }]}>
                          <Text style={[st.statusText, { color: statusStyles.text }]}>{(wo.work_status || '').toUpperCase()}</Text>
                        </View>
                      </View>

                      <View style={st.cardDetails}>
                        <View style={st.detailRow}>
                          <Text style={[st.detailLabel, { color: isDarkMode ? '#9ca3af' : '#6b7280' }]}>Report To:</Text>
                          <Text numberOfLines={1} style={[st.detailValue, { color: isDarkMode ? '#d1d5db' : '#4b5563' }]}>{wo.report_to || ''}</Text>
                        </View>
                        <View style={st.detailRow}>
                          <Text style={[st.detailLabel, { color: isDarkMode ? '#9ca3af' : '#6b7280' }]}>Assign To:</Text>
                          <Text numberOfLines={1} style={[st.detailValue, { color: isDarkMode ? '#d1d5db' : '#4b5563' }]}>{wo.assign_to || '-'}</Text>
                        </View>
                        <View style={st.detailRow}>
                          <Text style={[st.detailLabel, { color: isDarkMode ? '#9ca3af' : '#6b7280' }]}>Requested By:</Text>
                          <Text numberOfLines={1} style={[st.detailValue, { color: isDarkMode ? '#d1d5db' : '#4b5563' }]}>{wo.requested_by || ''}</Text>
                        </View>
                        <View style={[st.detailRowDate, { borderTopColor: isDarkMode ? 'rgba(55,65,81,0.3)' : '#f1f5f9' }]}>
                          <Text style={[st.detailLabel, { color: isDarkMode ? '#9ca3af' : '#6b7280' }]}>Date:</Text>
                          <Text style={[st.dateText, { color: isDarkMode ? '#9ca3af' : '#6b7280' }]}>{formatDate(wo.requested_date)}</Text>
                        </View>
                      </View>
                    </View>

                    <View style={[st.cardFooter, { backgroundColor: isDarkMode ? 'rgba(31,41,55,0.5)' : '#f9fafb', borderTopColor: isDarkMode ? '#1f2937' : '#f1f5f9' }]}>
                      <TouchableOpacity
                        onPress={() => handleEdit(wo)}
                        style={st.actionBtn}
                      >
                        <Edit2 size={14} color="#60a5fa" />
                        <Text style={[st.actionTextBlue, { marginLeft: 6 }]}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDelete(wo)}
                        disabled={deletingItems.has(wo.id)}
                        style={st.actionBtn}
                      >
                        {deletingItems.has(wo.id) ? (
                          <ActivityIndicator size="small" color="#f87171" />
                        ) : (
                          <Trash2 size={14} color="#f87171" style={{ marginRight: 6 }} />
                        )}
                        <Text style={st.actionTextRed}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
            <PaginationControls />
            <View style={{ height: 40 }} />
          </>
        ) : (
          <View style={st.emptyState}>
            <Text style={[st.emptyText, { color: isDarkMode ? '#4b5563' : '#9ca3af' }]}>
              No work orders found
            </Text>
          </View>
        )}
      </ScrollView>

      {showDetailsModal && selectedWorkOrder && (
        <WorkOrderDetails
          workOrder={selectedWorkOrder}
          onClose={handleCloseModal}
          isDarkMode={isDarkMode}
          colorPalette={colorPalette}
        />
      )}

      {showAssignModal && (
        <AssignWorkOrderModal
          isOpen={showAssignModal}
          onClose={() => setShowAssignModal(false)}
          onSave={() => {
            setShowAssignModal(false);
            fetchWorkOrders(1, 1000, '', '');
          }}
          onRefresh={() => fetchWorkOrders(1, 1000, '', '')}
        />
      )}
    </SafeAreaView>
  );
};

const st = StyleSheet.create({
  container: { flex: 1 },
  header: { borderBottomWidth: 1, paddingHorizontal: 16, paddingVertical: 12 },
  toolbarRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  searchBarContainer: { position: 'relative', flex: 1 },
  searchIcon: { position: 'absolute', left: 12, top: 10, zIndex: 10 },
  searchInput: { width: '100%', paddingLeft: 40, paddingRight: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionIconBtn: { padding: 10, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16 },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80 },
  errorText: { textAlign: 'center', paddingVertical: 80, color: '#ef4444' },
  cardList: { flexDirection: 'column' },
  card: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  cardBody: { padding: 20 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  cardHeaderLeft: { flex: 1, paddingRight: 8 },
  cardTitle: { fontWeight: '600', fontSize: 18 },
  cardId: { fontSize: 12, marginTop: 4 },
  statusBadge: { paddingVertical: 4, borderRadius: 9999, borderWidth: 1, paddingHorizontal: 10 },
  statusText: { fontSize: 10, fontWeight: 'bold' },
  cardDetails: {},
  detailRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailRowDate: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderStyle: 'dotted' },
  detailLabel: { fontSize: 12, opacity: 0.7 },
  detailValue: { fontSize: 12, fontWeight: '500', maxWidth: '60%' },
  dateText: { fontSize: 10 },
  cardFooter: { paddingHorizontal: 20, paddingVertical: 12, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'flex-end' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', marginLeft: 8, paddingHorizontal: 12, paddingVertical: 6 },
  actionTextBlue: { color: '#60a5fa', fontWeight: '500', fontSize: 12 },
  actionTextRed: { color: '#f87171', fontWeight: '500', fontSize: 12 },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16, marginTop: 24, borderRadius: 8, borderWidth: 1 },
  paginationInfo: { flex: 1 },
  paginationText: { fontSize: 12 },
  paginationBtns: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pageBtn: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 4 },
  pageBtnText: { fontSize: 12 },
  pageCountText: { paddingHorizontal: 4, fontSize: 12 },
  emptyState: { paddingVertical: 80 },
  emptyText: { textAlign: 'center' }
});

export default WorkOrderPage;
