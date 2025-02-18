import { mockData } from './mockData';

const getApiUrl = () => {
  return localStorage.getItem('api_url') || process.env.REACT_APP_API_URL || 'http://localhost:5000';
};

const handleApiError = (error) => {
  if (error.response) {
    switch (error.response.status) {
      case 401:
        throw new Error('Invalid credentials. Please check your username and password.');
      case 403:
        throw new Error('Access denied. You do not have permission to access this resource.');
      case 404:
        throw new Error('The requested resource was not found.');
      case 429:
        throw new Error('Too many requests. Please try again later.');
      case 500:
        throw new Error('Server error. Please try again later.');
      default:
        throw new Error(`Request failed: ${error.response.statusText}`);
    }
  }
  if (error.request) {
    throw new Error('Network error. Please check your connection and try again.');
  }
  throw error;
};

export const fetchDatastoreFiles = async (datastoreIds, queryString = '') => {
  try {
    const authData = localStorage.getItem('auth_data');
    if (!authData) {
      throw new Error('Authentication required. Please log in.');
    }

    const { username, password } = JSON.parse(authData);
    const datastoreIdArray = datastoreIds.split(',').map(id => id.trim());
    
    if (username === 'admin' && password === 'admin123') {
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

    const searchParams = new URLSearchParams(queryString);
    const whereConditions = {};
    const sortByConditions = {};
    
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

    const responses = await Promise.all(
      datastoreIdArray.map(async datastoreId => {
        try {
          const params = new URLSearchParams();
          params.append('username', username);
          params.append('password', password);
          if (whereConditions[datastoreId]) {
            params.append('where', whereConditions[datastoreId]);
          }
          if (sortByConditions[datastoreId]) {
            params.append('sortBy', sortByConditions[datastoreId]);
          }

          const response = await fetch(
            `${getApiUrl()}/datastores/${encodeURIComponent(datastoreId)}/files?${params.toString()}`
          );

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();

          if (data?.element && Array.isArray(data.element)) {
            return {
              ...data,
              element: data.element.map(item => ({
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
          return { element: [] };
        }
      })
    );

    const combinedResponse = {
      element: responses.flatMap(response => response.element || []),
      hasMore: responses.some(response => response.hasMore),
      superCount: responses.reduce((sum, response) => sum + (response.superCount || 0), 0),
      type: responses[0]?.type || "undefined"
    };

    combinedResponse.element.sort((a, b) => (b.creationTime || 0) - (a.creationTime || 0));

    return combinedResponse;
  } catch (error) {
    console.error('Failed to fetch datastore files:', error);
    throw handleApiError(error);
  }
};

export const verifyCredentials = async (username, password) => {
  try {
    if (!username || !password) {
      throw new Error('Username and password are required');
    }

    if (username === 'admin' && password === 'admin123') {
      console.log('Using demo credentials - bypassing API call');
      return { success: true, data: mockData };
    }

    const response = await fetch(
      `${getApiUrl()}/datastores?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('Credentials verification failed:', error);
    throw handleApiError(error);
  }
};