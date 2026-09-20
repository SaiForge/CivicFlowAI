import React from 'react';
import { useApp } from '../../context/AppContext';

const DeptPerformance = () => {
  const { deptPerformance } = useApp();
  return (
    <div className="card civic-section-card">
      <div className="card-header" style={{ marginBottom: '1rem' }}>
        <h4 className="card-title">Department Performance</h4>
        <span className="card-sub">Metrics presented neutrally across all departments</span>
      </div>
      <div className="dept-table-wrap">
        <table className="dept-table">
          <thead>
            <tr>
              <th>Department</th>
              <th>Assigned</th>
              <th>In Progress</th>
              <th>Resolved</th>
              <th>Pending</th>
              <th>Escalated</th>
              <th>Avg. Resolution</th>
            </tr>
          </thead>
          <tbody>
            {deptPerformance.map((d, i) => (
              <tr key={i}>
                <td className="dept-table-name">{d.dept}</td>
                <td><span className="badge badge-dark">{d.assigned}</span></td>
                <td>{d.inProgress}</td>
                <td>{d.resolved}</td>
                <td>{d.pending}</td>
                <td>{d.escalated > 0 ? <span className="badge" style={{ background: 'rgba(239,68,68,0.12)', color: '#dc2626' }}>{d.escalated}</span> : d.escalated}</td>
                <td>{d.avgResolutionDays}d</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="dept-cards-mobile">
        {deptPerformance.map((d, i) => (
          <div key={i} className="dept-mobile-card">
            <div className="dept-mobile-name">{d.dept}</div>
            <div className="dept-mobile-grid">
              <div><span className="dept-stat-label">Assigned</span><span className="dept-stat-val">{d.assigned}</span></div>
              <div><span className="dept-stat-label">In Progress</span><span className="dept-stat-val">{d.inProgress}</span></div>
              <div><span className="dept-stat-label">Resolved</span><span className="dept-stat-val">{d.resolved}</span></div>
              <div><span className="dept-stat-label">Pending</span><span className="dept-stat-val">{d.pending}</span></div>
              <div><span className="dept-stat-label">Escalated</span><span className="dept-stat-val">{d.escalated}</span></div>
              <div><span className="dept-stat-label">Avg. Res.</span><span className="dept-stat-val">{d.avgResolutionDays}d</span></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DeptPerformance;
