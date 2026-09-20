import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import ComplaintCard from '../shared/ComplaintCard';
import { MapPin, Users } from 'lucide-react';

const AreaFeed = () => {
  const { complaintsList, currentUser } = useApp();
  const [votes, setVotes] = useState({});

  const handleVote = (id, dir) => {
    setVotes(prev => ({ ...prev, [id]: prev[id] === dir ? null : dir }));
  };

  // Live complaints from current user's ward or community
  const nearbyComplaints = complaintsList.filter(c => 
    c.citizenId !== currentUser?.id
  );

  return (
    <div className="card civic-section-card" style={{ padding: '1.5rem' }}>
      <div className="card-header" style={{ marginBottom: '1.25rem' }}>
        <div>
          <h4 className="card-title" style={{ fontSize: '1.2rem', fontWeight: 700 }}>Problems in Your Ward</h4>
          <span className="card-sub" style={{ fontSize: '0.875rem' }}>Civic issues reported by community members in your vicinity</span>
        </div>
        <span className="badge badge-dark" style={{ fontSize: '0.85rem' }}>{nearbyComplaints.length} nearby</span>
      </div>

      {nearbyComplaints.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-muted)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem' }}>
            <Users size={24} color="#737373" />
          </div>
          <p style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-dark)' }}>No Community Reports in This Ward</p>
          <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>Be the first to report an issue in your neighborhood!</p>
        </div>
      ) : (
        <div className="complaint-grid">
          {nearbyComplaints.map(c => (
            <ComplaintCard
              key={c.id}
              complaint={c}
              showSupport
              userVote={votes[c.id]}
              onVote={handleVote}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AreaFeed;
