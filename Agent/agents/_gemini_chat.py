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

FILE = "Agent/agents/_gemini_chat.py"


def _log(fn: str, message: str) -> None:
    print(f"[{FILE}] [{fn}] {message}", flush=True)


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        api_key = os.getenv("Gemini_api_key")
        if not api_key:
            _log("_get_client", "Gemini_api_key missing")
            raise RuntimeError("Gemini_api_key not found in environment")
        _log("_get_client", "creating genai client")
        _client = genai.Client(api_key=api_key)
        _log("_get_client", "genai client created")
    return _client


def _create_chat(cfg: GeminiChatConfig):
    _log(
        "_create_chat",
        f"creating chat (model={cfg.model} mime={cfg.response_mime_type} cache_key={cfg.cache_key})",
    )
    client = _get_client()
    chat = client.chats.create(
        model=cfg.model,
        config=types.GenerateContentConfig(
            system_instruction=cfg.system_instruction,
            response_mime_type=cfg.response_mime_type,
        ),
    )
    _log("_create_chat", "chat created")
    return chat


def get_chat(user_id: str, chat_id: str, cfg: GeminiChatConfig):
    fn = "get_chat"
    key: Key = (user_id, chat_id)
    _log(fn, f"enter user_id={user_id} chat_id={chat_id} cache_key={cfg.cache_key}")
    with _lock:
        bucket = _chats.get(cfg.cache_key)
        if bucket is None:
            _log(fn, "cache bucket missing; creating")
            bucket = {}
            _chats[cfg.cache_key] = bucket

        chat = bucket.get(key)
        if chat is None:
            _log(fn, "chat missing; creating new")
            chat = _create_chat(cfg)
            bucket[key] = chat
        else:
            _log(fn, "chat cache hit")

        _log(fn, "exit")
        return chat


def send_message(
    user_id: str, chat_id: str, cfg: GeminiChatConfig, message: str
) -> str:
    fn = "send_message"
    _log(
        fn,
        f"enter user_id={user_id} chat_id={chat_id} model={cfg.model} msg_len={len(message or '')}",
    )
    chat = get_chat(user_id, chat_id, cfg)
    _log(fn, "calling model send_message")
    resp = chat.send_message(message)
    if resp is None:
        _log(fn, "model response is None")
        _log(fn, "exit (empty)")
        return ""

    out = resp.text or ""
    _log(fn, f"model output_len={len(out)}")
    _log(fn, f"model output={out}")
    _log(fn, "exit")
    return out
