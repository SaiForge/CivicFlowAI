import ast
import operator
import logging
from typing import Any, Union
from app.tools.base_tool import BaseTool

logger = logging.getLogger(__name__)

class CalculatorTool(BaseTool):
    """Tool for safely evaluating mathematical expressions without using eval()."""

    name: str = "calculator_tool"
    description: str = "Safely computes arithmetic calculations for severity rubrics."

    _OPERATORS = {
        ast.Add: operator.add,
        ast.Sub: operator.sub,
        ast.Mult: operator.mul,
        ast.Div: operator.truediv,
        ast.FloorDiv: operator.floordiv,
        ast.Mod: operator.mod,
        ast.Pow: operator.pow,
        ast.USub: operator.neg,
        ast.UAdd: operator.pos,
    }

    def _eval_node(self, node: ast.AST) -> Union[int, float]:
        if isinstance(node, ast.Num):  # Python <3.8
            return node.n
        elif isinstance(node, ast.Constant):  # Python >=3.8
            if isinstance(node.value, (int, float)):
                return node.value
            raise TypeError(f"Invalid literal type: {type(node.value)}")
        elif isinstance(node, ast.BinOp):
            left = self._eval_node(node.left)
            right = self._eval_node(node.right)
            op_type = type(node.op)
            if op_type in self._OPERATORS:
                return self._OPERATORS[op_type](left, right)
            raise ValueError(f"Unsupported binary operator: {op_type}")
        elif isinstance(node, ast.UnaryOp):
            operand = self._eval_node(node.operand)
            op_type = type(node.op)
            if op_type in self._OPERATORS:
                return self._OPERATORS[op_type](operand)
            raise ValueError(f"Unsupported unary operator: {op_type}")
        else:
            raise TypeError(f"Unsupported AST node: {type(node)}")

    def run(self, expression: str, **kwargs: Any) -> float:
        """Parse and evaluate mathematical expression safely."""
        try:
            expr = str(expression).strip()
            parsed = ast.parse(expr, mode="eval")
            result = self._eval_node(parsed.body)
            return float(result)
        except Exception as e:
            logger.error(f"Failed to evaluate expression '{expression}': {e}")
            return 0.0
