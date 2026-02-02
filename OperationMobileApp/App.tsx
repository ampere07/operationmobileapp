// Import localStorage polyfill first
import './src/polyfills/localStorage';

import React, { useState, useEffect } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Login from './src/pages/Login';
import Dashboard from './src/pages/Dashboard';
import { UserData } from './src/types/api';
import { initializeCsrf } from './src/config/api';
import { userSettingsService } from './src/services/userSettingsService';
import PaymentResultModal from './src/components/PaymentResultModal';
import SplashScreen from './src/components/SplashScreen';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showPaymentResult, setShowPaymentResult] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentRef, setPaymentRef] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      try {
        await initializeCsrf();
      } catch (error) {
        console.error('Failed to initialize CSRF:', error);
      }

      const authData = await AsyncStorage.getItem('authData');
      if (authData) {
        try {
          const userData = JSON.parse(authData);
          setIsLoggedIn(true);
          
          const userId = userData.id;
          
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
              console.error('[App] Failed to load dark mode preference:', error);
              const savedTheme = await AsyncStorage.getItem('theme');
              if (savedTheme === 'dark') {
                setIsDarkMode(true);
              }
            }
          }
        } catch (error) {
          console.error('Error parsing auth data:', error);
          await AsyncStorage.removeItem('authData');
        }
      }
      setIsLoading(false);
    };

    initialize();
  }, []);

  const handleLogin = async (user: UserData) => {
    setIsLoggingIn(true);
    
    await AsyncStorage.setItem('authData', JSON.stringify(user));
    
    const userId = user.id;
    
    if (userId) {
      try {
        const response = await userSettingsService.getDarkMode(userId);
        
        if (response.success && response.data) {
          const darkmodeValue = response.data.darkmode;
          const isDark = darkmodeValue === 'active';
          
          await AsyncStorage.setItem('theme', isDark ? 'dark' : 'light');
          
          await new Promise(resolve => setTimeout(resolve, 50));
          
          setIsDarkMode(isDark);
          
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error('[App] Failed to load dark mode preference on login:', error);
        await AsyncStorage.setItem('theme', 'light');
        setIsDarkMode(false);
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 600));
    
    setIsLoggingIn(false);
    setIsLoggedIn(true);
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('authData');
    setIsLoggedIn(false);
  };

  if (isLoading || isLoggingIn) {
    return (
      <SafeAreaProvider>
        <SplashScreen />
      </SafeAreaProvider>
    );
  }

  if (isLoggedIn) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={isDarkMode ? '#030712' : '#F2F2F7'} />
        <Dashboard onLogout={handleLogout} />
        <PaymentResultModal
          isOpen={showPaymentResult}
          onClose={() => setShowPaymentResult(false)}
          success={paymentSuccess}
          referenceNo={paymentRef}
          isDarkMode={isDarkMode}
        />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor="#F2F2F7" />
      <Login onLogin={handleLogin} />
    </SafeAreaProvider>
  );
}

export default App;
