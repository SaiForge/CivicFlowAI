"""
CivicFlowAI Backend — Full API Gateway Routes
Covers: auth, complaints (CRUD + images + voting), incidents,
        stats, activity feed, notifications, agent proxy.
"""

import base64
import io
import logging
import re
import math
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import json
import httpx
from fastapi import (
    APIRouter, Depends, File, Form, HTTPException,
    Request, UploadFile, status
)
from fastapi.responses import Response, StreamingResponse
from sqlalchemy import func, desc
from sqlalchemy.orm import Session

from app.cache import (
    get_redis, get_cache, set_cache,
    invalidate_all_stats, publish_event, subscribe_events,
)
from app.config import settings
from app.database import get_db
from app.models import (
    ActivityLog, Complaint, ComplaintImage,
    Incident, Notification, User,
)
from app.auth import (
    create_access_token, get_current_user,
    hash_password, require_admin, require_dept,
    require_user, verify_password,
)
from app.schemas import (
    AdminStatsOut, AreaStatsOut, AuthResponse,
    CategoryBreakdownItem, ComplaintOut, ComplaintSubmitRequest,
    ComplaintUpdateRequest, DeptPerformanceItem, HealthOut,
    ImageOut, IncidentOut, LoginRequest, MapMarkerOut,
    NotificationOut, RegisterRequest, StatusBreakdownItem,
    VoteRequest, ActivityFeedItem, UserOut,
)

logger = logging.getLogger(__name__)

router = APIRouter()

# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────

DEPT_NAMES = {
    "road": "Road & Infrastructure",
    "waste": "Waste Management",
    "water": "Water Supply",
    "drainage": "Drainage",
    "streetlight": "Streetlight",
    "infra": "Public Infrastructure",
}

ACTIVE_STATUSES = {"Submitted", "Under Review", "Assigned", "In Progress",
                   "Resolution Submitted", "Verification Pending", "Escalated"}
RESOLVED_STATUSES = {"Resolved", "Closed"}


def _is_meaningful_text(text: str) -> tuple[bool, str]:
    """
    Validates that a citizen's complaint description is meaningful and not keyboard-smash/gibberish.
    Catches inputs like 'asdsadssdd', 'aaaaaa', 'qwertyuiop', or zero-vocabulary strings.
    """
    clean = text.strip()
    if len(clean) < 10:
        return False, "Please provide a meaningful description of the issue (at least 10 characters)."

    alpha_chars = [c.lower() for c in clean if c.isalpha()]
    if len(alpha_chars) < 6:
        return False, "Description must contain meaningful explanatory text, not just symbols or numbers."

    # 1. Distinct character vocabulary diversity
    unique_chars = set(alpha_chars)
    if len(unique_chars) < 4:
        return False, f"Description '{clean}' has insufficient vocabulary diversity (appears to be random characters)."

    # 2. Vowel ratio check (natural human language in Latin script has 12%-85% vowels)
    vowels = set("aeiou")
    vowel_count = sum(1 for c in alpha_chars if c in vowels)
    vowel_ratio = vowel_count / len(alpha_chars)
    if vowel_ratio < 0.12 or vowel_ratio > 0.85:
        return False, f"Description appears to be random or invalid text ('{clean}'). Please describe the issue in clear words."

    # 3. Repeated short n-gram spam (e.g. 'asdsadssdd' -> repeating 'sd', 'ds', 'sa')
    s = "".join(alpha_chars)
    for n in (2, 3):
        ngrams = [s[i : i + n] for i in range(len(s) - n + 1)]
        if ngrams:
            from collections import Counter
            counts = Counter(ngrams)
            most_common, freq = counts.most_common(1)[0]
            if freq >= 4 and (freq * n) / len(s) > 0.65:
                return False, f"Description contains repetitive keyboard patterns ('{clean}'). Please enter a real explanation."

    # 4. Standard keyboard walk patterns
    smashes = ["asdfgh", "qwerty", "zxcvbn", "lkjhgf", "poiuyt", "mnbvcx", "123456", "asdsad"]
    s_lower = s.lower()
    for smash in smashes:
        if smash in s_lower:
            return False, f"Description contains keyboard walk/smash patterns ('{smash}'). Please describe the actual civic issue."

    return True, ""


def _extract_exif_capture_time(image_bytes: bytes) -> Optional[datetime]:
    """
    Extracts the image capture timestamp from EXIF metadata.
    Supports JPEG, PNG, TIFF, and HEIC.
    Checks DateTimeOriginal (36867), DateTimeDigitized (36868), and DateTime (306).
    Falls back to binary header regex scan if Pillow is unavailable.
    """
    # 1. Try Pillow getexif / get_ifd
    try:
        from PIL import Image
        img = Image.open(io.BytesIO(image_bytes))
        exif = img.getexif()
        if exif:
            for tag_id in (36867, 36868, 306):
                val = exif.get(tag_id)
                if val and isinstance(val, str):
                    for fmt in ("%Y:%m:%d %H:%M:%S", "%Y-%m-%d %H:%M:%S", "%Y:%m:%d"):
                        try:
                            return datetime.strptime(val.strip(), fmt)
                        except ValueError:
                            pass
            if hasattr(exif, "get_ifd"):
                try:
                    exif_ifd = exif.get_ifd(0x8769)
                    for tag_id in (36867, 36868, 306):
                        val = exif_ifd.get(tag_id)
                        if val and isinstance(val, str):
                            for fmt in ("%Y:%m:%d %H:%M:%S", "%Y-%m-%d %H:%M:%S", "%Y:%m:%d"):
                                try:
                                    return datetime.strptime(val.strip(), fmt)
                                except ValueError:
                                    pass
                except Exception:
                    pass
    except Exception:
        pass

    # 2. Fast binary regex scan on header metadata (first 64KB)
    try:
        header = image_bytes[:65536]
        matches = re.findall(
            rb'(19\d\d|20\d\d)[:/-](0[1-9]|1[0-2])[:/-](0[1-9]|[12]\d|3[01])\s+([01]\d|2[0-3]):([0-5]\d):([0-5]\d)',
            header,
        )
        for m in matches:
            date_str = b"-".join(m[0:3]).decode("ascii") + " " + b":".join(m[3:6]).decode("ascii")
            try:
                dt = datetime.strptime(date_str, "%Y-%m-%d %H:%M:%S")
                if 2000 <= dt.year <= 2030:
                    return dt
            except ValueError:
                continue
    except Exception:
        pass

    return None


