# React to React Native Migration Plan

## Overview
This document outlines the strategy for migrating the ATSS Fiber Operations Management System from React TypeScript web to React Native, maintaining all business logic while adapting the UI layer for mobile platforms.

## Phase 1: Project Setup and Environment Configuration

### 1.1 Initialize React Native Project
```bash
# Create React Native project with TypeScript
npx react-native init OperationMobileApp --template react-native-template-typescript

# Navigate to project
cd OperationMobileApp
```

### 1.2 Install Core Dependencies
```bash
# Navigation
npm install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs
npm install react-native-screens react-native-safe-area-context

# UI Components
npm install react-native-paper
npm install react-native-vector-icons
npm install @react-native-picker/picker

# Network & API
npm install axios
npm install @react-native-async-storage/async-storage

# Maps & Location
npm install react-native-maps
npm install @react-native-community/geolocation
npm install react-native-permissions

# Forms & Validation
npm install formik yup

# Charts
npm install react-native-chart-kit
npm install react-native-svg

# Date/Time
npm install react-native-date-picker

# Camera & Media
npm install react-native-image-picker
npm install react-native-document-picker

# Additional utilities
npm install react-native-gesture-handler
npm install react-native-reanimated
npm install socket.io-client
```

### 1.3 Project Structure
```
OperationMobileApp/
├── src/
│   ├── api/              # API configuration and services (reuse from web)
│   ├── components/       # Reusable UI components (mobile-adapted)
│   ├── screens/          # Screen components (replace pages)
│   ├── navigation/       # Navigation configuration
│   ├── services/         # Business logic (reuse from web)
│   ├── types/            # TypeScript types (reuse from web)
│   ├── utils/            # Utility functions (reuse from web)
│   ├── hooks/            # Custom React hooks
│   ├── constants/        # App constants
│   └── theme/            # Styling and theme
├── android/
├── ios/
└── App.tsx
```

## Phase 2: Core Logic Migration (Direct Reuse)

### 2.1 Services Layer (100% Reusable)
Copy and reuse all services from `frontend/src/services/`:
- `api.ts` - HTTP client configuration
- `applicationService.ts`
- `billingService.ts`
- `customerService.ts`
- `jobOrderService.ts`
- `locationService.ts`
- All other service files

**Changes Required:**
- Update storage implementation from `localStorage` to `AsyncStorage`
- Ensure axios configuration works with React Native

### 2.2 Types (100% Reusable)
Copy all TypeScript types from `frontend/src/types/`:
- `api.ts`
- `application.ts`
- `billing.ts`
- `jobOrder.ts`
- `location.ts`

**No changes required** - TypeScript types remain identical

### 2.3 Utils (95% Reusable)
Copy utility functions from `frontend/src/utils/`:
- `filterUtils.ts`
- `requestCache.ts`

**Minor Changes:**
- Update any web-specific APIs
- Replace localStorage with AsyncStorage

## Phase 3: UI Layer Migration (Requires Adaptation)

### 3.1 Authentication Flow

**Web Component:** `Login.tsx`
**Mobile Component:** `screens/auth/LoginScreen.tsx`

```typescript
// Mobile adaptation
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { userService } from '../../services/userService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const LoginScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const response = await userService.login({ username, password });
      await AsyncStorage.setItem('authData', JSON.stringify(response));
      navigation.replace('Main');
    } catch (error) {
      Alert.alert('Error', 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.form}>
        <Text style={styles.title}>ATSS Fiber Operations</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Username"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />
        
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        
        <TouchableOpacity
          style={styles.button}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Logging in...' : 'Login'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center'
  },
  form: {
    padding: 20
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center'
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
    fontSize: 16
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center'
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  }
});
```

### 3.2 Navigation Structure

```typescript
// navigation/MainNavigator.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Screens
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import CustomerListScreen from '../screens/customer/CustomerListScreen';
import CustomerDetailScreen from '../screens/customer/CustomerDetailScreen';
import ApplicationListScreen from '../screens/application/ApplicationListScreen';
import JobOrderListScreen from '../screens/joborder/JobOrderListScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Customer Stack
const CustomerStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="CustomerList" component={CustomerListScreen} />
    <Stack.Screen name="CustomerDetail" component={CustomerDetailScreen} />
  </Stack.Navigator>
);

// Job Order Stack
const JobOrderStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="JobOrderList" component={JobOrderListScreen} />
    <Stack.Screen name="JobOrderDetail" component={JobOrderDetailScreen} />
  </Stack.Navigator>
);

// Main Tab Navigator
export const MainNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;
        
        switch (route.name) {
          case 'Dashboard':
            iconName = 'view-dashboard';
            break;
          case 'Customers':
            iconName = 'account-group';
            break;
          case 'Applications':
            iconName = 'file-document';
            break;
          case 'JobOrders':
            iconName = 'clipboard-list';
            break;
          default:
            iconName = 'circle';
        }
        
        return <Icon name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#007AFF',
      tabBarInactiveTintColor: '#8E8E93'
    })}
  >
    <Tab.Screen name="Dashboard" component={DashboardScreen} />
    <Tab.Screen name="Customers" component={CustomerStack} />
    <Tab.Screen name="Applications" component={ApplicationListScreen} />
    <Tab.Screen name="JobOrders" component={JobOrderStack} />
  </Tab.Navigator>
);
```

### 3.3 List Components Pattern

**Web Component:** Table-based lists with pagination
**Mobile Component:** FlatList with pull-to-refresh

```typescript
// screens/customer/CustomerListScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  Text,
  StyleSheet,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { customerService } from '../../services/customerService';

export const CustomerListScreen = ({ navigation }) => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);

  const loadCustomers = async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
      setPage(1);
    } else {
      setLoading(true);
    }

    try {
      const response = await customerService.getCustomers({
        page: refresh ? 1 : page,
        perPage: 20
      });
      
      if (refresh) {
        setCustomers(response.data);
      } else {
        setCustomers([...customers, ...response.data]);
      }
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [page]);

  const renderCustomer = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('CustomerDetail', { id: item.id })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.accountNumber}>#{item.account_no}</Text>
        <Text style={[
          styles.status,
          { color: item.status === 'Active' ? '#34C759' : '#FF3B30' }
        ]}>
          {item.status}
        </Text>
      </View>
      
      <Text style={styles.customerName}>{item.customer_name}</Text>
      
      <View style={styles.cardFooter}>
        <Text style={styles.plan}>{item.plan_name}</Text>
        <Text style={styles.location}>{item.location}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderFooter = () => {
    if (!loading) return null;
    return <ActivityIndicator style={styles.loader} />;
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={customers}
        renderItem={renderCustomer}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadCustomers(true)} />
        }
        onEndReached={() => setPage(page + 1)}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  accountNumber: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '600'
  },
  status: {
    fontSize: 14,
    fontWeight: '600'
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  plan: {
    fontSize: 14,
    color: '#007AFF'
  },
  location: {
    fontSize: 14,
    color: '#8E8E93'
  },
  loader: {
    marginVertical: 20
  }
});
```

### 3.4 Detail/Form Components

**Web Component:** Modal-based forms
**Mobile Component:** Full-screen forms with native inputs

```typescript
// screens/customer/CustomerDetailScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert
} from 'react-native';
import { customerDetailService } from '../../services/customerDetailService';

export const CustomerDetailScreen = ({ route, navigation }) => {
  const { id } = route.params;
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCustomerDetail();
  }, [id]);

  const loadCustomerDetail = async () => {
    try {
      const response = await customerDetailService.getCustomerDetail(id);
      setCustomer(response.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load customer details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Account Information Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Information</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>Account Number</Text>
          <Text style={styles.value}>{customer.account_no}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>Customer Name</Text>
          <Text style={styles.value}>{customer.customer_name}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>Status</Text>
          <Text style={[
            styles.value,
            styles.statusBadge,
            { backgroundColor: customer.status === 'Active' ? '#34C759' : '#FF3B30' }
          ]}>
            {customer.status}
          </Text>
        </View>
      </View>

      {/* Billing Information Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Billing Information</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>Plan</Text>
          <Text style={styles.value}>{customer.plan_name}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>Monthly Fee</Text>
          <Text style={styles.value}>₱{customer.monthly_fee}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>Due Date</Text>
          <Text style={styles.value}>{customer.due_date}</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={() => navigation.navigate('CreateTransaction', { customerId: id })}
        >
          <Text style={styles.buttonText}>Create Transaction</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={() => navigation.navigate('CustomerEdit', { id })}
        >
          <Text style={styles.secondaryButtonText}>Edit Details</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#000'
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  label: {
    fontSize: 14,
    color: '#8E8E93'
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000'
  },
  statusBadge: {
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12
  },
  actions: {
    padding: 16,
    gap: 12
  },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center'
  },
  primaryButton: {
    backgroundColor: '#007AFF'
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#007AFF'
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600'
  }
});
```

