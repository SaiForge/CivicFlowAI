import React from 'react';
import { complaints } from '../../data/mockData';
import { useApp } from '../../context/AppContext';
import ComplaintCard from '../shared/ComplaintCard';

const PRIORITY_ORDER = { Critical: 0, High: 1, Medium: 2, Low: 3 };

const PriorityQueue = ({ dept }) => {
  const { openDetail } = useApp();
  const queue = complaints
    .filter(c => c.dept === dept && !['Resolved', 'Closed'].includes(c.status))
    .sort((a, b) => (PRIORITY_ORDER[a.priority] || 3) - (PRIORITY_ORDER[b.priority] || 3));

  if (!queue.length) {
    return (
      <div className="card civic-section-card">
        <div className="card-title">Priority Queue</div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '1rem' }}>No active complaints in queue.</div>
      </div>
    );
  }

  return (
    <div className="card civic-section-card">
      <div className="card-header" style={{ marginBottom: '1rem' }}>
        <h4 className="card-title">Priority Queue</h4>
        <span className="badge badge-dark">{queue.length} open</span>
      </div>
      <div className="complaint-grid">
        {queue.map(c => (
          <ComplaintCard key={c.id} complaint={c} />
        ))}
      </div>
    </div>
  );
};

export default PriorityQueue;
