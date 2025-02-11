const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const https = require('https');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');
const app = express();

// Constants
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || crypto.randomBytes(64).toString('hex');
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || crypto.randomBytes(64).toString('hex');
const COOKIE_SECRET = process.env.COOKIE_SECRET || crypto.randomBytes(64).toString('hex');

// Create a reusable HTTPS agent for keep-alive connections
const agent = new https.Agent({
  keepAlive: true,
  maxSockets: 100
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser(COOKIE_SECRET));

// Helper function to hash passwords
const hashPassword = async (password) => {
  return new Promise((resolve, reject) => {
    // Generate a random salt
    crypto.randomBytes(16, (err, salt) => {
      if (err) reject(err);

      // Use PBKDF2 for password hashing
      crypto.pbkdf2(password, salt, 100000, 64, 'sha512', (err, derivedKey) => {
        if (err) reject(err);
        resolve(salt.toString('hex') + ':' + derivedKey.toString('hex'));
      });
    });
  });
};

// Helper function to verify password
const verifyPassword = async (password, hash) => {
  return new Promise((resolve, reject) => {
    const [salt, key] = hash.split(':');
    crypto.pbkdf2(password, Buffer.from(salt, 'hex'), 100000, 64, 'sha512', (err, derivedKey) => {
      if (err) reject(err);
      resolve(key === derivedKey.toString('hex'));
    });
  });
};

// Generate JWT tokens
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { userId: user.id, username: user.username },
    ACCESS_TOKEN_SECRET,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { userId: user.id },
    REFRESH_TOKEN_SECRET,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
};

// Set secure cookie options
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  signed: true
};

// Login endpoint
app.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // In production, verify against your database
    const user = await verifyUserCredentials(username, password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Store refresh token in database
    await storeRefreshToken(user.id, refreshToken);

    // Set refresh token in HTTP-only cookie
    res.cookie('refreshToken', refreshToken, cookieOptions);

    // Send access token in response
    res.json({
      success: true,
      accessToken,
      user: {
        id: user.id,
        username: user.username
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Refresh token endpoint
app.post('/auth/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.signedCookies;
    
    if (!refreshToken) {
      return res.status(401).json({ error: 'No refresh token' });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
    const user = await getUserById(decoded.userId);

    if (!user) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // Generate new tokens
    const tokens = generateTokens(user);

    // Update refresh token in database
    await updateRefreshToken(user.id, tokens.refreshToken);

    // Set new refresh token cookie
    res.cookie('refreshToken', tokens.refreshToken, cookieOptions);

    // Send new access token
    res.json({
      success: true,
      accessToken: tokens.accessToken
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// Logout endpoint
app.post('/auth/logout', async (req, res) => {
  try {
    const { refreshToken } = req.signedCookies;
    
    if (refreshToken) {
      // Delete refresh token from database
      const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
      await deleteRefreshToken(decoded.userId);
    }

    // Clear refresh token cookie
    res.clearCookie('refreshToken', cookieOptions);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Middleware to verify access token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No access token' });
  }

  try {
    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid access token' });
  }
};

// Protected routes
app.use('/api', authenticateToken);

// Update the datastores endpoint to use authentication
app.get('/api/datastores', async (req, res) => {
  try {
    const response = await fetch(req.query.apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${req.user.accessToken}`,
        'Content-Type': 'application/json'
      },
      agent
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    res.setHeader('Content-Type', 'application/json');
    await processChunkedResponse(response, res);
  } catch (error) {
    console.error('Error fetching datastores:', error);
    res.status(500).json({ error: 'Failed to fetch datastores' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});