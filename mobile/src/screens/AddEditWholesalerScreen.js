// src/screens/AddEditWholesalerScreen.js
// Screen to Add or Edit a Wholesaler (Saudagar)

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
  createWholesaler,
  updateWholesaler,
  getWholesalerById,
  deleteWholesaler,
} from '../api/wholesalerApi';

export default function AddEditWholesalerScreen({ route, navigation }) {
  const wholesalerId = route.params?.wholesalerId;
  const isEditing = Boolean(wholesalerId);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoadingWholesaler, setIsLoadingWholesaler] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isEditing) {
      const fetchWholesaler = async () => {
        try {
          setIsLoadingWholesaler(true);
          const data = await getWholesalerById(wholesalerId);
          setName(data.name || '');
          setPhone(data.phone || '');
        } catch (error) {
          setErrorMessage(error.message);
        } finally {
          setIsLoadingWholesaler(false);
        }
      };

      fetchWholesaler();
    }
  }, [wholesalerId, isEditing]);

  const handleSave = async () => {
    setErrorMessage('');

    if (!name.trim()) {
      setErrorMessage('Wholesaler ka naam lazmi hai');
      return;
    }

    try {
      setIsSaving(true);
      if (isEditing) {
        await updateWholesaler(wholesalerId, { name, phone });
      } else {
        await createWholesaler({ name, phone });
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
      'Wholesaler Delete Karein',
      `Kya aap waqai "${name}" aur iski tamam entries delete karna chahte hain?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              await deleteWholesaler(wholesalerId);
              navigation.navigate('WholesalerList');
            } catch (error) {
              Alert.alert('Error', error.message);
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  if (isLoadingWholesaler) {
    return <LoadingSpinner message="Wholesaler data load ho raha hai..." />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>
            {isEditing ? 'Wholesaler Edit Karein' : 'Naya Wholesaler Add Karein'}
          </Text>

          {errorMessage ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Name Field */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              Wholesaler Naam <Text style={styles.requiredStar}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Malik Traders, Bilal Meat Supplier"
              placeholderTextColor={colors.textSecondary}
              value={name}
              onChangeText={setName}
              autoFocus={!isEditing}
            />
          </View>

          {/* Phone Field */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Phone Number (Ikhtiyari)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 0300-1234567"
              placeholderTextColor={colors.textSecondary}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>

          {/* Save Button */}
          <PrimaryButton
            title={isSaving ? 'Saving...' : isEditing ? 'Update Wholesaler' : 'Save Wholesaler'}
            onPress={handleSave}
            disabled={isSaving || isDeleting}
            variant="accent"
            style={styles.saveButton}
          />

          {/* Delete Button */}
          {isEditing ? (
            <PrimaryButton
              title={isDeleting ? 'Deleting...' : '🗑️ Wholesaler Delete Karein'}
              onPress={handleDelete}
              disabled={isSaving || isDeleting}
              variant="danger"
              style={styles.deleteButton}
            />
          ) : null}
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  card: {
    padding: spacing.lg,
  },
  sectionTitle: {
    ...typography.h2,
    marginBottom: spacing.lg,
    color: colors.accent,
  },
  fieldGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  requiredStar: {
    color: colors.danger,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: '#FFFFFF',
  },
  saveButton: {
    marginTop: spacing.md,
  },
  deleteButton: {
    marginTop: spacing.sm,
  },
  errorContainer: {
    backgroundColor: colors.dangerLight,
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
  },
});
