import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  Linking
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Search, Filter, FileText, RefreshCw, X, CreditCard, ExternalLink } from 'lucide-react-native';
import { invoiceService, InvoiceRecord } from '../services/invoiceService';
import { paymentService, PendingPayment } from '../services/paymentService';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';
import InvoiceDetails from '../components/InvoiceDetails';

const Invoice: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);
  const [invoiceRecords, setInvoiceRecords] = useState<InvoiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState('All');
  const [availableDates, setAvailableDates] = useState<string[]>(['All']);

  // View State
  const [selectedRecord, setSelectedRecord] = useState<InvoiceRecord | null>(null);
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // User & Payment State
  const [userRole, setUserRole] = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [accountBalance, setAccountBalance] = useState(0);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [showPaymentVerifyModal, setShowPaymentVerifyModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [fullName, setFullName] = useState('');

  // Payment Link Modal
  const [showPaymentLinkModal, setShowPaymentLinkModal] = useState(false);
  const [paymentLinkData, setPaymentLinkData] = useState<{ referenceNo: string; amount: number; paymentUrl: string } | null>(null);
  const [pendingPayment, setPendingPayment] = useState<PendingPayment | null>(null);
  const [showPendingPaymentModal, setShowPendingPaymentModal] = useState(false);

  useEffect(() => {
    const init = async () => {
      const theme = await AsyncStorage.getItem('theme');
      setIsDarkMode(theme !== 'light');
      const activePalette = await settingsColorPaletteService.getActive();
      setColorPalette(activePalette);

      const authData = await AsyncStorage.getItem('authData');
      if (authData) {
        const user = JSON.parse(authData);
        setUserRole(user.role?.toLowerCase() || '');
        setAccountNo(user.username || '');
        setFullName(user.full_name || user.username || '');

        if (user.account_balance) {
          setAccountBalance(parseFloat(user.account_balance));
        }
      }
    };
    init();
    fetchRecords(true);
  }, []);

  const fetchRecords = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      setError(null);

      const authData = await AsyncStorage.getItem('authData');
      const user = authData ? JSON.parse(authData) : null;
      const role = user?.role?.toLowerCase() || '';

      let records: InvoiceRecord[] = [];

      if (role === 'customer') {
        records = await invoiceService.getAllInvoices(true);
        // Optimization: Filter locally if API returns everything
        if (user?.username) {
          records = records.filter(r => r.account_no === user.username);
        }
      } else {
        records = await invoiceService.getAllInvoices(true);
      }

      setInvoiceRecords(records);

      // Extract unique dates
      const dates = new Set<string>(['All']);
      records.forEach(r => {
        if (r.invoice_date) dates.add(r.invoice_date);
      });
      setAvailableDates(Array.from(dates).sort().reverse());

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchRecords(false);
  };

  // Payment Logic
  const handlePayNow = async () => {
    if (!accountNo) {
      Alert.alert('Error', 'Account number not found.');
      return;
    }

    setIsPaymentProcessing(true);
    try {
      // 1. Get latest balance
      const balance = await paymentService.getAccountBalance(accountNo);
      setAccountBalance(balance);

      // 2. Check pending
      const pending = await paymentService.checkPendingPayment(accountNo);

      if (pending && pending.payment_url) {
        setPendingPayment(pending);
        setShowPendingPaymentModal(true);
      } else {
        setPaymentAmount(balance > 0 ? balance : 100);
        setShowPaymentVerifyModal(true);
      }
    } catch (err: any) {
      Alert.alert('Error', 'Failed to initialize payment.');
    } finally {
      setIsPaymentProcessing(false);
    }
  };

  const handleProceedPayment = async () => {
    if (paymentAmount < 1) {
      Alert.alert('Invalid Amount', 'Minimum payment is ₱1.00');
      return;
    }

    setIsPaymentProcessing(true);
    try {
      const response = await paymentService.createPayment(accountNo, paymentAmount);
      if (response.status === 'success' && response.payment_url) {
        setShowPaymentVerifyModal(false);
        setPaymentLinkData({
          referenceNo: response.reference_no || '',
          amount: response.amount || paymentAmount,
          paymentUrl: response.payment_url
        });
        setShowPaymentLinkModal(true);
      } else {
        throw new Error(response.message || 'Failed to generate payment link');
      }
    } catch (err: any) {
      Alert.alert('Payment Error', err.message);
    } finally {
      setIsPaymentProcessing(false);
    }
  };

  const openPaymentUrl = (url?: string) => {
    if (url) {
      Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open payment browser'));
      // Close modals
      setShowPaymentLinkModal(false);
      setShowPendingPaymentModal(false);
      setPaymentLinkData(null);
      setPendingPayment(null);
    }
  };

  // Filter
  const filteredRecords = invoiceRecords.filter(r => {
    const matchDate = selectedDate === 'All' || r.invoice_date === selectedDate;
    const q = searchQuery.toLowerCase();
    const matchSearch = !searchQuery ||
      r.account_no?.toLowerCase().includes(q) ||
      r.account?.customer?.full_name?.toLowerCase().includes(q) ||
      r.id.toString().includes(q);

    return matchDate && matchSearch;
  });

  const renderItem = ({ item }: { item: InvoiceRecord }) => (
    <TouchableOpacity
      onPress={() => setSelectedRecord(item)}
      className={`p-4 border-b mb-1 ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}
    >
      <View className="flex-row justify-between items-start">
        <View className="flex-1 mr-2">
          <Text className={`font-bold text-base mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {item.account?.customer?.full_name || item.account_no}
          </Text>
          <Text className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Date: {item.invoice_date}
          </Text>
          <Text className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            ID: {item.id}
          </Text>
        </View>
        <View className="items-end">
          <Text className={`font-bold ${colorPalette?.primary ? '' : 'text-orange-600'}`} style={colorPalette?.primary ? { color: colorPalette.primary } : {}}>
            ₱{item.total_amount ? item.total_amount.toFixed(2) : '0.00'}
          </Text>
          <Text className={`text-xs mt-1 ${item.status === 'Paid' ? 'text-green-500' : 'text-red-500'}`}>
            {item.status}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  // --- Views ---

  if (selectedRecord) {
    return (
      <SafeAreaView className={`flex-1 ${isDarkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
        <InvoiceDetails invoiceRecord={selectedRecord} onClose={() => setSelectedRecord(null)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className={`flex-1 ${isDarkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
      {/* Header */}
      <View className={`border-b px-4 py-3 ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
        <View className="flex-row justify-between items-center mb-4">
          <Text className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Invoices</Text>
          <TouchableOpacity onPress={handleRefresh}>
            <RefreshCw size={20} color={isDarkMode ? 'white' : 'black'} />
          </TouchableOpacity>
        </View>

        {/* Search & Filter Bar */}
        <View className="flex-row items-center space-x-2">
          <View className="flex-1 relative">
            <TextInput
              placeholder="Search account, name..."
              placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
              value={searchQuery}
              onChangeText={setSearchQuery}
              className={`pl-9 pr-4 py-2 rounded-lg border ${isDarkMode ? 'bg-gray-800 text-white border-gray-700' : 'bg-gray-100 text-gray-900 border-gray-300'
                }`}
            />
            <Search size={16} color={isDarkMode ? '#9ca3af' : '#6b7280'} style={{ position: 'absolute', left: 12, top: 12 }} />
          </View>
          <TouchableOpacity
            onPress={() => setIsDateFilterOpen(true)}
            className={`p-2 rounded-lg ${selectedDate !== 'All' ? 'bg-orange-500' : (isDarkMode ? 'bg-gray-800' : 'bg-gray-200')}`}
          >
            <Filter size={20} color={selectedDate !== 'All' ? 'white' : (isDarkMode ? 'white' : 'black')} />
          </TouchableOpacity>
        </View>
      </View>

      {/* List */}
      {loading && !refreshing ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={colorPalette?.primary || 'orange'} />
        </View>
      ) : (
        <FlatList
          data={filteredRecords}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <View className="p-8 items-center">
              <Text className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>No records found.</Text>
            </View>
          }
        />
      )}

      {/* Customer Pay Button FAB */}
      {userRole === 'customer' && (
        <TouchableOpacity
          onPress={handlePayNow}
          disabled={isPaymentProcessing}
          className="absolute bottom-6 right-6 px-6 py-4 rounded-full shadow-lg flex-row items-center space-x-2"
          style={{ backgroundColor: colorPalette?.primary || '#ea580c' }}
        >
          {isPaymentProcessing ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <>
              <CreditCard size={20} color="white" />
              <Text className="text-white font-bold text-base ml-2">Pay Now</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {/* Date Filter Modal */}
      <Modal visible={isDateFilterOpen} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/50">
          <View className={`rounded-t-xl p-4 max-h-[50%] ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
            <View className="flex-row justify-between items-center mb-4">
              <Text className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Filter by Date</Text>
              <TouchableOpacity onPress={() => setIsDateFilterOpen(false)}>
                <X size={24} color={isDarkMode ? 'white' : 'black'} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={availableDates}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedDate(item);
                    setIsDateFilterOpen(false);
                  }}
                  className={`p-4 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-100'} ${selectedDate === item ? (isDarkMode ? 'bg-gray-800' : 'bg-gray-100') : ''}`}
                >
                  <Text className={`${isDarkMode ? 'text-white' : 'text-gray-900'} ${selectedDate === item ? 'font-bold' : ''}`}>
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Payment Verify Modal */}
      <Modal visible={showPaymentVerifyModal} transparent animationType="fade">
        <View className="flex-1 justify-center items-center bg-black/60 p-6">
          <View className={`w-full max-w-sm rounded-xl p-6 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
            <Text className={`text-xl font-bold mb-4 text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Confirm Payment</Text>

            <View className={`p-4 rounded mb-4 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
              <View className="flex-row justify-between mb-2">
                <Text className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Account</Text>
                <Text className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{fullName || accountNo}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Current Balance</Text>
                <Text className={`font-bold ${accountBalance > 0 ? 'text-red-500' : 'text-green-500'}`}>
                  ₱{accountBalance.toFixed(2)}
                </Text>
              </View>
            </View>

            <Text className={`mb-2 font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Payment Amount</Text>
            <TextInput
              value={String(paymentAmount)}
              onChangeText={(t) => setPaymentAmount(parseFloat(t) || 0)}
              keyboardType="numeric"
              className={`p-3 rounded border text-lg font-bold mb-4 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
            />

            <View className="flex-row space-x-3">
              <TouchableOpacity
                onPress={() => setShowPaymentVerifyModal(false)}
                className={`flex-1 p-3 rounded items-center ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}
              >
                <Text className={isDarkMode ? 'text-white' : 'text-gray-900'}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleProceedPayment}
                disabled={isPaymentProcessing}
                className="flex-1 p-3 rounded items-center"
                style={{ backgroundColor: colorPalette?.primary || '#ea580c' }}
              >
                {isPaymentProcessing ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold">Pay Now</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Payment Link Modal */}
      <Modal visible={showPaymentLinkModal} transparent animationType="fade">
        <View className="flex-1 justify-center items-center bg-black/60 p-6">
          <View className={`w-full max-w-sm rounded-xl p-6 items-center ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
            <View className="bg-green-100 p-4 rounded-full mb-4">
              <FileText size={40} color="green" />
            </View>
            <Text className={`text-xl font-bold mb-2 text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Payment Link Ready</Text>
            <Text className={`text-center mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Reference: {paymentLinkData?.referenceNo}
            </Text>

            <TouchableOpacity
              onPress={() => openPaymentUrl(paymentLinkData?.paymentUrl)}
              className="w-full py-3 rounded-lg flex-row justify-center items-center mb-3"
              style={{ backgroundColor: colorPalette?.primary || '#ea580c' }}
            >
              <ExternalLink size={20} color="white" /> // Re-using FileText symbol for now or Link.
              // Wait, ExternalLink import is from lucide-react-native. I need to make sure I imported it.
              // I imported 'ExternalLink' is not in the top import. I will fix that.
              <Text className="text-white font-bold ml-2">Proceed to Checkout</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowPaymentLinkModal(false)}>
              <Text className="text-gray-500 font-medium">Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Pending Payment Modal */}
      <Modal visible={showPendingPaymentModal} transparent animationType="fade">
        <View className="flex-1 justify-center items-center bg-black/60 p-6">
          <View className={`w-full max-w-sm rounded-xl p-6 items-center ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
            <Text className={`text-xl font-bold mb-2 text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Pending Payment Found</Text>
            <Text className={`text-center mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              You have a pending transaction. Would you like to resume it?
            </Text>
            <Text className={`text-center mb-6 font-bold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Amount: ₱{pendingPayment?.amount.toFixed(2)}
            </Text>

            <TouchableOpacity
              onPress={() => openPaymentUrl(pendingPayment?.payment_url)}
              className="w-full py-3 rounded-lg flex-row justify-center items-center mb-3"
              style={{ backgroundColor: colorPalette?.primary || '#ea580c' }}
            >
              {/* Check import for ExternalLink again */}
              <Text className="text-white font-bold ml-2">Resume Payment</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowPendingPaymentModal(false)}>
              <Text className="text-red-500 font-medium">Close / Create New</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

export default Invoice;
