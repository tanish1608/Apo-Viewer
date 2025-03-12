const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const https = require('https');
const CryptoJS = require('crypto-js');

const app = express();
const PORT = 5000;

// API Base URL
const BASE_URL = 'https://mt-conn-core-api-dev.hk.hsbc:14100/api/sil/element-dna';

// Create an agent that allows self-signed SSL certificates
const agent = new https.Agent({
  rejectUnauthorized: false
});

// Middleware to parse JSON
app.use(express.json());

// Enable CORS for frontend testing
app.use(cors());

// Function to validate Base64 string
const isValidBase64 = (str) => {
  try {
    return btoa(atob(str)) === str;
  } catch (err) {
    return false;
  }
};

// Function to safely decode Base64
const safeBase64Decode = (str) => {
  try {
    return atob(str);
  } catch (err) {
    console.error('Base64 decode error:', err);
    return null;
  }
};

// Function to generate Basic Auth header
const getAuthHeaders = (username, password) => {
  try {
    if (!username || !password) {
      throw new Error('Username and password are required');
    }

    // Validate input strings
    if (typeof username !== 'string' || typeof password !== 'string') {
      throw new Error('Username and password must be strings');
    }

    // Check for invalid characters
    const invalidChars = /[\x00-\x1F\x7F-\x9F]/;
    if (invalidChars.test(username) || invalidChars.test(password)) {
      throw new Error('Invalid characters in credentials');
    }

    const authString = `${username}:${password}`;
    const base64Auth = Buffer.from(authString).toString('base64');

    return {
      'Authorization': `Basic ${base64Auth}`,
      'Accept': '*/*',
      'User-Agent': 'datastore-viewer/1.0'
    };
  } catch (error) {
    console.error('Error generating auth headers:', error);
    throw error;
  }
};

// Function to process chunked responses
const processChunkedResponse = async (response) => {
  try {
    const buffer = await response.arrayBuffer();
    const rawdata = Buffer.from(buffer);
    return rawdata.toString('utf8');
  } catch (error) {
    console.error('Error processing chunked response:', error);
    throw new Error('Failed to process response data');
  }
};

// verify the auth data
app.get('/auth', async (req, res) => {
  const { username, password } = req.query;
  
  try {
    if (!username || !password) {
      return res.status(401).json({
        status: "UNAUTHORIZED",
        name: "AUTHENTICATION_FAILED",
        message: [
          `Unauthenticated access is not allowed. client-IP=${req.ip}`
        ],
        statusText: "Unauthorized",
        statusCode: 401
      });
    }

    const apiUrl = `${BASE_URL}/auth`;
    const headers = getAuthHeaders(username, password);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers,
      agent
    });

    const data = await response.json();

    // Check if the API response indicates unauthorized access
    if (response.status === 401 || data.status === "UNAUTHORIZED" || data.name === "AUTHENTICATION_FAILED") {
      return res.status(401).json({
        status: "UNAUTHORIZED",
        name: "AUTHENTICATION_FAILED",
        message: [
          data.message?.[0] || `Unauthenticated access is not allowed. client-IP=${req.ip}`
        ],
        statusText: "Unauthorized",
        statusCode: 401
      });
    }

    // If no unauthorized status, proceed with successful authentication
    res.json(data);
  } catch (error) {
    console.error('Error in auth endpoint:', error);
    res.status(500).json({
      status: "ERROR",
      name: "INTERNAL_SERVER_ERROR",
      message: ["Failed to authenticate user"],
      statusText: "Internal Server Error",
      statusCode: 500,
      error: error.message
    });
  }
});

// Update the datastore files endpoint to handle where, sortBy, fromRows and rows parameters
app.get('/datastores/:id/files', async (req, res) => {
  const { username, password, where, sortBy, fromRows = '0', rows = '1000' } = req.query;
  const { id } = req.params;

  try {
    if (!username || !password) {
      return res.status(401).json({
        status: "UNAUTHORIZED",
        name: "AUTHENTICATION_FAILED",
        message: [
          `Unauthenticated access is not allowed. client-IP=${req.ip}`
        ],
        statusText: "Unauthorized",
        statusCode: 401
      });
    }

    // Build the query string for the API
    const queryParams = new URLSearchParams();
    if (where) queryParams.append('where', where);
    if (sortBy) queryParams.append('sortBy', sortBy);
    queryParams.append('fromRows', fromRows);
    queryParams.append('rows', rows);
    
    const apiUrl = `${BASE_URL}/datastores/${encodeURIComponent(id)}/files${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    const headers = getAuthHeaders(username, password);
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers,
      agent
    });

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json(errorData);
    }

    const data = await response.json();
    
    // For datastore endpoint, check the response data for unauthorized status
    if (data.status === "UNAUTHORIZED" || data.name === "AUTHENTICATION_FAILED") {
      return res.status(401).json({
        status: "UNAUTHORIZED",
        name: "AUTHENTICATION_FAILED",
        message: [
          data.message?.[0] || `Unauthenticated access is not allowed. client-IP=${req.ip}`
        ],
        statusText: "Unauthorized",
        statusCode: 401
      });
    }

    res.json(data);
  } catch (error) {
    console.error('Error fetching datastore files:', error);
    res.status(500).json({
      status: "ERROR",
      name: "INTERNAL_SERVER_ERROR",
      message: ["Failed to fetch datastore files"],
      statusText: "Internal Server Error",
      statusCode: 500,
      error: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({
    status: "ERROR",
    name: "INTERNAL_SERVER_ERROR",
    message: ["An unexpected error occurred"],
    statusText: "Internal Server Error",
    statusCode: 500,
    error: err.message
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});