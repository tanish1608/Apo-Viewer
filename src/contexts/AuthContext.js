import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { verifyCredentials } from '../api/api';

const AuthContext = createContext(null);

// Constants
const STORAGE_KEY = 'auth_data';
const SESSION_CHECK_INTERVAL = 60000; // 1 minute

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Validate stored auth data
  useEffect(() => {
    const validateStoredAuth = async () => {
      try {
        const storedAuth = localStorage.getItem(STORAGE_KEY);
        if (!storedAuth) return null;

        const authData = JSON.parse(storedAuth);
        const { success } = await verifyCredentials(authData.username, authData.password);
        
        if (!success) {
          localStorage.removeItem(STORAGE_KEY);
          return null;
        }

        return authData;
      } catch (error) {
        console.error('Error validating stored auth:', error);
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
    };

    validateStoredAuth().then(validUser => {
      setUser(validUser);
      setLoading(false);
    });
  }, []);

  // Periodic session check
  useEffect(() => {
    if (!user) return;

    const checkSession = async () => {
      try {
        const { success } = await verifyCredentials(user.username, user.password);
        if (!success) {
          logout();
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

    const { success, error } = await verifyCredentials(username, password);
    
    if (!success) {
      throw new Error(error || 'Invalid credentials');
    }

    const userData = {
      username,
      password,
      lastLogin: new Date().toISOString()
    };

    setUser(userData);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
    return true;
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