import logging
from typing import Any, Dict, List
from fastapi import APIRouter, HTTPException
from app.api.schemas import (
    GeocodeRequest,
    GeocodeResponse,
    ReverseGeocodeRequest,
    ReverseGeocodeResponse,
    ProximityCheckRequest,
    ProximityCheckResponse,
)
from app.services.location_service import LocationService, MUNICIPAL_WARD_REGISTRY
from app.tools.dataset_loader import load_seed_complaints

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/location", tags=["Location Services"])
location_service = LocationService()

@router.post("/geocode", response_model=GeocodeResponse)
async def forward_geocode(request: GeocodeRequest) -> Any:
    """Forward geocode address, landmark, or area to coordinates and municipal ward."""
    try:
        result = await location_service.forward_geocode(request.query)
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Forward geocode error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Geocoding error: {str(e)}")

@router.post("/reverse", response_model=ReverseGeocodeResponse)
async def reverse_geocode(request: ReverseGeocodeRequest) -> Any:
    """Reverse geocode latitude and longitude to administrative ward and jurisdiction."""
    try:
        result = await location_service.reverse_geocode(request.lat, request.lng)
        return result
    except Exception as e:
        logger.error(f"Reverse geocode error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Reverse geocoding error: {str(e)}")

@router.post("/proximity", response_model=ProximityCheckResponse)
async def check_proximity(request: ProximityCheckRequest) -> Any:
    """
    Finds existing civic complaints within the specified radius (in meters) of given coordinates.
    Useful for duplicate incident detection and cluster matching.
    """
    try:
        all_complaints = load_seed_complaints()
        nearby = location_service.find_nearby_complaints(
            lat=request.lat,
            lng=request.lng,
            complaints=all_complaints,
            radius_meters=request.radius_meters,
        )
        return {
            "center": {"lat": request.lat, "lng": request.lng},
            "radius_meters": request.radius_meters,
            "count": len(nearby),
            "nearby_complaints": nearby,
        }
    except Exception as e:
        logger.error(f"Proximity check error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Proximity check error: {str(e)}")

@router.get("/wards", response_model=Dict[str, Any])
async def list_wards() -> Any:
    """Returns the municipal ward registry, zone mappings, and zonal offices."""
    return {
        "count": len(MUNICIPAL_WARD_REGISTRY),
        "wards": MUNICIPAL_WARD_REGISTRY,
    }
