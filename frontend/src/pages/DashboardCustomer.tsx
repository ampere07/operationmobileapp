import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, ActivityIndicator, Alert, Linking, useWindowDimensions, Modal, PanResponder, Animated, RefreshControl, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as LinkingExpo from 'expo-linking';
import { User, Activity, Clock, Users, FileText, CheckCircle, HelpCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

    // Use refs to avoid stale closures in PanResponder
    const panResponder = React.useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                return Math.abs(gestureState.dy) > 10;
            },
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dy > 0) {
                    pan.setValue({ x: 0, y: gestureState.dy });
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > 120) {
                    // Smoothly animate off screen before closing
                    Animated.timing(pan, {
                        toValue: { x: 0, y: 1000 },
                        duration: 250,
                        useNativeDriver: true,
                    }).start(() => {
                        const handlers = modalHandlersRef.current;
                        if (handlers.showPaymentVerifyModal) handlers.handleCloseVerifyModal();
                        else if (handlers.showPaymentLinkModal) handlers.handleCancelPaymentLink();
                        else if (handlers.showPendingPaymentModal) handlers.handleCancelPendingPayment();
                        else if (handlers.showSuccessModal) handlers.setShowSuccessModal(false);
                    });
                } else {
                    Animated.spring(pan, {
                        toValue: { x: 0, y: 0 },
                        useNativeDriver: true,
                        bounciness: 0,
                        speed: 10
                    }).start();
                }
            },
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
        dueDateString = `${String(nextDueDate.getMonth() + 1).padStart(2, '0')}/${String(nextDueDate.getDate()).padStart(2, '0')}/${nextDueDate.getFullYear()}`;
    }

    useEffect(() => {
        const loadData = async () => {
            const storedUser = await AsyncStorage.getItem('authData');
            if (storedUser) setUser(JSON.parse(storedUser));

            if (accountNo && accountNo !== 'N/A') {
                try {
                    const pending = await paymentService.checkPendingPayment(accountNo);
                    setPendingPayment(pending);
                } catch (error) {
                    console.error('Error checking pending payment:', error);
                }
            }
        };
        loadData();
        silentRefresh();
    }, [accountNo]);



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

    // Use refs to avoid stale closures in PanResponder
    const modalHandlersRef = React.useRef({
        handleCloseVerifyModal,
        handleCancelPaymentLink,
        handleCancelPendingPayment,
        setShowSuccessModal,
        showPaymentVerifyModal,
        showPaymentLinkModal,
        showPendingPaymentModal,
        showSuccessModal
    });

    useEffect(() => {
        modalHandlersRef.current = {
            handleCloseVerifyModal,
            handleCancelPaymentLink,
            handleCancelPendingPayment,
            setShowSuccessModal,
            showPaymentVerifyModal,
            showPaymentLinkModal,
            showPendingPaymentModal,
            showSuccessModal
        };
    });

    const formatCurrency = useCallback((amount: number) => {
        const isNegative = amount < 0;
        const formatted = Math.abs(amount).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
        return `₱${isNegative ? '-' : ''}${formatted}`;
    }, []);

    if (contextLoading && !customerDetail) return (
        <View style={styles.loadingContainer}>
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



    const handlePayNow = async () => {
        setErrorMessage('');

        if (pendingPayment && pendingPayment.payment_url) {
            setShowPendingPaymentModal(true);
            return;
        }

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

    function handleCloseVerifyModal() {
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
        const refNo = paymentLinkData?.referenceNo || pendingPayment?.reference_no || '';
        if (url) {
            try {
                const redirectUrl = LinkingExpo.createURL('payment-success');
                await WebBrowser.openAuthSessionAsync(url, redirectUrl);

                await silentRefresh();

                if (accountNo && accountNo !== 'N/A') {
                    const updatedPending = await paymentService.checkPendingPayment(accountNo);
                    setPendingPayment(updatedPending);
                }

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
    };

    function handleCancelPaymentLink() {
        setShowPaymentLinkModal(false);
        setPaymentLinkData(null);
    };

    const handleResumePendingPayment = () => {
        handleOpenPaymentLink();
    };

    function handleCancelPendingPayment() {
        setShowPendingPaymentModal(false);
        setPendingPayment(null);
    };

    return (
        <View style={styles.container}>
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


                <View style={styles.contentGap}>
                    <View style={styles.balanceCard}>
                        <LinearGradient
                            colors={[colorPalette?.primary || '#ef4444', '#000000']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.gradientInner}
                        >
                            <View style={styles.balanceLeft}>
                                <Text style={styles.balanceLabel}>Total Amount</Text>
                                <Text style={[styles.balanceAmountText, { fontSize: isMobile ? 32 : 40 }]}>
                                    {formatCurrency(balance)}
                                </Text>
                            </View>

                            <View style={styles.balanceRight}>
                                <View style={styles.balanceInfoRight}>
                                    <Text style={styles.infoText}>
                                        Reference: <Text style={styles.infoValue}>{accountNo}</Text>
                                    </Text>
                                    <Text style={styles.infoText}>
                                        Due Date: <Text style={{ color: '#ffffff' }}>{dueDateString}</Text>
                                    </Text>
                                </View>

                                <Pressable
                                    onPress={handlePayNow}
                                    disabled={isPaymentProcessing}
                                    style={[styles.payBtn, { opacity: isPaymentProcessing ? 0.5 : 1 }]}
                                >
                                    <View style={styles.payBtnInner}>
                                        <Text style={styles.payBtnText}>
                                            {isPaymentProcessing ? '...' : (pendingPayment ? 'Proceed' : 'Pay Now')}
                                        </Text>
                                    </View>
                                </Pressable>
                            </View>
                        </LinearGradient>
                    </View>




                    {/* My Referrals Section */}
                    <View style={styles.sectionGap}>
                        <View style={styles.sectionHeader}>
                            <Users size={20} color={colorPalette?.primary || '#ef4444'} />
                            <Text style={styles.sectionTitle}>My Referrals</Text>
                        </View>

                        <ScrollView
                            style={styles.referralScroll}
                            showsVerticalScrollIndicator={false}
                            nestedScrollEnabled={true}
                            contentContainerStyle={styles.referralContent}
                        >
                            <View style={styles.emptyReferrals}>
                                <Text style={styles.emptyReferralsText}>No referrals</Text>
                            </View>
                        </ScrollView>
                        <View style={styles.divider} />
                        {/* Promotional Ads Section */}
                        <View style={styles.adsWrapper}>
                            <View style={styles.adsInner}>
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
                                            style={[styles.adCard, { width: width - (isMobile ? 32 : 48), backgroundColor: ad.color }]}
                                        >
                                            <Text style={styles.adTitle}>{ad.title}</Text>
                                            <Text style={styles.adDesc}>{ad.desc}</Text>
                                        </View>
                                    ))}
                                </ScrollView>

                                <View style={styles.dotsRow}>
                                    {ads.map((_, i) => {
                                        const actualActiveIndex = (currentAdPos - 1 + ads.length) % ads.length;
                                        return (
                                            <View
                                                key={i}
                                                style={[styles.dotBase, { backgroundColor: actualActiveIndex === i ? '#111827' : '#d1d5db' }]}
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
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
                    style={{
                        flex: 1,
                        backgroundColor: 'transparent',
                        justifyContent: 'flex-end'
                    }}
                >
                    <Pressable style={styles.modalBackdrop} onPress={handleCloseVerifyModal} />
                    <Animated.View style={[styles.modalSheet, { transform: [{ translateY: pan.y }] }]}>
                        <View {...panResponder.panHandlers} style={styles.modalHeader}>
                            <Pressable onPress={handleCloseVerifyModal} style={styles.modalHandleBtn}>
                                <View style={styles.modalHandle} />
                            </Pressable>
                            <Text style={styles.modalTitle}>Confirm Payment</Text>
                        </View>

                        <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
                            <View style={styles.verifyBox}>
                                <View style={styles.verifyRowMb}>
                                    <Text style={styles.verifyLabel}>Account Name</Text>
                                    <Text style={styles.verifyValue}>{displayName}</Text>
                                </View>
                                <View style={styles.verifyRow}>
                                    <Text style={styles.verifyLabel}>Current Balance</Text>
                                    <Text style={[styles.verifyValue, { fontWeight: 'bold', color: balance > 0 ? (colorPalette?.primary || '#ef4444') : '#16a34a' }]}>
                                        {formatCurrency(balance)}
                                    </Text>
                                </View>
                            </View>

                            {errorMessage && (
                                <View style={[styles.errorBox, { backgroundColor: (colorPalette?.primary || '#ef4444') + '15', borderColor: (colorPalette?.primary || '#ef4444') + '30' }]}>
                                    <Text style={[styles.errorText, { color: colorPalette?.primary || '#ef4444' }]}>{errorMessage}</Text>
                                </View>
                            )}

                            <View style={styles.inputWrap}>
                                <Text style={styles.inputLabel}>Payment Amount</Text>
                                <TextInput
                                    keyboardType="decimal-pad"
                                    value={paymentAmount !== undefined && paymentAmount !== null ? paymentAmount.toString() : ''}
                                    onChangeText={(value) => {
                                        if (value === '' || /^-?\d*\.?\d*$/.test(value)) {
                                            const amount = value === '' || value === '-' ? 0 : parseFloat(value) || 0;
                                            setPaymentAmount(amount);

                                            if (balance > 0 && amount < balance) {
                                                setErrorMessage(`Payment amount must be at least your current balance of ${formatCurrency(balance)}`);
                                            } else {
                                                setErrorMessage('');
                                            }
                                        }
                                    }}
                                    placeholder="0.00"
                                    style={styles.inputField}
                                />
                                <View style={styles.inputHint}>
                                    <Text style={styles.inputHintText}>
                                        {balance > 0 ? `Outstanding: ${formatCurrency(balance)}` : 'Minimum: ₱1.00'}
                                    </Text>
                                </View>
                            </View>

                            <Pressable
                                onPress={handleProceedToCheckout}
                                disabled={isPaymentProcessing || paymentAmount < 1 || (balance > 0 && paymentAmount < balance)}
                                style={[styles.primaryBtn, {
                                    backgroundColor: colorPalette?.primary || '#ef4444',
                                    opacity: (isPaymentProcessing || paymentAmount < 1) ? 0.5 : 1,
                                }]}
                            >
                                <Text style={styles.primaryBtnText}>
                                    {isPaymentProcessing ? 'Processing...' : 'Pay'}
                                </Text>
                            </Pressable>

                            <View style={styles.spacer} />
                        </ScrollView>
                    </Animated.View>
                </KeyboardAvoidingView>
            </Modal>

            <Modal
                visible={showPaymentLinkModal && !!paymentLinkData}
                transparent={true}
                animationType="slide"
                statusBarTranslucent={true}
                onRequestClose={handleCancelPaymentLink}
            >
                <View style={styles.modalOverlay}>
                    <Pressable style={styles.modalBackdrop} onPress={handleCancelPaymentLink} />
                    <Animated.View style={[styles.modalSheet, { transform: [{ translateY: pan.y }] }]}>
                        <View {...panResponder.panHandlers} style={styles.modalHeader}>
                            <Pressable onPress={handleCancelPaymentLink} style={styles.modalHandleBtn}>
                                <View style={styles.modalHandle} />
                            </Pressable>
                            <Text style={styles.modalTitle}>Payment Link Created!</Text>
                        </View>

                        <ScrollView contentContainerStyle={styles.modalContent}>
                            <View style={styles.verifyBox}>
                                <View style={styles.verifyRowMb}>
                                    <Text style={styles.verifyLabel}>Reference No.</Text>
                                    <View style={styles.refRow}>
                                        <Text style={[styles.verifyValue, { textAlign: 'right' }]}>{paymentLinkData?.referenceNo}</Text>
                                    </View>
                                </View>
                                <View style={styles.verifyRow}>
                                    <Text style={styles.verifyLabel}>Payment Amount</Text>
                                    <Text style={[styles.verifyValue, { fontWeight: 'bold', color: colorPalette?.primary || '#ef4444' }]}>
                                        {formatCurrency(paymentLinkData?.amount || 0)}
                                    </Text>
                                </View>
                            </View>

                            <Text style={styles.linkDesc}>
                                Please click the button below to complete your payment.
                            </Text>

                            <Pressable onPress={handleOpenPaymentLink} style={styles.openPortalBtn}>
                                <Text style={styles.primaryBtnText}>Open Payment Portal</Text>
                            </Pressable>

                            <Pressable onPress={handleCancelPaymentLink}>
                                <Text style={styles.closeText}>Close</Text>
                            </Pressable>

                            <View style={styles.spacer} />
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
                <View style={styles.modalOverlay}>
                    <Pressable style={styles.modalBackdrop} onPress={handleCancelPendingPayment} />
                    <Animated.View style={[styles.modalSheet, { transform: [{ translateY: pan.y }] }]}>
                        <View {...panResponder.panHandlers} style={styles.modalHeader}>
                            <Pressable onPress={handleCancelPendingPayment} style={styles.modalHandleBtn}>
                                <View style={styles.modalHandle} />
                            </Pressable>
                            <Text style={styles.modalTitle}>Pending Payment Found</Text>
                        </View>

                        <ScrollView contentContainerStyle={styles.modalContent}>
                            <View style={styles.pendingBox}>
                                <View style={styles.verifyRow}>
                                    <Text style={styles.pendingLabel}>Amount Due</Text>
                                    <Text style={styles.pendingAmount}>
                                        {formatCurrency(pendingPayment?.amount || 0)}
                                    </Text>
                                </View>
                            </View>

                            <Text style={styles.pendingDesc}>
                                You have a pending payment session. Would you like to resume it?
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
                <View style={styles.modalOverlayDark}>
                    <Pressable style={styles.modalBackdrop} onPress={() => setShowSuccessModal(false)} />
                    <Animated.View style={[styles.modalSheet30, { transform: [{ translateY: pan.y }] }]}>
                        <View {...panResponder.panHandlers} style={styles.modalHeader}>
                            <View style={styles.modalHandleSm} />
                            <Text style={[styles.modalTitle, { fontWeight: '700' }]}>Payment Successful!</Text>
                        </View>
                        <ScrollView contentContainerStyle={styles.modalContentCenter}>
                            <View style={styles.successCircle}>
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
                            <View style={styles.spacerLg} />
                        </ScrollView>
                    </Animated.View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    loadingContainer: { padding: 32, flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' },
    container: { flex: 1, backgroundColor: '#f9fafb', position: 'relative' },
    contentGap: { gap: 32 },
    balanceCard: { borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 8, backgroundColor: '#ffffff' },
    gradientInner: { borderRadius: 24, padding: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', position: 'relative', overflow: 'hidden' },
    balanceLeft: { flex: 1, justifyContent: 'center' },
    balanceLabel: { color: '#e5e7eb', fontSize: 16, marginBottom: 8 },
    balanceAmountText: { fontWeight: 'bold', color: '#ffffff' },
    balanceRight: { alignItems: 'flex-end', justifyContent: 'center', gap: 16 },
    balanceInfoRight: { alignItems: 'flex-end', gap: 4 },
    infoText: { color: '#e5e7eb', fontSize: 12 },
    infoValue: { color: '#ffffff', fontWeight: '500' },
    payBtn: { borderWidth: 1, borderColor: '#ffffff', paddingHorizontal: 32, paddingVertical: 10, borderRadius: 12 },
    payBtnInner: { alignItems: 'center' },
    payBtnText: { color: '#ffffff', fontWeight: 'bold', textAlign: 'center' },
    sectionGap: { gap: 16 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
    referralScroll: { maxHeight: 270 },
    referralContent: { gap: 12, paddingBottom: 8 },
    emptyReferrals: { padding: 24, alignItems: 'center', justifyContent: 'center' },
    emptyReferralsText: { color: '#6b7280', fontSize: 14 },
    divider: { height: 2, backgroundColor: '#e2e8f0', marginVertical: 16, width: '80%', alignSelf: 'center', borderRadius: 1 },
    adsWrapper: { gap: 0 },
    adsInner: { position: 'relative' },
    adCard: { height: 120, borderRadius: 20, padding: 24, justifyContent: 'center' },
    adTitle: { color: '#ffffff', fontSize: 20, fontWeight: 'bold' },
    adDesc: { color: '#ffffff', opacity: 0.9, marginTop: 4 },
    dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 12 },
    dotBase: { width: 8, height: 8, borderRadius: 4 },
    // Modal styles
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'transparent' },
    modalOverlayDark: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
    modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    modalSheet: { backgroundColor: '#ffffff', borderTopLeftRadius: 40, borderTopRightRadius: 40, width: '100%', maxHeight: '90%', shadowColor: '#000', shadowOffset: { width: 0, height: -15 }, shadowOpacity: 1.0, shadowRadius: 40, elevation: 30 },
    modalSheet30: { backgroundColor: '#ffffff', borderTopLeftRadius: 30, borderTopRightRadius: 30, width: '100%', maxHeight: '90%', shadowColor: '#000', shadowOffset: { width: 0, height: -15 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 20 },
    modalHeader: { paddingHorizontal: 24, paddingVertical: 16, alignItems: 'center', backgroundColor: 'transparent' },
    modalHandleBtn: { width: '100%', alignItems: 'center', paddingVertical: 8 },
    modalHandle: { width: '20%', height: 3, backgroundColor: '#d1d5db', borderRadius: 2, marginBottom: 8 },
    modalHandleSm: { width: 40, height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, marginBottom: 12 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
    modalContent: { padding: 24 },
    modalContentCenter: { padding: 24, alignItems: 'center' },
    verifyBox: { backgroundColor: '#f9fafb', padding: 16, borderRadius: 12, marginBottom: 24, borderWidth: 1, borderColor: '#f3f4f6' },
    verifyRowMb: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    verifyRow: { flexDirection: 'row', justifyContent: 'space-between' },
    verifyLabel: { color: '#6b7280', fontSize: 14 },
    verifyValue: { fontWeight: '600', color: '#111827', fontSize: 14 },
    errorBox: { padding: 12, borderRadius: 8, marginBottom: 24, borderWidth: 1 },
    errorText: { fontSize: 14, textAlign: 'center' },
    inputWrap: { marginBottom: 32 },
    inputLabel: { fontWeight: '500', marginBottom: 8, color: '#374151', fontSize: 14 },
    inputField: { width: '100%', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, fontSize: 16, borderWidth: 1, borderColor: '#d1d5db', color: '#111827', backgroundColor: '#ffffff' },
    inputHint: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
    inputHintText: { fontSize: 12, color: '#6b7280' },
    primaryBtn: { paddingVertical: 12, borderRadius: 50, width: '50%', alignSelf: 'center', alignItems: 'center' },
    primaryBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 16 },
    spacer: { height: 24 },
    spacerLg: { height: 40 },
    refRow: { flex: 1, alignItems: 'flex-end', marginLeft: 16 },
    linkDesc: { color: '#4b5563', marginBottom: 24, textAlign: 'center', fontSize: 15 },
    openPortalBtn: { paddingVertical: 12, borderRadius: 50, backgroundColor: '#16a34a', width: '60%', alignSelf: 'center', alignItems: 'center', marginBottom: 16 },
    closeText: { color: '#6b7280', textDecorationLine: 'underline', fontSize: 14, textAlign: 'center' },
    pendingBox: { backgroundColor: '#fef3c7', padding: 16, borderRadius: 12, marginBottom: 24, borderWidth: 1, borderColor: '#fde68a' },
    pendingLabel: { color: '#92400e', fontSize: 14 },
    pendingAmount: { fontWeight: 'bold', color: '#92400e', fontSize: 14 },
    pendingDesc: { color: '#4b5563', marginBottom: 32, textAlign: 'center', fontSize: 15 },
    pendingBtns: { gap: 12 },
    resumeBtn: { paddingVertical: 12, borderRadius: 50, alignItems: 'center' },
    cancelBtn: { paddingVertical: 12, borderRadius: 50, backgroundColor: '#f3f4f6', alignItems: 'center' },
    cancelBtnText: { color: '#111827', fontWeight: 'bold', fontSize: 16 },
    successCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
    successDesc: { fontSize: 16, color: '#4b5563', textAlign: 'center', marginBottom: 32, lineHeight: 22 },
    successBtn: { paddingVertical: 16, borderRadius: 16, width: '100%', alignItems: 'center' },
    kav: { flex: 1, backgroundColor: 'transparent', justifyContent: 'flex-end' },
});

export default DashboardCustomer;
