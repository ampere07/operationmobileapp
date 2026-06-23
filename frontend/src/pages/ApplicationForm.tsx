import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet, ActivityIndicator, Alert, useWindowDimensions, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createApplication, uploadApplicationImages } from '../services/api';
import { getRegions, getCities, getBoroughs, Region, City, Borough } from '../services/cityService';
import { planService, Plan } from '../services/planService';
import ImagePreview from '../components/ImagePreview';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';

const ApplicationForm = ({ onClose }: { onClose?: () => void }) => {
    const { width } = useWindowDimensions();
    const isMobile = width < 768;
    const insets = useSafeAreaInsets();
    
    const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const [formData, setFormData] = useState({
        email_address: '',
        first_name: '',
        middle_initial: '',
        last_name: '',
        mobile_number: '',
        secondary_mobile_number: '',
        region: '',
        city: '',
        barangay: '',
        installation_address: '',
        landmark: '',
        referred_by: 'None / Walk-in',
        desired_plan: '',
        created_by_user_id: null as number | null
    });

    const [documents, setDocuments] = useState({
        proof_of_billing: null as any,
        government_valid_id: null as any,
        secondary_government_valid_id: null as any,
        house_front_image: null as any
    });

    const [imagePreviews, setImagePreviews] = useState({
        proof_of_billing: null as string | null,
        government_valid_id: null as string | null,
        secondary_government_valid_id: null as string | null,
        house_front_image: null as string | null
    });

    const [regions, setRegions] = useState<Region[]>([]);
    const [cities, setCities] = useState<City[]>([]);
    const [barangays, setBarangays] = useState<Borough[]>([]);
    const [plans, setPlans] = useState<Plan[]>([]);

    const [selectedRegionId, setSelectedRegionId] = useState<number | null>(null);
    const [selectedCityId, setSelectedCityId] = useState<number | null>(null);

    useEffect(() => {
        settingsColorPaletteService.getActive().then(setColorPalette);
        
        const fetchData = async () => {
            try {
                const authData = await AsyncStorage.getItem('authData');
                if (authData) {
                    const user = JSON.parse(authData);
                    if (user) {
                        setFormData(prev => ({
                            ...prev,
                            ...(user.full_name ? { referred_by: user.full_name } : {}),
                            ...(user.id ? { created_by_user_id: user.id } : {})
                        }));
                    }
                }

                const [r, c, b, p] = await Promise.all([
                    getRegions(),
                    getCities(),
                    getBoroughs(),
                    planService.getAllPlans()
                ]);
                setRegions(r);
                setCities(c);
                setBarangays(b);
                setPlans(p);
            } catch (err) {
                console.error("Failed to load data", err);
            }
        };
        fetchData();
    }, []);

    const handleTextChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleRegionChange = (regionName: string) => {
        const selected = regions.find(r => r.name === regionName);
        setSelectedRegionId(selected ? selected.id : null);
        setFormData(prev => ({ ...prev, region: regionName, city: '', barangay: '' }));
        setSelectedCityId(null);
    };

    const handleCityChange = (cityName: string) => {
        const selected = cities.find(c => c.name === cityName);
        setSelectedCityId(selected ? selected.id : null);
        setFormData(prev => ({ ...prev, city: cityName, barangay: '' }));
    };

    const handleImageUpload = (field: keyof typeof documents, file: any) => {
        setDocuments(prev => ({ ...prev, [field]: file }));
        setImagePreviews(prev => ({ ...prev, [field]: file ? file.uri : null }));
    };

    const handleSubmit = async () => {
        // Basic validation
        if (!formData.email_address || !formData.first_name || !formData.last_name || !formData.mobile_number || 
            !formData.region || !formData.city || !formData.barangay || !formData.installation_address || !formData.desired_plan) {
            Alert.alert('Missing Fields', 'Please fill in all required fields marked with *');
            return;
        }

        if (!documents.government_valid_id) {
            Alert.alert('Missing Document', 'Government Valid ID (Primary) is required.');
            return;
        }

        setIsLoading(true);
        try {
            // 1. Create Application
            const appResult = await createApplication(formData);
            
            if (appResult.success && appResult.application?.id) {
                // 2. Upload Documents if any
                const formDataPayload = new FormData();
                let hasFiles = false;

                Object.entries(documents).forEach(([key, file]) => {
                    if (file) {
                        hasFiles = true;
                        formDataPayload.append(key, {
                            uri: file.uri,
                            name: file.name || `${key}.jpg`,
                            type: file.mimeType || 'image/jpeg'
                        } as any);
                    }
                });

                if (hasFiles) {
                    await uploadApplicationImages(appResult.application.id, formDataPayload);
                }

                Alert.alert('Success', 'Application submitted successfully!');
                
                // Reset form
                setFormData(prev => ({
                    email_address: '', first_name: '', middle_initial: '', last_name: '',
                    mobile_number: '', secondary_mobile_number: '', region: '', city: '',
                    barangay: '', installation_address: '', landmark: '', referred_by: prev.referred_by,
                    desired_plan: '', created_by_user_id: prev.created_by_user_id
                }));
                setDocuments({
                    proof_of_billing: null, government_valid_id: null,
                    secondary_government_valid_id: null, house_front_image: null
                });
                setImagePreviews({
                    proof_of_billing: null, government_valid_id: null,
                    secondary_government_valid_id: null, house_front_image: null
                });
            } else {
                throw new Error(appResult.message || 'Failed to create application');
            }
        } catch (error: any) {
            Alert.alert('Error', error?.response?.data?.message || error.message || 'An error occurred during submission.');
        } finally {
            setIsLoading(false);
        }
    };

    const renderInput = (label: string, field: keyof typeof formData, placeholder: string, required = false, isMultiline = false) => (
        <View style={styles.inputContainer}>
            <Text style={styles.label}>
                {label} {required && <Text style={styles.required}>*</Text>}
            </Text>
            <TextInput
                style={[styles.input, isMultiline && styles.textArea]}
                placeholder={placeholder}
                placeholderTextColor="#94a3b8"
                value={String(formData[field] || '')}
                onChangeText={(val) => handleTextChange(field, val)}
                multiline={isMultiline}
                numberOfLines={isMultiline ? 4 : 1}
                textAlignVertical={isMultiline ? 'top' : 'center'}
            />
        </View>
    );

    const filteredCities = cities.filter(c => c.region_id === selectedRegionId);
    const filteredBarangays = barangays.filter(b => b.city_id === selectedCityId);

    // Upload component removed in favor of ImagePreview

    return (
        <View style={styles.mainContainer}>
            <View style={{ height: insets?.top || 0, backgroundColor: '#ffffff' }} />
            <View style={styles.header}>
                <Pressable
                    onPress={onClose}
                    disabled={isLoading}
                    style={styles.cancelButton}
                >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>

                <View style={styles.headerTitleContainer}>
                    <Text numberOfLines={1} ellipsizeMode="tail" style={styles.headerTitle}>
                        Application Form
                    </Text>
                </View>

                <View style={styles.submitHeaderContainer}>
                    <TouchableOpacity
                        onPress={handleSubmit}
                        disabled={isLoading}
                        style={[styles.submitHeaderButton, {
                            backgroundColor: colorPalette?.primary || '#7c3aed',
                            opacity: isLoading ? 0.6 : 1,
                        }]}
                    >
                        <Text style={styles.submitHeaderButtonText}>
                            {isLoading ? 'Saving...' : 'Save'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
                <ScrollView style={styles.container} contentContainerStyle={[styles.content, isMobile && { padding: 16 }, { paddingBottom: 100 }]}>
                    <View style={styles.card}>

                <View style={styles.row}>
                    <View style={styles.col}>{renderInput('Email', 'email_address', 'Enter your email address', true)}</View>
                    <View style={styles.col}>{renderInput('First Name', 'first_name', 'Enter your first name', true)}</View>
                </View>

                <View style={styles.row}>
                    <View style={styles.col}>{renderInput('Middle Initial', 'middle_initial', 'M')}</View>
                    <View style={styles.col}>{renderInput('Last Name', 'last_name', 'Enter your last name', true)}</View>
                </View>

                <View style={styles.row}>
                    <View style={styles.col}>
                        {renderInput('Mobile', 'mobile_number', '09********', true)}
                        <Text style={styles.formatHint}>Format: 09********</Text>
                    </View>
                    <View style={styles.col}>
                        {renderInput('Secondary Mobile', 'secondary_mobile_number', '09********')}
                    </View>
                </View>

                <Text style={styles.sectionTitle}>Installation Address</Text>
                
                <View style={styles.row}>
                    <View style={styles.col}>
                        <Text style={styles.label}>Region <Text style={styles.required}>*</Text></Text>
                        <View style={styles.pickerWrapper}>
                            <Picker
                                selectedValue={formData.region}
                                onValueChange={handleRegionChange}
                                style={styles.picker}
                            >
                                <Picker.Item label="Select region" value="" color="#94a3b8" />
                                {regions.map(r => (
                                    <Picker.Item key={r.id} label={r.name} value={r.name} />
                                ))}
                            </Picker>
                        </View>
                    </View>
                    <View style={styles.col}>
                        <Text style={styles.label}>City/Municipality <Text style={styles.required}>*</Text></Text>
                        <View style={[styles.pickerWrapper, !selectedRegionId && { opacity: 0.5 }]}>
                            <Picker
                                selectedValue={formData.city}
                                onValueChange={handleCityChange}
                                style={styles.picker}
                                enabled={!!selectedRegionId}
                            >
                                <Picker.Item label="Select city/municipality" value="" color="#94a3b8" />
                                {filteredCities.map(c => (
                                    <Picker.Item key={c.id} label={c.name} value={c.name} />
                                ))}
                            </Picker>
                        </View>
                    </View>
                </View>

                <View style={[styles.row, { width: isMobile ? '100%' : '50%', paddingRight: isMobile ? 0 : 8 }]}>
                    <View style={styles.col}>
                        <Text style={styles.label}>Barangay <Text style={styles.required}>*</Text></Text>
                        <View style={[styles.pickerWrapper, !selectedCityId && { opacity: 0.5 }]}>
                            <Picker
                                selectedValue={formData.barangay}
                                onValueChange={(val) => handleTextChange('barangay', val)}
                                style={styles.picker}
                                enabled={!!selectedCityId}
                            >
                                <Picker.Item label="Select barangay" value="" color="#94a3b8" />
                                {filteredBarangays.map(b => (
                                    <Picker.Item key={b.id} label={b.name} value={b.name} />
                                ))}
                            </Picker>
                        </View>
                    </View>
                </View>

                {renderInput('Installation Address', 'installation_address', 'House/Unit Number & Street Name', true, true)}

                <View style={styles.row}>
                    <View style={styles.col}>{renderInput('Landmark', 'landmark', 'Enter a landmark', true)}</View>
                    <View style={styles.col}>{renderInput('Referred By', 'referred_by', 'None / Walk-in')}</View>
                </View>

                <Text style={styles.sectionTitle}>Plan Selection</Text>
                
                <View style={[styles.row, { width: isMobile ? '100%' : '50%', paddingRight: isMobile ? 0 : 8 }]}>
                    <View style={styles.col}>
                        <Text style={styles.label}>Plan <Text style={styles.required}>*</Text></Text>
                        <View style={styles.pickerWrapper}>
                            <Picker
                                selectedValue={formData.desired_plan}
                                onValueChange={(val) => handleTextChange('desired_plan', val)}
                                style={styles.picker}
                            >
                                <Picker.Item label="Select plan" value="" color="#94a3b8" />
                                {plans.map(p => {
                                    const value = `${p.name} - P${Number(p.price || 0).toFixed(2)}`;
                                    return <Picker.Item key={p.id} label={p.description || p.name} value={value} />;
                                })}
                            </Picker>
                        </View>
                    </View>
                </View>

                <Text style={styles.sectionTitle}>Upload Documents</Text>
                <Text style={styles.uploadHint}>Allowed: JPG/PNG/PDF, up to 10 MB each.</Text>

                <View style={styles.row}>
                    <View style={styles.col}>
                        <ImagePreview
                            imageUrl={imagePreviews.proof_of_billing}
                            label="Proof of Billing"
                            onUpload={(file) => handleImageUpload('proof_of_billing', file)}
                            colorPrimary={colorPalette?.primary || '#ef4444'}
                        />
                    </View>
                    <View style={styles.col}>
                        <ImagePreview
                            imageUrl={imagePreviews.government_valid_id}
                            label="Government Valid ID (Primary)"
                            required={true}
                            onUpload={(file) => handleImageUpload('government_valid_id', file)}
                            colorPrimary={colorPalette?.primary || '#ef4444'}
                        />
                    </View>
                </View>

                <View style={styles.row}>
                    <View style={styles.col}>
                        <ImagePreview
                            imageUrl={imagePreviews.secondary_government_valid_id}
                            label="Government Valid ID (Secondary)"
                            onUpload={(file) => handleImageUpload('secondary_government_valid_id', file)}
                            colorPrimary={colorPalette?.primary || '#ef4444'}
                        />
                    </View>
                    <View style={styles.col}>
                        <ImagePreview
                            imageUrl={imagePreviews.house_front_image}
                            label="House Front Picture"
                            onUpload={(file) => handleImageUpload('house_front_image', file)}
                            colorPrimary={colorPalette?.primary || '#ef4444'}
                        />
                    </View>
                </View>

            </View>
        </ScrollView>
        </KeyboardAvoidingView>
    </View>
    );
};

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: '#f1f5f9',
    },
    container: {
        flex: 1,
    },
    content: {
        padding: 32,
        alignItems: 'center',
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 32,
        width: '100%',
        maxWidth: 1000,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    header: {
        backgroundColor: '#ffffff',
        borderBottomColor: '#e5e7eb',
        borderBottomWidth: 1,
        position: 'relative',
        justifyContent: 'center',
        height: 60,
        paddingHorizontal: 0,
    },
    cancelButton: {
        position: 'absolute',
        left: 16,
        zIndex: 10,
        padding: 8,
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#6b7280',
    },
    headerTitleContainer: {
        position: 'absolute',
        left: 100,
        right: 100,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
        textAlign: 'center',
    },
    submitHeaderContainer: {
        position: 'absolute',
        right: 16,
        zIndex: 20,
    },
    submitHeaderButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        minWidth: 80,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitHeaderButtonText: {
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0f172a',
        marginTop: 32,
        marginBottom: 16,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    row: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -8,
        marginBottom: 16,
    },
    col: {
        flex: 1,
        minWidth: 250,
        paddingHorizontal: 8,
        marginBottom: 8,
    },
    inputContainer: {
        marginBottom: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#334155',
        marginBottom: 8,
    },
    required: {
        color: '#ef4444',
    },
    input: {
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 14,
        color: '#1e293b',
        backgroundColor: '#ffffff',
    },
    textArea: {
        height: 120,
    },
    formatHint: {
        fontSize: 12,
        color: '#64748b',
        marginTop: 4,
    },
    pickerWrapper: {
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#ffffff',
    },
    picker: {
        height: 50,
        width: '100%',
    },
    uploadHint: {
        fontSize: 13,
        color: '#64748b',
        marginBottom: 16,
    },
    uploadContainer: {
        marginBottom: 8,
    },
    uploadBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 8,
        padding: 12,
        height: 50,
        backgroundColor: '#ffffff',
    },
    uploadBtnText: {
        fontSize: 14,
        color: '#475569',
        fontWeight: '500',
    },
    uploadBtnTextSuccess: {
        fontSize: 14,
        color: '#10b981',
        fontWeight: '500',
        flex: 1,
    }
});

export default ApplicationForm;
