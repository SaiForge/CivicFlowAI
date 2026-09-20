import os
import base64
import uuid
from pathlib import Path
from typing import Any, Dict, Optional
from app.tools.base_tool import BaseTool

class FileTool(BaseTool):
    """Tool for managing file storage and retrieval of complaint attachments."""

    name: str = "file_tool"
    description: str = "Saves base64 files to local storage and reads stored files."

    def __init__(self, upload_dir: Optional[str] = None):
        if upload_dir:
            self.upload_path = Path(upload_dir)
        else:
            base_dir = Path(__file__).resolve().parent.parent.parent
            self.upload_path = base_dir / "uploads"
        
        self.upload_path.mkdir(parents=True, exist_ok=True)

    def save_base64_image(self, b64_data: str, filename_prefix: str = "upload") -> str:
        """Decode and save a base64 encoded image string, returning the file path."""
        # Strip header if present (e.g. data:image/jpeg;base64,...)
        if "," in b64_data:
            _, b64_clean = b64_data.split(",", 1)
        else:
            b64_clean = b64_data

        file_id = uuid.uuid4().hex[:8]
        filename = f"{filename_prefix}_{file_id}.jpg"
        file_path = self.upload_path / filename

        decoded_bytes = base64.b64decode(b64_clean)
        with open(file_path, "wb") as f:
            f.write(decoded_bytes)

        return str(file_path)

    def read_file_as_base64(self, file_path: str) -> Optional[str]:
        """Read a file and return base64 string."""
        path = Path(file_path)
        if not path.exists():
            return None
        with open(path, "rb") as f:
            return base64.b64encode(f.read()).decode("utf-8")

    def run(self, action: str, data: Optional[str] = None, file_path: Optional[str] = None, **kwargs: Any) -> Any:
        if action == "save":
            if not data:
                raise ValueError("No data provided to save.")
            prefix = kwargs.get("prefix", "upload")
            return self.save_base64_image(data, prefix)
        elif action == "read":
            if not file_path:
                raise ValueError("No file_path provided to read.")
            return self.read_file_as_base64(file_path)
        else:
            raise ValueError(f"Unknown action: {action}")
