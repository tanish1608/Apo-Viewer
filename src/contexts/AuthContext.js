import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { verifyCredentials, refreshToken, logout as apiLogout } from '../api/api';
import ErrorToast from '../components/ErrorToast';

const AuthContext = createContext(null);

// Constants
const TOKEN_REFRESH_INTERVAL = 14 * 60 * 1000; // 14 minutes
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState([]);
  const navigate = useNavigate();

  // Function to add errors
  const addError = (message) => {
    const id = Date.now();
    setErrors(prev => [...prev, { id, message }]);
  };

  // Function to remove errors
  const removeError = (id) => {
    setErrors(prev => prev.filter(error => error.id !== id));
  };

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Attempt to refresh token on initial load
        const response = await refreshToken();
        if (response.success) {
          setUser(response.data.user);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // Set up token refresh
  useEffect(() => {
    if (!user) return;

    const refreshUserToken = async () => {
      try {
        const response = await refreshToken();
        if (!response.success) {
          throw new Error('Failed to refresh token');
        }
      } catch (error) {
        console.error('Token refresh failed:', error);
        addError('Session expired. Please log in again.');
        handleLogout();
      }
    };

    const intervalId = setInterval(refreshUserToken, TOKEN_REFRESH_INTERVAL);
    return () => clearInterval(intervalId);
  }, [user, handleLogout]);

  const login = async (username, password) => {
    try {
      if (!username || !password) {
        throw new Error('Username and password are required');
      }

      // Check login attempts
      const attempts = JSON.parse(sessionStorage.getItem('loginAttempts') || '{"count": 0}');
      if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
        const lockoutEnd = attempts.timestamp + LOCKOUT_DURATION;
        if (Date.now() < lockoutEnd) {
          const minutesLeft = Math.ceil((lockoutEnd - Date.now()) / 60000);
          throw new Error(`Too many login attempts. Please try again in ${minutesLeft} minutes.`);
        } else {
          sessionStorage.removeItem('loginAttempts');
        }
      }

      const response = await verifyCredentials(username, password);
      
      if (response.success) {
        setUser(response.data.user);
        sessionStorage.removeItem('loginAttempts');
        return true;
      } else {
        // Increment login attempts
        const newAttempts = {
          count: (attempts.count || 0) + 1,
          timestamp: Date.now()
        };
        sessionStorage.setItem('loginAttempts', JSON.stringify(newAttempts));
        
        throw new Error('Invalid credentials');
      }
    } catch (error) {
      console.error('Login failed:', error);
      addError(error.message);
      throw error;
    }
  };

  const handleLogout = async () => {
    try {
      await apiLogout();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setUser(null);
      navigate('/login');
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <AuthContext.Provider value={{ user, login, logout: handleLogout }}>
      {errors.map(error => (
        <ErrorToast
          key={error.id}
          error={error.message}
          onDismiss={() => removeError(error.id)}
        />
      ))}
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