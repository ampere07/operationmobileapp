import axios from 'axios';
// @ts-ignore
import { REACT_APP_API_BASE_URL } from '@env';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define the base URL
const API_BASE_URL = REACT_APP_API_BASE_URL || 'http://10.0.2.2:8000/api'; // Fallback for Android emulator

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 60000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

export const initializeCsrf = async (): Promise<void> => {
  try {
    const baseUrl = API_BASE_URL.replace(/\/api$/, '');
    await axios.get(`${baseUrl}/sanctum/csrf-cookie`, {
      withCredentials: true,
    });
    // In React Native, cookies are handled by the underlying OS network stack usually.
    // If you need manual token handling, extract it here.
  } catch (error) {
    console.log('CSRF initialization failed', error);
  }
};

apiClient.interceptors.request.use(
  async (config) => {
    // Check for auth token in AsyncStorage if you use Bearer tokens
    // Check for auth token in AsyncStorage
    let token = await AsyncStorage.getItem('authToken');

    // Fallback: Check authData object
    if (!token) {
      const authData = await AsyncStorage.getItem('authData');
      if (authData) {
        try {
          const parsed = JSON.parse(authData);
          if (parsed.token) token = parsed.token;
        } catch (e) {
          console.error('Error parsing authData in interceptor', e);
        }
      }
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // If bridging existing web session logic, cookies might persist automatically.
    // If you explicitly need XSRF header from a cookie:
    // const xsrfToken = await getXsrfTokenFromCookieManager();
    // if (xsrfToken) config.headers['X-XSRF-TOKEN'] = xsrfToken;

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    if (error.response?.status === 419) {
      // CSRF token mismatch refresh logic could go here
    }
    return Promise.reject(error);
  }
);

export default apiClient;
export { API_BASE_URL };
