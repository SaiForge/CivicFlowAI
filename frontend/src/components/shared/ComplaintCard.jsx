import React from 'react';
import { StatusBadge, PriorityBadge } from './StatusBadge';
import { useApp } from '../../context/AppContext';
import { MapPin, ThumbsUp, Users } from 'lucide-react';

const categoryColors = {
  Road: '#1a1a1a', Waste: '#737373', Water: '#3b82f6',
  Drainage: '#8b5cf6', Streetlight: '#f59e0b',
  Infrastructure: '#10b981', Other: '#6b7280',
};

const ComplaintCard = ({ complaint, showSupport = false, userVote = null, onVote }) => {
  const { openDetail } = useApp();

  const fmtDate = (ts) => {
    const d = new Date(ts);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const catColor = categoryColors[complaint.category] || '#737373';

  return (
    <div className="card complaint-card" onClick={() => openDetail(complaint.id)} role="button" tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && openDetail(complaint.id)}>
      <div className="complaint-card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="complaint-id">{complaint.id}</span>
          <PriorityBadge priority={complaint.priority} />
        </div>
        <StatusBadge status={complaint.status} />
      </div>

      <div className="complaint-card-body">
        <div className="complaint-issue-row">
          <span className="complaint-category-dot" style={{ background: catColor }} />
          <span className="complaint-issue">{complaint.issue}</span>
        </div>
        <div className="complaint-location">
          <MapPin size={12} strokeWidth={1.75} />
          <span>{complaint.location}</span>
        </div>
      </div>

      <div className="complaint-card-footer">
        <span className="complaint-date">{fmtDate(complaint.submittedAt)}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {complaint.reportCount > 1 && (
            <span className="complaint-reports">
              <Users size={11} strokeWidth={1.75}/> {complaint.reportCount} reports
            </span>
          )}
          <span className="complaint-support">
            <ThumbsUp size={11} strokeWidth={1.75}/> {complaint.supportCount}
          </span>
        </div>
      </div>

      {showSupport && (
        <div className="complaint-vote-row" onClick={e => e.stopPropagation()}>
          <button
            className={`vote-btn ${userVote === 'up' ? 'vote-btn-active-up' : ''}`}
            onClick={() => onVote && onVote(complaint.id, 'up')}
          >
            <ThumbsUp size={13} strokeWidth={1.75}/> Support <span className="vote-count">{complaint.supportCount}</span>
          </button>
          <button
            className={`vote-btn ${userVote === 'down' ? 'vote-btn-active-down' : ''}`}
            onClick={() => onVote && onVote(complaint.id, 'down')}
          >
            Not Relevant <span className="vote-count">{complaint.dislikeCount}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default ComplaintCard;
