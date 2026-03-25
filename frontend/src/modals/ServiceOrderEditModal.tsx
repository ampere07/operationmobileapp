import React, { useCallback, useMemo } from 'react';
import { View, Text, TextInput, ScrollView, Modal, Pressable, Image, ActivityIndicator, Platform, KeyboardAvoidingView, StyleSheet, Alert } from 'react-native';
import { X, ChevronDown, Search, Check, ChevronLeft, Camera } from 'lucide-react-native';
import SignatureScreen from 'react-native-signature-canvas';

import ImagePreview from '../components/ImagePreview';
import { SearchablePicker, SearchablePickerTrigger } from '../components/SearchablePicker';
import { useServiceOrderEdit, ServiceOrderEditFormData, OrderItem, ImageFiles } from '../hooks/useServiceOrderEdit';

interface ServiceOrderEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (formData: any) => void;
  serviceOrderData?: any;
}

const ServiceOrderEditModal: React.FC<ServiceOrderEditModalProps> = ({
  isOpen,
  onClose,
  onSave,
  serviceOrderData
}) => {
  const isDarkMode = false; // Forced light mode as per user request
  
  const {
    formData, errors, loading, isContentReady, colorPalette, isTechnician, currentUserEmail,
    handleInputChange, handleImageUpload, handleSave,
    activePicker, setActivePicker, searchQueries, setSearchQueries, filtered,
    orderItems, setOrderItems, activeItemIndex, setActiveItemIndex, handleItemChange,
    imageFiles, isDrawingSignature, setIsDrawingSignature, signatureRef, handleSignatureOK, scrollEnabled, setScrollEnabled,
    activeTechField, setActiveTechField, setFormData,
    loadingPercentage, loadingMessage, currentStep, showLoadingModal
  } = useServiceOrderEdit(isOpen, serviceOrderData, onClose, onSave);

  const activeColor = colorPalette?.primary || '#7c3aed';

  const renderInput = useCallback((
    field: keyof ServiceOrderEditFormData,
    label: string,
    editable = true,
    keyboardType: 'default' | 'numeric' | 'email-address' = 'default',
    multiline = false
  ) => (
    <View style={styles.inputGroup}>
      <Text style={[styles.label, { color: isDarkMode ? '#d1d5db' : '#374151' }]}>
        {label} {editable && !['accountNo', 'dateInstalled', 'fullName', 'contactNumber', 'emailAddress', 'plan', 'username', 'modifiedBy'].includes(field) && <Text style={styles.required}>*</Text>}
      </Text>
      <TextInput
        style={[styles.textInput, {
          backgroundColor: !editable ? (isDarkMode ? '#374151' : '#f3f4f6') : (isDarkMode ? '#1f2937' : '#ffffff'),
          color: !editable ? (isDarkMode ? '#9ca3af' : '#6b7280') : (isDarkMode ? '#ffffff' : '#111827'),
          borderColor: errors[field] ? '#ef4444' : (!editable ? (isDarkMode ? '#4b5563' : '#e5e7eb') : (isDarkMode ? '#374151' : '#d1d5db')),
          textAlignVertical: multiline ? 'top' : 'center',
          height: multiline ? 80 : 50
        }]}
        value={String(formData[field] || '')}
        onChangeText={(text) => handleInputChange(field, text)}
        placeholder={`Enter ${label}`}
        placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
        editable={editable}
        keyboardType={keyboardType}
        multiline={multiline}
      />
      {errors[field] ? <Text style={styles.errorText}>{errors[field]}</Text> : null}
    </View>
  ), [formData, errors, isDarkMode, handleInputChange]);

  const renderPickerTrigger = useCallback((field: string, label: string, value: string, placeholder: string, required = false) => (
    <SearchablePickerTrigger
      label={label}
      value={value}
      onPress={() => {
        setActivePicker(field);
        setSearchQueries({ ...searchQueries, [field]: '' });
      }}
      error={errors[field]}
      isDarkMode={isDarkMode}
      placeholder={placeholder}
      required={required}
    />
  ), [errors, isDarkMode, searchQueries, setActivePicker, setSearchQueries]);

  if (!isOpen) return null;

  return (
    <>
      <Modal visible={isOpen} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDarkMode ? '#111827' : '#f9fafb' }]}>
            
            {/* Header */}
            <View style={[styles.header, { backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb' }]}>
              <Pressable onPress={onClose} disabled={loading} style={styles.headerLeftAction}>
                <ChevronLeft size={28} color={activeColor} />
              </Pressable>
              <View style={styles.headerTitleContainer}>
                <Text style={[styles.headerTitle, { color: isDarkMode ? '#ffffff' : '#111827' }]} numberOfLines={1}>{formData.fullName}</Text>
              </View>
              <View style={styles.headerRightAction}>
                <Pressable onPress={handleSave} disabled={loading} style={[styles.saveButton, { backgroundColor: loading ? '#9ca3af' : activeColor }]}>
                  {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveButtonText}>Save</Text>}
                </Pressable>
              </View>
            </View>

            <View style={styles.contentContainer}>
              {!isContentReady ? (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="large" color={activeColor} />
                  <Text style={styles.loadingText}>Loading form...</Text>
                </View>
              ) : (
                <ScrollView style={styles.contentContainer} contentContainerStyle={styles.scrollViewContent} scrollEnabled={scrollEnabled} keyboardShouldPersistTaps="handled">
                  
                  {/* Base Info */}
                  {renderInput('accountNo', 'Account No', false)}
                  {renderInput('dateInstalled', 'Date Installed', false)}
                  {renderInput('fullName', 'Full Name', false)}
                  {renderInput('contactNumber', 'Contact Number', false)}
                  {renderInput('emailAddress', 'Email Address', false)}
                  {renderInput('plan', 'Plan', false)}
                  {renderInput('username', 'Username', false)}
                  {renderInput('fullAddress', 'Full Address', false, 'default', true)}

                  {/* Connection Type */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: isDarkMode ? '#d1d5db' : '#374151' }]}>Connection Type</Text>
                    <View style={styles.connectionTypeContainer}>
                      <Pressable
                        onPress={() => handleInputChange('connectionType', 'Fiber')}
                        style={[styles.connectionTypeButton, {
                          backgroundColor: formData.connectionType === 'Fiber' ? activeColor : (isDarkMode ? '#1f2937' : '#ffffff'),
                          borderColor: formData.connectionType === 'Fiber' ? activeColor : (isDarkMode ? '#374151' : '#d1d5db')
                        }]}
                      >
                        <Text style={{ color: formData.connectionType === 'Fiber' ? '#ffffff' : (isDarkMode ? '#ffffff' : '#000000'), fontWeight: '500' }}>Fiber</Text>
                      </Pressable>
                    </View>
                  </View>

                  {/* READ ONLY TECH INFO */}
                  {renderInput('routerModemSN', 'Router/Modem SN', false)}
                  {renderInput('lcp', 'LCP', false)}
                  {renderInput('nap', 'NAP', false)}
                  {renderInput('port', 'PORT', false)}
                  {renderInput('vlan', 'VLAN', false)}

                  {/* STATUS SECTION */}
                  {renderPickerTrigger('supportStatus', 'Support Status', formData.supportStatus, 'Select Support Status', true)}

                  {formData.supportStatus === 'Failed' && (
                    <ImagePreview
                      label="Proof Image *"
                      imageUrl={imageFiles.proofImageFile?.uri || formData.proofImage}
                      onUpload={(file) => handleImageUpload('proofImageFile', file)}
                      error={errors.proofImageFile}
                      isDarkMode={isDarkMode}
                      colorPrimary={activeColor}
                    />
                  )}

                  {formData.supportStatus === 'For Visit' && (
                    <>
                      {renderPickerTrigger('visitStatus', 'Visit Status', formData.visitStatus, 'Select Visit Status', true)}
                      
                      <SearchablePickerTrigger
                        label="Assigned Email"
                        value={formData.assignedEmail}
                        onPress={() => setActivePicker('assignedEmail')}
                        error={errors.assignedEmail}
                        isDarkMode={isDarkMode}
                        placeholder="Select Technician"
                        required={true}
                      />

                      {formData.visitStatus === 'Done' && (
                        <>
                          {renderPickerTrigger('repairCategory', 'Repair Category', formData.repairCategory, 'Select Repair Category', true)}

                          {['Migrate', 'Relocate', 'Transfer LCP/NAP/PORT'].includes(formData.repairCategory) && (
                            <>
                              {formData.repairCategory === 'Migrate' && renderInput('newRouterModemSN', 'New Router SN')}
                              {renderPickerTrigger('lcpnaps', 'New LCP-NAP', formData.newLcpnap, 'Select LCP-NAP', true)}
                              {renderPickerTrigger('port', 'New Port', formData.newPort, 'Select Port', true)}
                              {renderPickerTrigger('vlan', 'New VLAN', formData.newVlan, 'Select VLAN', true)}
                              
                              {formData.repairCategory === 'Migrate' && renderPickerTrigger('routerModels', 'Router Model', formData.routerModel, 'Select Router Model', true)}
                            </>
                          )}

                          {(formData.repairCategory === 'Replace Router' || formData.repairCategory === 'Relocate Router') && (
                            formData.repairCategory === 'Replace Router' && renderInput('newRouterModemSN', 'New Router SN')
                          )}

                          {formData.repairCategory === 'Update Vlan' && renderPickerTrigger('vlan', 'New VLAN', formData.newVlan, 'Select VLAN', true)}

                          {/* VISIT BY / WITH */}
                          <SearchablePickerTrigger label="Visit By" value={formData.visitBy} onPress={() => { setActiveTechField('visitBy'); setActivePicker('technician'); }} error={errors.visitBy} isDarkMode={isDarkMode} required />
                          <SearchablePickerTrigger label="Visit With" value={formData.visitWith} onPress={() => { setActiveTechField('visitWith'); setActivePicker('technician'); }} error={errors.visitWith} isDarkMode={isDarkMode} />
                          <SearchablePickerTrigger label="Visit With Other" value={formData.visitWithOther} onPress={() => { setActiveTechField('visitWithOther'); setActivePicker('technician'); }} error={errors.visitWithOther} isDarkMode={isDarkMode} />

                          {renderInput('visitRemarks', 'Visit Remarks')}

                          {/* SIGNATURE SECTION */}
                          <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: isDarkMode ? '#d1d5db' : '#374151' }]}>
                              Client Signature Image<Text style={styles.required}>*</Text>
                            </Text>
                            {!isDrawingSignature ? (
                              <View>
                                <Pressable
                                  onPress={() => setIsDrawingSignature(true)}
                                  style={[styles.signatureContainer, {
                                    borderColor: errors.clientSignatureFile ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db'),
                                    backgroundColor: isDarkMode ? '#1f2937' : '#f9fafb'
                                  }]}
                                >
                                  {(imageFiles.clientSignatureFile || formData.clientSignature) ? (
                                    <Image
                                      source={{ uri: imageFiles.clientSignatureFile?.uri || formData.clientSignature }}
                                      style={{ width: '100%', height: '100%', resizeMode: 'contain' }}
                                    />
                                  ) : (
                                    <View style={styles.signaturePlaceholder}>
                                      <View style={[styles.signatureIconCircle, { backgroundColor: (activeColor || '#7c3aed') + '20' }]}>
                                        <Camera size={24} color={activeColor || '#7c3aed'} />
                                      </View>
                                      <Text style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>Tap to Draw Signature</Text>
                                    </View>
                                  )}
                                </Pressable>
                                {(imageFiles.clientSignatureFile || formData.clientSignature) && (
                                  <View style={styles.signatureActions}>
                                    <Pressable
                                      onPress={() => {
                                        handleImageUpload('clientSignatureFile', null);
                                        setFormData((prev: any) => ({ ...prev, clientSignature: '' }));
                                      }}
                                      style={styles.removeButton}
                                    >
                                      <X size={16} color="#ef4444" />
                                      <Text style={styles.removeButtonText}>Remove</Text>
                                    </Pressable>
                                    <Pressable
                                      onPress={() => setIsDrawingSignature(true)}
                                      style={[styles.redrawButton, { backgroundColor: activeColor || '#7c3aed' }]}
                                    >
                                      <Text style={styles.redrawButtonText}>Redraw</Text>
                                    </Pressable>
                                  </View>
                                )}
                              </View>
                            ) : (
                              <View style={[styles.signatureCanvasContainer, { borderColor: isDarkMode ? '#374151' : '#d1d5db', flexDirection: 'column' }]}>
                                <View style={{ flex: 1 }}>
                                  <SignatureScreen
                                    ref={signatureRef}
                                    onOK={handleSignatureOK}
                                    onEmpty={() => Alert.alert('Empty', 'Please provide a signature before saving')}
                                    onBegin={() => setScrollEnabled(false)}
                                    onEnd={() => setScrollEnabled(true)}
                                    webStyle={`.m-signature-pad--footer {display: none;} .m-signature-pad {box-shadow: none; border: none;} .m-signature-pad--body {border: none;} body,html {width: 100%; height: 100%; margin: 0; padding: 0;}`}
                                  />
                                  <Pressable
                                    onPress={() => {
                                      setIsDrawingSignature(false);
                                      setScrollEnabled(true);
                                    }}
                                    style={styles.signatureCloseButton}
                                  >
                                    <X size={20} color="#000" />
                                  </Pressable>
                                </View>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, borderTopWidth: 1, borderColor: isDarkMode ? '#4b5563' : '#e5e7eb', backgroundColor: isDarkMode ? '#374151' : '#f9fafb' }}>
                                  <Pressable onPress={() => signatureRef.current?.clearSignature()} style={{ padding: 8 }}>
                                    <Text style={{ color: '#ef4444', fontWeight: 'bold' }}>Clear</Text>
                                  </Pressable>
                                  <Pressable onPress={() => signatureRef.current?.readSignature()} style={{ paddingVertical: 8, paddingHorizontal: 16, backgroundColor: '#10b981', borderRadius: 6 }}>
                                    <Text style={{ color: 'white', fontWeight: 'bold' }}>Save</Text>
                                  </Pressable>
                                </View>
                              </View>
                            )}
                            {errors.clientSignatureFile && (
                              <Text style={[styles.errorText, { color: '#ef4444', marginTop: 4 }]}>{errors.clientSignatureFile}</Text>
                            )}
                          </View>

                          {/* ITEMS SECTION */}
                          <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: isDarkMode ? '#d1d5db' : '#374151' }]}>Items <Text style={styles.required}>*</Text></Text>
                            {orderItems.map((item, idx) => (
                              <View key={idx} style={styles.itemRow}>
                                <View style={styles.itemRowContent}>
                                  <Pressable
                                    onPress={() => { setActiveItemIndex(idx); setActivePicker('inventory'); }}
                                    style={[styles.itemPickerTrigger, { borderColor: errors.items ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db'), backgroundColor: isDarkMode ? '#1f2937' : '#ffffff' }]}
                                  >
                                    <Search size={18} color={isDarkMode ? '#9CA3AF' : '#4B5563'} />
                                    <Text style={[styles.itemSelectText, { flex: 1, paddingHorizontal: 8, color: item.itemId ? (isDarkMode ? '#ffffff' : '#111827') : (isDarkMode ? '#9ca3af' : '#6b7280') }]} numberOfLines={1}>
                                      {item.itemId || 'Select Item...'}
                                    </Text>
                                    {item.itemId ? (
                                      <Pressable onPress={() => handleItemChange(idx, 'itemId', '')} hitSlop={8} style={{ padding: 2 }}><X size={18} color={isDarkMode ? '#9ca3af' : '#6b7280'} /></Pressable>
                                    ) : (
                                      <ChevronDown size={18} color={isDarkMode ? '#9ca3af' : '#6b7280'} />
                                    )}
                                  </Pressable>

                                  {item.itemId && item.itemId !== 'None' && (
                                    <TextInput
                                      style={[styles.itemQtyInput, { borderColor: errors.items ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db'), backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', color: isDarkMode ? '#ffffff' : '#111827' }]}
                                      placeholder="Qty" placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
                                      value={item.quantity} keyboardType="numeric" onChangeText={(t) => handleItemChange(idx, 'quantity', t)}
                                    />
                                  )}

                                  {orderItems.length > 1 && (
                                    <Pressable onPress={() => { const n = [...orderItems]; n.splice(idx, 1); setOrderItems(n); }} style={styles.itemRemoveButton}><X size={20} color="#ef4444" /></Pressable>
                                  )}
                                </View>
                              </View>
                            ))}
                            {errors.items && <Text style={styles.errorText}>{errors.items}</Text>}
                          </View>

                          <ImagePreview label="Time In Image *" imageUrl={imageFiles.timeInFile?.uri || formData.timeIn} onUpload={(file) => handleImageUpload('timeInFile', file)} error={errors.timeInFile} isDarkMode={isDarkMode} colorPrimary={activeColor} />
                          <ImagePreview label="Modem Setup Image *" imageUrl={imageFiles.modemSetupFile?.uri || formData.modemSetupImage} onUpload={(file) => handleImageUpload('modemSetupFile', file)} error={errors.modemSetupFile} isDarkMode={isDarkMode} colorPrimary={activeColor} />
                          <ImagePreview label="Time Out Image" imageUrl={imageFiles.timeOutFile?.uri || formData.timeOut} onUpload={(file) => handleImageUpload('timeOutFile', file)} error={errors.timeOutFile} isDarkMode={isDarkMode} colorPrimary={activeColor} />
                        </>
                      )}

                      {(formData.visitStatus === 'Reschedule' || formData.visitStatus === 'Failed') && (
                        <>
                          <SearchablePickerTrigger label="Visit By" value={formData.visitBy} onPress={() => { setActiveTechField('visitBy'); setActivePicker('technician'); }} error={errors.visitBy} isDarkMode={isDarkMode} required />
                          <SearchablePickerTrigger label="Visit With" value={formData.visitWith} onPress={() => { setActiveTechField('visitWith'); setActivePicker('technician'); }} error={errors.visitWith} isDarkMode={isDarkMode} required />
                          <SearchablePickerTrigger label="Visit With Other" value={formData.visitWithOther} onPress={() => { setActiveTechField('visitWithOther'); setActivePicker('technician'); }} error={errors.visitWithOther} isDarkMode={isDarkMode} required />
                          {renderInput('visitRemarks', 'Visit Remarks')}
                          {formData.visitStatus === 'Failed' && (
                            <ImagePreview label="Proof Image *" imageUrl={imageFiles.proofImageFile?.uri || formData.proofImage} onUpload={(file) => handleImageUpload('proofImageFile', file)} error={errors.proofImageFile} isDarkMode={isDarkMode} colorPrimary={activeColor} />
                          )}
                        </>
                      )}
                    </>
                  )}

                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: isDarkMode ? '#d1d5db' : '#374151' }]}>Concern <Text style={styles.required}>*</Text></Text>
                    {isTechnician ? (
                      <TextInput style={[styles.textInput, { backgroundColor: isDarkMode ? '#374151' : '#f3f4f6', color: isDarkMode ? '#9ca3af' : '#6b7280' }]} value={formData.concern} editable={false} />
                    ) : renderPickerTrigger('concern', 'Concern', formData.concern, 'Select Concern', true)}
                  </View>

                  {formData.concern === 'Upgrade/Downgrade Plan' && renderPickerTrigger('plan', 'New Plan', formData.newPlan, 'Select New Plan', true)}

                  {renderInput('concernRemarks', 'Concern Remarks', !isTechnician)}
                  {renderInput('modifiedBy', 'Modified By', false)}
                  {renderInput('supportRemarks', 'Support Remarks')}
                  {renderInput('serviceCharge', 'Service Charge', true, 'numeric')}

                </ScrollView>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── Loading Modal with Validation Steps ─────────────────────────── */}
      <Modal
        visible={showLoadingModal}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
      >
        <View style={styles.loadingModalOverlay}>
          <View style={[styles.loadingModalContent, { backgroundColor: isDarkMode ? '#1f2937' : '#ffffff' }]}>
            <ActivityIndicator size="large" color={activeColor} />
            <Text style={[styles.loadingPercentage, { color: activeColor, marginTop: 16 }]}>
              {Math.round(loadingPercentage)}%
            </Text>
            <Text style={{ 
              marginTop: 8, 
              color: isDarkMode ? '#e5e7eb' : '#374151', 
              fontSize: 16, 
              fontWeight: '600',
              textAlign: 'center' 
            }}>
              {loadingMessage || 'Processing...'}
            </Text>
            
            {/* Steps indicator */}
            <View style={{ marginTop: 24, width: '100%' }}>
              {[
                'SmartOLT Validation',
                'Job Order duplicate check',
                'Technical Details check',
                'Saving changes'
              ].map((step, index) => (
                <View key={index} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <View style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: currentStep > index 
                      ? '#10b981' 
                      : (currentStep === index ? (activeColor) : (isDarkMode ? '#374151' : '#e5e7eb')),
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12
                  }}>
                    {currentStep > index ? (
                      <Check size={14} color="white" />
                    ) : (
                      <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>{index + 1}</Text>
                    )}
                  </View>
                  <Text style={{ 
                    color: currentStep >= index 
                      ? (isDarkMode ? '#ffffff' : '#111827') 
                      : (isDarkMode ? '#9ca3af' : '#6b7280'),
                    fontSize: 14,
                    fontWeight: currentStep === index ? 'bold' : 'normal'
                  }}>
                    {step}
                  </Text>
                  {currentStep === index && (
                    <ActivityIndicator size="small" color={activeColor} style={{ marginLeft: 8 }} />
                  )}
                </View>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* RENDER DYNAMIC PICKERS */}
      <SearchablePicker
        isOpen={activePicker === 'supportStatus'}
        onClose={() => setActivePicker(null)}
        title="Select Support Status"
        data={filtered.supportStatuses}
        onSelect={(val) => { handleInputChange('supportStatus', val); setActivePicker(null); }}
        searchValue={searchQueries.supportStatus || ''}
        onSearchChange={(t) => setSearchQueries({ ...searchQueries, supportStatus: t })}
        keyExtractor={(i) => i}
        selectedItemValue={formData.supportStatus}
        activeColor={activeColor}
      />

      <SearchablePicker
        isOpen={activePicker === 'visitStatus'}
        onClose={() => setActivePicker(null)}
        title="Select Visit Status"
        data={filtered.visitStatuses}
        onSelect={(val) => { handleInputChange('visitStatus', val); setActivePicker(null); }}
        searchValue={searchQueries.visitStatus || ''}
        onSearchChange={(t) => setSearchQueries({ ...searchQueries, visitStatus: t })}
        keyExtractor={(i) => i}
        selectedItemValue={formData.visitStatus}
        activeColor={activeColor}
      />

      <SearchablePicker
        isOpen={activePicker === 'assignedEmail'}
        onClose={() => setActivePicker(null)}
        title="Select Technician"
        data={filtered.assignedEmails}
        onSelect={(t) => { handleInputChange('assignedEmail', t.email); setActivePicker(null); }}
        searchValue={searchQueries.assignedEmail || ''}
        onSearchChange={(t) => setSearchQueries({ ...searchQueries, assignedEmail: t })}
        keyExtractor={(t) => t.email}
        itemTextKey="name"
        itemValueKey="email"
        selectedItemValue={formData.assignedEmail}
        activeColor={activeColor}
      />

      <SearchablePicker
        isOpen={activePicker === 'repairCategory'}
        onClose={() => setActivePicker(null)}
        title="Select Repair Category"
        data={filtered.repairCategories}
        onSelect={(val) => { handleInputChange('repairCategory', val); setActivePicker(null); }}
        searchValue={searchQueries.repairCategory || ''}
        onSearchChange={(t) => setSearchQueries({ ...searchQueries, repairCategory: t })}
        keyExtractor={(i) => i}
        selectedItemValue={formData.repairCategory}
        activeColor={activeColor}
      />

      <SearchablePicker
        isOpen={activePicker === 'lcpnaps'}
        onClose={() => setActivePicker(null)}
        title="Select LCP-NAP"
        data={filtered.lcpnaps}
        onSelect={(item) => { 
          setFormData((prev: ServiceOrderEditFormData) => ({ ...prev, newLcpnap: item.lcpnap_name, newLcp: item.lcp || '', newNap: item.nap || '', newPort: '' }));
          setActivePicker(null); 
        }}
        searchValue={searchQueries.lcpnaps || ''}
        onSearchChange={(t) => setSearchQueries({ ...searchQueries, lcpnaps: t })}
        keyExtractor={(i) => i.id.toString()}
        itemTextKey="lcpnap_name"
        selectedItemValue={formData.newLcpnap}
        activeColor={activeColor}
      />

      <SearchablePicker
        isOpen={activePicker === 'port'}
        onClose={() => setActivePicker(null)}
        title="Select Port"
        data={filtered.ports}
        onSelect={(val) => { handleInputChange('newPort', val); setActivePicker(null); }}
        searchValue={searchQueries.port || ''}
        onSearchChange={(t) => setSearchQueries({ ...searchQueries, port: t })}
        keyExtractor={(i) => i}
        selectedItemValue={formData.newPort}
        activeColor={activeColor}
      />

      <SearchablePicker
        isOpen={activePicker === 'vlan'}
        onClose={() => setActivePicker(null)}
        title="Select VLAN"
        data={filtered.vlans}
        onSelect={(val) => { handleInputChange('newVlan', val); setActivePicker(null); }}
        searchValue={searchQueries.vlan || ''}
        onSearchChange={(t) => setSearchQueries({ ...searchQueries, vlan: t })}
        keyExtractor={(i) => i}
        selectedItemValue={formData.newVlan}
        activeColor={activeColor}
      />

      <SearchablePicker
        isOpen={activePicker === 'routerModels'}
        onClose={() => setActivePicker(null)}
        title="Select Router Model"
        data={filtered.routerModels}
        onSelect={(item) => { handleInputChange('routerModel', item.model); setActivePicker(null); }}
        searchValue={searchQueries.routerModels || ''}
        onSearchChange={(t) => setSearchQueries({ ...searchQueries, routerModels: t })}
        keyExtractor={(i) => i.model}
        itemTextKey="model"
        selectedItemValue={formData.routerModel}
        activeColor={activeColor}
      />

      <SearchablePicker
        isOpen={activePicker === 'technician'}
        onClose={() => { setActivePicker(null); setActiveTechField(null); }}
        title="Select Technician"
        data={filtered.technicians}
        onSelect={(t) => { if (activeTechField) handleInputChange(activeTechField, t.name); setActivePicker(null); setActiveTechField(null); }}
        searchValue={searchQueries.technician || ''}
        onSearchChange={(t) => setSearchQueries({ ...searchQueries, technician: t })}
        keyExtractor={(t, idx) => t.email || idx.toString()}
        itemTextKey="name"
        selectedItemValue={activeTechField ? formData[activeTechField] : ''}
        activeColor={activeColor}
      />

      <SearchablePicker
        isOpen={activePicker === 'inventory'}
        onClose={() => { setActivePicker(null); setActiveItemIndex(null); }}
        title="Select Item"
        data={filtered.inventory}
        onSelect={(item) => { if (activeItemIndex !== null) handleItemChange(activeItemIndex, 'itemId', item.item_name); setActivePicker(null); setActiveItemIndex(null); }}
        searchValue={searchQueries.inventory || ''}
        onSearchChange={(t) => setSearchQueries({ ...searchQueries, inventory: t })}
        keyExtractor={(i, idx) => i.id?.toString() || idx.toString()}
        itemTextKey="item_name"
        selectedItemValue={activeItemIndex !== null ? orderItems[activeItemIndex]?.itemId : ''}
        activeColor={activeColor}
      />

      <SearchablePicker
        isOpen={activePicker === 'concern'}
        onClose={() => setActivePicker(null)}
        title="Select Concern"
        data={filtered.concerns}
        onSelect={(c) => { handleInputChange('concern', c.concern_name); setActivePicker(null); }}
        searchValue={searchQueries.concern || ''}
        onSearchChange={(t) => setSearchQueries({ ...searchQueries, concern: t })}
        keyExtractor={(i) => i.id.toString()}
        itemTextKey="concern_name"
        selectedItemValue={formData.concern}
        activeColor={activeColor}
      />

      <SearchablePicker
        isOpen={activePicker === 'plan'}
        onClose={() => setActivePicker(null)}
        title="Select New Plan"
        data={filtered.plans}
        onSelect={(p) => { handleInputChange('newPlan', p); setActivePicker(null); }}
        searchValue={searchQueries.plan || ''}
        onSearchChange={(t) => setSearchQueries({ ...searchQueries, plan: t })}
        keyExtractor={(i) => i}
        selectedItemValue={formData.newPlan}
        activeColor={activeColor}
      />
    </>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalContent: { height: '95%', width: '100%', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  header: { height: 60, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderBottomWidth: 1 },
  headerLeftAction: { position: 'absolute', left: 16, zIndex: 10, padding: 8 },
  headerRightAction: { position: 'absolute', right: 16, zIndex: 10 },
  headerTitleContainer: { flex: 1, marginHorizontal: 60, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  saveButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  saveButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '500' },
  contentContainer: { flex: 1 },
  scrollViewContent: { padding: 24, paddingBottom: 40 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
  required: { color: '#ef4444' },
  textInput: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16 },
  errorText: { color: '#ef4444', fontSize: 12, marginTop: 4 },
  connectionTypeContainer: { flexDirection: 'row', gap: 8 },
  connectionTypeButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  loadingOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  loadingText: { color: '#6b7280', marginTop: 12, fontSize: 14 },
  signatureContainer: { height: 192, borderWidth: 1, borderStyle: 'dashed', borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  signaturePlaceholder: { alignItems: 'center' },
  signatureText: { fontSize: 14 },
  signatureImage: { width: '100%', height: '100%', resizeMode: 'contain' },
  signatureCanvasContainer: { height: 288, borderWidth: 1, backgroundColor: '#ffffff', marginBottom: 8, overflow: 'hidden', borderRadius: 8 },
  signatureCloseButton: { position: 'absolute', top: 8, right: 8, padding: 4, backgroundColor: '#e5e7eb', borderRadius: 9999, zIndex: 10, elevation: 2 },
  signatureFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, borderTopWidth: 1, borderColor: '#e5e7eb' },
  signatureIconCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  signatureActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  removeButton: { flexDirection: 'row', alignItems: 'center' },
  removeButtonText: { color: '#ef4444', fontSize: 12, marginLeft: 4 },
  redrawButton: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6 },
  redrawButtonText: { color: '#ffffff', fontSize: 12 },
  itemRow: { marginBottom: 16 },
  itemRowContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemPickerTrigger: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 12, borderWidth: 1, borderRadius: 8, height: 50 },
  itemSelectText: { fontSize: 16, paddingHorizontal: 8 },
  itemQtyInput: { width: 80, height: 50, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, fontSize: 16 },
  itemRemoveButton: { padding: 8 },
  loadingModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingModalContent: {
    width: '85%',
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  loadingPercentage: {
    fontSize: 28,
    fontWeight: '800',
    marginVertical: 4,
  },
});

export default ServiceOrderEditModal;
