import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, useWindowDimensions, LayoutAnimation, Platform, UIManager } from 'react-native';
import { ChevronDown, ChevronUp, Calendar, Tag, ChevronLeft } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';
import { SafeAreaView } from 'react-native-safe-area-context';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface ReleaseNote {
    version: string;
    date: string;
    title: string;
    updates: { text: string; visibility: 'all' | 'customer' | 'technician' }[];
}

interface ReleaseNotesProps {
    onBack: () => void;
}

const ReleaseNotes: React.FC<ReleaseNotesProps> = ({ onBack }) => {
    const { width } = useWindowDimensions();
    const isMobile = width < 768;
    const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);

    const allNotes: ReleaseNote[] = [
        {
            version: '2.5.20',
            date: 'May 3, 2026',
            title: 'UI/UX Overhaul & Technician Workflow Updates',
            updates: [
                { text: 'Redesigned Customer Dashboard: Experience a more premium, modern interface with vibrant gradients, glassmorphism effects, and dynamic color palettes.', visibility: 'customer' },
                { text: 'Streamlined Menu: The Menu page has been simplified by removing redundant billing info and centering user profile details for a cleaner look.', visibility: 'all' },
                { text: 'Enhanced Mobile Support: Optimized layouts across all pages to ensure a seamless experience on various mobile screen sizes and orientations.', visibility: 'all' },
                { text: 'Service Order Efficiency: Technicians can now select and copy field values in Service Order Details for easier information sharing.', visibility: 'technician' },
                { text: 'Simplified Job Order Completion: Removed the mandatory Speed Test image requirement from the technician completion form for a faster workflow.', visibility: 'technician' },
                { text: 'Technician UI Refinement: The Menu header now displays "Username" instead of "Account No" and includes the email address for technical accounts.', visibility: 'technician' }
            ]
        },
        {
            version: '2.5.19',
            date: 'May 3, 2026',
            title: 'Forgot Password & Security Updates',
            updates: [
                { text: 'Forgot Password Cooldown: Implemented a 3-minute safety timer between recovery requests to prevent misuse and improve security.', visibility: 'all' },
                { text: 'Expanded Recovery Options: You can now recover your account using your Account Number, Email, or Username for a more flexible login experience.', visibility: 'all' }
            ]
        },
        {
            version: '2.5.18',
            date: 'May 3, 2026',
            title: 'Fullscreen Mode & Screen Sharing Fixes',
            updates: [
                { text: 'Immersive Fullscreen: The app now automatically opens in true fullscreen mode. The top status bar and bottom navigation buttons are hidden by default for an uninterrupted experience.', visibility: 'all' },
                { text: 'Login Screen Sharing: Fixed a security issue that caused the login screen to turn black when sharing your screen or recording.', visibility: 'all' }
            ]
        },
        {
            version: '2.5.17',
            date: 'May 2, 2026',
            title: 'Billing Layout & App Updates',
            updates: [
                { text: 'Bills UI Update: Unified the layout structure for Invoices, SOA, and History tabs to ensure a consistent look and feel.', visibility: 'customer' },
                { text: 'Invoice Status: Replaced the PDF download button in the Invoices tab with a dynamic status badge (PAID/UNPAID) for better clarity.', visibility: 'customer' },
                { text: 'Support Center UI: Completely redesigned the Ticket Details page for a cleaner, full-screen experience without bulky modals or drop shadows.', visibility: 'customer' }
            ]
        },
        {
            version: '2.5.16',
            date: 'May 1, 2026',
            title: 'Role-Based Permissions & UI Optimizations',
            updates: [
                { text: 'Mandatory Attendance: Technicians are now required to "Time In" before they can access Job Orders. The modal cannot be dismissed until they are clocked in.', visibility: 'technician' },
                { text: 'Dashboard UI: Fixed an issue where high account balances (thousands) would wrap to two lines. The font size now dynamically adjusts to stay on a single line.', visibility: 'customer' },
                { text: 'Login Flow: Technicians are now automatically checked for their attendance status immediately after login or when opening the app.', visibility: 'technician' },
                { text: 'New Section: Added this Release Notes page to keep track of application improvements.', visibility: 'all' }
            ]
        },
        {
            version: '2.5.14',
            date: 'April 18, 2026',
            title: 'Technician Attendance & Modal Improvements',
            updates: [
                { text: 'Time In/Out Modal: Finalized the attendance tracking modal with mobile-friendly swipe gestures.', visibility: 'technician' },
                { text: 'Service Restrictions: Blocked technicians from starting orders if they haven\'t timed in.', visibility: 'technician' }
            ]
        }
    ];

    const [notes, setNotes] = useState<ReleaseNote[]>([]);
    const [userRole, setUserRole] = useState<string>('');

    useEffect(() => {
        const initialize = async () => {
            try {
                const [palette, authData] = await Promise.all([
                    settingsColorPaletteService.getActive(),
                    AsyncStorage.getItem('authData')
                ]);
                setColorPalette(palette);

                let role = '';
                if (authData) {
                    const parsed = JSON.parse(authData);
                    role = parsed.role?.toLowerCase() || '';
                    setUserRole(role);
                }

                // Filter notes based on role
                const isCustomer = role === 'customer';
                const filteredNotes = allNotes.map(note => {
                    const visibleUpdates = note.updates.filter(u => {
                        if (u.visibility === 'all') return true;
                        if (isCustomer) return u.visibility === 'customer';
                        return u.visibility === 'technician';
                    });
                    return { ...note, updates: visibleUpdates };
                }).filter(note => note.updates.length > 0);

                setNotes(filteredNotes);
            } catch (err) {
                console.error('Failed to initialize ReleaseNotes:', err);
            }
        };
        initialize();
    }, []);

    const primaryColor = colorPalette?.primary || '#ef4444';

    console.log('[ReleaseNotes] Rendering', notes.length, 'notes');

    return (
        <SafeAreaView style={styles.safeArea}>
            {/* Custom Header */}
            <View style={[styles.header, { borderBottomColor: '#e2e8f0' }]}>
                <Pressable onPress={onBack} style={styles.backBtn}>
                    <ChevronLeft size={24} color="#000000" />
                </Pressable>
                <Text style={styles.headerTitle}>Release Notes</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.introBox}>
                    <Text style={[styles.introText, { color: '#475569' }]}>
                        Keep track of the latest features, improvements, and bug fixes in the ATSS Fiber Portal.
                    </Text>
                </View>

                {notes.map((note, index) => (
                    <View key={index} style={{ marginBottom: 30, padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' }}>
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#000', marginBottom: 5 }}>{note.date}</Text>
                        <Text style={{ fontSize: 12, color: primaryColor, marginBottom: 10 }}>Version {note.version}</Text>
                        {note.updates.map((update, uIdx) => (
                            <View key={uIdx} style={{ flexDirection: 'row', marginBottom: 12 }}>
                                <Text style={{ marginRight: 10, color: primaryColor }}>•</Text>
                                <Text style={{ flex: 1, color: '#333', lineHeight: 20 }}>{update.text}</Text>
                            </View>
                        ))}
                    </View>
                ))}

                <View style={styles.footer}>
                    <Text style={{ color: '#94a3b8', fontSize: 13 }}>You're up to date!</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#ffffff' },
    header: {
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
    },
    backBtn: { padding: 8 },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
    container: { flex: 1 },
    scrollContent: { padding: 20, paddingBottom: 40 },
    introBox: { marginBottom: 24 },
    introText: { fontSize: 14, color: '#64748b', lineHeight: 20 },
    noteCard: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        marginBottom: 16,
        overflow: 'hidden',
    },
    cardHeader: {
        padding: 20,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 10,
    },
    versionBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
    },
    versionText: { fontSize: 12, fontWeight: '700' },
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    dateText: { fontSize: 12, color: '#94a3b8', fontWeight: '500' },
    titleText: { fontSize: 16, fontWeight: '700', color: '#1e293b', paddingRight: 24 },
    toggleIcon: { position: 'absolute', right: 20, bottom: 20 },
    cardContent: { padding: 20, paddingTop: 0 },
    divider: { height: 1, marginBottom: 16 },
    updateRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 12 },
    bullet: { width: 6, height: 6, borderRadius: 3, marginTop: 7, flexShrink: 0 },
    updateText: { fontSize: 14, color: '#475569', lineHeight: 20, flex: 1 },
    footer: { marginTop: 20, alignItems: 'center' },
    footerText: { fontSize: 13, color: '#94a3b8', fontWeight: '500' },
});

export default ReleaseNotes;
