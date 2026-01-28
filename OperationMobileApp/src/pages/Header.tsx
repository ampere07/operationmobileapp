import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, ScrollView, Image, ActivityIndicator } from 'react-native';
import { Bell, RefreshCw } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationService, type Notification as AppNotification } from '../services/notificationService';
import { formUIService } from '../services/formUIService';

interface HeaderProps {
  onToggleSidebar?: () => void;
  onSearch?: (query: string) => void;
}

const Header: React.FC<HeaderProps> = ({ onToggleSidebar, onSearch }) => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const previousCountRef = useRef(0);
  const previousNotificationIdsRef = useRef<Set<number>>(new Set());

  const convertGoogleDriveUrl = (url: string): string => {
    if (!url) return '';
    const apiUrl = process.env.REACT_APP_API_URL || 'https://backend.atssfiber.ph/api';
    return `${apiUrl}/proxy/image?url=${encodeURIComponent(url)}`;
  };

  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const config = await formUIService.getConfig();
        if (config && config.logo_url) {
          const directUrl = convertGoogleDriveUrl(config.logo_url);
          setLogoUrl(directUrl);
        }
      } catch (error) {
        console.error('[Logo] Error fetching logo:', error);
      }
    };
    fetchLogo();
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const theme = await AsyncStorage.getItem('theme');
        setIsDarkMode(theme === 'dark' || theme === null);
      } catch (err) {
        console.error('Failed to load theme:', err);
      }
    };

    loadTheme();
  }, []);

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!mountedRef.current) return;
      
      console.log('[Fetch] Fetching initial notification data...');
      
      try {
        const data = await notificationService.getRecentApplications(10);
        const count = await notificationService.getUnreadCount();
        
        console.log('[Fetch] Initial data received:', {
          notificationCount: data.length,
          unreadCount: count,
          notifications: data
        });
        
        if (mountedRef.current) {
          previousCountRef.current = count;
          setUnreadCount(count);
          setNotifications(data);
          previousNotificationIdsRef.current = new Set(data.map(n => n.id));
          
          console.log('[Fetch] State updated with initial data');
        }
      } catch (error) {
        console.error('[Fetch] Failed to fetch initial notifications:', error);
      }
    };

    fetchInitialData();

    const interval = setInterval(async () => {
      if (!mountedRef.current) return;
      
      console.log('[Polling] Checking for new notifications...');
      
      try {
        const data = await notificationService.getRecentApplications(10);
        const count = await notificationService.getUnreadCount();
        
        console.log('[Polling] Data received:', {
          notificationCount: data.length,
          unreadCount: count,
          previousIds: Array.from(previousNotificationIdsRef.current)
        });
        
        if (mountedRef.current) {
          const currentIds = new Set(data.map(n => n.id));
          const newNotifications = data.filter(n => !previousNotificationIdsRef.current.has(n.id));
          
          if (newNotifications.length > 0) {
            console.log('[Polling] NEW NOTIFICATIONS DETECTED:', newNotifications.length);
            console.log('[Polling] New notification details:', newNotifications);
          } else {
            console.log('[Polling] No new notifications');
          }
          
          previousNotificationIdsRef.current = currentIds;
          previousCountRef.current = count;
          setUnreadCount(count);
          setNotifications(data);
        }
      } catch (error) {
        console.error('[Polling] Failed to fetch notifications:', error);
      }
    }, 30000);

    console.log('[Polling] Interval started - checking every 30 seconds');

    return () => {
      console.log('[Polling] Interval cleared');
      clearInterval(interval);
    };
  }, []);

  const handleToggleClick = () => {
    if (onToggleSidebar) {
      onToggleSidebar();
    }
  };

  const handleRefresh = () => {
    // WEB-ONLY: window.location.reload()
    console.log('Refresh requested - implement app-specific refresh logic');
  };

  const toggleNotifications = async () => {
    console.log('[UI] Toggling notifications modal');
    setShowNotifications(!showNotifications);
    
    if (!showNotifications) {
      setLoading(true);
      console.log('[UI] Loading notifications for modal...');
      
      try {
        const data = await notificationService.getRecentApplications(10);
        console.log('[UI] Notifications loaded for modal:', data);
        
        if (mountedRef.current) {
          setNotifications(data);
        }
      } catch (error) {
        console.error('[UI] Failed to fetch notifications for modal:', error);
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    }
  };

  return (
    <View style={{ 
      backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? '#4b5563' : '#d1d5db',
      height: 64,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <Pressable 
          onPress={handleToggleClick}
          style={({ pressed }) => ({
            padding: 8,
            opacity: pressed ? 0.7 : 1
          })}
        >
          <View style={{ height: 20, width: 20 }}>
            <Text style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>☰</Text>
          </View>
        </Pressable>
        
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {logoUrl && (
            <Image 
              source={{ uri: logoUrl }}
              style={{ height: 40, width: 40 }}
              resizeMode="contain"
              onError={(e) => {
                console.error('[Logo] Failed to load image from:', logoUrl);
              }}
            />
          )}
          <Text style={{ 
            color: isDarkMode ? '#ffffff' : '#111827',
            fontSize: 20,
            fontWeight: 'bold'
          }}>
            Powered by Sync
          </Text>
        </View>
      </View>
      
      <View style={{ flex: 1 }} />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Pressable 
          onPress={handleRefresh}
          style={({ pressed }) => ({
            padding: 8,
            opacity: pressed ? 0.7 : 1
          })}
        >
          <RefreshCw size={20} color={isDarkMode ? '#9ca3af' : '#6b7280'} />
        </Pressable>
        
        <View style={{ position: 'relative' }}>
          <Pressable 
            onPress={toggleNotifications}
            style={({ pressed }) => ({
              padding: 8,
              position: 'relative',
              opacity: pressed ? 0.7 : 1
            })}
          >
            <Bell size={20} color={isDarkMode ? '#9ca3af' : '#6b7280'} />
            {unreadCount > 0 && (
              <View style={{ 
                position: 'absolute',
                top: 4,
                right: 4,
                width: 8,
                height: 8,
                backgroundColor: '#ef4444',
                borderRadius: 4
              }} />
            )}
          </Pressable>

          {showNotifications && (
            <View style={{ 
              position: 'absolute',
              right: 0,
              marginTop: 8,
              width: 384,
              borderRadius: 8,
              backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
              borderWidth: 1,
              borderColor: isDarkMode ? '#374151' : '#e5e7eb',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
              elevation: 5,
              zIndex: 50
            }}>
              <View style={{ 
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb'
              }}>
                <Text style={{ 
                  fontWeight: '600',
                  color: isDarkMode ? '#ffffff' : '#111827'
                }}>
                  Recent Applications ({notifications.length})
                </Text>
              </View>
              <ScrollView style={{ maxHeight: 384 }}>
                {loading ? (
                  <View style={{ 
                    padding: 16,
                    alignItems: 'center'
                  }}>
                    <ActivityIndicator size="small" color={isDarkMode ? '#9ca3af' : '#6b7280'} />
                    <Text style={{ 
                      marginTop: 8,
                      color: isDarkMode ? '#9ca3af' : '#6b7280'
                    }}>
                      Loading...
                    </Text>
                  </View>
                ) : notifications.length === 0 ? (
                  <View style={{ 
                    padding: 16,
                    alignItems: 'center'
                  }}>
                    <Text style={{ 
                      color: isDarkMode ? '#9ca3af' : '#6b7280'
                    }}>
                      No new applications
                    </Text>
                  </View>
                ) : (
                  notifications.map((notification) => (
                    <Pressable 
                      key={notification.id}
                      style={({ pressed }) => ({
                        padding: 16,
                        borderBottomWidth: 1,
                        borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb',
                        backgroundColor: pressed 
                          ? (isDarkMode ? '#374151' : '#f9fafb')
                          : 'transparent'
                      })}
                    >
                      <Text style={{ 
                        fontWeight: '500',
                        color: isDarkMode ? '#ffffff' : '#111827'
                      }}>
                        {notification.customer_name}
                      </Text>
                      <Text style={{ 
                        fontSize: 14,
                        color: isDarkMode ? '#9ca3af' : '#6b7280'
                      }}>
                        Plan: {notification.plan_name}
                      </Text>
                      <Text style={{ 
                        fontSize: 12,
                        marginTop: 4,
                        color: isDarkMode ? '#6b7280' : '#6b7280'
                      }}>
                        {notification.formatted_date}
                      </Text>
                    </Pressable>
                  ))
                )}
              </ScrollView>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

export default Header;
