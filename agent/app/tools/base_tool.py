from abc import ABC, abstractmethod
from typing import Any

class BaseTool(ABC):
    """Abstract base class for all civic pipeline deterministic tools."""

    name: str = "base_tool"
    description: str = "Base tool interface"

    @abstractmethod
    def run(self, **kwargs: Any) -> Any:
        """Execute the tool synchronously."""
        pass

    async def arun(self, **kwargs: Any) -> Any:
        """Execute the tool asynchronously by default delegating to run."""
        return self.run(**kwargs)
