import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, Image, ScrollView, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { login, forgotPassword } from '../services/api';
import { UserData } from '../types/api';
import { formUIService } from '../services/formUIService';
import { settingsColorPaletteService } from '../services/settingsColorPaletteService';

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

  const convertGoogleDriveUrl = (url: string): string => {
    if (!url) return '';
    
    console.log('[Logo] Original URL:', url);
    
    const apiUrl = process.env.REACT_APP_API_URL || 'https://backend.atssfiber.ph/api';
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
      const demoEmail = process.env.REACT_APP_DEMO_EMAIL;
      const demoPassword = process.env.REACT_APP_DEMO_PASSWORD;
      
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

  if (showForgotPassword) {
    return (
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <View style={styles.header}>
            {logoUrl && (
              <View style={styles.logoContainer}>
                <Image 
                  source={{ uri: logoUrl }} 
                  style={styles.logo}
                  onError={() => {
                    console.error('[Logo] Failed to load image from:', logoUrl);
                    console.error('[Logo] Make sure the Google Drive file is shared as "Anyone with the link"');
                  }}
                />
              </View>
            )}
            <Text style={[styles.title, { color: primaryColor }]}>
              Reset Password
            </Text>
          </View>
          
          {forgotMessage ? (
            <View>
              <View style={styles.successMessage}>
                <Text style={styles.successText}>
                  {forgotMessage}
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  setShowForgotPassword(false);
                  setForgotMessage('');
                  setForgotEmail('');
                  setError('');
                }}
                style={[styles.button, { backgroundColor: primaryColor }]}
              >
                <Text style={styles.buttonText}>
                  Back to Login
                </Text>
              </Pressable>
            </View>
          ) : (
            <View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Email Address
                </Text>
                <TextInput
                  value={forgotEmail}
                  onChangeText={setForgotEmail}
                  style={styles.input}
                  placeholder="Enter your email address"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              
              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>
                    {error}
                  </Text>
                </View>
              )}
              
              <Pressable
                onPress={handleForgotPassword}
                disabled={isLoading}
                style={[styles.button, styles.buttonMargin, { backgroundColor: isLoading ? '#d1d5db' : '#16a34a' }]}
              >
                <Text style={styles.buttonText}>
                  {isLoading ? 'Sending...' : 'Send Reset Instructions'}
                </Text>
              </Pressable>
              
              <Pressable
                onPress={() => {
                  setShowForgotPassword(false);
                  setError('');
                }}
                style={[styles.outlineButton, { borderColor: primaryColor }]}
              >
                <Text style={[styles.outlineButtonText, { color: primaryColor }]}>
                  Back to Login
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      <View style={styles.card}>
        <View style={styles.header}>
          {logoUrl && (
            <View style={styles.logoContainer}>
              <Image 
                source={{ uri: logoUrl }} 
                style={styles.logo}
                onError={() => {
                  console.error('[Logo] Failed to load image from:', logoUrl);
                  console.error('[Logo] Make sure the Google Drive file is shared as "Anyone with the link"');
                }}
              />
            </View>
          )}
          <Text style={[styles.mainTitle, { color: primaryColor }]}>
            Powered by Sync
          </Text>
          <Text style={styles.subtitle}>
            Sign in to your account
          </Text>
        </View>
        
        <View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Email or Username
            </Text>
            <TextInput
              value={identifier}
              onChangeText={setIdentifier}
              style={styles.input}
              placeholder="Enter your email or username"
              autoCapitalize="none"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Password
            </Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              style={styles.input}
              placeholder="Enter your password"
              secureTextEntry
            />
          </View>
          
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>
                {error}
              </Text>
            </View>
          )}
          
          <Pressable
            onPress={handleSubmit}
            disabled={isLoading}
            style={[styles.button, styles.buttonMargin, { backgroundColor: isLoading ? '#d1d5db' : primaryColor }]}
          >
            <Text style={styles.buttonTextBold}>
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Text>
          </Pressable>
          
          <View style={styles.forgotContainer}>
            <Pressable
              onPress={() => {
                setShowForgotPassword(true);
                setError('');
              }}
            >
              <Text style={[styles.forgotText, { color: primaryColor }]}>
                Forgot your password?
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100%',
    padding: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    padding: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    width: '100%',
    maxWidth: 400,
    shadowColor: 'rgba(147, 51, 234, 0.1)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 4,
  },
  header: {
    textAlign: 'center',
    marginBottom: 30,
  },
  logoContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  logo: {
    height: 80,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 24,
    marginBottom: 10,
    textAlign: 'center',
  },
  mainTitle: {
    fontSize: 28,
    marginBottom: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: '#6b7280',
    fontSize: 16,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    display: 'flex',
    color: '#6b7280',
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    width: '100%',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    color: '#111827',
    fontSize: 16,
  },
  errorContainer: {
    marginBottom: 20,
    textAlign: 'center',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    textAlign: 'center',
  },
  successMessage: {
    textAlign: 'center',
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#16a34a',
  },
  successText: {
    color: '#16a34a',
    textAlign: 'center',
  },
  button: {
    width: '100%',
    padding: 12,
    borderRadius: 8,
  },
  buttonMargin: {
    marginBottom: 15,
  },
  buttonText: {
    color: '#ffffff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextBold: {
    color: '#ffffff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
  },
  outlineButton: {
    width: '100%',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  outlineButtonText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  forgotContainer: {
    textAlign: 'center',
  },
  forgotText: {
    fontSize: 14,
    fontWeight: '500',
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
});

export default Login;
