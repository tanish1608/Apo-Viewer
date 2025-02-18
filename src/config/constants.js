// Import environment variables
const config = {
  // API Configuration
  API_URL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  API_TIMEOUT: parseInt(process.env.REACT_APP_API_TIMEOUT || '30000', 10),

  // Authentication
  AUTH_TOKEN_KEY: process.env.REACT_APP_AUTH_TOKEN_KEY || 'datastore_auth_token',
  SESSION_DURATION: parseInt(process.env.REACT_APP_SESSION_DURATION || '28800000', 10), // 8 hours
  REFRESH_INTERVAL: parseInt(process.env.REACT_APP_REFRESH_INTERVAL || '840000', 10), // 14 minutes
  MAX_LOGIN_ATTEMPTS: parseInt(process.env.REACT_APP_MAX_LOGIN_ATTEMPTS || '5', 10),
  LOCKOUT_DURATION: parseInt(process.env.REACT_APP_LOCKOUT_DURATION || '900000', 10), // 15 minutes

  // Environment URLs
  ENV_CONFIGS: {
    env1: process.env.REACT_APP_ENV1_URL || 'https://api-env1.example.com',
    env2: process.env.REACT_APP_ENV2_URL || 'https://api-env2.example.com',
    env3: process.env.REACT_APP_ENV3_URL || 'https://api-env3.example.com',
  },

  // File Export Settings
  EXPORT_BATCH_SIZE: parseInt(process.env.REACT_APP_EXPORT_BATCH_SIZE || '1000', 10),
  MAX_EXPORT_ROWS: parseInt(process.env.REACT_APP_MAX_EXPORT_ROWS || '50000', 10),

  // Pagination
  ITEMS_PER_PAGE: parseInt(process.env.REACT_APP_ITEMS_PER_PAGE || '50', 10),
  MAX_PAGES_SHOWN: parseInt(process.env.REACT_APP_MAX_PAGES_SHOWN || '5', 10),

  // Search and Filter
  SEARCH_DEBOUNCE_MS: parseInt(process.env.REACT_APP_SEARCH_DEBOUNCE_MS || '300', 10),
  MIN_SEARCH_CHARS: parseInt(process.env.REACT_APP_MIN_SEARCH_CHARS || '2', 10),

  // Error Handling
  ERROR_DISPLAY_DURATION: parseInt(process.env.REACT_APP_ERROR_DISPLAY_DURATION || '5000', 10),
  MAX_ERROR_RETRIES: parseInt(process.env.REACT_APP_MAX_ERROR_RETRIES || '3', 10),
};

export default config;