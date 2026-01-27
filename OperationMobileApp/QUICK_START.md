# Quick Start Guide - React Native Mobile App

## ✅ Current Status

Your React Native project is set up with:
- ✅ Expo framework
- ✅ TypeScript configuration
- ✅ All required dependencies installed
- ✅ Login screen created
- ✅ Dashboard screen created
- ✅ API configuration
- ✅ Storage utilities
- ✅ Theme system

## 🚀 Run the App

### 1. Start the Development Server

```powershell
cd C:\Users\raven\Documents\GitHub\operationmobileapp\OperationMobileApp
npx expo start
```

### 2. Test on Your Device

**Option A: Physical Device (Recommended)**
1. Install **Expo Go** app:
   - iOS: Download from App Store
   - Android: Download from Google Play Store

2. Scan the QR code shown in terminal:
   - iOS: Use Camera app
   - Android: Use Expo Go app

**Option B: Android Emulator**
- Press `a` in the terminal after starting
- Make sure Android Studio emulator is running

**Option C: Web Browser (for testing)**
- Press `w` in the terminal

## 📁 Project Structure

```
OperationMobileApp/
├── src/
│   ├── pages/              # Screens (Login, Dashboard, etc.)
│   │   ├── Login.tsx       ✅ Created
│   │   └── Dashboard.tsx   ✅ Created
│   ├── components/         # Reusable UI components
│   ├── navigation/         # Navigation configuration
│   ├── services/           # API calls (copied from web app)
│   ├── types/              # TypeScript types (copied from web app)
│   ├── utils/              # Utility functions
│   │   └── storage.ts      ✅ Created
│   ├── config/
│   │   └── api.ts          ✅ Created
│   └── theme/
│       └── index.ts        ✅ Created
├── App.tsx                 ✅ Updated
└── package.json
```

## 🔄 Next Steps

### 1. Update API Base URL

Edit `src/config/api.ts` if your API URL is different:
```typescript
const API_BASE_URL = 'https://sync.atssfiber.ph/api';
```

### 2. Test the Login

The login screen is functional. Try logging in with your credentials.

**Default behavior:**
- Makes POST request to `/login`
- Stores auth data in AsyncStorage
- Shows Dashboard on success

### 3. Add More Screens

Create additional screens in `src/pages/`:
- Customer management
- Job orders
- Billing
- Applications
- Service orders

## 🛠️ Development Commands

```powershell
# Start development server
npx expo start

# Start with cache cleared
npx expo start -c

# Run on Android
npx expo start --android

# Run on iOS (Mac only)
npx expo start --ios

# Open in web browser
npx expo start --web

# Install new package
npx expo install package-name

# Install npm package
npm install package-name
```

## 🔍 Debugging

### View Logs
- Shake device or press `Cmd+D` (iOS) / `Cmd+M` (Android)
- Select "Debug JS Remotely"
- Open Chrome DevTools

### Common Issues

**Issue: Metro bundler error**
```powershell
npx expo start -c
```

**Issue: Can't connect to server**
- Make sure phone and computer are on same WiFi
- Check firewall settings
- Try tunnel mode: `npx expo start --tunnel`

**Issue: Module not found**
```powershell
rm -rf node_modules
npm install
npx expo start -c
```

## 📱 Features Currently Working

### ✅ Login Screen
- Username/password fields
- Loading indicator
- Error handling
- API integration
- AsyncStorage for auth data

### ✅ Dashboard Screen
- Stats cards
- Pull-to-refresh
- Quick actions
- Mock data display

### ✅ Infrastructure
- API client with interceptors
- AsyncStorage wrapper
- Theme system
- TypeScript types

## 🎯 What to Build Next

### Priority 1: Navigation
Create proper navigation with React Navigation:
- Tab navigation for main sections
- Stack navigation for details
- Deep linking support

### Priority 2: Customer Management
- Customer list screen
- Customer detail screen
- Search and filters
- Create/edit forms

### Priority 3: Job Orders
- Job order list
- Create job order
- Update status
- Image upload for completion

### Priority 4: Billing
- Billing list
- Payment processing
- Transaction history
- Generate invoices

## 🔐 Security Notes

The app currently stores:
- Auth token in AsyncStorage
- User data locally

**Recommendations:**
- Use secure storage for sensitive data
- Implement token refresh
- Add biometric authentication
- Enable SSL pinning

## 📊 Performance Tips

1. **Use FlatList for long lists**
   - Built-in optimization
   - Lazy loading
   - Pull-to-refresh

2. **Optimize images**
   - Compress before upload
   - Use appropriate sizes
   - Cache remote images

3. **Minimize re-renders**
   - Use React.memo
   - useCallback for functions
   - useMemo for calculations

## 🐛 Troubleshooting

### App won't load?
```powershell
# Clear cache and restart
npx expo start -c
```

### Can't login?
- Check API URL in `src/config/api.ts`
- Verify backend is running
- Check network connectivity
- View console logs for errors

### Styling issues?
- Check theme colors in `src/theme/index.ts`
- Verify platform-specific styles
- Test on both iOS and Android

## 📚 Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [React Navigation](https://reactnavigation.org/)
- [React Native Paper](https://callstack.github.io/react-native-paper/)

## 💡 Tips

1. **Hot Reload**: Code changes automatically reload
2. **Live Reload**: Shake device to enable
3. **Debug Menu**: Shake device to open
4. **Console Logs**: View in terminal or browser console

## ✅ Checklist for Next Development Session

- [ ] Run `npx expo start` and test login
- [ ] Verify API connectivity
- [ ] Test on physical device
- [ ] Create navigation structure
- [ ] Build customer list screen
- [ ] Implement search functionality
- [ ] Add pull-to-refresh everywhere
- [ ] Create form components
- [ ] Add image upload capability
- [ ] Implement offline storage

## 🎉 You're Ready!

Run this command to start:
```powershell
cd C:\Users\raven\Documents\GitHub\operationmobileapp\OperationMobileApp
npx expo start
```

Then scan the QR code with Expo Go app on your phone!
