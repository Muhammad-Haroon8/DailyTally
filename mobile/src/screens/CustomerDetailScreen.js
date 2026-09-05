// src/screens/CustomerDetailScreen.js
// Customer Hisab Screen:
// - Top Section: Customer Info, Big Balance Display, "Add Item" & "Wasool Raqam" action buttons
// - Plain vertical list of Month Cards (sorted newest first, empty months skipped)
// - Each card shows: Month Label, Month Net total, and Closing Balance
// - Tapping a month card navigates to MonthDetailScreen

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import Card from '../components/Card';
import PrimaryButton from '../components/PrimaryButton';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import { colors, typography, spacing } from '../constants/theme';
import { getEntriesByCustomer } from '../api/entryApi';
import SendReportModal from '../components/SendReportModal';

export default function CustomerDetailScreen({ route, navigation }) {
  const { customerId, customerName: initialName } = route.params || {};

  const [customer, setCustomer] = useState({ name: initialName, balance: 0 });
  const [months, setMonths] = useState([]);
  const [isReportModalVisible, setIsReportModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setErrorMessage('');
      const data = await getEntriesByCustomer(customerId);
      setCustomer(data.customer);
      setMonths(data.months || []);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [customerId]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation, loadData]);

  const balance = customer.balance || 0;

  // Render a Month Card in the vertical list
  const renderMonthCard = ({ item: monthItem }) => {
    const isDebit = monthItem.monthNet > 0;
    const isCredit = monthItem.monthNet < 0;

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() =>
          navigation.navigate('MonthDetail', {
            customerId,
            customerName: customer.name,
            monthKey: monthItem.monthKey,
            initialMonthData: monthItem,
          })
        }
      >
        <Card style={styles.monthCard}>
          <View style={styles.monthCardLeft}>
            <View style={styles.monthIconWrap}>
              <Text style={styles.monthCalendarIcon}>🗓️</Text>
            </View>
            <View style={styles.monthInfoCol}>
              <Text style={styles.monthLabelText}>{monthItem.monthLabel}</Text>
              <Text style={styles.monthNetText}>
                Is mahine ka hisab:{' '}
                <Text
                  style={[
                    styles.netAmountHighlight,
                    isDebit ? styles.textDebit : isCredit ? styles.textCredit : styles.textNeutral,
                  ]}
                >
                  {monthItem.monthNet >= 0
                    ? `+Rs. ${monthItem.monthNet.toLocaleString()}`
                    : `-Rs. ${Math.abs(monthItem.monthNet).toLocaleString()}`}
                </Text>
              </Text>
              <Text style={styles.monthEntriesCountText}>
                {monthItem.entries.length} {monthItem.entries.length === 1 ? 'entry' : 'entries'}
              </Text>
            </View>
          </View>

          <View style={styles.monthCardRight}>
            <Text style={styles.closingLabel}>Closing</Text>
            <Text
              style={[
                styles.closingAmountText,
                monthItem.closingBalance > 0
                  ? styles.textDebit
                  : monthItem.closingBalance < 0
                    ? styles.textCredit
                    : styles.textNeutral,
              ]}
            >
              Rs. {Math.abs(monthItem.closingBalance).toLocaleString()}
            </Text>
            <Text style={styles.viewDetailsText}>Tafseel Dekhein →</Text>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Sticky Balance & Customer Header */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <View style={styles.headerInfo}>
            <View style={styles.customerNameRow}>
              <Text style={styles.customerName}>{customer.name || 'Gahak'}</Text>
              {(customer.isLocal || (typeof customerId === 'string' && customerId.startsWith('local-'))) && (
                <View style={styles.queuedBadge}>
                  <Text style={styles.queuedBadgeText}>⏳ Queued</Text>
                </View>
              )}
            </View>
            {customer.phone ? (
              <Text style={styles.customerPhone}>📞 {customer.phone}</Text>
            ) : null}
          </View>
          <View style={styles.headerActionButtonsRow}>
            <TouchableOpacity
              style={styles.reportButton}
              onPress={() => setIsReportModalVisible(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.reportButtonText}>📄 Report</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.editCustomerButton}
              onPress={() =>
                navigation.navigate('AddEditCustomer', { customerId })
              }
              activeOpacity={0.8}
            >
              <Text style={styles.editCustomerText}>✏️ Edit</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Financial Summary: Kul Udhaar, Kul Wasool & Baqi Baqaya */}
        <View style={styles.financialSummaryCard}>
          <View style={styles.financialColsRow}>
            {/* Kul Udhaar */}
            <View style={styles.financialCol}>
              <Text style={styles.financialLabel}>Kul Udhaar (Items)</Text>
              <Text style={[styles.financialValue, styles.textDebit]}>
                Rs. {(customer.totalUdhaar || 0).toLocaleString()}
              </Text>
            </View>

            <View style={styles.financialDivider} />

            {/* Kul Wasool */}
            <View style={styles.financialCol}>
              <Text style={styles.financialLabel}>Kul Wasool (Paid)</Text>
              <Text style={[styles.financialValue, styles.textCredit]}>
                Rs. {(customer.totalWasool || 0).toLocaleString()}
              </Text>
            </View>
          </View>

          {/* Baqi Baqaya (Remaining Balance) Highlight Bar */}
          <View style={styles.balanceHighlightBar}>
            <Text style={styles.balanceHighlightLabel}>Baqi Baqaya (Net Balance):</Text>
            <Text
              style={[
                styles.balanceHighlightValue,
                balance > 0
                  ? styles.balanceDanger
                  : balance < 0
                    ? styles.balanceCredit
                    : styles.balanceZero,
              ]}
            >
              Rs. {Math.abs(balance).toLocaleString()}
              {balance > 0 ? ' (Baqaya)' : balance < 0 ? ' (Advance/Jama)' : ' (Saaf)'}
            </Text>
          </View>
        </View>

        {/* Action Buttons: ALWAYS VISIBLE Add Item & Wasool Raqam */}
        <View style={styles.actionButtonsRow}>
          <PrimaryButton
            title="Add Item"
            icon="📦"
            variant="accent"
            onPress={() =>
              navigation.navigate('AddItemEntry', {
                customerId,
                customerName: customer.name,
              })
            }
            style={styles.customerActionBtn}
          />

          <PrimaryButton
            title="Wasool Raqam"
            icon="💵"
            variant="success"
            onPress={() =>
              navigation.navigate('AddPaymentEntry', {
                customerId,
                customerName: customer.name,
              })
            }
            style={styles.customerActionBtn}
          />
        </View>

        {/* Manage Items Catalog quick access link */}
        <TouchableOpacity
          style={styles.manageItemsQuickLink}
          onPress={() => navigation.navigate('ManageItems')}
          activeOpacity={0.75}
        >
          <Text style={styles.manageItemsQuickLinkText}>📦 Manage Items Catalog (Rates & Naye Items) ›</Text>
        </TouchableOpacity>

        {/* Monthly Activity Summary Pill */}
        <View style={styles.summaryPillRow}>
          <View style={styles.summaryPill}>
            <Text style={styles.summaryPillLabel}>Kul Mahine</Text>
            <Text style={styles.summaryPillValue}>{months.length} Active</Text>
          </View>
          <View style={styles.summaryPillDivider} />
          <View style={styles.summaryPill}>
            <Text style={styles.summaryPillLabel}>Kul Entries</Text>
            <Text style={styles.summaryPillValue}>
              {months.reduce((acc, m) => acc + (m.entries?.length || 0), 0)} Total
            </Text>
          </View>
          <View style={styles.summaryPillDivider} />
          <View style={styles.summaryPill}>
            <Text style={styles.summaryPillLabel}>Status</Text>
            <Text
              style={[
                styles.summaryPillValue,
                balance > 0 ? styles.textDebit : balance < 0 ? styles.textCredit : styles.textNeutral,
              ]}
            >
              {balance > 0 ? 'Udhaar Baqi' : balance < 0 ? 'Advance Jama' : 'Saaf Hisab'}
            </Text>
          </View>
        </View>
      </View>

      {/* Error Message with Retry */}
      {errorMessage ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <PrimaryButton
            title="🔄 Dobara Koshish Karein (Retry)"
            variant="danger"
            onPress={() => loadData()}
            style={styles.retryButton}
          />
        </View>
      ) : null}

      {/* List Header Title */}
      <View style={styles.listHeaderBar}>
        <Text style={styles.listHeaderTitle}>Mahinawaar Hisab (Months List)</Text>
        <Text style={styles.listHeaderSubtitle}>Mahine par tap kar ke tafseel dekhein</Text>
      </View>

      {/* Vertical List of Month Cards */}
      {isLoading ? (
        <LoadingSpinner message="Loading mahinawaar hisab..." />
      ) : (
        <FlatList
          data={months}
          keyExtractor={(item) => item.monthKey}
          renderItem={renderMonthCard}
          contentContainerStyle={
            months.length === 0
              ? styles.emptyListContainer
              : styles.listContainer
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadData(true)}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="📝"
              title="Abhi koi entry nahi hui"
              subtitle="Upar diye gaye buttons 'Add Item' ya 'Wasool Raqam' se pehli entry shuru karein."
            />
          }
        />
      )}

      {/* Send Report Modal */}
      <SendReportModal
        visible={isReportModalVisible}
        onClose={() => setIsReportModalVisible(false)}
        customerId={customerId}
        customerName={customer.name}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerCard: {
    backgroundColor: colors.cardBackground,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerInfo: {
    flex: 1,
  },
  customerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  customerName: {
    ...typography.h1,
  },
  queuedBadge: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  queuedBadgeText: {
    fontSize: 10,
    color: '#B45309',
    fontWeight: '700',
  },
  customerPhone: {
    ...typography.bodySmall,
    marginTop: 2,
  },
  headerActionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reportButton: {
    backgroundColor: colors.primary,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  reportButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  editCustomerButton: {
    backgroundColor: colors.primaryLight,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  editCustomerText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  financialSummaryCard: {
    backgroundColor: '#FAF9F6',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginVertical: spacing.md,
  },
  financialColsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  financialCol: {
    flex: 1,
    alignItems: 'center',
  },
  financialLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
  },
  financialValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  financialDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },
  balanceHighlightBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingHorizontal: 4,
  },
  balanceHighlightLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  balanceHighlightValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  balanceDanger: {
    color: colors.danger,
  },
  balanceCredit: {
    color: colors.success,
  },
  balanceZero: {
    color: colors.textPrimary,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  customerActionBtn: {
    flex: 1,
    paddingVertical: 12,
  },
  manageItemsQuickLink: {
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: spacing.md,
    backgroundColor: colors.primaryLight,
    borderRadius: 8,
  },
  manageItemsQuickLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  summaryPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FAF9F6',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  summaryPill: {
    alignItems: 'center',
    flex: 1,
  },
  summaryPillDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
  },
  summaryPillLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 2,
    fontWeight: '500',
  },
  summaryPillValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  listHeaderBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  listHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  listHeaderSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  listContainer: {
    padding: spacing.md,
    paddingBottom: 36,
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  // Month Card in List
  monthCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginBottom: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  monthCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  monthIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  monthCalendarIcon: {
    fontSize: 22,
  },
  monthInfoCol: {
    flex: 1,
  },
  monthLabelText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 3,
  },
  monthNetText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  netAmountHighlight: {
    fontWeight: '700',
  },
  monthEntriesCountText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  monthCardRight: {
    alignItems: 'flex-end',
    paddingLeft: spacing.sm,
  },
  closingLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  closingAmountText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginVertical: 2,
  },
  viewDetailsText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  textDebit: {
    color: colors.danger,
  },
  textCredit: {
    color: colors.success,
  },
  textNeutral: {
    color: colors.textSecondary,
  },
  errorContainer: {
    margin: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.dangerLight,
    borderRadius: 10,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  retryButton: {
    paddingVertical: 8,
    alignSelf: 'center',
  },
});
