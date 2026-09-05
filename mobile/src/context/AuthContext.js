import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { signupRequest, loginRequest } from '../api/authApi';
import { setUnauthorizedHandler } from '../api/client';

const AuthContext = createContext(null);

const TOKEN_KEY = 'authToken';
const USER_KEY = 'authUser';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Logs out user, clears SecureStore keys, and resets state
   */
  const logout = useCallback(async () => {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);
    } catch (error) {
      console.error('Error clearing SecureStore on logout:', error);
    } finally {
      setToken(null);
      setUser(null);
    }
  }, []);

  // Register 401 callback with apiClient
  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout();
    });
  }, [logout]);

  // Restore existing session from SecureStore on startup
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
        const storedUserJson = await SecureStore.getItemAsync(USER_KEY);

        if (storedToken && storedUserJson) {
          const parsedUser = JSON.parse(storedUserJson);
          setToken(storedToken);
          setUser(parsedUser);
        }
      } catch (error) {
        console.error('Failed to restore session from SecureStore:', error);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  /**
   * Registers a new user, persists session, and updates state
   */
  const signup = async (name, email, password) => {
    const data = await signupRequest(name, email, password);
    const { token: receivedToken, user: receivedUser } = data;

    // Persist to SecureStore
    await SecureStore.setItemAsync(TOKEN_KEY, receivedToken);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(receivedUser));

    // Update state
    setToken(receivedToken);
    setUser(receivedUser);
    return receivedUser;
  };

  /**
   * Authenticates user, persists session, and updates state
   */
  const login = async (email, password) => {
    const data = await loginRequest(email, password);
    const { token: receivedToken, user: receivedUser } = data;

    // Persist to SecureStore
    await SecureStore.setItemAsync(TOKEN_KEY, receivedToken);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(receivedUser));

    // Update state
    setToken(receivedToken);
    setUser(receivedUser);
    return receivedUser;
  };

  /**
   * Updates current user object in state and SecureStore
   */
  const updateUser = async (updatedUserData) => {
    try {
      const mergedUser = { ...user, ...updatedUserData };
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(mergedUser));
      setUser(mergedUser);
      return mergedUser;
    } catch (error) {
      console.error('Error updating user in SecureStore:', error);
      setUser((prev) => ({ ...prev, ...updatedUserData }));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        signup,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Custom hook to consume AuthContext easily
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
