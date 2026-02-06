import React, { useState, useEffect } from 'react';
import './global.css';
import Login from './src/pages/Login';
import Dashboard from './src/pages/Dashboard';
import { UserData } from './src/types/api';
import { initializeCsrf } from './src/config/api';
import { userSettingsService } from './src/services/userSettingsService';
import PaymentResultModal from './src/components/PaymentResultModal';
import SplashScreen from './src/components/SplashScreen';

import { View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { useColorScheme } from 'nativewind';

// NOTE: removed polyfills as we are now using native modules.


function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showPaymentResult, setShowPaymentResult] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentRef, setPaymentRef] = useState('');

  const { colorScheme, setColorScheme } = useColorScheme();

  useEffect(() => {
    const initialize = async () => {
      // Check for payment result in URL
      try {
        const url = await Linking.getInitialURL();
        if (url) {
          const { queryParams } = Linking.parse(url);
          if (queryParams?.payment && queryParams?.ref) {
            setPaymentSuccess(queryParams.payment === 'success');
            setPaymentRef(queryParams.ref as string);
            setShowPaymentResult(true);
          }
        }
      } catch (e) {
        console.error('Failed to parse linking URL:', e);
      }

      // Initialize CSRF cookie and check auth status
      try {
        await initializeCsrf();
      } catch (error) {
        console.error('Failed to initialize CSRF:', error);
      }

      try {
        const authData = await AsyncStorage.getItem('authData');
        if (authData) {
          const parsedUser = JSON.parse(authData);
          setUserData(parsedUser);
          setIsLoggedIn(true);

          // Load user's dark mode preference from database
          const userId = parsedUser.id;
          if (userId) {
            try {
              const response = await userSettingsService.getDarkMode(userId);
              if (response.success && response.data) {
                const darkmodeValue = response.data.darkmode;
                const isDark = darkmodeValue === 'active';

                await AsyncStorage.setItem('theme', isDark ? 'dark' : 'light');
                setColorScheme(isDark ? 'dark' : 'light');
              }
            } catch (error) {
              console.error('[App] Failed to load dark mode preference:', error);
              // Fallback to AsyncStorage if API fails
              const savedTheme = await AsyncStorage.getItem('theme');
              if (savedTheme === 'dark') {
                setColorScheme('dark');
              }
            }
          }
        }
      } catch (error) {
        console.error('Error parsing auth data:', error);
        await AsyncStorage.removeItem('authData');
      }

      setIsLoading(false);
    };

    initialize();
  }, []);

  const handleLogin = async (user: UserData) => {
    setUserData(user);
    // Show loading screen while applying theme
    setIsLoggingIn(true);

    try {
      // Store user data in AsyncStorage
      await AsyncStorage.setItem('authData', JSON.stringify(user));

      // Load user's dark mode preference immediately after login
      const userId = user.id;

      if (userId) {
        try {
          const response = await userSettingsService.getDarkMode(userId);

          if (response.success && response.data) {
            const darkmodeValue = response.data.darkmode;
            const isDark = darkmodeValue === 'active';

            // Save to AsyncStorage first
            await AsyncStorage.setItem('theme', isDark ? 'dark' : 'light');

            // Apply theme
            setColorScheme(isDark ? 'dark' : 'light');
          }
        } catch (error) {
          console.error('[App] Failed to load dark mode preference on login:', error);
          // Default to light mode if API fails
          await AsyncStorage.setItem('theme', 'light');
          setColorScheme('light');
        }
      }

      // Longer delay to ensure theme is fully applied
      await new Promise(resolve => setTimeout(resolve, 600));

    } catch (e) {
      console.error('Login error:', e);
    }

    setIsLoggingIn(false);
    setIsLoggedIn(true);
  };

  const handleLogout = async () => {
    // Remove user data from AsyncStorage
    await AsyncStorage.removeItem('authData');
    setUserData(null);
    setIsLoggedIn(false);
  };

  // Show loading state while checking authentication or logging in
  if (isLoading || isLoggingIn) {
    return <SplashScreen />;
  }

  if (isLoggedIn) {
    return (
      <>
        <Dashboard onLogout={handleLogout} />
        <PaymentResultModal
          isOpen={showPaymentResult}
          onClose={() => setShowPaymentResult(false)}
          success={paymentSuccess}
          referenceNo={paymentRef}
          isDarkMode={
            userData && (userData.role === 'customer' || String(userData.role_id) === '3')
              ? false
              : colorScheme === 'dark'
          }
        />
      </>
    );
  }

  return <Login onLogin={handleLogin} />;
}

export default App;
