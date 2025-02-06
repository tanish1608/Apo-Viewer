import { datastoreFiles } from './mockData';

// API Base URL (proxy server)
const BASE_URL = 'http://localhost:5000';

// Demo credentials
const DEMO_CREDENTIALS = {
  username: 'admin',
  password: 'admin123'
};

// Check if using demo credentials
const isUsingDemoCredentials = (username, password) => {
  return username === DEMO_CREDENTIALS.username && password === DEMO_CREDENTIALS.password;
};

// Make API request through proxy
const makeRequest = async (url, options) => {
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error('Request failed:', error);
    throw error;
  }
};

// Fetch datastore files
export const fetchDatastoreFiles = async (datastoreId, queryString = '') => {
  const authData = localStorage.getItem('auth_data');
  if (!authData) {
    window.location.href = '/login';
    throw new Error('No auth data found');
  }

  const { username, password } = JSON.parse(authData);
  
  // Return mock data for demo credentials
  if (isUsingDemoCredentials(username, password)) {
    console.log('Using demo credentials - returning mock files');
    // If the datastoreId exists in mock data, return it, otherwise return empty files array
    return datastoreFiles[datastoreId] || { datastoreId, files: [] };
  }

  try {
    // Build the URL with authentication and additional query parameters
    const params = new URLSearchParams(queryString);
    params.append('username', username);
    params.append('password', password);
    
    return await makeRequest(
      `${BASE_URL}/datastores/${encodeURIComponent(datastoreId)}/files?${params.toString()}`
    );
  } catch (error) {
    console.error('Failed to fetch datastore files:', error);
    if (error.message.includes('401')) {
      localStorage.removeItem('auth_data');
      window.location.href = '/login';
    }
    throw error;
  }
};