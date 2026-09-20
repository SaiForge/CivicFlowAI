import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Camera, Plus, ArrowRight, ShieldCheck, 
  CheckCircle2, Bot, MapPin, Users, 
  Car, Trash2, Droplets, Lightbulb, Waves, ArrowUpRight,
  Sparkles, Award, FileText, AlertCircle, Building, Compass
} from 'lucide-react';

const indianCivicDomains = [
  {
    id: 'road',
    name: 'Roads & Potholes',
    hindi: 'सड़क एवं गड्ढा मुक्ति',
    dept: 'PWD & Municipal Roads',
    icon: Car,
    color: '#b45309',
    bg: 'rgba(217, 119, 6, 0.12)',
    desc: 'Deep potholes, asphalt erosion, broken road dividers & dangerous cave-ins.',
  },
  {
    id: 'waste',
    name: 'Swachhata & Waste',
    hindi: 'स्वच्छता एवं कचरा प्रबंधन',
    dept: 'Nagar Nigam Sanitation',
    icon: Trash2,
    color: '#047857',
    bg: 'rgba(4, 120, 87, 0.12)',
    desc: 'Overflowing roadside dhalavs, uncollected residential waste & open dumping.',
  },
  {
    id: 'water',
    name: 'Jal Board & Pipelines',
    hindi: 'जल आपूर्ति एवं लीकेज',
    dept: 'State Jal Board',
    icon: Droplets,
    color: '#1d4ed8',
    bg: 'rgba(29, 78, 216, 0.12)',
    desc: 'Main pipeline burst, dirty drinking water contamination & low pressure.',
  },
  {
    id: 'streetlights',
    name: 'Vidyut & Streetlights',
    hindi: 'स्ट्रीट लाइट एवं प्रकाश',
    dept: 'DISCOM / Urban Electrics',
    icon: Lightbulb,
    color: '#d97706',
    bg: 'rgba(217, 119, 6, 0.12)',
    desc: 'Non-functional streetlights, dangerous low-hanging wires & dark road spots.',
  },
  {
    id: 'drainage',
    name: 'Nallah & Storm Drainage',
    hindi: 'जल निकासी एवं नाला सफाई',
    dept: 'Drainage Department',
    icon: Waves,
    color: '#0891b2',
    bg: 'rgba(8, 145, 178, 0.12)',
    desc: 'Monsoon waterlogging hotspots, blocked storm drains & overflowing sewers.',
  },
  {
    id: 'infra',
    name: 'Footpaths & Safety',
    hindi: 'फुटपाथ एवं नागरिक सुरक्षा',
    dept: 'Urban Infrastructure',
    icon: Building,
    color: '#7c3aed',
    bg: 'rgba(124, 58, 237, 0.12)',
    desc: 'Broken pedestrian pavements, missing manhole covers & illegal hazards.',
  },
];

