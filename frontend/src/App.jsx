import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Header from './components/Header';
import ComplaintDetail from './components/shared/ComplaintDetail';
import ReportForm from './components/citizen/ReportForm';
import HomePage from './components/home/HomePage';
import OnboardingTourModal from './components/home/OnboardingTourModal';
import AuthModal from './components/home/AuthModal';

// Role dashboards: Unified Admin & Authority Dashboard, and Citizen Dashboard
import AdminDashboard from './components/admin/AdminDashboard';
import CitizenDashboard from './components/citizen/CitizenDashboard';

// Streamlined page router
const pageComponents = {
  admin: {
    overview:   () => <AdminDashboard />,
    queue:      () => <AdminDashboard />,
    agents:     () => <AdminDashboard />,
    map:        () => <AdminDashboard />,
    complaints: () => <AdminDashboard />,
  },
  citizen: {
    overview: () => <CitizenDashboard />,
    myissues: () => <CitizenDashboard />,
    nearby:   () => <CitizenDashboard />,
    report:   () => <CitizenDashboard />,
  },
};

const AppContent = () => {
  const { role, activePage, reportFormOpen } = useApp();

  const isHome = activePage === 'home';
  const roleKey = role === 'admin' || role === 'dept' ? 'admin' : 'citizen';

  const PageComponent = pageComponents[roleKey][activePage]
    || pageComponents[roleKey].overview
    || (() => null);

  return (
    <div className={`dashboard ${isHome ? 'dashboard-home' : 'dashboard-workspace'}`}>
      {/* If on home, render the HomePage; otherwise render dashboard workspace with Indian theme */}
      {isHome ? (
        <HomePage />
      ) : (
        <div className="dashboard-inner-wrap">
          {/* Subtle Indian Tricolor Civic Ribbon at Top */}
          <div className="indian-civic-ribbon" aria-hidden="true" style={{ marginBottom: '0.5rem' }} />

          {/* Background Indian Jali Architectural Lattice Pattern */}
          <div className="indian-jali-backdrop" aria-hidden="true" />

          {/* Header with clean navigation pills — the only navigation */}
          <Header />

          {/* Full-width content area, no sidebar */}
          <div className="civic-content">
            <PageComponent />
          </div>
        </div>
      )}

      {/* Global modals */}
      <ComplaintDetail />
      {reportFormOpen && <ReportForm />}
      <AuthModal />
      <OnboardingTourModal />
    </div>
  );
};

const App = () => (
  <AppProvider>
    <AppContent />
  </AppProvider>
);

export default App;
