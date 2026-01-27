# React Native Setup - Working Solutions

## ❌ Issue Encountered
The React Native CLI template installation is failing due to a template configuration issue.

## ✅ Solution 1: Use Expo (Highly Recommended for Your Case)

Expo is more reliable and easier to set up, especially on Windows.

### Step-by-Step Setup:

```powershell
# 1. Navigate to your project directory
cd C:\Users\raven\Documents\GitHub\operationmobileapp

# 2. Create Expo project
npx create-expo-app@latest OperationMobileApp -t expo-template-blank-typescript

# 3. Navigate into the project
cd OperationMobileApp

# 4. Start the development server
npx expo start
```

### What This Creates:
```
OperationMobileApp/
├── App.tsx                 # Main app entry
├── app.json               # Expo configuration
├── package.json           # Dependencies
├── tsconfig.json          # TypeScript config
└── assets/                # Images, fonts, etc.
```

---

## ✅ Solution 2: Manual React Native Setup (Alternative)

If you specifically need bare React Native (without Expo):

### Option A: Use Specific Template Version

```powershell
# Clear npm cache first
npm cache clean --force

# Use specific React Native version that works
npx @react-native-community/cli@latest init OperationMobileApp --version 0.73.0
```

### Option B: Create Expo Project and Eject Later

```powershell
# 1. Create with Expo
npx create-expo-app@latest OperationMobileApp -t expo-template-blank-typescript

# 2. Navigate to project
cd OperationMobileApp

# 3. When you need native modules, prebuild
npx expo prebuild

# This generates android/ and ios/ folders with native code
```

---

## 🚀 Recommended: Continue with Expo Setup

Let me guide you through the complete Expo setup:

### 1. Create the Project

```powershell
cd C:\Users\raven\Documents\GitHub\operationmobileapp
npx create-expo-app@latest OperationMobileApp -t expo-template-blank-typescript
cd OperationMobileApp
```

### 2. Create Project Structure

```powershell
# Create folders
mkdir src
cd src
mkdir api, components, screens, navigation, services, types, utils, hooks, constants, theme
cd ..
```

Manual structure (if mkdir doesn't work with commas):
```powershell
mkdir src
cd src
mkdir api
mkdir components
mkdir screens
mkdir navigation
mkdir services
mkdir types
mkdir utils
mkdir hooks
mkdir constants
mkdir theme
cd ..
```

### 3. Install Core Dependencies

```powershell
# Navigation
npx expo install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs
npx expo install react-native-screens react-native-safe-area-context

# UI Components
npm install react-native-paper
npm install react-native-vector-icons

# Network & Storage
npm install axios
npx expo install @react-native-async-storage/async-storage

# Maps & Location
npx expo install react-native-maps expo-location

# Forms
npm install formik yup

# Charts
npm install react-native-chart-kit
npx expo install react-native-svg

# Date/Time
npx expo install expo-date-picker

# Camera & Media
npx expo install expo-image-picker expo-document-picker

# Additional
npx expo install react-native-gesture-handler react-native-reanimated
npm install socket.io-client
```

### 4. Update package.json Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "prebuild": "expo prebuild",
    "lint": "eslint .",
    "test": "jest"
  }
}
```

### 5. Configure TypeScript

Update `tsconfig.json`:

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": "./",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@screens/*": ["src/screens/*"],
      "@services/*": ["src/services/*"],
      "@types/*": ["src/types/*"],
      "@utils/*": ["src/utils/*"],
      "@hooks/*": ["src/hooks/*"],
      "@navigation/*": ["src/navigation/*"],
      "@constants/*": ["src/constants/*"],
      "@theme/*": ["src/theme/*"]
    }
  },
  "include": [
    "**/*.ts",
    "**/*.tsx",
    ".expo/types/**/*.ts",
    "expo-env.d.ts"
  ]
}
```

### 6. Configure Babel

Update `babel.config.js`:

