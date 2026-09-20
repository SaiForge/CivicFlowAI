import React from 'react';
import { useApp } from '../../context/AppContext';
import StatCard from '../shared/StatCard';
import AreaFeed from './AreaFeed';
import { STATUS } from '../../data/mockData';
import { StatusBadge } from '../shared/StatusBadge';
import { 
  MapPin, CheckCircle2, Clock3, Users, Plus, 
  ShieldCheck, AlertCircle, FileText, ArrowRight
} from 'lucide-react';

const statusFlow = [
  { key: 'Triaged', label: 'Triaged & Verified', hindi: 'सत्यापित' },
  { key: 'Assigned', label: 'Assigned to Dept', hindi: 'आवंटित' },
  { key: 'In Progress', label: 'In Progress', hindi: 'प्रगति पर' },
  { key: 'Resolved', label: 'Resolved', hindi: 'समाधान' },
];

const ComplaintProgress = ({ complaint }) => {
  const { openDetail } = useApp();
  if (!complaint) return null;

  const currentIdx = statusFlow.findIndex(s => s.key === complaint.status);

  return (
    <div 
      className="card my-complaint-card indian-complaint-card" 
      onClick={() => openDetail(complaint.id)} 
      role="button" 
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && openDetail(complaint.id)}
      style={{ cursor: 'pointer', padding: '1.25rem 1.5rem' }}
    >
      <div className="complaint-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span className="complaint-id" style={{ fontWeight: 800, fontSize: '0.95rem' }}>{complaint.id}</span>
          <span className="civic-ward-tag" style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem' }}>{complaint.ward || 'Ward 112'}</span>
          <span className="civic-dept-micro-pill" style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem' }}>
            {complaint.department || 'Municipal Body'}
          </span>
        </div>
        <StatusBadge status={complaint.status} />
      </div>

      <div className="complaint-issue" style={{ margin: '0.4rem 0 0.35rem', fontSize: '1.1rem', fontWeight: 700 }}>
        {complaint.issue || complaint.title || complaint.category || 'Civic Issue'}
      </div>

      <div className="complaint-location" style={{ marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <MapPin size={15} strokeWidth={2} color="#b45309" /> 
        <span>{complaint.location || complaint.address || 'Indiranagar, Bengaluru'}</span>
        <span style={{ margin: '0 0.35rem', opacity: 0.4 }}>·</span>
        <span style={{ color: '#b45309', fontWeight: 600 }}>Priority: {complaint.priority || 'Normal'}</span>
      </div>

      {/* Visual Resolution Progress Flow */}
      <div className="complaint-flow" style={{ marginTop: '0.75rem' }}>
        {statusFlow.map((s, i) => {
          const done = i <= (currentIdx >= 0 ? currentIdx : 0);
          const active = i === currentIdx;
          return (
            <React.Fragment key={s.key}>
              <div className={`flow-step ${done ? 'flow-done' : ''} ${active ? 'flow-active' : ''}`}>
                <div className="flow-dot">
                  {done && !active ? '✓' : active ? '●' : '○'}
                </div>
                <div className="flow-label">
                  <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{s.label}</div>
                </div>
              </div>
              {i < statusFlow.length - 1 && (
                <div className={`flow-connector ${i < currentIdx ? 'flow-conn-done' : ''}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

const CitizenDashboard = () => {
  const { setReportFormOpen, complaintsList, currentUser, activePage } = useApp();

  const currentComplaints = Array.isArray(complaintsList) ? complaintsList : [];
  
  // Safely match user's own complaints without throwing
  const myComplaints = currentComplaints.filter(c => {
    if (!c) return false;
    const cid = String(c.id || '');
    return c.citizenId === currentUser?.id || 
           c.citizenName === currentUser?.name || 
           cid.startsWith('TICK-') || 
           cid.startsWith('CMP-');
  });

  const resolvedCount = myComplaints.filter(c => c.status === 'Resolved').length;
  const inProgressCount = myComplaints.filter(c => c.status === 'In Progress' || c.status === 'Triaged').length;

  return (
    <div className="civic-page">
      {/* ── Ward Context & Citizen Header ── */}
      <div className="civic-page-header">
        <div>
          <div className="indian-civic-badge" style={{ marginBottom: '0.4rem' }}>
            <span className="tricolor-marker" />
            <span>🇮🇳 नागरिक सेवा पोर्टल · Citizen Civic Redressal Portal</span>
          </div>
          <h2 className="welcome-text">Namaste, <span>{currentUser?.name || 'Citizen'}</span></h2>
          <p className="card-sub" style={{ marginTop: '0.25rem', color: '#b45309', fontWeight: 600, fontSize: '0.95rem' }}>
            {currentUser?.ward || 'Ward 112 - Indiranagar'} · Track your reported issues and local community status
          </p>
        </div>

        <button 
          className="btn-primary" 
          onClick={() => setReportFormOpen(true)}
          style={{ fontSize: '0.95rem', padding: '0.7rem 1.3rem', gap: '0.5rem' }}
        >
          <Plus size={18} />
          Report Civic Issue
        </button>
      </div>

      {/* ── Quick Stats Strip ── */}
      <div className="stat-grid-4">
        <StatCard
          label="My Registered Grievances"
          value={myComplaints.length.toString()}
          change={`${inProgressCount} currently active`}
          trend={myComplaints.length > 0 ? "up" : "neutral"}
          icon={FileText}
          color="#d97706"
        />
        <StatCard
          label="In Resolution Process"
          value={inProgressCount.toString()}
          change="AI triaged & dispatched"
          trend="neutral"
          icon={Clock3}
          color="#3b82f6"
        />
        <StatCard
          label="Resolved & Closed"
          value={resolvedCount.toString()}
          change={myComplaints.length ? `${Math.round((resolvedCount / myComplaints.length) * 100)}% resolved` : '0% resolved'}
          trend="up"
          icon={CheckCircle2}
          color="#16a34a"
        />
        <StatCard
          label="Total Ward Issues"
          value={currentComplaints.length.toString()}
          change="Community reports"
          trend="neutral"
          icon={Users}
          color="#7c3aed"
        />
      </div>

      {/* ── Main Content: Nearby Ward Feed OR My Complaints ── */}
      {activePage === 'nearby' ? (
        <AreaFeed />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>My Filed Grievances</h3>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Showing {myComplaints.length} issue{myComplaints.length === 1 ? '' : 's'}
            </span>
          </div>

          {myComplaints.length === 0 ? (
            <div className="card" style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(217, 119, 6, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                <FileText size={28} color="#d97706" />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>No Grievances Reported Yet</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '420px', margin: '0 auto 1.5rem' }}>
                You haven't filed any civic complaints yet. Notice a pothole, broken streetlight, or garbage dump? Report it for instant AI triaging.
              </p>
              <button 
                onClick={() => setReportFormOpen(true)} 
                className="btn-primary" 
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', margin: '0 auto' }}
              >
                <Plus size={16} />
                Report an Issue Now
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {myComplaints.map(complaint => (
                <ComplaintProgress key={complaint.id} complaint={complaint} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CitizenDashboard;
