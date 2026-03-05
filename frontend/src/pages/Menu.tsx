import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, useWindowDimensions, ActivityIndicator, Image, Modal, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
    User,
    Settings,
    Bell,
    Shield,
    CreditCard,
    HelpCircle,
    ChevronRight,
    LogOut,
    Info,
    Mail
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';
import { formUIService } from '../services/formUIService';
import { useCustomerDataContext } from '../contexts/CustomerDataContext';

interface MenuProps {
    onLogout?: () => void;
}

const Menu: React.FC<MenuProps> = ({ onLogout }) => {
    const { width } = useWindowDimensions();
    const isMobile = width < 768;
    const { customerDetail, isLoading: contextLoading } = useCustomerDataContext();
    const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);
    const [userData, setUserData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    const convertGoogleDriveUrl = (url: string): string => {
        if (!url) return '';
        const apiUrl = process.env.REACT_APP_API_URL || 'https://backend.atssfiber.ph/api';
        return `${apiUrl}/proxy/image?url=${encodeURIComponent(url)}`;
    };

    useEffect(() => {
        const initialize = async () => {
            try {
                const [palette, authData] = await Promise.all([
                    settingsColorPaletteService.getActive(),
                    AsyncStorage.getItem('authData')
                ]);
                setColorPalette(palette);
                if (authData) {
                    setUserData(JSON.parse(authData));
                }

                // Fetch Logo
                const config = await formUIService.getConfig();
                if (config && config.logo_url) {
                    setLogoUrl(convertGoogleDriveUrl(config.logo_url));
                }
            } catch (err) {
                console.error('Failed to initialize Menu:', err);
            } finally {
                setIsLoading(false);
            }
        };

        initialize();
    }, []);

    const menuGroups = [
        {
            title: 'Preferences',
            items: [
                { id: 'notifications', label: 'Notifications', icon: Bell },
            ]
        },
        {
            title: 'Support & About',
            items: [
                { id: 'help', label: 'Help Center', icon: HelpCircle },
                { id: 'contact', label: 'Contact Support', icon: Mail },
                { id: 'about', label: 'About App', icon: Info },
            ]
        }
    ];

    const displayName = customerDetail?.fullName || userData?.full_name || userData?.name || 'User Name';
    const accountNo = customerDetail?.billingAccount?.accountNo || userData?.username || 'username';
    const email = customerDetail?.emailAddress || userData?.email || 'user@example.com';
    const role = userData?.role?.toUpperCase() || 'ROLE';

    if (isLoading && !customerDetail) {
        return (
            <View style={s.loadingContainer}>
                <ActivityIndicator size="large" color={colorPalette?.primary || '#ef4444'} />
            </View>
        );
    }

    return (
        <ScrollView style={s.scrollView} showsVerticalScrollIndicator={false}>
            {/* Header Section */}
            <LinearGradient
                colors={[colorPalette?.primary || '#ef4444', '#000000']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.headerGradient}
            >
                {/* Logo Section */}
                <View style={s.logoWrap}>
                    {logoUrl ? (
                        <Image source={{ uri: logoUrl }} style={s.logoImage} />
                    ) : (
                        <View style={s.logoFallbackRow}>
                            <View style={[s.logoCircle, { backgroundColor: '#ffffff' }]}>
                                <Text style={[s.logoLetter, { color: colorPalette?.primary || '#ef4444' }]}>A</Text>
                            </View>
                            <Text style={s.logoText}>
                                ATSS FIBER <Text style={s.logoTextBold}>PORTAL</Text>
                            </Text>
                        </View>
                    )}
                </View>

                {/* Profile Section */}
                <View style={s.profileRow}>
                    <View style={s.avatarCircle}>
                        <User color={colorPalette?.primary || '#ef4444'} size={32} />
                    </View>
                    <View style={s.profileInfo}>
                        <Text style={s.profileName}>{displayName}</Text>
                        <Text style={s.profileUsername}>@{accountNo}</Text>
                        <Text style={s.profileEmail}>{email}</Text>
                        <View style={s.roleBadge}>
                            <Text style={s.roleText}>{role}</Text>
                        </View>
                    </View>
                </View>
            </LinearGradient>

            {/* Menu Groups */}
            <View style={s.menuContainer}>
                {menuGroups.map((group, groupIndex) => (
                    <View key={groupIndex} style={s.groupWrap}>
                        <Text style={s.groupTitle}>{group.title}</Text>
                        <View style={s.groupCard}>
                            {group.items.map((item, itemIndex) => (
                                <Pressable
                                    key={item.id}
                                    style={({ pressed }) => [
                                        s.menuItem,
                                        { backgroundColor: pressed ? '#f9fafb' : '#ffffff' },
                                        itemIndex < group.items.length - 1 ? s.menuItemBorder : null,
                                    ]}
                                >
                                    <View style={s.menuItemLeft}>
                                        <View style={s.menuIconWrap}>
                                            <item.icon size={20} color="#4b5563" />
                                        </View>
                                        <Text style={s.menuItemLabel}>{item.label}</Text>
                                    </View>
                                </Pressable>
                            ))}
                        </View>
                    </View>
                ))}

                {/* Logout Button */}
                <View style={s.logoutWrap}>
                    <View style={[s.logoutBtn, { backgroundColor: colorPalette?.primary || '#ef4444' }]}>
                        <Pressable
                            onPress={() => setShowLogoutModal(true)}
                            style={({ pressed }) => [s.logoutPressable, { backgroundColor: pressed ? 'rgba(0,0,0,0.1)' : 'transparent' }]}
                        >
                            <Text style={s.logoutText}>Sign out</Text>
                        </Pressable>
                    </View>
                </View>

                <Text style={s.versionText}>Version 2.0.0</Text>
            </View>

            {/* Logout Confirmation Modal */}
            <Modal
                visible={showLogoutModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowLogoutModal(false)}
            >
                <View style={s.modalOverlay}>
                    <View style={s.modalCard}>
                        <Text style={s.modalTitle}>Sign Out</Text>
                        <Text style={s.modalDesc}>Are you sure you want to sign out of your account?</Text>

                        <View style={s.modalBtns}>
                            <Pressable onPress={() => setShowLogoutModal(false)} style={s.cancelBtn}>
                                <Text style={s.cancelBtnText}>Cancel</Text>
                            </Pressable>

                            <Pressable
                                onPress={() => {
                                    setShowLogoutModal(false);
                                    if (onLogout) onLogout();
                                }}
                                style={[s.confirmBtn, { backgroundColor: colorPalette?.primary || '#ef4444' }]}
                            >
                                <Text style={s.confirmBtnText}>Sign Out</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
};

const s = StyleSheet.create({
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' },
    scrollView: { flex: 1, backgroundColor: '#f9fafb' },
    headerGradient: { paddingTop: 60, paddingBottom: 30, paddingHorizontal: 24, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
    logoWrap: { marginBottom: 40, alignItems: 'center' },
    logoImage: { height: 90, width: 280, resizeMode: 'contain', tintColor: '#ffffff' },
    logoFallbackRow: { flexDirection: 'row', alignItems: 'center' },
    logoCircle: { width: 56, height: 56, borderRadius: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
    logoLetter: { fontWeight: 'bold', fontSize: 24 },
    logoText: { color: '#ffffff', fontWeight: 'bold', fontSize: 28, letterSpacing: 0.5 },
    logoTextBold: { fontWeight: '800', color: '#ffffff' },
    profileRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    avatarCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#ffffff' },
    profileInfo: { marginLeft: 20 },
    profileName: { fontSize: 22, fontWeight: 'bold', color: '#ffffff' },
    profileUsername: { fontSize: 15, color: 'rgba(255, 255, 255, 0.9)', fontWeight: '600' },
    profileEmail: { fontSize: 13, color: 'rgba(255, 255, 255, 0.7)', marginTop: 2 },
    roleBadge: { backgroundColor: 'rgba(255, 255, 255, 0.25)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, alignSelf: 'flex-start', marginTop: 12 },
    roleText: { color: '#ffffff', fontSize: 10, fontWeight: 'bold' },
    menuContainer: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },
    groupWrap: { marginBottom: 24 },
    groupTitle: { fontSize: 13, fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginLeft: 4 },
    groupCard: { backgroundColor: '#ffffff', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#f1f5f9' },
    menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16 },
    menuItemBorder: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    menuItemLeft: { flexDirection: 'row', alignItems: 'center' },
    menuIconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    menuItemLabel: { fontSize: 15, fontWeight: '500', color: '#374151', marginLeft: 14 },
    logoutWrap: { width: '100%', alignItems: 'center', marginTop: 10 },
    logoutBtn: { borderRadius: 24, width: '60%', height: 48, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3, overflow: 'hidden' },
    logoutPressable: { width: '100%', height: '100%' },
    logoutText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', textAlign: 'center', lineHeight: 48, width: '100%' },
    versionText: { textAlign: 'center', color: '#9ca3af', fontSize: 12, marginTop: 32 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    modalCard: { backgroundColor: '#ffffff', borderRadius: 24, padding: 24, width: '100%', maxWidth: 400, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 15, elevation: 10 },
    modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#111827', marginBottom: 12, textAlign: 'center', marginTop: 12 },
    modalDesc: { fontSize: 16, color: '#6b7280', textAlign: 'center', marginBottom: 32, lineHeight: 24 },
    modalBtns: { flexDirection: 'row', gap: 12, width: '100%' },
    cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#f3f4f6', alignItems: 'center' },
    cancelBtnText: { fontSize: 16, fontWeight: '600', color: '#4b5563' },
    confirmBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    confirmBtnText: { fontSize: 16, fontWeight: '600', color: '#ffffff' },
});

export default Menu;
