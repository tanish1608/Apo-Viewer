import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/Login.css';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login } = useAuth();

  const [loginAttempts, setLoginAttempts] = useState(() => {
    const stored = sessionStorage.getItem('loginAttempts');
    return stored ? JSON.parse(stored) : { count: 0, timestamp: null };
  });

  const from = location.state?.from?.pathname || '/';

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    if (loginAttempts.timestamp) {
      const timeElapsed = Date.now() - loginAttempts.timestamp;
      if (timeElapsed < LOCKOUT_TIME) {
        const remainingTime = Math.ceil((LOCKOUT_TIME - timeElapsed) / 1000 / 60);
        setError(`Too many login attempts. Please try again in ${remainingTime} minutes.`);
      } else {
        setLoginAttempts({ count: 0, timestamp: null });
        sessionStorage.removeItem('loginAttempts');
      }
    }
  }, [loginAttempts]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loginAttempts.timestamp) {
      const timeElapsed = Date.now() - loginAttempts.timestamp;
      if (timeElapsed < LOCKOUT_TIME) {
        return;
      }
    }

    try {
      setError('');
      setLoading(true);

      if (!username.trim() || !password.trim()) {
        throw new Error('Please enter both username and password');
      }

      await login(username, password);
      navigate(from, { replace: true });
    } catch (err) {
      const newAttempts = loginAttempts.count + 1;
      if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
        const attempts = { count: newAttempts, timestamp: Date.now() };
        setLoginAttempts(attempts);
        sessionStorage.setItem('loginAttempts', JSON.stringify(attempts));
        setError('Too many login attempts. Please try again in 15 minutes.');
      } else {
        setLoginAttempts({ count: newAttempts, timestamp: null });
        sessionStorage.setItem('loginAttempts', JSON.stringify({ count: newAttempts, timestamp: null }));
        setError(err.message || 'Failed to login. Please check your credentials.');
      }
    } finally {
      setLoading(false);
      setPassword('');
    }
  };

  const isLocked = loginAttempts.timestamp && Date.now() - loginAttempts.timestamp < LOCKOUT_TIME;

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h2 className="login-title">Datastore Viewer</h2>
          <p className="login-subtitle">Please sign in to continue</p>
        </div>

        {error && (
          <div className="login-error">
            {error}
          </div>
        )}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username" className="form-label">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value.trim())}
              className="form-input"
              placeholder="Enter your username"
              autoComplete="username"
              disabled={loading || isLocked}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              placeholder="Enter your password"
              autoComplete="current-password"
              disabled={loading || isLocked}
            />
          </div>

          <button
            type="submit"
            disabled={loading || isLocked}
            className={`login-button ${loading ? 'login-button-loading' : ''}`}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;