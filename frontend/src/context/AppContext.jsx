import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi, setToken, clearToken } from '../services/api';

const AppContext = createContext(null);

export const useApp = () => useContext(AppContext);

const getSavedUser = () => {
  try {
    const stored = localStorage.getItem('civicflow_user');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

export const AppProvider = ({ children }) => {
  const savedUser = getSavedUser();
  const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('civicflow_token');

  // Navigation & Role State
  const [roleState, setRoleState] = useState(savedUser?.role || 'citizen');
  const [activePage, setActivePage] = useState(savedUser && hasToken ? 'overview' : 'home');
  const [selectedComplaintId, setSelectedComplaintId] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [reportFormOpen, setReportFormOpen] = useState(false);
  const [activeDept, setActiveDept] = useState(savedUser?.dept || 'road');
  const [processingSubmission, setProcessingSubmission] = useState(null);

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(!!(savedUser && hasToken));
  const [currentUser, setCurrentUser] = useState(savedUser);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState('login'); // 'login' | 'signup'
  const [authError, setAuthError] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);

  // ── Real-Time Live Synchronization State & SSE Stream ────────
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const triggerRefresh = () => setRefreshTrigger((prev) => prev + 1);

  useEffect(() => {
    const apiBase = import.meta.env.VITE_API_URL || '';
    let es = null;
    let reconnectTimer = null;

    const connectSse = () => {
      try {
        es = new EventSource(`${apiBase}/api/events`);

        es.addEventListener('update', (e) => {
          try {
            const payload = JSON.parse(e.data);
            console.log('[Realtime SSE] Received civic event:', payload);
            setRefreshTrigger((prev) => prev + 1);
          } catch (err) {
            console.debug('SSE parse error:', err);
          }
        });

        es.addEventListener('connected', () => {
          console.log('[Realtime SSE] Connected to Live Redis Event Stream');
        });

        es.onerror = () => {
          es?.close();
          reconnectTimer = setTimeout(connectSse, 4000);
        };
      } catch (err) {
        console.warn('SSE connection error:', err);
        reconnectTimer = setTimeout(connectSse, 5000);
      }
    };

    connectSse();

    return () => {
      es?.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, []);

  // Role is strictly locked to authenticated user account: no switching between citizen/admin/dept
  const setRole = (newRole) => {
    if (currentUser?.role && newRole !== currentUser.role) {
      console.warn(`Security enforcement: Account is locked to '${currentUser.role}' portal. Please sign out to access a different account.`);
      return;
    }
    if (newRole === 'admin' && currentUser?.role !== 'admin') {
      console.warn('Security enforcement: Normal users cannot access Admin dashboard.');
      return;
    }
    if (newRole === 'dept' && currentUser?.role !== 'dept') {
      console.warn('Security enforcement: Normal users cannot access Authority dashboard.');
      return;
    }
    setRoleState(newRole);
  };

  // ── Restore & Validate Session on Mount via JWT ──────────────
  useEffect(() => {
    const token = localStorage.getItem('civicflow_token');
    if (!token) return;

    authApi.me()
      .then((userProfile) => {
        setCurrentUser(userProfile);
        setIsAuthenticated(true);
        setRoleState(userProfile.role || 'citizen');
        if (userProfile.dept) setActiveDept(userProfile.dept);
        try {
          localStorage.setItem('civicflow_user', JSON.stringify(userProfile));
        } catch {}
      })
      .catch((err) => {
        console.warn('Stored JWT session invalid or expired:', err);
        if (err.status === 401) {
          clearToken();
          try { localStorage.removeItem('civicflow_user'); } catch {}
          setIsAuthenticated(false);
          setCurrentUser(null);
          setRoleState('citizen');
          setActivePage('home');
        }
      });
  }, []);

  // Android-style Onboarding Walkthrough State
  const [onboardingOpen, setOnboardingOpen] = useState(() => {
    try {
      return localStorage.getItem('civicflow_onboarding_dismissed') !== 'true';
    } catch {
      return true;
    }
  });

  const openDetail = (id) => { setSelectedComplaintId(id); setDetailOpen(true); };
  const closeDetail = () => { setDetailOpen(false); setSelectedComplaintId(null); };

  const openAuthModal = (tab = 'login') => {
    setAuthModalTab(tab);
    setAuthError(null);
    setAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setAuthModalOpen(false);
    setAuthError(null);
  };

  // ── Apply authenticated user state ──────────────────────────
  const _applyUser = (userData, token) => {
    setToken(token);
    try {
      localStorage.setItem('civicflow_user', JSON.stringify(userData));
    } catch {}
    setCurrentUser(userData);
    setIsAuthenticated(true);
    setRoleState(userData.role || 'citizen');
    if (userData.dept) setActiveDept(userData.dept);
    setActivePage('overview');
    setAuthModalOpen(false);
    setAuthError(null);
  };

  // ── Real API login ───────────────────────────────────────────
  const loginUser = async (user) => {
    // Demo login (from AuthModal quick-login buttons) — use default demo credentials
    if (user?._demo) {
      setAuthLoading(true);
      try {
        const credMap = {
          citizen: { email: 'citizen@civicflow.gov', pass: 'demo123' },
          dept:    { email: 'dept@civicflow.gov',    pass: 'demo123' },
          admin:   { email: 'admin@civicflow.gov',   pass: 'admin123' },
        };
        const target = credMap[user.role] || credMap.citizen;
        const res = await authApi.login(target.email, target.pass);
        _applyUser({ ...res.user, name: user.name || res.user.name }, res.token);
      } catch (err) {
        // Fallback: set user locally if backend not yet available
        const fallback = {
          name: user.name || 'Demo User',
          email: `${user.role}@civicflow.gov`,
          role: user.role || 'citizen',
          ward: user.ward || 'Ward 14',
        };
        setCurrentUser(fallback);
        setIsAuthenticated(true);
        setRoleState(fallback.role);
        setActivePage('overview');
        setAuthModalOpen(false);
      } finally {
        setAuthLoading(false);
      }
      return;
    }

    // Real form login
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await authApi.login(user.email, user.password);
      _applyUser(res.user, res.token);
    } catch (err) {
      setAuthError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setAuthLoading(false);
    }
  };

  // ── Real API register ────────────────────────────────────────
  const registerUser = async (user) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await authApi.register(
        user.name, user.email, user.password, user.ward, 'citizen'
      );
      _applyUser(res.user, res.token);
      setOnboardingOpen(true);
    } catch (err) {
      // If backend unavailable, degrade gracefully
      if (err.status === 409) {
        setAuthError('This email is already registered. Please sign in instead.');
      } else if (!err.status) {
        // Network error — proceed as local demo
        const fallback = {
          name: user.name || 'New Citizen',
          email: user.email || 'citizen@civicflow.gov.in',
          role: 'citizen',
          ward: user.ward || 'Ward 14, Central Zone',
        };
        setCurrentUser(fallback);
        setIsAuthenticated(true);
        setRoleState('citizen');
        setActivePage('overview');
        setAuthModalOpen(false);
        setOnboardingOpen(true);
      } else {
        setAuthError(err.message || 'Registration failed. Please try again.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const logoutUser = () => {
    clearToken();
    try { localStorage.removeItem('civicflow_user'); } catch {}
    setIsAuthenticated(false);
    setCurrentUser(null);
    setRoleState('citizen');
    setActivePage('home');
  };

  const dismissOnboarding = () => {
    setOnboardingOpen(false);
    try {
      localStorage.setItem('civicflow_onboarding_dismissed', 'true');
    } catch (e) {
      // ignore
    }
  };

  return (
    <AppContext.Provider value={{
      role: currentUser?.role || roleState, setRole,
      activePage, setActivePage,
      selectedComplaintId,
      detailOpen, openDetail, closeDetail,
      reportFormOpen, setReportFormOpen,
      activeDept, setActiveDept,
      processingSubmission, setProcessingSubmission,
      // Auth
      isAuthenticated, setIsAuthenticated,
      currentUser, setCurrentUser,
      authModalOpen, setAuthModalOpen,
      authModalTab, setAuthModalTab,
      authError, authLoading,
      openAuthModal, closeAuthModal,
      loginUser, registerUser, logoutUser,
      // Real-time Live Sync
      refreshTrigger, triggerRefresh,
      // Onboarding
      onboardingOpen, setOnboardingOpen,
      dismissOnboarding,
    }}>
      {children}
    </AppContext.Provider>
  );
};
