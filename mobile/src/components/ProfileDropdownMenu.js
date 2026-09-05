// src/components/ProfileDropdownMenu.js
// Header profile icon with dropdown menu for "My Profile" and "Logout"

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  StyleSheet,
  Alert,
} from 'react-native';
import { colors, spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

export default function ProfileDropdownMenu({ navigation }) {
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const { user, logout } = useAuth();

  const handleLogout = () => {
    setDropdownVisible(false);
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

  const handleOpenProfile = () => {
    setDropdownVisible(false);
    navigation.navigate('Profile');
  };

  return (
    <View style={styles.container}>
      {/* Header Profile Icon Button */}
      <TouchableOpacity
        onPress={() => setDropdownVisible(true)}
        style={styles.iconButton}
        activeOpacity={0.7}
        accessibilityLabel="User Menu"
      >
        <Text style={styles.avatarIcon}>👤</Text>
      </TouchableOpacity>

      {/* Dropdown Modal */}
      <Modal
        visible={dropdownVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDropdownVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setDropdownVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.menuContainer}>
                {/* User Info Header */}
                <View style={styles.userInfoRow}>
                  <View style={styles.avatarCircleSmall}>
                    <Text style={styles.avatarSmallText}>
                      {user?.name ? user.name.charAt(0).toUpperCase() : '👤'}
                    </Text>
                  </View>
                  <View style={styles.userNameCol}>
                    <Text style={styles.menuUserName} numberOfLines={1}>
                      {user?.name || 'Papa'}
                    </Text>
                    <Text style={styles.menuUserEmail} numberOfLines={1}>
                      {user?.email || ''}
                    </Text>
                  </View>
                </View>

                <View style={styles.divider} />

                {/* Option 1: Profile */}
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={handleOpenProfile}
                  activeOpacity={0.7}
                >
                  <Text style={styles.menuItemIcon}>👤</Text>
                  <Text style={styles.menuItemText}>My Profile</Text>
                </TouchableOpacity>

                <View style={styles.divider} />

                {/* Option 2: Logout */}
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={handleLogout}
                  activeOpacity={0.7}
                >
                  <Text style={styles.menuItemIcon}>🚪</Text>
                  <Text style={[styles.menuItemText, styles.logoutText]}>Logout</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginRight: 4,
  },
  iconButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarIcon: {
    fontSize: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 56,
    paddingRight: 14,
  },
  menuContainer: {
    width: 220,
    backgroundColor: colors.cardBackground,
    borderRadius: 14,
    paddingVertical: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  avatarCircleSmall: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarSmallText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  userNameCol: {
    flex: 1,
  },
  menuUserName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  menuUserEmail: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  menuItemIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  logoutText: {
    color: colors.danger,
  },
});
