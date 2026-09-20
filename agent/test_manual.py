#!/usr/bin/env python3
"""
Manual Issue Test Script for CivicFlowAI Multi-Agent System.

Usage:
  # Interactive mode (prompts you for input):
  python test_manual.py

  # Quick CLI mode:
  python test_manual.py --text "Deep dangerous pothole near Indiranagar metro station" --lat 12.9783 --lng 77.6408

  # With an image file:
  python test_manual.py --text "Garbage pile blocking the footpath" --image path/to/pothole.jpg
"""

import argparse
import asyncio
import json
import base64
import sys
from pathlib import Path

# Add app to path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from app.config.settings import settings
from app.llm.openai_client import LLMClient
from app.memory.long_term import LongTermMemory
from app.agent.planner import Planner
from app.agent.executor import Executor
from app.agent.core_agent import ManagerAgent
from app.agent.specialists import (
    IssueAgent,
    EvidenceAgent,
    SeverityAgent,
    RoutingAgent,
    IncidentAgent,
    WorkflowAgent,
    VerificationAgent,
)
from app.api.schemas import ComplaintInput, LocationInput

def encode_image_to_base64(image_path: str) -> str:
    path = Path(image_path)
    if not path.exists():
        print(f"Warning: Image file '{image_path}' not found. Continuing without image.")
        return ""
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")

async def run_manual_test(text: str, lat: float = 12.9716, lng: float = 77.5946, image_path: str = None):
    print("\n" + "=" * 70)
    print(" civicflowai multi-agent manual issue test")
    print("=" * 70)
    print(f"Provider Active     : {settings.LLM_PROVIDER}")
    print(f"OpenAI Key Present  : {'Yes' if settings.OPENAI_API_KEY else 'No'}")
    print(f"Gemini Key Present  : {'Yes' if (settings.GEMINI_API_KEY or settings.GOOGLE_API_KEY) else 'No'}")
    print(f"Database            : {settings.DATABASE_URL}")
    print("-" * 70)
    print(f"Complaint Text      : {text}")
    print(f"Coordinates         : Lat {lat}, Lng {lng}")
    if image_path:
        print(f"Image Attachment    : {image_path}")
    print("-" * 70 + "\n")

    # Wire up the system
    llm_client = LLMClient()
    long_term_memory = LongTermMemory(db_url=settings.DATABASE_URL)
    planner = Planner()

    agent_registry = {
        "issue": IssueAgent(llm_client=llm_client),
        "evidence": EvidenceAgent(llm_client=llm_client),
        "severity": SeverityAgent(llm_client=llm_client),
        "routing": RoutingAgent(llm_client=llm_client),
        "incident": IncidentAgent(llm_client=llm_client),
        "workflow": WorkflowAgent(llm_client=llm_client),
        "verification": VerificationAgent(llm_client=llm_client),
    }

    executor = Executor(agent_registry=agent_registry)
    manager = ManagerAgent(
        planner=planner,
        executor=executor,
        long_term=long_term_memory,
        max_retries=settings.MAX_RETRIES,
    )

    image_b64 = encode_image_to_base64(image_path) if image_path else None

    complaint = ComplaintInput(
        text=text,
        image_base64=image_b64,
        location=LocationInput(lat=lat, lng=lng),
    )

    print("Executing Multi-Agent Resolution Pipeline...")
    ticket = await manager.process_complaint(complaint)

    print("\n" + "=" * 70)
    print(" RESOLUTION RESULT")
    print("=" * 70)
    print(f"Ticket ID      : {ticket.get('ticket_id')}")
    print(f"Status         : {ticket.get('status')}")
    print(f"Category       : {ticket.get('issue_type')}")
    print(f"Severity       : {ticket.get('severity')}")
    print(f"Department     : {ticket.get('department')}")
    print(f"Retries Used   : {ticket.get('retry_count')}")
    print(f"Approved?      : {ticket.get('verification', {}).get('approved')}")
    print("-" * 70)
    print("Description:")
    print(f"  {ticket.get('description')}")
    print("-" * 70)

    raw_incident = ticket.get("raw_incident", {})
    if raw_incident.get("immediate_actions_recommended"):
        print("Recommended Immediate Actions:")
        for act in raw_incident["immediate_actions_recommended"]:
            print(f"  * {act}")
        print("-" * 70)

    workflow = ticket.get("workflow", {})
    if workflow:
        print("SLA & Escalation:")
        print(f"  Follow-up Window : {workflow.get('follow_up_after_hours')} hours")
        print(f"  Escalation After : {workflow.get('escalation_after_hours')} hours")
        print(f"  Escalate To      : {workflow.get('escalation_target')}")
        print("-" * 70)

    print("\nAudit Trail (Agent Decisions):")
    for idx, log in enumerate(ticket.get("audit_trail", []), 1):
        agent_name = log.get("agent_name", "").upper()
        attempt = log.get("attempt_number", 0)
        reasoning = (log.get("reasoning") or "").strip()
        # Clean multi-line or long error responses
        clean_reason = reasoning.split("\n")[0]
        if len(clean_reason) > 110:
            clean_reason = clean_reason[:107] + "..."
        print(f"  [{idx}] {agent_name:<13} (Attempt {attempt}): {clean_reason}")

    print("\n" + "=" * 70)
    print("Test finished successfully!")
    print("=" * 70 + "\n")

def main():
    parser = argparse.ArgumentParser(description="Test CivicFlowAI with a manual issue.")
    parser.add_argument("--text", type=str, help="Complaint text description")
    parser.add_argument("--lat", type=float, default=12.9783, help="Latitude")
    parser.add_argument("--lng", type=float, default=77.6408, help="Longitude")
    parser.add_argument("--image", type=str, default=None, help="Optional path to an image file")

    args = parser.parse_args()

    text = args.text
    if not text:
        # Prompt user interactively
        print("\nEnter your test civic complaint (or press Enter for sample pothole):")
        user_input = input("> ").strip()
        if user_input:
            text = user_input
        else:
            text = "Deep dangerous pothole on 100 Feet Road right outside Indiranagar metro station. Two-wheelers are swerving into oncoming traffic."

    asyncio.run(run_manual_test(text=text, lat=args.lat, lng=args.lng, image_path=args.image))

if __name__ == "__main__":
    main()
