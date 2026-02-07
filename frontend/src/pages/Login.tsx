import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Linking,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { login as loginUser, forgotPassword } from '../services/api';
import { UserData } from '../types/api';
import { formUIService } from '../services/formUIService';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';
import { ArrowRight, Eye, EyeOff } from 'lucide-react-native';

interface LoginProps {
  onLogin: (userData: UserData) => void;
}

const { width } = Dimensions.get('window');

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [accountNo, setAccountNo] = useState('');
  const [mobileNo, setMobileNo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const convertGoogleDriveUrl = (url: string): string => {
    if (!url) return '';
    // Use the native environment variable logic or fallback
    const apiUrl = 'https://backend.atssfiber.ph/api';
    return `${apiUrl}/proxy/image?url=${encodeURIComponent(url)}`;
  };

  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const config = await formUIService.getConfig();
        if (config && config.logo_url) {
          setLogoUrl(convertGoogleDriveUrl(config.logo_url));
        }
      } catch (error) {
        console.error('[Logo] Error fetching logo:', error);
      }
    };

    fetchLogo();
  }, []);

  useEffect(() => {
    const fetchColorPalette = async () => {
      try {
        const activePalette = await settingsColorPaletteService.getActive();
        setColorPalette(activePalette);
      } catch (err) {
        console.error('Failed to fetch color palette:', err);
      }
    };
    fetchColorPalette();
  }, []);

  const handleSubmit = async () => {
    if (!accountNo || !mobileNo) {
      setError('Please enter your account number and mobile number');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await loginUser(accountNo, mobileNo);
      if (response.status === 'success') {
        const userData: UserData = {
          id: response.data.user.id,
          username: response.data.user.username,
          email: response.data.user.email,
          full_name: response.data.user.full_name,
          role: response.data.user.role,
          role_id: response.data.user.role_id,
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

  if (showForgotPassword) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f3f4f6' }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}>
            <View style={{
              backgroundColor: '#ffffff',
              padding: 30,
              borderRadius: 16,
              width: '100%',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 6,
              elevation: 5,
            }}>
              <View style={{ alignItems: 'center', marginBottom: 30 }}>
                <Text style={{ color: colorPalette?.primary || '#6d28d9', fontSize: 24, fontWeight: '600' }}>Reset Password</Text>
              </View>

              {forgotMessage ? (
                <View>
                  <View style={{
                    backgroundColor: '#f0fdf4',
                    padding: 15,
                    borderRadius: 30,
                    borderWidth: 1,
                    borderColor: '#16a34a',
                    marginBottom: 20,
                  }}>
                    <Text style={{ color: '#16a34a', textAlign: 'center' }}>{forgotMessage}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setShowForgotPassword(false);
                      setForgotMessage('');
                      setForgotEmail('');
                      setError('');
                    }}
                    style={{
                      width: '100%',
                      padding: 14,
                      backgroundColor: colorPalette?.primary || '#6d28d9',
                      borderRadius: 30,
                      alignItems: 'center',
                      marginBottom: 15,
                    }}
                  >
                    <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '600' }}>Back to Login</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
                  <View style={{ marginBottom: 20 }}>
                    <TextInput
                      style={{
                        width: '100%',
                        padding: 14,
                        backgroundColor: '#ffffff',
                        borderWidth: 1,
                        borderColor: '#d1d5db',
                        borderRadius: 12,
                        color: '#111827',
                        fontSize: 16,
                      }}
                      value={forgotEmail}
                      onChangeText={setForgotEmail}
                      placeholder="Enter your email address"
                      placeholderTextColor="#9ca3af"
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                  </View>

                  {error ? (
                    <Text style={{
                      color: '#dc2626',
                      marginBottom: 20,
                      textAlign: 'center',
                      fontSize: 14,
                    }}>{error}</Text>
                  ) : null}

                  <TouchableOpacity
                    onPress={handleForgotPassword}
                    disabled={isLoading}
                    style={{
                      width: '100%',
                      padding: 14,
                      backgroundColor: isLoading ? '#d1d5db' : '#16a34a',
                      borderRadius: 30,
                      alignItems: 'center',
                      marginBottom: 15,
                    }}
                  >
                    <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '600' }}>
                      {isLoading ? 'Sending...' : 'Send Reset Instructions'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      setShowForgotPassword(false);
                      setError('');
                    }}
                    style={{
                      width: '100%',
                      padding: 14,
                      backgroundColor: 'transparent',
                      borderWidth: 1,
                      borderColor: colorPalette?.primary || '#6d28d9',
                      borderRadius: 12,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: colorPalette?.primary || '#6d28d9', fontSize: 16, fontWeight: '600' }}>Back to Login</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f3f4f6' }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }} showsVerticalScrollIndicator={false}>
          {/* Logo Section */}
          <View style={{ alignItems: 'center', marginBottom: 30, marginTop: 20 }}>
            {logoUrl && (
              <Image
                source={{ uri: logoUrl }}
                style={{ height: 100, width: 200, marginBottom: 10 }}
                resizeMode="contain"
              />
            )}
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#6b7280', marginTop: 5 }}>
              Powered by <Text style={{ color: '#6d28d9' }}>Sync</Text>
            </Text>
          </View>

          {/* Login Form Section */}
          <View style={{
            backgroundColor: colorPalette?.primary || '#6d28d9',
            borderRadius: 24,
            padding: 30,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.1,
            shadowRadius: 20,
            elevation: 8,
            marginBottom: 30,
          }}>
            <View style={{ marginBottom: 30 }}>
              <Text style={{ fontSize: 32, fontWeight: '700', color: '#ffffff', marginBottom: 8 }}>Welcome Back</Text>
              <Text style={{ fontSize: 14, color: '#ffffff', opacity: 0.9, fontWeight: '600' }}>Please login to your account.</Text>
            </View>

            <View style={{ width: '100%' }}>
              <View style={{ marginBottom: 16 }}>
                <TextInput
                  style={{
                    width: '100%',
                    padding: 14,
                    backgroundColor: '#ffffff',
                    borderWidth: 1,
                    borderColor: '#d1d5db',
                    borderRadius: 12,
                    color: '#111827',
                    fontSize: 16,
                  }}
                  value={accountNo}
                  onChangeText={setAccountNo}
                  placeholder="Username or Email"
                  placeholderTextColor="#6b7280"
                  autoCapitalize="none"
                />
              </View>

              <View style={{ marginBottom: 16, position: 'relative' }}>
                <TextInput
                  style={{
                    width: '100%',
                    padding: 14,
                    paddingRight: 50,
                    backgroundColor: '#ffffff',
                    borderWidth: 1,
                    borderColor: '#d1d5db',
                    borderRadius: 12,
                    color: '#111827',
                    fontSize: 16,
                  }}
                  value={mobileNo}
                  onChangeText={setMobileNo}
                  placeholder="Password"
                  placeholderTextColor="#6b7280"
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 14,
                    top: 14,
                  }}
                >
                  {showPassword ? (
                    <EyeOff size={20} color="#6b7280" />
                  ) : (
                    <Eye size={20} color="#6b7280" />
                  )}
                </TouchableOpacity>
              </View>

              {error ? (
                <View style={{
                  backgroundColor: '#fee2e2',
                  padding: 12,
                  borderRadius: 6,
                  marginBottom: 20,
                }}>
                  <Text style={{ color: '#dc2626', fontSize: 14 }}>{error}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                onPress={handleSubmit}
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: 16,
                  backgroundColor: isLoading ? '#6b7280' : '#ffffff',
                  borderRadius: 30,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <Text style={{
                  color: isLoading ? '#ffffff' : (colorPalette?.primary || '#6d28d9'),
                  fontSize: 16,
                  fontWeight: '700',
                }}>
                  {isLoading ? 'LOGGING IN...' : 'SECURE LOGIN'}
                </Text>
                {!isLoading && <ArrowRight color={isLoading ? '#ffffff' : (colorPalette?.primary || '#6d28d9')} size={20} />}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setShowForgotPassword(true);
                  setError('');
                }}
                style={{ alignItems: 'center', marginTop: 20 }}
              >
                <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '700' }}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* New Here Section */}
          <View style={{ alignItems: 'center', marginBottom: 40, paddingHorizontal: 20 }}>
            <Text style={{
              fontSize: 30,
              fontWeight: '700',
              marginBottom: 10,
              color: colorPalette?.primary || '#6d28d9',
              textAlign: 'center',
            }}>New Here?</Text>
            <Text style={{
              fontSize: 16,
              color: '#6b7280',
              marginBottom: 20,
              textAlign: 'center',
            }}>Apply online in just 2 minutes.</Text>
            <TouchableOpacity
              onPress={() => Linking.openURL('https://apply.atssfiber.ph')}
              style={{
                paddingVertical: 16,
                paddingHorizontal: 48,
                backgroundColor: colorPalette?.primary || '#6d28d9',
                borderRadius: 30,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 6,
                elevation: 4,
              }}
            >
              <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '700' }}>APPLY NOW</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default Login;
