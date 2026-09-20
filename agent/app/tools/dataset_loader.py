import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

DATA_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "civic_complaints_seed.json"

def load_seed_complaints(data_path: Optional[Path] = None) -> List[Dict[str, Any]]:
    """Loads all seed civic complaints from JSON file."""
    path = data_path or DATA_PATH
    if not path.exists():
        logger.warning(f"Seed data file not found at {path}")
        return []
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def get_complaints_by_category(category: str, data_path: Optional[Path] = None) -> List[Dict[str, Any]]:
    """Filters seed complaints by issue category."""
    all_complaints = load_seed_complaints(data_path)
    target = category.strip().lower()
    return [c for c in all_complaints if c.get("expected", {}).get("issue_type", "").lower() == target]

def get_complaints_by_severity(severity: str, data_path: Optional[Path] = None) -> List[Dict[str, Any]]:
    """Filters seed complaints by expected severity (Low, Medium, High, Critical)."""
    all_complaints = load_seed_complaints(data_path)
    target = severity.strip().lower()
    return [c for c in all_complaints if c.get("expected", {}).get("severity", "").lower() == target]

def get_complaints_by_ward(ward: str, data_path: Optional[Path] = None) -> List[Dict[str, Any]]:
    """Filters seed complaints by municipal ward name or number."""
    all_complaints = load_seed_complaints(data_path)
    target = ward.strip().lower()
    return [
        c for c in all_complaints
        if target in str(c.get("location", {}).get("ward", "")).lower()
        or target == str(c.get("location", {}).get("ward_number", ""))
    ]

def get_cluster_complaints(cluster_id: str, data_path: Optional[Path] = None) -> List[Dict[str, Any]]:
    """Retrieves duplicate complaints belonging to a known cluster ID."""
    all_complaints = load_seed_complaints(data_path)
    return [c for c in all_complaints if c.get("expected", {}).get("cluster_id") == cluster_id]
