import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Update this to your API URL
const API_BASE_URL = 'https://backend.atssfiber.ph/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    try {
      const authData = await AsyncStorage.getItem('authData');
      if (authData) {
        const parsedData = JSON.parse(authData);
        const token = parsedData.token || parsedData.access_token;
        
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Clear auth data on unauthorized
      await AsyncStorage.removeItem('authData');
      // The navigation will be handled by the app's auth state
    }
    return Promise.reject(error);
  }
);

// Initialize CSRF if needed (for web compatibility)
export const initializeCsrf = async () => {
  try {
    await api.get('/sanctum/csrf-cookie');
  } catch (error) {
    console.warn('CSRF initialization failed:', error);
  }
};

export default api;
