import React, { useEffect, useRef } from 'react';
import { View, Text, Image, Animated, Easing } from 'react-native';

const logo1 = require('../assets/logo1.png');

const SplashScreen: React.FC = () => {
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [spinValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={{
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#282c34',
    }}>
      <View style={{
        flexDirection: 'column',
        alignItems: 'center',
        gap: 20
      }}>
        <Image 
          source={logo1}
          style={{
            height: 80,
            width: 80,
            marginBottom: 10,
            resizeMode: 'contain'
          }}
        />
        <Animated.View style={{
          width: 48,
          height: 48,
          borderWidth: 4,
          borderColor: '#444',
          borderTopColor: '#61dafb',
          borderRadius: 24,
          transform: [{ rotate: spin }]
        }} />
        <Text style={{
          color: '#61dafb',
          fontSize: 18,
          fontWeight: '500'
        }}>Loading...</Text>
      </View>
    </View>
  );
};

export default SplashScreen;
