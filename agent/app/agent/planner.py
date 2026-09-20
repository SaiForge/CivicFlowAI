from typing import Dict, List

class Planner:
    """
    Defines the multi-stage execution plan and downstream dependency graph
    for specialist agents.
    """

    # Downstream dependency mapping
    DOWNSTREAM_DEPENDENCIES: Dict[str, List[str]] = {
        "issue": ["severity", "routing", "incident", "workflow"],
        "evidence": ["severity", "incident"],
        "severity": ["incident", "workflow"],
        "routing": ["incident", "workflow"],
        "incident": [],
        "workflow": [],
        "verification": [],
    }

    def get_execution_plan(self) -> List[List[str]]:
        """
        Returns the sequential stages of agents, where agents within
        the same stage are executed concurrently.
        Stage 1: Issue, Evidence, Severity (Parallel)
        Stage 2: Routing, Incident, Workflow (Parallel)
        Stage 3: Verification (Sequential)
        """
        return [
            ["issue", "evidence", "severity"],
            ["routing", "incident", "workflow"],
            ["verification"],
        ]

    def get_downstream_dependents(self, agent_name: str) -> List[str]:
        """
        Returns the ordered list of downstream agents that depend on the given agent's output.
        """
        return list(self.DOWNSTREAM_DEPENDENCIES.get(agent_name, []))
