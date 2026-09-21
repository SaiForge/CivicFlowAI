"""
JWT Auth utilities for CivicFlowAI Backend.
Handles password hashing, token creation/verification, and current-user dependency.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
import bcrypt

from app.config import settings
from app.database import get_db
from app.models import User

logger = logging.getLogger(__name__)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

# ── Password helpers ──────────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    pwd_bytes = password.encode("utf-8")[:72]
    return bcrypt.hashpw(pwd_bytes, bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        pwd_bytes = plain.encode("utf-8")[:72]
        return bcrypt.checkpw(pwd_bytes, hashed.encode("utf-8"))
    except Exception:
        return False


# ── Token helpers ─────────────────────────────────────────────────────────────

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    raw_exp = getattr(settings, "ACCESS_TOKEN_EXPIRE_MINUTES", 1440)
    try:
        expire_minutes = int(raw_exp)
    except Exception:
        expire_minutes = 1440
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=expire_minutes))
    to_encode["exp"] = expire
    secret = getattr(settings, "SECRET_KEY", "change_me_in_production_civicflow_2024")
    algorithm = getattr(settings, "ALGORITHM", "HS256")
    return jwt.encode(to_encode, secret, algorithm=algorithm)


def decode_token(token: str) -> Optional[dict]:
    try:
        secret = getattr(settings, "SECRET_KEY", "change_me_in_production_civicflow_2024")
        algorithm = getattr(settings, "ALGORITHM", "HS256")
        return jwt.decode(token, secret, algorithms=[algorithm])
    except (JWTError, Exception):
        return None


# ── FastAPI dependency ────────────────────────────────────────────────────────

def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """Returns the current authenticated user, or None if no/invalid token."""
    if not token:
        return None
    payload = decode_token(token)
    if not payload:
        return None
    email: str = payload.get("sub")
    if not email:
        return None
    user = db.query(User).filter(User.email == email).first()
    return user


def require_user(current_user: Optional[User] = Depends(get_current_user)) -> User:
    """Strict version — raises 401 if not authenticated."""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return current_user


def require_admin(current_user: User = Depends(require_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


def require_dept(current_user: User = Depends(require_user)) -> User:
    if current_user.role not in ("admin", "dept"):
        raise HTTPException(status_code=403, detail="Department access required")
    return current_user
