import logging
from typing import Any, Dict, Optional
import httpx
from app.tools.base_tool import BaseTool
from app.services.location_service import LocationService

logger = logging.getLogger(__name__)

class GeocodeTool(BaseTool):
    """
    Tool to geocode addresses and reverse geocode latitude and longitude.
    Integrates with LocationService for caching, deterministic ward resolution,
    and municipal zone jurisdiction mapping.
    """

    name: str = "geocode_tool"
    description: str = "Performs forward and reverse geocoding to determine ward, zone, area, and city."

    FALLBACK: Dict[str, str] = {
        "ward": "Unknown",
        "area": "Unknown",
        "city": "Unknown",
    }

    def __init__(self, location_service: Optional[LocationService] = None):
        super().__init__()
        self.location_service = location_service or LocationService()

    def _parse_nominatim_response(self, data: Dict[str, Any]) -> Dict[str, str]:
        address = data.get("address", {})
        ward = (
            address.get("suburb")
            or address.get("quarter")
            or address.get("neighbourhood")
            or address.get("district")
            or "Unknown"
        )
        area = (
            address.get("road")
            or address.get("neighbourhood")
            or address.get("commercial")
            or "Unknown"
        )
        city = (
            address.get("city")
            or address.get("town")
            or address.get("county")
            or address.get("state")
            or "Unknown"
        )
        return {"ward": ward, "area": area, "city": city}

    def run(self, lat: float, lng: float, **kwargs: Any) -> Dict[str, Any]:
        """Synchronously reverse geocode coordinates using OpenStreetMap Nominatim."""
        try:
            url = f"https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lng}&format=json"
            headers = {"User-Agent": "CivicFlowAI-Agent/1.0 (civicflow@hackathon.local)"}
            with httpx.Client(timeout=3.0) as client:
                response = client.get(url, headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    parsed = self._parse_nominatim_response(data)
                    spatial = self.location_service._match_nearest_ward(lat, lng)
                    parsed["ward_number"] = spatial.get("ward_number", 0)
                    parsed["zone"] = spatial.get("zone", "General Municipal Zone")
                    parsed["jurisdiction_office"] = spatial.get("jurisdiction_office", "General Municipal Office")
                    return parsed
                else:
                    logger.warning(f"Geocode API returned status {response.status_code}. Using fallback.")
                    return dict(self.FALLBACK)
        except Exception as e:
            logger.warning(f"Geocoding lookup failed ({e}). Returning fallback location.")
            return dict(self.FALLBACK)

    async def arun(self, lat: float, lng: float, **kwargs: Any) -> Dict[str, Any]:
        """Asynchronously reverse geocode coordinates using LocationService with caching."""
        try:
            url = f"https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lng}&format=json"
            headers = {"User-Agent": "CivicFlowAI-Agent/1.0 (civicflow@hackathon.local)"}
            async with httpx.AsyncClient(timeout=3.0) as client:
                response = await client.get(url, headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    parsed = self._parse_nominatim_response(data)
                    spatial = self.location_service._match_nearest_ward(lat, lng)
                    parsed["ward_number"] = spatial.get("ward_number", 0)
                    parsed["zone"] = spatial.get("zone", "General Municipal Zone")
                    parsed["jurisdiction_office"] = spatial.get("jurisdiction_office", "General Municipal Office")
                    return parsed
                else:
                    logger.warning(f"Geocode API returned status {response.status_code}. Using fallback.")
                    return dict(self.FALLBACK)
        except Exception as e:
            logger.warning(f"Async geocoding lookup failed ({e}). Returning fallback location.")
            return dict(self.FALLBACK)

    async def forward_geocode(self, query: str) -> Dict[str, Any]:
        """Asynchronously forward geocode an address/landmark string to coordinates and ward."""
        return await self.location_service.forward_geocode(query)
