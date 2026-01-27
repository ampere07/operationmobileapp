import React, { useState, useEffect, useRef } from 'react';
import { Bell, RefreshCw } from 'lucide-react';
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
  const notificationRef = useRef<HTMLDivElement>(null);
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
    
    if ('Notification' in window) {
      console.log('[Notification] API available, current permission:', Notification.permission);
      
      if (Notification.permission === 'default') {
        console.log('[Notification] Requesting permission...');
        Notification.requestPermission().then(permission => {
          console.log('[Notification] Permission result:', permission);
          if (permission === 'granted') {
            console.log('[Notification] Permission GRANTED - notifications will work');
          } else {
            console.warn('[Notification] Permission DENIED - notifications will not work');
          }
        });
      } else if (Notification.permission === 'granted') {
        console.log('[Notification] Permission already GRANTED');
      } else {
        console.warn('[Notification] Permission DENIED');
      }
    } else {
      console.error('[Notification] API not supported in this browser');
    }
    
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const checkDarkMode = () => {
      const theme = localStorage.getItem('theme');
      setIsDarkMode(theme === 'dark' || theme === null);
    };

    checkDarkMode();

    const observer = new MutationObserver(() => {
      checkDarkMode();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  const showBrowserNotification = (notification: AppNotification) => {
    console.log('[Browser Notification] Attempting to show notification:', notification);
    
    if (!('Notification' in window)) {
    console.error('[Browser Notification] Browser does not support notifications');
    return;
    }

    if (Notification.permission !== 'granted') {
    console.warn('[Browser Notification] Permission not granted. Current permission:', Notification.permission);
    return;
    }

    try {
    const browserNotification = new Notification('🔔 New Customer Application', {
    body: `${notification.customer_name}\nPlan: ${notification.plan_name}`,
    icon: logoUrl || undefined,
    badge: logoUrl || undefined,
        tag: `application-${notification.id}`,
        requireInteraction: false,
        silent: false,
        timestamp: Date.now()
      });

      browserNotification.onclick = () => {
        console.log('[Browser Notification] Notification clicked');
        window.focus();
        browserNotification.close();
      };

      console.log('[Browser Notification] Notification created successfully for:', notification.customer_name);
    } catch (error) {
      console.error('[Browser Notification] Failed to create notification:', error);
    }
  };

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
            
            newNotifications.forEach((notification, index) => {
              console.log(`[Polling] Triggering browser notification ${index + 1}/${newNotifications.length}`);
              showBrowserNotification(notification);
            });
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  const handleToggleClick = () => {
    if (onToggleSidebar) {
      onToggleSidebar();
    }
  };

  const handleRefresh = () => {
    window.location.reload();
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
    <header className={`${
      isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'
    } border-b h-16 flex items-center px-4`}>
      <div className="flex items-center space-x-4">
        <button 
          onClick={handleToggleClick}
          className={`${
            isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-black'
          } p-2 transition-colors cursor-pointer`}
          type="button"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        
        <div className="flex items-center space-x-3">
          {logoUrl && (
            <img 
              src={logoUrl} 
              alt="Logo" 
              className="h-10 object-contain"
              crossOrigin="anonymous"
              referrerPolicy="no-referrer"
              onError={(e) => {
                console.error('[Logo] Failed to load image from:', logoUrl);
                e.currentTarget.style.display = 'none';
              }}
            />
          )}
          <h1 className={`${
            isDarkMode ? 'text-white' : 'text-gray-900'
          } text-xl font-bold`}>
            Powered by Sync
          </h1>
        </div>
      </div>
      
      <div className="flex-1"></div>

      <div className="flex items-center space-x-2">
        <button 
          onClick={handleRefresh}
          className={`p-2 ${
            isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-black'
          } transition-colors`}
        >
          <RefreshCw className="h-5 w-5" />
        </button>
        
        <div className="relative" ref={notificationRef}>
          <button 
            onClick={toggleNotifications}
            className={`p-2 relative ${
              isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-black'
            } transition-colors`}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            )}
          </button>

          {showNotifications && (
            <div className={`absolute right-0 mt-2 w-96 rounded-lg shadow-lg ${
              isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            } border z-50`}>
              <div className={`p-4 border-b ${
                isDarkMode ? 'border-gray-700' : 'border-gray-200'
              }`}>
                <h3 className={`font-semibold ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Recent Applications ({notifications.length})
                </h3>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {loading ? (
                  <div className={`p-4 text-center ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Loading...
                  </div>
                ) : notifications.length === 0 ? (
                  <div className={`p-4 text-center ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    No new applications
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div 
                      key={notification.id}
                      className={`p-4 border-b ${
                        isDarkMode ? 'border-gray-700 hover:bg-gray-750' : 'border-gray-200 hover:bg-gray-50'
                      } transition-colors cursor-pointer`}
                    >
                      <div className={`font-medium ${
                        isDarkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        {notification.customer_name}
                      </div>
                      <div className={`text-sm ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        Plan: {notification.plan_name}
                      </div>
                      <div className={`text-xs mt-1 ${
                        isDarkMode ? 'text-gray-500' : 'text-gray-500'
                      }`}>
                        {notification.formatted_date}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
