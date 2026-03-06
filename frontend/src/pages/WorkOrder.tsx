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
  Modal,
  Platform,
  StyleSheet,
  useWindowDimensions
} from 'react-native';
import { Search, Plus, RefreshCw } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';
import { useWorkOrderStore } from '../store/workOrderStore';
import { WorkOrder } from '../types/workOrder';
import WorkOrderDetails from '../components/WorkOrderDetails';
import AssignWorkOrderModal from '../modals/AssignWorkOrderModal';

const WorkOrderPage: React.FC = () => {
  const isDarkMode = false; // Forced light mode as per user request
  const [searchQuery, setSearchQuery] = useState('');
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(() => settingsColorPaletteService.getActiveSync());

  const { workOrders, isLoading, fetchWorkOrders, error } = useWorkOrderStore();
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);

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

  // Dark mode loading removed as per user request

  useEffect(() => {
    fetchWorkOrders(1, 1000, '', '');
  }, [fetchWorkOrders]);

  const handleCardPress = (workOrder: WorkOrder) => {
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

    // Apply role-based filtering for OSP (6), Agent (4), and Technician (2)
    if (userRole === 6 || userRole === 4 || userRole === 2) {
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
      <View style={[st.pagination, { backgroundColor: '#ffffff', borderColor: '#e5e7eb' }]}>
        <View style={st.paginationInfo}>
          <Text style={[st.paginationText, { color: '#6b7280' }]}>
            Showing {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredWorkOrders.length)} of {filteredWorkOrders.length}
          </Text>
        </View>
        <View style={st.paginationBtns}>
          <TouchableOpacity
            onPress={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            style={[st.pageBtn, {
              backgroundColor: currentPage === 1 ? '#f3f4f6' : '#ffffff',
              borderColor: '#d1d5db',
              borderWidth: currentPage === 1 ? 0 : 1
            }]}
          >
            <Text style={[st.pageBtnText, { color: currentPage === 1 ? '#4b5563' : '#374151' }]}>Prev</Text>
          </TouchableOpacity>

          <Text style={[st.pageCountText, { color: '#111827' }]}>
            {currentPage}/{totalPages}
          </Text>

          <TouchableOpacity
            onPress={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            style={[st.pageBtn, {
              backgroundColor: currentPage === totalPages ? '#f3f4f6' : '#ffffff',
              borderColor: '#d1d5db',
              borderWidth: currentPage === totalPages ? 0 : 1
            }]}
          >
            <Text style={[st.pageBtnText, { color: currentPage === totalPages ? '#4b5563' : '#374151' }]}>Next</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const StatusText = ({ status }: { status?: string | null }) => {
    if (!status) return <Text style={st.statusDash}>-</Text>;

    let textColor = '';
    const s = status.toLowerCase();
    if (s === 'completed' || s === 'done') textColor = '#4ade80';
    else if (s === 'in progress' || s === 'inprogress') textColor = '#60a5fa';
    else if (s === 'pending') textColor = '#fb923c';
    else if (s === 'failed' || s === 'cancelled') textColor = '#ef4444';
    else textColor = '#9ca3af';

    return (
      <Text style={[st.statusLabel, { color: textColor }]}>
        {s === 'inprogress' ? 'In Progress' : status}
      </Text>
    );
  };

  return (
    <SafeAreaView style={[st.container, { backgroundColor: '#f9fafb' }]}>
      <View style={[st.header, {
        backgroundColor: '#ffffff',
        borderBottomColor: '#e5e7eb',
        paddingTop: isTablet ? 16 : 60
      }]}>
        <View style={st.toolbarRow}>
          <View style={st.searchBarContainer}>
            <Search size={20} color="#9ca3af" style={st.searchIcon} />
            <TextInput
              placeholder="Search work orders..."
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={[st.searchInput, {
                backgroundColor: '#f3f4f6',
                color: '#111827',
                borderColor: '#d1d5db'
              }]}
            />
          </View>

          <View style={st.actionsRow}>
            <TouchableOpacity
              onPress={() => fetchWorkOrders(1, 1000, '', '')}
              disabled={isLoading}
              style={[st.actionIconBtn, { backgroundColor: isLoading ? '#d1d5db' : (colorPalette?.primary || '#7c3aed') }]}
            >
              <RefreshCw size={20} color="white" />
            </TouchableOpacity>

            {(userRole === 1 || userRole === 7) && (
              <TouchableOpacity
                onPress={handleAddNew}
                style={[st.actionIconBtn, { backgroundColor: colorPalette?.primary || '#7c3aed' }]}
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
            tintColor="black"
          />
        }
      >
        {isLoading && workOrders.length === 0 ? (
          <View style={st.centerContent}>
            <ActivityIndicator size="large" color={colorPalette?.primary || '#7c3aed'} />
          </View>
        ) : error ? (
          <Text style={st.errorText}>{error}</Text>
        ) : filteredWorkOrders.length > 0 ? (
          <>
            <View style={st.cardList}>
              {paginatedWorkOrders.map((wo: WorkOrder) => (
                <TouchableOpacity
                  key={wo.id}
                  onPress={() => handleCardPress(wo)}
                  style={[st.cardRow, {
                    backgroundColor: selectedWorkOrder?.id === wo.id ? '#f3f4f6' : 'transparent',
                    borderColor: '#e5e7eb'
                  }]}
                >
                  <View style={st.cardInner}>
                    <View style={st.cardLeft}>
                      <Text
                        style={[st.cardName, { color: '#111827' }]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {wo.instructions || 'No Instructions'}
                      </Text>
                      <Text style={[st.cardSub, { color: '#4b5563' }]}>
                        {formatDate(wo.requested_date)}
                      </Text>
                    </View>
                    <View style={st.cardRight}>
                      <StatusText status={wo.work_status} />
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
            <PaginationControls />
            <View style={{ height: 40 }} />
          </>
        ) : (
          <View style={st.emptyState}>
            <Text style={[st.emptyText, { color: '#9ca3af' }]}>
              No work orders found
            </Text>
          </View>
        )}
      </ScrollView>

      {showDetailsModal && selectedWorkOrder && (
        <Modal
          visible={showDetailsModal}
          animationType="none"
          onRequestClose={handleCloseModal}
          transparent={false}
        >
          <WorkOrderDetails
            workOrder={selectedWorkOrder}
            onClose={handleCloseModal}
            onEdit={() => {
              setShowAssignModal(true);
            }}
            isDarkMode={isDarkMode}
            colorPalette={colorPalette}
          />
        </Modal>
      )}

      {showAssignModal && (
        <AssignWorkOrderModal
          isOpen={showAssignModal}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedWorkOrder(null);
          }}
          onSave={() => {
            setShowAssignModal(false);
            setSelectedWorkOrder(null);
            fetchWorkOrders(1, 1000, '', '');
          }}
          onRefresh={() => fetchWorkOrders(1, 1000, '', '')}
          isEditMode={!!selectedWorkOrder}
          workOrder={selectedWorkOrder || undefined}
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
  scrollContent: { paddingVertical: 16 },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80 },
  errorText: { textAlign: 'center', paddingVertical: 80, color: '#ef4444' },
  cardList: { flexDirection: 'column' },
  cardRow: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  cardInner: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  cardLeft: { flex: 1, minWidth: 0 },
  cardName: { fontWeight: '500', fontSize: 14, marginBottom: 4 },
  cardSub: { fontSize: 12 },
  cardRight: { flexDirection: 'column', alignItems: 'flex-end', gap: 4, marginLeft: 16, flexShrink: 0 },
  statusDash: { color: '#9ca3af' },
  statusLabel: { fontWeight: 'bold', textTransform: 'uppercase', fontSize: 12 },

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
