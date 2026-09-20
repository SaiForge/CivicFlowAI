import json
import logging
from typing import Any, Dict, Optional
from app.llm.openai_client import LLMClient
from app.llm.prompt_templates import ROUTING_AGENT_SYSTEM_PROMPT
from app.api.schemas import RoutingResult
from app.tools.department_lookup_tool import DepartmentLookupTool
from app.tools.geocode_tool import GeocodeTool

logger = logging.getLogger(__name__)

class RoutingAgent:
    """Specialist Agent 4: Routes complaints to municipal departments using lookup tools and location context."""

    name = "routing"

    def __init__(
        self,
        llm_client: LLMClient,
        lookup_tool: Optional[DepartmentLookupTool] = None,
        geocode_tool: Optional[GeocodeTool] = None,
    ):
        self.llm_client = llm_client
        self.lookup_tool = lookup_tool or DepartmentLookupTool()
        self.geocode_tool = geocode_tool or GeocodeTool()

    async def run(self, state: Dict[str, Any], feedback: Optional[str] = None) -> Dict[str, Any]:
        try:
            complaint_input = state.get("input", {})
            issue = state.get("issue", {})
            issue_type = issue.get("issue_type", "other")
            complaint_text = complaint_input.get("text", "")
            location_input = complaint_input.get("location")

            # 1. Deterministic department lookup directly BEFORE LLM
            dept_info = self.lookup_tool.run(issue_type=issue_type)

            # 2. Deterministic geocode lookup directly BEFORE LLM
            resolved_location = {"ward": "Unknown", "area": "Unknown", "city": "Unknown"}
            if location_input:
                if isinstance(location_input, dict):
                    lat = location_input.get("lat")
                    lng = location_input.get("lng")
                else:
                    lat = getattr(location_input, "lat", None)
                    lng = getattr(location_input, "lng", None)

                if lat is not None and lng is not None:
                    resolved_location = await self.geocode_tool.arun(lat=lat, lng=lng)

            prompt_parts = []
            if feedback:
                prompt_parts.append(
                    f"NOTE: Your previous attempt was rejected. Feedback: {feedback}. Please correct this in your new response.\n"
                )

            prompt_parts.append(f"Issue Type: {issue_type}")
            prompt_parts.append(f"Complaint Text: {complaint_text}")
            prompt_parts.append(f"Deterministic Department Lookup Result: {json.dumps(dept_info)}")
            prompt_parts.append(f"Geocoded Location Context: {json.dumps(resolved_location)}")
            prompt_parts.append(
                "Use the deterministic department lookup as the primary authoritative source. "
                "Only alter primary_department if complaint text demonstrates an edge case. "
                "Include the ward or zone in jurisdiction_office if known."
            )

            user_prompt = "\n".join(prompt_parts)

            response = await self.llm_client.complete(
                system_prompt=ROUTING_AGENT_SYSTEM_PROMPT,
                user_prompt=user_prompt,
                temperature=0.1,
            )

            # Ensure primary department is at least filled
            if not response.get("primary_department"):
                response["primary_department"] = dept_info.get("primary_department", "General Municipal Office")
            if "secondary_department" not in response:
                response["secondary_department"] = dept_info.get("secondary_department")

            # Default confidence to at least 0.8 if matched deterministic table
            if "confidence" not in response or response.get("confidence", 0.0) < 0.5:
                response["confidence"] = 0.85

            validated = RoutingResult(**response)
            if hasattr(validated, "model_dump"):
                return validated.model_dump()
            return validated.dict()

        except Exception as e:
            logger.error(f"RoutingAgent run failed: {e}", exc_info=True)
            fallback = RoutingResult(
                primary_department="General Municipal Office",
                secondary_department=None,
                jurisdiction_office="Central Administrative Ward",
                confidence=0.5,
                reasoning=f"Fallback routing triggered due to error: {str(e)}",
            )
            if hasattr(fallback, "model_dump"):
                return fallback.model_dump()
            return fallback.dict()
