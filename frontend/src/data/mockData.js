// ============================================================
// CivicFlow Mock Data Layer
// Replace these exports with real API calls — nothing else changes.
// ============================================================

// ── Status helpers ──────────────────────────────────────────
export const STATUS = {
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under Review',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In Progress',
  RESOLUTION_SUBMITTED: 'Resolution Submitted',
  VERIFICATION_PENDING: 'Verification Pending',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
  ESCALATED: 'Escalated',
};

export const PRIORITY = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
};

export const CATEGORY = {
  ROAD: 'Road',
  WASTE: 'Waste',
  STREETLIGHT: 'Streetlight',
  WATER: 'Water',
  DRAINAGE: 'Drainage',
  INFRASTRUCTURE: 'Infrastructure',
  OTHER: 'Other',
};

export const DEPARTMENTS = {
  road: { id: 'road', name: 'Road & Infrastructure', shortName: 'Road Dept.' },
  waste: { id: 'waste', name: 'Waste Management', shortName: 'Waste Dept.' },
  water: { id: 'water', name: 'Water Supply', shortName: 'Water Dept.' },
  drainage: { id: 'drainage', name: 'Drainage', shortName: 'Drainage Dept.' },
  streetlight: { id: 'streetlight', name: 'Streetlight', shortName: 'Street Dept.' },
  infra: { id: 'infra', name: 'Public Infrastructure', shortName: 'Infra Dept.' },
};

