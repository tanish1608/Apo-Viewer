import { datastoreIds, datastoreFiles } from './mockData';

// API Base URL
const BASE_URL = 'https://mt-conn-core-api-dev.hk.hsbc:14100/api/sil/element-dna';

// Demo credentials
const DEMO_USERNAME = 'admin';
const DEMO_PASSWORD = 'admin123';

// Helper function to get auth headers
const getAuthHeaders = (username, password) => {
  if (username && password) {
    const base64Credentials = btoa(unescape(encodeURIComponent(`${username}:${password}`))); // Fix special character issues
    return {
      'Authorization': `Basic ${base64Credentials}`,
      'Accept': '*/*',
      'User-Agent': 'datastore-viewer/1.0'
    };
  }
  
  const authData = localStorage.getItem('auth_data');
  if (!authData) return {};
  
  const { username: storedUsername, password: storedPassword } = JSON.parse(authData);
  const base64Credentials = btoa(unescape(encodeURIComponent(`${storedUsername}:${storedPassword}`)));
  return {
    'Authorization': `Basic ${base64Credentials}`,
    'Accept': '*/*',
    'User-Agent': 'datastore-viewer/1.0'
  };
};

// Check if using demo credentials
const isUsingDemoCredentials = (username, password) => {
  return username === DEMO_USERNAME && password === DEMO_PASSWORD;
};

// Make API request with CORS handling
const makeRequest = async (url, options = {}) => {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Accept': '*/*',
        'User-Agent': 'datastore-viewer/1.0'
      },
      credentials: 'include' // Ensures authentication is sent in cross-origin requests
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }
    return response.text();
  } catch (error) {
    console.error('Request failed:', error);
    throw error;
  }
};

// Verify credentials with CORS handling
export const verifyCredentials = async (username, password) => {
  console.log('Verifying credentials for username:', username);

  // Check for demo credentials
  if (isUsingDemoCredentials(username, password)) {
    console.log('Using demo credentials - bypassing API call');
    return { success: true, data: datastoreIds };
  }

  try {
    const options = {
      method: 'GET',
      headers: getAuthHeaders(username, password),
      credentials: 'include' // Ensure cookies/auth headers are sent
    };

    const data = await makeRequest(`${BASE_URL}/datastores`, options);
    return { success: true, data };
  } catch (error) {
    console.error('Credentials verification failed:', error);
    if (error.message.includes('401')) {
      return { success: false, error: 'Invalid credentials' };
    }
    return { success: false, error: error.message };
  }
};

// Fetch datastore IDs with CORS handling
export const fetchDatastoreIds = async () => {
  const authData = localStorage.getItem('auth_data');
  if (!authData) {
    window.location.href = '/login';
    throw new Error('No auth data found');
  }

  const { username, password } = JSON.parse(authData);
  
  // Return mock data for demo credentials
  if (isUsingDemoCredentials(username, password)) {
    console.log('Using demo credentials - returning mock datastores');
    return datastoreIds;
  }

  try {
    const options = {
      method: 'GET',
      headers: getAuthHeaders(username, password),
      credentials: 'include' // Required for CORS authentication
    };

    return await makeRequest(`${BASE_URL}/datastores`, options);
  } catch (error) {
    console.error('Failed to fetch datastore IDs:', error);
    if (error.message.includes('401')) {
      localStorage.removeItem('auth_data');
      window.location.href = '/login';
    }
    throw error;
  }
};

// Fetch datastore files with CORS handling
export const fetchDatastoreFiles = async (datastoreId) => {
  const authData = localStorage.getItem('auth_data');
  if (!authData) {
    window.location.href = '/login';
    throw new Error('No auth data found');
  }

  const { username, password } = JSON.parse(authData);
  
  // Return mock data for demo credentials
  if (isUsingDemoCredentials(username, password)) {
    console.log('Using demo credentials - returning mock files');
    return datastoreFiles[datastoreId] || { datastoreId, files: [] };
  }

  try {
    const options = {
      method: 'GET',
      headers: getAuthHeaders(username, password),
      credentials: 'include'
    };

    return await makeRequest(
      `${BASE_URL}/datastores/${encodeURIComponent(datastoreId)}/files`, 
      options
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