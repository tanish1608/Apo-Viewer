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

export const fetchDatastoreFiles = async (datastoreIds, queryString = '', page = 1, pageSize = 1000) => {
  try {
    const authData = localStorage.getItem('auth_data');
    if (!authData) {
      throw new Error('Authentication required. Please log in.');
    }

    const { username, password } = JSON.parse(authData);
    const datastoreIdArray = datastoreIds.split(',').map(id => id.trim());
    
    if (username === 'admin' && password === 'admin123') {
      console.log('Using demo credentials - returning mock files');
      
      // Generate large mock dataset for testing pagination
      if (datastoreIds.toLowerCase().includes('mock')) {
        const mockFiles = generateLargeMockDataset(10000, datastoreIdArray);
        return {
          element: mockFiles,
          hasMore: true,
          superCount: mockFiles.length,
          type: "mock"
        };
      }
      
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
        element: mockFiles.sort((a, b) => (b.creationTime || 0) - (a.creationTime || 0)),
        hasMore: false,
        superCount: mockFiles.length,
        type: "mock"
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

    // Add pagination parameters
    searchParams.append('page', page.toString());
    searchParams.append('pageSize', pageSize.toString());

    const responses = await Promise.all(
      datastoreIdArray.map(async datastoreId => {
        try {
          const params = new URLSearchParams();
          params.append('username', username);
          params.append('password', password);
          params.append('page', page.toString());
          params.append('pageSize', pageSize.toString());
          
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

          return { element: [], hasMore: false, superCount: 0 };
        } catch (error) {
          console.error(`Failed to fetch files for datastore ${datastoreId}:`, error);
          return { element: [], hasMore: false, superCount: 0 };
        }
      })
    );

    const combinedResponse = {
      element: responses.flatMap(response => response.element || []),
      hasMore: responses.some(response => response.hasMore),
      superCount: responses.reduce(( sum, response) => sum + (response.superCount || 0), 0),
      type: responses[0]?.type || "undefined"
    };

    combinedResponse.element.sort((a, b) => (b.creationTime || 0) - (a.creationTime || 0));

    return combinedResponse;
  } catch (error) {
    console.error('Failed to fetch datastore files:', error);
    throw handleApiError(error);
  }
};

// Helper function to generate large mock dataset for testing pagination
const generateLargeMockDataset = (count = 10000, datastoreIds = ['mock.datastore']) => {
  const mockFiles = [];
  const statuses = ['SUCCESS', 'FAILED', 'PROCESSING', 'WARNING'];
  const fileTypes = ['PDF_REPORT', 'EXCEL_REPORT', 'TRANSACTION_LOG', 'AUDIT_LOG', 'PAYMENT', 'BATCH_PAYMENT'];
  const directions = ['INBOUND', 'OUTBOUND', 'INTERNAL'];
  const clientNames = ['HSBC_REPORTING', 'HSBC_ANALYTICS', 'HSBC_COMPLIANCE', 'HSBC_SECURITY', 'HSBC_PAYMENTS', 'HSBC_BATCH_PAYMENTS', 'HSBC_MONITOR', 'HSBC_ACCESS'];
  
  for (let i = 0; i < count; i++) {
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 30));
    const datastoreId = datastoreIds[Math.floor(Math.random() * datastoreIds.length)];
    
    mockFiles.push({
      fileId: `FILE${i.toString().padStart(6, '0')}`,
      fileName: `TestFile_${i.toString().padStart(6, '0')}.${Math.random() > 0.5 ? 'pdf' : 'xlsx'}`,
      fileType: fileTypes[Math.floor(Math.random() * fileTypes.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      clientName: clientNames[Math.floor(Math.random() * clientNames.length)],
      direction: directions[Math.floor(Math.random() * directions.length)],
      processingEndDate: date.getTime().toString(),
      datastoreId: datastoreId,
      creationTime: date.getTime(),
      pageCount: Math.floor(Math.random() * 100),
      dataPoints: Math.floor(Math.random() * 10000),
      reportType: Math.random() > 0.5 ? 'DAILY' : (Math.random() > 0.5 ? 'WEEKLY' : 'MONTHLY'),
      department: Math.random() > 0.5 ? 'FINANCE' : (Math.random() > 0.5 ? 'OPERATIONS' : 'COMPLIANCE')
    });
  }
  
  return mockFiles;
};

// Function to fetch paginated data
export const fetchPaginatedData = async (datastoreIds, queryString = '', page = 1, pageSize = 1000) => {
  return fetchDatastoreFiles(datastoreIds, queryString, page, pageSize);
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