// ── Complaints ───────────────────────────────────────────────
export const complaints = [
  {
    id: 'CIV-1042', incidentId: 'INC-0321',
    category: CATEGORY.ROAD, issue: 'Pothole',
    description: 'Large pothole near Main Bus Stand causing traffic disruption and vehicle damage.',
    location: 'Near Main Bus Stand, MG Road',
    lat: 28.62, lng: 77.21,
    priority: PRIORITY.HIGH, status: STATUS.IN_PROGRESS,
    dept: 'road', assignedOfficer: 'Rajesh Kumar',
    supportCount: 27, dislikeCount: 2,
    reportCount: 3, citizenId: 'C-001',
    submittedAt: '2024-09-13T08:30:00',
    lastUpdated: '2024-09-14T10:15:00',
    hasEvidence: true,
    images: [],
    aiClassification: { category: 'Road Damage', confidence: 0.94 },
    aiSeverity: { priority: PRIORITY.HIGH, reasoning: 'Large pothole in high-traffic zone. Risk of vehicle damage and accidents.' },
    agentSteps: [
      { name: 'Understanding Agent', status: 'done', detail: 'Identified: Pothole', ts: '2024-09-13T08:31:00' },
      { name: 'Evidence Agent', status: 'done', detail: 'Image contains visible road damage', ts: '2024-09-13T08:31:12' },
      { name: 'Severity Agent', status: 'done', detail: 'Priority: High — High-traffic area', ts: '2024-09-13T08:31:25' },
      { name: 'Incident Agent', status: 'done', detail: 'Matched with 2 existing reports → INC-0321', ts: '2024-09-13T08:31:30' },
      { name: 'Routing Agent', status: 'done', detail: 'Mapped to Road & Infrastructure Dept.', ts: '2024-09-13T08:31:35' },
    ],
    timeline: [
      { event: 'Complaint submitted by citizen', ts: '2024-09-13T08:30:00', actor: 'Citizen A' },
      { event: 'AI classification completed', ts: '2024-09-13T08:31:35', actor: 'CivicFlow AI' },
      { event: 'Assigned to Rajesh Kumar', ts: '2024-09-13T09:00:00', actor: 'Road Dept.' },
      { event: 'Status changed to In Progress', ts: '2024-09-14T10:15:00', actor: 'Rajesh Kumar' },
    ],
    resolutionEvidence: null,
    aiVerification: null,
    internalNotes: ['Crew dispatched on Sept 14 morning.'],
  },
  {
    id: 'CIV-1043', incidentId: 'INC-0321',
    category: CATEGORY.ROAD, issue: 'Pothole',
    description: 'Same pothole on MG Road — deep hole nearly 40cm, water collected inside.',
    location: 'MG Road near Bus Stand Gate 2',
    lat: 28.621, lng: 77.211,
    priority: PRIORITY.HIGH, status: STATUS.ASSIGNED,
    dept: 'road', assignedOfficer: 'Rajesh Kumar',
    supportCount: 12, dislikeCount: 1,
    reportCount: 1, citizenId: 'C-002',
    submittedAt: '2024-09-13T10:20:00',
    lastUpdated: '2024-09-13T12:00:00',
    hasEvidence: true, images: [],
    aiClassification: { category: 'Road Damage', confidence: 0.91 },
    aiSeverity: { priority: PRIORITY.HIGH, reasoning: 'Duplicate of CIV-1042, grouped under INC-0321.' },
    agentSteps: [
      { name: 'Understanding Agent', status: 'done', detail: 'Identified: Pothole', ts: '2024-09-13T10:21:00' },
      { name: 'Evidence Agent', status: 'done', detail: 'Image confirms road damage', ts: '2024-09-13T10:21:15' },
      { name: 'Severity Agent', status: 'done', detail: 'Priority: High', ts: '2024-09-13T10:21:28' },
      { name: 'Incident Agent', status: 'done', detail: 'Matched to existing INC-0321', ts: '2024-09-13T10:21:33' },
      { name: 'Routing Agent', status: 'done', detail: 'Routed to Road Dept.', ts: '2024-09-13T10:21:38' },
    ],
    timeline: [
      { event: 'Complaint submitted', ts: '2024-09-13T10:20:00', actor: 'Citizen B' },
      { event: 'Grouped under INC-0321', ts: '2024-09-13T10:21:33', actor: 'CivicFlow AI' },
      { event: 'Assigned to Rajesh Kumar', ts: '2024-09-13T12:00:00', actor: 'Road Dept.' },
    ],
    resolutionEvidence: null, aiVerification: null, internalNotes: [],
  },
  {
    id: 'CIV-1044', incidentId: 'INC-0322',
    category: CATEGORY.WASTE, issue: 'Overflowing Garbage Bin',
    description: 'Bin near City Market has not been cleared for 4 days. Foul smell and health risk.',
    location: 'City Market, Gandhi Nagar',
    lat: 28.64, lng: 77.20,
    priority: PRIORITY.MEDIUM, status: STATUS.UNDER_REVIEW,
    dept: 'waste', assignedOfficer: null,
    supportCount: 15, dislikeCount: 3,
    reportCount: 1, citizenId: 'C-001',
    submittedAt: '2024-09-14T07:45:00',
    lastUpdated: '2024-09-14T08:00:00',
    hasEvidence: false, images: [],
    aiClassification: { category: 'Waste Management', confidence: 0.88 },
    aiSeverity: { priority: PRIORITY.MEDIUM, reasoning: 'Moderate health risk. Residential area.' },
    agentSteps: [
      { name: 'Understanding Agent', status: 'done', detail: 'Identified: Waste overflow', ts: '2024-09-14T07:46:00' },
      { name: 'Evidence Agent', status: 'done', detail: 'No image provided — text analysis used', ts: '2024-09-14T07:46:10' },
      { name: 'Severity Agent', status: 'done', detail: 'Priority: Medium', ts: '2024-09-14T07:46:20' },
      { name: 'Incident Agent', status: 'done', detail: 'New incident created: INC-0322', ts: '2024-09-14T07:46:25' },
      { name: 'Routing Agent', status: 'done', detail: 'Mapped to Waste Management Dept.', ts: '2024-09-14T07:46:30' },
    ],
    timeline: [
      { event: 'Complaint submitted', ts: '2024-09-14T07:45:00', actor: 'Citizen A' },
      { event: 'AI classification completed', ts: '2024-09-14T07:46:30', actor: 'CivicFlow AI' },
      { event: 'Status: Under Review', ts: '2024-09-14T08:00:00', actor: 'Waste Dept.' },
    ],
    resolutionEvidence: null, aiVerification: null, internalNotes: [],
  },
  {
    id: 'CIV-1045', incidentId: 'INC-0323',
    category: CATEGORY.STREETLIGHT, issue: 'Street Light Not Working',
    description: '3 consecutive street lights on Nehru Road have been non-functional for 2 weeks.',
    location: 'Nehru Road, Sector 5',
    lat: 28.63, lng: 77.22,
    priority: PRIORITY.MEDIUM, status: STATUS.SUBMITTED,
    dept: 'streetlight', assignedOfficer: null,
    supportCount: 8, dislikeCount: 0,
    reportCount: 1, citizenId: 'C-003',
    submittedAt: '2024-09-14T18:30:00',
    lastUpdated: '2024-09-14T18:31:00',
    hasEvidence: false, images: [],
    aiClassification: { category: 'Streetlight', confidence: 0.97 },
    aiSeverity: { priority: PRIORITY.MEDIUM, reasoning: 'Safety risk at night. Residential zone.' },
    agentSteps: [
      { name: 'Understanding Agent', status: 'done', detail: 'Identified: Non-functional streetlights', ts: '2024-09-14T18:30:30' },
      { name: 'Evidence Agent', status: 'done', detail: 'No image — text sufficient', ts: '2024-09-14T18:30:40' },
      { name: 'Severity Agent', status: 'done', detail: 'Priority: Medium', ts: '2024-09-14T18:30:50' },
      { name: 'Incident Agent', status: 'done', detail: 'New incident INC-0323', ts: '2024-09-14T18:30:55' },
      { name: 'Routing Agent', status: 'done', detail: 'Mapped to Streetlight Dept.', ts: '2024-09-14T18:31:00' },
    ],
    timeline: [
      { event: 'Complaint submitted', ts: '2024-09-14T18:30:00', actor: 'Citizen C' },
      { event: 'AI classification completed', ts: '2024-09-14T18:31:00', actor: 'CivicFlow AI' },
    ],
    resolutionEvidence: null, aiVerification: null, internalNotes: [],
  },
  {
    id: 'CIV-1046', incidentId: 'INC-0324',
    category: CATEGORY.WATER, issue: 'Water Leakage',
    description: 'Underground pipe leakage causing water wastage and road damage on Park Street.',
    location: 'Park Street, Block B',
    lat: 28.625, lng: 77.215,
    priority: PRIORITY.CRITICAL, status: STATUS.ESCALATED,
    dept: 'water', assignedOfficer: 'Sunita Sharma',
    supportCount: 34, dislikeCount: 1,
    reportCount: 2, citizenId: 'C-004',
    submittedAt: '2024-09-12T14:00:00',
    lastUpdated: '2024-09-14T09:00:00',
    hasEvidence: true, images: [],
    aiClassification: { category: 'Water Supply', confidence: 0.96 },
    aiSeverity: { priority: PRIORITY.CRITICAL, reasoning: 'Active water waste, road undermining, potential sinkhole risk.' },
    agentSteps: [
      { name: 'Understanding Agent', status: 'done', detail: 'Identified: Underground pipe leak', ts: '2024-09-12T14:01:00' },
      { name: 'Evidence Agent', status: 'done', detail: 'Image confirms water seepage', ts: '2024-09-12T14:01:15' },
      { name: 'Severity Agent', status: 'done', detail: 'Priority: Critical', ts: '2024-09-12T14:01:30' },
      { name: 'Incident Agent', status: 'done', detail: 'New incident INC-0324', ts: '2024-09-12T14:01:35' },
      { name: 'Routing Agent', status: 'done', detail: 'Mapped to Water Supply Dept.', ts: '2024-09-12T14:01:40' },
    ],
    timeline: [
      { event: 'Complaint submitted', ts: '2024-09-12T14:00:00', actor: 'Citizen D' },
      { event: 'AI classification completed', ts: '2024-09-12T14:01:40', actor: 'CivicFlow AI' },
      { event: 'Assigned to Sunita Sharma', ts: '2024-09-12T15:00:00', actor: 'Water Dept.' },
      { event: 'SLA deadline exceeded — Escalated', ts: '2024-09-14T09:00:00', actor: 'System' },
    ],
    resolutionEvidence: null, aiVerification: null, internalNotes: ['Crew dispatched but access blocked by parked vehicles.'],
  },
  {
    id: 'CIV-1047', incidentId: 'INC-0325',
    category: CATEGORY.DRAINAGE, issue: 'Blocked Drain',
    description: 'Storm drain blocked with debris causing flooding on rainy days.',
    location: 'Laxmi Nagar, Lane 4',
    lat: 28.635, lng: 77.218,
    priority: PRIORITY.HIGH, status: STATUS.VERIFICATION_PENDING,
    dept: 'drainage', assignedOfficer: 'Amir Hossain',
    supportCount: 19, dislikeCount: 0,
    reportCount: 1, citizenId: 'C-003',
    submittedAt: '2024-09-11T11:00:00',
    lastUpdated: '2024-09-14T14:30:00',
    hasEvidence: true, images: [],
    aiClassification: { category: 'Drainage', confidence: 0.90 },
    aiSeverity: { priority: PRIORITY.HIGH, reasoning: 'Flood risk in residential area during rain.' },
    agentSteps: [
      { name: 'Understanding Agent', status: 'done', detail: 'Identified: Blocked drain', ts: '2024-09-11T11:01:00' },
      { name: 'Evidence Agent', status: 'done', detail: 'Image shows debris blockage', ts: '2024-09-11T11:01:15' },
      { name: 'Severity Agent', status: 'done', detail: 'Priority: High', ts: '2024-09-11T11:01:28' },
      { name: 'Incident Agent', status: 'done', detail: 'New incident INC-0325', ts: '2024-09-11T11:01:33' },
      { name: 'Routing Agent', status: 'done', detail: 'Mapped to Drainage Dept.', ts: '2024-09-11T11:01:38' },
    ],
    timeline: [
      { event: 'Complaint submitted', ts: '2024-09-11T11:00:00', actor: 'Citizen C' },
      { event: 'Assigned to Amir Hossain', ts: '2024-09-11T14:00:00', actor: 'Drainage Dept.' },
      { event: 'Status: In Progress', ts: '2024-09-12T09:00:00', actor: 'Amir Hossain' },
      { event: 'Resolution evidence uploaded', ts: '2024-09-14T14:30:00', actor: 'Amir Hossain' },
      { event: 'Awaiting AI verification', ts: '2024-09-14T14:31:00', actor: 'CivicFlow AI' },
    ],
    resolutionEvidence: { beforeNote: 'Blocked drain with debris', afterNote: 'Drain cleared and flushed', verificationState: 'awaiting' },
    aiVerification: null,
    internalNotes: ['Cleared with pressure hose on Sept 14.'],
  },
  {
    id: 'CIV-1048', incidentId: 'INC-0326',
    category: CATEGORY.ROAD, issue: 'Road Crack',
    description: 'Wide cracks appearing on the road surface in Koramangala due to subsidence.',
    location: 'Koramangala, 5th Block',
    lat: 28.618, lng: 77.205,
    priority: PRIORITY.MEDIUM, status: STATUS.SUBMITTED,
    dept: 'road', assignedOfficer: null,
    supportCount: 6, dislikeCount: 1,
    reportCount: 1, citizenId: 'C-002',
    submittedAt: '2024-09-14T09:00:00',
    lastUpdated: '2024-09-14T09:01:00',
    hasEvidence: false, images: [],
    aiClassification: { category: 'Road Damage', confidence: 0.82 },
    aiSeverity: { priority: PRIORITY.MEDIUM, reasoning: 'Moderate risk — monitoring needed.' },
    agentSteps: [
      { name: 'Understanding Agent', status: 'done', detail: 'Identified: Road crack', ts: '2024-09-14T09:00:30' },
      { name: 'Evidence Agent', status: 'done', detail: 'No image — text analysis', ts: '2024-09-14T09:00:40' },
      { name: 'Severity Agent', status: 'done', detail: 'Priority: Medium', ts: '2024-09-14T09:00:50' },
      { name: 'Incident Agent', status: 'done', detail: 'New incident INC-0326', ts: '2024-09-14T09:00:55' },
      { name: 'Routing Agent', status: 'done', detail: 'Mapped to Road Dept.', ts: '2024-09-14T09:01:00' },
    ],
    timeline: [
      { event: 'Complaint submitted', ts: '2024-09-14T09:00:00', actor: 'Citizen B' },
      { event: 'AI classification completed', ts: '2024-09-14T09:01:00', actor: 'CivicFlow AI' },
    ],
    resolutionEvidence: null, aiVerification: null, internalNotes: [],
  },
  {
    id: 'CIV-1049', incidentId: 'INC-0327',
    category: CATEGORY.INFRASTRUCTURE, issue: 'Broken Footpath',
    description: 'Footpath tiles broken and uplifted near school zone creating safety hazard.',
    location: 'School Lane, Sector 12',
    lat: 28.629, lng: 77.224,
    priority: PRIORITY.LOW, status: STATUS.RESOLVED,
    dept: 'infra', assignedOfficer: 'Priya Mehta',
    supportCount: 11, dislikeCount: 0,
    reportCount: 1, citizenId: 'C-005',
    submittedAt: '2024-09-10T08:00:00',
    lastUpdated: '2024-09-13T17:00:00',
    hasEvidence: true, images: [],
    aiClassification: { category: 'Infrastructure', confidence: 0.87 },
    aiSeverity: { priority: PRIORITY.LOW, reasoning: 'Safety risk for pedestrians, especially children.' },
    agentSteps: [
      { name: 'Understanding Agent', status: 'done', detail: 'Identified: Broken footpath tiles', ts: '2024-09-10T08:01:00' },
      { name: 'Evidence Agent', status: 'done', detail: 'Image confirms damage', ts: '2024-09-10T08:01:15' },
      { name: 'Severity Agent', status: 'done', detail: 'Priority: Low', ts: '2024-09-10T08:01:28' },
      { name: 'Incident Agent', status: 'done', detail: 'New incident INC-0327', ts: '2024-09-10T08:01:33' },
      { name: 'Routing Agent', status: 'done', detail: 'Mapped to Public Infrastructure Dept.', ts: '2024-09-10T08:01:38' },
    ],
    timeline: [
      { event: 'Complaint submitted', ts: '2024-09-10T08:00:00', actor: 'Citizen E' },
      { event: 'Assigned to Priya Mehta', ts: '2024-09-10T11:00:00', actor: 'Infra Dept.' },
      { event: 'Status: In Progress', ts: '2024-09-11T09:00:00', actor: 'Priya Mehta' },
      { event: 'Resolution evidence uploaded', ts: '2024-09-13T16:00:00', actor: 'Priya Mehta' },
      { event: 'AI verification: Resolved', ts: '2024-09-13T16:05:00', actor: 'CivicFlow AI' },
      { event: 'Status: Resolved', ts: '2024-09-13T17:00:00', actor: 'System' },
    ],
    resolutionEvidence: { beforeNote: 'Broken tiles', afterNote: 'Tiles replaced and footpath restored', verificationState: 'verified' },
    aiVerification: { state: 'verified', detail: 'After image confirms footpath restored. Resolution accepted.' },
    internalNotes: ['Completed ahead of SLA.'],
  },
];

