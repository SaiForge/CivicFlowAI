import logging
from typing import Any, Dict, Optional
from app.llm.openai_client import LLMClient
from app.llm.prompt_templates import EVIDENCE_AGENT_SYSTEM_PROMPT
from app.api.schemas import EvidenceResult

logger = logging.getLogger(__name__)

class EvidenceAgent:
    """Specialist Agent 2: Analyzes multimodal evidence, consistency, and grounding score."""

    name = "evidence"

    def __init__(self, llm_client: LLMClient):
        self.llm_client = llm_client

    async def run(self, state: Dict[str, Any], feedback: Optional[str] = None) -> Dict[str, Any]:
        try:
            complaint_input = state.get("input", {})
            text = complaint_input.get("text") or "No textual description provided."
            image_b64 = complaint_input.get("image_base64")
            issue_data = state.get("issue")
            claimed_issue = issue_data.get("issue_type") if issue_data else "Not yet classified or inferred from text"

            prompt_parts = []
            if feedback:
                prompt_parts.append(
                    f"NOTE: Your previous attempt was rejected. Feedback: {feedback}. Please correct this in your new response.\n"
                )

            prompt_parts.append(f"Claimed Issue / Category: {claimed_issue}")
            prompt_parts.append(f"Complaint Text: {text}")

            is_sensitive = bool(complaint_input.get("is_sensitive", False))
            if not image_b64:
                if is_sensitive:
                    prompt_parts.append(
                        "Image Status: NO IMAGE PROVIDED (EXEMPT). This is flagged as a SENSITIVE/CONFIDENTIAL "
                        "civic or safety issue where capturing or sharing photos is unsafe or violates privacy. "
                        "Do not penalize grounding score for the lack of visual evidence; evaluate coherence from textual facts."
                    )
                else:
                    prompt_parts.append("Image: No image was provided by the citizen.")
            else:
                prompt_parts.append("Image: Citizen attached an image (see visual input).")

            user_prompt = "\n".join(prompt_parts)

            response = await self.llm_client.complete(
                system_prompt=EVIDENCE_AGENT_SYSTEM_PROMPT,
                user_prompt=user_prompt,
                image_b64=image_b64,
                temperature=0.1,
            )

            # If sensitive without image, ensure grounding score reflects textual validity rather than 0.4 penalty
            if is_sensitive and not image_b64:
                if response.get("grounding_score", 0) < 0.75:
                    response["grounding_score"] = 0.85
                    response["reasoning"] = f"Sensitive issue: photographic evidence waived for safety. {response.get('reasoning', '')}".strip()

            validated = EvidenceResult(**response)
            if hasattr(validated, "model_dump"):
                return validated.model_dump()
            return validated.dict()

        except Exception as e:
            logger.error(f"EvidenceAgent run failed: {e}", exc_info=True)
            fallback = EvidenceResult(
                grounding_score=0.85 if complaint_input.get("is_sensitive") else 0.5,
                text_image_consistent=True,
                visual_findings="Waived for sensitive issue" if complaint_input.get("is_sensitive") else "Processing error prevented deep evidence inspection",
                discrepancies=[],
                reasoning="Sensitive complaint: photographic evidence waived for citizen protection" if complaint_input.get("is_sensitive") else f"Fallback evidence assessment due to: {str(e)}",
            )
            if hasattr(fallback, "model_dump"):
                return fallback.model_dump()
            return fallback.dict()
