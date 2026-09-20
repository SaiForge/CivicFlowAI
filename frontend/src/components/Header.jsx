import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Bell, User, Menu, X, ChevronRight, LogOut, ShieldCheck, CheckCircle2
} from 'lucide-react';

const Header = () => {
  const { 
    role, setRole, activePage, setActivePage, 
    setReportFormOpen, currentUser, logoutUser,
    complaintsList
  } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  // Streamlined 3 primary tabs per role - No duplicate or overcrowded tabs!
  const navTabs = role === 'admin'
    ? [
        { id: 'queue', label: 'Tickets & Priority Queue' },
        { id: 'agents', label: 'AI Agent Operations' },
        { id: 'map', label: 'Ward Map & Analytics' }
      ]
    : [
        { id: 'overview', label: 'My Complaints' },
        { id: 'report', label: 'Report Issue' },
        { id: 'nearby', label: 'Ward Feed' }
      ];

  const handleNavClick = (tabId) => {
    setMobileMenuOpen(false);
    if (tabId === 'report') {
      setReportFormOpen(true);
    } else {
      setActivePage(tabId);
    }
  };

  const toggleRole = () => {
    const nextRole = role === 'admin' ? 'citizen' : 'admin';
    setRole(nextRole);
    setActivePage(nextRole === 'admin' ? 'queue' : 'overview');
  };

  const roleLabel = role === 'admin' ? 'Municipal Admin & Authority' : 'Citizen Portal';

  return (
    <>
      <header className="header" data-purpose="dashboard-header">
        {/* Logo */}
        <div className="logo" onClick={() => setActivePage(role === 'admin' ? 'queue' : 'overview')} style={{ cursor: 'pointer' }}>
          <h1 style={{ fontSize: '1.45rem', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span>CivicFlow</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', background: 'rgba(0,0,0,0.05)', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
              {role === 'admin' ? 'HQ Console' : 'Citizen'}
            </span>
          </h1>
        </div>

        {/* Clean, Focused Main Navigation (Desktop) */}
        <nav className="nav-pills" aria-label="Main navigation">
          {navTabs.map((tab) => {
            const isActive = activePage === tab.id;
            return (
              <a 
                key={tab.id} 
                href="#"
                className={isActive ? 'active' : ''}
                onClick={(e) => { e.preventDefault(); handleNavClick(tab.id); }}
              >
                {tab.label}
              </a>
            );
          })}
        </nav>

        {/* Right Actions: Role Switcher & Profile */}
        <div className="header-actions">
          {/* Direct Role Toggle */}
          <button
            className="btn-setting role-switcher-btn"
            onClick={toggleRole}
            title="Switch between Citizen and Municipal Admin/Authority"
            style={{ fontWeight: 600, fontSize: '0.875rem' }}
          >
            <ShieldCheck size={15} style={{ marginRight: '5px' }} />
            {roleLabel}
          </button>

          {/* User Profile Avatar with Dropdown */}
          <div style={{ position: 'relative' }}>
            <button 
              className="btn-avatar hide-mobile" 
              aria-label="User profile"
              onClick={() => setProfileDropdownOpen(o => !o)}
              title={currentUser?.name || 'My Profile'}
            >
              <User size={18} strokeWidth={2} />
            </button>

            {profileDropdownOpen && (
              <div className="user-dropdown-menu">
                <div style={{ padding: '0.85rem 1.1rem', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{currentUser?.name || 'Aarav Sharma'}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                    {currentUser?.email}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#b45309', fontWeight: 600, marginTop: '2px' }}>
                    {currentUser?.ward || 'Ward 112 - Indiranagar'}
                  </div>
                </div>
                
                <div style={{ padding: '0.4rem' }}>
                  <button 
                    className="dropdown-item"
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      toggleRole();
                    }}
                    style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '0.6rem 0.8rem', cursor: 'pointer', borderRadius: '6px', fontSize: '0.875rem' }}
                  >
                    Switch to {role === 'admin' ? 'Citizen View' : 'Admin & Authority View'}
                  </button>
                  <button 
                    className="dropdown-item logout"
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      logoutUser();
                    }}
                    style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '0.6rem 0.8rem', cursor: 'pointer', borderRadius: '6px', fontSize: '0.875rem', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    <LogOut size={15} /> Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button 
            className="btn-icon show-mobile" 
            aria-label="Toggle menu"
            onClick={() => setMobileMenuOpen(o => !o)}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-drawer show-mobile" style={{ zIndex: 1000 }}>
          <div className="mobile-drawer-header">
            <span style={{ fontWeight: 700, fontSize: '1rem' }}>CivicFlow</span>
            <button className="btn-icon" onClick={() => setMobileMenuOpen(false)}>
              <X size={18} />
            </button>
          </div>
          <div className="mobile-drawer-body">
            {navTabs.map((tab) => (
              <a
                key={tab.id}
                href="#"
                className={`mobile-nav-item ${activePage === tab.id ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); handleNavClick(tab.id); }}
                style={{ fontSize: '1rem', padding: '0.75rem 1rem' }}
              >
                {tab.label}
              </a>
            ))}
            <div style={{ borderTop: '1px solid rgba(0,0,0,0.08)', margin: '0.75rem 0', paddingTop: '0.75rem' }}>
              <button 
                className="btn-primary" 
                style={{ width: '100%', justifyContent: 'center', marginBottom: '0.5rem' }}
                onClick={() => { setMobileMenuOpen(false); toggleRole(); }}
              >
                Switch to {role === 'admin' ? 'Citizen' : 'Admin & Authority'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
