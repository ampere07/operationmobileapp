import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, Pressable, FlatList, ActivityIndicator, useWindowDimensions, RefreshControl, StyleSheet, DeviceEventEmitter, Linking } from 'react-native';
import { CircleDollarSign, Calendar, FileText, ArrowLeft, RefreshCw, Landmark } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import dayjs from 'dayjs';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';
import { fetchAgentCommissionHistory } from '../services/api';

interface CommissionHistoryItem {
  id: number;
  ref_number: string;
  total_amount: number | string;
  created_by?: string;
  created_at: string;
  remarks?: string;
  proof_of_payment?: string;
  agent_id: number;
  agent_name: string;
  commission_id_list?: string;
  updated_by?: string;
  updated_at?: string;
  approved_by?: string;
}

const Commission: React.FC = () => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [history, setHistory] = useState<CommissionHistoryItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [balance, setBalance] = useState<number>(0);
  const [incentives, setIncentives] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(() => settingsColorPaletteService.getActiveSync());

  const fetchHistoryData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      const response = await fetchAgentCommissionHistory();
      if (response.success) {
        setHistory(response.data || []);
        setCurrentPage(1);
        setBalance(response.balance !== undefined ? Number(response.balance) : 0);
        setIncentives(response.incentives !== undefined ? Number(response.incentives) : 0);
      } else {
        setError(response.message || 'Failed to fetch commission history');
      }
    } catch (err: any) {
      console.error('Error fetching commission history:', err);
      setError(err.message || 'Error connecting to server. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHistoryData();
  }, [fetchHistoryData]);

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

    const paletteSub = DeviceEventEmitter.addListener('colorPaletteChanged', (newPalette) => {
      setColorPalette(newPalette);
    });

    return () => paletteSub.remove();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchHistoryData(true);
  }, [fetchHistoryData]);

  const formatCurrency = useCallback((amount: number | string) => {
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numericAmount)) return '₱0.00';
    return `₱${numericAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }, []);

  const totalPaid = useMemo(() => {
    return history.reduce((sum, item) => {
      const amt = typeof item.total_amount === 'string' ? parseFloat(item.total_amount) : item.total_amount;
      return sum + (isNaN(amt) ? 0 : amt);
    }, 0);
  }, [history]);

  const totalPages = useMemo(() => {
    return Math.ceil(history.length / 5);
  }, [history.length]);

  const paginatedHistory = useMemo(() => {
    const startIndex = (currentPage - 1) * 5;
    return history.slice(startIndex, startIndex + 5);
  }, [history, currentPage]);

  const handlePageChange = useCallback((newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  }, [totalPages]);

  const renderFooter = () => {
    if (totalPages <= 1) return null;

    return (
      <View style={styles.paginationContainer}>
        <Pressable
          onPress={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          style={[
            styles.pageButton,
            {
              backgroundColor: currentPage === 1 ? '#f1f5f9' : '#ffffff',
              borderColor: currentPage === 1 ? 'transparent' : '#cbd5e1',
            }
          ]}
        >
          <Text style={[styles.pageButtonText, { color: currentPage === 1 ? '#94a3b8' : '#334155' }]}>
            Back
          </Text>
        </Pressable>

        <Text style={styles.pageIndicator}>
          Page {currentPage} of {totalPages}
        </Text>

        <Pressable
          onPress={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          style={[
            styles.pageButton,
            {
              backgroundColor: currentPage === totalPages ? '#f1f5f9' : '#ffffff',
              borderColor: currentPage === totalPages ? 'transparent' : '#cbd5e1',
            }
          ]}
        >
          <Text style={[styles.pageButtonText, { color: currentPage === totalPages ? '#94a3b8' : '#334155' }]}>
            Next
          </Text>
        </Pressable>
      </View>
    );
  };

  const handleOpenProof = useCallback(async (url?: string) => {
    if (!url) return;
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        // Fallback or alert if cannot open
        console.warn('Cannot open proof of payment URL:', url);
      }
    } catch (err) {
      console.error('Failed to open proof of payment link:', err);
    }
  }, []);

  const renderHistoryItem = ({ item }: { item: CommissionHistoryItem }) => {
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.refContainer}>
            <Landmark size={18} color={colorPalette?.primary || '#7c3aed'} />
            <Text style={styles.refText}>Ref: {item.ref_number}</Text>
          </View>
          <Text style={styles.amountText}>{formatCurrency(item.total_amount)}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Calendar size={14} color="#64748b" />
            <Text style={styles.infoValue}>
              {dayjs(item.created_at).format('MMMM DD, YYYY hh:mm A')}
            </Text>
          </View>

          {item.commission_id_list && (
            <View style={[styles.infoRow, { marginTop: 6 }]}>
              <FileText size={14} color="#64748b" />
              <Text style={styles.infoValue} numberOfLines={2}>
                Job Orders: {item.commission_id_list.split(',').map(id => `#${id.trim()}`).join(', ')}
              </Text>
            </View>
          )}

          {item.remarks && (
            <View style={styles.remarksContainer}>
              <Text style={styles.remarksLabel}>Remarks:</Text>
              <Text style={styles.remarksText}>{item.remarks}</Text>
            </View>
          )}
        </View>

        {item.proof_of_payment && (
          <View style={[styles.cardFooter, { justifyContent: 'flex-end' }]}>
            <Pressable
              onPress={() => handleOpenProof(item.proof_of_payment)}
              style={({ pressed }) => [
                styles.proofButton,
                { opacity: pressed ? 0.7 : 1 }
              ]}
            >
              <Text style={[styles.proofButtonText, { color: colorPalette?.primary || '#7c3aed' }]}>
                View Proof
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    );
  };

  const renderHeader = () => {
    return (
      <View style={styles.headerContainer}>
        {/* Main Stats Grid */}
        <View style={styles.statsGrid}>
          {/* Card 1: Balance */}
          <LinearGradient
            colors={[colorPalette?.primary || '#7c3aed', '#5b21b6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statCard}
          >
            <CircleDollarSign size={24} color="#ffffff" style={styles.statIcon} />
            <Text style={styles.statLabel}>Available Balance</Text>
            <Text style={styles.statValue}>{formatCurrency(balance)}</Text>
          </LinearGradient>

          {/* Card 2: Incentives */}
          <LinearGradient
            colors={['#10b981', '#065f46']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statCard}
          >
            <CircleDollarSign size={24} color="#ffffff" style={styles.statIcon} />
            <Text style={styles.statLabel}>Incentives/Bonus</Text>
            <Text style={styles.statValue}>{formatCurrency(incentives)}</Text>
          </LinearGradient>

          {/* Card 3: Total Paid */}
          <LinearGradient
            colors={['#f59e0b', '#b45309']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.statCard, { width: '100%' }]}
          >
            <CircleDollarSign size={24} color="#ffffff" style={styles.statIcon} />
            <Text style={styles.statLabel}>Total Commission Paid</Text>
            <Text style={styles.statValue}>{formatCurrency(totalPaid)}</Text>
          </LinearGradient>
        </View>

        <Text style={styles.sectionTitle}>Payout History</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Title Header */}
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>Commissions</Text>
        <Pressable
          onPress={() => fetchHistoryData(true)}
          disabled={loading || refreshing}
          style={({ pressed }) => [
            styles.refreshButton,
            { opacity: pressed ? 0.7 : 1 }
          ]}
        >
          <RefreshCw size={20} color="#1e293b" />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colorPalette?.primary || '#7c3aed'} />
          <Text style={styles.loadingText}>Fetching commission history...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            onPress={() => fetchHistoryData()}
            style={[styles.retryButton, { backgroundColor: colorPalette?.primary || '#7c3aed' }]}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={paginatedHistory}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderHistoryItem}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          contentContainerStyle={[
            styles.listContainer,
            { paddingBottom: isMobile ? 120 : 40 }
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colorPalette?.primary || '#7c3aed']}
              tintColor={colorPalette?.primary || '#7c3aed'}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <CircleDollarSign size={48} color="#94a3b8" />
              <Text style={styles.emptyText}>No payout history found</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
  },
  refreshButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 15,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  headerContainer: {
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 16,
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  statIcon: {
    marginBottom: 8,
    opacity: 0.9,
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '600',
  },
  statValue: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 8,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  refContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  refText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  amountText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#16a34a',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 12,
  },
  cardBody: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoValue: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  remarksContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  remarksLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  remarksText: {
    fontSize: 13,
    color: '#334155',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#dcfce7',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#16803d',
  },
  proofButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  proofButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    color: '#94a3b8',
    fontWeight: '500',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  pageButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  pageButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  pageIndicator: {
    fontSize: 14,
    fontWeight: '500',
    color: '#475569',
  },
});

export default Commission;
