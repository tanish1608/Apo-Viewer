import React from 'react';
import ErrorToast from './ErrorToast';
import '../styles/Error.css';

const ErrorContainer = ({ errors, onDismiss }) => {
  if (!errors.length) return null;

  return (
    <div className="error-container">
      {errors.map(error => (
        <ErrorToast
          key={error.id}
          error={error.message}
          onDismiss={() => onDismiss(error.id)}
        />
      ))}
    </div>
  );
};

export default ErrorContainer;