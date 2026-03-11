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
