// src/screens/CustomerDetailScreen.js
// Customer Hisab & Entries screen: Big balance header, date-grouped transaction cards, action icons

import React, { useState, useEffect, useCallback } from 'react';
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
  const [entries, setEntries] = useState([]);
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
      setEntries(data.entries);
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

  // Group entries by Date (YYYY-MM-DD)
  const groupedSections = React.useMemo(() => {
    const groups = {};

    entries.forEach((entry) => {
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
  }, [entries]);

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

  const renderDateCard = ({ item: section }) => (
    <Card style={styles.dateCard}>
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

      {/* Date Cards List */}
      {isLoading ? (
        <LoadingSpinner message="Loading gahak hisab & entries..." />
      ) : (
        <FlatList
          data={groupedSections}
          keyExtractor={(item) => item.dateKey}
          renderItem={renderDateCard}
          contentContainerStyle={
            groupedSections.length === 0
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
    padding: spacing.lg,
    paddingBottom: 30,
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  dateCard: {
    padding: 0,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  dateCardHeader: {
    backgroundColor: '#F3EFEA',
    paddingHorizontal: 14,
    paddingVertical: 10,
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
    fontSize: 14,
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
    paddingVertical: 13,
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
