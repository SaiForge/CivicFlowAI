#!/usr/bin/env python3
"""
Interactive Demonstration & Verification Script for
CivicFlowAI: Data Preparation, Geocoding & Location Service
"""

import asyncio
import json
from pathlib import Path
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

def print_header(title: str):
    print("\n" + "=" * 75)
    print(f"  {title.upper()}")
    print("=" * 75)

def test_dataset():
    print_header("1. Seed Dataset Inspection & Statistics")
    complaints = load_seed_complaints()
    print(f"Total Seed Complaints Loaded : {len(complaints)}")
    
    categories = {}
    severities = {}
    for c in complaints:
        cat = c.get("expected", {}).get("issue_type", "unknown")
        sev = c.get("expected", {}).get("severity", "unknown")
        categories[cat] = categories.get(cat, 0) + 1
        severities[sev] = severities.get(sev, 0) + 1

    print("\nCategory Distribution:")
    for cat, count in sorted(categories.items()):
        print(f"  - {cat:<25} : {count} complaint(s)")

    print("\nSeverity Distribution:")
    for sev, count in sorted(severities.items()):
        print(f"  - {sev:<10} : {count} complaint(s)")

    # Sample a complaint
    sample = complaints[0]
    print("\nSample Complaint Record (SEED-001):")
    print(f"  ID         : {sample['id']}")
    print(f"  Text       : {sample['complaint_text'][:70]}...")
    print(f"  Location   : Lat {sample['location']['lat']}, Lng {sample['location']['lng']}")
    print(f"  Ward       : {sample['location']['ward']} (Ward #{sample['location']['ward_number']})")
    print(f"  Zone       : {sample['location']['zone']}")
    print(f"  Department : {sample['expected']['primary_department']}")

async def test_geocoding():
    print_header("2. LocationService: Reverse & Forward Geocoding")
    service = LocationService()

    # A. Reverse Geocoding
    print("--- [A] Reverse Geocoding (GPS Coordinates -> Municipal Ward & Office) ---")
    test_coords = [
        ("Indiranagar Junction", 12.9783, 77.6408),
        ("Koramangala 4th Block", 12.9345, 77.6265),
        ("HSR Layout Sector 2", 12.9121, 77.6445),
        ("Malleshwaram 8th Cross", 12.9984, 77.5714),
    ]

    for label, lat, lng in test_coords:
        res = await service.reverse_geocode(lat, lng)
        print(f"\n  Input Coordinates : {label} ({lat}, {lng})")
        print(f"  Resolved Area     : {res.get('area')}")
        print(f"  Municipal Ward    : {res.get('ward')} (Ward #{res.get('ward_number')})")
        print(f"  Zonal Office      : {res.get('jurisdiction_office')}")
        print(f"  Zone              : {res.get('zone')}")

    # B. Forward Geocoding
    print("\n--- [B] Forward Geocoding (Landmark String -> Coordinates & Ward) ---")
    test_queries = [
        "Indiranagar Metro Station",
        "Koramangala 4th block",
        "Whitefield ECC Road",
    ]

    for q in test_queries:
        res = await service.forward_geocode(q)
        print(f"\n  Query String   : \"{q}\"")
        print(f"  Coordinates    : Lat {res.get('lat')}, Lng {res.get('lng')}")
        print(f"  Matched Ward   : {res.get('ward')} ({res.get('zone')})")
        print(f"  Office         : {res.get('jurisdiction_office')}")

def test_proximity_and_clustering():
    print_header("3. Spatial Proximity & Incident Clustering (Haversine)")
    service = LocationService()
    complaints = load_seed_complaints()

    # Scenario: A citizen reports an issue near Indiranagar Metro Pillar 42
    citizen_lat, citizen_lng = 12.97835, 77.64085
    radius = 200.0  # 200 meters

    print(f"Incoming Citizen Report at Lat {citizen_lat}, Lng {citizen_lng}")
    print(f"Searching for existing complaints within {radius} meters radius...\n")

    nearby = service.find_nearby_complaints(citizen_lat, citizen_lng, complaints, radius_meters=radius)
    print(f"Found {len(nearby)} existing complaint(s) in proximity:")
    for idx, c in enumerate(nearby, 1):
        dist = c.get("distance_meters")
        print(f"  [{idx}] ID: {c['id']} | Distance: {dist:.1f}m | Category: {c['expected']['issue_type']}")
        print(f"      Text: \"{c['complaint_text'][:65]}...\"")
        print(f"      Cluster ID: {c['expected'].get('cluster_id')}")

def test_api_endpoints():
    print_header("4. FastAPI Location Endpoints (Live Client Test)")
    client = TestClient(app)

    # 1. GET /api/v1/location/wards
    res = client.get("/api/v1/location/wards")
    print(f"1. GET  /api/v1/location/wards      -> Status: {res.status_code}")
    print(f"   Registered Municipal Wards Count: {res.json().get('count')}")

    # 2. POST /api/v1/location/geocode
    res = client.post("/api/v1/location/geocode", json={"query": "Indiranagar 100ft road"})
    print(f"\n2. POST /api/v1/location/geocode    -> Status: {res.status_code}")
    print(f"   Response: {json.dumps(res.json(), indent=2)}")

    # 3. POST /api/v1/location/reverse
    res = client.post("/api/v1/location/reverse", json={"lat": 12.9345, "lng": 77.6265})
    print(f"\n3. POST /api/v1/location/reverse    -> Status: {res.status_code}")
    print(f"   Response: {json.dumps(res.json(), indent=2)}")

    # 4. POST /api/v1/location/proximity
    res = client.post("/api/v1/location/proximity", json={"lat": 12.9783, "lng": 77.6408, "radius_meters": 150.0})
    print(f"\n4. POST /api/v1/location/proximity  -> Status: {res.status_code}")
    data = res.json()
    print(f"   Count of nearby incidents within 150m: {data.get('count')}")
    for item in data.get("nearby_complaints", []):
        print(f"   - Match: {item['id']} ({item.get('distance_meters')}m away) -> {item['expected']['issue_type']}")

async def main():
    test_dataset()
    await test_geocoding()
    test_proximity_and_clustering()
    test_api_endpoints()
    print_header("All Tests & Demonstrations Completed Successfully!")

if __name__ == "__main__":
    asyncio.run(main())
