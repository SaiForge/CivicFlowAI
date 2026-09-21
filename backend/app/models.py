"""
SQLAlchemy ORM models for CivicFlowAI Backend.
Schema mirrors the frontend mockData.js shapes exactly.
"""

import json
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, Float,
    DateTime, ForeignKey, LargeBinary, Enum as SAEnum
)
from sqlalchemy.orm import relationship
from app.database import Base


# ── Enums ─────────────────────────────────────────────────────────────────────

ROLES = ("citizen", "dept", "admin")
STATUSES = (
    "Submitted", "Under Review", "Assigned", "In Progress",
    "Resolution Submitted", "Verification Pending", "Resolved",
    "Closed", "Escalated", "Rejected",
)
PRIORITIES = ("Low", "Medium", "High", "Critical")
CATEGORIES = ("Road", "Waste", "Streetlight", "Water", "Drainage", "Infrastructure", "Other")
DEPARTMENTS = ("road", "waste", "water", "drainage", "streetlight", "infra", "other")


# ── Users ─────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    name          = Column(String(256), nullable=False)
    email         = Column(String(256), unique=True, nullable=False, index=True)
    password_hash = Column(String(512), nullable=False)
    role          = Column(SAEnum(*ROLES, name="user_role"), nullable=False, default="citizen")
    ward          = Column(String(256), default="Ward 14, Central Zone")
    dept          = Column(SAEnum(*DEPARTMENTS, name="user_dept"), nullable=True)
    created_at    = Column(DateTime, default=datetime.utcnow)

    complaints    = relationship("Complaint", back_populates="citizen", foreign_keys="Complaint.citizen_id")
    notifications = relationship("Notification", back_populates="user")


# ── Complaints ────────────────────────────────────────────────────────────────

class Complaint(Base):
    __tablename__ = "complaints"

    id               = Column(String(32), primary_key=True)         # CIV-XXXX
    incident_id      = Column(String(32), nullable=True, index=True) # INC-XXXX
    category         = Column(SAEnum(*CATEGORIES, name="complaint_category"), nullable=False)
    issue            = Column(String(256), nullable=False)
    description      = Column(Text, nullable=False)
    location         = Column(String(512), nullable=False)
    lat              = Column(Float, nullable=True)
    lng              = Column(Float, nullable=True)
    priority         = Column(SAEnum(*PRIORITIES, name="complaint_priority"), default="Medium")
    status           = Column(SAEnum(*STATUSES, name="complaint_status"), default="Submitted")
    dept             = Column(SAEnum(*DEPARTMENTS, name="complaint_dept"), nullable=True)
    assigned_officer = Column(String(256), nullable=True)
    is_sensitive     = Column(Boolean, default=False)

    # Civic engagement
    support_count    = Column(Integer, default=0)
    dislike_count    = Column(Integer, default=0)
    report_count     = Column(Integer, default=1)

    # Ownership
    citizen_id       = Column(Integer, ForeignKey("users.id"), nullable=True)
    citizen          = relationship("User", back_populates="complaints", foreign_keys=[citizen_id])

    # AI / Agent outputs (stored as JSON strings)
    ai_classification_json = Column(Text, nullable=True)  # {category, confidence}
    ai_severity_json       = Column(Text, nullable=True)  # {priority, reasoning}
    agent_steps_json       = Column(Text, default="[]")   # [{name, status, detail, ts}]
    timeline_json          = Column(Text, default="[]")   # [{event, ts, actor}]
    resolution_evidence_json = Column(Text, nullable=True) # {beforeNote, afterNote, verificationState}
    ai_verification_json   = Column(Text, nullable=True)  # {state, detail}
    agent_thoughts_json    = Column(Text, nullable=True)  # {issue, evidence, severity, routing, verification}
    internal_notes_json    = Column(Text, default="[]")   # [str]

    submitted_at     = Column(DateTime, default=datetime.utcnow)
    last_updated     = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    images           = relationship("ComplaintImage", back_populates="complaint", cascade="all, delete-orphan")

    # ── JSON helpers ──────────────────────────────────────────────────────────

    @property
    def ai_classification(self):
        return json.loads(self.ai_classification_json) if self.ai_classification_json else None

    @ai_classification.setter
    def ai_classification(self, value):
        self.ai_classification_json = json.dumps(value) if value else None

    @property
    def ai_severity(self):
        return json.loads(self.ai_severity_json) if self.ai_severity_json else None

    @ai_severity.setter
    def ai_severity(self, value):
        self.ai_severity_json = json.dumps(value) if value else None

    @property
    def agent_steps(self):
        return json.loads(self.agent_steps_json) if self.agent_steps_json else []

    @agent_steps.setter
    def agent_steps(self, value):
        self.agent_steps_json = json.dumps(value or [])

    @property
    def timeline(self):
        return json.loads(self.timeline_json) if self.timeline_json else []

    @timeline.setter
    def timeline(self, value):
        self.timeline_json = json.dumps(value or [])

    @property
    def resolution_evidence(self):
        return json.loads(self.resolution_evidence_json) if self.resolution_evidence_json else None

    @resolution_evidence.setter
    def resolution_evidence(self, value):
        self.resolution_evidence_json = json.dumps(value) if value else None

    @property
    def ai_verification(self):
        return json.loads(self.ai_verification_json) if self.ai_verification_json else None

    @ai_verification.setter
    def ai_verification(self, value):
        self.ai_verification_json = json.dumps(value) if value else None

    @property
    def internal_notes(self):
        return json.loads(self.internal_notes_json) if self.internal_notes_json else []

    @internal_notes.setter
    def internal_notes(self, value):
        self.internal_notes_json = json.dumps(value or [])

    @property
    def agent_thoughts(self):
        return json.loads(self.agent_thoughts_json) if self.agent_thoughts_json else None

    @agent_thoughts.setter
    def agent_thoughts(self, value):
        self.agent_thoughts_json = json.dumps(value) if value else None


