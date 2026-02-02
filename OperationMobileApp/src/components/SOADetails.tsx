import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
  Modal
} from 'react-native';
import { ExternalLink, X, Info, Check } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';
import { SOARecord } from '../services/soaService';

interface SOADetailsProps {
  soaRecord: SOARecord;
  onClose: () => void;
}

const SOADetails: React.FC<SOADetailsProps> = ({ soaRecord, onClose }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);
  const [showFieldSettings, setShowFieldSettings] = useState(false);
  const [fieldVisibility, setFieldVisibility] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const init = async () => {
      const theme = await AsyncStorage.getItem('theme');
      setIsDarkMode(theme !== 'light');
      const activePalette = await settingsColorPaletteService.getActive();
      setColorPalette(activePalette);

      // Initialize all fields as visible by default
      const initialVisibility: Record<string, boolean> = {};
      Object.keys(soaRecord).forEach(key => initialVisibility[key] = true);
      setFieldVisibility(initialVisibility);
    };
    init();
  }, [soaRecord]);

  const handleOpenGDrive = () => {
    if (soaRecord.print_link) {
      Linking.openURL(soaRecord.print_link).catch(err => console.error('Failed to open link', err));
    }
  };

  const renderRow = (label: string, value: string | number | undefined | null, key?: string) => {
    // Logic for visibility could be added here if needed
    if (key && fieldVisibility[key] === false) return null;

    return (
      <View className="flex-row justify-between items-center py-3 border-b border-gray-100 dark:border-gray-800">
        <Text className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{label}</Text>
        <View className="flex-1 items-end ml-4">
          <Text className={`text-sm font-medium text-right ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {value ?? '-'}
          </Text>
        </View>
      </View>
    );
  };

  // Helper for currency formatting
  const fmt = (val?: number) => val !== undefined ? `₱${val.toFixed(2)}` : '₱0.00';

  return (
    <View className={`flex-1 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
      {/* Header */}
      <View className={`border-b px-4 py-3 flex-row items-center justify-between ${isDarkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'}`}>
        <View className="flex-1 mr-2">
          <Text className={`font-bold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`} numberOfLines={1}>
            Statement Details
          </Text>
          <Text className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {soaRecord.statement_date}
          </Text>
        </View>
        <View className="flex-row items-center space-x-2">
          <TouchableOpacity
            onPress={handleOpenGDrive}
            disabled={!soaRecord.print_link}
            className="p-2"
          >
            <ExternalLink size={24} color={soaRecord.print_link ? (colorPalette?.primary || '#ea580c') : 'gray'} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} className="p-2">
            <X size={24} color={isDarkMode ? 'white' : 'black'} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 p-4">
        {/* Customer Info Section */}
        <View className={`mb-6 p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
          <Text className={`text-xs font-bold uppercase mb-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Customer Info
          </Text>
          {renderRow('Account No', soaRecord.account_no)}
          {renderRow('Name', soaRecord.account?.customer?.full_name || '-')}
          {renderRow('Address', soaRecord.account?.customer?.address || '-')}
          {renderRow('Plan', soaRecord.account?.customer?.desired_plan || '-')}
          {renderRow('Contact', soaRecord.account?.customer?.contact_number_primary || '-')}
          {renderRow('Email', soaRecord.account?.customer?.email_address || '-')}
        </View>

        {/* Billing Details Section */}
        <View className={`mb-6 p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
          <Text className={`text-xs font-bold uppercase mb-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Billing Breakdown
          </Text>
          {renderRow('Prev. Balance', fmt(soaRecord.balance_from_previous_bill))}
          {renderRow('Prev. Payment', fmt(soaRecord.payment_received_previous))}
          {renderRow('Prev. Remaining', fmt(soaRecord.remaining_balance_previous))}

          <View className="h-px bg-gray-200 dark:bg-gray-700 my-2" />

          {renderRow('Monthly Fee', fmt(soaRecord.monthly_service_fee))}
          {renderRow('Other Charges', fmt(soaRecord.others_and_basic_charges))}
          {renderRow('Service Charge', fmt(soaRecord.service_charge))}
          {renderRow('Rebate', fmt(soaRecord.rebate))}
          {renderRow('Discounts', fmt(soaRecord.discounts))}
          {renderRow('Staggered', fmt(soaRecord.staggered))}
          {renderRow('VAT', fmt(soaRecord.vat))}

          <View className="h-px bg-gray-200 dark:bg-gray-700 my-2" />

          <View className="flex-row justify-between items-center py-3">
            <Text className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Amount Due</Text>
            <Text className={`font-bold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {fmt(soaRecord.amount_due)}
            </Text>
          </View>

          <View className="flex-row justify-between items-center py-3 border-t border-gray-200 dark:border-gray-700">
            <Text className={`font-bold text-lg ${colorPalette?.primary ? '' : 'text-orange-600'}`} style={colorPalette?.primary ? { color: colorPalette.primary } : {}}>
              Total Amount Due
            </Text>
            <Text className={`font-bold text-xl ${colorPalette?.primary ? '' : 'text-orange-600'}`} style={colorPalette?.primary ? { color: colorPalette.primary } : {}}>
              {fmt(soaRecord.total_amount_due)}
            </Text>
          </View>

          <View className="mt-2 flex-row justify-end">
            <Text className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Due Date: {soaRecord.due_date || '-'}
            </Text>
          </View>
        </View>

        {/* Footer / Meta */}
        <View className="mb-10">
          <Text className={`text-center text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            Statement ID: {soaRecord.id} | Generated: {soaRecord.created_at ? new Date(soaRecord.created_at).toLocaleDateString() : '-'}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

export default SOADetails;
