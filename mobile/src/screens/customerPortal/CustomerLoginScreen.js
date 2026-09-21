// src/screens/customerPortal/CustomerLoginScreen.js
// Customer phone-only login screen (no OTP/password required)

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
} from 'react-native';
import Card from '../../components/Card';
import PrimaryButton from '../../components/PrimaryButton';
import { colors, typography, spacing, cardStyles } from '../../constants/theme';
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
      setErrorMessage('Barah-e-karam apna phone number darj karein');
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
        // CustomerAuthContext updates customerToken, automatically transitioning root navigator
      }
    } catch (error) {
      const msg =
        error.message ||
        'Ye number hamare kisi record mein nahi mila — dukaan wale se number confirm karein.';
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
          {/* Brand & Portal Header */}
          <View style={styles.headerBadge}>
            <Text style={styles.badgeText}>Gahak Khata Portal</Text>
          </View>

          <Text style={styles.appTitle}>Daily Tally</Text>
          <Text style={styles.screenTitle}>Apna Hisab Dekhein</Text>
          <Text style={styles.screenSubtitle}>
            Dukan par darj karwaya gaya apna mobile number likhein aur apna mukammal khata foran mulahiza karein.
          </Text>

          {errorMessage ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
            </View>
          ) : null}

          {/* Phone Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mobile Phone Number</Text>
            <View style={styles.phoneInputRow}>
              <TextInput
                style={styles.phoneInput}
                placeholder="03001234567"
                placeholderTextColor={colors.textSecondary}
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
            <Text style={styles.hintText}>
              Misal: 03001234567 ya 0300-1234567
            </Text>
          </View>

          {/* Submit Button */}
          <PrimaryButton
            title="Dekhein Apna Hisab →"
            onPress={() => handleSubmit()}
            isLoading={isSubmitting}
            disabled={isSubmitting}
            style={styles.submitButton}
          />

          {/* Privacy Note */}
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              🔒 Yeh sirf read-only portal hai. Aap apna purana aur naya hisab bila kisi rukawat dekh sakte hain.
            </Text>
          </View>

          {/* Back to Staff Login */}
          <View style={styles.footerLinkContainer}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Login')}
              disabled={isSubmitting}
              style={styles.backButton}
            >
              <Text style={styles.backButtonText}>← Dukan Dar / Staff Login Par Wapis Jayein</Text>
            </TouchableOpacity>
          </View>
        </Card>
      </ScrollView>

      {/* Multi-Shop Picker Modal */}
      <Modal
        visible={isPickerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard}>
            <Text style={styles.modalTitle}>Dukaan Ka Intikhab Karein</Text>
            <Text style={styles.modalSubtitle}>
              Is phone number par ek se zyada dukaanon par khata darj hai. Aap kis dukaan ka hisab dekhna chahte hain?
            </Text>

            <FlatList
              data={multipleMatches}
              keyExtractor={(item) => String(item.customerId)}
              style={styles.modalList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.shopItem}
                  activeOpacity={0.8}
                  onPress={() => handleSelectShop(item.customerId)}
                >
                  <View style={styles.shopInfo}>
                    <Text style={styles.shopName}>🏪 {item.shopName}</Text>
                    <Text style={styles.customerName}>Gahak: {item.name}</Text>
                    {item.shopPhone ? (
                      <Text style={styles.shopPhone}>📞 {item.shopPhone}</Text>
                    ) : null}
                  </View>
                  <Text style={styles.selectArrow}>Kholein →</Text>
                </TouchableOpacity>
              )}
            />

            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setIsPickerVisible(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
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
  },
  headerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  badgeText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  appTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  screenSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  errorContainer: {
    backgroundColor: colors.dangerLight,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.danger,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.cardBackground,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  hintText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  submitButton: {
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  infoBox: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  infoText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  footerLinkContainer: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  backButton: {
    paddingVertical: spacing.sm,
  },
  backButtonText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    ...cardStyles,
    padding: spacing.lg,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  modalSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  modalList: {
    marginBottom: spacing.md,
  },
  shopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: 10,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  shopInfo: {
    flex: 1,
  },
  shopName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  customerName: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '500',
  },
  shopPhone: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  selectArrow: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: 'bold',
    marginLeft: spacing.sm,
  },
  modalCancelButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  modalCancelText: {
    fontSize: 14,
    color: colors.danger,
    fontWeight: '600',
  },
});
