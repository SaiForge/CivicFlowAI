import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

from app.services.location_service import (
    LocationService,
    haversine_distance_meters,
    MUNICIPAL_WARD_REGISTRY,
)
from app.tools.dataset_loader import (
    load_seed_complaints,
    get_complaints_by_category,
    get_complaints_by_severity,
    get_cluster_complaints,
)
from app.main import app

client = TestClient(app)

# --- 1. Spatial Math & Haversine Tests ---

def test_haversine_distance_same_point():
    lat, lng = 12.9716, 77.5946
    assert haversine_distance_meters(lat, lng, lat, lng) == 0.0

def test_haversine_distance_known_distance():
    # Indiranagar (12.9783, 77.6408) to adjacent pillar (12.9784, 77.6409) is ~15.5m
    dist = haversine_distance_meters(12.9783, 77.6408, 12.9784, 77.6409)
    assert 10.0 < dist < 20.0

def test_haversine_distance_inter_city():
    # Bengaluru (12.9716, 77.5946) to Mysuru (12.2958, 76.6394) is ~130-145km
    dist = haversine_distance_meters(12.9716, 77.5946, 12.2958, 76.6394)
    assert 120000.0 < dist < 150000.0

# --- 2. Municipal Ward & Zone Matching Tests ---

def test_match_nearest_ward_exact():
    svc = LocationService()
    # Indiranagar coordinates
    res = svc._match_nearest_ward(12.9783, 77.6408)
    assert res["ward"] == "Indiranagar"
    assert res["ward_number"] == 112
    assert res["zone"] == "East Zone"
    assert "Mayo Hall" in res["jurisdiction_office"]

def test_match_nearest_ward_koramangala():
    svc = LocationService()
    # Koramangala coordinates
    res = svc._match_nearest_ward(12.9345, 77.6265)
    assert res["ward"] == "Koramangala"
    assert res["ward_number"] == 151
    assert res["zone"] == "South Zone"

def test_match_ward_by_text():
    svc = LocationService()
    match = svc._match_ward_by_text("Pothole near Indiranagar 100ft road metro")
    assert match is not None
    assert match["ward"] == "Indiranagar"
    assert match["ward_number"] == 112

# --- 3. Forward & Reverse Geocoding with Mocks & Cache ---

@pytest.mark.asyncio
async def test_reverse_geocode_fallback_on_network_error():
    svc = LocationService()
    with patch("httpx.AsyncClient.get", side_effect=Exception("Network down")):
        res = await svc.reverse_geocode(12.9783, 77.6408)
        assert res["ward"] == "Indiranagar"
        assert res["zone"] == "East Zone"
        assert res["city"] == "Bengaluru"

@pytest.mark.asyncio
async def test_reverse_geocode_cache_hit():
    svc = LocationService()
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "display_name": "100 Feet Road, Indiranagar, Bengaluru, Karnataka, India",
        "address": {"suburb": "Indiranagar", "road": "100 Feet Road", "city": "Bengaluru"},
    }

    with patch("httpx.AsyncClient.get", return_value=mock_resp) as mock_get:
        # First call hits mock
        res1 = await svc.reverse_geocode(12.9783, 77.6408)
        assert res1["ward"] == "Indiranagar"
        assert mock_get.call_count == 1

        # Second call with same coordinates should hit cache and NOT call HTTP
        res2 = await svc.reverse_geocode(12.9783, 77.6408)
        assert res2["ward"] == "Indiranagar"
        assert mock_get.call_count == 1

@pytest.mark.asyncio
async def test_forward_geocode_offline_fallback():
    svc = LocationService()
    with patch("httpx.AsyncClient.get", side_effect=Exception("Timeout")):
        res = await svc.forward_geocode("Koramangala 4th block")
        assert res["ward"] == "Koramangala"
        assert res["zone"] == "South Zone"
        assert res["ward_number"] == 151

# --- 4. Spatial Proximity / Cluster Search Tests ---

def test_find_nearby_complaints():
    svc = LocationService()
    complaints = [
        {"id": "C-1", "location": {"lat": 12.9783, "lng": 77.6408}},  # Target
        {"id": "C-2", "location": {"lat": 12.9784, "lng": 77.6409}},  # ~15m away
        {"id": "C-3", "location": {"lat": 12.9121, "lng": 77.6445}},  # ~7km away in HSR
    ]

    nearby = svc.find_nearby_complaints(12.9783, 77.6408, complaints, radius_meters=100.0)
    assert len(nearby) == 2
    assert nearby[0]["id"] == "C-1"
    assert nearby[0]["distance_meters"] == 0.0
    assert nearby[1]["id"] == "C-2"
    assert nearby[1]["distance_meters"] < 20.0

# --- 5. Seed Dataset Integrity Tests ---

def test_seed_dataset_integrity():
    complaints = load_seed_complaints()
    assert len(complaints) >= 25, "Expected at least 25 seed complaints"

    all_categories = set()
    for item in complaints:
        assert "id" in item
        assert "complaint_text" in item and len(item["complaint_text"]) > 20
        loc = item["location"]
        assert 12.0 < loc["lat"] < 14.0, f"Latitude {loc['lat']} out of expected Bengaluru bounds"
        assert 77.0 < loc["lng"] < 78.5, f"Longitude {loc['lng']} out of expected Bengaluru bounds"
        assert loc["ward"]
        assert loc["zone"]
        assert item["expected"]["issue_type"]
        assert item["expected"]["severity"] in ["Low", "Medium", "High", "Critical"]
        assert item["expected"]["primary_department"]
        all_categories.add(item["expected"]["issue_type"])

    # Ensure broad category coverage
    expected_categories = {"pothole", "garbage_accumulation", "streetlight_damage", "water_leakage", "drainage_blockage", "tree_fallen", "stray_animal", "illegal_construction", "road_damage", "sewage_overflow"}
    for cat in expected_categories:
        assert cat in all_categories, f"Category '{cat}' missing from seed dataset"

def test_seed_dataset_filters():
    potholes = get_complaints_by_category("pothole")
    assert len(potholes) >= 2
    criticals = get_complaints_by_severity("critical")
    assert len(criticals) >= 4
    cluster = get_cluster_complaints("CLUSTER-INDIRANAGAR-POTHOLE")
    assert len(cluster) == 2

# --- 6. REST API Endpoints Tests ---

def test_api_wards_endpoint():
    response = client.get("/api/v1/location/wards")
    assert response.status_code == 200
    data = response.json()
    assert data["count"] >= 15
    assert "indiranagar" in data["wards"]

def test_api_reverse_geocode_endpoint():
    response = client.post("/api/v1/location/reverse", json={"lat": 12.9783, "lng": 77.6408})
    assert response.status_code == 200
    data = response.json()
    assert data["ward"] == "Indiranagar"
    assert data["zone"] == "East Zone"
    assert "office" in data["jurisdiction_office"].lower() or "mayo" in data["jurisdiction_office"].lower()

def test_api_forward_geocode_endpoint():
    response = client.post("/api/v1/location/geocode", json={"query": "Koramangala 4th block"})
    assert response.status_code == 200
    data = response.json()
    assert data["ward"] == "Koramangala"
    assert data["zone"] == "South Zone"

def test_api_proximity_endpoint():
    # Check proximity around Indiranagar cluster
    response = client.post("/api/v1/location/proximity", json={"lat": 12.9783, "lng": 77.6408, "radius_meters": 100.0})
    assert response.status_code == 200
    data = response.json()
    assert data["count"] >= 1
    assert data["nearby_complaints"][0]["id"] == "SEED-001"
