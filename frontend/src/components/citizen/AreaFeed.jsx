import React, { useState } from 'react';
import { areaFeed } from '../../data/mockData';
import ComplaintCard from '../shared/ComplaintCard';

const AreaFeed = () => {
  const [votes, setVotes] = useState({});

  const handleVote = (id, dir) => {
    setVotes(prev => ({ ...prev, [id]: prev[id] === dir ? null : dir }));
  };

  return (
    <div className="card civic-section-card">
      <div className="card-header" style={{ marginBottom: '1rem' }}>
        <div>
          <h4 className="card-title">Problems in Your Area</h4>
          <span className="card-sub">Civic issues reported by community members near you</span>
        </div>
        <span className="badge badge-dark">{areaFeed.length} nearby</span>
      </div>
      <div className="complaint-grid">
        {areaFeed.map(c => (
          <ComplaintCard
            key={c.id}
            complaint={c}
            showSupport
            userVote={votes[c.id]}
            onVote={handleVote}
          />
        ))}
      </div>
    </div>
  );
};

export default AreaFeed;
