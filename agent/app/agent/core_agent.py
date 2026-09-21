import logging
import uuid
from datetime import datetime
from typing import Any, Dict, Optional

from app.agent.planner import Planner
from app.agent.executor import Executor
from app.memory.long_term import LongTermMemory
from app.api.schemas import ComplaintInput
from app.config.settings import settings

logger = logging.getLogger(__name__)

class ManagerAgent:
    """
    The Orchestrator Agent responsible for executing the 7 specialist agents
    across 3 stages, autonomous self-correction via verification feedback,
    and persisting full audit trails.
    """

    def __init__(
        self,
        planner: Planner,
        executor: Executor,
        long_term: LongTermMemory,
        max_retries: int = settings.MAX_RETRIES,
    ):
        self.planner = planner
        self.executor = executor
        self.long_term = long_term
        self.max_retries = max_retries

    async def process_complaint(self, complaint_input: ComplaintInput) -> Dict[str, Any]:
        """
        Autonomously coordinates the full multi-agent pipeline for a new complaint:
        Stage 1 (Parallel: Issue, Evidence, Severity)
        Stage 2 (Parallel: Routing, Incident, Workflow)
        Stage 3 (Quality Gate: Verification)
        Autonomous Retry & Cascade loop if verification fails.
        """
        ticket_id = f"TICK-{uuid.uuid4().hex[:8].upper()}"
        logger.info(f"=== [ManagerAgent] Initiating resolution pipeline for {ticket_id} ===")

        # Normalize input to dictionary
        input_dict = (
            complaint_input.to_dict()
            if hasattr(complaint_input, "to_dict")
            else (complaint_input.dict() if hasattr(complaint_input, "dict") else dict(complaint_input))
        )

        state: Dict[str, Any] = {
            "ticket_id": ticket_id,
            "input": input_dict,
            "retry_count": 0,
            "attempt_log": [],
        }

        plan = self.planner.get_execution_plan()

        # 1. Execute Stages 1 & 2
        for stage_idx, stage in enumerate(plan[:-1], start=1):
            logger.info(f"[ManagerAgent] Starting Stage {stage_idx}: {stage}")
            state = await self.executor.run_stage(stage, state)

            for agent_name in stage:
                agent_res = state.get(agent_name, {})
                reasoning = agent_res.get("reasoning", "") if isinstance(agent_res, dict) else ""
                self.long_term.log_action(
                    ticket_id=ticket_id,
                    agent_name=agent_name,
                    attempt=0,
                    output=agent_res,
                    reasoning=reasoning,
                    success=True,
                    input_summary=f"Initial Stage {stage_idx} Execution",
                )

        # 2. Stage 3: Verification Gate
        verification_stage = plan[-1]  # ["verification"]
        logger.info(f"[ManagerAgent] Starting Stage 3 Quality Gate: {verification_stage}")
        state = await self.executor.run_stage(verification_stage, state)
        verification_result = state.get("verification", {"approved": False, "failed_agents": []})

        self.long_term.log_action(
            ticket_id=ticket_id,
            agent_name="verification",
            attempt=0,
            output=verification_result,
            reasoning=verification_result.get("reasoning", ""),
            success=verification_result.get("approved", False),
            input_summary="Initial verification gate evaluation",
        )

        # 3. Autonomous Retry Loop
        retries = 0
        pipeline_order = ["issue", "evidence", "severity", "routing", "incident", "workflow"]

        while not verification_result.get("approved", False) and retries < self.max_retries:
            # Fatal unrecoverable contradictions (e.g. photo of streetlight vs road damage report) must NOT retry.
            # Retrying could falsely mutate the citizen's complaint to match fraudulent or mismatched evidence.
            ev_check = state.get("evidence", {})
            fb_check = str(verification_result.get("feedback", {})).lower()
            if (
                ev_check.get("cross_modal_contradiction", False)
                or not ev_check.get("text_image_consistent", True)
                or state.get("cross_modal_contradiction", False)
                or "fatal contradiction" in fb_check
                or "contradiction" in fb_check
            ):
                logger.warning(
                    f"[ManagerAgent] Fatal cross-modal contradiction detected for ticket {ticket_id}. "
                    "Halting retry cascade immediately: grievance is rejected."
                )
                break

            retries += 1
            failed_agents = verification_result.get("failed_agents", [])
            logger.warning(
                f"[ManagerAgent] Verification REJECTED (Attempt {retries}/{self.max_retries}). "
                f"Failed agents: {failed_agents}"
            )

            # Determine cascade re-runs based on downstream dependencies
            rerun_set = set(failed_agents)
            for agent in failed_agents:
                downstream = self.planner.get_downstream_dependents(agent)
                rerun_set.update(downstream)

            # Execute in topological order
            ordered_reruns = [a for a in pipeline_order if a in rerun_set]
            logger.info(f"[ManagerAgent] Executing corrective retry cascade for: {ordered_reruns}")

            for agent_name in ordered_reruns:
                feedback = verification_result.get("feedback", {}).get(agent_name, "")
                state = await self.executor.run_single(agent_name, state, feedback=feedback)
                agent_res = state.get(agent_name, {})
                reasoning = agent_res.get("reasoning", "") if isinstance(agent_res, dict) else ""

                self.long_term.log_action(
                    ticket_id=ticket_id,
                    agent_name=agent_name,
                    attempt=retries,
                    output=agent_res,
                    reasoning=reasoning,
                    success=True,
                    input_summary=f"Retry {retries} corrective rerun (Feedback: {feedback})",
                )

            # Re-verify after cascade corrections
            logger.info(f"[ManagerAgent] Re-running VerificationAgent post-retry {retries}")
            state = await self.executor.run_stage(["verification"], state)
            verification_result = state.get("verification", {"approved": False})

            self.long_term.log_action(
                ticket_id=ticket_id,
                agent_name="verification",
                attempt=retries,
                output=verification_result,
                reasoning=verification_result.get("reasoning", ""),
                success=verification_result.get("approved", False),
                input_summary=f"Post-retry {retries} verification outcome",
            )
            state["retry_count"] = retries

        # 4. Final Status Determination
        evidence_data = state.get("evidence", {})
        fb_all = str(verification_result.get("feedback", {})).lower()
        is_contradiction = (
            evidence_data.get("cross_modal_contradiction", False)
            or not evidence_data.get("text_image_consistent", True)
            or state.get("cross_modal_contradiction", False)
            or "fatal contradiction" in fb_all
            or "contradiction" in fb_all
            or ("evidence" in verification_result.get("failed_agents", []) and "verification" in verification_result.get("failed_agents", []))
        )
        rejection_reason = None
        if is_contradiction:
            final_status = "Rejected"
            verification_result["approved"] = False
            rejection_reason = (
                f"Photographic evidence ({evidence_data.get('detected_issue', 'attached image')}) "
                f"does not corroborate the reported grievance description and category."
            )
            verification_result["rejection_reason"] = rejection_reason
            verification_result["reasoning"] = f"Verification REJECTED: {rejection_reason}"
            logger.warning(f"=== [ManagerAgent] Ticket {ticket_id} REJECTED -> Status: {final_status} ({rejection_reason}) ===")
        elif verification_result.get("approved", False):
            final_status = "Submitted"
            logger.info(f"=== [ManagerAgent] Ticket {ticket_id} APPROVED -> Status: {final_status} ===")
        else:
            final_status = "needs_manual_review"
            logger.warning(
                f"=== [ManagerAgent] Ticket {ticket_id} EXHAUSTED MAX RETRIES -> Status: {final_status} ==="
            )

        # 5. Build and Persist Final Ticket
        issue_data = state.get("issue", {})
        severity_data = state.get("severity", {})
        routing_data = state.get("routing", {})
        incident_data = state.get("incident", {})
        workflow_data = state.get("workflow", {})

        # ── Visual Truth Rectification ─────────────────────────────
        # Only apply rectification for benign category misclicks where text and image are consistent.
        # NEVER rectify when there is an irreconcilable cross-modal contradiction!
        category_rectified = False
        original_issue = issue_data.get("issue_type")
        if not is_contradiction and evidence_data.get("category_mismatch") and evidence_data.get("detected_issue"):
            rectified_issue = evidence_data.get("detected_issue")
            rectified_cat = evidence_data.get("suggested_category") or "Road"
            logger.warning(
                f"[ManagerAgent] Visual Truth Override: Rectifying ticket from '{original_issue}' "
                f"to '{rectified_issue}' ({rectified_cat}) based on photographic evidence."
            )
            issue_data["issue_type"] = rectified_issue
            issue_data["reasoning"] = f"Visual ground truth: {evidence_data.get('visual_findings', 'Photographic evidence depicts ' + rectified_issue)}"
            category_rectified = True

            # Re-map department
            from app.agent.tools.department_rules import DEPARTMENT_ROUTING_RULES
            dept_rule = DEPARTMENT_ROUTING_RULES.get(rectified_issue, {})
            if dept_rule and dept_rule.get("primary_department"):
                routing_data["primary_department"] = dept_rule.get("primary_department")
                routing_data["reasoning"] = f"Re-routed to {routing_data['primary_department']} to address visually confirmed {rectified_issue}."

            self.long_term.log_action(
                ticket_id=ticket_id,
                agent_name="evidence_rectification",
                attempt=retries,
                output={"rectified_issue": rectified_issue, "rectified_category": rectified_cat},
                reasoning=f"Category rectified from '{original_issue}' to '{rectified_issue}' based on verified visual evidence.",
                success=True,
                input_summary="Visual ground truth category rectification",
            )

        now_str = datetime.utcnow().isoformat()
        audit_trail = self.long_term.get_audit_trail(ticket_id)

        final_ticket = {
            "ticket_id": ticket_id,
            "issue_type": issue_data.get("issue_type") or incident_data.get("category") or "General Civic Issue",
            "category": evidence_data.get("suggested_category") if category_rectified else None,
            "category_rectified": category_rectified,
            "original_claimed_issue": original_issue if category_rectified else None,
            "description": incident_data.get("description") or input_dict.get("text") or "No description",
            "severity": severity_data.get("severity") or incident_data.get("priority") or "Medium",
            "department": routing_data.get("primary_department") or incident_data.get("department") or "General Municipal Office",
            "location": input_dict.get("location"),
            "status": final_status,
            "rejection_reason": rejection_reason,
            "created_at": now_str,
            "verification": verification_result,
            "retry_count": retries,
            "audit_trail": audit_trail,
            "raw_incident": incident_data,
            "workflow": workflow_data,
            "severity_score": severity_data.get("severity_score"),
            "severity_breakdown": severity_data.get("factor_breakdown"),
            "issue_confidence": issue_data.get("confidence", 0.9),
            "routing_confidence": routing_data.get("confidence", 0.9),
            "grounding_score": state.get("evidence", {}).get("grounding_score", 1.0),
            "agent_thoughts": {
                "issue": issue_data,
                "evidence": state.get("evidence", {}),
                "severity": severity_data,
                "routing": routing_data,
                "incident": incident_data,
                "workflow": workflow_data,
                "verification": verification_result,
            },
        }

        try:
            self.long_term.save_ticket(final_ticket)
            logger.info(f"[ManagerAgent] Successfully persisted ticket {ticket_id} to LongTermMemory")
        except Exception as db_err:
            logger.error(f"[ManagerAgent] Failed to persist ticket {ticket_id}: {db_err}")

        return final_ticket

    async def rerun_ticket(self, ticket_id: str) -> Dict[str, Any]:
        """
        Loads an existing ticket's state and re-triggers verification + retry loop independently.
        Used for manual re-runs or background verification re-audits.
        """
        logger.info(f"=== [ManagerAgent] Manually re-running verification loop for {ticket_id} ===")
        existing_ticket = self.long_term.get_ticket(ticket_id)
        if not existing_ticket:
            raise ValueError(f"Ticket {ticket_id} not found in database.")

        # Reconstruct state from ticket
        state: Dict[str, Any] = {
            "ticket_id": ticket_id,
            "input": {
                "text": existing_ticket.get("description", ""),
                "location": existing_ticket.get("location"),
            },
            "issue": {
                "issue_type": existing_ticket.get("issue_type"),
                "confidence": 0.85,
                "short_description": existing_ticket.get("description", ""),
                "reasoning": "Reconstructed from stored ticket",
            },
            "severity": {
                "severity": existing_ticket.get("severity", "Medium"),
                "severity_score": 50.0,
                "factor_breakdown": {"safety_risk": 50.0, "public_impact": 50.0, "recurrence": 50.0, "visual_severity": 50.0},
                "reasoning": "Reconstructed from stored ticket",
            },
            "routing": {
                "primary_department": existing_ticket.get("department", "General Municipal Office"),
                "secondary_department": None,
                "jurisdiction_office": "Zonal Office",
                "confidence": 0.85,
                "reasoning": "Reconstructed from stored ticket",
            },
            "incident": existing_ticket.get("raw_incident") or {
                "title": f"Incident {ticket_id}",
                "description": existing_ticket.get("description", ""),
                "category": existing_ticket.get("issue_type", ""),
                "priority": existing_ticket.get("severity", "Medium"),
                "department": existing_ticket.get("department", ""),
                "location_summary": str(existing_ticket.get("location") or "Stored location"),
                "citizen_facing_summary": "Ticket under review",
                "immediate_actions_recommended": ["Inspect site"],
            },
            "workflow": existing_ticket.get("workflow") or {
                "status": "Submitted",
                "follow_up_after_hours": 24,
                "escalation_after_hours": 48,
                "escalation_target": f"Head of {existing_ticket.get('department')}",
                "reasoning": "Reconstructed workflow",
            },
            "retry_count": existing_ticket.get("retry_count", 0),
        }

        # Run Verification
        state = await self.executor.run_stage(["verification"], state)
        verification_result = state.get("verification", {"approved": False})

        retries = state["retry_count"]
        pipeline_order = ["issue", "evidence", "severity", "routing", "incident", "workflow"]

        while not verification_result.get("approved", False) and retries < self.max_retries:
            retries += 1
            failed_agents = verification_result.get("failed_agents", [])
            rerun_set = set(failed_agents)
            for agent in failed_agents:
                rerun_set.update(self.planner.get_downstream_dependents(agent))

            ordered_reruns = [a for a in pipeline_order if a in rerun_set]
            for agent_name in ordered_reruns:
                feedback = verification_result.get("feedback", {}).get(agent_name, "")
                state = await self.executor.run_single(agent_name, state, feedback=feedback)
                self.long_term.log_action(
                    ticket_id=ticket_id,
                    agent_name=agent_name,
                    attempt=retries,
                    output=state.get(agent_name, {}),
                    reasoning=state.get(agent_name, {}).get("reasoning", ""),
                    success=True,
                    input_summary=f"Manual rerun corrective attempt {retries}",
                )

            state = await self.executor.run_stage(["verification"], state)
            verification_result = state.get("verification", {"approved": False})
            self.long_term.log_action(
                ticket_id=ticket_id,
                agent_name="verification",
                attempt=retries,
                output=verification_result,
                reasoning=verification_result.get("reasoning", ""),
                success=verification_result.get("approved", False),
                input_summary=f"Manual rerun verification check {retries}",
            )

        final_status = "Submitted" if verification_result.get("approved", False) else "needs_manual_review"
        existing_ticket["status"] = final_status
        existing_ticket["verification"] = verification_result
        existing_ticket["retry_count"] = retries
        existing_ticket["audit_trail"] = self.long_term.get_audit_trail(ticket_id)

        self.long_term.save_ticket(existing_ticket)
        return existing_ticket
