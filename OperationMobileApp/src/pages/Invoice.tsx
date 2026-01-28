import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Alert, Modal, ActivityIndicator } from 'react-native';
import { Search, X } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import InvoiceDetails from '../components/InvoiceDetails';
import { invoiceService, InvoiceRecord } from '../services/invoiceService';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';
import { paymentService, PendingPayment } from '../services/paymentService';

interface InvoiceRecordUI {
  id: string;
  accountNo: string;
  invoiceDate: string;
  invoiceBalance: number;
  serviceCharge: number;
  rebate: number;
  discounts: number;
  staggered: number;
  totalAmount: number;
  receivedPayment: number;
  dueDate: string;
  status: string;
  paymentPortalLogRef?: string;
  transactionId?: string;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
  fullName: string;
  contactNumber: string;
  emailAddress: string;
  address: string;
  plan: string;
  dateInstalled?: string;
  barangay?: string;
  city?: string;
  region?: string;
  provider?: string;
  invoiceNo?: string;
  totalAmountDue?: number;
  invoicePayment?: number;
  paymentMethod?: string;
  dateProcessed?: string;
  processedBy?: string;
  remarks?: string;
  vat?: number;
  amountDue?: number;
  balanceFromPreviousBill?: number;
  paymentReceived?: number;
  remainingBalance?: number;
  monthlyServiceFee?: number;
  staggeredPaymentsCount?: number;
  invoiceStatus: string;
}

