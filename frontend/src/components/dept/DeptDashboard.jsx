import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import StatCard from '../shared/StatCard';
import PriorityQueue from './PriorityQueue';
import ComplaintTable from './ComplaintTable';
import HotspotMap from '../admin/HotspotMap';
import AgentConsole from '../admin/AgentConsole';
import { DEPARTMENTS, STATUS } from '../../data/mockData';
import {
  FilePlus2, ClipboardCheck, Timer, Hourglass, CheckCircle2, AlertTriangle,
  Building2, ShieldCheck, Flame, Clock
} from 'lucide-react';

const deptHindiMap = {
  road: 'सड़क एवं गड्ढा मुक्ति प्रकोष्ठ (PWD)',
  waste: 'स्वच्छता एवं ठोस अपशिष्ट प्रबंधन (Nagar Nigam)',
  water: 'राज्य जल आपूर्ति एवं सीवेज बोर्ड',
  drainage: 'जल निकासी एवं नाला सफाई प्रकोष्ठ',
  streetlight: 'विद्युत एवं प्रकाश व्यवस्था (DISCOM)',
  infra: 'सार्वजनिक नागरिक संरचना प्रकोष्ठ',
};

const SECTIONS = ['Priority Queue', 'Department Complaints', 'Ward Heatmap', 'AI Agents (7 विशेषज्ञ)'];

const DeptDashboard = () => {
  const { activeDept, setActiveDept, complaintsList } = useApp();
  const [activeSection, setActiveSection] = useState('Priority Queue');
  const deptInfo = DEPARTMENTS[activeDept] || DEPARTMENTS.road;
  const currentComplaints = complaintsList || [];
  const deptComplaints = currentComplaints.filter(c => c.dept === activeDept);

  const count = (status) => deptComplaints.filter(c => c.status === status).length;
  const newCount  = deptComplaints.filter(c => c.status === STATUS.SUBMITTED).length;
  const escalated = deptComplaints.filter(c => c.status === STATUS.ESCALATED).length;

  return (
    <div className="civic-page">
      {/* ── Authority Workspace Header ── */}
      <div className="civic-page-header">
        <div>
          <div className="indian-civic-badge" style={{ marginBottom: '0.4rem' }}>
            <span className="tricolor-marker" />
            <span>कार्यपालक नियंत्रण · Municipal Field Operations</span>
          </div>
          <h2 className="welcome-text">
            {deptInfo.name} <span>Dispatch</span>
          </h2>
          <p className="card-sub" style={{ marginTop: '0.25rem', color: '#b45309', fontWeight: 600 }}>
            {deptHindiMap[activeDept] || 'नगर निगम विभागीय कार्यभार'}
          </p>
        </div>

        {/* Department Switcher Pills */}
        <div className="dept-switcher-wrap">
          <div className="section-tabs" style={{ flexWrap: 'wrap' }}>
            {Object.values(DEPARTMENTS).map(d => (
              <button 
                key={d.id}
                className={`section-tab ${activeDept === d.id ? 'section-tab-active' : ''}`}
                onClick={() => setActiveDept(d.id)}
              >
                {d.shortName}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── 48-Hour SLA Field Status Banner ── */}
      <div className="card dept-sla-banner">
        <div className="dept-sla-banner-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <ShieldCheck size={20} color="#047857" />
            <div>
              <span style={{ fontWeight: 800, fontSize: '0.875rem' }}>Citizen Charter 48-Hour SLA Mandate</span>
              <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Urgent hazards in {deptInfo.name} must receive on-site dispatch within 12 hours.
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', fontWeight: 700 }}>
            <span className="badge badge-yellow">
              <Clock size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
              Avg Turnaround: 28.4 hrs
            </span>
            {escalated > 0 && (
              <span className="badge badge-dark" style={{ background: '#dc2626', color: '#fff' }}>
                {escalated} SLA Escalated
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── 6-Metric Stat Grid ── */}
      <div className="stat-grid">
        <StatCard icon={<FilePlus2     size={18} strokeWidth={1.75}/>} label="New In Ward"    value={newCount}                          trend="Needs Review"  trendUp={false} />
        <StatCard icon={<ClipboardCheck size={18} strokeWidth={1.75}/>} label="Field Assigned" value={count(STATUS.ASSIGNED)}             trend="Active Duty"   trendUp />
        <StatCard icon={<Timer         size={18} strokeWidth={1.75}/>} label="Under Repair"   value={count(STATUS.IN_PROGRESS)}          trend="On Site"       trendUp />
        <StatCard icon={<Hourglass     size={18} strokeWidth={1.75}/>} label="Verification"   value={count(STATUS.VERIFICATION_PENDING)} trend="Proof Uploaded" trendUp={false} />
        <StatCard icon={<CheckCircle2  size={18} strokeWidth={1.75}/>} label="Resolved"       value={count(STATUS.RESOLVED)}             trend="+12 this week" trendUp />
        <StatCard icon={<AlertTriangle size={18} strokeWidth={1.75}/>} label="SLA Breached"   value={escalated}                         trend="Escalated"     trendUp={false} accent={escalated > 0} />
      </div>

      {/* ── Section Tabs ── */}
      <div className="section-tabs-wrap">
        <div className="section-tabs">
          {SECTIONS.map(s => (
            <button key={s}
              className={`section-tab ${activeSection === s ? 'section-tab-active' : ''}`}
              onClick={() => setActiveSection(s)}
            >
              {s}
              {s === 'Priority Queue' && escalated > 0 && (
                <span className="tab-badge">{escalated}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Views ── */}
      {activeSection === 'Priority Queue'        && <PriorityQueue dept={activeDept} />}
      {activeSection === 'Department Complaints' && <ComplaintTable dept={activeDept} />}
      {activeSection === 'Ward Heatmap'          && <HotspotMap filterDept={activeDept} />}
      {activeSection === 'AI Agents (7 विशेषज्ञ)' && <AgentConsole />}
    </div>
  );
};

export default DeptDashboard;
