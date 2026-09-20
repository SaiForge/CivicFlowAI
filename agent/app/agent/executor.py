import asyncio
import logging
from typing import Any, Dict, List, Optional
from app.config.settings import settings

logger = logging.getLogger(__name__)

class Executor:
    """
    Executes stages of specialist agents either with pacing delays or individually,
    updating the shared state blackboard.
    """

    def __init__(self, agent_registry: Dict[str, Any], agent_delay: Optional[float] = None):
        self.agent_registry = agent_registry
        self.agent_delay = (
            agent_delay
            if agent_delay is not None
            else getattr(settings, "AGENT_DELAY_SECONDS", 5.0)
        )

    async def run_stage(self, agent_names: List[str], state: Dict[str, Any]) -> Dict[str, Any]:
        """
        Runs all specified agents for this stage with an enforced delay (default 5s)
        within every agent execution to completely prevent API rate limits and
        provide steady blackboard state updates.
        """
        valid_agent_names = [name for name in agent_names if name in self.agent_registry]

        if not valid_agent_names:
            return state

        logger.info(f"Executing stage with agents: {valid_agent_names} (with {self.agent_delay}s delay per agent)")

        for name in valid_agent_names:
            agent = self.agent_registry[name]

            if self.agent_delay > 0:
                logger.info(f"[Executor] Pausing for {self.agent_delay}s delay before executing '{name}' agent...")
                await asyncio.sleep(self.agent_delay)

            logger.info(f"[Executor] Executing agent '{name}'...")
            try:
                res = await agent.run(state)
                state[name] = res
            except Exception as e:
                logger.error(f"Agent {name} encountered unhandled exception: {e}", exc_info=e)
                state[name] = {"error": str(e)}

        return state

    async def run_single(self, agent_name: str, state: Dict[str, Any], feedback: str = "") -> Dict[str, Any]:
        """
        Executes a single agent with the pacing delay, passing feedback for corrective retry,
        and updates state.
        """
        agent = self.agent_registry.get(agent_name)
        if not agent:
            logger.error(f"Agent '{agent_name}' not found in registry.")
            return state

        if self.agent_delay > 0:
            logger.info(f"[Executor] Pausing for {self.agent_delay}s delay before retry execution of '{agent_name}'...")
            await asyncio.sleep(self.agent_delay)

        logger.info(f"Re-running agent '{agent_name}' with corrective feedback: {feedback}")
        try:
            res = await agent.run(state, feedback=feedback)
            state[agent_name] = res
        except Exception as e:
            logger.error(f"Re-run of agent {agent_name} failed: {e}", exc_info=True)
            state[agent_name] = {"error": str(e)}

        return state
