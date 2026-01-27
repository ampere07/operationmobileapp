import apiClient from '../config/api';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  count?: number;
}

export interface LCP {
  id: number;
  lcp_name: string;
  coordinates?: string;
  street?: string;
  city?: string;
  region?: string;
  barangay?: string;
  modified_by?: string;
  modified_date?: string;
  created_at?: string;
  updated_at?: string;
}

export const getAllLCPs = async (): Promise<ApiResponse<LCP[]>> => {
  try {
    const response = await apiClient.get<ApiResponse<LCP[]>>('/lcp');
    return response.data;
  } catch (error: any) {
    console.error('Error fetching LCP records:', error);
    return {
      success: false,
      data: [],
      message: error.message || 'Failed to fetch LCP records'
    };
  }
};

export const getLCPById = async (id: number): Promise<ApiResponse<LCP>> => {
  try {
    const response = await apiClient.get<ApiResponse<LCP>>(`/lcp/${id}`);
    return response.data;
  } catch (error: any) {
    console.error('Error fetching LCP record:', error);
    throw error;
  }
};
