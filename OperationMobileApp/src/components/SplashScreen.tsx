import React from 'react';
import { View, Text, Image, ActivityIndicator } from 'react-native';
import logo1 from '../assets/logo1.png';

const SplashScreen: React.FC = () => {
  return (
    <View className="flex-1 bg-gray-900 items-center justify-center">
      <View className="items-center justify-center gap-5">
        <Image
          source={logo1}
          className="h-20 w-64"
          resizeMode="contain"
        />
        <View className="items-center justify-center">
          <ActivityIndicator size="large" color="#61dafb" />
        </View>
        <Text className="text-[#61dafb] text-lg font-medium">Loading...</Text>
      </View>
    </View>
  );
};

export default SplashScreen;
