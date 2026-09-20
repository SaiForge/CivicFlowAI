import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import StatCard from '../shared/StatCard';
import ComplaintCard from '../shared/ComplaintCard';
import AreaFeed from './AreaFeed';
import CitizenNotifs from './CitizenNotifs';
import HotspotMap from '../admin/HotspotMap';
import { useComplaints, useAreaStats, useNotifications } from '../../hooks/useApi';
import { StatusBadge } from '../shared/StatusBadge';
import {
  MapPin, CheckCircle2, Clock3, Users, Plus,
  ShieldCheck, AlertCircle, Car, Trash2, Droplets, Lightbulb, Waves, ArrowRight, Loader2
} from 'lucide-react';

const statusFlow = [
  { key: 'Submitted',    label: 'Submitted',           hindi: 'दर्ज' },
  { key: 'Under Review', label: 'Under Review',        hindi: 'समीक्षा' },
  { key: 'Assigned',     label: 'Assigned',            hindi: 'आवंटित' },
  { key: 'In Progress',  label: 'In Progress',         hindi: 'प्रगति पर' },
  { key: 'Resolved',     label: 'Resolved & Verified', hindi: 'सत्यापित' },
];

const SECTIONS = ['My Complaints', 'Nearby Ward Issues', 'Ward Civic Map', 'Municipal Alerts'];

