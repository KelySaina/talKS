const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const router = express.Router();

// Generate JWT for socket authentication
function generateSocketToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Login - Redirect to OAuth provider
router.get('/login', (req, res) => {
  const state = Math.random().toString(36).substring(7);
  const authUrl = new URL(process.env.OAUTH_AUTHORIZATION_URL);

  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('client_id', process.env.OAUTH_CLIENT_ID);
  authUrl.searchParams.append('redirect_uri', process.env.OAUTH_REDIRECT_URI);
  authUrl.searchParams.append('scope', 'openid profile email');
  authUrl.searchParams.append('state', state);

  // Store state in cookie for CSRF protection
  res.cookie('oauth_state', state, { httpOnly: true, maxAge: 600000 }); // 10 minutes
  res.redirect(authUrl.toString());
});

// OAuth Callback
router.get('/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    const storedState = req.cookies.oauth_state;

    // Verify state for CSRF protection
    if (!state || state !== storedState) {
      return res.redirect(`${process.env.CLIENT_URL}?error=invalid_state`);
    }

    // Clear state cookie
    res.clearCookie('oauth_state');

    // Exchange code for tokens
    const tokenResponse = await axios.post(
      process.env.OAUTH_TOKEN_URL,
      {
        grant_type: 'authorization_code',
        code,
        client_id: process.env.OAUTH_CLIENT_ID,
        client_secret: process.env.OAUTH_CLIENT_SECRET,
        redirect_uri: process.env.OAUTH_REDIRECT_URI
      },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );

    const { access_token, refresh_token } = tokenResponse.data;

    // Get user info from OAuth provider
    const userInfoResponse = await axios.get(process.env.OAUTH_USERINFO_URL, {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const userInfo = userInfoResponse.data;

    // Upsert user in database
    const connection = await pool.getConnection();
    try {
      await connection.query(
        `INSERT INTO users (id, username, email, display_name, avatar_url, is_online, last_seen)
         VALUES (?, ?, ?, ?, ?, TRUE, NOW())
         ON DUPLICATE KEY UPDATE
         username = VALUES(username),
         email = VALUES(email),
         display_name = VALUES(display_name),
         avatar_url = VALUES(avatar_url),
         is_online = TRUE,
         last_seen = NOW()`,
        [
          userInfo.sub || userInfo.id,
          userInfo.preferred_username || userInfo.username || userInfo.email.split('@')[0],
          userInfo.email,
          userInfo.name || userInfo.preferred_username || userInfo.username,
          userInfo.picture || userInfo.avatar_url || null
        ]
      );
    } finally {
      connection.release();
    }

    // Generate socket authentication token
    const socketToken = generateSocketToken({
      id: userInfo.sub || userInfo.id,
      username: userInfo.preferred_username || userInfo.username || userInfo.email.split('@')[0],
      email: userInfo.email
    });

    // Set tokens in httpOnly cookies
    res.cookie('access_token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 3600000 // 1 hour
    });

    res.cookie('refresh_token', refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 3600000 // 7 days
    });

    res.cookie('socket_token', socketToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 3600000 // 7 days
    });

    // Redirect to client
    res.redirect(`${process.env.CLIENT_URL}/`);
  } catch (error) {
    console.error('OAuth callback error:', error.response?.data || error.message);
    res.redirect(`${process.env.CLIENT_URL}?error=auth_failed`);
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    const accessToken = req.cookies.access_token;

    if (!accessToken) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get user info from OAuth provider
    const userInfoResponse = await axios.get(process.env.OAUTH_USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const userInfo = userInfoResponse.data;

    // Get additional user data from our database
    const connection = await pool.getConnection();
    try {
      const [users] = await connection.query(
        'SELECT * FROM users WHERE id = ?',
        [userInfo.sub || userInfo.id]
      );

      if (users.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(users[0]);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Get user error:', error.response?.data || error.message);
    res.status(401).json({ error: 'Authentication failed' });
  }
});

// Logout
router.post('/logout', async (req, res) => {
  try {
    const socketToken = req.cookies.socket_token;

    // Mark user as offline if we can decode the token
    if (socketToken) {
      try {
        const decoded = jwt.verify(socketToken, process.env.JWT_SECRET);
        const connection = await pool.getConnection();
        try {
          await connection.query(
            'UPDATE users SET is_online = FALSE, last_seen = NOW() WHERE id = ?',
            [decoded.id]
          );
        } finally {
          connection.release();
        }
      } catch (err) {
        // Token invalid or expired, continue with logout
      }
    }

    // Clear all cookies
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    res.clearCookie('socket_token');

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

module.exports = router;
