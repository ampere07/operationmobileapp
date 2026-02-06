import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  Linking,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView
} from 'react-native';
import { login, forgotPassword } from '../services/api';
import { UserData } from '../types/api';
import { formUIService } from '../services/formUIService';
import { ArrowRight } from 'lucide-react-native';

interface LoginProps {
  onLogin: (userData: UserData) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [accountNo, setAccountNo] = useState('');
  const [mobileNo, setMobileNo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

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
          setLogoUrl(convertGoogleDriveUrl(config.logo_url));
        }
      } catch (error) {
        console.error('[Logo] Error fetching logo:', error);
      }
    };

    fetchLogo();
  }, []);

  const handleSubmit = async () => {
    if (!accountNo || !mobileNo) {
      setError('Please enter your account number and mobile number');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await login(accountNo, mobileNo);
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
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1, justifyContent: 'center' }}
        >
          <ScrollView contentContainerStyle={styles.centerScroll}>
            <View style={styles.card}>
              <View style={styles.headerContainer}>
                <Text style={styles.headerText}>Reset Password</Text>
              </View>

              {forgotMessage ? (
                <View>
                  <View style={styles.successMessage}>
                    <Text style={styles.successText}>{forgotMessage}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setShowForgotPassword(false);
                      setForgotMessage('');
                      setForgotEmail('');
                      setError('');
                    }}
                    style={styles.primaryButton}
                  >
                    <Text style={styles.primaryButtonText}>Back to Login</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
                      value={forgotEmail}
                      onChangeText={setForgotEmail}
                      placeholder="Enter your email address"
                      placeholderTextColor="#9ca3af"
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>

                  {error ? (
                    <View style={styles.errorContainer}>
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  ) : null}

                  <TouchableOpacity
                    onPress={handleForgotPassword}
                    disabled={isLoading}
                    style={[styles.primaryButton, isLoading && styles.disabledButton]}
                  >
                    <Text style={styles.primaryButtonText}>
                      {isLoading ? 'Sending...' : 'Send Reset Instructions'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      setShowForgotPassword(false);
                      setError('');
                    }}
                    style={styles.textButton}
                  >
                    <Text style={styles.textButtonText}>Back to Login</Text>
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
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.mainCard}>
            {/* Left/Top Section - Gradient/Purple */}
            <View style={styles.purpleSection}>
              <View style={{ marginBottom: 40 }}>
                <Text style={styles.welcomeTitle}>Welcome Back</Text>
                <Text style={styles.welcomeSubtitle}>Please login to your account.</Text>
              </View>

              <View>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    value={accountNo}
                    onChangeText={setAccountNo}
                    placeholder="Username or Email"
                    placeholderTextColor="#9ca3af"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    value={mobileNo}
                    onChangeText={setMobileNo}
                    placeholder="Password"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry
                  />
                </View>

                {error ? (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={isLoading}
                  style={[styles.loginButton, isLoading && styles.disabledButton]}
                >
                  <Text style={[styles.loginButtonText, isLoading && { color: '#ffffff' }]}>
                    {isLoading ? 'LOGGING IN...' : 'SECURE LOGIN'}
                  </Text>
                  {!isLoading && <ArrowRight size={20} color="#6d28d9" />}
                </TouchableOpacity>

                <View style={{ alignItems: 'center', marginTop: 20 }}>
                  <TouchableOpacity
                    onPress={() => {
                      setShowForgotPassword(true);
                      setError('');
                    }}
                  >
                    <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Right/Bottom Section - White */}
            <View style={styles.whiteSection}>
              <View style={{ alignItems: 'center', marginBottom: 40 }}>
                {logoUrl && (
                  <Image
                    source={{ uri: logoUrl }}
                    style={styles.logo}
                    resizeMode="contain"
                  />
                )}
                <Text style={styles.poweredBy}>
                  Powered by <Text style={{ color: '#6d28d9' }}>Sync</Text>
                </Text>
              </View>

              <View style={{ alignItems: 'center', marginBottom: 30 }}>
                <Text style={styles.newHereTitle}>New Here?</Text>
                <Text style={styles.newHereSubtitle}>Apply online in just 2 minutes.</Text>
              </View>

              <TouchableOpacity
                onPress={() => {
                  Linking.openURL('https://apply.atssfiber.ph');
                }}
                style={styles.applyButton}
              >
                <Text style={styles.applyButtonText}>APPLY NOW</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  centerScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    padding: 40,
    borderRadius: 12,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  mainCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 30,
    elevation: 10,
    flexDirection: 'column', // Stacked for mobile default
  },
  purpleSection: {
    backgroundColor: '#6d28d9', // Fallback for linear gradient
    paddingVertical: 60,
    paddingHorizontal: 30,
    justifyContent: 'center',
  },
  whiteSection: {
    backgroundColor: '#ffffff',
    paddingVertical: 60,
    paddingHorizontal: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  headerText: {
    color: '#6d28d9',
    fontSize: 24,
    marginBottom: 10,
    fontWeight: '600',
  },
  successMessage: {
    padding: 15,
    backgroundColor: '#f0fdf4',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#16a34a',
    marginBottom: 20,
  },
  successText: {
    color: '#16a34a',
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 24,
  },
  input: {
    width: '100%',
    padding: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    color: '#111827',
    fontSize: 15,
    fontWeight: '600',
  },
  primaryButton: {
    width: '100%',
    padding: 14,
    backgroundColor: '#6d28d9',
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 15,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  textButton: {
    width: '100%',
    padding: 14,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#6d28d9',
    borderRadius: 8,
    alignItems: 'center',
  },
  textButtonText: {
    color: '#6d28d9',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    marginBottom: 20,
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 6,
  },
  errorText: {
    color: '#dc2626',
    textAlign: 'center',
    fontSize: 14,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 10,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.9,
    fontWeight: '700',
  },
  loginButton: {
    width: '100%',
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loginButtonText: {
    color: '#6d28d9',
    fontSize: 16,
    fontWeight: '700',
  },
  disabledButton: {
    backgroundColor: '#6b7280',
  },
  forgotPasswordText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  logo: {
    height: 120,
    width: 200, // Approximate width
    marginBottom: 10,
  },
  poweredBy: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 10,
  },
  newHereTitle: {
    fontSize: 36,
    fontWeight: '700',
    marginBottom: 15,
    color: '#6d28d9',
  },
  newHereSubtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  applyButton: {
    paddingVertical: 16,
    paddingHorizontal: 48,
    backgroundColor: '#6d28d9',
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  applyButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default Login;
