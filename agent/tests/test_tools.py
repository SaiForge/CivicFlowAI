import os
import tempfile
import pytest
from unittest.mock import patch, MagicMock

from app.tools.department_lookup_tool import DepartmentLookupTool
from app.tools.geocode_tool import GeocodeTool
from app.tools.calculator_tool import CalculatorTool
from app.tools.file_tool import FileTool

def test_department_lookup_tool():
    tool = DepartmentLookupTool()

    # Known issue types
    res_pothole = tool.run(issue_type="pothole")
    assert res_pothole["primary_department"] == "Roads & Infrastructure Department"

    res_garbage = tool.run(issue_type="garbage_accumulation")
    assert res_garbage["primary_department"] == "Sanitation Department"

    res_light = tool.run(issue_type="streetlight_damage")
    assert res_light["primary_department"] == "Electrical Department"

    res_water = tool.run(issue_type="water_leakage")
    assert res_water["primary_department"] == "Water Board"

    res_drainage = tool.run(issue_type="drainage_blockage")
    assert res_drainage["primary_department"] == "Water Board"
    assert res_drainage["secondary_department"] == "Sanitation Department"

    res_sewage = tool.run(issue_type="sewage_overflow")
    assert res_sewage["primary_department"] == "Sanitation Department"
    assert res_sewage["secondary_department"] == "Water Board"

    res_illegal = tool.run(issue_type="illegal_construction")
    assert res_illegal["primary_department"] == "Municipal Planning Department"

    res_tree = tool.run(issue_type="tree_fallen")
    assert res_tree["primary_department"] == "Parks & Horticulture Department"

    res_stray = tool.run(issue_type="stray_animal")
    assert res_stray["primary_department"] == "Animal Control Department"

    # Fallback unmapped
    res_unknown = tool.run(issue_type="alien_invasion")
    assert res_unknown["primary_department"] == "General Municipal Office"

def test_geocode_tool_fallback_on_network_error():
    tool = GeocodeTool()

    # Mock httpx.Client to raise exception simulating offline / unreachable
    with patch("httpx.Client.get", side_effect=Exception("Network unreachable")):
        result = tool.run(lat=12.9716, lng=77.5946)
        assert result["ward"] == "Unknown"
        assert result["area"] == "Unknown"
        assert result["city"] == "Unknown"

@pytest.mark.asyncio
async def test_geocode_tool_async_fallback_on_network_error():
    tool = GeocodeTool()

    # Mock httpx.AsyncClient to raise exception
    with patch("httpx.AsyncClient.get", side_effect=Exception("Connection timed out")):
        result = await tool.arun(lat=12.9716, lng=77.5946)
        assert result["ward"] == "Unknown"
        assert result["area"] == "Unknown"
        assert result["city"] == "Unknown"

def test_geocode_tool_success_parse():
    tool = GeocodeTool()
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "address": {
            "suburb": "Indiranagar",
            "road": "100 Feet Road",
            "city": "Bengaluru",
        }
    }

    with patch("httpx.Client.get", return_value=mock_response):
        result = tool.run(lat=12.9716, lng=77.5946)
        assert result["ward"] == "Indiranagar"
        assert result["area"] == "100 Feet Road"
        assert result["city"] == "Bengaluru"

def test_calculator_tool():
    calc = CalculatorTool()
    # Test arithmetic
    expr = "(80 * 0.40) + (70 * 0.30) + (60 * 0.15) + (50 * 0.15)"
    # 32 + 21 + 9 + 7.5 = 69.5
    assert calc.run(expr) == 69.5

    # Test invalid expression handles gracefully without crashing
    assert calc.run("__import__('os').system('ls')") == 0.0

def test_file_tool():
    with tempfile.TemporaryDirectory() as tmpdir:
        tool = FileTool(upload_dir=tmpdir)
        # Small sample 1x1 png base64
        sample_b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
        saved_path = tool.run(action="save", data=sample_b64, prefix="test_proof")
        assert os.path.exists(saved_path)

        read_b64 = tool.run(action="read", file_path=saved_path)
        assert read_b64 is not None
