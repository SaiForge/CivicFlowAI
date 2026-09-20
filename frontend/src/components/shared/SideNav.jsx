import React from 'react';
import { useApp } from '../../context/AppContext';

const adminNav = [
  { id: 'overview',     label: 'Overview',        icon: '⊞' },
  { id: 'complaints',   label: 'Complaints',      icon: '📋' },
  { id: 'incidents',    label: 'Incidents',       icon: '🔴' },
  { id: 'departments',  label: 'Departments',     icon: '🏛' },
  { id: 'map',          label: 'Civic Map',       icon: '🗺' },
  { id: 'analytics',   label: 'Analytics',       icon: '📊' },
  { id: 'agents',       label: 'Agent Activity',  icon: '🤖' },
  { id: 'escalations',  label: 'Escalations',     icon: '⚠' },
  { id: 'settings',     label: 'Settings',        icon: '⚙' },
];

const deptNav = [
  { id: 'overview',    label: 'Overview',           icon: '⊞' },
  { id: 'queue',       label: 'My Queue',           icon: '📋' },
  { id: 'complaints',  label: 'Complaints',         icon: '🗂' },
  { id: 'incidents',   label: 'Incidents',          icon: '🔴' },
  { id: 'map',         label: 'Civic Map',          icon: '🗺' },
  { id: 'resolution',  label: 'Resolution Verify',  icon: '✅' },
  { id: 'escalations', label: 'Escalations',        icon: '⚠' },
  { id: 'analytics',  label: 'Dept Analytics',     icon: '📊' },
];

const citizenNav = [
  { id: 'overview',    label: 'Home',           icon: '🏠' },
  { id: 'report',      label: 'Report Issue',   icon: '➕' },
  { id: 'myissues',    label: 'My Complaints',  icon: '📋' },
  { id: 'nearby',      label: 'Nearby Issues',  icon: '📍' },
  { id: 'map',         label: 'Civic Map',      icon: '🗺' },
  { id: 'notifs',      label: 'Notifications',  icon: '🔔' },
  { id: 'profile',     label: 'Profile',        icon: '👤' },
];

const navByRole = { admin: adminNav, dept: deptNav, citizen: citizenNav };

const SideNav = () => {
  const { role, activePage, setActivePage, setReportFormOpen } = useApp();
  const navItems = navByRole[role] || adminNav;

  const handleClick = (item) => {
    if (role === 'citizen' && item.id === 'report') {
      setReportFormOpen(true);
    } else {
      setActivePage(item.id);
    }
  };

  return (
    <aside className="sidenav">
      <div className="sidenav-inner">
        {navItems.map(item => (
          <button
            key={item.id}
            className={`sidenav-item ${activePage === item.id ? 'sidenav-item-active' : ''}`}
            onClick={() => handleClick(item)}
          >
            <span className="sidenav-icon">{item.icon}</span>
            <span className="sidenav-label">{item.label}</span>
          </button>
        ))}
      </div>
    </aside>
  );
};

export default SideNav;
