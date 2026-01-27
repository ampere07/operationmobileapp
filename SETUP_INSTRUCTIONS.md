# React Native Project Setup Instructions

## Option 1: Using React Native Community CLI (Recommended)

### Step 1: Initialize the Project
```powershell
# Navigate to your project root
cd C:\Users\raven\Documents\GitHub\operationmobileapp

# Initialize new React Native project with TypeScript
npx @react-native-community/cli init OperationMobileApp --template react-native-template-typescript
```

### Step 2: Navigate to Project
```powershell
cd OperationMobileApp
```

### Step 3: Install Required Dependencies

#### Navigation Dependencies
```powershell
npm install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs
npm install react-native-screens react-native-safe-area-context
```

#### UI Components
```powershell
npm install react-native-paper
npm install react-native-vector-icons
npm install @react-native-picker/picker
```

#### Network & Storage
```powershell
npm install axios
npm install @react-native-async-storage/async-storage
```

#### Maps & Location
```powershell
npm install react-native-maps
npm install @react-native-community/geolocation
npm install react-native-permissions
```

#### Forms & Validation
```powershell
npm install formik yup
```

#### Charts
```powershell
npm install react-native-chart-kit
npm install react-native-svg
```

#### Date/Time
```powershell
npm install react-native-date-picker
```

#### Camera & Media
```powershell
npm install react-native-image-picker
npm install react-native-document-picker
```

#### Additional Utilities
```powershell
npm install react-native-gesture-handler
npm install react-native-reanimated
npm install socket.io-client
```

### Step 4: iOS Setup (Mac only)
```bash
cd ios
pod install
cd ..
```

### Step 5: Run the Project

#### For Android:
```powershell
npx react-native run-android
```

#### For iOS (Mac only):
```bash
npx react-native run-ios
```

---

## Option 2: Using Expo (Alternative - Easier Setup)

Expo provides a managed workflow that simplifies development, especially for Windows users who want to develop iOS apps.

### Step 1: Install Expo CLI
```powershell
npm install -g expo-cli
```

### Step 2: Create New Expo Project
```powershell
cd C:\Users\raven\Documents\GitHub\operationmobileapp

# Create new Expo project with TypeScript
npx create-expo-app OperationMobileApp --template expo-template-blank-typescript
```

### Step 3: Navigate to Project
```powershell
cd OperationMobileApp
```

### Step 4: Install Dependencies

#### Navigation
```powershell
npx expo install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs
npx expo install react-native-screens react-native-safe-area-context
```

#### UI Components
```powershell
npm install react-native-paper
npx expo install react-native-vector-icons
npx expo install @react-native-picker/picker
```

#### Network & Storage
```powershell
npm install axios
npx expo install @react-native-async-storage/async-storage
```

#### Maps & Location
```powershell
npx expo install react-native-maps
npx expo install expo-location
```

#### Forms
```powershell
npm install formik yup
```

#### Charts
```powershell
npm install react-native-chart-kit
npx expo install react-native-svg
```

#### Camera & Media
```powershell
npx expo install expo-image-picker
npx expo install expo-document-picker
```

#### Additional Utilities
```powershell
npx expo install react-native-gesture-handler
npx expo install react-native-reanimated
npm install socket.io-client
```

### Step 5: Run the Project
```powershell
# Start development server
npx expo start
```

This will open Expo Dev Tools in your browser. You can:
- Scan QR code with Expo Go app on your phone (iOS/Android)
- Press 'a' to open Android emulator
- Press 'i' to open iOS simulator (Mac only)
- Press 'w' to open in web browser

---

## Recommendation

**For Windows Development:**
- Use **Expo** if you want to test on both iOS and Android easily
- Use **React Native CLI** if you need more control and plan to add native modules

**For Mac Development:**
- Either option works well
- React Native CLI gives you more flexibility

---

## Next Steps After Setup

### 1. Create Folder Structure
```powershell
cd OperationMobileApp

# Create folder structure
mkdir src
cd src
mkdir api components screens navigation services types utils hooks constants theme
```

### 2. Copy Business Logic
```powershell
# Copy services from web app
cp -r ../frontend/src/services ./services

# Copy types
cp -r ../frontend/src/types ./types

# Copy utils
cp -r ../frontend/src/utils ./utils
```

### 3. Update API Configuration

Create `src/api/config.ts`:
```typescript
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://sync.atssfiber.ph/api'; // Your API URL

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Request interceptor
api.interceptors.request.use(
  async (config) => {
    const authData = await AsyncStorage.getItem('authData');
    if (authData) {
      const { token } = JSON.parse(authData);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('authData');
      // Navigate to login screen
    }
    return Promise.reject(error);
  }
);

export default api;
```

### 4. Create Initial Navigation Structure

Create `src/navigation/RootNavigator.tsx`:
```typescript
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/auth/LoginScreen';
import MainNavigator from './MainNavigator';

const Stack = createNativeStackNavigator();

export const RootNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Main" component={MainNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
```

### 5. Update App.tsx

Replace content of `App.tsx`:
```typescript
import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';

function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <RootNavigator />
    </SafeAreaProvider>
  );
}

export default App;
```

---

## Troubleshooting

### Common Issues

#### 1. Metro Bundler Cache Issues
```powershell
npx react-native start --reset-cache
```

#### 2. Android Build Issues
```powershell
cd android
./gradlew clean
cd ..
npx react-native run-android
```

#### 3. iOS Build Issues (Mac)
```bash
cd ios
pod deintegrate
pod install
cd ..
npx react-native run-ios
```

#### 4. Node Modules Issues
```powershell
rm -rf node_modules
npm install
```

---

## Environment Variables

Create `.env` file in project root:
```env
API_BASE_URL=https://sync.atssfiber.ph/api
GOOGLE_MAPS_API_KEY=your_api_key_here
```

Install dotenv:
```powershell
npm install react-native-dotenv
```

---

## Testing Setup

### Install Testing Dependencies
```powershell
npm install --save-dev @testing-library/react-native @testing-library/jest-native jest
```

### Run Tests
```powershell
npm test
```

---

## Build for Production

### Android APK
```powershell
cd android
./gradlew assembleRelease
```

APK location: `android/app/build/outputs/apk/release/app-release.apk`

### Android Bundle (for Play Store)
```powershell
cd android
./gradlew bundleRelease
```

Bundle location: `android/app/build/outputs/bundle/release/app-release.aab`

### iOS (Mac only)
1. Open `ios/OperationMobileApp.xcworkspace` in Xcode
2. Select "Any iOS Device" as target
3. Product → Archive
4. Follow App Store submission process

---

## Additional Resources

- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [Expo Documentation](https://docs.expo.dev/)
- [React Navigation](https://reactnavigation.org/docs/getting-started)
- [React Native Paper](https://callstack.github.io/react-native-paper/)
