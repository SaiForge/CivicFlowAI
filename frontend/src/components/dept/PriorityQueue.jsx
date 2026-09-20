import React from 'react';
import { useApp } from '../../context/AppContext';
import ComplaintCard from '../shared/ComplaintCard';
import { Loader2 } from 'lucide-react';

const PRIORITY_ORDER = { Critical: 0, High: 1, Medium: 2, Low: 3 };

const PriorityQueue = ({ dept, complaints = [], loading = false }) => {
  const { openDetail } = useApp();
  const queue = complaints
    .filter(c => !['Resolved', 'Closed'].includes(c.status))
    .sort((a, b) => (PRIORITY_ORDER[a.priority] || 3) - (PRIORITY_ORDER[b.priority] || 3));

  if (loading) return (
    <div className="card civic-section-card" style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
      <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-muted)' }} />
    </div>
  );

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
