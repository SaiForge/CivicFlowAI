import json
import logging
from typing import Any, Dict, Optional
from app.llm.openai_client import LLMClient
from app.llm.prompt_templates import WORKFLOW_AGENT_SYSTEM_PROMPT
from app.api.schemas import WorkflowResult

logger = logging.getLogger(__name__)

class WorkflowAgent:
    """Specialist Agent 6: Defines lifecycle status, SLA follow-up windows, and escalation targets."""

    name = "workflow"

    FOLLOW_UP_HOURS = {
        "Critical": 4,
        "High": 24,
        "Medium": 72,
        "Low": 168,
    }

    def __init__(self, llm_client: LLMClient):
        self.llm_client = llm_client

    def _get_sla_timings(self, severity: str) -> tuple[int, int]:
        normalized = severity.strip().capitalize()
        follow_up = self.FOLLOW_UP_HOURS.get(normalized, 72)
        escalation = follow_up * 2
        return follow_up, escalation

    async def run(self, state: Dict[str, Any], feedback: Optional[str] = None) -> Dict[str, Any]:
        try:
            severity_data = state.get("severity", {})
            severity = severity_data.get("severity", "Medium")
            routing_data = state.get("routing", {})
            primary_dept = routing_data.get("primary_department", "General Municipal Office")

            default_follow_up, default_escalation = self._get_sla_timings(severity)

            prompt_parts = []
            if feedback:
                prompt_parts.append(
                    f"NOTE: Your previous attempt was rejected. Feedback: {feedback}. Please correct this in your new response.\n"
                )

            prompt_parts.append(f"Assessed Severity: {severity}")
            prompt_parts.append(f"Assigned Primary Department: {primary_dept}")
            prompt_parts.append(
                f"SLA Guidelines: Status is always 'Submitted'. "
                f"Expected follow_up_after_hours for {severity}: {default_follow_up}. "
                f"Expected escalation_after_hours: {default_escalation}. "
                f"Determine an appropriate escalation_target (higher authority level above {primary_dept})."
            )

            user_prompt = "\n".join(prompt_parts)

            response = await self.llm_client.complete(
                system_prompt=WORKFLOW_AGENT_SYSTEM_PROMPT,
                user_prompt=user_prompt,
                temperature=0.1,
            )

            # Enforce deterministic SLA constraints
            response["status"] = "Submitted"
            response["follow_up_after_hours"] = int(response.get("follow_up_after_hours") or default_follow_up)
            response["escalation_after_hours"] = int(response.get("escalation_after_hours") or default_escalation)
            if not response.get("escalation_target"):
                response["escalation_target"] = f"Zonal Commissioner / Head of {primary_dept}"
            if not response.get("reasoning"):
                response["reasoning"] = f"Standard {severity} severity civic SLA with {response['follow_up_after_hours']}h follow up."

            validated = WorkflowResult(**response)
            if hasattr(validated, "model_dump"):
                return validated.model_dump()
            return validated.dict()

        except Exception as e:
            logger.error(f"WorkflowAgent run failed: {e}", exc_info=True)
            severity = state.get("severity", {}).get("severity", "Medium")
            follow_up, escalation = self._get_sla_timings(severity)
            primary_dept = state.get("routing", {}).get("primary_department", "General Municipal Office")

            fallback = WorkflowResult(
                status="Submitted",
                follow_up_after_hours=follow_up,
                escalation_after_hours=escalation,
                escalation_target=f"Zonal Commissioner of {primary_dept}",
                reasoning=f"Standard rule-based workflow fallback due to: {str(e)}",
            )
            if hasattr(fallback, "model_dump"):
                return fallback.model_dump()
            return fallback.dict()
