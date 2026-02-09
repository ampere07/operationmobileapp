import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, ActivityIndicator, Linking, useWindowDimensions, RefreshControl } from 'react-native';
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
                setPaymentAmount(balance > 0 ? balance : 100);
                setShowPaymentVerifyModal(true);
            }
        } catch (error: any) {
            console.error('Error checking pending payment:', error);
            setPaymentAmount(balance > 0 ? balance : 100);
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
            setErrorMessage(error.message || 'Failed to create payment.');
        } finally {
            setIsPaymentProcessing(false);
        }
    };

    const handleOpenPaymentLink = () => {
        if (paymentLinkData?.paymentUrl) {
            Linking.openURL(paymentLinkData.paymentUrl);
            setShowPaymentLinkModal(false);
            setPaymentLinkData(null);
        }
    };
    const handleCancelPaymentLink = () => { setShowPaymentLinkModal(false); setPaymentLinkData(null); };
    const handleResumePendingPayment = () => {
        if (pendingPayment?.payment_url) {
            Linking.openURL(pendingPayment.payment_url);
            setShowPendingPaymentModal(false);
            setPendingPayment(null);
        }
    };
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

    const handleDownloadPDF = (url?: string) => {
        if (url) Linking.openURL(url);
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const formatCurrency = (amount?: number) => {
        return `₱ ${(amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
    };

    const balance = customerDetail?.billingAccount?.accountBalance || 0;
    const accountNo = customerDetail?.billingAccount?.accountNo || '';

    if (contextLoading && !customerDetail) return (
        <View style={{ padding: 32, flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb', minHeight: '100%' }}>
            <ActivityIndicator size="large" color="#111827" />
        </View>
    );
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
                                                <Text style={{ fontSize: 18, fontWeight: 'bold', color: colorPalette?.primary || '#ef4444', marginTop: 2 }}>{formatCurrency(record.total_amount_due)}</Text>
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
                                                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#111827', marginTop: 2 }}>{formatCurrency(record.invoice_balance)}</Text>
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

            {showPaymentVerifyModal && (
                <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
                    <View style={{ backgroundColor: '#ffffff', borderRadius: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.25, shadowRadius: 24, maxWidth: 448, width: '100%' }}>
                        <View style={{ padding: 24, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
                            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#111827', textAlign: 'center' }}>Confirm Payment</Text>
                        </View>
                        <View style={{ padding: 24 }}>
                            <View style={{ backgroundColor: '#f3f4f6', padding: 16, borderRadius: 4, marginBottom: 16 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <Text style={{ color: '#374151' }}>Account:</Text>
                                    <Text style={{ fontWeight: 'bold', color: '#374151' }}>{displayName}</Text>
                                </View>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <Text style={{ color: '#374151' }}>Currency Balance:</Text>
                                    <Text style={{ fontWeight: 'bold', color: balance > 0 ? (colorPalette?.primary || '#ef4444') : '#16a34a' }}>
                                        {formatCurrency(balance)}
                                    </Text>
                                </View>
                            </View>

                            {errorMessage && (
                                <View style={{ backgroundColor: (colorPalette?.primary || '#ef4444') + '15', padding: 12, borderRadius: 4, marginBottom: 16, borderWidth: 1, borderColor: (colorPalette?.primary || '#ef4444') + '30' }}>
                                    <Text style={{ color: colorPalette?.primary || '#ef4444', fontSize: 14, textAlign: 'center' }}>{errorMessage}</Text>
                                </View>
                            )}

                            <View style={{ marginBottom: 16 }}>
                                <Text style={{ fontWeight: 'bold', marginBottom: 8, color: '#374151' }}>Payment Amount</Text>
                                <TextInput
                                    keyboardType="decimal-pad"
                                    value={paymentAmount ? paymentAmount.toString() : ''}
                                    onChangeText={(value) => {
                                        if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                            setPaymentAmount(value === '' ? 0 : parseFloat(value) || 0);
                                        }
                                    }}
                                    placeholder="0.00"
                                    style={{ width: '100%', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 4, fontSize: 18, fontWeight: 'bold', borderWidth: 1, borderColor: '#d1d5db', color: '#111827' }}
                                />
                                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 }}>
                                    <Text style={{ fontSize: 14, color: '#6b7280' }}>
                                        {balance > 0 ? (
                                            `Outstanding: ${formatCurrency(balance)}`
                                        ) : (
                                            'Minimum: ₱1.00'
                                        )}
                                    </Text>
                                </View>
                            </View>

                            <View style={{ flexDirection: 'row', gap: 12 }}>
                                <Pressable
                                    onPress={handleCloseVerifyModal}
                                    disabled={isPaymentProcessing}
                                    style={{ flex: 1, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 4, backgroundColor: '#e5e7eb', opacity: isPaymentProcessing ? 0.5 : 1 }}
                                >
                                    <Text style={{ color: '#111827', fontWeight: 'bold', textAlign: 'center' }}>Cancel</Text>
                                </Pressable>
                                <Pressable
                                    onPress={handleProceedToCheckout}
                                    disabled={isPaymentProcessing || paymentAmount < 1}
                                    style={{ flex: 1, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 4, backgroundColor: colorPalette?.primary || '#0f172a', opacity: (isPaymentProcessing || paymentAmount < 1) ? 0.5 : 1 }}
                                >
                                    <Text style={{ color: '#ffffff', fontWeight: 'bold', textAlign: 'center' }}>
                                        {isPaymentProcessing ? 'Processing...' : 'Proceed to Pay'}
                                    </Text>
                                </Pressable>
                            </View>
                        </View>
                    </View>
                </View>
            )}

            {showPaymentLinkModal && paymentLinkData && (
                <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
                    <View style={{ backgroundColor: '#ffffff', borderRadius: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.25, shadowRadius: 24, maxWidth: 448, width: '100%', alignItems: 'center' }}>
                        <View style={{ padding: 24, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
                            <View style={{ marginHorizontal: 'auto', alignItems: 'center', justifyContent: 'center', height: 48, width: 48, borderRadius: 24, backgroundColor: '#dcfce7', marginBottom: 16 }}>
                                <CheckCircle width={24} height={24} color="#16a34a" />
                            </View>
                            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#111827' }}>Payment Link Created!</Text>
                            <Text style={{ color: '#6b7280', marginTop: 8 }}>Reference: {paymentLinkData.referenceNo}</Text>
                        </View>
                        <View style={{ padding: 24 }}>
                            <Text style={{ color: '#4b5563', marginBottom: 24 }}>
                                Please click the button below to complete your payment of
                                <Text style={{ fontWeight: 'bold', color: '#111827' }}> {formatCurrency(paymentLinkData.amount)}</Text>
                            </Text>
                            <Pressable
                                onPress={handleOpenPaymentLink}
                                style={{ width: '100%', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 4, backgroundColor: '#16a34a', marginBottom: 12 }}
                            >
                                <Text style={{ color: '#ffffff', fontWeight: 'bold', textAlign: 'center' }}>Open Payment Portal</Text>
                            </Pressable>
                            <Pressable onPress={handleCancelPaymentLink}>
                                <Text style={{ color: '#6b7280', textDecorationLine: 'underline', fontSize: 14, textAlign: 'center' }}>Close</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            )}

            {showPendingPaymentModal && pendingPayment && (
                <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
                    <View style={{ backgroundColor: '#ffffff', borderRadius: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.25, shadowRadius: 24, maxWidth: 448, width: '100%', alignItems: 'center' }}>
                        <View style={{ padding: 24, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
                            <View style={{ marginHorizontal: 'auto', alignItems: 'center', justifyContent: 'center', height: 48, width: 48, borderRadius: 24, backgroundColor: '#fef3c7', marginBottom: 16 }}>
                                <Activity width={24} height={24} color="#ca8a04" />
                            </View>
                            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#111827' }}>Pending Payment Found</Text>
                        </View>
                        <View style={{ padding: 24 }}>
                            <Text style={{ color: '#4b5563', marginBottom: 24 }}>
                                You have a pending payment of
                                <Text style={{ fontWeight: 'bold', color: '#111827' }}> {formatCurrency(pendingPayment.amount)}</Text>.
                                Would you like to complete it?
                            </Text>
                            <View style={{ flexDirection: 'row', gap: 12 }}>
                                <Pressable
                                    onPress={handleCancelPendingPayment}
                                    style={{ flex: 1, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 4, backgroundColor: '#e5e7eb' }}
                                >
                                    <Text style={{ color: '#111827', fontWeight: 'bold', textAlign: 'center' }}>Cancel</Text>
                                </Pressable>
                                <Pressable
                                    onPress={handleResumePendingPayment}
                                    style={{ flex: 1, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 4, backgroundColor: colorPalette?.primary || '#0f172a' }}
                                >
                                    <Text style={{ color: '#ffffff', fontWeight: 'bold', textAlign: 'center' }}>Resume Payment</Text>
                                </Pressable>
                            </View>
                        </View>
                    </View>
                </View>
            )}

        </View>
    );
};

export default Bills;
