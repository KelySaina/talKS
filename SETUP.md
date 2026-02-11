talKS Setup & Integration Guide

Complete guide for setting up talKS with Konnect Service integration.

Prerequisites

1. **Konnect Service** must be running on `http://localhost:3000`
2. **Docker Desktop** (for Docker deployment)
3. **Node.js 18+** (for local development)

## Step 1: Register OAuth Client in Konnect Service

### Option A: Using Konnect Admin Dashboard

1. Go to `http://localhost:3000/admin`
2. Navigate to "OAuth Clients" tab
3. Click "Create Client"
4. Fill in:
   - **Name**: `talKS`
   - **Redirect URIs** (one per line):
     ```
     http://localhost:5173/callback
     http://localhost:4000/auth/callback
     ```
   - **Scope**: `openid profile email`
5. Click "Create"
6. **Save the credentials immediately!**

### Option B: Using cURL

```bash
# Get admin token first (login to Konnect admin)
# Then run:

curl -X POST http://localhost:3000/api/admin/clients \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "talKS",
    "redirect_uris": [
      "http://localhost:5173/callback",
      "http://localhost:4000/auth/callback"
    ],
    "scope": "openid profile email"
  }'
```

You'll receive:

```json
{
  "client_id": "client_xxxxxxxxxx",
  "client_secret": "secret_yyyyyyyy",
  "message": "Client created successfully..."
}
```

**⚠️ IMPORTANT**: Save the `client_secret` - it won't be shown again!

## Step 2: Configure Environment

Create `.env` file in the talKS root directory:

```bash
cp .env.example .env
```

Edit `.env` and update these values:

# OAuth Configuration (from Step 1)
OAUTH_CLIENT_ID=your_client_id_here
OAUTH_CLIENT_SECRET=your_client_secret_here

# Keep these as default for local development
OAUTH_AUTHORIZATION_URL=http://localhost:3000/oauth/authorize
OAUTH_TOKEN_URL=http://localhost:3000/oauth/token
OAUTH_USERINFO_URL=http://localhost:3000/oauth/userinfo
OAUTH_REDIRECT_URI=http://localhost:4000/auth/callback

# Server Configuration
PORT=4000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=3307
DB_USER=root
DB_PASSWORD=rootpassword
DB_NAME=talks_db

# Frontend URL
CLIENT_URL=http://localhost:5173

# JWT Secret (change in production)
JWT_SECRET=your-super-secret-jwt-key-change-in-production

## Step 3: Choose Deployment Method

### Option A: Docker Deployment (Recommended)

```bash
# Start all services
npm run docker:up

# View logs
npm run docker:logs

# Stop services
npm run docker:down
```

Services will be available at:

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:4000
- **MySQL**: localhost:3308

### Option B: Local Development

```bash
# Install dependencies
npm install
cd client && npm install && cd ..

# Run database migration
npm run db:migrate

# Seed default channels (optional)
npm run db:seed

# Start both frontend and backend
npm run dev
```

Or run separately:

```bash
# Terminal 1 - Backend
npm run server:dev

# Terminal 2 - Frontend
npm run client:dev
```

## Step 4: Configure Konnect Network (Docker only)

If using Docker, ensure Konnect Service and talKS are on the same network:

```bash
# Create network if it doesn't exist
docker network create konnect-network

# Connect Konnect service to the network (if not already)
docker network connect konnect-network konnect-app
```

Update `docker-compose.yml` if needed to ensure services can communicate.

## Step 5: Test the Integration

1. **Start Konnect Service** (must be running first)

   ```bash
   cd konnect-service
   docker-compose up -d
   ```
2. **Start talKS**

   ```bash
   cd talKS
   npm run docker:up
   # or
   npm run dev
   ```
3. **Access talKS**

   - Open browser to `http://localhost:5173`
   - Click "Sign in with Konnect"
   - You'll be redirected to Konnect login
   - After login, you'll be redirected back to talKS
