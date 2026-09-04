// src/screens/AddPaymentEntryScreen.js
// Screen to record Wasool Raqam (payment received) entry with design system

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Card from '../components/Card';
import PrimaryButton from '../components/PrimaryButton';
import { colors, typography, spacing } from '../constants/theme';
import { createEntry, updateEntry } from '../api/entryApi';

export default function AddPaymentEntryScreen({ route, navigation }) {
  const { customerId, customerName, entry } = route.params || {};
  const isEditing = Boolean(entry);

  const [date, setDate] = useState(entry ? new Date(entry.entryDate) : new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timeString, setTimeString] = useState(
    entry?.entryTime ||
      new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );

  const [amount, setAmount] = useState(entry ? String(entry.amount) : '');
  const [note, setNote] = useState(entry?.note || '');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (event?.type === 'dismissed') return;
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const handleTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (event?.type === 'dismissed') return;
    if (selectedTime) {
      const formatted = selectedTime.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      setTimeString(formatted);
    }
  };

  const handleSave = async () => {
    setErrorMessage('');

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage('Please enter a valid payment amount greater than 0');
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        customerId,
        type: 'payment',
        amount: parsedAmount,
        note: note.trim(),
        entryDate: date.toISOString(),
        entryTime: timeString,
      };

      if (isEditing) {
        await updateEntry(entry._id, payload);
      } else {
        await createEntry(payload);
      }

      navigation.goBack();
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSaving(false);
    }
  };

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
            {isEditing ? 'Edit Payment Entry' : 'Wasool Raqam (Payment)'}
          </Text>
          <Text style={styles.customerSubtitle}>Gahak: {customerName}</Text>

          {errorMessage ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Date & Time Selectors */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Date</Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.datePickerText}>
                  📅 {date.toLocaleDateString()}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Time</Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowTimePicker(true)}
              >
                <Text style={styles.datePickerText}>⏰ {timeString}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display="default"
              onChange={handleDateChange}
            />
          )}

          {showTimePicker && (
            <DateTimePicker
              value={date}
              mode="time"
              display="default"
              onChange={handleTimeChange}
            />
          )}

          {/* Amount Received Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Wasool shuda raqam (Amount Rs.) *</Text>
            <TextInput
              style={[styles.input, styles.amountInput]}
              placeholder="e.g. 2000"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
              value={amount}
              onChangeText={(text) => {
                setAmount(text);
                if (errorMessage) setErrorMessage('');
              }}
              editable={!isSaving}
            />
          </View>

          {/* Note / Remarks */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tafseel / Note (e.g. Cash, EasyPaisa, Bank)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Cash wasool hua"
              placeholderTextColor={colors.textSecondary}
              value={note}
              onChangeText={setNote}
              editable={!isSaving}
            />
          </View>

          <PrimaryButton
            title={isEditing ? 'Update Payment' : 'Record Payment (Wasool)'}
            variant="success"
            icon="💵"
            onPress={handleSave}
            isLoading={isSaving}
            disabled={isSaving}
            style={styles.saveButton}
          />
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
    textAlign: 'center',
  },
  customerSubtitle: {
    fontSize: 14,
    color: colors.success,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: spacing.lg,
  },
  errorContainer: {
    backgroundColor: colors.dangerLight,
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: spacing.lg,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.textPrimary,
  },
  amountInput: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.success,
  },
  datePickerButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    justifyContent: 'center',
  },
  datePickerText: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  saveButton: {
    marginTop: spacing.sm,
  },
});