// ── Incidents (grouped complaints) ──────────────────────────
export const incidents = [
  {
    id: 'INC-0321',
    issue: 'Pothole near Main Bus Stand',
    category: CATEGORY.ROAD,
    location: 'MG Road, Near Main Bus Stand',
    status: STATUS.IN_PROGRESS,
    priority: PRIORITY.HIGH,
    reportCount: 3,
    supportCount: 39,
    dept: 'road',
    complaintIds: ['CIV-1042', 'CIV-1043'],
  },
  {
    id: 'INC-0322',
    issue: 'Overflowing Garbage Bin at City Market',
    category: CATEGORY.WASTE,
    location: 'City Market, Gandhi Nagar',
    status: STATUS.UNDER_REVIEW,
    priority: PRIORITY.MEDIUM,
    reportCount: 1,
    supportCount: 15,
    dept: 'waste',
    complaintIds: ['CIV-1044'],
  },
  {
    id: 'INC-0324',
    issue: 'Underground Water Pipe Leak',
    category: CATEGORY.WATER,
    location: 'Park Street, Block B',
    status: STATUS.ESCALATED,
    priority: PRIORITY.CRITICAL,
    reportCount: 2,
    supportCount: 34,
    dept: 'water',
    complaintIds: ['CIV-1046'],
  },
  {
    id: 'INC-0325',
    issue: 'Blocked Storm Drain',
    category: CATEGORY.DRAINAGE,
    location: 'Laxmi Nagar, Lane 4',
    status: STATUS.VERIFICATION_PENDING,
    priority: PRIORITY.HIGH,
    reportCount: 1,
    supportCount: 19,
    dept: 'drainage',
    complaintIds: ['CIV-1047'],
  },
];

