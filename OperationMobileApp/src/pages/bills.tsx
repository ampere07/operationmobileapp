import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, Modal, ActivityIndicator, Linking } from 'react-native';
import { Download, FileText, CreditCard, Clock, Activity, CheckCircle, AlertCircle, File } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { soaService } from '../services/soaService';
import { invoiceService } from '../services/invoiceService';
import { paymentPortalLogsService } from '../services/paymentPortalLogsService';
import { transactionService } from '../services/transactionService';
import { getCustomerDetail } from '../services/customerDetailService';
import { paymentService, PendingPayment } from '../services/paymentService';
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
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'soa' | 'invoices' | 'payments'>(initialTab);
    const [soaRecords, setSoaRecords] = useState<SOARecord[]>([]);
    const [invoiceRecords, setInvoiceRecords] = useState<InvoiceRecord[]>([]);
    const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>([]);
    const [balance, setBalance] = useState(0);
    const [accountNo, setAccountNo] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);

    const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
    const [showPaymentVerifyModal, setShowPaymentVerifyModal] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState(0);
    const [showPaymentLinkModal, setShowPaymentLinkModal] = useState(false);
    const [paymentLinkData, setPaymentLinkData] = useState<{ referenceNo: string; amount: number; paymentUrl: string } | null>(null);
    const [showPendingPaymentModal, setShowPendingPaymentModal] = useState(false);
    const [pendingPayment, setPendingPayment] = useState<PendingPayment | null>(null);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const storedUser = await AsyncStorage.getItem('authData');
                if (storedUser) {
                    const parsedUser = JSON.parse(storedUser);
                    setDisplayName(parsedUser.full_name || 'Customer');

                    if (parsedUser.username) {
                        const detail = await getCustomerDetail(parsedUser.username);

                        if (detail && detail.billingAccount) {
                            setAccountNo(detail.billingAccount.accountNo);
                            setBalance(detail.billingAccount.accountBalance);

                            const billingId = detail.billingAccount.id;
                            const accNo = detail.billingAccount.accountNo;

                            const [soaRes, invoiceRes, logsRes, txRes] = await Promise.all([
                                soaService.getStatementsByAccount(billingId).catch(e => []),
                                invoiceService.getInvoicesByAccount(billingId).catch(e => []),
                                paymentPortalLogsService.getLogsByAccountNo(accNo).catch(e => []),
                                transactionService.getAllTransactions().catch(e => ({ success: false, data: [] }))
                            ]);

                            setSoaRecords(soaRes || []);

                            setInvoiceRecords(invoiceRes || []);

                            const formattedLogs: PaymentRecord[] = Array.isArray(logsRes) ? logsRes.map((l: any) => ({
                                id: `log-${l.id}`,
                                date: l.date_time,
                                reference: l.reference_no,
                                amount: parseFloat(l.total_amount),
                                source: 'Online',
                                status: l.status
                            })) : [];

                            let formattedTxs: PaymentRecord[] = [];
                            if (txRes && txRes.success && Array.isArray(txRes.data)) {
                                formattedTxs = txRes.data
                                    .filter((t: any) => t.account_no === accNo)
                                    .map((t: any) => ({
                                        id: `tx-${t.id}`,
                                        date: t.payment_date || t.created_at,
                                        reference: t.or_no || t.reference_no || `TR-${t.id}`,
                                        amount: parseFloat(t.received_payment || t.amount || 0),
                                        source: 'Manual',
                                        status: 'Computed'
                                    }));
                            }

                            const allPayments = [...formattedLogs, ...formattedTxs].sort((a, b) =>
                                new Date(b.date).getTime() - new Date(a.date).getTime()
                            );
                            setPaymentRecords(allPayments);
                        }
                    }
                }
            } catch (err) {
                console.error("Error fetching bills data:", err);
            } finally {
                setLoading(false);
            }
        };

        const fetchColorPalette = async () => {
            try {
                const activePalette = await settingsColorPaletteService.getActive();
                setColorPalette(activePalette);
            } catch (err) {
                console.error('Failed to fetch color palette:', err);
            }
        };

        fetchData();
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

    if (loading) return <View style={{ padding: 32, flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb', minHeight: '100%' }}><ActivityIndicator size="large" color="#111827" /></View>;

    return (
        <ScrollView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
            <View style={{ padding: 24 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, gap: 16, flexWrap: 'wrap' }}>
                    <View>
                        <Text style={{ fontSize: 30, fontWeight: 'bold', color: '#111827' }}>Billing History</Text>
                        <Text style={{ color: '#6b7280', marginTop: 4 }}>View your statements and payment records.</Text>
                    </View>
                    <Pressable
                        onPress={handlePayNow}
                        disabled={isPaymentProcessing}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colorPalette?.primary || '#0f172a', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 9999, opacity: isPaymentProcessing ? 0.5 : 1 }}
                    >
                        <CreditCard width={20} height={20} color="#ffffff" />
                        <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>PAY NOW</Text>
                    </Pressable>
                </View>

                <View style={{ backgroundColor: '#ffffff', borderTopLeftRadius: 16, borderTopRightRadius: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', paddingHorizontal: 24, paddingTop: 8 }}>
                    <View style={{ flexDirection: 'row', gap: 32 }}>
                        <Pressable
                            onPress={() => setActiveTab('soa')}
                            style={{ paddingBottom: 16, paddingHorizontal: 8, borderBottomWidth: 2, borderBottomColor: activeTab === 'soa' ? (colorPalette?.primary || '#0f172a') : 'transparent' }}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <FileText width={16} height={16} color={activeTab === 'soa' ? '#0f172a' : '#9ca3af'} />
                                <Text style={{ fontSize: 14, fontWeight: 'bold', color: activeTab === 'soa' ? '#0f172a' : '#9ca3af' }}>Statement of Account</Text>
                            </View>
                        </Pressable>
                        <Pressable
                            onPress={() => setActiveTab('invoices')}
                            style={{ paddingBottom: 16, paddingHorizontal: 8, borderBottomWidth: 2, borderBottomColor: activeTab === 'invoices' ? (colorPalette?.primary || '#2563eb') : 'transparent' }}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <File width={16} height={16} color={activeTab === 'invoices' ? '#2563eb' : '#9ca3af'} />
                                <Text style={{ fontSize: 14, fontWeight: 'bold', color: activeTab === 'invoices' ? '#2563eb' : '#9ca3af' }}>Invoices</Text>
                            </View>
                        </Pressable>
                        <Pressable
                            onPress={() => setActiveTab('payments')}
                            style={{ paddingBottom: 16, paddingHorizontal: 8, borderBottomWidth: 2, borderBottomColor: activeTab === 'payments' ? (colorPalette?.primary || '#2563eb') : 'transparent' }}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Clock width={16} height={16} color={activeTab === 'payments' ? '#2563eb' : '#9ca3af'} />
                                <Text style={{ fontSize: 14, fontWeight: 'bold', color: activeTab === 'payments' ? '#2563eb' : '#9ca3af' }}>Payment History</Text>
                            </View>
                        </Pressable>
                    </View>
                </View>

                <View style={{ backgroundColor: '#ffffff', borderBottomLeftRadius: 16, borderBottomRightRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, borderWidth: 1, borderColor: '#f3f4f6', borderTopWidth: 0, overflow: 'hidden', minHeight: 400 }}>
                    {activeTab === 'soa' && (
                        <View>
                            <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f3f4f6', backgroundColor: '#ffffff' }}>
                                <View style={{ flex: 1, padding: 24 }}><Text style={{ fontSize: 12, fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase' }}>Statement Date</Text></View>
                                <View style={{ flex: 1, padding: 24 }}><Text style={{ fontSize: 12, fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase' }}>Statement No</Text></View>
                                <View style={{ flex: 1, padding: 24 }}><Text style={{ fontSize: 12, fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase' }}>Amount Due</Text></View>
                                <View style={{ flex: 1, padding: 24 }}><Text style={{ fontSize: 12, fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', textAlign: 'right' }}>Action</Text></View>
                            </View>
                            {soaRecords.length === 0 ? (
                                <View style={{ padding: 32, alignItems: 'center' }}><Text style={{ color: '#6b7280' }}>No statements found.</Text></View>
                            ) : (
                                soaRecords.map((record) => (
                                    <View key={record.id} style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f9fafb' }}>
                                        <View style={{ flex: 1, padding: 24 }}><Text style={{ fontSize: 14, color: '#4b5563' }}>{formatDate(record.statement_date)}</Text></View>
                                        <View style={{ flex: 1, padding: 24 }}><Text style={{ fontSize: 14, fontWeight: 'bold', color: '#111827' }}>{record.id}</Text></View>
                                        <View style={{ flex: 1, padding: 24 }}><Text style={{ fontSize: 14, fontWeight: 'bold', color: '#111827' }}>{formatCurrency(record.total_amount_due)}</Text></View>
                                        <View style={{ flex: 1, padding: 24, alignItems: 'flex-end' }}>
                                            <Pressable
                                                onPress={() => handleDownloadPDF(record.print_link)}
                                                disabled={!record.print_link}
                                                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: !record.print_link ? '#d1d5db' : '#ef4444', borderRadius: 9999, opacity: !record.print_link ? 0.5 : 1 }}
                                            >
                                                <Download width={12} height={12} color={!record.print_link ? '#9ca3af' : '#ef4444'} />
                                                <Text style={{ fontSize: 12, fontWeight: 'bold', color: !record.print_link ? '#9ca3af' : '#ef4444' }}>Download PDF</Text>
                                            </Pressable>
                                        </View>
                                    </View>
                                ))
                            )}
                        </View>
                    )}

                    {activeTab === 'invoices' && (
                        <View>
                            <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f3f4f6', backgroundColor: '#ffffff' }}>
                                <View style={{ flex: 1, padding: 24 }}><Text style={{ fontSize: 12, fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase' }}>Invoice Date</Text></View>
                                <View style={{ flex: 1, padding: 24 }}><Text style={{ fontSize: 12, fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase' }}>Invoice Ref</Text></View>
                                <View style={{ flex: 1, padding: 24 }}><Text style={{ fontSize: 12, fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase' }}>Amount</Text></View>
                                <View style={{ flex: 1, padding: 24 }}><Text style={{ fontSize: 12, fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', textAlign: 'right' }}>Action</Text></View>
                            </View>
                            {invoiceRecords.length === 0 ? (
                                <View style={{ padding: 32, alignItems: 'center' }}><Text style={{ color: '#6b7280' }}>No invoices found.</Text></View>
                            ) : (
                                invoiceRecords.map((record) => (
                                    <View key={record.id} style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f9fafb' }}>
                                        <View style={{ flex: 1, padding: 24 }}><Text style={{ fontSize: 14, color: '#4b5563' }}>{formatDate(record.invoice_date)}</Text></View>
                                        <View style={{ flex: 1, padding: 24 }}><Text style={{ fontSize: 14, fontWeight: 'bold', color: '#111827' }}>{record.id}</Text></View>
                                        <View style={{ flex: 1, padding: 24 }}><Text style={{ fontSize: 14, fontWeight: 'bold', color: '#111827' }}>{formatCurrency(record.invoice_balance)}</Text></View>
                                        <View style={{ flex: 1, padding: 24, alignItems: 'flex-end' }}>
                                            <Pressable
                                                onPress={() => handleDownloadPDF(record.print_link)}
                                                disabled={!record.print_link}
                                                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: !record.print_link ? '#d1d5db' : '#ef4444', borderRadius: 9999, opacity: !record.print_link ? 0.5 : 1 }}
                                            >
                                                <Download width={12} height={12} color={!record.print_link ? '#9ca3af' : '#ef4444'} />
                                                <Text style={{ fontSize: 12, fontWeight: 'bold', color: !record.print_link ? '#9ca3af' : '#ef4444' }}>Download PDF</Text>
                                            </Pressable>
                                        </View>
                                    </View>
                                ))
                            )}
                        </View>
                    )}

                    {activeTab === 'payments' && (
                        <View>
                            <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f3f4f6', backgroundColor: '#ffffff' }}>
                                <View style={{ flex: 1, padding: 24 }}><Text style={{ fontSize: 12, fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase' }}>Date</Text></View>
                                <View style={{ flex: 1, padding: 24 }}><Text style={{ fontSize: 12, fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase' }}>Reference</Text></View>
                                <View style={{ flex: 1, padding: 24 }}><Text style={{ fontSize: 12, fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase' }}>Source</Text></View>
                                <View style={{ flex: 1, padding: 24 }}><Text style={{ fontSize: 12, fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase' }}>Status</Text></View>
                                <View style={{ flex: 1, padding: 24 }}><Text style={{ fontSize: 12, fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', textAlign: 'right' }}>Amount</Text></View>
                            </View>
                            {paymentRecords.length === 0 ? (
                                <View style={{ padding: 32, alignItems: 'center' }}><Text style={{ color: '#6b7280' }}>No payment history found.</Text></View>
                            ) : (
                                paymentRecords.map((record) => (
                                    <View key={record.id} style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f9fafb' }}>
                                        <View style={{ flex: 1, padding: 24 }}><Text style={{ fontSize: 14, color: '#4b5563' }}>{formatDate(record.date)}</Text></View>
                                        <View style={{ flex: 1, padding: 24 }}><Text style={{ fontSize: 14, fontFamily: 'monospace', color: '#6b7280' }}>{record.reference}</Text></View>
                                        <View style={{ flex: 1, padding: 24 }}><Text style={{ fontSize: 14, color: '#4b5563' }}>{record.source}</Text></View>
                                        <View style={{ flex: 1, padding: 24 }}>
                                            <View style={{ backgroundColor: record.status === 'Completed' || record.status === 'PAID' ? '#dcfce7' : '#f3f4f6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, alignSelf: 'flex-start' }}>
                                                <Text style={{ fontSize: 12, fontWeight: 'bold', color: record.status === 'Completed' || record.status === 'PAID' ? '#15803d' : '#374151' }}>{record.status || 'Posted'}</Text>
                                            </View>
                                        </View>
                                        <View style={{ flex: 1, padding: 24 }}><Text style={{ fontSize: 14, fontWeight: 'bold', color: '#16a34a', textAlign: 'right' }}>+{formatCurrency(record.amount)}</Text></View>
                                    </View>
                                ))
                            )}
                        </View>
                    )}
                </View>
            </View>

            <Modal
                visible={showPaymentVerifyModal}
                transparent={true}
                animationType="fade"
                onRequestClose={handleCloseVerifyModal}
            >
                <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
                    <View style={{ backgroundColor: '#ffffff', borderRadius: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 10, maxWidth: 448, width: '100%' }}>
                        <View style={{ padding: 24, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
                            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#111827', textAlign: 'center' }}>Confirm Payment</Text>
                        </View>
                        <View style={{ padding: 24 }}>
                            <View style={{ backgroundColor: '#f3f4f6', padding: 16, borderRadius: 8, marginBottom: 16 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <Text style={{ color: '#374151' }}>Account:</Text>
                                    <Text style={{ fontWeight: 'bold', color: '#374151' }}>{displayName}</Text>
                                </View>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <Text style={{ color: '#374151' }}>Currency Balance:</Text>
                                    <Text style={{ fontWeight: 'bold', color: balance > 0 ? '#ef4444' : '#16a34a' }}>
                                        {formatCurrency(balance)}
                                    </Text>
                                </View>
                            </View>

                            {errorMessage && (
                                <View style={{ backgroundColor: '#fef2f2', padding: 12, borderRadius: 8, marginBottom: 16, borderWidth: 1, borderColor: '#fecaca' }}>
                                    <Text style={{ color: '#ef4444', fontSize: 14, textAlign: 'center' }}>{errorMessage}</Text>
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
                                <View style={{ alignItems: 'flex-end', marginTop: 4 }}>
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
                                    <Text style={{ fontWeight: 'bold', color: '#111827', textAlign: 'center' }}>Cancel</Text>
                                </Pressable>
                                <Pressable
                                    onPress={handleProceedToCheckout}
                                    disabled={isPaymentProcessing || paymentAmount < 1}
                                    style={{ flex: 1, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 4, backgroundColor: colorPalette?.primary || '#0f172a', opacity: (isPaymentProcessing || paymentAmount < 1) ? 0.5 : 1 }}
                                >
                                    <Text style={{ fontWeight: 'bold', color: '#ffffff', textAlign: 'center' }}>{isPaymentProcessing ? 'Processing...' : 'Proceed to Pay'}</Text>
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
                <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
                    <View style={{ backgroundColor: '#ffffff', borderRadius: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 10, maxWidth: 448, width: '100%', alignItems: 'center' }}>
                        <View style={{ padding: 24, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', width: '100%' }}>
                            <View style={{ alignItems: 'center', justifyContent: 'center', height: 48, width: 48, borderRadius: 24, backgroundColor: '#dcfce7', marginBottom: 16, alignSelf: 'center' }}>
                                <CheckCircle width={24} height={24} color="#16a34a" />
                            </View>
                            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#111827', textAlign: 'center' }}>Payment Link Created!</Text>
                            <Text style={{ color: '#6b7280', marginTop: 8, textAlign: 'center' }}>Reference: {paymentLinkData?.referenceNo}</Text>
                        </View>
                        <View style={{ padding: 24, width: '100%' }}>
                            <Text style={{ color: '#4b5563', marginBottom: 24, textAlign: 'center' }}>
                                Please click the button below to complete your payment of
                                <Text style={{ fontWeight: 'bold', color: '#111827' }}> {formatCurrency(paymentLinkData?.amount)}</Text>
                            </Text>
                            <Pressable
                                onPress={handleOpenPaymentLink}
                                style={{ width: '100%', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 4, backgroundColor: '#16a34a', marginBottom: 12 }}
                            >
                                <Text style={{ fontWeight: 'bold', color: '#ffffff', textAlign: 'center' }}>Open Payment Portal</Text>
                            </Pressable>
                            <Pressable
                                onPress={handleCancelPaymentLink}
                            >
                                <Text style={{ color: '#6b7280', textDecorationLine: 'underline', fontSize: 14, textAlign: 'center' }}>Close</Text>
                            </Pressable>
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
                <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
                    <View style={{ backgroundColor: '#ffffff', borderRadius: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 10, maxWidth: 448, width: '100%', alignItems: 'center' }}>
                        <View style={{ padding: 24, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', width: '100%' }}>
                            <View style={{ alignItems: 'center', justifyContent: 'center', height: 48, width: 48, borderRadius: 24, backgroundColor: '#fef3c7', marginBottom: 16, alignSelf: 'center' }}>
                                <Activity width={24} height={24} color="#ca8a04" />
                            </View>
                            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#111827', textAlign: 'center' }}>Pending Payment Found</Text>
                        </View>
                        <View style={{ padding: 24, width: '100%' }}>
                            <Text style={{ color: '#4b5563', marginBottom: 24, textAlign: 'center' }}>
                                You have a pending payment of
                                <Text style={{ fontWeight: 'bold', color: '#111827' }}> {formatCurrency(pendingPayment?.amount)}</Text>.
                                Would you like to complete it?
                            </Text>
                            <View style={{ flexDirection: 'row', gap: 12 }}>
                                <Pressable
                                    onPress={handleCancelPendingPayment}
                                    style={{ flex: 1, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 4, backgroundColor: '#e5e7eb' }}
                                >
                                    <Text style={{ fontWeight: 'bold', color: '#111827', textAlign: 'center' }}>Cancel</Text>
                                </Pressable>
                                <Pressable
                                    onPress={handleResumePendingPayment}
                                    style={{ flex: 1, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 4, backgroundColor: colorPalette?.primary || '#0f172a' }}
                                >
                                    <Text style={{ fontWeight: 'bold', color: '#ffffff', textAlign: 'center' }}>Resume Payment</Text>
                                </Pressable>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
};

export default Bills;
