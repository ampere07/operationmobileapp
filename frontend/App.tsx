import React, { useState, useEffect } from 'react';
import './global.css';
import Login from './src/pages/Login';
import Dashboard from './src/pages/Dashboard';
import { UserData } from './src/types/api';
import { initializeCsrf, loadCookies, clearCookies } from './src/config/api';
import { userSettingsService } from './src/services/userSettingsService';
import PaymentResultModal from './src/components/PaymentResultModal';
import SplashScreen from './src/components/SplashScreen';
import { settingsColorPaletteService } from './src/services/settingsColorPaletteService';
import { PaymentSuccessProvider } from './src/contexts/PaymentSuccessContext';

import { View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';


function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showPaymentResult, setShowPaymentResult] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentRef, setPaymentRef] = useState('');

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
        await loadCookies();
        await initializeCsrf();
      } catch (error) {
        console.error('Failed to initialize CSRF or load cookies:', error);
      }

      // Pre-load the active configuration before rendering the app structure
      // This eliminates the styling FOUC (Flash of Unstyled Content) on the Login & Dashboard screens.
      try {
        await settingsColorPaletteService.getActive();
      } catch (error) {
        console.error('Failed to preload color palette:', error);
      }

      try {
        const authData = await AsyncStorage.getItem('authData');
        if (authData) {
          const parsedUser = JSON.parse(authData);
          setUserData(parsedUser);
          setIsLoggedIn(true);
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

      // Always set theme to light
      await AsyncStorage.setItem('theme', 'light');

      // Longer delay to ensure theme is fully applied
      await new Promise(resolve => setTimeout(resolve, 600));

    } catch (e) {
      console.error('Login error:', e);
    }

    setIsLoggingIn(false);
    setIsLoggedIn(true);
  };

  const handleLogout = async () => {
    // Remove user data and cookies from AsyncStorage
    await AsyncStorage.removeItem('authData');
    await clearCookies();
    setUserData(null);
    setIsLoggedIn(false);
  };

  // Show loading state while checking authentication or logging in
  if (isLoading || isLoggingIn) {
    return <SplashScreen />;
  }

  if (isLoggedIn) {
    return (
      <PaymentSuccessProvider>
        <Dashboard onLogout={handleLogout} />
        <PaymentResultModal
          isOpen={showPaymentResult}
          onClose={() => setShowPaymentResult(false)}
          success={paymentSuccess}
          referenceNo={paymentRef}
          isDarkMode={false}
        />
      </PaymentSuccessProvider>
    );
  }

  return <Login onLogin={handleLogin} />;
}

export default App;
