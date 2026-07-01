import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import {
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react-native';
import apiClient from '../config/api';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';
import LoadingModalGlobal from '../components/common/LoadingModalGlobal';
import StatusRemarksFormModal from '../modals/StatusRemarksFormModal';
import GlobalSearch from './globalfunctions/GlobalSearch';

interface StatusRemark {
  id: number;
  status_remarks: string;
  created_at?: string;
  created_by_user?: string;
  updated_at?: string;
  updated_by_user?: string;
}

const StatusRemarksList: React.FC = () => {
  // App is forced light mode.
  const isDarkMode = false;
  const [searchQuery, setSearchQuery] = useState('');
  const [statusRemarks, setStatusRemarks] = useState<StatusRemark[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRemark, setEditingRemark] = useState<StatusRemark | null>(null);
  const [deletingItems, setDeletingItems] = useState<Set<number>>(new Set());
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);
  const [globalModal, setGlobalModal] = useState<{
    isOpen: boolean;
    type: 'loading' | 'success' | 'error' | 'confirm' | 'warning';
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    type: 'loading',
    title: '',
    message: '',
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  const primaryColor = colorPalette?.primary || '#7c3aed';
  const { width } = Dimensions.get('window');
  const isTablet = width >= 768;

  const showGlobalModal = (
    type: 'loading' | 'success' | 'error' | 'confirm' | 'warning',
    title: string,
    message: string,
    onConfirm?: () => void
  ) => {
    setGlobalModal({ isOpen: true, type, title, message, onConfirm });
  };

  const closeGlobalModal = () => {
    setGlobalModal((prev) => ({ ...prev, isOpen: false }));
  };

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
    loadStatusRemarks();
  }, []);

  // Auto-refresh every 15 minutes (silent).
  useEffect(() => {
    const IDLE_TIME_LIMIT = 15 * 60 * 1000;
    const intervalId = setInterval(() => {
      loadStatusRemarks(true).catch((err) => console.error('Idle refresh failed:', err));
    }, IDLE_TIME_LIMIT);
    return () => clearInterval(intervalId);
  }, []);

  const loadStatusRemarks = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const response = await apiClient.get('/status-remarks');
      const data = response.data;
      if (data.success) {
        setStatusRemarks(data.data || []);
      } else {
        console.error('API returned error:', data.message);
        setStatusRemarks([]);
      }
    } catch (error) {
      console.error('Error loading status remarks:', error);
      setStatusRemarks([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadStatusRemarks(true);
    setRefreshing(false);
  };

  const handleDelete = (remark: StatusRemark) => {
    showGlobalModal(
      'confirm',
      'Confirm Deletion',
      `Are you sure you want to permanently delete this status remark?`,
      () => executeDelete(remark)
    );
  };

  const executeDelete = async (remark: StatusRemark) => {
    closeGlobalModal();

    setDeletingItems((prev) => new Set(prev).add(remark.id));
    showGlobalModal('loading', 'Deleting', `Removing status remark...`);

    try {
      const response = await apiClient.delete(`/status-remarks/${remark.id}`);
      const data = response.data;

      if (data.success) {
        await loadStatusRemarks(true);
        showGlobalModal('success', 'Deleted', data.message || 'Status remark deleted successfully');
      } else {
        showGlobalModal('error', 'Delete Failed', data.message || 'Failed to delete status remark');
      }
    } catch (error: any) {
      console.error('Error deleting status remark:', error);
      const msg = error?.response?.data?.message || error.message || 'An unexpected error occurred during deletion';
      showGlobalModal('error', 'Error', msg);
    } finally {
      setDeletingItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(remark.id);
        return newSet;
      });
    }
  };

  const handleEdit = (remark: StatusRemark) => {
    setEditingRemark(remark);
    setShowAddModal(true);
  };

  const handleAddNew = () => {
    setEditingRemark(null);
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingRemark(null);
  };

  const handleSaveModal = async () => {
    await loadStatusRemarks();
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      const yyyy = date.getFullYear();
      let hours = date.getHours();
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const hh = String(hours).padStart(2, '0');
      return `${mm}/${dd}/${yyyy} ${hh}:${minutes} ${ampm}`;
    } catch (e) {
      return dateString;
    }
  };

  const filteredStatusRemarks = statusRemarks.filter((sr) =>
    sr.status_remarks.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredStatusRemarks.length / itemsPerPage);
  const paginatedStatusRemarks = filteredStatusRemarks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, itemsPerPage]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const renderListItem = ({ item: sr }: { item: StatusRemark }) => (
    <TouchableOpacity
      onPress={() => handleEdit(sr)}
      activeOpacity={0.7}
      style={{
        paddingHorizontal: 16,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        backgroundColor: '#ffffff',
      }}
    >
      <View style={{ flex: 1, minWidth: 0, paddingRight: 16 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: '#111827' }} numberOfLines={2}>
          {sr.status_remarks}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 }}>
          <Text style={{ fontSize: 10, textTransform: 'uppercase', fontWeight: '500', color: '#9ca3af' }}>
            Created: {formatDate(sr.created_at)}
          </Text>
          <Text style={{ fontSize: 10, textTransform: 'uppercase', fontWeight: '500', color: '#9ca3af' }}>
            By: {sr.created_by_user || 'System'}
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <TouchableOpacity onPress={() => handleEdit(sr)} style={{ padding: 8, borderRadius: 6 }}>
          <Edit2 size={18} color="#4b5563" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleDelete(sr)}
          disabled={deletingItems.has(sr.id)}
          style={{ padding: 8, borderRadius: 6, opacity: deletingItems.has(sr.id) ? 0.5 : 1 }}
        >
          {deletingItems.has(sr.id) ? (
            <ActivityIndicator size="small" color="#ef4444" />
          ) : (
            <Trash2 size={18} color="#ef4444" />
          )}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: isTablet ? 16 : 60,
          paddingBottom: 16,
          borderBottomWidth: 1,
          borderBottomColor: '#e5e7eb',
          backgroundColor: '#ffffff',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <GlobalSearch
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          isDarkMode={isDarkMode}
          colorPalette={colorPalette}
          placeholder="Search Status Remarks"
        />
        <TouchableOpacity
          onPress={handleAddNew}
          style={{
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 8,
            backgroundColor: primaryColor,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Plus size={16} color="#ffffff" />
          {isTablet && <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '500' }}>Add Remark</Text>}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => loadStatusRemarks()}
          style={{ padding: 10, borderRadius: 8, backgroundColor: primaryColor, alignItems: 'center', justifyContent: 'center' }}
        >
          {isLoading ? <ActivityIndicator size="small" color="#ffffff" /> : <RefreshCw size={16} color="#ffffff" />}
        </TouchableOpacity>
      </View>

      {/* List */}
      {isLoading && statusRemarks.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80 }}>
          <ActivityIndicator size="large" color={primaryColor} />
        </View>
      ) : (
        <FlatList
          data={paginatedStatusRemarks}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderListItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={primaryColor} colors={[primaryColor]} />
          }
          ListEmptyComponent={
            <View style={{ paddingVertical: 80, alignItems: 'center' }}>
              <Text style={{ color: '#6b7280' }}>No status remarks found</Text>
            </View>
          }
        />
      )}

      {/* Pagination */}
      {!isLoading && filteredStatusRemarks.length > 0 && totalPages > 1 && (
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: '#e5e7eb',
            padding: 12,
            backgroundColor: '#ffffff',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ fontSize: 12, color: '#6b7280' }}>Show</Text>
            <View style={{ borderWidth: 1, borderColor: '#d1d5db', borderRadius: 6, overflow: 'hidden', height: 36, justifyContent: 'center' }}>
              <Picker
                selectedValue={itemsPerPage}
                onValueChange={(v) => setItemsPerPage(Number(v))}
                style={{ width: 90, color: '#111827' }}
                dropdownIconColor="#6b7280"
              >
                {[10, 25, 50, 100].map((v) => (
                  <Picker.Item key={v} label={String(v)} value={v} />
                ))}
              </Picker>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <PageBtn disabled={currentPage === 1} onPress={() => handlePageChange(1)} icon={<ChevronsLeft size={14} color={currentPage === 1 ? '#9ca3af' : '#111827'} />} />
            <PageBtn disabled={currentPage === 1} onPress={() => handlePageChange(currentPage - 1)} icon={<ChevronLeft size={14} color={currentPage === 1 ? '#9ca3af' : '#111827'} />} />
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#111827', paddingHorizontal: 6 }}>
              Page {currentPage} of {totalPages}
            </Text>
            <PageBtn disabled={currentPage === totalPages} onPress={() => handlePageChange(currentPage + 1)} icon={<ChevronRight size={14} color={currentPage === totalPages ? '#9ca3af' : '#111827'} />} />
            <PageBtn disabled={currentPage === totalPages} onPress={() => handlePageChange(totalPages)} icon={<ChevronsRight size={14} color={currentPage === totalPages ? '#9ca3af' : '#111827'} />} />
          </View>
        </View>
      )}

      <StatusRemarksFormModal
        isOpen={showAddModal}
        onClose={handleCloseModal}
        onSave={handleSaveModal}
        editingRemark={editingRemark}
      />

      <LoadingModalGlobal
        isOpen={globalModal.isOpen}
        type={globalModal.type}
        title={globalModal.title}
        message={globalModal.message}
        onConfirm={globalModal.onConfirm || closeGlobalModal}
        onCancel={closeGlobalModal}
        colorPalette={colorPalette}
        isDarkMode={isDarkMode}
      />
    </View>
  );
};

const PageBtn: React.FC<{ disabled: boolean; onPress: () => void; icon: React.ReactNode }> = ({ disabled, onPress, icon }) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled}
    style={{
      padding: 6,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: disabled ? '#e5e7eb' : '#d1d5db',
      backgroundColor: disabled ? '#f3f4f6' : '#ffffff',
    }}
  >
    {icon}
  </TouchableOpacity>
);

export default StatusRemarksList;
