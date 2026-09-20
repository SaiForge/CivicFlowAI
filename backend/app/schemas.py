"""
Pydantic schemas for CivicFlowAI Backend API.
Shapes match frontend mockData.js exactly so frontend can hot-swap mock→real.
"""

from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field, EmailStr


# ── Auth ──────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    ward: Optional[str] = "Ward 14, Central Zone"
    role: Optional[str] = "citizen"          # citizen | dept | admin (admin-only)
    dept: Optional[str] = None               # dept users only


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str
    ward: Optional[str] = None
    dept: Optional[str] = None

    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    token: str
    user: Dict[str, Any]


# ── Images ────────────────────────────────────────────────────────────────────

class ImageOut(BaseModel):
    id: int
    complaint_id: str
    mime_type: str
    original_filename: Optional[str]
    image_type: str
    uploaded_at: str
    url: str                                 # /api/complaints/{id}/images/{image_id}


# ── Complaints ────────────────────────────────────────────────────────────────

class LocationInput(BaseModel):
    lat: Optional[float] = None
    lng: Optional[float] = None
    ward: Optional[str] = None
    area: Optional[str] = None
    city: Optional[str] = None


class ComplaintSubmitRequest(BaseModel):
    """Sent by the React ReportForm."""
    category: str
    description: str
    location: str
    details: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    # image_base64 is handled as multipart separately; kept here for JSON path
    image_base64: Optional[str] = None


class ComplaintUpdateRequest(BaseModel):
    """Dept/Admin PATCH: update status, add note, reassign."""
    status: Optional[str] = None
    assigned_officer: Optional[str] = None
    dept: Optional[str] = None
    internal_note: Optional[str] = None
    resolution_evidence: Optional[Dict[str, Any]] = None


class VoteRequest(BaseModel):
    direction: str   # "up" | "down"


class ComplaintOut(BaseModel):
    """Full complaint shape — mirrors mockData.js complaint object."""
    id: str
    incidentId: Optional[str] = None
    category: str
    issue: str
    description: str
    location: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    priority: str
    status: str
    dept: Optional[str] = None
    assignedOfficer: Optional[str] = None
    supportCount: int = 0
    dislikeCount: int = 0
    reportCount: int = 1
    citizenId: Optional[str] = None
    submittedAt: str
    lastUpdated: str
    hasEvidence: bool = False
    images: List[ImageOut] = []
    aiClassification: Optional[Dict[str, Any]] = None
    aiSeverity: Optional[Dict[str, Any]] = None
    agentSteps: List[Dict[str, Any]] = []
    timeline: List[Dict[str, Any]] = []
    resolutionEvidence: Optional[Dict[str, Any]] = None
    aiVerification: Optional[Dict[str, Any]] = None
    internalNotes: List[str] = []

    class Config:
        from_attributes = True


# ── Incidents ─────────────────────────────────────────────────────────────────

class IncidentOut(BaseModel):
    id: str
    issue: str
    category: str
    location: str
    status: str
    priority: str
    reportCount: int
    supportCount: int
    dept: Optional[str] = None
    complaintIds: List[str] = []

    class Config:
        from_attributes = True


# ── Stats ─────────────────────────────────────────────────────────────────────

class AdminStatsOut(BaseModel):
    total: int
    active: int
    resolved: int
    pending: int
    escalated: int
    critical: int


class CategoryBreakdownItem(BaseModel):
    category: str
    count: int
    pct: int


class StatusBreakdownItem(BaseModel):
    status: str
    count: int


class DeptPerformanceItem(BaseModel):
    dept: str
    assigned: int
    inProgress: int
    resolved: int
    pending: int
    escalated: int
    avgResolutionDays: float


class MapMarkerOut(BaseModel):
    id: Union[int, str]
    ticket_id: Optional[str] = None
    category: str
    priority: str = "Medium"
    status: Optional[str] = "Submitted"
    label: str
    location: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    dept: Optional[str] = None
    submitted_at: Optional[str] = None
    has_evidence: bool = False
    count: int = 1
    x: Optional[float] = None
    y: Optional[float] = None


class AreaStatsOut(BaseModel):
    activeNearby: int
    resolvedNearby: int
    inProgress: int
    communityReports: int


# ── Activity Feed ─────────────────────────────────────────────────────────────

class ActivityFeedItem(BaseModel):
    id: int
    type: str
    text: str
    complaintId: Optional[str] = None
    dept: Optional[str] = None
    ts: str
    icon: str


# ── Notifications ─────────────────────────────────────────────────────────────

class NotificationOut(BaseModel):
    id: int
    read: bool
    text: str
    ts: str
    complaint_id: Optional[str] = None

    class Config:
        from_attributes = True


# ── Health ────────────────────────────────────────────────────────────────────

class HealthOut(BaseModel):
    status: str
    backend: str
    database: str
    agent_target: str
