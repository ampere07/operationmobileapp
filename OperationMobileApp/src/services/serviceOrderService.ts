import apiClient from '../config/api';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  count?: number;
  table?: string;
}

export interface ServiceOrderData {
  id: string;
  ticket_id: string;
  account_no: string;
  account_id?: number;
  timestamp: string;
  full_name: string;
  contact_number: string;
  full_address: string;
  contact_address: string;
  date_installed?: string;
  email_address?: string;
  house_front_picture_url?: string;
  plan?: string;
  group_name?: string;
  username?: string;
  connection_type?: string;
  router_modem_sn?: string;
  lcp?: string;
  nap?: string;
  port?: string;
  vlan?: string;
  lcpnap?: string;
  concern?: string;
  concern_remarks?: string;
  requested_by?: string;
  support_status?: string;
  assigned_email?: string;
  repair_category?: string;
  visit_status?: string;
  priority_level?: string;
  visit_by_user?: string;
  visit_with?: string;
  visit_remarks?: string;
  support_remarks?: string;
  service_charge?: number;
  new_router_sn?: string;
  new_lcpnap_id?: number;
  new_lcpnap?: string;
  new_plan_id?: number;
  new_plan?: string;
  client_signature_url?: string;
  image1_url?: string;
  image2_url?: string;
  image3_url?: string;
  status?: string;
  created_at?: string;
  created_by_user?: string;
  updated_at?: string;
  updated_by_user?: string;
}

// React Native "File" object for FormData
export interface RNFile {
  uri: string;
  type: string;
  name: string;
}

export const createServiceOrder = async (serviceOrderData: Partial<ServiceOrderData>) => {
  try {
    const response = await apiClient.post<ApiResponse<ServiceOrderData>>('/service-orders', serviceOrderData);
    return response.data;
  } catch (error) {
    console.error('Error creating service order:', error);
    throw error;
  }
};

export const getServiceOrders = async (assignedEmail?: string) => {
  try {
    const params: { assigned_email?: string; user_role?: string; fast: string } = { fast: '1' };

    if (assignedEmail) {
      params.assigned_email = assignedEmail;
    }

    // Auth handling needs to be async for React Native
    // This part should technically be passed FROM the component or handled via async storage helper
    // For now we assume the caller handles auth token in headers via interceptor or similar

    const response = await apiClient.get<ApiResponse<ServiceOrderData[]>>('/service-orders', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching service orders:', error);
    throw error;
  }
};

export const getServiceOrder = async (id: string) => {
  try {
    const response = await apiClient.get<ApiResponse<ServiceOrderData>>(`/service-orders/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching service order:', error);
    throw error;
  }
};

export const updateServiceOrder = async (id: string, serviceOrderData: Partial<ServiceOrderData>) => {
  try {
    const response = await apiClient.put<ApiResponse<ServiceOrderData>>(`/service-orders/${id}`, serviceOrderData);
    return response.data;
  } catch (error) {
    console.error('Error updating service order:', error);
    throw error;
  }
};

export const deleteServiceOrder = async (id: string) => {
  try {
    const response = await apiClient.delete<ApiResponse<void>>(`/service-orders/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting service order:', error);
    throw error;
  }
};

export const uploadServiceOrderImages = async (
  id: string,
  images: {
    image1?: RNFile | null;
    image2?: RNFile | null;
    image3?: RNFile | null;
    client_signature?: RNFile | null
  }
) => {
  try {
    const formData = new FormData();

    if (images.image1) {
      // @ts-ignore
      formData.append('image1', images.image1);
    }
    if (images.image2) {
      // @ts-ignore
      formData.append('image2', images.image2);
    }
    if (images.image3) {
      // @ts-ignore
      formData.append('image3', images.image3);
    }
    if (images.client_signature) {
      // @ts-ignore
      formData.append('client_signature', images.client_signature);
    }

    const response = await apiClient.post<ApiResponse<{ image1_url?: string; image2_url?: string; image3_url?: string }>>(
      `/service-orders/${id}/upload-images`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data;
  } catch (error: any) {
    throw error;
  }
};
