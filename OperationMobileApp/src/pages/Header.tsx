import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Image, Modal, ScrollView, Animated } from 'react-native';
import { Bell, RefreshCw, Menu } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationService, type Notification as AppNotification } from '../services/notificationService';
import { formUIService } from '../services/formUIService';
// @ts-ignore
import { REACT_APP_API_URL } from '@env';

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
  const previousNotificationIdsRef = useRef<Set<number>>(new Set());

  const convertGoogleDriveUrl = (url: string): string => {
    if (!url) return '';
    const apiUrl = REACT_APP_API_URL || 'https://backend.atssfiber.ph/api';
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
    const checkDarkMode = async () => {
      const theme = await AsyncStorage.getItem('theme');
      setIsDarkMode(theme === 'dark' || theme === null);
    };
    checkDarkMode();
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    const fetchInitialData = async () => {
      if (!mountedRef.current) return;
      try {
        const data = await notificationService.getRecentApplications(10);
        const count = await notificationService.getUnreadCount();

        if (mountedRef.current) {
          setUnreadCount(count);
          setNotifications(data);
          previousNotificationIdsRef.current = new Set(data.map(n => n.id));
        }
      } catch (error) {
        console.error('[Fetch] Failed to fetch initial notifications:', error);
      }
    };

    fetchInitialData();

    const interval = setInterval(async () => {
      if (!mountedRef.current) return;
      try {
        const data = await notificationService.getRecentApplications(10);
        const count = await notificationService.getUnreadCount();

        if (mountedRef.current) {
          setUnreadCount(count);
          setNotifications(data);
        }
      } catch (error) {
        console.error('[Polling] Failed to fetch notifications:', error);
      }
    }, 30000);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, []);

  const handleRefresh = () => {
    // In RN, reload isn't standard, usually we refresh data. 
    // We'll treating this as re-fetch notifications
    setLoading(true);
    notificationService.getRecentApplications(10).then(data => {
      setNotifications(data);
      setLoading(false);
    });
  };

  const toggleNotifications = async () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications) {
      setLoading(true);
      try {
        const data = await notificationService.getRecentApplications(10);
        const count = await notificationService.getUnreadCount();
        if (mountedRef.current) {
          setNotifications(data);
          setUnreadCount(count);
        }
      } catch (error) {
        console.error('[UI] Failed to fetch notifications for modal:', error);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    }
  };

  return (
    <View className={`h-16 flex-row items-center px-4 border-b ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'
      }`}>
      <View className="flex-row items-center space-x-4">
        <TouchableOpacity
          onPress={onToggleSidebar}
          className={`p-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded-lg`}
        >
          <Menu size={20} color={isDarkMode ? '#9ca3af' : '#4b5563'} />
        </TouchableOpacity>

        <View className="justify-center">
          {logoUrl && (
            <Image
              source={{ uri: logoUrl }}
              className="h-8 w-24"
              resizeMode="contain"
            />
          )}
          <Text className={`${isDarkMode ? 'text-white' : 'text-gray-900'
            } text-xs font-semibold mt-1`}>
            Powered by Sync
          </Text>
        </View>
      </View>

      <View className="flex-1" />

      <View className="flex-row items-center space-x-2">
        <TouchableOpacity
          onPress={handleRefresh}
          className={`p-2 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
        >
          <RefreshCw size={20} color={isDarkMode ? '#9ca3af' : '#4b5563'} />
        </TouchableOpacity>

        <View>
          <TouchableOpacity
            onPress={toggleNotifications}
            className={`p-2 rounded-full relative ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
          >
            <Bell size={20} color={isDarkMode ? '#9ca3af' : '#4b5563'} />
            {unreadCount > 0 && (
              <View className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border border-white" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Notifications Modal / Dropdown Overlay */}
      <Modal
        visible={showNotifications}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowNotifications(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }}
          activeOpacity={1}
          onPress={() => setShowNotifications(false)}
        >
          <View className="absolute top-16 right-4 w-80 shadow-xl rounded-lg overflow-hidden">
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View className={`${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
                } rounded-lg overflow-hidden`}>
                <View className={`p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <Text className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Recent Applications ({notifications.length})
                  </Text>
                </View>

                <ScrollView style={{ maxHeight: 300 }}>
                  {loading ? (
                    <View className="p-4 items-center">
                      <Text className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Loading...</Text>
                    </View>
                  ) : notifications.length === 0 ? (
                    <View className="p-4 items-center">
                      <Text className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>No new applications</Text>
                    </View>
                  ) : (
                    notifications.map((notification) => (
                      <View
                        key={notification.id}
                        className={`p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'
                          }`}
                      >
                        <Text className={`font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {notification.customer_name}
                        </Text>
                        <Text className={`text-sm mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          Plan: {notification.plan_name}
                        </Text>
                        <Text className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                          {notification.formatted_date}
                        </Text>
                      </View>
                    ))
                  )}
                </ScrollView>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

    </View>
  );
};

export default Header;
