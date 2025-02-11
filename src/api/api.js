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
      if (response.status === 401) {
        // Try to refresh token on 401
        try {
          const refreshResponse = await refreshToken();
          if (refreshResponse.success) {
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
              throw new Error(`HTTP error! status: ${retryResponse.status}`);
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
      throw new Error(`HTTP error! status: ${response.status}`);
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

// Verify credentials and get tokens
export const verifyCredentials = async (username, password) => {
  console.log('Verifying credentials for username:', username);

  // Check for demo credentials
  if (isUsingDemoCredentials(username)) {
    console.log('Using demo credentials - bypassing API call');
    return { 
      success: true, 
      data: { 
        user: { id: 'demo', username: 'admin' },
        mockData 
      } 
    };
  }

  try {
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
    const response = await makeRequest(
      `${getApiUrl()}/auth/refresh`,
      { 
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionStorage.getItem('accessToken')}`
        }
      }
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
    await makeRequest(
      `${getApiUrl()}/auth/logout`,
      { method: 'POST' }
    );
    sessionStorage.removeItem('accessToken');
    return { success: true };
  } catch (error) {
    console.error('Logout failed:', error);
    return { success: false, error: error.message };
  }
};

// Fetch datastore files
export const fetchDatastoreFiles = async (datastoreIds, queryString = '') => {
  try {
    // For demo credentials, return mock data
    const authData = sessionStorage.getItem('accessToken');
    if (!authData) {
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
      `${getApiUrl()}/api/datastores/${datastoreIds}${queryString ? `?${queryString}` : ''}`
    );

    return response;
  } catch (error) {
    console.error('Failed to fetch datastore files:', error);
    throw error;
  }
};