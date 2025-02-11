import { mockData } from './mockData';

// Get API URL from localStorage or fallback to environment variable
const getApiUrl = () => {
  return localStorage.getItem('api_url') || process.env.REACT_APP_API_URL || 'http://localhost:5000';
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

// Check if using demo credentials
const isUsingDemoCredentials = (username, password) => {
  return username === 'admin' && password === 'admin123';
};

// Fetch files from a single datastore
const fetchSingleDatastore = async (datastoreId, username, password, where, sortBy) => {
  try {
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);
    if (where && where[datastoreId]) {
      params.append('where', where[datastoreId]);
    }
    if (sortBy && sortBy[datastoreId]) {
      params.append('sortBy', sortBy[datastoreId]);
    }

    const response = await makeRequest(
      `${getApiUrl()}/datastores/${encodeURIComponent(datastoreId)}/files?${params.toString()}`
    );

    // Add datastoreId to each element in the array
    if (response?.element && Array.isArray(response.element)) {
      return {
        ...response,
        element: response.element.map(item => ({
          ...item,
          datastoreId,
          creationTime: item.creationTime ? parseInt(item.creationTime) : null,
          expirationTime: item.expirationTime === -1 ? null : parseInt(item.expirationTime)
        }))
      };
    }

    return { element: [] };
  } catch (error) {
    console.error(`Failed to fetch files for datastore ${datastoreId}:`, error);
    return { element: [] }; // Return empty array on error to continue with other datastores
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

  try {
    // Parse query parameters into a map of datastore-specific conditions
    const searchParams = new URLSearchParams(queryString);
    const whereConditions = {};
    const sortByConditions = {};
    
    // Get all where and sortBy parameters
    searchParams.getAll('where').forEach((where, index) => {
      if (index < datastoreIdArray.length) {
        whereConditions[datastoreIdArray[index]] = where;
      }
    });
    
    searchParams.getAll('sortBy').forEach((sortBy, index) => {
      if (index < datastoreIdArray.length) {
        sortByConditions[datastoreIdArray[index]] = sortBy;
      }
    });
    
    // Fetch all datastores in parallel with their specific conditions
    const responses = await Promise.all(
      datastoreIdArray.map(datastoreId => 
        fetchSingleDatastore(
          datastoreId,
          username,
          password,
          whereConditions,
          sortByConditions
        )
      )
    );

    // Combine all responses
    const combinedResponse = {
      element: responses.flatMap(response => response.element || []),
      hasMore: responses.some(response => response.hasMore),
      superCount: responses.reduce((sum, response) => sum + (response.superCount || 0), 0),
      type: responses[0]?.type || "undefined"
    };

    // Sort combined results by creationTime
    combinedResponse.element.sort((a, b) => (b.creationTime || 0) - (a.creationTime || 0));

    return combinedResponse;
  } catch (error) {
    console.error('Failed to fetch datastore files:', error);
    if (error.message.includes('401')) {
      localStorage.removeItem('auth_data');
      window.location.href = '/login';
    }
    throw error;
  }
};

// Verify credentials
export const verifyCredentials = async (username, password) => {
  console.log('Verifying credentials for username:', username);

  // Check for demo credentials
  if (isUsingDemoCredentials(username, password)) {
    console.log('Using demo credentials - bypassing API call');
    return { success: true, data: mockData };
  }

  try {
    const data = await makeRequest(
      `${getApiUrl()}/datastores?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`
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


