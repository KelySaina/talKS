# talKS Quick Start

## 🚀 Fastest Way to Get Started

### 1. Register OAuth Client

Go to Konnect admin dashboard or run:

```bash
curl -X POST http://localhost:3000/api/admin/clients \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "talKS",
    "redirect_uris": ["http://localhost:5173/callback", "http://localhost:4000/auth/callback"],
    "scope": "openid profile email"
  }'
```

### 2. Configure Environment

```bash
# Copy and edit .env
cp .env.example .env

# Edit these values:
# OAUTH_CLIENT_ID=your_client_id
# OAUTH_CLIENT_SECRET=your_client_secret
```

### 3. Start with Docker

```bash
npm run docker:up
```

**Done!** Access at http://localhost:5173

### OR: Local Development

```bash
# Install dependencies
npm install
cd client && npm install && cd ..

# Setup database
npm run db:migrate
npm run db:seed

# Start servers
npm run dev
```

## 📱 What You Get

- **Real-time messaging** with WebSocket
- **OAuth 2.0 authentication** via Konnect Service
- **Public channels** for group conversations
- **Direct messages** for private chats
- **Online presence** indicators
- **Typing indicators**
- **Message history**
- **Modern Discord-like UI**

## 🎯 Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Browser   │◄────────┤   talKS      │◄────────┤  Konnect    │
│  (Client)   │  WS+API │   Server     │  OAuth  │  Service    │
└─────────────┘         └──────────────┘         └─────────────┘
                              │
                              ▼
                        ┌──────────┐
                        │  MySQL   │
                        │ Database │
                        └──────────┘
```

## 📚 Full Documentation

See [SETUP.md](SETUP.md) for complete setup guide and troubleshooting.

## 🔧 Common Commands

```bash
# Docker
npm run docker:up          # Start all services
npm run docker:down        # Stop all services
npm run docker:logs        # View logs

# Development
npm run dev                # Start both frontend & backend
npm run server:dev         # Backend only
npm run client:dev         # Frontend only

# Database
npm run db:migrate         # Run migrations
npm run db:seed            # Seed data
```

## 🆘 Quick Troubleshooting

**Can't connect?**
- Ensure Konnect is running on port 3000
- Check .env has correct OAuth credentials

**Database error?**
- Run `npm run db:migrate`
- Check MySQL is running (port 3307)

**Socket not connecting?**
- Verify backend is on port 4000
- Check browser console for errors
