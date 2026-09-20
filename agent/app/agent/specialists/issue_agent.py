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
            # Low confidence fallback to prevent crashing pipeline
            fallback = IssueResult(
                issue_type="other",
                confidence=0.3,
                extracted_keywords=[],
                short_description="Civic complaint under review",
                reasoning=f"Automatic classification fallback due to error: {str(e)}",
            )
            if hasattr(fallback, "model_dump"):
                return fallback.model_dump()
            return fallback.dict()
