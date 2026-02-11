const pool = require('../config/database');
const { encrypt, decrypt } = require('../utils/encryption');

// Store active users and their socket IDs
const activeUsers = new Map(); // userId -> Set of socketIds

async function handleConnection(io, socket) {
  const userId = socket.user.id;

  // Add socket to active users
  if (!activeUsers.has(userId)) {
    activeUsers.set(userId, new Set());
  }
  activeUsers.get(userId).add(socket.id);

  // Update user online status
  try {
    const connection = await pool.getConnection();
    try {
      await connection.query(
        'UPDATE users SET is_online = TRUE, last_seen = NOW() WHERE id = ?',
        [userId]
      );
    } finally {
      connection.release();
    }

    // Notify others that user is online
    socket.broadcast.emit('user_online', {
      userId,
      username: socket.user.username
    });

    // Send list of online users to the new connection
    const onlineUsers = Array.from(activeUsers.keys());
    socket.emit('online_users', onlineUsers);
  } catch (error) {
    console.error('Connection handler error:', error);
  }
}

async function handleDisconnect(io, socket) {
  const userId = socket.user.id;

  // Remove socket from active users
  if (activeUsers.has(userId)) {
    activeUsers.get(userId).delete(socket.id);

    // If user has no more active sockets, mark as offline
    if (activeUsers.get(userId).size === 0) {
      activeUsers.delete(userId);

      try {
        const connection = await pool.getConnection();
        try {
          await connection.query(
            'UPDATE users SET is_online = FALSE, last_seen = NOW() WHERE id = ?',
            [userId]
          );
        } finally {
          connection.release();
        }

        // Notify others that user is offline
        socket.broadcast.emit('user_offline', {
          userId,
          username: socket.user.username
        });
      } catch (error) {
        console.error('Disconnect handler error:', error);
      }
    }
  }
}

