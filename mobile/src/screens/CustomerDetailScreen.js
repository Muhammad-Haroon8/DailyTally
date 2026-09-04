// src/screens/CustomerDetailScreen.js
// Customer Hisab & Entries screen:
// - Big balance header & quick action buttons
// - Vertical scrolling list of collapsible month sections (most recent month first)
// - Current/latest month expanded by default, older months collapsed
// - Opening balance carried forward banner (↳ Pichla baqaya)
// - Date-wise transaction cards within each month
// - Accordion expand/collapse with smooth interaction

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import Card from '../components/Card';
import PrimaryButton from '../components/PrimaryButton';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import { colors, typography, spacing } from '../constants/theme';
import { getEntriesByCustomer, deleteEntry } from '../api/entryApi';

export default function CustomerDetailScreen({ route, navigation }) {
  const { customerId, customerName: initialName } = route.params || {};

  const [customer, setCustomer] = useState({ name: initialName, balance: 0 });
  const [months, setMonths] = useState([]);
  const [expandedMonths, setExpandedMonths] = useState({});
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

      const serverMonths = data.months || [];
      setMonths(serverMonths);

      // Expand the most recent (first) month by default, keep others collapsed
      if (serverMonths.length > 0) {
        setExpandedMonths((prev) => {
          // If already set by user interaction, preserve it; otherwise default first month to true
          if (Object.keys(prev).length > 0) return prev;
          return { [serverMonths[0].monthKey]: true };
        });
      }
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [customerId]);

  // Reload when screen regains focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation, loadData]);

  // Toggle expand/collapse for a given month
  const toggleMonth = (monthKey) => {
    setExpandedMonths((prev) => ({
      ...prev,
      [monthKey]: !prev[monthKey],
    }));
  };

  const handleEntryActions = (entry) => {
    Alert.alert(
      entry.type === 'item' ? 'Item Entry' : 'Wasool Entry',
      `${entry.type === 'item' ? `${entry.quantity} ${entry.itemName} @ Rs.${entry.rate}` : `Wasool: Rs. ${entry.amount}`}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Edit',
          onPress: () => {
            if (entry.type === 'item') {
              navigation.navigate('AddItemEntry', {
                customerId,
                customerName: customer.name,
                entry,
              });
            } else {
              navigation.navigate('AddPaymentEntry', {
                customerId,
                customerName: customer.name,
                entry,
              });
            }
          },
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const entryDesc =
              entry.type === 'item'
                ? `Rs. ${entry.amount} (${entry.quantity} ${entry.itemName} Udhaar)`
                : `Rs. ${entry.amount} Wasool`;

            Alert.alert(
              'Confirm Delete',
              `Kya aap waqai '${entryDesc}' ki entry delete karna chahte hain?`,
              [
                { text: 'Nahi', style: 'cancel' },
                {
                  text: 'Haan, Delete Karein',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await deleteEntry(entry._id);
                      loadData();
                    } catch (err) {
                      Alert.alert('Error', err.message);
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  // Helper to group a month's entries into date-wise cards
  const groupMonthEntriesByDate = (entriesList) => {
    const groups = {};

    entriesList.forEach((entry) => {
      const dateObj = new Date(entry.entryDate);
      const dateKey = dateObj.toISOString().split('T')[0];

      if (!groups[dateKey]) {
        groups[dateKey] = {
          dateKey,
          dateFormatted: dateObj.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          }),
          items: [],
          dayTotal: 0,
        };
      }

      groups[dateKey].items.push(entry);

      if (entry.type === 'item') {
        groups[dateKey].dayTotal += entry.amount;
      } else {
        groups[dateKey].dayTotal -= entry.amount;
      }
    });

    return Object.values(groups).sort(
      (a, b) => new Date(b.dateKey) - new Date(a.dateKey)
    );
  };

  // Render a single date-card inside an expanded month
  const renderDateCard = (section) => (
    <Card key={section.dateKey} style={styles.dateCard}>
      {/* Date Card Header */}
      <View style={styles.dateCardHeader}>
        <View style={styles.dateRow}>
          <Text style={styles.calendarIcon}>📅</Text>
          <Text style={styles.dateText}>{section.dateFormatted}</Text>
        </View>
        <Text
          style={[
            styles.dayTotalText,
            section.dayTotal > 0
              ? styles.dayTotalDebit
              : section.dayTotal < 0
              ? styles.dayTotalCredit
              : styles.dayTotalNeutral,
          ]}
        >
          Day net: {section.dayTotal >= 0 ? `Rs. ${section.dayTotal.toLocaleString()}` : `- Rs. ${Math.abs(section.dayTotal).toLocaleString()}`}
        </Text>
      </View>

      {/* Entries within this date */}
      {section.items.map((entry) => {
        const isItem = entry.type === 'item';
        return (
          <TouchableOpacity
            key={entry._id}
            style={styles.entryRow}
            onPress={() => handleEntryActions(entry)}
            activeOpacity={0.7}
          >
            <View style={styles.entryLeft}>
              <View
                style={[
                  styles.entryTypePill,
                  isItem ? styles.itemPill : styles.paymentPill,
                ]}
              >
                <Text style={styles.pillIcon}>{isItem ? '📦' : '💵'}</Text>
                <Text
                  style={[
                    styles.entryTypeText,
                    isItem ? styles.itemPillText : styles.paymentPillText,
                  ]}
                >
                  {isItem ? 'UDHAAR' : 'WASOOL'}
                </Text>
              </View>

              <View style={styles.entryDetails}>
                <Text style={styles.entryMainText}>
                  {isItem
                    ? `${entry.quantity} ${entry.itemName} @ Rs.${entry.rate}`
                    : `Wasool Raqam ${entry.note ? `(${entry.note})` : ''}`}
                </Text>
                {entry.entryTime ? (
                  <Text style={styles.entryTimeText}>⏰ {entry.entryTime}</Text>
                ) : null}
              </View>
            </View>

            <View style={styles.entryRight}>
              <Text
                style={[
                  styles.entryAmountText,
                  isItem ? styles.itemAmount : styles.paymentAmount,
                ]}
              >
                {isItem ? `Rs. ${entry.amount.toLocaleString()}` : `+ Rs. ${entry.amount.toLocaleString()}`}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </Card>
  );

  // Render a Month Section (Collapsible Accordion Card)
  const renderMonthSection = ({ item: monthItem }) => {
    const isExpanded = !!expandedMonths[monthItem.monthKey];
    const dateGroups = isExpanded ? groupMonthEntriesByDate(monthItem.entries) : [];

    return (
      <View style={styles.monthSectionContainer}>
        {/* Month Accordion Header */}
        <TouchableOpacity
          style={[styles.monthHeader, isExpanded && styles.monthHeaderExpanded]}
          onPress={() => toggleMonth(monthItem.monthKey)}
          activeOpacity={0.8}
        >
          <View style={styles.monthHeaderTopRow}>
            <View style={styles.monthTitleWrap}>
              <Text style={styles.monthTitleText}>🗓️ {monthItem.monthLabel}</Text>
              <Text style={styles.monthEntriesCount}>
                ({monthItem.entries.length} {monthItem.entries.length === 1 ? 'entry' : 'entries'})
              </Text>
            </View>
            <View style={styles.chevronWrap}>
              <Text style={styles.chevronIcon}>{isExpanded ? '▲' : '▼'}</Text>
            </View>
          </View>

          {/* Month Summary Line */}
          <View style={styles.monthSummaryRow}>
            <Text style={styles.monthNetSummary}>
              Is mahine ka hisab:{' '}
              <Text
                style={{
                  fontWeight: '700',
                  color: monthItem.monthNet > 0 ? colors.danger : colors.success,
                }}
              >
                {monthItem.monthNet >= 0 ? `+Rs. ${monthItem.monthNet.toLocaleString()}` : `-Rs. ${Math.abs(monthItem.monthNet).toLocaleString()}`}
              </Text>
            </Text>
            <Text style={styles.monthClosingSummary}>
              Closing: <Text style={{ fontWeight: '700' }}>Rs. {monthItem.closingBalance.toLocaleString()}</Text>
            </Text>
          </View>
        </TouchableOpacity>

        {/* Collapsible Content */}
        {isExpanded ? (
          <View style={styles.monthBody}>
            {/* Opening Balance Carried Forward Line (if opening balance is not zero) */}
            {monthItem.openingBalance !== 0 ? (
              <View style={styles.openingBalanceBanner}>
                <View style={styles.openingBalanceLeft}>
                  <Text style={styles.openingArrowIcon}>↳</Text>
                  <Text style={styles.openingLabelText}>Pichla baqaya (Carried Forward):</Text>
                </View>
                <Text style={styles.openingBalanceAmount}>
                  Rs. {monthItem.openingBalance.toLocaleString()}
                </Text>
              </View>
            ) : null}

            {/* Date-wise entries */}
            {dateGroups.map(renderDateCard)}

            {/* Month Footer Closing Balance Confirmation */}
            <View style={styles.monthFooterBar}>
              <Text style={styles.monthFooterText}>
                {monthItem.monthLabel} Total Closing:{' '}
                <Text style={styles.monthFooterAmount}>
                  Rs. {monthItem.closingBalance.toLocaleString()}
                </Text>
              </Text>
            </View>
          </View>
        ) : null}
      </View>
    );
  };

  const balance = customer.balance || 0;

  return (
    <View style={styles.container}>
      {/* Sticky Balance & Customer Header */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <View style={styles.headerInfo}>
            <Text style={styles.customerName}>{customer.name || 'Gahak'}</Text>
            {customer.phone ? (
              <Text style={styles.customerPhone}>📞 {customer.phone}</Text>
            ) : null}
          </View>
          <TouchableOpacity
            style={styles.editCustomerButton}
            onPress={() =>
              navigation.navigate('AddEditCustomer', { customerId })
            }
            activeOpacity={0.8}
          >
            <Text style={styles.editCustomerText}>✏️ Edit Gahak</Text>
          </TouchableOpacity>
        </View>

        {/* Big Balance Display */}
        <View style={styles.balanceContainer}>
          <Text style={styles.balanceLabel}>Kul Baqaya (Total Balance):</Text>
          <Text
            style={[
              styles.balanceValue,
              balance > 0
                ? styles.balanceDanger
                : balance < 0
                ? styles.balanceCredit
                : styles.balanceZero,
            ]}
          >
            Rs. {Math.abs(balance).toLocaleString()}
            {balance > 0 ? ' (Baqaya)' : balance < 0 ? ' (Advance/Jama)' : ' (Be-baaq)'}
          </Text>
        </View>

        {/* Action Buttons: Add Item vs Wasool Raqam */}
        <View style={styles.buttonsRow}>
          <PrimaryButton
            title="Add Item (Udhaar)"
            icon="📦"
            variant="accent"
            onPress={() =>
              navigation.navigate('AddItemEntry', {
                customerId,
                customerName: customer.name,
              })
            }
            style={styles.actionBtn}
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
            style={styles.actionBtn}
          />
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

      {/* Month Sections List */}
      {isLoading ? (
        <LoadingSpinner message="Loading gahak hisab & entries..." />
      ) : (
        <FlatList
          data={months}
          keyExtractor={(item) => item.monthKey}
          renderItem={renderMonthSection}
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
              subtitle="Upar diye gaye buttons se 'Add Item' ya 'Wasool Raqam' shuru karein."
            />
          }
        />
      )}
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
  customerName: {
    ...typography.h1,
  },
  customerPhone: {
    ...typography.bodySmall,
    marginTop: 2,
  },
  editCustomerButton: {
    backgroundColor: colors.primaryLight,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  editCustomerText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  balanceContainer: {
    backgroundColor: colors.background,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    marginVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  balanceLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
    marginBottom: 4,
  },
  balanceValue: {
    ...typography.amountLarge,
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
  buttonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
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
  // Month Section Styles
  monthSectionContainer: {
    marginBottom: spacing.md,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  monthHeader: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  monthHeaderExpanded: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  monthHeaderTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  monthTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  monthTitleText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  monthEntriesCount: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  chevronWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chevronIcon: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: 'bold',
  },
  monthSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  monthNetSummary: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  monthClosingSummary: {
    fontSize: 12,
    color: colors.textPrimary,
  },
  monthBody: {
    padding: spacing.sm,
    backgroundColor: colors.background,
  },
  // Opening Balance Banner
  openingBalanceBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FAF5EE',
    borderWidth: 1,
    borderColor: '#EBDCC8',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: spacing.sm,
  },
  openingBalanceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  openingArrowIcon: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.accent,
  },
  openingLabelText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accent,
    fontStyle: 'italic',
  },
  openingBalanceAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.accent,
  },
  // Month Footer
  monthFooterBar: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'flex-end',
  },
  monthFooterText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  monthFooterAmount: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  // Date Card Styles
  dateCard: {
    padding: 0,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  dateCardHeader: {
    backgroundColor: '#F3EFEA',
    paddingHorizontal: 14,
    paddingVertical: 9,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calendarIcon: {
    fontSize: 13,
    marginRight: 6,
  },
  dateText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  dayTotalText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dayTotalDebit: {
    color: colors.danger,
  },
  dayTotalCredit: {
    color: colors.success,
  },
  dayTotalNeutral: {
    color: colors.textSecondary,
  },
  entryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  entryLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  entryTypePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: spacing.sm,
  },
  itemPill: {
    backgroundColor: colors.dangerLight,
  },
  paymentPill: {
    backgroundColor: colors.successLight,
  },
  pillIcon: {
    fontSize: 11,
    marginRight: 4,
  },
  entryTypeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  itemPillText: {
    color: colors.danger,
  },
  paymentPillText: {
    color: colors.success,
  },
  entryDetails: {
    flex: 1,
  },
  entryMainText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  entryTimeText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  entryRight: {
    paddingLeft: spacing.sm,
  },
  entryAmountText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemAmount: {
    color: colors.danger,
  },
  paymentAmount: {
    color: colors.success,
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
