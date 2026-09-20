import React from 'react';
import { citizenNotifications } from '../../data/mockData';

const CitizenNotifs = () => {
  return (
    <div className="card civic-section-card">
      <div className="card-header" style={{ marginBottom: '1rem' }}>
        <h4 className="card-title">Notifications</h4>
        <span className="badge badge-dark">{citizenNotifications.filter(n => !n.read).length} unread</span>
      </div>
      <div className="notif-list">
        {citizenNotifications.map(n => (
          <div key={n.id} className={`notif-item ${!n.read ? 'notif-unread' : ''}`}>
            <div className="notif-dot" style={{ background: n.read ? 'rgba(0,0,0,0.1)' : 'var(--dark-card)' }} />
            <div className="notif-content">
              <div className="notif-text">{n.text}</div>
              <div className="notif-ts">{n.ts}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CitizenNotifs;
