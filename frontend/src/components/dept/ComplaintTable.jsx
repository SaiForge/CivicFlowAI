import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { StatusBadge, PriorityBadge } from '../shared/StatusBadge';

const ComplaintTable = ({ complaints, dept }) => {
  const { openDetail, complaintsList } = useApp();
  const [filterStatus, setFilterStatus] = useState('All');

  const rawList = complaints || complaintsList || [];
  const deptComplaints = dept 
    ? rawList.filter(c => c.dept === dept || (c.department || '').toLowerCase().includes(dept.toLowerCase()))
    : rawList;

  const filtered = filterStatus === 'All' ? deptComplaints : deptComplaints.filter(c => c.status === filterStatus);
  const statuses = ['All', ...new Set(deptComplaints.map(c => c.status).filter(Boolean))];

  const fmtDate = (ts) => {
    if (!ts) return 'Recent';
    try {
      return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    } catch {
      return 'Recent';
    }
  };

  return (
    <div className="card civic-section-card" style={{ padding: '1.5rem' }}>
      <div className="card-header" style={{ marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h4 className="card-title" style={{ fontWeight: 700, fontSize: '1.15rem' }}>Complaint Management</h4>
          <span className="card-sub" style={{ fontSize: '0.85rem' }}>Live dispatch queue across municipal divisions</span>
        </div>
        <div className="filter-tabs">
          {statuses.map(s => (
            <button 
              key={s}
              className={`filter-tab ${filterStatus === s ? 'filter-tab-active' : ''}`}
              onClick={() => setFilterStatus(s)}
              style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}
            >
              {s}
            </button>
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
              <th>Status</th>
              <th>Submitted</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  No complaints match the selected filter.
                </td>
              </tr>
            ) : (
              filtered.map(c => (
                <tr key={c.id}>
                  <td><span className="complaint-id">{c.id}</span></td>
                  <td style={{ fontWeight: 600 }}>{c.issue || c.title || c.category}</td>
                  <td style={{ maxWidth: '14rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.location || c.address}
                  </td>
                  <td><PriorityBadge priority={c.priority} /></td>
                  <td><StatusBadge status={c.status} /></td>
                  <td>{fmtDate(c.submittedAt || c.created_at)}</td>
                  <td>
                    <button 
                      className="civic-btn civic-btn-xs" 
                      onClick={() => openDetail(c.id)}
                      style={{ fontSize: '0.8rem', padding: '0.3rem 0.65rem' }}
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ComplaintTable;
