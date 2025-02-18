import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ErrorContainer from '../components/ErrorContainer';

const AuthContext = createContext(null);

// Constants
const STORAGE_KEY = 'auth_data';
const TOKEN_REFRESH_INTERVAL = 14 * 60 * 1000; // 14 minutes
const SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 hours
const ACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState([]);
  const navigate = useNavigate();

  // Initialize user from storage
  useEffect(() => {
    const initializeAuth = () => {
      const storedData = localStorage.getItem(STORAGE_KEY);
      if (storedData) {
        try {
          const userData = JSON.parse(storedData);
          setUser(userData);
        } catch (error) {
          console.error('Failed to parse stored auth data:', error);
          localStorage.removeItem(STORAGE_KEY);
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const addError = (message) => {
    const id = Date.now();
    setErrors(prev => [...prev, { id, message }]);
  };

  const removeError = (id) => {
    setErrors(prev => prev.filter(error => error.id !== id));
  };

  // Track user activity
  useEffect(() => {
    if (!user) return;

    const updateLastActivity = () => {
      const userData = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (userData) {
        userData.lastActivity = Date.now();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
      }
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
  }, [user]);

  // Check session validity
  useEffect(() => {
    const checkSession = () => {
      const userData = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!userData) return;

      const now = Date.now();
      const loginTime = new Date(userData.lastLogin).getTime();
      const lastActivity = userData.lastActivity || now;

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

    const intervalId = setInterval(checkSession, 60000);
    return () => clearInterval(intervalId);
  }, []);

  const login = async (username, password) => {
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
      return true;
    } catch (error) {
      addError(error.message);
      throw error;
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    navigate('/login');
  };

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