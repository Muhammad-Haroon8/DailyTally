// src/screens/customerPortal/CustomerPortalHomeScreen.js
// Customer Self-Service Portal - Read-Only Home Screen
// Bank-statement style presentation of lifetime balance and active months

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as Sharing from 'expo-sharing';
import Card from '../../components/Card';
import EmptyState from '../../components/EmptyState';
import LoadingSpinner from '../../components/LoadingSpinner';
import { colors, typography, spacing, cardStyles } from '../../constants/theme';
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
      'Kya aap Customer Portal se logout karna chahte hain?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
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

  return (
    <View style={styles.container}>
      <FlatList
        data={months}
        keyExtractor={(item) => item.monthKey}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadData(true)}
            colors={[colors.primary]}
          />
        }
        contentContainerStyle={styles.contentContainer}
        ListHeaderComponent={
          <View style={styles.headerContainer}>
            {/* Top Bar: Customer Greeting & Logout */}
            <View style={styles.topBar}>
              <View style={styles.greetingWrap}>
                <Text style={styles.salutation}>Assalam-o-Alaikum,</Text>
                <Text style={styles.customerName}>{customer.name || 'Gahak'}</Text>
                <Text style={styles.shopName}>
                  🏪 {shop.name || customerUser?.shopName || 'Karobar Hisab Shop'}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.logoutBadge}
                onPress={handleLogout}
                activeOpacity={0.7}
              >
                <Text style={styles.logoutText}>Logout 🚪</Text>
              </TouchableOpacity>
            </View>

            {errorMessage ? (
              <View style={styles.errorCard}>
                <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
              </View>
            ) : null}

            {/* Official Bank-Statement Style Summary Card */}
            <Card style={styles.statementCard}>
              <View style={styles.statementBadgeRow}>
                <View style={styles.officialTag}>
                  <Text style={styles.officialTagText}>OFFICIAL HISAB STATEMENT</Text>
                </View>
                <Text style={styles.phoneTag}>📞 {customer.phone || customerUser?.phone}</Text>
              </View>

              {/* Big Hero Balance Display */}
              <View style={styles.balanceSection}>
                <Text style={styles.balanceLabel}>Moujooda Baqi Baqaya (Current Balance)</Text>
                <Text
                  style={[
                    styles.balanceAmount,
                    { color: isDebt ? colors.danger : colors.success },
                  ]}
                >
                  Rs. {Math.abs(balance).toLocaleString()}
                </Text>
                <View
                  style={[
                    styles.statusPill,
                    { backgroundColor: isDebt ? colors.dangerLight : colors.successLight },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      { color: isDebt ? colors.danger : colors.success },
                    ]}
                  >
                    {isDebt
                      ? '● Raqam Dukan Dar Ko Ada Karni Hai (Payable)'
                      : isSettled
                      ? '✓ Tamam Hisab Chukta Hai (Nil Balance)'
                      : '★ Advance Jama Hai'}
                  </Text>
                </View>
              </View>

              {/* 2-Column Ledger Summary (Kul Udhaar vs Kul Wasool) */}
              <View style={styles.metricRow}>
                <View style={[styles.metricBox, styles.metricUdhaar]}>
                  <Text style={styles.metricLabel}>Kul Kharedari (Udhaar)</Text>
                  <Text style={[styles.metricValue, { color: colors.accent }]}>
                    Rs. {(customer.totalUdhaar || 0).toLocaleString()}
                  </Text>
                  <Text style={styles.metricSub}>A to Z kul samaan</Text>
                </View>

                <View style={styles.metricDivider} />

                <View style={[styles.metricBox, styles.metricWasool]}>
                  <Text style={styles.metricLabel}>Kul Wasool (Adaigi)</Text>
                  <Text style={[styles.metricValue, { color: colors.success }]}>
                    Rs. {(customer.totalWasool || 0).toLocaleString()}
                  </Text>
                  <Text style={styles.metricSub}>A to Z kul adaigi</Text>
                </View>
              </View>

              {/* 1-Tap Statement PDF Download */}
              <TouchableOpacity
                style={styles.pdfDownloadButton}
                onPress={handleDownloadAllTimePdf}
                disabled={isDownloadingPdf}
                activeOpacity={0.8}
              >
                {isDownloadingPdf ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.pdfIcon}>📄</Text>
                    <Text style={styles.pdfButtonText}>
                      Mukammal Statement Download Karein (PDF)
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </Card>

            {/* Months Section Header */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>📅 Mahana Hisab (Monthly Breakdown)</Text>
              <Text style={styles.sectionSubtitle}>
                Tafseelat dekhne ke liye kisi bhi mahine par tap karein
              </Text>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.monthCardTouchable}
            activeOpacity={0.85}
            onPress={() =>
              navigation.navigate('CustomerPortalMonthDetail', {
                monthKey: item.monthKey,
                monthLabel: item.monthLabel,
                monthData: item,
                customerName: customer.name,
                shopName: shop.name || customerUser?.shopName,
              })
            }
          >
            <Card style={styles.monthCard}>
              <View style={styles.monthHeaderRow}>
                <View>
                  <Text style={styles.monthLabelText}>{item.monthLabel}</Text>
                  <Text style={styles.monthSubText}>
                    {item.entries?.length || 0} transactions
                  </Text>
                </View>
                <View style={styles.viewBadge}>
                  <Text style={styles.viewBadgeText}>Tafseel Dekhein →</Text>
                </View>
              </View>

              <View style={styles.monthStatsRow}>
                <View style={styles.monthStatItem}>
                  <Text style={styles.statLabel}>Pichla Baqaya:</Text>
                  <Text style={styles.statValue}>
                    Rs. {(item.openingBalance || 0).toLocaleString()}
                  </Text>
                </View>

                <View style={styles.monthStatItem}>
                  <Text style={styles.statLabel}>Mahine Ka Net:</Text>
                  <Text
                    style={[
                      styles.statValue,
                      { color: item.monthNet > 0 ? colors.accent : colors.success },
                    ]}
                  >
                    {item.monthNet > 0 ? '+' : ''}
                    Rs. {(item.monthNet || 0).toLocaleString()}
                  </Text>
                </View>

                <View style={styles.monthStatItem}>
                  <Text style={styles.statLabel}>Aakhri Baqaya:</Text>
                  <Text
                    style={[
                      styles.statValue,
                      {
                        fontWeight: 'bold',
                        color: item.closingBalance > 0 ? colors.danger : colors.success,
                      },
                    ]}
                  >
                    Rs. {(item.closingBalance || 0).toLocaleString()}
                  </Text>
                </View>
              </View>
            </Card>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="📋"
            title="Abhi Koi Hisab Maujood Nahi"
            description="Is khate me abhi tak koi kharedari ya wasooli darj nahi hui hai."
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  headerContainer: {
    marginBottom: spacing.md,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    paddingTop: spacing.xs,
  },
  greetingWrap: {
    flex: 1,
    marginRight: spacing.md,
  },
  salutation: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  customerName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.primary,
    marginVertical: 2,
  },
  shopName: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  logoutBadge: {
    backgroundColor: colors.cardBackground,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logoutText: {
    fontSize: 13,
    color: colors.danger,
    fontWeight: '600',
  },
  errorCard: {
    backgroundColor: colors.dangerLight,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.danger,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '500',
  },
  statementCard: {
    ...cardStyles,
    padding: spacing.lg,
    borderColor: 'rgba(15, 110, 86, 0.25)',
    borderWidth: 1.5,
    marginBottom: spacing.lg,
  },
  statementBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  officialTag: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 4,
  },
  officialTagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  phoneTag: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  balanceSection: {
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  balanceLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  statusPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: spacing.sm,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  metricRow: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  metricBox: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  metricDivider: {
    width: 1,
    backgroundColor: colors.border,
    height: '80%',
    alignSelf: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  metricSub: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  pdfDownloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  pdfIcon: {
    fontSize: 16,
    marginRight: spacing.sm,
  },
  pdfButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  sectionHeader: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  monthCardTouchable: {
    marginBottom: spacing.sm,
  },
  monthCard: {
    ...cardStyles,
    padding: spacing.md,
  },
  monthHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  monthLabelText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  monthSubText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  viewBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
  },
  viewBadgeText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: 'bold',
  },
  monthStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  monthStatItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '500',
  },
});
