import { useState } from 'react';
import CreateChannelModal from './CreateChannelModal';
import './Sidebar.css';

function Sidebar({ channels, activeChannel, onChannelSelect, onLogout, user, onChannelCreated, className = '' }) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  return (
    <div className={`sidebar ${className}`}>
      <div className="sidebar-header">
        <h2 className="sidebar-title">talKS</h2>
        <div className="user-info">
          <div className="user-avatar">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt={user.username} />
            ) : (
              <div className="avatar-placeholder">
                {user.username[0].toUpperCase()}
              </div>
            )}
            <span className="status-indicator online"></span>
          </div>
          <div className="user-details">
            <div className="user-name">{user.display_name || user.username}</div>
            <div className="user-status">Online</div>
          </div>
        </div>
      </div>

      <div className="sidebar-section">
        <div className="section-header">
          <h3>Channels</h3>
          <button
            className="add-channel-btn"
            onClick={() => setShowCreateModal(true)}
            title="Create Channel"
          >
            +
          </button>
        </div>
        <div className="channel-list">
          {channels.map(channel => (
            <button
              key={channel.id}
              className={`channel-item ${activeChannel?.id === channel.id ? 'active' : ''}`}
              onClick={() => onChannelSelect(channel)}
            >
              <span className="channel-icon">#</span>
              <span className="channel-name">{channel.name}</span>
              {channel.member_count > 0 && (
                <span className="member-count">{channel.member_count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="sidebar-footer">
        <button className="btn btn-danger logout-btn" onClick={onLogout}>
          Logout
        </button>
      </div>

      {showCreateModal && (
        <CreateChannelModal
          onClose={() => setShowCreateModal(false)}
          onChannelCreated={(channel) => {
            onChannelCreated(channel);
            setShowCreateModal(false);
          }}
        />
      )}
    </div>
  );
}

export default Sidebar;
