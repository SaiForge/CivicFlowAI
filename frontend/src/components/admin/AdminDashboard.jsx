import React, { useState } from 'react';
import StatCard from '../shared/StatCard';
import IssueBreakdown from './IssueBreakdown';
import ActivityFeed from './ActivityFeed';
import HotspotMap from './HotspotMap';
import DeptPerformance from './DeptPerformance';
import { adminStats, statusBreakdown, incidents } from '../../data/mockData';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../shared/StatusBadge';
import {
  ClipboardList, Clock, CheckCircle2, AlertCircle,
  TrendingUp, ShieldAlert, Bot, ShieldCheck, MapPin, Building2,
  Cpu, ArrowUpRight
} from 'lucide-react';

const totalStatusCount = statusBreakdown.reduce((a, b) => a + b.count, 0);
const SECTIONS = [
  { id: 'Overview', label: 'Overview', hindi: 'सिंहावलोकन' },
  { id: 'Status', label: 'Status Matrix', hindi: 'स्थिति विवरण' },
  { id: 'Hotspot Map', label: 'Ward Hotspots', hindi: 'वार्ड मानचित्र' },
  { id: 'Departments', label: 'Dept Operations', hindi: 'विभागीय दक्षता' },
  { id: 'Incidents', label: 'Incident Clusters', hindi: 'संयुक्त समस्याएं' }
];

