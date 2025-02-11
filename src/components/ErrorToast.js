import React, { useState, useEffect, useCallback } from 'react';
import '../styles/Error.css';

const ERROR_TIMEOUT = 5000; // 5 seconds

const ErrorToast = ({ error, onDismiss, timeout = ERROR_TIMEOUT }) => {
  const [removing, setRemoving] = useState(false);

  const dismiss = useCallback(() => {
    setRemoving(true);
    setTimeout(() => {
      onDismiss();
    }, 300); // Match animation duration
  }, [onDismiss]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(dismiss, timeout);
      return () => clearTimeout(timer);
    }
  }, [error, timeout, dismiss]);

  if (!error) return null;

  return (
    <div className={`error-message ${removing ? 'removing' : ''}`}>
      <div className="error-content">
        <h3 className="error-title">Error</h3>
        <p className="error-text">{error}</p>
      </div>
      <button className="error-dismiss" onClick={dismiss}>
        <i className="fas fa-times"></i>
      </button>
    </div>
  );
};

export default ErrorToast