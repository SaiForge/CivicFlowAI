import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Header from './components/Header';
import ComplaintDetail from './components/shared/ComplaintDetail';
import ReportForm from './components/citizen/ReportForm';
import HomePage from './components/home/HomePage';
import OnboardingTourModal from './components/home/OnboardingTourModal';
import AuthModal from './components/home/AuthModal';
import IssueProcessingScreen from './components/citizen/IssueProcessingScreen';

// Role dashboards
import AdminDashboard from './components/admin/AdminDashboard';
import DeptDashboard from './components/dept/DeptDashboard';
import CitizenDashboard from './components/citizen/CitizenDashboard';

// ── Error Boundary — catches runtime crashes and renders a visible error ──
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('[CivicFlow ErrorBoundary]', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', fontFamily: 'Inter, system-ui, sans-serif', maxWidth: 720, margin: '3rem auto' }}>
          <h2 style={{ color: '#dc2626', marginBottom: '1rem' }}>Something went wrong</h2>
          <pre style={{ background: '#fef2f2', color: '#991b1b', padding: '1rem', borderRadius: '0.5rem', fontSize: '0.8rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word', border: '1px solid #fecaca' }}>
            {this.state.error?.toString()}
          </pre>
          {this.state.errorInfo && (
            <details style={{ marginTop: '1rem' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Component Stack</summary>
              <pre style={{ background: '#f1f5f9', padding: '1rem', borderRadius: '0.5rem', fontSize: '0.72rem', whiteSpace: 'pre-wrap', marginTop: '0.5rem' }}>
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
          <button onClick={() => { this.setState({ hasError: false, error: null, errorInfo: null }); }} style={{ marginTop: '1rem', padding: '0.5rem 1.25rem', background: '#1e293b', color: '#fff', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: 600 }}>
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Page router per role
const pageComponents = {
  admin: {
    overview:    () => <AdminDashboard />,
    complaints:  () => <AdminDashboard />,
    incidents:   () => <AdminDashboard />,
    departments: () => <AdminDashboard />,
    map:         () => <AdminDashboard />,
    analytics:   () => <AdminDashboard />,
    agents:      () => <AdminDashboard />,
    escalations: () => <AdminDashboard />,
    settings:    () => <AdminDashboard />,
  },
  dept: {
    overview:    () => <DeptDashboard />,
    queue:       () => <DeptDashboard />,
    complaints:  () => <DeptDashboard />,
    incidents:   () => <DeptDashboard />,
    map:         () => <DeptDashboard />,
    resolution:  () => <DeptDashboard />,
    escalations: () => <DeptDashboard />,
    analytics:   () => <DeptDashboard />,
  },
  citizen: {
    overview:    () => <CitizenDashboard />,
    myissues:    () => <CitizenDashboard />,
    nearby:      () => <CitizenDashboard />,
    map:         () => <CitizenDashboard />,
    notifs:      () => <CitizenDashboard />,
    profile:     () => <CitizenDashboard />,
  },
};

const FallbackComponent = () => null;

const AppContent = () => {
  const { role, activePage, reportFormOpen, currentUser } = useApp();

  const isHome = activePage === 'home';

  // Security barrier: Ensure citizens/unauthenticated users can NEVER render admin or dept components
  const effectiveRole = (role === 'admin' && currentUser?.role !== 'admin')
    ? 'citizen'
    : (role === 'dept' && currentUser?.role !== 'admin' && currentUser?.role !== 'dept')
    ? 'citizen'
    : role;

  const PageComponent = (pageComponents[effectiveRole] || pageComponents.citizen)[activePage]
    || pageComponents[effectiveRole]?.overview
    || FallbackComponent;

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

          {/* Header with nav pills — the only navigation */}
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
      <IssueProcessingScreen />
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

