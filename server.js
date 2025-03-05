const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const https = require('https');

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

// Function to generate Basic Auth header
const getAuthHeaders = (username, password) => ({
  'Authorization': 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64'),
  'Accept': '*/*',
  'User-Agent': 'datastore-viewer/1.0'
});

// Function to process chunked responses
const processChunkedResponse = async (response, res) => {
  const buffer = await response.arrayBuffer();
  const rawdata = Buffer.from(buffer);
  res.send(rawdata.toString());
};

// verifiy the auth data
app.get('/auth', (req, res) => {
  const { username, password } = req.query;
  if (!username || !password) {
    return res.status(400).json({ error: 'Missing credentials' });
  }
  const apiUrl = `${BASE_URL}/auth`;
  fetch(apiUrl, {
    method: 'GET',
    headers: getAuthHeaders(username, password),
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

// Update the datastore files endpoint to handle where, sortBy, fromRows and rows parameters
app.get('/datastores/:id/files', async (req, res) => {
  const { username, password, where, sortBy, fromRows = '0', rows = '1000' } = req.query;
  const { id } = req.params;

  if (!username || !password) {
    return res.status(400).json({ error: 'Missing credentials' });
  }

  try {
    // Build the query string for the API
    const queryParams = new URLSearchParams();
    if (where) queryParams.append('where', where);
    if (sortBy) queryParams.append('sortBy', sortBy);
    queryParams.append('fromRows', fromRows);
    queryParams.append('rows', rows);
    
    const apiUrl = `${BASE_URL}/datastores/${encodeURIComponent(id)}/files${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: getAuthHeaders(username, password),
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