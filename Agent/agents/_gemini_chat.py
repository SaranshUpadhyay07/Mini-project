from __future__ import annotations

import os
import threading
from dataclasses import dataclass
from typing import Dict, Optional, Tuple

from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

Key = Tuple[str, str]  # (user_id, chat_id)


@dataclass(frozen=True)
class GeminiChatConfig:
    model: str
    system_instruction: str
    response_mime_type: str
    cache_key: str


_client: Optional[genai.Client] = None
_lock = threading.Lock()

# Separate caches per config (planner vs chatbot), and then per (user_id, chat_id).
_chats: Dict[str, Dict[Key, object]] = {}


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        api_key = os.getenv("Gemini_api_key")
        if not api_key:
            raise RuntimeError("Gemini_api_key not found in environment")
        _client = genai.Client(api_key=api_key)
    return _client


def _create_chat(cfg: GeminiChatConfig):
    client = _get_client()
    return client.chats.create(
        model=cfg.model,
        config=types.GenerateContentConfig(
            system_instruction=cfg.system_instruction,
            response_mime_type=cfg.response_mime_type,
        ),
    )


def get_chat(user_id: str, chat_id: str, cfg: GeminiChatConfig):
    key: Key = (user_id, chat_id)
    with _lock:
        bucket = _chats.get(cfg.cache_key)
        if bucket is None:
            bucket = {}
            _chats[cfg.cache_key] = bucket

        chat = bucket.get(key)
        if chat is None:
            chat = _create_chat(cfg)
            bucket[key] = chat

        return chat


def send_message(
    user_id: str, chat_id: str, cfg: GeminiChatConfig, message: str
) -> str:
    chat = get_chat(user_id, chat_id, cfg)
    resp = chat.send_message(message)
    if resp is None:
        return ""
    return resp.text or ""
