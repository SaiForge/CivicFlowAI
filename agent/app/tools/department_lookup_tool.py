from typing import Any, Dict, Optional
from app.tools.base_tool import BaseTool

class DepartmentLookupTool(BaseTool):
    """Tool to map civic issue types to responsible municipal departments."""

    name: str = "department_lookup_tool"
    description: str = "Maps civic issue type to responsible primary and secondary government departments."

    DEPARTMENT_MAPPING: Dict[str, Dict[str, Optional[str]]] = {
        "pothole": {
            "primary_department": "Roads & Infrastructure Department",
            "secondary_department": None,
        },
        "road_damage": {
            "primary_department": "Roads & Infrastructure Department",
            "secondary_department": None,
        },
        "garbage_accumulation": {
            "primary_department": "Sanitation Department",
            "secondary_department": None,
        },
        "streetlight_damage": {
            "primary_department": "Electrical Department",
            "secondary_department": None,
        },
        "water_leakage": {
            "primary_department": "Water Board",
            "secondary_department": None,
        },
        "drainage_blockage": {
            "primary_department": "Water Board",
            "secondary_department": "Sanitation Department",
        },
        "sewage_overflow": {
            "primary_department": "Sanitation Department",
            "secondary_department": "Water Board",
        },
        "illegal_construction": {
            "primary_department": "Municipal Planning Department",
            "secondary_department": None,
        },
        "tree_fallen": {
            "primary_department": "Parks & Horticulture Department",
            "secondary_department": "Disaster Management Cell",
        },
        "stray_animal": {
            "primary_department": "Animal Control Department",
            "secondary_department": "Public Health Department",
        },
    }

    DEFAULT_DEPARTMENT: Dict[str, Optional[str]] = {
        "primary_department": "General Municipal Office",
        "secondary_department": None,
    }

    def run(self, issue_type: str, **kwargs: Any) -> Dict[str, Optional[str]]:
        normalized = (issue_type or "").strip().lower()
        # Direct lookup or substring check
        if normalized in self.DEPARTMENT_MAPPING:
            return self.DEPARTMENT_MAPPING[normalized]

        for key, mapping in self.DEPARTMENT_MAPPING.items():
            if key in normalized or normalized in key:
                return mapping

        return self.DEFAULT_DEPARTMENT
