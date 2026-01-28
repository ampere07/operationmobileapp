import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Modal, ActivityIndicator } from 'react-native';
import { Receipt, Search, ChevronDown, CheckCheck, X, Check } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TransactionListDetails from '../components/TransactionListDetails';
import { transactionService } from '../services/transactionService';
import LoadingModal from '../components/LoadingModal';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';

interface Transaction {
  id: string;
  account_no: string;
  transaction_type: string;
  received_payment: number;
  payment_date: string;
  date_processed: string;
  processed_by_user: string;
  payment_method: string;
  reference_no: string;
  or_no: string;
  remarks: string;
  status: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  account?: {
    id: number;
    account_no: string;
    customer: {
      full_name: string;
      contact_number_primary: string;
      barangay: string;
      city: string;
      desired_plan: string;
      address: string;
      region: string;
    };
    account_balance: number;
  };
}

interface LocationItem {
  id: string;
  name: string;
  count: number;
}

const TransactionList: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sidebarWidth, setSidebarWidth] = useState<number>(256);
  const [isResizingSidebar, setIsResizingSidebar] = useState<boolean>(false);
  const sidebarStartXRef = useRef<number>(0);
  const sidebarStartWidthRef = useRef<number>(0);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isBatchApproveMode, setIsBatchApproveMode] = useState<boolean>(false);
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<string[]>([]);
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [showFailedModal, setShowFailedModal] = useState<boolean>(false);
  const [approvalMessage, setApprovalMessage] = useState<string>('');
  const [approvalDetails, setApprovalDetails] = useState<any>(null);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);

  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return 'No date';
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch (e) {
      return dateStr;
    }
  };

  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `₱${numAmount.toFixed(2)}`;
  };

  useEffect(() => {
    const checkDarkMode = async () => {
      const theme = await AsyncStorage.getItem('theme');
      setIsDarkMode(theme === 'dark' || theme === null);
    };

    checkDarkMode();
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
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        console.log('Fetching transactions from API...');
        
        const result = await transactionService.getAllTransactions();
        
        if (result.success && result.data) {
          setTransactions(result.data);
          console.log('Transactions loaded:', result.data.length);
        } else {
          throw new Error(result.message || 'Failed to fetch transactions');
        }
      } catch (err: any) {
        console.error('Error fetching transactions:', err);
        setError(`Failed to load transactions: ${err.message || 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  const locationItems: LocationItem[] = [
    {
      id: 'all',
      name: 'All',
      count: transactions.length
    }
  ];

  const locationSet = new Set<string>();
  transactions.forEach(transaction => {
    const location = transaction.account?.customer?.city?.toLowerCase();
    if (location) {
      locationSet.add(location);
    }
  });
  const uniqueLocations = Array.from(locationSet);
    
  uniqueLocations.forEach(location => {
    if (location) {
      locationItems.push({
        id: location,
        name: location.charAt(0).toUpperCase() + location.slice(1),
        count: transactions.filter(t => 
          t.account?.customer?.city?.toLowerCase() === location).length
      });
    }
  });

  const filteredTransactions = transactions.filter(transaction => {
    const transactionLocation = transaction.account?.customer?.city?.toLowerCase();
    const matchesLocation = selectedLocation === 'all' || transactionLocation === selectedLocation;
    
    const matchesSearch = searchQuery === '' || 
                         transaction.account?.customer?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         transaction.account?.account_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         transaction.reference_no?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesLocation && matchesSearch;
  });

  const handleRowClick = (transaction: Transaction) => {
    if (isBatchApproveMode) {
      if (transaction.status.toLowerCase() === 'pending') {
        toggleTransactionSelection(transaction.id);
      }
    } else {
      setSelectedTransaction(transaction);
    }
  };

  const toggleTransactionSelection = (transactionId: string) => {
    const transaction = transactions.find(t => t.id === transactionId);
    if (!transaction || transaction.status.toLowerCase() !== 'pending') {
      return;
    }
    
    setSelectedTransactionIds(prev => {
      if (prev.includes(transactionId)) {
        return prev.filter(id => id !== transactionId);
      } else {
        return [...prev, transactionId];
      }
    });
  };

  const toggleSelectAll = () => {
    const pendingTransactions = filteredTransactions.filter(t => t.status.toLowerCase() === 'pending');
    const pendingTransactionIds = pendingTransactions.map(t => t.id);
    
    if (selectedTransactionIds.length === pendingTransactionIds.length && pendingTransactionIds.length > 0) {
      setSelectedTransactionIds([]);
    } else {
      setSelectedTransactionIds(pendingTransactionIds);
    }
  };

  const handleCancelApprove = () => {
    setIsBatchApproveMode(false);
    setSelectedTransactionIds([]);
  };

  const handleBatchApprove = async () => {
    if (selectedTransactionIds.length === 0) {
      return;
    }

    setShowConfirmModal(true);
  };

  const confirmBatchApproval = async () => {
    setShowConfirmModal(false);

    try {
      setIsApproving(true);
      setError(null);

      const result = await transactionService.batchApproveTransactions(selectedTransactionIds);

      if (result.success) {
        const successCount = result.data?.success?.length || 0;
        const failedCount = result.data?.failed?.length || 0;
        
        setApprovalDetails(result.data);
        
        if (failedCount > 0) {
          setApprovalMessage(
            `Batch approval completed with some failures: ${successCount} successful, ${failedCount} failed`
          );
          setShowFailedModal(true);
        } else {
          setApprovalMessage(
            `Successfully approved ${successCount} transaction(s)`
          );
          setShowSuccessModal(true);
        }
        
        setIsBatchApproveMode(false);
        setSelectedTransactionIds([]);
        
        const refreshResult = await transactionService.getAllTransactions();
        if (refreshResult.success && refreshResult.data) {
          setTransactions(refreshResult.data);
        }
      } else {
        setApprovalMessage(result.message || 'Failed to approve transactions');
        setShowFailedModal(true);
      }
    } catch (err: any) {
      console.error('Batch approval error:', err);
      setApprovalMessage(`Failed to approve transactions: ${err.message}`);
      setShowFailedModal(true);
    } finally {
      setIsApproving(false);
    }
  };

  const StatusText = ({ status }: { status: string }) => {
    let textColor = '';
    
    switch (status.toLowerCase()) {
      case 'done':
      case 'completed':
        textColor = '#22c55e';
        break;
      case 'pending':
        textColor = '#eab308';
        break;
      case 'processing':
        textColor = '#3b82f6';
        break;
      case 'failed':
      case 'cancelled':
        textColor = '#ef4444';
        break;
      default:
        textColor = '#9ca3af';
    }
    
    return (
      <Text style={{ color: textColor, textTransform: 'capitalize' }}>
        {status}
      </Text>
    );
  };

  if (loading) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: isDarkMode ? '#030712' : '#f9fafb' 
      }}>
        <View style={{ flexDirection: 'column', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colorPalette?.primary || '#ea580c'} />
          <Text style={{ 
            marginTop: 12, 
            color: isDarkMode ? '#d1d5db' : '#374151' 
          }}>Loading transactions...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: isDarkMode ? '#030712' : '#f9fafb' 
      }}>
        <View style={{ 
          borderRadius: 6, 
          padding: 24, 
          maxWidth: 512, 
          borderWidth: 1, 
          backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', 
          borderColor: isDarkMode ? '#374151' : '#e5e7eb' 
        }}>
          <Text style={{ color: '#f87171', fontSize: 18, fontWeight: '500', marginBottom: 8 }}>Error</Text>
          <Text style={{ 
            marginBottom: 16, 
            color: isDarkMode ? '#d1d5db' : '#374151' 
          }}>{error}</Text>
          <Pressable
            onPress={() => {}}
            style={{ 
              backgroundColor: colorPalette?.primary || '#ea580c', 
              paddingVertical: 8, 
              paddingHorizontal: 16, 
              borderRadius: 4 
            }}
          >
            <Text style={{ color: '#ffffff' }}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={{ 
      height: '100%', 
      flexDirection: 'row', 
      overflow: 'hidden', 
      backgroundColor: isDarkMode ? '#030712' : '#f9fafb' 
    }}>
      <View style={{ 
        borderRightWidth: 1, 
        flexShrink: 0, 
        flexDirection: 'column', 
        position: 'relative', 
        backgroundColor: isDarkMode ? '#111827' : '#ffffff', 
        borderRightColor: isDarkMode ? '#374151' : '#e5e7eb', 
        width: sidebarWidth 
      }}>
        <View style={{ 
          padding: 16, 
          borderBottomWidth: 1, 
          flexShrink: 0, 
          borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb' 
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ 
              fontSize: 18, 
              fontWeight: '600', 
              color: isDarkMode ? '#ffffff' : '#111827' 
            }}>Transactions</Text>
          </View>
        </View>
        <ScrollView style={{ flex: 1 }}>
          {locationItems.map((location) => (
            <Pressable
              key={location.id}
              onPress={() => setSelectedLocation(location.id)}
              style={{
                width: '100%', 
                flexDirection: 'row', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                paddingHorizontal: 16, 
                paddingVertical: 12,
                backgroundColor: selectedLocation === location.id 
                  ? (colorPalette?.primary ? `${colorPalette.primary}33` : 'rgba(249, 115, 22, 0.2)')
                  : 'transparent'
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Receipt size={16} color={selectedLocation === location.id ? (colorPalette?.primary || '#fb923c') : (isDarkMode ? '#d1d5db' : '#374151')} style={{ marginRight: 8 }} />
                <Text
                  style={{
                    fontSize: 14, 
                    textTransform: 'capitalize',
                    color: selectedLocation === location.id
                      ? (colorPalette?.primary || '#fb923c')
                      : (isDarkMode ? '#d1d5db' : '#374151')
                  }}
                >
                  {location.name}
                </Text>
              </View>
              {location.count > 0 && (
                <View
                  style={{
                    paddingHorizontal: 8, 
                    paddingVertical: 4, 
                    borderRadius: 9999,
                    backgroundColor: selectedLocation === location.id
                      ? (colorPalette?.primary || '#ea580c')
                      : (isDarkMode ? '#374151' : '#e5e7eb')
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      color: selectedLocation === location.id ? '#ffffff' : (isDarkMode ? '#d1d5db' : '#374151')
                    }}
                  >
                    {location.count}
                  </Text>
                </View>
              )}
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={{ 
        overflow: 'hidden', 
        flex: 1, 
        backgroundColor: isDarkMode ? '#111827' : '#f9fafb' 
      }}>
        <View style={{ flexDirection: 'column', height: '100%' }}>
          <View style={{ 
            padding: 16, 
            borderBottomWidth: 1, 
            flexShrink: 0, 
            backgroundColor: isDarkMode ? '#111827' : '#ffffff', 
            borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb' 
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ position: 'relative', flex: 1 }}>
                <TextInput
                  placeholder="Search transactions..."
                  placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  style={{ 
                    width: '100%', 
                    borderRadius: 4, 
                    paddingVertical: 8, 
                    paddingLeft: 40, 
                    paddingRight: 16, 
                    borderWidth: 1, 
                    backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', 
                    color: isDarkMode ? '#ffffff' : '#111827', 
                    borderColor: isDarkMode ? '#374151' : '#d1d5db' 
                  }}
                />
                <View style={{ position: 'absolute', left: 12, top: 10 }}>
                  <Search size={16} color={isDarkMode ? '#9ca3af' : '#6b7280'} />
                </View>
              </View>
              <Pressable 
                onPress={() => isBatchApproveMode ? handleCancelApprove() : setIsBatchApproveMode(true)}
                style={{ 
                  paddingHorizontal: 16, 
                  paddingVertical: 8, 
                  borderRadius: 4, 
                  flexDirection: 'row', 
                  alignItems: 'center',
                  backgroundColor: isBatchApproveMode ? '#dc2626' : (colorPalette?.primary || '#ea580c')
                }}
              >
                {isBatchApproveMode ? (
                  <>
                    <X size={16} color="#ffffff" style={{ marginRight: 8 }} />
                    <Text style={{ color: '#ffffff', fontSize: 14 }}>Cancel Approve</Text>
                  </>
                ) : (
                  <>
                    <CheckCheck size={16} color="#ffffff" style={{ marginRight: 8 }} />
                    <Text style={{ color: '#ffffff', fontSize: 14 }}>Batch Approve</Text>
                  </>
                )}
              </Pressable>
              {isBatchApproveMode && (
                <Pressable 
                  onPress={handleBatchApprove}
                  disabled={selectedTransactionIds.length === 0 || isApproving}
                  style={{
                    paddingHorizontal: 16, 
                    paddingVertical: 8, 
                    borderRadius: 4, 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    borderWidth: 1,
                    backgroundColor: selectedTransactionIds.length === 0 || isApproving
                      ? (isDarkMode ? '#374151' : '#d1d5db')
                      : '#16a34a',
                    borderColor: selectedTransactionIds.length === 0 || isApproving
                      ? (isDarkMode ? '#4b5563' : '#9ca3af')
                      : '#15803d',
                    opacity: selectedTransactionIds.length === 0 || isApproving ? 0.5 : 1
                  }}
                >
                  <Check size={16} color="#ffffff" style={{ marginRight: 8 }} />
                  <Text style={{ color: '#ffffff', fontSize: 14 }}>
                    {isApproving ? 'Approving...' : `Approve (${selectedTransactionIds.length})`}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
          
          <View style={{ flex: 1, overflow: 'hidden' }}>
            <ScrollView horizontal>
              <ScrollView style={{ height: '100%' }}>
                <View>
                  <View style={{ 
                    flexDirection: 'row', 
                    backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6' 
                  }}>
                    {isBatchApproveMode && (
                      <View style={{ paddingHorizontal: 16, paddingVertical: 12, width: 60 }}>
                        <Text style={{ color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Select</Text>
                      </View>
                    )}
                    <View style={{ paddingHorizontal: 16, paddingVertical: 12, width: 200 }}>
                      <Text style={{ 
                        fontSize: 12, 
                        fontWeight: '500', 
                        textTransform: 'uppercase', 
                        color: isDarkMode ? '#9ca3af' : '#4b5563' 
                      }}>Date Processed</Text>
                    </View>
                    <View style={{ paddingHorizontal: 16, paddingVertical: 12, width: 140 }}>
                      <Text style={{ 
                        fontSize: 12, 
                        fontWeight: '500', 
                        textTransform: 'uppercase', 
                        color: isDarkMode ? '#9ca3af' : '#4b5563' 
                      }}>Account No.</Text>
                    </View>
                    <View style={{ paddingHorizontal: 16, paddingVertical: 12, width: 140 }}>
                      <Text style={{ 
                        fontSize: 12, 
                        fontWeight: '500', 
                        textTransform: 'uppercase', 
                        color: isDarkMode ? '#9ca3af' : '#4b5563' 
                      }}>Received Payment</Text>
                    </View>
                    <View style={{ paddingHorizontal: 16, paddingVertical: 12, width: 140 }}>
                      <Text style={{ 
                        fontSize: 12, 
                        fontWeight: '500', 
                        textTransform: 'uppercase', 
                        color: isDarkMode ? '#9ca3af' : '#4b5563' 
                      }}>Payment Method</Text>
                    </View>
                    <View style={{ paddingHorizontal: 16, paddingVertical: 12, width: 140 }}>
                      <Text style={{ 
                        fontSize: 12, 
                        fontWeight: '500', 
                        textTransform: 'uppercase', 
                        color: isDarkMode ? '#9ca3af' : '#4b5563' 
                      }}>Status</Text>
                    </View>
                  </View>
                  {filteredTransactions.length > 0 ? (
                    filteredTransactions.map((transaction) => {
                      const isSelected = selectedTransactionIds.includes(transaction.id);
                      const isPending = transaction.status.toLowerCase() === 'pending';
                      
                      return (
                        <Pressable 
                          key={transaction.id} 
                          onPress={() => handleRowClick(transaction)}
                          style={{
                            flexDirection: 'row', 
                            borderBottomWidth: 1, 
                            borderBottomColor: isDarkMode ? '#1f2937' : '#e5e7eb',
                            backgroundColor: isSelected 
                              ? (colorPalette?.primary ? `${colorPalette.primary}33` : 'rgba(249, 115, 22, 0.2)')
                              : selectedTransaction?.id === transaction.id 
                                ? (isDarkMode ? '#1f2937' : '#f3f4f6')
                                : 'transparent'
                          }}
                        >
                          {isBatchApproveMode && (
                            <View style={{ paddingHorizontal: 16, paddingVertical: 12, width: 60 }}>
                              <Text style={{ color: isDarkMode ? '#d1d5db' : '#374151' }}>
                                {isPending ? '☐' : ''}
                              </Text>
                            </View>
                          )}
                          <View style={{ paddingHorizontal: 16, paddingVertical: 12, width: 200 }}>
                            <Text style={{ color: isDarkMode ? '#d1d5db' : '#374151' }}>{formatDate(transaction.date_processed)}</Text>
                          </View>
                          <View style={{ paddingHorizontal: 16, paddingVertical: 12, width: 140 }}>
                            <Text style={{ color: '#f87171', fontWeight: '500' }}>{transaction.account?.account_no || '-'}</Text>
                          </View>
                          <View style={{ paddingHorizontal: 16, paddingVertical: 12, width: 140 }}>
                            <Text style={{ 
                              fontWeight: '500', 
                              color: isDarkMode ? '#ffffff' : '#111827' 
                            }}>{formatCurrency(transaction.received_payment)}</Text>
                          </View>
                          <View style={{ paddingHorizontal: 16, paddingVertical: 12, width: 140 }}>
                            <Text style={{ color: isDarkMode ? '#d1d5db' : '#374151' }}>{transaction.payment_method}</Text>
                          </View>
                          <View style={{ paddingHorizontal: 16, paddingVertical: 12, width: 140 }}>
                            <StatusText status={transaction.status} />
                          </View>
                        </Pressable>
                      );
                    })
                  ) : (
                    <View style={{ paddingHorizontal: 16, paddingVertical: 48, alignItems: 'center' }}>
                      <Text style={{ color: isDarkMode ? '#9ca3af' : '#4b5563' }}>
                        {transactions.length > 0
                          ? 'No transactions found matching your filters'
                          : 'No transactions found.'}
                      </Text>
                    </View>
                  )}
                </View>
              </ScrollView>
            </ScrollView>
          </View>
        </View>
      </View>

      {selectedTransaction && (
        <View style={{ flexShrink: 0, overflow: 'hidden' }}>
          <TransactionListDetails 
            transaction={selectedTransaction}
            onClose={() => setSelectedTransaction(null)}
          />
        </View>
      )}

      <LoadingModal 
        isOpen={isApproving} 
        message="Approving transactions..." 
        percentage={50} 
      />

      <Modal
        visible={showConfirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ 
            borderRadius: 8, 
            padding: 24, 
            maxWidth: 448, 
            width: '91.666667%', 
            marginHorizontal: 16, 
            borderWidth: 1, 
            backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', 
            borderColor: isDarkMode ? '#374151' : '#d1d5db' 
          }}>
            <Text style={{ 
              fontSize: 20, 
              fontWeight: '600', 
              marginBottom: 16, 
              color: isDarkMode ? '#ffffff' : '#111827' 
            }}>Confirm Batch Approval</Text>
            <Text style={{ 
              marginBottom: 24, 
              color: isDarkMode ? '#d1d5db' : '#374151' 
            }}>
              Are you sure you want to approve {selectedTransactionIds.length} transaction(s)? This will update account balances and apply payments to invoices.
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
              <Pressable
                onPress={() => setShowConfirmModal(false)}
                style={{ backgroundColor: '#4b5563', paddingHorizontal: 24, paddingVertical: 8, borderRadius: 4 }}
              >
                <Text style={{ color: '#ffffff' }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={confirmBatchApproval}
                style={{ 
                  paddingHorizontal: 24, 
                  paddingVertical: 8, 
                  borderRadius: 4,
                  backgroundColor: colorPalette?.primary || '#22c55e'
                }}
              >
                <Text style={{ color: '#ffffff' }}>Confirm</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ 
            borderRadius: 8, 
            padding: 24, 
            maxWidth: 448, 
            width: '91.666667%', 
            marginHorizontal: 16, 
            borderWidth: 1, 
            backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', 
            borderColor: isDarkMode ? '#374151' : '#d1d5db' 
          }}>
            <Text style={{ fontSize: 20, fontWeight: '600', marginBottom: 16, color: '#22c55e' }}>Success</Text>
            <Text style={{ 
              marginBottom: 24, 
              color: isDarkMode ? '#d1d5db' : '#374151' 
            }}>{approvalMessage}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
              <Pressable
                onPress={() => setShowSuccessModal(false)}
                style={{ backgroundColor: '#16a34a', paddingHorizontal: 24, paddingVertical: 8, borderRadius: 4 }}
              >
                <Text style={{ color: '#ffffff' }}>OK</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showFailedModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFailedModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ 
            borderRadius: 8, 
            padding: 24, 
            maxWidth: 672, 
            width: '91.666667%', 
            marginHorizontal: 16, 
            borderWidth: 1, 
            backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', 
            borderColor: isDarkMode ? '#374151' : '#d1d5db' 
          }}>
            <Text style={{ fontSize: 20, fontWeight: '600', marginBottom: 16, color: '#ef4444' }}>Batch Approval Results</Text>
            <Text style={{ 
              marginBottom: 16, 
              color: isDarkMode ? '#d1d5db' : '#374151' 
            }}>{approvalMessage}</Text>
            
            {approvalDetails && approvalDetails.failed && approvalDetails.failed.length > 0 && (
              <ScrollView style={{ 
                marginBottom: 24, 
                padding: 16, 
                borderRadius: 4, 
                maxHeight: 384, 
                backgroundColor: isDarkMode ? '#111827' : '#f3f4f6' 
              }}>
                <Text style={{ 
                  fontWeight: '500', 
                  marginBottom: 8, 
                  color: isDarkMode ? '#ffffff' : '#111827' 
                }}>Failed Transactions:</Text>
                {approvalDetails.failed.map((fail: any, index: number) => (
                  <Text key={index} style={{ 
                    fontSize: 14, 
                    marginBottom: 8, 
                    color: isDarkMode ? '#d1d5db' : '#374151' 
                  }}>
                    <Text style={{ fontWeight: '500' }}>ID: {fail.transaction_id}</Text> - {fail.reason}
                  </Text>
                ))}
              </ScrollView>
            )}
            
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
              <Pressable
                onPress={() => setShowFailedModal(false)}
                style={{ backgroundColor: '#dc2626', paddingHorizontal: 24, paddingVertical: 8, borderRadius: 4 }}
              >
                <Text style={{ color: '#ffffff' }}>Close</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default TransactionList;