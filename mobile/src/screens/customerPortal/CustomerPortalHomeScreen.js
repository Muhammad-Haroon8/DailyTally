// src/screens/customerPortal/CustomerPortalHomeScreen.js
// Customer Self-Service Portal - Month-wise Organization
// Giant legible balance, paper-receipt aesthetic, month cards navigating to Month Detail

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as Sharing from 'expo-sharing';
import Card from '../../components/Card';
import EmptyState from '../../components/EmptyState';
import LoadingSpinner from '../../components/LoadingSpinner';
import { colors, spacing, cardStyles } from '../../constants/theme';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import {
  getCustomerPortalEntriesRequest,
  downloadCustomerPortalPdf,
} from '../../api/customerPortalApi';

export default function CustomerPortalHomeScreen({ navigation }) {
  const { customerUser, customerLogout } = useCustomerAuth();

  const [customer, setCustomer] = useState(customerUser || {});
  const [shop, setShop] = useState({});
  const [months, setMonths] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setErrorMessage('');

      const data = await getCustomerPortalEntriesRequest();
      if (data.customer) setCustomer(data.customer);
      if (data.shop) setShop(data.shop);
      if (data.months) setMonths(data.months);
    } catch (error) {
      console.error('Error loading customer portal entries:', error);
      setErrorMessage(error.message || 'Hisab load karne me dushwari pesh aayi.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLogout = () => {
    Alert.alert(
      'Khata Band Karein',
      'Kya aap bahar nikalna chahte hain?',
      [
        { text: 'Nahi', style: 'cancel' },
        {
          text: 'Haan, Bahar Niklein',
          style: 'destructive',
          onPress: async () => {
            await customerLogout();
          },
        },
      ]
    );
  };

  const handleDownloadAllTimePdf = async () => {
    try {
      setIsDownloadingPdf(true);
      const fileUri = await downloadCustomerPortalPdf({
        customerName: customer.name || 'Gahak',
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/pdf',
          dialogTitle: `${customer.name || 'Gahak'} Ka Hisab Kitab`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('PDF Ready', `Statement download ho chuki hai:\n${fileUri}`);
      }
    } catch (error) {
      Alert.alert('PDF Error', error.message || 'Statement generate nahi ho saki.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const balance = customer.balance !== undefined ? customer.balance : 0;
  const isDebt = balance > 0;
  const isSettled = balance === 0;

  if (isLoading) {
    return <LoadingSpinner text="Aapka hisab load ho raha hai..." />;
  }

  // Filter months with entries, sorted newest first
  const activeMonths = months
    .filter((m) => m.entries && m.entries.length > 0)
    .sort((a, b) => (b.monthKey || '').localeCompare(a.monthKey || ''));

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadData(true)}
            colors={[colors.primary]}
          />
        }
      >
        {/* Warm Conversational Header */}
        <View style={styles.headerBar}>
          <View style={styles.headerGreetingCol}>
            <Text style={styles.greetingTitle}>
              Assalam-o-Alaikum, {customer.name || 'Gahak'} 👋
            </Text>
            <Text style={styles.shopNameSubtitle}>
              🏪 {shop.name || customerUser?.shopName || 'Karobar Hisab Shop'} ka hisab
            </Text>
          </View>

          {/* Large Friendly Logout Button */}
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Text style={styles.logoutButtonText}>Bahar Niklein 🚪</Text>
          </TouchableOpacity>
        </View>

        {errorMessage ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
          </View>
        ) : null}

        {/* HERO CARD: Giant Baqi Baqaya (Arm's-length dominant) */}
        <Card style={styles.heroCard}>
          <Text style={styles.heroLabel}>Aapka Kul Baqi Baqaya</Text>

          {/* Massive 42px Amount Display */}
          <Text
            style={[
              styles.heroAmount,
              { color: isDebt ? colors.danger : colors.success },
            ]}
          >
            Rs. {Math.abs(balance).toLocaleString()}
          </Text>

          {/* Conversational Status Explanation */}
          <View
            style={[
              styles.statusBanner,
              { backgroundColor: isDebt ? colors.dangerLight : colors.successLight },
            ]}
          >
            <Text
              style={[
                styles.statusBannerText,
                { color: isDebt ? colors.danger : colors.success },
              ]}
            >
              {isDebt
                ? '⚠️ Yeh raqam aap ne dukaan par ada karni hai'
                : isSettled
                ? '✅ Shukriya! Aapka koi baqaya nahi hai'
                : '★ Aapke paise dukaan par advance jama hain'}
            </Text>
          </View>

          {/* Secondary Context: Kitna Liya vs Kitna Diya */}
          <View style={styles.contextRow}>
            <View style={styles.contextCol}>
              <Text style={styles.contextLabel}>Kitna Samaan Liya:</Text>
              <Text style={[styles.contextValue, { color: colors.accent }]}>
                Rs. {(customer.totalUdhaar || 0).toLocaleString()}
              </Text>
              <Text style={styles.contextHint}>(Kul Udhaar)</Text>
            </View>

            <View style={styles.contextDivider} />

            <View style={styles.contextCol}>
              <Text style={styles.contextLabel}>Kitne Paise Diye:</Text>
              <Text style={[styles.contextValue, { color: colors.success }]}>
                Rs. {(customer.totalWasool || 0).toLocaleString()}
              </Text>
              <Text style={styles.contextHint}>(Kul Wasool)</Text>
            </View>
          </View>

          {/* Big Obvious PDF Download Button */}
          <TouchableOpacity
            style={styles.bigPdfButton}
            onPress={handleDownloadAllTimePdf}
            disabled={isDownloadingPdf}
            activeOpacity={0.85}
          >
            {isDownloadingPdf ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.bigPdfIcon}>📄</Text>
                <Text style={styles.bigPdfText}>
                  Apna Hisab PDF Mein Download Karein
                </Text>
              </>
            )}
          </TouchableOpacity>
        </Card>

        {/* MONTH-WISE ORGANIZATION LIST */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeading}>🗓️ Aapka Mahana Khata</Text>
          <Text style={styles.sectionSubtitle}>
            Kisi bhi mahine ka tafseeli hisab dekhne ke liye us par tap karein:
          </Text>
        </View>

        {activeMonths.length === 0 ? (
          <EmptyState
            icon="🧾"
            title="Abhi Koi Hisab Darj Nahi Hua"
            description="Jab dukaan se koi samaan ya payment darj hogi, to yahan mahana hisab show hoga."
          />
        ) : (
          activeMonths.map((month) => {
            const isMonthDebt = month.monthNet > 0;
            const entriesCount = month.entries?.length || 0;

            return (
              <TouchableOpacity
                key={month.monthKey}
                style={styles.monthCardTouchable}
                activeOpacity={0.8}
                onPress={() =>
                  navigation.navigate('CustomerPortalMonthDetail', {
                    monthKey: month.monthKey,
                    monthLabel: month.monthLabel,
                    monthData: month,
                    customerName: customer.name,
                    shopName: shop.name,
                  })
                }
              >
                <Card style={styles.monthCard}>
                  {/* Month Header Row */}
                  <View style={styles.monthCardHeader}>
                    <View style={styles.monthCardTitleCol}>
                      <Text style={styles.monthCardTitle}>
                        🗓️ {month.monthLabel}
                      </Text>
                      <Text style={styles.monthCardEntryCount}>
                        {entriesCount} {entriesCount === 1 ? 'tafseel' : 'tafseelat'}
                      </Text>
                    </View>

                    <View style={styles.monthCardArrowBadge}>
                      <Text style={styles.monthCardArrowText}>Kholein →</Text>
                    </View>
                  </View>

                  {/* Month Summary Metrics Row */}
                  <View style={styles.monthMetricsRow}>
                    <View style={styles.monthMetricBox}>
                      <Text style={styles.monthMetricLabel}>Is Mahine Ka Net:</Text>
                      <Text
                        style={[
                          styles.monthMetricValue,
                          { color: isMonthDebt ? colors.danger : colors.success },
                        ]}
                      >
                        {month.monthNet > 0
                          ? `+ Rs. ${month.monthNet.toLocaleString()}`
                          : month.monthNet < 0
                          ? `- Rs. ${Math.abs(month.monthNet).toLocaleString()}`
                          : 'Rs. 0'}
                      </Text>
                      <Text style={styles.monthMetricHint}>
                        {month.monthNet > 0 ? '(Udhaar Liya)' : month.monthNet < 0 ? '(Wasool Diya)' : '(Barabar)'}
                      </Text>
                    </View>

                    <View style={styles.monthMetricDivider} />

                    <View style={styles.monthMetricBox}>
                      <Text style={styles.monthMetricLabel}>Aakhri Baqaya:</Text>
                      <Text
                        style={[
                          styles.monthMetricValue,
                          {
                            fontWeight: 'bold',
                            color: month.closingBalance > 0 ? colors.danger : colors.success,
                          },
                        ]}
                      >
                        Rs. {(month.closingBalance || 0).toLocaleString()}
                      </Text>
                      <Text style={styles.monthMetricHint}>
                        {month.closingBalance > 0 ? '(Baqi Dena Hai)' : '(Mukammal Ada)'}
                      </Text>
                    </View>
                  </View>

                  {/* Bottom Friendly Prompt */}
                  <View style={styles.monthCardFooter}>
                    <Text style={styles.monthCardFooterText}>
                      Haftawar hisab aur rozaana tafseel dekhne ke liye tap karein ➔
                    </Text>
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })
        )}

        {/* Reassuring Footer */}
        <View style={styles.reassureFooter}>
          <Text style={styles.reassureFooterText}>
            ✓ Yeh hisab dukan dar ke computer se mutabiq hai. Agar koi sawal ho to dukaan par rabta karein.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl + 20,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingTop: spacing.xs,
  },
  headerGreetingCol: {
    flex: 1,
    marginRight: spacing.sm,
  },
  greetingTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 2,
  },
  shopNameSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  logoutButton: {
    backgroundColor: colors.cardBackground,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logoutButtonText: {
    fontSize: 13,
    color: colors.danger,
    fontWeight: 'bold',
  },
  errorBox: {
    backgroundColor: colors.dangerLight,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.danger,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '600',
  },
  // HERO CARD: Giant Baqi Baqaya
  heroCard: {
    ...cardStyles,
    padding: spacing.xl,
    borderRadius: 20,
    borderColor: 'rgba(15, 110, 86, 0.2)',
    borderWidth: 1.5,
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  heroLabel: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
  },
  heroAmount: {
    fontSize: 42,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginVertical: 4,
  },
  statusBanner: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  statusBannerText: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  // Secondary Context
  contextRow: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 14,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    width: '100%',
    marginBottom: spacing.lg,
  },
  contextCol: {
    flex: 1,
    alignItems: 'center',
  },
  contextDivider: {
    width: 1,
    backgroundColor: colors.border,
    height: '70%',
    alignSelf: 'center',
  },
  contextLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 3,
  },
  contextValue: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  contextHint: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  bigPdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: spacing.lg,
    width: '100%',
    elevation: 2,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  bigPdfIcon: {
    fontSize: 18,
    marginRight: spacing.sm,
  },
  bigPdfText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // MONTH LIST SECTION
  sectionHeader: {
    marginBottom: spacing.md,
  },
  sectionHeading: {
    fontSize: 19,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  monthCardTouchable: {
    marginBottom: spacing.md,
  },
  monthCard: {
    ...cardStyles,
    padding: spacing.lg,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(15, 110, 86, 0.15)',
  },
  monthCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F0EC',
  },
  monthCardTitleCol: {
    flex: 1,
  },
  monthCardTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 2,
  },
  monthCardEntryCount: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  monthCardArrowBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 12,
  },
  monthCardArrowText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: 'bold',
  },
  monthMetricsRow: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
  },
  monthMetricBox: {
    flex: 1,
    alignItems: 'center',
  },
  monthMetricDivider: {
    width: 1,
    backgroundColor: colors.border,
    height: '70%',
    alignSelf: 'center',
  },
  monthMetricLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 3,
  },
  monthMetricValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  monthMetricHint: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  monthCardFooter: {
    alignItems: 'center',
    paddingTop: spacing.xs,
  },
  monthCardFooterText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  reassureFooter: {
    backgroundColor: '#F8FAF8',
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reassureFooterText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
