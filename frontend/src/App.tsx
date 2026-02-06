import React, { useState, useEffect } from 'react';
import { View, Linking, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import { UserData } from './types/api';
import { initializeCsrf } from './config/api';
import { userSettingsService } from './services/userSettingsService';
import PaymentResultModal from './components/PaymentResultModal';
import SplashScreen from './components/SplashScreen';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showPaymentResult, setShowPaymentResult] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentRef, setPaymentRef] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(true); // Default to dark mode or load from storage

  useEffect(() => {
    // Check for payment result in URL (Deep Linking for mobile)
    const handleDeepLink = (event: { url: string } | null) => {
      const url = event?.url;
      if (!url) return;

      try {
        // Parse URL parameters. URLSearchParams might not work fully in hermes for custom schemes like myapp://
        // Simple parsing:
        if (url.includes('?')) {
          const paramsPart = url.split('?')[1];
          const params = new URLSearchParams(paramsPart);
          const paymentStatus = params.get('payment');
          const refNo = params.get('ref');

          if (paymentStatus && refNo) {
            setPaymentSuccess(paymentStatus === 'success');
            setPaymentRef(refNo);
            setShowPaymentResult(true);
          }
        }
      } catch (e) {
        console.error('Deep link parsing error', e);
      }
    };

    // Get initial URL
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    // Listen for incoming links
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Initialize CSRF logic and Auth
    const initialize = async () => {
      try {
        await initializeCsrf();
      } catch (error) {
        console.error('Failed to initialize CSRF:', error);
      }

      try {
        const authData = await AsyncStorage.getItem('authData');
        const theme = await AsyncStorage.getItem('theme');
        setIsDarkMode(theme === 'dark' || theme === null); // Default dark if null

        if (authData) {
          try {
            const userData = JSON.parse(authData);
            setIsLoggedIn(true);

            // Load user's dark mode preference from database
            const userId = userData.id;

            if (userId) {
              // In background update theme preference
              userSettingsService.getDarkMode(userId).then(response => {
                if (response.success && response.data) {
                  const darkmodeValue = response.data.darkmode;
                  const isDark = darkmodeValue === 'active';
                  AsyncStorage.setItem('theme', isDark ? 'dark' : 'light');
                  setIsDarkMode(isDark);
                }
              }).catch(err => console.log('Dark mode fetch error', err));
            }
          } catch (error) {
            console.error('Error parsing auth data:', error);
            await AsyncStorage.removeItem('authData');
          }
        }
      } catch (e) {
        console.error('Initialization error', e);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();

    return () => {
      subscription.remove();
    };
  }, []);

  const handleLogin = async (user: UserData) => {
    setIsLoggingIn(true);

    try {
      await AsyncStorage.setItem('authData', JSON.stringify(user));

      const userId = user.id;
      if (userId) {
        try {
          const response = await userSettingsService.getDarkMode(userId);
          if (response.success && response.data) {
            const darkmodeValue = response.data.darkmode;
            const isDark = darkmodeValue === 'active';
            await AsyncStorage.setItem('theme', isDark ? 'dark' : 'light');
            setIsDarkMode(isDark);
          }
        } catch (error) {
          console.log('Login theme fetch error', error);
          // Fallback
          await AsyncStorage.setItem('theme', 'light');
          setIsDarkMode(false);
        }
      }
    } catch (e) {
      console.error('Login storage error', e);
      Alert.alert('Login Error', 'Failed to save session');
    }

    // Artificial delay or precise timing not strictly needed in RN as much as DOM, but keeping brief for transitions
    setTimeout(() => {
      setIsLoggingIn(false);
      setIsLoggedIn(true);
    }, 500);
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('authData');
      setIsLoggedIn(false);
    } catch (e) {
      console.error('Logout error', e);
    }
  };

  // Show loading screen while checking authentication or logging in
  if (isLoading || isLoggingIn) {
    return <SplashScreen />;
  }

  if (isLoggedIn) {
    return (
      <View className={`flex-1 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <Dashboard onLogout={handleLogout} />
        <PaymentResultModal
          isOpen={showPaymentResult}
          onClose={() => setShowPaymentResult(false)}
          success={paymentSuccess}
          referenceNo={paymentRef}
          isDarkMode={isDarkMode}
        />
      </View>
    );
  }

  return <Login onLogin={handleLogin} />;
}

export default App;
