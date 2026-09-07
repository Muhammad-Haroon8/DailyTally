// src/screens/ManageWholesalerItemsScreen.js
// Manage Wholesaler purchase items catalog (Siri Jore, Siri, Kaleji, Ogri, etc.) with default purchase rates
// Fully independent of the Customer items catalog

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
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Card from '../components/Card';
import PrimaryButton from '../components/PrimaryButton';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import UpdatingIndicator from '../components/UpdatingIndicator';
import { colors, typography, spacing } from '../constants/theme';
import {
  getWholesalerItems,
  createWholesalerItem,
  updateWholesalerItem,
  deleteWholesalerItem,
} from '../api/wholesalerItemApi';
import { getCachedWholesalerItems } from '../storage/localCache';

export default function ManageWholesalerItemsScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBackgroundUpdating, setIsBackgroundUpdating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Add/Edit Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemName, setItemName] = useState('');
  const [itemRate, setItemRate] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  const fetchItems = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        // Fast instant cache load
        const cached = await getCachedWholesalerItems();
        if (cached && cached.length > 0) {
          setItems(cached);
          setIsLoading(false);
          setIsBackgroundUpdating(true);
        } else {
          setIsLoading(true);
        }
      }
      setErrorMessage('');

      const data = await getWholesalerItems();
      setItems(data);
    } catch (error) {
      if (items.length === 0) {
        setErrorMessage(error.message);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsBackgroundUpdating(false);
    }
  }, [items.length]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchItems();
    });
    return unsubscribe;
  }, [navigation, fetchItems]);

  const openAddModal = () => {
    setEditingItem(null);
    setItemName('');
    setItemRate('');
    setModalError('');
    setModalVisible(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setItemName(item.name);
    setItemRate(String(item.defaultRate));
    setModalError('');
    setModalVisible(true);
  };

  const handleSaveItem = async () => {
    setModalError('');

    if (!itemName.trim()) {
      setModalError('Item ka naam likhna zaroori hai');
      return;
    }

    const rateNum = parseFloat(itemRate);
    if (isNaN(rateNum) || rateNum < 0) {
      setModalError('Durust purchase rate darj karein');
      return;
    }

    try {
      setIsSaving(true);
      if (editingItem) {
        await updateWholesalerItem(editingItem._id, itemName.trim(), rateNum);
      } else {
        await createWholesalerItem(itemName.trim(), rateNum);
      }
      setModalVisible(false);
      fetchItems();
    } catch (err) {
      setModalError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePrompt = (item) => {
    Alert.alert(
      'Delete Wholesaler Item',
      `Kya aap "${item.name}" ko wholesaler catalog se delete karna chahte hain?\n\nPurani purchase entries mein iska record mehfooz rahega.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Haan, Delete Karein',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteWholesalerItem(item._id);
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
        onPress={() => openEditModal(item)}
        activeOpacity={0.7}
      >
        <View style={styles.itemHeader}>
          <Text style={styles.itemIcon}>📦</Text>
          <Text style={styles.itemName}>{item.name}</Text>
          {(item.isLocal || (typeof item._id === 'string' && item._id.startsWith('local-'))) && (
            <View style={styles.queuedBadge}>
              <Text style={styles.queuedBadgeText}>⏳ Queued</Text>
            </View>
          )}
        </View>
        <Text style={styles.itemRate}>
          Purchase rate: <Text style={styles.rateHighlight}>Rs. {item.defaultRate}</Text>
        </Text>
      </TouchableOpacity>

      <View style={styles.actionsGroup}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => openEditModal(item)}
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
          Wholesaler purchase items aur unke rates
        </Text>
        <PrimaryButton
          title="+ Add Purchase Item"
          variant="danger"
          onPress={openAddModal}
          icon="📦"
          style={styles.addButton}
        />
      </View>

      {isBackgroundUpdating && (
        <UpdatingIndicator message="Wholesaler items update ho rahe hain..." />
      )}

      {/* Main List */}
      {isLoading ? (
        <LoadingSpinner message="Wholesaler items load ho rahe hain..." />
      ) : errorMessage ? (
        <EmptyState
          title="Items load nahi ho sake"
          subtitle={errorMessage}
          actionTitle="Dobara Koshish Karein"
          onActionPress={() => fetchItems()}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item._id}
          renderItem={renderItemRow}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchItems(true)}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <EmptyState
              title="Koi Wholesaler Item nahi mila"
              subtitle="Wholesaler se khareede jane wale items (e.g. Siri Jore, Siri, Kaleji) aur unke purchase rates yahan add karein."
              actionTitle="+ Pehla Purchase Item Add Karein"
              onActionPress={openAddModal}
            />
          }
        />
      )}

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingItem ? 'Edit Purchase Item' : 'Add Naya Purchase Item'}
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {modalError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{modalError}</Text>
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Item Ka Naam *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Siri Jore, Kaleji, Ogri..."
                placeholderTextColor={colors.textSecondary}
                value={itemName}
                onChangeText={setItemName}
                autoFocus={true}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Purchase Rate (Rs.) *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 850"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                value={itemRate}
                onChangeText={setItemRate}
              />
              <Text style={styles.rateHint}>
                Yeh rate wholesaler purchase entry mein khud-ba-khud aayega
              </Text>
            </View>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
                disabled={isSaving}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <PrimaryButton
                  title={editingItem ? 'Update Karein' : 'Save Karein'}
                  variant="danger"
                  onPress={handleSaveItem}
                  isLoading={isSaving}
                />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  topBarSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  addButton: {
    marginTop: 2,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  itemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    marginBottom: spacing.sm,
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
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  queuedBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  queuedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
  },
  itemRate: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  rateHighlight: {
    fontWeight: '700',
    color: colors.error,
  },
  actionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  editButton: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  deleteButton: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  deleteButtonText: {
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalCloseBtn: {
    padding: spacing.xs,
  },
  modalCloseText: {
    fontSize: 18,
    color: colors.textSecondary,
    fontWeight: 'bold',
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#F87171',
    borderRadius: 8,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.error,
    fontSize: 13,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  rateHint: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
