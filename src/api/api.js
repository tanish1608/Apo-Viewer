// API base URL - replace with your actual API endpoint
const API_BASE_URL = 'https://your-api-endpoint.com';

// Rate Limiter Implementation
class RateLimiter {
  constructor(maxRequests = 50, timeWindow = 60000) {
    this.requests = [];
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindow;
  }

  canMakeRequest() {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.timeWindow);
    if (this.requests.length >= this.maxRequests) return false;
    this.requests.push(now);
    return true;
  }
}

const rateLimiter = new RateLimiter();

// Custom API Error
class APIError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// Secure headers
const getSecureHeaders = (authHeaders = {}) => ({
  ...authHeaders,
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-XSS-Protection': '1; mode=block',
  'Content-Type': 'application/json'
});

// Helper function to get auth headers
const getAuthHeaders = () => {
  const authData = localStorage.getItem('auth_data');
  if (!authData) return {};
  
  const { user } = JSON.parse(authData);
  return {
    'Authorization': `Bearer ${user.token}`,
  };
};

// Retry logic
const retryRequest = async (fn, retries = 3, delay = 1000) => {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0 || error.status === 401) throw error;
    await new Promise(resolve => setTimeout(resolve, delay));
    return retryRequest(fn, retries - 1, delay * 2);
  }
};

// Error handler
const handleAPIError = (error, context) => {
  if (error.status === 401) {
    localStorage.removeItem('auth_data');
    window.location.href = '/login';
    throw new APIError('Session expired. Please login again.', 401, 'AUTH_EXPIRED');
  }
  
  if (error.status === 429) {
    throw new APIError('Too many requests. Please try again later.', 429, 'RATE_LIMIT');
  }
  
  throw new APIError(`Failed to ${context}. Please try again.`, error.status || 500, 'API_ERROR');
};

// Generic request wrapper
const makeRequest = async (url, options = {}) => {
  if (!rateLimiter.canMakeRequest()) {
    throw new APIError('Too many requests. Please try again later.', 429, 'RATE_LIMIT');
  }

  const response = await fetch(url, {
    ...options,
    headers: getSecureHeaders(options.headers)
  });

  if (!response.ok) {
    throw new APIError(response.statusText, response.status, 'API_ERROR');
  }

  return response.json();
};

// Authenticate user
export const authenticateUser = async (username, password) => {
  try {
    return await retryRequest(async () => {
      const response = await makeRequest(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${username}:${password}`)}`
        }
      });
      return response;
    });
  } catch (error) {
    handleAPIError(error, 'authenticate');
  }
};

// Refresh token
export const refreshToken = async () => {
  try {
    return await makeRequest(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
  } catch (error) {
    handleAPIError(error, 'refresh token');
  }
};

// Fetch datastore IDs
export const fetchDatastoreIds = async () => {
  try {
    return await retryRequest(async () => {
      return await makeRequest(`${API_BASE_URL}/datastores`, {
        headers: getAuthHeaders()
      });
    });
  } catch (error) {
    handleAPIError(error, 'fetch datastores');
  }
};

// Fetch datastore files
export const fetchDatastoreFiles = async (datastoreId) => {
  try {
    return await retryRequest(async () => {
      return await makeRequest(
        `${API_BASE_URL}/datastores/${encodeURIComponent(datastoreId)}/files`,
        { headers: getAuthHeaders() }
      );
    });
  } catch (error) {
    handleAPIError(error, 'fetch datastore files');
  }
};