import logging
from typing import Any, Dict, Optional
from app.llm.openai_client import LLMClient
from app.llm.prompt_templates import SEVERITY_AGENT_SYSTEM_PROMPT
from app.api.schemas import SeverityResult, SeverityFactorBreakdown
from app.tools.calculator_tool import CalculatorTool

logger = logging.getLogger(__name__)

class SeverityAgent:
    """Specialist Agent 3: Evaluates civic issue severity using a 4-factor weighted rubric."""

    name = "severity"

    def __init__(self, llm_client: LLMClient):
        self.llm_client = llm_client
        self.calculator = CalculatorTool()

    async def run(self, state: Dict[str, Any], feedback: Optional[str] = None) -> Dict[str, Any]:
        try:
            complaint_input = state.get("input", {})
            text = complaint_input.get("text") or "No textual description provided."
            image_b64 = complaint_input.get("image_base64")
            evidence = state.get("evidence", {})
            issue = state.get("issue", {})

            prompt_parts = []
            if feedback:
                prompt_parts.append(
                    f"NOTE: Your previous attempt was rejected. Feedback: {feedback}. Please correct this in your new response.\n"
                )

            prompt_parts.append(f"Complaint Text: {text}")
            if issue:
                prompt_parts.append(f"Identified Issue Category: {issue.get('issue_type', 'unknown')}")
            if evidence:
                prompt_parts.append(f"Evidence Findings: {evidence.get('visual_findings', 'none')}")
                prompt_parts.append(f"Evidence Grounding Score: {evidence.get('grounding_score', 'unknown')}")

            user_prompt = "\n".join(prompt_parts)

            response = await self.llm_client.complete(
                system_prompt=SEVERITY_AGENT_SYSTEM_PROMPT,
                user_prompt=user_prompt,
                image_b64=image_b64,
                temperature=0.1,
            )

            # Ensure factor breakdown exists
            fb = response.get("factor_breakdown", {})
            safety = float(fb.get("safety_risk", 0.0))
            impact = float(fb.get("public_impact", 0.0))
            recurrence = float(fb.get("recurrence", 0.0))
            visual = float(fb.get("visual_severity", 0.0))

            # Recalculate accurately using calculator tool for determinism
            calc_expr = f"({safety} * 0.40) + ({impact} * 0.30) + ({recurrence} * 0.15) + ({visual} * 0.15)"
            calculated_score = round(self.calculator.run(calc_expr), 1)

            # Re-map severity category if score doesn't align
            if calculated_score >= 80:
                calculated_severity = "Critical"
            elif calculated_score >= 60:
                calculated_severity = "High"
            elif calculated_score >= 30:
                calculated_severity = "Medium"
            else:
                calculated_severity = "Low"

            # Use LLM values but sync score and level
            response["severity_score"] = calculated_score
            response["severity"] = response.get("severity") or calculated_severity
            response["factor_breakdown"] = {
                "safety_risk": safety,
                "public_impact": impact,
                "recurrence": recurrence,
                "visual_severity": visual,
            }

            validated = SeverityResult(**response)
            if hasattr(validated, "model_dump"):
                return validated.model_dump()
            return validated.dict()

        except Exception as e:
            logger.error(f"SeverityAgent run failed: {e}", exc_info=True)
            fallback = SeverityResult(
                severity="Medium",
                severity_score=50.0,
                factor_breakdown=SeverityFactorBreakdown(
                    safety_risk=50.0, public_impact=50.0, recurrence=50.0, visual_severity=50.0
                ),
                reasoning=f"Fallback severity score due to error: {str(e)}",
            )
            if hasattr(fallback, "model_dump"):
                return fallback.model_dump()
            return fallback.dict()
