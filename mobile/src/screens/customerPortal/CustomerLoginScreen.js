// src/screens/customerPortal/CustomerLoginScreen.js
// Customer phone-only login screen — Redesigned for non-technical users
// Big clear input, plain language, zero technical jargon

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
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import Card from '../../components/Card';
import { colors, spacing, cardStyles } from '../../constants/theme';
import { useCustomerAuth } from '../../context/CustomerAuthContext';

export default function CustomerLoginScreen({ navigation }) {
  const { customerLogin } = useCustomerAuth();

  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Multi-shop selection state
  const [multipleMatches, setMultipleMatches] = useState(null);
  const [isPickerVisible, setIsPickerVisible] = useState(false);

  const handleSubmit = async (chosenCustomerId = null) => {
    setErrorMessage('');

    const targetPhone = phone.trim();
    if (!targetPhone) {
      setErrorMessage('Pehle apna mobile number likhein');
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await customerLogin(targetPhone, chosenCustomerId);

      if (result?.multiple && result.matches?.length > 1) {
        setMultipleMatches(result.matches);
        setIsPickerVisible(true);
      } else {
        setIsPickerVisible(false);
      }
    } catch (error) {
      const msg =
        error.message ||
        'Ye number hamare paas nahi hai — dukaandaar se dobara number confirm kar lein.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectShop = (customerId) => {
    setIsPickerVisible(false);
    handleSubmit(customerId);
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
          {/* Friendly Icon Header */}
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>🧾</Text>
          </View>

          <Text style={styles.screenTitle}>Apna Hisab Dekhein</Text>
          <Text style={styles.screenSubtitle}>
            Dukaan par diya gaya apna mobile number likhein aur apna pura khata check karein.
          </Text>

          {/* Friendly Error Box */}
          {errorMessage ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
            </View>
          ) : null}

          {/* Big Clear Phone Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Apna Mobile Number Likhein</Text>
            <View style={styles.phoneInputBox}>
              <Text style={styles.phoneIcon}>📞</Text>
              <TextInput
                style={styles.phoneInput}
                placeholder="0300 1234567"
                placeholderTextColor="#A09E97"
                keyboardType="phone-pad"
                autoCapitalize="none"
                autoCorrect={false}
                value={phone}
                onChangeText={(text) => {
                  setPhone(text);
                  if (errorMessage) setErrorMessage('');
                }}
                editable={!isSubmitting}
              />
            </View>
          </View>

          {/* Large Unmissable Submit Button */}
          <TouchableOpacity
            style={[styles.bigButton, isSubmitting && styles.buttonDisabled]}
            onPress={() => handleSubmit()}
            disabled={isSubmitting}
            activeOpacity={0.85}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.bigButtonText}>Apna Hisab Dekhein →</Text>
            )}
          </TouchableOpacity>

          {/* Reassuring Plain Note */}
          <View style={styles.reassureRow}>
            <Text style={styles.reassureText}>
              🔒 Password ki zaroorat nahi hai. Aapka hisab foran khul jayega.
            </Text>
          </View>

          {/* Big Clear Back Button */}
          <View style={styles.footerContainer}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Login')}
              disabled={isSubmitting}
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <Text style={styles.backButtonText}>
                ← Dukaan Dar / Staff Login Par Wapis Jayein
              </Text>
            </TouchableOpacity>
          </View>
        </Card>
      </ScrollView>

      {/* Simplified Multi-Shop Picker Modal */}
      <Modal
        visible={isPickerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard}>
            <Text style={styles.modalTitle}>Aap Kis Dukaan Ka Hisab Dekhna Chahte Hain?</Text>
            <Text style={styles.modalSubtitle}>
              Neechay di gayi dukaan par tap karein:
            </Text>

            <FlatList
              data={multipleMatches}
              keyExtractor={(item) => String(item.customerId)}
              style={styles.modalList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.shopChoiceCard}
                  activeOpacity={0.8}
                  onPress={() => handleSelectShop(item.customerId)}
                >
                  <View style={styles.shopInfoWrap}>
                    <Text style={styles.shopChoiceName}>🏪 {item.shopName}</Text>
                    <Text style={styles.shopChoiceCustomer}>Gahak: {item.name}</Text>
                  </View>
                  <Text style={styles.shopChoiceArrow}>Kholein →</Text>
                </TouchableOpacity>
              )}
            />

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setIsPickerVisible(false)}
            >
              <Text style={styles.modalCloseText}>Wapis Jayein</Text>
            </TouchableOpacity>
          </Card>
        </View>
      </Modal>
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
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    ...cardStyles,
    padding: spacing.xl,
    borderRadius: 20,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  iconText: {
    fontSize: 32,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  screenSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  errorContainer: {
    backgroundColor: colors.dangerLight,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.danger,
  },
  errorText: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs + 2,
  },
  phoneInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.cardBackground,
    paddingHorizontal: spacing.md,
  },
  phoneIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  phoneInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    letterSpacing: 1,
  },
  bigButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    elevation: 2,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  bigButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  reassureRow: {
    backgroundColor: '#F8FAF8',
    padding: spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: spacing.xl,
  },
  reassureText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  footerContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    alignItems: 'center',
  },
  backButton: {
    paddingVertical: spacing.sm,
  },
  backButtonText: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    ...cardStyles,
    padding: spacing.xl,
    borderRadius: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  modalList: {
    marginBottom: spacing.md,
  },
  shopChoiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: 'rgba(15, 110, 86, 0.2)',
    marginBottom: spacing.sm,
  },
  shopInfoWrap: {
    flex: 1,
  },
  shopChoiceName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  shopChoiceCustomer: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  shopChoiceArrow: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.primary,
    marginLeft: spacing.sm,
  },
  modalCloseButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  modalCloseText: {
    fontSize: 15,
    color: colors.danger,
    fontWeight: 'bold',
  },
});
