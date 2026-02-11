const jwt = require('jsonwebtoken');

function authenticateSocket(socket, next) {
  try {
    // Get token from handshake auth or cookies
    const token = socket.handshake.auth.token ||
                  socket.handshake.headers.cookie?.split('; ')
                    .find(c => c.startsWith('socket_token='))
                    ?.split('=')[1];

    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user to socket
    socket.user = {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email
    };

    next();
  } catch (error) {
    console.error('Socket authentication error:', error.message);
    next(new Error('Authentication error: Invalid token'));
  }
}

module.exports = { authenticateSocket };
