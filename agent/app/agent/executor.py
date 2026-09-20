import asyncio
import logging
from typing import Any, Dict, List

logger = logging.getLogger(__name__)

class Executor:
    """
    Executes stages of specialist agents either concurrently or individually,
    updating the shared state blackboard.
    """

    def __init__(self, agent_registry: Dict[str, Any]):
        self.agent_registry = agent_registry

    async def run_stage(self, agent_names: List[str], state: Dict[str, Any]) -> Dict[str, Any]:
        """
        Runs all specified agents concurrently using asyncio.gather.
        Merges results into state under keys matching the agent name.
        """
        tasks = []
        valid_agent_names = []

        for name in agent_names:
            agent = self.agent_registry.get(name)
            if not agent:
                logger.error(f"Agent '{name}' not found in agent_registry.")
                continue
            valid_agent_names.append(name)
            tasks.append(agent.run(state))

        if not tasks:
            return state

        logger.info(f"Concurrently executing agents: {valid_agent_names}")
        results = await asyncio.gather(*tasks, return_exceptions=True)

        for name, res in zip(valid_agent_names, results):
            if isinstance(res, Exception):
                logger.error(f"Agent {name} encountered unhandled exception: {res}", exc_info=res)
                state[name] = {"error": str(res)}
            else:
                state[name] = res

        return state

    async def run_single(self, agent_name: str, state: Dict[str, Any], feedback: str = "") -> Dict[str, Any]:
        """
        Executes a single agent, passing feedback for corrective retry,
        and updates state.
        """
        agent = self.agent_registry.get(agent_name)
        if not agent:
            logger.error(f"Agent '{agent_name}' not found in registry.")
            return state

        logger.info(f"Re-running agent '{agent_name}' with corrective feedback: {feedback}")
        try:
            res = await agent.run(state, feedback=feedback)
            state[agent_name] = res
        except Exception as e:
            logger.error(f"Re-run of agent {agent_name} failed: {e}", exc_info=True)
            state[agent_name] = {"error": str(e)}

        return state
