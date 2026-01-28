import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { ExternalLink, X, Info } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';

interface InvoiceRecord {
  id: string;
  invoiceDate: string;
  invoiceStatus: string;
  accountNo: string;
  fullName: string;
  contactNumber: string;
  emailAddress: string;
  address: string;
  plan: string;
  dateInstalled?: string;
  provider?: string;
  invoiceNo?: string;
  invoiceBalance?: number;
  otherCharges?: number;
  totalAmountDue?: number;
  dueDate?: string;
  invoicePayment?: number;
  paymentMethod?: string;
  dateProcessed?: string;
  processedBy?: string;
  remarks?: string;
  vat?: number;
  amountDue?: number;
  balanceFromPreviousBill?: number;
  paymentReceived?: number;
  remainingBalance?: number;
  monthlyServiceFee?: number;
  staggeredPaymentsCount?: number;
}

interface InvoiceDetailsProps {
  invoiceRecord: InvoiceRecord;
}

const InvoiceDetails: React.FC<InvoiceDetailsProps> = ({ invoiceRecord }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [detailsWidth, setDetailsWidth] = useState<number>(600);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);

  useEffect(() => {
    const loadTheme = async () => {
      const theme = await AsyncStorage.getItem('theme');
      setIsDarkMode(theme === 'dark');
    };
    loadTheme();
  }, []);

  useEffect(() => {
    const fetchColorPalette = async () => {
      try {
        const activePalette = await settingsColorPaletteService.getActive();
        setColorPalette(activePalette);
      } catch (err) {
        console.error('Failed to fetch color palette:', err);
      }
    };
    
    fetchColorPalette();
  }, []);

  return (
    <View style={{ height: '100%', flexDirection: 'column', borderLeftWidth: 1, position: 'relative', backgroundColor: isDarkMode ? '#111827' : '#ffffff', borderLeftColor: isDarkMode ? 'rgba(255, 255, 255, 0.3)' : '#d1d5db', width: detailsWidth }}>
      <View style={{ paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6', borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb' }}>
        <Text numberOfLines={1} style={{ fontSize: 18, fontWeight: '600', paddingRight: 16, minWidth: 0, flex: 1, color: isDarkMode ? '#ffffff' : '#111827' }}>
          {invoiceRecord.invoiceNo || '2508182' + invoiceRecord.id}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable style={{ padding: 8, borderRadius: 4 }}>
            <X size={18} color={isDarkMode ? '#9ca3af' : '#4b5563'} />
          </Pressable>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }}>
        <View>
          <View style={{ paddingHorizontal: 20, paddingVertical: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 }}>
              <Text style={{ color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Invoice No.</Text>
              <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>{invoiceRecord.invoiceNo || '2508182' + invoiceRecord.id}</Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 }}>
              <Text style={{ color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Account No.</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ color: '#ef4444' }}>
                  {invoiceRecord.accountNo} | {invoiceRecord.fullName} | {invoiceRecord.address}
                </Text>
                <Info size={16} color={isDarkMode ? '#6b7280' : '#9ca3af'} style={{ marginLeft: 8 }} />
              </View>
            </View>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 }}>
              <Text style={{ color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Full Name</Text>
              <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>{invoiceRecord.fullName}</Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 }}>
              <Text style={{ color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Invoice Date</Text>
              <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>{invoiceRecord.invoiceDate}</Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 }}>
              <Text style={{ color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Contact Number</Text>
              <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>{invoiceRecord.contactNumber}</Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 }}>
              <Text style={{ color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Email Address</Text>
              <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>{invoiceRecord.emailAddress}</Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 }}>
              <Text style={{ color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Plan</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>{invoiceRecord.plan}</Text>
                <Info size={16} color={isDarkMode ? '#6b7280' : '#9ca3af'} style={{ marginLeft: 8 }} />
              </View>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 }}>
              <Text style={{ color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Provider</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>{invoiceRecord.provider || 'SWITCH'}</Text>
                <Info size={16} color={isDarkMode ? '#6b7280' : '#9ca3af'} style={{ marginLeft: 8 }} />
              </View>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 }}>
              <Text style={{ color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Remarks</Text>
              <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>{invoiceRecord.remarks || 'System Generated'}</Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 }}>
              <Text style={{ color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Invoice Balance</Text>
              <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>
                ₱{invoiceRecord.invoiceBalance?.toFixed(2) || '0.00'}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 }}>
              <Text style={{ color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Invoice Status</Text>
              <Text style={{ color: invoiceRecord.invoiceStatus === 'Unpaid' ? '#ef4444' : '#22c55e' }}>
                {invoiceRecord.invoiceStatus || 'Unpaid'}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 }}>
              <Text style={{ color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Others and Basic Charges</Text>
              <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>
                ₱{invoiceRecord.otherCharges?.toFixed(2) || '0.00'}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 }}>
              <Text style={{ color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Total Amount</Text>
              <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>
                ₱{invoiceRecord.totalAmountDue?.toFixed(2) || '0.00'}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 }}>
              <Text style={{ color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Invoice Payment</Text>
              <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>
                ₱{invoiceRecord.invoicePayment?.toFixed(2) || '0.00'}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 }}>
              <Text style={{ color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Due Date</Text>
              <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>{invoiceRecord.dueDate || '9/30/2025'}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={{ marginTop: 'auto', borderTopWidth: 1, borderTopColor: isDarkMode ? '#1f2937' : '#e5e7eb' }}>
        <View style={{ paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6', borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontWeight: '500', color: isDarkMode ? '#ffffff' : '#111827' }}>Related Staggered Payments</Text>
            <View style={{ marginLeft: 8, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 9999, backgroundColor: isDarkMode ? '#374151' : '#d1d5db' }}>
              <Text style={{ fontSize: 12, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                {invoiceRecord.staggeredPaymentsCount || 0}
              </Text>
            </View>
          </View>
        </View>
        <View style={{ paddingHorizontal: 20, paddingVertical: 64, alignItems: 'center', color: isDarkMode ? '#6b7280' : '#9ca3af' }}>
          <Text style={{ color: isDarkMode ? '#6b7280' : '#9ca3af' }}>No items</Text>
        </View>
      </View>
    </View>
  );
};

export default InvoiceDetails;
