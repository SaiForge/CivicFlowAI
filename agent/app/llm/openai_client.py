import json
import logging
import re
import asyncio
from typing import Any, Dict, Optional
import httpx
from app.config.settings import settings

logger = logging.getLogger(__name__)

_gemini_semaphore: Optional[asyncio.Semaphore] = None

def _get_gemini_semaphore() -> asyncio.Semaphore:
    global _gemini_semaphore
    if _gemini_semaphore is None:
        _gemini_semaphore = asyncio.Semaphore(2)
    return _gemini_semaphore

def _sanitize_error(err: Exception) -> str:
    """Sanitize error messages, removing raw HTML or excessively long payloads."""
    msg = str(err).strip()
    if "<!DOCTYPE html" in msg or "<html" in msg or "<body" in msg:
        status = getattr(err, "status_code", "4xx/5xx")
        return f"{type(err).__name__} (Status {status}): Remote server returned an HTML error page instead of JSON API response."
    if len(msg) > 200:
        return f"{type(err).__name__}: {msg[:190]}..."
    return f"{type(err).__name__}: {msg}"

class LLMClient:
    """
    Unified async LLM client supporting both Google Gemini and OpenAI models.
    Supports vision/multimodal inputs, strict JSON response formatting,
    automatic JSON extraction, and exponential backoff retries.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        vision_model: Optional[str] = None,
        gemini_api_key: Optional[str] = None,
        gemini_model: Optional[str] = None,
        openrouter_api_key: Optional[str] = None,
        openrouter_model: Optional[str] = None,
        openrouter_base_url: Optional[str] = None,
        provider: Optional[str] = None,
    ):
        self.openai_api_key = api_key or getattr(settings, "OPENAI_API_KEY", "")
        self.openai_model = model or getattr(settings, "MODEL_NAME", "gpt-4o-mini")
        self.openai_vision_model = vision_model or getattr(settings, "VISION_MODEL_NAME", "gpt-4o-mini")

        # Google Gemini config
        self.gemini_api_key = (
            gemini_api_key
            or getattr(settings, "GEMINI_API_KEY", "")
            or getattr(settings, "GOOGLE_API_KEY", "")
        )
        self.gemini_model = gemini_model or getattr(settings, "GEMINI_MODEL_NAME", "gemini-1.5-flash")

        # OpenRouter config
        self.openrouter_api_key = (
            openrouter_api_key
            or getattr(settings, "OPENROUTER_API_KEY", "")
            or os.getenv("OPENROUTER_API_KEY", "")
        )
        self.openrouter_model = (
            openrouter_model
            or getattr(settings, "OPENROUTER_MODEL_NAME", "openai/gpt-4o-mini")
            or os.getenv("OPENROUTER_MODEL_NAME", "openai/gpt-4o-mini")
        )
        self.openrouter_base_url = (
            openrouter_base_url
            or getattr(settings, "OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
            or os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
        )

        # Resolve provider: "openrouter", "gemini", "openai", or "auto"
        configured_provider = (provider or getattr(settings, "LLM_PROVIDER", "auto") or "auto").lower()
        if configured_provider == "openrouter":
            self.provider = "openrouter"
        elif configured_provider == "gemini":
            self.provider = "gemini"
        elif configured_provider == "openai":
            self.provider = "openai"
        else:
            # Auto-detection priority: OpenRouter -> Gemini -> OpenAI -> Fallback
            if self.openrouter_api_key:
                self.provider = "openrouter"
            elif self.gemini_api_key:
                self.provider = "gemini"
            elif self.openai_api_key:
                self.provider = "openai"
            else:
                self.provider = "fallback"

        # Initialize OpenAI Async client only if using OpenAI
        self._openai_client = None
        if self.provider == "openai" and self.openai_api_key:
            try:
                from openai import AsyncOpenAI
                self._openai_client = AsyncOpenAI(api_key=self.openai_api_key)
            except ImportError:
                logger.warning("openai package not installed. OpenAI client unavailable.")

        logger.info(f"LLMClient initialized with active provider: '{self.provider}'")

    def _extract_json(self, raw_text: str) -> dict:
        """Extract JSON from raw LLM text even if wrapped in markdown codeblocks."""
        clean_text = raw_text.strip()
        if "```" in clean_text:
            match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", clean_text)
            if match:
                clean_text = match.group(1).strip()

        first_brace = clean_text.find("{")
        last_brace = clean_text.rfind("}")
        if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
            clean_text = clean_text[first_brace : last_brace + 1]

        return json.loads(clean_text)

    async def complete(
        self,
        system_prompt: str,
        user_prompt: str,
        image_b64: Optional[str] = None,
        response_schema: Optional[Dict[str, Any]] = None,
        temperature: float = 0.2,
    ) -> Dict[str, Any]:
        """
        Complete a prompt asynchronously using the active provider (OpenRouter, Gemini, or OpenAI),
        supporting vision input, structured JSON output, retry on parse error,
        and exponential backoff.
        """
        if self.provider == "openrouter":
            return await self._complete_openrouter(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                image_b64=image_b64,
                temperature=temperature,
            )
        elif self.provider == "gemini":
            return await self._complete_gemini(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                image_b64=image_b64,
                temperature=temperature,
            )
        elif self.provider == "openai":
            return await self._complete_openai(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                image_b64=image_b64,
                temperature=temperature,
            )
        else:
            logger.warning("LLMClient has no active API keys configured. Generating fallback response.")
            return {
                "error": "No LLM API key (OPENROUTER_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY) configured",
                "raw_text": "{}",
            }

    async def _complete_openai(
        self,
        system_prompt: str,
        user_prompt: str,
        image_b64: Optional[str] = None,
        temperature: float = 0.2,
    ) -> Dict[str, Any]:
        """Complete prompt using OpenAI API."""
        if not self._openai_client:
            raise ValueError("OpenAI client not initialized. Check OPENAI_API_KEY and package.")

        selected_model = self.openai_vision_model if image_b64 else self.openai_model

        messages = [
            {"role": "system", "content": system_prompt}
        ]

        if image_b64:
            if not image_b64.startswith("data:"):
                img_url = f"data:image/jpeg;base64,{image_b64}"
            else:
                img_url = image_b64

            user_content = [
                {"type": "text", "text": user_prompt},
                {"type": "image_url", "image_url": {"url": img_url}},
            ]
            messages.append({"role": "user", "content": user_content})
        else:
            messages.append({"role": "user", "content": user_prompt})

        max_attempts = 3
        backoff_base = 1.0

        for attempt in range(1, max_attempts + 1):
            try:
                response = await self._openai_client.chat.completions.create(
                    model=selected_model,
                    messages=messages,
                    temperature=temperature,
                    response_format={"type": "json_object"},
                )

                raw_content = response.choices[0].message.content or "{}"
                try:
                    return self._extract_json(raw_content)
                except Exception as parse_err:
                    logger.warning(f"[OpenAI] JSON parse error on attempt {attempt}: {parse_err}. Content: {raw_content}")
                    if attempt < max_attempts:
                        messages.append({"role": "assistant", "content": raw_content})
                        messages.append({
                            "role": "user",
                            "content": "Your previous response was not valid JSON. Please re-output the EXACT same response in strict, valid JSON format only.",
                        })
                        continue
                    raise ValueError(f"Failed to parse valid JSON from OpenAI after {max_attempts} attempts: {raw_content}")

            except Exception as e:
                err_str = str(e).lower()
                is_transient = "rate limit" in err_str or "429" in err_str or "timeout" in err_str
                if is_transient and attempt < max_attempts:
                    sleep_time = backoff_base * (2 ** (attempt - 1))
                    logger.warning(f"[OpenAI] Transient error ({_sanitize_error(e)}). Backing off for {sleep_time}s...")
                    await asyncio.sleep(sleep_time)
                else:
                    if attempt == max_attempts:
                        sanitized = _sanitize_error(e)
                        logger.error(f"[OpenAI] Call failed definitively: {sanitized}")
                        raise RuntimeError(sanitized)
                    await asyncio.sleep(0.5)

        return {}

    async def _complete_gemini(
        self,
        system_prompt: str,
        user_prompt: str,
        image_b64: Optional[str] = None,
        temperature: float = 0.2,
    ) -> Dict[str, Any]:
        """Complete prompt using Google Gemini API via official REST endpoint."""
        if not self.gemini_api_key:
            raise ValueError("Gemini API key is not configured. Set GEMINI_API_KEY in .env.")

        # Ensure valid model name
        model_name = self.gemini_model or "gemini-1.5-flash"
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={self.gemini_api_key}"

        parts: list[Dict[str, Any]] = [{"text": user_prompt}]

        if image_b64:
            mime_type = "image/jpeg"
            clean_b64 = image_b64
            if image_b64.startswith("data:"):
                try:
                    header, clean_b64 = image_b64.split(",", 1)
                    if ";" in header and ":" in header:
                        mime_type = header.split(";")[0].split(":")[1]
                except Exception:
                    clean_b64 = image_b64

            parts.append({
                "inlineData": {
                    "mimeType": mime_type,
                    "data": clean_b64,
                }
            })

        payload = {
            "systemInstruction": {
                "parts": [{"text": system_prompt}]
            },
            "contents": [
                {
                    "role": "user",
                    "parts": parts,
                }
            ],
            "generationConfig": {
                "temperature": temperature,
                "responseMimeType": "application/json",
            },
        }

        max_attempts = 4
        backoff_base = 2.0

        async with _get_gemini_semaphore():
            async with httpx.AsyncClient(timeout=60.0) as client:
                for attempt in range(1, max_attempts + 1):
                    try:
                        response = await client.post(
                            url,
                            json=payload,
                            headers={"Content-Type": "application/json"},
                        )

                        if response.status_code == 200:
                            data = response.json()
                            candidates = data.get("candidates", [])
                            if not candidates:
                                raise ValueError(f"Gemini returned empty candidates: {data}")

                            content_parts = candidates[0].get("content", {}).get("parts", [])
                            if not content_parts:
                                raise ValueError(f"Gemini candidate has no content parts: {candidates[0]}")

                            raw_content = content_parts[0].get("text", "{}")
                            try:
                                return self._extract_json(raw_content)
                            except Exception as parse_err:
                                logger.warning(f"[Gemini] JSON parse error on attempt {attempt}: {parse_err}. Content: {raw_content}")
                                if attempt < max_attempts:
                                    payload["contents"].append({
                                        "role": "model",
                                        "parts": [{"text": raw_content}]
                                    })
                                    payload["contents"].append({
                                        "role": "user",
                                        "parts": [{"text": "Your previous response was not valid JSON. Please output strict, valid JSON only."}]
                                    })
                                    continue
                                raise ValueError(f"Failed to parse valid JSON from Gemini: {raw_content}")

                        elif response.status_code in [429, 500, 503]:
                            if attempt < max_attempts:
                                retry_hdr = response.headers.get("Retry-After") or response.headers.get("retry-after")
                                if retry_hdr and retry_hdr.isdigit():
                                    sleep_time = min(float(retry_hdr), 12.0)
                                else:
                                    sleep_time = min(backoff_base * (1.8 ** (attempt - 1)), 10.0)
                                logger.warning(f"[Gemini] Status {response.status_code}. Backing off {sleep_time:.1f}s (attempt {attempt}/{max_attempts})...")
                                await asyncio.sleep(sleep_time)
                                continue
                            else:
                                raise RuntimeError(f"Gemini API rate limit or transient error (HTTP {response.status_code})")
                        else:
                            err_text = response.text[:200]
                            raise RuntimeError(f"Gemini API error (HTTP {response.status_code}): {err_text}")

                    except httpx.RequestError as req_err:
                        if attempt < max_attempts:
                            sleep_time = min(backoff_base * (1.8 ** (attempt - 1)), 8.0)
                            logger.warning(f"[Gemini] Network error ({req_err}). Retrying in {sleep_time:.1f}s...")
                            await asyncio.sleep(sleep_time)
                        else:
                            logger.error(f"[Gemini] Request failed definitively: {req_err}")
                            raise RuntimeError(f"Gemini network connection error: {req_err}")

        return {}

    async def _complete_openrouter(
        self,
        system_prompt: str,
        user_prompt: str,
        image_b64: Optional[str] = None,
        temperature: float = 0.2,
    ) -> Dict[str, Any]:
        """Complete prompt using OpenRouter API via OpenAI-compatible REST endpoint."""
        if not self.openrouter_api_key:
            raise ValueError("OpenRouter API key is not configured. Set OPENROUTER_API_KEY in .env.")

        base_url = self.openrouter_base_url.rstrip("/")
        url = f"{base_url}/chat/completions"

        messages: list[Dict[str, Any]] = [
            {"role": "system", "content": system_prompt}
        ]

        if image_b64:
            if not image_b64.startswith("data:"):
                img_url = f"data:image/jpeg;base64,{image_b64}"
            else:
                img_url = image_b64

            user_content = [
                {"type": "text", "text": user_prompt},
                {"type": "image_url", "image_url": {"url": img_url}},
            ]
            messages.append({"role": "user", "content": user_content})
        else:
            messages.append({"role": "user", "content": user_prompt})

        payload = {
            "model": self.openrouter_model or "openai/gpt-4o-mini",
            "messages": messages,
            "temperature": temperature,
            "response_format": {"type": "json_object"},
        }

        headers = {
            "Authorization": f"Bearer {self.openrouter_api_key}",
            "HTTP-Referer": "https://civicflow.ai",
            "X-Title": "CivicFlowAI",
            "Content-Type": "application/json",
        }

        max_attempts = 4
        backoff_base = 2.0

        async with httpx.AsyncClient(timeout=60.0) as client:
            for attempt in range(1, max_attempts + 1):
                try:
                    response = await client.post(
                        url,
                        json=payload,
                        headers=headers,
                    )

                    if response.status_code == 200:
                        data = response.json()
                        choices = data.get("choices", [])
                        if not choices:
                            raise ValueError(f"OpenRouter returned empty choices: {data}")

                        raw_content = choices[0].get("message", {}).get("content", "{}")
                        try:
                            return self._extract_json(raw_content)
                        except Exception as parse_err:
                            logger.warning(
                                f"[OpenRouter] JSON parse error on attempt {attempt}: {parse_err}. Content: {raw_content}"
                            )
                            if attempt < max_attempts:
                                payload["messages"].append({
                                    "role": "assistant",
                                    "content": raw_content,
                                })
                                payload["messages"].append({
                                    "role": "user",
                                    "content": "Your previous response was not valid JSON. Please output strict, valid JSON only.",
                                })
                                continue
                            raise ValueError(f"Failed to parse valid JSON from OpenRouter: {raw_content}")

                    elif response.status_code in [429, 500, 502, 503, 504]:
                        if attempt < max_attempts:
                            retry_hdr = response.headers.get("Retry-After") or response.headers.get("retry-after")
                            if retry_hdr and retry_hdr.isdigit():
                                sleep_time = min(float(retry_hdr), 12.0)
                            else:
                                sleep_time = min(backoff_base * (1.8 ** (attempt - 1)), 10.0)
                            logger.warning(
                                f"[OpenRouter] Status {response.status_code}. Backing off {sleep_time:.1f}s (attempt {attempt}/{max_attempts})..."
                            )
                            await asyncio.sleep(sleep_time)
                            continue
                        else:
                            raise RuntimeError(
                                f"OpenRouter rate limit or server error (HTTP {response.status_code}): {response.text[:200]}"
                            )
                    else:
                        err_text = response.text[:200]
                        raise RuntimeError(f"OpenRouter API error (HTTP {response.status_code}): {err_text}")

                except httpx.RequestError as req_err:
                    if attempt < max_attempts:
                        sleep_time = min(backoff_base * (1.8 ** (attempt - 1)), 8.0)
                        logger.warning(f"[OpenRouter] Network error ({req_err}). Retrying in {sleep_time:.1f}s...")
                        await asyncio.sleep(sleep_time)
                    else:
                        logger.error(f"[OpenRouter] Request failed: {req_err}")
                        raise RuntimeError(f"OpenRouter network connection error: {req_err}")

        return {}

