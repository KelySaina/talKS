import { useEffect, useState, useRef } from 'react';
import { messagesAPI } from '../api';
import ChannelMembersModal from './ChannelMembersModal';
import './ChatArea.css';

function ChatArea({
  activeChannel,
  activeDM,
  messages,
  onSendMessage,
  onTyping,
  typingIndicator,
  currentUser,
  socket,
  setMessages
}) {
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    if (activeChannel || activeDM) {
      loadMessages();
    }
  }, [activeChannel?.id, activeDM?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      let data;
      if (activeChannel) {
        const response = await messagesAPI.getChannelMessages(activeChannel.id);
        data = response.data;
      } else if (activeDM) {
        const response = await messagesAPI.getDirectMessages(activeDM.id, {
          currentUserId: currentUser.id
        });
        data = response.data;
      }
      setMessages(data || []);
    } catch (error) {
      console.error('Failed to load messages:', error);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    onTyping(true);

    typingTimeoutRef.current = setTimeout(() => {
      onTyping(false);
    }, 2000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSendMessage(inputValue);
      setInputValue('');
      onTyping(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!activeChannel && !activeDM) {
    return (
      <div className="chat-area">
        <div className="empty-state">
          <h2>Welcome to talKS!</h2>
          <p>Select a channel or user to start messaging</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-area">
      <div className="chat-header">
        <div className="chat-header-title">
          {activeChannel ? (
            <>
              <span className="channel-icon">#</span>
              <h2>{activeChannel.name}</h2>
              {activeChannel.description && (
                <span className="channel-description">{activeChannel.description}</span>
              )}
            </>
          ) : (
            <>
              <div className="dm-avatar">
                {activeDM.avatar_url ? (
                  <img src={activeDM.avatar_url} alt={activeDM.username} />
                ) : (
                  <div className="avatar-placeholder">
                    {activeDM.username[0].toUpperCase()}
                  </div>
                )}
              </div>
              <h2>{activeDM.display_name || activeDM.username}</h2>
            </>
          )}
        </div>
        {activeChannel && (
          <button
            className="invite-btn"
            onClick={() => setShowMembersModal(true)}
            title="Add members"
          >
            + Add Members
          </button>
        )}
      </div>

      <div className="messages-container">
        {loading ? (
          <div className="loading-messages">
            <div className="spinner"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="empty-messages">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message, index) => {
            const isOwnMessage = message.sender_id === currentUser.id;
            const showAvatar = index === 0 ||
              messages[index - 1].sender_id !== message.sender_id;

            return (
              <div
                key={message.id}
                className={`message ${isOwnMessage ? 'own-message' : ''} ${!showAvatar ? 'grouped' : ''}`}
              >
                {showAvatar && !isOwnMessage && (
                  <div className="message-avatar">
                    {message.sender_avatar ? (
                      <img src={message.sender_avatar} alt={message.sender_username} />
                    ) : (
                      <div className="avatar-placeholder">
                        {message.sender_username[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                )}
                <div className="message-content">
                  {showAvatar && !isOwnMessage && (
                    <div className="message-header">
                      <span className="message-username">
                        {message.sender_display_name || message.sender_username}
                      </span>
                      <span className="message-time">{formatTime(message.created_at)}</span>
                    </div>
                  )}
                  <div className="message-bubble">
                    <p className="message-text">{message.content}</p>
                    {isOwnMessage && (
                      <span className="message-time-own">{formatTime(message.created_at)}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        {typingIndicator && (
          <div className="typing-indicator">
            <span>{typingIndicator.username} is typing</span>
            <span className="typing-dots">
              <span>.</span><span>.</span><span>.</span>
            </span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="message-input-container" onSubmit={handleSubmit}>
        <input
          type="text"
          className="message-input"
          placeholder={`Message ${activeChannel ? '#' + activeChannel.name : activeDM?.username}`}
          value={inputValue}
          onChange={handleInputChange}
          autoFocus
        />
        <button type="submit" className="send-button" disabled={!inputValue.trim()}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </form>

      {showMembersModal && activeChannel && (
        <ChannelMembersModal
          channel={activeChannel}
          onClose={() => setShowMembersModal(false)}
          socket={socket}
        />
      )}
    </div>
  );
}

export default ChatArea;