### 3.5 Map Components

**Web Component:** react-leaflet
**Mobile Component:** react-native-maps

```typescript
// components/LocationMap.tsx
import React from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';

interface LocationMapProps {
  latitude: number;
  longitude: number;
  onLocationSelect?: (coords: { latitude: number; longitude: number }) => void;
  editable?: boolean;
}

export const LocationMap: React.FC<LocationMapProps> = ({
  latitude,
  longitude,
  onLocationSelect,
  editable = false
}) => {
  const [selectedLocation, setSelectedLocation] = useState({
    latitude,
    longitude
  });

  const handleMapPress = (event) => {
    if (!editable) return;
    
    const { coordinate } = event.nativeEvent;
    setSelectedLocation(coordinate);
    onLocationSelect?.(coordinate);
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01
        }}
        onPress={handleMapPress}
      >
        <Marker
          coordinate={selectedLocation}
          draggable={editable}
          onDragEnd={(e) => {
            setSelectedLocation(e.nativeEvent.coordinate);
            onLocationSelect?.(e.nativeEvent.coordinate);
          }}
        />
        
        <Circle
          center={selectedLocation}
          radius={100}
          strokeColor="rgba(0, 122, 255, 0.5)"
          fillColor="rgba(0, 122, 255, 0.2)"
        />
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 300,
    borderRadius: 12,
    overflow: 'hidden'
  },
  map: {
    ...StyleSheet.absoluteFillObject
  }
});
```

## Phase 4: Storage Migration

### 4.1 Replace localStorage with AsyncStorage

```typescript
// utils/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export const storage = {
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error('Storage setItem error:', error);
      throw error;
    }
  },

  getItem: async (key: string): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error('Storage getItem error:', error);
      return null;
    }
  },

  removeItem: async (key: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Storage removeItem error:', error);
      throw error;
    }
  },

  clear: async (): Promise<void> => {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Storage clear error:', error);
      throw error;
    }
  }
};

// Update all services that use localStorage
// Before:
// localStorage.setItem('authData', JSON.stringify(data));
// After:
// await storage.setItem('authData', JSON.stringify(data));
```

## Phase 5: Platform-Specific Features

### 5.1 Camera Integration for Job Orders

```typescript
// components/ImageCapture.tsx
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';

export const ImageCapture = ({ onImageSelected }) => {
  const handleImageCapture = () => {
    Alert.alert(
      'Select Image',
      'Choose an option',
      [
        {
          text: 'Take Photo',
          onPress: () => {
            launchCamera(
              {
                mediaType: 'photo',
                quality: 0.8,
                maxWidth: 1024,
                maxHeight: 1024
              },
              (response) => {
                if (response.assets && response.assets[0]) {
                  onImageSelected(response.assets[0]);
                }
              }
            );
          }
        },
        {
          text: 'Choose from Library',
          onPress: () => {
            launchImageLibrary(
              {
                mediaType: 'photo',
                quality: 0.8,
                maxWidth: 1024,
                maxHeight: 1024
              },
              (response) => {
                if (response.assets && response.assets[0]) {
                  onImageSelected(response.assets[0]);
                }
              }
            );
          }
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  return (
    <TouchableOpacity style={styles.button} onPress={handleImageCapture}>
      <Text style={styles.buttonText}>Capture Image</Text>
    </TouchableOpacity>
  );
};
```

### 5.2 Location Services

