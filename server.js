const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const https = require('https');
const CryptoJS = require('crypto-js');

const app = express();
const PORT = 5000;

// API Base URL
const BASE_URL = 'https://mt-conn-core-api-dev.hk.hsbc:14100/api/sil/element-dna';

// Encryption key - should match the client's key
const ENCRYPTION_KEY = process.env.REACT_APP_ENCRYPTION_KEY || 'your-fallback-encryption-key';

// Create an agent that allows self-signed SSL certificates
const agent = new https.Agent({
  rejectUnauthorized: false
});

// Middleware to parse JSON
app.use(express.json());

// Enable CORS for frontend testing
app.use(cors());

// Function to decrypt auth data
const decryptAuthData = (encryptedData) => {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
    const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
    return JSON.parse(decryptedData);
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
};

// Function to generate Basic Auth headers
const getBasicAuthHeaders = (username, password) => {
  const credentials = Buffer.from(`${username}:${password}`).toString('base64');
  console.log('Using credentials for API call:', { username });
  
  return {
    'Authorization': `Basic ${credentials}`,
    'Accept': '*/*',
    'User-Agent': 'datastore-viewer/1.0'
  };
};

// Function to process chunked responses
const processChunkedResponse = async (response, res) => {
  const buffer = await response.arrayBuffer();
  const rawdata = Buffer.from(buffer);
  res.send(rawdata.toString());
};

// Auth endpoint
app.post('/auth', (req, res) => {
  const { encryptedAuth } = req.body;
  
  if (!encryptedAuth) {
    return res.status(400).json({ error: 'Missing auth data' });
  }

  const authData = decryptAuthData(encryptedAuth);
  if (!authData || !authData.username || !authData.password) {
    return res.status(400).json({ error: 'Invalid auth data' });
  }

  console.log('Authenticating user:', authData.username);
  
  const apiUrl = `${BASE_URL}/auth`;
  fetch(apiUrl, {
    method: 'GET',
    headers: getBasicAuthHeaders(authData.username, authData.password),
    agent
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      res.json(data);
    })
    .catch(error => {
      console.error('Error fetching auth:', error);
      res.status(500).json({ error: 'Failed to fetch auth' });
    });
});

// Datastore files endpoint
app.get('/datastores/:id/files', async (req, res) => {
  const { encryptedAuth, where, sortBy } = req.query;
  const { id } = req.params;

  if (!encryptedAuth) {
    return res.status(400).json({ error: 'Missing auth data' });
  }

  const authData = decryptAuthData(encryptedAuth);
  if (!authData || !authData.username || !authData.password) {
    return res.status(400).json({ error: 'Invalid auth data' });
  }

  try {
    // Build the query string for the API
    const queryParams = new URLSearchParams();
    if (where) queryParams.append('where', where);
    if (sortBy) queryParams.append('sortBy', sortBy);
    
    const apiUrl = `${BASE_URL}/datastores/${encodeURIComponent(id)}/files${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: getBasicAuthHeaders(authData.username, authData.password),
      agent
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    res.setHeader('Content-Type', 'application/json');
    await processChunkedResponse(response, res);

  } catch (error) {
    console.error('Error fetching datastore files:', error);
    res.status(500).json({ error: 'Failed to fetch datastore files' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});