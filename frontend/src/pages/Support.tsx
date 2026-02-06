import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Modal, ActivityIndicator, Linking } from 'react-native';
import { FileText, Upload, Clock, Info, CheckCircle, XCircle, AlertCircle } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';
import { getServiceOrders, createServiceOrder } from '../services/serviceOrderService';

interface SupportRequest {
  id: string;
  date: string;
  requestId: string;
  issue: string;
  issueDetails: string;
  status: string;
  statusNote: string;
  assignedEmail: string;
  visitNote: string;
  visitInfo: {
    status: string;
  };
}

interface SupportProps {
  forceLightMode?: boolean;
}

const Support: React.FC<SupportProps> = ({ forceLightMode }) => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(forceLightMode ? false : true);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);
  const [selectedConcern, setSelectedConcern] = useState<string>('No Internet');
  const [details, setDetails] = useState<string>('');
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitMessage, setSubmitMessage] = useState<string>('');
  const [remainingRequests, setRemainingRequests] = useState<number>(5);
  const [cooldownTime, setCooldownTime] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [userAccountNo, setUserAccountNo] = useState<string>('');
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [showLoadingModal, setShowLoadingModal] = useState<boolean>(false);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);

  const concernOptions = [
    'No Internet',
    'Slow Internet',
    'Intermittent Connection',
    'Router Issue',
    'Cable Problem',
    'Port Issue',
    'Others'
  ];

  useEffect(() => {
    if (forceLightMode) {
      setIsDarkMode(false);
      return;
    }

    const checkDarkMode = async () => {
      const theme = await AsyncStorage.getItem('theme');
      setIsDarkMode(theme === 'dark' || theme === null);
    };

    checkDarkMode();
  }, [forceLightMode]);

  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    const loadAuthData = async () => {
      const authData = await AsyncStorage.getItem('authData');
      if (authData) {
        try {
          const user = JSON.parse(authData);
          console.log('[Support] User auth data:', user);
          const accountNo = user.account_no || user.username || '';
          const email = user.email || '';
          console.log('[Support] Using account identifier:', accountNo);
          console.log('[Support] Using email:', email);
          setUserAccountNo(accountNo);
          setUserEmail(email);
        } catch (error) {
          console.error('Error parsing auth data:', error);
        }
      } else {
        console.error('[Support] No auth data found');
      }
    };
    loadAuthData();
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
    if (userAccountNo) {
      fetchServiceOrders();
    }
  }, [userAccountNo]);

  const fetchServiceOrders = async () => {
    if (!userAccountNo) {
      console.log('[Support] No account number available, skipping fetch');
      setIsLoading(false);
      setRequests([]);
      return;
    }

    try {
      setIsLoading(true);
      console.log('[Support] Fetching service orders for account:', userAccountNo);

      const response = await getServiceOrders();
      console.log('[Support] Service orders response:', response);

      if (response.success && response.data) {
        console.log('[Support] Total service orders:', response.data.length);

        const filteredOrders = response.data
          .filter(order => {
            const matches = order.account_no === userAccountNo ||
              order.username === userAccountNo;
            if (matches) {
              console.log('[Support] Matched order:', order);
            }
            return matches;
          })
          .map(order => ({
            id: order.id,
            date: order.created_at ? new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '',
            requestId: order.ticket_id,
            issue: order.concern || '',
            issueDetails: order.concern_remarks || '',
            status: order.support_status || 'Pending',
            statusNote: order.support_remarks || '',
            assignedEmail: order.assigned_email || '',
            visitNote: order.visit_remarks || '',
            visitInfo: {
              status: order.visit_status || 'Pending'
            }
          }));

        console.log('[Support] Filtered orders count:', filteredOrders.length);
        setRequests(filteredOrders);
      } else {
        console.error('[Support] Invalid response:', response);
        setRequests([]);
      }
    } catch (error) {
      console.error('[Support] Failed to fetch service orders:', error);
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!details.trim()) {
      setSubmitMessage('Please provide details about your issue');
      setTimeout(() => setSubmitMessage(''), 3000);
      return;
    }

    if (!userAccountNo) {
      setSubmitMessage('Account number not found. Please log in again.');
      setTimeout(() => setSubmitMessage(''), 3000);
      return;
    }

    if (remainingRequests <= 0) {
      setSubmitMessage('Request limit reached. Please wait for cooldown.');
      setTimeout(() => setSubmitMessage(''), 3000);
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = async () => {
    setShowConfirmModal(false);
    setShowLoadingModal(true);

    try {
      const newServiceOrder = {
        account_no: userAccountNo,
        username: userAccountNo,
        concern: selectedConcern,
        concern_remarks: details,
        created_by_user: userEmail,
        requested_by: userEmail,
        support_status: 'Pending',
        visit_status: 'Pending'
      };

      console.log('[Support] Submitting service order:', newServiceOrder);
      const response = await createServiceOrder(newServiceOrder);
      console.log('[Support] Submit response:', response);

      if (response.success) {
        setShowLoadingModal(false);
        setShowSuccessModal(true);
        await fetchServiceOrders();
        setDetails('');
        setRemainingRequests(remainingRequests - 1);
      } else {
        setShowLoadingModal(false);
        setSubmitMessage('Failed to submit request. Please try again.');
        setTimeout(() => setSubmitMessage(''), 3000);
      }
    } catch (error) {
      console.error('Failed to submit request:', error);
      setShowLoadingModal(false);
      setSubmitMessage('Failed to submit request. Please try again.');
      setTimeout(() => setSubmitMessage(''), 3000);
    }
  };

  const handleRequestPlanUpdate = () => {
    Linking.openURL('https://forms.gle/your-plan-update-form');
  };

  return (
    <ScrollView style={{
      height: '100%',
      backgroundColor: isDarkMode ? '#030712' : '#f9fafb'
    }}>
      <View style={{ maxWidth: 1280, marginHorizontal: 'auto', padding: 24 }}>
        <View style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 24
        }}>
          <View style={{
            flex: 1,
            minWidth: 300,
            backgroundColor: isDarkMode ? '#111827' : '#ffffff',
            borderRadius: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 8,
            padding: 24
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
              <FileText size={20} color={isDarkMode ? '#ffffff' : '#111827'} style={{ marginRight: 8 }} />
              <Text style={{
                fontSize: 20,
                fontWeight: '600',
                color: isDarkMode ? '#ffffff' : '#111827'
              }}>
                New Request
              </Text>
            </View>

            <View>
              <View style={{ marginBottom: 16 }}>
                <Text style={{
                  fontSize: 14,
                  fontWeight: '500',
                  marginBottom: 8,
                  color: isDarkMode ? '#d1d5db' : '#374151'
                }}>
                  Concern
                </Text>
                <View style={{
                  backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                  borderWidth: 1,
                  borderColor: isDarkMode ? '#374151' : '#d1d5db',
                  borderRadius: 4
                }}>
                  <Picker
                    selectedValue={selectedConcern}
                    onValueChange={(value) => setSelectedConcern(value)}
                    style={{
                      color: isDarkMode ? '#ffffff' : '#111827'
                    }}
                  >
                    {concernOptions.map((option) => (
                      <Picker.Item key={option} label={option} value={option} />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={{ marginBottom: 24 }}>
                <Text style={{
                  fontSize: 14,
                  fontWeight: '500',
                  marginBottom: 8,
                  color: isDarkMode ? '#d1d5db' : '#374151'
                }}>
                  Details
                </Text>
                <TextInput
                  value={details}
                  onChangeText={setDetails}
                  placeholder="Describe your issue..."
                  placeholderTextColor={isDarkMode ? '#6b7280' : '#9ca3af'}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                  style={{
                    width: '100%',
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 4,
                    borderWidth: 1,
                    backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                    color: isDarkMode ? '#ffffff' : '#111827',
                    borderColor: isDarkMode ? '#374151' : '#d1d5db',
                    minHeight: 120
                  }}
                />
              </View>

              <Pressable
                onPress={handleSubmit}
                disabled={isSubmitting || remainingRequests <= 0}
                style={{
                  width: '100%',
                  paddingVertical: 12,
                  borderRadius: 4,
                  alignItems: 'center',
                  backgroundColor: (isSubmitting || remainingRequests <= 0) ? '#6b7280' : (colorPalette?.primary || '#1e40af'),
                  opacity: (isSubmitting || remainingRequests <= 0) ? 0.5 : 1
                }}
              >
                <Text style={{
                  color: 'white',
                  fontWeight: '500'
                }}>
                  SUBMIT TICKET
                </Text>
              </Pressable>

              <View style={{
                marginTop: 12,
                alignItems: 'center'
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Clock size={14} color={isDarkMode ? '#9ca3af' : '#4b5563'} style={{ marginRight: 4 }} />
                  <Text style={{
                    fontSize: 14,
                    color: isDarkMode ? '#9ca3af' : '#4b5563'
                  }}>
                    Limit: {remainingRequests} requests/day. 1 hour cooldown.
                  </Text>
                </View>
              </View>

              {submitMessage && (
                <View style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 4,
                  backgroundColor: submitMessage.includes('Failed') || submitMessage.includes('limit') || submitMessage.includes('not found')
                    ? isDarkMode ? 'rgba(127, 29, 29, 0.5)' : '#fee2e2'
                    : isDarkMode ? 'rgba(20, 83, 45, 0.5)' : '#d1fae5'
                }}>
                  <Text style={{
                    fontSize: 14,
                    textAlign: 'center',
                    color: submitMessage.includes('Failed') || submitMessage.includes('limit') || submitMessage.includes('not found')
                      ? isDarkMode ? '#fca5a5' : '#991b1b'
                      : isDarkMode ? '#86efac' : '#065f46'
                  }}>
                    {submitMessage}
                  </Text>
                </View>
              )}
            </View>

            <Pressable
              onPress={handleRequestPlanUpdate}
              style={{
                width: '100%',
                marginTop: 16,
                paddingVertical: 12,
                borderRadius: 4,
                borderWidth: 2,
                borderColor: isDarkMode ? '#374151' : '#d1d5db',
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center'
              }}
            >
              <Upload size={16} color={isDarkMode ? '#d1d5db' : '#374151'} style={{ marginRight: 8 }} />
              <Text style={{
                fontWeight: '500',
                color: isDarkMode ? '#d1d5db' : '#374151'
              }}>
                Request Plan Update
              </Text>
            </Pressable>
          </View>

          <View style={{
            flex: 2,
            minWidth: 500,
            backgroundColor: isDarkMode ? '#111827' : '#ffffff',
            borderRadius: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 8,
            padding: 24
          }}>
            <Text style={{
              fontSize: 20,
              fontWeight: '600',
              marginBottom: 24,
              color: isDarkMode ? '#ffffff' : '#111827'
            }}>
              Latest Request
            </Text>

            <ScrollView horizontal style={{ overflow: 'scroll' }}>
              {isLoading ? (
                <View style={{
                  paddingVertical: 48,
                  alignItems: 'center',
                  width: '100%'
                }}>
                  <View style={{ flexDirection: 'column', alignItems: 'center' }}>
                    <View style={{
                      height: 16,
                      width: '33%',
                      borderRadius: 4,
                      marginBottom: 16,
                      backgroundColor: isDarkMode ? '#374151' : '#d1d5db'
                    }} />
                    <View style={{
                      height: 16,
                      width: '50%',
                      borderRadius: 4,
                      backgroundColor: isDarkMode ? '#374151' : '#d1d5db'
                    }} />
                  </View>
                  <Text style={{
                    marginTop: 16,
                    color: isDarkMode ? '#9ca3af' : '#4b5563'
                  }}>Loading support requests...</Text>
                </View>
              ) : (
                <>
                  <View style={{ maxHeight: 400 }}>
                    <View style={{ minWidth: '100%' }}>
                      {/* Table Header */}
                      <View style={{
                        flexDirection: 'row',
                        borderBottomWidth: 1,
                        borderColor: isDarkMode ? '#1f2937' : '#e5e7eb',
                        position: 'sticky',
                        top: 0,
                        backgroundColor: isDarkMode ? '#111827' : '#ffffff',
                        zIndex: 10
                      }}>
                        <Text style={{
                          flex: 1,
                          paddingVertical: 12,
                          paddingHorizontal: 12,
                          textAlign: 'left',
                          fontWeight: '600',
                          fontSize: 14,
                          color: isDarkMode ? '#d1d5db' : '#374151'
                        }}>Date</Text>
                        <Text style={{
                          flex: 1,
                          paddingVertical: 12,
                          paddingHorizontal: 12,
                          textAlign: 'left',
                          fontWeight: '600',
                          fontSize: 14,
                          color: isDarkMode ? '#d1d5db' : '#374151'
                        }}>ID</Text>
                        <Text style={{
                          flex: 1,
                          paddingVertical: 12,
                          paddingHorizontal: 12,
                          textAlign: 'left',
                          fontWeight: '600',
                          fontSize: 14,
                          color: isDarkMode ? '#d1d5db' : '#374151'
                        }}>Issue</Text>
                        <Text style={{
                          flex: 1,
                          paddingVertical: 12,
                          paddingHorizontal: 12,
                          textAlign: 'left',
                          fontWeight: '600',
                          fontSize: 14,
                          color: isDarkMode ? '#d1d5db' : '#374151'
                        }}>Status</Text>
                        <Text style={{
                          flex: 1,
                          paddingVertical: 12,
                          paddingHorizontal: 12,
                          textAlign: 'left',
                          fontWeight: '600',
                          fontSize: 14,
                          color: isDarkMode ? '#d1d5db' : '#374151'
                        }}>Visit Info</Text>
                        <Text style={{
                          flex: 1,
                          paddingVertical: 12,
                          paddingHorizontal: 12,
                          textAlign: 'left',
                          fontWeight: '600',
                          fontSize: 14,
                          color: isDarkMode ? '#d1d5db' : '#374151'
                        }}>Action</Text>
                      </View>
                      {/* Table Body */}
                      {requests.map((request) => (
                        <View
                          key={request.id}
                          style={{
                            flexDirection: 'row',
                            borderBottomWidth: 1,
                            borderColor: isDarkMode ? '#1f2937' : '#e5e7eb'
                          }}
                        >
                          <View style={{ flex: 1, paddingVertical: 16, paddingHorizontal: 12 }}>
                            <Text style={{ color: isDarkMode ? '#d1d5db' : '#374151', fontSize: 14 }}>
                              {request.date}
                            </Text>
                          </View>
                          <View style={{ flex: 1, paddingVertical: 16, paddingHorizontal: 12 }}>
                            <Text style={{ color: isDarkMode ? '#d1d5db' : '#374151', fontSize: 14 }}>
                              {request.requestId}
                            </Text>
                          </View>
                          <View style={{ flex: 1, paddingVertical: 16, paddingHorizontal: 12 }}>
                            <Text style={{ color: isDarkMode ? '#d1d5db' : '#374151', fontSize: 14 }}>
                              {request.issue}
                            </Text>
                            <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                              {request.issueDetails}
                            </Text>
                          </View>
                          <View style={{ flex: 1, paddingVertical: 16, paddingHorizontal: 12 }}>
                            <View style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              paddingHorizontal: 12,
                              paddingVertical: 4,
                              borderRadius: 4,
                              alignSelf: 'flex-start',
                              backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6'
                            }}>
                              <Info size={14} color={isDarkMode ? '#d1d5db' : '#374151'} style={{ marginRight: 4 }} />
                              <Text style={{ color: isDarkMode ? '#d1d5db' : '#374151', fontSize: 14 }}>
                                {request.status}
                              </Text>
                            </View>
                            <Text style={{ fontSize: 12, marginTop: 4, color: '#6b7280' }}>
                              Note: {request.statusNote || 'N/A'}
                            </Text>
                          </View>
                          <View style={{ flex: 1, paddingVertical: 16, paddingHorizontal: 12 }}>
                            <View style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              paddingHorizontal: 12,
                              paddingVertical: 8,
                              borderRadius: 4,
                              alignSelf: 'flex-start',
                              backgroundColor: request.visitInfo.status === 'Done'
                                ? 'rgba(234, 179, 8, 0.2)'
                                : isDarkMode ? '#1f2937' : '#f3f4f6',
                              borderWidth: request.visitInfo.status === 'Done' ? 1 : 0,
                              borderColor: request.visitInfo.status === 'Done' ? 'rgba(234, 179, 8, 0.5)' : 'transparent'
                            }}>
                              <CheckCircle
                                size={14}
                                color={request.visitInfo.status === 'Done' ? '#eab308' : (isDarkMode ? '#d1d5db' : '#374151')}
                                style={{ marginRight: 4 }}
                              />
                              <Text style={{
                                color: request.visitInfo.status === 'Done' ? '#eab308' : (isDarkMode ? '#d1d5db' : '#374151'),
                                fontSize: 14
                              }}>
                                {request.visitInfo.status}
                              </Text>
                            </View>
                            <Text style={{ fontSize: 12, marginTop: 4, color: isDarkMode ? '#9ca3af' : '#4b5563' }}>
                              Techs: {request.assignedEmail || 'Not assigned'}
                            </Text>
                            <Text style={{ fontSize: 12, color: '#6b7280' }}>
                              Note: {request.visitNote || 'N/A'}
                            </Text>
                          </View>
                          <View style={{ flex: 1, paddingVertical: 16, paddingHorizontal: 12 }}>
                            <Pressable
                              style={{
                                paddingHorizontal: 16,
                                paddingVertical: 4,
                                borderRadius: 4,
                                borderWidth: 1,
                                borderColor: colorPalette?.primary || '#3b82f6',
                                alignSelf: 'flex-start'
                              }}
                            >
                              <Text style={{
                                fontSize: 14,
                                color: colorPalette?.primary || '#3b82f6'
                              }}>
                                View
                              </Text>
                            </Pressable>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>

                  {requests.length === 0 && (
                    <View style={{
                      paddingVertical: 48,
                      alignItems: 'center',
                      width: '100%'
                    }}>
                      <FileText size={48} color={isDarkMode ? '#9ca3af80' : '#4b556380'} strokeWidth={1} style={{ marginBottom: 16 }} />
                      <Text style={{
                        fontSize: 18,
                        fontWeight: '500',
                        color: isDarkMode ? '#9ca3af' : '#4b5563'
                      }}>No support requests</Text>
                      <Text style={{
                        fontSize: 14,
                        marginTop: 4,
                        color: isDarkMode ? '#9ca3af' : '#4b5563'
                      }}>Submit a ticket to get started</Text>
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </View>

      {/* Confirm Modal */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <View style={{
            backgroundColor: isDarkMode ? '#111827' : '#ffffff',
            borderRadius: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 12,
            padding: 24,
            maxWidth: 448,
            width: '90%'
          }}>
            <View style={{ marginBottom: 16 }}>
              <Text style={{
                fontSize: 20,
                fontWeight: '600',
                color: isDarkMode ? '#ffffff' : '#111827'
              }}>
                Confirm Submission
              </Text>
            </View>
            <Text style={{
              marginBottom: 24,
              color: isDarkMode ? '#d1d5db' : '#374151'
            }}>
              Are you sure you want to submit this support ticket?
            </Text>
            <View style={{
              marginBottom: 16,
              padding: 12,
              borderRadius: 4,
              backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6'
            }}>
              <Text style={{
                fontSize: 14,
                fontWeight: '500',
                marginBottom: 4,
                color: isDarkMode ? '#d1d5db' : '#374151'
              }}>
                Concern: {selectedConcern}
              </Text>
              <Text style={{
                fontSize: 14,
                color: isDarkMode ? '#9ca3af' : '#4b5563'
              }}>
                Details: {details.substring(0, 100)}{details.length > 100 ? '...' : ''}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable
                onPress={() => setShowConfirmModal(false)}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  paddingHorizontal: 16,
                  borderRadius: 4,
                  alignItems: 'center',
                  backgroundColor: isDarkMode ? '#1f2937' : '#e5e7eb'
                }}
              >
                <Text style={{
                  fontWeight: '500',
                  color: isDarkMode ? '#d1d5db' : '#374151'
                }}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={handleConfirmSubmit}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  paddingHorizontal: 16,
                  borderRadius: 4,
                  alignItems: 'center',
                  backgroundColor: colorPalette?.primary || '#1e40af'
                }}
              >
                <Text style={{
                  fontWeight: '500',
                  color: 'white'
                }}>
                  Confirm
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Loading Modal */}
      <Modal
        visible={showLoadingModal}
        transparent
        animationType="fade"
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <View style={{
            backgroundColor: isDarkMode ? '#111827' : '#ffffff',
            borderRadius: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 12,
            padding: 32,
            maxWidth: 384,
            width: '90%'
          }}>
            <View style={{ flexDirection: 'column', alignItems: 'center' }}>
              <ActivityIndicator
                size="large"
                color={colorPalette?.primary || '#1e40af'}
                style={{ marginBottom: 16 }}
              />
              <Text style={{
                fontSize: 20,
                fontWeight: '600',
                marginBottom: 8,
                color: isDarkMode ? '#ffffff' : '#111827'
              }}>
                Submitting Ticket
              </Text>
              <Text style={{
                fontSize: 14,
                color: isDarkMode ? '#9ca3af' : '#4b5563'
              }}>
                Please wait...
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <View style={{
            backgroundColor: isDarkMode ? '#111827' : '#ffffff',
            borderRadius: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 12,
            padding: 24,
            maxWidth: 448,
            width: '90%'
          }}>
            <View style={{ flexDirection: 'column', alignItems: 'center' }}>
              <View style={{
                borderRadius: 9999,
                padding: 12,
                marginBottom: 16,
                backgroundColor: `${colorPalette?.primary || '#1e40af'}33`
              }}>
                <CheckCircle
                  size={48}
                  color={colorPalette?.primary || '#1e40af'}
                />
              </View>
              <Text style={{
                fontSize: 20,
                fontWeight: '600',
                marginBottom: 8,
                color: isDarkMode ? '#ffffff' : '#111827'
              }}>
                Ticket Submitted Successfully
              </Text>
              <Text style={{
                fontSize: 14,
                textAlign: 'center',
                marginBottom: 24,
                color: isDarkMode ? '#9ca3af' : '#4b5563'
              }}>
                Your support ticket has been created. We will get back to you soon.
              </Text>
              <Pressable
                onPress={() => setShowSuccessModal(false)}
                style={{
                  width: '100%',
                  paddingVertical: 8,
                  paddingHorizontal: 16,
                  borderRadius: 4,
                  alignItems: 'center',
                  backgroundColor: colorPalette?.primary || '#1e40af'
                }}
              >
                <Text style={{
                  fontWeight: '500',
                  color: 'white'
                }}>
                  OK
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

export default Support;
