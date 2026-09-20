import logging
from typing import Optional, List, Dict, Any
import httpx
from fastapi import APIRouter
from pydantic import BaseModel
from app.config import AGENT_SERVICE_URL

logger = logging.getLogger("civicflow_backend.location")
router = APIRouter(prefix="/location", tags=["Location & Wards"])

# Standard municipal ward registry
BANGALORE_WARDS = [
    {"ward_no": 112, "name": "Indiranagar", "zone": "East", "lat": 12.9784, "lng": 77.6408},
    {"ward_no": 151, "name": "Koramangala", "zone": "South", "lat": 12.9352, "lng": 77.6245},
    {"ward_no": 84,  "name": "Whitefield", "zone": "Mahadevapura", "lat": 12.9698, "lng": 77.7500},
    {"ward_no": 146, "name": "HSR Layout", "zone": "Bommanahalli", "lat": 12.9121, "lng": 77.6446},
    {"ward_no": 174, "name": "BTM Layout", "zone": "South", "lat": 12.9166, "lng": 77.6101},
    {"ward_no": 177, "name": "J.P. Nagar", "zone": "South", "lat": 12.9063, "lng": 77.5857},
    {"ward_no": 179, "name": "Jayanagar", "zone": "South", "lat": 12.9308, "lng": 77.5838},
    {"ward_no": 168, "name": "Malleshwaram", "zone": "West", "lat": 13.0031, "lng": 77.5643},
    {"ward_no": 93,  "name": "Vasanth Nagar", "zone": "East", "lat": 12.9882, "lng": 77.5923},
    {"ward_no": 111, "name": "Shantala Nagar (MG Road)", "zone": "East", "lat": 12.9756, "lng": 77.6066},
    {"ward_no": 71,  "name": "Hebbal", "zone": "Yelahanka", "lat": 13.0358, "lng": 77.5970},
    {"ward_no": 4,   "name": "Yelahanka", "zone": "Yelahanka", "lat": 13.1007, "lng": 77.5963},
    {"ward_no": 192, "name": "Electronic City", "zone": "Bommanahalli", "lat": 12.8399, "lng": 77.6770},
    {"ward_no": 128, "name": "Rajajinagar", "zone": "West", "lat": 12.9982, "lng": 77.5530},
    {"ward_no": 135, "name": "Basavanagudi", "zone": "South", "lat": 12.9432, "lng": 77.5732},
    {"ward_no": 85,  "name": "Marathahalli", "zone": "Mahadevapura", "lat": 12.9591, "lng": 77.6974},
    {"ward_no": 150, "name": "Bellandur", "zone": "Mahadevapura", "lat": 12.9304, "lng": 77.6784},
    {"ward_no": 160, "name": "R.R. Nagar", "zone": "R.R. Nagar", "lat": 12.9272, "lng": 77.5154},
    {"ward_no": 18,  "name": "Banashankari", "zone": "South", "lat": 12.9155, "lng": 77.5736}
]


class GeocodeRequest(BaseModel):
    address: str


class ReverseRequest(BaseModel):
    latitude: float
    longitude: float


class ProximityRequest(BaseModel):
    latitude: float
    longitude: float
    radius_meters: Optional[int] = 200


@router.get("/wards")
async def get_wards():
    """Retrieve official list of registered municipal wards."""
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            res = await client.get(f"{AGENT_SERVICE_URL}/api/v1/location/wards")
            if res.status_code == 200:
                return res.json()
    except Exception:
        pass
    return BANGALORE_WARDS


@router.post("/geocode")
async def geocode(req: GeocodeRequest):
    """Forward-geocode address to latitude, longitude and ward."""
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            res = await client.post(f"{AGENT_SERVICE_URL}/api/v1/location/geocode", json=req.dict())
            if res.status_code == 200:
                return res.json()
    except Exception:
        pass

    # Keyword match fallback
    addr_lower = req.address.lower()
    for w in BANGALORE_WARDS:
        if w["name"].lower() in addr_lower:
            return {
                "latitude": w["lat"],
                "longitude": w["lng"],
                "ward_name": f"Ward {w['ward_no']} - {w['name']}",
                "zone": w["zone"],
                "formatted_address": f"{req.address}, Bengaluru, Karnataka"
            }
    
    default_w = BANGALORE_WARDS[0]
    return {
        "latitude": default_w["lat"],
        "longitude": default_w["lng"],
        "ward_name": f"Ward {default_w['ward_no']} - {default_w['name']}",
        "zone": default_w["zone"],
        "formatted_address": f"{req.address}, Bengaluru, Karnataka"
    }


@router.post("/reverse")
async def reverse_geocode(req: ReverseRequest):
    """Reverse-geocode latitude/longitude to address and ward."""
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            res = await client.post(f"{AGENT_SERVICE_URL}/api/v1/location/reverse", json=req.dict())
            if res.status_code == 200:
                return res.json()
    except Exception:
        pass

    # Find closest ward
    import math
    def dist(w):
        return math.hypot(w["lat"] - req.latitude, w["lng"] - req.longitude)
    
    closest = min(BANGALORE_WARDS, key=dist)
    return {
        "address": f"Near {closest['name']}, Bengaluru, Karnataka",
        "ward_name": f"Ward {closest['ward_no']} - {closest['name']}",
        "zone": closest["zone"]
    }


@router.post("/proximity")
async def check_proximity(req: ProximityRequest):
    """Check for existing complaints within radius to prevent duplicate tickets."""
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            res = await client.post(f"{AGENT_SERVICE_URL}/api/v1/location/proximity", json=req.dict())
            if res.status_code == 200:
                return res.json()
    except Exception:
        pass
    
    return {"duplicate_found": False, "count": 0, "nearby_complaints": []}
