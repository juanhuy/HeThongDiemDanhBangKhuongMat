"""Client gọi LLM local (Ollama) cho hệ thống tài liệu.

- Hỗ trợ Ollama (mặc định), dễ mở rộng thêm provider khác (Gemini/OpenAI...).
- Mọi hàm đều an toàn: nếu model/server không khả dụng thì trả None
  để gọi hàm fallback (thuật toán quy tắc offline).
"""
import os
import re

import requests

import sys

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from config.settings import settings


class OllamaClient:
    def __init__(self, base_url=None, model=None, timeout=None):
        llm_cfg = settings.config.get("llm", {}) or {}
        self.base_url = (base_url or llm_cfg.get("base_url") or "http://127.0.0.1:11434").rstrip("/")
        self.model = model or llm_cfg.get("model") or "qwen2.5:7b"
        self.timeout = timeout or int(llm_cfg.get("timeout", 180) or 180)

    def available(self) -> bool:
        """Kiểm tra server Ollama có chạy không."""
        try:
            r = requests.get(f"{self.base_url}/api/version", timeout=3)
            return r.status_code == 200
        except Exception:
            return False

    def chat(self, system: str, user: str, temperature: float = 0.2, max_tokens: int = 2000) -> str | None:
        """Gửi prompt chat. Trả về văn bản trả lời hoặc None nếu lỗi."""
        try:
            r = requests.post(
                f"{self.base_url}/api/chat",
                json={
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": user},
                    ],
                    "stream": False,
                    "options": {"temperature": temperature, "num_predict": max_tokens, "num_ctx": 8192},
                },
                timeout=self.timeout,
            )
            r.raise_for_status()
            return (r.json().get("message") or {}).get("content") or ""
        except Exception:
            return None


def _get_llm():
    """Trả về client LLM nếu được bật trong config, ngược lại None."""
    llm_cfg = settings.config.get("llm", {}) or {}
    if not llm_cfg.get("enabled", True):
        return None
    return OllamaClient()


def extract_json(text: str) -> dict | None:
    """Bóc tách JSON từ phản hồi model (bỏ code fence ```json ... ``` nếu có)."""
    if not text:
        return None
    text = text.strip()
    # Bỏ ```json ... ```
    fence = re.search(r"```(?:json)?\s*(.*?)```", text, re.DOTALL)
    if fence:
        text = fence.group(1).strip()
    # Nếu vẫn còn chữ quanh JSON, lấy đoạn từ { đầu tiên đến } cuối cùng
    if not text.startswith("{"):
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            text = text[start:end + 1]
    try:
        import json
        return json.loads(text)
    except Exception:
        return None
