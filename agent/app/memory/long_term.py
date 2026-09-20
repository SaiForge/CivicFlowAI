import json
import sqlite3
import logging
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional
import threading

from contextlib import contextmanager

logger = logging.getLogger(__name__)

class LongTermMemory:
    """
    Persistent SQLite storage for civic tickets and audit logs.
    Ensures complete traceability of agent decisions and retries.
    """

    def __init__(self, db_url: Optional[str] = None):
        if db_url and db_url.startswith("sqlite:///"):
            self.db_path = db_url.replace("sqlite:///", "")
        else:
            self.db_path = "./civic.db"

        # Resolve path
        path_obj = Path(self.db_path)
        if not path_obj.is_absolute():
            base_dir = Path(__file__).resolve().parent.parent.parent
            path_obj = base_dir / self.db_path
        
        path_obj.parent.mkdir(parents=True, exist_ok=True)
        self.db_file = str(path_obj)
        self._lock = threading.Lock()
        self.init_db()

    @contextmanager
    def _get_connection(self):
        conn = sqlite3.connect(self.db_file, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        # Enable Write-Ahead Logging and busy timeout for multi-day concurrency stability
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA busy_timeout = 5000;")
        try:
            yield conn
        finally:
            conn.close()


    def init_db(self) -> None:
        """Create database tables if they do not exist."""
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS tickets (
                    ticket_id TEXT PRIMARY KEY,
                    ticket_json TEXT NOT NULL,
                    status TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                """)
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS audit_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ticket_id TEXT NOT NULL,
                    agent_name TEXT NOT NULL,
                    attempt_number INTEGER NOT NULL,
                    input_summary TEXT,
                    output_json TEXT,
                    reasoning TEXT,
                    success INTEGER NOT NULL,
                    timestamp TEXT NOT NULL,
                    FOREIGN KEY (ticket_id) REFERENCES tickets (ticket_id)
                );
                """)
                conn.commit()
        logger.info(f"Initialized SQLite database at {self.db_file}")

    def save_ticket(self, ticket: Dict[str, Any]) -> None:
        """Insert or update a civic ticket record."""
        ticket_id = ticket.get("ticket_id")
        if not ticket_id:
            raise ValueError("Ticket must contain a 'ticket_id' field.")

        status = ticket.get("status", "Submitted")
        now = datetime.utcnow().isoformat()
        ticket_json = json.dumps(ticket)

        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    """
                    INSERT INTO tickets (ticket_id, ticket_json, status, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?)
                    ON CONFLICT(ticket_id) DO UPDATE SET
                        ticket_json=excluded.ticket_json,
                        status=excluded.status,
                        updated_at=excluded.updated_at
                    """,
                    (ticket_id, ticket_json, status, now, now),
                )
                conn.commit()

    def get_ticket(self, ticket_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve a ticket by its ID."""
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT ticket_json FROM tickets WHERE ticket_id = ?", (ticket_id,))
                row = cursor.fetchone()
                if row:
                    return json.loads(row["ticket_json"])
                return None

    def list_tickets(self) -> List[Dict[str, Any]]:
        """List all stored tickets."""
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT ticket_json FROM tickets ORDER BY updated_at DESC")
                rows = cursor.fetchall()
                return [json.loads(row["ticket_json"]) for row in rows]

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
        now = datetime.utcnow().isoformat()
        if isinstance(output, (dict, list)):
            output_str = json.dumps(output)
        else:
            output_str = str(output)

        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    """
                    INSERT INTO audit_log (
                        ticket_id, agent_name, attempt_number, input_summary,
                        output_json, reasoning, success, timestamp
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        ticket_id,
                        agent_name,
                        attempt,
                        input_summary,
                        output_str,
                        reasoning,
                        1 if success else 0,
                        now,
                    ),
                )
                conn.commit()

    def get_audit_trail(self, ticket_id: str) -> List[Dict[str, Any]]:
        """Retrieve the full chronological audit trail for a ticket."""
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    """
                    SELECT id, ticket_id, agent_name, attempt_number, input_summary,
                           output_json, reasoning, success, timestamp
                    FROM audit_log
                    WHERE ticket_id = ?
                    ORDER BY id ASC
                    """,
                    (ticket_id,),
                )
                rows = cursor.fetchall()
                results = []
                for r in rows:
                    out_raw = r["output_json"]
                    try:
                        parsed_out = json.loads(out_raw) if out_raw else {}
                    except Exception:
                        parsed_out = out_raw

                    results.append({
                        "id": r["id"],
                        "ticket_id": r["ticket_id"],
                        "agent_name": r["agent_name"],
                        "attempt_number": r["attempt_number"],
                        "input_summary": r["input_summary"] or "",
                        "output_json": parsed_out,
                        "reasoning": r["reasoning"] or "",
                        "success": bool(r["success"]),
                        "timestamp": r["timestamp"],
                    })
                return results
