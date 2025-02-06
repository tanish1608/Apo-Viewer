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

// Verify credentials
export const verifyCredentials = async (username, password) => {
  if (isUsingDemoCredentials(username, password)) {
    return { success: true };
  }

  try {
    const response = await makeRequest(
      `${BASE_URL}/datastores?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`
    );
    return { success: true, data: response };
  } catch (error) {
    console.error('Credentials verification failed:', error);
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
  
  if (isUsingDemoCredentials(username, password)) {
    return Object.keys(datastoreFiles).map(id => ({
      id,
      creationTime: Date.now().toString(),
      publishActionType: 'MOCK'
    }));
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

// Fetch files from a single datastore
const fetchSingleDatastore = async (datastoreId, username, password, where, sortBy) => {
  try {
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);
    if (where) params.append('where', where);
    if (sortBy) params.append('sortBy', sortBy);

    const response = await makeRequest(
      `${BASE_URL}/datastores/${encodeURIComponent(datastoreId)}/files?${params.toString()}`
    );

    // Add datastoreId to each file
    return response.files.map(file => ({
      ...file,
      datastoreId,
      processingEndDate: file.processingEndDate ? parseInt(file.processingEndDate) : 0
    }));
  } catch (error) {
    console.error(`Failed to fetch files for datastore ${datastoreId}:`, error);
    return []; // Return empty array on error to continue with other datastores
  }
};

// Fetch files from multiple datastores
export const fetchDatastoreFiles = async (datastoreIds, queryString = '') => {
  const authData = localStorage.getItem('auth_data');
  if (!authData) {
    window.location.href = '/login';
    throw new Error('No auth data found');
  }

  const { username, password } = JSON.parse(authData);
  const datastoreIdArray = datastoreIds.split(',').map(id => id.trim());
  
  // Return mock data for demo credentials
  if (isUsingDemoCredentials(username, password)) {
    console.log('Using demo credentials - returning mock files');
    const mockFiles = datastoreIdArray.flatMap(id => {
      const datastoreData = datastoreFiles[id];
      if (!datastoreData?.files) return [];
      
      return datastoreData.files.map(file => ({
        ...file,
        datastoreId: id,
        processingEndDate: file.processingEndDate ? parseInt(file.processingEndDate) : 0
      }));
    });

    return {
      files: mockFiles.sort((a, b) => b.processingEndDate - a.processingEndDate)
    };
  }

  try {
    // Parse query parameters
    const searchParams = new URLSearchParams(queryString);
    const where = searchParams.get('where');
    const sortBy = searchParams.get('sortBy');
    
    // Fetch all datastores in parallel with the same where and sortBy
    const allFiles = await Promise.all(
      datastoreIdArray.map(datastoreId => 
        fetchSingleDatastore(datastoreId, username, password, where, sortBy)
      )
    );

    // Combine and sort all files
    const combinedFiles = allFiles.flat();

    return {
      files: combinedFiles.sort((a, b) => b.processingEndDate - a.processingEndDate)
    };
  } catch (error) {
    console.error('Failed to fetch datastore files:', error);
    if (error.message.includes('401')) {
      localStorage.removeItem('auth_data');
      window.location.href = '/login';
    }
    throw error;
  }
};