# ── Complaint Images ──────────────────────────────────────────────────────────

class ComplaintImage(Base):
    """
    Stores uploaded citizen images (before evidence) and resolution images.
    image_data holds the raw bytes; mime_type indicates JPEG/PNG/MP4 etc.
    """
    __tablename__ = "complaint_images"

    id                = Column(Integer, primary_key=True, autoincrement=True)
    complaint_id      = Column(String(32), ForeignKey("complaints.id"), nullable=False, index=True)
    image_data        = Column(LargeBinary, nullable=False)
    mime_type         = Column(String(64), default="image/jpeg")
    original_filename = Column(String(256), nullable=True)
    image_type        = Column(String(32), default="evidence")  # "evidence" | "resolution_before" | "resolution_after"
    uploaded_at       = Column(DateTime, default=datetime.utcnow)

    complaint         = relationship("Complaint", back_populates="images")


# ── Incidents ─────────────────────────────────────────────────────────────────

class Incident(Base):
    __tablename__ = "incidents"

    id           = Column(String(32), primary_key=True)       # INC-XXXX
    issue        = Column(String(256), nullable=False)
    category     = Column(SAEnum(*CATEGORIES, name="incident_category"), nullable=False)
    location     = Column(String(512), nullable=False)
    status       = Column(SAEnum(*STATUSES, name="incident_status"), default="Submitted")
    priority     = Column(SAEnum(*PRIORITIES, name="incident_priority"), default="Medium")
    report_count = Column(Integer, default=1)
    support_count= Column(Integer, default=0)
    dept         = Column(SAEnum(*DEPARTMENTS, name="incident_dept"), nullable=True)
    created_at   = Column(DateTime, default=datetime.utcnow)
    updated_at   = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ── Notifications ─────────────────────────────────────────────────────────────

class Notification(Base):
    __tablename__ = "notifications"

    id           = Column(Integer, primary_key=True, autoincrement=True)
    user_id      = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    text         = Column(Text, nullable=False)
    complaint_id = Column(String(32), nullable=True)
    read         = Column(Boolean, default=False)
    created_at   = Column(DateTime, default=datetime.utcnow)

    user         = relationship("User", back_populates="notifications")


# ── Activity Feed ─────────────────────────────────────────────────────────────

class ActivityLog(Base):
    """System-wide activity events for the Admin activity feed."""
    __tablename__ = "activity_log"

    id           = Column(Integer, primary_key=True, autoincrement=True)
    type         = Column(String(32), nullable=False)     # new | assign | support | evidence | escalate | resolved
    text         = Column(Text, nullable=False)
    complaint_id = Column(String(32), nullable=True)
    dept         = Column(String(128), nullable=True)
    icon         = Column(String(32), default="alert")
    created_at   = Column(DateTime, default=datetime.utcnow)
