const express = require('express');
const pool = require('../config/database');
const router = express.Router();

// Get all users
router.get('/', async (req, res) => {
  try {
    const { online } = req.query;
    const connection = await pool.getConnection();
    try {
      let query = 'SELECT id, username, email, display_name, avatar_url, is_online, last_seen FROM users';

      if (online === 'true') {
        query += ' WHERE is_online = TRUE';
      }

      query += ' ORDER BY username';

      const [users] = await connection.query(query);

      res.json(users);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get user by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();
    try {
      const [users] = await connection.query(
        'SELECT id, username, email, display_name, avatar_url, is_online, last_seen, created_at FROM users WHERE id = ?',
        [id]
      );

      if (users.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(users[0]);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Search users
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const connection = await pool.getConnection();
    try {
      const [users] = await connection.query(
        `SELECT id, username, email, display_name, avatar_url, is_online, last_seen
         FROM users
         WHERE username LIKE ? OR display_name LIKE ? OR email LIKE ?
         ORDER BY username
         LIMIT 20`,
        [`%${query}%`, `%${query}%`, `%${query}%`]
      );

      res.json(users);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

module.exports = router;
