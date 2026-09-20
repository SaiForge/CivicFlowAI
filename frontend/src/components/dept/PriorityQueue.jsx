import React from 'react';
import { useApp } from '../../context/AppContext';
import ComplaintCard from '../shared/ComplaintCard';

const PRIORITY_ORDER = { Critical: 0, High: 1, Medium: 2, Low: 3 };

const PriorityQueue = ({ complaints, dept }) => {
  const { openDetail, complaintsList } = useApp();
  const rawList = complaints || complaintsList || [];
  
  const queue = rawList
    .filter(c => !dept || c.dept === dept || (c.department || '').toLowerCase().includes(dept.toLowerCase()))
    .filter(c => !['Resolved', 'Closed'].includes(c.status))
    .sort((a, b) => (PRIORITY_ORDER[a.priority] || 3) - (PRIORITY_ORDER[b.priority] || 3));

  if (!queue.length) {
    return (
      <div className="card civic-section-card" style={{ padding: '1.5rem' }}>
        <div className="card-title" style={{ fontWeight: 700, fontSize: '1.1rem' }}>Priority Action Queue</div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.75rem' }}>
          No high-severity pending complaints in queue.
        </div>
      </div>
    );
  }

  return (
    <div className="card civic-section-card" style={{ padding: '1.5rem' }}>
      <div className="card-header" style={{ marginBottom: '1.25rem' }}>
        <h4 className="card-title" style={{ fontWeight: 700, fontSize: '1.15rem' }}>Priority Action Queue</h4>
        <span className="badge badge-dark" style={{ fontSize: '0.85rem' }}>{queue.length} requiring action</span>
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
