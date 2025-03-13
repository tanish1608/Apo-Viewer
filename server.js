const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const https = require('https');
const CryptoJS = require('crypto-js');
const { LRUCache } = require('lru-cache');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

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

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRY = '1h';

// Configure LRU Cache for auth tokens
const authCache = new LRUCache({
  max: 500, // Maximum number of items
  ttl: 1000 * 60 * 60, // 1 hour TTL
  updateAgeOnGet: true, // Update item age on access
  updateAgeOnHas: false
});

// Configure rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      status: "ERROR",
      name: "RATE_LIMIT_EXCEEDED",
      message: ["Too many requests. Please try again later."],
      statusText: "Too Many Requests",
      statusCode: 429
    });
  }
});

// Apply rate limiting to all routes
app.use(limiter);

// SQL Injection Prevention: Validate and sanitize where conditions
const validateWhereCondition = (whereClause) => {
  if (!whereClause) return '';

  // List of allowed SQL operators and keywords
  const allowedOperators = ['=', '!=', '>', '<', '>=', '<=', 'LIKE', 'NOT LIKE', 'IS NULL', 'IS NOT NULL', 'AND', 'OR', 'IN', 'NOT IN', 'BETWEEN'];
  const allowedFields = ['status', 'fileType', 'fileId', 'fileName', 'clientName', 'direction', 'creationTime', 'processingEndDate'];
  
  // Remove any comments
  let sanitized = whereClause.replace(/\/\*[\s\S]*?\*\/|--.*$/gm, '');
  
  // Split the where clause into tokens
  const tokens = sanitized.split(/\s+/);
  
  // Validate each token
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i].toUpperCase();
    
    // Check for SQL injection attempts
    if (token.includes(';') || 
        token.includes('DROP') || 
        token.includes('DELETE') || 
        token.includes('UPDATE') || 
        token.includes('INSERT') || 
        token.includes('UNION') ||
        token.includes('EXEC') ||
        token.includes('EXECUTE')) {
      throw new Error('Invalid SQL operation detected');
    }

    // Validate field names
    if (i % 3 === 0 && !allowedFields.includes(tokens[i].toLowerCase())) {
      throw new Error(`Invalid field name: ${tokens[i]}`);
    }

    // Validate operators
    if (i % 3 === 1) {
      const operator = token.toUpperCase();
      if (!allowedOperators.some(op => operator === op)) {
        throw new Error(`Invalid operator: ${operator}`);
      }
    }
  }

  // Escape single quotes in values
  sanitized = sanitized.replace(/'/g, "''");

  return sanitized;
};

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

// Function to generate JWT token
const generateToken = (username) => {
  return jwt.sign({ username }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
};

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      status: "UNAUTHORIZED",
      name: "AUTHENTICATION_FAILED",
      message: ["No token provided"],
      statusText: "Unauthorized",
      statusCode: 401
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      status: "UNAUTHORIZED",
      name: "AUTHENTICATION_FAILED",
      message: ["Invalid token"],
      statusText: "Unauthorized",
      statusCode: 401
    });
  }
};

// verify the auth data
app.post('/auth', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    if (!username || !password) {
      return res.status(401).json({
        status: "UNAUTHORIZED",
        name: "AUTHENTICATION_FAILED",
        message: ["Username and password are required"],
        statusText: "Unauthorized",
        statusCode: 401
      });
    }

    // Generate cache key
    const cacheKey = CryptoJS.SHA256(`${username}:${password}`).toString();

    // Check cache first
    const cachedAuth = authCache.get(cacheKey);
    if (cachedAuth) {
      return res.json({
        ...cachedAuth,
        token: generateToken(username)
      });
    }

    const apiUrl = `${BASE_URL}/auth`;
    const headers = getAuthHeaders(username, password);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers,
      agent,
      timeout: 5000 // 5 second timeout
    });

    const data = await response.json();

    // Check if the API response indicates unauthorized access
    if (response.status === 401 || data.status === "UNAUTHORIZED" || data.name === "AUTHENTICATION_FAILED") {
      return res.status(401).json({
        status: "UNAUTHORIZED",
        name: "AUTHENTICATION_FAILED",
        message: [
          data.message?.[0] || `Authentication failed`
        ],
        statusText: "Unauthorized",
        statusCode: 401
      });
    }

    // Cache successful auth response
    const authData = {
      ...data,
      username
    };
    
    authCache.set(cacheKey, authData);

    // Return response with JWT token
    res.json({
      ...authData,
      token: generateToken(username)
    });
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

// Protected route for datastore files
app.get('/datastores/:id/files', verifyToken, async (req, res) => {
  const { username, password } = req.query;
  const { id } = req.params;

  try {
    if (!username || !password) {
      return res.status(401).json({
        status: "UNAUTHORIZED",
        name: "AUTHENTICATION_FAILED",
        message: ["Credentials required"],
        statusText: "Unauthorized",
        statusCode: 401
      });
    }

    // Build query parameters
    const queryParams = new URLSearchParams(req.query);
    
    // Validate and sanitize where condition
    if (queryParams.has('where')) {
      try {
        const sanitizedWhere = validateWhereCondition(queryParams.get('where'));
        queryParams.set('where', sanitizedWhere);
      } catch (error) {
        return res.status(400).json({
          status: "ERROR",
          name: "INVALID_WHERE_CONDITION",
          message: [error.message],
          statusText: "Bad Request",
          statusCode: 400
        });
      }
    }

    const apiUrl = `${BASE_URL}/datastores/${encodeURIComponent(id)}/files?${queryParams.toString()}`;
    
    const headers = getAuthHeaders(username, password);
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers,
      agent,
      timeout: 10000 // 10 second timeout
    });

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json(errorData);
    }

    const data = await response.json();
    
    if (data.status === "UNAUTHORIZED" || data.name === "AUTHENTICATION_FAILED") {
      return res.status(401).json({
        status: "UNAUTHORIZED",
        name: "AUTHENTICATION_FAILED",
        message: [data.message?.[0] || "Unauthorized access"],
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