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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Card from '../components/Card';
import { colors, typography, spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.contentContainer,
        { paddingBottom: Math.max(insets.bottom, 16) + spacing.md },
      ]}
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      <View style={styles.mainContent}>
        {/* Header greeting */}
        <View style={styles.topHeader}>
          <View style={styles.greetingWrap}>
            <Text style={styles.greetingText}>Khush Amdeed,</Text>
            <Text style={styles.userNameText}>{user?.name || 'Papa'}</Text>
            <Text style={styles.brandSubtitle}>Karobar Hisab Kitab</Text>
          </View>
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

        {/* Bottom Trust/Security Info Card */}
        <View style={styles.footerNoteContainer}>
          <Card style={styles.footerNoteCard}>
            <Text style={styles.footerNoteIcon}>🔒</Text>
            <View style={styles.footerNoteContent}>
              <Text style={styles.footerNoteTitle}>Mehfooz aur Ba-aitebar Hisab</Text>
              <Text style={styles.footerNoteSubtitle}>
                Customer data dekhne aur hisab darj karne ke liye "Customer Udhaar" par tap karein.
              </Text>
            </View>
          </Card>
        </View>
      </View>

      {/* Copyright Footer - Fixed to bottom of screen view */}
      <View style={styles.copyrightContainer}>
        <Text style={styles.copyrightText}>
          Copyright © Developed by DevaAura Technologies
        </Text>
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
    flexGrow: 1,
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  mainContent: {
    flex: 1,
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
  footerNoteContainer: {
    marginTop: spacing.sm,
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
  copyrightContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
  },
  copyrightText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
