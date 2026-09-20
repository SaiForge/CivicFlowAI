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
            has_image = bool(image_b64)
            if not has_image:
                prompt_parts.append("Visual Evidence Status: NO IMAGE PROVIDED by citizen.")
                prompt_parts.append("STRICT GROUNDING REQUIREMENT: visual_severity MUST BE 0.0. Do NOT invent or estimate visual severity from textual descriptions. Use the no-image rubric: safety_risk (45%), public_impact (35%), recurrence (20%).")
            else:
                prompt_parts.append("Visual Evidence Status: Citizen provided an attached image.")

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

            if not has_image:
                visual = 0.0
                calc_expr = f"({safety} * 0.45) + ({impact} * 0.35) + ({recurrence} * 0.20)"
            else:
                visual = float(fb.get("visual_severity", 0.0))
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

            # Enforce strictly grounded reasoning if no image was provided
            if not has_image:
                reasoning = (
                    f"Assessed as {calculated_severity} (Score {calculated_score}): "
                    f"Safety risk={safety} (45%), Public impact={impact} (35%), Recurrence={recurrence} (20%). "
                    f"Visual severity is 0.0 as no visual image was provided."
                )
            else:
                reasoning = response.get("reasoning") or (
                    f"Assessed as {calculated_severity} (Score {calculated_score}): "
                    f"Safety={safety} (40%), Impact={impact} (30%), Recurrence={recurrence} (15%), Visual={visual} (15%)."
                )

            response["severity_score"] = calculated_score
            response["severity"] = calculated_severity
            response["reasoning"] = reasoning
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
            has_image = bool(state.get("input", {}).get("image_base64"))
            fallback_score = 52.5 if not has_image else 50.0
            fallback = SeverityResult(
                severity="Medium",
                severity_score=fallback_score,
                factor_breakdown=SeverityFactorBreakdown(
                    safety_risk=55.0,
                    public_impact=50.0,
                    recurrence=45.0,
                    visual_severity=0.0 if not has_image else 50.0,
                ),
                reasoning=(
                    f"Rule-based severity fallback ({'no image provided, visual_severity=0.0' if not has_image else 'image analyzed'}): "
                    f"Safety=55, Impact=50, Recurrence=45."
                ),
            )
            if hasattr(fallback, "model_dump"):
                return fallback.model_dump()
            return fallback.dict()
