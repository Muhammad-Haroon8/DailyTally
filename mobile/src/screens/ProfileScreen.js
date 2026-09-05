// src/screens/ProfileScreen.js
// User Profile Screen:
// - View Name, Phone, and Email (Email is strictly READ-ONLY)
// - Update Profile (Name & Phone)
// - Change Password (Current Password, New Password, Confirm New Password)
// - Logout button with confirmation modal

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Card from '../components/Card';
import PrimaryButton from '../components/PrimaryButton';
import { colors, typography, spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { getMeRequest, updateProfileRequest, changePasswordRequest } from '../api/authApi';

export default function ProfileScreen({ navigation }) {
  const { user, logout, updateUser } = useAuth();

  // Profile fields
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // States
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');
  const [profileErrorMsg, setProfileErrorMsg] = useState('');
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState('');
  const [passwordErrorMsg, setPasswordErrorMsg] = useState('');

  // Fetch latest profile on load
  useEffect(() => {
    let isMounted = true;
    const fetchProfile = async () => {
      try {
        setIsLoadingProfile(true);
        const data = await getMeRequest();
        if (isMounted) {
          setName(data.name || '');
          setEmail(data.email || '');
          setPhone(data.phone || '');
          updateUser(data);
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      } finally {
        if (isMounted) {
          setIsLoadingProfile(false);
        }
      }
    };

    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleUpdateProfile = async () => {
    setProfileSuccessMsg('');
    setProfileErrorMsg('');

    if (!name.trim()) {
      setProfileErrorMsg('Apka naam khali nahi ho sakta.');
      return;
    }

    try {
      setIsSavingProfile(true);
      const res = await updateProfileRequest({
        name: name.trim(),
        phone: phone.trim(),
      });
      if (res.user) {
        updateUser(res.user);
      }
      setProfileSuccessMsg('Profile kamyabi se update ho gaya!');
      setTimeout(() => setProfileSuccessMsg(''), 4000);
    } catch (err) {
      setProfileErrorMsg(err.message || 'Profile update nahi ho saka.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordSuccessMsg('');
    setPasswordErrorMsg('');

    if (!currentPassword) {
      setPasswordErrorMsg('Maujooda (Current) password darj karein.');
      return;
    }
    if (!newPassword) {
      setPasswordErrorMsg('Naya password darj karein.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordErrorMsg('Naya password kam az kam 6 characters ka hona chahiye.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordErrorMsg('Naya password aur confirm password aapas mein match nahi kar rahe.');
      return;
    }

    try {
      setIsChangingPassword(true);
      await changePasswordRequest({
        currentPassword,
        newPassword,
      });
      setPasswordSuccessMsg('Password kamyabi se tabdeel ho gaya!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccessMsg(''), 4000);
    } catch (err) {
      setPasswordErrorMsg(err.message || 'Password tabdeel nahi ho saka.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout Confirmation',
      'Kya aap waqai logout karna chahte hain?',
      [
        { text: 'Nahi', style: 'cancel' },
        {
          text: 'Haan, Logout',
          style: 'destructive',
          onPress: logout,
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header Avatar / Greeting */}
      <View style={styles.headerAvatarContainer}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>
            {name ? name.charAt(0).toUpperCase() : '👤'}
          </Text>
        </View>
        <Text style={styles.userNameHeading}>{name || 'Dukaan Malik'}</Text>
        <Text style={styles.userRoleSubtitle}>Karobar Account Owner</Text>
      </View>

      {/* Consolidated Profile Details (Name, Phone, Read-only Email) */}
      <Card style={styles.card}>
        <Text style={styles.cardTitle}>👤 Profile Details</Text>

        {isLoadingProfile && (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginBottom: 12 }} />
        )}

        {profileSuccessMsg ? (
          <View style={styles.successBanner}>
            <Text style={styles.successBannerText}>✅ {profileSuccessMsg}</Text>
          </View>
        ) : null}

        {profileErrorMsg ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>⚠️ {profileErrorMsg}</Text>
          </View>
        ) : null}

        {/* Email Field - Strictly READ-ONLY */}
        <View style={styles.fieldGroup}>
          <Text style={styles.inputLabel}>Email Address</Text>
          <View style={styles.readOnlyInputWrapper}>
            <TextInput
              style={[styles.input, styles.readOnlyInput]}
              value={email}
              editable={false}
              selectTextOnFocus={false}
            />
            <Text style={styles.lockIcon}>🔒</Text>
          </View>
          <Text style={styles.readOnlyNote}>Email change nahi ho sakta (Permanent login ID)</Text>
        </View>

        {/* Name Field - Editable */}
        <View style={styles.fieldGroup}>
          <Text style={styles.inputLabel}>Naam (Name)</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Apna naam darj karein"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        {/* Phone Field - Editable */}
        <View style={styles.fieldGroup}>
          <Text style={styles.inputLabel}>Phone Number</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="03001234567"
            placeholderTextColor={colors.textSecondary}
            keyboardType="phone-pad"
          />
        </View>

        <PrimaryButton
          title="Save Profile"
          icon="💾"
          onPress={handleUpdateProfile}
          isLoading={isSavingProfile}
          style={styles.saveBtn}
        />
      </Card>

      {/* Section 2: Change Password */}
      <Card style={styles.card}>
        <Text style={styles.cardTitle}>🔑 Password Tabdeel Karein</Text>

        {passwordSuccessMsg ? (
          <View style={styles.successBanner}>
            <Text style={styles.successBannerText}>✅ {passwordSuccessMsg}</Text>
          </View>
        ) : null}

        {passwordErrorMsg ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>⚠️ {passwordErrorMsg}</Text>
          </View>
        ) : null}

        <View style={styles.fieldGroup}>
          <Text style={styles.inputLabel}>Maujooda Password (Current Password)</Text>
          <TextInput
            style={styles.input}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="Purana password darj karein"
            placeholderTextColor={colors.textSecondary}
            secureTextEntry
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.inputLabel}>Naya Password (New Password)</Text>
          <TextInput
            style={styles.input}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Kam az kam 6 characters"
            placeholderTextColor={colors.textSecondary}
            secureTextEntry
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.inputLabel}>Naya Password Confirm Karein</Text>
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Dobara naya password likhein"
            placeholderTextColor={colors.textSecondary}
            secureTextEntry
          />
        </View>

        <PrimaryButton
          title="Change Password"
          icon="🔒"
          variant="accent"
          onPress={handleChangePassword}
          isLoading={isChangingPassword}
          style={styles.changePasswordBtn}
        />
      </Card>

      {/* Section 3: Logout Action */}
      <View style={styles.logoutSection}>
        <PrimaryButton
          title="Logout Karein"
          icon="🚪"
          variant="danger"
          onPress={handleLogout}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  headerAvatarContainer: {
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  userNameHeading: {
    ...typography.h2,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  userRoleSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  card: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
  },
  cardTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  fieldGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#FAF9F6',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: colors.textPrimary,
  },
  readOnlyInputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  readOnlyInput: {
    backgroundColor: '#EFEFEF',
    color: colors.textSecondary,
    borderColor: '#D8D6D0',
    paddingRight: 40,
  },
  lockIcon: {
    position: 'absolute',
    right: 14,
    fontSize: 16,
    color: colors.textSecondary,
  },
  readOnlyNote: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  saveBtn: {
    marginTop: spacing.xs,
  },
  changePasswordBtn: {
    marginTop: spacing.xs,
  },
  successBanner: {
    backgroundColor: colors.successLight,
    borderColor: colors.success,
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  successBannerText: {
    color: colors.success,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorBanner: {
    backgroundColor: colors.dangerLight,
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  errorBannerText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  logoutSection: {
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
});
