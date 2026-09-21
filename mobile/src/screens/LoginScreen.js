// src/screens/LoginScreen.js
// Login screen for Karobar Hisab with consistent styling system

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
import EyeIcon from '../components/EyeIcon';
import Card from '../components/Card';
import PrimaryButton from '../components/PrimaryButton';
import { colors, typography, spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen({ navigation, route }) {
  const { login } = useAuth();

  const [email, setEmail] = useState(route?.params?.prefillEmail || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Update email if route params change (e.g. redirected from Signup)
  React.useEffect(() => {
    if (route?.params?.prefillEmail) {
      setEmail(route.params.prefillEmail);
    }
  }, [route?.params?.prefillEmail]);

  const handleLogin = async () => {
    setErrorMessage('');

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both email and password');
      return;
    }

    try {
      setIsSubmitting(true);
      await login(email.trim(), password);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSubmitting(false);
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
          <Text style={styles.appTitle}>Karobar Hisab</Text>
          <Text style={styles.screenTitle}>Login to your account</Text>

          {errorMessage ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email address</Text>
            <TextInput
              style={styles.input}
              placeholder="name@example.com"
              placeholderTextColor={colors.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errorMessage) setErrorMessage('');
              }}
              editable={!isSubmitting}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="••••••••"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errorMessage) setErrorMessage('');
                }}
                editable={!isSubmitting}
              />
              <TouchableOpacity
                style={styles.eyeIconContainer}
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                activeOpacity={0.7}
              >
                <EyeIcon visible={showPassword} size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          <PrimaryButton
            title="Login"
            onPress={handleLogin}
            isLoading={isSubmitting}
            disabled={isSubmitting}
            style={styles.submitButton}
          />

          <View style={styles.footerLinkContainer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity
              onPress={() => {
                setErrorMessage('');
                navigation.navigate('Signup');
              }}
              disabled={isSubmitting}
            >
              <Text style={styles.linkText}>Sign up</Text>
            </TouchableOpacity>
          </View>

          {/* Customer Portal Entry Section */}
          <View style={styles.customerPortalDivider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>YA (OR)</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.customerPortalCard}
            onPress={() => {
              setErrorMessage('');
              navigation.navigate('CustomerLogin');
            }}
            disabled={isSubmitting}
            activeOpacity={0.85}
          >
            <View style={styles.customerPortalIconBadge}>
              <Text style={styles.customerPortalIcon}>📱</Text>
            </View>
            <View style={styles.customerPortalContent}>
              <Text style={styles.customerPortalTitle}>Customer Hain? Apna Hisab Dekhein</Text>
              <Text style={styles.customerPortalSubtitle}>
                Sirf phone number se apna khata check karein (No password)
              </Text>
            </View>
            <Text style={styles.customerPortalArrow}>→</Text>
          </TouchableOpacity>
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
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    padding: spacing.xl,
  },
  appTitle: {
    ...typography.h1,
    color: colors.primary,
    marginBottom: spacing.xs,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  screenTitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: colors.dangerLight,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.danger,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.danger,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.cardBackground,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 14,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
  },
  eyeIconContainer: {
    paddingLeft: 10,
    paddingVertical: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButton: {
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  footerLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    ...typography.bodySmall,
  },
  linkText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: 'bold',
  },
  // Customer Portal Entry Styles
  customerPortalDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    paddingHorizontal: spacing.sm,
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  customerPortalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(15, 110, 86, 0.2)',
  },
  customerPortalIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  customerPortalIcon: {
    fontSize: 20,
  },
  customerPortalContent: {
    flex: 1,
  },
  customerPortalTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 2,
  },
  customerPortalSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 15,
  },
  customerPortalArrow: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginLeft: spacing.xs,
  },
});
