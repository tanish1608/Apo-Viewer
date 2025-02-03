import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

// Constants
const TOKEN_EXPIRY_TIME = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
const STORAGE_KEY = 'auth_data';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const validateStoredAuth = () => {
      try {
        const storedAuth = localStorage.getItem(STORAGE_KEY);
        if (!storedAuth) return null;

        const authData = JSON.parse(storedAuth);
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

  // Auto logout when token expires
  useEffect(() => {
    if (!user) return;

    const storedAuth = localStorage.getItem(STORAGE_KEY);
    if (!storedAuth) return;

    const { expiresAt } = JSON.parse(storedAuth);
    const timeUntilExpiry = new Date(expiresAt).getTime() - Date.now();

    const logoutTimer = setTimeout(() => {
      logout();
    }, timeUntilExpiry);

    return () => clearTimeout(logoutTimer);
  }, [user]);

  const login = async (username, password) => {
    // Basic input validation
    if (!username || !password) {
      throw new Error('Username and password are required');
    }

    if (username.length < 3) {
      throw new Error('Username must be at least 3 characters long');
    }

    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    // TODO: Replace with actual API call
    if (username === 'admin' && password === 'admin123') {
      const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_TIME).toISOString();
      const userData = {
        username,
        role: 'admin',
        token: 'dummy-token', // This will be replaced with actual token from API
        lastLogin: new Date().toISOString()
      };

      // Store auth data with expiration
      const authData = {
        user: userData,
        expiresAt
      };

      setUser(userData);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(authData));
      return true;
    }

    throw new Error('Invalid credentials');
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    navigate('/login');
  };

  // Session activity monitoring
  useEffect(() => {
    if (!user) return;

    const handleActivity = () => {
      const storedAuth = localStorage.getItem(STORAGE_KEY);
      if (!storedAuth) return;

      const authData = JSON.parse(storedAuth);
      authData.expiresAt = new Date(Date.now() + TOKEN_EXPIRY_TIME).toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(authData));
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
    };
  }, [user]);

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