import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, ActivityIndicator, Alert, Linking } from 'react-native';
import { User, Activity, Clock, Users, FileText, CheckCircle, HelpCircle } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCustomerDetail, CustomerDetailData } from '../services/customerDetailService';
import { transactionService } from '../services/transactionService';
import { paymentPortalLogsService } from '../services/paymentPortalLogsService';
import { paymentService, PendingPayment } from '../services/paymentService';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';

interface Payment {
    id: string;
    date: string;
    reference: string;
    amount: number;
    source: string;
}

interface Referral {
    id: string;
    date: string;
    name: string;
    stage: string;
    status: 'Done' | 'Failed' | 'Scheduled' | 'Pending';
}

interface DashboardCustomerProps {
    onNavigate?: (section: string, tab?: string) => void;
}

const DashboardCustomer: React.FC<DashboardCustomerProps> = ({ onNavigate }) => {
    const [user, setUser] = useState<any>(null);
    const [customerDetail, setCustomerDetail] = useState<CustomerDetailData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [payments, setPayments] = useState<Payment[]>([]);
    const [referrals, setReferrals] = useState<Referral[]>([]);

    const [isPaymentProcessing, setIsPaymentProcessing] = useState<boolean>(false);
    const [showPaymentVerifyModal, setShowPaymentVerifyModal] = useState<boolean>(false);
    const [paymentAmount, setPaymentAmount] = useState<number>(0);
    const [showPaymentLinkModal, setShowPaymentLinkModal] = useState<boolean>(false);
    const [paymentLinkData, setPaymentLinkData] = useState<{ referenceNo: string; amount: number; paymentUrl: string } | null>(null);
    const [showPendingPaymentModal, setShowPendingPaymentModal] = useState<boolean>(false);
    const [pendingPayment, setPendingPayment] = useState<PendingPayment | null>(null);
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const storedUser = await AsyncStorage.getItem('authData');
                if (storedUser) {
                    const parsedUser = JSON.parse(storedUser);
                    setUser(parsedUser);

                    if (parsedUser.username) {
                        const detail = await getCustomerDetail(parsedUser.username);
                        if (detail) {
                            setCustomerDetail(detail);

                            const accNo = detail.billingAccount?.accountNo;
                            if (accNo) {
                                try {
                                    const logsPromise = paymentPortalLogsService.getLogsByAccountNo(accNo);
                                    const txPromise = transactionService.getAllTransactions();

                                    const [logs, txResponse] = await Promise.all([logsPromise, txPromise]);

                                    const formattedLogs: Payment[] = logs.map((l: any) => ({
                                        id: `log-${l.id}`,
                                        date: l.date_time,
                                        reference: l.reference_no,
                                        amount: parseFloat(l.total_amount),
                                        source: 'Online'
                                    }));

                                    let formattedTxs: Payment[] = [];
                                    if (txResponse.success && Array.isArray(txResponse.data)) {
                                        formattedTxs = txResponse.data
                                            .filter((t: any) => t.account_no === accNo)
                                            .map((t: any) => ({
                                                id: `tx-${t.id}`,
                                                date: t.payment_date || t.created_at,
                                                reference: t.or_no || t.reference_no || `TR-${t.id}`,
                                                amount: parseFloat(t.received_payment || t.amount || 0),
                                                source: 'Manual'
                                            }));
                                    }

                                    const allPayments = [...formattedLogs, ...formattedTxs].sort((a, b) =>
                                        new Date(b.date).getTime() - new Date(a.date).getTime()
                                    ).slice(0, 5);

                                    setPayments(allPayments);

                                } catch (payErr) {
                                    console.error("Error fetching payment history", payErr);
                                }
                            }

                        } else {
                            setError('Could not fetch customer details');
                        }
                    }
                }
            } catch (err) {
                console.error("Error fetching dashboard data:", err);
                setError('Failed to load dashboard data');
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

    if (loading) return (
        <View style={{ padding: 32, flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb', minHeight: '100%' }}>
            <ActivityIndicator size="large" color="#111827" />
        </View>
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Done': return { backgroundColor: '#dcfce7', color: '#16a34a', borderWidth: 1, borderColor: '#bbf7d0' };
            case 'Failed': return { backgroundColor: '#fee2e2', color: '#dc2626', borderWidth: 1, borderColor: '#fecaca' };
            case 'Scheduled': return { backgroundColor: '#fef3c7', color: '#ca8a04', borderWidth: 1, borderColor: '#fde68a' };
            default: return { backgroundColor: '#f3f4f6', color: '#6b7280' };
        }
    };

    const displayName = customerDetail?.fullName || user?.full_name || 'Customer';
    const accountNo = customerDetail?.billingAccount?.accountNo || user?.username || 'N/A';
    const planName = customerDetail?.desiredPlan || 'No Plan';
    const address = customerDetail?.address || 'No Address';
    const installationDate = customerDetail?.billingAccount?.dateInstalled || 'Pending';
    const balance = customerDetail?.billingAccount?.accountBalance || 0;

    let dueDateString = 'Upon Receipt';
    if (customerDetail?.billingAccount?.billingDay) {
        const today = new Date();
        const billingDay = customerDetail.billingAccount.billingDay;

        let dueYear = today.getFullYear();
        let dueMonth = today.getMonth();

        if (today.getDate() > billingDay) {
            dueMonth++;
            if (dueMonth > 11) {
                dueMonth = 0;
                dueYear++;
            }
        }

        const nextDueDate = new Date(dueYear, dueMonth, billingDay);
        dueDateString = nextDueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

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
            console.error('Payment error:', error);
            setErrorMessage(error.message || 'Failed to create payment. Please try again.');
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

    const handleCancelPaymentLink = () => {
        setShowPaymentLinkModal(false);
        setPaymentLinkData(null);
    };

    const handleResumePendingPayment = () => {
        if (pendingPayment && pendingPayment.payment_url) {
            Linking.openURL(pendingPayment.payment_url);
            setShowPendingPaymentModal(false);
            setPendingPayment(null);
        }
    };

    const handleCancelPendingPayment = () => {
        setShowPendingPaymentModal(false);
        setPendingPayment(null);
    };

    return (
        <View style={{ minHeight: '100%', backgroundColor: '#f9fafb', padding: 24, fontFamily: 'sans-serif', position: 'relative' }}>
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={{ marginBottom: 32 }}>
                    <Text style={{ fontSize: 30, fontWeight: 'bold', color: '#111827' }}>Hello, {displayName.split(' ')[0]}!</Text>
                    <Text style={{ color: '#6b7280', marginTop: 4 }}>Welcome back to your dashboard.</Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 32 }}>
                    <View style={{ flex: 1, gap: 24 }}>
                        <View style={{ backgroundColor: '#ffffff', borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#f3f4f6' }}>
                            <View style={{ position: 'relative', marginBottom: 16 }}>
                                <View style={{ width: 96, height: 96, backgroundColor: '#e5e7eb', borderRadius: 48, marginHorizontal: 'auto', alignItems: 'center', justifyContent: 'center' }}>
                                    <User width={48} height={48} color="#9ca3af" />
                                </View>
                                <View style={{ position: 'absolute', bottom: -8, transform: [{ translateX: -50 }], left: '50%', backgroundColor: '#16a34a', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 16, fontSize: 12, fontWeight: '500' }}>
                                    <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '500' }}>Active</Text>
                                </View>
                            </View>

                            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#111827', marginTop: 16 }}>{displayName}</Text>
                            <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827', marginTop: 4 }}>{accountNo}</Text>

                            <View style={{ marginTop: 32, gap: 16, alignSelf: 'stretch' }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#f9fafb', paddingBottom: 12 }}>
                                    <Text style={{ color: '#9ca3af', fontSize: 14 }}>Plan</Text>
                                    <Text style={{ color: '#111827', fontWeight: 'bold', fontSize: 14, textTransform: 'uppercase' }}>{planName}</Text>
                                </View>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#f9fafb', paddingBottom: 12 }}>
                                    <Text style={{ color: '#9ca3af', fontSize: 14 }}>Installed</Text>
                                    <Text style={{ color: '#111827', fontWeight: 'bold', fontSize: 14 }}>{installationDate}</Text>
                                </View>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 12 }}>
                                    <Text style={{ color: '#9ca3af', fontSize: 14 }}>Location</Text>
                                    <Text style={{ color: '#111827', fontWeight: 'bold', fontSize: 14, textAlign: 'right' }}>{address}</Text>
                                </View>
                            </View>

                            <View style={{ marginTop: 32, gap: 12, alignSelf: 'stretch' }}>
                                <Pressable
                                    style={{ width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderWidth: 1, borderRadius: 24, fontWeight: '600', borderColor: colorPalette?.primary || '#0f172a' }}
                                >
                                    <FileText width={16} height={16} color={colorPalette?.primary || '#0f172a'} />
                                    <Text style={{ color: colorPalette?.primary || '#0f172a', fontWeight: '600' }}>My Bills</Text>
                                </Pressable>
                                <Pressable
                                    style={{ width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderWidth: 1, borderRadius: 24, fontWeight: '600', borderColor: colorPalette?.primary || '#0f172a' }}
                                >
                                    <HelpCircle width={16} height={16} color={colorPalette?.primary || '#0f172a'} />
                                    <Text style={{ color: colorPalette?.primary || '#0f172a', fontWeight: '600' }}>Help & Support</Text>
                                </Pressable>
                            </View>
                        </View>
                    </View>

                    <View style={{ flex: 2, gap: 32 }}>
                        <View style={{ borderRadius: 24, padding: 48, alignItems: 'center', backgroundColor: colorPalette?.primary || '#0f172a', position: 'relative', overflow: 'hidden' }}>
                            <Text style={{ color: '#9ca3af', fontSize: 14, fontWeight: '500', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Total Amount Due</Text>
                            <Text style={{ fontSize: 60, fontWeight: 'bold', marginBottom: 16, color: '#ffffff' }}>₱{balance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 32 }}>
                                <Text style={{ color: '#9ca3af', fontSize: 14 }}>Reference: <Text style={{ color: '#ffffff', fontWeight: '500' }}>{accountNo}</Text></Text>
                                <Text style={{ color: '#9ca3af', fontSize: 14 }}>|</Text>
                                <Text style={{ color: '#9ca3af', fontSize: 14 }}>Due: <Text style={{ color: '#ffffff' }}>{dueDateString}</Text></Text>
                            </View>

                            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16 }}>
                                <Pressable
                                    onPress={handlePayNow}
                                    disabled={isPaymentProcessing}
                                    style={{ backgroundColor: '#ffffff', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 24, fontWeight: 'bold', minWidth: 140, opacity: isPaymentProcessing ? 0.5 : 1 }}
                                >
                                    <Text style={{ color: colorPalette?.primary || '#0f172a', fontWeight: 'bold', textAlign: 'center' }}>
                                        {isPaymentProcessing ? 'Processing' : 'PAY NOW'}
                                    </Text>
                                </Pressable>
                                <Pressable
                                    onPress={() => onNavigate?.('customer-bills', 'payments')}
                                    style={{ backgroundColor: 'transparent', borderWidth: 1, borderColor: '#ffffff', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 24, fontWeight: 'bold', minWidth: 140 }}
                                >
                                    <Text style={{ color: '#ffffff', fontWeight: 'bold', textAlign: 'center' }}>History</Text>
                                </Pressable>
                            </View>
                        </View>

                        <View style={{ backgroundColor: '#ffffff', borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, borderWidth: 1, borderColor: '#f3f4f6', overflow: 'hidden' }}>
                            <View style={{ padding: 24, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Clock width={20} height={20} color={colorPalette?.primary || '#0f172a'} />
                                <Text style={{ fontWeight: 'bold', color: colorPalette?.primary || '#0f172a' }}>Recent Payments</Text>
                            </View>
                            <View>
                                {payments.length === 0 ? (
                                    <View style={{ padding: 16, alignItems: 'center' }}>
                                        <Text style={{ color: '#6b7280' }}>No payment history found.</Text>
                                    </View>
                                ) : (
                                    payments.map((payment) => (
                                        <View key={payment.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f9fafb' }}>
                                            <Text style={{ fontSize: 14, color: '#6b7280' }}>{payment.date}</Text>
                                            <Text style={{ fontSize: 14, fontFamily: 'monospace', color: '#4b5563' }}>{payment.reference}</Text>
                                            <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#16a34a' }}>+ ₱{payment.amount.toFixed(2)}</Text>
                                        </View>
                                    ))
                                )}
                            </View>
                        </View>

                        <View style={{ backgroundColor: '#ffffff', borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, borderWidth: 1, borderColor: '#f3f4f6', overflow: 'hidden' }}>
                            <View style={{ padding: 24, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <Users width={20} height={20} color={colorPalette?.primary || '#0f172a'} />
                                    <Text style={{ fontWeight: 'bold', color: colorPalette?.primary || '#0f172a' }}>My Referrals</Text>
                                </View>
                            </View>
                            <View style={{ overflow: 'scroll' }}>
                                <View style={{ width: '100%' }}>
                                    <View style={{ backgroundColor: '#f9fafb', flexDirection: 'row' }}>
                                        <Text style={{ textAlign: 'left', fontSize: 12, fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1, paddingVertical: 12, paddingHorizontal: 24, flex: 1 }}>Date</Text>
                                        <Text style={{ textAlign: 'left', fontSize: 12, fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1, paddingVertical: 12, paddingHorizontal: 24, flex: 1 }}>Name</Text>
                                        <Text style={{ textAlign: 'left', fontSize: 12, fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1, paddingVertical: 12, paddingHorizontal: 24, flex: 1 }}>Stage</Text>
                                        <Text style={{ textAlign: 'right', fontSize: 12, fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1, paddingVertical: 12, paddingHorizontal: 24, flex: 1 }}>Status</Text>
                                    </View>
                                    <View style={{ borderTopWidth: 1, borderTopColor: '#f3f4f6' }}>
                                        {referrals.map((referral) => (
                                            <View key={referral.id} style={{ flexDirection: 'row' }}>
                                                <Text style={{ paddingVertical: 16, paddingHorizontal: 24, fontSize: 14, color: '#6b7280', flex: 1 }}>{referral.date}</Text>
                                                <Text style={{ paddingVertical: 16, paddingHorizontal: 24, fontSize: 14, fontWeight: 'bold', color: '#111827', flex: 1 }}>{referral.name}</Text>
                                                <View style={{ paddingVertical: 16, paddingHorizontal: 24, fontSize: 14, flex: 1 }}>
                                                    <View style={{ backgroundColor: '#dbeafe', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, alignSelf: 'flex-start' }}>
                                                        <Text style={{ color: '#1d4ed8', fontSize: 12, fontWeight: '500' }}>{referral.stage}</Text>
                                                    </View>
                                                </View>
                                                <View style={{ paddingVertical: 16, paddingHorizontal: 24, fontSize: 14, alignItems: 'flex-end', flex: 1 }}>
                                                    <View style={{ ...getStatusColor(referral.status), paddingHorizontal: 12, paddingVertical: 4, borderRadius: 24 }}>
                                                        <Text style={{ fontSize: 12, fontWeight: 'bold', color: getStatusColor(referral.status).color }}>{referral.status}</Text>
                                                    </View>
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            </View>
                        </View>
                    </View>
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
                                    <Text style={{ color: '#374151' }}>Current Balance:</Text>
                                    <Text style={{ fontWeight: 'bold', color: balance > 0 ? '#ef4444' : '#16a34a' }}>
                                        ₱{balance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                    </Text>
                                </View>
                            </View>

                            {errorMessage && (
                                <View style={{ backgroundColor: '#fef2f2', padding: 12, borderRadius: 4, marginBottom: 16, borderWidth: 1, borderColor: '#fecaca' }}>
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
                                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 }}>
                                    <Text style={{ fontSize: 14, color: '#6b7280' }}>
                                        {balance > 0 ? (
                                            `Outstanding: ₱${balance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
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
                                    style={{ flex: 1, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 4, fontWeight: 'bold', backgroundColor: '#e5e7eb', opacity: isPaymentProcessing ? 0.5 : 1 }}
                                >
                                    <Text style={{ color: '#111827', fontWeight: 'bold', textAlign: 'center' }}>Cancel</Text>
                                </Pressable>
                                <Pressable
                                    onPress={handleProceedToCheckout}
                                    disabled={isPaymentProcessing || paymentAmount < 1}
                                    style={{ flex: 1, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 4, fontWeight: 'bold', backgroundColor: colorPalette?.primary || '#0f172a', opacity: (isPaymentProcessing || paymentAmount < 1) ? 0.5 : 1 }}
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
                                <Text style={{ fontWeight: 'bold', color: '#111827' }}> ₱{paymentLinkData.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</Text>
                            </Text>
                            <Pressable
                                onPress={handleOpenPaymentLink}
                                style={{ width: '100%', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 4, fontWeight: 'bold', backgroundColor: '#16a34a', marginBottom: 12 }}
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
                                <Text style={{ fontWeight: 'bold', color: '#111827' }}> ₱{pendingPayment.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</Text>.
                                Would you like to complete it?
                            </Text>
                            <View style={{ flexDirection: 'row', gap: 12 }}>
                                <Pressable
                                    onPress={handleCancelPendingPayment}
                                    style={{ flex: 1, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 4, fontWeight: 'bold', backgroundColor: '#e5e7eb' }}
                                >
                                    <Text style={{ color: '#111827', fontWeight: 'bold', textAlign: 'center' }}>Cancel</Text>
                                </Pressable>
                                <Pressable
                                    onPress={handleResumePendingPayment}
                                    style={{ flex: 1, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 4, fontWeight: 'bold', backgroundColor: colorPalette?.primary || '#0f172a' }}
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

export default DashboardCustomer;
