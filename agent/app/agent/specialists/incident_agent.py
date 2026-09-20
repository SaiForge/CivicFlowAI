import json
import logging
from typing import Any, Dict, Optional
from app.llm.openai_client import LLMClient
from app.llm.prompt_templates import INCIDENT_AGENT_SYSTEM_PROMPT
from app.api.schemas import IncidentResult

logger = logging.getLogger(__name__)

class IncidentAgent:
    """Specialist Agent 5: Compiles a structured, professional incident ticket from prior outputs."""

    name = "incident"

    def __init__(self, llm_client: LLMClient):
        self.llm_client = llm_client

    async def run(self, state: Dict[str, Any], feedback: Optional[str] = None) -> Dict[str, Any]:
        try:
            complaint_input = state.get("input", {})
            issue = state.get("issue", {})
            evidence = state.get("evidence", {})
            severity = state.get("severity", {})
            routing = state.get("routing", {})

            prompt_parts = []
            if feedback:
                prompt_parts.append(
                    f"NOTE: Your previous attempt was rejected. Feedback: {feedback}. Please correct this in your new response.\n"
                )

            context_data = {
                "citizen_complaint_text": complaint_input.get("text", ""),
                "location": complaint_input.get("location"),
                "issue_classification": issue,
                "evidence_assessment": evidence,
                "severity_assessment": severity,
                "department_routing": routing,
            }

            prompt_parts.append("Upstream Pipeline Outputs:")
            prompt_parts.append(json.dumps(context_data, indent=2))
            prompt_parts.append(
                "\nCreate an official, professional Incident Ticket containing: "
                "title, description, category, priority, department, location_summary, "
                "citizen_facing_summary, and immediate_actions_recommended."
            )

            user_prompt = "\n".join(prompt_parts)

            response = await self.llm_client.complete(
                system_prompt=INCIDENT_AGENT_SYSTEM_PROMPT,
                user_prompt=user_prompt,
                temperature=0.2,
            )

            # Ensure all required keys exist, filling defaults from upstream if omitted
            category = response.get("category") or issue.get("issue_type") or "Civic Issue"
            priority = response.get("priority") or severity.get("severity") or "Medium"
            dept = response.get("department") or routing.get("primary_department") or "General Municipal Office"

            response["category"] = category
            response["priority"] = priority
            response["department"] = dept
            if not response.get("location_summary"):
                loc = complaint_input.get("location")
                response["location_summary"] = str(loc) if loc else "Location not specified"
            if not response.get("title"):
                response["title"] = f"{priority} Priority {category.replace('_', ' ').title()}"
            if not response.get("description"):
                response["description"] = complaint_input.get("text", "No detailed description provided.")
            if not response.get("citizen_facing_summary"):
                response["citizen_facing_summary"] = "Your complaint has been logged and assigned for resolution."
            if not response.get("immediate_actions_recommended"):
                response["immediate_actions_recommended"] = ["Inspect location", "Dispatch field crew"]

            validated = IncidentResult(**response)
            if hasattr(validated, "model_dump"):
                return validated.model_dump()
            return validated.dict()

        except Exception as e:
            logger.error(f"IncidentAgent run failed: {e}", exc_info=True)
            fallback = IncidentResult(
                title="Civic Incident Report",
                description=str(state.get("input", {}).get("text", "Civic issue report")),
                category=str(state.get("issue", {}).get("issue_type", "general")),
                priority=str(state.get("severity", {}).get("severity", "Medium")),
                department=str(state.get("routing", {}).get("primary_department", "General Municipal Office")),
                location_summary="Reported location",
                citizen_facing_summary="Your issue has been recorded and submitted for municipal review.",
                immediate_actions_recommended=["Schedule preliminary inspection"],
            )
            if hasattr(fallback, "model_dump"):
                return fallback.model_dump()
            return fallback.dict()