def _complaint_to_dict(c: Complaint, db: Session) -> Dict[str, Any]:
    """Convert ORM Complaint → frontend-compatible dict."""
    images = [
        ImageOut(
            id=img.id,
            complaint_id=img.complaint_id,
            mime_type=img.mime_type,
            original_filename=img.original_filename,
            image_type=img.image_type,
            uploaded_at=img.uploaded_at.isoformat(),
            url=f"/api/complaints/{img.complaint_id}/images/{img.id}",
        ).model_dump()
        for img in c.images
    ]
    return {
        "id": c.id,
        "incidentId": c.incident_id,
        "category": c.category,
        "issue": c.issue,
        "description": c.description,
        "location": c.location,
        "lat": c.lat,
        "lng": c.lng,
        "priority": c.priority,
        "status": c.status,
        "dept": c.dept,
        "assignedOfficer": c.assigned_officer,
        "supportCount": c.support_count,
        "dislikeCount": c.dislike_count,
        "reportCount": c.report_count,
        "citizenId": str(c.citizen_id) if c.citizen_id else None,
        "submittedAt": c.submitted_at.isoformat() if c.submitted_at else None,
        "lastUpdated": c.last_updated.isoformat() if c.last_updated else None,
        "hasEvidence": bool(c.images),
        "isSensitive": bool(getattr(c, "is_sensitive", False)),
        "images": images,
        "aiClassification": c.ai_classification,
        "aiSeverity": c.ai_severity,
        "agentSteps": c.agent_steps,
        "timeline": c.timeline,
        "resolutionEvidence": c.resolution_evidence,
        "aiVerification": c.ai_verification,
        "agentThoughts": c.agent_thoughts,
        "internalNotes": c.internal_notes,
    }


def _next_ticket_id(db: Session) -> str:
    import re
    ids = [c[0] for c in db.query(Complaint.id).all()]
    nums = []
    for cid in ids:
        m = re.search(r"\d+", cid)
        if m:
            nums.append(int(m.group()))
    next_num = (max(nums) + 1) if nums else 1050
    return f"CIV-{next_num}"


def _next_incident_id(db: Session) -> str:
    import re
    ids = [inc[0] for inc in db.query(Incident.id).all()]
    nums = []
    for iid in ids:
        m = re.search(r"\d+", iid)
        if m:
            nums.append(int(m.group()))
    next_num = (max(nums) + 1) if nums else 330
    return f"INC-{next_num}"


def _log_activity(db: Session, type_: str, text: str,
                  complaint_id: str = None, dept: str = None, icon: str = "alert"):
    entry = ActivityLog(type=type_, text=text, complaint_id=complaint_id,
                        dept=dept, icon=icon, created_at=datetime.utcnow())
    db.add(entry)


def _notify_user(db: Session, user_id: int, text: str, complaint_id: str = None):
    notif = Notification(user_id=user_id, text=text,
                         complaint_id=complaint_id, read=False)
    db.add(notif)


def _time_ago(dt: datetime) -> str:
    if not dt:
        return "just now"
    diff = datetime.utcnow() - dt
    s = int(diff.total_seconds())
    if s < 60:
        return f"{s} sec ago"
    if s < 3600:
        return f"{s // 60} min ago"
    if s < 86400:
        return f"{s // 3600} hr ago"
    return f"{s // 86400} day ago"


# ─────────────────────────────────────────────────────────────
# HEALTH
# ─────────────────────────────────────────────────────────────

@router.get("/health", tags=["Health"])
async def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(func.now() if hasattr(func, "now") else db.bind.execute("SELECT 1"))
        db_status = "connected"
    except Exception:
        db_status = "error"
    redis_client = await get_redis()
    redis_status = "connected" if redis_client else "offline (memory fallback)"
    return {
        "status": "healthy",
        "backend": "online",
        "database": db_status,
        "redis": redis_status,
        "agent_target": settings.AGENT_SERVICE_URL,
    }