// ── Admin Statistics ─────────────────────────────────────────
export const adminStats = {
  total: 124,
  active: 47,
  resolved: 58,
  pending: 23,
  escalated: 5,
  critical: 8,
};

// ── Category breakdown ──────────────────────────────────────
export const categoryBreakdown = [
  { category: 'Road', count: 38, pct: 72 },
  { category: 'Waste', count: 22, pct: 56 },
  { category: 'Water', count: 18, pct: 48 },
  { category: 'Drainage', count: 15, pct: 40 },
  { category: 'Streetlight', count: 12, pct: 32 },
  { category: 'Infrastructure', count: 11, pct: 28 },
  { category: 'Other', count: 8, pct: 20 },
];

// ── Status breakdown ────────────────────────────────────────
export const statusBreakdown = [
  { status: STATUS.SUBMITTED, count: 18 },
  { status: STATUS.UNDER_REVIEW, count: 12 },
  { status: STATUS.ASSIGNED, count: 15 },
  { status: STATUS.IN_PROGRESS, count: 20 },
  { status: STATUS.RESOLUTION_SUBMITTED, count: 7 },
  { status: STATUS.VERIFICATION_PENDING, count: 5 },
  { status: STATUS.RESOLVED, count: 42 },
  { status: STATUS.ESCALATED, count: 5 },
];

