import pytest
import tempfile
from typing import Any, Dict, Optional

from app.api.schemas import ComplaintInput, LocationInput
from app.llm.openai_client import LLMClient
from app.agent.planner import Planner
from app.agent.executor import Executor
from app.agent.core_agent import ManagerAgent
from app.agent.specialists import (
    IssueAgent,
    EvidenceAgent,
    SeverityAgent,
    RoutingAgent,
    IncidentAgent,
    WorkflowAgent,
    VerificationAgent,
)
from app.memory.long_term import LongTermMemory

class MockLLMClient(LLMClient):
    """Mock LLM client to simulate deterministic responses without external API calls."""

    def __init__(self):
        super().__init__(api_key="mock-key")
        self.call_count = 0
        self.verification_attempt = 0
        self.verification_behavior = "always_approve"  # "always_approve", "fail_once", "always_fail"

    async def complete(
        self,
        system_prompt: str,
        user_prompt: str,
        image_b64: Optional[str] = None,
        response_schema: Optional[Dict[str, Any]] = None,
        temperature: float = 0.2,
    ) -> Dict[str, Any]:
        self.call_count += 1

        if "Issue Classification Agent" in system_prompt:
            return {
                "issue_type": "pothole",
                "confidence": 0.95,
                "extracted_keywords": ["pothole", "main road", "dangerous"],
                "short_description": "Deep pothole on main road",
                "reasoning": "Citizen reported large crater/pothole in road.",
            }

        elif "Evidence Verification Agent" in system_prompt:
            return {
                "grounding_score": 0.90,
                "text_image_consistent": True,
                "visual_findings": "Image clearly reveals deep asphalt depression.",
                "discrepancies": [],
                "reasoning": "Text and visual context align well.",
            }

        elif "Severity Assessment Agent" in system_prompt:
            return {
                "severity": "High",
                "severity_score": 75.0,
                "factor_breakdown": {
                    "safety_risk": 80.0,
                    "public_impact": 70.0,
                    "recurrence": 60.0,
                    "visual_severity": 80.0,
                },
                "reasoning": "High safety risk to two-wheelers on arterial road.",
            }

        elif "Department Routing Agent" in system_prompt:
            return {
                "primary_department": "Roads & Infrastructure Department",
                "secondary_department": None,
                "jurisdiction_office": "Central Zone Ward 12",
                "confidence": 0.92,
                "reasoning": "Pothole repair falls under Roads & Infrastructure.",
            }

        elif "Incident Compilation Agent" in system_prompt:
            return {
                "title": "Severe Pothole Hazard on Main Road",
                "description": "Hazardous road pothole requiring rapid asphalt resurfacing.",
                "category": "pothole",
                "priority": "High",
                "department": "Roads & Infrastructure Department",
                "location_summary": "Indiranagar Ward 12",
                "citizen_facing_summary": "Pothole issue logged and assigned to road maintenance crew.",
                "immediate_actions_recommended": ["Place safety barricade", "Schedule asphalt patch"],
            }

        elif "Workflow Planning Agent" in system_prompt:
            return {
                "status": "Submitted",
                "follow_up_after_hours": 24,
                "escalation_after_hours": 48,
                "escalation_target": "Chief Engineer, Roads & Infrastructure",
                "reasoning": "High severity civic standard SLA.",
            }

        elif "Verification Agent" in system_prompt:
            self.verification_attempt += 1

            if self.verification_behavior == "always_approve":
                return {
                    "approved": True,
                    "failed_agents": [],
                    "feedback": {},
                    "reasoning": "All outputs are fully consistent and substantiated.",
                }

            elif self.verification_behavior == "fail_once":
                if self.verification_attempt == 1:
                    return {
                        "approved": False,
                        "failed_agents": ["severity"],
                        "feedback": {
                            "severity": "Recalculate severity factoring in immediate transit traffic."
                        },
                        "reasoning": "Initial severity scoring check failed.",
                    }
                else:
                    return {
                        "approved": True,
                        "failed_agents": [],
                        "feedback": {},
                        "reasoning": "Corrected severity now passes quality criteria.",
                    }

            elif self.verification_behavior == "always_fail":
                return {
                    "approved": False,
                    "failed_agents": ["severity"],
                    "feedback": {
                        "severity": "Severity calculation remains inconsistent with evidence grounding."
                    },
                    "reasoning": "Continuous failure to meet confidence thresholds.",
                }

        return {}

def create_test_system(mock_llm: MockLLMClient, tmp_dir: str):
    db_path = f"sqlite:///{tmp_dir}/test_civic.db"
    long_term = LongTermMemory(db_url=db_path)
    planner = Planner()

    registry = {
        "issue": IssueAgent(llm_client=mock_llm),
        "evidence": EvidenceAgent(llm_client=mock_llm),
        "severity": SeverityAgent(llm_client=mock_llm),
        "routing": RoutingAgent(llm_client=mock_llm),
        "incident": IncidentAgent(llm_client=mock_llm),
        "workflow": WorkflowAgent(llm_client=mock_llm),
        "verification": VerificationAgent(llm_client=mock_llm),
    }

    executor = Executor(agent_registry=registry)
    manager = ManagerAgent(
        planner=planner,
        executor=executor,
        long_term=long_term,
        max_retries=2,
    )
    return manager, long_term

