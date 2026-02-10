import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, ActivityIndicator, Linking, useWindowDimensions, RefreshControl, Modal, PanResponder, Animated } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as LinkingExpo from 'expo-linking';
import { Download, FileText, CreditCard, Clock, Activity, CheckCircle, AlertCircle, File } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { soaService } from '../services/soaService';
import { invoiceService } from '../services/invoiceService';
import { paymentPortalLogsService } from '../services/paymentPortalLogsService';
import { transactionService } from '../services/transactionService';
import { getCustomerDetail } from '../services/customerDetailService';
import { paymentService, PendingPayment } from '../services/paymentService';
import { useCustomerDataContext } from '../contexts/CustomerDataContext';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';

interface SOARecord {
    id: number;
    statement_date?: string;
    statement_no?: string;
    print_link?: string;
    total_amount_due?: number;
}

interface InvoiceRecord {
    id: number;
    invoice_date?: string;
    invoice_balance?: number;
    print_link?: string;
}

interface PaymentRecord {
    id: string;
    date: string;
    reference: string;
    amount: number;
    source: 'Online' | 'Manual';
    status?: string;
}

interface BillsProps {
    initialTab?: 'soa' | 'invoices' | 'payments';
}

const Bills: React.FC<BillsProps> = ({ initialTab = 'soa' }) => {
    const { width } = useWindowDimensions();
    const isMobile = width < 768;
    const { customerDetail, payments: paymentRecords, soaRecords, invoiceRecords, isLoading: contextLoading, silentRefresh } = useCustomerDataContext();
    const accountNo = customerDetail?.billingAccount?.accountNo || '';
    const balance = Number(customerDetail?.billingAccount?.accountBalance || 0);
    const [activeTab, setActiveTab] = useState<'soa' | 'invoices' | 'payments'>(initialTab);
    const [displayName, setDisplayName] = useState('');
    const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
    const [showPaymentVerifyModal, setShowPaymentVerifyModal] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState(0);
    const [showPaymentLinkModal, setShowPaymentLinkModal] = useState(false);
    const [paymentLinkData, setPaymentLinkData] = useState<{ referenceNo: string; amount: number; paymentUrl: string } | null>(null);
    const [showPendingPaymentModal, setShowPendingPaymentModal] = useState(false);
    const [pendingPayment, setPendingPayment] = useState<PendingPayment | null>(null);
    const [errorMessage, setErrorMessage] = useState('');
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    const pan = React.useRef(new Animated.ValueXY()).current;

    // Reset pan position when modals open
    useEffect(() => {
        if (showPaymentVerifyModal || showPaymentLinkModal || showPendingPaymentModal || showSuccessModal) {
            pan.setValue({ x: 0, y: 0 });
        }
    }, [showPaymentVerifyModal, showPaymentLinkModal, showPendingPaymentModal, showSuccessModal]);

    const panResponder = React.useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 0,
            onPanResponderMove: Animated.event([null, { dy: pan.y }], { useNativeDriver: false }),
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > 150) {
                    if (showPaymentVerifyModal) handleCloseVerifyModal();
                    else if (showPaymentLinkModal) handleCancelPaymentLink();
                    else if (showPendingPaymentModal) handleCancelPendingPayment();
                    else if (showSuccessModal) setShowSuccessModal(false);
                } else {
                    Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
                }
            }
        })
    ).current;

    useEffect(() => {
        const loadUser = async () => {
            const storedUser = await AsyncStorage.getItem('authData');
            if (storedUser) {
                const parsedUser = JSON.parse(storedUser);
                setDisplayName(parsedUser.full_name || 'Customer');
            }
        };
        loadUser();
        silentRefresh();
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
        if (initialTab) {
            setActiveTab(initialTab);
        }
    }, [initialTab]);

    const handlePayNow = async () => {
        setErrorMessage('');
        setIsPaymentProcessing(true);
        try {
            const pending = await paymentService.checkPendingPayment(accountNo);
            if (pending && pending.payment_url) {
                setPendingPayment(pending);
                setShowPendingPaymentModal(true);
            } else {
                setPaymentAmount(balance);
                setShowPaymentVerifyModal(true);
            }
        } catch (error: any) {
            console.error('Error checking pending payment:', error);
            setPaymentAmount(balance);
            setShowPaymentVerifyModal(true);
        } finally {
            setIsPaymentProcessing(false);
        }
    };

    const handleCloseVerifyModal = () => {
        setShowPaymentVerifyModal(false);
        setPaymentAmount(balance);
    };

    const handleProceedToCheckout = async () => {
        if (paymentAmount < 1) {
            setErrorMessage('Payment amount must be at least ₱1.00');
            return;
        }
        if (isPaymentProcessing) return;
        setIsPaymentProcessing(true);
        setErrorMessage('');
        try {
            const redirectUrl = LinkingExpo.createURL('payment-success');
            const response = await paymentService.createPayment(accountNo, paymentAmount, redirectUrl);
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
            setErrorMessage(error.message || 'Failed to create payment.');
        } finally {
            setIsPaymentProcessing(false);
        }
    };

    const handleOpenPaymentLink = async () => {
        const url = paymentLinkData?.paymentUrl || pendingPayment?.payment_url;
        if (url) {
            try {
                const redirectUrl = LinkingExpo.createURL('payment-success');
                const result = await WebBrowser.openAuthSessionAsync(url, redirectUrl);

                await silentRefresh();

                setShowPaymentLinkModal(false);
                setShowPendingPaymentModal(false);
                setPaymentLinkData(null);
                setPendingPayment(null);

                if (result.type === 'success' || result.type === 'dismiss') {
                    // Store payment time if needed, but for now just show success
                    setShowSuccessModal(true);
                }
            } catch (error) {
                console.error('Error opening browser:', error);
                Linking.openURL(url);
            }
        }
    };
    const handleCancelPaymentLink = () => { setShowPaymentLinkModal(false); setPaymentLinkData(null); };
    const handleResumePendingPayment = handleOpenPaymentLink;
    const handleCancelPendingPayment = () => { setShowPendingPaymentModal(false); setPendingPayment(null); };

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        try {
            await silentRefresh();
        } catch (error) {
            console.error('Refresh failed:', error);
        } finally {
            setRefreshing(false);
        }
    }, [silentRefresh]);

    if (contextLoading && !customerDetail) return (
        <View style={{ padding: 32, flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb', minHeight: '100%' }}>
            <ActivityIndicator size="large" color="#111827" />
        </View>
    );

    const handleDownloadPDF = (url?: string) => {
        if (url) Linking.openURL(url);
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    };

    const formatCurrency = (amount: number) => {
        const isNegative = (amount || 0) < 0;
        const formatted = Math.abs(amount || 0).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
        return `₱${isNegative ? '-' : ''}${formatted}`;
    };


    return (
        <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingTop: 60, paddingBottom: 100 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[colorPalette?.primary || '#ef4444']}
                        tintColor={colorPalette?.primary || '#ef4444'}
                        progressViewOffset={80}
                    />
                }
            >


                <View style={{
                    paddingHorizontal: isMobile ? 16 : 24,
                }}>
                    <View style={{ flexDirection: 'row', width: '100%', justifyContent: 'center', gap: 4 }}>
                        <Pressable
                            onPress={() => setActiveTab('soa')}
                            style={{
                                flex: 1,
                                paddingTop: 14,
                                paddingBottom: 14,
                                paddingHorizontal: 4,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8,
                                backgroundColor: activeTab === 'soa' ? '#ffffff' : 'transparent',
                                borderTopLeftRadius: 12,
                                borderTopRightRadius: 12,
                                shadowColor: activeTab === 'soa' ? '#000' : 'transparent',
                                shadowOffset: { width: 0, height: -2 },
                                shadowOpacity: activeTab === 'soa' ? 0.08 : 0,
                                shadowRadius: 4,
                                elevation: activeTab === 'soa' ? 4 : 0,
                                position: 'relative'
                            }}
                        >
                            <FileText width={16} height={16} color={activeTab === 'soa' ? (colorPalette?.primary || '#ef4444') : '#9ca3af'} />
                            <Text style={{ fontSize: 13, fontWeight: 'bold', color: activeTab === 'soa' ? '#111827' : '#9ca3af' }}>SOA</Text>
                            {activeTab === 'soa' && (
                                <View style={{
                                    position: 'absolute',
                                    bottom: 0,
                                    width: '70%',
                                    height: 3,
                                    backgroundColor: colorPalette?.primary || '#ef4444',
                                    borderRadius: 3
                                }} />
                            )}
                        </Pressable>
                        <Pressable
                            onPress={() => setActiveTab('invoices')}
                            style={{
                                flex: 1,
                                paddingTop: 14,
                                paddingBottom: 14,
                                paddingHorizontal: 4,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8,
                                backgroundColor: activeTab === 'invoices' ? '#ffffff' : 'transparent',
                                borderTopLeftRadius: 12,
                                borderTopRightRadius: 12,
                                shadowColor: activeTab === 'invoices' ? '#000' : 'transparent',
                                shadowOffset: { width: 0, height: -2 },
                                shadowOpacity: activeTab === 'invoices' ? 0.08 : 0,
                                shadowRadius: 4,
                                elevation: activeTab === 'invoices' ? 4 : 0,
                                position: 'relative'
                            }}
                        >
                            <File width={16} height={16} color={activeTab === 'invoices' ? (colorPalette?.primary || '#ef4444') : '#9ca3af'} />
                            <Text style={{ fontSize: 13, fontWeight: 'bold', color: activeTab === 'invoices' ? '#111827' : '#9ca3af' }}>Invoices</Text>
                            {activeTab === 'invoices' && (
                                <View style={{
                                    position: 'absolute',
                                    bottom: 0,
                                    width: '70%',
                                    height: 3,
                                    backgroundColor: colorPalette?.primary || '#ef4444',
                                    borderRadius: 3
                                }} />
                            )}
                        </Pressable>
                        <Pressable
                            onPress={() => setActiveTab('payments')}
                            style={{
                                flex: 1,
                                paddingTop: 14,
                                paddingBottom: 14,
                                paddingHorizontal: 4,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8,
                                backgroundColor: activeTab === 'payments' ? '#ffffff' : 'transparent',
                                borderTopLeftRadius: 12,
                                borderTopRightRadius: 12,
                                shadowColor: activeTab === 'payments' ? '#000' : 'transparent',
                                shadowOffset: { width: 0, height: -2 },
                                shadowOpacity: activeTab === 'payments' ? 0.08 : 0,
                                shadowRadius: 4,
                                elevation: activeTab === 'payments' ? 4 : 0,
                                position: 'relative'
                            }}
                        >
                            <Clock width={16} height={16} color={activeTab === 'payments' ? (colorPalette?.primary || '#ef4444') : '#9ca3af'} />
                            <Text style={{ fontSize: 13, fontWeight: 'bold', color: activeTab === 'payments' ? '#111827' : '#9ca3af' }}>History</Text>
                            {activeTab === 'payments' && (
                                <View style={{
                                    position: 'absolute',
                                    bottom: 0,
                                    width: '70%',
                                    height: 3,
                                    backgroundColor: colorPalette?.primary || '#ef4444',
                                    borderRadius: 3
                                }} />
                            )}
                        </Pressable>
                    </View>
                </View>

                <View style={{
                    minHeight: 700,
                    paddingHorizontal: isMobile ? 16 : 24,
                    paddingTop: 16,
                    backgroundColor: '#ffffff',
                    borderBottomLeftRadius: 16,
                    borderBottomRightRadius: 16,
                }}>
                    {activeTab === 'soa' && (
                        <View style={{ gap: 16 }}>
                            {soaRecords.length === 0 ? (
                                <View style={{ padding: 48, alignItems: 'center' }}>
                                    <FileText size={48} color="#d1d5db" />
                                    <Text style={{ color: '#6b7280', marginTop: 16, fontSize: 16 }}>No statements found.</Text>
                                </View>
                            ) : (
                                soaRecords.map((record) => (
                                    <View key={record.id} style={{
                                        padding: 16,
                                        borderRadius: 16,
                                        backgroundColor: '#ffffff',
                                        gap: 12
                                    }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <View>
                                                <Text style={{ fontSize: 12, color: '#6b7280', fontWeight: '600', textTransform: 'uppercase' }}>Statement Date</Text>
                                                <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827', marginTop: 2 }}>{formatDate(record.statement_date)}</Text>
                                            </View>
                                            <View style={{ alignItems: 'flex-end' }}>
                                                <Text style={{ fontSize: 12, color: '#6b7280', fontWeight: '600', textTransform: 'uppercase' }}>Ref No.</Text>
                                                <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827', marginTop: 2 }}>#{record.id}</Text>
                                            </View>
                                        </View>
                                        <View style={{ height: 1, backgroundColor: '#f1f5f9' }} />
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <View>
                                                <Text style={{ fontSize: 12, color: '#6b7280', fontWeight: '600', textTransform: 'uppercase' }}>Amount Due</Text>
                                                <Text style={{ fontSize: 18, fontWeight: 'bold', color: colorPalette?.primary || '#ef4444', marginTop: 2 }}>{formatCurrency(record.total_amount_due || 0)}</Text>
                                            </View>
                                            <Pressable
                                                onPress={() => handleDownloadPDF(record.print_link)}
                                                disabled={!record.print_link}
                                                style={{
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    gap: 6,
                                                    paddingHorizontal: 12,
                                                    paddingVertical: 8,
                                                    backgroundColor: record.print_link ? (colorPalette?.primary || '#ef4444') + '15' : '#f9fafb',
                                                    borderRadius: 12,
                                                    borderWidth: 1,
                                                    borderColor: record.print_link ? (colorPalette?.primary || '#ef4444') + '30' : '#f1f5f9',
                                                    opacity: record.print_link ? 1 : 0.5
                                                }}
                                            >
                                                <Download width={14} height={14} color={record.print_link ? (colorPalette?.primary || '#ef4444') : '#9ca3af'} />
                                                <Text style={{ fontSize: 13, fontWeight: 'bold', color: record.print_link ? (colorPalette?.primary || '#ef4444') : '#9ca3af' }}>PDF</Text>
                                            </Pressable>
                                        </View>
                                    </View>
                                ))
                            )}
                        </View>
                    )}

                    {activeTab === 'invoices' && (
                        <View style={{ gap: 16 }}>
                            {invoiceRecords.length === 0 ? (
                                <View style={{ padding: 48, alignItems: 'center' }}>
                                    <File size={48} color="#d1d5db" />
                                    <Text style={{ color: '#6b7280', marginTop: 16, fontSize: 16 }}>No invoices found.</Text>
                                </View>
                            ) : (
                                invoiceRecords.map((record) => (
                                    <View key={record.id} style={{
                                        padding: 16,
                                        borderRadius: 16,
                                        backgroundColor: '#ffffff',
                                        gap: 12
                                    }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <View>
                                                <Text style={{ fontSize: 12, color: '#6b7280', fontWeight: '600', textTransform: 'uppercase' }}>Invoice Date</Text>
                                                <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827', marginTop: 2 }}>{formatDate(record.invoice_date)}</Text>
                                            </View>
                                            <View style={{ alignItems: 'flex-end' }}>
                                                <Text style={{ fontSize: 12, color: '#6b7280', fontWeight: '600', textTransform: 'uppercase' }}>Ref No.</Text>
                                                <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827', marginTop: 2 }}>#{record.id}</Text>
                                            </View>
                                        </View>
                                        <View style={{ height: 1, backgroundColor: '#f1f5f9' }} />
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <View>
                                                <Text style={{ fontSize: 12, color: '#6b7280', fontWeight: '600', textTransform: 'uppercase' }}>Balance</Text>
                                                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#111827', marginTop: 2 }}>{formatCurrency(record.invoice_balance || 0)}</Text>
                                            </View>
                                            <Pressable
                                                onPress={() => handleDownloadPDF(record.print_link)}
                                                disabled={!record.print_link}
                                                style={{
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    gap: 6,
                                                    paddingHorizontal: 12,
                                                    paddingVertical: 8,
                                                    backgroundColor: record.print_link ? (colorPalette?.primary || '#ef4444') + '15' : '#f9fafb',
                                                    borderRadius: 12,
                                                    borderWidth: 1,
                                                    borderColor: record.print_link ? (colorPalette?.primary || '#ef4444') + '30' : '#f1f5f9',
                                                    opacity: record.print_link ? 1 : 0.5
                                                }}
                                            >
                                                <Download width={14} height={14} color={record.print_link ? (colorPalette?.primary || '#ef4444') : '#9ca3af'} />
                                                <Text style={{ fontSize: 13, fontWeight: 'bold', color: record.print_link ? (colorPalette?.primary || '#ef4444') : '#9ca3af' }}>PDF</Text>
                                            </Pressable>
                                        </View>
                                    </View>
                                ))
                            )}
                        </View>
                    )}

                    {activeTab === 'payments' && (
                        <View style={{ gap: 16 }}>
                            {paymentRecords.length === 0 ? (
                                <View style={{ padding: 48, alignItems: 'center' }}>
                                    <Clock size={48} color="#d1d5db" />
                                    <Text style={{ color: '#6b7280', marginTop: 16, fontSize: 16 }}>No payment history found.</Text>
                                </View>
                            ) : (
                                paymentRecords.map((record) => (
                                    <View key={record.id} style={{
                                        padding: 16,
                                        borderRadius: 16,
                                        backgroundColor: '#ffffff',
                                        gap: 12
                                    }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <View>
                                                <Text style={{ fontSize: 12, color: '#6b7280', fontWeight: '600', textTransform: 'uppercase' }}>Date</Text>
                                                <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827', marginTop: 2 }}>{formatDate(record.date)}</Text>
                                            </View>
                                            <View style={{
                                                borderRadius: 20
                                            }}>
                                                <Text style={{ fontSize: 11, fontWeight: 'bold', color: (record.status === 'Completed' || record.status === 'PAID') ? '#15803d' : '#374151' }}>
                                                    {(record.status || 'Posted').toUpperCase()}
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={{ height: 1, backgroundColor: '#f1f5f9' }} />
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <View style={{ flex: 1, marginRight: 16 }}>
                                                <Text style={{ fontSize: 12, color: '#6b7280', fontWeight: '600', textTransform: 'uppercase' }}>Ref: {record.source}</Text>
                                                <Text numberOfLines={1} ellipsizeMode="tail" style={{ fontSize: 13, fontFamily: 'monospace', color: '#64748b', marginTop: 2 }}>{record.reference}</Text>
                                            </View>
                                            <View style={{ alignItems: 'flex-end' }}>
                                                <Text style={{ fontSize: 12, color: '#6b7280', fontWeight: '600', textTransform: 'uppercase' }}>Amount</Text>
                                                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#16a34a', marginTop: 2 }}>+{formatCurrency(record.amount)}</Text>
                                            </View>
                                        </View>
                                    </View>
                                ))
                            )}
                        </View>
                    )}
                </View>
            </ScrollView>

            <Modal
                visible={showPaymentVerifyModal}
                transparent={true}
                animationType="slide"
                statusBarTranslucent={true}
                onRequestClose={handleCloseVerifyModal}
            >
                <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
                    <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onPress={handleCloseVerifyModal} />
                    <Animated.View
                        {...panResponder.panHandlers}
                        style={{
                            transform: [{ translateY: pan.y }],
                            backgroundColor: '#ffffff',
                            borderTopLeftRadius: 30,
                            borderTopRightRadius: 30,
                            width: '100%',
                            maxHeight: '90%',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: -15 },
                            shadowOpacity: 0.3,
                            shadowRadius: 15,
                            elevation: 20
                        }}
                    >
                        <View style={{ paddingHorizontal: 24, paddingVertical: 12, alignItems: 'center' }}>
                            <View style={{ width: 40, height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, marginBottom: 12 }} />
                            <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>Confirm Payment</Text>
                        </View>
                        <ScrollView contentContainerStyle={{ padding: 24 }}>
                            <View style={{ backgroundColor: '#f9fafb', padding: 20, borderRadius: 16, marginBottom: 24, borderWidth: 1, borderColor: '#f3f4f6' }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                                    <Text style={{ color: '#6b7280', fontSize: 14 }}>Account Name</Text>
                                    <Text style={{ fontWeight: '600', color: '#111827', fontSize: 14 }}>{displayName}</Text>
                                </View>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <Text style={{ color: '#6b7280', fontSize: 14 }}>Account Balance</Text>
                                    <Text style={{ fontWeight: 'bold', color: balance > 0 ? (colorPalette?.primary || '#ef4444') : '#16a34a', fontSize: 14 }}>
                                        {formatCurrency(balance)}
                                    </Text>
                                </View>
                            </View>

                            {errorMessage && (
                                <View style={{ backgroundColor: '#fef2f2', padding: 12, borderRadius: 12, marginBottom: 24, borderWidth: 1, borderColor: '#fee2e2' }}>
                                    <Text style={{ color: '#ef4444', fontSize: 14, textAlign: 'center' }}>{errorMessage}</Text>
                                </View>
                            )}

                            <View style={{ marginBottom: 32 }}>
                                <Text style={{ fontWeight: '600', marginBottom: 10, color: '#374151', fontSize: 15 }}>Payment Amount</Text>
                                <TextInput
                                    keyboardType="decimal-pad"
                                    value={paymentAmount.toString()}
                                    onChangeText={(val) => setPaymentAmount(parseFloat(val) || 0)}
                                    placeholder="0.00"
                                    style={{ width: '100%', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, fontSize: 16, borderWidth: 1, borderColor: '#d1d5db', color: '#111827', backgroundColor: '#ffffff' }}
                                />
                            </View>

                            <Pressable
                                onPress={handleProceedToCheckout}
                                disabled={isPaymentProcessing || paymentAmount < 1}
                                style={{
                                    paddingVertical: 16,
                                    borderRadius: 16,
                                    backgroundColor: colorPalette?.primary || '#ef4444',
                                    opacity: (isPaymentProcessing || paymentAmount < 1) ? 0.6 : 1,
                                    alignItems: 'center',
                                    shadowColor: colorPalette?.primary || '#ef4444',
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.3,
                                    shadowRadius: 8,
                                    elevation: 5
                                }}
                            >
                                <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 16 }}>
                                    {isPaymentProcessing ? 'Processing...' : 'Proceed to Payment'}
                                </Text>
                            </Pressable>
                            <View style={{ height: 40 }} />
                        </ScrollView>
                    </Animated.View>
                </View>
            </Modal>

            {/* Payment Link Modal */}
            <Modal
                visible={showPaymentLinkModal && !!paymentLinkData}
                transparent={true}
                animationType="slide"
                statusBarTranslucent={true}
                onRequestClose={handleCancelPaymentLink}
            >
                <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
                    <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onPress={handleCancelPaymentLink} />
                    <Animated.View
                        {...panResponder.panHandlers}
                        style={{
                            transform: [{ translateY: pan.y }],
                            backgroundColor: '#ffffff',
                            borderTopLeftRadius: 30,
                            borderTopRightRadius: 30,
                            width: '100%',
                            maxHeight: '90%',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: -15 },
                            shadowOpacity: 0.3,
                            shadowRadius: 15,
                            elevation: 20
                        }}
                    >
                        <View style={{ paddingHorizontal: 24, paddingVertical: 12, alignItems: 'center' }}>
                            <View style={{ width: 40, height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, marginBottom: 12 }} />
                            <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>Payment Link Created!</Text>
                        </View>
                        <ScrollView contentContainerStyle={{ padding: 24 }}>
                            <View style={{ backgroundColor: '#f0fdf4', padding: 20, borderRadius: 16, marginBottom: 24, alignItems: 'center' }}>
                                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                                    <CheckCircle size={32} color="#16a34a" />
                                </View>
                                <Text style={{ color: '#166534', fontWeight: '700', fontSize: 16, marginBottom: 4 }}>Ready to Pay</Text>
                                <Text style={{ color: '#166534', opacity: 0.8, fontSize: 14 }}>{paymentLinkData?.referenceNo}</Text>
                            </View>

                            <View style={{ marginBottom: 32 }}>
                                <Text style={{ textAlign: 'center', color: '#4b5563', fontSize: 15, lineHeight: 22 }}>
                                    Your payment link for <Text style={{ fontWeight: '700', color: '#111827' }}>{formatCurrency(paymentLinkData?.amount || 0)}</Text> is ready. Click below to open the payment portal.
                                </Text>
                            </View>

                            <Pressable
                                onPress={handleOpenPaymentLink}
                                style={{
                                    paddingVertical: 16,
                                    borderRadius: 16,
                                    backgroundColor: '#16a34a',
                                    alignItems: 'center',
                                    marginBottom: 16
                                }}
                            >
                                <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 16 }}>Open Payment Portal</Text>
                            </Pressable>

                            <Pressable onPress={handleCancelPaymentLink}>
                                <Text style={{ color: '#6b7280', fontSize: 15, textAlign: 'center', fontWeight: '500' }}>Maybe Later</Text>
                            </Pressable>
                            <View style={{ height: 40 }} />
                        </ScrollView>
                    </Animated.View>
                </View>
            </Modal>

            {/* Pending Payment Modal */}
            <Modal
                visible={showPendingPaymentModal && !!pendingPayment}
                transparent={true}
                animationType="slide"
                statusBarTranslucent={true}
                onRequestClose={handleCancelPendingPayment}
            >
                <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
                    <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onPress={handleCancelPendingPayment} />
                    <Animated.View
                        {...panResponder.panHandlers}
                        style={{
                            transform: [{ translateY: pan.y }],
                            backgroundColor: '#ffffff',
                            borderTopLeftRadius: 30,
                            borderTopRightRadius: 30,
                            width: '100%',
                            maxHeight: '90%',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: -15 },
                            shadowOpacity: 0.3,
                            shadowRadius: 15,
                            elevation: 20
                        }}
                    >
                        <View style={{ paddingHorizontal: 24, paddingVertical: 12, alignItems: 'center' }}>
                            <View style={{ width: 40, height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, marginBottom: 12 }} />
                            <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>Pending Payment Found</Text>
                        </View>
                        <ScrollView contentContainerStyle={{ padding: 24 }}>
                            <View style={{ backgroundColor: '#fffbeb', padding: 20, borderRadius: 16, marginBottom: 24, borderLeftWidth: 4, borderLeftColor: '#f59e0b' }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <Text style={{ color: '#92400e', fontSize: 14 }}>Amount</Text>
                                    <Text style={{ fontWeight: 'bold', color: '#92400e', fontSize: 16 }}>
                                        {formatCurrency(pendingPayment?.amount || 0)}
                                    </Text>
                                </View>
                            </View>

                            <Text style={{ color: '#4b5563', marginBottom: 32, textAlign: 'center', fontSize: 15, lineHeight: 22 }}>
                                You have an active payment session. Would you like to resume it now?
                            </Text>

                            <View style={{ gap: 12 }}>
                                <Pressable
                                    onPress={handleResumePendingPayment}
                                    style={{ paddingVertical: 16, borderRadius: 16, backgroundColor: colorPalette?.primary || '#0f172a', alignItems: 'center' }}
                                >
                                    <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 16 }}>Resume Payment</Text>
                                </Pressable>
                                <Pressable
                                    onPress={handleCancelPendingPayment}
                                    style={{ paddingVertical: 16, borderRadius: 16, backgroundColor: '#f3f4f6', alignItems: 'center' }}
                                >
                                    <Text style={{ color: '#4b5563', fontWeight: 'bold', fontSize: 16 }}>Cancel</Text>
                                </Pressable>
                            </View>
                            <View style={{ height: 40 }} />
                        </ScrollView>
                    </Animated.View>
                </View>
            </Modal>

            {/* Success Modal */}
            <Modal
                visible={showSuccessModal}
                transparent={true}
                animationType="slide"
                statusBarTranslucent={true}
                onRequestClose={() => setShowSuccessModal(false)}
            >
                <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
                    <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onPress={() => setShowSuccessModal(false)} />
                    <Animated.View
                        {...panResponder.panHandlers}
                        style={{
                            transform: [{ translateY: pan.y }],
                            backgroundColor: '#ffffff',
                            borderTopLeftRadius: 30,
                            borderTopRightRadius: 30,
                            width: '100%',
                            maxHeight: '90%',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: -15 },
                            shadowOpacity: 0.3,
                            shadowRadius: 15,
                            elevation: 20
                        }}
                    >
                        <View style={{ paddingHorizontal: 24, paddingVertical: 12, alignItems: 'center' }}>
                            <View style={{ width: 40, height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, marginBottom: 12 }} />
                            <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>Payment Successful!</Text>
                        </View>
                        <ScrollView contentContainerStyle={{ padding: 24, alignItems: 'center' }}>
                            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                                <CheckCircle size={48} color="#16a34a" />
                            </View>
                            <Text style={{ fontSize: 16, color: '#4b5563', textAlign: 'center', marginBottom: 32, lineHeight: 22 }}>
                                Thank you! Your payment has been processed successfully. Your balance will be updated shortly.
                            </Text>
                            <Pressable
                                onPress={() => setShowSuccessModal(false)}
                                style={{ backgroundColor: colorPalette?.primary || '#ef4444', paddingVertical: 16, borderRadius: 16, width: '100%', alignItems: 'center' }}
                            >
                                <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 16 }}>Great!</Text>
                            </Pressable>
                            <View style={{ height: 40 }} />
                        </ScrollView>
                    </Animated.View>
                </View>
            </Modal>

        </View>
    );
};

export default Bills;
