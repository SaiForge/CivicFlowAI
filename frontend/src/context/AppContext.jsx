import React, { createContext, useContext, useState } from 'react';

const AppContext = createContext(null);

export const useApp = () => useContext(AppContext);

export const AppProvider = ({ children }) => {
  // Navigation & Role State
  const [role, setRole] = useState('citizen'); // 'admin' | 'dept' | 'citizen'
  const [activePage, setActivePage] = useState('home'); // 'home' | 'overview' | etc.
  const [selectedComplaintId, setSelectedComplaintId] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [reportFormOpen, setReportFormOpen] = useState(false);
  const [activeDept, setActiveDept] = useState('road');

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState('login'); // 'login' | 'signup'

  // Android-style Onboarding Walkthrough State (automated on 1st open or after registration)
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
    setAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setAuthModalOpen(false);
  };

  const loginUser = (user) => {
    const userData = {
      name: user?.name || 'Aarav Sharma',
      email: user?.email || 'citizen@civicflow.gov.in',
      role: user?.role || 'citizen',
      ward: user?.ward || 'Ward 14, MG Road Area',
    };
    setCurrentUser(userData);
    setIsAuthenticated(true);
    setRole(userData.role);
    setActivePage('overview');
    setAuthModalOpen(false);
  };

  const registerUser = (user) => {
    const userData = {
      name: user?.name || 'New Citizen',
      email: user?.email || 'citizen@civicflow.gov.in',
      role: 'citizen',
      ward: user?.ward || 'Ward 14, Central Zone',
    };
    setCurrentUser(userData);
    setIsAuthenticated(true);
    setRole('citizen');
    setActivePage('overview');
    setAuthModalOpen(false);
    // Automatically trigger onboarding walkthrough for newly registered users!
    setOnboardingOpen(true);
  };

  const logoutUser = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
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
      role, setRole,
      activePage, setActivePage,
      selectedComplaintId,
      detailOpen, openDetail, closeDetail,
      reportFormOpen, setReportFormOpen,
      activeDept, setActiveDept,
      // Auth
      isAuthenticated, setIsAuthenticated,
      currentUser, setCurrentUser,
      authModalOpen, setAuthModalOpen,
      authModalTab, setAuthModalTab,
      openAuthModal, closeAuthModal,
      loginUser, registerUser, logoutUser,
      // Onboarding
      onboardingOpen, setOnboardingOpen,
      dismissOnboarding,
    }}>
      {children}
    </AppContext.Provider>
  );
};
