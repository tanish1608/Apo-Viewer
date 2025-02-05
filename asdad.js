const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
const PORT = 5000;

// API Base URL
const BASE_URL = 'https://mt-conn-core-api-dev.hk.hsbc:14100/api/sil/element-dna';

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
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let result = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    result += decoder.decode(value, { stream: true }); // Decode chunk
    res.write(decoder.decode(value, { stream: true })); // Send data incrementally
  }

  res.end(); // End the response when done
};

// Route to fetch datastore IDs (handles chunked response)
app.get('/datastores', async (req, res) => {
  const { username, password } = req.query;

  if (!username || !password) {
    return res.status(400).json({ error: 'Missing credentials' });
  }

  try {
    const response = await fetch(`${BASE_URL}/datastores`, {
      method: 'GET',
      headers: getAuthHeaders(username, password)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    res.setHeader('Content-Type', 'application/json'); // Ensure correct response type
    await processChunkedResponse(response, res); // Process streaming response

  } catch (error) {
    console.error('Error fetching datastores:', error);
    res.status(500).json({ error: 'Failed to fetch datastores' });
  }
});

// Route to fetch datastore files by ID (handles chunked response)
app.get('/datastores/:id/files', async (req, res) => {
  const { username, password } = req.query;
  const datastoreId = req.params.id;

  if (!username || !password) {
    return res.status(400).json({ error: 'Missing credentials' });
  }

  try {
    const response = await fetch(`${BASE_URL}/datastores/${encodeURIComponent(datastoreId)}/files`, {
      method: 'GET',
      headers: getAuthHeaders(username, password)
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

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});