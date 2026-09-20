import asyncio
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from app.agent.specialists.verification_agent import VerificationAgent
from app.llm.openai_client import LLMClient

def test_verification():
    llm = LLMClient()
    verifier = VerificationAgent(llm_client=llm, confidence_threshold=0.7)

    # Test 1: Contradiction - No image, but visual_severity > 0
    bad_state = {
        "input": {"text": "Water pipe leak", "image_base64": None},
        "issue": {"issue_type": "water_leakage", "confidence": 0.95},
        "evidence": {"image_provided": False, "grounding_score": 1.0, "visual_findings": "no image provided"},
        "severity": {
            "severity": "Critical",
            "severity_score": 85.0,
            "factor_breakdown": {"safety_risk": 85.0, "public_impact": 85.0, "recurrence": 85.0, "visual_severity": 85.0}
        },
        "routing": {"primary_department": "Water Board", "confidence": 0.95},
        "incident": {"title": "Critical Water Leak", "department": "Water Board"},
        "workflow": {"follow_up_after_hours": 4, "steps": ["Dispatch crew"]}
    }

    checks = verifier._run_programmatic_checks(bad_state)
    print("Test 1 - No image but visual_severity > 0:")
    print(f"  Approved: {checks['approved']}")
    print(f"  Failed agents: {checks['failed_agents']}")
    assert not checks['approved'], "Should have failed due to visual_severity > 0 with no image"
    assert "severity" in checks['failed_agents']

    # Test 2: Low issue confidence
    low_conf_state = dict(bad_state)
    low_conf_state["severity"] = {
        "severity": "Critical",
        "severity_score": 85.0,
        "factor_breakdown": {"safety_risk": 85.0, "public_impact": 85.0, "recurrence": 85.0, "visual_severity": 0.0}
    }
    low_conf_state["issue"] = {"issue_type": "water_leakage", "confidence": 0.45}
    checks2 = verifier._run_programmatic_checks(low_conf_state)
    print("\nTest 2 - Low issue confidence:")
    print(f"  Approved: {checks2['approved']}")
    print(f"  Failed agents: {checks2['failed_agents']}")
    assert not checks2['approved']
    assert "issue" in checks2['failed_agents']

    # Test 3: Fully valid state
    good_state = dict(bad_state)
    good_state["issue"] = {"issue_type": "water_leakage", "confidence": 0.95}
    good_state["severity"] = {
        "severity": "Critical",
        "severity_score": 81.3,
        "factor_breakdown": {"safety_risk": 85.0, "public_impact": 85.0, "recurrence": 40.0, "visual_severity": 0.0}
    }
    checks3 = verifier._run_programmatic_checks(good_state)
    print("\nTest 3 - Fully valid state:")
    print(f"  Approved: {checks3['approved']}")
    print(f"  Failed agents: {checks3['failed_agents']}")
    print(f"  Checks passed: {checks3['checks_passed']}")
    assert checks3['approved']
    assert len(checks3['failed_agents']) == 0

    print("\nSUCCESS: All verification programmatic checks passed as expected!")

if __name__ == "__main__":
    test_verification()
