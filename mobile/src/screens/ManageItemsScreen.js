// src/screens/ManageItemsScreen.js
// Manage master items catalog (Siri, Kaleji, Ogri, etc.) with consistent design tokens

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
import { getItems, deleteItem } from '../api/itemApi';

export default function ManageItemsScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchItems = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setErrorMessage('');
      const data = await getItems();
      setItems(data);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchItems();
    });
    return unsubscribe;
  }, [navigation, fetchItems]);

  const handleDeletePrompt = (item) => {
    Alert.alert(
      'Delete Item',
      `Kya aap "${item.name}" ko delete karna chahte hain?\n\nIs item se judi purani entries mein iska naam save rahega, lekin ye item dropdown se hat jayega.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Haan, Delete Karein',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteItem(item._id);
              fetchItems();
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const renderItemRow = ({ item }) => (
    <Card style={styles.itemCard}>
      <TouchableOpacity
        style={styles.itemInfo}
        onPress={() => navigation.navigate('AddEditItem', { itemId: item._id })}
        activeOpacity={0.7}
      >
        <View style={styles.itemHeader}>
          <Text style={styles.itemIcon}>🥩</Text>
          <Text style={styles.itemName}>{item.name}</Text>
        </View>
        <Text style={styles.itemRate}>
          Default rate: <Text style={styles.rateHighlight}>Rs. {item.defaultRate}</Text>
        </Text>
      </TouchableOpacity>

      <View style={styles.actionsGroup}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('AddEditItem', { itemId: item._id })}
          activeOpacity={0.8}
        >
          <Text style={styles.editButtonText}>✏️ Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeletePrompt(item)}
          activeOpacity={0.8}
        >
          <Text style={styles.deleteButtonText}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  return (
    <View style={styles.container}>
      {/* Top action bar */}
      <View style={styles.topBar}>
        <Text style={styles.topBarSubtitle}>
          Master catalog of items with default rates
        </Text>
        <PrimaryButton
          title="+ Add Item"
          variant="accent"
          onPress={() => navigation.navigate('AddEditItem')}
          style={styles.addItemButton}
          textStyle={styles.addItemText}
        />
      </View>

      {/* Error display with Retry button */}
      {errorMessage ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <PrimaryButton
            title="🔄 Dobara Koshish Karein (Retry)"
            variant="danger"
            onPress={() => fetchItems()}
            style={styles.retryButton}
          />
        </View>
      ) : null}

      {/* Items list */}
      {isLoading ? (
        <LoadingSpinner message="Loading master items..." />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item._id}
          renderItem={renderItemRow}
          contentContainerStyle={
            items.length === 0 ? styles.emptyListContainer : styles.listContainer
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchItems(true)}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="📦"
              title="Abhi koi item add nahi hua"
              subtitle="Upar '+ Add Item' button se item ka naam aur default rate add karein (jaise Siri, Kaleji, Ogri)."
              actionLabel="+ Add First Item"
              onAction={() => navigation.navigate('AddEditItem')}
              actionVariant="accent"
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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  topBarSubtitle: {
    ...typography.bodySmall,
    flex: 1,
    marginRight: spacing.sm,
  },
  addItemButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  addItemText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  listContainer: {
    padding: spacing.lg,
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  itemInfo: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  itemName: {
    ...typography.h3,
  },
  itemRate: {
    ...typography.bodySmall,
  },
  rateHighlight: {
    fontWeight: 'bold',
    color: colors.primary,
  },
  actionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  editButton: {
    backgroundColor: colors.primaryLight,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  editButtonText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: colors.dangerLight,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  deleteButtonText: {
    fontSize: 14,
  },
  errorContainer: {
    backgroundColor: colors.dangerLight,
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: 10,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
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
