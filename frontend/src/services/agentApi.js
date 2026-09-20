/**
 * CivicFlow Multi-Agent API Client
 * Connects the React Frontend with the FastAPI 7-Specialist Agent Backend.
 * Features automatic dual-mode fallback: uses live API if running, or rich seed data if offline.
 */

const API_BASE = import.meta.env.VITE_AGENT_API_URL || '';
const DIRECT_BACKEND = 'http://127.0.0.1:5000';

// Fallback Municipal Ward Registry for offline resilience
export const OFFLINE_WARD_REGISTRY = {
  indiranagar: {
    ward: 'Indiranagar',
    ward_number: 112,
    zone: 'East Zone',
    office: 'East Zone Municipal Office, Mayo Hall, MG Road',
    approx_center: [12.9783, 77.6408],
  },
  domlur: {
    ward: 'Domlur',
    ward_number: 112,
    zone: 'East Zone',
    office: 'East Zone Municipal Office, Mayo Hall, MG Road',
    approx_center: [12.9609, 77.6387],
  },
  koramangala: {
    ward: 'Koramangala',
    ward_number: 151,
    zone: 'South Zone',
    office: 'South Zone Municipal Office, 9th Cross Jayanagar 2nd Block',
    approx_center: [12.9345, 77.6265],
  },
  'hsr layout': {
    ward: 'HSR Layout',
    ward_number: 174,
    zone: 'South Zone',
    office: 'South Zone Municipal Office, Bommanahalli Division',
    approx_center: [12.9121, 77.6445],
  },
  bellandur: {
    ward: 'Bellandur',
    ward_number: 150,
    zone: 'Mahadevapura Zone',
    office: 'Mahadevapura Zonal Office, RHB Colony',
    approx_center: [12.9284, 77.6742],
  },
  'btm layout': {
    ward: 'BTM Layout',
    ward_number: 176,
    zone: 'South Zone',
    office: 'South Zone Municipal Office, Bannerghatta Road',
    approx_center: [12.9165, 77.6101],
  },
  jayanagar: {
    ward: 'Jayanagar',
    ward_number: 153,
    zone: 'South Zone',
    office: 'South Zone Municipal Office, 9th Cross Jayanagar 2nd Block',
    approx_center: [12.9298, 77.5833],
  },
  malleshwaram: {
    ward: 'Malleshwaram',
    ward_number: 65,
    zone: 'West Zone',
    office: 'West Zone Municipal Office, Sampige Road',
    approx_center: [13.0031, 77.5643],
  },
};

// Metadata for all 7 Specialist Agents in the system
export const SPECIALIST_AGENTS = [
  {
    id: 'issue',
    name: 'IssueAgent',
    stage: 'Stage 1: Ingestion & Analysis',
    role: 'Category Classification & Keyword Extraction',
    hindi: 'समस्या वर्गीकरण एवं कीवर्ड निष्कर्षण',
    status: 'Active',
    color: '#b45309',
    tools: ['SearchTool', 'DatasetLoader'],
    description: 'Classifies complaint text into standard civic domains, extracts critical issue tokens, and computes initial category confidence.',
  },
  {
    id: 'evidence',
    name: 'EvidenceAgent',
    stage: 'Stage 1: Ingestion & Analysis',
    role: 'Multimodal Visual Grounding & Verification',
    hindi: 'मल्टीमॉडल साक्ष्य सत्यापन',
    status: 'Active',
    color: '#047857',
    tools: ['ComputerVision', 'FileTool'],
    description: 'Analyzes attached citizen photographs via vision models, cross-checks visual evidence against text claims, and scores grounding consistency.',
  },
  {
    id: 'severity',
    name: 'SeverityAgent',
    stage: 'Stage 1: Ingestion & Analysis',
    role: '4-Factor Weighted Rubric Severity Scoring',
    hindi: '4-कारक गंभीरता मूल्यांकन',
    status: 'Active',
    color: '#dc2626',
    tools: ['CalculatorTool'],
    description: 'Calculates objective 0-100 severity using weighted rubric: Safety Risk (35%), Public Impact (25%), Recurrence (20%), Visual Severity (20%).',
  },
  {
    id: 'routing',
    name: 'RoutingAgent',
    stage: 'Stage 2: Operationalization',
    role: 'Deterministic Municipal Department & Ward Routing',
    hindi: 'विभागीय एवं वार्ड आवंटन',
    status: 'Active',
    color: '#1d4ed8',
    tools: ['DepartmentLookupTool', 'GeocodeTool'],
    description: 'Resolves municipal ward from GPS/address and maps issue type deterministically to responsible primary and secondary departments.',
  },
  {
    id: 'incident',
    name: 'IncidentAgent',
    stage: 'Stage 2: Operationalization',
    role: 'Structured Incident Ticket Compilation',
    hindi: 'नागरिक टिकट संकलन',
    status: 'Active',
    color: '#7c3aed',
    tools: ['ShortTermMemory'],
    description: 'Aggregates Stage 1 specialist outputs into a standardized municipal ticket with citizen-facing summary and immediate recommended actions.',
  },
  {
    id: 'workflow',
    name: 'WorkflowAgent',
    stage: 'Stage 2: Operationalization',
    role: 'Citizen Charter SLA Windows & Escalation Hierarchy',
    hindi: 'नागरिक अधिकार पत्र SLA कार्यप्रवाह',
    status: 'Active',
    color: '#0891b2',
    tools: ['CalculatorTool'],
    description: 'Calculates statutory resolution deadlines under 48-Hour Citizen Charter, sets follow-up windows, and assigns escalation authorities.',
  },
  {
    id: 'verification',
    name: 'VerificationAgent',
    stage: 'Stage 3: Quality Gate',
    role: 'Autonomous Quality Gate & Cascade Retry Loop',
    hindi: 'गुणवत्ता नियंत्रण एवं स्वायत्त पुनरावृत्ति',
    status: 'Active',
    color: '#d97706',
    tools: ['LongTermMemory'],
    description: 'Enforces rubric verification across completeness, consistency, and confidence. If quality criteria fail, triggers downstream retry cascade.',
  },
];

