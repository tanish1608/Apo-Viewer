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
export const fetchDatastoreFiles = async (datastoreIds, queryString = '') => {
  const authData = localStorage.getItem('auth_data');
  if (!authData) {
    window.location.href = '/login';
    throw new Error('No auth data found');
  }

  const { username, password } = JSON.parse(authData);
  
  // Split the datastoreIds string into an array
  const datastoreIdArray = datastoreIds.split(',').map(id => id.trim());
  
  // Return mock data for demo credentials
  if (isUsingDemoCredentials(username, password)) {
    console.log('Using demo credentials - returning mock files');
    // Combine files from all requested datastores
    const combinedFiles = datastoreIdArray.reduce((acc, id) => {
      const datastoreData = datastoreFiles[id];
      if (datastoreData && datastoreData.files) {
        // Add a datastoreId field to each file
        const filesWithSource = datastoreData.files.map(file => ({
          ...file,
          datastoreId: id
        }));
        acc.push(...filesWithSource);
      }
      return acc;
    }, []);

    // Sort combined files by processingEndDate
    return {
      files: combinedFiles.sort((a, b) => {
        const dateA = a.processingEndDate ? parseInt(a.processingEndDate) : 0;
        const dateB = b.processingEndDate ? parseInt(b.processingEndDate) : 0;
        return dateB - dateA;
      })
    };
  }

  try {
    // Parse the query string to get individual datastore parameters
    const searchParams = new URLSearchParams(queryString);
    
    // Fetch files from each datastore with its specific parameters
    const responses = await Promise.all(
      datastoreIdArray.map(id => {
        const params = new URLSearchParams();
        params.append('username', username);
        params.append('password', password);
        
        // Add datastore-specific parameters
        const where = searchParams.get(`where_${id}`);
        const sortBy = searchParams.get(`sortBy_${id}`);
        if (where) params.append('where', where);
        if (sortBy) params.append('sortBy', sortBy);
        
        return makeRequest(
          `${BASE_URL}/datastores/${encodeURIComponent(id)}/files?${params.toString()}`
        );
      })
    );

    // Combine all files and add datastoreId to each file
    const combinedFiles = responses.flatMap((response, index) => {
      if (response.files) {
        return response.files.map(file => ({
          ...file,
          datastoreId: datastoreIdArray[index]
        }));
      }
      return [];
    });

    // Sort combined files by processingEndDate
    return {
      files: combinedFiles.sort((a, b) => {
        const dateA = a.processingEndDate ? parseInt(a.processingEndDate) : 0;
        const dateB = b.processingEndDate ? parseInt(b.processingEndDate) : 0;
        return dateB - dateA;
      })
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