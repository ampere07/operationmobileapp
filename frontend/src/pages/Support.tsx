import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Modal, ActivityIndicator, Linking, useWindowDimensions, Animated, PanResponder, RefreshControl, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { FileText, Upload, Clock, CheckCircle, Plus, X, ChevronLeft, ChevronRight, MessageSquare, AlertCircle } from 'lucide-react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { FlashList } from '@shopify/flash-list';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';
import { createServiceOrder } from '../services/serviceOrderService';
import { useCustomerDataContext } from '../contexts/CustomerDataContext';
import * as WebBrowser from 'expo-web-browser';
import SupportDetails from '../components/SupportDetails';

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

// ─── Sub-components ────────────────────────────────────────────────────────────

const SupportCard = React.memo<{
  request: SupportRequest;
  primaryColor: string;
  onPress: (request: SupportRequest) => void;
}>(({ request, primaryColor, onPress }) => {
  return (
    <View style={s.card}>
      {/* Header Row */}
      <View style={s.cardHeaderRow}>
        <View style={s.cardHeaderLeft}>
          <Text style={s.ticketId}>#{request.requestId}</Text>
          <View style={[s.dateBadge, { backgroundColor: primaryColor + '10' }]}>
            <Text style={[s.dateText, { color: primaryColor }]}>{request.date}</Text>
          </View>
        </View>
        <View style={s.statusBadge}>
          <Text style={s.statusText}>{request.status}</Text>
        </View>
      </View>

      {/* Issue Section */}
      <View style={s.issueSection}>
        <Text style={s.issueTitle}>{request.issue}</Text>
        <Text style={s.issueDetails} numberOfLines={2}>
          {request.issueDetails}
        </Text>
      </View>

      <View style={s.cardFooterRow}>
        <View style={s.visitRow}>
          <CheckCircle size={14} color={request.visitInfo.status === 'Done' ? '#10b981' : '#9ca3af'} />
          <Text style={s.visitText}>
            Visit: {request.visitInfo.status}
          </Text>
        </View>
        <Pressable
          onPress={() => onPress(request)}
          style={[s.detailsBtn, { borderColor: primaryColor + '40' }]}
        >
          <Text style={[s.detailsBtnText, { color: primaryColor }]}>Details</Text>
        </Pressable>
      </View>
    </View>
  );
});