@pytest.mark.asyncio
async def test_full_pipeline_happy_path():
    """Test 1: Full pipeline runs and returns approved=True ticket when all mocked responses are good."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        mock_llm = MockLLMClient()
        mock_llm.verification_behavior = "always_approve"
        manager, long_term = create_test_system(mock_llm, tmp_dir)

        complaint = ComplaintInput(
            text="Large dangerous pothole on Main Street in front of the metro station.",
            location=LocationInput(lat=12.9716, lng=77.5946),
        )

        ticket = await manager.process_complaint(complaint)

        assert ticket["status"] == "Submitted"
        assert ticket["retry_count"] == 0
        assert ticket["verification"]["approved"] is True
        assert ticket["issue_type"] == "pothole"
        assert ticket["severity"] == "High"
        assert ticket["department"] == "Roads & Infrastructure Department"
        assert len(ticket["audit_trail"]) > 0

        # Verify audit trail contains stage 1, 2, and 3 records
        agent_names_in_audit = [a["agent_name"] for a in ticket["audit_trail"]]
        for expected in ["issue", "evidence", "severity", "routing", "incident", "workflow", "verification"]:
            assert expected in agent_names_in_audit

@pytest.mark.asyncio
async def test_pipeline_retry_and_succeed():
    """
    Test 2: Verification fails on first attempt (mock returns approved=False, failed_agents=['severity']),
    then succeeds on second attempt. Assert ManagerAgent retries exactly once and final ticket status == 'Submitted'.
    """
    with tempfile.TemporaryDirectory() as tmp_dir:
        mock_llm = MockLLMClient()
        mock_llm.verification_behavior = "fail_once"
        manager, long_term = create_test_system(mock_llm, tmp_dir)

        complaint = ComplaintInput(
            text="Pothole needs immediate attention.",
            location=LocationInput(lat=12.9716, lng=77.5946),
        )

        ticket = await manager.process_complaint(complaint)

        assert ticket["status"] == "Submitted"
        assert ticket["retry_count"] == 1
        assert ticket["verification"]["approved"] is True

        # Check downstream re-run cascade:
        # Severity downstream dependents according to planner are ['incident', 'workflow']
        # So retry 1 should re-run: severity, incident, workflow, verification
        audit_trail = ticket["audit_trail"]
        retry_entries = [e for e in audit_trail if e["attempt_number"] == 1]
        retry_agents = [e["agent_name"] for e in retry_entries]

        assert "severity" in retry_agents
        assert "incident" in retry_agents
        assert "workflow" in retry_agents
        assert "verification" in retry_agents

@pytest.mark.asyncio
async def test_pipeline_max_retries_exhausted():
    """
    Test 3: Verification fails MAX_RETRIES times. Assert final status == 'needs_manual_review'
    and no exception is raised.
    """
    with tempfile.TemporaryDirectory() as tmp_dir:
        mock_llm = MockLLMClient()
        mock_llm.verification_behavior = "always_fail"
        manager, long_term = create_test_system(mock_llm, tmp_dir)

        complaint = ComplaintInput(
            text="Uncertain complaint description.",
            location=LocationInput(lat=12.9716, lng=77.5946),
        )

        # Must not raise an exception; must return ticket gracefully
        ticket = await manager.process_complaint(complaint)

        assert ticket["status"] == "needs_manual_review"
        assert ticket["retry_count"] == 2  # default MAX_RETRIES
        assert ticket["verification"]["approved"] is False
        assert len(ticket["audit_trail"]) > 0

        # Verify stored ticket in database matches returned ticket
        stored = long_term.get_ticket(ticket["ticket_id"])
        assert stored is not None
        assert stored["status"] == "needs_manual_review"



@pytest.mark.asyncio
async def test_gemini_client_configuration_and_mock_call():
    """Test Gemini provider initialization and execution with mocked httpx."""
    from unittest.mock import patch, MagicMock

    gemini_client = LLMClient(
        gemini_api_key="mock-gemini-key",
        provider="gemini",
        gemini_model="gemini-1.5-flash",
    )
    assert gemini_client.provider == "gemini"

    mock_gemini_resp = MagicMock()
    mock_gemini_resp.status_code = 200
    mock_gemini_resp.json.return_value = {
        "candidates": [
            {
                "content": {
                    "parts": [
                        {
                            "text": '{"issue_type": "drainage_blockage", "confidence": 0.9, "extracted_keywords": ["drain"], "short_description": "Blocked drain", "reasoning": "Clear drain blockage"}'
                        }
                    ]
                }
            }
        ]
    }

    with patch("httpx.AsyncClient.post", return_value=mock_gemini_resp):
        res = await gemini_client.complete(
            system_prompt="Test system prompt",
            user_prompt="Drain is clogged with debris",
            temperature=0.1,
        )
        assert res["issue_type"] == "drainage_blockage"
        assert res["confidence"] == 0.9

