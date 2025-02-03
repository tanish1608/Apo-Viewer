// Rate Limiter Implementation
const API_BASE_URL = 'https://your-api-endpoint.com';

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

// Helper function to get auth headers
const getAuthHeaders = (username, password) => {
  if (username && password) {
    const headers = {
      'Authorization': `Basic ${btoa(`${username}:${password}`)}`,
      'Content-Type': 'application/json'
    };
    console.log('Generated headers:', headers);
    return headers;
  }
  
  const authData = localStorage.getItem('auth_data');
  if (!authData) {
    console.log('No stored auth data found');
    return {};
  }
  
  const { username: storedUsername, password: storedPassword } = JSON.parse(authData);
  const headers = {
    'Authorization': `Basic ${btoa(`${storedUsername}:${storedPassword}`)}`,
    'Content-Type': 'application/json'
  };
  console.log('Using stored credentials headers:', headers);
  return headers;
};

// Generic request wrapper
const makeRequest = async (url, options = {}) => {
  console.log(`Making request to ${url}`, {
    ...options,
    headers: options.headers
  });

  if (!rateLimiter.canMakeRequest()) {
    throw new APIError('Too many requests. Please try again later.', 429, 'RATE_LIMIT');
  }

  try {
    const response = await fetch(url, {
      ...options,
      mode: 'cors',
      credentials: 'include',
      headers: options.headers
    });

    console.log('Raw response:', response);
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries([...response.headers]));

    if (!response.ok) {
      console.error('Request failed:', {
        status: response.status,
        statusText: response.statusText
      });
      throw new APIError(response.statusText, response.status, 'API_ERROR');
    }

    const data = await response.json();
    console.log('Response data:', data);
    return data;
  } catch (error) {
    console.error('Request error:', error);
    throw error;
  }
};

// Verify credentials by attempting to fetch datastores
export const verifyCredentials = async (username, password) => {
  console.log('Verifying credentials for username:', username);
  try {
    const response = await makeRequest(`${API_BASE_URL}/datastores`, {
      headers: getAuthHeaders(username, password)
    });
    console.log('Credentials verification successful:', response);
    return { success: true, data: response };
  } catch (error) {
    console.error('Credentials verification failed:', error);
    if (error.status === 401) {
      return { success: false, error: 'Invalid credentials' };
    }
    throw error;
  }
};

// Fetch datastore IDs
export const fetchDatastoreIds = async () => {
  console.log('Fetching datastore IDs');
  try {
    const response = await makeRequest('/datastores', {
      headers: getAuthHeaders()
    });
    console.log('Fetched datastore IDs:', response);
    return response;
  } catch (error) {
    console.error('Failed to fetch datastore IDs:', error);
    if (error.status === 401) {
      localStorage.removeItem('auth_data');
      window.location.href = '/login';
    }
    throw error;
  }
};

// Fetch datastore files
export const fetchDatastoreFiles = async (datastoreId) => {
  console.log('Fetching files for datastore:', datastoreId);
  try {
    const response = await makeRequest(
      `/datastores/${encodeURIComponent(datastoreId)}/files`,
      { headers: getAuthHeaders() }
    );
    console.log('Fetched datastore files:', response);
    return response;
  } catch (error) {
    console.error('Failed to fetch datastore files:', error);
    if (error.status === 401) {
      localStorage.removeItem('auth_data');
      window.location.href = '/login';
    }
    throw error;
  }
};







// // Custom API Error
// class APIError extends Error {
//   constructor(message, status, code) {
//     super(message);
//     this.status = status;
//     this.code = code;
//   }
// }

// // Helper function to get auth headers
// const getAuthHeaders = (username, password) => {
//   if (username && password) {
//     const base64Credentials = btoa(`${username}:${password}`);
//     console.log('Base64 credentials:', base64Credentials);
//     return {
//       'Authorization': `Basic ${base64Credentials}`,
//       'Accept': 'application/json'
//     };
//   }
  
