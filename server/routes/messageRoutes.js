const express = require('express');
const pool = require('../config/database');
const { decrypt } = require('../utils/encryption');
const router = express.Router();

// Get channel messages
router.get('/channel/:channelId', async (req, res) => {
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

// Get direct messages with a user
router.get('/direct/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, before } = req.query;

    // We'd need to get current user from token, using cookie for now
    // In production, add proper auth middleware
    const accessToken = req.cookies.access_token;
    if (!accessToken) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // For simplicity, we'll skip detailed auth here
    // In production, decode and verify the access token
    const currentUserId = req.query.currentUserId; // Pass as query param for now

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
