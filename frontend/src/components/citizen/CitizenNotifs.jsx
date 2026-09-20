import React from 'react';
import { useNotifications } from '../../hooks/useApi';
import { notificationsApi } from '../../services/api';
import { Loader2 } from 'lucide-react';

const CitizenNotifs = () => {
  const { data, loading, refetch } = useNotifications();
  const notifications = data || [];
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkRead = async (id) => {
    try {
      await notificationsApi.markRead(id);
      await refetch();
    } catch { /* ignore */ }
  };

  return (
    <div className="card civic-section-card">
      <div className="card-header" style={{ marginBottom: '1rem' }}>
        <h4 className="card-title">Municipal Alerts &amp; Notifications</h4>
        <span className="badge badge-dark">{unreadCount} unread</span>
      </div>
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '1.5rem' }}>
          <Loader2 size={22} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-muted)' }} />
        </div>
      ) : (
        <div className="notif-list">
          {notifications.map(n => (
            <div
              key={n.id}
              className={`notif-item ${!n.read ? 'notif-unread' : ''}`}
              onClick={() => !n.read && handleMarkRead(n.id)}
              style={{ cursor: !n.read ? 'pointer' : 'default' }}
            >
              <div className="notif-dot" style={{ background: n.read ? 'rgba(0,0,0,0.1)' : 'var(--dark-card)' }} />
              <div className="notif-content">
                <div className="notif-text">{n.text}</div>
                <div className="notif-ts">{n.ts}</div>
              </div>
            </div>
          ))}
          {notifications.length === 0 && (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No notifications yet.</div>
          )}
        </div>
      )}
    </div>
  );
};

export default CitizenNotifs;