//   const authData = localStorage.getItem('auth_data');
//   if (!authData) {
//     console.log('No stored auth data found');
//     return {};
//   }
  
//   const { username: storedUsername, password: storedPassword } = JSON.parse(authData);
//   const base64Credentials = btoa(`${storedUsername}:${storedPassword}`);
//   console.log('Using stored credentials base64:', base64Credentials);
//   return {
//     'Authorization': `Basic ${base64Credentials}`,
//     'Accept': 'application/json'
//   };
// };

// // Generic request wrapper
// const makeRequest = async (url, options = {}) => {
//   console.log(`Making request to ${url}`, {
//     ...options,
//     headers: options.headers
//   });

//   try {
//     // Remove Content-Type for GET requests to avoid CORS preflight
//     const headers = options.headers;
//     if (options.method === 'GET' || !options.method) {
//       delete headers['Content-Type'];
//     }

//     const response = await fetch(url, {
//       ...options,
//       headers,
//     });

//     console.log('Raw response:', response);
//     console.log('Response status:', response.status);
//     console.log('Response headers:', Object.fromEntries([...response.headers]));

//     if (!response.ok) {
//       console.error('Request failed:', {
//         status: response.status,
//         statusText: response.statusText
//       });
//       throw new APIError(response.statusText, response.status, 'API_ERROR');
//     }

//     const data = await response.json();
//     console.log('Response data:', data);
//     return data;
//   } catch (error) {
//     console.error('Request error:', error);
//     throw error;
//   }
// };

// // Verify credentials by attempting to fetch datastores
// export const verifyCredentials = async (username, password) => {
//   console.log('Verifying credentials for username:', username);
//   try {
//     const response = await makeRequest('/datastores', {
//       method: 'GET',
//       headers: getAuthHeaders(username, password)
//     });
//     console.log('Credentials verification successful:', response);
//     return { success: true, data: response };
//   } catch (error) {
//     console.error('Credentials verification failed:', error);
//     if (error.status === 401) {
//       return { success: false, error: 'Invalid credentials' };
//     }
//     throw error;
//   }
// };

// // Fetch datastore IDs
// export const fetchDatastoreIds = async () => {
//   console.log('Fetching datastore IDs');
//   try {
//     const response = await makeRequest('/datastores', {
//       method: 'GET',
//       headers: getAuthHeaders()
//     });
//     console.log('Fetched datastore IDs:', response);
//     return response;
//   } catch (error) {
//     console.error('Failed to fetch datastore IDs:', error);
//     if (error.status === 401) {
//       localStorage.removeItem('auth_data');
//       window.location.href = '/login';
//     }
//     throw error;
//   }
// };

// // Fetch datastore files
// export const fetchDatastoreFiles = async (datastoreId) => {
//   console.log('Fetching files for datastore:', datastoreId);
//   try {
//     const response = await makeRequest(
//       `/datastores/${encodeURIComponent(datastoreId)}/files`,
//       { 
//         method: 'GET',
//         headers: getAuthHeaders() 
//       }
//     );
//     console.log('Fetched datastore files:', response);
//     return response;
//   } catch (error) {
//     console.error('Failed to fetch datastore files:', error);
//     if (error.status === 401) {
//       localStorage.removeItem('auth_data');
//       window.location.href = '/login';
//     }
//     throw error;
//   }
// };









//Code version 2
// import { datastoreIds, datastoreFiles } from './mockData';

// // API Base URL
// const BASE_URL = 'http://your-api-base-url.com'; // Replace with your actual API URL

// // Demo credentials
// Demo credentials
// const DEMO_USERNAME = 'admin';
// const DEMO_PASSWORD = 'admin123';

// // Helper function to get auth headers
// const getAuthHeaders = (username, password) => {
//   if (username && password) {
//     const base64Credentials = btoa(`${username}:${password}`);
//     console.log('Base64 credentials:', base64Credentials);
//     return {
//       'Authorization': `Basic ${base64Credentials}`,
//       'Content-Type': 'application/json',
//       'Accept': 'application/json'
//     };
//   }
  
