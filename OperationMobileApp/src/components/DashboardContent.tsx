import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Dimensions } from 'react-native';
import { TrendingUp, Users, Globe, Wifi, Ticket, Receipt } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DashboardContent: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const screenWidth = Dimensions.get('window').width;

  useEffect(() => {
    const checkDarkMode = async () => {
      const theme = await AsyncStorage.getItem('theme');
      setIsDarkMode(theme === 'dark' || theme === null);
    };
    checkDarkMode();
  }, []);

  const statsCards = [
    { title: "TODAY'S SALES", value: "₱0", subtitle: "0%", icon: TrendingUp },
    { title: "SUBSCRIPTIONS", value: "0", subtitle: "", icon: Users },
    { title: "IP ADDRESSES", value: "0", subtitle: "0 used IPs", icon: Globe },
    { title: "HOTSPOT USERS", value: "0", subtitle: "0 online", icon: Wifi },
    { title: "TOTAL TICKETS", value: "0", subtitle: "0 Open", icon: Ticket },
    { title: "INVOICES", value: "0", subtitle: "0 Unpaid", icon: Receipt }
  ];

  return (
    <ScrollView className={`${isDarkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
      <View className="p-6">
        <View className="mb-8">
          <Text className={`text-2xl font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Dashboard Overview
          </Text>
          <Text className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Your business management system overview and key metrics
          </Text>
        </View>

        {/* Statistics Cards - Flex Wrap Grid */}
        <View className="flex-row flex-wrap justify-between">
          {statsCards.map((card, index) => {
            const IconComponent = card.icon;
            return (
              <View
                key={index}
                className={`w-[48%] mb-4 p-4 rounded-lg border ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-100 border-gray-300'
                  }`}
              >
                <View className="flex-row justify-between mb-2">
                  <IconComponent
                    size={20}
                    color={isDarkMode ? '#9ca3af' : '#4b5563'}
                  />
                </View>
                <Text className={`text-xs font-medium mb-2 tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-color-600'
                  }`}>
                  {card.title}
                </Text>
                <Text className={`text-2xl font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                  {card.value}
                </Text>
                {card.subtitle ? (
                  <Text className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                    {card.subtitle}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>

        {/* System Statistics */}
        <View className="mb-8">
          <Text className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            SYSTEM STATISTICS
          </Text>
          <View>
            {['Memory', 'Hard Disk Space', 'CPU'].map((label, idx) => (
              <View key={idx} className="mb-4">
                <View className="flex-row justify-between mb-2">
                  <Text className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {label}
                  </Text>
                  <Text className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    0%
                  </Text>
                </View>
                <View className={`w-full rounded-full h-3 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'}`}>
                  <View className="bg-blue-500 h-3 rounded-full" style={{ width: '0%' }} />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Charts Section - Simplified for Mobile */}
        <View className="mb-8">
          {['INVOICE SUMMARY', 'TRANSACTION SUMMARY'].map((title, i) => (
            <View key={i} className={`mb-6 p-6 rounded-lg border ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-100 border-gray-300'
              }`}>
              <Text className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {title}
              </Text>
              <View className="h-32 flex items-center justify-center border-b border-gray-700 mb-4">
                {/* Placeholder for Chart */}
                <Text className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>Chart Visualization Placeholder</Text>
              </View>
              <View>
                <Text className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  2025-09-17
                </Text>
                <Text className="text-sm text-green-400">Grand Total: 0</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Recent Tickets */}
        <View className={`rounded-lg border mb-8 ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-100 border-gray-300'}`}>
          <View className={`p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
            <Text className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              RECENT TICKETS
            </Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={true}>
            <View>
              {/* Table Header */}
              <View className={`flex-row border-b ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-200 border-gray-300'}`}>
                {['SUBJECT', 'CUSTOMER', 'CONTACT', 'STATUS', 'UPDATED', 'PRIORITY', 'CATEGORY'].map((h, i) => (
                  <View key={i} className="px-4 py-3 w-32">
                    <Text className={`text-xs font-medium uppercase ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {h}
                    </Text>
                  </View>
                ))}
              </View>
              {/* Table Body - Empty State */}
              <View className="p-8 items-center justify-center w-full">
                {/* Width needs to be large enough to cover horizontal scroll content or just center in visible area if using standard View, 
                                    but with horizontal scroll, centering is tricky without width. 
                                    Simple text message is sufficient. */}
                <Text className={`text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  You don't have any open tickets assigned to you.
                </Text>
              </View>
            </View>
          </ScrollView>
        </View>

      </View>
    </ScrollView>
  );
};

export default DashboardContent;
