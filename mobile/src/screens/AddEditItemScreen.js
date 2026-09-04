// src/screens/AddEditItemScreen.js
// Screen to Add or Edit an Item in the Master Catalog with design system

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import Card from '../components/Card';
import PrimaryButton from '../components/PrimaryButton';
import LoadingSpinner from '../components/LoadingSpinner';
import { colors, typography, spacing } from '../constants/theme';
import {
  createItem,
  updateItem,
  getItemById,
  deleteItem,
} from '../api/itemApi';

export default function AddEditItemScreen({ route, navigation }) {
  const itemId = route.params?.itemId;
  const isEditing = Boolean(itemId);

  const [name, setName] = useState('');
  const [defaultRate, setDefaultRate] = useState('');
  const [isLoadingItem, setIsLoadingItem] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Pre-fill fields if editing
  useEffect(() => {
    if (isEditing) {
      const fetchItem = async () => {
        try {
          setIsLoadingItem(true);
          const data = await getItemById(itemId);
          setName(data.name || '');
          setDefaultRate(data.defaultRate !== undefined ? String(data.defaultRate) : '');
        } catch (error) {
          setErrorMessage(error.message);
        } finally {
          setIsLoadingItem(false);
        }
      };

      fetchItem();
    }
  }, [itemId, isEditing]);

  const handleSave = async () => {
    setErrorMessage('');

    if (!name.trim()) {
      setErrorMessage('Item name is required');
      return;
    }

    const rateNumber = parseFloat(defaultRate);
    if (isNaN(rateNumber) || rateNumber < 0) {
      setErrorMessage('Please enter a valid rate (0 or greater)');
      return;
    }

    try {
      setIsSaving(true);
      if (isEditing) {
        await updateItem(itemId, name.trim(), rateNumber);
      } else {
        await createItem(name.trim(), rateNumber);
      }
      navigation.goBack();
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Item',
      `Kya aap "${name}" ko delete karna chahte hain?\n\nIs item se judi purani entries mein iska naam save rahega, lekin ye item dropdown se hat jayega.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Haan, Delete Karein',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              await deleteItem(itemId);
              navigation.goBack();
            } catch (error) {
              setErrorMessage(error.message);
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  if (isLoadingItem) {
    return <LoadingSpinner message="Loading item details..." />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <Card style={styles.card}>
          <Text style={styles.title}>
            {isEditing ? 'Edit Item' : 'Add Master Item'}
          </Text>

          {errorMessage ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Item ka naam *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Siri, Kaleji, Ogri..."
              placeholderTextColor={colors.textSecondary}
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (errorMessage) setErrorMessage('');
              }}
              editable={!isSaving && !isDeleting}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Default rate (Rs.) *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 500"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
              value={defaultRate}
              onChangeText={(text) => {
                setDefaultRate(text);
                if (errorMessage) setErrorMessage('');
              }}
              editable={!isSaving && !isDeleting}
            />
          </View>

          <PrimaryButton
            title={isEditing ? 'Update Item' : 'Save Item'}
            onPress={handleSave}
            isLoading={isSaving}
            disabled={isSaving || isDeleting}
            style={styles.saveButton}
          />

          {isEditing && (
            <PrimaryButton
              title="Delete Item"
              variant="danger"
              icon="🗑️"
              onPress={handleDelete}
              isLoading={isDeleting}
              disabled={isSaving || isDeleting}
              style={styles.deleteButton}
            />
          )}
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  card: {
    padding: spacing.xl,
  },
  title: {
    ...typography.h2,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: colors.dangerLight,
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: spacing.lg,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
  },
  saveButton: {
    marginTop: spacing.sm,
  },
  deleteButton: {
    marginTop: spacing.md,
  },
});
