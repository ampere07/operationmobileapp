import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Linking,
  SafeAreaView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { login, forgotPassword } from '../services/api';
import { UserData } from '../types/api';
import { formUIService } from '../services/formUIService';
import { settingsColorPaletteService } from '../services/settingsColorPaletteService';
// @ts-ignore
import { REACT_APP_API_URL, REACT_APP_DEMO_EMAIL, REACT_APP_DEMO_PASSWORD } from '@env';

interface LoginProps {
  onLogin: (userData: UserData) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState<string>('#9333ea');
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Check for Dark Mode
  useEffect(() => {
    const checkTheme = async () => {
      const theme = await AsyncStorage.getItem('theme');
      setIsDarkMode(theme === 'dark');
    };
    checkTheme();
  }, []);

  const convertGoogleDriveUrl = (url: string): string => {
    if (!url) return '';
    console.log('[Logo] Original URL:', url);

    // Use backend proxy to avoid CORS issues
    const apiUrl = REACT_APP_API_URL || 'https://backend.atssfiber.ph/api';
    const proxyUrl = `${apiUrl}/proxy/image?url=${encodeURIComponent(url)}`;

    console.log('[Logo] Using proxy URL:', proxyUrl);
    return proxyUrl;
  };

  useEffect(() => {
    const fetchLogo = async () => {
      try {
        console.log('[Logo] Fetching config from form_ui table...');
        const config = await formUIService.getConfig();
        console.log('[Logo] Config received:', config);

        if (config && config.logo_url) {
          console.log('[Logo] Logo URL from database:', config.logo_url);
          const directUrl = convertGoogleDriveUrl(config.logo_url);
          setLogoUrl(directUrl);
        } else {
          console.log('[Logo] No logo_url in config');
        }
      } catch (error) {
        console.error('[Logo] Error fetching logo:', error);
      }
    };

    const fetchColorPalette = async () => {
      try {
        console.log('[Color] Fetching active color palette...');
        const activePalette = await settingsColorPaletteService.getActive();
        console.log('[Color] Active palette:', activePalette);

        if (activePalette && activePalette.primary) {
          console.log('[Color] Using primary color:', activePalette.primary);
          setPrimaryColor(activePalette.primary);
        }
      } catch (error) {
        console.error('[Color] Error fetching color palette:', error);
      }
    };

    fetchLogo();
    fetchColorPalette();
  }, []);

  const handleSubmit = async () => {
    if (!identifier || !password) {
      setError('Please enter your username/email and password');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const demoEmail = REACT_APP_DEMO_EMAIL;
      const demoPassword = REACT_APP_DEMO_PASSWORD;

      if (identifier === demoEmail && password === demoPassword) {
        const mockUserData: UserData = {
          id: 1,
          username: 'admin',
          email: identifier,
          full_name: 'Admin User',
          role: 'administrator'
        };
        onLogin(mockUserData);
        return;
      }

      const response = await login(identifier, password);
      if (response.status === 'success') {
        const userData: UserData = {
          id: response.data.user.id,
          username: response.data.user.username,
          email: response.data.user.email,
          full_name: response.data.user.full_name,
          role: response.data.user.role,
          organization: response.data.user.organization
        };
        onLogin(userData);
      } else {
        setError('Login failed. Please try again.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail) {
      setError('Please enter your email address');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await forgotPassword(forgotEmail);
      if (response.status === 'success') {
        setForgotMessage(response.message);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send reset instructions.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Forgot Password Screen ---
  if (showForgotPassword) {
    return (
      <SafeAreaView className={`flex-1 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 justify-center p-6"
        >
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
            <View className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-sm'}`}>

              <View className="items-center mb-8">
                {logoUrl && (
                  <Image
                    source={{ uri: logoUrl }}
                    className="h-20 w-40 mb-5"
                    resizeMode="contain"
                  />
                )}
                <Text style={{ color: primaryColor }} className="text-2xl font-bold">
                  Reset Password
                </Text>
              </View>

              {forgotMessage ? (
                <View>
                  <View className="bg-green-50 border border-green-200 p-4 rounded-lg mb-6">
                    <Text className="text-green-700 text-center">{forgotMessage}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setShowForgotPassword(false);
                      setForgotMessage('');
                      setForgotEmail('');
                      setError('');
                    }}
                    style={{ backgroundColor: primaryColor }}
                    className="w-full py-3 rounded-lg"
                  >
                    <Text className="text-white text-center font-bold text-base">Back to Login</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
                  <View className="mb-6">
                    <Text className={`mb-2 font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Email Address
                    </Text>
                    <TextInput
                      value={forgotEmail}
                      onChangeText={setForgotEmail}
                      placeholder="Enter your email address"
                      placeholderTextColor={isDarkMode ? '#9ca3af' : '#9ca3af'}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      className={`w-full p-3 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
                        }`}
                    />
                  </View>

                  {error ? (
                    <Text className="text-red-500 text-center mb-4">{error}</Text>
                  ) : null}

                  <TouchableOpacity
                    onPress={handleForgotPassword}
                    disabled={isLoading}
                    style={{ backgroundColor: isLoading ? '#d1d5db' : '#16a34a' }}
                    className="w-full py-3 rounded-lg mb-4"
                  >
                    {isLoading ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text className="text-white text-center font-bold text-base">Send Reset Instructions</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      setShowForgotPassword(false);
                      setError('');
                    }}
                    style={{ borderColor: primaryColor, borderWidth: 1 }}
                    className="w-full py-3 rounded-lg"
                  >
                    <Text style={{ color: primaryColor }} className="text-center font-bold text-base">
                      Back to Login
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // --- Main Login Screen ---
  return (
    <SafeAreaView className={`flex-1 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 justify-center p-6"
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
          <View className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-sm'}`}>

            <View className="items-center mb-8">
              {logoUrl && (
                <Image
                  source={{ uri: logoUrl }}
                  className="h-20 w-48 mb-5"
                  resizeMode="contain"
                />
              )}
              <Text style={{ color: primaryColor }} className="text-lg font-bold mb-2">
                Powered by Sync
              </Text>
              <Text className={`text-base ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Sign in to your account
              </Text>
            </View>

            <View className="mb-5">
              <Text className={`mb-2 font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Email or Username
              </Text>
              <TextInput
                value={identifier}
                onChangeText={setIdentifier}
                placeholder="Enter your email or username"
                placeholderTextColor={isDarkMode ? '#9ca3af' : '#9ca3af'}
                autoCapitalize="none"
                className={`w-full p-3 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
                  }`}
              />
            </View>

            <View className="mb-6">
              <Text className={`mb-2 font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Password
              </Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor={isDarkMode ? '#9ca3af' : '#9ca3af'}
                secureTextEntry
                className={`w-full p-3 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
                  }`}
              />
            </View>

            {error ? (
              <Text className="text-red-500 text-center mb-4">{error}</Text>
            ) : null}

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isLoading}
              style={{ backgroundColor: isLoading ? '#d1d5db' : primaryColor }}
              className="w-full py-3 rounded-lg mb-4"
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white text-center font-bold text-base">Sign In</Text>
              )}
            </TouchableOpacity>

            <View className="items-center space-y-3 mt-2">
              <TouchableOpacity
                onPress={() => {
                  setShowForgotPassword(true);
                  setError('');
                }}
              >
                <Text style={{ color: primaryColor }} className="underline font-medium">
                  Forgot your password?
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => Linking.openURL('https://apply.atssfiber.ph')}
              >
                <Text style={{ color: primaryColor }} className="underline font-medium">
                  Apply
                </Text>
              </TouchableOpacity>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default Login;
