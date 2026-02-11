require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/authRoutes');
const messageRoutes = require('./routes/messageRoutes');
const channelRoutes = require('./routes/channelRoutes');
const userRoutes = require('./routes/userRoutes');
const { authenticateSocket } = require('./middleware/socketAuth');
const socketHandlers = require('./handlers/socketHandlers');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      process.env.CLIENT_URL || 'http://localhost:5173',
      'http://localhost:5174'
    ],
    credentials: true,
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 4000;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// Middleware
app.use(cors({
  origin: [
    process.env.CLIENT_URL || 'http://localhost:5173',
    'http://localhost:5174'
  ],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/api', limiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'talKS', timestamp: new Date().toISOString() });
});

// Routes
app.use('/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/users', userRoutes);

// Socket.IO middleware
io.use(authenticateSocket);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`✅ User connected: ${socket.user.username} (${socket.user.id})`);

  socketHandlers.handleConnection(io, socket);

  socket.on('disconnect', () => {
    socketHandlers.handleDisconnect(io, socket);
    console.log(`❌ User disconnected: ${socket.user.username}`);
  });

  socket.on('join_channel', (data) => socketHandlers.handleJoinChannel(io, socket, data));
  socket.on('leave_channel', (data) => socketHandlers.handleLeaveChannel(io, socket, data));
  socket.on('send_message', (data) => socketHandlers.handleSendMessage(io, socket, data));
  socket.on('typing_start', (data) => socketHandlers.handleTypingStart(io, socket, data));
  socket.on('typing_stop', (data) => socketHandlers.handleTypingStop(io, socket, data));
  socket.on('mark_read', (data) => socketHandlers.handleMarkRead(io, socket, data));
  socket.on('mark_all_read', (data) => socketHandlers.handleMarkAllRead(io, socket, data));
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 talKS server running on port ${PORT}`);
  console.log(`📡 WebSocket server ready`);
  console.log(`🔐 OAuth provider: ${process.env.OAUTH_AUTHORIZATION_URL}`);
});

module.exports = { app, server, io };
