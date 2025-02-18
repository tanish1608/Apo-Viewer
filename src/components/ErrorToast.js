import React, { useState, useEffect } from 'react';
import '../styles/Error.css';

const ERROR_TIMEOUT = 5000; // 5 seconds

const ErrorToast = ({ error, onDismiss }) => {
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setRemoving(true);
        setTimeout(() => {
          onDismiss();
        }, 300); // Match animation duration
      }, ERROR_TIMEOUT);

      return () => clearTimeout(timer);
    }
  }, [error, onDismiss]);

  if (!error) return null;

  return (
    <div className={`error-toast ${removing ? 'removing' : ''}`}>
      <div className="error-content">
        <i className="fas fa-exclamation-circle error-icon"></i>
        <div className="error-message-content">
          <h3 className="error-title">Error</h3>
          <p className="error-text">{error}</p>
        </div>
      </div>
      <button className="error-dismiss" onClick={() => setRemoving(true)}>
        <i className="fas fa-times"></i>
      </button>
    </div>
  );
};

export default ErrorToast;