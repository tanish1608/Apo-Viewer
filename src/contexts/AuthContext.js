import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { verifyCredentials } from '../api/api';

const AuthContext = createContext(null);

// Constants
const SESSION_TOKEN_KEY = 'session_token';
const SESSION_EXPIRY_KEY = 'session_expiry';
const SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
const TOKEN_REFRESH_INTERVAL = 15 * 60 * 1000; // 15 minutes

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Function to generate a session token
  const generateSessionToken = () => {
    return btoa(crypto.getRandomValues(new Uint8Array(32)).toString());
  };

  // Function to check if the session is valid
  const isSessionValid = () => {
    const expiry = sessionStorage.getItem(SESSION_EXPIRY_KEY);
    return expiry && new Date().getTime() < parseInt(expiry);
  };

  // Function to clear session
  const clearSession = () => {
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
    sessionStorage.removeItem(SESSION_EXPIRY_KEY);
    setUser(null);
  };

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = () => {
      const sessionToken = sessionStorage.getItem(SESSION_TOKEN_KEY);
      
      if (sessionToken && isSessionValid()) {
        setUser({ sessionToken });
      } else {
        clearSession();
      }
      
      setLoading(false);
    };

    initializeAuth();
  }, []);

  // Set up session refresh
  useEffect(() => {
    if (!user) return;

    const refreshSession = () => {
      if (isSessionValid()) {
        // Update session expiry
        const newExpiry = new Date().getTime() + SESSION_DURATION;
        sessionStorage.setItem(SESSION_EXPIRY_KEY, newExpiry.toString());
      } else {
        clearSession();
        navigate('/login');
      }
    };

    const intervalId = setInterval(refreshSession, TOKEN_REFRESH_INTERVAL);
    return () => clearInterval(intervalId);
  }, [user, navigate]);

  const login = async (username, password) => {
    if (!username || !password) {
      throw new Error('Username and password are required');
    }

    try {
      // Verify credentials with the server
      const { success, error } = await verifyCredentials(username, password);
      
      if (!success) {
        throw new Error(error || 'Invalid credentials');
      }

      // Generate session token and set expiry
      const sessionToken = generateSessionToken();
      const expiry = new Date().getTime() + SESSION_DURATION;
      
      // Store in session storage (not localStorage for security)
      sessionStorage.setItem(SESSION_TOKEN_KEY, sessionToken);
      sessionStorage.setItem(SESSION_EXPIRY_KEY, expiry.toString());
      
      // Update state
      setUser({ sessionToken });
      
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = () => {
    clearSession();
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