//   const authData = localStorage.getItem('auth_data');
//   if (!authData) return {};
  
//   const { username: storedUsername, password: storedPassword } = JSON.parse(authData);
//   const base64Credentials = btoa(`${storedUsername}:${storedPassword}`);
//   console.log('Using stored credentials base64:', base64Credentials);
//   return {
//     'Authorization': `Basic ${base64Credentials}`,
//     'Content-Type': 'application/json',
//     'Accept': 'application/json'
//   };
// };

// // Check if using demo credentials
// const isUsingDemoCredentials = (username, password) => {
//   return username === DEMO_USERNAME && password === DEMO_PASSWORD;
// };

// // Verify credentials
// export const verifyCredentials = async (username, password) => {
//   console.log('Verifying credentials for username:', username);

//   // Check for demo credentials
//   if (isUsingDemoCredentials(username, password)) {
//     console.log('Using demo credentials - bypassing API call');
//     return { success: true, data: datastoreIds };
//   }

//   try {
//     const response = await fetch(`${BASE_URL}/datastores`, {
//       method: 'GET',
//       headers: getAuthHeaders(username, password),
//       mode: 'cors',
//       credentials: 'include'
//     });
    
//     console.log('Response status:', response.status);
//     console.log('Response headers:', Object.fromEntries([...response.headers]));

//     if (response.status === 401) {
//       return { success: false, error: 'Invalid credentials' };
//     }

//     const data = await response.json();
//     console.log('Response data:', data);
//     return { success: true, data };
//   } catch (error) {
//     console.error('Credentials verification failed:', error);
//     return { success: false, error: error.message };
//   }
// };

// // Fetch datastore IDs
// export const fetchDatastoreIds = async () => {
//   const authData = localStorage.getItem('auth_data');
//   if (!authData) {
//     window.location.href = '/login';
//     throw new Error('No auth data found');
//   }

//   const { username, password } = JSON.parse(authData);
  
//   // Return mock data for demo credentials
//   if (isUsingDemoCredentials(username, password)) {
//     console.log('Using demo credentials - returning mock datastores');
//     return datastoreIds;
//   }

//   try {
//     const response = await fetch(`${BASE_URL}/datastores`, {
//       method: 'GET',
//       headers: getAuthHeaders(),
//       mode: 'cors',
//       credentials: 'include'
//     });

//     if (response.status === 401) {
//       localStorage.removeItem('auth_data');
//       window.location.href = '/login';
//       throw new Error('Unauthorized');
//     }

//     return await response.json();
//   } catch (error) {
//     console.error('Failed to fetch datastore IDs:', error);
//     throw error;
//   }
// };

// // Fetch datastore files
// export const fetchDatastoreFiles = async (datastoreId) => {
//   const authData = localStorage.getItem('auth_data');
//   if (!authData) {
//     window.location.href = '/login';
//     throw new Error('No auth data found');
//   }

//   const { username, password } = JSON.parse(authData);
  
//   // Return mock data for demo credentials
//   if (isUsingDemoCredentials(username, password)) {
//     console.log('Using demo credentials - returning mock files');
//     return datastoreFiles[datastoreId] || { datastoreId, files: [] };
//   }

//   try {
//     const response = await fetch(`${BASE_URL}/datastores/${encodeURIComponent(datastoreId)}/files`, {
//       method: 'GET',
//       headers: getAuthHeaders(),
//       mode: 'cors',
//       credentials: 'include'
//     });

//     if (response.status === 401) {
//       localStorage.removeItem('auth_data');
//       window.location.href = '/login';
//       throw new Error('Unauthorized');
//     }

//     return await response.json();
//   } catch (error) {
//     console.error('Failed to fetch datastore files:', error);
//     throw error;
//   }
// };