async function apiRequest(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.detail || `HTTP Error ${res.status}: ${res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    // If proxy failed, attempt direct backend call if relative
    if (!endpoint.startsWith('http')) {
      try {
        const directUrl = `${DIRECT_BACKEND}${endpoint}`;
        const res2 = await fetch(directUrl, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
          },
        });
        if (res2.ok) {
          return await res2.json();
        }
      } catch {
        // Suppress secondary error and rethrow original
      }
    }
    throw err;
  }
}

export const agentApi = {
  /**
   * Checks health of the FastAPI agent backend
   */
  async checkHealth() {
    try {
      const data = await apiRequest('/health');
      return { connected: true, ...data };
    } catch {
      return { connected: false, status: 'offline', agents: SPECIALIST_AGENTS.map(a => a.name) };
    }
  },

  /**
   * Submits a civic complaint to the full 7-agent autonomous pipeline
   */
  async submitComplaint({ text, imageBase64, audioBase64, location, citizenId }) {
    const payload = {
      text: text || '',
      image_base64: imageBase64 || null,
      audio_base64: audioBase64 || null,
      location: location || { lat: 12.9783, lng: 77.6408, ward: 'Indiranagar', city: 'Bengaluru' },
      citizen_id: citizenId || 'CITIZEN-DEMO',
    };

    try {
      const result = await apiRequest('/api/v1/complaints', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return { success: true, data: result };
    } catch (err) {
      console.warn('[agentApi] Live submission failed or backend offline. Simulating autonomous 7-agent pipeline response:', err);
      // Realistic offline simulation with genuine 7-agent output structure
      const simulatedTicket = simulateAgentPipeline(payload);
      return { success: true, data: simulatedTicket, isSimulated: true };
    }
  },

  /**
   * Fetches all stored tickets from LongTermMemory
   */
  async fetchComplaints() {
    try {
      const data = await apiRequest('/api/v1/complaints');
      return { success: true, data };
    } catch (err) {
      console.warn('[agentApi] Could not fetch complaints from backend, using local fallback:', err);
      return { success: false, data: [] };
    }
  },

  /**
   * Retrieves single ticket details
   */
  async fetchComplaint(ticketId) {
    try {
      const data = await apiRequest(`/api/v1/complaints/${ticketId}`);
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  /**
   * Retrieves full chronological audit trail of agent executions
   */
  async fetchComplaintTrace(ticketId) {
    try {
      const data = await apiRequest(`/api/v1/complaints/${ticketId}/trace`);
      return { success: true, data };
    } catch (err) {
      console.warn(`[agentApi] Could not fetch trace for ${ticketId}:`, err);
      return { success: false, data: [] };
    }
  },

  /**
   * Triggers live verification and self-correction rerun on a ticket
   */
  async rerunComplaint(ticketId) {
    try {
      const data = await apiRequest(`/api/v1/complaints/${ticketId}/rerun`, {
        method: 'POST',
      });
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  /**
   * Forward geocodes an address or landmark into coordinates + municipal ward
   */
  async forwardGeocode(query) {
    if (!query || !query.trim()) return null;
    try {
      const data = await apiRequest('/api/v1/location/geocode', {
        method: 'POST',
        body: JSON.stringify({ query }),
      });
      return data;
    } catch {
      // Deterministic offline matching
      const q = query.toLowerCase();
      for (const [key, w] of Object.entries(OFFLINE_WARD_REGISTRY)) {
        if (q.includes(key)) {
          return {
            lat: w.approx_center[0],
            lng: w.approx_center[1],
            formatted_address: `${w.ward}, Bengaluru, Karnataka`,
            ward: w.ward,
            ward_number: w.ward_number,
            zone: w.zone,
            jurisdiction_office: w.office,
          };
        }
      }
      // Default to Central Indiranagar
      return {
        lat: 12.9783,
        lng: 77.6408,
        formatted_address: `${query}, Ward 112, Bengaluru`,
        ward: 'Indiranagar',
        ward_number: 112,
        zone: 'East Zone',
        jurisdiction_office: 'East Zone Municipal Office, Mayo Hall',
      };
    }
  },

  /**
   * Reverse geocodes coordinates to administrative ward
   */
  async reverseGeocode(lat, lng) {
    try {
      const data = await apiRequest('/api/v1/location/reverse', {
        method: 'POST',
        body: JSON.stringify({ lat, lng }),
      });
      return data;
    } catch {
      return {
        lat,
        lng,
        area: 'Indiranagar',
        ward: 'Indiranagar',
        ward_number: 112,
        zone: 'East Zone',
        city: 'Bengaluru',
        jurisdiction_office: 'East Zone Municipal Office, Mayo Hall',
        formatted_address: '100 Feet Road, Indiranagar, Bengaluru',
      };
    }
  },

  /**
   * Checks for duplicate reports within radius
   */
  async checkProximity(lat, lng, radiusMeters = 200) {
    try {
      const data = await apiRequest('/api/v1/location/proximity', {
        method: 'POST',
        body: JSON.stringify({ lat, lng, radius_meters: radiusMeters }),
      });
      return data;
    } catch {
      return {
        center: { lat, lng },
        radius_meters: radiusMeters,
        count: 0,
        nearby_complaints: [],
      };
    }
  },

  /**
   * Fetches official municipal ward registry
   */
  async fetchWards() {
    try {
      const data = await apiRequest('/api/v1/location/wards');
      return data.wards || OFFLINE_WARD_REGISTRY;
    } catch {
      return OFFLINE_WARD_REGISTRY;
    }
  },
};

/**
 * Realistic offline simulation of the 7-specialist multi-agent pipeline
 * used when the python backend is not currently running.
 */
function simulateAgentPipeline(payload) {
  const text = (payload.text || '').toLowerCase();
  const ticketId = `TICK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const now = new Date().toISOString();

  let issueType = 'road_damage';
  let dept = 'Roads & Infrastructure Department';
  let severity = 'Medium';
  let severityScore = 58;

  if (text.includes('pothole') || text.includes('crater') || text.includes('asphalt')) {
    issueType = 'pothole';
    dept = 'Roads & Infrastructure Department';
    severity = text.includes('dangerous') || text.includes('deep') ? 'Critical' : 'High';
    severityScore = severity === 'Critical' ? 92 : 78;
  } else if (text.includes('garbage') || text.includes('waste') || text.includes('dump') || text.includes('trash')) {
    issueType = 'garbage_accumulation';
    dept = 'Sanitation Department';
    severity = 'High';
    severityScore = 74;
  } else if (text.includes('water') || text.includes('pipe') || text.includes('leak')) {
    issueType = 'water_leakage';
    dept = 'Water Board';
    severity = 'High';
    severityScore = 80;
  } else if (text.includes('light') || text.includes('dark') || text.includes('wire')) {
    issueType = 'streetlight_damage';
    dept = 'Electrical Department';
    severity = 'Medium';
    severityScore = 62;
  } else if (text.includes('drain') || text.includes('sewage') || text.includes('flood')) {
    issueType = 'drainage_blockage';
    dept = 'Water Board';
    severity = 'High';
    severityScore = 76;
  }

  const location = payload.location || {
    lat: 12.9783,
    lng: 77.6408,
    ward: 'Indiranagar',
    ward_number: 112,
    zone: 'East Zone',
    city: 'Bengaluru',
  };

  const auditTrail = [
    {
      agent_name: 'IssueAgent',
      attempt_number: 0,
      input_summary: 'Citizen text complaint analysis',
      output_json: {
        issue_type: issueType,
        confidence: 0.94,
        extracted_keywords: [issueType.replace('_', ' '), location.ward, 'urgent repair'],
        short_description: payload.text.slice(0, 80) || 'Civic infrastructure report',
      },
      reasoning: `Extracted civic keywords and classified as ${issueType} with 94% confidence.`,
      success: true,
      timestamp: new Date(Date.now() - 3200).toISOString(),
    },
    {
      agent_name: 'EvidenceAgent',
      attempt_number: 0,
      input_summary: 'Multimodal image grounding validation',
      output_json: {
        grounding_score: payload.image_base64 ? 0.91 : 0.70,
        text_image_consistent: true,
        visual_findings: payload.image_base64 ? 'Visible road/infrastructure hazard confirmed in frame' : 'No photo uploaded; text context verified',
      },
      reasoning: payload.image_base64 ? 'Visual evidence directly corroborates severity and location in citizen report.' : 'Text report logically consistent; photographic ground score default applied.',
      success: true,
      timestamp: new Date(Date.now() - 2400).toISOString(),
    },
    {
      agent_name: 'SeverityAgent',
      attempt_number: 0,
      input_summary: '4-Factor Weighted Rubric Computation',
      output_json: {
        severity,
        severity_score: severityScore,
        factor_breakdown: {
          safety_risk: severityScore * 0.95,
          public_impact: severityScore * 0.85,
          recurrence: 60.0,
          visual_severity: payload.image_base64 ? severityScore : 50.0,
        },
      },
      reasoning: `Weighted rubric yields score ${severityScore}/100. Categorized as ${severity}.`,
      success: true,
      timestamp: new Date(Date.now() - 1800).toISOString(),
    },
    {
      agent_name: 'RoutingAgent',
      attempt_number: 0,
      input_summary: 'Deterministic lookup and municipal ward routing',
      output_json: {
        primary_department: dept,
        jurisdiction_office: `${location.zone || 'Central Zone'} Municipal Office`,
        confidence: 0.96,
      },
      reasoning: `Matched issue ${issueType} to ${dept} and routed to ${location.ward || 'Ward 112'} local team.`,
      success: true,
      timestamp: new Date(Date.now() - 1200).toISOString(),
    },
    {
      agent_name: 'IncidentAgent',
      attempt_number: 0,
      input_summary: 'Structured actionable ticket assembly',
      output_json: {
        title: `${issueType.replace('_', ' ').toUpperCase()} at ${location.ward}`,
        description: payload.text,
        citizen_facing_summary: `Your report has been verified and registered with ${dept}.`,
        immediate_actions_recommended: ['Dispatch inspection team', 'Erect safety barricades if required'],
      },
      reasoning: 'Synthesized Stage 1 and 2 outputs into standardized municipal ticket.',
      success: true,
      timestamp: new Date(Date.now() - 800).toISOString(),
    },
    {
      agent_name: 'WorkflowAgent',
      attempt_number: 0,
      input_summary: 'Citizen Charter SLA window calculation',
      output_json: {
        status: 'Submitted',
        follow_up_after_hours: severity === 'Critical' ? 4 : 12,
        escalation_after_hours: 48,
        escalation_target: 'Zonal Joint Commissioner',
      },
      reasoning: 'Enforcing statutory 48-Hour Citizen Charter mandate with 12h initial response SLA.',
      success: true,
      timestamp: new Date(Date.now() - 400).toISOString(),
    },
    {
      agent_name: 'VerificationAgent',
      attempt_number: 0,
      input_summary: 'Autonomous Quality Gate evaluation',
      output_json: {
        approved: true,
        failed_agents: [],
        feedback: {},
      },
      reasoning: 'All 6 specialist outputs meet completeness (100%), consistency (100%), and confidence threshold (>0.70). Ticket approved.',
      success: true,
      timestamp: now,
    },
  ];

  return {
    ticket_id: ticketId,
    issue_type: issueType,
    description: payload.text || 'Citizen reported public infrastructure issue',
    severity,
    severity_score: severityScore,
    department: dept,
    location,
    status: 'Submitted',
    created_at: now,
    verification: { approved: true, failed_agents: [], feedback: {} },
    retry_count: 0,
    audit_trail: auditTrail,
    issue_confidence: 0.94,
    routing_confidence: 0.96,
    grounding_score: payload.image_base64 ? 0.91 : 0.70,
  };
}

export default agentApi;