// ── Activity Feed ────────────────────────────────────────────
export const activityFeed = [
  { id: 1, type: 'new', text: 'New pothole complaint submitted', complaintId: 'CIV-1048', dept: null, ts: '2 min ago', icon: 'alert' },
  { id: 2, type: 'assign', text: 'Complaint CIV-1042 assigned to Road Department', complaintId: 'CIV-1042', dept: 'Road Dept.', ts: '18 min ago', icon: 'assign' },
  { id: 3, type: 'support', text: '3 citizens supported an existing complaint', complaintId: 'CIV-1046', dept: null, ts: '34 min ago', icon: 'thumbs' },
  { id: 4, type: 'evidence', text: 'Resolution evidence uploaded for drain repair', complaintId: 'CIV-1047', dept: 'Drainage Dept.', ts: '1 hr ago', icon: 'camera' },
  { id: 5, type: 'escalate', text: 'Complaint escalated — SLA expired (48h limit)', complaintId: 'CIV-1046', dept: 'Water Dept.', ts: '2 hr ago', icon: 'escalate' },
  { id: 6, type: 'resolved', text: 'Footpath repair resolved and verified', complaintId: 'CIV-1049', dept: 'Infra Dept.', ts: '3 hr ago', icon: 'check' },
  { id: 7, type: 'new', text: 'New street light complaint submitted', complaintId: 'CIV-1045', dept: null, ts: '4 hr ago', icon: 'alert' },
  { id: 8, type: 'assign', text: 'Water leak CIV-1046 escalated to senior officer', complaintId: 'CIV-1046', dept: 'Water Dept.', ts: '5 hr ago', icon: 'escalate' },
];

