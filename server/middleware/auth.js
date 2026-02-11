const axios = require('axios');
const pool = require('../config/database');

async function authenticate(req, res, next) {
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

    // Get user data from our database
    const connection = await pool.getConnection();
    try {
      const [users] = await connection.query(
        'SELECT * FROM users WHERE id = ?',
        [userInfo.sub || userInfo.id]
      );

      if (users.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      req.user = users[0];
      next();
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Authentication error:', error.response?.data || error.message);
    res.status(401).json({ error: 'Authentication failed' });
  }
}

module.exports = { authenticate };
