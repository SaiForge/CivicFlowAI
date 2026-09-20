from typing import Any, Dict, List, Optional
import copy
from datetime import datetime

class ShortTermMemory:
    """
    In-memory session blackboard keyed by request/session ID.
    Maintains intermediate pipeline states, retry counter, and agent call history.
    """

    def __init__(self):
        self._sessions: Dict[str, Dict[str, Any]] = {}

    def init_session(self, session_id: str, initial_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        state = {
            "session_id": session_id,
            "input": initial_data or {},
            "retry_count": 0,
            "agent_call_history": [],
            "created_at": datetime.utcnow().isoformat(),
        }
        self._sessions[session_id] = state
        return self._sessions[session_id]

    def get_state(self, session_id: str) -> Optional[Dict[str, Any]]:
        return self._sessions.get(session_id)

    def update_state(self, session_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        if session_id not in self._sessions:
            self.init_session(session_id)
        self._sessions[session_id].update(updates)
        return self._sessions[session_id]

    def record_agent_call(
        self,
        session_id: str,
        agent_name: str,
        attempt_number: int,
        output: Any,
        reasoning: str = "",
        success: bool = True,
    ) -> None:
        if session_id not in self._sessions:
            self.init_session(session_id)

        entry = {
            "agent_name": agent_name,
            "attempt_number": attempt_number,
            "output": copy.deepcopy(output),
            "reasoning": reasoning,
            "success": success,
            "timestamp": datetime.utcnow().isoformat(),
        }
        self._sessions[session_id]["agent_call_history"].append(entry)

    def clear_session(self, session_id: str) -> None:
        self._sessions.pop(session_id, None)
