import math
import logging
from typing import Any, Dict, List, Optional, Tuple
import httpx

logger = logging.getLogger(__name__)

# Predefined municipal ward registry for offline deterministic resolution & hackathon resilience
MUNICIPAL_WARD_REGISTRY: Dict[str, Dict[str, Any]] = {
    "indiranagar": {
        "ward": "Indiranagar",
        "ward_number": 112,
        "zone": "East Zone",
        "office": "East Zone Municipal Office, Mayo Hall, MG Road",
        "approx_center": (12.9783, 77.6408),
    },
    "domlur": {
        "ward": "Domlur",
        "ward_number": 112,
        "zone": "East Zone",
        "office": "East Zone Municipal Office, Mayo Hall, MG Road",
        "approx_center": (12.9609, 77.6387),
    },
    "koramangala": {
        "ward": "Koramangala",
        "ward_number": 151,
        "zone": "South Zone",
        "office": "South Zone Municipal Office, 9th Cross Jayanagar 2nd Block",
        "approx_center": (12.9345, 77.6265),
    },
    "hsr layout": {
        "ward": "HSR Layout",
        "ward_number": 174,
        "zone": "South Zone",
        "office": "South Zone Municipal Office, Bommanahalli Division",
        "approx_center": (12.9121, 77.6445),
    },
    "bellandur": {
        "ward": "Bellandur",
        "ward_number": 150,
        "zone": "Mahadevapura Zone",
        "office": "Mahadevapura Zonal Office, RHB Colony",
        "approx_center": (12.9284, 77.6742),
    },
    "btm layout": {
        "ward": "BTM Layout",
        "ward_number": 176,
        "zone": "South Zone",
        "office": "South Zone Municipal Office, Bannerghatta Road",
        "approx_center": (12.9165, 77.6101),
    },
    "jayanagar": {
        "ward": "Jayanagar",
        "ward_number": 153,
        "zone": "South Zone",
        "office": "South Zone Municipal Office, 9th Cross Jayanagar 2nd Block",
        "approx_center": (12.9298, 77.5833),
    },
    "malleshwaram": {
        "ward": "Malleshwaram",
        "ward_number": 65,
        "zone": "West Zone",
        "office": "West Zone Municipal Office, Sampige Road",
        "approx_center": (12.9984, 77.5714),
    },
    "shantala nagar": {
        "ward": "Shantala Nagar",
        "ward_number": 111,
        "zone": "East Zone",
        "office": "East Zone Municipal Office, Mayo Hall, MG Road",
        "approx_center": (12.9726, 77.6186),
    },
    "whitefield": {
        "ward": "Whitefield",
        "ward_number": 84,
        "zone": "Mahadevapura Zone",
        "office": "Mahadevapura Zonal Office, Whitefield Main Road",
        "approx_center": (12.9698, 77.7499),
    },
    "marathahalli": {
        "ward": "Marathahalli",
        "ward_number": 85,
        "zone": "Mahadevapura Zone",
        "office": "Mahadevapura Zonal Office, Outer Ring Road",
        "approx_center": (12.9562, 77.7011),
    },
    "jp nagar": {
        "ward": "JP Nagar",
        "ward_number": 177,
        "zone": "South Zone",
        "office": "South Zone Municipal Office, 24th Main JP Nagar",
        "approx_center": (12.9099, 77.5884),
    },
    "rajajinagar": {
        "ward": "Rajajinagar",
        "ward_number": 99,
        "zone": "West Zone",
        "office": "West Zone Municipal Office, 1st Block Rajajinagar",
        "approx_center": (12.9912, 77.5552),
    },
    "shivajinagar": {
        "ward": "Shivajinagar",
        "ward_number": 92,
        "zone": "East Zone",
        "office": "East Zone Municipal Office, Tasker Town",
        "approx_center": (12.9863, 77.6041),
    },
    "vasanth nagar": {
        "ward": "Vasanth Nagar",
        "ward_number": 93,
        "zone": "East Zone",
        "office": "East Zone Municipal Office, Millers Road",
        "approx_center": (12.9904, 77.5912),
    },
    "yeshwanthpur": {
        "ward": "Yeshwanthpur",
        "ward_number": 37,
        "zone": "West Zone",
        "office": "West Zone Municipal Office, Yeshwanthpur Circle",
        "approx_center": (13.0232, 77.5503),
    },
    "basavanagudi": {
        "ward": "Basavanagudi",
        "ward_number": 154,
        "zone": "South Zone",
        "office": "South Zone Municipal Office, Gandhi Bazaar",
        "approx_center": (12.9463, 77.5711),
    },
    "banashankari": {
        "ward": "Banashankari",
        "ward_number": 155,
        "zone": "South Zone",
        "office": "South Zone Municipal Office, 100ft Ring Road",
        "approx_center": (12.9234, 77.5467),
    },
    "kalyan nagar": {
        "ward": "Kacharakanahalli",
        "ward_number": 29,
        "zone": "East Zone",
        "office": "East Zone Municipal Office, Kammanahalli Main Road",
        "approx_center": (13.0181, 77.6489),
    },
}

