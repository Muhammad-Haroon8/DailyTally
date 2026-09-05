// src/navigation/AppNavigator.js
// Dynamic Navigation Stack with Auth screens and App screens (Dashboard, AddEditCustomer, CustomerDetail)

import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import DashboardScreen from '../screens/DashboardScreen';
import AddEditCustomerScreen from '../screens/AddEditCustomerScreen';
import CustomerDetailScreen from '../screens/CustomerDetailScreen';
import MonthDetailScreen from '../screens/MonthDetailScreen';
import WeekDetailScreen from '../screens/WeekDetailScreen';
import ManageItemsScreen from '../screens/ManageItemsScreen';
import AddEditItemScreen from '../screens/AddEditItemScreen';
import AddItemEntryScreen from '../screens/AddItemEntryScreen';
import AddPaymentEntryScreen from '../screens/AddPaymentEntryScreen';
import { colors } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { user, token, isLoading } = useAuth();

  // Full-screen loading indicator while checking SecureStore session
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const isAuthenticated = Boolean(user && token);

  return (
    <Stack.Navigator
      initialRouteName="Home"
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
      {isAuthenticated ? (
        <>
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{
              title: 'DailyTally - Karobar Hisab',
              headerBackVisible: false,
            }}
          />
          <Stack.Screen
            name="Dashboard"
            component={DashboardScreen}
            options={{
              title: 'Customer Udhaar List',
            }}
          />
          <Stack.Screen
            name="Profile"
            component={ProfileScreen}
            options={{
              title: 'My Profile',
            }}
          />
          <Stack.Screen
            name="AddEditCustomer"
            component={AddEditCustomerScreen}
            options={({ route }) => ({
              title: route.params?.customerId ? 'Edit Gahak' : 'Add Naya Gahak',
            })}
          />
          <Stack.Screen
            name="CustomerDetail"
            component={CustomerDetailScreen}
            options={({ route }) => ({
              title: route.params?.customerName || 'Gahak Hisab',
            })}
          />
          <Stack.Screen
            name="MonthDetail"
            component={MonthDetailScreen}
            options={({ route }) => ({
              title: route.params?.initialMonthData?.monthLabel || 'Mahine Ka Hisab',
            })}
          />
          <Stack.Screen
            name="WeekDetail"
            component={WeekDetailScreen}
            options={({ route }) => ({
              title: route.params?.weekLabel || 'Hafte Ka Hisab',
            })}
          />
          <Stack.Screen
            name="ManageItems"
            component={ManageItemsScreen}
            options={{
              title: 'Manage Items Catalog',
            }}
          />
          <Stack.Screen
            name="AddEditItem"
            component={AddEditItemScreen}
            options={({ route }) => ({
              title: route.params?.itemId ? 'Edit Item' : 'Add Master Item',
            })}
          />
          <Stack.Screen
            name="AddItemEntry"
            component={AddItemEntryScreen}
            options={({ route }) => ({
              title: route.params?.entry ? 'Edit Item Entry' : 'Add Item (Udhaar)',
            })}
          />
          <Stack.Screen
            name="AddPaymentEntry"
            component={AddPaymentEntryScreen}
            options={({ route }) => ({
              title: route.params?.entry ? 'Edit Payment' : 'Wasool Raqam',
            })}
          />
        </>
      ) : (
        <>
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{
              title: 'Karobar Hisab - Login',
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="Signup"
            component={SignupScreen}
            options={{
              title: 'Karobar Hisab - Sign Up',
              headerShown: false,
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
