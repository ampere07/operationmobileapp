import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../config/api'; // Using the centralized client is better if possible, but sticking to logic

// Use the existing config or fallback
const API_BASE_URL = apiClient.defaults.baseURL || 'https://backend-operation-467261466041.asia-southeast1.run.app/api';

export interface PendingPayment {
  reference_no: string;
  payment_url: string;
  amount: number;
  status: string;
  payment_date: string;
}

export interface PaymentResponse {
  status: string;
  reference_no?: string;
  payment_url?: string;
  payment_id?: string;
  amount?: number;
  account_balance?: number;
  message?: string;
  pending_payment?: PendingPayment;
}

export interface PaymentStatusResponse {
  status: string;
  payment?: {
    reference_no: string;
    amount: number;
    status: string;
    transaction_status: string;
    date_time: string;
  };
  message?: string;
}

const getAuthToken = async () => {
  try {
    const authData = await AsyncStorage.getItem('authData');
    if (authData) {
      const parsed = JSON.parse(authData);
      return parsed.token || '';
    }
  } catch { return ''; }
  return '';
};

export const paymentService = {
  getAccountBalance: async (accountNo: string): Promise<number> => {
    try {
      const token = await getAuthToken();

      const response = await axios.post<{ status: string; account_balance?: number }>(
        `${API_BASE_URL}/payments/account-balance`,
        { account_no: accountNo },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          }
        }
      );

      return response.data.account_balance || 0;
    } catch (error: any) {
      console.error('Get account balance error:', error.response?.data || error.message);
      return 0;
    }
  },

  checkPendingPayment: async (accountNo: string): Promise<PendingPayment | null> => {
    try {
      const token = await getAuthToken();

      const response = await axios.post<{ status: string; pending_payment?: PendingPayment }>(
        `${API_BASE_URL}/payments/check-pending`,
        { account_no: accountNo },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          }
        }
      );

      return response.data.pending_payment || null;
    } catch (error: any) {
      console.error('Check pending payment error:', error.response?.data || error.message);
      return null;
    }
  },

  createPayment: async (accountNo: string, amount: number): Promise<PaymentResponse> => {
    try {
      console.log('Payment Service - Creating payment:', { accountNo, amount });

      if (!accountNo || accountNo.trim() === '') {
        throw new Error('Account number is missing. Please log in again.');
      }

      const token = await getAuthToken();

      const payload = {
        account_no: accountNo,
        amount: amount
      };

      const response = await axios.post<PaymentResponse>(
        `${API_BASE_URL}/payments/create`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          }
        }
      );

      return response.data as PaymentResponse;
    } catch (error: any) {
      console.error('Payment creation error:', error.response?.data || error.message);

      if (error.response?.data) {
        throw new Error(error.response.data.message || 'Payment creation failed');
      }
      throw new Error(error.message || 'Network error. Please check your connection.');
    }
  },

  checkPaymentStatus: async (referenceNo: string): Promise<PaymentStatusResponse> => {
    try {
      const token = await getAuthToken();

      const response = await axios.post<PaymentStatusResponse>(
        `${API_BASE_URL}/payments/status`,
        {
          reference_no: referenceNo
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          }
        }
      );

      return response.data as PaymentStatusResponse;
    } catch (error: any) {
      if (error.response?.data) {
        throw new Error(error.response.data.message || 'Failed to check payment status');
      }
      throw new Error('Network error. Please check your connection.');
    }
  }
};
