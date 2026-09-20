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

            if not image_b64:
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

            validated = EvidenceResult(**response)
            if hasattr(validated, "model_dump"):
                return validated.model_dump()
            return validated.dict()

        except Exception as e:
            logger.error(f"EvidenceAgent run failed: {e}", exc_info=True)
            fallback = EvidenceResult(
                grounding_score=0.5,
                text_image_consistent=True,
                visual_findings="Processing error prevented deep evidence inspection",
                discrepancies=[],
                reasoning=f"Fallback evidence assessment due to: {str(e)}",
            )
            if hasattr(fallback, "model_dump"):
                return fallback.model_dump()
            return fallback.dict()