4. **Test Features**

   - ✅ See online users in right panel
   - ✅ Join default channels (#general, #random, #announcements)
   - ✅ Send messages in channels
   - ✅ Click on a user to start direct message
   - ✅ See typing indicators
   - ✅ Check real-time message delivery

## Troubleshooting

### OAuth Redirect Issues

**Problem**: "invalid_redirect_uri" error

**Solution**: Ensure redirect URIs in Konnect match exactly:

- `http://localhost:5173/callback`
- `http://localhost:4000/auth/callback`

### Database Connection Failed

**Problem**: Can't connect to MySQL

**Solution**:

# Check MySQL is running
docker ps | grep mysql

# Check port availability
netstat -an | grep 3307

# Try connecting manually
mysql -h 127.0.0.1 -P 3307 -u root -prootpassword

### Socket Connection Error

**Problem**: WebSocket not connecting

**Solution**:

1. Check backend is running on port 4000
2. Verify `VITE_WS_URL` in client
3. Check browser console for errors
4. Ensure cookies are enabled

### User Not Found After Login

**Problem**: Successfully logged in but user not found

**Solution**:

```bash
# Run database migration
npm run db:migrate

# Check database
mysql -h 127.0.0.1 -P 3307 -u root -prootpassword talks_db
mysql> SELECT * FROM users;
```

### CORS Issues

**Problem**: CORS policy blocking requests

**Solution**: Verify `CLIENT_URL` in `.env` matches your frontend URL

## Production Deployment

### Environment Variables to Change

```env
NODE_ENV=production
JWT_SECRET=use-a-strong-random-secret-here
DB_PASSWORD=use-a-strong-password

# Update URLs to production domains
CLIENT_URL=https://talks.yourdomain.com
OAUTH_REDIRECT_URI=https://talks.yourdomain.com/auth/callback
OAUTH_AUTHORIZATION_URL=https://auth.yourdomain.com/oauth/authorize
OAUTH_TOKEN_URL=https://auth.yourdomain.com/oauth/token
OAUTH_USERINFO_URL=https://auth.yourdomain.com/oauth/userinfo
```

### Register Production OAuth Client

In Konnect Service, create a new OAuth client with production redirect URIs:

```
https://talks.yourdomain.com/callback
https://talks.yourdomain.com/auth/callback
```

### SSL/HTTPS

For production, ensure:

- Konnect Service is served over HTTPS
- talKS is served over HTTPS
- All redirect URIs use `https://`
- WebSocket upgrades work over HTTPS

## API Reference

### Authentication Endpoints

- `GET /auth/login` - Initiate OAuth flow
- `GET /auth/callback` - OAuth callback handler
- `GET /auth/me` - Get current user
- `POST /auth/logout` - Logout

### Channel Endpoints

- `GET /api/channels` - List all channels
- `GET /api/channels/:id` - Get channel details
- `POST /api/channels` - Create channel
- `PUT /api/channels/:id` - Update channel
- `DELETE /api/channels/:id` - Delete channel

### Message Endpoints

- `GET /api/messages/channel/:channelId` - Get channel messages
- `GET /api/messages/direct/:userId` - Get direct messages

### User Endpoints

- `GET /api/users` - List all users
- `GET /api/users/:id` - Get user details
- `GET /api/users/search/:query` - Search users

### WebSocket Events

**Client → Server**:

- `join_channel` - Join a channel
- `leave_channel` - Leave a channel
- `send_message` - Send a message
- `typing_start` - Start typing
- `typing_stop` - Stop typing
- `mark_read` - Mark message as read

**Server → Client**:

- `message` - New message received
- `user_online` - User came online
- `user_offline` - User went offline
- `online_users` - List of online users
- `typing` - User typing indicator
- `typing_stop` - User stopped typing
- `user_joined` - User joined channel
- `user_left` - User left channel

## Support

For issues:

1. Check the troubleshooting section above
2. Review browser console and server logs
3. Verify Konnect Service is accessible
4. Check all environment variables are correct

## License

MIT