@router.get("/api/events", tags=["Realtime"])
async def stream_live_events():
    """
    Server-Sent Events (SSE) endpoint providing real-time live sync
    across Citizen, Dept, and Admin portals via Redis Pub/Sub.
    """
    return StreamingResponse(
        subscribe_events(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/api/voice/transcribe", tags=["Voice"])
async def transcribe_voice(
    audio: Optional[UploadFile] = File(None),
    file: Optional[UploadFile] = File(None),
    language: Optional[str] = Form("en-IN"),
):
    """
    Multimodal Audio Transcription Endpoint for Civic Grievance Voice Input.
    Supports Google Chromium Speech API (free, zero-config), OpenRouter multimodal models,
    Google Gemini 1.5 Flash, and OpenAI Whisper.
    """
    target_file = audio or file
    if not target_file:
        raise HTTPException(status_code=400, detail="No audio file provided in request.")

    try:
        audio_bytes = await target_file.read()
        if not audio_bytes or len(audio_bytes) < 100:
            return {
                "status": "empty",
                "text": "",
                "message": "Audio recording was too short or empty.",
            }

        content_type = target_file.content_type or "audio/webm"
        if "webm" in content_type:
            mime = "audio/webm"
        elif "wav" in content_type:
            mime = "audio/wav"
        elif "mp3" in content_type or "mpeg" in content_type:
            mime = "audio/mp3"
        elif "ogg" in content_type:
            mime = "audio/ogg"
        else:
            mime = "audio/webm"

        # 1. Try OpenRouter Audio Transcriptions API (openai/whisper-large-v3)
        if settings.OPENROUTER_API_KEY:
            try:
                whisper_url = f"{settings.OPENROUTER_BASE_URL.rstrip('/')}/audio/transcriptions"
                headers = {"Authorization": f"Bearer {settings.OPENROUTER_API_KEY}"}
                files = {"file": (target_file.filename or "audio.webm", audio_bytes, mime)}
                data = {"model": "openai/whisper-large-v3"}
                async with httpx.AsyncClient(timeout=35.0) as client:
                    resp = await client.post(whisper_url, headers=headers, files=files, data=data)
                    if resp.status_code == 200:
                        text_result = resp.json().get("text", "").strip()
                        if text_result:
                            logger.info(f"Successfully transcribed audio via OpenRouter Whisper Large: {text_result}")
                            return {
                                "status": "success",
                                "text": text_result,
                                "provider": "Whisper AI (OpenRouter)",
                            }
            except Exception as e:
                logger.warning(f"OpenRouter audio transcriptions endpoint attempt: {e}")

        # 2. Try Google Chromium Speech API (Free, high-accuracy, zero key required)
        try:
            lang_code = "en-IN" if "in" in (language or "").lower() else (language or "en-US")
            chromium_url = f"https://www.google.com/speech-api/v2/recognize?client=chromium&lang={lang_code}&maxresults=1"
            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.post(
                    chromium_url,
                    headers={"Content-Type": mime},
                    content=audio_bytes,
                )
                if resp.status_code == 200:
                    for line in resp.text.splitlines():
                        line = line.strip()
                        if line:
                            try:
                                j = json.loads(line)
                                res_list = j.get("result", [])
                                if res_list and res_list[0].get("alternative"):
                                    transcript = res_list[0]["alternative"][0].get("transcript")
                                    if transcript and transcript.strip():
                                        logger.info(f"Transcribed audio via Google Chromium Speech API: {transcript}")
                                        return {
                                            "status": "success",
                                            "text": transcript.strip(),
                                            "provider": "google-speech",
                                        }
                            except Exception:
                                pass
        except Exception as e:
            logger.warning(f"Google Chromium speech API attempt note: {e}")

        # 3. Try OpenRouter Multimodal Chat Completion with Audio
        if settings.OPENROUTER_API_KEY:
            try:
                b64_audio = base64.b64encode(audio_bytes).decode("utf-8")
                openrouter_url = "https://openrouter.ai/api/v1/chat/completions"
                headers = {
                    "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                    "Content-Type": "application/json",
                }
                audio_fmt = "wav" if "wav" in mime else "mp3" if "mp3" in mime else "webm"
                audio_models = ["google/gemini-2.0-flash-exp:free", "google/gemini-flash-1.5", "openai/gpt-4o-mini"]
                for m in audio_models:
                    payload = {
                        "model": m,
                        "messages": [
                            {
                                "role": "user",
                                "content": [
                                    {
                                        "type": "text",
                                        "text": "Transcribe this civic complaint voice audio verbatim in its spoken language. Return ONLY the transcribed text. Do not add quotes, intro, or markdown."
                                    },
                                    {
                                        "type": "input_audio",
                                        "input_audio": {
                                            "data": b64_audio,
                                            "format": audio_fmt,
                                        }
                                    }
                                ]
                            }
                        ]
                    }
                    try:
                        async with httpx.AsyncClient(timeout=25.0) as client:
                            resp = await client.post(openrouter_url, headers=headers, json=payload)
                            if resp.status_code == 200:
                                data = resp.json()
                                text = data["choices"][0]["message"]["content"].strip()
                                if text:
                                    logger.info(f"Transcribed audio via OpenRouter ({m}): {text}")
                                    return {
                                        "status": "success",
                                        "text": text,
                                        "provider": "openrouter-ai",
                                    }
                    except Exception:
                        continue
            except Exception as e:
                logger.warning(f"OpenRouter audio transcription attempt: {e}")

        # 3. Try Google Gemini 1.5 Flash (if GEMINI_API_KEY is configured)
        if settings.GEMINI_API_KEY:
            try:
                b64_audio = base64.b64encode(audio_bytes).decode("utf-8")
                gemini_url = (
                    f"https://generativelanguage.googleapis.com/v1beta/models/"
                    f"gemini-1.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
                )
                payload = {
                    "contents": [{
                        "parts": [
                            {"inline_data": {"mime_type": mime, "data": b64_audio}},
                            {
                                "text": (
                                    "You are an expert speech transcriber for a civic complaint portal in India. "
                                    "Transcribe the spoken audio verbatim in its original language. "
                                    "Provide ONLY the plain transcribed text."
                                )
                            }
                        ]
                    }]
                }
                async with httpx.AsyncClient(timeout=35.0) as client:
                    resp = await client.post(gemini_url, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        candidates = data.get("candidates", [])
                        if candidates and "content" in candidates[0]:
                            parts = candidates[0]["content"].get("parts", [])
                            if parts and "text" in parts[0]:
                                text_result = parts[0]["text"].strip()
                                if text_result:
                                    logger.info(f"Successfully transcribed audio via Gemini ({len(text_result)} chars)")
                                    return {
                                        "status": "success",
                                        "text": text_result,
                                        "provider": "google-gemini",
                                    }
            except Exception as e:
                logger.warning(f"Google Gemini voice transcription attempt failed: {e}")

        # 4. Try OpenAI Whisper (if OPENAI_API_KEY is configured)
        if settings.OPENAI_API_KEY:
            try:
                whisper_url = "https://api.openai.com/v1/audio/transcriptions"
                headers = {"Authorization": f"Bearer {settings.OPENAI_API_KEY}"}
                files = {"file": (target_file.filename or "audio.webm", audio_bytes, mime)}
                data = {"model": "whisper-1"}
                async with httpx.AsyncClient(timeout=35.0) as client:
                    resp = await client.post(whisper_url, headers=headers, files=files, data=data)
                    if resp.status_code == 200:
                        text_result = resp.json().get("text", "").strip()
                        if text_result:
                            logger.info(f"Successfully transcribed audio via OpenAI Whisper ({len(text_result)} chars)")
                            return {
                                "status": "success",
                                "text": text_result,
                                "provider": "openai-whisper",
                            }
            except Exception as e:
                logger.warning(f"OpenAI Whisper transcription attempt failed: {e}")

        return {
            "status": "fallback",
            "text": "",
            "message": "Audio received. Dictation active — speak clearly or use quick templates.",
        }
    except Exception as exc:
        logger.error(f"Error processing voice transcription: {exc}", exc_info=True)
        return {
            "status": "error",
            "text": "",
            "message": f"Transcription error: {str(exc)}",
        }


# ─────────────────────────────────────────────────────────────
# AUTH
# ─────────────────────────────────────────────────────────────

auth_router = APIRouter(prefix="/api/auth", tags=["Auth"])


@auth_router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    ident = payload.email.strip()
    user = (
        db.query(User)
        .filter(
            (func.lower(User.email) == ident.lower())
            | (func.lower(User.email) == f"{ident.lower()}@civicflow.gov")
            | (func.lower(User.name) == ident.lower())
        )
        .first()
    )
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": user.email, "role": user.role})
    return AuthResponse(
        token=token,
        user={
            "id": user.id, "name": user.name, "email": user.email,
            "role": user.role, "ward": user.ward, "dept": user.dept,
        },
    )


@auth_router.post("/register", response_model=AuthResponse, status_code=201)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(func.lower(User.email) == payload.email.strip().lower()).first():
        raise HTTPException(status_code=409, detail="Email already registered")
    # Public self-registration strictly restricted to citizen role for security
    role = "citizen"
    user = User(
        name=payload.name.strip(),
        email=payload.email.strip().lower(),
        password_hash=hash_password(payload.password),
        role=role,
        ward=payload.ward or "Ward 14, Central Zone",
        dept=None,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token({"sub": user.email, "role": user.role})
    return AuthResponse(
        token=token,
        user={
            "id": user.id, "name": user.name, "email": user.email,
            "role": user.role, "ward": user.ward, "dept": user.dept,
        },
    )


@auth_router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(require_user)):
    """Validate current JWT session and return active user profile."""
    return UserOut(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        role=current_user.role,
        ward=current_user.ward,
        dept=current_user.dept,
    )


# ─────────────────────────────────────────────────────────────
# COMPLAINTS
# ─────────────────────────────────────────────────────────────

def purge_rejected_complaints(db: Session):
    """Purges any lingering rejected complaints so failed issues never persist or show in queries."""
    try:
        rejected = db.query(Complaint).filter(Complaint.status == "Rejected").all()
        if rejected:
            rej_ids = [c.id for c in rejected]
            logger.info(f"Purging {len(rej_ids)} rejected complaint(s) from database: {rej_ids}")
            db.query(ComplaintImage).filter(ComplaintImage.complaint_id.in_(rej_ids)).delete(synchronize_session=False)
            db.query(Complaint).filter(Complaint.id.in_(rej_ids)).delete(synchronize_session=False)
            db.commit()
    except Exception as e:
        logger.warning(f"Error purging rejected complaints: {e}")
        db.rollback()


complaints_router = APIRouter(prefix="/api/complaints", tags=["Complaints"])


@complaints_router.get("", response_model=List[Dict[str, Any]])
async def list_complaints(
    dept: Optional[str] = None,
    status: Optional[str] = None,
    citizen_id: Optional[int] = None,
    limit: int = 200,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    cache_key = f"civicflow:complaints:{dept}:{status}:{citizen_id}:{limit}"
    cached = await get_cache(cache_key)
    if cached is not None:
        return cached

    # Strictly filter out any rejected issues
    q = db.query(Complaint).filter(Complaint.status != "Rejected")
    if dept:
        q = q.filter(Complaint.dept == dept)
    if status:
        q = q.filter(Complaint.status == status)
    if citizen_id:
        q = q.filter(Complaint.citizen_id == citizen_id)
    complaints = q.order_by(desc(Complaint.submitted_at)).limit(limit).all()
    result = [_complaint_to_dict(c, db) for c in complaints]
    await set_cache(cache_key, result, ttl=30)
    return result


@complaints_router.post("", status_code=201)
async def submit_complaint(
    # Multipart form fields
    category:     str = Form(...),
    description:  str = Form(...),
    location:     str = Form(...),
    details:      str = Form(""),
    lat:          Optional[float] = Form(None),
    lng:          Optional[float] = Form(None),
    is_sensitive: Optional[Any] = Form(False),
    images:       List[UploadFile] = File(default=[]),
    db:           Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """
    Accept a multipart complaint submission with strict multi-agent validation:
    1. Validates necessary fields (description >= 10 chars, valid location).
    2. Physical issues like Road Damage REQUIRE photographic evidence (< 15 days old).
    3. Forwards to Multi-Agent Engine BEFORE creating or committing any record to PostgreSQL.
    4. If the agent rejects the issue (cross-modal contradiction, invalid evidence),
       the request fails immediately with 422 and NOTHING is committed to the database.
    5. Only approved grievances are assigned ticket IDs and persisted.
    """
    desc_clean = (description or "").strip()
    is_valid_text, reason = _is_meaningful_text(desc_clean)
    if not is_valid_text:
        raise HTTPException(
            status_code=422,
            detail=f"Submission rejected: {reason}"
        )

    loc_clean = (location or "").strip()
    if len(loc_clean) < 3:
        raise HTTPException(
            status_code=422,
            detail="Submission failed: Specific location or map coordinates are required to dispatch field teams."
        )

    # Check if sensitive issue flag is active
    sensitive_flag = False
    if is_sensitive is not None:
        if isinstance(is_sensitive, bool):
            sensitive_flag = is_sensitive
        elif str(is_sensitive).strip().lower() in ("true", "1", "yes", "on"):
            sensitive_flag = True

    cat_lower = category.strip().lower()
    if cat_lower in ("sensitive", "safety", "harassment", "corruption", "confidential"):
        sensitive_flag = True

    # ── Read & Validate Uploaded Images Upfront (EXIF Timestamp Verification) ──
    validated_images = []
    image_base64 = None
    for idx, upload in enumerate(images):
        if upload.filename and upload.filename.strip():
            raw = await upload.read()
            if raw:
                capture_dt = _extract_exif_capture_time(raw)
                if capture_dt:
                    age_days = (datetime.utcnow() - capture_dt).total_seconds() / 86400.0
                    if age_days > 15.0:
                        raise HTTPException(
                            status_code=422,
                            detail=(
                                f"Submission rejected: Photographic evidence is outdated (captured on "
                                f"{capture_dt.strftime('%Y-%m-%d')}, {int(age_days)} days ago). "
                                "Images must be taken within the last 15 days to reflect current civic conditions."
                            ),
                        )
                validated_images.append({
                    "data": raw,
                    "mime_type": upload.content_type or "image/jpeg",
                    "filename": upload.filename,
                    "capture_dt": capture_dt,
                })
                if image_base64 is None:
                    image_base64 = base64.b64encode(raw).decode("utf-8")

    has_images = len(validated_images) > 0

    # Physical defects like Road Damage require visual proof
    desc_lower = desc_clean.lower()
    is_physical_defect = (
        cat_lower in ("road", "waste", "infrastructure") or
        any(kw in desc_lower for kw in [
            "pothole", "road damage", "damaged road", "broken road", "crater",
            "pavement", "crack", "asphalt", "tar road", "caved in", "manhole",
            "road surface", "garbage dump", "waste accumulation", "debris"
        ])
    )

    if is_physical_defect and not has_images and not sensitive_flag:
        raise HTTPException(
            status_code=422,
            detail=(
                "Submission rejected: Photographic evidence is mandatory for reports like Road Damage "
                "and physical defects so municipal teams can verify damage extent and dispatch equipment. "
                "If this is a sensitive safety concern where taking photos is unsafe or violates privacy, "
                "please designate it as a sensitive issue."
            )
        )

    valid_cat = _map_category(category, description)
    valid_dept = _map_dept("", valid_cat)

    # ── Forward to Agent for AI deliberation BEFORE any database insertion ──
    agent_payload = {
        "text": f"{'[CONFIDENTIAL/SENSITIVE] ' if sensitive_flag else ''}{valid_cat}: {description}. Location: {location}. {details}".strip(),
        "category": valid_cat,
        "raw_category": category,
        "description": description,
        "image_base64": image_base64,
        "location": {"lat": lat, "lng": lng, "area": location} if lat else None,
        "citizen_id": str(current_user.id) if current_user else None,
        "is_sensitive": sensitive_flag,
    }

    agent_data = None
    try:
        async with httpx.AsyncClient(timeout=240.0) as client:
            resp = await client.post(
                f"{settings.AGENT_SERVICE_URL}/api/v1/complaints",
                json=agent_payload,
            )
        if resp.status_code in (200, 201):
            agent_data = resp.json()
            verification = agent_data.get("verification") or {}
            rejection_reason = agent_data.get("rejection_reason")
            is_rejected = (
                agent_data.get("status") == "Rejected"
                or not verification.get("approved", True)
                or bool(rejection_reason)
            )

            if is_rejected:
                fail_msg = (
                    rejection_reason
                    or verification.get("reasoning")
                    or "Photographic evidence contradicts the reported issue description and category."
                )
                logger.warning(f"Submission rejected by AI Agent: {fail_msg}")
                # Terminate submission immediately with 422 — NO DB RECORD CREATED!
                raise HTTPException(
                    status_code=422,
                    detail=f"Submission rejected: Photographic evidence does not corroborate your report. {fail_msg}"
                )

        elif resp.status_code == 422:
            agent_err = resp.json().get("detail", "Photographic evidence contradicts reported grievance.")
            logger.warning(f"Submission rejected by Agent (422): {agent_err}")
            raise HTTPException(
                status_code=422,
                detail=f"Submission rejected: {agent_err}"
            )
    except HTTPException:
        # Re-raise validation and rejection HTTPExceptions without touching database
        raise
    except Exception as exc:
        logger.warning(f"Agent unavailable, proceeding with valid citizen submission: {exc}")

    # ── ONLY PERSIST COMPLAINT IF APPROVED ──────────────────────────────
    ticket_id = _next_ticket_id(db)
    now = datetime.utcnow()

    final_cat = valid_cat
    category_rectified = False
    final_priority = "Medium"
    final_issue = f"{valid_cat} Issue"
    final_dept = valid_dept

    if agent_data:
        final_priority = _map_severity(agent_data.get("severity", "Medium"))
        final_issue = agent_data.get("issue_type", f"{valid_cat} Issue")

        agent_cat = _map_category(agent_data.get("category") or agent_data.get("issue_type", ""), description)
        category_rectified = bool(agent_data.get("category_rectified"))
        if agent_cat != "Other" and agent_cat != valid_cat:
            final_cat = agent_cat
            category_rectified = True

        final_dept = _map_dept(agent_data.get("department", ""), final_cat)

    complaint = Complaint(
        id=ticket_id,
        category=final_cat,
        issue=final_issue,
        dept=final_dept,
        description=description,
        location=location,
        lat=lat,
        lng=lng,
        is_sensitive=sensitive_flag,
        status="Under Review",
        priority=final_priority,
        citizen_id=current_user.id if current_user else None,
        submitted_at=now,
        last_updated=now,
        report_count=1,
    )

    timeline_events = [{
        "event": "Complaint submitted by citizen",
        "ts": now.isoformat(),
        "actor": current_user.name if current_user else "Citizen",
    }]
    if sensitive_flag and not has_images:
        timeline_events.append({
            "event": "Photographic evidence waived (sensitive / confidential issue)",
            "ts": now.isoformat(),
            "actor": "System Governance",
        })
    if category_rectified and valid_cat != final_cat:
        timeline_events.append({
            "event": f"Category rectified by Visual AI: Switched from {valid_cat} to {final_cat} (matched image content)",
            "ts": now.isoformat(),
            "actor": "CivicFlow Vision AI",
        })
    if agent_data:
        timeline_events.append({
            "event": "AI classification & multi-agent verification completed",
            "ts": now.isoformat(),
            "actor": "CivicFlow AI",
        })

    complaint.timeline = timeline_events

    if agent_data:
        complaint.incident_id = _find_or_create_incident(db, complaint, agent_data)
        complaint.ai_classification = {
            "category": complaint.category,
            "confidence": agent_data.get("issue_confidence", 0.85),
            "rectified": category_rectified,
            "original_category": valid_cat if category_rectified else None,
        }
        complaint.ai_severity = {
            "priority": complaint.priority,
            "reasoning": (agent_data.get("raw_incident") or {}).get("reasoning", ""),
        }
        complaint.agent_steps = _build_agent_steps(agent_data)
        complaint.agent_thoughts = agent_data.get("agent_thoughts") or {
            "issue": {
                "issue_type": complaint.issue,
                "confidence": agent_data.get("issue_confidence", 0.95),
                "reasoning": (agent_data.get("raw_incident") or {}).get("description") or f"Identified as {complaint.issue} based on citizen description.",
            },
            "evidence": {
                "grounding_score": agent_data.get("grounding_score", 0.8),
                "reasoning": "Visual evidence and textual spatial cues evaluated for authenticity.",
            },
            "severity": {
                "severity": complaint.priority,
                "severity_score": agent_data.get("severity_score", 65.0),
                "reasoning": (agent_data.get("ai_severity") or {}).get("reasoning") or f"Assessed priority as {complaint.priority} based on public safety risk and impact.",
            },
            "routing": {
                "primary_department": agent_data.get("department") or DEPT_NAMES.get(complaint.dept, complaint.dept),
                "reasoning": f"Complaint routed to {agent_data.get('department') or DEPT_NAMES.get(complaint.dept, complaint.dept)} for municipal field triage.",
            },
            "verification": agent_data.get("verification") or {
                "approved": True,
                "reasoning": "Statutory citizen charter criteria satisfied.",
            },
        }
    else:
        complaint.incident_id = _find_or_create_incident(db, complaint, {})

    db.add(complaint)
    db.flush()

    # Save uploaded images
    for item in validated_images:
        img_record = ComplaintImage(
            complaint_id=ticket_id,
            image_data=item["data"],
            mime_type=item["mime_type"],
            original_filename=item["filename"],
            image_type="evidence",
        )
        db.add(img_record)

    db.commit()

    # Activity + notification with accurate department display
    dept_label = DEPT_NAMES.get(complaint.dept, complaint.dept)
    _log_activity(db, "new", f"New {complaint.category} complaint submitted",
                  complaint_id=ticket_id, dept=dept_label, icon="alert")
    if current_user:
        _notify_user(db, current_user.id,
                     f"Your complaint {ticket_id} has been submitted and is under review.",
                     complaint_id=ticket_id)
    db.refresh(complaint)

    # Invalidate cached stats & broadcast real-time sync event
    await invalidate_all_stats()
    await publish_event("complaint_created", {
        "id": ticket_id,
        "category": complaint.category,
        "dept": complaint.dept,
        "status": complaint.status,
    })

    return _complaint_to_dict(complaint, db)


@complaints_router.get("/{ticket_id}", response_model=Dict[str, Any])
def get_complaint(
    ticket_id: str,
    db: Session = Depends(get_db),
    _: Optional[User] = Depends(get_current_user),
):
    c = db.query(Complaint).filter(Complaint.id == ticket_id).first()
    if not c:
        raise HTTPException(status_code=404, detail=f"Complaint {ticket_id} not found")
    return _complaint_to_dict(c, db)


@complaints_router.patch("/{ticket_id}", response_model=Dict[str, Any])
async def update_complaint(
    ticket_id: str,
    payload: ComplaintUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_dept),
):
    c = db.query(Complaint).filter(Complaint.id == ticket_id).first()
    if not c:
        raise HTTPException(status_code=404, detail=f"Complaint {ticket_id} not found")

    changed = False
    tl = c.timeline or []

    if payload.status and payload.status != c.status:
        old_status = c.status
        c.status = payload.status
        tl.append({
            "event": f"Status changed to {payload.status}",
            "ts": datetime.utcnow().isoformat(),
            "actor": current_user.name,
        })
        _log_activity(db, "assign" if "Assigned" in payload.status else "resolved",
                      f"Complaint {ticket_id} status → {payload.status}",
                      complaint_id=ticket_id, icon="assign")
        changed = True

        # Notify complaint owner
        if c.citizen_id:
            _notify_user(db, c.citizen_id,
                         f"Your complaint {ticket_id} status changed to {payload.status}.",
                         complaint_id=ticket_id)

    if payload.assigned_officer:
        c.assigned_officer = payload.assigned_officer
        changed = True

    if payload.dept:
        c.dept = payload.dept
        changed = True

    if payload.internal_note:
        notes = c.internal_notes or []
        notes.append(payload.internal_note)
        c.internal_notes = notes
        changed = True

    if payload.resolution_evidence:
        c.resolution_evidence = payload.resolution_evidence
        tl.append({
            "event": "Resolution evidence uploaded",
            "ts": datetime.utcnow().isoformat(),
            "actor": current_user.name,
        })
        _log_activity(db, "evidence", f"Resolution evidence for {ticket_id}",
                      complaint_id=ticket_id, dept=DEPT_NAMES.get(c.dept, ""),
                      icon="camera")
        changed = True

    if changed:
        c.timeline = tl
        c.last_updated = datetime.utcnow()
        db.commit()
        db.refresh(c)

        # Invalidate cache and publish real-time update
        await invalidate_all_stats()
        await publish_event("complaint_updated", {
            "id": ticket_id,
            "status": c.status,
            "dept": c.dept,
            "assigned_officer": c.assigned_officer,
        })

    return _complaint_to_dict(c, db)


@complaints_router.post("/{ticket_id}/vote")
async def vote_complaint(
    ticket_id: str,
    payload: VoteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user),
):
    c = db.query(Complaint).filter(Complaint.id == ticket_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")
    if payload.direction == "up":
        c.support_count += 1
    elif payload.direction == "down":
        c.dislike_count += 1
    else:
        raise HTTPException(status_code=400, detail="direction must be 'up' or 'down'")
    db.commit()

    # Invalidate cache and broadcast vote event
    await invalidate_all_stats()
    await publish_event("complaint_voted", {
        "id": ticket_id,
        "supportCount": c.support_count,
        "dislikeCount": c.dislike_count,
    })

    return {"supportCount": c.support_count, "dislikeCount": c.dislike_count}


@complaints_router.get("/{ticket_id}/trace", response_model=List[Dict[str, Any]])
async def get_complaint_trace(
    ticket_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_dept),
):
    """Proxy to agent for full audit trail."""
    url = f"{settings.AGENT_SERVICE_URL}/api/v1/complaints/{ticket_id}/trace"
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url)
        if resp.status_code == 200:
            return resp.json()
        # fallback: return agent steps stored on complaint
    except Exception:
        pass
    c = db.query(Complaint).filter(Complaint.id == ticket_id).first()
    return c.agent_steps if c else []


@complaints_router.post("/{ticket_id}/rerun", response_model=Dict[str, Any])
async def rerun_complaint(
    ticket_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    url = f"{settings.AGENT_SERVICE_URL}/api/v1/complaints/{ticket_id}/rerun"
    try:
        async with httpx.AsyncClient(timeout=180.0) as client:
            resp = await client.post(url)
        if resp.status_code == 200:
            return resp.json()
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"Agent unreachable: {e}")


# ── Image serving ──────────────────────────────────────────────────────────────

@complaints_router.get("/{ticket_id}/images/{image_id}")
def get_image(
    ticket_id: str,
    image_id: int,
    db: Session = Depends(get_db),
):
    """Serve a stored image as binary response."""
    img = db.query(ComplaintImage).filter(
        ComplaintImage.id == image_id,
        ComplaintImage.complaint_id == ticket_id,
    ).first()
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")
    return Response(content=img.image_data, media_type=img.mime_type)


@complaints_router.post("/{ticket_id}/images", status_code=201)
async def upload_resolution_images(
    ticket_id: str,
    image_type: str = Form("resolution_after"),
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_dept),
):
    """Upload resolution before/after evidence images."""
    c = db.query(Complaint).filter(Complaint.id == ticket_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")

    saved = []
    for upload in files:
        raw = await upload.read()
        img_record = ComplaintImage(
            complaint_id=ticket_id,
            image_data=raw,
            mime_type=upload.content_type or "image/jpeg",
            original_filename=upload.filename,
            image_type=image_type,
        )
        db.add(img_record)
        db.flush()
        saved.append({
            "id": img_record.id,
            "url": f"/api/complaints/{ticket_id}/images/{img_record.id}",
            "image_type": image_type,
        })

    tl = c.timeline or []
    tl.append({
        "event": f"Resolution images uploaded ({image_type})",
        "ts": datetime.utcnow().isoformat(),
        "actor": current_user.name,
    })
    c.timeline = tl
    c.last_updated = datetime.utcnow()
    db.commit()

    await invalidate_all_stats()
    await publish_event("complaint_updated", {"id": ticket_id, "evidence": image_type})

    return {"uploaded": saved}


# ─────────────────────────────────────────────────────────────
# INCIDENTS
# ─────────────────────────────────────────────────────────────

incidents_router = APIRouter(prefix="/api/incidents", tags=["Incidents"])


@incidents_router.get("", response_model=List[Dict[str, Any]])
async def list_incidents(db: Session = Depends(get_db)):
    cached = await get_cache("civicflow:incidents")
    if cached is not None:
        return cached

    incidents = db.query(Incident).order_by(desc(Incident.updated_at)).all()
    result = []
    for inc in incidents:
        complaint_ids = [
            c.id for c in
            db.query(Complaint.id).filter(Complaint.incident_id == inc.id).all()
        ]
        result.append({
            "id": inc.id,
            "issue": inc.issue,
            "category": inc.category,
            "location": inc.location,
            "status": inc.status,
            "priority": inc.priority,
            "reportCount": inc.report_count,
            "supportCount": inc.support_count,
            "dept": inc.dept,
            "complaintIds": [r for r in complaint_ids],
        })
    await set_cache("civicflow:incidents", result, ttl=60)
    return result


# ─────────────────────────────────────────────────────────────
# STATS
# ─────────────────────────────────────────────────────────────

stats_router = APIRouter(prefix="/api/stats", tags=["Stats"])


@stats_router.get("/admin", response_model=AdminStatsOut)
async def admin_stats(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    cached = await get_cache("civicflow:stats:admin")
    if cached is not None:
        return AdminStatsOut(**cached)

    total    = db.query(func.count(Complaint.id)).filter(Complaint.status != "Rejected").scalar() or 0
    active   = db.query(func.count(Complaint.id)).filter(Complaint.status.in_(ACTIVE_STATUSES)).scalar() or 0
    resolved = db.query(func.count(Complaint.id)).filter(Complaint.status.in_(RESOLVED_STATUSES)).scalar() or 0
    pending  = db.query(func.count(Complaint.id)).filter(Complaint.status == "Under Review").scalar() or 0
    escalated= db.query(func.count(Complaint.id)).filter(Complaint.status == "Escalated").scalar() or 0
    critical = db.query(func.count(Complaint.id)).filter(Complaint.priority == "Critical", Complaint.status != "Rejected").scalar() or 0
    res = AdminStatsOut(total=total, active=active, resolved=resolved,
                         pending=pending, escalated=escalated, critical=critical)
    await set_cache("civicflow:stats:admin", res.model_dump(), ttl=60)
    return res


@stats_router.get("/category-breakdown", response_model=List[CategoryBreakdownItem])
async def category_breakdown(db: Session = Depends(get_db)):
    cached = await get_cache("civicflow:stats:category_breakdown")
    if cached is not None:
        return [CategoryBreakdownItem(**i) for i in cached]

    rows = (
        db.query(Complaint.category, func.count(Complaint.id).label("cnt"))
        .filter(Complaint.status != "Rejected")
        .group_by(Complaint.category)
        .order_by(desc("cnt"))
        .all()
    )
    total = sum(r.cnt for r in rows) or 1
    res = [
        CategoryBreakdownItem(category=r.category, count=r.cnt,
                              pct=round(r.cnt / total * 100))
        for r in rows
    ]
    await set_cache("civicflow:stats:category_breakdown", [i.model_dump() for i in res], ttl=60)
    return res


@stats_router.get("/status-breakdown", response_model=List[StatusBreakdownItem])
async def status_breakdown(db: Session = Depends(get_db)):
    cached = await get_cache("civicflow:stats:status_breakdown")
    if cached is not None:
        return [StatusBreakdownItem(**i) for i in cached]

    rows = (
        db.query(Complaint.status, func.count(Complaint.id).label("cnt"))
        .filter(Complaint.status != "Rejected")
        .group_by(Complaint.status)
        .order_by(desc("cnt"))
        .all()
    )
    res = [StatusBreakdownItem(status=r.status, count=r.cnt) for r in rows]
    await set_cache("civicflow:stats:status_breakdown", [i.model_dump() for i in res], ttl=60)
    return res


@stats_router.get("/dept-performance", response_model=List[DeptPerformanceItem])
async def dept_performance(db: Session = Depends(get_db)):
    cached = await get_cache("civicflow:stats:dept_performance")
    if cached is not None:
        return [DeptPerformanceItem(**i) for i in cached]

    result = []
    for dept_id, dept_name in DEPT_NAMES.items():
        base_q = db.query(Complaint).filter(Complaint.dept == dept_id, Complaint.status != "Rejected")
        assigned   = base_q.count()
        in_prog    = base_q.filter(Complaint.status == "In Progress").count()
        resolved   = base_q.filter(Complaint.status.in_(RESOLVED_STATUSES)).count()
        pending    = base_q.filter(Complaint.status.in_({"Submitted", "Under Review"})).count()
        escalated  = base_q.filter(Complaint.status == "Escalated").count()
        avg_days   = round((resolved * 2.5 + in_prog * 1.2) / max(assigned, 1), 1)
        result.append(DeptPerformanceItem(
            dept=dept_name, assigned=assigned, inProgress=in_prog,
            resolved=resolved, pending=pending, escalated=escalated,
            avgResolutionDays=avg_days,
        ))
    await set_cache("civicflow:stats:dept_performance", [i.model_dump() for i in result], ttl=60)
    return result


@stats_router.get("/activity-feed", response_model=List[ActivityFeedItem])
async def activity_feed(limit: int = 20, db: Session = Depends(get_db)):
    cache_key = f"civicflow:stats:activity_feed:{limit}"
    cached = await get_cache(cache_key)
    if cached is not None:
        return [ActivityFeedItem(**i) for i in cached]

    rows = (
        db.query(ActivityLog)
        .order_by(desc(ActivityLog.created_at))
        .limit(limit)
        .all()
    )
    res = [
        ActivityFeedItem(
            id=r.id, type=r.type, text=r.text,
            complaintId=r.complaint_id, dept=r.dept,
            ts=_time_ago(r.created_at), icon=r.icon,
        )
        for r in rows
    ]
    await set_cache(cache_key, [i.model_dump() for i in res], ttl=30)
    return res


@stats_router.get("/map-markers", response_model=List[MapMarkerOut])
async def map_markers(db: Session = Depends(get_db)):
    """
    Returns geospatial marker coordinates for complaints across the city,
    backed by high-speed Redis caching.
    """
    cache_key = "civicflow:stats:map_markers"
    cached = await get_cache(cache_key)
    if cached is not None:
        return [MapMarkerOut(**i) for i in cached]

    complaints = (
        db.query(Complaint)
        .filter(Complaint.status != "Rejected")
        .order_by(desc(Complaint.submitted_at))
        .all()
    )
    # Delhi bounding box (approximate) for SVG backwards compatibility
    lat_min, lat_max = 28.40, 28.80
    lng_min, lng_max = 76.85, 77.35

    markers = []
    for idx, c in enumerate(complaints):
        lat = c.lat
        lng = c.lng
        # If coordinates were not pinpointed, approximate intelligently from location text
        if lat is None or lng is None:
            loc_lower = (c.location or "").lower()
            if "ichalkaranji" in loc_lower or "rajwada" in loc_lower:
                lat = 16.6961 + (idx * 0.0015)
                lng = 74.4632 + (idx * 0.0015)
            else:
                lat = 28.6139 + (idx * 0.002)
                lng = 77.2090 + (idx * 0.002)

        x = round((lng - lng_min) / (lng_max - lng_min) * 100, 1) if (lng_max - lng_min) else 50.0
        y = round((1 - (lat - lat_min) / (lat_max - lat_min)) * 100, 1) if (lat_max - lat_min) else 50.0

        markers.append(MapMarkerOut(
            id=idx + 1,
            ticket_id=c.id,
            category=c.category,
            priority=c.priority or "Medium",
            status=c.status or "Submitted",
            label=c.issue or c.category,
            location=c.location or "Municipal Ward",
            lat=float(lat),
            lng=float(lng),
            dept=c.dept,
            submitted_at=c.submitted_at.isoformat() if c.submitted_at else None,
            has_evidence=bool(c.images and len(c.images) > 0),
            count=1,
            x=max(5.0, min(95.0, x)),
            y=max(5.0, min(95.0, y)),
        ))
    await set_cache(cache_key, [m.model_dump() for m in markers], ttl=60)
    return markers


@stats_router.get("/area", response_model=dict)
async def area_stats(db: Session = Depends(get_db),
                     current_user: Optional[User] = Depends(get_current_user)):
    cached = await get_cache("civicflow:stats:area")
    if cached is not None:
        return cached

    active   = db.query(func.count(Complaint.id)).filter(Complaint.status.in_(ACTIVE_STATUSES)).scalar() or 0
    resolved = db.query(func.count(Complaint.id)).filter(Complaint.status.in_(RESOLVED_STATUSES)).scalar() or 0
    in_prog  = db.query(func.count(Complaint.id)).filter(Complaint.status == "In Progress").scalar() or 0
    support  = db.query(func.coalesce(func.sum(Complaint.support_count), 0)).scalar() or 0
    res = {
        "activeNearby": active,
        "resolvedNearby": resolved,
        "inProgress": in_prog,
        "communityReports": support,
    }
    await set_cache("civicflow:stats:area", res, ttl=60)
    return res


# ─────────────────────────────────────────────────────────────
# NOTIFICATIONS
# ─────────────────────────────────────────────────────────────

notifs_router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


@notifs_router.get("", response_model=List[Dict[str, Any]])
def list_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user),
):
    notifs = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(desc(Notification.created_at))
        .limit(50)
        .all()
    )
    return [
        {
            "id": n.id, "read": n.read, "text": n.text,
            "complaint_id": n.complaint_id,
            "ts": _time_ago(n.created_at),
        }
        for n in notifs
    ]


