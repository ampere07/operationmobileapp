import apiClient from '../config/api';
import { 
  LoginResponse, 
  ForgotPasswordResponse, 
  HealthCheckResponse,
  ApplicationsResponse
} from '../types/api';

export const login = async (email: string, password: string): Promise<LoginResponse> => {
  const response = await apiClient.post<LoginResponse>('/login', {
    email,
    password
  });
  return response.data;
};

export const forgotPassword = async (account_no: string): Promise<ForgotPasswordResponse> => {
  const response = await apiClient.post<ForgotPasswordResponse>('/forgot-password', {
    account_no
  });
  return response.data;
};

export const healthCheck = async (): Promise<HealthCheckResponse> => {
  const response = await apiClient.get<HealthCheckResponse>('/health');
  return response.data;
};

export const fetchApplications = async (): Promise<ApplicationsResponse> => {
  try {
    const response = await apiClient.get<ApplicationsResponse>('/applications');
    return response.data;
  } catch (error) {
    console.error('Error fetching applications:', error);
    throw error;
  }
};

export const fetchAgentCommissionHistory = async (type?: string): Promise<any> => {
  try {
    const params = type && type !== 'all' ? { type } : {};
    const response = await apiClient.get('/commissions/history', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching agent commission history:', error);
    throw error;
  }
};

export const fetchAgentCommissionTrend = async (filter: string): Promise<any> => {
  try {
    const response = await apiClient.get('/commissions/trend', {
      params: { filter }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching agent commission trend:', error);
    throw error;
  }
};

export const createApplication = async (applicationData: any): Promise<any> => {
  try {
    const response = await apiClient.post('/applications', applicationData);
    return response.data;
  } catch (error) {
    console.error('Error creating application:', error);
    throw error;
  }
};

export const uploadApplicationImages = async (id: number | string, formData: FormData): Promise<any> => {
  try {
    const response = await apiClient.post(`/applications/${id}/upload-images`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error uploading application images:', error);
    throw error;
  }
};