const Support: React.FC<SupportProps> = ({ forceLightMode }) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const { customerDetail, serviceOrders: requests, isLoading: contextLoading, silentRefresh } = useCustomerDataContext();
  const userAccountNo = customerDetail?.billingAccount?.accountNo || '';
  const isDarkMode = false;
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);
  const primaryColor = colorPalette?.primary || '#ef4444';
  const [selectedConcern, setSelectedConcern] = useState<string>('No Internet');
  const [details, setDetails] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitMessage, setSubmitMessage] = useState<string>('');
  const [remainingRequests, setRemainingRequests] = useState<number>(5);
  const [cooldownTime, setCooldownTime] = useState<number>(0);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [showLoadingModal, setShowLoadingModal] = useState<boolean>(false);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [showNewRequestModal, setShowNewRequestModal] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const ITEMS_PER_PAGE = 5;
  const [currentPage, setCurrentPage] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [selectedRequest, setSelectedRequest] = useState<SupportRequest | null>(null);

  const concernOptions = [
    'No Internet',
    'Slow Internet',
    'Intermittent Connection',
    'Router Issue',
    'Cable Problem',
    'Port Issue',
    'Others'
  ];

  const pan = useRef(new Animated.ValueXY()).current;

  const panResponder = useRef(
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
            setShowNewRequestModal(false);
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

  // Handle modal state changes to ensure pan is reset correctly
  useEffect(() => {
    if (showNewRequestModal) {
      pan.setValue({ x: 0, y: 0 });
    }
  }, [showNewRequestModal]);



  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    const initPage = async () => {
      try {
        const [activePalette, authData] = await Promise.all([
          settingsColorPaletteService.getActive(),
          AsyncStorage.getItem('authData')
        ]);
        setColorPalette(activePalette);
        if (authData) {
          const user = JSON.parse(authData);
          setUser(user);
          setUserEmail(user.email || '');
        }
      } catch (err) {
        console.error('Support page init error:', err);
      }
    };
    initPage();
  }, []);

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

    setShowNewRequestModal(false);
    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = async () => {
    setShowConfirmModal(false);
    setShowLoadingModal(true);

    try {
      const newServiceOrder = {
        account_no: userAccountNo,
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
        await silentRefresh();
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

  const handleOpenChat = async () => {
    const webUrl = 'https://m.me/atssfiber2022';
    const messengerAppUrl = 'fb-messenger://user-thread/';
    try {
      const canOpenMessenger = await Linking.canOpenURL(messengerAppUrl);
      if (canOpenMessenger) {
        await Linking.openURL(webUrl);
      } else {
        await WebBrowser.openBrowserAsync(webUrl);
      }
    } catch (error) {
      await WebBrowser.openBrowserAsync(webUrl);
    }
  };

  const handleRequestPlanUpdate = handleOpenChat;

  const paginatedRequests = useMemo(() => {
    const start = currentPage * ITEMS_PER_PAGE;
    return requests.slice(start, start + ITEMS_PER_PAGE);
  }, [requests, currentPage]);

  const totalPages = Math.max(1, Math.ceil(requests.length / ITEMS_PER_PAGE));

  const renderPagination = useCallback(() => {
    if (requests.length <= ITEMS_PER_PAGE) return null;
    const primary = colorPalette?.primary || '#ef4444';
    const isPrevDisabled = currentPage === 0;
    const isNextDisabled = currentPage >= totalPages - 1;
    return (
      <View style={s.paginationRow}>
        <Pressable
          onPress={() => setCurrentPage(Math.max(0, currentPage - 1))}
          disabled={isPrevDisabled}
          style={[s.paginationBtn, isPrevDisabled ? s.paginationBtnDisabled : { backgroundColor: primary + '12' }]}
        >
          <ChevronLeft width={16} height={16} color={isPrevDisabled ? '#9ca3af' : primary} />
          <Text style={[s.paginationText, { color: isPrevDisabled ? '#9ca3af' : primary }]}>Previous</Text>
        </Pressable>
        <Text style={s.pageIndicator}>{currentPage + 1} / {totalPages}</Text>
        <Pressable
          onPress={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
          disabled={isNextDisabled}
          style={[s.paginationBtn, isNextDisabled ? s.paginationBtnDisabled : { backgroundColor: primary + '12' }]}
        >
          <Text style={[s.paginationText, { color: isNextDisabled ? '#9ca3af' : primary }]}>Next</Text>
          <ChevronRight width={16} height={16} color={isNextDisabled ? '#9ca3af' : primary} />
        </Pressable>
      </View>
    );
  }, [colorPalette, currentPage, totalPages, requests.length]);

  return (
    <View style={s.container}>
      <View style={[s.header, { paddingTop: !isMobile ? 20 : 60 }]}>
        <View style={s.titleContainer}>
          <Text style={s.title}>Support Center</Text>
        </View>
        <Text style={s.subtitle}>Track and manage your service requests</Text>
      </View>

      <FlashList
        data={paginatedRequests}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={{
          paddingHorizontal: isMobile ? 16 : 24,
          paddingBottom: 120,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[primaryColor]}
            tintColor={primaryColor}
          />
        }
        ListEmptyComponent={() => (
          contextLoading ? (
            <View style={s.emptyState}>
              <ActivityIndicator size="large" color={primaryColor} />
              <Text style={s.emptyText}>Loading records...</Text>
            </View>
          ) : (
            <View style={s.emptyState}>
              <View style={[s.emptyIconContainer, { backgroundColor: primaryColor + '10' }]}>
                <FileText size={48} color={primaryColor} strokeWidth={1} />
              </View>
              <Text style={s.emptyTitle}>No Requests Yet</Text>
              <Text style={s.emptySubtitle}>If you have any issues with your connection, please submit a ticket.</Text>
            </View>
          )
        )}
        renderItem={({ item }) => (
          <SupportCard
            request={item}
            primaryColor={primaryColor}
            onPress={setSelectedRequest}
          />
        )}
        ListFooterComponent={renderPagination}
      />

      {/* Support Details Modal */}
      <Modal
        visible={!!selectedRequest}
        animationType="slide"
        onRequestClose={() => setSelectedRequest(null)}
      >
        {selectedRequest && (
          <SupportDetails
            request={selectedRequest}
            onClose={() => setSelectedRequest(null)}
          />
        )}
      </Modal>

      {/* Floating Action Button */}
      <Pressable
        onPress={() => setShowNewRequestModal(true)}
        style={{
          position: 'absolute',
          bottom: isMobile ? 20 : 30,
          right: isMobile ? 20 : 30,
          width: 60,
          height: 60,
          borderRadius: 30,
          backgroundColor: colorPalette?.primary || '#ef4444',
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 6,
          elevation: 8
        }}
      >
        <Plus size={28} color="#ffffff" />
      </Pressable >


      {/* New Request Modal */}
      <Modal
        visible={showNewRequestModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNewRequestModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{
            flex: 1,
            backgroundColor: 'transparent',
            justifyContent: 'flex-end'
          }}
        >
          <Animated.View
            style={{
              backgroundColor: '#ffffff',
              borderTopLeftRadius: 32,
              borderTopRightRadius: 32,
              maxHeight: '90%',
              padding: 24,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -10 },
              shadowOpacity: 0.1,
              shadowRadius: 15,
              elevation: 20,
              transform: [{ translateY: pan.y }]
            }}
          >
            <View
              {...panResponder.panHandlers}
              style={{
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 24,
                paddingTop: 12,
                marginTop: -12,
                backgroundColor: 'transparent' // Ensure touch area is clear
              }}
            >
              {/* Handle Indicator */}
              <View style={{
                width: '30%',
                height: 3,
                backgroundColor: isDarkMode ? '#374151' : '#e5e7eb',
                borderRadius: 1.5,
                marginBottom: 20,
                marginTop: -8
              }} />

              <Text style={{
                fontSize: 20,
                fontWeight: '600',
                color: isDarkMode ? '#ffffff' : '#111827',
                textAlign: 'center'
              }}>
                New Request
              </Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
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
                    ? (colorPalette?.primary || '#ef4444') + '15'
                    : '#10b98115'
                }}>
                  <Text style={{
                    fontSize: 14,
                    textAlign: 'center',
                    color: submitMessage.includes('Failed') || submitMessage.includes('limit') || submitMessage.includes('not found')
                      ? colorPalette?.primary || '#ef4444'
                      : '#10b981'
                  }}>
                    {submitMessage}
                  </Text>
                </View>
              )}

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
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Confirm Modal */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'transparent',
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
                  backgroundColor: colorPalette?.primary || '#ef4444'
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
          backgroundColor: 'transparent',
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
                color={colorPalette?.primary || '#ef4444'}
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
          backgroundColor: 'transparent',
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
                backgroundColor: `${colorPalette?.primary || '#ef4444'}33`
              }}>
                <CheckCircle
                  size={48}
                  color={colorPalette?.primary || '#ef4444'}
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
                  backgroundColor: colorPalette?.primary || '#ef4444'
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
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { paddingHorizontal: 24, paddingBottom: 20, alignItems: 'center' },
  titleContainer: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  title: { fontSize: 26, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6b7280', fontWeight: '500' },
  card: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 18, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 4,
  },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ticketId: { fontSize: 16, fontWeight: '800', color: '#111827' },
  dateBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  dateText: { fontSize: 11, fontWeight: '700' },
  statusBadge: { backgroundColor: '#f3f4f6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '700', color: '#374151' },
  issueSection: { marginBottom: 16 },
  issueTitle: { fontSize: 15, fontWeight: '700', color: '#1f2937', marginBottom: 4 },
  issueDetails: { fontSize: 13, color: '#4b5563', lineHeight: 20 },
  cardFooterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 14 },
  visitRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  visitText: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  detailsBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1.5 },
  detailsBtnText: { fontSize: 12, fontWeight: '700' },
  emptyState: { paddingVertical: 80, alignItems: 'center', width: '100%', paddingHorizontal: 40 },
  emptyIconContainer: { padding: 24, borderRadius: 32, marginBottom: 20 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22 },
  emptyText: { marginTop: 16, color: '#6b7280', fontSize: 14 },
  paginationRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingTop: 10, paddingBottom: 40, gap: 16 },
  paginationBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12 },
  paginationBtnDisabled: { backgroundColor: '#f3f4f6', opacity: 0.5 },
  paginationText: { fontSize: 14, fontWeight: '700' },
  pageIndicator: { fontSize: 14, color: '#111827', fontWeight: '700' },
});


export default Support;
