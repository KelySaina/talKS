import './UserList.css';

function UserList({ users, onlineUsers, onUserSelect, activeDM, unreadCounts = {} }) {
  const sortedUsers = [...users].sort((a, b) => {
    // Online users first
    const aOnline = onlineUsers.includes(a.id) || a.is_online;
    const bOnline = onlineUsers.includes(b.id) || b.is_online;

    if (aOnline && !bOnline) return -1;
    if (!aOnline && bOnline) return 1;

    // Then alphabetically
    return a.username.localeCompare(b.username);
  });

  return (
    <div className="user-list">
      <div className="user-list-header">
        <h3>Users</h3>
        <span className="online-count">
          {onlineUsers.length} online
        </span>
      </div>
      <div className="users-container">
        {sortedUsers.map(user => {
          const isOnline = onlineUsers.includes(user.id) || user.is_online;
          const isActive = activeDM?.id === user.id;
          const unreadCount = unreadCounts[user.id] || 0;

          return (
            <button
              key={user.id}
              className={`user-item ${isActive ? 'active' : ''}`}
              onClick={() => onUserSelect(user)}
            >
              <div className="user-item-avatar">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.username} />
                ) : (
                  <div className="avatar-placeholder">
                    {user.username[0].toUpperCase()}
                  </div>
                )}
                <span className={`status-indicator ${isOnline ? 'online' : 'offline'}`}></span>
              </div>
              <div className="user-item-info">
                <div className="user-item-name">
                  {user.display_name || user.username}
                </div>
                <div className="user-item-status">
                  {isOnline ? 'Online' : 'Offline'}
                </div>
              </div>
              {unreadCount > 0 && (
                <span className="unread-badge">{unreadCount}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default UserList;
