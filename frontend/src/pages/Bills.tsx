import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, ActivityIndicator, Linking, useWindowDimensions, RefreshControl, Modal, PanResponder, Animated, StyleSheet } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as LinkingExpo from 'expo-linking';
import { Download, FileText, Clock, CheckCircle, File, ChevronLeft, ChevronRight } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    loadingContainer: { padding: 32, flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' },
    tabRow: { flexDirection: 'row', width: '100%', justifyContent: 'center', gap: 4 },
    tabBase: {
        flex: 1, paddingTop: 14, paddingBottom: 14, paddingHorizontal: 4,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        borderTopLeftRadius: 12, borderTopRightRadius: 12, position: 'relative',
    },
    tabActive: { backgroundColor: '#ffffff', shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 4 },
    tabInactive: { backgroundColor: 'transparent', shadowColor: 'transparent', shadowOpacity: 0, elevation: 0 },
    tabText: { fontSize: 13, fontWeight: 'bold' },
    tabTextActive: { color: '#111827' },
    tabTextInactive: { color: '#9ca3af' },
    tabIndicator: { position: 'absolute', bottom: 0, width: '70%', height: 3, borderRadius: 3 },
    contentScroll: { flex: 1, backgroundColor: '#ffffff' },
    contentContainer: { padding: 16, paddingBottom: 100 },
    listGap: { gap: 16 },
    emptyContainer: { padding: 48, alignItems: 'center' },
    emptyText: { color: '#6b7280', marginTop: 16, fontSize: 16 },
    card: { padding: 16, borderRadius: 16, backgroundColor: '#ffffff', gap: 12 },
    cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    divider: { height: 1, backgroundColor: '#f1f5f9' },
    labelText: { fontSize: 12, color: '#6b7280', fontWeight: '600', textTransform: 'uppercase' },
    valueText: { fontSize: 15, fontWeight: '700', color: '#111827', marginTop: 2 },
    amountText: { fontSize: 18, fontWeight: 'bold', marginTop: 2 },
    alignEnd: { alignItems: 'flex-end' },
    pdfBtnBase: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
    pdfBtnDisabled: { backgroundColor: '#f9fafb', borderColor: '#f1f5f9', opacity: 0.5 },
    pdfText: { fontSize: 13, fontWeight: 'bold' },
    statusBadge: { borderRadius: 20 },
    statusText: { fontSize: 11, fontWeight: 'bold' },
    refContainer: { flex: 1, marginRight: 16 },
    refText: { fontSize: 13, fontFamily: 'monospace', color: '#64748b', marginTop: 2 },
    paymentAmount: { fontSize: 18, fontWeight: 'bold', color: '#16a34a', marginTop: 2 },
    paginationRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingTop: 20, paddingBottom: 8, gap: 16 },
    paginationBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
    paginationBtnDisabled: { backgroundColor: '#f3f4f6', opacity: 0.5 },
    paginationText: { fontSize: 13, fontWeight: '600' },
    pageIndicator: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
    modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    modalSheet: {
        backgroundColor: '#ffffff', borderTopLeftRadius: 30, borderTopRightRadius: 30,
        width: '100%', maxHeight: '90%',
        shadowColor: '#000', shadowOffset: { width: 0, height: -15 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 20,
    },
    modalHeader: { paddingHorizontal: 24, paddingVertical: 12, alignItems: 'center' },
    modalHandle: { width: 40, height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, marginBottom: 12 },
    modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
    modalContent: { padding: 24 },
    modalContentCenter: { padding: 24, alignItems: 'center' },
    verifyBox: { backgroundColor: '#f9fafb', padding: 20, borderRadius: 16, marginBottom: 24, borderWidth: 1, borderColor: '#f3f4f6' },
    verifyRow: { flexDirection: 'row', justifyContent: 'space-between' },
    verifyRowMb: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
    verifyLabel: { color: '#6b7280', fontSize: 14 },
    verifyValue: { fontWeight: '600', color: '#111827', fontSize: 14 },
    errorBox: { backgroundColor: '#fef2f2', padding: 12, borderRadius: 12, marginBottom: 24, borderWidth: 1, borderColor: '#fee2e2' },
    errorText: { color: '#ef4444', fontSize: 14, textAlign: 'center' },
    inputLabel: { fontWeight: '600', marginBottom: 10, color: '#374151', fontSize: 15 },
    inputField: { width: '100%', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, fontSize: 16, borderWidth: 1, borderColor: '#d1d5db', color: '#111827', backgroundColor: '#ffffff' },
    inputWrap: { marginBottom: 32 },
    primaryBtn: { paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
    primaryBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 16 },
    spacer: { height: 40 },
    successCircleLg: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
    successCircleSm: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    successBox: { backgroundColor: '#f0fdf4', padding: 20, borderRadius: 16, marginBottom: 24, alignItems: 'center' },
    successTitle: { color: '#166534', fontWeight: '700', fontSize: 16, marginBottom: 4 },
    successRef: { color: '#166534', opacity: 0.8, fontSize: 14 },
    paymentDescWrap: { marginBottom: 32 },
    paymentDesc: { textAlign: 'center', color: '#4b5563', fontSize: 15, lineHeight: 22 },
    paymentDescBold: { fontWeight: '700', color: '#111827' },
    openPortalBtn: { paddingVertical: 16, borderRadius: 16, backgroundColor: '#16a34a', alignItems: 'center', marginBottom: 16 },
    maybeLaterText: { color: '#6b7280', fontSize: 15, textAlign: 'center', fontWeight: '500' },
    pendingBox: { backgroundColor: '#fffbeb', padding: 20, borderRadius: 16, marginBottom: 24, borderLeftWidth: 4, borderLeftColor: '#f59e0b' },
    pendingLabel: { color: '#92400e', fontSize: 14 },
    pendingAmount: { fontWeight: 'bold', color: '#92400e', fontSize: 16 },
    pendingDesc: { color: '#4b5563', marginBottom: 32, textAlign: 'center', fontSize: 15, lineHeight: 22 },
    pendingBtns: { gap: 12 },
    resumeBtn: { paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
    cancelBtn: { paddingVertical: 16, borderRadius: 16, backgroundColor: '#f3f4f6', alignItems: 'center' },
    cancelBtnText: { color: '#4b5563', fontWeight: 'bold', fontSize: 16 },
    successDesc: { fontSize: 16, color: '#4b5563', textAlign: 'center', marginBottom: 32, lineHeight: 22 },
    successBtn: { paddingVertical: 16, borderRadius: 16, width: '100%', alignItems: 'center' },
});

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

    const ITEMS_PER_PAGE = 4;
    const [soaPage, setSoaPage] = useState(0);
    const [invoicePage, setInvoicePage] = useState(0);
    const [paymentPage, setPaymentPage] = useState(0);

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

    // Batch mount-time async loads into a single effect
    useEffect(() => {
        let cancelled = false;
        const initLoad = async () => {
            const [authResult, paletteResult] = await Promise.allSettled([
                AsyncStorage.getItem('authData'),
                settingsColorPaletteService.getActive(),
            ]);
            if (cancelled) return;
            if (authResult.status === 'fulfilled' && authResult.value) {
                try {
                    const parsedUser = JSON.parse(authResult.value);
                    setDisplayName(parsedUser.full_name || 'Customer');
                } catch (error) {}
            }
            if (paletteResult.status === 'fulfilled') {
                setColorPalette(paletteResult.value);
            }
        };
        initLoad();
        silentRefresh();
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        if (initialTab) {
            setActiveTab(initialTab);
        }
    }, [initialTab]);

    const handleCloseVerifyModal = useCallback(() => {
        setShowPaymentVerifyModal(false);
        setPaymentAmount(balance);
    }, [balance]);

    const handleCancelPaymentLink = useCallback(() => {
        setShowPaymentLinkModal(false);
        setPaymentLinkData(null);
    }, []);

    const handleCancelPendingPayment = useCallback(() => {
        setShowPendingPaymentModal(false);
        setPendingPayment(null);
    }, []);

    const handlePayNow = useCallback(async () => {
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
    }, [accountNo, balance]);

    const handleProceedToCheckout = useCallback(async () => {
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
    }, [accountNo, paymentAmount, isPaymentProcessing]);

    const handleOpenPaymentLink = useCallback(async () => {
        const url = paymentLinkData?.paymentUrl || pendingPayment?.payment_url;
        const refNo = paymentLinkData?.referenceNo || pendingPayment?.reference_no || '';
        if (url) {
            try {
                const redirectUrl = LinkingExpo.createURL('payment-success');
                await WebBrowser.openAuthSessionAsync(url, redirectUrl);

                await silentRefresh();

                setShowPaymentLinkModal(false);
                setShowPendingPaymentModal(false);
                setPaymentLinkData(null);
                setPendingPayment(null);

                // Verify actual payment status from Xendit before showing success
                if (refNo) {
                    try {
                        const statusRes = await paymentService.checkPaymentStatus(refNo);
                        if (statusRes.status === 'success' && statusRes.payment?.status === 'PAID') {
                            setShowSuccessModal(true);
                        }
                    } catch (err) {
                        console.error('Error checking payment status:', err);
                    }
                }
            } catch (error) {
                console.error('Error opening browser:', error);
                Linking.openURL(url);
            }
        }
    }, [paymentLinkData, pendingPayment, silentRefresh]);

    const handleResumePendingPayment = handleOpenPaymentLink;

    const onRefresh = useCallback(async () => {
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
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#111827" />
        </View>
    );

    const handleDownloadPDF = (url?: string) => {
        if (url) Linking.openURL(url);
    };

    const paginatedSoa = useMemo(() => {
        const start = soaPage * ITEMS_PER_PAGE;
        return soaRecords.slice(start, start + ITEMS_PER_PAGE);
    }, [soaRecords, soaPage]);

    const paginatedInvoices = useMemo(() => {
        const start = invoicePage * ITEMS_PER_PAGE;
        return invoiceRecords.slice(start, start + ITEMS_PER_PAGE);
    }, [invoiceRecords, invoicePage]);

    const paginatedPayments = useMemo(() => {
        const start = paymentPage * ITEMS_PER_PAGE;
        return paymentRecords.slice(start, start + ITEMS_PER_PAGE);
    }, [paymentRecords, paymentPage]);

    const soaTotalPages = useMemo(() => Math.max(1, Math.ceil(soaRecords.length / ITEMS_PER_PAGE)), [soaRecords.length]);
    const invoiceTotalPages = useMemo(() => Math.max(1, Math.ceil(invoiceRecords.length / ITEMS_PER_PAGE)), [invoiceRecords.length]);
    const paymentTotalPages = useMemo(() => Math.max(1, Math.ceil(paymentRecords.length / ITEMS_PER_PAGE)), [paymentRecords.length]);

    const renderPagination = useCallback((currentPage: number, totalPages: number, setPage: (p: number) => void, totalItems: number) => {
        if (totalItems <= ITEMS_PER_PAGE) return null;
        const primary = colorPalette?.primary || '#ef4444';
        const isPrevDisabled = currentPage === 0;
        const isNextDisabled = currentPage >= totalPages - 1;
        return (
            <View style={styles.paginationRow}>
                <Pressable
                    onPress={() => setPage(Math.max(0, currentPage - 1))}
                    disabled={isPrevDisabled}
                    style={[styles.paginationBtn, isPrevDisabled ? styles.paginationBtnDisabled : { backgroundColor: primary + '12' }]}
                >
                    <ChevronLeft width={16} height={16} color={isPrevDisabled ? '#9ca3af' : primary} />
                    <Text style={[styles.paginationText, { color: isPrevDisabled ? '#9ca3af' : primary }]}>Previous</Text>
                </Pressable>

                <Text style={styles.pageIndicator}>
                    {currentPage + 1} / {totalPages}
                </Text>

                <Pressable
                    onPress={() => setPage(Math.min(totalPages - 1, currentPage + 1))}
                    disabled={isNextDisabled}
                    style={[styles.paginationBtn, isNextDisabled ? styles.paginationBtnDisabled : { backgroundColor: primary + '12' }]}
                >
                    <Text style={[styles.paginationText, { color: isNextDisabled ? '#9ca3af' : primary }]}>Next</Text>
                    <ChevronRight width={16} height={16} color={isNextDisabled ? '#9ca3af' : primary} />
                </Pressable>
            </View>
        );
    }, [colorPalette]);

    return (
        <View style={styles.container}>
                <View style={{ paddingHorizontal: isMobile ? 16 : 24, paddingTop: isMobile ? 60 : 16 }}>
                    <View style={styles.tabRow}>
                        <Pressable
                            onPress={() => setActiveTab('soa')}
                            style={[styles.tabBase, activeTab === 'soa' ? styles.tabActive : styles.tabInactive]}
                        >
                            <FileText width={16} height={16} color={activeTab === 'soa' ? (colorPalette?.primary || '#ef4444') : '#9ca3af'} />
                            <Text style={[styles.tabText, activeTab === 'soa' ? styles.tabTextActive : styles.tabTextInactive]}>SOA</Text>
                            {activeTab === 'soa' && (
                                <View style={[styles.tabIndicator, { backgroundColor: colorPalette?.primary || '#ef4444' }]} />
                            )}
                        </Pressable>
                        <Pressable
                            onPress={() => setActiveTab('invoices')}
                            style={[styles.tabBase, activeTab === 'invoices' ? styles.tabActive : styles.tabInactive]}
                        >
                            <File width={16} height={16} color={activeTab === 'invoices' ? (colorPalette?.primary || '#ef4444') : '#9ca3af'} />
                            <Text style={[styles.tabText, activeTab === 'invoices' ? styles.tabTextActive : styles.tabTextInactive]}>Invoices</Text>
                            {activeTab === 'invoices' && (
                                <View style={[styles.tabIndicator, { backgroundColor: colorPalette?.primary || '#ef4444' }]} />
                            )}
                        </Pressable>
                        <Pressable
                            onPress={() => setActiveTab('payments')}
                            style={[styles.tabBase, activeTab === 'payments' ? styles.tabActive : styles.tabInactive]}
                        >
                            <Clock width={16} height={16} color={activeTab === 'payments' ? (colorPalette?.primary || '#ef4444') : '#9ca3af'} />
                            <Text style={[styles.tabText, activeTab === 'payments' ? styles.tabTextActive : styles.tabTextInactive]}>History</Text>
                            {activeTab === 'payments' && (
                                <View style={[styles.tabIndicator, { backgroundColor: colorPalette?.primary || '#ef4444' }]} />
                            )}
                        </Pressable>
                    </View>
                </View>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    style={styles.contentScroll}
                    contentContainerStyle={styles.contentContainer}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[colorPalette?.primary || '#ef4444']}
                            tintColor={colorPalette?.primary || '#ef4444'}
                        />
                    }
                >
                    {activeTab === 'soa' && (
                        <View style={styles.listGap}>
                            {soaRecords.length === 0 ? (
                                <View style={styles.emptyContainer}>
                                    <FileText size={48} color="#d1d5db" />
                                    <Text style={styles.emptyText}>No statements found.</Text>
                                </View>
                            ) : (
                                <>
                                    {paginatedSoa.map((record) => (
                                        <View key={record.id} style={styles.card}>
                                            <View style={styles.cardRow}>
                                                <View>
                                                    <Text style={styles.labelText}>Statement Date</Text>
                                                    <Text style={styles.valueText}>{formatDate(record.statement_date)}</Text>
                                                </View>
                                                <View style={styles.alignEnd}>
                                                    <Text style={styles.labelText}>Ref No.</Text>
                                                    <Text style={styles.valueText}>#{record.id}</Text>
                                                </View>
                                            </View>
                                            <View style={styles.divider} />
                                            <View style={styles.cardRow}>
                                                <View>
                                                    <Text style={styles.labelText}>Amount Due</Text>
                                                    <Text style={[styles.amountText, { color: colorPalette?.primary || '#ef4444' }]}>{formatCurrency(record.total_amount_due || 0)}</Text>
                                                </View>
                                                <Pressable
                                                    onPress={() => handleDownloadPDF(record.print_link)}
                                                    disabled={!record.print_link}
                                                    style={[styles.pdfBtnBase, record.print_link ? { backgroundColor: (colorPalette?.primary || '#ef4444') + '15', borderColor: (colorPalette?.primary || '#ef4444') + '30' } : styles.pdfBtnDisabled]}
                                                >
                                                    <Download width={14} height={14} color={record.print_link ? (colorPalette?.primary || '#ef4444') : '#9ca3af'} />
                                                    <Text style={[styles.pdfText, { color: record.print_link ? (colorPalette?.primary || '#ef4444') : '#9ca3af' }]}>PDF</Text>
                                                </Pressable>
                                            </View>
                                        </View>
                                    ))}
                                    {renderPagination(soaPage, soaTotalPages, setSoaPage, soaRecords.length)}
                                </>
                            )}
                        </View>
                    )}

                    {activeTab === 'invoices' && (
                        <View style={styles.listGap}>
                            {invoiceRecords.length === 0 ? (
                                <View style={styles.emptyContainer}>
                                    <File size={48} color="#d1d5db" />
                                    <Text style={styles.emptyText}>No invoices found.</Text>
                                </View>
                            ) : (
                                <>
                                    {paginatedInvoices.map((record) => (
                                        <View key={record.id} style={styles.card}>
                                            <View style={styles.cardRow}>
                                                <View>
                                                    <Text style={styles.labelText}>Invoice Date</Text>
                                                    <Text style={styles.valueText}>{formatDate(record.invoice_date)}</Text>
                                                </View>
                                                <View style={styles.alignEnd}>
                                                    <Text style={styles.labelText}>Ref No.</Text>
                                                    <Text style={styles.valueText}>#{record.id}</Text>
                                                </View>
                                            </View>
                                            <View style={styles.divider} />
                                            <View style={styles.cardRow}>
                                                <View>
                                                    <Text style={styles.labelText}>Balance</Text>
                                                    <Text style={[styles.amountText, { color: '#111827' }]}>{formatCurrency(record.invoice_balance || 0)}</Text>
                                                </View>
                                                <Pressable
                                                    onPress={() => handleDownloadPDF(record.print_link)}
                                                    disabled={!record.print_link}
                                                    style={[styles.pdfBtnBase, record.print_link ? { backgroundColor: (colorPalette?.primary || '#ef4444') + '15', borderColor: (colorPalette?.primary || '#ef4444') + '30' } : styles.pdfBtnDisabled]}
                                                >
                                                    <Download width={14} height={14} color={record.print_link ? (colorPalette?.primary || '#ef4444') : '#9ca3af'} />
                                                    <Text style={[styles.pdfText, { color: record.print_link ? (colorPalette?.primary || '#ef4444') : '#9ca3af' }]}>PDF</Text>
                                                </Pressable>
                                            </View>
                                        </View>
                                    ))}
                                    {renderPagination(invoicePage, invoiceTotalPages, setInvoicePage, invoiceRecords.length)}
                                </>
                            )}
                        </View>
                    )}

                    {activeTab === 'payments' && (
                        <View style={styles.listGap}>
                            {paymentRecords.length === 0 ? (
                                <View style={styles.emptyContainer}>
                                    <Clock size={48} color="#d1d5db" />
                                    <Text style={styles.emptyText}>No payment history found.</Text>
                                </View>
                            ) : (
                                <>
                                    {paginatedPayments.map((record) => (
                                        <View key={record.id} style={styles.card}>
                                            <View style={styles.cardRow}>
                                                <View>
                                                    <Text style={styles.labelText}>Date</Text>
                                                    <Text style={styles.valueText}>{formatDate(record.date)}</Text>
                                                </View>
                                                <View style={styles.statusBadge}>
                                                    <Text style={[styles.statusText, { color: (record.status === 'Completed' || record.status === 'PAID') ? '#15803d' : '#374151' }]}>
                                                        {(record.status || 'Posted').toUpperCase()}
                                                    </Text>
                                                </View>
                                            </View>
                                            <View style={styles.divider} />
                                            <View style={styles.cardRow}>
                                                <View style={styles.refContainer}>
                                                    <Text style={styles.labelText}>Ref: {record.source}</Text>
                                                    <Text numberOfLines={1} ellipsizeMode="tail" style={styles.refText}>{record.reference}</Text>
                                                </View>
                                                <View style={styles.alignEnd}>
                                                    <Text style={styles.labelText}>Amount</Text>
                                                    <Text style={styles.paymentAmount}>+{formatCurrency(record.amount)}</Text>
                                                </View>
                                            </View>
                                        </View>
                                    ))}
                                    {renderPagination(paymentPage, paymentTotalPages, setPaymentPage, paymentRecords.length)}
                                </>
                            )}
                        </View>
                    )}
                </ScrollView>

            <Modal
                visible={showPaymentVerifyModal}
                transparent={true}
                animationType="slide"
                statusBarTranslucent={true}
                onRequestClose={handleCloseVerifyModal}
            >
                <View style={styles.modalOverlay}>
                    <Pressable style={styles.modalBackdrop} onPress={handleCloseVerifyModal} />
                    <Animated.View
                        {...panResponder.panHandlers}
                        style={[styles.modalSheet, { transform: [{ translateY: pan.y }] }]}
                    >
                        <View style={styles.modalHeader}>
                            <View style={styles.modalHandle} />
                            <Text style={styles.modalTitle}>Confirm Payment</Text>
                        </View>
                        <ScrollView contentContainerStyle={styles.modalContent}>
                            <View style={styles.verifyBox}>
                                <View style={styles.verifyRowMb}>
                                    <Text style={styles.verifyLabel}>Account Name</Text>
                                    <Text style={styles.verifyValue}>{displayName}</Text>
                                </View>
                                <View style={styles.verifyRow}>
                                    <Text style={styles.verifyLabel}>Account Balance</Text>
                                    <Text style={[styles.verifyValue, { fontWeight: 'bold', color: balance > 0 ? (colorPalette?.primary || '#ef4444') : '#16a34a' }]}>
                                        {formatCurrency(balance)}
                                    </Text>
                                </View>
                            </View>

                            {errorMessage && (
                                <View style={styles.errorBox}>
                                    <Text style={styles.errorText}>{errorMessage}</Text>
                                </View>
                            )}

                            <View style={styles.inputWrap}>
                                <Text style={styles.inputLabel}>Payment Amount</Text>
                                <TextInput
                                    keyboardType="decimal-pad"
                                    value={paymentAmount.toString()}
                                    onChangeText={(val) => setPaymentAmount(parseFloat(val) || 0)}
                                    placeholder="0.00"
                                    style={styles.inputField}
                                />
                            </View>

                            <Pressable
                                onPress={handleProceedToCheckout}
                                disabled={isPaymentProcessing || paymentAmount < 1}
                                style={[styles.primaryBtn, {
                                    backgroundColor: colorPalette?.primary || '#ef4444',
                                    opacity: (isPaymentProcessing || paymentAmount < 1) ? 0.6 : 1,
                                    shadowColor: colorPalette?.primary || '#ef4444',
                                    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5
                                }]}
                            >
                                <Text style={styles.primaryBtnText}>
                                    {isPaymentProcessing ? 'Processing...' : 'Proceed to Payment'}
                                </Text>
                            </Pressable>
                            <View style={styles.spacer} />
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
                <View style={styles.modalOverlay}>
                    <Pressable style={styles.modalBackdrop} onPress={handleCancelPaymentLink} />
                    <Animated.View
                        {...panResponder.panHandlers}
                        style={[styles.modalSheet, { transform: [{ translateY: pan.y }] }]}
                    >
                        <View style={styles.modalHeader}>
                            <View style={styles.modalHandle} />
                            <Text style={styles.modalTitle}>Payment Link Created!</Text>
                        </View>
                        <ScrollView contentContainerStyle={styles.modalContent}>
                            <View style={styles.successBox}>
                                <View style={styles.successCircleSm}>
                                    <CheckCircle size={32} color="#16a34a" />
                                </View>
                                <Text style={styles.successTitle}>Ready to Pay</Text>
                                <Text style={styles.successRef}>{paymentLinkData?.referenceNo}</Text>
                            </View>

                            <View style={styles.paymentDescWrap}>
                                <Text style={styles.paymentDesc}>
                                    Your payment link for <Text style={styles.paymentDescBold}>{formatCurrency(paymentLinkData?.amount || 0)}</Text> is ready. Click below to open the payment portal.
                                </Text>
                            </View>

                            <Pressable onPress={handleOpenPaymentLink} style={styles.openPortalBtn}>
                                <Text style={styles.primaryBtnText}>Open Payment Portal</Text>
                            </Pressable>

                            <Pressable onPress={handleCancelPaymentLink}>
                                <Text style={styles.maybeLaterText}>Maybe Later</Text>
                            </Pressable>
                            <View style={styles.spacer} />
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
                <View style={styles.modalOverlay}>
                    <Pressable style={styles.modalBackdrop} onPress={handleCancelPendingPayment} />
                    <Animated.View
                        {...panResponder.panHandlers}
                        style={[styles.modalSheet, { transform: [{ translateY: pan.y }] }]}
                    >
                        <View style={styles.modalHeader}>
                            <View style={styles.modalHandle} />
                            <Text style={styles.modalTitle}>Pending Payment Found</Text>
                        </View>
                        <ScrollView contentContainerStyle={styles.modalContent}>
                            <View style={styles.pendingBox}>
                                <View style={styles.verifyRow}>
                                    <Text style={styles.pendingLabel}>Amount</Text>
                                    <Text style={styles.pendingAmount}>
                                        {formatCurrency(pendingPayment?.amount || 0)}
                                    </Text>
                                </View>
                            </View>

                            <Text style={styles.pendingDesc}>
                                You have an active payment session. Would you like to resume it now?
                            </Text>

                            <View style={styles.pendingBtns}>
                                <Pressable
                                    onPress={handleResumePendingPayment}
                                    style={[styles.resumeBtn, { backgroundColor: colorPalette?.primary || '#0f172a' }]}
                                >
                                    <Text style={styles.primaryBtnText}>Resume Payment</Text>
                                </Pressable>
                                <Pressable onPress={handleCancelPendingPayment} style={styles.cancelBtn}>
                                    <Text style={styles.cancelBtnText}>Cancel</Text>
                                </Pressable>
                            </View>
                            <View style={styles.spacer} />
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
                <View style={styles.modalOverlay}>
                    <Pressable style={styles.modalBackdrop} onPress={() => setShowSuccessModal(false)} />
                    <Animated.View
                        {...panResponder.panHandlers}
                        style={[styles.modalSheet, { transform: [{ translateY: pan.y }] }]}
                    >
                        <View style={styles.modalHeader}>
                            <View style={styles.modalHandle} />
                            <Text style={styles.modalTitle}>Payment Successful!</Text>
                        </View>
                        <ScrollView contentContainerStyle={styles.modalContentCenter}>
                            <View style={styles.successCircleLg}>
                                <CheckCircle size={48} color="#16a34a" />
                            </View>
                            <Text style={styles.successDesc}>
                                Thank you! Your payment has been processed successfully. Your balance will be updated shortly.
                            </Text>
                            <Pressable
                                onPress={() => setShowSuccessModal(false)}
                                style={[styles.successBtn, { backgroundColor: colorPalette?.primary || '#ef4444' }]}
                            >
                                <Text style={styles.primaryBtnText}>Great!</Text>
                            </Pressable>
                            <View style={styles.spacer} />
                        </ScrollView>
                    </Animated.View>
                </View>
            </Modal>

        </View>
    );
};

export default Bills;
