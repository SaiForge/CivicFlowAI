import logging
from typing import Optional, Dict, Any, List
from app.config import SUPABASE_URL, SUPABASE_KEY

logger = logging.getLogger("civicflow_backend.supabase")

# In-memory storage fallback for seamless local testing if Supabase is unconfigured
_local_store = {
    "profiles": {},
    "complaints": {},
    "agent_traces": []
}

supabase = None
is_supabase_connected = False

if SUPABASE_URL and SUPABASE_KEY:
    try:
        from supabase import create_client, Client
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        is_supabase_connected = True
        logger.info(f"Connected to Supabase at {SUPABASE_URL}")
    except Exception as e:
        logger.warning(f"Could not connect to Supabase: {e}. Falling back to local storage.")
        supabase = None
        is_supabase_connected = False
else:
    logger.info("Supabase credentials not specified in .env. Operating in local storage mode.")


class SupabaseService:
    """Unified service for database operations with automatic Supabase or local fallback."""

    @staticmethod
    def get_status() -> Dict[str, Any]:
        return {
            "configured": bool(SUPABASE_URL and SUPABASE_KEY),
            "connected": is_supabase_connected,
            "url": SUPABASE_URL if SUPABASE_URL else "Not Configured"
        }

    # ── User Profiles ──
    @staticmethod
    def save_profile(profile: Dict[str, Any]) -> Dict[str, Any]:
        if is_supabase_connected and supabase:
            try:
                res = supabase.table("profiles").upsert(profile).execute()
                return res.data[0] if res.data else profile
            except Exception as e:
                logger.error(f"Supabase save_profile error: {e}")
        # Local fallback
        _local_store["profiles"][profile.get("email")] = profile
        return profile

    @staticmethod
    def get_profile(email: str) -> Optional[Dict[str, Any]]:
        if is_supabase_connected and supabase:
            try:
                res = supabase.table("profiles").select("*").eq("email", email).execute()
                if res.data:
                    return res.data[0]
            except Exception as e:
                logger.error(f"Supabase get_profile error: {e}")
        return _local_store["profiles"].get(email)

    # ── Complaints ──
    @staticmethod
    def list_complaints(department: Optional[str] = None, status: Optional[str] = None) -> List[Dict[str, Any]]:
        if is_supabase_connected and supabase:
            try:
                query = supabase.table("complaints").select("*").order("created_at", desc=True)
                if department and department != "All":
                    query = query.eq("department", department)
                if status and status != "All":
                    query = query.eq("status", status)
                res = query.execute()
                return res.data or []
            except Exception as e:
                logger.error(f"Supabase list_complaints error: {e}")
        
        # Local fallback
        items = list(_local_store["complaints"].values())
        if department and department != "All":
            items = [c for c in items if c.get("department") == department]
        if status and status != "All":
            items = [c for c in items if c.get("status") == status]
        return sorted(items, key=lambda x: x.get("created_at", ""), reverse=True)

    @staticmethod
    def get_complaint(complaint_id: str) -> Optional[Dict[str, Any]]:
        if is_supabase_connected and supabase:
            try:
                res = supabase.table("complaints").select("*").eq("id", complaint_id).execute()
                if res.data:
                    return res.data[0]
            except Exception as e:
                logger.error(f"Supabase get_complaint error: {e}")
        return _local_store["complaints"].get(complaint_id)

    @staticmethod
    def save_complaint(complaint: Dict[str, Any]) -> Dict[str, Any]:
        if is_supabase_connected and supabase:
            try:
                res = supabase.table("complaints").upsert(complaint).execute()
                return res.data[0] if res.data else complaint
            except Exception as e:
                logger.error(f"Supabase save_complaint error: {e}")
        _local_store["complaints"][complaint["id"]] = complaint
        return complaint

    @staticmethod
    def update_complaint_status(complaint_id: str, status: str, notes: Optional[str] = None) -> Optional[Dict[str, Any]]:
        if is_supabase_connected and supabase:
            try:
                res = supabase.table("complaints").update({"status": status}).eq("id", complaint_id).execute()
                if res.data:
                    return res.data[0]
            except Exception as e:
                logger.error(f"Supabase update_complaint_status error: {e}")
        
        c = _local_store["complaints"].get(complaint_id)
        if c:
            c["status"] = status
            if notes:
                c["resolution_notes"] = notes
            return c
        return None

    # ── Agent Traces ──
    @staticmethod
    def save_agent_trace(trace: Dict[str, Any]) -> None:
        if is_supabase_connected and supabase:
            try:
                supabase.table("agent_traces").insert(trace).execute()
            except Exception as e:
                logger.error(f"Supabase save_agent_trace error: {e}")
        _local_store["agent_traces"].append(trace)

    @staticmethod
    def get_agent_traces(complaint_id: str) -> List[Dict[str, Any]]:
        if is_supabase_connected and supabase:
            try:
                res = supabase.table("agent_traces").select("*").eq("complaint_id", complaint_id).order("created_at").execute()
                if res.data:
                    return res.data
            except Exception as e:
                logger.error(f"Supabase get_agent_traces error: {e}")
        return [t for t in _local_store["agent_traces"] if t.get("complaint_id") == complaint_id]
