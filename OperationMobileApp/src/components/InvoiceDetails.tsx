import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { X, Info, ChevronDown, ChevronRight } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';
import { relatedDataService } from '../services/relatedDataService';
import RelatedDataTable from './RelatedDataTable';
import { relatedDataColumns } from '../config/relatedDataColumns';
import { InvoiceRecord } from '../services/invoiceService';

interface InvoiceDetailsProps {
  invoiceRecord: InvoiceRecord;
  onClose: () => void;
}

const InvoiceDetails: React.FC<InvoiceDetailsProps> = ({ invoiceRecord, onClose }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);

  // Related staggered payments state
  const [expandedStaggered, setExpandedStaggered] = useState(false);
  const [relatedStaggered, setRelatedStaggered] = useState<any[]>([]);
  const [fullRelatedStaggered, setFullRelatedStaggered] = useState<any[]>([]);
  const [staggeredCount, setStaggeredCount] = useState(0);
  const [expandedModalSection, setExpandedModalSection] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const theme = await AsyncStorage.getItem('theme');
      setIsDarkMode(theme !== 'light');
      const activePalette = await settingsColorPaletteService.getActive();
      setColorPalette(activePalette);
    };
    init();
  }, []);

  // Fetch related staggered payments when account number changes
  useEffect(() => {
    const fetchRelatedStaggered = async () => {
      // In JS, invoiceRecord.accountNo might be account_no or accountNo, depending on the object shape.
      // The interface says account_no (snake_case) in invoiceService, but the web code used camelCase.
      // We will check both.
      const accountNo = invoiceRecord.account_no || (invoiceRecord as any).accountNo;

      if (!accountNo) {
        console.log('❌ No accountNo found in invoice record');
        return;
      }

      console.log('🔍 Fetching related staggered payments for account:', accountNo);

      try {
        const result = await relatedDataService.getRelatedStaggered(accountNo);
        // Store full data for modal view
        setFullRelatedStaggered(result.data || []);
        // Limit to 5 latest items for inline view
        setRelatedStaggered((result.data || []).slice(0, 5));
        setStaggeredCount(result.count || 0);
      } catch (error) {
        console.error('❌ Error fetching staggered payments:', error);
        setRelatedStaggered([]);
        setFullRelatedStaggered([]);
        setStaggeredCount(0);
      }
    };

    fetchRelatedStaggered();
  }, [invoiceRecord]);

  const renderRow = (label: string, value: string | number | undefined | null) => (
    <View className="flex-row justify-between items-center py-3 border-b border-gray-100 dark:border-gray-800">
      <Text className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{label}</Text>
      <View className="flex-1 items-end ml-4">
        <Text className={`text-sm font-medium text-right ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          {value ?? '-'}
        </Text>
      </View>
    </View>
  );

  const fmtMoney = (val?: number) => val !== undefined ? `₱${val.toFixed(2)}` : '₱0.00';

  return (
    <View className={`flex-1 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
      {/* Header */}
      <View className={`border-b px-4 py-3 flex-row items-center justify-between ${isDarkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'}`}>
        <View className="flex-1 mr-2">
          <Text className={`font-bold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`} numberOfLines={1}>
            Invoice #{invoiceRecord.id}
          </Text>
          <Text className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {invoiceRecord.invoice_date}
          </Text>
        </View>
        <TouchableOpacity onPress={onClose} className="p-2">
          <X size={24} color={isDarkMode ? 'white' : 'black'} />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 p-4">
        {/* Info Section */}
        <View className={`mb-6 p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
          <Text className={`text-xs font-bold uppercase mb-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Invoice Info
          </Text>
          {renderRow('Account No', invoiceRecord.account_no)}
          {renderRow('Full Name', invoiceRecord.account?.customer?.full_name || '-')}
          {renderRow('Address', invoiceRecord.account?.customer?.address || '-')}
          {renderRow('Contact', invoiceRecord.account?.customer?.contact_number_primary || '-')}
          {renderRow('Email', invoiceRecord.account?.customer?.email_address || '-')}
          {renderRow('Plan', invoiceRecord.account?.customer?.desired_plan || '-')}

          <View className="h-px bg-gray-200 dark:bg-gray-700 my-2" />

          {renderRow('Due Date', invoiceRecord.due_date)}
          {renderRow('Status', invoiceRecord.status)}
          {renderRow('Invoice Balance', fmtMoney(invoiceRecord.invoice_balance))}
          {renderRow('Other Charges', fmtMoney(invoiceRecord.others_and_basic_charges))}
          {renderRow('Total Amount Due', fmtMoney(invoiceRecord.total_amount))}
        </View>

        {/* Staggered Payments Section */}
        <View className={`mb-10 rounded-lg overflow-hidden border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <TouchableOpacity
            onPress={() => setExpandedStaggered(!expandedStaggered)}
            className={`flex-row justify-between items-center p-4 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}
          >
            <View className="flex-row items-center">
              <Text className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Related Staggered Payments
              </Text>
              <View className={`ml-2 px-2 py-0.5 rounded ${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`}>
                <Text className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{staggeredCount}</Text>
              </View>
            </View>
            {expandedStaggered ? <ChevronDown size={20} color={isDarkMode ? 'white' : 'black'} /> : <ChevronRight size={20} color={isDarkMode ? 'white' : 'black'} />}
          </TouchableOpacity>

          {expandedStaggered && (
            <View className={isDarkMode ? 'bg-gray-900' : 'bg-white'}>
              <RelatedDataTable
                data={relatedStaggered}
                columns={relatedDataColumns.staggered}
                isDarkMode={isDarkMode}
              />
              {staggeredCount > 5 && (
                <TouchableOpacity
                  onPress={() => setExpandedModalSection('staggered')}
                  className="p-3 items-center border-t border-gray-100 dark:border-gray-800"
                >
                  <Text className="text-blue-500 font-medium">View All</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Full Related Data Modal */}
      <Modal visible={!!expandedModalSection} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end">
          <View className={`h-[80%] rounded-t-xl ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
            <View className={`flex-row justify-between items-center p-4 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
              <Text className={`font-bold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                All Staggered Payments
              </Text>
              <TouchableOpacity onPress={() => setExpandedModalSection(null)}>
                <X size={24} color={isDarkMode ? 'white' : 'black'} />
              </TouchableOpacity>
            </View>
            <ScrollView className="flex-1 p-4">
              <RelatedDataTable
                data={fullRelatedStaggered}
                columns={relatedDataColumns.staggered}
                isDarkMode={isDarkMode}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default InvoiceDetails;