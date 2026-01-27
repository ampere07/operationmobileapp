import apiClient from '../config/api';

export interface SOARecord {
  id: number;
  account_no: string;
  statement_date: string;
  balance_from_previous_bill: number;
  payment_received_previous: number;
  remaining_balance_previous: number;
  monthly_service_fee: number;
  others_and_basic_charges: number;
  service_charge: number;
  rebate: number;
  discounts: number;
  staggered: number;
  vat: number;
  due_date: string;
  amount_due: number;
  total_amount_due: number;
  print_link?: string;
  created_by: string;
  updated_by: string;
  created_at?: string;
  updated_at?: string;
  account?: {
    account_no: string;
    date_installed?: string;
    billing_day: number;
    customer?: {
      full_name: string;
      contact_number_primary?: string;
      email_address?: string;
      address?: string;
      desired_plan?: string;
      barangay?: string;
      city?: string;
      region?: string;
    };
  };
}

export interface SOAResponse {
  success: boolean;
  data: SOARecord[];
  count?: number;
  message?: string;
}

export const soaService = {
  async getAllStatements(): Promise<SOARecord[]> {
    try {
      const response = await apiClient.get<SOAResponse>('/billing-generation/statements');
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || 'Failed to fetch statements');
    } catch (error) {
      console.error('Error fetching SOA records:', error);
      throw error;
    }
  },

  async getStatementsByAccount(accountId: number): Promise<SOARecord[]> {
    try {
      const response = await apiClient.get<SOAResponse>('/billing-generation/statements', {
        params: { account_id: accountId }
      });
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || 'Failed to fetch statements');
    } catch (error) {
      console.error('Error fetching SOA records by account:', error);
      throw error;
    }
  },

  async getStatementById(id: number): Promise<SOARecord> {
    try {
      const response = await apiClient.get<{ success: boolean; data: SOARecord }>(`/billing-generation/statements/${id}`);
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error('Failed to fetch statement');
    } catch (error) {
      console.error('Error fetching SOA record:', error);
      throw error;
    }
  }
};
