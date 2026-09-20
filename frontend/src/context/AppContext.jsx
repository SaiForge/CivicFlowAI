import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { complaints as initialMockComplaints, DEPARTMENTS } from '../data/mockData';
import agentApi, { SPECIALIST_AGENTS } from '../services/agentApi';

const AppContext = createContext(null);

export const useApp = () => useContext(AppContext);

// Helper to normalize tickets from backend into UI complaint structure
function normalizeTicket(ticket) {
  if (!ticket) return null;
  // If already normalized UI format
  if (ticket.issue && ticket.category) return ticket;

  const issueType = (ticket.issue_type || ticket.category || 'General Civic').replace(/_/g, ' ');
  const capitalizedIssue = issueType.charAt(0).toUpperCase() + issueType.slice(1);

  // Map department string to our internal dept key
  let deptKey = 'road';
  const rawDept = (ticket.department || '').toLowerCase();
  if (rawDept.includes('sanitation') || rawDept.includes('waste')) deptKey = 'waste';
  else if (rawDept.includes('water') || rawDept.includes('sewage') || rawDept.includes('drain')) deptKey = 'water';
  else if (rawDept.includes('elect') || rawDept.includes('light')) deptKey = 'streetlight';
  else if (rawDept.includes('infra') || rawDept.includes('planning')) deptKey = 'infra';

  const loc = ticket.location || {};
  const locationStr = typeof loc === 'string' 
    ? loc 
    : `${loc.area || loc.ward || 'Central Ward'}, ${loc.city || 'Bengaluru'}`;

  // Convert audit trail entries to agentSteps if present
  const agentSteps = (ticket.audit_trail || []).map(entry => ({
    name: entry.agent_name,
    status: entry.success ? 'done' : 'error',
    detail: entry.reasoning || entry.input_summary || 'Processed step',
    ts: entry.timestamp,
    attempt: entry.attempt_number,
    output: entry.output_json,
  }));

  return {
    id: ticket.ticket_id || ticket.id,
    incidentId: ticket.incident_id || `INC-${(ticket.ticket_id || '').slice(-4)}`,
    category: capitalizedIssue,
    issue: capitalizedIssue,
    description: ticket.description || 'Citizen reported public infrastructure issue',
    location: locationStr,
    lat: loc.lat || 12.9783,
    lng: loc.lng || 77.6408,
    ward: loc.ward || 'Indiranagar',
    wardNumber: loc.ward_number || 112,
    priority: ticket.severity || 'Medium',
    status: ticket.status || 'Submitted',
    dept: deptKey,
    assignedOfficer: ticket.assigned_officer || 'Municipal Ward Field Unit',
    supportCount: ticket.support_count || 1,
    dislikeCount: 0,
    reportCount: ticket.report_count || 1,
    citizenId: ticket.citizen_id || 'CITIZEN-DEMO',
    submittedAt: ticket.created_at || new Date().toISOString(),
    lastUpdated: ticket.updated_at || ticket.created_at || new Date().toISOString(),
    hasEvidence: !!ticket.grounding_score,
    images: ticket.image_url ? [ticket.image_url] : [],
    aiClassification: {
      category: capitalizedIssue,
      confidence: ticket.issue_confidence || 0.94,
    },
    aiSeverity: {
      priority: ticket.severity || 'Medium',
      score: ticket.severity_score || 75,
      factorBreakdown: ticket.severity_breakdown || null,
      reasoning: ticket.severity_reasoning || 'Computed via 4-Factor Weighted Rubric.',
    },
    aiVerification: ticket.verification || { approved: true },
    groundingScore: ticket.grounding_score || 0.85,
    retryCount: ticket.retry_count || 0,
    agentSteps: agentSteps.length > 0 ? agentSteps : null,
    timeline: [
      {
        event: 'Complaint submitted by citizen',
        ts: ticket.created_at || new Date().toISOString(),
        actor: ticket.citizen_id || 'Citizen',
      },
      {
        event: '7-Agent Autonomous Triaging Completed',
        ts: ticket.created_at || new Date().toISOString(),
        actor: 'CivicFlow Multi-Agent System',
      },
    ],
    rawTicket: ticket,
  };
}

