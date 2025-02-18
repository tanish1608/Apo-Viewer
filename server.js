const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const https = require('https');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 5000;

// Security constants
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key';
const API_SECRET = process.env.API_SECRET || 'your-api-secret-key';
const TOKEN_EXPIRY = '8h';

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

// Verify request signature
const verifySignature = (req) => {
  const timestamp = req.headers['x-auth-timestamp'];
  const nonce = req.headers['x-auth-nonce'];
  const signature = req.headers['x-auth-signature'];
  const username = req.headers['x-auth-username'];

  if (!timestamp || !nonce || !signature || !username) {
    return false;
  }

  // Check timestamp freshness (5 minutes)
  if (Date.now() - parseInt(timestamp) > 5 * 60 * 1000) {
    return false;
  }

  // Verify signature
  const expectedSignature = crypto
    .createHmac('sha256', API_SECRET)
    .update(`${username}:${req.headers['x-auth-password']}:${timestamp}:${nonce}`)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
};

// Middleware to verify JWT and extract credentials
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    
    // Decrypt the credentials from the token
    const decipher = crypto.createDecipher('aes-256-cbc', JWT_SECRET);
    let decrypted = decipher.update(decoded.credentials, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    const credentials = JSON.parse(decrypted);
    req.user.username = credentials.username;
    req.user.password = credentials.password;
    
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Function to process chunked responses
const processChunkedResponse = async (response, res) => {
  const buffer = await response.arrayBuffer();
  const rawdata = Buffer.from(buffer);
  res.send(rawdata.toString());
};

// Verify the auth data
app.post('/auth', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  // Encrypt credentials for token
  const cipher = crypto.createCipher('aes-256-cbc', JWT_SECRET);
  let encrypted = cipher.update(JSON.stringify({ username, password }), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Generate JWT token with encrypted credentials
  const token = jwt.sign(
    { 
      username,
      credentials: encrypted
    },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );

  res.json({ token });
});

// Update the datastore files endpoint to handle where and sortBy parameters
app.get('/datastores/:id/files', verifyToken, async (req, res) => {
  const { where, sortBy } = req.query;
  const { id } = req.params;
  const { username, password } = req.user;

  try {
    // Build the query string for the API
    const queryParams = new URLSearchParams();
    if (where) queryParams.append('where', where);
    if (sortBy) queryParams.append('sortBy', sortBy);
    
    const apiUrl = `${BASE_URL}/datastores/${encodeURIComponent(id)}/files${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': '*/*',
        'User-Agent': 'datastore-viewer/1.0'
      },
      body: JSON.stringify({
        username,
        password
      }),
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