```typescript
// hooks/useLocation.ts
import { useState, useEffect } from 'react';
import Geolocation from '@react-native-community/geolocation';
import { Platform, PermissionsAndroid } from 'react-native';

export const useLocation = () => {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          getCurrentLocation();
        } else {
          setError('Location permission denied');
        }
      } catch (err) {
        setError(err.message);
      }
    } else {
      getCurrentLocation();
    }
  };

  const getCurrentLocation = () => {
    Geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      (error) => {
        setError(error.message);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
    );
  };

  return { location, error, getCurrentLocation };
};
```

## Phase 6: Testing Strategy

### 6.1 Unit Testing
```typescript
// __tests__/services/customerService.test.ts
import { customerService } from '../../services/customerService';
import { storage } from '../../utils/storage';

jest.mock('../../utils/storage');

describe('CustomerService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch customers successfully', async () => {
    const mockCustomers = [
      { id: 1, customer_name: 'John Doe' },
      { id: 2, customer_name: 'Jane Smith' }
    ];

    const response = await customerService.getCustomers({ page: 1, perPage: 20 });
    
    expect(response.data).toEqual(mockCustomers);
  });
});
```

### 6.2 Integration Testing
- Test API integration with backend
- Test authentication flow
- Test data persistence
- Test offline functionality

### 6.3 Platform Testing
- iOS device testing
- Android device testing
- Different screen sizes
- Different OS versions

## Phase 7: Deployment

### 7.1 iOS Deployment
```bash
# Generate iOS build
cd ios
pod install
cd ..
npx react-native run-ios --configuration Release

# Archive for App Store
# Open Xcode project and archive
```

### 7.2 Android Deployment
```bash
# Generate signed APK
cd android
./gradlew assembleRelease

# Generate signed Bundle
./gradlew bundleRelease
```

## Migration Checklist

### Core Services (No Changes)
- [ ] Copy all service files from `frontend/src/services/`
- [ ] Update storage calls from localStorage to AsyncStorage
- [ ] Test all API endpoints

### Type Definitions (No Changes)
- [ ] Copy all type files from `frontend/src/types/`
- [ ] Verify type compatibility

### Utilities (Minor Changes)
- [ ] Copy utility files from `frontend/src/utils/`
- [ ] Update web-specific code

### UI Components (Major Changes)
- [ ] Create mobile navigation structure
- [ ] Convert Login page to LoginScreen
- [ ] Convert Dashboard to DashboardScreen
- [ ] Convert Customer management screens
- [ ] Convert Application management screens
- [ ] Convert Job Order screens
- [ ] Convert Billing screens
- [ ] Convert Service Order screens
- [ ] Implement map components
- [ ] Implement camera integration
- [ ] Implement location services

### Features
- [ ] Authentication
- [ ] Customer management
- [ ] Application processing
- [ ] Job orders
- [ ] Billing
- [ ] Service orders
- [ ] Inventory
- [ ] Reports
- [ ] Notifications

### Testing
- [ ] Unit tests for services
- [ ] Integration tests
- [ ] iOS testing
- [ ] Android testing

### Deployment
- [ ] iOS build configuration
- [ ] Android build configuration
- [ ] App Store submission
- [ ] Play Store submission

## Timeline Estimate

- **Phase 1 (Setup):** 2-3 days
- **Phase 2 (Logic Migration):** 3-5 days
- **Phase 3 (UI Migration):** 15-20 days
- **Phase 4 (Storage):** 2-3 days
- **Phase 5 (Platform Features):** 5-7 days
- **Phase 6 (Testing):** 7-10 days
- **Phase 7 (Deployment):** 3-5 days

**Total Estimated Time:** 37-53 days

## Key Points

1. **Business Logic Preserved:** All service files, types, and utilities remain unchanged or require minimal modifications
2. **UI Layer Rebuilt:** Complete redesign for mobile using native components
3. **Navigation:** Replace React Router with React Navigation
4. **Storage:** Replace localStorage with AsyncStorage
5. **Maps:** Replace Leaflet with React Native Maps
6. **Forms:** Adapt web forms to mobile-friendly layouts
7. **Lists:** Replace tables with FlatLists
8. **Modals:** Replace web modals with full-screen navigation or native modals
