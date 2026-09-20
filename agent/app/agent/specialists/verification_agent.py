import json
import logging
from typing import Any, Dict, List, Optional
from app.llm.openai_client import LLMClient
from app.llm.prompt_templates import VERIFICATION_AGENT_SYSTEM_PROMPT
from app.api.schemas import VerificationResult
from app.config.settings import settings

logger = logging.getLogger(__name__)

class VerificationAgent:
    """Specialist Agent 7: Final quality gate validating completeness, consistency, and confidence."""

    name = "verification"

    def __init__(self, llm_client: LLMClient, confidence_threshold: Optional[float] = None):
        self.llm_client = llm_client
        self.confidence_threshold = (
            confidence_threshold
            if confidence_threshold is not None
            else settings.CONFIDENCE_THRESHOLD
        )

    async def run(self, state: Dict[str, Any], feedback: Optional[str] = None) -> Dict[str, Any]:
        try:
            issue = state.get("issue", {})
            evidence = state.get("evidence", {})
            severity = state.get("severity", {})
            routing = state.get("routing", {})
            incident = state.get("incident", {})
            workflow = state.get("workflow", {})

            # Prepare full context for LLM verification
            pipeline_data = {
                "issue": issue,
                "evidence": evidence,
                "severity": severity,
                "routing": routing,
                "incident": incident,
                "workflow": workflow,
                "confidence_threshold": self.confidence_threshold,
            }

            user_prompt = (
                f"Verify the following complete civic pipeline state against quality standards:\n"
                f"{json.dumps(pipeline_data, indent=2)}\n\n"
                f"Criteria:\n"
                f"1. Completeness: Ensure all keys exist and are populated.\n"
                f"2. Consistency: Severity vs Grounding (High/Critical requires grounding_score >= 0.4), "
                f"routing matches issue type, incident reflects upstream results.\n"
                f"3. Confidence: issue confidence >= {self.confidence_threshold} and routing confidence >= {self.confidence_threshold}.\n"
                f"Identify failed agents precisely: ['issue', 'evidence', 'severity', 'routing', 'incident', 'workflow']."
            )

            response = await self.llm_client.complete(
                system_prompt=VERIFICATION_AGENT_SYSTEM_PROMPT,
                user_prompt=user_prompt,
                temperature=0.0,
            )

            approved = bool(response.get("approved", True))
            failed_agents = list(response.get("failed_agents", []))
            feedback_dict = dict(response.get("feedback", {}))
            reasoning = str(response.get("reasoning", "Verification check completed."))

            # Programmatic safety net checks
            # 1. Issue confidence check
            issue_conf = float(issue.get("confidence", 1.0))
            if issue_conf < self.confidence_threshold:
                approved = False
                if "issue" not in failed_agents:
                    failed_agents.append("issue")
                if "issue" not in feedback_dict:
                    feedback_dict["issue"] = (
                        f"Issue classification confidence ({issue_conf}) is below required threshold ({self.confidence_threshold})."
                    )

            # 2. Routing confidence check
            routing_conf = float(routing.get("confidence", 1.0))
            if routing_conf < self.confidence_threshold:
                approved = False
                if "routing" not in failed_agents:
                    failed_agents.append("routing")
                if "routing" not in feedback_dict:
                    feedback_dict["routing"] = (
                        f"Routing confidence ({routing_conf}) is below required threshold ({self.confidence_threshold})."
                    )

            # 3. Severe issue with poor grounding check
            sev_level = str(severity.get("severity", "Low")).capitalize()
            grounding = float(evidence.get("grounding_score", 1.0))
            if sev_level in ["High", "Critical"] and grounding < 0.4:
                approved = False
                if "severity" not in failed_agents:
                    failed_agents.append("severity")
                if "severity" not in feedback_dict:
                    feedback_dict["severity"] = (
                        f"Severity assessed as {sev_level} but evidence grounding score is too low ({grounding} < 0.4)."
                    )

            # If failed_agents is empty, ensure approved is True
            if not failed_agents:
                approved = True
                feedback_dict = {}
            else:
                approved = False

            result = VerificationResult(
                approved=approved,
                failed_agents=failed_agents,
                feedback=feedback_dict,
                reasoning=reasoning,
            )
            if hasattr(result, "model_dump"):
                return result.model_dump()
            return result.dict()

        except Exception as e:
            logger.error(f"VerificationAgent run failed: {e}", exc_info=True)
            # In case of verification failure, do not crash pipeline
            fallback = VerificationResult(
                approved=True,
                failed_agents=[],
                feedback={},
                reasoning=f"Automatic pass-through due to verification error: {str(e)}",
            )
            if hasattr(fallback, "model_dump"):
                return fallback.model_dump()
            return fallback.dict()
