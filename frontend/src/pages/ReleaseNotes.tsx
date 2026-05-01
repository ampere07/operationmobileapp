import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, useWindowDimensions, LayoutAnimation, Platform, UIManager } from 'react-native';
import { ChevronDown, ChevronUp, Calendar, Tag, ChevronLeft } from 'lucide-react-native';
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
    updates: string[];
}

interface ReleaseNotesProps {
    onBack: () => void;
}

const ReleaseNotes: React.FC<ReleaseNotesProps> = ({ onBack }) => {
    const { width } = useWindowDimensions();
    const isMobile = width < 768;
    const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);

    const notes: ReleaseNote[] = [
        {
            version: '2.5.15',
            date: 'May 1, 2026',
            title: 'Role-Based Permissions & UI Optimizations',
            updates: [
                'Mandatory Attendance: Technicians are now required to "Time In" before they can access Job Orders. The modal cannot be dismissed until they are clocked in.',
                'Dashboard UI: Fixed an issue where high account balances (thousands) would wrap to two lines. The font size now dynamically adjusts to stay on a single line.',
                // 'Field Security: Restricted the "Support Status" field in Service Order Edit modal to be read-only for Technicians.',
                'Login Flow: Technicians are now automatically checked for their attendance status immediately after login or when opening the app.',
                'New Section: Added this Release Notes page to keep track of application improvements.'
            ]
        },
        {
            version: '2.5.14',
            date: 'April 18, 2026',
            title: 'Technician Attendance & Modal Improvements',
            updates: [
                'Time In/Out Modal: Finalized the attendance tracking modal with mobile-friendly swipe gestures.',
                // 'Audit Trail Logging: Fixed issues with "Referred By" field logging in application updates.',
                // 'Live Monitor: Added "Time Out" functionality for administrators to manage technician shifts.',
                'Service Restrictions: Blocked technicians from starting orders if they haven\'t timed in.'
            ]
        }
    ];

    useEffect(() => {
        const fetchPalette = async () => {
            const palette = await settingsColorPaletteService.getActive();
            setColorPalette(palette);
        };
        fetchPalette();
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
                            <View key={uIdx} style={{ flexDirection: 'row', marginBottom: 5 }}>
                                <Text style={{ marginRight: 10, color: primaryColor }}>•</Text>
                                <Text style={{ flex: 1, color: '#333' }}>{update}</Text>
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
