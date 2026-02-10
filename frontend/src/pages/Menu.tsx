import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, useWindowDimensions, ActivityIndicator, Image, Modal } from 'react-native';
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
    Moon,
    Sun,
    Info,
    Mail
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';
import { formUIService } from '../services/formUIService';

interface MenuProps {
    onLogout?: () => void;
}

const Menu: React.FC<MenuProps> = ({ onLogout }) => {
    const { width } = useWindowDimensions();
    const isMobile = width < 768;
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

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' }}>
                <ActivityIndicator size="large" color={colorPalette?.primary || '#ef4444'} />
            </View>
        );
    }

    return (
        <ScrollView style={{ flex: 1, backgroundColor: '#f9fafb' }} showsVerticalScrollIndicator={false}>
            {/* Header Section */}
            <LinearGradient
                colors={[colorPalette?.primary || '#ef4444', '#000000']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                    paddingTop: 60,
                    paddingBottom: 30,
                    paddingHorizontal: 24,
                    borderBottomLeftRadius: 32,
                    borderBottomRightRadius: 32,
                }}
            >
                {/* Logo Section */}
                <View style={{ marginBottom: 40, alignItems: 'center' }}>
                    {logoUrl ? (
                        <Image
                            source={{ uri: logoUrl }}
                            style={{ height: 90, width: 280, resizeMode: 'contain', tintColor: '#ffffff' }}
                        />
                    ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={{
                                width: 56,
                                height: 56,
                                backgroundColor: '#ffffff',
                                borderRadius: 28,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginRight: 16
                            }}>
                                <Text style={{ color: colorPalette?.primary || '#ef4444', fontWeight: 'bold', fontSize: 24 }}>A</Text>
                            </View>
                            <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 28, letterSpacing: 0.5 }}>
                                ATSS FIBER <Text style={{ fontWeight: '800', color: '#ffffff' }}>PORTAL</Text>
                            </Text>
                        </View>
                    )}
                </View>

                {/* Profile Section */}
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    <View style={{
                        width: 64,
                        height: 64,
                        borderRadius: 32,
                        backgroundColor: '#ffffff',
                        justifyContent: 'center',
                        alignItems: 'center',
                        borderWidth: 2,
                        borderColor: '#ffffff',
                    }}>
                        <User color={colorPalette?.primary || '#ef4444'} size={32} />
                    </View>
                    <View style={{ marginLeft: 20 }}>
                        <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#ffffff' }}>{userData?.full_name || userData?.name || 'User Name'}</Text>
                        <Text style={{ fontSize: 15, color: 'rgba(255, 255, 255, 0.9)', fontWeight: '600' }}>@{userData?.username || 'username'}</Text>
                        <Text style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.7)', marginTop: 2 }}>{userData?.email || 'user@example.com'}</Text>
                        <View style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.25)',
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 12,
                            alignSelf: 'flex-start',
                            marginTop: 12,
                        }}>
                            <Text style={{ color: '#ffffff', fontSize: 10, fontWeight: 'bold' }}>{userData?.role?.toUpperCase() || 'ROLE'}</Text>
                        </View>
                    </View>
                </View>
            </LinearGradient>

            {/* Menu Groups */}
            <View style={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 }}>
                {menuGroups.map((group, groupIndex) => (
                    <View key={groupIndex} style={{ marginBottom: 24 }}>
                        <Text style={{
                            fontSize: 13,
                            fontWeight: '600',
                            color: '#9ca3af',
                            textTransform: 'uppercase',
                            letterSpacing: 1,
                            marginBottom: 12,
                            marginLeft: 4,
                        }}>{group.title}</Text>
                        <View style={{
                            backgroundColor: '#ffffff',
                            borderRadius: 16,
                            overflow: 'hidden',
                            borderWidth: 1,
                            borderColor: '#f1f5f9',
                        }}>
                            {group.items.map((item, itemIndex) => (
                                <Pressable
                                    key={item.id}
                                    style={({ pressed }) => ({
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        paddingVertical: 14,
                                        paddingHorizontal: 16,
                                        backgroundColor: pressed ? '#f9fafb' : '#ffffff',
                                        borderBottomWidth: itemIndex === group.items.length - 1 ? 0 : 1,
                                        borderBottomColor: '#f1f5f9',
                                    })}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <View style={{
                                            width: 36,
                                            height: 36,
                                            borderRadius: 10,
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                        }}>
                                            <item.icon size={20} color="#4b5563" />
                                        </View>
                                        <Text style={{ fontSize: 15, fontWeight: '500', color: '#374151', marginLeft: 14 }}>{item.label}</Text>
                                    </View>
                                </Pressable>
                            ))}
                        </View>
                    </View>
                ))}

                {/* Logout Button */}
                <View style={{ width: '100%', alignItems: 'center', marginTop: 10 }}>
                    <View style={{
                        backgroundColor: colorPalette?.primary || '#ef4444',
                        borderRadius: 24,
                        width: '60%',
                        height: 48,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 4,
                        elevation: 3,
                        overflow: 'hidden',
                    }}>
                        <Pressable
                            onPress={() => setShowLogoutModal(true)}
                            style={({ pressed }) => ({
                                width: '100%',
                                height: '100%',
                                backgroundColor: pressed ? 'rgba(0,0,0,0.1)' : 'transparent',
                            })}
                        >
                            <Text style={{
                                color: '#ffffff',
                                fontSize: 16,
                                fontWeight: 'bold',
                                textAlign: 'center',
                                lineHeight: 48,
                                width: '100%',
                            }}>Sign out</Text>
                        </Pressable>
                    </View>
                </View>

                <Text style={{
                    textAlign: 'center',
                    color: '#9ca3af',
                    fontSize: 12,
                    marginTop: 32,
                }}>Version 2.0.0</Text>
            </View>

            {/* Logout Confirmation Modal */}
            <Modal
                visible={showLogoutModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowLogoutModal(false)}
            >
                <View style={{
                    flex: 1,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: 24
                }}>
                    <View style={{
                        backgroundColor: '#ffffff',
                        borderRadius: 24,
                        padding: 24,
                        width: '100%',
                        maxWidth: 400,
                        alignItems: 'center',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 10 },
                        shadowOpacity: 0.25,
                        shadowRadius: 15,
                        elevation: 10
                    }}>
                        <Text style={{
                            fontSize: 22,
                            fontWeight: 'bold',
                            color: '#111827',
                            marginBottom: 12,
                            textAlign: 'center',
                            marginTop: 12
                        }}>Sign Out</Text>

                        <Text style={{
                            fontSize: 16,
                            color: '#6b7280',
                            textAlign: 'center',
                            marginBottom: 32,
                            lineHeight: 24
                        }}>Are you sure you want to sign out of your account?</Text>

                        <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
                            <Pressable
                                onPress={() => setShowLogoutModal(false)}
                                style={{
                                    flex: 1,
                                    paddingVertical: 14,
                                    borderRadius: 12,
                                    backgroundColor: '#f3f4f6',
                                    alignItems: 'center'
                                }}
                            >
                                <Text style={{ fontSize: 16, fontWeight: '600', color: '#4b5563' }}>Cancel</Text>
                            </Pressable>

                            <Pressable
                                onPress={() => {
                                    setShowLogoutModal(false);
                                    if (onLogout) onLogout();
                                }}
                                style={{
                                    flex: 1,
                                    paddingVertical: 14,
                                    borderRadius: 12,
                                    backgroundColor: colorPalette?.primary || '#ef4444',
                                    alignItems: 'center'
                                }}
                            >
                                <Text style={{ fontSize: 16, fontWeight: '600', color: '#ffffff' }}>Sign Out</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
};

export default Menu;
