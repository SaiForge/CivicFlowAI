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

    def _run_programmatic_checks(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """
        Deterministic, rule-based verification safety net.
        Executes regardless of LLM availability to guarantee system integrity.
        """
        issue = state.get("issue", {})
        evidence = state.get("evidence", {})
        severity = state.get("severity", {})
        routing = state.get("routing", {})
        incident = state.get("incident", {})
        workflow = state.get("workflow", {})
        input_data = state.get("input", {})

        failed_agents: List[str] = []
        feedback_dict: Dict[str, str] = {}
        checks_passed: List[str] = []

        # 1. Completeness of all 6 upstream components
        for comp_name, comp_data in [
            ("issue", issue),
            ("evidence", evidence),
            ("severity", severity),
            ("routing", routing),
            ("incident", incident),
            ("workflow", workflow),
        ]:
            if not comp_data or not isinstance(comp_data, dict):
                failed_agents.append(comp_name)
                feedback_dict[comp_name] = f"Component '{comp_name}' is missing or produced invalid output."

        # 2. Issue classification confidence check
        issue_conf = float(issue.get("confidence", 1.0))
        if issue_conf < self.confidence_threshold:
            if "issue" not in failed_agents:
                failed_agents.append("issue")
            feedback_dict["issue"] = (
                f"Issue classification confidence ({issue_conf:.2f}) is below required threshold ({self.confidence_threshold:.2f}). Re-analyze complaint specifics."
            )
        else:
            checks_passed.append(f"Issue confidence {issue_conf:.2f} >= {self.confidence_threshold:.2f}")

        # 3. Routing confidence check
        routing_conf = float(routing.get("confidence", 1.0))
        if routing_conf < self.confidence_threshold:
            if "routing" not in failed_agents:
                failed_agents.append("routing")
            feedback_dict["routing"] = (
                f"Routing confidence ({routing_conf:.2f}) is below required threshold ({self.confidence_threshold:.2f}). Review department jurisdiction."
            )
        else:
            checks_passed.append(f"Routing confidence {routing_conf:.2f} >= {self.confidence_threshold:.2f}")

        # 4. Evidence Grounding vs Severity Check
        sev_level = str(severity.get("severity", "Low")).capitalize()
        grounding = float(evidence.get("grounding_score", 1.0))
        is_sensitive = bool(input_data.get("is_sensitive", False))
        if sev_level in ["High", "Critical"] and grounding < 0.4 and not is_sensitive:
            if "severity" not in failed_agents:
                failed_agents.append("severity")
            feedback_dict["severity"] = (
                f"Severity assessed as {sev_level} but evidence grounding score is too low ({grounding:.2f} < 0.40). Re-assess severity based strictly on grounded facts."
            )
        else:
            checks_passed.append("Severity/grounding alignment verified")

        # 5. Visual Severity Contradiction Check (Strict Grounding)
        has_image = bool(input_data.get("image_base64")) or bool(evidence.get("image_provided"))
        fb = severity.get("factor_breakdown", {})
        visual_score = float(fb.get("visual_severity", 0.0))
        if not has_image and visual_score > 0.0:
            if "severity" not in failed_agents:
                failed_agents.append("severity")
            feedback_dict["severity"] = (
                f"Logical contradiction: visual_severity scored {visual_score} when no visual image was provided. Set visual_severity=0.0 and redistribute weights (safety 45%, impact 35%, recurrence 20%)."
            )
        else:
            checks_passed.append("Visual evidence rubric consistency verified")

        # 6. Incident Ticket completeness
        if not incident.get("title") or not incident.get("department"):
            if "incident" not in failed_agents:
                failed_agents.append("incident")
            feedback_dict["incident"] = "Incident ticket missing title or designated department."
        else:
            checks_passed.append("Incident ticket structure verified")

        # 7. Workflow bounds check
        sla_hours = int(workflow.get("follow_up_after_hours", 0))
        if sla_hours <= 0:
            if "workflow" not in failed_agents:
                failed_agents.append("workflow")
            feedback_dict["workflow"] = "Workflow follow_up_after_hours must be a positive integer."
        else:
            checks_passed.append(f"Workflow SLA {sla_hours}h verified")

        return {
            "approved": len(failed_agents) == 0,
            "failed_agents": failed_agents,
            "feedback": feedback_dict,
            "checks_passed": checks_passed,
        }

    async def run(self, state: Dict[str, Any], feedback: Optional[str] = None) -> Dict[str, Any]:
        # Always run deterministic programmatic checks first
        prog_check = self._run_programmatic_checks(state)
        prog_approved = prog_check["approved"]
        prog_failed = list(prog_check["failed_agents"])
        prog_feedback = dict(prog_check["feedback"])
        prog_checks_passed = prog_check["checks_passed"]

        issue = state.get("issue", {})
        evidence = state.get("evidence", {})
        severity = state.get("severity", {})
        routing = state.get("routing", {})
        incident = state.get("incident", {})
        workflow = state.get("workflow", {})

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
            f"Quality Criteria:\n"
            f"1. Completeness: Ensure all required fields exist and are populated (Note: secondary_department in routing is optional and may be null or 'N/A').\n"
            f"2. Consistency: Severity vs Grounding (High/Critical requires grounding_score >= 0.4).\n"
            f"3. Strict Grounding: If no image was provided, visual_severity MUST be 0.0.\n"
            f"4. Confidence: issue confidence >= {self.confidence_threshold} and routing confidence >= {self.confidence_threshold}.\n"
            f"Identify failed agents precisely: ['issue', 'evidence', 'severity', 'routing', 'incident', 'workflow']."
        )

        try:
            response = await self.llm_client.complete(
                system_prompt=VERIFICATION_AGENT_SYSTEM_PROMPT,
                user_prompt=user_prompt,
                temperature=0.0,
            )

            llm_approved = bool(response.get("approved", True))
            llm_failed = list(response.get("failed_agents", []))
            llm_feedback = dict(response.get("feedback", {}))
            llm_reasoning = str(response.get("reasoning", "")).strip()

            # Merge programmatic safety checks with LLM verification
            combined_failed = list(dict.fromkeys(prog_failed + llm_failed))
            combined_feedback = {**llm_feedback, **prog_feedback}

            approved = len(combined_failed) == 0
            if approved:
                reasoning = (
                    llm_reasoning
                    if llm_reasoning
                    else f"All quality gates PASSED ({len(prog_checks_passed)} checks: {'; '.join(prog_checks_passed[:3])}). Output approved."
                )
            else:
                reasoning = (
                    f"Verification REJECTED for agents [{', '.join(combined_failed)}]. "
                    f"Actionable feedback dispatched to ManagerAgent retry loop."
                )

            result = VerificationResult(
                approved=approved,
                failed_agents=combined_failed,
                feedback=combined_feedback,
                reasoning=reasoning,
            )
            if hasattr(result, "model_dump"):
                return result.model_dump()
            return result.dict()

        except Exception as e:
            logger.warning(f"VerificationAgent LLM call fell back to deterministic rule engine: {e}")
            # If programmatic checks caught failures, REJECT so ManagerAgent can retry
            if not prog_approved:
                reasoning = (
                    f"Deterministic verification REJECTED agents [{', '.join(prog_failed)}]. "
                    f"ManagerAgent initiating corrective retry cascade."
                )
            else:
                reasoning = (
                    f"Deterministic quality gate PASSED: Verified confidence thresholds (issue & routing >= {self.confidence_threshold}), "
                    f"department routing consistency, evidence grounding alignment, and SLA constraints."
                )

            fallback = VerificationResult(
                approved=prog_approved,
                failed_agents=prog_failed,
                feedback=prog_feedback,
                reasoning=reasoning,
            )
            if hasattr(fallback, "model_dump"):
                return fallback.model_dump()
            return fallback.dict()
