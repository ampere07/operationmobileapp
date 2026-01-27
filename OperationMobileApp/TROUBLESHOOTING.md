# Fix: App Not Loading Custom Code

## Problem
The app is showing the default Expo template message instead of your custom Login screen.

## Solution Steps

### Step 1: Stop the Metro Bundler
Press `Ctrl+C` in the terminal to stop the server.

### Step 2: Clear All Caches
```powershell
# Clear Metro bundler cache
npx expo start -c

# OR if that doesn't work, clear everything:
rm -rf node_modules
rm -rf .expo
npm cache clean --force
npm install
npx expo start -c
```

### Step 3: If Still Not Working - Verify File Structure

Make sure these files exist:

**Check App.tsx:**
```powershell
type App.tsx
```

You should see code that imports LoginScreen and DashboardScreen.

**Check if Login screen exists:**
```powershell
type src\pages\Login.tsx
```

### Step 4: Force Reload in Expo Go

1. Open the app in Expo Go
2. Shake your device
3. Tap "Reload"

OR

1. Close Expo Go app completely
2. Scan QR code again

### Step 5: Check for Errors

In the terminal where you ran `npx expo start`, look for any red error messages.

Common errors:
- **Module not found**: Run `npm install`
- **Syntax error**: Check the error message for the file and line number

### Step 6: Verify Imports

Make sure the import paths are correct. Open `App.tsx` and verify:

```typescript
import LoginScreen from './src/pages/Login';
import DashboardScreen from './src/pages/Dashboard';
import LoadingScreen from './src/components/LoadingScreen';
import { storage } from './src/utils/storage';
```

All these files should exist in your project.

### Step 7: Test with Simple App

If still not working, let's test with a minimal App.tsx:

Create a backup first:
```powershell
copy App.tsx App.tsx.backup
```

Then create a simple test:
```powershell
echo 'import { Text, View } from "react-native"; export default function App() { return <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}><Text>TEST - IT WORKS!</Text></View>; }' > App.tsx
```

Start the app:
```powershell
npx expo start -c
```

If you see "TEST - IT WORKS!" then the problem was in the original code.

Restore the backup:
```powershell
copy App.tsx.backup App.tsx
```

### Step 8: Check Node Modules

Verify required packages are installed:

```powershell
npm list @react-native-async-storage/async-storage
npm list react-native-safe-area-context
```

If any are missing:
```powershell
npx expo install @react-native-async-storage/async-storage react-native-safe-area-context
```

### Step 9: Restart Everything

```powershell
# Stop all Node processes
taskkill /F /IM node.exe

# Remove everything and reinstall
rm -rf node_modules
rm -rf .expo
rm package-lock.json
npm install

# Start fresh
npx expo start -c
```

### Step 10: Check Metro Bundler Output

When you run `npx expo start`, you should see something like:

```
› Metro waiting on exp://192.168.1.xxx:8081
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)

› Press a │ open Android
› Press i │ open iOS simulator
› Press w │ open web

› Press r │ reload app
› Press m │ toggle menu
› Press o │ open project code in your editor

› Press ? │ show all commands
```

Look for any errors in red text.

## Quick Fix Commands (Run in Order)

```powershell
# 1. Stop server (Ctrl+C)

# 2. Clear cache
npx expo start -c

# 3. If that doesn't work, nuclear option:
rm -rf node_modules .expo
npm install
npx expo start -c
```

## Alternative: Use Web Version for Testing

```powershell
npx expo start --web
```

This will open the app in your browser. If it works in the browser but not on your phone, the issue is with the mobile connection.

## Still Not Working?

### Check if it's a TypeScript Issue

```powershell
# Check for TypeScript errors
npx tsc --noEmit
```

Fix any errors shown.

### Check React Native Version

```powershell
npx react-native --version
```

### Try Tunnel Mode

If your phone and computer are on different networks:

```powershell
npx expo start --tunnel
```

This uses a tunnel to connect instead of LAN.

## Verification Checklist

- [ ] Metro bundler is running without errors
- [ ] No red error messages in terminal
- [ ] App.tsx has the correct imports
- [ ] All required files exist (Login.tsx, Dashboard.tsx, etc.)
- [ ] node_modules is installed
- [ ] Expo Go app is updated to latest version
- [ ] Phone and computer on same WiFi (or using tunnel mode)
- [ ] QR code is scanned correctly

## Expected Behavior After Fix

You should see:
1. **Loading screen** (brief flash)
2. **Login screen** with:
   - ATSS logo/placeholder
   - Username field
   - Password field  
   - Login button

If you see this, it's working! 🎉

## Get Help

If none of this works, send me:
1. Screenshot of terminal output
2. Screenshot of error in Expo Go (if any)
3. Output of: `npm list`
