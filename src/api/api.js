import { mockData } from './mockData';

// Get API URL from localStorage or fallback to environment variable
const getApiUrl = () => {
  return localStorage.getItem('api_url') || process.env.REACT_APP_API_URL || 'http://localhost:5000';
};

// Make API request through proxy
const makeRequest = async (url, options = {}) => {
  try {
    // Get access token from session storage
    const accessToken = sessionStorage.getItem('accessToken');
    
    // Always include credentials for cookie handling
    const defaultOptions = {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
      }
    };

    const response = await fetch(url, { ...defaultOptions, ...options });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      
      if (response.status === 401) {
        // Try to refresh token on 401
        try {
          const refreshResponse = await refreshToken();
          if (refreshResponse.success) {
            // Store the new token
            sessionStorage.setItem('accessToken', refreshResponse.data.accessToken);
            
            // Retry original request with new token
            const retryResponse = await fetch(url, {
              ...defaultOptions,
              ...options,
              headers: {
                ...defaultOptions.headers,
                'Authorization': `Bearer ${refreshResponse.data.accessToken}`
              }
            });
            
            if (!retryResponse.ok) {
              const retryErrorData = await retryResponse.json().catch(() => ({ error: 'Request failed after token refresh' }));
              throw new Error(retryErrorData.error || `HTTP error! status: ${retryResponse.status}`);
            }
            
            return retryResponse.json();
          }
        } catch (refreshError) {
          // If refresh fails, clear auth and redirect to login
          sessionStorage.removeItem('accessToken');
          window.location.href = '/login';
          throw new Error('Session expired. Please log in again.');
        }
      }
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error('Request failed:', error);
    throw error;
  }
};

// Check if using demo credentials
const isUsingDemoCredentials = (username) => {
  return username === 'admin';
};

// Export the fetchDatastoreFiles function
export const fetchDatastoreFiles = async (datastoreIds, queryString = '') => {
  try {
    // For demo credentials, return mock data
    const accessToken = sessionStorage.getItem('accessToken');
    if (!accessToken) {
      window.location.href = '/login';
      throw new Error('No auth data found');
    }

    const datastoreIdArray = datastoreIds.split(',').map(id => id.trim());
    
    // Return mock data for demo credentials
    if (isUsingDemoCredentials('admin')) {
      console.log('Using demo credentials - returning mock files');
      const mockFiles = datastoreIdArray.flatMap(id => {
        const datastoreData = mockData[id];
        if (!datastoreData?.files) return [];
        
        return datastoreData.files.map(file => ({
          ...file,
          datastoreId: id,
          creationTime: file.creationTime ? parseInt(file.creationTime) : null,
          expirationTime: file.expirationTime === -1 ? null : parseInt(file.expirationTime)
        }));
      });

      return {
        element: mockFiles.sort((a, b) => (b.creationTime || 0) - (a.creationTime || 0))
      };
    }

    // Make API request for real data
    const response = await makeRequest(
      `${getApiUrl()}/api/datastores/${datastoreIds}${queryString ? `?${queryString}` : ''}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    return response;
  } catch (error) {
    console.error('Failed to fetch datastore files:', error);
    throw error;
  }
};

// Verify credentials and get tokens
export const verifyCredentials = async (username, password) => {
  try {
    // Check for demo credentials
    if (isUsingDemoCredentials(username)) {
      console.log('Using demo credentials - bypassing API call');
      const demoToken = 'demo-token';
      sessionStorage.setItem('accessToken', demoToken);
      return { 
        success: true, 
        data: { 
          user: { username: 'admin' },
          accessToken: demoToken,
          mockData 
        } 
      };
    }

    const response = await makeRequest(
      `${getApiUrl()}/auth/login`,
      {
        method: 'POST',
        body: JSON.stringify({ username, password })
      }
    );

    if (response.accessToken) {
      sessionStorage.setItem('accessToken', response.accessToken);
    }

    return { success: true, data: response };
  } catch (error) {
    console.error('Credentials verification failed:', error);
    if (error.message.includes('401')) {
      return { success: false, error: 'Invalid credentials' };
    }
    return { success: false, error: error.message };
  }
};

// Refresh access token
export const refreshToken = async () => {
  try {
    // For demo credentials, return mock success
    if (isUsingDemoCredentials('admin')) {
      const demoToken = 'demo-token';
      sessionStorage.setItem('accessToken', demoToken);
      return { 
        success: true, 
        data: { 
          accessToken: demoToken 
        } 
      };
    }

    const response = await makeRequest(
      `${getApiUrl()}/auth/refresh`,
      { method: 'POST' }
    );

    if (response.accessToken) {
      sessionStorage.setItem('accessToken', response.accessToken);
    }

    return { success: true, data: response };
  } catch (error) {
    console.error('Token refresh failed:', error);
    return { success: false, error: error.message };
  }
};

// Logout and clear session
export const logout = async () => {
  try {
    // For demo credentials, just clear session
    if (isUsingDemoCredentials('admin')) {
      sessionStorage.removeItem('accessToken');
      return { success: true };
    }

    await makeRequest(
      `${getApiUrl()}/auth/logout`,
      { method: 'POST' }
    );
    sessionStorage.removeItem('accessToken');
    return { success: true };
  } catch (error) {
    console.error('Logout failed:', error);
    // Still clear session even if API call fails
    sessionStorage.removeItem('accessToken');
    return { success: false, error: error.message };
  }
};