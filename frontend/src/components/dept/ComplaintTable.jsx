import React, { useState } from 'react';
import { DEPARTMENTS } from '../../data/mockData';
import { useApp } from '../../context/AppContext';
import { StatusBadge, PriorityBadge } from '../shared/StatusBadge';
import { Loader2 } from 'lucide-react';

const ComplaintTable = ({ dept, complaints = [], loading = false }) => {
  const { openDetail } = useApp();
  const [filterStatus, setFilterStatus] = useState('All');

  const filtered = filterStatus === 'All' ? complaints : complaints.filter(c => c.status === filterStatus);
  const statuses = ['All', ...new Set(complaints.map(c => c.status))];

  if (loading) return (
    <div className="card civic-section-card" style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
      <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-muted)' }} />
    </div>
  );

  const fmtDate = ts => new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  return (
    <div className="card civic-section-card">
      <div className="card-header" style={{ marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h4 className="card-title">Complaint Management</h4>
        <div className="filter-tabs">
          {statuses.map(s => (
            <button key={s}
              className={`filter-tab ${filterStatus === s ? 'filter-tab-active' : ''}`}
              onClick={() => setFilterStatus(s)}
            >{s}</button>
          ))}
        </div>
      </div>

      {/* Desktop Table */}
      <div className="civic-table-wrap">
        <table className="civic-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Issue</th>
              <th>Location</th>
              <th>Priority</th>
              <th>Support</th>
              <th>Officer</th>
              <th>Status</th>
              <th>Submitted</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id}>
                <td><span className="complaint-id">{c.id}</span></td>
                <td>{c.issue}</td>
                <td style={{ maxWidth: '10rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.location}</td>
                <td><PriorityBadge priority={c.priority} /></td>
                <td>👍 {c.supportCount}</td>
                <td>{c.assignedOfficer || <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>}</td>
                <td><StatusBadge status={c.status} /></td>
                <td>{fmtDate(c.submittedAt)}</td>
                <td>
                  <div style={{ display: 'flex', gap: '0.375rem' }}>
                    <button className="civic-btn civic-btn-xs" onClick={() => openDetail(c.id)}>View</button>
                    <button className="civic-btn civic-btn-xs civic-btn-ghost">Assign</button>
                  </div>
                </td>
              </tr>
            ))}
            {!filtered.length && (
              <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No complaints match filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="civic-cards-mobile">
        {filtered.map(c => (
          <div key={c.id} className="civic-mobile-row" onClick={() => openDetail(c.id)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="complaint-id">{c.id}</span>
              <StatusBadge status={c.status} />
            </div>
            <div style={{ fontWeight: 600, marginTop: '0.25rem' }}>{c.issue}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{c.location}</div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
              <PriorityBadge priority={c.priority} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>👍 {c.supportCount}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ComplaintTable;