```javascript
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          alias: {
            '@': './src',
            '@components': './src/components',
            '@screens': './src/screens',
            '@services': './src/services',
            '@types': './src/types',
            '@utils': './src/utils',
            '@hooks': './src/hooks',
            '@navigation': './src/navigation',
            '@constants': './src/constants',
            '@theme': './src/theme'
          }
        }
      ],
      'react-native-reanimated/plugin'
    ]
  };
};
```

Install babel plugin:
```powershell
npm install --save-dev babel-plugin-module-resolver
```

---

## 📱 Testing Your App

### On Physical Device (Easiest):

1. Install **Expo Go** app from:
   - iOS: App Store
   - Android: Google Play Store

2. Start the development server:
```powershell
npx expo start
```

3. Scan the QR code with:
   - iOS: Camera app
   - Android: Expo Go app

### On Emulator:

#### Android Emulator:
```powershell
# Make sure Android Studio is installed with an emulator
npx expo start --android
```

#### iOS Simulator (Mac only):
```bash
npx expo start --ios
```

### On Web Browser:
```powershell
npx expo start --web
```

---

## 🔄 Next Steps After Setup

### 1. Copy Business Logic from Web App

```powershell
# From the OperationMobileApp directory

# Copy services (these will work as-is, just update storage)
xcopy ..\frontend\src\services src\services\ /E /I /Y

# Copy types (no changes needed)
xcopy ..\frontend\src\types src\types\ /E /I /Y

# Copy utils (minor updates needed)
xcopy ..\frontend\src\utils src\utils\ /E /I /Y
```

### 2. Create API Configuration

Create `src/api/client.ts`:

```typescript
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://sync.atssfiber.ph/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Request interceptor for auth token
api.interceptors.request.use(
  async (config) => {
    try {
      const authData = await AsyncStorage.getItem('authData');
      if (authData) {
        const { token } = JSON.parse(authData);
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Clear auth data and redirect to login
      await AsyncStorage.removeItem('authData');
      // Navigation will be handled by the app
    }
    return Promise.reject(error);
  }
);

export default api;
```

### 3. Update All Services to Use AsyncStorage

Find and replace in all service files:

**Find:**
```typescript
localStorage.getItem('authData')
localStorage.setItem('authData', data)
localStorage.removeItem('authData')
```

**Replace with:**
```typescript
await AsyncStorage.getItem('authData')
await AsyncStorage.setItem('authData', data)
await AsyncStorage.removeItem('authData')
```

---

## 🎯 Quick Start Commands Summary

```powershell
# Create project
cd C:\Users\raven\Documents\GitHub\operationmobileapp
npx create-expo-app@latest OperationMobileApp -t expo-template-blank-typescript
cd OperationMobileApp

# Install dependencies
npx expo install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs react-native-screens react-native-safe-area-context @react-native-async-storage/async-storage react-native-maps expo-location expo-image-picker react-native-gesture-handler react-native-reanimated react-native-svg
npm install axios react-native-paper formik yup socket.io-client react-native-chart-kit

# Start development
npx expo start
```

---

## ❓ Troubleshooting

### Issue: Expo Install Fails
```powershell
# Clear cache and retry
npm cache clean --force
npx clear-npx-cache
npx create-expo-app@latest OperationMobileApp -t expo-template-blank-typescript
```

### Issue: Module Not Found
```powershell
# Reinstall dependencies
rm -rf node_modules
npm install
```

### Issue: Metro Bundler Error
```powershell
# Start with cache reset
npx expo start -c
```

### Issue: TypeScript Errors
```powershell
# Reinstall TypeScript
npm install --save-dev typescript @types/react @types/react-native
```

---

## 📚 What's Next?

Once the project is created successfully, I'll help you:

1. ✅ Create the navigation structure
2. ✅ Build the login screen
3. ✅ Set up the main dashboard
4. ✅ Create customer management screens
5. ✅ Implement job order screens
6. ✅ Add billing functionality

Let me know once the project is created and we'll continue with the migration!