const Invoice: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [selectedDate, setSelectedDate] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sidebarWidth, setSidebarWidth] = useState<number>(256);
  const [isResizingSidebar, setIsResizingSidebar] = useState<boolean>(false);
  const sidebarStartXRef = useRef<number>(0);
  const sidebarStartWidthRef = useRef<number>(0);
  const [selectedRecord, setSelectedRecord] = useState<InvoiceRecordUI | null>(null);
  const [invoiceRecords, setInvoiceRecords] = useState<InvoiceRecordUI[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [accountNo, setAccountNo] = useState<string>('');
  const [accountBalance, setAccountBalance] = useState<number>(0);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState<boolean>(false);
  const [showPaymentVerifyModal, setShowPaymentVerifyModal] = useState<boolean>(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [fullName, setFullName] = useState<string>('');
  const [showPaymentLinkModal, setShowPaymentLinkModal] = useState<boolean>(false);
  const [paymentLinkData, setPaymentLinkData] = useState<{referenceNo: string; amount: number; paymentUrl: string} | null>(null);
  const [showPendingPaymentModal, setShowPendingPaymentModal] = useState<boolean>(false);
  const [pendingPayment, setPendingPayment] = useState<PendingPayment | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const allColumns = [
    { key: 'id', label: 'ID', width: 80 },
    { key: 'accountNo', label: 'Account Number', width: 144 },
    { key: 'invoiceDate', label: 'Invoice Date', width: 144 },
    { key: 'invoiceBalance', label: 'Invoice Balance', width: 144 },
    { key: 'serviceCharge', label: 'Service Charge', width: 144 },
    { key: 'rebate', label: 'Rebate', width: 112 },
    { key: 'discounts', label: 'Discounts', width: 112 },
    { key: 'staggered', label: 'Staggered', width: 112 },
    { key: 'totalAmount', label: 'Total Amount', width: 128 },
    { key: 'receivedPayment', label: 'Received Payment', width: 144 },
    { key: 'dueDate', label: 'Due Date', width: 128 },
    { key: 'status', label: 'Status', width: 112 },
    { key: 'paymentPortalLogRef', label: 'Payment Portal Log Ref', width: 176 },
    { key: 'transactionId', label: 'Transaction ID', width: 144 },
    { key: 'createdAt', label: 'Created At', width: 160 },
    { key: 'createdBy', label: 'Created By', width: 128 },
    { key: 'updatedAt', label: 'Updated At', width: 160 },
    { key: 'updatedBy', label: 'Updated By', width: 128 },
    { key: 'fullName', label: 'Full Name', width: 160 },
    { key: 'contactNumber', label: 'Contact Number', width: 144 },
    { key: 'emailAddress', label: 'Email Address', width: 192 },
    { key: 'address', label: 'Address', width: 224 },
    { key: 'plan', label: 'Plan', width: 128 },
    { key: 'dateInstalled', label: 'Date Installed', width: 128 },
    { key: 'barangay', label: 'Barangay', width: 128 },
    { key: 'city', label: 'City', width: 128 },
    { key: 'region', label: 'Region', width: 128 },
  ];

  const customerColumns = [
    { key: 'id', label: 'ID', width: 80 },
    { key: 'invoiceDate', label: 'Invoice Date', width: 144 },
    { key: 'dueDate', label: 'Due Date', width: 128 },
    { key: 'totalAmount', label: 'Total Amount', width: 128 },
    { key: 'status', label: 'Status', width: 112 },
  ];

  const displayColumns = userRole === 'customer' ? customerColumns : allColumns;

  const dateItems: Array<{ date: string; id: string }> = [{ date: 'All', id: '' }];

  useEffect(() => {
    const checkDarkMode = async () => {
      const theme = await AsyncStorage.getItem('theme');
      setIsDarkMode(theme === 'dark' || theme === null);
    };

    checkDarkMode();
  }, []);

  useEffect(() => {
    const loadAuthData = async () => {
      const authData = await AsyncStorage.getItem('authData');
      if (authData) {
        try {
          const user = JSON.parse(authData);
          setUserRole(user.role?.toLowerCase() || '');
          setAccountNo(user.username || '');
          const balance = parseFloat(user.account_balance || '0');
          setAccountBalance(balance);
          setPaymentAmount(balance > 0 ? balance : 100);
          setFullName(user.full_name || '');
        } catch (error) {
          console.error('Error parsing auth data:', error);
        }
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
    fetchInvoiceData();
  }, []);

  const fetchInvoiceData = async () => {
    try {
      setIsLoading(true);
      const data = await invoiceService.getAllInvoices();
      
      const transformedData: InvoiceRecordUI[] = data.map(record => ({
        id: record.id.toString(),
        accountNo: record.account_no || record.account?.account_no || '',
        invoiceDate: new Date(record.invoice_date).toLocaleDateString(),
        invoiceBalance: Number(record.invoice_balance) || 0,
        serviceCharge: Number(record.service_charge) || 0,
        rebate: Number(record.rebate) || 0,
        discounts: Number(record.discounts) || 0,
        staggered: Number(record.staggered) || 0,
        totalAmount: Number(record.total_amount) || 0,
        receivedPayment: Number(record.received_payment) || 0,
        dueDate: new Date(record.due_date).toLocaleDateString(),
        status: record.status,
        paymentPortalLogRef: record.payment_portal_log_ref,
        transactionId: record.transaction_id,
        createdAt: record.created_at ? new Date(record.created_at).toLocaleString() : '',
        createdBy: record.created_by,
        updatedAt: record.updated_at ? new Date(record.updated_at).toLocaleString() : '',
        updatedBy: record.updated_by,
        fullName: record.account?.customer?.full_name || 'Unknown',
        contactNumber: record.account?.customer?.contact_number_primary || 'N/A',
        emailAddress: record.account?.customer?.email_address || 'N/A',
        address: record.account?.customer?.address || 'N/A',
        plan: record.account?.customer?.desired_plan || 'No Plan',
        dateInstalled: record.account?.date_installed ? new Date(record.account.date_installed).toLocaleDateString() : '',
        barangay: record.account?.customer?.barangay || '',
        city: record.account?.customer?.city || '',
        region: record.account?.customer?.region || '',
        provider: 'SWITCH',
        invoiceNo: '2508182' + record.id.toString(),
        totalAmountDue: Number(record.total_amount) || 0,
        invoicePayment: Number(record.received_payment) || 0,
        paymentMethod: record.received_payment > 0 ? 'Payment Received' : 'N/A',
        dateProcessed: record.received_payment > 0 && record.updated_at ? new Date(record.updated_at).toLocaleDateString() : undefined,
        processedBy: record.received_payment > 0 ? record.updated_by : undefined,
        remarks: 'System Generated',
        vat: 0,
        amountDue: (Number(record.total_amount) || 0) - (Number(record.received_payment) || 0),
        balanceFromPreviousBill: 0,
        paymentReceived: Number(record.received_payment) || 0,
        remainingBalance: (Number(record.total_amount) || 0) - (Number(record.received_payment) || 0),
        monthlyServiceFee: Number(record.invoice_balance) || 0,
        staggeredPaymentsCount: 0,
        invoiceStatus: record.status,
      }));

      setInvoiceRecords(transformedData);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch Invoice records:', err);
      setError('Failed to load Invoice records. Please try again.');
      setInvoiceRecords([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRecords = invoiceRecords.filter(record => {
    const matchesDate = selectedDate === 'All' || record.invoiceDate === selectedDate;
    const matchesSearch = searchQuery === '' || 
                         record.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         record.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         record.accountNo.includes(searchQuery) ||
                         record.id.includes(searchQuery) ||
                         record.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (record.transactionId && record.transactionId.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesDate && matchesSearch;
  });

  const handleRowClick = (record: InvoiceRecordUI) => {
    if (userRole !== 'customer') {
      setSelectedRecord(record);
    }
  };

  const handleCloseDetails = () => {
    setSelectedRecord(null);
  };

  const handleRefresh = async () => {
    await fetchInvoiceData();
  };

  const handlePayNow = async () => {
    setErrorMessage('');
    setIsPaymentProcessing(true);

    try {
      const pending = await paymentService.checkPendingPayment(accountNo);
      
      if (pending && pending.payment_url) {
        setPendingPayment(pending);
        setShowPendingPaymentModal(true);
      } else {
        setPaymentAmount(accountBalance > 0 ? accountBalance : 100);
        setShowPaymentVerifyModal(true);
      }
    } catch (error: any) {
      console.error('Error checking pending payment:', error);
      setPaymentAmount(accountBalance > 0 ? accountBalance : 100);
      setShowPaymentVerifyModal(true);
    } finally {
      setIsPaymentProcessing(false);
    }
  };

  const handleCloseVerifyModal = () => {
    setShowPaymentVerifyModal(false);
    setPaymentAmount(accountBalance);
  };

  const handleProceedToCheckout = async () => {
    if (paymentAmount < 1) {
      setErrorMessage('Payment amount must be at least ₱1.00');
      return;
    }

    if (isPaymentProcessing) {
      return;
    }

    setIsPaymentProcessing(true);
    setErrorMessage('');

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
        throw new Error(response.message || 'Failed to create payment link');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      setErrorMessage(error.message || 'Failed to create payment. Please try again.');
    } finally {
      setIsPaymentProcessing(false);
    }
  };

  const handleOpenPaymentLink = () => {
    if (paymentLinkData?.paymentUrl) {
      // WEB-ONLY: window.open(paymentLinkData.paymentUrl, '_blank');
      setShowPaymentLinkModal(false);
      setPaymentLinkData(null);
    }
  };

  const handleCancelPaymentLink = () => {
    setShowPaymentLinkModal(false);
    setPaymentLinkData(null);
  };

  const handleResumePendingPayment = () => {
    if (pendingPayment && pendingPayment.payment_url) {
      // WEB-ONLY: window.open(pendingPayment.payment_url, '_blank');
      setShowPendingPaymentModal(false);
      setPendingPayment(null);
    }
  };

  const handleCancelPendingPayment = () => {
    setShowPendingPaymentModal(false);
    setPendingPayment(null);
  };

  const renderCellValue = (record: InvoiceRecordUI, columnKey: string) => {
    switch (columnKey) {
      case 'id':
        return <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>{record.id}</Text>;
      case 'accountNo':
        return <Text style={{ color: '#f87171' }}>{record.accountNo}</Text>;
      case 'invoiceDate':
        return <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>{record.invoiceDate}</Text>;
      case 'invoiceBalance':
        return <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>₱ {record.invoiceBalance.toFixed(2)}</Text>;
      case 'serviceCharge':
        return <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>₱ {record.serviceCharge.toFixed(2)}</Text>;
      case 'rebate':
        return <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>₱ {record.rebate.toFixed(2)}</Text>;
      case 'discounts':
        return <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>₱ {record.discounts.toFixed(2)}</Text>;
      case 'staggered':
        return <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>₱ {record.staggered.toFixed(2)}</Text>;
      case 'totalAmount':
        return <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>₱ {record.totalAmount.toFixed(2)}</Text>;
      case 'receivedPayment':
        return <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>₱ {record.receivedPayment.toFixed(2)}</Text>;
      case 'dueDate':
        return <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>{record.dueDate}</Text>;
      case 'status':
        return (
          <Text style={{
            color: record.status === 'Unpaid' ? '#ef4444' : 
                   record.status === 'Paid' ? '#22c55e' : 
                   '#eab308'
          }}>
            {record.status}
          </Text>
        );
      case 'paymentPortalLogRef':
        return <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>{record.paymentPortalLogRef || 'NULL'}</Text>;
      case 'transactionId':
        return <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>{record.transactionId || 'NULL'}</Text>;
      case 'createdAt':
        return <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>{record.createdAt || '-'}</Text>;
      case 'createdBy':
        return <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>{record.createdBy || '-'}</Text>;
      case 'updatedAt':
        return <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>{record.updatedAt || '-'}</Text>;
      case 'updatedBy':
        return <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>{record.updatedBy || '-'}</Text>;
      case 'fullName':
        return <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>{record.fullName || '-'}</Text>;
      case 'contactNumber':
        return <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>{record.contactNumber || '-'}</Text>;
      case 'emailAddress':
        return <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>{record.emailAddress || '-'}</Text>;
      case 'address':
        return <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }} numberOfLines={1}>{record.address || '-'}</Text>;
      case 'plan':
        return <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>{record.plan || '-'}</Text>;
      case 'dateInstalled':
        return <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>{record.dateInstalled || '-'}</Text>;
      case 'barangay':
        return <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>{record.barangay || '-'}</Text>;
      case 'city':
        return <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>{record.city || '-'}</Text>;
      case 'region':
        return <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>{record.region || '-'}</Text>;
      default:
        return <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>-</Text>;
    }
  };

  return (
    <View style={{
      height: '100%',
      flexDirection: 'row',
      overflow: 'hidden',
      backgroundColor: isDarkMode ? '#030712' : '#f9fafb'
    }}>
      {userRole !== 'customer' && (
        <View style={{
          borderRightWidth: 1,
          borderRightColor: isDarkMode ? '#374151' : '#e5e7eb',
          flexShrink: 0,
          flexDirection: 'column',
          position: 'relative',
          backgroundColor: isDarkMode ? '#111827' : '#ffffff',
          width: sidebarWidth
        }}>
          <View style={{
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb',
            flexShrink: 0
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{
                fontSize: 18,
                fontWeight: '600',
                color: isDarkMode ? '#ffffff' : '#111827'
              }}>Invoice</Text>
            </View>
          </View>
          <ScrollView style={{ flex: 1 }}>
            {dateItems.map((item, index) => (
              <Pressable
                key={index}
                onPress={() => setSelectedDate(item.date)}
                style={{
                  width: '100%',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  backgroundColor: selectedDate === item.date 
                    ? (colorPalette?.primary ? `${colorPalette.primary}33` : 'rgba(249, 115, 22, 0.2)')
                    : 'transparent'
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '500',
                    color: selectedDate === item.date
                      ? (colorPalette?.primary || '#fb923c')
                      : (isDarkMode ? '#d1d5db' : '#374151')
                  }}>
                    {item.date}
                  </Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={{
        flex: 1,
        overflow: 'hidden',
        backgroundColor: isDarkMode ? '#111827' : '#f9fafb'
      }}>
        <View style={{ flexDirection: 'column', height: '100%' }}>
          <View style={{
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb',
            flexShrink: 0,
            backgroundColor: isDarkMode ? '#111827' : '#ffffff'
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ position: 'relative', flex: 1 }}>
                <TextInput
                  placeholder="Search Invoice records..."
                  placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  style={{
                    width: '100%',
                    borderRadius: 4,
                    paddingLeft: 40,
                    paddingRight: 16,
                    paddingVertical: 8,
                    backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                    color: isDarkMode ? '#ffffff' : '#111827',
                    borderWidth: 1,
                    borderColor: isDarkMode ? '#374151' : '#d1d5db'
                  }}
                />
                <View style={{ position: 'absolute', left: 12, top: 10 }}>
                  <Search size={16} color={isDarkMode ? '#9ca3af' : '#6b7280'} />
                </View>
              </View>
              {userRole === 'customer' && (
                <Pressable
                  onPress={handlePayNow}
                  disabled={isPaymentProcessing}
                  style={{
                    backgroundColor: isPaymentProcessing ? '#6b7280' : (colorPalette?.primary || '#ea580c'),
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 4,
                    opacity: isPaymentProcessing ? 0.5 : 1
                  }}
                >
                  <Text style={{ color: '#ffffff', fontSize: 14 }}>
                    {isPaymentProcessing ? 'Processing...' : 'Pay Now'}
                  </Text>
                </Pressable>
              )}
              <Pressable
                onPress={handleRefresh}
                disabled={isLoading}
                style={{
                  backgroundColor: isLoading ? '#4b5563' : (colorPalette?.primary || '#ea580c'),
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 4
                }}
              >
                <Text style={{ color: '#ffffff', fontSize: 14 }}>
                  {isLoading ? 'Loading...' : 'Refresh'}
                </Text>
              </Pressable>
            </View>
          </View>
          
          <View style={{ flex: 1, overflow: 'hidden' }}>
            <ScrollView style={{ height: '100%' }}>
              {isLoading ? (
                <View style={{
                  paddingHorizontal: 16,
                  paddingVertical: 48,
                  alignItems: 'center',
                  color: isDarkMode ? '#9ca3af' : '#4b5563'
                }}>
                  <ActivityIndicator size="large" color={colorPalette?.primary || '#ea580c'} />
                  <Text style={{
                    marginTop: 16,
                    color: isDarkMode ? '#9ca3af' : '#4b5563'
                  }}>Loading Invoice records...</Text>
                </View>
              ) : error ? (
                <View style={{
                  paddingHorizontal: 16,
                  paddingVertical: 48,
                  alignItems: 'center',
                  color: isDarkMode ? '#f87171' : '#dc2626'
                }}>
                  <Text style={{ color: isDarkMode ? '#f87171' : '#dc2626' }}>{error}</Text>
                  <Pressable 
                    onPress={handleRefresh}
                    style={{
                      marginTop: 16,
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 4,
                      backgroundColor: isDarkMode ? '#374151' : '#e5e7eb'
                    }}>
                    <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>Retry</Text>
                  </Pressable>
                </View>
              ) : (
                <ScrollView horizontal>
                  <View>
                    <View style={{
                      flexDirection: 'row',
                      borderBottomWidth: 1,
                      borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb',
                      backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6'
                    }}>
                      {displayColumns.map((column, index) => (
                        <View
                          key={column.key}
                          style={{
                            paddingVertical: 12,
                            paddingHorizontal: 12,
                            width: column.width,
                            borderRightWidth: index < displayColumns.length - 1 ? 1 : 0,
                            borderRightColor: isDarkMode ? '#374151' : '#e5e7eb',
                            backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6'
                          }}
                        >
                          <Text style={{
                            fontSize: 14,
                            fontWeight: '400',
                            color: isDarkMode ? '#9ca3af' : '#4b5563'
                          }}>
                            {column.label}
                          </Text>
                        </View>
                      ))}
                    </View>
                    {filteredRecords.length > 0 ? (
                      filteredRecords.map((record) => (
                        <Pressable 
                          key={record.id} 
                          onPress={() => handleRowClick(record)}
                          style={{
                            flexDirection: 'row',
                            borderBottomWidth: 1,
                            borderBottomColor: isDarkMode ? '#1f2937' : '#e5e7eb',
                            backgroundColor: selectedRecord?.id === record.id 
                              ? (isDarkMode ? '#1f2937' : '#f3f4f6')
                              : 'transparent'
                          }}
                        >
                          {displayColumns.map((column, index) => (
                            <View
                              key={column.key}
                              style={{
                                paddingVertical: 16,
                                paddingHorizontal: 12,
                                width: column.width,
                                borderRightWidth: index < displayColumns.length - 1 ? 1 : 0,
                                borderRightColor: isDarkMode ? '#1f2937' : '#e5e7eb'
                              }}
                            >
                              {renderCellValue(record, column.key)}
                            </View>
                          ))}
                        </Pressable>
                      ))
                    ) : (
                      <View style={{
                        paddingHorizontal: 16,
                        paddingVertical: 48,
                        alignItems: 'center'
                      }}>
                        <Text style={{ color: isDarkMode ? '#9ca3af' : '#4b5563' }}>
                          No Invoice records found matching your filters
                        </Text>
                      </View>
                    )}
                  </View>
                </ScrollView>
              )}
            </ScrollView>
          </View>
        </View>
      </View>

      {selectedRecord && userRole !== 'customer' && (
        <View style={{ flexShrink: 0, overflow: 'hidden' }}>
          <InvoiceDetails invoiceRecord={selectedRecord} />
        </View>
      )}

      <Modal
        visible={showPaymentVerifyModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseVerifyModal}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <View style={{
            borderRadius: 8,
            maxWidth: 448,
            width: '90%',
            marginHorizontal: 16,
            backgroundColor: isDarkMode ? '#111827' : '#ffffff'
          }}>
            <View style={{
              padding: 24,
              borderBottomWidth: 1,
              borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb'
            }}>
              <Text style={{
                fontSize: 20,
                fontWeight: 'bold',
                textAlign: 'center',
                color: isDarkMode ? '#ffffff' : '#111827'
              }}>Confirm Payment</Text>
            </View>

            <View style={{ padding: 24 }}>
              <View style={{
                padding: 16,
                borderRadius: 4,
                marginBottom: 16,
                backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6'
              }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>Account:</Text>
                  <Text style={{ fontWeight: 'bold', color: isDarkMode ? '#ffffff' : '#111827' }}>{fullName}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>Current Balance:</Text>
                  <Text style={{
                    fontWeight: 'bold',
                    color: accountBalance > 0 ? '#ef4444' : '#22c55e'
                  }}>₱{accountBalance.toFixed(2)}</Text>
                </View>
              </View>

              {errorMessage && (
                <View style={{
                  padding: 12,
                  borderRadius: 4,
                  marginBottom: 16,
                  backgroundColor: isDarkMode ? 'rgba(127, 29, 29, 0.2)' : '#fef2f2',
                  borderWidth: 1,
                  borderColor: isDarkMode ? '#7f1d1d' : '#fecaca'
                }}>
                  <Text style={{ color: '#ef4444', fontSize: 14, textAlign: 'center' }}>{errorMessage}</Text>
                </View>
              )}

              <View style={{ marginBottom: 16 }}>
                <Text style={{
                  fontWeight: 'bold',
                  marginBottom: 8,
                  color: isDarkMode ? '#ffffff' : '#111827'
                }}>Payment Amount</Text>
                <TextInput
                  value={paymentAmount.toString()}
                  onChangeText={(text) => setPaymentAmount(parseFloat(text) || 0)}
                  keyboardType="numeric"
                  style={{
                    width: '100%',
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderRadius: 4,
                    fontSize: 18,
                    fontWeight: 'bold',
                    backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                    borderWidth: 1,
                    borderColor: isDarkMode ? '#374151' : '#d1d5db',
                    color: isDarkMode ? '#ffffff' : '#111827'
                  }}
                />
                <Text style={{
                  fontSize: 14,
                  textAlign: 'right',
                  marginTop: 4,
                  color: isDarkMode ? '#9ca3af' : '#4b5563'
                }}>
                  {accountBalance > 0 ? (
                    `Outstanding balance: ₱${accountBalance.toFixed(2)}`
                  ) : (
                    'Minimum: ₱1.00'
                  )}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Pressable
                  onPress={handleCloseVerifyModal}
                  disabled={isPaymentProcessing}
                  style={{
                    flex: 1,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderRadius: 4,
                    backgroundColor: isDarkMode ? '#374151' : '#e5e7eb',
                    opacity: isPaymentProcessing ? 0.5 : 1
                  }}
                >
                  <Text style={{
                    fontWeight: 'bold',
                    textAlign: 'center',
                    color: isDarkMode ? '#ffffff' : '#111827'
                  }}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleProceedToCheckout}
                  disabled={isPaymentProcessing || paymentAmount < 1}
                  style={{
                    flex: 1,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderRadius: 4,
                    backgroundColor: (isPaymentProcessing || paymentAmount < 1) 
                      ? '#6b7280' 
                      : (colorPalette?.primary || '#ea580c'),
                    opacity: (isPaymentProcessing || paymentAmount < 1) ? 0.5 : 1
                  }}
                >
                  <Text style={{
                    fontWeight: 'bold',
                    textAlign: 'center',
                    color: '#ffffff'
                  }}>
                    {isPaymentProcessing ? 'Processing...' : 'PROCEED TO CHECKOUT →'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showPendingPaymentModal && pendingPayment !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelPendingPayment}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <View style={{
            borderRadius: 8,
            maxWidth: 448,
            width: '90%',
            marginHorizontal: 16,
            backgroundColor: isDarkMode ? '#111827' : '#ffffff'
          }}>
            <View style={{
              padding: 24,
              borderBottomWidth: 1,
              borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb'
            }}>
              <Text style={{
                fontSize: 20,
                fontWeight: 'bold',
                textAlign: 'center',
                color: isDarkMode ? '#ffffff' : '#111827'
              }}>Transaction In Progress</Text>
            </View>

            <View style={{ padding: 24 }}>
              <View style={{
                padding: 16,
                borderRadius: 4,
                marginBottom: 24,
                backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6'
              }}>
                <Text style={{
                  textAlign: 'center',
                  marginBottom: 16,
                  color: isDarkMode ? '#ffffff' : '#111827'
                }}>
                  You have a pending payment (<Text style={{ fontWeight: 'bold' }}>{pendingPayment?.reference_no}</Text>).
                  {'\n'}The link is still active.
                </Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
                  <Text style={{ color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Amount:</Text>
                  <Text style={{
                    fontWeight: 'bold',
                    fontSize: 18,
                    color: colorPalette?.primary || '#ea580c'
                  }}>₱{pendingPayment?.amount.toFixed(2)}</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Pressable
                  onPress={handleCancelPendingPayment}
                  style={{
                    flex: 1,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderRadius: 4,
                    backgroundColor: isDarkMode ? '#374151' : '#e5e7eb'
                  }}
                >
                  <Text style={{
                    fontWeight: 'bold',
                    textAlign: 'center',
                    color: isDarkMode ? '#ffffff' : '#111827'
                  }}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleResumePendingPayment}
                  style={{
                    flex: 1,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderRadius: 4,
                    backgroundColor: colorPalette?.primary || '#ea580c'
                  }}
                >
                  <Text style={{
                    fontWeight: 'bold',
                    textAlign: 'center',
                    color: '#ffffff'
                  }}>Pay Now →</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showPaymentLinkModal && paymentLinkData !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelPaymentLink}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <View style={{
            borderRadius: 8,
            maxWidth: 448,
            width: '90%',
            marginHorizontal: 16,
            backgroundColor: isDarkMode ? '#111827' : '#ffffff'
          }}>
            <View style={{
              padding: 24,
              borderBottomWidth: 1,
              borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb'
            }}>
              <Text style={{
                fontSize: 20,
                fontWeight: 'bold',
                textAlign: 'center',
                color: isDarkMode ? '#ffffff' : '#111827'
              }}>Proceed to Payment Portal</Text>
            </View>

            <View style={{ padding: 24 }}>
              <View style={{
                padding: 16,
                borderRadius: 4,
                marginBottom: 24,
                backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6'
              }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Text style={{ color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Reference:</Text>
                  <Text style={{
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    color: isDarkMode ? '#ffffff' : '#111827'
                  }}>{paymentLinkData?.referenceNo}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Amount:</Text>
                  <Text style={{
                    fontWeight: 'bold',
                    fontSize: 18,
                    color: colorPalette?.primary || '#ea580c'
                  }}>₱{paymentLinkData?.amount.toFixed(2)}</Text>
                </View>
              </View>

              <Pressable
                onPress={handleOpenPaymentLink}
                style={{
                  width: '100%',
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderRadius: 4,
                  backgroundColor: colorPalette?.primary || '#ea580c'
                }}
              >
                <Text style={{
                  fontWeight: 'bold',
                  textAlign: 'center',
                  color: '#ffffff'
                }}>PROCEED</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default Invoice;
