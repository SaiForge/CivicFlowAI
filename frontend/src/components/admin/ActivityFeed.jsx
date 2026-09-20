import React, { useState } from 'react';
import { activityFeed } from '../../data/mockData';
import { useApp } from '../../context/AppContext';
import { 
  AlertTriangle, UserCheck, ThumbsUp, Camera, 
  TrendingUp, CheckCircle2, ChevronRight, Clock
} from 'lucide-react';

const eventTypeMeta = {
  alert:    { icon: AlertTriangle, color: '#dc2626', bg: 'rgba(220,38,38,0.12)', label: 'Alert' },
  assign:   { icon: UserCheck,     color: '#2563eb', bg: 'rgba(37,99,235,0.12)', label: 'Assigned' },
  support:  { icon: ThumbsUp,      color: '#d97706', bg: 'rgba(217,119,6,0.12)',  label: 'Support' },
  evidence: { icon: Camera,        color: '#7c3aed', bg: 'rgba(124,58,237,0.12)', label: 'Evidence' },
  escalate: { icon: TrendingUp,    color: '#b91c1c', bg: 'rgba(185,28,28,0.15)',  label: 'Escalation' },
  resolved: { icon: CheckCircle2,  color: '#16a34a', bg: 'rgba(22,163,74,0.14)',  label: 'Resolved' },
};

const ActivityFeed = () => {
  const { openDetail } = useApp();
  const [filter, setFilter] = useState('all'); // 'all' | 'urgent' | 'resolved'

  const filteredItems = activityFeed.filter((item) => {
    if (filter === 'urgent') return item.type === 'alert' || item.type === 'escalate';
    if (filter === 'resolved') return item.type === 'resolved' || item.type === 'evidence';
    return true;
  });

  return (
    <div className="card civic-section-card activity-stream-card">
      {/* Header */}
      <div className="card-header" style={{ alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <h4 className="card-title" style={{ fontSize: '1rem', fontWeight: 700 }}>
              Live Activity Stream
            </h4>
            <span className="live-indicator">
              <span className="live-pulse-dot" />
              Live
            </span>
          </div>
          <span className="card-sub" style={{ display: 'block', marginTop: '0.2rem' }}>
            Real-time feed from citizens and dispatch units
          </span>
        </div>

        {/* Filter Pills */}
        <div className="activity-filter-row">
          <button
            className={`breakdown-pill-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({activityFeed.length})
          </button>
          <button
            className={`breakdown-pill-btn ${filter === 'urgent' ? 'active' : ''}`}
            onClick={() => setFilter('urgent')}
          >
            Urgent
          </button>
          <button
            className={`breakdown-pill-btn ${filter === 'resolved' ? 'active' : ''}`}
            onClick={() => setFilter('resolved')}
          >
            Resolved
          </button>
        </div>
      </div>

      {/* Activity List */}
      <div className="activity-list-container">
        {filteredItems.map((item) => {
          const meta = eventTypeMeta[item.icon] || eventTypeMeta[item.type] || eventTypeMeta.alert;
          const IconComponent = meta.icon;

          return (
            <div
              key={item.id}
              className="activity-stream-row"
              onClick={() => item.complaintId && openDetail(item.complaintId)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && item.complaintId && openDetail(item.complaintId)}
              title={item.complaintId ? `Click to view complaint ${item.complaintId}` : undefined}
            >
              {/* Event Icon */}
              <div
                className="activity-stream-icon-box"
                style={{ background: meta.bg, color: meta.color }}
              >
                <IconComponent size={14} strokeWidth={2} />
              </div>

              {/* Event Details */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="activity-stream-text">
                  {item.text}
                </div>
                <div className="activity-stream-meta">
                  {item.complaintId && (
                    <span className="activity-cid-pill">
                      {item.complaintId}
                    </span>
                  )}
                  {item.dept && (
                    <span className="activity-dept-pill">
                      {item.dept}
                    </span>
                  )}
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Clock size={11} strokeWidth={1.75} />
                    {item.ts}
                  </span>
                </div>
              </div>

              {/* Action Chevron */}
              <ChevronRight size={14} strokeWidth={2} className="activity-stream-chevron" />
            </div>
          );
        })}

        {filteredItems.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
            No activities matching this filter.
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityFeed;
