const express = require('express');
const pool = require('../config/database');
const { decrypt } = require('../utils/encryption');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// Get channel messages
router.get('/channel/:channelId', authenticate, async (req, res) => {
  try {
    const { channelId } = req.params;
    const { limit = 50, before } = req.query;

    const connection = await pool.getConnection();
    try {
      let query = `
        SELECT m.*, u.username as sender_username, u.avatar_url as sender_avatar, u.display_name as sender_display_name
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.channel_id = ? AND m.is_direct = FALSE
      `;
      const params = [channelId];

      if (before) {
        query += ' AND m.id < ?';
        params.push(before);
      }

      query += ' ORDER BY m.created_at DESC LIMIT ?';
      params.push(parseInt(limit));

      const [messages] = await connection.query(query, params);

      // Decrypt messages before sending
      const decryptedMessages = messages.map(msg => ({
        ...msg,
        content: decrypt(msg.content)
      }));

      res.json(decryptedMessages.reverse());
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Get channel messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Get unread message counts for all users
router.get('/unread-counts', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const connection = await pool.getConnection();
    try {
      const [counts] = await connection.query(
        `SELECT sender_id, COUNT(*) as count
         FROM messages
         WHERE recipient_id = ? AND is_direct = TRUE AND is_read = FALSE
         GROUP BY sender_id`,
        [userId]
      );

      const unreadCounts = {};
      counts.forEach(row => {
        unreadCounts[row.sender_id] = row.count;
      });

      res.json(unreadCounts);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Get unread counts error:', error);
    res.status(500).json({ error: 'Failed to fetch unread counts' });
  }
});

// Get direct messages with a user
router.get('/direct/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, before } = req.query;
    const currentUserId = req.user.id;

    const connection = await pool.getConnection();
    try {
      let query = `
        SELECT m.*, u.username as sender_username, u.avatar_url as sender_avatar, u.display_name as sender_display_name
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.is_direct = TRUE
        AND ((m.sender_id = ? AND m.recipient_id = ?) OR (m.sender_id = ? AND m.recipient_id = ?))
      `;
      const params = [currentUserId, userId, userId, currentUserId];

      if (before) {
        query += ' AND m.id < ?';
        params.push(before);
      }

      query += ' ORDER BY m.created_at DESC LIMIT ?';
      params.push(parseInt(limit));

      const [messages] = await connection.query(query, params);

      // Decrypt messages before sending
      const decryptedMessages = messages.map(msg => ({
        ...msg,
        content: decrypt(msg.content)
      }));

      res.json(decryptedMessages.reverse());
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Get direct messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

module.exports = router;
