# talKS - Real-Time Messaging Application

A modern real-time messaging application with OAuth 2.0 authentication via Konnect Service.

## Features

- 🔐 **OAuth 2.0 Authentication** - Secure login via Konnect Service
- 💬 **Real-time Messaging** - Instant message delivery using WebSocket
- 👥 **Direct Messages** - One-on-one conversations
- 📢 **Channels** - Group conversations
- 🟢 **Online Presence** - See who's online
- ⌨️ **Typing Indicators** - Real-time typing status
- 📝 **Message History** - Persistent message storage
- 🎨 **Modern UI** - Clean, responsive interface

## Architecture

- **Frontend**: React + Vite + Socket.IO Client
- **Backend**: Node.js + Express + Socket.IO
- **Authentication**: OAuth 2.0 with Konnect Service
- **Database**: MySQL
- **Deployment**: Docker + Docker Compose

## Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)
- Konnect Service running (for OAuth)

## Quick Start

### 1. Register OAuth Client

Register talKS with Konnect Service:

```bash
curl -X POST http://localhost:3000/api/admin/clients \
  -H "Authorization: Bearer {YOUR_ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "talKS",
    "redirect_uris": ["http://localhost:5173/callback", "http://localhost:4000/auth/callback"],
    "scope": "openid profile email"
  }'
```

Save the `client_id` and `client_secret`.

### 2. Configure Environment

Create `.env` file:

```bash
cp .env.example .env
# Edit .env with your OAuth credentials
```

### 3. Start with Docker

```bash
npm run docker:up
```

Access the app at `http://localhost:5173`

### 4. Local Development

```bash
# Install dependencies
npm install
cd client && npm install && cd ..

# Start development servers
npm run dev
```

## Environment Variables

```env
# Server
PORT=4000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=3308
DB_USER=root
DB_PASSWORD=rootpassword
DB_NAME=talks_db

# OAuth (Konnect Service)
OAUTH_CLIENT_ID=your_client_id
OAUTH_CLIENT_SECRET=your_client_secret
OAUTH_AUTHORIZATION_URL=http://localhost:3000/oauth/authorize
OAUTH_TOKEN_URL=http://localhost:3000/oauth/token
OAUTH_USERINFO_URL=http://localhost:3000/oauth/userinfo
OAUTH_REDIRECT_URI=http://localhost:4000/auth/callback

# Frontend URL
CLIENT_URL=http://localhost:5173

# JWT
JWT_SECRET=your-jwt-secret-for-socket-auth
```

## API Endpoints

### Authentication

- `GET /auth/login` - Initiate OAuth flow
- `GET /auth/callback` - OAuth callback
- `GET /auth/logout` - Logout
- `GET /auth/me` - Get current user

### Messages

- `GET /api/messages/:channelId` - Get channel messages
- `GET /api/direct/:userId` - Get direct messages

### Channels

- `GET /api/channels` - List all channels
- `POST /api/channels` - Create channel
- `PUT /api/channels/:id` - Update channel
- `DELETE /api/channels/:id` - Delete channel

### Users

- `GET /api/users` - List online users
- `GET /api/users/:id` - Get user profile

## WebSocket Events

### Client → Server

- `join_channel` - Join a channel
- `leave_channel` - Leave a channel
- `send_message` - Send message
- `typing_start` - Start typing indicator
- `typing_stop` - Stop typing indicator
- `mark_read` - Mark messages as read

### Server → Client

- `message` - New message received
- `user_joined` - User joined channel
- `user_left` - User left channel
- `user_online` - User came online
- `user_offline` - User went offline
- `typing` - User typing indicator
- `message_read` - Message read receipt

## Docker Services

- **talks-server**: Backend API + WebSocket server (port 4000)
- **talks-client**: Frontend application (port 5173)
- **talks-mysql**: MySQL database (port 3308)

## Development

```bash
# Server logs
npm run docker:logs

# Database migration
npm run db:migrate

# Seed sample data
npm run db:seed

# Stop all services
npm run docker:down
```

## Tech Stack

- **Frontend**: React, Socket.IO Client, Vite, CSS3
- **Backend**: Node.js, Express, Socket.IO
- **Database**: MySQL 8.0
- **Auth**: OAuth 2.0
- **DevOps**: Docker, Docker Compose

## License

MIT
