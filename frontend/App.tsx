import React, { useState, useEffect, useRef } from 'react';
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
import IdleWarningModal from './src/modals/IdleWarningModal';

import { View, AppState, PanResponder } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';

const IDLE_TIMEOUT = 2 * 60 * 60 * 1000; // 2 hours in ms
const WARNING_TIMEOUT = 1.5 * 60 * 60 * 1000; // 1.5 hours in ms

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showPaymentResult, setShowPaymentResult] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentRef, setPaymentRef] = useState('');

  const [showIdleWarning, _setShowIdleWarning] = useState(false);
  const isWarningVisible = useRef(false);

  const setShowIdleWarning = (visible: boolean) => {
    isWarningVisible.current = visible;
    _setShowIdleWarning(visible);
  };

  const lastInteractionTime = useRef<number>(Date.now());
  const logoutTimer = useRef<NodeJS.Timeout | null>(null);
  const warningTimer = useRef<NodeJS.Timeout | null>(null);

  const handleLogout = async () => {
    // Remove user data and cookies from AsyncStorage
    await AsyncStorage.removeItem('authData');
    await AsyncStorage.removeItem('authToken');
    await clearCookies();
    setUserData(null);
    setIsLoggedIn(false);
    setShowIdleWarning(false);
    if (warningTimer.current) clearTimeout(warningTimer.current);
    if (logoutTimer.current) clearTimeout(logoutTimer.current);
  };

  const resetTimer = () => {
    lastInteractionTime.current = Date.now();
    if (warningTimer.current) {
      clearTimeout(warningTimer.current);
    }
    if (logoutTimer.current) {
      clearTimeout(logoutTimer.current);
    }
    
    if (isWarningVisible.current) {
      setShowIdleWarning(false);
    }

    if (isLoggedIn) {
      warningTimer.current = setTimeout(() => {
        setShowIdleWarning(true);
      }, WARNING_TIMEOUT);

      logoutTimer.current = setTimeout(() => {
        handleLogout();
      }, IDLE_TIMEOUT);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      resetTimer();
    } else {
      if (warningTimer.current) clearTimeout(warningTimer.current);
      if (logoutTimer.current) clearTimeout(logoutTimer.current);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && isLoggedIn) {
        const timeSinceLastInteraction = Date.now() - lastInteractionTime.current;
        if (timeSinceLastInteraction >= IDLE_TIMEOUT) {
          handleLogout();
        } else if (timeSinceLastInteraction >= WARNING_TIMEOUT) {
          // Warning window
          setShowIdleWarning(true);
          
          if (warningTimer.current) clearTimeout(warningTimer.current);
          if (logoutTimer.current) clearTimeout(logoutTimer.current);
          
          const remainingTime = IDLE_TIMEOUT - timeSinceLastInteraction;
          logoutTimer.current = setTimeout(() => {
            handleLogout();
          }, remainingTime > 0 ? remainingTime : 0);
        } else {
          resetTimer();
        }
      }
    });

    return () => {
      subscription.remove();
      if (warningTimer.current) clearTimeout(warningTimer.current);
      if (logoutTimer.current) clearTimeout(logoutTimer.current);
    };
  }, [isLoggedIn]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: () => {
        if (!isWarningVisible.current) {
          resetTimer();
        }
        return false;
      },
      onMoveShouldSetPanResponderCapture: () => {
        if (!isWarningVisible.current) {
          resetTimer();
        }
        return false;
      },
      onPanResponderTerminationRequest: () => true,
    })
  ).current;

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
    resetTimer(); // Start the timer when logged in
  };

  // Show loading state while checking authentication or logging in
  if (isLoading || isLoggingIn) {
    return <SplashScreen />;
  }

  return (
    <View style={{ flex: 1 }} {...panResponder.panHandlers}>
      {isLoggedIn ? (
        <PaymentSuccessProvider>
          <Dashboard onLogout={handleLogout} />
          <PaymentResultModal
            isOpen={showPaymentResult}
            onClose={() => setShowPaymentResult(false)}
            success={paymentSuccess}
            referenceNo={paymentRef}
            isDarkMode={false}
          />
          <IdleWarningModal 
            visible={showIdleWarning}
            onStayLoggedIn={resetTimer}
            onLogout={handleLogout}
            countdown={30}
          />
        </PaymentSuccessProvider>
      ) : (
        <Login onLogin={handleLogin} />
      )}
    </View>
  );
}

export default App;
