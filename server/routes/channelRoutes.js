const express = require('express');
const pool = require('../config/database');
const router = express.Router();

// Get all channels
router.get('/', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    try {
      const [channels] = await connection.query(`
        SELECT c.*,
               u.username as created_by_username,
               COUNT(DISTINCT cm.user_id) as member_count
        FROM channels c
        LEFT JOIN users u ON c.created_by = u.id
        LEFT JOIN channel_members cm ON c.id = cm.channel_id
        WHERE c.is_private = FALSE
        GROUP BY c.id
        ORDER BY c.name
      `);

      res.json(channels);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Get channels error:', error);
    res.status(500).json({ error: 'Failed to fetch channels' });
  }
});

// Get single channel
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();
    try {
      const [channels] = await connection.query(`
        SELECT c.*,
               u.username as created_by_username,
               COUNT(DISTINCT cm.user_id) as member_count
        FROM channels c
        LEFT JOIN users u ON c.created_by = u.id
        LEFT JOIN channel_members cm ON c.id = cm.channel_id
        WHERE c.id = ?
        GROUP BY c.id
      `, [id]);

      if (channels.length === 0) {
        return res.status(404).json({ error: 'Channel not found' });
      }

      // Get channel members
      const [members] = await connection.query(`
        SELECT u.id, u.username, u.display_name, u.avatar_url, u.is_online
        FROM channel_members cm
        JOIN users u ON cm.user_id = u.id
        WHERE cm.channel_id = ?
        ORDER BY u.username
      `, [id]);

      res.json({ ...channels[0], members });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Get channel error:', error);
    res.status(500).json({ error: 'Failed to fetch channel' });
  }
});

// Create channel
router.post('/', async (req, res) => {
  try {
    const { name, description, isPrivate = false } = req.body;

    // TODO: Get current user from auth middleware
    const createdBy = req.body.createdBy; // Temporary

    if (!name) {
      return res.status(400).json({ error: 'Channel name is required' });
    }

    const connection = await pool.getConnection();
    try {
      const [result] = await connection.query(
        'INSERT INTO channels (name, description, is_private, created_by) VALUES (?, ?, ?, ?)',
        [name, description, isPrivate, createdBy]
      );

      const channelId = result.insertId;

      // Get created channel
      const [channels] = await connection.query(
        'SELECT * FROM channels WHERE id = ?',
        [channelId]
      );

      res.status(201).json(channels[0]);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Create channel error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Channel name already exists' });
    }
    res.status(500).json({ error: 'Failed to create channel' });
  }
});

// Update channel
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const connection = await pool.getConnection();
    try {
      await connection.query(
        'UPDATE channels SET name = COALESCE(?, name), description = COALESCE(?, description) WHERE id = ?',
        [name, description, id]
      );

      const [channels] = await connection.query(
        'SELECT * FROM channels WHERE id = ?',
        [id]
      );

      if (channels.length === 0) {
        return res.status(404).json({ error: 'Channel not found' });
      }

      res.json(channels[0]);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Update channel error:', error);
    res.status(500).json({ error: 'Failed to update channel' });
  }
});

// Delete channel
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const connection = await pool.getConnection();
    try {
      const [result] = await connection.query(
        'DELETE FROM channels WHERE id = ?',
        [id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Channel not found' });
      }

      res.json({ message: 'Channel deleted successfully' });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Delete channel error:', error);
    res.status(500).json({ error: 'Failed to delete channel' });
  }
});

module.exports = router;
