import logging
from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException, Request
from app.api.schemas import ComplaintInput, TicketOutput
from app.agent.core_agent import ManagerAgent
from app.memory.long_term import LongTermMemory

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/complaints", tags=["Complaints"])

def get_manager_agent(request: Request) -> ManagerAgent:
    return request.app.state.manager_agent

def get_long_term_memory(request: Request) -> LongTermMemory:
    return request.app.state.long_term_memory

@router.post("", response_model=TicketOutput, status_code=201)
async def submit_complaint(
    complaint: ComplaintInput,
    manager: ManagerAgent = Depends(get_manager_agent),
) -> Any:
    """
    Submit a citizen civic complaint (text, image, audio, location).
    Autonomously classifies, verifies, scores, routes, and finalizes the incident ticket.
    """
    try:
        ticket = await manager.process_complaint(complaint)
        return ticket
    except Exception as e:
        logger.error(f"Error processing complaint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Pipeline processing error: {str(e)}")

@router.get("", response_model=List[Dict[str, Any]])
async def list_complaints(
    memory: LongTermMemory = Depends(get_long_term_memory),
) -> Any:
    """List all stored civic tickets for the municipal dashboard."""
    return memory.list_tickets()

@router.get("/{ticket_id}", response_model=Dict[str, Any])
async def get_complaint(
    ticket_id: str,
    memory: LongTermMemory = Depends(get_long_term_memory),
) -> Any:
    """Retrieve detailed information about a specific civic complaint ticket."""
    ticket = memory.get_ticket(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail=f"Ticket '{ticket_id}' not found.")
    return ticket

@router.get("/{ticket_id}/trace", response_model=List[Dict[str, Any]])
async def get_complaint_trace(
    ticket_id: str,
    memory: LongTermMemory = Depends(get_long_term_memory),
) -> Any:
    """
    Retrieve the chronological audit trail of all specialist agent executions,
    decisions, and retries for full hackathon traceability.
    """
    trace = memory.get_audit_trail(ticket_id)
    if not trace:
        # Check if ticket exists
        ticket = memory.get_ticket(ticket_id)
        if not ticket:
            raise HTTPException(status_code=404, detail=f"Ticket '{ticket_id}' not found.")
    return trace

@router.post("/{ticket_id}/rerun", response_model=Dict[str, Any])
async def rerun_complaint(
    ticket_id: str,
    manager: ManagerAgent = Depends(get_manager_agent),
) -> Any:
    """
    Manually triggers autonomous verification and self-correction retry loop
    for an existing ticket (demonstrates the retry mechanism live).
    """
    try:
        updated_ticket = await manager.rerun_ticket(ticket_id)
        return updated_ticket
    except ValueError as val_err:
        raise HTTPException(status_code=404, detail=str(val_err))
    except Exception as e:
        logger.error(f"Error re-running ticket {ticket_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Ticket rerun error: {str(e)}")
