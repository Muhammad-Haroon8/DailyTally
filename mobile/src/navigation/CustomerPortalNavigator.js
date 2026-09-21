// src/navigation/CustomerPortalNavigator.js
// Navigation stack for Customer Self-Service Portal

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CustomerPortalHomeScreen from '../screens/customerPortal/CustomerPortalHomeScreen';
import CustomerPortalMonthDetailScreen from '../screens/customerPortal/CustomerPortalMonthDetailScreen';
import CustomerPortalWeekDetailScreen from '../screens/customerPortal/CustomerPortalWeekDetailScreen';
import { colors } from '../constants/theme';

const Stack = createNativeStackNavigator();

export default function CustomerPortalNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="CustomerPortalHome"
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        contentStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      <Stack.Screen
        name="CustomerPortalHome"
        component={CustomerPortalHomeScreen}
        options={{
          title: 'Daily Tally — Gahak Khata',
          headerBackVisible: false,
        }}
      />
      <Stack.Screen
        name="CustomerPortalMonthDetail"
        component={CustomerPortalMonthDetailScreen}
        options={({ route }) => ({
          title: route.params?.monthLabel || 'Mahana Hisab',
        })}
      />
      <Stack.Screen
        name="CustomerPortalWeekDetail"
        component={CustomerPortalWeekDetailScreen}
        options={({ route }) => ({
          title: route.params?.weekLabel || 'Hafte Ka Hisab',
        })}
      />
    </Stack.Navigator>
  );
}