const HomePage = () => {
  const { openAuthModal, setRole, setActivePage, setIsAuthenticated } = useApp();

  const handleLaunchRole = (roleName) => {
    setRole(roleName);
    setActivePage('overview');
    setIsAuthenticated(true);
  };

  return (
    <div className="home-container indian-theme-container">
      {/* ── Subtle Indian Tricolor Civic Ribbon at Top ── */}
      <div className="indian-civic-ribbon" aria-hidden="true" />

      {/* ── Background Indian Jali Architectural Lattice Pattern ── */}
      <div className="indian-jali-backdrop" aria-hidden="true" />

      {/* ── Spacious, Uncluttered Navigation Header ── */}
      <header className="header home-header" data-purpose="home-header">
        <div className="logo-group">
          <div className="logo">
            <h1>CivicFlow</h1>
          </div>
          <div className="home-motto-pill hide-mobile">
            <span className="chakra-dot">☸</span>
            <span>नागरिक समाधान · Smart Civic AI</span>
          </div>
        </div>

        {/* Informational Anchor Pills (Spacious & Clean) */}
        <nav className="nav-pills home-nav-pills" aria-label="Home navigation">
          <a href="#about" className="active">Mission</a>
          <a href="#domains">Civic Domains</a>
          <a href="#how-it-works">How It Works</a>
          <a href="#sla">48h SLA Charter</a>
          <a href="#portals">Workspaces</a>
        </nav>

        {/* Just ONE Single, Uncluttered Action Button in Header */}
        <div className="header-actions">
          <button 
            className="civic-btn civic-btn-primary home-auth-cta-btn"
            onClick={() => openAuthModal('login')}
          >
            <span>Citizen Portal / Sign In</span>
            <ArrowRight size={14} strokeWidth={2.2} />
          </button>
        </div>
      </header>

      {/* ── Hero Section (Justifying the Civic Motive & Mission) ── */}
      <section id="about" className="home-hero">
        {/* National Initiative Seal Badge */}
        <div className="indian-civic-badge">
          <span className="tricolor-marker" />
          <span style={{ fontWeight: 700 }}>National Smart Cities Mission · Nagar Nigam Redressal</span>
        </div>

        <h1 className="home-hero-title">
          India’s Autonomous Civic Grievance & <span>Ward Redressal</span> Infrastructure
        </h1>

        <div className="home-hero-motto">
          "स्वच्छ नगर, सुरक्षित सड़कें, पारदर्शी प्रशासन"
        </div>

        <p className="home-hero-subtitle">
          From dangerous potholes on PWD corridors and overflowing garbage dhalavs to 
          Jal Board pipeline bursts and dark streetlights. Snap a geotagged photo, 
          and let 5 autonomous AI agents triage, deduplicate, and route directly to 
          your local municipal ward team with a legally binding 48-Hour SLA.
        </p>

        {/* Hero Actions: Spacious, purposeful CTAs */}
        <div className="home-cta-group">
          <button 
            className="home-primary-cta"
            onClick={() => openAuthModal('signup')}
          >
            <Plus size={18} strokeWidth={2.5} />
            <span>File a Grievance (जन समाधान)</span>
          </button>

          <button 
            className="home-secondary-cta"
            onClick={() => openAuthModal('login')}
          >
            <span>Track Grievance Status</span>
            <ArrowRight size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Trust Indicators */}
        <div className="home-trust-strip">
          <div className="trust-item">
            <ShieldCheck size={16} color="#047857" />
            <span>100% Photographic Proof of Work</span>
          </div>
          <div className="trust-separator">·</div>
          <div className="trust-item">
            <CheckCircle2 size={16} color="#1d4ed8" />
            <span>Automated AI Duplicate Detection</span>
          </div>
          <div className="trust-separator">·</div>
          <div className="trust-item">
            <Award size={16} color="#b45309" />
            <span>48-Hour Citizen Charter SLA</span>
          </div>
        </div>
      </section>

      {/* ── Live National Ward Impact Statistics Strip ── */}
      <section className="home-stats-strip">
        <div className="home-stat-box card">
          <div className="home-stat-val">14,820+</div>
          <div className="home-stat-lbl">Ward Grievances Resolved</div>
          <span className="badge badge-yellow home-stat-trend">↑ 18% this month</span>
        </div>

        <div className="home-stat-box card">
          <div className="home-stat-val">94.8%</div>
          <div className="home-stat-lbl">48-Hour SLA Compliance</div>
          <span className="badge badge-dark home-stat-trend">Zero paper delay</span>
        </div>

        <div className="home-stat-box card">
          <div className="home-stat-val">&lt; 34 hrs</div>
          <div className="home-stat-lbl">Avg Resolution Velocity</div>
          <span className="badge badge-yellow home-stat-trend">⚡ 2.8x faster</span>
        </div>

        <div className="home-stat-box card">
          <div className="home-stat-val">12 Zones</div>
          <div className="home-stat-lbl">Connected Municipal Wards</div>
          <span className="badge badge-dark home-stat-trend">Nagar Nigam live</span>
        </div>
      </section>

      {/* ── Indian Civic Domains (The core focus of Indian civic life) ── */}
      <section id="domains" className="home-section">
        <div className="home-section-header">
          <span className="badge badge-yellow">Municipal Jurisdiction</span>
          <h2 className="home-section-title">Civic Infrastructure Covered</h2>
          <p className="home-section-sub">
            AI agents classify and route grievances directly to the concerned government department.
          </p>
        </div>

        <div className="indian-domains-grid">
          {indianCivicDomains.map((domain) => {
            const Icon = domain.icon;
            return (
              <div 
                key={domain.id}
                className="card domain-card"
                onClick={() => openAuthModal('signup')}
                role="button"
                tabIndex={0}
              >
                <div className="domain-card-header">
                  <div className="domain-icon-box" style={{ background: domain.bg, color: domain.color }}>
                    <Icon size={22} strokeWidth={2} />
                  </div>
                  <span className="domain-dept-badge">{domain.dept}</span>
                </div>
                <h3 className="domain-name">{domain.name}</h3>
                <div className="domain-hindi">{domain.hindi}</div>
                <p className="domain-desc">{domain.desc}</p>
                <div className="domain-cta">
                  <span>Report in this domain</span>
                  <ArrowRight size={13} strokeWidth={2.5} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── How It Works (The 3-Step Indian Civic Process) ── */}
      <section id="how-it-works" className="home-section">
        <div className="home-section-header">
          <span className="badge badge-dark">Transparent Lifecycle</span>
          <h2 className="home-section-title">How CivicFlow Resolves Issues in 3 Steps</h2>
          <p className="home-section-sub">
            From mobile camera to field engineering proof and citizen sign-off.
          </p>
        </div>

        <div className="home-steps-grid">
          {/* Step 1 */}
          <div className="card home-step-card">
            <div className="home-step-num">01</div>
            <div className="home-step-icon" style={{ background: 'rgba(217, 119, 6, 0.14)', color: '#d97706' }}>
              <Camera size={26} strokeWidth={1.8} />
            </div>
            <div className="home-step-tag">Step 1 · नागरिक रिपोर्ट</div>
            <h3 className="home-step-title">Snap & Geotag Proof</h3>
            <p className="home-step-desc">
              Citizens capture photos or short videos of potholes, garbage, or pipe bursts. 
              The system automatically extracts GPS coordinates and pins the municipal ward.
            </p>
          </div>

          {/* Step 2 */}
          <div className="card home-step-card">
            <div className="home-step-num">02</div>
            <div className="home-step-icon" style={{ background: 'rgba(37, 99, 235, 0.14)', color: '#2563eb' }}>
              <Bot size={26} strokeWidth={1.8} />
            </div>
            <div className="home-step-tag">Step 2 · AI स्वचालित प्रेषण</div>
            <h3 className="home-step-title">Autonomous AI Multi-Triage</h3>
            <p className="home-step-desc">
              5 autonomous agents verify damage severity, cluster duplicate reports from neighbors, 
              and instantly assign the ticket directly to the Junior Engineer / Ward Officer.
            </p>
          </div>

          {/* Step 3 */}
          <div className="card home-step-card">
            <div className="home-step-num">03</div>
            <div className="home-step-icon" style={{ background: 'rgba(4, 120, 87, 0.14)', color: '#047857' }}>
              <CheckCircle2 size={26} strokeWidth={1.8} />
            </div>
            <div className="home-step-tag">Step 3 · प्रत्यक्ष प्रमाण व सत्यापन</div>
            <h3 className="home-step-title">Photographic Proof of Work</h3>
            <p className="home-step-desc">
              Municipal field workers must upload before-and-after photo evidence. 
              AI verifies the repair and citizens confirm satisfaction before ticket closure.
            </p>
          </div>
        </div>
      </section>

      {/* ── 48-Hour SLA Charter ── */}
      <section id="sla" className="home-section sla-charter-section">
        <div className="card sla-charter-card">
          <div className="sla-card-content">
            <span className="badge badge-yellow" style={{ alignSelf: 'flex-start' }}>
              Citizen Charter Mandate
            </span>
            <h3 className="sla-title">Guaranteed 48-Hour Municipal Accountability</h3>
            <p className="sla-desc">
              Every complaint is governed by municipal service level agreements (SLAs). 
              If a field unit does not resolve a high-priority hazard within 48 hours, 
              the system automatically escalates the ticket to the Municipal Commissioner and Ward Councillor.
            </p>
            <div className="sla-perks-row">
              <div className="sla-perk">
                <span className="perk-dot">✓</span>
                <span>Automated Senior Escalation</span>
              </div>
              <div className="sla-perk">
                <span className="perk-dot">✓</span>
                <span>Live SMS & WhatsApp Alerts</span>
              </div>
              <div className="sla-perk">
                <span className="perk-dot">✓</span>
                <span>Public Performance Scorecards</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Role Workspaces / Direct Access ── */}
      <section id="portals" className="home-section">
        <div className="home-section-header">
          <span className="badge badge-dark">Live Workspaces</span>
          <h2 className="home-section-title">Explore Role-Based Experiences</h2>
          <p className="home-section-sub">
            Click any portal below to explore the working dashboard interface.
          </p>
        </div>

        <div className="home-portals-grid">
          {/* Citizen Portal */}
          <div className="card home-portal-card" onClick={() => handleLaunchRole('citizen')}>
            <div className="home-portal-header">
              <span className="home-portal-badge citizen">Citizen · नागरिक मंच</span>
              <ArrowUpRight size={18} />
            </div>
            <h3 className="home-portal-title">Citizen Grievance Hub</h3>
            <p className="home-portal-desc">
              File complaints, track progress flow, upvote neighborhood issues, and view ward status on the civic map.
            </p>
            <div className="home-portal-cta">Launch Citizen Workspace →</div>
          </div>

          {/* Department Authority */}
          <div className="card home-portal-card" onClick={() => handleLaunchRole('dept')}>
            <div className="home-portal-header">
              <span className="home-portal-badge dept">Field Authority · कार्यपालक</span>
              <ArrowUpRight size={18} />
            </div>
            <h3 className="home-portal-title">Field Dispatch & Queue</h3>
            <p className="home-portal-desc">
              Assigned queue for Road, Waste, Jal Board, and Streetlight teams. Upload before/after photo proof.
            </p>
            <div className="home-portal-cta">Launch Authority Queue →</div>
          </div>

          {/* Admin Control Centre */}
          <div className="card home-portal-card" onClick={() => handleLaunchRole('admin')}>
            <div className="home-portal-header">
              <span className="home-portal-badge admin">Municipal HQ · नगर निगम</span>
              <ArrowUpRight size={18} />
            </div>
            <h3 className="home-portal-title">Admin Control Centre</h3>
            <p className="home-portal-desc">
              City-wide analytics, AI agent execution traces, hotspot geospatial maps, and SLA breach monitors.
            </p>
            <div className="home-portal-cta">Launch Municipal HQ →</div>
          </div>
        </div>
      </section>

      {/* ── Clean Footer ── */}
      <footer className="home-footer">
        <div className="home-footer-inner">
          <div className="logo-group" style={{ justifyContent: 'center' }}>
            <div className="logo">
              <h1>CivicFlow</h1>
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              भारत Smart Cities AI Platform
            </span>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', maxWidth: '36rem' }}>
            Transforming municipal grievance redressal through autonomous AI multi-agents, 
            geotagged evidence, and citizen-first accountability.
          </p>
          <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.8125rem' }}>
            <button className="home-footer-link" onClick={() => openAuthModal('signup')}>File Grievance</button>
            <button className="home-footer-link" onClick={() => openAuthModal('login')}>Citizen Login</button>
            <button className="home-footer-link" onClick={() => handleLaunchRole('admin')}>Municipal HQ</button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
