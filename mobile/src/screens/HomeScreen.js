// src/screens/HomeScreen.js
// Post-login landing page:
// - Center-aligned prominent "Customer Udhaar" card
// - Quick access cards: "Manage Items", "My Profile"
// - NO customer-specific data (balances/entries) displayed here

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import Card from '../components/Card';
import PrimaryButton from '../components/PrimaryButton';
import { colors, typography, spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

export default function HomeScreen({ navigation }) {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Logout Confirmation',
      'Kya aap waqai logout karna chahte hain?',
      [
        { text: 'Nahi', style: 'cancel' },
        {
          text: 'Haan, Logout',
          style: 'destructive',
          onPress: logout,
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Header bar with user welcome & quick logout */}
      <View style={styles.topHeader}>
        <View style={styles.greetingWrap}>
          <Text style={styles.greetingText}>Khush Amdeed,</Text>
          <Text style={styles.userNameText}>{user?.name || 'Papa'}</Text>
          <Text style={styles.brandSubtitle}>Karobar Hisab Kitab</Text>
        </View>

        <TouchableOpacity
          style={styles.logoutIconButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Text style={styles.logoutIconText}>🚪 Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Main Hero Section: Big Center-Aligned "Customer Udhaar" Card */}
      <View style={styles.heroCardContainer}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Dashboard')}
          style={styles.heroTouchable}
        >
          <Card style={styles.heroCard}>
            <View style={styles.heroIconBadge}>
              <Text style={styles.heroIconText}>👥</Text>
            </View>

            <Text style={styles.heroTitle}>Customer Udhaar</Text>
            <Text style={styles.heroSubtitle}>
              Tamam gahakon ke khate, udhaar aur wasool ka mukammal hisab
            </Text>

            <View style={styles.heroActionBadge}>
              <Text style={styles.heroActionText}>Khata Kholein →</Text>
            </View>
          </Card>
        </TouchableOpacity>
      </View>

      {/* Quick Access Menu Cards */}
      <View style={styles.quickMenuSection}>
        <Text style={styles.sectionHeaderTitle}>⚡ Zaroori Sahuliyat (Quick Access)</Text>

        <View style={styles.quickGrid}>
          {/* Manage Items Card */}
          <TouchableOpacity
            style={styles.quickCardTouchable}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('ManageItems')}
          >
            <Card style={styles.quickCard}>
              <View style={[styles.quickIconCircle, { backgroundColor: colors.accentLight }]}>
                <Text style={styles.quickIcon}>📦</Text>
              </View>
              <Text style={styles.quickCardTitle}>Manage Items</Text>
              <Text style={styles.quickCardDesc}>
                Item catalog aur default rates set karein
              </Text>
              <Text style={styles.quickCardArrow}>Kholein ›</Text>
            </Card>
          </TouchableOpacity>

          {/* My Profile Card */}
          <TouchableOpacity
            style={styles.quickCardTouchable}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Profile')}
          >
            <Card style={styles.quickCard}>
              <View style={[styles.quickIconCircle, { backgroundColor: colors.primaryLight }]}>
                <Text style={styles.quickIcon}>👤</Text>
              </View>
              <Text style={styles.quickCardTitle}>My Profile</Text>
              <Text style={styles.quickCardDesc}>
                Apna naam, phone aur password tabdeel karein
              </Text>
              <Text style={styles.quickCardArrow}>Kholein ›</Text>
            </Card>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Trust/Security Info Card */}
      <View style={styles.footerNoteContainer}>
        <Card style={styles.footerNoteCard}>
          <Text style={styles.footerNoteIcon}>🔒</Text>
          <View style={styles.footerNoteContent}>
            <Text style={styles.footerNoteTitle}>Mehfooz aur Ba-aitebar Hisab</Text>
            <Text style={styles.footerNoteSubtitle}>
              Customer data dekhne ke liye "Customer Udhaar" par tap karein.
            </Text>
          </View>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  greetingWrap: {
    flex: 1,
  },
  greetingText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  userNameText: {
    ...typography.h1,
    color: colors.primary,
    marginTop: 2,
  },
  brandSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  logoutIconButton: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  logoutIconText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.danger,
  },
  // Hero Center Card
  heroCardContainer: {
    marginBottom: spacing.xl,
  },
  heroTouchable: {
    borderRadius: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  heroCard: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.primaryLight,
  },
  heroIconBadge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  heroIconText: {
    fontSize: 38,
  },
  heroTitle: {
    ...typography.h1,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  heroSubtitle: {
    ...typography.bodySmall,
    textAlign: 'center',
    color: colors.textSecondary,
    maxWidth: 280,
    lineHeight: 19,
    marginBottom: spacing.lg,
  },
  heroActionBadge: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 26,
    borderRadius: 25,
  },
  heroActionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  // Quick Menu Section
  quickMenuSection: {
    marginBottom: spacing.lg,
  },
  sectionHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  quickGrid: {
    gap: spacing.md,
  },
  quickCardTouchable: {
    borderRadius: 16,
  },
  quickCard: {
    padding: 16,
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  quickIcon: {
    fontSize: 22,
  },
  quickCardTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  quickCardDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
    marginBottom: 10,
  },
  quickCardArrow: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  footerNoteContainer: {
    marginTop: spacing.xs,
  },
  footerNoteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: '#FAF9F6',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  footerNoteIcon: {
    fontSize: 22,
    marginRight: spacing.md,
  },
  footerNoteContent: {
    flex: 1,
  },
  footerNoteTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  footerNoteSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 15,
  },
});
