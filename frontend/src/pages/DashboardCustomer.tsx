import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, ActivityIndicator, Alert, Linking, useWindowDimensions, Modal, PanResponder, Animated, RefreshControl } from 'react-native';
import { User, Activity, Clock, Users, FileText, CheckCircle, HelpCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCustomerDetail, CustomerDetailData } from '../services/customerDetailService';
import { transactionService } from '../services/transactionService';
import { paymentPortalLogsService } from '../services/paymentPortalLogsService';
import { paymentService, PendingPayment } from '../services/paymentService';
import { useCustomerDataContext } from '../contexts/CustomerDataContext';
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
    const { width } = useWindowDimensions();
    const isMobile = width < 768;
    const { customerDetail, payments, isLoading: contextLoading, silentRefresh } = useCustomerDataContext();
    const [user, setUser] = useState<any>(null);
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
    const [currentAdPos, setCurrentAdPos] = useState(1);
    const [refreshing, setRefreshing] = useState(false);
    const adsScrollRef = React.useRef<ScrollView>(null);

    const ads = [
        { id: 1, title: 'Summer Promo!', desc: 'Get 50% off on installation fee.', color: colorPalette?.primary || '#ef4444' },
        { id: 2, title: 'Refer & Earn', desc: 'Earn ₱500 for every successful referral.', color: '#3b82f6' },
        { id: 3, title: 'Upgrade Now', desc: 'Boost your speed for as low as ₱199.', color: '#10b981' }
    ];

    const displayAds = [ads[ads.length - 1], ...ads, ads[0]];

    const pan = React.useRef(new Animated.ValueXY()).current;

    // Reset pan position when modal opens
    useEffect(() => {
        if (showPaymentVerifyModal) {
            pan.setValue({ x: 0, y: 0 });
        }
    }, [showPaymentVerifyModal]);

    const panResponder = React.useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                // Only allow vertical drag downwards
                return gestureState.dy > 0;
            },
            onPanResponderMove: Animated.event(
                [
                    null,
                    { dy: pan.y }
                ],
                { useNativeDriver: false }
            ),
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > 150) {
                    handleCloseVerifyModal();
                } else {
                    Animated.spring(
                        pan,
                        { toValue: { x: 0, y: 0 }, useNativeDriver: false }
                    ).start();
                }
            }
        })
    ).current;

    useEffect(() => {
        const loadUser = async () => {
            const storedUser = await AsyncStorage.getItem('authData');
            if (storedUser) setUser(JSON.parse(storedUser));
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
        if (ads.length > 0) {
            const adWidth = width - (isMobile ? 32 : 48);
            const timer = setInterval(() => {
                const nextPos = currentAdPos + 1;
                adsScrollRef.current?.scrollTo({ x: nextPos * adWidth, animated: true });

                // Position update and infinite jump will be handled by onMomentumScrollEnd
                // via a small delay to allow the animation to finish
                setTimeout(() => {
                    handleScrollEnd(nextPos);
                }, 500);
            }, 3000);
            return () => clearInterval(timer);
        }
    }, [currentAdPos, width, isMobile]);

    const handleScrollEnd = (pos: number) => {
        const adWidth = width - (isMobile ? 32 : 48);
        let finalPos = pos;

        if (pos <= 0) {
            finalPos = ads.length;
            adsScrollRef.current?.scrollTo({ x: finalPos * adWidth, animated: false });
        } else if (pos >= displayAds.length - 1) {
            finalPos = 1;
            adsScrollRef.current?.scrollTo({ x: finalPos * adWidth, animated: false });
        }
        setCurrentAdPos(finalPos);
    };

    if (contextLoading && !customerDetail) return (
        <View style={{ padding: 32, flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb', minHeight: '100%' }}>
            <ActivityIndicator size="large" color="#111827" />
        </View>
    );

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'Done': return { bg: '#dcfce7', text: '#16a34a', border: '#bbf7d0' };
            case 'Failed': return { bg: '#fee2e2', text: '#dc2626', border: '#fecaca' };
            case 'Scheduled': return { bg: '#fef3c7', text: '#ca8a04', border: '#fde68a' };
            default: return { bg: '#f3f4f6', text: '#6b7280', border: '#f3f4f6' };
        }
    };

    const displayName = customerDetail?.fullName || user?.full_name || 'Customer';
    const accountNo = customerDetail?.billingAccount?.accountNo || user?.username || 'N/A';
    const planName = customerDetail?.desiredPlan || 'No Plan';
    const address = customerDetail?.address || 'No Address';
    const installationDate = customerDetail?.billingAccount?.dateInstalled || 'Pending';
    const balance = Number(customerDetail?.billingAccount?.accountBalance || 0);

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

    return (
        <View style={{ flex: 1, backgroundColor: '#f9fafb', position: 'relative' }}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingTop: 60, paddingHorizontal: isMobile ? 16 : 24, paddingBottom: 100, gap: 24 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[colorPalette?.primary || '#ef4444']} // Android
                        tintColor={colorPalette?.primary || '#ef4444'} // iOS
                        progressViewOffset={80}
                    />
                }
            >


                <View style={{ gap: 32 }}>
                    <View style={{
                        borderRadius: 24,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 8 },
                        shadowOpacity: 0.15,
                        shadowRadius: 16,
                        elevation: 8,
                        backgroundColor: '#ffffff'
                    }}>
                        <LinearGradient
                            colors={[colorPalette?.primary || '#ef4444', '#000000']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={{ borderRadius: 24, padding: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', position: 'relative', overflow: 'hidden' }}
                        >
                            {/* Left Side */}
                            <View style={{ flex: 1, justifyContent: 'center' }}>
                                <Text style={{ color: '#e5e7eb', fontSize: 16, marginBottom: 8 }}>Total Amount</Text>
                                <Text style={{ fontSize: isMobile ? 32 : 40, fontWeight: 'bold', color: '#ffffff' }}>
                                    ₱{balance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                </Text>
                            </View>

                            {/* Right Side */}
                            <View style={{ alignItems: 'flex-end', justifyContent: 'center', gap: 16 }}>
                                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                                    <Text style={{ color: '#e5e7eb', fontSize: 12 }}>
                                        Reference: <Text style={{ color: '#ffffff', fontWeight: '500' }}>{accountNo}</Text>
                                    </Text>
                                    <Text style={{ color: '#e5e7eb', fontSize: 12 }}>
                                        Due Date: <Text style={{ color: '#ffffff' }}>{dueDateString}</Text>
                                    </Text>
                                </View>

                                <Pressable
                                    onPress={handlePayNow}
                                    disabled={isPaymentProcessing}
                                    style={{
                                        borderWidth: 1,
                                        borderColor: '#ffffff',
                                        paddingHorizontal: 32,
                                        paddingVertical: 10,
                                        borderRadius: 12,
                                        opacity: isPaymentProcessing ? 0.5 : 1
                                    }}
                                >
                                    <Text style={{ color: '#ffffff', fontWeight: 'bold', textAlign: 'center' }}>
                                        {isPaymentProcessing ? '...' : 'Pay Now'}
                                    </Text>
                                </Pressable>
                            </View>
                        </LinearGradient>
                    </View>




                    {/* My Referrals Section */}
                    <View style={{ gap: 16 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Users size={20} color={colorPalette?.primary || '#ef4444'} />
                            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#111827' }}>My Referrals</Text>
                        </View>

                        <ScrollView
                            style={{ maxHeight: 270 }}
                            showsVerticalScrollIndicator={false}
                            nestedScrollEnabled={true}
                            contentContainerStyle={{ gap: 12, paddingBottom: 8 }}
                        >
                            {[
                                { name: 'Juan Dela Cruz', status: 'Active', color: '#10b981' },
                                { name: 'Maria Santos', status: 'Pending', color: '#f59e0b' },
                                { name: 'Pedro Penduko', status: 'Installation', color: '#3b82f6' },
                                { name: 'Ana Reyes', status: 'Active', color: '#10b981' },
                                { name: 'Lito Lapid', status: 'Pending', color: '#f59e0b' }
                            ].map((referral, index) => (
                                <View
                                    key={index}
                                    style={{
                                        backgroundColor: '#ffffff',
                                        borderRadius: 16,
                                        padding: 16,
                                        width: '100%',
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        shadowColor: '#000',
                                        shadowOffset: { width: 0, height: 2 },
                                        shadowOpacity: 0.05,
                                        shadowRadius: 8,
                                        elevation: 2,
                                        borderWidth: 1,
                                        borderColor: '#f3f4f6'
                                    }}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                        <View style={{
                                            width: 40,
                                            height: 40,
                                            borderRadius: 20,
                                            backgroundColor: '#f9fafb',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            borderWidth: 1,
                                            borderColor: '#f1f5f9'
                                        }}>
                                            <User size={20} color="#64748b" />
                                        </View>
                                        <View>
                                            <Text style={{ fontWeight: '600', color: '#1f2937', fontSize: 15 }}>{referral.name}</Text>
                                            <Text style={{ fontSize: 12, color: '#6b7280' }}>Ref ID: #REF-{1024 + index}</Text>
                                        </View>
                                    </View>
                                    <View style={{
                                        borderRadius: 20
                                    }}>
                                        <Text style={{ color: referral.color, fontSize: 12, fontWeight: '600' }}>{referral.status}</Text>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                        <View style={{ height: 2, backgroundColor: '#e2e8f0', marginVertical: 16, width: '80%', alignSelf: 'center', borderRadius: 1 }} />
                        {/* Promotional Ads Section */}
                        <View style={{ gap: 0 }}>
                            <View style={{ position: 'relative' }}>
                                <ScrollView
                                    ref={adsScrollRef}
                                    horizontal
                                    pagingEnabled
                                    showsHorizontalScrollIndicator={false}
                                    scrollEnabled={true}
                                    onMomentumScrollEnd={(e) => {
                                        const adWidth = width - (isMobile ? 32 : 48);
                                        const newPos = Math.round(e.nativeEvent.contentOffset.x / adWidth);
                                        handleScrollEnd(newPos);
                                    }}
                                    style={{ borderRadius: 20 }}
                                    contentOffset={{ x: width - (isMobile ? 32 : 48), y: 0 }}
                                >
                                    {displayAds.map((ad, idx) => (
                                        <View
                                            key={`${ad.id}-${idx}`}
                                            style={{
                                                width: width - (isMobile ? 32 : 48),
                                                height: 120,
                                                backgroundColor: ad.color,
                                                borderRadius: 20,
                                                padding: 24,
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <Text style={{ color: '#ffffff', fontSize: 20, fontWeight: 'bold' }}>{ad.title}</Text>
                                            <Text style={{ color: '#ffffff', opacity: 0.9, marginTop: 4 }}>{ad.desc}</Text>
                                        </View>
                                    ))}
                                </ScrollView>

                                {/* Pagination Dots */}
                                <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 12 }}>
                                    {ads.map((_, i) => {
                                        const actualActiveIndex = (currentAdPos - 1 + ads.length) % ads.length;
                                        return (
                                            <View
                                                key={i}
                                                style={{
                                                    width: 8,
                                                    height: 8,
                                                    borderRadius: 4,
                                                    backgroundColor: actualActiveIndex === i ? '#111827' : '#d1d5db'
                                                }}
                                            />
                                        );
                                    })}
                                </View>
                            </View>
                        </View>

                    </View>
                </View>
            </ScrollView>

            <Modal
                visible={showPaymentVerifyModal}
                transparent={true}
                animationType="slide"
                statusBarTranslucent={true}
                onRequestClose={handleCloseVerifyModal}
            >
                <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'transparent' }}>
                    <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onPress={handleCloseVerifyModal} />
                    <Animated.View
                        {...panResponder.panHandlers}
                        style={{
                            transform: [{ translateY: pan.y }],
                            backgroundColor: '#ffffff',
                            borderTopLeftRadius: 40,
                            borderTopRightRadius: 40,
                            width: '100%',
                            maxHeight: '90%',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: -15 },
                            shadowOpacity: 1.0,
                            shadowRadius: 40,
                            elevation: 30
                        }}
                    >

                        {/* Header */}
                        <View style={{ paddingHorizontal: 24, paddingVertical: 16, alignItems: 'center' }}>
                            <Pressable
                                onPress={handleCloseVerifyModal}
                                style={{ width: '100%', alignItems: 'center', paddingVertical: 8 }}
                            >
                                <View style={{ width: '20%', height: 3, backgroundColor: '#d1d5db', borderRadius: 2, marginBottom: 8 }} />
                            </Pressable>
                            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#111827' }}>Confirm Payment</Text>
                        </View>

                        {/* Content */}
                        <ScrollView contentContainerStyle={{ padding: 24 }}>
                            <View style={{ backgroundColor: '#f9fafb', padding: 16, borderRadius: 12, marginBottom: 24, borderWidth: 1, borderColor: '#f3f4f6' }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                                    <Text style={{ color: '#6b7280', fontSize: 14 }}>Account Name</Text>
                                    <Text style={{ fontWeight: '600', color: '#111827', fontSize: 14 }}>{displayName}</Text>
                                </View>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <Text style={{ color: '#6b7280', fontSize: 14 }}>Current Balance</Text>
                                    <Text style={{ fontWeight: 'bold', color: balance > 0 ? (colorPalette?.primary || '#ef4444') : '#16a34a', fontSize: 14 }}>
                                        ₱{balance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                    </Text>
                                </View>
                            </View>

                            {errorMessage && (
                                <View style={{ backgroundColor: (colorPalette?.primary || '#ef4444') + '15', padding: 12, borderRadius: 8, marginBottom: 24, borderWidth: 1, borderColor: (colorPalette?.primary || '#ef4444') + '30' }}>
                                    <Text style={{ color: colorPalette?.primary || '#ef4444', fontSize: 14, textAlign: 'center' }}>{errorMessage}</Text>
                                </View>
                            )}

                            <View style={{ marginBottom: 32 }}>
                                <Text style={{ fontWeight: '500', marginBottom: 8, color: '#374151', fontSize: 14 }}>Payment Amount</Text>
                                <TextInput
                                    keyboardType="decimal-pad"
                                    value={paymentAmount ? paymentAmount.toString() : ''}
                                    onChangeText={(value) => {
                                        if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                            setPaymentAmount(value === '' ? 0 : parseFloat(value) || 0);
                                        }
                                    }}
                                    placeholder="0.00"
                                    style={{ width: '100%', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, fontSize: 16, borderWidth: 1, borderColor: '#d1d5db', color: '#111827', backgroundColor: '#ffffff' }}
                                />
                                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
                                    <Text style={{ fontSize: 12, color: '#6b7280' }}>
                                        {balance > 0 ? (
                                            `Outstanding: ₱${balance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
                                        ) : (
                                            'Minimum: ₱1.00'
                                        )}
                                    </Text>
                                </View>
                            </View>

                            <Pressable
                                onPress={handleProceedToCheckout}
                                disabled={isPaymentProcessing || paymentAmount < 1}
                                style={{
                                    paddingVertical: 12,
                                    borderRadius: 50,
                                    backgroundColor: colorPalette?.primary || '#ef4444',
                                    opacity: (isPaymentProcessing || paymentAmount < 1) ? 0.5 : 1,
                                    width: '50%',
                                    alignSelf: 'center',
                                    alignItems: 'center'
                                }}
                            >
                                <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 16 }}>
                                    {isPaymentProcessing ? 'Processing...' : 'Pay'}
                                </Text>
                            </Pressable>

                            {/* Spacer to handle safe area if needed or just padding */}
                            <View style={{ height: 24 }} />
                        </ScrollView>
                    </Animated.View>
                </View>
            </Modal>

            {
                showPaymentLinkModal && paymentLinkData && (
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
                )
            }

            {
                showPendingPaymentModal && pendingPayment && (
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
                )
            }
        </View >
    );
};

export default DashboardCustomer;