// ── Department Performance ───────────────────────────────────
export const deptPerformance = [
  { dept: 'Road & Infrastructure', assigned: 24, inProgress: 8, resolved: 14, pending: 5, escalated: 2, avgResolutionDays: 3.2 },
  { dept: 'Waste Management', assigned: 18, inProgress: 4, resolved: 13, pending: 3, escalated: 0, avgResolutionDays: 1.8 },
  { dept: 'Water Supply', assigned: 15, inProgress: 3, resolved: 10, pending: 4, escalated: 2, avgResolutionDays: 4.5 },
  { dept: 'Drainage', assigned: 12, inProgress: 2, resolved: 9, pending: 2, escalated: 1, avgResolutionDays: 2.9 },
  { dept: 'Streetlight', assigned: 10, inProgress: 3, resolved: 6, pending: 3, escalated: 0, avgResolutionDays: 2.1 },
  { dept: 'Public Infrastructure', assigned: 8, inProgress: 1, resolved: 6, pending: 1, escalated: 0, avgResolutionDays: 3.7 },
];

// ── Hotspot map markers ──────────────────────────────────────
export const mapMarkers = [
  { id: 1, category: CATEGORY.ROAD, x: 38, y: 40, priority: PRIORITY.HIGH, label: 'Pothole cluster (3)', count: 3 },
  { id: 2, category: CATEGORY.WASTE, x: 62, y: 55, priority: PRIORITY.MEDIUM, label: 'Garbage overflow', count: 1 },
  { id: 3, category: CATEGORY.WATER, x: 48, y: 62, priority: PRIORITY.CRITICAL, label: 'Water leak', count: 2 },
  { id: 4, category: CATEGORY.DRAINAGE, x: 55, y: 35, priority: PRIORITY.HIGH, label: 'Blocked drain', count: 1 },
  { id: 5, category: CATEGORY.STREETLIGHT, x: 72, y: 28, priority: PRIORITY.MEDIUM, label: 'Street lights out', count: 1 },
  { id: 6, category: CATEGORY.INFRASTRUCTURE, x: 30, y: 70, priority: PRIORITY.LOW, label: 'Footpath damage', count: 1 },
  { id: 7, category: CATEGORY.ROAD, x: 25, y: 48, priority: PRIORITY.MEDIUM, label: 'Road crack', count: 1 },
];

// ── Citizen's own complaints (citizen C-001) ─────────────────
export const citizenMyComplaints = complaints.filter(c => c.citizenId === 'C-001');

// ── Area feed (other citizens' issues nearby) ────────────────
export const areaFeed = complaints.filter(c => c.citizenId !== 'C-001');

// ── Citizen notifications ────────────────────────────────────
export const citizenNotifications = [
  { id: 1, read: false, text: 'Your complaint CIV-1042 was assigned to Road Department.', ts: '18 min ago' },
  { id: 2, read: false, text: 'Your complaint status changed to In Progress.', ts: '1 hr ago' },
  { id: 3, read: true, text: 'A new civic issue was reported near your area.', ts: '2 hr ago' },
  { id: 4, read: true, text: 'Your complaint CIV-1044 is now Under Review.', ts: '4 hr ago' },
  { id: 5, read: true, text: 'CivicFlow: 5 issues resolved in your area this week.', ts: '1 day ago' },
];

// ── Area statistics for citizen ──────────────────────────────
export const areaStats = {
  activeNearby: 12,
  resolvedNearby: 34,
  inProgress: 5,
  communityReports: 47,
};
