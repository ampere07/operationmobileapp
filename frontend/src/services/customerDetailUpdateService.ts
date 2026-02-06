import apiClient from '../config/api';

const API_URL = process.env.REACT_APP_API_BASE_URL || 'https://backend.atssfiber.ph/api';

export interface CustomerDetailsUpdate {
  firstName: string;
  middleInitial?: string;
  lastName: string;
  emailAddress: string;
  contactNumberPrimary: string;
  contactNumberSecondary?: string;
  address: string;
  region: string;
  city: string;
  barangay: string;
  location: string;
  addressCoordinates?: string;
  housingStatus?: string;
  referredBy?: string;
  groupName?: string;
  houseFrontPicture?: File | string;
}

export interface BillingDetailsUpdate {
  plan: string;
  billingDay?: number;
  billingStatus: string;
}

export interface TechnicalDetailsUpdate {
  username: string;
  usernameStatus?: string;
  connectionType: string;
  routerModel: string;
  routerModemSn?: string;
  ipAddress?: string;
  lcp?: string;
  nap?: string;
  port?: string;
  vlan?: string;
  usageType?: string;
}

export const customerDetailUpdateService = {
  async updateCustomerDetails(accountNo: string, data: CustomerDetailsUpdate) {
    try {
      const formData = new FormData();
      
      formData.append('firstName', data.firstName);
      if (data.middleInitial) formData.append('middleInitial', data.middleInitial);
      formData.append('lastName', data.lastName);
      formData.append('emailAddress', data.emailAddress);
      formData.append('contactNumberPrimary', data.contactNumberPrimary);
      if (data.contactNumberSecondary) formData.append('contactNumberSecondary', data.contactNumberSecondary);
      formData.append('address', data.address);
      formData.append('region', data.region);
      formData.append('city', data.city);
      formData.append('barangay', data.barangay);
      formData.append('location', data.location);
      if (data.addressCoordinates) formData.append('addressCoordinates', data.addressCoordinates);
      if (data.housingStatus) formData.append('housingStatus', data.housingStatus);
      if (data.referredBy) formData.append('referredBy', data.referredBy);
      if (data.groupName) formData.append('groupName', data.groupName);
      
      if (data.houseFrontPicture && data.houseFrontPicture instanceof File) {
        formData.append('houseFrontPicture', data.houseFrontPicture);
      }

      const response = await fetch(`${API_URL}/customer-detail/${accountNo}/customer`, {
        method: 'PUT',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update customer details');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating customer details:', error);
      throw error;
    }
  },

  async updateBillingDetails(accountNo: string, data: BillingDetailsUpdate) {
    try {
      const response = await fetch(`${API_URL}/customer-detail/${accountNo}/billing`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update billing details');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating billing details:', error);
      throw error;
    }
  },

  async updateTechnicalDetails(accountNo: string, data: TechnicalDetailsUpdate) {
    try {
      const response = await fetch(`${API_URL}/customer-detail/${accountNo}/technical`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update technical details');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating technical details:', error);
      throw error;
    }
  },
};
