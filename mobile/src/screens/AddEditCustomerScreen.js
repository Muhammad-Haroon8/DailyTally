// src/screens/AddEditCustomerScreen.js
// Screen to Add or Edit a Customer (Gahak) with consistent design system

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
  createCustomer,
  updateCustomer,
  getCustomerById,
  deleteCustomer,
} from '../api/customerApi';

export default function AddEditCustomerScreen({ route, navigation }) {
  const customerId = route.params?.customerId;
  const isEditing = Boolean(customerId);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoadingCustomer, setIsLoadingCustomer] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Pre-fill fields if editing
  useEffect(() => {
    if (isEditing) {
      const fetchCustomer = async () => {
        try {
          setIsLoadingCustomer(true);
          const data = await getCustomerById(customerId);
          setName(data.name || '');
          setPhone(data.phone || '');
        } catch (error) {
          setErrorMessage(error.message);
        } finally {
          setIsLoadingCustomer(false);
        }
      };

      fetchCustomer();
    }
  }, [customerId, isEditing]);

  const handleSave = async () => {
    setErrorMessage('');

    if (!name.trim()) {
      setErrorMessage('Customer name is required');
      return;
    }

    try {
      setIsSaving(true);
      if (isEditing) {
        await updateCustomer(customerId, name.trim(), phone.trim());
      } else {
        await createCustomer(name.trim(), phone.trim());
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
      'Delete Gahak',
      `Kya aap waqai "${name}" ko delete karna chahte hain?\n\nYeh amal wapis nahi ho sakega aur is gahak ka sara hisab delete ho jayega.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Haan, Delete Karein',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              await deleteCustomer(customerId);
              navigation.navigate('Dashboard');
            } catch (error) {
              setErrorMessage(error.message);
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  if (isLoadingCustomer) {
    return <LoadingSpinner message="Loading gahak profile..." />;
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
            {isEditing ? 'Edit Gahak' : 'Add Naya Gahak'}
          </Text>

          {errorMessage ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Gahak ka naam *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Ali Khan"
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
            <Text style={styles.label}>Phone number (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="03001234567"
              placeholderTextColor={colors.textSecondary}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              editable={!isSaving && !isDeleting}
            />
          </View>

          <PrimaryButton
            title={isEditing ? 'Update Gahak' : 'Save Gahak'}
            onPress={handleSave}
            isLoading={isSaving}
            disabled={isSaving || isDeleting}
            style={styles.saveButton}
          />

          {isEditing && (
            <PrimaryButton
              title="Delete Gahak"
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