const AdminDashboard = () => {
  const { openDetail } = useApp();
  const [activeSection, setActiveSection] = useState('Overview');

  return (
    <div className="civic-page">
      {/* ── Municipal HQ Control Header ── */}
      <div className="civic-page-header">
        <div>
          <div className="indian-civic-badge" style={{ marginBottom: '0.4rem' }}>
            <span className="tricolor-marker" />
            <span>🇮🇳 नगर निगम मुख्यालय · Municipal Corporation HQ</span>
          </div>
          <h2 className="welcome-text">Administrative <span>Command Centre</span></h2>
          <p className="card-sub" style={{ marginTop: '0.25rem', color: '#b45309', fontWeight: 600 }}>
            CivicFlow Multi-Agent AI Monitoring & City-wide Grievance Redressal (नागरिक समाधान एवं नियंत्रण)
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="badge badge-yellow" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.35rem 0.75rem', fontWeight: 700 }}>
            <span className="live-pulsing-dot" /> Live · 5 AI Agents Active
          </span>
        </div>
      </div>

      {/* ── Autonomous AI Triaging Engine Status Banner ── */}
      <div className="card admin-ai-engine-banner">
        <div className="admin-ai-banner-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <div className="admin-ai-badge-icon">
              <Bot size={22} color="#1e3a8a" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1e3a8a' }}>
                  Autonomous Municipal Triaging Engine Active
                </span>
                <span className="civic-badge" style={{ background: 'rgba(30, 58, 138, 0.12)', color: '#1e3a8a', fontSize: '0.625rem', fontWeight: 700 }}>
                  LLM + Computer Vision
                </span>
              </div>
              <span style={{ display: 'block', fontSize: '0.75rem', color: '#475569', marginTop: '0.15rem' }}>
                Automated multi-agent routing: 100% of incoming complaints categorized by severity, duplicate image similarity, and routed to PWD, Nagar Nigam, or Jal Board.
              </span>
            </div>
          </div>
          <div className="admin-ai-stats-strip">
            <div className="ai-stat-mini">
              <span className="ai-stat-val">99.4%</span>
              <span className="ai-stat-lbl">Auto-routed</span>
            </div>
            <div className="ai-stat-mini">
              <span className="ai-stat-val">1.2m</span>
              <span className="ai-stat-lbl">Avg. Triage SLA</span>
            </div>
            <div className="ai-stat-mini">
              <span className="ai-stat-val">0</span>
              <span className="ai-stat-lbl">Unassigned</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Executive Stat Grid ── */}
      <div className="stat-grid">
        <StatCard icon={<ClipboardList size={18} strokeWidth={1.75}/>} label="Total Complaints (कुल शिकायतें)" value={adminStats.total}    trend="+8 today · 24 Wards"       trendUp />
        <StatCard icon={<Clock         size={18} strokeWidth={1.75}/>} label="Active Dispatches (सक्रिय)"          value={adminStats.active}   trend="8 PWD · 5 Nagar Nigam"       trendUp />
        <StatCard icon={<CheckCircle2  size={18} strokeWidth={1.75}/>} label="Verified Resolved (समाधान)"        value={adminStats.resolved} trend="89.4% resolution rate"  trendUp />
        <StatCard icon={<AlertCircle   size={18} strokeWidth={1.75}/>} label="Pending Review (समीक्षा)"         value={adminStats.pending}  trend="Auto-classifying"       trendUp={false} />
        <StatCard icon={<TrendingUp    size={18} strokeWidth={1.75}/>} label="SLA Escalated (उच्चाधिकारी)"       value={adminStats.escalated}trend="Commissioner Alert"      trendUp={false} accent={adminStats.escalated > 0} />
        <StatCard icon={<ShieldAlert   size={18} strokeWidth={1.75}/>} label="Critical Hazards (अति-गंभीर)" value={adminStats.critical} trend="Action within 4h"    trendUp={false} accent />
      </div>

      {/* ── Section Tabs with Bilingual Labels ── */}
      <div className="section-tabs-wrap">
        <div className="section-tabs">
          {SECTIONS.map(s => (
            <button key={s.id}
              className={`section-tab ${activeSection === s.id ? 'section-tab-active' : ''}`}
              onClick={() => setActiveSection(s.id)}
            >
              <span>{s.label}</span>
              <span style={{ fontSize: '0.625rem', opacity: 0.75, fontWeight: 500 }}>({s.hindi})</span>
            </button>
          ))}
        </div>
      </div>

      {activeSection === 'Overview' && (
        <div className="civic-two-col">
          <IssueBreakdown />
          <ActivityFeed />
        </div>
      )}

      {activeSection === 'Status' && (
        <div className="card civic-section-card">
          <div className="card-header" style={{ marginBottom: '1.25rem' }}>
            <div>
              <h4 className="card-title">Complaint Status Matrix & SLA Adherence</h4>
              <span className="card-sub">Real-time lifecycle tracking across all 24 municipal wards</span>
            </div>
            <span className="badge badge-yellow">24 Wards Monitored</span>
          </div>
          <div className="status-overview-grid">
            {statusBreakdown.map(({ status, count }) => {
              const pct = Math.round((count / totalStatusCount) * 100);
              const fillColor = status === 'Escalated' ? '#dc2626'
                : status === 'Resolved' ? '#16a34a'
                : status === 'In Progress' ? '#d97706'
                : 'var(--dark-card)';
              return (
                <div key={status} className="status-ov-item">
                  <div className="status-ov-top">
                    <span className="status-ov-label">{status}</span>
                    <span className="status-ov-count">{count}</span>
                  </div>
                  <div className="progress-bar-wrap" style={{ display: 'block' }}>
                    <div className="progress-bar-fill" style={{ width: `${pct}%`, background: fillColor }} />
                  </div>
                  <span className="status-ov-pct">{pct}% of ward volume</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeSection === 'Hotspot Map' && <HotspotMap />}
      {activeSection === 'Departments' && <DeptPerformance />}

      {activeSection === 'Incidents' && (
        <div className="card civic-section-card">
          <div className="card-header" style={{ marginBottom: '1rem' }}>
            <div>
              <h4 className="card-title">Active Municipal Incident Clusters (संयुक्त नागरिक समस्याएं)</h4>
              <span className="card-sub">AI-deduplicated clusters aggregating multiple citizen reports into single root incidents</span>
            </div>
            <span className="badge badge-dark">Deduplication Engine Active</span>
          </div>
          <div className="incident-list">
            {incidents.map(inc => (
              <div key={inc.id} className="incident-row" onClick={() => openDetail(inc.complaintIds[0])}>
                <div className="incident-id-col">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span className="complaint-id">{inc.id}</span>
                    <span className="civic-ward-tag">Ward 14</span>
                  </div>
                  <span className="civic-badge status-submitted" style={{ fontSize: '0.625rem' }}>{inc.category}</span>
                </div>
                <div className="incident-info">
                  <div className="incident-issue">{inc.issue}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.125rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <MapPin size={12} strokeWidth={2} color="#b45309" />
                    {inc.location}
                  </div>
                </div>
                <div className="incident-stats">
                  <span style={{ fontWeight: 600 }}>{inc.reportCount} reports</span>
                  <span style={{ color: '#b45309', fontWeight: 600 }}>{inc.supportCount} citizen upvotes</span>
                </div>
                <StatusBadge status={inc.status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
