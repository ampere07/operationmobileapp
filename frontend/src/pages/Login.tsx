import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Linking
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
      <View className="flex-1 justify-center items-center bg-gray-100 p-5">
        <View className="bg-white p-10 rounded-xl w-full max-w-sm shadow-md">
          <View className="items-center mb-8">
            <Text className="text-purple-700 text-2xl font-semibold mb-2">
              Reset Password
            </Text>
          </View>

          {forgotMessage ? (
            <View>
              <View className="bg-green-50 p-4 rounded-full border border-green-600 mb-5">
                <Text className="text-green-600 text-center">
                  {forgotMessage}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setShowForgotPassword(false);
                  setForgotMessage('');
                  setForgotEmail('');
                  setError('');
                }}
                className="w-full p-4 bg-purple-700 rounded-full"
              >
                <Text className="text-white text-center text-base font-semibold">
                  Back to Login
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <View className="mb-5">
                <TextInput
                  value={forgotEmail}
                  onChangeText={setForgotEmail}
                  className="w-full p-4 bg-white border border-gray-300 rounded-full text-gray-900 text-base"
                  placeholder="Enter your email address"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              {error ? (
                <Text className="text-red-600 mb-5 text-center text-sm">
                  {error}
                </Text>
              ) : null}

              <TouchableOpacity
                onPress={handleForgotPassword}
                disabled={isLoading}
                className={`w-full p-4 rounded-full mb-4 ${isLoading ? 'bg-gray-300' : 'bg-green-600'}`}
              >
                <Text className="text-white text-center text-base font-semibold">
                  {isLoading ? 'Sending...' : 'Send Reset Instructions'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setShowForgotPassword(false);
                  setError('');
                }}
                className="w-full p-4 bg-transparent border border-purple-700 rounded-lg"
              >
                <Text className="text-purple-700 text-center text-base font-semibold">
                  Back to Login
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-gray-100"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        <View className="w-full max-w-3xl mx-auto bg-white rounded-2xl overflow-hidden shadow-lg flex-col-reverse md:flex-row m-4">

          {/* Left Side (Form) - Purple Background */}
          {/* Note: NativeWind handles media queries like md: if configured. 
              If standard setup, it might just apply base styles. 
              We use flex-col-reverse so on mobile (default) the form is at the bottom?
              Wait, original design:
              Mobile: New Here (Right) is Top. Login (Left) is Bottom.
              So Flex-Column-Reverse means: item 1 (Left) is at bottom, item 2 (Right) is at top.
              That sounds correct for mimicking the original CSS 'order' logic.
          */}
          <View className="flex-1 bg-purple-700 p-10 justify-center">
            <View className="mb-10">
              <Text className="text-3xl font-bold text-white mb-2">
                Welcome Back
              </Text>
              <Text className="text-sm text-white opacity-90 font-bold">
                Please login to your account.
              </Text>
            </View>

            <View>
              <View className="mb-6">
                <TextInput
                  value={accountNo}
                  onChangeText={setAccountNo}
                  className="w-full p-4 bg-white border border-gray-300 rounded-lg text-gray-900 text-base font-semibold"
                  placeholder="Username or Email"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="none"
                />
              </View>

              <View className="mb-8">
                <TextInput
                  value={mobileNo}
                  onChangeText={setMobileNo}
                  className="w-full p-4 bg-white border border-gray-300 rounded-lg text-gray-900 text-base font-semibold"
                  placeholder="Password"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry
                />
              </View>

              {error ? (
                <View className="bg-red-100 p-3 rounded-md mb-5">
                  <Text className="text-red-600 text-sm">
                    {error}
                  </Text>
                </View>
              ) : null}

              <TouchableOpacity
                onPress={handleSubmit}
                disabled={isLoading}
                className={`w-full p-4 rounded-full flex-row items-center justify-center gap-2 shadow-sm ${isLoading ? 'bg-gray-500' : 'bg-white'}`}
              >
                <Text className={`text-base font-bold ${isLoading ? 'text-white' : 'text-purple-700'}`}>
                  {isLoading ? 'LOGGING IN...' : 'SECURE LOGIN'}
                </Text>
                {!isLoading && <ArrowRight size={20} color="#6d28d9" />}
              </TouchableOpacity>

              <View className="items-center mt-5">
                <TouchableOpacity
                  onPress={() => {
                    setShowForgotPassword(true);
                    setError('');
                  }}
                  className="flex-row items-center gap-1"
                >
                  <Text className="text-white text-sm font-bold">
                    Forgot Password?
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Right Side (Info/Logo) - White Background */}
          {/* On mobile (flex-col-reverse), this comes First (Top). */}
          <View className="flex-1 bg-white p-10 items-center justify-center">
            <View className="items-center mb-10">
              {logoUrl && (
                <Image
                  source={{ uri: logoUrl }}
                  className="h-32 w-full mb-2"
                  resizeMode="contain"
                />
              )}
              <Text className="text-sm font-semibold text-gray-500 mt-2">
                Powered by <Text className="text-purple-700">Sync</Text>
              </Text>
            </View>

            <View className="items-center mb-8">
              <Text className="text-4xl font-bold text-purple-700 mb-4 text-center">
                New Here?
              </Text>
              <Text className="text-base text-gray-500 text-center">
                Apply online in just 2 minutes.
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => {
                Linking.openURL('https://apply.atssfiber.ph');
              }}
              className="py-4 px-12 bg-purple-700 rounded-full shadow-sm"
            >
              <Text className="text-white text-base font-bold">
                APPLY NOW
              </Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default Login;

