import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ErrorContainer from '../components/ErrorContainer';
import { useLocalStorage } from '../hooks/useLocalStorage';

const AuthContext = createContext(null);

// Constants
const STORAGE_KEY = 'auth_data';
const SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 hours
const ACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const REFRESH_INTERVAL = 60 * 1000; // Check every minute

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState([]);
  const navigate = useNavigate();
  const [authData, setAuthData] = useLocalStorage(STORAGE_KEY, null);

  // Initialize user from storage
  useEffect(() => {
    if (authData) {
      setUser(authData);
    }
    setLoading(false);
  }, [authData]);

  const addError = useCallback((message) => {
    const id = Date.now();
    setErrors(prev => [...prev, { id, message }]);
  }, []);

  const removeError = useCallback((id) => {
    setErrors(prev => prev.filter(error => error.id !== id));
  }, []);

  const handleLogout = useCallback(() => {
    setUser(null);
    setAuthData(null);
    navigate('/login');
  }, [navigate, setAuthData]);

  // Track user activity
  useEffect(() => {
    if (!user) return;

    const updateLastActivity = () => {
      setAuthData(prev => ({
        ...prev,
        lastActivity: Date.now()
      }));
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
      window.addEventListener(event, updateLastActivity);
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updateLastActivity);
      });
    };
  }, [user, setAuthData]);

  // Check session validity
  useEffect(() => {
    if (!user) return;

    const checkSession = () => {
      const now = Date.now();
      const loginTime = new Date(user.lastLogin).getTime();
      const lastActivity = user.lastActivity || now;

      if (now - loginTime > SESSION_DURATION) {
        addError('Session expired. Please log in again.');
        handleLogout();
        return;
      }

      if (now - lastActivity > ACTIVITY_TIMEOUT) {
        addError('Session timeout due to inactivity. Please log in again.');
        handleLogout();
        return;
      }
    };

    const intervalId = setInterval(checkSession, REFRESH_INTERVAL);
    return () => clearInterval(intervalId);
  }, [user, handleLogout, addError]);

  const login = useCallback(async (username, password) => {
    try {
      if (!username || !password) {
        throw new Error('Username and password are required');
      }

      // Demo login logic here...
      const userData = {
        username,
        lastLogin: new Date().toISOString(),
        lastActivity: Date.now()
      };

      setUser(userData);
      setAuthData(userData);
      return true;
    } catch (error) {
      addError(error.message);
      throw error;
    }
  }, [setAuthData, addError]);

  if (loading) {
    return (
      <div className="loading-container">
        <div>
          <div className="loading-spinner"></div>
          <div className="loading-text">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, logout: handleLogout }}>
      <ErrorContainer errors={errors} onDismiss={removeError} />
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