from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field

class LocationInput(BaseModel):
    lat: float
    lng: float
    ward: Optional[str] = None
    area: Optional[str] = None
    city: Optional[str] = None

class ComplaintInput(BaseModel):
    text: Optional[str] = None
    image_base64: Optional[str] = None
    audio_base64: Optional[str] = None
    location: Optional[LocationInput] = None
    citizen_id: Optional[str] = None
    is_sensitive: Optional[bool] = False

    def to_dict(self) -> Dict[str, Any]:
        if hasattr(self, "model_dump"):
            return self.model_dump()
        return self.dict()

class IssueResult(BaseModel):
    issue_type: str = Field(..., description="Category of the civic complaint")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Classification confidence")
    extracted_keywords: List[str] = Field(default_factory=list)
    short_description: str = Field(..., description="One line summary")
    reasoning: str = Field(..., description="Reasoning for category selection")

class EvidenceResult(BaseModel):
    grounding_score: float = Field(..., ge=0.0, le=1.0, description="Support score from evidence")
    text_image_consistent: bool = Field(..., description="Whether text and image agree")
    visual_findings: str = Field(..., description="What image shows or 'no image provided'")
    discrepancies: List[str] = Field(default_factory=list)
    detected_issue: Optional[str] = Field(None, description="Actual physical issue detected in image (e.g. pothole, garbage_dump)")
    category_mismatch: bool = Field(False, description="True if image shows a different issue than claimed category")
    suggested_category: Optional[str] = Field(None, description="Corrected category based on visual ground truth")
    cross_modal_contradiction: bool = Field(False, description="True if citizen text and photo evidence describe contradictory civic defects")
    reasoning: str = Field(..., description="Explanation of grounding score and visual consistency")

class SeverityFactorBreakdown(BaseModel):
    safety_risk: float = Field(0.0, ge=0.0, le=100.0)
    public_impact: float = Field(0.0, ge=0.0, le=100.0)
    recurrence: float = Field(0.0, ge=0.0, le=100.0)
    visual_severity: float = Field(0.0, ge=0.0, le=100.0)

class SeverityResult(BaseModel):
    severity: str = Field(..., description="Low, Medium, High, or Critical")
    severity_score: float = Field(..., ge=0.0, le=100.0)
    factor_breakdown: SeverityFactorBreakdown
    reasoning: str = Field(...)

class RoutingResult(BaseModel):
    primary_department: str = Field(...)
    secondary_department: Optional[str] = None
    jurisdiction_office: Optional[str] = None
    confidence: float = Field(..., ge=0.0, le=1.0)
    reasoning: str = Field(...)

class IncidentResult(BaseModel):
    title: str = Field(...)
    description: str = Field(...)
    category: str = Field(...)
    priority: str = Field(...)
    department: str = Field(...)
    location_summary: str = Field(...)
    citizen_facing_summary: str = Field(...)
    immediate_actions_recommended: List[str] = Field(default_factory=list)
    reasoning: str = Field(default="", description="Reasoning and compilation summary")

class WorkflowResult(BaseModel):
    status: str = Field(default="Submitted")
    follow_up_after_hours: int = Field(...)
    escalation_after_hours: int = Field(...)
    escalation_target: str = Field(...)
    reasoning: str = Field(...)

class VerificationResult(BaseModel):
    approved: bool = Field(...)
    failed_agents: List[str] = Field(default_factory=list)
    feedback: Dict[str, str] = Field(default_factory=dict)
    reasoning: str = Field(...)

class AuditLogEntry(BaseModel):
    id: Optional[int] = None
    ticket_id: str
    agent_name: str
    attempt_number: int
    input_summary: str = ""
    output_json: Dict[str, Any] = Field(default_factory=dict)
    reasoning: str = ""
    success: bool = True
    timestamp: str

class TicketOutput(BaseModel):
    ticket_id: str
    issue_type: str
    description: str
    severity: str
    department: str
    location: Optional[Dict[str, Any]] = None
    status: str
    created_at: str
    verification: Dict[str, Any]
    retry_count: int
    audit_trail: List[Dict[str, Any]] = Field(default_factory=list)
    raw_incident: Optional[Dict[str, Any]] = None
    workflow: Optional[Dict[str, Any]] = None
    severity_score: Optional[float] = None
    severity_breakdown: Optional[Dict[str, Any]] = None
    issue_confidence: Optional[float] = None
    routing_confidence: Optional[float] = None
    grounding_score: Optional[float] = None
    agent_thoughts: Optional[Dict[str, Any]] = None
    category: Optional[str] = None
    category_rectified: Optional[bool] = False
    original_claimed_issue: Optional[str] = None
    rejection_reason: Optional[str] = None

class GeocodeRequest(BaseModel):
    query: str = Field(..., description="Address, area, or landmark string")

class GeocodeResponse(BaseModel):
    lat: float
    lng: float
    formatted_address: str
    ward: str
    ward_number: int
    zone: str
    jurisdiction_office: str

class ReverseGeocodeRequest(BaseModel):
    lat: float
    lng: float

class ReverseGeocodeResponse(BaseModel):
    lat: float
    lng: float
    area: str
    ward: str
    ward_number: int
    zone: str
    city: str
    jurisdiction_office: str
    formatted_address: str

class ProximityCheckRequest(BaseModel):
    lat: float
    lng: float
    radius_meters: float = Field(200.0, description="Search radius in meters")

class ProximityCheckResponse(BaseModel):
    center: Dict[str, float]
    radius_meters: float
    count: int
    nearby_complaints: List[Dict[str, Any]]

