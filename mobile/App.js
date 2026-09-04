// App.js
// Root entry point for Karobar Hisab mobile app with AuthProvider

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { NetworkProvider } from './src/context/NetworkContext';
import NetworkStatusBanner from './src/components/NetworkStatusBanner';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NetworkProvider>
          <NavigationContainer>
            <StatusBar style="light" />
            <NetworkStatusBanner />
            <AppNavigator />
          </NavigationContainer>
        </NetworkProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
