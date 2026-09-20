import logging
from typing import Any, Dict, Optional
from app.llm.openai_client import LLMClient
from app.llm.prompt_templates import ISSUE_AGENT_SYSTEM_PROMPT
from app.api.schemas import IssueResult

logger = logging.getLogger(__name__)

class IssueAgent:
    """Specialist Agent 1: Classifies civic issue category and extracts keywords."""

    name = "issue"

    def __init__(self, llm_client: LLMClient):
        self.llm_client = llm_client

    async def run(self, state: Dict[str, Any], feedback: Optional[str] = None) -> Dict[str, Any]:
        try:
            complaint_input = state.get("input", {})
            text = complaint_input.get("text") or "No textual description provided."
            image_b64 = complaint_input.get("image_base64")

            prompt_parts = []
            if feedback:
                prompt_parts.append(
                    f"NOTE: Your previous attempt was rejected. Feedback: {feedback}. Please correct this in your new response.\n"
                )

            prompt_parts.append(f"Complaint Text: {text}")
            if image_b64:
                prompt_parts.append("[Citizen has also attached an image]")

            user_prompt = "\n".join(prompt_parts)

            response = await self.llm_client.complete(
                system_prompt=ISSUE_AGENT_SYSTEM_PROMPT,
                user_prompt=user_prompt,
                image_b64=image_b64,
                temperature=0.1,
            )

            # Validate against Pydantic schema
            validated = IssueResult(**response)
            if hasattr(validated, "model_dump"):
                return validated.model_dump()
            return validated.dict()

        except Exception as e:
            logger.error(f"IssueAgent run failed: {e}", exc_info=True)
            text_lower = text.lower()
            if any(w in text_lower for w in ["pothole", "road", "tar", "asphalt", "crater"]):
                f_type = "road_damage"
            elif any(w in text_lower for w in ["street light", "streetlight", "lamp", "pole", "light"]):
                f_type = "streetlight_damage"
            elif any(w in text_lower for w in ["garbage", "waste", "trash", "debris", "dump"]):
                f_type = "garbage_dump"
            elif any(w in text_lower for w in ["water", "leak", "pipe", "burst"]):
                f_type = "water_leakage"
            elif any(w in text_lower for w in ["drain", "sewage", "gutter", "overflow"]):
                f_type = "drainage_overflow"
            else:
                f_type = "other"

            fallback = IssueResult(
                issue_type=f_type,
                confidence=0.85,
                extracted_keywords=[w for w in ["road", "damage", "pothole", "waste", "light", "water"] if w in text_lower],
                short_description=text[:80],
                reasoning=f"Keyword heuristic classification ({f_type}) applied: {str(e)}",
            )
            if hasattr(fallback, "model_dump"):
                return fallback.model_dump()
            return fallback.dict()
