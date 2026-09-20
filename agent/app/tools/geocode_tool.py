import logging
from typing import Any, Dict
import httpx
from app.tools.base_tool import BaseTool

logger = logging.getLogger(__name__)

class GeocodeTool(BaseTool):
    """Tool to reverse geocode latitude and longitude to ward, area, and city."""

    name: str = "geocode_tool"
    description: str = "Performs reverse geocoding to determine ward, area, and city from coordinates."

    FALLBACK: Dict[str, str] = {
        "ward": "Unknown",
        "area": "Unknown",
        "city": "Unknown",
    }

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

    def run(self, lat: float, lng: float, **kwargs: Any) -> Dict[str, str]:
        """Synchronously reverse geocode coordinates using OpenStreetMap Nominatim."""
        try:
            url = f"https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lng}&format=json"
            headers = {"User-Agent": "CivicFlowAI-Agent/1.0 (civicflow@hackathon.local)"}
            with httpx.Client(timeout=3.0) as client:
                response = client.get(url, headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    return self._parse_nominatim_response(data)
                else:
                    logger.warning(f"Geocode API returned status {response.status_code}. Using fallback.")
                    return dict(self.FALLBACK)
        except Exception as e:
            logger.warning(f"Geocoding lookup failed ({e}). Returning fallback location.")
            return dict(self.FALLBACK)

    async def arun(self, lat: float, lng: float, **kwargs: Any) -> Dict[str, str]:
        """Asynchronously reverse geocode coordinates using OpenStreetMap Nominatim."""
        try:
            url = f"https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lng}&format=json"
            headers = {"User-Agent": "CivicFlowAI-Agent/1.0 (civicflow@hackathon.local)"}
            async with httpx.AsyncClient(timeout=3.0) as client:
                response = await client.get(url, headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    return self._parse_nominatim_response(data)
                else:
                    logger.warning(f"Geocode API returned status {response.status_code}. Using fallback.")
                    return dict(self.FALLBACK)
        except Exception as e:
            logger.warning(f"Async geocoding lookup failed ({e}). Returning fallback location.")
            return dict(self.FALLBACK)
