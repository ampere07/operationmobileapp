import React, { useState, useEffect } from 'react';
import { StatusBar, View, Text, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import LoginScreen from './src/pages/Login';
import DashboardScreen from './src/pages/Dashboard';
import LoadingScreen from './src/components/LoadingScreen';
import { storage } from './src/utils/storage';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const authData = await storage.getItem('authData');
      console.log('Auth check:', authData ? 'Found' : 'Not found');
      if (authData) {
        setIsLoggedIn(true);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSuccess = () => {
    console.log('Login successful');
    setIsLoggedIn(true);
  };

  const handleNavigate = (screen: string) => {
    console.log('Navigate to:', screen);
    // TODO: Implement proper navigation
  };

  // Show loading screen while checking auth
  if (isLoading) {
    return (
      <SafeAreaProvider>
        <LoadingScreen />
      </SafeAreaProvider>
    );
  }

  // Main app render
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor="#F2F2F7" />
      {!isLoggedIn ? (
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      ) : (
        <DashboardScreen onNavigate={handleNavigate} />
      )}
    </SafeAreaProvider>
  );
}
