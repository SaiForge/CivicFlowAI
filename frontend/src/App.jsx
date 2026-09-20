import React, { Component } from 'react';
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

// Error Boundary to prevent white screen of death
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("CivicFlow React ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '3rem 2rem', textAlign: 'center', maxWidth: '600px', margin: '4rem auto', background: '#fff', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#dc2626', marginBottom: '1rem' }}>
            Application Notice
          </h2>
          <p style={{ color: '#475569', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
            A rendering exception occurred ({this.state.error?.message || 'Unknown error'}). Click below to reset to the portal view.
          </p>
          <button 
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.href = '/';
            }}
            style={{ padding: '0.7rem 1.5rem', background: '#b45309', color: '#fff', border: 'none', borderRadius: '9999px', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }}
          >
            Reload CivicFlow
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const AppContent = () => {
  const { role, activePage, reportFormOpen } = useApp();

  const isHome = activePage === 'home';
  const isAdmin = role === 'admin' || role === 'dept';

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
            {isAdmin ? <AdminDashboard /> : <CitizenDashboard />}
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
  <ErrorBoundary>
    <AppProvider>
      <AppContent />
    </AppProvider>
  </ErrorBoundary>
);

export default App;
