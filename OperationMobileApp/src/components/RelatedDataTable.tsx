import React from 'react';
import { View, Text, ScrollView } from 'react-native';

export interface Column {
  key: string;
  label: string;
  // Render function type updated for React Native compatibility if needed, 
  // but typically we'll just render text or a component.
  render?: (value: any, row: any) => React.ReactNode;
}

interface RelatedDataTableProps {
  data: any[];
  columns: Column[];
  isDarkMode: boolean;
}

const RelatedDataTable: React.FC<RelatedDataTableProps> = ({
  data,
  columns,
  isDarkMode
}) => {
  if (data.length === 0) {
    return (
      <View className="py-8 items-center">
        <Text className={isDarkMode ? 'text-gray-500' : 'text-gray-600'}>
          No items
        </Text>
      </View>
    );
  }

  // Mobile often struggles with wide tables. 
  // A horizontal ScrollView is a common pattern for tables.
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={true}>
      <View className="flex-col">
        {/* Header */}
        <View className={`flex-row border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          {columns.map((column) => (
            <View key={column.key} className="px-4 py-2 w-32 border-l border-transparent">
              <Text className={`font-medium text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {column.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Rows */}
        {data.map((row: any, index: number) => (
          <View
            key={index}
            className={`flex-row border-b ${isDarkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'}`}
          >
            {columns.map((column) => (
              <View key={column.key} className="px-4 py-3 w-32 justify-center">
                <Text className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {column.render
                    ? column.render(row[column.key], row) as React.ReactNode
                    : (row[column.key] !== undefined && row[column.key] !== null ? String(row[column.key]) : 'N/A')
                  }
                </Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

export default RelatedDataTable;