const ComplaintProgress = ({ complaint }) => {
  const { openDetail } = useApp();
  const currentIdx = statusFlow.findIndex(s => s.key === complaint.status);

  return (
    <div
      className="card my-complaint-card indian-complaint-card"
      onClick={() => openDetail(complaint.id)}
      role="button" tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && openDetail(complaint.id)}
    >
      <div className="complaint-card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="complaint-id">{complaint.id}</span>
          <span className="civic-ward-tag">Ward 14</span>
          {complaint.dept && (
            <span className="civic-dept-micro-pill">
              {complaint.dept === 'road' ? 'PWD Road' : complaint.dept === 'waste' ? 'Nagar Nigam Waste' : complaint.dept === 'water' ? 'Jal Board' : 'Municipal'}
            </span>
          )}
        </div>
        <StatusBadge status={complaint.status} />
      </div>

      <div className="complaint-issue" style={{ margin: '0.35rem 0 0.25rem', fontSize: '0.95rem', fontWeight: 700 }}>
        {complaint.issue}
      </div>

      <div className="complaint-location" style={{ marginBottom: '0.85rem', fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
        <MapPin size={13} strokeWidth={2} color="#b45309" />
        <span>{complaint.location}</span>
        <span style={{ margin: '0 0.35rem', opacity: 0.4 }}>·</span>
        <span style={{ color: '#b45309', fontWeight: 600 }}>SLA Active</span>
      </div>

      <div className="complaint-flow">
        {statusFlow.map((s, i) => {
          const done = i <= currentIdx;
          const active = i === currentIdx;
          return (
            <React.Fragment key={s.key}>
              <div className={`flow-step ${done ? 'flow-done' : ''} ${active ? 'flow-active' : ''}`}>
                <div className="flow-dot">
                  {done && !active ? '✓' : active ? '●' : '○'}
                </div>
                <div className="flow-label">
                  <div>{s.label}</div>
                  <div style={{ fontSize: '0.5rem', opacity: 0.75 }}>{s.hindi}</div>
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
  const { setReportFormOpen, currentUser, activePage, setActivePage } = useApp();
  const [activeSection, setActiveSection] = useState(() => {
    if (activePage === 'nearby') return 'Nearby Ward Issues';
    if (activePage === 'map') return 'Ward Civic Map';
    if (activePage === 'notifs') return 'Municipal Alerts';
    return 'My Complaints';
  });

  // Sync activeSection when activePage from Header/Nav changes
  React.useEffect(() => {
    if (activePage === 'nearby') {
      setActiveSection('Nearby Ward Issues');
    } else if (activePage === 'myissues') {
      setActiveSection('My Complaints');
    } else if (activePage === 'map') {
      setActiveSection('Ward Civic Map');
    } else if (activePage === 'notifs') {
      setActiveSection('Municipal Alerts');
    }
  }, [activePage]);

  const handleTabClick = (section) => {
    setActiveSection(section);
    if (section === 'Nearby Ward Issues') setActivePage('nearby');
    else if (section === 'My Complaints') setActivePage('myissues');
    else if (section === 'Ward Civic Map') setActivePage('map');
    else if (section === 'Municipal Alerts') setActivePage('notifs');
  };

  // Real API data
  const { data: allComplaints, loading: complaintsLoading } = useComplaints(
    currentUser?.id ? { citizen_id: currentUser.id } : {}
  );
  const { data: areaStats, loading: statsLoading } = useAreaStats();
  const { data: notifications } = useNotifications();

  const myComplaints = allComplaints || [];
  const unreadCount  = (notifications || []).filter(n => !n.read).length;
  const stats = areaStats || { activeNearby: 0, resolvedNearby: 0, inProgress: 0, communityReports: 0 };

  return (
    <div className="civic-page">
      {/* ── Ward Context & Citizen Header ── */}
      <div className="civic-page-header">
        <div>
          <div className="indian-civic-badge" style={{ marginBottom: '0.4rem' }}>
            <span className="tricolor-marker" />
            <span>वार्ड 14 · Central Municipal Zone</span>
          </div>
          <h2 className="welcome-text">
            Namaste, <span>{currentUser?.name?.split(' ')[0] || 'Citizen'}</span> · नागरिक समाधान केंद्र
          </h2>
          <p className="card-sub" style={{ marginTop: '0.25rem' }}>
            Track active ward grievances, report public issues, and verify photographic proof of municipal repairs.
          </p>
        </div>

        <div className="civic-header-stats-badge hide-mobile">
          <ShieldCheck size={16} color="#047857" />
          <span>{stats.resolvedNearby} Ward Issues Resolved · Active AI Monitoring</span>
        </div>
      </div>

      {/* ── File a Civic Grievance Banner ── */}
      <div className="card citizen-grievance-banner">
        <div className="grievance-banner-top">
          <div className="grievance-banner-left">
            <div className="grievance-banner-icon">
              <Plus size={24} strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.125rem', color: '#fff' }}>
                File a Civic Grievance (जन समाधान रिपोर्ट)
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.85)', marginTop: '0.15rem' }}>
                Potholes on PWD roads, uncollected garbage, water pipe leakage, or dark streetlights.
              </div>
            </div>
          </div>
          <button className="grievance-report-btn" onClick={() => setReportFormOpen(true)}>
            <span>Report Issue Now</span>
            <ArrowRight size={15} strokeWidth={2.5} />
          </button>
        </div>

        <div className="grievance-quick-chips">
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Quick select domain:
          </span>
          <button className="grievance-domain-chip" onClick={() => setReportFormOpen(true)}><Car size={13} /> Potholes &amp; Roads</button>
          <button className="grievance-domain-chip" onClick={() => setReportFormOpen(true)}><Trash2 size={13} /> Swachhata &amp; Waste</button>
          <button className="grievance-domain-chip" onClick={() => setReportFormOpen(true)}><Droplets size={13} /> Jal Board Leaks</button>
          <button className="grievance-domain-chip" onClick={() => setReportFormOpen(true)}><Lightbulb size={13} /> Streetlights Out</button>
          <button className="grievance-domain-chip" onClick={() => setReportFormOpen(true)}><Waves size={13} /> Choked Drains</button>
        </div>
      </div>

      {/* ── Area & Ward Stats ── */}
      <div className="stat-grid stat-grid-4">
        <StatCard icon={<MapPin       size={18} strokeWidth={1.75}/>} label="Active in Ward 14"   value={statsLoading ? '…' : stats.activeNearby} />
        <StatCard icon={<CheckCircle2 size={18} strokeWidth={1.75}/>} label="Resolved This Month" value={statsLoading ? '…' : stats.resolvedNearby} trend="+5 this week" trendUp />
        <StatCard icon={<Clock3       size={18} strokeWidth={1.75}/>} label="Under Field Repair"  value={statsLoading ? '…' : stats.inProgress} />
        <StatCard icon={<Users        size={18} strokeWidth={1.75}/>} label="Community Support"   value={statsLoading ? '…' : stats.communityReports} />
      </div>

      {/* ── Section Tabs ── */}
      <div className="section-tabs-wrap">
        <div className="section-tabs">
          {SECTIONS.map(s => (
            <button key={s}
              className={`section-tab ${activeSection === s ? 'section-tab-active' : ''}`}
              onClick={() => handleTabClick(s)}
            >
              {s}
              {s === 'My Complaints' && (
                <span className="tab-badge" style={{ background: 'var(--dark-card)', color: '#fff' }}>
                  {complaintsLoading ? '…' : myComplaints.length}
                </span>
              )}
              {s === 'Nearby Ward Issues' && stats.activeNearby > 0 && (
                <span className="tab-badge" style={{ background: '#3b82f6', color: '#fff' }}>
                  {stats.activeNearby}
                </span>
              )}
              {s === 'Municipal Alerts' && unreadCount > 0 && (
                <span className="tab-badge">{unreadCount}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ── */}
      {activeSection === 'My Complaints' && (
        <div className="card civic-section-card">
          <div className="card-header" style={{ marginBottom: '1.25rem' }}>
            <div>
              <h4 className="card-title">My Registered Complaints</h4>
              <span className="card-sub">Track real-time progress from submission to photographic proof of work</span>
            </div>
            <span className="badge badge-dark">{complaintsLoading ? '…' : myComplaints.length} Active</span>
          </div>

          {complaintsLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
              <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-muted)' }} />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {myComplaints.map(c => <ComplaintProgress key={c.id} complaint={c} />)}
              {!myComplaints.length && (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2.5rem' }}>
                  You have not filed any grievances yet. Click above to file your first complaint.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeSection === 'Nearby Ward Issues' && <AreaFeed />}
      {activeSection === 'Ward Civic Map'     && <HotspotMap />}
      {activeSection === 'Municipal Alerts'   && <CitizenNotifs />}
    </div>
  );
};

export default CitizenDashboard;
