import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

// Constants
const STORAGE_KEY = 'auth_data';
const SESSION_CHECK_INTERVAL = 60000; // 1 minute

// Demo credentials
const DEMO_CREDENTIALS = {
  username: 'admin',
  password: 'admin123'
};

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
        
        // For demo credentials, always return valid
        if (authData.username === DEMO_CREDENTIALS.username && 
            authData.password === DEMO_CREDENTIALS.password) {
          return authData;
        }

        // For real credentials, you would validate with the server here
        return null;
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

  const login = async (username, password) => {
    if (!username || !password) {
      throw new Error('Username and password are required');
    }

    // Check for demo credentials
    if (username === DEMO_CREDENTIALS.username && 
        password === DEMO_CREDENTIALS.password) {
      const userData = {
        username,
        password,
        lastLogin: new Date().toISOString()
      };

      setUser(userData);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
      return true;
    }

    throw new Error('Invalid credentials');
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