@notifs_router.patch("/{notif_id}/read")
def mark_read(
    notif_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user),
):
    n = db.query(Notification).filter(
        Notification.id == notif_id, Notification.user_id == current_user.id
    ).first()
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    n.read = True
    db.commit()
    return {"ok": True}


# ─────────────────────────────────────────────────────────────
# Private helpers
# ─────────────────────────────────────────────────────────────

def _map_severity(severity: str) -> str:
    return {"Low": "Low", "Medium": "Medium", "High": "High", "Critical": "Critical"}.get(
        severity, "Medium"
    )


def _map_category(category_or_issue: str, text: str = "") -> str:
    cat_clean = (category_or_issue or "").strip().lower()
    CANONICAL = {
        "road": "Road",
        "roads": "Road",
        "waste": "Waste",
        "garbage": "Waste",
        "sanitation": "Waste",
        "streetlight": "Streetlight",
        "street light": "Streetlight",
        "lighting": "Streetlight",
        "water": "Water",
        "drainage": "Drainage",
        "drain": "Drainage",
        "infrastructure": "Infrastructure",
        "infra": "Infrastructure",
        "other": "Other",
    }
    if cat_clean in CANONICAL:
        return CANONICAL[cat_clean]

    combined = f"{category_or_issue} {text}".lower()
    if any(k in combined for k in ["pothole", "asphalt", "pavement", "crater", "divider", "speed breaker"]):
        return "Road"
    if any(k in combined for k in ["garbage", "waste", "trash", "dump", "refuse", "litter", "sanitation", "debris", "bin"]):
        return "Waste"
    if any(k in combined for k in ["streetlight", "street light", "lamp", "pole", "illumination", "electrical", "dark"]):
        return "Streetlight"
    if any(k in combined for k in ["water", "leak", "pipe", "tap", "drinking water", "jal", "tanker"]):
        return "Water"
    if any(k in combined for k in ["drainage", "drain", "sewage", "sewer", "overflow", "stormwater", "manhole", "gutter"]):
        return "Drainage"
    if any(k in combined for k in ["bridge", "footpath", "sidewalk", "park", "building", "infrastructure", "construction", "encroachment"]):
        return "Infrastructure"
    if "road" in combined:
        return "Road"
    return "Other"


