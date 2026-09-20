"""
LongTermMemory — SQLAlchemy + PostgreSQL (Docker / Supabase)
Replaces the original sqlite3 implementation.
Public API is identical so nothing else in the agent changes.
"""

import json
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import (
    create_engine, Column, Integer, Text, Boolean,
    DateTime, ForeignKey, LargeBinary, String
)
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from sqlalchemy.exc import IntegrityError

logger = logging.getLogger(__name__)

Base = declarative_base()


# ── ORM Models ────────────────────────────────────────────────────────────────

class TicketRecord(Base):
    __tablename__ = "tickets"

    ticket_id  = Column(String(64), primary_key=True)
    ticket_json = Column(Text, nullable=False)
    status      = Column(String(64), nullable=False, default="Submitted")
    created_at  = Column(DateTime, default=datetime.utcnow)
    updated_at  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AuditLogRecord(Base):
    __tablename__ = "audit_log"

    id             = Column(Integer, primary_key=True, autoincrement=True)
    ticket_id      = Column(String(64), ForeignKey("tickets.ticket_id"), nullable=False)
    agent_name     = Column(String(128), nullable=False)
    attempt_number = Column(Integer, nullable=False)
    input_summary  = Column(Text, default="")
    output_json    = Column(Text, default="{}")
    reasoning      = Column(Text, default="")
    success        = Column(Boolean, nullable=False, default=True)
    timestamp      = Column(DateTime, default=datetime.utcnow)


# ── LongTermMemory ────────────────────────────────────────────────────────────

class LongTermMemory:
    """
    Persistent PostgreSQL storage for civic tickets and agent audit logs.
    Falls back to SQLite if DATABASE_URL starts with 'sqlite://'.
    """

    def __init__(self, db_url: Optional[str] = None):
        raw_url = db_url or "postgresql://civicflow:civicflow_secret@postgres:5432/civicflow"
        if raw_url.startswith("postgres://"):
            raw_url = raw_url.replace("postgres://", "postgresql://", 1)
        self.db_url = raw_url

        # For SQLite (local dev fallback), sqlite3:// → sqlite:/// path
        connect_args = {}
        if self.db_url.startswith("sqlite"):
            connect_args = {"check_same_thread": False}

        self.engine = create_engine(
            self.db_url,
            connect_args=connect_args,
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=10,
            echo=False,
        )
        self.SessionLocal = sessionmaker(
            autocommit=False,
            autoflush=False,
            bind=self.engine,
        )
        self.init_db()

    # ── Schema ──────────────────────────────────────────────────────────────

    def init_db(self) -> None:
        """Create tables if they don't exist (idempotent)."""
        Base.metadata.create_all(bind=self.engine)
        logger.info(f"Database schema ready (url={self.db_url[:40]}...)")

    # ── Session helper ───────────────────────────────────────────────────────

    def _session(self) -> Session:
        return self.SessionLocal()

    # ── Ticket CRUD ──────────────────────────────────────────────────────────

    def save_ticket(self, ticket: Dict[str, Any]) -> None:
        """Insert or update a civic ticket record."""
        ticket_id = ticket.get("ticket_id")
        if not ticket_id:
            raise ValueError("Ticket must contain a 'ticket_id' field.")

        status = ticket.get("status", "Submitted")
        ticket_json = json.dumps(ticket)
        now = datetime.utcnow()

        with self._session() as session:
            existing = session.get(TicketRecord, ticket_id)
            if existing:
                existing.ticket_json = ticket_json
                existing.status = status
                existing.updated_at = now
            else:
                record = TicketRecord(
                    ticket_id=ticket_id,
                    ticket_json=ticket_json,
                    status=status,
                    created_at=now,
                    updated_at=now,
                )
                session.add(record)
            session.commit()

    def get_ticket(self, ticket_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve a ticket dict by ID."""
        with self._session() as session:
            record = session.get(TicketRecord, ticket_id)
            if record:
                return json.loads(record.ticket_json)
            return None

    def list_tickets(self) -> List[Dict[str, Any]]:
        """Return all tickets ordered by most-recently updated."""
        with self._session() as session:
            records = (
                session.query(TicketRecord)
                .order_by(TicketRecord.updated_at.desc())
                .all()
            )
            return [json.loads(r.ticket_json) for r in records]

    # ── Audit Log ────────────────────────────────────────────────────────────

    def log_action(
        self,
        ticket_id: str,
        agent_name: str,
        attempt: int,
        output: Any,
        reasoning: str = "",
        success: bool = True,
        input_summary: str = "",
    ) -> None:
        """Record an agent execution attempt into the audit log."""
        if isinstance(output, (dict, list)):
            output_str = json.dumps(output)
        else:
            output_str = str(output)

        with self._session() as session:
            # Ensure ticket exists in tickets table to satisfy foreign key
            if not session.get(TicketRecord, ticket_id):
                stub = TicketRecord(
                    ticket_id=ticket_id,
                    ticket_json=json.dumps({"ticket_id": ticket_id, "status": "processing"}),
                )
                session.add(stub)
                session.flush()

            record = AuditLogRecord(
                ticket_id=ticket_id,
                agent_name=agent_name,
                attempt_number=attempt,
                input_summary=input_summary,
                output_json=output_str,
                reasoning=reasoning,
                success=success,
                timestamp=datetime.utcnow(),
            )
            session.add(record)
            session.commit()

    def get_audit_trail(self, ticket_id: str) -> List[Dict[str, Any]]:
        """Return the full chronological audit trail for a ticket."""
        with self._session() as session:
            records = (
                session.query(AuditLogRecord)
                .filter(AuditLogRecord.ticket_id == ticket_id)
                .order_by(AuditLogRecord.id.asc())
                .all()
            )
            result = []
            for r in records:
                try:
                    parsed_out = json.loads(r.output_json) if r.output_json else {}
                except Exception:
                    parsed_out = r.output_json

                result.append({
                    "id": r.id,
                    "ticket_id": r.ticket_id,
                    "agent_name": r.agent_name,
                    "attempt_number": r.attempt_number,
                    "input_summary": r.input_summary or "",
                    "output_json": parsed_out,
                    "reasoning": r.reasoning or "",
                    "success": bool(r.success),
                    "timestamp": r.timestamp.isoformat() if r.timestamp else "",
                })
            return result
