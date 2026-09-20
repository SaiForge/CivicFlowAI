import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { 
  DEPARTMENTS, 
  calculateAdminStats, 
  calculateStatusBreakdown, 
  calculateCategoryBreakdown, 
  calculateDeptPerformance, 
  calculateActivityFeed 
} from '../data/mockData';
import agentApi, { SPECIALIST_AGENTS } from '../services/agentApi';
import { supabaseSignUp, supabaseSignIn, supabaseSignOut, isSupabaseConfigured } from '../services/supabase';

const AppContext = createContext(null);

export const useApp = () => useContext(AppContext);

// Helper to normalize tickets from backend into UI complaint structure
function normalizeTicket(ticket) {
  if (!ticket) return null;
  if (ticket.issue && ticket.category && ticket.aiSeverity) return ticket;

  const issueType = (ticket.category || ticket.issue_type || ticket.title || 'General Civic').replace(/_/g, ' ');
  const capitalizedIssue = issueType.charAt(0).toUpperCase() + issueType.slice(1);

  // Map department string to internal dept key
  let deptKey = 'road';
  const rawDept = (ticket.department || '').toLowerCase();
  if (rawDept.includes('sanitation') || rawDept.includes('waste')) deptKey = 'waste';
  else if (rawDept.includes('water') || rawDept.includes('sewage') || rawDept.includes('drain')) deptKey = 'water';
  else if (rawDept.includes('elect') || rawDept.includes('light')) deptKey = 'streetlight';
  else if (rawDept.includes('infra') || rawDept.includes('power') || rawDept.includes('bescom')) deptKey = 'infra';

  const loc = ticket.location || {};
  const locationStr = typeof loc === 'string' 
    ? loc 
    : (ticket.address || `${loc.area || loc.ward || ticket.ward || 'Central Ward'}, Bengaluru`);

  const agentSteps = (ticket.audit_trail || ticket.trace || []).map(entry => ({
    name: entry.agent_name || entry.name,
    status: entry.status === 'passed' || entry.success ? 'done' : 'error',
    detail: entry.reasoning || entry.input_summary || 'Processed step',
    ts: entry.timestamp || entry.created_at,
    attempt: entry.attempt_number || 1,
    output: entry.output_json || entry.output,
  }));

  const severityVal = (ticket.severity || ticket.priority || 'MEDIUM').toUpperCase();

  return {
    id: ticket.ticket_id || ticket.id || `CMP-${Math.floor(100000 + Math.random() * 900000)}`,
    incidentId: ticket.incident_id || `INC-${(ticket.ticket_id || ticket.id || '').slice(-4)}`,
    category: capitalizedIssue,
    issue: ticket.title || capitalizedIssue,
    description: ticket.description || 'Citizen reported public civic issue',
    location: locationStr,
    lat: ticket.latitude || loc.lat || 12.9783,
    lng: ticket.longitude || loc.lng || 77.6408,
    ward: ticket.ward || loc.ward || 'Ward 112 - Indiranagar',
    wardNumber: ticket.ward_number || loc.ward_number || 112,
    priority: severityVal === 'CRITICAL' ? 'Critical' : severityVal === 'HIGH' ? 'High' : 'Normal',
    status: ticket.status || 'Triaged',
    dept: deptKey,
    department: ticket.department || 'BBMP Road Infrastructure',
    assignedOfficer: ticket.assigned_officer || 'Municipal Ward Field Unit',
    supportCount: ticket.support_count || 1,
    dislikeCount: 0,
    reportCount: ticket.report_count || 1,
    citizenId: ticket.citizen_id || ticket.citizenId || 'CITIZEN-001',
    citizenName: ticket.citizen_name || 'Citizen',
    submittedAt: ticket.created_at || ticket.submittedAt || new Date().toISOString(),
    lastUpdated: ticket.updated_at || ticket.lastUpdated || new Date().toISOString(),
    hasEvidence: !!ticket.image_url || !!ticket.grounding_score,
    images: ticket.image_url ? [ticket.image_url] : [],
    aiClassification: {
      category: capitalizedIssue,
      confidence: ticket.issue_confidence || 0.94,
    },
    aiSeverity: {
      priority: severityVal,
      score: ticket.severity_score || 65,
      factorBreakdown: ticket.severity_breakdown || null,
      reasoning: ticket.severity_reasoning || 'Computed via 4-Factor Weighted Rubric.',
    },
    aiVerification: ticket.verification || { approved: true },
    groundingScore: ticket.grounding_score || 0.90,
    retryCount: ticket.retry_count || 0,
    agentSteps: agentSteps.length > 0 ? agentSteps : null,
    rawTicket: ticket,
  };
}