async function handleJoinChannel(io, socket, data) {
  try {
    const { channelId } = data;
    const userId = socket.user.id;

    // Join the socket room
    socket.join(`channel:${channelId}`);

    // Add user to channel_members
    const connection = await pool.getConnection();
    try {
      await connection.query(
        'INSERT IGNORE INTO channel_members (channel_id, user_id) VALUES (?, ?)',
        [channelId, userId]
      );

      // Get channel info
      const [channels] = await connection.query(
        'SELECT * FROM channels WHERE id = ?',
        [channelId]
      );

      if (channels.length > 0) {
        // Notify channel members
        io.to(`channel:${channelId}`).emit('user_joined', {
          channelId,
          user: {
            id: userId,
            username: socket.user.username
          },
          timestamp: new Date()
        });

        socket.emit('channel_joined', { channel: channels[0] });
      }
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Join channel error:', error);
    socket.emit('error', { message: 'Failed to join channel' });
  }
}

async function handleLeaveChannel(io, socket, data) {
  try {
    const { channelId } = data;
    const userId = socket.user.id;

    // Leave the socket room
    socket.leave(`channel:${channelId}`);

    // Remove user from channel_members
    const connection = await pool.getConnection();
    try {
      await connection.query(
        'DELETE FROM channel_members WHERE channel_id = ? AND user_id = ?',
        [channelId, userId]
      );

      // Notify channel members
      io.to(`channel:${channelId}`).emit('user_left', {
        channelId,
        user: {
          id: userId,
          username: socket.user.username
        },
        timestamp: new Date()
      });

      socket.emit('channel_left', { channelId });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Leave channel error:', error);
    socket.emit('error', { message: 'Failed to leave channel' });
  }
}

async function handleSendMessage(io, socket, data) {
  try {
    const { content, channelId, recipientId, isDirect } = data;
    const senderId = socket.user.id;

    console.log('📤 Message received:', {
      sender: socket.user.username,
      content: content.substring(0, 50),
      channelId,
      recipientId,
      isDirect
    });

    const connection = await pool.getConnection();
    try {
      // Encrypt message content
      const encryptedContent = encrypt(content);

      // Insert message
      const [result] = await connection.query(
        `INSERT INTO messages (content, sender_id, channel_id, recipient_id, is_direct)
         VALUES (?, ?, ?, ?, ?)`,
        [encryptedContent, senderId, channelId || null, recipientId || null, isDirect || false]
      );

      const messageId = result.insertId;

      // Get full message with sender info
      const [messages] = await connection.query(
        `SELECT m.*, u.username as sender_username, u.avatar_url as sender_avatar
         FROM messages m
         JOIN users u ON m.sender_id = u.id
         WHERE m.id = ?`,
        [messageId]
      );

      const message = messages[0];
      // Decrypt message content for sending
      message.content = decrypt(message.content);

      console.log('📨 Broadcasting message:', {
        id: messageId,
        channelId,
        isDirect,
        recipientId,
        senderSocketCount: activeUsers.get(senderId)?.size || 0,
        recipientSocketCount: activeUsers.get(recipientId)?.size || 0
      });

      // Send message to appropriate room or user
      if (isDirect && recipientId) {
        // Direct message - send to recipient's sockets
        const recipientSockets = activeUsers.get(recipientId);
        console.log(`📬 Sending to recipient ${recipientId}:`, recipientSockets ? Array.from(recipientSockets) : 'NO SOCKETS');
        if (recipientSockets) {
          recipientSockets.forEach(socketId => {
            io.to(socketId).emit('message', message);
          });
        }
        // Also send to all sender's sockets (including current one)
        const senderSockets = activeUsers.get(senderId);
        console.log(`📬 Sending to sender ${senderId}:`, senderSockets ? Array.from(senderSockets) : 'NO SOCKETS');
        if (senderSockets) {
          senderSockets.forEach(socketId => {
            io.to(socketId).emit('message', message);
          });
        }
      } else if (channelId) {
        // Channel message - broadcast to everyone in the channel (including sender)
        io.in(`channel:${channelId}`).emit('message', message);
      }

      // Confirm to sender
      socket.emit('message_sent', { messageId, tempId: data.tempId });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Send message error:', error);
    socket.emit('error', { message: 'Failed to send message' });
  }
}

async function handleTypingStart(io, socket, data) {
  const { channelId, recipientId } = data;
  const userId = socket.user.id;

  const typingData = {
    userId,
    username: socket.user.username,
    timestamp: new Date()
  };

  if (channelId) {
    socket.to(`channel:${channelId}`).emit('typing', { ...typingData, channelId });
  } else if (recipientId) {
    const recipientSockets = activeUsers.get(recipientId);
    if (recipientSockets) {
      recipientSockets.forEach(socketId => {
        io.to(socketId).emit('typing', { ...typingData, isDirect: true });
      });
    }
  }
}

async function handleTypingStop(io, socket, data) {
  const { channelId, recipientId } = data;
  const userId = socket.user.id;

  const typingData = {
    userId,
    username: socket.user.username
  };

  if (channelId) {
    socket.to(`channel:${channelId}`).emit('typing_stop', { ...typingData, channelId });
  } else if (recipientId) {
    const recipientSockets = activeUsers.get(recipientId);
    if (recipientSockets) {
      recipientSockets.forEach(socketId => {
        io.to(socketId).emit('typing_stop', { ...typingData, isDirect: true });
      });
    }
  }
}

async function handleMarkRead(io, socket, data) {
  try {
    const { messageId } = data;
    const userId = socket.user.id;

    const connection = await pool.getConnection();
    try {
      await connection.query(
        'UPDATE messages SET is_read = TRUE, read_at = NOW() WHERE id = ? AND recipient_id = ?',
        [messageId, userId]
      );

      // Notify sender
      const [messages] = await connection.query(
        'SELECT sender_id FROM messages WHERE id = ?',
        [messageId]
      );

      if (messages.length > 0) {
        const senderId = messages[0].sender_id;
        const senderSockets = activeUsers.get(senderId);
        if (senderSockets) {
          senderSockets.forEach(socketId => {
            io.to(socketId).emit('message_read', {
              messageId,
              readBy: userId,
              readAt: new Date()
            });
          });
        }
      }
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Mark read error:', error);
  }
}

async function handleMarkAllRead(io, socket, data) {
  try {
    const { senderId } = data;
    const userId = socket.user.id;

    const connection = await pool.getConnection();
    try {
      await connection.query(
        'UPDATE messages SET is_read = TRUE, read_at = NOW() WHERE sender_id = ? AND recipient_id = ? AND is_direct = TRUE AND is_read = FALSE',
        [senderId, userId]
      );

      // Notify sender that all their messages were read
      const senderSockets = activeUsers.get(senderId);
      if (senderSockets) {
        senderSockets.forEach(socketId => {
          io.to(socketId).emit('messages_read', {
            readBy: userId,
            readAt: new Date()
          });
        });
      }
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Mark all read error:', error);
  }
}

module.exports = {
  handleConnection,
  handleDisconnect,
  handleJoinChannel,
  handleLeaveChannel,
  handleSendMessage,
  handleTypingStart,
  handleTypingStop,
  handleMarkRead,
  handleMarkAllRead
};