export const AppProvider = ({ children }) => {
  // Navigation & Role State
  const [role, setRole] = useState('citizen'); // 'admin' | 'dept' | 'citizen'
  const [activePage, setActivePage] = useState('home'); // 'home' | 'overview' | 'agents' | etc.
  const [selectedComplaintId, setSelectedComplaintId] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [reportFormOpen, setReportFormOpen] = useState(false);
  const [activeDept, setActiveDept] = useState('road');

  // Backend Agent Connectivity & Health
  const [backendConnected, setBackendConnected] = useState(false);
  const [agentHealth, setAgentHealth] = useState({
    status: 'checking',
    agents: SPECIALIST_AGENTS.map(a => a.name),
  });

  // Dynamic Complaints Repository
  const [complaintsList, setComplaintsList] = useState(initialMockComplaints);
  const [isProcessingPipeline, setIsProcessingPipeline] = useState(false);

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
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
  useEffect(() => {
    let isMounted = true;

    async function initAgentSystem() {
      const health = await agentApi.checkHealth();
      if (!isMounted) return;

      setBackendConnected(health.connected);
      setAgentHealth(health);

      if (health.connected) {
        const backendTickets = await agentApi.fetchComplaints();
        if (backendTickets.success && Array.isArray(backendTickets.data) && backendTickets.data.length > 0) {
          const normalized = backendTickets.data.map(normalizeTicket).filter(Boolean);
          setComplaintsList(prev => {
            const existingIds = new Set(prev.map(c => c.id));
            const newOnly = normalized.filter(n => !existingIds.has(n.id));
            return [...newOnly, ...prev];
          });
        }
      }
    }

    initAgentSystem();
    return () => { isMounted = false; };
  }, []);

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

  /**
   * Submit complaint to the autonomous multi-agent pipeline
   */
  const submitComplaintViaAgent = useCallback(async (formData) => {
    setIsProcessingPipeline(true);
    try {
      const response = await agentApi.submitComplaint({
        text: formData.description,
        imageBase64: formData.imageBase64,
        audioBase64: formData.audioBase64,
        location: formData.location,
        citizenId: currentUser?.email || 'CITIZEN-PORTAL',
      });

      if (response.success && response.data) {
        const normalized = normalizeTicket(response.data);
        if (normalized) {
          setComplaintsList(prev => [normalized, ...prev]);
        }
        return { success: true, ticket: normalized, raw: response.data, isSimulated: response.isSimulated };
      }
      return { success: false, error: 'Agent pipeline execution returned invalid ticket' };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      setIsProcessingPipeline(false);
    }
  }, [currentUser]);

  /**
   * Rerun ticket verification and self-correction cascade
   */
  const rerunTicketViaAgent = useCallback(async (ticketId) => {
    try {
      const res = await agentApi.rerunComplaint(ticketId);
      if (res.success && res.data) {
        const updated = normalizeTicket(res.data);
        setComplaintsList(prev => prev.map(c => c.id === ticketId ? updated : c));
        return { success: true, ticket: updated };
      }
      return { success: false, error: res.error || 'Rerun failed' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);

  return (
    <AppContext.Provider value={{
      role, setRole,
      activePage, setActivePage,
      selectedComplaintId,
      detailOpen, openDetail, closeDetail,
      reportFormOpen, setReportFormOpen,
      activeDept, setActiveDept,
      // Backend & Multi-Agent Telemetry
      backendConnected,
      agentHealth,
      complaintsList,
      isProcessingPipeline,
      submitComplaintViaAgent,
      rerunTicketViaAgent,
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

export default AppContext;
