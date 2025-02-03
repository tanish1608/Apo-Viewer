import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authenticateUser, refreshToken } from '../api/api';

const AuthContext = createContext(null);

// Constants
const TOKEN_EXPIRY_TIME = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
const TOKEN_REFRESH_THRESHOLD = 30 * 60 * 1000; // 30 minutes before expiry
const SESSION_CHECK_INTERVAL = 60000; // 1 minute
const STORAGE_KEY = 'auth_data';

// Encryption utilities
const encryptData = (data) => {
  return btoa(JSON.stringify(data));
};

const decryptData = (encrypted) => {
  try {
    return JSON.parse(atob(encrypted));
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Validate stored auth data
  useEffect(() => {
    const validateStoredAuth = () => {
      try {
        const storedAuth = localStorage.getItem(STORAGE_KEY);
        if (!storedAuth) return null;

        const authData = decryptData(storedAuth);
        if (!authData) return null;

        const expiryTime = new Date(authData.expiresAt).getTime();

        // Check if token has expired
        if (Date.now() > expiryTime) {
          localStorage.removeItem(STORAGE_KEY);
          return null;
        }

        return authData.user;
      } catch (error) {
        console.error('Error validating stored auth:', error);
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
    };

    const validUser = validateStoredAuth();
    setUser(validUser);
    setLoading(false);
  }, []);

  // Session check and token refresh
  useEffect(() => {
    if (!user) return;

    const checkSession = async () => {
      try {
        const authData = decryptData(localStorage.getItem(STORAGE_KEY));
        if (!authData) return logout();

        const expiryTime = new Date(authData.expiresAt).getTime();
        const timeUntilExpiry = expiryTime - Date.now();

        if (timeUntilExpiry <= 0) {
          logout();
        } else if (timeUntilExpiry <= TOKEN_REFRESH_THRESHOLD) {
          const refreshData = await refreshToken();
          if (refreshData) {
            const newExpiryTime = new Date(Date.now() + TOKEN_EXPIRY_TIME).toISOString();
            const updatedAuthData = {
              user: { ...user, token: refreshData.token },
              expiresAt: newExpiryTime
            };
            localStorage.setItem(STORAGE_KEY, encryptData(updatedAuthData));
            setUser(updatedAuthData.user);
          }
        }
      } catch (error) {
        console.error('Session check failed:', error);
        logout();
      }
    };

    const interval = setInterval(checkSession, SESSION_CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, [user]);

  const login = async (username, password) => {
    if (!username || !password) {
      throw new Error('Username and password are required');
    }

    if (username.length < 3) {
      throw new Error('Username must be at least 3 characters long');
    }

    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    try {
      const authResponse = await authenticateUser(username, password);
      const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_TIME).toISOString();
      
      const userData = {
        username,
        token: authResponse.token,
        role: authResponse.role || 'user',
        lastLogin: new Date().toISOString()
      };

      const authData = {
        user: userData,
        expiresAt
      };

      setUser(userData);
      localStorage.setItem(STORAGE_KEY, encryptData(authData));
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    navigate('/login');
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};