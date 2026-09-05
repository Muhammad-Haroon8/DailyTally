// src/screens/DashboardScreen.js
// Dashboard for Karobar Hisab with polished design tokens, avatar icons, and card layouts

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
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
import { getCustomers } from '../api/customerApi';

export default function DashboardScreen({ navigation }) {

  const [customers, setCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchCustomerList = useCallback(async (query = '', isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setErrorMessage('');
      const data = await getCustomers(query);
      setCustomers(data);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Refresh customer list whenever returning to Dashboard
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchCustomerList(searchQuery);
    });
    return unsubscribe;
  }, [navigation, fetchCustomerList, searchQuery]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomerList(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, fetchCustomerList]);

  const renderCustomerItem = ({ item }) => {
    const balance = item.balance || 0;

    return (
      <TouchableOpacity
        onPress={() =>
          navigation.navigate('CustomerDetail', {
            customerId: item._id,
            customerName: item.name,
          })
        }
        activeOpacity={0.75}
      >
        <Card style={styles.customerCard}>
          <View style={styles.customerAvatar}>
            <Text style={styles.avatarText}>
              {item.name ? item.name.charAt(0).toUpperCase() : '👤'}
            </Text>
          </View>

          <View style={styles.customerInfo}>
            <View style={styles.customerNameRow}>
              <Text style={styles.customerName}>{item.name}</Text>
              {(item.isLocal || (typeof item._id === 'string' && item._id.startsWith('local-'))) && (
                <View style={styles.queuedBadge}>
                  <Text style={styles.queuedBadgeText}>⏳ Queued</Text>
                </View>
              )}
            </View>
            {item.phone ? (
              <Text style={styles.customerPhone}>📞 {item.phone}</Text>
            ) : null}

            {balance > 0 ? (
              <Text style={styles.balanceDebit}>
                Baqaya: <Text style={styles.boldText}>Rs. {balance.toLocaleString()}</Text>
              </Text>
            ) : balance < 0 ? (
              <Text style={styles.balanceCredit}>
                Jama/Advance: <Text style={styles.boldText}>Rs. {Math.abs(balance).toLocaleString()}</Text>
              </Text>
            ) : (
              <Text style={styles.balanceNeutral}>Koi baqaya nahi (Rs. 0)</Text>
            )}
          </View>

          <View style={styles.cardArrow}>
            <Text style={styles.cardArrowText}>›</Text>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Action Buttons Bar */}
      <View style={styles.header}>
        <PrimaryButton
          title="Manage Items"
          icon="📦"
          variant="outline"
          onPress={() => navigation.navigate('ManageItems')}
          style={styles.manageItemsButton}
        />

        <PrimaryButton
          title="+ Add Gahak"
          variant="primary"
          onPress={() => navigation.navigate('AddEditCustomer')}
          style={styles.addButton}
        />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search gahak by name..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery ? (
            <TouchableOpacity
              style={styles.clearSearch}
              onPress={() => setSearchQuery('')}
            >
              <Text style={styles.clearSearchText}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Error Banner with Retry Button */}
      {errorMessage ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <PrimaryButton
            title="🔄 Dobara Koshish Karein (Retry)"
            onPress={() => fetchCustomerList(searchQuery)}
            variant="danger"
            style={styles.retryButton}
          />
        </View>
      ) : null}

      {/* Customer List */}
      {isLoading ? (
        <LoadingSpinner message="Loading gahak list..." />
      ) : (
        <FlatList
          data={customers}
          keyExtractor={(item) => item._id}
          renderItem={renderCustomerItem}
          contentContainerStyle={
            customers.length === 0 ? styles.emptyListContainer : styles.listContainer
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchCustomerList(searchQuery, true)}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon={searchQuery ? '🔍' : '👥'}
              title={
                searchQuery
                  ? `"${searchQuery}" ke naam se koi gahak nahi mila`
                  : 'Abhi koi gahak add nahi hua'
              }
              subtitle={
                searchQuery
                  ? 'Spelling check karein ya search clear karein'
                  : 'Neeche "+ Add Gahak" button se naya gahak add karein'
              }
              actionLabel={searchQuery ? 'Clear Search' : undefined}
              onAction={searchQuery ? () => setSearchQuery('') : undefined}
              actionVariant="outline"
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  manageItemsButton: {
    flex: 1,
    paddingVertical: 12,
  },
  addButton: {
    flex: 1.2,
    paddingVertical: 12,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
  },
  clearSearch: {
    padding: 6,
  },
  clearSearchText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  listContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  customerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  customerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  customerInfo: {
    flex: 1,
  },
  customerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 2,
  },
  customerName: {
    ...typography.h3,
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
    marginBottom: 4,
  },
  balanceDebit: {
    fontSize: 13,
    color: colors.danger,
    marginTop: 2,
  },
  balanceCredit: {
    fontSize: 13,
    color: colors.success,
    marginTop: 2,
  },
  balanceNeutral: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  boldText: {
    fontWeight: 'bold',
  },
  cardArrow: {
    paddingLeft: spacing.sm,
  },
  cardArrowText: {
    fontSize: 24,
    color: colors.textSecondary,
    fontWeight: 'bold',
  },
  errorContainer: {
    backgroundColor: colors.dangerLight,
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: 10,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
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
