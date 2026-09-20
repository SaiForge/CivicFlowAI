import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config.settings import settings
from app.llm.openai_client import LLMClient
from app.memory.long_term import LongTermMemory
from app.memory.short_term import ShortTermMemory
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
from app.api.routes import router as complaints_router

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] [%(name)s]: %(message)s",
)
logger = logging.getLogger("civicflow.main")

def build_application_state():
    """Instantiate and wire the multi-agent system components."""
    llm_client = LLMClient()
    long_term_memory = LongTermMemory(db_url=settings.DATABASE_URL)
    short_term_memory = ShortTermMemory()

    # Instantiate the 7 specialist agents
    agent_registry = {
        "issue": IssueAgent(llm_client=llm_client),
        "evidence": EvidenceAgent(llm_client=llm_client),
        "severity": SeverityAgent(llm_client=llm_client),
        "routing": RoutingAgent(llm_client=llm_client),
        "incident": IncidentAgent(llm_client=llm_client),
        "workflow": WorkflowAgent(llm_client=llm_client),
        "verification": VerificationAgent(llm_client=llm_client),
    }

    planner = Planner()
    executor = Executor(agent_registry=agent_registry)
    manager_agent = ManagerAgent(
        planner=planner,
        executor=executor,
        long_term=long_term_memory,
        max_retries=settings.MAX_RETRIES,
    )

    return {
        "llm_client": llm_client,
        "long_term_memory": long_term_memory,
        "short_term_memory": short_term_memory,
        "agent_registry": agent_registry,
        "planner": planner,
        "executor": executor,
        "manager_agent": manager_agent,
    }

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize database and singletons
    logger.info("Initializing Smart Civic Issue Resolution Agent System...")
    app_state = build_application_state()
    for key, value in app_state.items():
        setattr(app.state, key, value)
    
    yield

    # Shutdown logic if any
    logger.info("Shutting down CivicFlowAI Agent system.")

app = FastAPI(
    title="Smart Civic Issue Resolution Agent API",
    description="Autonomous Multi-Agent AI System for Civic Issue Classification, Severity Scoring, Routing, and Quality Verification.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware for hackathon frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(complaints_router)

@app.get("/", tags=["Health"])
async def root():
    return {
        "message": "Smart Civic Issue Resolution Multi-Agent API is running.",
        "docs": "/docs",
        "health": "/health",
    }

@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "system": "CivicFlowAI Multi-Agent System",
        "agents": [
            "IssueAgent",
            "EvidenceAgent",
            "SeverityAgent",
            "RoutingAgent",
            "IncidentAgent",
            "WorkflowAgent",
            "VerificationAgent",
        ],
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