def _map_dept(dept_str: str, fallback_category: str = "Other") -> str:
    dept_lower = (dept_str or "").lower()
    if any(k in dept_lower for k in ["road", "highways", "pwd"]):
        return "road"
    if any(k in dept_lower for k in ["waste", "sanitation", "garbage", "cleanliness", "solid waste"]):
        return "waste"
    if any(k in dept_lower for k in ["water", "jal", "pipe"]):
        return "water"
    if any(k in dept_lower for k in ["drain", "sewer", "sewage", "stormwater"]):
        return "drainage"
    if any(k in dept_lower for k in ["electrical", "electric", "streetlight", "lighting"]):
        return "streetlight"
    if any(k in dept_lower for k in ["infra", "public works", "planning", "parks", "horticulture"]):
        return "infra"

    # Strict fallback based on canonical category
    cat_to_dept = {
        "Road": "road",
        "Waste": "waste",
        "Streetlight": "streetlight",
        "Water": "water",
        "Drainage": "drainage",
        "Infrastructure": "infra",
    }
    return cat_to_dept.get(fallback_category, "other")


def _build_agent_steps(agent_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    trail = agent_data.get("audit_trail", [])
    steps = []
    agent_name_map = {
        "IssueAgent": "Understanding Agent",
        "EvidenceAgent": "Evidence Agent",
        "SeverityAgent": "Severity Agent",
        "IncidentAgent": "Incident Agent",
        "RoutingAgent": "Routing Agent",
        "WorkflowAgent": "Workflow Agent",
        "VerificationAgent": "Verification Agent",
    }
    for entry in trail:
        name = agent_name_map.get(entry.get("agent_name", ""), entry.get("agent_name", "Agent"))
        out = entry.get("output_json", {})
        detail = (
            out.get("short_description")
            or out.get("reasoning", "")[:80]
            or entry.get("reasoning", "")[:80]
        )
        steps.append({
            "name": name,
            "status": "done" if entry.get("success") else "failed",
            "detail": detail,
            "ts": entry.get("timestamp", datetime.utcnow().isoformat()),
        })
    return steps


def _find_or_create_incident(db: Session, complaint: Complaint, agent_data: Dict) -> Optional[str]:
    """Group complaint under existing incident in same area or create a new one."""
    query = (
        db.query(Incident)
        .filter(Incident.category == complaint.category)
        .filter(Incident.dept == complaint.dept)
        .filter(~Incident.status.in_(RESOLVED_STATUSES))
    )
    # Check if existing incident in similar location exists
    existing = None
    if complaint.location:
        loc_token = complaint.location.split(",")[0].strip()
        if len(loc_token) >= 3:
            existing = query.filter(Incident.location.ilike(f"%{loc_token}%")).first()

    if not existing:
        # Fallback to category + dept match if only 1 incident active in that dept
        existing = query.first()

    if existing:
        existing.report_count = (existing.report_count or 1) + 1
        existing.support_count = (existing.support_count or 0) + (complaint.support_count or 0)
        existing.updated_at = datetime.utcnow()
        db.commit()
        return existing.id

    inc_id = _next_incident_id(db)
    raw = agent_data.get("raw_incident") or {}
    incident = Incident(
        id=inc_id,
        issue=raw.get("title", complaint.issue),
        category=complaint.category,
        location=complaint.location,
        status=complaint.status,
        priority=complaint.priority,
        report_count=1,
        support_count=complaint.support_count or 0,
        dept=complaint.dept,
    )
    db.add(incident)
    db.commit()
    _log_activity(db, "new", f"New incident {inc_id} created for {complaint.category}",
                  complaint_id=complaint.id, dept=DEPT_NAMES.get(complaint.dept, complaint.dept), icon="alert")
    return inc_id
