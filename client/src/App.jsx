import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { authAPI, channelsAPI, usersAPI, messagesAPI } from './api';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import UserList from './components/UserList';
import './App.css';

const SOCKET_URL = import.meta.env.VITE_WS_URL || 'http://localhost:4000';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  const [channels, setChannels] = useState([]);
  const [users, setUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [activeDM, setActiveDM] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const [unreadCounts, setUnreadCounts] = useState({});

  // Check authentication
  useEffect(() => {
    checkAuth();
  }, []);

  // Initialize socket connection
  useEffect(() => {
    if (user && !socket) {
      const newSocket = io(SOCKET_URL, {
        withCredentials: true,
        transports: ['websocket', 'polling']
      });

      newSocket.on('connect', () => {
        console.log('✅ Connected to WebSocket');
      });

      newSocket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error);
      });

      newSocket.on('message', (message) => {
        // Always add message to state, let React re-render decide if it's visible
        setMessages(prev => {
          // Check if message already exists (dedupe)
          if (prev.some(m => m.id === message.id)) {
            return prev;
          }
          return [...prev, message];
        });

        // Update unread count if it's a DM from someone else and not currently viewing their chat
        if (message.is_direct && message.sender_id !== user?.id) {
          const isCurrentChat = activeDM?.id === message.sender_id;
          if (!isCurrentChat) {
            setUnreadCounts(prev => ({
              ...prev,
              [message.sender_id]: (prev[message.sender_id] || 0) + 1
            }));
          }
        }
      });

      newSocket.on('user_online', async ({ userId, username }) => {
        setOnlineUsers(prev => [...new Set([...prev, userId])]);
        setUsers(prev => {
          const userExists = prev.some(u => u.id === userId);
          if (!userExists) {
            // User not in list, fetch and add them
            usersAPI.getById(userId)
              .then(({ data }) => {
                setUsers(prevUsers => [...prevUsers, { ...data, is_online: true }]);
              })
              .catch(err => console.error('Failed to fetch user:', err));
            return prev;
          }
          return prev.map(u =>
            u.id === userId ? { ...u, is_online: true } : u
          );
        });
      });

      newSocket.on('user_offline', ({ userId }) => {
        setOnlineUsers(prev => prev.filter(id => id !== userId));
        setUsers(prev => prev.map(u =>
          u.id === userId ? { ...u, is_online: false } : u
        ));
      });

      newSocket.on('online_users', (userIds) => {
        setOnlineUsers(userIds);
      });

      newSocket.on('typing', ({ userId, username, channelId, isDirect }) => {
        const key = isDirect ? `dm-${userId}` : `channel-${channelId}`;
        setTypingUsers(prev => ({
          ...prev,
          [key]: { userId, username, timestamp: Date.now() }
        }));

        // Clear typing indicator after 3 seconds
        setTimeout(() => {
          setTypingUsers(prev => {
            const newTyping = { ...prev };
            if (newTyping[key]?.timestamp === Date.now() - 3000) {
              delete newTyping[key];
            }
            return newTyping;
          });
        }, 3000);
      });

      newSocket.on('typing_stop', ({ userId, channelId, isDirect }) => {
        const key = isDirect ? `dm-${userId}` : `channel-${channelId}`;
        setTypingUsers(prev => {
          const newTyping = { ...prev };
          delete newTyping[key];
          return newTyping;
        });
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    }
  }, [user]);

  // Load channels and users
  useEffect(() => {
    if (user) {
      loadChannels();
      loadUsers();
      loadUnreadCounts();
    }
  }, [user]);

  const checkAuth = async () => {
    try {
      const { data } = await authAPI.getMe();
      setUser(data);
    } catch (error) {
      console.log('Not authenticated');
    } finally {
      setLoading(false);
    }
  };

  const loadChannels = async () => {
    try {
      const { data } = await channelsAPI.getAll();
      setChannels(data);
    } catch (error) {
      console.error('Failed to load channels:', error);
    }
  };

  const handleChannelCreated = (newChannel) => {
    setChannels(prev => [...prev, newChannel]);
    setActiveChannel(newChannel);
    setActiveDM(null);
    setMessages([]);
    if (socket) {
      socket.emit('join_channel', { channelId: newChannel.id });
    }
  };

  const loadUsers = async () => {
    try {
      const { data } = await usersAPI.getAll();
      setUsers(data);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const loadUnreadCounts = async () => {
    try {
      const { data } = await messagesAPI.getUnreadCounts();
      setUnreadCounts(data);
    } catch (error) {
      console.error('Failed to load unread counts:', error);
    }
  };

  const handleNewMessage = (message) => {
    const isRelevant =
      (activeChannel && message.channel_id === activeChannel.id) ||
      (activeDM && (
        (message.sender_id === activeDM.id && message.recipient_id === user.id) ||
        (message.sender_id === user.id && message.recipient_id === activeDM.id)
      ));

    if (isRelevant) {
      setMessages(prev => [...prev, message]);
    }
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
      if (socket) {
        socket.close();
      }
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleChannelSelect = (channel) => {
    // If clicking the same channel, temporarily clear to force refresh
    if (activeChannel?.id === channel.id) {
      setActiveChannel(null);
      setMessages([]);
      // Use setTimeout to ensure state updates are processed
      setTimeout(() => {
        setActiveChannel(channel);
        if (socket) {
          socket.emit('join_channel', { channelId: channel.id });
        }
      }, 0);
    } else {
      setActiveChannel(channel);
      setActiveDM(null);
      setMessages([]);
      if (socket) {
        socket.emit('join_channel', { channelId: channel.id });
      }
    }
  };

  const handleUserSelect = (selectedUser) => {
    // Clear unread count for this user
    setUnreadCounts(prev => {
      const newCounts = { ...prev };
      delete newCounts[selectedUser.id];
      return newCounts;
    });

    // Mark all messages from this user as read
    if (socket) {
      socket.emit('mark_all_read', { senderId: selectedUser.id });
    }

    // If clicking the same user, temporarily clear to force refresh
    if (activeDM?.id === selectedUser.id) {
      setActiveDM(null);
      setMessages([]);
      // Use setTimeout to ensure state updates are processed
      setTimeout(() => {
        setActiveDM(selectedUser);
      }, 0);
    } else {
      setActiveDM(selectedUser);
      setActiveChannel(null);
      setMessages([]);
    }
  };

  const handleSendMessage = (content) => {
    if (!socket || !content.trim()) return;

    const messageData = {
      content: content.trim(),
      tempId: Date.now()
    };

    if (activeChannel) {
      messageData.channelId = activeChannel.id;
      messageData.isDirect = false;
    } else if (activeDM) {
      messageData.recipientId = activeDM.id;
      messageData.isDirect = true;
    }

    socket.emit('send_message', messageData);
  };

  const handleTyping = (isTyping) => {
    if (!socket) return;

    const data = {};
    if (activeChannel) {
      data.channelId = activeChannel.id;
    } else if (activeDM) {
      data.recipientId = activeDM.id;
    }

    socket.emit(isTyping ? 'typing_start' : 'typing_stop', data);
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const typingKey = activeDM
    ? `dm-${activeDM.id}`
    : activeChannel
    ? `channel-${activeChannel.id}`
    : null;

  const typingIndicator = typingKey ? typingUsers[typingKey] : null;

  // Filter messages for the active conversation
  const filteredMessages = messages.filter(msg => {
    if (activeChannel) {
      return msg.channel_id === activeChannel.id;
    } else if (activeDM) {
      return (
        (msg.sender_id === activeDM.id && msg.recipient_id === user.id) ||
        (msg.sender_id === user.id && msg.recipient_id === activeDM.id)
      );
    }
    return false;
  });

  return (
    <div className="app">
      <Sidebar
        channels={channels}
        activeChannel={activeChannel}
        onChannelSelect={handleChannelSelect}
        onLogout={handleLogout}
        user={user}
        onChannelCreated={handleChannelCreated}
      />
      <ChatArea
        activeChannel={activeChannel}
        activeDM={activeDM}
        messages={filteredMessages}
        onSendMessage={handleSendMessage}
        onTyping={handleTyping}
        typingIndicator={typingIndicator}
        currentUser={user}
        socket={socket}
        setMessages={setMessages}
      />
      <UserList
        users={users.filter(u => u.id !== user.id)}
        onlineUsers={onlineUsers}
        onUserSelect={handleUserSelect}
        activeDM={activeDM}
        unreadCounts={unreadCounts}
      />
    </div>
  );
}

export default App;
