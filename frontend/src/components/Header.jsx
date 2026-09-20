import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { citizenNotifications } from '../data/mockData';
import { 
  Bell, User, Menu, X, ChevronRight, LogOut, ShieldCheck
} from 'lucide-react';

const navByRole = {
  admin:   ['Overview', 'Complaints', 'Incidents', 'Departments', 'Civic Map', 'Analytics', 'Escalations'],
  dept:    ['Overview', 'My Queue', 'Complaints', 'Incidents', 'Civic Map', 'Resolution'],
  citizen: ['Overview', 'Report Issue', 'My Complaints', 'Nearby Issues', 'Civic Map', 'Notifications'],
};

const pageIdByLabel = {
  'Overview': 'overview', 'Complaints': 'complaints', 'Incidents': 'incidents',
  'Departments': 'departments', 'Civic Map': 'map', 'Analytics': 'analytics',
  'Escalations': 'escalations', 'My Queue': 'queue', 'Resolution': 'resolution',
  'Report Issue': 'report', 'My Complaints': 'myissues',
  'Nearby Issues': 'nearby', 'Notifications': 'notifs',
};

const roleLabels = { admin: 'Admin', dept: 'Authority', citizen: 'Citizen' };

const Header = () => {
  const { 
    role, activePage, setActivePage, 
    setReportFormOpen, currentUser, logoutUser
  } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const navLinks = navByRole[role] || navByRole.citizen;
  const unread = role === 'citizen' ? citizenNotifications.filter(n => !n.read).length : 0;
  const isAdmin = role === 'admin' || currentUser?.role === 'admin';
  const isDept = role === 'dept' || currentUser?.role === 'dept';

  const handleNavClick = (link) => {
    const pageId = pageIdByLabel[link] || 'overview';
    setMobileMenuOpen(false);
    if (role === 'citizen' && pageId === 'report') {
      setReportFormOpen(true);
    } else {
      setActivePage(pageId);
    }
  };

  return (
    <>
      <header className="header" data-purpose="dashboard-header">
        {/* Logo */}
        <div className="logo">
          <h1>CivicFlow</h1>
        </div>

        {/* Work-Related Nav Pills: ONLY for Citizen Portal (Completely removed from Authority & Admin Panels) */}
        {!isAdmin && !isDept && role === 'citizen' && (
          <nav className="nav-pills" aria-label="Main work navigation">
            {navLinks.map((link) => {
              const pageId = pageIdByLabel[link] || 'overview';
              return (
                <a key={link} href="#"
                  className={activePage === pageId ? 'active' : ''}
                  onClick={(e) => { e.preventDefault(); handleNavClick(link); }}
                >{link}</a>
              );
            })}
          </nav>
        )}

        {/* Right Actions: Read-only Portal Badge, Notification Bell, and Profile */}
        <div className="header-actions">
          {/* Role Portal Indicator: strictly bound to authenticated role */}
          {isAdmin ? (
            <div className="portal-badge-indicator admin-portal-indicator" title="Municipal Administrator Portal">
              <ShieldCheck size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '0.35rem', color: '#16a34a' }} />
              <span>Admin Portal</span>
            </div>
          ) : isDept ? (
            <div className="portal-badge-indicator dept-portal-indicator" title="Department Authority Portal">
              <span className="citizen-portal-dot" style={{ background: '#8b5cf6' }} />
              <span>Authority Portal</span>
            </div>
          ) : (
            <div className="portal-badge-indicator citizen-portal-indicator" title="Citizen Grievance Portal">
              <span className="citizen-portal-dot" />
              <span>Citizen Portal</span>
            </div>
          )}

          {/* Bell */}
          <button className="btn-icon" aria-label="Notifications" style={{ position: 'relative' }}>
            <Bell size={16} strokeWidth={1.75} />
            {unread > 0 && <span className="notif-badge">{unread}</span>}
          </button>

          {/* User Profile Avatar with Dropdown */}
          <div style={{ position: 'relative' }}>
            <button 
              className="btn-avatar hide-mobile" 
              aria-label="User profile"
              onClick={() => setProfileDropdownOpen(o => !o)}
              title={currentUser?.name || 'My Profile'}
            >
              <User size={16} strokeWidth={1.75} />
            </button>

            {profileDropdownOpen && (
              <div className="user-dropdown-menu">
                <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{currentUser?.name || 'Aarav Sharma'}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {currentUser?.ward || 'Ward 14 · Central Zone'}
                  </div>
                  <span className="badge badge-dark" style={{ marginTop: '0.4rem', fontSize: '0.625rem' }}>
                    {roleLabels[role]} Portal
                  </span>
                </div>
                <button 
                  className="user-dropdown-item"
                  onClick={() => { logoutUser(); setProfileDropdownOpen(false); }}
                >
                  <LogOut size={13} />
                  <span>Sign Out to Home</span>
                </button>
              </div>
            )}
          </div>

          {/* Hamburger — mobile only */}
          <button
            className="btn-icon show-mobile"
            onClick={() => setMobileMenuOpen(o => !o)}
            aria-label="Open menu"
          >
            {mobileMenuOpen ? <X size={18} strokeWidth={1.75} /> : <Menu size={18} strokeWidth={1.75} />}
          </button>
        </div>
      </header>

      {/* Mobile Nav Drawer */}
      {mobileMenuOpen && (
        <>
          <div className="mobile-nav-backdrop" onClick={() => setMobileMenuOpen(false)} />
          <nav className="mobile-nav-drawer" aria-label="Mobile navigation">
            <div className="mobile-nav-header">
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {roleLabels[role]} Portal
                </span>
              </div>
              <button
                className="btn-icon"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close menu"
                style={{ width: '2rem', height: '2rem', padding: 0 }}
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
              {!isAdmin && !isDept && role === 'citizen' && navLinks.map((link) => {
                const pageId = pageIdByLabel[link] || 'overview';
                return (
                  <a key={link} href="#"
                    className={`mobile-nav-item ${activePage === pageId ? 'mobile-nav-active' : ''}`}
                    onClick={(e) => { e.preventDefault(); handleNavClick(link); }}
                  >
                    <span>{link}</span>
                    <ChevronRight size={15} strokeWidth={2} style={{ opacity: 0.6 }} />
                  </a>
                );
              })}

              <button
                type="button"
                className="mobile-nav-item"
                onClick={() => { setMobileMenuOpen(false); logoutUser(); }}
                style={{ marginTop: '0.75rem', color: '#dc2626' }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <LogOut size={15} /> Sign Out ({currentUser?.name?.split(' ')[0] || 'User'})
                </span>
              </button>
            </div>
          </nav>
        </>
      )}
    </>
  );
};

export default Header;
