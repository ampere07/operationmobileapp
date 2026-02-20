import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, ActivityIndicator, Alert, Linking, useWindowDimensions, Modal, PanResponder, Animated, RefreshControl } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as LinkingExpo from 'expo-linking';
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
    const [lastPaymentTime, setLastPaymentTime] = useState<number | null>(null);
    const [timeUntilNextPayment, setTimeUntilNextPayment] = useState<string>('');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
    const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);
    const [currentAdPos, setCurrentAdPos] = useState(1);
    const [refreshing, setRefreshing] = useState(false);
    const adsScrollRef = React.useRef<ScrollView>(null);

    const ads = [
        { id: 1, title: 'Payment Made Easy', desc: 'Secured Payment by Xendit', color: colorPalette?.primary || '#ef4444' },
        { id: 2, title: 'Upgrade Now', desc: 'Boost your speed message us', color: '#3b82f6' },
        { id: 3, title: 'Dont forget to pay', desc: 'Pay now', color: '#10b981' }
    ];

    const displayAds = [ads[ads.length - 1], ...ads, ads[0]];

    const pan = React.useRef(new Animated.ValueXY()).current;

    // Reset pan position when modal opens
    useEffect(() => {
        if (showPaymentVerifyModal || showPaymentLinkModal || showPendingPaymentModal || showSuccessModal) {
            pan.setValue({ x: 0, y: 0 });
        }
    }, [showPaymentVerifyModal, showPaymentLinkModal, showPendingPaymentModal, showSuccessModal]);

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
                    if (showPaymentVerifyModal) handleCloseVerifyModal();
                    else if (showPaymentLinkModal) handleCancelPaymentLink();
                    else if (showPendingPaymentModal) handleCancelPendingPayment();
                } else {
                    Animated.spring(
                        pan,
                        { toValue: { x: 0, y: 0 }, useNativeDriver: false }
                    ).start();
                }
            }
        })
    ).current;

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
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        dueDateString = `${months[nextDueDate.getMonth()]} ${nextDueDate.getDate()}, ${nextDueDate.getFullYear()}`;
    }

    useEffect(() => {
        const loadUser = async () => {
            const storedUser = await AsyncStorage.getItem('authData');
            if (storedUser) setUser(JSON.parse(storedUser));

            const lastPayment = await AsyncStorage.getItem(`lastPayment_${accountNo}`);
            if (lastPayment) setLastPaymentTime(parseInt(lastPayment));
        };
        loadUser();
        silentRefresh();
    }, [accountNo]);

    useEffect(() => {
        if (!lastPaymentTime) return;

        const updateCountdown = () => {
            const now = Date.now();
            const elapsed = now - lastPaymentTime;
            const remaining = 24 * 60 * 60 * 1000 - elapsed;

            if (remaining <= 0) {
                setLastPaymentTime(null);
                setTimeUntilNextPayment('');
                AsyncStorage.removeItem(`lastPayment_${accountNo}`);
            } else {
                const hours = Math.floor(remaining / (1000 * 60 * 60));
                const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
                setTimeUntilNextPayment(`${hours}h ${minutes}m`);
            }
        };

        updateCountdown();
        const interval = setInterval(updateCountdown, 60000); // Update every minute
        return () => clearInterval(interval);
    }, [lastPaymentTime, accountNo]);

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

    const formatCurrency = (amount: number) => {
        const isNegative = amount < 0;
        const formatted = Math.abs(amount).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
        return `₱${isNegative ? '-' : ''}${formatted}`;
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'Done': return { bg: '#dcfce7', text: '#16a34a', border: '#bbf7d0' };
            case 'Failed': return { bg: '#fee2e2', text: '#dc2626', border: '#fecaca' };
            case 'Scheduled': return { bg: '#fef3c7', text: '#ca8a04', border: '#fde68a' };
            default: return { bg: '#f3f4f6', text: '#6b7280', border: '#f3f4f6' };
        }
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
        if (paymentAmount < balance) {
            setErrorMessage(`Payment amount must be at least your current balance of ₱${formatCurrency(balance)}`);
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
            console.error('Payment error:', error);
            setErrorMessage(error.message || 'Failed to create payment. Please try again.');
        } finally {
            setIsPaymentProcessing(false);
        }
    };

    const handleOpenPaymentLink = async () => {
        const url = paymentLinkData?.paymentUrl || pendingPayment?.payment_url;
        if (url) {
            try {
                // Create a redirect URL for the app
                const redirectUrl = LinkingExpo.createURL('payment-success');

                // Open in-app browser as a session that can catch redirects
                const result = await WebBrowser.openAuthSessionAsync(url, redirectUrl);

                // Refresh data to see if balance updated
                await silentRefresh();

                // Close modals
                setShowPaymentLinkModal(false);
                setShowPendingPaymentModal(false);
                setPaymentLinkData(null);
                setPendingPayment(null);

                // If result type is success, or if the browser was closed (even manually)
                // we'll show the success modal. On mobile, openAuthSessionAsync helps 
                // the browser close automatically if the redirectUrl is hit.
                if (result.type === 'success' || result.type === 'dismiss') {
                    // Store payment time to disable Pay Now for 24 hours
                    const now = Date.now();
                    setLastPaymentTime(now);
                    await AsyncStorage.setItem(`lastPayment_${accountNo}`, now.toString());

                    setShowSuccessModal(true);
                }
            } catch (error) {
                console.error('Error opening browser:', error);
                Linking.openURL(url);
            }
        }
    };

    const handleCancelPaymentLink = () => {
        setShowPaymentLinkModal(false);
        setPaymentLinkData(null);
    };

    const handleResumePendingPayment = () => {
        handleOpenPaymentLink();
    };

    const handleCancelPendingPayment = () => {
        setShowPendingPaymentModal(false);
        setPendingPayment(null);
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#f9fafb', position: 'relative' }}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingTop: !isMobile ? 16 : 60, paddingHorizontal: isMobile ? 16 : 24, paddingBottom: 100, gap: 24 }}
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
                                    {formatCurrency(balance)}
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
                                    disabled={isPaymentProcessing || !!lastPaymentTime}
                                    style={{
                                        borderWidth: 1,
                                        borderColor: '#ffffff',
                                        paddingHorizontal: 32,
                                        paddingVertical: 10,
                                        borderRadius: 12,
                                        opacity: (isPaymentProcessing || !!lastPaymentTime) ? 0.5 : 1
                                    }}
                                >
                                    <View style={{ alignItems: 'center' }}>
                                        <Text style={{ color: '#ffffff', fontWeight: 'bold', textAlign: 'center' }}>
                                            {isPaymentProcessing ? '...' : (lastPaymentTime ? 'Wait ' + timeUntilNextPayment : 'Pay Now')}
                                        </Text>
                                    </View>
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
                            <View style={{ padding: 24, alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ color: '#6b7280', fontSize: 14 }}>No referrals</Text>
                            </View>
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
                                        {formatCurrency(balance)}
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
                                    value={paymentAmount !== undefined && paymentAmount !== null ? paymentAmount.toString() : ''}
                                    onChangeText={(value) => {
                                        if (value === '' || /^-?\d*\.?\d*$/.test(value)) {
                                            const amount = value === '' || value === '-' ? 0 : parseFloat(value) || 0;
                                            setPaymentAmount(amount);

                                            // Only show error if balance is positive and user enters less
                                            if (balance > 0 && amount < balance) {
                                                setErrorMessage(`Payment amount must be at least your current balance of ${formatCurrency(balance)}`);
                                            } else {
                                                setErrorMessage('');
                                            }
                                        }
                                    }}
                                    placeholder="0.00"
                                    style={{ width: '100%', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, fontSize: 16, borderWidth: 1, borderColor: '#d1d5db', color: '#111827', backgroundColor: '#ffffff' }}
                                />
                                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
                                    <Text style={{ fontSize: 12, color: '#6b7280' }}>
                                        {balance > 0 ? (
                                            `Outstanding: ${formatCurrency(balance)}`
                                        ) : (
                                            'Minimum: ₱1.00'
                                        )}
                                    </Text>
                                </View>
                            </View>

                            <Pressable
                                onPress={handleProceedToCheckout}
                                disabled={isPaymentProcessing || paymentAmount < 1 || (balance > 0 && paymentAmount < balance)}
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

            <Modal
                visible={showPaymentLinkModal && !!paymentLinkData}
                transparent={true}
                animationType="slide"
                statusBarTranslucent={true}
                onRequestClose={handleCancelPaymentLink}
            >
                <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'transparent' }}>
                    <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onPress={handleCancelPaymentLink} />
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
                                onPress={handleCancelPaymentLink}
                                style={{ width: '100%', alignItems: 'center', paddingVertical: 8 }}
                            >
                                <View style={{ width: '20%', height: 3, backgroundColor: '#d1d5db', borderRadius: 2, marginBottom: 8 }} />
                            </Pressable>
                            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#111827' }}>Payment Link Created!</Text>
                        </View>

                        {/* Content */}
                        <ScrollView contentContainerStyle={{ padding: 24 }}>
                            <View style={{ backgroundColor: '#f9fafb', padding: 16, borderRadius: 12, marginBottom: 24, borderWidth: 1, borderColor: '#f3f4f6' }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                                    <Text style={{ color: '#6b7280', fontSize: 14 }}>Reference No.</Text>
                                    <View style={{ flex: 1, alignItems: 'flex-end', marginLeft: 16 }}>
                                        <Text style={{ fontWeight: '600', color: '#111827', fontSize: 14, textAlign: 'right' }}>{paymentLinkData?.referenceNo}</Text>
                                    </View>
                                </View>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <Text style={{ color: '#6b7280', fontSize: 14 }}>Payment Amount</Text>
                                    <Text style={{ fontWeight: 'bold', color: colorPalette?.primary || '#ef4444', fontSize: 14 }}>
                                        {formatCurrency(paymentLinkData?.amount || 0)}
                                    </Text>
                                </View>
                            </View>

                            <Text style={{ color: '#4b5563', marginBottom: 24, textAlign: 'center', fontSize: 15 }}>
                                Please click the button below to complete your payment.
                            </Text>

                            <Pressable
                                onPress={handleOpenPaymentLink}
                                style={{
                                    paddingVertical: 12,
                                    borderRadius: 50,
                                    backgroundColor: '#16a34a',
                                    width: '60%',
                                    alignSelf: 'center',
                                    alignItems: 'center',
                                    marginBottom: 16
                                }}
                            >
                                <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 16 }}>
                                    Open Payment Portal
                                </Text>
                            </Pressable>

                            <Pressable onPress={handleCancelPaymentLink}>
                                <Text style={{ color: '#6b7280', textDecorationLine: 'underline', fontSize: 14, textAlign: 'center' }}>Close</Text>
                            </Pressable>

                            <View style={{ height: 24 }} />
                        </ScrollView>
                    </Animated.View>
                </View>
            </Modal>

            <Modal
                visible={showPendingPaymentModal && !!pendingPayment}
                transparent={true}
                animationType="slide"
                statusBarTranslucent={true}
                onRequestClose={handleCancelPendingPayment}
            >
                <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'transparent' }}>
                    <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onPress={handleCancelPendingPayment} />
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
                                onPress={handleCancelPendingPayment}
                                style={{ width: '100%', alignItems: 'center', paddingVertical: 8 }}
                            >
                                <View style={{ width: '20%', height: 3, backgroundColor: '#d1d5db', borderRadius: 2, marginBottom: 8 }} />
                            </Pressable>
                            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#111827' }}>Pending Payment Found</Text>
                        </View>

                        {/* Content */}
                        <ScrollView contentContainerStyle={{ padding: 24 }}>
                            <View style={{ backgroundColor: '#fef3c7', padding: 16, borderRadius: 12, marginBottom: 24, borderWidth: 1, borderColor: '#fde68a' }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <Text style={{ color: '#92400e', fontSize: 14 }}>Amount Due</Text>
                                    <Text style={{ fontWeight: 'bold', color: '#92400e', fontSize: 14 }}>
                                        {formatCurrency(pendingPayment?.amount || 0)}
                                    </Text>
                                </View>
                            </View>

                            <Text style={{ color: '#4b5563', marginBottom: 32, textAlign: 'center', fontSize: 15 }}>
                                You have a pending payment session. Would you like to resume it?
                            </Text>

                            <View style={{ gap: 12 }}>
                                <Pressable
                                    onPress={handleResumePendingPayment}
                                    style={{
                                        paddingVertical: 12,
                                        borderRadius: 50,
                                        backgroundColor: colorPalette?.primary || '#0f172a',
                                        alignItems: 'center'
                                    }}
                                >
                                    <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 16 }}>Resume Payment</Text>
                                </Pressable>

                                <Pressable
                                    onPress={handleCancelPendingPayment}
                                    style={{
                                        paddingVertical: 12,
                                        borderRadius: 50,
                                        backgroundColor: '#f3f4f6',
                                        alignItems: 'center'
                                    }}
                                >
                                    <Text style={{ color: '#111827', fontWeight: 'bold', fontSize: 16 }}>Cancel</Text>
                                </Pressable>
                            </View>

                            <View style={{ height: 24 }} />
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
        </View >
    );
};

export default DashboardCustomer;