def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculates great-circle distance between two geographic coordinates in meters.
    """
    R = 6371000.0  # Earth's mean radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

class LocationService:
    """
    Comprehensive Spatial Intelligence Service for CivicFlowAI.
    Provides forward geocoding, reverse geocoding, ward resolution,
    in-memory caching, and spatial proximity calculations.
    """

    def __init__(self, user_agent: str = "CivicFlowAI-LocationService/1.0 (civicflow@hackathon.local)"):
        self.user_agent = user_agent
        self._reverse_cache: Dict[Tuple[float, float], Dict[str, Any]] = {}
        self._forward_cache: Dict[str, Dict[str, Any]] = {}

    def _match_nearest_ward(self, lat: float, lng: float) -> Dict[str, Any]:
        """Finds the closest municipal ward from the deterministic registry."""
        best_match = None
        min_dist = float("inf")

        for key, ward_info in MUNICIPAL_WARD_REGISTRY.items():
            center_lat, center_lng = ward_info["approx_center"]
            dist = haversine_distance_meters(lat, lng, center_lat, center_lng)
            if dist < min_dist:
                min_dist = dist
                best_match = ward_info

        if best_match and min_dist < 15000:  # Within 15km of city center
            return {
                "ward": best_match["ward"],
                "ward_number": best_match["ward_number"],
                "zone": best_match["zone"],
                "jurisdiction_office": best_match["office"],
            }

        return {
            "ward": "Unknown",
            "ward_number": 0,
            "zone": "General Municipal Zone",
            "jurisdiction_office": "General Municipal Office",
        }

    def _match_ward_by_text(self, text: str) -> Optional[Dict[str, Any]]:
        """Matches a ward from text description (e.g. 'near Indiranagar Metro')."""
        normalized = text.lower()
        for key, ward_info in MUNICIPAL_WARD_REGISTRY.items():
            if key in normalized or ward_info["ward"].lower() in normalized:
                return {
                    "ward": ward_info["ward"],
                    "ward_number": ward_info["ward_number"],
                    "zone": ward_info["zone"],
                    "office": ward_info["office"],
                    "jurisdiction_office": ward_info["office"],
                    "approx_center": ward_info["approx_center"],
                }
        return None


    def _parse_nominatim_reverse(self, data: Dict[str, Any], lat: float, lng: float) -> Dict[str, Any]:
        """Parses OpenStreetMap Nominatim reverse geocode JSON response."""
        address = data.get("address", {})
        road = address.get("road") or address.get("pedestrian") or ""
        suburb = (
            address.get("suburb")
            or address.get("quarter")
            or address.get("neighbourhood")
            or address.get("residential")
            or address.get("district")
            or ""
        )
        city = address.get("city") or address.get("town") or address.get("county") or address.get("state") or "Unknown"
        postal_code = address.get("postcode") or ""

        # Resolve ward & zone from deterministic municipal spatial mapping
        spatial_ward = self._match_nearest_ward(lat, lng)

        # Use suburb if found, else spatial ward
        ward_name = spatial_ward.get("ward") if spatial_ward.get("ward") != "Unknown" else (suburb or "Unknown")

        return {
            "lat": lat,
            "lng": lng,
            "road": road,
            "area": suburb or road or "Unknown",
            "ward": ward_name,
            "ward_number": spatial_ward.get("ward_number", 0),
            "zone": spatial_ward.get("zone", "General Municipal Zone"),
            "city": city,
            "postal_code": postal_code,
            "jurisdiction_office": spatial_ward.get("jurisdiction_office", "General Municipal Office"),
            "formatted_address": data.get("display_name", f"{lat}, {lng}"),
        }

    async def reverse_geocode(self, lat: float, lng: float) -> Dict[str, Any]:
        """
        Reverse geocodes coordinates to administrative ward, zone, and address.
        Uses in-memory LRU cache and OpenStreetMap Nominatim with offline fallback.
        """
        cache_key = (round(lat, 4), round(lng, 4))
        if cache_key in self._reverse_cache:
            logger.debug(f"Reverse geocode cache hit for {cache_key}")
            return self._reverse_cache[cache_key]

        headers = {"User-Agent": self.user_agent}
        url = f"https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lng}&format=json"

        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                response = await client.get(url, headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    result = self._parse_nominatim_reverse(data, lat, lng)
                    self._reverse_cache[cache_key] = result
                    return result
                else:
                    logger.warning(f"Nominatim returned HTTP {response.status_code}. Using spatial fallback.")
        except Exception as e:
            logger.warning(f"Reverse geocoding network error: {e}. Using deterministic spatial fallback.")

        # Spatial fallback
        spatial = self._match_nearest_ward(lat, lng)
        fallback = {
            "lat": lat,
            "lng": lng,
            "road": "Unknown Road",
            "area": spatial["ward"],
            "ward": spatial["ward"],
            "ward_number": spatial["ward_number"],
            "zone": spatial["zone"],
            "city": "Bengaluru",
            "postal_code": "Unknown",
            "jurisdiction_office": spatial["jurisdiction_office"],
            "formatted_address": f"{spatial['ward']}, {spatial['zone']}, Bengaluru",
        }
        self._reverse_cache[cache_key] = fallback
        return fallback

    async def forward_geocode(self, query: str) -> Dict[str, Any]:
        """
        Forward geocodes an address or landmark text query to coordinates and ward.
        Uses cache, Nominatim API, and offline landmark dictionary fallback.
        """
        clean_query = query.strip().lower()
        if not clean_query:
            return {"error": "Empty query", "lat": 0.0, "lng": 0.0}

        if clean_query in self._forward_cache:
            return self._forward_cache[clean_query]

        # 1. Attempt Nominatim geocoding
        headers = {"User-Agent": self.user_agent}
        url = f"https://nominatim.openstreetmap.org/search?q={clean_query}&format=json&limit=1"

        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                response = await client.get(url, headers=headers)
                if response.status_code == 200:
                    results = response.json()
                    if results:
                        top = results[0]
                        lat = float(top["lat"])
                        lng = float(top["lon"])
                        spatial = self._match_nearest_ward(lat, lng)
                        res = {
                            "lat": lat,
                            "lng": lng,
                            "formatted_address": top.get("display_name", clean_query),
                            "ward": spatial["ward"],
                            "ward_number": spatial["ward_number"],
                            "zone": spatial["zone"],
                            "jurisdiction_office": spatial["jurisdiction_office"],
                        }
                        self._forward_cache[clean_query] = res
                        return res
        except Exception as e:
            logger.warning(f"Forward geocoding network error: {e}. Trying text landmark registry.")

        # 2. Offline landmark registry fallback
        text_match = self._match_ward_by_text(clean_query)
        if text_match:
            center_lat, center_lng = text_match["approx_center"]
            res = {
                "lat": center_lat,
                "lng": center_lng,
                "formatted_address": f"{text_match['ward']}, Bengaluru",
                "ward": text_match["ward"],
                "ward_number": text_match["ward_number"],
                "zone": text_match["zone"],
                "jurisdiction_office": text_match["office"],
            }
            self._forward_cache[clean_query] = res
            return res

        # Default fallback
        res = {
            "lat": 12.9716,
            "lng": 77.5946,
            "formatted_address": query,
            "ward": "General Ward",
            "ward_number": 0,
            "zone": "Central Zone",
            "jurisdiction_office": "General Municipal Office",
        }
        self._forward_cache[clean_query] = res
        return res

    def find_nearby_complaints(
        self,
        lat: float,
        lng: float,
        complaints: List[Dict[str, Any]],
        radius_meters: float = 150.0,
    ) -> List[Dict[str, Any]]:
        """
        Filters a list of complaints within a given radius in meters.
        Returns matched complaints annotated with distance_meters, sorted closest first.
        """
        nearby = []
        for item in complaints:
            loc = item.get("location") or {}
            c_lat = loc.get("lat")
            c_lng = loc.get("lng")
            if c_lat is not None and c_lng is not None:
                dist = haversine_distance_meters(lat, lng, float(c_lat), float(c_lng))
                if dist <= radius_meters:
                    annotated = dict(item)
                    annotated["distance_meters"] = round(dist, 1)
                    nearby.append(annotated)

        nearby.sort(key=lambda x: x["distance_meters"])
        return nearby
