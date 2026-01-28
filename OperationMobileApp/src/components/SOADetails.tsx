import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Pressable, Linking } from 'react-native';
import { ExternalLink, X, Info } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';

interface SOARecord {
  id: string;
  statementDate: string;
  accountNo: string;
  dateInstalled: string;
  fullName: string;
  contactNumber: string;
  emailAddress: string;
  address: string;
  plan: string;
  provider?: string;
  balanceFromPreviousBill?: number;
  statementNo?: string;
  paymentReceived?: number;
  remainingBalance?: number;
  monthlyServiceFee?: number;
  otherCharges?: number;
  vat?: number;
  dueDate?: string;
  amountDue?: number;
  totalAmountDue?: number;
  deliveryStatus?: string;
  deliveryDate?: string;
  deliveredBy?: string;
  deliveryRemarks?: string;
  deliveryProof?: string;
  modifiedBy?: string;
  modifiedDate?: string;
  printLink?: string;
  barangay?: string;
  city?: string;
  region?: string;
}

interface SOADetailsProps {
  soaRecord: SOARecord;
}

const SOADetails: React.FC<SOADetailsProps> = ({ soaRecord }) => {
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

  const handleOpenGDrive = () => {
    if (soaRecord.printLink) {
      Linking.openURL(soaRecord.printLink);
    }
  };

  return (
    <View style={{ height: '100%', flexDirection: 'column', borderLeftWidth: 1, position: 'relative', backgroundColor: isDarkMode ? '#111827' : '#ffffff', borderLeftColor: isDarkMode ? 'rgba(255, 255, 255, 0.3)' : '#d1d5db', width: detailsWidth }}>
      <View style={{ paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6', borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb' }}>
        <Text numberOfLines={1} style={{ fontSize: 18, fontWeight: '600', paddingRight: 16, minWidth: 0, flex: 1, color: isDarkMode ? '#ffffff' : '#111827' }}>
          {soaRecord.accountNo} | {soaRecord.fullName} | {soaRecord.address.split(',')[0]}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable 
            onPress={handleOpenGDrive}
            disabled={!soaRecord.printLink}
            style={{ padding: 8, borderRadius: 4, opacity: !soaRecord.printLink ? 0.5 : 1 }}
          >
            <ExternalLink size={18} color={isDarkMode ? '#9ca3af' : '#4b5563'} />
          </Pressable>
          <Pressable style={{ padding: 8, borderRadius: 4 }}>
            <X size={18} color={isDarkMode ? '#9ca3af' : '#4b5563'} />
          </Pressable>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }}>
        <View>
          <View style={{ paddingHorizontal: 20, paddingVertical: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 }}>
              <Text style={{ color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Statement No.</Text>
              <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>{soaRecord.statementNo || '2509180' + soaRecord.id}</Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 }}>
              <Text style={{ color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Full Name</Text>
              <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>{soaRecord.fullName}</Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 }}>
              <Text style={{ color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Statement Date</Text>
              <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>{soaRecord.statementDate}</Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 }}>
              <Text style={{ color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Account No.</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ color: '#ef4444' }}>
                  {soaRecord.accountNo} | {soaRecord.fullName} | {soaRecord.address}
                </Text>
                <Info size={16} color={isDarkMode ? '#6b7280' : '#4b5563'} style={{ marginLeft: 8 }} />
              </View>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 }}>
              <Text style={{ color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Date Installed</Text>
              <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>{soaRecord.dateInstalled}</Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 }}>
              <Text style={{ color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Contact Number</Text>
              <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>{soaRecord.contactNumber}</Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 }}>
              <Text style={{ color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Email Address</Text>
              <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>{soaRecord.emailAddress}</Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 }}>
              <Text style={{ color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Plan</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>{soaRecord.plan}</Text>
                <Info size={16} color={isDarkMode ? '#6b7280' : '#4b5563'} style={{ marginLeft: 8 }} />
              </View>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 }}>
              <Text style={{ color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Provider</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>{soaRecord.provider || 'SWITCH'}</Text>
                <Info size={16} color={isDarkMode ? '#6b7280' : '#4b5563'} style={{ marginLeft: 8 }} />
              </View>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 }}>
              <Text style={{ color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Balance from Previous Bill</Text>
              <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>
                ₱{soaRecord.balanceFromPreviousBill?.toFixed(2) || '0.00'}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 }}>
              <Text style={{ color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Payment Received from Previous Bill</Text>
              <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>
                ₱{soaRecord.paymentReceived || '0'}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 }}>
              <Text style={{ color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Remaining Balance from Previous Bill</Text>
              <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>
                ₱{soaRecord.remainingBalance?.toFixed(2) || '0.00'}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 }}>
              <Text style={{ color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Monthly Service Fee</Text>
              <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>
                ₱{soaRecord.monthlyServiceFee?.toFixed(2) || '624.11'}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 }}>
              <Text style={{ color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Others and Basic Charges</Text>
              <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>
                ₱{soaRecord.otherCharges?.toFixed(2) || '0.00'}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 }}>
              <Text style={{ color: isDarkMode ? '#9ca3af' : '#4b5563' }}>VAT</Text>
              <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>
                ₱{soaRecord.vat?.toFixed(2) || '74.89'}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 }}>
              <Text style={{ color: isDarkMode ? '#9ca3af' : '#4b5563' }}>DUE DATE</Text>
              <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>{soaRecord.dueDate || '9/30/2025'}</Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 }}>
              <Text style={{ color: isDarkMode ? '#9ca3af' : '#4b5563' }}>AMOUNT DUE</Text>
              <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>
                ₱{soaRecord.amountDue?.toFixed(2) || '699.00'}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 }}>
              <Text style={{ color: isDarkMode ? '#9ca3af' : '#4b5563' }}>TOTAL AMOUNT DUE</Text>
              <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>
                ₱{soaRecord.totalAmountDue?.toFixed(2) || '699.00'}
              </Text>
            </View>

            {soaRecord.deliveryStatus && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 }}>
                <Text style={{ color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Delivery Status</Text>
                <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>{soaRecord.deliveryStatus}</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default SOADetails;
