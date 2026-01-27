import React, { useState, useEffect } from 'react';
import './App.css';
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

  useEffect(() => {
    // Check for payment result in URL
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    const refNo = urlParams.get('ref');
    
    if (paymentStatus && refNo) {
      setPaymentSuccess(paymentStatus === 'success');
      setPaymentRef(refNo);
      setShowPaymentResult(true);
      
      // Clean up URL without reloading
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    // Initialize CSRF cookie and check auth status
    const initialize = async () => {
      try {
        await initializeCsrf();
      } catch (error) {
        console.error('Failed to initialize CSRF:', error);
      }

      const authData = localStorage.getItem('authData');
      if (authData) {
        try {
          const userData = JSON.parse(authData);
          setIsLoggedIn(true);
          
          // Load user's dark mode preference from database
          // User ID is at root level, not under user property
          const userId = userData.id;
          
          if (userId) {
            try {
              const response = await userSettingsService.getDarkMode(userId);
              
              if (response.success && response.data) {
                const darkmodeValue = response.data.darkmode;
                const isDark = darkmodeValue === 'active';
                
                localStorage.setItem('theme', isDark ? 'dark' : 'light');
                
                if (isDark) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              }
            } catch (error) {
              console.error('[App] Failed to load dark mode preference:', error);
              // Fallback to localStorage if API fails
              const savedTheme = localStorage.getItem('theme');
              if (savedTheme === 'dark') {
                document.documentElement.classList.add('dark');
              }
            }
          }
        } catch (error) {
          console.error('Error parsing auth data:', error);
          localStorage.removeItem('authData');
        }
      }
      setIsLoading(false);
    };

    initialize();
  }, []);

  const handleLogin = async (user: UserData) => {
    // Show loading screen while applying theme
    setIsLoggingIn(true);
    
    // Store user data in localStorage
    localStorage.setItem('authData', JSON.stringify(user));
    
    // Load user's dark mode preference immediately after login
    const userId = user.id;
    
    if (userId) {
      try {
        const response = await userSettingsService.getDarkMode(userId);
        
        if (response.success && response.data) {
          const darkmodeValue = response.data.darkmode;
          const isDark = darkmodeValue === 'active';
          
          // Disable all CSS transitions temporarily
          document.body.classList.add('disable-transitions');
          
          // Save to localStorage first
          localStorage.setItem('theme', isDark ? 'dark' : 'light');
          
          // Force remove both classes first to ensure clean state
          document.documentElement.classList.remove('dark');
          
          // Wait a tick for the DOM to update
          await new Promise(resolve => setTimeout(resolve, 50));
          
          // Then apply the correct class
          if (isDark) {
            document.documentElement.classList.add('dark');
          }
          
          // Re-enable transitions after theme is applied
          await new Promise(resolve => setTimeout(resolve, 100));
          document.body.classList.remove('disable-transitions');
        }
      } catch (error) {
        console.error('[App] Failed to load dark mode preference on login:', error);
        // Default to light mode if API fails
        localStorage.setItem('theme', 'light');
        document.documentElement.classList.remove('dark');
      }
    }
    
    // Longer delay to ensure theme is fully applied and DOM is updated before showing dashboard
    await new Promise(resolve => setTimeout(resolve, 600));
    
    setIsLoggingIn(false);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    // Remove user data from localStorage
    localStorage.removeItem('authData');
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
          isDarkMode={document.documentElement.classList.contains('dark')}
        />
      </>
    );
  }

  return <Login onLogin={handleLogin} />;
}

export default App;
