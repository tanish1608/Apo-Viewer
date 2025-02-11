import React from 'react';
import '../styles/Error.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-container">
          <div className="error-message">
            <div className="error-content">
              <h3 className="error-title">Application Error</h3>
              <p className="error-text">
                Something went wrong. Please try refreshing the page.
              </p>
            </div>
            <button
              className="error-dismiss"
              onClick={() => window.location.reload()}
            >
              <i className="fas fa-redo"></i>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary