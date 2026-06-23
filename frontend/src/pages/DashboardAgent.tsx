import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, useWindowDimensions, Animated, RefreshControl, StyleSheet, DeviceEventEmitter, Modal } from 'react-native';
import { RefreshCcw, TrendingUp, Calendar, ChevronDown, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, LinearGradient as SvgGradient, Stop, Polyline, Circle, Path, Rect } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import dayjs from 'dayjs';
import { useCustomerDataContext } from '../contexts/CustomerDataContext';
import { useApplicationContext } from '../contexts/ApplicationContext';
import { useJobOrderContext } from '../contexts/JobOrderContext';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';
import { fetchAgentCommissionHistory, fetchAgentCommissionTrend } from '../services/api';

interface DashboardAgentProps {
    onNavigate?: (section: string, tab?: string) => void;
}

const DashboardAgent: React.FC<DashboardAgentProps> = ({ onNavigate }) => {
    const { width, height } = useWindowDimensions();
    const isMobile = width < 768;
    const isShort = height < 700;
    const { customerDetail, payments, isLoading: contextLoading, silentRefresh: customerRefresh } = useCustomerDataContext();
    const { applications, silentRefresh: applicationsRefresh } = useApplicationContext();
    const { jobOrders, silentRefresh: jobOrdersRefresh } = useJobOrderContext();
    const [user, setUser] = useState<any>(null);
    const [cashouts, setCashouts] = useState<any[]>([]);
    const [trendData, setTrendData] = useState<{ points: number[], labels: string[] }>({ points: [0,0,0,0], labels: ['','','',''] });
    const [stats, setStats] = useState<any>(null);
    const [agentBalance, setAgentBalance] = useState<number>(0);
    const [agentIncentives, setAgentIncentives] = useState<number>(0);
    const [agentBonus, setAgentBonus] = useState<number>(0);
    const [selectedBar, setSelectedBar] = useState<{ index: number, value: number, label: string } | null>(null);

    const latestCashouts = useMemo(() => {
        return (cashouts || []).slice(0, 5);
    }, [cashouts]);

    const formatDate = useCallback((dateStr?: string) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    }, []);

    const [colorPalette, setColorPalette] = useState<ColorPalette | null>(() => settingsColorPaletteService.getActiveSync());
    const [refreshing, setRefreshing] = useState(false);
    const [isCardFlipped, setIsCardFlipped] = useState(false);
    const [graphFilter, setGraphFilter] = useState<'monthly' | '3months' | 'yearly' | '5years'>('monthly');
    const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
    const flipAnim = React.useRef(new Animated.Value(0)).current;

    const getFilterLabel = (filter: string) => {
        switch (filter) {
            case 'monthly': return 'Monthly';
            case '3months': return '3 Months';
            case 'yearly': return 'Yearly';
            case '5years': return '5 Years';
            default: return 'Filter';
        }
    };

    const graphData = useMemo(() => {
        return trendData;
    }, [trendData]);

    const handleFlipCard = useCallback(() => {
        Animated.timing(flipAnim, {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
        }).start(() => {
            setIsCardFlipped(prev => !prev);
            Animated.timing(flipAnim, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true,
            }).start();
        });
    }, [flipAnim]);

    const cardScaleY = flipAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0]
    });

    const displayName = customerDetail?.fullName || user?.full_name || 'Agent';
    const initials = (customerDetail?.firstName && customerDetail?.lastName)
        ? `${customerDetail.firstName.charAt(0)}${customerDetail.lastName.charAt(0)}`.toUpperCase()
        : displayName.split(' ').map((n: any) => n[0]).join('').substring(0, 2).toUpperCase();
    const accountNo = customerDetail?.billingAccount?.accountNo || user?.username || 'N/A';
    const emailAddress = customerDetail?.emailAddress || user?.email || 'N/A';
    const balance = stats ? Number(stats.total.replace(/[^0-9.]/g, '')) : Number(customerDetail?.billingAccount?.accountBalance || 0);

    const agentEmail = user?.email || '';
    const agentName = user?.full_name || '';

    const { referredCount, onboardReferredCount } = useMemo(() => {
        if (!agentEmail && !agentName) return { referredCount: 0, onboardReferredCount: 0 };

        const filtered = jobOrders.filter(jo => {
            const referredBy = (jo.Referred_By || jo.referred_by || '').toLowerCase();
            return (agentEmail && referredBy.includes(agentEmail.toLowerCase())) || 
                   (agentName && referredBy.includes(agentName.toLowerCase()));
        });

        const inProgress = filtered.filter(jo => {
            const status = (jo.Onsite_Status || jo.onsite_status || '').toLowerCase().trim();
            return status === 'in progress' || status === 'inprogress' || status === 'in-progress';
        }).length;

        const onboard = filtered.filter(jo => {
            const status = (jo.Onsite_Status || jo.onsite_status || '').toLowerCase().trim();
            return status === 'done' || status === 'completed';
        }).length;

        return {
            referredCount: inProgress,
            onboardReferredCount: onboard
        };
    }, [jobOrders, agentEmail, agentName]);

    const fetchHistory = useCallback(async () => {
        try {
            const response = await fetchAgentCommissionHistory();
            if (response.success) {
                setCashouts(response.data);
                setAgentBalance(response.balance !== undefined ? Number(response.balance) : 0);
                setAgentIncentives(response.incentives !== undefined ? Number(response.incentives) : 0);
                setAgentBonus(response.bonus !== undefined ? Number(response.bonus) : 0);
            }
        } catch (error) {
            console.error('Failed to fetch cashout history:', error);
        }
    }, []);

    const fetchTrend = useCallback(async () => {
        try {
            const response = await fetchAgentCommissionTrend(graphFilter);
            if (response.success) {
                setTrendData(response.data);
            }
        } catch (error) {
            console.error('Failed to fetch trend data:', error);
        }
    }, [graphFilter]);

    useEffect(() => {
        const loadUser = async () => {
            const storedUser = await AsyncStorage.getItem('authData');
            if (storedUser) setUser(JSON.parse(storedUser));
        };
        loadUser();
        customerRefresh();
        applicationsRefresh();
        jobOrdersRefresh();
        fetchHistory();
        fetchTrend();
    }, [fetchHistory, fetchTrend]);

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

        const paletteSub = DeviceEventEmitter.addListener('colorPaletteChanged', (newPalette) => {
            setColorPalette(newPalette);
        });

        return () => paletteSub.remove();
    }, []);

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        try {
            await Promise.all([customerRefresh(), applicationsRefresh(), jobOrdersRefresh(), fetchHistory(), fetchTrend()]);
        } catch (error) {
            console.error('Refresh failed:', error);
        } finally {
            setRefreshing(false);
        }
    }, [customerRefresh, applicationsRefresh, jobOrdersRefresh, fetchHistory, fetchTrend]);

    const formatCurrency = useCallback((amount: number) => {
        const isNegative = amount < 0;
        const formatted = Math.abs(amount).toFixed(0).replace(/\d(?=(\d{3})+$)/g, '$&,');
        return `₱${isNegative ? '-' : ''}${formatted}`;
    }, []);

    if (contextLoading && !customerDetail) return (
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#111827" />
        </View>
    );

    return (
        <View style={styles.container}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingTop: !isMobile ? 16 : (isShort ? 20 : 60), paddingHorizontal: isMobile ? 16 : 24, paddingBottom: 100, gap: isShort ? 16 : 24 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[colorPalette?.primary || '#ef4444']}
                        tintColor={colorPalette?.primary || '#ef4444'}
                    />
                }
            >
                <View style={styles.contentGap}>
                    <View style={{ gap: 16 }}>
                        <Animated.View style={[styles.balanceCard, { transform: [{ scaleY: cardScaleY }] }]}>
                        <LinearGradient
                            colors={isCardFlipped ? ['#000000', colorPalette?.primary || '#ef4444'] : [colorPalette?.primary || '#ef4444', '#000000']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={[styles.gradientInner, { paddingVertical: isShort ? 20 : 32, paddingHorizontal: isMobile ? 20 : 28, minHeight: isShort ? 180 : 230 }]}
                        >
                            <View style={[styles.profileRow, { marginBottom: isShort ? 12 : 32, justifyContent: 'space-between' }]}>
                                <View style={[styles.initialsCircle, { width: isShort ? 44 : 50, height: isShort ? 44 : 50, borderRadius: isShort ? 22 : 25 }]}>
                                    <Text style={[styles.initialsText, { fontSize: isShort ? 18 : 20 }]}>{initials}</Text>
                                </View>
                                <View style={{ flex: 1, marginHorizontal: 12 }}>
                                    <Text
                                        allowFontScaling={false}
                                        numberOfLines={1}
                                        adjustsFontSizeToFit
                                        style={[styles.customerNameText, { fontSize: isShort ? 16 : 18 }]}
                                    >
                                        {displayName}
                                    </Text>
                                    <Text allowFontScaling={false} style={styles.customerAccountText}>Agent ID: {accountNo}</Text>
                                    {isCardFlipped && <Text allowFontScaling={false} numberOfLines={1} style={styles.customerAccountText}>{emailAddress}</Text>}
                                </View>
                                <Pressable
                                    onPress={handleFlipCard}
                                    style={({ pressed }) => ({
                                        opacity: pressed ? 0.6 : 1,
                                        padding: 8
                                    })}
                                >
                                    <RefreshCcw size={20} color="#ffffff" />
                                </Pressable>
                            </View>

                            {!isCardFlipped ? (
                                <View style={{ minHeight: isShort ? 80 : 90, justifyContent: 'center' }}>
                                        <View style={styles.billingRow}>
                                            <View style={styles.billingLeft}>
                                                <Text allowFontScaling={false} style={styles.balanceLabel}>Incentives</Text>
                                                <Text
                                                    numberOfLines={1}
                                                    adjustsFontSizeToFit
                                                    minimumFontScale={0.5}
                                                    allowFontScaling={false}
                                                    style={[styles.balanceAmountText, { fontSize: agentIncentives >= 1000 ? (isMobile ? (isShort ? 20 : 24) : 32) : (isMobile ? (isShort ? 28 : 32) : 40) }]}
                                                >
                                                    {formatCurrency(agentIncentives)}
                                                </Text>
                                            </View>
                                            <View style={[styles.billingLeft, { alignItems: 'flex-end' }]}>
                                                <Text allowFontScaling={false} style={styles.balanceLabel}>Bonus</Text>
                                                <Text
                                                    numberOfLines={1}
                                                    adjustsFontSizeToFit
                                                    minimumFontScale={0.5}
                                                    allowFontScaling={false}
                                                    style={[styles.balanceAmountText, { fontSize: agentBonus >= 1000 ? (isMobile ? (isShort ? 20 : 24) : 32) : (isMobile ? (isShort ? 28 : 32) : 40) }]}
                                                >
                                                    {formatCurrency(agentBonus)}
                                                </Text>
                                            </View>
                                        </View>
                                </View>
                            ) : (
                                <View style={{ gap: 16, minHeight: isShort ? 80 : 90, justifyContent: 'center' }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 4 }}>In Progress Referred:</Text>
                                            <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: '700' }}>{referredCount}</Text>
                                        </View>
                                        <View style={{ flex: 1, alignItems: 'flex-end' }}>
                                            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 4 }}>Onboard Referred:</Text>
                                            <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: '700' }}>{onboardReferredCount}</Text>
                                        </View>
                                    </View>
                                </View>
                            )}
                        </LinearGradient>
                    </Animated.View>

                    <View style={styles.balanceCard}>
                        <LinearGradient
                            colors={[colorPalette?.primary || '#ef4444', '#000000']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={[styles.gradientInner, { paddingVertical: isShort ? 20 : 28, paddingHorizontal: isMobile ? 20 : 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                        >
                            <View style={{ flex: 1 }}>
                                <Text allowFontScaling={false} style={{ color: '#e5e7eb', fontSize: 14, fontWeight: '600', marginBottom: 8 }}>Total Commission</Text>
                                <Text
                                    numberOfLines={1}
                                    adjustsFontSizeToFit
                                    minimumFontScale={0.5}
                                    allowFontScaling={false}
                                    style={{ fontWeight: 'bold', color: '#ffffff', fontSize: agentBalance >= 1000 ? (isMobile ? (isShort ? 32 : 36) : 44) : (isMobile ? (isShort ? 40 : 44) : 52) }}
                                >
                                    {formatCurrency(agentBalance)}
                                </Text>
                            </View>
                            <Pressable onPress={() => onNavigate && onNavigate('Application')}>
                                {({ pressed }) => (
                                    <View style={[
                                        { 
                                            backgroundColor: 'transparent', 
                                            paddingHorizontal: 16, 
                                            paddingVertical: 10, 
                                            borderRadius: 12,
                                            borderWidth: 2,
                                            borderColor: '#ffffff'
                                        },
                                        pressed && { opacity: 0.7, backgroundColor: 'rgba(255,255,255,0.1)' }
                                    ]}>
                                        <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 13 }}>
                                            Application Form
                                        </Text>
                                    </View>
                                )}
                            </Pressable>
                        </LinearGradient>
                    </View>
                </View>

                    {/* Cashout History Section */}
                    <View style={styles.sectionGap}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Cashout History</Text>
                        </View>

                        <View style={styles.referralContent}>
                            {latestCashouts.length > 0 ? (
                                latestCashouts.map((cashout: any) => (
                                    <View key={cashout.id} style={styles.paymentItem}>
                                        <View style={{ flex: 1.5 }}>
                                            <Text numberOfLines={1} ellipsizeMode="tail" style={styles.paymentRef}>Ref: {cashout.ref_number}</Text>
                                            <Text style={styles.paymentDate}>{dayjs(cashout.created_at).format('MMM DD, YYYY')}</Text>
                                        </View>
                                        <View style={styles.alignEnd}>
                                            <Text style={styles.paymentAmountValue}>{formatCurrency(Number(cashout.total_amount))}</Text>
                                            <View style={[styles.statusBadgeSmall, { backgroundColor: 'transparent' }]}>
                                                <Text style={[
                                                    styles.statusTextSmall, 
                                                    { color: '#16a34a' }
                                                ]}>
                                                    {'POSTED'}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                ))
                            ) : (
                                <View style={styles.emptyReferrals}>
                                    <Text style={styles.emptyReferralsText}>No cashouts found</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Commission Graph Section */}
                    <View style={styles.sectionGap}>
                        <View style={styles.sectionHeaderBetween}>
                            <View style={styles.sectionHeader}>
                                <TrendingUp size={20} color={colorPalette?.primary || '#ef4444'} />
                                <Text style={styles.sectionTitle}>Commission Trend</Text>
                            </View>
                            <View style={{ position: 'relative', zIndex: 100 }}>
                                <Pressable 
                                    onPress={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)} 
                                    style={styles.dropdownBtn}
                                >
                                    <Text style={styles.dropdownBtnText}>{getFilterLabel(graphFilter)}</Text>
                                    <ChevronDown size={14} color="#64748b" />
                                </Pressable>

                                {isFilterDropdownOpen && (
                                    <View style={styles.dropdownMenu}>
                                        {(['monthly', '3months', 'yearly', '5years'] as const).map((filter) => (
                                            <Pressable
                                                key={filter}
                                                onPress={() => {
                                                    setGraphFilter(filter);
                                                    setIsFilterDropdownOpen(false);
                                                }}
                                                style={[
                                                    styles.dropdownItem,
                                                    graphFilter === filter && { backgroundColor: (colorPalette?.primary || '#ef4444') + '10' }
                                                ]}
                                            >
                                                <Text style={[
                                                    styles.dropdownItemText,
                                                    graphFilter === filter && { color: colorPalette?.primary || '#ef4444', fontWeight: '700' }
                                                ]}>
                                                    {getFilterLabel(filter)}
                                                </Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                )}
                            </View>
                        </View>

                        <View style={styles.graphWrapper}>
                            <View style={styles.graphBody}>
                                <View style={styles.yAxis}>
                                    {[1, 0.75, 0.5, 0.25, 0].map((percent, i) => {
                                        const maxVal = Math.max(...graphData.points) * 1.2;
                                        return (
                                            <Text key={i} style={styles.yAxisLabel}>
                                                {formatCurrency(maxVal * percent).replace('₱', '')}
                                            </Text>
                                        );
                                    })}
                                </View>
                                <View style={styles.graphContainer}>
                                    <Svg width="100%" height={160} viewBox="0 0 400 160">
                                        <Defs>
                                            <SvgGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
                                                <Stop offset="0%" stopColor={colorPalette?.primary || '#ef4444'} stopOpacity="0.3" />
                                                <Stop offset="100%" stopColor={colorPalette?.primary || '#ef4444'} stopOpacity="0" />
                                            </SvgGradient>
                                        </Defs>
                                        
                                        {/* Grid Lines */}
                                        {[0, 1, 2, 3, 4].map((i) => (
                                            <Path
                                                key={i}
                                                d={`M 0 ${i * 40} L 400 ${i * 40}`}
                                                stroke="#f1f5f9"
                                                strokeWidth="1"
                                            />
                                        ))}

                                        {/* Bars */}
                                        {graphData.points.map((p, i) => {
                                            const maxVal = Math.max(...graphData.points);
                                            const barWidth = 24;
                                            const totalBars = graphData.points.length;
                                            const x = (i / (totalBars - 1)) * (400 - barWidth);
                                            const barHeight = maxVal > 0 ? (p / (maxVal * 1.1 + 1)) * 160 : 0;
                                            const y = 160 - barHeight;
                                            
                                            return (
                                                <Rect
                                                    key={i}
                                                    x={x}
                                                    y={y}
                                                    width={barWidth}
                                                    height={barHeight}
                                                    fill={selectedBar?.index === i ? (colorPalette?.secondary || '#000000') : (colorPalette?.primary || '#ef4444')}
                                                    rx={6}
                                                    onPress={() => setSelectedBar({ index: i, value: p, label: graphData.labels[i] })}
                                                />
                                            );
                                        })}
                                    </Svg>
                                </View>
                            </View>
                            <View style={styles.xAxisRow}>
                                {graphData.labels.map((label, i) => (
                                    <Text key={i} style={styles.labelItem}>{label}</Text>
                                ))}
                            </View>
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* Mini Modal / Tooltip */}
            {selectedBar && (
                <Modal
                    transparent={true}
                    visible={!!selectedBar}
                    animationType="fade"
                    onRequestClose={() => setSelectedBar(null)}
                >
                    <Pressable 
                        style={styles.modalOverlay} 
                        onPress={() => setSelectedBar(null)}
                    >
                        <View style={styles.tooltipCard}>
                            <View style={styles.tooltipHeader}>
                                <Text style={styles.tooltipTitle}>{selectedBar.label}</Text>
                                <Pressable onPress={() => setSelectedBar(null)}>
                                    <X size={16} color="#64748b" />
                                </Pressable>
                            </View>
                            <View style={styles.tooltipBody}>
                                <Text style={styles.tooltipLabel}>Commission Earned:</Text>
                                <Text style={[styles.tooltipValue, { color: colorPalette?.primary || '#ef4444' }]}>
                                    {formatCurrency(selectedBar.value)}
                                </Text>
                            </View>
                            <View style={styles.tooltipFooter}>
                                <Text style={styles.tooltipHint}>Click anywhere to close</Text>
                            </View>
                        </View>
                    </Pressable>
                </Modal>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    loadingContainer: { padding: 32, flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' },
    container: { flex: 1, backgroundColor: '#f9fafb', position: 'relative' },
    contentGap: { gap: 32 },
    balanceCard: { borderRadius: 24, backgroundColor: '#f9fafb' },
    gradientInner: { borderRadius: 24, paddingHorizontal: 24, position: 'relative', overflow: 'hidden' },
    profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    initialsCircle: { backgroundColor: 'rgba(255, 255, 255, 0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.3)' },
    initialsText: { color: '#ffffff', fontWeight: 'bold' },
    customerNameText: { color: '#ffffff', fontWeight: 'bold', textTransform: 'capitalize' },
    customerAccountText: { color: '#e5e7eb', fontSize: 11, opacity: 0.9 },
    billingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 },
    billingLeft: { flex: 1, minWidth: 120 },
    balanceLabel: { color: '#e5e7eb', fontSize: 12, marginBottom: 4 },
    balanceAmountText: { fontWeight: 'bold', color: '#ffffff' },
    sectionGap: { gap: 16 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
    referralContent: { gap: 12, paddingBottom: 8 },
    paymentItem: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        paddingVertical: 14, 
        backgroundColor: 'transparent', 
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9'
    },
    paymentRef: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
    paymentDate: { fontSize: 12, color: '#64748b', marginTop: 2 },
    paymentAmountValue: { fontSize: 15, fontWeight: '800', color: '#1e293b', textAlign: 'right' },
    statusBadgeSmall: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 4, alignSelf: 'flex-end' },
    statusTextSmall: { fontSize: 10, fontWeight: '800' },
    alignEnd: { alignItems: 'flex-end' },
    emptyReferrals: { padding: 40, alignItems: 'center', justifyContent: 'center' },
    emptyReferralsText: { color: '#6b7280', fontSize: 14 },
    sectionHeaderBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    filterContainer: { flexDirection: 'row', gap: 8 },
    dropdownBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#ffffff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
    dropdownBtnText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
    dropdownMenu: { position: 'absolute', top: 38, right: 0, backgroundColor: '#ffffff', borderRadius: 12, padding: 4, minWidth: 120, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5, zIndex: 1000, borderWidth: 1, borderColor: '#f1f5f9' },
    dropdownItem: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
    dropdownItemText: { fontSize: 12, color: '#64748b' },
    filterBtn: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f9fafb' },
    filterText: { fontSize: 12, color: '#64748b' },
    graphWrapper: { backgroundColor: '#f9fafb', borderRadius: 24, padding: 12 },
    graphBody: { flexDirection: 'row', height: 160, width: '100%' },
    yAxis: { width: 40, height: 160, justifyContent: 'space-between', paddingVertical: 0, marginRight: 4 },
    yAxisLabel: { fontSize: 8, color: '#94a3b8', fontWeight: '600', textAlign: 'right' },
    graphContainer: { flex: 1, height: 160 },
    xAxisRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, marginLeft: 44, paddingHorizontal: 0 },
    labelItem: { fontSize: 8, color: '#94a3b8', fontWeight: '600', textAlign: 'center', width: 24 },
    
    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    tooltipCard: { backgroundColor: '#ffffff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 300, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
    tooltipHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    tooltipTitle: { fontSize: 14, fontWeight: '600', color: '#64748b' },
    tooltipBody: { gap: 4, marginBottom: 20 },
    tooltipLabel: { fontSize: 12, color: '#94a3b8' },
    tooltipValue: { fontSize: 28, fontWeight: '800' },
    tooltipFooter: { borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 },
    tooltipHint: { fontSize: 10, color: '#cbd5e1', textAlign: 'center' },
});

export default DashboardAgent;
