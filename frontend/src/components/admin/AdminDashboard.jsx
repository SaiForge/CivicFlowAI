import React, { useState } from 'react';
import StatCard from '../shared/StatCard';
import IssueBreakdown from './IssueBreakdown';
import ActivityFeed from './ActivityFeed';
import HotspotMap from './HotspotMap';
import DeptPerformance from './DeptPerformance';
import AgentConsole from './AgentConsole';
import PriorityQueue from '../dept/PriorityQueue';
import ComplaintTable from '../dept/ComplaintTable';
import { useApp } from '../../context/AppContext';
import {
  ClipboardList, Clock, CheckCircle2, AlertCircle,
  TrendingUp, ShieldAlert, Bot, ShieldCheck, MapPin, Building2,
  Cpu, ArrowUpRight, Sparkles, RefreshCw
} from 'lucide-react';

const AdminDashboard = () => {
  const { 
    activePage, setActivePage, openDetail, 
    complaintsList, adminStats, statusBreakdown, 
    backendConnected, refreshComplaints, isLoadingComplaints 
  } = useApp();
  
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Department tabs for filtering in Queue view
  const deptFilters = [
    { key: 'All', label: 'All Departments' },
    { key: 'road', label: 'BBMP Road Infra' },
    { key: 'waste', label: 'BBMP Solid Waste' },
    { key: 'water', label: 'BWSSB Water & Drainage' },
    { key: 'streetlight', label: 'BBMP Streetlighting' },
    { key: 'infra', label: 'BESCOM Power' },
  ];

  const filteredComplaints = complaintsList.filter(c => {
    const matchDept = selectedDeptFilter === 'All' 
      || c.dept === selectedDeptFilter 
      || (c.department || '').toLowerCase().includes(selectedDeptFilter);
    const matchSearch = !searchQuery 
      || (c.issue || c.title || '').toLowerCase().includes(searchQuery.toLowerCase())
      || (c.location || '').toLowerCase().includes(searchQuery.toLowerCase())
      || (c.id || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchDept && matchSearch;
  });

  return (
    <div className="civic-page">
      {/* ── Municipal HQ Control Header ── */}
      <div className="civic-page-header">
        <div>
          <div className="indian-civic-badge" style={{ marginBottom: '0.4rem' }}>
            <span className="tricolor-marker" />
            <span>🇮🇳 नगर निगम एवं विभागीय नियंत्रण कक्ष · Municipal Authority & Admin HQ</span>
          </div>
          <h2 className="welcome-text">Operations & <span>Command Center</span></h2>
          <p className="card-sub" style={{ marginTop: '0.25rem', color: '#b45309', fontWeight: 600, fontSize: '0.95rem' }}>
            Unified Grievance Dispatch & 7-Specialist Autonomous AI Triaging
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button 
            onClick={refreshComplaints} 
            className="btn-setting" 
            title="Refresh Complaints from Database"
            disabled={isLoadingComplaints}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem' }}
          >
            <RefreshCw size={14} className={isLoadingComplaints ? 'animate-spin' : ''} />
            <span>{isLoadingComplaints ? 'Syncing...' : 'Sync Database'}</span>
          </button>
          <span className="badge badge-yellow" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.45rem 0.85rem', fontWeight: 700, fontSize: '0.85rem' }}>
            <span className="live-pulsing-dot" />
            {backendConnected ? '7 AI Agents Live' : 'Autonomous Engine Standby'}
          </span>
        </div>
      </div>

      {/* ── Dynamic KPI Stats Bar (Computed from Live Complaints) ── */}
      <div className="stat-grid-4">
        <StatCard
          label="Total Active Complaints"
          value={adminStats.total.toString()}
          change={`${adminStats.pending} pending action`}
          trend={adminStats.total > 0 ? "up" : "neutral"}
          icon={ClipboardList}
          color="#d97706"
        />
        <StatCard
          label="In Progress / Dispatched"
          value={adminStats.inProgress.toString()}
          change="Assigned to field engineers"
          trend="neutral"
          icon={Clock}
          color="#3b82f6"
        />
        <StatCard
          label="Resolved & Verified"
          value={adminStats.resolved.toString()}
          change={adminStats.total ? `${Math.round((adminStats.resolved / adminStats.total) * 100)}% resolution rate` : "0% resolution rate"}
          trend="up"
          icon={CheckCircle2}
          color="#16a34a"
        />
        <StatCard
          label="Critical / Urgent (High SLA)"
          value={adminStats.critical.toString()}
          change="Requires rapid intervention"
          trend={adminStats.critical > 0 ? "up" : "neutral"}
          icon={AlertCircle}
          color="#dc2626"
        />
      </div>

      {/* ── View 1: AI Agent Operations Console ── */}
      {activePage === 'agents' && (
        <AgentConsole />
      )}

      {/* ── View 2: Ward Map & Analytics ── */}
      {activePage === 'map' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <HotspotMap />
          <div className="admin-analytics-grid">
            <DeptPerformance />
            <IssueBreakdown />
          </div>
        </div>
      )}

      {/* ── View 3: Unified Tickets & Priority Queue (Default) ── */}
      {(activePage === 'queue' || activePage === 'overview') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* AI Banner Shortcut */}
          <div 
            className="card admin-ai-engine-banner"
            onClick={() => setActivePage('agents')}
            style={{ cursor: 'pointer' }}
            title="Click to open 7-Specialist AI Operations Console"
          >
            <div className="admin-ai-banner-inner">
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div className="admin-ai-badge-icon">
                  <Bot size={26} color="#1e3a8a" />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#1e3a8a' }}>
                      7-Specialist Autonomous Triaging Engine Active
                    </span>
                    <span className="civic-badge" style={{ background: 'rgba(30, 58, 138, 0.12)', color: '#1e3a8a', fontSize: '0.75rem', fontWeight: 700 }}>
                      Quality Gate Enforced
                    </span>
                  </div>
                  <span style={{ display: 'block', fontSize: '0.85rem', color: '#475569', marginTop: '0.2rem' }}>
                    Incoming citizen grievances are automatically triaged by IssueAgent, EvidenceAgent, SeverityAgent, and routed to BBMP/BWSSB/BESCOM.
                  </span>
                </div>
              </div>
              <button className="btn-secondary" style={{ whiteSpace: 'nowrap', fontSize: '0.875rem', fontWeight: 600 }}>
                <Sparkles size={15} style={{ marginRight: '6px' }} />
                Open AI Console
              </button>
            </div>
          </div>

          {/* Department Filter Bar */}
          <div className="card" style={{ padding: '1rem 1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                {deptFilters.map(df => (
                  <button
                    key={df.key}
                    onClick={() => setSelectedDeptFilter(df.key)}
                    className={`btn-setting ${selectedDeptFilter === df.key ? 'active-filter' : ''}`}
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: selectedDeptFilter === df.key ? 700 : 500,
                      background: selectedDeptFilter === df.key ? '#b45309' : 'var(--white-70)',
                      color: selectedDeptFilter === df.key ? '#fff' : 'var(--text-dark)',
                      padding: '0.45rem 0.9rem',
                      borderRadius: '8px'
                    }}
                  >
                    {df.label}
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="Search tickets by ID, ward, or description..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  padding: '0.5rem 0.9rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(0,0,0,0.12)',
                  background: 'rgba(255,255,255,0.85)',
                  fontSize: '0.875rem',
                  minWidth: '260px'
                }}
              />
            </div>
          </div>

          {/* Priority Queue & Complaint Table */}
          {filteredComplaints.length === 0 ? (
            <div className="card" style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(217, 119, 6, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                <ClipboardList size={28} color="#d97706" />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>No Active Complaints Found</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '460px', margin: '0 auto 1.5rem' }}>
                {searchQuery ? `No complaints match "${searchQuery}".` : 'The grievance queue for this department is currently clear. Citizen submissions will appear here automatically.'}
              </p>
              <button 
                onClick={() => setActivePage('agents')} 
                className="btn-primary" 
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', margin: '0 auto' }}
              >
                <Sparkles size={16} />
                Test AI Agent Ingestion Pipeline
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <PriorityQueue complaints={filteredComplaints} onSelect={openDetail} />
              <ComplaintTable complaints={filteredComplaints} onSelect={openDetail} />
            </div>
          )}

          {/* Recent Live Activity Stream */}
          <ActivityFeed />
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
