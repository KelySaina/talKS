import { useState, useEffect } from 'react';
import { usersAPI } from '../api';
import './ChannelMembersModal.css';

function ChannelMembersModal({ channel, onClose, socket }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const { data } = await usersAPI.getAll();
      setUsers(data);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = (user) => {
    setInviting(true);
    // When user clicks a channel member, auto-join them
    if (socket) {
      socket.emit('join_channel', { channelId: channel.id, userId: user.id });
      setTimeout(() => {
        setInviting(false);
        onClose();
      }, 500);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Members to #{channel.name}</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="members-list">
          {loading ? (
            <div className="loading-text">Loading users...</div>
          ) : (
            <div className="users-grid">
              {users.map(user => (
                <button
                  key={user.id}
                  className="user-card"
                  onClick={() => handleInvite(user)}
                  disabled={inviting}
                >
                  <div className="user-card-avatar">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.username} />
                    ) : (
                      <div className="avatar-placeholder">
                        {user.username[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="user-card-info">
                    <div className="user-card-name">
                      {user.display_name || user.username}
                    </div>
                    <div className="user-card-username">@{user.username}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChannelMembersModal;