export const AppProvider = ({ children }) => {
  // Navigation & Role State: 'citizen' or 'admin' (Municipal Admin & Authority)
  const [role, setRole] = useState('citizen');
  const [activePage, setActivePage] = useState('home'); // 'home' | 'overview' | 'agents' | etc.
  const [selectedComplaintId, setSelectedComplaintId] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [reportFormOpen, setReportFormOpen] = useState(false);
  const [activeDept, setActiveDept] = useState('road');

  // Backend Agent Connectivity & Health
  const [backendConnected, setBackendConnected] = useState(false);
  const [supabaseConnected, setSupabaseConnected] = useState(isSupabaseConfigured);
  const [agentHealth, setAgentHealth] = useState({
    status: 'checking',
    agents: SPECIALIST_AGENTS.map(a => a.name),
  });

  // Dynamic Complaints Repository - zero mock data, loads from live backend / database
  const [complaintsList, setComplaintsList] = useState([]);
  const [isLoadingComplaints, setIsLoadingComplaints] = useState(true);
  const [isProcessingPipeline, setIsProcessingPipeline] = useState(false);

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState({
    id: 'CITIZEN-001',
    name: 'Aarav Sharma',
    email: 'citizen@civicflow.gov.in',
    role: 'citizen',
    ward: 'Ward 112 - Indiranagar',
  });
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState('login'); // 'login' | 'signup'

  // Android-style Onboarding Walkthrough State
  const [onboardingOpen, setOnboardingOpen] = useState(() => {
    try {
      return localStorage.getItem('civicflow_onboarding_dismissed') !== 'true';
    } catch {
      return true;
    }
  });

  // Check health and load real tickets on mount
  const refreshComplaints = useCallback(async () => {
    setIsLoadingComplaints(true);
    try {
      const backendTickets = await agentApi.fetchComplaints();
      if (backendTickets.success && Array.isArray(backendTickets.data)) {
        const normalized = backendTickets.data.map(normalizeTicket).filter(Boolean);
        setComplaintsList(normalized);
      }
    } catch (err) {
      console.warn('Failed to refresh complaints:', err);
    } finally {
      setIsLoadingComplaints(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function initSystem() {
      const health = await agentApi.checkHealth();
      if (!isMounted) return;

      setBackendConnected(health.connected);
      setAgentHealth(health);

      await refreshComplaints();
    }

    initSystem();
    return () => { isMounted = false; };
  }, [refreshComplaints]);

  // Derived Dynamic Analytics from Live Complaints
  const adminStats = useMemo(() => calculateAdminStats(complaintsList), [complaintsList]);
  const statusBreakdown = useMemo(() => calculateStatusBreakdown(complaintsList), [complaintsList]);
  const categoryBreakdown = useMemo(() => calculateCategoryBreakdown(complaintsList), [complaintsList]);
  const deptPerformance = useMemo(() => calculateDeptPerformance(complaintsList), [complaintsList]);
  const activityFeed = useMemo(() => calculateActivityFeed(complaintsList), [complaintsList]);

  // Citizen-specific filtered views
  const citizenMyComplaints = useMemo(() => {
    return complaintsList.filter(c => 
      c.citizenId === currentUser?.id || c.citizenName === currentUser?.name
    );
  }, [complaintsList, currentUser]);

  const areaFeed = useMemo(() => {
    const userWard = (currentUser?.ward || '').toLowerCase();
    return complaintsList.filter(c => {
      const cWard = (c.ward || '').toLowerCase();
      return userWard && cWard.includes(userWard.split(' ')[0]);
    });
  }, [complaintsList, currentUser]);

  const openDetail = (id) => { setSelectedComplaintId(id); setDetailOpen(true); };
  const closeDetail = () => { setDetailOpen(false); setSelectedComplaintId(null); };

  const openAuthModal = (tab = 'login') => {
    setAuthModalTab(tab);
    setAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setAuthModalOpen(false);
  };

  const loginUser = async (user) => {
    const res = await supabaseSignIn(user.email, user.password || 'password123');
    const roleTarget = user.email?.includes('admin') || user.role === 'admin' ? 'admin' : 'citizen';
    const userData = {
      id: res.user?.id || `usr-${Date.now()}`,
      name: user?.name || res.user?.full_name || 'Municipal Officer',
      email: user?.email || 'officer@civicflow.gov.in',
      role: roleTarget,
      ward: user?.ward || 'Ward 112 - Indiranagar',
    };
    setCurrentUser(userData);
    setIsAuthenticated(true);
    setRole(roleTarget);
    setActivePage('overview');
    setAuthModalOpen(false);
  };

  const registerUser = async (user) => {
    const res = await supabaseSignUp(user.email, user.password || 'password123', user.name, 'citizen');
    const userData = {
      id: res.user?.id || `usr-${Date.now()}`,
      name: user?.name || 'Citizen',
      email: user?.email || 'citizen@civicflow.gov.in',
      role: 'citizen',
      ward: user?.ward || 'Ward 112 - Indiranagar',
    };
    setCurrentUser(userData);
    setIsAuthenticated(true);
    setRole('citizen');
    setActivePage('overview');
    setAuthModalOpen(false);
    setOnboardingOpen(true);
  };

  const logoutUser = async () => {
    await supabaseSignOut();
    setIsAuthenticated(false);
    setCurrentUser(null);
    setRole('citizen');
    setActivePage('home');
  };

  // Submit Complaint via Multi-Agent System & Save to Supabase
  const submitComplaintViaAgent = async (formData, onProgressUpdate) => {
    setIsProcessingPipeline(true);
    try {
      const res = await agentApi.submitComplaint(formData, onProgressUpdate);
      if (res.success && res.data) {
        const normalized = normalizeTicket(res.data);
        setComplaintsList(prev => [normalized, ...prev]);
        return { success: true, ticket: normalized, trace: res.trace };
      }
      return { success: false, error: res.error };
    } catch (err) {
      console.error('Submit complaint error:', err);
      return { success: false, error: err.message };
    } finally {
      setIsProcessingPipeline(false);
    }
  };

  // Update Status in Supabase / Backend
  const updateComplaintStatus = async (complaintId, newStatus) => {
    try {
      await fetch(`/api/v1/complaints/${complaintId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      setComplaintsList(prev => prev.map(c => c.id === complaintId ? { ...c, status: newStatus } : c));
    } catch (err) {
      console.warn('Status update error:', err);
    }
  };

  // Rerun Quality Gate
  const rerunTicketViaAgent = async (ticketId) => {
    try {
      const res = await agentApi.rerunQualityGate(ticketId);
      if (res.success) {
        setComplaintsList(prev => prev.map(c => {
          if (c.id === ticketId) {
            return {
              ...c,
              status: 'In Progress',
              aiVerification: { approved: true, note: 'Re-verified via Quality Gate' },
            };
          }
          return c;
        }));
        return { success: true };
      }
      return { success: false, error: res.error };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  return (
    <AppContext.Provider
      value={{
        role,
        setRole,
        activePage,
        setActivePage,
        selectedComplaintId,
        detailOpen,
        openDetail,
        closeDetail,
        reportFormOpen,
        setReportFormOpen,
        activeDept,
        setActiveDept,
        backendConnected,
        supabaseConnected,
        agentHealth,
        complaintsList,
        isLoadingComplaints,
        refreshComplaints,
        isProcessingPipeline,
        submitComplaintViaAgent,
        updateComplaintStatus,
        rerunTicketViaAgent,
        // Computed dynamic analytics
        adminStats,
        statusBreakdown,
        categoryBreakdown,
        deptPerformance,
        activityFeed,
        citizenMyComplaints,
        areaFeed,
        // Auth state
        isAuthenticated,
        currentUser,
        loginUser,
        registerUser,
        logoutUser,
        authModalOpen,
        authModalTab,
        openAuthModal,
        closeAuthModal,
        onboardingOpen,
        setOnboardingOpen,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
