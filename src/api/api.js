import { datastoreIds, datastoreFiles } from './mockData';

// API Base URL (proxy server)
const BASE_URL = 'http://localhost:5000';

// Demo credentials
const DEMO_USERNAME = 'admin';
const DEMO_PASSWORD = 'admin123';

// Check if using demo credentials
const isUsingDemoCredentials = (username, password) => {
  return username === DEMO_USERNAME && password === DEMO_PASSWORD;
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

// Verify credentials
export const verifyCredentials = async (username, password) => {
  console.log('Verifying credentials for username:', username);

  // Check for demo credentials
  if (isUsingDemoCredentials(username, password)) {
    console.log('Using demo credentials - bypassing API call');
    return { success: true, data: datastoreIds };
  }

  try {
    const data = await makeRequest(
      `${BASE_URL}/datastores?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`
    );
    return { success: true, data };
  } catch (error) {
    console.error('Credentials verification failed:', error);
    if (error.message.includes('401')) {
      return { success: false, error: 'Invalid credentials' };
    }
    return { success: false, error: error.message };
  }
};

// Fetch datastore IDs
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
    return await makeRequest(
      `${BASE_URL}/datastores?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`
    );
  } catch (error) {
    console.error('Failed to fetch datastore IDs:', error);
    if (error.message.includes('401')) {
      localStorage.removeItem('auth_data');
      window.location.href = '/login';
    }
    throw error;
  }
};

// Fetch datastore files
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
    return await makeRequest(
      `${BASE_URL}/datastores/${encodeURIComponent(datastoreId)}/files?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`
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